/* ---------------- Product data (defaults) ---------------- */
const DEFAULT_PRODUCTS = [
  {id:1, name:"Basmati Rice", cat:"Grains & Atta", unit:"5 kg", price:450, icon:"🍚"},
  {id:2, name:"Wheat Atta", cat:"Grains & Atta", unit:"5 kg", price:275, icon:"🌾"},
  {id:3, name:"Table Salt", cat:"Grains & Atta", unit:"1 kg", price:22, icon:"🧂"},
  {id:4, name:"Sugar", cat:"Grains & Atta", unit:"1 kg", price:48, icon:"🍬"},
  {id:5, name:"Toor Dal", cat:"Pulses & Dal", unit:"1 kg", price:165, icon:"🫘"},
  {id:6, name:"Moong Dal", cat:"Pulses & Dal", unit:"1 kg", price:150, icon:"🫘"},
  {id:7, name:"Chana Dal", cat:"Pulses & Dal", unit:"1 kg", price:120, icon:"🫘"},
  {id:8, name:"Turmeric Powder", cat:"Spices & Masala", unit:"200 g", price:65, icon:"🟡"},
  {id:9, name:"Red Chilli Powder", cat:"Spices & Masala", unit:"200 g", price:85, icon:"🌶️"},
  {id:10, name:"Garam Masala", cat:"Spices & Masala", unit:"100 g", price:95, icon:"🧉"},
  {id:11, name:"Sunflower Oil", cat:"Oil & Ghee", unit:"1 L", price:140, icon:"🛢️"},
  {id:12, name:"Pure Ghee", cat:"Oil & Ghee", unit:"500 ml", price:320, icon:"🧈"},
  {id:13, name:"Assam Tea", cat:"Tea & Beverages", unit:"250 g", price:110, icon:"🍵"},
  {id:14, name:"Instant Coffee", cat:"Tea & Beverages", unit:"100 g", price:180, icon:"☕"},
  {id:15, name:"Glucose Biscuits", cat:"Snacks & Biscuits", unit:"200 g", price:30, icon:"🍪"},
  {id:16, name:"Namkeen Mix", cat:"Snacks & Biscuits", unit:"200 g", price:55, icon:"🥨"},
  {id:17, name:"Bathing Soap", cat:"Daily Essentials", unit:"Pack of 4", price:120, icon:"🧼"},
  {id:18, name:"Detergent Powder", cat:"Daily Essentials", unit:"1 kg", price:95, icon:"🧴"},
];

const FREE_DELIVERY_THRESHOLD = 499;
const DELIVERY_FEE = 30;

/* ---- Admin password ----
   Change this value to set your own store password.
   (In a single HTML file the password lives here in the code, so it
   deters casual access but is not bank-grade security.) */
const ADMIN_PASSWORD = "sanjeev@123";
let isAdmin = false;

/* ---------------- Persistence (this browser) ----------------
   Products and orders are saved in this browser's local storage so the
   owner's edits and any orders survive a page reload. Note: storage is
   per-device — an order placed on a customer's phone is saved in THAT
   phone's browser, not synced to the owner's device. Syncing across
   devices would need a backend/server. */
const LS_PRODUCTS = "sp_products_v1";
const LS_ORDERS   = "sp_orders_v1";
const LS_LISTS    = "sp_list_uploads_v1";
const LS_SEEN_STATUS = "sp_seen_status_v1";
const LS_NOTIFY_PREF = "sp_notify_pref_v1";

function loadProducts(){
  try{
    const saved = JSON.parse(localStorage.getItem(LS_PRODUCTS));
    if(Array.isArray(saved) && saved.length) return saved;
  }catch(e){}
  return DEFAULT_PRODUCTS.map(p => ({...p}));
}
function saveProducts(){
  try{ localStorage.setItem(LS_PRODUCTS, JSON.stringify(products)); }catch(e){}
}
function loadOrders(){
  try{
    const saved = JSON.parse(localStorage.getItem(LS_ORDERS));
    if(Array.isArray(saved)) return saved;
  }catch(e){}
  return [];
}
function saveOrders(){
  try{ localStorage.setItem(LS_ORDERS, JSON.stringify(orders)); }catch(e){}
}
function loadListUploads(){
  try{
    const saved = JSON.parse(localStorage.getItem(LS_LISTS));
    if(Array.isArray(saved)) return saved;
  }catch(e){}
  return [];
}
function saveListUploads(){
  try{ localStorage.setItem(LS_LISTS, JSON.stringify(listUploads)); return true; }
  catch(e){ return false; }
}
function loadSeenStatus(){
  try{
    const saved = JSON.parse(localStorage.getItem(LS_SEEN_STATUS));
    if(saved && typeof saved === 'object') return saved;
  }catch(e){}
  return {};
}
function saveSeenStatus(){
  try{ localStorage.setItem(LS_SEEN_STATUS, JSON.stringify(seenStatus)); }catch(e){}
}

let products = loadProducts();
let orders = loadOrders();
let listUploads = loadListUploads();
let seenStatus = loadSeenStatus(); // { orderId: lastStatusCustomerHasSeen }

function findProduct(id){ return products.find(p => p.id === +id); }
function getCategories(){ return ["All", ...new Set(products.map(p => p.cat))]; }
function nextProductId(){ return products.reduce((m,p)=> Math.max(m, p.id), 0) + 1; }
function escapeHtml(s){ return String(s ?? "").replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

let cart = {};        // { productId: qty }
let activeCategory = "All";
let searchQuery = "";
let selectedPayment = "UPI";

/* Shop's real UPI details — used to build a genuine, dynamic-amount UPI QR / deep link.
   No backend or gateway account needed for this: it opens the customer's own UPI app
   pre-filled with the payee, amount and a note, same as any "Pay via UPI" button. */
const SHOP_UPI_ID = "priyanshugupta8009@okaxis";
const SHOP_UPI_NAME = "Sanjeev Provision Store";

function buildUpiLink(amount, orderId){
  const params = new URLSearchParams({
    pa: SHOP_UPI_ID,
    pn: SHOP_UPI_NAME,
    am: amount,
    cu: "INR",
    tn: `Order ${orderId}`
  });
  return `upi://pay?${params.toString()}`;
}

/* ---------------- Rendering: chips + grid ---------------- */
const chipsEl = document.getElementById('chips');
const gridEl = document.getElementById('productGrid');
const searchInput = document.getElementById('productSearch');
searchInput.addEventListener('input', ()=>{
  searchQuery = searchInput.value;
  renderGrid();
});

function renderChips(){
  const cats = getCategories();
  if(!cats.includes(activeCategory)) activeCategory = "All";
  chipsEl.innerHTML = cats.map(cat =>
    `<button class="chip ${cat===activeCategory ? 'active':''}" data-cat="${cat}">${cat}</button>`
  ).join('');
  chipsEl.querySelectorAll('.chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      activeCategory = btn.dataset.cat;
      renderChips();
      renderGrid();
    });
  });
}

