"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Officer");
  const [stats, setStats] = useState({
    activeUnits: 0,
    criticalAlerts: 0,
    incidentsToday: 0,
    systemHealth: "100%",
  });
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WITA");
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const nrp = localStorage.getItem("current_user_nrp");
    if (!nrp) {
      router.push("/");
      return;
    }
    const name = localStorage.getItem("current_user_name");
    if (name) setUserName(name);

    const loadDashboardData = async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];

        // 1. Fetch total active personel
        const { count: activeCount, error: activeErr } = await supabase
          .from("personel")
          .select("*", { count: "exact", head: true })
          .eq("status_aktif", true);

        // 2. Fetch total check-ins today
        const { count: checkinCount, error: checkinErr } = await supabase
          .from("presensi")
          .select("*", { count: "exact", head: true })
          .eq("tanggal", todayStr);

        // 3. Fetch critical alerts (late today)
        const { count: lateCount, error: lateErr } = await supabase
          .from("presensi")
          .select("*", { count: "exact", head: true })
          .eq("tanggal", todayStr)
          .eq("status", "TERLAMBAT");

        setStats({
          activeUnits: activeCount || 0,
          criticalAlerts: lateCount || 0,
          incidentsToday: checkinCount || 0,
          systemHealth: "99.9%",
        });

        // 4. Fetch live feed (last 5 check-ins)
        const { data: feedData, error: feedErr } = await supabase
          .from("presensi")
          .select(`
            check_in,
            status,
            tanggal,
            personel (
              nama,
              pangkat
            )
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!feedErr && feedData) {
          setLiveFeed(feedData);
        }
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();

    // Subscribe to postgres changes in presensi table
    const channel = supabase
      .channel("officer-dashboard-realtime")
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
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-slide-up">
        <div>
          <p className="font-label-caps text-label-caps text-primary mb-1">COMMAND CENTER DASHBOARD</p>
          <h2 className="font-display-lg text-[28px] md:text-[40px] font-bold text-on-surface">Welcome, {userName}</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
            System Status: <span className="text-primary font-bold">ALL SYSTEMS GREEN</span> • {timeStr} LOCAL
          </p>
        </div>
        
        <button className="gold-brushed px-8 py-3 flex items-center gap-3 active:scale-95 transition-transform duration-150 rounded-sm w-full md:w-auto justify-center">
          <span className="material-symbols-outlined text-black font-bold">flight_takeoff</span>
          <span className="font-label-caps text-label-caps text-black font-bold tracking-widest">DEPLOY UNIT</span>
        </button>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-gutter animate-slide-up delay-100">
        {/* Stat Card 1 (Primary focus) */}
        <div className="bg-surface-container-lowest p-6 border border-outline-variant gold-border-subtle flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-1 gold-brushed"></div>
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant">ACTIVE UNITS</span>
            <span className="material-symbols-outlined text-primary">local_police</span>
          </div>
          <div className="font-display-lg text-[32px] md:text-[40px] font-bold text-primary tracking-tight">{stats.activeUnits}</div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-surface-container-lowest p-6 border border-outline-variant flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant">LATE CHECK-INS TODAY</span>
            <span className="material-symbols-outlined text-error">warning</span>
          </div>
          <div className="font-display-lg text-[32px] md:text-[40px] font-bold text-error tracking-tight">
            {stats.criticalAlerts < 10 ? `0${stats.criticalAlerts}` : stats.criticalAlerts}
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-surface-container-lowest p-6 border border-outline-variant flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant">CHECK-INS TODAY</span>
            <span className="material-symbols-outlined text-on-surface-variant">policy</span>
          </div>
          <div className="font-display-lg text-[32px] md:text-[40px] font-bold text-on-surface tracking-tight">{stats.incidentsToday}</div>
        </div>

        {/* Stat Card 4 */}
        <div className="bg-surface-container-lowest p-6 border border-outline-variant flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant">SYSTEM HEALTH</span>
            <span className="material-symbols-outlined text-tertiary">health_and_safety</span>
          </div>
          <div className="font-display-lg text-[32px] md:text-[40px] font-bold text-tertiary tracking-tight">{stats.systemHealth}</div>
        </div>
      </section>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter animate-slide-up delay-200">
        {/* Activity Logs */}
        <section className="col-span-1 md:col-span-12 lg:col-span-8 bg-[#0D0D0D] border border-outline-variant p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-title-md text-[20px] font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">dynamic_feed</span>
              Live Operations Feed
            </h3>
            <button className="font-label-caps text-label-caps text-primary hover:underline transition-all hidden sm:block">
              VIEW ALL LOGS
            </button>
          </div>

          <div className="space-y-2">
            {liveFeed.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant font-body-sm bg-surface">
                Tidak ada aktivitas presensi hari ini.
              </div>
            ) : (
              liveFeed.map((row, index) => {
                const isLate = row.status === "TERLAMBAT";
                const officerName = row.personel?.nama || "Unknown Officer";
                const officerRank = row.personel?.pangkat || "POLRI";
                
                return (
                  <div key={index} className="flex items-center gap-4 p-4 bg-surface hover:bg-surface-container-high transition-colors group relative overflow-hidden">
                    <div className={`absolute left-0 top-0 w-1 h-full ${isLate ? "bg-error" : "bg-primary"}`}></div>
                    <div className="hidden sm:flex w-12 h-12 rounded border border-outline items-center justify-center bg-surface-container-lowest">
                      <span className={`material-symbols-outlined ${isLate ? "text-error" : "text-primary"}`}>
                        {isLate ? "warning" : "how_to_reg"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-body-lg text-body-lg text-on-surface font-semibold">
                        {officerRank} {officerName} melakukan absensi
                      </p>
                      <p className="font-label-caps text-[11px] text-on-surface-variant mt-1">
                        STATUS: {row.status} • TANGGAL: {new Date(row.tanggal).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-title-md text-[16px] font-bold ${isLate ? "text-error" : "text-primary"}`}>
                        {row.check_in ? row.check_in.substring(0, 5) : "-"} WITA
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Unit Distribution & Map */}
        <section className="col-span-1 md:col-span-4 space-y-gutter flex flex-col">
          <div className="bg-[#0D0D0D] border border-outline-variant p-6 flex-1 flex flex-col h-full">
            <h3 className="font-title-md text-[20px] font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">map</span>
              Sector Deployment
            </h3>
            
            <div className="flex-1 min-h-[200px] bg-surface-container relative border border-outline-variant overflow-hidden group">
              <iframe 
                title="OSM Sector Radar"
                className="w-full h-full border-0 grayscale brightness-50 contrast-125 opacity-60 hover:opacity-85 transition-opacity" 
                src="https://www.openstreetmap.org/export/embed.html?bbox=119.4091%2C-5.1359%2C119.4151%2C-5.1299&layer=mapnik&marker=-5.1329%2C119.4121"
              ></iframe>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              
              <div className="absolute bottom-4 left-4">
                <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 border border-primary/30 flex items-center gap-2 rounded-sm">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <span className="font-label-caps text-[10px] text-primary">LIVE RADAR ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-body-sm text-body-sm text-on-surface-variant">North Sector</span>
                <div className="w-24 bg-surface-container-high h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{width: '85%'}}></div>
                </div>
                <span className="font-label-caps text-label-caps text-primary">85%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-sm text-body-sm text-on-surface-variant">South Sector</span>
                <div className="w-24 bg-surface-container-high h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{width: '62%'}}></div>
                </div>
                <span className="font-label-caps text-label-caps text-primary">62%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Central Core</span>
                <div className="w-24 bg-surface-container-high h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{width: '98%'}}></div>
                </div>
                <span className="font-label-caps text-label-caps text-primary">98%</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Operational Alerts */}
      <section className="bg-[#1A1A1A] border gold-border-subtle p-4 flex items-center gap-6 mt-stack-md rounded-sm">
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/10 border border-primary/30 text-primary">
          <span className="material-symbols-outlined">priority_high</span>
        </div>
        <div className="flex-1">
          <p className="font-label-caps text-[12px] font-bold text-primary tracking-widest mb-1">COMMAND ALERT</p>
          <p className="font-body-lg text-body-lg text-on-surface">
            Weekly accountability report for Division B is pending approval. Target deadline: 16:00 HRS.
          </p>
        </div>
        <button className="border border-primary px-6 py-2 font-label-caps text-[12px] font-bold tracking-widest text-primary hover:bg-primary hover:text-black transition-all rounded-sm">
          TAKE ACTION
        </button>
      </section>
    </div>
  );
}
