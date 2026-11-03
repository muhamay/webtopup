
const page = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Secret Love Letter</title>
<style>
body{font-family:Arial,sans-serif;background:#f7edf2;color:#332631;margin:0;padding:25px}
main{max-width:430px;margin:35px auto;background:white;padding:25px;border-radius:18px;box-shadow:0 5px 25px #0001}
h1{text-align:center;color:#b34d79}
p{text-align:center;color:#766570}
input,textarea,button{box-sizing:border-box;width:100%;padding:13px;margin-top:12px;border-radius:9px;border:1px solid #ddd;font-size:15px}
textarea{height:130px;resize:vertical}
button{background:#b34d79;color:white;border:0;font-weight:bold;cursor:pointer}
.result{background:#f9eaf1;padding:15px;border-radius:10px;margin-top:15px;text-align:center;overflow-wrap:anywhere}
a{color:#a12f64}
</style>
</head>
<body>
<main>
<h1>Secret Love Letter 💌</h1>
<p>Kirim pesan rahasia untuk seseorang.</p>
<form id="letterForm">
<input id="sender" maxlength="50" placeholder="Nama pengirim (opsional)">
<textarea id="message" maxlength="3000" required placeholder="Tulis surat rahasiamu..."></textarea>
<button type="submit">Buat Surat Rahasia</button>
</form>
<div id="result"></div>
</main>
<script>
document.getElementById('letterForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const result=document.getElementById('result');
 result.textContent='Menyimpan surat...';
 try{
  const r=await fetch('/api/letters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sender:document.getElementById('sender').value,message:document.getElementById('message').value})});
  const d=await r.json();
  if(!r.ok)throw new Error(d.error||'Gagal menyimpan surat');
  result.innerHTML='';
  const box=document.createElement('div');box.className='result';
  const title=document.createElement('strong');title.textContent='Surat berhasil dibuat!';
  const code=document.createElement('h2');code.textContent=d.code;
  const note=document.createElement('p');note.textContent='Simpan kode ini. Berikan kode tersebut kepada admin untuk mengambil surat.';
  box.append(title,code,note);result.append(box);
  e.target.reset();
 }catch(err){result.textContent=err.message}
});
</script>
</body>
</html>`;

const adminPage = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin - Secret Love Letter</title>
<style>
body{font-family:Arial;background:#f3edf1;padding:20px;color:#332631}
main{max-width:450px;margin:30px auto;background:white;padding:22px;border-radius:15px}
input,button{box-sizing:border-box;width:100%;padding:13px;margin:8px 0;border:1px solid #ddd;border-radius:8px}
button{background:#b34d79;color:white;border:0;font-weight:bold}
a{display:block;background:#168b55;color:white;padding:13px;text-align:center;text-decoration:none;border-radius:8px;margin-top:12px}
#letter{white-space:pre-wrap;overflow-wrap:anywhere;background:#f8edf2;padding:12px;border-radius:8px}
</style>
</head>
<body><main>
<h2>Admin Secret Love Letter</h2>
<form id="searchForm">
<input id="key" type="password" placeholder="Admin key" required>
<input id="code" placeholder="Kode surat" required>
<button type="submit">Cari Surat</button>
</form>
<div id="result"></div>
<script>
let currentCode='';
document.getElementById('searchForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const out=document.getElementById('result');out.textContent='Mencari...';
 try{
  const r=await fetch('/api/admin/find',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:document.getElementById('key').value,code:document.getElementById('code').value.trim()})});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'Gagal');
  currentCode=d.code;out.innerHTML='';
  const sender=document.createElement('p');sender.textContent='Pengirim: '+(d.sender||'Anonim');
  const letter=document.createElement('div');letter.id='letter';letter.textContent=d.message;
  out.append(sender,letter);
  if(d.whatsappUrl){
   const a=document.createElement('a');a.href=d.whatsappUrl;a.target='_blank';a.rel='noopener';a.textContent='Buka WhatsApp untuk mengirim';out.append(a);
  }else{
   const warning=document.createElement('p');warning.textContent='Nomor WhatsApp admin belum diatur.';out.append(warning);
  }
  const done=document.createElement('button');done.textContent='Tandai sudah dikirim';
  done.onclick=async()=>{
   const rr=await fetch('/api/admin/delivered',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:document.getElementById('key').value,code:currentCode})});
   const dd=await rr.json();alert(dd.message||dd.error);
  };out.append(done);
 }catch(err){out.textContent=err.message}
});
</script></main></body></html>`;

function json(data,status=200){
 return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
}

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method==='GET' && url.pathname==='/')return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8'}});
  if(request.method==='GET' && url.pathname==='/admin')return new Response(adminPage,{headers:{'Content-Type':'text/html; charset=utf-8'}});
  
  if(request.method==='POST' && url.pathname==='/api/letters'){
   try{
    const body=await request.json();
    const sender=String(body.sender||'').trim().slice(0,50);
    const message=String(body.message||'').trim();
    if(!message)return json({error:'Surat tidak boleh kosong.'},400);
    if(message.length>3000)return json({error:'Surat terlalu panjang.'},400);
    const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%100000000).padStart(8,'0');
    const now=Math.floor(Date.now()/1000);
    const expiry=now+30*24*60*60;
    await env.DB.prepare('INSERT INTO letters (code,sender,message,created_at,expires_at) VALUES (?,?,?,?,?)').bind(code,sender,message,now,expiry).run();
    return json({ok:true,code});
   }catch(e){return json({error:'Tidak dapat menyimpan surat. Coba lagi.'},500)}
  }

  if(request.method==='POST' && (url.pathname==='/api/admin/find'||url.pathname==='/api/admin/delivered')){
   try{
    const body=await request.json();
    if(!env.ADMIN_KEY || body.key!==env.ADMIN_KEY)return json({error:'Admin key salah.'},401);
    const code=String(body.code||'').trim();
    if(!/^[0-9]{8}$/.test(code))return json({error:'Kode harus terdiri dari 8 angka.'},400);
    if(url.pathname==='/api/admin/find'){
     const letter=await env.DB.prepare('SELECT code,sender,message,expires_at FROM letters WHERE code=?').bind(code).first();
     if(!letter || letter.expires_at<Math.floor(Date.now()/1000))return json({error:'Surat tidak ditemukan atau sudah kedaluwarsa.'},404);
     const number=String(env.WHATSAPP_NUMBER||'').replace(/[^0-9]/g,'');
     const text='Secret Love Letter\\nKode: '+letter.code+'\\nPengirim: '+(letter.sender||'Anonim')+'\\n\\n'+letter.message;
     const whatsappUrl=number?'https://wa.me/'+number+'?text='+encodeURIComponent(text):null;
     return json({...letter,whatsappUrl});
    }
    await env.DB.prepare('INSERT INTO delivery_history (letter_code,delivered_at) VALUES (?,?) ON CONFLICT(letter_code) DO UPDATE SET delivered_at=excluded.delivered_at').bind(code,Math.floor(Date.now()/1000)).run();
    return json({ok:true,message:'Surat ditandai sudah dikirim.'});
   }catch(e){return json({error:'Terjadi kesalahan pada database.'},500)}
  }
  return new Response('Not found',{status:404});
 }
};
