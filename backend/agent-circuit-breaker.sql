-- Apply to the target Supabase environment before deploying the updated worker.
alter table app_private.application_agent_health
 add column if not exists consecutive_failures integer not null default 0 check(consecutive_failures>=0),
 add column if not exists circuit_open boolean not null default false;
create table if not exists app_private.application_agent_alerts (
 id bigint generated always as identity primary key,
 event text not null,
 http_status integer not null,
 created_at timestamptz not null default now()
);
revoke all on app_private.application_agent_alerts from public,anon,authenticated;
create or replace function app_private.dispatch_application_agent() returns void
language plpgsql security definer set search_path='' as $$
declare token text;
begin
 -- Remain paused indefinitely; only an explicit successful connection TEST reopens.
 if not exists(select 1 from app_private.application_agent_health where singleton and not circuit_open) then return; end if;
 if not exists(select 1 from public.application_agent_runs where status in ('QUEUED','RUNNING')) then return; end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='applyflow_agent_scheduler_key' limit 1;
 if token is null then return; end if;
 perform net.http_post(url:='https://tbggqauyesloekynqavb.supabase.co/functions/v1/applyflow-application-agent',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{"action":"TICK"}'::jsonb,timeout_milliseconds:=55000);
end $$;
revoke all on function app_private.dispatch_application_agent() from public,anon,authenticated;
