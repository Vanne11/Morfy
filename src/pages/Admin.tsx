import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Languages, Palette, Moon, Sun, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Admin() {
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'es');
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    // Aplicar tema al cargar
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  const handleLanguageChange = (newLang: string) => {
    i18n.changeLanguage(newLang);
    setCurrentLanguage(newLang);
    toast.success(newLang === 'es' ? t("pages.admin.toastLangEs") : t("pages.admin.toastLangEn"));
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    toast.success(newTheme === 'dark' ? t("pages.admin.toastDark") : t("pages.admin.toastLight"));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("pages.admin.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("pages.admin.description")}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 max-w-3xl">

        {/* Idioma */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              <CardTitle>{t("pages.admin.language")}</CardTitle>
            </div>
            <CardDescription>
              {t("pages.admin.languageDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant={currentLanguage === 'es' ? 'default' : 'outline'}
              className={cn("w-full justify-start h-auto py-3 px-4", currentLanguage === 'es' && "ring-2 ring-primary")}
              onClick={() => handleLanguageChange('es')}
            >
              <div className="flex items-center gap-3 w-full">
                {currentLanguage === 'es' && <Check className="h-4 w-4" />}
                <div className="flex-1 text-left">
                  <div className="font-medium">{t("pages.admin.spanish")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t("pages.admin.spanishDesc")}</div>
                </div>
              </div>
            </Button>
            <Button
              variant={currentLanguage === 'en' ? 'default' : 'outline'}
              className={cn("w-full justify-start h-auto py-3 px-4", currentLanguage === 'en' && "ring-2 ring-primary")}
              onClick={() => handleLanguageChange('en')}
            >
              <div className="flex items-center gap-3 w-full">
                {currentLanguage === 'en' && <Check className="h-4 w-4" />}
                <div className="flex-1 text-left">
                  <div className="font-medium">{t("pages.admin.english")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t("pages.admin.englishDesc")}</div>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Tema */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>{t("pages.admin.appearance")}</CardTitle>
            </div>
            <CardDescription>
              {t("pages.admin.appearanceDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              className={cn("w-full justify-start h-auto py-3 px-4", theme === 'light' && "ring-2 ring-primary")}
              onClick={() => handleThemeChange('light')}
            >
              <div className="flex items-center gap-3 w-full">
                <Sun className="h-5 w-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{t("pages.admin.lightTheme")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t("pages.admin.lightThemeDesc")}</div>
                </div>
                {theme === 'light' && <Check className="h-4 w-4" />}
              </div>
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              className={cn("w-full justify-start h-auto py-3 px-4", theme === 'dark' && "ring-2 ring-primary")}
              onClick={() => handleThemeChange('dark')}
            >
              <div className="flex items-center gap-3 w-full">
                <Moon className="h-5 w-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{t("pages.admin.darkTheme")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t("pages.admin.darkThemeDesc")}</div>
                </div>
                {theme === 'dark' && <Check className="h-4 w-4" />}
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Información del Sistema */}
        <Card className="border-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">{t("pages.admin.systemInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span>{t("pages.admin.version")}</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span>{t("pages.admin.engine")}</span>
              <span className="font-mono">Calculated Flat V1</span>
            </div>
            <div className="flex justify-between py-1">
              <span>{t("pages.admin.database")}</span>
              <span className="font-mono">Dexie (IndexedDB)</span>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
