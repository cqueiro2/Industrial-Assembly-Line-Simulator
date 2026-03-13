
import { Station, StationType, Point } from './types';

export const SIM_WIDTH = 1250;
export const SIM_HEIGHT = 900;

export const COLORS = {
  BG: '#1e293b',
  CONVEYOR: '#334155',
  STATION: '#475569',
  STATION_BORDER: '#64748b',
  VEHICLE: '#3b82f6',
  REPAIR: '#ef4444',
  PROGRESS: '#22c55e',
  WHEEL: '#0f172a',
  TEXT: '#f8fafc',
  YELLOW_PATH: '#fbbf24'
};

export const FORK_POINT_IDX = 13; 
export const MERGE_POINT_IDX = 14;

export const MAIN_PATH_POINTS: Point[] = [
  { x: 50, y: 80 },    // 0 Start
  { x: 250, y: 80 },   // 1 Body Storage
  { x: 450, y: 80 },   // 2 TRIM 1
  { x: 850, y: 80 },   // 3 Turn 1
  { x: 850, y: 180 },  // 4 Down 1
  { x: 650, y: 180 },  // 5 TRIM 2
  { x: 200, y: 180 },  // 6 Turn 2
  { x: 200, y: 280 },  // 7 Down 2
  { x: 400, y: 280 },  // 8 TRIM 3
  { x: 1050, y: 280 }, // 9 MGR Montagem
  { x: 1050, y: 420 }, // 10 Turn to Row 4
  { x: 750, y: 420 },  // 11 Flat Top
  { x: 550, y: 420 },  // 12 Abastecimento
  { x: 450, y: 420 },  // 13 FORK START
  { x: 150, y: 420 },  // 14 MERGE END
  { x: 150, y: 520 },  // 15 Reparo Elétrico
  { x: 150, y: 620 },  // 16 Turn down to FAI QC
  { x: 400, y: 620 },  // 17 FAI QC
  { x: 650, y: 620 },  // 18 Area Branca
  { x: 650, y: 750 },  // 19 Down to Water Row
  { x: 850, y: 750 },  // 20 Sistema Água
  { x: 1050, y: 750 }, // 21 Ruído
  { x: 1150, y: 750 }, // 22 Pre-Shipment Gate
  { x: 1150, y: 850 }  // 23 Embarque (Final Shipping)
];

export const ROLL_TEST_BRANCHES: Point[][] = [
  [{ x: 450, y: 420 }, { x: 450, y: 340 }, { x: 300, y: 340 }, { x: 150, y: 340 }, { x: 150, y: 420 }],
  [{ x: 450, y: 420 }, { x: 300, y: 420 }, { x: 150, y: 420 }],
  [{ x: 450, y: 420 }, { x: 450, y: 500 }, { x: 300, y: 500 }, { x: 150, y: 500 }, { x: 150, y: 420 }]
];

// Refined Repair Navigation
export const REPAIR_PATH_POINTS: Point[] = [
  { x: 400, y: 620 }, // 0 ENTRY
  { x: 400, y: 720 }, // 1 JUNCTION 1
  { x: 250, y: 720 }, // 2 MECHANICAL CELL
  { x: 250, y: 820 }, // 3 LEAKAGE CELL
  { x: 450, y: 820 }, // 4 ELECTRICAL CELL
  { x: 650, y: 820 }, // 5 RETURN PATH
  { x: 650, y: 620 }  // 6 BACK TO MAIN
];

export const STATIONS: Record<number, Station> = {
  1: { id: 's1', name: 'Body Storage', pos: MAIN_PATH_POINTS[1], wait: 0, type: StationType.STORAGE },
  2: { id: 's2', name: 'TRIM 1', pos: MAIN_PATH_POINTS[2], wait: 60, type: StationType.ASSEMBLY },
  5: { id: 's3', name: 'TRIM 2', pos: MAIN_PATH_POINTS[5], wait: 60, type: StationType.ASSEMBLY },
  8: { id: 's4', name: 'TRIM 3', pos: MAIN_PATH_POINTS[8], wait: 60, type: StationType.ASSEMBLY },
  9: { id: 's5', name: 'MGR Montagem', pos: MAIN_PATH_POINTS[9], wait: 120, type: StationType.MGR },
  11: { id: 's6', name: 'Flat Top', pos: MAIN_PATH_POINTS[11], wait: 100, type: StationType.QUALITY },
  12: { id: 's7', name: 'Abastecimento', pos: MAIN_PATH_POINTS[12], wait: 60, type: StationType.ASSEMBLY },
  15: { id: 's8', name: 'Reparo Elétrico', pos: MAIN_PATH_POINTS[15], wait: 90, type: StationType.REPAIR, width: 140 },
  17: { id: 's11', name: 'FAI QC', pos: MAIN_PATH_POINTS[17], wait: 110, type: StationType.QUALITY },
  18: { id: 's12', name: 'ÁREA BRANCA', pos: MAIN_PATH_POINTS[18], wait: 60, type: StationType.ASSEMBLY },
  20: { id: 's13', name: 'SISTEMA ÁGUA', pos: MAIN_PATH_POINTS[20], wait: 150, type: StationType.TEST, width: 180, height: 70 },
  21: { id: 's14', name: 'SISTEMA RUÍDO', pos: MAIN_PATH_POINTS[21], wait: 120, type: StationType.TEST, width: 140, height: 60 },
  23: { id: 's15', name: 'EMBARQUE', pos: MAIN_PATH_POINTS[23], wait: 100, type: StationType.SHIPPING, width: 180 }
};

export const PARALLEL_ROLL_STATIONS: Station[] = [
  { id: 'pr1', name: 'Teste Rolo 1', pos: { x: 300, y: 340 }, wait: 110, type: StationType.TEST },
  { id: 'pr2', name: 'Teste Rolo 2', pos: { x: 300, y: 420 }, wait: 110, type: StationType.TEST },
  { id: 'pr3', name: 'Teste Rolo 3', pos: { x: 300, y: 500 }, wait: 110, type: StationType.TEST }
];

export const REPAIR_STATIONS: Record<string, Station> = {
  'MECHANICAL': { id: 'r_mec', name: 'MECHANICAL REPAIR', pos: REPAIR_PATH_POINTS[2], wait: 150, type: StationType.REPAIR, width: 150 },
  'LEAKAGE': { id: 'r_leak', name: 'LEAKAGE REPAIR', pos: REPAIR_PATH_POINTS[3], wait: 200, type: StationType.REPAIR, width: 150 },
  'ELECTRICAL': { id: 'r_elec', name: 'ELECTRICAL REPAIR', pos: REPAIR_PATH_POINTS[4], wait: 150, type: StationType.REPAIR, width: 150 },
  'ELECTRONIC': { id: 'r_elec_v2', name: 'ELECTRONIC REPAIR', pos: REPAIR_PATH_POINTS[4], wait: 150, type: StationType.REPAIR, width: 150 }
};
