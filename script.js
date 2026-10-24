/* ===== SHOP SETTINGS: replace with the real details ===== */
const SHOP = {
    name: "JDI Garments",
    whatsapp: "91XXXXXXXXXX",          // order number, with country code, no + or spaces
    phone: "+91XXXXXXXXXX",
    communityLink: "",                  // WhatsApp community invite link
    mapQuery: "JDI Garments Devichowk"   // replace with the exact Google Maps place name
};

/* ===== PRODUCTS DATA (Loaded dynamically from Admin & Supabase) ===== */
let products = [];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rupee = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const priceHTML = p => {
    let h = rupee(p.price);
    if (p.original_price && p.original_price > p.price) {
        const pct = Math.round((1 - p.price / p.original_price) * 100);
        h += `<span class="was">${rupee(p.original_price)}</span><span class="off">${pct}% OFF</span>`;
    }
    return h;
};
const wa = text => `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`;
let cat = "All", term = "";

/* links */
const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(SHOP.mapQuery);
const telUrl = "tel:" + SHOP.phone;

const dirEl = $("#dir"); if (dirEl) dirEl.href = mapUrl;
const callEl = $("#call"); if (callEl) callEl.href = telUrl;
const fabEl = $("#fab"); if (fabEl) fabEl.href = wa("Hi " + SHOP.name + ", I have a question.");
const jc = $("#joinCommunity");
if (jc) {
    if (SHOP.communityLink) jc.href = SHOP.communityLink;
    else jc.href = wa("Hi " + SHOP.name + ", please add me to your WhatsApp community for weekly stock drops.");
}

// Footer links
const footerWaBtn = $("#footerWaBtn"); if (footerWaBtn) footerWaBtn.href = SHOP.communityLink || wa("Hi " + SHOP.name + ", I want to join the WhatsApp community for weekly fresh drops.");
const footerDirBtn = $("#footerDirBtn"); if (footerDirBtn) footerDirBtn.href = mapUrl;
const footerCallLink = $("#footerCallLink"); if (footerCallLink) footerCallLink.href = telUrl;
const footerMapLink = $("#footerMapLink"); if (footerMapLink) footerMapLink.href = mapUrl;
const footerWaSupport = $("#footerWaSupport"); if (footerWaSupport) footerWaSupport.href = wa("Hi " + SHOP.name + ", I need assistance with an order or product enquiry.");
const mobileWaOrder = $("#mobileWaOrder"); if (mobileWaOrder) mobileWaOrder.href = wa("Hi " + SHOP.name + ", I want to check available outfits at your Devichowk store.");

// Footer collection links click handler (filters by category)
document.addEventListener("click", e => {
    const typeLink = e.target.closest("[data-type-target]");
    if (typeLink) {
        const targetType = typeLink.getAttribute("data-type-target");
        if (targetType) {
            cat = targetType;
            renderChips();
            render();
            const shopSection = document.getElementById("shop");
            if (shopSection) {
                shopSection.scrollIntoView({ behavior: "smooth" });
            }
        }
    }

    // Footer lookbook trigger
    const lbLink = e.target.closest("#footerLinkLookbook");
    if (lbLink) {
        e.preventDefault();
        const shopSection = document.getElementById("shop");
        if (shopSection) {
            shopSection.scrollIntoView({ behavior: "smooth" });
        }
    }
});

// Mobile Bottom Nav Active Highlighting on scroll
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

function renderChips() {
    const dynamicCats = [...new Set(products.map(p => p.category).filter(Boolean))];
    const cats = dynamicCats.length > 0 ? ["All", ...dynamicCats] : ["All"];

    const chipsEl = $("#chips");
    if (!chipsEl) return;
    chipsEl.innerHTML = cats.map(c => {
        const isCurrent = c === cat;
        let icon = "❖ ";
        const lower = c.toLowerCase();
        if (lower.includes("summer")) icon = "☀️ ";
        else if (lower.includes("party")) icon = "✨ ";
        else if (lower.includes("daily")) icon = "👕 ";
        else if (lower.includes("shirt")) icon = "👔 ";
        else if (lower.includes("pant") || lower.includes("jean") || lower.includes("trouser")) icon = "👖 ";
        else if (c === "All") icon = "✦ ";
        const count = c === "All" ? products.length : products.filter(p => p.category === c).length;
        return `<button class="chip chip-type" aria-pressed="${isCurrent}" data-c="${esc(c)}">
            <span class="chip-icon">${icon}</span>${esc(c)} <span class="chip-count">(${count})</span>
        </button>`;
    }).join("");
}

