-- Storage bucket for photos (the app expects a PUBLIC bucket named "food-media"; it was never created in this project,
-- which is why every Admin photo fell back to base64 INSIDE the database and was re-downloaded by every device).
-- Safe to re-run. Does not touch any table data.
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-media', 'food-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public read and upload on food-media" ON storage.objects;
CREATE POLICY "Allow public read and upload on food-media"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'food-media')
  WITH CHECK (bucket_id = 'food-media');

SELECT id, name, public FROM storage.buckets WHERE id = 'food-media';