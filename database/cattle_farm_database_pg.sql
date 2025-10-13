-- PostgreSQL-compatible schema derived from original MySQL script
-- Run this on your Postgres server to create tables

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) DEFAULT 'farm_manager',
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  profile_image VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS farms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(255) NOT NULL,
  size_hectares NUMERIC(10,2) NOT NULL,
  center_latitude NUMERIC(11,8) NOT NULL,
  center_longitude NUMERIC(11,8) NOT NULL,
  boundary_radius_meters INT NOT NULL DEFAULT 2000,
  owner_id INT NOT NULL,
  description TEXT,
  established_date DATE,
  farm_type VARCHAR(32) DEFAULT 'mixed',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS gps_data (
  id SERIAL PRIMARY KEY,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add additional tables conversions as needed from the MySQL schema