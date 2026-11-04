import { timingSafeEqual } from "node:crypto";
import { inflateRawSync } from "node:zlib";

/** Production path registered in vercel.json. */
export const ETF_DAILY_CRON_PATH = "/api/cron/x-btc-eth-etf-daily";

/**
 * Tuesday–Saturday 05:00–10:30 UTC, every 30 minutes.
 * 08:00–13:30 Europe/Istanbul. Istanbul is UTC+3 with no daylight saving.
 */
export const ETF_DAILY_POST_CRONS = ["*/30 5-10 * * 2-6", "0 11 * * 2-6"] as const;

/** 11:00 UTC = 14:00 Europe/Istanbul, the last live dispatch. */
export const ETF_DAILY_LAST_POST_CRON = "0 11 * * 2-6";

/**
 * 11:45 UTC = 14:45 Europe/Istanbul. Looks at the window's artifact and does
 * not dispatch. The workflow timeout is 30 minutes, so this sits after the
 * 11:00 UTC pass.
 */
export const ETF_DAILY_CHECK_CRON = "45 11 * * 2-6";

export const ETF_DAILY_WORKFLOW_FILE = "x-btc-eth-etf-daily.yml";
export const ETF_DAILY_WORKFLOW_REF = "main";
export const ETF_DAILY_ARTIFACT = "btc-eth-etf-daily";

const ACTIVE_RUN_MAX_AGE_MS = 45 * 60 * 1000;

const ACTIVE_RUN_STATUSES = new Set([
  "action_required",
  "in_progress",
  "pending",
  "queued",
  "requested",
  "waiting",
]);

const DEFAULT_REPOSITORY = "incegozmuratcan/onchain-visuals";
const GITHUB_API = "https://api.github.com";

export type CronEnv = Record<string, string | undefined>;

export type CronLog = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export type CronFetch = (url: string, init?: RequestInit) => Promise<Response>;

export type WorkflowRun = {
  id?: number;
  status?: string | null;
  conclusion?: string | null;
  html_url?: string;
  created_at?: string;
};

export type EtfResultJson = {
  posted?: boolean;
  reason?: string | null;
  date?: string | null;
  message?: string | null;
  dryRun?: boolean;
};

export type EtfPostedState = {
  posts?: Array<{ date?: string; mode?: string; postUrl?: string | null }>;
};

type ArtifactRow = {
  id?: number;
  name?: string;
  expired?: boolean;
  created_at?: string;
  size_in_bytes?: number;
};

export function cronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  const trimmed = secret?.trim() ?? "";
  if (!trimmed) return false;
  const actual = Buffer.from(authorization ?? "");
  const expected = Buffer.from(`Bearer ${trimmed}`);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function isActiveRunStatus(status: string | null | undefined): boolean {
  return ACTIVE_RUN_STATUSES.has(String(status || ""));
}

function isCurrentActiveRun(run: WorkflowRun, now: Date): boolean {
  if (!isActiveRunStatus(run.status)) return false;
  const created = createdMs(run.created_at);
  if (!created) return true;
  return now.getTime() - created < ACTIVE_RUN_MAX_AGE_MS;
}

/** 04:59 UTC on the same calendar day, one minute before the 05:00 pass. */
export function etfWindowStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 59, 0));
}

export function resolveRepository(env: CronEnv): string {
  const explicit = (env.GITHUB_REPOSITORY || "").trim();
  const owner = (env.VERCEL_GIT_REPO_OWNER || "").trim();
  const slug = (env.VERCEL_GIT_REPO_SLUG || "").trim();
  const repo = explicit || (owner && slug ? `${owner}/${slug}` : DEFAULT_REPOSITORY);
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new Error("GITHUB_REPOSITORY must look like owner/repo.");
  }
  return repo;
}

export function hasLiveEtfPost(result: EtfResultJson | null, state: EtfPostedState | null): boolean {
  const date = result?.date;
  if (date && Array.isArray(state?.posts)) {
    if (state.posts.some((post) => post?.date === date && post?.mode === "live")) return true;
  }
  if (result?.dryRun === false && result.posted === true) return true;
  // A live run skips with already_posted only when a live share blocks that date.
  if (result?.dryRun === false && result.reason === "already_posted") return true;
  return false;
}

