"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const nrp = localStorage.getItem("current_user_nrp");
    if (!nrp) {
      router.push("/");
      return;
    }

    const loadHistory = async () => {
      try {
        const { data, error } = await supabase
          .from("presensi")
          .select("*")
          .eq("nrp", nrp)
          .order("tanggal", { ascending: false });

        if (error) {
          console.error("Error loading history:", error);
          return;
        }

        if (data) {
          setHistory(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [router]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "-";
    return timeStr.substring(0, 5) + " WITA";
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-container-padding space-y-stack-lg pb-24">
      <div className="flex justify-between items-end animate-slide-up">
        <div>
          <p className="font-label-caps text-label-caps text-primary mb-1">ATTENDANCE LOG</p>
          <h2 className="font-display-lg text-[28px] md:text-[32px] text-on-surface">Riwayat Kehadiran</h2>
        </div>
        <button className="border border-outline-variant px-4 py-2 flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors text-[12px] font-bold">
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          PILIH BULAN
        </button>
      </div>

      <section className="bg-[#0D0D0D] border border-outline-variant overflow-x-auto animate-slide-up delay-100">
        {history.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant font-body-sm">
            Belum ada riwayat absensi untuk akun Anda.
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">TANGGAL</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">CHECK IN</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">CHECK OUT</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, index) => (
                <tr key={index} className="border-b border-outline-variant hover:bg-surface-container-high transition-colors">
                  <td className="p-4 font-body-sm font-semibold">{formatDate(row.tanggal)}</td>
                  <td className="p-4 font-body-sm font-mono text-on-surface-variant">{formatTime(row.check_in)}</td>
                  <td className="p-4 font-body-sm font-mono text-on-surface-variant">{formatTime(row.check_out)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-[10px] font-bold tracking-widest border ${
                      row.status === 'HADIR' ? 'text-green-400 border-green-400/50 bg-green-400/10' :
                      row.status === 'TERLAMBAT' ? 'text-orange-400 border-orange-400/50 bg-orange-400/10' :
                      'text-blue-400 border-blue-400/50 bg-blue-400/10'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
