import React, { useCallback, useEffect, useState, useRef } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  BackgroundVariant,
  Handle, 
  Position,
  type NodeProps,
  type Edge,
  type Node,
  NodeResizer
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslation } from 'react-i18next';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X, MousePointerClick } from 'lucide-react';

// --- Custom Node Components ---

const NumberInputNode = ({ data, id }: NodeProps) => {
  const label = (data.label as string) || "Número";
  const value = (data.value as number) || 0;
  
  return (
    <Card className="p-3 min-w-[150px] border-2 border-emerald-500/50 bg-background/90">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`in-${id}`} className="text-xs font-bold uppercase text-emerald-600">
            {label}
        </Label>
        <Input 
            id={`in-${id}`}
            type="number" 
            className="h-6 text-xs" 
            value={value}
            onChange={(evt) => {
              const val = parseFloat(evt.target.value);
              if (typeof data.onChange === 'function') {
                data.onChange(val);
              }
            }} 
        />
      </div>
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
    </Card>
  );
};

const ImageTracerNode = ({ data, selected }: NodeProps) => {
    const [imageSrc, setImageSrc] = useState<string | null>(data.imageSrc as string || null);
    const [points, setPoints] = useState<{x: number, y: number}[]>(data.points as any || []);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                setImageSrc(result);
                // Actualizar data del nodo para persistencia (si la hubiera)
                if (data.onDataChange) (data as any).onDataChange({ imageSrc: result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSvgClick = (e: React.MouseEvent) => {
        if (!imageSrc) return;
        // Coordenadas relativas al SVG
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Normalizamos coordenadas (0-1) para que sean independientes del tamaño del nodo
        const width = rect.width;
        const height = rect.height;
        
        const newPoint = { x: x/width, y: y/height };
        const newPoints = [...points, newPoint];
        setPoints(newPoints);
        
        if (data.onDataChange) (data as any).onDataChange({ points: newPoints });
    };

    const clearPoints = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPoints([]);
        if (data.onDataChange) (data as any).onDataChange({ points: [] });
    };

    // Construir path SVG
    const svgPath = points.map((p, i) => {
        // Convertimos de vuelta a porcentajes para el renderizado
        return `${i === 0 ? 'M' : 'L'} ${p.x * 100}% ${p.y * 100}%`;
    }).join(' ');

    return (
        <Card className="min-w-[200px] min-h-[200px] border-2 border-orange-500/50 bg-background/90 relative overflow-hidden flex flex-col">
            <NodeResizer minWidth={200} minHeight={200} isVisible={selected} lineStyle={{borderWidth:1}} handleStyle={{width:8, height:8}} />
            
            <div className="absolute top-0 left-0 right-0 h-8 bg-orange-100 dark:bg-orange-900/30 flex items-center justify-between px-2 z-20 border-b border-orange-200">
                <span className="text-[10px] font-bold uppercase text-orange-600 flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3" /> Trazador
                </span>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={clearPoints} title="Borrar Puntos">
                        <X className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => fileInputRef.current?.click()} title="Subir Imagen">
                        <Upload className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 relative bg-neutral-100 dark:bg-neutral-900 cursor-crosshair w-full h-full">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                />
                
                {!imageSrc ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4 text-center pointer-events-none">
                        <Upload className="mb-2 opacity-50" />
                        <span className="text-xs">Sube una imagen para calcar</span>
                    </div>
                ) : (
                    <img src={imageSrc} className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-50 select-none" alt="Ref" />
                )}

                {/* SVG Overlay */}
                <svg className="absolute inset-0 w-full h-full z-10" onClick={handleSvgClick}>
                    {points.length > 0 && (
                        <path d={svgPath} fill="none" stroke="red" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    )}
                    {points.map((p, i) => (
                        <circle key={i} cx={`${p.x * 100}%`} cy={`${p.y * 100}%`} r="3" fill="red" stroke="white" strokeWidth="1" />
                    ))}
                </svg>
            </div>
            
            <Handle type="source" position={Position.Right} id="contour" className="!bg-orange-500" />
        </Card>
    );
};

const SplintGeneratorNode = (_props: NodeProps) => {
  return (
    <Card className="p-3 min-w-[180px] border-2 border-blue-500/50 bg-background/90">
       <div className="mb-2 text-xs font-bold uppercase text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
          Generador Férula
       </div>
       <div className="flex flex-col gap-3 relative">
            <div className="relative flex items-center h-4">
                <Handle type="target" position={Position.Left} id="length" className="!bg-blue-400" style={{top: '50%'}} />
                <span className="text-[10px] ml-2">Largo</span>
            </div>
            <div className="relative flex items-center h-4">
                <Handle type="target" position={Position.Left} id="widthProximal" className="!bg-blue-400" style={{top: '50%'}} />
                <span className="text-[10px] ml-2">Ancho (Prox)</span>
            </div>
            <div className="relative flex items-center h-4">
                <Handle type="target" position={Position.Left} id="widthDistal" className="!bg-blue-400" style={{top: '50%'}} />
                <span className="text-[10px] ml-2">Ancho (Dist)</span>
            </div>
             <div className="relative flex items-center h-4">
                <Handle type="target" position={Position.Left} id="thickness" className="!bg-blue-400" style={{top: '50%'}} />
                <span className="text-[10px] ml-2">Grosor</span>
            </div>
            {/* Nuevo input para contorno */}
            <div className="relative flex items-center h-4 mt-2 pt-2 border-t border-dashed border-blue-200">
                <Handle type="target" position={Position.Left} id="contourProfile" className="!bg-orange-400" style={{top: '50%'}} />
                <span className="text-[10px] ml-2 text-orange-600 font-semibold">Perfil (Contorno)</span>
            </div>
       </div>
       <Handle type="source" position={Position.Right} id="geometry" className="!bg-blue-500" />
    </Card>
  );
};

