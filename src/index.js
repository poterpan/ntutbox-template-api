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
