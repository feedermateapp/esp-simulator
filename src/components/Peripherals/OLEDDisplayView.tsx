import React, { useRef, useEffect } from 'react';
import { Monitor, RefreshCw } from 'lucide-react';

interface OLEDDisplayViewProps {
  frameBuffer: Uint8Array | null;
  width?: number;
  height?: number;
  i2cAddress?: string;
  sdaPin?: number;
  sclPin?: number;
  onClear?: () => void;
}

export const OLEDDisplayView: React.FC<OLEDDisplayViewProps> = ({
  frameBuffer,
  width = 128,
  height = 64,
  i2cAddress = '0x3C',
  sdaPin = 21,
  sclPin = 22,
  onClear
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background OLED off-black
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, width, height);

    if (frameBuffer && frameBuffer.length === (width * height) / 8) {
      // Render SSD1306 Page-addressed framebuffer (8 pages of 128 columns)
      ctx.fillStyle = '#38bdf8'; // OLED Cyan / Light Blue phosphor

      for (let page = 0; page < 8; page++) {
        for (let col = 0; col < width; col++) {
          const byte = frameBuffer[page * width + col];
          for (let bit = 0; bit < 8; bit++) {
            if ((byte & (1 << bit)) !== 0) {
              const y = page * 8 + bit;
              ctx.fillRect(col, y, 1, 1);
            }
          }
        }
      }
    } else {
      // Default Preview Graphic if no framebuffer is streamed yet
      ctx.fillStyle = '#38bdf8';
      ctx.font = '7px monospace';
      ctx.fillText('ESP32 OLED SSD1306', 10, 15);
      ctx.fillText('128 x 64 I2C', 10, 27);
      ctx.strokeStyle = '#0284c7';
      ctx.strokeRect(4, 4, 120, 56);
      ctx.fillText('Ready for sketch...', 10, 45);
    }
  }, [frameBuffer, width, height]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center space-y-2 select-none shadow-md">
      {/* Header */}
      <div className="w-full flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
          <Monitor className="w-4 h-4 text-sky-400" />
          <span>SSD1306 OLED (128x64)</span>
        </span>
        <span className="text-[10px] bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded font-mono">
          I2C: {i2cAddress}
        </span>
      </div>

      {/* Screen Frame with Glass Bezel */}
      <div className="p-2.5 bg-slate-950 rounded-lg border-2 border-slate-700 shadow-inner flex items-center justify-center my-1">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ width: '256px', height: '128px', imageRendering: 'pixelated' }}
          className="rounded shadow-[0_0_15px_rgba(56,189,248,0.2)]"
        />
      </div>

      {/* Pinout & Reset */}
      <div className="w-full pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex space-x-3">
          <span>SDA: <strong className="text-sky-400">GPIO {sdaPin}</strong></span>
          <span>SCL: <strong className="text-sky-400">GPIO {sclPin}</strong></span>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="flex items-center space-x-1 text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Törlés</span>
          </button>
        )}
      </div>
    </div>
  );
};
