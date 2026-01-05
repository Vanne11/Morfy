import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Code, Plus, Trash2 } from "lucide-react";
import { evaluateExpression } from "@/utils/paramEvaluator";

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
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [contours, setContours] = useState<any[]>([]);
  const [numNodesInput, setNumNodesInput] = useState("");
  const [showAddPerimeterDialog, setShowAddPerimeterDialog] = useState(false);
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

  const handleAddPerimeter = () => {
    const numNodes = parseInt(numNodesInput);
    if (!numNodes || numNodes < 3) {
      toast.error("El perímetro necesita al menos 3 nodos");
      return;
    }

    // AUTO-GENERAR NOMBRE: p1 para el primero, p2, p3... para los demás
    const pIndex = contours.length + 1;
    const perimeterId = `p${pIndex}`;

    // CREAR LOS NODOS DISTRIBUYENDO EN CÍRCULO
    const newVertices = [];
    const elements = [];

    // Tamaño inicial razonable para dedos (5cm de radio)
    const radius = 5;
    const centerX = 0;
    const centerY = 0;

    for (let i = 0; i < numNodes; i++) {
      const nodeId = `${perimeterId}n${i + 1}`;

      // Distribuir nodos en círculo
      const angle = (i / numNodes) * 2 * Math.PI - Math.PI / 2; // Empezar arriba
      const x = (centerX + radius * Math.cos(angle)).toFixed(1);
      const y = (centerY + radius * Math.sin(angle)).toFixed(1);

      newVertices.push({ id: nodeId, x, y });

      const nextIndex = (i + 1) % numNodes;
      const nextNodeId = `${perimeterId}n${nextIndex + 1}`;
      elements.push({ type: "line", from: nodeId, to: nextNodeId });
    }

    const newContour = {
      id: perimeterId,
      type: contours.length === 0 ? "outer" : "hole",
      closed: true,
      elements,
    };

    const allVertices = [...vertices, ...newVertices];
    const allContours = [...contours, newContour];

    setVertices(allVertices);
    setContours(allContours);
    updateGeometry(allVertices, allContours);

    setShowAddPerimeterDialog(false);
    setNumNodesInput("");
    toast.success(`Perímetro "${perimeterId}" creado con ${numNodes} nodos`);
  };

  const removeContour = (id: string) => {
    // ELIMINAR EL PERÍMETRO Y SUS NODOS
    const nodesToRemove = vertices.filter(v => v.id.startsWith(id + "n")).map(v => v.id);
    const newVertices = vertices.filter(v => !v.id.startsWith(id + "n"));
    const newContours = contours.filter(c => c.id !== id);

    setVertices(newVertices);
    setContours(newContours);
    updateGeometry(newVertices, newContours);
    toast.success(`Perímetro "${id}" y sus ${nodesToRemove.length} nodos eliminados`);
  };

  return (
    <div className="space-y-4">
      {/* SECCIÓN PERÍMETROS */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <Label className="text-sm font-bold text-primary">Perímetros</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Conecta nodos para formar contornos cerrados
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setEditMode(editMode === 'number' ? 'expression' : 'number')}
              size="sm"
              variant="outline"
              className="gap-2 h-8"
            >
              <Code className="h-3 w-3" />
              {editMode === 'number' ? 'Modo Expresión' : 'Modo Número'}
            </Button>
            <Button
              onClick={() => setShowAddPerimeterDialog(!showAddPerimeterDialog)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-3 w-3" />
              Crear Perímetro
            </Button>
          </div>
        </div>

        {showAddPerimeterDialog && (
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">¿Cuántos nodos?</Label>
                <Input
                  type="number"
                  min="3"
                  value={numNodesInput}
                  onChange={(e) => setNumNodesInput(e.target.value)}
                  placeholder="Mínimo 3 nodos"
                  className="h-9"
                />
                {numNodesInput && parseInt(numNodesInput) > 0 && (
                  <div className="bg-muted rounded p-2">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      Se creará: <span className="text-primary font-bold">
                        {`p${contours.length + 1}`}
                      </span> con {numNodesInput} nodos
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddPerimeter} size="sm" className="flex-1">
                  Crear
                </Button>
                <Button
                  onClick={() => {
                    setShowAddPerimeterDialog(false);
                    setNumNodesInput("");
                  }}
                  size="sm"
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {contours.map((contour) => {
            const contourNodes = vertices.filter(v => v.id.startsWith(contour.id + "n"));
            return (
              <div key={contour.id} className="space-y-2">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="space-y-1 flex-1">
                        <div className="font-bold text-sm">{contour.id}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {contourNodes.length} nodos · {contour.closed ? "Cerrado" : "Abierto"}
                        </div>
                      </div>
                      <Button
                        onClick={() => removeContour(contour.id)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* NODOS DEL PERÍMETRO */}
                    <div className="space-y-1.5">
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
                            className="bg-muted/50 border rounded p-2 flex items-center gap-2"
                          >
                            <div className="bg-primary text-primary-foreground font-bold rounded px-2 py-0.5 text-[10px] min-w-[70px] text-center">
                              {vertex.id}
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div className="space-y-0.5">
                                <Label className="text-[9px] text-muted-foreground uppercase flex justify-between">
                                  <span>X (cm)</span>
                                  {editMode === 'expression' && typeof evaluatedX === 'number' && (
                                    <span className="text-emerald-500">= {evaluatedX.toFixed(1)}</span>
                                  )}
                                </Label>
                                <Input
                                  type={editMode === 'number' ? 'number' : 'text'}
                                  step="0.1"
                                  value={vertex.x}
                                  onChange={(e) => updateVertex(vertex.id, 'x', e.target.value)}
                                  className="h-7 text-xs font-mono"
                                  placeholder={editMode === 'number' ? '0' : 'params.valor'}
                                />
                              </div>
                              <div className="space-y-0.5">
                                <Label className="text-[9px] text-muted-foreground uppercase flex justify-between">
                                  <span>Y (cm)</span>
                                  {editMode === 'expression' && typeof evaluatedY === 'number' && (
                                    <span className="text-emerald-500">= {evaluatedY.toFixed(1)}</span>
                                  )}
                                </Label>
                                <Input
                                  type={editMode === 'number' ? 'number' : 'text'}
                                  step="0.1"
                                  value={vertex.y}
                                  onChange={(e) => updateVertex(vertex.id, 'y', e.target.value)}
                                  className="h-7 text-xs font-mono"
                                  placeholder={editMode === 'number' ? '0' : 'params.valor'}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
          {contours.length === 0 && (
            <div className="text-center text-muted-foreground text-xs py-8 border-2 border-dashed rounded-lg bg-muted/20">
              No hay perímetros. Crea uno para empezar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
