// Script pour exécuter la migration de la base de données
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    try {
        console.log('📦 Lecture du script de migration...');
        const migrationPath = path.join(__dirname, '..', 'sql', 'migration_add_user_columns.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🔄 Exécution de la migration...');
        await pool.query(migrationSQL);

        console.log('✅ Migration terminée avec succès !');
        
        // Vérification des colonnes ajoutées
        console.log('\n📊 Vérification des colonnes de la table users:');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);
        
        console.table(result.rows);
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error.message);
        if (error.code) {
            console.error('Code d\'erreur PostgreSQL:', error.code);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
