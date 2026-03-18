// Tubo cerrado con domo opcional (dedos, grips de escritura/cubiertos)
import * as THREE from 'three';
import type { GeometryParams, GeometryResult } from './types';

export function generateTubeGeometry(p: GeometryParams): GeometryResult {
  const geo = new THREE.BufferGeometry();

  const rProximal = p.widthProximal / 2;
  const rDistal = p.widthDistal / 2;
  const capStyle = p.capStyle || 'dome';
  const boreRadius = p.boreRadius || 0;
  const domeSegments = 8;

  // Longitud total incluye domo si aplica
  const bodyLength = p.length;
  const totalHeightSegs = p.segmentsHeight + (capStyle === 'dome' ? domeSegments : 0);

  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const segsR = p.segmentsRadial;
  const vertexCountPerLayer = (segsR + 1) * (totalHeightSegs + 1);

  for (let layer = 0; layer < 2; layer++) {
    const isOuter = layer === 0;
    const layerOffset = isOuter ? p.thickness / 2 : -p.thickness / 2;

    for (let y = 0; y <= totalHeightSegs; y++) {
      let v: number, posY: number, baseRadius: number;

      if (y <= p.segmentsHeight) {
        // Cuerpo principal
        v = y / p.segmentsHeight;
        posY = (v - 0.5) * bodyLength;
        baseRadius = rProximal * (1 - v) + rDistal * v;
      } else {
        // Domo distal
        const domeV = (y - p.segmentsHeight) / domeSegments;
        const domeAngle = (domeV * Math.PI) / 2; // 0 a PI/2
        posY = 0.5 * bodyLength + rDistal * Math.sin(domeAngle);
        baseRadius = rDistal * Math.cos(domeAngle);
        // Si hay bore, el domo solo cierra hasta boreRadius
        if (!isOuter && boreRadius > 0) {
          baseRadius = Math.max(baseRadius, boreRadius);
        }
        v = 1;
      }

      // Inner layer: si hay bore, no colapsar más que boreRadius
      let currentRadius = baseRadius + layerOffset;
      if (!isOuter && boreRadius > 0 && currentRadius < boreRadius) {
        currentRadius = boreRadius;
      }

      for (let x = 0; x <= segsR; x++) {
        const u = x / segsR;

        if (p.isFlat) {
          const arcLen = baseRadius * Math.PI * 2;
          const posX = (u - 0.5) * arcLen;
          const posZ = layerOffset;
          vertices.push(posX, posY, posZ);
          normals.push(0, 0, isOuter ? 1 : -1);
        } else {
          const theta = u * Math.PI * 2;
          const posX = currentRadius * Math.cos(theta);
          const posZ = currentRadius * Math.sin(theta);
          vertices.push(posX, posY, posZ);
          normals.push(
            Math.cos(theta) * (isOuter ? 1 : -1),
            0,
            Math.sin(theta) * (isOuter ? 1 : -1)
          );
        }
        uvs.push(u, y / totalHeightSegs);
      }
    }
  }

  // Outer shell indices
  for (let y = 0; y < totalHeightSegs; y++) {
    for (let x = 0; x < segsR; x++) {
      const a = y * (segsR + 1) + x;
      const b = a + 1;
      const c = (y + 1) * (segsR + 1) + x + 1;
      const d = (y + 1) * (segsR + 1) + x;
      indices.push(a, b, d); indices.push(b, c, d);
    }
  }

  // Inner shell indices (reversed winding)
  const offset = vertexCountPerLayer;
  for (let y = 0; y < totalHeightSegs; y++) {
    for (let x = 0; x < segsR; x++) {
      const a = offset + y * (segsR + 1) + x;
      const b = a + 1;
      const c = offset + (y + 1) * (segsR + 1) + x + 1;
      const d = offset + (y + 1) * (segsR + 1) + x;
      indices.push(a, d, b); indices.push(b, d, c);
    }
  }

  // Bottom cap (proximal end - open end, connect inner to outer)
  for (let x = 0; x < segsR; x++) {
    const o = x, oN = x + 1, i = offset + x, iN = offset + x + 1;
    indices.push(o, i, oN); indices.push(i, iN, oN);
  }

  // If bore exists, cap the top of the inner tube
  if (boreRadius > 0 && capStyle !== 'open') {
    const topRow = totalHeightSegs * (segsR + 1);
    for (let x = 0; x < segsR; x++) {
      const o = topRow + x, oN = topRow + x + 1;
      const i = offset + topRow + x, iN = offset + topRow + x + 1;
      indices.push(o, oN, i); indices.push(i, oN, iN);
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Rim lines (solo borde proximal)
  const rimVertices: number[] = [];
  for (let x = 0; x <= segsR; x++) {
    const idx = x * 3;
    rimVertices.push(vertices[idx], vertices[idx + 1], vertices[idx + 2]);
  }
  const linesIndices: number[] = [];
  for (let i = 0; i < segsR; i++) linesIndices.push(i, i + 1);

  const linesGeo = new THREE.BufferGeometry();
  linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(rimVertices, 3));
  linesGeo.setIndex(linesIndices);

  return { bodyGeometry: geo, rimLineGeometry: linesGeo };
}
