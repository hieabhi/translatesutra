-- Migration 003: Create devices table
-- Description: Table to track registered devices per user

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_uuid VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    app_version VARCHAR(50),
    device_name VARCHAR(255),
    os_version VARCHAR(100),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_uuid ON devices(device_uuid);
CREATE INDEX IF NOT EXISTS idx_devices_platform ON devices(platform);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);

-- Unique constraint: one device UUID per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_user_device_unique 
    ON devices(user_id, device_uuid);

-- Update trigger for updated_at
CREATE TRIGGER update_devices_updated_at 
    BEFORE UPDATE ON devices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraints
ALTER TABLE devices ADD CONSTRAINT chk_platform_valid 
    CHECK (platform IN ('windows', 'macos', 'linux', 'android', 'ios'));

ALTER TABLE devices ADD CONSTRAINT chk_device_uuid_not_empty 
    CHECK (LENGTH(TRIM(device_uuid)) > 0);

-- Create a view for active devices (seen in last 30 days)
CREATE OR REPLACE VIEW active_devices AS
SELECT 
    d.*,
    u.email as user_email,
    u.display_name as user_display_name
FROM devices d
JOIN users u ON d.user_id = u.id
WHERE d.last_seen > NOW() - INTERVAL '30 days'
AND u.is_active = true;