-- =============================================================================
-- Una tazzina di storie - diaries, members and stories (step 1)
--
-- A diary belongs to its members; each member has a role:
--   owner        full control (records and edits stories, manages the diary)
--   contributor  reads everything; will add notes and photos (step 4)
--   viewer       read only
-- Clients never write `diaries` / `diary_members` directly: the diary is created
-- through `create_diary` and members will be managed by RPCs added in step 4.
--
-- A story is the original audio (private `story-audio` bucket, original format and
-- mime type kept as recorded) plus plain metadata. Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.diary_members (
  diary_id uuid not null references public.diaries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'contributor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (diary_id, user_id)
);
create index if not exists diary_members_user_idx on public.diary_members (user_id);

create table if not exists public.stories (
  -- Client-generated, so the storage object name `<diary_id>/<id>.<ext>` is known
  -- before the row exists.
  id uuid primary key,
  diary_id uuid not null references public.diaries (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  told_on date not null default current_date,
  -- Storage path inside the `story-audio` bucket.
  audio_path text not null,
  -- Full mime type as recorded, e.g. `audio/webm;codecs=opus` (kept for exports).
  audio_mime text not null,
  audio_bytes bigint check (audio_bytes is null or audio_bytes >= 0),
  -- Null when unknown (some recorded containers carry no duration).
  duration_seconds numeric check (duration_seconds is null or duration_seconds >= 0),
  source text not null default 'recorded' check (source in ('recorded', 'uploaded')),
  -- Main language of the audio (ISO 639-3): Neapolitan, mixed with Italian.
  language text not null default 'nap',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stories_diary_date_idx on public.stories (diary_id, told_on desc, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers (security definer: they read diary_members without re-entering its RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_diary_member(p_diary uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.diary_members m
    where m.diary_id = p_diary and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_diary_owner(p_diary uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.diary_members m
    where m.diary_id = p_diary and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- First path segment of a storage object when it is a uuid (the diary id), else null.
create or replace function public.storage_diary_id(p_path text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(p_path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_path, '/', 1)::uuid
    else null
  end;
$$;

-- Creates a diary and makes the caller its owner.
create or replace function public.create_diary(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_diary uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.diaries (name, created_by) values (btrim(p_name), v_user)
    returning id into v_diary;
  insert into public.diary_members (diary_id, user_id, role) values (v_diary, v_user, 'owner');
  return v_diary;
end;
$$;

revoke all on function public.create_diary(text) from public, anon;
grant execute on function public.create_diary(text) to authenticated;
revoke all on function public.is_diary_member(uuid) from public, anon;
grant execute on function public.is_diary_member(uuid) to authenticated;
revoke all on function public.is_diary_owner(uuid) from public, anon;
grant execute on function public.is_diary_owner(uuid) to authenticated;

-- Keeps updated_at honest.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stories_touch_updated_at on public.stories;
create trigger stories_touch_updated_at
  before update on public.stories
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.diaries enable row level security;
alter table public.diary_members enable row level security;
alter table public.stories enable row level security;

-- diaries: members read; the owner renames. No client insert/delete (create_diary).
drop policy if exists diaries_select on public.diaries;
create policy diaries_select on public.diaries
  for select to authenticated
  using (public.is_diary_member(id));

drop policy if exists diaries_update on public.diaries;
create policy diaries_update on public.diaries
  for update to authenticated
  using (public.is_diary_owner(id))
  with check (public.is_diary_owner(id));

-- diary_members: each member sees the roster of their own diaries; writes come
-- later through RPCs (invitations, step 4).
drop policy if exists diary_members_select on public.diary_members;
create policy diary_members_select on public.diary_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_diary_member(diary_id));

-- stories: every member reads; only the owner records, edits and deletes.
drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select to authenticated
  using (public.is_diary_member(diary_id));

drop policy if exists stories_insert on public.stories;
create policy stories_insert on public.stories
  for insert to authenticated
  with check (public.is_diary_owner(diary_id) and created_by = auth.uid());

drop policy if exists stories_update on public.stories;
create policy stories_update on public.stories
  for update to authenticated
  using (public.is_diary_owner(diary_id))
  with check (public.is_diary_owner(diary_id));

drop policy if exists stories_delete on public.stories;
create policy stories_delete on public.stories
  for delete to authenticated
  using (public.is_diary_owner(diary_id));

-- ---------------------------------------------------------------------------
-- Storage: private `story-audio` bucket, objects under `<diary_id>/`
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('story-audio', 'story-audio', false, 52428800, array['audio/*'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists story_audio_select on storage.objects;
create policy story_audio_select on storage.objects
  for select to authenticated
  using (bucket_id = 'story-audio' and public.is_diary_member(public.storage_diary_id(name)));

drop policy if exists story_audio_insert on storage.objects;
create policy story_audio_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'story-audio' and public.is_diary_owner(public.storage_diary_id(name)));

drop policy if exists story_audio_update on storage.objects;
create policy story_audio_update on storage.objects
  for update to authenticated
  using (bucket_id = 'story-audio' and public.is_diary_owner(public.storage_diary_id(name)))
  with check (bucket_id = 'story-audio' and public.is_diary_owner(public.storage_diary_id(name)));

drop policy if exists story_audio_delete on storage.objects;
create policy story_audio_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'story-audio' and public.is_diary_owner(public.storage_diary_id(name)));
