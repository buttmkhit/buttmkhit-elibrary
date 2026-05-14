import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Upload, 
  FileText, 
  Database, 
  Trash2, 
  ShieldCheck, 
  User as UserIcon,
  FileBadge, 
  AlertCircle,
  Menu,
  X,
  Dog,
  Fish,
  Leaf,
  Home,
  LogOut,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- TYPES ---
interface CustomUser {
  uid: string;
  name: string;
  nip?: string;
  role: string;
  photoURL?: string;
}

// --- CONFIGURATION ---
const CATEGORIES = [
  { id: 'hewan', label: 'Karantina Hewan', icon: Dog, tag: 'Karantina Hewan' },
  { id: 'ikan', label: 'Karantina Ikan', icon: Fish, tag: 'Karantina Ikan' },
  { id: 'tumbuhan', label: 'Karantina Tumbuhan', icon: Leaf, tag: 'Karantina Tumbuhan' },
];

const ROLES = {
  PUBLIC: 'public',
  USER: 'user',
  ADMIN: 'admin'
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [role, setRole] = useState(ROLES.PUBLIC);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isHome, setIsHome] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState<{show: boolean}>({ show: false });

  // Fetch Documents
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Session Management
  useEffect(() => {
    const savedSession = localStorage.getItem('buttmkhit_session');
    if (savedSession) {
      const cUser = JSON.parse(savedSession);
      setCurrentUser(cUser);
      setRole(cUser.role);
    }
  }, []);

  // Derived state
  const publicDocs = useMemo(() => {
    return [...documents].sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [documents]);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         doc.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || 
                           (activeCategory === 'hewan' && doc.tag === 'Karantina Hewan') ||
                           (activeCategory === 'ikan' && doc.tag === 'Karantina Ikan') ||
                           (activeCategory === 'tumbuhan' && doc.tag === 'Karantina Tumbuhan');
    return matchesSearch && matchesCategory;
  });

  const handleCategoryClick = (id: string) => {
    setActiveCategory(id);
    setIsHome(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim() !== '') {
      setIsHome(false);
    }
  };

  const handleLogin = async () => {
    setShowAuthModal({ show: true });
  };
    
  const handleLogout = () => {
    localStorage.removeItem('buttmkhit_session');
    setCurrentUser(null);
    setRole(ROLES.PUBLIC);
    setActiveCategory('all');
    setIsHome(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <nav className="bg-[#123138] text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setIsHome(true); setActiveCategory('all'); setSearchQuery(''); }}>
             <img src="https://karantinaindonesia.go.id/profile/logo-barantin.png" className="h-8 w-auto" alt="Logo" />
             <span className="font-bold text-lg">BUTTMKHIT e-Library</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
             <button onClick={() => { setIsHome(true); setActiveCategory('all'); setSearchQuery(''); }} className={`px-3 py-2 rounded-lg hover:bg-emerald-600 transition-all italic ${isHome && activeCategory === 'all' ? 'bg-emerald-600 opacity-100' : 'opacity-80'}`}>Home</button>
             <button onClick={() => handleCategoryClick('hewan')} className={`px-3 py-2 rounded-lg hover:bg-emerald-600 transition-all ${activeCategory === 'hewan' ? 'bg-emerald-600 opacity-100' : 'opacity-80'}`}>Karantina Hewan</button>
             <button onClick={() => handleCategoryClick('ikan')} className={`px-3 py-2 rounded-lg hover:bg-emerald-600 transition-all ${activeCategory === 'ikan' ? 'bg-emerald-600 opacity-100' : 'opacity-80'}`}>Karantina Ikan</button>
             <button onClick={() => handleCategoryClick('tumbuhan')} className={`px-3 py-2 rounded-lg hover:bg-emerald-600 transition-all ${activeCategory === 'tumbuhan' ? 'bg-emerald-600 opacity-100' : 'opacity-80'}`}>Karantina Tumbuhan</button>
             <button onClick={() => handleCategoryClick('jurnal')} className={`px-3 py-2 rounded-lg hover:bg-emerald-600 transition-all font-bold text-amber-400 ${activeCategory === 'jurnal' ? 'bg-emerald-600 opacity-100' : 'opacity-80'}`}>Jurnal</button>
          </div>
          <div className="flex items-center space-x-4">
            {currentUser ? (
               <div className="flex items-center space-x-2"> 
                  <span className="text-sm font-medium">{currentUser.name}</span>
                  <button onClick={handleLogout} className="text-red-400"><LogOut size={16}/></button>
               </div>
            ) : (
                <button onClick={() => handleLogin()} className="bg-emerald-600 px-4 py-2 rounded-full text-sm font-bold">Login</button>
            )}
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-b from-[#123138] to-[#1e4a55] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-4xl font-extrabold tracking-tight">DISCOVER A WORLD OF KNOWLEDGE</h1>
            <p className="opacity-80">Repository Hasil Uji Terap & Integrasi Jurnal Global</p>
            <div className="bg-white rounded-full p-2 flex items-center shadow-2xl">
                <input 
                  type="text" 
                  placeholder="Title, Author, Or Keyword"
                  className="flex-1 bg-transparent text-slate-900 px-6 py-3 outline-none"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                <button onClick={() => setIsHome(false)} className="bg-amber-500 p-4 rounded-full hover:bg-amber-600 transition-colors"><Search /></button>
            </div>
        </div>
      </section>

       <div className="max-w-7xl mx-auto px-4 flex justify-center space-x-2 my-8">
          <button onClick={() => { setIsHome(true); setActiveCategory('all'); setSearchQuery(''); }} className={`px-6 py-2 rounded-full font-bold text-sm ${isHome ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}>All Highlights</button>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => handleCategoryClick(cat.id)} className={`px-6 py-2 rounded-full font-bold text-sm flex items-center ${!isHome && activeCategory === cat.id ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}>
                <cat.icon size={16} className="mr-2" />
                {cat.label}
            </button>
          ))}
       </div>

      <main className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-12 gap-8">
         <div className="col-span-12 lg:col-span-8 space-y-12">
            {isHome ? (
              <HomeView docs={publicDocs} onLogin={handleLogin} role={role} />
            ) : (
              role === ROLES.ADMIN ? (
                 <AdminPanel documents={documents} refresh={fetchDocuments} />
              ) : (
                 <LibraryView docs={filteredDocs} />
              )
            )}
         </div>
         <div className="hidden lg:block col-span-4 bg-white p-6 rounded-2xl border border-slate-200 h-fit sticky top-8">
             <h3 className="font-bold mb-4 flex items-center">
                <FileBadge size={18} className="mr-2 text-amber-500" />
                Trending This Week
             </h3>
             <div className="space-y-4">
                {documents.slice(0, 5).map(d => (
                    <div key={d.id} className="flex items-center space-x-4 p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer" onClick={() => { setSearchQuery(d.title); setIsHome(false); }}>
                        <div className="w-10 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-slate-400" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-bold text-[11px] truncate">{d.title}</p>
                            <p className="text-[10px] text-slate-400 truncate">{d.author}</p>
                        </div>
                    </div>
                ))}
             </div>
         </div>
      </main>
      
      <AuthModal 
        isOpen={showAuthModal.show} 
        onClose={() => setShowAuthModal({ show: false })}
        onSuccess={(user) => {
          setCurrentUser(user);
          setRole(user.role);
          localStorage.setItem('buttmkhit_session', JSON.stringify(user));
          setShowAuthModal({ show: false });
          setIsHome(false); // Move to library view on login
        }}
      />
    </div>
  );
}

