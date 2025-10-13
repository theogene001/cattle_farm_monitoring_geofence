-- Cattle Farm Monitoring System Database Schema
-- Created for MySQL Database
-- Author: Cattle Farm Monitoring Project
-- Date: 2025-10-02

-- Drop database if exists (for fresh installation)
DROP DATABASE IF EXISTS cattle_farm_monitoring;

-- Create the main database
CREATE DATABASE cattle_farm_monitoring;
USE cattle_farm_monitoring;

-- ==============================================
-- USER MANAGEMENT TABLES
-- ==============================================

-- Users table for authentication and user management
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'farm_manager', 'operator', 'viewer') DEFAULT 'farm_manager',
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    profile_image VARCHAR(255)
);

-- User sessions for managing login sessions
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==============================================
-- FARM MANAGEMENT TABLES
-- ==============================================

-- Farms table for multiple farm support
CREATE TABLE farms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255) NOT NULL,
    size_hectares DECIMAL(10,2) NOT NULL,
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    boundary_radius_meters INT NOT NULL DEFAULT 2000,
    owner_id INT NOT NULL,
    description TEXT,
    established_date DATE,
    farm_type ENUM('dairy', 'beef', 'mixed') DEFAULT 'mixed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Farm users association (many-to-many relationship)
CREATE TABLE farm_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'manager', 'operator', 'viewer') DEFAULT 'viewer',
    permissions JSON,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_farm_user (farm_id, user_id)
);

-- ==============================================
-- VIRTUAL FENCE MANAGEMENT
-- ==============================================

-- Virtual fences table
CREATE TABLE virtual_fences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INT NOT NULL,
    fence_type ENUM('main_pasture', 'watering_area', 'feeding_area', 'restricted_zone', 'custom') DEFAULT 'custom',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    alert_buffer_meters INT DEFAULT 50,
    priority_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- ==============================================
-- ANIMAL MANAGEMENT
-- ==============================================

-- Animals table for livestock information (simplified for core tracking)
CREATE TABLE animals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    tag_number VARCHAR(50) UNIQUE,
    breed VARCHAR(100),
    gender ENUM('male', 'female') NOT NULL,
    birth_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- ==============================================
-- COLLAR AND DEVICE MANAGEMENT
-- ==============================================

-- Collars/devices table for tracking equipment
CREATE TABLE collars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collar_serial VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    manufacturer VARCHAR(100),
    firmware_version VARCHAR(50),
    hardware_version VARCHAR(50),
    battery_capacity_mah INT DEFAULT 5000,
    current_battery_level INT NOT NULL DEFAULT 100,
    battery_voltage DECIMAL(4,2),
    signal_strength INT,
    status ENUM('active', 'inactive', 'maintenance', 'warning', 'error') DEFAULT 'active',
    last_maintenance DATE,
    next_maintenance DATE,
    purchase_date DATE,
    warranty_expires DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_functional BOOLEAN DEFAULT TRUE
);

-- Animal collar assignments (linking animals to their collars)
CREATE TABLE animal_collars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    animal_id INT NOT NULL,
    collar_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT NOT NULL,
    removed_at TIMESTAMP NULL,
    removed_by INT NULL,
    removal_reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE,
    FOREIGN KEY (collar_id) REFERENCES collars(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (removed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- ==============================================
-- LOCATION AND TRACKING DATA
-- ==============================================

-- Animal location history (GPS tracking data)
CREATE TABLE animal_locations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    animal_id INT NOT NULL,
    collar_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    altitude_meters DECIMAL(8,2),
    accuracy_meters DECIMAL(6,2),
    speed_kmh DECIMAL(5,2),
    heading_degrees DECIMAL(5,2),
    recorded_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    battery_level INT,
    signal_quality ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
    temperature_celsius DECIMAL(4,1),
    is_within_fence BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE,
    FOREIGN KEY (collar_id) REFERENCES collars(id) ON DELETE CASCADE,
    INDEX idx_animal_timestamp (animal_id, recorded_at),
    INDEX idx_collar_timestamp (collar_id, recorded_at),
    INDEX idx_location (latitude, longitude),
    INDEX idx_recorded_at (recorded_at)
);



-- ==============================================
-- ALERT AND NOTIFICATION SYSTEM
-- ==============================================

-- Alerts table for system notifications (focused on core geofence functionality)
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    animal_id INT,
    collar_id INT,
    fence_id INT,
    alert_type ENUM('fence_breach', 'low_battery', 'device_offline', 'maintenance_due', 'system_error') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    alert_data JSON,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by INT NULL,
    resolved_at TIMESTAMP NULL,
    resolved_by INT NULL,
    resolution_notes TEXT,
    status ENUM('active', 'acknowledged', 'resolved', 'dismissed') DEFAULT 'active',
    auto_generated BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE,
    FOREIGN KEY (collar_id) REFERENCES collars(id) ON DELETE CASCADE,
    FOREIGN KEY (fence_id) REFERENCES virtual_fences(id) ON DELETE CASCADE,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_farm_alerts (farm_id, triggered_at),
    INDEX idx_alert_status (status),
    INDEX idx_alert_type (alert_type)
);

