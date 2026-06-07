-- Enforce the application post category allow-list at the database layer.
-- API routes already validate categories, but this prevents direct Supabase
-- clients or future routes from inserting/updating arbitrary category values.

begin;

update public.posts
set category = 'General Q&A'
where category is null
   or category not in (
    'General Q&A',
    'PCS / Moving',
    'On-Base Guide',
    'Housing',
    'Barracks',
    'Local Recommendations',
    'Things to Do',
    'Finance',
    'Education',
    'Family / Spouse',
    'Resources',
    'Events & Community'
   );

alter table public.posts
  drop constraint if exists posts_category_allowed_check,
  add constraint posts_category_allowed_check
    check (category in (
      'General Q&A',
      'PCS / Moving',
      'On-Base Guide',
      'Housing',
      'Barracks',
      'Local Recommendations',
      'Things to Do',
      'Finance',
      'Education',
      'Family / Spouse',
      'Resources',
      'Events & Community'
    ));

commit;
