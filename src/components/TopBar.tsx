import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  Download, 
  Plus, 
  Cpu, 
  Gauge, 
  Layers,
  Zap,
  Usb,
  Code2,
  Columns2,
  FolderTree,
  Sliders
} from 'lucide-react';
import { SimulationState, ESPProject } from '../types/esp32';
import { projectManager } from '../project/projectManager';
import { ProjectExporter } from '../project/exporter';
import { hardwareSerial, USBDeviceInfo, SerialConnectionState } from '../core/hardwareSerial';

export type WorkspaceViewMode = 'code' | 'split' | 'hardware';

interface TopBarProps {
  project: ESPProject;
  simulationState: SimulationState;
  speedMultiplier: number;
  viewMode: WorkspaceViewMode;
  onViewModeChange: (mode: WorkspaceViewMode) => void;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onResetSimulation: () => void;
  onStepSimulation: () => void;
  onSpeedChange: (speed: number) => void;
  onOpenProjectManagerModal: () => void;
  onOpenTemplateModal: () => void;
  onOpenCircuitModal: () => void;
  onOpenHardwareSerialModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  simulationState,
  speedMultiplier,
  viewMode,
  onViewModeChange,
  onStartSimulation,
  onPauseSimulation,
  onResetSimulation,
  onStepSimulation,
  onSpeedChange,
  onOpenProjectManagerModal,
  onOpenTemplateModal,
  onOpenCircuitModal,
  onOpenHardwareSerialModal
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState(project.metadata.name);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [usbDevice, setUsbDevice] = useState<USBDeviceInfo | null>(hardwareSerial.getAttachedDevice());
  const [hwState, setHwState] = useState<SerialConnectionState>(hardwareSerial.getState());

