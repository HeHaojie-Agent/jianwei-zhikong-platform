// Integration smoke check for an isolated local preview. Creates explicitly named QA records.
import assert from 'node:assert/strict';
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173';
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw new Error('Checks only run against a local preview.');
let checks = 0;
async function call(path, method='GET', body, status=200, headers={}) {
  const r = await fetch(base+'/api/'+path, {method,headers:{'Content-Type':'application/json',...headers},...(body ? {body:JSON.stringify(body)} : {})});
  const raw = await r.text(); let result; try { result=JSON.parse(raw); } catch { result={error:raw}; }
  assert.equal(r.status,status,JSON.stringify(result)); checks++; return result;
}
const initial = await call('seed','POST');
const reseeded = await call('seed','POST');
assert.equal(initial.datasets.length,reseeded.datasets.length);
assert.equal(initial.tasks.length,reseeded.tasks.length);
await call('tasks','POST',{name:'',area:'天津',deviceId:'UAV-001'},400);
await call('tasks','POST',{name:'测试',area:'天津',deviceId:'missing'},400);
await call('tasks','POST',{name:'拒绝跨站',area:'天津',deviceId:'UAV-001'},403,{Origin:'https://untrusted.example'});
const device = await call('devices','POST',{name:'功能验收 · API设备',model:'测试型号'},201);
await call('devices/'+device.id,'PATCH',{status:'可用'});
const task = await call('tasks','POST',{name:'功能验收 · API任务',area:'天津 · 接口测试',deviceId:device.id},201);
const sample = {timestamp:'2026-10-19T01:00:00Z',wind:4.2,direction:135,magnetic:48.2,altitude:80,speed:4.8,lat:39.045,lng:117.708};
await call('import','POST',{taskId:task.id,name:'invalid.csv',samples:[{...sample,lat:100}]},400);
assert.equal((await call('telemetry/'+task.id)).length,0);
await call('import','POST',{taskId:task.id,name:'QA.csv',samples:[sample,{...sample,timestamp:'2026-10-19T01:00:03Z',wind:4.5}]},201);
const rows = await call('telemetry/'+task.id); assert.equal(rows.length,2); assert.equal(rows[1].wind,4.5);
await call('import','POST',{taskId:task.id,name:'duplicate.csv',samples:[sample]},409);
await call('import','POST',{taskId:'JW-20261019-01',name:'mix.csv',samples:[sample]},409);
await call('tasks/'+task.id,'PATCH',{status:'无效'},400);
await call('tasks/'+task.id,'PATCH',{status:'已完成'});
const event = initial.anomalies.find(x=>x.id==='EVT-001');
await call('anomalies/EVT-001','PATCH',{status:'已确认',note:'功能验收：检查后端持久化'});
let next = await call('state');
assert.equal(next.tasks.find(t=>t.id===task.id).source,'import');
assert.equal(next.tasks.find(t=>t.id===task.id).status,'已完成');
assert(next.audits.some(a=>a.action==='导入遥测'&&a.detail.includes('QA.csv')));
await call('anomalies/EVT-001','PATCH',{status:event.status,note:event.note});
const response = await fetch(base+'/api/export/'+task.id); assert.equal(response.status,200); assert((await response.text()).includes('timestamp,wind,direction,magnetic')); checks++;
console.log(JSON.stringify({passed:checks,task:task.id,device:device.id,coverage:['idempotent seed','validation','origin guard','device registration','task persistence','import transaction','source isolation','review audit','CSV export']}));
