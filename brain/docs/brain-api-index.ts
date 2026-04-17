import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MCP_ACCESS_KEY = Deno.env.get("MCP_ACCESS_KEY")!;

const OPENAI_BASE = "https://api.openai.com/v1";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Invalid or missing access key" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getEmbedding(text: string): Promise<number[]> {
  const r = await fetch(`${OPENAI_BASE}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(`OpenAI embeddings failed: ${r.status} ${msg}`);
  }
  const d = await r.json();
  return d.data[0].embedding;
}

async function extractMetadata(text: string): Promise<Record<string, unknown>> {
  const r = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Extract metadata from the user's captured thought. Return JSON with: \"people\" (array, empty if none), \"action_items\" (array, empty if none), \"dates_mentioned\" (array YYYY-MM-DD, empty if none), \"topics\" (array of 1-3 short tags, always at least one), \"type\" (one of observation, task, idea, reference, person_note). Only extract what is explicitly there." },
        { role: "user", content: text },
      ],
    }),
  });
  const d = await r.json();
  try { return JSON.parse(d.choices[0].message.content); }
  catch { return { topics: ["uncategorized"], type: "observation" }; }
}

async function handleCapture(body: { content: string }): Promise<Response> {
  if (!body.content || body.content.trim() === "") {
    return jsonResponse({ error: "content is required" }, 400);
  }

  const [embedding, metadata] = await Promise.all([
    getEmbedding(body.content),
    extractMetadata(body.content),
  ]);

  const { data: upsertResult, error: upsertError } = await supabase.rpc("upsert_thought", {
    p_content: body.content,
    p_payload: { metadata: { ...metadata, source: "gpt" } },
  });

  if (upsertError) {
    return jsonResponse({ error: upsertError.message }, 500);
  }

  const thoughtId = upsertResult?.id;
  const { error: embError } = await supabase
    .from("thoughts")
    .update({ embedding })
    .eq("id", thoughtId);

  if (embError) {
    return jsonResponse({ error: embError.message }, 500);
  }

  return jsonResponse({
    status: "captured",
    type: metadata.type || "observation",
    topics: metadata.topics || [],
    people: metadata.people || [],
    action_items: metadata.action_items || [],
  });
}

async function handleSearch(body: { query: string; limit?: number; threshold?: number }): Promise<Response> {
  if (!body.query || body.query.trim() === "") {
    return jsonResponse({ error: "query is required" }, 400);
  }

  const limit = body.limit || 10;
  const threshold = body.threshold || 0.5;

  const qEmb = await getEmbedding(body.query);
  const { data, error } = await supabase.rpc("match_thoughts", {
    query_embedding: qEmb,
    match_threshold: threshold,
    match_count: limit,
    filter: {},
  });

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  if (!data || data.length === 0) {
    return jsonResponse({ results: [], message: "No thoughts found matching your query." });
  }

  const results = data.map((t: { content: string; metadata: Record<string, unknown>; similarity: number; created_at: string }) => ({
    content: t.content,
    similarity: Math.round(t.similarity * 100),
    captured: t.created_at,
    type: t.metadata?.type || "unknown",
    topics: t.metadata?.topics || [],
    people: t.metadata?.people || [],
    action_items: t.metadata?.action_items || [],
  }));

  return jsonResponse({ results });
}

async function handleList(body: { limit?: number; type?: string; topic?: string; person?: string; days?: number }): Promise<Response> {
  const limit = body.limit || 10;

  let q = supabase
    .from("thoughts")
    .select("content, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (body.type) q = q.contains("metadata", { type: body.type });
  if (body.topic) q = q.contains("metadata", { topics: [body.topic] });
  if (body.person) q = q.contains("metadata", { people: [body.person] });
  if (body.days) {
    const since = new Date();
    since.setDate(since.getDate() - body.days);
    q = q.gte("created_at", since.toISOString());
  }

  const { data, error } = await q;

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const results = (data || []).map((t: { content: string; metadata: Record<string, unknown>; created_at: string }) => ({
    content: t.content,
    captured: t.created_at,
    type: t.metadata?.type || "unknown",
    topics: t.metadata?.topics || [],
    people: t.metadata?.people || [],
  }));

  return jsonResponse({ results });
}

async function handleStats(): Promise<Response> {
  const { count } = await supabase.from("thoughts").select("*", { count: "exact", head: true });
  const { data } = await supabase.from("thoughts").select("metadata, created_at").order("created_at", { ascending: false });

  const types: Record<string, number> = {};
  const topics: Record<string, number> = {};
  const people: Record<string, number> = {};

  for (const r of data || []) {
    const m = (r.metadata || {}) as Record<string, unknown>;
    if (m.type) types[m.type as string] = (types[m.type as string] || 0) + 1;
    if (Array.isArray(m.topics)) for (const t of m.topics) topics[t as string] = (topics[t as string] || 0) + 1;
    if (Array.isArray(m.people)) for (const p of m.people) people[p as string] = (people[p as string] || 0) + 1;
  }

  const sortTop = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ name: k, count: v }));

  return jsonResponse({
    total: count,
    date_range: data?.length ? {
      oldest: data[data.length - 1].created_at,
      newest: data[0].created_at,
    } : null,
    types: sortTop(types),
    topics: sortTop(topics),
    people: sortTop(people),
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (token !== MCP_ACCESS_KEY) {
    return unauthorized();
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    const body = req.method === "POST" ? await req.json() : {};

    switch (path) {
      case "capture":
        return await handleCapture(body);
      case "search":
        return await handleSearch(body);
      case "list":
        return await handleList(body);
      case "stats":
        return await handleStats();
      default:
        return jsonResponse({
          endpoints: [
            "POST /capture — save a thought",
            "POST /search — semantic search",
            "POST /list — list recent thoughts with filters",
            "POST /stats — thought statistics",
          ]
        });
    }
  } catch (err) {
    console.error("brain-api error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
