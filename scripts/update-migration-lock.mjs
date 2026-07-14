import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDirectory = join(root, "supabase", "migrations");
const lockPath = join(root, "supabase", "migration-history.lock.json");
const filenamePattern = /^(\d{14})_([a-z0-9_]+)\.sql$/;

const files = readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const versions = new Set();
for (const file of files) {
  const match = filenamePattern.exec(file);
  if (!match) {
    throw new Error(`Invalid migration filename: ${file}`);
  }
  if (versions.has(match[1])) {
    throw new Error(`Duplicate migration version: ${match[1]}`);
  }
  versions.add(match[1]);
}

let existing = {};
if (existsSync(lockPath)) {
  existing = JSON.parse(readFileSync(lockPath, "utf8"));
}

const requestedProductionVersion = process.argv[2];
if (
  requestedProductionVersion &&
  !files.some((file) => file.startsWith(`${requestedProductionVersion}_`))
) {
  throw new Error(
    `Production version is not present in migrations: ${requestedProductionVersion}`,
  );
}

const lock = {
  format: 1,
  productionVerifiedThrough:
    requestedProductionVersion ?? existing.productionVerifiedThrough ?? null,
  migrations: files.map((file) => ({
    file,
    sha256: createHash("sha256")
      .update(readFileSync(join(migrationsDirectory, file)))
      .digest("hex"),
  })),
};

writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
