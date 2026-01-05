import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface ParamsPanelProps {
  params: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
}

export function ParamsPanel({ params, onParamChange }: ParamsPanelProps) {
  return (
    <Card className="border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Parámetros Interactivos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {Object.entries(params).map(([key, value]) => {
          if (typeof value === 'number') {
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] uppercase font-bold text-zinc-400">{key}</Label>
                  <span className="text-xs font-mono text-primary">{value}</span>
                </div>
                <input
                  type="range"
                  min={value > 0 ? 0 : value * 2}
                  max={value > 0 ? value * 3 : 0}
                  step={0.1}
                  value={value}
                  onChange={(e) => onParamChange(key, parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={value}
                    onChange={(e) => onParamChange(key, parseFloat(e.target.value))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
            );
          } else if (typeof value === 'string' && key === 'color') {
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