function render() {
    const list = products.filter(p =>
        (cat === "All" || p.category === cat) &&
        (String(p.name || "") + " " + String(p.category || "") + " " + String(p.style || "") + " " + String(p.guide || "")).toLowerCase().includes(term));
    
    const emptyEl = $("#empty");
    if (emptyEl) emptyEl.hidden = list.length > 0;

    const gridEl = $("#grid");
    if (!gridEl) return;

    gridEl.innerHTML = list.length ? list.map(p => {
        const typeSlug = (p.category || "").toLowerCase().replace(/\s+/g, '-');
        const tagClass = p.category === "Summer Wear" ? "frame-tag-summer" : (p.category === "Party Wear" ? "frame-tag-party" : (p.category === "Daily Wear" ? "frame-tag-daily" : "frame-tag-custom"));
        const thumbClass = p.category === "Summer Wear" ? "thumb-summer" : (p.category === "Party Wear" ? "thumb-party" : (p.category === "Daily Wear" ? "thumb-daily" : "thumb-custom"));
        const waDirect = wa(`Hi ${SHOP.name}, I want to check availability for "${p.name}" (${p.category || "Outfit"}) priced at ${rupee(p.price)} at your Devichowk store.`);
        
        const images = Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []);
        const firstImg = images.length > 0 ? images[0] : "";
        const hasPhoto = Boolean(firstImg);

        return `
        <div class="look-card-frame type-${typeSlug}" data-id="${esc(p.id)}">
            <div class="look-photo-frame ${hasPhoto ? "has-photo" : ""}" data-quick-id="${esc(p.id)}" title="Click to view details" ${hasPhoto ? `style="background-image:url('${esc(firstImg)}');"` : ""}>
                ${p.is_new ? `<span class="card-badge badge-new">New</span>` : ""}
                ${p.in_stock === false ? `<span class="card-badge badge-soldout">Sold Out</span>` : ""}
                <div class="frame-placeholder">
                    <div class="frame-tag ${tagClass}">${esc(p.category || "Outfit")}</div>
                    ${p.guide || p.style ? `<div class="frame-guide">${esc(p.guide || p.style)}</div>` : ""}
                </div>
                ${(p.pins || []).map(pin => `
                    <span class="look-pin" style="top: ${pin.top}; left: ${pin.left};" title="${esc(pin.label)}"></span>
                `).join("")}
            </div>
            <div class="look-product-box">
                <div class="look-product-top">
                    <div class="look-thumb-frame ${hasPhoto ? "has-thumb-img" : thumbClass}" ${hasPhoto ? `style="background-image:url('${esc(firstImg)}');"` : ""}></div>
                    <div class="look-details">
                        <div class="look-item-title" title="${esc(p.name)}">${esc(p.name)}</div>
                        <div class="look-item-price">
                            <strong>${rupee(p.price)}</strong>
                            ${p.original_price && Number(p.original_price) > Number(p.price) ? `<span class="was">${rupee(p.original_price)}</span>` : ""}
                            ${p.original_price && Number(p.original_price) > Number(p.price) ? `<span class="off">${Math.round((1 - p.price / p.original_price) * 100)}% OFF</span>` : ""}
                        </div>
                    </div>
                </div>
                <div class="look-actions">
                    <button class="btn-quick-view" type="button" data-id="${esc(p.id)}">QUICK VIEW</button>
                    <a class="btn-view-arrow" href="${waDirect}" target="_blank" rel="noopener" aria-label="Order on WhatsApp">&#8599;</a>
                </div>
            </div>
        </div>`;
    }).join("") : `<div class="note" style="grid-column: 1 / -1; text-align: center; padding: 48px 20px;">
        <p style="font-size:1.1rem;font-weight:700;margin-bottom:8px">No products found</p>
        <p style="color:var(--muted);margin:0">Add your products in the <a href="Admin.html" style="text-decoration:underline;color:var(--tape);font-weight:700">Admin Dashboard</a> to display them here.</p>
    </div>`;
}

