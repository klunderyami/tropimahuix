-- Programaciones y borradores de agentes. No altera las tablas de tienda.
create table if not exists public.agent_scheduled_runs (
 id uuid primary key default gen_random_uuid(),
 job_id text not null check (job_id in ('facebook_ads','customer_messages','distributor_followup','instagram_content','sales_report')),
 local_date date not null,
 status text not null default 'running' check (status in ('running','pending_approval','approved','rejected','failed')),
 agent_id text not null,
 prompt_context text not null default '',
 draft text,
 target_limit integer not null default 0 check (target_limit between 0 and 10),
 error_message text,
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (job_id,local_date)
);
alter table public.agent_scheduled_runs enable row level security;
revoke all on public.agent_scheduled_runs from anon, authenticated;
create index if not exists agent_scheduled_runs_status_created_idx on public.agent_scheduled_runs(status,created_at desc);
comment on table public.agent_scheduled_runs is 'Internal AI drafts only; approval never triggers external sends or paid advertising.';
