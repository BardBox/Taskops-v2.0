-- Force drop the strict constraint if it still exists
alter table public.team_mappings drop constraint if exists team_member_unique;
-- Safely add the pair unique constraint if it doesn't exist
do $$ begin if not exists (
    select 1
    from pg_constraint
    where conname = 'team_mapping_pair_unique'
) then
alter table public.team_mappings
add constraint team_mapping_pair_unique unique (pm_id, team_member_id);
end if;
end $$;