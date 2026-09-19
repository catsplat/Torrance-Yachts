-- Preserve every task and history row. Distinguish automatic schedule omission
-- from a human cancellation so a later approved schedule can restore the task.
alter table public.tasks add column schedule_inapplicable boolean not null default false;
alter table public.tasks drop constraint task_cancellation_fields;
alter table public.tasks add constraint task_cancellation_fields check (
  (status='cancelled' and cancelled_at is not null and (cancelled_by is not null or schedule_inapplicable))
  or (status<>'cancelled' and cancelled_by is null and cancelled_at is null)
);

create or replace function public.refresh_task_readiness(p_task_id uuid)
returns public.tasks language plpgsql security definer set search_path='' as $$
declare target public.tasks; readiness record; payment_date date; prior_status public.task_status; manual_date boolean;
begin
  select * into target from public.tasks where id=p_task_id for update;
  if not found then raise exception 'Task not found' using errcode='P0002'; end if;
  if target.status='completed' or (target.status='cancelled' and not target.schedule_inapplicable) then return target; end if;
  if exists(select 1 from public.bookings where id=target.booking_id and status='cancelled') then return target; end if;
  if target.due_anchor in ('contract_payment_1','contract_payment_2','contract_payment_3') then
    select due_date into payment_date from public.payment_schedules
    where booking_id=target.booking_id and instalment_number=right(target.due_anchor::text,1)::integer and status<>'cancelled';
    if payment_date is null and exists(select 1 from public.contract_reviews where booking_id=target.booking_id and status='approved') then
      if not target.schedule_inapplicable then
        prior_status := target.status;
        perform set_config('app.task_update_authorised','yes',true);
        update public.tasks set status='cancelled',schedule_inapplicable=true,due_date=null,
          cancelled_at=now(),cancelled_by=null,blocked_reason='Not applicable to the approved payment schedule.'
        where id=target.id returning * into target;
        perform set_config('app.task_update_authorised','',true);
        insert into public.task_history(task_id,action,from_status,to_status,reason,changed_by,metadata)
        values(target.id,'cancelled',prior_status,'cancelled','Instalment is absent from the approved payment schedule.',auth.uid(),'{"schedule_inapplicable":true}');
      end if;
      return target;
    end if;
    select exists(select 1 from public.task_history where task_id=target.id and action='rescheduled'
      and metadata->>'new_due_date'=target.due_date::text
      and metadata->>'old_due_date' is distinct from metadata->>'new_due_date') into manual_date;
    if manual_date then payment_date:=target.due_date-target.due_offset_days; end if;
    perform set_config('app.task_update_authorised','yes',true);
    update public.tasks set due_date=payment_date+due_offset_days,
      status=case when schedule_inapplicable then 'blocked'::public.task_status else status end,
      cancelled_at=case when schedule_inapplicable then null else cancelled_at end,
      cancelled_by=case when schedule_inapplicable then null else cancelled_by end,
      schedule_inapplicable=false where id=target.id;
    perform set_config('app.task_update_authorised','',true);
    if target.schedule_inapplicable then
      insert into public.task_history(task_id,action,from_status,to_status,reason,changed_by)
      values(target.id,'reopened','cancelled','blocked','Instalment restored in the approved payment schedule.',auth.uid());
    end if;
    if payment_date is null then
      perform set_config('app.task_update_authorised','yes',true);
      update public.tasks set status='blocked',blocked_reason='Waiting for reviewed contract schedule data' where id=target.id returning * into target;
      perform set_config('app.task_update_authorised','',true);
      return target;
    end if;
  end if;
  select * into readiness from public.task_readiness(target.id);
  perform set_config('app.task_update_authorised','yes',true);
  update public.tasks set status=case when readiness.is_ready then 'ready'::public.task_status else 'blocked'::public.task_status end,
    blocked_reason=readiness.blocked_reason where id=target.id returning * into target;
  perform set_config('app.task_update_authorised','',true);
  return target;
end;
$$;

create or replace function public.refresh_task_readiness_for_booking(p_booking_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare item record; refreshed integer:=0;
begin
  for item in select id from public.tasks where booking_id=p_booking_id and (status in ('blocked','ready') or schedule_inapplicable) loop
    perform public.refresh_task_readiness(item.id); refreshed:=refreshed+1;
  end loop;
  return refreshed;
end;
$$;

-- Legacy completion/contract commands must not bypass document/date conditions.
create or replace function public.refresh_booking_task_states(p_booking_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin perform public.refresh_task_readiness_for_booking(p_booking_id); end;
$$;
