// src/features/layout/Menubar.tsx
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";

export function AppMenubar() {
  const { t } = useTranslation();

  const handleExport = () => {
      window.dispatchEvent(new CustomEvent("export-stl", { 
          detail: { name: "ferula-morfy" } 
      }));
  };

  return (
    <Menubar className="rounded-none border-b border-l-0 px-2 lg:px-4">
      <MenubarMenu>
        <MenubarTrigger>{t("menubar.file.title") || "Archivo"}</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            {t("menubar.file.items.new") || "Nuevo"}{" "}
            <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>{t('menubar.file.items.open') || "Abrir"}</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar STL
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>{t('menubar.file.items.save') || "Guardar"}</MenubarItem>
          <MenubarItem>{t('menubar.file.items.saveAs') || "Guardar como..."}</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>{t('menubar.file.items.exit') || "Salir"}</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