-- Alert subscriptions for users (who gets what notifications)
CREATE TABLE alert_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    farm_id INT NOT NULL,
    alert_type ENUM('fence_breach', 'low_battery', 'device_offline', 'maintenance_due', 'system_error') NOT NULL,
    delivery_method ENUM('email', 'sms', 'push', 'in_app') NOT NULL,
    min_severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_farm_alert_method (user_id, farm_id, alert_type, delivery_method)
);



-- ==============================================
-- ANALYTICS AND REPORTING DATA
-- ==============================================

-- Daily analytics summary for farms (simplified for core functionality)
CREATE TABLE daily_farm_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    analytics_date DATE NOT NULL,
    total_animals INT NOT NULL DEFAULT 0,
    active_collars INT NOT NULL DEFAULT 0,
    total_alerts INT NOT NULL DEFAULT 0,
    critical_alerts INT NOT NULL DEFAULT 0,
    avg_battery_level DECIMAL(5,2),
    fence_breaches INT NOT NULL DEFAULT 0,
    system_uptime_percentage DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_farm_date (farm_id, analytics_date),
    INDEX idx_farm_analytics_date (farm_id, analytics_date)
);

-- ==============================================
-- SYSTEM CONFIGURATION AND SETTINGS
-- ==============================================

-- System settings for the application
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'integer', 'float', 'boolean', 'json') NOT NULL DEFAULT 'string',
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_user_configurable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Farm-specific settings
CREATE TABLE farm_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'integer', 'float', 'boolean', 'json') NOT NULL DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NOT NULL,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_farm_setting (farm_id, setting_key)
);

-- ==============================================
-- AUDIT AND LOGGING
-- ==============================================

-- Audit log for tracking important system changes
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    farm_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE SET NULL,
    INDEX idx_user_audit (user_id, timestamp),
    INDEX idx_farm_audit (farm_id, timestamp),
    INDEX idx_entity_audit (entity_type, entity_id),
    INDEX idx_audit_timestamp (timestamp)
);

-- ==============================================
-- INSERT INITIAL DATA
-- ==============================================

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES
('app_name', 'Cattle Farm Monitoring System', 'string', 'Application name', 'general'),
('app_version', '1.0.0', 'string', 'Application version', 'general'),
('default_map_zoom', '14', 'integer', 'Default map zoom level', 'maps'),
('default_refresh_rate_seconds', '300', 'integer', 'Default data refresh rate in seconds', 'data'),
('max_battery_alert_level', '30', 'integer', 'Battery level threshold for alerts', 'alerts'),
('fence_breach_buffer_meters', '50', 'integer', 'Default buffer distance for fence breach alerts', 'fences'),
('data_retention_days', '365', 'integer', 'Number of days to retain location data', 'data'),
('enable_real_time_tracking', 'true', 'boolean', 'Enable real-time location tracking', 'tracking'),
('enable_email_notifications', 'true', 'boolean', 'Enable email notifications', 'notifications'),
('max_animals_per_farm', '1000', 'integer', 'Maximum number of animals per farm', 'limits');

-- Insert sample admin user (password should be hashed in real implementation)
INSERT INTO users (name, email, password_hash, role, phone_number) VALUES
('System Administrator', 'admin@cattlefarm.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFXq1eaPQHHQO4e', 'admin', '+1234567890');

