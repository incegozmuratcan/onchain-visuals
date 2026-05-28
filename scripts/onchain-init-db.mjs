import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to initialize onchain storage tables.");
  process.exit(1);
}

const schema = `
create table if not exists onchain_source_runs (
  id text primary key,
  source text not null,
  dataset_slug text not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  error_message text,
  rows_fetched integer not null default 0,
  payload_hash text,
  metadata_json jsonb not null default '{}'::jsonb
);

create index if not exists onchain_source_runs_dataset_started_idx on onchain_source_runs(dataset_slug, started_at desc);

create table if not exists onchain_chart_snapshots (
  id bigserial primary key,
  dataset_slug text not null,
  chart_type text not null,
  period text not null,
  date date not null,
  title text not null,
  subtitle text not null,
  headline_metrics_json jsonb not null default '[]'::jsonb,
  series_json jsonb not null default '{}'::jsonb,
  insights_json jsonb not null default '[]'::jsonb,
  source_label text not null,
  source_url text,
  freshness_status text not null,
  generated_at timestamptz not null default now(),
  metadata_json jsonb not null default '{}'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb
);

create index if not exists onchain_chart_snapshots_dataset_generated_idx on onchain_chart_snapshots(dataset_slug, generated_at desc);
`;

const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1"], { input: schema, stdio: ["pipe", "inherit", "inherit"] });
if (result.error) {
  console.error("Failed to run psql. Install the PostgreSQL client or apply the onchain CREATE TABLE statements from db/schema.sql manually.");
  console.error(result.error.message);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("Onchain storage tables are initialized or already existed.");
