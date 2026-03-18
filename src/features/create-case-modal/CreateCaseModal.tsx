import { useState, useMemo } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { db } from "@/app/db";
import type { Case, PatientMeasurements, BodyRegion } from "@/types";
import { useTranslation } from "react-i18next";
import {
  TEMPLATE_REGISTRY,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
} from "@/features/templates/registry";
import { SIZE_PRESETS, SIZE_LABELS, categoryToRegion, type SizeLabel } from "@/features/templates/sizePresets";
import { computePersonalizedParams } from "@/features/templates/measurementAdapter";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, User, Ruler, LayoutGrid, Eye } from "lucide-react";

interface CreateCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Campos de medidas por región corporal
const MEASUREMENT_FIELDS: Record<BodyRegion, { key: keyof PatientMeasurements; label: string; hint: string; min: number; max: number }[]> = {
  hand: [
    { key: 'wristCircumference',   label: 'Circunferencia de muñeca',    hint: 'Mide alrededor de la muñeca, justo sobre la prominencia cubital', min: 100, max: 250 },
    { key: 'forearmCircumference', label: 'Circunferencia de antebrazo', hint: 'Mide en la parte más ancha del antebrazo, ~5cm bajo el codo',       min: 150, max: 350 },
    { key: 'forearmLength',        label: 'Largo del antebrazo',         hint: 'Desde el codo hasta la muñeca (cara anterior)',                      min: 150, max: 350 },
    { key: 'palmWidth',            label: 'Ancho de palma',              hint: 'De borde a borde, a la altura de los nudillos',                      min: 50,  max: 120 },
    { key: 'handLength',           label: 'Largo de mano',               hint: 'Desde la muñeca hasta la punta del dedo medio',                     min: 120, max: 250 },
  ],
  fingers: [
    { key: 'fingerCircumference', label: 'Circunferencia del dedo',  hint: 'Mide alrededor de la falange proximal del dedo afectado', min: 35, max: 100 },
    { key: 'fingerLength',        label: 'Largo del dedo',           hint: 'Desde la base (nudillo) hasta la punta',                  min: 40, max: 110 },
    { key: 'wristCircumference',  label: 'Circunferencia de muñeca', hint: 'Necesario para férulas que incluyen la muñeca (Spica)',    min: 100, max: 250 },
  ],
  foot: [
    { key: 'ankleCircumference', label: 'Circunferencia de tobillo',    hint: 'Mide alrededor del tobillo, sobre los maléolos',             min: 150, max: 350 },
    { key: 'calfCircumference',  label: 'Circunferencia de pantorrilla', hint: 'Mide en la parte más ancha de la pantorrilla',              min: 220, max: 500 },
    { key: 'footLength',         label: 'Largo del pie',                hint: 'Desde el talón hasta la punta del dedo más largo',           min: 180, max: 350 },
    { key: 'toeCircumference',   label: 'Circunferencia del dedo',      hint: 'Alrededor del dedo afectado (solo para férula de dedo pie)', min: 35,  max: 100 },
  ],
};

