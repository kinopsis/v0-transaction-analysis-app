"use client";

import { useState } from "react";
import { Sidebar, type TabId } from "@/components/layout/sidebar";
import { DashboardTab } from "@/components/dashboard/dashboard-tab";
import { TransactionsTab } from "@/components/transactions/transactions-tab";
import { ReportsTab } from "@/components/reports/reports-tab";
import { RemanentesTab } from "@/components/remanentes/remanentes-tab";
import { ConfigTab } from "@/components/config/config-tab";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const { isLoaded } = useAppStore();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-hidden">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "transacciones" && <TransactionsTab />}
        {activeTab === "reportes" && <ReportsTab />}
        {activeTab === "remanentes" && <RemanentesTab />}
        {activeTab === "configuracion" && <ConfigTab />}
      </main>
    </div>
  );
}
