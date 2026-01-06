// src/features/case-details-modal/CaseDetailsModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Case } from "@/types"; // Importar desde la nueva ubicación
import { useTranslation } from "react-i18next";

interface CaseDetailsModalProps {
  caseData: Case | null;
  onOpenChange: (open: boolean) => void;
}

export function CaseDetailsModal({ caseData, onOpenChange }: CaseDetailsModalProps) {
  const { t } = useTranslation();
  if (!caseData) return null;

  const handleSaveNotes = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const notes = formData.get("notes");
    console.log("Guardando notas:", notes);
    toast.success(t("features.caseDetailsModal.toastSaveNotesSuccess"));
  };

  return (
    <Dialog open={!!caseData} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{caseData.name}</DialogTitle>
          <DialogDescription>{caseData.description}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="notes" className="w-full">
          <TabsList>
            <TabsTrigger value="notes">{t("features.caseDetailsModal.tabNotes")}</TabsTrigger>
            <TabsTrigger value="gallery">{t("features.caseDetailsModal.tabGallery")}</TabsTrigger>
          </TabsList>
          <TabsContent value="notes" className="mt-4">
             <form onSubmit={handleSaveNotes} className="space-y-4">
              <Textarea 
                name="notes"
                placeholder={t("features.caseDetailsModal.placeholderNotes")}
                defaultValue={caseData.notes}
                rows={10}
              />
              <Button type="submit">{t("features.caseDetailsModal.buttonSaveNotes")}</Button>
            </form>
          </TabsContent>
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
      </DialogContent>
    </Dialog>
  );
}
