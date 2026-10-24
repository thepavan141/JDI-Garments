const $ = s => document.querySelector(s);
const rupee = n => "₹" + Number(n).toLocaleString("en-IN");
const BUCKET = "product-images";
let items = [], editing = null, keepImages = [];

function show(loggedIn) {
    $("#login").hidden = loggedIn;
    $("#app").hidden = !loggedIn;
    $("#logout").hidden = !loggedIn;
    if (loggedIn) loadList();
}
function msg(text, isErr) { const m = $("#msg"); m.textContent = text; m.className = "msg" + (isErr ? " err" : ""); }
const csv = v => v.split(",").map(x => x.trim()).filter(Boolean);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pathFromUrl = u => decodeURIComponent(u.split("/" + BUCKET + "/")[1] || "");

/* ---------- auth ---------- */
sb.auth.getSession().then(({ data }) => show(!!data.session));
$("#loginForm").onsubmit = async e => {
    e.preventDefault();
    $("#lerr").textContent = "";
    const { error } = await sb.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#pw").value });
    if (error) { $("#lerr").textContent = error.message; return; }
    show(true);
};
$("#logout").onclick = async () => { await sb.auth.signOut(); show(false); };

/* ---------- list ---------- */
async function loadList() {
    const { data, error } = await sb.from("products").select("*").order("created_at", { ascending: false });
    if (error) { $("#list").innerHTML = `<p class="msg err">${esc(error.message)}</p>`; return; }
    items = data;
    $("#count").textContent = `Products (${items.length})`;
    $("#cats").innerHTML = [...new Set(items.map(p => p.category))].map(c => `<option value="${esc(c)}">`).join("");
    $("#list").innerHTML = items.map(p => `
    <div class="item" data-id="${p.id}">
      <div class="t" style="background-image:url('${esc((p.images || [])[0] || "")}')"></div>
      <div class="m"><strong>${esc(p.name)}</strong>
        <span>${rupee(p.price)} · ${esc(p.category)} · ${p.in_stock ? "In stock" : "Sold out"}${p.is_new ? " · New" : ""}</span></div>
      <div class="acts">
        <button class="sm" data-act="edit">Edit</button>
        <button class="sm" data-act="stock">${p.in_stock ? "Mark sold out" : "Mark in stock"}</button>
        <button class="sm" data-act="new">${p.is_new ? "Remove New" : "Mark New"}</button>
        <button class="sm danger" data-act="del">Delete</button>
      </div>
    </div>`).join("") || "<p>No products yet. Add your first one above.</p>";
}
$("#list").onclick = async e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const p = items.find(x => x.id === b.closest(".item").dataset.id); if (!p) return;
    const act = b.dataset.act;
    if (act === "edit") return startEdit(p);
    if (act === "stock") await sb.from("products").update({ in_stock: !p.in_stock }).eq("id", p.id);
    if (act === "new") await sb.from("products").update({ is_new: !p.is_new }).eq("id", p.id);
    if (act === "del") {
        if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
        const { error } = await sb.from("products").delete().eq("id", p.id);
        if (error) { alert(error.message); return; }
        const paths = (p.images || []).map(pathFromUrl).filter(Boolean);
        if (paths.length) await sb.storage.from(BUCKET).remove(paths);
    }
    loadList();
};

/* ---------- form ---------- */
function drawThumbs() {
    $("#thumbs").innerHTML = keepImages.map((u, i) =>
        `<button type="button" data-i="${i}" title="Remove photo" style="background-image:url('${esc(u)}')"></button>`).join("");
}
$("#thumbs").onclick = e => { const b = e.target.closest("button"); if (b) { keepImages.splice(+b.dataset.i, 1); drawThumbs(); } };
function resetForm() {
    editing = null; keepImages = [];
    $("#pform").reset(); $("#instock").checked = true; drawThumbs();
    $("#ftitle").textContent = "Add product"; $("#cancel").hidden = true;
}
function startEdit(p) {
    editing = p.id; keepImages = [...(p.images || [])];
    $("#name").value = p.name; $("#category").value = p.category;
    $("#price").value = p.price; $("#oprice").value = p.original_price ?? "";
    $("#sizes").value = (p.sizes || []).join(", "); $("#colors").value = (p.colors || []).join(", ");
    $("#instock").checked = p.in_stock; $("#isnew").checked = p.is_new;
    $("#ftitle").textContent = "Edit product"; $("#cancel").hidden = false;
    drawThumbs(); msg(""); window.scrollTo({ top: 0, behavior: "smooth" });
}
$("#cancel").onclick = () => { resetForm(); msg(""); };

$("#pform").onsubmit = async e => {
    e.preventDefault();
    const price = parseInt($("#price").value, 10);
    const oprice = $("#oprice").value ? parseInt($("#oprice").value, 10) : null;
    if (oprice !== null && oprice <= price) return msg("Original price must be higher than the selling price (or leave it empty).", true);
    $("#save").disabled = true; msg("Saving…");
    try {
        const urls = [];
        for (const f of $("#files").files) {
            const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
            const path = `${crypto.randomUUID()}.${ext}`;
            const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type });
            if (error) throw error;
            urls.push(sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
        }
        const row = {
            name: $("#name").value.trim(), category: $("#category").value.trim(),
            price, original_price: oprice,
            sizes: csv($("#sizes").value), colors: csv($("#colors").value),
            images: [...keepImages, ...urls],
            in_stock: $("#instock").checked, is_new: $("#isnew").checked
        };
        const { error } = editing
            ? await sb.from("products").update(row).eq("id", editing)
            : await sb.from("products").insert(row);
        if (error) throw error;
        resetForm(); msg("Saved ✓"); loadList();
    } catch (err) {
        msg(err.message || "Something went wrong", true);
    }
    $("#save").disabled = false;
};