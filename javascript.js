const APP = {
  KEYS: {
    USER: "superapp_user",
    PRODUCTS: "superapp_products",
    SETTINGS: "superapp_settings"
  },
  CHART_CDN: "https://cdn.jsdelivr.net/npm/chart.js"
};

function uid(prefix = "") {
  return prefix + Date.now().toString(36) + Math.floor(Math.random()*10000).toString(36);
}
function formatRupiah(num) {
  if (num === null || num === undefined || isNaN(num)) return "Rp 0";
  return "Rp " + Number(num).toLocaleString("id-ID");
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function el(q, root=document) { return root.querySelector(q); }
function els(q, root=document) { return Array.from(root.querySelectorAll(q)); }

/* Simple toast notification */
function toast(msg, timeout=2800) {
  let container = document.getElementById("__toast_container");
  if (!container) {
    container = document.createElement("div");
    container.id = "__toast_container";
    container.style.position = "fixed";
    container.style.right = "18px";
    container.style.bottom = "18px";
    container.style.zIndex = 99999;
    document.body.appendChild(container);
  }
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.background = "#111827";
  t.style.color = "#fff";
  t.style.padding = "10px 14px";
  t.style.marginTop = "8px";
  t.style.borderRadius = "8px";
  t.style.boxShadow = "0 6px 18px rgba(0,0,0,0.15)";
  t.style.opacity = "0";
  t.style.transform = "translateY(8px)";
  t.style.transition = "all .28s ease";
  container.appendChild(t);
  requestAnimationFrame(()=>{ t.style.opacity="1"; t.style.transform="translateY(0)"; });
  setTimeout(()=>{ t.style.opacity="0"; t.style.transform="translateY(8px)"; setTimeout(()=>t.remove(),300); }, timeout);
}


function loadJSON(key, fallback=null) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch(e) { return fallback; }
}
function saveJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

function sampleProducts() {
  return [
    { id: uid("p_"), name: "Kopi Gayo", price: 25000, stock: 50, img: null, createdAt: new Date().toISOString() },
    { id: uid("p_"), name: "Teh Hitam", price: 18000, stock: 30, img: null, createdAt: new Date().toISOString() },
    { id: uid("p_"), name: "Gula Aren", price: 12000, stock: 70, img: null, createdAt: new Date().toISOString() }
  ];
}

function ensureInitialData() {
  if (!loadJSON(APP.KEYS.PRODUCTS)) {
    saveJSON(APP.KEYS.PRODUCTS, sampleProducts());
  }
  if (!loadJSON(APP.KEYS.SETTINGS)) {
    saveJSON(APP.KEYS.SETTINGS, { perPage: 6 });
  }
}

function saveUser(user) { saveJSON(APP.KEYS.USER, user); }
function loadUser() { return loadJSON(APP.KEYS.USER, null); }
function logout() { localStorage.removeItem(APP.KEYS.USER); window.location.href = "login.html"; }

function initLoginPage() {
  const loginBtn = el(".login-btn");
  const emailInput = el("#email");
  const pwdInput = el("#password");
  const eye = el("#eye");

  if (!loginBtn || !emailInput || !pwdInput) return;

  if (eye) eye.addEventListener("click", () => {
    if (pwdInput.type === "password") { pwdInput.type = "text"; eye.src = "https://cdn-icons-png.flaticon.com/512/159/159604.png"; }
    else { pwdInput.type = "password"; eye.src = "https://cdn-icons-png.flaticon.com/512/709/709612.png"; }
  });

  loginBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    const email = emailInput.value.trim();
    const pwd = pwdInput.value.trim();
    if (!email || !pwd) return alert("Email dan Password tidak boleh kosong!");
    if (!email.endsWith("@gmail.com")) return alert("Email wajib menggunakan @gmail.com");
    saveUser({ email, loginAt: new Date().toISOString() });
    toast("Login berhasil 🎉");
    setTimeout(()=> window.location.href = "dashboard.html", 600);
  });
}

