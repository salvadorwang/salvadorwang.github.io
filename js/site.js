/* ============================================================
 * 全站共享配置 + 布局渲染。
 * 改这里的 SITE 对象，所有页面的顶部导航和左侧个人栏同步更新。
 * ============================================================ */

// GoatCounter 统计代码（注册时填的 Code），只需改这一处
const GOATCOUNTER_CODE = "salvadorwang";

// 你的 ORCID iD（形如 0000-0002-1825-0097），只需改这一处
const ORCID_ID = "0009-0004-2828-5797";

const SITE = {
  name: "Salvador Xiongfei Wang",             // 左侧栏全名
  shortName: "Salvador Wang",                 // 左上角站名
  bio: "PhD student at Tohoku University",
  avatar: "images/profile.jpg",
  // 头像样式: offset(蓝块错位) | mount(装裱) | circle(圆形) | arch(拱形) | plain(纯方形)
  avatarStyle: "offset",
  location: "Sendai, Miyagi, Japan",
  links: [
    // 普通链接写 url；写 popup 则改为点击弹出一张图片（如微信二维码）
    { label: "Email",  url: "mailto:wang.xiongfei.r6@dc.tohoku.ac.jp" },
    { label: "ORCID",  url: "https://orcid.org/" + ORCID_ID },
    { label: "WeChat", popup: "images/wechat-qr.jpg", popupAlt: "WeChat QR code" }
    // { label: "Google Scholar", url: "https://scholar.google.com/citations?user=..." },
  ],
  nav: [
    { title: "Home",         href: "index.html" },
    { title: "CV",           href: "cv.html" },
    { title: "Talks",        href: "talks.html" },
    { title: "Publications", href: "publications.html" },
    { title: "AOA",          href: "aoa.html" },
    { title: "Photos",       href: "photos.html" }
  ]
};

(function renderLayout() {
  const page = document.body.dataset.page || "";
  // 子目录页面（如有）可在 body 上设 data-root="../" 修正相对路径
  const root = document.body.dataset.root || "";

  const navHtml = SITE.nav.map((item) => {
    const active = item.href === page ? ' class="active"' : "";
    return `<a href="${root}${item.href}"${active}>${item.title}</a>`;
  }).join("");

  const masthead = document.getElementById("masthead");
  masthead.innerHTML = `
    <div class="masthead-inner">
      <a class="site-title" href="${root}index.html">${SITE.shortName || SITE.name}</a>
      <nav class="site-nav">${navHtml}</nav>
    </div>`;

  const linksHtml = SITE.links.map((l, i) => l.popup
    ? `<li><button class="link-btn" data-popup="${i}">${l.label} ⧉</button></li>`
    : `<li><a href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a></li>`
  ).join("");

  // 头像：配置的是 svg 占位图时显示蓝底姓名首字母色块，更贴合主题
  const avatarHtml = SITE.avatar.endsWith(".svg")
    ? `<div class="avatar-initials">${SITE.name.split(/\s+/).map(w => w[0]).join("").toUpperCase()}</div>`
    : `<img class="avatar" src="${root}${SITE.avatar}" alt="${SITE.name}">`;
  const avatarBlock =
    `<div class="avatar-wrap is-${SITE.avatarStyle || "plain"}">${avatarHtml}</div>`;

  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-sticky">
        ${avatarBlock}
        <h2 class="author-name">${SITE.name}</h2>
        <p class="author-bio">${SITE.bio}</p>
        <p class="side-label">Based in</p>
        <ul class="author-links"><li>${SITE.location}</li></ul>
        <p class="side-label">Contact</p>
        <ul class="author-links">${linksHtml}</ul>
        <p class="side-label">Visits</p>
        <ul class="author-links">
          <li><button class="link-btn" id="visits-btn">Show visit count ▸</button></li>
        </ul>
        <div id="visits-box" class="visits hidden">
          <div class="visit-row"><span>Total visitors</span><b id="gc_value_pv">…</b></div>
        </div>
      </div>`;
    initPopups(root);
    initVisitCounter();
  }
})();

/* 点击弹出图片（微信二维码等） */
function initPopups(root) {
  const box = document.createElement("div");
  box.id = "img-popup";
  box.className = "hidden";
  box.innerHTML =
    '<div class="popup-backdrop"></div>' +
    '<figure class="popup-card">' +
    '<button class="popup-close" aria-label="Close">✕</button>' +
    '<img alt=""><figcaption></figcaption></figure>';
  document.body.appendChild(box);

  const close = () => box.classList.add("hidden");
  box.querySelector(".popup-backdrop").addEventListener("click", close);
  box.querySelector(".popup-close").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  document.querySelectorAll(".link-btn[data-popup]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const l = SITE.links[+btn.dataset.popup];
      const img = box.querySelector("img");
      img.src = root + l.popup;
      img.alt = l.popupAlt || l.label;
      box.querySelector("figcaption").textContent = l.popupCaption || `Scan to add me on ${l.label}`;
      box.classList.remove("hidden");
    });
  });
}

/* 访问量统计：GoatCounter（开源、不用 cookie、不采集个人数据）。
   计数脚本每次打开页面都加载；数字等用户点按钮时再取，省一次请求。*/
function initVisitCounter() {
  const btn = document.getElementById("visits-btn");
  const box = document.getElementById("visits-box");
  if (!btn || !box) return;

  const base = `https://${GOATCOUNTER_CODE}.goatcounter.com`;

  // 计数脚本（无 cookie，不记录个人信息）
  const s = document.createElement("script");
  s.src = "https://gc.zgo.at/count.js";
  s.async = true;
  s.setAttribute("data-goatcounter", `${base}/count`);
  document.body.appendChild(s);

  let loaded = false;
  const fill = (v) => { document.getElementById("gc_value_pv").textContent = v; };

  btn.addEventListener("click", async () => {
    const willShow = box.classList.contains("hidden");
    box.classList.toggle("hidden", !willShow);
    btn.textContent = willShow ? "Hide visit count \u25be" : "Show visit count \u25b8";
    if (!willShow || loaded) return;
    loaded = true;
    try {
      const r = await fetch(`${base}/counter/TOTAL.json`, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      fill(d.count);
    } catch (e) {
      loaded = false;                       // 允许再点一次重试
      fill("n/a");
      console.warn("visit counter unavailable", e);
    }
  });
}
