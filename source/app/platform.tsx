"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, Battery, Bell, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Compass, Database, FileBarChart2, FileText, Gauge, Layers3, LayoutDashboard, Magnet, MapPin, Menu, Navigation, Pause, Plane, Play, Plus, Radar, Radio, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, Upload, Users, Wind, X, ZoomIn, ZoomOut } from "lucide-react";
import type { Anomaly, Device, Sample, State, Task } from "@/lib/types";

type View = "overview" | "wind" | "magnetic" | "tasks" | "devices" | "data" | "reports" | "logs" | "about";
const meta: Record<View, [string, string]> = {
  overview: ["感知总览", "从飞行数据，看见低空环境"], wind: ["风场分析", "复用飞行状态，呈现风速与风向估计"], magnetic: ["磁场初筛", "发现疑似异常，辅助安排专业复测"],
  tasks: ["任务管理", "组织巡检任务，追踪执行与复核进度"], devices: ["设备管理", "统一登记飞行平台与接入状态"], data: ["数据中心", "管理任务数据，保留清晰的数据来源"],
  reports: ["报告中心", "让每一次飞行都有据可查"], logs: ["操作记录", "追踪任务、数据与异常复核的变更"], about: ["平台说明", "感知能力、数据定义与使用边界"],
};
const emptyState: State = { tasks: [], devices: [], anomalies: [], datasets: [], audits: [] };
const date = (s?: string) => s ? new Date(s).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "—";
const clock = (s?: string) => s ? new Date(s).toLocaleTimeString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) : "—";
const avg = (items: Sample[], key: keyof Sample) => items.length ? items.reduce((a, b) => a + Number(b[key]), 0) / items.length : 0;
const sourceName = (s: string) => s === "demo" ? "模拟数据" : s === "import" ? "文件导入" : "待接入";
async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}), cache: "no-store" });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "请求失败，请重试。");
  return result;
}
function download(name: string, contents: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: string }) { return <span className={`pill ${tone}`}><i />{children}</span>; }
function Status({ value }: { value: string }) { return <Pill tone={value === "较高" ? "red" : ["待复核", "维护中", "关注"].includes(value) ? "amber" : ["可用", "已完成", "已确认"].includes(value) ? "green" : "gray"}>{value}</Pill>; }
function Empty({ text = "暂无数据", children }: { text?: string; children?: React.ReactNode }) { return <div className="empty"><Database size={32} /><strong>{text}</strong>{children}</div>; }

