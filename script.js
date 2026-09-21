/* =========================================================
   MENA — COMPLETE SCRIPT.JS
   Frontend prototype
   ========================================================= */

"use strict";

/* =========================================================
   MENA SETTINGS
   ========================================================= */

const APP = {
  version: "1.0.0",

  coinValue: 0.5,

  withdrawalMinimum: 10,

  marketPostFee: 100,

  freeWorkPostFee: 50,

  giftPlatformPercent: 30,

  creatorGiftPercent: 70,

  marketPlatformPercent: 5,

  workPlatformPercent: 5
};

const STORAGE_KEY = "MENA_DB_V2";

/* =========================================================
   HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

const qsa = (selector) => {
  return Array.from(document.querySelectorAll(selector));
};

function uid(prefix = "id") {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

function now() {
  return new Date().toISOString();
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  return Number(value || 0).toFixed(2) + " ETB";
}

function formatCoins(value) {
  return Number(value || 0).toLocaleString() + " coins";
}

function timeAgo(date) {
  const time = new Date(date).getTime();

  if (!time) return "";

  const seconds = Math.floor((Date.now() - time) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return minutes + "m ago";
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return hours + "h ago";
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return days + "d ago";
  }

  return new Date(date).toLocaleDateString();
}

function defaultAvatar(name = "MENA") {
  const letter = String(name).trim().charAt(0).toUpperCase() || "M";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" rx="100" fill="#12382a"/>
      <circle cx="100" cy="100" r="76" fill="#20d47a"/>
      <text x="100" y="120"
        text-anchor="middle"
        font-family="Arial"
        font-size="82"
        font-weight="700"
        fill="#03150d">${letter}</text>
    </svg>
  `;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

/* =========================================================
   DATABASE
   ========================================================= */

let DB = {
  users: [],
  posts: [],
  market: [],
  work: [],
  streams: [],
  comments: [],
  follows: [],
  wallet: {},
  transactions: [],
  stories: []
};

let currentUserId = null;
let localStream = null;

/* =========================================================
   DATABASE LOAD / SAVE
   ========================================================= */

function loadDatabase() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      DB = {
        ...DB,
        ...JSON.parse(saved)
      };
    }
  } catch (error) {
    console.error("MENA database load error:", error);
  }

  const savedUser = localStorage.getItem("MENA_CURRENT_USER");

  if (savedUser) {
    currentUserId = savedUser;
  }
}

function saveDatabase() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));

    if (currentUserId) {
      localStorage.setItem("MENA_CURRENT_USER", currentUserId);
    } else {
      localStorage.removeItem("MENA_CURRENT_USER");
    }
  } catch (error) {
    console.error("MENA database save error:", error);

    showToast(
      "Storage is full. Large videos/images may need to be removed.",
      "error"
    );
  }
}

/* =========================================================
   CURRENT USER
   ========================================================= */

function getCurrentUser() {
  if (!currentUserId) return null;

  return (
    DB.users.find((user) => user.id === currentUserId) ||
    null
  );
}

function requireLogin() {
  if (!getCurrentUser()) {
    showAuth();
    showToast("Please log in first.", "error");
    return false;
  }

  return true;
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadDatabase();
  initializeApp();
});

function initializeApp() {
  setupNavigation();
  setupButtons();
  setupForms();

  if (getCurrentUser()) {
    showApp();
  } else {
    showAuth();
  }

  renderAll();
}

/* =========================================================
   AUTH
   ========================================================= */

function showAuth() {
  const authPage = $("authPage");
  const appShell = $("appShell");

  if (authPage) {
    authPage.classList.remove("hidden");
  }

  if (appShell) {
    appShell.classList.add("hidden");
  }

  showAuthLogin();
}

function showApp() {
  const authPage = $("authPage");
  const appShell = $("appShell");

  if (authPage) {
    authPage.classList.add("hidden");
  }

  if (appShell) {
    appShell.classList.remove("hidden");
  }

  showPage("homePage");
}

function showAuthLogin() {
  const loginPage = $("loginPage");
  const signupPage = $("signupPage");

  if (loginPage) {
    loginPage.classList.remove("hidden");
  }

  if (signupPage) {
    signupPage.classList.add("hidden");
  }
}

function showAuthSignup() {
  const loginPage = $("loginPage");
  const signupPage = $("signupPage");

  if (loginPage) {
    loginPage.classList.add("hidden");
  }

  if (signupPage) {
    signupPage.classList.remove("hidden");
  }
}

function setupAuthButtons() {
  qsa("[data-auth='signup']").forEach((button) => {
    button.addEventListener("click", showAuthSignup);
  });

  qsa("[data-auth='login']").forEach((button) => {
    button.addEventListener("click", showAuthLogin);
  });
}

function signupUser(form) {
  const formData = new FormData(form);

  const name =
    formData.get("name") ||
    formData.get("fullName") ||
    $("signupName")?.value ||
    "";

  const username =
    formData.get("username") ||
    $("signupUsername")?.value ||
    "";

  const email =
    formData.get("email") ||
    $("signupEmail")?.value ||
    "";

  const password =
    formData.get("password") ||
    $("signupPassword")?.value ||
    "";

  if (!name.trim()) {
    showToast("Enter your full name.", "error");
    return;
  }

  if (!username.trim()) {
    showToast("Choose a username.", "error");
    return;
  }

  if (!email.trim()) {
    showToast("Enter your email.", "error");
    return;
  }

  if (!password || password.length < 6) {
    showToast("Password must contain at least 6 characters.", "error");
    return;
  }

  const cleanUsername = username
    .trim()
    .replace(/^@/, "")
    .toLowerCase();

  const exists = DB.users.some(
    (user) =>
      user.username.toLowerCase() === cleanUsername ||
      user.email.toLowerCase() === email.trim().toLowerCase()
  );

  if (exists) {
    showToast("Username or email already exists.", "error");
    return;
  }

  const user = {
    id: uid("user"),
    fullName: name.trim(),
    username: cleanUsername,
    email: email.trim().toLowerCase(),
    password: password,
    bio: "",
    avatar: defaultAvatar(name),
    followers: 0,
    following: 0,
    likes: 0,
    createdAt: now()
  };

  DB.users.push(user);

  DB.wallet[user.id] = {
    userId: user.id,
    coinBalance: 0,
    etbBalance: 0,
    telebirrNumber: "",
    telebirrName: "",
    mpesaNumber: "",
    mpesaName: "",
    createdAt: now(),
    updatedAt: now()
  };

  currentUserId = user.id;

  saveDatabase();

  form.reset();

  showApp();
  renderAll();

  showToast("Welcome to MENA!");
}

function loginUser(form) {
  const formData = new FormData(form);

  const email =
    formData.get("email") ||
    $("loginEmail")?.value ||
    "";

  const password =
    formData.get("password") ||
    $("loginPassword")?.value ||
    "";

  const user = DB.users.find(
    (item) =>
      item.email.toLowerCase() === email.trim().toLowerCase() &&
      item.password === password
  );

  if (!user) {
    showToast("Email or password is incorrect.", "error");
    return;
  }

  currentUserId = user.id;

  saveDatabase();

  form.reset();

  showApp();
  renderAll();

  showToast("Welcome back!");
}

