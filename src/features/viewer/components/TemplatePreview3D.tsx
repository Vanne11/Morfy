import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useState } from "react";
import { ProceduralSplint } from "./ProceduralSplint";
import type { ShapeType } from "../geometry";

interface TemplatePreview3DProps {
  params: Record<string, any>;
  className?: string;
}

export function TemplatePreview3D({ params, className }: TemplatePreview3DProps) {
  const length = params.length ?? 220;
  const camDist = Math.max(length, 150) * 1.2;
  const [active, setActive] = useState(false);

  return (
    <div className={className}>
      <Canvas
        dpr={1}
        frameloop={active ? "always" : "demand"}
        gl={{ antialias: false, powerPreference: "low-power" }}
        camera={{
          position: [camDist * 0.7, camDist * 0.6, camDist * 0.7],
          fov: 40,
          near: 0.1,
          far: 10000,
        }}
        onPointerEnter={() => setActive(true)}
        onPointerLeave={() => setActive(false)}
        onCreated={({ gl }) => {
          // Reduce memory: don't keep drawing when tab hidden
          gl.setPixelRatio(1);
        }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[100, 200, 100]} intensity={1} />
        <Suspense fallback={null}>
          <group rotation={[Math.PI / 2, Math.PI, 0]}>
            <ProceduralSplint
              shapeType={(params.shapeType as ShapeType) || "channel"}
              length={params.length ?? 220}
              widthProximal={params.widthProximal ?? 85}
              widthDistal={params.widthDistal ?? 60}
              thickness={params.thickness ?? 3}
              curvature={params.curvature ?? 190}
              color={params.color ?? "#20b2aa"}
              isFlat={!!params.isFlat}
              showStraps={false}
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
          </group>
        </Suspense>
        <OrbitControls
          makeDefault
          autoRotate={active}
          autoRotateSpeed={2}
          minDistance={10}
          maxDistance={3000}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
