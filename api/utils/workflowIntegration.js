/**
 * Utilitaires pour intégrer le workflow dans les endpoints
 */

const ticketWorkflow = require('../services/ticketWorkflow');

/**
 * Met à jour l'état d'un ticket après un punch
 * @param {object} pool - Pool de connexion PostgreSQL
 * @param {string} ticketId - ID du ticket
 * @param {string} punchType - Type de punch effectué
 * @returns {Promise<{success: boolean, newState?: string, error?: string}>}
 */
async function updateTicketStateFromPunch(pool, ticketId, punchType) {
    try {
        // Récupérer l'état actuel du ticket
        const ticketQuery = await pool.query(
            `SELECT ticket_status FROM tickets WHERE id = $1`,
            [ticketId]
        );

        if (!ticketQuery.rowCount) {
            return { success: false, error: 'Ticket non trouvé' };
        }

        const currentState = ticketQuery.rows[0].ticket_status;

        // Vérifier si le punch est valide
        const validation = ticketWorkflow.canPerformPunch(currentState, punchType);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Obtenir le nouvel état
        let newState = ticketWorkflow.getStateFromPunch(punchType);
        
        // Cas spécial : back_wh (retour à l'entrepôt après le site) = WAREHOUSE_ARRIVED
        // C'est une transition spéciale depuis SITE_LEFT vers WAREHOUSE_ARRIVED
        if (punchType === 'back_wh') {
            newState = ticketWorkflow.WORKFLOW_STATES.WAREHOUSE_ARRIVED;
        }

        // Cas spécial : start_site peut déclencher WAREHOUSE_LEFT automatiquement si on était à WAREHOUSE_ARRIVED
        // Car pour aller au site, on doit quitter l'entrepôt
        if (punchType === 'start_site' && currentState === ticketWorkflow.WORKFLOW_STATES.WAREHOUSE_ARRIVED) {
            // On passe d'abord à WAREHOUSE_LEFT, puis à SITE_ARRIVED
            const warehouseLeftState = ticketWorkflow.WORKFLOW_STATES.WAREHOUSE_LEFT;
            await pool.query(
                `UPDATE tickets SET ticket_status = $1 WHERE id = $2`,
                [warehouseLeftState, ticketId]
            );
            // newState reste SITE_ARRIVED, on continue
        }

        // Mettre à jour l'état du ticket
        await pool.query(
            `UPDATE tickets SET ticket_status = $1 WHERE id = $2`,
            [newState, ticketId]
        );

        return { success: true, newState };
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'état:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Vérifie les prérequis pour compléter un ticket
 * @param {object} pool - Pool de connexion PostgreSQL
 * @param {string} ticketId - ID du ticket
 * @param {string} descriptionFromBody - Description fournie dans le body (optionnel)
 * @returns {Promise<{valid: boolean, error?: string, missing?: string[]}>}
 */
async function validateTicketCompletion(pool, ticketId, descriptionFromBody = null) {
    try {
        // Récupérer les données du ticket
        const ticketQuery = await pool.query(
            `SELECT ticket_status, odo_start, odo_end, description 
             FROM tickets WHERE id = $1`,
            [ticketId]
        );

        if (!ticketQuery.rowCount) {
            return { valid: false, error: 'Ticket non trouvé' };
        }

        const ticket = ticketQuery.rows[0];

        // Récupérer les timestamps
        const timestampsQuery = await pool.query(
            `SELECT punch_type FROM ticket_timestamps WHERE ticket_id = $1`,
            [ticketId]
        );

        const presentPunches = new Set(timestampsQuery.rows.map(r => r.punch_type));
        const requiredPunches = ['leave_home', 'reach_wh', 'start_site', 'leave_site', 'back_wh', 'back_home'];
        const missingPunches = requiredPunches.filter(p => !presentPunches.has(p));

        // Utiliser la description du body si fournie, sinon celle de la base
        const descriptionToValidate = descriptionFromBody !== null && descriptionFromBody !== undefined 
            ? descriptionFromBody.trim() 
            : (ticket.description ? ticket.description.trim() : '');

        const ticketData = {
            odo_start: ticket.odo_start,
            odo_end: ticket.odo_end,
            description: descriptionToValidate,
            missingPunches
        };

        return ticketWorkflow.canCompleteTicket(ticket.ticket_status, ticketData);
    } catch (error) {
        console.error('Erreur lors de la validation:', error);
        return { valid: false, error: error.message };
    }
}

module.exports = {
    updateTicketStateFromPunch,
    validateTicketCompletion
};
