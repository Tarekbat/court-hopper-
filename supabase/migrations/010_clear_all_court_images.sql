-- Clear all court images from the database
-- This sets all images to empty arrays, removing all image links and data

UPDATE public.courts
SET images = '[]'::jsonb
WHERE images IS NOT NULL;

-- Ensure all courts have empty image arrays
UPDATE public.courts
SET images = '[]'::jsonb
WHERE images IS NULL;

