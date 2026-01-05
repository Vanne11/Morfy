import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog,
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
import { Code, Camera, Shapes, AlertCircle, CheckCircle2, BoxSelect, SlidersHorizontal, Lock, Ruler } from "lucide-react";
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
  const [paramCreationDialog, setParamCreationDialog] = useState<{ open: boolean; dimensionId: string | null; initialValue: number }>({
    open: false,
    dimensionId: null,
    initialValue: 0
  });
  const [newParamName, setNewParamName] = useState("");

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
        constraints,
        dimensions,
        ...newGeometry,
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

  // GLOBAL KEYBOARD HANDLER (ESCAPE)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTool !== 'select') {
          setActiveTool('select');
          setDrawingMode(null);
          toast.info("Herramienta cancelada. Modo Selección activo.");
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeTool]);

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
    else if (activeTool === 'dimension_linear' && selectedNodes.length === 2) {
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
        
        handleAddDimension({
          type: 'linear',
          value: Number(dist.toFixed(1)),
          elements: { nodes: [nodeA, nodeB] },
          isParameter: false
        });
        toast.success(`Dimensión Lineal: ${dist.toFixed(1)}cm`);
        setActiveTool('select');
        setSelectedNodes([]);
      }
    }
    else if (activeTool === 'dimension_angular' && selectedLines.length === 2) {
      if (!previewData?.geometry?.vertices) return;

      const [l1, l2] = selectedLines;
      const params = previewData.params || {};

      const v1a = previewData.geometry.vertices[l1.from];
      const v1b = previewData.geometry.vertices[l1.to];
      const v2a = previewData.geometry.vertices[l2.from];
      const v2b = previewData.geometry.vertices[l2.to];

      if (v1a && v1b && v2a && v2b) {
        const p1a = { x: typeof v1a.x === 'string' ? evaluateExpression(v1a.x, params) : v1a.x, y: typeof v1a.y === 'string' ? evaluateExpression(v1a.y, params) : v1a.y };
        const p1b = { x: typeof v1b.x === 'string' ? evaluateExpression(v1b.x, params) : v1b.x, y: typeof v1b.y === 'string' ? evaluateExpression(v1b.y, params) : v1b.y };
        const p2a = { x: typeof v2a.x === 'string' ? evaluateExpression(v2a.x, params) : v2a.x, y: typeof v2a.y === 'string' ? evaluateExpression(v2a.y, params) : v2a.y };
        const p2b = { x: typeof v2b.x === 'string' ? evaluateExpression(v2b.x, params) : v2b.x, y: typeof v2b.y === 'string' ? evaluateExpression(v2b.y, params) : v2b.y };

        // Encontrar vértice común (pivote) entre las dos líneas
        let pivot: { x: number; y: number } | null = null;
        let other1: { x: number; y: number } | null = null;
        let other2: { x: number; y: number } | null = null;

        if (l1.from === l2.from) {
          pivot = p1a;
          other1 = p1b;
          other2 = p2b;
        } else if (l1.from === l2.to) {
          pivot = p1a;
          other1 = p1b;
          other2 = p2a;
        } else if (l1.to === l2.from) {
          pivot = p1b;
          other1 = p1a;
          other2 = p2b;
        } else if (l1.to === l2.to) {
          pivot = p1b;
          other1 = p1a;
          other2 = p2a;
        }

        if (!pivot || !other1 || !other2) {
          toast.error('Las líneas deben compartir un vértice común');
          setActiveTool('select');
          setSelectedLines([]);
          return;
        }

        // Calcular vectores desde el pivote hacia los otros extremos
        const v1 = { x: other1.x - pivot.x, y: other1.y - pivot.y };
        const v2 = { x: other2.x - pivot.x, y: other2.y - pivot.y };

        // Magnitudes
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

        if (mag1 === 0 || mag2 === 0) {
          toast.error('Las líneas tienen longitud cero');
          setActiveTool('select');
          setSelectedLines([]);
          return;
        }

        // Producto punto para calcular el ángulo
        const dot = v1.x * v2.x + v1.y * v2.y;
        const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));

        // Ángulo en grados (siempre entre 0 y 180)
        const angleDegrees = Math.acos(cosTheta) * 180 / Math.PI;

        handleAddDimension({
          type: 'angular',
          value: Number(angleDegrees.toFixed(1)),
          elements: { lines: [l1, l2] },
          isParameter: false,
          inverted: false
        });
        toast.success(`Dimensión Angular: ${angleDegrees.toFixed(1)}° (usa el botón de invertir para el ángulo externo)`);
        setActiveTool('select');
        setSelectedLines([]);
      }
    }
  }, [selectedNodes, selectedLines, activeTool]);

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
    const dimension = dimensions.find(d => d.id === id);
    if (!dimension) return;

    if (dimension.isParameter) {
      // TURN OFF
      if (dimension.label && previewData.params && dimension.label in previewData.params) {
        const newParams = { ...previewData.params };
        delete newParams[dimension.label];
        
        // Restore dimension value to number
        const numericValue = constraintSolver.calculateDimensionValue(
          dimension, 
          Object.fromEntries(
            Object.entries(previewData.geometry.vertices).map(([vid, v]: [string, any]) => [
              vid,
              {
                x: evaluateExpression(v.x, previewData.params),
                y: evaluateExpression(v.y, previewData.params)
              }
            ])
          )
        );

        const updated = {
          ...previewData,
          params: newParams,
          geometry: {
            ...previewData.geometry,
            dimensions: dimensions.map(d => d.id === id ? { ...d, isParameter: false, value: Number(numericValue.toFixed(1)), label: undefined } : d)
          }
        };
        
        setDimensions(updated.geometry.dimensions);
        setPreviewData(updated);
        setJsonContent(JSON.stringify(updated, null, 2));
      } else {
          const updatedDimensions = dimensions.map(d =>
            d.id === id ? { ...d, isParameter: false } : d
          );
          setDimensions(updatedDimensions);
          updateGeometryWithConstraintsAndDimensions(constraints, updatedDimensions);
      }
    } else {
      // TURN ON
      const currentValue = typeof dimension.value === 'number' ? dimension.value : 0;
      setNewParamName("");
      setParamCreationDialog({ open: true, dimensionId: id, initialValue: Number(currentValue) });
    }
  };

  const handleConfirmParamCreation = () => {
    if (!newParamName.trim()) return toast.error("El nombre es obligatorio");
    if (!paramCreationDialog.dimensionId) return;
    
    if (previewData.params && newParamName in previewData.params) {
       return toast.error("Ya existe un parámetro con ese nombre");
    }

    const dimension = dimensions.find(d => d.id === paramCreationDialog.dimensionId);
    if (!dimension) return;

    const numericValue = paramCreationDialog.initialValue;

    const newParams = {
        ...previewData.params,
        [newParamName]: numericValue
    };

    const updatedDimensions = dimensions.map(d => 
        d.id === paramCreationDialog.dimensionId 
        ? { ...d, isParameter: true, label: newParamName, value: `params.${newParamName}` }
        : d
    );

    const updated = {
        ...previewData,
        params: newParams,
        geometry: {
            ...previewData.geometry,
            dimensions: updatedDimensions
        }
    };

    setDimensions(updatedDimensions);
    setPreviewData(updated);
    setJsonContent(JSON.stringify(updated, null, 2));
    
    setParamCreationDialog({ open: false, dimensionId: null, initialValue: 0 });
    setNewParamName("");
    toast.success(`Parámetro "${newParamName}" creado`);
  };

  const handleInvertAngle = (id: string) => {
    const dimension = dimensions.find(d => d.id === id);
    if (!dimension || dimension.type !== 'angular') return;

    // Solo cambiar el flag inverted, sin modificar el valor
    // El valor representa el ángulo interno (0-180°)
    // El flag inverted indica si queremos controlar el ángulo externo (reflex)
    const newInverted = !dimension.inverted;

    const updatedDimensions = dimensions.map(d =>
      d.id === id ? { ...d, inverted: newInverted } : d
    );
    setDimensions(updatedDimensions);
    updateGeometryWithConstraintsAndDimensions(constraints, updatedDimensions);

    const displayValue = typeof dimension.value === 'number' ? dimension.value : 0;
    const newDisplayValue = newInverted ? (360 - displayValue) : displayValue;
    toast.success(`Ángulo ${newInverted ? 'externo' : 'interno'}: ${newDisplayValue.toFixed(1)}°`);
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
      case 'circle_primitive':
        const { center, radiusPoint, radius } = shape;
        const cIndex = (geometry.circles?.length || 0) + 1;
        const circleId = `c${cIndex}`;
        perimeterId = circleId; // Override for ID generation
        
        // Define IDs for nodes
        const centerId = `${circleId}_center`;
        const radiusId = `${circleId}_radius`;
        
        // Add vertices
        newVertices[centerId] = { x: center.x.toFixed(1), y: center.y.toFixed(1) };
        newVertices[radiusId] = { x: radiusPoint.x.toFixed(1), y: radiusPoint.y.toFixed(1) };
        
        // Update geometry
        const newCircle = {
          id: circleId,
          center: centerId,
          radiusPoint: radiusId
        };
        
        const allVerticesWithCircle = { ...vertices, ...newVertices };
        const allCircles = [...(geometry.circles || []), newCircle];
        
        // Add automatic dimension for radius
        const newDim: Dimension = {
          id: nanoid(),
          type: 'linear',
          value: Number(radius.toFixed(1)),
          elements: { nodes: [centerId, radiusId] },
          isParameter: false,
          label: 'R'
        };
        
        setDimensions([...dimensions, newDim]);
        handleGeometryChange({ ...geometry, vertices: allVerticesWithCircle, circles: allCircles });
        toast.success(`Círculo primitivo creado`);
        return; // Exit early as we don't create a contour

      case 'polygon':
        const { sides, radius: pRadius } = shape;
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * 2 * Math.PI - Math.PI / 2;
          const x = (pRadius * Math.cos(angle)).toFixed(1);
          const y = (pRadius * Math.sin(angle)).toFixed(1);
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

  const handleElementDelete = (type: 'node' | 'line' | 'circle', id: string, secondaryId?: string) => {
    if (!previewData?.geometry) return;

    const geometry = previewData.geometry;
    const contours = geometry.contours || [];
    let vertices = { ...geometry.vertices };
    let currentConstraints = [...constraints];
    let currentDimensions = [...dimensions];

    let nodesToDelete: string[] = [];
    let newContours = [...contours];
    let newCircles = geometry.circles ? [...geometry.circles] : [];
    let deleted = false;

    if (type === 'circle') {
      const circleIndex = newCircles.findIndex((c: any) => c.id === id);
      if (circleIndex !== -1) {
        const circle = newCircles[circleIndex];
        nodesToDelete = [circle.center, circle.radiusPoint];
        newCircles.splice(circleIndex, 1);
        toast.success("Círculo eliminado");
        deleted = true;
      }
    } else {
      const targetNode = id;
      const contourIndex = contours.findIndex((c: any) => 
        c.elements.some((el: any) => el.from === targetNode || el.to === targetNode)
      );

      if (contourIndex === -1) return;
      const contour = contours[contourIndex];

      const contourNodes = new Set<string>();
      contour.elements.forEach((el: any) => {
        contourNodes.add(el.from);
        contourNodes.add(el.to);
      });

      if (type === 'node') {
        if (contourNodes.size <= 3) {
          newContours = contours.filter((_: any, i: number) => i !== contourIndex);
          nodesToDelete = Array.from(contourNodes);
          toast.info("Contorno eliminado (menos de 3 nodos)");
          deleted = true;
        } else {
          const elIn = contour.elements.find((el: any) => el.to === targetNode);
          const elOut = contour.elements.find((el: any) => el.from === targetNode);
          
          if (elIn && elOut) {
            const newElements = contour.elements.filter((el: any) => el !== elIn && el !== elOut);
            newElements.push({ type: 'line', from: elIn.from, to: elOut.to });
            newContours[contourIndex] = { ...contour, elements: newElements };
            nodesToDelete = [targetNode];
            toast.success("Nodo eliminado");
            deleted = true;
          }
        }
      } else if (type === 'line' && secondaryId) {
        if (contourNodes.size <= 4) {
           newContours = contours.filter((_: any, i: number) => i !== contourIndex);
           nodesToDelete = Array.from(contourNodes);
           toast.info("Contorno eliminado (menos de 3 nodos restantes)");
           deleted = true;
        } else {
          const nodeA = id;
          const nodeB = secondaryId;
          const elPre = contour.elements.find((el: any) => el.to === nodeA);
          const elLine = contour.elements.find((el: any) => el.from === nodeA && el.to === nodeB);
          const elPost = contour.elements.find((el: any) => el.from === nodeB);

          if (elPre && elLine && elPost) {
            const newElements = contour.elements.filter((el: any) => el !== elPre && el !== elLine && el !== elPost);
            newElements.push({ type: 'line', from: elPre.from, to: elPost.to });
            newContours[contourIndex] = { ...contour, elements: newElements };
            nodesToDelete = [nodeA, nodeB];
            toast.success("Línea y nodos eliminados");
            deleted = true;
          }
        }
      }
    }

    if (deleted) {
      // 1. Eliminar vértices
      nodesToDelete.forEach(nodeId => delete vertices[nodeId]);

      // 2. Limpiar Restricciones
      const newConstraints = currentConstraints.filter(c => 
        !c.nodes.some(n => nodesToDelete.includes(n))
      );

      // 3. Limpiar Dimensiones
      const newDimensions = currentDimensions.filter(d => {
        if (d.elements.nodes && d.elements.nodes.some(n => nodesToDelete.includes(n))) return false;
        if (d.elements.lines && d.elements.lines.some(l => nodesToDelete.includes(l.from) || nodesToDelete.includes(l.to))) return false;
        return true;
      });

      // Actualizar estado y geometría
      setConstraints(newConstraints);
      setDimensions(newDimensions);
      handleGeometryChange({ 
        ...geometry, 
        vertices, 
        contours: newContours,
        circles: newCircles, // Update circles
        constraints: newConstraints,
        dimensions: newDimensions
      });
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
                  onElementDelete={handleElementDelete}
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
                        onAddConstraint={handleAddConstraint}
                        onAddDimension={handleAddDimension}
                      />
                    </div>
          
                    {/* ZONA SCROLLABLE: PROPIEDADES Y PANELES (TABS) */}
                    <div className="flex-1 overflow-y-auto pr-2 pb-2">
                      <Tabs defaultValue="coords" className="w-full">
                        <TabsList className="grid w-full grid-cols-5 h-9 bg-zinc-900/50 p-1 gap-1">
                          <TabsTrigger value="coords" title="Coordenadas" className="text-[10px] p-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><BoxSelect className="h-4 w-4" /></TabsTrigger>
                          <TabsTrigger value="params" title="Parámetros" className="text-[10px] p-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><SlidersHorizontal className="h-4 w-4" /></TabsTrigger>
                          <TabsTrigger value="constraints" title="Restricciones" className="text-[10px] p-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Lock className="h-4 w-4" /></TabsTrigger>
                          <TabsTrigger value="dimensions" title="Dimensiones" className="text-[10px] p-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Ruler className="h-4 w-4" /></TabsTrigger>
                          <TabsTrigger value="json" title="JSON" className="text-[10px] p-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Code className="h-4 w-4" /></TabsTrigger>
                        </TabsList>

                        <div className="mt-3 space-y-4">
                          {/* TAB: COORDENADAS (Editor Visual + Transformaciones) */}
                          <TabsContent value="coords" className="space-y-4 m-0 animate-in fade-in slide-in-from-right-2 duration-300">
                            {previewData?.geometry && (
                              <VisualGeometryEditor
                                geometry={previewData.geometry}
                                params={previewData.params || {}}
                                onChange={handleGeometryChange}
                              />
                            )}
                            <TransformationPanel
                              selectedNodes={selectedNodes}
                              vertices={previewData?.geometry?.vertices || {}}
                              onTransform={handleTransform}
                              onClearSelection={() => setSelectedNodes([])}
                            />
                          </TabsContent>

                          {/* TAB: PARÁMETROS */}
                          <TabsContent value="params" className="m-0 animate-in fade-in slide-in-from-right-2 duration-300">
                            {previewData?.params && (
                              <ParamsPanel
                                params={previewData.params}
                                onParamChange={handleParamChange}
                              />
                            )}
                          </TabsContent>

                          {/* TAB: RESTRICCIONES */}
                          <TabsContent value="constraints" className="m-0 animate-in fade-in slide-in-from-right-2 duration-300">
                            <ConstraintsPanel
                              constraints={constraints}
                              onToggleConstraint={handleToggleConstraint}
                              onRemoveConstraint={handleRemoveConstraint}
                            />
                          </TabsContent>

                          {/* TAB: DIMENSIONES */}
                          <TabsContent value="dimensions" className="m-0 animate-in fade-in slide-in-from-right-2 duration-300">
                            <DimensionsPanel
                              dimensions={dimensions}
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
                              onUpdateDimension={handleUpdateDimension}
                              onRemoveDimension={handleRemoveDimension}
                              onToggleDimensionParameter={handleToggleDimensionParameter}
                              onInvertAngle={handleInvertAngle}
                            />
                          </TabsContent>

                          {/* TAB: JSON */}
                          <TabsContent value="json" className="m-0 animate-in fade-in slide-in-from-right-2 duration-300">
                            <Card className="border-zinc-800">
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
                                  rows={20}
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
                          </TabsContent>
                        </div>
                      </Tabs>
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
      {/* MODAL PARA CREAR PARÁMETRO */}
      <Dialog open={paramCreationDialog.open} onOpenChange={(open) => {
        if (!open) {
          setParamCreationDialog({ open: false, dimensionId: null, initialValue: 0 });
          setNewParamName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Parámetro Interactivo</DialogTitle>
            <DialogDescription>
              Asigna un nombre para este parámetro. Aparecerá en el panel de parámetros interactivos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del Parámetro</Label>
              <Input
                value={newParamName}
                onChange={(e) => setNewParamName(e.target.value)}
                placeholder="Ej. Largo, Ancho, Radio..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmParamCreation();
                }}
                autoFocus
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Valor actual: <span className="font-mono text-primary">{paramCreationDialog.initialValue}cm</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
               setParamCreationDialog({ open: false, dimensionId: null, initialValue: 0 });
               setNewParamName("");
            }}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmParamCreation}>
              Crear Parámetro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
