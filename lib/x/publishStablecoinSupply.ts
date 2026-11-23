import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildChartSnapshot } from "@/lib/onchainData";
import { ISTANBUL_TUESDAY } from "@/lib/onchain/sameDaySpacing";
import { oauth1AuthorizationHeader, type OAuth1Credentials } from "@/lib/x/oauth1";
import { openLiveXPost } from "@/lib/x/postLedger";
import { XPublishError, fetchX, settleLivePostFailure } from "@/lib/x/publishFailure";
import { siblingSpacingBlock } from "@/lib/x/siblingPostSpacing";

const EXPECTED_WIDTH = 1536;
const EXPECTED_HEIGHT = 1134;

const SPEC = {
  weekly: {
    slug: "chain-stablecoin-supply-weekly",
    period: "weekly",
    layout: "stablecoin-supply-weekly",
    view: "weekly",
    badge: "7D",
    role: "weekly" as const,
    siblingStatePath: "artifacts/x-chain-stablecoin-supply-monthly/posted-state.json",
    fileName: "stablecoin-supply-weekly.png",
  },
  monthly: {
    slug: "chain-stablecoin-supply-monthly",
    period: "monthly",
    layout: "stablecoin-supply-monthly",
    view: "monthly",
    badge: "1M",
    role: "monthly" as const,
    siblingStatePath: "artifacts/x-chain-stablecoin-supply-weekly/posted-state.json",
    fileName: "stablecoin-supply-monthly.png",
  },
};

type Kind = keyof typeof SPEC;

type PublishErrorCode =
  | "unauthorized"
  | "bad_request"
  | "data_validation_failed"
  | "render_validation_failed"
  | "missing_x_credentials"
  | "x_media_upload_failed"
  | "x_post_failed"
  | "sibling_spacing";

const publishedByDay = new Map<string, { postId: string; postUrl: string; imageHash: string; publishedAt: string }>();

function jsonError(status: number, code: PublishErrorCode, message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, details } }, { status });
}

function readEnv(name: string) {
  const value = globalThis.process?.env?.[name];
  return typeof value === "string" ? value : "";
}

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

function validateSnapshot(snapshot: any, date: string, spec: (typeof SPEC)[Kind]) {
  if (!snapshot) throw new Error("Stablecoin supply snapshot is unavailable.");
  if (snapshot.datasetSlug !== spec.slug) throw new Error("Snapshot is not the stablecoin supply card.");
  if (snapshot.metadata?.view !== spec.view || snapshot.metadata?.layout !== spec.layout) {
    throw new Error(`Only the ${spec.view} stablecoin supply layout can be published.`);
  }
  if (snapshot.metadata?.titleBadge !== spec.badge) {
    throw new Error(`Stablecoin supply card must use the ${spec.badge} badge.`);
  }
  if (snapshot.status !== "active" || snapshot.freshness?.status !== "fresh") {
    throw new Error("Stablecoin supply data is not in a publishable active/fresh state.");
  }
  if (snapshot.metadata?.periodStart !== date) {
    throw new Error(`Requested period ${date} does not match snapshot ${snapshot.metadata?.periodStart}.`);
  }
  if (!snapshot.metadata?.coverage?.complete) throw new Error("Stablecoin supply coverage is incomplete.");
  const bars = snapshot.series?.bars || [];
  if (bars.length !== 10) throw new Error(`Stablecoin supply snapshot has ${bars.length} rows; the card needs 10.`);
  if (bars.some((row: any, index: number) => row?.rank !== index + 1 || !row?.name || !(Number(row?.value) > 0))) {
    throw new Error("Stablecoin supply rows are incomplete.");
  }
  if (!snapshot.metadata?.leader?.name || !snapshot.metadata?.formattedTotal) {
    throw new Error("Stablecoin supply summary is incomplete.");
  }
  const caption = String(snapshot.metadata?.caption || "");
  if (!caption || /defillama/i.test(caption) || /[\u{1F300}-\u{1FAFF}]/u.test(caption)) {
    throw new Error("Stablecoin supply caption is missing or not publishable.");
  }
  return caption;
}

