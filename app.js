"use strict";

const OPS_TOKEN_KEY = "islaapp_ops_token";
const OPS_SESSION_TOKEN_KEY = "islaapp_session_token";

(function initSite() {
  setYear();
  initMarketingNav();
  initHomeCatalogSections();
  initUseCasesPage();
  initResourcesPage();
  initProductPage();
  initEnterprisePage();
  initTemplatesPage();
  initTemplateViewPage();
  initTemplateLivePage();
  initOnboardingChecklist();
  initOnboardingPlan();
  initOnboardingAICoach();
  initGuidePage();
  initAppBuilder();
  initProjectsPage();
  initProviderSetupPage();
  initServicesPage();
  initOpsPage();
  initPricing();
  initSupportForm();
  initMotionEffects();
})();

function initMotionEffects() {
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    document.documentElement.classList.add("reduced-motion");
    return;
  }

  document.documentElement.classList.add("motion-enabled");
  const lenis = initLenisMotion();
  initGsapMotion(lenis);
}

function initLenisMotion() {
  if (typeof window.Lenis !== "function") return null;
  if (window.__islaLenis) return window.__islaLenis;

  const lenis = new window.Lenis({
    duration: 1.08,
    smoothWheel: true,
    wheelMultiplier: 0.92,
    touchMultiplier: 1.15,
    normalizeWheel: true,
  });

  window.__islaLenis = lenis;
  return lenis;
}

function initGsapMotion(lenis) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (!gsap) {
    if (lenis) {
      const tick = (time) => {
        lenis.raf(time);
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    }
    return;
  }

  if (ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  if (lenis) {
    if (ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      const tick = (time) => {
        lenis.raf(time);
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    }
  }

  const topbar = document.querySelector(".topbar");
  if (topbar instanceof HTMLElement) {
    gsap.from(topbar, { y: -20, autoAlpha: 0, duration: 0.7, ease: "power2.out" });
  }

  const revealTargets = Array.from(
    document.querySelectorAll(".hero, .page-intro, .section-panel, .template-showcase-card, .category-card, .feature-grid article, .status-box")
  ).filter((node) => node instanceof HTMLElement && !node.classList.contains("hidden"));

  revealTargets.forEach((node, index) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.motionReady === "1") return;
    node.dataset.motionReady = "1";

    const baseAnimation = {
      autoAlpha: 1,
      y: 0,
      duration: 0.82,
      ease: "power2.out",
      delay: Math.min(index * 0.02, 0.2),
    };

    if (ScrollTrigger) {
      gsap.fromTo(
        node,
        { autoAlpha: 0, y: 34 },
        {
          ...baseAnimation,
          scrollTrigger: {
            trigger: node,
            start: "top 88%",
            end: "bottom 12%",
            toggleActions: "play none none reverse",
          },
        }
      );
      return;
    }

    gsap.fromTo(node, { autoAlpha: 0, y: 34 }, baseAnimation);
  });

  const cards = Array.from(document.querySelectorAll(".template-showcase-card, .category-card, .plan-card"));
  cards.forEach((card) => {
    if (!(card instanceof HTMLElement)) return;
    card.addEventListener("mouseenter", () => {
      gsap.to(card, { y: -6, duration: 0.3, ease: "power2.out" });
    });
    card.addEventListener("mouseleave", () => {
      gsap.to(card, { y: 0, duration: 0.35, ease: "power2.out" });
    });
  });

  if (ScrollTrigger) {
    window.setTimeout(() => ScrollTrigger.refresh(), 60);
  }
}

function getUseCaseCatalog() {
  return [
    { id: "productivity", title: "Productivity", count: 55 },
    { id: "education", title: "Educational", count: 43 },
    { id: "financial", title: "Financial", count: 37 },
    { id: "entertainment", title: "Entertainment", count: 35 },
    { id: "health", title: "Health & Wellness", count: 38 },
    { id: "bi", title: "Business Intelligence", count: 20 },
    { id: "creative", title: "Creative Tools", count: 16 },
    { id: "marketing", title: "Marketing & Sales", count: 18 },
    { id: "commerce", title: "E-commerce & Retail", count: 14 },
    { id: "community", title: "Community", count: 13 },
    { id: "hr", title: "HR & Recruitment", count: 10 },
    { id: "travel", title: "Travel Planning", count: 9 },
  ];
}

function initHomeCatalogSections() {
  const categoryGrid = document.querySelector("#homeCategoryGrid");
  const templateGrid = document.querySelector("#homeTemplateShowcase");

  if (!(categoryGrid instanceof HTMLElement) && !(templateGrid instanceof HTMLElement)) return;

  if (categoryGrid instanceof HTMLElement) {
    const categories = getUseCaseCatalog();
    categoryGrid.innerHTML = categories
      .map(
        (item) => `
          <article class="category-card">
            <h3>${escapeHtml(String(item.title || ""))}</h3>
            <p>${escapeHtml(String(item.count || 0))} Apps</p>
          </article>
        `
      )
      .join("");
  }

  if (templateGrid instanceof HTMLElement) {
    const featuredTemplates = getTemplateCatalog()
      .filter((item) => ["featured", "popular", "fast launch"].includes(String(item.status || "").toLowerCase()))
      .slice(0, 3);

    const templatesToRender = featuredTemplates.length > 0 ? featuredTemplates : getTemplateCatalog().slice(0, 3);
    templateGrid.innerHTML = templatesToRender
      .map(
        (item) => `
          <article class="template-showcase-card">
            <div class="template-showcase-thumb ${escapeAttribute(String(item.thumbClass || ""))} has-photo">
              ${renderTemplateImagePicture(item, { className: "template-media-picture", eager: true, sizes: "(max-width: 980px) 100vw, 30vw" })}
              <span class="template-thumb-status">${escapeHtml(String(item.status || "Customizable"))}</span>
            </div>
            <h3>${escapeHtml(String(item.name || ""))}</h3>
            <p>${escapeHtml(String(item.shortDescription || item.longDescription || ""))}</p>
            <div class="actions">
              <a class="btn btn-ghost btn-inline" href="template-view.html?template=${escapeAttribute(String(item.id || ""))}">View Template</a>
            </div>
          </article>
        `
      )
      .join("");
  }
}

function initUseCasesPage() {
  const categoryGrid = document.querySelector("#useCaseCategoryGrid");
  const templateGrid = document.querySelector("#useCaseTemplateGrid");
  if (!(categoryGrid instanceof HTMLElement) || !(templateGrid instanceof HTMLElement)) return;

  const categories = getUseCaseCatalog();
  categoryGrid.innerHTML = categories
    .map(
      (item) => `
        <article class="category-card">
          <h3>${escapeHtml(String(item.title || ""))}</h3>
          <p>${escapeHtml(String(item.count || 0))} Apps</p>
        </article>
      `
    )
    .join("");

  const templates = getTemplateCatalog();
  templateGrid.innerHTML = templates
    .map(
      (item) => `
        <article class="template-showcase-card" data-usecase-template data-category="${escapeAttribute(String(item.category || ""))}">
          <div class="template-showcase-thumb ${escapeAttribute(String(item.thumbClass || ""))} has-photo">
            ${renderTemplateImagePicture(item, { className: "template-media-picture", sizes: "(max-width: 980px) 100vw, 30vw" })}
            <span class="template-thumb-status">${escapeHtml(String(item.status || "Customizable"))}</span>
          </div>
          <div class="template-card-meta-row">
            <span class="template-meta-chip">${escapeHtml(String(item.stack || ""))}</span>
            <span class="template-clone-count">${escapeHtml(formatCompactNumber(item.clones))} clones</span>
          </div>
          <h3>${escapeHtml(String(item.name || ""))}</h3>
          <p>${escapeHtml(String(item.shortDescription || ""))}</p>
          <div class="actions">
            <a class="btn btn-ghost btn-inline" href="template-view.html?template=${escapeAttribute(String(item.id || ""))}">View App</a>
            <a class="btn btn-ghost btn-inline" href="app-builder.html?template_id=${escapeAttribute(String(item.id || ""))}">Use Template</a>
          </div>
        </article>
      `
    )
    .join("");

  const filterButtons = Array.from(document.querySelectorAll("[data-usecase-filter]"));
  const queryCategory = String(new URLSearchParams(window.location.search).get("category") || "").toLowerCase();
  const allowedFilters = new Set(filterButtons.map((button) => String(button.getAttribute("data-usecase-filter") || "").toLowerCase()));
  const normalizedInitial = allowedFilters.has(queryCategory) ? queryCategory : "all";
  const cards = Array.from(templateGrid.querySelectorAll("[data-usecase-template]"));

  const applyFilter = (category) => {
    const requested = String(category || "all").toLowerCase();
    const active = allowedFilters.has(requested) ? requested : "all";
    filterButtons.forEach((button) => {
      button.classList.toggle("is-active", String(button.getAttribute("data-usecase-filter") || "").toLowerCase() === active);
    });
    cards.forEach((card) => {
      const cardCategory = String(card.getAttribute("data-category") || "").toLowerCase();
      const visible = active === "all" || cardCategory === active;
      card.classList.toggle("hidden", !visible);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyFilter(String(button.getAttribute("data-usecase-filter") || "all"));
    });
  });

  applyFilter(normalizedInitial);
}

