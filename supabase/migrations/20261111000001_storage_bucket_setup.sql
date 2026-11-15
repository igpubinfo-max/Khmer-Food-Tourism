-- Storage bucket for photos (public read, image-only upload, service_role/admin-only update & delete).
-- Safe to re-run. Does not touch any table data.
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-media', 'food-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public read and upload on food-media" ON storage.objects;
DROP POLICY IF EXISTS "food_media_public_select" ON storage.objects;
DROP POLICY IF EXISTS "food_media_safe_image_insert" ON storage.objects;
DROP POLICY IF EXISTS "food_media_service_update" ON storage.objects;
DROP POLICY IF EXISTS "food_media_service_delete" ON storage.objects;

CREATE POLICY "food_media_public_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'food-media');

CREATE POLICY "food_media_safe_image_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'food-media'
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'avif')
    AND position('..' in name) = 0
  );

CREATE POLICY "food_media_service_update"
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'food-media')
  WITH CHECK (bucket_id = 'food-media');

CREATE POLICY "food_media_service_delete"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'food-media');

SELECT id, name, public FROM storage.buckets WHERE id = 'food-media';
