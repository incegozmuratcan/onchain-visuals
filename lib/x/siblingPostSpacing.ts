import { readFile } from "node:fs/promises";
import path from "node:path";
import { assessSameDaySpacing, type SiblingPost } from "@/lib/onchain/sameDaySpacing";

export async function readSiblingPosts(file: string): Promise<SiblingPost[]> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    return Array.isArray(parsed?.posts) ? parsed.posts : [];
  } catch {
    return [];
  }
}

/** Live publish routes call this. A sibling post younger than 4 hours blocks. */
export async function siblingSpacingBlock(options: {
  role: "weekly" | "monthly";
  weeklyPostWeekday: number;
  siblingStatePath: string;
  now?: Date;
}) {
  const file = process.env.X_SIBLING_POST_STATE
    ? path.resolve(process.env.X_SIBLING_POST_STATE)
    : path.join(process.cwd(), options.siblingStatePath);
  const siblingPosts = await readSiblingPosts(file);
  return assessSameDaySpacing({
    now: options.now || new Date(),
    role: options.role,
    siblingPosts,
    weeklyPostWeekday: options.weeklyPostWeekday,
  });
}
