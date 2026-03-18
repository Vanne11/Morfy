// Canal curvo (muñeca, tobillo, plantilla) - geometría actual extraída
import * as THREE from 'three';
import type { GeometryParams, GeometryResult } from './types';

export function generateChannelGeometry(p: GeometryParams): GeometryResult {
  const geo = new THREE.BufferGeometry();

  const rProximal = p.widthProximal / 2;
  const rDistal = p.widthDistal / 2;
  const thetaLength = (p.curvature * Math.PI) / 180;
  const thetaStart = Math.PI / 2 - thetaLength / 2;

  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const rimVertices: number[] = [];

  const vertexCountPerLayer = (p.segmentsRadial + 1) * (p.segmentsHeight + 1);
  const getRadius = (v: number) => rProximal * (1 - v) + rDistal * v;

  for (let layer = 0; layer < 2; layer++) {
    const isOuter = layer === 0;
    const layerOffset = isOuter ? p.thickness / 2 : -p.thickness / 2;

    for (let y = 0; y <= p.segmentsHeight; y++) {
      const v = y / p.segmentsHeight;
      const currentBaseRadius = getRadius(v);
      const posY = (v - 0.5) * p.length;
      const currentArcLength = currentBaseRadius * thetaLength;

      for (let x = 0; x <= p.segmentsRadial; x++) {
        const u = x / p.segmentsRadial;
        let posX, posZ, nX, nY, nZ;

        if (p.isFlat) {
          posX = (u - 0.5) * currentArcLength;
          posZ = layerOffset;
          nX = 0; nY = 0; nZ = isOuter ? 1 : -1;
        } else {
          const currentRadius = currentBaseRadius + layerOffset;
          const theta = thetaStart + u * thetaLength;
          posX = currentRadius * Math.cos(theta);
          posZ = currentRadius * Math.sin(theta);
          nX = Math.cos(theta) * (isOuter ? 1 : -1);
          nY = 0;
          nZ = Math.sin(theta) * (isOuter ? 1 : -1);
        }

        vertices.push(posX, posY, posZ);
        normals.push(nX, nY, nZ);
        uvs.push(u, v);

        if (isOuter && (x === 0 || x === p.segmentsRadial)) {
          rimVertices.push(posX, posY, posZ);
        }
      }
    }
  }

  // Outer shell
  for (let y = 0; y < p.segmentsHeight; y++) {
    for (let x = 0; x < p.segmentsRadial; x++) {
      const a = y * (p.segmentsRadial + 1) + x;
      const b = a + 1;
      const c = (y + 1) * (p.segmentsRadial + 1) + x + 1;
      const d = (y + 1) * (p.segmentsRadial + 1) + x;
      indices.push(a, b, d); indices.push(b, c, d);
    }
  }

  // Inner shell
  const offset = vertexCountPerLayer;
  for (let y = 0; y < p.segmentsHeight; y++) {
    for (let x = 0; x < p.segmentsRadial; x++) {
      const a = offset + y * (p.segmentsRadial + 1) + x;
      const b = a + 1;
      const c = offset + (y + 1) * (p.segmentsRadial + 1) + x + 1;
      const d = offset + (y + 1) * (p.segmentsRadial + 1) + x;
      indices.push(a, d, b); indices.push(b, d, c);
    }
  }

  // Side rims
  for (let y = 0; y < p.segmentsHeight; y++) {
    const base = y * (p.segmentsRadial + 1);
    const a = base, b = offset + base, c = offset + base + (p.segmentsRadial + 1), d = base + (p.segmentsRadial + 1);
    indices.push(a, d, b); indices.push(b, d, c);

    const baseRight = base + p.segmentsRadial;
    const a2 = baseRight, b2 = offset + baseRight, c2 = offset + baseRight + (p.segmentsRadial + 1), d2 = baseRight + (p.segmentsRadial + 1);
    indices.push(a2, b2, d2); indices.push(b2, c2, d2);
  }

  // End caps
  for (let x = 0; x < p.segmentsRadial; x++) {
    const o = x, oN = x + 1, i = offset + x, iN = offset + x + 1;
    indices.push(o, i, oN); indices.push(i, iN, oN);
  }
  const lastRow = p.segmentsHeight * (p.segmentsRadial + 1);
  for (let x = 0; x < p.segmentsRadial; x++) {
    const o = lastRow + x, oN = lastRow + x + 1, i = offset + lastRow + x, iN = offset + lastRow + x + 1;
    indices.push(o, oN, i); indices.push(i, oN, iN);
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Rim lines
  const linesIndices: number[] = [];
  const totalRimPoints = rimVertices.length / 3;
  const halfPoints = totalRimPoints / 2;
  for (let i = 0; i < halfPoints - 1; i++) linesIndices.push(i, i + 1);
  for (let i = halfPoints; i < totalRimPoints - 1; i++) linesIndices.push(i, i + 1);

  const linesGeo = new THREE.BufferGeometry();
  linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(rimVertices, 3));
  linesGeo.setIndex(linesIndices);

  return { bodyGeometry: geo, rimLineGeometry: linesGeo };
}
