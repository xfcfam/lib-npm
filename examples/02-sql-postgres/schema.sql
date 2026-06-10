-- Schema for the xf-sql-postgres example.
-- Loaded once at boot via `pnpm db:schema` (or `pnpm db:reset` to wipe + reload).

DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  email       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email)
);

INSERT INTO users (name, email) VALUES
  ('Alice',   'alice@example.com'),
  ('Bob',     'bob@example.com'),
  ('Charlie', 'charlie@example.com');