function initResourcesPage() {
  const resourcesGrid = document.querySelector("#resourcesGrid");
  const faqList = document.querySelector("#resourcesFaqList");
  if (!(resourcesGrid instanceof HTMLElement) || !(faqList instanceof HTMLElement)) return;

  const resources = [
    { title: "Docs & Quickstart", description: "Step-by-step setup, environment requirements, and deploy checklist.", href: "guide.html", cta: "Open Docs" },
    { title: "Pricing & Packaging", description: "Use plan ladders and service add-ons to quote clients clearly.", href: "pricing.html", cta: "View Pricing" },
    { title: "Launch Support", description: "Submit launch tickets for custom implementation and migration help.", href: "support.html", cta: "Open Support" },
    { title: "Provider Setup", description: "Connect Render, domain, and database providers from one setup flow.", href: "setup.html", cta: "Open Setup" },
  ];

  resourcesGrid.innerHTML = resources
    .map(
      (item) => `
        <article>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <a class="btn btn-ghost btn-inline" href="${escapeAttribute(item.href)}">${escapeHtml(item.cta)}</a>
        </article>
      `
    )
    .join("");

  const faqs = [
    "Who does the coding? The AI builds the first version automatically, then your team reviews and customizes.",
    "Can non-technical clients use it? Yes, with guided onboarding and template-first options.",
    "When should clients add database/hosting/domain? After first proof, AI recommends only what is needed.",
    "Can we start simple and scale later? Yes, start with MVP templates and add services as usage grows.",
  ];

  faqList.innerHTML = faqs.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function initProductPage() {
  const capabilities = document.querySelector("#productCapabilities");
  const process = document.querySelector("#productProcess");
  if (!(capabilities instanceof HTMLElement) || !(process instanceof HTMLElement)) return;

  const capabilityItems = [
    { title: "AI Prompt Builder", detail: "Client types what they want. AI drafts the app and preview instantly." },
    { title: "Template Marketplace", detail: "Visual templates for clients who are unsure what to build first." },
    { title: "Proof-First Workflow", detail: "Show working output before asking for provider setup." },
    { title: "Guided Launch Steps", detail: "AI reveals database, hosting, domain, and ops requirements in order." },
    { title: "Ops Control Center", detail: "Track requests, provisioning status, and project scaffolds in one dashboard." },
    { title: "Service Packaging", detail: "Bundle development, setup, and support into clear paid plans." },
  ];

  capabilities.innerHTML = capabilityItems
    .map(
      (item) => `
        <article>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.detail)}</p>
        </article>
      `
    )
    .join("");

  const processItems = [
    "Client enters app idea in plain language.",
    "AI generates first draft and live preview.",
    "Client approves concept and picks template path or custom path.",
    "AI prompts for only needed launch services.",
    "Team packages pricing and pushes to production.",
  ];
  process.innerHTML = processItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function initEnterprisePage() {
  const enterprisePacks = document.querySelector("#enterprisePackages");
  if (!(enterprisePacks instanceof HTMLElement)) return;

  const rows = [
    { tier: "Starter Team", scope: "Up to 5 internal apps", support: "Business-hours support", timeline: "2-4 weeks" },
    { tier: "Growth Studio", scope: "Templates + custom workflows", support: "Priority support", timeline: "4-8 weeks" },
    { tier: "Enterprise Program", scope: "Multi-team rollout + governance", support: "Dedicated success manager", timeline: "8-16 weeks" },
  ];

  enterprisePacks.innerHTML = rows
    .map(
      (row) => `
        <article class="status-box">
          <h3>${escapeHtml(row.tier)}</h3>
          <ul>
            <li><strong>Scope:</strong> ${escapeHtml(row.scope)}</li>
            <li><strong>Support:</strong> ${escapeHtml(row.support)}</li>
            <li><strong>Timeline:</strong> ${escapeHtml(row.timeline)}</li>
          </ul>
        </article>
      `
    )
    .join("");
}

function initMarketingNav() {
  const nav = document.querySelector(".page-home .marketing-nav");
  if (!nav) return;

  const menuItems = Array.from(nav.querySelectorAll(".nav-item.has-menu"));
  if (menuItems.length === 0) return;

  const closeAllMenus = () => {
    menuItems.forEach((item) => {
      item.classList.remove("is-open");
      const trigger = item.querySelector(".nav-trigger");
      if (trigger instanceof HTMLButtonElement) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  };

  menuItems.forEach((item) => {
    const trigger = item.querySelector(".nav-trigger");
    if (!(trigger instanceof HTMLButtonElement)) return;
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const isOpen = item.classList.contains("is-open");
      closeAllMenus();
      if (!isOpen) {
        item.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    if (!nav.contains(event.target)) {
      closeAllMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllMenus();
    }
  });
}

function createTemplateStudioImage(presetKey, altText) {
  const palettes = {
    saas: { from: "#1b4ddf", to: "#7a36de", accent: "#38d0ff" },
    portal: { from: "#2b3f66", to: "#4f78b8", accent: "#85b6ff" },
    market: { from: "#6633de", to: "#2e86ff", accent: "#37e0d8" },
    store: { from: "#ff7a2f", to: "#d9348f", accent: "#ffa95e" },
    booking: { from: "#0f8f84", to: "#3289e1", accent: "#6ce0c9" },
    helpdesk: { from: "#33415f", to: "#576d96", accent: "#9fb7e1" },
    community: { from: "#f02f6f", to: "#6438e0", accent: "#ff95bd" },
    membership: { from: "#e85a2e", to: "#f0b13d", accent: "#ffe17e" },
    crm: { from: "#233656", to: "#4666a7", accent: "#7ca8ff" },
    hr: { from: "#0b8f80", to: "#46c1b8", accent: "#9ce6d7" },
    realestate: { from: "#2e4768", to: "#6f9cc8", accent: "#b7d7ff" },
    restaurant: { from: "#8a2f1d", to: "#e46b2d", accent: "#ffc06c" },
  };

  const palette = palettes[String(presetKey || "").toLowerCase()] || palettes.saas;
  const safeAlt = String(altText || "").trim() || "Template visual preview";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" role="img" aria-label="${safeAlt}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.from}"/>
      <stop offset="100%" stop-color="${palette.to}"/>
    </linearGradient>
    <linearGradient id="cardGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <circle cx="1330" cy="190" r="220" fill="${palette.accent}" opacity="0.26"/>
  <circle cx="250" cy="860" r="280" fill="#ffffff" opacity="0.09"/>
  <rect x="118" y="95" width="1364" height="810" rx="34" fill="#ffffff" fill-opacity="0.9"/>
  <rect x="170" y="145" width="1260" height="70" rx="18" fill="#eff3ff"/>
  <rect x="200" y="168" width="290" height="24" rx="12" fill="${palette.from}" fill-opacity="0.18"/>
  <rect x="1120" y="166" width="120" height="28" rx="14" fill="${palette.to}" fill-opacity="0.3"/>
  <rect x="1260" y="166" width="140" height="28" rx="14" fill="${palette.accent}" fill-opacity="0.35"/>
  <rect x="170" y="250" width="410" height="610" rx="24" fill="#f7f9ff"/>
  <rect x="620" y="250" width="810" height="290" rx="24" fill="#f8faff"/>
  <rect x="620" y="570" width="380" height="290" rx="24" fill="#f8fbff"/>
  <rect x="1020" y="570" width="410" height="290" rx="24" fill="#f8fbff"/>
  <rect x="210" y="300" width="330" height="26" rx="13" fill="${palette.from}" fill-opacity="0.16"/>
  <rect x="210" y="340" width="220" height="18" rx="9" fill="${palette.to}" fill-opacity="0.12"/>
  <rect x="210" y="385" width="330" height="150" rx="16" fill="url(#cardGlow)"/>
  <rect x="210" y="565" width="150" height="120" rx="16" fill="${palette.from}" fill-opacity="0.12"/>
  <rect x="390" y="565" width="150" height="120" rx="16" fill="${palette.to}" fill-opacity="0.12"/>
  <rect x="210" y="710" width="330" height="120" rx="16" fill="${palette.accent}" fill-opacity="0.16"/>
  <rect x="660" y="300" width="300" height="22" rx="11" fill="${palette.from}" fill-opacity="0.15"/>
  <rect x="660" y="338" width="200" height="16" rx="8" fill="${palette.to}" fill-opacity="0.12"/>
  <rect x="660" y="380" width="730" height="120" rx="16" fill="url(#cardGlow)"/>
  <path d="M700 468 C790 370, 950 470, 1050 395 C1120 340, 1210 360, 1330 420" fill="none" stroke="${palette.from}" stroke-width="14" stroke-linecap="round" stroke-opacity="0.68"/>
  <circle cx="1330" cy="420" r="14" fill="${palette.accent}"/>
  <rect x="660" y="620" width="300" height="22" rx="11" fill="${palette.from}" fill-opacity="0.15"/>
  <rect x="660" y="656" width="240" height="16" rx="8" fill="${palette.to}" fill-opacity="0.12"/>
  <rect x="660" y="700" width="300" height="120" rx="16" fill="${palette.from}" fill-opacity="0.12"/>
  <rect x="1060" y="620" width="300" height="22" rx="11" fill="${palette.to}" fill-opacity="0.15"/>
  <rect x="1060" y="656" width="230" height="16" rx="8" fill="${palette.from}" fill-opacity="0.12"/>
  <rect x="1060" y="700" width="300" height="120" rx="16" fill="${palette.to}" fill-opacity="0.12"/>
</svg>`;

  const uri = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return {
    alt: safeAlt,
    avifSrcSet: "",
    webpSrcSet: "",
    jpgSrcSet: "",
    fallbackSrc: uri,
  };
}

function createTemplatePhotoImage(presetKey, altText) {
  const photoSources = {
    saas: "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=1600",
    portal: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1600",
    market: "https://images.pexels.com/photos/3850220/pexels-photo-3850220.jpeg?auto=compress&cs=tinysrgb&w=1600",
    store: "https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=1600",
    booking: "https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg?auto=compress&cs=tinysrgb&w=1600",
    helpdesk: "https://images.pexels.com/photos/8867436/pexels-photo-8867436.jpeg?auto=compress&cs=tinysrgb&w=1600",
    community: "https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1600",
    membership: "https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=1600",
    crm: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1600",
    hr: "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1600",
    realestate: "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1600",
    restaurant: "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=1600",
  };

  const key = String(presetKey || "").toLowerCase();
  const photo = String(photoSources[key] || "").trim();
  const fallback = createTemplateStudioImage(key, altText);
  if (!photo) return fallback;

  return {
    alt: String(altText || "").trim() || fallback.alt,
    avifSrcSet: "",
    webpSrcSet: "",
    jpgSrcSet: "",
    fallbackSrc: photo,
    backupSrc: String(fallback.fallbackSrc || ""),
  };
}

function renderTemplateImagePicture(template, options) {
  const config = options && typeof options === "object" ? options : {};
  const className = String(config.className || "template-media-picture");
  const eager = Boolean(config.eager);
  const sizes = String(config.sizes || "(max-width: 980px) 100vw, 33vw");
  const image = template && typeof template === "object" ? template.image : null;
  const alt = image && image.alt ? String(image.alt) : `${String((template && template.name) || "Template")} preview`;

  if (!image || !image.fallbackSrc) {
    return `<div class="${escapeAttribute(className)} template-media-fallback ${escapeAttribute(String((template && template.thumbClass) || ""))}" aria-hidden="true"></div>`;
  }

  return `
    <picture class="${escapeAttribute(className)}">
      ${image.avifSrcSet ? `<source type="image/avif" srcset="${escapeAttribute(String(image.avifSrcSet || ""))}" sizes="${escapeAttribute(sizes)}" />` : ""}
      ${image.webpSrcSet ? `<source type="image/webp" srcset="${escapeAttribute(String(image.webpSrcSet || ""))}" sizes="${escapeAttribute(sizes)}" />` : ""}
      <img
        src="${escapeAttribute(String(image.fallbackSrc || ""))}"
        ${image.backupSrc ? `data-fallback-src="${escapeAttribute(String(image.backupSrc || ""))}"` : ""}
        ${image.jpgSrcSet ? `srcset="${escapeAttribute(String(image.jpgSrcSet || ""))}"` : ""}
        sizes="${escapeAttribute(sizes)}"
        alt="${escapeAttribute(alt)}"
        loading="${eager ? "eager" : "lazy"}"
        decoding="async"
        fetchpriority="${eager ? "high" : "low"}"
        onerror="if(this.dataset.fallbackSrc && this.src !== this.dataset.fallbackSrc){ this.src = this.dataset.fallbackSrc; }"
      />
    </picture>
  `;
}

function getTemplateCatalog() {
  const templates = [
    {
      id: "saas-dashboard",
      name: "SaaS Dashboard",
      category: "business",
      status: "Featured",
      thumbClass: "template-thumb-saas",
      image: createTemplatePhotoImage("saas", "SaaS analytics dashboard visual"),
      shortDescription: "Admin, analytics, subscriptions.",
      longDescription: "Best for analytics products, admin dashboards, and subscription-ready SaaS launches.",
      stack: "React + Supabase",
      target: "MVP in 1 month",
      clones: 412,
      perfectFor: ["B2B tools", "Analytics apps", "Internal operations"],
      techTags: ["React", "Supabase", "Auth", "Reports"],
      features: ["User authentication", "Admin dashboard", "Analytics reports", "Team collaboration"],
    },
    {
      id: "client-portal",
      name: "Client Portal",
      category: "business",
      status: "Customizable",
      thumbClass: "template-thumb-portal",
      image: createTemplatePhotoImage("portal", "Client portal workspace visual"),
      shortDescription: "Projects, files, progress timeline.",
      longDescription: "Best for agencies and service teams managing client projects and shared files.",
      stack: "React + Supabase",
      target: "MVP in 1 month",
      clones: 289,
      perfectFor: ["Agencies", "Freelancers", "Client services"],
      techTags: ["React", "Supabase", "File sharing", "Notifications"],
      features: ["User authentication", "Team collaboration", "Notifications", "Admin dashboard"],
    },
    {
      id: "marketplace",
      name: "Marketplace",
      category: "commerce",
      status: "Featured",
      thumbClass: "template-thumb-market",
      image: createTemplatePhotoImage("market", "Marketplace app visual"),
      shortDescription: "Listings, checkout, seller profiles.",
      longDescription: "Best for multi-vendor catalogs where customers browse listings and checkout online.",
      stack: "Next.js + PostgreSQL",
      target: "Production in 2 months",
      clones: 507,
      perfectFor: ["Digital products", "Physical goods", "Multi-vendor platforms"],
      techTags: ["Next.js", "PostgreSQL", "Payments", "Admin"],
      features: ["User authentication", "Payments and billing", "Notifications", "Admin dashboard"],
    },
    {
      id: "ecommerce-storefront",
      name: "E-commerce Storefront",
      category: "commerce",
      status: "Popular",
      thumbClass: "template-thumb-store",
      image: createTemplatePhotoImage("store", "Ecommerce storefront visual"),
      shortDescription: "Products, cart, customer accounts.",
      longDescription: "Best for direct-to-consumer stores with inventory, cart, and order workflows.",
      stack: "Next.js + PostgreSQL",
      target: "Production in 2 months",
      clones: 621,
      perfectFor: ["Retail brands", "D2C stores", "Catalog sales"],
      techTags: ["Next.js", "PostgreSQL", "Checkout", "Order flow"],
      features: ["User authentication", "Payments and billing", "Notifications", "Analytics reports"],
    },
    {
      id: "booking-platform",
      name: "Booking Platform",
      category: "service",
      status: "Fast launch",
      thumbClass: "template-thumb-booking",
      image: createTemplatePhotoImage("booking", "Booking platform visual"),
      shortDescription: "Calendar, availability, reminders.",
      longDescription: "Best for appointment-based businesses that need scheduling and reminders.",
      stack: "React + Supabase",
      target: "Beta in 2 weeks",
      clones: 355,
      perfectFor: ["Clinics", "Salons", "Professional services"],
      techTags: ["React", "Supabase", "Calendar", "Reminders"],
      features: ["User authentication", "Notifications", "Admin dashboard"],
    },
    {
      id: "support-helpdesk",
      name: "Support Helpdesk",
      category: "service",
      status: "Customizable",
      thumbClass: "template-thumb-helpdesk",
      image: createTemplatePhotoImage("helpdesk", "Support helpdesk visual"),
      shortDescription: "Ticket queues and SLA workflow.",
      longDescription: "Best for support teams handling tickets, priorities, and service SLAs.",
      stack: "Node API + React Frontend",
      target: "MVP in 1 month",
      clones: 238,
      perfectFor: ["Support teams", "IT operations", "Customer success"],
      techTags: ["Node API", "React", "SLA tracking", "Reporting"],
      features: ["User authentication", "Team collaboration", "Notifications", "Analytics reports"],
    },
    {
      id: "community-platform",
      name: "Community Platform",
      category: "community",
      status: "Popular",
      thumbClass: "template-thumb-community",
      image: createTemplatePhotoImage("community", "Community platform visual"),
      shortDescription: "Feeds, groups, moderation.",
      longDescription: "Best for groups, memberships, and moderated social discussion spaces.",
      stack: "React + Supabase",
      target: "MVP in 1 month",
      clones: 474,
      perfectFor: ["Member clubs", "Forums", "Private communities"],
      techTags: ["React", "Supabase", "Feeds", "Moderation"],
      features: ["User authentication", "Team collaboration", "Notifications"],
    },
    {
      id: "creator-membership-hub",
      name: "Creator Membership Hub",
      category: "community",
      status: "Featured",
      thumbClass: "template-thumb-membership",
      image: createTemplatePhotoImage("membership", "Creator membership hub visual"),
      shortDescription: "Paid content and member access.",
      longDescription: "Best for creators selling premium content and gated member access.",
      stack: "React + Supabase",
      target: "MVP in 1 month",
      clones: 329,
      perfectFor: ["Creators", "Coaches", "Paid communities"],
      techTags: ["React", "Supabase", "Billing", "Access control"],
      features: ["User authentication", "Payments and billing", "Notifications", "Analytics reports"],
    },
    {
      id: "crm-workspace",
      name: "CRM Workspace",
      category: "business",
      status: "Enterprise ready",
      thumbClass: "template-thumb-crm",
      image: createTemplatePhotoImage("crm", "CRM workspace visual"),
      shortDescription: "Leads, deals, team pipeline.",
      longDescription: "Best for pipeline management, lead tracking, and sales follow-up operations.",
      stack: "Node API + React Frontend",
      target: "MVP in 1 month",
      clones: 276,
      perfectFor: ["Sales teams", "B2B services", "Revenue ops"],
      techTags: ["Node API", "React", "Pipelines", "Dashboards"],
      features: ["User authentication", "Team collaboration", "Admin dashboard", "Analytics reports"],
    },
    {
      id: "hr-recruiting-portal",
      name: "HR Recruiting Portal",
      category: "business",
      status: "Enterprise ready",
      thumbClass: "template-thumb-hr",
      image: createTemplatePhotoImage("hr", "HR recruiting portal visual"),
      shortDescription: "Candidates, stages, interviews.",
      longDescription: "Best for hiring teams managing candidates, stages, and interview processes.",
      stack: "Node API + React Frontend",
      target: "MVP in 1 month",
      clones: 211,
      perfectFor: ["HR teams", "Recruiters", "Talent operations"],
      techTags: ["Node API", "React", "Hiring funnel", "Scorecards"],
      features: ["User authentication", "Team collaboration", "Notifications", "Analytics reports"],
    },
    {
      id: "real-estate-listings",
      name: "Real Estate Listings",
      category: "service",
      status: "Customizable",
      thumbClass: "template-thumb-realestate",
      image: createTemplatePhotoImage("realestate", "Real estate listings visual"),
      shortDescription: "Properties, tours, lead capture.",
      longDescription: "Best for brokers and agencies showcasing properties and capturing buyer leads.",
      stack: "React + Supabase",
      target: "MVP in 1 month",
      clones: 194,
      perfectFor: ["Real estate agencies", "Property teams", "Independent brokers"],
      techTags: ["React", "Supabase", "Listings", "Lead forms"],
      features: ["User authentication", "Notifications", "Admin dashboard"],
    },
    {
      id: "restaurant-ordering",
      name: "Restaurant Ordering",
      category: "service",
      status: "Fast launch",
      thumbClass: "template-thumb-restaurant",
      image: createTemplatePhotoImage("restaurant", "Restaurant ordering visual"),
      shortDescription: "Menu, orders, kitchen queue.",
      longDescription: "Best for restaurants and food operators taking digital orders and tracking kitchen status.",
      stack: "React + Supabase",
      target: "Beta in 2 weeks",
      clones: 448,
      perfectFor: ["Restaurants", "Food trucks", "Cafe chains"],
      techTags: ["React", "Supabase", "Ordering", "Kitchen queue"],
      features: ["User authentication", "Payments and billing", "Notifications", "Admin dashboard"],
    },
  ];

  return templates.map((item) => ({
    status: "Customizable",
    clones: 0,
    perfectFor: [],
    techTags: [],
    liveUrl: `template-live.html?template=${item.id}`,
    ...item,
  }));
}

function findTemplateById(templateId) {
  const id = String(templateId || "").trim().toLowerCase();
  if (!id) return null;
  return getTemplateCatalog().find((item) => item.id === id) || null;
}

function findTemplateByName(templateName) {
  const name = String(templateName || "").trim().toLowerCase();
  if (!name) return null;
  return getTemplateCatalog().find((item) => item.name.toLowerCase() === name) || null;
}

function buildAppPreviewHtml({ projectName, template, target, features, owner }) {
  const featureItems = (Array.isArray(features) ? features : []).map((item) => `<li>${escapeHtml(String(item || ""))}</li>`).join("");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(projectName)} Preview</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #1f2942;
        background:
          radial-gradient(circle at 85% 10%, rgba(244, 106, 186, 0.24), rgba(244, 106, 186, 0) 44%),
          radial-gradient(circle at 12% 86%, rgba(74, 125, 255, 0.2), rgba(74, 125, 255, 0) 42%),
          linear-gradient(148deg, #f6f8ff, #eef2ff 48%, #f8f3ff);
      }
      .wrap {
        width: min(1040px, 95vw);
        margin: 1.2rem auto;
      }
      .shell {
        border: 1px solid rgba(50, 86, 199, 0.2);
        border-radius: 16px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 14px 40px rgba(38, 58, 115, 0.12);
      }
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.7rem 0.9rem;
        background: linear-gradient(130deg, #1f4bdb, #7637de 55%, #ef2d72);
        color: white;
      }
      .logo {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 0.02em;
      }
      .dot {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 999px;
        background: #fff;
      }
      .actions {
        display: inline-flex;
        gap: 0.35rem;
      }
      .actions i {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.75);
        display: inline-block;
      }
      .body {
        display: grid;
        grid-template-columns: 230px 1fr;
        min-height: 520px;
      }
      .sidebar {
        background: #f8faff;
        border-right: 1px solid rgba(50, 86, 199, 0.14);
        padding: 0.95rem 0.75rem;
      }
      .chip {
        display: inline-flex;
        border-radius: 999px;
        padding: 0.24rem 0.55rem;
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: white;
        background: linear-gradient(120deg, #1f4bdb, #e72a6f);
      }
      .menu {
        margin: 0.9rem 0 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 0.45rem;
      }
      .menu li {
        border: 1px solid rgba(44, 72, 164, 0.14);
        border-radius: 0.6rem;
        padding: 0.46rem 0.52rem;
        font-size: 0.78rem;
        color: #324465;
        background: #fff;
      }
      .main {
        padding: 0.95rem;
        display: grid;
        gap: 0.8rem;
        grid-template-rows: auto auto 1fr auto;
      }
      h1 {
        margin: 0;
        font-size: 1.2rem;
        line-height: 1.28;
        color: #1e2a46;
      }
      .meta {
        margin: 0.35rem 0 0;
        color: #415274;
        font-size: 0.86rem;
      }
      .hero {
        border: 1px solid rgba(57, 86, 179, 0.18);
        border-radius: 0.85rem;
        padding: 0.72rem 0.8rem;
        background: linear-gradient(125deg, #f8fbff, #fef8ff);
      }
      .widgets {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .card {
        border: 1px solid rgba(50, 86, 199, 0.14);
        border-radius: 0.8rem;
        background: #fff;
        padding: 0.7rem;
      }
      .card strong {
        color: #21345c;
        font-size: 0.86rem;
      }
      ul {
        margin: 0.5rem 0 0;
        padding-left: 1.05rem;
      }
      li {
        color: #41506d;
        font-size: 0.8rem;
      }
      li + li { margin-top: 0.23rem; }
      .proof {
        border-radius: 0.75rem;
        border: 1px solid rgba(16, 121, 90, 0.3);
        background: #ecfbf5;
        color: #17634c;
        padding: 0.58rem 0.68rem;
        font-size: 0.8rem;
        font-weight: 700;
      }
      @media (max-width: 820px) {
        .body { grid-template-columns: 1fr; }
        .sidebar { border-right: none; border-bottom: 1px solid rgba(50, 86, 199, 0.14); }
        .widgets { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="shell">
        <header class="topbar">
          <span class="logo"><i class="dot"></i> islaAPP Live Prototype</span>
          <span class="actions"><i></i><i></i><i></i></span>
        </header>
        <div class="body">
          <aside class="sidebar">
            <span class="chip">${escapeHtml(template)}</span>
            <ul class="menu">
              <li>Overview</li>
              <li>Customers</li>
              <li>Automation</li>
              <li>Billing</li>
              <li>Settings</li>
            </ul>
          </aside>
          <main class="main">
            <article class="hero">
              <h1>${escapeHtml(projectName)}</h1>
              <p class="meta"><strong>Owner:</strong> ${escapeHtml(owner)} • <strong>Target:</strong> ${escapeHtml(target)}</p>
            </article>
            <section class="widgets">
              <article class="card">
                <strong>AI-generated first version includes</strong>
                <ul>${featureItems}</ul>
              </article>
              <article class="card">
                <strong>Launch guidance</strong>
                <ul>
                  <li>Add domain and hosting only when needed</li>
                  <li>Enable database as features expand</li>
                  <li>Publish after test flow passes</li>
                </ul>
              </article>
            </section>
            <div class="proof">Prototype is working. Next, AI asks for only the required launch services.</div>
          </main>
        </div>
      </section>
    </div>
  </body>
</html>`;
}

function buildAppPreviewEmbed({ projectName, template, target, features, owner }) {
  const featureItems = (Array.isArray(features) ? features : [])
    .map((item) => `<li style="margin-top:6px;">${escapeHtml(String(item || ""))}</li>`)
    .join("");
  return `
    <section style="font-family:Manrope,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2942;background:linear-gradient(148deg,#f6f8ff,#eef2ff 48%,#f8f3ff);min-height:100%;padding:12px;">
      <div style="border:1px solid rgba(50,86,199,.2);border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 14px 40px rgba(38,58,115,.12);max-width:1020px;margin:0 auto;">
        <header style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.7rem .9rem;background:linear-gradient(130deg,#1f4bdb,#7637de 55%,#ef2d72);color:#fff;">
          <span style="display:inline-flex;align-items:center;gap:.45rem;font-size:.82rem;font-weight:800;letter-spacing:.02em;"><i style="width:.55rem;height:.55rem;border-radius:999px;background:#fff;display:inline-block;"></i>islaAPP Live Prototype</span>
          <span style="display:inline-flex;gap:.35rem;"><i style="width:.45rem;height:.45rem;border-radius:999px;background:rgba(255,255,255,.75);display:inline-block;"></i><i style="width:.45rem;height:.45rem;border-radius:999px;background:rgba(255,255,255,.75);display:inline-block;"></i><i style="width:.45rem;height:.45rem;border-radius:999px;background:rgba(255,255,255,.75);display:inline-block;"></i></span>
        </header>
        <div style="display:grid;grid-template-columns:220px 1fr;min-height:420px;">
          <aside style="background:#f8faff;border-right:1px solid rgba(50,86,199,.14);padding:.95rem .75rem;">
            <span style="display:inline-flex;border-radius:999px;padding:.24rem .55rem;font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#fff;background:linear-gradient(120deg,#1f4bdb,#e72a6f);">${escapeHtml(template)}</span>
            <ul style="list-style:none;padding:0;margin:.9rem 0 0;display:grid;gap:.45rem;">
              <li style="border:1px solid rgba(44,72,164,.14);border-radius:.6rem;padding:.46rem .52rem;font-size:.78rem;background:#fff;">Overview</li>
              <li style="border:1px solid rgba(44,72,164,.14);border-radius:.6rem;padding:.46rem .52rem;font-size:.78rem;background:#fff;">Customers</li>
              <li style="border:1px solid rgba(44,72,164,.14);border-radius:.6rem;padding:.46rem .52rem;font-size:.78rem;background:#fff;">Automation</li>
              <li style="border:1px solid rgba(44,72,164,.14);border-radius:.6rem;padding:.46rem .52rem;font-size:.78rem;background:#fff;">Billing</li>
              <li style="border:1px solid rgba(44,72,164,.14);border-radius:.6rem;padding:.46rem .52rem;font-size:.78rem;background:#fff;">Settings</li>
            </ul>
          </aside>
          <main style="padding:.95rem;display:grid;gap:.8rem;align-content:start;">
            <article style="border:1px solid rgba(57,86,179,.18);border-radius:.85rem;padding:.72rem .8rem;background:linear-gradient(125deg,#f8fbff,#fef8ff);">
              <h3 style="margin:0;font-size:1.16rem;line-height:1.28;color:#1e2a46;">${escapeHtml(projectName)}</h3>
              <p style="margin:.35rem 0 0;color:#415274;font-size:.86rem;"><strong>Owner:</strong> ${escapeHtml(owner)} • <strong>Target:</strong> ${escapeHtml(target)}</p>
            </article>
            <section style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;">
              <article style="border:1px solid rgba(50,86,199,.14);border-radius:.8rem;background:#fff;padding:.7rem;">
                <strong style="color:#21345c;font-size:.86rem;">AI-generated first version includes</strong>
                <ul style="margin:.5rem 0 0;padding-left:1.05rem;">${featureItems}</ul>
              </article>
              <article style="border:1px solid rgba(50,86,199,.14);border-radius:.8rem;background:#fff;padding:.7rem;">
                <strong style="color:#21345c;font-size:.86rem;">Launch guidance</strong>
                <ul style="margin:.5rem 0 0;padding-left:1.05rem;">
                  <li style="margin-top:6px;">Add domain and hosting only when needed</li>
                  <li style="margin-top:6px;">Enable database as features expand</li>
                  <li style="margin-top:6px;">Publish after test flow passes</li>
                </ul>
              </article>
            </section>
            <div style="border-radius:.75rem;border:1px solid rgba(16,121,90,.3);background:#ecfbf5;color:#17634c;padding:.58rem .68rem;font-size:.8rem;font-weight:700;">Prototype is working. Next, AI asks for only the required launch services.</div>
          </main>
        </div>
      </div>
    </section>
  `;
}

function renderPreviewSurface(surfaceNode, previewPayload) {
  if (!(surfaceNode instanceof HTMLElement)) return;
  if (surfaceNode instanceof HTMLIFrameElement) {
    surfaceNode.src = "about:blank";
    surfaceNode.srcdoc = buildAppPreviewHtml(previewPayload);
    return;
  }
  surfaceNode.innerHTML = buildAppPreviewEmbed(previewPayload);
}

function clearPreviewSurface(surfaceNode) {
  if (!(surfaceNode instanceof HTMLElement)) return;
  if (surfaceNode instanceof HTMLIFrameElement) {
    surfaceNode.src = "about:blank";
    surfaceNode.srcdoc = "";
    return;
  }
  surfaceNode.innerHTML = "";
}

function ensureModalPreviewSurface(modalNode, frameNode, fallbackId) {
  if (frameNode instanceof HTMLElement && !(frameNode instanceof HTMLIFrameElement)) {
    return frameNode;
  }
  if (!(modalNode instanceof HTMLElement)) return frameNode instanceof HTMLElement ? frameNode : null;

  const card = modalNode.querySelector(".template-demo-card");
  if (!(card instanceof HTMLElement)) return frameNode instanceof HTMLElement ? frameNode : null;

  let fallback = card.querySelector(`#${fallbackId}`);
  if (!(fallback instanceof HTMLElement)) {
    fallback = document.createElement("div");
    fallback.id = fallbackId;
    fallback.className = "template-demo-frame";
    fallback.setAttribute("role", "document");
    fallback.setAttribute("aria-label", "Template demo preview");
    card.appendChild(fallback);
  }

  if (frameNode instanceof HTMLIFrameElement) {
    frameNode.classList.add("hidden");
  }

  return fallback;
}

function initTemplatesPage() {
  const grid = document.querySelector("#templatesCatalogGrid");
  if (!(grid instanceof HTMLElement)) return;

  const templates = getTemplateCatalog();
  grid.innerHTML = templates
    .map((template) => {
      const descriptionSearchText = [template.shortDescription, template.longDescription, ...(Array.isArray(template.perfectFor) ? template.perfectFor : [])]
        .filter(Boolean)
        .join(" ");
      const tags = (Array.isArray(template.techTags) ? template.techTags.slice(0, 3) : []).map(
        (tag) => `<span class="template-card-tag">${escapeHtml(String(tag || ""))}</span>`
      );
      return `
        <article
          class="template-showcase-card"
          data-template-card
          data-category="${escapeAttribute(String(template.category || ""))}"
          data-name="${escapeAttribute(String(template.name || ""))}"
          data-description="${escapeAttribute(descriptionSearchText)}"
        >
          <div class="template-showcase-thumb ${escapeAttribute(String(template.thumbClass || ""))} has-photo">
            ${renderTemplateImagePicture(template, { className: "template-media-picture", sizes: "(max-width: 980px) 100vw, 30vw" })}
            <span class="template-thumb-status">${escapeHtml(String(template.status || "Customizable"))}</span>
          </div>
          <div class="template-card-meta-row">
            <span class="template-meta-chip">${escapeHtml(String(template.stack || ""))}</span>
            <span class="template-clone-count">${escapeHtml(formatCompactNumber(template.clones))} clones</span>
          </div>
          <h3>${escapeHtml(String(template.name || ""))}</h3>
          <p>${escapeHtml(String(template.shortDescription || ""))}</p>
          <div class="template-card-tags">${tags.join("")}</div>
          <div class="actions">
            <a class="btn btn-ghost btn-inline" href="template-view.html?template=${escapeAttribute(String(template.id || ""))}">View App</a>
            <a
              class="btn btn-ghost btn-inline"
              href="${escapeAttribute(String(template.liveUrl || "#"))}"
              target="_blank"
              rel="noopener noreferrer"
            >Live URL</a>
          </div>
        </article>
      `;
    })
    .join("");

  const cards = Array.from(grid.querySelectorAll("[data-template-card]"));
  const filterButtons = Array.from(document.querySelectorAll("[data-catalog-filter]"));
  const searchInput = document.querySelector("#templatesSearch");
  const catalogCount = document.querySelector("#templatesCatalogCount");

  const applyFilters = () => {
    const activeFilterButton = filterButtons.find((button) => button.classList.contains("is-active"));
    const activeCategory = String(activeFilterButton?.dataset.catalogFilter || "all").toLowerCase();
    const searchValue = searchInput instanceof HTMLInputElement ? searchInput.value.trim().toLowerCase() : "";
    let visibleCount = 0;

    cards.forEach((card) => {
      const category = String(card.getAttribute("data-category") || "").toLowerCase();
      const name = String(card.getAttribute("data-name") || "").toLowerCase();
      const description = String(card.getAttribute("data-description") || "").toLowerCase();
      const categoryMatch = activeCategory === "all" || category === activeCategory;
      const searchMatch = !searchValue || name.includes(searchValue) || description.includes(searchValue);
      const visible = categoryMatch && searchMatch;
      if (visible) visibleCount += 1;
      card.classList.toggle("hidden", !visible);
    });

    if (catalogCount instanceof HTMLElement) {
      catalogCount.textContent = `${visibleCount} templates`;
    }
  };

  if (filterButtons.length > 0) {
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
        applyFilters();
      });
    });
  }

  if (searchInput instanceof HTMLInputElement) {
    searchInput.addEventListener("input", applyFilters);
  }

  applyFilters();
}

