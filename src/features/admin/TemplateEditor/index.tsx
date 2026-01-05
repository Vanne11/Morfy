import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db, type ITemplate } from "@/app/db";
import { Code, Camera, Shapes, ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { validateGeometryDefinition } from "@/utils/svgToThree";
import { evaluateExpression } from "@/utils/paramEvaluator";
import {
  type Constraint,
  type Dimension,
  constraintSolver,
  type Vertex2D
} from "@/utils/constraintSolver";

import type { TemplateEditorProps } from "./types";
import { LivePreview } from "./LivePreview";
import { TransformationPanel } from "./TransformationPanel";
import { GeometryTools } from "./GeometryTools";
import { ConstraintsPanel } from "./ConstraintsPanel";
import { DimensionsPanel } from "./DimensionsPanel";
import { FabricGeometryEditor } from "./FabricGeometryEditor";
import { VisualGeometryEditor } from "./VisualGeometryEditor";
import { ParamsPanel } from "./ParamsPanel";
import { ToolsPanel, type ToolType } from "./ToolsPanel";

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
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [drawingMode, setDrawingMode] = useState<'new' | 'add_external' | 'add_hole' | null>(null);
  const [showModeSelectionModal, setShowModeSelectionModal] = useState(false);

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

  const handleToolChange = (tool: ToolType) => {
    if (tool === 'select') {
      setActiveTool('select');
      setDrawingMode(null);
      return;
    }

    if (tool === 'node') {
      const hasGeometry = previewData?.geometry?.contours && previewData.geometry.contours.length > 0;
      
      if (hasGeometry) {
        setShowModeSelectionModal(true);
      } else {
        setActiveTool('node');
        setDrawingMode('new');
        toast.info("Modo dibujo: Haz clic para añadir nodos. Enter para cerrar forma.");
      }
      return; // Importante: Salir para no procesar como restricción
    }

    // Si es una herramienta de restricción, simplemente activarla
    setActiveTool(tool);
    setDrawingMode(null);
  };

  // EFFECT: Manejar aplicación automática de restricciones cuando la herramienta está activa
  useEffect(() => {
    if (activeTool === 'select' || activeTool === 'node') return;

    if (activeTool === 'constraint_fixed' && selectedNodes.length >= 1) {
      selectedNodes.forEach(nodeId => {
        handleAddConstraint({ type: 'fixed', nodes: [nodeId], enabled: true });
      });
      toast.success(`${selectedNodes.length} nodo(s) fijado(s)`);
      setActiveTool('select');
      setSelectedNodes([]);
    }
    else if ((activeTool === 'constraint_horizontal' || activeTool === 'constraint_vertical') && selectedNodes.length >= 2) {
      const type = activeTool === 'constraint_horizontal' ? 'horizontal' : 'vertical';
      handleAddConstraint({ type, nodes: [...selectedNodes], enabled: true });
      toast.success(`Restricción ${type === 'horizontal' ? 'Horizontal' : 'Vertical'} añadida`);
      setActiveTool('select');
      setSelectedNodes([]);
    }
    else if (activeTool === 'constraint_distance' && selectedNodes.length === 2) {
      if (!previewData?.geometry?.vertices) return;
      
      const [nodeA, nodeB] = selectedNodes;
      const params = previewData.params || {};
      
      // Evaluar posiciones actuales
      const vA = previewData.geometry.vertices[nodeA];
      const vB = previewData.geometry.vertices[nodeB];
      
      if (vA && vB) {
        const posA = {
          x: typeof vA.x === 'string' ? evaluateExpression(vA.x, params) : vA.x,
          y: typeof vA.y === 'string' ? evaluateExpression(vA.y, params) : vA.y
        };
        const posB = {
          x: typeof vB.x === 'string' ? evaluateExpression(vB.x, params) : vB.x,
          y: typeof vB.y === 'string' ? evaluateExpression(vB.y, params) : vB.y
        };

        const dist = Math.sqrt(Math.pow(posB.x - posA.x, 2) + Math.pow(posB.y - posA.y, 2));
        
        handleAddConstraint({
          type: 'distance',
          nodes: [nodeA, nodeB],
          value: Number(dist.toFixed(1)),
          enabled: true
        });
        toast.success(`Restricción de distancia: ${dist.toFixed(1)}cm`);
        setActiveTool('select');
        setSelectedNodes([]);
      }
    }
  }, [selectedNodes, activeTool]);

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

  const handleInvertAngle = (id: string) => {
    const dimension = dimensions.find(d => d.id === id);
    if (!dimension || dimension.type !== 'angular') return;

    const currentValue = typeof dimension.value === 'number' ? dimension.value : 0;
    const newValue = 360 - currentValue;
    const newInverted = !dimension.inverted;

    const updatedDimensions = dimensions.map(d =>
      d.id === id ? { ...d, value: newValue, inverted: newInverted } : d
    );
    setDimensions(updatedDimensions);
    updateGeometryWithConstraintsAndDimensions(constraints, updatedDimensions);
    toast.success(`Ángulo invertido: ${newValue.toFixed(1)}°`);
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
    const pIndex = contours.length + 1;
    let perimeterId = `p${pIndex}`;

    switch (shape.type) {
      case 'polygon':
        const { sides, radius } = shape;
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * 2 * Math.PI - Math.PI / 2;
          const x = (radius * Math.cos(angle)).toFixed(1);
          const y = (radius * Math.sin(angle)).toFixed(1);
          const nodeId = `${perimeterId}n${i + 1}`;
          newVertices[nodeId] = { x, y };

          const nextIndex = (i + 1) % sides;
          const nextNodeId = `${perimeterId}n${nextIndex + 1}`;
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
          const nodeId = `${perimeterId}n${i + 1}`;
          newVertices[nodeId] = { x: pt.x.toFixed(1), y: pt.y.toFixed(1) };
          const nextIndex = (i + 1) % 4;
          const nextNodeId = `${perimeterId}n${nextIndex + 1}`;
          newElements.push({ type: 'line', from: nodeId, to: nextNodeId });
        });
        break;

      case 'custom_poly':
        // Forma personalizada (dibujo libre)
        newVertices = shape.vertices;
        newElements = shape.elements;
        // Extraer ID del perímetro del primer nodo (ej: p1n1 -> p1)
        const firstNodeId = Object.keys(shape.vertices)[0];
        if (firstNodeId) {
          const nIndex = firstNodeId.indexOf('n');
          if (nIndex > 0) {
            perimeterId = firstNodeId.substring(0, nIndex);
          }
        }
        break;
    }

    const newContour = {
      id: perimeterId,
      type: shape.isHole ? 'hole' : (contours.length === 0 ? 'outer' : 'hole'),
      closed: true,
      elements: newElements,
    };

    const allVertices = { ...vertices, ...newVertices };
    const allContours = [...contours, newContour];

    handleGeometryChange({ ...geometry, vertices: allVertices, contours: allContours });
    
    // Resetear herramienta si fue un dibujo manual
    if (shape.type === 'custom_poly') {
      setActiveTool('select');
      setDrawingMode(null);
      toast.success(`Forma creada exitosamente`);
    } else {
      toast.success(`Forma "${perimeterId}" creada`);
    }
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
          <p className="text-xs text-muted-foreground mt-1 ml-8">
            Grid: 1cm x 1cm
          </p>
          {isSystemTemplate && (
            <p className="text-xs text-blue-500 mt-1 ml-8">
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
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shapes className="h-5 w-5 text-primary" />
                    Editor Visual de Geometría
                  </CardTitle>
                  <div className="text-[10px] text-muted-foreground flex gap-3 ml-7">
                    <span>• Selecciona nodos para transformar</span>
                    <span className="hidden xl:inline">• Ctrl+Click: selección múltiple</span>
                    <span className="hidden xl:inline">• Doble-click en línea: agregar nodo</span>
                  </div>
                </div>
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
                  activeTool={activeTool}
                  drawingMode={drawingMode}
                  onShapeCreate={handleCreateShape}
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
                    const existingNodes = Object.keys(previewData.geometry.vertices).filter(id => id.startsWith(perimeterId + "n"));
                    const nodeNumbers = existingNodes.map(id => {
                      const match = id.match(/n(\d+)$/);
                      return match ? parseInt(match[1]) : 0;
                    });
                    const nextNumber = Math.max(...nodeNumbers, 0) + 1;
                    const newNodeId = `${perimeterId}n${nextNumber}`;

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
        <div className="w-[32%] flex flex-col overflow-hidden gap-4">
          
                      {/* ZONA FIJA: HERRAMIENTAS */}
                    <div className="flex-none space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
                        Herramientas
                      </Label>
                      <ToolsPanel 
                        activeTool={activeTool} 
                        onToolChange={handleToolChange} 
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
                      />
                    </div>
          
                    {/* ZONA SCROLLABLE: PROPIEDADES Y PANELES */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      {/* RESTRICCIONES */}
                      <ConstraintsPanel
                        constraints={constraints}
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
              onInvertAngle={handleInvertAngle}
            />

            {/* TRANSFORMACIONES PARAMÉTRICAS */}
            <TransformationPanel
              selectedNodes={selectedNodes}
              vertices={previewData?.geometry?.vertices || {}}
              onTransform={handleTransform}
              onClearSelection={() => setSelectedNodes([])}
            />

            {/* HERRAMIENTAS GEOMÉTRICAS (FORMAS PREDEFINIDAS) */}
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
      {/* MODAL DE SELECCIÓN DE MODO DE DIBUJO */}
      <Dialog open={showModeSelectionModal} onOpenChange={setShowModeSelectionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modo de Dibujo</DialogTitle>
            <DialogDescription>
              Ya existe una geometría. ¿Cómo deseas proceder?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => {
                setActiveTool('node');
                setDrawingMode('add_external');
                setShowModeSelectionModal(false);
                toast.info("Modo edición: Haz clic cerca de una línea para insertar un nodo.");
              }}
              variant="default"
              className="justify-start"
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-bold">Añadir a Perímetro Externo</span>
                <span className="text-xs font-normal opacity-90">Insertar nodos en el contorno existente</span>
              </div>
            </Button>
            <Button
              onClick={() => {
                setActiveTool('node');
                setDrawingMode('add_hole');
                setShowModeSelectionModal(false);
                toast.info("Modo hueco: Dibuja un polígono interno.");
              }}
              variant="outline"
              className="justify-start"
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-bold">Crear Perímetro Interno</span>
                <span className="text-xs font-normal opacity-70 text-muted-foreground">Dibujar un hueco dentro de la forma</span>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowModeSelectionModal(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
