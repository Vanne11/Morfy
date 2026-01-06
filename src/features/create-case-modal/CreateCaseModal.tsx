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
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/app/db";
import type { Case } from "@/types";
import { useTranslation } from "react-i18next";

interface CreateCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCaseModal({ open, onOpenChange }: CreateCaseModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("features.createCaseModal.toastNameRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const newCase: Case = {
        id: nanoid(),
        name: name.trim(),
        description: description.trim(),
        status: "Nuevo",
        notes: notes.trim(),
      };

      await db.cases.add(newCase);
      toast.success(t("features.createCaseModal.toastSuccess"));
      
      // Reset form and close
      setName("");
      setDescription("");
      setNotes("");
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("features.createCaseModal.title")}</DialogTitle>
          <DialogDescription>
            {t("features.createCaseModal.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
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
            <Label htmlFor="description" className="text-right">
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
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">
              {t("features.createCaseModal.labelNotes")}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("features.createCaseModal.placeholderNotes")}
              className="col-span-3"
            />
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
