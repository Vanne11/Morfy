import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  PenTool, 
  MousePointer2, 
  Lock, 
  ArrowLeftRight, 
  ArrowUpDown, 
  Ruler, 
  DraftingCompass, 
  Eraser,
  Square,
  Circle,
  Hexagon,
  Component
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type Constraint, type Dimension, type Vertex2D } from "@/utils/constraintSolver";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

export type ToolType = 'select' | 'node' | 'eraser' | 'constraint_fixed' | 'constraint_horizontal' | 'constraint_vertical' | 'dimension_linear' | 'dimension_angular' | 'rect' | 'circle' | 'polygon' | 'array';

interface ToolsPanelProps {
  activeTool: ToolType;
  selectedNodes: string[];
  selectedLines: Array<{ from: string; to: string }>;
  vertices: Record<string, Vertex2D>;
  onToolChange: (tool: ToolType) => void;
  onAddConstraint: (constraint: Omit<Constraint, 'id'>) => void;
  onAddDimension: (dimension: Omit<Dimension, 'id'>) => void;
}

export function ToolsPanel({ 
  activeTool, 
  selectedNodes,
  selectedLines,
  vertices,
  onToolChange,
  onAddConstraint,
  onAddDimension
}: ToolsPanelProps) {
  const { t } = useTranslation();

  const canAddHorizontal = selectedNodes.length >= 2;
  const canAddVertical = selectedNodes.length >= 2;
  const canAddFixed = selectedNodes.length >= 1;
  const canAddLinear = selectedNodes.length === 2;
  const canAddAngular = selectedLines.length === 2;

  const handleToolClick = (toolTarget: ToolType) => {
    // Si la herramienta ya está activa, desactivarla
    if (activeTool === toolTarget) {
      onToolChange('select');
      return;
    }

    let applied = false;

    // --- RESTRICCIONES ---
    if (toolTarget === 'constraint_fixed' && canAddFixed) {
      selectedNodes.forEach(nodeId => {
        onAddConstraint({ type: 'fixed', nodes: [nodeId], enabled: true });
      });
      toast.success(t("features.toolsPanel.toastFixed", { count: selectedNodes.length }));
      applied = true;
    } 
    else if (toolTarget === 'constraint_horizontal' && canAddHorizontal) {
      onAddConstraint({ type: 'horizontal', nodes: [...selectedNodes], enabled: true });
      toast.success(t("features.toolsPanel.toastHorizontalAdded"));
      applied = true;
    }
    else if (toolTarget === 'constraint_vertical' && canAddVertical) {
      onAddConstraint({ type: 'vertical', nodes: [...selectedNodes], enabled: true });
      toast.success(t("features.toolsPanel.toastVerticalAdded"));
      applied = true;
    }

    // --- DIMENSIONES ---
    else if (toolTarget === 'dimension_linear' && canAddLinear) {
      const [nodeA, nodeB] = selectedNodes;
      const posA = vertices[nodeA];
      const posB = vertices[nodeB];
      if (posA && posB) {
        const dist = Math.sqrt(Math.pow(posB.x - posA.x, 2) + Math.pow(posB.y - posA.y, 2));
        onAddDimension({
          type: 'linear',
          value: Number(dist.toFixed(1)),
          elements: { nodes: [nodeA, nodeB] },
          isParameter: false
        });
        toast.success(t("features.toolsPanel.toastLinearAdded", { value: dist.toFixed(1) }));
        applied = true;
      }
    }
    else if (toolTarget === 'dimension_angular' && canAddAngular) {
      const [l1, l2] = selectedLines;
      const p1a = vertices[l1.from];
      const p1b = vertices[l1.to];
      const p2a = vertices[l2.from];
      const p2b = vertices[l2.to];

      if (p1a && p1b && p2a && p2b) {
        const angle1 = Math.atan2(p1b.y - p1a.y, p1b.x - p1a.x);
        const angle2 = Math.atan2(p2b.y - p2a.y, p2b.x - p2a.x);
        let angleDiff = (angle2 - angle1) * (180 / Math.PI);
        
        // Normalizar ángulo positivo
        if (angleDiff < 0) angleDiff += 360;
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        onAddDimension({
          type: 'angular',
          value: Number(angleDiff.toFixed(1)),
          elements: { lines: [l1, l2] },
          isParameter: false
        });
        toast.success(t("features.toolsPanel.toastAngularAdded", { value: angleDiff.toFixed(1) }));
        applied = true;
      }
    }

    if (applied) {
      onToolChange('select');
    } else {
      // Activar modo herramienta
      onToolChange(toolTarget);
      
      let msg = "";
      switch (toolTarget) {
        case 'constraint_fixed': msg = t("features.toolsPanel.msgFixed"); break;
        case 'constraint_horizontal': msg = t("features.toolsPanel.msgHorizontal"); break;
        case 'constraint_vertical': msg = t("features.toolsPanel.msgVertical"); break;
        case 'dimension_linear': msg = t("features.toolsPanel.msgLinear"); break;
        case 'dimension_angular': msg = t("features.toolsPanel.msgAngular"); break;
        case 'eraser': msg = t("features.toolsPanel.msgEraser"); break;
        case 'rect': msg = t("features.toolsPanel.msgRect"); break;
        case 'circle': msg = t("features.toolsPanel.msgCircle"); break;
        case 'polygon': msg = t("features.toolsPanel.msgPolygon"); break;
        case 'array': msg = t("features.toolsPanel.msgArray"); break;
      }
      if (msg) toast.info(msg);
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
                <p>{t("features.toolsPanel.tooltipSelect")}</p>
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
                  <PenTool className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>{t("features.toolsPanel.tooltipNode")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'eraser' ? "default" : "outline"}
                  size="icon"
                  onClick={() => handleToolClick('eraser')}
                  className={cn("h-8 w-8", activeTool === 'eraser' && "bg-primary text-primary-foreground")}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>{t("features.toolsPanel.tooltipEraser")}</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1 bg-zinc-700" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'rect' ? "default" : "outline"}
                  size="icon"
                  onClick={() => onToolChange('rect')}
                  className={cn("h-8 w-8", activeTool === 'rect' && "bg-primary text-primary-foreground")}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>{t("features.toolsPanel.tooltipRect")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'circle' ? "default" : "outline"}
                  size="icon"
                  onClick={() => onToolChange('circle')}
                  className={cn("h-8 w-8", activeTool === 'circle' && "bg-primary text-primary-foreground")}
                >
                  <Circle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>{t("features.toolsPanel.tooltipCircle")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'polygon' ? "default" : "outline"}
                  size="icon"
                  onClick={() => onToolChange('polygon')}
                  className={cn("h-8 w-8", activeTool === 'polygon' && "bg-primary text-primary-foreground")}
                >
                  <Hexagon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>{t("features.toolsPanel.tooltipPolygon")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'array' ? "default" : "outline"}
                  size="icon"
                  onClick={() => onToolChange('array')}
                  className={cn("h-8 w-8", activeTool === 'array' && "bg-primary text-primary-foreground")}
                >
                  <Component className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>{t("features.toolsPanel.tooltipArray")}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* FILA 2: RESTRICCIONES Y DIMENSIONES */}
          <div className="flex gap-2 items-center">
            {/* RESTRICCIONES */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleToolClick('constraint_fixed')}
                  size="icon"
                  variant={activeTool === 'constraint_fixed' ? "default" : "outline"}
                  className={cn("h-8 w-8", activeTool === 'constraint_fixed' && "bg-primary text-primary-foreground")}
                >
                  <Lock className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>{t("features.toolsPanel.tooltipFixed")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleToolClick('constraint_horizontal')}
                  size="icon"
                  variant={activeTool === 'constraint_horizontal' ? "default" : "outline"}
                  className={cn("h-8 w-8", activeTool === 'constraint_horizontal' && "bg-primary text-primary-foreground")}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>{t("features.toolsPanel.tooltipHorizontal")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleToolClick('constraint_vertical')}
                  size="icon"
                  variant={activeTool === 'constraint_vertical' ? "default" : "outline"}
                  className={cn("h-8 w-8", activeTool === 'constraint_vertical' && "bg-primary text-primary-foreground")}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>{t("features.toolsPanel.tooltipVertical")}</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1 bg-zinc-700" />

            {/* DIMENSIONES */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleToolClick('dimension_linear')}
                  size="icon"
                  variant={activeTool === 'dimension_linear' ? "default" : "outline"}
                  className={cn("h-8 w-8", activeTool === 'dimension_linear' && "bg-primary text-primary-foreground")}
                >
                  <Ruler className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>{t("features.toolsPanel.tooltipLinear")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleToolClick('dimension_angular')}
                  size="icon"
                  variant={activeTool === 'dimension_angular' ? "default" : "outline"}
                  className={cn("h-8 w-8", activeTool === 'dimension_angular' && "bg-primary text-primary-foreground")}
                >
                  <DraftingCompass className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <p>{t("features.toolsPanel.tooltipAngular")}</p>
              </TooltipContent>
            </Tooltip>

          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