function guardPages() {
  const path = (window.location.pathname.split("/").pop() || "").toLowerCase();
  const loginPage = path.includes("login") || document.title.toLowerCase().includes("login");
  const user = loadUser();
  if (!user && !loginPage) {
    window.location.href = "login.html";
  }
}

function initSidebar() {
  const items = els(".menu-item");
  const cur = (window.location.pathname.split("/").pop() || "").toLowerCase();
  items.forEach(item => {
    item.classList.remove("active");
    const a = item.querySelector("a");
    if (!a) return;
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href && cur && cur !== "" && href.includes(cur)) item.classList.add("active");
    else {
      const txt = a.textContent.trim().toLowerCase();
      if (document.title.toLowerCase().includes(txt)) item.classList.add("active");
    }
  });

  const collapseBtn = el("[data-toggle-sidebar]");
  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-collapsed");
    });
  }
}

async function initDashboard() {
  renderDashboardSummary();
  await ensureChartLib();
  renderDashboardChart();
}

function renderDashboardSummary() {
  const prod = loadJSON(APP.KEYS.PRODUCTS, []);
  const totalProducts = prod.length;
  const totalTransaksi = Math.max(0, Math.round(prod.length * 0.8));
  const totalRevenue = prod.reduce((s,p)=> s + (p.price * Math.round(p.stock*0.2 || 0)), 0);

  const cardValues = els(".card-value");
  if (cardValues && cardValues.length >= 3) {
    cardValues[0].textContent = totalProducts;
    cardValues[1].textContent = totalTransaksi;
    cardValues[2].textContent = formatRupiah(totalRevenue);
    return;
  }
  const elP = el("#dashboard_total_products");
  const elT = el("#dashboard_total_transactions");
  const elR = el("#dashboard_total_revenue");
  if (elP) elP.textContent = totalProducts;
  if (elT) elT.textContent = totalTransaksi;
  if (elR) elR.textContent = formatRupiah(totalRevenue);
}

function ensureChartLib() {
  if (window.Chart) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = APP.CHART_CDN;
    s.onload = ()=> resolve(true);
    s.onerror = ()=> resolve(false);
    document.head.appendChild(s);
  });
}

function renderDashboardChart() {
  const prod = loadJSON(APP.KEYS.PRODUCTS, []);
  const labels = prod.map(p => p.name);
  const data = prod.map(p => p.stock);

  let canvas = el("#dashboardChart");
  const container = el(".empty-box");
  if (!canvas && container) {
    canvas = document.createElement("canvas");
    canvas.id = "dashboardChart";
    canvas.style.width = "100%";
    canvas.style.height = "300px";
    container.innerHTML = "";
    container.appendChild(canvas);
  }
  if (!canvas) return;

  if (window.Chart) {
    if (canvas.__chart_instance) {
      canvas.__chart_instance.destroy();
    }
    const ctx = canvas.getContext("2d");
    canvas.__chart_instance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Stock',
          data,
          backgroundColor: 'rgba(59,130,246,0.9)',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  } else {
    drawSimpleCanvasBar(canvas, labels, data);
  }
}

