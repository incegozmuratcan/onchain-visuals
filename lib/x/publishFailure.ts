/**
 * Decide whether a failed X publish may be retried.
 * Media upload failures and a 4xx from POST /2/tweets did not create a post.
 * A network error, timeout, or 5xx from tweet creation might have: the claim
 * stays and is marked uncertain so a later pass cannot post again.
 */

export class XPublishError extends Error {
  readonly stage: "media" | "tweet";
  readonly status?: number;

  constructor(stage: "media" | "tweet", message: string, status?: number) {
    super(message);
    this.name = "XPublishError";
    this.stage = stage;
    this.status = status;
  }
}

export type PublishFailureKind = "definite" | "uncertain";

export function classifyXPublishError(error: unknown): { kind: PublishFailureKind; stage: "media" | "tweet"; status?: number } {
  if (error instanceof XPublishError) {
    if (error.stage === "media") return { kind: "definite", stage: "media", status: error.status };
    const clientError = error.status != null && error.status >= 400 && error.status < 500;
    return { kind: clientError ? "definite" : "uncertain", stage: "tweet", status: error.status };
  }
  return { kind: "uncertain", stage: "tweet" };
}

type ClaimControl = {
  release: () => Promise<void>;
  markUncertain: () => Promise<void>;
};

export async function settleLivePostFailure(ledger: ClaimControl, error: unknown) {
  const failure = classifyXPublishError(error);
  const message = error instanceof Error ? error.message : "X publish failed.";
  if (failure.kind === "uncertain") {
    await ledger.markUncertain();
    return {
      status: 409 as const,
      code: "x_post_failed" as const,
      message: `${message} The post may have been created. The claim was kept; check X before retrying.`,
    };
  }
  await ledger.release();
  return {
    status: 502 as const,
    code: (failure.stage === "media" ? "x_media_upload_failed" : "x_post_failed") as "x_media_upload_failed" | "x_post_failed",
    message,
  };
}

/** Turn a fetch failure into a staged publish error so the claim decision is reliable. */
export async function fetchX(stage: "media" | "tweet", action: string, url: string, init: RequestInit, failureMessage: (payload: any, action: string, status: number) => string) {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : `${action} failed.`;
    throw new XPublishError(stage, detail);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new XPublishError(stage, failureMessage(payload, action, response.status), response.status);
  }
  return payload;
}
