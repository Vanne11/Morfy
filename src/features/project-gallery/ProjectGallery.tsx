// src/features/project-gallery/ProjectGallery.tsx
import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import { LibraryModal } from "../library-modal/LibraryModal";
import { db } from "@/app/db";
import type { SelectedObject } from "@/types";
import { useTranslation, Trans } from "react-i18next";

const ACCEPTED_EXTENSIONS: Record<string, string> = {
  stl: "stl",
  obj: "obj",
  json: "json",
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
};

const MAX_FILE_SIZE_MB = 100;

interface ProjectGalleryProps {
  onObjectSelect: (obj: SelectedObject) => void;
}

export function ProjectGallery({ onObjectSelect }: ProjectGalleryProps) {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Consulta en vivo a la base de datos
  const galleryObjects = useLiveQuery(
    () => db.sourceFiles.where({ caseId: projectId }).toArray(),
    [projectId]
  ) ?? [];

  // Consulta del Caso actual para ver si tiene plantilla paramétrica
  const currentCase = useLiveQuery(
    async () => {
      if (!projectId) return null;
      return await db.cases.get(projectId);
    },
    [projectId]
  );

  const handleLocalFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !projectId) return;

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const fileType = ACCEPTED_EXTENSIONS[ext];

      if (!fileType) {
        toast.error(t("features.projectGallery.unsupportedFormat", { name: file.name }));
        continue;
      }

      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        toast.error(t("features.projectGallery.fileTooLarge", { name: file.name, size: sizeMB.toFixed(1), max: MAX_FILE_SIZE_MB }));
        continue;
      }

      try {
        await db.sourceFiles.add({
          caseId: projectId,
          fileName: file.name,
          fileType: fileType as any,
          data: file,
        });
        toast.success(t("features.projectGallery.fileAdded", { name: file.name }));
      } catch (error) {
        console.error("Error adding file:", error);
        toast.error(t("features.projectGallery.fileAddError", { name: file.name }));
      }
    }

    // Reset input para permitir cargar el mismo archivo de nuevo
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteFile = async (e: React.MouseEvent, fileId: number) => {
    e.stopPropagation();
    try {
      await db.sourceFiles.delete(fileId);
      toast.success(t("features.projectGallery.fileDeleted"));
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleSelect = (obj: any, isVirtual = false) => {
    if (isVirtual) {
        onObjectSelect({
            id: 'master-model',
            name: obj.name,
            type: 'parametric',
            fileType: 'json',
            fileUrl: '',
            // @ts-ignore
            parametricModel: obj.parametricModel
        });
        return;
    }

    const url = URL.createObjectURL(obj.data);
    onObjectSelect({
      id: obj.id,
      name: obj.fileName,
      type: "escaneo",
      fileType: obj.fileType,
      fileUrl: url
    });
  };

  return (
    <>
      <div className="h-full flex flex-col bg-muted/30">
        <div className="p-4">
          <h2 className="text-lg font-semibold">{t("features.projectGallery.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("features.projectGallery.patientId", { id: projectId })}</p>
          <div className="flex gap-2 mt-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".stl,.obj,.json,.png,.jpg,.jpeg"
              multiple
              onChange={handleLocalFileLoad}
            />
            <Button
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              {t("features.projectGallery.loadLocal")}
            </Button>
            <Button size="sm" variant="secondary" className="w-full" onClick={() => setIsLibraryOpen(true)}>
              {t("features.projectGallery.useLibrary")}
            </Button>
          </div>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Ficha del Modelo Maestro (Si existe plantilla) */}
          {currentCase && currentCase.parametricModel && (
              <Card
                className="cursor-pointer hover:bg-muted transition-colors border-emerald-500/50 bg-emerald-500/5"
                onClick={() => handleSelect({ name: currentCase.name + " (Master)", parametricModel: currentCase.parametricModel }, true)}
              >
                <CardHeader className="p-3 flex flex-row justify-between items-center">
                  <div className="flex flex-col">
                    <CardTitle className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {t("features.projectGallery.masterModel")}
                    </CardTitle>
                    <span className="text-[10px] text-muted-foreground capitalize">
                        {currentCase.templateId ? currentCase.templateId.replace('_', ' ') : 'Paramétrico'}
                    </span>
                  </div>
                  <span className="text-xs font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded px-1.5 py-0.5 uppercase">
                    {t("features.projectGallery.editable")}
                  </span>
                </CardHeader>
              </Card>
          )}

          {galleryObjects.length > 0 ? (
            galleryObjects.map((obj) => (
              <Card
                key={obj.id}
                className="cursor-pointer hover:bg-muted transition-colors group"
                onClick={() => handleSelect(obj)}
              >
                <CardHeader className="p-3 flex flex-row justify-between items-center gap-2">
                  <CardTitle className="text-sm truncate flex-1" title={obj.fileName}>{obj.fileName}</CardTitle>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono bg-primary/10 text-primary rounded px-1.5 py-0.5 uppercase">
                      {obj.fileType}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5 rounded"
                      onClick={(e) => obj.id && handleDeleteFile(e, obj.id)}
                      title={t("features.projectGallery.deleteFile")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            !currentCase?.parametricModel && (
              <div className="text-center text-sm text-muted-foreground mt-10 px-4">
                {t("features.projectGallery.noModels")}
                <br />
                <Trans i18nKey="features.projectGallery.useLibraryToAdd">
                  Usa la <strong>Librería</strong> para añadir uno.
                </Trans>
              </div>
            )
          )}
        </div>
      </div>
      <LibraryModal
        open={isLibraryOpen}
        onOpenChange={setIsLibraryOpen}
        projectId={projectId}
      />
    </>
  );
}