function drawSimpleCanvasBar(canvas, labels, data) {
  const ctx = canvas.getContext("2d");
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0,0,W,H);
  if (!data.length) {
    ctx.fillStyle = "#9ca3af"; ctx.font = "16px Arial";
    ctx.fillText("No data to display", 20, 30); return;
  }
  const padding = 40;
  const chartW = W - padding*2;
  const chartH = H - padding*2;
  const maxVal = Math.max(...data);
  const barWidth = chartW / data.length * 0.6;
  const gap = chartW / data.length * 0.4;

  ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padding, padding); ctx.lineTo(padding, padding+chartH); ctx.lineTo(padding+chartW, padding+chartH); ctx.stroke();

  for (let i=0;i<data.length;i++){
    const val = data[i];
    const barH = (val / (maxVal || 1)) * (chartH-20);
    const x = padding + i*(barWidth+gap)+gap/2;
    const y = padding + (chartH - barH);
    ctx.fillStyle = "#3b82f6";
    roundRectCanvas(ctx,x,y,barWidth,barH,6,true,false);
    ctx.fillStyle = "#111827";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(val, x+barWidth/2, y-8);
    const label = labels[i].length>12? labels[i].slice(0,11)+"…" : labels[i];
    ctx.fillStyle = "#6b7280"; ctx.fillText(label, x+barWidth/2, padding+chartH+16);
  }
}
function roundRectCanvas(ctx,x,y,w,h,r,fill,stroke){
  if (w<2*r) r = w/2; if (h<2*r) r = h/2;
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function initProductsPage() {
  ensureInitialData(); 

  const addBtn = el("[data-add-product]");
  if (addBtn) addBtn.addEventListener("click", openAddProduct);

  const exportBtn = el("[data-export-json]");
  if (exportBtn) exportBtn.addEventListener("click", exportProductsJSON);
  const exportCsvBtn = el("[data-export-csv]");
  if (exportCsvBtn) exportCsvBtn.addEventListener("click", exportProductsCSV);
  const importBtn = el("[data-import-json]");
  if (importBtn) importBtn.addEventListener("change", handleImportJSON);

  const search = el("#productSearch");
  if (search) {
    let timer = null;
    search.addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(()=> renderProductsTable(e.target.value), 250);
    });
  }

  const perPageSelect = el("[data-perpage]");
  if (perPageSelect) {
    perPageSelect.addEventListener("change", (e)=> {
      const s = loadJSON(APP.KEYS.SETTINGS, {perPage:6});
      s.perPage = Number(e.target.value);
      saveJSON(APP.KEYS.SETTINGS, s);
      renderProductsTable();
    });
    const s = loadJSON(APP.KEYS.SETTINGS, {perPage:6});
    perPageSelect.value = s.perPage || 6;
  }

  renderProductsTable();
}

function allProducts() {
  return loadJSON(APP.KEYS.PRODUCTS, []);
}
function saveProductsList(list) {
  saveJSON(APP.KEYS.PRODUCTS, list);
}

