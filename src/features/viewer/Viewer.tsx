import { Canvas, useLoader, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Center,
  Html,
  GizmoHelper,
  GizmoViewport,
  ContactShadows,
  TransformControls,
  Line
} from "@react-three/drei";
import { useState, Suspense, useEffect } from "react";
import * as THREE from "three";
import { STLLoader } from "three-stdlib";
import { Button } from "@/components/ui/button";
import { Loader2, Banana as BananaIcon, Ruler as RulerIcon, Trash2, Download } from "lucide-react";
import type { SelectedObject } from "@/types";
import { Banana } from "./components/Banana";
import { SVGParametricModel } from "./components/SVGParametricModel";
import { exportToSTL } from "../export/export";

// --- Gestor de Exportación ---
function ExportManager() {
    const { scene } = useThree();
    useEffect(() => {
        const handleExport = (e: any) => {
            exportToSTL(scene, e.detail.name, e.detail.units || "mm");
        };
        // @ts-ignore
        window.addEventListener("export-stl", handleExport);
        // @ts-ignore
        return () => window.removeEventListener("export-stl", handleExport);
    }, [scene]);
    return null;
}

// --- Herramienta de Regla ---
function MeasurementRuler({ points, units = "mm" }: { points: THREE.Vector3[], units?: string }) {
  if (points.length < 2) return null;

  const start = points[0];
  const end = points[1];
  const distance = start.distanceTo(end);
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  return (
    <group>
      <Line
        points={[start, end]}
        color="#ef4444"
        lineWidth={2}
      />
      <mesh position={start}>
        <sphereGeometry args={[1]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[1]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <Html position={midPoint} center>
        <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap">
          {distance.toFixed(1)} {units}
        </div>
      </Html>
    </group>
  );
}

// --- Modelos ---

function LoadedModel({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

function ParametricModel({ data }: { data: any }) {
  if (!data || !data.params || !data.geometry) {
      return (
        <group position={[0, 10, 0]}>
            <mesh>
                <sphereGeometry args={[10, 16, 16]} />
                <meshBasicMaterial color="red" wireframe />
            </mesh>
            <Html center><span className="bg-black/80 text-white p-1 text-xs rounded">Template Inválido</span></Html>
        </group>
      );
  }

  return (
    <SVGParametricModel
      geometry={data.geometry}
      params={data.params}
      color={data.params.color}
    />
  );
}

function ClickHandler({ onPoint }: { onPoint: (p: THREE.Vector3) => void }) {
    const handleClick = (e: any) => {
        if (e.point) onPoint(e.point.clone());
    };
    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.1, 0]}
            onClick={handleClick}
            onPointerMissed={() => {}}
            visible={false}
        >
            <planeGeometry args={[2000, 2000]} />
        </mesh>
    );
}

export function Viewer({
    selectedObject,
    parametricData
}: {
    selectedObject: SelectedObject,
    parametricData?: any
}) {
  const [showBanana, setShowBanana] = useState(false);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<THREE.Vector3[]>([]);
  
  const isJson = selectedObject?.fileType === 'json' || selectedObject?.name.toLowerCase().endsWith(".json");

  const handleExportClick = () => {
      const units = parametricData?.units || "mm";
      window.dispatchEvent(new CustomEvent("export-stl", {
        detail: {
          name: selectedObject?.name || "ferula-morfy",
          units: units
        }
      }));
  };

  const handleNewPoint = (p: THREE.Vector3) => {
      if (!isRulerActive) return;
      setRulerPoints(prev => prev.length >= 2 ? [p] : [...prev, p]);
  };

  return (
    <div className="relative h-full w-full bg-gradient-to-b from-gray-100 to-gray-200 dark:from-zinc-900 dark:to-black">
      
      {/* UI Overlay (Top Left) */}
      {selectedObject && (
        <div className="absolute top-4 left-4 z-10 bg-background/80 px-3 py-2 rounded-lg backdrop-blur shadow-sm border border-border">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Modelo Activo</p>
          <p className="text-sm font-semibold">{selectedObject.name}</p>
          {isJson && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1 inline-block uppercase font-bold">Paramétrico</span>}
        </div>
      )}

      {/* UI Overlay (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-background/80 p-2 rounded-lg backdrop-blur shadow-sm border">
        
        <Button variant="default" size="icon" className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleExportClick} title="Exportar STL">
           <Download className="h-4 w-4" />
        </Button>

        <div className="h-px bg-border my-1" />

        <Button variant={isRulerActive ? "destructive" : "ghost"} size="icon" className="h-8 w-8" onClick={() => { setIsRulerActive(!isRulerActive); if (!isRulerActive) setRulerPoints([]); }} title="Regla">
           <RulerIcon className="h-4 w-4" />
        </Button>
        
        {rulerPoints.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRulerPoints([])} title="Limpiar"><Trash2 className="h-4 w-4" /></Button>
        )}
        
        <div className="h-px bg-border my-1" />
        
        <Button variant={showBanana ? "default" : "ghost"} size="icon" className="h-8 w-8 text-yellow-500" onClick={() => setShowBanana(!showBanana)} title="Banana">
           <BananaIcon className="h-4 w-4" />
        </Button>
      </div>

      {isRulerActive && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-red-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">Haz clic en dos puntos</div>}

      <Canvas shadows dpr={[1, 2]} camera={{ position: [150, 150, 150], fov: 45, near: 0.1, far: 50000 }}>
        <ExportManager />
        <ambientLight intensity={0.7} />
        <directionalLight position={[100, 200, 100]} intensity={1.5} castShadow />
        <gridHelper args={[400, 40, "gray", "#e5e5e5"]} position={[0, -0.05, 0]} />

        <Suspense fallback={<Html center><div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin" /><span>Cargando...</span></div></Html>}>
            {selectedObject?.fileUrl && (
                isJson ? <ParametricModel data={parametricData} /> : <Center top><LoadedModel url={selectedObject.fileUrl} /></Center>
            )}
        </Suspense>

        <MeasurementRuler points={rulerPoints} units={parametricData?.units || "mm"} />
        <ClickHandler onPoint={handleNewPoint} />

        {showBanana && (
          <TransformControls mode="translate" showY={false} showZ={false} size={0.5}>
            <Banana position={[100, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]} name="Banana" />
          </TransformControls>
        )}

        <ContactShadows position={[0, -0.1, 0]} opacity={0.4} scale={500} blur={2.5} far={100} />
        <OrbitControls makeDefault minDistance={10} maxDistance={5000} target={[0, 0, 0]} enabled={!isRulerActive} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}><GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" /></GizmoHelper>
      </Canvas>
    </div>
  );
}
