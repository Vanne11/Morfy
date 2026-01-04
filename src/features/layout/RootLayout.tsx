// src/features/layout/RootLayout.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "../sidebar/Sidebar";

export function RootLayout() {
  return (
    <div className="flex h-screen w-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
