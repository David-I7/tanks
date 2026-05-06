DROP TABLE if EXISTS users CASCADE;
DROP TABLE if EXISTS tokens CASCADE;
DROP TYPE if EXISTS login_provider CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users(
    id bigint PRIMARY KEY,
    username text unique,
    email text unique,
    created_at timestamptz default now(),
    password text default null,
);

CREATE TYPE login_provider AS ENUM ('LOCAL','GOOGLE');

CREATE TABLE user_identities(
    user_id bigint not null references users(id) on delete cascade,
    provider login_provider not null on delete cascade,
    provider_user_id text not null,

    PRIMARY KEY (provider_user_id,provider)
);

CREATE TABLE refresh_tokens(
    id UUID PRIMARY KEY default gen_random_uuid(),
    user_id bigint not null references users(id),
    token_hash text not null,
    revoked boolean not null default false,
    expires_at timestamptz not null,
);
