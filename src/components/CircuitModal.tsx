import React, { useState } from 'react';
import { X, Layers, Trash2, Check, LayoutGrid, Eye, Plus } from 'lucide-react';
import { ESPProject, PeripheralConfig, PeripheralType } from '../types/esp32';
import { projectManager } from '../project/projectManager';
import { CircuitCanvasView } from './CircuitCanvasView';

interface CircuitModalProps {
  project: ESPProject;
  isOpen: boolean;
  onClose: () => void;
}

export const CircuitModal: React.FC<CircuitModalProps> = ({
  project,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'canvas' | 'table'>('canvas');
  const [peripherals, setPeripherals] = useState<PeripheralConfig[]>(project.circuit.peripherals);

  const handleUpdatePin = (id: string, pinKey: string, newPinVal: number) => {
    const updated = peripherals.map(p => {
      if (p.id === id) {
        return {
          ...p,
          pins: {
            ...p.pins,
            [pinKey]: newPinVal
          }
        };
      }
      return p;
    });
    setPeripherals(updated);
    projectManager.updatePeripheralPins(id, { ...peripherals.find(p => p.id === id)?.pins, [pinKey]: newPinVal });
  };

  const handleRemove = (id: string) => {
    const updated = peripherals.filter(p => p.id !== id);
    setPeripherals(updated);
    projectManager.removePeripheral(id);
  };

  const handleAddPeripheral = (type: PeripheralType) => {
    const newId = 'periph_' + Date.now();
    let newPeripheral: PeripheralConfig;

    switch (type) {
      case 'SSD1306_OLED':
        newPeripheral = {
          id: newId,
          type: 'SSD1306_OLED',
          name: 'SSD1306 OLED Kijelző (128x64)',
          pins: { sda: 21, scl: 22 },
          config: { i2cAddress: '0x3C', width: 128, height: 64 }
        };
        break;
      case 'BMP280_BAROMETER':
        newPeripheral = {
          id: newId,
          type: 'BMP280_BAROMETER',
          name: 'BMP280 Barométer & Hőmérő',
          pins: { sda: 21, scl: 22 },
          config: { i2cAddress: '0x76' }
        };
        break;
      case 'KY040_ROTARY_ENCODER':
        newPeripheral = {
          id: newId,
          type: 'KY040_ROTARY_ENCODER',
          name: 'KY-040 Forgó Jeladó',
          pins: { clk: 18, dt: 19, sw: 23 }
        };
        break;
      case 'PUSH_BUTTON':
        newPeripheral = {
          id: newId,
          type: 'PUSH_BUTTON',
          name: 'Nyomógomb (Button)',
          pins: { pin: 4 },
          config: { pullUp: true }
        };
        break;
      case 'LED':
        newPeripheral = {
          id: newId,
          type: 'LED',
          name: 'Állapotjelző LED',
          pins: { pin: 2 }
        };
        break;
      case 'POTENTIOMETER':
        newPeripheral = {
          id: newId,
          type: 'POTENTIOMETER',
          name: 'Analóg Potenciométer',
          pins: { pin: 34 }
        };
        break;
      default:
        newPeripheral = {
          id: newId,
          type,
          name: type,
          pins: { pin: 4 }
        };
    }

    const updated = [...peripherals, newPeripheral];
    setPeripherals(updated);
    projectManager.addPeripheral(newPeripheral);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-6 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-sky-950 border border-sky-800 rounded-lg text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Áramköri & Huzalozási Tervező (Circuit & Wiring Studio)
              </h2>
              <p className="text-[11px] text-slate-400">
                ESP32 DevKit V1 lábkiosztás, virtuális modulok és dinamikus kapcsolási rajz
              </p>
            </div>
          </div>

          {/* View Mode Toggle Tabs */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('canvas')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'canvas'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Vizuális Bekötési Rajz</span>
              </button>

              <button
                onClick={() => setActiveTab('table')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'table'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Lábkiosztási Lista</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition ml-2"
              title="Bezárás"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden p-3 bg-slate-950/40">
          {activeTab === 'canvas' ? (
            <CircuitCanvasView
              peripherals={peripherals}
              onUpdatePin={handleUpdatePin}
              onRemovePeripheral={handleRemove}
              onAddPeripheral={handleAddPeripheral}
            />
          ) : (
            <div className="h-full overflow-y-auto space-y-3 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Csatlakoztatott modulok és ESP32 GPIO láb hozzárendelések:
                </span>
                <div className="flex space-x-2">
                  {[
                    { type: 'SSD1306_OLED', label: 'OLED' },
                    { type: 'BMP280_BAROMETER', label: 'BMP280' },
                    { type: 'KY040_ROTARY_ENCODER', label: 'Rotary' },
                    { type: 'PUSH_BUTTON', label: 'Gomb' },
                    { type: 'LED', label: 'LED' }
                  ].map(btn => (
                    <button
                      key={btn.type}
                      onClick={() => handleAddPeripheral(btn.type as PeripheralType)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] px-2 py-1 rounded border border-slate-700 transition flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {peripherals.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200">{p.name}</span>
                      <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                        {p.type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(p.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                      title="Periféria eltávolítása"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Pins Config */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {Object.entries(p.pins).map(([pinKey, pinVal]) => (
                      <div key={pinKey} className="flex items-center space-x-2 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        <span className="font-mono text-slate-400 uppercase text-[10px] font-bold">
                          {pinKey}:
                        </span>
                        <select
                          value={pinVal}
                          onChange={(e) => handleUpdatePin(p.id, pinKey, Number(e.target.value))}
                          className="bg-slate-900 text-emerald-400 font-mono text-xs px-1.5 py-0.5 rounded focus:outline-none focus:border-emerald-500 border border-slate-700"
                        >
                          {[2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35].map(pinNum => (
                            <option key={pinNum} value={pinNum}>
                              GPIO {pinNum}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 flex justify-between items-center bg-slate-950/80">
          <div className="text-[11px] text-slate-500">
            A kapcsolási rajz módosításai automatikusan érvényesülnek a szimulátorban és a <span className="font-mono text-slate-400">circuit.json</span> konfigurációban.
          </div>
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow"
          >
            <Check className="w-4 h-4" />
            <span>Kész / Mentés</span>
          </button>
        </div>
      </div>
    </div>
  );
};

