import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    setError(false);

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3) {
      const fullPin = newPin.join('');
      if (fullPin === '4444') {
        onLogin();
      } else {
        setError(true);
        setTimeout(() => {
          setPin(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const fullPin = pin.join('');
      if (fullPin.length === 4) {
        if (fullPin === '4444') {
          onLogin();
        } else {
          setError(true);
          setTimeout(() => {
            setPin(['', '', '', '']);
            inputRefs.current[0]?.focus();
          }, 600);
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const newPin = pasted.split('');
      setPin(newPin);
      if (pasted === '4444') {
        setTimeout(() => onLogin(), 200);
      } else {
        setError(true);
        setTimeout(() => {
          setPin(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: '#080b12' }}>
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 50% 40% at 50% 45%, rgba(99,102,241,0.06) 0%, transparent 70%)'
      }} />

      {/* Minimalist login card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Monogram mark */}
        <div className="w-8 h-8 rounded-md flex items-center justify-center mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.05) 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20h20M5 20V8l7-5 7 5v12" />
            <path d="M9 20v-5h6v5" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-[11px] font-medium tracking-[0.35em] uppercase mb-1"
          style={{ color: 'rgba(148,163,184,0.7)' }}>
          IMHOTEP STUDIO
        </h1>
        <p className="text-[9px] tracking-[0.2em] uppercase mb-8"
          style={{ color: 'rgba(100,116,139,0.4)' }}>
          Acceso restringido
        </p>

        {/* PIN inputs */}
        <motion.div
          className="flex gap-2.5 mb-5"
          animate={error ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onFocus={() => setFocusedIndex(i)}
              onPaste={i === 0 ? handlePaste : undefined}
              className="outline-none text-center transition-all duration-300"
              style={{
                width: '36px',
                height: '40px',
                background: digit ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.015)',
                border: `1px solid ${
                  error ? 'rgba(239,68,68,0.4)' :
                  focusedIndex === i ? 'rgba(99,102,241,0.35)' :
                  digit ? 'rgba(99,102,241,0.15)' :
                  'rgba(255,255,255,0.06)'
                }`,
                borderRadius: '8px',
                color: 'rgba(226,232,240,0.9)',
                fontSize: '15px',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 500,
                letterSpacing: '0',
                caretColor: 'rgba(99,102,241,0.6)',
                boxShadow: focusedIndex === i ? '0 0 0 2px rgba(99,102,241,0.08)' : 'none',
              }}
              autoComplete="off"
            />
          ))}
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[9px] tracking-wider uppercase"
              style={{ color: 'rgba(239,68,68,0.6)' }}
            >
              PIN incorrecto
            </motion.p>
          )}
        </AnimatePresence>

        {/* Dots indicator */}
        <div className="flex gap-1.5 mt-6">
          {pin.map((digit, i) => (
            <div
              key={i}
              className="transition-all duration-300"
              style={{
                width: '3px',
                height: '3px',
                borderRadius: '50%',
                background: digit
                  ? 'rgba(99,102,241,0.6)'
                  : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Bottom brand */}
      <div className="absolute bottom-5 left-0 right-0 text-center">
        <span className="text-[8px] tracking-[0.4em] uppercase"
          style={{ color: 'rgba(100,116,139,0.2)' }}>
          ADRIANSTOOT
        </span>
      </div>
    </div>
  );
};