-- Insert sample farm
INSERT INTO farms (name, location, size_hectares, center_latitude, center_longitude, boundary_radius_meters, owner_id, description) VALUES
('Green Valley Cattle Farm', 'NYAGATARE, RWANDA', 200.00, 39.7817, -89.6501, 2000, 1, 'A modern cattle farm with virtual fence monitoring system');

-- Insert sample virtual fences
INSERT INTO virtual_fences (farm_id, name, description, center_latitude, center_longitude, radius_meters, fence_type, created_by) VALUES
(1, 'Main Pasture', 'Primary grazing area for the cattle', 39.7817, -89.6501, 2000, 'main_pasture', 1),
(1, 'Watering Area', 'Designated area for cattle to access water', 39.7825, -89.6495, 300, 'watering_area', 1);

-- Insert sample animals (simplified)
INSERT INTO animals (farm_id, name, tag_number, breed, gender) VALUES
(1, 'Bossy', 'TAG001', 'Holstein', 'female'),
(1, 'Daisy', 'TAG002', 'Angus', 'female'),
(1, 'Moo Moo', 'TAG003', 'Jersey', 'female'),
(1, 'Spot', 'TAG004', 'Holstein', 'male');

-- Insert sample collars
INSERT INTO collars (collar_serial, name, model, manufacturer, current_battery_level, status) VALUES
('COL001', 'Bossy-Collar', 'GPS-T100', 'FarmTech', 85, 'active'),
('COL002', 'Daisy-Collar', 'GPS-T100', 'FarmTech', 45, 'active'),
('COL003', 'Moo-Moo-Collar', 'GPS-T100', 'FarmTech', 20, 'warning'),
('COL004', 'Spot-Collar', 'GPS-T100', 'FarmTech', 92, 'active');

-- Link animals to collars
INSERT INTO animal_collars (animal_id, collar_id, assigned_by) VALUES
(1, 1, 1),
(2, 2, 1),
(3, 3, 1),
(4, 4, 1);

-- Insert sample alerts
INSERT INTO alerts (farm_id, animal_id, collar_id, fence_id, alert_type, severity, title, message) VALUES
(1, 1, 1, 1, 'fence_breach', 'medium', 'Fence Breach Alert', 'Bossy approached boundary line'),
(1, 3, 3, NULL, 'low_battery', 'high', 'Low Battery Warning', 'Moo Moo collar battery critically low');

-- ==============================================
-- USEFUL VIEWS FOR COMMON QUERIES
-- ==============================================

-- View for current animal status with collar information (simplified)
CREATE VIEW current_animal_status AS
SELECT 
    a.id as animal_id,
    a.name as animal_name,
    a.tag_number,
    f.name as farm_name,
    c.name as collar_name,
    c.current_battery_level,
    c.status as collar_status,
    ac.assigned_at,
    (SELECT COUNT(*) FROM alerts al WHERE al.animal_id = a.id AND al.status = 'active') as active_alerts
FROM animals a
JOIN farms f ON a.farm_id = f.id
LEFT JOIN animal_collars ac ON a.id = ac.animal_id AND ac.is_active = TRUE
LEFT JOIN collars c ON ac.collar_id = c.id
WHERE a.is_active = TRUE;

-- View for latest animal locations
CREATE VIEW latest_animal_locations AS
SELECT 
    al.animal_id,
    a.name as animal_name,
    al.latitude,
    al.longitude,
    al.recorded_at,
    al.battery_level,
    al.is_within_fence,
    f.name as farm_name
FROM animal_locations al
JOIN animals a ON al.animal_id = a.id
JOIN farms f ON a.farm_id = f.id
WHERE al.recorded_at = (
    SELECT MAX(recorded_at) 
    FROM animal_locations al2 
    WHERE al2.animal_id = al.animal_id
);

-- View for active alerts summary
CREATE VIEW active_alerts_summary AS
SELECT 
    al.id,
    al.alert_type,
    al.severity,
    al.title,
    al.message,
    al.triggered_at,
    f.name as farm_name,
    a.name as animal_name,
    c.name as collar_name,
    vf.name as fence_name
FROM alerts al
JOIN farms f ON al.farm_id = f.id
LEFT JOIN animals a ON al.animal_id = a.id
LEFT JOIN collars c ON al.collar_id = c.id
LEFT JOIN virtual_fences vf ON al.fence_id = vf.id
WHERE al.status = 'active'
ORDER BY al.severity DESC, al.triggered_at DESC;

-- ==============================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==============================================

