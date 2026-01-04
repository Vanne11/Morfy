import { Canvas, useLoader, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Center,
  Html,
  GizmoHelper,
  GizmoViewport,
  ContactShadows,
  RoundedBox,
  TransformControls,
  Line
} from "@react-three/drei";
import { useState, Suspense, useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three-stdlib";
import { Button } from "@/components/ui/button";
import { Loader2, Banana as BananaIcon, Ruler as RulerIcon, Trash2, Download, PenTool, MousePointer2 } from "lucide-react";
import type { SelectedObject } from "@/types";
import { toast } from "sonner";
import { Banana } from "./components/Banana";
import { exportToSTL } from "../export/export";

// --- Gestor de Exportación ---
function ExportManager() {
    const { scene } = useThree();
    useEffect(() => {
        const handleExport = (e: any) => {
            exportToSTL(scene, e.detail.name);
        };
        // @ts-ignore
        window.addEventListener("export-stl", handleExport);
        // @ts-ignore
        return () => window.removeEventListener("export-stl", handleExport);
    }, [scene]);
    return null;
}

// --- Herramienta de Regla ---
function MeasurementRuler({ points }: { points: THREE.Vector3[] }) {
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
          {distance.toFixed(1)} mm
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
  if (!data || !data.params) {
      return (
        <group position={[0, 10, 0]}>
            <mesh>
                <sphereGeometry args={[10, 16, 16]} />
                <meshBasicMaterial color="red" wireframe />
            </mesh>
            <Html center><span className="bg-black/80 text-white p-1 text-xs rounded">Sin Parámetros</span></Html>
        </group>
      );
  }

  const { length = 60, width = 20, thickness = 3, color = "#3b82f6" } = data.params;
  const l = Number(length);
  const w = Number(width);
  const t = Number(thickness);

  return (
    <group>
        <RoundedBox 
          key={`${w}-${t}-${l}`} 
          args={[w, t, l]} 
          radius={1} 
          smoothness={4}
          castShadow 
          receiveShadow
          position={[0, t / 2, 0]}
        >
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
        </RoundedBox>
        <axesHelper args={[15]} position={[0, 0.1, 0]} />
    </group>
  );
}

// --- Herramientas de Edición de Nodos ---

function NodeHandles({
    points,
    onUpdate
}: {
    points: [number, number][],
    onUpdate: (newPoints: [number, number][]) => void
}) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const transformRef = useRef<any>(null);

    const handleTransform = (e: any) => {
        if (activeIndex === null) return;
        const target = e.target.object;
        const newPoints = [...points];
        newPoints[activeIndex] = [target.position.x, -target.position.z];
        onUpdate(newPoints);
    };

    const handleDelete = (e: any) => {
        e.stopPropagation();
        if (activeIndex === null) return;
        if (points.length <= 3) {
            toast.error("Una pieza debe tener al menos 3 puntos.");
            return;
        }
        const newPoints = points.filter((_, i) => i !== activeIndex);
        onUpdate(newPoints);
        setActiveIndex(null);
    };

    // Crear línea de contorno
    const linePoints = useMemo(() => {
        const pts = points.map(p => new THREE.Vector3(p[0], 1, -p[1]));
        return [...pts, pts[0]]; // Cerrar polígono
    }, [points]);

    return (
        <group>
            {/* Línea de contorno auxiliar */}
            <Line points={linePoints} color="#fbbf24" lineWidth={1} dashed />

            {points.map((p, i) => (
                <mesh 
                    key={`node-${i}`} 
                    position={[p[0], 1, -p[1]]} 
                    onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                >
                    <sphereGeometry args={[2]} />
                    <meshBasicMaterial color={activeIndex === i ? "#f59e0b" : "#ffffff"} />
                    
                    {activeIndex === i && (
                        <Html position={[0, 5, 0]} center>
                            <Button 
                                variant="destructive" 
                                size="icon" 
                                className="h-6 w-6 rounded-full shadow-xl animate-in zoom-in"
                                onClick={handleDelete}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </Html>
                    )}
                </mesh>
            ))}
            
            {activeIndex !== null && (
                <TransformControls 
                    ref={transformRef}
                    position={[points[activeIndex][0], 1, -points[activeIndex][1]]}
                    mode="translate" 
                    showY={false}
                    onObjectChange={handleTransform}
                >
                    <mesh visible={false}>
                        <sphereGeometry args={[2]} />
                    </mesh>
                </TransformControls>
            )}
        </group>
    );
}

