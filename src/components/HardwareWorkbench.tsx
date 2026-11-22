import React, { useEffect } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Cpu, 
  Sparkles, 
  Keyboard, 
  Activity
} from 'lucide-react';
import { ColorDisplayView } from './Peripherals/ColorDisplayView';
import { OLEDDisplayView } from './Peripherals/OLEDDisplayView';
import { RotaryEncoderView } from './Peripherals/RotaryEncoderView';
import { BMP280View } from './Peripherals/BMP280View';
import { ButtonView } from './Peripherals/ButtonView';
import { BoardView } from './BoardView';
import { ESPProject, GPIOPinState } from '../types/esp32';

interface HardwareWorkbenchProps {
  project: ESPProject;
  viewMode: 'sidebar' | 'workbench';
  onToggleViewMode?: () => void;
  // Peripherals props
  frameBuffer: Uint8Array | null;
  colorFrameBuffer: Uint8ClampedArray | null;
  rotaryPosition: number;
  isRotaryPressed: boolean;
  onRotate: (direction: 'CW' | 'CCW') => void;
  onRotaryButtonPress: () => void;
  onRotaryButtonRelease: () => void;
  temperature: number;
  pressure: number;
  onTemperatureChange: (temp: number) => void;
  onPressureChange: (press: number) => void;
  buttonStates: Record<number, boolean>;
  onButtonPress: (pin: number) => void;
  onButtonRelease: (pin: number) => void;
  ledStates: Record<number, { on: boolean; pwm: number }>;
  gpioStates: Map<number, GPIOPinState>;
}

