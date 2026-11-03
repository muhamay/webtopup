
const page = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Secret Love Letter</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:20px;background:#f8edf2;font-family:Arial,sans-serif;color:#382b34}
main{max-width:450px;margin:30px auto;background:white;padding:25px;border-radius:20px;box-shadow:0 5px 25px #0001}
h1{text-align:center;color:#b34d79;margin-bottom:8px}
.subtitle{text-align:center;color:#887580;font-size:14px;margin-bottom:25px}
label{display:block;font-weight:bold;margin-top:17px;font-size:14px}
input,textarea{width:100%;padding:14px;margin-top:8px;border:1px solid #e4d6de;border-radius:10px;font-size:15px;font-family:Arial}
textarea{height:125px;resize:vertical}
button{width:100%;padding:14px;margin-top:22px;border:0;border-radius:10px;background:#b34d79;color:white;font-size:15px;font-weight:bold;cursor:pointer}
.result{margin-top:18px;padding:16px;background:#fbedf3;border-radius:12px;text-align:center;overflow-wrap:anywhere}
.result h2{color:#b34d79;letter-spacing:3px}
.result a{display:block;margin-top:14px;padding:13px;background:#168b55;color:white;border-radius:9px;text-decoration:none;font-weight:bold}
.small{font-size:12px;color:#887580;line-height:1.5}
</style>
</head>
<body>
<main>
<h1>💌 Secret Love Letter</h1>
<p class="subtitle">Sampaikan pesan rahasiamu kepada seseorang.</p>

<form id="letterForm">
<label>1. Nama pengirim</label>
<input id="sender" maxlength="50" required placeholder="Masukkan nama kamu">

<label>2. Nomor WhatsApp penerima</label>
<input id="recipient" type="tel" maxlength="20" required placeholder="Contoh: 6281234567890">

<label>3. Isi surat</label>
<textarea id="message" maxlength="3000" required placeholder="Tuliskan isi surat rahasiamu..."></textarea>

<label>4. Alasan mengirim surat</label>
<textarea id="reason" maxlength="1000" required placeholder="Tuliskan alasan kamu mengirim surat ini..."></textarea>

<p class="small">Pastikan nomor penerima benar dan kamu memiliki izin untuk menggunakannya.</p>
<button type="submit">Buat Surat Rahasia 💌</button>
</form>

<div id="result"></div>
</main>

<script>
const form=document.getElementById('letterForm');
const result=document.getElementById('result');

form.addEventListener('submit',async e=>{
 e.preventDefault();
 result.textContent='Sedang membuat surat...';

 try{
  const response=await fetch('/api/letters',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({
    sender:document.getElementById('sender').value,
    recipient_number:document.getElementById('recipient').value,
    message:document.getElementById('message').value,
    reason:document.getElementById('reason').value
   })
  });

  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Gagal membuat surat');

  result.innerHTML='';
  const box=document.createElement('div');
  box.className='result';

  const title=document.createElement('strong');
  title.textContent='Surat berhasil dibuat!';

  const code=document.createElement('h2');
  code.textContent=data.code;

  const note=document.createElement('p');
  note.textContent='Simpan kode ini dan kirimkan ke WhatsApp perantara.';

  box.append(title,code,note);

  if(data.whatsappUrl){
   const link=document.createElement('a');
   link.href=data.whatsappUrl;
   link.target='_blank';
   link.rel='noopener';
   link.textContent='Kirim kode ke WhatsApp perantara';
   box.append(link);
  }else{
   const warning=document.createElement('p');
   warning.textContent='WhatsApp perantara belum dikonfigurasi.';
   box.append(warning);
  }

  result.append(box);
  form.reset();
 }catch(error){
  result.textContent=error.message;
 }
});
</script>
</body>
</html>`;

const adminPage = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin Secret Love Letter</title>
<style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;background:#f8edf2;padding:20px;color:#382b34}
main{max-width:450px;margin:30px auto;background:white;padding:24px;border-radius:17px}
h2{color:#b34d79}
input,button{width:100%;padding:13px;margin-top:12px;border:1px solid #ddd;border-radius:9px}
button{background:#b34d79;color:white;border:0;font-weight:bold;cursor:pointer}
a{display:block;background:#168b55;color:white;text-align:center;padding:13px;border-radius:9px;text-decoration:none;margin-top:12px}
.info{background:#fbedf3;padding:13px;border-radius:10px;margin-top:12px;overflow-wrap:anywhere}
.message{white-space:pre-wrap;overflow-wrap:anywhere}
</style>
</head>
<body>
<main>
<h2>🔐 Admin Secret Love Letter</h2>
<form id="searchForm">
<input id="key" type="password" placeholder="Masukkan Admin Key" required>
<input id="code" maxlength="8" placeholder="Masukkan kode surat" required>
<button type="submit">Cari Surat</button>
</form>
<div id="result"></div>
</main>

<script>
const form=document.getElementById('searchForm');
const result=document.getElementById('result');

form.addEventListener('submit',async e=>{
 e.preventDefault();
 result.textContent='Mencari surat...';

 try{
  const response=await fetch('/api/admin/find',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({
    key:document.getElementById('key').value,
    code:document.getElementById('code').value.trim()
   })
  });

  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Surat tidak ditemukan');

  result.innerHTML='';

  function addInfo(label,value,extraClass=''){
   const box=document.createElement('div');
   box.className='info '+extraClass;
   const heading=document.createElement('strong');
   heading.textContent=label;
   const content=document.createElement('p');
   content.textContent=value||'-';
   box.append(heading,content);
   result.append(box);
  }

  addInfo('Kode surat',data.code);
  addInfo('Nama pengirim',data.sender);
  addInfo('Nomor penerima',data.recipient_number);
  addInfo('Isi surat',data.message,'message');
  addInfo('Alasan mengirim',data.reason,'message');

  if(data.whatsappUrl){
   const link=document.createElement('a');
   link.href=data.whatsappUrl;
   link.target='_blank';
   link.rel='noopener';
   link.textContent='Buka WhatsApp untuk mengirim surat';
   result.append(link);
  }

  const done=document.createElement('button');
  done.textContent='Tandai sudah dikirim';
  done.onclick=async()=>{
   try{
    const r=await fetch('/api/admin/delivered',{
     method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({
      key:document.getElementById('key').value,
      code:data.code
     })
    });
    const d=await r.json();
    alert(d.message||d.error);
   }catch(err){alert('Gagal menghubungi server');}
  };
  result.append(done);

 }catch(error){
  result.textContent=error.message;
 }
});
</script>
</body>
</html>`;

function json(data,status=200){
 return new Response(JSON.stringify(data),{
  status,
  headers:{
   'Content-Type':'application/json; charset=utf-8',
   'Cache-Control':'no-store'
  }
 });
}

function normalizePhone(value){
 let number=String(value||'').replace(/[^0-9]/g,'');
 if(number.startsWith('0'))number='62'+number.slice(1);
 else if(number.startsWith('8'))number='62'+number;
 if(!/^[1-9][0-9]{7,14}$/.test(number))return null;
 return number;
}

function makeCode(){
 const value=crypto.getRandomValues(new Uint32Array(1))[0];
 return String(10000000+(value%90000000));
}

export default {
 async fetch(request,env){
  const url=new URL(request.url);

  if(request.method==='GET' && url.pathname==='/'){
   return new Response(page,{
    headers:{'Content-Type':'text/html; charset=utf-8'}
   });
  }

  if(request.method==='GET' && url.pathname==='/admin'){
   return new Response(adminPage,{
    headers:{'Content-Type':'text/html; charset=utf-8'}
   });
  }

  if(request.method==='POST' && url.pathname==='/api/letters'){
   try{
    const body=await request.json();
    const sender=String(body.sender||'').trim().slice(0,50);
    const recipient=normalizePhone(body.recipient_number);
    const message=String(body.message||'').trim();
    const reason=String(body.reason||'').trim();

    if(!sender||!recipient||!message||!reason){
     return json({error:'Semua kolom wajib diisi.'},400);
    }

    if(message.length>3000||reason.length>1000){
     return json({error:'Isi surat atau alasan terlalu panjang.'},400);
    }

    const now=Math.floor(Date.now()/1000);
    const expiry=now+30*24*60*60;
    let code;
    let saved=false;

    for(let attempt=0;attempt<5;attempt++){
     code=makeCode();
     try{
      await env.DB.prepare(
       'INSERT INTO letters (code,sender,recipient_number,message,reason,created_at,expires_at) VALUES (?,?,?,?,?,?,?)'
      ).bind(code,sender,recipient,message,reason,now,expiry).run();
      saved=true;
      break;
     }catch(err){
      // Coba kode baru jika terjadi benturan kode.
     }
    }

    if(!saved)return json({error:'Gagal membuat kode. Silakan coba lagi.'},500);

    const intermediary=normalizePhone(env.WHATSAPP_NUMBER||'');
    const whatsappUrl=intermediary
     ? 'https://wa.me/'+intermediary+'?text='+encodeURIComponent('Kode surat rahasia saya: '+code)
     : null;

    return json({ok:true,code,whatsappUrl});

   }catch(error){
    return json({error:'Tidak dapat menyimpan surat. Periksa database D1.'},500);
   }
  }

  if(request.method==='POST' && (
   url.pathname==='/api/admin/find' ||
   url.pathname==='/api/admin/delivered'
  )){
   try{
    const body=await request.json();

    if(!env.ADMIN_KEY||body.key!==env.ADMIN_KEY){
     return json({error:'Admin Key salah.'},401);
    }

    const code=String(body.code||'').trim();
    if(!/^[0-9]{8}$/.test(code)){
     return json({error:'Kode harus terdiri dari 8 angka.'},400);
    }

    if(url.pathname==='/api/admin/find'){
     const letter=await env.DB.prepare(
      'SELECT code,sender,recipient_number,message,reason,expires_at FROM letters WHERE code=?'
     ).bind(code).first();

     if(!letter||letter.expires_at<Math.floor(Date.now()/1000)){
      return json({error:'Surat tidak ditemukan atau sudah kedaluwarsa.'},404);
     }

     const text=
      'Secret Love Letter 💌\\n'+
      'Dari: '+letter.sender+'\\n\\n'+
      'Isi surat:\\n'+letter.message+'\\n\\n'+
      'Alasan:\\n'+letter.reason;

     const whatsappUrl='https://wa.me/'+letter.recipient_number+
      '?text='+encodeURIComponent(text);

     return json({...letter,whatsappUrl});
    }

    await env.DB.prepare(
     'INSERT INTO delivery_history (letter_code,delivered_at) VALUES (?,?) ON CONFLICT(letter_code) DO UPDATE SET delivered_at=excluded.delivered_at'
    ).bind(code,Math.floor(Date.now()/1000)).run();

    return json({ok:true,message:'Surat ditandai sudah dikirim.'});

   }catch(error){
    return json({error:'Terjadi kesalahan pada database.'},500);
   }
  }

  return new Response('Not found',{status:404});
 }
};