function renderGrid(){
  let items = activeCategory === "All" ? products : products.filter(p=>p.cat===activeCategory);
  const q = searchQuery.trim().toLowerCase();
  if(q) items = items.filter(p => p.name.toLowerCase().includes(q));

  if(!items.length){
    gridEl.innerHTML = `<div class="no-results">🔎 No items match "${escapeHtml(searchQuery)}". Try a different search or browse a category.</div>`;
    return;
  }

  gridEl.innerHTML = items.map(p=>{
    const qty = cart[p.id] || 0;
    return `
    <div class="card">
      <div class="card-top">
        <div class="stamp stamp-icon">${p.icon}</div>
        <span class="unit-tag">${p.unit}</span>
      </div>
      <div>
        <span class="cat">${p.cat}</span>
        <h4>${p.name}</h4>
      </div>
      <div class="card-bottom">
        <div class="price">₹${p.price} <span>/ ${p.unit}</span></div>
        <div id="ctrl-${p.id}">
          ${p.available === false
            ? `<span class="unit-tag" style="color:var(--brick); border:1px solid var(--brick);">Out of stock</span>`
            : qty === 0
              ? `<button class="add-btn" data-add="${p.id}">Add</button>`
              : `<div class="qty-stepper">
                   <button data-minus="${p.id}" aria-label="Decrease quantity">−</button>
                   <span>${qty}</span>
                   <button data-plus="${p.id}" aria-label="Increase quantity">+</button>
                 </div>`
          }
        </div>
      </div>
    </div>`;
  }).join('');

  gridEl.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click', ()=>changeQty(+b.dataset.add, 1)));
  gridEl.querySelectorAll('[data-plus]').forEach(b=>b.addEventListener('click', ()=>changeQty(+b.dataset.plus, 1)));
  gridEl.querySelectorAll('[data-minus]').forEach(b=>b.addEventListener('click', ()=>changeQty(+b.dataset.minus, -1)));
}

function changeQty(id, delta){
  const current = cart[id] || 0;
  const next = current + delta;
  if(next <= 0){ delete cart[id]; } else { cart[id] = next; }
  renderGrid();
  renderCart();
}

/* ---------------- Cart drawer ---------------- */
const cartBody = document.getElementById('cartBody');
const cartCount = document.getElementById('cartCount');
const subtotalVal = document.getElementById('subtotalVal');
const deliveryVal = document.getElementById('deliveryVal');
const totalVal = document.getElementById('totalVal');
const checkoutBtn = document.getElementById('checkoutBtn');
const whatsappOrderBtn = document.getElementById('whatsappOrderBtn');

function cartTotals(){
  let subtotal = 0, count = 0;
  Object.entries(cart).forEach(([id, qty])=>{
    const p = findProduct(id);
    if(!p) return;
    subtotal += p.price * qty;
    count += qty;
  });
  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  return {subtotal, delivery, total: subtotal + delivery, count};
}

function renderCart(){
  const entries = Object.entries(cart);
  const {subtotal, delivery, total, count} = cartTotals();

  cartCount.textContent = count;

  if(entries.length === 0){
    cartBody.innerHTML = `
      <div class="empty-cart">
        <div class="stamp">🧺</div>
        <p>Your basket is empty.<br>Add a few items to get started.</p>
      </div>`;
    checkoutBtn.disabled = true;
    whatsappOrderBtn.disabled = true;
  }else{
    cartBody.innerHTML = entries.map(([id, qty])=>{
      const p = findProduct(id);
      if(!p) return '';
      return `
      <div class="cart-line">
        <div class="stamp stamp-icon">${p.icon}</div>
        <div class="cart-line-info">
          <h5>${p.name}</h5>
          <span class="lprice">₹${p.price * qty} <span style="color:var(--ink-soft); font-weight:400;">(${p.unit} × ${qty})</span></span>
        </div>
        <div class="qty-stepper">
          <button data-minus="${p.id}" aria-label="Decrease quantity">−</button>
          <span>${qty}</span>
          <button data-plus="${p.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>`;
    }).join('');
    checkoutBtn.disabled = false;
    whatsappOrderBtn.disabled = false;

    cartBody.querySelectorAll('[data-plus]').forEach(b=>b.addEventListener('click', ()=>changeQty(+b.dataset.plus, 1)));
    cartBody.querySelectorAll('[data-minus]').forEach(b=>b.addEventListener('click', ()=>changeQty(+b.dataset.minus, -1)));
  }

  subtotalVal.textContent = `₹${subtotal}`;
  deliveryVal.textContent = delivery === 0 ? (subtotal===0 ? "₹0" : "Free") : `₹${delivery}`;
  totalVal.textContent = `₹${total}`;
}

/* open/close drawer */
const drawer = document.getElementById('cartDrawer');
const backdrop = document.getElementById('backdrop');
function openCart(){ drawer.classList.add('open'); backdrop.classList.add('show'); }
function closeCart(){ drawer.classList.remove('open'); backdrop.classList.remove('show'); }
document.getElementById('openCartBtn').addEventListener('click', openCart);
document.getElementById('closeCartBtn').addEventListener('click', closeCart);
backdrop.addEventListener('click', ()=>{ closeCart(); closeModal(); });

/* ---------------- Checkout modal ---------------- */
const modalBackdrop = document.getElementById('modalBackdrop');
const modalContent = document.getElementById('modalContent');
let successPollInterval = null;
document.getElementById('closeModalBtn').addEventListener('click', closeModal);

function openModal(){ modalBackdrop.classList.add('show'); }
function closeModal(){
  modalBackdrop.classList.remove('show');
  if(successPollInterval){ clearInterval(successPollInterval); successPollInterval = null; }
}

