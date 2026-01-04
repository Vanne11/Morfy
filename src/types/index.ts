// src/types/index.ts

export type Case = {
  id: string;
  name: string;
  description: string;
  status: "Nuevo" | "En Progreso" | "Completado";
  notes: string;
};

export type SelectedObject = {
  id?: number;
  name: string;
  type: "dedo" | "muñeca" | "escaneo" | null;
  fileType?: string;
  fileUrl?: string;
} | null;