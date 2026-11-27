-- Migration 007: Dedicated Application Database Role
-- PostgreSQL superusers inherently bypass RLS. Production multi-tenancy mandates
-- a dedicated non-superuser role (eldercare_app) without BYPASSRLS privilege.

-- Note: Set the role password via environment/provisioning scripts; never commit real passwords.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'eldercare_app') THEN
    CREATE ROLE eldercare_app WITH LOGIN PASSWORD 'CHANGE_ME_VIA_ALTER_ROLE' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

GRANT CONNECT ON DATABASE eldercareos TO eldercare_app;
GRANT USAGE ON SCHEMA public TO eldercare_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO eldercare_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO eldercare_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO eldercare_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO eldercare_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO eldercare_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO eldercare_app;