function openProduct(id) {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    const typeSlug = (p.category || "").toLowerCase().replace(/\s+/g, '-');
    const tagClass = p.category === "Summer Wear" ? "frame-tag-summer" : (p.category === "Party Wear" ? "frame-tag-party" : (p.category === "Daily Wear" ? "frame-tag-daily" : "frame-tag-custom"));
    
    const images = Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []);
    const firstImg = images.length > 0 ? images[0] : "";
    const hasHeroImg = Boolean(firstImg);

    const sizes = Array.isArray(p.sizes) ? p.sizes : (typeof p.sizes === "string" ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : []);
    const colors = Array.isArray(p.colors) ? p.colors : (typeof p.colors === "string" ? p.colors.split(",").map(c => c.trim()).filter(Boolean) : []);

    $("#dbody").innerHTML = `
    <div class="dlg-frame-hero type-${typeSlug} ${hasHeroImg ? "has-hero-img" : ""}" id="dlgHero">
        ${hasHeroImg ? `<img src="${esc(firstImg)}" id="dlgHeroImg" alt="${esc(p.name)}" class="dlg-hero-img">` : ""}
        <span class="frame-tag ${tagClass}" style="position:absolute;top:14px;left:14px;z-index:2">${esc(p.category || "Outfit")}</span>
        ${p.guide || p.style ? `<div class="dlg-guide" style="position:absolute;bottom:14px;left:14px;z-index:2">${esc(p.guide || p.style)}</div>` : ""}
        <div class="dlg-pins">
            ${(p.pins || []).map(pin => `<span class="look-pin static" style="top:${pin.top};left:${pin.left}" title="${esc(pin.label)}"></span>`).join("")}
        </div>
    </div>
    ${images.length > 1 ? `
    <div class="dlg-thumbs">
        ${images.map((img, idx) => `
            <button type="button" class="dlg-thumb-btn ${idx === 0 ? "active" : ""}" style="background-image:url('${esc(img)}')" data-img="${esc(img)}" aria-label="Photo ${idx + 1}"></button>
        `).join("")}
    </div>` : ""}
    <div>
        <div class="dlg-badge-type">${esc(p.category || "JDI")} Collection</div>
        <h3 style="margin:2px 0 6px">${esc(p.name)}</h3>
        ${p.style ? `<p class="sub" style="margin:0 0 8px;font-size:0.86rem">${esc(p.style)}</p>` : ""}
        <div class="price" style="font-weight:800;font-size:1.25rem">${priceHTML(p)}</div>
        <div style="color:${p.in_stock ? "var(--ok)" : "var(--no)"};font-weight:600;font-size:0.86rem;margin-top:4px">
            ${p.in_stock ? "● In stock at Devichowk store" : "○ Currently out of stock"}
        </div>
    </div>
    ${sizes.length > 0 ? `
    <div>
        <strong>Select Size</strong>
        <div class="opts" data-g="size">
            ${sizes.map((s, i) => `<button class="chip" aria-pressed="${i === 0}">${esc(s)}</button>`).join("")}
        </div>
    </div>` : ""}
    ${colors.length > 0 ? `
    <div>
        <strong>Select Colour</strong>
        <div class="opts" data-g="color">
            ${colors.map((c, i) => `<button class="chip" aria-pressed="${i === 0}">${esc(c)}</button>`).join("")}
        </div>
    </div>` : ""}
    <a class="btn wa" id="order" target="_blank" rel="noopener" href="#" ${p.in_stock ? "" : 'aria-disabled="true" style="opacity:.5;pointer-events:none"'}>Order on WhatsApp</a>
    <p class="sub" style="margin:0;font-size:0.82rem;text-align:center">Pay and pick up in store · JDI Garments near Devichowk.</p>`;
    
    const pick = g => (document.querySelector(`[data-g="${g}"] [aria-pressed="true"]`) || {}).textContent || "";
    const upd = () => {
        const selSize = pick("size");
        const selColor = pick("color");
        let orderMsg = `Hi ${SHOP.name}, I want to order from the ${p.category || "store"} collection:\n• Item: ${p.name}`;
        if (selSize) orderMsg += `\n• Size: ${selSize}`;
        if (selColor) orderMsg += `\n• Colour: ${selColor}`;
        orderMsg += `\n• Price: ${rupee(p.price)}\nI will pick it up from the store near Devichowk.`;
        $("#order").href = wa(orderMsg);
    };
    
    $("#dbody").onclick = e => {
        const thumb = e.target.closest(".dlg-thumb-btn");
        if (thumb) {
            const heroImg = document.getElementById("dlgHeroImg");
            if (heroImg) heroImg.src = thumb.dataset.img;
            const hero = document.getElementById("dlgHero");
            if (hero && !heroImg) hero.style.backgroundImage = `url('${thumb.dataset.img}')`;
            document.querySelectorAll(".dlg-thumb-btn").forEach(b => b.classList.toggle("active", b === thumb));
            return;
        }
        const b = e.target.closest(".chip"); if (!b) return;
        b.parentElement.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x === b));
        upd();
    };
    upd();
    $("#dlg").showModal();
}

