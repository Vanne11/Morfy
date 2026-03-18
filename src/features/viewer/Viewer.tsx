import { Canvas, useThree, useLoader as useThreeLoader } from "@react-three/fiber";
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
import { useState, Suspense, useEffect, Component, type ReactNode } from "react";
import * as THREE from "three";
import { STLLoader } from "three-stdlib";
import { OBJLoader } from "three-stdlib";
import { Button } from "@/components/ui/button";
import { Loader2, Banana as BananaIcon, Ruler as RulerIcon, Trash2, Download, AlertTriangle, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { SelectedObject } from "@/types";
import { Banana } from "./components/Banana";
import { SVGParametricModel } from "./components/SVGParametricModel";
import { ProceduralSplint } from "./components/ProceduralSplint";
import { exportToSTL } from "../export/export";
import { useTranslation } from "react-i18next";

const MAX_FILE_SIZE_MB = 100;
const IMAGE_TYPES = ['png', 'jpg', 'jpeg'];

function isImageFile(fileType?: string, name?: string): boolean {
  if (fileType && IMAGE_TYPES.includes(fileType)) return true;
  if (name) {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return IMAGE_TYPES.includes(ext);
  }
  return false;
}

// --- Error Boundary para el Canvas ---
interface ErrorBoundaryState { hasError: boolean; error?: Error; }

class CanvasErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error) { console.error("Viewer error:", error); }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

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
      <Line points={[start, end]} color="#ef4444" lineWidth={2} />
      <mesh position={start}><sphereGeometry args={[1]} /><meshBasicMaterial color="#ef4444" /></mesh>
      <mesh position={end}><sphereGeometry args={[1]} /><meshBasicMaterial color="#ef4444" /></mesh>
      <Html position={midPoint} center>
        <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap">
          {distance.toFixed(1)} {units}
        </div>
      </Html>
    </group>
  );
}

