// src/types/index.ts

export type Case = {
  id: string;
  name: string;
  description: string;
  status: "Nuevo" | "En Progreso" | "Completado";
  notes: string;
  templateId?: string;
  parametricModel?: any;
};

export type SelectedObject = {
  id?: number | string;
  name: string;
  type: "dedo" | "muñeca" | "escaneo" | "parametric" | null;
  fileType?: string;
  fileUrl?: string;
  parametricModel?: any;
} | null;