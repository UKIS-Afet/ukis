import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import { db } from "./src/db/index.ts";
import { containers, products, requests, reports, donations, issues, chatSessions as chatSessionsTable, chatMessages as chatMessagesTable } from "./src/db/schema.ts";
import { eq, desc } from "drizzle-orm";

const SEED_PRODUCTS = [
  { id: "ekmek", name: "Ekmek", unit: "Adet", mainCategory: "Gıda", category: "Temel Gıda", icon: "Wheat", imageUrl: "https://i.hizliresim.com/tcfplkl.jpg", maxPerAdult: 2, maxPerChild: 1, maxPerBaby: 0, cooldownHours: 24 },
  { id: "aycicek-yagi", name: "Ayçiçek Yağı", unit: "Şişe", mainCategory: "Gıda", category: "Temel Gıda", icon: "Droplets", imageUrl: "https://i.hizliresim.com/tij4poz.jpeg", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 168 },
  { id: "cay", name: "Çay", unit: "Paket", mainCategory: "Gıda", category: "Temel Gıda", icon: "Coffee", imageUrl: "https://i.hizliresim.com/h2n88i9.jpeg", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 168 },
  { id: "makarna", name: "Makarna", unit: "Paket", mainCategory: "Gıda", category: "Temel Gıda", icon: "Wheat", imageUrl: "https://i.hizliresim.com/hv0inma.jpeg", maxPerAdult: 3, maxPerChild: 2, maxPerBaby: 0, cooldownHours: 168 },
  { id: "bulgur", name: "Bulgur", unit: "Paket", mainCategory: "Gıda", category: "Temel Gıda", icon: "Wheat", imageUrl: "https://i.hizliresim.com/jiv86df.jpeg", maxPerAdult: 2, maxPerChild: 1, maxPerBaby: 0, cooldownHours: 168 },
  { id: "zeytin", name: "Zeytin", unit: "Kutu", mainCategory: "Gıda", category: "Temel Gıda", icon: "Circle", imageUrl: "https://i.hizliresim.com/4ifikzb.jpeg", maxPerAdult: 1, maxPerChild: 1, maxPerBaby: 0, cooldownHours: 168 },
  { id: "su", name: "Su (5L)", unit: "Şişe", mainCategory: "Gıda", category: "Temel Gıda", icon: "Droplets", imageUrl: "https://i.hizliresim.com/5fo8tem.jpeg", maxPerAdult: 5, maxPerChild: 3, maxPerBaby: 1, cooldownHours: 24 },
  { id: "barbunya", name: "Barbunya", unit: "Paket", mainCategory: "Gıda", category: "Temel Gıda", icon: "Circle", imageUrl: "https://i.hizliresim.com/6yy23du.jpg", maxPerAdult: 2, maxPerChild: 1, maxPerBaby: 0, cooldownHours: 168 },
  { id: "peynir", name: "Peynir", unit: "Kutu", mainCategory: "Gıda", category: "Temel Gıda", icon: "Box", imageUrl: "https://i.hizliresim.com/i4d8w9l.jpg", maxPerAdult: 1, maxPerChild: 1, maxPerBaby: 0, cooldownHours: 168 },
  { id: "bebek-mamasi", name: "Bebek Maması", unit: "Kutu", mainCategory: "Gıda", category: "Bebek Beslenmesi", icon: "Baby", imageUrl: "https://i.hizliresim.com/jgxt8em.jpg", maxPerAdult: 0, maxPerChild: 0, maxPerBaby: 2, cooldownHours: 168 },
  { id: "bebek-devam-sutu", name: "Bebek Devam Sütü", unit: "Kutu", mainCategory: "Gıda", category: "Bebek Beslenmesi", icon: "Baby", imageUrl: "https://i.hizliresim.com/p64xmi0.jpg", maxPerAdult: 0, maxPerChild: 0, maxPerBaby: 2, cooldownHours: 168 },
  { id: "salca-domates", name: "Domates Salçası", unit: "Kutu", mainCategory: "Gıda", category: "Temel Gıda", icon: "Box", imageUrl: "https://i.hizliresim.com/61ldkpb.jpg", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 168 },
  { id: "seker", name: "Toz Şeker", unit: "Paket", mainCategory: "Gıda", category: "Temel Gıda", icon: "Box", imageUrl: "https://i.hizliresim.com/cjo7pb1.jpg", maxPerAdult: 1, maxPerChild: 1, maxPerBaby: 0, cooldownHours: 168 },
  { id: "tuz", name: "Tuz", unit: "Paket", mainCategory: "Gıda", category: "Temel Gıda", icon: "Box", imageUrl: "https://i.hizliresim.com/riduqcd.jpg", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 168 },
  { id: "mercimek", name: "Mercimek", unit: "Paket", mainCategory: "Gıda", category: "Temel Gıda", icon: "Wheat", imageUrl: "https://i.hizliresim.com/ivsutwr.jpg", maxPerAdult: 2, maxPerChild: 1, maxPerBaby: 0, cooldownHours: 168 },
  
  { id: "camasir-suyu", name: "Çamaşır Suyu", unit: "Şişe", mainCategory: "Hijyen", category: "Temizlik", icon: "Sparkles", imageUrl: "https://i.hizliresim.com/2c3ngkd.jpg", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 336 },
  { id: "camasir-deterjani", name: "Çamaşır Deterjanı", unit: "Paket", mainCategory: "Hijyen", category: "Temizlik", icon: "Sparkles", imageUrl: "https://i.hizliresim.com/nx98b50.jpg", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 336 },
  { id: "sabun", name: "Sabun", unit: "Adet", mainCategory: "Hijyen", category: "Kişisel Bakım", icon: "Sparkles", imageUrl: "https://i.hizliresim.com/nly5ecu.jpg", maxPerAdult: 1, maxPerChild: 1, maxPerBaby: 1, cooldownHours: 168 },
  { id: "kagit-havlu", name: "Kağıt Havlu", unit: "Paket", mainCategory: "Hijyen", category: "Genel İhtiyaç", icon: "Box", imageUrl: "https://i.hizliresim.com/bjdena6.jpg", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 168 },
  { id: "tuvalet-kagidi", name: "Tuvalet Kağıdı", unit: "Paket", mainCategory: "Hijyen", category: "Genel İhtiyaç", icon: "Box", imageUrl: "https://i.hizliresim.com/n1xnsfa.jpg", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 168 },
  { id: "bebek-bezi", name: "Bebek Bezi", unit: "Paket", mainCategory: "Hijyen", category: "Bebek İhtiyaç", icon: "Baby", imageUrl: "https://i.hizliresim.com/pwjrp7t.jpg", maxPerAdult: 0, maxPerChild: 0, maxPerBaby: 2, cooldownHours: 168 },
  { id: "kadin-pedi", name: "Kadın Pedi", unit: "Paket", mainCategory: "Hijyen", category: "Kişisel Bakım", icon: "Sparkles", imageUrl: "https://i.hizliresim.com/in9rfnj.png", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 168 },

  { id: "kadin-ust-giyim", name: "Kadın Üst Giyim", unit: "Adet", mainCategory: "Giyim", category: "Kadın Giyim", icon: "Shirt", imageUrl: "https://i.hizliresim.com/r48ldi3.png", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 720, sizesStock: { XS: 10, S: 20, M: 30, L: 25, XL: 10, XXL: 5 } },
  { id: "kadin-ic-giyim", name: "Kadın İç Giyim", unit: "Adet", mainCategory: "Giyim", category: "Kadın Giyim", icon: "Shirt", imageUrl: "https://i.hizliresim.com/kq2uklu.png", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 720, sizesStock: { XS: 10, S: 20, M: 30, L: 25, XL: 10, XXL: 5 } },
  { id: "kadin-alt-giyim", name: "Kadın Alt Giyim", unit: "Adet", mainCategory: "Giyim", category: "Kadın Giyim", icon: "Shirt", imageUrl: "https://i.hizliresim.com/24gjvph.png", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 720, sizesStock: { XS: 10, S: 20, M: 30, L: 25, XL: 10, XXL: 5 } },
  { id: "erkek-ust-giyim", name: "Erkek Üst Giyim", unit: "Adet", mainCategory: "Giyim", category: "Erkek Giyim", icon: "Shirt", imageUrl: "https://i.hizliresim.com/q2bstdo.png", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 720, sizesStock: { XS: 10, S: 20, M: 30, L: 25, XL: 10, XXL: 5 } },
  { id: "erkek-ic-giyim", name: "Erkek İç Giyim", unit: "Adet", mainCategory: "Giyim", category: "Erkek Giyim", icon: "Shirt", imageUrl: "https://i.hizliresim.com/bxqq4mv.png", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 720, sizesStock: { XS: 10, S: 20, M: 30, L: 25, XL: 10, XXL: 5 } },
  { id: "erkek-alt-giyim", name: "Erkek Alt Giyim", unit: "Adet", mainCategory: "Giyim", category: "Erkek Giyim", icon: "Shirt", imageUrl: "https://i.hizliresim.com/thho1bb.png", maxPerAdult: 1, maxPerChild: 0, maxPerBaby: 0, cooldownHours: 720, sizesStock: { XS: 10, S: 20, M: 30, L: 25, XL: 10, XXL: 5 } },
  { id: "cocuk-giyim-paketi", name: "Çocuk Giyim Paketi", unit: "Paket", mainCategory: "Giyim", category: "Çocuk Giyim", icon: "Shirt", imageUrl: "https://i.hizliresim.com/ash6ab0.png", maxPerAdult: 0, maxPerChild: 1, maxPerBaby: 0, cooldownHours: 720, sizesStock: { XS: 10, S: 20, M: 30, L: 25, XL: 10, XXL: 5 } },
  { id: "bebek-giyim-paketi", name: "Bebek Giyim Paketi", unit: "Paket", mainCategory: "Giyim", category: "Bebek Giyim", icon: "Baby", imageUrl: "https://i.hizliresim.com/2j2m8ap.png", maxPerAdult: 0, maxPerChild: 0, maxPerBaby: 1, cooldownHours: 720, sizesStock: { XS: 10, S: 20, M: 30, L: 25, XL: 10, XXL: 5 } }
];

