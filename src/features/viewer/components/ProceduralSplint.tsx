import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface ProceduralSplintProps {
  length?: number;
  widthProximal?: number;
  widthDistal?: number;
  thickness?: number;
  curvature?: number;       // Grados de cobertura (180 = media caña)
  segmentsRadial?: number;  // Resolución curva
  segmentsHeight?: number;  // Resolución vertical (aumentada para mejor deformación)
  color?: string;
  showStraps?: boolean;
  isFlat?: boolean;         // Nuevo: Aplanar para patrón de corte
}

export function ProceduralSplint({
  length = 220,
  widthProximal = 85,
  widthDistal = 60,
  thickness = 3,
  curvature = 190,
  segmentsRadial = 48,
  segmentsHeight = 60,
  color = "#20b2aa",
  showStraps = true,
  isFlat = false
}: ProceduralSplintProps) {
  
  // --- Generador de Geometría del Cuerpo (Splint Body) ---
  const { bodyGeometry, rimLineGeometry } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    
    const rProximal = widthProximal / 2;
    const rDistal = widthDistal / 2;
    const thetaLength = (curvature * Math.PI) / 180;
    const thetaStart = Math.PI / 2 - thetaLength / 2;

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const rimVertices: number[] = [];

    const vertexCountPerLayer = (segmentsRadial + 1) * (segmentsHeight + 1);
    
    const getRadius = (v: number) => rProximal * (1 - v) + rDistal * v;

    // Generar capas: 0=Outer, 1=Inner
    for (let layer = 0; layer < 2; layer++) {
        const isOuter = layer === 0;
        // En modo plano, offset es simplemente altura Z. En curvo, es radio.
        const layerOffset = isOuter ? thickness / 2 : -thickness / 2;
        
        for (let y = 0; y <= segmentsHeight; y++) {
            const v = y / segmentsHeight;
            const currentBaseRadius = getRadius(v);
            const posY = (v - 0.5) * length;
            
            // Calculamos el largo total del arco en esta altura para el aplanado
            const currentArcLength = currentBaseRadius * thetaLength;

            for (let x = 0; x <= segmentsRadial; x++) {
                const u = x / segmentsRadial;
                
                let posX, posZ, nX, nY, nZ;

                if (isFlat) {
                    // MODO PLANO (Pattern Unroll)
                    // X = Posición lineal a lo largo del arco (centrado)
                    posX = (u - 0.5) * currentArcLength;
                    // Z = Altura de la capa (Grosor)
                    posZ = layerOffset; // Plano en el suelo (XZ plane)
                    
                    // Normales: Outer apunta arriba (Y+? No, Z+), Inner abajo (Z-)
                    // Como estamos dibujando en plano XZ con Y como largo:
                    // La "superficie" normal es el eje que antes era radial.
                    // En cilindro: Normal es Radial (XZ). Tangente es Y.
                    // Al aplanar: Radial se convierte en Z (grosor).
                    nX = 0; 
                    nY = 0; // La normal de la superficie plana
                    nZ = isOuter ? 1 : -1;
                } else {
                    // MODO CURVO (3D)
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

                if (isOuter && (x === 0 || x === segmentsRadial)) {
                    rimVertices.push(posX, posY, posZ);
                }
            }
        }
    }

    // ... (El resto de la generación de índices es idéntica porque la topología no cambia) ...
    // Solo necesitamos copiar el bloque de índices del código anterior
    
    // 1. Outer Shell
    for (let y = 0; y < segmentsHeight; y++) {
        for (let x = 0; x < segmentsRadial; x++) {
            const a = y * (segmentsRadial + 1) + x;
            const b = y * (segmentsRadial + 1) + (x + 1);
            const c = (y + 1) * (segmentsRadial + 1) + (x + 1);
            const d = (y + 1) * (segmentsRadial + 1) + x;
            indices.push(a, b, d); indices.push(b, c, d);
        }
    }

    // 2. Inner Shell
    const offset = vertexCountPerLayer;
    for (let y = 0; y < segmentsHeight; y++) {
        for (let x = 0; x < segmentsRadial; x++) {
            const a = offset + y * (segmentsRadial + 1) + x;
            const b = offset + y * (segmentsRadial + 1) + (x + 1);
            const c = offset + (y + 1) * (segmentsRadial + 1) + (x + 1);
            const d = offset + (y + 1) * (segmentsRadial + 1) + x;
            indices.push(a, d, b); indices.push(b, d, c);
        }
    }
    
    // 3. Side Rims
    for (let y = 0; y < segmentsHeight; y++) {
        const base = y * (segmentsRadial + 1);
        const a = base; const b = offset + base; const c = offset + base + (segmentsRadial + 1); const d = base + (segmentsRadial + 1);
        indices.push(a, d, b); indices.push(b, d, c);

        const baseRight = base + segmentsRadial;
        const a2 = baseRight; const b2 = offset + baseRight; const c2 = offset + baseRight + (segmentsRadial + 1); const d2 = baseRight + (segmentsRadial + 1);
        indices.push(a2, b2, d2); indices.push(b2, c2, d2);
    }

    // 4. Caps
    for (let x = 0; x < segmentsRadial; x++) {
        const o = x; const oN = x + 1; const i = offset + x; const iN = offset + x + 1;
        indices.push(o, i, oN); indices.push(i, iN, oN);
    }
    const lastRow = segmentsHeight * (segmentsRadial + 1);
    for (let x = 0; x < segmentsRadial; x++) {
        const o = lastRow + x; const oN = lastRow + x + 1; const i = offset + lastRow + x; const iN = offset + lastRow + x + 1;
        indices.push(o, oN, i); indices.push(i, oN, iN);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    // Recalcular normales solo si no estamos en plano (en plano ya las pusimos perfectas)
    // Aunque computeVertexNormals da bordes suaves.
    geo.computeVertexNormals();

    geo.clearGroups();
    geo.addGroup(0, indices.length, 0); 

    // Rim Lines
    const linesIndices: number[] = [];
    const totalRimPoints = rimVertices.length / 3;
    const halfPoints = totalRimPoints / 2; 
    for(let i=0; i<halfPoints-1; i++) linesIndices.push(i, i+1);
    for(let i=halfPoints; i<totalRimPoints-1; i++) linesIndices.push(i, i+1);
    
    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(rimVertices, 3));
    linesGeo.setIndex(linesIndices);

    return { bodyGeometry: geo, rimLineGeometry: linesGeo };
  }, [length, widthProximal, widthDistal, thickness, curvature, segmentsRadial, segmentsHeight, isFlat]);

  // --- Straps (Disable in flat mode) ---
  const straps = useMemo(() => {
    if (!showStraps || isFlat) return [];
    
    // ... (Mismo código de straps anterior) ...
    // Necesito duplicar el código o extraerlo si quiero ser estricto con DRY,
    // pero por seguridad en el replace, lo repetiré exacto para que funcione.
    const strapWidth = 20;
    const strapThickness = 1.5;
    const strapOffset = thickness / 2 + 0.5;
    const positions = [0.2, 0.8];
    
    return positions.map((posFactor, index) => {
        const v = posFactor;
        const yCenter = (v - 0.5) * length;
        const rProx = widthProximal / 2;
        const rDist = widthDistal / 2;
        const radius = (rProx * (1 - v) + rDist * v) + strapOffset;
        
        const geo = new THREE.CylinderGeometry(
            radius, radius, strapWidth, segmentsRadial, 1, true, 
            Math.PI / 2 - ((curvature + 10) * Math.PI / 180) / 2, 
            ((curvature + 10) * Math.PI / 180)
        );
        return (
            <mesh key={`strap-${index}`} position={[0, yCenter, 0]} geometry={geo}>
                 <meshStandardMaterial color="#333" roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
        );
    });
  }, [length, widthProximal, widthDistal, thickness, curvature, showStraps, segmentsRadial, isFlat]);

  return (
    <group name="Splint_Assembly">
        <mesh geometry={bodyGeometry} name="Splint_Body" castShadow receiveShadow>
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} side={THREE.DoubleSide} flatShading={false} />
        </mesh>
        <lineSegments geometry={rimLineGeometry} name="Splint_CutLines">
            <lineBasicMaterial color="white" opacity={0.5} transparent dashSize={5} gapSize={2} />
        </lineSegments>
        {straps}
    </group>
  );
}