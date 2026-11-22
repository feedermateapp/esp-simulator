import React from 'react';
import { Thermometer, Gauge, Mountain, Sun, CloudRain } from 'lucide-react';

interface BMP280ViewProps {
  temperature: number;
  pressure: number;
  onTemperatureChange: (temp: number) => void;
  onPressureChange: (press: number) => void;
  i2cAddress?: string;
  sdaPin?: number;
  sclPin?: number;
}

export const BMP280View: React.FC<BMP280ViewProps> = ({
  temperature,
  pressure,
  onTemperatureChange,
  onPressureChange,
  i2cAddress = '0x76',
  sdaPin = 21,
  sclPin = 22
}) => {
  // Barometric formula: h = 44330 * (1 - (P / 1013.25)^(1/5.255))
  const altitude = 44330 * (1 - Math.pow(pressure / 1013.25, 1 / 5.255));
  const isSunny = pressure >= 1013.25;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col space-y-3 select-none shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
          <Thermometer className="w-4 h-4 text-sky-400" />
          <span>BMP280 / BME280 Szenzor</span>
        </span>
        <span className="text-[10px] bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded font-mono">
          I2C: {i2cAddress}
        </span>
      </div>

      {/* Temperature Control */}
      <div className="space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center space-x-1">
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
            <span>Hőmérséklet:</span>
          </span>
          <strong className="text-slate-100 font-mono text-sm">
            {temperature.toFixed(1)} °C
          </strong>
        </div>
        <input
          type="range"
          min="-40"
          max="85"
          step="0.5"
          value={temperature}
          onChange={(e) => onTemperatureChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
        />
        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
          <span>-40 °C</span>
          <span>+25 °C</span>
          <span>+85 °C</span>
        </div>
      </div>

      {/* Pressure Control */}
      <div className="space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center space-x-1">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span>Légnyomás:</span>
          </span>
          <strong className="text-slate-100 font-mono text-sm">
            {pressure.toFixed(1)} hPa
          </strong>
        </div>
        <input
          type="range"
          min="300"
          max="1100"
          step="1"
          value={pressure}
          onChange={(e) => onPressureChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
          <span>300 hPa</span>
          <span>1013.25 (Tengerszint)</span>
          <span>1100 hPa</span>
        </div>
      </div>

      {/* Computed Telemetry Dashboard */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex items-center space-x-2">
          <Mountain className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="truncate">
            <div className="text-[10px] text-slate-500">Magasság</div>
            <div className="font-mono font-bold text-emerald-300 truncate">
              {altitude.toFixed(0)} m
            </div>
          </div>
        </div>

        <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex items-center space-x-2">
          {isSunny ? (
            <Sun className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <CloudRain className="w-4 h-4 text-sky-400 shrink-0" />
          )}
          <div className="truncate">
            <div className="text-[10px] text-slate-500">Időjárás trend</div>
            <div className="font-mono font-bold text-slate-200 text-[11px] truncate">
              {isSunny ? "Napos / Magas" : "Esős / Alacsony"}
            </div>
          </div>
        </div>
      </div>

      {/* Pinout */}
      <div className="pt-1 border-t border-slate-800/80 flex items-center justify-around text-[10px] font-mono text-slate-400">
        <span>SDA: <strong className="text-sky-400">GPIO {sdaPin}</strong></span>
        <span>SCL: <strong className="text-sky-400">GPIO {sclPin}</strong></span>
      </div>
    </div>
  );
};
