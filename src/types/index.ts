// src/types/index.ts

export type BodyRegion = 'hand' | 'fingers' | 'foot';

export interface PatientMeasurements {
  // Mano y muñeca
  wristCircumference?: number;    // mm
  forearmLength?: number;         // mm
  forearmCircumference?: number;  // mm
  palmWidth?: number;             // mm
  handLength?: number;            // mm

  // Dedos
  fingerCircumference?: number;   // mm
  fingerLength?: number;          // mm

  // Pie y tobillo
  ankleCircumference?: number;    // mm
  calfCircumference?: number;     // mm
  footLength?: number;            // mm
  toeCircumference?: number;      // mm

  // Meta
  affectedSide?: 'left' | 'right';
  bodyRegion?: BodyRegion;
}

export type Case = {
  id: string;
  name: string;
  description: string;
  status: "Nuevo" | "En Progreso" | "Completado";
  notes: string;
  templateId?: string;
  parametricModel?: any;
  patientMeasurements?: PatientMeasurements;
};

export type SelectedObject = {
  id?: number | string;
  name: string;
  type: "dedo" | "muñeca" | "escaneo" | "parametric" | null;
  fileType?: string;
  fileUrl?: string;
  parametricModel?: any;
} | null;