-- Migration pour ajouter le workflow strict des tickets
-- Workflow: CREATED → LEFT_HOME → WAREHOUSE_ARRIVED → WAREHOUSE_LEFT → SITE_ARRIVED → SITE_LEFT → BACK_HOME → COMPLETED

-- ============================================
-- MISE À JOUR DES STATUTS DE TICKETS
-- ============================================

-- ÉTAPE 1: Supprimer l'ancienne contrainte si elle existe (AVANT de modifier les données)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name='tickets' 
               AND constraint_name='tickets_ticket_status_check') THEN
        ALTER TABLE tickets DROP CONSTRAINT tickets_ticket_status_check;
        RAISE NOTICE 'Ancienne contrainte supprimée';
    END IF;
END $$;

-- ÉTAPE 2: Mettre à jour les statuts existants (maintenant que la contrainte est supprimée)
UPDATE tickets 
SET ticket_status = CASE 
    WHEN ticket_status = 'draft' THEN 'CREATED'
    WHEN ticket_status = 'en_cours' THEN 'SITE_ARRIVED'  -- Approximation, à ajuster selon les timestamps
    WHEN ticket_status = 'clos' THEN 'COMPLETED'
    -- Si le statut est déjà un des nouveaux statuts, on le garde
    WHEN ticket_status IN ('CREATED', 'LEFT_HOME', 'WAREHOUSE_ARRIVED', 'WAREHOUSE_LEFT', 
                          'SITE_ARRIVED', 'SITE_LEFT', 'BACK_HOME', 'COMPLETED') THEN ticket_status
    ELSE 'CREATED'  -- Par défaut pour tout autre statut inattendu
END;

-- ÉTAPE 3: Ajouter la nouvelle contrainte avec les nouveaux statuts
DO $$ 
BEGIN
    ALTER TABLE tickets 
    ADD CONSTRAINT tickets_ticket_status_check 
    CHECK (ticket_status IN (
        'CREATED',           -- Ticket créé, pas encore commencé
        'LEFT_HOME',         -- Technicien a quitté son domicile
        'WAREHOUSE_ARRIVED', -- Arrivé à l'entrepôt
        'WAREHOUSE_LEFT',    -- Quitté l'entrepôt
        'SITE_ARRIVED',      -- Arrivé sur le site client
        'SITE_LEFT',         -- Quitté le site client
        'BACK_HOME',         -- Retourné au domicile
        'COMPLETED'          -- Ticket complété avec description
    ));
    RAISE NOTICE 'Nouvelle contrainte ajoutée';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Contrainte déjà existante';
END $$;

-- ============================================
-- AJOUT D'UNE COLONNE POUR TRACKER L'ÉTAT ACTUEL
-- ============================================

DO $$ 
BEGIN
    -- Colonne pour stocker le dernier état validé (optionnel, pour audit)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tickets' AND column_name='workflow_state') THEN
        ALTER TABLE tickets ADD COLUMN workflow_state text;
    END IF;
END $$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tickets_workflow_state 
    ON tickets(workflow_state);

-- ============================================
-- VÉRIFICATION
-- ============================================

SELECT 
    ticket_status,
    COUNT(*) as count
FROM tickets
GROUP BY ticket_status
ORDER BY ticket_status;