async function uploadMediaToX(buffer: Buffer, fileName: string) {
  const url = "https://api.x.com/2/media/upload";
  const form = new FormData();
  form.set("media_category", "tweet_image");
  form.set("media_type", "image/png");
  const mediaBytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  form.set("media", new Blob([mediaBytes], { type: "image/png" }), fileName);
  const payload = await fetchX("media", "X media upload", url, {
    method: "POST",
    headers: { Authorization: xAuthorization("POST", url) },
    body: form,
  }, xFailureMessage);
  const mediaId = payload?.data?.id || payload?.media_id_string || payload?.media_id;
  if (!mediaId) throw new XPublishError("media", "X media upload response did not include a media id.");
  return String(mediaId);
}

async function createTweet(mediaId: string, text: string) {
  const url = "https://api.x.com/2/tweets";
  const payload = await fetchX("tweet", "X post creation", url, {
    method: "POST",
    headers: {
      Authorization: xAuthorization("POST", url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, media: { media_ids: [mediaId] } }),
  }, xFailureMessage);
  const postId = payload?.data?.id;
  if (!postId) throw new XPublishError("tweet", "X post response did not include a post id.");
  return String(postId);
}

export async function publishStablecoinSupplyCard(request: NextRequest, kind: Kind) {
  if (process.env.VERCEL) return new NextResponse(null, { status: 404 });
  const spec = SPEC[kind];
  if (!authorize(request)) return jsonError(401, "unauthorized", "Unauthorized publish request.");

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "bad_request", "Request body must be JSON.");
  }
  if (body?.previewState) {
    return jsonError(422, "data_validation_failed", "Preview fixtures cannot be published for the stablecoin supply card.");
  }
  const date = String(body?.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonError(400, "bad_request", "A YYYY-MM-DD period start is required.");
  }

  let tweetText = "";
  try {
    const snapshot = await buildChartSnapshot(spec.slug, spec.period);
    tweetText = validateSnapshot(snapshot, date, spec);
  } catch (error) {
    return jsonError(422, "data_validation_failed", error instanceof Error ? error.message : "Stablecoin supply validation failed.");
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
  const existing = publishedByDay.get(`${spec.slug}:${date}`);
  if (existing) {
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

  const spacing = await siblingSpacingBlock({
    role: spec.role,
    weeklyPostWeekday: ISTANBUL_TUESDAY,
    siblingStatePath: spec.siblingStatePath,
  });
  if (!spacing.proceed) return jsonError(409, "sibling_spacing", spacing.message);

  const ledger = await openLiveXPost(spec.slug, date);
  if (ledger.outcome === "duplicate") {
    return NextResponse.json({
      success: true,
      duplicate: true,
      dryRun: false,
      tweetText,
      postId: ledger.postId,
      postUrl: ledger.postUrl,
      image: { width: dims.width, height: dims.height, sha256: imageHash },
    });
  }
  if (ledger.outcome === "in_progress" || ledger.outcome === "uncertain") {
    return jsonError(409, "x_post_failed", ledger.outcome === "uncertain"
      ? "A previous publish attempt may have posted. Check X before retrying."
      : "A live publish for this dataset and date is already in progress.");
  }
  if (!oauth1Credentials()) {
    await ledger.release();
    return jsonError(
      500,
      "missing_x_credentials",
      "Missing OAuth 1.0a credentials for @OnchainVis. Set X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET.",
    );
  }

  try {
    const mediaId = await uploadMediaToX(imageBuffer, spec.fileName);
    const postId = await createTweet(mediaId, tweetText);
    const postUrl = `https://x.com/OnchainVis/status/${postId}`;
    publishedByDay.set(`${spec.slug}:${date}`, { postId, postUrl, imageHash, publishedAt: new Date().toISOString() });
    await ledger.record(postId, postUrl);
    return NextResponse.json({
      success: true,
      dryRun: false,
      tweetText,
      postId,
      postUrl,
      image: { width: dims.width, height: dims.height, sha256: imageHash },
    });
  } catch (error) {
    const settled = await settleLivePostFailure(ledger, error);
    return jsonError(settled.status, settled.code, settled.message);
  }
}
