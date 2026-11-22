import React, { useState } from 'react';
import { RotateCw, RotateCcw, CircleDot } from 'lucide-react';

interface RotaryEncoderViewProps {
  position: number;
  isPressed: boolean;
  onRotate: (direction: 'CW' | 'CCW') => void;
  onButtonPress: () => void;
  onButtonRelease: () => void;
  clkPin?: number;
  dtPin?: number;
  swPin?: number;
}

export const RotaryEncoderView: React.FC<RotaryEncoderViewProps> = ({
  position,
  isPressed,
  onRotate,
  onButtonPress,
  onButtonRelease,
  clkPin = 18,
  dtPin = 19,
  swPin = 23
}) => {
  const [angle, setAngle] = useState(0);

  const handleStepCW = () => {
    setAngle(prev => (prev + 18) % 360);
    onRotate('CW');
  };

  const handleStepCCW = () => {
    setAngle(prev => (prev - 18 + 360) % 360);
    onRotate('CCW');
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleStepCW();
    } else {
      handleStepCCW();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center space-y-2 select-none shadow-md">
      {/* Header */}
      <div className="w-full flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
          <CircleDot className="w-4 h-4 text-emerald-400" />
          <span>KY-040 Rotary Encoder</span>
        </span>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
          Pozíció: <strong className="text-emerald-400 font-bold">{position}</strong>
        </span>
      </div>

      {/* Interactive Rotary Dial */}
      <div 
        onWheel={handleWheel}
        className="relative w-28 h-28 flex items-center justify-center cursor-grab active:cursor-grabbing my-1"
        title="Görgess az egérrel vagy kattints a forgatáshoz"
      >
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-slate-700/60 bg-gradient-to-b from-slate-800 to-slate-950 shadow-inner flex items-center justify-center">
          {/* Tick marks around the dial */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-2 bg-slate-600/70 rounded-full"
              style={{
                transform: `rotate(${i * 30}deg) translateY(-46px)`
              }}
            />
          ))}
        </div>

        {/* Rotating Center Knob */}
        <div
          className="relative w-20 h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 shadow-lg flex items-center justify-center transition-transform duration-100"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          {/* Center Push Button (SW) */}
          <button
            onMouseDown={onButtonPress}
            onMouseUp={onButtonRelease}
            onMouseLeave={isPressed ? onButtonRelease : undefined}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isPressed
                ? 'bg-emerald-500 scale-90 shadow-inner ring-4 ring-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 shadow-md'
            }`}
            title="Kattints a beépített SW gomb lenyomásához"
          >
            <span className={`text-[10px] font-bold ${isPressed ? 'text-slate-950' : 'text-slate-300'}`}>
              SW
            </span>
          </button>

          {/* Indicator Dot on the Knob */}
          <div className="absolute top-2 w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
        </div>
      </div>

      {/* Manual Step Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleStepCCW}
          className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded text-xs transition shadow"
          title="Forgatás balra (CCW)"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Balra</span>
        </button>

        <button
          onClick={handleStepCW}
          className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded text-xs transition shadow"
          title="Forgatás jobbra (CW)"
        >
          <span>Jobbra</span>
          <RotateCw className="w-3 h-3" />
        </button>
      </div>

      {/* Pinout Badges */}
      <div className="w-full pt-1 border-t border-slate-800/80 flex items-center justify-around text-[10px] font-mono text-slate-400">
        <span>CLK: <strong className="text-emerald-400">GPIO {clkPin}</strong></span>
        <span>DT: <strong className="text-emerald-400">GPIO {dtPin}</strong></span>
        <span>SW: <strong className="text-emerald-400">GPIO {swPin}</strong></span>
      </div>
    </div>
  );
};
