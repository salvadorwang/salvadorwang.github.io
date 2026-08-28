/* ============================================================
 * 全站共享配置 + 布局渲染。
 * 改这里的 SITE 对象，所有页面的顶部导航和左侧个人栏同步更新。
 * ============================================================ */

const SITE = {
  name: "Xiongfei Wang",                      // TODO: 确认英文名写法
  bio: "PhD student at Tohoku University",    // TODO: 一句话简介
  avatar: "images/profile.svg",               // TODO: 换成你的照片，如 images/profile.jpg
  location: "Sendai, Miyagi, Japan",
  links: [
    // icon 支持: email / github / scholar / orcid / twitter / link
    { icon: "email",  label: "Email",  url: "mailto:wang.xiongfei.r6@dc.tohoku.ac.jp" },
    { icon: "github", label: "GitHub", url: "https://github.com/salvadorwang" }
    // { icon: "scholar", label: "Google Scholar", url: "https://scholar.google.com/..." },
    // { icon: "orcid",   label: "ORCID",          url: "https://orcid.org/..." },
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

  const linksHtml = SITE.links.map((l) =>
    `<li><a href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a></li>`
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
  }
})();
