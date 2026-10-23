import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
function run(args, capture=false) {
  const r = spawnSync(process.execPath, args, {cwd:root,encoding:'utf8',stdio:capture?'pipe':'inherit'});
  if(r.error) throw r.error;
  if(r.status!==0) { if(capture) console.error(r.stderr); throw new Error('操作失败，请查看上方提示。'); }
  return r.stdout || '';
}
if (!existsSync('node_modules/vinext/dist/cli.js')) {
  const npm = path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
  if(!existsSync(npm)) throw new Error('请安装完整的 Node.js 与 npm。');
  console.log('首次运行，正在安装依赖…');
  run([npm,'--prefix','.', '--workspaces=false','run','install:ci']);
}
if(!existsSync('dist/server/wrangler.json')) {
  console.log('正在准备本地服务…'); run(['scripts/run-framework.mjs','build']);
}
const wrangler=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state'];
const output=run([...wrangler,'--command',"SELECT name FROM sqlite_master WHERE type='table' AND name='meta'",'--json'],true);
if(!output.includes('"meta"')) {
  console.log('正在初始化本地数据库…');
  const migrations=readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort();
  for(const file of migrations) run([...wrangler,'--file',path.join('drizzle',file)]);
}
console.log('\n见微知空平台正在启动\n工作台：http://127.0.0.1:5173/\n管理后台：http://127.0.0.1:5173/admin\n');
run(['scripts/run-framework.mjs','dev']);
