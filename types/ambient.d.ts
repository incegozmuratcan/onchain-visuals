/// <reference types="node" />
/// <reference types="react" />
/// <reference types="react-dom" />

declare module "server-only";
declare module "next/link" {
  import * as React from "react";
  export default function Link(props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: React.ReactNode; className?: string }): JSX.Element;
}
declare module "next/navigation" {
  export function redirect(url: string): never;
  export function notFound(): never;
}

declare namespace React {
  interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
    action?: string | ((formData: FormData) => void | Promise<void>);
  }
}
declare module "next" { export type Metadata = Record<string, unknown>; }
declare module "next/server" {
  export class NextRequest extends Request { nextUrl: URL; }
  export class NextResponse extends Response { static json(body: unknown, init?: ResponseInit): NextResponse; constructor(body?: BodyInit | null, init?: ResponseInit); }
}
declare module "next/headers" { export function cookies(): { get(name: string): { value: string } | undefined; set(name: string, value: string, options?: Record<string, unknown>): void; delete(name: string): void }; }
declare module "*.css";
declare module "lucide-react" { export const Check: any; export const Copy: any; export const Download: any; export const ChevronDown: any; }
interface RequestInit { next?: { revalidate?: number } | Record<string, unknown>; }
