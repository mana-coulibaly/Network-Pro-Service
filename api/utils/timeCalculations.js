/**
 * Utilitaires pour calculer les temps de trajet et de travail
 * basés sur les timestamps des punches
 */

/**
 * Calcule les durées entre les différents segments du workflow
 * @param {Array} timestamps - Array de {punch_type, ts}
 * @returns {Object} - Objet avec les durées calculées en millisecondes et formatées
 */
function calculateTimeSegments(timestamps) {
    const tsMap = {};
    timestamps.forEach(t => {
        tsMap[t.punch_type] = new Date(t.ts);
    });

    const segments = {
        travel_home_to_warehouse: null,    // leave_home → reach_wh
        travel_warehouse_to_site: null,    // reach_wh → start_site (ou leave_wh si existe)
        work_time_on_site: null,           // start_site → leave_site
        travel_site_to_warehouse: null,    // leave_site → back_wh
        travel_warehouse_to_home: null,    // back_wh → back_home
        total_travel_time: null,            // Pour paye: tous les trajets (maison→entrepôt→site→entrepôt→maison)
        total_work_time: null,              // Pour paye: temps sur le site uniquement
        total_time: null                    // Temps total du départ au retour
    };

    // 1. Temps de trajet : Maison → Entrepôt
    if (tsMap.leave_home && tsMap.reach_wh) {
        segments.travel_home_to_warehouse = tsMap.reach_wh - tsMap.leave_home;
    }

    // 2. Temps de trajet : Entrepôt → Site
    // Note: Si leave_wh existe, on l'utilise, sinon on utilise reach_wh comme point de départ
    const warehouseDeparture = tsMap.leave_wh || tsMap.reach_wh;
    if (warehouseDeparture && tsMap.start_site) {
        segments.travel_warehouse_to_site = tsMap.start_site - warehouseDeparture;
    }

    // 3. Temps de travail sur le site
    if (tsMap.start_site && tsMap.leave_site) {
        segments.work_time_on_site = tsMap.leave_site - tsMap.start_site;
    }

    // 4. Temps de trajet : Site → Entrepôt
    if (tsMap.leave_site && tsMap.back_wh) {
        segments.travel_site_to_warehouse = tsMap.back_wh - tsMap.leave_site;
    }

    // 5. Temps de trajet : Entrepôt → Maison
    if (tsMap.back_wh && tsMap.back_home) {
        segments.travel_warehouse_to_home = tsMap.back_home - tsMap.back_wh;
    }

    // Calculs pour la paye selon les spécifications :
    // Temps de trajet = (quitter maison → arriver entrepôt) + (arriver entrepôt → arriver site) + 
    //                   (quitter site → retour entrepôt) + (retour entrepôt → retour maison)
    // Temps de travail = (arriver site → quitter site)
    const payTravelTimes = [
        segments.travel_home_to_warehouse,  // quitter maison → arriver entrepôt
        segments.travel_warehouse_to_site,  // arriver entrepôt → arriver site
        segments.travel_site_to_warehouse,  // quitter site → retour entrepôt
        segments.travel_warehouse_to_home   // retour entrepôt → retour maison
    ].filter(t => t !== null);

    if (payTravelTimes.length > 0) {
        segments.total_travel_time = payTravelTimes.reduce((sum, t) => sum + t, 0);
    }

    // Temps de travail = temps sur le site uniquement
    segments.total_work_time = segments.work_time_on_site;

    // Temps total : du départ de la maison au retour à la maison
    if (tsMap.leave_home && tsMap.back_home) {
        segments.total_time = tsMap.back_home - tsMap.leave_home;
    }

    return segments;
}

/**
 * Formate une durée en millisecondes en format lisible
 * @param {number} ms - Durée en millisecondes
 * @returns {string} - Format: "Xh Ym" ou "Ym" ou "Xs"
 */
function formatDuration(ms) {
    if (ms === null || ms === undefined || isNaN(ms)) {
        return '-';
    }

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return remainingMinutes > 0 
            ? `${hours}h ${remainingMinutes}m`
            : `${hours}h`;
    } else if (minutes > 0) {
        return remainingSeconds > 0
            ? `${minutes}m ${remainingSeconds}s`
            : `${minutes}m`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Formate une durée en format détaillé (heures, minutes, secondes)
 * @param {number} ms - Durée en millisecondes
 * @returns {string} - Format: "Xh Ym Zs"
 */
function formatDurationDetailed(ms) {
    if (ms === null || ms === undefined || isNaN(ms)) {
        return '-';
    }

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

/**
 * Obtient les segments de temps formatés pour l'affichage
 * @param {Array} timestamps - Array de {punch_type, ts}
 * @returns {Object} - Objet avec les durées formatées
 */
function getFormattedTimeSegments(timestamps) {
    const segments = calculateTimeSegments(timestamps);
    
    return {
        travel_home_to_warehouse: formatDuration(segments.travel_home_to_warehouse),
        travel_warehouse_to_site: formatDuration(segments.travel_warehouse_to_site),
        work_time_on_site: formatDuration(segments.work_time_on_site),
        travel_site_to_warehouse: formatDuration(segments.travel_site_to_warehouse),
        travel_warehouse_to_home: formatDuration(segments.travel_warehouse_to_home),
        total_travel_time: formatDuration(segments.total_travel_time),
        total_work_time: formatDuration(segments.total_work_time),
        total_time: formatDuration(segments.total_time),
        // Versions détaillées
        travel_home_to_warehouse_detailed: formatDurationDetailed(segments.travel_home_to_warehouse),
        travel_warehouse_to_site_detailed: formatDurationDetailed(segments.travel_warehouse_to_site),
        work_time_on_site_detailed: formatDurationDetailed(segments.work_time_on_site),
        travel_site_to_warehouse_detailed: formatDurationDetailed(segments.travel_site_to_warehouse),
        travel_warehouse_to_home_detailed: formatDurationDetailed(segments.travel_warehouse_to_home),
        total_travel_time_detailed: formatDurationDetailed(segments.total_travel_time),
        total_work_time_detailed: formatDurationDetailed(segments.total_work_time),
        total_time_detailed: formatDurationDetailed(segments.total_time),
        // Versions brutes (en ms) pour calculs
        raw: segments
    };
}

module.exports = {
    calculateTimeSegments,
    formatDuration,
    formatDurationDetailed,
    getFormattedTimeSegments
};
