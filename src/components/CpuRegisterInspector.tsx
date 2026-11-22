import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Play, 
  Pause, 
  StepForward, 
  RotateCcw, 
  Layers, 
  Terminal, 
  Binary, 
  Search,
  Sparkles
} from 'lucide-react';
import { xtensaCpu, XtensaRegisters, DisassemblyLine } from '../core/xtensaCpu';

export const CpuRegisterInspector: React.FC = () => {
  const [regs, setRegs] = useState<XtensaRegisters>(xtensaCpu.getRegisters());
  const [disasm, setDisasm] = useState<DisassemblyLine[]>(xtensaCpu.getDisassembly());
  const [isRunning, setIsRunning] = useState<boolean>(xtensaCpu.isRunning);
  const [memAddress, setMemAddress] = useState<string>('0x3FFB0000');
  const [memBytes, setMemBytes] = useState<number[]>([]);

  const refreshState = () => {
    setRegs(xtensaCpu.getRegisters());
    setDisasm(xtensaCpu.getDisassembly());
    
    // Read 64 bytes of memory around memAddress
    const addr = parseInt(memAddress, 16) || 0x3FFB0000;
    const bytes: number[] = [];
    for (let i = 0; i < 64; i++) {
      bytes.push(xtensaCpu.read8(addr + i));
    }
    setMemBytes(bytes);
  };

  useEffect(() => {
    refreshState();
  }, [memAddress]);

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        for (let i = 0; i < 100; i++) {
          xtensaCpu.step();
        }
        refreshState();
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStep = () => {
    xtensaCpu.step();
    refreshState();
  };

  const handleToggleRun = () => {
    const next = !isRunning;
    setIsRunning(next);
    xtensaCpu.isRunning = next;
  };

  const handleReset = () => {
    setIsRunning(false);
    xtensaCpu.reset();
    refreshState();
  };

  const handleLoadDemo = () => {
    xtensaCpu.loadSampleDemoFirmware();
    refreshState();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-mono text-xs select-none overflow-hidden p-3 gap-3">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl shrink-0">
        <div className="flex items-center space-x-2 text-sky-400 font-bold">
          <Cpu className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Xtensa LX6 32-bit Gépi Kódú Processzormag</span>
          <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-emerald-400">
            240 MHz Dual-Core Virtual MMIO
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleLoadDemo}
            className="flex items-center space-x-1 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800 px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer"
            title="Mintaprogram betöltése (LED villogtató & GPIO MMIO)"
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span>Minta Gépi Kód</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          <button
            onClick={handleToggleRun}
            className={`flex items-center space-x-1 text-white font-semibold px-3 py-1 rounded-lg transition shadow text-[11px] cursor-pointer ${
              isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isRunning ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isRunning ? 'Pause' : 'Run Core'}</span>
          </button>

          <button
            onClick={handleStep}
            disabled={isRunning}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg border border-slate-700 transition cursor-pointer"
            title="1 Utasítás végrehajtása (Step)"
          >
            <StepForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition cursor-pointer"
            title="CPU Reset"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-hidden">
        {/* Left Column: CPU Registers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Binary className="w-3.5 h-3.5 text-emerald-400" />
              Regiszterek (CPU State)
            </span>
            <span className="text-[10px] text-slate-400">
              CCOUNT: <strong className="text-emerald-400">{regs.ccount}</strong>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {/* Special Registers */}
            <div className="grid grid-cols-2 gap-1.5 pb-2 border-b border-slate-800/80">
              <div className="bg-slate-950 p-1.5 rounded border border-slate-800 flex justify-between">
                <span className="text-amber-400 font-bold">PC</span>
                <span className="text-slate-100 font-bold">0x{regs.pc.toString(16).toUpperCase().padStart(8, '0')}</span>
              </div>
              <div className="bg-slate-950 p-1.5 rounded border border-slate-800 flex justify-between">
                <span className="text-sky-400 font-bold">PS</span>
                <span className="text-slate-300">0x{regs.ps.toString(16).toUpperCase().padStart(8, '0')}</span>
              </div>
              <div className="bg-slate-950 p-1.5 rounded border border-slate-800 flex justify-between">
                <span className="text-slate-400 font-bold">SAR</span>
                <span className="text-slate-300">{regs.sar}</span>
              </div>
              <div className="bg-slate-950 p-1.5 rounded border border-slate-800 flex justify-between">
                <span className="text-slate-400 font-bold">WBASE</span>
                <span className="text-slate-300">{regs.windowbase}</span>
              </div>
            </div>

            {/* General Purpose Registers A0 - A15 */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {regs.a.map((val, idx) => (
                <div key={idx} className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className={`${idx === 1 ? 'text-rose-400 font-bold' : idx === 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                    A{idx}{idx === 1 ? ' (SP)' : idx === 0 ? ' (RET)' : ''}
                  </span>
                  <span className="text-slate-200 font-mono">
                    0x{val.toString(16).toUpperCase().padStart(8, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column: Live Disassembly View */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              Disassembly (Utasításfolyam)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">IRAM / Flash</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px]">
            {disasm.map((line, i) => {
              const isCurrent = line.address === regs.pc;
              return (
                <div
                  key={i}
                  className={`px-2 py-1 rounded flex items-center justify-between transition ${
                    isCurrent
                      ? 'bg-sky-950 border border-sky-500/50 text-white font-bold shadow'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] ${isCurrent ? 'text-amber-400' : 'text-slate-500'}`}>
                      0x{line.address.toString(16).toUpperCase()}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isCurrent ? 'bg-sky-600 text-white' : 'bg-slate-800 text-sky-300'
                    }`}>
                      {line.mnemonic}
                    </span>
                    <span>{line.args}</span>
                  </div>

                  <span className="text-[9px] text-slate-500">
                    {line.raw.toString(16).toUpperCase().padStart(6, '0')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Memory Hexdump & MMIO View */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 gap-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Memória Hexdump
            </span>
            <div className="flex items-center space-x-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              <Search className="w-3 h-3 text-slate-500" />
              <input
                type="text"
                value={memAddress}
                onChange={(e) => setMemAddress(e.target.value)}
                className="bg-transparent text-slate-200 text-[10px] font-mono focus:outline-none w-20"
                placeholder="0x3FFB0000"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 text-[10px] font-mono text-slate-300">
            {Array.from({ length: 4 }).map((_, row) => {
              const rowAddr = (parseInt(memAddress, 16) || 0x3FFB0000) + row * 16;
              const rowBytes = memBytes.slice(row * 16, row * 16 + 16);
              const ascii = rowBytes
                .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
                .join('');

              return (
                <div key={row} className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-500 font-bold">
                    0x{rowAddr.toString(16).toUpperCase().padStart(8, '0')}:
                  </span>
                  <div className="flex space-x-1 text-slate-200 font-bold">
                    {rowBytes.map((b, bi) => (
                      <span key={bi} className={b > 0 ? 'text-emerald-400' : 'text-slate-600'}>
                        {b.toString(16).toUpperCase().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                  <span className="text-slate-400 tracking-wider">|{ascii}|</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
