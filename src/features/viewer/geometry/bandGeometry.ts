// Anillo ancho con ranura (cuff universal)
import * as THREE from 'three';
import type { GeometryParams, GeometryResult } from './types';

export function generateBandGeometry(p: GeometryParams): GeometryResult {
  const geo = new THREE.BufferGeometry();

  const radius = p.widthProximal / 2;
  const radiusDistal = p.widthDistal / 2;
  const bandWidth = p.length; // largo = ancho de la banda
  const slotWidth = p.slotWidth || 15; // ancho de la ranura para insertar objetos
  const thetaTotal = (p.curvature * Math.PI) / 180;
  // La ranura se ubica en el centro inferior (ángulo 3PI/2)
  const slotAngle = slotWidth / radius; // ángulo que ocupa la ranura
  const thetaStart = Math.PI / 2 - thetaTotal / 2;

  const segsR = p.segmentsRadial;
  const segsH = Math.max(6, Math.floor(p.segmentsHeight / 4)); // menos segmentos en alto (es una banda)

  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const rimVertices: number[] = [];

  const vertexCountPerLayer = (segsR + 1) * (segsH + 1);

  // Borde ligeramente ensanchado (flare)
  const flareAmount = 0.08;
  const getFlare = (v: number): number => {
    const edge = Math.min(v, 1 - v) * 2; // 0 en bordes, 1 en centro
    return 1 + flareAmount * (1 - edge * edge);
  };

  for (let layer = 0; layer < 2; layer++) {
    const isOuter = layer === 0;
    const layerOffset = isOuter ? p.thickness / 2 : -p.thickness / 2;

    for (let y = 0; y <= segsH; y++) {
      const v = y / segsH;
      const posY = (v - 0.5) * bandWidth;
      const flare = getFlare(v);
      const baseR = (radius * (1 - v) + radiusDistal * v) * flare;

      for (let x = 0; x <= segsR; x++) {
        const u = x / segsR;
        const theta = thetaStart + u * thetaTotal;
        const currentRadius = baseR + layerOffset;

        if (p.isFlat) {
          const arcLen = baseR * thetaTotal;
          vertices.push((u - 0.5) * arcLen, posY, layerOffset);
          normals.push(0, 0, isOuter ? 1 : -1);
        } else {
          vertices.push(
            currentRadius * Math.cos(theta),
            posY,
            currentRadius * Math.sin(theta)
          );
          normals.push(
            Math.cos(theta) * (isOuter ? 1 : -1),
            0,
            Math.sin(theta) * (isOuter ? 1 : -1)
          );
        }
        uvs.push(u, v);

        if (isOuter && (x === 0 || x === segsR)) {
          rimVertices.push(vertices[vertices.length - 3], vertices[vertices.length - 2], vertices[vertices.length - 1]);
        }
      }
    }
  }

  // Shell indices (same as channel)
  for (let y = 0; y < segsH; y++) {
    for (let x = 0; x < segsR; x++) {
      const a = y * (segsR + 1) + x;
      const b = a + 1;
      const c = (y + 1) * (segsR + 1) + x + 1;
      const d = (y + 1) * (segsR + 1) + x;
      indices.push(a, b, d); indices.push(b, c, d);
    }
  }

  const offset = vertexCountPerLayer;
  for (let y = 0; y < segsH; y++) {
    for (let x = 0; x < segsR; x++) {
      const a = offset + y * (segsR + 1) + x;
      const b = a + 1;
      const c = offset + (y + 1) * (segsR + 1) + x + 1;
      const d = offset + (y + 1) * (segsR + 1) + x;
      indices.push(a, d, b); indices.push(b, d, c);
    }
  }

  // Side rims
  for (let y = 0; y < segsH; y++) {
    const base = y * (segsR + 1);
    indices.push(base, base + segsR + 1, offset + base); indices.push(offset + base, base + segsR + 1, offset + base + segsR + 1);

    const baseR = base + segsR;
    indices.push(baseR, offset + baseR, baseR + segsR + 1); indices.push(offset + baseR, offset + baseR + segsR + 1, baseR + segsR + 1);
  }

  // Top/bottom caps
  for (let x = 0; x < segsR; x++) {
    const o = x, oN = x + 1, i = offset + x, iN = offset + x + 1;
    indices.push(o, i, oN); indices.push(i, iN, oN);
  }
  const lastRow = segsH * (segsR + 1);
  for (let x = 0; x < segsR; x++) {
    const o = lastRow + x, oN = lastRow + x + 1, i = offset + lastRow + x, iN = offset + lastRow + x + 1;
    indices.push(o, oN, i); indices.push(i, oN, iN);
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Rim lines
  const linesIdx: number[] = [];
  const totalRim = rimVertices.length / 3;
  const half = totalRim / 2;
  for (let i = 0; i < half - 1; i++) linesIdx.push(i, i + 1);
  for (let i = half; i < totalRim - 1; i++) linesIdx.push(i, i + 1);

  const linesGeo = new THREE.BufferGeometry();
  linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(rimVertices, 3));
  linesGeo.setIndex(linesIdx);

  return { bodyGeometry: geo, rimLineGeometry: linesGeo };
}
