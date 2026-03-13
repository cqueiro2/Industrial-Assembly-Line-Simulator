
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, CheckCircle2, ShieldAlert, Terminal, Key,
  BarChart, LayoutGrid, AlertCircle, Gauge, Zap, ActivitySquare, Radio, Activity,
  Boxes, ArrowRight, Truck, MonitorDot, Wrench, ZapOff, Droplets as WaterIcon,
  ShieldCheck, TrendingUp, History, ListFilter, Command, Timer, AlertTriangle,
  ChevronLeft, ChevronRight, Cpu, FastForward, SendHorizontal
} from 'lucide-react';
import { 
  SIM_WIDTH, SIM_HEIGHT, COLORS, MAIN_PATH_POINTS, REPAIR_PATH_POINTS, STATIONS, 
  REPAIR_STATIONS, ROLL_TEST_BRANCHES, FORK_POINT_IDX, MERGE_POINT_IDX, PARALLEL_ROLL_STATIONS
} from './constants';
import { Vehicle, Point, SimulationStats, FailureType, QualityStatus, StationType, FailurePriority, AndonStatus } from './types';

const VEHICLE_IMAGE_SRC = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA2MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB4PSI4IiB5PSIyIiB3aWR0aD0iNDQiIGhlaWdodD0iMjYiIHJ4PSI0IiBmaWxsPSJ3aGl0ZSIvPgogIDxyZWN0IHg9IjE0IiB5PSI1IiB3aWR0aD0iMTQiIGhlaWdodD0iMjAiIHJ4PSIzIiBmaWxsPSIjMzMzIi8+CiAgPHJlY3QgeD0iMzIiIHk9IjUiIHdpZHRoPSIxOCIgaGVpZ2h0PSIyMCIgcng9IjMiIGZpbGw9IiMzMzMiLz4KICA8Y2lyY2xlIGN4PSI1NSIgY3k9IjciIHI9IjIiIGZpbGw9IiNmZmYiLz4KICA8Y2lyY2xlIGN4PSI1NSIgY3k9IjIzIiByPSIyIiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPg==";

