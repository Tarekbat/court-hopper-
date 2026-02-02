-- Fix any photo IDs that are stored without full URLs
-- This will remove any image entries that are just photo IDs

-- Fix any photo IDs that are stored without full URLs
-- This will remove any image entries that are just photo IDs
UPDATE public.courts
SET images = (
  SELECT COALESCE(
    jsonb_agg(
      CASE 
        -- Remove photo IDs that don't have full URLs (pattern: "photo-123456-abc123")
        WHEN img::text ~ '^"photo-\d+-[^"]*"$' AND img::text !~ 'http' THEN NULL
        -- Remove strings that don't start with http or /
        WHEN img::text !~ '^"(https?://|/)' THEN NULL
        ELSE img
      END
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(images) AS img
)
WHERE images IS NOT NULL AND jsonb_array_length(images) > 0;

-- Ensure all courts have at least valid image arrays (empty if no valid images)
UPDATE public.courts
SET images = COALESCE(
  (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(images) AS elem
    WHERE elem IS NOT NULL AND elem::text != 'null' AND elem::text != '""'
  ),
  '[]'::jsonb
)
WHERE images IS NOT NULL;

