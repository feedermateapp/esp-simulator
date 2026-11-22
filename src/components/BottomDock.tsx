import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Activity, 
  Wifi, 
  Bluetooth, 
  Trash2, 
  Send, 
  Download, 
  Minimize2, 
  Maximize2,
  Globe,
  Radio,
  Bug,
  Filter,
  Search,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { SerialMessage, WaveformSample, GPIOPinState } from '../types/esp32';
import { logger, LogEntry, LogLevel } from '../utils/logger';
import { virtualWifi } from '../core/virtualWifi';
import { virtualBle } from '../core/virtualBle';
import { CpuRegisterInspector } from './CpuRegisterInspector';

interface BottomDockProps {
  serialLogs: SerialMessage[];
  onSendSerialCommand: (cmd: string) => void;
  onClearSerialLogs: () => void;
  waveformSamples: WaveformSample[];
  gpioStates: Map<number, GPIOPinState>;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  serialLogs,
  onSendSerialCommand,
  onClearSerialLogs,
  waveformSamples: _waveformSamples,
  gpioStates
}) => {
  const [activeTab, setActiveTab] = useState<'serial' | 'systemLogs' | 'waveform' | 'wireless' | 'pins' | 'xtensaCore'>('serial');
  const [serialInput, setSerialInput] = useState('');
  const [baudRate, setBaudRate] = useState(115200);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // System & Debug Log State
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>(logger.getHistory());
  const [logLevelFilter, setLogLevelFilter] = useState<string>('ALL');
  const [logTagFilter, setLogTagFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const logScrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to logger
  useEffect(() => {
    const unsubscribe = logger.subscribe((newEntry) => {
      setSystemLogs(prev => [...prev.slice(-400), newEntry]);
    });
    return () => unsubscribe();
  }, []);

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (serialInput.trim()) {
      onSendSerialCommand(serialInput.trim());
      setSerialInput('');
    }
  };

  const handleExportLogs = () => {
    const text = serialLogs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.type}] ${l.text}`).join('\n');
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `esp32_serial_log_${Date.now()}.txt`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportSystemLogs = () => {
    const json = logger.exportAsJson();
    const dataStr = "data:application/json;charset=utf-8," + encodeURIComponent(json);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `esp32_system_debug_log_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearSystemLogs = () => {
    logger.clear();
    setSystemLogs([]);
  };

  // Filter system logs
  const filteredSystemLogs = systemLogs.filter(entry => {
    if (logLevelFilter !== 'ALL' && entry.level !== logLevelFilter) return false;
    if (logTagFilter !== 'ALL' && entry.tag !== logTagFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        entry.message.toLowerCase().includes(q) ||
        entry.tag.toLowerCase().includes(q) ||
        (entry.data && JSON.stringify(entry.data).toLowerCase().includes(q))
      );
    }
    return true;
  });

  const uniqueTags = Array.from(new Set(systemLogs.map(l => l.tag)));

  return (
    <div className={`bg-slate-900 border-t border-slate-800 flex flex-col select-none transition-all duration-200 ${
      isCollapsed ? 'h-9' : activeTab === 'xtensaCore' ? 'h-80' : 'h-64'
    }`}>
      {/* Dock Header Tabs */}
      <div className="h-9 bg-slate-950 border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => { setActiveTab('serial'); setIsCollapsed(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'serial' && !isCollapsed
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Soros Monitor</span>
            {serialLogs.length > 0 && (
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-400">
                {serialLogs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('systemLogs'); setIsCollapsed(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'systemLogs' && !isCollapsed
                ? 'bg-slate-800 text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Rendszer & Debug Napló</span>
            {systemLogs.length > 0 && (
              <span className="text-[10px] bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded-full text-amber-300">
                {systemLogs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('waveform'); setIsCollapsed(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'waveform' && !isCollapsed
                ? 'bg-slate-800 text-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Logikai Analizátor</span>
          </button>

          <button
            onClick={() => { setActiveTab('wireless'); setIsCollapsed(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'wireless' && !isCollapsed
                ? 'bg-slate-800 text-violet-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Vezeték Nélküli (Web & BLE)</span>
          </button>

          <button
            onClick={() => { setActiveTab('pins'); setIsCollapsed(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'pins' && !isCollapsed
                ? 'bg-slate-800 text-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Lábkiosztás Diagnosztika</span>
          </button>

          <button
            onClick={() => { setActiveTab('xtensaCore'); setIsCollapsed(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'xtensaCore' && !isCollapsed
                ? 'bg-slate-800 text-purple-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Xtensa LX6 Core</span>
            <span className="text-[9px] bg-purple-950/60 border border-purple-800/60 px-1.5 py-0.2 rounded text-purple-300">
              Low-Level
            </span>
          </button>
        </div>

        {/* Right Dock Controls */}
        <div className="flex items-center space-x-2">
          {activeTab === 'serial' && !isCollapsed && (
            <>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-[11px] rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value={9600}>9600 baud</option>
                <option value={115200}>115200 baud</option>
              </select>

              <button
                onClick={handleExportLogs}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                title="Napló mentése (.txt)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onClearSerialLogs}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                title="Soros napló törlése"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {activeTab === 'systemLogs' && !isCollapsed && (
            <>
              <button
                onClick={handleExportSystemLogs}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                title="Rendszer napló exportálása (.json)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleClearSystemLogs}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                title="Rendszer napló törlése"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
            title={isCollapsed ? "Kinyitás" : "Összecsukás"}
          >
            {isCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Dock Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-950 p-2 font-mono text-xs">
          {/* SERIAL MONITOR */}
          {activeTab === 'serial' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-1 p-1 select-text">
                {serialLogs.length === 0 ? (
                  <div className="text-slate-600 italic py-4 text-center">
                    A soros monitor üres. Indítsd el a szimulációt (Run) a kiírásokhoz.
                  </div>
                ) : (
                  serialLogs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-slate-600 text-[10px]">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      {log.type === 'TX' && <span className="text-sky-400 font-bold">[TX]</span>}
                      {log.type === 'RX' && <span className="text-emerald-400 font-bold">[RX]</span>}
                      {log.type === 'ERROR' && <span className="text-rose-400 font-bold">[ERR]</span>}
                      {log.type === 'SYSTEM' && <span className="text-amber-400 font-bold">[SYS]</span>}
                      <span className={
                        log.type === 'ERROR' ? 'text-rose-300' :
                        log.type === 'SYSTEM' ? 'text-amber-300' :
                        log.type === 'TX' ? 'text-sky-200' : 'text-slate-200'
                      }>
                        {log.text}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Command Input Field */}
              <form onSubmit={handleSendCommand} className="mt-2 flex items-center space-x-2 border-t border-slate-800/80 pt-2">
                <input
                  type="text"
                  placeholder="Parancs küldése a soros portra (pl. HELP, STATUS, RESET)..."
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs px-2.5 py-1 rounded focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs transition"
                >
                  <Send className="w-3 h-3" />
                  <span>Küldés</span>
                </button>
              </form>
            </div>
          )}

          {/* SYSTEM & DEBUG LOGS */}
          {activeTab === 'systemLogs' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Filter Controls Bar */}
              <div className="flex items-center space-x-3 pb-2 border-b border-slate-800/80 text-[11px] shrink-0">
                {/* Search */}
                <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 flex-1 max-w-xs">
                  <Search className="w-3 h-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Keresés az üzenetekben..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none text-slate-200 text-xs focus:outline-none w-full"
                  />
                </div>

                {/* Level Filter */}
                <div className="flex items-center space-x-1">
                  <Filter className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-400 text-[10px]">Szint:</span>
                  <select
                    value={logLevelFilter}
                    onChange={(e) => setLogLevelFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="ALL">Mind (ALL)</option>
                    <option value="TRACE">TRACE</option>
                    <option value="DEBUG">DEBUG</option>
                    <option value="INFO">INFO</option>
                    <option value="WARN">WARN</option>
                    <option value="ERROR">ERROR</option>
                  </select>
                </div>

                {/* Tag Filter */}
                <div className="flex items-center space-x-1">
                  <span className="text-slate-400 text-[10px]">Modul:</span>
                  <select
                    value={logTagFilter}
                    onChange={(e) => setLogTagFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="ALL">Minden modul</option>
                    {uniqueTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>

                <div className="text-[10px] text-slate-500 ml-auto">
                  {filteredSystemLogs.length} / {systemLogs.length} naplóbejegyzés
                </div>
              </div>

              {/* Logs Stream */}
              <div ref={logScrollRef} className="flex-1 overflow-y-auto space-y-1 p-1 select-text mt-1">
                {filteredSystemLogs.length === 0 ? (
                  <div className="text-slate-600 italic py-4 text-center">
                    Nincs a szűrésnek megfelelő rendszer naplóbejegyzés.
                  </div>
                ) : (
                  filteredSystemLogs.map((entry) => {
                    const levelColors: Record<LogLevel, string> = {
                      TRACE: 'text-slate-500 bg-slate-900 border-slate-800',
                      DEBUG: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/60',
                      INFO: 'text-sky-400 bg-sky-950/40 border-sky-900/60',
                      WARN: 'text-amber-400 bg-amber-950/40 border-amber-900/60',
                      ERROR: 'text-rose-400 bg-rose-950/40 border-rose-900/60'
                    };

                    return (
                      <div key={entry.id} className="flex items-start space-x-2 leading-relaxed text-[11px] hover:bg-slate-900/40 px-1 py-0.5 rounded">
                        <span className="text-slate-600 text-[10px] shrink-0 font-mono">
                          +{ (entry.microTime / 1000).toFixed(1) }ms
                        </span>
                        <span className={`px-1 py-0.2 rounded text-[9px] font-bold border uppercase shrink-0 ${levelColors[entry.level]}`}>
                          {entry.level}
                        </span>
                        <span className="text-slate-400 font-semibold text-[10px] shrink-0 font-mono">
                          [{entry.tag}]
                        </span>
                        <span className="text-slate-200 flex-1 break-all">
                          {entry.message}
                          {entry.data && (
                            <span className="ml-2 text-slate-400 font-mono text-[10px]">
                              {typeof entry.data === 'object' ? JSON.stringify(entry.data) : String(entry.data)}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* LOGIC ANALYZER / WAVEFORM */}
          {activeTab === 'waveform' && (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px]">
                <span className="text-slate-400 font-semibold flex items-center space-x-1">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>Kétcsatornás Digitális Logikai Állapot Figyelő (Logic Channels)</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  Mintavételi felbontás: 100µs | Kvadratúra Gray-Kód Fázis
                </span>
              </div>

              <div className="flex-1 grid grid-cols-1 divide-y divide-slate-800/60 py-2 overflow-y-auto">
                {[
                  { pin: 18, name: 'GPIO 18 (Rotary CLK)', color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
                  { pin: 19, name: 'GPIO 19 (Rotary DT)', color: 'border-sky-500 text-sky-400 bg-sky-500/10' },
                  { pin: 23, name: 'GPIO 23 (Rotary SW Gomb)', color: 'border-amber-500 text-amber-400 bg-amber-500/10' },
                  { pin: 2, name: 'GPIO 2 (Beépített LED)', color: 'border-violet-500 text-violet-400 bg-violet-500/10' }
                ].map(ch => {
                  const state = gpioStates.get(ch.pin);
                  const isHigh = state?.digitalValue === 1;

                  return (
                    <div key={ch.pin} className="flex items-center space-x-4 py-1.5 px-2">
                      <div className="w-48 shrink-0 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">{ch.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          isHigh ? ch.color : 'border-slate-800 bg-slate-900 text-slate-500'
                        }`}>
                          {isHigh ? 'HIGH (1)' : 'LOW (0)'}
                        </span>
                      </div>

                      {/* Visual Timing Bar representation */}
                      <div className="flex-1 h-6 bg-slate-900 border border-slate-800 rounded relative overflow-hidden flex items-center px-1">
                        <div 
                          className={`h-4 rounded transition-all duration-150 ${isHigh ? 'w-full ' + ch.color : 'w-0'}`}
                          style={{
                            backgroundImage: isHigh 
                              ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px)'
                              : 'none'
                          }}
                        />
                        <div className="absolute right-2 text-[10px] text-slate-500 font-mono">
                          Mód: {state?.mode || 'INPUT'} | ADC: {state?.analogValue || 0}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WIRELESS (WIFI & BLE) */}
          {activeTab === 'wireless' && (() => {
            const wifiState = virtualWifi.getState();
            const webServer = virtualWifi.getWebServer();
            const bleState = virtualBle.getState();

            return (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden">
                  {/* Virtual WebServer Panel */}
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-4 h-4 text-violet-400" />
                          <span className="font-semibold text-slate-200 text-xs">Virtuális WebServer (HTTP 80)</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          webServer.isRunning 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {webServer.isRunning ? `ONLINE (${wifiState.localIP || wifiState.softAPIP})` : 'OFFLINE'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mb-2">
                        Reagál a beágyazott REST API hívásokra és HTML oldal kiszolgálásra.
                      </p>

                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Regisztrált végpontok ({webServer.routes.length}):</div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800/80 text-[11px] space-y-1 font-mono max-h-20 overflow-y-auto">
                          {webServer.routes.length === 0 ? (
                            <div className="text-slate-600 italic">Nincs regisztrált route (pl. server.on("/", ...))</div>
                          ) : (
                            webServer.routes.map((r, i) => (
                              <div key={i} className="text-violet-300">
                                {r.method} {r.path} <span className="text-slate-500">- Kezelő csatolva</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">WiFi SSID: {wifiState.ssid || 'Nincs csatlakozva'}</span>
                      <button 
                        onClick={() => {
                          const res = virtualWifi.simulateHttpRequest('/api/sensor', 'GET');
                          logger.info('WIFI', `HTTP GET /api/sensor tesztválasz: [${res.status}] ${res.body}`);
                        }}
                        className="bg-violet-600 hover:bg-violet-500 text-white px-2 py-0.5 rounded text-[10px] transition"
                      >
                        GET /api/sensor Teszt
                      </button>
                    </div>
                  </div>

                  {/* Virtual BLE GATT Explorer */}
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Bluetooth className="w-4 h-4 text-sky-400" />
                          <span className="font-semibold text-slate-200 text-xs">BLE GATT Server (Bluetooth 4.2 / 5.0)</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          bleState.isAdvertising 
                            ? 'bg-sky-950 text-sky-400 border border-sky-800 animate-pulse' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {bleState.isAdvertising ? 'HIRDETÉS (ADV ON)' : 'OFFLINE'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mb-2">
                        Eszköznév: <span className="text-sky-300 font-bold">{bleState.deviceName}</span>
                      </p>

                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Szolgáltatások ({bleState.services.length}):</div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800/80 text-[11px] space-y-1 font-mono max-h-20 overflow-y-auto">
                          {bleState.services.length === 0 ? (
                            <div className="text-slate-600 italic">Nincs aktív BLE szolgáltatás</div>
                          ) : (
                            bleState.services.map((s, i) => (
                              <div key={i} className="text-sky-300">
                                {s.uuid} <span className="text-slate-500">({s.name})</span>
                                {s.characteristics.map(c => (
                                  <div key={c.uuid} className="text-emerald-300 pl-3">
                                    ↳ {c.uuid} [{c.properties.join(',')}] {c.value ? `(${c.value})` : ''}
                                  </div>
                                ))}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Csatlakozott BLE kliens: {bleState.connectedClients}</span>
                      <span className="flex items-center space-x-1 text-emerald-400 text-[10px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Auto-Sync Aktív</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* GPIO PINS MATRIX */}
          {activeTab === 'pins' && (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-1 px-2">GPIO Láb</th>
                    <th className="py-1 px-2">Mód</th>
                    <th className="py-1 px-2">Digitális Szint</th>
                    <th className="py-1 px-2">Analóg ADC (0-4095)</th>
                    <th className="py-1 px-2">Feszültség (V)</th>
                    <th className="py-1 px-2">PWM Kitöltés</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {[2, 4, 5, 18, 19, 21, 22, 23, 34, 35].map(pin => {
                    const st = gpioStates.get(pin);
                    return (
                      <tr key={pin} className="hover:bg-slate-900/50">
                        <td className="py-1 px-2 font-bold text-emerald-400">GPIO {pin}</td>
                        <td className="py-1 px-2">{st?.mode || 'INPUT'}</td>
                        <td className="py-1 px-2">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            st?.digitalValue === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {st?.digitalValue === 1 ? 'HIGH (1)' : 'LOW (0)'}
                          </span>
                        </td>
                        <td className="py-1 px-2">{st?.analogValue || 0}</td>
                        <td className="py-1 px-2">{(st?.voltage || 0).toFixed(2)} V</td>
                        <td className="py-1 px-2">{st?.pwmDuty || 0} / 255</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* XTENSA LX6 CPU CORE & MEMORY INSPECTOR */}
          {activeTab === 'xtensaCore' && (
            <div className="flex-1 overflow-hidden">
              <CpuRegisterInspector />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

