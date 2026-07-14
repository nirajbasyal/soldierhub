import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDirectory = join(root, "supabase", "migrations");
const lockPath = join(root, "supabase", "migration-history.lock.json");
const filenamePattern = /^(\d{14})_([a-z0-9_]+)\.sql$/;

function migrationFiles() {
  return readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

test("migration versions are canonical and unique", () => {
  const files = migrationFiles();
  const versions = files.map((file) => {
    const match = filenamePattern.exec(file);
    assert.ok(match, `invalid migration filename: ${file}`);
    assert.ok(
      readFileSync(join(migrationsDirectory, file), "utf8").trim(),
      `empty migration: ${file}`,
    );
    return match[1];
  });

  assert.equal(new Set(versions).size, versions.length, "duplicate migration version");
  assert.deepEqual(versions, [...versions].sort(), "migrations are not ordered");
});

test("applied migration history is immutable", () => {
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const files = migrationFiles();

  assert.equal(lock.format, 1);
  assert.deepEqual(
    lock.migrations.map(({ file }) => file),
    files,
    "migration set changed; review it and run npm run migrations:lock",
  );

  for (const entry of lock.migrations) {
    const digest = createHash("sha256")
      .update(readFileSync(join(migrationsDirectory, entry.file)))
      .digest("hex");
    assert.equal(
      digest,
      entry.sha256,
      `applied migration was edited: ${entry.file}`,
    );
  }

  assert.ok(
    files.some((file) => file.startsWith(`${lock.productionVerifiedThrough}_`)),
    "productionVerifiedThrough must reference a migration in the lock",
  );
});
