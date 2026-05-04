DROP TABLE if EXISTS users CASCADE;
DROP TABLE if EXISTS tokens CASCADE;

CREATE TABLE users(
    id bigint PRIMARY KEY,
    username text not null,
    created_at timestamptz default now(),
    password text not null,
);

CREATE TABLE tokens(

);
