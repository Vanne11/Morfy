import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Move, Minus, Maximize2, RotateCw, FlipHorizontal, FlipVertical, Circle } from "lucide-react";

interface TransformationPanelProps {
  selectedNodes: string[];
  vertices: Record<string, { x: number | string; y: number | string }>;
  onTransform: (transformation: any) => void;
  onClearSelection: () => void;
}

export function TransformationPanel({ selectedNodes, onTransform, onClearSelection }: TransformationPanelProps) {
  const [translateX, setTranslateX] = useState("0");
  const [translateY, setTranslateY] = useState("0");
  const [scaleValue, setScaleValue] = useState("1");
  const [rotateAngle, setRotateAngle] = useState("0");

  if (selectedNodes.length === 0) {
    return null;
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
