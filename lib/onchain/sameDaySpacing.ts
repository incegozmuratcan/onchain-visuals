/**
 * Same-day spacing for a metric's weekly and monthly X cards.
 *
 * When both would post on the same Europe/Istanbul day, the weekly card goes
 * first. The monthly card waits until that weekly post is at least 4 hours
 * old. If the other card already posted today, either card waits out the
 * same 4 hours. Dry-runs do not call this. A missing sibling history means
 * the weekly card has not posted yet.
 */

export const SAME_DAY_GAP_MS = 4 * 60 * 60 * 1000;
export const ISTANBUL_MONDAY = 1;
export const ISTANBUL_TUESDAY = 2;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type SiblingPost = {
  mode?: string;
  at?: string;
};

export type SameDaySpacing = {
  proceed: boolean;
  reason: "sibling_spacing" | "sibling_first" | null;
  readyAt: string | null;
  message: string;
};

export function istanbulParts(now: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
  const weekday = WEEKDAYS.indexOf(parts.weekday);
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    weekday,
  };
}

export function latestLivePost(posts: SiblingPost[] | null | undefined) {
  const live = (Array.isArray(posts) ? posts : []).filter((post) => {
    if (!post || post.mode !== "live" || !post.at) return false;
    return !Number.isNaN(Date.parse(post.at));
  });
  live.sort((a, b) => Date.parse(String(b.at)) - Date.parse(String(a.at)));
  return live[0] || null;
}

/**
 * `weeklyPostWeekday` is the Istanbul weekday the weekly card is scheduled
 * (Monday = 1, Tuesday = 2). On that weekday the monthly card is second.
 */
export function assessSameDaySpacing({
  now,
  role,
  siblingPosts,
  weeklyPostWeekday,
}: {
  now: Date;
  role: "weekly" | "monthly";
  siblingPosts?: SiblingPost[] | null;
  weeklyPostWeekday: number;
}): SameDaySpacing {
  const here = istanbulParts(now);
  const latest = latestLivePost(siblingPosts);
  const siblingDay = latest ? istanbulParts(new Date(String(latest.at))).day : null;
  const postedToday = Boolean(latest && siblingDay === here.day);
  if (postedToday && latest?.at) {
    const readyAtMs = Date.parse(latest.at) + SAME_DAY_GAP_MS;
    if (now.getTime() < readyAtMs) {
      const readyAt = new Date(readyAtMs).toISOString();
      return {
        proceed: false,
        reason: "sibling_spacing",
        readyAt,
        message: `This card waits until ${readyAt} so it posts at least 4 hours after the sibling card.`,
      };
    }
  }
  if (role === "monthly" && here.weekday === weeklyPostWeekday && !postedToday) {
    return {
      proceed: false,
      reason: "sibling_first",
      readyAt: null,
      message: "The weekly card posts first today. This monthly card waits until that post is 4 hours old.",
    };
  }
  return { proceed: true, reason: null, readyAt: null, message: "Sibling spacing is clear." };
}
