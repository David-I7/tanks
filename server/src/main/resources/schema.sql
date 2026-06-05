DROP TABLE if EXISTS refresh_tokens CASCADE;
DROP TABLE if EXISTS users CASCADE;
DROP TABLE if EXISTS game_results CASCADE;
DROP TYPE if EXISTS game_outcome;

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

CREATE TYPE game_outcome AS ENUM ('WIN','DRAW');

CREATE TABLE game_results(
    id UUID PRIMARY KEY default gen_random_uuid(),
    outcome game_outcome not null,
    player_a_id bigint REFERENCES users(id),
    player_b_id bigint REFERENCES users(id),
    winner_id bigint REFERENCES users(id),
    game_started_at timestamptz not null,
    game_ended_at timestamptz not null default now()
);