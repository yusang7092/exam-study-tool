-- feedback table: users submit issues/requests, admin views in Supabase dashboard
create table public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  user_email text not null,
  message text not null,
  created_at timestamptz default now()
);

alter table public.feedback enable row level security;

-- Users can only insert their own feedback (cannot read others')
create policy "Users insert own feedback" on public.feedback
  for insert with check (auth.uid() = user_id);