function initTemplateViewPage() {
  const root = document.querySelector("#templateViewRoot");
  if (!(root instanceof HTMLElement)) return;

  const title = document.querySelector("#templateViewTitle");
  const subtitle = document.querySelector("#templateViewSubtitle");
  const description = document.querySelector("#templateViewDescription");
  const highlights = document.querySelector("#templateViewHighlights");
  const previewCard = document.querySelector("#templateViewPreview");
  const status = document.querySelector("#templateViewStatus");
  const stack = document.querySelector("#templateViewStackPill");
  const target = document.querySelector("#templateViewTargetPill");
  const category = document.querySelector("#templateViewCategoryPill");
  const clones = document.querySelector("#templateViewCloneCount");
  const perfectFor = document.querySelector("#templateViewPerfectFor");
  const techTags = document.querySelector("#templateViewTechTags");
  const viewButton = document.querySelector("#templateViewOpenDemo");
  const liveLink = document.querySelector("#templateViewOpenLive");
  const liveUrlInput = document.querySelector("#templateViewLiveUrl");
  const useButton = document.querySelector("#templateViewUseTemplate");
  const cloneButton = document.querySelector("#templateViewCloneTemplate");
  const modal = document.querySelector("#templateViewerModal");
  const modalFrame = document.querySelector("#templateViewerFrame");
  const modalTitle = document.querySelector("#templateViewerTitle");
  const modalClose = document.querySelector("#templateViewerClose");

  const params = new URLSearchParams(window.location.search);
  const selected =
    findTemplateById(params.get("template")) ||
    findTemplateById(params.get("template_id")) ||
    findTemplateByName(params.get("template")) ||
    getTemplateCatalog()[0];

  if (!selected) return;

  if (title instanceof HTMLElement) title.textContent = selected.name;
  if (subtitle instanceof HTMLElement) subtitle.textContent = `${selected.category.toUpperCase()} TEMPLATE`;
  if (description instanceof HTMLElement) description.textContent = selected.longDescription;
  if (status instanceof HTMLElement) status.textContent = selected.status;
  if (stack instanceof HTMLElement) stack.textContent = selected.stack;
  if (target instanceof HTMLElement) target.textContent = selected.target;
  if (category instanceof HTMLElement) category.textContent = String(selected.category || "").toUpperCase();
  if (clones instanceof HTMLElement) clones.textContent = `${formatCompactNumber(selected.clones)} clones`;
  if (highlights instanceof HTMLElement) {
    highlights.innerHTML = selected.features.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
  if (perfectFor instanceof HTMLElement) {
    perfectFor.innerHTML = selected.perfectFor.map((item) => `<span class="template-pill">${escapeHtml(item)}</span>`).join("");
  }
  if (techTags instanceof HTMLElement) {
    techTags.innerHTML = selected.techTags.map((item) => `<span class="template-pill tech">${escapeHtml(item)}</span>`).join("");
  }
  if (previewCard instanceof HTMLElement) {
    previewCard.className = `template-view-preview ${selected.thumbClass} has-photo`;
    previewCard.innerHTML = renderTemplateImagePicture(selected, {
      className: "template-media-picture template-media-picture-large",
      eager: true,
      sizes: "(max-width: 980px) 100vw, 62vw",
    });
  }

  const liveHref = resolveTemplateLiveUrl(selected.liveUrl || `template-live.html?template=${selected.id}`);
  if (liveLink instanceof HTMLAnchorElement) {
    liveLink.href = liveHref;
  }
  if (liveUrlInput instanceof HTMLInputElement) {
    liveUrlInput.value = liveHref;
  }

  const openDemo = () => {
    if (!(modal instanceof HTMLElement)) return;
    const previewSurface = ensureModalPreviewSurface(modal, modalFrame, "templateViewerSurface");
    if (!(previewSurface instanceof HTMLElement)) return;
    renderPreviewSurface(previewSurface, {
      projectName: `${selected.name} Demo`,
      template: selected.name,
      target: selected.target,
      features: selected.features,
      owner: "islaAPP",
    });
    if (modalTitle instanceof HTMLElement) modalTitle.textContent = `${selected.name} Demo`;
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  };

  const closeDemo = () => {
    if (!(modal instanceof HTMLElement)) return;
    const previewSurface = ensureModalPreviewSurface(modal, modalFrame, "templateViewerSurface");
    if (!(previewSurface instanceof HTMLElement)) return;
    modal.classList.add("hidden");
    clearPreviewSurface(previewSurface);
    document.body.classList.remove("modal-open");
  };

  const buildBuilderUrl = (autoClone) => {
    const query = new URLSearchParams({
      template_id: selected.id,
      template: selected.name,
      stack: selected.stack,
      target: selected.target,
      features: selected.features.join("|"),
      project: `${selected.name} Client Build`,
      source: "template-catalog",
    });
    if (autoClone) {
      query.set("autoclone", "1");
    }
    return `app-builder.html?${query.toString()}`;
  };

  if (viewButton instanceof HTMLButtonElement) {
    viewButton.addEventListener("click", openDemo);
  }
  if (useButton instanceof HTMLAnchorElement) {
    useButton.href = buildBuilderUrl(false);
  }
  if (cloneButton instanceof HTMLAnchorElement) {
    cloneButton.href = buildBuilderUrl(true);
  }

  if (modalClose instanceof HTMLButtonElement) {
    modalClose.addEventListener("click", closeDemo);
  }
  if (modal instanceof HTMLElement) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeDemo();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDemo();
  });
}

function initTemplateLivePage() {
  const root = document.querySelector("#templateLiveRoot");
  if (!(root instanceof HTMLElement)) return;

  const title = document.querySelector("#templateLiveTitle");
  const subtitle = document.querySelector("#templateLiveSubtitle");
  const frame = document.querySelector("#templateLiveFrame");
  const useButton = document.querySelector("#templateLiveUse");
  const cloneButton = document.querySelector("#templateLiveClone");
  const chips = document.querySelector("#templateLiveChips");

  const params = new URLSearchParams(window.location.search);
  const selected =
    findTemplateById(params.get("template")) ||
    findTemplateById(params.get("template_id")) ||
    findTemplateByName(params.get("template")) ||
    getTemplateCatalog()[0];

  if (!selected) return;

  if (title instanceof HTMLElement) title.textContent = `${selected.name} Live Demo`;
  if (subtitle instanceof HTMLElement) subtitle.textContent = selected.longDescription;
  if (chips instanceof HTMLElement) {
    const tokenList = [selected.status, selected.stack, `${formatCompactNumber(selected.clones)} clones`];
    chips.innerHTML = tokenList.map((item) => `<span class="template-pill">${escapeHtml(String(item || ""))}</span>`).join("");
  }

  const buildBuilderUrl = (autoClone) => {
    const query = new URLSearchParams({
      template_id: selected.id,
      template: selected.name,
      stack: selected.stack,
      target: selected.target,
      features: selected.features.join("|"),
      project: `${selected.name} Client Build`,
      source: "template-live",
    });
    if (autoClone) {
      query.set("autoclone", "1");
    }
    return `app-builder.html?${query.toString()}`;
  };

  if (useButton instanceof HTMLAnchorElement) useButton.href = buildBuilderUrl(false);
  if (cloneButton instanceof HTMLAnchorElement) cloneButton.href = buildBuilderUrl(true);

  if (frame instanceof HTMLElement) {
    renderPreviewSurface(frame, {
      projectName: `${selected.name} Live`,
      template: selected.name,
      target: selected.target,
      features: selected.features,
      owner: "islaAPP",
    });
  }
}

function setYear() {
  const yearNodes = document.querySelectorAll("[data-year]");
  const currentYear = String(new Date().getFullYear());
  yearNodes.forEach((node) => {
    node.textContent = currentYear;
  });
}

function initOnboardingChecklist() {
  const checklist = document.querySelector("#onboardingChecklist");
  const fill = document.querySelector("#onboardingProgressFill");
  const text = document.querySelector("#onboardingProgressText");

  if (!checklist || !fill || !text) return;

  const checkboxes = Array.from(checklist.querySelectorAll("input[type='checkbox'][data-check-id]"));
  const storageKey = "islaapp_onboarding_checks";
  const saved = parseChecklistState(localStorage.getItem(storageKey));

  checkboxes.forEach((box) => {
    if (saved[box.dataset.checkId]) {
      box.checked = true;
    }
    box.addEventListener("change", () => {
      const state = {};
      checkboxes.forEach((item) => {
        state[item.dataset.checkId] = item.checked;
      });
      localStorage.setItem(storageKey, JSON.stringify(state));
      renderChecklistProgress(checkboxes, fill, text);
      emitOnboardingStateChanged();
    });
  });

  renderChecklistProgress(checkboxes, fill, text);
  emitOnboardingStateChanged();
}

function parseChecklistState(rawValue) {
  if (!rawValue) return {};
  try {
    const parsed = JSON.parse(rawValue);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (error) {
    return {};
  }
  return {};
}

function renderChecklistProgress(checkboxes, fill, text) {
  const total = checkboxes.length;
  const done = checkboxes.filter((box) => box.checked).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  fill.style.width = `${pct}%`;
  text.textContent = `${done} of ${total} complete`;
}

function initOnboardingPlan() {
  const intakeForm = document.querySelector("#projectIntake");
  const output = document.querySelector("#planOutput");

  if (!intakeForm || !output) return;

  const intakeStorageKey = "islaapp_onboarding_intake";
  const trackedInputs = Array.from(
    intakeForm.querySelectorAll("input, select, textarea")
  );

  const collectIntake = () => ({
    studentName: valueOf("#studentName"),
    studentEmail: valueOf("#studentEmail"),
    projectType: valueOf("#projectType"),
    launchGoal: valueOf("#launchGoal"),
    timeline: valueOf("#timeline"),
  });

  const saveIntake = () => {
    localStorage.setItem(intakeStorageKey, JSON.stringify(collectIntake()));
  };

  const savedIntake = parseChecklistState(localStorage.getItem(intakeStorageKey));
  setInputValue("#studentName", typeof savedIntake.studentName === "string" ? savedIntake.studentName : "");
  setInputValue("#studentEmail", typeof savedIntake.studentEmail === "string" ? savedIntake.studentEmail : "");
  setSelectValue("#projectType", typeof savedIntake.projectType === "string" ? savedIntake.projectType : "");
  setSelectValue("#launchGoal", typeof savedIntake.launchGoal === "string" ? savedIntake.launchGoal : "");
  setSelectValue("#timeline", typeof savedIntake.timeline === "string" ? savedIntake.timeline : "");

  trackedInputs.forEach((node) => {
    node.addEventListener("input", () => {
      saveIntake();
      emitOnboardingStateChanged();
    });
    node.addEventListener("change", () => {
      saveIntake();
      emitOnboardingStateChanged();
    });
  });

  intakeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveIntake();

    if (!intakeForm.checkValidity()) {
      showStatus(output, "error", "Missing onboarding details", [
        "Complete all required fields before generating your launch plan.",
      ]);
      emitOnboardingStateChanged();
      return;
    }

    const studentName = valueOf("#studentName");
    const studentEmail = valueOf("#studentEmail");
    const projectType = valueOf("#projectType");
    const launchGoal = valueOf("#launchGoal");
    const timeline = valueOf("#timeline");

    const planLines = [
      `Owner: ${studentName} (${studentEmail})`,
      `Project: ${projectType} focused on ${launchGoal}`,
      `Target timeline: ${timeline}`,
      "Next step: Build your app brief in the App Builder page.",
      "Then select your plan on the pricing page.",
      "Finally, submit support ticket for kickoff scheduling.",
    ];

    showStatus(output, "success", "Launch plan generated", planLines);
    localStorage.setItem("islaapp_launch_plan_generated_at", new Date().toISOString());
    emitOnboardingStateChanged();
  });
}

function emitOnboardingStateChanged() {
  document.dispatchEvent(new Event("onboarding:state-changed"));
}

function initOnboardingAICoach() {
  const summaryRoot = document.querySelector("#onboardingAiSummary");
  const requirementsRoot = document.querySelector("#onboardingAiRequirements");
  const actionsRoot = document.querySelector("#onboardingAiActions");
  const refreshButton = document.querySelector("#onboardingAiRefresh");

  if (!summaryRoot || !requirementsRoot || !actionsRoot) return;

  let providerHealthById = {};

  const checklistState = () => {
    const boxes = Array.from(document.querySelectorAll("#onboardingChecklist input[type='checkbox'][data-check-id]"));
    const state = {};
    boxes.forEach((box) => {
      state[String(box.dataset.checkId || "")] = Boolean(box.checked);
    });
    return state;
  };

  const intakeState = () => {
    const name = valueOf("#studentName");
    const email = valueOf("#studentEmail");
    const projectType = valueOf("#projectType");
    const launchGoal = valueOf("#launchGoal");
    const timeline = valueOf("#timeline");
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const complete = Boolean(name && email && validEmail && projectType && launchGoal && timeline);
    return { name, email, projectType, launchGoal, timeline, complete };
  };

  const builderDraftState = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_builder_draft"));
    const stack = typeof saved.stack === "string" ? saved.stack : "";
    const target = typeof saved.target === "string" ? saved.target : "";
    const features = Array.isArray(saved.features) ? saved.features : [];
    const hasDraft = Boolean(stack || target || features.length > 0 || saved.template);
    return {
      stack,
      target,
      features,
      template: typeof saved.template === "string" ? saved.template : "",
      hasDraft,
    };
  };

  const stageLabel = (checks, intakeComplete, missingProviderCount, hasBuilderDraft) => {
    if (!checks.idea) return "Stage 1: Define the idea";
    if (!checks.content || !checks.features) return "Stage 2: Gather requirements";
    if (!intakeComplete) return "Stage 3: Complete intake form";
    if (!hasBuilderDraft || !checks.builder) return "Stage 4: Build app plan";
    if (missingProviderCount > 0) return "Stage 5: Connect provider accounts";
    if (!checks.pricing) return "Stage 6: Pricing and kickoff";
    return "Stage 7: Ready to launch";
  };

  const render = () => {
    const checks = checklistState();
    const intake = intakeState();
    const draft = builderDraftState();
    const requirements = deriveBuilderRequirements({
      stack: draft.stack,
      features: draft.features,
      target: draft.target,
      providerHealthById,
    });

    const requiredMissing = requirements.filter((item) => item.required && !item.ready);
    const label = stageLabel(checks, intake.complete, requiredMissing.length, draft.hasDraft);
    const checklistDone = Object.values(checks).filter(Boolean).length;
    const checklistTotal = Object.keys(checks).length;

    summaryRoot.innerHTML = `
      <h3>${escapeHtml(label)}</h3>
      <ul>
        <li>Checklist progress: ${checklistDone}/${checklistTotal}</li>
        <li>Intake form: ${intake.complete ? "Complete" : "Missing fields"}</li>
        <li>App Builder draft: ${draft.hasDraft ? "Detected" : "Not started"}</li>
        <li>Required services connected: ${requirements.filter((item) => item.required && item.ready).length}/${requirements.filter((item) => item.required).length}</li>
      </ul>
    `;

    if (!draft.hasDraft || requirements.length === 0) {
      requirementsRoot.innerHTML = "<li>After selecting stack/features in App Builder, AI will list database, hosting, GitHub, domain, and more.</li>";
    } else {
      requirementsRoot.innerHTML = requirements
        .map((item) => {
          const stateClass = item.ready ? "status-active" : item.required ? "status-provision-failed" : "status-provisioning";
          const stateText = item.ready ? "Ready" : item.required ? "Missing" : "Optional";
          return `
            <li class="ai-requirement-item">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-chip ${stateClass}">${escapeHtml(stateText)}</span>
              <p>${escapeHtml(item.reason || "")}</p>
            </li>
          `;
        })
        .join("");
    }

    const actions = [];
    if (!checks.idea) actions.push(`Define project idea and user type in checklist.`);
    if (!checks.content) actions.push(`Gather logo, colors, and key content.`);
    if (!checks.features) actions.push(`List required features (auth, billing, admin, reports).`);
    if (!intake.complete) {
      actions.push(`Complete the intake form with name, email, project type, launch goal, and timeline.`);
    } else {
      actions.push(`Intake complete. Move to App Builder.`);
    }
    if (!draft.hasDraft || !checks.builder) {
      actions.push(`Open App Builder, choose stack/features, and save draft.`);
    }
    if (requiredMissing.length > 0) {
      actions.push(`Open Setup Wizard and connect required providers.`);
    }
    if (draft.hasDraft && requiredMissing.length === 0) {
      actions.push(`Open Services and submit provisioning request.`);
    }
    if (!checks.pricing) {
      actions.push(`Review pricing and submit kickoff support ticket.`);
    }
    if (actions.length === 0) {
      actions.push(`All onboarding stages are complete. Proceed to launch operations in Ops.`);
    }

    actionsRoot.innerHTML = actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  };

  const loadProviderHealth = async () => {
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Provider health unavailable");
      const providers = Array.isArray(payload.providers) ? payload.providers : [];
      providerHealthById = {};
      providers.forEach((provider) => {
        const id = String(provider.id || "").trim().toLowerCase();
        if (!id) return;
        providerHealthById[id] = Boolean(provider.configured);
      });
    } catch (_error) {
      providerHealthById = {};
    } finally {
      render();
    }
  };

  document.addEventListener("onboarding:state-changed", render);
  window.addEventListener("storage", render);

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await loadProviderHealth();
    });
  }

  render();
  loadProviderHealth();
}

