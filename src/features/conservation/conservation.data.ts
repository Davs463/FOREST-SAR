// Forest & Conservation: language-neutral facts, sources and image credits.
// Every number here comes from the team's source document (see docs/conservation/README.md) with its
// citation id. Historical figures keep their year; none of them is a FOREST-SAR measurement.

export type SourceId =
  | 'ritchie2021' | 'chazdon2016' | 'icf2018' | 'icf2021' | 'icfnd' | 'brand2024' | 'bbva2026' | 'fao'
  | 'natgeo2024' | 'ortiz2022' | 'aquae' | 'jpl2017a' | 'jpl2017b' | 'jpl2017c' | 'jpl2017d' | 'jpl2023'
  | 'jplcaltech2023' | 'earthdataA' | 'earthdataB' | 'earthdata2026' | 'nasaA' | 'nasaB' | 'nasaC'
  | 'sinit2024' | 'tigraPlan' | 'bustillo2026' | 'saatchi2007';

export interface Source {
  id: SourceId;
  /** Short in-text label, e.g. "ICF, 2018". */
  short: string;
  /** Reference as cited in the source document (no invented titles). */
  full: string;
  /** Only links that were opened and checked (HTTP 200, matching title) on 2026-11-15. */
  url?: string;
}

export const SOURCES: readonly Source[] = [
  { id: 'ritchie2021', short: 'Ritchie, 2021', full: 'Ritchie, H. (2021). Deforestation and Forest Loss. Our World in Data.', url: 'https://ourworldindata.org/deforestation' },
  { id: 'chazdon2016', short: 'Chazdon, 2016', full: 'Chazdon, R. L. et al. (2016). When is a forest a forest? Forest concepts and definitions in the era of forest and landscape restoration. Ambio.', url: 'https://doi.org/10.1007/s13280-016-0772-y' },
  { id: 'icf2018', short: 'ICF, 2018', full: 'Instituto Nacional de Conservación y Desarrollo Forestal, Áreas Protegidas y Vida Silvestre [ICF]. (2018).', url: 'https://www.icf.gob.hn/' },
  { id: 'icf2021', short: 'ICF, 2021', full: 'Instituto Nacional de Conservación y Desarrollo Forestal, Áreas Protegidas y Vida Silvestre [ICF]. (2021).', url: 'https://www.icf.gob.hn/' },
  { id: 'icfnd', short: 'ICF, n.d.', full: 'Instituto Nacional de Conservación y Desarrollo Forestal, Áreas Protegidas y Vida Silvestre [ICF]. (n.d.).', url: 'https://www.icf.gob.hn/' },
  { id: 'brand2024', short: 'Brand Studio, 2024', full: 'Brand Studio. (2024).' },
  { id: 'bbva2026', short: 'BBVA, 2026', full: 'BBVA. (2026).' },
  { id: 'fao', short: 'FAO, n.d.', full: 'Food and Agriculture Organization of the United Nations [FAO]. (n.d.).' },
  { id: 'natgeo2024', short: 'National Geographic, 2024', full: 'National Geographic. (2024). Deforestation.', url: 'https://education.nationalgeographic.org/resource/deforestation/' },
  { id: 'ortiz2022', short: 'Ortiz, 2022', full: 'Ortiz. (2022).' },
  { id: 'aquae', short: 'Aquae, n.d.', full: 'Fundación Aquae. (n.d.).' },
  { id: 'jpl2017a', short: 'NASA JPL, 2017a', full: 'NASA Jet Propulsion Laboratory [NASA JPL]. (2017a).' },
  { id: 'jpl2017b', short: 'NASA JPL, 2017b', full: 'NASA Jet Propulsion Laboratory [NASA JPL]. (2017b).' },
  { id: 'jpl2017c', short: 'NASA JPL, 2017c', full: 'NASA Jet Propulsion Laboratory [NASA JPL]. (2017c).' },
  { id: 'jpl2017d', short: 'NASA JPL, 2017d', full: 'NASA Jet Propulsion Laboratory [NASA JPL]. (2017d).' },
  { id: 'jpl2023', short: 'NASA JPL, 2023', full: 'NASA Jet Propulsion Laboratory [NASA JPL]. (2023).' },
  { id: 'jplcaltech2023', short: 'NASA/JPL-Caltech, 2023', full: 'NASA/JPL-Caltech. (2023).' },
  { id: 'earthdataA', short: 'NASA Earthdata, n.d.-a', full: 'NASA Earthdata. (n.d.-a). Remote Sensing.', url: 'https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/remote-sensing' },
  { id: 'earthdataB', short: 'NASA Earthdata, n.d.-b', full: 'NASA Earthdata. (n.d.-b). What is Synthetic Aperture Radar?', url: 'https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar' },
  { id: 'earthdata2026', short: 'NASA Earthdata, 2026', full: 'NASA Earthdata. (2026).' },
  { id: 'nasaA', short: 'NASA, n.d.-a', full: 'NASA. (n.d.-a).' },
  { id: 'nasaB', short: 'NASA, n.d.-b', full: 'NASA. (n.d.-b).' },
  { id: 'nasaC', short: 'NASA, n.d.-c', full: 'NASA. (n.d.-c).' },
  { id: 'sinit2024', short: 'SINIT, 2024', full: 'Sistema Nacional de Información Territorial [SINIT]. (2024).' },
  { id: 'tigraPlan', short: 'Management plan, n.d.', full: 'Plan de manejo del Parque Nacional La Tigra. (n.d.).' },
  { id: 'bustillo2026', short: 'Bustillo, 2026', full: 'Bustillo. (2026).' },
  { id: 'saatchi2007', short: 'Saatchi et al., 2007', full: 'Saatchi, S. et al. (2007), as cited in NASA JPL (2017a).' },
];