function HomeView({ docs, onLogin, role }: { docs: any[], onLogin: () => void, role: string }) {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100">
          <BookOpen className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Beranda e-Library</span>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Pusat Referensi Ilmiah <br /> Karantina Indonesia
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl">
          Akses eksklusif hasil Uji Terap Teknik dan Metode Karantina Hewan, Ikan, dan Tumbuhan untuk peningkatan standar pelayanan teknis.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h3 className="font-bold text-slate-800 flex items-center text-xl">
            <Database className="w-6 h-6 mr-3 text-emerald-600" />
            Cuplikan Referensi Acak
          </h3>
          {role === 'public' && (
            <button onClick={onLogin} className="text-emerald-600 text-sm font-bold hover:underline">
              Login Selengkapnya &rarr;
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {docs.map(doc => <DocumentCard key={doc.id} doc={doc} restricted={role === 'public'} />)}
        </div>
      </div>
    </div>
  );
}

function LibraryView({ docs }: { docs: any[] }) {
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <FileBadge size={64} className="mb-4 opacity-20" />
        <p className="text-lg">Tidak ada dokumen yang ditemukan.</p>
        <p className="text-sm">Coba ubah filter atau kata kunci pencarian Anda.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {docs.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
    </div>
  );
}

function DocumentCard({ doc, restricted }: { doc: any, restricted?: boolean, key?: any }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:border-emerald-200 transition-all group flex flex-col h-full relative overflow-hidden">
      {restricted && (
        <div className="absolute top-0 right-0 p-3">
          <ShieldCheck className="w-4 h-4 text-slate-300" />
        </div>
      )}
      
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${doc.type === 'Jurnal' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
          <FileText size={24} />
        </div>
        <span className="text-[10px] font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-500 uppercase tracking-wider">{doc.tag}</span>
      </div>
      
      <div className="flex-1">
        <h4 className="font-bold text-slate-800 text-lg leading-tight mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2">
          {doc.title}
        </h4>
        <p className="text-sm text-slate-500 mb-4">{doc.author}</p>
      </div>
      
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="text-[10px] text-slate-400 font-medium">
          <span className="mr-3">{doc.date}</span>
          <span>{doc.size}</span>
        </div>
        <button 
          disabled={restricted || !doc.url}
          onClick={() => doc.url && window.open(doc.url, '_blank')}
          className={`flex items-center space-x-1 text-sm font-bold ${restricted || !doc.url ? 'text-slate-300 cursor-not-allowed' : 'text-emerald-600 hover:text-emerald-800'}`}
        >
          <span>{restricted ? 'Akses Login' : (!doc.url ? 'File Tidak Ada' : 'Download')}</span>
          <Download size={14} />
        </button>
      </div>
    </div>
  );
}

function AdminPanel({ documents, refresh }: { documents: any[], refresh: () => void }) {
  const [formData, setFormData] = useState({ title: '', author: '', tag: CATEGORIES[0].tag, type: 'Jurnal' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
        alert("Pilih file PDF terlebih dahulu");
        return;
    }
    setIsUploading(true);
    
    try {
      const data = new FormData();
      data.append('file', selectedFile);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: data
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { url, size } = await uploadRes.json();

      const newDoc = {
        ...formData,
        size,
        date: new Date().toISOString().split('T')[0],
        url
      };
      
      const saveRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });
      
      if (saveRes.ok) {
        setFormData({ title: '', author: '', tag: CATEGORIES[0].tag, type: 'Jurnal' });
        setSelectedFile(null);
        alert('Dokumen berhasil ditambahkan!');
        refresh();
      }
    } catch (error: any) {
      console.error(error);
      alert(`Gagal mengunggah: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Hapus dokumen "${title}"?`)) return;
    
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) refresh();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 pb-12">
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-xl font-bold border-b pb-4">Tambah Data Baru</h3>
          <form className="space-y-4" onSubmit={handleUpload}>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Judul Dokumen</label>
              <input 
                required
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="Ketik judul..."
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Penulis / Instansi</label>
              <input 
                required
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="Nama penulis..."
                value={formData.author}
                onChange={e => setFormData({...formData, author: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">File PDF</label>
              <input 
                type="file"
                accept=".pdf"
                required
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                onChange={e => e.target.files && setSelectedFile(e.target.files[0])}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Tag Karantina</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm appearance-none"
                  value={formData.tag}
                  onChange={e => setFormData({...formData, tag: e.target.value})}
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.tag}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Jenis File</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm appearance-none"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Jurnal">Jurnal</option>
                  <option value="Laporan Uji Terap">Laporan Uji Terap</option>
                </select>
              </div>
            </div>
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isUploading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-black transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Unggah ke Database</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="font-bold text-lg">Kelola Repositori ({documents.length})</h3>
          <Database className="text-slate-300" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b">
                <th className="px-6 py-4">Informasi Dokumen</th>
                <th className="px-6 py-4">Kategori Tag</th>
                <th className="px-6 py-4">Jenis File</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-slate-100 rounded-lg mr-4 shrink-0">
                        <FileText size={16} className="text-slate-500" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-sm truncate max-w-xs">{doc.title}</p>
                        <p className="text-xs text-slate-400">{doc.author}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded uppercase">
                      {doc.tag}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600">
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                       {doc.url && (
                         <button 
                           onClick={() => window.open(doc.url, '_blank')}
                           className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                           title="Buka File"
                         >
                           <Download size={18} />
                         </button>
                       )}
                       <button 
                         onClick={() => handleDelete(doc.id, doc.title)}
                         className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                         title="Hapus"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: (user: CustomUser) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ nip: '', name: '', password: '', confirmPassword: '', captchaInput: '' });
  const [captcha, setCaptcha] = useState({ question: '', answer: 0 });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate simple math captcha
  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ question: `${a} + ${b} = ?`, answer: a + b });
  };

  useEffect(() => {
    if (isRegister) {
      generateCaptcha();
    }
  }, [isRegister]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Client-side validations for registration
    if (isRegister) {
      if (form.password !== form.confirmPassword) {
        setError('Password tidak cocok dengan konfirmasi.');
        return;
      }
      if (parseInt(form.captchaInput) !== captcha.answer) {
        setError('Jawaban Captcha salah.');
        generateCaptcha(); // Refresh captcha on wrong answer
        return;
      }
    }

    setLoading(true);
    
    const endpoint = isRegister ? '/api/register' : '/api/login';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (res.ok) {
        if (isRegister) {
          setSuccessMsg(data.message);
          setIsRegister(false);
          setForm({ nip: '', name: '', password: '', confirmPassword: '', captchaInput: '' });
        } else {
          onSuccess(data.user);
        }
      } else {
        setError(data.message || 'Operasi gagal.');
        if (isRegister) generateCaptcha();
      }
    } catch (e: any) {
      console.error(e);
      setError('Terjadi kesalahan sistem.');
      if (isRegister) generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-xl text-slate-800">{isRegister ? 'Daftar Akun Baru' : 'Masuk ke e-Library'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center">
                <AlertCircle size={14} className="mr-2" />
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 flex items-center">
                <ShieldCheck size={14} className="mr-2" />
                {successMsg}
              </div>
            )}

            {isRegister && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Nama Lengkap</label>
                <input 
                  required
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="Masukkan nama lengkap"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">NIP / Username</label>
              <input 
                required
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="Masukkan NIP atau username"
                value={form.nip}
                onChange={e => setForm({...form, nip: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">{isRegister ? 'Buat Password' : 'Password'}</label>
              <input 
                type="password"
                required
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
              />
            </div>

            {isRegister && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">Ulangi Password</label>
                  <input 
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="Konfirmasi password"
                    value={form.confirmPassword}
                    onChange={e => setForm({...form, confirmPassword: e.target.value})}
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase">Otorisasi (Captcha)</label>
                    <span className="text-sm font-black text-emerald-600 bg-white px-2 py-1 rounded shadow-sm">{captcha.question}</span>
                  </div>
                  <input 
                    required
                    type="number"
                    className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm text-center font-bold"
                    placeholder="Jawaban?"
                    value={form.captchaInput}
                    onChange={e => setForm({...form, captchaInput: e.target.value})}
                  />
                </div>
              </>
            )}

            <div className="pt-4 space-y-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Sabar ya...' : (isRegister ? 'Daftar Sekarang' : 'Masuk')}
              </button>
              
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError('');
                    setSuccessMsg('');
                    setForm({ nip: '', name: '', password: '', confirmPassword: '', captchaInput: '' });
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest"
                >
                  {isRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Daftar di sini'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