function initGuidePage() {
  const summaryRoot = document.querySelector("#guideSummary");
  const requirementsRoot = document.querySelector("#guideRequirements");
  const actionsRoot = document.querySelector("#guideActions");
  const journeyRoot = document.querySelector("#guideJourney");
  const primaryAction = document.querySelector("#guidePrimaryAction");
  const refreshButton = document.querySelector("#guideRefresh");

  if (!summaryRoot || !requirementsRoot || !actionsRoot || !journeyRoot || !primaryAction) return;

  let providerHealthById = {};
  let requests = [];
  let projectCount = 0;
  let authState = {
    signedIn: false,
    username: "",
    role: "",
    bootstrapRequired: false,
    requiresAdminToken: false,
  };

  const readChecklist = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_onboarding_checks"));
    const keys = ["idea", "content", "features", "builder", "pricing"];
    const state = {};
    keys.forEach((key) => {
      state[key] = Boolean(saved[key]);
    });
    return state;
  };

  const readIntake = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_onboarding_intake"));
    const studentName = typeof saved.studentName === "string" ? saved.studentName.trim() : "";
    const studentEmail = typeof saved.studentEmail === "string" ? saved.studentEmail.trim() : "";
    const projectType = typeof saved.projectType === "string" ? saved.projectType.trim() : "";
    const launchGoal = typeof saved.launchGoal === "string" ? saved.launchGoal.trim() : "";
    const timeline = typeof saved.timeline === "string" ? saved.timeline.trim() : "";
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail);
    const complete = Boolean(studentName && studentEmail && validEmail && projectType && launchGoal && timeline);
    return {
      studentName,
      studentEmail,
      projectType,
      launchGoal,
      timeline,
      complete,
      planGeneratedAt: String(localStorage.getItem("islaapp_launch_plan_generated_at") || ""),
    };
  };

  const readBuilderDraft = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_builder_draft"));
    const stack = typeof saved.stack === "string" ? saved.stack : "";
    const target = typeof saved.target === "string" ? saved.target : "";
    const features = Array.isArray(saved.features) ? saved.features : [];
    const template = typeof saved.template === "string" ? saved.template : "";
    const hasDraft = Boolean(stack || target || features.length > 0 || template);
    return { stack, target, features, template, hasDraft };
  };

  const summarizeRequests = () => {
    const summary = {
      total: requests.length,
      active: 0,
      failed: 0,
      pending: 0,
      latestStatus: "none",
    };

    const sorted = requests
      .slice()
      .sort((a, b) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime());

    sorted.forEach((request) => {
      const status = String(request.status || "submitted").toLowerCase();
      if (status === "active" || status === "partially_active") {
        summary.active += 1;
      } else if (status === "provision_failed") {
        summary.failed += 1;
      } else if (["submitted", "reviewing", "approved", "provisioning"].includes(status)) {
        summary.pending += 1;
      }
    });

    if (sorted[0] && sorted[0].status) {
      summary.latestStatus = String(sorted[0].status).toLowerCase();
    }

    return summary;
  };

  const setPrimaryAction = (label, href) => {
    primaryAction.textContent = label;
    primaryAction.setAttribute("href", href);
  };

  const stageLabel = ({ checks, intake, draft, requiredMissing, requestSummary }) => {
    if (!checks.idea) return "Stage 1: Define the idea";
    if (!checks.content || !checks.features) return "Stage 2: Complete onboarding checklist";
    if (!intake.complete) return "Stage 3: Complete intake details";
    if (!draft.hasDraft || !checks.builder) return "Stage 4: Build app plan";
    if (requiredMissing.length > 0) return "Stage 5: Connect required providers";
    if (requestSummary.total === 0) return "Stage 6: Submit service request";
    if (requestSummary.failed > 0) return "Stage 7: Fix failed provisioning";
    if (requestSummary.pending > 0) return "Stage 8: Provisioning in progress";
    if (!checks.pricing) return "Stage 9: Confirm pricing and support";
    return "Stage 10: Live and operating";
  };

  const render = () => {
    const checks = readChecklist();
    const intake = readIntake();
    const draft = readBuilderDraft();
    const requirements = deriveBuilderRequirements({
      stack: draft.stack,
      features: draft.features,
      target: draft.target,
      providerHealthById,
    });
    const required = requirements.filter((item) => item.required);
    const requiredMissing = required.filter((item) => !item.ready);
    const requiredReady = required.filter((item) => item.ready).length;
    const requestSummary = summarizeRequests();
    const checksDone = Object.values(checks).filter(Boolean).length;
    const checksTotal = Object.keys(checks).length;
    const currentStage = stageLabel({ checks, intake, draft, requiredMissing, requestSummary });
    const latestStatusClass = `status-chip status-${escapeAttribute(String(requestSummary.latestStatus).replaceAll("_", "-"))}`;

    summaryRoot.innerHTML = `
      <h3>${escapeHtml(currentStage)}</h3>
      <ul>
        <li>Checklist: ${checksDone}/${checksTotal}</li>
        <li>Intake form: ${intake.complete ? "Complete" : "Missing fields"}</li>
        <li>App Builder draft: ${draft.hasDraft ? "Detected" : "Not started"}</li>
        <li>Required services ready: ${requiredReady}/${required.length}</li>
        <li>Service requests: ${requestSummary.total} total (${requestSummary.pending} pending, ${requestSummary.failed} failed, ${requestSummary.active} active)</li>
        <li>Latest request status: <span class="${latestStatusClass}">${escapeHtml(String(requestSummary.latestStatus || "none"))}</span></li>
        <li>Projects scaffolded: ${projectCount}</li>
      </ul>
    `;

    if (!draft.hasDraft || requirements.length === 0) {
      requirementsRoot.innerHTML = "<li>Open App Builder and save a draft to see exact required services.</li>";
    } else {
      requirementsRoot.innerHTML = requirements
        .map((item) => {
          const stateClass = item.ready ? "status-active" : item.required ? "status-provision-failed" : "status-provisioning";
          const stateText = item.ready ? "Ready" : item.required ? "Missing" : "Optional";
          return `
            <li class="ai-requirement-item">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-chip ${stateClass}">${escapeHtml(stateText)}</span>
              <p>${escapeHtml(item.reason || "")}</p>
            </li>
          `;
        })
        .join("");
    }

    const actions = [];
    if (!checks.idea) actions.push("Start in Onboarding and define the app idea.");
    if (!checks.content) actions.push("Add logo, colors, and copy in your project planning.");
    if (!checks.features) actions.push("List core features like auth, billing, and reports.");
    if (!intake.complete) actions.push("Complete intake fields in Onboarding.");
    if (!draft.hasDraft || !checks.builder) actions.push("Open App Builder and save a full draft.");
    if (requiredMissing.length > 0) actions.push(`Open Setup Wizard and connect: ${requiredMissing.map((item) => item.title).join(", ")}.`);
    if (requestSummary.total === 0 && draft.hasDraft && requiredMissing.length === 0) {
      actions.push("Open Services, add plans to cart, and submit the first service request.");
    }
    if (requestSummary.failed > 0) actions.push("Open Ops and use Retry Failed after fixing provider keys.");
    if (requestSummary.pending > 0) actions.push("Open Ops and monitor provisioning until requests are active.");
    if (!authState.signedIn && authState.bootstrapRequired) actions.push("In Ops, create the first owner account.");
    if (!authState.signedIn && authState.requiresAdminToken) actions.push("In Ops, sign in or add a legacy admin token to run provisioning actions.");
    if (!checks.pricing) actions.push("Review Pricing and submit Support kickoff ticket.");
    if (actions.length === 0) actions.push("Everything looks ready. Keep monitoring Ops and support users.");

    actionsRoot.innerHTML = actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

    if (!checks.idea || !intake.complete) {
      setPrimaryAction("Continue Onboarding", "onboarding.html");
    } else if (!draft.hasDraft || !checks.builder) {
      setPrimaryAction("Open App Builder", "app-builder.html");
    } else if (requiredMissing.length > 0) {
      setPrimaryAction("Connect Providers", "setup.html");
    } else if (requestSummary.total === 0) {
      setPrimaryAction("Submit Service Request", "services.html");
    } else if (requestSummary.failed > 0 || requestSummary.pending > 0) {
      setPrimaryAction("Run Ops Provisioning", "ops.html");
    } else if (!checks.pricing) {
      setPrimaryAction("Review Pricing", "pricing.html");
    } else {
      setPrimaryAction("Open Projects", "projects.html");
    }

    const steps = [
      {
        title: "Onboarding Checklist",
        detail: `${checksDone}/${checksTotal} complete`,
        href: "onboarding.html",
        ready: checksDone === checksTotal && checksTotal > 0,
        working: checksDone > 0 && checksDone < checksTotal,
      },
      {
        title: "Intake + Launch Plan",
        detail: intake.complete ? "Complete" : "Missing required fields",
        href: "onboarding.html",
        ready: intake.complete,
        working: !intake.complete && Boolean(intake.studentName || intake.studentEmail || intake.projectType || intake.launchGoal || intake.timeline),
      },
      {
        title: "App Builder Draft",
        detail: draft.hasDraft ? "Draft saved" : "Not started",
        href: "app-builder.html",
        ready: draft.hasDraft,
        working: false,
      },
      {
        title: "Provider Setup",
        detail: required.length === 0 ? "Waiting for builder selections" : `${requiredReady}/${required.length} ready`,
        href: "setup.html",
        ready: required.length > 0 && requiredReady === required.length,
        working: requiredReady > 0 && requiredReady < required.length,
      },
      {
        title: "Service Request",
        detail: requestSummary.total > 0 ? `${requestSummary.total} request(s)` : "No requests submitted",
        href: "services.html",
        ready: requestSummary.total > 0,
        working: false,
      },
      {
        title: "Ops Provisioning",
        detail: requestSummary.active > 0 ? `${requestSummary.active} active` : requestSummary.failed > 0 ? `${requestSummary.failed} failed` : "Waiting for active status",
        href: "ops.html",
        ready: requestSummary.active > 0 && requestSummary.failed === 0 && requestSummary.pending === 0,
        working: requestSummary.pending > 0,
      },
    ];

    journeyRoot.innerHTML = steps
      .map((step) => {
        const statusClass = step.ready ? "status-active" : step.working ? "status-provisioning" : "status-provision-failed";
        const statusLabel = step.ready ? "Done" : step.working ? "In Progress" : "Next";
        return `
          <article class="journey-step">
            <div class="journey-step-head">
              <h3>${escapeHtml(step.title)}</h3>
              <span class="status-chip ${statusClass}">${escapeHtml(statusLabel)}</span>
            </div>
            <p>${escapeHtml(step.detail)}</p>
            <a class="btn btn-ghost btn-inline" href="${escapeAttribute(step.href)}">Open</a>
          </article>
        `;
      })
      .join("");
  };

  const loadProviderHealth = async () => {
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Provider health unavailable");
      const providers = Array.isArray(payload.providers) ? payload.providers : [];
      providerHealthById = {};
      providers.forEach((provider) => {
        const id = String(provider.id || "").toLowerCase();
        if (!id) return;
        providerHealthById[id] = Boolean(provider.configured);
      });
    } catch (_error) {
      providerHealthById = {};
    }
  };

  const loadRequests = async () => {
    try {
      const response = await fetch("/api/service-requests");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Requests unavailable");
      requests = Array.isArray(payload.requests) ? payload.requests : [];
    } catch (_error) {
      requests = [];
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Projects unavailable");
      const projects = Array.isArray(payload.projects) ? payload.projects : [];
      projectCount = projects.length;
    } catch (_error) {
      projectCount = 0;
    }
  };

  const loadAuth = async () => {
    authState = {
      signedIn: false,
      username: "",
      role: "",
      bootstrapRequired: false,
      requiresAdminToken: false,
    };

    try {
      const configResponse = await fetch("/api/auth-config");
      const configPayload = await configResponse.json();
      if (configResponse.ok && configPayload.ok) {
        authState.bootstrapRequired = Boolean(configPayload.bootstrapRequired);
        authState.requiresAdminToken = Boolean(configPayload.requiresAdminToken);
      }
    } catch (_error) {
      // Keep defaults.
    }

    try {
      const sessionResponse = await fetch("/api/auth-session", {
        method: "GET",
        headers: buildAdminHeaders(),
      });
      const sessionPayload = await sessionResponse.json();
      if (sessionResponse.ok && sessionPayload.ok && sessionPayload.authenticated && sessionPayload.user) {
        authState.signedIn = true;
        authState.username = String(sessionPayload.user.username || "");
        authState.role = String(sessionPayload.user.role || "");
      }
    } catch (_error) {
      // Keep defaults.
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadProviderHealth(), loadRequests(), loadProjects(), loadAuth()]);
    render();
  };

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await refreshAll();
    });
  }

  document.addEventListener("onboarding:state-changed", render);
  window.addEventListener("storage", render);

  render();
  refreshAll();
}

