-- =============================================================================
-- Una tazzina di storie - story texts (step 2)
--
-- Two optional text fields per story, both plain text:
--   text_dialect  the story written as it sounds (Neapolitan)
--   text_italian  the translation into Italian
-- Null means "not written yet"; an empty string is never stored. Existing RLS on
-- `stories` already covers them (members read, the owner writes). Idempotent.
-- =============================================================================

alter table public.stories
  add column if not exists text_dialect text,
  add column if not exists text_italian text;

alter table public.stories drop constraint if exists stories_text_dialect_len;
alter table public.stories
  add constraint stories_text_dialect_len
  check (text_dialect is null or (text_dialect <> '' and char_length(text_dialect) <= 100000));

alter table public.stories drop constraint if exists stories_text_italian_len;
alter table public.stories
  add constraint stories_text_italian_len
  check (text_italian is null or (text_italian <> '' and char_length(text_italian) <= 100000));
