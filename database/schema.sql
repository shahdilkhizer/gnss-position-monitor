-- ==============================================================
-- GNSS-Based Real-Time Position Monitoring System
-- Database Schema for MySQL 8.0+ / MariaDB
-- ==============================================================

CREATE DATABASE IF NOT EXISTS `gnss_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `gnss_db`;

-- --------------------------------------------------------------
-- Table 1: Users (Multi-Role Access: Admin, Manager, Agent)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'agent', -- 'admin', 'manager', 'agent'
  `full_name` VARCHAR(100) NULL,
  `country` VARCHAR(100) NULL DEFAULT 'Pakistan',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `reset_token` VARCHAR(255) NULL,
  `reset_token_expires` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_username` (`username`),
  INDEX `idx_users_email` (`email`),
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
