"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  role: "admin" | "police";
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ role, isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = role === "admin" ? [
    { href: "/admin", icon: "dashboard", label: "Dashboard" },
    { href: "/admin/rekap-absensi", icon: "table_chart", label: "Rekap Absensi" },
    { href: "/admin/personel", icon: "badge", label: "Personil" },
    { href: "/admin/pengaturan", icon: "settings", label: "Pengaturan" },
  ] : [
    { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { href: "/dashboard/presensi", icon: "location_on", label: "Absensi" },
    { href: "/dashboard/history", icon: "history", label: "Riwayat" },
    { href: "/dashboard/profile", icon: "person", label: "Profil" },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 flex flex-col h-screen w-64 border-r border-outline-variant bg-surface-container-lowest z-50 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-container-padding flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="w-12 h-12">
              <img src="/assets/logo.png" alt="Logo Polres" className="w-full h-full object-contain drop-shadow-md" />
            </div>
              <h1 className="font-headline-lg text-[20px] font-bold text-primary leading-tight">Si Abdi</h1>
              <p className="font-label-caps text-[9px] text-on-surface-variant uppercase mt-1">
                Polres Pelabuhan Makasar
              </p>
              <p className="font-label-caps text-[10px] text-primary uppercase mt-0.5">
                {role === "admin" ? "ADMINISTRATOR" : "ABSENSI DIGITAL"}
              </p>
          </div>
          <button 
            className="md:hidden text-on-surface-variant hover:text-primary mt-2"
            onClick={() => setIsOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <nav className="flex-1 mt-stack-lg">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`px-4 py-3 flex items-center gap-4 transition-all duration-200 ease-in-out ${
                  isActive 
                     ? 'text-primary bg-surface-container-high border-r-4 border-primary' 
                     : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span className="font-label-caps text-label-caps">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-outline-variant">
          <Link href="/" className="text-error px-4 py-3 flex items-center gap-4 hover:bg-surface-variant transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-caps text-label-caps">Keluar</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