function Trend({ data, field, color = "#4c9dff", unit }: { data: Sample[]; field: "wind" | "magnetic"; color?: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <Empty text="该任务尚无遥测数据" />;
  const width = 620, height = 160, left = 40, right = 16, top = 18, bottom = 28;
  const values = data.map(x => x[field]);
  const low = field === "wind" ? 0 : Math.max(0, Math.floor(Math.min(...values) / 5) * 5 - 2);
  const high = field === "wind" ? Math.max(10, Math.ceil(Math.max(...values) / 2) * 2) : Math.ceil(Math.max(...values) / 5) * 5 + 2;
  const w = width - left - right, h = height - top - bottom;
  const point = (i: number) => [left + (i / Math.max(1, data.length - 1)) * w, top + h - (data[i][field] - low) / (high - low) * h];
  const path = data.map((_, i) => { const [x, y] = point(i); return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ");
  const gradient = `fill-${field}`;
  return <div className="chart" onMouseLeave={() => setHover(null)}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${field === "wind" ? "风速估计" : "磁场强度"}时序曲线，单位 ${unit}`} onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - r.left) / r.width * width - left) / w * (data.length - 1))))); }}>
      <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".27" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3].map(i => <g key={i}><line x1={left} y1={top + h * i / 3} x2={width - right} y2={top + h * i / 3} stroke="#263344" strokeDasharray="3 5" /><text x={left - 9} y={top + h * i / 3 + 4} textAnchor="end">{(high - (high - low) * i / 3).toFixed(0)}</text></g>)}
      <path d={`${path} L${left + w},${top + h} L${left},${top + h} Z`} fill={`url(#${gradient})`} /><path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
      {[0, .25, .5, .75, 1].map(f => <text key={f} x={left + w * f} y={height - 6} textAnchor={f === 1 ? "end" : f === 0 ? "start" : "middle"}>{clock(data[Math.round((data.length - 1) * f)].timestamp).slice(0, 5)}</text>)}
      {hover !== null && <g><line x1={point(hover)[0]} x2={point(hover)[0]} y1={top} y2={top + h} stroke={color} strokeDasharray="3 3" /><circle cx={point(hover)[0]} cy={point(hover)[1]} r="4" fill={color} stroke="#fff" /></g>}
    </svg>
    {hover !== null && <span className="chart-tooltip">{clock(data[hover].timestamp)} · {data[hover][field].toFixed(2)} {unit}</span>}
    {field === "magnetic" && <small className="chart-note">纵轴局部范围，便于观察波动</small>}
  </div>;
}

function FlightMap({ task, data, index, events, selected, onSelect, mode }: { task?: Task; data: Sample[]; index: number; events: Anomaly[]; selected?: string; onSelect: (e: Anomaly) => void; mode: View }) {
  const [wind, setWind] = useState(true), [mag, setMag] = useState(true), [track, setTrack] = useState(true), [zoom, setZoom] = useState(1);
  const demo = task?.source === "demo";
  const route = useMemo(() => {
    if (demo) return Array.from({ length: data.length }, (_, i) => {
      const t = i / Math.max(1, data.length - 1);
      return [180 + t * 510, 338 - Math.sin(t * Math.PI * 3) * 80 - t * 150];
    });
    const lat = data.map(s => s.lat), lng = data.map(s => s.lng);
    const minLat = Math.min(...lat), maxLat = Math.max(...lat), minLng = Math.min(...lng), maxLng = Math.max(...lng);
    return data.map(s => [120 + (s.lng - minLng) / (maxLng - minLng || 1) * 620, 390 - (s.lat - minLat) / (maxLat - minLat || 1) * 280]);
  }, [data, demo]);
  const pos = route[Math.min(index, route.length - 1)] || [390, 260];
  const path = route.slice(0, index + 1).map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  return <div className="map-panel panel">
    <div className="map-heading"><div><MapPin size={16} /><strong>{mode === "wind" ? "风场空间示意" : mode === "magnetic" ? "磁场关注区域" : "任务空间视图"}</strong><span className="muted">/ {task?.area || "未选择区域"}</span></div><Pill tone="blue">{demo ? "演示场景" : "轨迹投影"}</Pill></div>
    <div className="map-body">
      <svg className="map-svg" viewBox="0 0 860 485" role="img" aria-label={demo ? "园区示意图、模拟轨迹和模拟环境关注点" : "导入遥测经纬度的局部平面投影"}>
        <defs><pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#223848" strokeWidth=".5" /></pattern><radialGradient id="heat-red"><stop offset="0" stopColor="#ff684a" stopOpacity=".5" /><stop offset=".45" stopColor="#ef784d" stopOpacity=".2" /><stop offset="1" stopColor="#ff684a" stopOpacity="0" /></radialGradient><radialGradient id="heat-blue"><stop offset="0" stopColor="#41c4e8" stopOpacity=".2" /><stop offset="1" stopColor="#41c4e8" stopOpacity="0" /></radialGradient></defs>
        <rect width="860" height="485" fill="#101d28" /><rect width="860" height="485" fill="url(#map-grid)" />
        <g transform={`translate(${430 - 430 * zoom},${242 - 242 * zoom}) scale(${zoom})`}>
          {demo && <g>
            <path d="M-40 395 Q150 285 260 320 T500 305 T900 230" stroke="#173b4a" strokeWidth="66" fill="none" /><path d="M-40 395 Q150 285 260 320 T500 305 T900 230" stroke="#235563" strokeWidth="1" fill="none" />
            <path d="M50 20 L780 475 M-10 155 L760 15 M140 490 L440 -20 M490 500 L720 -20 M-20 460 L900 82" stroke="#293946" strokeWidth="17" fill="none" /><path d="M50 20 L780 475 M-10 155 L760 15 M140 490 L440 -20 M490 500 L720 -20 M-20 460 L900 82" stroke="#3a4d59" strokeWidth="1" strokeDasharray="8 9" fill="none" />
            {Array.from({ length: 48 }, (_, i) => { const x = 40 + i % 9 * 94, y = 36 + Math.floor(i / 9) * 78; return <g key={i} transform={`translate(${x},${y}) rotate(-18)`}><rect width={i % 3 === 0 ? 55 : 38} height={i % 4 === 0 ? 37 : 24} rx="2" fill={i % 3 ? "#243744" : "#294451"} stroke="#39505c" strokeWidth="1" /><path d={`M3 3 H${i % 3 === 0 ? 52 : 35}`} stroke="#4c6470" opacity=".65" /></g>; })}
            <text x="155" y="122" className="map-place">科 创 园 A 区</text><text x="625" y="385" className="map-place">产 业 园 B 区</text><text x="365" y="322" className="map-place river">生 态 水 系</text>
          </g>}
          {wind && demo && Array.from({ length: 66 }, (_, i) => <g key={i} transform={`translate(${50 + (i % 11) * 76},${44 + Math.floor(i / 11) * 77}) rotate(${112 + Math.sin(i) * 24})`} opacity={.15 + (i % 4) * .09}><path d="M-11 0H11 M4 -5L11 0L4 5" stroke="#6bc7da" strokeWidth="1.5" fill="none" /></g>)}
          {mag && events.filter(e => e.type === "磁场异常" && e.status !== "已排除").map(e => <circle key={e.id} cx={e.x * 8.6} cy={e.y * 4.85} r="98" fill="url(#heat-red)" />)}
          {demo && <ellipse cx="370" cy="200" rx="205" ry="120" fill="url(#heat-blue)" />}
          {track && route.length > 0 && <><path d={route.map((p, i) => `${i ? "L" : "M"}${p.join(",")}`).join(" ")} fill="none" stroke="#439594" strokeWidth="1.8" strokeDasharray="5 6" opacity=".6" /><path d={path} fill="none" stroke="#56e2d1" strokeWidth="2.5" /><circle cx={route[0][0]} cy={route[0][1]} r="7" fill="#153a36" stroke="#5ce7bd" strokeWidth="2" /><text x={route[0][0] - 12} y={route[0][1] + 28} className="map-label">起点</text></>}
          {events.map((e, i) => <g key={e.id} tabIndex={0} role="button" aria-label={`查看${e.type} ${e.id}`} onClick={() => onSelect(e)} onKeyDown={k => { if (k.key === "Enter") onSelect(e); }} className="map-event" transform={`translate(${e.x * 8.6},${e.y * 4.85})`}>
            <circle r={selected === e.id ? "21" : "16"} fill={e.type === "磁场异常" ? "#4b2923" : "#453d24"} stroke={e.type === "磁场异常" ? "#ff926b" : "#e8bc66"} strokeWidth="1.3" /><text y="5" textAnchor="middle" fill={e.type === "磁场异常" ? "#ffb796" : "#f4d58d"} fontSize="13">{i + 1}</text>
          </g>)}
          {data.length > 0 && <g pointerEvents="none" transform={`translate(${pos[0]},${pos[1]})`}><circle r="25" fill="#389def" fillOpacity=".13" stroke="#64bbff" strokeOpacity=".4" /><circle r="11" fill="#4ca9ff" stroke="#d7f0ff" strokeWidth="2" /><path d="M0 -6 L4 5 L0 3 L-4 5 Z" fill="white" /><rect x="28" y="-20" width="126" height="34" rx="5" fill="#142331" stroke="#34516b" /><text x="40" y="1" fill="#dceaff" fontSize="12">{task?.deviceId}</text></g>}
        </g>
      </svg>
      <div className="map-location"><i className="live-dot" />{task?.name || "选择任务以查看轨迹"}<small>{demo ? "园区底图为空间示意，不用于导航" : "WGS84 坐标局部归一化投影"}</small></div>
      <div className="map-compass"><span>N</span><Navigation size={22} /></div>
      <div className="map-controls"><button title="放大地图" aria-label="放大地图" onClick={() => setZoom(z => Math.min(2, z + .25))}><ZoomIn size={17} /></button><button title="缩小地图" aria-label="缩小地图" onClick={() => setZoom(z => Math.max(1, z - .25))}><ZoomOut size={17} /></button></div>
      <div className="map-layers"><Layers3 size={14} />{[["风场", wind, setWind], ["磁场", mag, setMag], ["轨迹", track, setTrack]].map(([label, active, setter]) => <button key={label as string} className={active ? "active" : ""} onClick={() => (setter as (v: boolean) => void)(!active)}>{label as string}</button>)}</div>
      <div className="map-key"><span><i className="cyan-dot" />飞行轨迹</span><span><i className="orange-dot" />磁场关注点</span><span><i className="amber-dot" />风速关注点</span></div>
      {!data.length && <div className="map-empty">暂无轨迹，导入遥测后即可查看</div>}
    </div>
    <div className="map-footer"><span><ShieldCheck size={13} />只读分析 · 不向飞控发送指令</span><span>{demo ? "空间风矢量为演示示意" : "仅展示导入坐标，未加载地理底图"}</span></div>
  </div>;
}

export default function Platform({ initialView }: { initialView: View }) {
  const [view, setView] = useState<View>(initialView), [state, setState] = useState<State>(emptyState), [taskId, setTaskId] = useState("");
  const [samples, setSamples] = useState<Sample[]>([]), [loading, setLoading] = useState(true), [sampleLoading, setSampleLoading] = useState(false), [error, setError] = useState("");
  const [toast, setToast] = useState(""), [query, setQuery] = useState(""), [filter, setFilter] = useState("全部状态"), [menuOpen, setMenuOpen] = useState(false);
  const [index, setIndex] = useState(165), [playing, setPlaying] = useState(false), [modal, setModal] = useState<"task" | "device" | "import" | "review" | null>(null), [selected, setSelected] = useState<Anomaly | null>(null), [busy, setBusy] = useState(false), [formError, setFormError] = useState("");
  const [file, setFile] = useState<File | null>(null), [parsed, setParsed] = useState<Sample[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const task = state.tasks.find(t => t.id === taskId), events = state.anomalies.filter(e => e.taskId === taskId);
  const device = state.devices.find(d => d.id === task?.deviceId);
  const current = samples[Math.min(index, samples.length - 1)], visibleSamples = samples.slice(0, index + 1);
  const monitor = ["overview", "wind", "magnetic"].includes(view);
  const canEdit = state.access?.canEdit === true;
  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(""), 4500); };
  const refresh = useCallback(async (seed = false) => {
    let next = await api<State>("state");
    if (seed && next.access?.canEdit && !next.tasks.length) next = await api<State>("seed", "POST");
    setState(next); setTaskId(old => old || next.tasks[0]?.id || ""); return next;
  }, []);
  useEffect(() => { refresh(true).catch(e => setError(e.message)).finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => {
    if (!taskId) return;
    let cancelled = false; setPlaying(false); setSampleLoading(true); setSamples([]);
    api<Sample[]>(`telemetry/${taskId}`).then(data => { if (!cancelled) { setSamples(data); setIndex(Math.min(165, data.length - 1)); } }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setSampleLoading(false); });
    return () => { cancelled = true; };
  }, [taskId, state.datasets.length]);
  useEffect(() => {
    if (!playing || !samples.length) return;
    const interval = setInterval(() => setIndex(i => { if (i >= samples.length - 1) { setPlaying(false); return i; } return i + 1; }), 300);
    return () => clearInterval(interval);
  }, [playing, samples.length]);
  useEffect(() => {
    if (!modal) return;
    const originalFocus = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setModal(null);
      if (e.key === "Tab") {
        const focusable = Array.from(document.querySelectorAll<HTMLElement>('.modal button:not([disabled]),.modal input:not([disabled]),.modal select:not([disabled]),.modal textarea:not([disabled])'));
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    const timer = setTimeout(() => formRef.current?.querySelector<HTMLElement>("input,select,textarea")?.focus(), 50);
    return () => { document.removeEventListener("keydown", handler); clearTimeout(timer); document.body.style.overflow = oldOverflow; originalFocus?.focus(); };
  }, [modal, busy]);
  function go(next: View) { setView(next); setQuery(""); setFilter("全部状态"); setMenuOpen(false); }
  function openModal(type: typeof modal) { if (!canEdit && type !== "review") { notify("只读演示，编辑操作请先登录管理员账号"); return; } setModal(type); setFormError(""); setFile(null); setParsed([]); }
  function review(e: Anomaly) { setSelected(e); openModal("review"); }
  async function mutate(path: string, method: string, data: unknown, message: string) {
    if (!canEdit) { notify("只读演示，无法修改数据"); return; }
    try { await api(path, method, data); await refresh(); notify(message); } catch (e) { notify((e as Error).message); }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!canEdit) return; setBusy(true); setFormError("");
    const values = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      if (modal === "task") { const created = await api<Task>("tasks", "POST", values); setTaskId(created.id); }
      if (modal === "device") await api("devices", "POST", values);
      if (modal === "review" && selected) await api(`anomalies/${selected.id}`, "PATCH", values);
      if (modal === "import") { if (!file || !parsed.length) throw new Error("请选择有效 CSV 文件。"); await api("import", "POST", { taskId: values.taskId, name: file.name, samples: parsed }); setTaskId(values.taskId as string); }
      await refresh(); setModal(null); notify(modal === "review" ? "复核结果已保存，操作记录已更新" : modal === "import" ? "数据导入成功，可返回监测界面查看" : "记录已保存");
    } catch (e) { setFormError((e as Error).message); } finally { setBusy(false); }
  }
  async function readFile(f?: File) {
    setFile(null); setParsed([]); setFormError(""); if (!f) return;
    try {
      if (f.size > 1_000_000) throw new Error("文件需小于 1 MB，最多 2000 行。");
      const lines = (await f.text()).replace(/^\uFEFF/, "").trim().split(/\r?\n/);
      const headers = lines[0].split(",").map(x => x.trim());
      const columns = ["timestamp", "wind", "direction", "magnetic", "altitude", "speed", "lat", "lng"];
      if (!columns.every(x => headers.includes(x))) throw new Error("缺少必要列，请先下载模板并使用相同列名。");
      if (lines.length < 2 || lines.length > 2001) throw new Error("CSV 需要包含 1–2000 行数据。");
      const rows = lines.slice(1).map((line, i) => { const cells = line.split(","); const row: Record<string, string | number> = {}; columns.forEach(c => { const raw = cells[headers.indexOf(c)]?.trim(); if (!raw) throw new Error(`第 ${i + 2} 行 ${c} 为空。`); row[c] = c === "timestamp" ? raw : Number(raw); }); return row as unknown as Sample; });
      setFile(f); setParsed(rows);
    } catch (e) { setFormError((e as Error).message); }
  }
  function template() { download("见微知空_遥测导入模板.csv", "\uFEFFtimestamp,wind,direction,magnetic,altitude,speed,lat,lng\r\n2026-10-19T01:00:00Z,4.2,135,48.2,80,4.8,39.045,117.708\r\n2026-10-19T01:00:03Z,4.5,138,48.6,81,4.9,39.0451,117.7081\r\n2026-10-19T01:00:06Z,4.3,137,48.4,80,4.8,39.0452,117.7082", "text/csv;charset=utf-8"); }
  function exportReport() {
    if (!task || !samples.length) return;
    const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>见微知空任务报告</title><style>body{font:16px/1.8 'SimSun',serif;max-width:850px;margin:50px auto;color:#17283b;padding:25px}h1{color:#165ba4}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #cdd8e3;padding:10px}small{color:#667}button{padding:10px 25px}@media print{button{display:none}}</style><h1>见微知空 · 任务分析报告</h1><p>${esc(task.name)} / ${esc(task.id)}</p><p>数据来源：${sourceName(task.source)}。${task.source === "demo" ? "本报告使用合成数据，仅用于功能演示，不构成实测结论。" : "结果基于用户导入的已计算遥测；来源与标定由数据提供方确认。"}</p><p>区域：${esc(task.area)}　设备：${esc(task.deviceId)}<br>时间：${esc(date(samples[0].timestamp))} — ${esc(date(samples[samples.length - 1].timestamp))}<br>记录数：${samples.length}　平均风速：${avg(samples, "wind").toFixed(2)} m/s　最大风速：${Math.max(...samples.map(s => s.wind)).toFixed(2)} m/s<br>平均磁场：${avg(samples, "magnetic").toFixed(2)} μT　异常记录：${events.length}</p><h2>关注点与复核记录</h2><table><tr><th>编号</th><th>类型</th><th>状态</th><th>记录说明</th></tr>${events.map(e => `<tr><td>${esc(e.id)}</td><td>${esc(e.type)}</td><td>${esc(e.status)}</td><td>${esc(e.note)}</td></tr>`).join("") || "<tr><td colspan='4'>该任务无已登记关注点；不代表自动检测结果为零。</td></tr>"}</table><h2>使用说明</h2><p>风速、风向为估计或导入值，需按机型和工况标定验证。磁场异常用于初筛与复测排序，不等同射频、电场测量或完整电磁兼容认证。本系统只读分析，不控制无人机，不替代飞手决策。导入数据暂不自动运行项目反演或异常识别模型。</p><small>生成时间：${esc(new Date().toLocaleString("zh-CN"))}</small><p><button onclick="window.print()">打印 / 保存为 PDF</button></p></html>`;
    download(`${task.id}_分析报告.html`, html, "text/html;charset=utf-8"); notify("报告已下载，打开后可打印或保存为 PDF");
  }
  const filteredTasks = state.tasks.filter(t => `${t.name}${t.id}${t.area}`.toLowerCase().includes(query.toLowerCase()) && (filter === "全部状态" || t.status === filter));
  const totalRows = state.datasets.reduce((n, x) => n + x.rows, 0), pending = state.anomalies.filter(x => x.status === "待复核").length;
  const nav = (v: View, Icon: typeof Activity) => <button key={v} className={`nav-item ${view === v ? "active" : ""}`} onClick={() => go(v)}><Icon size={18} /><span>{meta[v][0]}</span>{v === "magnetic" && pending > 0 ? <b>{pending}</b> : v === view ? <span className="nav-mark" /> : null}</button>;

  return <div className={`app ${monitor ? "monitor-workspace" : "admin-workspace"} ${menuOpen ? "menu-open" : ""}`}>
    {menuOpen && <button className="mobile-overlay" aria-label="关闭导航" onClick={() => setMenuOpen(false)} />}
    <aside className="sidebar"><a className="brand" href="/"><span className="brand-icon"><Radar size={27} /></span><div><strong>见微知空</strong><small>JIANWEI ZHIKONG</small></div></a><div className="workspace-label"><span className="workspace-dot" />低空环境感知平台<span className="version">V1.0</span></div>
      <div className="nav-group-label">感知工作台</div><nav>{nav("overview", LayoutDashboard)}{nav("wind", Wind)}{nav("magnetic", Magnet)}</nav>
      <div className="nav-group-label">业务与数据</div><nav>{nav("tasks", ClipboardList)}{nav("devices", Plane)}{nav("data", Database)}{nav("reports", FileBarChart2)}</nav>
      <div className="nav-group-label">平台管理</div><nav>{canEdit && nav("logs", Activity)}{nav("about", CircleHelp)}</nav>
      <div className="sidebar-bottom"><div className="connection"><span className="live-dot" /><span>演示环境</span><small>DEMO</small></div><p>飞控原生数据 · 软件感知</p><div className="profile"><span className="avatar">见</span><div><strong>项目工作空间</strong><small>{canEdit ? "管理员 · 可编辑" : "公开演示 · 只读访客"}</small></div><ShieldCheck size={16} /></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="打开导航" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><span>{monitor ? "感知工作台" : "管理控制台"}</span><ChevronRight size={14} /><strong>{meta[view][0]}</strong></div><div className="topbar-right"><span className="demo-badge"><i />演示模式</span><button className="icon-button" title="待复核异常" aria-label="查看待复核异常" onClick={() => { go("magnetic"); }}><Bell size={18} />{pending > 0 && <b className="notification-dot" />}</button><span className="topbar-divider" />{canEdit ? <button className="console-switch" onClick={() => go(monitor ? "tasks" : "overview")}>{monitor ? <Settings2 size={15} /> : <LayoutDashboard size={15} />}{monitor ? "管理后台" : "监测工作台"}<ArrowUpRight size={14} /></button> : <a className="console-switch" href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top"><ShieldCheck size={15} />管理员登录<ArrowUpRight size={14} /></a>}</div></header>
      <main><div className="page-intro"><div className="intro-copy"><div className="eyebrow"><span />{monitor ? "ENVIRONMENT INTELLIGENCE" : "WORKSPACE MANAGEMENT"}</div><h1>{meta[view][0]}<span className="title-dot" /></h1><p>{meta[view][1]}</p><div className="intro-tags"><span><Wind size={12} />风场估计</span><span><Magnet size={12} />磁场初筛</span><span><ShieldCheck size={12} />原生数据感知</span></div></div><MissionOrbit /><div className="intro-actions">{monitor ? <><button className="btn" disabled={!samples.length} onClick={exportReport}><ArrowDownToLine size={15} />导出任务报告</button><button className="btn primary" disabled={!canEdit} title={canEdit ? undefined : "仅管理员可编辑"} onClick={() => openModal("task")}><Plus size={16} />新建任务</button></> : view === "tasks" ? <button className="btn primary" disabled={!canEdit} title={canEdit ? undefined : "仅管理员可编辑"} onClick={() => openModal("task")}><Plus size={16} />新建任务</button> : view === "devices" ? <button className="btn primary" disabled={!canEdit} title={canEdit ? undefined : "仅管理员可编辑"} onClick={() => openModal("device")}><Plus size={16} />登记设备</button> : view === "data" ? <button className="btn primary" disabled={!canEdit} title={canEdit ? undefined : "仅管理员可编辑"} onClick={() => openModal("import")}><Upload size={16} />导入数据</button> : <button className="btn" onClick={() => refresh().then(() => notify("数据已刷新")).catch(e => notify(e.message))}><RefreshCw size={15} />刷新数据</button>}</div></div>
      <div className="demo-notice"><Radio size={14} /><span>{canEdit ? "管理工作空间" : "公开演示 · 只读"}</span><p>{canEdit ? "仅管理员可查看业务数据并编辑。示例遥测为合成数据，当前未连接真实飞控或反演模型。" : "无需登录即可浏览合成演示数据。可回放、切换任务及导出报告；不公开管理员上传的业务数据。"}</p><button onClick={() => go("about")}>了解数据口径<ArrowRight size={13} /></button></div>
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => { setError(""); setLoading(true); refresh(true).catch(e => setError(e.message)).finally(() => setLoading(false)); }}>重新连接</button></div>}
      {loading ? <div className="loading-state"><Radar size={40} /><h2>正在连接感知工作空间</h2><p>准备任务、设备与演示遥测…</p></div> : <>
      {monitor && <>
        <div className="context-bar"><div className="task-select"><ClipboardList size={16} /><label htmlFor="active-task">当前任务</label><select id="active-task" value={taskId} onChange={e => setTaskId(e.target.value)}>{state.tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="context-meta"><span><Plane size={14} />{task?.deviceId || "—"}</span><span><MapPin size={14} />{task?.area || "—"}</span><Status value={task?.status || "待执行"} /></div></div>
        <div className="metric-grid"><Metric label="当前风速估计" value={current?.wind.toFixed(2)} unit="m/s" Icon={Wind} color="blue" detail={`任务均值 ${samples.length ? avg(samples, "wind").toFixed(2) : "—"} m/s`} tag={sourceName(task?.source || "manual")} series={visibleSamples.map(s => s.wind)} /><Metric label="当前磁场强度" value={current?.magnetic.toFixed(2)} unit="μT" Icon={Magnet} color="purple" detail="机载磁力计通道 · 初筛参考" tag={sourceName(task?.source || "manual")} series={visibleSamples.map(s => s.magnetic)} /><Metric label="待复核关注点" value={String(events.filter(x => x.status === "待复核").length)} unit="处" Icon={ShieldCheck} color="amber" detail={`${events.filter(x => x.type === "磁场异常").length} 处磁场 · ${events.filter(x => x.type === "风速关注").length} 处风速`} tag="当前任务" /><Metric label="任务数据记录" value={samples.length.toLocaleString()} unit="条" Icon={Database} color="cyan" detail={samples.length ? `${date(samples[0].timestamp)} 起` : "暂无接入数据"} tag={sampleLoading ? "加载中" : "已存储"} /></div>
        <div className="monitor-grid"><div className="map-column"><FlightMap task={task} data={samples} index={index} events={events} selected={selected?.id} onSelect={review} mode={view} />
          <div className="playback panel"><button className="play-button" aria-label={playing ? "暂停回放" : "播放回放"} disabled={!samples.length} onClick={() => { if (index >= samples.length - 1) setIndex(0); setPlaying(!playing); }}>{playing ? <Pause size={16} /> : <Play size={16} />}</button><div className="playback-name"><strong>任务回放</strong><small>{task?.source === "demo" ? "模拟遥测" : "导入遥测"}</small></div><span className="playback-time">{clock(current?.timestamp)}</span><input type="range" aria-label="回放进度" min={0} max={Math.max(0, samples.length - 1)} value={Math.max(0, index)} disabled={!samples.length} onChange={e => setIndex(Number(e.target.value))} /><span className="playback-end">{clock(samples[samples.length - 1]?.timestamp)}</span><span className="speed-label">10×</span></div>
        </div><aside className="right-column"><section className="panel vehicle-card"><div className="section-heading"><h2><Plane size={16} />飞行状态</h2><Pill tone="blue">回放帧</Pill></div><div className="vehicle-title"><span className="vehicle-icon"><Plane size={27} /></span><div><strong>{device?.name || "未登记设备"}</strong><small>{device?.model || task?.deviceId}</small></div><Battery size={22} className="green-text" /></div><div className="flight-stats"><div><small>相对高度</small><strong>{current?.altitude.toFixed(1) || "—"}<em>m</em></strong></div><div><small>地速</small><strong>{current?.speed.toFixed(1) || "—"}<em>m/s</em></strong></div><div><small>风向估计</small><strong>{current?.direction.toFixed(0) || "—"}<em>°</em></strong></div><div><small>记录时间</small><strong className="time-value">{clock(current?.timestamp)}</strong></div></div><div className="coordinate-line"><Navigation size={12} />{current ? `${current.lng.toFixed(5)}° E / ${current.lat.toFixed(5)}° N` : "等待遥测数据"}</div></section>
          <section className="panel events-card"><div className="section-heading"><h2><Radio size={16} />关注事件</h2><span className="count">{events.length}</span></div>{events.length ? <div className="event-list">{events.slice(0, 3).map((e, i) => <button key={e.id} className="event-row" onClick={() => review(e)}><span className={`event-symbol ${e.type === "磁场异常" ? "red" : "amber"}`}>{e.type === "磁场异常" ? <Magnet size={16} /> : <Wind size={16} />}</span><div><strong>{e.type}<small>#{String(i + 1).padStart(2, "0")}</small></strong><span>{clock(e.createdAt)} · {e.status}</span></div><ChevronRight size={15} /></button>)}</div> : <Empty text="暂无已登记关注点"><small>导入数据暂不自动识别异常</small></Empty>}<button className="text-button events-more" onClick={() => go("magnetic")}>查看异常复核列表<ArrowRight size={14} /></button></section>
        </aside></div>
        <div className="chart-grid"><section className="panel"><div className="section-heading"><h2><Wind size={16} />风速估计趋势</h2><span className="chart-legend"><i style={{ background: "#4c9dff" }} />风速 · m/s</span></div><Trend data={visibleSamples} field="wind" unit="m/s" /></section><section className="panel"><div className="section-heading"><h2><Magnet size={16} />磁场强度趋势</h2><span className="chart-legend"><i style={{ background: "#a48bff" }} />磁场 · μT</span></div><Trend data={visibleSamples} field="magnetic" color="#a48bff" unit="μT" /></section></div>
        {view !== "overview" && <section className="panel detail-panel"><div className="section-heading"><h2>{view === "wind" ? "风场任务摘要" : "异常复核列表"}</h2><span className="muted">{task?.name}</span></div>{view === "wind" ? <div className="analysis-summary"><div><span>任务平均风速</span><strong>{samples.length ? avg(samples, "wind").toFixed(2) : "—"} <small>m/s</small></strong></div><div><span>任务最大风速</span><strong>{samples.length ? Math.max(...samples.map(s => s.wind)).toFixed(2) : "—"} <small>m/s</small></strong></div><p>风向采用气象来向角，0° 为北、顺时针增加。当前曲线为合成或导入值；真实风场反演需接入经标定的机型动力学与估计模型，并与参考仪器验证。</p></div> : <div className="table-scroll"><table><thead><tr><th>事件编号</th><th>类型</th><th>关注等级</th><th>读数</th><th>状态</th><th>操作</th></tr></thead><tbody>{events.map(e => <tr key={e.id}><td className="mono">{e.id}</td><td>{e.type}</td><td><Status value={e.level} /></td><td>{e.reading} {e.type === "磁场异常" ? "μT 偏差" : "m/s"}</td><td><Status value={e.status} /></td><td><button className="text-button" onClick={() => review(e)}>复核记录<ArrowUpRight size={13} /></button></td></tr>)}</tbody></table>{!events.length && <Empty text="暂无关注点" />}</div>}</section>}
      </>}
      {!monitor && <>
        <div className="admin-stats"><AdminStat label="任务总数" value={state.tasks.length} note="已登记任务" Icon={ClipboardList} /><AdminStat label="设备总数" value={state.devices.length} note={`${state.devices.filter(d => d.status === "可用").length} 台标记可用`} Icon={Plane} /><AdminStat label="数据记录" value={totalRows} note="含模拟与导入，来源独立" Icon={Database} /><AdminStat label="待复核事件" value={pending} note="覆盖全部任务" Icon={ShieldCheck} /></div>
        {view === "tasks" && <section className="panel admin-panel"><div className="table-toolbar"><div><h2>飞行任务</h2><span>{state.tasks.length} 项任务</span></div><div className="table-filters"><div className="search-box"><Search size={15} /><input placeholder="搜索任务名称、编号或区域" aria-label="搜索任务" value={query} onChange={e => setQuery(e.target.value)} /></div><select aria-label="按任务状态筛选" value={filter} onChange={e => setFilter(e.target.value)}>{["全部状态", "待执行", "待复核", "已完成"].map(s => <option key={s}>{s}</option>)}</select></div></div><div className="table-scroll"><table><thead><tr><th>任务名称 / 编号</th><th>任务区域</th><th>关联设备</th><th>数据来源</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>{filteredTasks.map(t => <tr key={t.id}><td><strong>{t.name}</strong><small className="mono">{t.id}</small></td><td>{t.area}</td><td className="mono">{t.deviceId}</td><td><Pill tone={t.source === "demo" ? "blue" : "gray"}>{sourceName(t.source)}</Pill></td><td><select className="status-select" disabled={!canEdit} aria-label={`更新${t.name}状态`} value={t.status} onChange={e => mutate(`tasks/${t.id}`, "PATCH", { status: e.target.value }, "任务状态已更新")}>{["待执行", "待复核", "已完成"].map(x => <option key={x}>{x}</option>)}</select></td><td>{date(t.createdAt)}</td><td><button className="text-button" onClick={() => { setTaskId(t.id); go("overview"); }}>查看分析<ArrowUpRight size={13} /></button></td></tr>)}</tbody></table>{!filteredTasks.length && <Empty text="没有匹配的任务" />}</div><div className="table-footer"><span>共 {filteredTasks.length} 项 · 状态修改会保留操作记录</span><span>只读分析，不下发飞行指令</span></div></section>}
        {view === "devices" && <div className="device-grid">{state.devices.map(d => <section className="panel device-card" key={d.id}><div className="device-card-top"><span className="device-large-icon"><Plane size={30} /></span><Status value={d.status} /></div><h2>{d.name}</h2><p>{d.model}</p><div className="device-info"><span>设备编号<strong className="mono">{d.id}</strong></span><span>关联任务<strong>{state.tasks.filter(t => t.deviceId === d.id).length} 项</strong></span><span>接入方式<strong>未连接 · 手工登记</strong></span></div><label>维护状态<select disabled={!canEdit} aria-label={`${d.name}维护状态`} value={d.status} onChange={e => mutate(`devices/${d.id}`, "PATCH", { status: e.target.value }, "设备状态已更新")}>{["可用", "维护中", "离线"].map(s => <option key={s}>{s}</option>)}</select></label><small className="device-note">可用为管理标记，不代表飞控在线或适航判断。</small></section>)}</div>}
        {view === "data" && <><section className="panel data-import-card"><span className="import-icon"><Database size={28} /></span><div><h2>让飞行数据成为可追溯的环境记录</h2><p>导入包含风速、风向、磁场强度与位置的 CSV。每个任务独立存储一种来源，避免与演示数据混合。</p></div><button className="btn" onClick={template}><ArrowDownToLine size={15} />下载 CSV 模板</button></section><section className="panel admin-panel"><div className="table-toolbar"><div><h2>数据集</h2><span>共 {totalRows.toLocaleString()} 条遥测</span></div><span className="muted">导入值为已计算结果，不自动执行反演</span></div><div className="table-scroll"><table><thead><tr><th>数据集</th><th>关联任务</th><th>来源</th><th>记录数</th><th>入库时间</th><th>操作</th></tr></thead><tbody>{state.datasets.map(d => <tr key={d.id}><td><div className="table-file"><FileText size={18} /><strong>{d.name}</strong></div></td><td>{state.tasks.find(t => t.id === d.taskId)?.name || d.taskId}</td><td><Pill tone={d.source === "demo" ? "blue" : "green"}>{sourceName(d.source)}</Pill></td><td className="mono">{d.rows.toLocaleString()}</td><td>{date(d.createdAt)}</td><td><a className="text-button" href={`/api/export/${d.taskId}`} download><ArrowDownToLine size={13} />下载 CSV</a></td></tr>)}</tbody></table></div><div className="table-footer">数据规模仅统计当前平台记录，不代表项目累计试飞或模型训练规模。</div></section></>}
        {view === "reports" && <section className="panel admin-panel"><div className="table-toolbar"><div><h2>任务分析报告</h2><span>选择任务预览，导出完整报告</span></div><select aria-label="报告任务" value={taskId} onChange={e => setTaskId(e.target.value)}>{state.tasks.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></div><div className="report-preview"><div className="report-top"><div><span>JIANWEI ZHIKONG / FLIGHT REPORT</span><h2>低空环境感知任务报告</h2><p>{task?.name}</p></div><FileBarChart2 size={48} /></div><div className="report-info"><span>任务编号<strong>{task?.id}</strong></span><span>数据来源<strong>{sourceName(task?.source || "manual")}</strong></span><span>记录数量<strong>{samples.length} 条</strong></span><span>任务区域<strong>{task?.area}</strong></span></div><h3>任务摘要</h3><p>平均风速 {samples.length ? avg(samples, "wind").toFixed(2) : "—"} m/s；平均磁场 {samples.length ? avg(samples, "magnetic").toFixed(2) : "—"} μT。当前登记 {events.length} 处关注点，其中 {events.filter(e => e.status === "待复核").length} 处待复核。</p><div className="report-disclaimer">{task?.source === "demo" ? "本报告使用合成数据，仅用于展示平台流程。" : "本报告基于导入遥测，数据来源、精度与标定需另行验证。"}磁场结果用于初筛；无关注点记录不代表已完成自动检测或安全认证。</div><button className="btn primary" disabled={!samples.length || sampleLoading} onClick={exportReport}><ArrowDownToLine size={15} />导出报告 · 可打印为 PDF</button></div></section>}
        {view === "logs" && <section className="panel admin-panel"><div className="table-toolbar"><div><h2>最近操作记录</h2><span>最多展示最近 80 条</span></div><Pill tone="green">服务端持久化</Pill></div><div className="table-scroll"><table><thead><tr><th>操作时间</th><th>操作类型</th><th>记录内容</th><th>记录编号</th></tr></thead><tbody>{state.audits.map(a => <tr key={a.id}><td>{date(a.createdAt)}</td><td><Pill tone="blue">{a.action}</Pill></td><td>{a.detail}</td><td className="mono muted">{a.id}</td></tr>)}</tbody></table></div></section>}
        {view === "about" && <div className="about-grid"><section className="panel about-card"><Wind size={26} className="blue-text" /><h2>风场估计</h2><p>复用飞控原生 IMU、位置、姿态、地速与动力状态，经机型标定后估计风速、风向。在经过验证的工况下，减少专用测风载荷的需求。</p><small>界面已具备接入与呈现能力；当前未集成真实反演模型。</small></section><section className="panel about-card"><Magnet size={26} className="purple-text" /><h2>磁场异常初筛</h2><p>基于已有机载磁力计数据，结合机体与动力干扰补偿识别疑似异常区域，辅助安排复测。不能等同于射频、电场测量或完整 EMC 认证。</p><small>保留原有传感器，不为基础初筛新增专用探测载荷。</small></section><section className="panel about-card"><Database size={26} className="cyan-text" /><h2>数据与单位</h2><p>风速 m/s；风向为气象来向角（0° 北，顺时针）；磁场强度 μT；高度 m；地速 m/s；位置为 WGS84 经纬度；存储时间为 ISO 8601，界面使用北京时间。</p><small>模拟、导入、待接入分别标记。导入字段需是已计算结果。</small></section><section className="panel about-card"><ShieldCheck size={26} className="green-text" /><h2>使用与访问</h2><p>本平台支持通过链接公开查看合成演示数据。真实任务、导入数据与操作记录仅对项目管理员开放；编辑功能需使用管理员账号登录，尚未实现团队分级权限或真实飞控接入。</p><small>用于辅助分析，不替代飞手决策与专业仪器复测。</small></section></div>}
      </>}
      <footer className="page-footer"><span><Radar size={13} />见微知空 · 让原生数据产生新的感知价值</span><span>平台演示版 / V1.0</span></footer>
      </>}
      </main></div>
      {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}<button aria-label="关闭提示" onClick={() => setToast("")}><X size={15} /></button></div>}
      {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setModal(null); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><span className="eyebrow">WORKSPACE / {modal.toUpperCase()}</span><h2 id="modal-title">{modal === "task" ? "新建飞行任务" : modal === "device" ? "登记飞行设备" : modal === "import" ? "导入任务遥测" : "关注事件复核"}</h2></div><button className="icon-button" disabled={busy} aria-label="关闭弹窗" onClick={() => setModal(null)}><X size={20} /></button></div><form ref={formRef} onSubmit={submit}>
        {modal === "task" && <><label>任务名称<input name="name" placeholder="例如：滨海园区 · B 区巡检" required maxLength={60} /></label><label>任务区域<input name="area" placeholder="例如：天津 · 滨海新区" required maxLength={60} /></label><label>关联设备<select name="deviceId" required>{state.devices.map(d => <option key={d.id} value={d.id}>{d.name} / {d.id}</option>)}</select></label><div className="form-hint"><ShieldCheck size={16} />创建用于组织数据与分析的任务记录，不会触发无人机起飞。</div></>}
        {modal === "device" && <><label>设备名称<input name="name" placeholder="例如：见微 04" required maxLength={40} /></label><label>设备型号<input name="model" placeholder="例如：多旋翼 · 通用飞控" required maxLength={60} /></label><div className="form-hint">设备登记后默认为离线状态。真实遥测接入需另外配置飞控接口。</div></>}
        {modal === "review" && selected && <><div className="review-summary"><span className={`event-symbol ${selected.type === "磁场异常" ? "red" : "amber"}`}>{selected.type === "磁场异常" ? <Magnet size={22} /> : <Wind size={22} />}</span><div><h3>{selected.type} / {selected.id}</h3><p>{selected.reading} {selected.type === "磁场异常" ? "μT 偏差（模拟基线）" : "m/s"} · {date(selected.createdAt)}</p></div><Status value={selected.level} /></div><label>复核状态<select name="status" disabled={!canEdit} defaultValue={selected.status}>{["待复核", "已确认", "已排除"].map(s => <option key={s}>{s}</option>)}</select></label><label>复核说明<textarea name="note" readOnly={!canEdit} defaultValue={selected.note} rows={4} maxLength={500} required placeholder="记录现场检查、参考仪器与处理意见" /></label><div className="form-hint">确认表示保留该关注记录，不代表专业安全认证或风险结论。</div></>}
        {modal === "import" && <><label>导入到任务<select name="taskId" defaultValue={state.tasks.find(t => !state.datasets.some(d => d.taskId === t.id))?.id || ""} required><option value="" disabled>选择无数据的任务</option>{state.tasks.filter(t => !state.datasets.some(d => d.taskId === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><div className="form-hint">每个任务独立保存一种数据来源。若没有空任务，请先新建任务。</div><label className="upload-zone"><Upload size={26} /><strong>{file ? file.name : "选择 CSV 文件"}</strong><span>{file ? `已解析 ${parsed.length} 条记录，提交时校验字段范围` : "最多 2000 行 · 小于 1 MB · UTF-8"}</span><input type="file" accept=".csv,text/csv" aria-label="选择 CSV 文件" onChange={e => readFile(e.target.files?.[0])} /></label><button className="text-button" type="button" onClick={template}><ArrowDownToLine size={14} />下载带示例的 CSV 模板</button><p className="import-units">列：timestamp、wind（m/s）、direction（°）、magnetic（μT）、altitude（m）、speed（m/s）、lat、lng。风速、风向为已计算值；本导入不运行反演或异常识别模型。</p></>}
        {formError && <div className="form-error" role="alert">{formError}</div>}<div className="modal-actions"><button className="btn" type="button" disabled={busy} onClick={() => setModal(null)}>取消</button><button className="btn primary" type="submit" disabled={busy || !canEdit || modal === "import" && !parsed.length}>{busy ? <RefreshCw size={15} className="spinning" /> : <Check size={15} />}{busy ? "正在保存" : modal === "import" ? "校验并导入" : "保存记录"}</button></div>
      </form></section></div>}
  </div>;
}

function Metric({ label, value, unit, Icon, color, detail, tag, series }: { label: string; value?: string; unit: string; Icon: typeof Activity; color: string; detail: string; tag: string; series?: number[] }) {
  const values = series?.filter((_, i) => i % Math.max(1, Math.floor(series.length / 36)) === 0).slice(-36) || [];
  const min = Math.min(...values), max = Math.max(...values);
  const points = values.map((v, i) => `${i * 100 / Math.max(1, values.length - 1)},${34 - (v - min) / (max - min || 1) * 27}`).join(" ");
  return <section className={`panel metric ${color}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={19} /></span></div><div className="metric-value">{value || "—"}<small>{unit}</small><span>{tag}</span></div>{values.length > 1 && <svg className="metric-sparkline" viewBox="0 0 100 40" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}<div className="metric-bottom"><span>{detail}</span><span className="metric-dot" /></div></section>;
}
function MissionOrbit() {
  return <div className="mission-orbit" aria-hidden="true"><svg viewBox="0 0 390 170"><defs><radialGradient id="orbit-light"><stop stopColor="#40c5df" stopOpacity=".12" /><stop offset="1" stopColor="#40c5df" stopOpacity="0" /></radialGradient></defs><ellipse cx="220" cy="84" rx="170" ry="85" fill="url(#orbit-light)" /><g fill="none" stroke="#54a6ca"><ellipse cx="220" cy="92" rx="141" ry="49" opacity=".18" /><ellipse cx="220" cy="92" rx="109" ry="37" opacity=".27" /><ellipse cx="220" cy="92" rx="74" ry="25" opacity=".4" /><path d="M70 93H368 M220 28V152" opacity=".17" strokeDasharray="3 6" /><path d="M115 126 Q176 3 323 61" stroke="#67dccc" opacity=".7" strokeDasharray="3 6" /><path d="M137 70 L220 91 L308 70 M220 91V124" opacity=".6" /></g><g transform="translate(220 69)" fill="none" stroke="#9bd6e9" strokeWidth="1.5"><path d="M-28 -8L28 8M-28 8L28 -8M0 -15V15" /><ellipse cx="-28" cy="-8" rx="14" ry="5" /><ellipse cx="28" cy="8" rx="14" ry="5" /><ellipse cx="-28" cy="8" rx="14" ry="5" /><ellipse cx="28" cy="-8" rx="14" ry="5" /><path d="M-5 -5H5V5H-5Z" fill="#183e55" /></g><circle cx="310" cy="69" r="3" fill="#63d8c7" /><circle cx="140" cy="118" r="3" fill="#63a9ff" /><circle cx="310" cy="69" r="9" fill="none" stroke="#63d8c7" opacity=".25" /><text x="248" y="149" fill="#54788e" fontSize="7" letterSpacing="2">NATIVE DATA · NEW SENSE</text></svg></div>;
}
function AdminStat({ label, value, note, Icon }: { label: string; value: number; note: string; Icon: typeof Activity }) { return <section className="panel admin-stat"><span className="admin-stat-icon"><Icon size={21} /></span><div><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{note}</small></div></section>; }
