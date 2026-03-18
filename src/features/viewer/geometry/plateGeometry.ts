// Panel plano con doblez (soporte lectura, soporte celular)
import * as THREE from 'three';
import type { GeometryParams, GeometryResult } from './types';

export function generatePlateGeometry(p: GeometryParams): GeometryResult {
  const geo = new THREE.BufferGeometry();

  const width = p.widthProximal;
  const widthTop = p.widthDistal;
  const bendAngle = ((p.bendAngle || 110) * Math.PI) / 180;
  const bendPoint = p.bendPoint || 0.3; // donde dobla (0-1)
  const lipHeight = p.lipHeight || 15;
  const segsW = Math.max(12, Math.floor(p.segmentsRadial / 4));
  const segsH = p.segmentsHeight;

  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const verticesPerRow = segsW + 1;

  // Calcular posición con doblez
  function getPosition(u: number, v: number, layerOffset: number): [number, number, number] {
    const currentWidth = width * (1 - v) + widthTop * v;
    const posX = (u - 0.5) * currentWidth;

    let posY: number, posZ: number;
    const totalLen = p.length + lipHeight;

    if (v <= bendPoint) {
      // Sección inferior (plana, en el suelo)
      const localV = v / bendPoint;
      posY = localV * bendPoint * p.length;
      posZ = layerOffset;
    } else {
      // Sección superior (rotada por bendAngle)
      const localV = (v - bendPoint) / (1 - bendPoint);
      const sectionLen = (1 - bendPoint) * p.length + lipHeight * localV;
      const bendOriginY = bendPoint * p.length;

      posY = bendOriginY + Math.cos(Math.PI - bendAngle) * localV * (1 - bendPoint) * p.length;
      posZ = layerOffset + Math.sin(Math.PI - bendAngle) * localV * (1 - bendPoint) * p.length;
    }

    return [posX, posY, posZ];
  }

  // Generar vertices para ambas capas
  for (let layer = 0; layer < 2; layer++) {
    const isOuter = layer === 0;
    const layerOffset = isOuter ? p.thickness / 2 : -p.thickness / 2;

    for (let y = 0; y <= segsH; y++) {
      const v = y / segsH;
      for (let x = 0; x <= segsW; x++) {
        const u = x / segsW;
        const [posX, posY, posZ] = getPosition(u, v, layerOffset);
        vertices.push(posX, posY, posZ);
        // Normal simplificada
        normals.push(0, 0, isOuter ? 1 : -1);
        uvs.push(u, v);
      }
    }
  }

  const vertexCountPerLayer = (segsW + 1) * (segsH + 1);

  // Outer shell
  for (let y = 0; y < segsH; y++) {
    for (let x = 0; x < segsW; x++) {
      const a = y * verticesPerRow + x;
      const b = a + 1;
      const c = (y + 1) * verticesPerRow + x + 1;
      const d = (y + 1) * verticesPerRow + x;
      indices.push(a, b, d); indices.push(b, c, d);
    }
  }

  // Inner shell (reversed)
  const offset = vertexCountPerLayer;
  for (let y = 0; y < segsH; y++) {
    for (let x = 0; x < segsW; x++) {
      const a = offset + y * verticesPerRow + x;
      const b = a + 1;
      const c = offset + (y + 1) * verticesPerRow + x + 1;
      const d = offset + (y + 1) * verticesPerRow + x;
      indices.push(a, d, b); indices.push(b, d, c);
    }
  }

  // Side edges (left and right)
  for (let y = 0; y < segsH; y++) {
    // Left edge
    const al = y * verticesPerRow;
    const bl = offset + y * verticesPerRow;
    const cl = offset + (y + 1) * verticesPerRow;
    const dl = (y + 1) * verticesPerRow;
    indices.push(al, dl, bl); indices.push(bl, dl, cl);

    // Right edge
    const ar = y * verticesPerRow + segsW;
    const br = offset + y * verticesPerRow + segsW;
    const cr = offset + (y + 1) * verticesPerRow + segsW;
    const dr = (y + 1) * verticesPerRow + segsW;
    indices.push(ar, br, dr); indices.push(br, cr, dr);
  }

  // Bottom cap
  for (let x = 0; x < segsW; x++) {
    const o = x, oN = x + 1, i = offset + x, iN = offset + x + 1;
    indices.push(o, i, oN); indices.push(i, iN, oN);
  }

  // Top cap
  const lastRow = segsH * verticesPerRow;
  for (let x = 0; x < segsW; x++) {
    const o = lastRow + x, oN = lastRow + x + 1;
    const i = offset + lastRow + x, iN = offset + lastRow + x + 1;
    indices.push(o, oN, i); indices.push(i, oN, iN);
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Rim lines (bordes del panel)
  const rimVerts: number[] = [];
  for (let x = 0; x <= segsW; x++) {
    const idx = x * 3;
    rimVerts.push(vertices[idx], vertices[idx + 1], vertices[idx + 2]);
  }
  const rimIdx: number[] = [];
  for (let i = 0; i < segsW; i++) rimIdx.push(i, i + 1);

  const linesGeo = new THREE.BufferGeometry();
  linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(rimVerts, 3));
  linesGeo.setIndex(rimIdx);

  return { bodyGeometry: geo, rimLineGeometry: linesGeo };
}
