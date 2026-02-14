-- Migration pour ajouter les colonnes d'images d'odomètre
-- odo_start_image : image de l'odomètre de départ (quand le tech quitte la maison)
-- odo_end_image : image de l'odomètre d'arrivée (quand le tech retourne à la maison)

DO $$ 
BEGIN
    -- Image de l'odomètre de départ
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tickets' AND column_name='odo_start_image') THEN
        ALTER TABLE tickets ADD COLUMN odo_start_image text;
    END IF;

    -- Image de l'odomètre d'arrivée
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tickets' AND column_name='odo_end_image') THEN
        ALTER TABLE tickets ADD COLUMN odo_end_image text;
    END IF;
END $$;
