// src/features/sidebar/Sidebar.tsx
import { NavLink } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Library, Settings } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/library", label: "Librería", icon: Library },
  { to: "/admin", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="h-screen w-16 flex flex-col items-center border-r bg-background py-4 space-y-2">
      <TooltipProvider delayDuration={0}>
        {links.map((link) => (
          <Tooltip key={link.to}>
            <TooltipTrigger asChild>
              <NavLink
                to={link.to}
                end // Asegura que solo la ruta exacta esté activa
                className={({ isActive }) =>
                  cn(
                    buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "icon" }),
                    "h-10 w-10"
                  )
                }
              >
                <link.icon className="h-5 w-5" />
                <span className="sr-only">{link.label}</span>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right">{link.label}</TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </aside>
  );
}
