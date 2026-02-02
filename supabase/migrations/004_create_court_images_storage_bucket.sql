-- Create storage bucket for court images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'court-images',
  'court-images',
  true,
  10485760, -- 10MB limit (larger than avatars since court images may be higher quality)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload court images
-- Note: In production, you may want to restrict this to admins only
CREATE POLICY "Authenticated users can upload court images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'court-images');

-- Create policy to allow users to update court images
CREATE POLICY "Authenticated users can update court images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'court-images')
WITH CHECK (bucket_id = 'court-images');

-- Create policy to allow users to delete court images
CREATE POLICY "Authenticated users can delete court images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'court-images');

-- Create policy to allow public read access to court images
CREATE POLICY "Court images are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'court-images');