checkoutBtn.addEventListener('click', ()=>{
  closeCart();
  renderCheckoutForm();
  openModal();
});

/* ---- Send order via WhatsApp — a lightweight alternate channel. It opens
   the shop's WhatsApp chat with the cart pre-filled as a message; the
   customer sends their name/address in chat, and the store confirms
   directly there. NOTE: this bypasses the site's own order system, so it
   won't appear in the admin dashboard or "My Orders" tracker — it's a
   parallel path for customers who'd rather just message the shop. */
const STORE_WHATSAPP_NUMBER = "918707397039";
function buildWhatsAppOrderMessage(){
  const {subtotal, delivery, total} = cartTotals();
  const lines = Object.entries(cart).map(([id, qty])=>{
    const p = findProduct(id);
    return p ? `• ${p.name} (${p.unit}) x${qty} — ₹${p.price * qty}` : null;
  }).filter(Boolean);
  return [
    "Hi Sanjeev Provision Store! I'd like to order:",
    "",
    ...lines,
    "",
    `Subtotal: ₹${subtotal}`,
    `Delivery: ${delivery === 0 ? "Free" : "₹" + delivery}`,
    `Total: ₹${total}`,
    "",
    "My name: ",
    "My delivery address: "
  ].join("\n");
}
whatsappOrderBtn.addEventListener('click', ()=>{
  if(Object.keys(cart).length === 0) return;
  const msg = buildWhatsAppOrderMessage();
  window.open(`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
});

function renderCheckoutForm(){
  const {total} = cartTotals();
  modalContent.innerHTML = `
    <h3>Checkout</h3>
    <p class="muted">Tell us where to send your order.</p>
    <div class="field">
      <label>Full name</label>
      <input type="text" id="custName" placeholder="e.g. Priya Shah">
    </div>
    <div class="field">
      <label>Phone number</label>
      <input type="tel" id="custPhone" placeholder="e.g. 98765 43210">
    </div>
    <div class="field">
      <label>Delivery address</label>
      <textarea id="custAddress" rows="3" placeholder="House no., street, area, city"></textarea>
    </div>
    <div class="field">
      <label>Payment method</label>
      <div class="pay-options" id="payOptions">
        <div class="pay-opt active" data-pay="UPI">📱 UPI</div>
        <div class="pay-opt" data-pay="Card">💳 Card</div>
        <div class="pay-opt" data-pay="COD">💵 Cash on Delivery</div>
      </div>
    </div>
    <button class="checkout-btn" id="payNowBtn">Pay ₹${total}</button>
  `;

  selectedPayment = "UPI";
  document.querySelectorAll('.pay-opt').forEach(opt=>{
    opt.addEventListener('click', ()=>{
      document.querySelectorAll('.pay-opt').forEach(o=>o.classList.remove('active'));
      opt.classList.add('active');
      selectedPayment = opt.dataset.pay;
    });
  });

  document.getElementById('payNowBtn').addEventListener('click', handlePayment);
}

let pendingOrder = null; // {name, phone, address, orderId, total}

function handlePayment(){
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();

  if(!name || !phone || !address){
    alert("Please fill in your name, phone number and delivery address.");
    return;
  }

  const {total} = cartTotals();
  const orderId = "SP" + Math.floor(1000 + Math.random()*9000);
  pendingOrder = {name, phone, address, orderId, total, payment: selectedPayment, items: snapshotItems()};

  if(selectedPayment === "UPI"){
    renderUpiPayment();
  }else if(selectedPayment === "COD"){
    renderCodConfirm();
  }else{
    renderCardProcessing();
  }
}

/* ---- Real UPI flow: dynamic QR + deep link to the shop's own UPI ID ---- */
function renderUpiPayment(){
  const {total, orderId} = pendingOrder;
  const upiLink = buildUpiLink(total, orderId);

  modalContent.innerHTML = `
    <h3>Pay via UPI</h3>
    <p class="muted">Scan with any UPI app, or tap the button below on your phone.</p>
    <div class="qr-wrap">
      <div class="qr-box" id="qrBox"></div>
      <div class="qr-amount">₹${total}</div>
      <div class="qr-upi-id">${SHOP_UPI_NAME} · ${SHOP_UPI_ID}</div>
      <a class="upi-app-btn" href="${upiLink}">Open in UPI app</a>
    </div>
    <button class="confirm-paid-btn" id="confirmPaidBtn">I've completed the payment</button>
    <p class="gateway-note">This QR is generated live for this order's exact amount and pays directly into the shop's UPI account. Since there's no connected payment gateway, please tap the button above once the payment goes through.</p>
  `;

  new QRCode(document.getElementById('qrBox'), {
    text: upiLink,
    width: 180,
    height: 180,
    colorDark: "#1F4D3D",
    colorLight: "#ffffff"
  });

  document.getElementById('confirmPaidBtn').addEventListener('click', ()=>{
    renderSuccessAndTrack(pendingOrder.name);
  });
}

/* ---- Cash on delivery: no online payment needed ---- */
function renderCodConfirm(){
  modalContent.innerHTML = `
    <div class="center-state">
      <div class="spinner"></div>
      <h3>Placing your order…</h3>
      <p class="muted">You'll pay ₹${pendingOrder.total} in cash when it arrives.</p>
    </div>
  `;
  setTimeout(()=> renderSuccessAndTrack(pendingOrder.name), 1200);
}

/* ---- Card: demo simulation until a gateway (Razorpay/PhonePe) is connected ---- */
function renderCardProcessing(){
  modalContent.innerHTML = `
    <div class="center-state">
      <div class="spinner"></div>
      <h3>Processing card payment…</h3>
      <p class="muted">Confirming your ₹${pendingOrder.total} payment. Please don't close this window.</p>
      <p class="gateway-note">Card payments are a demo here — connecting a real gateway (Razorpay/PhonePe) needs a business account and a small backend to keep the API keys safe.</p>
    </div>
  `;
  setTimeout(()=> renderSuccessAndTrack(pendingOrder.name), 1800);
}

/* ---------------- Success + live tracker ---------------- */

function renderSuccessAndTrack(name){
  const total = pendingOrder ? pendingOrder.total : cartTotals().total;
  const orderId = pendingOrder ? pendingOrder.orderId : ("SP" + Math.floor(1000 + Math.random()*9000));

  if(pendingOrder){
    orders.unshift({
      orderId: pendingOrder.orderId,
      name: pendingOrder.name,
      phone: pendingOrder.phone,
      address: pendingOrder.address,
      payment: pendingOrder.payment,
      total: pendingOrder.total,
      items: pendingOrder.items || [],
      status: "Confirmed",
      placedAt: new Date().toISOString()
    });
    saveOrders();
    seenStatus[pendingOrder.orderId] = "Confirmed";
    saveSeenStatus();
  }

  modalContent.innerHTML = `
    <div class="center-state">
      <div class="stamp success-stamp">✓</div>
      <h3>Order placed!</h3>
      <p class="muted">Thanks ${name.split(' ')[0]}, order <b style="color:var(--ink)">#${orderId}</b> (₹${total}) has been placed.</p>
    </div>

    <div id="liveTrackerWrap">${renderFullTracker("Confirmed")}</div>
    <p class="upload-note">The store updates this status as your order moves along — it'll refresh here on its own, and you can check it anytime from "My Orders".</p>

    <button class="continue-btn" id="continueBtn">Continue Shopping</button>
  `;

  document.getElementById('continueBtn').addEventListener('click', ()=>{
    cart = {};
    pendingOrder = null;
    renderGrid();
    renderCart();
    closeModal();
  });

  // Reflect the ACTUAL status set by the store owner in the admin dashboard —
  // never advanced automatically on a timer.
  if(successPollInterval) clearInterval(successPollInterval);
  successPollInterval = setInterval(()=>{
    const fresh = loadOrders().find(o => o.orderId === orderId);
    const wrap = document.getElementById('liveTrackerWrap');
    if(!fresh || !wrap) return;
    wrap.innerHTML = renderFullTracker(fresh.status);
    if(fresh.status === "Delivered"){
      clearInterval(successPollInterval);
      successPollInterval = null;
    }
  }, 4000);
}

/* ================= List photo upload (customer) =================
   Lets a customer photograph a handwritten/typed shopping list and send
   it straight through, instead of picking items one by one. Like orders,
   this is saved in this browser's localStorage — the admin will see it
   when they open the dashboard on the SAME device/browser it was sent
   from (a real cross-device inbox would need a small backend). Images
   are resized/compressed in the browser first so they don't blow past
   localStorage's limit. */
const listModalBackdrop = document.getElementById('listModalBackdrop');
const listModalContent = document.getElementById('listModalContent');
document.getElementById('openListUploadBtn').addEventListener('click', ()=>{
  renderListUploadForm();
  listModalBackdrop.classList.add('show');
});
document.getElementById('listModalClose').addEventListener('click', closeListModal);
listModalBackdrop.addEventListener('click', e=>{ if(e.target === listModalBackdrop) closeListModal(); });
function closeListModal(){ listModalBackdrop.classList.remove('show'); }

let pendingListImage = null; // compressed base64 data URL

function renderListUploadForm(){
  pendingListImage = null;
  listModalContent.innerHTML = `
    <h3>Send us your list</h3>
    <p class="muted">Snap a photo of your shopping list (handwritten is fine) and we'll get it ready for you.</p>

    <div class="field">
      <label>Photo of your list</label>
      <label class="upload-drop" id="uploadDropZone">
        <div class="u-icon">📷</div>
        <div class="u-text">Tap to take a photo or choose from gallery</div>
        <div class="u-sub">JPG or PNG, one photo per list</div>
        <input type="file" id="listImageInput" accept="image/*" capture="environment">
      </label>
      <div id="uploadPreviewWrap"></div>
    </div>

    <div class="field">
      <label>Full name</label>
      <input type="text" id="listName" placeholder="e.g. Priya Shah">
    </div>
    <div class="field">
      <label>Phone number</label>
      <input type="tel" id="listPhone" placeholder="e.g. 98765 43210">
    </div>
    <div class="field">
      <label>Note (optional)</label>
      <textarea id="listNote" rows="2" placeholder="Anything else we should know — delivery time, substitutions, etc."></textarea>
    </div>

    <button class="checkout-btn" id="sendListBtn">Send List to Store</button>
    <p class="upload-note">We'll review your photo and confirm the order with you by phone before packing it.</p>
  `;

  const fileInput = document.getElementById('listImageInput');
  fileInput.addEventListener('change', e=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    compressImage(file, 1280, 0.72).then(dataUrl=>{
      pendingListImage = dataUrl;
      renderUploadPreview();
    }).catch(()=>{
      alert("Sorry, that photo couldn't be read. Please try another one.");
    });
  });

  document.getElementById('sendListBtn').addEventListener('click', submitListUpload);
}

function renderUploadPreview(){
  const wrap = document.getElementById('uploadPreviewWrap');
  if(!pendingListImage){ wrap.innerHTML = ''; return; }
  wrap.innerHTML = `
    <div class="upload-preview">
      <img src="${pendingListImage}" alt="Your list photo">
      <button class="u-remove" id="removeUploadBtn" type="button" aria-label="Remove photo">✕</button>
    </div>`;
  document.getElementById('removeUploadBtn').addEventListener('click', ()=>{
    pendingListImage = null;
    document.getElementById('listImageInput').value = '';
    renderUploadPreview();
  });
}

/* Resize + re-encode the photo client-side so a phone photo (often several
   MB) doesn't fill up localStorage. Keeps things well under the ~5MB
   per-origin limit even after a few uploads. */
function compressImage(file, maxDim, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = ()=>{
      const img = new Image();
      img.onerror = reject;
      img.onload = ()=>{
        let {width, height} = img;
        if(width > maxDim || height > maxDim){
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function submitListUpload(){
  const name = document.getElementById('listName').value.trim();
  const phone = document.getElementById('listPhone').value.trim();
  const note = document.getElementById('listNote').value.trim();

  if(!pendingListImage){ alert("Please add a photo of your list first."); return; }
  if(!name || !phone){ alert("Please enter your name and phone number."); return; }

  listUploads.unshift({
    id: "L" + Date.now().toString().slice(-8),
    name, phone, note,
    image: pendingListImage,
    status: "New",
    uploadedAt: new Date().toISOString()
  });

  const ok = saveListUploads();
  if(!ok){
    listUploads.shift(); // roll back — storage was full
    alert("Sorry, that photo was too large to send. Please try a smaller or less detailed photo.");
    return;
  }

  listModalContent.innerHTML = `
    <div class="center-state">
      <div class="stamp success-stamp">✓</div>
      <h3>List sent!</h3>
      <p class="muted">Thanks ${escapeHtml(name.split(' ')[0])}, we've received your list photo. We'll call you at ${escapeHtml(phone)} shortly to confirm your order.</p>
    </div>
    <button class="continue-btn" id="closeListSuccessBtn">Done</button>
  `;
  document.getElementById('closeListSuccessBtn').addEventListener('click', closeListModal);
}

/* ---- Admin: viewing list uploads ---- */
const adminListUploads = document.getElementById('adminListUploads');
const LIST_STATUSES = ["New", "Reviewed", "Order placed"];

function renderAdminListUploads(){
  if(!listUploads.length){
    adminListUploads.innerHTML = `<div class="admin-empty"><div class="stamp">📷</div><p>No list photos yet.<br>Photos customers send in will appear here.</p></div>`;
    return;
  }
  adminListUploads.innerHTML = listUploads.map((u, idx)=>`
    <div class="lu-card">
      <img class="lu-thumb" src="${u.image}" data-view="${idx}" alt="List photo from ${escapeHtml(u.name)}">
      <div class="lu-info">
        <h4>${escapeHtml(u.name)}</h4>
        <div class="cust">📞 ${escapeHtml(u.phone)}</div>
        ${u.note ? `<div class="note">"${escapeHtml(u.note)}"</div>` : ''}
      </div>
      <div class="lu-meta">
        <span class="lu-date">${fmtDate(u.uploadedAt)}</span>
        <select class="status-select" data-lustatus="${idx}">
          ${LIST_STATUSES.map(s=>`<option value="${s}" ${s === u.status ? 'selected':''}>${s}</option>`).join('')}
        </select>
        <button class="mini-btn danger" data-deluplist="${idx}">Delete</button>
      </div>
    </div>`).join('');

  adminListUploads.querySelectorAll('[data-view]').forEach(img=>img.addEventListener('click', ()=>{
    window.open(listUploads[+img.dataset.view].image, '_blank');
  }));
  adminListUploads.querySelectorAll('[data-lustatus]').forEach(sel=>sel.addEventListener('change', ()=>{
    listUploads[+sel.dataset.lustatus].status = sel.value;
    saveListUploads();
  }));
  adminListUploads.querySelectorAll('[data-deluplist]').forEach(b=>b.addEventListener('click', ()=>{
    if(!confirm("Delete this list photo?")) return;
    listUploads.splice(+b.dataset.deluplist, 1);
    saveListUploads();
    renderAdminListUploads();
  }));
}

/* ---------------- Order snapshot helper ---------------- */
function snapshotItems(){
  return Object.entries(cart).map(([id, qty])=>{
    const p = findProduct(id);
    return p ? {id:p.id, name:p.name, unit:p.unit, price:p.price, qty} : null;
  }).filter(Boolean);
}

/* ================= My Orders + status notifications (customer) =================
   A customer's own order history lives in THIS browser's localStorage (it's
   populated the moment they check out here). If the store owner updates an
   order's status from the SAME browser — e.g. a second tab, or a shared
   shop device — that update is picked up below and the customer is notified,
   including a real OS-level notification if they've allowed it. Checking
   status from a different phone/device than the one used to order would
   need a small backend to sync data between devices; this covers everything
   possible without one. */

const STATUS_STEP_ICONS = {0:"🏬", 1:"📦", 2:"🛵", 3:"🏠"};
const STATUS_MESSAGES = {
  "Confirmed": "Your order is confirmed and headed to packing.",
  "Packed": "We're weighing and packing your items right now.",
  "Out for delivery": "Your order has left the store — out for delivery.",
  "Delivered": "Delivered! Your groceries are at your doorstep. Enjoy 🎉"
};

let unseenOrderUpdates = 0;
const ordersNotifyDot = document.getElementById('ordersNotifyDot');

function statusIndex(status){
  const i = STATUSES.indexOf(status);
  return i === -1 ? 0 : i;
}

function renderStatusPill(status){
  const cls = status === "Out for delivery" ? "out" : status === "Delivered" ? "delivered" : status === "Cancelled" ? "cancelled" : "";
  const icon = status === "Cancelled" ? "✕" : STATUS_STEP_ICONS[statusIndex(status)];
  return `<span class="myord-status-pill ${cls}">${icon} ${escapeHtml(status)}</span>`;
}

function renderMiniTracker(status){
  if(status === "Cancelled"){
    return `<div class="cancelled-block"><span class="c-icon">✕</span><p>This order was cancelled and will not be delivered.</p></div>`;
  }
  const idx = statusIndex(status);
  const fillPct = [0, 33, 66, 100][idx];
  return `
    <div class="tracker">
      <div class="steps">
        <div class="fill" style="width:${fillPct}%"></div>
        ${STATUSES.map((s,i)=>`
          <div class="step ${i < idx ? 'done' : i === idx ? 'active' : ''}">
            <div class="dot">${i < idx ? '✓' : STATUS_STEP_ICONS[i]}</div>
            <span>${s}</span>
          </div>`).join('')}
      </div>
      <p class="track-msg">${STATUS_MESSAGES[status] || ''}</p>
    </div>`;
}

const ROUTE_META = [
  {pct:0,  icon:"🏬", label:"Sitting pretty at the store"},
  {pct:12, icon:"📦", label:"Being packed at the counter"},
  {pct:88, icon:"🛵", label:"On the way to you"},
  {pct:100,icon:"🏠", label:"Arrived at your doorstep"}
];

/* Full tracker with the steps bar + route visual, always drawn from the
   order's REAL status (as set by the store owner in the admin dashboard) —
   never advanced automatically on a timer. Used on the checkout success
   screen, where it polls for the store's actual updates. */
function renderFullTracker(status){
  if(status === "Cancelled"){
    return `<div class="cancelled-block"><span class="c-icon">✕</span><p>This order was cancelled and will not be delivered.</p></div>`;
  }
  const idx = statusIndex(status);
  const fillPct = [0, 33, 66, 100][idx];
  const route = ROUTE_META[idx];
  return `
    <div class="tracker">
      <div class="steps">
        <div class="fill" style="width:${fillPct}%"></div>
        ${STATUSES.map((s,i)=>`
          <div class="step ${i < idx ? 'done' : i === idx ? 'active' : ''}">
            <div class="dot">${i < idx ? '✓' : STATUS_STEP_ICONS[i]}</div>
            <span>${s}</span>
          </div>`).join('')}
      </div>
      <div class="route">
        <div class="scooter" style="left:${route.pct}%;">${route.icon}</div>
        <div class="route-label">${route.label}</div>
      </div>
      <p class="track-msg">${STATUS_MESSAGES[status] || ''}</p>
    </div>`;
}

const myOrdersModalBackdrop = document.getElementById('myOrdersModalBackdrop');
const myOrdersModalContent = document.getElementById('myOrdersModalContent');
document.getElementById('openMyOrdersBtn').addEventListener('click', ()=>{
  unseenOrderUpdates = 0;
  updateNotifyDot();
  renderMyOrders();
  myOrdersModalBackdrop.classList.add('show');
});
document.getElementById('myOrdersModalClose').addEventListener('click', ()=>myOrdersModalBackdrop.classList.remove('show'));
myOrdersModalBackdrop.addEventListener('click', e=>{ if(e.target === myOrdersModalBackdrop) myOrdersModalBackdrop.classList.remove('show'); });

function updateNotifyDot(){
  ordersNotifyDot.style.display = unseenOrderUpdates > 0 ? '' : 'none';
}

function renderMyOrders(){
  orders = loadOrders(); // pick up any change made in another tab/device on this browser
  const notifyOn = localStorage.getItem(LS_NOTIFY_PREF) === 'granted' && typeof Notification !== 'undefined' && Notification.permission === 'granted';

  const notifyBlock = (typeof Notification === 'undefined') ? '' : `
    <div class="notify-toggle">
      <div>
        <div class="nt-label">🔔 Order notifications</div>
        <div class="nt-sub">${notifyOn ? "You'll be notified when your order status changes." : "Get notified the moment your order is out for delivery."}</div>
      </div>
      <button id="notifyToggleBtn" class="${notifyOn ? 'on' : ''}">${notifyOn ? 'Enabled ✓' : 'Enable'}</button>
    </div>`;

  if(!orders.length){
    myOrdersModalContent.innerHTML = `
      <h3>My Orders</h3>
      <p class="muted">Orders you place from this device will show up here.</p>
      ${notifyBlock}
      <div class="admin-empty"><div class="stamp">📦</div><p>No orders yet.<br>Once you check out, you'll be able to track it right here.</p></div>
    `;
  }else{
    myOrdersModalContent.innerHTML = `
      <h3>My Orders</h3>
      <p class="muted">Track the status of orders placed from this device.</p>
      ${notifyBlock}
      ${orders.map((o, idx)=>`
        <div class="myord-card">
          <div class="myord-top">
            <h4>Order <span class="oid">#${escapeHtml(o.orderId)}</span></h4>
            ${renderStatusPill(o.status)}
          </div>
          <div class="myord-date">${fmtDate(o.placedAt)}</div>
          ${renderMiniTracker(o.status)}
          <div class="myord-total">${o.items ? o.items.length : 0} item(s) · Total <b>₹${o.total}</b></div>
          <div class="myord-actions">
            <button class="mini-btn" data-reorder="${idx}">↻ Reorder</button>
            ${o.status === "Confirmed" ? `<button class="mini-btn danger" data-cancelorder="${idx}">Cancel order</button>` : ''}
          </div>
        </div>
      `).join('')}
    `;
  }

  myOrdersModalContent.querySelectorAll('[data-reorder]').forEach(b=>b.addEventListener('click', ()=>{
    reorderItems(orders[+b.dataset.reorder]);
  }));
  myOrdersModalContent.querySelectorAll('[data-cancelorder]').forEach(b=>b.addEventListener('click', ()=>{
    cancelOrder(orders[+b.dataset.cancelorder].orderId);
  }));

  if(typeof Notification !== 'undefined'){
    const btn = document.getElementById('notifyToggleBtn');
    if(btn) btn.addEventListener('click', ()=>{
      if(Notification.permission === 'granted'){
        localStorage.setItem(LS_NOTIFY_PREF, 'granted');
        renderMyOrders();
        return;
      }
      Notification.requestPermission().then(perm=>{
        localStorage.setItem(LS_NOTIFY_PREF, perm === 'granted' ? 'granted' : 'denied');
        renderMyOrders();
      });
    });
  }
}

/* ---- Reorder: refill the cart from a past order's items ---- */
function reorderItems(order){
  if(!order || !order.items || !order.items.length){
    alert("Sorry, this order doesn't have item details saved to reorder.");
    return;
  }
  let added = 0, skipped = 0;
  order.items.forEach(it=>{
    if(it.id === undefined || it.id === null){ skipped++; return; }
    const p = findProduct(it.id);
    if(!p || p.available === false){ skipped++; return; }
    cart[p.id] = (cart[p.id] || 0) + it.qty;
    added++;
  });
  renderGrid();
  renderCart();
  myOrdersModalBackdrop.classList.remove('show');

  if(added === 0){
    showToast('⚠️', "Couldn't reorder", "None of those items are available right now.");
    return;
  }
  showToast('🧺', "Added to your basket",
    skipped ? `${added} item(s) added — ${skipped} item(s) are no longer available.` : `${added} item(s) added to your basket.`);
  openCart();
}

/* ---- Cancel: customer can cancel only while status is still "Confirmed" ---- */
function cancelOrder(orderId){
  if(!confirm("Cancel this order? This can't be undone.")) return;
  orders = loadOrders();
  const o = orders.find(x => x.orderId === orderId);
  if(!o) return;
  if(o.status !== "Confirmed"){
    alert("This order is already being prepared and can no longer be cancelled from here. Please call the store.");
    renderMyOrders();
    return;
  }
  o.status = "Cancelled";
  saveOrders();
  seenStatus[orderId] = "Cancelled"; // don't re-notify the customer about their own cancellation
  saveSeenStatus();
  renderMyOrders();
}

/* ---- Toast (in-page) ---- */
const toastStack = document.getElementById('toastStack');
function showToast(icon, title, body, variant){
  const el = document.createElement('div');
  el.className = 'toast' + (variant ? ' ' + variant : '');
  el.innerHTML = `<div class="t-icon">${icon}</div><div class="t-text"><b>${escapeHtml(title)}</b><span>${escapeHtml(body)}</span></div>`;
  el.addEventListener('click', ()=>{
    el.remove();
    unseenOrderUpdates = 0;
    updateNotifyDot();
    renderMyOrders();
    myOrdersModalBackdrop.classList.add('show');
  });
  toastStack.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 7000);
}

/* ---- Poll for status changes made elsewhere on this browser ---- */
function checkForStatusUpdates(){
  const fresh = loadOrders();
  let changed = false;
  fresh.forEach(o=>{
    const last = seenStatus[o.orderId];
    if(last === undefined){
      // an order we haven't tracked yet (e.g. seeded before this feature existed)
      seenStatus[o.orderId] = o.status;
      changed = true;
      return;
    }
    if(last !== o.status){
      seenStatus[o.orderId] = o.status;
      changed = true;
      unseenOrderUpdates++;
      updateNotifyDot();

      const isOut = o.status === "Out for delivery";
      const isCancelled = o.status === "Cancelled";
      const icon = isCancelled ? "✕" : STATUS_STEP_ICONS[statusIndex(o.status)];
      const title = isOut ? "Your order is out for delivery! 🛵"
        : isCancelled ? `Order #${o.orderId} was cancelled`
        : `Order #${o.orderId}: ${o.status}`;
      const body = isCancelled ? "The store has cancelled this order." : (STATUS_MESSAGES[o.status] || `Status updated to "${o.status}".`);
      showToast(icon, title, body, isOut ? 'out' : '');

      if(typeof Notification !== 'undefined' && Notification.permission === 'granted'){
        try{
          new Notification(title, {body, icon: undefined, tag: 'sp-order-' + o.orderId});
        }catch(e){}
      }

      if(myOrdersModalBackdrop.classList.contains('show')) renderMyOrders();
    }
  });
  orders = fresh;
  if(changed) saveSeenStatus();
}

