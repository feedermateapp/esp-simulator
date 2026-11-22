import React, { useState } from 'react';
import { 
  Plus, 
  Cpu, 
  Info,
  Layers,
  Settings2
} from 'lucide-react';
import { PeripheralConfig, PeripheralType } from '../types/esp32';

interface CircuitCanvasViewProps {
  peripherals: PeripheralConfig[];
  onUpdatePin: (id: string, pinKey: string, newPinVal: number) => void;
  onRemovePeripheral: (id: string) => void;
  onAddPeripheral: (type: PeripheralType) => void;
}

// Fixed distinct vibrant color palette per GPIO pin
const GPIO_PIN_COLORS: Record<number, string> = {
  2: '#38bdf8',  // Sky Blue (LED)
  4: '#ec4899',  // Hot Pink (Button)
  5: '#a3e635',  // Lime Green
  12: '#f43f5e', // Rose
  13: '#fb7185', // Coral
  14: '#34d399', // Mint Green
  15: '#818cf8', // Indigo
  16: '#c084fc', // Lavender
  17: '#fb923c', // Peach Orange
  18: '#06b6d4', // Bright Cyan (Rotary CLK)
  19: '#a855f7', // Purple (Rotary DT)
  21: '#10b981', // Emerald Green (I2C SDA)
  22: '#eab308', // Amber/Yellow (I2C SCL)
  23: '#f97316', // Bright Orange (Rotary SW)
  25: '#d946ef', // Fuchsia
  26: '#0284c7', // Deep Sky Blue
  27: '#84cc16', // Bright Lime
  32: '#e11d48', // Crimson Red
  33: '#9333ea', // Deep Violet
  34: '#14b8a6', // Teal (Potentiometer)
  35: '#6366f1', // Royal Blue
  36: '#0ea5e9', // Sky Blue
  39: '#22d3ee'  // Light Cyan
};

// Fallback signal colors
const WIRE_COLORS: Record<string, string> = {
  vcc: '#ef4444',
  '+': '#ef4444',
  gnd: '#64748b',
  '-': '#64748b',
  scl: '#eab308',
  sda: '#10b981',
  clk: '#06b6d4',
  dt: '#a855f7',
  sw: '#f97316',
  pin: '#38bdf8',
  anode: '#ec4899',
  cathode: '#64748b',
  out: '#14b8a6',
  pwm: '#8b5cf6'
};

interface ESPPinDef {
  pin: number;
  name: string;
  type: 'GPIO' | 'ADC' | 'DAC' | 'I2C' | 'UART' | 'POWER' | 'GND' | 'RESET' | 'CLK';
}

const ESP32_LEFT_HEADER: ESPPinDef[] = [
  { pin: -1, name: '3V3', type: 'POWER' },
  { pin: -2, name: 'EN', type: 'RESET' },
  { pin: 36, name: 'VP (36)', type: 'ADC' },
  { pin: 39, name: 'VN (39)', type: 'ADC' },
  { pin: 34, name: 'D34', type: 'ADC' },
  { pin: 35, name: 'D35', type: 'ADC' },
  { pin: 32, name: 'D32', type: 'GPIO' },
  { pin: 33, name: 'D33', type: 'GPIO' },
  { pin: 25, name: 'D25', type: 'DAC' },
  { pin: 26, name: 'D26', type: 'DAC' },
  { pin: 27, name: 'D27', type: 'GPIO' },
  { pin: 14, name: 'D14', type: 'GPIO' },
  { pin: 12, name: 'D12', type: 'GPIO' },
  { pin: -3, name: 'GND', type: 'GND' },
  { pin: 13, name: 'D13', type: 'GPIO' },
  { pin: 9, name: 'D9', type: 'GPIO' },
  { pin: 10, name: 'D10', type: 'GPIO' },
  { pin: 11, name: 'D11', type: 'GPIO' },
  { pin: -4, name: 'VIN', type: 'POWER' }
];

