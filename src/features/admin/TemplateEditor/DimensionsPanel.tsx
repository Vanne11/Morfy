import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, ArrowLeftRight, ArrowUpDown, Trash2, RefreshCw } from "lucide-react";
import {
  type Dimension,
  type Vertex2D,
  constraintSolver
} from "@/utils/constraintSolver";

interface DimensionsPanelProps {
  dimensions: Dimension[];
  vertices: Record<string, Vertex2D>;
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
    if (typeof dimension.value === 'number') {
      setLocalValue(dimension.value.toString());
    }
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

  const isParameter = typeof dimension.value === 'string';
  const targetDisplay = isParameter
    ? (dimension.label ? `Parámetro: ${dimension.label}` : dimension.value)
    : `${(dimension.value as number).toFixed(1)}cm`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span>Actual: {currentValue.toFixed(1)}cm</span>
        <span>Objetivo: {targetDisplay}</span>
      </div>
      
      {isParameter ? (
        <div className="text-[10px] text-primary font-mono italic bg-primary/10 p-1 rounded px-2">
          Controlado por {dimension.label || 'parámetro'}
        </div>
      ) : (
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
      )}
    </div>
  );
}

export function DimensionsPanel({
  dimensions,
  vertices,
  onUpdateDimension,
  onRemoveDimension,
  onToggleDimensionParameter,
  onInvertAngle
}: DimensionsPanelProps) {

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
        {/* LISTA DE DIMENSIONES */}
        {dimensions.length > 0 ? (
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
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground text-center py-2">
            No hay dimensiones activas
          </div>
        )}
      </CardContent>
    </Card>
  );
}
