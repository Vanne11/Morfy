// src/features/export/export.ts
import { Scene, Mesh } from "three";
import { STLExporter } from "three-stdlib";
import { UNIT_TO_MM, type UnitType } from "@/utils/svgToThree";

export function exportToSTL(
  scene: Scene,
  fileName: string = "morfy-piece.stl",
  units: UnitType = "mm"
) {
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

  // Calcular factor de conversión a milímetros
  const scaleFactor = UNIT_TO_MM[units];

  // Guardar las escalas originales y aplicar el factor de conversión
  const originalScales = meshesToExport.map(mesh => mesh.scale.clone());

  if (scaleFactor !== 1.0) {
    console.log(`Aplicando conversión de ${units} a mm (factor: ${scaleFactor})`);
    meshesToExport.forEach(mesh => {
      mesh.scale.multiplyScalar(scaleFactor);
    });
  }

  // Si hay varias mallas, el exportador las unirá en el archivo STL
  const result = exporter.parse(scene, { binary: true }) as DataView;

  // Restaurar las escalas originales
  if (scaleFactor !== 1.0) {
    meshesToExport.forEach((mesh, i) => {
      mesh.scale.copy(originalScales[i]);
    });
  }
  
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