// --- Plano de referencia con imagen ---
function ImageReferencePlane({ url, opacity = 0.8, scale = 200 }: { url: string; opacity?: number; scale?: number }) {
  const texture = useThreeLoader(THREE.TextureLoader, url);

  // Calcular proporciones de la imagen
  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const width = scale;
  const height = scale / aspect;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} name="__reference_image__">
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// --- Hook para cargar modelo STL/OBJ ---
function useModelLoader(url: string | undefined, fileType?: string) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setGeometry(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setGeometry(null);

    (async () => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const sizeMB = blob.size / (1024 * 1024);

        if (sizeMB > MAX_FILE_SIZE_MB) {
          if (!cancelled) {
            setError(`Archivo demasiado grande (${sizeMB.toFixed(1)} MB). Máximo: ${MAX_FILE_SIZE_MB} MB.`);
            setLoading(false);
          }
          return;
        }

        const arrayBuffer = await blob.arrayBuffer();
        if (cancelled) return;

        const isObj = fileType === 'obj' || url.toLowerCase().includes('.obj');

        if (isObj) {
          const loader = new OBJLoader();
          const text = new TextDecoder().decode(arrayBuffer);
          const group = loader.parse(text);
          let geo: THREE.BufferGeometry | null = null;
          group.traverse((child) => {
            if (!geo && (child as THREE.Mesh).isMesh) {
              geo = (child as THREE.Mesh).geometry;
            }
          });
          if (!cancelled) { setGeometry(geo); setLoading(false); }
        } else {
          const loader = new STLLoader();
          const geo = loader.parse(arrayBuffer);
          if (!cancelled) { setGeometry(geo); setLoading(false); }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Error loading model:", err);
          const msg = err?.message?.includes("allocation failed")
            ? "Memoria insuficiente para cargar este modelo. Intenta con un archivo más pequeño."
            : `Error al cargar el modelo: ${err?.message || "desconocido"}`;
          setError(msg);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [url, fileType]);

  return { geometry, error, loading };
}

// --- Mesh renderizada (dentro del Canvas) ---
function LoadedMesh({ geometry, transforms }: { geometry: THREE.BufferGeometry; transforms?: any }) {
  const params = transforms?.params;
  const scale = params?.scale ?? 1;
  const rotX = ((params?.rotationX ?? -90) * Math.PI) / 180;
  const rotY = ((params?.rotationY ?? 0) * Math.PI) / 180;
  const rotZ = ((params?.rotationZ ?? 0) * Math.PI) / 180;
  const color = params?.color ?? "#e2e8f0";

  return (
    <mesh
      geometry={geometry}
      rotation={[rotX, rotY, rotZ]}
      scale={[scale, scale, scale]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

function ParametricModel({ data }: { data: any }) {
  const { t } = useTranslation();
  const isProcedural = data?.mode === 'procedural' || (!data?.geometry && !data?.params?.svgPath);

  if (isProcedural) {
      const params = data?.params || {};
      return (
        <group rotation={[Math.PI/2, Math.PI, 0]}>
            <ProceduralSplint
                shapeType={params.shapeType || 'channel'}
                length={params.length ?? 220}
                widthProximal={params.widthProximal ?? 85}
                widthDistal={params.widthDistal ?? 60}
                thickness={params.thickness ?? 3}
                curvature={params.curvature ?? 190}
                color={params.color ?? "#20b2aa"}
                isFlat={!!params.isFlat}
                boreRadius={params.boreRadius}
                capStyle={params.capStyle}
                branchAngle={params.branchAngle}
                thumbLength={params.thumbLength}
                thumbWidth={params.thumbWidth}
                slotWidth={params.slotWidth}
                bendAngle={params.bendAngle}
                bendPoint={params.bendPoint}
                lipHeight={params.lipHeight}
            />
             <Html position={[0, (params.length ?? 220)/2 + 20, 0]} center>
                <span className="bg-black/60 text-white px-2 py-1 text-xs rounded backdrop-blur-sm pointer-events-none">
                    {t("features.viewer.proceduralMode") || "Modelo Paramétrico"}
                </span>
            </Html>
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
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} onClick={handleClick} onPointerMissed={() => {}} visible={false}>
            <planeGeometry args={[2000, 2000]} />
        </mesh>
    );
}

// ================================================================
// VIEWER PRINCIPAL
// ================================================================
export function Viewer({
    selectedObject,
    parametricData
}: {
    selectedObject: SelectedObject,
    parametricData?: any
}) {
  const { t } = useTranslation();
  const [showBanana, setShowBanana] = useState(false);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<THREE.Vector3[]>([]);
  const [canvasKey, setCanvasKey] = useState(0);
  const [refImageVisible, setRefImageVisible] = useState(true);
  const [refImageOpacity, setRefImageOpacity] = useState(0.8);
  const [refImageScale, setRefImageScale] = useState(200);

  const isJson = selectedObject?.fileType === 'json' || selectedObject?.name.toLowerCase().endsWith(".json");
  const isImage = isImageFile(selectedObject?.fileType, selectedObject?.name);
  const is3DModel = selectedObject?.fileUrl && !isJson && !isImage;

  // Cargar modelo 3D (solo para STL/OBJ)
  const { geometry, error: modelError, loading: modelLoading } = useModelLoader(
    is3DModel ? selectedObject?.fileUrl : undefined,
    selectedObject?.fileType
  );

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
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">{t("features.viewer.activeModel")}</p>
          <p className="text-sm font-semibold">{selectedObject.name}</p>
          {isJson && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1 inline-block uppercase font-bold">{t("features.viewer.parametric")}</span>}
          {isImage && <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded mt-1 inline-block uppercase font-bold">{t("features.viewer.referenceImage")}</span>}
        </div>
      )}

      {/* UI Overlay (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-background/80 p-2 rounded-lg backdrop-blur shadow-sm border">
        <Button variant="default" size="icon" className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleExportClick} title={t("features.viewer.exportSTL")}>
           <Download className="h-4 w-4" />
        </Button>
        <div className="h-px bg-border my-1" />
        <Button variant={isRulerActive ? "destructive" : "ghost"} size="icon" className="h-8 w-8" onClick={() => { setIsRulerActive(!isRulerActive); if (!isRulerActive) setRulerPoints([]); }} title={t("features.viewer.ruler")}>
           <RulerIcon className="h-4 w-4" />
        </Button>
        {rulerPoints.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRulerPoints([])} title={t("features.viewer.clear")}><Trash2 className="h-4 w-4" /></Button>
        )}
        <div className="h-px bg-border my-1" />
        <Button variant={showBanana ? "default" : "ghost"} size="icon" className="h-8 w-8 text-yellow-500" onClick={() => setShowBanana(!showBanana)} title={t("features.viewer.banana")}>
           <BananaIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Panel de control de imagen de referencia (Bottom Left) */}
      {isImage && selectedObject?.fileUrl && (
        <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur rounded-lg p-3 shadow-lg border space-y-3 w-56">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold">{t("features.viewer.refImageTitle")}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setRefImageVisible(!refImageVisible)}
              title={refImageVisible ? t("features.viewer.hide") : t("features.viewer.show")}
            >
              {refImageVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{t("features.viewer.opacity")}</span>
              <span>{Math.round(refImageOpacity * 100)}%</span>
            </div>
            <Slider
              min={0.1} max={1} step={0.05}
              value={[refImageOpacity]}
              onValueChange={([v]) => setRefImageOpacity(v)}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{t("features.viewer.scale")}</span>
              <span>{refImageScale} mm</span>
            </div>
            <Slider
              min={50} max={600} step={10}
              value={[refImageScale]}
              onValueChange={([v]) => setRefImageScale(v)}
            />
          </div>
        </div>
      )}

      {isRulerActive && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-red-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">{t("features.viewer.clickPoints")}</div>}

      {/* Overlay de loading */}
      {modelLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="bg-background/90 backdrop-blur rounded-lg p-6 flex flex-col items-center gap-3 shadow-lg border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium">{t("features.viewer.loading")}</span>
          </div>
        </div>
      )}

      {/* Overlay de error */}
      {modelError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="bg-background/95 backdrop-blur rounded-lg p-6 max-w-sm text-center space-y-3 shadow-lg border border-destructive/30">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h3 className="font-semibold text-destructive">{t("features.viewer.renderError")}</h3>
            <p className="text-sm text-muted-foreground">{modelError}</p>
          </div>
        </div>
      )}

      <CanvasErrorBoundary fallback={
        <div className="h-full w-full flex items-center justify-center">
          <div className="bg-background/95 backdrop-blur rounded-lg p-6 max-w-sm text-center space-y-3 shadow-lg border border-destructive/30">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h3 className="font-semibold text-destructive">{t("features.viewer.renderError")}</h3>
            <p className="text-sm text-muted-foreground">{t("features.viewer.renderErrorHint")}</p>
            <Button variant="outline" size="sm" onClick={() => setCanvasKey(k => k + 1)}>
              {t("features.viewer.retry")}
            </Button>
          </div>
        </div>
      }>
        <Canvas key={canvasKey} shadows dpr={[1, 2]} camera={{ position: [150, 150, 150], fov: 45, near: 0.1, far: 50000 }}>
          <ExportManager />
          <ambientLight intensity={0.7} />
          <directionalLight position={[100, 200, 100]} intensity={1.5} castShadow />
          <gridHelper args={[400, 40, "gray", "#e5e5e5"]} position={[0, -0.05, 0]} />

          <Suspense fallback={<Html center><div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin" /><span>{t("features.viewer.loading")}</span></div></Html>}>
              {/* Modelo paramétrico */}
              {selectedObject?.fileUrl && isJson && (
                <ParametricModel data={parametricData} />
              )}
              {selectedObject?.type === 'parametric' && !selectedObject?.fileUrl && parametricData && (
                <ParametricModel data={parametricData} />
              )}

              {/* Modelo STL/OBJ */}
              {geometry && !modelError && (
                <Center top>
                  <LoadedMesh geometry={geometry} transforms={parametricData?.mode === 'mesh' ? parametricData : undefined} />
                </Center>
              )}

              {/* Imagen de referencia como plano 3D */}
              {isImage && selectedObject?.fileUrl && refImageVisible && (
                <ImageReferencePlane
                  url={selectedObject.fileUrl}
                  opacity={refImageOpacity}
                  scale={refImageScale}
                />
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
      </CanvasErrorBoundary>
    </div>
  );
}