function renderProductsTable(searchQuery="", options={ page:1, sortBy: "name", sortDir: "asc" }) {
  const tableBody = el("#productTable tbody");
  if (!tableBody) return;

  const raw = allProducts();
  const tableEl = el("#productTable");
  const page = parseInt(tableEl.getAttribute("data-page") || 1);
  const sortBy = tableEl.getAttribute("data-sort-by") || "name";
  const sortDir = tableEl.getAttribute("data-sort-dir") || "asc";
  const perPage = (loadJSON(APP.KEYS.SETTINGS, {perPage:6}).perPage) || 6;

  const q = (searchQuery || el("#productSearch")?.value || "").trim().toLowerCase();

  let list = raw.slice();
  if (q) {
    list = list.filter(p => (p.name || "").toLowerCase().includes(q) || String(p.price).includes(q) || String(p.stock).includes(q));
  }

  list.sort((a,b)=>{
    const dir = (sortDir === "asc")? 1 : -1;
    if (sortBy === "price" || sortBy === "stock") return dir * ( (a[sortBy]||0) - (b[sortBy]||0) );
    return dir * String(a[sortBy]||"").localeCompare(String(b[sortBy]||""));
  });

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = clamp(page, 1, totalPages);
  tableEl.setAttribute("data-page", currentPage);

  const start = (currentPage - 1) * perPage;
  const paged = list.slice(start, start + perPage);

  tableBody.innerHTML = "";
  paged.forEach((p, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${start + idx + 1}</td>
      <td style="display:flex;gap:10px;align-items:center;">
        ${p.img ? <img src="${p.img}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;"> : <div style="width:48px;height:48px;border-radius:6px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;">🛍</div>}
        <div>
          <div style="font-weight:600">${escapeHtml(p.name)}</div>
          <div style="font-size:12px;color:#6b7280">Added: ${new Date(p.createdAt).toLocaleDateString()}</div>
        </div>
      </td>
      <td>${formatRupiah(p.price)}</td>
      <td>${p.stock}</td>
      <td>
        <button class="btn-edit" data-edit-id="${p.id}">Edit</button>
        <button class="btn-delete" data-delete-id="${p.id}" style="margin-left:8px;background:#ef4444;">Hapus</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  els("button[data-edit-id]").forEach(b => b.addEventListener("click", (e)=> {
    const id = e.currentTarget.getAttribute("data-edit-id");
    openEditPopup(id);
  }));
  els("button[data-delete-id]").forEach(b => b.addEventListener("click", (e)=> {
    const id = e.currentTarget.getAttribute("data-delete-id");
    if (confirm("Hapus produk ini?")) {
      deleteProductById(id);
    }
  }));

  renderPaginationControls(totalPages, currentPage);
}

function escapeHtml(s) {
  if (!s) return "";
  return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function renderPaginationControls(totalPages, currentPage) {
  const container = el("#productPagination");
  if (!container) return;
  container.innerHTML = "";
  const prev = document.createElement("button");
  prev.textContent = "‹ Prev"; prev.disabled = currentPage <= 1;
  prev.addEventListener("click", ()=> { el("#productTable").setAttribute("data-page", Math.max(1,currentPage-1)); renderProductsTable(); });
  const next = document.createElement("button");
  next.textContent = "Next ›"; next.disabled = currentPage >= totalPages;
  next.addEventListener("click", ()=> { el("#productTable").setAttribute("data-page", Math.min(totalPages,currentPage+1)); renderProductsTable(); });

  const pageInfo = document.createElement("span");
  pageInfo.textContent = Page ${currentPage} / ${totalPages};
  pageInfo.style.margin = "0 12px";

  container.appendChild(prev);
  container.appendChild(pageInfo);
  container.appendChild(next);
}

function openAddProduct() {
  setupPopupFor(null);
  showPopup();
}
function openEditPopup(id) {
  const p = allProducts().find(x=>x.id===id);
  if (!p) return toast("Produk tidak ditemukan");
  setupPopupFor(p);
  showPopup();
}

function setupPopupFor(product) {
  const popup = el("#popup");
  if (!popup) return;
  popup.style.display = "flex";
  const title = popup.querySelector("h3");
  title.textContent = product ? "Edit Produk" : "Tambah Produk";

  el("#editName").value = product ? product.name : "";
  el("#editPrice").value = product ? product.price : "";
  el("#editStock").value = product ? product.stock : "";
  el("#editImgPreview").src = product && product.img ? product.img : "";
  el("#editImgPreview").style.display = product && product.img ? "block" : "none";
  el("#editImgInput").value = "";
  popup.setAttribute("data-edit-id", product ? product.id : "");
}

function showPopup() {
  const popup = el("#popup"); if (!popup) return;
  popup.style.display = "flex";
}
function closePopup() {
  const popup = el("#popup"); if (!popup) return;
  popup.style.display = "none";
}

function savePopupProduct() {
  const popup = el("#popup"); if (!popup) return;
  const id = popup.getAttribute("data-edit-id") || null;
  const name = (el("#editName").value || "").trim();
  const price = Number(el("#editPrice").value || 0);
  const stock = Number(el("#editStock").value || 0);
  const imgBase = el("#editImgPreview").src && el("#editImgPreview").style.display !== "none" ? el("#editImgPreview").src : null;

  if (!name) return alert("Masukkan nama produk.");
  if (!price || price <= 0) return alert("Masukkan harga valid.");
  if (isNaN(stock) || stock < 0) return alert("Masukkan stock valid.");

  let list = allProducts();
  if (id) {
    const idx = list.findIndex(x=>x.id===id);
    if (idx === -1) return alert("Produk tidak ditemukan (update).");
    list[idx].name = name; list[idx].price = price; list[idx].stock = stock; list[idx].img = imgBase;
    toast("Produk diperbarui");
  } else {
    const newP = { id: uid("p_"), name, price, stock, img: imgBase, createdAt: new Date().toISOString() };
    list.unshift(newP);
    toast("Produk ditambahkan");
  }
  saveProductsList(list);
  closePopup();
  renderProductsTable();
  renderDashboardSummary();
  renderDashboardChart();
}

function deleteProductById(id) {
  let list = allProducts();
  list = list.filter(x=>x.id !== id);
  saveProductsList(list);
  toast("Produk dihapus");
  renderProductsTable();
  renderDashboardSummary();
  renderDashboardChart();
}

function wireImageInput() {
  const inp = el("#editImgInput");
  if (!inp) return;
  inp.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      el("#editImgPreview").src = ev.target.result;
      el("#editImgPreview").style.display = "block";
    };
    reader.readAsDataURL(f);
  });
}

