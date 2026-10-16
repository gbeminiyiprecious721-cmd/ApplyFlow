create table public.application_agent_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 mode text not null default 'review' check(mode in ('review','auto')),
 enabled boolean not null default false,
 daily_limit integer not null default 5 check(daily_limit between 1 and 25),
 minimum_match integer not null default 85 check(minimum_match between 50 and 100),
 countries text[] not null default '{}',
 excluded_companies text[] not null default '{}',
 consent_at timestamptz,
 updated_at timestamptz not null default now()
);
create table public.application_agent_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 application_id uuid not null references public.applications(id) on delete cascade,
 status text not null default 'QUEUED' check(status in ('QUEUED','STARTING','RUNNING','NEEDS_REVIEW','SUBMITTED','UNCONFIRMED','FAILED','CANCELLED')),
 allow_submit boolean not null default false,
 snapshot jsonb not null,
 provider_run_id text,
 result jsonb not null default '{}',
 reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,application_id)
);
alter table public.application_agent_settings enable row level security;
alter table public.application_agent_runs enable row level security;
create policy agent_settings_owner_read on public.application_agent_settings for select to authenticated using ((select auth.uid())=user_id);
create policy agent_runs_owner_read on public.application_agent_runs for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.application_agent_settings, public.application_agent_runs from anon,authenticated;
grant select on public.application_agent_settings, public.application_agent_runs to authenticated;
create index application_agent_pending on public.application_agent_runs(status,created_at) where status in ('QUEUED','RUNNING');
-- Server-only scheduler credential. Its value never leaves the database / runtime.
select vault.create_secret(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'applyflow_agent_scheduler_key');
create or replace function app_private.dispatch_application_agent() returns void
language plpgsql security definer set search_path='' as $$
declare token text;
begin
 select decrypted_secret into token from vault.decrypted_secrets where name='applyflow_agent_scheduler_key' limit 1;
 if token is null then return; end if;
 perform net.http_post(url:='https://tbggqauyesloekynqavb.supabase.co/functions/v1/applyflow-application-agent',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{"action":"TICK"}'::jsonb,timeout_milliseconds:=55000);
end $$;
revoke all on function app_private.dispatch_application_agent() from public,anon,authenticated;
