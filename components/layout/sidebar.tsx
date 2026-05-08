"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Wallet,
  Settings,
  CreditCard,
} from "lucide-react";

export type TabId = "dashboard" | "transacciones" | "reportes" | "remanentes" | "configuracion";

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transacciones", label: "Transacciones", icon: Receipt },
  { id: "reportes", label: "Reportes", icon: FileText },
  { id: "remanentes", label: "Remanentes", icon: Wallet },
  { id: "configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <CreditCard className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-sidebar-foreground">
            Datáfonos
          </h1>
          <p className="text-xs text-muted-foreground">Analytics</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-xs text-muted-foreground">
          Todos los datos se guardan localmente en el navegador
        </p>
      </div>
    </aside>
  );
}