function logout() {
  currentUserId = null;

  localStorage.removeItem("MENA_CURRENT_USER");

  stopCamera();

  showAuth();

  showToast("You have been logged out.");
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
  qsa(".nav-btn[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const pageId = button.dataset.page;

      if (!pageId) return;

      showPage(pageId);
    });
  });
}

function showPage(pageId) {
  qsa(".page").forEach((page) => {
    page.classList.remove("active");
    page.classList.add("hidden");
  });

  const page = $(pageId);

  if (page) {
    page.classList.remove("hidden");
    page.classList.add("active");
  }

  qsa(".nav-btn[data-page]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageId
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (pageId === "profilePage") {
    renderProfile();
  }

  if (pageId === "marketPage") {
    renderMarket();
  }

  if (pageId === "workPage") {
    renderWork();
  }

  if (pageId === "homePage") {
    renderHome();
  }

  if (pageId === "walletPage") {
    renderWallet();
  }

  if (pageId === "coinPage") {
    renderCoinShop();
  }
}

/* =========================================================
   BUTTON SETUP
   ========================================================= */

function setupButtons() {
  setupAuthButtons();

  $("brandBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("homePage");
    }
  });

  $("searchBtn")?.addEventListener("click", toggleSearch);

  $("settingsBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("settingsPage");
    }
  });

  $("menuBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("settingsPage");
    }
  });

  $("refreshFeed")?.addEventListener("click", () => {
    renderHome();
    showToast("Feed refreshed.");
  });

  $("openLive")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("livePage");
    }
  });

  $("createPostBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("postCreatePage");
    }
  });

  $("createLiveBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("livePage");
    }
  });

  $("createMarketBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("marketCreatePage");
    }
  });

  $("createWorkBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("workCreatePage");
    }
  });

  $("newMarketPost")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("marketCreatePage");
    }
  });

  $("newWorkPost")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("workCreatePage");
    }
  });

  $("settingsBack")?.addEventListener("click", () => {
    showPage("profilePage");
  });

  $("editProfileBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      fillEditProfile();
      showPage("editProfilePage");
    }
  });

  $("walletSettingsBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("walletPage");
    }
  });

  $("coinShopBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("coinPage");
    }
  });

  $("depositBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("depositPage");
    }
  });

  $("withdrawBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      showPage("withdrawPage");
    }
  });

  $("accountSettingsBtn")?.addEventListener("click", () => {
    if (requireLogin()) {
      renderAccountPage();
      showPage("accountPage");
    }
  });

  $("logoutBtn")?.addEventListener("click", logout);

  $("walletDeposit")?.addEventListener("click", () => {
    showPage("depositPage");
  });

  $("walletWithdraw")?.addEventListener("click", () => {
    showPage("withdrawPage");
  });

  $("walletConnect")?.addEventListener("click", connectWallet);

  $("walletBack")?.addEventListener("click", () => {
    showPage("settingsPage");
  });

  $("coinBack")?.addEventListener("click", () => {
    showPage("settingsPage");
  });

  $("depositBack")?.addEventListener("click", () => {
    showPage("walletPage");
  });

  $("withdrawBack")?.addEventListener("click", () => {
    showPage("walletPage");
  });

  $("editProfileBack")?.addEventListener("click", () => {
    showPage("profilePage");
  });

  $("postCreateBack")?.addEventListener("click", () => {
    showPage("createPage");
  });

  $("liveBack")?.addEventListener("click", () => {
    stopCamera();
    showPage("createPage");
  });

  $("marketCreateBack")?.addEventListener("click", () => {
    showPage("createPage");
  });

  $("workCreateBack")?.addEventListener("click", () => {
    showPage("createPage");
  });

  $("accountBack")?.addEventListener("click", () => {
    showPage("settingsPage");
  });

  $("stopLiveBtn")?.addEventListener("click", stopLive);
}

/* =========================================================
   FORMS
   ========================================================= */

function setupForms() {
  $("loginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    loginUser(event.currentTarget);
  });

  $("signupForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    signupUser(event.currentTarget);
  });

  $("postForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    createPostFromForm(event.currentTarget);
  });

  $("liveForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    startLive(event.currentTarget);
  });

  $("marketForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    createMarketFromForm(event.currentTarget);
  });

  $("workForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    createWorkFromForm(event.currentTarget);
  });

  $("editProfileForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfile(event.currentTarget);
  });

  $("depositForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    depositMoney(event.currentTarget);
  });

  $("withdrawForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    withdrawMoney(event.currentTarget);
  });

  $("searchSubmit")?.addEventListener("click", performSearch);

  $("searchInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      performSearch();
    }
  });
}

/* =========================================================
   SEARCH
   ========================================================= */

function toggleSearch() {
  const panel = $("searchPanel");

  if (!panel) return;

  panel.classList.toggle("hidden");

  if (!panel.classList.contains("hidden")) {
    $("searchInput")?.focus();
  }
}