$("#chips").onclick = e => {
    const b = e.target.closest(".chip");
    if (b) {
        cat = b.dataset.c;
        renderChips();
        render();
    }
};

$("#grid").onclick = e => {
    const qv = e.target.closest(".btn-quick-view");
    if (qv) {
        openProduct(qv.dataset.id);
        return;
    }
    const photoFrame = e.target.closest(".look-photo-frame[data-quick-id]");
    if (photoFrame) {
        openProduct(photoFrame.dataset.quickId);
    }
};

/* Search from Navigation Bar */
const searchInput = $("#q");
if (searchInput) {
    searchInput.oninput = e => {
        term = e.target.value.trim().toLowerCase();
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

$("#close").onclick = () => $("#dlg").close();
$("#dlg").addEventListener("click", e => { if (e.target === $("#dlg")) $("#dlg").close(); });

async function loadSupabaseProducts() {
    if (typeof sb === "undefined" || !sb) {
        return;
    }
    try {
        const { data, error } = await sb
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("Supabase products fetch:", error.message);
            return;
        }

        if (data && data.length > 0) {
            products = data;
            renderChips();
            render();
        } else {
            products = [];
            renderChips();
            render();
        }
    } catch (err) {
        console.warn("Supabase fetch exception:", err);
    }
}

renderChips();
render();
loadSupabaseProducts();

// Real-time synchronization when admin adds, updates, or deletes products
try {
    if (typeof sb !== "undefined" && sb) {
        sb.channel("products_realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
                loadSupabaseProducts();
            })
            .subscribe();
    }
} catch (e) {
    // Ignore realtime setup errors if not supported
}

/* Explore / New Arrivals scroll trigger */
const btnNewArrivals = document.getElementById("btnNewArrivals");
if (btnNewArrivals) {
    btnNewArrivals.addEventListener("click", e => {
        const shopSection = document.getElementById("shop");
        if (shopSection) {
            shopSection.scrollIntoView({ behavior: "smooth" });
        }
    });
}

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

    function nextOffer() {
        goTo((current + 1) % items.length, 1);
    }

    function prevOffer() {
        goTo((current - 1 + items.length) % items.length, -1);
    }

    function startTimer() {
        stopTimer();
        timer = setInterval(nextOffer, 3500);
    }

    function stopTimer() {
        if (timer) clearInterval(timer);
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", e => {
            e.stopPropagation();
            nextOffer();
            startTimer();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", e => {
            e.stopPropagation();
            prevOffer();
            startTimer();
        });
    }

    if (slider) {
        slider.addEventListener("click", () => {
            nextOffer();
            startTimer();
        });
    }

    if (banner) {
        banner.addEventListener("mouseenter", stopTimer);
        banner.addEventListener("mouseleave", startTimer);
        banner.addEventListener("touchstart", stopTimer, { passive: true });
        banner.addEventListener("touchend", startTimer, { passive: true });
    }

    startTimer();
})();

