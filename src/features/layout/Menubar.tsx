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
import { Download, Loader2, Check, Cloud } from "lucide-react";

interface AppMenubarProps {
  saveStatus?: "idle" | "saving" | "saved";
}

export function AppMenubar({ saveStatus = "idle" }: AppMenubarProps) {
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

      {/* Indicador de auto-guardado */}
      <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground px-2">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t("menubar.saving") || "Guardando..."}</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <Check className="h-3 w-3 text-emerald-500" />
            <span className="text-emerald-500">{t("menubar.saved") || "Guardado"}</span>
          </>
        )}
        {saveStatus === "idle" && (
          <>
            <Cloud className="h-3 w-3" />
          </>
        )}
      </div>
    </Menubar>
  );
}

