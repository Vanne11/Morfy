import { useRef, useEffect, useState } from "react";
import * as fabric from "fabric";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { evaluateExpression } from "@/utils/paramEvaluator";
import {
  constraintSolver,
  type Constraint,
  type Dimension
} from "@/utils/constraintSolver";
import type { ToolType } from "./ToolsPanel";

interface FabricEditorProps {
  geometry: any;
  params: Record<string, any>;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodesMove?: (updates: Record<string, {x: number, y: number}>) => void;
  onNodeAdd: (perimeterId: string, afterNodeId: string, x: number, y: number) => void;
  onElementDelete?: (type: 'node' | 'line' | 'circle', id: string, secondaryId?: string) => void;
  onShapeCreate?: (shape: any) => void;
  selectedNodes: string[];
  selectedLines: Array<{ from: string; to: string }>;
  onSelectionChange: (nodes: string[], lines: Array<{ from: string; to: string }>) => void;
  constraints?: Constraint[];
  dimensions?: Dimension[];
  activeTool: ToolType;
  drawingMode: 'new' | 'add_external' | 'add_hole' | null;
}

export function FabricGeometryEditor({
  geometry,
  params,
  onNodeMove,
  onNodesMove,
  onNodeAdd,
  onElementDelete,
  onShapeCreate,
  selectedNodes,
  selectedLines,
  onSelectionChange,
  constraints = [],
  dimensions = [],
  activeTool,
  drawingMode
}: FabricEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const nodeCircles = useRef<Map<string, fabric.Circle>>(new Map());
  const edgeLines = useRef<Map<string, fabric.Line>>(new Map());
  
  // Estado para dibujo temporal
  const drawingPoints = useRef<Array<{x: number, y: number}>>([]);
  const tempDrawingObjects = useRef<fabric.Object[]>([]);
  
  // Estado para arrastre de grupo
  const dragStartPositions = useRef<Map<string, {left: number, top: number}>>(new Map());
  const dragStartPointer = useRef<{x: number, y: number} | null>(null);

  // Estado para creación interactiva de formas (Rect/Poly/Circle)
  const [creationState, setCreationState] = useState<'none' | 'rect_height' | 'rect_width' | 'poly_sides' | 'poly_dist' | 'circle_radius'>('none');
  const [creationData, setCreationData] = useState<{x: number, y: number, screenX: number, screenY: number, firstVal?: number} | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Limpiar dibujo temporal al cambiar de herramienta
  useEffect(() => {
    drawingPoints.current = [];
    dragStartPointer.current = null;
    dragStartPositions.current.clear();
    setCreationState('none');
    setCreationData(null);
    setInputValue("");
    
    if (fabricRef.current) {
      tempDrawingObjects.current.forEach(obj => fabricRef.current?.remove(obj));
      tempDrawingObjects.current = [];
      fabricRef.current.requestRenderAll();
    }
  }, [activeTool, drawingMode]);

  // Auto-foco en el input cuando aparece
  useEffect(() => {
    if (creationState !== 'none' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [creationState]);

  const handleShapeCreationStep = () => {
    if (!creationData || !onShapeCreate) return;
    const val = parseFloat(inputValue);
    
    if (isNaN(val) || val <= 0) {
      toast.error("Por favor ingresa un valor válido mayor a 0");
      return;
    }

    if (creationState === 'rect_height') {
      // Guardar alto y pedir ancho
      setCreationData({ ...creationData, firstVal: val });
      setCreationState('rect_width');
      setInputValue("");
    } 
    else if (creationState === 'rect_width') {
      // Tenemos alto (firstVal) y ancho (val). Crear Rect.
      const height = creationData.firstVal!;
      const width = val;
      
      // Rectángulo centrado en el punto de clic
      const halfW = width / 2;
      const halfH = height / 2;
      const rectPoints = [
        { x: creationData.x - halfW, y: creationData.y - halfH }, // Top-Left
        { x: creationData.x + halfW, y: creationData.y - halfH }, // Top-Right
        { x: creationData.x + halfW, y: creationData.y + halfH }, // Bottom-Right
        { x: creationData.x - halfW, y: creationData.y + halfH }, // Bottom-Left
      ];

      // Convertir a estructura de vértices/elementos
      const pIndex = (geometry?.contours?.length || 0) + 1;
      const perimeterId = `p${pIndex}`;
      const newVertices: Record<string, {x: string, y: string}> = {};
      const newElements: Array<{type: string, from: string, to: string}> = [];

      rectPoints.forEach((pt, i) => {
        const nodeId = `${perimeterId}n${i + 1}`;
        newVertices[nodeId] = { x: pt.x.toFixed(1), y: pt.y.toFixed(1) };
        const nextIndex = (i + 1) % 4;
        const nextNodeId = `${perimeterId}n${nextIndex + 1}`;
        newElements.push({ type: 'line', from: nodeId, to: nextNodeId });
      });

      onShapeCreate({
        type: 'custom_poly', // Usamos custom_poly para pasar vértices explícitos
        vertices: newVertices,
        elements: newElements,
        isHole: false // Por defecto outer, el editor principal decide si es hole
      });

      setCreationState('none');
      setCreationData(null);
      setInputValue("");
    }
    else if (creationState === 'poly_sides') {
      if (val < 3) {
        toast.error("Un polígono necesita al menos 3 lados");
        return;
      }
      // Guardar lados y pedir distancia entre nodos
      setCreationData({ ...creationData, firstVal: val });
      setCreationState('poly_dist');
      setInputValue("");
    }
    else if (creationState === 'poly_dist') {
      // Tenemos lados (firstVal) y distancia entre nodos (val).
      const sides = creationData.firstVal!;
      const sideLength = val;
      
      // Calcular radio a partir del lado: s = 2r * sin(pi/n) => r = s / (2 * sin(pi/n))
      const radius = sideLength / (2 * Math.sin(Math.PI / sides));

      const pIndex = (geometry?.contours?.length || 0) + 1;
      const perimeterId = `p${pIndex}`;
      const newVertices: Record<string, {x: string, y: string}> = {};
      const newElements: Array<{type: string, from: string, to: string}> = [];

      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * 2 * Math.PI - Math.PI / 2;
        const vx = creationData.x + radius * Math.cos(angle);
        const vy = creationData.y + radius * Math.sin(angle);
        
        const nodeId = `${perimeterId}n${i + 1}`;
        newVertices[nodeId] = { x: vx.toFixed(1), y: vy.toFixed(1) };
        
        const nextIndex = (i + 1) % sides;
        const nextNodeId = `${perimeterId}n${nextIndex + 1}`;
        newElements.push({ type: 'line', from: nodeId, to: nextNodeId });
      }

      onShapeCreate({
        type: 'custom_poly',
        vertices: newVertices,
        elements: newElements,
        isHole: false
      });

      setCreationState('none');
      setCreationData(null);
      setInputValue("");
    }
    else if (creationState === 'circle_radius') {
      const radius = val;
      
      onShapeCreate({
        type: 'circle_primitive',
        center: { x: creationData.x, y: creationData.y },
        radiusPoint: { x: creationData.x + radius, y: creationData.y },
        radius: radius
      });

      setCreationState('none');
      setCreationData(null);
      setInputValue("");
    }
  };

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
      selection: activeTool === 'select', // Solo selección en modo select
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

  // Función auxiliar para cerrar forma
  const finishDrawing = () => {
    if (drawingPoints.current.length < 3) {
      toast.error("Se necesitan al menos 3 puntos para cerrar una forma");
      return;
    }

    if (onShapeCreate) {
      const isHole = drawingMode === 'add_hole';
      
      // Convertir puntos a estructura de forma
      const newVertices: Record<string, {x: string, y: string}> = {};
      const newElements: Array<{type: string, from: string, to: string}> = [];
      const pIndex = (geometry?.contours?.length || 0) + 1;
      const perimeterId = `p${pIndex}`;
      
      drawingPoints.current.forEach((pt, i) => {
        const nodeId = `${perimeterId}n${i + 1}`;
        newVertices[nodeId] = { x: pt.x.toFixed(1), y: pt.y.toFixed(1) };
        
        const nextIndex = (i + 1) % drawingPoints.current.length;
        const nextNodeId = `${perimeterId}n${nextIndex + 1}`;
        newElements.push({ type: 'line', from: nodeId, to: nextNodeId });
      });

      onShapeCreate({
        type: 'custom_poly',
        vertices: newVertices,
        elements: newElements,
        isHole
      });
    }

    // Limpiar
    drawingPoints.current = [];
    tempDrawingObjects.current.forEach(obj => fabricRef.current?.remove(obj));
    tempDrawingObjects.current = [];
    fabricRef.current?.requestRenderAll();
  };

  // Manejo de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cancelar creación interactiva
      if (e.key === 'Escape' && creationState !== 'none') {
         setCreationState('none');
         setCreationData(null);
         setInputValue("");
         return;
      }

      if (activeTool !== 'node') return;
      
      if (e.key === 'Enter') {
        finishDrawing();
      } else if (e.key === 'Escape') {
        drawingPoints.current = [];
        tempDrawingObjects.current.forEach(obj => fabricRef.current?.remove(obj));
        tempDrawingObjects.current = [];
        fabricRef.current?.requestRenderAll();
        toast.info("Dibujo cancelado");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, drawingMode, onShapeCreate, creationState]);

  useEffect(() => {
    if (!fabricRef.current || !geometry) return;

    const canvas = fabricRef.current;
    canvas.clear();
    nodeCircles.current.clear();
    edgeLines.current.clear();
    
    // Configurar cursor según herramienta
    const canSelect = activeTool === 'select' || activeTool.startsWith('constraint_');
    const canDrag = activeTool === 'select';
    const isEraser = activeTool === 'eraser';

    canvas.defaultCursor = activeTool === 'node' ? 'crosshair' : isEraser ? 'crosshair' : 'default';
    canvas.selection = canSelect;

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
    const vertexValues = Object.values(evaluatedVertices);
    if (vertexValues.length > 0) {
      for (const vertex of vertexValues) {
        minX = Math.min(minX, vertex.x);
        maxX = Math.max(maxX, vertex.x);
        minY = Math.min(minY, vertex.y);
        maxY = Math.max(maxY, vertex.y);
      }
    } else {
      minX = -10; maxX = 10; minY = -10; maxY = 10;
    }

    const width = maxX - minX || 20;
    const height = maxY - minY || 20;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const padding = 60;
    const scaleX = (canvas.width! - padding * 2) / width;
    const scaleY = (canvas.height! - padding * 2) / height;
    const scale = Math.min(scaleX, scaleY, 50); // Max 50x zoom

    // Función para transformar coordenadas a canvas
    const toCanvasX = (x: number) => (x - centerX) * scale + canvas.width! / 2;
    const toCanvasY = (y: number) => (y - centerY) * scale + canvas.height! / 2;
    const fromCanvasX = (cx: number) => (cx - canvas.width! / 2) / scale + centerX;
    const fromCanvasY = (cy: number) => (cy - canvas.height! / 2) / scale + centerY;

    // ------------------------------------------------------------------------
    // DIBUJAR GRID (1cm x 1cm)
    // ------------------------------------------------------------------------
    const visibleMinX = Math.floor(fromCanvasX(0));
    const visibleMaxX = Math.ceil(fromCanvasX(canvas.width!));
    const visibleMinY = Math.floor(fromCanvasY(0));
    const visibleMaxY = Math.ceil(fromCanvasY(canvas.height!));

    // Grid Lines
    const gridColor = '#e4e4e7'; // zinc-200
    const axisColor = '#d4d4d8'; // zinc-300

    // Vertical lines
    for (let x = visibleMinX; x <= visibleMaxX; x++) {
      const cx = toCanvasX(x);
      const isAxis = x === 0;
      const gridLine = new fabric.Line(
        [cx, 0, cx, canvas.height!],
        {
          stroke: isAxis ? axisColor : gridColor,
          strokeWidth: isAxis ? 2 : 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
        }
      );
      canvas.add(gridLine);
    }

    // Horizontal lines
    for (let y = visibleMinY; y <= visibleMaxY; y++) {
      const cy = toCanvasY(y);
      const isAxis = y === 0;
      const gridLine = new fabric.Line(
        [0, cy, canvas.width!, cy],
        {
          stroke: isAxis ? axisColor : gridColor,
          strokeWidth: isAxis ? 2 : 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
        }
      );
      canvas.add(gridLine);
    }

    // ------------------------------------------------------------------------
    // DIBUJAR RELLENO TRANSPARENTE (PATH CON HOLES)
    // ------------------------------------------------------------------------
    let pathData = "";
    
    for (const contour of geometry.contours || []) {
      if (!contour.elements || contour.elements.length === 0) continue;

      // Asumimos que los elementos están ordenados (A->B, B->C, ...)
      // En caso contrario necesitaríamos un algoritmo de ordenamiento/traversal
      const firstEl = contour.elements[0];
      const startV = evaluatedVertices[firstEl.from];
      if (!startV) continue;

      pathData += `M ${toCanvasX(startV.x)} ${toCanvasY(startV.y)} `;

      for (const element of contour.elements) {
        const toV = evaluatedVertices[element.to];
        if (toV) {
          pathData += `L ${toCanvasX(toV.x)} ${toCanvasY(toV.y)} `;
        }
      }
      pathData += "Z ";
    }

    if (pathData) {
      const filledPath = new fabric.Path(pathData, {
        fill: 'rgba(59, 130, 246, 0.1)', // Azul transparente
        stroke: 'transparent',
        strokeWidth: 0,
        fillRule: 'evenodd', // Permite huecos
        selectable: false,
        evented: false,
        hoverCursor: 'default',
      });
      canvas.add(filledPath);
    }

    // Dibujar Círculos Paramétricos
    if (geometry.circles) {
      for (const circleDef of geometry.circles) {
        const center = evaluatedVertices[circleDef.center];
        const point = evaluatedVertices[circleDef.radiusPoint];
        
        if (center && point) {
          const cx = toCanvasX(center.x);
          const cy = toCanvasY(center.y);
          const px = toCanvasX(point.x);
          const py = toCanvasY(point.y);
          
          // Calcular radio visual
          const radiusVisual = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));

          const circleObj = new fabric.Circle({
            left: cx,
            top: cy,
            radius: radiusVisual,
            fill: 'rgba(59, 130, 246, 0.1)',
            stroke: '#3b82f6',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
            selectable: false, // El círculo en sí no se selecciona, se seleccionan los nodos
            evented: true, // Permitir eventos para borrar
            hoverCursor: isEraser ? 'crosshair' : 'default',
            data: { type: 'circle', id: circleDef.id }
          });

          // Hover effect para borrar
          circleObj.on('mouseover', () => {
            if (isEraser) {
              circleObj.set({ strokeWidth: 4, stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.2)' });
              canvas.renderAll();
            }
          });

          circleObj.on('mouseout', () => {
            if (isEraser) {
              circleObj.set({ strokeWidth: 2, stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.1)' });
              canvas.renderAll();
            }
          });

          // Click para borrar
          circleObj.on('mousedown', () => {
            if (isEraser) {
              onElementDelete?.('circle', circleDef.id);
            }
          });
          
          canvas.add(circleObj);

          // Línea de radio visual
          const radiusLine = new fabric.Line([cx, cy, px, py], {
            stroke: '#3b82f6',
            strokeWidth: 1,
            strokeDashArray: [4, 4],
            selectable: false,
            evented: false,
            opacity: 0.6
          });
          
          canvas.add(radiusLine);
        }
      }
    }

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
            selectable: canSelect, // Permitir selección si es herramienta de selección o restricción
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true,
            hoverCursor: isEraser ? 'crosshair' : (canSelect ? 'pointer' : 'crosshair'),
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
          if (isEraser) {
            line.set({ strokeWidth: 4, stroke: '#ef4444' }); // Red hover for delete
            canvas.renderAll();
          } else if (!isLineSelected && canSelect) {
            line.set({ strokeWidth: 4, stroke: '#facc15' });
            canvas.renderAll();
          }
        });

        line.on('mouseout', () => {
          if (isEraser) {
            line.set({ strokeWidth: isLineSelected ? 4 : 2, stroke: isLineSelected ? '#facc15' : strokeColor });
            canvas.renderAll();
          } else if (!isLineSelected && canSelect) {
            line.set({ strokeWidth: 2, stroke: strokeColor });
            canvas.renderAll();
          }
        });

        // Click para seleccionar línea O BORRAR
        line.on('mousedown', (event) => {
          if (isEraser) {
            onElementDelete?.('line', element.from, element.to);
            return;
          }

          if (!canSelect) return;
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
          if (activeTool !== 'select') return;
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
        selectable: canSelect,
        hasControls: false,
        hasBorders: false,
        lockMovementX: !canDrag, // Bloquear movimiento si no es herramienta de selección
        lockMovementY: !canDrag,
        lockScalingX: true,
        lockScalingY: true,
        hoverCursor: isEraser ? 'crosshair' : (canSelect ? (canDrag ? 'move' : 'pointer') : 'crosshair'),
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
      
      // Vincular texto al círculo para acceso rápido
      (circle as any).labelObj = text;

      // Hover effect para borrar
      circle.on('mouseover', () => {
        if (isEraser) {
          circle.set({ fill: '#ef4444', scaleX: 1.2, scaleY: 1.2 });
          text.set({ fill: '#ef4444' });
          canvas.renderAll();
        }
      });

      circle.on('mouseout', () => {
        if (isEraser) {
          circle.set({ fill: isSelected ? '#f59e0b' : '#10b981', scaleX: 1, scaleY: 1 });
          text.set({ fill: '#10b981' });
          canvas.renderAll();
        }
      });

      // Evento de click para selección múltiple O BORRAR
      circle.on('mousedown', (e) => {
        if (isEraser) {
          onElementDelete?.('node', id);
          return;
        }

        if (!canSelect) return;
        
        // Guardar posiciones iniciales para posible arrastre de grupo
        if (selectedNodes.includes(id)) {
          dragStartPointer.current = { x: circle.left!, y: circle.top! };
          dragStartPositions.current.clear();
          selectedNodes.forEach(selectedId => {
            const node = nodeCircles.current.get(selectedId);
            if (node) {
              dragStartPositions.current.set(selectedId, { left: node.left!, top: node.top! });
            }
          });
        }

        const event = e.e as MouseEvent;
        if (event.ctrlKey || event.metaKey || activeTool.startsWith('constraint_')) {
          // Ctrl+Click O Modo Restricción: toggle selección (acumulativo)
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
          // Click normal en modo select: selecciona solo este nodo (si no estaba seleccionado ya)
          // Si ya estaba seleccionado, no hacemos nada para permitir el arrastre de grupo
          onSelectionChange([id], []);
          // También preparamos el arrastre para este único nodo
          dragStartPointer.current = { x: circle.left!, y: circle.top! };
          dragStartPositions.current.clear();
          dragStartPositions.current.set(id, { left: circle.left!, top: circle.top! });
        }
      });

      // Evento durante el arrastre (VISUAL)
      circle.on('moving', () => {
        const dx = circle.left! - (dragStartPointer.current?.x || circle.left!);
        const dy = circle.top! - (dragStartPointer.current?.y || circle.top!);

        // Si es parte de un grupo seleccionado, mover todos los demás
        if (selectedNodes.includes(id) && selectedNodes.length > 1) {
          selectedNodes.forEach(selectedId => {
            if (selectedId === id) return; // El nodo actual ya lo mueve Fabric
            const otherNode = nodeCircles.current.get(selectedId);
            const startPos = dragStartPositions.current.get(selectedId);
            if (otherNode && startPos) {
              otherNode.set({
                left: startPos.left + dx,
                top: startPos.top + dy
              });
              otherNode.setCoords(); // Actualizar hit box
            }
          });
        }

        // Actualizar visualmente TODAS las líneas y etiquetas afectadas
        // (No solo las del nodo actual, sino todas las del grupo)
        const nodesToUpdate = selectedNodes.includes(id) ? selectedNodes : [id];
        
        nodesToUpdate.forEach(updateId => {
           const nodeObj = nodeCircles.current.get(updateId);
           if (!nodeObj) return;
           
           // Mover etiqueta
           const label = (nodeObj as any).labelObj;
           if (label) {
             label.set({
               left: nodeObj.left! + 10,
               top: nodeObj.top! - 10
             });
           }
           
           // Actualizar líneas conectadas
           canvas.getObjects('line').forEach((obj) => {
            const line = obj as fabric.Line & { data?: any };
            const data = line.data;
            if (data?.type === 'edge') {
              if (data.fromNode === updateId) {
                line.set({ x1: nodeObj.left, y1: nodeObj.top });
              }
              if (data.toNode === updateId) {
                line.set({ x2: nodeObj.left, y2: nodeObj.top });
              }
            }
          });
        });

        canvas.renderAll();
      });

      // Cuando termina el arrastre, actualizar el estado (LÓGICA)
      circle.on('modified', () => {
        // Calcular el desplazamiento final relativo al inicio
        // Usamos el nodo arrastrado como referencia
        const currentLeft = circle.left!;
        const currentTop = circle.top!;
        const startX = dragStartPointer.current?.x || currentLeft;
        const startY = dragStartPointer.current?.y || currentTop;
        
        const deltaX = currentLeft - startX;
        const deltaY = currentTop - startY;

        // Si no se movió realmente, ignorar
        if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) return;

        // Identificar qué nodos se movieron
        const movingNodesIds = selectedNodes.includes(id) ? selectedNodes : [id];
        const allUpdates: Record<string, {x: number, y: number}> = {};
        let blocked = false;
        let blockReason = "";

        // Calcular nuevas posiciones propuestas para TODOS los nodos
        // y validar con el solver una por una (esto es una simplificación, 
        // idealmente el solver debería validar el conjunto)
        for (const nodeId of movingNodesIds) {
           // Obtener posición original antes del arrastre
           const startPos = dragStartPositions.current.get(nodeId);
           // Si es el nodo actual, us su posición actual, si no, calculamos con delta
           let newCanvasX, newCanvasY;
           
           if (nodeId === id) {
             newCanvasX = currentLeft;
             newCanvasY = currentTop;
           } else if (startPos) {
             newCanvasX = startPos.left + deltaX;
             newCanvasY = startPos.top + deltaY;
           } else {
             // Fallback si no hay startPos (no debería pasar si la lógica de mousedown es correcta)
             const v = evaluatedVertices[nodeId];
             if (v) {
                newCanvasX = toCanvasX(v.x) + deltaX;
                newCanvasY = toCanvasY(v.y) + deltaY;
             } else {
                continue;
             }
           }

           const newX = fromCanvasX(newCanvasX);
           const newY = fromCanvasY(newCanvasY);

           // Validar
           const result = constraintSolver.solveNodeMove(
            nodeId,
            Number(newX.toFixed(1)),
            Number(newY.toFixed(1)),
            evaluatedVertices, 
            constraints
          );

          if (result.blocked) {
            blocked = true;
            blockReason = result.reason || 'Restricción activa';
            break;
          }

          // Acumular actualizaciones
          allUpdates[nodeId] = { x: Number(newX.toFixed(1)), y: Number(newY.toFixed(1)) };
          
          // También acumular las actualizaciones secundarias del solver (propagación)
          Object.entries(result.updates).forEach(([updId, pos]) => {
             allUpdates[updId] = pos;
          });
        }

        if (blocked) {
          // Revertir visualmente TODO el grupo
          movingNodesIds.forEach(nodeId => {
             const nodeObj = nodeCircles.current.get(nodeId);
             const v = evaluatedVertices[nodeId];
             if (nodeObj && v) {
               nodeObj.set({
                 left: toCanvasX(v.x),
                 top: toCanvasY(v.y)
               });
               nodeObj.setCoords();
             }
          });
          canvas.renderAll();
          toast.error(blockReason);
        } else {
          // Aplicar todas las actualizaciones juntas
          if (onNodesMove && Object.keys(allUpdates).length > 0) {
            onNodesMove(allUpdates);
          } else {
            // Fallback (no recomendado para grupos, pero por compatibilidad)
            Object.entries(allUpdates).forEach(([nodeId, pos]) => {
              onNodeMove(nodeId, pos.x, pos.y);
            });
          }
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
        // ... (Angular dimension visualization - same as before)
        const [line1, line2] = dimension.elements.lines;

        const pos1A = evaluatedVertices[line1.from];
        const pos1B = evaluatedVertices[line1.to];
        const pos2A = evaluatedVertices[line2.from];
        const pos2B = evaluatedVertices[line2.to];

        if (!pos1A || !pos1B || !pos2A || !pos2B) return;

        const l1x1 = toCanvasX(pos1A.x);
        const l1y1 = toCanvasY(pos1A.y);
        const l1x2 = toCanvasX(pos1B.x);
        const l1y2 = toCanvasY(pos1B.y);
        const l2x1 = toCanvasX(pos2A.x);
        const l2y1 = toCanvasY(pos2A.y);
        const l2x2 = toCanvasX(pos2B.x);
        const l2y2 = toCanvasY(pos2B.y);

        const angle1 = Math.atan2(l1y2 - l1y1, l1x2 - l1x1);
        const angle2 = Math.atan2(l2y2 - l2y1, l2x2 - l2x1);

        const denominator = (l1x1 - l1x2) * (l2y1 - l2y2) - (l1y1 - l1y2) * (l2x1 - l2x2);
        let centerX: number;
        let centerY: number;

        if (Math.abs(denominator) < 0.001) {
          centerX = (l1x1 + l1x2 + l2x1 + l2x2) / 4;
          centerY = (l1y1 + l1y2 + l2y1 + l2y2) / 4;
        } else {
          const t = ((l1x1 - l2x1) * (l2y1 - l2y2) - (l1y1 - l2y1) * (l2x1 - l2x2)) / denominator;
          centerX = l1x1 + t * (l1x2 - l1x1);
          centerY = l1y1 + t * (l1y2 - l1y1);
        }

        const arcRadius = 40;
        const dimColor = '#a855f7';

        let angleDiff = angle2 - angle1;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (dimension.inverted) {
          if (angleDiff > 0) angleDiff -= 2 * Math.PI;
          else angleDiff += 2 * Math.PI;
        }

        const startAngle = angle1;
        const endAngle = angle1 + angleDiff;
        const angleValue = typeof dimension.value === 'number' ? dimension.value : 0;
        const isRightAngle = Math.abs(angleValue - 90) < 5;

        if (isRightAngle) {
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
          ], { fill: 'transparent', stroke: dimColor, strokeWidth: 2, selectable: false, evented: false });
          canvas.add(square);
        } else {
          const startX = centerX + arcRadius * Math.cos(startAngle);
          const startY = centerY + arcRadius * Math.sin(startAngle);
          const endX = centerX + arcRadius * Math.cos(endAngle);
          const endY = centerY + arcRadius * Math.sin(endAngle);
          const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
          const sweepFlag = angleDiff > 0 ? 1 : 0;
          const pathData = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
          const arc = new fabric.Path(pathData, { fill: '', stroke: dimColor, strokeWidth: 2, strokeDashArray: [4, 3], selectable: false, evented: false });
          canvas.add(arc);
        }

        const value = angleValue.toFixed(1);
        const label = dimension.isParameter && dimension.label ? `${dimension.label} = ${value}°` : `${value}°`;
        const midAngle = startAngle + angleDiff / 2;
        const textRadius = arcRadius + 15;
        const angleText = new fabric.Text(label, {
          left: centerX + textRadius * Math.cos(midAngle),
          top: centerY + textRadius * Math.sin(midAngle),
          fontSize: 11, fill: dimColor, fontFamily: 'monospace', fontWeight: 'bold', originX: 'center', originY: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', selectable: false, evented: false
        });
        canvas.add(angleText);
      }
    });

    canvas.renderAll();

    // ------------------------------------------------------------------------
    // MANEJO DE CLICKS EN EL CANVAS (HERRAMIENTAS DE DIBUJO)
    // ------------------------------------------------------------------------
    const handleMouseDown = (e: any) => {
      // Si estamos en un paso intermedio de creación, ignorar clicks en el canvas
      // para evitar reiniciar o mover cosas accidentalmente.
      if (creationState !== 'none') return;

      if (activeTool === 'select') {
        if (!e.target) onSelectionChange([], []);
        return;
      }

      // HERRAMIENTAS DE CREACIÓN DE FORMAS (RECT / POLYGON / CIRCLE)
      if (activeTool === 'rect' || activeTool === 'polygon' || activeTool === 'circle') {
        const pointer = e.scenePoint;
        if (!pointer) return;

        // Coordenadas lógicas (del mundo)
        const logicX = Number(fromCanvasX(pointer.x).toFixed(1));
        const logicY = Number(fromCanvasY(pointer.y).toFixed(1));

        // Coordenadas de pantalla (relativas al contenedor) para posicionar el input
        const rect = containerRef.current?.getBoundingClientRect();
        const clientX = e.e.clientX;
        const clientY = e.e.clientY;
        
        let screenX = 0;
        let screenY = 0;

        if (rect) {
           screenX = clientX - rect.left;
           screenY = clientY - rect.top;
        }

        setCreationData({ x: logicX, y: logicY, screenX, screenY });
        
        if (activeTool === 'rect') {
          setCreationState('rect_height');
        } else if (activeTool === 'polygon') {
          setCreationState('poly_sides');
        } else if (activeTool === 'circle') {
          setCreationState('circle_radius');
        }
        return;
      }

      if (activeTool === 'node') {
        // Fabric v6+: e.scenePoint gives the coordinates
        const pointer = e.scenePoint;
        if (!pointer) return; // Safety check

        const logicX = Number(fromCanvasX(pointer.x).toFixed(1));
        const logicY = Number(fromCanvasY(pointer.y).toFixed(1));

        if (drawingMode === 'new' || drawingMode === 'add_hole') {
          // AÑADIR PUNTO AL DIBUJO ACTUAL
          drawingPoints.current.push({ x: logicX, y: logicY });

          // Dibujar punto visual
          const ptCircle = new fabric.Circle({
            left: pointer.x, top: pointer.y, radius: 4, fill: '#ef4444',
            originX: 'center', originY: 'center', selectable: false, evented: false
          });
          canvas.add(ptCircle);
          tempDrawingObjects.current.push(ptCircle);

          // Si hay más de un punto, conectar con línea
          if (drawingPoints.current.length > 1) {
            const prevPt = drawingPoints.current[drawingPoints.current.length - 2];
            const prevCx = toCanvasX(prevPt.x);
            const prevCy = toCanvasY(prevPt.y);
            
            const line = new fabric.Line([prevCx, prevCy, pointer.x, pointer.y], {
              stroke: '#ef4444', strokeWidth: 2, strokeDashArray: [5, 5],
              selectable: false, evented: false
            });
            canvas.add(line);
            canvas.sendObjectToBack(line); // Detrás de los puntos
            tempDrawingObjects.current.push(line);
          }
        } else if (drawingMode === 'add_external') {
          // INSERTAR NODO EN LÍNEA EXISTENTE (SPLIT EDGE)
          let minDist = Infinity;
          let closestEdge: { contourId: string, from: string, to: string } | null = null;
          
          for (const contour of geometry.contours || []) {
             if (contour.type !== 'outer') continue; // Solo perímetro externo

             for (const el of contour.elements) {
               const p1 = evaluatedVertices[el.from];
               const p2 = evaluatedVertices[el.to];
               if (!p1 || !p2) continue;
               
               const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
               if (l2 === 0) continue;
               let t = ((logicX - p1.x) * (p2.x - p1.x) + (logicY - p1.y) * (p2.y - p1.y)) / l2;
               t = Math.max(0, Math.min(1, t));
               const projX = p1.x + t * (p2.x - p1.x);
               const projY = p1.y + t * (p2.y - p1.y);
               const d = Math.sqrt(Math.pow(logicX - projX, 2) + Math.pow(logicY - projY, 2));

               if (d < minDist) {
                 const hasDimension = dimensions.some(dim => 
                   dim.type === 'linear' && dim.elements.nodes && 
                   ((dim.elements.nodes.includes(el.from) && dim.elements.nodes.includes(el.to)))
                 );

                 if (!hasDimension) {
                   minDist = d;
                   closestEdge = { contourId: contour.id, from: el.from, to: el.to };
                 }
               }
             }
          }

          if (closestEdge && minDist < 10) { 
             onNodeAdd(closestEdge.contourId, closestEdge.from, logicX, logicY);
             toast.success("Nodo insertado en perímetro");
          } else {
             toast.info("Haz clic más cerca de una línea del perímetro externo (sin dimensiones)");
          }
        }
      }
    };

    canvas.on('mouse:down', handleMouseDown);

    // Manejador de doble clic para cerrar formas
    const handleMouseDblClick = () => {
      // Verificar que estamos en modo de dibujo de nuevos perímetros
      if (activeTool === 'node' && (drawingMode === 'new' || drawingMode === 'add_hole')) {
        // El doble click dispara dos eventos mouse:down antes del dblclick, creando 2 puntos extra.
        // Los eliminamos para que el doble click actúe solo como confirmación de cierre
        // sin añadir nodos adicionales en la posición del cursor.
        if (drawingPoints.current.length >= 2) {
          drawingPoints.current.splice(drawingPoints.current.length - 2, 2);
        }
        finishDrawing();
      }
    };

    canvas.on('mouse:dblclick', handleMouseDblClick);

    // Limpiar listener al desmontar o cambiar dependencias
    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:dblclick', handleMouseDblClick);
    };

  }, [geometry, params, onNodeMove, onNodeAdd, selectedNodes, selectedLines, onSelectionChange, constraints, dimensions, activeTool, drawingMode, creationState]); // Added creationState dependency

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white rounded border border-zinc-300 p-4 flex items-center justify-center relative overflow-hidden"
    >
      <canvas ref={canvasRef} />
      
      {/* INPUT FLOTANTE PARA CREACIÓN DE FORMAS */}
      {creationState !== 'none' && creationData && (
        <div 
          className="absolute z-50 bg-popover text-popover-foreground border shadow-xl rounded-md p-2 flex gap-2 items-center animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            left: creationData.screenX, 
            top: creationData.screenY,
            transform: 'translate(-50%, -120%)' // Centrar horizontalmente y poner encima del click
          }}
        >
          <div className="flex flex-col gap-1 min-w-[140px]">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              {creationState === 'rect_height' && "Alto del Rectángulo"}
              {creationState === 'rect_width' && "Ancho del Rectángulo"}
              {creationState === 'poly_sides' && "Cantidad de Nodos"}
              {creationState === 'poly_dist' && "Distancia entre Nodos"}
              {creationState === 'circle_radius' && "Radio del Círculo"}
            </span>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleShapeCreationStep();
                  if (e.key === 'Escape') {
                    setCreationState('none');
                    setCreationData(null);
                  }
                }}
                className="h-8 w-24 text-xs"
                placeholder="Valor..."
                autoFocus
              />
              <Button 
                size="icon" 
                className="h-8 w-8" 
                onClick={handleShapeCreationStep}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
