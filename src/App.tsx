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
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, googleProvider, signInWithPopup, signOut, OperationType, handleFirestoreError, storage, ref, uploadBytesResumable, getDownloadURL } from './lib/firebase';

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

// --- INITIAL DUMMY DATA ---
const initialDocuments = [
  { id: '1', title: 'Pedoman Tindakan Karantina Hewan Penyakit PMK', author: 'Pusat Karantina Hewan', tag: 'Karantina Hewan', type: 'Jurnal', size: '2.4 MB', date: '2023-10-12', url: '#' },
  { id: '2', title: 'Identifikasi HPIK pada Komoditas Ekspor', author: 'Balai Karantina Ikan', tag: 'Karantina Ikan', type: 'Laporan Uji Terap', size: '5.1 MB', date: '2023-11-05', url: '#' },
  { id: '3', title: 'Analisis Risiko OPTK Buah Tropis', author: 'Badan Karantina Indonesia', tag: 'Karantina Tumbuhan', type: 'Jurnal', size: '3.8 MB', date: '2024-01-20', url: '#' },
  { id: '4', title: 'Laporan Uji Terap Perlakuan Fumigasi Fosfin', author: 'Tim Uji Terap', tag: 'Karantina Tumbuhan', type: 'Laporan Uji Terap', size: '1.2 MB', date: '2024-02-15', url: '#' },
  { id: '5', title: 'Jurnal Karantina Indonesia Vol 1', author: 'Pusat Riset Karantina', tag: 'Karantina Hewan', type: 'Jurnal', size: '8.5 MB', date: '2024-03-01', url: '#' },
  { id: '6', title: 'Metode Deteksi Virus Udang Terbaru', author: 'Laboratorium Ikan', tag: 'Karantina Ikan', type: 'Jurnal', size: '3.2 MB', date: '2024-03-10', url: '#' },
  { id: '7', title: 'Studi Kasus Invasif Spodoptera frugiperda', author: 'Bidang Tumbuhan', tag: 'Karantina Tumbuhan', type: 'Laporan Uji Terap', size: '4.7 MB', date: '2024-04-05', url: '#' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [role, setRole] = useState(ROLES.PUBLIC);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState<{show: boolean}>({ show: false });

  // Firestore Listener
  useEffect(() => {
    const q = query(collection(db, 'documents'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDocuments(docsData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error details:", error);
      handleFirestoreError(error, OperationType.LIST, 'documents');
    });
    return () => unsubscribe();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const cUser: CustomUser = {
          uid: user.uid,
          name: user.displayName || 'User',
          role: user.email === 'buttmkhithumas@gmail.com' ? ROLES.ADMIN : ROLES.USER,
          photoURL: user.photoURL || undefined
        };
        setCurrentUser(cUser);
        setRole(cUser.role);
      } else {
        if (!localStorage.getItem('buttmkhit_session')) {
          setCurrentUser(null);
          setRole(ROLES.PUBLIC);
        }
      }
    });

    const savedSession = localStorage.getItem('buttmkhit_session');
    if (savedSession) {
      const cUser = JSON.parse(savedSession);
      setCurrentUser(cUser);
      setRole(cUser.role);
    }

    return () => unsubscribe();
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

  const handleLogin = async () => {
    setShowAuthModal({ show: true });
  };
    
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('buttmkhit_session');
      setCurrentUser(null);
      setRole(ROLES.PUBLIC);
      setActiveCategory('all');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <nav className="bg-[#123138] text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <img src="https://karantinaindonesia.go.id/profile/logo-barantin.png" className="h-8 w-auto" alt="Logo" />
             <span className="font-bold text-lg">BUTTMKHIT e-Library</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
             <button onClick={() => setActiveCategory('all')} className="px-3 py-2 rounded-lg opacity-80 hover:opacity-100 hover:bg-emerald-600 transition-all italic">Home</button>
             <button onClick={() => setActiveCategory('hewan')} className="px-3 py-2 rounded-lg opacity-80 hover:opacity-100 hover:bg-emerald-600 transition-all">Karantina Hewan</button>
             <button onClick={() => setActiveCategory('ikan')} className="px-3 py-2 rounded-lg opacity-80 hover:opacity-100 hover:bg-emerald-600 transition-all">Karantina Ikan</button>
             <button onClick={() => setActiveCategory('tumbuhan')} className="px-3 py-2 rounded-lg opacity-80 hover:opacity-100 hover:bg-emerald-600 transition-all">Karantina Tumbuhan</button>
             <button onClick={() => setActiveCategory('jurnal')} className="px-3 py-2 rounded-lg opacity-80 hover:opacity-100 hover:bg-emerald-600 transition-all font-bold text-amber-400">Jurnal</button>
          </div>
          <div className="flex items-center space-x-4">
            {currentUser ? (
               <div className="flex items-center space-x-2"> 
                  <span className="text-sm font-medium">{currentUser.name}</span>
                  <button onClick={handleLogout} className="text-red-400"><LogOut size={16}/></button>
               </div>
            ) : (
                <button onClick={() => handleLogin(ROLES.USER)} className="bg-emerald-600 px-4 py-2 rounded-full text-sm font-bold">Login</button>
            )}
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-b from-[#123138] to-[#1e4a55] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-4xl font-extrabold tracking-tight">DISCOVER A WORLD OF KNOWLEDGE</h1>
            <p className="opacity-80">Repository Hasil Uji Terap & Integrasi Jurnal Global</p>
            <div className="bg-white rounded-full p-2 flex items-center">
                <input 
                  type="text" 
                  placeholder="Title, Author, Or Keyword"
                  className="flex-1 bg-transparent text-slate-900 px-6 py-3 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="bg-amber-500 p-4 rounded-full"><Search /></button>
            </div>
        </div>
      </section>

       <div className="max-w-7xl mx-auto px-4 flex justify-center space-x-2 my-8">
          <button onClick={() => setActiveCategory('all')} className={`px-6 py-2 rounded-full font-bold text-sm ${activeCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}>All</button>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-6 py-2 rounded-full font-bold text-sm flex items-center ${activeCategory === cat.id ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}>
                <cat.icon size={16} className="mr-2" />
                {cat.label}
            </button>
          ))}
       </div>

      <main className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-12 gap-8">
         <div className="col-span-8 space-y-12">
            {role === ROLES.ADMIN ? (
                 <AdminPanel documents={documents} />
              ) : role === ROLES.PUBLIC ? (
                 <PublicView docs={publicDocs} />
              ) : (
                 <LibraryView docs={filteredDocs} />
              )}
         </div>
         <div className="col-span-4 bg-white p-6 rounded-2xl border border-slate-200">
             <h3 className="font-bold mb-4">Trending This Week</h3>
             <div className="space-y-4">
                {documents.slice(0, 3).map(d => (
                    <div key={d.id} className="flex items-center space-x-4 p-2 bg-slate-50 rounded-lg">
                        <div className="w-12 h-16 bg-slate-200 rounded"></div>
                        <div>
                            <p className="font-bold text-xs">{d.title}</p>
                            <p className="text-[10px] text-slate-500">{d.author}</p>
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
        }}
      />
    </div>
  );
}


interface SidebarItemProps {
  key?: React.Key;
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  badge?: number;
  highlight?: 'emerald' | 'amber' | 'red' | 'none';
}

function SidebarItem({ icon: Icon, label, active, onClick, collapsed, badge, highlight }: SidebarItemProps) {
  const highlightClasses = {
    emerald: 'text-emerald-400 hover:bg-emerald-500/10',
    amber: 'text-amber-400 hover:bg-amber-500/10',
    red: 'text-red-400 hover:bg-red-500/10',
    none: 'text-slate-300 hover:bg-slate-800'
  };

  const currentHighlight = highlight ? highlightClasses[highlight] : (active ? 'bg-emerald-600 text-white' : highlightClasses.none);

  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 rounded-xl transition-all group ${currentHighlight}`}
      title={collapsed ? label : ''}
    >
      <Icon className={`${collapsed ? 'mx-auto' : 'mr-3'} w-5 h-5 shrink-0 transition-transform group-hover:scale-110`} />
      {!collapsed && (
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-sm">{label}</span>
          {badge !== undefined && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-800'}`}>{badge}</span>
          )}
        </div>
      )}
    </button>
  );
}

