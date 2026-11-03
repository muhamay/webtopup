
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import crypto from "node:crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(process.env.DATABASE_FILE || "letters.db");

const MAX_DELIVERIES = 15;
const WINDOW_MS = 2 * 60 * 60 * 1000;
const EXPIRY_DAYS = Math.min(
  Math.max(Number(process.env.LETTER_EXPIRY_DAYS) || 30, 1),
  90
);

if (!process.env.ADMIN_KEY || process.env.ADMIN_KEY.length < 24) {
  throw new Error("ADMIN_KEY harus diisi dengan minimal 24 karakter.");
}

if (!/^[1-9][0-9]{7,14}$/.test(process.env.WHATSAPP_NUMBER || "")) {
  throw new Error("WHATSAPP_NUMBER tidak valid.");
}

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS letters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    sender TEXT,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS delivery_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    letter_code TEXT UNIQUE NOT NULL,
    delivered_at INTEGER NOT NULL
  );
`);

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(express.json({ limit: "10kb" }));

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SL-";

  for (let i = 0; i < 8; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }

  return code;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function getQuota() {
  const start = Date.now() - WINDOW_MS;

  const used = db.prepare(`
    SELECT COUNT(*) AS total
    FROM delivery_history
    WHERE delivered_at > ?
  `).get(start).total;

  const oldest = db.prepare(`
    SELECT MIN(delivered_at) AS oldest
    FROM delivery_history
    WHERE delivered_at > ?
  `).get(start).oldest;

  return {
    limit: MAX_DELIVERIES,
    used,
    remaining: Math.max(0, MAX_DELIVERIES - used),
    available: used < MAX_DELIVERIES,
    nextReset: used >= MAX_DELIVERIES && oldest
      ? oldest + WINDOW_MS
      : null
  };
}

function adminOnly(req, res, next) {
  const key = req.get("x-admin-key") || "";

  const a = Buffer.from(key);
  const b = Buffer.from(process.env.ADMIN_KEY);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({
      error: "Akses admin ditolak."
    });
  }

  next();
}

function page(title, content, script = "") {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#fff1f5">
<title>${escapeHTML(title)}</title>
<style>
.music-btn {
  background-color: #ff4b5c;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 15px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(255, 75, 92, 0.2);
}

.music-btn:hover {
  background-color: #e03e4d;
  transform: scale(1.05);
}
*{box-sizing:border-box}
body{
  margin:0;padding:22px;min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  font-family:Arial,sans-serif;
  color:#513342;
  background:linear-gradient(135deg,#fff1f5,#ffe0eb)
}
.card{
  width:100%;max-width:480px;background:white;
  border-radius:24px;padding:28px 23px;
  box-shadow:0 15px 45px #a64d751c
}
h1{text-align:center;color:#d64f83;margin:5px 0 10px}
.subtitle{text-align:center;color:#987889;font-size:14px;line-height:1.6}
.heart{text-align:center;font-size:48px}
label{display:block;font-weight:bold;font-size:14px;margin:16px 0 8px}
input,textarea{
  width:100%;padding:13px;border:1px solid #f1cbd9;
  border-radius:12px;background:#fffafd;font:inherit;color:#513342
}
textarea{min-height:145px;resize:vertical}
button,.btn{
  display:block;width:100%;padding:14px;margin-top:14px;
  border:0;border-radius:12px;background:#d64f83;
  color:white;font-weight:bold;font-size:14px;text-align:center;
  text-decoration:none;cursor:pointer
}
button:disabled{opacity:.6;cursor:wait}
.secondary{background:#f7dce7;color:#9b3560}
.quota{
  margin:18px 0;padding:13px;text-align:center;
  border-radius:12px;background:#fff1f6;color:#a83e6b;font-size:13px
}
.result{
  display:none;background:#fff1f6;border-radius:15px;
  padding:18px;margin-top:20px;text-align:center
}
.code{font-size:25px;letter-spacing:2px;color:#c83e76;font-weight:bold}
.note{font-size:12px;color:#987889;line-height:1.6;text-align:center}
.error{color:#b42345;font-size:13px;margin-top:12px}
.message{
  white-space:pre-wrap;overflow-wrap:anywhere;
  background:#fff1f6;padding:15px;border-radius:12px;
  line-height:1.6;margin-top:14px
}
a{color:#c83e76}
</style>
</head>
<body>
<main class="card">${content}</main>
${script}
</body>
</html>`;
}

