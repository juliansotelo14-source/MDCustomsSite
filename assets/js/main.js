/* =============== NAV + YEAR =============== */
const navToggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");
if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
}
document.getElementById("year").textContent = new Date().getFullYear();

const currency = (n) => "$" + Number(n || 0).toFixed(2);

/* =============== HELPERS =============== */
function priceLabel(m) {
  // Support new pricing schema, but fall back to legacy m.price if present
  if (m?.price) return m.price;
  const p = m?.pricing || {};
  switch (p.unit) {
    case "sqin":
      return `from ${currency(p.rate)} / sq in`;
    case "sqft":
      return `from ${currency(p.rate)} / sq ft`;
    case "per_sheet":
      return `${currency(p.rate)} / sheet${
        p.items_per_sheet ? ` (${p.items_per_sheet} cards)` : ""
      }`;
    case "per_pack":
      return `${currency(p.rate)} / pack${
        p.items_per_pack ? ` (${p.items_per_pack} cards)` : ""
      }`;
    default:
      return "Customize & upload artwork";
  }
}

function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =============== MATERIALS GRID =============== */
async function loadMaterials() {
  const wrap = document.getElementById("materials-grid");
  if (!wrap) return;
  try {
    const res = await fetch("assets/data/materials.json");
    const items = await res.json();
    window.MATERIALS = items;
    wrap.innerHTML = items
      .map(
        (m) => `
      <article class="card" data-material-id="${esc(
        m.id
      )}" data-material-name="${esc(m.name)}">
        <a class="thumb">
          <img class="card-img" src="${esc(m.image)}" alt="${esc(
          m.name
        )} thumbnail" loading="lazy">
        </a>
        <h3>${esc(m.name)}</h3>
        <p class="muted">Customize & upload artwork</p>
        <span class="price-tag">${esc(priceLabel(m))}</span>
      </article>`
      )
      .join("");
  } catch (e) {
    console.error(e);
    wrap.innerHTML = "<p>Could not load materials.</p>";
  }
}
document.addEventListener("DOMContentLoaded", loadMaterials);

