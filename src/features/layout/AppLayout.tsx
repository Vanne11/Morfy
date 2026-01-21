// src/features/layout/AppLayout.tsx
import { useState, useEffect } from "react";
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
import type { SelectedObject } from "@/types";

export function AppLayout() {
  const [selectedObject, setSelectedObject] = useState<SelectedObject>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parametricData, setParametricData] = useState<any>(null);

  // Cargar datos del JSON cuando cambia el objeto seleccionado
  useEffect(() => {
    // Caso 1: El objeto ya trae los datos paramétricos (Casos Nuevos creados desde el Modal)
    // @ts-ignore - Propiedad dinámica temporal
    if (selectedObject?.parametricModel) {
        // @ts-ignore
        setParametricData(selectedObject.parametricModel);
        return;
    }

    // Caso 2: Es un archivo JSON externo
    const isJson = selectedObject?.fileType === 'json' || selectedObject?.name.toLowerCase().endsWith('.json');
    
    if (selectedObject?.fileUrl && isJson) {
      fetch(selectedObject.fileUrl)
        .then(res => res.json())
        .then(data => {
            if (!data.params || !data.geometry) {
                console.warn("JSON incompleto, activando modo Procedural Splint");
                // Fallback default si el archivo está vacío
                setParametricData({
                    mode: "procedural",
                    params: { length: 220, widthProximal: 85, widthDistal: 60, thickness: 3, curvature: 190, color: "#20b2aa" },
                    ui_values: { length: 220, widthProximal: 85, widthDistal: 60, thickness: 3, curvature: 190 },
                    ui_controls: [] // Se rellenaría con default si fuera necesario
                });
            } else {
                setParametricData(data);
            }
        })
        .catch(err => {
            console.error("Error parsing parametric JSON", err);
             setParametricData(null);
        });
    } else {
      setParametricData(null);
    }
  }, [selectedObject]);

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
            // Mezclar con params existentes para no perder los que no vienen del nodo (ej: color)
            params: { ...prev?.params, ...newParams },
            // Actualizar ui_values para que los sliders del panel derecho (si los hay) se muevan también
            ui_values: { ...prev?.ui_values, ...newParams }
        }));
    };

    // @ts-ignore
    window.addEventListener('node-editor-update', handleNodeUpdate);
    // @ts-ignore
    return () => window.removeEventListener('node-editor-update', handleNodeUpdate);
  }, []);

  const isNodeEditorMode = parametricData?.mode === 'node_editor';

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col">
      <AppMenubar />
      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 w-full border"
      >
        <ResizablePanel defaultSize={15} minSize={10}>
          <ProjectGallery onObjectSelect={setSelectedObject} />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={65} minSize={30}>
            {isNodeEditorMode ? (
                 <ResizablePanelGroup orientation="vertical">
                    <ResizablePanel defaultSize={70}>
                        <Viewer
                            selectedObject={selectedObject}
                            parametricData={parametricData}
                        />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={30}>
                        <VisualGeometryEditor />
                    </ResizablePanel>
                 </ResizablePanelGroup>
            ) : (
                <Viewer
                    selectedObject={selectedObject}
                    parametricData={parametricData}
                />
            )}
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

