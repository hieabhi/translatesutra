import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { pool } from './db';

/**
 * Run database migrations
 */
async function runMigrations() {
  console.log('🔄 Starting database migrations...');

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get list of applied migrations
    const appliedMigrations = await pool.query(
      'SELECT filename FROM migrations ORDER BY applied_at'
    );
    const appliedSet = new Set(appliedMigrations.rows.map(row => row.filename));

    // Get list of migration files
    const migrationsDir = join(__dirname, '../migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('ℹ️ No migration files found');
      return;
    }

    let appliedCount = 0;

    for (const filename of migrationFiles) {
      if (appliedSet.has(filename)) {
        console.log(`⏭️ Skipping already applied migration: ${filename}`);
        continue;
      }

      console.log(`🔄 Applying migration: ${filename}`);

      const filePath = join(migrationsDir, filename);
      const sql = readFileSync(filePath, 'utf8');

      // Run migration in a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Execute the migration SQL
        await client.query(sql);
        
        // Record the migration as applied
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );
        
        await client.query('COMMIT');
        console.log(`✅ Applied migration: ${filename}`);
        appliedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to apply migration ${filename}:`, error);
        throw error;
      } finally {
        client.release();
      }
    }

    if (appliedCount === 0) {
      console.log('✅ All migrations are up to date');
    } else {
      console.log(`✅ Applied ${appliedCount} migration(s) successfully`);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Check if database is ready (tables exist)
 */
async function checkDatabaseReady(): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'refresh_tokens', 'devices')
    `);
    
    return result.rows.length >= 3;
  } catch (error) {
    console.error('Error checking database:', error);
    return false;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 Migrations completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { runMigrations, checkDatabaseReady };