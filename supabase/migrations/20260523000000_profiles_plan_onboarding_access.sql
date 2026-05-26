-- OAuth callback ensures the signed-in user has a profile row, then plan
-- onboarding reads that row and updates the selected plan fields.
grant select on table public.profiles to authenticated;
grant insert on table public.profiles to authenticated;
grant update on table public.profiles to authenticated;

-- Keep service-role diagnostics and server-side maintenance able to read the
-- table when profiles was created with revoked default privileges.
grant select on table public.profiles to service_role;
grant insert on table public.profiles to service_role;
grant update on table public.profiles to service_role;

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own_plan'
  ) then
    create policy profiles_select_own_plan
      on public.profiles
      for select
      to authenticated
      using ((select auth.uid()) = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own_profile'
  ) then
    create policy profiles_insert_own_profile
      on public.profiles
      for insert
      to authenticated
      with check ((select auth.uid()) = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own_plan'
  ) then
    create policy profiles_update_own_plan
      on public.profiles
      for update
      to authenticated
      using ((select auth.uid()) = id)
      with check ((select auth.uid()) = id);
  end if;
end
$$;