export function assessEtfWindow(input: {
  runs: WorkflowRun[];
  result: EtfResultJson | null;
  postedState: EtfPostedState | null;
  artifactFound: boolean;
  artifactError?: string | null;
}): {
  livePost: boolean | "pending" | "unknown";
  needsAttention: boolean;
  reason: string;
  date: string | null;
  message: string;
  postUrl: string | null;
  runUrl: string | null;
} {
  const active = input.runs.filter((run) => isActiveRunStatus(run.status));
  const newestRun = newestByCreated(input.runs);
  const date = input.result?.date ?? null;
  const postUrl = livePostUrl(input.result, input.postedState);
  const base = {
    date,
    postUrl,
    runUrl: newestRun?.html_url || null,
  };
  if (input.artifactError) {
    return {
      ...base,
      livePost: "unknown",
      needsAttention: true,
      reason: "artifact_unreadable",
      message: input.artifactError,
    };
  }
  if (hasLiveEtfPost(input.result, input.postedState)) {
    return {
      ...base,
      livePost: true,
      needsAttention: false,
      reason: input.result?.posted ? "posted" : "already_posted",
      message: input.result?.message || "A live post for this ETF date is already recorded.",
    };
  }
  if (active.length) {
    return {
      ...base,
      livePost: "pending",
      needsAttention: false,
      reason: "in_progress",
      message: "A workflow run is still in progress, so a live post is not confirmed yet.",
    };
  }
  if (input.result?.reason === "no_new_session") {
    return {
      ...base,
      livePost: false,
      needsAttention: false,
      reason: "no_new_session",
      message: input.result.message || "No new Farside session by 14:45 Europe/Istanbul. Nothing to post.",
    };
  }
  let reason = input.result?.reason || "not_posted";
  if (!input.artifactFound) {
    if (!input.runs.length) reason = "no_run";
    else if (input.runs.some((run) => run.status === "completed" && run.conclusion && run.conclusion !== "success")) {
      reason = "run_failed";
    } else reason = "no_artifact";
  }
  if (reason === "already_posted") reason = "already_posted_without_live";
  const scriptMessage = input.result?.message ? ` ${input.result.message}` : "";
  return {
    ...base,
    livePost: false,
    needsAttention: true,
    reason,
    message: `${defaultAttention(reason, date)}${scriptMessage}`,
  };
}

export function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const eocd = findEocd(buffer);
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("ZIP central directory is truncated.");
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compSize = buffer.readUInt32LE(offset + 20);
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLen);
    offset += 46 + nameLen + extraLen + commentLen;
    if (!isStateFile(name)) continue;
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`ZIP local header missing for ${name}.`);
    }
    const localNameLen = buffer.readUInt16LE(localOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buffer.length) throw new Error(`ZIP entry truncated for ${name}.`);
    const compressed = buffer.subarray(dataStart, dataEnd);
    if (method === 0) files.set(name, Buffer.from(compressed));
    else if (method === 8) files.set(name, inflateRawSync(compressed));
    else throw new Error(`Unsupported ZIP method ${method} for ${name}.`);
  }
  return files;
}

