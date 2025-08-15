import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  particleCount?: number;
  durationMs?: number;
  colors?: string[];
  style?: React.CSSProperties;
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  life: number;
};

const defaultColors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7'];

const Confetti: React.FC<ConfettiProps> = ({
  particleCount = 80,
  durationMs = 2000,
  colors = defaultColors,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.parentElement?.clientWidth || 300;
    let height = 140; // 고정 높이로 간결하게 표현
    canvas.width = width;
    canvas.height = height;

    const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

    const particles: Particle[] = Array.from({ length: particleCount }).map(() => ({
      x: width / 2 + randomBetween(-20, 20),
      y: height / 2 + randomBetween(-10, 10),
      vx: randomBetween(-2.5, 2.5),
      vy: randomBetween(-4.0, -1.0),
      size: randomBetween(3, 6),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: randomBetween(0, Math.PI * 2),
      rotationSpeed: randomBetween(-0.2, 0.2),
      life: 1,
    }));

    const onResize = () => {
      width = canvas.parentElement?.clientWidth || 300;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', onResize);

    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const t = Math.min(1, elapsed / durationMs);

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        // 중력과 공기 저항 느낌
        p.vy += 0.06; // gravity
        p.vx *= 0.995;
        p.vy *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.life = 1 - t;

        // 그리기
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (elapsed < durationMs) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [particleCount, durationMs, colors]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: 140,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
};

export default Confetti;


