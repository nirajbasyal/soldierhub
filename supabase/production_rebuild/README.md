Soldier Hub Supabase production rebuild
Use these files only when rebuilding Soldier Hub in a brand-new empty Supabase project.
Run them in Supabase SQL Editor in this exact order:
`01_schema_tables_constraints.sql`
`02a_functions_admin_comments.sql`
`02b_functions_posts_comments.sql`
`02c_functions_feed_profiles.sql`
`02d_functions_notifications_admin.sql`
`02e_functions_triggers_views_indexes.sql`
`03_rls_policies.sql`
`04_grants_resources_finish.sql`
Do not run old `schema.sql`, old `policies.sql`, `seed.sql`, or anything inside `archive/` for production rebuild unless it has been reviewed.
This rebuild creates database structure, functions, triggers, RLS policies, grants, indexes, views, and the public resources seed rows. It does not copy real users, posts, comments, notifications, or auth accounts. Supabase Auth settings, Resend SMTP, Vercel env vars, R2, Upstash/KV, and Sentry must still be configured in their dashboards.
