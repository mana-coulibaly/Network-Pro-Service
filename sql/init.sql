-- extensions (gen_random_uuid vient de pgcrypto)
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- users
create table if not exists users(
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    password_hash text not null,
    role text not null default 'tech' check (role in ('tech','manager','admin')),
    created_at timestamptz default now()
);


-- tickets
create table if not exists tickets(
    id uuid primary key default gen_random_uuid(),
    tech_id uuid not null references users(id) on delete cascade,
    client_name text not null,
    site_name text not null,
    site_address text not null,
    ticket_status text not null default 'draft' check (ticket_status in ('draft','en_cours','clos')),
    purpose text,
    created_at timestamptz default now()
);


create index if not exists idx_tickets_tech_created
    on tickets(tech_id, created_at desc);


-- timestamps (idempotent)  <<== corrections ici
create table if not exists ticket_timestamps(
    ticket_id  uuid not null references tickets(id) on delete cascade,
    punch_type text not null check (punch_type in ('leave_home','reach_wh','start_site','leave_site','back_wh','back_home')),
    ts timestamptz not null,
    primary key (ticket_id, punch_type)
);


-- Pièces / appareils utilisés sur un ticket
create table if not exists ticket_parts (
    id            uuid primary key default gen_random_uuid(),
    ticket_id     uuid not null references tickets(id) on delete cascade,
    part_action   text not null check (part_action in ('installed','replaced')),
    part_name     text not null,
    serial_number text not null,                          -- à normaliser côté API
    part_state    text not null check (part_state in ('new','used','DOA')),
    created_at    timestamptz default now()
);

-- Index usuels
create index if not exists idx_ticket_parts_ticket
    on ticket_parts(ticket_id);

create index if not exists idx_ticket_parts_action
    on ticket_parts(ticket_id, part_action);

-- Un même n° de série ne doit pas être saisi 2x pour le même ticket
create unique index if not exists unique_ticket_parts_serial_per_ticket
    on ticket_parts(ticket_id, serial_number);

-- Profil du technicien (taux, etc.)
create table if not exists tech_profiles (
    user_id uuid primary key references users(id) on delete cascade,
    hourly_rate numeric(10,2),
    km_rate    numeric(10,2),
    notes      text
);

-- Équipements assignés à un technicien
create table if not exists tech_assets (
    id uuid primary key default gen_random_uuid(),
    tech_id uuid not null references users(id) on delete cascade,
    asset_name text not null,
    serial_number text not null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (tech_id, serial_number)   -- pas 2 fois le même SN pour le même tech
);

-- Certificats d'un technicien
create table if not exists tech_certifications (
    id uuid primary key default gen_random_uuid(),
    tech_id uuid not null references users(id) on delete cascade,
    cert_name text not null,
    expires_on date,
    created_at timestamptz not null default now()
);