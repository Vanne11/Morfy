import type * as THREE from 'three';

export type ShapeType = 'channel' | 'tube' | 'spica' | 'band' | 'plate';

export interface GeometryParams {
  length: number;
  widthProximal: number;
  widthDistal: number;
  thickness: number;
  curvature: number;
  segmentsRadial: number;
  segmentsHeight: number;
  isFlat: boolean;
  // Tube-specific
  boreRadius?: number;
  capStyle?: 'open' | 'dome' | 'flat';
  // Spica-specific
  branchAngle?: number;
  thumbLength?: number;
  thumbWidth?: number;
  // Band-specific
  slotWidth?: number;
  // Plate-specific
  bendAngle?: number;
  bendPoint?: number;
  lipHeight?: number;
}

export interface GeometryResult {
  bodyGeometry: THREE.BufferGeometry;
  rimLineGeometry: THREE.BufferGeometry;
}
