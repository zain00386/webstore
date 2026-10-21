// npm run e2e:all  (needs the site running on http://localhost:3000)
// Runs every browser/database test one after another and prints a summary.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const tsxCli = createRequire(import.meta.url).resolve("tsx/cli");
const suites = [
  "admin-auth",
  "admin-books",
  "cart",
  "orders",
  "last-copy",
  "payments",
  "admin-orders",
  "admin-posts",
  "settings",
  "a11y",
  "keyboard",
];

const summary: string[] = [];
let failed = 0;
for (const name of suites) {
  const started = Date.now();
  const run = spawnSync(process.execPath, [tsxCli, `scripts/e2e/${name}.mts`], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  const out = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  const pass = (out.match(/^PASS/gm) ?? []).length;
  const fails = out.split("\n").filter((l) => /^(FAIL|ERROR)/.test(l));
  const ok = run.status === 0;
  if (!ok) failed++;
  summary.push(`${ok ? "✓" : "✗"} ${name.padEnd(14)} ${pass ? `${pass} checks passed` : ok ? "no issues" : ""}  (${Math.round((Date.now() - started) / 1000)}s)`);
  for (const f of fails.slice(0, 5)) summary.push(`    ${f.slice(0, 200)}`);
  if (!ok && !fails.length) summary.push(`    ${out.trim().split("\n").slice(-3).join(" | ").slice(0, 300)}`);
  console.log(summary.at(-1 - Math.min(5, fails.length)) ?? "");
}

console.log(`\n${summary.join("\n")}\n\n${failed ? `${failed} suite(s) failed.` : "All suites passed."}`);
process.exit(failed ? 1 : 0);