// WEBSITE PENGIRIM BY GALUH XATANIEL
app.get("/", (req, res) => {
  const content = `
  <div class="heart">💌</div>
  <h1>Secret Love Letter</h1>
  <p class="subtitle">

    Kirim surat rahasia By Galuh.
    Tanpa perlu memasukkan nomor telepon.
  </p>

  <form id="letterForm">
  <label>NAMA PENGIRIM</label>
    <input id="sender" maxlength="40"
      placeholder="Tidak Wajib..">
      
    <label>MASUKAN NO CRUSH LO!!</label>
    <input id="sender" maxlength="15"
      placeholder="Wajib isi ya sayang..">

    <label>ISI SURAT BUAT CRUSH LO!!</label>
    <textarea id="message" maxlength="1500" required
      placeholder="Tuliskan pesan dan alasan di sini..."></textarea>

    <button id="submit" type="submit">Buat Surat Rahasia 💗</button>
  </form>

  <div class="error" id="error"></div>

  <section class="result" id="result">
    <h3>Surat berhasil dibuat! 💖</h3>
    <p class="note">Berikan kode ini kepada Perantara.</p>
    <div class="code" id="code"></div>
    <button type="button" id="copy">Salin Kode</button>
    <button type="button" class="secondary" id="share">Bagikan Kode</button>
    <p class="note">Penerima mengirim kode ke nomor WhatsApp perantara.</p>
  </section>

  <p class="note">Secret Love Letter · By Galuh Xataniel </p>`;

  const script = `
  <script>
  const form=document.getElementById("letterForm");
  const button=document.getElementById("submit");
  let currentCode="";
document.getElementById('share').addEventListener('click', function() {
    const codeText = document.getElementById('code').innerText;
    const targetNumber = "6285780322008";
    const textMessage = encodeURIComponent(\`Halo, ini kode saya 💖: \${codeText}\`);
    window.open(\`https://wa.me/\${targetNumber}?text=\${textMessage}\`, '_blank');
});
  async function updateQuota(){
    try{
      const r=await fetch("/api/quota");
      const q=await r.json();
      document.getElementById("quota").textContent=
        q.available
        ? "💌 Kuota tersedia: "+q.remaining+"/15 pengiriman"
        : "💗 Kuota penuh. Pengiriman akan tersedia kembali setelah periode 2 jam.";
    }catch{
      document.getElementById("quota").textContent="Kuota tidak dapat diperiksa.";
    }
  }

  updateQuota();

  form.addEventListener("submit",async e=>{
    e.preventDefault();
    button.disabled=true;
    button.textContent="Menyimpan surat...";

    try{
      const r=await fetch("/api/letters",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          sender:document.getElementById("sender").value,
          message:document.getElementById("message").value
        })
      });

      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Gagal menyimpan.");

      currentCode=d.code;
      document.getElementById("code").textContent=currentCode;
      document.getElementById("result").style.display="block";
      document.getElementById("error").textContent="";
      form.reset();
    }catch(err){
      document.getElementById("error").textContent=err.message;
    }finally{
      button.disabled=false;
      button.textContent="Buat Dan Bagikan💗";
    }
  });

  document.getElementById("copy").onclick=async()=>{
    if(!currentCode)return;
    await navigator.clipboard.writeText(currentCode);
    document.getElementById("copy").textContent="Berhasil disalin ✓";
  };

  document.getElementById("share").onclick=async()=>{
    if(!currentCode)return;
    const text="Aku punya surat rahasia untukmu 💌\\nKirim kode "+
      currentCode+" ke nomor WhatsApp Secret Love Letter.";
    if(navigator.share){
      try{await navigator.share({title:"Secret Love Letter",text});}catch{}
    }else{
      await navigator.clipboard.writeText(text);
    }
  };
  </script>`;

  res.send(page("Secret Love Letter", content, script));
});

// API BUAT SURAT
app.post("/api/letters", createLimiter, (req, res) => {
  try {
    const sender = String(req.body.sender || "").trim().slice(0,40);
    const message = String(req.body.message || "").trim();

    if (!message || message.length > 1500) {
      return res.status(400).json({
        error:"Isi surat harus 1 sampai 1500 karakter."
      });
    }

    const now = Date.now();
    const expires = now + EXPIRY_DAYS * 86400000;

    let code;
    let saved = false;

    for (let i=0; i<5; i++) {
      code=generateCode();
      try {
        db.prepare(`
          INSERT INTO letters(code,sender,message,created_at,expires_at)
          VALUES(?,?,?,?,?)
        `).run(code,sender || null,message,now,expires);
        saved=true;
        break;
      } catch (err) {
        if (i===4) throw err;
      }
    }

    if (!saved) throw new Error("Kode gagal dibuat.");

    res.json({success:true,code,expiresInDays:EXPIRY_DAYS});
  } catch (err) {
    console.error(err);
    res.status(500).json({error:"Gagal menyimpan surat."});
  }
});

// API KUOTA
app.get("/api/quota", (req,res)=>{
  res.json(getQuota());
});

