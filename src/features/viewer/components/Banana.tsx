import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

export function Banana(props: ThreeElements['group']) {
  // Creamos la curva del plátano usando CatmullRomCurve3
  // Asumimos unidades en milímetros (mm). Un plátano mide aprox 18-20cm de largo (180-200mm)
  // Grosor aprox 3-4cm (30-40mm)
  const { path, stemPath } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-80, 0, 0),
      new THREE.Vector3(-40, 20, 0),
      new THREE.Vector3(40, 20, 0),
      new THREE.Vector3(80, 5, 0),
    ]);

    // Tallo
    const stem = new THREE.CatmullRomCurve3([
        new THREE.Vector3(80, 5, 0),
        new THREE.Vector3(95, 2, 0)
    ]);

    return { path: curve, stemPath: stem };
  }, []);

  return (
    <group {...props}>
        {/* Cuerpo del plátano */}
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[path, 64, 13, 16, false]} />
        <meshStandardMaterial 
            color="#FFE135" 
            roughness={0.6} 
            metalness={0.1}
        />
      </mesh>
      
      {/* Tallo */}
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[stemPath, 12, 5, 8, false]} />
        <meshStandardMaterial color="#6B5B33" roughness={0.9} />
      </mesh>

      {/* Punta oscura final */}
      <mesh position={[-80, 0, 0]} rotation={[0,0,Math.PI/2]}>
          <sphereGeometry args={[3, 8, 8]} />
          <meshStandardMaterial color="#3E2723" />
      </mesh>
    </group>
  );
}