const SEED_CONTAINERS = [
  { id: '1', containerFullId: 'A-101', accessCode: '1234', adults: 2, children: 1, babies: 1 },
  { id: '2', containerFullId: 'A-102', accessCode: '1234', adults: 2, children: 0, babies: 0 }
];

async function seedDatabase() {
  try {
    for (const p of SEED_PRODUCTS) {
      const existing = await db.select().from(products).where(eq(products.id, p.id));
      if (existing.length > 0) {
        await db.update(products).set(p).where(eq(products.id, p.id));
      } else {
        await db.insert(products).values(p);
      }
    }
    console.log("Seeded/Updated products");

    const existingContainers = await db.select().from(containers);
    if (existingContainers.length === 0) {
      await db.insert(containers).values(SEED_CONTAINERS);
      console.log("Seeded containers");
    }
  } catch (error) {
    console.error("Seed error:", error);
  }
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const parseDate = (dateStr?: any) => {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
};


async function startServer() {
  const app = express();
  app.set('trust proxy', 1); // Trust first proxy for rate limiting behind reverse proxy
  const PORT = 3000;

  // Security Middlewares
  // app.use(helmet({ ... }));
  app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
  
  app.use(express.json({ limit: '50mb' }));

  app.post('/api/report-client-error', (req, res) => {
    console.error("CLIENT ERROR:", req.body);
    res.json({ success: true });
  });

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, path) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }));

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      let ext = path.extname(file.originalname) || '';
      if (!ext) {
        if (file.mimetype.startsWith('image/')) ext = '.jpg';
      }
      cb(null, req.body.id + '_' + uniqueSuffix + ext)
    }
  });
  const upload = multer({ storage: storage, limits: { fileSize: 25 * 1024 * 1024 } });


  app.use((req, res, next) => {
    next();
  });

  // --- BACKEND API ROUTES ---
  
  app.post("/api/test-upload", async (req, res) => {
    try {
      console.log("body size:", req.body?.imageUrl?.length);
      await db.select().from(chatSessionsTable).limit(1);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message, cause: e.cause?.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "online", timestamp: new Date().toISOString() });
  });

  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db.select().from(products).orderBy(products.createdAt, products.id);
      res.json(allProducts);
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  app.put("/api/products/:id/stock", async (req, res) => {
    try {
      const { inStock, stockQuantity, sizesStock } = req.body;
      const updateData: any = {};
      if (inStock !== undefined) updateData.inStock = inStock;
      if (stockQuantity !== undefined) updateData.stockQuantity = stockQuantity;
      if (sizesStock !== undefined) updateData.sizesStock = sizesStock;
      
      const result = await db.update(products).set(updateData).where(eq(products.id, req.params.id)).returning();
      result.length > 0 ? res.json(result[0]) : res.status(404).json({ message: "Bulunamadı" });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { role, containerFullId, accessCode, password, name, email, bType } = req.body;
    
    if (role === 'afetzede') {
      try {
        const found = await db.select().from(containers).where(eq(containers.containerFullId, containerFullId));
        const container = found.find(c => c.accessCode === accessCode);
        if (container) return res.json({ success: true, user: { uid: container.id, role: 'afetzede', containerId: container.id }});
        return res.status(401).json({ success: false, message: 'Konteyner numarası veya şifre hatalı.' });
      } catch (err) {
        console.error(err); return res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
      }
    }
    
    if (role === 'yetkili') {
      if (password === 'adminukis2026') return res.json({ success: true, user: { uid: 'admin', role: 'yetkili', name: 'Sistem Yöneticisi' }});
      return res.status(401).json({ success: false, message: 'Yetkili şifresi hatalı.' });
    }

    if (role === 'belediye') {
      if (password === 'adminukis2026') return res.json({ success: true, user: { uid: 'belediye_admin', role: 'belediye', name: 'Belediye Başkanı' }});
      return res.status(401).json({ success: false, message: 'Şifre hatalı.' });
    }

    if (role === 'bagisci') {
      const uid = email ? 'donor_' + Buffer.from(email.trim().toLowerCase()).toString('hex') : generateId();
      return res.json({ success: true, user: { uid, role: bType === 'bireysel' ? 'bagisci_bireysel' : 'bagisci_kurumsal', name, email }});
    }

    return res.status(400).json({ success: false, message: 'Geçersiz rol.' });
  });

  app.get("/api/admin/dashboard", async (req, res) => {
    try {
      const c = await db.select().from(containers).orderBy(containers.containerFullId, containers.id);
      const rq = await db.select().from(requests).orderBy(desc(requests.createdAt), requests.id);
      const rp = await db.select().from(reports).orderBy(desc(reports.createdAt), reports.id);
      const d = await db.select().from(donations).orderBy(desc(donations.createdAt), donations.id);
      const parsedDonations = d.map(don => {
        let parsedItems = [];
        let parsedRequests = [];
        try { parsedItems = don.items ? (typeof don.items === 'string' ? JSON.parse(don.items) : don.items) : []; } catch (e) { console.error("items parse error:", e); }
        try { parsedRequests = don.fulfilledRequests ? (typeof don.fulfilledRequests === 'string' ? JSON.parse(don.fulfilledRequests) : don.fulfilledRequests) : []; } catch (e) { console.error("requests parse error:", e); }
        return {
          ...don,
          items: parsedItems,
          fulfilledRequests: parsedRequests
        };
      });
      const prodRes = await db.select().from(products).orderBy(products.createdAt, products.id);
      const iss = await db.select().from(issues).orderBy(desc(issues.createdAt), issues.id);
      
      res.json({
        containers: c,
        requests: rq,
        reports: rp,
        donations: parsedDonations,
        products: prodRes,
        issues: iss
      });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  // Containers
  app.get("/api/containers", async (req, res) => {
    try {
      res.json(await db.select().from(containers).orderBy(containers.containerFullId, containers.id));
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.get("/api/containers/:id", async (req, res) => {
    try {
      const result = await db.select().from(containers).where(eq(containers.id, req.params.id));
      result.length > 0 ? res.json(result[0]) : res.status(404).json({ message: "Bulunamadı" });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.post("/api/containers", async (req, res) => {
    try {
      const nc = { id: generateId(), ...req.body };
      const result = await db.insert(containers).values(nc).returning();
      res.json(result[0]);
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.put("/api/containers/:id", async (req, res) => {
    try {
      const result = await db.update(containers).set(req.body).where(eq(containers.id, req.params.id)).returning();
      result.length > 0 ? res.json(result[0]) : res.status(404).json({ message: "Bulunamadı" });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.delete("/api/containers/:id", async (req, res) => {
    try {
      await db.delete(requests).where(eq(requests.containerId, req.params.id));
      await db.delete(reports).where(eq(reports.containerId, req.params.id));
      await db.delete(issues).where(eq(issues.containerId, req.params.id));
      await db.delete(containers).where(eq(containers.id, req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  // Requests
  app.get("/api/requests", async (req, res) => {
    try {
      let query = db.select().from(requests).$dynamic();
      const allReqs = await query.orderBy(desc(requests.createdAt), requests.id);
      let filtered = allReqs;
      if (req.query.containerId) filtered = filtered.filter(r => r.containerId === req.query.containerId);
      if (req.query.status) filtered = filtered.filter(r => r.status === req.query.status);
      res.json(filtered);
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.post("/api/requests", async (req, res) => {
    try {
      const nr = { 
        id: generateId(), 
        containerId: req.body.containerId,
        productId: req.body.productId,
        quantity: req.body.quantity,
        status: req.body.status,
        requestDate: parseDate(req.body.requestDate),
        notes: req.body.notes,
        size: req.body.size,
        age: req.body.age
      };
      
      // Update product stock
      const productRows = await db.select().from(products).where(eq(products.id, req.body.productId));
      if (productRows.length > 0) {
        const product = productRows[0];
        const newStock = Math.max(0, (product.stockQuantity || 0) - req.body.quantity);
        await db.update(products).set({
          stockQuantity: newStock,
          inStock: newStock > 0 && product.inStock
        }).where(eq(products.id, req.body.productId));
      }

      const result = await db.insert(requests).values(nr).returning();
      res.json(result[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.put("/api/requests/:id", async (req, res) => {
    try {
      const existing = await db.select().from(requests).where(eq(requests.id, req.params.id));
      if (existing.length === 0) return res.status(404).json({ message: "Bulunamadı" });

      const oldStatus = existing[0].status;
      const newStatus = req.body.status;

      const result = await db.update(requests).set(req.body).where(eq(requests.id, req.params.id)).returning();

      if (oldStatus !== 'approved' && newStatus === 'approved') {
        const productRows = await db.select().from(products).where(eq(products.id, existing[0].productId));
        if (productRows.length > 0) {
           const p = productRows[0];
           const newStock = Math.max(0, (p.stockQuantity ?? 100) - existing[0].quantity);
           const updateData: any = { stockQuantity: newStock };
           if (existing[0].size && p.sizesStock && (p.sizesStock as any)[existing[0].size] !== undefined) {
             const newSizesStock = { ...(p.sizesStock as Record<string, number>) };
             newSizesStock[existing[0].size] = Math.max(0, newSizesStock[existing[0].size] - existing[0].quantity);
             updateData.sizesStock = newSizesStock;
           }
           await db.update(products).set(updateData).where(eq(products.id, p.id));
        }
      } else if (oldStatus === 'approved' && (newStatus === 'pending' || newStatus === 'rejected' || newStatus === 'cancelled')) {
        const productRows = await db.select().from(products).where(eq(products.id, existing[0].productId));
        if (productRows.length > 0) {
           const p = productRows[0];
           const newStock = (p.stockQuantity ?? 100) + existing[0].quantity;
           const updateData: any = { stockQuantity: newStock };
           if (existing[0].size && p.sizesStock && (p.sizesStock as any)[existing[0].size] !== undefined) {
             const newSizesStock = { ...(p.sizesStock as Record<string, number>) };
             newSizesStock[existing[0].size] += existing[0].quantity;
             updateData.sizesStock = newSizesStock;
           }
           await db.update(products).set(updateData).where(eq(products.id, p.id));
        }
      }

      res.json(result[0]);
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.delete("/api/requests", async (req, res) => {
    try {
      await db.delete(requests);
      res.json({ success: true });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  app.delete("/api/requests/:id", async (req, res) => {
    try {
      await db.delete(requests).where(eq(requests.id, req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  // Reports
  app.get("/api/reports", async (req, res) => {
    try {
      res.json(await db.select().from(reports).orderBy(desc(reports.createdAt), reports.id));
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.post("/api/reports", async (req, res) => {
    try {
      const nr = { 
        id: generateId(), 
        containerId: req.body.containerId,
        type: req.body.type,
        audioUrl: req.body.audioUrl,
        description: req.body.description,
        status: req.body.status,
        priority: req.body.priority
      };
      const result = await db.insert(reports).values(nr).returning();
      res.json(result[0]);
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.put("/api/reports/:id", async (req, res) => {
    try {
      const result = await db.update(reports).set(req.body).where(eq(reports.id, req.params.id)).returning();
      result.length > 0 ? res.json(result[0]) : res.status(404).json({ message: "Bulunamadı" });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.delete("/api/reports", async (req, res) => {
    try {
      await db.delete(reports);
      res.json({ success: true });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  app.delete("/api/reports/:id", async (req, res) => {
    try {
      await db.delete(reports).where(eq(reports.id, req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  // Issues
  app.get("/api/issues", async (req, res) => {
    try {
      res.json(await db.select().from(issues).orderBy(desc(issues.createdAt), issues.id));
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.post("/api/issues", async (req, res) => {
    try {
      const ni = { 
        id: generateId(), 
        containerId: req.body.containerId,
        type: req.body.type,
        description: req.body.description,
        status: req.body.status || 'pending'
      };
      const result = await db.insert(issues).values(ni).returning();
      res.json(result[0]);
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.put("/api/issues/:id", async (req, res) => {
    try {
      const result = await db.update(issues).set(req.body).where(eq(issues.id, req.params.id)).returning();
      result.length > 0 ? res.json(result[0]) : res.status(404).json({ message: "Bulunamadı" });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.delete("/api/issues", async (req, res) => {
    try {
      await db.delete(issues);
      res.json({ success: true });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.delete("/api/issues/:id", async (req, res) => {
    try {
      await db.delete(issues).where(eq(issues.id, req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  // Donations
  app.get("/api/donations", async (req, res) => {
    try {
      const allDonations = await db.select().from(donations).orderBy(desc(donations.createdAt), donations.id);
      const parsed = allDonations.map(d => {
        let parsedItems = [];
        let parsedRequests = [];
        try { parsedItems = d.items ? (typeof d.items === 'string' ? JSON.parse(d.items) : d.items) : []; } catch (e) { console.error("items parse error:", e); }
        try { parsedRequests = d.fulfilledRequests ? (typeof d.fulfilledRequests === 'string' ? JSON.parse(d.fulfilledRequests) : d.fulfilledRequests) : []; } catch (e) { console.error("requests parse error:", e); }
        return {
          ...d,
          items: parsedItems,
          fulfilledRequests: parsedRequests
        };
      });
      res.json(parsed);
    } catch (err: any) {
      console.error("GET /api/donations error:", err);
      res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.post("/api/donations", async (req, res) => {
    try {
      const nd = { 
        id: generateId(), 
        donorId: req.body.donorId,
        donorName: req.body.donorName,
        donorPhone: req.body.donorPhone || null,
        donorEmail: req.body.donorEmail || null,
        donorType: req.body.type || req.body.donorType,
        amount: req.body.amount || 0,
        date: parseDate(req.body.date),
        status: req.body.status,
        description: req.body.description || null,
        items: req.body.items ? JSON.stringify(req.body.items) : null,
        fulfilledRequests: req.body.fulfilledRequests ? JSON.stringify(req.body.fulfilledRequests) : null
      };
      const result = await db.insert(donations).values(nd).returning();
      res.json({ ...result[0], items: req.body.items, fulfilledRequests: req.body.fulfilledRequests });
    } catch (err: any) {
      console.error("POST /api/donations error:", err);
      res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.put("/api/donations/:id", async (req, res) => {
    try {
      const updateData = { ...req.body };
      delete updateData.fulfilledRequests;
      delete updateData.items;
      
      const result = await db.update(donations).set(updateData).where(eq(donations.id, req.params.id)).returning();
      
      if (result.length > 0) {
        res.json(result[0]);
      } else {
        res.status(404).json({ message: "Bulunamadı" });
      }
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });
  app.post("/api/donations/cancel-request", async (req, res) => {
    try {
      const { donationId, reqId } = req.body;
      const result = await db.select().from(donations).where(eq(donations.id, donationId));
      if (result.length > 0) {
        const donation = result[0];
        if (donation.fulfilledRequests) {
           let fr = JSON.parse(donation.fulfilledRequests);
           fr = fr.filter((id: string) => id !== reqId);
           if (fr.length === 0) {
             await db.update(donations).set({ status: 'cancelled' }).where(eq(donations.id, donationId));
           } else {
             await db.update(donations).set({ fulfilledRequests: JSON.stringify(fr) }).where(eq(donations.id, donationId));
           }
           res.json({ success: true });
        } else {
           res.json({ success: true }); // No requests to cancel anyway
        }
      } else {
        res.status(404).json({ message: "Bulunamadı" });
      }
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  app.delete("/api/donations", async (req, res) => {
    try {
      await db.delete(donations);
      res.json({ success: true });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  app.delete("/api/donations/:id", async (req, res) => {
    try {
      await db.delete(donations).where(eq(donations.id, req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  // --- CHAT API (DATABASE) ---
  
  const BAD_WORDS = ['küfür', 'salak', 'aptal', 'gerizekalı', 'lan'];

  app.post("/api/chat/session", async (req, res) => {
    try {
      const { id, name, surname, containerNo } = req.body;
      let sessionRes = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.id, id));
      let session = sessionRes[0];
      
      if (!session) {
        const newSessionRes = await db.insert(chatSessionsTable).values({ id, name, surname, containerNo }).returning();
        session = newSessionRes[0];
      } else {
        const updatedSession = await db.update(chatSessionsTable).set({ name, surname, containerNo }).where(eq(chatSessionsTable.id, id)).returning();
        session = updatedSession[0];
      }
      res.json(session);
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  app.get("/api/chat/session/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      let sessionRes = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.id, id));
      let session = sessionRes[0];
      
      if (!session) {
        const newSessionRes = await db.insert(chatSessionsTable).values({ id }).returning();
        session = newSessionRes[0];
      }
      
      const messagesRes = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.sessionId, id)).orderBy(chatMessagesTable.timestamp, chatMessagesTable.id);
      
      res.json({ ...session, messages: messagesRes });
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  app.post("/api/chat/message", upload.single('file'), async (req, res) => {
    try {
      const { id, text, sender = 'user' } = req.body;
      let imageUrl = req.body.imageUrl;
      
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      }
      
      if (imageUrl && imageUrl.length > 35 * 1024 * 1024) {
        return res.status(400).json({ error: "Dosya boyutu çok büyük." });
      }
      
      let sessionRes = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.id, id));
      let session = sessionRes[0];
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (session.isBanned && sender === 'user') {
        return res.status(403).json({ error: "Canlı destek hattından yasaklandınız, yetkili merkez ile görüşün." });
      }

      if (sender === 'user' && text && BAD_WORDS.some(w => text.toLowerCase().includes(w))) {
        await db.update(chatSessionsTable).set({ isBanned: true, lastActive: new Date() }).where(eq(chatSessionsTable.id, id));
        return res.status(403).json({ error: "Canlı destek hattından yasaklandınız, yetkili merkez ile görüşün." });
      }

      let finalImageUrl = imageUrl || null;
      if (finalImageUrl && finalImageUrl.startsWith('data:')) {
        const commaIndex = finalImageUrl.indexOf(',');
        if (commaIndex !== -1) {
          const meta = finalImageUrl.substring(0, commaIndex);
          const data = finalImageUrl.substring(commaIndex + 1);
          const typeMatch = meta.match(/^data:([a-zA-Z0-9-+\/]+)/);
          const type = typeMatch ? typeMatch[1] : 'application/octet-stream';
          const buffer = Buffer.from(data, 'base64');
          const ext = type.split('/')[1] || 'bin';
          const filename = `${id}_${Date.now()}.${ext}`;
          fs.writeFileSync(path.join(process.cwd(), 'uploads', filename), buffer);
          finalImageUrl = `/uploads/${filename}`;
        }
      }

      const msgId = generateId();
      const newMessage = { 
        id: msgId, 
        sessionId: id,
        sender, 
        text: text || '', 
        imageUrl: finalImageUrl
      };
      
      const insertedMsg = await db.insert(chatMessagesTable).values(newMessage).returning();
      
      await db.update(chatSessionsTable).set({ lastActive: new Date() }).where(eq(chatSessionsTable.id, id));
      
      res.json(insertedMsg[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Veritabanı hatası", details: err.message, cause: err.cause?.message || err.cause });
    }
  });

  app.get("/api/chat/sessions", async (req, res) => {
    try {
      const sessions = await db.select().from(chatSessionsTable).orderBy(desc(chatSessionsTable.lastActive), chatSessionsTable.id);
      const result = [];
      for (const s of sessions) {
        const messagesRes = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.sessionId, s.id)).orderBy(chatMessagesTable.timestamp, chatMessagesTable.id);
        result.push({ ...s, messages: messagesRes });
      }
      res.json(result);
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  app.delete("/api/chat/sessions", async (req, res) => {
    try {
      await db.delete(chatMessagesTable);
      await db.delete(chatSessionsTable);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete all sessions" });
    }
  });

  app.delete("/api/chat/session/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(chatMessagesTable).where(eq(chatMessagesTable.sessionId, id));
      await db.delete(chatSessionsTable).where(eq(chatSessionsTable.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  app.post("/api/chat/unban", async (req, res) => {
    try {
      const { id } = req.body;
      await db.update(chatSessionsTable).set({ isBanned: false }).where(eq(chatSessionsTable.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: "Veritabanı hatası", details: err?.message || String(err) });
    }
  });

  // --- FRONTEND (VITE & REACT) MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicitly fallback to index.html for Vite dev server
    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Run seed database in background without blocking server startup
  seedDatabase().catch(err => console.error('Seed DB failed:', err));
}

startServer();
