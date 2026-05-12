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

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS logo_sources_logo_id_idx ON logo_sources(logo_id);
CREATE INDEX IF NOT EXISTS logo_sources_status_idx ON logo_sources(status);
CREATE INDEX IF NOT EXISTS logos_status_idx ON logos(status);

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
