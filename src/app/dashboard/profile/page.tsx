"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ hadir: 0, terlambat: 0, ijin: 0, alpa: 0 });

  useEffect(() => {
    const nrp = localStorage.getItem("current_user_nrp");
    if (!nrp) {
      router.push("/");
      return;
    }

    const loadProfileAndStats = async () => {
      try {
        // Fetch profile
        const { data: pData, error: pError } = await supabase
          .from("personel")
          .select("*")
          .eq("nrp", nrp)
          .single();

        if (pError || !pData) {
          console.error("Error loading profile:", pError);
          return;
        }
        setProfile(pData);

        // Fetch monthly attendance stats
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

        const { data: attData, error: attError } = await supabase
          .from("presensi")
          .select("status")
          .eq("nrp", nrp)
          .gte("tanggal", startOfMonthStr);

        if (!attError && attData) {
          const stats = { hadir: 0, terlambat: 0, ijin: 0, alpa: 0 };
          attData.forEach((item) => {
            if (item.status === "HADIR") stats.hadir++;
            else if (item.status === "TERLAMBAT") stats.terlambat++;
            else if (item.status === "IJIN" || item.status === "SAKIT") stats.ijin++;
            else stats.alpa++;
          });
          setSummary(stats);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileAndStats();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-error">
        <p className="font-bold">PROFIL TIDAK DITEMUKAN</p>
      </div>
    );
  }

  const totalDays = summary.hadir + summary.terlambat + summary.ijin + summary.alpa;
  const disciplineRate = totalDays > 0 ? Math.round(((summary.hadir) / totalDays) * 100) : 100;

  return (
    <div className="p-4 md:p-container-padding space-y-stack-lg pb-24">
      <div className="flex justify-between items-end animate-slide-up">
        <div>
          <p className="font-label-caps text-label-caps text-primary mb-1">PERSONAL DATA</p>
          <h2 className="font-display-lg text-[28px] md:text-[32px] text-on-surface">Officer Profile</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Profile Details */}
        <section className="col-span-1 lg:col-span-4 bg-surface-container-lowest border border-outline-variant p-6 animate-slide-up delay-100 flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-primary mb-6">
            <img 
              src={profile.foto_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCt8Vrhx6ompIkvRr3VEF0iq0XARkxUbxMADoFhY1CsJwJuIkKQ334TVBg7R0dFdnl-BpDrIwNVD_7rmv4MRQMo8rTdZychNZmHarrNx78EceG_mRLmP45KhQo6KV7kr0hA9ElM_5LBNlEMs_iH3JHbslfUqOE50UChmv5aulsE_Pup5tCVVzvtltBOGrXtEBrJrs-VWDdipfhPSHaoSpHaLxDvpFIIhD4bw8f6ut4GJ69s6BuXqdxwAoop_Wkagbqaf4xQkxcuwu0-"} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="font-headline-lg text-[24px] font-bold text-on-surface">{profile.nama}</h3>
          <p className="font-label-caps text-primary mt-1 tracking-widest">{profile.pangkat} • {profile.nrp}</p>
          <p className="font-body-sm text-on-surface-variant mt-2">{profile.satuan || "-"}<br/>Polres Pelabuhan Makasar</p>

          <div className="w-full mt-8 border-t border-outline-variant pt-6 text-left space-y-4">
            <div>
              <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">JABATAN</span>
              <span className="font-body-sm text-on-surface">{profile.jabatan || "-"}</span>
            </div>
            <div>
              <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">STATUS AKTIF</span>
              <span className={`font-body-sm font-bold ${profile.status_aktif ? "text-green-500" : "text-error"}`}>
                {profile.status_aktif ? "AKTIF BERTUGAS" : "TIDAK AKTIF"}
              </span>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="col-span-1 lg:col-span-8 flex flex-col gap-gutter animate-slide-up delay-200">
          <div className="bg-[#0D0D0D] border border-outline-variant p-6 flex-1">
            <h3 className="font-title-md text-[18px] font-bold text-on-surface mb-6 border-b border-outline-variant pb-3">
              Ringkasan Kehadiran Bulan Ini
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-container p-4 text-center border border-outline">
                <span className="font-label-caps text-[10px] text-on-surface-variant block mb-2">HADIR</span>
                <span className="font-display-lg text-[24px] font-bold text-green-500">{summary.hadir}</span>
              </div>
              <div className="bg-surface-container p-4 text-center border border-outline">
                <span className="font-label-caps text-[10px] text-on-surface-variant block mb-2">TERLAMBAT</span>
                <span className="font-display-lg text-[24px] font-bold text-orange-500">{summary.terlambat}</span>
              </div>
              <div className="bg-surface-container p-4 text-center border border-outline">
                <span className="font-label-caps text-[10px] text-on-surface-variant block mb-2">IJIN / SAKIT</span>
                <span className="font-display-lg text-[24px] font-bold text-blue-500">{summary.ijin}</span>
              </div>
              <div className="bg-surface-container p-4 text-center border border-outline">
                <span className="font-label-caps text-[10px] text-on-surface-variant block mb-2">TANPA KETERANGAN</span>
                <span className="font-display-lg text-[24px] font-bold text-error">{summary.alpa}</span>
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="font-label-caps text-[12px] font-bold text-on-surface mb-4">TINGKAT KEDISIPLINAN</h3>
              <div className="w-full bg-surface-container-high h-4 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full" style={{ width: `${disciplineRate}%` }}></div>
              </div>
              <p className="text-right text-[10px] text-green-500 mt-2 font-bold">{disciplineRate}% ({disciplineRate >= 90 ? "SANGAT BAIK" : disciplineRate >= 75 ? "BAIK" : "PERLU EVALUASI"})</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
