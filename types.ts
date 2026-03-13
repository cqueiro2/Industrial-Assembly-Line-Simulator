
export type StageId = 
  | 'BODY_STORAGE' 
  | 'TRIM_1' 
  | 'TRIM_2' 
  | 'TRIM_3' 
  | 'MGR' 
  | 'FAI' 
  | 'AREA_BRANCA' 
  | 'WATER_TEST' 
  | 'NOISE_TEST' 
  | 'REPAIR' 
  | 'SHIPPING' 
  | 'FINISHED';

export type VehicleState = 
  | 'Em_processo' 
  | 'Aguardando_inspeção' 
  | 'Aprovado' 
  | 'Reprovado' 
  | 'Em_reparo' 
  | 'Reparo_concluído';

export interface HistoryEntry {
  stage: StageId;
  state: VehicleState;
  timestamp: number;
  details?: string;
}

export interface Vehicle {
  id: string;
  currentStage: StageId;
  state: VehicleState;
  history: HistoryEntry[];
  repairCycles: number;
  entryTime: number;
  exitTime?: number;
  failureCount: number;
  processStartTime?: number;
  actualDuration?: number;
  color: string;
}

export interface StageConfig {
  id: StageId;
  name: string;
  duration: number;
  failureProb: number;
  capacity: number;
  x: number;
  y: number;
}

export interface Metrics {
  totalProduced: number;
  totalApproved: number;
  totalRejected: number;
  totalReworked: number;
  approvalRate: number;
  reworkRate: number;
  avgCycleTime: number;
  bottlenecks: Record<StageId, number>;
}

export interface SimulationState {
  veiculos: Vehicle[];
  metricas: Metrics;
  eventos: string[];
  currentTime: number;
}