/* ===== MOTION BANNER (RANDOM MOTION & ROTATION) ===== */
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

    // Apply smooth randomized motion to active banner image
    function applyRandomMotion(slide) {
        const img = slide.querySelector(".banner-img");
        if (!img) return;

        // Reset any inline CSS keyframe animation so our random transform takes over
        img.style.animation = "none";

        // Random subtle scale between 1.04 and 1.085
        const scale = (1.04 + Math.random() * 0.045).toFixed(3);
        // Random drift X: -2.5% to +2.5%
        const driftX = ((Math.random() - 0.5) * 5).toFixed(2);
        // Random drift Y: -2% to +2%
        const driftY = ((Math.random() - 0.5) * 4).toFixed(2);
        // Random motion speed: 6 to 9 seconds
        const duration = (6 + Math.random() * 3).toFixed(1);

        img.style.transition = `transform ${duration}s cubic-bezier(0.25, 1, 0.5, 1)`;
        // Trigger reflow then apply
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

        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === index);
        });

        currentIndex = index;
        setTimeout(() => {
            isTransitioning = false;
        }, 800);
    }

    function nextBanner() {
        const nextIdx = (currentIndex + 1) % slides.length;
        showSlide(nextIdx);
    }

    function prevBanner() {
        const prevIdx = (currentIndex - 1 + slides.length) % slides.length;
        showSlide(prevIdx);
    }

    function startTimer() {
        stopTimer();
        timer = setInterval(nextBanner, 4800);
    }

    function stopTimer() {
        if (timer) clearInterval(timer);
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            nextBanner();
            startTimer();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            prevBanner();
            startTimer();
        });
    }

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => {
            showSlide(i);
            startTimer();
        });
    });

    // Touch swipe support
    let touchStartX = 0;
    banner.addEventListener("touchstart", e => {
        touchStartX = e.touches[0].clientX;
        stopTimer();
    }, { passive: true });

    banner.addEventListener("touchend", e => {
        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchEndX - touchStartX;
        if (Math.abs(diffX) > 40) {
            if (diffX < 0) nextBanner();
            else prevBanner();
        }
        startTimer();
    }, { passive: true });

    banner.addEventListener("mouseenter", stopTimer);
    banner.addEventListener("mouseleave", startTimer);

    // Subtle parallax motion on mouse movement (desktop)
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

    // Initial random motion on the first banner
    applyRandomMotion(slides[0]);
    startTimer();
})();

/* ===== JDI STORE SHOWCASE & ADMIN PHOTO MANAGEMENT ===== */
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

    // Apply on page load
    const currentPhotos = getSavedPhotos();
    applyPhotos(currentPhotos);

    // Admin Dialog Handling
    const btnOpenAdmin = document.getElementById("btnOpenAdminStore");
    const adminDlg = document.getElementById("adminStoreDlg");
    const btnCloseAdmin = document.getElementById("closeAdminStoreDlg");
    const adminForm = document.getElementById("adminStoreForm");
    const btnReset = document.getElementById("btnResetStoreImgs");

    const inputMain = document.getElementById("inputStoreMainUrl");
    const inputDown1 = document.getElementById("inputStoreDown1Url");
    const inputDown2 = document.getElementById("inputStoreDown2Url");
    const inputDown3 = document.getElementById("inputStoreDown3Url");

    const fileMain = document.getElementById("fileStoreMain");
    const fileDown1 = document.getElementById("fileStoreDown1");
    const fileDown2 = document.getElementById("fileStoreDown2");
    const fileDown3 = document.getElementById("fileStoreDown3");

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

    if (btnOpenAdmin && adminDlg) {
        btnOpenAdmin.addEventListener("click", () => {
            const p = getSavedPhotos();
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

    if (adminForm) {
        adminForm.addEventListener("submit", async e => {
            e.preventDefault();
            const existing = getSavedPhotos();

            // Read file uploads if any, else use URL inputs, else keep existing
            const fileMainData = await readFileInput(fileMain);
            const fileDown1Data = await readFileInput(fileDown1);
            const fileDown2Data = await readFileInput(fileDown2);
            const fileDown3Data = await readFileInput(fileDown3);

            const updated = {
                main: fileMainData || (inputMain.value.trim() || existing.main || DEFAULT_PHOTOS.main),
                down1: fileDown1Data || (inputDown1.value.trim() || existing.down1 || DEFAULT_PHOTOS.down1),
                down2: fileDown2Data || (inputDown2.value.trim() || existing.down2 || DEFAULT_PHOTOS.down2),
                down3: fileDown3Data || (inputDown3.value.trim() || existing.down3 || DEFAULT_PHOTOS.down3)
            };

            try {
                localStorage.setItem("jdi_store_showcase_photos", JSON.stringify(updated));
            } catch (err) {
                console.warn("Storage quota exceeded, changes applied in memory.");
            }

            applyPhotos(updated);
            if (adminDlg) adminDlg.close();
        });
    }

    if (btnReset) {
        btnReset.addEventListener("click", () => {
            localStorage.removeItem("jdi_store_showcase_photos");
            applyPhotos(DEFAULT_PHOTOS);
            if (inputMain) inputMain.value = DEFAULT_PHOTOS.main;
            if (inputDown1) inputDown1.value = DEFAULT_PHOTOS.down1;
            if (inputDown2) inputDown2.value = DEFAULT_PHOTOS.down2;
            if (inputDown3) inputDown3.value = DEFAULT_PHOTOS.down3;
            if (adminDlg) adminDlg.close();
        });
    }
})();