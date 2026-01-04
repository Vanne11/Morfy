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
import { AppMenubar } from "./Menubar";
import type { SelectedObject } from "@/types";

export function AppLayout() {
  const [selectedObject, setSelectedObject] = useState<SelectedObject>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parametricData, setParametricData] = useState<any>(null);

  // Cargar datos del JSON cuando cambia el objeto seleccionado
  useEffect(() => {
    const isJson = selectedObject?.fileType === 'json' || selectedObject?.name.toLowerCase().endsWith('.json');
    
    if (selectedObject?.fileUrl && isJson) {
      fetch(selectedObject.fileUrl)
        .then(res => res.json())
        .then(data => setParametricData(data))
        .catch(err => console.error("Error parsing parametric JSON", err));
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

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col">
      <AppMenubar />
      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 w-full border"
      >
        <ResizablePanel defaultSize={20} minSize={15}>
          <ProjectGallery onObjectSelect={setSelectedObject} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60} minSize={30}>
          <Viewer
            selectedObject={selectedObject}
            parametricData={parametricData}
          />
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

