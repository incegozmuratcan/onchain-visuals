import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { buildChartSnapshot } from "@/lib/onchainData";
import { buildBtcEthEtfWeeklyCaption } from "@/lib/onchain/btcEthEtfWeeklyCaption";
import { oauth1AuthorizationHeader, type OAuth1Credentials } from "@/lib/x/oauth1";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EXPECTED_WIDTH = 1536;
const EXPECTED_HEIGHT = 1134;
const DATASET_SLUG = "btc-eth-etf-weekly-flowboard";
const publishedByWeek = new Map<string, { postId: string; postUrl: string; imageHash: string; publishedAt: string }>();

type PublishErrorCode =
  | "unauthorized"
  | "bad_request"
  | "data_validation_failed"
  | "render_validation_failed"
  | "missing_x_credentials"
  | "x_media_upload_failed"
  | "x_post_failed";

function jsonError(status: number, code: PublishErrorCode, message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, details } }, { status });
}

function readEnv(name: string) {
  const value = globalThis.process?.env?.[name];
  return typeof value === "string" ? value : "";
}

/** Live posts require an explicit off switch. Unset X_DRY_RUN stays a dry run. */
function isLivePostEnabled() {
  const value = readEnv("X_DRY_RUN").trim().toLowerCase();
  return value === "false" || value === "0" || value === "off";
}

function oauth1Credentials(): OAuth1Credentials | null {
  const consumerKey = readEnv("X_CONSUMER_KEY").trim();
  const consumerSecret = readEnv("X_CONSUMER_SECRET").trim();
  const accessToken = readEnv("X_ACCESS_TOKEN").trim();
  const accessTokenSecret = readEnv("X_ACCESS_TOKEN_SECRET").trim();
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) return null;
  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

function xAuthorization(method: string, url: string) {
  const credentials = oauth1Credentials();
  if (!credentials) throw new Error("Missing X OAuth 1.0a credentials.");
  return oauth1AuthorizationHeader(method, url, credentials);
}

function xFailureMessage(payload: any, action: string, status: number) {
  const detail =
    (typeof payload?.detail === "string" && payload.detail) ||
    (typeof payload?.title === "string" && payload.title) ||
    (typeof payload?.errors?.[0]?.message === "string" && payload.errors[0].message) ||
    (typeof payload?.error === "string" && payload.error) ||
    "";
  return `${action} failed with HTTP ${status}${detail ? `: ${detail}` : ""}.`;
}

function timingSafeEqualText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function authorize(request: NextRequest) {
  const expected = readEnv("ONCHAIN_PUBLISH_SECRET");
  if (!expected) return false;
  const raw = request.headers.get("authorization") || "";
  const token = raw.replace(/^Bearer\s+/i, "").trim();
  return Boolean(token) && timingSafeEqualText(token, expected);
}

function decodePngDataUrl(dataUrl: unknown) {
  if (typeof dataUrl !== "string") throw new Error("imageDataUrl is required.");
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("imageDataUrl must be a PNG data URL.");
  return Buffer.from(match[1], "base64");
}

function pngDimensions(buffer: Buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Uploaded image is not a valid PNG.");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function panel(snapshot: any, asset: "BTC" | "ETH") {
  return (snapshot?.series?.cards || []).find((row: any) => row?.asset === asset);
}

function sameMoney(left: unknown, right: unknown) {
  const a = Number(left);
  const b = Number(right);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1;
}

function validateSnapshot(snapshot: any, weekStart: string) {
  if (!snapshot) throw new Error("Combined BTC+ETH ETF weekly snapshot is unavailable.");
  if (snapshot.datasetSlug !== DATASET_SLUG) {
    throw new Error("Snapshot is not the combined BTC+ETH ETF weekly Flowboard.");
  }
  if (snapshot.metadata?.view !== "weekly" || snapshot.metadata?.layout !== "btc-eth-weekly-split") {
    throw new Error("Only the weekly BTC+ETH split Flowboard can be published.");
  }
  if (snapshot.status !== "active" || snapshot.freshness?.status === "source_error") {
    throw new Error("Combined ETF weekly data is not in a publishable active/fresh state.");
  }
  if (snapshot.metadata?.weekStart !== weekStart) {
    throw new Error(`Requested week ${weekStart} does not match snapshot week ${snapshot.metadata?.weekStart}.`);
  }
  const tradingDays = snapshot.metadata?.tradingDays || [];
  if (!Array.isArray(tradingDays) || tradingDays.length < 1) {
    throw new Error("Weekly snapshot is missing its trading days.");
  }
  const btc = panel(snapshot, "BTC");
  const eth = panel(snapshot, "ETH");
  if (!btc || !eth) throw new Error("Weekly snapshot is missing the BTC or ETH panel.");
  for (const [asset, row] of [["BTC", btc], ["ETH", eth]] as const) {
    const dates = (row.days || []).map((day: any) => day?.date);
    if (dates.length !== tradingDays.length || dates.some((date: string, index: number) => date !== tradingDays[index])) {
      throw new Error(`${asset} panel trading days do not match the completed week.`);
    }
    if (!row.issuers?.length) throw new Error(`Missing ${asset} ETF issuer flow rows.`);
    if (!row.formattedNet || !row.formattedCumulative) {
      throw new Error(`Missing the formatted ${asset} weekly net or cumulative flow.`);
    }
  }
  const metrics = snapshot.headlineMetrics || [];
  if (metrics.length < 4) throw new Error("Missing required BTC and ETH headline metrics.");
  if (!sameMoney(metrics[0]?.value, btc.netFlow) || !sameMoney(metrics[1]?.value, eth.netFlow)) {
    throw new Error("Headline net flows do not match the BTC and ETH panels.");
  }
  if (!sameMoney(metrics[2]?.value, btc.cumulative) || !sameMoney(metrics[3]?.value, eth.cumulative)) {
    throw new Error("Headline cumulative flows do not match the BTC and ETH panels.");
  }
}