export function CreateCaseModal({ open, onOpenChange }: CreateCaseModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Paso 1: Datos del paciente
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [affectedSide, setAffectedSide] = useState<'left' | 'right'>('right');

  // Paso 2: Medidas
  const [selectedSize, setSelectedSize] = useState<SizeLabel | 'custom'>('M');
  const [measurements, setMeasurements] = useState<PatientMeasurements>({});

  // Paso 3: Template
  const [selectedCategory, setSelectedCategory] = useState("mano");
  const [selectedTemplate, setSelectedTemplate] = useState("wrist_splint");

  const region = categoryToRegion(selectedCategory);
  const categoryTemplates = getTemplatesByCategory(selectedCategory);
  const templateConfig = TEMPLATE_REGISTRY[selectedTemplate];

  // Medidas efectivas: preset o custom
  const effectiveMeasurements = useMemo((): PatientMeasurements => {
    if (selectedSize === 'custom') {
      return { ...measurements, affectedSide, bodyRegion: region };
    }
    const preset = SIZE_PRESETS[region]?.[selectedSize] || {};
    return { ...preset, affectedSide, bodyRegion: region };
  }, [selectedSize, measurements, affectedSide, region]);

  // Params personalizados
  const personalizedParams = useMemo(() => {
    if (!templateConfig) return {};
    return computePersonalizedParams(
      selectedTemplate,
      templateConfig.defaultParams,
      effectiveMeasurements
    );
  }, [selectedTemplate, templateConfig, effectiveMeasurements]);

  const updateMeasurement = (key: keyof PatientMeasurements, value: string) => {
    const num = parseFloat(value);
    setMeasurements(prev => ({ ...prev, [key]: isNaN(num) ? undefined : num }));
  };

  const canProceed = () => {
    switch (step) {
      case 0: return name.trim().length > 0;
      case 1: return true; // Medidas son opcionales (hay presets)
      case 2: return !!selectedTemplate;
      default: return true;
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t("features.createCaseModal.toastNameRequired"));
      return;
    }
    setIsSubmitting(true);
    try {
      const newCase: Case = {
        id: nanoid(),
        name: name.trim(),
        description: description.trim(),
        status: "Nuevo",
        notes: "",
        templateId: selectedTemplate,
        patientMeasurements: effectiveMeasurements,
        parametricModel: {
          mode: selectedTemplate === 'custom_nodes' ? 'node_editor' : 'procedural',
          params: personalizedParams,
          ui_controls: templateConfig?.controls || [],
          ui_values: personalizedParams,
        }
      };

      await db.cases.add(newCase);
      toast.success(t("features.createCaseModal.toastSuccess"));

      // Reset
      setStep(0);
      setName("");
      setDescription("");
      setAffectedSide('right');
      setSelectedSize('M');
      setMeasurements({});
      setSelectedCategory("mano");
      setSelectedTemplate("wrist_splint");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating case:", error);
      toast.error(t("features.createCaseModal.toastError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setStep(0);
    }
    onOpenChange(v);
  };

  const steps = [
    { icon: User, label: t("features.createCaseModal.stepPatient") || "Paciente" },
    { icon: Ruler, label: t("features.createCaseModal.stepMeasurements") || "Medidas" },
    { icon: LayoutGrid, label: t("features.createCaseModal.stepTemplate") || "Férula" },
    { icon: Eye, label: t("features.createCaseModal.stepPreview") || "Confirmar" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("features.createCaseModal.title")}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 py-2 border-b">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={i} className="flex items-center gap-1 flex-1">
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => i <= step && setStep(i)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors w-full",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isDone
                        ? "bg-primary/10 text-primary cursor-pointer"
                        : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
                {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[350px]">

          {/* ── PASO 0: Datos del paciente ── */}
          {step === 0 && (
            <div className="space-y-5 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  {t("features.createCaseModal.labelName")} *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("features.createCaseModal.placeholderName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  {t("features.createCaseModal.labelDiagnosis") || "Diagnóstico / Descripción"}
                </Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("features.createCaseModal.placeholderDescription")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("features.createCaseModal.labelSide") || "Lado afectado"}
                </Label>
                <div className="flex gap-2">
                  {(['right', 'left'] as const).map(side => (
                    <button
                      key={side}
                      type="button"
                      className={cn(
                        "flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                        affectedSide === side
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-muted bg-muted text-muted-foreground hover:bg-accent"
                      )}
                      onClick={() => setAffectedSide(side)}
                    >
                      {side === 'right'
                        ? (t("features.createCaseModal.sideRight") || "Derecho")
                        : (t("features.createCaseModal.sideLeft") || "Izquierdo")
                      }
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 1: Medidas ── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Selector de región */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {t("features.createCaseModal.labelRegion") || "Región corporal"}
                </Label>
                <div className="flex gap-1.5">
                  {TEMPLATE_CATEGORIES
                    .filter(c => c.id !== 'libre' && c.id !== 'adaptativas')
                    .map(cat => {
                      const CatIcon = cat.icon;
                      const isActive = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-transparent hover:bg-accent"
                          )}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            const first = getTemplatesByCategory(cat.id)[0];
                            if (first) setSelectedTemplate(first.id);
                          }}
                        >
                          <CatIcon className="h-3.5 w-3.5" />
                          {t(`features.createCaseModal.category_${cat.id}`) || cat.label}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Selector de talla o custom */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {t("features.createCaseModal.labelSize") || "Talla"}
                </Label>
                <div className="flex gap-1.5">
                  {SIZE_LABELS.map(size => (
                    <button
                      key={size}
                      type="button"
                      className={cn(
                        "flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-all",
                        selectedSize === size
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted bg-muted text-muted-foreground hover:bg-accent"
                      )}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={cn(
                      "flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-all",
                      selectedSize === 'custom'
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted bg-muted text-muted-foreground hover:bg-accent"
                    )}
                    onClick={() => setSelectedSize('custom')}
                  >
                    {t("features.createCaseModal.customSize") || "A medida"}
                  </button>
                </div>
              </div>

              {/* Medidas: preview de preset o inputs custom */}
              {selectedSize !== 'custom' ? (
                <div className="bg-muted/50 rounded-lg p-4 border space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("features.createCaseModal.presetValues") || "Medidas estimadas para talla"} {selectedSize}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {MEASUREMENT_FIELDS[region]?.map(field => {
                      const val = effectiveMeasurements[field.key] as number | undefined;
                      return (
                        <div key={field.key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{field.label}</span>
                          <span className="font-mono font-medium">{val ? `${val} mm` : '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {t("features.createCaseModal.presetHint") || "Valores promedio. Puedes ajustar después en el editor con los sliders."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {t("features.createCaseModal.customHint") || "Ingresa las medidas del paciente en milímetros. Usa una cinta métrica flexible."}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MEASUREMENT_FIELDS[region]?.map(field => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs font-medium">{field.label} (mm)</Label>
                        <Input
                          type="number"
                          min={field.min}
                          max={field.max}
                          placeholder={`${field.min}–${field.max}`}
                          value={measurements[field.key] ?? ''}
                          onChange={(e) => updateMeasurement(field.key, e.target.value)}
                          className="h-8 text-sm font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground leading-tight">{field.hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PASO 2: Seleccionar férula ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Categorías incluyendo adaptativas y libre */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-transparent hover:bg-accent"
                      )}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        const first = getTemplatesByCategory(cat.id)[0];
                        if (first) setSelectedTemplate(first.id);
                      }}
                    >
                      <CatIcon className="h-3.5 w-3.5" />
                      {t(`features.createCaseModal.category_${cat.id}`) || cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Grid de plantillas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {categoryTemplates.map((tpl) => {
                  const Icon = tpl.icon;
                  const isSelected = selectedTemplate === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      className={cn(
                        "cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center gap-2 transition-all hover:bg-accent",
                        isSelected ? "border-primary bg-primary/5" : "border-transparent bg-muted"
                      )}
                      onClick={() => setSelectedTemplate(tpl.id)}
                    >
                      <Icon className={cn("h-6 w-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-medium text-center leading-tight">{tpl.name}</span>
                    </div>
                  );
                })}
              </div>

              {/* Descripción */}
              {templateConfig && (
                <div className="bg-muted/50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => { const I = templateConfig.icon; return <I className="h-4 w-4 text-primary" />; })()}
                    <span className="text-sm font-semibold">{templateConfig.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{templateConfig.description}</p>
                </div>
              )}
            </div>
          )}

          {/* ── PASO 3: Confirmación ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Resumen del paciente */}
                <div className="bg-muted/50 rounded-lg p-4 border space-y-2">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                    {t("features.createCaseModal.stepPatient") || "Paciente"}
                  </h4>
                  <p className="text-sm font-semibold">{name}</p>
                  {description && <p className="text-xs text-muted-foreground">{description}</p>}
                  <Badge variant="outline" className="text-[10px]">
                    {affectedSide === 'right'
                      ? (t("features.createCaseModal.sideRight") || "Derecho")
                      : (t("features.createCaseModal.sideLeft") || "Izquierdo")
                    }
                  </Badge>
                </div>

                {/* Resumen de férula */}
                <div className="bg-muted/50 rounded-lg p-4 border space-y-2">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                    {t("features.createCaseModal.stepTemplate") || "Férula"}
                  </h4>
                  {templateConfig && (
                    <>
                      <div className="flex items-center gap-2">
                        {(() => { const I = templateConfig.icon; return <I className="h-4 w-4 text-primary" />; })()}
                        <span className="text-sm font-semibold">{templateConfig.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {selectedSize === 'custom'
                          ? (t("features.createCaseModal.customSize") || "A medida")
                          : `${t("features.createCaseModal.labelSize") || "Talla"} ${selectedSize}`
                        }
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              {/* Medidas aplicadas */}
              <div className="bg-muted/50 rounded-lg p-4 border space-y-2">
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  {t("features.createCaseModal.labelMeasurements") || "Medidas"} → {t("features.createCaseModal.labelParams") || "Parámetros calculados"}
                </h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {Object.entries(personalizedParams)
                    .filter(([key, val]) => typeof val === 'number' && key !== 'color')
                    .map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-mono font-medium">{(val as number).toFixed(1)} mm</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                {t("features.createCaseModal.confirmHint") || "Podrás ajustar todos los parámetros después en el editor con los sliders."}
              </p>
            </div>
          )}
        </div>

        {/* Footer con navegación */}
        <div className="flex justify-between items-center pt-3 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("features.createCaseModal.back") || "Atrás"}
          </Button>

          <span className="text-xs text-muted-foreground">
            {step + 1} / {steps.length}
          </span>

          {step < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-1"
            >
              {t("features.createCaseModal.next") || "Siguiente"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? (t("features.createCaseModal.buttonCreating"))
                : (t("features.createCaseModal.buttonCreate"))
              }
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
