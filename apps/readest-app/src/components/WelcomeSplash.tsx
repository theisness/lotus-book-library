'use client';

import { useEffect, useRef, useState } from 'react';

const WELCOME_KEY = 'lotus_welcome_shown';

function shouldShow(): boolean {
  try {
    if (localStorage.getItem(WELCOME_KEY)) return false;
    localStorage.setItem(WELCOME_KEY, '1');
    return true;
  } catch {
    return true;
  }
}

/* ── Nebula canvas ───────────────────────────────────────────── */
function useNebulaCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let angle = 0;

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.6 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.018,
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#030010';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w * 0.5, h * 0.5);
      ctx.rotate(angle);

      const blobs = [
        {
          x: -w * 0.18,
          y: -h * 0.12,
          rx: w * 0.52,
          ry: h * 0.38,
          color0: 'rgba(80,20,140,0.55)',
          color1: 'rgba(20,5,60,0)',
        },
        {
          x: w * 0.2,
          y: h * 0.1,
          rx: w * 0.42,
          ry: h * 0.32,
          color0: 'rgba(20,80,160,0.45)',
          color1: 'rgba(5,20,60,0)',
        },
        {
          x: -w * 0.08,
          y: h * 0.16,
          rx: w * 0.36,
          ry: h * 0.28,
          color0: 'rgba(140,30,80,0.35)',
          color1: 'rgba(40,5,20,0)',
        },
        {
          x: w * 0.05,
          y: -h * 0.18,
          rx: w * 0.3,
          ry: h * 0.22,
          color0: 'rgba(20,140,130,0.28)',
          color1: 'rgba(5,30,30,0)',
        },
      ];

      blobs.forEach(({ x, y, rx, ry, color0, color1 }) => {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
        grad.addColorStop(0, color0);
        grad.addColorStop(1, color1);
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });
      ctx.restore();

      const t = performance.now() / 1000;
      stars.forEach((s) => {
        const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed * 60 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.fill();
      });

      angle += 0.00015;
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef]);
}

/* ── Main component ──────────────────────────────────────────── */
const WelcomeSplash = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return shouldShow();
  });
  const [leaving, setLeaving] = useState(false);
  const [showCard] = useState(true);

  useNebulaCanvas(canvasRef);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => setVisible(false), 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') dismiss();
  };

  if (!visible) return null;

  return (
    <button
      type='button'
      onClick={dismiss}
      onKeyDown={handleKeyDown}
      aria-label='关闭欢迎页，进入莲花书院'
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        width: '100%',
        height: '100%',
        animation: leaving ? 'w-fade-out 0.7s ease forwards' : 'w-fade-in 0.6s ease forwards',
        background: 'transparent',
      }}
    >
      {/* Canvas: nebula + stars */}
      <canvas
        ref={canvasRef}
        aria-hidden='true'
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* Welcome card — shown immediately */}
      {(showCard || leaving) && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            padding: '4rem',
            borderRadius: '2rem',
            background: 'rgba(3,0,16,0.6)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,180,210,0.18)',
            boxShadow: '0 8px 64px rgba(120,0,80,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
            maxWidth: '520px',
            width: '92vw',
            minHeight: '360px',
            animation: leaving ? 'w-card-out 0.7s ease forwards' : 'w-card-in 1s ease both',
          }}
        >
          <h1
            style={{
              fontFamily: '"Noto Serif SC", "Source Han Serif CN", STSong, Georgia, serif',
              fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: '#fff',
              textShadow: '0 0 32px rgba(255,160,200,0.7), 0 2px 12px rgba(0,0,0,0.5)',
              margin: 0,
            }}
          >
            欢迎来到
            <br />
            莲花书院
          </h1>
          <p
            style={{
              fontFamily: '"Noto Serif SC", "Source Han Serif CN", STSong, Georgia, serif',
              fontSize: 'clamp(0.82rem, 2vw, 0.95rem)',
              color: 'rgba(255,200,220,0.75)',
              letterSpacing: '0.15em',
              margin: 0,
            }}
          >
            阅读·沉思·洞见
          </p>
          <div
            aria-hidden='true'
            style={{
              width: '5rem',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,180,210,0.6), transparent)',
            }}
          />
          <p
            style={{
              fontSize: '0.72rem',
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.06em',
              margin: 0,
            }}
          >
            点击任意处进入
          </p>
        </div>
      )}

      <style>{`
        @keyframes w-fade-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes w-fade-out { from { opacity:1 } to { opacity:0 } }
        @keyframes w-card-in  { from { opacity:0; transform:translateY(24px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes w-card-out { from { opacity:1; transform:translateY(0) scale(1) } to { opacity:0; transform:translateY(-18px) scale(0.97) } }
      `}</style>
    </button>
  );
};

export default WelcomeSplash;
