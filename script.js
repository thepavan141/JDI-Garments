/* ===== SHOP SETTINGS: replace with the real details ===== */
const SHOP = {
    name: "JDI Garments",
    whatsapp: "91XXXXXXXXXX",          // order WhatsApp number, with country code (e.g. 919876543210)
    phone: "+91XXXXXXXXXX",             // Shop phone number
    communityLink: "",                  // WhatsApp community invite link
    mapQuery: "JDI Garments Devichowk"   // Google Maps search query
};

/* ===== STATE & UTILITIES ===== */
let products = [];
let cat = "All";
let term = "";
let isLoading = true;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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

const capitalize = s => {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
};

const rupee = n => "₹" + Number(n || 0).toLocaleString("en-IN");

const priceHTML = p => {
    let h = `<strong>${rupee(p.price)}</strong>`;
    if (p.original_price && Number(p.original_price) > Number(p.price)) {
        const pct = Math.round((1 - p.price / p.original_price) * 100);
        h += `<span class="was">${rupee(p.original_price)}</span><span class="off">${pct}% OFF</span>`;
    }
    return h;
};

const wa = text => {
    const cleanNumber = (SHOP.whatsapp || "").replace(/\D/g, "");
    const targetNumber = cleanNumber.length >= 10 ? cleanNumber : "91XXXXXXXXXX";
    return `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;
};

/* ===== EXTERNAL LINKS SETUP ===== */
const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(SHOP.mapQuery);
const telUrl = "tel:" + SHOP.phone;

const dirEl = $("#dir"); if (dirEl) dirEl.href = mapUrl;
const callEl = $("#call"); if (callEl) callEl.href = telUrl;
const fabEl = $("#fab"); if (fabEl) fabEl.href = wa(`Hi ${SHOP.name}, I want to enquire about outfits at your Devichowk store.`);

const jc = $("#joinCommunity");
if (jc) {
    jc.href = SHOP.communityLink || wa(`Hi ${SHOP.name}, please add me to your WhatsApp community for weekly stock drops.`);
}

// Footer links
const footerWaBtn = $("#footerWaBtn"); if (footerWaBtn) footerWaBtn.href = SHOP.communityLink || wa(`Hi ${SHOP.name}, I want to join the WhatsApp community for weekly fresh drops.`);
const footerDirBtn = $("#footerDirBtn"); if (footerDirBtn) footerDirBtn.href = mapUrl;
const footerCallLink = $("#footerCallLink"); if (footerCallLink) footerCallLink.href = telUrl;
const footerMapLink = $("#footerMapLink"); if (footerMapLink) footerMapLink.href = mapUrl;
const footerWaSupport = $("#footerWaSupport"); if (footerWaSupport) footerWaSupport.href = wa(`Hi ${SHOP.name}, I need assistance with an order or product enquiry.`);
const mobileWaOrder = $("#mobileWaOrder"); if (mobileWaOrder) mobileWaOrder.href = wa(`Hi ${SHOP.name}, I want to check available outfits at your Devichowk store.`);

/* Check if Admin Mode is requested via URL (?admin=1) */
const isAdminMode = new URLSearchParams(window.location.search).has("admin") || localStorage.getItem("jdi_is_admin") === "true";
const btnOpenAdminStore = $("#btnOpenAdminStore");
if (btnOpenAdminStore && isAdminMode) {
    btnOpenAdminStore.style.display = "inline-flex";
}

/* Category icons helper */
function getCategoryIcon(c) {
    if (c === "All") return "✦ ";
    const lower = c.toLowerCase();
    if (lower.includes("summer")) return "☀️ ";
    if (lower.includes("party")) return "✨ ";
    if (lower.includes("shirt")) return "👔 ";
    if (lower.includes("jean") || lower.includes("pant") || lower.includes("trouser") || lower.includes("denim")) return "👖 ";
    if (lower.includes("t-shirt") || lower.includes("tshirt") || lower.includes("tee")) return "👕 ";
    if (lower.includes("daily")) return "👕 ";
    if (lower.includes("kurta") || lower.includes("ethnic")) return "🥻 ";
    return "❖ ";
}

/* ===== SKELETON LOADING SHIMMER ===== */
function renderSkeletons() {
    const gridEl = $("#grid");
    if (!gridEl) return;
    gridEl.innerHTML = Array.from({ length: 4 }).map(() => `
        <div class="product-skeleton-card" aria-hidden="true">
            <div class="skeleton-img skeleton-pulse"></div>
            <div class="skeleton-info">
                <div class="skeleton-line skeleton-tag skeleton-pulse"></div>
                <div class="skeleton-line skeleton-title skeleton-pulse"></div>
                <div class="skeleton-line skeleton-price skeleton-pulse"></div>
                <div class="skeleton-btn skeleton-pulse"></div>
            </div>
        </div>
    `).join("");
}

/* ===== CATEGORY CHIPS RENDERING ===== */
function renderChips() {
    const chipsEl = $("#chips");
    if (!chipsEl) return;

    const dynamicCats = [...new Set(products.map(p => p.category ? capitalize(p.category.trim()) : "").filter(Boolean))];
    const cats = ["All", ...dynamicCats];

    chipsEl.innerHTML = cats.map(c => {
        const isCurrent = c.toLowerCase() === cat.toLowerCase();
        const icon = getCategoryIcon(c);
        const count = c === "All" ? products.length : products.filter(p => (p.category || "").toLowerCase() === c.toLowerCase()).length;

        return `
        <button class="chip chip-type ${isCurrent ? "active" : ""}" aria-pressed="${isCurrent}" data-c="${esc(c)}">
            <span class="chip-icon">${icon}</span>${esc(c)} <span class="chip-count">(${count})</span>
        </button>`;
    }).join("");
}

/* ===== PRODUCTS GRID RENDERING ===== */
function render() {
    const gridEl = $("#grid");
    const emptyEl = $("#empty");
    if (!gridEl) return;

    if (isLoading) {
        renderSkeletons();
        return;
    }

    const filtered = products.filter(p => {
        const pCat = capitalize(p.category || "");
        const matchesCat = (cat === "All" || pCat.toLowerCase() === cat.toLowerCase());

        const searchBlob = [
            p.name,
            p.category,
            p.style,
            p.guide,
            toArray(p.sizes).join(" "),
            toArray(p.colors).join(" ")
        ].filter(Boolean).join(" ").toLowerCase();

        const matchesTerm = !term || searchBlob.includes(term);
        return matchesCat && matchesTerm;
    });

    if (emptyEl) {
        emptyEl.hidden = filtered.length > 0;
    }

    if (filtered.length === 0) {
        gridEl.innerHTML = `
        <div class="store-empty-card" style="grid-column: 1 / -1;">
            <div class="empty-icon">🛍️</div>
            <h3>No Outfits Found</h3>
            <p>${term ? `No products found matching "<strong>${esc(term)}</strong>"` : `No products found in the "<strong>${esc(cat)}</strong>" category.`}</p>
            <div class="btns" style="justify-content:center;margin-top:14px">
                <button type="button" class="btn primary" id="btnResetFilters">View All Outfits</button>
            </div>
        </div>`;

        const btnResetFilters = document.getElementById("btnResetFilters");
        if (btnResetFilters) {
            btnResetFilters.onclick = () => {
                cat = "All";
                term = "";
                const searchInput = $("#q");
                if (searchInput) searchInput.value = "";
                renderChips();
                render();
            };
        }
        return;
    }

    gridEl.innerHTML = filtered.map(p => {
        const images = toArray(p.images);
        const firstImg = images.length > 0 ? images[0] : "";
        const hasPhoto = Boolean(firstImg);
        const sizes = toArray(p.sizes);
        const displayCategory = capitalize(p.category || "Outfit");

        const discountPct = (p.original_price && Number(p.original_price) > Number(p.price))
            ? Math.round((1 - p.price / p.original_price) * 100)
            : 0;

        const waDirect = wa(`Hi ${SHOP.name}, I want to check availability for "${p.name}" (${displayCategory}) priced at ${rupee(p.price)} at your Devichowk store.`);

        return `
        <div class="fashion-card ${p.in_stock === false ? "is-soldout" : ""}" data-id="${esc(p.id)}">
            <div class="fashion-card-media" data-quick-id="${esc(p.id)}" title="Click to view details">
                ${hasPhoto
                    ? `<img src="${esc(firstImg)}" alt="${esc(p.name)}" class="fashion-img" loading="lazy">`
                    : `<div class="fashion-placeholder-img"><span>👔</span></div>`
                }

                <div class="card-badge-container">
                    ${p.is_new ? `<span class="fashion-badge badge-new">NEW</span>` : ""}
                    ${discountPct > 0 ? `<span class="fashion-badge badge-discount">${discountPct}% OFF</span>` : ""}
                </div>

                ${p.in_stock === false ? `<div class="soldout-overlay"><span>SOLD OUT</span></div>` : ""}

                <button type="button" class="fashion-quick-btn" data-id="${esc(p.id)}" aria-label="Quick View">
                    <span>Quick View</span>
                </button>
            </div>

            <div class="fashion-card-body">
                <div class="fashion-card-cat">${esc(displayCategory)}</div>
                <h3 class="fashion-card-title" title="${esc(p.name)}">${esc(p.name)}</h3>

                ${sizes.length > 0 ? `
                <div class="fashion-sizes-row">
                    ${sizes.slice(0, 5).map(s => `<span class="mini-size-pill">${esc(s)}</span>`).join("")}
                    ${sizes.length > 5 ? `<span class="mini-size-pill">+${sizes.length - 5}</span>` : ""}
                </div>` : ""}

                <div class="fashion-price-row">
                    <span class="current-price">${rupee(p.price)}</span>
                    ${p.original_price && Number(p.original_price) > Number(p.price) ? `<span class="original-price">${rupee(p.original_price)}</span>` : ""}
                    ${discountPct > 0 ? `<span class="savings-tag">Save ${rupee(p.original_price - p.price)}</span>` : ""}
                </div>

                <div class="fashion-card-actions">
                    <button class="btn-card-quick" type="button" data-id="${esc(p.id)}">
                        <span>Details</span>
                    </button>
                    <a class="btn-card-wa" href="${waDirect}" target="_blank" rel="noopener" aria-label="Order on WhatsApp">
                        <svg class="wa-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.586 1.777.818 2.8.818 3.181 0 5.768-2.587 5.768-5.768.001-3.18-2.585-5.767-5.772-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.077-1.782-.397-1.341-.555-2.203-1.89-2.27-1.979-.066-.09-1.042-1.388-1.042-2.646 0-1.258.657-1.879.89-2.135.232-.256.507-.32.677-.32.17 0 .341.002.489.01.157.009.367-.06.574.437.213.513.725 1.77.788 1.9.064.13.106.282.019.453-.086.171-.13.277-.256.425-.128.149-.268.332-.383.447-.128.128-.261.267-.112.523.149.256.662 1.092 1.42 1.767.977.871 1.799 1.141 2.055 1.27.256.128.405.107.554-.064.15-.171.64-.746.811-1.002.17-.256.341-.213.575-.128.234.085 1.488.702 1.744.83.256.128.426.192.489.298.064.107.064.618-.08 1.023z"/></svg>
                        <span>WhatsApp</span>
                    </a>
                </div>
            </div>
        </div>`;
    }).join("");
}

/* ===== QUICK VIEW MODAL DIALOG ===== */
function openProduct(id) {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;

    const dlg = $("#dlg");
    const dbody = $("#dbody");
    if (!dlg || !dbody) return;

    const images = toArray(p.images);
    const firstImg = images.length > 0 ? images[0] : "";
    const sizes = toArray(p.sizes);
    const colors = toArray(p.colors);
    const displayCategory = capitalize(p.category || "Outfit");

    dbody.innerHTML = `
    <div class="dlg-product-wrap">
        <div class="dlg-media-column">
            <div class="dlg-hero-frame">
                ${firstImg
                    ? `<img src="${esc(firstImg)}" id="dlgHeroImg" alt="${esc(p.name)}" class="dlg-hero-img">`
                    : `<div class="dlg-hero-placeholder"><span>👔</span></div>`
                }
                ${p.is_new ? `<span class="fashion-badge badge-new" style="position:absolute;top:12px;left:12px">NEW</span>` : ""}
            </div>

            ${images.length > 1 ? `
            <div class="dlg-thumbs-gallery">
                ${images.map((img, idx) => `
                    <button type="button" class="dlg-gallery-thumb ${idx === 0 ? "active" : ""}" data-img="${esc(img)}" aria-label="Photo ${idx + 1}">
                        <img src="${esc(img)}" alt="Thumb ${idx + 1}">
                    </button>
                `).join("")}
            </div>` : ""}
        </div>

        <div class="dlg-info-column">
            <div class="dlg-kicker">${esc(displayCategory)} Collection</div>
            <h2 class="dlg-title">${esc(p.name)}</h2>

            <div class="dlg-price-block">
                ${priceHTML(p)}
            </div>

            <div class="dlg-stock-status ${p.in_stock ? "in-stock" : "out-of-stock"}">
                ${p.in_stock ? "● In stock at Devichowk showroom" : "○ Currently out of stock"}
            </div>

            ${sizes.length > 0 ? `
            <div class="dlg-selector-group">
                <label class="dlg-selector-label"><strong>Select Size:</strong> <span id="selSizeLabel">${esc(sizes[0])}</span></label>
                <div class="dlg-options" data-group="size">
                    ${sizes.map((s, i) => `<button type="button" class="dlg-choice-chip ${i === 0 ? "selected" : ""}" data-val="${esc(s)}">${esc(s)}</button>`).join("")}
                </div>
            </div>` : ""}

            ${colors.length > 0 ? `
            <div class="dlg-selector-group">
                <label class="dlg-selector-label"><strong>Select Colour:</strong> <span id="selColorLabel">${esc(colors[0])}</span></label>
                <div class="dlg-options" data-group="color">
                    ${colors.map((c, i) => `<button type="button" class="dlg-choice-chip ${i === 0 ? "selected" : ""}" data-val="${esc(c)}">${esc(c)}</button>`).join("")}
                </div>
            </div>` : ""}

            <div class="dlg-order-box">
                <a class="btn dlg-wa-btn" id="dlgOrderBtn" target="_blank" rel="noopener" href="#">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.586 1.777.818 2.8.818 3.181 0 5.768-2.587 5.768-5.768.001-3.18-2.585-5.767-5.772-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.077-1.782-.397-1.341-.555-2.203-1.89-2.27-1.979-.066-.09-1.042-1.388-1.042-2.646 0-1.258.657-1.879.89-2.135.232-.256.507-.32.677-.32.17 0 .341.002.489.01.157.009.367-.06.574.437.213.513.725 1.77.788 1.9.064.13.106.282.019.453-.086.171-.13.277-.256.425-.128.149-.268.332-.383.447-.128.128-.261.267-.112.523.149.256.662 1.092 1.42 1.767.977.871 1.799 1.141 2.055 1.27.256.128.405.107.554-.064.15-.171.64-.746.811-1.002.17-.256.341-.213.575-.128.234.085 1.488.702 1.744.83.256.128.426.192.489.298.064.107.064.618-.08 1.023z"/></svg>
                    <span>Order on WhatsApp</span>
                </a>
                <p class="dlg-pickup-note">🏪 Pay and collect in person · JDI Garments near Devichowk showroom.</p>
            </div>
        </div>
    </div>`;

    const getSelectedVal = groupName => {
        const sel = dbody.querySelector(`[data-group="${groupName}"] .dlg-choice-chip.selected`);
        return sel ? sel.dataset.val : "";
    };

    const updateOrderLink = () => {
        const selSize = getSelectedVal("size");
        const selColor = getSelectedVal("color");

        let msgText = `Hi ${SHOP.name}, I want to order from the ${displayCategory} collection:\n`;
        msgText += `• Item: ${p.name}\n`;
        if (selSize) msgText += `• Size: ${selSize}\n`;
        if (selColor) msgText += `• Colour: ${selColor}\n`;
        msgText += `• Price: ${rupee(p.price)}\n`;
        msgText += `I will pick it up at your store near Devichowk.`;

        const orderBtn = $("#dlgOrderBtn");
        if (orderBtn) {
            orderBtn.href = wa(msgText);
        }
    };

    dbody.onclick = e => {
        // Thumbnail switcher
        const thumbBtn = e.target.closest(".dlg-gallery-thumb");
        if (thumbBtn) {
            const heroImg = $("#dlgHeroImg");
            if (heroImg) heroImg.src = thumbBtn.dataset.img;
            dbody.querySelectorAll(".dlg-gallery-thumb").forEach(b => b.classList.toggle("active", b === thumbBtn));
            return;
        }

        // Chip selection
        const chip = e.target.closest(".dlg-choice-chip");
        if (chip) {
            const group = chip.closest("[data-group]");
            if (group) {
                group.querySelectorAll(".dlg-choice-chip").forEach(c => c.classList.toggle("selected", c === chip));
                const groupName = group.dataset.group;
                if (groupName === "size") {
                    const lbl = $("#selSizeLabel");
                    if (lbl) lbl.textContent = chip.dataset.val;
                } else if (groupName === "color") {
                    const lbl = $("#selColorLabel");
                    if (lbl) lbl.textContent = chip.dataset.val;
                }
                updateOrderLink();
            }
        }
    };

    updateOrderLink();
    document.body.style.overflow = "hidden";
    dlg.showModal();
}

function closeDialog() {
    const dlg = $("#dlg");
    if (dlg) {
        dlg.close();
        document.body.style.overflow = "";
    }
}

const closeBtn = $("#close");
if (closeBtn) closeBtn.onclick = closeDialog;

const dlg = $("#dlg");
if (dlg) {
    dlg.addEventListener("click", e => {
        if (e.target === dlg) closeDialog();
    });
    dlg.addEventListener("cancel", () => {
        document.body.style.overflow = "";
    });
}

/* Category Chips Click Handling */
const chipsEl = $("#chips");
if (chipsEl) {
    chipsEl.onclick = e => {
        const btn = e.target.closest(".chip-type");
        if (btn) {
            cat = btn.dataset.c;
            renderChips();
            render();
        }
    };
}

/* Products Grid Click Handling */
const gridEl = $("#grid");
if (gridEl) {
    gridEl.onclick = e => {
        const quickBtn = e.target.closest("[data-quick-id], .btn-card-quick, .fashion-quick-btn");
        if (quickBtn) {
            const id = quickBtn.dataset.quickId || quickBtn.dataset.id;
            if (id) openProduct(id);
        }
    };
}

/* ===== SEARCH BAR FUNCTIONALITY ===== */
const searchInput = $("#q");
const searchClearBtn = $("#clearSearch");

if (searchInput) {
    searchInput.oninput = e => {
        term = e.target.value.trim().toLowerCase();
        if (searchClearBtn) searchClearBtn.hidden = term.length === 0;
        render();

        if (term.length > 0) {
            const shopSection = document.getElementById("shop");
            if (shopSection) {
                const rect = shopSection.getBoundingClientRect();
                if (rect.top > 250 || rect.bottom < 0) {
                    shopSection.scrollIntoView({ behavior: "smooth" });
                }
            }
        }
    };

    searchInput.onkeydown = e => {
        if (e.key === "Enter") {
            const shopSection = document.getElementById("shop");
            if (shopSection) shopSection.scrollIntoView({ behavior: "smooth" });
        }
    };
}

if (searchClearBtn && searchInput) {
    searchClearBtn.onclick = () => {
        searchInput.value = "";
        term = "";
        searchClearBtn.hidden = true;
        render();
        searchInput.focus();
    };
}

/* ===== SUPABASE CATALOG INTEGRATION ===== */
async function loadSupabaseProducts() {
    isLoading = true;
    render();

    if (typeof sb === "undefined" || !sb) {
        console.warn("Supabase client is not available.");
        isLoading = false;
        render();
        return;
    }

    try {
        const { data, error } = await sb
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("Supabase fetch notice:", error.message);
            isLoading = false;
            render();
            return;
        }

        products = data || [];
        isLoading = false;
        renderChips();
        render();
    } catch (err) {
        console.warn("Supabase load exception:", err);
        isLoading = false;
        render();
    }
}

// Initial Call
loadSupabaseProducts();

// Real-time synchronization
try {
    if (typeof sb !== "undefined" && sb && sb.channel) {
        sb.channel("products_realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
                loadSupabaseProducts();
            })
            .subscribe();
    }
} catch (e) {
    // Ignore realtime setup errors
}

/* Explore / New Arrivals scroll trigger */
const btnNewArrivals = document.getElementById("btnNewArrivals");
if (btnNewArrivals) {
    btnNewArrivals.addEventListener("click", e => {
        const shopSection = document.getElementById("shop");
        if (shopSection) shopSection.scrollIntoView({ behavior: "smooth" });
    });
}

/* Footer Category Links */
document.addEventListener("click", e => {
    const typeLink = e.target.closest("[data-type-target]");
    if (typeLink) {
        const targetType = typeLink.getAttribute("data-type-target");
        if (targetType) {
            cat = targetType;
            renderChips();
            render();
            const shopSection = document.getElementById("shop");
            if (shopSection) shopSection.scrollIntoView({ behavior: "smooth" });
        }
    }

    const lbLink = e.target.closest("#footerLinkLookbook");
    if (lbLink) {
        e.preventDefault();
        const shopSection = document.getElementById("shop");
        if (shopSection) shopSection.scrollIntoView({ behavior: "smooth" });
    }
});

/* Mobile Nav Active Highlighting on Scroll */
window.addEventListener("scroll", () => {
    const scrollPos = window.scrollY + 200;
    const shopEl = document.getElementById("shop");
    const visitEl = document.getElementById("visit");

    const mHome = document.getElementById("mNavHome");
    const mFrames = document.getElementById("mNavFrames");
    const mStore = document.getElementById("mNavStore");

    if (!mHome || !mFrames || !mStore) return;

    mHome.classList.remove("active");
    mFrames.classList.remove("active");
    mStore.classList.remove("active");

    if (visitEl && scrollPos >= visitEl.offsetTop) {
        mStore.classList.add("active");
    } else if (shopEl && scrollPos >= shopEl.offsetTop) {
        mFrames.classList.add("active");
    } else {
        mHome.classList.add("active");
    }
}, { passive: true });

/* ===== PROMOTIONAL BANNER SLIDER ===== */
(function initPromoBanner() {
    const track = document.getElementById("promoTrack");
    const slider = document.getElementById("promoSlider");
    const prevBtn = document.getElementById("promoPrev");
    const nextBtn = document.getElementById("promoNext");
    const banner = document.getElementById("promoBanner");

    if (!track) return;
    const items = track.querySelectorAll(".promo-item");
    if (items.length <= 1) return;

    let current = 0;
    let isAnimating = false;
    let timer = null;

    function goTo(next, direction = 1) {
        if (isAnimating) return;
        isAnimating = true;

        const currentItem = items[current];
        const nextItem = items[next];

        currentItem.classList.remove("active");
        currentItem.classList.add(direction > 0 ? "leaving-up" : "leaving-down");

        setTimeout(() => {
            currentItem.classList.remove("leaving-up", "leaving-down");
            nextItem.classList.add("active");
            current = next;
            isAnimating = false;
        }, 250);
    }

    function nextOffer() { goTo((current + 1) % items.length, 1); }
    function prevOffer() { goTo((current - 1 + items.length) % items.length, -1); }

    function startTimer() { stopTimer(); timer = setInterval(nextOffer, 3500); }
    function stopTimer() { if (timer) clearInterval(timer); }

    if (nextBtn) nextBtn.addEventListener("click", e => { e.stopPropagation(); nextOffer(); startTimer(); });
    if (prevBtn) prevBtn.addEventListener("click", e => { e.stopPropagation(); prevOffer(); startTimer(); });
    if (slider) slider.addEventListener("click", () => { nextOffer(); startTimer(); });

    if (banner) {
        banner.addEventListener("mouseenter", stopTimer);
        banner.addEventListener("mouseleave", startTimer);
        banner.addEventListener("touchstart", stopTimer, { passive: true });
        banner.addEventListener("touchend", startTimer, { passive: true });
    }

    startTimer();
})();

/* ===== MOTION BANNER ===== */
(function initMotionBanner() {
    const banner = document.getElementById("motionBanner");
    if (!banner) return;
    const slides = banner.querySelectorAll(".motion-slide");
    const dots = banner.querySelectorAll(".banner-dots .dot");
    const prevBtn = document.getElementById("bannerPrev");
    const nextBtn = document.getElementById("bannerNext");

    if (slides.length < 2) return;

    let currentIndex = 0;
    let timer = null;
    let isTransitioning = false;

    function applyRandomMotion(slide) {
        const img = slide.querySelector(".banner-img");
        if (!img) return;

        img.style.animation = "none";
        const scale = (1.04 + Math.random() * 0.045).toFixed(3);
        const driftX = ((Math.random() - 0.5) * 5).toFixed(2);
        const driftY = ((Math.random() - 0.5) * 4).toFixed(2);
        const duration = (6 + Math.random() * 3).toFixed(1);

        img.style.transition = `transform ${duration}s cubic-bezier(0.25, 1, 0.5, 1)`;
        requestAnimationFrame(() => {
            img.style.transform = `scale(${scale}) translate(${driftX}%, ${driftY}%)`;
        });
    }

    function showSlide(index) {
        if (isTransitioning || index === currentIndex) return;
        isTransitioning = true;

        const prevSlide = slides[currentIndex];
        const nextSlide = slides[index];

        prevSlide.classList.remove("active");
        const prevImg = prevSlide.querySelector(".banner-img");
        if (prevImg) {
            prevImg.style.transition = "transform 0.8s ease-out";
            prevImg.style.transform = "scale(1) translate(0%, 0%)";
        }

        nextSlide.classList.add("active");
        applyRandomMotion(nextSlide);

        dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
        currentIndex = index;

        setTimeout(() => { isTransitioning = false; }, 800);
    }

    function nextBanner() { showSlide((currentIndex + 1) % slides.length); }
    function prevBanner() { showSlide((currentIndex - 1 + slides.length) % slides.length); }

    function startTimer() { stopTimer(); timer = setInterval(nextBanner, 4800); }
    function stopTimer() { if (timer) clearInterval(timer); }

    if (nextBtn) nextBtn.addEventListener("click", () => { nextBanner(); startTimer(); });
    if (prevBtn) prevBtn.addEventListener("click", () => { prevBanner(); startTimer(); });

    dots.forEach((dot, i) => dot.addEventListener("click", () => { showSlide(i); startTimer(); }));

    // Touch swipe support
    let touchStartX = 0;
    banner.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; stopTimer(); }, { passive: true });
    banner.addEventListener("touchend", e => {
        const diffX = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(diffX) > 40) {
            if (diffX < 0) nextBanner();
            else prevBanner();
        }
        startTimer();
    }, { passive: true });

    banner.addEventListener("mouseenter", stopTimer);
    banner.addEventListener("mouseleave", startTimer);

    // Subtle parallax motion
    banner.addEventListener("mousemove", e => {
        const activeSlide = slides[currentIndex];
        const img = activeSlide ? activeSlide.querySelector(".banner-img") : null;
        if (!img) return;
        const rect = banner.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width - 0.5;
        const normY = (e.clientY - rect.top) / rect.height - 0.5;
        img.style.transition = "transform 0.4s cubic-bezier(0.2, 0.8, 0.4, 1)";
        img.style.transform = `scale(1.05) translate(${(normX * -2.5).toFixed(2)}%, ${(normY * -2.5).toFixed(2)}%)`;
    });

    applyRandomMotion(slides[0]);
    startTimer();
})();

/* ===== STORE SHOWCASE PHOTOS (LOCALSTORAGE / DEFAULTS) ===== */
(function initStoreShowcasePhotos() {
    const DEFAULT_PHOTOS = {
        main: "store_main.jpg",
        down1: "store_interior.jpg",
        down2: "store_rack.jpg",
        down3: "store_denim.jpg"
    };

    function getSavedPhotos() {
        try {
            const saved = localStorage.getItem("jdi_store_showcase_photos");
            return saved ? JSON.parse(saved) : DEFAULT_PHOTOS;
        } catch (e) {
            return DEFAULT_PHOTOS;
        }
    }

    function applyPhotos(photos) {
        const imgMain = document.getElementById("imgStoreMain");
        const imgDown1 = document.getElementById("imgStoreDown1");
        const imgDown2 = document.getElementById("imgStoreDown2");
        const imgDown3 = document.getElementById("imgStoreDown3");

        if (imgMain) imgMain.src = photos.main || DEFAULT_PHOTOS.main;
        if (imgDown1) imgDown1.src = photos.down1 || DEFAULT_PHOTOS.down1;
        if (imgDown2) imgDown2.src = photos.down2 || DEFAULT_PHOTOS.down2;
        if (imgDown3) imgDown3.src = photos.down3 || DEFAULT_PHOTOS.down3;
    }

    applyPhotos(getSavedPhotos());

    // Admin Dialog Handling (if accessed via ?admin=1)
    const btnOpenAdmin = document.getElementById("btnOpenAdminStore");
    const adminDlg = document.getElementById("adminStoreDlg");
    const btnCloseAdmin = document.getElementById("closeAdminStoreDlg");
    const adminForm = document.getElementById("adminStoreForm");
    const btnReset = document.getElementById("btnResetStoreImgs");

    if (btnOpenAdmin && adminDlg) {
        btnOpenAdmin.addEventListener("click", () => {
            const p = getSavedPhotos();
            const inputMain = document.getElementById("inputStoreMainUrl");
            const inputDown1 = document.getElementById("inputStoreDown1Url");
            const inputDown2 = document.getElementById("inputStoreDown2Url");
            const inputDown3 = document.getElementById("inputStoreDown3Url");

            if (inputMain) inputMain.value = p.main && !p.main.startsWith("data:") ? p.main : "";
            if (inputDown1) inputDown1.value = p.down1 && !p.down1.startsWith("data:") ? p.down1 : "";
            if (inputDown2) inputDown2.value = p.down2 && !p.down2.startsWith("data:") ? p.down2 : "";
            if (inputDown3) inputDown3.value = p.down3 && !p.down3.startsWith("data:") ? p.down3 : "";
            adminDlg.showModal();
        });
    }

    if (btnCloseAdmin && adminDlg) {
        btnCloseAdmin.addEventListener("click", () => adminDlg.close());
    }

    if (adminDlg) {
        adminDlg.addEventListener("click", e => {
            if (e.target === adminDlg) adminDlg.close();
        });
    }

    function readFileInput(fileInput) {
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

    if (adminForm) {
        adminForm.addEventListener("submit", async e => {
            e.preventDefault();
            const existing = getSavedPhotos();

            const fileMainData = await readFileInput(document.getElementById("fileStoreMain"));
            const fileDown1Data = await readFileInput(document.getElementById("fileStoreDown1"));
            const fileDown2Data = await readFileInput(document.getElementById("fileStoreDown2"));
            const fileDown3Data = await readFileInput(document.getElementById("fileStoreDown3"));

            const inputMain = document.getElementById("inputStoreMainUrl");
            const inputDown1 = document.getElementById("inputStoreDown1Url");
            const inputDown2 = document.getElementById("inputStoreDown2Url");
            const inputDown3 = document.getElementById("inputStoreDown3Url");

            const updated = {
                main: fileMainData || ((inputMain && inputMain.value.trim()) || existing.main || DEFAULT_PHOTOS.main),
                down1: fileDown1Data || ((inputDown1 && inputDown1.value.trim()) || existing.down1 || DEFAULT_PHOTOS.down1),
                down2: fileDown2Data || ((inputDown2 && inputDown2.value.trim()) || existing.down2 || DEFAULT_PHOTOS.down2),
                down3: fileDown3Data || ((inputDown3 && inputDown3.value.trim()) || existing.down3 || DEFAULT_PHOTOS.down3)
            };

            try {
                localStorage.setItem("jdi_store_showcase_photos", JSON.stringify(updated));
            } catch (err) {
                console.warn("Storage quota notice.");
            }

            applyPhotos(updated);
            if (adminDlg) adminDlg.close();
        });
    }

    if (btnReset) {
        btnReset.addEventListener("click", () => {
            localStorage.removeItem("jdi_store_showcase_photos");
            applyPhotos(DEFAULT_PHOTOS);
            if (adminDlg) adminDlg.close();
        });
    }
})();
