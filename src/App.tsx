// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { RootLayout } from "@/features/layout/RootLayout";
import { AppLayout } from "@/features/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { Dashboard } from "@/pages/Dashboard";
import { ObjectLibrary } from "@/pages/ObjectLibrary";
import { Admin } from "@/pages/Admin";
import { NotFound } from "@/pages/NotFound";

function App() {
  return (
    <>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Rutas de página completa */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/library" element={<ObjectLibrary />} />
          <Route path="/admin" element={<Admin />} />
          
          {/* Ruta que renderiza el editor 3D */}
          <Route path="/project/:projectId" element={<AppLayout />} />

          {/* Ruta para páginas no encontradas */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}

export default App;