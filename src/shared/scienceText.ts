import type { Locale } from '../config/app.config';

/**
 * Presentation translations for scientific strings published in English by the engine
 * (limitations and pair-compatibility reasons). The original English text stays the source
 * of truth: it is always available in technical details, and anything not matched here is
 * shown verbatim (never dropped, never paraphrased into something weaker).
 */

interface LimitationText { match: RegExp; es: string }

// Matched by stable prefix of the engine's wording (scientific-engine/export.py).
const LIMITATIONS: LimitationText[] = [
  { match: /^Radar backscatter change only/i, es: 'Solo cambio de retrodispersión radar (HVHV gamma0, banda L): no es una medición de deforestación ni de pérdida de bosque.' },
  { match: /^No forest\/non-forest base mask/i, es: 'No se aplicó una máscara base de bosque/no bosque: la población es cada píxel válido de la ventana de estudio.' },
  { match: /^Single compatible pair/i, es: 'Una sola pareja compatible: no hay persistencia, tendencia ni confirmación repetida.' },
  { match: /^Tillage, soil moisture/i, es: 'Labranza, humedad del suelo, lluvia, fenología, pendiente/geometría y saturación son explicaciones alternativas.' },
  { match: /^Harmony subset COGs do not carry/i, es: 'Los COG del subconjunto Harmony no incluyen los atributos de identificación HDF5: track/frame/paso/mirada se verificaron solo con CMR UMM-G.' },
  { match: /^Known issue \(ASF/i, es: 'Problema conocido (ASF, 2026-02-27): la máscara GCOV puede estar desalineada con los datos en los bordes del producto; los píxeles de borde pueden verse afectados.' },
  { match: /^Threshold 3 dB is exploratory/i, es: 'El umbral de 3 dB es exploratorio; no se estimó el piso de ruido; no se aplicó normalización.' },
  { match: /^Speckle reduced, not eliminated/i, es: 'El speckle (ruido granular del radar) se redujo, no se eliminó: se promedió la potencia lineal en bloques de 10×10 píxeles (celdas de 100 m; cada celda necesita ≥ 0,9 de fracción válida en ambas fechas). Las diferencias nativas de 10 m estaban dominadas por speckle (ver diagnostics.native_10m); los candidatos por celda aún incluyen ruido residual y efectos de geometría y humedad.' },
  { match: /^Candidate areas are sums of whole multilook cells/i, es: 'Las áreas candidatas son sumas de celdas multilook completas; los rasgos menores que una celda no se resuelven. No se aplicó filtro de parche mínimo.' },
  { match: /^TP, cv_initial, cv_final and rhythm_12d are null/i, es: 'TP, cv_initial, cv_final y rhythm_12d son nulos: no hay mediciones comparables de cobertura vegetal.' },
  { match: /^Provisional-maturity product/i, es: 'Producto de madurez provisional (NISAR_L2_GCOV_PROVISIONAL_V1); no es una versión validada.' },
  { match: /^Coverage percentages use the study-window polygon/i, es: 'Los porcentajes de cobertura usan el polígono de la ventana de estudio (bbox provisional), no un límite municipal.' },
];

/** Translated limitation for display; the English original is returned for `en` or when unmatched. */
export function limitationText(original: string, locale: Locale): string {
  if (locale === 'en') return original;
  return LIMITATIONS.find((item) => item.match.test(original))?.es ?? original;
}

interface ClauseText { match: RegExp; en: (m: RegExpMatchArray) => string; es: (m: RegExpMatchArray) => string }

const PASS_ES: Record<string, string> = { ASCENDING: 'ascendente', DESCENDING: 'descendente' };
const passEs = (value: string) => PASS_ES[value] ?? value;

// Clauses emitted by scientific-engine/pairing.py, joined with "; ".
const CLAUSES: ClauseText[] = [
  { match: /^different frame \((\S+) vs (\S+)\)$/, en: (m) => `Different frame (${m[1]} vs ${m[2]})`, es: (m) => `Distinto frame (${m[1]} vs ${m[2]})` },
  { match: /^different track \((\S+) vs (\S+)\)$/, en: (m) => `Different orbit track (${m[1]} vs ${m[2]})`, es: (m) => `Distinta órbita/track (${m[1]} vs ${m[2]})` },
  { match: /^common AOI coverage ([\d.]+)% below minimum ([\d.]+)%$/, en: (m) => `Too little shared coverage of the study window (${m[1]}% < ${m[2]}%)`, es: (m) => `Muy poca cobertura común de la ventana de estudio (${m[1]} % < ${m[2]} %)` },
  { match: /^different pass direction \((\w+) vs (\w+)\)$/, en: (m) => `Different pass direction (${m[1].toLowerCase()} vs ${m[2].toLowerCase()})`, es: (m) => `Distinta dirección de paso (${passEs(m[1])} vs ${passEs(m[2])})` },
  { match: /^different collection\/maturity \((\w+) vs (\w+)\)$/, en: (m) => `Different product maturity (${m[1]} vs ${m[2]})`, es: (m) => `Distinta madurez del producto (${m[1] === 'provisional' ? 'provisional' : m[1] === 'validated' ? 'validado' : m[1]} vs ${m[2] === 'provisional' ? 'provisional' : m[2] === 'validated' ? 'validado' : m[2]})` },
  { match: /^no documented justification for mixing$/, en: () => 'No documented justification for mixing them', es: () => 'Sin justificación documentada para mezclarlos' },
  { match: /^different product version \((\S+) vs (\S+)\)$/, en: (m) => `Different product version (${m[1]} vs ${m[2]})`, es: (m) => `Distinta versión del producto (${m[1]} vs ${m[2]})` },
  { match: /^different processing release CRID \((\S+) vs (\S+)\)$/, en: (m) => `Different processing release (${m[1]} vs ${m[2]})`, es: (m) => `Distinta versión de procesamiento CRID (${m[1]} vs ${m[2]})` },
  { match: /^radiometric consistency not documented$/, en: () => 'Radiometric consistency not documented', es: () => 'Consistencia radiométrica no documentada' },
  { match: /^same collection, product version, track, frame, pass, look side, frequencies and HV$/, en: () => 'Same orbit, frame, pass direction, product version and HV channel', es: () => 'Misma órbita, frame, dirección de paso, versión del producto y canal HV' },
  { match: /^common coverage ok$/, en: () => 'Enough shared coverage', es: () => 'Cobertura común suficiente' },
  { match: /^no common footprint area inside the AOI$/, en: () => 'No shared footprint inside the study window', es: () => 'Sin huella común dentro de la ventana de estudio' },
  { match: /^acquisitions less than one day apart \(same pass\)$/, en: () => 'Same pass: acquisitions less than one day apart', es: () => 'Mismo paso: adquisiciones con menos de un día de diferencia' },
];

/** Plain-language list of reasons for a pair; unmatched clauses are returned verbatim. */
export function pairReasonClauses(reason: string | null | undefined, locale: Locale): string[] {
  if (!reason) return [];
  return reason.split(/;\s*/).filter(Boolean).map((clause) => {
    const trimmed = clause.trim();
    for (const item of CLAUSES) {
      const m = trimmed.match(item.match);
      if (m) return locale === 'es' ? item.es(m) : item.en(m);
    }
    return trimmed;
  });
}
