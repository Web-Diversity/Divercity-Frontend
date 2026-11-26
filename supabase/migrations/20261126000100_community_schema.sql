-- Divercity community schema for the shared Supabase project.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 20),
  university text not null default '숭실대학교' check (char_length(university) <= 100),
  department text not null default '컴퓨터학부' check (char_length(department) <= 100),
  bio text not null default '' check (char_length(bio) <= 300),
  languages text not null default '한국어, English' check (char_length(languages) <= 150),
  interests text not null default '스터디, 언어교환, 취미' check (char_length(interests) <= 150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  author_name text not null,
  type text not null check (type in ('free', 'course', 'review', 'meetup')),
  category text not null check (char_length(btrim(category)) between 1 and 30),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 1 and 3000),
  subject text,
  professor text,
  place text,
  rating smallint,
  meetup_date date,
  meetup_time time,
  capacity smallint,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_type_fields_check check (
    (type = 'course'
      and nullif(btrim(subject), '') is not null and char_length(subject) <= 50
      and nullif(btrim(professor), '') is not null and char_length(professor) <= 30
      and rating is not null and rating between 1 and 5
      and place is null and meetup_date is null and meetup_time is null and capacity is null
      and latitude is null and longitude is null)
    or (type = 'review'
      and nullif(btrim(place), '') is not null and char_length(place) <= 60
      and rating is not null and rating between 1 and 5
      and subject is null and professor is null and meetup_date is null and meetup_time is null and capacity is null
      and latitude is null and longitude is null)
    or (type = 'free'
      and subject is null and professor is null and place is null and rating is null
      and meetup_date is null and meetup_time is null and capacity is null
      and latitude is null and longitude is null)
    or (type = 'meetup'
      and nullif(btrim(place), '') is not null and char_length(place) <= 60
      and subject is null and professor is null and rating is null
      and meetup_date is not null and meetup_time is not null and capacity is not null and capacity between 2 and 30
      and ((latitude is null and longitude is null)
        or (latitude between -90 and 90 and longitude between -180 and 180)))
  )
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.saved_posts (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.meetup_participants (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index posts_type_created_at_idx on public.posts (type, created_at desc);
create index posts_category_created_at_idx on public.posts (category, created_at desc);
create index comments_post_created_at_idx on public.comments (post_id, created_at);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.saved_posts enable row level security;
alter table public.meetup_participants enable row level security;

create policy "Profiles are public; users manage their own profile"
  on public.profiles for select to anon, authenticated using (true);
create policy "Users create their own profile"
  on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users update their own profile"
  on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Posts are public"
  on public.posts for select to anon, authenticated using (true);
create policy "Users create their own posts"
  on public.posts for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Users update their own posts"
  on public.posts for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy "Users delete their own posts"
  on public.posts for delete to authenticated using ((select auth.uid()) = author_id);

create policy "Comments are public"
  on public.comments for select to anon, authenticated using (true);
create policy "Users create their own comments"
  on public.comments for insert to authenticated with check ((select auth.uid()) = author_id);

create policy "Users read their own likes"
  on public.post_likes for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users like posts as themselves"
  on public.post_likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove their own likes"
  on public.post_likes for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own saved posts"
  on public.saved_posts for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users save posts for themselves"
  on public.saved_posts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove their own saved posts"
  on public.saved_posts for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own meetup participation"
  on public.meetup_participants for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.profiles, public.posts, public.comments to anon, authenticated;
grant insert (id, nickname, university, department, bio, languages, interests),
  update (nickname, university, department, bio, languages, interests) on public.profiles to authenticated;
grant insert (type, category, title, body, subject, professor, place, rating, meetup_date, meetup_time, capacity, latitude, longitude),
  update (type, category, title, body, subject, professor, place, rating, meetup_date, meetup_time, capacity, latitude, longitude) on public.posts to authenticated;
grant delete on public.posts to authenticated;
grant insert (post_id, body) on public.comments to authenticated;
grant select, insert (post_id), delete on public.post_likes, public.saved_posts to authenticated;
grant select on public.meetup_participants to authenticated;

create function public.sync_profile_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.nickname is distinct from old.nickname then
    update public.posts set author_name = new.nickname where author_id = new.id;
    update public.comments set author_name = new.nickname where author_id = new.id;
  end if;
  return new;
end;
$$;

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

create trigger profiles_sync_name
  after insert or update on public.profiles
  for each row execute function public.sync_profile_name();

create function public.set_post_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  profile_nickname text;
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  if new.type = 'meetup' and new.meetup_date + new.meetup_time <= now() then
    raise exception '모임은 미래 날짜로 정해야 합니다.';
  end if;
  select nickname into profile_nickname from public.profiles where id = new.author_id;
  if profile_nickname is null then
    raise exception '작성자 프로필을 찾을 수 없습니다.';
  end if;
  new.author_name := profile_nickname;
  return new;
end;
$$;

create trigger posts_set_metadata
  before insert or update on public.posts
  for each row execute function public.set_post_metadata();

create function public.set_comment_author_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select nickname into new.author_name from public.profiles where id = new.author_id;
  if new.author_name is null then
    raise exception '작성자 프로필을 찾을 수 없습니다.';
  end if;
  return new;
end;
$$;

create trigger comments_set_author_name
  before insert on public.comments
  for each row execute function public.set_comment_author_name();

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  initial_nickname text;
begin
  initial_nickname := coalesce(
    nullif(left(btrim(new.raw_user_meta_data ->> 'nickname'), 20), ''),
    nullif(left(split_part(coalesce(new.email, ''), '@', 1), 20), ''),
    '새내기'
  );
  insert into public.profiles (id, nickname)
  values (new.id, initial_nickname);
  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create function public.add_meetup_owner_as_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type = 'meetup' then
    insert into public.meetup_participants (post_id, user_id)
    values (new.id, new.author_id);
  end if;
  return new;
end;
$$;

create trigger posts_add_meetup_owner
  after insert on public.posts
  for each row execute function public.add_meetup_owner_as_participant();

create function public.get_post_engagement(p_post_ids uuid[])
returns table (post_id uuid, like_count bigint, participant_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
    (select count(*) from public.post_likes as l where l.post_id = p.id),
    (select count(*) from public.meetup_participants as m where m.post_id = p.id)
  from public.posts as p
  where p.id = any (coalesce(p_post_ids, array[]::uuid[]));
$$;

create function public.join_meetup(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_post record;
  affected_rows integer;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select type, author_id, meetup_date, meetup_time, capacity
  into selected_post
  from public.posts
  where id = p_post_id
  for update;

  if not found then
    raise exception '모임을 찾을 수 없습니다.';
  end if;
  if selected_post.type <> 'meetup' then
    raise exception '모임을 찾을 수 없습니다.';
  end if;
  if selected_post.author_id = current_user_id then
    raise exception '모임 작성자는 이미 참여자로 등록되어 있습니다.';
  end if;
  if selected_post.meetup_date + selected_post.meetup_time <= now() then
    raise exception '종료된 모임입니다.';
  end if;
  if exists (
    select 1 from public.meetup_participants
    where post_id = p_post_id and user_id = current_user_id
  ) then
    return false;
  end if;
  if (select count(*) from public.meetup_participants where post_id = p_post_id) >= selected_post.capacity then
    raise exception '모임 정원이 찼습니다.';
  end if;

  insert into public.meetup_participants (post_id, user_id)
  values (p_post_id, current_user_id);
  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

create function public.leave_meetup(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  meetup_owner_id uuid;
  affected_rows integer;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select author_id into meetup_owner_id
  from public.posts
  where id = p_post_id and type = 'meetup'
  for update;

  if not found then
    raise exception '모임을 찾을 수 없습니다.';
  end if;
  if meetup_owner_id = current_user_id then
    raise exception '모임 작성자는 참여를 취소할 수 없습니다.';
  end if;

  delete from public.meetup_participants
  where post_id = p_post_id and user_id = current_user_id;
  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

revoke all on function public.get_post_engagement(uuid[]) from public, anon, authenticated;
revoke all on function public.join_meetup(uuid) from public, anon, authenticated;
revoke all on function public.leave_meetup(uuid) from public, anon, authenticated;
grant execute on function public.get_post_engagement(uuid[]) to anon, authenticated;
grant execute on function public.join_meetup(uuid) to authenticated;
grant execute on function public.leave_meetup(uuid) to authenticated;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function public.sync_profile_name() from public, anon, authenticated;
revoke all on function public.set_profile_updated_at() from public, anon, authenticated;
revoke all on function public.set_post_metadata() from public, anon, authenticated;
revoke all on function public.set_comment_author_name() from public, anon, authenticated;
revoke all on function public.add_meetup_owner_as_participant() from public, anon, authenticated;