export const sourceById = (id: SourceId): Source => SOURCES.find((s) => s.id === id) as Source;

/** Honduras national forest cover (ICF, 2018). Historical, not a 2026 measurement. */
export const HONDURAS_FOREST = { totalHa: 5_384_424.88, territoryPct: 48, year: 2018, source: 'icf2018' as SourceId };

export type ForestTypeId = 'broadleaf' | 'coniferous' | 'mixed' | 'mangrove';
/** Categorical colours validated with the dataviz palette checker (light surface): all checks pass. */
export const FOREST_TYPES: readonly { id: ForestTypeId; pct: number; ha: number; color: string; image: ImageId }[] = [
  { id: 'broadleaf', pct: 57.1, ha: 3_074_310.15, color: '#3d8a3f', image: 'broadleaf' },
  { id: 'coniferous', pct: 36.6, ha: 1_972_675.12, color: '#1f78b4', image: 'coniferous' },
  { id: 'mixed', pct: 5.3, ha: 285_468.77, color: '#c98a1a', image: 'mixed' },
  { id: 'mangrove', pct: 1.0, ha: 51_970.84, color: '#9c4f8f', image: 'mangrove' },
];

/** Francisco Morazán (department) — ICF, n.d. */
export const MORAZAN = { forestHa: 627_637, territoryPct: 73, pineHa: 326_261, fires2024: 647, burned2024Ha: 61_820 };

/** Suyapa "Mero" Wildlife Refuge by municipality (Brand Studio, 2024). Parts add up to 5,107 ha. */
export const MERO_SPLIT: readonly { name: string; ha: number }[] = [
  { name: 'Distrito Central', ha: 3_943 },
  { name: 'Santa Lucía', ha: 840 },
  { name: 'San Antonio de Oriente', ha: 320 },
  { name: 'Valle de Ángeles', ha: 4 },
];

export type ImageId =
  | 'hero' | 'tigra' | 'tigraWater' | 'broadleaf' | 'coniferous' | 'mixed' | 'mangrove'
  | 'agriculture' | 'urban' | 'fire' | 'fragmentation';

export interface ImageCredit {
  file: string;
  width: number;
  height: number;
  author: string;
  license: string;
  licenseUrl?: string;
  page: string;
}

