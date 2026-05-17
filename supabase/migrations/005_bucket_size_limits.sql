-- ============================================================
-- Set file size limits on storage buckets
-- photos:           200 MB (accommodate large videos)
-- task-attachments:  50 MB
-- ============================================================

update storage.buckets
set file_size_limit = 209715200   -- 200 MB in bytes
where id = 'photos';

update storage.buckets
set file_size_limit = 52428800    -- 50 MB in bytes
where id = 'task-attachments';
