DROP TABLE if EXISTS users CASCADE;
DROP TABLE if EXISTS refresh_tokens CASCADE;
DROP TABLE if EXISTS lobbies CASCADE;
DROP TYPE if EXISTS lobby_type;
DROP TYPE if EXISTS lobby_status;


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

CREATE TYPE lobby_type AS ENUM ('PRIVATE','QUICK_MATCH');

CREATE TYPE lobby_status AS ENUM ('WAITING','READY','IN_GAME');

CREATE TABLE lobbies(
    id UUID PRIMARY KEY default gen_random_uuid(),
    type lobby_type not null,
    status lobby_status not null default 'WAITING',
    host_id bigint not null references users(id),
    opponent_id bigint references users(id)
);
