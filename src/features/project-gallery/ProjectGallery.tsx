// src/features/project-gallery/ProjectGallery.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LibraryModal } from "../library-modal/LibraryModal";
import { db } from "@/app/db";
import type { SelectedObject } from "@/types";
import { useTranslation, Trans } from "react-i18next";

interface ProjectGalleryProps {
  onObjectSelect: (obj: SelectedObject) => void;
}

export function ProjectGallery({ onObjectSelect }: ProjectGalleryProps) {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  
  // Consulta en vivo a la base de datos
  const galleryObjects = useLiveQuery(
    () => db.sourceFiles.where({ caseId: projectId }).toArray(),
    [projectId]
  ) ?? [];

  const handleSelect = (obj: typeof galleryObjects[0]) => {
    const url = URL.createObjectURL(obj.data);
    onObjectSelect({
      id: obj.id,
      name: obj.fileName,
      type: "escaneo", // Por defecto, o derivado del fileType
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
            <Button size="sm" className="w-full" disabled>{t("features.projectGallery.loadLocal")}</Button>
            <Button size="sm" variant="secondary" className="w-full" onClick={() => setIsLibraryOpen(true)}>
              {t("features.projectGallery.useLibrary")}
            </Button>
          </div>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {galleryObjects.length > 0 ? (
            galleryObjects.map((obj) => (
              <Card 
                key={obj.id} 
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSelect(obj)}
              >
                <CardHeader className="p-3 flex flex-row justify-between items-center">
                  <CardTitle className="text-sm truncate" title={obj.fileName}>{obj.fileName}</CardTitle>
                  <span className="text-xs font-mono bg-primary/10 text-primary rounded px-1.5 py-0.5 uppercase">
                    {obj.fileType}
                  </span>
                </CardHeader>
              </Card>
            ))
          ) : (
            <div className="text-center text-sm text-muted-foreground mt-10 px-4">
              {t("features.projectGallery.noModels")}
              <br />
              <Trans i18nKey="features.projectGallery.useLibraryToAdd">
                Usa la <strong>Librería</strong> para añadir uno.
              </Trans>
            </div>
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