/* =============== ARTWORK GRID =============== */
async function loadGallery() {
  const el = document.getElementById("gallery");
  if (!el) return;
  try {
    const res = await fetch("/.netlify/functions/list-artworks");
    const items = await res.json();
    el.innerHTML = items
      .map(
        (i) => `
      <article class="card tile">
        <a class="thumb" href="${esc(
          i.image_url
        )}" target="_blank" rel="noopener">
          <img class="card-img" src="${esc(i.image_url)}" alt="${esc(
          i.title
        )}" loading="lazy"/>
        </a>
        <div>
          <h3>${esc(i.title)}</h3>
          <p class="muted">${esc(i.size || "")} • ${esc(
          (i.materials || []).join(", ")
        )}</p>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${esc(i.price || "")}</strong>
            ${
              i.buy_url
                ? `<a class="btn btn-primary" href="${esc(
                    i.buy_url
                  )}" target="_blank" rel="noopener">Buy</a>`
                : `<a class="btn" href="mailto:Mike.devlieger7@gmail.com?subject=Artwork%20Inquiry:%20${encodeURIComponent(
                    i.title
                  )}">Email to purchase</a>`
            }
          </div>
        </div>
      </article>`
      )
      .join("");
  } catch (e) {
    console.error(e);
    el.innerHTML = "<p>Could not load artwork.</p>";
  }
}
document.addEventListener("DOMContentLoaded", loadGallery);

/* =============== OPEN DRAWER =============== */
document.addEventListener("click", async (e) => {
  const card = e.target.closest(".products .card[data-material-id]");
  if (!card) return;
  if (!window.MATERIALS) {
    const r = await fetch("assets/data/materials.json");
    window.MATERIALS = await r.json();
  }
  openDrawer(
    card.getAttribute("data-material-id"),
    card.getAttribute("data-material-name")
  );
});

/* =============== DRAWER + PRICING + UPLOADS =============== */
function openDrawer(materialId, materialName) {
  const root = document.getElementById("mdc-drawer");
  let backdrop = root.querySelector(".mdc-drawer__backdrop");
  let closeBtn = root.querySelector(".mdc-drawer__close");

  // Rebind backdrop/close every open
  const newBackdrop = backdrop.cloneNode(true);
  backdrop.parentNode.replaceChild(newBackdrop, backdrop);
  backdrop = newBackdrop;
  const newClose = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newClose, closeBtn);
  closeBtn = newClose;

  const title = document.getElementById("mdc-drawer-title");
  const matId = document.getElementById("mdc-material-id");
  const matName = document.getElementById("mdc-material-name");

  const w = document.getElementById("mdc-w");
  const h = document.getElementById("mdc-h");
  const q = document.getElementById("mdc-q");
  const optsWrap = document.getElementById("mdc-opts");

  const areaEl = document.getElementById("mdc-area");
  const priceEl = document.getElementById("mdc-price");
  const eachEl = document.getElementById("mdc-each");

  const filesInput = document.getElementById("mdc-files");
  const drop = document.getElementById("mdc-drop");
  const previews = drop.querySelector(".previews");

  const ship = document.getElementById("mdc-ship");
  const form = document.getElementById("order-form");
  const status = document.getElementById("form-status");

  const mat = (window.MATERIALS || []).find((m) => m.id === materialId) || {};

  title.textContent = `${materialName} — Customize & Upload`;
  matId.value = materialId;
  matName.value = materialName;

  // Default inputs
  if (!w.value) w.value = 24;
  if (!h.value) h.value = 36;
  if (!q.value) q.value = 1;

  /* ------ UI toggles for size + quantity label ------ */
  const showSize = mat?.ui?.showSize !== false; // default true
  const wLabel = w.closest("label");
  const hLabel = h.closest("label");
  if (wLabel) wLabel.style.display = showSize ? "" : "none";
  if (hLabel) hLabel.style.display = showSize ? "" : "none";

  const qtyLabelSpan = q.closest("label")?.querySelector("span");
  if (qtyLabelSpan)
    qtyLabelSpan.textContent = mat?.ui?.quantityLabel || "Quantity";

  /* ------ Options (per sq ft if <2, else per item flat) ------ */
  optsWrap.innerHTML = "<legend>Options</legend>";
  const labelMap = {
    hems: "Hems",
    grommets: "Grommets",
    wind_slits: "Wind slits",
    laminate: "Laminate",
    rounded_corners: "Rounded corners",
    standoffs: "Standoffs",
    h_stakes: "H-stakes",
    spot_gloss: "Spot gloss",
  };
  Object.entries(mat.options || {}).forEach(([key, val]) => {
    const per = val < 2 ? " / sq ft" : " / item";
    const el = document.createElement("label");
    el.innerHTML = `<span>${esc(labelMap[key] || key)} (+${currency(
      val
    )}${per})</span><input type="checkbox" data-opt="${esc(key)}">`;
    optsWrap.appendChild(el);
  });

  /* ------ Pricing ------ */
  function calcPrice(material, widthIn, heightIn, quantity, optionsCost = 0) {
    const unit = material?.pricing?.unit;
    const rate = Number(material?.pricing?.rate || 0);

    const areaSqIn =
      Math.max(0, Number(widthIn) || 0) * Math.max(0, Number(heightIn) || 0);
    const areaSqFt = areaSqIn / 144;

    let base = 0;
    switch (unit) {
      case "sqin":
        base = rate * areaSqIn * quantity;
        break;
      case "sqft":
        base = rate * areaSqFt * quantity;
        break;
      case "per_sheet":
      case "per_pack":
        base = rate * quantity;
        break;
      default:
        base = 0;
    }

    const total = base + optionsCost;
    const each = quantity > 0 ? total / quantity : total;
    return { areaSqIn, areaSqFt, total, each };
  }

  function selectedOptionsCost(widthIn, heightIn, quantity) {
    let cost = 0;
    const areaSqFtPerItem =
      (Math.max(0, Number(widthIn) || 0) * Math.max(0, Number(heightIn) || 0)) /
      144;
    optsWrap
      .querySelectorAll('input[type="checkbox"]:checked')
      .forEach((cb) => {
        const key = cb.dataset.opt;
        const v = Number((mat.options || {})[key] || 0);
        if (v < 2) {
          // per sq ft
          cost += v * areaSqFtPerItem * quantity;
        } else {
          // flat per item
          cost += v * quantity;
        }
      });
    return cost;
  }

  function renderEstimate() {
    const widthIn = Number(w.value || 0);
    const heightIn = Number(h.value || 0);
    const qty = Math.max(1, parseInt(q.value || "1", 10));
    const optCost = selectedOptionsCost(widthIn, heightIn, qty);
    const calc = calcPrice(mat, widthIn, heightIn, qty, optCost);

    // Area line for size products; dash for per-sheet/pack
    areaEl.textContent =
      mat?.ui?.showSize === false
        ? "—"
        : `${calc.areaSqFt.toFixed(2)} sq ft (${calc.areaSqIn.toFixed(
            0
          )} sq in)`;
    eachEl.textContent = currency(calc.each);
    priceEl.textContent = currency(calc.total);
  }

  // Initial render & listeners
  renderEstimate();
  [w, h, q].forEach(
    (inp) => inp && inp.addEventListener("input", renderEstimate)
  );
  optsWrap.addEventListener("change", renderEstimate);

  /* ------ File previews + tracking selectedFiles ------ */
  const dropClone = drop.cloneNode(true);
  drop.parentNode.replaceChild(dropClone, drop);
  const previewsEl = dropClone.querySelector(".previews");

  let selectedFiles = [];

  function handleFiles(files) {
    selectedFiles = Array.from(files || []);
    previewsEl.innerHTML = "";
    selectedFiles.forEach((f) => {
      const p = document.createElement("div");
      p.className = "preview";
      p.textContent = `${f.name} (${Math.round(f.size / 1024)} KB)`;
      previewsEl.appendChild(p);
    });
  }

  dropClone.addEventListener("click", () => filesInput.click());
  dropClone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropClone.classList.add("drag");
  });
  dropClone.addEventListener("dragleave", () =>
    dropClone.classList.remove("drag")
  );
  dropClone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropClone.classList.remove("drag");
    if (e.dataTransfer?.files) {
      filesInput.files = e.dataTransfer.files;
      handleFiles(e.dataTransfer.files);
    }
  });
  filesInput.addEventListener("change", () => {
    if (filesInput.files) handleFiles(filesInput.files);
  });

  /* ------ Open/close drawer ------ */
  function close() {
    root.classList.remove("open");
  }
  root.classList.add("open");
  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) close();
  };
  backdrop.addEventListener("click", onBackdrop);
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    close();
  });
  const onEsc = (e) => {
    if (e.key === "Escape") {
      close();
      window.removeEventListener("keydown", onEsc);
    }
  };
  window.addEventListener("keydown", onEsc);

  /* ------ Submit → upload files → Stripe checkout ------ */
  form.onsubmit = async (e) => {
    e.preventDefault();

    // 1) Upload files to Supabase via Netlify function
    const attachmentUrls = [];
    if (selectedFiles.length) {
      status.textContent = "Uploading files…";
      for (const file of selectedFiles) {
        try {
          const metaRes = await fetch("/.netlify/functions/create-upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type || "application/octet-stream",
            }),
          });
          if (!metaRes.ok) throw new Error("Could not get upload URL");
          const meta = await metaRes.json(); // { uploadUrl, publicUrl, contentType }

          const putRes = await fetch(meta.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": meta.contentType },
            body: file,
          });
          if (!putRes.ok) throw new Error("Upload failed");

          attachmentUrls.push(meta.publicUrl);
        } catch (err) {
          console.error("Upload error:", err);
          status.textContent =
            "Upload failed for one or more files. Please try again.";
          return;
        }
      }
    }

    // 2) Start checkout
    status.textContent = "Starting checkout…";

    const options = Array.from(
      optsWrap.querySelectorAll('input[type="checkbox"]:checked')
    ).map((cb) => cb.dataset.opt);

    const payload = {
      materialId: matId.value,
      materialName: matName.value,
      widthIn: parseFloat(w.value),
      heightIn: parseFloat(h.value),
      quantity: parseInt(q.value, 10),
      options,
      customer: {
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
      },
      shipTo: ship.value,
      notes: form.details.value,
      attachments: attachmentUrls, // now real URLs in Supabase
    };

    try {
      const res = await fetch("/.netlify/functions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Checkout creation failed");
      const { url } = await res.json();
      window.location = url;
    } catch (err) {
      console.error(err);
      status.textContent = "Could not start checkout. Please try again.";
    }
  };
}

/* Prevent Enter from accidentally submitting while editing numbers/checkboxes */
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Enter" &&
    e.target &&
    (e.target.matches("input[type=number]") ||
      e.target.matches("input[type=checkbox]"))
  ) {
    e.preventDefault();
  }
});
