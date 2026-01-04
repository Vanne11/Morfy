// src/features/toolbar/Toolbar.tsx
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Square, Circle } from "lucide-react";

export function Toolbar() {
  const { t } = useTranslation();

  const handleAddObject = (type: string) => {
    const event = new CustomEvent("add-object", { detail: { type } });
    window.dispatchEvent(event);
  };

  return (
    <div className="flex flex-col items-center justify-start p-4 space-y-2">
      <span className="font-semibold mb-4">{t("toolbar.title")}</span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleAddObject("cube")}
      >
        <Square className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleAddObject("sphere")}
      >
        <Circle className="h-4 w-4" />
      </Button>
    </div>
  );
}