function performSearch() {
  const input = $("searchInput");

  if (!input) return;

  const query = input.value.trim().toLowerCase();

  const results = $("searchResults");

  if (!results) return;

  if (!query) {
    results.innerHTML = "";
    return;
  }

  const users = DB.users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
  );

  const posts = DB.posts.filter(
    (post) =>
      post.caption?.toLowerCase().includes(query)
  );

  const market = DB.market.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
  );

  const work = DB.work.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
  );

  if (
    !users.length &&
    !posts.length &&
    !market.length &&
    !work.length
  ) {
    results.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔎</div>
        <h3>No results</h3>
        <p>Nothing matched your search.</p>
      </div>
    `;

    return;
  }

  let html = "";

  users.forEach((user) => {
    html += `
      <button class="search-result" data-search-user="${user.id}">
        <img
          class="search-result-avatar"
          src="${escapeHTML(user.avatar)}"
          alt=""
        >
        <div>
          <strong>${escapeHTML(user.fullName)}</strong>
          <div class="text-muted">@${escapeHTML(user.username)}</div>
        </div>
      </button>
    `;
  });

  posts.forEach((post) => {
    html += `
      <button class="search-result" data-search-post="${post.id}">
        <div class="search-result-avatar"
             style="display:flex;align-items:center;justify-content:center;background:#183329;">
          📝
        </div>
        <div>
          <strong>Post</strong>
          <div class="text-muted">
            ${escapeHTML(post.caption || "Post")}
          </div>
        </div>
      </button>
    `;
  });

  market.forEach((item) => {
    html += `
      <button class="search-result" data-search-market="${item.id}">
        <div class="search-result-avatar"
             style="display:flex;align-items:center;justify-content:center;background:#183329;">
          🛒
        </div>
        <div>
          <strong>${escapeHTML(item.title)}</strong>
          <div class="text-green">${money(item.price)}</div>
        </div>
      </button>
    `;
  });

  work.forEach((item) => {
    html += `
      <button class="search-result" data-search-work="${item.id}">
        <div class="search-result-avatar"
             style="display:flex;align-items:center;justify-content:center;background:#183329;">
          💼
        </div>
        <div>
          <strong>${escapeHTML(item.title)}</strong>
          <div class="text-muted">Free Work</div>
        </div>
      </button>
    `;
  });

  results.innerHTML = html;

  qsa("[data-search-user]").forEach((button) => {
    button.addEventListener("click", () => {
      const user = DB.users.find(
        (item) => item.id === button.dataset.searchUser
      );

      if (user) {
        showUserProfile(user);
      }
    });
  });

  qsa("[data-search-market]").forEach((button) => {
    button.addEventListener("click", () => {
      showPage("marketPage");
    });
  });

  qsa("[data-search-work]").forEach((button) => {
    button.addEventListener("click", () => {
      showPage("workPage");
    });
  });

  qsa("[data-search-post]").forEach((button) => {
    button.addEventListener("click", () => {
      showPage("homePage");
    });
  });
}

/* =========================================================
   HOME RENDER
   ========================================================= */

function renderAll() {
  renderHome();
  renderStories();
  renderStreams();
  renderMarket();
  renderWork();
  renderProfile();
  renderWallet();
  renderCoinShop();
  renderAccountPage();
  updateWalletUI();
}

function renderHome() {
  const container = $("postFeed");

  if (!container) return;

  const posts = [...DB.posts]
    .sort(
      (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

  if (!posts.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📱</div>
        <h3>No posts yet</h3>
        <p>Create the first post on MENA.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = posts
    .map(renderPostHTML)
    .join("");

  attachPostEvents();
}

/* =========================================================
   STORIES
   ========================================================= */

function renderStories() {
  const container = $("stories");

  if (!container) return;

  const users = DB.users;

  if (!users.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = users
    .map(
      (user) => `
        <button class="story" data-story-user="${user.id}">
          <div class="story-avatar">
            <img
              src="${escapeHTML(user.avatar)}"
              alt=""
            >
          </div>
          <div class="story-name">
            ${escapeHTML(user.username)}
          </div>
        </button>
      `
    )
    .join("");

  qsa("[data-story-user]").forEach((button) => {
    button.addEventListener("click", () => {
      const user = DB.users.find(
        (item) => item.id === button.dataset.storyUser
      );

      if (user) {
        showUserProfile(user);
      }
    });
  });
}

/* =========================================================
   POST HTML
   ========================================================= */

function renderPostHTML(post) {
  const author =
    DB.users.find((user) => user.id === post.userId) ||
    getCurrentUser();

  if (!author) return "";

  const liked =
    post.likes?.includes(currentUserId);

  const comments =
    DB.comments.filter(
      (comment) => comment.postId === post.id
    );

  let mediaHTML = "";

  if (post.mediaType === "image" && post.media) {
    mediaHTML = `
      <img
        class="post-media"
        src="${escapeHTML(post.media)}"
        alt="Post"
      >
    `;
  }

  if (post.mediaType === "video" && post.media) {
    mediaHTML = `
      <video
        class="post-media"
        src="${escapeHTML(post.media)}"
        controls
        playsinline
      ></video>
    `;
  }

  return `
    <article class="post-card" data-post-id="${post.id}">

      <div class="post-header">

        <button
          class="post-author-button"
          data-user-profile="${author.id}"
          style="display:flex;align-items:center;gap:10px;flex:1;background:transparent;color:inherit;text-align:left;"
        >
          <img
            class="post-avatar"
            src="${escapeHTML(author.avatar)}"
            alt=""
          >

          <div class="post-author">
            <strong>
              ${escapeHTML(author.fullName)}
            </strong>

            <span>
              @${escapeHTML(author.username)}
              · ${timeAgo(post.createdAt)}
            </span>
          </div>
        </button>

        ${
          post.userId === currentUserId
            ? `
              <button
                class="post-more"
                data-delete-post="${post.id}"
                title="Delete"
              >
                ⋮
              </button>
            `
            : ""
        }

      </div>

      ${
        post.caption
          ? `
            <div class="post-caption">
              ${escapeHTML(post.caption)}
            </div>
          `
          : ""
      }

      ${mediaHTML}

      <div class="post-actions">

        <div class="post-actions-left">

          <button
            class="post-action ${liked ? "liked" : ""}"
            data-like-post="${post.id}"
          >
            ${liked ? "❤️" : "♡"}
            <span class="post-count">
              ${post.likes?.length || 0}
            </span>
          </button>

          <button
            class="post-action"
            data-comment-post="${post.id}"
          >
            💬
            <span class="post-count">
              ${comments.length}
            </span>
          </button>

          <button
            class="post-action"
            data-share-post="${post.id}"
          >
            ↗
          </button>

        </div>

        <div class="post-actions-right">

          <button
            class="post-action gifted"
            data-gift-post="${post.id}"
          >
            🎁
          </button>

        </div>

      </div>

      ${
        comments.length
          ? `
            <div class="comment-section">
              ${comments
                .slice(-3)
                .map(renderCommentHTML)
                .join("")}
            </div>
          `
          : ""
      }

    </article>
  `;
}

/* =========================================================
   COMMENTS
   ========================================================= */

function renderCommentHTML(comment) {
  const user =
    DB.users.find(
      (item) => item.id === comment.userId
    ) || getCurrentUser();

  return `
    <div class="comment-item">
      <img
        class="comment-avatar"
        src="${escapeHTML(user?.avatar || defaultAvatar())}"
        alt=""
      >

      <div class="comment-body">
        <strong>
          ${escapeHTML(user?.fullName || "User")}
        </strong>

        <span>
          ${escapeHTML(comment.text)}
        </span>
      </div>
    </div>
  `;
}

function attachPostEvents() {
  qsa("[data-like-post]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleLike(button.dataset.likePost);
    });
  });

  qsa("[data-comment-post]").forEach((button) => {
    button.addEventListener("click", () => {
      addComment(button.dataset.commentPost);
    });
  });

  qsa("[data-share-post]").forEach((button) => {
    button.addEventListener("click", () => {
      sharePost(button.dataset.sharePost);
    });
  });

  qsa("[data-gift-post]").forEach((button) => {
    button.addEventListener("click", () => {
      sendGift(button.dataset.giftPost);
    });
  });

  qsa("[data-delete-post]").forEach((button) => {
    button.addEventListener("click", () => {
      deletePost(button.dataset.deletePost);
    });
  });

  qsa("[data-user-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      const user = DB.users.find(
        (item) => item.id === button.dataset.userProfile
      );

      if (user) {
        showUserProfile(user);
      }
    });
  });
}

/* =========================================================
   CREATE POST
   ========================================================= */

async function createPostFromForm(form) {
  if (!requireLogin()) return;

  const caption =
    $("postCaption")?.value?.trim() || "";

  const mediaInput = $("postMedia");

  let media = "";
  let mediaType = "";

  if (mediaInput?.files?.length) {
    const file = mediaInput.files[0];

    if (file.size > 8 * 1024 * 1024) {
      showToast(
        "For this prototype, keep files below 8 MB.",
        "error"
      );
      return;
    }

    media = await readFile(file);

    if (file.type.startsWith("image/")) {
      mediaType = "image";
    } else if (file.type.startsWith("video/")) {
      mediaType = "video";
    }
  }

  if (!caption && !media) {
    showToast(
      "Add text, an image, or a video.",
      "error"
    );
    return;
  }

  const post = {
    id: uid("post"),
    userId: currentUserId,
    caption,
    media,
    mediaType,
    likes: [],
    createdAt: now()
  };

  DB.posts.unshift(post);

  saveDatabase();

  form.reset();

  renderHome();

  showPage("homePage");

  showToast("Post published.");
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

/* =========================================================
   LIKE
   ========================================================= */

function toggleLike(postId) {
  if (!requireLogin()) return;

  const post = DB.posts.find(
    (item) => item.id === postId
  );

  if (!post) return;

  if (!Array.isArray(post.likes)) {
    post.likes = [];
  }

  const index = post.likes.indexOf(currentUserId);

  const author = DB.users.find(
    (user) => user.id === post.userId
  );

  if (index >= 0) {
    post.likes.splice(index, 1);

    if (author) {
      author.likes = Math.max(
        0,
        Number(author.likes || 0) - 1
      );
    }
  } else {
    post.likes.push(currentUserId);

    if (author) {
      author.likes =
        Number(author.likes || 0) + 1;
    }
  }

  saveDatabase();
  renderHome();
  renderProfile();
}

/* =========================================================
   COMMENT
   ========================================================= */

function addComment(postId) {
  if (!requireLogin()) return;

  const text = prompt("Write your comment:");

  if (!text || !text.trim()) return;

  DB.comments.push({
    id: uid("comment"),
    postId,
    userId: currentUserId,
    text: text.trim(),
    createdAt: now()
  });

  saveDatabase();

  renderHome();

  showToast("Comment added.");
}

/* =========================================================
   SHARE
   ========================================================= */

async function sharePost(postId) {
  const post = DB.posts.find(
    (item) => item.id === postId
  );

  if (!post) return;

  const shareText =
    post.caption || "Check this post on MENA.";

  try {
    if (navigator.share) {
      await navigator.share({
        title: "MENA",
        text: shareText,
        url: location.href
      });

      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(
        location.href
      );

      showToast("Post link copied.");
    } else {
      showToast("Sharing is not supported here.");
    }
  } catch (error) {
    console.log("Share cancelled.");
  }
}

/* =========================================================
   DELETE POST
   ========================================================= */

function deletePost(postId) {
  if (!requireLogin()) return;

  const post = DB.posts.find(
    (item) => item.id === postId
  );

  if (!post || post.userId !== currentUserId) {
    return;
  }

  const confirmed = confirm(
    "Delete this post?"
  );

  if (!confirmed) return;

  DB.posts = DB.posts.filter(
    (item) => item.id !== postId
  );

  DB.comments = DB.comments.filter(
    (comment) => comment.postId !== postId
  );

  saveDatabase();

  renderHome();
  renderProfile();

  showToast("Post deleted.");
}

/* =========================================================
   GIFTS
   ========================================================= */

const GIFTS = [
  { name: "Like", icon: "❤️", coins: 1 },
  { name: "Rose", icon: "🌹", coins: 5 },
  { name: "Star", icon: "⭐", coins: 10 },
  { name: "Heart", icon: "💖", coins: 25 },
  { name: "Coffee", icon: "☕", coins: 50 },
  { name: "Fire", icon: "🔥", coins: 100 },
  { name: "Crown", icon: "👑", coins: 250 },
  { name: "Diamond", icon: "💎", coins: 500 },
  { name: "Rocket", icon: "🚀", coins: 1000 },
  { name: "Galaxy", icon: "🌌", coins: 2500 },
  { name: "Lion", icon: "🦁", coins: 5000 },
  { name: "Castle", icon: "🏰", coins: 7500 },
  { name: "Dragon", icon: "🐉", coins: 10000 },
  { name: "Universe", icon: "🌍", coins: 15000 },
  { name: "Royal", icon: "💫", coins: 20000 },
  { name: "MENA", icon: "💚", coins: 27000 }
];

function sendGift(postId) {
  if (!requireLogin()) return;

  const post = DB.posts.find(
    (item) => item.id === postId
  );

  if (!post) return;

  openGiftSelector(post.userId);
}

function openGiftSelector(receiverId) {
  const receiver = DB.users.find(
    (user) => user.id === receiverId
  );

  if (!receiver) return;

  const modal = document.createElement("div");

  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-box">

      <div class="modal-header">
        <h2>Send Gift</h2>

        <button class="modal-close">
          ✕
        </button>
      </div>

      <p class="text-muted" style="margin-bottom:12px;">
        Send a gift to ${escapeHTML(receiver.fullName)}
      </p>

      <div class="gift-grid">
        ${GIFTS.map(
          (gift) => `
            <button
              class="gift-item"
              data-gift-coins="${gift.coins}"
            >
              <div class="gift-icon">
                ${gift.icon}
              </div>

              <div class="gift-name">
                ${escapeHTML(gift.name)}
              </div>

              <div class="gift-price">
                ${gift.coins.toLocaleString()} coins
              </div>
            </button>
          `
        ).join("")}
      </div>

      <div class="info-box" style="margin-top:12px;">
        Creator receives 70%.
        MENA platform fee is 30%.
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelector(".modal-close")
    ?.addEventListener("click", () => {
      modal.remove();
    });

  qsa("[data-gift-coins]", modal).forEach(
    (button) => {
      button.addEventListener("click", () => {
        const coins = Number(
          button.dataset.giftCoins
        );

        modal.remove();

        completeGift(receiverId, coins);
      });
    }
  );
}

function completeGift(receiverId, coins) {
  const wallet = getWallet();

  if (!wallet) return;

  if (wallet.coinBalance < coins) {
    showToast(
      "Not enough coins. Buy coins first.",
      "error"
    );

    return;
  }

  const receiverWallet =
    DB.wallet[receiverId];

  if (!receiverWallet) return;

  const creatorCoins =
    Math.floor(
      coins *
        (APP.creatorGiftPercent / 100)
    );

  wallet.coinBalance -= coins;

  receiverWallet.coinBalance += creatorCoins;

  DB.transactions.push({
    id: uid("gift"),
    type: "gift",
    fromUserId: currentUserId,
    toUserId: receiverId,
    coins,
    creatorCoins,
    platformCoins: coins - creatorCoins,
    createdAt: now()
  });

  saveDatabase();

  updateWalletUI();
  renderWallet();

  showToast(
    `Gift sent: ${coins.toLocaleString()} coins`
  );
}

/* =========================================================
   LIVE
   ========================================================= */

function renderStreams() {
  const container = $("liveList");

  if (!container) return;

  const streams = DB.streams.filter(
    (stream) => stream.active
  );

  if (!streams.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🔴</div>
        <h3>No live streams</h3>
        <p>No one is streaming right now.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = streams
    .map((stream) => {
      const user = DB.users.find(
        (item) => item.id === stream.userId
      );

      if (!user) return "";

      return `
        <button
          class="live-card"
          data-live-id="${stream.id}"
        >

          <div class="live-badge">
            LIVE
          </div>

          <div
            style="
              height:185px;
              display:flex;
              align-items:center;
              justify-content:center;
              background:linear-gradient(135deg,#102b20,#06100c);
              font-size:50px;
            "
          >
            🔴
          </div>

          <div class="live-card-overlay">

            <div class="live-user">

              <img
                src="${escapeHTML(user.avatar)}"
                alt=""
              >

              <div>
                <strong>
                  ${escapeHTML(user.fullName)}
                </strong>

                <div class="live-viewers">
                  Live now
                </div>
              </div>

            </div>

          </div>

        </button>
      `;
    })
    .join("");

  qsa("[data-live-id]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(
        "Live viewing will connect to the real streaming backend."
      );
    });
  });
}

async function startLive(form) {
  if (!requireLogin()) return;

  const name =
    $("streamName")?.value?.trim() ||
    "MENA Live";

  try {
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      showToast(
        "Camera is not supported in this browser.",
        "error"
      );

      return;
    }

    localStream =
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

    const video = $("localStreamVideo");

    if (video) {
      video.srcObject = localStream;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
    }

    const existing =
      DB.streams.find(
        (stream) =>
          stream.userId === currentUserId
      );

    if (existing) {
      existing.title = name;
      existing.active = true;
      existing.startedAt = now();
    } else {
      DB.streams.push({
        id: uid("stream"),
        userId: currentUserId,
        title: name,
        active: true,
        startedAt: now()
      });
    }

    saveDatabase();
    renderStreams();

    showToast(
      "Camera started. This is a local prototype stream."
    );
  } catch (error) {
    console.error(error);

    showToast(
      "Camera or microphone permission was denied.",
      "error"
    );
  }
}

function stopLive() {
  if (!currentUserId) return;

  const stream = DB.streams.find(
    (item) =>
      item.userId === currentUserId &&
      item.active
  );

  if (stream) {
    stream.active = false;
    stream.endedAt = now();
  }

  stopCamera();

  saveDatabase();
  renderStreams();

  showPage("createPage");

  showToast("Live ended.");
}

function stopCamera() {
  if (localStream) {
    localStream.getTracks().forEach(
      (track) => track.stop()
    );

    localStream = null;
  }

  const video = $("localStreamVideo");

  if (video) {
    video.srcObject = null;
  }
}

/* =========================================================
   MARKETPLACE
   ========================================================= */

function renderMarket() {
  const container = $("marketList");

  if (!container) return;

  const items = [...DB.market]
    .sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🛒</div>
        <h3>No marketplace items</h3>
        <p>There are no products listed yet.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = items
    .map(renderMarketHTML)
    .join("");

  qsa("[data-buy-market]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        const item = DB.market.find(
          (product) =>
            product.id ===
            button.dataset.buyMarket
        );

        if (item) {
          openMarketDetails(item);
        }
      });
    }
  );
}

function renderMarketHTML(item) {
  const seller =
    DB.users.find(
      (user) => user.id === item.userId
    );

  return `
    <article class="market-card">

      ${
        item.image
          ? `
            <img
              class="market-image"
              src="${escapeHTML(item.image)}"
              alt=""
            >
          `
          : `
            <div
              class="market-image"
              style="
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:42px;
              "
            >
              🛒
            </div>
          `
      }

      <div class="market-body">

        <div class="market-title">
          ${escapeHTML(item.title)}
        </div>

        <div class="market-description">
          ${escapeHTML(item.description)}
        </div>

        <div class="market-price">
          ${money(item.price)}
        </div>

        <div class="market-meta">
          <span>
            📍 ${escapeHTML(item.location || "Location not added")}
          </span>

          <span>
            ☎ ${escapeHTML(item.phone || "Phone not added")}
          </span>

          ${
            seller
              ? `
                <span>
                  👤 ${escapeHTML(seller.fullName)}
                </span>
              `
              : ""
          }
        </div>

        <button
          class="btn btn-green btn-small"
          data-buy-market="${item.id}"
        >
          View product
        </button>

      </div>

    </article>
  `;
}

function createMarketFromForm(form) {
  if (!requireLogin()) return;

  const wallet = getWallet();

  if (!wallet) return;

  if (
    Number(wallet.etbBalance) <
    APP.marketPostFee
  ) {
    showToast(
      `Marketplace posting costs ${APP.marketPostFee} ETB. Deposit first.`,
      "error"
    );

    showPage("depositPage");

    return;
  }

  const title =
    $("marketTitle")?.value?.trim() || "";

  const description =
    $("marketDescription")?.value?.trim() || "";

  const price =
    Number($("marketPrice")?.value || 0);

  const phone =
    $("marketPhone")?.value?.trim() || "";

  const location =
    $("marketLocation")?.value?.trim() || "";

  const imageInput = $("marketImage");

  if (!title) {
    showToast("Enter a product title.", "error");
    return;
  }

  if (!description) {
    showToast("Enter a description.", "error");
    return;
  }

  if (!price || price <= 0) {
    showToast("Enter a valid price.", "error");
    return;
  }

  if (!phone) {
    showToast("Enter your phone number.", "error");
    return;
  }

  if (!location) {
    showToast("Enter your location.", "error");
    return;
  }

  const finish = (image) => {
    wallet.etbBalance -= APP.marketPostFee;

    DB.market.unshift({
      id: uid("market"),
      userId: currentUserId,
      title,
      description,
      price,
      phone,
      location,
      image: image || "",
      createdAt: now()
    });

    DB.transactions.push({
      id: uid("transaction"),
      type: "market_post_fee",
      userId: currentUserId,
      amount: APP.marketPostFee,
      createdAt: now()
    });

    saveDatabase();

    form.reset();

    renderMarket();
    updateWalletUI();

    showPage("marketPage");

    showToast(
      `Product listed. ${APP.marketPostFee} ETB posting fee charged.`
    );
  };

  if (imageInput?.files?.length) {
    readFile(imageInput.files[0])
      .then(finish)
      .catch(() => {
        showToast(
          "Could not read the image.",
          "error"
        );
      });
  } else {
    finish("");
  }
}

function openMarketDetails(item) {
  const seller =
    DB.users.find(
      (user) => user.id === item.userId
    );

  const modal = document.createElement("div");

  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-box">

      <div class="modal-header">

        <h2>
          ${escapeHTML(item.title)}
        </h2>

        <button class="modal-close">
          ✕
        </button>

      </div>

      ${
        item.image
          ? `
            <img
              src="${escapeHTML(item.image)}"
              style="
                width:100%;
                max-height:320px;
                object-fit:contain;
                border-radius:14px;
                background:#050a08;
                margin-bottom:12px;
              "
            >
          `
          : ""
      }

      <div class="market-price">
        ${money(item.price)}
      </div>

      <p style="margin-top:10px;">
        ${escapeHTML(item.description)}
      </p>

      <div class="info-box">

        📍 ${escapeHTML(item.location)}
        <br>
        ☎ ${escapeHTML(item.phone)}

        ${
          seller
            ? `<br>👤 ${escapeHTML(seller.fullName)}`
            : ""
        }

      </div>

      <button class="btn btn-primary">
        Contact seller
      </button>

    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelector(".modal-close")
    ?.addEventListener("click", () => {
      modal.remove();
    });

  modal
    .querySelector(".btn-primary")
    ?.addEventListener("click", () => {
      window.location.href =
        "tel:" + item.phone;
    });
}

/* =========================================================
   FREE WORK
   ========================================================= */

function renderWork() {
  const container = $("workList");

  if (!container) return;

  const items = [...DB.work]
    .sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">💼</div>
        <h3>No work opportunities</h3>
        <p>No Free Work posts are available yet.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = items
    .map(renderWorkHTML)
    .join("");

  qsa("[data-work-contact]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        const item = DB.work.find(
          (job) =>
            job.id ===
            button.dataset.workContact
        );

        if (item) {
          contactWork(item);
        }
      });
    }
  );
}

function renderWorkHTML(item) {
  return `
    <article class="work-card">

      <div
        class="work-image"
        style="
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:45px;
        "
      >
        💼
      </div>

      <div class="work-body">

        <div class="work-badge">
          ${escapeHTML(item.category || "Work")}
        </div>

        <div class="work-title">
          ${escapeHTML(item.title)}
        </div>

        <div class="work-description">
          ${escapeHTML(item.description)}
        </div>

        <div class="work-meta">

          <span>
            📍 ${escapeHTML(item.location || "Not specified")}
          </span>

          ${
            item.material
              ? `
                <span>
                  📚 ${escapeHTML(item.material)}
                </span>
              `
              : ""
          }

        </div>

        <div class="work-contact">
          Contact: ${escapeHTML(item.contact || "")}
        </div>

        <button
          class="btn btn-green btn-small"
          data-work-contact="${item.id}"
        >
          Contact employer
        </button>

      </div>

    </article>
  `;
}

function createWorkFromForm(form) {
  if (!requireLogin()) return;

  const wallet = getWallet();

  if (!wallet) return;

  if (
    Number(wallet.etbBalance) <
    APP.freeWorkPostFee
  ) {
    showToast(
      `Free Work posting costs ${APP.freeWorkPostFee} ETB. Deposit first.`,
      "error"
    );

    showPage("depositPage");

    return;
  }

  const title =
    $("workTitle")?.value?.trim() || "";

  const description =
    $("workDescription")?.value?.trim() || "";

  const category =
    $("workCategory")?.value?.trim() || "Work";

  const contact =
    $("workContact")?.value?.trim() || "";

  const location =
    $("workLocation")?.value?.trim() || "";

  const material =
    $("workMaterial")?.value?.trim() || "";

  if (!title) {
    showToast("Enter the work title.", "error");
    return;
  }

  if (!description) {
    showToast(
      "Enter the work description.",
      "error"
    );
    return;
  }

  if (!contact) {
    showToast(
      "Enter employer contact.",
      "error"
    );
    return;
  }

  wallet.etbBalance -= APP.freeWorkPostFee;

  DB.work.unshift({
    id: uid("work"),
    userId: currentUserId,
    title,
    description,
    category,
    contact,
    location,
    material,
    createdAt: now()
  });

  DB.transactions.push({
    id: uid("transaction"),
    type: "work_post_fee",
    userId: currentUserId,
    amount: APP.freeWorkPostFee,
    createdAt: now()
  });

  saveDatabase();

  form.reset();

  renderWork();
  updateWalletUI();

  showPage("workPage");

  showToast(
    `Work post created. ${APP.freeWorkPostFee} ETB posting fee charged.`
  );
}

function contactWork(item) {
  const contact = item.contact;

  if (!contact) {
    showToast("No contact information.");
    return;
  }

  if (
    /^https?:\/\//i.test(contact)
  ) {
    window.open(contact, "_blank");
    return;
  }

  if (
    /^[0-9+()\-\s]+$/.test(contact)
  ) {
    window.location.href =
      "tel:" + contact.replace(/\s/g, "");

    return;
  }

  navigator.clipboard
    ?.writeText(contact)
    .then(() => {
      showToast("Contact copied.");
    })
    .catch(() => {
      showToast(contact);
    });
}

/* =========================================================
   PROFILE
   ========================================================= */

function renderProfile() {
  const header = $("profileHeader");
  const content = $("profileContent");

  const user = getCurrentUser();

  if (!user) {
    if (header) header.innerHTML = "";
    if (content) content.innerHTML = "";
    return;
  }

  const followers =
    DB.follows.filter(
      (follow) =>
        follow.followingId === user.id
    ).length;

  const following =
    DB.follows.filter(
      (follow) =>
        follow.followerId === user.id
    ).length;

  const posts =
    DB.posts.filter(
      (post) =>
        post.userId === user.id
    );

  const likes = posts.reduce(
    (total, post) =>
      total + (post.likes?.length || 0),
    0
  );

  user.followers = followers;
  user.following = following;
  user.likes = likes;

  if (header) {
    header.innerHTML = `
      <div class="profile-top">

        <img
          class="profile-avatar"
          src="${escapeHTML(user.avatar)}"
          alt=""
        >

        <div class="profile-main">

          <div class="profile-name">
            ${escapeHTML(user.fullName)}
          </div>

          <div class="profile-username">
            @${escapeHTML(user.username)}
          </div>

          ${
            user.bio
              ? `
                <div class="profile-bio">
                  ${escapeHTML(user.bio)}
                </div>
              `
              : ""
          }

        </div>

      </div>

      <div class="profile-stats">

        <div class="profile-stat">
          <strong>${posts.length}</strong>
          <span>Posts</span>
        </div>

        <div class="profile-stat">
          <strong>${followers}</strong>
          <span>Followers</span>
        </div>

        <div class="profile-stat">
          <strong>${following}</strong>
          <span>Following</span>
        </div>

        <div class="profile-stat">
          <strong>${likes}</strong>
          <span>Likes</span>
        </div>

      </div>

      <div class="profile-actions">

        <button
          class="btn btn-secondary"
          id="profileEditDynamic"
        >
          Edit profile
        </button>

        <button
          class="btn btn-green"
          id="profileWalletDynamic"
        >
          Wallet
        </button>

      </div>
    `;

    $("profileEditDynamic")?.addEventListener(
      "click",
      () => {
        fillEditProfile();
        showPage("editProfilePage");
      }
    );

    $("profileWalletDynamic")?.addEventListener(
      "click",
      () => {
        showPage("walletPage");
      }
    );
  }

  if (content) {
    if (!posts.length) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📷</div>
          <h3>No posts yet</h3>
          <p>Your posts will appear here.</p>
        </div>
      `;

      return;
    }

    content.innerHTML = `
      <div class="profile-grid">
        ${posts
          .map((post) => {
            if (!post.media) {
              return `
                <button
                  class="profile-grid-item"
                  data-profile-post="${post.id}"
                  style="
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    padding:10px;
                    color:#b8c8c1;
                    background:#10211b;
                    text-align:left;
                  "
                >
                  ${escapeHTML(
                    post.caption || "Post"
                  )}
                </button>
              `;
            }

            if (post.mediaType === "video") {
              return `
                <button
                  class="profile-grid-item"
                  data-profile-post="${post.id}"
                >
                  <video
                    src="${escapeHTML(post.media)}"
                    muted
                  ></video>
                </button>
              `;
            }

            return `
              <button
                class="profile-grid-item"
                data-profile-post="${post.id}"
              >
                <img
                  src="${escapeHTML(post.media)}"
                  alt=""
                >
              </button>
            `;
          })
          .join("")}
      </div>
    `;

    qsa("[data-profile-post]").forEach(
      (button) => {
        button.addEventListener("click", () => {
          showPage("homePage");
        });
      }
    );
  }

  saveDatabase();
}

