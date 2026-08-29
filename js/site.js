/* ============================================================
 * 全站共享配置 + 布局渲染。
 * 改这里的 SITE 对象，所有页面的顶部导航和左侧个人栏同步更新。
 * ============================================================ */

// 你的 ORCID iD（形如 0000-0002-1825-0097），只需改这一处
const ORCID_ID = "0009-0004-2828-5797";

const SITE = {
  name: "Xiongfei Wang",                      // TODO: 确认英文名写法
  bio: "PhD student at Tohoku University",    // TODO: 一句话简介
  avatar: "images/profile.svg",               // TODO: 换成你的照片，如 images/profile.jpg
  location: "Sendai, Miyagi, Japan",
  links: [
    // 普通链接写 url；写 popup 则改为点击弹出一张图片（如微信二维码）
    { label: "Email",  url: "mailto:wang.xiongfei.r6@dc.tohoku.ac.jp" },
    { label: "GitHub", url: "https://github.com/salvadorwang" },
    { label: "ORCID",  url: "https://orcid.org/" + ORCID_ID },
    { label: "WeChat", popup: "images/wechat-qr.jpg", popupAlt: "WeChat QR code" }
    // { label: "Google Scholar", url: "https://scholar.google.com/citations?user=..." },
  ],
  nav: [
    { title: "About",        href: "index.html" },
    { title: "CV",           href: "cv.html" },
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
      <a class="site-title" href="${root}index.html">${SITE.name}</a>
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

  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-sticky">
        ${avatarHtml}
        <h2 class="author-name">${SITE.name}</h2>
        <p class="author-bio">${SITE.bio}</p>
        <p class="side-label">Based in</p>
        <ul class="author-links"><li>${SITE.location}</li></ul>
        <p class="side-label">Contact</p>
        <ul class="author-links">${linksHtml}</ul>
      </div>`;
    initPopups(root);
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