setInterval(checkForStatusUpdates, 4000);
window.addEventListener('storage', e=>{
  if(e.key === LS_ORDERS) checkForStatusUpdates();
});

/* ================= Opening portal ================= */
const portal = document.getElementById('portal');
const portalChoices = document.getElementById('portalChoices');
const portalLogin = document.getElementById('portalLogin');
const adminPass = document.getElementById('adminPass');
const loginError = document.getElementById('loginError');

function showPortal(){
  isAdmin = false;
  document.body.classList.remove('admin-mode');
  document.body.classList.add('portal-open');
  portal.classList.remove('hide');
  portalChoices.style.display = "";
  portalLogin.style.display = "none";
  adminPass.value = "";
  loginError.textContent = "";
  window.scrollTo(0, 0);
}
function enterStore(){
  document.body.classList.remove('portal-open','admin-mode');
  portal.classList.add('hide');
}
function enterAdmin(){
  isAdmin = true;
  document.body.classList.remove('portal-open');
  document.body.classList.add('admin-mode');
  portal.classList.add('hide');
  window.scrollTo(0, 0);
  renderAdminProducts();
  renderAdminOrders();
  renderAdminListUploads();
}

document.getElementById('enterCustomer').addEventListener('click', enterStore);
document.getElementById('enterAdmin').addEventListener('click', ()=>{
  portalChoices.style.display = "none";
  portalLogin.style.display = "";
  loginError.textContent = "";
  adminPass.value = "";
  adminPass.focus();
});
document.getElementById('backToChoices').addEventListener('click', ()=>{
  portalChoices.style.display = "";
  portalLogin.style.display = "none";
});
function attemptLogin(){
  if(adminPass.value === ADMIN_PASSWORD){
    enterAdmin();
  }else{
    loginError.textContent = "Incorrect password. Please try again.";
    adminPass.select();
  }
}
document.getElementById('adminLoginBtn').addEventListener('click', attemptLogin);
adminPass.addEventListener('keydown', e=>{ if(e.key === 'Enter') attemptLogin(); });

