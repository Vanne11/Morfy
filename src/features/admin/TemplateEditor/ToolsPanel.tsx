import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CircleDot, MousePointer2, Lock, ArrowLeftRight, ArrowUpDown, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type Constraint, type Vertex2D } from "@/utils/constraintSolver";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ToolType = 'select' | 'node' | 'constraint_fixed' | 'constraint_horizontal' | 'constraint_vertical' | 'constraint_distance';

interface ToolsPanelProps {
  activeTool: ToolType;
  selectedNodes: string[];
  vertices: Record<string, Vertex2D>;
  onToolChange: (tool: ToolType) => void;
  onAddConstraint: (constraint: Omit<Constraint, 'id'>) => void;
}

export function ToolsPanel({ 
  activeTool, 
  selectedNodes,
  vertices,
  onToolChange,
  onAddConstraint 
}: ToolsPanelProps) {

  const handleConstraintClick = (type: Constraint['type']) => {
    const toolName = `constraint_${type}` as ToolType;

    // Si la herramienta ya está activa, desactivarla
    if (activeTool === toolName) {
      onToolChange('select');
      return;
    }

    // Verificar si se puede aplicar inmediatamente
    let canApplyImmediate = false;
    if (type === 'fixed' && selectedNodes.length >= 1) canApplyImmediate = true;
    else if ((type === 'horizontal' || type === 'vertical') && selectedNodes.length >= 2) canApplyImmediate = true;
    else if (type === 'distance' && selectedNodes.length === 2) canApplyImmediate = true;

    if (canApplyImmediate) {
      // Aplicación Inmediata
      if (type === 'fixed') {
        selectedNodes.forEach(nodeId => {
          onAddConstraint({ type: 'fixed', nodes: [nodeId], enabled: true });
        });
        toast.success(`${selectedNodes.length} nodo(s) fijado(s)`);
      } else if (type === 'horizontal' || type === 'vertical') {
        onAddConstraint({ type, nodes: [...selectedNodes], enabled: true });
        toast.success(`Restricción ${type === 'horizontal' ? 'horizontal' : 'vertical'} añadida`);
      } else if (type === 'distance') {
        const [nodeA, nodeB] = selectedNodes;
        const posA = vertices[nodeA];
        const posB = vertices[nodeB];
        if (posA && posB) {
          const dist = Math.sqrt(Math.pow(posB.x - posA.x, 2) + Math.pow(posB.y - posA.y, 2));
          onAddConstraint({ type: 'distance', nodes: [nodeA, nodeB], value: Number(dist.toFixed(1)), enabled: true });
          toast.success(`Restricción de distancia: ${dist.toFixed(1)}cm`);
        }
      }
      // Volver a selección después de aplicar inmediatamente
      onToolChange('select');
    } else {
      // Activar Modo Herramienta
      onToolChange(toolName);
      const msg = type === 'fixed' ? "Selecciona nodos para fijar" :
                  type === 'distance' ? "Selecciona 2 nodos para medir distancia" :
                  "Selecciona 2 o más nodos para alinear";
      toast.info(msg);
    }
  };

  return (
    <TooltipProvider delayDuration={400}>
      <Card className="border-zinc-700 bg-zinc-900/50">
        <CardContent className="p-2 flex flex-col gap-2">
          {/* FILA 1: HERRAMIENTAS DE SELECCIÓN Y EDICIÓN */}
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'select' ? "default" : "outline"}
                  size="icon"
                  onClick={() => onToolChange('select')}
                  className={cn("h-8 w-8", activeTool === 'select' && "bg-primary text-primary-foreground")}
                >
                  <MousePointer2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>Seleccionar (V)</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'node' ? "default" : "outline"}
                  size="icon"
                  onClick={() => onToolChange('node')}
                  className={cn("h-8 w-8", activeTool === 'node' && "bg-primary text-primary-foreground")}
                >
                  <CircleDot className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>Herramienta Nodo (N)</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* FILA 2: RESTRICCIONES */}
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleConstraintClick('fixed')}
                  size="icon"
                  variant={activeTool === 'constraint_fixed' ? "default" : "outline"}
                  className={cn("h-8 w-8", activeTool === 'constraint_fixed' && "bg-primary text-primary-foreground")}
                >
                  <Lock className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>Fijar (Selecciona nodo)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleConstraintClick('horizontal')}
                  size="icon"
                  variant={activeTool === 'constraint_horizontal' ? "default" : "outline"}
                  className={cn("h-8 w-8", activeTool === 'constraint_horizontal' && "bg-primary text-primary-foreground")}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>Horizontal (Selecciona 2+ nodos)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleConstraintClick('vertical')}
                  size="icon"
                  variant={activeTool === 'constraint_vertical' ? "default" : "outline"}
                  className={cn("h-8 w-8", activeTool === 'constraint_vertical' && "bg-primary text-primary-foreground")}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>Vertical (Selecciona 2+ nodos)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleConstraintClick('distance')}
                  size="icon"
                  variant={activeTool === 'constraint_distance' ? "default" : "outline"}
                  className={cn("h-8 w-8", activeTool === 'constraint_distance' && "bg-primary text-primary-foreground")}
                >
                  <Ruler className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>Distancia (Selecciona 2 nodos)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