const COMMONS = 'https://commons.wikimedia.org/wiki/File:';
const BYSA3 = 'https://creativecommons.org/licenses/by-sa/3.0/';
const BYSA4 = 'https://creativecommons.org/licenses/by-sa/4.0/';

/** Real photographs from Wikimedia Commons (licences checked through the Commons API). Paths relative to BASE_URL. */
export const IMAGES: Record<ImageId, ImageCredit> = {
  hero: { file: 'conservation/hero-la-tigra.webp', width: 1800, height: 1198, author: 'Jorge Luis Murillo Palma', license: 'CC BY-SA 3.0', licenseUrl: BYSA3, page: `${COMMONS}LA_TIGRA,_JlMurillo.jpg` },
  tigra: { file: 'conservation/la-tigra-san-juancito.webp', width: 1000, height: 750, author: 'Blindc1rca', license: 'Public domain', page: `${COMMONS}SanJuancito2010.jpg` },
  tigraWater: { file: 'conservation/la-tigra-waterfall.webp', width: 432, height: 576, author: 'Blindc1rca', license: 'Public domain', page: `${COMMONS}LaTigraWaterfall.jpg` },
  broadleaf: { file: 'conservation/broadleaf-rio-platano.webp', width: 900, height: 522, author: 'Caracho de corazón', license: 'CC BY-SA 4.0', licenseUrl: BYSA4, page: `${COMMONS}Selva_tropical_en_la_biosfera_de_el_rio_pl%C3%A1tano_Honduras.jpg` },
  coniferous: { file: 'conservation/coniferous-la-labor.webp', width: 900, height: 675, author: 'THEHN4LIFE', license: 'CC0', page: `${COMMONS}Bosque_de_Pinos_En_La_Labor_Ocotepeque_Honduras.jpg` },
  mixed: { file: 'conservation/mixed-cusuco.webp', width: 900, height: 675, author: 'Timc tree', license: 'CC BY-SA 4.0', licenseUrl: BYSA4, page: `${COMMONS}Pinus_maximinoi_in_Cusuco_National_Park_Honduras.jpg` },
  mangrove: { file: 'conservation/mangrove-san-lorenzo.webp', width: 900, height: 675, author: 'Carlos Funes', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', page: `${COMMONS}Red_Mangrove,_San_Lorenzo,_Honduras.jpg` },
  agriculture: { file: 'conservation/threat-agriculture.webp', width: 900, height: 1200, author: 'Katherin Osorio', license: 'CC BY-SA 4.0', licenseUrl: BYSA4, page: `${COMMONS}Deforestaci%C3%B3n_en_el_bosque_el_Honduras,_Santa_Rosa_de_Cop%C3%A1n.jpg` },
  urban: { file: 'conservation/threat-urban.webp', width: 900, height: 679, author: 'Wikimedia Commons contributor', license: 'Public domain', page: `${COMMONS}Tegucigalpa.JPG` },
  fire: { file: 'conservation/threat-fire-la-tigra.webp', width: 1000, height: 707, author: 'European Union, Copernicus Sentinel-2 imagery', license: 'Attribution', page: `${COMMONS}Wildfire_in_La_Tigra_National_Park_(Copernicus_2024-03-29).jpg` },
  fragmentation: { file: 'conservation/threat-fragmentation.webp', width: 900, height: 600, author: 'Emeinke (English Wikipedia)', license: 'CC BY-SA 3.0', licenseUrl: BYSA3, page: `${COMMONS}ForestFragmentation.jpg` },
};

export const imageSrc = (id: ImageId): string => `${import.meta.env.BASE_URL}${IMAGES[id].file}`;

export const SECTION_IDS = ['forests', 'protected', 'threats', 'benefits', 'technology', 'involved'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const ROLE_IDS = ['observer', 'analyst', 'liaison', 'brigade', 'communications', 'volunteer'] as const;
export type RoleId = (typeof ROLE_IDS)[number];

/** Municipalities mentioned in the source document around La Tigra and the Mero refuge. */
export const MUNICIPALITIES = ['Distrito Central', 'Santa Lucía', 'Valle de Ángeles', 'San Antonio de Oriente', 'Cantarranas'] as const;