document.getElementById('logoutBtn').addEventListener('click', showPortal);
document.getElementById('openPortalLink').addEventListener('click', e=>{ e.preventDefault(); showPortal(); });

/* ================= Admin dashboard ================= */
document.querySelectorAll('.admin-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.tab;
    document.getElementById('panel-products').classList.toggle('active', which === 'products');
    document.getElementById('panel-orders').classList.toggle('active', which === 'orders');
    document.getElementById('panel-lists').classList.toggle('active', which === 'lists');
  });
});

/* ---- Products management ---- */
const adminProductList = document.getElementById('adminProductList');

function renderAdminProducts(){
  if(!products.length){
    adminProductList.innerHTML = `<div class="admin-empty"><div class="stamp">🛒</div><p>No products yet. Add your first item.</p></div>`;
    return;
  }
  adminProductList.innerHTML = products.map(p=>`
    <div class="adm-product">
      <div class="stamp stamp-icon">${p.icon || "🛍️"}</div>
      <div class="info">
        <h4>${escapeHtml(p.name)}${p.available === false ? '<span class="oos-badge">Out of stock</span>' : ''}</h4>
        <div class="meta">${escapeHtml(p.cat)} · ${escapeHtml(p.unit)}</div>
      </div>
      <div class="price">₹${p.price}</div>
      <div class="adm-actions">
        <button class="mini-btn" data-edit="${p.id}">Edit</button>
        <button class="mini-btn danger" data-del="${p.id}">Delete</button>
      </div>
    </div>`).join('');
  adminProductList.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click', ()=>openProductForm(+b.dataset.edit)));
  adminProductList.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', ()=>deleteProduct(+b.dataset.del)));
}

