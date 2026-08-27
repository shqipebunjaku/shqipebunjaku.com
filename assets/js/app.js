import DOMPurify from "dompurify";
import { supabase, isSupabaseConfigured } from "./supabase.js";

const routes = {
  "/": "home",
  "/about-me": "about",
  "/resume": "resume",
  "/testimonials": "testimonials",
  "/writings": "writings",
  "/certifications": "certifications",
  "/contact": "contact",
  "/privacy-policy": "privacy",
  "/terms-and-conditions": "terms",
  "/cookies-policy": "cookies",
};

const pageTitles = {
  home: "Shqipe Bunjaku",
  about: "About Me | Shqipe Bunjaku",
  resume: "Resume | Shqipe Bunjaku",
  testimonials: "Testimonials | Shqipe Bunjaku",
  writings: "My Writings | Shqipe Bunjaku",
  certifications: "Certifications | Shqipe Bunjaku",
  contact: "Contact | Shqipe Bunjaku",
  privacy: "Privacy Policy | Shqipe Bunjaku",
  terms: "Terms & Conditions | Shqipe Bunjaku",
  cookies: "Cookie Policy | Shqipe Bunjaku",
};

let current = null;
let postsLoaded = false;
let latestPostsLoaded = false;

const footerMarkup = `<div class="footer-inner">
  <span class="footer-copy">&copy; 2026 Shqipe Bunjaku. All rights reserved.</span>
  <div class="footer-links" role="navigation" aria-label="Legal and privacy links">
    <a href="/privacy-policy">Privacy</a>
    <a href="/terms-and-conditions">Terms</a>
    <a href="/cookies-policy">Cookies</a>
    <button class="cookie-settings-trigger" type="button">Cookie settings</button>
  </div>
</div>`;

function ensureSiteFooters() {
  document.querySelectorAll(".page").forEach((page) => {
    let footer = page.querySelector(":scope > footer");
    if (!footer) {
      footer = document.createElement("footer");
      page.append(footer);
    }
    footer.innerHTML = footerMarkup;
  });
}

function applyTheme(preference) {
  const resolved = preference === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = resolved;
  document.querySelectorAll("[data-theme-select]").forEach((select) => {
    select.value = preference;
  });
}

function initializeTheme() {
  const saved = localStorage.getItem("sb-theme") || "system";
  applyTheme(saved);
  document.querySelectorAll("[data-theme-select]").forEach((select) => {
    select.addEventListener("change", () => {
      localStorage.setItem("sb-theme", select.value);
      applyTheme(select.value);
    });
  });
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if ((localStorage.getItem("sb-theme") || "system") === "system") applyTheme("system");
  });
}

function initializeCookieConsent() {
  const banner = document.getElementById("cookieBanner");
  if (!localStorage.getItem("sb-cookie-consent")) banner.hidden = false;

  document.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-cookie-choice]");
    if (choice) {
      localStorage.setItem("sb-cookie-consent", choice.dataset.cookieChoice);
      banner.hidden = true;
      return;
    }
    if (event.target.closest(".cookie-settings-trigger")) banner.hidden = false;
  });
}

function loadCalendly() {
  const shell = document.getElementById("calendlyFrameShell");
  if (!shell || shell.querySelector("iframe")) return;
  const iframe = document.createElement("iframe");
  iframe.src = "https://calendly.com/shqipeebunjakuu/30min?embed_domain=shqipebunjaku.com&embed_type=Inline";
  iframe.title = "Schedule a 30-minute meeting with Shqipe Bunjaku";
  iframe.loading = "lazy";
  iframe.allow = "payment";
  shell.replaceChildren(iframe);
}

function normalizePath(pathname) {
  if (pathname.length > 1) return pathname.replace(/\/$/, "");
  return pathname;
}

function routeFromPath(pathname) {
  const path = normalizePath(pathname);
  if (path.startsWith("/writings/") && path.split("/").filter(Boolean).length === 2) {
    return { page: "article", slug: decodeURIComponent(path.split("/").pop()) };
  }
  return { page: routes[path] || "home" };
}

function toggleMenu() {
  document.getElementById("mobNav")?.classList.toggle("open");
}

function closeMenu() {
  document.getElementById("mobNav")?.classList.remove("open");
}

function showPage(page) {
  const next = document.getElementById(`page-${page}`);
  if (!next) return;

  document.querySelectorAll(".page").forEach((element) => {
    element.classList.toggle("active", element === next);
    if (element !== next) element.classList.remove("exit");
  });
  next.scrollTop = 0;
  current = page;
  if (pageTitles[page]) document.title = pageTitles[page];

  document.querySelectorAll("[data-page]").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });

  if (page === "home") loadLatestPosts();
  if (page === "writings") loadPosts();
  if (page === "contact") loadCalendly();
}

