import { env } from "cloudflare:workers";
import { demoState, demoSamples } from "@/lib/demo";
import type { Sample } from "@/lib/types";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { resolveAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const kinds = ["tasks", "devices", "anomalies", "datasets", "audits"] as const;
type Kind = typeof kinds[number];
function db() { if (!env.DB) throw new Error("数据库未连接，请先配置并迁移 DB。"); return env.DB; }
const id = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const now = () => new Date().toISOString();
function record(kind: Kind, data: Record<string, unknown>) {
  return db().prepare("INSERT INTO records (id,kind,body,created_at) VALUES (?,?,?,?)").bind(data.id, kind, JSON.stringify(data), data.createdAt ?? now());
}
function log(action: string, detail: string) { return record("audits", { id: id("LOG"), action, detail, createdAt: now() }); }
async function getRecord(kind: Kind, key: string) {
  const r = await db().prepare("SELECT body FROM records WHERE id=? AND kind=?").bind(key, kind).first<{ body: string }>();
  return r ? JSON.parse(r.body) : null;
}
async function state() {
  const rows = await db().prepare("SELECT kind, body FROM records ORDER BY created_at DESC, id ASC").all<{ kind: Kind; body: string }>();
  const result: Record<Kind, unknown[]> = { tasks: [], devices: [], anomalies: [], datasets: [], audits: [] };
  for (const row of rows.results) if (row.kind in result) result[row.kind].push(JSON.parse(row.body));
  result.audits = result.audits.slice(0, 80);
  return result;
}
function text(value: unknown, label: string, max = 100) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(`${label}不能为空，且不能超过 ${max} 字。`);
  return value.trim();
}
function choice(value: unknown, allowed: string[], label: string) {
  if (typeof value !== "string" || !allowed.includes(value)) throw new Error(`${label}无效。`);
  return value;
}
function sampleStatements(taskId: string, samples: Sample[], prefix: string) {
  const statements: D1PreparedStatement[] = [];
  // Ten rows per statement stays within D1's 100 bound-parameter limit.
  for (let offset = 0; offset < samples.length; offset += 10) {
    const chunk = samples.slice(offset, offset + 10);
    const values = chunk.flatMap((s, i) => [`${prefix}-${offset + i}`, taskId, s.timestamp, s.wind, s.direction, s.magnetic, s.altitude, s.speed, s.lat, s.lng]);
    statements.push(db().prepare(`INSERT INTO telemetry (id,task_id,timestamp,wind,direction,magnetic,altitude,speed,lat,lng) VALUES ${chunk.map(() => "(?,?,?,?,?,?,?,?,?,?)").join(",")}`).bind(...values));
  }
  return statements;
}
async function seed() {
  if (await db().prepare("SELECT value FROM meta WHERE key='demo-v1'").first()) return;
  const statements: D1PreparedStatement[] = [];
  for (const kind of kinds) for (const item of demoState[kind]) statements.push(record(kind, item as unknown as Record<string, unknown>));
  for (let t = 0; t < 3; t++) statements.push(...sampleStatements(demoState.tasks[t].id, demoSamples(t), `DEMO-${t}`));
  statements.push(log("初始化演示", "载入 3 个任务、3 台设备与 720 条合成遥测；不代表项目真实规模。"));
  statements.push(db().prepare("INSERT INTO meta (key,value) VALUES ('demo-v1','done')"));
  try { await db().batch(statements); } catch (e) {
    if (!await db().prepare("SELECT value FROM meta WHERE key='demo-v1'").first()) throw e;
  }
}
async function route(req: Request) {
  const url = new URL(req.url);
  const [resource, key] = url.pathname.replace(/^\/api\//, "").split("/").map(decodeURIComponent);
  const identity = await getChatGPTUser();
  const localDevelopment = process.env.NODE_ENV === "development" && ["127.0.0.1", "localhost"].includes(url.hostname);
  const access = resolveAccess(identity, env.ADMIN_EMAIL, localDevelopment);
  if (req.method !== "GET") {
    if (!access.canEdit) return json({ error: "此为只读演示。编辑操作需要项目管理员登录。" }, identity ? 403 : 401);
    const origin = req.headers.get("origin");
    if (origin && origin !== url.origin) return json({ error: "不允许跨站修改数据。" }, 403);
    if (Number(req.headers.get("content-length") || 0) > 2_000_000) return json({ error: "导入文件过大，请拆分为不超过 2000 行。" }, 413);
  }
  // Anonymous viewers see only the synthetic scenario, never uploaded customer data or logs.
  if (req.method === "GET" && resource === "state") return json({ ...(access.canEdit ? await state() : demoState), access });
  if (req.method === "POST" && resource === "seed") { await seed(); return json({ ...await state(), access }); }
  if (req.method === "GET" && !access.canEdit && ["telemetry", "export"].includes(resource)) {
    const taskIndex = demoState.tasks.findIndex(task => task.id === key);
    if (taskIndex < 0) return json({ error: "公开演示中没有此任务。" }, 404);
    const samples = demoSamples(taskIndex);
    if (resource === "telemetry") return json(samples);
    const columns: (keyof Sample)[] = ["timestamp", "wind", "direction", "magnetic", "altitude", "speed", "lat", "lng"];
    const csv = "\uFEFF" + columns.join(",") + "\r\n" + samples.map(s => columns.map(c => s[c]).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${encodeURIComponent(key)}-demo.csv"`, "Cache-Control": "no-store" } });
  }
  if (req.method === "GET" && resource === "telemetry") {
    if (!key || !await getRecord("tasks", key)) return json({ error: "任务不存在。" }, 404);
    const rows = await db().prepare("SELECT * FROM telemetry WHERE task_id=? ORDER BY timestamp ASC LIMIT 20000").bind(key).all();
    return json(rows.results);
  }
  if (req.method === "GET" && resource === "export") {
    const task = key && await getRecord("tasks", key);
    if (!task) return json({ error: "任务不存在。" }, 404);
    const rows = await db().prepare("SELECT timestamp,wind,direction,magnetic,altitude,speed,lat,lng FROM telemetry WHERE task_id=? ORDER BY timestamp ASC").bind(key).all<Record<string, unknown>>();
    const columns = ["timestamp", "wind", "direction", "magnetic", "altitude", "speed", "lat", "lng"];
    const csv = "\uFEFF" + columns.join(",") + "\r\n" + rows.results.map(r => columns.map(c => r[c]).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${encodeURIComponent(key)}-telemetry.csv"`, "Cache-Control": "no-store" } });
  }
  if (req.method === "POST" && resource === "tasks") {
    const input = await req.json() as Record<string, unknown>;
    const deviceId = text(input.deviceId, "设备");
    if (!await getRecord("devices", deviceId)) return json({ error: "请选择已登记设备。" }, 400);
    const data = { id: id("JW"), name: text(input.name, "任务名称", 60), area: text(input.area, "任务区域", 60), deviceId, status: "待执行", source: "manual", createdAt: now() };
    await db().batch([record("tasks", data), log("创建任务", data.name)]);
    return json(data, 201);
  }
  if (req.method === "POST" && resource === "devices") {
    const input = await req.json() as Record<string, unknown>;
    const data = { id: id("UAV"), name: text(input.name, "设备名称", 40), model: text(input.model, "设备型号", 60), status: "离线", battery: 0, createdAt: now() };
    await db().batch([record("devices", data), log("登记设备", data.name)]);
    return json(data, 201);
  }
  if (req.method === "PATCH" && ["tasks", "devices", "anomalies"].includes(resource)) {
    const kind = resource as Kind;
    const existing = await getRecord(kind, key);
    if (!existing) return json({ error: "记录不存在。" }, 404);
    const input = await req.json() as Record<string, unknown>;
    const allowed = kind === "tasks" ? ["待执行", "已完成", "待复核"] : kind === "devices" ? ["可用", "维护中", "离线"] : ["待复核", "已确认", "已排除"];
    existing.status = choice(input.status, allowed, "状态");
    if (kind === "anomalies") existing.note = text(input.note, "复核说明", 500);
    await db().batch([db().prepare("UPDATE records SET body=? WHERE id=? AND kind=?").bind(JSON.stringify(existing), key, kind), log(kind === "anomalies" ? "异常复核" : "更新状态", `${key} → ${existing.status}`)]);
    return json(existing);
  }
  if (req.method === "POST" && resource === "import") {
    const raw = await req.text();
    if (raw.length > 2_000_000) return json({ error: "文件过大。" }, 413);
    const input = JSON.parse(raw);
    const task = typeof input.taskId === "string" && await getRecord("tasks", input.taskId);
    if (!task) return json({ error: "请先选择有效任务。" }, 400);
    if ((await db().prepare("SELECT COUNT(*) AS n FROM telemetry WHERE task_id=?").bind(task.id).first<{n:number}>())!.n > 0) return json({ error: "该任务已有遥测，请新建独立任务后导入，避免混合来源。" }, 409);
    if (!Array.isArray(input.samples) || !input.samples.length || input.samples.length > 2000) return json({ error: "每次导入需为 1–2000 行。" }, 400);
    const samples = input.samples as Sample[];
    const ranges = { wind: [0, 100], direction: [0, 360], magnetic: [0, 1000], altitude: [-500, 20000], speed: [0, 300], lat: [-90, 90], lng: [-180, 180] };
    samples.forEach((s, i) => {
      if (!s || typeof s !== "object") throw new Error(`第 ${i + 2} 行格式错误。`);
      if (typeof s.timestamp !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s.timestamp) || !Number.isFinite(Date.parse(s.timestamp))) throw new Error(`第 ${i + 2} 行时间无效，需为带时区的 ISO 8601 格式。`);
      s.timestamp = new Date(s.timestamp).toISOString();
      for (const [key, [min, max]] of Object.entries(ranges)) {
        const v = s[key as keyof Sample];
        if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) throw new Error(`第 ${i + 2} 行 ${key} 超出有效范围。`);
      }
    });
    const dataset = { id: id("DS"), taskId: task.id, name: text(input.name, "文件名", 120), rows: samples.length, source: "import", createdAt: now() };
    task.source = "import"; task.status = "待复核";
    const statements = [db().prepare("INSERT INTO meta (key,value) VALUES (?,?)").bind(`import:${task.id}`, dataset.id), ...sampleStatements(task.id, samples, dataset.id)];
    statements.push(record("datasets", dataset), db().prepare("UPDATE records SET body=? WHERE id=? AND kind='tasks'").bind(JSON.stringify(task), task.id), log("导入遥测", `${dataset.name} · ${samples.length} 行 · ${task.name}`));
    await db().batch(statements);
    return json(dataset, 201);
  }
  return json({ error: "接口不存在或操作不支持。" }, 404);
}
async function handle(req: Request) {
  try { return await route(req); }
  catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "操作失败。";
    if (/^D1_|SQLITE|database|DB|数据库|binding/i.test(message)) return json({ error: "数据库暂不可用，请检查服务和迁移状态。" }, 503);
    return json({ error: message }, 400);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
