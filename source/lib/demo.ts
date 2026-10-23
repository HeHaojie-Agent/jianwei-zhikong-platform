import type { State, Sample } from "./types";
const time = "2026-10-19T01:00:00.000Z";
export const demoState: State = {
  tasks: [
    { id: "JW-20261019-01", name: "滨海园区 · A 区巡检", area: "天津 · 滨海新区", deviceId: "UAV-001", status: "待复核", source: "demo", createdAt: time },
    { id: "JW-20261018-02", name: "海河沿线 · 风场采样", area: "天津 · 海河沿线", deviceId: "UAV-002", status: "已完成", source: "demo", createdAt: "2026-10-18T02:00:00.000Z" },
    { id: "JW-20261017-03", name: "科创园 · 航线验证", area: "天津 · 津南区", deviceId: "UAV-001", status: "已完成", source: "demo", createdAt: "2026-10-17T01:00:00.000Z" },
  ],
  devices: [
    { id: "UAV-001", name: "见微 01", model: "多旋翼 · 通用飞控", status: "可用", battery: 86, createdAt: time },
    { id: "UAV-002", name: "见微 02", model: "多旋翼 · 通用飞控", status: "可用", battery: 72, createdAt: time },
    { id: "UAV-003", name: "见微 03", model: "测试平台", status: "维护中", battery: 35, createdAt: time },
  ],
  anomalies: [
    { id: "EVT-001", taskId: "JW-20261019-01", type: "磁场异常", level: "较高", status: "待复核", reading: 11.8, x: 66, y: 44, note: "模拟磁场偏差聚集，建议使用专业仪器复测。", createdAt: "2026-10-19T01:08:20Z" },
    { id: "EVT-002", taskId: "JW-20261019-01", type: "风速关注", level: "关注", status: "待复核", reading: 7.6, x: 40, y: 30, note: "示例关注点，建议结合机型限制评估航线。", createdAt: "2026-10-19T01:05:40Z" },
    { id: "EVT-003", taskId: "JW-20261019-01", type: "磁场异常", level: "关注", status: "已排除", reading: 5.2, x: 31, y: 64, note: "演示复核：示例机体干扰。", createdAt: "2026-10-19T01:03:30Z" },
    { id: "EVT-004", taskId: "JW-20261018-02", type: "风速关注", level: "关注", status: "已确认", reading: 6.5, x: 55, y: 45, note: "演示记录：保留观察。", createdAt: "2026-10-18T02:05:00Z" },
  ],
  datasets: [
    { id: "DS-DEMO-01", taskId: "JW-20261019-01", name: "滨海 A 区 · 合成遥测", rows: 240, source: "demo", createdAt: time },
    { id: "DS-DEMO-02", taskId: "JW-20261018-02", name: "海河沿线 · 合成遥测", rows: 240, source: "demo", createdAt: time },
    { id: "DS-DEMO-03", taskId: "JW-20261017-03", name: "科创园 · 合成遥测", rows: 240, source: "demo", createdAt: time },
  ], audits: [],
};
export function demoSamples(taskIndex: number): Sample[] {
  const start = Date.parse(demoState.tasks[taskIndex].createdAt);
  return Array.from({ length: 240 }, (_, i) => ({
    timestamp: new Date(start + i * 3000).toISOString(),
    wind: +(4.4 + Math.sin(i / 22 + taskIndex) * 1.5 + Math.sin(i / 4) * .35 + (i > 112 && i < 135 ? 1.1 : 0)).toFixed(2),
    direction: +(120 + Math.sin(i / 35) * 30 + taskIndex * 12).toFixed(1),
    magnetic: +(48.2 + Math.sin(i / 9) * .8 + (i > 152 && i < 177 ? Math.sin((i - 152) / 25 * Math.PI) * 11.8 : 0)).toFixed(2),
    altitude: +(78 + Math.sin(i / 32) * 4).toFixed(1), speed: +(4.8 + Math.sin(i / 18) * .6).toFixed(1),
    lat: +(39.045 + (i / 240) * .006).toFixed(6), lng: +(117.708 + Math.sin(i / 45) * .004).toFixed(6),
  }));
}