  useEffect(() => {
    const unsub = hardwareSerial.subscribe({
      onDeviceChange: (_isAttached, device) => setUsbDevice(device || null),
      onStateChange: (st) => setHwState(st)
    });
    return unsub;
  }, []);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (projectName.trim() && projectName !== project.metadata.name) {
      projectManager.updateMetadata(projectName.trim(), project.metadata.description);
    }
  };

  const handleExportArduino = async () => {
    setExportDropdownOpen(false);
    const blob = await ProjectExporter.exportToArduinoZip(project);
    ProjectExporter.downloadBlob(blob, `${project.metadata.name.replace(/\s+/g, '_')}_arduino.zip`);
  };

  const handleExportPlatformIO = async () => {
    setExportDropdownOpen(false);
    const blob = await ProjectExporter.exportToPlatformIOZip(project);
    ProjectExporter.downloadBlob(blob, `${project.metadata.name.replace(/\s+/g, '_')}_platformio.zip`);
  };

  const handleExportJson = () => {
    setExportDropdownOpen(false);
    const jsonStr = ProjectExporter.exportToJson(project);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    ProjectExporter.downloadBlob(blob, `${project.metadata.name.replace(/\s+/g, '_')}.espproj`);
  };

  return (
    <header className="h-13 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between select-none shrink-0 overflow-x-auto no-scrollbar gap-2">
      {/* 1. Bal szekció: Logo & Projekt név & Lapka */}
      <div className="flex items-center space-x-2 shrink-0">
        <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 h-8 rounded-lg text-xs font-bold tracking-wide whitespace-nowrap">
          <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>ESP32 SIM</span>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-0.5 shrink-0" />

        {/* Projekt Név Szerkesztő */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
              autoFocus
              className="bg-slate-800 border border-emerald-500 text-slate-100 text-xs font-semibold px-2 h-8 rounded-lg focus:outline-none w-44 shrink-0"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-xs font-semibold text-slate-200 hover:text-emerald-400 hover:bg-slate-800/70 px-2 h-8 rounded-lg transition flex items-center max-w-[190px] truncate whitespace-nowrap shrink-0"
              title="Kattints az átnevezéshez"
            >
              <span className="truncate">{project.metadata.name}</span>
            </button>
          )}

          <span className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 h-6 flex items-center rounded-md border border-slate-800 whitespace-nowrap shrink-0">
            {project.circuit.board}
          </span>

          <button
            onClick={onOpenProjectManagerModal}
            className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 px-2.5 h-8 rounded-lg transition whitespace-nowrap cursor-pointer shrink-0"
            title="Projektkezelő megnyitása (Tallózás, Új, Import/Export, Beállítások)"
          >
            <FolderTree className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Projektek</span>
          </button>
        </div>
      </div>

      {/* 2. Középső szekció: Szimuláció Vezérlő Pult & Nézetváltó */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Szimuláció Végrehajtási Gombok */}
        <div className="flex items-center space-x-1 bg-slate-950/80 border border-slate-800 px-1.5 h-8 rounded-lg shrink-0">
          {simulationState === 'RUNNING' ? (
            <button
              onClick={onPauseSimulation}
              className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-2.5 h-6 rounded shadow-sm transition whitespace-nowrap cursor-pointer"
              title="Szimuláció szüneteltetése (Pause)"
            >
              <Pause className="w-3 h-3 fill-current shrink-0" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onStartSimulation}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2.5 h-6 rounded shadow-sm transition whitespace-nowrap cursor-pointer"
              title="Szimuláció indítása (Run)"
            >
              <Play className="w-3 h-3 fill-current shrink-0" />
              <span>Run</span>
            </button>
          )}

          <button
            onClick={onStepSimulation}
            disabled={simulationState !== 'PAUSED'}
            className="p-1 h-6 w-6 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            title="Egy ciklus lépés (Step)"
          >
            <StepForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onResetSimulation}
            className="p-1 h-6 w-6 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition cursor-pointer"
            title="Újraindítás (Reset)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-slate-800 mx-0.5 shrink-0" />

          {/* Sebességválasztó */}
          <div className="flex items-center space-x-1 text-slate-400 shrink-0">
            <Gauge className="w-3 h-3 text-slate-500" />
            <select
              value={speedMultiplier}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-[11px] font-medium rounded h-6 px-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1.0x</option>
              <option value={2}>2.0x</option>
              <option value={5}>5.0x</option>
            </select>
          </div>

          <div className="h-3.5 w-px bg-slate-800 mx-0.5 shrink-0" />

          {/* Állapot Jelző Címke */}
          <div className="flex items-center space-x-1.5 px-1 shrink-0">
            {simulationState === 'RUNNING' && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            {simulationState === 'PAUSED' && <span className="h-2 w-2 rounded-full bg-amber-400" />}
            {simulationState === 'STOPPED' && <span className="h-2 w-2 rounded-full bg-slate-600" />}
            {simulationState === 'ERROR' && <span className="h-2 w-2 rounded-full bg-rose-500" />}
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider whitespace-nowrap">
              {simulationState}
            </span>
          </div>
        </div>

        {/* Nézetválasztó Pill Gombok (Kód | Osztott | Hardver Labor) */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 p-0.5 h-8 rounded-lg text-xs select-none shrink-0">
          <button
            onClick={() => onViewModeChange('code')}
            className={`flex items-center space-x-1.5 px-2.5 h-7 rounded-md transition font-medium whitespace-nowrap cursor-pointer ${
              viewMode === 'code'
                ? 'bg-slate-800 text-emerald-400 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Csak forráskód szerkesztő"
          >
            <Code2 className="w-3.5 h-3.5 shrink-0" />
            <span>Kód</span>
          </button>

          <button
            onClick={() => onViewModeChange('split')}
            className={`flex items-center space-x-1.5 px-2.5 h-7 rounded-md transition font-medium whitespace-nowrap cursor-pointer ${
              viewMode === 'split'
                ? 'bg-slate-800 text-emerald-400 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Osztott nézet (Kód + Hardver oldalsáv)"
          >
            <Columns2 className="w-3.5 h-3.5 shrink-0" />
            <span>Osztott</span>
          </button>

          <button
            onClick={() => onViewModeChange('hardware')}
            className={`flex items-center space-x-1.5 px-3 h-7 rounded-md transition font-medium whitespace-nowrap cursor-pointer ${
              viewMode === 'hardware'
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Hardver Laboratórium nézet (Nagy felület, görgetés nélkül)"
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>Hardver Labor</span>
          </button>
        </div>
      </div>

      {/* 3. Jobb szekció: Eszközök, Áramkör, Sablonok, Flasher, Export */}
      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          onClick={onOpenCircuitModal}
          className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/90 border border-slate-700/80 px-2.5 h-8 rounded-lg transition whitespace-nowrap cursor-pointer"
          title="Áramköri bekötések és perifériák konfigurálása"
        >
          <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>Áramkör</span>
        </button>

        <button
          onClick={onOpenTemplateModal}
          className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/90 border border-slate-700/80 px-2.5 h-8 rounded-lg transition whitespace-nowrap cursor-pointer"
          title="Új projekt létrehozása sablonból"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Sablonok</span>
        </button>

        <button
          onClick={() => {
            if (confirm('Visszaállítod a projektet az alapértelmezett FeederMate sablonra?')) {
              projectManager.resetToDefault();
            }
          }}
          className="p-1.5 h-8 w-8 flex items-center justify-center text-slate-400 hover:text-amber-400 bg-slate-800 hover:bg-slate-700/90 border border-slate-700/80 rounded-lg transition cursor-pointer shrink-0"
          title="Alapértelmezett sablon visszaállítása"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenHardwareSerialModal}
          className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 h-8 rounded-lg shadow-sm transition whitespace-nowrap cursor-pointer shrink-0 ${
            hwState === 'CONNECTED'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/40'
              : usbDevice
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-slate-800 hover:bg-slate-700/90 text-slate-300 border border-slate-700/80'
          }`}
          title={
            hwState === 'CONNECTED'
              ? 'Fizikai ESP32 csatlakoztatva'
              : usbDevice
              ? `USB Eszköz észlelve: ${usbDevice.chipName}`
              : 'Fizikai ESP32 flashelés & USB Soros kapcsolat'
          }
        >
          {hwState === 'CONNECTED' ? (
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shrink-0" />
          ) : usbDevice ? (
            <Usb className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          )}
          <span>{hwState === 'CONNECTED' ? 'ESP32 Élő' : 'Flasher'}</span>
        </button>

        {/* Exportálás Lenyíló Menü */}
        <div className="relative shrink-0">
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="flex items-center space-x-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 px-2.5 h-8 rounded-lg shadow-sm transition whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export</span>
          </button>

          {exportDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
              <button
                onClick={handleExportArduino}
                className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-emerald-400 flex items-center space-x-2 transition cursor-pointer"
              >
                <span>📦 Arduino IDE (.ZIP vázlat)</span>
              </button>
              <button
                onClick={handleExportPlatformIO}
                className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-emerald-400 flex items-center space-x-2 transition cursor-pointer"
              >
                <span>🚀 PlatformIO Projekt (.ZIP)</span>
              </button>
              <div className="my-1 border-t border-slate-800" />
              <button
                onClick={handleExportJson}
                className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-emerald-400 flex items-center space-x-2 transition cursor-pointer"
              >
                <span>💾 .espproj Projekt Mentés</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