function initAppBuilder() {
  const form = document.querySelector("#builderForm");
  const output = document.querySelector("#builderOutput");
  const saveDraftBtn = document.querySelector("#saveDraftBtn");
  const submitBtn = form ? form.querySelector("button[type='submit']") : null;
  const aiSummary = document.querySelector("#builderAiSummary");
  const aiRequirementsList = document.querySelector("#builderRequirementsList");
  const aiNextActions = document.querySelector("#builderNextActions");
  const fastForm = document.querySelector("#builderFastForm");
  const fastPromptInput = document.querySelector("#builderFastPrompt");
  const fastOwnerInput = document.querySelector("#builderFastOwner");
  const fastSubmitButton = document.querySelector("#builderFastSubmit");
  const fastClearButton = document.querySelector("#builderFastClear");
  const chatLog = document.querySelector("#builderChatLog");
  const chatThinking = document.querySelector("#builderChatThinking");
  const fastPreviewFrame = document.querySelector("#builderFastPreviewFrame");
  const growthPanel = document.querySelector("#builderGrowthPanel");
  const growthList = document.querySelector("#builderGrowthList");
  const templateFilterButtons = Array.from(document.querySelectorAll("[data-template-filter]"));
  const templateDetail = document.querySelector("#builderTemplateDetail");
  const templatePreview = document.querySelector("#builderTemplatePreview");
  const templateTitle = document.querySelector("#builderTemplateTitle");
  const templateDescription = document.querySelector("#builderTemplateDescription");
  const templateHighlights = document.querySelector("#builderTemplateHighlights");
  const templateViewBtn = document.querySelector("#builderTemplateViewBtn");
  const templateUseBtn = document.querySelector("#builderTemplateUseBtn");
  const templateDemoModal = document.querySelector("#templateDemoModal");
  const templateDemoFrame = document.querySelector("#templateDemoFrame");
  const templateDemoTitle = document.querySelector("#templateDemoTitle");
  const templateDemoClose = document.querySelector("#templateDemoClose");

  if (!form || !output) return;

  const stepButtons = Array.from(document.querySelectorAll("[data-step-target]"));
  const stepPanels = Array.from(document.querySelectorAll("[data-step-panel]"));
  const templateInputs = Array.from(form.querySelectorAll("input[name='appTemplate']"));
  const featureInputs = Array.from(form.querySelectorAll("input[name='appFeature']"));
  const storageKey = "islaapp_builder_draft";
  const fastStorageKey = "islaapp_builder_fast_prompt";
  let providerHealthById = {};
  let activeTemplateName = "";
  const templateCatalog = getTemplateCatalog();

  const templateThumbClassByName = Object.fromEntries(templateCatalog.map((item) => [item.name, item.thumbClass]));
  const templateByName = Object.fromEntries(templateCatalog.map((item) => [item.name, item]));
  const templateMetaByName = Object.fromEntries(
    templateCatalog.map((item) => [
      item.name,
      {
        description: item.longDescription,
        highlights: Array.isArray(item.features) && item.features.length > 0 ? item.features : ["Responsive layout", "Launch-ready baseline", "AI customization flow"],
      },
    ])
  );

  const readFastPromptState = () => parseChecklistState(localStorage.getItem(fastStorageKey));

  const writeFastPromptState = () => {
    if (!(fastPromptInput instanceof HTMLTextAreaElement) || !(fastOwnerInput instanceof HTMLInputElement)) return;
    localStorage.setItem(
      fastStorageKey,
      JSON.stringify({
        prompt: String(fastPromptInput.value || "").trim(),
        owner: String(fastOwnerInput.value || "").trim(),
      })
    );
  };

  const titleWords = (input) =>
    String(input || "")
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  const suggestProjectName = (prompt) => {
    const cleaned = String(prompt || "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return "My AI App";
    const stopWords = new Set(["build", "create", "make", "app", "website", "site", "for", "with", "the", "a", "an", "to", "and"]);
    const words = cleaned
      .split(" ")
      .filter((word) => word.length > 2 && !stopWords.has(word.toLowerCase()))
      .slice(0, 3);
    const base = words.length > 0 ? titleWords(words.join(" ")).join(" ") : "My AI App";
    return base.endsWith("App") ? base : `${base} App`;
  };

  const inferDraftFromPrompt = (prompt, ownerName) => {
    const rawPrompt = String(prompt || "").trim();
    const normalized = rawPrompt.toLowerCase();

    let template = "SaaS Dashboard";
    if (/(marketplace|ecommerce|store|shop|listing|booking)/.test(normalized)) {
      template = "Marketplace";
    } else if (/(community|social|forum|members|group)/.test(normalized)) {
      template = "Community Platform";
    } else if (/(client|portal|agency|crm|internal|service desk)/.test(normalized)) {
      template = "Client Portal";
    }

    const features = [];
    const maybeAddFeature = (feature, pattern) => {
      if (pattern.test(normalized)) features.push(feature);
    };
    maybeAddFeature("User authentication", /(login|log in|sign in|auth|account|user profile|register)/);
    maybeAddFeature("Team collaboration", /(team|workspace|member|collaborat|multi user|organization)/);
    maybeAddFeature("Payments and billing", /(payment|billing|checkout|subscription|invoice|charge)/);
    maybeAddFeature("Notifications", /(notification|email|sms|alert|reminder|message)/);
    maybeAddFeature("Admin dashboard", /(admin|dashboard|manage|management|backoffice|back office)/);
    maybeAddFeature("Analytics reports", /(analytics|report|kpi|insight|metrics|tracking)/);
    if (features.length === 0) {
      features.push("Admin dashboard", "User authentication");
    }

    let stack = "React + Supabase";
    if (/(landing page|portfolio|simple site|static|html css js)/.test(normalized)) {
      stack = "HTML/CSS/JS";
    } else if (/(next\.?js|nextjs)/.test(normalized)) {
      stack = "Next.js + PostgreSQL";
    } else if (/(node api|express|backend api|rest api)/.test(normalized)) {
      stack = "Node API + React Frontend";
    }

    let target = "MVP in 1 month";
    if (/(today|asap|quick|fast|two weeks|2 weeks|prototype|beta)/.test(normalized)) {
      target = "Beta in 2 weeks";
    } else if (/(production|launch|public)/.test(normalized)) {
      target = "Production in 2 months";
    } else if (/(scale|scaling|enterprise|global)/.test(normalized)) {
      target = "Scale in 3+ months";
    }

    return {
      prompt: rawPrompt,
      projectName: suggestProjectName(rawPrompt),
      owner: String(ownerName || "").trim() || "Founder",
      template,
      features,
      stack,
      target,
      signals: {
        team: /(team|workspace|member|organization|staff|company)/.test(normalized),
        enterprise: /(enterprise|compliance|sso|governance|soc 2|hipaa|sla)/.test(normalized),
        highUsage: /(high traffic|scale|many users|thousands|global)/.test(normalized),
      },
    };
  };

  const requestAiBuildDraft = async ({ prompt, owner }) => {
    const localFallback = inferDraftFromPrompt(prompt, owner);
    const templateOptions = templateInputs.map((input) => String(input.value || ""));
    const featureOptions = featureInputs.map((input) => String(input.value || ""));
    const stackOptions = Array.from(form.querySelectorAll("#builderStack option")).map((option) => String(option.value || ""));
    const targetOptions = Array.from(form.querySelectorAll("#builderTarget option")).map((option) => String(option.value || ""));

    const normalizeChoice = (value, options, fallbackValue) => {
      const text = String(value || "").trim();
      if (!text) return fallbackValue;
      const match = options.find((option) => option.toLowerCase() === text.toLowerCase());
      return match || fallbackValue;
    };

    const normalizeFeatures = (values, fallbackValues) => {
      if (!Array.isArray(values)) return fallbackValues;
      const selected = [];
      values.forEach((item) => {
        const text = String(item || "").trim();
        if (!text) return;
        const match = featureOptions.find((option) => option.toLowerCase() === text.toLowerCase());
        if (match && !selected.includes(match)) selected.push(match);
      });
      return selected.length > 0 ? selected : fallbackValues;
    };

    try {
      const response = await fetch("/api/ai-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, owner }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok || !payload.draft || typeof payload.draft !== "object") {
        return {
          ok: false,
          draft: localFallback,
          source: "local",
          note: String(payload && payload.error ? payload.error : "AI endpoint unavailable. Using local fallback."),
        };
      }

      const rawDraft = payload.draft;
      const mergedDraft = {
        ...localFallback,
        projectName: String(rawDraft.projectName || "").trim() || localFallback.projectName,
        owner: String(rawDraft.owner || "").trim() || localFallback.owner,
        template: normalizeChoice(rawDraft.template, templateOptions, localFallback.template),
        features: normalizeFeatures(rawDraft.features, localFallback.features),
        stack: normalizeChoice(rawDraft.stack, stackOptions, localFallback.stack),
        target: normalizeChoice(rawDraft.target, targetOptions, localFallback.target),
        summary: String(rawDraft.summary || "").trim(),
        nextSteps: Array.isArray(rawDraft.nextSteps)
          ? rawDraft.nextSteps.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4)
          : [],
      };

      return {
        ok: true,
        draft: mergedDraft,
        source: String(payload.source || "fallback"),
        note: String(payload.note || "").trim(),
      };
    } catch (_error) {
      return {
        ok: false,
        draft: localFallback,
        source: "local",
        note: "AI endpoint unavailable. Using local fallback.",
      };
    }
  };

  const quickPreviewHtml = (payload) => buildAppPreviewEmbed(payload);

  const buildTemplateDemoHtml = (templateName) => {
    const meta = templateMetaByName[templateName] || {
      description: "Template demo preview ready for customization.",
      highlights: ["Responsive layout", "App shell + pages", "Launch-ready starting point"],
    };
    return quickPreviewHtml({
      projectName: `${templateName} Demo`,
      template: templateName,
      target: "Template demo",
      features: meta.highlights,
      owner: "islaAPP",
    });
  };

  const applyInferredDraftToWizard = (inferred) => {
    const templateMatch = templateInputs.find((input) => input.value === inferred.template);
    if (templateMatch) templateMatch.checked = true;
    featureInputs.forEach((input) => {
      input.checked = inferred.features.includes(input.value);
    });
    setInputValue("#builderProjectName", inferred.projectName);
    setInputValue("#builderOwner", inferred.owner);
    setSelectValue("#builderStack", inferred.stack);
    setSelectValue("#builderTarget", inferred.target);
    updateTemplateUI();
    renderAiGuide();
    setActiveStep(4);
  };

  const scrollChatToBottom = () => {
    if (!(chatLog instanceof HTMLElement)) return;
    chatLog.scrollTop = chatLog.scrollHeight;
  };

  const appendChatMessage = (role, text) => {
    if (!(chatLog instanceof HTMLElement)) return;
    const article = document.createElement("article");
    article.className = `ai-msg ${role === "user" ? "ai-msg-user" : "ai-msg-assistant"}`;
    const paragraph = document.createElement("p");
    paragraph.textContent = String(text || "");
    article.appendChild(paragraph);
    chatLog.appendChild(article);
    scrollChatToBottom();
  };

  const appendChatMessageHtml = (role, htmlContent) => {
    if (!(chatLog instanceof HTMLElement)) return;
    const article = document.createElement("article");
    article.className = `ai-msg ${role === "user" ? "ai-msg-user" : "ai-msg-assistant"}`;
    article.innerHTML = String(htmlContent || "");
    chatLog.appendChild(article);
    scrollChatToBottom();
  };

  const setThinking = (isThinking) => {
    if (!(chatThinking instanceof HTMLElement)) return;
    chatThinking.classList.toggle("hidden", !isThinking);
    if (isThinking) scrollChatToBottom();
  };

  const renderGrowthRecommendations = (inferred) => {
    if (!growthPanel || !growthList) return;
    const requirements = deriveBuilderRequirements({
      stack: inferred.stack,
      features: inferred.features,
      target: inferred.target,
      providerHealthById,
    });
    const missing = requirements.filter((item) => item.required && !item.ready);
    const recommendations = [];

    recommendations.push(
      `AI proved the first build. Next, save this app and continue in <a href="${escapeAttribute("services.html")}">Services</a> when ready.`
    );

    if (Array.isArray(inferred.nextSteps) && inferred.nextSteps.length > 0) {
      inferred.nextSteps.slice(0, 3).forEach((step) => {
        recommendations.push(escapeHtml(String(step)));
      });
    }

    if (missing.length > 0) {
      recommendations.push(
        `Required launch setup detected: ${escapeHtml(missing.map((item) => item.title).join(", "))}. Connect in <a href="${escapeAttribute(
          "setup.html"
        )}">Setup Wizard</a>.`
      );
    }

    if (inferred.signals.enterprise) {
      recommendations.push(
        `Enterprise signal detected (compliance/SSO/governance). Offer <a href="${escapeAttribute(
          "support.html"
        )}">Enterprise contract</a>.`
      );
    } else if (inferred.signals.team || inferred.features.includes("Team collaboration")) {
      recommendations.push(
        `Team workflow detected. Recommend <a href="${escapeAttribute(
          "pricing.html"
        )}">Teams plan</a> for per-user billing and shared controls.`
      );
    } else {
      recommendations.push(
        `For solo builders, start on Free and upgrade to <a href="${escapeAttribute(
          "pricing.html"
        )}">Pro</a> when faster builds and more AI credits are needed.`
      );
    }

    if (inferred.signals.highUsage || inferred.features.length >= 4) {
      recommendations.push(
        `High-usage app detected. Offer credit add-ons from <a href="${escapeAttribute("pricing.html")}">Pricing</a> as usage grows.`
      );
    }

    growthList.innerHTML = recommendations.map((line) => `<li>${line}</li>`).join("");
    growthPanel.classList.remove("hidden");
  };

  const renderFastIdleState = () => {
    if (chatLog instanceof HTMLElement) {
      chatLog.innerHTML = "";
      appendChatMessage(
        "assistant",
        "Tell me what you want to build. I will think, generate the first draft, and then guide your next steps."
      );
    }
    if (fastPreviewFrame instanceof HTMLIFrameElement) {
      fastPreviewFrame.src = "about:blank";
      fastPreviewFrame.srcdoc = "";
    }
    setThinking(false);
    if (growthPanel) growthPanel.classList.add("hidden");
  };

  const inferPreviewUrlFromScaffold = (scaffold, stack) => {
    const pathValue = String(scaffold.projectDir || "");
    if (!pathValue) return "";
    const parts = pathValue.split(/[/\\]/).filter(Boolean);
    const slug = parts.length > 0 ? parts[parts.length - 1] : "";
    if (!slug) return "";
    if (stack === "HTML/CSS/JS") {
      return `/projects/${slug}/index.html`;
    }
    if (stack === "Node API + React Frontend") {
      return `/projects/${slug}/web/index.html`;
    }
    return "";
  };

  const renderAiGuide = () => {
    if (!aiSummary || !aiRequirementsList || !aiNextActions) return;
    const selectedTemplate = form.querySelector("input[name='appTemplate']:checked");
    const selectedFeatures = featureInputs.filter((item) => item.checked).map((item) => item.value);
    const stack = valueOf("#builderStack");
    const target = valueOf("#builderTarget");
    const requirements = deriveBuilderRequirements({
      stack,
      features: selectedFeatures,
      target,
      providerHealthById,
    });
    renderBuilderAiGuide({
      rootSummary: aiSummary,
      rootRequirements: aiRequirementsList,
      rootActions: aiNextActions,
      template: selectedTemplate ? selectedTemplate.value : "",
      stack,
      target,
      requirements,
    });
  };

  const loadProviderHealth = async () => {
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Provider health unavailable");
      const providers = Array.isArray(payload.providers) ? payload.providers : [];
      providerHealthById = {};
      providers.forEach((provider) => {
        const id = String(provider.id || "").trim().toLowerCase();
        if (!id) return;
        providerHealthById[id] = Boolean(provider.configured);
      });
    } catch (_error) {
      providerHealthById = {};
    } finally {
      renderAiGuide();
    }
  };

  const setActiveStep = (step) => {
    stepButtons.forEach((btn) => {
      const isActive = btn.dataset.stepTarget === String(step);
      btn.classList.toggle("is-active", isActive);
    });
    stepPanels.forEach((panel) => {
      const isActive = panel.dataset.stepPanel === String(step);
      panel.classList.toggle("is-active", isActive);
    });
  };

  const updateTemplateUI = () => {
    const cards = Array.from(form.querySelectorAll(".template-card"));
    cards.forEach((card) => {
      const radio = card.querySelector("input[name='appTemplate']");
      card.classList.toggle("is-selected", Boolean(radio && radio.checked));
    });
    const selected = form.querySelector("input[name='appTemplate']:checked");
    renderTemplateDetail(selected ? selected.value : "");
  };

  const renderTemplateDetail = (templateName) => {
    activeTemplateName = String(templateName || "");
    if (!templateDetail || !templatePreview || !templateTitle || !templateDescription || !templateHighlights) return;
    if (!activeTemplateName) {
      templateDetail.classList.add("hidden");
      return;
    }
    const meta = templateMetaByName[activeTemplateName] || {
      description: "Template selected. Review details and customize this build with AI.",
      highlights: ["App structure ready", "Customize features with AI", "Continue to stack setup"],
    };
    const selectedTemplate = templateByName[activeTemplateName] || null;
    const thumbClass = templateThumbClassByName[activeTemplateName] || "template-thumb-saas";
    templatePreview.className = `template-detail-preview ${thumbClass} has-photo`;
    templatePreview.innerHTML = selectedTemplate
      ? renderTemplateImagePicture(selectedTemplate, {
          className: "template-media-picture template-media-picture-large",
          sizes: "(max-width: 980px) 100vw, 56vw",
        })
      : "";
    templateTitle.textContent = activeTemplateName;
    templateDescription.textContent = meta.description;
    templateHighlights.innerHTML = meta.highlights.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    templateDetail.classList.remove("hidden");
  };

  const hydrateBuilderTemplateThumbs = () => {
    const cards = Array.from(form.querySelectorAll(".template-card.template-card-visual"));
    cards.forEach((card) => {
      const input = card.querySelector("input[name='appTemplate']");
      const thumb = card.querySelector(".template-thumb");
      if (!(input instanceof HTMLInputElement) || !(thumb instanceof HTMLElement)) return;
      const template = templateByName[String(input.value || "").trim()];
      if (!template) return;
      thumb.classList.add("has-photo");
      thumb.innerHTML = renderTemplateImagePicture(template, {
        className: "template-media-picture",
        sizes: "(max-width: 980px) 100vw, 28vw",
      });
    });
  };

  const closeTemplateDemo = () => {
    if (!(templateDemoModal instanceof HTMLElement)) return;
    const previewSurface = ensureModalPreviewSurface(templateDemoModal, templateDemoFrame, "templateDemoSurface");
    if (!(previewSurface instanceof HTMLElement)) return;
    templateDemoModal.classList.add("hidden");
    clearPreviewSurface(previewSurface);
    document.body.classList.remove("modal-open");
  };

  const openTemplateDemo = (templateName) => {
    const selectedTemplate = String(templateName || "").trim();
    if (!selectedTemplate) return;
    if (!(templateDemoModal instanceof HTMLElement)) return;
    const previewSurface = ensureModalPreviewSurface(templateDemoModal, templateDemoFrame, "templateDemoSurface");
    if (!(previewSurface instanceof HTMLElement)) return;
    if (templateDemoTitle instanceof HTMLElement) {
      templateDemoTitle.textContent = `${selectedTemplate} Demo`;
    }
    previewSurface.innerHTML = buildTemplateDemoHtml(selectedTemplate);
    templateDemoModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  };

  const applyTemplateFilter = (category) => {
    const normalized = String(category || "all").toLowerCase();
    const cards = Array.from(form.querySelectorAll(".template-card[data-template-category]"));
    cards.forEach((card) => {
      const cardCategory = String(card.getAttribute("data-template-category") || "").toLowerCase();
      const showCard = normalized === "all" || cardCategory === normalized;
      card.classList.toggle("hidden", !showCard);
    });
  };

  stepButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveStep(Number(btn.dataset.stepTarget || "1"));
    });
  });

  templateInputs.forEach((input) => {
    input.addEventListener("change", updateTemplateUI);
    input.addEventListener("change", renderAiGuide);
  });

  if (templateFilterButtons.length > 0) {
    templateFilterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const category = String(button.dataset.templateFilter || "all");
        templateFilterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
        applyTemplateFilter(category);
      });
    });
  }

  if (templateViewBtn instanceof HTMLButtonElement) {
    templateViewBtn.addEventListener("click", () => {
      openTemplateDemo(activeTemplateName);
    });
  }

  if (templateUseBtn instanceof HTMLButtonElement) {
    templateUseBtn.addEventListener("click", () => {
      const selected = form.querySelector("input[name='appTemplate']:checked");
      if (!selected) return;
      setActiveStep(2);
      const featureSection = form.querySelector("[data-step-panel='2']");
      if (featureSection instanceof HTMLElement) {
        featureSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  if (templateDemoClose instanceof HTMLButtonElement) {
    templateDemoClose.addEventListener("click", closeTemplateDemo);
  }

  if (templateDemoModal instanceof HTMLElement) {
    templateDemoModal.addEventListener("click", (event) => {
      if (event.target === templateDemoModal) closeTemplateDemo();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTemplateDemo();
  });

  featureInputs.forEach((input) => {
    input.addEventListener("change", renderAiGuide);
  });

  const stackInput = form.querySelector("#builderStack");
  const targetInput = form.querySelector("#builderTarget");
  if (stackInput) {
    stackInput.addEventListener("change", renderAiGuide);
  }
  if (targetInput) {
    targetInput.addEventListener("change", renderAiGuide);
  }

  const saveDraft = (showSavedMessage) => {
    const selectedTemplate = form.querySelector("input[name='appTemplate']:checked");
    const selectedFeatures = featureInputs.filter((item) => item.checked).map((item) => item.value);

    const draft = {
      template: selectedTemplate ? selectedTemplate.value : "",
      features: selectedFeatures,
      projectName: valueOf("#builderProjectName"),
      owner: valueOf("#builderOwner"),
      stack: valueOf("#builderStack"),
      target: valueOf("#builderTarget"),
    };

    localStorage.setItem(storageKey, JSON.stringify(draft));

    if (showSavedMessage) {
      showStatus(output, "success", "Draft saved", [
        "Your app builder selections were saved in this browser.",
        "You can return later and continue from this draft.",
      ]);
    }
  };

  const savedDraft = parseChecklistState(localStorage.getItem(storageKey));
  if (savedDraft.template) {
    const match = templateInputs.find((input) => input.value === savedDraft.template);
    if (match) match.checked = true;
  }
  if (Array.isArray(savedDraft.features)) {
    featureInputs.forEach((input) => {
      input.checked = savedDraft.features.includes(input.value);
    });
  }
  setInputValue("#builderProjectName", savedDraft.projectName);
  setInputValue("#builderOwner", savedDraft.owner);
  setSelectValue("#builderStack", savedDraft.stack);
  setSelectValue("#builderTarget", savedDraft.target);

  const urlParams = new URLSearchParams(window.location.search);
  const templateFromUrl =
    findTemplateById(urlParams.get("template_id")) ||
    findTemplateByName(urlParams.get("template")) ||
    null;
  const urlFeatures = String(urlParams.get("features") || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  if (templateFromUrl) {
    const templateMatch = templateInputs.find((input) => input.value === templateFromUrl.name);
    if (templateMatch) templateMatch.checked = true;

    if (urlFeatures.length > 0) {
      featureInputs.forEach((input) => {
        input.checked = urlFeatures.includes(input.value);
      });
    } else {
      featureInputs.forEach((input) => {
        input.checked = templateFromUrl.features.includes(input.value);
      });
    }

    setInputValue("#builderProjectName", String(urlParams.get("project") || `${templateFromUrl.name} Build`));
    setInputValue("#builderOwner", String(urlParams.get("owner") || "Founder"));
    setSelectValue("#builderStack", String(urlParams.get("stack") || templateFromUrl.stack));
    setSelectValue("#builderTarget", String(urlParams.get("target") || templateFromUrl.target));
  }

  const savedFast = readFastPromptState();
  if (fastPromptInput instanceof HTMLTextAreaElement && typeof savedFast.prompt === "string") {
    fastPromptInput.value = savedFast.prompt;
  }
  if (fastOwnerInput instanceof HTMLInputElement && typeof savedFast.owner === "string") {
    fastOwnerInput.value = savedFast.owner;
  }

  updateTemplateUI();
  hydrateBuilderTemplateThumbs();
  applyTemplateFilter("all");
  setActiveStep(templateFromUrl ? 2 : 1);
  renderAiGuide();
  loadProviderHealth();
  renderFastIdleState();

  if (templateFromUrl) {
    showStatus(output, "success", "Template loaded", [
      `Template: ${templateFromUrl.name}`,
      "Selections were prefilled from template details.",
      "Adjust anything you want, then generate your project.",
    ]);
  }

  if (templateFromUrl && String(urlParams.get("autoclone") || "") === "1") {
    const autoCloneKey = `islaapp_autoclone_${templateFromUrl.id}`;
    const alreadyRan = sessionStorage.getItem(autoCloneKey) === "1";
    if (!alreadyRan) {
      sessionStorage.setItem(autoCloneKey, "1");
      (async () => {
        const selectedFeatures = featureInputs.filter((item) => item.checked).map((item) => item.value);
        const projectName = valueOf("#builderProjectName");
        const owner = valueOf("#builderOwner");
        const stack = valueOf("#builderStack");
        const target = valueOf("#builderTarget");
        if (!projectName || !owner || !stack || !target || selectedFeatures.length === 0) {
          showStatus(output, "error", "Clone blocked", [
            "Template loaded, but required fields are incomplete.",
            "Complete stack/target/features, then click Generate Brief + Create Project.",
          ]);
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Cloning...";
        }

        const scaffold = await createStarterProject({
          projectName,
          owner,
          template: templateFromUrl.name,
          features: selectedFeatures,
          stack,
          target,
        });

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Generate Brief + Create Project";
        }

        if (scaffold.ok) {
          showStatus(output, "success", "Template cloned", [
            `Template: ${templateFromUrl.name}`,
            `Project folder created: ${String(scaffold.projectDir || "")}`,
            "Open Projects dashboard to review files and preview.",
          ]);
          setActiveStep(4);
        } else {
          showStatus(output, "error", "Template clone failed", [
            `Template: ${templateFromUrl.name}`,
            `Reason: ${String(scaffold.error || "Unknown error")}`,
            "Run python3 dev_server.py and try clone again.",
          ]);
        }
      })();
    }
  }

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", () => {
      saveDraft(true);
    });
  }

  if (fastPromptInput instanceof HTMLTextAreaElement) {
    fastPromptInput.addEventListener("input", writeFastPromptState);
  }
  if (fastOwnerInput instanceof HTMLInputElement) {
    fastOwnerInput.addEventListener("input", writeFastPromptState);
  }

  if (fastClearButton instanceof HTMLButtonElement) {
    fastClearButton.addEventListener("click", () => {
      if (fastPromptInput instanceof HTMLTextAreaElement) fastPromptInput.value = "";
      if (fastOwnerInput instanceof HTMLInputElement) fastOwnerInput.value = "";
      localStorage.removeItem(fastStorageKey);
      renderFastIdleState();
    });
  }

  if (fastForm) {
    fastForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const prompt = valueOf("#builderFastPrompt");
      const ownerName = valueOf("#builderFastOwner");
      if (!prompt) {
        appendChatMessage("assistant", "Please type your app idea first, then click Send To AI.");
        return;
      }

      appendChatMessage("user", prompt);
      if (fastPromptInput instanceof HTMLTextAreaElement) {
        fastPromptInput.value = "";
      }
      writeFastPromptState();
      if (fastSubmitButton instanceof HTMLButtonElement) {
        fastSubmitButton.disabled = true;
        fastSubmitButton.textContent = "Thinking...";
      }
      setThinking(true);

      try {
        await new Promise((resolve) => window.setTimeout(resolve, 850));
        const aiResult = await requestAiBuildDraft({ prompt, owner: ownerName });
        const inferred = aiResult.draft;
        applyInferredDraftToWizard(inferred);
        saveDraft(false);
        renderGrowthRecommendations(inferred);

        if (fastPreviewFrame instanceof HTMLIFrameElement) {
          fastPreviewFrame.src = "about:blank";
          fastPreviewFrame.srcdoc = quickPreviewHtml(inferred);
        }

        appendChatMessageHtml(
          "assistant",
          `
            <p>I built your first draft for <strong>${escapeHtml(inferred.projectName)}</strong>.</p>
            <ul>
              <li>Template: ${escapeHtml(inferred.template)}</li>
              <li>Stack: ${escapeHtml(inferred.stack)}</li>
              <li>Target: ${escapeHtml(inferred.target)}</li>
            </ul>
            <p>Preview is now shown on the right.</p>
            ${
              aiResult.source === "openai"
                ? "<p><strong>AI mode:</strong> OpenAI planning is active.</p>"
                : `<p><strong>AI mode:</strong> Local fallback plan${
                    aiResult.note ? ` (${escapeHtml(aiResult.note)})` : ""
                  }.</p>`
            }
          `
        );

        const scaffold = await createStarterProject({
          projectName: inferred.projectName,
          owner: inferred.owner,
          template: inferred.template,
          features: inferred.features,
          stack: inferred.stack,
          target: inferred.target,
        });

        if (scaffold.ok) {
          const previewUrl = inferPreviewUrlFromScaffold(scaffold, inferred.stack);
          if (previewUrl && fastPreviewFrame instanceof HTMLIFrameElement) {
            fastPreviewFrame.src = previewUrl;
          }
          const projectDir = escapeHtml(String(scaffold.projectDir || ""));
          const previewLink = previewUrl
            ? `<a href="${escapeAttribute(previewUrl)}" target="_blank" rel="noopener noreferrer">open the preview in a new tab</a>`
            : "review the preview on this page";
          appendChatMessageHtml(
            "assistant",
            `
              <p>Proof complete. I also created your project scaffold at <code>${projectDir}</code>.</p>
              <p>You can ${previewLink}.</p>
              <p>Next: follow the AI Next Steps panel below and connect required providers in <a href="${escapeAttribute(
                "setup.html"
              )}">Setup Wizard</a>.</p>
            `
          );
        } else {
          appendChatMessageHtml(
            "assistant",
            `
              <p>Your AI draft and preview are ready, but project scaffolding failed.</p>
              <p>Reason: ${escapeHtml(scaffold.error || "Unknown error")}.</p>
              <p>Run <code>python3 dev_server.py</code> in this project folder, then try again.</p>
            `
          );
        }
      } catch (error) {
        appendChatMessage("assistant", `I hit an error while building the draft: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setThinking(false);
        if (fastSubmitButton instanceof HTMLButtonElement) {
          fastSubmitButton.disabled = false;
          fastSubmitButton.textContent = "Send To AI";
        }
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const template = form.querySelector("input[name='appTemplate']:checked");
    const templateValue = template ? template.value : "AI Guided Build";
    const selectedFeatures = featureInputs.filter((item) => item.checked).map((item) => item.value);
    const projectName = valueOf("#builderProjectName");
    const owner = valueOf("#builderOwner");
    const stack = valueOf("#builderStack");
    const target = valueOf("#builderTarget");

    if (selectedFeatures.length === 0 || !projectName || !owner || !stack || !target) {
      showStatus(output, "error", "Brief not generated", [
        "Select at least one feature and complete all stack details.",
      ]);
      return;
    }

    saveDraft(false);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating...";
    }

    const briefLines = [
      `Project: ${projectName}`,
      `Owner: ${owner}`,
      `Template: ${templateValue}`,
      `Core features: ${selectedFeatures.join(", ")}`,
      `Stack: ${stack}`,
      `Launch target: ${target}`,
    ];

    const scaffold = await createStarterProject({
      projectName,
      owner,
      template: templateValue,
      features: selectedFeatures,
      stack,
      target,
    });

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Generate Brief + Create Project";
    }

    if (scaffold.ok) {
      const successLines = briefLines.concat([
        `Project folder created: ${scaffold.projectDir}`,
        `Files: ${(scaffold.files || []).join(", ")}`,
        "Open Projects dashboard: projects.html",
        "Next action: Confirm pricing and submit support kickoff ticket.",
      ]);
      showStatus(output, "success", "App project brief generated", successLines);
    } else {
      const errorLines = briefLines.concat([
        "Could not create folder automatically.",
        `Reason: ${scaffold.error}`,
        "Run: python3 dev_server.py, then submit again.",
      ]);
      showStatus(output, "error", "Brief generated but project not created", errorLines);
    }

    setActiveStep(4);
  });
}

function deriveBuilderRequirements({ stack, features, target, providerHealthById }) {
  const normalizedStack = String(stack || "").toLowerCase();
  const normalizedTarget = String(target || "").toLowerCase();
  const normalizedFeatures = new Set((Array.isArray(features) ? features : []).map((item) => String(item).toLowerCase()));
  const health = providerHealthById && typeof providerHealthById === "object" ? providerHealthById : {};
  const requirements = new Map();

  const addRequirement = (item) => {
    const id = String(item.id || "");
    if (!id) return;
    const existing = requirements.get(id);
    if (!existing) {
      requirements.set(id, { ...item });
      return;
    }
    existing.required = Boolean(existing.required || item.required);
    if (item.reason && !existing.reason.includes(item.reason)) {
      existing.reason = `${existing.reason}; ${item.reason}`;
    }
    if (!existing.providerId && item.providerId) {
      existing.providerId = item.providerId;
    }
  };

  const providerReady = (providerId) => Boolean(health[String(providerId || "").toLowerCase()]);

  if (normalizedStack) {
    addRequirement({
      id: "hosting",
      title: "Hosting (Render)",
      reason: "Needed to deploy your app so users can open it online.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: "render",
      required: true,
    });
    addRequirement({
      id: "github",
      title: "GitHub Account + Repository",
      reason: "Render deploys from a Git repository.",
      actionLabel: "Create GitHub Account",
      actionHref: "https://github.com/signup",
      providerId: "",
      required: true,
    });
  }

  if (normalizedStack.includes("supabase")) {
    addRequirement({
      id: "database",
      title: "Database (Supabase)",
      reason: "This stack expects Supabase for data and auth services.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: "supabase",
      required: true,
    });
  } else if (normalizedStack.includes("postgresql") || normalizedStack.includes("node api")) {
    addRequirement({
      id: "database",
      title: "Database (Neon or Supabase)",
      reason: "Backend stack needs a production database.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: "neon",
      required: true,
    });
  }

  if (normalizedFeatures.has("user authentication")) {
    addRequirement({
      id: "auth",
      title: "Authentication Provider",
      reason: "User login, signup, and sessions need auth configuration.",
      actionLabel: "Use Supabase Auth",
      actionHref: "setup.html",
      providerId: "supabase",
      required: true,
    });
  }

  if (normalizedFeatures.has("team collaboration") || normalizedFeatures.has("analytics reports")) {
    addRequirement({
      id: "database",
      title: "Database (Neon or Supabase)",
      reason: "Collaboration and analytics features require persistent data storage.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: requirements.has("database") && requirements.get("database").providerId ? requirements.get("database").providerId : "supabase",
      required: true,
    });
  }

  if (normalizedFeatures.has("payments and billing")) {
    addRequirement({
      id: "payments",
      title: "Payment Gateway (Stripe)",
      reason: "Billing features require a payment processor account and API keys.",
      actionLabel: "Open Stripe",
      actionHref: "https://dashboard.stripe.com/register",
      providerId: "",
      required: true,
    });
  }

  if (normalizedFeatures.has("notifications")) {
    addRequirement({
      id: "notifications",
      title: "Email / Notification Service",
      reason: "Notification features require outbound delivery for email or SMS.",
      actionLabel: "Plan Notification Provider",
      actionHref: "support.html",
      providerId: "",
      required: true,
    });
  }

  if (normalizedTarget.includes("mvp") || normalizedTarget.includes("production") || normalizedTarget.includes("scale")) {
    addRequirement({
      id: "domain",
      title: "Domain (Dynadot)",
      reason: "Production launch should use a branded domain.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: "dynadot",
      required: true,
    });
  } else if (normalizedTarget.includes("beta")) {
    addRequirement({
      id: "domain",
      title: "Domain (Dynadot)",
      reason: "Optional for beta. Required before public launch.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: "dynadot",
      required: false,
    });
  }

  const output = Array.from(requirements.values()).map((item) => {
    const ready = item.providerId ? providerReady(item.providerId) : false;
    return { ...item, ready };
  });

  output.sort((a, b) => Number(b.required) - Number(a.required));
  return output;
}

function renderBuilderAiGuide({ rootSummary, rootRequirements, rootActions, template, stack, target, requirements }) {
  const items = Array.isArray(requirements) ? requirements : [];
  const requiredItems = items.filter((item) => item.required);
  const readyRequired = requiredItems.filter((item) => item.ready).length;
  const missingRequired = requiredItems.filter((item) => !item.ready);

  if (!template && !stack && !target && items.length === 0) {
    rootSummary.innerHTML = "<h3>Waiting For Your Selections</h3><ul><li>Select stack and features to get live launch requirements.</li></ul>";
    rootRequirements.innerHTML = "<li>Pick features and stack details to generate service requirements.</li>";
    rootActions.innerHTML = "<li>Complete your selections in the Build Wizard above.</li>";
    return;
  }

  rootSummary.innerHTML = `
    <h3>AI Readiness Summary</h3>
    <ul>
      <li>Template: ${escapeHtml(template || "Not selected yet")}</li>
      <li>Stack: ${escapeHtml(stack || "Not selected yet")}</li>
      <li>Launch target: ${escapeHtml(target || "Not selected yet")}</li>
      <li>Required services ready: ${readyRequired}/${requiredItems.length}</li>
    </ul>
  `;

  if (items.length === 0) {
    rootRequirements.innerHTML = "<li>Select stack and launch target to generate service requirements.</li>";
  } else {
    rootRequirements.innerHTML = items
      .map((item) => {
        const stateClass = item.ready ? "status-active" : item.required ? "status-provision-failed" : "status-provisioning";
        const stateLabel = item.ready ? "Ready" : item.required ? "Missing" : "Optional";
        const link = String(item.actionHref || "").startsWith("http")
          ? `<a class="btn btn-ghost btn-inline" href="${escapeAttribute(item.actionHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.actionLabel || "Open")}</a>`
          : `<a class="btn btn-ghost btn-inline" href="${escapeAttribute(item.actionHref || "#")}">${escapeHtml(item.actionLabel || "Open")}</a>`;
        return `
          <li class="ai-requirement-item">
            <strong>${escapeHtml(item.title)}</strong>
            <span class="status-chip ${stateClass}">${escapeHtml(stateLabel)}</span>
            <p>${escapeHtml(item.reason || "")}</p>
            ${link}
          </li>
        `;
      })
      .join("");
  }

  const actionLines = [];
  actionLines.push("Finalize your app selections (features, stack, and launch target).");
  if (missingRequired.length > 0) {
    const providers = missingRequired.filter((item) => item.providerId).map((item) => item.title);
    if (providers.length > 0) {
      actionLines.push(`Open Setup Wizard and connect: ${providers.join(", ")}.`);
    }
    const external = missingRequired.filter((item) => !item.providerId).map((item) => item.title);
    if (external.length > 0) {
      actionLines.push(`Create required external accounts: ${external.join(", ")}.`);
    }
  } else if (requiredItems.length > 0) {
    actionLines.push("All required services look ready. Continue to Services and provision.");
  }
  actionLines.push("Generate project brief, then open Services to submit provisioning request.");

  rootActions.innerHTML = actionLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
}

async function createStarterProject(payload) {
  try {
    const response = await fetch("/api/create-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const parsed = await response.json();
    if (!response.ok) {
      return { ok: false, error: parsed.error || "Request failed" };
    }

    return {
      ok: true,
      projectDir: parsed.projectDir || "",
      files: Array.isArray(parsed.files) ? parsed.files : [],
      stack: parsed.stack || "",
    };
  } catch (error) {
    return { ok: false, error: "Server unavailable or page is not served from dev_server.py" };
  }
}

async function initProjectsPage() {
  const list = document.querySelector("#projectsList");
  const status = document.querySelector("#projectsStatus");
  const refreshButton = document.querySelector("#projectsRefresh");

  if (!list || !status) return;

  const loadProjects = async () => {
    status.textContent = "Loading projects...";
    list.innerHTML = "";

    try {
      const response = await fetch("/api/projects");
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Failed to load projects");
      }

      const projects = Array.isArray(payload.projects) ? payload.projects : [];
      if (projects.length === 0) {
        status.textContent = "No projects yet. Generate one in App Builder.";
        return;
      }

      status.textContent = `${projects.length} project(s) found`;
      list.innerHTML = projects
        .map((project) => {
          const title = escapeHtml(String(project.projectName || project.slug || "Untitled"));
          const stack = escapeHtml(String(project.stack || "Unknown"));
          const owner = escapeHtml(String(project.owner || "Unknown"));
          const path = escapeHtml(String(project.path || ""));
          const createdAt = escapeHtml(formatIsoDate(String(project.createdAt || "")));
          const previewUrl = String(project.previewUrl || "");
          const previewAction = previewUrl
            ? `<a class="btn btn-ghost btn-inline" href="${escapeAttribute(previewUrl)}" target="_blank" rel="noopener noreferrer">Preview</a>`
            : "";
          return `
            <article class="project-card">
              <h3>${title}</h3>
              <p><strong>Stack:</strong> ${stack}</p>
              <p><strong>Owner:</strong> ${owner}</p>
              <p><strong>Created:</strong> ${createdAt}</p>
              <p><strong>Path:</strong> <code>${path}</code></p>
              ${previewAction}
            </article>
          `;
        })
        .join("");
    } catch (_error) {
      status.textContent = "Projects unavailable. Run python3 dev_server.py and refresh.";
    }
  };

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      loadProjects();
    });
  }

  await loadProjects();
}

