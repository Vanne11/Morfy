import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, FileJson, Box, LayoutGrid } from "lucide-react";
import { db } from "@/app/db";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { TEMPLATE_REGISTRY, TEMPLATE_CATEGORIES, getTemplatesByCategory } from "@/features/templates/registry";
import { cn } from "@/lib/utils";
import { TemplatePreview3D } from "@/features/viewer/components/TemplatePreview3D";
import type { TemplateControl } from "@/features/templates/registry";

/**
 * Auto-genera controles UI desde los params de una custom template.
 * Analiza el tipo y valor de cada param para crear sliders razonables.
 */
function generateControlsFromParams(params: Record<string, any>): TemplateControl[] {
  const controls: TemplateControl[] = [];

  for (const [key, value] of Object.entries(params)) {
    // Skip color y strings
    if (key === 'color' || typeof value !== 'number') continue;

    const absVal = Math.abs(value) || 1;
    let min: number, max: number, step: number;
    let clinicalLabel: string | undefined;
    let clinicalHint: string | undefined;

    // Detectar tipo de parámetro por nombre
    if (key === 'grosor' || key === 'thickness') {
      min = 0.5; max = 15; step = 0.1;
      clinicalLabel = 'Grosor / Rigidez';
      clinicalHint = 'Controla el espesor del material y su rigidez';
    } else if (key.toLowerCase().includes('radio') || key.toLowerCase().includes('radius')) {
      min = 0; max = absVal * 5; step = 0.5;
      clinicalLabel = `Radio (${key})`;
    } else if (key.toLowerCase().includes('angle') || key.toLowerCase().includes('angulo')) {
      min = 0; max = 360; step = 1;
      clinicalLabel = `Ángulo`;
    } else {
      // Parámetro genérico: rango basado en el valor actual
      min = 0;
      max = Math.round(absVal * 5);
      step = absVal >= 10 ? 1 : 0.1;
      // Nombre legible
      clinicalLabel = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase())
        .trim();
    }

    controls.push({
      id: key,
      label: key,
      clinicalLabel,
      clinicalHint,
      min,
      max,
      step,
      default: value,
      impacts: { [key]: { operation: 'set' } },
    });
  }

  return controls;
}

type ItemSource = 'builtin' | 'system' | 'custom' | 'model';

interface UnifiedItem {
  id: string | number;
  name: string;
  description: string;
  category: string;
  source: ItemSource;
  file?: string;
  content?: any;
  fileType?: string;
  data?: Blob;
  icon?: any;
  color?: string;
  controls?: any[];
  defaultParams?: Record<string, any>;
}

