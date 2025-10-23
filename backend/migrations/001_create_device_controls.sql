-- Migration: create device_controls table
CREATE TABLE IF NOT EXISTS device_controls (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(128) DEFAULT NULL,
  collar_id INT DEFAULT NULL,
  command VARCHAR(255) NOT NULL,
  params JSON DEFAULT NULL,
  status VARCHAR(32) DEFAULT 'pending',
  result TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  executed_at TIMESTAMP NULL,
  INDEX idx_device (device_id),
  INDEX idx_collar (collar_id)
);
