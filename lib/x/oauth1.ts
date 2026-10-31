import { createHmac, randomBytes } from "crypto";

export type OAuth1Credentials = {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** RFC 3986 percent-encoding used by OAuth 1.0a (encodeURIComponent leaves !'()*). */
export function oauthPercentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Authorization header for an OAuth 1.0a user-context request.
 * Multipart and JSON bodies are not part of the signature. Pass bodyParams
 * only for application/x-www-form-urlencoded parameters. Query parameters on
 * `url` are included.
 */
export function oauth1AuthorizationHeader(
  method: string,
  url: string,
  credentials: OAuth1Credentials,
  options?: { nonce?: string; timestamp?: string | number; bodyParams?: Record<string, string> },
): string {
  const nonce = options?.nonce ?? randomBytes(16).toString("hex");
  const timestamp = String(options?.timestamp ?? Math.floor(Date.now() / 1000));
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };

  const parsed = new URL(url);
  const collected: Array<[string, string]> = Object.entries(oauthParams);
  parsed.searchParams.forEach((value, key) => {
    collected.push([key, value]);
  });
  for (const [key, value] of Object.entries(options?.bodyParams ?? {})) {
    collected.push([key, value]);
  }
  collected.sort((left, right) => {
    const keyOrder = compareCodeUnits(oauthPercentEncode(left[0]), oauthPercentEncode(right[0]));
    if (keyOrder !== 0) return keyOrder;
    return compareCodeUnits(oauthPercentEncode(left[1]), oauthPercentEncode(right[1]));
  });

  const paramString = collected
    .map(([key, value]) => `${oauthPercentEncode(key)}=${oauthPercentEncode(value)}`)
    .join("&");
  const baseUrl = `${parsed.origin}${parsed.pathname}`;
  const baseString = [method.toUpperCase(), oauthPercentEncode(baseUrl), oauthPercentEncode(paramString)].join("&");
  const signingKey = `${oauthPercentEncode(credentials.consumerSecret)}&${oauthPercentEncode(credentials.accessTokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const header = Object.keys(headerParams)
    .sort()
    .map((key) => `${oauthPercentEncode(key)}="${oauthPercentEncode(headerParams[key])}"`)
    .join(", ");
  return `OAuth ${header}`;
}
