import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Center, ContactShadows } from "@react-three/drei";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db, type ITemplate } from "@/app/db";
import { Info, Code, Camera, HelpCircle, ChevronDown, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { SVGParametricModel } from "@/features/viewer/components/SVGParametricModel";
import { validateGeometryDefinition, generateSVGPreview } from "@/utils/svgToThree";
import { evaluateExpression } from "@/utils/paramEvaluator";

interface TemplateEditorProps {
  template: ITemplate | null;
  isSystemTemplate?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

// --- Sub-componente de Previsualización con Captura ---
const LivePreview = forwardRef(({ data }: { data: any }, ref) => {
  const params = data?.params || {};
  const color = params.color || "#60a5fa";

  const SceneCapture = () => {
    const { gl, scene, camera } = useThree();
    useImperativeHandle(ref, () => ({
      capture: () => {
        gl.render(scene, camera);
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
          {data?.geometry ? (
            <SVGParametricModel
              geometry={data.geometry}
              params={params}
              color={color}
            />
          ) : (
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#666" wireframe />
            </mesh>
          )}
        </Center>
        <ContactShadows position={[0, -0.1, 0]} opacity={0.6} scale={300} blur={2.5} far={10} />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
});

// --- Calculadora de Expresiones ---
function ExpressionCalculator({ params }: { params: Record<string, any> }) {
  const [expression, setExpression] = useState("params.longitud * 0.5");
  const [result, setResult] = useState<number | string>("");

  const handleCalculate = () => {
    try {
      const evaluated = evaluateExpression(expression, params);
      setResult(evaluated);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Error");
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Prueba expresiones con los parámetros actuales del template
      </div>
      <div className="space-y-2">
        <Input
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="params.longitud * 0.5"
          className="font-mono text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCalculate();
            }
          }}
        />
        <Button
          onClick={handleCalculate}
          size="sm"
          variant="secondary"
          className="w-full text-xs"
        >
          Calcular
        </Button>
        {result !== "" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Resultado</div>
            <div className="font-mono text-sm text-emerald-400">
              {typeof result === "number" ? result.toFixed(2) : result}
            </div>
          </div>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground space-y-1">
        <div className="font-bold">Parámetros disponibles:</div>
        <div className="bg-zinc-950 p-2 rounded font-mono text-zinc-400">
          {Object.entries(params).map(([key, value]) => (
            <div key={key}>
              params.{key} = {typeof value === "number" ? value : JSON.stringify(value)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Preview SVG 2D ---
function SVGPreview2D({ geometry, params }: { geometry: any; params: Record<string, any> }) {
  const [svgCode, setSvgCode] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    try {
      const svg = generateSVGPreview(geometry, params);
      setSvgCode(svg);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando SVG");
      setSvgCode("");
    }
  }, [geometry, params]);

  if (error) {
    return (
      <div className="text-xs text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="bg-white rounded border border-zinc-300 p-4 flex items-center justify-center min-h-[200px]">
        {svgCode ? (
          <div dangerouslySetInnerHTML={{ __html: svgCode }} />
        ) : (
          <div className="text-zinc-400 text-xs">Generando preview...</div>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">
        Vista 2D del perfil SVG antes de extruir
      </div>
    </div>
  );
}

export function TemplateEditor({ template, isSystemTemplate = false, onSaved, onCancel }: TemplateEditorProps) {
  const previewRef = useRef<any>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [jsonContent, setJsonContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [jsonParseError, setJsonParseError] = useState<string>("");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category);
      setDescription(template.description);
      const content = template.content;
      setJsonContent(JSON.stringify(content, null, 2));
      setPreviewData(content);

      // Validar geometría
      if (content.geometry) {
        const validation = validateGeometryDefinition(content.geometry);
        setValidationErrors(validation.errors);
      } else {
        setValidationErrors([]);
      }
      setJsonParseError("");
    } else {
      const defaultContent = {
        type: "svg_parametric",
        params: {
          longitud: 80,
          ancho: 30,
          grosor: 3,
          color: "#60a5fa"
        },
        geometry: {
          vertices: {
            v1: { x: 0, y: 0 },
            v2: { x: "params.longitud", y: 0 },
            v3: { x: "params.longitud", y: "params.ancho" },
            v4: { x: 0, y: "params.ancho" }
          },
          contours: [
            {
              id: "exterior",
              type: "outer",
              closed: true,
              elements: [
                { type: "line", from: "v1", to: "v2" },
                { type: "line", from: "v2", to: "v3" },
                { type: "line", from: "v3", to: "v4" },
                { type: "line", from: "v4", to: "v1" }
              ]
            }
          ],
          extrusion: {
            height: "params.grosor",
            bevel: true,
            bevelThickness: 0.3,
            bevelSize: 0.3,
            bevelSegments: 3
          }
        }
      };
      setName("");
      setCategory("General");
      setDescription("");
      setJsonContent(JSON.stringify(defaultContent, null, 2));
      setPreviewData(defaultContent);
      setValidationErrors([]);
      setJsonParseError("");
    }
  }, [template]);

  const handleJsonChange = (val: string) => {
    setJsonContent(val);

    try {
      const parsed = JSON.parse(val);
      setJsonParseError("");
      setPreviewData(parsed);

      // Validar geometría
      if (parsed.geometry) {
        const validation = validateGeometryDefinition(parsed.geometry);
        setValidationErrors(validation.errors);
      } else {
        setValidationErrors(["No hay geometría definida"]);
      }
    } catch (e) {
      setJsonParseError(e instanceof Error ? e.message : "JSON inválido");
      setValidationErrors([]);
    }
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

      // Si es plantilla del sistema, SIEMPRE crear un nuevo ID (no modificar el original)
      const id = isSystemTemplate ? nanoid() : (template?.id || nanoid());

      const newTemplate: ITemplate = {
        id,
        name,
        category,
        description,
        thumbnail: thumb,
        content: parsedContent,
        createdAt: new Date(), // Nueva fecha de creación para copias del sistema
      };

      await db.templates.put(newTemplate);

      if (isSystemTemplate) {
        toast.success("Copia personalizada creada exitosamente");
      } else {
        toast.success("Plantilla y Miniatura guardadas");
      }

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

      {isSystemTemplate && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-bold text-blue-600 dark:text-blue-400">Editando Plantilla del Sistema</p>
              <p className="text-muted-foreground text-xs">
                Esta es una plantilla predeterminada. Al guardar, se creará una <strong>copia personalizada</strong> en tu librería.
                La plantilla original permanecerá intacta.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
                        {isSaving
                          ? "Guardando..."
                          : isSystemTemplate
                            ? "Guardar como Copia"
                            : "Guardar y Capturar"
                        }
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
                      <div className="flex gap-2 items-center">
                        {jsonParseError ? (
                          <Badge variant="destructive" className="text-[9px] gap-1">
                            <AlertCircle className="h-3 w-3" />
                            JSON Error
                          </Badge>
                        ) : validationErrors.length > 0 ? (
                          <Badge variant="destructive" className="text-[9px] gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {validationErrors.length} Errores
                          </Badge>
                        ) : jsonContent && !jsonParseError ? (
                          <Badge variant="default" className="text-[9px] gap-1 bg-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Válido
                          </Badge>
                        ) : null}
                        <Badge variant="secondary" className="text-[9px]">
                          SVG Paramétrico V2
                        </Badge>
                      </div>
                  </div>
                  <Textarea
                      value={jsonContent}
                      onChange={e => handleJsonChange(e.target.value)}
                      rows={18}
                      className="font-mono text-[11px] bg-zinc-950 text-emerald-400 p-4 rounded-lg selection:bg-emerald-500/30 border-zinc-800 leading-relaxed shadow-inner"
                  />
                  {jsonParseError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-red-600 dark:text-red-400">Error de Sintaxis JSON</p>
                          <p className="text-red-700 dark:text-red-300 font-mono text-[10px]">{jsonParseError}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {!jsonParseError && validationErrors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div className="text-xs space-y-1 flex-1">
                          <p className="font-bold text-red-600 dark:text-red-400">Errores de Validación de Geometría</p>
                          <ul className="text-red-700 dark:text-red-300 space-y-0.5 text-[10px]">
                            {validationErrors.map((error, i) => (
                              <li key={i} className="font-mono">• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
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
                    {/* Template Básico */}
                    <details className="group border-b border-border">
                        <summary className="flex items-center justify-between py-3 text-xs font-bold uppercase tracking-wider cursor-pointer list-none hover:text-primary transition-colors">
                            Template Básico (Rectángulo)
                            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-muted-foreground" />
                        </summary>
                        <div className="pb-4 text-xs text-muted-foreground space-y-3 animate-in fade-in zoom-in-95 duration-200">
                            <p className="text-green-600 dark:text-green-400 font-bold">Punto de partida simple</p>
                            <div className="space-y-2">
                              <p className="font-bold">Estructura básica:</p>
                              <div className="relative">
                                <pre className="bg-zinc-950 p-3 rounded text-zinc-300 text-[10px] overflow-x-auto max-h-60">
{`{
  "type": "svg_parametric",
  "params": {
    "longitud": 80,
    "ancho": 30,
    "grosor": 3,
    "color": "#60a5fa"
  },
  "geometry": {
    "vertices": {
      "v1": { "x": 0, "y": 0 },
      "v2": { "x": "params.longitud", "y": 0 },
      "v3": { "x": "params.longitud", "y": "params.ancho" },
      "v4": { "x": 0, "y": "params.ancho" }
    },
    "contours": [
      {
        "id": "exterior",
        "type": "outer",
        "closed": true,
        "elements": [
          { "type": "line", "from": "v1", "to": "v2" },
          { "type": "line", "from": "v2", "to": "v3" },
          { "type": "line", "from": "v3", "to": "v4" },
          { "type": "line", "from": "v4", "to": "v1" }
        ]
      }
    ],
    "extrusion": {
      "height": "params.grosor",
      "bevel": true,
      "bevelThickness": 0.3,
      "bevelSize": 0.3
    }
  }
}`}</pre>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="absolute top-1 right-1 h-6 w-6 p-0"
                                  onClick={() => {
                                    const snippet = `{
  "type": "svg_parametric",
  "params": {
    "longitud": 80,
    "ancho": 30,
    "grosor": 3,
    "color": "#60a5fa"
  },
  "geometry": {
    "vertices": {
      "v1": { "x": 0, "y": 0 },
      "v2": { "x": "params.longitud", "y": 0 },
      "v3": { "x": "params.longitud", "y": "params.ancho" },
      "v4": { "x": 0, "y": "params.ancho" }
    },
    "contours": [
      {
        "id": "exterior",
        "type": "outer",
        "closed": true,
        "elements": [
          { "type": "line", "from": "v1", "to": "v2" },
          { "type": "line", "from": "v2", "to": "v3" },
          { "type": "line", "from": "v3", "to": "v4" },
          { "type": "line", "from": "v4", "to": "v1" }
        ]
      }
    ],
    "extrusion": {
      "height": "params.grosor",
      "bevel": true,
      "bevelThickness": 0.3,
      "bevelSize": 0.3
    }
  }
}`;
                                    navigator.clipboard.writeText(snippet);
                                    toast.success("Template V2 copiado");
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                        </div>
                    </details>

                    <details className="group border-b border-border">
                        <summary className="flex items-center justify-between py-3 text-xs font-bold uppercase tracking-wider cursor-pointer list-none hover:text-primary transition-colors">
                            Expresiones Paramétricas
                            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-muted-foreground" />
                        </summary>
                        <div className="pb-4 text-xs text-muted-foreground space-y-2 animate-in fade-in zoom-in-95 duration-200">
                            <p>Las coordenadas pueden usar expresiones matemáticas:</p>
                            <div className="bg-zinc-950 p-3 rounded text-zinc-300 text-[10px] space-y-1 font-mono">
                              <div>"x": "params.longitud * 0.5"</div>
                              <div>"y": "params.ancho + 10"</div>
                              <div>"x": "Math.sqrt(params.area)"</div>
                              <div>"y": "Math.max(params.a, params.b)"</div>
                            </div>
                            <p className="text-[10px] mt-2">Funciones disponibles: sqrt, max, min, sin, cos, pow, PI, abs</p>
                        </div>
                    </details>

                    <details className="group border-b border-border">
                        <summary className="flex items-center justify-between py-3 text-xs font-bold uppercase tracking-wider cursor-pointer list-none hover:text-primary transition-colors">
                            Tipos de Elementos
                            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-muted-foreground" />
                        </summary>
                        <div className="pb-4 text-xs text-muted-foreground space-y-2 animate-in fade-in zoom-in-95 duration-200">
                            <div className="grid gap-2">
                              <div className="bg-zinc-950 p-2 rounded">
                                <div className="font-bold text-zinc-200">line</div>
                                <code className="text-[10px]">{`{ "type": "line", "from": "v1", "to": "v2" }`}</code>
                              </div>
                              <div className="bg-zinc-950 p-2 rounded">
                                <div className="font-bold text-zinc-200">arc (arco circular)</div>
                                <code className="text-[10px]">{`{ "type": "arc", "from": "v1", "to": "v2", "radius": 10, "clockwise": true }`}</code>
                              </div>
                              <div className="bg-zinc-950 p-2 rounded">
                                <div className="font-bold text-zinc-200">bezier_quadratic</div>
                                <code className="text-[10px]">{`{ "type": "bezier_quadratic", "from": "v1", "to": "v2", "control": "c1" }`}</code>
                              </div>
                            </div>
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between py-3 text-xs font-bold uppercase tracking-wider cursor-pointer list-none hover:text-primary transition-colors">
                            UI Controls (Sliders)
                            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-muted-foreground" />
                        </summary>
                        <div className="pb-4 text-xs text-muted-foreground space-y-2 animate-in fade-in zoom-in-95 duration-200">
                            <p>Define los controles que verá el usuario:</p>
                            <div className="relative">
                              <pre className="bg-zinc-950 p-3 rounded text-zinc-300 text-[10px]">
{`"ui_controls": [
  {
    "id": "longitud",
    "label": "Longitud de Férula",
    "type": "slider",
    "min": 50,
    "max": 150,
    "default": 80,
    "impacts": {
      "longitud": { "operation": "set" }
    }
  }
]`}</pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                onClick={() => {
                                  navigator.clipboard.writeText(`{
  "id": "longitud",
  "label": "Longitud de Férula",
  "type": "slider",
  "min": 50,
  "max": 150,
  "default": 80,
  "impacts": {
    "longitud": { "operation": "set" }
  }
}`);
                                  toast.success("Control copiado");
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-[10px] space-y-1 mt-2">
                              <p><strong>operation: "set"</strong> - Asignación directa</p>
                              <p><strong>operation: "multiply", value: 100</strong> - Multiplica por 100</p>
                              <p><strong>operation: "add", value: 10</strong> - Suma 10</p>
                            </div>
                        </div>
                    </details>
                </div>
            </CardContent>
          </Card>

          {/* CALCULADORA DE EXPRESIONES */}
          <Card className="border-purple-500/20 bg-purple-500/5 shadow-none">
            <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <Code className="h-4 w-4" /> Calculadora de Expresiones
                </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
                <ExpressionCalculator params={previewData?.params || {}} />
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

                {/* PREVIEW SVG 2D */}
                {previewData?.geometry && !validationErrors.length && (
                  <Card className="bg-green-500/5 border-green-500/20">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-green-600 dark:text-green-400">
                            Preview SVG 2D
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0">
                      <SVGPreview2D geometry={previewData.geometry} params={previewData.params || {}} />
                    </CardContent>
                  </Card>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
