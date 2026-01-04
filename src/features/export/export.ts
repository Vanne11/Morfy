// src/features/export/export.ts
import { Scene, Mesh } from "three";
import { STLExporter } from "three-stdlib";

export function exportToSTL(scene: Scene, fileName: string = "morfy-piece.stl") {
  const exporter = new STLExporter();
  
  // Clonamos el objeto o filtramos para solo exportar mallas visibles
  // Evitamos exportar el plátano, la rejilla, etc.
  // Buscaremos mallas que tengan 'castShadow' (nuestras piezas)
  const meshesToExport: Mesh[] = [];
  scene.traverse((child) => {
    if ((child as Mesh).isMesh && child.name !== "Banana" && child.visible) {
        // Podríamos filtrar más aquí si es necesario
        meshesToExport.push(child as Mesh);
    }
  });

  if (meshesToExport.length === 0) {
      console.warn("No meshes found to export.");
      return;
  }

  // Si hay varias mallas, el exportador las unirá en el archivo STL
  const result = exporter.parse(scene, { binary: true }) as DataView;
  
  const blob = new Blob([result.buffer as any], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.download = fileName.endsWith(".stl") ? fileName : `${fileName}.stl`;
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}