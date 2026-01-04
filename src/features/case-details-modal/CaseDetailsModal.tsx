// src/features/case-details-modal/CaseDetailsModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Case } from "@/types"; // Importar desde la nueva ubicación

interface CaseDetailsModalProps {
  caseData: Case | null;
  onOpenChange: (open: boolean) => void;
}

export function CaseDetailsModal({ caseData, onOpenChange }: CaseDetailsModalProps) {
  if (!caseData) return null;

  const handleSaveNotes = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const notes = formData.get("notes");
    console.log("Guardando notas:", notes);
    toast.success("Notas guardadas con éxito (simulación).");
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
            <TabsTrigger value="notes">Notas y Comentarios</TabsTrigger>
            <TabsTrigger value="gallery">Galería de Resultados</TabsTrigger>
          </TabsList>
          <TabsContent value="notes" className="mt-4">
             <form onSubmit={handleSaveNotes} className="space-y-4">
              <Textarea 
                name="notes"
                placeholder="Añade comentarios sobre el progreso, ajustes necesarios, etc."
                defaultValue={caseData.notes}
                rows={10}
              />
              <Button type="submit">Guardar Notas</Button>
            </form>
          </TabsContent>
          <TabsContent value="gallery" className="mt-4">
            <div className="space-y-4">
               <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="picture">Subir Fotografía</Label>
                <Input id="picture" type="file" />
              </div>
              <Button onClick={() => toast.info("Subiendo fotografía (simulación)...")}>
                Añadir a la Galería
              </Button>
              <div className="p-4 border-dashed border-2 rounded-lg min-h-[200px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">La galería de resultados está vacía.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
