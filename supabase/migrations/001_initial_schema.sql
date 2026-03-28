-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- user_settings
create table public.user_settings (
  id uuid references auth.users on delete cascade primary key,
  gemini_api_key text,
  claude_api_key text,
  preferred_ai text check (preferred_ai in ('gemini', 'claude')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.user_settings enable row level security;
create policy "Users manage own settings" on public.user_settings
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- subjects
create table public.subjects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz default now()
);
alter table public.subjects enable row level security;
create policy "Users manage own subjects" on public.subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- problem_sets
create table public.problem_sets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects on delete cascade not null,
  title text not null,
  source_file_url text,
  file_type text check (file_type in ('pdf', 'image')) not null default 'image',
  status text check (status in ('uploading', 'extracting', 'reviewing', 'ready', 'failed')) not null default 'uploading',
  created_at timestamptz default now()
);
alter table public.problem_sets enable row level security;
create policy "Users manage own problem_sets" on public.problem_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- problems
create table public.problems (
  id uuid default uuid_generate_v4() primary key,
  problem_set_id uuid references public.problem_sets on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects on delete cascade not null,
  sequence_num integer not null default 1,
  question_text text,
  image_url text,
  crop_rect jsonb,
  answer_type text check (answer_type in ('mcq', 'short', 'essay')) not null default 'mcq',
  correct_answer text,
  options jsonb,
  source_page integer,
  created_at timestamptz default now()
);
alter table public.problems enable row level security;
create policy "Users manage own problems" on public.problems
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- solve_sessions
create table public.solve_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects on delete set null,
  mode text check (mode in ('sequential', 'random')) not null default 'sequential',
  status text check (status in ('active', 'completed')) not null default 'active',
  created_at timestamptz default now(),
  completed_at timestamptz
);
alter table public.solve_sessions enable row level security;
create policy "Users manage own sessions" on public.solve_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- attempts
create table public.attempts (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.solve_sessions on delete cascade not null,
  problem_id uuid references public.problems on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  user_answer text,
  is_correct boolean,
  ai_feedback text,
  time_spent_sec integer,
  attempted_at timestamptz default now()
);
alter table public.attempts enable row level security;
create policy "Users manage own attempts" on public.attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage buckets and policies
-- NOTE: Run these in the Supabase dashboard SQL editor or via CLI

-- Uncomment and run to create buckets:
-- insert into storage.buckets (id, name, public) values ('problem-sources', 'problem-sources', false) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('page-images', 'page-images', false) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('answer-photos', 'answer-photos', false) on conflict do nothing;

-- Storage RLS policies (run after creating buckets):
-- Users can upload to their own path in page-images
create policy "Users upload own page-images"
  on storage.objects for insert
  with check (
    bucket_id = 'page-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own page-images"
  on storage.objects for select
  using (
    bucket_id = 'page-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own page-images"
  on storage.objects for delete
  using (
    bucket_id = 'page-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Repeat same policies for problem-sources and answer-photos
create policy "Users upload own problem-sources"
  on storage.objects for insert
  with check (bucket_id = 'problem-sources' AND auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users read own problem-sources"
  on storage.objects for select
  using (bucket_id = 'problem-sources' AND auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users upload own answer-photos"
  on storage.objects for insert
  with check (bucket_id = 'answer-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users read own answer-photos"
  on storage.objects for select
  using (bucket_id = 'answer-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own answer-photos"
  on storage.objects for delete
  using (bucket_id = 'answer-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Migration: add problem_set_id to solve_sessions
alter table public.solve_sessions
  add column if not exists problem_set_id uuid references public.problem_sets on delete set null;
