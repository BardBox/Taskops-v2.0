-- Drop the strict 'one user per team' constraint
alter table public.team_mappings drop constraint if exists team_member_unique;
-- Add a new constraint ensuring a user is only assigned ONCE to a SPECIFIC PM
-- This allows the same user to be assigned to PM 'A' and PM 'B' (Many-to-Many), 
-- but prevents double-assignment to PM 'A'.
alter table public.team_mappings
add constraint team_mapping_pair_unique unique (pm_id, team_member_id);