async function initOpsPage() {
  const list = document.querySelector("#opsRequestsList");
  const statusNode = document.querySelector("#opsStatus");
  const refreshButton = document.querySelector("#opsRefresh");
  const aiSummary = document.querySelector("#opsAiSummary");
  const aiActions = document.querySelector("#opsAiActions");
  const aiRefreshButton = document.querySelector("#opsAiRefresh");
  const domainInput = document.querySelector("#opsDomainName");
  const regionInput = document.querySelector("#opsRegion");
  const dbPasswordInput = document.querySelector("#opsDbPassword");
  const bootstrapCard = document.querySelector("#opsAuthBootstrapCard");
  const bootstrapForm = document.querySelector("#opsBootstrapForm");
  const loginCard = document.querySelector("#opsAuthLoginCard");
  const loginForm = document.querySelector("#opsLoginForm");
  const logoutButton = document.querySelector("#opsLogoutBtn");
  const authStatus = document.querySelector("#opsAuthStatus");
  const sessionSummary = document.querySelector("#opsSessionSummary");
  const ownerTools = document.querySelector("#opsOwnerTools");
  const createUserForm = document.querySelector("#opsCreateUserForm");
  const createUserStatus = document.querySelector("#opsCreateUserStatus");
  const usersList = document.querySelector("#opsUsersList");
  const tokenInput = document.querySelector("#opsAdminToken");
  const tokenSave = document.querySelector("#opsTokenSave");
  const tokenClear = document.querySelector("#opsTokenClear");
  const tokenStatus = document.querySelector("#opsTokenStatus");

  if (!list || !statusNode) return;

  let authConfig = { bootstrapRequired: false, requiresAdminToken: false };
  let currentUser = null;
  let providerHealthById = {};
  let queueRequests = [];

  const setAuthStatus = (message) => {
    if (authStatus) authStatus.textContent = message;
  };

  const setCreateUserStatus = (message) => {
    if (createUserStatus) createUserStatus.textContent = message;
  };

  const getBuilderDraftState = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_builder_draft"));
    const stack = typeof saved.stack === "string" ? saved.stack : "";
    const target = typeof saved.target === "string" ? saved.target : "";
    const features = Array.isArray(saved.features) ? saved.features : [];
    const hasDraft = Boolean(stack || target || features.length > 0 || saved.template);
    return { stack, target, features, hasDraft };
  };

  const summarizeQueue = () => {
    const summary = {
      total: queueRequests.length,
      active: 0,
      failed: 0,
      pending: 0,
      latestStatus: "none",
    };

    const sorted = queueRequests
      .slice()
      .sort((a, b) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime());

    sorted.forEach((request) => {
      const status = String(request.status || "submitted").toLowerCase();
      if (status === "active" || status === "partially_active") {
        summary.active += 1;
      } else if (status === "provision_failed") {
        summary.failed += 1;
      } else if (["submitted", "reviewing", "approved", "provisioning"].includes(status)) {
        summary.pending += 1;
      }
    });

    if (sorted[0] && sorted[0].status) {
      summary.latestStatus = String(sorted[0].status).toLowerCase();
    }

    return summary;
  };

  const renderOpsAICoach = () => {
    if (!aiSummary || !aiActions) return;

    const draft = getBuilderDraftState();
    const requirements = deriveBuilderRequirements({
      stack: draft.stack,
      features: draft.features,
      target: draft.target,
      providerHealthById,
    });
    const required = requirements.filter((item) => item.required);
    const requiredReady = required.filter((item) => item.ready).length;
    const requiredMissing = required.filter((item) => !item.ready);
    const queue = summarizeQueue();

    const isSignedIn = Boolean(currentUser);
    const role = isSignedIn ? String(currentUser.role || "viewer") : "none";
    const hasLegacyToken = Boolean(getOpsToken());
    const canProvision = role === "owner" || role === "admin" || (!isSignedIn && hasLegacyToken);

    const providerIdsInQueue = new Set();
    queueRequests.forEach((request) => {
      const items = Array.isArray(request.items) ? request.items : [];
      items.forEach((item) => {
        const providerId = String(item.providerId || "").toLowerCase();
        if (providerId) providerIdsInQueue.add(providerId);
      });
    });
    const missingQueueProviders = Array.from(providerIdsInQueue).filter((id) => !providerHealthById[id]);

    const latestStatusClass = `status-chip status-${escapeAttribute(String(queue.latestStatus).replaceAll("_", "-"))}`;
    const authLine = isSignedIn
      ? `Signed in as ${escapeHtml(String(currentUser.username || "user"))} (${escapeHtml(role)}).`
      : authConfig.bootstrapRequired
        ? "Not signed in. Bootstrap is required."
        : authConfig.requiresAdminToken
          ? "Not signed in. Admin token or session is required for ops actions."
          : "Not signed in.";

    aiSummary.innerHTML = `
      <h3>Ops AI Launch Control</h3>
      <ul>
        <li>${authLine}</li>
        <li>Queue: ${queue.total} total, ${queue.pending} pending, ${queue.failed} failed, ${queue.active} active</li>
        <li>Latest queue status: <span class="${latestStatusClass}">${escapeHtml(String(queue.latestStatus || "none"))}</span></li>
        <li>Required launch services ready: ${requiredReady}/${required.length}</li>
      </ul>
    `;

    const actions = [];
    if (authConfig.bootstrapRequired && !isSignedIn) {
      actions.push("Create the first owner account in Bootstrap Owner.");
    } else if (!isSignedIn && authConfig.requiresAdminToken && !hasLegacyToken) {
      actions.push("Sign in or paste a legacy admin token to run provisioning actions.");
    }
    if (!draft.hasDraft) {
      actions.push("Open App Builder and save a draft so AI can verify full launch requirements.");
    }
    if (requiredMissing.length > 0) {
      actions.push(`Open Setup Wizard and connect: ${requiredMissing.map((item) => item.title).join(", ")}.`);
    }
    if (missingQueueProviders.length > 0) {
      actions.push(`Queue references unconfigured providers: ${missingQueueProviders.join(", ")}. Fix these first in Setup Wizard.`);
    }
    if (queue.total === 0) {
      actions.push("No requests in queue. Open Services and submit your first service request.");
    } else if (queue.failed > 0) {
      actions.push("Select failed requests and click Retry Failed after confirming keys in Setup Wizard.");
    }
    if (queue.pending > 0) {
      if (canProvision) {
        actions.push("For pending requests, click Provision Now to run live provider actions.");
      } else {
        actions.push("Pending requests need admin or owner access before you can click Provision Now.");
      }
    }
    if (queue.active > 0 && queue.pending === 0 && queue.failed === 0) {
      actions.push("Queue is healthy. Continue monitoring and support users as they onboard.");
    }
    if (actions.length === 0) {
      actions.push("Ops is ready. Keep monitoring queue updates and provider health.");
    }

    aiActions.innerHTML = actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");
  };

  const renderUsers = (users) => {
    if (!usersList) return;
    if (!Array.isArray(users) || users.length === 0) {
      usersList.innerHTML = "<li>No users yet.</li>";
      return;
    }
    usersList.innerHTML = users
      .map((user) => {
        const username = escapeHtml(String(user.username || ""));
        const role = escapeHtml(String(user.role || "viewer"));
        const createdAt = escapeHtml(formatIsoDate(String(user.createdAt || "")));
        return `<li><strong>${username}</strong> (${role}) - created ${createdAt}</li>`;
      })
      .join("");
  };

  const loadUsers = async () => {
    if (!currentUser || currentUser.role !== "owner") {
      renderUsers([]);
      return;
    }
    try {
      const response = await fetch("/api/auth-users", {
        method: "GET",
        headers: buildAdminHeaders(),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not load users");
      renderUsers(Array.isArray(result.users) ? result.users : []);
    } catch (_error) {
      renderUsers([]);
      setCreateUserStatus("Could not load users.");
    }
  };

  const renderAuthUI = async () => {
    const signedIn = Boolean(currentUser);
    const needsBootstrap = Boolean(authConfig.bootstrapRequired);
    if (bootstrapCard) bootstrapCard.classList.toggle("hidden", !needsBootstrap || signedIn);
    if (loginCard) loginCard.classList.toggle("hidden", needsBootstrap || signedIn);
    if (logoutButton) logoutButton.classList.toggle("hidden", !signedIn);
    if (ownerTools) ownerTools.classList.toggle("hidden", !signedIn || currentUser.role !== "owner");

    if (sessionSummary) {
      if (signedIn) {
        const userName = String(currentUser.username || "unknown");
        const userRole = String(currentUser.role || "viewer");
        const source = String(currentUser.source || "session");
        sessionSummary.textContent = `Signed in as ${userName} (${userRole}) via ${source}.`;
      } else {
        sessionSummary.textContent = "Not signed in.";
      }
    }

    if (signedIn && currentUser.role === "owner") {
      await loadUsers();
    } else {
      renderUsers([]);
    }
  };

  const loadRequests = async () => {
    statusNode.textContent = "Loading request queue...";
    list.innerHTML = "";
    try {
      const response = await fetch("/api/service-requests");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Queue unavailable");
      const requests = Array.isArray(payload.requests) ? payload.requests : [];
      queueRequests = requests;
      if (requests.length === 0) {
        statusNode.textContent = "No requests in queue.";
        renderOpsAICoach();
        return;
      }

      statusNode.textContent = `${requests.length} request(s) in queue`;
      list.innerHTML = requests
        .slice(0, 40)
        .map((request) => {
          const requestId = String(request.requestId || "");
          const currentStatus = String(request.status || "submitted").toLowerCase();
          const statusClass = `status-chip status-${escapeAttribute(currentStatus.replaceAll("_", "-"))}`;
          const items = Array.isArray(request.items)
            ? request.items.map((item) => `${item.providerName}: ${item.planLabel}`).join(", ")
            : "No items";

          const statusOptions = getRequestStatusOptions()
            .map((status) => `<option value="${status}" ${status === currentStatus ? "selected" : ""}>${status}</option>`)
            .join("");

          return `
            <article class="ops-request-card" data-request-id="${escapeAttribute(requestId)}">
              <div class="ops-request-header">
                <h3>${escapeHtml(requestId)}</h3>
                <span class="${statusClass}">${escapeHtml(currentStatus)}</span>
              </div>
              <p><strong>Project:</strong> ${escapeHtml(String(request.projectName || ""))}</p>
              <p><strong>Customer:</strong> ${escapeHtml(String(request.customerName || ""))} (${escapeHtml(String(request.email || ""))})</p>
              <p><strong>Items:</strong> ${escapeHtml(items)}</p>
              <p><strong>Total:</strong> $${Number(request.total || 0).toFixed(2)}</p>
              <p><strong>Updated:</strong> ${escapeHtml(formatIsoDate(String(request.updatedAt || request.createdAt || "")))}</p>
              <div class="ops-actions">
                <label class="form-field">
                  Status
                  <select data-status-select>${statusOptions}</select>
                </label>
                <button class="btn btn-ghost btn-inline" type="button" data-ops-action="set-status">Update Status</button>
                <button class="btn btn-primary btn-inline" type="button" data-ops-action="provision-all">Provision Now</button>
                <button class="btn btn-ghost btn-inline" type="button" data-ops-action="retry-failed">Retry Failed</button>
              </div>
            </article>
          `;
        })
        .join("");
      renderOpsAICoach();
    } catch (_error) {
      queueRequests = [];
      statusNode.textContent = "Queue unavailable. Run python3 dev_server.py.";
      renderOpsAICoach();
    }
  };

  const submitProvision = async (requestId, retryFailed) => {
    const payload = {
      requestId,
      retryFailed,
      domainName: domainInput ? valueOf("#opsDomainName") : "",
      region: regionInput ? valueOf("#opsRegion") : "",
      dbPassword: dbPasswordInput ? valueOf("#opsDbPassword") : "",
    };
    return await provisionServiceRequest(payload);
  };

  const refreshAdminHealth = async () => {
    if (!tokenStatus) return;
    tokenStatus.textContent = "Checking ops authorization...";
    try {
      const response = await fetch("/api/admin-health", {
        method: "GET",
        headers: buildAdminHeaders(),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Health check failed");
      if (result.authorized) {
        const role = String(result.role || "viewer");
        const username = String(result.username || "user");
        tokenStatus.textContent = `Authorized as ${username} (${role}).`;
      } else if (result.requiresAdminToken) {
        tokenStatus.textContent = "Not authorized. Sign in or provide a valid admin token.";
      } else {
        tokenStatus.textContent = "Sign in as admin/owner to run status and provisioning actions.";
      }
    } catch (_error) {
      tokenStatus.textContent = "Admin health unavailable. Run python3 dev_server.py.";
    } finally {
      renderOpsAICoach();
    }
  };

  const loadProviderHealth = async () => {
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Provider health unavailable");
      const providers = Array.isArray(payload.providers) ? payload.providers : [];
      providerHealthById = {};
      providers.forEach((provider) => {
        const id = String(provider.id || "").toLowerCase();
        if (!id) return;
        providerHealthById[id] = Boolean(provider.configured);
      });
    } catch (_error) {
      providerHealthById = {};
    } finally {
      renderOpsAICoach();
    }
  };

  const refreshAuthState = async () => {
    try {
      const configResponse = await fetch("/api/auth-config");
      const configPayload = await configResponse.json();
      if (configResponse.ok && configPayload.ok) {
        authConfig = {
          bootstrapRequired: Boolean(configPayload.bootstrapRequired),
          requiresAdminToken: Boolean(configPayload.requiresAdminToken),
        };
      }
    } catch (_error) {
      // Keep defaults.
    }

    try {
      const sessionResponse = await fetch("/api/auth-session", {
        method: "GET",
        headers: buildAdminHeaders(),
      });
      const sessionPayload = await sessionResponse.json();
      if (sessionResponse.ok && sessionPayload.ok && sessionPayload.authenticated && sessionPayload.user) {
        currentUser = sessionPayload.user;
      } else {
        currentUser = null;
      }
    } catch (_error) {
      currentUser = null;
    }

    await renderAuthUI();
    if (authConfig.bootstrapRequired) {
      setAuthStatus("Bootstrap required. Create the first owner account.");
    } else if (currentUser) {
      setAuthStatus("Session active.");
    } else {
      setAuthStatus("Sign in with username/password or use a legacy admin token.");
    }
    await refreshAdminHealth();
    renderOpsAICoach();
  };

  list.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-ops-action]");
    if (!(button instanceof HTMLButtonElement)) return;
    const card = button.closest("[data-request-id]");
    if (!(card instanceof HTMLElement)) return;
    const requestId = card.dataset.requestId || "";
    const action = button.dataset.opsAction || "";
    if (!requestId) return;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Working...";

    try {
      if (action === "set-status") {
        const select = card.querySelector("[data-status-select]");
        if (!(select instanceof HTMLSelectElement)) throw new Error("Missing status selector");
        const response = await fetch("/api/service-request-status", {
          method: "POST",
          headers: buildAdminHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            requestId,
            status: select.value,
            reason: "ops dashboard update",
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Status update failed");
      } else if (action === "provision-all") {
        await submitProvision(requestId, false);
      } else if (action === "retry-failed") {
        await submitProvision(requestId, true);
      }

      await loadRequests();
    } catch (error) {
      statusNode.textContent = error instanceof Error ? error.message : "Action failed";
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await loadRequests();
      await loadProviderHealth();
    });
  }

  if (aiRefreshButton) {
    aiRefreshButton.addEventListener("click", async () => {
      await loadRequests();
      await loadProviderHealth();
      await refreshAdminHealth();
    });
  }

  if (tokenInput) {
    tokenInput.value = getOpsToken();
  }
  if (tokenSave) {
    tokenSave.addEventListener("click", async () => {
      if (!tokenInput) return;
      setOpsToken(tokenInput.value.trim());
      await refreshAdminHealth();
    });
  }
  if (tokenClear) {
    tokenClear.addEventListener("click", async () => {
      setOpsToken("");
      if (tokenInput) tokenInput.value = "";
      await refreshAdminHealth();
    });
  }

  if (bootstrapForm) {
    bootstrapForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const usernameField = bootstrapForm.querySelector("#opsBootstrapUsername");
      const passwordField = bootstrapForm.querySelector("#opsBootstrapPassword");
      const submitButton = bootstrapForm.querySelector("button[type='submit']");
      const username = usernameField instanceof HTMLInputElement ? usernameField.value.trim() : "";
      const password = passwordField instanceof HTMLInputElement ? passwordField.value : "";

      if (!username || !password) {
        setAuthStatus("Username and password are required.");
        return;
      }

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating...";
      }
      try {
        const response = await fetch("/api/auth-bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Bootstrap failed");
        setOpsSessionToken(String(result.sessionToken || ""));
        currentUser = result.user || null;
        authConfig.bootstrapRequired = false;
        if (usernameField instanceof HTMLInputElement) usernameField.value = "";
        if (passwordField instanceof HTMLInputElement) passwordField.value = "";
        setAuthStatus("Owner account created and signed in.");
        await renderAuthUI();
        await refreshAdminHealth();
      } catch (error) {
        setAuthStatus(error instanceof Error ? error.message : "Bootstrap failed");
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.textContent = "Create Owner + Sign In";
        }
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const usernameField = loginForm.querySelector("#opsLoginUsername");
      const passwordField = loginForm.querySelector("#opsLoginPassword");
      const submitButton = loginForm.querySelector("button[type='submit']");
      const username = usernameField instanceof HTMLInputElement ? usernameField.value.trim() : "";
      const password = passwordField instanceof HTMLInputElement ? passwordField.value : "";

      if (!username || !password) {
        setAuthStatus("Username and password are required.");
        return;
      }

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Signing In...";
      }
      try {
        const response = await fetch("/api/auth-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Login failed");
        setOpsSessionToken(String(result.sessionToken || ""));
        currentUser = result.user || null;
        if (usernameField instanceof HTMLInputElement) usernameField.value = "";
        if (passwordField instanceof HTMLInputElement) passwordField.value = "";
        setAuthStatus("Signed in.");
        await renderAuthUI();
        await refreshAdminHealth();
      } catch (error) {
        setAuthStatus(error instanceof Error ? error.message : "Login failed");
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.textContent = "Sign In";
        }
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      const sessionToken = getOpsSessionToken();
      try {
        await fetch("/api/auth-logout", {
          method: "POST",
          headers: buildAdminHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ sessionToken }),
        });
      } catch (_error) {
        // Ignore logout network issues and clear local state.
      }
      setOpsSessionToken("");
      currentUser = null;
      setAuthStatus("Signed out.");
      await renderAuthUI();
      await refreshAdminHealth();
    });
  }

  if (createUserForm) {
    createUserForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const usernameField = createUserForm.querySelector("#opsCreateUsername");
      const passwordField = createUserForm.querySelector("#opsCreatePassword");
      const roleField = createUserForm.querySelector("#opsCreateRole");
      const submitButton = createUserForm.querySelector("button[type='submit']");

      const username = usernameField instanceof HTMLInputElement ? usernameField.value.trim() : "";
      const password = passwordField instanceof HTMLInputElement ? passwordField.value : "";
      const role = roleField instanceof HTMLSelectElement ? roleField.value : "viewer";

      if (!username || !password) {
        setCreateUserStatus("Username and password are required.");
        return;
      }

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating...";
      }
      try {
        const response = await fetch("/api/auth-users", {
          method: "POST",
          headers: buildAdminHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ username, password, role }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "User creation failed");
        setCreateUserStatus(`User ${username} created as ${role}.`);
        if (usernameField instanceof HTMLInputElement) usernameField.value = "";
        if (passwordField instanceof HTMLInputElement) passwordField.value = "";
        await loadUsers();
      } catch (error) {
        setCreateUserStatus(error instanceof Error ? error.message : "User creation failed");
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.textContent = "Create User";
        }
      }
    });
  }

  await loadRequests();
  await loadProviderHealth();
  await refreshAuthState();
  renderOpsAICoach();
}