function exportProductsJSON() {
  const data = allProducts();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "products_export.json"; a.click();
  URL.revokeObjectURL(url);
}
function exportProductsCSV() {
  const data = allProducts();
  const headers = ["id","name","price","stock","createdAt"];
  const rows = data.map(d => headers.map(h => "${String(d[h]||"").replace(/"/g,'""')}").join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], {type: "text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "products_export.csv"; a.click();
  URL.revokeObjectURL(url);
}
function handleImportJSON(ev) {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) return alert("File tidak valid (harus array produk).");
      saveProductsList(parsed);
      toast("Import berhasil");
      renderProductsTable();
      renderDashboardSummary();
      renderDashboardChart();
    } catch(err) {
      alert("Gagal membaca file JSON: " + err.message);
    }
  };
  reader.readAsText(f);
}

function attachGlobalHandlers() {
  const popup = el("#popup");
  if (popup) popup.addEventListener("click", (ev)=> {
    if (ev.target === popup) closePopup();
  });

  const saveBtn = el(".btn-save");
  if (saveBtn) saveBtn.addEventListener("click", savePopupProduct);
  const cancelBtn = el(".btn-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", closePopup);

  wireImageInput();

  const logoutBtn = el("[data-logout]");
  if (logoutBtn) logoutBtn.addEventListener("click", ()=> {
    if (confirm("Yakin ingin logout?")) logout();
  });

  const headers = els("#productTable th");
  headers.forEach(h => {
    const key = h.getAttribute("data-sort");
    if (key) {
      h.style.cursor = "pointer";
      h.addEventListener("click", ()=> {
        const table = el("#productTable");
        const cur = table.getAttribute("data-sort-dir") || "asc";
        const newDir = cur === "asc" ? "desc" : "asc";
        table.setAttribute("data-sort-by", key);
        table.setAttribute("data-sort-dir", newDir);
        renderProductsTable();
      });
    }
  });
}

window.__superapp = {
  resetSample: function(){
    saveJSON(APP.KEYS.PRODUCTS, sampleProducts());
    saveJSON(APP.KEYS.SETTINGS, {perPage:6});
    toast("Sample data di-reset");
    renderProductsTable();
    renderDashboardSummary();
    renderDashboardChart();
  },
  logout,
  allProducts,
  saveProductsList
};

document.addEventListener("DOMContentLoaded", async () => {
  ensureInitialData();
  guardPages();
  initSidebar();
  attachGlobalHandlers();

  const path = (window.location.pathname.split("/").pop() || "").toLowerCase();
  const title = document.title.toLowerCase();

  if (path.includes("login") || title.includes("login")) {
    initLoginPage();
    return;
  }
  if (path.includes("dashboard") || title.includes("dashboard")) {
    initDashboard();
    return;
  }
  if (path.includes("barang") || path.includes("product") || title.includes("produk") || title.includes("data produk")) {
    initProductsPage();
    return;
  }

  if (el(".empty-box")) {
    initDashboard();
  }
});
