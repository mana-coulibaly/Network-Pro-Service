/**
 * Service de gestion du workflow strict des tickets
 * 
 * Workflow: CREATED → LEFT_HOME → WAREHOUSE_ARRIVED → WAREHOUSE_LEFT → 
 *           SITE_ARRIVED → SITE_LEFT → BACK_HOME → COMPLETED
 * 
 * Chaque transition doit être validée avant de passer à l'étape suivante.
 */

const WORKFLOW_STATES = {
    CREATED: 'CREATED',
    LEFT_HOME: 'LEFT_HOME',
    WAREHOUSE_ARRIVED: 'WAREHOUSE_ARRIVED',
    WAREHOUSE_LEFT: 'WAREHOUSE_LEFT',
    SITE_ARRIVED: 'SITE_ARRIVED',
    SITE_LEFT: 'SITE_LEFT',
    BACK_HOME: 'BACK_HOME',
    COMPLETED: 'COMPLETED'
};

// Mapping des punch types vers les états du workflow
// Note: WAREHOUSE_LEFT est déclenché automatiquement avant SITE_ARRIVED dans workflowIntegration.js
const PUNCH_TO_STATE = {
    'leave_home': WORKFLOW_STATES.LEFT_HOME,
    'reach_wh': WORKFLOW_STATES.WAREHOUSE_ARRIVED,
    'start_site': WORKFLOW_STATES.SITE_ARRIVED,  // Déclenche automatiquement WAREHOUSE_LEFT si nécessaire
    'leave_site': WORKFLOW_STATES.SITE_LEFT,
    'back_wh': WORKFLOW_STATES.WAREHOUSE_ARRIVED,  // Retour à l'entrepôt après le site
    'back_home': WORKFLOW_STATES.BACK_HOME
};

// Ordre des états dans le workflow
const STATE_ORDER = [
    WORKFLOW_STATES.CREATED,
    WORKFLOW_STATES.LEFT_HOME,
    WORKFLOW_STATES.WAREHOUSE_ARRIVED,
    WORKFLOW_STATES.WAREHOUSE_LEFT,
    WORKFLOW_STATES.SITE_ARRIVED,
    WORKFLOW_STATES.SITE_LEFT,
    WORKFLOW_STATES.BACK_HOME,
    WORKFLOW_STATES.COMPLETED
];

/**
 * Vérifie si une transition d'état est valide
 * @param {string} currentState - État actuel du ticket
 * @param {string} targetState - État cible
 * @param {string} punchType - Type de punch (optionnel, pour les cas spéciaux)
 * @returns {boolean} - True si la transition est valide
 */
function isValidTransition(currentState, targetState, punchType = null) {
    const currentIndex = STATE_ORDER.indexOf(currentState);
    const targetIndex = STATE_ORDER.indexOf(targetState);

    // L'état doit exister dans le workflow
    if (currentIndex === -1 || targetIndex === -1) {
        return false;
    }

    // On ne peut avancer que d'une étape à la fois
    // Sauf pour COMPLETED qui peut être atteint depuis BACK_HOME
    if (targetState === WORKFLOW_STATES.COMPLETED) {
        return currentState === WORKFLOW_STATES.BACK_HOME;
    }

    // Cas spécial : start_site depuis WAREHOUSE_ARRIVED
    // La transition automatique vers WAREHOUSE_LEFT sera gérée dans workflowIntegration.js
    if (punchType === 'start_site' && currentState === WORKFLOW_STATES.WAREHOUSE_ARRIVED && targetState === WORKFLOW_STATES.SITE_ARRIVED) {
        return true;
    }

    // Cas spécial : retour à l'entrepôt après avoir quitté le site
    // SITE_LEFT → WAREHOUSE_ARRIVED (via back_wh)
    if (punchType === 'back_wh' && currentState === WORKFLOW_STATES.SITE_LEFT && targetState === WORKFLOW_STATES.WAREHOUSE_ARRIVED) {
        return true;
    }

    // Cas spécial : retour à la maison depuis l'entrepôt (après retour du site)
    // WAREHOUSE_ARRIVED → BACK_HOME (via back_home après back_wh)
    if (punchType === 'back_home' && currentState === WORKFLOW_STATES.WAREHOUSE_ARRIVED && targetState === WORKFLOW_STATES.BACK_HOME) {
        return true;
    }

    // Transition normale : on ne peut avancer que d'une étape
    return targetIndex === currentIndex + 1;
}

