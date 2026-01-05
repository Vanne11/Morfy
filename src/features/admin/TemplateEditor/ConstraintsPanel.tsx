import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ArrowLeftRight, ArrowUpDown, Ruler, Cable, Trash2 } from "lucide-react";
import { type Constraint } from "@/utils/constraintSolver";

interface ConstraintsPanelProps {
  constraints: Constraint[];
  onToggleConstraint: (id: string) => void;
  onRemoveConstraint: (id: string) => void;
}

export function ConstraintsPanel({
  constraints,
  onToggleConstraint,
  onRemoveConstraint
}: ConstraintsPanelProps) {

  const getConstraintIcon = (type: Constraint['type']) => {
    switch (type) {
      case 'fixed': return <Lock className="h-3 w-3" />;
      case 'horizontal': return <ArrowLeftRight className="h-3 w-3" />;
      case 'vertical': return <ArrowUpDown className="h-3 w-3" />;
      case 'distance': return <Ruler className="h-3 w-3" />;
      default: return <Cable className="h-3 w-3" />;
    }
  };

  const getConstraintLabel = (constraint: Constraint) => {
    switch (constraint.type) {
      case 'fixed':
        return `Fijo: ${constraint.nodes[0]}`;
      case 'horizontal':
        return `Horizontal: ${constraint.nodes.join(', ')}`;
      case 'vertical':
        return `Vertical: ${constraint.nodes.join(', ')}`;
      case 'distance':
        return `Distancia: ${constraint.nodes.join(' ↔ ')} = ${constraint.value}cm`;
      default:
        return constraint.type;
    }
  };

  return (
    <Card className="border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          Restricciones ({constraints.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* LISTA DE RESTRICCIONES */}
        {constraints.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-zinc-400">
              Restricciones Activas
            </Label>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {constraints.map(constraint => (
                <div
                  key={constraint.id}
                  className={`bg-muted/50 border rounded p-2 flex items-center gap-2 ${
                    !constraint.enabled ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex-1 flex items-center gap-2">
                    {getConstraintIcon(constraint.type)}
                    <span className="text-[10px] font-mono">
                      {getConstraintLabel(constraint)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => onToggleConstraint(constraint.id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      title={constraint.enabled ? 'Desactivar' : 'Activar'}
                    >
                      {constraint.enabled ? '👁️' : '👁️‍🗨️'}
                    </Button>
                    <Button
                      onClick={() => onRemoveConstraint(constraint.id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground text-center py-2">
            No hay restricciones activas
          </div>
        )}
      </CardContent>
    </Card>
  );
}
