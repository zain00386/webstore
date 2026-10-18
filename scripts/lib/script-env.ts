import { existsSync } from "node:fs";
import { describeProblems, getSupabaseServiceConfig } from "../../src/lib/env";

/** Loads .env.local for command-line scripts (Next.js does this automatically for the website). */
export function loadScriptEnv() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const config = getSupabaseServiceConfig();
  if (!config.ok) {
    console.error("\n✗ Supabase settings are not ready:");
    for (const p of config.problems) console.error(`   - ${p.name} ${p.problem}`);
    console.error("\n  Fill in .env.local as described in docs/database-setup.md, then run this again.\n");
    process.exit(1);
  }
  return config.value;
}

export { describeProblems };