function ClickHandler({ onPoint, onAddNode }: { onPoint: (p: THREE.Vector3) => void, onAddNode?: (p: THREE.Vector3) => void }) {
    const handleClick = (e: any) => {
        if (e.point) onPoint(e.point.clone());
    };
    const handleDoubleClick = (e: any) => {
        if (onAddNode && e.point) onAddNode(e.point.clone());
    };
    return (
        <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -0.1, 0]} 
            onClick={handleClick}
            onPointerMissed={() => {}} // Prevenir deselección accidental
            onDoubleClick={handleDoubleClick}
            visible={false}
        >
            <planeGeometry args={[2000, 2000]} />
        </mesh>
    );
}

export function Viewer({
    selectedObject,
    parametricData,
    onUpdateShape
}: {
    selectedObject: SelectedObject,
    parametricData?: any,
    onUpdateShape?: (newShape: any) => void
}) {
  const [showBanana, setShowBanana] = useState(false);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isEditNodesActive, setIsEditNodesActive] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<THREE.Vector3[]>([]);
  
  const isJson = selectedObject?.fileType === 'json' || selectedObject?.name.toLowerCase().endsWith(".json");

  const handleExportClick = () => {
      window.dispatchEvent(new CustomEvent("export-stl", { detail: { name: selectedObject?.name || "ferula-morfy" } }));
  };

  const handleNewPoint = (p: THREE.Vector3) => {
      if (!isRulerActive) return;
      setRulerPoints(prev => prev.length >= 2 ? [p] : [...prev, p]);
  };

  const handleAddNode = (p: THREE.Vector3) => {
      if (!isEditNodesActive || !parametricData?.shape?.points) return;
      const newPoints: [number, number][] = [...parametricData.shape.points, [p.x, -p.z]];
      handleNodesUpdate(newPoints);
      toast.success("Nuevo nodo añadido");
  };

  const handleNodesUpdate = (newPoints: [number, number][]) => {
      if (onUpdateShape) {
          onUpdateShape({ ...parametricData.shape, points: newPoints });
      }
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

        {isJson && (
            <Button 
                variant={isEditNodesActive ? "default" : "ghost"} 
                size="icon" 
                className={`h-8 w-8 ${isEditNodesActive ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                onClick={() => setIsEditNodesActive(!isEditNodesActive)} 
                title="Editar Nodos"
            >
                {isEditNodesActive ? <MousePointer2 className="h-4 w-4" /> : <PenTool className="h-4 w-4" />}
            </Button>
        )}

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
      {isEditNodesActive && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-amber-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg flex flex-col items-center">
              <span>MODO EDICIÓN ACTIVO</span>
              <span className="text-[10px] opacity-80 uppercase tracking-tighter">Doble clic para añadir nodo | Clic en nodo para mover/borrar</span>
          </div>
      )}

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

        {isEditNodesActive && isJson && parametricData?.shape?.points && (
            <NodeHandles points={parametricData.shape.points} onUpdate={handleNodesUpdate} />
        )}

        <MeasurementRuler points={rulerPoints} />
        <ClickHandler onPoint={handleNewPoint} onAddNode={handleAddNode} />

        {showBanana && (
          <TransformControls mode="translate" showY={false} showZ={false} size={0.5}>
            <Banana position={[100, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]} name="Banana" />
          </TransformControls>
        )}

        <ContactShadows position={[0, -0.1, 0]} opacity={0.4} scale={500} blur={2.5} far={100} />
        <OrbitControls makeDefault minDistance={10} maxDistance={5000} target={[0, 0, 0]} enabled={!isRulerActive && !isEditNodesActive} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}><GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" /></GizmoHelper>
      </Canvas>
    </div>
  );
}
