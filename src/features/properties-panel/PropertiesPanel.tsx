import { useState } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, ChevronDown, ChevronUp, Info } from "lucide-react";
import type { SelectedObject } from "@/types";
import { useTranslation } from "react-i18next";
import { db } from "@/app/db";
import { computePersonalizedParams } from "@/features/templates/measurementAdapter";
import { TEMPLATE_REGISTRY } from "@/features/templates/registry";

interface PropertiesPanelProps {
  selectedObject: SelectedObject;
  parametricData?: any;
  onUpdateParams?: (newParams: any, uiValues?: any) => void;
}

export function PropertiesPanel({ selectedObject, parametricData, onUpdateParams }: PropertiesPanelProps) {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const currentCase = useLiveQuery(
    async () => {
      if (!projectId) return null;
      return await db.cases.get(projectId);
    },
    [projectId]
  );

  if (!selectedObject) {
    return (
      <div className="h-full p-4 bg-muted/30">
        <div className="text-center text-sm text-muted-foreground mt-10">
          {t("features.propertiesPanel.noModelSelected")}
        </div>
      </div>
    );
  }

  const hasAdvancedUI = !!parametricData?.ui_controls;
  const uiControls = parametricData?.ui_controls || [];
  const uiValues = parametricData?.ui_values || {};
  const params = parametricData?.params || {};
  const hasMeasurements = !!currentCase?.patientMeasurements;
  const measurements = currentCase?.patientMeasurements;

  const handleUIControlChange = (controlId: string, value: number) => {
    if (!onUpdateParams) return;
    const newUIValues = { ...uiValues, [controlId]: value };
    const newParams = { ...params };

    uiControls.forEach((control: any) => {
      const currentVal = newUIValues[control.id] ?? control.default;
      if (control.impacts) {
        Object.entries(control.impacts).forEach(([targetParam, impactConfig]: [string, any]) => {
          if (typeof impactConfig === 'object' && impactConfig.operation) {
            switch (impactConfig.operation) {
              case 'set':
                newParams[targetParam] = currentVal;
                break;
              case 'multiply':
                newParams[targetParam] = currentVal * impactConfig.value;
                break;
              case 'add':
                newParams[targetParam] = (params[targetParam] || 0) + currentVal;
                break;
              default:
                newParams[targetParam] = currentVal * (impactConfig.value || 1);
            }
          } else {
            newParams[targetParam] = currentVal * impactConfig;
          }
        });
      }
    });

    onUpdateParams(newParams, newUIValues);
  };

  const handleResetToMeasurements = () => {
    if (!onUpdateParams || !measurements || !currentCase?.templateId) return;
    const templateConfig = TEMPLATE_REGISTRY[currentCase.templateId];
    if (!templateConfig) return;

    const computed = computePersonalizedParams(
      currentCase.templateId,
      templateConfig.defaultParams,
      measurements
    );
    const newUIValues = { ...computed };
    onUpdateParams(computed, newUIValues);
  };

  // Separar controles clínicos de los técnicos
  const clinicalControls = uiControls.filter((c: any) => c.clinicalLabel);
  const technicalOnlyControls = uiControls.filter((c: any) => !c.clinicalLabel);

  return (
    <div className="h-full flex flex-col bg-muted/30 border-l">
      <div className="p-4">
        <h2 className="text-lg font-semibold">{t("features.propertiesPanel.clinicalAdjustment")}</h2>
        <p className="text-xs text-muted-foreground truncate">{selectedObject.name}</p>
      </div>
      <Separator />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Indicador de medidas del paciente */}
        {hasMeasurements && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {t("features.propertiesPanel.patientMeasurements") || "Medidas del paciente"}
                </span>
              </div>
              {measurements?.affectedSide && (
                <Badge variant="outline" className="text-[9px] border-emerald-300">
                  {measurements.affectedSide === 'right'
                    ? (t("features.createCaseModal.sideRight") || "Derecho")
                    : (t("features.createCaseModal.sideLeft") || "Izquierdo")
                  }
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
              {Object.entries(measurements || {})
                .filter(([k, v]) => typeof v === 'number' && k !== 'bodyRegion')
                .slice(0, 4)
                .map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-mono">{val as number}mm</span>
                  </div>
                ))
              }
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-[10px] gap-1 border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              onClick={handleResetToMeasurements}
            >
              <RotateCcw className="h-3 w-3" />
              {t("features.propertiesPanel.resetToMeasurements") || "Restablecer a medidas del paciente"}
            </Button>
          </div>
        )}

        {hasAdvancedUI ? (
          <div className="space-y-5">
            {/* Controles clínicos */}
            {clinicalControls.length > 0 && clinicalControls.map((control: any) => (
              <div key={control.id} className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium truncate block" title={control.clinicalLabel}>
                      {control.clinicalLabel}
                    </Label>
                    {control.clinicalHint && (
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 flex items-start gap-1">
                        <Info className="h-3 w-3 shrink-0 mt-0.5 opacity-50" />
                        {control.clinicalHint}
                      </p>
                    )}
                  </div>
                  <Input
                    type="number"
                    className="w-20 h-7 text-right px-2 py-0 text-xs font-mono bg-background"
                    value={uiValues[control.id] ?? control.default}
                    min={control.min}
                    max={control.max}
                    step={control.step || 0.1}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) handleUIControlChange(control.id, val);
                    }}
                  />
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

            {/* Controles sin clinicalLabel (siempre visibles si no hay clínicos) */}
            {clinicalControls.length === 0 && uiControls.map((control: any) => (
              <div key={control.id} className="space-y-2">
                <div className="flex justify-between items-center gap-4">
                  <Label className="text-sm font-medium flex-1 truncate" title={control.label}>{control.label}</Label>
                  <Input
                    type="number"
                    className="w-20 h-7 text-right px-2 py-0 text-xs font-mono bg-background"
                    value={uiValues[control.id] ?? control.default}
                    min={control.min}
                    max={control.max}
                    step={control.step || 0.1}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) handleUIControlChange(control.id, val);
                    }}
                  />
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

            {/* Toggle avanzado */}
            <button
              type="button"
              className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="font-bold uppercase tracking-widest">
                {t("features.propertiesPanel.technicalParams")}
              </span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdvanced && (
              <div className="space-y-4">
                {/* Controles técnicos sin label clínico */}
                {technicalOnlyControls.map((control: any) => (
                  <div key={control.id} className="space-y-2">
                    <div className="flex justify-between items-center gap-4">
                      <Label className="text-xs text-muted-foreground flex-1 truncate">{control.label}</Label>
                      <Input
                        type="number"
                        className="w-20 h-6 text-right px-2 py-0 text-[10px] font-mono bg-background"
                        value={uiValues[control.id] ?? control.default}
                        min={control.min}
                        max={control.max}
                        step={control.step || 0.1}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) handleUIControlChange(control.id, val);
                        }}
                      />
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

                {/* Params raw */}
                <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                  <h4 className="text-[10px] font-bold uppercase text-primary mb-2 tracking-widest">
                    {t("features.propertiesPanel.rawParams") || "Valores internos"}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                    {Object.entries(params)
                      .filter(([key, value]) => typeof value === 'number' && key !== 'color')
                      .map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground capitalize truncate" title={key.replace(/_/g, ' ')}>
                            {key.replace(/([A-Z])/g, ' $1')}
                          </Label>
                          <Input
                            type="number"
                            className="h-6 text-[10px] px-2 py-0 bg-background"
                            value={value as number}
                            step={0.1}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && onUpdateParams) {
                                onUpdateParams({ ...params, [key]: val }, uiValues);
                              }
                            }}
                          />
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            {t("features.propertiesPanel.noAdvancedControls")}
          </div>
        )}

        {/* Color */}
        <div className="space-y-3 pt-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest">{t("features.propertiesPanel.appearance")}</Label>
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
