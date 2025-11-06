-- Migration 002: Create refresh tokens table
-- Description: Table to store refresh tokens for JWT authentication

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked_at);

-- Add constraint to ensure tokens are not expired when created
ALTER TABLE refresh_tokens ADD CONSTRAINT chk_expires_in_future 
    CHECK (expires_at > created_at);

-- Clean up expired tokens periodically (this would be run by a cron job)
-- CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM refresh_tokens WHERE expires_at < NOW();
-- END;
-- $$ LANGUAGE plpgsql;