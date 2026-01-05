import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Ruler, ArrowLeftRight, ArrowUpDown, RotateCw, Trash2, RefreshCw } from "lucide-react";
import {
  type Dimension,
  type Vertex2D,
  constraintSolver
} from "@/utils/constraintSolver";

interface DimensionsPanelProps {
  dimensions: Dimension[];
  selectedNodes: string[];
  selectedLines: Array<{ from: string; to: string }>;
  vertices: Record<string, Vertex2D>;
  onAddDimension: (dimension: Omit<Dimension, 'id'>) => void;
  onUpdateDimension: (id: string, value: number) => void;
  onRemoveDimension: (id: string) => void;
  onToggleDimensionParameter: (id: string) => void;
  onInvertAngle: (id: string) => void;
}

interface DimensionInputProps {
  dimension: Dimension;
  vertices: Record<string, Vertex2D>;
  onUpdate: (id: string, value: number) => void;
}

function DimensionInput({ dimension, vertices, onUpdate }: DimensionInputProps) {
  const [localValue, setLocalValue] = useState<string>(
    (typeof dimension.value === 'number' ? dimension.value : 0).toString()
  );

  // Actualizar el valor local si la dimensión cambia externamente
  useEffect(() => {
    setLocalValue((typeof dimension.value === 'number' ? dimension.value : 0).toString());
  }, [dimension.value]);

  const currentValue = constraintSolver.calculateDimensionValue(dimension, vertices);

  const handleApply = () => {
    const val = parseFloat(localValue);
    if (!isNaN(val)) {
      onUpdate(dimension.id, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span>Actual: {currentValue.toFixed(1)}cm</span>
        <span>Objetivo: {typeof dimension.value === 'number' ? dimension.value.toFixed(1) : 0}cm</span>
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          step="0.1"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs font-mono"
        />
        <Button
          onClick={handleApply}
          size="sm"
          variant="default"
          className="h-7 px-2 text-xs"
          title="Aplicar dimensión"
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
}

export function DimensionsPanel({
  dimensions,
  selectedNodes,
  selectedLines,
  vertices,
  onAddDimension,
  onUpdateDimension,
  onRemoveDimension,
  onToggleDimensionParameter,
  onInvertAngle
}: DimensionsPanelProps) {
  const canAddLinear = selectedNodes.length === 2 || selectedLines.length === 1;
  const canAddAngular = selectedLines.length === 2;

  const addDimension = (type: Dimension['type']) => {
    if (type === 'linear' && (selectedNodes.length === 2 || selectedLines.length === 1)) {
      let nodeA: string, nodeB: string;

      if (selectedLines.length === 1) {
        nodeA = selectedLines[0].from;
        nodeB = selectedLines[0].to;
      } else {
        [nodeA, nodeB] = selectedNodes;
      }

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
      }
    } else if (type === 'angular' && selectedLines.length === 2) {
      const [line1, line2] = selectedLines;

      const pos1A = vertices[line1.from];
      const pos1B = vertices[line1.to];
      const pos2A = vertices[line2.from];
      const pos2B = vertices[line2.to];

      if (!pos1A || !pos1B || !pos2A || !pos2B) {
        toast.error('No se pueden encontrar todos los vértices de las líneas');
        return;
      }

      // Buscar vértice común (pivote)
      let pivot: Vertex2D | null = null;
      let other1: Vertex2D | null = null;
      let other2: Vertex2D | null = null;

      if (line1.from === line2.from) { pivot = pos1A; other1 = pos1B; other2 = pos2B; }
      else if (line1.from === line2.to) { pivot = pos1A; other1 = pos1B; other2 = pos2A; }
      else if (line1.to === line2.from) { pivot = pos1B; other1 = pos1A; other2 = pos2B; }
      else if (line1.to === line2.to) { pivot = pos1B; other1 = pos1A; other2 = pos2A; }

      if (!pivot || !other1 || !other2) {
        toast.error('Las líneas deben compartir un vértice común');
        return;
      }

      // Calcular vectores desde el pivote
      const v1 = { x: other1.x - pivot.x, y: other1.y - pivot.y };
      const v2 = { x: other2.x - pivot.x, y: other2.y - pivot.y };
      
      const mag1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
      const mag2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);
      
      let angleDegrees = 0;
      if (mag1 > 0 && mag2 > 0) {
        const dot = v1.x * v2.x + v1.y * v2.y;
        const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        angleDegrees = Math.acos(cosTheta) * 180 / Math.PI;
      }

      onAddDimension({
        type: 'angular',
        elements: {
          lines: [line1, line2]
        },
        value: Number(angleDegrees.toFixed(1)),
        isParameter: false,
        inverted: false
      });
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
                        {dimension.type === 'angular' && (
                          <Button
                            onClick={() => onInvertAngle(dimension.id)}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            title="Invertir lado del ángulo"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
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

                    <DimensionInput
                      dimension={dimension}
                      vertices={vertices}
                      onUpdate={onUpdateDimension}
                    />

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
