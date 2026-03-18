import type { PatientMeasurements, BodyRegion } from "@/types";

export type SizeLabel = 'XS' | 'S' | 'M' | 'L' | 'XL';

export const SIZE_LABELS: SizeLabel[] = ['XS', 'S', 'M', 'L', 'XL'];

// Valores antropométricos promedio (en mm)
// Fuentes: estudios de antropometría de mano/pie publicados
export const SIZE_PRESETS: Record<BodyRegion, Record<SizeLabel, PatientMeasurements>> = {
  hand: {
    XS: { wristCircumference: 130, forearmLength: 180, forearmCircumference: 190, palmWidth: 65, handLength: 155 },
    S:  { wristCircumference: 150, forearmLength: 200, forearmCircumference: 210, palmWidth: 72, handLength: 170 },
    M:  { wristCircumference: 165, forearmLength: 220, forearmCircumference: 240, palmWidth: 80, handLength: 185 },
    L:  { wristCircumference: 180, forearmLength: 240, forearmCircumference: 265, palmWidth: 88, handLength: 195 },
    XL: { wristCircumference: 200, forearmLength: 260, forearmCircumference: 290, palmWidth: 95, handLength: 210 },
  },
  fingers: {
    XS: { fingerCircumference: 48, fingerLength: 55 },
    S:  { fingerCircumference: 53, fingerLength: 62 },
    M:  { fingerCircumference: 58, fingerLength: 70 },
    L:  { fingerCircumference: 64, fingerLength: 78 },
    XL: { fingerCircumference: 72, fingerLength: 85 },
  },
  foot: {
    XS: { ankleCircumference: 190, calfCircumference: 280, footLength: 220, toeCircumference: 55 },
    S:  { ankleCircumference: 210, calfCircumference: 310, footLength: 240, toeCircumference: 60 },
    M:  { ankleCircumference: 230, calfCircumference: 340, footLength: 260, toeCircumference: 66 },
    L:  { ankleCircumference: 255, calfCircumference: 370, footLength: 280, toeCircumference: 72 },
    XL: { ankleCircumference: 280, calfCircumference: 400, footLength: 300, toeCircumference: 80 },
  },
};

// Mapeo de categoría de template a región corporal
export function categoryToRegion(category: string): BodyRegion {
  switch (category) {
    case 'mano': return 'hand';
    case 'dedos': return 'fingers';
    case 'pie': return 'foot';
    default: return 'hand';
  }
}
