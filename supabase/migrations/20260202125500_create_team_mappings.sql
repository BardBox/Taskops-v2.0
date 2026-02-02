-- Create team_mappings table if it doesn't exist
create table if not exists public.team_mappings (
    id uuid default gen_random_uuid() primary key,
    pm_id uuid references auth.users(id) on delete cascade not null,
    team_member_id uuid references auth.users(id) on delete cascade not null,
    assigned_by_id uuid references auth.users(id) on delete
    set null,
        assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
        -- Enforce that a team member can only be assigned to one PM at a time
        constraint team_member_unique unique (team_member_id),
        -- Prevent assigning a PM to themselves
        constraint no_self_assignment check (pm_id != team_member_id)
);
-- Enable RLS
alter table public.team_mappings enable row level security;
-- Policies
create policy "Enable read access for all authenticated users" on public.team_mappings for
select using (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on public.team_mappings for
insert with check (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on public.team_mappings for delete using (auth.role() = 'authenticated');
-- Create index for performance
create index if not exists team_mappings_pm_id_idx on public.team_mappings(pm_id);
create index if not exists team_mappings_team_member_id_idx on public.team_mappings(team_member_id);