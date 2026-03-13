
import { StageId, StageConfig } from './types';

export const STAGES: Record<StageId, StageConfig> = {
  BODY_STORAGE: { id: 'BODY_STORAGE', name: 'Body Storage', duration: 8, failureProb: 0.01, capacity: 10, x: 100, y: 80 },
  TRIM_1: { id: 'TRIM_1', name: 'TRIM 1', duration: 12, failureProb: 0.04, capacity: 5, x: 350, y: 80 },
  TRIM_2: { id: 'TRIM_2', name: 'TRIM 2', duration: 12, failureProb: 0.04, capacity: 5, x: 350, y: 180 },
  TRIM_3: { id: 'TRIM_3', name: 'TRIM 3', duration: 12, failureProb: 0.04, capacity: 5, x: 350, y: 280 },
  MGR: { id: 'MGR', name: 'MGR Montagem', duration: 25, failureProb: 0.08, capacity: 8, x: 700, y: 280 },
  FAI: { id: 'FAI', name: 'FAI QC Inspection', duration: 18, failureProb: 0.00, capacity: 4, x: 400, y: 500 },
  AREA_BRANCA: { id: 'AREA_BRANCA', name: 'Área Branca', duration: 15, failureProb: 0.02, capacity: 4, x: 650, y: 500 },
  WATER_TEST: { id: 'WATER_TEST', name: 'Teste de Água', duration: 20, failureProb: 0.05, capacity: 3, x: 850, y: 500 },
  NOISE_TEST: { id: 'NOISE_TEST', name: 'Teste de Ruído', duration: 15, failureProb: 0.03, capacity: 3, x: 1050, y: 500 },
  REPAIR: { id: 'REPAIR', name: 'Área de Reparo', duration: 35, failureProb: 0.02, capacity: 6, x: 400, y: 680 },
  SHIPPING: { id: 'SHIPPING', name: 'Embarque', duration: 10, failureProb: 0.00, capacity: 15, x: 1050, y: 680 },
  FINISHED: { id: 'FINISHED', name: 'Finalizado', duration: 0, failureProb: 0, capacity: 999, x: 1150, y: 680 }
};

export const FLOW: StageId[] = ['BODY_STORAGE', 'TRIM_1', 'TRIM_2', 'TRIM_3', 'MGR', 'FAI', 'AREA_BRANCA', 'WATER_TEST', 'NOISE_TEST', 'SHIPPING'];

export const SPAWN_RATE = 12; 
export const MAX_REPAIR_CYCLES = 2;
export const TIME_VARIATION = 0.15; // ±15%
