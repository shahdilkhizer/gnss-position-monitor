-- ==============================================================
-- GNSS-Based Real-Time Position Monitoring System
-- Database Schema for MySQL 8.0+ / MariaDB
-- ==============================================================

CREATE DATABASE IF NOT EXISTS `gnss_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `gnss_db`;

-- --------------------------------------------------------------
-- Table 1: Users (Role-based Authentication: Manager & Driver)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'driver', -- 'manager' or 'driver'
  `full_name` VARCHAR(100) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_username` (`username`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------
-- Table 2: Location Logs (GNSS Telemetry & Route History)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `location_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` VARCHAR(100) NOT NULL,
  `user_name` VARCHAR(100) NULL,
  `latitude` DOUBLE NOT NULL,
  `longitude` DOUBLE NOT NULL,
  `speed` FLOAT DEFAULT 0.0,
  `heading` FLOAT DEFAULT 0.0,
  `accuracy` FLOAT DEFAULT 0.0,
  `battery` INT DEFAULT 100,
  `recorded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_logs_device_id` (`device_id`),
  INDEX `idx_logs_recorded_at` (`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------
-- Sample Seed Data (Default System Credentials)
-- Manager:  username: manager  | password: admin123
-- Driver:   username: driver1  | password: driver123
-- (Bcrypt hashed passwords)
-- --------------------------------------------------------------
INSERT IGNORE INTO `users` (`id`, `username`, `password_hash`, `role`, `full_name`) VALUES
(1, 'manager', '$2b$12$K1r6tE16FpW3j7R9c.7N/.qX3CjG1yM5Xm1cQcWJ2G8dD7yqW5jWy', 'manager', 'Fleet Operations Manager'),
(2, 'driver1', '$2b$12$4mU8bQ99e3Q3r7Z5c.1K/.rV2LkK2zN6Yn2dRdXK3H9eE8zrX6kXz', 'driver', 'Vehicle 01 - Field Driver');
