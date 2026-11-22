import React, { useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';

interface ColorDisplayViewProps {
  frameBuffer: Uint8ClampedArray | null;
  width?: number;
  height?: number;
  name?: string;
  pins?: Record<string, number>;
}

export const ColorDisplayView: React.FC<ColorDisplayViewProps> = ({
  frameBuffer,
  width = 320,
  height = 240,
  name = 'ST7789 IPS Színes Kijelző',
  pins = { mosi: 23, sck: 18, cs: 5, dc: 16 }
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!frameBuffer || frameBuffer.length !== width * height * 4) {
      // Clear to deep blue-black background
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ST7789 320x240 IPS DISPLAY', width / 2, height / 2 - 10);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText('Várakozás a szimuláció indítására...', width / 2, height / 2 + 10);
      return;
    }

    const imgData = new ImageData(new Uint8ClampedArray(frameBuffer), width, height);
    ctx.putImageData(imgData, 0, 0);
  }, [frameBuffer, width, height]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col space-y-2.5 shadow-lg select-none">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
          <Palette className="w-4 h-4 text-sky-400" />
          <span>{name}</span>
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30">
            {width}x{height} RGB
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            SPI
          </span>
        </div>
      </div>

      {/* Screen Frame & Canvas */}
      <div className="relative bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-center shadow-inner overflow-hidden">
        {/* Screen Bezel Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full aspect-[4/3] rounded bg-black shadow-md border border-slate-800/80"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Pin Map Footer */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
        <span>MOSI: {pins.mosi ?? 23} | SCK: {pins.sck ?? 18}</span>
        <span>CS: {pins.cs ?? 5} | DC: {pins.dc ?? 16}</span>
      </div>
    </div>
  );
};