const ESP32_RIGHT_HEADER: ESPPinDef[] = [
  { pin: -3, name: 'GND', type: 'GND' },
  { pin: 23, name: 'D23 (SW)', type: 'GPIO' },
  { pin: 22, name: 'D22 (SCL)', type: 'I2C' },
  { pin: 1, name: 'TX (1)', type: 'UART' },
  { pin: 3, name: 'RX (3)', type: 'UART' },
  { pin: 21, name: 'D21 (SDA)', type: 'I2C' },
  { pin: 19, name: 'D19 (DT)', type: 'GPIO' },
  { pin: 18, name: 'D18 (CLK)', type: 'GPIO' },
  { pin: 5, name: 'D5', type: 'GPIO' },
  { pin: 17, name: 'D17', type: 'GPIO' },
  { pin: 16, name: 'D16', type: 'GPIO' },
  { pin: 4, name: 'D4', type: 'GPIO' },
  { pin: 0, name: 'D0', type: 'GPIO' },
  { pin: 2, name: 'D2 (LED)', type: 'GPIO' },
  { pin: 15, name: 'D15', type: 'GPIO' },
  { pin: 8, name: 'D8', type: 'GPIO' },
  { pin: 7, name: 'D7', type: 'GPIO' },
  { pin: 6, name: 'D6', type: 'GPIO' },
  { pin: -5, name: 'CLK', type: 'CLK' }
];

