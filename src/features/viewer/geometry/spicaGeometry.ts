// Canal con bifurcación para pulgar (thumb spica)
import * as THREE from 'three';
import type { GeometryParams, GeometryResult } from './types';
import { generateChannelGeometry } from './channelGeometry';

export function generateSpicaGeometry(p: GeometryParams): GeometryResult {
  // Generar canal principal (muñeca)
  const mainResult = generateChannelGeometry({
    ...p,
    length: p.length * 0.7, // canal principal más corto
  });

  // Generar canal del pulgar
  const thumbLength = p.thumbLength || p.length * 0.4;
  const thumbWidth = p.thumbWidth || p.widthDistal * 0.45;
  const branchAngle = ((p.branchAngle || 35) * Math.PI) / 180;

  const thumbResult = generateChannelGeometry({
    ...p,
    length: thumbLength,
    widthProximal: p.widthDistal * 0.6,
    widthDistal: thumbWidth,
    curvature: Math.min(p.curvature + 40, 360),
    segmentsHeight: Math.floor(p.segmentsHeight * 0.4),
    segmentsRadial: Math.floor(p.segmentsRadial * 0.7),
  });

  // Merge geometries: posicionar el canal del pulgar
  const mainGeo = mainResult.bodyGeometry;
  const thumbGeo = thumbResult.bodyGeometry;

  // Transformar el thumb geometry: rotar y posicionar en el extremo distal del canal principal
  const thumbMatrix = new THREE.Matrix4();
  const mainHalfLen = (p.length * 0.7) / 2;

  thumbMatrix.multiply(
    new THREE.Matrix4().makeTranslation(0, mainHalfLen * 0.6, 0)
  );
  thumbMatrix.multiply(
    new THREE.Matrix4().makeRotationZ(branchAngle)
  );
  thumbMatrix.multiply(
    new THREE.Matrix4().makeTranslation(0, thumbLength / 2, 0)
  );

  thumbGeo.applyMatrix4(thumbMatrix);

  // Merge ambas geometrías
  const mergedGeo = mergeBufferGeometries(mainGeo, thumbGeo);

  // Merge rim lines también
  const thumbRimGeo = thumbResult.rimLineGeometry;
  thumbRimGeo.applyMatrix4(thumbMatrix);
  const mergedRim = mergeBufferGeometries(mainResult.rimLineGeometry, thumbRimGeo);

  return { bodyGeometry: mergedGeo, rimLineGeometry: mergedRim };
}

function mergeBufferGeometries(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();

  const posA = a.getAttribute('position') as THREE.BufferAttribute;
  const posB = b.getAttribute('position') as THREE.BufferAttribute;

  // Merge positions
  const positions = new Float32Array(posA.count * 3 + posB.count * 3);
  positions.set(posA.array as Float32Array, 0);
  positions.set(posB.array as Float32Array, posA.count * 3);
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  // Merge normals
  const normA = a.getAttribute('normal') as THREE.BufferAttribute;
  const normB = b.getAttribute('normal') as THREE.BufferAttribute;
  if (normA && normB) {
    const normals = new Float32Array(normA.count * 3 + normB.count * 3);
    normals.set(normA.array as Float32Array, 0);
    normals.set(normB.array as Float32Array, normA.count * 3);
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }

  // Merge UVs
  const uvA = a.getAttribute('uv') as THREE.BufferAttribute;
  const uvB = b.getAttribute('uv') as THREE.BufferAttribute;
  if (uvA && uvB) {
    const uvs = new Float32Array(uvA.count * 2 + uvB.count * 2);
    uvs.set(uvA.array as Float32Array, 0);
    uvs.set(uvB.array as Float32Array, uvA.count * 2);
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }

  // Merge indices (offset B indices by A vertex count)
  const idxA = a.getIndex();
  const idxB = b.getIndex();
  if (idxA && idxB) {
    const indices = new Uint32Array(idxA.count + idxB.count);
    indices.set(idxA.array as Uint32Array, 0);
    const offsetB = new Uint32Array(idxB.count);
    for (let i = 0; i < idxB.count; i++) {
      offsetB[i] = (idxB.array as Uint32Array)[i] + posA.count;
    }
    indices.set(offsetB, idxA.count);
    merged.setIndex(new THREE.BufferAttribute(indices, 1));
  }

  return merged;
}
