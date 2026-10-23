export type Task = { id: string; name: string; area: string; deviceId: string; status: "待执行" | "已完成" | "待复核"; source: "demo" | "import" | "manual"; createdAt: string };
export type Device = { id: string; name: string; model: string; status: "可用" | "维护中" | "离线"; battery: number; createdAt: string };
export type Anomaly = { id: string; taskId: string; type: "磁场异常" | "风速关注"; level: "关注" | "较高"; status: "待复核" | "已确认" | "已排除"; reading: number; x: number; y: number; note: string; createdAt: string };
export type Sample = { id?: string; taskId?: string; timestamp: string; wind: number; direction: number; magnetic: number; altitude: number; speed: number; lat: number; lng: number };
export type Dataset = { id: string; taskId: string; name: string; rows: number; source: "demo" | "import"; createdAt: string };
export type Audit = { id: string; action: string; detail: string; createdAt: string };
export type State = { tasks: Task[]; devices: Device[]; anomalies: Anomaly[]; datasets: Dataset[]; audits: Audit[]; access?: { canEdit: boolean; signedIn: boolean } };
