import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, FileJson, ArrowLeft, Copy, Upload, Box, LayoutGrid } from "lucide-react";
import { db, type ITemplate, type ILibraryModel } from "@/app/db";
import { TemplateEditor } from "@/features/admin/TemplateEditor";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TEMPLATE_REGISTRY,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
} from "@/features/templates/registry";
import { cn } from "@/lib/utils";
import { TemplatePreview3D } from "@/features/viewer/components/TemplatePreview3D";
import type { TemplateConfig } from "@/features/templates/registry";

interface ManagedTemplate extends ITemplate {
  isSystem?: boolean;
}

const systemTemplateKeys: Record<string, string> = {
  "Férula de Dedo Anatómica": "fingerSplintAnatomic",
  "Férula Simple (Centímetros)": "simpleSplint",
  "Férula Palmar con Arcos": "palmarSplint",
  "Férula de Muñeca con Ventilación": "wristSplint"
};

export function ObjectLibrary() {
  const { t } = useTranslation();
  const [editingTemplate, setEditingTemplate] = useState<ManagedTemplate | null | undefined>(undefined);
  const [systemTemplates, setSystemTemplates] = useState<ManagedTemplate[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedBuiltinCategory, setSelectedBuiltinCategory] = useState("mano");
  const [selectedBuiltinTemplate, setSelectedBuiltinTemplate] = useState<TemplateConfig | null>(null);
  const customTemplates = useLiveQuery(() => db.templates.toArray()) ?? [];
  const libraryModels = useLiveQuery(() => db.libraryModels.toArray()) ?? [];

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}templates/index.json`)
      .then(res => res.json())
      .then(async (data) => {
          const fullTemplates = await Promise.all(data.map(async (item: any) => {
              const res = await fetch(`${import.meta.env.BASE_URL}${item.file.replace(/^\//, '')}`);
              const content = await res.json();
              return {
                  id: item.id, name: item.name, category: item.category,
                  description: item.description, content, createdAt: new Date(), isSystem: true
              };
          }));
          setSystemTemplates(fullTemplates as ManagedTemplate[]);
      })
      .catch(() => {});
  }, []);

  const allCustomTemplates = useMemo((): ManagedTemplate[] => {
      return [
          ...systemTemplates,
          ...customTemplates.map(t => ({ ...t, isSystem: false }))
      ];
  }, [systemTemplates, customTemplates]);

  const handleDeleteTemplate = async (id: string) => {
    if (confirm(t("pages.objectLibrary.confirmDelete"))) {
      try {
        await db.templates.delete(id);
        toast.success(t("pages.objectLibrary.toastDeleted"));
      } catch { toast.error(t("pages.objectLibrary.toastDeleteError")); }
    }
  };

  const handleDuplicateTemplate = async (tpl: any) => {
      try {
          const newTpl: ITemplate = {
              id: nanoid(),
              name: `${tpl.name} ${t("pages.objectLibrary.copySuffix")}`,
              category: tpl.category, description: tpl.description,
              content: JSON.parse(JSON.stringify(tpl.content)), createdAt: new Date()
          };
          await db.templates.add(newTpl);
          toast.success(t("pages.objectLibrary.toastCopySuccess"));
      } catch { toast.error(t("pages.objectLibrary.toastCopyError")); }
  };

  const handleDeleteModel = async (id: number) => {
    if (confirm(t("pages.objectLibrary.confirmDeleteModel"))) {
      try {
        await db.libraryModels.delete(id);
        toast.success(t("pages.objectLibrary.toastModelDeleted"));
      } catch { toast.error(t("pages.objectLibrary.toastDeleteError")); }
    }
  };

  // --- Vista del editor de plantillas ---
  if (editingTemplate !== undefined) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
        <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(undefined)} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> {t("pages.objectLibrary.back")}
        </Button>
        <TemplateEditor
          template={editingTemplate}
          isSystemTemplate={editingTemplate?.isSystem || false}
          onSaved={() => setEditingTemplate(undefined)}
          onCancel={() => setEditingTemplate(undefined)}
        />
      </div>
    );
  }

  // --- Plantillas built-in de la categoría seleccionada ---
  const builtinTemplates = getTemplatesByCategory(selectedBuiltinCategory);

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("pages.objectLibrary.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.objectLibrary.description")}</p>
        </div>
      </div>

      <Tabs defaultValue="builtin" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mb-4">
          <TabsTrigger value="builtin" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            {t("pages.objectLibrary.tabBuiltin")}
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <FileJson className="h-4 w-4" />
            {t("pages.objectLibrary.tabTemplates")}
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-2">
            <Box className="h-4 w-4" />
            {t("pages.objectLibrary.tabModels")}
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB: Plantillas Pre-hechas (Registry) ===== */}
        <TabsContent value="builtin" className="flex-1 overflow-hidden">
          {/* Categorías */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {TEMPLATE_CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              const isActive = selectedBuiltinCategory === cat.id;
              const count = getTemplatesByCategory(cat.id).length;
              return (
                <button
                  key={cat.id}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted text-muted-foreground border-transparent hover:bg-accent"
                  )}
                  onClick={() => { setSelectedBuiltinCategory(cat.id); setSelectedBuiltinTemplate(null); }}
                >
                  <CatIcon className="h-4 w-4" />
                  {t(`features.createCaseModal.category_${cat.id}`) || cat.label}
                  <Badge variant={isActive ? "secondary" : "outline"} className="text-[10px] h-5 px-1.5">
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Layout: Grid + Preview panel */}
          <div className={cn("flex-1 flex gap-4 min-h-0", selectedBuiltinTemplate ? "h-[calc(100%-3rem)]" : "h-[calc(100%-3rem)]")}>
            {/* Grid de plantillas */}
            <div className={cn("overflow-y-auto", selectedBuiltinTemplate ? "w-1/2 xl:w-3/5" : "w-full")}>
              <div className={cn("grid gap-4", selectedBuiltinTemplate ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
                {builtinTemplates.map(tpl => {
                  const Icon = tpl.icon;
                  const isSelected = selectedBuiltinTemplate?.id === tpl.id;
                  return (
                    <Card
                      key={tpl.id}
                      className={cn(
                        "overflow-hidden cursor-pointer transition-all",
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 shadow-md"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => setSelectedBuiltinTemplate(isSelected ? null : tpl)}
                    >
                      <div className="aspect-video w-full relative flex items-center justify-center" style={{ backgroundColor: `${tpl.defaultParams.color}15` }}>
                        <Icon className="h-14 w-14" style={{ color: tpl.defaultParams.color || '#888' }} />
                        <Badge className="absolute top-2 right-2 text-[8px] uppercase" style={{ backgroundColor: tpl.defaultParams.color, color: '#fff' }}>
                          {t(`features.createCaseModal.category_${tpl.category}`)}
                        </Badge>
                      </div>
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm leading-tight">{tpl.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground line-clamp-3 min-h-[3rem]">
                          {tpl.description}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: tpl.defaultParams.color }} />
                          <span>{tpl.controls.length} {t("pages.objectLibrary.adjustableParams")}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-6 py-4 border-t">
                {t("pages.objectLibrary.builtinHint")}
              </p>
            </div>

            {/* Preview panel */}
            {selectedBuiltinTemplate && (
              <div className="w-1/2 xl:w-2/5 flex flex-col gap-3 border rounded-lg overflow-hidden bg-muted/30">
                <TemplatePreview3D
                  params={selectedBuiltinTemplate.defaultParams}
                  className="flex-1 min-h-[250px] bg-gradient-to-b from-gray-100 to-gray-200 dark:from-zinc-900 dark:to-black rounded-t-lg"
                />
                <div className="px-4 pb-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-base">{selectedBuiltinTemplate.name}</h3>
                    <Badge variant="outline" className="text-[9px] mt-1" style={{ borderColor: selectedBuiltinTemplate.defaultParams.color, color: selectedBuiltinTemplate.defaultParams.color }}>
                      {t(`features.createCaseModal.category_${selectedBuiltinTemplate.category}`)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedBuiltinTemplate.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: selectedBuiltinTemplate.defaultParams.color }} />
                    <span>{selectedBuiltinTemplate.controls.length} {t("pages.objectLibrary.adjustableParams")}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedBuiltinTemplate.controls.map(ctrl => (
                      <Badge key={ctrl.id} variant="secondary" className="text-[9px]">
                        {ctrl.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ===== TAB: Plantillas Custom (JSON) ===== */}
        <TabsContent value="custom" className="flex-1 overflow-y-auto">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setEditingTemplate(null)} className="gap-2">
              <Plus className="h-4 w-4" /> {t("pages.objectLibrary.newTemplate")}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allCustomTemplates.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
                <FileJson className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-muted-foreground">{t("pages.objectLibrary.noTemplates")}</p>
              </div>
            )}

            {allCustomTemplates.map(tpl => {
              let displayName = tpl.name;
              let displayDesc = tpl.description;

              if (tpl.isSystem && systemTemplateKeys[tpl.name]) {
                const key = systemTemplateKeys[tpl.name];
                displayName = t(`templates.${key}`);
                const descKey = `templates.${key}Desc`;
                const translatedDesc = t(descKey);
                if (translatedDesc !== descKey) displayDesc = translatedDesc;
              }

              return (
              <Card key={tpl.id} className={tpl.isSystem ? "bg-muted/20 border-dashed overflow-hidden" : "hover:border-primary/50 transition-colors overflow-hidden"}>
                <div className="aspect-video w-full bg-muted relative group">
                    {tpl.thumbnail ? (
                        <img src={tpl.thumbnail} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20">
                            <FileJson className="h-12 w-12" />
                        </div>
                    )}
                    {tpl.isSystem && (
                        <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                             <Badge variant="secondary" className="bg-background/80 backdrop-blur">{t("pages.objectLibrary.readOnly")}</Badge>
                        </div>
                    )}
                </div>
                <CardHeader className="pb-3 pt-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base truncate max-w-[150px]">{displayName}</CardTitle>
                        <Badge variant={tpl.isSystem ? "outline" : "default"} className="text-[8px] uppercase px-1 h-4">
                            {tpl.isSystem ? t("pages.objectLibrary.badgeSystem") : t("pages.objectLibrary.badgeCustom")}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">{tpl.category}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicateTemplate(tpl)} title={t("pages.objectLibrary.duplicate")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTemplate(tpl)} title={tpl.isSystem ? t("pages.objectLibrary.editCopy") : t("pages.objectLibrary.edit")}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {!tpl.isSystem && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTemplate(tpl.id)} title={t("pages.objectLibrary.delete")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {displayDesc || t("pages.objectLibrary.noDescription")}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-widest border-t pt-3">
                    <span>{t("pages.objectLibrary.engineVersion")}</span>
                    <span>{new Date(tpl.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        </TabsContent>

        {/* ===== TAB: Modelos 3D ===== */}
        <TabsContent value="models" className="flex-1 overflow-y-auto">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" /> {t("pages.objectLibrary.uploadModel")}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {libraryModels.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
                <Box className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-muted-foreground">{t("pages.objectLibrary.noModels")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("pages.objectLibrary.noModelsHint")}</p>
              </div>
            )}

            {libraryModels.map(model => (
              <Card key={model.id} className="hover:border-primary/50 transition-colors overflow-hidden">
                <div className="aspect-video w-full bg-muted relative flex items-center justify-center">
                  <Box className="h-12 w-12 text-muted-foreground/20" />
                  <Badge variant="outline" className="absolute top-2 right-2 text-[8px] uppercase tracking-widest bg-background/50">
                    {model.fileType}
                  </Badge>
                </div>
                <CardHeader className="pb-3 pt-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base truncate max-w-[180px]">{model.name}</CardTitle>
                      <CardDescription className="text-xs">{model.category}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => model.id && handleDeleteModel(model.id)} title={t("pages.objectLibrary.delete")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {model.description || t("pages.objectLibrary.noDescription")}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-widest border-t pt-3">
                    <span>{model.fileType.toUpperCase()}</span>
                    <span>{new Date(model.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <UploadModelDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </div>
  );
}

// --- Diálogo de subida de modelo 3D ---
function UploadModelDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName(""); setCategory(""); setDescription(""); setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  };

  const handleSave = async () => {
    if (!file || !name.trim()) {
      toast.error(t("pages.objectLibrary.uploadRequiredFields"));
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "stl" && ext !== "obj") {
      toast.error(t("pages.objectLibrary.uploadOnlyStlObj"));
      return;
    }
    setIsSaving(true);
    try {
      const model: ILibraryModel = {
        name: name.trim(),
        category: category.trim() || t("pages.objectLibrary.defaultCategory"),
        description: description.trim(),
        fileType: ext as 'stl' | 'obj',
        data: file,
        createdAt: new Date(),
      };
      await db.libraryModels.add(model);
      toast.success(t("pages.objectLibrary.toastModelUploaded", { name: name.trim() }));
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error uploading model:", error);
      toast.error(t("pages.objectLibrary.toastUploadError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("pages.objectLibrary.uploadTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>{t("pages.objectLibrary.uploadFile")}</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" className="hidden" accept=".stl,.obj" onChange={handleFileChange} />
              {file ? (
                <div className="space-y-1">
                  <Box className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("pages.objectLibrary.uploadDropHint")}</p>
                  <p className="text-xs text-muted-foreground">STL, OBJ</p>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model-name">{t("features.templateEditor.nameLabel")}</Label>
            <Input id="model-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("pages.objectLibrary.modelNamePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model-category">{t("features.templateEditor.categoryLabel")}</Label>
            <Input id="model-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("pages.objectLibrary.modelCategoryPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model-desc">{t("features.templateEditor.descriptionLabel")}</Label>
            <Input id="model-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("pages.objectLibrary.modelDescPlaceholder")} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            {t("features.templateEditor.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !file}>
            {isSaving ? t("pages.objectLibrary.uploading") : t("pages.objectLibrary.uploadSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
