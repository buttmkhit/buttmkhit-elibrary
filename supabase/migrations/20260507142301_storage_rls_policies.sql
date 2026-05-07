/*
  # Storage RLS Policies for documents bucket

  ## Changes
  - Allow public read access to documents bucket (for PDF downloads)
  - Allow authenticated admin users to upload files to documents bucket
  - Allow authenticated admin users to delete files from documents bucket

  ## Notes
  - The 'documents' bucket was created with public=true
  - Admin check is done via the profiles table role column
*/

-- Public read policy for storage objects
CREATE POLICY "Public can read documents bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

-- Admin insert policy
CREATE POLICY "Admins can upload to documents bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin delete policy
CREATE POLICY "Admins can delete from documents bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
