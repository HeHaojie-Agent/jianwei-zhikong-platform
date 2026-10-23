# 见微知空平台

飞控原生数据驱动的低空环境感知平台演示系统。React 19 + TypeScript 前端，Vinext 服务端，Cloudflare D1 数据库。详细操作见 [使用说明](./使用说明.md)。

## 运行

安装 Node.js >=22.13，双击 `启动平台.cmd`，或在项目目录执行：

```sh
node scripts/start-local.mjs
```

脚本在需要时安装依赖、构建配置、初始化本地数据库并启动开发服务。

工作台 `http://127.0.0.1:5173/`；后台 `http://127.0.0.1:5173/admin`。

已有依赖和数据库时，可以直接 `npm run dev`。生产构建为 `npm run build`，构建预览为 `npm start`。不要在公网暴露本地开发服务。

## 文件

- `app/platform.tsx`：前台与后台界面、任务联动、回放、导入与报告。
- `app/globals.css`：暗色视觉主题与手机适配。
- `app/refinements.css`：统一的视觉细化、页头、卡片、管理表格与报告样式。
- `public/fonts/`：界面用 Noto Sans SC 字体子集及 SIL Open Font License；新输入的其他汉字使用系统字体回退。
- `app/api/[...path]/route.ts`：接口、校验、数据导入与操作记录。
- `lib/demo.ts`：明确标注的合成场景与遥测。
- `lib/types.ts`：领域数据类型。
- `db/schema.ts`：数据库结构。
- `drizzle/`：SQL 迁移与结构快照。
- `.openai/hosting.json`：站点与数据库绑定，不含密钥。
- `scripts/check-api.mjs`：仅针对隔离本地环境的接口检查，会创建名称含“功能验收”的记录。

## 接口

```text
GET   /api/state                 任务、设备、事件、数据集、最近操作
POST  /api/seed                  幂等初始化演示场景
GET   /api/telemetry/:taskId     指定任务的时序遥测
POST  /api/tasks                 创建任务 {name,area,deviceId}
PATCH /api/tasks/:id             更新任务 {status}
POST  /api/devices               登记设备 {name,model}
PATCH /api/devices/:id           更新设备 {status}
PATCH /api/anomalies/:id         复核记录 {status,note}
POST  /api/import                导入 {taskId,name,samples:[...]}
GET   /api/export/:taskId        下载遥测 CSV
```

公开访客的所有 GET 接口只返回固定合成场景，不读取业务数据或操作日志。生产写操作验证 Sites 注入的登录身份及服务端 ADMIN_EMAIL 白名单，并校验 Origin。管理员白名单通过 Sites 运行时保密配置设置，不写入源码或浏览器。未配置时生产环境拒绝全部编辑；本地开发且仅 loopback 时允许编辑。操作日志在服务端保存，但未实现防篡改审计或团队分级权限。

每个任务导入一次，服务端事务与唯一导入标记防止并发混入。所有查询参数绑定，报告文本转义。CSV 导入最多 2000 行，前端文件限制 1 MB、后端请求限制 2 MB。批量插入每组 10 行，最多 100 个绑定参数。

## 迁移与验证

变更 `db/schema.ts` 后运行 `npm run db:generate`，检查新生成 SQL，按顺序应用新迁移；不得改写已应用迁移。初始化脚本只负责当前版本首次建库，后续升级需手工应用新迁移。

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_superb_warbird.sql
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-api.mjs
```

上面初始化 SQL 只在数据库尚未建表时执行一次。接口检查需要先启动本地服务，仅允许访问 loopback。线上数据库独立，由 Sites 发布流程应用迁移。

## 当前范围

已经实现前后端数据管理与可视化流程。示例是合成数据；导入列是已计算结果。尚未连接真实无人机、反演算法、自动识别模型、专业底图或团队分级权限，不能据此声称已完成实飞验证。
