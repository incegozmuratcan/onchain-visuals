create table if not exists logos (
  id bigserial primary key,
  canonical_name text not null,
  slug text not null unique,
  category text not null check (category in ('chain','project','asset')),
  aliases jsonb not null default '[]'::jsonb,
  coingecko_id text,
  defillama_slug text,
  status text not null default 'missing' check (status in ('approved','needs_review','missing','rejected')),
  visual_status text not null default 'fallback' check (visual_status in ('accepted','fallback','visual_rejected','needs_review')),
  source_provider text,
  source_url text,
  source_note text,
  raw_url text,
  optimized_url text,
  local_path text,
  blob_raw_url text,
  blob_optimized_url text,
  fallback_text text,
  fallback_color text,
  sha256 text,
  width integer,
  height integer,
  file_size integer,
  mime_type text,
  used_in_metrics jsonb not null default '[]'::jsonb,
  last_synced_at timestamptz,
  approved_at timestamptz,
  rejected_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists logo_sources (
  id bigserial primary key,
  logo_id bigint not null references logos(id) on delete cascade,
  provider text not null,
  source_url text not null,
  source_note text,
  status text not null default 'candidate' check (status in ('candidate','downloaded','failed','rejected','approved')),
  raw_url text,
  optimized_url text,
  sha256 text,
  width integer,
  height integer,
  file_size integer,
  mime_type text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  encrypted boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists logos_status_idx on logos(status);
create index if not exists logos_visual_status_idx on logos(visual_status);
create index if not exists logos_category_idx on logos(category);
create index if not exists logo_sources_logo_id_idx on logo_sources(logo_id);
