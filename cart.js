/* ===== JDI GARMENTS – SHARED CART & CHECKOUT CONTROLLER ===== */
(function () {
    const CART_KEY = "jdi_cart";
    const SHOP_PHONE = "91XXXXXXXXXX"; // Fallback shop WhatsApp

    function getShopWhatsApp() {
        if (typeof SHOP !== "undefined" && SHOP.whatsapp) {
            const clean = String(SHOP.whatsapp).replace(/\D/g, "");
            return clean.length >= 10 ? clean : SHOP_PHONE;
        }
        return SHOP_PHONE;
    }

    function getCart() {
        try {
            const raw = localStorage.getItem(CART_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCart(cart) {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            updateBadges();
            renderDrawer();
        } catch (e) {
            console.error("Cart save error:", e);
        }
    }

    function addToCart(item) {
        if (!item || !item.id) return false;
        const cart = getCart();

        // Check if exact same product + size + color already exists in cart
        const existingIndex = cart.findIndex(
            x => String(x.id) === String(item.id) &&
                 String(x.size || "") === String(item.size || "") &&
                 String(x.color || "") === String(item.color || "")
        );

        if (existingIndex >= 0) {
            cart[existingIndex].qty = (cart[existingIndex].qty || 1) + (item.qty || 1);
        } else {
            cart.push({
                id: item.id,
                name: item.name || "Outfit",
                category: item.category || "Apparel",
                price: Number(item.price) || 0,
                image: item.image || "",
                size: item.size || "",
                color: item.color || "",
                qty: Math.max(1, Number(item.qty) || 1)
            });
        }

        saveCart(cart);
        openCart();
        return true;
    }

    function updateQty(index, delta) {
        const cart = getCart();
        if (!cart[index]) return;
        cart[index].qty = (cart[index].qty || 1) + delta;
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        }
        saveCart(cart);
    }

    function removeItem(index) {
        const cart = getCart();
        if (!cart[index]) return;
        cart.splice(index, 1);
        saveCart(cart);
    }

    function clearCart() {
        saveCart([]);
    }

    function updateBadges() {
        const cart = getCart();
        const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
        document.querySelectorAll(".cart-badge, #cartCount").forEach(el => {
            el.textContent = totalItems;
            el.style.display = totalItems > 0 ? "flex" : "none";
        });
    }

    function formatRupee(n) {
        return "₹" + Number(n || 0).toLocaleString("en-IN");
    }

    function ensureDrawerDOM() {
        if (document.getElementById("cartDrawer")) return;

        const drawerHTML = `
        <div id="cartBackdrop" class="cart-backdrop" aria-hidden="true"></div>
        <aside id="cartDrawer" class="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping Cart">
            <div class="cart-drawer-header">
                <div class="cart-drawer-title-row">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                    <h3>Shopping Bag</h3>
                    <span class="cart-count-pill" id="drawerCartCount">0</span>
                </div>
                <button type="button" class="cart-close-btn" id="closeCartBtn" aria-label="Close cart">&times;</button>
            </div>
            <div class="cart-drawer-body" id="cartDrawerItems">
                <!-- Items populated via JS -->
            </div>
            <div class="cart-drawer-footer" id="cartDrawerFooter">
                <!-- Subtotal and checkout populated via JS -->
            </div>
        </aside>`;

        document.body.insertAdjacentHTML("beforeend", drawerHTML);

        // Bind backdrop & close click
        document.getElementById("closeCartBtn")?.addEventListener("click", closeCart);
        document.getElementById("cartBackdrop")?.addEventListener("click", closeCart);
    }

    function renderDrawer() {
        ensureDrawerDOM();
        const cart = getCart();
        const itemsContainer = document.getElementById("cartDrawerItems");
        const footerContainer = document.getElementById("cartDrawerFooter");
        const countPill = document.getElementById("drawerCartCount");

        if (countPill) {
            const count = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
            countPill.textContent = `${count} item${count === 1 ? "" : "s"}`;
        }

        if (!itemsContainer || !footerContainer) return;

        if (cart.length === 0) {
            itemsContainer.innerHTML = `
                <div class="cart-empty-state">
                    <div class="cart-empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <path d="M16 10a4 4 0 0 1-8 0"/>
                        </svg>
                    </div>
                    <h4>Your Bag is Empty</h4>
                    <p>Discover our weekly fresh drops and select your signature fits.</p>
                    <a href="index.html#shop" class="btn btn-shop-now" onclick="window.JDI_CART.closeCart()">Explore Outfits</a>
                </div>
            `;
            footerContainer.innerHTML = "";
            footerContainer.style.display = "none";
            return;
        }

        footerContainer.style.display = "block";

        let subtotal = 0;
        itemsContainer.innerHTML = cart.map((item, idx) => {
            const itemTotal = item.price * (item.qty || 1);
            subtotal += itemTotal;
            return `
            <div class="cart-item" data-index="${idx}">
                <div class="cart-item-img-wrap">
                    ${item.image
                        ? `<img src="${item.image}" alt="${item.name}" class="cart-item-img">`
                        : `<div class="cart-item-img-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></div>`
                    }
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-top">
                        <h4 class="cart-item-title">${item.name}</h4>
                        <button type="button" class="cart-item-remove" data-remove="${idx}" title="Remove item" aria-label="Remove item">&times;</button>
                    </div>
                    <div class="cart-item-meta">
                        ${item.size ? `<span class="cart-meta-tag">Size: <strong>${item.size}</strong></span>` : ""}
                        ${item.color ? `<span class="cart-meta-tag">Colour: <strong>${item.color}</strong></span>` : ""}
                    </div>
                    <div class="cart-item-bottom">
                        <div class="cart-qty-ctrl">
                            <button type="button" class="btn-qty" data-qty-change="-1" data-idx="${idx}" aria-label="Decrease quantity">−</button>
                            <span class="qty-num">${item.qty || 1}</span>
                            <button type="button" class="btn-qty" data-qty-change="1" data-idx="${idx}" aria-label="Increase quantity">+</button>
                        </div>
                        <span class="cart-item-price">${formatRupee(itemTotal)}</span>
                    </div>
                </div>
            </div>`;
        }).join("");

        footerContainer.innerHTML = `
            <div class="cart-summary-box">
                <div class="cart-summary-row">
                    <span>Subtotal</span>
                    <strong class="cart-subtotal-val">${formatRupee(subtotal)}</strong>
                </div>
                <div class="cart-summary-row in-store-row">
                    <span>In-Store Pickup</span>
                    <span class="free-tag">FREE</span>
                </div>
                <p class="cart-pickup-note">Collect in person near Devichowk showroom · Pay via Cash/UPI on pickup</p>
            </div>
            <button type="button" class="btn btn-cart-whatsapp" id="cartCheckoutBtn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.586 1.777.818 2.8.818 3.181 0 5.768-2.587 5.768-5.768.001-3.18-2.585-5.767-5.772-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.077-1.782-.397-1.341-.555-2.203-1.89-2.27-1.979-.066-.09-1.042-1.388-1.042-2.646 0-1.258.657-1.879.89-2.135.232-.256.507-.32.677-.32.17 0 .341.002.489.01.157.009.367-.06.574.437.213.513.725 1.77.788 1.9.064.13.106.282.019.453-.086.171-.13.277-.256.425-.128.149-.268.332-.383.447-.128.128-.261.267-.112.523.149.256.662 1.092 1.42 1.767.977.871 1.799 1.141 2.055 1.27.256.128.405.107.554-.064.15-.171.64-.746.811-1.002.17-.256.341-.213.575-.128.234.085 1.488.702 1.744.83.256.128.426.192.489.298.064.107.064.618-.08 1.023z"/>
                </svg>
                <span>Checkout on WhatsApp · ${formatRupee(subtotal)}</span>
            </button>
            <div class="cart-trust-row">
                <span>Direct Showroom Order</span>
                <span>•</span>
                <span>Instant Confirmation</span>
            </div>
        `;

        // Wire events in drawer
        itemsContainer.onclick = e => {
            const removeBtn = e.target.closest("[data-remove]");
            if (removeBtn) {
                const idx = parseInt(removeBtn.dataset.remove, 10);
                removeItem(idx);
                return;
            }

            const qtyBtn = e.target.closest("[data-qty-change]");
            if (qtyBtn) {
                const idx = parseInt(qtyBtn.dataset.idx, 10);
                const delta = parseInt(qtyBtn.dataset.qtyChange, 10);
                updateQty(idx, delta);
            }
        };

        const checkoutBtn = document.getElementById("cartCheckoutBtn");
        if (checkoutBtn) {
            checkoutBtn.onclick = () => checkoutOnWhatsApp(cart, subtotal);
        }
    }

    function checkoutOnWhatsApp(cart, subtotal) {
        if (!cart || cart.length === 0) return;
        const targetNumber = getShopWhatsApp();

        let msg = `Hi JDI Garments, I would like to place an order from your online catalog:\n\n`;
        cart.forEach((item, i) => {
            const details = [];
            if (item.size) details.push(`Size: ${item.size}`);
            if (item.color) details.push(`Colour: ${item.color}`);
            details.push(`Qty: ${item.qty || 1}`);

            msg += `${i + 1}. *${item.name}* (${details.join(", ")}) — ${formatRupee(item.price * (item.qty || 1))}\n`;
        });

        msg += `\n*Total Amount:* ${formatRupee(subtotal)}\n`;
        msg += `*Fulfillment:* In-Store Pickup near Devichowk showroom.\n`;
        msg += `Please confirm availability so I can collect!`;

        const waUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
    }

    function openCart() {
        ensureDrawerDOM();
        renderDrawer();
        const drawer = document.getElementById("cartDrawer");
        const backdrop = document.getElementById("cartBackdrop");
        if (drawer && backdrop) {
            drawer.classList.add("open");
            backdrop.classList.add("open");
            document.body.style.overflow = "hidden";
        }
    }

    function closeCart() {
        const drawer = document.getElementById("cartDrawer");
        const backdrop = document.getElementById("cartBackdrop");
        if (drawer && backdrop) {
            drawer.classList.remove("open");
            backdrop.classList.remove("open");
            document.body.style.overflow = "";
        }
    }

    // Auto-bind open buttons
    document.addEventListener("click", e => {
        const btn = e.target.closest(".header-cart-btn, #openCartBtn, [data-open-cart]");
        if (btn) {
            e.preventDefault();
            openCart();
        }
    });

    // Escape key closes drawer
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeCart();
    });

    // Initial DOM ready setup
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            updateBadges();
            ensureDrawerDOM();
        });
    } else {
        updateBadges();
        ensureDrawerDOM();
    }

    window.JDI_CART = {
        getCart,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
        openCart,
        closeCart,
        updateBadges
    };
})();

