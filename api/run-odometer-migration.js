require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(
            path.join(__dirname, '../sql/migration_odometer_images.sql'),
            'utf8'
        );
        
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        
        console.log('✅ Migration odomètre images réussie');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur migration:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
