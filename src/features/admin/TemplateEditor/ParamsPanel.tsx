import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ParamsPanelProps {
  params: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
}

export function ParamsPanel({ params, onParamChange }: ParamsPanelProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          {t("features.templateEditor.paramsTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {Object.entries(params).map(([key, value]) => {
          // Normalizar clave para detección de altura
          const lowerKey = key.toLowerCase();
          const isHeight = lowerKey === 'grosor' || lowerKey === 'altura' || lowerKey === 'height';
          
          if (typeof value === 'number') {
            return (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label className="text-[10px] uppercase font-bold text-zinc-400 min-w-[80px]">
                  {isHeight ? t("features.templateEditor.height") : key}
                </Label>
                <div className="flex gap-2 items-center flex-1 justify-end">
                  <Input
                    type="number"
                    step="0.1"
                    value={value}
                    onChange={(e) => onParamChange(key, parseFloat(e.target.value))}
                    className="h-8 text-xs font-mono w-24 text-right"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono w-6">
                    {isHeight ? "mm" : "cm"}
                  </span>
                </div>
              </div>
            );
          } else if (typeof value === 'string' && (lowerKey.includes('color') || value.startsWith('#'))) {
            return (
              <div key={key} className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-zinc-400">{key}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => onParamChange(key, e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={value}
                    onChange={(e) => onParamChange(key, e.target.value)}
                    className="h-8 text-xs font-mono flex-1"
                  />
                </div>
              </div>
            );
          } else {
            return (
              <div key={key} className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-zinc-400">{key}</Label>
                <Input
                  type="text"
                  value={JSON.stringify(value)}
                  onChange={(e) => {
                    try {
                      onParamChange(key, JSON.parse(e.target.value));
                    } catch {
                      onParamChange(key, e.target.value);
                    }
                  }}
                  className="h-7 text-xs font-mono"
                />
              </div>
            );
          }
        })}
      </CardContent>
    </Card>
  );
}
