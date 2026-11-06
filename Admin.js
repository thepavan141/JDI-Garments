const $ = s => document.querySelector(s);
const rupee = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const BUCKET = "product-images";

let items = [];
let editing = null;
let keepImages = []; // Array of URLs or data URLs
let pendingUploadFiles = []; // Array of { file: File, preview: string, originalSize: number, compressedSize: number, reductionPct: number }
let currentStatusFilter = "all";

const toArray = val => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {}
        }
        return trimmed ? trimmed.split(",").map(x => x.trim()).filter(Boolean) : [];
    }
    return [];
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const pathFromUrl = u => {
    if (!u || typeof u !== "string") return "";
    const parts = u.split("/" + BUCKET + "/");
    return parts[1] ? decodeURIComponent(parts[1]) : "";
};

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/* ===== CLIENT-SIDE IMAGE COMPRESSOR ENGINE ===== */
function compressImage(file, options = {}) {
    return new Promise((resolve) => {
        if (!file || !file.type || !file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
            resolve({
                blob: file,
                originalSize: file ? file.size : 0,
                compressedSize: file ? file.size : 0,
                dataUrl: file ? URL.createObjectURL(file) : "",
                wasCompressed: false,
                reductionPct: 0
            });
            return;
        }

        const maxWidth = options.maxWidth || 1400;
        const maxHeight = options.maxHeight || 1400;
        const quality = options.quality !== undefined ? options.quality : 0.82;
        const outputType = options.outputType || "image/jpeg";

        const reader = new FileReader();
        reader.onerror = () => {
            resolve({
                blob: file,
                originalSize: file.size,
                compressedSize: file.size,
                dataUrl: URL.createObjectURL(file),
                wasCompressed: false,
                reductionPct: 0
            });
        };

        reader.onload = e => {
            const img = new Image();
            img.onerror = () => {
                resolve({
                    blob: file,
                    originalSize: file.size,
                    compressedSize: file.size,
                    dataUrl: URL.createObjectURL(file),
                    wasCompressed: false,
                    reductionPct: 0
                });
            };

            img.onload = () => {
                let { width, height } = img;

                // Scale down while maintaining aspect ratio
                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");

                // Fill white background for transparent PNG converted to JPEG
                if (outputType === "image/jpeg") {
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, width, height);
                }

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(blob => {
                    if (!blob) {
                        resolve({
                            blob: file,
                            originalSize: file.size,
                            compressedSize: file.size,
                            dataUrl: URL.createObjectURL(file),
                            wasCompressed: false,
                            reductionPct: 0
                        });
                        return;
                    }

                    // Only use compressed if smaller than original
                    const useCompressed = blob.size < file.size;
                    const finalBlob = useCompressed ? blob : file;
                    const reductionPct = Math.max(0, Math.round((1 - finalBlob.size / file.size) * 100));

                    resolve({
                        blob: finalBlob,
                        originalSize: file.size,
                        compressedSize: finalBlob.size,
                        width,
                        height,
                        dataUrl: URL.createObjectURL(finalBlob),
                        wasCompressed: useCompressed,
                        reductionPct
                    });
                }, outputType, quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function getCompressorOptions() {
    const enabled = $("#compressorEnabled") ? $("#compressorEnabled").checked : true;
    if (!enabled) return null;

    const preset = $("#compressorPreset") ? $("#compressorPreset").value : "balanced";
    if (preset === "fast") {
        return { maxWidth: 1000, maxHeight: 1000, quality: 0.75, outputType: "image/jpeg" };
    }
    if (preset === "high") {
        return { maxWidth: 1800, maxHeight: 1800, quality: 0.90, outputType: "image/jpeg" };
    }
    // Balanced (Recommended)
    return { maxWidth: 1400, maxHeight: 1400, quality: 0.82, outputType: "image/jpeg" };
}

function show(loggedIn) {
    const loginEl = $("#login");
    const appEl = $("#app");
    const logoutBtn = $("#logout");

    if (loginEl) loginEl.hidden = loggedIn;
    if (appEl) appEl.hidden = !loggedIn;
    if (logoutBtn) logoutBtn.hidden = !loggedIn;

    if (loggedIn) {
        loadList();
        loadShowcaseAdmin();
    }
}

function msg(text, isErr) {
    const m = $("#msg");
    if (!m) return;
    m.textContent = text;
    m.className = "msg" + (isErr ? " err" : (text ? " ok" : ""));
}

/* Authentication setup */
if (typeof sb !== "undefined" && sb && sb.auth) {
    sb.auth.getSession()
        .then(({ data }) => show(!!(data && data.session)))
        .catch(() => show(false));
} else {
    show(false);
}

const loginForm = $("#loginForm");
if (loginForm) {
    loginForm.onsubmit = async e => {
        e.preventDefault();
        const lerr = $("#lerr");
        if (lerr) lerr.textContent = "";

        if (typeof sb === "undefined" || !sb) {
            if (lerr) lerr.textContent = "Supabase client not initialized. Check internet connection.";
            return;
        }

        const email = $("#email").value.trim();
        const password = $("#pw").value;

        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
            if (lerr) lerr.textContent = error.message;
            return;
        }
        show(true);
    };
}

const logoutBtn = $("#logout");
if (logoutBtn) {
    logoutBtn.onclick = async () => {
        if (sb && sb.auth) await sb.auth.signOut();
        show(false);
    };
}

/* ---------- Tabs Switching ---------- */
const tabBtnProducts = $("#tabBtnProducts");
const tabBtnShowcase = $("#tabBtnShowcase");
const tabProductsView = $("#tabProductsView");
const tabShowcaseView = $("#tabShowcaseView");

if (tabBtnProducts && tabBtnShowcase && tabProductsView && tabShowcaseView) {
    tabBtnProducts.onclick = () => {
        tabBtnProducts.classList.add("active");
        tabBtnShowcase.classList.remove("active");
        tabProductsView.hidden = false;
        tabShowcaseView.hidden = true;
    };

    tabBtnShowcase.onclick = () => {
        tabBtnShowcase.classList.add("active");
        tabBtnProducts.classList.remove("active");
        tabShowcaseView.hidden = false;
        tabProductsView.hidden = true;
        loadShowcaseAdmin();
    };
}

/* ---------- Quick Pills Click Handlers ---------- */
document.addEventListener("click", e => {
    // Category pill
    const catPill = e.target.closest("[data-cat]");
    if (catPill) {
        const catInput = $("#category");
        if (catInput) catInput.value = catPill.dataset.cat;
        return;
    }

    // Size fill pill
    const fillPill = e.target.closest("[data-fill]");
    if (fillPill) {
        const targetId = fillPill.dataset.fill;
        const targetInput = $("#" + targetId);
        if (targetInput) targetInput.value = fillPill.dataset.val;
        return;
    }

    // Color append pill
    const addPill = e.target.closest("[data-add]");
    if (addPill) {
        const targetId = addPill.dataset.add;
        const targetInput = $("#" + targetId);
        if (targetInput) {
            const current = targetInput.value.trim();
            const val = addPill.dataset.val;
            if (!current) {
                targetInput.value = val;
            } else {
                const parts = current.split(",").map(x => x.trim());
                if (!parts.includes(val)) {
                    parts.push(val);
                    targetInput.value = parts.join(", ");
                }
            }
        }
    }
});

/* ---------- Product List Loading & Rendering ---------- */
async function loadList() {
    if (typeof sb === "undefined" || !sb) return;

    const listEl = $("#list");
    if (!listEl) return;

    listEl.innerHTML = `<p style="color:var(--muted)">Loading catalog…</p>`;

    const { data, error } = await sb.from("products").select("*").order("created_at", { ascending: false });
    if (error) {
        listEl.innerHTML = `<p class="msg err">${esc(error.message)}</p>`;
        return;
    }

    items = data || [];
    renderAdminProductsList();

    const catsEl = $("#cats");
    if (catsEl) {
        const uniqueCats = [...new Set(items.map(p => p.category).filter(Boolean))];
        catsEl.innerHTML = uniqueCats.map(c => `<option value="${esc(c)}">`).join("");
    }
}

function updateStatsCounters() {
    const statTotal = $("#statTotal");
    const statInStock = $("#statInStock");
    const statSoldOut = $("#statSoldOut");
    const statNew = $("#statNew");
    const badgeTotalCount = $("#badgeTotalCount");

    const total = items.length;
    const inStock = items.filter(p => p.in_stock !== false).length;
    const soldOut = items.filter(p => p.in_stock === false).length;
    const newItems = items.filter(p => Boolean(p.is_new)).length;

    if (statTotal) statTotal.textContent = total;
    if (statInStock) statInStock.textContent = inStock;
    if (statSoldOut) statSoldOut.textContent = soldOut;
    if (statNew) statNew.textContent = newItems;
    if (badgeTotalCount) badgeTotalCount.textContent = `${total} outfit${total === 1 ? '' : 's'}`;
}

function setFilter(filterType) {
    currentStatusFilter = filterType;

    // Update filter pills active state
    document.querySelectorAll("#catalogFilterPills .filter-pill").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filterType);
    });

    // Update stats cards active state
    document.querySelectorAll("#adminStatsGrid .stat-card").forEach(card => {
        card.classList.toggle("active", card.dataset.filter === filterType);
    });

    renderAdminProductsList();
}

// Quick filter pills and stats card delegation
document.addEventListener("click", e => {
    const pill = e.target.closest("#catalogFilterPills .filter-pill");
    if (pill) {
        setFilter(pill.dataset.filter);
        return;
    }

    const statCard = e.target.closest("#adminStatsGrid .stat-card");
    if (statCard) {
        setFilter(statCard.dataset.filter);
        const catalogCard = document.querySelector(".catalog-card");
        if (catalogCard) catalogCard.scrollIntoView({ behavior: "smooth" });
        return;
    }
});

function renderAdminProductsList() {
    const listEl = $("#list");
    const countEl = $("#count");
    if (!listEl) return;

    updateStatsCounters();

    const filterVal = ($("#adminFilter") ? $("#adminFilter").value : "").trim().toLowerCase();
    
    // Filter items using current status filter and search query
    const filtered = items.filter(p => {
        // Quick status filter
        if (currentStatusFilter === "in_stock" && p.in_stock === false) return false;
        if (currentStatusFilter === "sold_out" && p.in_stock !== false) return false;
        if (currentStatusFilter === "is_new" && !p.is_new) return false;

        // Search text filter
        if (!filterVal) return true;
        const nameStr = String(p.name || "").toLowerCase();
        const catStr = String(p.category || "").toLowerCase();
        const sizesStr = toArray(p.sizes).join(" ").toLowerCase();
        const colorsStr = toArray(p.colors).join(" ").toLowerCase();
        const searchBlob = `${nameStr} ${catStr} ${sizesStr} ${colorsStr}`;
        return searchBlob.includes(filterVal);
    });

    if (countEl) countEl.textContent = `Products (${items.length})`;

    const subtitleEl = $("#catalogSubtitle");
    if (subtitleEl) {
        if (filterVal || currentStatusFilter !== "all") {
            subtitleEl.textContent = `Showing ${filtered.length} of ${items.length} products matching filter`;
        } else {
            subtitleEl.textContent = `Manage outfits, update inventory stock, and edit prices`;
        }
    }

    if (filtered.length === 0) {
        listEl.innerHTML = `
        <div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="color:var(--admin-muted);margin:0 auto 10px;display:block">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <p><strong>${items.length === 0 ? "No products in database yet." : "No outfits match your filter search."}</strong></p>
            <p class="empty-sub">${items.length === 0 ? "Add your first product above to display it in the store." : "Try clearing your search query or selecting a different filter tab."}</p>
        </div>`;
        return;
    }

    listEl.innerHTML = filtered.map(p => {
        const imgs = toArray(p.images);
        const thumbUrl = imgs[0] || "";
        const sizes = toArray(p.sizes);
        const colors = toArray(p.colors);
        const hasDiscount = p.original_price && p.original_price > p.price;
        const discountPct = hasDiscount ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;

        return `
        <div class="item ${p.in_stock ? 'is-in-stock' : 'is-sold-out'}" data-id="${esc(p.id)}">
            <div class="t-wrap">
                <div class="t" style="background-image:url('${esc(thumbUrl)}')">
                    ${!thumbUrl ? `<div class="no-img-ph"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>` : ''}
                    ${imgs.length > 1 ? `<span class="img-count-tag">${imgs.length} photos</span>` : ''}
                </div>
            </div>

            <div class="m">
                <div class="item-header-line">
                    <strong class="item-title" title="${esc(p.name)}">${esc(p.name)}</strong>
                    <div class="item-price-block">
                        <span class="item-price">${rupee(p.price)}</span>
                        ${hasDiscount ? `<span class="item-old-price">${rupee(p.original_price)}</span>` : ''}
                        ${hasDiscount ? `<span class="item-discount-badge">${discountPct}% OFF</span>` : ''}
                    </div>
                </div>

                <div class="item-meta-tags">
                    <span class="meta-tag tag-category">${esc(p.category || "Outfit")}</span>
                    <span class="meta-tag tag-stock ${p.in_stock ? 'stock-yes' : 'stock-no'}">
                        <span class="status-indicator-dot"></span>
                        ${p.in_stock ? 'In Stock' : 'Sold Out'}
                    </span>
                    ${p.is_new ? `<span class="meta-tag tag-new">New Arrival</span>` : ''}
                </div>

                ${sizes.length > 0 || colors.length > 0 ? `
                <div class="item-variants-line">
                    ${sizes.length > 0 ? `
                        <div class="variant-cluster">
                            <span class="variant-label">Sizes:</span>
                            <div class="size-chips-preview">
                                ${sizes.map(s => `<span class="variant-chip size-chip">${esc(s)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${colors.length > 0 ? `
                        <div class="variant-cluster">
                            <span class="variant-label">Colours:</span>
                            <div class="color-chips-preview">
                                ${colors.map(c => `<span class="variant-chip color-chip">${esc(c)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>

            <div class="acts">
                <button type="button" class="act-btn btn-edit" data-act="edit" title="Edit product details">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    <span>Edit</span>
                </button>
                <button type="button" class="act-btn ${p.in_stock ? 'btn-mark-out' : 'btn-mark-in'}" data-act="stock" title="${p.in_stock ? 'Mark as Sold Out' : 'Mark as In Stock'}">
                    ${p.in_stock
                        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg><span>Sold Out</span>`
                        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg><span>In Stock</span>`
                    }
                </button>
                <button type="button" class="act-btn ${p.is_new ? 'btn-active-new' : ''}" data-act="new" title="${p.is_new ? 'Remove New Arrival badge' : 'Set as New Arrival'}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="${p.is_new ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    <span>${p.is_new ? 'New' : 'Mark New'}</span>
                </button>
                <button type="button" class="act-btn btn-delete" data-act="del" title="Delete product permanently">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Delete</span>
                </button>
            </div>
        </div>`;
    }).join("");
}

const adminFilterInput = $("#adminFilter");
const adminFilterClear = $("#adminFilterClear");

if (adminFilterInput) {
    adminFilterInput.oninput = () => {
        if (adminFilterClear) adminFilterClear.hidden = adminFilterInput.value.length === 0;
        renderAdminProductsList();
    };
}

if (adminFilterClear && adminFilterInput) {
    adminFilterClear.onclick = () => {
        adminFilterInput.value = "";
        adminFilterClear.hidden = true;
        renderAdminProductsList();
        adminFilterInput.focus();
    };
}

const btnRefreshList = $("#btnRefreshList");
if (btnRefreshList) {
    btnRefreshList.onclick = () => loadList();
}

const listEl = $("#list");
if (listEl) {
    listEl.onclick = async e => {
        const b = e.target.closest("[data-act]");
        if (!b) return;

        const itemCard = b.closest(".item");
        if (!itemCard) return;

        const id = itemCard.dataset.id;
        const p = items.find(x => String(x.id) === String(id));
        if (!p) return;

        const act = b.dataset.act;

        if (act === "edit") {
            startEdit(p);
            return;
        }

        if (act === "stock") {
            b.disabled = true;
            await sb.from("products").update({ in_stock: !p.in_stock }).eq("id", p.id);
            await loadList();
            return;
        }

        if (act === "new") {
            b.disabled = true;
            await sb.from("products").update({ is_new: !p.is_new }).eq("id", p.id);
            await loadList();
            return;
        }

        if (act === "del") {
            if (!confirm(`Are you sure you want to delete "${p.name}"? This cannot be undone.`)) return;
            b.disabled = true;
            const { error } = await sb.from("products").delete().eq("id", p.id);
            if (error) {
                alert("Failed to delete: " + error.message);
                b.disabled = false;
                return;
            }

            const paths = toArray(p.images).map(pathFromUrl).filter(Boolean);
            if (paths.length > 0) {
                try {
                    await sb.storage.from(BUCKET).remove(paths);
                } catch (err) {
                    console.warn("Storage cleanup notice:", err);
                }
            }
            loadList();
        }
    };
}

/* ---------- Photo Thumbnails & Form Management ---------- */
function drawThumbs() {
    const thumbsEl = $("#thumbs");
    if (!thumbsEl) return;

    let html = "";

    // Existing saved URLs
    keepImages.forEach((u, i) => {
        html += `
        <div class="thumb-item" style="background-image:url('${esc(u)}')">
            <span class="thumb-stats-badge">Saved</span>
            <button type="button" class="thumb-del" data-type="keep" data-i="${i}" title="Remove photo">×</button>
        </div>`;
    });

    // Pending file uploads preview with compression stats
    pendingUploadFiles.forEach((item, i) => {
        const sizeStr = formatFileSize(item.compressedSize || item.file.size);
        const badgeClass = item.reductionPct > 0 ? "thumb-stats-badge badge-compressed" : "thumb-stats-badge";
        const badgeText = item.reductionPct > 0 ? `-${item.reductionPct}%` : "New";

        html += `
        <div class="thumb-item" style="background-image:url('${esc(item.preview)}')">
            <span class="${badgeClass}">${esc(badgeText)}</span>
            <span class="thumb-size-info">${esc(sizeStr)}</span>
            <button type="button" class="thumb-del" data-type="file" data-i="${i}" title="Remove file">×</button>
        </div>`;
    });

    thumbsEl.innerHTML = html;
}

const thumbsEl = $("#thumbs");
if (thumbsEl) {
    thumbsEl.onclick = e => {
        const delBtn = e.target.closest(".thumb-del");
        if (!delBtn) return;

        const idx = parseInt(delBtn.dataset.i, 10);
        if (delBtn.dataset.type === "keep") {
            keepImages.splice(idx, 1);
        } else if (delBtn.dataset.type === "file") {
            pendingUploadFiles.splice(idx, 1);
        }
        drawThumbs();
    };
}

// Direct URL input handler
const btnAddImageUrl = $("#btnAddImageUrl");
const imageUrlInput = $("#imageUrlInput");
if (btnAddImageUrl && imageUrlInput) {
    btnAddImageUrl.onclick = () => {
        const url = imageUrlInput.value.trim();
        if (!url) return;
        if (!keepImages.includes(url)) {
            keepImages.push(url);
            drawThumbs();
        }
        imageUrlInput.value = "";
    };

    imageUrlInput.onkeydown = e => {
        if (e.key === "Enter") {
            e.preventDefault();
            btnAddImageUrl.click();
        }
    };
}

// File input handler with automatic client-side compression
const filesInput = $("#files");
if (filesInput) {
    filesInput.onchange = async () => {
        const files = Array.from(filesInput.files || []);
        if (files.length === 0) return;

        const options = getCompressorOptions();
        const statusEl = $("#compressionStatus");

        if (options && statusEl) {
            statusEl.hidden = false;
            statusEl.className = "compression-status";
            statusEl.innerHTML = `<span>⏳ Optimizing &amp; compressing ${files.length} photo${files.length > 1 ? "s" : ""}…</span>`;
        }

        let totalOriginal = 0;
        let totalCompressed = 0;

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            totalOriginal += f.size;

            if (options) {
                try {
                    const res = await compressImage(f, options);
                    totalCompressed += res.compressedSize;

                    const cleanName = f.name.replace(/\.[^.]+$/, "") + ".jpg";
                    const compressedFile = new File([res.blob], cleanName, { type: "image/jpeg" });

                    pendingUploadFiles.push({
                        file: compressedFile,
                        preview: res.dataUrl,
                        originalSize: res.originalSize,
                        compressedSize: res.compressedSize,
                        reductionPct: res.reductionPct
                    });
                } catch (err) {
                    console.warn("Compression fallback:", err);
                    totalCompressed += f.size;
                    pendingUploadFiles.push({
                        file: f,
                        preview: URL.createObjectURL(f),
                        originalSize: f.size,
                        compressedSize: f.size,
                        reductionPct: 0
                    });
                }
            } else {
                totalCompressed += f.size;
                pendingUploadFiles.push({
                    file: f,
                    preview: URL.createObjectURL(f),
                    originalSize: f.size,
                    compressedSize: f.size,
                    reductionPct: 0
                });
            }
        }

        if (options && statusEl && totalOriginal > 0) {
            const savedBytes = totalOriginal - totalCompressed;
            const savedPct = Math.max(0, Math.round((savedBytes / totalOriginal) * 100));
            statusEl.className = "compression-status success";
            statusEl.innerHTML = `<span>Compressed ${files.length} photo${files.length > 1 ? "s" : ""}: saved ${formatFileSize(savedBytes)} (${savedPct}% reduction, total: ${formatFileSize(totalCompressed)})</span>`;
        }

        filesInput.value = "";
        drawThumbs();
    };
}

function updatePriceCalcPreview() {
    const priceEl = $("#price");
    const opriceEl = $("#oprice");
    const previewEl = $("#priceCalcPreview");
    if (!priceEl || !opriceEl || !previewEl) return;

    const price = parseInt(priceEl.value, 10);
    const oprice = parseInt(opriceEl.value, 10);

    if (!isNaN(price) && !isNaN(oprice) && oprice > price && price > 0) {
        const discountPct = Math.round(((oprice - price) / oprice) * 100);
        const savings = oprice - price;
        previewEl.hidden = false;
        previewEl.innerHTML = `<span><strong>Live Preview:</strong> ₹${price.toLocaleString("en-IN")} (was ₹${oprice.toLocaleString("en-IN")}) • <strong>${discountPct}% OFF</strong> • Customer saves ₹${savings.toLocaleString("en-IN")}</span>`;
    } else {
        previewEl.hidden = true;
        previewEl.innerHTML = "";
    }
}

const priceInput = $("#price");
const opriceInput = $("#oprice");
if (priceInput && opriceInput) {
    priceInput.addEventListener("input", updatePriceCalcPreview);
    opriceInput.addEventListener("input", updatePriceCalcPreview);
}

function resetForm() {
    editing = null;
    keepImages = [];
    pendingUploadFiles = [];

    const pform = $("#pform");
    if (pform) pform.reset();

    const instock = $("#instock");
    if (instock) instock.checked = true;

    const statusEl = $("#compressionStatus");
    if (statusEl) {
        statusEl.hidden = true;
        statusEl.innerHTML = "";
    }

    const previewEl = $("#priceCalcPreview");
    if (previewEl) {
        previewEl.hidden = true;
        previewEl.innerHTML = "";
    }

    drawThumbs();

    const ftitle = $("#ftitle");
    if (ftitle) ftitle.textContent = "Add Product";

    const cancelBtn = $("#cancel");
    if (cancelBtn) cancelBtn.hidden = true;

    const cancelTop = $("#cancelTop");
    if (cancelTop) cancelTop.hidden = true;
}

function startEdit(p) {
    editing = p.id;
    keepImages = [...toArray(p.images)];
    pendingUploadFiles = [];

    $("#name").value = p.name || "";
    $("#category").value = p.category || "";
    $("#price").value = p.price ?? "";
    $("#oprice").value = p.original_price ?? "";
    $("#sizes").value = toArray(p.sizes).join(", ");
    $("#colors").value = toArray(p.colors).join(", ");
    $("#instock").checked = p.in_stock !== false;
    $("#isnew").checked = Boolean(p.is_new);

    $("#ftitle").textContent = `Edit Product: "${p.name}"`;
    $("#cancel").hidden = false;

    const cancelTop = $("#cancelTop");
    if (cancelTop) cancelTop.hidden = false;

    const statusEl = $("#compressionStatus");
    if (statusEl) {
        statusEl.hidden = true;
        statusEl.innerHTML = "";
    }

    updatePriceCalcPreview();
    drawThumbs();
    msg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

const cancelBtn = $("#cancel");
if (cancelBtn) {
    cancelBtn.onclick = () => {
        resetForm();
        msg("");
    };
}

const cancelTop = $("#cancelTop");
if (cancelTop) {
    cancelTop.onclick = () => {
        resetForm();
        msg("");
    };
}

// Product Form Submission
const pform = $("#pform");
if (pform) {
    pform.onsubmit = async e => {
        e.preventDefault();

        const price = parseInt($("#price").value, 10);
        const opriceVal = $("#oprice").value ? parseInt($("#oprice").value, 10) : null;

        if (isNaN(price) || price < 0) {
            msg("Please enter a valid selling price.", true);
            return;
        }

        if (opriceVal !== null && opriceVal <= price) {
            msg("Original price must be strictly higher than selling price (or leave it empty).", true);
            return;
        }

        const saveBtn = $("#save");
        saveBtn.disabled = true;
        msg("Uploading compressed photos & saving product…");

        try {
            const uploadedUrls = [];

            // Upload compressed files to Supabase Storage
            for (const item of pendingUploadFiles) {
                const f = item.file;
                const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
                const path = `${crypto.randomUUID()}.${ext}`;

                const { error: uploadErr } = await sb.storage.from(BUCKET).upload(path, f, {
                    contentType: f.type || "image/jpeg",
                    cacheControl: "31536000",
                    upsert: false
                });

                if (uploadErr) throw uploadErr;

                const publicData = sb.storage.from(BUCKET).getPublicUrl(path);
                if (publicData && publicData.data && publicData.data.publicUrl) {
                    uploadedUrls.push(publicData.data.publicUrl);
                }
            }

            const finalImages = [...keepImages, ...uploadedUrls];

            const row = {
                name: $("#name").value.trim(),
                category: $("#category").value.trim(),
                price: price,
                original_price: opriceVal,
                sizes: toArray($("#sizes").value),
                colors: toArray($("#colors").value),
                images: finalImages,
                in_stock: $("#instock").checked,
                is_new: $("#isnew").checked
            };

            const { error: saveErr } = editing
                ? await sb.from("products").update(row).eq("id", editing)
                : await sb.from("products").insert(row);

            if (saveErr) throw saveErr;

            resetForm();
            msg("Product successfully saved!", false);
            await loadList();
        } catch (err) {
            console.error("Save product error:", err);
            msg(err.message || "Failed to save product. Please try again.", true);
        } finally {
            saveBtn.disabled = false;
        }
    };
}

/* ---------- Store Showcase Photos Admin (With Auto-Compression) ---------- */
const DEFAULT_STORE_PHOTOS = {
    main: "store_main.jpg",
    down1: "store_interior.jpg",
    down2: "store_rack.jpg",
    down3: "store_denim.jpg"
};

function getSavedStorePhotos() {
    try {
        const saved = localStorage.getItem("jdi_store_showcase_photos");
        return saved ? JSON.parse(saved) : DEFAULT_STORE_PHOTOS;
    } catch (e) {
        return DEFAULT_STORE_PHOTOS;
    }
}

function loadShowcaseAdmin() {
    const photos = getSavedStorePhotos();

    const mainInput = $("#storeMainUrl");
    const down1Input = $("#storeDown1Url");
    const down2Input = $("#storeDown2Url");
    const down3Input = $("#storeDown3Url");

    if (mainInput) mainInput.value = photos.main && !photos.main.startsWith("data:") ? photos.main : "";
    if (down1Input) down1Input.value = photos.down1 && !photos.down1.startsWith("data:") ? photos.down1 : "";
    if (down2Input) down2Input.value = photos.down2 && !photos.down2.startsWith("data:") ? photos.down2 : "";
    if (down3Input) down3Input.value = photos.down3 && !photos.down3.startsWith("data:") ? photos.down3 : "";

    renderShowcasePreview("previewStoreMain", photos.main || DEFAULT_STORE_PHOTOS.main);
    renderShowcasePreview("previewStoreDown1", photos.down1 || DEFAULT_STORE_PHOTOS.down1);
    renderShowcasePreview("previewStoreDown2", photos.down2 || DEFAULT_STORE_PHOTOS.down2);
    renderShowcasePreview("previewStoreDown3", photos.down3 || DEFAULT_STORE_PHOTOS.down3);
}

function renderShowcasePreview(containerId, url) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = url ? `<img src="${esc(url)}" alt="Preview" style="height:70px;border-radius:6px;border:1px solid var(--line);object-fit:cover">` : "";
}

async function processShowcaseFileInput(fileInput) {
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const f = fileInput.files[0];
        // Auto-compress showcase images to max 1600px, 80% quality
        const res = await compressImage(f, { maxWidth: 1600, maxHeight: 1600, quality: 0.80, outputType: "image/jpeg" });
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(res.blob);
        });
    }
    return null;
}

const adminStoreShowcaseForm = $("#adminStoreShowcaseForm");
if (adminStoreShowcaseForm) {
    adminStoreShowcaseForm.onsubmit = async e => {
        e.preventDefault();
        const msgEl = $("#showcaseMsg");
        if (msgEl) {
            msgEl.textContent = "Compressing & saving showcase photos…";
            msgEl.className = "msg";
        }

        const existing = getSavedStorePhotos();

        const fileMainData = await processShowcaseFileInput(document.getElementById("storeMainFile"));
        const fileDown1Data = await processShowcaseFileInput(document.getElementById("storeDown1File"));
        const fileDown2Data = await processShowcaseFileInput(document.getElementById("storeDown2File"));
        const fileDown3Data = await processShowcaseFileInput(document.getElementById("storeDown3File"));

        const updated = {
            main: fileMainData || ($("#storeMainUrl").value.trim() || existing.main || DEFAULT_STORE_PHOTOS.main),
            down1: fileDown1Data || ($("#storeDown1Url").value.trim() || existing.down1 || DEFAULT_STORE_PHOTOS.down1),
            down2: fileDown2Data || ($("#storeDown2Url").value.trim() || existing.down2 || DEFAULT_STORE_PHOTOS.down2),
            down3: fileDown3Data || ($("#storeDown3Url").value.trim() || existing.down3 || DEFAULT_STORE_PHOTOS.down3)
        };

        try {
            localStorage.setItem("jdi_store_showcase_photos", JSON.stringify(updated));
            if (msgEl) {
                msgEl.textContent = "Showcase photos compressed and updated successfully!";
                msgEl.className = "msg ok";
            }
            loadShowcaseAdmin();
        } catch (err) {
            if (msgEl) {
                msgEl.textContent = "Saved to current session.";
                msgEl.className = "msg";
            }
        }
    };
}

const btnResetShowcase = $("#btnResetShowcase");
if (btnResetShowcase) {
    btnResetShowcase.onclick = () => {
        localStorage.removeItem("jdi_store_showcase_photos");
        loadShowcaseAdmin();
        const msgEl = $("#showcaseMsg");
        if (msgEl) {
            msgEl.textContent = "Reset to default showroom photos.";
            msgEl.className = "msg ok";
        }
    };
}