function showUserProfile(user) {
  const posts =
    DB.posts.filter(
      (post) => post.userId === user.id
    );

  const followers =
    DB.follows.filter(
      (follow) =>
        follow.followingId === user.id
    ).length;

  const following =
    DB.follows.filter(
      (follow) =>
        follow.followerId === user.id
    ).length;

  const isFollowing =
    DB.follows.some(
      (follow) =>
        follow.followerId === currentUserId &&
        follow.followingId === user.id
    );

  const modal = document.createElement("div");

  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-box">

      <div class="modal-header">

        <h2>Profile</h2>

        <button class="modal-close">
          ✕
        </button>

      </div>

      <div class="profile-top">

        <img
          class="profile-avatar"
          src="${escapeHTML(user.avatar)}"
          alt=""
        >

        <div class="profile-main">

          <div class="profile-name">
            ${escapeHTML(user.fullName)}
          </div>

          <div class="profile-username">
            @${escapeHTML(user.username)}
          </div>

          ${
            user.bio
              ? `
                <div class="profile-bio">
                  ${escapeHTML(user.bio)}
                </div>
              `
              : ""
          }

        </div>

      </div>

      <div class="profile-stats">

        <div class="profile-stat">
          <strong>${posts.length}</strong>
          <span>Posts</span>
        </div>

        <div class="profile-stat">
          <strong>${followers}</strong>
          <span>Followers</span>
        </div>

        <div class="profile-stat">
          <strong>${following}</strong>
          <span>Following</span>
        </div>

        <div class="profile-stat">
          <strong>${user.likes || 0}</strong>
          <span>Likes</span>
        </div>

      </div>

      ${
        user.id !== currentUserId
          ? `
            <button
              class="btn ${
                isFollowing
                  ? "btn-secondary"
                  : "btn-green"
              }"
              style="width:100%;margin-top:15px;"
              id="followDynamic"
            >
              ${
                isFollowing
                  ? "Following"
                  : "Follow"
              }
            </button>
          `
          : ""
      }

    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelector(".modal-close")
    ?.addEventListener("click", () => {
      modal.remove();
    });

  modal
    .querySelector("#followDynamic")
    ?.addEventListener("click", () => {
      toggleFollow(user.id);

      modal.remove();

      showUserProfile(user);
    });
}

