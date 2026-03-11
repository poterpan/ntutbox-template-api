# NTUTBox Template API Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Cloudflare Worker that serves school schedule templates as a read-only JSON API, deployed via GitHub Actions CI/CD.

**Architecture:** Two GET endpoints (`/schedule/templates` and `/schedule/templates/:id`) backed by Cloudflare KV. Template data is version-controlled as JSON files under `data/templates/` and synced to KV via a seed script. GitHub Actions deploys the worker on push to `main`.

**Tech Stack:** Cloudflare Workers, Cloudflare KV, Wrangler CLI, Vitest (with `@cloudflare/vitest-pool-workers`), GitHub Actions

---

## File Structure

```
ntutbox_api/
├── src/
│   ├── index.js              # Worker entry: fetch handler + router
│   └── responses.js          # jsonResponse() + corsHeaders() helpers
├── data/
│   └── templates/
│       ├── index.json         # Template list (source of truth)
│       ├── ntust.json         # 臺科大 14 節制
│       └── ntu.json           # 臺大 10 節制
├── scripts/
│   └── seed-kv.js            # Reads data/templates/ and writes to KV
├── test/
│   ├── index.test.js          # Integration tests for all routes
│   └── responses.test.js      # Unit tests for helpers
├── wrangler.toml              # Worker + KV binding config
├── vitest.config.js           # Vitest config for CF Workers pool
├── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml         # CI: test → deploy on push to main
├── .gitignore
└── .node-version              # Pin Node version for CI consistency
```

**Design rationale:**
- `data/templates/` = version-controlled source of truth for all template data. Changes are reviewed in PRs before merging.
- `scripts/seed-kv.js` = deterministic sync from JSON files to KV. Runs in CI after deploy.
- `src/responses.js` is extracted because both the worker and tests reference these helpers.
- Tests use Cloudflare's official vitest pool so they run against a real miniflare environment (KV bindings work in tests).

---

## Chunk 1: Project Scaffolding & Helpers

### Task 1: Initialize project and install dependencies

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.node-version`
- Create: `wrangler.toml`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/poterpan/Documents/Coding/NTUT/ntutbox_api
git init
```

- [ ] **Step 2: Create `.node-version`**

```
22
```

- [ ] **Step 3: Create `.gitignore`**

```gitignore
node_modules/
dist/
.dev.vars
.wrangler/
```

- [ ] **Step 4: Create `package.json`**

```json
{
  "name": "ntutbox-template-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "seed": "node scripts/seed-kv.js"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.8.0",
    "vitest": "^3.0.0",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 5: Create `wrangler.toml`**

```toml
name = "ntutbox-template-api"
main = "src/index.js"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "SCHEDULE_TEMPLATES"
id = "PLACEHOLDER_PRODUCTION_KV_ID"
preview_id = "PLACEHOLDER_PREVIEW_KV_ID"

# Routes — uncomment after custom domain is configured
# [routes]
# pattern = "api.ntutbox.com/schedule/templates*"
```

> **Note:** KV namespace IDs are placeholders. The deployer must create KV namespaces via `wrangler kv namespace create SCHEDULE_TEMPLATES` and update the IDs. For CI, these are set via GitHub Secrets + `wrangler.toml` env substitution.

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore .node-version wrangler.toml
git commit -m "chore: initialize project with wrangler and vitest"
```

---

### Task 2: Implement response helpers

**Files:**
- Create: `src/responses.js`
- Create: `test/responses.test.js`
- Create: `vitest.config.js`

- [ ] **Step 1: Create `vitest.config.js`**

```js
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
  },
});
```

- [ ] **Step 2: Write the failing tests for response helpers**

Create `test/responses.test.js`:

