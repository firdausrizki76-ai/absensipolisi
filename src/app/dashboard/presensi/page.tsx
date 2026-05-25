"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PresensiPage() {
  const router = useRouter();
  const [nrp, setNrp] = useState<string | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState("-");
  const [checkOutTime, setCheckOutTime] = useState("-");
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<"scanning" | "confirm" | "register_face">("scanning");
  
  const [hasRegisteredFace, setHasRegisteredFace] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  const [coords, setCoords] = useState({ lat: -5.1329, lng: 119.4121 });
  const [locationName, setLocationName] = useState("MENYAMBUNGKAN GPS...");
  const [gpsStatus, setGpsStatus] = useState("GPS MENGHUBUNGKAN...");
  const [scannedPhoto, setScannedPhoto] = useState<string | null>(null);
  
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Determine status based on current time
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Format time for display
    setCurrentTimeStr(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} WITA`);

    if (hours < 8 || (hours === 8 && minutes === 0)) {
      setAttendanceStatus("HADIR");
    } else {
      setAttendanceStatus("TERLAMBAT");
    }
  }, [showModal]);

  useEffect(() => {
    const loggedNrp = localStorage.getItem("current_user_nrp");
    if (!loggedNrp) {
      router.push("/");
      return;
    }
    setNrp(loggedNrp);

    const loadTodayStatusAndLogs = async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        
        // Fetch profile to see if face is registered
        const { data: pData, error: pError } = await supabase
          .from("personel")
          .select("foto_url")
          .eq("nrp", loggedNrp)
          .single();

        if (!pError && pData) {
          setHasRegisteredFace(!!pData.foto_url);
        }

        // Fetch today's attendance log
        const { data: todayLog, error: logError } = await supabase
          .from("presensi")
          .select("*")
          .eq("nrp", loggedNrp)
          .eq("tanggal", todayStr)
          .maybeSingle();

        if (!logError && todayLog) {
          if (todayLog.check_in) {
            setIsCheckedIn(true);
            setCheckInTime(todayLog.check_in.substring(0, 5) + " WITA");
          }
          if (todayLog.check_out) {
            setIsCheckedOut(true);
            setCheckOutTime(todayLog.check_out.substring(0, 5) + " WITA");
          }
        }

        // Fetch recent logs
        const { data: list, error: listError } = await supabase
          .from("presensi")
          .select("*")
          .eq("nrp", loggedNrp)
          .order("tanggal", { ascending: false })
          .limit(5);

        if (!listError && list) {
          setRecentLogs(list);
        }
      } catch (err) {
        console.error("Error loading attendance:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTodayStatusAndLogs();

    // Fetch real GPS location
    if (navigator.geolocation) {
      setGpsStatus("MENEMUKAN LOKASI...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          setCoords({ lat: latitude, lng: longitude });
          setGpsStatus("TERKUNCI (AKURASI TINGGI)");

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              {
                headers: {
                  "User-Agent": "SiAbdiApp/1.0"
                }
              }
            );
            const data = await res.json();
            if (data && data.display_name) {
              const addr = data.address;
              const roadName = addr.road || addr.suburb || addr.village || addr.city || "Lokasi Anggota";
              setLocationName(roadName.toUpperCase());
            } else {
              setLocationName("LOKASI ANGGOTA");
            }
          } catch (err) {
            console.error("Reverse geocoding error:", err);
            setLocationName("LOKASI ANGGOTA");
          }
        },
        (error) => {
          console.error("GPS Error:", error);
          setGpsStatus("AKSES GPS DITOLAK (DEFAULT)");
          setLocationName("MAPOLRES PELABUHAN");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsStatus("GPS TIDAK DIDUKUNG");
      setLocationName("MAPOLRES PELABUHAN");
    }
  }, [router]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setVideoStream(stream);
      setTimeout(() => {
        const videoElement = document.getElementById("webcam-video") as HTMLVideoElement;
        if (videoElement) {
          videoElement.srcObject = stream;
          videoElement.play().catch(e => console.error("Error playing video:", e));
        }
      }, 200);
    } catch (err) {
      console.error("Camera access error:", err);
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (showModal && (modalStep === "register_face" || modalStep === "scanning")) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showModal, modalStep]);

  const handleCheckInClick = () => {
    setShowModal(true);
    setScannedPhoto(null);
    if (!hasRegisteredFace) {
      setModalStep("register_face");
    } else {
      setModalStep("scanning");
      
      // Auto-scan after 2.5s of live camera stream
      const timeoutId = setTimeout(() => {
        const videoElement = document.getElementById("webcam-video") as HTMLVideoElement;
        const canvasElement = document.getElementById("webcam-canvas") as HTMLCanvasElement;
        let capturedPhoto = "";

        if (videoElement && canvasElement) {
          const context = canvasElement.getContext("2d");
          if (context) {
            canvasElement.width = videoElement.videoWidth || 640;
            canvasElement.height = videoElement.videoHeight || 480;
            context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            capturedPhoto = canvasElement.toDataURL("image/png");
          }
        }

        if (capturedPhoto) {
          setScannedPhoto(capturedPhoto);
        }
        
        // Stop active camera
        if (videoStream) {
          videoStream.getTracks().forEach(track => track.stop());
          setVideoStream(null);
        }

        setModalStep("confirm");
      }, 2500);

      scanTimeoutRef.current = timeoutId;
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!nrp) return;
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const nowTimeStr = new Date().toTimeString().split(" ")[0]; // HH:MM:SS
      const { error } = await supabase
        .from("presensi")
        .upsert({
          nrp: nrp,
          tanggal: todayStr,
          check_in: nowTimeStr,
          status: attendanceStatus,
          lokasi_lat: coords.lat,
          lokasi_lng: coords.lng,
          lokasi_nama: locationName
        });

      if (error) {
        console.error("Supabase upsert error:", error);
        alert("Gagal mengirim absensi!");
        return;
      }

      setIsCheckedIn(true);
      setCheckInTime(nowTimeStr.substring(0, 5) + " WITA");
      setShowModal(false);

      // Refresh recent logs
      const { data: list } = await supabase
        .from("presensi")
        .select("*")
        .eq("nrp", nrp)
        .order("tanggal", { ascending: false })
        .limit(5);
      if (list) setRecentLogs(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterFace = async () => {
    if (!nrp) return;
    setIsRegistering(true);
    try {
      const videoElement = document.getElementById("webcam-video") as HTMLVideoElement;
      const canvasElement = document.getElementById("webcam-canvas") as HTMLCanvasElement;
      let capturedPhoto = "";

      if (videoElement && canvasElement) {
        const context = canvasElement.getContext("2d");
        if (context) {
          canvasElement.width = videoElement.videoWidth || 640;
          canvasElement.height = videoElement.videoHeight || 480;
          context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
          capturedPhoto = canvasElement.toDataURL("image/png");
        }
      }

      // Fallback
      if (!capturedPhoto) {
        capturedPhoto = "https://lh3.googleusercontent.com/aida-public/AB6AXuCt8Vrhx6ompIkvRr3VEF0iq0XARkxUbxMADoFhY1CsJwJuIkKQ334TVBg7R0dFdnl-BpDrIwNVD_7rmv4MRQMo8rTdZychNZmHarrNx78EceG_mRLmP45KhQo6KV7kr0hA9ElM_5LBNlEMs_iH3JHbslfUqOE50UChmv5aulsE_Pup5tCVVzvtltBOGrXtEBrJrs-VWDdipfhPSHaoSpHaLxDvpFIIhD4bw8f6ut4GJ69s6BuXqdxwAoop_Wkagbqaf4xQkxcuwu0-";
      }

      const res = await fetch("/api/upload-drive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nrp, image: capturedPhoto }),
      });

      const resData = await res.json();

      if (!res.ok) {
        alert("Gagal mendaftarkan wajah: " + (resData.error || "Terjadi kesalahan server"));
        return;
      }

      setHasRegisteredFace(true);
      stopCamera();
      
      setModalStep("scanning");
      setTimeout(() => {
        setModalStep("confirm");
      }, 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleConfirmCheckOut = async () => {
    if (!nrp) return;
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const nowTimeStr = new Date().toTimeString().split(" ")[0];

      const { error } = await supabase
        .from("presensi")
        .update({
          check_out: nowTimeStr
        })
        .eq("nrp", nrp)
        .eq("tanggal", todayStr);

      if (error) {
        console.error("Supabase check-out error:", error);
        alert("Gagal melakukan Check Out!");
        return;
      }

      setIsCheckedOut(true);
      setCheckOutTime(nowTimeStr.substring(0, 5) + " WITA");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <style>{`
        .gold-glow { box-shadow: 0 0 20px rgba(234, 194, 67, 0.2); }
        .gold-glow-hover:hover { box-shadow: 0 0 30px rgba(234, 194, 67, 0.4); }
        .scan-line {
            position: absolute; width: 100%; height: 2px;
            background: #eac243; box-shadow: 0 0 15px #eac243;
            animation: scan 2s linear infinite;
        }
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
      `}</style>

      {/* Modal for Check In */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-primary w-full max-w-md shadow-[0_0_50px_rgba(234,194,67,0.15)] flex flex-col overflow-hidden">
            <div className="bg-primary text-black p-3 flex justify-between items-center">
              <span className="font-label-caps font-bold tracking-widest text-[12px]">
                {modalStep === "register_face" ? "REGISTRASI WAJAH ANGGOTA" : "AUTENTIKASI BIOMETRIK & LOKASI"}
              </span>
              {(modalStep === "scanning" || isRegistering) && <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>}
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              {/* Camera Area */}
              <div className="relative aspect-video bg-black border border-outline-variant overflow-hidden flex items-center justify-center">
                {(modalStep === "register_face" || modalStep === "scanning") ? (
                  <>
                    <video id="webcam-video" className="w-full h-full object-cover transform -scale-x-100" playsInline muted></video>
                    <canvas id="webcam-canvas" className="hidden"></canvas>
                    <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 text-[10px] text-primary border border-primary/30 font-mono z-10">
                      KAMERA LIVE
                    </div>
                    {modalStep === "scanning" && (
                      <>
                        <div className="scan-line z-10"></div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <div className="w-48 h-60 border border-primary/50 rounded-[50%] flex items-center justify-center animate-pulse">
                            <span className="text-[10px] text-primary bg-black/80 px-2.5 py-1 font-sans rounded tracking-wider font-bold">MEMINDAI...</span>
                          </div>
                        </div>
                      </>
                    )}
                    {modalStep === "register_face" && (
                      <div className="absolute inset-0 border border-dashed border-primary/30 pointer-events-none flex items-center justify-center">
                        <div className="w-44 h-56 border-2 border-dashed border-primary/50 rounded-[50%] flex items-center justify-center animate-pulse">
                          <span className="text-[10px] text-primary bg-black/80 px-2 py-1 font-sans rounded tracking-wider font-bold">Posisikan Wajah</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <img 
                      className="w-full h-full object-cover" 
                      src={scannedPhoto || "https://lh3.googleusercontent.com/aida-public/AB6AXuDPZ9F1i7CyfZ_0KgbmcVZLcsKxDQLvrO3efC4kANzcd1HKERSRuo5JccEBDTwSNZjVqIDcN0UwSKFYXiSD4KJkYBpsWl6AfSxB7YzrWqjBblfNtJla6LppGIst75h1N3cHYVQWWMOCI3pLggF--3qUAFFCTAoIiv4pPZxtDQlXjIa0OE_Td1juh3IerqY-htkpdDl3IVzIV_RX7MwbSvGhgZolEqzDXn8haJfwY55u6JY5RxRCQhml4Ye4qYKLUFPqp69AoWfOJoo1"} 
                      alt="Captured Frame"
                    />
                    <div className="absolute inset-0 border-4 border-green-500/50">
                       <span className="absolute bottom-2 right-2 material-symbols-outlined text-green-500 bg-black/50 rounded-full">check_circle</span>
                    </div>
                  </>
                )}
              </div>

              {/* Info text for first-time registration */}
              {modalStep === "register_face" && (
                <div className="p-3 border border-primary/30 bg-primary/10">
                  <span className="font-label-caps text-[10px] text-primary block mb-1 font-bold">INFO PENDAFTARAN WAJAH:</span>
                  <span className="font-body-sm text-[11px] text-on-surface leading-normal">
                    Ini adalah absensi pertama Anda. Harap menghadap kamera dan pastikan wajah terlihat jelas untuk mendaftarkan foto biometrik wajah Anda.
                  </span>
                </div>
              )}

              {/* Status Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black border border-outline p-3 overflow-hidden">
                  <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">LOKASI</span>
                  <span className="font-body-sm text-primary flex items-center gap-1 truncate text-ellipsis block">
                    <span className="material-symbols-outlined text-[14px] shrink-0">my_location</span>
                    {locationName}
                  </span>
                </div>
                <div className="bg-black border border-outline p-3">
                  <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">WAKTU (WITA)</span>
                  <span className="font-body-sm text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {currentTimeStr}
                  </span>
                </div>
              </div>

              {/* Attendance Status */}
              <div className={`p-3 border ${
                attendanceStatus === 'HADIR' ? 'border-green-500/50 bg-green-500/10' :
                attendanceStatus === 'TERLAMBAT' ? 'border-orange-500/50 bg-orange-500/10' :
                'border-error/50 bg-error/10'
              }`}>
                <span className="font-label-caps text-[10px] text-on-surface block mb-1">STATUS ABSENSI:</span>
                <span className={`font-bold tracking-widest ${
                  attendanceStatus === 'HADIR' ? 'text-green-500' :
                  attendanceStatus === 'TERLAMBAT' ? 'text-orange-500' :
                  'text-error'
                }`}>{attendanceStatus}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-4 mt-2">
                <button 
                  onClick={() => {
                    setShowModal(false);
                    stopCamera();
                  }}
                  className="flex-1 py-3 border border-outline text-on-surface-variant font-label-caps tracking-widest text-[12px] hover:bg-surface-variant transition-colors"
                >
                  BATAL
                </button>
                {modalStep === "register_face" ? (
                  <button 
                    onClick={handleRegisterFace}
                    disabled={isRegistering}
                    className="flex-1 py-3 font-label-caps tracking-widest text-[12px] font-bold text-black transition-all gold-brushed hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isRegistering ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                        MENDAFTAR...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                        DAFTAR WAJAH
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={handleConfirmCheckIn}
                    disabled={modalStep === "scanning"}
                    className={`flex-1 py-3 font-label-caps tracking-widest text-[12px] font-bold text-black transition-all ${
                      modalStep === "scanning" ? "bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed" : "gold-brushed hover:brightness-110 active:scale-95"
                    }`}
                  >
                    KIRIM ABSENSI
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
       )}
 
      {loading ? (
        <div className="flex h-[60vh] items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : (
        <div className="p-container-padding grid grid-cols-1 md:grid-cols-12 gap-gutter pb-24">
          {/* Left Column: Check In/Out */}
          <div className="col-span-1 md:col-span-12 lg:col-span-3 flex flex-col gap-stack-md">
            <div className="bg-surface-container-low border border-outline-variant p-6 flex flex-col items-center justify-center gap-4 group">
              <div className="text-center mb-2">
                <span className="font-label-caps text-label-caps text-on-surface-variant block">DUTY STATUS</span>
                <h2 className="font-headline-lg text-[28px] font-bold text-on-surface mt-1 uppercase">
                  {isCheckedOut ? "OFF DUTY" : isCheckedIn ? "ACTIVE" : "OFF DUTY"}
                </h2>
              </div>
              
              <button 
                onClick={handleCheckInClick}
                disabled={isCheckedIn}
                className={`w-full py-4 px-4 transition-all flex flex-col items-center justify-center gap-1 border ${
                  isCheckedIn 
                    ? 'bg-green-900/30 border-green-500/50 text-green-500 cursor-not-allowed' 
                    : 'gold-brushed gold-glow gold-glow-hover text-black hover:brightness-110 active:scale-95'
                }`}
              >
                {isCheckedIn ? (
                  <>
                    <span className="material-symbols-outlined text-[24px]">check_circle</span>
                    <span className="font-label-caps text-label-caps font-bold tracking-widest">SUDAH CHECK IN</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                    <span className="font-label-caps text-label-caps font-bold tracking-widest">CHECK IN</span>
                  </>
                )}
              </button>
              
              <button 
                onClick={handleConfirmCheckOut}
                disabled={!isCheckedIn || isCheckedOut}
                className={`w-full py-4 px-4 flex flex-col items-center justify-center gap-1 border transition-all ${
                  isCheckedOut
                    ? 'bg-red-900/30 border-red-500/50 text-red-500 cursor-not-allowed'
                    : isCheckedIn 
                      ? 'bg-black border-primary text-primary hover:bg-primary/10 active:scale-95' 
                      : 'bg-black border-outline-variant text-on-surface-variant opacity-50 cursor-not-allowed'
                }`}
              >
                {isCheckedOut ? (
                  <>
                    <span className="material-symbols-outlined text-[24px]">logout</span>
                    <span className="font-label-caps text-label-caps font-bold tracking-widest">SUDAH CHECK OUT</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[24px]">logout</span>
                    <span className="font-label-caps text-label-caps font-bold tracking-widest">CHECK OUT</span>
                  </>
                )}
              </button>
              
              <div className="mt-4 border-t border-outline-variant w-full pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">IN</span>
                  <span className="font-body-sm text-body-sm text-primary">{checkInTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">OUT</span>
                  <span className="font-body-sm text-body-sm text-primary">{checkOutTime}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-surface-container-low border border-outline-variant p-4">
              <h3 className="font-label-caps text-label-caps text-primary mb-4 border-b border-outline-variant pb-2">RECENT LOGS</h3>
              <div className="space-y-4">
                {recentLogs.length === 0 ? (
                  <div className="flex items-center gap-4 border-l-4 border-outline pl-3">
                    <p className="font-body-sm text-body-sm text-on-surface-variant">No logs today</p>
                  </div>
                ) : (
                  recentLogs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between border-l-4 border-primary pl-3 py-1">
                      <div>
                        <p className="font-body-sm text-on-surface font-semibold">{new Date(log.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                        <p className="font-label-caps text-[9px] text-on-surface-variant">
                          IN: {log.check_in ? log.check_in.substring(0, 5) : "-"} | OUT: {log.check_out ? log.check_out.substring(0, 5) : "-"}
                        </p>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 font-bold border ${log.status === "HADIR" ? "text-green-500 border-green-500/30 bg-green-500/10" : "text-orange-500 border-orange-500/30 bg-orange-500/10"}`}>{log.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        {/* Middle Column: Map View */}
        <div className="col-span-1 md:col-span-12 lg:col-span-6 flex flex-col gap-stack-md">
          <div className="relative flex-1 bg-surface-container-lowest border border-outline-variant overflow-hidden min-h-[400px] lg:min-h-[500px]">
            {/* Real Map Iframe */}
            <div className="absolute inset-0">
              <iframe 
                title="OSM Live Map"
                className="w-full h-full border-0 grayscale opacity-75 hover:opacity-100 transition-opacity" 
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.002}%2C${coords.lat - 0.002}%2C${coords.lng + 0.002}%2C${coords.lat + 0.002}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
              ></iframe>
            </div>
            
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
              <div className="bg-black/80 border border-primary/30 p-2 text-[10px] text-primary font-mono rounded-sm">
                LAT: {coords.lat.toFixed(6)}°<br/>LNG: {coords.lng.toFixed(6)}°
              </div>
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="relative">
                <span className="material-symbols-outlined text-primary text-5xl drop-shadow-[0_0_10px_rgba(234,194,67,1)]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                <div className="absolute -inset-4 border-2 border-primary rounded-full animate-ping opacity-25"></div>
              </div>
            </div>
            
            <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row gap-4 z-10">
              <div className="flex-1 bg-black/80 border border-outline-variant p-3 backdrop-blur-sm rounded-sm">
                <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">LOKASI SAAT INI</span>
                <span className="font-title-md text-[16px] md:text-[18px] font-bold text-primary truncate block uppercase">{locationName}</span>
              </div>
              <div className="flex-1 bg-black/80 border border-outline-variant p-3 backdrop-blur-sm rounded-sm">
                <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">STATUS GPS</span>
                <span className={`font-title-md text-[16px] md:text-[18px] font-bold ${gpsStatus.startsWith("TERKUNCI") ? "text-green-500" : "text-orange-500"}`}>{gpsStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Verification & Checklist */}
        <div className="col-span-1 md:col-span-12 lg:col-span-3 flex flex-col gap-stack-md">
          <div className="bg-surface-container-low border border-outline-variant p-6">
            <h3 className="font-label-caps text-[14px] font-bold text-primary border-b border-outline-variant pb-2 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              VERIFIKASI SISTEM
            </h3>
            
            <div className="space-y-6">
              {/* Verification Item */}
              <div className="flex items-center justify-between p-3 border border-outline-variant bg-black">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">gps_fixed</span>
                  <span className="font-label-caps text-label-caps text-on-surface">LOKASI</span>
                </div>
                <span className="text-[10px] text-primary border border-primary px-2 py-0.5 font-bold">SESUAI ZONA</span>
              </div>
              
              {/* Verification Item */}
              <div className="flex items-center justify-between p-3 border border-outline-variant bg-black">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">face</span>
                  <span className="font-label-caps text-label-caps text-on-surface">WAJAH</span>
                </div>
                <span className="text-[10px] text-primary border border-primary px-2 py-0.5 font-bold">
                  {isCheckedIn ? 'TERVERIFIKASI' : 'MENUNGGU'}
                </span>
              </div>
              
              {/* Verification Item */}
              <div className="flex items-center justify-between p-3 border border-outline-variant bg-black">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                  <span className="font-label-caps text-label-caps text-on-surface">WAKTU</span>
                </div>
                <span className="text-[10px] text-primary border border-primary px-2 py-0.5 font-bold">TERHUBUNG NTP</span>
              </div>
            </div>
            
            <div className="mt-8">
              <div className="p-4 bg-surface-container-high border-l-4 border-primary">
                <p className="text-[11px] text-on-surface leading-relaxed">
                  <span className="text-primary font-bold">INFO:</span> Foto absensi akan secara otomatis disimpan ke penyimpanan Google Drive terenkripsi milik Polres Pelabuhan Makasar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);
}
