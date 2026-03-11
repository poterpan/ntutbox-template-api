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
