import { useMemo, useState } from 'react';
import { studyRegions, timelineMonths, visualizationLayers, type LayerKey, type StudyRegion } from './observatoryData';
import './observatory.css';

function RadarScene({ layer, regionId, after = false }: { layer: LayerKey; regionId: string; after?: boolean }) {
  return (
    <div className={`radar-scene radar-scene--${layer} ${after ? 'radar-scene--after' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 800 440" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id={`grain-${regionId}-${layer}-${after ? 'b' : 'a'}`} width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="4" r="1.2" fill="currentColor" opacity=".22" />
            <circle cx="13" cy="11" r=".8" fill="currentColor" opacity=".18" />
            <path d="M0 16 7 13M11 3l5-2" stroke="currentColor" strokeWidth=".7" opacity=".18" />
          </pattern>
          <linearGradient id={`terrain-${regionId}-${layer}-${after ? 'b' : 'a'}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#8eaa7b" />
            <stop offset=".48" stopColor="#466b58" />
            <stop offset="1" stopColor="#183b32" />
          </linearGradient>
        </defs>
        <rect width="800" height="440" fill={`url(#terrain-${regionId}-${layer}-${after ? 'b' : 'a'})`} />
        <path d="M-20 290C80 250 87 126 197 127s133 87 226 46 111-90 190-54 112 17 214-42v389H-20Z" fill="#b4bd83" opacity=".34" />
        <path d="M-15 327c110-64 167-20 229-68s134-130 219-82 110 83 193 31 119-33 187-73" fill="none" stroke="#e1ddb2" strokeWidth="2" opacity=".48" />
        <path d="M12 132c58 20 115 8 160-20s114-27 155 6 107 49 162 12 92-61 160-38 97 34 158 11" fill="none" stroke="#d9dfbd" strokeWidth="1.4" opacity=".42" />
        <path d="M0 0h800v440H0z" fill={`url(#grain-${regionId}-${layer}-${after ? 'b' : 'a'})`} />
        {regionId === 'sula' && <path d="M0 300c110-50 167 52 252-1s109-5 178-45 99 24 160-3 125-97 210-71v260H0Z" fill="#96b8a6" opacity=".44" />}
        {regionId === 'la-tigra' && <path d="M-20 260 81 190l55 24 68-76 57 39 65-92 64 58 57-49 88 91 71-18 91 78 117-21v240H-20Z" fill="#c3c69b" opacity=".35" />}
        {layer === 'change' && (
          <g fill="#d1ee84" stroke="#f2f0d5" strokeWidth="1.4">
            <path d="m208 201 22-15 17 14-9 24-28 2Z" opacity={after ? '.87' : '.48'} />
            <path d="m485 279 26-8 13 16-11 23-27-6Z" opacity={after ? '.72' : '.35'} />
            <path d="m594 125 18-9 14 12-7 19-21 2Z" opacity={after ? '.62' : '.3'} />
          </g>
        )}
        {layer === 'moisture' && <g fill="none" stroke="#d1ee84" strokeWidth="11" opacity={after ? '.5' : '.32'}><path d="M88 284c57-42 120-43 171-10s105 32 160-6 109-48 162-13 96 34 143-5" /><path d="M75 321c60-41 120-42 174-12s104 31 160-4 106-46 159-15 97 37 141-1" strokeWidth="5" /></g>}
        <g fill="none" stroke="#f0f0d6" strokeWidth="1" opacity=".52">
          <path d="M0 74c117 41 152-39 264-10s142 78 249 30 184-56 287-3" />
          <path d="M0 96c118 40 151-38 265-8s139 76 249 27 181-53 286-1" />
          <path d="M10 365c109-30 143 14 231-9s135-59 236-19 174 34 328-10" />
        </g>
      </svg>
      <span className="scene-grid" />
      <span className="scene-crosshair" />
      <span className="scene-caption">SIMULATED RADAR VIEW</span>
    </div>
  );
}

function TimeSeries({ region }: { region: StudyRegion }) {
  const points = region.series.map((value, index) => `${24 + index * 42},${88 - value * 0.78}`).join(' ');
  const areaPoints = `24,94 ${points} 318,94`;

  return (
    <div className="series-wrap">
      <svg className="series-chart" viewBox="0 0 350 112" role="img" aria-label="Illustrative radar signal pattern across eight months">
        <defs><linearGradient id="series-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#a3d977" stopOpacity=".33" /><stop offset="1" stopColor="#a3d977" stopOpacity="0" /></linearGradient></defs>
        {[24, 48, 72, 96].map((y) => <line key={y} x1="24" x2="330" y1={y} y2={y} stroke="currentColor" opacity=".11" />)}
        <polygon points={areaPoints} fill="url(#series-fill)" />
        <polyline points={points} fill="none" stroke="#659666" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {region.series.map((value, index) => <circle key={index} cx={24 + index * 42} cy={88 - value * 0.78} r="3" fill="#f7f6ef" stroke="#659666" strokeWidth="2" />)}
      </svg>
      <div className="series-months" aria-hidden="true">{timelineMonths.map((month) => <span key={month}>{month}</span>)}</div>
    </div>
  );
}

export function Observatory() {
  const [regionId, setRegionId] = useState(studyRegions[0].id);
  const [layer, setLayer] = useState<LayerKey>('structure');
  const [position, setPosition] = useState(54);
  const [startDate, setStartDate] = useState(studyRegions[0].comparisonDates[0]);
  const [endDate, setEndDate] = useState(studyRegions[0].comparisonDates[1]);
  const [selectedPoint, setSelectedPoint] = useState(false);
  const region = useMemo(() => studyRegions.find((item) => item.id === regionId) ?? studyRegions[0], [regionId]);

  function selectRegion(nextId: string) {
    const nextRegion = studyRegions.find((item) => item.id === nextId);
    if (!nextRegion) return;
    setRegionId(nextId);
    setStartDate(nextRegion.comparisonDates[0]);
    setEndDate(nextRegion.comparisonDates[1]);
    setSelectedPoint(false);
  }

  return (
    <section className="observatory section-shell" id="observatory" aria-labelledby="observatory-title">
      <div className="observatory-intro">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> EARTH OBSERVATION / HONDURAS</p>
          <h2 id="observatory-title">Look closer.<br /><em>See what shifts.</em></h2>
        </div>
        <p className="observatory-lede">Explore how radar can help us observe changing landscapes, through a prototype built around Honduras’ forests and watersheds.</p>
      </div>

      <div className="observatory-frame">
        <header className="observatory-toolbar">
          <label className="region-select-wrap">
            <span className="data-label">STUDY AREA</span>
            <select value={regionId} onChange={(event) => selectRegion(event.target.value)} aria-label="Select a study area">
              {studyRegions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className="date-controls">
            <label><span className="data-label">COMPARISON LABEL A</span><input aria-label="Comparison label A; does not query imagery" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <span className="date-divider" aria-hidden="true">→</span>
            <label><span className="data-label">COMPARISON LABEL B</span><input aria-label="Comparison label B; does not query imagery" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            <p className="date-note">Dates are labels only · no imagery is queried</p>
          </div>
          <span className="demo-badge"><span /> DEMO DATA</span>
        </header>

        <div className="observatory-body">
          <div className="map-column">
            <div className="map-topline">
              <div><h3>{region.name}</h3><p>{region.subtitle} <span>·</span> CANDIDATE STUDY AREA</p></div>
              <button type="button" className="map-reset" onClick={() => setPosition(54)} aria-label="Reset comparison divider">RESET SWIPE ↺</button>
            </div>
            <div className="comparison">
              <RadarScene layer={layer} regionId={region.id} />
              <div className="comparison-after" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
                <RadarScene layer={layer} regionId={region.id} after />
              </div>
              <div className="compare-divider" style={{ left: `${position}%` }} aria-hidden="true"><span>↔</span></div>
              <span className="compare-tag compare-tag--a">LABEL A · {startDate || '—'}</span>
              <span className="compare-tag compare-tag--b">LABEL B · {endDate || '—'}</span>
              <button className="map-hotspot" type="button" style={{ left: '62%', top: '48%' }} aria-label="Inspect an illustrative change candidate" aria-pressed={selectedPoint} onClick={() => setSelectedPoint((selected) => !selected)}><span /></button>
              <input className="compare-range" type="range" min="5" max="95" value={position} onChange={(event) => setPosition(Number(event.target.value))} aria-label="Drag to compare illustration A and B" />
              {selectedPoint && <div className="hotspot-card"><span className="data-label">CANDIDATE AREA · DEMO</span><strong>Signal pattern differs</strong><p>Requires review with calibrated imagery and local knowledge.</p></div>}
            </div>
            <div className="map-footline"><span><i className="status-dot" /> CANDIDATE STUDY AREA</span><span>CONCEPTUAL VISUALIZATION · NOT NISAR OBSERVATIONS</span></div>
            <div className="layer-row" role="group" aria-label="Map visualization layer">
              <span className="data-label">VIEW LAYER</span>
              {visualizationLayers.map((item) => <button type="button" key={item.id} className={`layer-button ${layer === item.id ? 'is-active' : ''}`} aria-pressed={layer === item.id} onClick={() => setLayer(item.id)} title={item.description}>{item.label}</button>)}
            </div>
          </div>

          <aside className="observatory-side" aria-label="Study area information">
            <div className="side-section side-summary">
              <div className="side-heading"><span className="data-label">AREA BRIEF</span><span className="brief-index">01 / 03</span></div>
              <div className="study-area-schematic" role="group" aria-label="Honduras study areas, schematic not to scale">
                <svg viewBox="0 0 300 142" aria-hidden="true" focusable="false">
                  <path className="honduras-outline" d="M16 67 37 51 52 54 68 40 91 44 104 34 128 43 145 37 161 48 181 42 197 50 216 46 235 56 251 54 269 64 285 62 279 79 264 87 253 101 235 99 221 110 203 106 190 119 169 112 153 122 137 113 120 119 104 109 86 113 74 101 56 103 49 89 32 87 27 76Z" />
                  <path className="schematic-river" d="M36 76c42-14 56 13 93-1s55-12 82 0 44 4 63-8" />
                </svg>
                <button type="button" className={`study-marker study-marker--rio ${regionId === 'rio-platano' ? 'is-selected' : ''}`} aria-label="Select Río Plátano Biosphere Reserve" aria-pressed={regionId === 'rio-platano'} onClick={() => selectRegion('rio-platano')}><span className="study-marker-dot" /><span className="study-marker-label">Río Plátano</span></button>
                <button type="button" className={`study-marker study-marker--tigra ${regionId === 'la-tigra' ? 'is-selected' : ''}`} aria-label="Select La Tigra National Park" aria-pressed={regionId === 'la-tigra'} onClick={() => selectRegion('la-tigra')}><span className="study-marker-dot" /><span className="study-marker-label">La Tigra</span></button>
                <button type="button" className={`study-marker study-marker--sula ${regionId === 'sula' ? 'is-selected' : ''}`} aria-label="Select Sula Valley" aria-pressed={regionId === 'sula'} onClick={() => selectRegion('sula')}><span className="study-marker-dot" /><span className="study-marker-label">Sula Valley</span></button>
              </div>
              <p className="schematic-note">SCHEMATIC / NOT TO SCALE · STUDY AREA PROPOSALS</p>
              <p className="brief-copy">A place to explore how multi-date radar observations may reveal patterns worth a closer look.</p>
              <div className="brief-meta"><span>LANDSCAPE</span><strong>{regionId === 'sula' ? 'WETLAND · AGRICULTURE' : 'MONTANE · TROPICAL FOREST'}</strong></div>
              <div className="brief-meta"><span>LOCATION STATUS</span><strong>CANDIDATE AREA</strong></div>
            </div>

            <div className="side-section signal-section">
              <div className="side-heading"><span className="data-label">SIGNAL PROFILE</span><span className="tiny-note">ILLUSTRATIVE</span></div>
              <div className="signal-value">{region.signal}<span>relative pattern</span></div>
              <TimeSeries region={region} />
              <div className="signal-legend"><span><i /> DEMO SIGNAL</span><span>FEB — SEP 2026</span></div>
            </div>

            <div className="side-section interpretation-section">
              <div className="side-heading"><span className="data-label">WHAT YOU’RE SEEING</span><span className="info-mark" aria-label="Interpretation note">i</span></div>
              <p>{selectedPoint ? 'This highlighted area represents a possible signal difference. It is a prompt for investigation, not a confirmed environmental event.' : visualizationLayers.find((item) => item.id === layer)?.description + ' across two comparison labels. The dates do not query image data. Select a marker to inspect a sample interpretation.'}</p>
            <a className="learn-link" href="#science">HOW RADAR OBSERVES <span>↗</span></a>
            </div>
          </aside>
        </div>
        <footer className="observatory-disclaimer"><span>PROTOTYPE / LOCAL DEMONSTRATION DATA</span><span>DATES ARE LABELS ONLY · NO IMAGE DATA IS QUERIED</span></footer>
      </div>
    </section>
  );
}

export default Observatory;
