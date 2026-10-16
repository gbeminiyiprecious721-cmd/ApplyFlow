-- Currency and legal eligibility remain unknown until a user supplies them.
alter table public.user_preferences alter column salary_currency drop not null;
alter table public.user_preferences alter column salary_currency drop default;
