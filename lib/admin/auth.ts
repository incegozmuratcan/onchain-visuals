import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminPassword, getAdminSessionSecret } from "./config";

const COOKIE_NAME = "learndefi_admin";
const SESSION_VALUE = "admin";

function sign(value: string) {
  return createHmac("sha256", getAdminSessionSecret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createAdminCookieValue() {
  const payload = `${SESSION_VALUE}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function isAdminAuthenticated() {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length < 3) return false;
  const signature = parts.pop() || "";
  const payload = parts.join(".");
  if (!payload.startsWith(`${SESSION_VALUE}.`)) return false;
  return safeEqual(signature, sign(payload));
}

export function requireAdmin() {
  if (!isAdminAuthenticated()) redirect("/admin/login");
}

export async function loginAction(formData: FormData) {
  "use server";
  const password = String(formData.get("password") || "");
  const configured = getAdminPassword();
  if (!configured || !safeEqual(password, configured)) redirect("/admin/login?error=1");
  cookies().set(COOKIE_NAME, createAdminCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });
  redirect("/admin/logos");
}

export async function logoutAction() {
  "use server";
  cookies().delete(COOKIE_NAME);
  redirect("/admin/login");
}
