-- Migration 004: Create translation history table
-- Description: Table to store translation history for users (optional feature)

CREATE TABLE IF NOT EXISTS translation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    translation_service VARCHAR(50) NOT NULL DEFAULT 'libretranslate',
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_translation_history_user_id ON translation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_translation_history_device_id ON translation_history(device_id);
CREATE INDEX IF NOT EXISTS idx_translation_history_created_at ON translation_history(created_at);
CREATE INDEX IF NOT EXISTS idx_translation_history_languages ON translation_history(source_language, target_language);
CREATE INDEX IF NOT EXISTS idx_translation_history_service ON translation_history(translation_service);

-- Add constraints
ALTER TABLE translation_history ADD CONSTRAINT chk_original_text_not_empty 
    CHECK (LENGTH(TRIM(original_text)) > 0);

ALTER TABLE translation_history ADD CONSTRAINT chk_translated_text_not_empty 
    CHECK (LENGTH(TRIM(translated_text)) > 0);

ALTER TABLE translation_history ADD CONSTRAINT chk_confidence_score_valid 
    CHECK (confidence_score IS NULL OR (confidence_score >= 0.00 AND confidence_score <= 1.00));

-- Create a view for recent translations (last 7 days)
CREATE OR REPLACE VIEW recent_translations AS
SELECT 
    th.*,
    u.email as user_email,
    u.display_name as user_display_name,
    d.platform as device_platform
FROM translation_history th
JOIN users u ON th.user_id = u.id
LEFT JOIN devices d ON th.device_id = d.id
WHERE th.created_at > NOW() - INTERVAL '7 days'
ORDER BY th.created_at DESC;