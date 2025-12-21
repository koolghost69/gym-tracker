export async function onRequest(context) {
    const { request, env, params } = context;
  
    // KV binding name you must add in Cloudflare Pages Settings -> Bindings
    // Variable name: GYM_KV
    const KV = env.GYM_KV;
    if (!KV) {
      return json({ error: "Missing KV binding. Add a KV namespace binding named GYM_KV." }, 500);
    }
  
    // Handle preflight (not always required, but nice)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }
  
    const pathParts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
    const route = (pathParts.join("/") || "").trim();
  
    try {
      // GET /api/get-data?key=...
      if (route === "get-data" && request.method === "GET") {
        const url = new URL(request.url);
        const key = url.searchParams.get("key");
        if (!key) return json({ error: "Missing key" }, 400);
  
        const value = await KV.get(key);
        return json({ key, value: value ?? null });
      }
  
      // POST helpers
      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
  
        if (route === "save-users") {
          return await putJson(KV, "gym-users", body.users);
        }
        if (route === "save-workouts") {
          return await putJson(KV, "gym-workouts", body.workouts);
        }
        if (route === "save-goals") {
          return await putJson(KV, "gym-goals", body.goals);
        }
        if (route === "save-photos") {
          return await putJson(KV, "gym-photos", body.photos);
        }
        if (route === "save-exercises") {
          return await putJson(KV, "gym-exercises", body.exercises);
        }
  
        return json({ error: `Unknown POST route: ${route}` }, 404);
      }
  
      return json({ error: `Unknown route or method: ${request.method} ${route}` }, 404);
    } catch (err) {
      return json({ error: "Server error", detail: String(err?.message || err) }, 500);
    }
  }
  
  async function putJson(KV, key, value) {
    if (typeof value === "undefined") {
      return json({ error: `Missing payload for ${key}` }, 400);
    }
    await KV.put(key, JSON.stringify(value));
    return json({ ok: true, key });
  }
  
  function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...corsHeaders(),
      },
    });
  }
  
  function corsHeaders() {
    return {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    };
  }
  