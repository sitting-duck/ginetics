const CONTACT_EMAIL = "gineticjuices@gmail.com";

const nav = document.querySelector(".site-nav");
const toggle = document.querySelector(".nav-toggle");

function setMenu(open) {
  if (!nav || !toggle) return;
  nav.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

if (toggle) {
  toggle.addEventListener("click", () => {
    setMenu(!nav.classList.contains("is-open"));
  });
}

if (nav) {
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

function fillQtySelects() {
  document.querySelectorAll("select.qty-select").forEach((select) => {
    if (select.dataset.filled === "true") return;
    const max = Number(select.dataset.max || 24);
    for (let n = 1; n <= max; n += 1) {
      const option = document.createElement("option");
      option.value = String(n);
      option.textContent = String(n);
      select.append(option);
    }
    select.dataset.filled = "true";
  });
}

function syncPackagingQty(form) {
  form.querySelectorAll('input[name="packaging"][data-qty]').forEach((box) => {
    const select = form.querySelector(`[name="${box.dataset.qty}"]`);
    if (!select) return;
    select.disabled = !box.checked;
    if (!box.checked) select.value = "";
  });
}

function wirePackagingQty(form) {
  if (!form) return;
  fillQtySelects();
  syncPackagingQty(form);
  form.querySelectorAll('input[name="packaging"][data-qty]').forEach((box) => {
    box.addEventListener("change", () => syncPackagingQty(form));
  });
}

function orderFormError(form) {
  const juices = form.querySelectorAll('input[name="juices"]:checked');
  const bottles = form.querySelector('input[name="packaging"][value="8 oz bottles"]');
  const pouches = form.querySelector(
    'input[name="packaging"][value="11 oz reusable pouches"]'
  );
  const bottleQty = form.querySelector('[name="bottleQty"]');
  const pouchQty = form.querySelector('[name="pouchQty"]');

  if (!juices.length) return "Please choose at least one juice.";
  if (!bottles?.checked && !pouches?.checked) {
    return "Please choose bottles, pouches, or both.";
  }
  if (bottles?.checked && !bottleQty?.value) {
    return "Please select how many bottles.";
  }
  if (pouches?.checked && !pouchQty?.value) {
    return "Please select how many pouches.";
  }
  return "";
}

function packagingLines(data) {
  const packs = data.getAll("packaging");
  const lines = [];
  if (packs.includes("8 oz bottles")) {
    lines.push(`8 oz bottles: ${data.get("bottleQty") || "quantity not selected"}`);
  }
  if (packs.includes("11 oz reusable pouches")) {
    lines.push(
      `11 oz reusable pouches: ${data.get("pouchQty") || "quantity not selected"}`
    );
  }
  if (!lines.length) lines.push("Packaging: not specified");
  return lines;
}

function wireMailForm(form, subject, extraLines, extraValidate) {
  if (!form) return;
  const statusEl = form.querySelector(".form-status");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (statusEl) statusEl.hidden = false;

    const extraError = extraValidate ? extraValidate(form) : "";
    if (extraError || !form.reportValidity()) {
      if (statusEl) {
        statusEl.dataset.kind = "error";
        statusEl.textContent = extraError || "Please complete the required fields.";
      }
      return;
    }

    const data = new FormData(form);
    const juices = data.getAll("juices");
    const body = extraLines(data, juices);
    const resolvedSubject =
      typeof subject === "function" ? subject(data, juices) : subject;

    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      resolvedSubject
    )}&body=${encodeURIComponent(body)}`;

    if (statusEl) {
      statusEl.dataset.kind = "ok";
      statusEl.textContent = "Opening your email app…";
    }
    window.location.href = mailto;
  });
}

const visitForm = document.getElementById("visit-form");
wirePackagingQty(visitForm);
wireMailForm(
  visitForm,
  (data) => {
    const city = (data.get("city") || "").trim();
    const zip = (data.get("zip") || "").trim();
    const loc = [city, zip].filter(Boolean).join(", ");
    return loc ? `Juice order — Ginetics — ${loc}` : "Juice order — Ginetics";
  },
  (data, juices) => {
    const city = data.get("city") || "";
    const state = data.get("state") || "";
    const zip = data.get("zip") || "";
    return [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Juices: ${juices.length ? juices.join(", ") : "not specified"}`,
      ...packagingLines(data),
      "",
      "Shipping address:",
      data.get("street") || "",
      `${city}, ${state} ${zip}`.replace(/^,\s*|,\s*$/g, "").trim(),
      "",
      data.get("message") || "",
    ].join("\n");
  },
  orderFormError
);

