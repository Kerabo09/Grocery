alter table public.expenses replica identity full;
alter table public.categories replica identity full;
alter table public.profiles replica identity full;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.profiles;