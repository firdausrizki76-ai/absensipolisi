"use client";

import { useState, useEffect, useRef } from "react";
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

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

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

  // Load Leaflet dynamically from CDN
  useEffect(() => {
    if (loading) return;

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.head.removeChild(link);
        document.body.removeChild(script);
      } catch (e) {
        // Ignored if elements already removed
      }
    };
  }, [loading]);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded) return;
    const L = (window as any).L;
    if (!L) return;

    // Cleanup previous map instance if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Initialize map
    const map = L.map("settings-map").setView([centerLat, centerLng], 16);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add marker
    const marker = L.marker([centerLat, centerLng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    // Bind popup
    marker.bindPopup("<b>Titik Pusat Absensi</b><br>Seret marker ini untuk memindahkan lokasi.").openPopup();

    // Event: marker dragged
    marker.on("dragend", () => {
      const position = marker.getLatLng();
      setCenterLat(position.lat);
      setCenterLng(position.lng);
    });

    // Event: map clicked
    map.on("click", (e: any) => {
      const position = e.latlng;
      marker.setLatLng(position);
      setCenterLat(position.lat);
      setCenterLng(position.lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Sync marker position when lat/lng inputs change manually
  const handleCoordsChange = (lat: number, lng: number) => {
    setCenterLat(lat);
    setCenterLng(lng);
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng]);
    }
  };

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
        <div className="col-span-1 lg:col-span-5 bg-surface-container-lowest border border-outline-variant p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
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
                  onChange={(e) => handleCoordsChange(Number(e.target.value), centerLng)}
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
                  onChange={(e) => handleCoordsChange(centerLat, Number(e.target.value))}
                />
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-normal">
              Koordinat pusat Polres Pelabuhan Makasar. Anda bisa mengetik langsung atau **menyeret penanda (marker) / mengklik di mana saja pada peta** di sebelah kanan.
            </p>
          </div>

          <button 
            type="submit"
            disabled={saving}
            className="w-full py-3 font-label-caps tracking-widest text-[12px] font-bold text-black gold-brushed hover:brightness-110 active:scale-95 transition-all rounded-sm flex items-center justify-center gap-2 mt-6"
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
        <div className="col-span-1 lg:col-span-7 bg-surface-container-lowest border border-outline-variant p-6 flex flex-col min-h-[450px]">
          <h3 className="font-title-md text-[18px] font-bold text-on-surface border-b border-outline-variant pb-2 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">map</span>
            Pilih Lokasi Pusat Absensi
          </h3>

          <div className="flex-1 bg-black border border-outline-variant overflow-hidden relative min-h-[350px]">
            <div id="settings-map" className="w-full h-full min-h-[350px] z-10" />
            <div className="absolute top-2 left-12 bg-black/80 border border-primary/30 p-2 text-[9px] text-primary font-mono z-20">
              TITIK KOORDINAT AKTIF: {centerLat.toFixed(6)}°, {centerLng.toFixed(6)}°
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
