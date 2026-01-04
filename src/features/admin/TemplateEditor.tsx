import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Center, RoundedBox, ContactShadows } from "@react-three/drei";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db, type ITemplate } from "@/app/db";
import { Info, Code, Camera, HelpCircle, ChevronDown } from "lucide-react";

interface TemplateEditorProps {
  template: ITemplate | null;
  onSaved: () => void;
  onCancel: () => void;
}

// --- Sub-componente de Previsualización con Captura ---
const LivePreview = forwardRef(({ data }: { data: any }, ref) => {
  const params = data?.params || {};
  const l = Number(params.length) || 10;
  const w = Number(params.width) || 10;
  const t = Number(params.thickness) || 1;
  const color = params.color || "#cccccc";

  const SceneCapture = () => {
    const { gl, scene, camera } = useThree();
    useImperativeHandle(ref, () => ({
      capture: () => {
        gl.render(scene, camera); // Forzar render para captura limpia
        return gl.domElement.toDataURL("image/webp", 0.5);
      }
    }));
    return null;
  };

  return (
    <div className="w-full h-full min-h-[400px] bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 relative group">
      <div className="absolute top-3 left-3 z-10 bg-black/60 px-2 py-1 rounded text-[10px] uppercase font-bold text-white/70 border border-white/10 backdrop-blur">
        Vista Previa Real-Time
      </div>
      <Canvas 
        gl={{ preserveDrawingBuffer: true }} 
        camera={{ position: [120, 120, 120], fov: 40 }}
      >
        <SceneCapture />
        <ambientLight intensity={0.8} />
        <pointLight position={[100, 100, 100]} intensity={1.5} />
        <gridHelper args={[300, 30, "#333", "#222"]} />
        <Center top>
          <RoundedBox key={`${l}-${w}-${t}-${color}`} args={[w, t, l]} radius={1} smoothness={4}>
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
          </RoundedBox>
        </Center>
        <ContactShadows position={[0, -0.1, 0]} opacity={0.6} scale={300} blur={2.5} far={10} />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
});

export function TemplateEditor({ template, onSaved, onCancel }: TemplateEditorProps) {
  const previewRef = useRef<any>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [jsonContent, setJsonContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category);
      setDescription(template.description);
      setJsonContent(JSON.stringify(template.content, null, 2));
      setPreviewData(template.content);
    } else {
      const defaultContent = {
        name: "Nueva Férula Ponderada",
        type: "calculated_flat",
        ui_controls: [
          {
            "id": "escala",
            "label": "Talla Paciente",
            "type": "slider",
            "min": 0.5, "max": 2.0, "step": 0.1, "default": 1.0,
            "impacts": { "length": 60, "width": 20 }
          }
        ],
        params: { length: 60, width: 20, thickness: 2.4, color: "#60a5fa" }
      };
      setName("");
      setCategory("General");
      setDescription("");
      setJsonContent(JSON.stringify(defaultContent, null, 2));
      setPreviewData(defaultContent);
    }
  }, [template]);

  const handleJsonChange = (val: string) => {
    setJsonContent(val);
    try {
      const parsed = JSON.parse(val);
      setPreviewData(parsed);
    } catch (e) {}
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(jsonContent);
    } catch (e) {
      return toast.error("JSON inválido");
    }

    setIsSaving(true);
    try {
      // CAPTURA AUTOMÁTICA DEL THUMBNAIL
      const thumb = previewRef.current?.capture();

      const id = template?.id || nanoid();
      const newTemplate: ITemplate = {
        id,
        name,
        category,
        description,
        thumbnail: thumb,
        content: parsedContent,
        createdAt: template?.createdAt || new Date(),
      };

      await db.templates.put(newTemplate);
      toast.success("Plantilla y Miniatura guardadas");
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LADO IZQUIERDO: EDITOR Y GUIA (7/12) */}
        <div className="xl:col-span-7 space-y-6">
          <Card className="shadow-lg border-primary/10">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    Ingeniería de Plantilla
                </CardTitle>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2 shadow-md">
                        <Camera className="h-4 w-4" />
                        {isSaving ? "Guardando..." : "Guardar y Capturar"}
                    </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Nombre Público</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre para el médico" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Categoría</Label>
                      <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ej. Dedos" />
                  </div>
              </div>
              <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Descripción Clínica</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Instrucciones breves..." />
              </div>
              <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                      <Label className="text-xs uppercase font-bold text-primary">Definición Técnica (JSON)</Label>
                      <Badge variant="secondary" className="text-[9px]">Calculated Flat V1</Badge>
                  </div>
                  <Textarea 
                      value={jsonContent} 
                      onChange={e => handleJsonChange(e.target.value)} 
                      rows={18}
                      className="font-mono text-[11px] bg-zinc-950 text-emerald-400 p-4 rounded-lg selection:bg-emerald-500/30 border-zinc-800 leading-relaxed shadow-inner"
                  />
              </div>
            </CardContent>
          </Card>

          {/* GUIA DE AYUDA ACORDEÓN */}
          <Card className="border-blue-500/20 bg-blue-500/5 shadow-none">
            <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <HelpCircle className="h-4 w-4" /> Guía de Referencia JSON
                </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0 text-sm">
                <div className="space-y-1">
                    <details className="group border-b border-border">
                        <summary className="flex items-center justify-between py-3 text-xs font-bold uppercase tracking-wider cursor-pointer list-none hover:text-primary transition-colors">
                            1. Controles de Usuario (ui_controls)
                            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-muted-foreground" />
                        </summary>
                        <div className="pb-4 text-xs text-muted-foreground space-y-2 leading-relaxed animate-in fade-in zoom-in-95 duration-200">
                            <p>Define los sliders que el médico verá en el editor principal.</p>
                            <code className="block bg-zinc-950 p-2 rounded text-zinc-300">
                                "id": "unico", "label": "Título", "min": 0, "max": 100, "default": 50
                            </code>
                        </div>
                    </details>

                    <details className="group border-b border-border">
                        <summary className="flex items-center justify-between py-3 text-xs font-bold uppercase tracking-wider cursor-pointer list-none hover:text-primary transition-colors">
                            2. Sistema de Impactos (Ponderación)
                            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-muted-foreground" />
                        </summary>
                        <div className="pb-4 text-xs text-muted-foreground space-y-2 animate-in fade-in zoom-in-95 duration-200">
                            <p>Relaciona el slider con las medidas reales. <br/><strong>Fórmula:</strong> Medida = ValorSlider * Peso</p>
                            <code className="block bg-zinc-950 p-2 rounded text-zinc-300 italic">
                                "impacts": &#123; "length": 60, "width": 20 &#125;
                            </code>
                            <p>Si el slider está en 1.2, el largo será 72mm (1.2 * 60).</p>
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between py-3 text-xs font-bold uppercase tracking-wider cursor-pointer list-none hover:text-primary transition-colors">
                            3. Parámetros Técnicos (params)
                            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-muted-foreground" />
                        </summary>
                        <div className="pb-4 text-[11px] text-muted-foreground grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                            <div><strong>length</strong>: Largo (Z) en mm.</div>
                            <div><strong>width</strong>: Ancho (X) en mm.</div>
                            <div><strong>thickness</strong>: Grosor (Y) en mm.</div>
                            <div><strong>color</strong>: HEX (ej. #ff0000).</div>
                        </div>
                    </details>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* LADO DERECHO: VISTA PREVIA (5/12) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
            <div className="sticky top-6 space-y-6">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Preview 3D Dinámico</Label>
                        <span className="text-[10px] text-zinc-500 italic">La miniatura se captura al guardar</span>
                    </div>
                    <LivePreview ref={previewRef} data={previewData} />
                </div>

                <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4 flex items-start gap-3">
                        <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-xs space-y-1">
                            <p className="font-bold text-amber-600 dark:text-amber-400 uppercase">Consejo de Diseño</p>
                            <p className="text-muted-foreground leading-normal text-[11px]">
                                Centra bien tu pieza en el visor antes de guardar. 
                                El sistema capturará exactamente lo que ves en el recuadro negro para usarlo como icono en la librería.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

      </div>
    </div>
  );
}
