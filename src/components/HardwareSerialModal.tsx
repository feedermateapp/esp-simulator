import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  Download, 
  Usb, 
  RotateCcw, 
  Terminal, 
  FileCode2, 
  FolderArchive, 
  Cpu, 
  Upload
} from 'lucide-react';
import { ESPProject } from '../types/esp32';
import { ProjectExporter } from '../project/exporter';
import { hardwareSerial, SerialConnectionState } from '../core/hardwareSerial';

interface HardwareSerialModalProps {
  project: ESPProject;
  isOpen: boolean;
  onClose: () => void;
}

export const HardwareSerialModal: React.FC<HardwareSerialModalProps> = ({
  project,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'flash' | 'export'>('flash');
  const [serialState, setSerialState] = useState<SerialConnectionState>(hardwareSerial.getState());
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [flashBaud, setFlashBaud] = useState<number>(115200);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [binFile, setBinFile] = useState<{ name: string; data: Uint8Array; address: number } | null>(null);
  const [customAddress, setCustomAddress] = useState<string>('0x10000');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const unsub = hardwareSerial.subscribe({
      onStateChange: (state, info) => {
        setSerialState(state);
        if (info) setStatusMsg(info);
      },
      onLog: (log) => {
        setLogs(prev => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${log}`]);
      },
      onProgress: (_idx, written, total) => {
        if (total > 0) {
          setProgress(Math.round((written / total) * 100));
        }
      }
    });
    return unsub;
  }, []);

  const handleConnect = async () => {
    await hardwareSerial.connect(baudRate);
  };

  const handleDisconnect = async () => {
    await hardwareSerial.disconnect();
  };

  const handleHardReset = async () => {
    await hardwareSerial.hardReset();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (buffer) {
        setBinFile({
          name: file.name,
          data: new Uint8Array(buffer),
          address: parseInt(customAddress, 16) || 0x10000
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const [flashFiles, setFlashFiles] = useState<Array<{ name: string; data: Uint8Array; address: number }>>([]);

  const handleLoadPrecompiledStep1 = async () => {
    try {
      setStatusMsg('FeederMate Step 1 komplett firmware csomag betöltése...');
      const [bootResp, partResp, bootAppResp, appResp] = await Promise.all([
        fetch('/firmware/bootloader.bin'),
        fetch('/firmware/partitions.bin'),
        fetch('/firmware/boot_app0.bin'),
        fetch('/firmware/feedermate_step1.bin')
      ]);

      if (!bootResp.ok || !partResp.ok || !appResp.ok) {
        throw new Error('Nem található valamelyik bináris');
      }

      const [bootBuf, partBuf, bootAppBuf, appBuf] = await Promise.all([
        bootResp.arrayBuffer(),
        partResp.arrayBuffer(),
        bootAppResp.arrayBuffer(),
        appResp.arrayBuffer()
      ]);

      const files = [
        { name: 'bootloader.bin (0x1000)', data: new Uint8Array(bootBuf), address: 0x1000 },
        { name: 'partitions.bin (0x8000)', data: new Uint8Array(partBuf), address: 0x8000 },
        { name: 'boot_app0.bin (0xe000)', data: new Uint8Array(bootAppBuf), address: 0xe000 },
        { name: 'feedermate_step1.bin (0x10000)', data: new Uint8Array(appBuf), address: 0x10000 }
      ];

      setFlashFiles(files);
      setBinFile(files[3]);
      setStatusMsg('FeederMate Step 1 teljes firmware (Bootloader + Partíciók + App) készen áll!');
    } catch (err: any) {
      setStatusMsg('Hiba a firmware betöltésekor: ' + err.message);
    }
  };

  const handleStartFlash = async () => {
    if (flashFiles.length > 0) {
      setProgress(0);
      await hardwareSerial.flashBinary(flashFiles.map(f => ({ data: f.data, address: f.address })), flashBaud);
      return;
    }

    if (!binFile) {
      setStatusMsg('Kérlek válassz ki egy .bin firmware fájlt vagy töltsd be az előre lefordítottat!');
      return;
    }

    setProgress(0);
    const addr = parseInt(customAddress, 16);
    const targetAddr = isNaN(addr) ? 0x10000 : addr;
    await hardwareSerial.flashBinary([{ data: binFile.data, address: targetAddr }], flashBaud);
  };

  const handleDownloadArduinoZip = async () => {
    setIsExporting(true);
    try {
      const blob = await ProjectExporter.exportToArduinoZip(project);
      ProjectExporter.downloadBlob(blob, `${project.metadata.name.replace(/\s+/g, '_')}_arduino.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPlatformIOZip = async () => {
    setIsExporting(true);
    try {
      const blob = await ProjectExporter.exportToPlatformIOZip(project);
      ProjectExporter.downloadBlob(blob, `${project.metadata.name.replace(/\s+/g, '_')}_platformio.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadJson = () => {
    const jsonStr = ProjectExporter.exportToJson(project);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    ProjectExporter.downloadBlob(blob, `${project.metadata.name.replace(/\s+/g, '_')}.espproj`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Usb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>Fizikai ESP32 Feltöltés & Hardverkapcsolat</span>
                {serialState === 'CONNECTED' && (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    USB Kapcsolat Aktív
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                Közvetlen Web Serial USB Flasher, Soros Monitor bridge és 1-kattintásos IDE ZIP csomagolás
              </p>
            </div>
          </div>

          {/* Tab Selector & Close */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('flash')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'flash'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Közvetlen USB Égetés</span>
              </button>

              <button
                onClick={() => setActiveTab('export')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'export'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>IDE Csomagok (.ZIP)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 bg-slate-950/40">
          {activeTab === 'flash' ? (
            <div className="space-y-5">
              {/* Connection Status Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-sky-400" />
                    <span>USB Soros Port Állapota:</span>
                    <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                      serialState === 'CONNECTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : serialState === 'FLASHING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : serialState === 'ERROR'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {serialState}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {statusMsg || 'Csatlakoztasd az ESP32-t USB-n (CP2102, CH340, CH9102 chipek támogatottak).'}
                  </p>
                </div>

                {/* Connection Action Buttons */}
                <div className="flex items-center space-x-2 shrink-0">
                  <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    disabled={serialState === 'CONNECTED' || serialState === 'FLASHING'}
                    className="bg-slate-950 text-slate-300 font-mono text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value={9600}>9600 baud</option>
                    <option value={115200}>115200 baud</option>
                    <option value={230400}>230400 baud</option>
                    <option value={460800}>460800 baud</option>
                    <option value={921600}>921600 baud</option>
                  </select>

                  {serialState === 'CONNECTED' ? (
                    <>
                      <button
                        onClick={handleHardReset}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
                        title="ESP32 Újraindítása (DTR/RTS)"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Hard Reset</span>
                      </button>
                      <button
                        onClick={handleDisconnect}
                        className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Leválasztás
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleConnect}
                      disabled={serialState === 'CONNECTING' || serialState === 'FLASHING'}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition shadow flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Usb className="w-3.5 h-3.5" />
                      <span>Csatlakozás USB-re</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Firmware Binary Flasher Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Firmware Bináris Égetés (esptool-js)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Flash Baud: 
                    <select
                      value={flashBaud}
                      onChange={(e) => setFlashBaud(Number(e.target.value))}
                      className="ml-1 bg-slate-950 text-slate-300 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-800"
                    >
                      <option value={115200}>115200 (Stabil / Ajánlott)</option>
                      <option value={230400}>230400 (Közepes)</option>
                      <option value={460800}>460800 (Gyors)</option>
                    </select>
                  </span>
                </div>

                {/* Precompiled quick action */}
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Előre lefordított FeederMate Step 1 Firmware</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      ST7789 2.4" Kijelző + Integrált Rotary + 1 Gomb (ESP32-S / D15, D4, D2 lábkiosztás)
                    </p>
                  </div>
                  <button
                    onClick={handleLoadPrecompiledStep1}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition shadow flex items-center space-x-1.5 shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Firmware Betöltése</span>
                  </button>
                </div>

                {/* Multi-file partitions preview */}
                {flashFiles.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 font-mono text-[11px]">
                    <div className="text-slate-400 font-bold uppercase text-[10px]">Égetendő partíciók:</div>
                    {flashFiles.map((f, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800/80">
                        <span className="text-emerald-400 font-semibold">{f.name}</span>
                        <span className="text-amber-400">0x{f.address.toString(16).toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* File Picker & Flash Offset */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">
                      Egyedi Firmware Bináris (.bin fájl):
                    </label>
                    <div className="flex items-center space-x-2">
                      <label className="flex-1 flex items-center justify-between px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition text-xs text-slate-300">
                        <span className="truncate font-mono">
                          {flashFiles.length > 0 ? `4 elemű csomag betöltve (${flashFiles.length} db bin)` : (binFile ? binFile.name : 'Válassz ki egy .bin fájlt vagy kattints a fenti gombra...')}
                        </span>
                        <Upload className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                        <input
                          type="file"
                          accept=".bin"
                          onChange={(e) => {
                            setFlashFiles([]);
                            handleFileSelect(e);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">
                      Flash Cím (Hex Offset):
                    </label>
                    <input
                      type="text"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="0x10000"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Progress Bar */}
                {serialState === 'FLASHING' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-amber-400 font-semibold">Égetés folyamatban...</span>
                      <span className="text-slate-300 font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-150"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Start Flash Button */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleStartFlash}
                    disabled={!binFile || serialState === 'FLASHING'}
                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2 rounded-xl transition shadow flex items-center space-x-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Firmware Égetése a Fizikai ESP32-re</span>
                  </button>
                </div>
              </div>

              {/* Terminal Logs Window */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-900 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    Hardver & Flasher Konzolos Logok:
                  </span>
                  <button
                    onClick={() => setLogs([])}
                    className="text-[10px] text-slate-500 hover:text-slate-300 transition"
                  >
                    Törlés
                  </button>
                </div>
                <div className="h-32 overflow-y-auto font-mono text-[10.5px] space-y-0.5 text-slate-300 select-text">
                  {logs.length === 0 ? (
                    <div className="text-slate-600 italic">Még nincsenek hardver események...</div>
                  ) : (
                    logs.map((l, i) => (
                      <div key={i} className="leading-relaxed whitespace-pre-wrap">
                        {l}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* IDE Export Section */
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                Töltsd le a projektet 1-kattintással komplett, azonnal fordítható és feltölthető forráskód csomagként:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Arduino IDE Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-slate-700 transition">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5 text-emerald-400 font-bold text-sm">
                      <FileCode2 className="w-5 h-5" />
                      <span>Arduino IDE Sketch Csomag (.ZIP)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Komplett Arduino mappa-struktúra (<code className="text-slate-200">main.ino</code>, <code className="text-slate-200">config.h</code>, modulok és áramköri leírás). Csak csomagold ki és kattints a <strong>Feltöltés</strong> gombra az Arduino IDE-ben!
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadArduinoZip}
                    disabled={isExporting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 rounded-xl transition shadow flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>Arduino IDE .ZIP Letöltése</span>
                  </button>
                </div>

                {/* PlatformIO Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-slate-700 transition">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5 text-sky-400 font-bold text-sm">
                      <FolderArchive className="w-5 h-5" />
                      <span>PlatformIO Projekt Csomag (.ZIP)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Professzionális VS Code projekt előre konfigurált <code className="text-slate-200">platformio.ini</code> fájllal, automatikus könyvtár-függőségekkel (<code className="text-slate-200">Adafruit SSD1306, BMP280</code>).
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadPlatformIOZip}
                    disabled={isExporting}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs py-2.5 rounded-xl transition shadow flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>PlatformIO .ZIP Letöltése</span>
                  </button>
                </div>
              </div>

              {/* JSON Project Backup */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">ESP32 Sim Nyers Projektfájl (.espproj)</div>
                  <div className="text-[11px] text-slate-400">Teljes szimulátor állapot, forrásfájlok és áramköri kapcsolási rajz egyetlen JSON-ban.</div>
                </div>
                <button
                  onClick={handleDownloadJson}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON Mentés</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
