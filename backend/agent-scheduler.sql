create or replace function app_private.dispatch_application_agent() returns void
language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if not exists(select 1 from public.application_agent_runs where status in ('QUEUED','RUNNING')) then return; end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='applyflow_agent_scheduler_key' limit 1;
 if token is null then return; end if;
 perform net.http_post(url:='https://tbggqauyesloekynqavb.supabase.co/functions/v1/applyflow-application-agent',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{"action":"TICK"}'::jsonb,timeout_milliseconds:=55000);
end $$;
revoke all on function app_private.dispatch_application_agent() from public,anon,authenticated;
select cron.schedule('applyflow-application-agent-v2','* * * * *','select app_private.dispatch_application_agent()');
