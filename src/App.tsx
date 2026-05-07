import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, Download, Upload, FileText, Database, Trash2, ShieldCheck,
  FileBadge, AlertCircle, X, Dog, Fish, Leaf, LogOut, BookOpen,
  ChevronDown, Filter, SortAsc, Eye, RefreshCw, CheckCircle, Menu,
  ExternalLink, TrendingUp, Users, BarChart2, Edit3, Save, XCircle,
  Star, ChevronRight, ArrowUpDown, BookMarked, Globe, Award, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, type Document, type Profile, type DocumentTag, type DocumentType } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const CATEGORIES: { id: string; label: string; icon: React.ElementType; tag: DocumentTag }[] = [
  { id: 'hewan', label: 'Karantina Hewan', icon: Dog, tag: 'Karantina Hewan' },
  { id: 'ikan', label: 'Karantina Ikan', icon: Fish, tag: 'Karantina Ikan' },
  { id: 'tumbuhan', label: 'Karantina Tumbuhan', icon: Leaf, tag: 'Karantina Tumbuhan' },
];

const TAG_COLORS: Record<DocumentTag, string> = {
  'Karantina Hewan': 'bg-amber-50 text-amber-700 border-amber-200',
  'Karantina Ikan': 'bg-blue-50 text-blue-700 border-blue-200',
  'Karantina Tumbuhan': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const TYPE_COLORS: Record<DocumentType, string> = {
  'Jurnal': 'bg-violet-50 text-violet-700',
  'Laporan Uji Terap': 'bg-sky-50 text-sky-700',
};

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────

async function uploadFileToStorage(file: File): Promise<{ url: string; storagePath: string; size: string }> {
  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = `documents/${fileName}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('documents').getPublicUrl(storagePath);
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  return { url: data.publicUrl, storagePath, size: `${sizeMB} MB` };
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [view, setView] = useState<'home' | 'library' | 'admin'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'downloads' | 'title'>('newest');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const notify = useCallback((type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load profile when session changes
  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      setProfile(data as Profile | null);
    })();
  }, [session]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (!error && data) setDocuments(data as Document[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const isAdmin = profile?.role === 'admin';

  const goHome = () => { setView('home'); setActiveCategory('all'); setSearchQuery(''); setMobileMenuOpen(false); };
  const goCategory = (id: string) => { setActiveCategory(id); setView('library'); setMobileMenuOpen(false); };
  const goAdmin = () => { setView('admin'); setMobileMenuOpen(false); };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setView('home');
    setActiveCategory('all');
    notify('success', 'Berhasil keluar dari sistem.');
  };

  const filteredDocs = useMemo(() => {
    let result = documents.filter(doc => {
      const matchSearch = !searchQuery ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = activeCategory === 'all' || CATEGORIES.find(c => c.id === activeCategory)?.tag === doc.tag;
      const matchType = filterType === 'all' || doc.type === filterType;
      return matchSearch && matchCat && matchType;
    });

    switch (sortBy) {
      case 'newest': result = [...result].sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case 'oldest': result = [...result].sort((a, b) => a.created_at.localeCompare(b.created_at)); break;
      case 'downloads': result = [...result].sort((a, b) => b.download_count - a.download_count); break;
      case 'title': result = [...result].sort((a, b) => a.title.localeCompare(b.title)); break;
    }
    return result;
  }, [documents, searchQuery, activeCategory, filterType, sortBy]);

  const featuredDocs = useMemo(() =>
    [...documents].sort((a, b) => b.download_count - a.download_count).slice(0, 4),
    [documents]
  );

  const stats = useMemo(() => ({
    total: documents.length,
    hewan: documents.filter(d => d.tag === 'Karantina Hewan').length,
    ikan: documents.filter(d => d.tag === 'Karantina Ikan').length,
    tumbuhan: documents.filter(d => d.tag === 'Karantina Tumbuhan').length,
    jurnal: documents.filter(d => d.type === 'Jurnal').length,
    laporan: documents.filter(d => d.type === 'Laporan Uji Terap').length,
    downloads: documents.reduce((s, d) => s + d.download_count, 0),
  }), [documents]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">

      {/* Toast notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-[200] flex items-center space-x-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
              ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
          >
            {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{notification.msg}</span>
            <button onClick={() => setNotification(null)}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <header className="bg-[#0d2b34] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button onClick={goHome} className="flex items-center space-x-3 shrink-0">
              <img src="https://karantinaindonesia.go.id/profile/logo-barantin.png" className="h-8 w-auto" alt="Logo BUTTMKHIT" />
              <div className="hidden sm:block leading-tight">
                <div className="text-sm font-bold">BUTTMKHIT</div>
                <div className="text-[10px] text-slate-400">e-Library System</div>
              </div>
            </button>

            <nav className="hidden lg:flex items-center space-x-1 text-sm">
              <NavBtn active={view === 'home'} onClick={goHome}>Home</NavBtn>
              {CATEGORIES.map(cat => (
                <NavBtn key={cat.id} active={view === 'library' && activeCategory === cat.id} onClick={() => goCategory(cat.id)}>
                  {cat.label}
                </NavBtn>
              ))}
              <NavBtn active={view === 'library' && activeCategory === 'all'} onClick={() => { setActiveCategory('all'); setView('library'); }} className="font-bold text-amber-400">
                Semua Koleksi
              </NavBtn>
              {isAdmin && (
                <NavBtn active={view === 'admin'} onClick={goAdmin} className="text-rose-400">
                  Admin Panel
                </NavBtn>
              )}
            </nav>

            <div className="flex items-center space-x-3">
              {session && profile ? (
                <div className="flex items-center space-x-2">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold">{profile.name}</span>
                    <span className={`text-[10px] ${profile.role === 'admin' ? 'text-amber-400' : 'text-slate-400'}`}>
                      {profile.role === 'admin' ? 'Administrator' : 'Member'}
                    </span>
                  </div>
                  <button onClick={handleLogout} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Keluar">
                    <LogOut size={16} className="text-red-400" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAuthModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                  Masuk
                </button>
              )}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 hover:bg-slate-700 rounded-lg">
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="lg:hidden overflow-hidden border-t border-slate-700">
                <div className="py-3 space-y-1">
                  <MobileNavBtn onClick={goHome}>Home</MobileNavBtn>
                  {CATEGORIES.map(cat => <MobileNavBtn key={cat.id} onClick={() => goCategory(cat.id)}>{cat.label}</MobileNavBtn>)}
                  <MobileNavBtn onClick={() => { setActiveCategory('all'); setView('library'); setMobileMenuOpen(false); }}>Semua Koleksi</MobileNavBtn>
                  {isAdmin && <MobileNavBtn onClick={goAdmin} className="text-amber-400">Admin Panel</MobileNavBtn>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-[#0d2b34] via-[#1a4a55] to-[#0d3a2e] text-white py-14 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide">
            <Globe size={12} />
            <span>Repository Ilmiah Karantina Indonesia</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15]">
            Temukan Referensi <br className="hidden sm:block" />
            <span className="text-emerald-400">Karantina Terpercaya</span>
          </h1>
          <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base">
            Akses jurnal ilmiah dan laporan uji terap Balai Uji Terap Teknik dan Metode Karantina Hewan, Ikan, dan Tumbuhan.
          </p>
          <div className="bg-white rounded-2xl shadow-2xl flex items-center overflow-hidden max-w-2xl mx-auto">
            <div className="pl-5 text-slate-400 shrink-0"><Search size={20} /></div>
            <input type="text" placeholder="Cari judul, penulis, atau kata kunci..."
              className="flex-1 text-slate-800 px-4 py-4 outline-none text-sm placeholder-slate-400"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (e.target.value) { setView('library'); setActiveCategory('all'); } }}
              onKeyDown={e => { if (e.key === 'Enter' && searchQuery) { setView('library'); setActiveCategory('all'); } }} />
            <button onClick={() => { if (searchQuery) { setView('library'); setActiveCategory('all'); } }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 font-bold text-sm transition-colors shrink-0">
              Cari
            </button>
          </div>
          <div className="flex items-center justify-center flex-wrap gap-6 text-sm text-slate-300">
            <StatPill icon={BookOpen} label={`${stats.total} Dokumen`} />
            <StatPill icon={Download} label={`${stats.downloads} Unduhan`} />
            <StatPill icon={Award} label="Open Access" />
          </div>
        </div>
      </section>

      {/* ── CATEGORY TABS ── */}
      <div className="bg-white border-b border-slate-100 sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <div className="flex items-center space-x-1 py-2 min-w-max">
            <TabBtn active={view === 'home'} onClick={goHome}>Beranda</TabBtn>
            {CATEGORIES.map(cat => (
              <TabBtn key={cat.id} active={view === 'library' && activeCategory === cat.id} onClick={() => goCategory(cat.id)}>
                <cat.icon size={14} className="mr-1.5" />
                {cat.label}
              </TabBtn>
            ))}
            <TabBtn active={view === 'library' && activeCategory === 'all'} onClick={() => { setActiveCategory('all'); setView('library'); }}>
              Semua
            </TabBtn>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8">
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <HomeView stats={stats} featuredDocs={featuredDocs} allDocs={documents}
                  isLoggedIn={!!session} onLogin={() => setShowAuthModal(true)}
                  onBrowse={() => { setActiveCategory('all'); setView('library'); }}
                  onCategoryClick={goCategory} notify={notify} />
              </motion.div>
            )}
            {view === 'library' && (
              <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <LibraryView docs={filteredDocs} loading={loading} activeCategory={activeCategory}
                  sortBy={sortBy} setSortBy={setSortBy} filterType={filterType}
                  setFilterType={setFilterType} totalCount={documents.length} notify={notify} />
              </motion.div>
            )}
            {view === 'admin' && isAdmin && (
              <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AdminPanel documents={documents} stats={stats} refresh={fetchDocuments}
                  notify={notify} userId={session!.user.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="hidden lg:block col-span-4 space-y-6">
          <SidebarCard title="Paling Banyak Diunduh" icon={TrendingUp}>
            <div className="space-y-3">
              {[...documents].sort((a, b) => b.download_count - a.download_count).slice(0, 6).map((doc, i) => (
                <button key={doc.id}
                  onClick={() => { setSearchQuery(doc.title); setView('library'); setActiveCategory('all'); }}
                  className="w-full flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-xl transition-colors text-left group">
                  <span className="text-[11px] font-black text-slate-300 w-4 shrink-0">{i + 1}</span>
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-slate-400" />
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="font-semibold text-[11px] truncate text-slate-700 group-hover:text-emerald-700">{doc.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{doc.author}</p>
                  </div>
                  <span className="text-[10px] text-slate-300 shrink-0">{doc.download_count}</span>
                </button>
              ))}
              {documents.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Belum ada dokumen.</p>}
            </div>
          </SidebarCard>

          <SidebarCard title="Koleksi Kategori" icon={BarChart2}>
            <div className="space-y-3">
              {CATEGORIES.map(cat => {
                const count = documents.filter(d => d.tag === cat.tag).length;
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <button key={cat.id} onClick={() => goCategory(cat.id)} className="w-full group">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-600 flex items-center">
                        <cat.icon size={12} className="mr-1.5 text-slate-400" />{cat.label}
                      </span>
                      <span className="text-slate-400">{count} dok</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all group-hover:bg-emerald-600" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </SidebarCard>

          <SidebarCard title="Tautan Terkait" icon={Globe}>
            <div className="space-y-1.5 text-xs">
              {[
                { label: 'Karantina Indonesia', url: 'https://karantinaindonesia.go.id' },
                { label: 'EPPO Global Database', url: 'https://gd.eppo.int' },
                { label: 'CABI Digital Library', url: 'https://www.cabidigitallibrary.org' },
                { label: 'MDPI Open Access', url: 'https://www.mdpi.com' },
              ].map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-emerald-700 transition-colors group">
                  <span className="font-medium">{link.label}</span>
                  <ExternalLink size={11} className="text-slate-300 group-hover:text-emerald-500" />
                </a>
              ))}
            </div>
          </SidebarCard>
        </aside>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0d2b34] text-slate-400 mt-12 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src="https://karantinaindonesia.go.id/profile/logo-barantin.png" className="h-8 w-auto opacity-80" alt="Logo" />
                <div>
                  <p className="text-white font-bold text-sm">BUTTMKHIT</p>
                  <p className="text-[10px]">e-Library System</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed">Balai Uji Terap Teknik dan Metode Karantina Hewan, Ikan, dan Tumbuhan. Pusat referensi ilmiah karantina Indonesia.</p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Koleksi</p>
              <div className="space-y-2 text-xs">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => goCategory(c.id)} className="block hover:text-emerald-400 transition-colors">{c.label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Statistik</p>
              <div className="space-y-1 text-xs">
                <p>{stats.total} Total Dokumen</p>
                <p>{stats.jurnal} Jurnal Ilmiah</p>
                <p>{stats.laporan} Laporan Uji Terap</p>
                <p>{stats.downloads} Total Unduhan</p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs gap-2">
            <p>&copy; {new Date().getFullYear()} BUTTMKHIT e-Library. Hak Cipta Dilindungi.</p>
            <p>Karantina Indonesia — Melindungi Alam Nusantara</p>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={(prof) => {
              setProfile(prof);
              setShowAuthModal(false);
              setView('library');
              notify('success', `Selamat datang, ${prof.name}!`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────

function NavBtn({ active, onClick, children, className = '' }: {
  active: boolean; onClick: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm transition-colors ${className}
        ${active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
      {children}
    </button>
  );
}

function MobileNavBtn({ onClick, children, className = '' }: {
  onClick: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button onClick={onClick}
      className={`block w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors ${className}`}>
      {children}
    </button>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap
        ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
      {children}
    </button>
  );
}

function StatPill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center space-x-1.5">
      <Icon size={13} className="text-emerald-400" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

function SidebarCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <h3 className="font-bold text-sm mb-4 flex items-center text-slate-700">
        <Icon size={15} className="mr-2 text-emerald-600" />{title}
      </h3>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-extrabold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center py-20 text-slate-400">
      <FileBadge size={56} className="mb-4 opacity-20" />
      <p className="text-base font-semibold">Tidak ada dokumen</p>
      <p className="text-sm text-center max-w-xs mt-1">{message}</p>
    </div>
  );
}

// ─── HOME VIEW ───────────────────────────────────────────────────────────────

function HomeView({ stats, featuredDocs, allDocs, isLoggedIn, onLogin, onBrowse, onCategoryClick, notify }: {
  stats: any; featuredDocs: Document[]; allDocs: Document[];
  isLoggedIn: boolean; onLogin: () => void; onBrowse: () => void;
  onCategoryClick: (id: string) => void; notify: (t: 'success' | 'error', m: string) => void;
}) {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Dokumen', value: stats.total, icon: BookMarked, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Jurnal Ilmiah', value: stats.jurnal, icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
          { label: 'Laporan Uji Terap', value: stats.laporan, icon: FileText, color: 'text-amber-600 bg-amber-50' },
          { label: 'Total Unduhan', value: stats.downloads, icon: Download, color: 'text-rose-600 bg-rose-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon size={18} />
            </div>
            <div className="text-2xl font-extrabold text-slate-800">{s.value.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <SectionHeader title="Jelajahi Koleksi" subtitle="Temukan dokumen berdasarkan bidang karantina" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CATEGORIES.map(cat => {
            const count = allDocs.filter(d => d.tag === cat.tag).length;
            return (
              <button key={cat.id} onClick={() => onCategoryClick(cat.id)}
                className="group bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-lg hover:border-emerald-200 transition-all text-left">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                  <cat.icon size={24} className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">{cat.label}</h3>
                <p className="text-xs text-slate-400">{count} dokumen tersedia</p>
                <div className="mt-4 flex items-center text-emerald-600 text-xs font-semibold">
                  <span>Lihat koleksi</span>
                  <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-5">
          <SectionHeader title="Dokumen Unggulan" subtitle="Paling banyak diakses oleh peneliti" />
          <button onClick={onBrowse} className="text-xs font-bold text-emerald-600 hover:underline flex items-center shrink-0">
            Lihat semua <ChevronRight size={14} className="ml-0.5" />
          </button>
        </div>
        {featuredDocs.length === 0 ? (
          <EmptyState message="Belum ada dokumen. Admin dapat mulai mengunggah dari panel admin." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {featuredDocs.map(doc => <DocumentCard key={doc.id} doc={doc} notify={notify} />)}
          </div>
        )}
      </div>

      {!isLoggedIn && (
        <div className="bg-gradient-to-r from-[#0d2b34] to-[#1a4a55] rounded-2xl p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-extrabold mb-2">Akses Koleksi Lengkap</h3>
            <p className="text-slate-300 text-sm">Daftarkan diri untuk mengunduh dokumen dan mengakses seluruh repositori ilmiah.</p>
          </div>
          <button onClick={onLogin}
            className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-colors shadow-lg">
            Masuk / Daftar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── LIBRARY VIEW ─────────────────────────────────────────────────────────────

function LibraryView({ docs, loading, activeCategory, sortBy, setSortBy, filterType, setFilterType, totalCount, notify }: {
  docs: Document[]; loading: boolean; activeCategory: string;
  sortBy: string; setSortBy: (v: any) => void;
  filterType: string; setFilterType: (v: any) => void;
  totalCount: number; notify: (t: 'success' | 'error', m: string) => void;
}) {
  const categoryLabel = CATEGORIES.find(c => c.id === activeCategory)?.label || 'Semua Koleksi';

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">{categoryLabel}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{docs.length} dari {totalCount} dokumen</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none">
            <option value="all">Semua Jenis</option>
            <option value="Jurnal">Jurnal</option>
            <option value="Laporan Uji Terap">Laporan Uji Terap</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none">
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="downloads">Terpopuler</option>
            <option value="title">A-Z Judul</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState message="Tidak ada dokumen yang sesuai dengan filter atau pencarian Anda." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {docs.map(doc => <DocumentCard key={doc.id} doc={doc} notify={notify} />)}
        </div>
      )}
    </div>
  );
}

// ─── DOCUMENT CARD ───────────────────────────────────────────────────────────

function DocumentCard({ doc, notify }: { doc: Document; notify: (t: 'success' | 'error', m: string) => void }) {
  const handleDownload = async () => {
    if (!doc.url) { notify('error', 'File tidak tersedia.'); return; }
    await supabase.rpc('increment_download_count', { doc_id: doc.id });
    window.open(doc.url, '_blank');
    notify('success', 'Membuka dokumen...');
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:border-emerald-200 transition-all group flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${TYPE_COLORS[doc.type]}`}>
          <FileText size={20} />
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${TAG_COLORS[doc.tag]}`}>
          {doc.tag}
        </span>
      </div>
      <div className="flex-1 space-y-1 mb-4">
        <h4 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-emerald-700 transition-colors line-clamp-3">
          {doc.title}
        </h4>
        <p className="text-xs text-slate-500">{doc.author}</p>
      </div>
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3 text-[10px] text-slate-400">
          <span className="flex items-center"><Clock size={10} className="mr-1" />{doc.date}</span>
          <span className="flex items-center"><Download size={10} className="mr-1" />{doc.download_count}</span>
          {doc.size && <span>{doc.size}</span>}
        </div>
        <button disabled={!doc.url} onClick={handleDownload}
          className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all
            ${doc.url ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}>
          <Download size={12} />
          <span>{doc.url ? 'Unduh' : 'N/A'}</span>
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="w-10 h-10 bg-slate-100 rounded-xl" />
        <div className="w-24 h-6 bg-slate-100 rounded-full" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
      <div className="h-8 bg-slate-100 rounded" />
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────

function AdminPanel({ documents, stats, refresh, notify, userId }: {
  documents: Document[]; stats: any; refresh: () => void;
  notify: (t: 'success' | 'error', m: string) => void; userId: string;
}) {
  const [form, setForm] = useState({ title: '', author: '', tag: CATEGORIES[0].tag as DocumentTag, type: 'Jurnal' as DocumentType });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.author.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { notify('error', 'Pilih file PDF terlebih dahulu.'); return; }
    setUploading(true);
    try {
      const { url, storagePath, size } = await uploadFileToStorage(file);
      const { error } = await supabase.from('documents').insert({
        ...form, url, storage_path: storagePath, size,
        date: new Date().toISOString().split('T')[0], created_by: userId,
      });
      if (error) throw error;
      setForm({ title: '', author: '', tag: CATEGORIES[0].tag, type: 'Jurnal' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      notify('success', 'Dokumen berhasil diunggah!');
      refresh();
    } catch (err: any) {
      notify('error', `Gagal: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`Hapus "${doc.title}"?`)) return;
    try {
      if (doc.storage_path) await supabase.storage.from('documents').remove([doc.storage_path]);
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;
      notify('success', 'Dokumen dihapus.');
      refresh();
    } catch (err: any) {
      notify('error', `Gagal: ${err.message}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!editDoc) return;
    const { error } = await supabase.from('documents').update({
      title: editDoc.title, author: editDoc.author, tag: editDoc.tag, type: editDoc.type,
    }).eq('id', editDoc.id);
    if (error) { notify('error', 'Gagal menyimpan.'); return; }
    setEditDoc(null);
    notify('success', 'Dokumen diperbarui.');
    refresh();
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Dokumen', value: stats.total, color: 'text-slate-700' },
          { label: 'Jurnal', value: stats.jurnal, color: 'text-blue-700' },
          { label: 'Laporan', value: stats.laporan, color: 'text-amber-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
            <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Upload size={16} className="text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-800">Tambah Dokumen Baru</h3>
        </div>
        <form onSubmit={handleUpload} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Judul Dokumen *</label>
              <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Judul lengkap dokumen..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Penulis / Instansi *</label>
              <input required value={form.author} onChange={e => setForm({ ...form, author: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Nama penulis atau instansi..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Kategori *</label>
              <select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value as DocumentTag })}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                {CATEGORIES.map(c => <option key={c.id} value={c.tag}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Jenis Dokumen *</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as DocumentType })}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="Jurnal">Jurnal</option>
                <option value="Laporan Uji Terap">Laporan Uji Terap</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">File PDF *</label>
              <input ref={fileRef} type="file" accept=".pdf,.PDF" required
                onChange={e => e.target.files && setFile(e.target.files[0])}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 file:text-xs file:font-semibold" />
              {file && <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB dipilih</p>}
            </div>
          </div>
          <button type="submit" disabled={uploading}
            className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-colors disabled:opacity-50">
            {uploading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Mengunggah...</span></>
              : <><Upload size={16} /><span>Unggah ke Repositori</span></>}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center">
            <Database size={16} className="mr-2 text-slate-400" />
            Kelola Repositori ({filteredDocs.length})
          </h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari dokumen..."
              className="pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none w-48" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 text-left">Dokumen</th>
                <th className="px-5 py-3 text-left">Kategori</th>
                <th className="px-5 py-3 text-left">Jenis</th>
                <th className="px-5 py-3 text-right">Unduhan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDocs.map(doc => (
                editDoc?.id === doc.id ? (
                  <tr key={doc.id} className="bg-emerald-50">
                    <td className="px-5 py-3" colSpan={3}>
                      <div className="space-y-2">
                        <input value={editDoc.title} onChange={e => setEditDoc({ ...editDoc, title: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-emerald-200 rounded-lg bg-white outline-none" />
                        <input value={editDoc.author} onChange={e => setEditDoc({ ...editDoc, author: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-emerald-200 rounded-lg bg-white outline-none" />
                        <div className="flex gap-2">
                          <select value={editDoc.tag} onChange={e => setEditDoc({ ...editDoc, tag: e.target.value as DocumentTag })}
                            className="text-xs border border-emerald-200 rounded-lg px-2 py-1.5 bg-white">
                            {CATEGORIES.map(c => <option key={c.id} value={c.tag}>{c.label}</option>)}
                          </select>
                          <select value={editDoc.type} onChange={e => setEditDoc({ ...editDoc, type: e.target.value as DocumentType })}
                            className="text-xs border border-emerald-200 rounded-lg px-2 py-1.5 bg-white">
                            <option value="Jurnal">Jurnal</option>
                            <option value="Laporan Uji Terap">Laporan Uji Terap</option>
                          </select>
                        </div>
                      </div>
                    </td>
                    <td />
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={handleSaveEdit} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg" title="Simpan"><Save size={15} /></button>
                        <button onClick={() => setEditDoc(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg" title="Batal"><XCircle size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText size={14} className="text-slate-400" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{doc.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{doc.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TAG_COLORS[doc.tag]}`}>{doc.tag}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${TYPE_COLORS[doc.type]}`}>{doc.type}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs text-slate-400">{doc.download_count}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Buka file">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button onClick={() => setEditDoc(doc)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(doc)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Hapus">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
          {filteredDocs.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">Belum ada dokumen di repositori.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AUTH MODAL ──────────────────────────────────────────────────────────────

function AuthModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: (profile: Profile) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ nip: '', name: '', password: '', confirmPassword: '', captcha: '' });
  const [captcha, setCaptcha] = useState({ q: '', a: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const genCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ q: `${a} + ${b} = ?`, a: a + b });
  };

  useEffect(() => { if (mode === 'register') genCaptcha(); }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (mode === 'register') {
      if (form.password !== form.confirmPassword) { setError('Password tidak cocok.'); return; }
      if (form.password.length < 6) { setError('Password minimal 6 karakter.'); return; }
      if (parseInt(form.captcha) !== captcha.a) { setError('Jawaban captcha salah.'); genCaptcha(); return; }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: `${form.nip.replace(/\s+/g, '_')}@buttmkhit.local`,
          password: form.password,
          options: { data: { name: form.name, nip: form.nip, role: 'user' } },
        });
        if (signUpErr) throw signUpErr;
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id, name: form.name, nip: form.nip, role: 'user',
          }, { onConflict: 'id' });
          setSuccess('Pendaftaran berhasil! Silakan login.');
          setMode('login');
          setForm({ nip: '', name: '', password: '', confirmPassword: '', captcha: '' });
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: `${form.nip.replace(/\s+/g, '_')}@buttmkhit.local`,
          password: form.password,
        });
        if (signInErr) throw new Error('NIP atau password salah.');
        if (data.user) {
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
          if (prof) onSuccess(prof as Profile);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
      if (mode === 'register') genCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-[#0d2b34] to-[#1a4a55] p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
          <img src="https://karantinaindonesia.go.id/profile/logo-barantin.png" className="h-8 w-auto mb-3 opacity-90" alt="Logo" />
          <h3 className="text-xl font-extrabold">{mode === 'login' ? 'Masuk ke e-Library' : 'Buat Akun Baru'}</h3>
          <p className="text-slate-300 text-xs mt-1">BUTTMKHIT Repository Ilmiah Karantina Indonesia</p>
        </div>

        <div className="p-7">
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all
                  ${mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {m === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100 mb-4">
              <AlertCircle size={14} className="shrink-0" /><span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-100 mb-4">
              <CheckCircle size={14} className="shrink-0" /><span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nama Lengkap</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Masukkan nama lengkap" />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">NIP / Username</label>
              <input required value={form.nip} onChange={e => setForm({ ...form, nip: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="NIP atau username Anda" autoComplete="username" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Password</label>
              <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={mode === 'register' ? 'Min. 6 karakter' : 'Kata sandi Anda'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Konfirmasi Password</label>
                  <input required type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ulangi password" autoComplete="new-password" />
                </div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase">Verifikasi Captcha</label>
                    <span className="text-base font-black text-emerald-700 bg-white px-3 py-1 rounded-lg border border-emerald-100">{captcha.q}</span>
                  </div>
                  <input required type="number" value={form.captcha} onChange={e => setForm({ ...form, captcha: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white rounded-xl text-sm text-center font-bold outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-200"
                    placeholder="Jawaban..." />
                </div>
              </>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 mt-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Memproses...</span></>
                : <span>{mode === 'login' ? 'Masuk ke e-Library' : 'Buat Akun'}</span>}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-5">
            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
              className="text-emerald-600 font-bold hover:underline">
              {mode === 'login' ? 'Daftar sekarang' : 'Masuk di sini'}
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