async function uploadMediaToX(buffer: Buffer) {
  const url = "https://api.x.com/2/media/upload";
  const form = new FormData();
  form.set("media_category", "tweet_image");
  form.set("media_type", "image/png");
  const mediaBytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  form.set("media", new Blob([mediaBytes], { type: "image/png" }), "btc-eth-etf-weekly-flowboard.png");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: xAuthorization("POST", url) },
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(xFailureMessage(payload, "X media upload", response.status));
  }
  const mediaId = payload?.data?.id || payload?.media_id_string || payload?.media_id;
  if (!mediaId) throw new Error("X media upload response did not include a media id.");
  return String(mediaId);
}

async function createTweet(mediaId: string, text: string) {
  const url = "https://api.x.com/2/tweets";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: xAuthorization("POST", url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, media: { media_ids: [mediaId] } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(xFailureMessage(payload, "X post creation", response.status));
  }
  const postId = payload?.data?.id;
  if (!postId) throw new Error("X post response did not include a post id.");
  return String(postId);
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return jsonError(401, "unauthorized", "Unauthorized publish request.");
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "bad_request", "Request body must be JSON.");
  }

  if (body?.previewState) {
    return jsonError(422, "data_validation_failed", "Preview fixtures cannot be published for the weekly ETF card.");
  }

  const weekStart = String(body?.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return jsonError(400, "bad_request", "A YYYY-MM-DD week start is required.");
  }

  let snapshot: any;
  let tweetText = "";
  try {
    snapshot = await buildChartSnapshot(DATASET_SLUG, "weekly");
    validateSnapshot(snapshot, weekStart);
    tweetText = buildBtcEthEtfWeeklyCaption(snapshot);
  } catch (error) {
    return jsonError(422, "data_validation_failed", error instanceof Error ? error.message : "Weekly ETF data validation failed.");
  }

  let imageBuffer: Buffer;
  let dims: { width: number; height: number };
  try {
    imageBuffer = decodePngDataUrl(body?.imageDataUrl);
    dims = pngDimensions(imageBuffer);
    if (dims.width !== EXPECTED_WIDTH || dims.height !== EXPECTED_HEIGHT) {
      throw new Error(`PNG dimensions were ${dims.width}x${dims.height}; expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}.`);
    }
  } catch (error) {
    return jsonError(422, "render_validation_failed", error instanceof Error ? error.message : "PNG validation failed.");
  }

  const imageHash = crypto.createHash("sha256").update(imageBuffer).digest("hex");
  const existing = publishedByWeek.get(weekStart);
  if (existing && !body?.force) {
    return NextResponse.json({
      success: true,
      duplicate: true,
      dryRun: !isLivePostEnabled(),
      tweetText,
      postId: existing.postId,
      postUrl: existing.postUrl,
      image: { width: dims.width, height: dims.height, sha256: imageHash },
    });
  }

  const dryRun = !isLivePostEnabled();
  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      tweetText,
      postId: null,
      postUrl: null,
      image: { width: dims.width, height: dims.height, bytes: imageBuffer.length, sha256: imageHash },
    });
  }

  if (!oauth1Credentials()) {
    return jsonError(
      500,
      "missing_x_credentials",
      "Missing OAuth 1.0a credentials for @OnchainVis. Set X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET from the app's OAuth 1.0 Keys. X_USER_ACCESS_TOKEN is not used; it cannot upload media.",
    );
  }

  try {
    const mediaId = await uploadMediaToX(imageBuffer);
    const postId = await createTweet(mediaId, tweetText);
    const postUrl = `https://x.com/OnchainVis/status/${postId}`;
    publishedByWeek.set(weekStart, { postId, postUrl, imageHash, publishedAt: new Date().toISOString() });
    return NextResponse.json({
      success: true,
      dryRun: false,
      tweetText,
      postId,
      postUrl,
      image: { width: dims.width, height: dims.height, sha256: imageHash },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "X publish failed.";
    const code: PublishErrorCode = message.startsWith("X media upload") ? "x_media_upload_failed" : "x_post_failed";
    return jsonError(502, code, message);
  }
}
