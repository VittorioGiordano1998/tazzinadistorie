-- =============================================================================
-- Una tazzina di storie - story segments (step 3)
--
-- A story is told sentence by sentence. `story_segments` holds, per sentence:
--   start_seconds / end_seconds  where it sits in the audio (the end is derived:
--                                the start of the next sentence, or the story length)
--   text_dialect / text_italian  the two optional texts
--   source                       'manual' (written or corrected by a person) or
--                                'draft' (automatic transcription, not corrected yet)
-- Segments are the source of truth. `stories.text_dialect` / `text_italian` are kept
-- as the joined text of the segments by `replace_story_segments`, so lists, search and
-- exports can keep reading them. Idempotent.
-- =============================================================================

create table if not exists public.story_segments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  start_seconds numeric not null check (start_seconds >= 0),
  end_seconds numeric,
  text_dialect text check (text_dialect is null or text_dialect <> ''),
  text_italian text check (text_italian is null or text_italian <> ''),
  source text not null default 'manual' check (source in ('manual', 'draft')),
  created_at timestamptz not null default now(),
  check (end_seconds is null or end_seconds >= start_seconds)
);
create index if not exists story_segments_story_idx on public.story_segments (story_id, start_seconds);

-- Diary a story belongs to (security definer: readable without re-entering stories' RLS).
create or replace function public.story_diary_id(p_story uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.diary_id from public.stories s where s.id = p_story;
$$;

revoke all on function public.story_diary_id(uuid) from public, anon;
grant execute on function public.story_diary_id(uuid) to authenticated;

alter table public.story_segments enable row level security;

drop policy if exists story_segments_select on public.story_segments;
create policy story_segments_select on public.story_segments
  for select to authenticated
  using (public.is_diary_member(public.story_diary_id(story_id)));

drop policy if exists story_segments_insert on public.story_segments;
create policy story_segments_insert on public.story_segments
  for insert to authenticated
  with check (public.is_diary_owner(public.story_diary_id(story_id)));

drop policy if exists story_segments_update on public.story_segments;
create policy story_segments_update on public.story_segments
  for update to authenticated
  using (public.is_diary_owner(public.story_diary_id(story_id)))
  with check (public.is_diary_owner(public.story_diary_id(story_id)));

drop policy if exists story_segments_delete on public.story_segments;
create policy story_segments_delete on public.story_segments
  for delete to authenticated
  using (public.is_diary_owner(public.story_diary_id(story_id)));

-- ---------------------------------------------------------------------------
-- replace_story_segments: saves all the sentences of a story in one transaction.
--
-- p_expected  the story's updated_at as the client loaded it. If the story changed
--             since, nothing is written and 'story_changed' is raised, so a change
--             made on another device is never overwritten.
-- p_segments  [{ "start_seconds": 12.4, "text_dialect": "...", "text_italian": "...",
--                "source": "manual" | "draft" }, ...] in any order.
-- Returns the story's new updated_at. Runs with the caller's rights (RLS applies).
-- ---------------------------------------------------------------------------
create or replace function public.replace_story_segments(
  p_story uuid,
  p_expected timestamptz,
  p_segments jsonb
)
returns timestamptz
language plpgsql
as $$
declare
  v_diary uuid;
  v_duration numeric;
  v_updated timestamptz;
begin
  v_diary := public.story_diary_id(p_story);
  if v_diary is null or not public.is_diary_owner(v_diary) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_segments is null or jsonb_typeof(p_segments) <> 'array' then
    raise exception 'segments must be a json array' using errcode = '22023';
  end if;

  select duration_seconds into v_duration
  from public.stories
  where id = p_story and updated_at = p_expected
  for update;
  if not found then
    raise exception 'story_changed' using errcode = 'P0001';
  end if;

  delete from public.story_segments where story_id = p_story;

  insert into public.story_segments
    (story_id, start_seconds, end_seconds, text_dialect, text_italian, source)
  select
    p_story,
    o.start_seconds,
    case
      when o.next_start is not null then greatest(o.next_start, o.start_seconds)
      when v_duration is not null then greatest(v_duration, o.start_seconds)
      else null
    end,
    o.text_dialect,
    o.text_italian,
    o.source
  from (
    select
      i.start_seconds,
      lead(i.start_seconds) over (order by i.start_seconds, i.ord) as next_start,
      i.text_dialect,
      i.text_italian,
      i.source
    from (
      select
        t.ord,
        greatest((t.value ->> 'start_seconds')::numeric, 0) as start_seconds,
        nullif(t.value ->> 'text_dialect', '') as text_dialect,
        nullif(t.value ->> 'text_italian', '') as text_italian,
        case when t.value ->> 'source' = 'draft' then 'draft' else 'manual' end as source
      from jsonb_array_elements(p_segments) with ordinality as t(value, ord)
    ) i
  ) o;

  update public.stories
  set
    text_dialect = (
      select nullif(string_agg(g.text_dialect, E'\n' order by g.start_seconds, g.id), '')
      from public.story_segments g
      where g.story_id = p_story and g.text_dialect is not null
    ),
    text_italian = (
      select nullif(string_agg(g.text_italian, E'\n' order by g.start_seconds, g.id), '')
      from public.story_segments g
      where g.story_id = p_story and g.text_italian is not null
    )
  where id = p_story
  returning updated_at into v_updated;

  return v_updated;
end;
$$;

revoke all on function public.replace_story_segments(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.replace_story_segments(uuid, timestamptz, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Stories that already have text (step 2) and no sentences get one sentence from 0:00.
-- ---------------------------------------------------------------------------
insert into public.story_segments
  (story_id, start_seconds, end_seconds, text_dialect, text_italian, source)
select s.id, 0, s.duration_seconds, s.text_dialect, s.text_italian, 'manual'
from public.stories s
where (s.text_dialect is not null or s.text_italian is not null)
  and not exists (select 1 from public.story_segments g where g.story_id = s.id);
