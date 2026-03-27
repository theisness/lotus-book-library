'use client';

import { useEffect, useState } from 'react';

const WELCOME_KEY = 'lotus_welcome_shown';

const WelcomeSplash = () => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // localStorage：刷新后不再显示；清除浏览器存储可再次显示
    try {
      const shown = localStorage.getItem(WELCOME_KEY);
      if (!shown) {
        setVisible(true);
        localStorage.setItem(WELCOME_KEY, '1');
      }
    } catch {
      // 无痕模式下 localStorage 可能抛出异常，降级为只显示一次
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => setVisible(false), 700);
  };

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        animation: leaving
          ? 'lotus-fade-out 0.7s ease forwards'
          : 'lotus-fade-in 0.8s ease forwards',
        // Ink-wash gradient background
        background: 'radial-gradient(ellipse at 60% 40%, #e8f5e9 0%, #c8e6c9 30%, #1b4332 100%)',
      }}
    >
      {/* Decorative top lotus watermark */}
      <div
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
        <div style={{ fontSize: '4rem', lineHeight: 1, userSelect: 'none' }}>🪷</div>

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

      {/* Keyframe styles injected inline */}
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
    </div>
  );
};

export default WelcomeSplash;
