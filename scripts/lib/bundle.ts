import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** All migrations in order, wrapped in one transaction so a failure changes nothing. */
export function buildSetupSql(migrationsDir: string): string {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const parts = files.map((f) => `-- >>> ${f}\n${readFileSync(join(migrationsDir, f), "utf8").replace(/^﻿/, "").trim()}\n`);
  return [
    "-- =====================================================================",
    "-- GENERATED FILE (npm run db:bundle). Do not edit; edit supabase/migrations instead.",
    "-- Paste this whole file into Supabase > SQL Editor > New query, then click Run, ONCE.",
    "-- Everything runs in one transaction: if anything fails, nothing is changed.",
    "-- =====================================================================",
    "begin;",
    "",
    ...parts,
    "commit;",
    "",
  ].join("\n");
}