```js
import { describe, it, expect } from "vitest";
import { jsonResponse, corsHeaders } from "../src/responses.js";

describe("corsHeaders", () => {
  it("returns correct CORS headers", () => {
    const headers = corsHeaders();
    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(headers["Access-Control-Allow-Methods"]).toBe("GET, OPTIONS");
    expect(headers["Access-Control-Allow-Headers"]).toBe("Content-Type");
  });
});

describe("jsonResponse", () => {
  it("returns JSON with default 200 status", async () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns JSON with custom status", async () => {
    const res = jsonResponse({ error: "not found" }, 404);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not found" });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `../src/responses.js` does not exist.

- [ ] **Step 4: Implement response helpers**

Create `src/responses.js`:

```js
export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      ...corsHeaders(),
    },
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.js src/responses.js test/responses.test.js
git commit -m "feat: add JSON response and CORS helpers with tests"
```

---

## Chunk 2: Worker Routes & Integration Tests

### Task 3: Implement the Worker fetch handler

**Files:**
- Create: `src/index.js`
- Create: `test/index.test.js`

- [ ] **Step 1: Write integration tests**

Create `test/index.test.js`:

```js
import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index.js";

const MOCK_INDEX = JSON.stringify([
  {
    id: "ntust",
    school: "國立臺灣科技大學",
    name: "臺科大 14 節制",
    periodCount: 14,
  },
]);

const MOCK_TEMPLATE = JSON.stringify({
  id: "ntust",
  school: "國立臺灣科技大學",
  name: "臺科大 14 節制",
  periods: [
    { id: "1", startTime: "08:10", endTime: "09:00" },
    { id: "2", startTime: "09:10", endTime: "10:00" },
  ],
});

async function fetchWorker(path, method = "GET") {
  const request = new Request(`http://localhost${path}`, { method });
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe("GET /schedule/templates", () => {
  beforeEach(async () => {
    await env.SCHEDULE_TEMPLATES.put("index", MOCK_INDEX);
  });

  it("returns template list", async () => {
    const res = await fetchWorker("/schedule/templates");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.templates).toHaveLength(1);
    expect(body.templates[0].id).toBe("ntust");
  });

  it("returns empty array when index is missing", async () => {
    await env.SCHEDULE_TEMPLATES.delete("index");
    const res = await fetchWorker("/schedule/templates");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.templates).toEqual([]);
  });
});

describe("GET /schedule/templates/:id", () => {
  beforeEach(async () => {
    await env.SCHEDULE_TEMPLATES.put("tmpl:ntust", MOCK_TEMPLATE);
  });

  it("returns a single template", async () => {
    const res = await fetchWorker("/schedule/templates/ntust");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("ntust");
    expect(body.periods).toHaveLength(2);
  });

  it("returns 404 for unknown template", async () => {
    const res = await fetchWorker("/schedule/templates/unknown");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Template not found");
  });
});

