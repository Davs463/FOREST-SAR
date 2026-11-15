export type LayerKey = 'structure' | 'moisture' | 'change';

export type StudyRegion = {
  id: string;
  name: string;
  subtitle: string;
  signal: string;
  comparisonDates: [string, string];
  series: number[];
};

// Place names and locations are suggested prototype study areas. All values and
// signal profiles below are illustrative UI data, not measurements or boundaries.
export const studyRegions: StudyRegion[] = [
  {
    id: 'rio-platano',
    name: 'Río Plátano Biosphere Reserve',
    subtitle: 'La Mosquitia · Gracias a Dios',
    signal: '0.62',
    comparisonDates: ['2026-06-12', '2026-09-18'],
    series: [34, 42, 38, 49, 45, 56, 51, 63],
  },
  {
    id: 'la-tigra',
    name: 'La Tigra National Park',
    subtitle: 'Central Highlands · Francisco Morazán',
    signal: '0.71',
    comparisonDates: ['2026-05-24', '2026-09-02'],
    series: [39, 44, 43, 47, 52, 49, 57, 61],
  },
  {
    id: 'sula',
    name: 'Sula Valley',
    subtitle: 'Northern lowlands · Cortés',
    signal: '0.54',
    comparisonDates: ['2026-06-03', '2026-09-21'],
    series: [51, 45, 53, 42, 56, 38, 49, 35],
  },
];

export const visualizationLayers: { id: LayerKey; label: string; description: string }[] = [
  { id: 'structure', label: 'Canopy structure', description: 'Radar response pattern' },
  { id: 'moisture', label: 'Surface moisture', description: 'Relative signal pattern' },
  { id: 'change', label: 'Change candidates', description: 'Areas to investigate' },
];

export const timelineMonths = ['FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