function refreshStorefront(){
  renderChips(); renderGrid(); renderCart();
}

function deleteProduct(id){
  const p = findProduct(id);
  if(!p) return;
  if(!confirm(`Remove "${p.name}" from the store?`)) return;
  products = products.filter(pr=>pr.id !== id);
  delete cart[id];
  saveProducts();
  renderAdminProducts();
  refreshStorefront();
}

/* product editor (reuses the modal styling) */
const admModalBackdrop = document.getElementById('admModalBackdrop');
const admModalContent = document.getElementById('admModalContent');
document.getElementById('admModalClose').addEventListener('click', closeAdmModal);
admModalBackdrop.addEventListener('click', e=>{ if(e.target === admModalBackdrop) closeAdmModal(); });
function openAdmModal(){ admModalBackdrop.classList.add('show'); }
function closeAdmModal(){ admModalBackdrop.classList.remove('show'); }

document.getElementById('addProductBtn').addEventListener('click', ()=>openProductForm());

function openProductForm(id){
  const editing = id != null;
  const p = editing ? findProduct(id) : {name:"", cat:"", unit:"", price:"", icon:"🛍️", available:true};
  if(editing && !p) return;
  let avail = p.available !== false;

  admModalContent.innerHTML = `
    <h3>${editing ? "Edit product" : "Add product"}</h3>
    <p class="muted">${editing ? "Update the details for this item." : "Fill in the details for the new item."}</p>
    <div class="field"><label>Name</label><input type="text" id="fName" value="${escapeHtml(p.name)}" placeholder="e.g. Basmati Rice"></div>
    <div class="field"><label>Category</label>
      <input type="text" id="fCat" list="catList" value="${escapeHtml(p.cat)}" placeholder="e.g. Grains & Atta">
      <datalist id="catList">${[...new Set(products.map(x=>x.cat))].map(c=>`<option value="${escapeHtml(c)}"></option>`).join('')}</datalist>
    </div>
    <div class="field"><label>Unit / pack size</label><input type="text" id="fUnit" value="${escapeHtml(p.unit)}" placeholder="e.g. 1 kg"></div>
    <div class="field"><label>Price (₹)</label><input type="number" id="fPrice" min="0" step="1" value="${p.price}" placeholder="e.g. 120"></div>
    <div class="field"><label>Icon (emoji)</label><input type="text" id="fIcon" value="${escapeHtml(p.icon || '🛍️')}" maxlength="4" placeholder="🍚"></div>
    <div class="field">
      <label>Availability</label>
      <div class="pay-options" id="availOpts">
        <div class="pay-opt ${avail ? 'active' : ''}" data-avail="1">✅ In stock</div>
        <div class="pay-opt ${avail ? '' : 'active'}" data-avail="0">🚫 Out of stock</div>
      </div>
    </div>
    <button class="checkout-btn" id="saveProductBtn">${editing ? "Save changes" : "Add product"}</button>
  `;

  admModalContent.querySelectorAll('[data-avail]').forEach(o=>o.addEventListener('click', ()=>{
    admModalContent.querySelectorAll('[data-avail]').forEach(x=>x.classList.remove('active'));
    o.classList.add('active');
    avail = o.dataset.avail === "1";
  }));

  document.getElementById('saveProductBtn').addEventListener('click', ()=>{
    const name = document.getElementById('fName').value.trim();
    const cat = document.getElementById('fCat').value.trim() || "Other";
    const unit = document.getElementById('fUnit').value.trim() || "1 unit";
    const price = parseInt(document.getElementById('fPrice').value, 10);
    const icon = document.getElementById('fIcon').value.trim() || "🛍️";
    if(!name){ alert("Please enter a product name."); return; }
    if(isNaN(price) || price < 0){ alert("Please enter a valid price."); return; }
    if(editing){
      Object.assign(p, {name, cat, unit, price, icon, available:avail});
    }else{
      products.push({id: nextProductId(), name, cat, unit, price, icon, available:avail});
    }
    saveProducts();
    closeAdmModal();
    renderAdminProducts();
    refreshStorefront();
  });

  openAdmModal();
}

