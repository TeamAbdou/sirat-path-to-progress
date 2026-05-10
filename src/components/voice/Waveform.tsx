import { useEffect, useRef } from 'react';

interface WaveformProps {
  analyser: AnalyserNode | null;
  className?: string;
}

/**
 * Lightweight canvas waveform — reads time-domain data from an AnalyserNode.
 * Renders nothing extra when analyser is null.
 */
const Waveform = ({ analyser, className }: WaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const buf = new Uint8Array(analyser.fftSize);
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(buf);
      const { width, height } = canvas;
      ctx2d.clearRect(0, 0, width, height);
      ctx2d.lineWidth = 2;
      ctx2d.strokeStyle = 'hsl(var(--primary))';
      ctx2d.beginPath();
      const slice = width / buf.length;
      let x = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
        x += slice;
      }
      ctx2d.lineTo(width, height / 2);
      ctx2d.stroke();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return <canvas ref={canvasRef} width={240} height={40} className={className} />;
};

export default Waveform;