export const CircuitCanvasView: React.FC<CircuitCanvasViewProps> = ({
  peripherals,
  onUpdatePin,
  onRemovePeripheral,
  onAddPeripheral
}) => {
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [hoveredGpioPin, setHoveredGpioPin] = useState<number | null>(null);
  const [selectedPinInfo, setSelectedPinInfo] = useState<{ id: string; pinKey: string; currentPin: number } | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // SVG Proportions (Spacious and high resolution)
  const SVG_WIDTH = 1260;
  const SVG_HEIGHT = 740;

  // Board Coordinates (Spacious width to avoid text overlap)
  const boardX = 480;
  const boardY = 65;
  const boardW = 300;
  const boardH = 610;

  // Compute exact pin pad locations for ESP32
  const leftPinPadX = boardX + 16;
  const rightPinPadX = boardX + boardW - 16;
  const pinStartY = boardY + 48;
  const pinStepY = (boardH - 85) / 18;

  const espPinMap = new Map<number, { x: number; y: number; name: string; side: 'left' | 'right' }>();

  ESP32_LEFT_HEADER.forEach((p, idx) => {
    const py = pinStartY + idx * pinStepY;
    if (p.pin > 0) {
      espPinMap.set(p.pin, { x: leftPinPadX, y: py, name: p.name, side: 'left' });
    }
  });

  ESP32_RIGHT_HEADER.forEach((p, idx) => {
    const py = pinStartY + idx * pinStepY;
    if (p.pin > 0) {
      espPinMap.set(p.pin, { x: rightPinPadX, y: py, name: p.name, side: 'right' });
    }
  });

  // Distribute peripherals Left & Right
  const leftPeripherals = peripherals.slice(0, Math.ceil(peripherals.length / 2));
  const rightPeripherals = peripherals.slice(Math.ceil(peripherals.length / 2));

  // Compute Peripheral Modules layout
  const leftCardX = 40;
  const leftCardW = 270;
  const rightCardX = 950;
  const rightCardW = 270;

  const leftSpacing = (SVG_HEIGHT - 120) / Math.max(1, leftPeripherals.length);
  const rightSpacing = (SVG_HEIGHT - 120) / Math.max(1, rightPeripherals.length);

  // Build Wires list
  const wires: Array<{
    id: string;
    peripheralId: string;
    pinKey: string;
    gpioPin: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
    label: string;
    originSide: 'left' | 'right';
    destSide: 'left' | 'right';
  }> = [];

  // Map left peripheral pin connectors
  const leftPinLayouts: Array<{
    peripheral: PeripheralConfig;
    cardX: number;
    cardY: number;
    cardH: number;
    pins: Array<{ key: string; val: number; x: number; y: number; color: string }>;
  }> = leftPeripherals.map((p, pIdx) => {
    const pinEntries = Object.entries(p.pins);
    const cardH = 46 + pinEntries.length * 28;
    const cardY = 70 + pIdx * leftSpacing + Math.max(0, (leftSpacing - cardH) / 2);
    const pinX = leftCardX + leftCardW - 14;

    const pinList = pinEntries.map(([k, v], i) => {
      const pinY = cardY + 42 + i * 28;
      const color = GPIO_PIN_COLORS[v] || WIRE_COLORS[k.toLowerCase()] || '#38bdf8';
      const wireId = `${p.id}_${k}`;

      const espCoord = espPinMap.get(v);
      if (espCoord) {
        wires.push({
          id: wireId,
          peripheralId: p.id,
          pinKey: k,
          gpioPin: v,
          startX: pinX,
          startY: pinY,
          endX: espCoord.x,
          endY: espCoord.y,
          color,
          label: `${p.name} [${k.toUpperCase()}] → GPIO ${v}`,
          originSide: 'left',
          destSide: espCoord.side
        });
      }

      return { key: k, val: v, x: pinX, y: pinY, color };
    });

    return { peripheral: p, cardX: leftCardX, cardY, cardH, pins: pinList };
  });

  // Map right peripheral pin connectors
  const rightPinLayouts: Array<{
    peripheral: PeripheralConfig;
    cardX: number;
    cardY: number;
    cardH: number;
    pins: Array<{ key: string; val: number; x: number; y: number; color: string }>;
  }> = rightPeripherals.map((p, pIdx) => {
    const pinEntries = Object.entries(p.pins);
    const cardH = 46 + pinEntries.length * 28;
    const cardY = 70 + pIdx * rightSpacing + Math.max(0, (rightSpacing - cardH) / 2);
    const pinX = rightCardX + 14;

    const pinList = pinEntries.map(([k, v], i) => {
      const pinY = cardY + 42 + i * 28;
      const color = GPIO_PIN_COLORS[v] || WIRE_COLORS[k.toLowerCase()] || '#38bdf8';
      const wireId = `${p.id}_${k}`;

      const espCoord = espPinMap.get(v);
      if (espCoord) {
        wires.push({
          id: wireId,
          peripheralId: p.id,
          pinKey: k,
          gpioPin: v,
          startX: pinX,
          startY: pinY,
          endX: espCoord.x,
          endY: espCoord.y,
          color,
          label: `${p.name} [${k.toUpperCase()}] → GPIO ${v}`,
          originSide: 'right',
          destSide: espCoord.side
        });
      }

      return { key: k, val: v, x: pinX, y: pinY, color };
    });

    return { peripheral: p, cardX: rightCardX, cardY, cardH, pins: pinList };
  });

  // High-precision smooth routing for Bezier paths
  const getWirePath = (w: typeof wires[0]) => {
    const { startX, startY, endX, endY, originSide, destSide } = w;

    if (originSide === 'left' && destSide === 'left') {
      const dx = (endX - startX) * 0.55;
      return `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
    }
    
    if (originSide === 'right' && destSide === 'right') {
      const dx = (startX - endX) * 0.55;
      return `M ${startX} ${startY} C ${startX - dx} ${startY}, ${endX + dx} ${endY}, ${endX} ${endY}`;
    }

    if (originSide === 'left' && destSide === 'right') {
      const cx1 = startX + 130;
      const cx2 = endX - 110;
      return `M ${startX} ${startY} C ${cx1} ${startY}, ${cx2} ${endY}, ${endX} ${endY}`;
    }

    // Right card to left ESP32 header
    const cx1 = startX - 130;
    const cx2 = endX + 110;
    return `M ${startX} ${startY} C ${cx1} ${startY}, ${cx2} ${endY}, ${endX} ${endY}`;
  };

  const availablePins = [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35];
  const uniqueConnectedPins = Array.from(new Set(wires.map(w => w.gpioPin))).sort((a, b) => a - b);

  return (
    <div className="relative w-full h-full min-h-[620px] bg-slate-950 select-none rounded-xl border border-slate-800 flex flex-col overflow-hidden">
      {/* Top Floating Action Bar */}
      <div className="h-11 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between z-20 shrink-0 gap-3">
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2 text-sky-400 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
            <Cpu className="w-4 h-4" />
            <span>Vizuális Kapcsolási & Huzalozási Rajz</span>
          </div>
          <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800 font-mono whitespace-nowrap">
            {peripherals.length} modul • {wires.length} aktív vezeték
          </span>
        </div>

        {/* Dynamic Color Match Legend and Add Peripheral */}
        <div className="flex items-center space-x-3 shrink-0 min-w-0">
          {/* Scrollable Legend displaying matched colors without duplicates */}
          <div className="flex items-center space-x-2 text-[10px] text-slate-200 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800 font-medium max-w-[240px] sm:max-w-[340px] md:max-w-[440px] lg:max-w-[560px] xl:max-w-[640px] overflow-x-auto select-none shrink">
            <span className="text-slate-500 mr-0.5 uppercase text-[9px] font-bold whitespace-nowrap shrink-0 flex items-center gap-1">
              <span>Bekötött Lábak</span>
              <span className="bg-slate-800 text-slate-400 px-1 py-0.2 rounded text-[8.5px]">({uniqueConnectedPins.length})</span>:
            </span>
            <div className="flex items-center space-x-1.5 shrink-0">
              {uniqueConnectedPins.map(pin => {
                const color = GPIO_PIN_COLORS[pin] || '#38bdf8';
                const pinWires = wires.filter(w => w.gpioPin === pin);
                const isHovered = hoveredGpioPin === pin;
                const tooltipTitle = `GPIO ${pin} (${pinWires.length} kapcsolat):\n${pinWires.map(w => '• ' + w.label).join('\n')}`;

                return (
                  <div
                    key={pin}
                    onMouseEnter={() => setHoveredGpioPin(pin)}
                    onMouseLeave={() => setHoveredGpioPin(null)}
                    title={tooltipTitle}
                    className={`relative group flex items-center space-x-1.5 px-2 py-0.5 rounded cursor-pointer transition-all duration-150 shrink-0 border ${
                      isHovered
                        ? 'bg-slate-850 shadow-lg scale-105 ring-1 ring-sky-400/40'
                        : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800/80'
                    }`}
                    style={{
                      borderColor: isHovered ? color : undefined,
                      boxShadow: isHovered ? `0 0 12px ${color}55` : undefined
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full transition-transform shrink-0"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 6px ${color}`
                      }}
                    />
                    <span style={{ color }} className="font-bold font-mono text-[10.5px] whitespace-nowrap">
                      GPIO {pin}
                    </span>
                    {pinWires.length > 1 && (
                      <span className="text-[8.5px] text-slate-400 font-mono bg-slate-950/80 px-1 rounded">
                        ×{pinWires.length}
                      </span>
                    )}

                    {/* Rich Floating Tooltip on Hover */}
                    {isHovered && pinWires.length > 0 && (
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-900/98 backdrop-blur-md text-slate-100 text-[10.5px] px-3 py-2 rounded-xl border border-slate-700 shadow-2xl z-50 whitespace-nowrap pointer-events-none flex flex-col gap-1 min-w-[190px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-0.5">
                          <span className="font-bold font-mono text-sky-400">ESP32 GPIO {pin}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{pinWires.length} periféria csatlakozik</span>
                        </div>
                        {pinWires.map((pw) => (
                          <div key={pw.id} className="flex items-center space-x-2 text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-mono text-[10px] text-slate-200">{pw.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Module Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Új Periféria</span>
            </button>

            {isAddMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Válassz Perifériát
                </div>
                {[
                  { type: 'SSD1306_OLED', name: 'SSD1306 OLED (128x64)', icon: '🖥️' },
                  { type: 'BMP280_BAROMETER', name: 'BMP280 Barométer & Hőmérő', icon: '🌡️' },
                  { type: 'KY040_ROTARY_ENCODER', name: 'KY-040 Forgó Jeladó', icon: '🎛️' },
                  { type: 'PUSH_BUTTON', name: 'Nyomógomb (Button)', icon: '🔘' },
                  { type: 'LED', name: 'Állapotjelző LED', icon: '💡' },
                  { type: 'POTENTIOMETER', name: 'Analóg Potenciométer', icon: '🎚️' }
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => {
                      onAddPeripheral(item.type as PeripheralType);
                      setIsAddMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center space-x-2 transition cursor-pointer"
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas SVG Layer */}
      <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-3 bg-radial from-slate-900/60 to-slate-950">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full max-w-7xl max-h-[680px]"
        >
          <defs>
            {/* Glow Filter for Hovered Wires */}
            <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Subtle Drop Shadow */}
            <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.5"/>
            </filter>

            {/* Linear Gradients */}
            <linearGradient id="pcb-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b"/>
              <stop offset="100%" stopColor="#0f172a"/>
            </linearGradient>

            <linearGradient id="shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#334155"/>
              <stop offset="50%" stopColor="#475569"/>
              <stop offset="100%" stopColor="#1e293b"/>
            </linearGradient>
          </defs>

          {/* BACKGROUND GRID */}
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="0.8" fill="#334155" fillOpacity="0.4"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* 1. ESP32 BOARD BASE (PCB, Chip, USB, Buttons) */}
          <g transform={`translate(${boardX}, ${boardY})`} filter="url(#card-shadow)">
            {/* PCB Background */}
            <rect
              x="0"
              y="0"
              width={boardW}
              height={boardH}
              rx="18"
              fill="url(#pcb-grad)"
              stroke="#334155"
              strokeWidth="2"
            />

            {/* USB-C Connector Top */}
            <rect x={(boardW - 60) / 2} y="-12" width="60" height="22" rx="5" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />
            <rect x={(boardW - 36) / 2} y="-8" width="36" height="14" rx="3" fill="#0f172a" />

            {/* Board Title Banner */}
            <text x={boardW / 2} y="26" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="monospace" letterSpacing="1.5">
              ESP32 DEVKIT V1
            </text>

            {/* ESP-WROOM-32 Shield in Center */}
            <rect x={(boardW - 140) / 2} y="44" width="140" height="155" rx="8" fill="url(#shield-grad)" stroke="#64748b" strokeWidth="1.5" />
            
            {/* Antenna Trace Area */}
            <rect x={(boardW - 116) / 2} y="52" width="116" height="28" rx="4" fill="#090d16" />
            <path d={`M ${(boardW - 90) / 2} 66 L ${(boardW - 60) / 2} 66 L ${(boardW - 60) / 2} 58 L ${(boardW - 30) / 2} 58 L ${(boardW - 30) / 2} 66 L ${(boardW) / 2} 66 L ${(boardW) / 2} 58 L ${(boardW + 30) / 2} 58 L ${(boardW + 30) / 2} 66 L ${(boardW + 60) / 2} 66`} fill="none" stroke="#eab308" strokeWidth="1.5" />

            {/* Chip Label */}
            <text x={boardW / 2} y="118" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
              ESP-WROOM-32
            </text>
            <text x={boardW / 2} y="134" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              240MHz Xtensa LX6
            </text>
            <text x={boardW / 2} y="148" textAnchor="middle" fill="#64748b" fontSize="8.5" fontFamily="monospace">
              Wi-Fi + BLE 4.2
            </text>

            {/* Power LED on Board */}
            <circle cx="95" cy="214" r="4" fill="#ef4444" />
            <text x="105" y="217" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">PWR</text>

            {/* Built-in Status LED (GPIO 2) */}
            <circle cx="195" cy="214" r="4" fill="#38bdf8" />
            <text x="205" y="217" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">D2</text>

            {/* Reset & Boot Buttons */}
            <rect x="40" y={boardH - 38} width="40" height="20" rx="4" fill="#334155" stroke="#475569" strokeWidth="1" />
            <text x="60" y={boardH - 24} textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="bold" fontFamily="sans-serif">EN</text>

            <rect x={boardW - 80} y={boardH - 38} width="40" height="20" rx="4" fill="#334155" stroke="#475569" strokeWidth="1" />
            <text x={boardW - 60} y={boardH - 24} textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="bold" fontFamily="sans-serif">BOOT</text>
          </g>

          {/* 2. LEFT PERIPHERAL CARD BASES */}
          {leftPinLayouts.map(({ peripheral, cardX, cardY, cardH }) => (
            <g key={`bg_${peripheral.id}`} transform={`translate(${cardX}, ${cardY})`} filter="url(#card-shadow)">
              <rect
                x="0"
                y="0"
                width={leftCardW}
                height={cardH}
                rx="14"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1.5"
              />
              <rect x="0" y="0" width={leftCardW} height="30" rx="14" fill="#1e293b" />
              <rect x="0" y="16" width={leftCardW} height="14" fill="#1e293b" />
              <text x="14" y="19" fill="#f1f5f9" fontSize="11.5" fontWeight="bold" fontFamily="sans-serif">
                {peripheral.name}
              </text>
              <g 
                transform={`translate(${leftCardW - 24}, 6)`} 
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onRemovePeripheral(peripheral.id); }}
              >
                <rect x="0" y="0" width="18" height="18" rx="4" fill="#334155" />
                <text x="9" y="13" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">×</text>
              </g>
            </g>
          ))}

          {/* 3. RIGHT PERIPHERAL CARD BASES */}
          {rightPinLayouts.map(({ peripheral, cardX, cardY, cardH }) => (
            <g key={`bg_${peripheral.id}`} transform={`translate(${cardX}, ${cardY})`} filter="url(#card-shadow)">
              <rect
                x="0"
                y="0"
                width={rightCardW}
                height={cardH}
                rx="14"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1.5"
              />
              <rect x="0" y="0" width={rightCardW} height="30" rx="14" fill="#1e293b" />
              <rect x="0" y="16" width={rightCardW} height="14" fill="#1e293b" />
              <text x="14" y="19" fill="#f1f5f9" fontSize="11.5" fontWeight="bold" fontFamily="sans-serif">
                {peripheral.name}
              </text>
              <g 
                transform={`translate(${rightCardW - 24}, 6)`} 
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onRemovePeripheral(peripheral.id); }}
              >
                <rect x="0" y="0" width="18" height="18" rx="4" fill="#334155" />
                <text x="9" y="13" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">×</text>
              </g>
            </g>
          ))}

          {/* 4. SVG WIRES LAYER (Smoothly routed on top of boards) */}
          {wires.map(w => {
            const isHovered = hoveredWireId === w.id || hoveredGpioPin === w.gpioPin;
            const anyHovered = hoveredWireId !== null || hoveredGpioPin !== null;
            const path = getWirePath(w);

            return (
              <g
                key={w.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredWireId(w.id)}
                onMouseLeave={() => setHoveredWireId(null)}
                onClick={() => setSelectedPinInfo({ id: w.peripheralId, pinKey: w.pinKey, currentPin: w.gpioPin })}
              >
                {/* Wide invisible hit area */}
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="22"
                />

                {/* Glow underlay when hovered */}
                {isHovered && (
                  <path
                    d={path}
                    fill="none"
                    stroke={w.color}
                    strokeWidth="11"
                    strokeOpacity="0.6"
                    filter="url(#wire-glow)"
                  />
                )}

                {/* Main Visible Wire Line */}
                <path
                  d={path}
                  fill="none"
                  stroke={w.color}
                  strokeWidth={isHovered ? '4.5' : '2.5'}
                  strokeDasharray={isHovered ? '6 3' : 'none'}
                  strokeLinecap="round"
                  className="transition-all duration-150"
                  opacity={anyHovered && !isHovered ? 0.25 : 0.95}
                />

                {/* Small animated pulse dot on wire */}
                {isHovered && (
                  <circle cx={(w.startX + w.endX) / 2} cy={(w.startY + w.endY) / 2} r="5" fill={w.color} />
                )}
              </g>
            );
          })}

          {/* 5. ESP32 PINS AND LABELS (Rendered crisp on top) */}
          <g transform={`translate(${boardX}, ${boardY})`}>
            {/* Left Header Pins - COLOR MATCHED */}
            {ESP32_LEFT_HEADER.map((p, idx) => {
              const py = 48 + idx * pinStepY;
              const connectedWire = wires.find(w => w.gpioPin === p.pin);
              const isConnected = !!connectedWire;
              const isHoveredPin = hoveredGpioPin === p.pin || (hoveredWireId ? wires.some(w => w.gpioPin === p.pin && w.id === hoveredWireId) : false);
              const pinColor = isConnected 
                ? connectedWire.color 
                : (GPIO_PIN_COLORS[p.pin] || (p.type === 'POWER' ? '#ef4444' : p.type === 'GND' ? '#64748b' : '#475569'));

              return (
                <g key={`l_${idx}`} transform={`translate(16, ${py})`}>
                  {/* Outer Gold Pad */}
                  <circle 
                    cx="0" 
                    cy="0" 
                    r={isHoveredPin ? 9.5 : 7.5} 
                    fill="#eab308" 
                    stroke={isHoveredPin ? '#ffffff' : isConnected ? pinColor : '#ca8a04'} 
                    strokeWidth={isHoveredPin ? '3' : isConnected ? '2.5' : '1'} 
                    filter={isHoveredPin ? 'url(#wire-glow)' : undefined}
                  />
                  {/* Inner Drill Hole */}
                  <circle 
                    cx="0" 
                    cy="0" 
                    r={isHoveredPin ? 5 : 4} 
                    fill={isConnected ? pinColor : '#0f172a'} 
                  />
                  {/* Pin Name Label */}
                  <text 
                    x="14" 
                    y="3.5" 
                    fill={isHoveredPin ? '#ffffff' : isConnected ? pinColor : '#64748b'} 
                    fontSize={isHoveredPin ? '10' : '9'} 
                    fontWeight={isConnected || isHoveredPin ? 'bold' : 'normal'} 
                    fontFamily="monospace"
                  >
                    {p.name}
                  </text>
                </g>
              );
            })}

            {/* Right Header Pins - COLOR MATCHED */}
            {ESP32_RIGHT_HEADER.map((p, idx) => {
              const py = 48 + idx * pinStepY;
              const connectedWire = wires.find(w => w.gpioPin === p.pin);
              const isConnected = !!connectedWire;
              const isHoveredPin = hoveredGpioPin === p.pin || (hoveredWireId ? wires.some(w => w.gpioPin === p.pin && w.id === hoveredWireId) : false);
              const pinColor = isConnected 
                ? connectedWire.color 
                : (GPIO_PIN_COLORS[p.pin] || (p.type === 'POWER' ? '#ef4444' : p.type === 'GND' ? '#64748b' : '#475569'));

              return (
                <g key={`r_${idx}`} transform={`translate(${boardW - 16}, ${py})`}>
                  {/* Outer Gold Pad */}
                  <circle 
                    cx="0" 
                    cy="0" 
                    r={isHoveredPin ? 9.5 : 7.5} 
                    fill="#eab308" 
                    stroke={isHoveredPin ? '#ffffff' : isConnected ? pinColor : '#ca8a04'} 
                    strokeWidth={isHoveredPin ? '3' : isConnected ? '2.5' : '1'} 
                    filter={isHoveredPin ? 'url(#wire-glow)' : undefined}
                  />
                  {/* Inner Drill Hole */}
                  <circle 
                    cx="0" 
                    cy="0" 
                    r={isHoveredPin ? 5 : 4} 
                    fill={isConnected ? pinColor : '#0f172a'} 
                  />
                  {/* Pin Name Label */}
                  <text 
                    x="-14" 
                    y="3.5" 
                    textAnchor="end" 
                    fill={isHoveredPin ? '#ffffff' : isConnected ? pinColor : '#64748b'} 
                    fontSize={isHoveredPin ? '10' : '9'} 
                    fontWeight={isConnected || isHoveredPin ? 'bold' : 'normal'} 
                    fontFamily="monospace"
                  >
                    {p.name}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 6. LEFT PERIPHERAL PIN ROWS & CONNECTOR PADS */}
          {leftPinLayouts.map(({ peripheral, cardX, cardY, pins }) => (
            <g key={`pins_${peripheral.id}`} transform={`translate(${cardX}, ${cardY})`}>
              {pins.map((pin, i) => {
                const py = 42 + i * 28;
                const wireId = `${peripheral.id}_${pin.key}`;
                const isHovered = hoveredWireId === wireId || hoveredGpioPin === pin.val;

                return (
                  <g
                    key={pin.key}
                    transform={`translate(0, ${py})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedPinInfo({ id: peripheral.id, pinKey: pin.key, currentPin: pin.val })}
                    onMouseEnter={() => setHoveredWireId(wireId)}
                    onMouseLeave={() => setHoveredWireId(null)}
                  >
                    {isHovered && (
                      <rect x="6" y="-11" width={leftCardW - 12} height="22" rx="5" fill="#1e293b" stroke={pin.color} strokeWidth="1" />
                    )}

                    {/* Pin Name */}
                    <text x="14" y="3.5" fill={pin.color} fontSize="10.5" fontWeight="bold" fontFamily="monospace">
                      {pin.key.toUpperCase()}
                    </text>

                    {/* Connected GPIO Tag */}
                    <rect 
                      x="120" 
                      y="-9" 
                      width="90" 
                      height="18" 
                      rx="5" 
                      fill={isHovered ? '#0f172a' : '#020617'} 
                      stroke={pin.color} 
                      strokeWidth={isHovered ? '2' : '1.2'} 
                    />
                    <text x="165" y="4" textAnchor="middle" fill={pin.color} fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                      GPIO {pin.val}
                    </text>

                    {/* Output Connector Pad on Right Edge */}
                    <circle cx={leftCardW - 14} cy="0" r={isHovered ? 9.5 : 7.5} fill="#eab308" stroke={isHovered ? '#ffffff' : pin.color} strokeWidth={isHovered ? '2.5' : '1.5'} />
                    <circle cx={leftCardW - 14} cy="0" r={isHovered ? 5 : 4} fill={pin.color} />
                  </g>
                );
              })}
            </g>
          ))}

          {/* 7. RIGHT PERIPHERAL PIN ROWS & CONNECTOR PADS */}
          {rightPinLayouts.map(({ peripheral, cardX, cardY, pins }) => (
            <g key={`pins_${peripheral.id}`} transform={`translate(${cardX}, ${cardY})`}>
              {pins.map((pin, i) => {
                const py = 42 + i * 28;
                const wireId = `${peripheral.id}_${pin.key}`;
                const isHovered = hoveredWireId === wireId || hoveredGpioPin === pin.val;

                return (
                  <g
                    key={pin.key}
                    transform={`translate(0, ${py})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedPinInfo({ id: peripheral.id, pinKey: pin.key, currentPin: pin.val })}
                    onMouseEnter={() => setHoveredWireId(wireId)}
                    onMouseLeave={() => setHoveredWireId(null)}
                  >
                    {isHovered && (
                      <rect x="6" y="-11" width={rightCardW - 12} height="22" rx="5" fill="#1e293b" stroke={pin.color} strokeWidth="1" />
                    )}

                    {/* Input Connector Pad on Left Edge */}
                    <circle cx="14" cy="0" r={isHovered ? 9.5 : 7.5} fill="#eab308" stroke={isHovered ? '#ffffff' : pin.color} strokeWidth={isHovered ? '2.5' : '1.5'} />
                    <circle cx="14" cy="0" r={isHovered ? 5 : 4} fill={pin.color} />

                    {/* Pin Name */}
                    <text x="34" y="3.5" fill={pin.color} fontSize="10.5" fontWeight="bold" fontFamily="monospace">
                      {pin.key.toUpperCase()}
                    </text>

                    {/* Connected GPIO Tag */}
                    <rect 
                      x="150" 
                      y="-9" 
                      width="90" 
                      height="18" 
                      rx="5" 
                      fill={isHovered ? '#0f172a' : '#020617'} 
                      stroke={pin.color} 
                      strokeWidth={isHovered ? '2' : '1.2'} 
                    />
                    <text x="195" y="4" textAnchor="middle" fill={pin.color} fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                      GPIO {pin.val}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Interactive Pin Rewiring Modal/Popover */}
      {selectedPinInfo && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Settings2 className="w-5 h-5 text-sky-400" />
                <span className="font-bold text-slate-100 text-sm uppercase tracking-wider">
                  Láb Átkötése ({selectedPinInfo.pinKey.toUpperCase()})
                </span>
              </div>
              <button
                onClick={() => setSelectedPinInfo(null)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                Mégse
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Válaszd ki az új ESP32 GPIO lábat a(z) <span className="font-bold text-sky-400">{selectedPinInfo.pinKey.toUpperCase()}</span> kivezetéshez:
            </div>

            <div className="grid grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
              {availablePins.map(pinNum => {
                const color = GPIO_PIN_COLORS[pinNum] || '#38bdf8';
                return (
                  <button
                    key={pinNum}
                    onClick={() => {
                      onUpdatePin(selectedPinInfo.id, selectedPinInfo.pinKey, pinNum);
                      setSelectedPinInfo(null);
                    }}
                    className={`p-2.5 rounded-xl font-mono text-xs font-bold border transition flex flex-col items-center justify-center ${
                      selectedPinInfo.currentPin === pinNum
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg ring-2 ring-emerald-500/30'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                    style={{ borderColor: selectedPinInfo.currentPin === pinNum ? '#34d399' : color }}
                  >
                    <span className="text-sm" style={{ color: selectedPinInfo.currentPin === pinNum ? '#fff' : color }}>
                      D{pinNum}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">GPIO {pinNum}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info Banner */}
      <div className="h-8 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-sky-400" />
          <span>Kattints bármelyik vezetékre vagy lábra az azonnali átdrótozáshoz és átkötéshez.</span>
        </div>
        <div className="flex items-center space-x-1 font-mono text-[10px] text-emerald-400">
          <Layers className="w-3 h-3" />
          <span>100% Szín-Összehangolt Lábkiosztás</span>
        </div>
      </div>
    </div>
  );
};
