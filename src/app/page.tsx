"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [nrp, setNrp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Fetch user from personel table
      const { data, error: dbError } = await supabase
        .from("personel")
        .select("*")
        .eq("nrp", nrp.trim())
        .single();

      if (dbError || !data) {
        setError("NRP tidak ditemukan!");
        setIsSubmitting(false);
        return;
      }

      // Simple password check (for prototype/demo)
      if (data.password !== password) {
        setError("Kata sandi salah!");
        setIsSubmitting(false);
        return;
      }

      if (!data.status_aktif) {
        setError("Akun Anda tidak aktif!");
        setIsSubmitting(false);
        return;
      }

      // Success
      setIsSuccess(true);
      localStorage.setItem("current_user_nrp", data.nrp);
      localStorage.setItem("current_user_role", data.role);
      localStorage.setItem("current_user_name", data.nama);

      setTimeout(() => {
        setIsSubmitting(false);
        if (data.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }, 1000);
    } catch (err) {
      console.error("Login error:", err);
      setError("Terjadi kesalahan jaringan atau server!");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen relative overflow-hidden bg-black">
      {/* Background Image for Mobile only */}
      <div 
        className="absolute inset-0 md:hidden bg-cover bg-center opacity-45 pointer-events-none"
        style={{ backgroundImage: "url('/assets/login-bg.png')" }}
      />
      {/* Dark overlay with blur for mobile to keep text readable */}
      <div className="absolute inset-0 md:hidden bg-black/60 backdrop-blur-[1px] pointer-events-none" />

      {/* Left Column: Image Background (Hidden on small screens) */}
      <div 
        className="hidden md:flex flex-col justify-end w-1/2 lg:w-3/5 bg-cover bg-center relative p-12 animate-slide-left"
        style={{ backgroundImage: "url('/assets/login-bg.png')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/40"></div>
        
        <div className="relative z-10 max-w-lg border-l-4 border-primary pl-6 mb-8 animate-slide-up delay-200">
          <h2 className="font-display-lg text-[32px] font-bold text-white mb-3 leading-tight drop-shadow-md">
            Sistem Kehadiran Terintegrasi
          </h2>
          <p className="font-body-lg text-gray-300 leading-relaxed drop-shadow-sm">
            Aplikasi presensi digital resmi Si Abdi - Polres Pelabuhan Makasar. Platform ini dirancang untuk memantau disiplin, lokasi penugasan, dan kesiapan operasional personel secara real-time demi mewujudkan pelayanan masyarakat yang prima.
          </p>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center relative p-8 animate-slide-right delay-100">
        <div className="geometric-overlay"></div>
        
        <div className="relative z-10 w-full max-w-[420px]">
          {/* Header Section */}
          <header className="text-center mb-stack-lg flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-24 h-24 mb-stack-md">
              <img src="/assets/logo.png" alt="Logo Polres Pelabuhan Makasar" className="w-full h-full object-contain drop-shadow-2xl" />
            </div>
            <h1 className="font-headline-lg-mobile text-[22px] md:text-headline-lg-mobile text-primary tracking-tight uppercase mb-1 font-bold">
              SI ABDI
            </h1>
            <p className="font-label-caps text-[14px] text-on-surface-variant tracking-widest font-bold">
              SISTEM ABSENSI DIGITAL POLRES PELABUHAN MAKASAR
            </p>
          </header>

          {/* Login Card */}
          <div className="bg-surface-container-lowest border border-outline-variant p-stack-lg rounded-none relative overflow-hidden shadow-2xl">
            <div className="rank-bar"></div>
            
            <form className="space-y-stack-md" onSubmit={handleSubmit}>
              {/* NRP Field */}
              <div className="space-y-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase">
                  Nomor NRP
                </label>
                <div className="relative group focus-within:scale-[1.01] transition-transform">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">person</span>
                  <input 
                    className="w-full bg-black border border-outline-variant focus:border-primary focus:ring-0 text-on-surface py-3 pl-11 pr-4 font-body-sm transition-all outline-none" 
                    placeholder="Contoh: 88012345 (atau ADMIN)" 
                    required 
                    type="text"
                    value={nrp}
                    onChange={(e) => setNrp(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase">
                  Kata Sandi
                </label>
                <div className="relative group focus-within:scale-[1.01] transition-transform">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">lock</span>
                  <input 
                    className="w-full bg-black border border-outline-variant focus:border-primary focus:ring-0 text-on-surface py-3 pl-11 pr-4 font-body-sm transition-all outline-none" 
                    placeholder="••••••••" 
                    required 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-error/10 border border-error/50 text-error text-[12px] font-bold text-center uppercase tracking-wider flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </div>
              )}

              {/* Main Action */}
              <button 
                className={`w-full py-4 text-black font-bold text-label-caps tracking-widest uppercase hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 ${isSuccess ? 'bg-green-600' : 'gold-brushed'}`} 
                type="submit"
                disabled={isSubmitting || isSuccess}
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span> MEMPROSES...
                  </>
                ) : isSuccess ? (
                  <>
                    BERHASIL <span className="material-symbols-outlined">check_circle</span>
                  </>
                ) : (
                  <>
                    MASUK KE SISTEM
                    <span className="material-symbols-outlined text-[20px]">login</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Security Warning */}
          <div className="mt-stack-md flex items-center justify-center gap-2 px-4 py-3 bg-surface-container/50 border border-outline-variant/30">
            <span className="material-symbols-outlined text-primary text-[18px]">security_update_good</span>
            <p className="font-label-caps text-[10px] text-on-surface-variant text-center leading-tight">
              SISTEM TERENKRIPSI & DIAWASI OLEH DIVISI PROPAM
            </p>
          </div>
        </div>

        {/* Visual Polish Elements */}
        <div className="absolute bottom-0 left-0 w-full h-1 gold-brushed opacity-50 z-20"></div>
      </div>
    </main>
  );
}
