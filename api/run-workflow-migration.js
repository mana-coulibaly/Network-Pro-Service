// Script pour exécuter la migration du workflow
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    try {
        console.log('📦 Lecture du script de migration du workflow...');
        const migrationPath = path.join(__dirname, '..', 'sql', 'migration_workflow_states.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🔄 Exécution de la migration du workflow...');
        await pool.query(migrationSQL);

        console.log('✅ Migration du workflow terminée avec succès !');
        
        // Vérification des statuts disponibles
        console.log('\n📊 Vérification des contraintes de statut:');
        const result = await pool.query(`
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint
            WHERE conrelid = 'tickets'::regclass
            AND conname = 'tickets_ticket_status_check'
        `);
        
        if (result.rows.length > 0) {
            console.log('Contrainte trouvée:');
            console.log(result.rows[0].constraint_definition);
        }
        
        // Vérification des statuts actuels des tickets
        console.log('\n📊 Statuts actuels des tickets:');
        const statusCount = await pool.query(`
            SELECT ticket_status, COUNT(*) as count
            FROM tickets
            GROUP BY ticket_status
            ORDER BY ticket_status
        `);
        
        console.table(statusCount.rows);
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error.message);
        if (error.code) {
            console.error('Code d\'erreur PostgreSQL:', error.code);
        }
        if (error.detail) {
            console.error('Détails:', error.detail);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
