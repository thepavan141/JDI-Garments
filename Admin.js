const $ = s => document.querySelector(s);
const rupee = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const BUCKET = "product-images";

let items = [];
let editing = null;
let keepImages = []; // Array of URLs or data URLs
let pendingUploadFiles = []; // Array of File objects selected for upload

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

function renderAdminProductsList() {
    const listEl = $("#list");
    const countEl = $("#count");
    if (!listEl) return;

    const filterVal = ($("#adminFilter") ? $("#adminFilter").value : "").trim().toLowerCase();
    const filtered = items.filter(p => {
        if (!filterVal) return true;
        return (String(p.name || "") + " " + String(p.category || "")).toLowerCase().includes(filterVal);
    });

    if (countEl) countEl.textContent = `Products (${items.length})`;

    if (filtered.length === 0) {
        listEl.innerHTML = `<p style="color:var(--muted);padding:14px 0">${items.length === 0 ? "No products in database yet. Add your first product above." : "No products match your filter search."}</p>`;
        return;
    }

    listEl.innerHTML = filtered.map(p => {
        const imgs = toArray(p.images);
        const thumbUrl = imgs[0] || "";
        const sizes = toArray(p.sizes);
        const colors = toArray(p.colors);

        return `
        <div class="item" data-id="${esc(p.id)}">
            <div class="t" style="background-image:url('${esc(thumbUrl)}')"></div>
            <div class="m">
                <strong>${esc(p.name)}</strong>
                <div class="item-meta">
                    <span style="font-weight:700;color:var(--ink)">${rupee(p.price)}</span>
                    ${p.original_price && p.original_price > p.price ? `<span style="text-decoration:line-through">${rupee(p.original_price)}</span>` : ""}
                    <span>·</span>
                    <span>${esc(p.category || "Outfit")}</span>
                    <span>·</span>
                    <span class="item-badge ${p.in_stock ? "badge-green" : "badge-red"}">${p.in_stock ? "In stock" : "Sold out"}</span>
                    ${p.is_new ? `<span class="item-badge badge-new-item">New Arrival</span>` : ""}
                </div>
                ${sizes.length > 0 ? `<div style="font-size:0.78rem;color:var(--muted);margin-top:3px">Sizes: ${esc(sizes.join(", "))}</div>` : ""}
            </div>
            <div class="acts">
                <button class="sm" data-act="edit">Edit</button>
                <button class="sm" data-act="stock">${p.in_stock ? "Mark Sold Out" : "Mark In Stock"}</button>
                <button class="sm" data-act="new">${p.is_new ? "Remove New" : "Mark New"}</button>
                <button class="sm danger" data-act="del">Delete</button>
            </div>
        </div>`;
    }).join("");
}

const adminFilterInput = $("#adminFilter");
if (adminFilterInput) {
    adminFilterInput.oninput = () => renderAdminProductsList();
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

            // Cleanup storage images
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
            <button type="button" class="thumb-del" data-type="keep" data-i="${i}" title="Remove photo">×</button>
        </div>`;
    });

    // Pending file uploads preview
    pendingUploadFiles.forEach((item, i) => {
        html += `
        <div class="thumb-item" style="background-image:url('${esc(item.preview)}')">
            <span style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.65);color:#fff;font-size:0.6rem;text-align:center;padding:1px 0">New</span>
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

// File input handler for immediate local preview
const filesInput = $("#files");
if (filesInput) {
    filesInput.onchange = () => {
        const files = Array.from(filesInput.files || []);
        files.forEach(f => {
            const previewUrl = URL.createObjectURL(f);
            pendingUploadFiles.push({ file: f, preview: previewUrl });
        });
        filesInput.value = ""; // Reset so same file can be re-selected if removed
        drawThumbs();
    };
}

function resetForm() {
    editing = null;
    keepImages = [];
    pendingUploadFiles = [];

    const pform = $("#pform");
    if (pform) pform.reset();

    const instock = $("#instock");
    if (instock) instock.checked = true;

    drawThumbs();

    const ftitle = $("#ftitle");
    if (ftitle) ftitle.textContent = "Add Product";

    const cancelBtn = $("#cancel");
    if (cancelBtn) cancelBtn.hidden = true;
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
        msg("Saving product…");

        try {
            const uploadedUrls = [];

            // Upload pending files to Supabase Storage
            for (const item of pendingUploadFiles) {
                const f = item.file;
                const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
                const path = `${crypto.randomUUID()}.${ext}`;

                const { error: uploadErr } = await sb.storage.from(BUCKET).upload(path, f, {
                    contentType: f.type || "image/jpeg",
                    cacheControl: "3600",
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
            msg("Product successfully saved! ✓", false);
            await loadList();
        } catch (err) {
            console.error("Save product error:", err);
            msg(err.message || "Failed to save product. Please try again.", true);
        } finally {
            saveBtn.disabled = false;
        }
    };
}

/* ---------- Store Showcase Photos Admin ---------- */
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

function readFileAsDataUrl(fileInput) {
    return new Promise(resolve => {
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            resolve(null);
        }
    });
}

const adminStoreShowcaseForm = $("#adminStoreShowcaseForm");
if (adminStoreShowcaseForm) {
    adminStoreShowcaseForm.onsubmit = async e => {
        e.preventDefault();
        const msgEl = $("#showcaseMsg");
        if (msgEl) {
            msgEl.textContent = "Saving showcase photos…";
            msgEl.className = "msg";
        }

        const existing = getSavedStorePhotos();

        const fileMainData = await readFileAsDataUrl($("#storeMainFile"));
        const fileDown1Data = await readFileAsDataUrl($("#storeDown1File"));
        const fileDown2Data = await readFileAsDataUrl($("#storeDown2File"));
        const fileDown3Data = await readFileAsDataUrl($("#storeDown3File"));

        const updated = {
            main: fileMainData || ($("#storeMainUrl").value.trim() || existing.main || DEFAULT_STORE_PHOTOS.main),
            down1: fileDown1Data || ($("#storeDown1Url").value.trim() || existing.down1 || DEFAULT_STORE_PHOTOS.down1),
            down2: fileDown2Data || ($("#storeDown2Url").value.trim() || existing.down2 || DEFAULT_STORE_PHOTOS.down2),
            down3: fileDown3Data || ($("#storeDown3Url").value.trim() || existing.down3 || DEFAULT_STORE_PHOTOS.down3)
        };

        try {
            localStorage.setItem("jdi_store_showcase_photos", JSON.stringify(updated));
            if (msgEl) {
                msgEl.textContent = "Showcase photos updated successfully! ✓";
                msgEl.className = "msg ok";
            }
            loadShowcaseAdmin();
        } catch (err) {
            if (msgEl) {
                msgEl.textContent = "Saved to local session. (Storage quota reached for base64 images).";
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
            msgEl.textContent = "Reset to default showroom photos. ✓";
            msgEl.className = "msg ok";
        }
    };
}
