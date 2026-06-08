-- Allow authenticated users to upload voice notes scoped to their own user folder
-- Path format: voice-notes/{userId}/... so we check the second segment
CREATE POLICY "authenticated users can upload voice notes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-voice-notes'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow users to read their own voice notes
-- Path format: voice-notes/{userId}/... so userId is at index [2]
CREATE POLICY "users can read own voice notes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'feedback-voice-notes' AND auth.uid()::text = (storage.foldername(name))[2]);