function toggleFollow(userId) {
  if (!requireLogin()) return;

  if (userId === currentUserId) return;

  const index = DB.follows.findIndex(
    (follow) =>
      follow.followerId === currentUserId &&
      follow.followingId === userId
  );

  if (index >= 0) {
    DB.follows.splice(index, 1);

    showToast("Unfollowed.");
  } else {
    DB.follows.push({
      id: uid("follow"),
      followerId: currentUserId,
      followingId: userId,
      createdAt: now()
    });

    showToast("Following.");
  }

  saveDatabase();
  renderProfile();
}

/* =========================================================
   EDIT PROFILE
   ========================================================= */

function fillEditProfile() {
  const user = getCurrentUser();

  if (!user) return;

  if ($("editUsername")) {
    $("editUsername").value =
      user.username || "";
  }

  if ($("editFullName")) {
    $("editFullName").value =
      user.fullName || "";
  }

  if ($("editBio")) {
    $("editBio").value =
      user.bio || "";
  }
}

function saveProfile(form) {
  const user = getCurrentUser();

  if (!user) return;

  const username =
    $("editUsername")?.value
      ?.trim()
      .replace(/^@/, "")
      .toLowerCase() || "";

  const fullName =
    $("editFullName")?.value?.trim() || "";

  const bio =
    $("editBio")?.value?.trim() || "";

  const avatarInput =
    $("editAvatar");

  if (!username) {
    showToast(
      "Username cannot be empty.",
      "error"
    );
    return;
  }

  if (!fullName) {
    showToast(
      "Full name cannot be empty.",
      "error"
    );
    return;
  }

  const duplicate = DB.users.some(
    (item) =>
      item.id !== user.id &&
      item.username.toLowerCase() ===
        username
  );

  if (duplicate) {
    showToast(
      "That username is already used.",
      "error"
    );
    return;
  }

  const finish = (avatar) => {
    user.username = username;
    user.fullName = fullName;
    user.bio = bio;

    if (avatar) {
      user.avatar = avatar;
    }

    saveDatabase();

    form.reset();

    fillEditProfile();

    renderProfile();
    renderHome();
    renderStories();

    showPage("profilePage");

    showToast("Profile updated.");
  };

  if (avatarInput?.files?.length) {
    readFile(avatarInput.files[0])
      .then(finish)
      .catch(() => {
        showToast(
          "Could not read the image.",
          "error"
        );
      });
  } else {
    finish("");
  }
}

