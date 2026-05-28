CREATE TABLE IF NOT EXISTS logos (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'project',
  approved_logo_url TEXT,
  approved_source_id BIGINT,
  status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE logos ADD COLUMN IF NOT EXISTS coingecko_id TEXT;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS coinmarketcap_id TEXT;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS last_fetch_error TEXT;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS last_fetch_provider TEXT;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS last_fetch_at TIMESTAMPTZ;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS fallback_text TEXT;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS fallback_color TEXT;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS visual_status TEXT;

CREATE TABLE IF NOT EXISTS logo_sources (
  id BIGSERIAL PRIMARY KEY,
  logo_id BIGINT NOT NULL REFERENCES logos(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  source_url TEXT,
  image_url TEXT NOT NULL,
  blob_url TEXT,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'approved', 'rejected')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS logo_aliases (
  id BIGSERIAL PRIMARY KEY,
  logo_id BIGINT NOT NULL REFERENCES logos(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'admin',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(alias)
);

CREATE INDEX IF NOT EXISTS logo_aliases_logo_id_idx ON logo_aliases(logo_id);
CREATE INDEX IF NOT EXISTS logo_aliases_alias_idx ON logo_aliases(alias);


CREATE TABLE IF NOT EXISTS admin_api_secrets (
  provider TEXT PRIMARY KEY,
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  masked_hint TEXT,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS logo_sources_logo_id_idx ON logo_sources(logo_id);
CREATE INDEX IF NOT EXISTS logo_sources_status_idx ON logo_sources(status);
CREATE INDEX IF NOT EXISTS logos_status_idx ON logos(status);
CREATE INDEX IF NOT EXISTS logos_coingecko_id_idx ON logos(coingecko_id);
CREATE INDEX IF NOT EXISTS logos_coinmarketcap_id_idx ON logos(coinmarketcap_id);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS logos_set_updated_at ON logos;
CREATE TRIGGER logos_set_updated_at BEFORE UPDATE ON logos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS logo_sources_set_updated_at ON logo_sources;
CREATE TRIGGER logo_sources_set_updated_at BEFORE UPDATE ON logo_sources FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS admin_settings_set_updated_at ON admin_settings;
CREATE TRIGGER admin_settings_set_updated_at BEFORE UPDATE ON admin_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();


DROP TRIGGER IF EXISTS admin_api_secrets_set_updated_at ON admin_api_secrets;
CREATE TRIGGER admin_api_secrets_set_updated_at BEFORE UPDATE ON admin_api_secrets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
