// src/services/api.ts

// Cambia esto a tu URL real
const API_BASE_URL = "https://tmeduca.org/vaneuribe/morfy/backend"; 

export interface LibraryItem {
  id: string;
  name: string;
  category: string;
  description: string;
  file_url: string;
  thumb_url: string;
  date: string;
}

export const api = {
  getLibrary: async (): Promise<LibraryItem[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/list.php`);
      if (!response.ok) throw new Error("Error fetching library");
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      return [];
    }
  },

  uploadItem: async (formData: FormData): Promise<{ success: boolean; message: string; item?: LibraryItem }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/upload.php`, {
        method: "POST",
        body: formData,
      });
      return await response.json();
    } catch (error) {
      console.error("API Upload Error:", error);
      return { success: false, message: "Error de conexión con el servidor." };
    }
  },
  
  // Helper para construir URLs completas de imágenes/archivos
  getFileUrl: (relativePath: string) => {
      if (!relativePath) return "";
      if (relativePath.startsWith("http")) return relativePath;
      return `${API_BASE_URL}/${relativePath}`;
  }
};
