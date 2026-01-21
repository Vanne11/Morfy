import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { svgGeometryToThree, validateGeometryDefinition } from '@/utils/svgToThree';
import type { SVGGeometryDefinition } from '@/utils/svgToThree';

interface SVGParametricModelProps {
  geometry: SVGGeometryDefinition;
  params: Record<string, number>;
  color?: string;
}

export function SVGParametricModel({ geometry, params, color = '#60a5fa' }: SVGParametricModelProps) {
  // Validar geometría antes de renderizar
  const validation = useMemo(() => {
    return validateGeometryDefinition(geometry);
  }, [geometry]);

  // Generar geometría Three.js (con memoización para performance)
  const extrudedGeometry = useMemo(() => {
    if (!validation.valid) {
      console.error('Geometría inválida:', validation.errors);
      return null;
    }

    try {
      return svgGeometryToThree(geometry, params);
    } catch (error) {
      console.error('Error generando geometría:', error);
      return null;
    }
  }, [geometry, params, validation.valid]);

  // Si hay errores de validación, mostrar mensaje
  if (!validation.valid) {
    return (
      <group position={[0, 10, 0]}>
        <mesh>
          <sphereGeometry args={[10, 16, 16]} />
          <meshBasicMaterial color="red" wireframe />
        </mesh>
        <Html center>
          <div className="bg-red-500 text-white p-2 text-xs rounded max-w-xs">
            <div className="font-bold mb-1">Geometría Inválida</div>
            <ul className="text-[10px] space-y-0.5">
              {validation.errors.slice(0, 3).map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </div>
        </Html>
      </group>
    );
  }

  // Si no se pudo generar geometría
  if (!extrudedGeometry) {
    return (
      <group position={[0, 10, 0]}>
        <mesh>
          <sphereGeometry args={[10, 16, 16]} />
          <meshBasicMaterial color="orange" wireframe />
        </mesh>
        <Html center>
          <span className="bg-orange-500 text-white p-2 text-xs rounded">
            Error generando geometría 3D
          </span>
        </Html>
      </group>
    );
  }

  return (
    <group>
      <mesh
        geometry={extrudedGeometry}
        castShadow
        receiveShadow
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Ejes de referencia */}
      <axesHelper args={[15]} position={[0, 0.1, 0]} />
    </group>
  );
}