interface PublicViewProps {
  docs: any[];
  onLogin: () => void;
}

function PublicView({ docs, onLogin }: PublicViewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100 mb-4">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Akses Terbatas</span>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Selamat Datang di BUTTMKHIT e-Library</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Silakan login untuk mengakses ribuan jurnal ilmiah dan laporan uji terap hasil Balai Uji Terap Teknik dan Metode Karantina Hewan, Ikan dan Tumbuhan secara lengkap.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-bold text-slate-800 flex items-center">
            <Database className="w-5 h-5 mr-2 text-emerald-600" />
            Cuplikan Referensi Acak
          </h3>
          <span className="text-xs text-slate-400">Menampilkan 3 dari {initialDocuments.length}+ dokumen</span>
        </div>
        
        <div className="grid gap-4">
          {docs.map(doc => <DocumentCard key={doc.id} doc={doc} restricted />)}
        </div>
      </div>
    </div>
  );
}

interface LibraryViewProps {
  docs: any[];
}

function LibraryView({ docs }: LibraryViewProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {docs.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
    </div>
  );
}

interface DocumentCardProps {
  key?: React.Key;
  doc: any;
  restricted?: boolean;
}

function DocumentCard({ doc, restricted }: DocumentCardProps) {
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

function AdminPanel({ documents }: { documents: any[] }) {
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
    console.log("Starting upload process for file:", selectedFile.name);
    try {
      const storagePath = `documents/${Date.now()}_${selectedFile.name}`;
      console.log("Storage path:", storagePath);
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);
      
      console.log("Upload task started...");
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
          }, 
          (error) => {
            console.error("Upload task error detail:", error);
            reject(error);
          },
          () => {
            console.log("Upload task completed successfully");
            resolve(null);
          }
        );
      });
      
      console.log("Getting download URL...");
      const downloadURL = await getDownloadURL(storageRef);
      console.log("Download URL obtained:", downloadURL);

      const newDoc = {
        title: formData.title,
        author: formData.author,
        tag: formData.tag,
        type: formData.type,
        size: (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB',
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ownerId: auth.currentUser?.uid || 'custom-admin',
        url: downloadURL
      };
      
      console.log("Adding document to Firestore:", newDoc);
      const colRef = collection(db, 'documents');
      const docRef = await addDoc(colRef, newDoc);
      console.log("Document added with ID:", docRef.id);
      
      setFormData({ title: '', author: '', tag: CATEGORIES[0].tag, type: 'Jurnal' });
      setSelectedFile(null);
      alert('Dokumen berhasil ditambahkan!');
    } catch (error: any) {
      console.error("Critical error during upload/creation:", error);
      alert(`Gagal mengunggah: ${error.message || 'Terjadi kesalahan sistem'}`);
      // handleFirestoreError(error, OperationType.CREATE, 'documents'); // Prevent throwing to avoid breaking state
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Hapus dokumen "${title}"?`)) return;
    
    try {
      const docRef = doc(db, 'documents', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
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

// --- NEW AUTH MODAL ---
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: CustomUser) => void;
}

function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({ nip: '', name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        onSuccess({
          uid: res.user.uid,
          name: res.user.displayName || 'Google User',
          role: res.user.email === 'buttmkhithumas@gmail.com' ? ROLES.ADMIN : ROLES.USER,
          photoURL: res.user.photoURL || undefined
        });
      }
    } catch (e: any) {
      console.error("Google Login Error:", e);
      setError(`Login Google gagal: ${e.message || e.code || 'Terjadi kesalahan'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Check for Admin
      if (form.nip === 'admin' && form.password === 'admin') {
          onSuccess({
            uid: `admin-local`,
            name: `Administrator`,
            role: ROLES.ADMIN
          });
          return;
      }
      
      // 2. Check for User (NIP)
      if (isRegistering) {
        const userRef = doc(db, 'profiles', form.nip);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setError('NIP sudah terdaftar.');
        } else {
          await setDoc(userRef, {
            nip: form.nip,
            name: form.name,
            password: form.password,
            role: ROLES.USER,
            authMethod: 'custom',
            createdAt: serverTimestamp()
          });
          onSuccess({
            uid: `nip-${form.nip}`,
            name: form.name,
            nip: form.nip,
            role: ROLES.USER
          });
        }
      } else {
        const userRef = doc(db, 'profiles', form.nip);
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data().password === form.password) {
          onSuccess({
            uid: `nip-${form.nip}`,
            name: snap.data().name,
            nip: form.nip,
            role: ROLES.USER
          });
        } else {
          setError('NIP atau Password salah.');
        }
      }
    } catch (e: any) {
      console.error(e);
      setError('Terjadi kesalahan sistem.');
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
          <h3 className="font-bold text-xl text-slate-800">
            {isRegistering ? 'Daftar Akun' : 'Login'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {!isRegistering && (
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-medium text-slate-700"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              <span>Lanjut dengan Google</span>
            </button>
          )}

          {!isRegistering && (
            <div className="flex items-center space-x-4">
              <div className="h-[1px] flex-1 bg-slate-100"></div>
              <span className="text-xs text-slate-400 font-bold uppercase">Atau NIP</span>
              <div className="h-[1px] flex-1 bg-slate-100"></div>
            </div>
          )}

          <form onSubmit={handleCustomLogin} className="space-y-4">
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
            {isRegistering && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Nama Lengkap</label>
                <input 
                  required
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="Nama Sesuai Identitas"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Password</label>
              <input 
                required
                type="password"
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
              />
            </div>

            {error && <p className="text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded-lg">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 text-white"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>{isRegistering ? 'Daftar Sekarang' : 'Masuk Sistem'}</span>}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            {isRegistering ? 'Sudah punya akun?' : 'Belum punya akses?'} {' '}
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-emerald-600 font-bold hover:underline"
            >
              {isRegistering ? 'Login' : 'Daftar sekarang'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

