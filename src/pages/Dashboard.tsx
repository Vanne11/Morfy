import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import { CaseDetailsModal } from "@/features/case-details-modal/CaseDetailsModal";
import { CreateCaseModal } from "@/features/create-case-modal/CreateCaseModal";
import { db } from "@/app/db";
import type { Case } from "@/types";
import { useTranslation } from "react-i18next";
import { TEMPLATE_REGISTRY } from "@/features/templates/registry";

export function Dashboard() {
  const { t } = useTranslation();
  const cases = useLiveQuery(() => db.cases.toArray()) ?? [];
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleDuplicate = async (caseId: string) => {
    const caseItem = cases.find(c => c.id === caseId);
    if (!caseItem) return;

    try {
      const duplicated: Case = {
        ...caseItem,
        id: nanoid(),
        name: `${caseItem.name} (${t("pages.dashboard.copySuffix")})`,
        status: "Nuevo",
        // Deep-clone parametricModel para que no comparta referencia
        parametricModel: caseItem.parametricModel
          ? JSON.parse(JSON.stringify(caseItem.parametricModel))
          : undefined,
      };
      await db.cases.add(duplicated);
      toast.success(t("pages.dashboard.toastDuplicated", { name: caseItem.name }));
    } catch (error) {
      console.error("Error duplicating case:", error);
      toast.error(t("pages.dashboard.toastDuplicateError"));
    }
  };

  const handleAction = async (action: "archive" | "delete", caseId: string) => {
    const caseItem = cases.find(c => c.id === caseId);
    if (!caseItem) return;

    if (action === "delete") {
      try {
        await db.cases.delete(caseId);
        toast.success(t("pages.dashboard.toastDeleted", { name: caseItem.name }));
      } catch (error) {
        console.error("Error deleting case:", error);
        toast.error(t("pages.dashboard.toastDeleteError"));
      }
      return;
    }

    if (action === "archive") {
      try {
        await db.cases.update(caseId, { status: "Completado" });
        toast.success(t("pages.dashboard.toastArchived", { name: caseItem.name }));
      } catch (error) {
        console.error("Error archiving case:", error);
      }
    }
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold">{t("pages.dashboard.title")}</h1>
            <p className="text-muted-foreground">
              {t("pages.dashboard.description")}
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>{t("pages.dashboard.newCase")}</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cases?.length === 0 && (
             <div className="col-span-full text-center py-10 text-muted-foreground">
               {t("pages.dashboard.noCases")}
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
                      <DropdownMenuItem onClick={() => setSelectedCase(caseItem)}>{t("pages.dashboard.viewDetails")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(caseItem.id)}>{t("pages.dashboard.duplicate")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('archive', caseItem.id)}>{t("pages.dashboard.archive")}</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleAction('delete', caseItem.id)}>{t("pages.dashboard.delete")}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={caseItem.status === "Completado" ? "default" : "secondary"}>
                    {t(`common.statuses.${caseItem.status.toLowerCase()}`)}
                  </Badge>
                  {caseItem.templateId && TEMPLATE_REGISTRY[caseItem.templateId] && (
                    <Badge variant="outline" className="text-[9px]">
                      {(() => { const I = TEMPLATE_REGISTRY[caseItem.templateId!].icon; return <I className="h-3 w-3 mr-1 inline" />; })()}
                      {TEMPLATE_REGISTRY[caseItem.templateId].name}
                    </Badge>
                  )}
                  {caseItem.patientMeasurements?.affectedSide && (
                    <Badge variant="outline" className="text-[9px]">
                      {caseItem.patientMeasurements.affectedSide === 'right'
                        ? (t("features.createCaseModal.sideRight"))
                        : (t("features.createCaseModal.sideLeft"))
                      }
                    </Badge>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button asChild variant="secondary" size="sm">
                    <Link to={`/project/${caseItem.id}`}>{t("pages.dashboard.openEditor")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <CaseDetailsModal
        caseData={selectedCase}
        onOpenChange={(isOpen) => { if (!isOpen) setSelectedCase(null); }}
        onCaseUpdated={() => setSelectedCase(null)}
      />
      <CreateCaseModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
    </>
  );
}