async function initServicesPage() {
  const catalogRoot = document.querySelector("#servicesCatalog");
  const cartRoot = document.querySelector("#servicesCartList");
  const totalNode = document.querySelector("#servicesCartTotal");
  const providerHealthRoot = document.querySelector("#providerHealthList");
  const aiSummary = document.querySelector("#servicesAiSummary");
  const aiActions = document.querySelector("#servicesAiActions");
  const aiRefreshButton = document.querySelector("#servicesAiRefresh");
  const form = document.querySelector("#serviceRequestForm");
  const statusNode = document.querySelector("#serviceRequestStatus");
  const requestsRoot = document.querySelector("#serviceRequestsList");
  const requestsStatus = document.querySelector("#serviceRequestsStatus");
  const refreshButton = document.querySelector("#serviceRequestsRefresh");

  if (!catalogRoot || !cartRoot || !totalNode || !form || !statusNode || !requestsRoot || !requestsStatus) return;

  let catalog = null;
  let cart = [];
  let providerHealthById = {};
  let serviceRequests = [];

  const getBuilderDraftState = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_builder_draft"));
    const stack = typeof saved.stack === "string" ? saved.stack : "";
    const target = typeof saved.target === "string" ? saved.target : "";
    const features = Array.isArray(saved.features) ? saved.features : [];
    const hasDraft = Boolean(stack || target || features.length > 0 || saved.template);
    return { stack, target, features, hasDraft };
  };

  const summarizeRequestStates = () => {
    const summary = {
      total: serviceRequests.length,
      active: 0,
      failed: 0,
      pending: 0,
      latestStatus: "none",
    };

    const sorted = serviceRequests
      .slice()
      .sort((a, b) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime());

    sorted.forEach((request) => {
      const status = String(request.status || "submitted").toLowerCase();
      if (status === "active" || status === "partially_active") {
        summary.active += 1;
      } else if (status === "provision_failed") {
        summary.failed += 1;
      } else if (["submitted", "reviewing", "approved", "provisioning"].includes(status)) {
        summary.pending += 1;
      }
    });

    if (sorted[0] && sorted[0].status) {
      summary.latestStatus = String(sorted[0].status).toLowerCase();
    }

    return summary;
  };

  const renderServicesAICoach = () => {
    if (!aiSummary || !aiActions) return;

    const draft = getBuilderDraftState();
    const requirements = deriveBuilderRequirements({
      stack: draft.stack,
      features: draft.features,
      target: draft.target,
      providerHealthById,
    });
    const required = requirements.filter((item) => item.required);
    const requiredReady = required.filter((item) => item.ready).length;
    const requiredMissing = required.filter((item) => !item.ready);
    const queue = summarizeRequestStates();
    const latestStatusClass = `status-chip status-${escapeAttribute(String(queue.latestStatus).replaceAll("_", "-"))}`;

    aiSummary.innerHTML = `
      <h3>AI Service Readiness</h3>
      <ul>
        <li>Selected services in cart: ${cart.length}</li>
        <li>Required launch services ready: ${requiredReady}/${required.length}</li>
        <li>Requests: ${queue.total} total, ${queue.pending} pending, ${queue.failed} failed, ${queue.active} active</li>
        <li>Latest status: <span class="${latestStatusClass}">${escapeHtml(String(queue.latestStatus || "none"))}</span></li>
      </ul>
    `;

    const actions = [];
    if (!draft.hasDraft) {
      actions.push("Open App Builder and save a draft so AI can map required services automatically.");
    }
    if (requiredMissing.length > 0) {
      actions.push(`Open Setup Wizard and connect: ${requiredMissing.map((item) => item.title).join(", ")}.`);
    }
    if (cart.length === 0) {
      actions.push("Select at least one plan from the Provider Catalog.");
    }

    const customerName = valueOf("#serviceCustomerName");
    const email = valueOf("#serviceEmail");
    const projectName = valueOf("#serviceProjectName");
    if (!customerName || !email || !projectName) {
      actions.push("Complete Full Name, Email, and Project Name in Service Request Builder.");
    }

    if (serviceRequests.length === 0) {
      actions.push("Submit your first service request.");
    } else if (queue.failed > 0) {
      actions.push("Open Ops and click Retry Failed after fixing provider keys in Setup Wizard.");
    } else if (queue.pending > 0) {
      actions.push("Open Ops to monitor pending requests and run Provision Now if needed.");
    } else if (queue.active > 0) {
      actions.push("Core services are active. Continue with launch testing and support handoff.");
    }

    if (actions.length === 0) {
      actions.push("Services are ready. Continue scaling by adding additional provider plans as needed.");
    }

    aiActions.innerHTML = actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");
  };

  const renderCart = () => {
    if (cart.length === 0) {
      cartRoot.innerHTML = "<li>No services selected yet.</li>";
      totalNode.textContent = "$0.00";
      renderServicesAICoach();
      return;
    }

    const itemRows = cart
      .map((item, index) => {
        const label = `${item.providerName} - ${item.serviceName} (${item.planLabel}, ${item.billingCycle})`;
        return `
          <li>
            <span>${escapeHtml(label)}</span>
            <div class="cart-item-actions">
              <strong>$${Number(item.price).toFixed(2)}</strong>
              <button type="button" class="btn btn-ghost btn-inline" data-remove-item="${index}">Remove</button>
            </div>
          </li>
        `;
      })
      .join("");

    cartRoot.innerHTML = itemRows;
    const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
    totalNode.textContent = `$${total.toFixed(2)}`;
    renderServicesAICoach();
  };

  const addToCart = (item) => {
    const existing = cart.find(
      (entry) =>
        entry.providerId === item.providerId &&
        entry.serviceId === item.serviceId &&
        entry.planId === item.planId &&
        entry.billingCycle === item.billingCycle
    );
    if (existing) return;
    cart.push(item);
    renderCart();
  };

  const renderCatalog = () => {
    if (!catalog || !Array.isArray(catalog.providers) || catalog.providers.length === 0) {
      catalogRoot.innerHTML = "<p class='muted'>No providers available.</p>";
      return;
    }

    catalogRoot.innerHTML = catalog.providers
      .map((provider) => {
        const services = Array.isArray(provider.services) ? provider.services : [];
        const serviceCards = services
          .map((service) => {
            const plans = Array.isArray(service.plans) ? service.plans : [];
            const planButtons = plans
              .flatMap((plan) => {
                const billing = plan.billing && typeof plan.billing === "object" ? plan.billing : {};
                return Object.entries(billing).map(([cycle, price]) => {
                  const normalizedCycle = String(cycle).toLowerCase();
                  const cycleLabel = normalizedCycle === "monthly" ? "/mo" : normalizedCycle === "yearly" ? "/yr" : `/${normalizedCycle}`;
                  return `
                    <button
                      type="button"
                      class="plan-choice"
                      data-add-service="true"
                      data-provider-id="${escapeAttribute(String(provider.id || ""))}"
                      data-provider-name="${escapeAttribute(String(provider.name || ""))}"
                      data-service-id="${escapeAttribute(String(service.id || ""))}"
                      data-service-name="${escapeAttribute(String(service.name || ""))}"
                      data-plan-id="${escapeAttribute(String(plan.id || ""))}"
                      data-plan-label="${escapeAttribute(String(plan.label || ""))}"
                      data-billing-cycle="${escapeAttribute(normalizedCycle)}"
                      data-price="${escapeAttribute(String(price))}"
                    >
                      <span>${escapeHtml(String(plan.label || ""))}</span>
                      <strong>$${Number(price).toFixed(2)}${escapeHtml(cycleLabel)}</strong>
                    </button>
                  `;
                });
              })
              .join("");

            return `
              <article class="service-block">
                <h3>${escapeHtml(String(service.name || ""))}</h3>
                <p>${escapeHtml(String(service.description || ""))}</p>
                <div class="plan-choice-grid">
                  ${planButtons}
                </div>
              </article>
            `;
          })
          .join("");

        return `
          <section class="provider-card">
            <header>
              <h3>${escapeHtml(String(provider.name || ""))}</h3>
              <span class="provider-type">${escapeHtml(String(provider.category || "service"))}</span>
            </header>
            <p>${escapeHtml(String(provider.description || ""))}</p>
            ${serviceCards}
          </section>
        `;
      })
      .join("");
  };

  const loadCatalog = async () => {
    catalogRoot.innerHTML = "<p class='muted'>Loading provider catalog...</p>";
    try {
      const response = await fetch("/api/providers");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Catalog unavailable");
      catalog = payload.catalog || { providers: [] };
      renderCatalog();
    } catch (_error) {
      catalog = fallbackProviderCatalog();
      renderCatalog();
      const fallbackNote = document.createElement("p");
      fallbackNote.className = "muted";
      fallbackNote.textContent = "Using built-in catalog. Start python3 dev_server.py for live API mode.";
      catalogRoot.prepend(fallbackNote);
    }
  };

  const loadProviderHealth = async () => {
    if (!providerHealthRoot) return;
    providerHealthRoot.innerHTML = "<p class='muted'>Checking provider API configuration...</p>";
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Provider health unavailable");
      const providers = Array.isArray(payload.providers) ? payload.providers : [];
      providerHealthById = {};
      providers.forEach((provider) => {
        const id = String(provider.id || "").toLowerCase();
        if (!id) return;
        providerHealthById[id] = Boolean(provider.configured);
      });
      providerHealthRoot.innerHTML = providers
        .map((provider) => {
          const configured = Boolean(provider.configured);
          const required = Array.isArray(provider.required) ? provider.required.join(", ") : "";
          const note = String(provider.note || "");
          return `
            <div class="provider-health-item ${configured ? "is-ready" : "is-missing"}">
              <strong>${escapeHtml(String(provider.id || "provider"))}</strong>
              <span>${configured ? "Configured" : "Missing keys"}</span>
              <small>${escapeHtml(required)}</small>
              ${note ? `<small>${escapeHtml(note)}</small>` : ""}
            </div>
          `;
        })
        .join("");
    } catch (_error) {
      providerHealthById = {};
      providerHealthRoot.innerHTML =
        "<p class='muted'>Provider health unavailable. Start python3 dev_server.py and set API env keys.</p>";
    } finally {
      renderServicesAICoach();
    }
  };

  const loadRequests = async () => {
    requestsStatus.textContent = "Loading service requests...";
    requestsRoot.innerHTML = "";
    try {
      const response = await fetch("/api/service-requests");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Requests unavailable");
      const requests = Array.isArray(payload.requests) ? payload.requests : [];
      serviceRequests = requests;
      if (requests.length === 0) {
        requestsStatus.textContent = "No service requests yet.";
        renderServicesAICoach();
        return;
      }

      requestsStatus.textContent = `${requests.length} request(s) found`;
      requestsRoot.innerHTML = requests
        .slice(0, 12)
        .map((request) => {
          const items = Array.isArray(request.items)
            ? request.items
                .map((item) => `${item.providerName}: ${item.serviceName} (${item.planLabel}, ${item.billingCycle})`)
                .join(" | ")
            : "No items";
          return `
            <article class="request-card">
              <h3>${escapeHtml(String(request.requestId || "Request"))}</h3>
              <p><strong>Project:</strong> ${escapeHtml(String(request.projectName || ""))}</p>
              <p><strong>Customer:</strong> ${escapeHtml(String(request.customerName || ""))}</p>
              <p><strong>Total:</strong> $${Number(request.total || 0).toFixed(2)}</p>
              <p><strong>Items:</strong> ${escapeHtml(items)}</p>
              <p><strong>Status:</strong> ${escapeHtml(String(request.status || "submitted"))}</p>
              <p><strong>Updated:</strong> ${escapeHtml(formatIsoDate(String(request.updatedAt || request.createdAt || "")))}</p>
            </article>
          `;
        })
        .join("");
      renderServicesAICoach();
    } catch (_error) {
      serviceRequests = [];
      requestsStatus.textContent = "Request history unavailable. Run python3 dev_server.py.";
      renderServicesAICoach();
    }
  };

  catalogRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-add-service='true']");
    if (!(button instanceof HTMLElement)) return;

    addToCart({
      providerId: button.dataset.providerId || "",
      providerName: button.dataset.providerName || "",
      serviceId: button.dataset.serviceId || "",
      serviceName: button.dataset.serviceName || "",
      planId: button.dataset.planId || "",
      planLabel: button.dataset.planLabel || "",
      billingCycle: button.dataset.billingCycle || "",
      price: Number(button.dataset.price || 0),
    });
  });

  cartRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-remove-item]");
    if (!(button instanceof HTMLElement)) return;
    const index = Number(button.dataset.removeItem);
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;
    cart = cart.filter((_, idx) => idx !== index);
    renderCart();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const customerName = valueOf("#serviceCustomerName");
    const email = valueOf("#serviceEmail");
    const projectName = valueOf("#serviceProjectName");
    const domainName = valueOf("#serviceDomainName");
    const region = valueOf("#serviceRegion");
    const dbPassword = valueOf("#serviceDbPassword");
    const notes = valueOf("#serviceNotes");
    const autoProvision = Boolean(document.querySelector("#serviceAutoProvision:checked"));

    if (!customerName || !email || !projectName) {
      showStatus(statusNode, "error", "Request not submitted", ["Complete name, email, and project fields."]);
      return;
    }
    if (cart.length === 0) {
      showStatus(statusNode, "error", "Request not submitted", ["Select at least one external service plan."]);
      return;
    }

    const payload = {
      customerName,
      email,
      projectName,
      notes,
      items: cart.map((item) => ({
        providerId: item.providerId,
        serviceId: item.serviceId,
        planId: item.planId,
        billingCycle: item.billingCycle,
      })),
    };

    try {
      const response = await fetch("/api/service-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Submission failed");

      const request = result.request || {};
      const lines = [
        `Request ID: ${request.requestId || "N/A"}`,
        `Total estimate: $${Number(request.total || 0).toFixed(2)}`,
      ];

      if (autoProvision && request.requestId) {
        const provisionResult = await provisionServiceRequest({
          requestId: String(request.requestId),
          domainName,
          region,
          dbPassword,
        });
        if (provisionResult.ok) {
          const summary = provisionResult.summary || {};
          lines.push(
            `Provisioning complete: ${Number(summary.success || 0)} success, ${Number(summary.failed || 0)} failed`,
            `Final status: ${String((provisionResult.request || {}).status || "unknown")}`
          );
        } else {
          lines.push(`Provisioning failed: ${provisionResult.error || "Unknown error"}`);
        }
      } else {
        lines.push("Provisioning skipped. You can run it later from this dashboard.");
      }

      showStatus(statusNode, "success", "Service request submitted", lines);

      form.reset();
      cart = [];
      renderCart();
      if (providerHealthRoot) await loadProviderHealth();
      await loadRequests();
    } catch (error) {
      showStatus(statusNode, "error", "Request not submitted", [error instanceof Error ? error.message : "Server unavailable"]);
      renderServicesAICoach();
    }
  });

  const trackedFields = Array.from(form.querySelectorAll("input, select, textarea"));
  trackedFields.forEach((field) => {
    field.addEventListener("input", renderServicesAICoach);
    field.addEventListener("change", renderServicesAICoach);
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await loadRequests();
      await loadProviderHealth();
    });
  }

  if (aiRefreshButton) {
    aiRefreshButton.addEventListener("click", async () => {
      await loadProviderHealth();
      await loadRequests();
    });
  }

  renderCart();
  renderServicesAICoach();
  await loadCatalog();
  await loadProviderHealth();
  await loadRequests();
}

