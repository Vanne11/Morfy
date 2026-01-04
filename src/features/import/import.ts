// src/features/import/import.ts
import { ObjectLoader, Scene } from "three";

export function importScene(
  file: File,
  onLoad: (scene: Scene) => void
) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const contents = event.target?.result;
    if (typeof contents === "string") {
      const data = JSON.parse(contents);
      const loader = new ObjectLoader();
      const scene = loader.parse(data);
      onLoad(scene as Scene);
    }
  };
  reader.readAsText(file);
}
