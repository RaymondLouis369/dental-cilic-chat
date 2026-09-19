import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, RefreshCw } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  height?: number;
  className?: string;
  isRtl?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  height = 180,
  className = '',
  isRtl = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Initialize Canvas with proper high-DPI resolution
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a'; // Deep slate ink
    }
  }, []);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => {
      window.removeEventListener('resize', initCanvas);
    };
  }, [initCanvas]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return null;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    }
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      if (!hasDrawn) {
        setHasDrawn(true);
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
    onSignatureChange(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-400 transition-all overflow-hidden">
        {/* Helper watermark / baseline */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
            {isRtl ? 'منطقة التوقيع الرقمي للمريض' : 'Patient Digital Signature Area'}
          </div>
          <div className="border-b border-dashed border-slate-300 w-full mb-6 flex justify-between items-center px-2">
            <span className="text-[10px] text-slate-300 select-none">X</span>
            <span className="text-[10px] text-slate-300 select-none">
              {isRtl ? 'وقع على الخط' : 'Sign on line'}
            </span>
          </div>
        </div>

        {/* HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          style={{ height: `${height}px`, touchAction: 'none' }}
          className="w-full cursor-crosshair relative z-10 block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}

        />

        {/* Floating Clear Button */}
        <button
          type="button"
          onClick={handleClear}
          id="clear-signature-btn"
          disabled={!hasDrawn}
          className={`absolute top-2.5 ${
            isRtl ? 'left-2.5' : 'right-2.5'
          } z-20 px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all`}
        >
          <Eraser className="w-3.5 h-3.5 text-amber-600" />
          <span>{isRtl ? 'مسح التوقيع' : 'Clear'}</span>
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>
          {hasDrawn
            ? isRtl
              ? '✓ تم تسجيل التوقيع على الشاشة'
              : '✓ Signature captured on canvas'
            : isRtl
            ? 'استخدم الماوس أو اللمس للتوقيع بالداخل'
            : 'Use mouse, stylus, or finger to sign inside'}
        </span>
        {hasDrawn && (
          <button
            type="button"
            onClick={handleClear}
            className="text-amber-700 font-bold hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{isRtl ? 'إعادة التوقيع' : 'Re-sign'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