export function LibraryModal({
  open,
  onOpenChange,
  projectId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedObject, setSelectedObject] = useState<UnifiedItem | null>(null);
  const [systemTemplates, setSystemTemplates] = useState<UnifiedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'builtin' | 'other'>('builtin');
  const [selectedCategory, setSelectedCategory] = useState('mano');

  const customTemplates = useLiveQuery(() => db.templates.toArray()) ?? [];
  const libraryModels = useLiveQuery(() => db.libraryModels.toArray()) ?? [];

  // Cargar plantillas JSON del sistema
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      fetch(`${import.meta.env.BASE_URL}templates/index.json`)
        .then(res => res.json())
        .then(data => {
            const mapped: UnifiedItem[] = data.map((t: any) => ({ ...t, source: 'system' as ItemSource }));
            setSystemTemplates(mapped);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [open]);

  // Férulas pre-hechas del registry
  const builtinItems: UnifiedItem[] = useMemo(() => {
    return Object.values(TEMPLATE_REGISTRY).map(tpl => ({
      id: tpl.id,
      name: tpl.name,
      description: tpl.description,
      category: tpl.category,
      source: 'builtin' as ItemSource,
      icon: tpl.icon,
      color: tpl.defaultParams?.color,
      controls: tpl.controls,
      defaultParams: tpl.defaultParams,
    }));
  }, []);

  // Filtrar built-in por categoría
  const filteredBuiltin = useMemo(() => {
    let items = builtinItems.filter(i => i.category === selectedCategory);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(term) ||
        i.description.toLowerCase().includes(term)
      );
    }
    return items;
  }, [builtinItems, selectedCategory, searchTerm]);

  // Items "otros" (custom templates, system JSON, models 3D)
  const otherItems = useMemo(() => {
    const customMapped: UnifiedItem[] = customTemplates.map(t => ({
        id: t.id, name: t.name, description: t.description,
        category: t.category, source: 'custom' as ItemSource, content: t.content
    }));
    const modelsMapped: UnifiedItem[] = libraryModels.map(m => ({
        id: m.id!, name: m.name, description: m.description,
        category: m.category, source: 'model' as ItemSource,
        fileType: m.fileType, data: m.data
    }));
    let items = [...systemTemplates, ...customMapped, ...modelsMapped];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(term) ||
        i.description.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term)
      );
    }
    return items;
  }, [systemTemplates, customTemplates, libraryModels, searchTerm]);

  const handleAddToProject = async () => {
    if (!selectedObject || !projectId) return;

    setIsProcessing(true);
    try {
      if (selectedObject.source === 'builtin') {
        // Férula pre-hecha: aplicar como modelo paramétrico del caso
        const tplConfig = TEMPLATE_REGISTRY[selectedObject.id as string];
        if (!tplConfig) throw new Error("Template not found");

        await db.cases.update(projectId, {
          templateId: tplConfig.id,
          parametricModel: {
            mode: tplConfig.id === 'custom_nodes' ? 'node_editor' : 'procedural',
            params: { ...tplConfig.defaultParams },
            ui_controls: tplConfig.controls,
            ui_values: { ...tplConfig.defaultParams },
          }
        });
        toast.success(t("features.libraryModal.toastApplied", { name: selectedObject.name }));
      } else if (selectedObject.source === 'model') {
        await db.sourceFiles.add({
          caseId: projectId,
          fileName: `${selectedObject.name}.${selectedObject.fileType}`,
          fileType: selectedObject.fileType as any,
          data: selectedObject.data!,
        });
        toast.success(t("features.libraryModal.toastAdded", { name: selectedObject.name }));
      } else {
        // Plantilla JSON (sistema o custom) → aplicar como modelo paramétrico editable
        let finalContent;
        if (selectedObject.source === 'system' && selectedObject.file) {
          const fileUrl = `${import.meta.env.BASE_URL}${selectedObject.file.replace(/^\//, '')}`;
          const response = await fetch(fileUrl);
          finalContent = await response.json();
        } else {
          finalContent = selectedObject.content;
        }

        // Aplicar como parametricModel del caso.
        const hasGeometry = finalContent?.geometry?.vertices || finalContent?.geometry?.contours;
        const templateParams = finalContent?.params || {};

        // Auto-generar ui_controls desde los params si el template no los define
        let controls: TemplateControl[] = finalContent?.ui_controls || [];
        if (controls.length === 0 && Object.keys(templateParams).length > 0) {
          controls = generateControlsFromParams(templateParams);
        }

        await db.cases.update(projectId, {
          parametricModel: {
            mode: hasGeometry ? 'svg' : 'procedural',
            geometry: finalContent?.geometry,
            params: { ...templateParams },
            ui_controls: controls,
            ui_values: { ...templateParams },
          }
        });
        toast.success(t("features.libraryModal.toastApplied", { name: selectedObject.name }));
      }

      onOpenChange(false);
      setSelectedObject(null);
    } catch (error) {
      console.error(error);
      toast.error(t("features.libraryModal.toastError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const getSourceLabel = (source: ItemSource) => {
    switch (source) {
      case 'builtin': return t("features.libraryModal.badgeBuiltin");
      case 'system': return t("pages.objectLibrary.badgeSystem");
      case 'custom': return t("pages.objectLibrary.badgeCustom");
      case 'model': return t("features.libraryModal.badgeModel");
    }
  };

  const renderItemIcon = (item: UnifiedItem, size: "sm" | "lg" = "sm") => {
    const cls = size === "lg" ? "h-16 w-16" : "h-10 w-10";
    if (item.source === 'builtin' && item.icon) {
      const Icon = item.icon;
      return <Icon className={cls} style={{ color: item.color || '#888' }} />;
    }
    if (item.source === 'model') return <Box className={`${cls} text-blue-400/50`} />;
    if (item.source === 'custom') return <FileJson className={`${cls} text-primary/30`} />;
    return <ImageIcon className={`${cls} text-muted-foreground/30`} />;
  };

  const getButtonLabel = () => {
    if (isProcessing) return t("features.libraryModal.processing");
    if (!selectedObject) return t("features.libraryModal.useTemplate");
    switch (selectedObject.source) {
      case 'builtin': return t("features.libraryModal.applyTemplate");
      case 'model': return t("features.libraryModal.useModel");
      default: return t("features.libraryModal.useTemplate");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("features.libraryModal.title")}</DialogTitle>
        </DialogHeader>

        {/* Tabs principales */}
        <div className="flex gap-2 border-b pb-2">
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-t text-sm font-medium transition-colors",
              activeTab === 'builtin' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => { setActiveTab('builtin'); setSelectedObject(null); }}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            {t("features.libraryModal.tabBuiltin")}
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-t text-sm font-medium transition-colors",
              activeTab === 'other' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => { setActiveTab('other'); setSelectedObject(null); }}
          >
            <Box className="h-3.5 w-3.5" />
            {t("features.libraryModal.tabOther")}
            {(otherItems.length > 0) && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">{otherItems.length}</Badge>
            )}
          </button>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
          {/* Panel izquierdo: lista */}
          <div className="col-span-2 flex flex-col gap-3 overflow-y-auto pr-2">
            {/* Buscador */}
            <Input
              placeholder={t("features.libraryModal.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {activeTab === 'builtin' && (
              <>
                {/* Categorías */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 flex-shrink-0">
                  {TEMPLATE_CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors border",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-transparent hover:bg-accent"
                        )}
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        <CatIcon className="h-3 w-3" />
                        {t(`features.createCaseModal.category_${cat.id}`) || cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Grid de férulas */}
                <div className="flex-1 grid grid-cols-2 gap-3 pb-4">
                  {filteredBuiltin.length === 0 && (
                    <p className="text-muted-foreground col-span-2 text-center py-4">
                      {t("features.libraryModal.noResults")}
                    </p>
                  )}
                  {filteredBuiltin.map((item) => {
                    const isSelected = selectedObject?.id === item.id && selectedObject?.source === item.source;
                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          "cursor-pointer overflow-hidden transition-all",
                          isSelected ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"
                        )}
                        onClick={() => setSelectedObject(item)}
                      >
                        <div
                          className="h-24 relative flex items-center justify-center"
                          style={{ backgroundColor: `${item.color}12` }}
                        >
                          {renderItemIcon(item)}
                          <Badge
                            className="absolute top-2 right-2 text-[8px] uppercase"
                            style={{ backgroundColor: item.color, color: '#fff' }}
                          >
                            {t(`features.createCaseModal.category_${item.category}`)}
                          </Badge>
                        </div>
                        <CardHeader className="p-3">
                          <CardTitle className="text-sm truncate leading-tight" title={item.name}>{item.name}</CardTitle>
                          <CardDescription className="text-xs truncate">{item.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'other' && (
              <div className="flex-1 grid grid-cols-2 gap-3 pb-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-20 col-span-2">
                    <Loader2 className="animate-spin text-muted-foreground" />
                  </div>
                ) : otherItems.length === 0 ? (
                  <p className="text-muted-foreground col-span-2 text-center py-4">
                    {t("features.libraryModal.noResults")}
                  </p>
                ) : (
                  otherItems.map((item) => {
                    const isSelected = selectedObject?.id === item.id && selectedObject?.source === item.source;
                    return (
                      <Card
                        key={`${item.source}-${item.id}`}
                        className={cn(
                          "cursor-pointer overflow-hidden transition-all",
                          isSelected ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"
                        )}
                        onClick={() => setSelectedObject(item)}
                      >
                        <div className="h-24 bg-muted relative flex items-center justify-center">
                          {renderItemIcon(item)}
                          <Badge variant="outline" className="absolute top-2 right-2 text-[8px] uppercase tracking-widest bg-background/50">
                            {getSourceLabel(item.source)}
                          </Badge>
                          {item.fileType && (
                            <Badge variant="secondary" className="absolute top-2 left-2 text-[8px] uppercase">
                              {item.fileType}
                            </Badge>
                          )}
                        </div>
                        <CardHeader className="p-3">
                          <CardTitle className="text-sm truncate" title={item.name}>{item.name}</CardTitle>
                          <CardDescription className="text-xs truncate">{item.category}</CardDescription>
                        </CardHeader>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Panel derecho: detalle + botón */}
          <div className="col-span-1 bg-muted/50 rounded-lg flex flex-col justify-between">
            <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
              {selectedObject ? (
                <div className="w-full space-y-4">
                  {selectedObject.source === 'builtin' && selectedObject.defaultParams ? (
                    <TemplatePreview3D
                      params={selectedObject.defaultParams}
                      className="aspect-square w-full border rounded-lg overflow-hidden bg-gradient-to-b from-gray-100 to-gray-200 dark:from-zinc-900 dark:to-black"
                    />
                  ) : (
                    <div
                      className="aspect-square w-full border rounded-lg overflow-hidden flex items-center justify-center relative"
                      style={{ backgroundColor: selectedObject.color ? `${selectedObject.color}10` : undefined }}
                    >
                      {renderItemIcon(selectedObject, "lg")}
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="font-bold text-center text-base leading-tight">{selectedObject.name}</h3>
                    <div className="flex justify-center gap-1.5">
                      <Badge variant="outline" className="text-[9px]">
                        {getSourceLabel(selectedObject.source)}
                      </Badge>
                      {selectedObject.color && (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: selectedObject.color }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center bg-background/50 p-2 rounded">
                    {selectedObject.description || t("pages.objectLibrary.noDescription")}
                  </p>
                  {selectedObject.source === 'builtin' && selectedObject.controls && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      {selectedObject.controls.length} {t("pages.objectLibrary.adjustableParams")}
                    </div>
                  )}
                  {selectedObject.source === 'builtin' && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-900">
                      {t("features.libraryModal.builtinWarning")}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground">
                  {t("features.libraryModal.selectHint")}
                </p>
              )}
            </div>
            <DialogFooter className="p-4 bg-muted/20">
              <Button onClick={handleAddToProject} disabled={!selectedObject || isProcessing} className="w-full">
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getButtonLabel()}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
