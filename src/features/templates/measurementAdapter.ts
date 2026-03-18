import type { PatientMeasurements } from "@/types";

// Holgura por defecto: 2mm de gap entre piel y férula
const DEFAULT_GAP = 2;

/**
 * Convierte medidas anatómicas del paciente en parámetros técnicos
 * de la férula para un template dado.
 *
 * La lógica central:
 * - circunferencia → diámetro = circ / PI → ese es el "ancho" de la férula
 * - largo del segmento corporal → largo de la férula (con factor de cobertura)
 * - Se agrega holgura (gap) para que no quede pegada a la piel
 */
export function measurementsToParams(
  templateId: string,
  measurements: PatientMeasurements,
  gap: number = DEFAULT_GAP
): Record<string, number> {
  const adapters: Record<string, () => Record<string, number>> = {

    // ── MANO Y MUÑECA ──
    wrist_splint: () => {
      const wc = measurements.wristCircumference || 165;
      const fc = measurements.forearmCircumference || 240;
      const fl = measurements.forearmLength || 220;
      return {
        length: fl,
        widthProximal: fc / Math.PI + gap,
        widthDistal: wc / Math.PI + gap,
      };
    },

    wrist_dorsal: () => {
      const wc = measurements.wristCircumference || 165;
      const fc = measurements.forearmCircumference || 240;
      const fl = measurements.forearmLength || 200;
      return {
        length: fl * 0.9,
        widthProximal: fc / Math.PI + gap,
        widthDistal: wc / Math.PI + gap,
      };
    },

    resting_hand: () => {
      const wc = measurements.wristCircumference || 165;
      const fc = measurements.forearmCircumference || 240;
      const fl = measurements.forearmLength || 220;
      const hl = measurements.handLength || 185;
      return {
        length: fl + hl * 0.5,
        widthProximal: fc / Math.PI + gap,
        widthDistal: wc / Math.PI + gap * 2,
      };
    },

    // ── DEDOS ──
    finger_splint: () => {
      const fc = measurements.fingerCircumference || 58;
      const fl = measurements.fingerLength || 70;
      return {
        length: fl * 0.65,
        widthProximal: fc / Math.PI + gap * 0.5,
        widthDistal: (fc * 0.9) / Math.PI + gap * 0.5,
      };
    },

    finger_extension: () => {
      const fc = measurements.fingerCircumference || 58;
      const fl = measurements.fingerLength || 70;
      return {
        length: fl,
        widthProximal: fc / Math.PI + gap * 0.5,
        widthDistal: (fc * 0.85) / Math.PI + gap * 0.5,
      };
    },

    thumb_spica: () => {
      const wc = measurements.wristCircumference || 165;
      const fc = measurements.forearmCircumference || 240;
      const fl = measurements.forearmLength || 220;
      return {
        length: fl * 0.55,
        widthProximal: wc / Math.PI + gap,
        widthDistal: (fc * 0.4) / Math.PI + gap,
        thumbLength: 50,
        thumbWidth: 15,
      };
    },

    // ── PIE Y TOBILLO ──
    ankle_splint: () => {
      const ac = measurements.ankleCircumference || 230;
      const cc = measurements.calfCircumference || 340;
      const fl = measurements.footLength || 260;
      return {
        length: fl * 1.1,
        widthProximal: cc / Math.PI + gap,
        widthDistal: ac / Math.PI + gap,
      };
    },

    foot_orthotic: () => {
      const fl = measurements.footLength || 260;
      const ac = measurements.ankleCircumference || 230;
      return {
        length: fl,
        widthProximal: ac / Math.PI,
        widthDistal: ac / Math.PI * 0.85,
      };
    },

    toe_splint: () => {
      const tc = measurements.toeCircumference || 66;
      return {
        length: 40,
        widthProximal: tc / Math.PI + gap * 0.5,
        widthDistal: (tc * 0.88) / Math.PI + gap * 0.5,
      };
    },

    // ── AYUDAS ADAPTATIVAS ── (no dependen tanto del paciente)
    universal_cuff: () => {
      const pw = measurements.palmWidth || 80;
      return {
        widthProximal: pw + gap,
        widthDistal: pw * 0.93 + gap,
      };
    },
  };

  const adapter = adapters[templateId];
  if (!adapter) return {};

  const computed = adapter();

  // Redondear todo a 1 decimal
  const rounded: Record<string, number> = {};
  for (const [key, val] of Object.entries(computed)) {
    rounded[key] = Math.round(val * 10) / 10;
  }
  return rounded;
}

/**
 * Dado un templateId y medidas del paciente, genera los defaultParams
 * completos mezclando los defaults del template con los calculados.
 */
export function computePersonalizedParams(
  templateId: string,
  defaultParams: Record<string, any>,
  measurements: PatientMeasurements
): Record<string, any> {
  const computed = measurementsToParams(templateId, measurements);
  // Los calculados sobreescriben los defaults, el resto se mantiene
  return { ...defaultParams, ...computed };
}
