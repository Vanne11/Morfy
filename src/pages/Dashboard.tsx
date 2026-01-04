import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import { CaseDetailsModal } from "@/features/case-details-modal/CaseDetailsModal";
import { CreateCaseModal } from "@/features/create-case-modal/CreateCaseModal";
import { db } from "@/app/db";
import type { Case } from "@/types";

export function Dashboard() {
  const cases = useLiveQuery(() => db.cases.toArray()) ?? [];
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleAction = async (action: "duplicate" | "archive" | "delete", caseId: string) => {
    const caseItem = cases.find(c => c.id === caseId);
    if (!caseItem) return;

    if (action === "delete") {
      try {
        await db.cases.delete(caseId);
        toast.success(`Caso "${caseItem.name}" eliminado.`);
      } catch (error) {
        console.error("Error deleting case:", error);
        toast.error("Error al eliminar el caso.");
      }
      return;
    }

    let actionText = "";
    switch(action) {
      case "duplicate": actionText = "duplicado"; break;
      case "archive": actionText = "archivado"; break;
    }
    toast.success(`Caso "${caseItem.name}" ${actionText} (simulación).`);
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold">Casos de Pacientes</h1>
            <p className="text-muted-foreground">
              Selecciona un caso para ver sus detalles o abrir el editor.
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>Nuevo Caso de Paciente</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cases?.length === 0 && (
             <div className="col-span-full text-center py-10 text-muted-foreground">
               No hay casos registrados. Crea uno nuevo para comenzar.
             </div>
          )}
          {cases.map((caseItem) => (
            <Card key={caseItem.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                     <CardTitle className="cursor-pointer hover:underline" onClick={() => setSelectedCase(caseItem)}>
                      {caseItem.name}
                    </CardTitle>
                    <CardDescription>{caseItem.description}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedCase(caseItem)}>Ver/Editar Detalles</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('duplicate', caseItem.id)}>Duplicar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('archive', caseItem.id)}>Archivar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleAction('delete', caseItem.id)}>Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                 <Badge variant={caseItem.status === "Completado" ? "default" : "secondary"}>
                  {caseItem.status}
                </Badge>
                <Button asChild variant="secondary" size="sm">
                  <Link to={`/project/${caseItem.id}`}>Abrir Editor</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <CaseDetailsModal 
        caseData={selectedCase} 
        onOpenChange={(isOpen) => { if (!isOpen) setSelectedCase(null); }} 
      />
      <CreateCaseModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
    </>
  );
}