-- Additional indexes for frequently queried columns (core functionality)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_farms_owner ON farms(owner_id);
CREATE INDEX idx_animals_farm ON animals(farm_id);
CREATE INDEX idx_collars_status ON collars(status);
CREATE INDEX idx_alerts_farm_status ON alerts(farm_id, status);

-- ==============================================
-- STORED PROCEDURES (OPTIONAL)
-- ==============================================

DELIMITER //

-- Procedure to get farm dashboard summary
CREATE PROCEDURE GetFarmDashboardSummary(IN farm_id_param INT)
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM animals WHERE farm_id = farm_id_param AND is_active = TRUE) as total_animals,
        (SELECT COUNT(*) FROM collars c 
         JOIN animal_collars ac ON c.id = ac.collar_id 
         JOIN animals a ON ac.animal_id = a.id 
         WHERE a.farm_id = farm_id_param AND ac.is_active = TRUE AND c.status = 'active') as active_collars,
        (SELECT COUNT(*) FROM virtual_fences WHERE farm_id = farm_id_param AND is_active = TRUE) as virtual_fences,
        (SELECT COUNT(*) FROM alerts WHERE farm_id = farm_id_param AND status = 'active') as active_alerts,
        (SELECT AVG(current_battery_level) FROM collars c 
         JOIN animal_collars ac ON c.id = ac.collar_id 
         JOIN animals a ON ac.animal_id = a.id 
         WHERE a.farm_id = farm_id_param AND ac.is_active = TRUE) as avg_battery_level;
END //

DELIMITER ;

-- ==============================================
-- DATABASE DOCUMENTATION
-- ==============================================

/*
CATTLE FARM MONITORING DATABASE SCHEMA DOCUMENTATION

This database schema is designed to support a streamlined cattle farm monitoring system focused on core virtual geofencing functionality with the following key features:

1. USER MANAGEMENT
   - Multi-user support with role-based access control
   - Session management for secure authentication
   - User-farm associations for multi-farm scenarios

2. FARM MANAGEMENT
   - Support for multiple farms per system
   - Geographic information with GPS coordinates
   - Farm-specific settings and configurations

3. VIRTUAL FENCE SYSTEM
   - Configurable virtual boundaries with different types
   - Alert buffer zones for early warnings
   - Priority levels for different fence areas

4. ANIMAL TRACKING (SIMPLIFIED)
   - Basic animal records for identification
   - Simplified tracking focused on location and geofencing
   - Collar assignment tracking

5. COLLAR/DEVICE MANAGEMENT
   - Device inventory with technical specifications
   - Battery monitoring and maintenance scheduling
   - Assignment tracking to animals

6. LOCATION TRACKING
   - High-frequency GPS location data storage
   - Optimized indexes for time-series queries
   - Fence breach detection capability

7. ALERT SYSTEM
   - Core alert types: fence breach, low battery, device offline, maintenance, system errors
   - User notification preferences
   - Alert lifecycle management (acknowledged, resolved)

8. ANALYTICS & REPORTING (CORE METRICS)
   - Daily aggregated analytics for farm performance
   - Focus on geofencing and system metrics

9. AUDIT & SECURITY
   - Complete audit trail for all system changes
   - User activity logging
   - Data integrity and security measures

10. SYSTEM CONFIGURATION
    - Centralized settings management
    - Farm-specific configurations

CORE FOCUS AREAS:
- Virtual geofencing and boundary management
- Real-time location tracking and alerts
- Device management and battery monitoring
- User access control and farm management
- System performance and reliability

REMOVED COMPONENTS:
- Health records and veterinary tracking
- Animal behavior analysis
- Activity pattern recognition
- Complex analytics (grazing, health metrics)
- Genealogy tracking

PERFORMANCE CONSIDERATIONS:
- Time-series data partitioning can be implemented for animal_locations table
- Regular cleanup procedures for old location data
- Proper indexing for frequently queried data patterns
- Consider read replicas for analytics workloads

SCALABILITY:
- Designed to handle multiple farms and thousands of animals
- Efficient storage for high-frequency location data
- Modular design allows for easy extension

MAINTENANCE:
- Regular OPTIMIZE TABLE operations recommended for large tables
- Monitor and adjust indexes based on query patterns
- Implement data archiving for historical data
*/

-- End of Cattle Farm Monitoring Database Schema