-- Keep both booking and enquiry task chains truthful when an upstream task is
-- completed, reopened or cancelled. This complements the existing booking-wide
-- refresh without relying on a page refresh or client-side state.

create or replace function public.refresh_dependent_task_conditions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare dependent record;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  for dependent in
    select dependency.task_id
    from public.task_dependencies dependency
    join public.tasks task on task.id = dependency.task_id
    where dependency.depends_on_task_id = new.id
      and task.status in ('blocked', 'ready')
  loop
    perform public.refresh_task_readiness(dependent.task_id);
  end loop;

  return new;
end;
$$;

drop trigger if exists refresh_dependent_task_conditions on public.tasks;
create trigger refresh_dependent_task_conditions
  after update of status on public.tasks
  for each row execute function public.refresh_dependent_task_conditions();

revoke all on function public.refresh_dependent_task_conditions() from public, anon, authenticated;
