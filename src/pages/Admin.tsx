import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, FileJson, ArrowLeft, Copy, Lock } from "lucide-react";
import { db, type ITemplate } from "@/app/db";
import { TemplateEditor } from "@/features/admin/TemplateEditor";
import { Badge } from "@/components/ui/badge";

interface ManagedTemplate extends ITemplate {
  isSystem?: boolean;
}

function TemplateManager() {
  const [editingTemplate, setEditingTemplate] = useState<ITemplate | null | undefined>(undefined);
  const [systemTemplates, setSystemTemplates] = useState<ManagedTemplate[]>([]);
  const customTemplates = useLiveQuery(() => db.templates.toArray()) ?? [];

  // Cargar plantillas del sistema para visualización
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}templates/index.json`)
      .then(res => res.json())
      .then(async (data) => {
          // Para cada entrada en el index, cargamos su contenido JSON real
          const fullTemplates = await Promise.all(data.map(async (item: any) => {
              const res = await fetch(`${import.meta.env.BASE_URL}${item.file.replace(/^\//, '')}`);
              const content = await res.json();
              return {
                  id: item.id,
                  name: item.name,
                  category: item.category,
                  description: item.description,
                  content: content,
                  createdAt: new Date(),
                  isSystem: true // Marca temporal
              };
          }));
          setSystemTemplates(fullTemplates as ManagedTemplate[]);
      });
  }, []);

  const allTemplates = useMemo((): ManagedTemplate[] => {
      return [
          ...systemTemplates,
          ...customTemplates.map(t => ({ ...t, isSystem: false }))
      ];
  }, [systemTemplates, customTemplates]);

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta plantilla personalizada?")) {
      try {
        await db.templates.delete(id);
        toast.success("Plantilla eliminada");
      } catch (error) {
        toast.error("Error al eliminar");
      }
    }
  };

  const handleDuplicate = async (tpl: any) => {
      try {
          const newTpl: ITemplate = {
              id: nanoid(),
              name: `${tpl.name} (Copia)`,
              category: tpl.category,
              description: tpl.description,
              content: JSON.parse(JSON.stringify(tpl.content)), // Clonación profunda
              createdAt: new Date()
          };
          await db.templates.add(newTpl);
          toast.success("Copia creada exitosamente");
      } catch (error) {
          toast.error("Error al duplicar");
      }
  };

  if (editingTemplate !== undefined) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(undefined)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver al listado
        </Button>
        <TemplateEditor 
          template={editingTemplate} 
          onSaved={() => setEditingTemplate(undefined)} 
          onCancel={() => setEditingTemplate(undefined)} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Catálogo de Plantillas</h3>
          <p className="text-sm text-muted-foreground">Visualiza las plantillas del sistema o crea las tuyas propias.</p>
        </div>
        <Button onClick={() => setEditingTemplate(null)} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva Plantilla
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allTemplates.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
            <FileJson className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">No hay plantillas disponibles.</p>
          </div>
        )}
        
        {allTemplates.map(tpl => (
          <Card key={tpl.id} className={tpl.isSystem ? "bg-muted/20 border-dashed overflow-hidden" : "hover:border-primary/50 transition-colors overflow-hidden"}>
            {/* Espacio para la miniatura */}
            <div className="aspect-video w-full bg-muted relative group">
                {tpl.thumbnail ? (
                    <img src={tpl.thumbnail} alt={tpl.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                        <FileJson className="h-12 w-12" />
                    </div>
                )}
                {tpl.isSystem && (
                    <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                         <Badge variant="secondary" className="bg-background/80 backdrop-blur">Solo Lectura</Badge>
                    </div>
                )}
            </div>
            
            <CardHeader className="pb-3 pt-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base truncate max-w-[150px]">{tpl.name}</CardTitle>
                    <Badge variant={tpl.isSystem ? "outline" : "default"} className="text-[8px] uppercase px-1 h-4">
                        {tpl.isSystem ? "Sistema" : "Mía"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">{tpl.category}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(tpl)} title="Duplicar">
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  {!tpl.isSystem ? (
                    <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTemplate(tpl)} title="Editar">
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(tpl.id)} title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-20 cursor-not-allowed" disabled title="Bloqueada">
                        <Lock className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                {tpl.description || "Sin descripción."}
              </p>
              <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-widest border-t pt-3">
                <span>Calculated V1</span>
                <span>{new Date(tpl.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function Admin() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-6">Administración del Sistema</h1>
      
      <Tabs defaultValue="templates" className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="templates">Gestión de Plantillas</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates" className="flex-1 mt-4">
            <TemplateManager />
        </TabsContent>
        
        <TabsContent value="users">
            <Card>
                <CardHeader><CardTitle>Usuarios</CardTitle></CardHeader>
                <CardContent>Módulo de usuarios pendiente.</CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="settings">
            <Card>
                 <CardHeader><CardTitle>Configuración</CardTitle></CardHeader>
                 <CardContent>Configuración general pendiente.</CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
