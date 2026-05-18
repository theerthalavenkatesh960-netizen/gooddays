-- Vehicle Tracker Tables
-- Run this migration to enable the Vehicles feature with real API

CREATE TABLE IF NOT EXISTS vehicles (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    make        TEXT,
    model       TEXT,
    year        INTEGER,
    reg_no      TEXT,
    fuel_type   TEXT NOT NULL DEFAULT 'Petrol',
    color       TEXT NOT NULL DEFAULT '#6C63FF',
    odometer    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_refills (
    id          SERIAL PRIMARY KEY,
    vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    litres      DOUBLE PRECISION NOT NULL,
    amount      DOUBLE PRECISION NOT NULL,
    odometer    INTEGER NOT NULL,
    mileage     DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS vehicle_services (
    id          SERIAL PRIMARY KEY,
    vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    items       TEXT,           -- JSON array e.g. '["Engine Oil","Air Filter"]'
    cost        DOUBLE PRECISION NOT NULL,
    next_due    TIMESTAMPTZ,
    odometer    INTEGER
);

CREATE TABLE IF NOT EXISTS vehicle_issues (
    id          SERIAL PRIMARY KEY,
    vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL DEFAULT '',
    resolved    BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for fast lookups by user / vehicle
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id        ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_refills_vehicle  ON vehicle_refills(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_services_vehicle ON vehicle_services(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_issues_vehicle   ON vehicle_issues(vehicle_id);
