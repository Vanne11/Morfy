import { forwardRef, useImperativeHandle } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Center, ContactShadows } from "@react-three/drei";
import { SVGParametricModel } from "@/features/viewer/components/SVGParametricModel";

export const LivePreview = forwardRef(({ data }: { data: any }, ref) => {
  const params = data?.params || {};
  const color = params.color || "#60a5fa";

  const SceneCapture = () => {
    const { gl, scene, camera } = useThree();
    useImperativeHandle(ref, () => ({
      capture: () => {
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/webp", 0.5);
      }
    }));
    return null;
  };

  return (
    <div className="w-full h-full min-h-[400px] bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 relative group">
      <div className="absolute top-3 left-3 z-10 bg-black/60 px-2 py-1 rounded text-[10px] uppercase font-bold text-white/70 border border-white/10 backdrop-blur">
        Vista Previa Real-Time
      </div>
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        shadows
        camera={{ position: [80, 80, 80], fov: 45 }}
      >
        <SceneCapture />
        <color attach="background" args={['#18181b']} /> {/* zinc-900 background matching UI */}
        
        {/* Iluminación de Estudio */}
        <ambientLight intensity={0.4} />
        <spotLight 
          position={[100, 150, 50]} 
          angle={0.4} 
          penumbra={1} 
          intensity={2} 
          castShadow 
          shadow-bias={-0.0001}
        />
        <pointLight position={[-100, -100, -100]} intensity={0.5} color="blue" />

        <gridHelper args={[300, 30, "#333", "#222"]} position={[0, -0.1, 0]} />
        
        <Center top>
          {data?.geometry ? (
            <SVGParametricModel
              geometry={data.geometry}
              params={params}
              color={color}
            />
          ) : (
            <mesh castShadow receiveShadow>
              <boxGeometry args={[20, 20, 20]} />
              <meshStandardMaterial color="#666" />
            </mesh>
          )}
        </Center>
        
        <ContactShadows 
          position={[0, -0.2, 0]} 
          opacity={0.4} 
          scale={200} 
          blur={2} 
          far={10} 
          resolution={512} 
          color="#000000"
        />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
      </Canvas>
    </div>
  );
});

LivePreview.displayName = "LivePreview";
