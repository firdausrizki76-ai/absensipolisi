"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

export default function AdminPersonelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [personelList, setPersonelList] = useState<any[]>([]);
  const [activePhotoModal, setActivePhotoModal] = useState<{ url: string, name: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Form State
  const [nrp, setNrp] = useState("");
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");
  const [pangkat, setPangkat] = useState("");
  const [satuan, setSatuan] = useState("");
  const [jabatan, setJabatan] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Edit Form State
  const [editNrp, setEditNrp] = useState("");
  const [editNama, setEditNama] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPangkat, setEditPangkat] = useState("");
  const [editSatuan, setEditSatuan] = useState("");
  const [editJabatan, setEditJabatan] = useState("");

  const loadPersonel = async () => {
    try {
      const { data, error } = await supabase
        .from("personel")
        .select("*")
        .eq("role", "PERSONEL")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPersonelList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("current_user_role");
    if (role !== "ADMIN") {
      router.push("/");
      return;
    }
    loadPersonel();
  }, [router]);

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("personel")
        .insert({
          nrp: nrp.trim(),
          nama: nama.trim(),
          password: password,
          pangkat: pangkat.trim(),
          satuan: satuan.trim(),
          jabatan: jabatan.trim(),
          role: "PERSONEL",
          status_aktif: true
        });

      if (error) {
        alert("Gagal menambahkan personel: " + error.message);
      } else {
        alert("Personel berhasil ditambahkan!");
        setShowAddModal(false);
        // Clear form
        setNrp("");
        setNama("");
        setPassword("");
        setPangkat("");
        setSatuan("");
        setJabatan("");
        // Reload list
        loadPersonel();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (nrpToDelete: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus personel dengan NRP ${nrpToDelete}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("personel")
        .delete()
        .eq("nrp", nrpToDelete);

      if (error) {
        alert("Gagal menghapus personel: " + error.message);
      } else {
        alert("Personel berhasil dihapus!");
        loadPersonel();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (personel: any) => {
    setEditNrp(personel.nrp);
    setEditNama(personel.nama);
    setEditPassword(personel.password);
    setEditPangkat(personel.pangkat || "");
    setEditSatuan(personel.satuan || "");
    setEditJabatan(personel.jabatan || "");
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEdit(true);

    try {
      const { error } = await supabase
        .from("personel")
        .update({
          nama: editNama.trim(),
          password: editPassword,
          pangkat: editPangkat.trim(),
          satuan: editSatuan.trim(),
          jabatan: editJabatan.trim()
        })
        .eq("nrp", editNrp);

      if (error) {
        alert("Gagal memperbarui data personel: " + error.message);
      } else {
        alert("Data personel berhasil diperbarui!");
        setShowEditModal(false);
        loadPersonel();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const downloadExcelTemplate = () => {
    const headers = [["nrp", "nama", "password", "pangkat", "satuan", "jabatan"]];
    const exampleRow = ["88012347", "Andi Pratama", "123456", "BRIPDA", "Satuan Lalu Lintas (Sat Lantas)", "Anggota Turjawali"];
    const worksheetData = [...headers, exampleRow];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Personel");
    
    XLSX.writeFile(workbook, "template_personil_siabdi.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!jsonData || jsonData.length === 0) {
          alert("Tidak ada data personel valid yang ditemukan di file Excel!");
          setIsImporting(false);
          return;
        }

        // Format and validate rows
        const newPersonelList: any[] = [];
        jsonData.forEach((row: any) => {
          // Normalize column names to lowercase and trim
          const cleanRow: any = {};
          Object.keys(row).forEach((key) => {
            cleanRow[key.toLowerCase().trim()] = row[key];
          });

          // Check required fields
          if (cleanRow.nrp && cleanRow.nama && cleanRow.password) {
            newPersonelList.push({
              nrp: String(cleanRow.nrp).trim(),
              nama: String(cleanRow.nama).trim(),
              password: String(cleanRow.password),
              pangkat: cleanRow.pangkat ? String(cleanRow.pangkat).trim() : "",
              satuan: cleanRow.satuan ? String(cleanRow.satuan).trim() : "",
              jabatan: cleanRow.jabatan ? String(cleanRow.jabatan).trim() : "",
              role: "PERSONEL",
              status_aktif: true
            });
          }
        });

        if (newPersonelList.length === 0) {
          alert("Tidak ada baris data valid (NRP, Nama, Password harus terisi)!");
          setIsImporting(false);
          return;
        }

        const { error } = await supabase
          .from("personel")
          .insert(newPersonelList);

        if (error) {
          alert("Gagal mengimpor database: " + error.message);
        } else {
          alert(`Berhasil mengimpor ${newPersonelList.length} personel baru ke database!`);
          setShowImportModal(false);
          loadPersonel();
        }
      } catch (err: any) {
        alert("Terjadi kesalahan membaca file Excel: " + err.message);
      } finally {
        setIsImporting(false);
        // Reset input value
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
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
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="font-label-caps text-label-caps text-primary mb-1">MEMBERS CONTROL CENTER</p>
          <h2 className="font-display-lg text-[28px] md:text-[32px] font-bold text-on-surface">Manajemen Personil</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
            Si Abdi - Polres Pelabuhan Makasar
          </p>
        </div>

        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <button 
            onClick={() => setShowImportModal(true)}
            className="border border-primary text-primary hover:bg-primary/10 px-5 py-2 flex items-center justify-center gap-2 text-[12px] font-bold tracking-widest rounded-sm font-label-caps"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            IMPORT EXCEL
          </button>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="gold-brushed text-black hover:brightness-110 px-6 py-2 flex items-center justify-center gap-2 text-[12px] font-bold tracking-widest rounded-sm font-label-caps active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[18px] font-bold">person_add</span>
            TAMBAH BARU
          </button>
        </div>
      </section>

      {/* Main Table */}
      <section className="bg-[#0D0D0D] border border-outline-variant overflow-x-auto">
        <div className="p-4 bg-surface-container flex justify-between items-center border-b border-outline-variant">
          <h3 className="font-label-caps font-bold text-on-surface">Daftar Anggota Polisi ({personelList.length})</h3>
        </div>
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest w-16">FOTO</th>
              <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">NAMA / PANGKAT</th>
              <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">NRP</th>
              <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">SATKER / JABATAN</th>
              <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest">STATUS AKUN</th>
              <th className="p-4 font-label-caps text-[12px] text-on-surface-variant tracking-widest text-center w-24">AKSI</th>
            </tr>
          </thead>
          <tbody>
            {personelList.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-on-surface-variant font-body-sm">
                  Belum ada data personel terdaftar di database.
                </td>
              </tr>
            ) : (
              personelList.map((row, index) => (
                <tr key={index} className="border-b border-outline-variant hover:bg-surface-container-high transition-colors">
                  <td className="p-4">
                    {row.foto_url ? (
                      <div 
                        onClick={() => setActivePhotoModal({ url: row.foto_url, name: row.nama })}
                        className="w-10 h-10 rounded bg-surface border border-outline overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        title="Klik untuk memperbesar"
                      >
                        <img src={row.foto_url} alt="Face" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-surface border border-outline flex items-center justify-center opacity-40">
                        <span className="material-symbols-outlined text-on-surface-variant text-sm">no_photography</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="font-body-sm font-semibold text-on-surface">{row.nama}</p>
                    <p className="font-label-caps text-[10px] text-primary">{row.pangkat || "-"}</p>
                  </td>
                  <td className="p-4 font-body-sm font-mono text-on-surface-variant">{row.nrp}</td>
                  <td className="p-4 font-body-sm">
                    <p className="text-on-surface">{row.satuan || "-"}</p>
                    <p className="text-[11px] text-on-surface-variant">{row.jabatan || "-"}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 text-[9px] font-bold border ${
                      row.foto_url 
                        ? 'text-green-400 border-green-400/30 bg-green-400/10' 
                        : 'text-orange-400 border-orange-400/30 bg-orange-400/10'
                    }`}>
                      {row.foto_url ? 'WAJAH TERDAFTAR' : 'BELUM DAFTAR WAJAH'}
                    </span>
                  </td>
                  <td className="p-4 text-center flex justify-center gap-2 items-center">
                    <button 
                      onClick={() => handleEditClick(row)}
                      className="text-primary border border-primary/30 hover:bg-primary/10 p-1.5 transition-colors duration-150 rounded"
                      title="Edit Personel"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(row.nrp)}
                      className="text-error border border-error/30 hover:bg-error/10 p-1.5 transition-colors duration-150 rounded"
                      title="Hapus Personel"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-primary w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-primary text-black p-4 flex justify-between items-center">
              <span className="font-label-caps font-bold tracking-widest text-[12px] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">person_add</span>
                REGISTRASI ANGGOTA BARU
              </span>
              <button 
                onClick={() => setShowAddModal(false)}
                className="material-symbols-outlined text-[20px] font-bold text-black hover:opacity-75"
              >
                close
              </button>
            </div>
            
            <form onSubmit={handleAddManual} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">NRP / Username</label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: 88012345"
                  className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                  value={nrp}
                  onChange={(e) => setNrp(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">Nama Lengkap</label>
                <input 
                  type="text"
                  required
                  placeholder="Nama Lengkap Anggota"
                  className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">Kata Sandi (Password)</label>
                <input 
                  type="password"
                  required
                  placeholder="Kata Sandi Login"
                  className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">Pangkat</label>
                  <input 
                    type="text"
                    placeholder="Contoh: BRIPKA"
                    className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                    value={pangkat}
                    onChange={(e) => setPangkat(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">Satuan Kerja</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Sat Lantas"
                    className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">Jabatan</label>
                <input 
                  type="text"
                  placeholder="Contoh: Anggota Turjawali"
                  className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-outline text-on-surface-variant font-label-caps tracking-widest text-[12px] hover:bg-surface-variant transition-colors rounded-sm"
                >
                  BATAL
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 font-label-caps tracking-widest text-[12px] font-bold text-black gold-brushed hover:brightness-110 active:scale-95 transition-all rounded-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      MEMPROSES
                    </>
                  ) : (
                    "DAFTARKAN"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-primary w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
            <div className="bg-primary text-black p-4 flex justify-between items-center">
              <span className="font-label-caps font-bold tracking-widest text-[12px] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                IMPORT PERSONEL DARI EXCEL
              </span>
              <button 
                onClick={() => setShowImportModal(false)}
                className="material-symbols-outlined text-[20px] font-bold text-black hover:opacity-75"
              >
                close
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              {/* Alert Warning */}
              <div className="p-4 border border-primary/30 bg-primary/5 flex gap-3 items-start">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">info</span>
                <div className="space-y-1">
                  <h4 className="font-label-caps text-[11px] text-primary font-bold">PENTING: HARAP BACA SEBELUM UPLOAD</h4>
                  <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
                    Anda **harus mengunduh** template Excel resmi terlebih dahulu, mengisinya sesuai kolom yang ditentukan, lalu mengunggahnya kembali di sini.
                  </p>
                </div>
              </div>

              {/* Step By Step */}
              <div className="space-y-4">
                <h4 className="font-label-caps text-[10px] text-primary tracking-widest font-bold uppercase">LANGKAH-LANGKAH IMPORT</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Step 1 */}
                  <div className="bg-black/40 border border-outline-variant p-4 flex flex-col items-center text-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[12px]">1</span>
                    <span className="font-label-caps text-[10px] text-on-surface font-semibold">UNDUH TEMPLATE</span>
                    <p className="text-[10px] text-on-surface-variant leading-normal">Dapatkan file Excel yang sudah diformat dengan kolom yang benar.</p>
                    <button 
                      onClick={downloadExcelTemplate}
                      type="button"
                      className="mt-2 w-full py-1.5 border border-primary text-primary hover:bg-primary/10 text-[10px] font-bold tracking-wider font-label-caps transition-colors rounded-sm flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">download</span>
                      Unduh Template
                    </button>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-black/40 border border-outline-variant p-4 flex flex-col items-center text-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[12px]">2</span>
                    <span className="font-label-caps text-[10px] text-on-surface font-semibold">ISI DATA</span>
                    <p className="text-[10px] text-on-surface-variant leading-normal">Isi data NRP, Nama, Kata Sandi, Pangkat, Satuan, dan Jabatan.</p>
                    <span className="text-[9px] text-primary/70 font-mono mt-2">Format: .xlsx / .xls</span>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-black/40 border border-outline-variant p-4 flex flex-col items-center text-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[12px]">3</span>
                    <span className="font-label-caps text-[10px] text-on-surface font-semibold">UNGGAH FILE</span>
                    <p className="text-[10px] text-on-surface-variant leading-normal">Upload kembali file Excel yang telah selesai Anda lengkapi.</p>
                  </div>
                </div>
              </div>

              {/* Contoh Format Kolom */}
              <div className="space-y-2">
                <h4 className="font-label-caps text-[10px] text-primary tracking-widest font-bold uppercase">CONTOH STRUKTUR KOLOM EXCEL</h4>
                <div className="border border-outline-variant overflow-x-auto bg-black">
                  <table className="w-full text-left text-[11px] font-mono border-collapse">
                    <thead>
                      <tr className="bg-surface-container border-b border-outline-variant">
                        <th className="p-2 border-r border-outline-variant text-primary">nrp</th>
                        <th className="p-2 border-r border-outline-variant text-primary">nama</th>
                        <th className="p-2 border-r border-outline-variant text-primary">password</th>
                        <th className="p-2 border-r border-outline-variant text-primary">pangkat</th>
                        <th className="p-2 border-r border-outline-variant text-primary">satuan</th>
                        <th className="p-2 text-primary">jabatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-outline-variant opacity-70">
                        <td className="p-2 border-r border-outline-variant">88012347</td>
                        <td className="p-2 border-r border-outline-variant">Andi Pratama</td>
                        <td className="p-2 border-r border-outline-variant">123456</td>
                        <td className="p-2 border-r border-outline-variant">BRIPDA</td>
                        <td className="p-2 border-r border-outline-variant">Sat Lantas</td>
                        <td className="p-2">Anggota Turjawali</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-on-surface-variant italic leading-normal">
                  *Catatan: NRP, Nama, dan Password adalah kolom wajib (tidak boleh kosong). NRP harus unik.
                </p>
              </div>

              {/* Upload Area */}
              <div className="space-y-2 pt-2 border-t border-outline-variant">
                <h4 className="font-label-caps text-[10px] text-on-surface-variant tracking-widest uppercase">UNGGAH FILE EXCEL DI SINI:</h4>
                <label className="border-2 border-dashed border-outline-variant hover:border-primary bg-black/60 p-6 flex flex-col items-center justify-center gap-2 rounded-sm cursor-pointer transition-colors group">
                  <span className="material-symbols-outlined text-[36px] text-on-surface-variant group-hover:text-primary transition-colors">upload_file</span>
                  <span className="font-label-caps text-[11px] font-bold text-on-surface group-hover:text-primary transition-colors">
                    {isImporting ? "MEMPROSES FILE..." : "PILIH FILE EXCEL (.XLSX)"}
                  </span>
                  <p className="text-[10px] text-on-surface-variant">Klik untuk menjelajah file komputer Anda</p>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                    disabled={isImporting}
                    onChange={handleImportExcel} 
                  />
                </label>
              </div>

              <div className="flex justify-end pt-2 border-t border-outline-variant">
                <button 
                  onClick={() => setShowImportModal(false)}
                  type="button"
                  className="px-6 py-2 border border-outline text-on-surface-variant font-label-caps tracking-widest text-[11px] hover:bg-surface-variant transition-colors rounded-sm"
                >
                  TUTUP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Personel Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-primary w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-primary text-black p-4 flex justify-between items-center">
              <span className="font-label-caps font-bold tracking-widest text-[12px] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">edit</span>
                EDIT DATA ANGGOTA
              </span>
              <button 
                onClick={() => setShowEditModal(false)}
                className="material-symbols-outlined text-[20px] font-bold text-black hover:opacity-75"
              >
                close
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">NRP / Username (Tidak Dapat Diubah)</label>
                <input 
                  type="text"
                  disabled
                  className="w-full bg-black/50 border border-outline-variant text-on-surface-variant py-2.5 px-3 font-body-sm outline-none cursor-not-allowed"
                  value={editNrp}
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">Nama Lengkap</label>
                <input 
                  type="text"
                  required
                  placeholder="Nama Lengkap Anggota"
                  className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">Kata Sandi (Password)</label>
                <input 
                  type="text"
                  required
                  placeholder="Kata Sandi Login"
                  className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">Pangkat</label>
                  <input 
                    type="text"
                    placeholder="Contoh: BRIPKA"
                    className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                    value={editPangkat}
                    onChange={(e) => setEditPangkat(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">Satuan Kerja</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Sat Lantas"
                    className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                    value={editSatuan}
                    onChange={(e) => setEditSatuan(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">Jabatan</label>
                <input 
                  type="text"
                  placeholder="Contoh: Anggota Turjawali"
                  className="w-full bg-black border border-outline-variant focus:border-primary text-on-surface py-2.5 px-3 font-body-sm outline-none"
                  value={editJabatan}
                  onChange={(e) => setEditJabatan(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 border border-outline text-on-surface-variant font-label-caps tracking-widest text-[12px] hover:bg-surface-variant transition-colors rounded-sm"
                >
                  BATAL
                </button>
                <button 
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-3 font-label-caps tracking-widest text-[12px] font-bold text-black gold-brushed hover:brightness-110 active:scale-95 transition-all rounded-sm flex items-center justify-center gap-2"
                >
                  {isSavingEdit ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      MEMPROSES
                    </>
                  ) : (
                    "SIMPAN"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {activePhotoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setActivePhotoModal(null)}
        >
          <div 
            className="relative max-w-3xl max-h-[85vh] flex flex-col items-center bg-surface-container-lowest border border-primary p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={() => setActivePhotoModal(null)}
                className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors border border-outline-variant"
              >
                <span className="material-symbols-outlined font-bold text-sm">close</span>
              </button>
            </div>
            <img 
              src={activePhotoModal.url} 
              alt={activePhotoModal.name} 
              className="max-w-full max-h-[70vh] object-contain border border-outline-variant"
            />
            <div className="w-full text-center mt-3 py-2 bg-black border border-outline-variant">
              <p className="font-label-caps text-primary text-[12px] font-bold tracking-widest uppercase">{activePhotoModal.name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
