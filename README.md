# 见微知空 · 低空环境感知平台

> 用飞控已有的 IMU、磁力计、位置、姿态与动力状态数据，做风场估计与磁场异常初筛，把每一次飞行沉淀为可追溯的低空环境记录。

**公开演示（免登录、只读）：** <https://hehaojie-agent.github.io/jianwei-zhikong-platform/>

**源代码仓库：** <https://github.com/HeHaojie-Agent/jianwei-zhikong-platform>

[![License: MIT](https://img.shields.io/badge/License-MIT-2ea44f.svg)](./LICENSE)

---

## 项目简介

见微知空是一套面向低空环境感知的演示系统，包含：

- **感知工作台**：感知总览、风场分析、磁场初筛三个监测界面，飞行轨迹回放与风速/磁场趋势联动。
- **业务与数据**：任务管理、设备管理、数据中心（CSV 模板下载、导入校验、遥测导出）、报告中心（导出 HTML 报告，可打印为 PDF）。
- **平台管理**：操作记录、关注事件复核、数据口径说明。
- **服务端**：接口、持久化数据库（Cloudflare D1 / Drizzle ORM）与访问控制。

公开访客无需登录即可浏览固定合成演示；写操作需要项目管理员身份。

## 在线演示

| 入口 | 说明 |
| --- | --- |
| `/`（index.html） | 公开演示站，纯静态、免登录、只读 |
| `/about.html` | 项目说明：能力范围、数据边界、开源许可 |
| `/admin` | 管理后台，仅完整工程部署时可用 |

> 演示中的任务、设备、遥测与关注点均为**合成数据**，仅用于功能展示。

## 目录结构

```
.
├─ site/                   # 公开演示站（纯静态，可直接托管）
│  ├─ index.html           # 演示首页（单文件，内嵌样式/字体/数据）
│  ├─ about.html           # 项目说明页
│  ├─ 404.html             # 404 兜底页
│  ├─ favicon.svg
│  └─ assets/              # 界面预览图
├─ source/                 # 完整工程（前端 + 服务端 + 数据库迁移）
│  ├─ app/                 # 页面与接口（platform.tsx 为工作台主界面）
│  ├─ db/  drizzle/        # 表结构与迁移
│  ├─ lib/                 # 数据契约、演示数据、访问控制
│  ├─ scripts/             # 启动与校验脚本
│  └─ 启动平台.cmd          # Windows 一键启动
├─ licenses/               # 第三方组件许可原文
├─ LICENSE                 # MIT
└─ 部署指南.md              # 各平台发布步骤
```

## 本地运行完整工程

需要 Node.js **22.13+**，首次安装依赖需要网络。

```bash
cd source
npm install
npm run build
npm start          # 打开 http://127.0.0.1:5173/
```

Windows 用户也可以直接双击 `source/启动平台.cmd`。

首次启动会初始化 3 项任务、3 台设备、720 条合成遥测与 4 条示例关注记录。线上与本地数据库相互独立。

## 发布公开演示站

静态演示站不依赖任何后端，`site/` 目录即可托管。仓库已配置 GitHub Actions：推送 `main` 且改动 `site/` 时自动发布到 GitHub Pages。

手动托管到其他平台（国内访问更快）时：

1. 打开 [EdgeOne Pages](https://edgeone.ai/zh/pages)（腾讯，免费、国内访问快），新建项目 → 选择「直接上传」；
2. 把 `site/` 里的全部文件拖进去（**保证 `index.html` 在根目录**），点击部署；
3. 复制生成的 `*.edgeone.app` 链接，就是可公开访问的演示地址。

其他平台（Gitee Pages、腾讯云 COS、阿里云 OSS、Cloudflare Pages、GitHub Pages）的步骤见 [部署指南.md](./部署指南.md)。

## 数据与能力边界

本项目当前是**可运行的演示系统**，不是已部署的生产系统：

- 演示数据为合成数据，不代表真实试飞规模、训练数据量或实测精度。
- 尚未连接真实飞控、机型动力学标定、风场反演模型、磁干扰补偿算法或自动异常识别模型；仓库不含模型权重与真实实验数据集。
- 工作台地图为园区空间示意，不能导航；示例风矢量不代表实测风场。
- 导入 CSV 的风速、风向须为已计算值，导入后不自动生成异常记录；无关注点不等于“检测正常”。
- 磁场初筛不等同射频、电场测量或完整电磁兼容认证；设备“可用”为手工标记，不代表飞控在线。
- 平台不发送起飞或飞控指令，不替代飞手决策或专业仪器复测。
- 公开访客只能读取固定合成演示，管理员上传的业务数据与日志不会公开。

## CSV 导入格式

```csv
timestamp,wind,direction,magnetic,altitude,speed,lat,lng
2026-10-19T01:00:00Z,4.2,135,48.2,80,4.8,39.045,117.708
```

单次最多 2000 行、文件小于 1 MB；一个任务只能导入一次，避免来源混合。字段范围：

| 字段 | 含义 | 范围 |
| --- | --- | --- |
| timestamp | 带时区的 ISO 8601 时间 | — |
| wind | 风速 m/s | 0–100 |
| direction | 风向（气象来向角，0° 为北，顺时针） | 0–360 |
| magnetic | 磁场强度 μT | 0–1000 |
| altitude | 相对高度 m | -500–20000 |
| speed | 地速 m/s | 0–300 |
| lat / lng | WGS84 纬度 / 经度 | -90–90 / -180–180 |

## 许可

本项目自有代码以 **MIT License** 发布，可自由使用、修改与再分发，请保留版权声明。第三方组件：

| 组件 | 许可 |
| --- | --- |
| React / React DOM | MIT |
| lucide-react 图标 | ISC |
| Tailwind CSS | MIT |
| Noto Sans SC 字体 | SIL Open Font License 1.1 |

完整许可文本见 [`licenses/`](./licenses)。

## 致谢

界面基于 React 19、Tailwind CSS 4 与 shadcn/ui 生态；演示站为单文件静态构建，可离线打开。
