import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";

type SystemObject = { id: number; name: string; category: string; description: string; };

const systemObjects: SystemObject[] = [];

export function ObjectLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(systemObjects.map(obj => obj.category)));
    return ["all", ...uniqueCategories];
  }, []);

  const filteredObjects = useMemo(() => {
    let filtered = systemObjects;

    if (filterCategory !== "all") {
      filtered = filtered.filter(obj => obj.category === filterCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(obj => 
        obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obj.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [searchTerm, filterCategory]);

  const handleAdd = (objectName: string) => {
    alert(`'${objectName}' se añadiría al proyecto actual.`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Librería de Plantillas y Modelos</h1>
      <p className="text-muted-foreground mb-6">
        Explora y reutiliza plantillas de férulas y modelos de referencia.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Label htmlFor="search-models" className="sr-only">Buscar modelos</Label>
          <Input
            id="search-models"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Label className="sr-only">Filtrar por categoría</Label>
          <ToggleGroup
            type="single"
            value={filterCategory}
            onValueChange={(value) => setFilterCategory(value || "all")}
            className="justify-start sm:justify-end"
          >
            {categories.map(cat => (
              <ToggleGroupItem key={cat} value={cat} className="capitalize text-sm h-9">
                {cat === "all" ? "Todo" : cat}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filteredObjects.length > 0 ? (
          filteredObjects.map((obj) => (
            <Card key={obj.id}>
              <CardHeader>
                <CardTitle className="text-base">{obj.name}</CardTitle>
                <CardDescription>{obj.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3 truncate">{obj.description}</p>
                <Button className="w-full" size="sm" onClick={() => handleAdd(obj.name)}>
                  Añadir al Proyecto
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground">No se encontraron modelos.</p>
        )}
      </div>
    </div>
  );
}
