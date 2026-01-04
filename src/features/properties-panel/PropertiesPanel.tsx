import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import type { SelectedObject } from "@/types";

interface PropertiesPanelProps {
  selectedObject: SelectedObject;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parametricData?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateParams?: (newParams: any, uiValues?: any) => void;
}

export function PropertiesPanel({ selectedObject, parametricData, onUpdateParams }: PropertiesPanelProps) {
  if (!selectedObject) {
    return (
      <div className="h-full p-4 bg-muted/30">
        <div className="text-center text-sm text-muted-foreground mt-10">
          Selecciona un modelo para ver sus propiedades.
        </div>
      </div>
    );
  }

  // Si tiene ui_controls, usamos la nueva lógica calculada
  const hasAdvancedUI = !!parametricData?.ui_controls;
  const uiControls = parametricData?.ui_controls || [];
  const uiValues = parametricData?.ui_values || {}; // Valores actuales de los sliders de usuario
  const params = parametricData?.params || {};

  const handleUIControlChange = (controlId: string, value: number) => {
      if (!onUpdateParams) return;

      // 1. Actualizar los valores de la UI
      const newUIValues = { ...uiValues, [controlId]: value };

      // 2. Recalcular los parámetros técnicos con el nuevo sistema de impacts
      const newParams = { ...params };

      uiControls.forEach((control: any) => {
          const currentVal = newUIValues[control.id] ?? control.default;
          if (control.impacts) {
              Object.entries(control.impacts).forEach(([targetParam, impactConfig]: [string, any]) => {
                  // Nuevo sistema: impacts puede ser objeto con { operation, value }
                  // o número directo (legacy: weight)
                  if (typeof impactConfig === 'object' && impactConfig.operation) {
                      switch (impactConfig.operation) {
                          case 'set':
                              // Asignar directamente el valor del slider
                              newParams[targetParam] = currentVal;
                              break;
                          case 'multiply':
                              // Multiplicar slider por valor base
                              newParams[targetParam] = currentVal * impactConfig.value;
                              break;
                          case 'add':
                              // Sumar slider a valor base
                              newParams[targetParam] = (params[targetParam] || 0) + currentVal;
                              break;
                          default:
                              console.warn(`Operación desconocida: ${impactConfig.operation}`);
                              newParams[targetParam] = currentVal * (impactConfig.value || 1);
                      }
                  } else {
                      // Legacy: es un número directo (weight)
                      newParams[targetParam] = currentVal * impactConfig;
                  }
              });
          }
      });

      onUpdateParams(newParams, newUIValues);
  };

  return (
    <div className="h-full flex flex-col bg-muted/30 border-l">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Ajuste Clínico</h2>
        <p className="text-xs text-muted-foreground truncate">{selectedObject.name}</p>
      </div>
      <Separator />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {hasAdvancedUI ? (
            <div className="space-y-6">
                {uiControls.map((control: any) => (
                    <div key={control.id} className="space-y-3">
                        <div className="flex justify-between items-end">
                            <Label className="text-sm font-medium">{control.label}</Label>
                            <span className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border shadow-sm">
                                {uiValues[control.id] ?? control.default}
                            </span>
                        </div>
                        <Slider 
                            min={control.min} 
                            max={control.max} 
                            step={control.step || 0.1}
                            value={[uiValues[control.id] ?? control.default]}
                            onValueChange={(val) => handleUIControlChange(control.id, val[0])}
                        />
                    </div>
                ))}
                
                <Separator />
                
                <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                    <h4 className="text-[10px] font-bold uppercase text-primary mb-2 tracking-widest">Parámetros Técnicos</h4>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        {Object.entries(params)
                            .filter(([key, value]) => typeof value === 'number' && key !== 'color')
                            .map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                                    <span>{(value as number).toFixed(1)}</span>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        ) : (
            <div className="text-sm text-muted-foreground italic">
                Esta plantilla no define controles clínicos avanzados.
            </div>
        )}

        <div className="space-y-3 pt-4">
            <Label className="text-xs text-muted-foreground uppercase tracking-widest">Apariencia</Label>
            <div className="flex gap-2 items-center">
                <Input 
                    type="color" 
                    className="w-10 h-8 p-0 border-0 bg-transparent cursor-pointer"
                    value={params.color || "#3b82f6"}
                    onChange={(e) => onUpdateParams && onUpdateParams({...params, color: e.target.value}, uiValues)}
                />
                <span className="text-xs font-mono">{params.color}</span>
            </div>
        </div>
      </div>
    </div>
  );
}
