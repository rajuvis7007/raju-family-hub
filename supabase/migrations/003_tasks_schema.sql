-- ============================================================
-- Tasks + Task Attachments schema
-- ============================================================

-- ----------------------------------------------------------
-- tasks
-- ----------------------------------------------------------
create table if not exists public.tasks (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  member_id   text        not null,
  due_date    date,
  done        boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists tasks_created_at_idx on public.tasks(created_at desc);

-- ----------------------------------------------------------
-- task_attachments
-- ----------------------------------------------------------
create table if not exists public.task_attachments (
  id                    uuid        primary key default gen_random_uuid(),
  task_id               uuid        not null references public.tasks(id) on delete cascade,
  storage_url           text        not null,
  file_name             text        not null,
  media_type            text        not null, -- 'image' | 'video' | 'audio' | 'pdf'
  uploaded_by_member_id text        not null,
  created_at            timestamptz not null default now()
);

create index if not exists task_attachments_task_id_idx on public.task_attachments(task_id);

-- ----------------------------------------------------------
-- RLS — disabled for this family app
-- ----------------------------------------------------------
alter table public.tasks            disable row level security;
alter table public.task_attachments disable row level security;

-- ----------------------------------------------------------
-- Storage bucket
-- ----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', true)
on conflict (id) do nothing;

-- Storage RLS policies (anon upload + delete) — skip if already present
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'task-attachments anon upload'
  ) then
    execute $p$
      create policy "task-attachments anon upload"
        on storage.objects for insert to anon
        with check (bucket_id = 'task-attachments')
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'task-attachments anon delete'
  ) then
    execute $p$
      create policy "task-attachments anon delete"
        on storage.objects for delete to anon
        using (bucket_id = 'task-attachments')
    $p$;
  end if;
end
$$;
