"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RekapAbsensiPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"harian" | "bulanan">("harian");
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string, name: string } | null>(null);
  const [selectedMap, setSelectedMap] = useState<{ name: string, pangkat: string, lokasiNama: string, lat: number, lng: number } | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("current_user_role");
    if (role !== "ADMIN") {
      router.push("/");
      return;
    }

    const loadAdminData = async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];

        // 1. Fetch all active personel
        const { data: allPersonel, error: pError } = await supabase
          .from("personel")
          .select("*")
          .eq("status_aktif", true);

        if (pError || !allPersonel) {
          console.error("Error loading personel:", pError);
          return;
        }

        // 2. Fetch today's check-ins
        const { data: todayLogs, error: lError } = await supabase
          .from("presensi")
          .select("*")
          .eq("tanggal", todayStr);

        // Map daily data
        const daily = allPersonel.map((p) => {
          const log = todayLogs?.find((l) => l.nrp === p.nrp);
          return {
            id: p.nrp,
            name: p.nama,
            pangkat: p.pangkat,
            satker: p.satuan,
            checkIn: log?.check_in ? log.check_in.substring(0, 5) + " WITA" : "-",
            status: log?.status || "TIDAK HADIR",
            foto: p.foto_url,
            lokasiNama: log?.lokasi_nama || null,
            lokasiLat: log?.lokasi_lat || null,
            lokasiLng: log?.lokasi_lng || null
          };
        });
        setDailyData(daily);

        // 3. Fetch monthly check-ins
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

        const { data: monthlyLogs, error: mError } = await supabase
          .from("presensi")
          .select("*")
          .gte("tanggal", startOfMonthStr);

        // Map monthly statistics
        const monthly = allPersonel.map((p) => {
          const logs = monthlyLogs?.filter((l) => l.nrp === p.nrp) || [];
          const stats = {
            id: p.nrp,
            name: p.nama,
            pangkat: p.pangkat,
            satker: p.satuan,
            hadir: 0,
            terlambat: 0,
            sakit: 0,
            ijin: 0,
            cuti: 0,
            tanpaKet: 0
          };
          logs.forEach((l) => {
            if (l.status === "HADIR") stats.hadir++;
            else if (l.status === "TERLAMBAT") stats.terlambat++;
            else if (l.status === "SAKIT") stats.sakit++;
            else if (l.status === "IJIN") stats.ijin++;
            else if (l.status === "CUTI") stats.cuti++;
            else if (l.status === "ALPA" || l.status === "TIDAK HADIR") stats.tanpaKet++;
          });
          return stats;
        });
        setMonthlyData(monthly);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
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
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="font-label-caps text-label-caps text-primary mb-1">DATA REPORT</p>
          <h2 className="font-display-lg text-[28px] md:text-[32px] font-bold text-on-surface">Rekap Absensi</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
            Polres Pelabuhan Makasar
          </p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <button className="border border-outline-variant px-6 py-2 flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors flex-1 md:flex-none">
            <span className="material-symbols-outlined">filter_list</span>
            <span className="font-label-caps text-label-caps font-bold">FILTER</span>
          </button>
          <button className="gold-brushed px-6 py-2 flex items-center justify-center gap-2 text-black transition-transform active:scale-95 flex-1 md:flex-none rounded-sm">
            <span className="material-symbols-outlined font-bold">download</span>
            <span className="font-label-caps text-label-caps font-bold tracking-widest">EXPORT</span>
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant">
        <button 
          onClick={() => setActiveTab("harian")}
          className={`px-6 py-3 font-label-caps font-bold tracking-widest transition-colors relative ${activeTab === 'harian' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          REKAP HARIAN (APEL)
          {activeTab === "harian" && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary"></div>}
        </button>
        <button 
          onClick={() => setActiveTab("bulanan")}
          className={`px-6 py-3 font-label-caps font-bold tracking-widest transition-colors relative ${activeTab === 'bulanan' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          REKAP BULANAN
          {activeTab === "bulanan" && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary"></div>}
        </button>
      </div>

      {activeTab === "harian" && (
        <section className="bg-[#0D0D0D] border border-outline-variant overflow-x-auto">
          <div className="p-4 bg-surface-container flex justify-between items-center border-b border-outline-variant">
            <h3 className="font-label-caps font-bold text-on-surface">Data Hari Ini (06:00 - 08:00)</h3>
            <span className="px-3 py-1 bg-surface border border-outline text-on-surface-variant text-[11px] font-mono">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest w-16">FOTO</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">NAMA & PANGKAT</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">NRP</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">SATKER</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">WAKTU ABSEN</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">LOKASI ABSEN</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">KEHADIRAN</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map((row, index) => (
                <tr key={index} className="border-b border-outline-variant hover:bg-surface-container-high transition-colors">
                  <td className="p-4">
                    {row.foto ? (
                      <div 
                        onClick={() => setSelectedPhoto({ url: row.foto, name: row.name })}
                        className="w-10 h-10 rounded bg-surface border border-outline overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        title="Klik untuk memperbesar"
                      >
                        <img src={row.foto} alt="Selfie" className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-surface border border-outline flex items-center justify-center opacity-50">
                        <span className="material-symbols-outlined text-on-surface-variant text-sm">person_off</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="font-body-sm font-semibold">{row.name}</p>
                    <p className="font-label-caps text-[10px] text-primary">{row.pangkat}</p>
                  </td>
                  <td className="p-4 font-body-sm font-mono text-on-surface-variant">{row.id}</td>
                  <td className="p-4 font-body-sm">{row.satker}</td>
                  <td className="p-4 font-body-sm font-mono">{row.checkIn}</td>
                  <td className="p-4">
                    {row.lokasiNama ? (
                      <div className="space-y-1 max-w-[220px]">
                        <p className="font-body-sm font-semibold truncate text-on-surface" title={row.lokasiNama}>
                          {row.lokasiNama}
                        </p>
                        {row.lokasiLat && row.lokasiLng && (
                          <button
                            onClick={() => setSelectedMap({ 
                              name: row.name, 
                              pangkat: row.pangkat,
                              lokasiNama: row.lokasiNama, 
                              lat: row.lokasiLat, 
                              lng: row.lokasiLng 
                            })}
                            className="flex items-center gap-1 text-[10px] text-primary hover:underline font-mono"
                          >
                            <span className="material-symbols-outlined text-[12px] text-primary">location_on</span>
                            {row.lokasiLat.toFixed(5)}, {row.lokasiLng.toFixed(5)}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-on-surface-variant/40">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-[10px] font-bold tracking-widest border ${
                      row.status === 'HADIR' ? 'text-green-400 border-green-400/50 bg-green-400/10' :
                      row.status === 'TERLAMBAT' ? 'text-orange-400 border-orange-400/50 bg-orange-400/10' :
                      row.status === 'SAKIT' || row.status === 'IJIN' || row.status === 'CUTI' ? 'text-blue-400 border-blue-400/50 bg-blue-400/10' :
                      'text-error border-error/50 bg-error/10'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {activeTab === "bulanan" && (
        <section className="bg-[#0D0D0D] border border-outline-variant overflow-x-auto">
          <div className="p-4 bg-surface-container flex justify-between items-center border-b border-outline-variant">
            <h3 className="font-label-caps font-bold text-on-surface">Rekapitulasi Bulan Ini</h3>
          </div>
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">NAMA / PANGKAT / NRP</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">SATKER</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest text-center text-green-500">HADIR</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest text-center text-orange-500">TELAT</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest text-center text-blue-500">SAKIT</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest text-center text-blue-500">IJIN</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest text-center text-blue-500">CUTI</th>
                <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest text-center text-error">ALFA</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, index) => (
                <tr key={index} className="border-b border-outline-variant hover:bg-surface-container-high transition-colors">
                  <td className="p-4">
                    <p className="font-body-sm font-semibold">{row.name}</p>
                    <p className="font-label-caps text-[10px] text-on-surface-variant">{row.pangkat} • {row.id}</p>
                  </td>
                  <td className="p-4 font-body-sm">{row.satker}</td>
                  <td className="p-4 font-body-sm font-mono text-center font-bold text-green-500">{row.hadir}</td>
                  <td className="p-4 font-body-sm font-mono text-center font-bold text-orange-500">{row.terlambat}</td>
                  <td className="p-4 font-body-sm font-mono text-center font-bold text-blue-500">{row.sakit}</td>
                  <td className="p-4 font-body-sm font-mono text-center font-bold text-blue-500">{row.ijin}</td>
                  <td className="p-4 font-body-sm font-mono text-center font-bold text-blue-500">{row.cuti}</td>
                  <td className="p-4 font-body-sm font-mono text-center font-bold text-error">{row.tanpaKet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="relative max-w-3xl max-h-[85vh] flex flex-col items-center bg-surface-container-lowest border border-primary p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors border border-outline-variant"
              >
                <span className="material-symbols-outlined font-bold text-sm">close</span>
              </button>
            </div>
            <img 
              src={selectedPhoto.url} 
              alt={selectedPhoto.name} 
              className="max-w-full max-h-[70vh] object-contain border border-outline-variant"
            />
            <div className="w-full text-center mt-3 py-2 bg-black border border-outline-variant">
              <p className="font-label-caps text-primary text-[12px] font-bold tracking-widest uppercase">FOTO ABSEN: {selectedPhoto.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {selectedMap && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedMap(null)}
        >
          <div 
            className="bg-surface-container-lowest border border-primary w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-primary text-black p-4 flex justify-between items-center">
              <span className="font-label-caps font-bold tracking-widest text-[12px] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">map</span>
                LOKASI ABSEN: {selectedMap.pangkat} {selectedMap.name}
              </span>
              <button 
                onClick={() => setSelectedMap(null)}
                className="material-symbols-outlined text-[20px] font-bold text-black hover:opacity-75"
              >
                close
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="relative w-full h-[350px] bg-black border border-outline-variant overflow-hidden">
                <iframe 
                  title="OSM Live Map"
                  className="w-full h-full border-0 grayscale opacity-90 hover:opacity-100 transition-opacity" 
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedMap.lng - 0.002}%2C${selectedMap.lat - 0.002}%2C${selectedMap.lng + 0.002}%2C${selectedMap.lat + 0.002}&layer=mapnik&marker=${selectedMap.lat}%2C${selectedMap.lng}`}
                ></iframe>
                
                <div className="absolute top-2 left-2 bg-black/80 border border-primary/30 p-2 text-[10px] text-primary font-mono z-10">
                  LAT: {selectedMap.lat.toFixed(6)}°<br/>LNG: {selectedMap.lng.toFixed(6)}°
                </div>
              </div>

              <div className="bg-black border border-outline p-4">
                <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">ALAMAT / NAMA LOKASI</span>
                <span className="font-body-sm text-primary flex items-center gap-1.5 leading-normal">
                  <span className="material-symbols-outlined text-[16px] text-primary shrink-0">my_location</span>
                  {selectedMap.lokasiNama}
                </span>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setSelectedMap(null)}
                  className="flex-1 py-2.5 border border-outline text-on-surface-variant font-label-caps tracking-widest text-[11px] hover:bg-surface-variant transition-colors rounded-sm"
                >
                  TUTUP
                </button>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedMap.lat},${selectedMap.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 font-label-caps tracking-widest text-[11px] font-bold text-black gold-brushed hover:brightness-110 active:scale-95 transition-all rounded-sm flex items-center justify-center gap-2 text-center"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  BUKA DI GOOGLE MAPS
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
