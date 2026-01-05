import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Center, ContactShadows } from "@react-three/drei";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db, type ITemplate } from "@/app/db";
import { Info, Code, Camera, Plus, Trash2, AlertCircle, CheckCircle2, Shapes, ChevronDown, Move, RotateCw, Maximize2, Grid3x3, Circle, Square, Pentagon, Minus, FlipHorizontal, FlipVertical, Lock, ArrowUpDown, ArrowLeftRight, Ruler, Cable } from "lucide-react";
import { SVGParametricModel } from "@/features/viewer/components/SVGParametricModel";
import { validateGeometryDefinition } from "@/utils/svgToThree";
import { evaluateExpression } from "@/utils/paramEvaluator";
import * as fabric from "fabric";
import {
  type Constraint,
  type Dimension,
  constraintSolver,
  type Vertex2D
} from "@/utils/constraintSolver";

interface TemplateEditorProps {
  template: ITemplate | null;
  isSystemTemplate?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

// --- Sub-componente de Previsualización con Captura ---
const LivePreview = forwardRef(({ data }: { data: any }, ref) => {
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
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [120, 120, 120], fov: 40 }}
      >
        <SceneCapture />
        <ambientLight intensity={0.8} />
        <pointLight position={[100, 100, 100]} intensity={1.5} />
        <gridHelper args={[300, 30, "#333", "#222"]} />
        <Center top>
          {data?.geometry ? (
            <SVGParametricModel
              geometry={data.geometry}
              params={params}
              color={color}
            />
          ) : (
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#666" wireframe />
            </mesh>
          )}
        </Center>
        <ContactShadows position={[0, -0.1, 0]} opacity={0.6} scale={300} blur={2.5} far={10} />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
});

// --- Panel de Transformaciones Paramétricas ---
interface TransformationPanelProps {
  selectedNodes: string[];
  vertices: Record<string, { x: number | string; y: number | string }>;
  onTransform: (transformation: any) => void;
  onClearSelection: () => void;
}

