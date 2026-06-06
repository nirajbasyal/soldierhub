# Deprecated production rebuild folder

Do not use this folder to rebuild Soldier Hub.

The production source of truth is now:

```txt
supabase/migrations/
```

This folder is intentionally retained only as a deprecated marker because older split rebuild files existed here before migrations were promoted as the only source of truth.

For a new database, apply the migrations in order. Do not run copied SQL from this folder.
