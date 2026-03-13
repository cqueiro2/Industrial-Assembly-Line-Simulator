
export interface Point {
  x: number;
  y: number;
}

export enum StationType {
  STORAGE = 'STORAGE',
  ASSEMBLY = 'ASSEMBLY',
  MGR = 'MGR',
  TEST = 'TEST',
  QUALITY = 'QUALITY',
  REPAIR = 'REPAIR',
  SHIPPING = 'SHIPPING',
  PRE_DELIVERY = 'PRE_DELIVERY'
}

export type FailurePriority = 'P1' | 'P2' | 'P3' | 'P4';
export type FailureType = 'ELECTRICAL' | 'ELECTRONIC' | 'MECHANICAL' | 'LEAKAGE';
export type QualityStatus = 'NONE' | 'PASS' | 'FAIL';
export type RollTestStep = 'READY' | 'ECATS' | 'ACCEL' | 'BRAKE' | 'DONE';
export type AndonStatus = 'GREEN' | 'YELLOW' | 'RED';

export interface Station {
  id: string;
  name: string;
  pos: Point;
  wait: number; 
  type: StationType;
  width?: number;
  height?: number;
  isBroken?: boolean;
}

export interface Vehicle {
  id: string;
  pos: Point;
  rotation: number;
  pathIdx: number;
  targetPath: Point[];
  waitingTimer: number;
  hasDefect: boolean;
  color: string;
  baseColor: string;
  isLocked: boolean;
  failureType: FailureType | null;
  priority: FailurePriority | null;
  entryBufferTime: number | null; // Timestamp de entrada no buffer
  currentLeadTime: number;
  
  viaVerde: boolean; 
  rollTestStatus: QualityStatus;
  waterTestStatus: QualityStatus;
  preDeliveryStatus: QualityStatus;
  
  needsH2ORetesting: boolean;
  readyForOffloading: boolean;
  inRepair: boolean;
  assignedCabinId: string | null;
  rollStep: RollTestStep;
  hasPassedFAI: boolean;
}

export interface SimulationStats {
  produced: number;
  defects: number;
  active: number;
  totalStarted: number;
  passedFirstTime: number; 
  ftrSuccesses: number;    
  repairCompletedCount: number;
  categoryVolumes: Record<FailureType, number>;
  rollTestProcessed: number;
  andon: AndonStatus;
  currentTakt: number;
  targetTakt: number;
}