/**
 * Obtient l'état suivant dans le workflow
 * @param {string} currentState - État actuel
 * @returns {string|null} - État suivant ou null si déjà au dernier état
 */
function getNextState(currentState) {
    const currentIndex = STATE_ORDER.indexOf(currentState);
    if (currentIndex === -1 || currentIndex >= STATE_ORDER.length - 1) {
        return null;
    }
    return STATE_ORDER[currentIndex + 1];
}

/**
 * Obtient l'état correspondant à un punch type
 * @param {string} punchType - Type de punch (leave_home, reach_wh, etc.)
 * @returns {string|null} - État correspondant ou null
 */
function getStateFromPunch(punchType) {
    return PUNCH_TO_STATE[punchType] || null;
}

/**
 * Vérifie si un punch peut être effectué selon l'état actuel du ticket
 * @param {string} currentState - État actuel du ticket
 * @param {string} punchType - Type de punch à effectuer
 * @returns {{valid: boolean, error?: string}} - Résultat de la validation
 */
function canPerformPunch(currentState, punchType) {
    const targetState = getStateFromPunch(punchType);
    
    if (!targetState) {
        return { valid: false, error: `Punch type invalide: ${punchType}` };
    }

    // Cas spécial : start_site depuis WAREHOUSE_ARRIVED est autorisé
    // La transition automatique vers WAREHOUSE_LEFT sera gérée dans workflowIntegration.js
    if (punchType === 'start_site' && currentState === WORKFLOW_STATES.WAREHOUSE_ARRIVED) {
        return { valid: true };
    }

    // Cas spécial : back_home depuis WAREHOUSE_ARRIVED (après retour à l'entrepôt)
    // Permet de retourner à la maison directement depuis l'entrepôt après le retour du site
    if (punchType === 'back_home' && currentState === WORKFLOW_STATES.WAREHOUSE_ARRIVED) {
        return { valid: true };
    }

    if (!isValidTransition(currentState, targetState, punchType)) {
        // Message d'erreur personnalisé pour back_wh
        if (punchType === 'back_wh' && currentState !== WORKFLOW_STATES.SITE_LEFT) {
            return { 
                valid: false, 
                error: `Impossible d'effectuer ce punch. Vous devez d'abord quitter le site (leave_site). État actuel: ${currentState}` 
            };
        }
        
        const nextState = getNextState(currentState);
        return { 
            valid: false, 
            error: `Impossible d'effectuer ce punch. État actuel: ${currentState}, État requis: ${nextState || 'COMPLETED'}` 
        };
    }

    return { valid: true };
}

/**
 * Vérifie si un ticket peut être complété (COMPLETED)
 * @param {string} currentState - État actuel
 * @param {object} ticketData - Données du ticket (odo_start, odo_end, description, etc.)
 * @returns {{valid: boolean, error?: string, missing?: string[]}} - Résultat de la validation
 */
function canCompleteTicket(currentState, ticketData) {
    // L'état doit être BACK_HOME
    if (currentState !== WORKFLOW_STATES.BACK_HOME) {
        return { 
            valid: false, 
            error: `Le ticket doit être à l'état BACK_HOME pour être complété. État actuel: ${currentState}` 
        };
    }

    const missing = [];

    // Vérifier l'odomètre
    if (!ticketData.odo_start || !ticketData.odo_end) {
        missing.push('odomètre (départ et arrivée)');
    }

    // Vérifier la description
    if (!ticketData.description || ticketData.description.trim() === '') {
        missing.push('description du travail');
    }

    // Vérifier les timestamps requis (ordre complet du workflow)
    const requiredPunches = ['leave_home', 'reach_wh', 'start_site', 'leave_site', 'back_wh', 'back_home'];
    if (ticketData.missingPunches && ticketData.missingPunches.length > 0) {
        missing.push(`punches manquants: ${ticketData.missingPunches.join(', ')}`);
    }

    if (missing.length > 0) {
        return { 
            valid: false, 
            error: `Impossible de compléter le ticket. Éléments manquants: ${missing.join(', ')}`,
            missing 
        };
    }

    return { valid: true };
}

/**
 * Obtient tous les états du workflow
 * @returns {string[]} - Liste des états
 */
function getAllStates() {
    return [...STATE_ORDER];
}

module.exports = {
    WORKFLOW_STATES,
    PUNCH_TO_STATE,
    STATE_ORDER,
    isValidTransition,
    getNextState,
    getStateFromPunch,
    canPerformPunch,
    canCompleteTicket,
    getAllStates
};
