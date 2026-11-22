import React from 'react';
import { ToggleLeft, Circle, Lightbulb } from 'lucide-react';

export interface PeripheralItem {
  id: string;
  name: string;
  pins: Record<string, number>;
}

interface ButtonViewProps {
  buttons?: PeripheralItem[];
  buttonStates: Record<number, boolean>;
  onButtonPress: (pin: number) => void;
  onButtonRelease: (pin: number) => void;
  leds?: PeripheralItem[];
  ledStates: Record<number, { on: boolean; pwm: number }>;
}

export const ButtonView: React.FC<ButtonViewProps> = ({
  buttons = [],
  buttonStates,
  onButtonPress,
  onButtonRelease,
  leds = [],
  ledStates
}) => {
  // Fallback if no buttons defined in circuit
  const displayButtons = buttons.length > 0
    ? buttons.map(b => ({ pin: b.pins.pin || 14, label: b.name }))
    : [
        { pin: 14, label: '1. CAST (Dobás)' },
        { pin: 27, label: '2. ROD (Botváltó)' },
        { pin: 32, label: '3. BACK (Vissza)' }
      ];

  const displayLeds = leds.length > 0
    ? leds.map(l => ({ pin: l.pins.pin || 13, label: l.name }))
    : [
        { pin: 13, label: 'Riasztó / Állapot LED' }
      ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col space-y-3 select-none shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
          <ToggleLeft className="w-4 h-4 text-emerald-400" />
          <span>Fizikai Nyomógombok ({displayButtons.length} db)</span>
        </span>
        <span className="text-[10px] text-slate-500 font-mono">PULLUP</span>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-1 gap-2">
        {displayButtons.map(({ pin, label }) => {
          const isPressed = buttonStates[pin] || false;
          return (
            <button
              key={pin}
              onMouseDown={() => onButtonPress(pin)}
              onMouseUp={() => onButtonRelease(pin)}
              onMouseLeave={isPressed ? () => onButtonRelease(pin) : undefined}
              className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                isPressed
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 scale-[0.98] shadow-inner ring-1 ring-emerald-500/50'
                  : 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Circle className={`w-3.5 h-3.5 shrink-0 ${isPressed ? 'fill-emerald-400 text-emerald-400' : 'text-slate-600'}`} />
                <span className="text-xs font-semibold">{label}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                GPIO {pin} ({isPressed ? 'LOW' : 'HIGH'})
              </span>
            </button>
          );
        })}
      </div>

      {/* Status LEDs */}
      <div className="pt-2 border-t border-slate-800/80 space-y-2">
        <div className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Állapotjelző LED-ek ({displayLeds.length} db)</span>
        </div>

        {displayLeds.map(({ pin, label }) => {
          const led = ledStates[pin] || { on: false, pwm: 0 };
          return (
            <div key={pin} className="flex items-center justify-between bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800 w-full">
              <div className="flex items-center space-x-2">
                <Lightbulb className={`w-4 h-4 shrink-0 transition-colors ${
                  led.on 
                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' 
                    : 'text-slate-600'
                }`} />
                <span className="text-xs font-semibold text-slate-200">{label}</span>
              </div>
              <div className="text-[10px] font-mono">
                <span className={`px-2 py-0.5 rounded ${led.on ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'bg-slate-900 text-slate-500'}`}>
                  GPIO {pin}: {led.on ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
