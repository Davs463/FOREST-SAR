import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useConservation } from './shared';

const STEP_MS = 1800;

/** Illustrative six-step sequence: satellite → pulse → ground → return → processing → change map. Not data. */
export function SarAnimation() {
  const { c } = useConservation();
  const steps = c.technology.animSteps;
  // With reduced motion the sequence starts paused on the last step, so the whole diagram is visible.
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [step, setStep] = useState(() => (reduced ? steps.length - 1 : 0));
  const [playing, setPlaying] = useState(!reduced);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep((s) => (s + 1) % steps.length), STEP_MS);
    return () => window.clearInterval(timer);
  }, [playing, steps.length]);

  const on = (i: number) => (step >= i ? ' is-on' : '');
  return (
    <figure className="cons-anim" data-testid="sar-animation" data-step={step}>
      <svg viewBox="0 0 640 260" className="cons-anim__svg" role="img" aria-label={`${c.technology.animTitle}. ${c.technology.animNote}`}>
        <defs>
          <linearGradient id="cons-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#091510" /><stop offset="1" stopColor="#17362c" /></linearGradient>
        </defs>
        <rect width="640" height="260" rx="10" fill="url(#cons-sky)" />
        {/* stars */}
        {[[40, 30], [120, 18], [210, 44], [300, 22], [520, 30], [600, 52]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="1.3" fill="#cfe7c0" opacity=".6" />)}
        {/* satellite */}
        <g className={`cons-anim__sat${on(0)}`} transform="translate(92 46)">
          <rect x="-12" y="-8" width="24" height="16" rx="2" fill="#e8ebe6" />
          <rect x="-44" y="-5" width="28" height="10" fill="#a3d977" />
          <rect x="16" y="-5" width="28" height="10" fill="#a3d977" />
          <path d="M0 8 v8" stroke="#e8ebe6" strokeWidth="2" />
        </g>
        {/* emitted pulse */}
        <g className={`cons-anim__pulse${on(1)}`}>
          {[0, 1, 2].map((i) => <path key={i} d={`M${100 + i * 18} ${70 + i * 30} q 18 -8 36 0`} fill="none" stroke="#a3d977" strokeWidth="2.5" strokeLinecap="round" />)}
          <path d="M96 64 L196 176" stroke="#a3d977" strokeWidth="1.5" strokeDasharray="5 6" />
        </g>
        {/* ground with trees */}
        <g className={`cons-anim__ground${on(2)}`}>
          <path d="M0 214 C 120 196, 240 222, 360 206 L 360 260 L 0 260 Z" fill="#2c4a2a" />
          {[40, 78, 118, 160, 200, 238, 280, 318].map((x, i) => (
            <g key={x} transform={`translate(${x} ${200 + (i % 2) * 6})`}>
              <rect x="-2" y="0" width="4" height="14" fill="#5b4a32" />
              <circle cx="0" cy="-6" r={i % 3 === 0 ? 12 : 10} fill="#3d8a3f" />
            </g>
          ))}
          <circle className="cons-anim__hit" cx="200" cy="190" r="16" fill="none" stroke="#fdb863" strokeWidth="2" />
        </g>
        {/* return signal */}
        <g className={`cons-anim__return${on(3)}`}>
          <path d="M206 176 L112 64" stroke="#7fc8f8" strokeWidth="1.5" strokeDasharray="5 6" />
          {[0, 1].map((i) => <path key={i} d={`M${170 - i * 30} ${140 - i * 34} q 14 -10 28 -4`} fill="none" stroke="#7fc8f8" strokeWidth="2.5" strokeLinecap="round" />)}
        </g>
        {/* processing */}
        <g className={`cons-anim__proc${on(4)}`} transform="translate(392 72)">
          <rect width="96" height="70" rx="8" fill="#17362c" stroke="#a3d977" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x="14" y={14 + i * 12} width={68 - i * 14} height="5" rx="2" fill="#a3d977" opacity={0.9 - i * 0.18} />)}
          <path d="M-40 34 h34" stroke="#e8ebe6" strokeWidth="1.5" />
        </g>
        {/* change map */}
        <g className={`cons-anim__map${on(5)}`} transform="translate(520 64)">
          <rect width="96" height="96" rx="6" fill="#e8ebe6" />
          {Array.from({ length: 36 }, (_, i) => {
            const x = (i % 6) * 15 + 3; const y = Math.floor(i / 6) * 15 + 3;
            const hot = [8, 9, 14, 15, 21, 27].includes(i);
            return <rect key={i} x={x} y={y} width="13" height="13" rx="2" fill={hot ? '#e66101' : '#8fa89b'} opacity={hot ? 1 : 0.55} />;
          })}
          <path d="M-26 48 h22" stroke="#e8ebe6" strokeWidth="1.5" />
        </g>
      </svg>
      <figcaption className="cons-anim__caption">
        <p className="cons-anim__note mono" data-testid="sar-anim-note">{c.technology.animNote}</p>
        <ol className="cons-anim__steps">
          {steps.map((label, i) => (
            <li key={label}>
              <button type="button" className={step === i ? 'is-current' : undefined} aria-current={step === i ? 'step' : undefined} onClick={() => { setStep(i); setPlaying(false); }}>
                <span className="mono">{i + 1}</span>{label}
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="cons-anim__toggle" onClick={() => setPlaying((v) => !v)} aria-pressed={playing} data-testid="sar-anim-toggle">
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {playing ? c.technology.animPause : c.technology.animPlay}
        </button>
      </figcaption>
    </figure>
  );
}