// HALAMAN ADMIN
app.get("/admin", (req,res)=>{
  const content=`
  <div class="heart">🔐</div>
  <h1>Admin Panel</h1>
  <p class="subtitle">Secret Love Letter</p>

  <label>Password admin</label>
  <input id="adminKey" type="password" autocomplete="current-password"
    placeholder="Masukkan password admin">

  <label>Kode surat</label>
  <input id="code" placeholder="SL-K7M9Q2PX">

  <button id="find">Cari Surat</button>

  <div id="quota" class="quota">Memeriksa kuota...</div>
  <div id="output"></div>
  <div class="error" id="error"></div>`;

  const script=`
  }
}, { once: true });
  <script>
  let foundCode="";

  const key=()=>document.getElementById("adminKey").value;

  async function refreshQuota(){
    const r=await fetch("/api/quota");
    const q=await r.json();
    document.getElementById("quota").textContent=
      "Kuota: "+q.used+"/15 digunakan · Sisa "+q.remaining;
  }

  refreshQuota();

  document.getElementById("find").onclick=async()=>{
    const code=document.getElementById("code").value.trim().toUpperCase();
    const output=document.getElementById("output");
    const error=document.getElementById("error");
    output.innerHTML="";
    error.textContent="";
    foundCode="";

    try{
      const r=await fetch("/api/admin/find",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-admin-key":key()
        },
        body:JSON.stringify({code})
      });

      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Gagal mencari surat.");

      foundCode=d.code;

      const message=document.createElement("div");
      message.className="message";
      message.textContent=
        "Kode: "+d.code+"\\nDari: "+(d.sender||"Anonim")+
        "\\n\\n"+d.message;
      output.appendChild(message);

      const send=document.createElement("a");
      send.className="btn";
      send.target="_blank";
      send.rel="noopener noreferrer";
      send.href="https://wa.me/"+${JSON.stringify(process.env.WHATSAPP_NUMBER)}+
        "?text="+encodeURIComponent(
          "💌 SURAT RAHASIA UNTUKMU\\n\\nDari: "+
          (d.sender||"Seseorang yang ingin tetap anonim")+
          "\\n\\n"+d.message+
          "\\n\\nSecret Love Letter"
        );
      send.textContent="Buka WhatsApp untuk Mengirim";
      output.appendChild(send);

      const confirm=document.createElement("button");
      confirm.textContent="Konfirmasi Sudah Terkirim";
      confirm.onclick=async()=>{
        confirm.disabled=true;
        try{
          const result=await fetch("/api/admin/delivered",{
            method:"POST",
            headers:{
              "Content-Type":"application/json",
              "x-admin-key":key()
            },
            body:JSON.stringify({code:foundCode})
          });
          const data=await result.json();
          if(!result.ok)throw new Error(data.error);
          output.innerHTML="<p>Surat berhasil dicatat sebagai terkirim ✓</p>";
          await refreshQuota();
        }catch(err){
          error.textContent=err.message;
          confirm.disabled=false;
        }
      };
      output.appendChild(confirm);
    }catch(err){
      error.textContent=err.message;
    }
  };
  </script>`;

  res.send(page("Admin Panel",content,script));
});

// ADMIN API: CARI SURAT
app.post("/api/admin/find",adminLimiter,adminOnly,(req,res)=>{
  const code=String(req.body.code||"").trim().toUpperCase();

  if(!/^SL-[A-Z0-9]{8}$/.test(code)){
    return res.status(400).json({error:"Format kode tidak valid."});
  }

  const letter=db.prepare(`
    SELECT code,sender,message,expires_at
    FROM letters WHERE code=?
  `).get(code);

  if(!letter || letter.expires_at<Date.now()){
    return res.status(404).json({
      error:"Surat tidak ditemukan atau sudah kedaluwarsa."
    });
  }

  const delivered=db.prepare(`
    SELECT id FROM delivery_history WHERE letter_code=?
  `).get(code);

  if(delivered){
    return res.status(409).json({error:"Surat sudah terkirim."});
  }

  res.json(letter);
});

// ADMIN API: KONFIRMASI PENGIRIMAN
app.post("/api/admin/delivered",adminLimiter,adminOnly,(req,res)=>{
  const code=String(req.body.code||"").trim().toUpperCase();
  const now=Date.now();

  try{
    const transaction=db.transaction(()=>{
      const letter=db.prepare(`
        SELECT code,expires_at FROM letters WHERE code=?
      `).get(code);

      if(!letter || letter.expires_at<now){
        return "not_found";
      }

      const exists=db.prepare(`
        SELECT id FROM delivery_history WHERE letter_code=?
      `).get(code);

      if(exists)return "already_sent";

      const used=db.prepare(`
        SELECT COUNT(*) AS total FROM delivery_history
        WHERE delivered_at>?
      `).get(now-WINDOW_MS).total;

      if(used>=MAX_DELIVERIES)return "quota_full";

      db.prepare(`
        INSERT INTO delivery_history(letter_code,delivered_at)
        VALUES(?,?)
      `).run(code,now);

      return "success";
    });

    const result=transaction();

    if(result==="not_found")return res.status(404).json({error:"Surat tidak ditemukan."});
    if(result==="already_sent")return res.status(409).json({error:"Surat sudah terkirim."});
    if(result==="quota_full")return res.status(429).json({error:"Kuota 15 pengiriman per 2 jam sudah habis."});

    res.json({success:true,quota:getQuota()});
  }catch(err){
    console.error(err);
    res.status(500).json({error:"Gagal mencatat pengiriman."});
  }
});

// BERSIHKAN SURAT KEDALUWARSA
function cleanup(){
  const cutoff=Date.now()-7*86400000;

  db.prepare("DELETE FROM letters WHERE expires_at<?").run(cutoff);
}

cleanup();
setInterval(cleanup,24*60*60*1000).unref();

app.listen(PORT,()=>{
  console.log("Secret Love Letter berjalan di port "+PORT);
});
