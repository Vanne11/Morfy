// src/features/layout/AppLayout.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ProjectGallery } from "../project-gallery/ProjectGallery";
import { Viewer } from "../viewer/Viewer";
import { PropertiesPanel } from "../properties-panel/PropertiesPanel";
import { VisualGeometryEditor } from "../admin/TemplateEditor/VisualGeometryEditor";
import { AppMenubar } from "./Menubar";
import { db } from "@/app/db";
import type { SelectedObject } from "@/types";
import { Button } from "@/components/ui/button";
import { PenLine, Box } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved";

export function AppLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedObject, setSelectedObject] = useState<SelectedObject>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parametricData, setParametricData] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag para evitar que el auto-save se dispare por cambios de la BD
  const skipNextAutoSave = useRef(false);

  // --- Live query al caso actual (se actualiza automáticamente cuando la BD cambia) ---
  const currentCase = useLiveQuery(
    async () => {
      if (!projectId) return null;
      return await db.cases.get(projectId);
    },
    [projectId]
  );

  // --- Auto-seleccionar modelo maestro al cargar o cuando cambia el caso en la BD ---
  useEffect(() => {
    if (!currentCase?.parametricModel) return;

    // Si no hay nada seleccionado, o si lo seleccionado es el modelo maestro,
    // sincronizar parametricData con lo que hay en la BD
    const isMasterSelected = !selectedObject || selectedObject.id === 'master-model';

    if (isMasterSelected) {
      // Actualizar selectedObject para que apunte al maestro
      setSelectedObject({
        id: 'master-model',
        name: currentCase.name + " (Master)",
        type: 'parametric',
        fileType: 'json',
        fileUrl: '',
        // @ts-ignore
        parametricModel: currentCase.parametricModel,
      });

      // Solo actualizar parametricData si no estamos en medio de una edición del usuario
      // (evitar loop: usuario edita → save → BD cambia → live query → sobreescribe estado)
      if (skipNextAutoSave.current) {
        skipNextAutoSave.current = false;
      } else {
        setParametricData(currentCase.parametricModel);
      }
    }
  }, [currentCase]); // Depender solo de currentCase, NO de selectedObject

  // --- Auto-save paramétrico a IndexedDB con debounce ---
  const persistParametricData = useCallback(async (data: any) => {
    if (!projectId || !data) return;
    try {
      setSaveStatus("saving");
      skipNextAutoSave.current = true; // Marcar para no re-sincronizar
      await db.cases.update(projectId, {
        parametricModel: data,
        status: "En Progreso",
      });
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Error guardando modelo paramétrico:", err);
      setSaveStatus("idle");
    }
  }, [projectId]);

  // Cargar datos cuando cambia el objeto seleccionado (para archivos que NO son maestros)
  useEffect(() => {
    if (!selectedObject) return;
    if (selectedObject.id === 'master-model') {
      // El maestro ya se maneja via useLiveQuery arriba
      // @ts-ignore
      if (selectedObject.parametricModel) {
        // @ts-ignore
        setParametricData(selectedObject.parametricModel);
      }
      return;
    }

    const isJson = selectedObject.fileType === 'json' || selectedObject.name.toLowerCase().endsWith('.json');

    if (selectedObject.fileUrl && isJson) {
      fetch(selectedObject.fileUrl)
        .then(res => res.json())
        .then(data => {
          if (!data.params || !data.geometry) {
            setParametricData({
              mode: "procedural",
              params: { length: 220, widthProximal: 85, widthDistal: 60, thickness: 3, curvature: 190, color: "#20b2aa" },
              ui_values: { length: 220, widthProximal: 85, widthDistal: 60, thickness: 3, curvature: 190 },
              ui_controls: []
            });
          } else {
            setParametricData(data);
          }
        })
        .catch(err => {
          console.error("Error parsing parametric JSON", err);
          setParametricData(null);
        });
    } else if (!isJson) {
      const isImage = ['png', 'jpg', 'jpeg'].includes(selectedObject.fileType || '');
      if (isImage) {
        setParametricData(null);
      } else {
        // STL/OBJ → controles de transformación básicos
        setParametricData({
          mode: 'mesh',
          params: { scale: 1, rotationX: -90, rotationY: 0, rotationZ: 0, color: '#e2e8f0' },
          ui_controls: [
            { id: 'scale', label: 'Escala', min: 0.01, max: 10, step: 0.01, default: 1, impacts: { scale: { operation: 'set' } } },
            { id: 'rotationX', label: 'Rotación X (°)', min: -180, max: 180, step: 1, default: -90, impacts: { rotationX: { operation: 'set' } } },
            { id: 'rotationY', label: 'Rotación Y (°)', min: -180, max: 180, step: 1, default: 0, impacts: { rotationY: { operation: 'set' } } },
            { id: 'rotationZ', label: 'Rotación Z (°)', min: -180, max: 180, step: 1, default: 0, impacts: { rotationZ: { operation: 'set' } } },
          ],
          ui_values: { scale: 1, rotationX: -90, rotationY: 0, rotationZ: 0 }
        });
      }
    }
  }, [selectedObject]);

  // Debounced auto-save cuando cambia parametricData
  useEffect(() => {
    if (!parametricData || !projectId) return;
    // Solo auto-save si el modelo maestro está seleccionado
    if (selectedObject?.id !== 'master-model') return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistParametricData(parametricData);
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [parametricData, projectId, persistParametricData, selectedObject]);

  const handleParamUpdate = (newParams: any, uiValues?: any) => {
    setParametricData((prev: any) => ({
      ...prev,
      params: newParams,
      ui_values: uiValues || prev.ui_values
    }));
  };

  // Escuchar actualizaciones desde el Editor de Nodos
  useEffect(() => {
    const handleNodeUpdate = (e: any) => {
      const newParams = e.detail;
      setParametricData((prev: any) => ({
        ...prev,
        params: { ...prev?.params, ...newParams },
        ui_values: { ...prev?.ui_values, ...newParams }
      }));
    };

    // @ts-ignore
    window.addEventListener('node-editor-update', handleNodeUpdate);
    // @ts-ignore
    return () => window.removeEventListener('node-editor-update', handleNodeUpdate);
  }, []);

  const isNodeEditorMode = parametricData?.mode === 'node_editor';
  const [show2DEditor, setShow2DEditor] = useState(false);

  // El editor 2D se puede abrir manualmente o por modo node_editor
  const showEditor = isNodeEditorMode || show2DEditor;

  return (
    <div className="h-full w-full bg-background text-foreground flex flex-col overflow-hidden">
      <AppMenubar saveStatus={saveStatus} />
      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 w-full border"
      >
        <ResizablePanel defaultSize={15} minSize={10}>
          <ProjectGallery onObjectSelect={setSelectedObject} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={65} minSize={30}>
          <div className="h-full flex flex-col">
            {/* Toggle 2D/3D */}
            {!isNodeEditorMode && parametricData?.mode === 'procedural' && (
              <div className="h-8 bg-muted/50 border-b flex items-center px-2 gap-1 shrink-0">
                <Button
                  variant={!show2DEditor ? "default" : "ghost"}
                  size="sm"
                  className="h-6 text-[10px] gap-1 px-2"
                  onClick={() => setShow2DEditor(false)}
                >
                  <Box className="h-3 w-3" /> 3D
                </Button>
                <Button
                  variant={show2DEditor ? "default" : "ghost"}
                  size="sm"
                  className="h-6 text-[10px] gap-1 px-2"
                  onClick={() => setShow2DEditor(true)}
                >
                  <PenLine className="h-3 w-3" /> 2D
                </Button>
              </div>
            )}

            {/* Contenido */}
            <div className="flex-1 min-h-0">
              {showEditor ? (
                <ResizablePanelGroup orientation="vertical">
                  <ResizablePanel defaultSize={60}>
                    <Viewer
                      selectedObject={selectedObject}
                      parametricData={parametricData}
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={40}>
                    <div className="relative h-full w-full">
                      <VisualGeometryEditor />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <Viewer
                  selectedObject={selectedObject}
                  parametricData={parametricData}
                />
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={20} minSize={15}>
          <PropertiesPanel
            selectedObject={selectedObject}
            parametricData={parametricData}
            onUpdateParams={handleParamUpdate}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
