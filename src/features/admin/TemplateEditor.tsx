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
import { Info, Code, Camera, Plus, Trash2, AlertCircle, CheckCircle2, Shapes, ChevronDown, Copy, HelpCircle } from "lucide-react";
import { SVGParametricModel } from "@/features/viewer/components/SVGParametricModel";
import { validateGeometryDefinition, generateSVGPreview } from "@/utils/svgToThree";
import { evaluateExpression } from "@/utils/paramEvaluator";
import { fabric } from "fabric";

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

// --- Calculadora de Expresiones ---
function ExpressionCalculator({ params }: { params: Record<string, any> }) {
  const [expression, setExpression] = useState("params.longitud * 0.5");
  const [result, setResult] = useState<number | string>("");

  const handleCalculate = () => {
    try {
      const evaluated = evaluateExpression(expression, params);
      setResult(evaluated);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Error");
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Prueba expresiones con los parámetros actuales del template
      </div>
      <div className="space-y-2">
        <Input
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="params.longitud * 0.5"
          className="font-mono text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCalculate();
            }
          }}
        />
        <Button
          onClick={handleCalculate}
          size="sm"
          variant="secondary"
          className="w-full text-xs"
        >
          Calcular
        </Button>
        {result !== "" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Resultado</div>
            <div className="font-mono text-sm text-emerald-400">
              {typeof result === "number" ? result.toFixed(2) : result}
            </div>
          </div>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground space-y-1">
        <div className="font-bold">Parámetros disponibles:</div>
        <div className="bg-zinc-950 p-2 rounded font-mono text-zinc-400">
          {Object.entries(params).map(([key, value]) => (
            <div key={key}>
              params.{key} = {typeof value === "number" ? value : JSON.stringify(value)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Editor Interactivo Fabric.js ---
interface FabricEditorProps {
  geometry: any;
  params: Record<string, any>;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeAdd: (perimeterId: string, afterNodeId: string, x: number, y: number) => void;
}

function FabricGeometryEditor({ geometry, params, onNodeMove, onNodeAdd }: FabricEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const nodeCircles = useRef<Map<string, fabric.Circle>>(new Map());

  useEffect(() => {
    if (!canvasRef.current) return;

    // Inicializar Fabric canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 600,
      height: 600,
      backgroundColor: '#ffffff',
    });

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
    const padding = 50;
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

        const line = new fabric.Line(
          [
            toCanvasX(fromVertex.x),
            toCanvasY(fromVertex.y),
            toCanvasX(toVertex.x),
            toCanvasY(toVertex.y),
          ],
          {
            stroke: strokeColor,
            strokeWidth: 2,
            selectable: true,
            hoverCursor: 'pointer',
            data: {
              type: 'edge',
              contourId: contour.id,
              fromNode: element.from,
              toNode: element.to,
            },
          }
        );

        // Evento para agregar nodo en el medio
        line.on('mousedown', (e) => {
          if (e.e.ctrlKey || e.e.metaKey) {
            const midX = fromCanvasX((line.x1! + line.x2!) / 2);
            const midY = fromCanvasY((line.y1! + line.y2!) / 2);
            onNodeAdd(contour.id, element.from, midX, midY);
            toast.success('Nodo agregado. Ctrl+Click en línea para agregar más');
          }
        });

        canvas.add(line);
      }
    }

    // Dibujar nodos (círculos)
    for (const [id, vertex] of Object.entries(evaluatedVertices)) {
      const cx = toCanvasX(vertex.x);
      const cy = toCanvasY(vertex.y);

      const circle = new fabric.Circle({
        left: cx,
        top: cy,
        radius: 6,
        fill: '#10b981',
        stroke: '#ffffff',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        hasControls: false,
        hasBorders: false,
        lockScalingX: true,
        lockScalingY: true,
        hoverCursor: 'move',
        data: { type: 'node', id },
      });

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

      circle.on('moving', (e) => {
        const newX = fromCanvasX(circle.left!);
        const newY = fromCanvasY(circle.top!);
        onNodeMove(id, Number(newX.toFixed(1)), Number(newY.toFixed(1)));

        // Mover el texto junto al círculo
        text.set({
          left: circle.left! + 10,
          top: circle.top! - 10,
        });

        // Actualizar líneas conectadas
        canvas.getObjects('line').forEach((obj) => {
          const line = obj as fabric.Line;
          const data = line.data as any;
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

      nodeCircles.current.set(id, circle);
      canvas.add(circle);
      canvas.add(text);
    }

    canvas.renderAll();
  }, [geometry, params, onNodeMove, onNodeAdd]);

  return (
    <div className="space-y-2">
      <div className="bg-white rounded border border-zinc-300 p-4 flex items-center justify-center">
        <canvas ref={canvasRef} />
      </div>
      <div className="text-[10px] text-muted-foreground">
        Arrastra nodos para moverlos · Ctrl+Click en línea para agregar nodo
      </div>
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

  const handleNodeMove = (nodeId: string, x: number, y: number) => {
    const newVertices = vertices.map(v =>
      v.id === nodeId ? { ...v, x, y } : v
    );
    setVertices(newVertices);
    updateGeometry(newVertices, contours);
  };

  const handleNodeAdd = (perimeterId: string, afterNodeId: string, x: number, y: number) => {
    // Encontrar el contorno
    const contour = contours.find(c => c.id === perimeterId);
    if (!contour) return;

    // Encontrar el índice del elemento que va desde afterNodeId
    const elementIndex = contour.elements.findIndex((e: any) => e.from === afterNodeId);
    if (elementIndex === -1) return;

    const element = contour.elements[elementIndex];

    // Generar ID para el nuevo nodo
    const existingNodes = vertices.filter(v => v.id.startsWith(perimeterId + "_"));
    const nodeNumbers = existingNodes.map(v => {
      const match = v.id.match(/_(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextNumber = Math.max(...nodeNumbers, 0) + 1;
    const newNodeId = `${perimeterId}_${nextNumber}`;

    // Crear el nuevo nodo
    const newNode: Vertex = { id: newNodeId, x, y };

    // Insertar el nodo en la lista de vértices
    const newVertices = [...vertices, newNode];

    // Modificar el contorno: dividir el elemento en dos
    const newElements = [...contour.elements];
    newElements.splice(elementIndex, 1,
      { type: "line", from: element.from, to: newNodeId },
      { type: "line", from: newNodeId, to: element.to }
    );

    const newContours = contours.map(c =>
      c.id === perimeterId ? { ...c, elements: newElements } : c
    );

    setVertices(newVertices);
    setContours(newContours);
    updateGeometry(newVertices, newContours);
  };

  return (
    <div className="space-y-6">
      {/* VISOR INTERACTIVO */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-primary">Visor Interactivo</Label>
        <FabricGeometryEditor
          geometry={geometry}
          params={params}
          onNodeMove={handleNodeMove}
          onNodeAdd={handleNodeAdd}
        />
      </div>

      {/* SECCIÓN PERÍMETROS */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <Label className="text-sm font-bold text-primary">Perímetros</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Conecta nodos para formar contornos cerrados
            </p>
          </div>
          <Button
            onClick={() => setShowAddPerimeterDialog(!showAddPerimeterDialog)}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-3 w-3" />
            Crear Perímetro
          </Button>
        </div>

        {showAddPerimeterDialog && (
          <Card className="bg-blue-500/10 border-blue-500/30 animate-in slide-in-from-top-2 duration-200">
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
                  <div className="bg-zinc-900 rounded p-2">
                    <p className="text-[10px] text-zinc-400 mb-1">
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
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="space-y-1 flex-1">
                      <div className="font-bold text-sm text-emerald-400">{contour.id}</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        {contourNodes.length} nodos · {contour.closed ? "Cerrado" : "Abierto"}
                      </div>
                    </div>
                    <Button
                      onClick={() => removeContour(contour.id)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* NODOS DEL PERÍMETRO */}
                  <div className="space-y-1.5">
                    {contourNodes.map((vertex) => (
                      <div
                        key={vertex.id}
                        className="bg-zinc-800/50 border border-zinc-700 rounded p-2 flex items-center gap-2"
                      >
                        <div className="bg-emerald-600 text-white font-bold rounded px-2 py-0.5 text-[10px] min-w-[70px] text-center">
                          {vertex.id}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <Label className="text-[9px] text-zinc-400 uppercase">X (cm)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={vertex.x}
                              onChange={(e) => updateVertex(vertex.id, 'x', e.target.value)}
                              className="h-7 text-xs font-mono"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-[9px] text-zinc-400 uppercase">Y (cm)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={vertex.y}
                              onChange={(e) => updateVertex(vertex.id, 'y', e.target.value)}
                              className="h-7 text-xs font-mono"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {contours.length === 0 && (
            <div className="text-center text-zinc-500 text-xs py-8 border-2 border-dashed border-zinc-800 rounded-lg bg-zinc-950/50">
              No hay perímetros. Crea uno para empezar.
            </div>
          )}
        </div>
      </div>
    </div>
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

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category);
      setDescription(template.description);
      const content = template.content;
      setJsonContent(JSON.stringify(content, null, 2));
      setPreviewData(content);

      // Validar geometría
      if (content.geometry) {
        const validation = validateGeometryDefinition(content.geometry);
        setValidationErrors(validation.errors);
      } else {
        setValidationErrors([]);
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
      geometry: newGeometry,
    };
    setPreviewData(updated);
    setJsonContent(JSON.stringify(updated, null, 2));

    // Validar
    const validation = validateGeometryDefinition(newGeometry);
    setValidationErrors(validation.errors);
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* LADO IZQUIERDO: EDITOR VISUAL */}
        <div className="space-y-4">
          {/* EDITOR VISUAL DE GEOMETRÍA */}
          <Card className="border-primary/20">
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
            <CardContent className="p-4">
              {previewData?.geometry && (
                <VisualGeometryEditor
                  geometry={previewData.geometry}
                  params={previewData.params || {}}
                  onChange={handleGeometryChange}
                />
              )}
            </CardContent>
          </Card>

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

        {/* LADO DERECHO: INFO */}
        <div className="space-y-4">
          <div className="sticky top-4">
            {!validationErrors.length && (
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Info className="h-4 w-4" />
                    Controles
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-500 text-white rounded px-1.5 py-0.5 text-[10px] font-bold">DRAG</div>
                    <p>Arrastra cualquier nodo verde para moverlo</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-500 text-white rounded px-1.5 py-0.5 text-[10px] font-bold">CTRL+CLICK</div>
                    <p>Haz Ctrl+Click en una línea para agregar un nodo en el medio</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-500 text-white rounded px-1.5 py-0.5 text-[10px] font-bold">INPUTS</div>
                    <p>Usa las flechitas ↑↓ en los campos X/Y para ajustes precisos</p>
                  </div>
                </CardContent>
              </Card>
            )}
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
