
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Wrench, 
  History, 
  BarChart3, 
  LayoutDashboard, 
  FileJson,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Settings2,
  Clock,
  Factory,
  Truck,
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { STAGES, FLOW, SPAWN_RATE, MAX_REPAIR_CYCLES, TIME_VARIATION } from './constants';
import { Vehicle, StageId, VehicleState, Metrics, SimulationState, HistoryEntry } from './types';

const VEHICLE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#f8fafc'];

const App: React.FC = () => {
  const [simState, setSimState] = useState<SimulationState>({
    veiculos: [],
    metricas: {
      totalProduced: 0,
      totalApproved: 0,
      totalRejected: 0,
      totalReworked: 0,
      approvalRate: 0,
      reworkRate: 0,
      avgCycleTime: 0,
      bottlenecks: {
        STAMPING: 0, WELDING: 0, PAINTING: 0, ASSEMBLY: 0, INSPECTION: 0, REPAIR: 0, YARD: 0, FINISHED: 0
      }
    },
    eventos: [],
    currentTime: 0
  });

  const [isRunning, setIsRunning] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'vehicles' | 'json'>('dashboard');
  const [simSpeed, setSimSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const simInterval = useRef<NodeJS.Timeout | null>(null);

  const generateId = () => `VIN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const getRandomDuration = (base: number) => {
    const variation = base * TIME_VARIATION;
    return base + (Math.random() * variation * 2 - variation);
  };

  const createVehicle = useCallback((): Vehicle => {
    const id = generateId();
    const color = VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
    const duration = getRandomDuration(STAGES.BODY_STORAGE.duration);
    const entry: HistoryEntry = {
      stage: 'BODY_STORAGE',
      state: 'Em_processo',
      timestamp: Date.now()
    };
    return {
      id,
      currentStage: 'BODY_STORAGE',
      state: 'Em_processo',
      history: [entry],
      repairCycles: 0,
      entryTime: Date.now(),
      failureCount: 0,
      processStartTime: Date.now(),
      actualDuration: duration,
      color
    };
  }, []);

  const updateMetrics = (veiculos: Vehicle[]) => {
    const finished = veiculos.filter(v => v.currentStage === 'FINISHED');
    const totalProduced = finished.length;
    const totalApproved = finished.filter(v => v.state === 'Aprovado').length;
    const totalRejected = finished.filter(v => v.state === 'Reprovado').length;
    const totalReworked = veiculos.filter(v => v.repairCycles > 0).length;

    const approvalRate = totalProduced > 0 ? (totalApproved / totalProduced) * 100 : 0;
    const reworkRate = veiculos.length > 0 ? (totalReworked / veiculos.length) * 100 : 0;

    const cycleTimes = finished.map(v => (v.exitTime! - v.entryTime) / 1000);
    const avgCycleTime = cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;

    const bottlenecks: Record<StageId, number> = {
      BODY_STORAGE: 0, TRIM_1: 0, TRIM_2: 0, TRIM_3: 0, MGR: 0, FAI: 0, AREA_BRANCA: 0, WATER_TEST: 0, NOISE_TEST: 0, REPAIR: 0, SHIPPING: 0, FINISHED: 0
    };
    veiculos.forEach(v => {
      if (v.currentStage !== 'FINISHED') {
        bottlenecks[v.currentStage]++;
      }
    });

    return {
      totalProduced,
      totalApproved,
      totalRejected,
      totalReworked,
      approvalRate,
      reworkRate,
      avgCycleTime,
      bottlenecks
    };
  };

  const processSimulation = useCallback(() => {
    setSimState(prev => {
      const nextTime = prev.currentTime + 1;
      let nextVehicles = [...prev.veiculos];

      // Spawn new vehicle if capacity allows
      const entryCount = nextVehicles.filter(v => v.currentStage === 'BODY_STORAGE').length;
      if (nextTime % SPAWN_RATE === 0 && entryCount < STAGES.BODY_STORAGE.capacity) {
        const newV = createVehicle();
        nextVehicles.push(newV);
      }

      // Process existing vehicles
      nextVehicles = nextVehicles.map(v => {
        if (v.currentStage === 'FINISHED') return v;

        const currentStageInfo = STAGES[v.currentStage];
        const timeInStage = (Date.now() - (v.processStartTime || 0)) / 1000 * simSpeed;

        if (timeInStage >= (v.actualDuration || currentStageInfo.duration)) {
          // Logic to move to next stage
          let nextStage: StageId | null = null;
          let nextState: VehicleState = v.state;

          if (v.currentStage === 'FAI') {
            if (v.failureCount === 0) {
              nextStage = 'AREA_BRANCA';
              nextState = 'Em_processo';
            } else {
              if (v.repairCycles < MAX_REPAIR_CYCLES) {
                nextStage = 'REPAIR';
                nextState = 'Em_reparo';
              } else {
                nextStage = 'FINISHED';
                nextState = 'Reprovado';
              }
            }
          } else if (v.currentStage === 'WATER_TEST') {
            if (v.failureCount === 0) {
              nextStage = 'NOISE_TEST';
              nextState = 'Em_processo';
            } else {
              if (v.repairCycles < MAX_REPAIR_CYCLES) {
                nextStage = 'REPAIR';
                nextState = 'Em_reparo';
              } else {
                nextStage = 'FINISHED';
                nextState = 'Reprovado';
              }
            }
          } else if (v.currentStage === 'REPAIR') {
            nextStage = 'FAI';
            nextState = 'Reparo_concluído';
          } else if (v.currentStage === 'SHIPPING') {
            nextStage = 'FINISHED';
            nextState = 'Aprovado';
          } else {
            const currentIndex = FLOW.indexOf(v.currentStage);
            if (currentIndex < FLOW.length - 1) {
              nextStage = FLOW[currentIndex + 1];
              nextState = (nextStage === 'FAI' || nextStage === 'WATER_TEST' || nextStage === 'NOISE_TEST') 
                ? 'Aguardando_inspeção' 
                : 'Em_processo';
            }
          }

          // Check capacity of next stage
          if (nextStage) {
            const nextStageCount = nextVehicles.filter(veh => veh.currentStage === nextStage).length;
            if (nextStageCount < STAGES[nextStage].capacity) {
              // Move vehicle
              v.currentStage = nextStage;
              v.state = nextState;
              v.processStartTime = Date.now();
              v.actualDuration = getRandomDuration(STAGES[nextStage].duration);
              
              if (nextStage === 'REPAIR') {
                v.repairCycles++;
                // Residual failure check
                const residualFailure = Math.random() < STAGES.REPAIR.failureProb;
                v.failureCount = residualFailure ? 1 : 0;
              } else if (nextStage === 'FINISHED') {
                v.exitTime = Date.now();
              } else if (['FAI', 'AREA_BRANCA', 'WATER_TEST', 'NOISE_TEST', 'SHIPPING'].indexOf(nextStage) === -1) {
                // Check for failure in production stages
                if (Math.random() < STAGES[nextStage].failureProb) {
                  v.failureCount++;
                }
              }

              v.history.push({ 
                stage: nextStage, 
                state: nextState, 
                timestamp: Date.now(),
                details: nextStage === 'REPAIR' ? `Ciclo ${v.repairCycles}` : undefined
              });
            }
          }
        }

        return { ...v };
      });

      return {
        ...prev,
        veiculos: nextVehicles,
        currentTime: nextTime,
        metricas: updateMetrics(nextVehicles)
      };
    });
  }, [createVehicle, simSpeed]);

  useEffect(() => {
    if (isRunning) {
      simInterval.current = setInterval(processSimulation, 1000 / simSpeed);
    } else {
      if (simInterval.current) clearInterval(simInterval.current);
    }
    return () => {
      if (simInterval.current) clearInterval(simInterval.current);
    };
  }, [isRunning, processSimulation, simSpeed]);

  const resetSimulation = () => {
    setSimState({
      veiculos: [],
      metricas: {
        totalProduced: 0,
        totalApproved: 0,
        totalRejected: 0,
        totalReworked: 0,
        approvalRate: 0,
        reworkRate: 0,
        avgCycleTime: 0,
        bottlenecks: {
          BODY_STORAGE: 0, TRIM_1: 0, TRIM_2: 0, TRIM_3: 0, MGR: 0, FAI: 0, AREA_BRANCA: 0, WATER_TEST: 0, NOISE_TEST: 0, REPAIR: 0, SHIPPING: 0, FINISHED: 0
        }
      },
      eventos: ['Simulação reiniciada'],
      currentTime: 0
    });
  };

  // Helper for path interpolation
  const getPathPoints = (from: StageId, to: StageId) => {
    const fromStage = STAGES[from];
    const toStage = STAGES[to];
    const points = [{ x: fromStage.x, y: fromStage.y }];

    if (from === 'MGR' && to === 'FAI') {
      points.push({ x: 700, y: 400 }, { x: 400, y: 400 });
    } else if (from === 'WATER_TEST' && to === 'REPAIR') {
      points.push({ x: 850, y: 600 }, { x: 400, y: 600 });
    } else if (from === 'REPAIR' && to === 'FAI') {
      // Direct vertical path back to FAI
      points.push({ x: 400, y: 590 }); 
    } else if (from === 'FAI' && to === 'REPAIR') {
      // Direct vertical path to repair
      points.push({ x: 400, y: 590 });
    } else if (from === 'NOISE_TEST' && to === 'SHIPPING') {
      points.push({ x: 1050, y: 590 });
    }
    
    points.push({ x: toStage.x, y: toStage.y });
    return points;
  };

  const interpolateAlongPoints = (points: {x: number, y: number}[], t: number) => {
    if (points.length < 2) return { x: points[0]?.x || 0, y: points[0]?.y || 0, rotation: 0 };
    
    const segmentCount = points.length - 1;
    const segmentIndex = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
    const segmentT = (t * segmentCount) - segmentIndex;
    
    const p1 = points[segmentIndex];
    const p2 = points[segmentIndex + 1];
    
    return {
      x: p1.x + (p2.x - p1.x) * segmentT,
      y: p1.y + (p2.y - p1.y) * segmentT,
      rotation: Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
    };
  };

  const activeVehicles = useMemo(() => 
    simState.veiculos.filter(v => v.currentStage !== 'FINISHED'), 
  [simState.veiculos]);

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">AutoFlow Layout Sim</h1>
              <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">Digital Twin v3.0</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-white/5">
              <button 
                onClick={() => setViewMode('dashboard')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
              <button 
                onClick={() => setViewMode('vehicles')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'vehicles' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Activity className="w-4 h-4" /> Veículos
              </button>
              <button 
                onClick={() => setViewMode('json')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'json' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <FileJson className="w-4 h-4" /> JSON
              </button>
            </div>

            <div className="h-8 w-px bg-white/10 mx-2" />

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`p-2 rounded-lg transition-all ${isRunning ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button 
                onClick={resetSimulation}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {viewMode === 'dashboard' && (
          <div className="space-y-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard 
                title="Total Produzido" 
                value={simState.metricas.totalProduced} 
                icon={<BarChart3 className="w-5 h-5" />}
                color="indigo"
              />
              <MetricCard 
                title="Taxa de Aprovação" 
                value={`${simState.metricas.approvalRate.toFixed(1)}%`} 
                icon={<CheckCircle2 className="w-5 h-5" />}
                color="emerald"
              />
              <MetricCard 
                title="Taxa de Retrabalho" 
                value={`${simState.metricas.reworkRate.toFixed(1)}%`} 
                icon={<Wrench className="w-5 h-5" />}
                color="amber"
              />
              <MetricCard 
                title="Tempo Médio Ciclo" 
                value={`${simState.metricas.avgCycleTime.toFixed(1)}s`} 
                icon={<Clock className="w-5 h-5" />}
                color="blue"
              />
            </div>

            {/* Visual Layout Map */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-400" /> Layout Físico da Linha (Digital Twin)
                </h2>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span className="w-3 h-3 rounded-full bg-indigo-500" /> Fluxo Principal
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span className="w-3 h-3 rounded-full bg-amber-500" /> Loop de Reparo
                  </div>
                </div>
              </div>

              <div className="relative w-full h-[600px] bg-slate-950/50 rounded-xl border border-white/5 overflow-y-auto custom-scrollbar">
                <svg className="w-full min-w-[1000px]" viewBox="0 0 1200 750" style={{ height: '750px' }}>
                  <defs>
                    <pattern id="conveyorPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
                    </pattern>
                    <linearGradient id="carGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                      <stop offset="50%" stopColor="rgba(255,255,255,0)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                    </linearGradient>
                  </defs>

                  {/* Main Conveyor Path - Visual Background */}
                  <path 
                    d="M 100 80 L 350 80 L 350 180 L 350 280 L 700 280 L 700 400 L 400 400 L 400 500 L 650 500 L 850 500 L 1050 500 L 1050 680 L 1150 680" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.03)" 
                    strokeWidth="44" 
                    strokeLinecap="round" 
                  />
                  
                  {/* Animated Conveyor Belt Effect */}
                  <path 
                    d="M 100 80 L 350 80 L 350 180 L 350 280 L 700 280 L 700 400 L 400 400 L 400 500 L 650 500 L 850 500 L 1050 500 L 1050 680 L 1150 680" 
                    fill="none" 
                    stroke="rgba(99, 102, 241, 0.1)" 
                    strokeWidth="2" 
                    strokeDasharray="10, 20"
                    className="animate-[conveyor_10s_linear_infinite]"
                  />

                  {/* Repair Loop Lines */}
                  <path 
                    d="M 400 500 L 400 680 L 400 500" 
                    fill="none" 
                    stroke="rgba(245,158,11,0.05)" 
                    strokeWidth="30" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M 850 500 L 850 600 L 400 600 L 400 680" 
                    fill="none" 
                    stroke="rgba(245,158,11,0.05)" 
                    strokeWidth="20" 
                    strokeLinecap="round" 
                  />

                  {/* Nodes */}
                  {Object.values(STAGES).map((stage) => (
                    <g key={stage.id}>
                      <rect 
                        x={stage.x - 60} 
                        y={stage.y - 40} 
                        width="120" 
                        height="80" 
                        rx="12" 
                        className={`fill-slate-900/80 stroke-white/10 transition-all ${stage.id === 'REPAIR' ? 'stroke-amber-500/30' : ''}`}
                      />
                      <text 
                        x={stage.x} 
                        y={stage.y - 50} 
                        textAnchor="middle" 
                        className="text-[10px] font-mono uppercase tracking-wider fill-slate-500"
                      >
                        {stage.name}
                      </text>
                      <text 
                        x={stage.x} 
                        y={stage.y + 5} 
                        textAnchor="middle" 
                        className="text-xs font-bold fill-slate-400"
                      >
                        {simState.metricas.bottlenecks[stage.id]}/{stage.capacity}
                      </text>
                    </g>
                  ))}

                  {/* Vehicles */}
                  {activeVehicles.map((v) => {
                    const stage = STAGES[v.currentStage];
                    const progress = Math.min(1, (Date.now() - (v.processStartTime || 0)) / (v.actualDuration * 1000 / simSpeed));
                    
                    // Find previous stage to calculate path transition
                    const prevStageId = v.history.length > 1 ? v.history[v.history.length - 2].stage : null;
                    
                    // Transition phase (first 30% of time in new stage is spent traveling)
                    const travelThreshold = 0.3;
                    
                    let vx, vy, rotation;

                    if (prevStageId && progress < travelThreshold) {
                      const travelProgress = progress / travelThreshold;
                      const points = getPathPoints(prevStageId, v.currentStage);
                      const pos = interpolateAlongPoints(points, travelProgress);
                      vx = pos.x;
                      vy = pos.y;
                      rotation = pos.rotation;
                    } else {
                      // At station phase
                      const vehiclesInStage = activeVehicles.filter(veh => veh.currentStage === v.currentStage);
                      const indexInStage = vehiclesInStage.findIndex(veh => veh.id === v.id);
                      
                      const isVertical = ['TRIM_1', 'TRIM_2', 'TRIM_3', 'REPAIR'].includes(v.currentStage);
                      const spacing = 25;
                      const queueOffset = (indexInStage - (vehiclesInStage.length - 1) / 2) * spacing;
                      
                      // Small movement within station
                      const stationProgress = prevStageId ? (progress - travelThreshold) / (1 - travelThreshold) : progress;
                      const movementRange = 20;
                      const movementOffset = (stationProgress - 0.5) * movementRange;
                      
                      vx = stage.x;
                      vy = stage.y;
                      
                      if (isVertical) {
                        vy += queueOffset + movementOffset;
                        rotation = 90;
                      } else {
                        vx += queueOffset + movementOffset;
                        rotation = 0;
                      }
                    }

                    return (
                      <g 
                        key={v.id} 
                        transform={`translate(${vx}, ${vy}) rotate(${rotation})`} 
                        className="transition-all ease-linear"
                        style={{ transitionDuration: `${500 / simSpeed}ms` }}
                      >
                        {/* Shadow */}
                        <rect x="-11" y="-5" width="22" height="14" rx="3" fill="black" opacity="0.2" />
                        
                        {/* Car Body */}
                        <rect x="-10" y="-6" width="20" height="12" rx="2" fill={v.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                        
                        {/* Windshield/Windows */}
                        <rect x="-3" y="-5" width="7" height="10" rx="1" fill="rgba(0,0,0,0.3)" />
                        
                        {/* Wheels */}
                        <rect x="-8" y="-7.5" width="4" height="2" rx="0.5" fill="#111" />
                        <rect x="-8" y="5.5" width="4" height="2" rx="0.5" fill="#111" />
                        <rect x="4" y="-7.5" width="4" height="2" rx="0.5" fill="#111" />
                        <rect x="4" y="5.5" width="4" height="2" rx="0.5" fill="#111" />
                        
                        {/* Headlights */}
                        <rect x="8" y="-4" width="2" height="2" rx="0.5" fill="#fff" opacity="0.8" />
                        <rect x="8" y="2" width="2" height="2" rx="0.5" fill="#fff" opacity="0.8" />

                        <text y="-15" transform={`rotate(${-rotation})`} textAnchor="middle" className="text-[8px] font-mono fill-white/50 font-bold">{v.id}</text>
                        
                        {/* Status Indicator */}
                        {v.state === 'Em_reparo' && (
                          <circle cx="0" cy="0" r="3" fill="#f59e0b" className="animate-pulse" />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Detailed Bottleneck Analysis */}
              <div className="lg:col-span-2 bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-400" /> Status de Ocupação por Área
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(STAGES).map(([id, stage]) => {
                    if (id === 'FINISHED') return null;
                    const count = simState.metricas.bottlenecks[id as StageId];
                    const percentage = (count / stage.capacity) * 100;
                    return (
                      <div key={id} className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">{stage.name}</span>
                          <span className="text-slate-500 font-mono">{count} / {stage.capacity}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${percentage > 90 ? 'bg-rose-500' : percentage > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Event Log */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex flex-col h-[400px]">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" /> Log de Eventos Recentes
                </h2>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {simState.veiculos.slice(-20).reverse().map((v, i) => (
                    <div key={v.id + i} className="p-3 rounded-lg bg-slate-800/30 border border-white/5 text-xs animate-in fade-in slide-in-from-right-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-indigo-400">{v.id}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          v.state === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500' :
                          v.state === 'Reprovado' ? 'bg-rose-500/10 text-rose-500' :
                          v.state === 'Em_reparo' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {v.state.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        {v.currentStage === 'FINISHED' ? 'Processo concluído' : `Local: ${STAGES[v.currentStage].name}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'vehicles' && (
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/5">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300">ID do Veículo</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300">Etapa Atual</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300">Estado</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300">Ciclos de Reparo</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300">Tempo em Linha</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300">Cor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {simState.veiculos.slice().reverse().map(v => (
                  <tr key={v.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-mono text-sm text-indigo-400">{v.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-300">{STAGES[v.currentStage].name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        v.state === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500' :
                        v.state === 'Reprovado' ? 'bg-rose-500/10 text-rose-500' :
                        v.state === 'Em_reparo' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {v.state.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{v.repairCycles}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {((v.exitTime || Date.now()) - v.entryTime) / 1000}s
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: v.color }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'json' && (
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 font-mono text-sm overflow-hidden flex flex-col h-[700px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-400">Raw Simulation State</h2>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(simState, null, 2));
                  alert('JSON copiado para a área de transferência!');
                }}
                className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors"
              >
                Copiar JSON
              </button>
            </div>
            <pre className="flex-1 overflow-auto custom-scrollbar bg-slate-950/50 p-4 rounded-xl border border-white/5 text-indigo-300/80">
              {JSON.stringify(simState, null, 2)}
            </pre>
          </div>
        )}
      </main>

      {/* Footer / Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/5 px-6 py-2 flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
            Status: {isRunning ? 'Running' : 'Paused'}
          </div>
          <div>Time: {simState.currentTime}s</div>
          <div>Active Vehicles: {activeVehicles.length}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            Speed: 
            <input 
              type="range" 
              min="0.5" 
              max="5" 
              step="0.5" 
              value={simSpeed} 
              onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
              className="w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            {simSpeed}x
          </div>
        </div>
      </footer>
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    rose: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  };

  return (
    <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-2 rounded-xl border ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
    </div>
  );
};

export default App;
