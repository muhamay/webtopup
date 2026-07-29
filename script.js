// ====================================================
// 1. PENGATURAN ADMIN & ITEM TOP UP
// ====================================================
const ADMIN_WA = "628985025743"; // Ganti dengan nomor WA Admin (Gunakan awalan 62)

const TOPUP_ITEMS = [
  { id: "item1", name: "568 Diamonds", price: 138000 },
  { id: "item2", name: "875 Diamonds", price: 200000 },
  { id: "item3", name: "2010 Diamonds", price: 450000 },
  { id: "item4", name: "5000 Diamonds", price: 1000000 }
];

let selectedItem = null;
let currentTransaction = null;

// ====================================================
// 2. LOGIKA PILIHAN ITEM & FORM
// ====================================================
document.addEventListener("DOMContentLoaded", () => {
  renderItems();
});

function renderItems() {
  const container = document.getElementById("items-container");
  container.innerHTML = "";

  TOPUP_ITEMS.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.onclick = () => selectItem(item, card);
    card.innerHTML = `
      <div class="item-title">${item.name}</div>
      <div class="item-price">Rp ${item.price.toLocaleString("id-ID")}</div>
    `;
    container.appendChild(card);
  });
}

function selectItem(item, element) {
  selectedItem = item;
  document.querySelectorAll(".item-card").forEach(el => el.classList.remove("selected"));
  element.classList.add("selected");

  document.getElementById("total-text").innerText = `Rp ${item.price.toLocaleString("id-ID")}`;
  document.getElementById("btnSubmit").disabled = false;
}

// ====================================================
// 3. LOGIKA CHECKOUT & ANGKATE UNIK
// ====================================================
function handleCheckout(event) {
  event.preventDefault();

  const userId = document.getElementById("userId").value;
  const zoneId = document.getElementById("zoneId").value;

  if (!userId || !zoneId || !selectedItem) {
    alert("Mohon lengkapi semua data!");
    return;
  }

  // Generate 3 digit kode unik acak (contoh: 123) untuk mempermudah cek mutasi
  const uniqueCode = Math.floor(100 + Math.random() * 900);
  const totalWithUniqueCode = selectedItem.price + uniqueCode;
  const invoiceNo = "INV-" + Math.floor(100000 + Math.random() * 900000);

  currentTransaction = {
    invoiceNo,
    userId,
    zoneId,
    item: selectedItem.name,
    total: totalWithUniqueCode
  };

  // Tampilkan data ke Modal
  document.getElementById("invNo").innerText = invoiceNo;
  document.getElementById("invUser").innerText = `${userId} (${zoneId})`;
  document.getElementById("invItem").innerText = selectedItem.name;
  document.getElementById("uniqueAmount").innerText = `Rp ${totalWithUniqueCode.toLocaleString("id-ID")}`;

  document.getElementById("qrisModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("qrisModal").style.display = "none";
}

// ====================================================
// 4. KIRIM KONFIRMASI OTOMATIS KE WHATSAPP
// ====================================================
function sendWhatsAppConfirmation() {
  if (!currentTransaction) return;

  const text = `Halo Admin, saya sudah melakukan pembayaran via QRIS.

📌 *DETAIL TRANSAKSI:*
• *No. Invoice:* ${currentTransaction.invoiceNo}
• *User ID:* ${currentTransaction.userId} (${currentTransaction.zoneId})
• *Item:* ${currentTransaction.item}
• *Total Transfer:* Rp ${currentTransaction.total.toLocaleString("id-ID")}

Mohon segera diproses ya, terima kasih! (Bukti transfer saya lampirkan dibawah)`;

  const waUrl = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(text)}`;
  window.open(waUrl, "_blank");
}
