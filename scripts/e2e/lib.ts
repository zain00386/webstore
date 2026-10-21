import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Small helpers to drive headless Edge through the DevTools protocol (no extra packages). */

export const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Browser = {
  send: (method: string, params?: Record<string, unknown>) => Promise<{ result: Record<string, unknown> }>;
  js: <T>(expr: string) => Promise<T>;
  go: (path: string) => Promise<void>;
  text: () => Promise<string>;
  url: () => Promise<string>;
  waitFor: (fn: () => Promise<boolean>, ms?: number) => Promise<boolean>;
  waitForText: (needle: string | RegExp, ms?: number) => Promise<boolean>;
  fill: (selector: string, value: string) => Promise<void>;
  click: (selector: string) => Promise<void>;
  clickText: (tag: string, label: string) => Promise<void>;
  setFile: (selector: string, path: string) => Promise<void>;
  close: () => void;
  logs: string[];
};

export async function launchBrowser(): Promise<Browser> {
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc: ChildProcess = spawn(
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "edge-e2e-"))}`, "about:blank"],
    { stdio: "ignore" },
  );
  let target: { webSocketDebuggerUrl: string } | undefined;
  for (let i = 0; i < 60 && !target; i++) {
    try {
      const list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
      target = list.find((t) => t.type === "page");
    } catch {}
    if (!target) await sleep(200);
  }
  if (!target) throw new Error("Edge did not start");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map<number, (m: never) => void>();
  const logs: string[] = [];
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id) {
      pending.get(m.id)?.(m as never);
      pending.delete(m.id);
    } else if (m.method === "Runtime.exceptionThrown") {
      logs.push(`exception: ${String(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, process.env.E2E_LONG_LOGS ? 4000 : 200)}`);
    } else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      logs.push(`console.error: ${m.params.args.map((a: { value?: string; description?: string }) => a.value ?? a.description).join(" ").slice(0, 200)}`);
    }
  });
  const send: Browser["send"] = (method, params = {}) =>
    new Promise((res) => {
      const n = ++id;
      pending.set(n, res as never);
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const js = async <T,>(expr: string) => {
    const r = (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })) as {
      result: { result: { value: T }; exceptionDetails?: { text: string; exception?: { description?: string } } };
    };
    if (r.result.exceptionDetails) {
      const d = r.result.exceptionDetails;
      throw new Error(`page script failed: ${(d.exception?.description ?? d.text).split("\n")[0]} | script: ${expr.slice(0, 120)}`);
    }
    return r.result.result.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("DOM.enable");

  const text = () => js<string>("document.body ? document.body.innerText : ''");
  const url = () => js<string>("location.pathname + location.search");
  const waitFor: Browser["waitFor"] = async (fn, ms = 20000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await fn().catch(() => false)) return true;
      await sleep(300);
    }
    return false;
  };
  const waitForText: Browser["waitForText"] = (needle, ms) =>
    waitFor(async () => {
      const t = await text();
      return typeof needle === "string" ? t.includes(needle) : needle.test(t);
    }, ms);
  const go: Browser["go"] = async (path) => {
    await send("Page.navigate", { url: BASE + path });
    await waitFor(() => js<boolean>("document.readyState === 'complete'"), 30000);
    await sleep(800); // let React hydrate
  };
  const fill: Browser["fill"] = async (selector, value) => {
    await waitFor(() => js<boolean>(`!!document.querySelector(${JSON.stringify(selector)})`));
    await js(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
  };
  const click: Browser["click"] = async (selector) => {
    await waitFor(() => js<boolean>(`!!document.querySelector(${JSON.stringify(selector)})`));
    await js(`document.querySelector(${JSON.stringify(selector)}).click()`);
  };
  const clickText: Browser["clickText"] = async (tag, label) => {
    const find = `[...document.querySelectorAll(${JSON.stringify(tag)})].find(b => b.textContent.trim().includes(${JSON.stringify(label)}) && !b.disabled)`;
    await waitFor(() => js<boolean>(`!!${find}`));
    await js(`${find}.click()`);
  };
  const setFile: Browser["setFile"] = async (selector, path) => {
    const doc = (await send("DOM.getDocument", { depth: -1, pierce: true })) as { result: { root: { nodeId: number } } };
    const q = (await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector })) as { result: { nodeId: number } };
    await send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [path] });
  };

  return { send, js, go, text, url, waitFor, waitForText, fill, click, clickText, setFile, logs, close: () => (ws.close(), proc.kill()) };
}

/** Signs in through the real login form. */
export async function signIn(b: Browser, email: string, password: string, next = "/admin") {
  await b.go(`/admin/login?next=${encodeURIComponent(next)}`);
  await b.fill('[name="email"]', email);
  await b.fill('[name="password"]', password);
  await b.clickText("button", "Sign in");
  await b.waitFor(async () => !(await b.url()).startsWith("/admin/login"), 30000);
}

export function reporter() {
  const results: string[] = [];
  return {
    results,
    check(name: string, ok: boolean, detail = "") {
      results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail && !ok ? `  -> ${detail}` : ""}`);
    },
    info(msg: string) {
      results.push(`INFO  ${msg}`);
    },
    failed: () => results.some((r) => r.startsWith("FAIL") || r.startsWith("ERROR")),
  };
}

/**
 * Test orders all come from this computer, so they quickly reach the real
 * "10 orders per device per hour" limit. Tests clear the order counters first
 * (server key only; real customers are unaffected).
 */
export async function clearOrderRateLimits(url: string, serviceKey: string) {
  await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rate_limit_hits?bucket=in.(order_device,order_phone)`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
}
