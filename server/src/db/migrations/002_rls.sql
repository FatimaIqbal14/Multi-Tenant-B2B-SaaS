-- 002_rls.sql  |  Row-Level Security: the database itself enforces tenant isolation.
--
-- How it works:
--   1. For every request the API opens a transaction and runs
--        SELECT set_config('app.current_tenant', '<tenant uuid>', true);   -- true = transaction-local
--   2. Policies below compare each row's tenant to that setting.
--   3. The API connects as `app_user` (no superuser, no BYPASSRLS), so it cannot skip the policies,
--      even if a developer forgets a WHERE tenant_id = ... clause.

GRANT USAGE ON SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants, roles, users, bookings, password_reset_tokens TO app_user;

-- Returns NULL (-> matches no rows) when no tenant has been set. Never raises.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_tenant', true), '')::uuid
$$;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants
  USING (id = app_current_tenant())
  WITH CHECK (id = app_current_tenant());

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON roles
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bookings
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON password_reset_tokens
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

-- Login happens BEFORE we know the tenant ("which org is acme?"). Instead of weakening the
-- policy, we expose one narrow, audited lookup that returns only public fields.
CREATE OR REPLACE FUNCTION resolve_tenant(p_slug text)
RETURNS TABLE (id uuid, name text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.name, t.slug FROM tenants t WHERE t.slug = lower(p_slug)
$$;
REVOKE ALL ON FUNCTION resolve_tenant(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_tenant(text) TO app_user;
