-- Create storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('page-images', 'page-images', false, 52428800, array['image/jpeg','image/png','image/webp']),
  ('problem-sources', 'problem-sources', false, 52428800, array['application/pdf','image/jpeg','image/png','image/webp']),
  ('answer-photos', 'answer-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