async function navigate(pathname, { replace = false } = {}) {
  const path = normalizePath(pathname);
  const route = routeFromPath(path);

  if (replace) window.history.replaceState({}, "", path);
  else if (window.location.pathname !== path) window.history.pushState({}, "", path);

  showPage(route.page);
  closeMenu();

  if (route.page === "article") await loadArticle(route.slug);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function escapeHtml(value = "") {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function postCard(post, extraClass = "") {
  const tags = Array.isArray(post.tags) ? post.tags.join(" · ") : "Article";
  const cover = post.cover_image_url
    ? `<div class="writing-thumb"><img src="${escapeHtml(post.cover_image_url)}" alt="" loading="lazy"></div>`
    : `<div class="writing-thumb writing-thumb-placeholder"><img src="/assets/images/sb-monogram.svg" alt="" loading="lazy"></div>`;

  return `<a href="/writings/${encodeURIComponent(post.slug)}" class="writing-card writing-card-db ${extraClass}">
    ${cover}
    <div class="writing-card-copy">
      <div class="w-tag">${escapeHtml(tags)} · ${formatDate(post.published_at || post.created_at)}</div>
      <div class="w-title">${escapeHtml(post.title)}</div>
      <p class="w-excerpt">${escapeHtml(post.excerpt || "")}</p>
      <span class="writing-read">Read article &rarr;</span>
    </div>
  </a>`;
}

async function loadLatestPosts() {
  if (latestPostsLoaded) return;
  const grid = document.getElementById("latestWritingsGrid");
  const loading = document.getElementById("latestWritingsLoading");
  if (!grid) return;

  if (!isSupabaseConfigured) {
    if (loading) loading.textContent = "Latest writings will appear here once Supabase is connected.";
    return;
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id,title,slug,excerpt,cover_image_url,tags,published_at,created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(3);

  loading?.remove();
  if (error) {
    console.error("Unable to load latest writings", error);
    grid.innerHTML = `<p class="latest-empty">Latest writings are temporarily unavailable.</p>`;
    return;
  }

  grid.innerHTML = data?.length
    ? data.map((post) => postCard(post, "latest-writing-card")).join("")
    : `<p class="latest-empty">New writing is coming soon.</p>`;
  latestPostsLoaded = true;
}

async function loadPosts() {
  if (postsLoaded) return;
  const grid = document.getElementById("writingsGrid");
  const loading = document.getElementById("writingsLoading");
  if (!grid) return;

  if (!isSupabaseConfigured) {
    loading?.remove();
    return;
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id,title,slug,excerpt,cover_image_url,tags,published_at,created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  loading?.remove();
  if (error) {
    console.error("Unable to load writings", error);
    return;
  }

  if (data?.length) grid.insertAdjacentHTML("afterbegin", data.map(postCard).join(""));
  postsLoaded = true;
}

async function loadArticle(slug) {
  const container = document.getElementById("articleContent");
  if (!container) return;

  if (!isSupabaseConfigured) {
    container.innerHTML = `<a class="article-back" href="/writings">&larr; Back to writings</a>
      <div class="article-message"><h1>Supabase is not configured</h1><p>Add the public project variables to load this article.</p></div>`;
    return;
  }

  container.innerHTML = `<a class="article-back" href="/writings">&larr; Back to writings</a><div class="writing-loading">Loading article&hellip;</div>`;
  const { data: post, error } = await supabase
    .from("posts")
    .select("title,excerpt,content,cover_image_url,tags,published_at,created_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !post) {
    container.innerHTML = `<a class="article-back" href="/writings">&larr; Back to writings</a>
      <div class="article-message"><h1>Article not found</h1><p>This writing may have moved or is not published yet.</p></div>`;
    return;
  }

  document.title = `${post.title} | Shqipe Bunjaku`;
  const tags = Array.isArray(post.tags) ? post.tags.join(" · ") : "Writing";
  const cover = post.cover_image_url
    ? `<img class="article-cover" src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}">`
    : "";

  container.innerHTML = `<a class="article-back" href="/writings">&larr; Back to writings</a>
    <header class="article-header">
      <div class="page-eyebrow">${escapeHtml(tags)}</div>
      <h1>${escapeHtml(post.title)}</h1>
      <p>${escapeHtml(post.excerpt || "")}</p>
      <time>${formatDate(post.published_at || post.created_at)}</time>
    </header>
    ${cover}
    <div class="article-body">${DOMPurify.sanitize(post.content || "")}</div>`;
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || link.target === "_blank" || link.origin !== window.location.origin) return;
  if (link.pathname.startsWith("/admin")) return;
  event.preventDefault();
  navigate(link.pathname);
});

window.addEventListener("popstate", () => navigate(window.location.pathname, { replace: true }));
Object.assign(window, { toggleMenu, closeMenu });

ensureSiteFooters();
initializeTheme();
initializeCookieConsent();
navigate(window.location.pathname, { replace: true });

export { supabase, isSupabaseConfigured };
