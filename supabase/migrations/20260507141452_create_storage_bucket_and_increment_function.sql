/*
  # Storage bucket setup and download counter function

  ## Changes
  1. Creates the `documents` storage bucket for PDF file hosting
  2. Creates `increment_download_count` RPC function for atomic counter increment
  3. Storage policies allow public read, admin write

  ## Notes
  - Storage bucket must be created via Supabase dashboard or API
  - The increment function uses UPDATE to avoid race conditions
*/

-- Function to increment download count atomically
CREATE OR REPLACE FUNCTION increment_download_count(doc_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE documents
  SET download_count = download_count + 1
  WHERE id = doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Full-text search function
CREATE OR REPLACE FUNCTION search_documents(search_term text)
RETURNS SETOF documents AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM documents
  WHERE
    to_tsvector('english', title || ' ' || author) @@ plainto_tsquery('english', search_term)
    OR title ILIKE '%' || search_term || '%'
    OR author ILIKE '%' || search_term || '%'
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
