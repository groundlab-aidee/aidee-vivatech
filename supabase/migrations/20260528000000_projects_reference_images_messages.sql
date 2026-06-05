create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  requirements jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.project_reference_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_name text,
  image_url text not null,
  analysis_status text not null default 'pending',
  analysis_text text,
  analysis_json jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  seq_order integer not null default 0,
  created_at timestamp with time zone not null default now()
);

insert into storage.buckets (id, name, public)
values ('project-reference-images', 'project-reference-images', true)
on conflict (id) do update set public = excluded.public;

alter table public.projects enable row level security;
alter table public.project_reference_images enable row level security;
alter table public.messages enable row level security;

grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.project_reference_images to authenticated;
grant select, insert, update, delete on table public.messages to authenticated;

grant select, insert, update, delete on table public.projects to service_role;
grant select, insert, update, delete on table public.project_reference_images to service_role;
grant select, insert, update, delete on table public.messages to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects'
      and policyname = 'projects_select_own'
  ) then
    create policy projects_select_own
      on public.projects for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects'
      and policyname = 'projects_insert_own'
  ) then
    create policy projects_insert_own
      on public.projects for insert to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects'
      and policyname = 'projects_update_own'
  ) then
    create policy projects_update_own
      on public.projects for update to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_reference_images'
      and policyname = 'project_reference_images_select_own'
  ) then
    create policy project_reference_images_select_own
      on public.project_reference_images for select to authenticated
      using (
        exists (
          select 1 from public.projects
          where projects.id = project_reference_images.project_id
            and projects.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_reference_images'
      and policyname = 'project_reference_images_insert_own'
  ) then
    create policy project_reference_images_insert_own
      on public.project_reference_images for insert to authenticated
      with check (
        exists (
          select 1 from public.projects
          where projects.id = project_reference_images.project_id
            and projects.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_reference_images'
      and policyname = 'project_reference_images_update_own'
  ) then
    create policy project_reference_images_update_own
      on public.project_reference_images for update to authenticated
      using (
        exists (
          select 1 from public.projects
          where projects.id = project_reference_images.project_id
            and projects.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.projects
          where projects.id = project_reference_images.project_id
            and projects.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages'
      and policyname = 'messages_select_own'
  ) then
    create policy messages_select_own
      on public.messages for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages'
      and policyname = 'messages_insert_own'
  ) then
    create policy messages_insert_own
      on public.messages for insert to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'project_reference_images_upload_own'
  ) then
    create policy project_reference_images_upload_own
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'project-reference-images'
        and (storage.foldername(name))[1] = 'projects'
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'project_reference_images_select_public'
  ) then
    create policy project_reference_images_select_public
      on storage.objects for select to public
      using (bucket_id = 'project-reference-images');
  end if;
end
$$;
