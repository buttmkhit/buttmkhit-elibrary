import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('database.sqlite');
const PORT = 3000;

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    tag TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    date TEXT NOT NULL,
    size TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profiles (
    nip TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    password TEXT NOT NULL
  );
`);

// Seed Admin if not exists
const adminCheck = db.prepare('SELECT * FROM profiles WHERE nip = ?').get('admin');
if (!adminCheck) {
  db.prepare('INSERT INTO profiles (nip, name, role, password) VALUES (?, ?, ?, ?)').run(
    'admin', 'Administrator', 'admin', 'admin'
  );
  db.prepare('INSERT INTO profiles (nip, name, role, password) VALUES (?, ?, ?, ?)').run(
    'humas buttmkhit', 'Humas BUTTMKHIT', 'admin', 'humas_buttmkhit'
  );
}

const app = express();
app.use(express.json());
app.use(cors());

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// API ROUTES
app.get('/api/documents', (req, res) => {
  const docs = db.prepare('SELECT * FROM documents ORDER BY createdAt DESC').all();
  res.json(docs);
});

app.post('/api/documents', (req, res) => {
  const { title, author, tag, type, url, date, size } = req.body;
  const info = db.prepare(`
    INSERT INTO documents (title, author, tag, type, url, date, size)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, author, tag, type, url, date, size);
  res.json({ id: info.lastInsertRowid });
});

app.delete('/api/documents/:id', (req, res) => {
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { nip, password } = req.body;
  const user = db.prepare('SELECT * FROM profiles WHERE nip = ? AND password = ?').get(nip, password);
  if (user) {
    res.json({ 
      success: true, 
      user: { uid: user.nip, name: user.name, role: user.role, nip: user.nip } 
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid NIP or Password' });
  }
});

app.post('/api/register', (req, res) => {
  const { nip, name, password } = req.body;
  try {
    // Check if user exists
    const existing = db.prepare('SELECT * FROM profiles WHERE nip = ?').get(nip);
    if (existing) {
      return res.status(400).json({ success: false, message: 'NIP/User sudah terdaftar.' });
    }

    db.prepare('INSERT INTO profiles (nip, name, role, password) VALUES (?, ?, ?, ?)').run(
      nip, name, 'user', password
    );
    
    res.json({ success: true, message: 'Pendaftaran berhasil! Silakan login.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mendaftar: ' + err.message });
  }
});

app.post('/api/upload', upload.single('file'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB` });
});

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start();