export async function runBtcEthEtfCron(options: {
  authorization: string | null;
  schedule: string | null;
  env: CronEnv;
  fetch: CronFetch;
  now?: Date;
  log?: CronLog;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const log = options.log ?? console;
  if (!cronAuthorized(options.authorization, options.env.CRON_SECRET)) {
    return { status: 401, body: { ok: false, error: "unauthorized" } };
  }
  const token = options.env.GITHUB_DISPATCH_TOKEN?.trim() || "";
  if (!token) {
    return { status: 500, body: { ok: false, error: "missing_github_dispatch_token" } };
  }
  let repository = DEFAULT_REPOSITORY;
  try {
    repository = resolveRepository(options.env);
  } catch (error) {
    return { status: 500, body: { ok: false, error: "invalid_repository", message: errorText(error) } };
  }
  const now = options.now ?? new Date();
  const schedule = (options.schedule || "").trim();
  if (schedule === ETF_DAILY_CHECK_CRON) {
    return checkEndOfWindow({ repository, token, fetch: options.fetch, now, log });
  }
  return dispatchLive({ repository, token, fetch: options.fetch, schedule, now, log });
}

async function dispatchLive(input: {
  repository: string;
  token: string;
  fetch: CronFetch;
  schedule: string;
  now: Date;
  log: CronLog;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const listed = await listRuns(input);
  if (!listed.ok) return listed.response;
  const active = newestByCreated(listed.runs.filter((run) => isCurrentActiveRun(run, input.now)));
  if (active) {
    input.log.info(
      `[x-btc-eth-etf-daily] Skipped dispatch. Run ${active.id ?? "unknown"} is ${active.status}.`,
    );
    return {
      status: 200,
      body: {
        ok: true,
        dispatched: false,
        reason: "already_running",
        workflow: ETF_DAILY_WORKFLOW_FILE,
        ref: ETF_DAILY_WORKFLOW_REF,
        dryRun: false,
        schedule: input.schedule || null,
        run: runSummary(active),
      },
    };
  }
  let githubStatus = 204;
  try {
    const response = await github(input.fetch, input.token, "POST", dispatchPath(input.repository), {
      ref: ETF_DAILY_WORKFLOW_REF,
      inputs: { dry_run: "false" },
    });
    if (response.status !== 204 && response.status !== 200) {
      return githubFailure(response.status, response.payload);
    }
    githubStatus = response.status;
  } catch (error) {
    return failedRequest(error);
  }
  input.log.info("[x-btc-eth-etf-daily] Dispatched live workflow_dispatch on main.");
  return {
    status: 200,
    body: {
      ok: true,
      dispatched: true,
      reason: "dispatched",
      workflow: ETF_DAILY_WORKFLOW_FILE,
      ref: ETF_DAILY_WORKFLOW_REF,
      dryRun: false,
      schedule: input.schedule || null,
      githubStatus,
    },
  };
}

async function checkEndOfWindow(input: {
  repository: string;
  token: string;
  fetch: CronFetch;
  now: Date;
  log: CronLog;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const start = etfWindowStart(input.now);
  const listed = await listRuns(input);
  if (!listed.ok) return listed.response;
  const runs = listed.runs.filter((run) => createdMs(run.created_at) >= start.getTime());
  let artifactFound = false;
  let artifactError: string | null = null;
  let result: EtfResultJson | null = null;
  let postedState: EtfPostedState | null = null;
  try {
    const artifact = await newestWindowArtifact(input, start);
    if (artifact?.id) {
      artifactFound = true;
      const zip = await githubBuffer(
        input.fetch,
        input.token,
        `GET`,
        `/repos/${repoPath(input.repository)}/actions/artifacts/${artifact.id}/zip`,
      );
      const entries = readZipEntries(zip);
      result = parseJsonEntry(entries, "result.json");
      postedState = parseJsonEntry(entries, "posted-state.json");
    }
  } catch (error) {
    artifactError = errorText(error);
  }
  const assessment = assessEtfWindow({ runs, result, postedState, artifactFound, artifactError });
  const line = assessment.needsAttention && !assessment.message.includes("No live X post")
    ? `[x-btc-eth-etf-daily] No live X post by 14:45 Europe/Istanbul (11:45 UTC). ${assessment.message}`
    : `[x-btc-eth-etf-daily] ${assessment.message}`;
  if (assessment.needsAttention) input.log.error(line);
  else if (assessment.reason === "no_new_session") input.log.warn(line);
  else input.log.info(line);
  return {
    status: artifactError && !runs.length ? 502 : 200,
    body: {
      ok: !assessment.needsAttention,
      dispatched: false,
      mode: "end_of_window_check",
      workflow: ETF_DAILY_WORKFLOW_FILE,
      ref: ETF_DAILY_WORKFLOW_REF,
      schedule: ETF_DAILY_CHECK_CRON,
      window: {
        timezone: "Europe/Istanbul",
        utc: "05:00-11:00",
        start: start.toISOString(),
      },
      ...assessment,
    },
  };
}

async function listRuns(input: {
  repository: string;
  token: string;
  fetch: CronFetch;
}): Promise<{ ok: true; runs: WorkflowRun[] } | { ok: false; response: { status: number; body: Record<string, unknown> } }> {
  try {
    const response = await github(
      input.fetch,
      input.token,
      "GET",
      `/repos/${repoPath(input.repository)}/actions/workflows/${encodeURIComponent(ETF_DAILY_WORKFLOW_FILE)}/runs?per_page=30`,
    );
    if (response.status === 401 || response.status === 403) {
      return { ok: false, response: githubFailure(response.status, response.payload) };
    }
    if (response.status < 200 || response.status >= 300) {
      return { ok: false, response: githubFailure(response.status, response.payload) };
    }
    const rows = (response.payload as { workflow_runs?: WorkflowRun[] } | null)?.workflow_runs;
    return { ok: true, runs: Array.isArray(rows) ? rows : [] };
  } catch (error) {
    return { ok: false, response: failedRequest(error) };
  }
}

async function newestWindowArtifact(
  input: { repository: string; token: string; fetch: CronFetch },
  start: Date,
): Promise<ArtifactRow | null> {
  const response = await github(
    input.fetch,
    input.token,
    "GET",
    `/repos/${repoPath(input.repository)}/actions/artifacts?per_page=30&name=${ETF_DAILY_ARTIFACT}`,
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(githubMessage(response.payload) || `Artifact list failed with HTTP ${response.status}.`);
  }
  const rows = (response.payload as { artifacts?: ArtifactRow[] } | null)?.artifacts;
  const fresh = (Array.isArray(rows) ? rows : []).filter((row) => {
    return row && row.name === ETF_DAILY_ARTIFACT && !row.expired && createdMs(row.created_at) >= start.getTime();
  });
  return newestByCreated(fresh);
}

async function github(
  fetchImpl: CronFetch,
  token: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; payload: unknown }> {
  const response = await fetchImpl(`${GITHUB_API}${path}`, {
    method,
    headers: githubHeaders(token, Boolean(body)),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 204) return { status: 204, payload: null };
  const text = await response.text();
  const payload = text ? safeJson(text) : null;
  return { status: response.status, payload };
}

async function githubBuffer(fetchImpl: CronFetch, token: string, method: string, path: string): Promise<Buffer> {
  const response = await fetchImpl(`${GITHUB_API}${path}`, {
    method,
    headers: githubHeaders(token, false),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(githubMessage(safeJson(text)) || `Artifact download failed with HTTP ${response.status}.`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 20_000_000) throw new Error("Artifact zip is larger than 20MB.");
  return bytes;
}

function githubHeaders(token: string, jsonBody: boolean): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "onchain-visuals-etf-cron",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(jsonBody ? { "Content-Type": "application/json" } : {}),
  };
}

function dispatchPath(repository: string): string {
  return `/repos/${repoPath(repository)}/actions/workflows/${encodeURIComponent(ETF_DAILY_WORKFLOW_FILE)}/dispatches`;
}

function repoPath(repository: string): string {
  const [owner, name] = repository.split("/");
  return `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

function githubFailure(status: number, payload: unknown): { status: number; body: Record<string, unknown> } {
  const unauthorized = status === 401 || status === 403;
  return {
    status: 502,
    body: {
      ok: false,
      error: unauthorized ? "github_unauthorized" : "github_request_failed",
      githubStatus: status,
      message: githubMessage(payload),
    },
  };
}

function failedRequest(error: unknown): { status: number; body: Record<string, unknown> } {
  return {
    status: 502,
    body: { ok: false, error: "github_request_failed", message: errorText(error) },
  };
}

function githubMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string") return message.slice(0, 300);
  }
  return "";
}

function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 300);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 300) };
  }
}

function createdMs(value: string | undefined): number {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function newestByCreated<T extends { created_at?: string }>(rows: T[]): T | null {
  if (!rows.length) return null;
  return [...rows].sort((left, right) => createdMs(right.created_at) - createdMs(left.created_at))[0];
}

function runSummary(run: WorkflowRun): { id: number | null; status: string | null; htmlUrl: string | null } {
  return {
    id: typeof run.id === "number" ? run.id : null,
    status: run.status || null,
    htmlUrl: run.html_url || null,
  };
}

function livePostUrl(result: EtfResultJson | null, state: EtfPostedState | null): string | null {
  const date = result?.date;
  const posts = state?.posts;
  if (!date || !Array.isArray(posts)) return null;
  const match = [...posts].reverse().find((post) => post?.date === date && post?.mode === "live" && post.postUrl);
  return match?.postUrl || null;
}

function defaultAttention(reason: string, date: string | null): string {
  const when = "No live X post by 14:45 Europe/Istanbul (11:45 UTC).";
  const dated = date ? ` ETF date ${date}.` : "";
  if (reason === "incomplete") return `${when}${dated} Farside was still incomplete.`;
  if (reason === "no_run") return `${when} No workflow run started during 05:00–11:00 UTC.`;
  if (reason === "run_failed") return `${when}${dated} The workflow run failed.`;
  if (reason === "no_artifact") return `${when} The workflow finished without a btc-eth-etf-daily artifact.`;
  if (reason === "already_posted_without_live") {
    return `${when}${dated} The latest run skipped as already posted, and no live share is recorded.`;
  }
  return `${when}${dated} Reason: ${reason}.`;
}

function parseJsonEntry<T>(entries: Map<string, Buffer>, baseName: string): T | null {
  const entry = [...entries.entries()].find(([name]) => name === baseName || name.endsWith(`/${baseName}`));
  if (!entry) return null;
  return JSON.parse(entry[1].toString("utf8")) as T;
}

function isStateFile(name: string): boolean {
  return name === "result.json" || name.endsWith("/result.json") || name === "posted-state.json" || name.endsWith("/posted-state.json");
}

function findEocd(buffer: Buffer): number {
  const min = Math.max(0, buffer.length - 22 - 0xffff);
  for (let index = buffer.length - 22; index >= min; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) return index;
  }
  throw new Error("ZIP end of central directory not found.");
}