/* =========================================================
   WALLET
   ========================================================= */

function getWallet() {
  const user = getCurrentUser();

  if (!user) return null;

  if (!DB.wallet[user.id]) {
    DB.wallet[user.id] = {
      userId: user.id,
      coinBalance: 0,
      etbBalance: 0,
      telebirrNumber: "",
      telebirrName: "",
      mpesaNumber: "",
      mpesaName: "",
      createdAt: now(),
      updatedAt: now()
    };
  }

  return DB.wallet[user.id];
}

function updateWalletUI() {
  const wallet = getWallet();

  if (!wallet) return;

  const balanceElements = [
    $("walletBalance"),
    $("profileBalance")
  ];

  balanceElements.forEach((element) => {
    if (element) {
      element.textContent =
        money(wallet.etbBalance);
    }
  });

  const coinElements = [
    $("walletCoins"),
    $("profileCoins"),
    $("coinBalance")
  ];

  coinElements.forEach((element) => {
    if (element) {
      element.textContent =
        formatCoins(wallet.coinBalance);
    }
  });
}

function renderWallet() {
  const wallet = getWallet();

  if (!wallet) return;

  if ($("walletBalance")) {
    $("walletBalance").textContent =
      money(wallet.etbBalance);
  }

  if ($("walletCoins")) {
    $("walletCoins").textContent =
      formatCoins(wallet.coinBalance);
  }

  const walletPage = $("walletPage");

  if (walletPage) {
    const existingInfo =
      walletPage.querySelector(
        ".wallet-connection-info"
      );

    if (existingInfo) {
      existingInfo.remove();
    }

    const info = document.createElement("div");

    info.className =
      "wallet-connection-info info-box";

    info.innerHTML = `
      <strong>Payment wallets</strong>
      <br><br>

      Telebirr:
      ${
        wallet.telebirrNumber
          ? escapeHTML(
              wallet.telebirrNumber
            )
          : "Not connected"
      }

      <br>

      M-Pesa:
      ${
        wallet.mpesaNumber
          ? escapeHTML(wallet.mpesaNumber)
          : "Not connected"
      }
    `;

    walletPage.appendChild(info);
  }
}