describe("Edge cases", () => {
  it("rejects non-GET methods", async () => {
    const res = await fetchWorker("/schedule/templates", "POST");
    expect(res.status).toBe(405);
  });

  it("handles CORS preflight", async () => {
    const res = await fetchWorker("/schedule/templates", "OPTIONS");
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 404 for unknown paths", async () => {
    const res = await fetchWorker("/unknown");
    expect(res.status).toBe(404);
  });

  it("rejects template IDs with invalid characters", async () => {
    const res = await fetchWorker("/schedule/templates/../../etc");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `../src/index.js` does not exist.

- [ ] **Step 3: Implement the Worker**

Create `src/index.js`:

```js
import { jsonResponse, corsHeaders } from "./responses.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    // GET /schedule/templates
    if (path === "/schedule/templates") {
      const index = await env.SCHEDULE_TEMPLATES.get("index");
      return jsonResponse({ templates: index ? JSON.parse(index) : [] });
    }

    // GET /schedule/templates/:id
    const match = path.match(/^\/schedule\/templates\/([a-z0-9_-]+)$/);
    if (match) {
      const template = await env.SCHEDULE_TEMPLATES.get(`tmpl:${match[1]}`);
      if (!template) {
        return jsonResponse({ error: "Template not found" }, 404);
      }
      return jsonResponse(JSON.parse(template));
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/index.js test/index.test.js
git commit -m "feat: implement template API routes with integration tests"
```

---

## Chunk 3: Template Data & KV Seed Script

### Task 4: Add template data files

**Files:**
- Create: `data/templates/index.json`
- Create: `data/templates/ntust.json`
- Create: `data/templates/ntu.json`

> **Source:** Period data from spec. NTUT is excluded (built into the app as `TimeConfiguration.ntut`).

- [ ] **Step 1: Create `data/templates/ntust.json`**

```json
{
  "id": "ntust",
  "school": "國立臺灣科技大學",
  "name": "臺科大 14 節制",
  "periods": [
    { "id": "1", "startTime": "08:10", "endTime": "09:00" },
    { "id": "2", "startTime": "09:10", "endTime": "10:00" },
    { "id": "3", "startTime": "10:10", "endTime": "11:00" },
    { "id": "4", "startTime": "11:10", "endTime": "12:00" },
    { "id": "5", "startTime": "12:10", "endTime": "13:00" },
    { "id": "6", "startTime": "13:10", "endTime": "14:00" },
    { "id": "7", "startTime": "14:10", "endTime": "15:00" },
    { "id": "8", "startTime": "15:10", "endTime": "16:00" },
    { "id": "9", "startTime": "16:10", "endTime": "17:00" },
    { "id": "10", "startTime": "17:10", "endTime": "18:00" },
    { "id": "11", "startTime": "18:30", "endTime": "19:20" },
    { "id": "12", "startTime": "19:20", "endTime": "20:10" },
    { "id": "13", "startTime": "20:20", "endTime": "21:10" },
    { "id": "14", "startTime": "21:10", "endTime": "22:00" }
  ]
}
```

- [ ] **Step 2: Create `data/templates/ntu.json`**

```json
{
  "id": "ntu",
  "school": "國立臺灣大學",
  "name": "臺大 10 節制",
  "periods": [
    { "id": "1", "startTime": "08:10", "endTime": "09:00" },
    { "id": "2", "startTime": "09:10", "endTime": "10:00" },
    { "id": "3", "startTime": "10:20", "endTime": "11:10" },
    { "id": "4", "startTime": "11:20", "endTime": "12:10" },
    { "id": "5", "startTime": "12:20", "endTime": "13:10" },
    { "id": "6", "startTime": "13:20", "endTime": "14:10" },
    { "id": "7", "startTime": "14:20", "endTime": "15:10" },
    { "id": "8", "startTime": "15:30", "endTime": "16:20" },
    { "id": "9", "startTime": "16:30", "endTime": "17:20" },
    { "id": "10", "startTime": "17:30", "endTime": "18:20" }
  ]
}
```

- [ ] **Step 3: Create `data/templates/index.json`**

This is derived from the individual template files — contains summary info only:

```json
[
  {
    "id": "ntust",
    "school": "國立臺灣科技大學",
    "name": "臺科大 14 節制",
    "periodCount": 14
  },
  {
    "id": "ntu",
    "school": "國立臺灣大學",
    "name": "臺大 10 節制",
    "periodCount": 10
  }
]
```

- [ ] **Step 4: Commit**

```bash
git add data/
git commit -m "feat: add NTUST and NTU schedule template data"
```

---

### Task 5: Create KV seed script

**Files:**
- Create: `scripts/seed-kv.js`

The seed script reads all JSON files from `data/templates/` and uploads them to KV using Wrangler's CLI. Uses `execFileSync` (not `execSync`) to avoid shell injection.

- [ ] **Step 1: Create `scripts/seed-kv.js`**

```js
#!/usr/bin/env node

/**
 * Seed KV from data/templates/*.json
 *
 * Usage:
 *   node scripts/seed-kv.js                     # uses wrangler.toml default env
 *   node scripts/seed-kv.js --env production     # specific environment
 *
 * Requires: wrangler CLI authenticated (via CLOUDFLARE_API_TOKEN in env)
 */

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data", "templates");
const PROJECT_ROOT = join(__dirname, "..");

const envArgs = process.argv.includes("--env")
  ? ["--env", process.argv[process.argv.indexOf("--env") + 1]]
  : [];

function wranglerPut(key, value) {
  const args = [
    "wrangler",
    "kv",
    "key",
    "put",
    "--binding",
    "SCHEDULE_TEMPLATES",
    key,
    value,
    ...envArgs,
  ];
  console.log(`> npx ${args.join(" ").substring(0, 80)}...`);
  execFileSync("npx", args, { stdio: "inherit", cwd: PROJECT_ROOT });
}

// Upload index
const indexData = readFileSync(join(DATA_DIR, "index.json"), "utf-8");
JSON.parse(indexData); // validate
wranglerPut("index", indexData);

// Upload each template
const files = readdirSync(DATA_DIR).filter(
  (f) => f.endsWith(".json") && f !== "index.json"
);

for (const file of files) {
  const id = file.replace(".json", "");
  const data = readFileSync(join(DATA_DIR, file), "utf-8");
  JSON.parse(data); // validate
  wranglerPut(`tmpl:${id}`, data);
}

console.log(`\nSeeded ${files.length} templates + index to KV.`);
```

- [ ] **Step 2: Commit**

```bash
git add scripts/
git commit -m "feat: add KV seed script for template data"
```

---

## Chunk 4: CI/CD & Final Polish

### Task 6: Set up GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/deploy.yml`

**Required GitHub Secrets:**
- `CLOUDFLARE_API_TOKEN` — Wrangler deploy token
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: ".node-version"
          cache: "npm"

      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: ".node-version"
          cache: "npm"

      - run: npm ci

      - name: Deploy to Cloudflare Workers
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Seed KV data
        run: node scripts/seed-kv.js
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflow for test and deploy"
```

---

### Task 7: Create CLAUDE.md for the API project

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create `CLAUDE.md`**

```markdown
# NTUTBox Template API

Cloudflare Worker serving school schedule templates as read-only JSON.

## Tech Stack

- **Runtime:** Cloudflare Workers (ES modules)
- **Storage:** Cloudflare KV (namespace: `SCHEDULE_TEMPLATES`)
- **Testing:** Vitest + @cloudflare/vitest-pool-workers
- **CI/CD:** GitHub Actions → Cloudflare Workers

## Commands

- `npm run dev` — local dev server (wrangler dev)
- `npm test` — run all tests
- `npm run deploy` — deploy to production
- `npm run seed` — sync data/templates/ to KV

## Project Structure

- `src/` — Worker source code
- `data/templates/` — source-of-truth template JSON files
- `scripts/seed-kv.js` — syncs template data to Cloudflare KV
- `test/` — Vitest integration + unit tests

## Adding a New School Template

1. Create `data/templates/{school-id}.json` (see existing files for format)
2. Add entry to `data/templates/index.json`
3. Commit, push to `main` — CI deploys and seeds KV automatically

## API Routes

- `GET /schedule/templates` — list all templates
- `GET /schedule/templates/:id` — get single template with periods

## KV Key Conventions

- `index` — template list array
- `tmpl:{id}` — individual template object
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md project guide"
```

---

### Task 8: Set up wrangler.toml for real deployment

This is a manual step — not automated. After creating the KV namespace, update `wrangler.toml` with real IDs.

- [ ] **Step 1: Create KV namespace (run manually)**

```bash
npx wrangler kv namespace create SCHEDULE_TEMPLATES
# Output will include the namespace ID — copy it
```

- [ ] **Step 2: Update `wrangler.toml` with real KV namespace ID**

Replace `PLACEHOLDER_PRODUCTION_KV_ID` with the actual ID from step 1.

- [ ] **Step 3: Create GitHub repo and set secrets**

```bash
gh repo create ntutbox-template-api --private --source=. --push
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

- [ ] **Step 4: Verify first deploy**

Push to `main` and check GitHub Actions. Verify:
- Tests pass
- Worker deploys
- KV is seeded
- `curl https://<worker>.workers.dev/schedule/templates` returns template list
