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

## Template Data Format

Period IDs use the university convention: `1`-`10` for daytime, `A`-`D` for evening.
Time format: 24-hour `HH:mm`. Array order = display order.

## ⚠️ 部署前必讀

本 repo 部署到 `ntutbox.com` zone，而該 zone 每個 hostname 都由 route ＋
Custom Domain 兩套機制共同擁有，交互作用不在任何單一設定檔裡。部署前先讀
zone 拓撲真相檔——**它在另一個 repo**：本機是同一上層目錄下的
`ntutbox-edge/docs/zone-topology.md`，線上是
<https://github.com/poterpan/ntutbox-edge/blob/main/docs/zone-topology.md>。
並在 Cloudflare dashboard 確認實際 route 表。

本 repo 特別要注意：`api.ntutbox.com` 的 Custom Domain 指向本 worker（整個
hostname），但 `ntutbox-selection-api` 用精確 route
`api.ntutbox.com/selection/*` 蓋過它——**別在本 repo 加同名或重疊的
route**，那會跟 selection-api 搶 pattern。
