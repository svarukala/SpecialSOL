-- Allow authenticated users to upload voice notes
CREATE POLICY "authenticated users can upload voice notes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'feedback-voice-notes');

-- Allow users to read their own voice notes
-- (parents reading children's notes is handled server-side with service role)
CREATE POLICY "users can read own voice notes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'feedback-voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
