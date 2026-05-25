"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRegistered: 0,
    activeOnDuty: 0,
    unaccounted: 0,
    systemAlerts: 0,
  });
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const role = localStorage.getItem("current_user_role");
    if (role !== "ADMIN") {
      router.push("/");
      return;
    }

    const loadDashboardData = async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];

        // 1. Fetch total registered personnel (excluding ADMIN role)
        const { count: totalCount, error: totalErr } = await supabase
          .from("personel")
          .select("*", { count: "exact", head: true })
          .eq("role", "PERSONEL")
          .eq("status_aktif", true);

        // 2. Fetch total active check-ins today
        const { count: checkinCount, error: checkinErr } = await supabase
          .from("presensi")
          .select("*", { count: "exact", head: true })
          .eq("tanggal", todayStr);

        // 3. Fetch late check-ins today (alerts)
        const { count: lateCount, error: lateErr } = await supabase
          .from("presensi")
          .select("*", { count: "exact", head: true })
          .eq("tanggal", todayStr)
          .eq("status", "TERLAMBAT");

        const registered = totalCount || 0;
        const active = checkinCount || 0;
        const unaccounted = Math.max(0, registered - active);

        setStats({
          totalRegistered: registered,
          activeOnDuty: active,
          unaccounted: unaccounted,
          systemAlerts: lateCount || 0,
        });

        // 4. Fetch recent system logs
        const { data: logsData, error: logsErr } = await supabase
          .from("presensi")
          .select(`
            check_in,
            check_out,
            status,
            tanggal,
            personel (
              nama,
              pangkat,
              nrp
            )
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!logsErr && logsData) {
          setLogs(logsData);
        }
      } catch (err) {
        console.error("Error loading admin stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();

    // Subscribe to postgres changes in presensi table
    const channel = supabase
      .channel("admin-dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "presensi",
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-container-padding space-y-stack-lg pb-24">
      {/* Welcome Hero */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="font-label-caps text-label-caps text-primary mb-1">COMMAND CENTER DASHBOARD</p>
          <h2 className="font-display-lg text-[28px] md:text-[40px] font-bold text-on-surface">Welcome, System Administrator</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
            System Status: <span className="text-primary font-bold">ALL SYSTEMS GREEN</span> • {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        <button className="gold-brushed px-8 py-3 flex items-center gap-3 active:scale-95 transition-transform duration-150 rounded-sm w-full md:w-auto justify-center">
          <span className="material-symbols-outlined text-black font-bold">print</span>
          <span className="font-label-caps text-label-caps text-black font-bold tracking-widest">GENERATE REPORT</span>
        </button>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-gutter">
        {/* Stat Card 1 (Primary focus) */}
        <div className="bg-surface-container-lowest p-6 border border-outline-variant gold-border-subtle flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-1 gold-brushed"></div>
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant">TOTAL REGISTERED PERSONNEL</span>
            <span className="material-symbols-outlined text-primary">badge</span>
          </div>
          <div className="font-display-lg text-[32px] md:text-[40px] font-bold text-primary tracking-tight">{stats.totalRegistered}</div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-surface-container-lowest p-6 border border-outline-variant flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant">ACTIVE ON DUTY</span>
            <span className="material-symbols-outlined text-primary">shield</span>
          </div>
          <div className="font-display-lg text-[32px] md:text-[40px] font-bold text-primary tracking-tight">{stats.activeOnDuty}</div>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-surface-container-lowest p-6 border border-outline-variant flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant">UNACCOUNTED</span>
            <span className="material-symbols-outlined text-error">warning</span>
          </div>
          <div className="font-display-lg text-[32px] md:text-[40px] font-bold text-error tracking-tight">{stats.unaccounted}</div>
        </div>

        {/* Stat Card 4 */}
        <div className="bg-surface-container-lowest p-6 border border-outline-variant flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant">SYSTEM ALERTS (LATE)</span>
            <span className="material-symbols-outlined text-tertiary">notifications_active</span>
          </div>
          <div className="font-display-lg text-[32px] md:text-[40px] font-bold text-tertiary tracking-tight">{stats.systemAlerts}</div>
        </div>
      </section>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* System Activity */}
        <section className="col-span-1 md:col-span-12 bg-[#0D0D0D] border border-outline-variant p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-title-md text-[20px] font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
              System Logs & Overrides
            </h3>
            <button className="font-label-caps text-label-caps text-primary hover:underline transition-all hidden sm:block">
              VIEW FULL AUDIT
            </button>
          </div>

          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant font-body-sm bg-surface">
                Tidak ada aktivitas presensi hari ini.
              </div>
            ) : (
              logs.map((log, index) => {
                const isLate = log.status === "TERLAMBAT";
                const name = log.personel?.nama || "Unknown";
                const rank = log.personel?.pangkat || "POLRI";
                const nrp = log.personel?.nrp || "-";
                
                return (
                  <div key={index} className="flex items-center gap-4 p-4 bg-surface hover:bg-surface-container-high transition-colors group relative overflow-hidden">
                    <div className={`absolute left-0 top-0 w-1 h-full ${isLate ? "bg-error" : "bg-primary"}`}></div>
                    <div className="flex-1">
                      <p className="font-body-lg text-body-lg text-on-surface font-semibold">
                        {rank} {name} (NRP: {nrp}) berhasil melakukan presensi
                      </p>
                      <p className="font-label-caps text-[11px] text-on-surface-variant mt-1">
                        STATUS: {log.status} • TANGGAL: {new Date(log.tanggal).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-title-md text-[16px] font-bold ${isLate ? "text-error" : "text-primary"}`}>
                        IN: {log.check_in ? log.check_in.substring(0, 5) : "-"} | OUT: {log.check_out ? log.check_out.substring(0, 5) : "-"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
