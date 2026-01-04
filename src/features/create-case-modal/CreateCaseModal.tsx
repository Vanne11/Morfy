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

interface CreateCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCaseModal({ open, onOpenChange }: CreateCaseModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre del paciente es obligatorio.");
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
      toast.success("Caso creado exitosamente.");
      
      // Reset form and close
      setName("");
      setDescription("");
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating case:", error);
      toast.error("Ocurrió un error al crear el caso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo Caso de Paciente</DialogTitle>
          <DialogDescription>
            Ingresa los detalles básicos del paciente para comenzar un nuevo tratamiento.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Descripción
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Lesión tendón extensor"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">
              Notas
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear Caso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
