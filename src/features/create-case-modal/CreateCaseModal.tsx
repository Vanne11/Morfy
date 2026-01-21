import { useState } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/app/db";
import type { Case } from "@/types";
import { useTranslation } from "react-i18next";
import { TEMPLATE_REGISTRY } from "@/features/templates/registry";
import { cn } from "@/lib/utils";

interface CreateCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCaseModal({ open, onOpenChange }: CreateCaseModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("wrist_splint");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("features.createCaseModal.toastNameRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const templateConfig = TEMPLATE_REGISTRY[selectedTemplate];
      
      const newCase: Case = {
        id: nanoid(),
        name: name.trim(),
        description: description.trim(),
        status: "Nuevo",
        notes: notes.trim(),
        // Guardamos la configuración inicial directamente en el caso
        // Esto actuará como el "archivo" inicial
        templateId: selectedTemplate,
        parametricModel: {
            mode: selectedTemplate === 'custom_nodes' ? 'node_editor' : 'procedural',
            params: templateConfig.defaultParams,
            ui_controls: templateConfig.controls,
            ui_values: templateConfig.defaultParams
        }
      };

      await db.cases.add(newCase);
      toast.success(t("features.createCaseModal.toastSuccess"));
      
      // Reset form and close
      setName("");
      setDescription("");
      setNotes("");
      setSelectedTemplate("wrist_splint");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating case:", error);
      toast.error(t("features.createCaseModal.toastError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("features.createCaseModal.title")}</DialogTitle>
          <DialogDescription>
            {t("features.createCaseModal.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="space-y-4">
              <Label className="text-base font-semibold">1. {t("features.createCaseModal.labelDetails")}</Label>
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right text-xs uppercase text-muted-foreground">
                    {t("features.createCaseModal.labelName")}
                    </Label>
                    <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("features.createCaseModal.placeholderName")}
                    className="col-span-3"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right text-xs uppercase text-muted-foreground">
                    {t("features.createCaseModal.labelDescription")}
                    </Label>
                    <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("features.createCaseModal.placeholderDescription")}
                    className="col-span-3"
                    />
                </div>
              </div>
          </div>

          <div className="space-y-4">
             <Label className="text-base font-semibold">2. {t("features.createCaseModal.selectTemplate")}</Label>
             <div className="grid grid-cols-3 gap-3">
                {Object.values(TEMPLATE_REGISTRY).map((tpl) => {
                    const Icon = tpl.icon;
                    const isSelected = selectedTemplate === tpl.id;
                    return (
                        <div 
                            key={tpl.id}
                            className={cn(
                                "cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center gap-2 transition-all hover:bg-accent",
                                isSelected ? "border-primary bg-primary/5" : "border-transparent bg-muted"
                            )}
                            onClick={() => setSelectedTemplate(tpl.id)}
                        >
                            <Icon className={cn("h-6 w-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-xs font-medium text-center">{tpl.name}</span>
                        </div>
                    );
                })}
             </div>
             <p className="text-xs text-muted-foreground text-center min-h-[1.5em]">
                {TEMPLATE_REGISTRY[selectedTemplate]?.description}
             </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("features.createCaseModal.buttonCreating") : t("features.createCaseModal.buttonCreate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
