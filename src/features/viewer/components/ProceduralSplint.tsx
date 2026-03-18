import { useMemo } from 'react';
import * as THREE from 'three';
import { generateSplintGeometry, type ShapeType } from '../geometry';

interface ProceduralSplintProps {
  shapeType?: ShapeType;
  length?: number;
  widthProximal?: number;
  widthDistal?: number;
  thickness?: number;
  curvature?: number;
  segmentsRadial?: number;
  segmentsHeight?: number;
  color?: string;
  showStraps?: boolean;
  isFlat?: boolean;
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

export function ProceduralSplint({
  shapeType = 'channel',
  length = 220,
  widthProximal = 85,
  widthDistal = 60,
  thickness = 3,
  curvature = 190,
  segmentsRadial = 48,
  segmentsHeight = 60,
  color = "#20b2aa",
  showStraps = true,
  isFlat = false,
  boreRadius,
  capStyle,
  branchAngle,
  thumbLength,
  thumbWidth,
  slotWidth,
  bendAngle,
  bendPoint,
  lipHeight,
}: ProceduralSplintProps) {

  const { bodyGeometry, rimLineGeometry } = useMemo(() => {
    return generateSplintGeometry(shapeType, {
      length, widthProximal, widthDistal, thickness, curvature,
      segmentsRadial, segmentsHeight, isFlat,
      boreRadius, capStyle,
      branchAngle, thumbLength, thumbWidth,
      slotWidth,
      bendAngle, bendPoint, lipHeight,
    });
  }, [
    shapeType, length, widthProximal, widthDistal, thickness, curvature,
    segmentsRadial, segmentsHeight, isFlat,
    boreRadius, capStyle,
    branchAngle, thumbLength, thumbWidth,
    slotWidth,
    bendAngle, bendPoint, lipHeight,
  ]);

  // Straps (solo para channel y band, no en flat)
  const straps = useMemo(() => {
    if (!showStraps || isFlat || shapeType === 'plate' || shapeType === 'tube') return [];

    const strapWidth = 20;
    const strapOffset = thickness / 2 + 0.5;
    const positions = [0.2, 0.8];
    const effectiveLength = shapeType === 'spica' ? length * 0.7 : length;

    return positions.map((posFactor, index) => {
      const v = posFactor;
      const yCenter = (v - 0.5) * effectiveLength;
      const radius = (widthProximal / 2 * (1 - v) + widthDistal / 2 * v) + strapOffset;
      const thetaLen = ((curvature + 10) * Math.PI) / 180;

      const geo = new THREE.CylinderGeometry(
        radius, radius, strapWidth, segmentsRadial, 1, true,
        Math.PI / 2 - thetaLen / 2,
        thetaLen
      );
      return (
        <mesh key={`strap-${index}`} position={[0, yCenter, 0]} geometry={geo}>
          <meshStandardMaterial color="#333" roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      );
    });
  }, [length, widthProximal, widthDistal, thickness, curvature, showStraps, segmentsRadial, isFlat, shapeType]);

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
