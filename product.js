/* ===== JDI GARMENTS – PREMIUM PRODUCT DETAILS CONTROLLER ===== */
(function () {
    const SHOP = {
        name: "JDI Garments",
        whatsapp: "91XXXXXXXXXX"
    };

    function getShopWhatsApp() {
        if (typeof window.SHOP !== "undefined" && window.SHOP.whatsapp) {
            const clean = String(window.SHOP.whatsapp).replace(/\D/g, "");
            return clean.length >= 10 ? clean : SHOP.whatsapp;
        }
        return SHOP.whatsapp;
    }

    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    const rupee = n => "₹" + Number(n || 0).toLocaleString("en-IN");
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

    // Color name to CSS Hex color mapping
    const COLOR_HEX_MAP = {
        lavender: "#967bb6",
        "slate blue": "#5b6d88",
        slate: "#64748b",
        black: "#18181b",
        white: "#ffffff",
        navy: "#1e3a8a",
        "dark navy": "#101c35",
        blue: "#2563eb",
        "sky blue": "#38bdf8",
        cyan: "#06b6d4",
        olive: "#556b2f",
        green: "#16a34a",
        mint: "#6ee7b7",
        red: "#dc2626",
        maroon: "#800020",
        wine: "#722f37",
        pink: "#ec4899",
        rose: "#f43f5e",
        yellow: "#eab308",
        mustard: "#d97706",
        beige: "#f5f5dc",
        cream: "#fffdd0",
        brown: "#78350f",
        grey: "#6b7280",
        gray: "#6b7280",
        charcoal: "#374151",
        orange: "#ea580c",
        peach: "#ffdab9",
        purple: "#9333ea"
    };

    function getColorHex(name) {
        if (!name) return "#64748b";
        const clean = name.toLowerCase().trim();
        return COLOR_HEX_MAP[clean] || (clean.startsWith("#") ? clean : "#475569");
    }

    let currentProduct = null;
    let selectedSize = "";
    let selectedColor = "";
    let selectedQty = 1;
    let currentImageIndex = 0;
    let productImages = [];

    async function fetchProduct(id) {
        // First try Supabase if available
        if (typeof sb !== "undefined" && sb) {
            try {
                const { data, error } = await sb
                    .from("products")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (data && !error) return data;
            } catch (err) {
                console.warn("Direct product fetch failed, attempting list lookup:", err);
            }

            try {
                const { data } = await sb.from("products").select("*");
                if (data && data.length > 0) {
                    const found = data.find(p => String(p.id) === String(id));
                    if (found) return found;
                    // Fallback to first product if specific ID not found
                    return data[0];
                }
            } catch (err) {
                console.warn("Supabase all products fetch error:", err);
            }
        }

        // Return a high quality demo fallback matching reference if offline
        return {
            id: id || "demo-lavender",
            name: "Lavender Shirt",
            category: "Shirts",
            price: 900,
            original_price: 1200,
            sizes: ["S", "M", "L", "XL"],
            colors: ["Lavender", "Slate Blue", "Black"],
            images: [
                "photo.jpg"
            ],
            in_stock: true,
            is_new: true,
            description: "Carefully tailored with breathable woven combed cotton for all-day comfort, rich color depth, and effortless elegance."
        };
    }

    function renderProduct(p) {
        currentProduct = p;
        const loadingEl = $("#pdpLoading");
        const errorEl = $("#pdpError");
        const wrapEl = $("#pdpProductWrap");

        if (loadingEl) loadingEl.style.display = "none";
        if (errorEl) errorEl.hidden = true;
        if (wrapEl) wrapEl.hidden = false;

        document.title = `${p.name} – JDI Garments Devichowk`;

        // Breadcrumb
        const displayCat = p.category ? (p.category.charAt(0).toUpperCase() + p.category.slice(1)) : "Apparel";
        const bcCategory = $("#bcCategory");
        const bcTitle = $("#bcTitle");
        if (bcCategory) bcCategory.textContent = displayCat;
        if (bcTitle) bcTitle.textContent = p.name;

        // Category Tag
        const catPill = $("#pdpCategoryPill");
        if (catPill) {
            catPill.textContent = `${displayCat.toUpperCase()} COLLECTION`;
        }

        // Title
        const titleEl = $("#pdpTitle");
        if (titleEl) titleEl.textContent = p.name;

        // Stock status
        const stockBadge = $("#pdpStockBadge");
        const stockText = $("#pdpStockText");
        const inStock = p.in_stock !== false;
        if (stockBadge) {
            stockBadge.className = `pdp-stock-status ${inStock ? "in-stock" : "out-of-stock"}`;
        }
        if (stockText) {
            stockText.textContent = inStock ? "In stock" : "Currently out of stock";
        }

        // Prices & Discount calculation
        const currentPriceEl = $("#pdpCurrentPrice");
        const wasPriceEl = $("#pdpWasPrice");
        const discountTag = $("#pdpDiscountTag");
        const mainDiscountBadge = $("#pdpDiscountBadge");

        if (currentPriceEl) currentPriceEl.textContent = rupee(p.price);

        const hasDiscount = p.original_price && Number(p.original_price) > Number(p.price);
        if (hasDiscount) {
            const pct = Math.round((1 - p.price / p.original_price) * 100);
            if (wasPriceEl) {
                wasPriceEl.textContent = rupee(p.original_price);
                wasPriceEl.style.display = "inline";
            }
            if (discountTag) {
                discountTag.textContent = `${pct}% OFF`;
                discountTag.hidden = false;
            }
            if (mainDiscountBadge) {
                mainDiscountBadge.textContent = `${pct}% OFF`;
                mainDiscountBadge.hidden = false;
            }
        } else {
            if (wasPriceEl) wasPriceEl.style.display = "none";
            if (discountTag) discountTag.hidden = true;
            if (mainDiscountBadge) mainDiscountBadge.hidden = true;
        }

        // Images & Gallery
        productImages = toArray(p.images);
        if (productImages.length === 0) {
            productImages = ["photo.jpg"];
        }
        currentImageIndex = 0;
        updateMainImage(productImages[0]);
        renderThumbnails(productImages);

        // Sizes
        const rawSizes = toArray(p.sizes);
        const sizes = rawSizes.length > 0 ? rawSizes : ["S", "M", "L", "XL"];
        selectedSize = sizes[0] || "M";
        renderSizeChips(sizes);

        // Colours
        const rawColors = toArray(p.colors);
        const colors = rawColors.length > 0 ? rawColors : ["Lavender", "Slate Blue", "Black"];
        selectedColor = colors[0] || "Lavender";
        renderColourSwatches(colors);

        // Quantity
        selectedQty = 1;
        updateQtyDisplay();

        // Wishlist status
        updateWishlistButtonState(p.id);

        // Buy button state
        const buyBtn = $("#btnBuyNow");
        const cartBtn = $("#btnAddToCart");
        if (!inStock) {
            if (buyBtn) {
                buyBtn.disabled = true;
                buyBtn.style.opacity = "0.5";
                buyBtn.style.cursor = "not-allowed";
            }
            if (cartBtn) {
                cartBtn.disabled = true;
                cartBtn.style.opacity = "0.5";
                cartBtn.style.cursor = "not-allowed";
            }
        }
    }

    function updateMainImage(url) {
        const mainImg = $("#pdpMainImg");
        const lightboxImg = $("#lightboxImg");
        if (mainImg) {
            mainImg.style.opacity = "0.4";
            mainImg.src = url;
            mainImg.onload = () => { mainImg.style.opacity = "1"; };
        }
        if (lightboxImg) lightboxImg.src = url;
    }

    function renderThumbnails(images) {
        const container = $("#pdpThumbsContainer");
        const track = $("#pdpThumbsTrack");
        const nextBtn = $("#pdpThumbsNext");
        if (!track || !container) return;

        if (images.length <= 1) {
            container.style.display = "none";
            return;
        }

        container.style.display = "flex";
        if (nextBtn) {
            nextBtn.style.display = images.length > 4 ? "flex" : "none";
        }

        track.innerHTML = images.map((img, idx) => `
            <button type="button" class="pdp-thumb ${idx === 0 ? "active" : ""}" data-index="${idx}" aria-label="Photo ${idx + 1}">
                <img src="${img}" alt="Thumbnail ${idx + 1}">
            </button>
        `).join("");

        track.onclick = e => {
            const thumb = e.target.closest(".pdp-thumb");
            if (thumb) {
                const idx = parseInt(thumb.dataset.index, 10);
                if (!isNaN(idx) && images[idx]) {
                    currentImageIndex = idx;
                    updateMainImage(images[idx]);
                    $$(".pdp-thumb").forEach(t => t.classList.toggle("active", t === thumb));
                }
            }
        };

        if (nextBtn) {
            nextBtn.onclick = () => {
                track.scrollBy({ left: 160, behavior: "smooth" });
            };
        }
    }

    function renderSizeChips(sizes) {
        const container = $("#pdpSizeChips");
        if (!container) return;

        container.innerHTML = sizes.map((s, idx) => `
            <button type="button" class="pdp-size-chip ${idx === 0 ? "selected" : ""}" data-size="${s}" aria-label="Size ${s}">
                ${s}
            </button>
        `).join("");

        container.onclick = e => {
            const chip = e.target.closest(".pdp-size-chip");
            if (chip) {
                selectedSize = chip.dataset.size;
                $$(".pdp-size-chip").forEach(c => c.classList.toggle("selected", c === chip));
            }
        };
    }

    function renderColourSwatches(colors) {
        const container = $("#pdpColourSwatches");
        const labelEl = $("#pdpSelectedColourLabel");
        if (!container) return;

        if (labelEl) labelEl.textContent = selectedColor;

        container.innerHTML = colors.map((c, idx) => {
            const hex = getColorHex(c);
            const isWhite = c.toLowerCase().trim() === "white";
            return `
            <button type="button" class="pdp-colour-swatch ${idx === 0 ? "selected" : ""}"
                    data-color="${c}"
                    style="background-color: ${hex}; ${isWhite ? "border: 1.5px solid #d1d5db;" : ""}"
                    title="${c}"
                    aria-label="Colour ${c}">
            </button>`;
        }).join("");

        container.onclick = e => {
            const swatch = e.target.closest(".pdp-colour-swatch");
            if (swatch) {
                selectedColor = swatch.dataset.color;
                if (labelEl) labelEl.textContent = selectedColor;
                $$(".pdp-colour-swatch").forEach(s => s.classList.toggle("selected", s === swatch));
            }
        };
    }

    function updateQtyDisplay() {
        const disp = $("#qtyDisplay");
        if (disp) disp.textContent = selectedQty;
    }

    // Stepper buttons
    const qtyMinus = $("#qtyMinus");
    const qtyPlus = $("#qtyPlus");
    if (qtyMinus) {
        qtyMinus.onclick = () => {
            if (selectedQty > 1) {
                selectedQty--;
                updateQtyDisplay();
            }
        };
    }
    if (qtyPlus) {
        qtyPlus.onclick = () => {
            if (selectedQty < 10) {
                selectedQty++;
                updateQtyDisplay();
            }
        };
    }

    // Wishlist Logic
    const WISHLIST_KEY = "jdi_wishlist";
    function getWishlist() {
        try {
            return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
        } catch (e) { return []; }
    }
    function updateWishlistButtonState(id) {
        const btn = $("#pdpWishlistBtn");
        if (!btn) return;
        const list = getWishlist();
        const isFav = list.includes(String(id));
        btn.classList.toggle("active", isFav);
    }
    function toggleWishlist(id) {
        let list = getWishlist();
        const strId = String(id);
        if (list.includes(strId)) {
            list = list.filter(x => x !== strId);
        } else {
            list.push(strId);
        }
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
        updateWishlistButtonState(id);
    }

    const wishlistBtn = $("#pdpWishlistBtn");
    if (wishlistBtn) {
        wishlistBtn.onclick = () => {
            if (currentProduct) toggleWishlist(currentProduct.id);
        };
    }

    // Fullscreen Zoom Lightbox
    const zoomBtn = $("#pdpZoomBtn");
    const zoomModal = $("#zoomModal");
    const closeZoomBtn = $("#closeZoomBtn");
    const mainHolder = $("#mainImageHolder");

    function openZoom() {
        if (zoomModal) {
            zoomModal.showModal();
            document.body.style.overflow = "hidden";
        }
    }
    function closeZoom() {
        if (zoomModal) {
            zoomModal.close();
            document.body.style.overflow = "";
        }
    }

    if (zoomBtn) zoomBtn.onclick = openZoom;
    if (mainHolder) mainHolder.onclick = openZoom;
    if (closeZoomBtn) closeZoomBtn.onclick = closeZoom;
    if (zoomModal) {
        zoomModal.onclick = e => { if (e.target === zoomModal) closeZoom(); };
    }

    // Size Guide Modal
    const sizeGuideBtn = $("#btnOpenSizeGuide");
    const sizeGuideModal = $("#sizeGuideModal");
    const closeSizeGuideBtn = $("#closeSizeGuideBtn");

    function openSizeGuide() {
        if (sizeGuideModal) {
            sizeGuideModal.showModal();
            document.body.style.overflow = "hidden";
        }
    }
    function closeSizeGuide() {
        if (sizeGuideModal) {
            sizeGuideModal.close();
            document.body.style.overflow = "";
        }
    }

    if (sizeGuideBtn) sizeGuideBtn.onclick = openSizeGuide;
    if (closeSizeGuideBtn) closeSizeGuideBtn.onclick = closeSizeGuide;
    if (sizeGuideModal) {
        sizeGuideModal.onclick = e => { if (e.target === sizeGuideModal) closeSizeGuide(); };
    }

    function showAlert(msg) {
        const alertEl = $("#pdpAlertMsg");
        if (!alertEl) return;
        alertEl.textContent = msg;
        alertEl.hidden = false;
        setTimeout(() => { alertEl.hidden = true; }, 3500);
    }

    // Add to Cart
    const addToCartBtn = $("#btnAddToCart");
    if (addToCartBtn) {
        addToCartBtn.onclick = () => {
            if (!currentProduct) return;
            if (currentProduct.in_stock === false) {
                showAlert("This item is currently out of stock.");
                return;
            }

            const item = {
                id: currentProduct.id,
                name: currentProduct.name,
                category: currentProduct.category,
                price: currentProduct.price,
                image: productImages[0] || "",
                size: selectedSize,
                color: selectedColor,
                qty: selectedQty
            };

            if (window.JDI_CART && window.JDI_CART.addToCart) {
                window.JDI_CART.addToCart(item);
            }
        };
    }

    // Buy Now / Order on WhatsApp
    const buyNowBtn = $("#btnBuyNow");
    if (buyNowBtn) {
        buyNowBtn.onclick = () => {
            if (!currentProduct) return;
            if (currentProduct.in_stock === false) {
                showAlert("This item is currently out of stock.");
                return;
            }

            const targetNumber = getShopWhatsApp();
            const totalPrice = currentProduct.price * selectedQty;
            const catName = currentProduct.category ? (currentProduct.category.charAt(0).toUpperCase() + currentProduct.category.slice(1)) : "Collection";

            const msg = `Hi ${SHOP.name}, I would like to buy:
*Product:* ${currentProduct.name} (${catName})
*Size:* ${selectedSize}
*Colour:* ${selectedColor}
*Quantity:* ${selectedQty}
*Total Price:* ${rupee(totalPrice)}
*Fulfillment:* In-Store Pickup near Devichowk showroom.
Please confirm availability!`;

            const waUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, "_blank", "noopener,noreferrer");
        };
    }

    // Parse URL param and initialize
    async function init() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");

        try {
            const product = await fetchProduct(id);
            if (product) {
                renderProduct(product);
            } else {
                const loadingEl = $("#pdpLoading");
                const errorEl = $("#pdpError");
                if (loadingEl) loadingEl.style.display = "none";
                if (errorEl) errorEl.hidden = false;
            }
        } catch (e) {
            console.error("Product load error:", e);
            const loadingEl = $("#pdpLoading");
            const errorEl = $("#pdpError");
            if (loadingEl) loadingEl.style.display = "none";
            if (errorEl) errorEl.hidden = false;
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