function connectWallet() {
  if (!requireLogin()) return;

  const wallet = getWallet();

  const method =
    prompt(
      "Enter payment method: Telebirr or M-Pesa"
    );

  if (!method) return;

  const cleanMethod =
    method.trim().toLowerCase();

  if (
    cleanMethod !== "telebirr" &&
    cleanMethod !== "m-pesa" &&
    cleanMethod !== "mpesa"
  ) {
    showToast(
      "Use Telebirr or M-Pesa.",
      "error"
    );
    return;
  }

  const number =
    prompt("Enter your wallet phone number:");

  if (!number || !number.trim()) return;

  const name =
    prompt("Enter the wallet owner's name:");

  if (!name || !name.trim()) return;

  if (
    cleanMethod === "telebirr"
  ) {
    wallet.telebirrNumber =
      number.trim();

    wallet.telebirrName =
      name.trim();
  } else {
    wallet.mpesaNumber =
      number.trim();

    wallet.mpesaName =
      name.trim();
  }

  wallet.updatedAt = now();

  saveDatabase();

  renderWallet();

  showToast(
    `${method} wallet connected.`
  );
}

/* =========================================================
   DEPOSIT
   ========================================================= */

function depositMoney(form) {
  if (!requireLogin()) return;

  const wallet = getWallet();

  const amount =
    Number(
      $("depositAmount")?.value || 0
    );

  const reference =
    $("depositReference")?.value?.trim() ||
    "";

  if (!amount || amount <= 0) {
    showToast(
      "Enter a valid deposit amount.",
      "error"
    );
    return;
  }

  if (!reference) {
    showToast(
      "Enter the payment reference.",
      "error"
    );
    return;
  }

  /*
    Prototype behavior:
    The deposit is added locally.
    Real Telebirr/M-Pesa verification must
    be performed by a secure backend.
  */

  wallet.etbBalance += amount;
  wallet.updatedAt = now();

  DB.transactions.push({
    id: uid("deposit"),
    type: "deposit",
    userId: currentUserId,
    amount,
    reference,
    createdAt: now()
  });

  saveDatabase();

  form.reset();

  updateWalletUI();
  renderWallet();

  showPage("walletPage");

  showToast(
    `${money(amount)} added to your prototype wallet.`
  );
}

