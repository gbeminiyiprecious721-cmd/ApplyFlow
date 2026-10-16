-- Preserve server-recorded confirmation against stale client upserts.
create or replace function app_private.protect_application_progress() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='DELETE' then
  if exists(select 1 from public.application_agent_runs where application_id=old.id and status in ('STARTING','RUNNING')) then
   raise exception 'An application run is active. Pause and wait before deleting this application.';
  end if;
  return old;
 end if;
 if old.applied_at is not null or old.submitted_at is not null then
  new.applied_at=coalesce(old.applied_at,old.submitted_at);
  new.submitted_at=coalesce(old.submitted_at,old.applied_at);
  if new.status in ('SAVED','PREPARING','READY','NEEDS_REVIEW','QUEUED','FOUND') then new.status=old.status; end if;
  new.runner_state=old.runner_state;
  new.runner_current_url=old.runner_current_url;
  new.runner_session_id=old.runner_session_id;
 end if;
 return new;
end $$;
revoke all on function app_private.protect_application_progress() from public,anon,authenticated;
create trigger protect_application_update before update on public.applications for each row execute function app_private.protect_application_progress();
create trigger protect_active_application_delete before delete on public.applications for each row execute function app_private.protect_application_progress();
-- Regression test uses isolated temporary rows; no candidate data is changed.
create temporary table applyflow_progress_test(id uuid,status text,applied_at timestamptz,submitted_at timestamptz,runner_state text,runner_current_url text,runner_session_id text) on commit drop;
create trigger guard_test before update on applyflow_progress_test for each row execute function app_private.protect_application_progress();
insert into applyflow_progress_test values(gen_random_uuid(),'APPLIED','2026-10-10T10:00:00Z','2026-10-10T10:00:00Z','SUBMITTED','https://example.com/thanks','confirmed-session');
update applyflow_progress_test set status='PREPARING',applied_at=null,submitted_at=null,runner_state=null,runner_current_url=null,runner_session_id=null;
do $$ begin
 if not exists(select 1 from applyflow_progress_test where status='APPLIED' and applied_at is not null and submitted_at is not null and runner_state='SUBMITTED' and runner_current_url='https://example.com/thanks' and runner_session_id='confirmed-session') then raise exception 'Stale-save protection regression'; end if;
end $$;