wireMailForm(
  document.getElementById("inquiry-form"),
  "Inquiry — Ginetics",
  (data) =>
    [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      "",
      data.get("message") || "",
    ].join("\n")
);

wireMailForm(
  document.getElementById("subscribe-mail-form"),
  "Subscribe — Ginetics",
  (data) =>
    [
      "Please add this person to the Ginetics email list.",
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
    ].join("\n")
);

wireMailForm(
  document.getElementById("unsubscribe-mail-form"),
  "Unsubscribe — Ginetics",
  (data) =>
    [
      "Please remove this email from the Ginetics email list.",
      `Email: ${data.get("email")}`,
    ].join("\n")
);

wireMailForm(
  document.getElementById("survey-mail-form"),
  "Survey — Ginetics",
  (data, juices) =>
    [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Rating: ${data.get("rating") || "not specified"} / 5`,
      `Juices tried: ${juices.length ? juices.join(", ") : "not specified"}`,
      "",
      data.get("message") || "",
    ].join("\n")
);

const COOKIE_KEY = "ginetics-cookie-choice";

function cookieChoice() {
  try {
    return localStorage.getItem(COOKIE_KEY) || "";
  } catch {
    return "";
  }
}

function saveCookieChoice(value) {
  try {
    localStorage.setItem(COOKIE_KEY, value);
  } catch {
    /* private browsing can block storage */
  }
}

function showCookieBanner() {
  const banner = document.getElementById("cookie-banner");
  if (!banner) return;
  banner.hidden = false;
  const accept = banner.querySelector("[data-cookie-choice='accepted']");
  if (accept) accept.focus();
}

function hideCookieBanner() {
  const banner = document.getElementById("cookie-banner");
  if (banner) banner.hidden = true;
}

function enhanceFooters() {
  document.querySelectorAll(".footer-inner").forEach((inner) => {
    if (inner.querySelector(".js-cookie-settings")) return;
    const subscribeLocal = document.getElementById("subscribe-form");
    const surveyLocal = document.getElementById("survey-form");
    const subHref = subscribeLocal ? "#subscribe-form" : "order.html#subscribe-form";
    const surveyHref = surveyLocal ? "#survey-form" : "order.html#survey-form";
    const p = document.createElement("p");
    p.innerHTML = `<a href="${subHref}">Subscribe</a> · <a href="${surveyHref}">Survey &amp; review</a> · <button type="button" class="footer-text-btn js-cookie-settings">Cookie settings</button>`;
    const copyright = [...inner.querySelectorAll("p")].find((el) =>
      el.textContent.includes("©")
    );
    inner.insertBefore(p, copyright || null);
  });
}

function wireCookieBanner() {
  if (document.getElementById("cookie-banner")) return;

  const banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.id = "cookie-banner";
  banner.hidden = true;
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-modal", "false");
  banner.setAttribute("aria-labelledby", "cookie-banner-title");
  banner.setAttribute("aria-describedby", "cookie-banner-text");
  banner.innerHTML = `
    <h2 id="cookie-banner-title">Cookies</h2>
    <p id="cookie-banner-text">
      We use essential storage to remember this choice. Optional cookies (analytics or ads) stay off unless you accept.
      See the <a href="privacy.html#cookie-choices">Privacy Policy</a>.
    </p>
    <div class="cookie-banner-actions">
      <button type="button" class="btn btn-primary" data-cookie-choice="accepted">Accept</button>
      <button type="button" class="btn btn-ghost" data-cookie-choice="rejected">Reject</button>
    </div>
  `;
  document.body.append(banner);

  banner.querySelectorAll("[data-cookie-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      saveCookieChoice(button.getAttribute("data-cookie-choice") || "rejected");
      hideCookieBanner();
    });
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".js-cookie-settings");
    if (!trigger) return;
    event.preventDefault();
    showCookieBanner();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!banner.hidden && cookieChoice()) hideCookieBanner();
  });

  if (!cookieChoice()) showCookieBanner();
}

enhanceFooters();
wireCookieBanner();

function wireOrderParallax() {
  const stage = document.querySelector(".order-parallax");
  const inner = document.querySelector(".order-parallax-inner");
  if (!stage || !inner) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const update = () => {
    const travel = inner.scrollHeight - stage.clientHeight;
    if (travel <= 0) {
      inner.style.transform = "translate3d(0, 0, 0)";
      return;
    }
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    inner.style.transform = `translate3d(0, ${-travel * progress}px, 0)`;
  };

  const img = inner.querySelector("img");
  if (img && !img.complete) {
    img.addEventListener("load", update);
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

wireOrderParallax();