const OutputNode = (_props: NodeProps) => {
    return (
      <Card className="p-3 border-2 border-purple-500/50 bg-background/90">
        <div className="text-xs font-bold uppercase text-purple-600">Salida 3D</div>
        <Handle type="target" position={Position.Left} className="!bg-purple-500" />
      </Card>
    );
};

const nodeTypes = {
  numberInput: NumberInputNode,
  imageTracer: ImageTracerNode, // Registro del nuevo nodo
  splintGenerator: SplintGeneratorNode,
  outputMesh: OutputNode
};

// --- Initial Graph ---
const initialNodes: Node[] = [
  { id: 'len', type: 'numberInput', position: { x: 50, y: 50 }, data: { label: 'Largo Total', value: 220 } },
  { id: 'wp', type: 'numberInput', position: { x: 50, y: 150 }, data: { label: 'Ancho (Antebrazo)', value: 85 } },
  { id: 'wd', type: 'numberInput', position: { x: 50, y: 250 }, data: { label: 'Ancho (Muñeca)', value: 60 } },
  { id: 'th', type: 'numberInput', position: { x: 50, y: 350 }, data: { label: 'Grosor', value: 3 } },
  // Nodo de imagen posicionado cerca
  { id: 'trace', type: 'imageTracer', position: { x: 250, y: 350 }, data: { label: 'Perfil', points: [] }, style: { width: 300, height: 300 } },
  
  { id: 'gen', type: 'splintGenerator', position: { x: 600, y: 150 }, data: { label: 'Férula Muñeca' } },
  { id: 'out', type: 'outputMesh', position: { x: 850, y: 180 }, data: { label: 'Visor 3D' } },
];

const initialEdges: Edge[] = [
    { id: 'e1', source: 'len', target: 'gen', targetHandle: 'length' },
    { id: 'e2', source: 'wp', target: 'gen', targetHandle: 'widthProximal' },
    { id: 'e3', source: 'wd', target: 'gen', targetHandle: 'widthDistal' },
    { id: 'e4', source: 'th', target: 'gen', targetHandle: 'thickness' },
    { id: 'e5', source: 'gen', target: 'out' },
    // Conexión del trazador (opcional, usuario la hace)
    { id: 'e6', source: 'trace', target: 'gen', targetHandle: 'contourProfile' } 
];

// --- Main Component ---

export interface VisualGeometryEditorProps {
  geometry?: any;
  params?: any;
  onChange?: (newGeometry: any) => void;
}

export function VisualGeometryEditor({ geometry: _geometry, params: _params, onChange: _onChange }: VisualGeometryEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Manejar cambios en valores de nodos (Inputs y Tracer)
  const onNodeDataChange = useCallback((nodeId: string, newData: any) => {
      setNodes((nds) => nds.map((node) => {
          if (node.id === nodeId) {
              return { 
                  ...node, 
                  data: { 
                      ...node.data, 
                      ...newData, 
                      // Mantenemos las funciones callback
                      onChange: (v: number) => onNodeDataChange(nodeId, { value: v }),
                      onDataChange: (d: any) => onNodeDataChange(nodeId, d)
                  } 
              };
          }
          return node;
      }));
  }, [setNodes]);

  // Inicializar callbacks para todos los nodos
  useEffect(() => {
      setNodes((nds) => nds.map(n => {
          if (n.type === 'numberInput') {
              return { ...n, data: { ...n.data, onChange: (v: number) => onNodeDataChange(n.id, { value: v }) } };
          }
          if (n.type === 'imageTracer') {
              return { ...n, data: { ...n.data, onDataChange: (d: any) => onNodeDataChange(n.id, d) } };
          }
          return n;
      }));
  }, []); 


  // --- Graph Evaluator Engine ---
  useEffect(() => {
      const genNode = nodes.find(n => n.type === 'splintGenerator');
      if (!genNode) return;

      const connectedEdges = edges.filter(e => e.target === genNode.id);
      
      const newParams: any = {};
      
      connectedEdges.forEach(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          if (sourceNode) {
              if (sourceNode.type === 'numberInput') {
                  if (edge.targetHandle) newParams[edge.targetHandle] = sourceNode.data.value;
              }
              // Manejar el nodo de trazado
              if (sourceNode.type === 'imageTracer') {
                  if (edge.targetHandle === 'contourProfile') {
                      // Pasamos los puntos normalizados (0-1)
                      newParams.contourProfile = sourceNode.data.points;
                  }
              }
          }
      });

      if (Object.keys(newParams).length > 0) {
        window.dispatchEvent(new CustomEvent('node-editor-update', { detail: newParams }));
      }

  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="h-full w-full bg-background border-t flex flex-col">
      <div className="h-8 bg-muted px-4 flex items-center justify-between border-b shrink-0">
         <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Editor Lógico (Nodos)</span>
         <span className="text-[10px] text-muted-foreground">Añade imágenes y traza contornos</span>
      </div>
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls className="!bg-background !border-muted" />
          <MiniMap className="!bg-muted" />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}