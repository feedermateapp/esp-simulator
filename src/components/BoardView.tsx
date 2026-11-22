import React from 'react';
import { Cpu, Wifi } from 'lucide-react';
import { GPIOPinState } from '../types/esp32';

interface BoardViewProps {
  gpioStates: Map<number, GPIOPinState>;
  boardName?: string;
}

export const BoardView: React.FC<BoardViewProps> = ({
  gpioStates,
  boardName = 'ESP32 DevKit V1'
}) => {
  const leftPins = [
    { label: '3V3', pin: -1, isPower: true },
    { label: 'GND', pin: -1, isGnd: true },
    { label: 'D15', pin: 15 },
    { label: 'D2', pin: 2, isLed: true },
    { label: 'D4', pin: 4 },
    { label: 'RX2', pin: 16 },
    { label: 'TX2', pin: 17 },
    { label: 'D5', pin: 5 },
    { label: 'D18', pin: 18, isRotary: true },
    { label: 'D19', pin: 19, isRotary: true },
    { label: 'D21', pin: 21, isI2C: true },
    { label: 'RX0', pin: 3 },
    { label: 'TX0', pin: 1 },
    { label: 'D22', pin: 22, isI2C: true },
    { label: 'D23', pin: 23, isRotary: true }
  ];

  const rightPins = [
    { label: 'VIN', pin: -1, isPower: true },
    { label: 'GND', pin: -1, isGnd: true },
    { label: 'D13', pin: 13 },
    { label: 'D12', pin: 12 },
    { label: 'D14', pin: 14 },
    { label: 'D27', pin: 27 },
    { label: 'D26', pin: 26 },
    { label: 'D25', pin: 25 },
    { label: 'D33', pin: 33 },
    { label: 'D32', pin: 32 },
    { label: 'D35', pin: 35 },
    { label: 'D34', pin: 34 },
    { label: 'VN', pin: 39 },
    { label: 'VP', pin: 36 },
    { label: 'EN', pin: -1 }
  ];

  const renderPinIndicator = (pinNum: number) => {
    if (pinNum === -1) return null;
    const st = gpioStates.get(pinNum);
    const isHigh = st?.digitalValue === 1;
    return (
      <span className={`w-2 h-2 rounded-full inline-block transition-colors ${
        isHigh 
          ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' 
          : 'bg-slate-700'
      }`} />
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center space-y-2 select-none shadow-md">
      {/* Header */}
      <div className="w-full flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>{boardName}</span>
        </span>
        <span className="text-[10px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono flex items-center space-x-1">
          <Wifi className="w-3 h-3" />
          <span>Xtensa Dual-Core</span>
        </span>
      </div>

      {/* PCB Visual Board */}
      <div className="relative bg-[#1b382b] border-2 border-[#2b5944] rounded-lg p-3 w-full max-w-sm flex justify-between shadow-xl my-1">
        {/* Left Pin Header */}
        <div className="flex flex-col space-y-1">
          {leftPins.map((p, idx) => (
            <div key={idx} className="flex items-center space-x-1.5 text-[9px] font-mono text-slate-300">
              <div className="w-3 h-3 bg-amber-400/80 rounded-sm border border-amber-600 shadow-inner flex items-center justify-center">
                <div className="w-1 h-1 bg-slate-900 rounded-full" />
              </div>
              <span className={`font-semibold ${
                p.isPower ? 'text-rose-400' :
                p.isGnd ? 'text-slate-400' :
                p.isI2C ? 'text-sky-300' :
                p.isRotary ? 'text-emerald-300' : 'text-slate-300'
              }`}>
                {p.label}
              </span>
              {renderPinIndicator(p.pin)}
            </div>
          ))}
        </div>

        {/* Center ESP32 Metal Shield & Antenna */}
        <div className="flex-1 flex flex-col items-center justify-between px-2 py-1">
          {/* Antenna */}
          <div className="w-14 h-4 bg-amber-600/60 rounded-t border-t-2 border-x-2 border-amber-500/80 flex items-center justify-center">
            <Wifi className="w-3 h-3 text-amber-300" />
          </div>

          {/* Metal RF Shield */}
          <div className="w-20 h-24 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-400 rounded border border-slate-500 shadow-md p-1 flex flex-col items-center justify-center text-slate-900">
            <Cpu className="w-6 h-6 text-slate-800 mb-0.5" />
            <span className="text-[9px] font-bold tracking-tighter">ESP-WROOM-32</span>
            <span className="text-[7px] font-mono text-slate-700">CE 0x7001</span>
          </div>

          {/* Micro USB Port */}
          <div className="w-8 h-3 bg-slate-400 rounded-b border border-slate-500 shadow-inner flex items-center justify-center">
            <div className="w-4 h-1 bg-slate-800 rounded-sm" />
          </div>
        </div>

        {/* Right Pin Header */}
        <div className="flex flex-col space-y-1 items-end">
          {rightPins.map((p, idx) => (
            <div key={idx} className="flex items-center space-x-1.5 text-[9px] font-mono text-slate-300">
              {renderPinIndicator(p.pin)}
              <span className={`font-semibold ${
                p.isPower ? 'text-rose-400' :
                p.isGnd ? 'text-slate-400' : 'text-slate-300'
              }`}>
                {p.label}
              </span>
              <div className="w-3 h-3 bg-amber-400/80 rounded-sm border border-amber-600 shadow-inner flex items-center justify-center">
                <div className="w-1 h-1 bg-slate-900 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
