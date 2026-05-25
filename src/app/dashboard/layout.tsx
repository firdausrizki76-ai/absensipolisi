"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopAppBar from "@/components/TopAppBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar 
        role="police" 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />

      {/* Main Content Area */}
      <main className="md:ml-64 flex flex-col h-screen w-full transition-all duration-300">
        <TopAppBar onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto bg-black">
          {children}
        </div>
      </main>
    </div>
  );
}