export const HardwareWorkbench: React.FC<HardwareWorkbenchProps> = ({
  project,
  viewMode,
  onToggleViewMode,
  frameBuffer,
  colorFrameBuffer,
  rotaryPosition,
  isRotaryPressed,
  onRotate,
  onRotaryButtonPress,
  onRotaryButtonRelease,
  temperature,
  pressure,
  onTemperatureChange,
  onPressureChange,
  buttonStates,
  onButtonPress,
  onButtonRelease,
  ledStates,
  gpioStates
}) => {
  // Extract configured peripherals from circuit
  const pushButtons = project.circuit.peripherals.filter(p => p.type === 'PUSH_BUTTON');
  const leds = project.circuit.peripherals.filter(p => p.type === 'LED');
  const rotary = project.circuit.peripherals.find(p => p.type === 'KY040_ROTARY_ENCODER');
  const oled = project.circuit.peripherals.find(p => p.type === 'SSD1306_OLED');
  const st7789Display = project.circuit.peripherals.find(p => p.type === 'ST7789_DISPLAY');
  const bmp = project.circuit.peripherals.find(p => p.type === 'BMP280_BAROMETER');

  // Keyboard shortcuts when in Workbench mode
  useEffect(() => {
    if (viewMode !== 'workbench') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowLeft' || e.key === '[') {
        onRotate('CCW');
      } else if (e.key === 'ArrowRight' || e.key === ']') {
        onRotate('CW');
      } else if (e.key === ' ' || e.key === 'Enter') {
        onRotaryButtonPress();
      } else if (e.key === '1') {
        const btn = pushButtons[0];
        const pin = btn?.pins.pin ?? 14;
        onButtonPress(pin);
      } else if (e.key === '2') {
        const btn = pushButtons[1];
        const pin = btn?.pins.pin ?? 27;
        onButtonPress(pin);
      } else if (e.key === '3') {
        const btn = pushButtons[2];
        const pin = btn?.pins.pin ?? 32;
        onButtonPress(pin);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === ' ' || e.key === 'Enter') {
        onRotaryButtonRelease();
      } else if (e.key === '1') {
        const btn = pushButtons[0];
        const pin = btn?.pins.pin ?? 14;
        onButtonRelease(pin);
      } else if (e.key === '2') {
        const btn = pushButtons[1];
        const pin = btn?.pins.pin ?? 27;
        onButtonRelease(pin);
      } else if (e.key === '3') {
        const btn = pushButtons[2];
        const pin = btn?.pins.pin ?? 32;
        onButtonRelease(pin);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [viewMode, pushButtons, onRotate, onRotaryButtonPress, onRotaryButtonRelease, onButtonPress, onButtonRelease]);

  // If in SIDEBAR mode (compact 320px column)
  if (viewMode === 'sidebar') {
    return (
      <div className="w-80 bg-slate-950 border-l border-slate-800 p-3 overflow-y-auto space-y-3 shrink-0 select-none">
        {/* Header with expand button */}
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800">
          <div className="flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Perifériák & Lapka</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-emerald-400 font-mono">Élő Hardver</span>
            {onToggleViewMode && (
              <button
                onClick={onToggleViewMode}
                className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 rounded transition cursor-pointer"
                title="Hardver Műhely nézet kiterjesztése (Nagy felület görgetés nélkül)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ST7789 320x240 Színes Kijelző Widget */}
        {st7789Display && (
          <ColorDisplayView
            frameBuffer={colorFrameBuffer}
            width={Number(st7789Display.config?.width) || 320}
            height={Number(st7789Display.config?.height) || 240}
            name={st7789Display.name}
            pins={st7789Display.pins}
          />
        )}

        {/* OLED Kijelző Widget */}
        {oled && (
          <OLEDDisplayView
            frameBuffer={frameBuffer}
            width={Number(oled.config?.width) || 128}
            height={Number(oled.config?.height) || 64}
            i2cAddress={String(oled.config?.i2cAddress || '0x3C')}
            sdaPin={oled.pins.sda ?? 21}
            sclPin={oled.pins.scl ?? 22}
          />
        )}

        {/* Rotary Encoder Widget */}
        {rotary && (
          <RotaryEncoderView
            position={rotaryPosition}
            isPressed={isRotaryPressed}
            onRotate={onRotate}
            onButtonPress={onRotaryButtonPress}
            onButtonRelease={onRotaryButtonRelease}
            clkPin={rotary.pins.clk ?? 18}
            dtPin={rotary.pins.dt ?? 19}
            swPin={rotary.pins.sw ?? 23}
          />
        )}

        {/* BMP280 Barométer & Hőmérő Widget */}
        {bmp && (
          <BMP280View
            temperature={temperature}
            pressure={pressure}
            onTemperatureChange={onTemperatureChange}
            onPressureChange={onPressureChange}
            i2cAddress={String(bmp.config?.i2cAddress || '0x76')}
            sdaPin={bmp.pins.sda ?? 25}
            sclPin={bmp.pins.scl ?? 26}
          />
        )}

        {/* Dinamikus Gombok & LED Widget */}
        <ButtonView
          buttons={pushButtons}
          buttonStates={buttonStates}
          onButtonPress={onButtonPress}
          onButtonRelease={onButtonRelease}
          leds={leds}
          ledStates={ledStates}
        />

        {/* ESP32 DevKit Lapka Nézet */}
        <BoardView
          gpioStates={gpioStates}
          boardName={project.circuit.board}
        />
      </div>
    );
  }

  // WORKBENCH MODE: Spacious, full multi-column hardware laboratory without vertical scrolling
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto select-none">
      {/* Workbench Sub-toolbar */}
      <div className="h-9 bg-slate-900/50 border-b border-slate-800/80 px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center space-x-2 text-slate-400">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
          <span className="font-semibold text-slate-200">Interaktív Hardver Laboratórium</span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-[11px] text-emerald-400">{project.circuit.board}</span>
          <span className="text-slate-500 text-[11px]">({project.circuit.peripherals.length} periféria csatlakoztatva)</span>
        </div>

        {/* Right Action: Keyboard Shortcut Hints + Collapse to sidebar */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 h-6 rounded-md border border-slate-800 whitespace-nowrap">
            <Keyboard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-slate-500">Billentyűk:</span>
            <span className="bg-slate-800 text-slate-200 px-1 rounded border border-slate-700 font-bold">1</span>
            <span className="bg-slate-800 text-slate-200 px-1 rounded border border-slate-700 font-bold">2</span>
            <span className="bg-slate-800 text-slate-200 px-1 rounded border border-slate-700 font-bold">3</span>
            <span className="text-slate-500">Gombok</span>
            <span className="text-slate-700">|</span>
            <span className="bg-slate-800 text-slate-200 px-1 rounded border border-slate-700 font-bold">←</span>
            <span className="bg-slate-800 text-slate-200 px-1 rounded border border-slate-700 font-bold">→</span>
            <span className="text-slate-500">Forgatás</span>
            <span className="text-slate-700">|</span>
            <span className="bg-slate-800 text-slate-200 px-1.5 rounded border border-slate-700 font-bold">Space</span>
            <span className="text-slate-500">SW</span>
          </div>

          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium px-2.5 h-6 rounded-md border border-slate-700 transition whitespace-nowrap cursor-pointer"
              title="Visszatérés az osztott kód- és hardver nézethez"
            >
              <Minimize2 className="w-3 h-3" />
              <span>Osztott nézet</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Content - 2 Columns on desktop */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-7xl mx-auto w-full items-start">
        {/* Left Column (Display & Sensors) - 7 Columns on desktop */}
        <div className="lg:col-span-7 space-y-4">
          {/* ST7789 Color Display */}
          {st7789Display && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800 text-xs">
                <div className="flex items-center space-x-2 font-bold text-slate-100">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>{st7789Display.name}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono text-[11px]">
                  <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30">
                    320x240 RGB IPS
                  </span>
                  <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                    SPI Interfész
                  </span>
                </div>
              </div>

              {/* Display Component */}
              <ColorDisplayView
                frameBuffer={colorFrameBuffer}
                width={Number(st7789Display.config?.width) || 320}
                height={Number(st7789Display.config?.height) || 240}
                name={st7789Display.name}
                pins={st7789Display.pins}
              />
            </div>
          )}

          {/* OLED Display (if enabled) */}
          {oled && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <OLEDDisplayView
                frameBuffer={frameBuffer}
                width={Number(oled.config?.width) || 128}
                height={Number(oled.config?.height) || 64}
                i2cAddress={String(oled.config?.i2cAddress || '0x3C')}
                sdaPin={oled.pins.sda ?? 21}
                sclPin={oled.pins.scl ?? 22}
              />
            </div>
          )}

          {/* BMP280 Barometer Sensor */}
          {bmp && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <BMP280View
                temperature={temperature}
                pressure={pressure}
                onTemperatureChange={onTemperatureChange}
                onPressureChange={onPressureChange}
                i2cAddress={String(bmp.config?.i2cAddress || '0x76')}
                sdaPin={bmp.pins.sda ?? 25}
                sclPin={bmp.pins.scl ?? 26}
              />
            </div>
          )}
        </div>

        {/* Right Column (Controls, Rotary Encoder, Buttons, Board) - 5 Columns on desktop */}
        <div className="lg:col-span-5 space-y-4">
          {/* Rotary Encoder Widget */}
          {rotary && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <RotaryEncoderView
                position={rotaryPosition}
                isPressed={isRotaryPressed}
                onRotate={onRotate}
                onButtonPress={onRotaryButtonPress}
                onButtonRelease={onRotaryButtonRelease}
                clkPin={rotary.pins.clk ?? 18}
                dtPin={rotary.pins.dt ?? 19}
                swPin={rotary.pins.sw ?? 23}
              />
            </div>
          )}

          {/* Physical Push Buttons & LED Indicators */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <ButtonView
              buttons={pushButtons}
              buttonStates={buttonStates}
              onButtonPress={onButtonPress}
              onButtonRelease={onButtonRelease}
              leds={leds}
              ledStates={ledStates}
            />
          </div>

          {/* ESP32 Board Pinout Widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <BoardView
              gpioStates={gpioStates}
              boardName={project.circuit.board}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
