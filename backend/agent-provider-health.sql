create table app_private.application_agent_health (
 singleton boolean primary key default true check(singleton),
 runnable boolean not null default false,
 message text not null,
 checked_at timestamptz not null default now()
);
revoke all on app_private.application_agent_health from public,anon,authenticated;
insert into app_private.application_agent_health(singleton,runnable,message) values(true,false,'Browser runner rejected the test with HTTP 402. Restore provider billing or credits, then test the connection.');
