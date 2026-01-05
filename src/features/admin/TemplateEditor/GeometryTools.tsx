import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shapes, Pentagon, Square } from "lucide-react";

interface GeometryToolsProps {
  onCreateShape: (shape: any) => void;
}

export function GeometryTools({ onCreateShape }: GeometryToolsProps) {
  const [shapeRadius, setShapeRadius] = useState("5");
  const [shapeSides, setShapeSides] = useState("6");
  const [rectWidth, setRectWidth] = useState("10");
  const [rectHeight, setRectHeight] = useState("5");

  return (
    <Card className="border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shapes className="h-4 w-4 text-primary" />
          Formas Predefinidas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* CÍRCULO/POLÍGONO REGULAR */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Polígono Regular</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              min="3"
              value={shapeSides}
              onChange={(e) => setShapeSides(e.target.value)}
              placeholder="Lados"
              className="h-7 text-xs"
            />
            <Input
              type="number"
              step="0.1"
              value={shapeRadius}
              onChange={(e) => setShapeRadius(e.target.value)}
              placeholder="Radio"
              className="h-7 text-xs"
            />
            <Button
              onClick={() => {
                onCreateShape({
                  type: 'polygon',
                  sides: parseInt(shapeSides) || 6,
                  radius: parseFloat(shapeRadius) || 5,
                });
              }}
              size="sm"
              className="h-7 text-xs gap-1"
            >
              <Pentagon className="h-3 w-3" />
              Crear
            </Button>
          </div>
        </div>

        {/* RECTÁNGULO */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Rectángulo</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              step="0.1"
              value={rectWidth}
              onChange={(e) => setRectWidth(e.target.value)}
              placeholder="Ancho"
              className="h-7 text-xs"
            />
            <Input
              type="number"
              step="0.1"
              value={rectHeight}
              onChange={(e) => setRectHeight(e.target.value)}
              placeholder="Alto"
              className="h-7 text-xs"
            />
            <Button
              onClick={() => {
                onCreateShape({
                  type: 'rectangle',
                  width: parseFloat(rectWidth) || 10,
                  height: parseFloat(rectHeight) || 5,
                });
              }}
              size="sm"
              className="h-7 text-xs gap-1"
            >
              <Square className="h-3 w-3" />
              Crear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
