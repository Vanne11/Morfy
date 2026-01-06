import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Code, Trash2, BoxSelect } from "lucide-react";
import { evaluateExpression } from "@/utils/paramEvaluator";
import { useTranslation } from "react-i18next";

interface Vertex {
  id: string;
  x: number | string;
  y: number | string;
}

interface VisualGeometryEditorProps {
  geometry: any;
  onChange: (newGeometry: any) => void;
  params: Record<string, any>;
}

export function VisualGeometryEditor({ geometry, onChange, params }: VisualGeometryEditorProps) {
  const { t } = useTranslation();
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [contours, setContours] = useState<any[]>([]);
  const [editMode, setEditMode] = useState<'number' | 'expression'>('number');

  // Sincronizar desde geometry a state local
  useEffect(() => {
    if (geometry?.vertices) {
      const verts: Vertex[] = Object.entries(geometry.vertices).map(([id, coord]: [string, any]) => ({
        id,
        x: coord.x,
        y: coord.y,
      }));
      setVertices(verts);
    }

    if (geometry?.contours) {
      setContours(geometry.contours);
    }
  }, [geometry]);

  // Actualizar geometry cuando cambia el state local
  const updateGeometry = (newVertices: Vertex[], newContours: any[]) => {
    const verticesObj: Record<string, any> = {};
    newVertices.forEach(v => {
      verticesObj[v.id] = { x: v.x, y: v.y };
    });

    const newGeometry = {
      ...geometry,
      vertices: verticesObj,
      contours: newContours,
    };

    onChange(newGeometry);
  };

  const updateVertex = (id: string, field: 'x' | 'y', value: string) => {
    const newVertices = vertices.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    );
    setVertices(newVertices);
    updateGeometry(newVertices, contours);
  };

  const removeContour = (id: string) => {
    // ELIMINAR EL PERÍMETRO Y SUS NODOS
    const nodesToRemove = vertices.filter(v => v.id.startsWith(id + "n")).map(v => v.id);
    const newVertices = vertices.filter(v => !v.id.startsWith(id + "n"));
    const newContours = contours.filter(c => c.id !== id);

    setVertices(newVertices);
    setContours(newContours);
    updateGeometry(newVertices, newContours);
    toast.success(t("features.templateEditor.toastContourDeleted", { id, count: nodesToRemove.length }));
  };

  return (
    <Card className="border-zinc-700">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm flex items-center gap-2">
            <BoxSelect className="h-4 w-4 text-primary" />
            {t("features.templateEditor.coordsTitle")}
          </CardTitle>
          <Button
            onClick={() => setEditMode(editMode === 'number' ? 'expression' : 'number')}
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] gap-1"
          >
            <Code className="h-3 w-3" />
            {editMode === 'number' ? t("features.templateEditor.modeExpr") : t("features.templateEditor.modeNum")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {contours.map((contour) => {
            const contourNodes = vertices.filter(v => v.id.startsWith(contour.id + "n"));
            return (
              <div key={contour.id} className="space-y-2 border border-zinc-800 rounded-md p-2 bg-zinc-900/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="font-bold text-xs flex items-center gap-2">
                      <span className="bg-primary/20 text-primary px-1.5 rounded">{contour.id}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {contourNodes.length} {t("features.templateEditor.nodes")} · {contour.closed ? t("features.templateEditor.closed") : t("features.templateEditor.open")}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeContour(contour.id)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* NODOS DEL PERÍMETRO */}
                <div className="space-y-1">
                  {contourNodes.map((vertex) => {
                    const evaluatedX = typeof vertex.x === 'string' && vertex.x.includes('params')
                      ? evaluateExpression(vertex.x, params)
                      : vertex.x;
                    const evaluatedY = typeof vertex.y === 'string' && vertex.y.includes('params')
                      ? evaluateExpression(vertex.y, params)
                      : vertex.y;

                    return (
                      <div
                        key={vertex.id}
                        className="flex items-center gap-2 text-[10px]"
                      >
                        <div className="font-mono text-zinc-500 w-8 text-right shrink-0">
                          {vertex.id.replace(contour.id, '')}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="relative">
                            <span className="absolute left-1.5 top-1 text-zinc-500 font-mono">x</span>
                            <Input
                              type={editMode === 'number' ? 'number' : 'text'}
                              step="0.1"
                              value={vertex.x}
                              onChange={(e) => updateVertex(vertex.id, 'x', e.target.value)}
                              className="h-6 pl-4 text-[10px] font-mono bg-zinc-950/50"
                              placeholder={editMode === 'number' ? '0' : 'params.valor'}
                            />
                            {editMode === 'expression' && typeof evaluatedX === 'number' && (
                              <div className="absolute right-1 top-1 text-[8px] text-emerald-500 pointer-events-none">
                                = {evaluatedX.toFixed(1)}
                              </div>
                            )}
                          </div>
                          <div className="relative">
                            <span className="absolute left-1.5 top-1 text-zinc-500 font-mono">y</span>
                            <Input
                              type={editMode === 'number' ? 'number' : 'text'}
                              step="0.1"
                              value={vertex.y}
                              onChange={(e) => updateVertex(vertex.id, 'y', e.target.value)}
                              className="h-6 pl-4 text-[10px] font-mono bg-zinc-950/50"
                              placeholder={editMode === 'number' ? '0' : 'params.valor'}
                            />
                            {editMode === 'expression' && typeof evaluatedY === 'number' && (
                              <div className="absolute right-1 top-1 text-[8px] text-emerald-500 pointer-events-none">
                                = {evaluatedY.toFixed(1)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {contours.length === 0 && (
            <div className="text-center text-muted-foreground text-xs py-4">
              {t("features.templateEditor.noGeometry")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