/* =========================================================
   WITHDRAW
   ========================================================= */

function withdrawMoney(form) {
  if (!requireLogin()) return;

  const wallet = getWallet();

  const amount =
    Number(
      $("withdrawAmount")?.value || 0
    );

  const number =
    $("withdrawNumber")?.value?.trim() ||
    "";

  const name =
    $("withdrawName")?.value?.trim() ||
    "";

  if (
    !amount ||
    amount < APP.withdrawalMinimum
  ) {
    showToast(
      `Minimum withdrawal is ${APP.withdrawalMinimum} ETB.`,
      "error"
    );
    return;
  }

  if (amount > wallet.etbBalance) {
    showToast(
      "Insufficient wallet balance.",
      "error"
    );
    return;
  }

  if (!number) {
    showToast(
      "Enter the wallet number.",
      "error"
    );
    return;
  }

  if (!name) {
    showToast(
      "Enter the wallet name.",
      "error"
    );
    return;
  }

  wallet.etbBalance -= amount;

  DB.transactions.push({
    id: uid("withdrawal"),
    type: "withdrawal",
    userId: currentUserId,
    amount,
    number,
    name,
    status: "pending",
    createdAt: now()
  });

  saveDatabase();

  form.reset();

  updateWalletUI();
  renderWallet();

  showPage("walletPage");

  showToast(
    `${money(amount)} withdrawal request created.`
  );
}

/* =========================================================
   COIN SHOP
   ========================================================= */

const COIN_PACKAGES = [
  {
    coins: 10,
    etb: 5
  },
  {
    coins: 50,
    etb: 25
  },
  {
    coins: 100,
    etb: 50
  },
  {
    coins: 250,
    etb: 125
  },
  {
    coins: 500,
    etb: 250
  },
  {
    coins: 1000,
    etb: 500
  },
  {
    coins: 2500,
    etb: 1250
  },
  {
    coins: 5000,
    etb: 2500
  }
];

function renderCoinShop() {
  const container = $("coinPackages");

  const wallet = getWallet();

  if (!container || !wallet) return;

  if ($("coinBalance")) {
    $("coinBalance").textContent =
      formatCoins(wallet.coinBalance);
  }

  container.innerHTML =
    COIN_PACKAGES.map(
      (pack) => `
        <div class="coin-package">

          <strong>
            ${pack.coins.toLocaleString()} coins
          </strong>

          <span>
            ${pack.etb.toLocaleString()} ETB
          </span>

          <button
            class="btn btn-green btn-small"
            data-buy-coins="${pack.coins}"
            data-coin-price="${pack.etb}"
          >
            Buy
          </button>

        </div>
      `
    ).join("");

  qsa("[data-buy-coins]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        buyCoins(
          Number(button.dataset.buyCoins),
          Number(button.dataset.coinPrice)
        );
      });
    }
  );
}

function buyCoins(coins, price) {
  if (!requireLogin()) return;

  const wallet = getWallet();

  if (wallet.etbBalance < price) {
    showToast(
      "Not enough ETB balance. Deposit first.",
      "error"
    );

    showPage("depositPage");

    return;
  }

  wallet.etbBalance -= price;

  wallet.coinBalance += coins;

  DB.transactions.push({
    id: uid("coinpurchase"),
    type: "coin_purchase",
    userId: currentUserId,
    coins,
    amount: price,
    createdAt: now()
  });

  saveDatabase();

  updateWalletUI();
  renderWallet();
  renderCoinShop();

  showToast(
    `${coins.toLocaleString()} coins purchased.`
  );
}

/* =========================================================
   ACCOUNT
   ========================================================= */

function renderAccountPage() {
  const user = getCurrentUser();

  if (!user) return;

  if ($("accountEmail")) {
    $("accountEmail").textContent =
      user.email || "";
  }

  if ($("accountId")) {
    $("accountId").textContent =
      user.id || "";
  }
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "success") {
  let container =
    $("toastContainer");

  if (!container) {
    container = document.createElement("div");

    container.id = "toastContainer";

    document.body.appendChild(container);
  }

  const toast =
    document.createElement("div");

  toast.className =
    "toast " + type;

  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/* =========================================================
   PERIODIC REFRESH
   ========================================================= */

setInterval(() => {
  if (getCurrentUser()) {
    renderStreams();
  }
}, 10000);

/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener("beforeunload", () => {
  if (localStream) {
    localStream.getTracks().forEach(
      (track) => track.stop()
    );
  }
});

/* =========================================================
   DEBUG ACCESS
   ========================================================= */

window.MENA = {
  APP,
  DB,
  showPage,
  renderAll,
  getCurrentUser,
  getWallet,
  saveDatabase,
  logout
};

/* =========================================================
   END MENA SCRIPT
   ========================================================= */
