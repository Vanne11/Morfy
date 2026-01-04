import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Stage, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three-stdlib";
import * as THREE from "three";

interface FilePreviewProps {
  file: File | null;
  onCapture: (base64: string) => void;
}

function Model({ url, onLoad }: { url: string; onLoad: () => void }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(url, (geo) => {
        setGeometry(geo);
        onLoad();
    });
  }, [url, onLoad]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export function FilePreview({ file, onCapture }: FilePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
      setReady(false);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
        setUrl(null);
    }
  }, [file]);

  const handleCapture = () => {
    if (canvasRef.current) {
        // Forzar un render si es necesario o simplemente tomar la data
        const data = canvasRef.current.toDataURL("image/jpeg", 0.5);
        onCapture(data);
    }
  };

  if (!url) return <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">Vista previa 3D</div>;

  return (
    <div className="relative w-full h-full bg-black/5 rounded-md overflow-hidden group">
      <Canvas 
        ref={canvasRef}
        gl={{ preserveDrawingBuffer: true }} 
        camera={{ position: [0, 0, 100], fov: 50 }}
        shadows
      >
        <Stage intensity={0.5} environment="city" adjustCamera>
            <Model url={url} onLoad={() => setReady(true)} />
        </Stage>
        <OrbitControls makeDefault />
      </Canvas>
      
      {ready && (
        <button 
            type="button"
            onClick={handleCapture}
            className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded opacity-80 hover:opacity-100 transition-opacity"
        >
            Usar esta vista como Icono
        </button>
      )}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <span className="text-xs">Cargando...</span>
        </div>
      )}
    </div>
  );
}
