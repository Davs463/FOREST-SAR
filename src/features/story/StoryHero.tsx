import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, Satellite } from 'lucide-react';
import './story-hero.css';

type FloatingIslandProps = {
  variant: 'one' | 'two' | 'three';
  depth: number;
  className: string;
};

function FloatingIsland({ variant, depth, className }: FloatingIslandProps) {
  return (
    <div className={`floating-island ${className}`} data-depth={depth} aria-hidden="true">
      <svg viewBox="0 0 460 320" role="presentation">
        <defs>
          <linearGradient id={`rock-${variant}`} x1=".2" y1="0" x2=".8" y2="1">
            <stop stopColor="#718875" />
            <stop offset=".48" stopColor="#425c4a" />
            <stop offset="1" stopColor="#253e34" />
          </linearGradient>
          <linearGradient id={`soil-${variant}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#a6b897" />
            <stop offset="1" stopColor="#557461" />
          </linearGradient>
          <linearGradient id={`moss-${variant}`} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#7c9a75" />
            <stop offset="1" stopColor="#355844" />
          </linearGradient>
        </defs>
        <ellipse cx="231" cy="282" rx="177" ry="13" fill="#102820" opacity=".14" />
        <path d="M45 118c13-28 49-27 72-47 28-24 60-30 90-17 31-28 67-25 91-4 32-15 67-3 80 24 30 4 46 24 47 48-15 21-47 30-77 38-23 11-30 43-43 66-18 31-31 61-60 67-31 4-47-34-63-56-18 16-38 37-59 29-23-8-15-45-13-67-29 4-52-7-60-31-21 3-48-1-58-21-10-18 8-24 53-29Z" fill={`url(#rock-${variant})`} />
        <path d="M55 117c8-21 35-25 61-36 23-24 54-35 83-24 27-23 62-24 83-6 29-13 55-4 70 17 31 1 47 16 53 36-23 14-51 16-79 13-24 14-62 8-87-1-29 14-53 10-77-2-30 10-64 12-91 1-10 6-19 8-31 8-21 0-29-1-32-6Z" fill={`url(#soil-${variant})`} />
        <path d="M76 117c16-17 38-19 58-12 13-17 36-26 57-17 23-25 49-23 69-5 19-15 43-12 58 5 22-11 43-4 53 13-22 13-43 12-64 4-22 9-42 6-59-4-20 14-43 12-59 1-21 9-47 11-66 2-14 8-34 13-47 5Z" fill={`url(#moss-${variant})`} />
        <g fill="#1c4835">
          <path d="m116 101 18-45 18 45h-10l14 17h-43l14-17Z" />
          <path d="m166 95 15-37 16 37h-9l12 15h-36l12-15Z" />
          <path d="m254 93 17-43 18 43h-10l14 16h-43l14-16Z" />
          <path d="m316 101 14-35 15 35h-8l12 14h-35l12-14Z" />
          <path d="m211 99 11-27 12 27h-7l10 12h-29l10-12Z" />
        </g>
        <g fill="#9bb477" opacity=".8">
          <circle cx="98" cy="101" r="5" /><circle cx="146" cy="84" r="4" /><circle cx="237" cy="94" r="4" />
          <circle cx="296" cy="88" r="5" /><circle cx="350" cy="106" r="4" />
        </g>
        <path d="m103 148-10 37m61-31-5 49m87-46 4 38m72-42-11 45m-77 18 2 31m-43-9-6 25" fill="none" stroke="#a2bd7c" strokeWidth="3" strokeLinecap="round" opacity=".7" />
        <path d="M77 130c42 22 78 5 117 13s78 29 117 7 60-18 96-12" fill="none" stroke="#d0d7b3" strokeWidth="1.5" opacity=".28" />
      </svg>
    </div>
  );
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const segment = (value: number, start: number, end: number) => clamp((value - start) / (end - start));

function setBeat(element: HTMLElement | null, progress: number, enterAt: number, leaveAt: number, initialVisible = false) {
  if (!element) return;
  const entering = initialVisible && progress <= enterAt ? 1 : segment(progress, enterAt, enterAt + 0.13);
  const leaving = segment(progress, leaveAt, leaveAt + 0.12);
  const opacity = entering * (1 - leaving);
  element.style.opacity = String(opacity);
  element.style.visibility = opacity > 0.015 ? 'visible' : 'hidden';
  element.style.transform = `translate3d(0, ${(1 - entering) * 24 - leaving * 20}px, 0)`;
}

export function StoryHero() {
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const story = storyRef.current;
    const stage = stageRef.current;
    if (!story || !stage) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      story.classList.add('story-static');
      return;
    }

    stage.classList.add('story-is-animated');
    const beats = Array.from(stage.querySelectorAll<HTMLElement>('[data-story-beat]'));
    const islands = Array.from(stage.querySelectorAll<HTMLElement>('.floating-island'));
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const update = () => {
      frame = 0;
      const bounds = story.getBoundingClientRect();
      const travel = Math.max(1, story.offsetHeight - window.innerHeight);
      const progress = clamp(-bounds.top / travel);

      setBeat(beats[0] ?? null, progress, 0, 0.29, true);
      setBeat(beats[1] ?? null, progress, 0.25, 0.62);
      setBeat(beats[2] ?? null, progress, 0.58, 1.1);

      islands.forEach((island) => {
        const depth = Number(island.dataset.depth ?? 1);
        const x = -pointerX * depth * 22 + progress * 42 * depth;
        const y = -pointerY * depth * 14 - progress * 118 * depth;
        const scale = 1 + progress * 0.23 * depth;
        island.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
        island.style.opacity = String(Math.max(0, 1 - segment(progress, 0.74, 1.02) * depth * 0.7));
      });

      stage.style.setProperty('--story-progress', String(progress));
      stage.style.setProperty('--story-progress-px', `${progress * 100}%`);
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / Math.max(1, window.innerWidth) - 0.5;
      pointerY = event.clientY / Math.max(1, window.innerHeight) - 0.5;
      scheduleUpdate();
    };

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    stage.addEventListener('pointermove', onPointerMove, { passive: true });
    scheduleUpdate();

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      stage.removeEventListener('pointermove', onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="story-hero" id="home" ref={storyRef} aria-label="BosqueVivo HN introduction">
      <div className="story-stage" ref={stageRef}>
        <div className="story-landscape" aria-hidden="true">
          <div className="story-contours" />
          <div className="story-sun" />
          <div className="story-horizon" />
          <div className="story-scanline" />
          <FloatingIsland variant="one" depth={1.25} className="island-near" />
          <FloatingIsland variant="two" depth={0.78} className="island-mid" />
          <FloatingIsland variant="three" depth={0.48} className="island-far" />
        </div>

        <div className="story-brand-stamp mono"><Satellite size={14} /> BOSQUEVIVO HN <span>·</span> EARTH OBSERVATION</div>
        <div className="story-beats">
          <article className="story-beat beat-opening" data-story-beat="0" aria-label="Introduction">
            <span className="story-kicker"><i /> A LIVING VIEW OF HONDURAS</span>
            <h1>The forest is always changing.<br /><em>Now we can observe how.</em></h1>
            <p>BosqueVivo HN turns satellite radar concepts into a shared space to explore environmental change and local knowledge.</p>
            <a className="story-button" href="#observatory">Explore the observatory <ArrowRight size={16} /></a>
          </article>

          <article className="story-beat beat-signal" data-story-beat="1" aria-label="Understanding the radar signal">
            <span className="story-kicker"><i /> READ THE SIGNAL</span>
            <h2>A view through<br /><em>cloud, time, and change.</em></h2>
            <p>NISAR uses radar to observe Earth's surface day and night, through most clouds. Comparing signals can help researchers find patterns worth investigating.</p>
            <div className="story-readout mono"><span>01 / SEND</span><b>↗</b><span>02 / RETURN</span><b>↗</b><span>03 / COMPARE</span></div>
          </article>

          <article className="story-beat beat-explore" data-story-beat="2" aria-label="Explore the prototype">
            <span className="story-kicker"><i /> EXPLORE HONDURAS</span>
            <h2>Every landscape<br />holds a <em>different story.</em></h2>
            <p>Compare illustrative views, learn what a radar response can mean, and bring community observations into the conversation.</p>
            <a className="story-button" href="#observatory">Enter the observatory <ArrowRight size={16} /></a>
          </article>
        </div>

        <div className="story-coordinate mono">HONDURAS / CONCEPTUAL VIEW<br /><span>ILLUSTRATIVE ART · NOT TO SCALE</span></div>
        <div className="story-scroll-cue mono"><span className="story-scroll-ring"><ArrowDown size={12} /></span> SCROLL TO EXPLORE</div>
        <div className="story-progress" aria-hidden="true"><span /></div>
        <div className="story-demo-note mono">EDUCATIONAL PROTOTYPE · NO LIVE NISAR DATA</div>
      </div>
    </section>
  );
}

export default StoryHero;