function TransformationPanel({ selectedNodes, onTransform, onClearSelection }: TransformationPanelProps) {
  const [translateX, setTranslateX] = useState("0");
  const [translateY, setTranslateY] = useState("0");
  const [scaleValue, setScaleValue] = useState("1");
  const [rotateAngle, setRotateAngle] = useState("0");

  if (selectedNodes.length === 0) {
    return (
      <Card className="border-zinc-700">
        <CardContent className="p-3">
          <div className="text-xs text-muted-foreground text-center py-4">
            Selecciona nodos en el canvas para aplicar transformaciones
            <div className="text-[10px] mt-2 text-zinc-500 space-y-1">
              <div>• Ctrl+Click: selección múltiple</div>
              <div>• Doble-click en línea: agregar nodo</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm flex items-center gap-2">
            <Move className="h-4 w-4 text-primary" />
            Transformaciones ({selectedNodes.length} nodos)
          </CardTitle>
          <Button onClick={onClearSelection} size="sm" variant="ghost" className="h-6 px-2 text-xs">
            <Minus className="h-3 w-3 mr-1" />
            Limpiar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* TRASLADAR */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Trasladar</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              step="0.1"
              value={translateX}
              onChange={(e) => setTranslateX(e.target.value)}
              placeholder="ΔX"
              className="h-7 text-xs"
            />
            <Input
              type="number"
              step="0.1"
              value={translateY}
              onChange={(e) => setTranslateY(e.target.value)}
              placeholder="ΔY"
              className="h-7 text-xs"
            />
            <Button
              onClick={() => {
                onTransform({
                  type: 'translate',
                  x: parseFloat(translateX) || 0,
                  y: parseFloat(translateY) || 0,
                });
                setTranslateX("0");
                setTranslateY("0");
              }}
              size="sm"
              className="h-7 text-xs"
            >
              Aplicar
            </Button>
          </div>
        </div>

        {/* ESCALAR */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Escalar</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.1"
              value={scaleValue}
              onChange={(e) => setScaleValue(e.target.value)}
              placeholder="Factor"
              className="h-7 text-xs"
            />
            <Button
              onClick={() => {
                onTransform({
                  type: 'scale',
                  factor: parseFloat(scaleValue) || 1,
                });
                setScaleValue("1");
              }}
              size="sm"
              className="h-7 text-xs gap-1"
            >
              <Maximize2 className="h-3 w-3" />
              Aplicar
            </Button>
          </div>
        </div>

        {/* ROTAR */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Rotar</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="1"
              value={rotateAngle}
              onChange={(e) => setRotateAngle(e.target.value)}
              placeholder="Grados"
              className="h-7 text-xs"
            />
            <Button
              onClick={() => {
                onTransform({
                  type: 'rotate',
                  angle: parseFloat(rotateAngle) || 0,
                });
                setRotateAngle("0");
              }}
              size="sm"
              className="h-7 text-xs gap-1"
            >
              <RotateCw className="h-3 w-3" />
              Aplicar
            </Button>
          </div>
        </div>

        {/* REFLEJAR */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Reflejar</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onTransform({ type: 'flip', axis: 'x' })}
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
            >
              <FlipHorizontal className="h-3 w-3" />
              Horizontal
            </Button>
            <Button
              onClick={() => onTransform({ type: 'flip', axis: 'y' })}
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
            >
              <FlipVertical className="h-3 w-3" />
              Vertical
            </Button>
          </div>
        </div>

        {/* DISTRIBUIR */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Distribuir</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onTransform({ type: 'distribute', mode: 'circular' })}
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
            >
              <Circle className="h-3 w-3" />
              Circular
            </Button>
            <Button
              onClick={() => onTransform({ type: 'distribute', mode: 'line' })}
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
            >
              <Minus className="h-3 w-3" />
              Lineal
            </Button>
          </div>
        </div>

        {/* ALINEAR */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Alinear</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onTransform({ type: 'align', axis: 'x' })}
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
            >
              Horizontal
            </Button>
            <Button
              onClick={() => onTransform({ type: 'align', axis: 'y' })}
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
            >
              Vertical
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Herramientas de Construcción Geométrica ---
interface GeometryToolsProps {
  onCreateShape: (shape: any) => void;
}

function GeometryTools({ onCreateShape }: GeometryToolsProps) {
  const [shapeRadius, setShapeRadius] = useState("5");
  const [shapeSides, setShapeSides] = useState("6");
  const [rectWidth, setRectWidth] = useState("10");
  const [rectHeight, setRectHeight] = useState("5");

  return (
    <Card className="border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shapes className="h-4 w-4 text-primary" />
          Formas Predefinidas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* CÍRCULO/POLÍGONO REGULAR */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Polígono Regular</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              min="3"
              value={shapeSides}
              onChange={(e) => setShapeSides(e.target.value)}
              placeholder="Lados"
              className="h-7 text-xs"
            />
            <Input
              type="number"
              step="0.1"
              value={shapeRadius}
              onChange={(e) => setShapeRadius(e.target.value)}
              placeholder="Radio"
              className="h-7 text-xs"
            />
            <Button
              onClick={() => {
                onCreateShape({
                  type: 'polygon',
                  sides: parseInt(shapeSides) || 6,
                  radius: parseFloat(shapeRadius) || 5,
                });
              }}
              size="sm"
              className="h-7 text-xs gap-1"
            >
              <Pentagon className="h-3 w-3" />
              Crear
            </Button>
          </div>
        </div>

        {/* RECTÁNGULO */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Rectángulo</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              step="0.1"
              value={rectWidth}
              onChange={(e) => setRectWidth(e.target.value)}
              placeholder="Ancho"
              className="h-7 text-xs"
            />
            <Input
              type="number"
              step="0.1"
              value={rectHeight}
              onChange={(e) => setRectHeight(e.target.value)}
              placeholder="Alto"
              className="h-7 text-xs"
            />
            <Button
              onClick={() => {
                onCreateShape({
                  type: 'rectangle',
                  width: parseFloat(rectWidth) || 10,
                  height: parseFloat(rectHeight) || 5,
                });
              }}
              size="sm"
              className="h-7 text-xs gap-1"
            >
              <Square className="h-3 w-3" />
              Crear
            </Button>
          </div>
        </div>

        {/* GRILLA */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Grilla</Label>
          <Button
            onClick={() => {
              onCreateShape({
                type: 'grid',
                rows: 3,
                cols: 3,
                spacing: 5,
              });
            }}
            size="sm"
            variant="secondary"
            className="w-full h-7 text-xs gap-1"
          >
            <Grid3x3 className="h-3 w-3" />
            Crear Grilla 3x3
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Panel de Restricciones ---
interface ConstraintsPanelProps {
  constraints: Constraint[];
  selectedNodes: string[];
  vertices: Record<string, Vertex2D>;
  onAddConstraint: (constraint: Omit<Constraint, 'id'>) => void;
  onToggleConstraint: (id: string) => void;
  onRemoveConstraint: (id: string) => void;
}

function ConstraintsPanel({
  constraints,
  selectedNodes,
  vertices,
  onAddConstraint,
  onToggleConstraint,
  onRemoveConstraint
}: ConstraintsPanelProps) {
  const canAddHorizontal = selectedNodes.length >= 2;
  const canAddVertical = selectedNodes.length >= 2;
  const canAddFixed = selectedNodes.length >= 1;
  const canAddDistance = selectedNodes.length === 2;

  const addConstraint = (type: Constraint['type']) => {
    if (type === 'fixed' && selectedNodes.length >= 1) {
      selectedNodes.forEach(nodeId => {
        onAddConstraint({
          type: 'fixed',
          nodes: [nodeId],
          enabled: true
        });
      });
      toast.success(`${selectedNodes.length} nodo(s) fijado(s)`);
    } else if ((type === 'horizontal' || type === 'vertical') && selectedNodes.length >= 2) {
      onAddConstraint({
        type,
        nodes: [...selectedNodes],
        enabled: true
      });
      toast.success(`Restricción ${type === 'horizontal' ? 'horizontal' : 'vertical'} añadida`);
    } else if (type === 'distance' && selectedNodes.length === 2) {
      const [nodeA, nodeB] = selectedNodes;
      const posA = vertices[nodeA];
      const posB = vertices[nodeB];

      if (posA && posB) {
        const dist = Math.sqrt(
          Math.pow(posB.x - posA.x, 2) + Math.pow(posB.y - posA.y, 2)
        );

        onAddConstraint({
          type: 'distance',
          nodes: [nodeA, nodeB],
          value: Number(dist.toFixed(1)),
          enabled: true
        });
        toast.success(`Restricción de distancia: ${dist.toFixed(1)}cm`);
      }
    }
  };

  const getConstraintIcon = (type: Constraint['type']) => {
    switch (type) {
      case 'fixed': return <Lock className="h-3 w-3" />;
      case 'horizontal': return <ArrowLeftRight className="h-3 w-3" />;
      case 'vertical': return <ArrowUpDown className="h-3 w-3" />;
      case 'distance': return <Ruler className="h-3 w-3" />;
      default: return <Cable className="h-3 w-3" />;
    }
  };

  const getConstraintLabel = (constraint: Constraint) => {
    switch (constraint.type) {
      case 'fixed':
        return `Fijo: ${constraint.nodes[0]}`;
      case 'horizontal':
        return `Horizontal: ${constraint.nodes.join(', ')}`;
      case 'vertical':
        return `Vertical: ${constraint.nodes.join(', ')}`;
      case 'distance':
        return `Distancia: ${constraint.nodes.join(' ↔ ')} = ${constraint.value}cm`;
      default:
        return constraint.type;
    }
  };

  return (
    <Card className="border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          Restricciones ({constraints.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* BOTONES PARA AGREGAR RESTRICCIONES */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">
            Agregar Restricción {selectedNodes.length > 0 && `(${selectedNodes.length} nodos)`}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => addConstraint('fixed')}
              disabled={!canAddFixed}
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1"
              title="Fijar nodo(s) seleccionado(s)"
            >
              <Lock className="h-3 w-3" />
              Fijo
            </Button>
            <Button
              onClick={() => addConstraint('horizontal')}
              disabled={!canAddHorizontal}
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1"
              title="Vincular nodos en movimiento horizontal"
            >
              <ArrowLeftRight className="h-3 w-3" />
              Horizontal
            </Button>
            <Button
              onClick={() => addConstraint('vertical')}
              disabled={!canAddVertical}
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1"
              title="Vincular nodos en movimiento vertical"
            >
              <ArrowUpDown className="h-3 w-3" />
              Vertical
            </Button>
            <Button
              onClick={() => addConstraint('distance')}
              disabled={!canAddDistance}
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1"
              title="Mantener distancia entre 2 nodos"
            >
              <Ruler className="h-3 w-3" />
              Distancia
            </Button>
          </div>
          {selectedNodes.length === 0 && (
            <div className="text-[10px] text-muted-foreground text-center py-2">
              Selecciona nodos para agregar restricciones
            </div>
          )}
        </div>

        {/* LISTA DE RESTRICCIONES */}
        {constraints.length > 0 && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-zinc-400">
              Restricciones Activas
            </Label>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {constraints.map(constraint => (
                <div
                  key={constraint.id}
                  className={`bg-muted/50 border rounded p-2 flex items-center gap-2 ${
                    !constraint.enabled ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex-1 flex items-center gap-2">
                    {getConstraintIcon(constraint.type)}
                    <span className="text-[10px] font-mono">
                      {getConstraintLabel(constraint)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => onToggleConstraint(constraint.id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      title={constraint.enabled ? 'Desactivar' : 'Activar'}
                    >
                      {constraint.enabled ? '👁️' : '👁️‍🗨️'}
                    </Button>
                    <Button
                      onClick={() => onRemoveConstraint(constraint.id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Panel de Dimensiones ---
interface DimensionsPanelProps {
  dimensions: Dimension[];
  selectedNodes: string[];
  selectedLines: Array<{ from: string; to: string }>;
  vertices: Record<string, Vertex2D>;
  onAddDimension: (dimension: Omit<Dimension, 'id'>) => void;
  onUpdateDimension: (id: string, value: number) => void;
  onRemoveDimension: (id: string) => void;
  onToggleDimensionParameter: (id: string) => void;
}

function DimensionsPanel({
  dimensions,
  selectedNodes,
  selectedLines,
  vertices,
  onAddDimension,
  onUpdateDimension,
  onRemoveDimension,
  onToggleDimensionParameter
}: DimensionsPanelProps) {
  const canAddLinear = selectedNodes.length === 2;
  const canAddAngular = selectedLines.length === 2;

  const addDimension = (type: Dimension['type']) => {
    if (type === 'linear' && selectedNodes.length === 2) {
      const [nodeA, nodeB] = selectedNodes;
      const posA = vertices[nodeA];
      const posB = vertices[nodeB];

      if (posA && posB) {
        const dist = Math.sqrt(
          Math.pow(posB.x - posA.x, 2) + Math.pow(posB.y - posA.y, 2)
        );

        onAddDimension({
          type: 'linear',
          elements: {
            nodes: [nodeA, nodeB]
          },
          value: Number(dist.toFixed(1)),
          isParameter: false
        });
        toast.success(`Dimensión lineal: ${dist.toFixed(1)}cm`);
      }
    } else if (type === 'angular' && selectedLines.length === 2) {
      const [line1, line2] = selectedLines;

      // Calcular ángulo actual entre las líneas
      const pos1A = vertices[line1.from];
      const pos1B = vertices[line1.to];
      const pos2A = vertices[line2.from];
      const pos2B = vertices[line2.to];

      if (pos1A && pos1B && pos2A && pos2B) {
        const angle1 = Math.atan2(pos1B.y - pos1A.y, pos1B.x - pos1A.x);
        const angle2 = Math.atan2(pos2B.y - pos2A.y, pos2B.x - pos2A.x);
        let angleDiff = angle2 - angle1;

        // Normalizar a rango [-π, π]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Asegurar que siempre sea el ángulo interno (≤ 180°)
        let angleDegrees = Math.abs((angleDiff * 180) / Math.PI);
        if (angleDegrees > 180) {
          angleDegrees = 360 - angleDegrees;
        }

        onAddDimension({
          type: 'angular',
          elements: {
            lines: [line1, line2]
          },
          value: Number(angleDegrees.toFixed(1)),
          isParameter: false
        });
        toast.success(`Dimensión angular: ${angleDegrees.toFixed(1)}°`);
      }
    }
  };

  const getDimensionIcon = (type: Dimension['type']) => {
    switch (type) {
      case 'linear': return <Ruler className="h-3 w-3" />;
      case 'horizontal': return <ArrowLeftRight className="h-3 w-3" />;
      case 'vertical': return <ArrowUpDown className="h-3 w-3" />;
      default: return <Ruler className="h-3 w-3" />;
    }
  };

  const getDimensionLabel = (dimension: Dimension) => {
    const value = typeof dimension.value === 'number'
      ? dimension.value.toFixed(1)
      : dimension.value;

    if (dimension.elements.nodes) {
      return `${dimension.type}: ${dimension.elements.nodes.join(' ↔ ')} = ${value}cm`;
    }
    return `${dimension.type}: ${value}`;
  };

  return (
    <Card className="border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Ruler className="h-4 w-4 text-primary" />
          Dimensiones ({dimensions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* BOTONES PARA AGREGAR DIMENSIONES */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">
            Agregar Dimensión
            {selectedNodes.length > 0 && ` (${selectedNodes.length} nodos)`}
            {selectedLines.length > 0 && ` (${selectedLines.length} líneas)`}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => addDimension('linear')}
              disabled={!canAddLinear}
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1"
              title="Dimensión lineal entre 2 nodos"
            >
              <Ruler className="h-3 w-3" />
              Lineal
            </Button>
            <Button
              onClick={() => addDimension('angular')}
              disabled={!canAddAngular}
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1"
              title="Ángulo entre 2 líneas"
            >
              <RotateCw className="h-3 w-3" />
              Angular
            </Button>
          </div>
          {selectedNodes.length === 0 && selectedLines.length === 0 && (
            <div className="text-[10px] text-muted-foreground text-center py-2">
              Selecciona 2 nodos o 2 líneas para dimensionar
            </div>
          )}
        </div>

        {/* LISTA DE DIMENSIONES */}
        {dimensions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-zinc-400">
              Dimensiones Activas
            </Label>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {dimensions.map(dimension => {
                const currentValue = constraintSolver.calculateDimensionValue(dimension, vertices);
                const targetValue = typeof dimension.value === 'number' ? dimension.value : 0;

                return (
                  <div
                    key={dimension.id}
                    className="bg-muted/50 border rounded p-2 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        {getDimensionIcon(dimension.type)}
                        <span className="text-[10px] font-mono">
                          {getDimensionLabel(dimension)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => onToggleDimensionParameter(dimension.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          title={dimension.isParameter ? 'Remover de parámetros' : 'Convertir en parámetro'}
                        >
                          {dimension.isParameter ? '📌' : '📍'}
                        </Button>
                        <Button
                          onClick={() => onRemoveDimension(dimension.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* CONTROL DE VALOR */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>Actual: {currentValue.toFixed(1)}cm</span>
                        <span>Objetivo: {targetValue.toFixed(1)}cm</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={targetValue}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value);
                            if (!isNaN(newValue)) {
                              onUpdateDimension(dimension.id, newValue);
                            }
                          }}
                          className="h-7 text-xs font-mono"
                        />
                        <Button
                          onClick={() => {
                            // Aplicar dimensión
                            onUpdateDimension(dimension.id, targetValue);
                          }}
                          size="sm"
                          variant="default"
                          className="h-7 px-2 text-xs"
                          title="Aplicar dimensión"
                        >
                          Aplicar
                        </Button>
                      </div>
                    </div>

                    {dimension.isParameter && (
                      <div className="bg-primary/10 border border-primary/30 rounded p-1.5">
                        <Label className="text-[9px] text-primary">
                          Nombre del parámetro
                        </Label>
                        <Input
                          type="text"
                          value={dimension.label || ''}
                          onChange={() => {
                            // TODO: Implementar actualización de label
                          }}
                          placeholder="Ej: longitud, ancho, radio"
                          className="h-6 text-[10px] mt-1"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Editor Interactivo Fabric.js ---
interface FabricEditorProps {
  geometry: any;
  params: Record<string, any>;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeAdd: (perimeterId: string, afterNodeId: string, x: number, y: number) => void;
  selectedNodes: string[];
  selectedLines: Array<{ from: string; to: string }>;
  onSelectionChange: (nodes: string[], lines: Array<{ from: string; to: string }>) => void;
  constraints?: Constraint[];
  dimensions?: Dimension[];
}

function FabricGeometryEditor({
  geometry,
  params,
  onNodeMove,
  onNodeAdd,
  selectedNodes,
  selectedLines,
  onSelectionChange,
  constraints = [],
  dimensions = []
}: FabricEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const nodeCircles = useRef<Map<string, fabric.Circle>>(new Map());
  const edgeLines = useRef<Map<string, fabric.Line>>(new Map());

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Obtener dimensiones del contenedor
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Usar el menor valor para mantener canvas cuadrado
    const canvasSize = Math.min(containerWidth - 32, containerHeight - 32);

    // Configurar HiDPI manualmente para canvas nativo
    const dpr = window.devicePixelRatio || 1;
    const canvasEl = canvasRef.current;

    // Establecer tamaño físico del canvas (píxeles del dispositivo)
    canvasEl.width = canvasSize * dpr;
    canvasEl.height = canvasSize * dpr;

    // Establecer tamaño CSS (píxeles lógicos)
    canvasEl.style.width = `${canvasSize}px`;
    canvasEl.style.height = `${canvasSize}px`;

    // Inicializar Fabric canvas con el tamaño lógico
    const canvas = new fabric.Canvas(canvasEl, {
      width: canvasSize,
      height: canvasSize,
      backgroundColor: '#ffffff',
      selection: false, // Desactivar selección de área
    });

    // Escalar el contexto para HiDPI
    if (dpr !== 1) {
      const ctx = canvas.getContext();
      ctx.scale(dpr, dpr);
    }

    // Configurar Fabric para que use el tamaño lógico
    canvas.setDimensions({ width: canvasSize, height: canvasSize });

    fabricRef.current = canvas;

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricRef.current || !geometry) return;

    const canvas = fabricRef.current;
    canvas.clear();
    nodeCircles.current.clear();
    edgeLines.current.clear();

    // Redibujar el fondo
    canvas.backgroundColor = '#ffffff';

    // Evaluar vértices
    const evaluatedVertices: Record<string, { x: number; y: number }> = {};
    for (const [id, vertex] of Object.entries(geometry.vertices || {})) {
      const v = vertex as any;
      evaluatedVertices[id] = {
        x: evaluateExpression(v.x, params),
        y: evaluateExpression(v.y, params),
      };
    }

    // Calcular bounds para auto-zoom
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const vertex of Object.values(evaluatedVertices)) {
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
    }

    const width = maxX - minX || 10;
    const height = maxY - minY || 10;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calcular escala para que quepa en el canvas con padding
    const padding = 60;
    const scaleX = (canvas.width! - padding * 2) / width;
    const scaleY = (canvas.height! - padding * 2) / height;
    const scale = Math.min(scaleX, scaleY, 50); // Max 50x zoom

    // Función para transformar coordenadas a canvas
    const toCanvasX = (x: number) => (x - centerX) * scale + canvas.width! / 2;
    const toCanvasY = (y: number) => (y - centerY) * scale + canvas.height! / 2;
    const fromCanvasX = (cx: number) => (cx - canvas.width! / 2) / scale + centerX;
    const fromCanvasY = (cy: number) => (cy - canvas.height! / 2) / scale + centerY;


    // Dibujar contornos (líneas)
    for (const contour of geometry.contours || []) {
      const strokeColor = contour.type === 'outer' ? '#3b82f6' : '#ef4444';

      for (let i = 0; i < contour.elements.length; i++) {
        const element = contour.elements[i];
        const fromVertex = evaluatedVertices[element.from];
        const toVertex = evaluatedVertices[element.to];

        if (!fromVertex || !toVertex) continue;

        // Verificar si esta línea está seleccionada
        const isLineSelected = selectedLines.some(
          l => (l.from === element.from && l.to === element.to) ||
               (l.from === element.to && l.to === element.from)
        );

        // Línea principal
        const line = new fabric.Line(
          [
            toCanvasX(fromVertex.x),
            toCanvasY(fromVertex.y),
            toCanvasX(toVertex.x),
            toCanvasY(toVertex.y),
          ],
          {
            stroke: isLineSelected ? '#facc15' : strokeColor,
            strokeWidth: isLineSelected ? 4 : 2,
            selectable: true, // Permitir selección
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true,
            hoverCursor: 'pointer',
            data: {
              type: 'edge',
              contourId: contour.id,
              fromNode: element.from,
              toNode: element.to,
            },
          }
        );

        // Hover effect
        line.on('mouseover', () => {
          if (!isLineSelected) {
            line.set({ strokeWidth: 4, stroke: '#facc15' });
            canvas.renderAll();
          }
        });

        line.on('mouseout', () => {
          if (!isLineSelected) {
            line.set({ strokeWidth: 2, stroke: strokeColor });
            canvas.renderAll();
          }
        });

        // Click para seleccionar línea
        line.on('mousedown', (event) => {
          const lineData = { from: element.from, to: element.to };

          if (event.e.ctrlKey || event.e.metaKey) {
            // Ctrl+Click: toggle selección de línea
            event.e.preventDefault();
            const isAlreadySelected = selectedLines.some(
              l => (l.from === lineData.from && l.to === lineData.to) ||
                   (l.from === lineData.to && l.to === lineData.from)
            );

            if (isAlreadySelected) {
              const newLines = selectedLines.filter(
                l => !(l.from === lineData.from && l.to === lineData.to) &&
                     !(l.from === lineData.to && l.to === lineData.from)
              );
              onSelectionChange(selectedNodes, newLines);
            } else {
              onSelectionChange(selectedNodes, [...selectedLines, lineData]);
            }
          } else {
            // Click normal: seleccionar solo esta línea
            onSelectionChange([], [lineData]);
          }
        });

        // Evento para agregar nodo en el medio (doble-click)
        line.on('mousedblclick', () => {
          const midX = fromCanvasX((line.x1! + line.x2!) / 2);
          const midY = fromCanvasY((line.y1! + line.y2!) / 2);
          onNodeAdd(contour.id, element.from, midX, midY);
          toast.success('Nodo agregado. Doble-click en línea para agregar más');
        });

        const lineKey = `${element.from}-${element.to}`;
        edgeLines.current.set(lineKey, line);
        canvas.add(line);
      }
    }

    // Dibujar nodos (círculos)
    for (const [id, vertex] of Object.entries(evaluatedVertices)) {
      const cx = toCanvasX(vertex.x);
      const cy = toCanvasY(vertex.y);

      // Círculo principal (nodo)
      const isSelected = selectedNodes.includes(id);
      const circle = new fabric.Circle({
        left: cx,
        top: cy,
        radius: isSelected ? 8 : 6,
        fill: isSelected ? '#f59e0b' : '#10b981',
        stroke: '#ffffff',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: true, // Importante: permite arrastrar
        hasControls: false,
        hasBorders: false,
        lockScalingX: true,
        lockScalingY: true,
        hoverCursor: 'move',
        data: { type: 'node', id },
      });

      // Texto de la etiqueta
      const text = new fabric.Text(id, {
        left: cx + 10,
        top: cy - 10,
        fontSize: 11,
        fill: '#10b981',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        selectable: false,
        evented: false,
      });

      // Evento de click para selección múltiple
      circle.on('mousedown', (e) => {
        const event = e.e as MouseEvent;
        if (event.ctrlKey || event.metaKey) {
          // Ctrl+Click para toggle selección (no mover)
          event.preventDefault();
          event.stopPropagation();
          circle.set({ selectable: false });
          const newSelection = selectedNodes.includes(id)
            ? selectedNodes.filter(n => n !== id)
            : [...selectedNodes, id];
          onSelectionChange(newSelection, selectedLines);
          // Restaurar selectable después de un frame
          setTimeout(() => {
            circle.set({ selectable: true });
          }, 10);
          return false;
        } else if (!selectedNodes.includes(id)) {
          // Click normal selecciona solo este nodo (deseleccionar líneas)
          onSelectionChange([id], []);
        }
      });

      // Evento durante el arrastre (solo visual, no actualiza estado)
      circle.on('moving', () => {
        // Mover la etiqueta junto al círculo
        text.set({
          left: circle.left! + 10,
          top: circle.top! - 10,
        });

        // Actualizar líneas conectadas
        canvas.getObjects('line').forEach((obj) => {
          const line = obj as fabric.Line & { data?: any };
          const data = line.data;
          if (data?.type === 'edge') {
            if (data.fromNode === id) {
              line.set({ x1: circle.left, y1: circle.top });
            }
            if (data.toNode === id) {
              line.set({ x2: circle.left, y2: circle.top });
            }
          }
        });

        canvas.renderAll();
      });

      // Cuando termina el arrastre, actualizar el estado
      circle.on('modified', () => {
        const newX = fromCanvasX(circle.left!);
        const newY = fromCanvasY(circle.top!);

        // Validar movimiento con el solver de restricciones
        const result = constraintSolver.solveNodeMove(
          id,
          Number(newX.toFixed(1)),
          Number(newY.toFixed(1)),
          evaluatedVertices,
          constraints
        );

        if (result.blocked) {
          // Movimiento bloqueado, revertir a posición original
          circle.set({
            left: toCanvasX(evaluatedVertices[id].x),
            top: toCanvasY(evaluatedVertices[id].y)
          });
          canvas.renderAll();
          toast.error(result.reason || 'Movimiento bloqueado por restricción');
        } else {
          // Aplicar el movimiento y las propagaciones
          Object.entries(result.updates).forEach(([nodeId, pos]) => {
            onNodeMove(nodeId, Number(pos.x.toFixed(1)), Number(pos.y.toFixed(1)));
          });
        }
      });

      nodeCircles.current.set(id, circle);
      canvas.add(circle);
      canvas.add(text);
    }

    // ============================================================================
    // VISUALIZAR RESTRICCIONES (SÍMBOLOS CAD)
    // ============================================================================

    constraints.forEach(constraint => {
      if (!constraint.enabled) return;

      if (constraint.type === 'fixed' && constraint.nodes[0]) {
        const nodeId = constraint.nodes[0];
        const vertex = evaluatedVertices[nodeId];
        if (!vertex) return;

        const cx = toCanvasX(vertex.x);
        const cy = toCanvasY(vertex.y);

        // Símbolo de candado para nodo fijo
        const lockSize = 10;
        const lockRect = new fabric.Rect({
          left: cx - lockSize / 2,
          top: cy - lockSize - 15,
          width: lockSize,
          height: lockSize * 0.7,
          fill: 'transparent',
          stroke: '#ef4444',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });

        const lockArc = new fabric.Circle({
          left: cx,
          top: cy - lockSize - 15,
          radius: lockSize / 2.5,
          fill: 'transparent',
          stroke: '#ef4444',
          strokeWidth: 2,
          startAngle: 0,
          endAngle: Math.PI,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });

        canvas.add(lockRect);
        canvas.add(lockArc);
      }

      if ((constraint.type === 'horizontal' || constraint.type === 'vertical') && constraint.nodes.length >= 2) {
        const [nodeA, nodeB] = constraint.nodes;
        const posA = evaluatedVertices[nodeA];
        const posB = evaluatedVertices[nodeB];

        if (!posA || !posB) return;

        const cx1 = toCanvasX(posA.x);
        const cy1 = toCanvasY(posA.y);
        const cx2 = toCanvasX(posB.x);
        const cy2 = toCanvasY(posB.y);

        // Línea de conexión punteada
        const connectionLine = new fabric.Line(
          [cx1, cy1, cx2, cy2],
          {
            stroke: constraint.type === 'horizontal' ? '#3b82f6' : '#f59e0b',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
            opacity: 0.5,
          }
        );

        canvas.add(connectionLine);

        // Símbolo de restricción
        const midX = (cx1 + cx2) / 2;
        const midY = (cy1 + cy2) / 2;

        const symbolText = new fabric.Text(
          constraint.type === 'horizontal' ? '↔' : '↕',
          {
            left: midX,
            top: midY - 8,
            fontSize: 16,
            fill: constraint.type === 'horizontal' ? '#3b82f6' : '#f59e0b',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          }
        );

        canvas.add(symbolText);
      }
    });

    // ============================================================================
    // VISUALIZAR DIMENSIONES (COTAS)
    // ============================================================================

    dimensions.forEach(dimension => {
      if (dimension.type === 'linear' && dimension.elements.nodes) {
        const [nodeA, nodeB] = dimension.elements.nodes;
        const posA = evaluatedVertices[nodeA];
        const posB = evaluatedVertices[nodeB];

        if (!posA || !posB) return;

        const cx1 = toCanvasX(posA.x);
        const cy1 = toCanvasY(posA.y);
        const cx2 = toCanvasX(posB.x);
        const cy2 = toCanvasY(posB.y);

        const dx = cx2 - cx1;
        const dy = cy2 - cy1;
        const angle = Math.atan2(dy, dx);

        // Color de las dimensiones: cyan/violeta
        const dimColor = '#a855f7'; // Violeta

        // Línea de cota (directamente de nodo a nodo)
        const dimensionLine = new fabric.Line(
          [cx1, cy1, cx2, cy2],
          {
            stroke: dimColor,
            strokeWidth: 2,
            strokeDashArray: [6, 4],
            selectable: false,
            evented: false,
          }
        );

        // Flechas en los extremos (sobre los nodos)
        const arrowSize = 10;

        const arrow1 = new fabric.Polygon(
          [
            { x: cx1, y: cy1 },
            { x: cx1 + arrowSize * Math.cos(angle - Math.PI / 6), y: cy1 + arrowSize * Math.sin(angle - Math.PI / 6) },
            { x: cx1 + arrowSize * Math.cos(angle + Math.PI / 6), y: cy1 + arrowSize * Math.sin(angle + Math.PI / 6) },
          ],
          {
            fill: dimColor,
            selectable: false,
            evented: false,
          }
        );

        const arrow2 = new fabric.Polygon(
          [
            { x: cx2, y: cy2 },
            { x: cx2 - arrowSize * Math.cos(angle - Math.PI / 6), y: cy2 - arrowSize * Math.sin(angle - Math.PI / 6) },
            { x: cx2 - arrowSize * Math.cos(angle + Math.PI / 6), y: cy2 - arrowSize * Math.sin(angle + Math.PI / 6) },
          ],
          {
            fill: dimColor,
            selectable: false,
            evented: false,
          }
        );

        // Texto con el valor (en el medio, con offset arriba)
        const value = typeof dimension.value === 'number'
          ? dimension.value.toFixed(1)
          : dimension.value;

        const label = dimension.isParameter && dimension.label
          ? `${dimension.label} = ${value}cm`
          : `${value}cm`;

        // Calcular posición del texto con offset perpendicular pequeño
        const midX = (cx1 + cx2) / 2;
        const midY = (cy1 + cy2) / 2;
        const length = Math.sqrt(dx * dx + dy * dy);
        const offsetDist = 15;
        const perpX = (-dy / length) * offsetDist;
        const perpY = (dx / length) * offsetDist;

        const dimensionText = new fabric.Text(label, {
          left: midX + perpX,
          top: midY + perpY,
          fontSize: 11,
          fill: dimColor,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          originX: 'center',
          originY: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          selectable: false,
          evented: false,
        });

        canvas.add(dimensionLine);
        canvas.add(arrow1);
        canvas.add(arrow2);
        canvas.add(dimensionText);
      } else if (dimension.type === 'angular' && dimension.elements.lines && dimension.elements.lines.length === 2) {
        // Dimensión angular entre dos líneas
        const [line1, line2] = dimension.elements.lines;

        const pos1A = evaluatedVertices[line1.from];
        const pos1B = evaluatedVertices[line1.to];
        const pos2A = evaluatedVertices[line2.from];
        const pos2B = evaluatedVertices[line2.to];

        if (!pos1A || !pos1B || !pos2A || !pos2B) return;

        // Convertir a coordenadas canvas
        const l1x1 = toCanvasX(pos1A.x);
        const l1y1 = toCanvasY(pos1A.y);
        const l1x2 = toCanvasX(pos1B.x);
        const l1y2 = toCanvasY(pos1B.y);
        const l2x1 = toCanvasX(pos2A.x);
        const l2y1 = toCanvasY(pos2A.y);
        const l2x2 = toCanvasX(pos2B.x);
        const l2y2 = toCanvasY(pos2B.y);

        // Calcular ángulos
        const angle1 = Math.atan2(l1y2 - l1y1, l1x2 - l1x1);
        const angle2 = Math.atan2(l2y2 - l2y1, l2x2 - l2x1);

        // Calcular punto de intersección de las dos líneas
        const denominator = (l1x1 - l1x2) * (l2y1 - l2y2) - (l1y1 - l1y2) * (l2x1 - l2x2);
        let centerX: number;
        let centerY: number;

        if (Math.abs(denominator) < 0.001) {
          // Las líneas son paralelas, usar punto medio
          centerX = (l1x1 + l1x2 + l2x1 + l2x2) / 4;
          centerY = (l1y1 + l1y2 + l2y1 + l2y2) / 4;
        } else {
          // Calcular intersección
          const t = ((l1x1 - l2x1) * (l2y1 - l2y2) - (l1y1 - l2y1) * (l2x1 - l2x2)) / denominator;
          centerX = l1x1 + t * (l1x2 - l1x1);
          centerY = l1y1 + t * (l1y2 - l1y1);
        }

        // Radio del arco
        const arcRadius = 40;
        const dimColor = '#a855f7';

        // Calcular la diferencia de ángulo y normalizar para que siempre sea el ángulo interno
        let angleDiff = angle2 - angle1;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Determinar ángulos de inicio y fin para el arco
        let startAngle = angle1;
        let endAngle = angle2;

        // Si el ángulo es mayor a 180°, invertir la dirección
        if (Math.abs(angleDiff) > Math.PI) {
          [startAngle, endAngle] = [endAngle, startAngle];
        }

        // Verificar si el ángulo es cercano a 90° (±5°)
        const angleValue = typeof dimension.value === 'number' ? dimension.value : 0;
        const isRightAngle = Math.abs(angleValue - 90) < 5;

        if (isRightAngle) {
          // Dibujar un pequeño cuadrado para ángulos rectos
          const squareSize = arcRadius * 0.6;
          const dx1 = Math.cos(startAngle) * squareSize;
          const dy1 = Math.sin(startAngle) * squareSize;
          const dx2 = Math.cos(endAngle) * squareSize;
          const dy2 = Math.sin(endAngle) * squareSize;

          const square = new fabric.Polyline([
            { x: centerX, y: centerY },
            { x: centerX + dx1, y: centerY + dy1 },
            { x: centerX + dx1 + dx2, y: centerY + dy1 + dy2 },
            { x: centerX + dx2, y: centerY + dy2 },
            { x: centerX, y: centerY }
          ], {
            fill: 'transparent',
            stroke: dimColor,
            strokeWidth: 2,
            selectable: false,
            evented: false,
          });

          canvas.add(square);
        } else {
          // Dibujar arco usando Path
          const startX = centerX + arcRadius * Math.cos(startAngle);
          const startY = centerY + arcRadius * Math.sin(startAngle);
          const endX = centerX + arcRadius * Math.cos(endAngle);
          const endY = centerY + arcRadius * Math.sin(endAngle);

          // Determinar si el arco debe ser grande o pequeño
          const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
          const sweepFlag = angleDiff > 0 ? 1 : 0;

          const pathData = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;

          const arc = new fabric.Path(pathData, {
            fill: '',
            stroke: dimColor,
            strokeWidth: 2,
            strokeDashArray: [4, 3],
            selectable: false,
            evented: false,
          });

          canvas.add(arc);
        }

        // Texto con el ángulo
        const value = typeof dimension.value === 'number'
          ? dimension.value.toFixed(1)
          : dimension.value;

        const label = dimension.isParameter && dimension.label
          ? `${dimension.label} = ${value}°`
          : `${value}°`;

        // Calcular el ángulo medio correctamente
        const midAngle = startAngle + angleDiff / 2;
        const textRadius = arcRadius + 15;

        const angleText = new fabric.Text(label, {
          left: centerX + textRadius * Math.cos(midAngle),
          top: centerY + textRadius * Math.sin(midAngle),
          fontSize: 11,
          fill: dimColor,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          originX: 'center',
          originY: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          selectable: false,
          evented: false,
        });

        canvas.add(angleText);
      }
    });

    canvas.renderAll();

    // Click en el fondo del canvas para deseleccionar
    canvas.on('mouse:down', (e) => {
      if (!e.target) {
        // Click en el fondo (no en ningún objeto)
        onSelectionChange([], []);
      }
    });

  }, [geometry, params, onNodeMove, onNodeAdd, selectedNodes, selectedLines, onSelectionChange, constraints, dimensions]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white rounded border border-zinc-300 p-4 flex items-center justify-center"
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

// --- EDITOR VISUAL DE GEOMETRÍA ---
interface Vertex {
  id: string;
  x: number | string;
  y: number | string;
}

interface VisualGeometryEditorProps {
  geometry: any;
  onChange: (newGeometry: any) => void;
  params: Record<string, any>;
}

function VisualGeometryEditor({ geometry, onChange, params }: VisualGeometryEditorProps) {
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [contours, setContours] = useState<any[]>([]);
  const [numNodesInput, setNumNodesInput] = useState("");
  const [showAddPerimeterDialog, setShowAddPerimeterDialog] = useState(false);
  const [editMode, setEditMode] = useState<'number' | 'expression'>('number');

  // Sincronizar desde geometry a state local
  useEffect(() => {
    if (geometry?.vertices) {
      const verts: Vertex[] = Object.entries(geometry.vertices).map(([id, coord]: [string, any]) => ({
        id,
        x: coord.x,
        y: coord.y,
      }));
      setVertices(verts);
    }

    if (geometry?.contours) {
      setContours(geometry.contours);
    }
  }, [geometry]);

  // Actualizar geometry cuando cambia el state local
  const updateGeometry = (newVertices: Vertex[], newContours: any[]) => {
    const verticesObj: Record<string, any> = {};
    newVertices.forEach(v => {
      verticesObj[v.id] = { x: v.x, y: v.y };
    });

    const newGeometry = {
      ...geometry,
      vertices: verticesObj,
      contours: newContours,
    };

    onChange(newGeometry);
  };

  const updateVertex = (id: string, field: 'x' | 'y', value: string) => {
    const newVertices = vertices.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    );
    setVertices(newVertices);
    updateGeometry(newVertices, contours);
  };

  const handleAddPerimeter = () => {
    const numNodes = parseInt(numNodesInput);
    if (!numNodes || numNodes < 3) {
      toast.error("El perímetro necesita al menos 3 nodos");
      return;
    }

    // AUTO-GENERAR NOMBRE: exterior para el primero, interior1, interior2... para los demás
    let perimeterId: string;
    if (contours.length === 0) {
      perimeterId = "exterior";
    } else {
      let interiorNum = 1;
      while (contours.some(c => c.id === `interior${interiorNum}`)) {
        interiorNum++;
      }
      perimeterId = `interior${interiorNum}`;
    }

    // CREAR LOS NODOS DISTRIBUYENDO EN CÍRCULO
    const newVertices = [];
    const elements = [];

    // Tamaño inicial razonable para dedos (5cm de radio)
    const radius = 5;
    const centerX = 0;
    const centerY = 0;

    for (let i = 0; i < numNodes; i++) {
      const nodeId = `${perimeterId}_${i + 1}`;

      // Distribuir nodos en círculo
      const angle = (i / numNodes) * 2 * Math.PI - Math.PI / 2; // Empezar arriba
      const x = (centerX + radius * Math.cos(angle)).toFixed(1);
      const y = (centerY + radius * Math.sin(angle)).toFixed(1);

      newVertices.push({ id: nodeId, x, y });

      const nextIndex = (i + 1) % numNodes;
      const nextNodeId = `${perimeterId}_${nextIndex + 1}`;
      elements.push({ type: "line", from: nodeId, to: nextNodeId });
    }

    const newContour = {
      id: perimeterId,
      type: contours.length === 0 ? "outer" : "hole",
      closed: true,
      elements,
    };

    const allVertices = [...vertices, ...newVertices];
    const allContours = [...contours, newContour];

    setVertices(allVertices);
    setContours(allContours);
    updateGeometry(allVertices, allContours);

    setShowAddPerimeterDialog(false);
    setNumNodesInput("");
    toast.success(`Perímetro "${perimeterId}" creado con ${numNodes} nodos`);
  };

  const removeContour = (id: string) => {
    // ELIMINAR EL PERÍMETRO Y SUS NODOS
    const nodesToRemove = vertices.filter(v => v.id.startsWith(id + "_")).map(v => v.id);
    const newVertices = vertices.filter(v => !v.id.startsWith(id + "_"));
    const newContours = contours.filter(c => c.id !== id);

    setVertices(newVertices);
    setContours(newContours);
    updateGeometry(newVertices, newContours);
    toast.success(`Perímetro "${id}" y sus ${nodesToRemove.length} nodos eliminados`);
  };

  return (
    <div className="space-y-4">
      {/* SECCIÓN PERÍMETROS */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <Label className="text-sm font-bold text-primary">Perímetros</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Conecta nodos para formar contornos cerrados
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setEditMode(editMode === 'number' ? 'expression' : 'number')}
              size="sm"
              variant="outline"
              className="gap-2 h-8"
            >
              <Code className="h-3 w-3" />
              {editMode === 'number' ? 'Modo Expresión' : 'Modo Número'}
            </Button>
            <Button
              onClick={() => setShowAddPerimeterDialog(!showAddPerimeterDialog)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-3 w-3" />
              Crear Perímetro
            </Button>
          </div>
        </div>

        {showAddPerimeterDialog && (
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">¿Cuántos nodos?</Label>
                <Input
                  type="number"
                  min="3"
                  value={numNodesInput}
                  onChange={(e) => setNumNodesInput(e.target.value)}
                  placeholder="Mínimo 3 nodos"
                  className="h-9"
                />
                {numNodesInput && parseInt(numNodesInput) > 0 && (
                  <div className="bg-muted rounded p-2">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      Se creará: <span className="text-primary font-bold">
                        {contours.length === 0 ? "exterior" : `interior${contours.length}`}
                      </span> con {numNodesInput} nodos
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddPerimeter} size="sm" className="flex-1">
                  Crear
                </Button>
                <Button
                  onClick={() => {
                    setShowAddPerimeterDialog(false);
                    setNumNodesInput("");
                  }}
                  size="sm"
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {contours.map((contour) => {
            const contourNodes = vertices.filter(v => v.id.startsWith(contour.id + "_"));
            return (
              <div key={contour.id} className="space-y-2">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="space-y-1 flex-1">
                        <div className="font-bold text-sm">{contour.id}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {contourNodes.length} nodos · {contour.closed ? "Cerrado" : "Abierto"}
                        </div>
                      </div>
                      <Button
                        onClick={() => removeContour(contour.id)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* NODOS DEL PERÍMETRO */}
                    <div className="space-y-1.5">
                      {contourNodes.map((vertex) => {
                        const evaluatedX = typeof vertex.x === 'string' && vertex.x.includes('params')
                          ? evaluateExpression(vertex.x, params)
                          : vertex.x;
                        const evaluatedY = typeof vertex.y === 'string' && vertex.y.includes('params')
                          ? evaluateExpression(vertex.y, params)
                          : vertex.y;

                        return (
                          <div
                            key={vertex.id}
                            className="bg-muted/50 border rounded p-2 flex items-center gap-2"
                          >
                            <div className="bg-primary text-primary-foreground font-bold rounded px-2 py-0.5 text-[10px] min-w-[70px] text-center">
                              {vertex.id}
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div className="space-y-0.5">
                                <Label className="text-[9px] text-muted-foreground uppercase flex justify-between">
                                  <span>X (cm)</span>
                                  {editMode === 'expression' && typeof evaluatedX === 'number' && (
                                    <span className="text-emerald-500">= {evaluatedX.toFixed(1)}</span>
                                  )}
                                </Label>
                                <Input
                                  type={editMode === 'number' ? 'number' : 'text'}
                                  step="0.1"
                                  value={vertex.x}
                                  onChange={(e) => updateVertex(vertex.id, 'x', e.target.value)}
                                  className="h-7 text-xs font-mono"
                                  placeholder={editMode === 'number' ? '0' : 'params.valor'}
                                />
                              </div>
                              <div className="space-y-0.5">
                                <Label className="text-[9px] text-muted-foreground uppercase flex justify-between">
                                  <span>Y (cm)</span>
                                  {editMode === 'expression' && typeof evaluatedY === 'number' && (
                                    <span className="text-emerald-500">= {evaluatedY.toFixed(1)}</span>
                                  )}
                                </Label>
                                <Input
                                  type={editMode === 'number' ? 'number' : 'text'}
                                  step="0.1"
                                  value={vertex.y}
                                  onChange={(e) => updateVertex(vertex.id, 'y', e.target.value)}
                                  className="h-7 text-xs font-mono"
                                  placeholder={editMode === 'number' ? '0' : 'params.valor'}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
          {contours.length === 0 && (
            <div className="text-center text-muted-foreground text-xs py-8 border-2 border-dashed rounded-lg bg-muted/20">
              No hay perímetros. Crea uno para empezar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Panel de Parámetros Interactivo ---
interface ParamsPanelProps {
  params: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
}

function ParamsPanel({ params, onParamChange }: ParamsPanelProps) {
  return (
    <Card className="border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Parámetros Interactivos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {Object.entries(params).map(([key, value]) => {
          if (typeof value === 'number') {
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] uppercase font-bold text-zinc-400">{key}</Label>
                  <span className="text-xs font-mono text-primary">{value}</span>
                </div>
                <input
                  type="range"
                  min={value > 0 ? 0 : value * 2}
                  max={value > 0 ? value * 3 : 0}
                  step={0.1}
                  value={value}
                  onChange={(e) => onParamChange(key, parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={value}
                    onChange={(e) => onParamChange(key, parseFloat(e.target.value))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
            );
          } else if (typeof value === 'string' && key === 'color') {
            return (
              <div key={key} className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-zinc-400">{key}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => onParamChange(key, e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={value}
                    onChange={(e) => onParamChange(key, e.target.value)}
                    className="h-8 text-xs font-mono flex-1"
                  />
                </div>
              </div>
            );
          } else {
            return (
              <div key={key} className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-zinc-400">{key}</Label>
                <Input
                  type="text"
                  value={JSON.stringify(value)}
                  onChange={(e) => {
                    try {
                      onParamChange(key, JSON.parse(e.target.value));
                    } catch {
                      onParamChange(key, e.target.value);
                    }
                  }}
                  className="h-7 text-xs font-mono"
                />
              </div>
            );
          }
        })}
      </CardContent>
    </Card>
  );
}

export function TemplateEditor({ template, isSystemTemplate = false, onSaved, onCancel }: TemplateEditorProps) {
  const previewRef = useRef<any>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [jsonContent, setJsonContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [jsonParseError, setJsonParseError] = useState<string>("");
  const [show3DModal, setShow3DModal] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedLines, setSelectedLines] = useState<Array<{ from: string; to: string }>>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category);
      setDescription(template.description);
      const content = template.content;
      setJsonContent(JSON.stringify(content, null, 2));
      setPreviewData(content);

      // Cargar constraints y dimensions desde geometry
      if (content.geometry) {
        const validation = validateGeometryDefinition(content.geometry);
        setValidationErrors(validation.errors);
        setConstraints(content.geometry.constraints || []);
        setDimensions(content.geometry.dimensions || []);
      } else {
        setValidationErrors([]);
        setConstraints([]);
        setDimensions([]);
      }
      setJsonParseError("");
    } else {
      const defaultContent = {
        type: "svg_parametric",
        params: {
          grosor: 3,
          color: "#60a5fa"
        },
        geometry: {
          vertices: {},
          contours: [],
          constraints: [],
          dimensions: [],
          extrusion: {
            height: "params.grosor",
            bevel: true,
            bevelThickness: 0.3,
            bevelSize: 0.3,
            bevelSegments: 3
          }
        }
      };
      setName("");
      setCategory("General");
      setDescription("");
      setJsonContent(JSON.stringify(defaultContent, null, 2));
      setPreviewData(defaultContent);
      setValidationErrors([]);
      setJsonParseError("");
      setConstraints([]);
      setDimensions([]);
    }
  }, [template]);

  const handleJsonChange = (val: string) => {
    setJsonContent(val);

    try {
      const parsed = JSON.parse(val);
      setJsonParseError("");
      setPreviewData(parsed);

      // Validar geometría
      if (parsed.geometry) {
        const validation = validateGeometryDefinition(parsed.geometry);
        setValidationErrors(validation.errors);
      } else {
        setValidationErrors(["No hay geometría definida"]);
      }
    } catch (e) {
      setJsonParseError(e instanceof Error ? e.message : "JSON inválido");
      setValidationErrors([]);
    }
  };

  const handleGeometryChange = (newGeometry: any) => {
    const updated = {
      ...previewData,
      geometry: {
        ...newGeometry,
        constraints,
        dimensions
      },
    };
    setPreviewData(updated);
    setJsonContent(JSON.stringify(updated, null, 2));

    // Validar
    const validation = validateGeometryDefinition(newGeometry);
    setValidationErrors(validation.errors);
  };

  // ============================================================================
  // HANDLERS DE RESTRICCIONES
  // ============================================================================

  const handleAddConstraint = (constraint: Omit<Constraint, 'id'>) => {
    const newConstraint: Constraint = {
      ...constraint,
      id: nanoid()
    };
    const updatedConstraints = [...constraints, newConstraint];
    setConstraints(updatedConstraints);
    updateGeometryWithConstraintsAndDimensions(updatedConstraints, dimensions);
  };

  const handleToggleConstraint = (id: string) => {
    const updatedConstraints = constraints.map(c =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    setConstraints(updatedConstraints);
    updateGeometryWithConstraintsAndDimensions(updatedConstraints, dimensions);
  };

  const handleRemoveConstraint = (id: string) => {
    const updatedConstraints = constraints.filter(c => c.id !== id);
    setConstraints(updatedConstraints);
    updateGeometryWithConstraintsAndDimensions(updatedConstraints, dimensions);
    toast.success('Restricción eliminada');
  };

  // ============================================================================
  // HANDLERS DE DIMENSIONES
  // ============================================================================

  const handleAddDimension = (dimension: Omit<Dimension, 'id'>) => {
    const newDimension: Dimension = {
      ...dimension,
      id: nanoid()
    };
    const updatedDimensions = [...dimensions, newDimension];
    setDimensions(updatedDimensions);
    updateGeometryWithConstraintsAndDimensions(constraints, updatedDimensions);
  };

  const handleUpdateDimension = (id: string, value: number) => {
    const dimension = dimensions.find(d => d.id === id);
    if (!dimension) return;

    // Actualizar el valor de la dimensión
    const updatedDimensions = dimensions.map(d =>
      d.id === id ? { ...d, value } : d
    );
    setDimensions(updatedDimensions);

    // Aplicar la dimensión a la geometría
    if (!previewData?.geometry) return;

    const evaluatedVertices: Record<string, Vertex2D> = {};
    for (const [nodeId, vertex] of Object.entries(previewData.geometry.vertices || {})) {
      const v = vertex as any;
      evaluatedVertices[nodeId] = {
        x: evaluateExpression(v.x, previewData.params || {}),
        y: evaluateExpression(v.y, previewData.params || {})
      };
    }

    const result = constraintSolver.applyDimension(
      { ...dimension, value },
      value,
      evaluatedVertices,
      constraints
    );

    if (result.success && Object.keys(result.updates).length > 0) {
      const newVertices = { ...previewData.geometry.vertices };
      Object.entries(result.updates).forEach(([nodeId, pos]) => {
        newVertices[nodeId] = {
          x: Number(pos.x.toFixed(1)),
          y: Number(pos.y.toFixed(1))
        };
      });

      const newGeometry = {
        ...previewData.geometry,
        vertices: newVertices,
        constraints,
        dimensions: updatedDimensions
      };

      handleGeometryChange(newGeometry);
      toast.success('Dimensión aplicada');
    } else if (!result.success) {
      toast.error(result.reason || 'No se pudo aplicar la dimensión');
      updateGeometryWithConstraintsAndDimensions(constraints, updatedDimensions);
    } else {
      updateGeometryWithConstraintsAndDimensions(constraints, updatedDimensions);
    }
  };

  const handleRemoveDimension = (id: string) => {
    const updatedDimensions = dimensions.filter(d => d.id !== id);
    setDimensions(updatedDimensions);
    updateGeometryWithConstraintsAndDimensions(constraints, updatedDimensions);
    toast.success('Dimensión eliminada');
  };

  const handleToggleDimensionParameter = (id: string) => {
    const updatedDimensions = dimensions.map(d =>
      d.id === id ? { ...d, isParameter: !d.isParameter } : d
    );
    setDimensions(updatedDimensions);
    updateGeometryWithConstraintsAndDimensions(constraints, updatedDimensions);
  };

  // Utilidad para actualizar la geometría con constraints y dimensions
  const updateGeometryWithConstraintsAndDimensions = (
    updatedConstraints: Constraint[],
    updatedDimensions: Dimension[]
  ) => {
    if (!previewData?.geometry) return;

    const newGeometry = {
      ...previewData.geometry,
      constraints: updatedConstraints,
      dimensions: updatedDimensions
    };

    const updated = {
      ...previewData,
      geometry: newGeometry
    };

    setPreviewData(updated);
    setJsonContent(JSON.stringify(updated, null, 2));
  };

  const handleParamChange = (key: string, value: any) => {
    const updated = {
      ...previewData,
      params: {
        ...previewData.params,
        [key]: value,
      },
    };
    setPreviewData(updated);
    setJsonContent(JSON.stringify(updated, null, 2));
  };

  const handleTransform = (transformation: any) => {
    if (selectedNodes.length === 0 || !previewData?.geometry) return;

    const geometry = previewData.geometry;
    const newVertices = { ...geometry.vertices };
    const params = previewData.params || {};

    // Evaluar vértices seleccionados
    const selectedVertices = selectedNodes.map(id => {
      const v = newVertices[id];
      return {
        id,
        x: typeof v.x === 'string' ? evaluateExpression(v.x, params) : parseFloat(v.x),
        y: typeof v.y === 'string' ? evaluateExpression(v.y, params) : parseFloat(v.y),
      };
    });

    // Calcular centroide
    const centroidX = selectedVertices.reduce((sum, v) => sum + v.x, 0) / selectedVertices.length;
    const centroidY = selectedVertices.reduce((sum, v) => sum + v.y, 0) / selectedVertices.length;

    selectedNodes.forEach(id => {
      const vertex = selectedVertices.find(v => v.id === id);
      if (!vertex) return;

      let newX = vertex.x;
      let newY = vertex.y;

      switch (transformation.type) {
        case 'translate':
          newX += transformation.x;
          newY += transformation.y;
          break;

        case 'scale':
          newX = centroidX + (vertex.x - centroidX) * transformation.factor;
          newY = centroidY + (vertex.y - centroidY) * transformation.factor;
          break;

        case 'rotate':
          const angle = (transformation.angle * Math.PI) / 180;
          const dx = vertex.x - centroidX;
          const dy = vertex.y - centroidY;
          newX = centroidX + dx * Math.cos(angle) - dy * Math.sin(angle);
          newY = centroidY + dx * Math.sin(angle) + dy * Math.cos(angle);
          break;

        case 'flip':
          if (transformation.axis === 'x') {
            newY = centroidY - (vertex.y - centroidY);
          } else {
            newX = centroidX - (vertex.x - centroidX);
          }
          break;

        case 'align':
          if (transformation.axis === 'x') {
            newY = centroidY;
          } else {
            newX = centroidX;
          }
          break;

        case 'distribute':
          if (transformation.mode === 'circular') {
            const count = selectedNodes.length;
            const index = selectedNodes.indexOf(id);
            const angle = (index / count) * 2 * Math.PI;
            const radius = Math.sqrt(Math.pow(vertex.x - centroidX, 2) + Math.pow(vertex.y - centroidY, 2));
            newX = centroidX + radius * Math.cos(angle);
            newY = centroidY + radius * Math.sin(angle);
          } else if (transformation.mode === 'line') {
            const count = selectedNodes.length;
            const index = selectedNodes.indexOf(id);
            const minX = Math.min(...selectedVertices.map(v => v.x));
            const maxX = Math.max(...selectedVertices.map(v => v.x));
            newX = minX + (maxX - minX) * (index / (count - 1));
          }
          break;
      }

      newVertices[id] = {
        x: Number(newX.toFixed(1)),
        y: Number(newY.toFixed(1)),
      };
    });

    handleGeometryChange({ ...geometry, vertices: newVertices });
    toast.success('Transformación aplicada');
  };

  const handleCreateShape = (shape: any) => {
    if (!previewData?.geometry) return;

    const geometry = previewData.geometry;
    const contours = geometry.contours || [];
    const vertices = geometry.vertices || {};

    let newVertices: Record<string, any> = {};
    let newElements: any[] = [];
    let perimeterId = `shape_${contours.length + 1}`;

    switch (shape.type) {
      case 'polygon':
        const { sides, radius } = shape;
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * 2 * Math.PI - Math.PI / 2;
          const x = (radius * Math.cos(angle)).toFixed(1);
          const y = (radius * Math.sin(angle)).toFixed(1);
          const nodeId = `${perimeterId}_${i + 1}`;
          newVertices[nodeId] = { x, y };

          const nextIndex = (i + 1) % sides;
          const nextNodeId = `${perimeterId}_${nextIndex + 1}`;
          newElements.push({ type: 'line', from: nodeId, to: nextNodeId });
        }
        break;

      case 'rectangle':
        const { width, height } = shape;
        const halfW = width / 2;
        const halfH = height / 2;
        const rectPoints = [
          { x: -halfW, y: -halfH },
          { x: halfW, y: -halfH },
          { x: halfW, y: halfH },
          { x: -halfW, y: halfH },
        ];
        rectPoints.forEach((pt, i) => {
          const nodeId = `${perimeterId}_${i + 1}`;
          newVertices[nodeId] = { x: pt.x.toFixed(1), y: pt.y.toFixed(1) };
          const nextIndex = (i + 1) % 4;
          const nextNodeId = `${perimeterId}_${nextIndex + 1}`;
          newElements.push({ type: 'line', from: nodeId, to: nextNodeId });
        });
        break;

      case 'grid':
        // Grilla de nodos sin conectar
        const { rows, cols, spacing } = shape;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const nodeId = `${perimeterId}_${row}_${col}`;
            newVertices[nodeId] = {
              x: (col * spacing).toFixed(1),
              y: (row * spacing).toFixed(1),
            };
          }
        }
        break;
    }

    const newContour = {
      id: perimeterId,
      type: contours.length === 0 ? 'outer' : 'hole',
      closed: shape.type !== 'grid',
      elements: newElements,
    };

    const allVertices = { ...vertices, ...newVertices };
    const allContours = shape.type === 'grid' ? contours : [...contours, newContour];

    handleGeometryChange({ ...geometry, vertices: allVertices, contours: allContours });
    toast.success(`Forma "${perimeterId}" creada`);
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("El nombre es obligatorio");

    let parsedContent;
    try {
      parsedContent = JSON.parse(jsonContent);
    } catch (e) {
      return toast.error("JSON inválido");
    }

    setIsSaving(true);
    try {
      // CAPTURA AUTOMÁTICA DEL THUMBNAIL
      const thumb = previewRef.current?.capture();

      // Si es plantilla del sistema, SIEMPRE crear un nuevo ID (no modificar el original)
      const id = isSystemTemplate ? nanoid() : (template?.id || nanoid());

      const newTemplate: ITemplate = {
        id,
        name,
        category,
        description,
        thumbnail: thumb,
        content: parsedContent,
        createdAt: new Date(), // Nueva fecha de creación para copias del sistema
      };

      await db.templates.put(newTemplate);

      if (isSystemTemplate) {
        toast.success("Copia personalizada creada exitosamente");
      } else {
        toast.success("Plantilla y Miniatura guardadas");
      }

      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Code className="h-6 w-6 text-primary" />
            Editor de Plantillas
          </h2>
          {isSystemTemplate && (
            <p className="text-xs text-blue-500 mt-1">
              Editando plantilla del sistema - se creará una copia al guardar
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Camera className="h-4 w-4" />
            {isSaving ? "Guardando..." : isSystemTemplate ? "Guardar Copia" : "Guardar"}
          </Button>
        </div>
      </div>

      {/* INFO BÁSICA */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Nombre</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la plantilla" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Categoría</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ej. Dedos" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Descripción</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Instrucciones breves" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LAYOUT PRINCIPAL */}
      <div className="flex gap-4 h-[calc(100vh-12rem)]">

        {/* LADO IZQUIERDO: CANVAS (68%) */}
        <div className="w-[68%] flex flex-col">
          <Card className="border-primary/20 flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shapes className="h-5 w-5 text-primary" />
                  Editor Visual de Geometría
                </CardTitle>
                <Button
                  onClick={() => setShow3DModal(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Ver 3D
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-hidden">
              {previewData?.geometry && (
                <FabricGeometryEditor
                  geometry={previewData.geometry}
                  params={previewData.params || {}}
                  selectedNodes={selectedNodes}
                  selectedLines={selectedLines}
                  onSelectionChange={(nodes, lines) => {
                    setSelectedNodes(nodes);
                    setSelectedLines(lines);
                  }}
                  constraints={constraints}
                  dimensions={dimensions}
                  onNodeMove={(nodeId, x, y) => {
                    const newVertices = { ...previewData.geometry.vertices };
                    newVertices[nodeId] = { x, y };
                    handleGeometryChange({ ...previewData.geometry, vertices: newVertices });
                  }}
                  onNodeAdd={(perimeterId, afterNodeId, x, y) => {
                    const contour = previewData.geometry.contours.find((c: any) => c.id === perimeterId);
                    if (!contour) return;

                    const elementIndex = contour.elements.findIndex((e: any) => e.from === afterNodeId);
                    if (elementIndex === -1) return;

                    const element = contour.elements[elementIndex];
                    const existingNodes = Object.keys(previewData.geometry.vertices).filter(id => id.startsWith(perimeterId + "_"));
                    const nodeNumbers = existingNodes.map(id => {
                      const match = id.match(/_(\d+)$/);
                      return match ? parseInt(match[1]) : 0;
                    });
                    const nextNumber = Math.max(...nodeNumbers, 0) + 1;
                    const newNodeId = `${perimeterId}_${nextNumber}`;

                    const newVertices = { ...previewData.geometry.vertices, [newNodeId]: { x, y } };
                    const newElements = [...contour.elements];
                    newElements.splice(elementIndex, 1,
                      { type: "line", from: element.from, to: newNodeId },
                      { type: "line", from: newNodeId, to: element.to }
                    );

                    const newContours = previewData.geometry.contours.map((c: any) =>
                      c.id === perimeterId ? { ...c, elements: newElements } : c
                    );

                    handleGeometryChange({ ...previewData.geometry, vertices: newVertices, contours: newContours });
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* LADO DERECHO: PANEL DE HERRAMIENTAS (32%) */}
        <div className="w-[32%] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* RESTRICCIONES */}
            <ConstraintsPanel
              constraints={constraints}
              selectedNodes={selectedNodes}
              vertices={
                previewData?.geometry?.vertices
                  ? Object.fromEntries(
                      Object.entries(previewData.geometry.vertices).map(([id, v]: [string, any]) => [
                        id,
                        {
                          x: evaluateExpression(v.x, previewData.params || {}),
                          y: evaluateExpression(v.y, previewData.params || {})
                        }
                      ])
                    )
                  : {}
              }
              onAddConstraint={handleAddConstraint}
              onToggleConstraint={handleToggleConstraint}
              onRemoveConstraint={handleRemoveConstraint}
            />

            {/* DIMENSIONES */}
            <DimensionsPanel
              dimensions={dimensions}
              selectedNodes={selectedNodes}
              selectedLines={selectedLines}
              vertices={
                previewData?.geometry?.vertices
                  ? Object.fromEntries(
                      Object.entries(previewData.geometry.vertices).map(([id, v]: [string, any]) => [
                        id,
                        {
                          x: evaluateExpression(v.x, previewData.params || {}),
                          y: evaluateExpression(v.y, previewData.params || {})
                        }
                      ])
                    )
                  : {}
              }
              onAddDimension={handleAddDimension}
              onUpdateDimension={handleUpdateDimension}
              onRemoveDimension={handleRemoveDimension}
              onToggleDimensionParameter={handleToggleDimensionParameter}
            />

            {/* TRANSFORMACIONES PARAMÉTRICAS */}
            <TransformationPanel
              selectedNodes={selectedNodes}
              vertices={previewData?.geometry?.vertices || {}}
              onTransform={handleTransform}
              onClearSelection={() => setSelectedNodes([])}
            />

            {/* HERRAMIENTAS GEOMÉTRICAS */}
            <GeometryTools onCreateShape={handleCreateShape} />

            {/* PARÁMETROS INTERACTIVOS */}
            {previewData?.params && (
              <ParamsPanel
                params={previewData.params}
                onParamChange={handleParamChange}
              />
            )}

            {/* EDITOR VISUAL DE GEOMETRÍA */}
            {previewData?.geometry && (
              <VisualGeometryEditor
                geometry={previewData.geometry}
                params={previewData.params || {}}
                onChange={handleGeometryChange}
              />
            )}

            {/* EDITOR JSON - PLEGABLE */}
            <details className="group">
              <summary className="cursor-pointer list-none">
                <Card className="border-zinc-700 hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Editor JSON (Avanzado)</span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-muted-foreground" />
                  </CardContent>
                </Card>
              </summary>
              <Card className="mt-2 border-zinc-800">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs uppercase font-bold text-primary">JSON</Label>
                    <div className="flex gap-2 items-center">
                      {jsonParseError ? (
                        <Badge variant="destructive" className="text-[9px] gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Error
                        </Badge>
                      ) : validationErrors.length > 0 ? (
                        <Badge variant="destructive" className="text-[9px] gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.length} Errores
                        </Badge>
                      ) : jsonContent && !jsonParseError ? (
                        <Badge variant="default" className="text-[9px] gap-1 bg-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Válido
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <Textarea
                    value={jsonContent}
                    onChange={e => handleJsonChange(e.target.value)}
                    rows={12}
                    className="font-mono text-[11px] bg-zinc-950 text-emerald-400 p-3 rounded border-zinc-800"
                  />
                  {jsonParseError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded p-2 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-bold text-red-400">Error JSON</p>
                        <p className="text-red-300 font-mono text-[10px]">{jsonParseError}</p>
                      </div>
                    </div>
                  )}
                  {!jsonParseError && validationErrors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div className="text-xs flex-1">
                          <p className="font-bold text-red-400">Errores de Geometría</p>
                          <ul className="text-red-300 space-y-0.5 text-[10px]">
                            {validationErrors.map((error, i) => (
                              <li key={i} className="font-mono">• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </details>
          </div>
        </div>

      </div>

      {/* MODAL 3D */}
      {show3DModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-lg shadow-2xl w-[90vw] h-[90vh] max-w-6xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-bold">Vista Previa 3D</h3>
              <Button
                onClick={() => setShow3DModal(false)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 p-4">
              <LivePreview ref={previewRef} data={previewData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