const App: React.FC = () => {
  const [isRunning, setIsRunning] = useState(true);
  const [simMultiplier, setSimMultiplier] = useState(1.0);
  const [spawnRate, setSpawnRate] = useState(440); 
  const [speed, setSpeed] = useState(3.4);
  const [scale, setScale] = useState(1);
  
  // Protocol Selector States
  const [selectedProtocol, setSelectedProtocol] = useState('/status');
  const [protocolArg, setProtocolArg] = useState('');

  const [stats, setStats] = useState<SimulationStats>({ 
    produced: 0, defects: 0, active: 0, totalStarted: 0, passedFirstTime: 0, 
    ftrSuccesses: 0, repairCompletedCount: 0,
    categoryVolumes: { ELECTRICAL: 0, ELECTRONIC: 0, MECHANICAL: 0, LEAKAGE: 0 },
    rollTestProcessed: 0, andon: 'GREEN', currentTakt: 57.6, targetTakt: 57.6
  });
  const [logs, setLogs] = useState<string[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const analyticsScrollRef = useRef<HTMLDivElement>(null);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const frameCountRef = useRef(0);
  const vehicleImage = useRef<HTMLImageElement | null>(null);

  const sectionRefs = {
    stats: useRef<HTMLElement>(null),
    repair: useRef<HTMLElement>(null),
    shipping: useRef<HTMLElement>(null)
  };

  const scrollToSection = (section: keyof typeof sectionRefs) => {
    sectionRefs[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollAnalytics = (direction: 'left' | 'right') => {
    if (analyticsScrollRef.current) {
      const offset = direction === 'left' ? -300 : 300;
      analyticsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const updateScale = useCallback(() => {
    if (!viewportRef.current || !canvasRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const s = Math.min((rect.width - 10) / SIM_WIDTH, (rect.height - 10) / SIM_HEIGHT);
    setScale(s);
    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = SIM_WIDTH * dpr;
    canvasRef.current.height = SIM_HEIGHT * dpr;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) { ctx.resetTransform(); ctx.scale(dpr, dpr); }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateScale);
    const timer = setTimeout(updateScale, 150);
    const img = new Image();
    img.src = VEHICLE_IMAGE_SRC;
    img.onload = () => { vehicleImage.current = img; };
    return () => {
      window.removeEventListener('resize', updateScale);
      clearTimeout(timer);
    };
  }, [updateScale]);

  const addLog = (msg: string) => setLogs(p => [msg, ...p].slice(0, 15));

  const executeProtocol = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedProtocol === '/status') {
      addLog(`STATUS: Prod=${stats.produced} | FTT=${((Number(stats.passedFirstTime) / (Number(stats.produced) || 1)) * 100).toFixed(1)}%`);
    } else if (selectedProtocol === '/takt') {
      const val = parseFloat(protocolArg);
      if (!isNaN(val)) {
        setStats(s => ({ ...s, targetTakt: val }));
        addLog(`CONFIG: Target Takt ajustado para ${val}s`);
      } else {
        addLog(`ERRO: Valor de Takt inválido.`);
      }
    } else if (selectedProtocol === '/priorizar') {
      const vin = protocolArg.toUpperCase();
      const v = vehiclesRef.current.find(veh => veh.id === vin);
      if (v && v.inRepair) {
        v.priority = 'P1';
        addLog(`PRIORITY: VIN ${vin} elevado para P1 (Override)`);
      } else {
        addLog(`ERRO: VIN ${vin} não disponível para escalonamento.`);
      }
    } else if (selectedProtocol === '/quebra') {
      const station = protocolArg;
      if (station) {
        addLog(`ALERTA: Simulação de quebra em ${station.toUpperCase()} iniciada.`);
        setStats(s => ({ ...s, andon: 'RED' }));
      } else {
        addLog(`ERRO: Selecione uma estação para quebra.`);
      }
    }

    setProtocolArg('');
  };

  const spawnVehicle = useCallback(() => {
    const id = "VIN" + Math.random().toString(36).substr(2, 5).toUpperCase();
    const bodyColors = ['#f8fafc', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
    const bodyColor = bodyColors[Math.floor(Math.random() * bodyColors.length)];
    const newVehicle: Vehicle = {
      id, pos: { ...MAIN_PATH_POINTS[0] }, rotation: 0, pathIdx: 0, targetPath: [...MAIN_PATH_POINTS],
      waitingTimer: 0, hasDefect: Math.random() < 0.25, isLocked: false,
      color: bodyColor, baseColor: bodyColor,
      failureType: null, priority: null, entryBufferTime: null, currentLeadTime: 0,
      viaVerde: true, rollTestStatus: 'NONE', waterTestStatus: 'NONE', preDeliveryStatus: 'NONE',
      needsH2ORetesting: false, readyForOffloading: false, inRepair: false, assignedCabinId: null, rollStep: 'READY',
      hasPassedFAI: false
    };
    vehiclesRef.current.push(newVehicle);
    setStats(s => ({ ...s, totalStarted: s.totalStarted + 1 }));
  }, []);

  const moveToRepair = (v: Vehicle, type: FailureType, source: string) => {
    v.viaVerde = false; v.inRepair = true; v.failureType = type;
    v.entryBufferTime = Date.now();
    v.color = '#ef4444';
    
    if (type === 'LEAKAGE') v.priority = 'P1';
    else if (source.includes('ROLL')) v.priority = 'P2';
    else v.priority = 'P3';

    const entry = REPAIR_PATH_POINTS[0], junction = REPAIR_PATH_POINTS[1], mecCell = REPAIR_PATH_POINTS[2],
          leakCell = REPAIR_PATH_POINTS[3], elecCell = REPAIR_PATH_POINTS[4], 
          returnPath = REPAIR_PATH_POINTS[5], exitPath = REPAIR_PATH_POINTS[6];

    v.targetPath = type === 'MECHANICAL' ? [entry, junction, mecCell, returnPath, exitPath] :
                  type === 'LEAKAGE' ? [entry, junction, leakCell, returnPath, exitPath] :
                  [entry, junction, elecCell, returnPath, exitPath];

    v.pathIdx = 0;
    setStats(s => ({ 
      ...s, 
      defects: s.defects + 1, 
      categoryVolumes: { ...s.categoryVolumes, [type]: (Number(s.categoryVolumes[type]) || 0) + 1 } 
    }));
    addLog(`FAIL: [${v.id}] @ ${source} -> Prioridade ${v.priority}`);
  };

  const updateSimulation = useCallback((delta: number = 1.0) => {
    frameCountRef.current++;
    const currentSpawnRate = Math.max(10, Math.round(spawnRate / delta));
    if (frameCountRef.current % currentSpawnRate === 0) spawnVehicle();

    const currentVehicles = vehiclesRef.current;
    
    const bufferCount = currentVehicles.filter(v => v.inRepair).length;
    let andon: AndonStatus = 'GREEN';
    if (bufferCount > 8) andon = 'RED';
    else if (bufferCount > 4) andon = 'YELLOW';
    
    if (stats.andon !== andon) setStats(s => ({ ...s, andon }));

    for (let i = currentVehicles.length - 1; i >= 0; i--) {
      const v = currentVehicles[i];
      if (v.isLocked) continue; 
      if (v.inRepair) v.currentLeadTime += delta;

      if (v.waitingTimer > 0) {
        v.waitingTimer -= delta;
        continue; 
      }

      const target = v.targetPath[v.pathIdx + 1];
      if (!target) {
        if (v.viaVerde) setStats(s => ({ ...s, passedFirstTime: s.passedFirstTime + 1 }));
        setStats(s => ({ ...s, produced: s.produced + 1 }));
        currentVehicles.splice(i, 1);
        continue;
      }

      const hasBlocker = currentVehicles.some(o => o.id !== v.id && Math.sqrt(Math.pow(o.pos.x - v.pos.x, 2) + Math.pow(o.pos.y - v.pos.y, 2)) < 65 && o.pathIdx >= v.pathIdx);
      if (hasBlocker) continue;

      const dx = target.x - v.pos.x, dy = target.y - v.pos.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.1) v.rotation = Math.atan2(dy, dx);
      
      const andonFactor = (stats.andon === 'RED' ? 0.5 : stats.andon === 'YELLOW' ? 0.8 : 1);
      const currentSpeed = speed * andonFactor * delta;

      if (dist < currentSpeed) {
        v.pos = { ...target }; v.pathIdx++;

        if (v.pathIdx === FORK_POINT_IDX && !v.inRepair && v.rollTestStatus === 'NONE' && !v.hasPassedFAI) {
          const availableIdx = [0, 1, 2].find(idx => !currentVehicles.some(other => other.assignedCabinId === PARALLEL_ROLL_STATIONS[idx].id));
          if (availableIdx !== undefined) {
            v.assignedCabinId = PARALLEL_ROLL_STATIONS[availableIdx].id;
            v.targetPath = [...ROLL_TEST_BRANCHES[availableIdx], ...MAIN_PATH_POINTS.slice(MERGE_POINT_IDX + 1)];
            v.pathIdx = 0;
          } else { v.pathIdx--; continue; } 
        }
        
        if (v.assignedCabinId && Math.abs(v.pos.x - MAIN_PATH_POINTS[MERGE_POINT_IDX].x) < 5 && Math.abs(v.pos.y - MAIN_PATH_POINTS[MERGE_POINT_IDX].y) < 5) {
          v.assignedCabinId = null;
        }

        const currentStation = (!v.inRepair ? STATIONS[v.pathIdx] : null) || 
                               Object.values(REPAIR_STATIONS).find(s => v.inRepair && Math.abs(s.pos.x - v.pos.x) < 8 && Math.abs(s.pos.y - v.pos.y) < 8) ||
                               PARALLEL_ROLL_STATIONS.find(ps => Math.abs(ps.pos.x - v.pos.x) < 5 && Math.abs(ps.pos.y - v.pos.y) < 5);
        
        if (currentStation) {
          v.waitingTimer = currentStation.wait;
          if (currentStation.name === 'FAI QC') v.hasPassedFAI = true;
          if (currentStation.name.startsWith('Teste Rolo')) {
            if (v.hasDefect && Math.random() < 0.4) moveToRepair(v, Math.random() > 0.5 ? 'ELECTRONIC' : 'MECHANICAL', 'ROLL TEST');
            else v.rollTestStatus = 'PASS';
          }
          if (currentStation.name === 'SISTEMA ÁGUA') {
            if (v.hasDefect && Math.random() < 0.2) { v.needsH2ORetesting = true; moveToRepair(v, 'LEAKAGE', 'H2O TEST'); }
            else v.waterTestStatus = 'PASS';
          }
          if (currentStation.name === 'EMBARQUE') v.readyForOffloading = true;
          if (v.inRepair && currentStation.type === StationType.REPAIR) v.isLocked = true;
        }
      } else { v.pos.x += dx * (currentSpeed / dist); v.pos.y += dy * (currentSpeed / dist); }
    }
  }, [isRunning, speed, spawnRate, spawnVehicle, stats.andon]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, SIM_WIDTH, SIM_HEIGHT);
    const pathLine = (pts: Point[], col = '#1e293b', w = 32) => {
      ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.moveTo(pts[0].x, pts[0].y); pts.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
    };
    pathLine(MAIN_PATH_POINTS.slice(0, FORK_POINT_IDX + 1));
    ROLL_TEST_BRANCHES.forEach(b => pathLine(b, '#0f172a', 38));
    pathLine(MAIN_PATH_POINTS.slice(MERGE_POINT_IDX));
    pathLine(REPAIR_PATH_POINTS, '#1a0505', 36);

    [...Object.values(STATIONS), ...Object.values(REPAIR_STATIONS), ...PARALLEL_ROLL_STATIONS].forEach(s => {
      const isRoll = s.name.startsWith('Teste Rolo');
      const isRepair = s.type === StationType.REPAIR;
      const vehicleIn = vehiclesRef.current.find(v => Math.abs(v.pos.x - s.pos.x) < 12 && Math.abs(v.pos.y - s.pos.y) < 12);
      ctx.fillStyle = isRoll ? '#020617' : (isRepair ? '#1a0505' : '#0f172a');
      ctx.strokeStyle = vehicleIn && vehicleIn.waitingTimer > 0 ? (isRepair ? '#ef4444' : '#10b981') : '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(s.pos.x - (s.width || 130)/2, s.pos.y - (s.height || 44)/2, s.width || 130, s.height || 44, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = isRepair ? '#fca5a5' : '#94a3b8'; ctx.font = 'bold 9px Inter'; ctx.textAlign = 'center';
      ctx.fillText(s.name.toUpperCase(), s.pos.x, s.pos.y - 4);
    });

    vehiclesRef.current.forEach(v => {
      if (!vehicleImage.current) return;
      ctx.save(); ctx.translate(v.pos.x, v.pos.y); ctx.rotate(v.rotation);
      ctx.drawImage(vehicleImage.current, -18, -9, 36, 18);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = v.color; ctx.beginPath(); ctx.roundRect(-18, -9, 36, 18, 4); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px font-mono'; ctx.fillText(v.id, v.pos.x, v.pos.y - 18);
      if (v.priority === 'P1') { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(v.pos.x + 22, v.pos.y - 10, 5, 0, Math.PI * 2); ctx.fill(); }
    });
  }, []);

  useEffect(() => {
    let fId: number; 
    const loop = () => { 
      if (isRunning) {
        const steps = Math.ceil(simMultiplier);
        const subDelta = simMultiplier / steps;
        for (let i = 0; i < steps; i++) {
          updateSimulation(subDelta); 
        }
      }
      if (canvasRef.current) draw(canvasRef.current.getContext('2d')!); 
      fId = requestAnimationFrame(loop); 
    };
    fId = requestAnimationFrame(loop); 
    return () => cancelAnimationFrame(fId);
  }, [updateSimulation, draw, isRunning, simMultiplier]);

  const validateRepair = (id: string) => {
    const v = vehiclesRef.current.find(veh => veh.id === id);
    if (v) { 
      v.isLocked = false; v.waitingTimer = 0; v.inRepair = false; v.color = v.baseColor;
      v.targetPath = v.needsH2ORetesting ? [...MAIN_PATH_POINTS].slice(16) : [...MAIN_PATH_POINTS].slice(15);
      v.pathIdx = 0;
      setStats(s => ({ ...s, ftrSuccesses: s.ftrSuccesses + 1, repairCompletedCount: s.repairCompletedCount + 1 }));
      addLog(`REPAIRED: [${v.id}] Retornando para validação.`);
    }
  };

  const renderArgInput = () => {
    switch (selectedProtocol) {
      case '/quebra':
        return (
          <select 
            value={protocolArg} 
            onChange={(e) => setProtocolArg(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-mono text-indigo-400 focus:outline-none focus:border-indigo-500 transition-all flex-1 appearance-none"
          >
            <option value="">Estação...</option>
            <option value="rolo1">Rolo 1</option>
            <option value="rolo2">Rolo 2</option>
            <option value="rolo3">Rolo 3</option>
            <option value="agua">Água</option>
            <option value="trim1">TRIM 1</option>
            <option value="mgr">MGR</option>
          </select>
        );
      case '/priorizar':
        const repairVehicles = vehiclesRef.current.filter(v => v.inRepair && v.priority !== 'P1');
        return (
          <select 
            value={protocolArg} 
            onChange={(e) => setProtocolArg(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-mono text-indigo-400 focus:outline-none focus:border-indigo-500 transition-all flex-1 appearance-none"
          >
            <option value="">Selecione VIN...</option>
            {repairVehicles.map(v => <option key={v.id} value={v.id}>{v.id}</option>)}
          </select>
        );
      case '/takt':
        return (
          <input 
            type="number" 
            placeholder="Valor (s)..."
            value={protocolArg} 
            onChange={(e) => setProtocolArg(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-mono text-indigo-400 focus:outline-none focus:border-indigo-500 transition-all flex-1"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#020617] text-slate-400 font-sans antialiased overflow-hidden">
      
      {/* DIGITAL TWIN SIDEBAR DASHBOARD */}
      <aside className="w-[420px] bg-[#020617] border-r border-slate-900 flex flex-col shrink-0 z-30 shadow-2xl relative">
        
        {/* FIXED PRODUCTION HEADER */}
        <div className="p-6 border-b border-slate-900/50 bg-slate-950/70 backdrop-blur-xl z-50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)]"><Boxes className="w-5 h-5 text-white" /></div>
              <div>
                <h1 className="text-[14px] font-black text-white uppercase tracking-tighter flex items-center gap-2">Digital Twin <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">v1.2</span></h1>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em]">Plant.Control.Alpha</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-[10px] font-black uppercase transition-colors ${stats.andon === 'GREEN' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : stats.andon === 'YELLOW' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${stats.andon === 'GREEN' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : stats.andon === 'YELLOW' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-rose-500 animate-pulse shadow-[0_0_12px_#ef4444]'}`} /> 
              {stats.andon}
            </div>
          </div>

          <div className="p-5 bg-slate-900/40 rounded-3xl border border-white/5 relative overflow-hidden group shadow-inner">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-950">
                <div className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_10px_#6366f1]" style={{ width: `${(Number(stats.produced)/500)*100}%` }} />
            </div>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">Production Quota</span>
                <div className="text-4xl font-black text-white tabular-nums tracking-tighter">
                    {stats.produced} <span className="text-slate-700 text-xl font-bold">/ 500</span>
                </div>
              </div>
              <div className="text-right">
                <TrendingUp className="w-5 h-5 text-indigo-400 ml-auto mb-1" />
                <span className="text-xl font-black text-indigo-400 tabular-nums tracking-tighter">{((Number(stats.produced)/500)*100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex bg-slate-950/40 p-1.5 mx-6 mt-6 rounded-2xl border border-slate-900/50 sticky top-0 z-40 backdrop-blur-md">
          {[
            { id: 'stats', label: 'Analytics', icon: <BarChart className="w-4 h-4" /> },
            { id: 'repair', label: 'Buffer', icon: <ShieldAlert className="w-4 h-4" /> },
            { id: 'shipping', label: 'Logistics', icon: <Truck className="w-4 h-4" /> }
          ].map(btn => (
            <button key={btn.id} onClick={() => scrollToSection(btn.id as any)} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest">
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>

        {/* SCROLLABLE MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-12 space-y-12 pt-6">
          
          {/* SIMULATION SPEED CONTROL */}
          <section className="px-2 space-y-4">
            <header className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3">
                <FastForward className="w-4 h-4 text-amber-500" /> Simulation Tempo
              </h3>
              <span className="text-[10px] font-black text-amber-400 tabular-nums bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10">
                {simMultiplier.toFixed(1)}x
              </span>
            </header>
            <div className="bg-slate-900/30 p-5 rounded-3xl border border-white/5 space-y-4">
              <input 
                type="range" 
                min="0.5" 
                max="10.0" 
                step="0.5" 
                value={simMultiplier} 
                onChange={(e) => setSimMultiplier(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[8px] font-black text-slate-700 uppercase">
                <span>Slow (0.5x)</span>
                <span>Normal (1.0x)</span>
                <span>Fast (10.0x)</span>
              </div>
              <div className="flex gap-2">
                {[0.5, 1, 2, 5, 10].map(m => (
                  <button 
                    key={m} 
                    onClick={() => setSimMultiplier(m)}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${simMultiplier === m ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION: ANALYTICS WITH HORIZONTAL CAROUSEL */}
          <section ref={sectionRefs.stats} className="space-y-6">
            <header className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3">
                <LayoutGrid className="w-4 h-4 text-indigo-500" /> Operational Insights
              </h3>
              <div className="flex gap-2">
                 <button onClick={() => scrollAnalytics('left')} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                 <button onClick={() => scrollAnalytics('right')} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </header>

            {/* HORIZONTAL ANALYTICS CAROUSEL */}
            <div ref={analyticsScrollRef} className="flex overflow-x-auto gap-4 snap-x no-scrollbar pb-2">
              <div className="min-w-[280px] snap-center p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[2.5rem] shadow-2xl space-y-6">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-emerald-500/10 rounded-2xl"><ActivitySquare className="w-5 h-5 text-emerald-500" /></div>
                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">QUALITY_FTT</span>
                </div>
                <div>
                   <div className="text-4xl font-black text-white tracking-tighter tabular-nums">{((Number(stats.passedFirstTime) / (Number(stats.produced) || 1)) * 100).toFixed(1)}%</div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Direct Pass Rate</p>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(Number(stats.passedFirstTime) / (Number(stats.produced) || 1)) * 100}%` }} />
                </div>
              </div>

              <div className="min-w-[280px] snap-center p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[2.5rem] shadow-2xl space-y-6">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-indigo-500/10 rounded-2xl"><Timer className="w-5 h-5 text-indigo-500" /></div>
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded">EFFICIENCY</span>
                </div>
                <div className="flex gap-4 items-end">
                   <div>
                     <div className="text-3xl font-black text-white tracking-tighter tabular-nums">{stats.currentTakt}s</div>
                     <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Real Takt</p>
                   </div>
                   <div className="text-slate-800 text-2xl font-black mb-1">/</div>
                   <div>
                     <div className="text-xl font-black text-slate-500 tracking-tighter tabular-nums">{stats.targetTakt}s</div>
                     <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Goal</p>
                   </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                   <Gauge className="w-4 h-4 text-indigo-400" /> Syncing @ 100%
                </div>
              </div>

              <div className="min-w-[280px] snap-center p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[2.5rem] shadow-2xl space-y-6">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-amber-500/10 rounded-2xl"><Wrench className="w-5 h-5 text-amber-500" /></div>
                  <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded">REPAIR_FTR</span>
                </div>
                <div>
                   <div className="text-4xl font-black text-white tracking-tighter tabular-nums">{((Number(stats.ftrSuccesses) / (Number(stats.repairCompletedCount) || 1)) * 100).toFixed(1)}%</div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">First Time Repair</p>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${(Number(stats.ftrSuccesses) / (Number(stats.repairCompletedCount) || 1)) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-950/80 border border-slate-900 rounded-[2.5rem] shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[11px] font-black text-slate-200 uppercase tracking-widest flex items-center gap-3">
                        <ListFilter className="w-4 h-4 text-indigo-500" /> Defect Categorization
                    </h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    {Object.entries(stats.categoryVolumes).map(([cat, val]) => (
                        <div key={cat} className="space-y-2 group">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                <span className="text-slate-600 group-hover:text-slate-400 transition-colors">{cat}</span>
                                <span className="text-slate-400">{val} Units</span>
                            </div>
                            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${(Number(val) / (Number(stats.defects) || 1)) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </section>

          {/* SECTION: BUFFER / REPAIR QUEUE */}
          <section ref={sectionRefs.repair} className="space-y-6">
            <header className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-rose-500" /> Resolution Center
              </h3>
              <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/10">
                {vehiclesRef.current.filter(v => v.inRepair).length} ACTIVE INCIDENTS
              </span>
            </header>

            <div className="space-y-3">
              {vehiclesRef.current.filter(v => v.inRepair).sort((a,b) => (a.priority === 'P1' ? -1 : 1)).map(v => (
                <div key={v.id} className={`p-5 bg-slate-900/40 border rounded-3xl transition-all group hover:bg-slate-900/60 ${v.priority === 'P1' ? 'border-rose-500/30 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : 'border-slate-800'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full shadow-inner animate-pulse" style={{ backgroundColor: v.color }}></div>
                        <span className="text-[14px] font-black text-white font-mono tracking-widest">{v.id}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-lg ${v.priority === 'P1' ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                        {v.priority} CRITICAL
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950/60 p-4 rounded-2xl border border-slate-900 group-hover:border-slate-800 transition-colors">
                    <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">Cycle Aging</span>
                        <div className="text-[12px] font-black text-slate-300 flex items-center gap-2">
                           <History className="w-4 h-4 text-indigo-500" /> {Math.floor(Number(v.currentLeadTime)/60)}m {Math.floor(Number(v.currentLeadTime)) % 60}s
                        </div>
                    </div>
                    <button 
                        disabled={!v.isLocked} 
                        onClick={() => validateRepair(v.id)} 
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${v.isLocked ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}
                    >
                        {v.isLocked ? 'Certify' : 'In Route'}
                    </button>
                  </div>
                </div>
              ))}
              {vehiclesRef.current.filter(v => v.inRepair).length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center border border-dashed border-slate-900 rounded-[3rem] opacity-20 bg-slate-950/20">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">All Buffers Clear</span>
                </div>
              )}
            </div>
          </section>

          {/* SECTION: LOGISTICS */}
          <section ref={sectionRefs.shipping} className="space-y-6">
            <header className="flex items-center gap-3 px-2">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3">
                <Truck className="w-4 h-4 text-indigo-400" /> Final Shipping
              </h3>
            </header>
            <div className="bg-slate-900/20 border border-slate-900 rounded-[2.5rem] p-4">
                {vehiclesRef.current.filter(v => v.readyForOffloading).length > 0 ? (
                  <div className="space-y-3">
                    {vehiclesRef.current.filter(v => v.readyForOffloading).map(v => (
                       <div key={v.id} className="p-4 bg-slate-950/80 border border-slate-900 rounded-2xl flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                             <span className="text-[12px] font-black text-slate-200 font-mono">{v.id}</span>
                          </div>
                          <ShieldCheck className="w-5 h-5 text-emerald-500 opacity-50" />
                       </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center opacity-10 flex flex-col items-center">
                    <Truck className="w-10 h-10 mb-2" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Awaiting Export</span>
                  </div>
                )}
            </div>
          </section>
        </div>

        {/* DASHBOARD CONSOLE & CONTROLS */}
        <div className="p-8 border-t border-slate-900 bg-slate-950/80 backdrop-blur-3xl z-50">
          <form onSubmit={executeProtocol} className="space-y-4">
             <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                   <div className="relative flex-1 group">
                      <div className="absolute inset-0 bg-indigo-500/5 blur-xl group-focus-within:bg-indigo-500/10 transition-all rounded-full" />
                      <Command className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500 transition-colors z-10" />
                      <select 
                        value={selectedProtocol} 
                        onChange={(e) => { setSelectedProtocol(e.target.value); setProtocolArg(''); }}
                        className="relative w-full bg-slate-900 border border-slate-800 rounded-xl py-3.5 pl-10 pr-4 text-[11px] font-mono text-indigo-400 focus:outline-none focus:border-indigo-500/50 transition-all z-10 appearance-none shadow-inner"
                      >
                        <option value="/status">/status (Monitor)</option>
                        <option value="/quebra">/quebra (Falha)</option>
                        <option value="/priorizar">/priorizar (Escalar)</option>
                        <option value="/takt">/takt (Cadência)</option>
                      </select>
                   </div>
                   
                   <button 
                     type="submit" 
                     className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-95 shrink-0 flex items-center justify-center border border-indigo-400/20"
                   >
                     <SendHorizontal className="w-5 h-5" />
                   </button>
                </div>
                
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  {renderArgInput()}
                </div>
             </div>
             <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                <Radio className="w-3 h-3 text-indigo-500 animate-pulse" /> Digital Twin Control Protocol
             </p>
          </form>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <button onClick={() => setIsRunning(!isRunning)} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${isRunning ? 'bg-slate-900/50 text-slate-500 border border-white/5' : 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'}`}>
               {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {isRunning ? 'Hold Line' : 'Engage'}
            </button>
            <button onClick={() => { vehiclesRef.current = []; setStats(s => ({...s, produced:0, totalStarted:0, defects:0, passedFirstTime:0, ftrSuccesses:0, repairCompletedCount:0, categoryVolumes: { ELECTRICAL: 0, ELECTRONIC: 0, MECHANICAL: 0, LEAKAGE: 0 }})); addLog("GLOBAL_PURGE: OK"); }} className="py-4 bg-slate-900/50 border border-white/5 text-slate-600 hover:text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
      </aside>

      {/* PRIMARY FACTORY VIEWPORT */}
      <main className="flex-1 relative flex flex-col bg-[#000]">
        
        {/* VIEWPORT HEADER */}
        <header className="h-20 border-b border-slate-900/50 flex items-center justify-between px-10 bg-[#020617]/90 backdrop-blur-3xl z-20 shrink-0">
          <div className="flex gap-16">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] mb-1">Live Telemetry</span>
              <div className="flex items-center gap-3 text-lg font-black text-slate-200 tracking-tighter">
                <Cpu className="w-5 h-5 text-indigo-500" /> Plant_Node.Alpha_01
              </div>
            </div>
            <div className="flex flex-col border-l border-slate-900 pl-16">
              <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] mb-1">Network Integrity</span>
              <div className={`flex items-center gap-3 text-lg font-black tracking-tighter ${stats.andon === 'RED' ? 'text-rose-500' : 'text-emerald-400'}`}>
                <MonitorDot className="w-5 h-5 shadow-lg shadow-emerald-500/20" /> Sync_Locked
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="px-5 py-2.5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 shadow-inner">
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-3">
                 <Radio className="w-4 h-4 animate-pulse" /> {simMultiplier.toFixed(1)}x SPEED_TIME
               </span>
             </div>
             {stats.andon === 'RED' && <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black rounded-xl animate-pulse"><AlertTriangle className="w-4 h-4" /> INTERRUPT_DETECTED</div>}
          </div>
        </header>

        {/* FULL SCALE VIEWPORT CONTAINER */}
        <div ref={viewportRef} className="flex-1 flex items-center justify-center relative bg-[#010103] overflow-hidden p-4">
          <div style={{ width: SIM_WIDTH, height: SIM_HEIGHT, transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }} className="relative bg-[#020617] rounded-[3rem] border-2 border-slate-800 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.9)] flex items-center justify-center group overflow-hidden">
            
            {/* AMBIENT GRID */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none group-hover:opacity-[0.06] transition-opacity" style={{ backgroundImage: 'radial-gradient(#6366f1 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }} />
            
            <canvas ref={canvasRef} className="relative z-10" />
            
            {/* CINEMATIC BG TEXT */}
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-[0.015] pointer-events-none select-none">
              <h2 className="text-[140px] font-black text-slate-500 uppercase tracking-[0.5em] leading-none">ASSEMBLY</h2>
              <h2 className="text-[100px] font-black text-slate-600 uppercase tracking-[0.8em] leading-none">DIGITAL_TWIN</h2>
            </div>
            
            {/* CORNER ACCENTS */}
            <div className="absolute top-10 left-10 w-32 h-1 bg-indigo-500/20 rounded-full blur-sm" />
            <div className="absolute top-10 left-10 h-32 w-1 bg-indigo-500/20 rounded-full blur-sm" />
            <div className="absolute bottom-10 right-10 w-32 h-1 bg-indigo-500/20 rounded-full blur-sm" />
            <div className="absolute bottom-10 right-10 h-32 w-1 bg-indigo-500/20 rounded-full blur-sm" />
          </div>
        </div>

        {/* TELEMETRY TICKER FOOTER */}
        <footer className="h-16 bg-[#020617] border-t border-slate-900 flex items-center px-10 gap-10 shrink-0 overflow-hidden text-[9px] font-black uppercase tracking-[0.4em] text-slate-700 z-20">
          <div className="flex items-center gap-3 text-indigo-500 shrink-0 border-r border-slate-900 pr-10 h-full"><Terminal className="w-5 h-5" /> Telemetry_Bus</div>
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
            <div className="flex gap-20 animate-marquee items-center whitespace-nowrap">
              {logs.map((l, i) => (
                <span key={i} className={`flex gap-4 items-center ${l.includes('FAIL') || l.includes('ERRO') ? 'text-rose-500' : 'text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${l.includes('FAIL') ? 'bg-rose-500 animate-pulse' : 'bg-slate-800'}`} /> {l}
                </span>
              ))}
              {logs.length === 0 && <span className="opacity-40 tracking-widest italic">Streaming IIoT Packets... System initialized @ {new Date().toLocaleTimeString()}</span>}
            </div>
          </div>
        </footer>
      </main>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 100s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Speed Slider Custom Styling */
        input[type='range'] {
          -webkit-appearance: none;
          background: transparent;
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          margin-top: -6px;
          box-shadow: 0 0 10px rgba(99,102,241,0.4);
          border: 2px solid #0f172a;
        }
        input[type='range']::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          background: #1e293b;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default App;
