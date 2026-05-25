"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PengaturanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [radiusMaks, setRadiusMaks] = useState(100);
  const [centerLat, setCenterLat] = useState(-5.1329);
  const [centerLng, setCenterLng] = useState(119.4121);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("current_user_role");
    if (role !== "ADMIN") {
      router.push("/");
      return;
    }

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("pengaturan")
          .select("*")
          .eq("id", "default")
          .single();

        if (error) {
          console.error("Error loading settings:", error);
          // If row doesn't exist, we will use default states
        } else if (data) {
          setRadiusMaks(data.radius_maks);
          setCenterLat(data.center_lat);
          setCenterLng(data.center_lng);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("pengaturan")
        .upsert({
          id: "default",
          radius_maks: Number(radiusMaks),
          center_lat: Number(centerLat),
          center_lng: Number(centerLng),
          updated_at: new Date().toISOString()
        });

      if (error) {
        setMessage({ type: "error", text: "Gagal menyimpan pengaturan: " + error.message });
      } else {
        setMessage({ type: "success", text: "Pengaturan berhasil diperbarui!" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Terjadi kesalahan: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-container-padding space-y-stack-lg pb-24 max-w-6xl">
      <div>
        <p className="font-label-caps text-label-caps text-primary mb-1">SYSTEM CONFIGURATION</p>
        <h2 className="font-display-lg text-[28px] md:text-[32px] font-bold text-on-surface">Pengaturan Global</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
          Konfigurasi radius dan lokasi pusat absen Polres Pelabuhan Makasar
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Form Fields */}
        <div className="col-span-1 lg:col-span-6 bg-surface-container-lowest border border-outline-variant p-6 space-y-6">
          <h3 className="font-title-md text-[18px] font-bold text-on-surface border-b border-outline-variant pb-2 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">distance</span>
            Parameter Radius Absensi
          </h3>

          {message && (
            <div className={`p-4 border ${
              message.type === "success" 
                ? "border-green-500/50 bg-green-500/10 text-green-400" 
                : "border-error/50 bg-error/10 text-error"
            } text-body-sm font-semibold`}>
              {message.text}
            </div>
          )}

          <div className="space-y-1">
            <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase font-bold">
              Jarak Radius Maksimal (Meter)
            </label>
            <input 
              type="number"
              required
              min="10"
              max="50000"
              placeholder="Contoh: 100"
              className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
              value={radiusMaks}
              onChange={(e) => setRadiusMaks(Number(e.target.value))}
            />
            <p className="text-[11px] text-on-surface-variant leading-normal">
              Batas jarak maksimal (dalam meter) bagi personel dari titik koordinat pusat untuk diperbolehkan absen.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase font-bold">
                Latitude Pusat
              </label>
              <input 
                type="number"
                step="any"
                required
                placeholder="-5.1329"
                className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                value={centerLat}
                onChange={(e) => setCenterLat(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase font-bold">
                Longitude Pusat
              </label>
              <input 
                type="number"
                step="any"
                required
                placeholder="119.4121"
                className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                value={centerLng}
                onChange={(e) => setCenterLng(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-normal">
            Koordinat pusat Polres Pelabuhan Makasar (Default: -5.1329, 119.4121).
          </p>

          <button 
            type="submit"
            disabled={saving}
            className="w-full py-3 font-label-caps tracking-widest text-[12px] font-bold text-black gold-brushed hover:brightness-110 active:scale-95 transition-all rounded-sm flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                MENYIMPAN...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px] font-bold">save</span>
                SIMPAN PENGATURAN
              </>
            )}
          </button>
        </div>

        {/* Map Preview */}
        <div className="col-span-1 lg:col-span-6 bg-surface-container-lowest border border-outline-variant p-6 flex flex-col h-[400px] lg:h-auto">
          <h3 className="font-title-md text-[18px] font-bold text-on-surface border-b border-outline-variant pb-2 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">map</span>
            Pratinjau Titik Pusat Absensi
          </h3>

          <div className="flex-1 bg-black border border-outline-variant overflow-hidden relative min-h-[250px]">
            <iframe 
              title="OSM Center Preview"
              className="w-full h-full border-0 grayscale opacity-80" 
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.002}%2C${centerLat - 0.002}%2C${centerLng + 0.002}%2C${centerLat + 0.002}&layer=mapnik&marker=${centerLat}%2C${centerLng}`}
            ></iframe>
            <div className="absolute top-2 left-2 bg-black/80 border border-primary/30 p-2 text-[9px] text-primary font-mono z-10">
              PUSAT: {centerLat.toFixed(5)}°, {centerLng.toFixed(5)}°
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
