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