/* ---- Orders ---- */
const adminOrderList = document.getElementById('adminOrderList');
const orderStats = document.getElementById('orderStats');
const STATUSES = ["Confirmed", "Packed", "Out for delivery", "Delivered"];
const ADMIN_STATUSES = [...STATUSES, "Cancelled"];

function fmtDate(iso){
  if(!iso) return "";
  const d = new Date(iso);
  if(isNaN(d.getTime())) return "";
  return d.toLocaleString('en-IN', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
}

function renderAdminOrders(){
  const activeOrders = orders.filter(o => o.status !== "Cancelled");
  const cancelledCount = orders.length - activeOrders.length;
  const revenue = activeOrders.reduce((s,o)=> s + (o.total || 0), 0);
  orderStats.innerHTML = `
    <div class="stat-card"><div class="n">${orders.length}</div><div class="l">Total orders</div></div>
    <div class="stat-card"><div class="n">₹${revenue}</div><div class="l">Total value</div></div>
    <div class="stat-card"><div class="n">${cancelledCount}</div><div class="l">Cancelled</div></div>
  `;
  if(!orders.length){
    adminOrderList.innerHTML = `<div class="admin-empty"><div class="stamp">📦</div><p>No orders yet.<br>Orders placed by customers on this device will appear here.</p></div>`;
    return;
  }
  adminOrderList.innerHTML = orders.map((o, idx)=>`
    <div class="adm-order">
      <div class="adm-order-top">
        <div>
          <h4>Order <span class="oid">#${escapeHtml(o.orderId)}</span></h4>
          <div class="cust">${escapeHtml(o.name)} · ${escapeHtml(o.phone)}<br>${escapeHtml(o.address)}</div>
        </div>
        <span class="pay-badge">${escapeHtml(o.payment || "—")}</span>
      </div>
      <div class="items">
        ${(o.items && o.items.length)
          ? o.items.map(it=>`<div class="li"><span>${escapeHtml(it.name)} <span style="color:var(--ink-soft)">(${escapeHtml(it.unit)} × ${it.qty})</span></span><span>₹${it.price * it.qty}</span></div>`).join('')
          : '<div class="li"><span>Items not recorded</span></div>'}
      </div>
      <div class="adm-order-foot">
        <div>
          <span class="ototal">₹${o.total}</span>
          <div class="cust" style="margin-top:2px;">${fmtDate(o.placedAt)}</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <select class="status-select" data-status="${idx}">
            ${ADMIN_STATUSES.map(s=>`<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="mini-btn danger" data-delorder="${idx}">Delete</button>
        </div>
      </div>
    </div>`).join('');

  adminOrderList.querySelectorAll('[data-status]').forEach(sel=>sel.addEventListener('change', ()=>{
    orders[+sel.dataset.status].status = sel.value;
    saveOrders();
  }));
  adminOrderList.querySelectorAll('[data-delorder]').forEach(b=>b.addEventListener('click', ()=>{
    if(!confirm("Delete this order?")) return;
    orders.splice(+b.dataset.delorder, 1);
    saveOrders();
    renderAdminOrders();
  }));
}

/* ---------------- Init ---------------- */
document.body.classList.add('portal-open');
renderChips();
renderGrid();
renderCart();
checkForStatusUpdates();
