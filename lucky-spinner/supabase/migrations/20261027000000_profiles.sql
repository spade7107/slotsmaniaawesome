create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 20),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]+$')
);

create unique index profiles_username_lower_unique on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "Usernames are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

grant select on public.profiles to anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := btrim(new.raw_user_meta_data ->> 'username');
  if requested_username is null
    or char_length(requested_username) not between 3 and 20
    or requested_username !~ '^[A-Za-z0-9_]+$'
  then
    raise exception 'A valid username is required';
  end if;

  insert into public.profiles (id, username)
  values (new.id, requested_username);
  return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();
