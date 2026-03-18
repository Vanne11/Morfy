// src/features/case-details-modal/CaseDetailsModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { db } from "@/app/db";
import type { Case } from "@/types";
import { useTranslation } from "react-i18next";

interface CaseDetailsModalProps {
  caseData: Case | null;
  onOpenChange: (open: boolean) => void;
  onCaseUpdated?: () => void;
}

const STATUS_OPTIONS: Case["status"][] = ["Nuevo", "En Progreso", "Completado"];

export function CaseDetailsModal({ caseData, onOpenChange, onCaseUpdated }: CaseDetailsModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Case["status"]>("Nuevo");
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar estado local cuando cambia el caso
  useEffect(() => {
    if (caseData) {
      setName(caseData.name);
      setDescription(caseData.description);
      setNotes(caseData.notes);
      setStatus(caseData.status);
    }
  }, [caseData]);

  if (!caseData) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("features.createCaseModal.toastNameRequired"));
      return;
    }

    setIsSaving(true);
    try {
      await db.cases.update(caseData.id, {
        name: name.trim(),
        description: description.trim(),
        notes: notes.trim(),
        status,
      });
      toast.success(t("features.caseDetailsModal.toastSaveSuccess"));
      onCaseUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error guardando caso:", error);
      toast.error(t("features.caseDetailsModal.toastSaveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={!!caseData} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("features.caseDetailsModal.editTitle")}</DialogTitle>
          <DialogDescription>{t("features.caseDetailsModal.editDescription")}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">{t("features.caseDetailsModal.tabDetails")}</TabsTrigger>
            <TabsTrigger value="notes">{t("features.caseDetailsModal.tabNotes")}</TabsTrigger>
            <TabsTrigger value="gallery">{t("features.caseDetailsModal.tabGallery")}</TabsTrigger>
          </TabsList>

          {/* Tab: Detalles del caso */}
          <TabsContent value="details" className="mt-4 space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right text-xs uppercase text-muted-foreground">
                  {t("features.createCaseModal.labelName")}
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-desc" className="text-right text-xs uppercase text-muted-foreground">
                  {t("features.createCaseModal.labelDescription")}
                </Label>
                <Input
                  id="edit-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs uppercase text-muted-foreground">
                  {t("features.caseDetailsModal.labelStatus")}
                </Label>
                <div className="col-span-3 flex gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <Badge
                      key={opt}
                      variant={status === opt ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => setStatus(opt)}
                    >
                      {t(`common.statuses.${opt.toLowerCase()}`)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Notas */}
          <TabsContent value="notes" className="mt-4">
            <div className="space-y-4">
              <Textarea
                placeholder={t("features.caseDetailsModal.placeholderNotes")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={10}
              />
            </div>
          </TabsContent>

          {/* Tab: Galería */}
          <TabsContent value="gallery" className="mt-4">
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="picture">{t("features.caseDetailsModal.labelUpload")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="picture"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const fileName = e.target.files?.[0]?.name;
                      if (fileName) toast.info(`${t("features.caseDetailsModal.toastUploading")} (${fileName})`);
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('picture')?.click()}
                    className="w-full"
                  >
                    {t("features.caseDetailsModal.buttonChooseFile")}
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={() => toast.info(t("features.caseDetailsModal.toastUploading"))}>
                {t("features.caseDetailsModal.buttonAddGallery")}
              </Button>
              <div className="p-4 border-dashed border-2 rounded-lg min-h-[200px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">{t("features.caseDetailsModal.emptyGallery")}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Botón de guardar global */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? t("features.caseDetailsModal.buttonSaving")
              : t("features.caseDetailsModal.buttonSave")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
