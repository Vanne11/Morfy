import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageIcon, Loader2, FileJson } from "lucide-react";
import { db } from "@/app/db";
import { Badge } from "@/components/ui/badge";

interface UnifiedTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  source: 'system' | 'custom';
  file?: string; // Solo para sistema
  content?: any; // Solo para personalizadas
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedObject, setSelectedObject] = useState<UnifiedTemplate | null>(null);
  const [systemTemplates, setSystemTemplates] = useState<UnifiedTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cargar plantillas personalizadas de Dexie
  const customTemplates = useLiveQuery(() => db.templates.toArray()) ?? [];

  // Cargar plantillas del sistema
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      fetch(`${import.meta.env.BASE_URL}templates/index.json`)
        .then(res => res.json())
        .then(data => {
            const mapped = data.map((t: any) => ({ ...t, source: 'system' }));
            setSystemTemplates(mapped);
        })
        .catch(err => console.error("Error al cargar las plantillas del sistema.", err))
        .finally(() => setIsLoading(false));
    }
  }, [open]);

  // Combinar ambas fuentes
  const allTemplates = useMemo(() => {
    const customMapped: UnifiedTemplate[] = customTemplates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        source: 'custom',
        content: t.content
    }));
    return [...systemTemplates, ...customMapped];
  }, [systemTemplates, customTemplates]);

  const filteredObjects = useMemo(() => {
    if (!searchTerm) return allTemplates;
    return allTemplates.filter(obj => 
      obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allTemplates]);
  
  const handleAddToProject = async () => {
    if (!selectedObject || !projectId) return;

    setIsProcessing(true);
    try {
      let finalContent;

      if (selectedObject.source === 'system' && selectedObject.file) {
        const fileUrl = `${import.meta.env.BASE_URL}${selectedObject.file.replace(/^\//, '')}`;
        const response = await fetch(fileUrl);
        finalContent = await response.json();
      } else {
        finalContent = selectedObject.content;
      }
      
      const blob = new Blob([JSON.stringify(finalContent, null, 2)], { type: "application/json" });

      await db.sourceFiles.add({
        caseId: projectId,
        fileName: selectedObject.name,
        fileType: 'json',
        data: blob
      });

      toast.success(`'${selectedObject.name}' añadido al caso.`);
      onOpenChange(false);
      setSelectedObject(null);
    } catch (error) {
      console.error(error);
      toast.error("Error al procesar la plantilla.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Seleccionar Plantilla</DialogTitle>
        </DialogHeader>
        <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
          <div className="col-span-2 flex flex-col gap-4 overflow-y-auto pr-4">
             <Input
                placeholder="Buscar férula o lámina..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            {isLoading ? (
                <div className="flex items-center justify-center h-20">
                    <Loader2 className="animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-2 gap-3 pb-4">
                  {filteredObjects.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-4">No se encontraron plantillas.</p>}
                  {filteredObjects.map((obj) => (
                    <Card 
                      key={obj.id} 
                      className={`cursor-pointer overflow-hidden transition-all ${selectedObject?.id === obj.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50'}`}
                      onClick={() => setSelectedObject(obj)}
                    >
                      <div className="h-24 bg-muted relative flex items-center justify-center">
                         {obj.source === 'custom' ? (
                             <FileJson className="text-primary/30 h-10 w-10" />
                         ) : (
                             <ImageIcon className="text-muted-foreground/30 h-8 w-8" />
                         )}
                         <Badge variant="outline" className="absolute top-2 right-2 text-[8px] uppercase tracking-widest bg-background/50">
                            {obj.source === 'custom' ? 'Mía' : 'Sistema'}
                         </Badge>
                      </div>
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm truncate" title={obj.name}>{obj.name}</CardTitle>
                        <CardDescription className="text-xs truncate">{obj.category}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
            )}
          </div>
          <div className="col-span-1 bg-muted/50 rounded-lg flex flex-col justify-between">
             <div className="flex-1 flex items-center justify-center p-4">
              {selectedObject ? (
                <div className="w-full space-y-4">
                   <div className="aspect-square w-full bg-background border rounded-lg overflow-hidden flex items-center justify-center relative">
                     {selectedObject.source === 'custom' ? (
                         <FileJson className="h-16 w-16 text-primary/50" />
                     ) : (
                         <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
                     )}
                  </div>
                  <div className="space-y-1">
                      <h3 className="font-bold text-center text-lg leading-tight">{selectedObject.name}</h3>
                      <p className="text-xs text-center text-muted-foreground">{selectedObject.category}</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-center bg-background/50 p-2 rounded">{selectedObject.description || "Sin descripción disponible."}</p>
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground">Selecciona una plantilla para ver detalles</p>
              )}
             </div>
             <DialogFooter className="p-4 bg-muted/20">
                <Button onClick={handleAddToProject} disabled={!selectedObject || isProcessing} className="w-full">
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isProcessing ? "Procesando..." : "Usar Plantilla"}
                </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