async function initProviderSetupPage() {
  const form = document.querySelector("#providerSetupForm");
  const statusNode = document.querySelector("#providerSetupStatus");
  const savedKeysRoot = document.querySelector("#providerSetupSavedKeys");
  const healthRoot = document.querySelector("#providerSetupHealth");
  const refreshButton = document.querySelector("#providerSetupTest");

  if (!form || !statusNode || !savedKeysRoot || !healthRoot) return;

  const fieldMap = {
    RENDER_API_KEY: "#setupRenderApiKey",
    RENDER_SERVICE_REPO: "#setupRenderRepo",
    RENDER_OWNER_ID: "#setupRenderOwnerId",
    DYNADOT_API_KEY: "#setupDynadotApiKey",
    DYNADOT_AUTO_REGISTER: "#setupDynadotAutoRegister",
    DYNADOT_REGISTRATION_YEARS: "#setupDynadotYears",
    SUPABASE_ACCESS_TOKEN: "#setupSupabaseAccessToken",
    SUPABASE_ORG_ID: "#setupSupabaseOrgId",
    SUPABASE_DB_PASS: "#setupSupabaseDbPass",
    NEON_API_KEY: "#setupNeonApiKey",
    OPENAI_API_KEY: "#setupOpenaiApiKey",
    OPENAI_MODEL: "#setupOpenaiModel",
    DEFAULT_REGION: "#setupDefaultRegion",
    DEFAULT_DB_PASSWORD: "#setupDefaultDbPassword",
  };

  const fieldLabels = {
    RENDER_API_KEY: "Render API Key",
    RENDER_SERVICE_REPO: "Render Repo URL",
    RENDER_OWNER_ID: "Render Owner ID",
    DYNADOT_API_KEY: "Dynadot API Key",
    DYNADOT_AUTO_REGISTER: "Dynadot Auto Register",
    DYNADOT_REGISTRATION_YEARS: "Dynadot Registration Years",
    SUPABASE_ACCESS_TOKEN: "Supabase Access Token",
    SUPABASE_ORG_ID: "Supabase Org ID",
    SUPABASE_DB_PASS: "Supabase DB Password",
    NEON_API_KEY: "Neon API Key",
    OPENAI_API_KEY: "OpenAI API Key",
    OPENAI_MODEL: "OpenAI Model",
    DEFAULT_REGION: "Default Region",
    DEFAULT_DB_PASSWORD: "Default DB Password",
  };

  const collectValues = () => {
    const values = {};
    Object.entries(fieldMap).forEach(([key, selector]) => {
      const input = document.querySelector(selector);
      if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement)) {
        return;
      }
      values[key] = String(input.value || "").trim();
    });
    return values;
  };

  const renderSavedKeys = (savedKeys, maskedValues) => {
    const keys = Array.isArray(savedKeys) ? savedKeys : [];
    if (keys.length === 0) {
      savedKeysRoot.innerHTML = "<li>No provider keys saved yet.</li>";
      return;
    }
    savedKeysRoot.innerHTML = keys
      .map((key) => {
        const label = fieldLabels[key] || key;
        const masked = maskedValues && maskedValues[key] ? ` (${maskedValues[key]})` : "";
        return `<li><strong>${escapeHtml(label)}</strong>${escapeHtml(masked)}</li>`;
      })
      .join("");
  };

  const renderHealth = (providers) => {
    const items = Array.isArray(providers) ? providers : [];
    if (items.length === 0) {
      healthRoot.innerHTML = "<p class='muted'>Health check not available.</p>";
      return;
    }
    healthRoot.innerHTML = items
      .map((provider) => {
        const isReady = Boolean(provider.configured);
        const className = `provider-health-item ${isReady ? "is-ready" : "is-missing"}`;
        const required = Array.isArray(provider.required) ? provider.required.join(", ") : "";
        const note = provider.note ? `<small>${escapeHtml(String(provider.note))}</small>` : "";
        return `
          <article class="${className}">
            <span>${escapeHtml(String(provider.id || "").toUpperCase())}</span>
            <small>${isReady ? "Connected" : "Missing setup values"}</small>
            <small>Required: ${escapeHtml(required)}</small>
            ${note}
          </article>
        `;
      })
      .join("");
  };

  const refreshHealth = async () => {
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Health check failed");
      renderHealth(payload.providers);
    } catch (_error) {
      renderHealth([]);
    }
  };

  const loadSavedConfig = async () => {
    try {
      const response = await fetch("/api/provider-config", {
        method: "GET",
        headers: buildAdminHeaders(),
      });
      const payload = await response.json();
      if (response.status === 401 || response.status === 403) {
        showStatus(statusNode, "error", "Sign in required", [
          "Open Ops page and sign in as admin or owner first.",
          "Then return here to save provider settings.",
        ]);
        renderSavedKeys([], {});
        return;
      }
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Failed to load saved settings");
      renderSavedKeys(payload.savedKeys, payload.values);
    } catch (_error) {
      renderSavedKeys([], {});
      showStatus(statusNode, "error", "Settings unavailable", ["Could not load saved provider settings."]);
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }

    try {
      const response = await fetch("/api/provider-config", {
        method: "POST",
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ values: collectValues() }),
      });
      const payload = await response.json();
      if (response.status === 401 || response.status === 403) {
        showStatus(statusNode, "error", "Sign in required", [
          "Open Ops page and sign in as admin or owner first.",
          "Then retry saving provider settings.",
        ]);
        return;
      }
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Save failed");

      renderSavedKeys(payload.savedKeys, payload.values);
      showStatus(statusNode, "success", "Provider settings saved", [
        "Your provider keys are stored in this local workspace.",
        "Use Test Connections to confirm all providers are ready.",
      ]);
      await refreshHealth();
    } catch (error) {
      showStatus(statusNode, "error", "Could not save settings", [
        error instanceof Error ? error.message : "Unknown save error.",
      ]);
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Provider Settings";
      }
    }
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await refreshHealth();
      showStatus(statusNode, "success", "Connection test complete", [
        "Review each provider card below to confirm connected status.",
      ]);
    });
  }

  await loadSavedConfig();
  await refreshHealth();
}

async function provisionServiceRequest(payload) {
  try {
    const response = await fetch("/api/provision-request", {
      method: "POST",
      headers: buildAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      return { ok: false, error: result.error || "Provisioning request failed" };
    }
    return { ok: true, request: result.request || {}, summary: result.summary || {} };
  } catch (_error) {
    return { ok: false, error: "Provisioning endpoint unavailable" };
  }
}

function fallbackProviderCatalog() {
  return {
    currency: "USD",
    providers: [
      {
        id: "render",
        name: "Render",
        category: "hosting",
        description: "Managed hosting for web services and APIs.",
        services: [
          {
            id: "managed-web-hosting",
            name: "Managed Web Hosting",
            description: "Deploy frontend and backend apps with managed infrastructure.",
            plans: [
              { id: "starter", label: "Starter", billing: { monthly: 7 } },
              { id: "pro", label: "Pro", billing: { monthly: 25 } },
              { id: "team", label: "Team", billing: { monthly: 85 } },
            ],
          },
        ],
      },
      {
        id: "dynadot",
        name: "Dynadot",
        category: "domain",
        description: "Domain registration and DNS management with API access.",
        services: [
          {
            id: "domain-registration",
            name: "Domain Registration",
            description: "Register and connect a domain with DNS controls.",
            plans: [
              { id: "dot-com", label: "Single Domain", billing: { yearly: 14 } },
              { id: "dot-net", label: "Business Domain", billing: { yearly: 16 } },
              { id: "dot-org", label: "Organization Domain", billing: { yearly: 13 } },
            ],
          },
        ],
      },
      {
        id: "supabase",
        name: "Supabase",
        category: "database",
        description: "Postgres database, auth, and storage backend.",
        services: [
          {
            id: "managed-postgres",
            name: "Managed Postgres",
            description: "Hosted Postgres with auth and API helpers.",
            plans: [
              { id: "free", label: "Free", billing: { monthly: 0 } },
              { id: "pro", label: "Pro", billing: { monthly: 25 } },
              { id: "team", label: "Team", billing: { monthly: 99 } },
            ],
          },
        ],
      },
      {
        id: "neon",
        name: "Neon",
        category: "database",
        description: "Serverless PostgreSQL for production apps.",
        services: [
          {
            id: "serverless-postgres",
            name: "Serverless PostgreSQL",
            description: "Auto-scaling Postgres with branching workflows.",
            plans: [
              { id: "launch", label: "Launch", billing: { monthly: 19 } },
              { id: "scale", label: "Scale", billing: { monthly: 69 } },
            ],
          },
        ],
      },
    ],
  };
}

function initPricing() {
  const toggleButtons = Array.from(document.querySelectorAll("[data-billing]"));
  const planCards = Array.from(document.querySelectorAll("[data-plan]"));
  const hint = document.querySelector("#billingHint");

  if (toggleButtons.length > 0 && planCards.length > 0) {
    let activeBilling = "monthly";

    toggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeBilling = button.dataset.billing === "yearly" ? "yearly" : "monthly";
        toggleButtons.forEach((btn) => btn.classList.toggle("is-active", btn === button));
        updatePlanCardPrices(planCards, activeBilling);
        if (hint) {
          hint.textContent =
            activeBilling === "yearly"
              ? "Yearly billing selected. Paid plans are discounted."
              : "Monthly billing selected. Switch to yearly to lower recurring cost.";
        }
      });
    });

    updatePlanCardPrices(planCards, activeBilling);
  }

  const seatInput = document.querySelector("#calcSeats");
  const seatLabel = document.querySelector("#seatCountLabel");
  const planSelect = document.querySelector("#calcPlan");
  const creditsSelect = document.querySelector("#calcCredits");
  const billingSelect = document.querySelector("#calcBilling");
  const result = document.querySelector("#calcResult");

  if (!seatInput || !seatLabel || !planSelect || !creditsSelect || !billingSelect || !result) return;

  const recalc = () => {
    const seats = Number(seatInput.value);
    const plan = planSelect.value;
    const credits = Number(creditsSelect.value);
    const billing = billingSelect.value;
    const isYearly = billing === "yearly";
    const creditCostByPack = { 0: 0, 500: 20, 2000: 70, 10000: 300 };
    const creditCost = creditCostByPack[credits] || 0;

    seatLabel.textContent = String(seats);

    if (plan === "enterprise") {
      result.textContent = `Enterprise is custom. Add-on credits estimate: $${creditCost}/month + contract pricing`;
      return;
    }

    let monthlyTotal = 0;
    if (plan === "free") {
      monthlyTotal = creditCost;
    } else if (plan === "starter") {
      monthlyTotal = (isYearly ? 16 : 20) + creditCost;
    } else if (plan === "builder") {
      monthlyTotal = (isYearly ? 32 : 40) + creditCost;
    } else if (plan === "pro") {
      const proBase = isYearly ? 64 : 80;
      const extraSeats = Math.max(0, seats - 1);
      monthlyTotal = proBase + extraSeats * proBase + creditCost;
    } else if (plan === "elite") {
      const eliteBase = isYearly ? 128 : 160;
      const extraSeats = Math.max(0, seats - 1);
      monthlyTotal = eliteBase + extraSeats * eliteBase + creditCost;
    }

    result.textContent = isYearly
      ? `$${Math.round(monthlyTotal)}/month estimated total (billed yearly)`
      : `$${Math.round(monthlyTotal)}/month estimated total`;
  };

  seatInput.addEventListener("input", recalc);
  planSelect.addEventListener("change", recalc);
  creditsSelect.addEventListener("change", recalc);
  billingSelect.addEventListener("change", recalc);
  recalc();
}

function updatePlanCardPrices(planCards, billing) {
  planCards.forEach((card) => {
    const monthly = Number(card.dataset.priceMonthly || 0);
    const yearly = Number(card.dataset.priceYearly || 0);
    const priceNode = card.querySelector("[data-price]");
    const cycleNode = card.querySelector("[data-cycle]");

    if (!priceNode || !cycleNode) return;

    const cycleMonthly = String(card.dataset.cycleMonthly || "/mo");
    const cycleYearly = String(card.dataset.cycleYearly || "/mo (yearly)");

    if (billing === "yearly") {
      priceNode.textContent = String(yearly);
      cycleNode.textContent = cycleYearly;
    } else {
      priceNode.textContent = String(monthly);
      cycleNode.textContent = cycleMonthly;
    }
  });
}

function initSupportForm() {
  const form = document.querySelector("#supportForm");
  const status = document.querySelector("#supportStatus");

  if (!form || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = valueOf("#supportEmail");
    const message = valueOf("#supportMessage");
    const urgency = valueOf("#supportUrgency");
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!form.checkValidity() || !validEmail || message.length < 25) {
      showStatus(status, "error", "Support request not submitted", [
        "Complete all required fields.",
        "Use a valid email and include at least 25 characters in your message.",
      ]);
      return;
    }

    const ticketId = createTicketId();
    const responseWindow =
      urgency === "high" ? "within 4 business hours" : urgency === "normal" ? "within 1 business day" : "within 2 business days";

    showStatus(status, "success", "Support ticket submitted", [
      `Ticket ID: ${ticketId}`,
      `Expected first response: ${responseWindow}`,
      "A copy of this request will be sent to your email.",
    ]);

    form.reset();
  });
}

function createTicketId() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `IA-${stamp}-${random}`;
}

function showStatus(container, type, title, lines) {
  const listItems = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  container.classList.remove("hidden", "success", "error");
  container.classList.add(type === "error" ? "error" : "success");
  container.innerHTML = `<h3>${escapeHtml(title)}</h3><ul>${listItems}</ul>`;
}

function valueOf(selector) {
  const node = document.querySelector(selector);
  return node ? String(node.value || "").trim() : "";
}

function setInputValue(selector, value) {
  const node = document.querySelector(selector);
  if (!node || typeof value !== "string") return;
  node.value = value;
}

function setSelectValue(selector, value) {
  const node = document.querySelector(selector);
  if (!node || typeof value !== "string") return;
  const options = Array.from(node.options || []);
  const hasValue = options.some((option) => option.value === value || option.text === value);
  if (hasValue) {
    node.value = value;
  }
}

function formatIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function formatCompactNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return "0";
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(numericValue);
}

function resolveTemplateLiveUrl(pathValue) {
  const raw = String(pathValue || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    return new URL(raw, window.location.href).href;
  } catch (_error) {
    return raw;
  }
}

function getRequestStatusOptions() {
  return [
    "submitted",
    "reviewing",
    "approved",
    "provisioning",
    "active",
    "partially_active",
    "provision_failed",
    "on_hold",
    "cancelled",
  ];
}

function escapeHtml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(input) {
  return input.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function getOpsToken() {
  try {
    return String(localStorage.getItem(OPS_TOKEN_KEY) || "");
  } catch (_error) {
    return "";
  }
}

function getOpsSessionToken() {
  try {
    return String(localStorage.getItem(OPS_SESSION_TOKEN_KEY) || "");
  } catch (_error) {
    return "";
  }
}

function setOpsToken(token) {
  try {
    if (!token) {
      localStorage.removeItem(OPS_TOKEN_KEY);
    } else {
      localStorage.setItem(OPS_TOKEN_KEY, token);
    }
  } catch (_error) {
    // Ignore storage limitations.
  }
}

function setOpsSessionToken(token) {
  try {
    if (!token) {
      localStorage.removeItem(OPS_SESSION_TOKEN_KEY);
    } else {
      localStorage.setItem(OPS_SESSION_TOKEN_KEY, token);
    }
  } catch (_error) {
    // Ignore storage limitations.
  }
}

function buildAdminHeaders(baseHeaders = {}) {
  const headers = { ...baseHeaders };
  const token = getOpsToken();
  if (token) {
    headers["X-Admin-Token"] = token;
  }
  const sessionToken = getOpsSessionToken();
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
    return headers;
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
