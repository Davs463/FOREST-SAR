import { useI18n } from '../../i18n';

interface BeamSpec { id: string; color: string; target: [number, number]; label: string; labelAt: [number, number] }

const START: [number, number] = [214, 128];
const ARC_STEPS = [0.2, 0.36, 0.52, 0.68, 0.84];

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2" y="-6" width="4" height="10" fill="#0b1f19" />
      <path d="M0 -62 L13 -34 H5 L17 -14 H-17 L-5 -34 H-13 Z" fill="#1c4a36" />
      <path d="M0 -62 L6 -45 H-4 Z" fill="#2f6b4a" opacity=".7" />
    </g>
  );
}

function Cloud({ x, y, s = 1, o = 0.85 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <ellipse cx="0" cy="0" rx="46" ry="12" fill="#eef6f1" />
      <ellipse cx="-14" cy="-8" rx="20" ry="12" fill="#f7fbf8" />
      <ellipse cx="14" cy="-11" rx="24" ry="14" fill="#f7fbf8" />
    </g>
  );
}

/** Original decorative illustration: radar satellite, two radar beams, clouds and a pine forest. No external assets. */
export function MissionIllustration() {
  const { t } = useI18n();
  const beams: BeamSpec[] = [
    { id: 'l', color: '#f2cf4a', target: [500, 352], label: t('methodology.bandL'), labelAt: [338, 218] },
    { id: 's', color: '#ec5f86', target: [662, 338], label: t('methodology.bandS'), labelAt: [520, 150] },
  ];
  const pines: [number, number, number][] = [
    [60, 410, 1.1], [96, 420, 0.9], [132, 408, 1.25], [170, 424, 1], [214, 414, 1.15], [260, 426, 0.95],
    [330, 418, 1], [420, 428, 1.1], [472, 416, 0.9], [540, 424, 1.2], [596, 414, 1], [648, 428, 1.3], [706, 416, 1.05], [752, 426, 1.2],
  ];
  return (
    <svg className="mission-art" viewBox="0 0 800 460" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ma-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f3d4a" />
          <stop offset=".55" stopColor="#2c7a78" />
          <stop offset="1" stopColor="#8cc7a4" />
        </linearGradient>
        <pattern id="ma-mesh" width="9" height="9" patternUnits="userSpaceOnUse">
          <path d="M0 0H9M0 0V9" stroke="#d8e6df" strokeWidth=".7" opacity=".8" fill="none" />
        </pattern>
        <clipPath id="ma-dish"><ellipse cx="0" cy="0" rx="74" ry="28" /></clipPath>
      </defs>
      <rect width="800" height="460" fill="url(#ma-sky)" />
      <g fill="#f7fbf8">
        <circle cx="90" cy="40" r="1.6" opacity=".7" /><circle cx="300" cy="28" r="1.3" opacity=".6" /><circle cx="470" cy="52" r="1.6" opacity=".7" />
        <circle cx="620" cy="30" r="1.4" opacity=".6" /><circle cx="740" cy="70" r="1.5" opacity=".7" /><circle cx="40" cy="120" r="1.2" opacity=".5" />
      </g>

      {beams.map((b) => {
        const dx = b.target[0] - START[0];
        const dy = b.target[1] - START[1];
        const len = Math.hypot(dx, dy);
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        const half = len * 0.17;
        const nx = (-dy / len) * half;
        const ny = (dx / len) * half;
        return (
          <g key={b.id}>
            <polygon points={`${START[0]},${START[1]} ${b.target[0] + nx},${b.target[1] + ny} ${b.target[0] - nx},${b.target[1] - ny}`} fill={b.color} opacity=".16" />
            {ARC_STEPS.map((k, i) => {
              const w = len * k * 0.17;
              return (
                <g key={k} transform={`translate(${START[0] + dx * k} ${START[1] + dy * k}) rotate(${ang})`}>
                  <path className="mission-art__wave" style={{ animationDelay: `${i * 0.3}s` }} d={`M0 ${-w} Q${w * 0.55} 0 0 ${w}`} fill="none" stroke={b.color} strokeWidth="3" strokeLinecap="round" />
                </g>
              );
            })}
            <g transform={`translate(${b.labelAt[0]} ${b.labelAt[1]})`}>
              <rect x="-4" y="-14" width={b.label.length * 7.4 + 14} height="22" rx="11" fill="#0b1f19" opacity=".72" />
              <circle cx="7" cy="-3" r="4" fill={b.color} />
              <text x="17" y="1" fontSize="11.5" fontFamily="JetBrains Mono, monospace" fill="#f5f5f0">{b.label}</text>
            </g>
          </g>
        );
      })}

      <Cloud x={120} y={250} s={1.3} o={0.7} />
      <Cloud x={430} y={262} s={1.6} o={0.8} />
      <Cloud x={700} y={236} s={1.2} o={0.7} />
      <Cloud x={560} y={300} s={1.1} o={0.55} />

      <g transform="translate(150 110)">
        <rect x="-122" y="-4" width="70" height="30" fill="#33576a" stroke="#c9d8d3" strokeWidth="1.2" />
        <path d="M-104 -4V26M-87 -4V26M-70 -4V26" stroke="#c9d8d3" strokeWidth=".8" />
        <rect x="-5" y="2" width="22" height="22" rx="3" fill="#d9dfdc" />
        <rect x="-52" y="9" width="48" height="4" fill="#9aa8a2" />
        <g transform="translate(62 6) rotate(-16)">
          <ellipse cx="0" cy="0" rx="74" ry="28" fill="#2a4a40" opacity=".55" />
          <g clipPath="url(#ma-dish)"><rect x="-76" y="-30" width="152" height="60" fill="url(#ma-mesh)" /></g>
          <ellipse cx="0" cy="0" rx="74" ry="28" fill="none" stroke="#e7efe9" strokeWidth="2" />
          <circle cx="0" cy="0" r="3" fill="#a3d977" />
        </g>
        <path d="M62 6 L52 40" stroke="#c9d8d3" strokeWidth="2" />
      </g>

      <path d="M0 372 Q160 332 330 366 T800 352 V460 H0 Z" fill="#2f6b4a" />
      <path d="M0 410 Q200 378 400 404 T800 396 V460 H0 Z" fill="#1f5139" />
      <path d="M0 440 Q260 420 520 438 T800 432 V460 H0 Z" fill="#14382a" />
      {pines.map(([x, y, s]) => <Pine key={x} x={x} y={y} s={s} />)}
    </svg>
  );
}
