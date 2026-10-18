/**
 * npm run db:bundle
 * Combines supabase/migrations/*.sql into supabase/setup-all.sql so the whole
 * database can be created with ONE paste into the Supabase SQL Editor.
 * The migrations folder stays the source of truth; a test checks they match.
 */
import { writeFileSync } from "node:fs";
import { buildSetupSql } from "./lib/bundle";

writeFileSync("supabase/setup-all.sql", buildSetupSql("supabase/migrations"), "utf8");
console.log("Wrote supabase/setup-all.sql");
