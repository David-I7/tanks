DROP TABLE if EXISTS users CASCADE;
DROP TABLE if EXISTS refresh_tokens CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users(
    id bigserial PRIMARY KEY,
    username text unique not null,
    email text unique not null,
    created_at timestamptz default now(),
    password text default null
);

CREATE TABLE refresh_tokens(
    id UUID PRIMARY KEY default gen_random_uuid(),
    user_id bigint not null references users(id),
    revoked boolean not null default false,
    expires_at timestamptz not null
);
