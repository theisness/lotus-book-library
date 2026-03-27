'use client';

import { useState } from 'react';

const WELCOME_KEY = 'lotus_welcome_shown';

function shouldShow(): boolean {
  try {
    if (localStorage.getItem(WELCOME_KEY)) return false;
    localStorage.setItem(WELCOME_KEY, '1');
    return true;
  } catch {
    // 无痕模式下 localStorage 不可用，仅当次显示
    return true;
  }
}

const WelcomeSplash = () => {
  // 初始值函数：在渲染前同步读取 localStorage，避免 effect 中 setState
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return shouldShow();
  });
  const [leaving, setLeaving] = useState(false);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => setVisible(false), 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      dismiss();
    }
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
        animation: leaving
          ? 'lotus-fade-out 0.7s ease forwards'
          : 'lotus-fade-in 0.8s ease forwards',
        background: 'radial-gradient(ellipse at 60% 40%, #e8f5e9 0%, #c8e6c9 30%, #1b4332 100%)',
      }}
    >
      {/* Background lotus watermark */}
      <div
        aria-hidden='true'
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            'url("https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1600&q=80&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      />

      {/* Content card */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          padding: '3.5rem 4rem',
          borderRadius: '1.5rem',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,0.22)',
          boxShadow: '0 8px 64px rgba(27,67,50,0.45)',
          maxWidth: '480px',
          width: '90vw',
          animation: leaving
            ? 'lotus-card-out 0.7s ease forwards'
            : 'lotus-card-in 1s ease 0.2s both',
        }}
      >
        {/* Lotus icon */}
        <span aria-hidden='true' style={{ fontSize: '4rem', lineHeight: 1 }}>
          🪷
        </span>

        {/* Main title */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: '"Noto Serif SC", "Source Han Serif CN", "STSong", Georgia, serif',
              fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: '#ffffff',
              textShadow: '0 2px 16px rgba(0,0,0,0.4)',
              margin: 0,
            }}
          >
            欢迎来到莲花书院
          </h1>
          <p
            style={{
              marginTop: '0.75rem',
              fontFamily: '"Noto Serif SC", "Source Han Serif CN", "STSong", Georgia, serif',
              fontSize: 'clamp(0.85rem, 2vw, 1rem)',
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: '0.12em',
            }}
          >
            阅读·沉思·洞见
          </p>
        </div>

        {/* Decorative divider */}
        <div
          aria-hidden='true'
          style={{
            width: '6rem',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
          }}
        />

        {/* Hint */}
        <p
          style={{
            fontSize: '0.78rem',
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.06em',
            margin: 0,
          }}
        >
          点击任意处进入
        </p>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes lotus-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lotus-fade-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes lotus-card-in {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes lotus-card-out {
          from { opacity: 1; transform: translateY(0)    scale(1);    }
          to   { opacity: 0; transform: translateY(-16px) scale(0.97); }
        }
      `}</style>
    </button>
  );
};

export default WelcomeSplash;
