/* =========================================================
   MENA APP — SCRIPT
   Frontend version
   ========================================================= */

"use strict";

/* -----------------------------
   APP DATA
----------------------------- */

const APP = {
  version: "1.0.0",
  coinValue: 0.5,
  withdrawalMinimum: 10,
  marketPostFee: 100,
  freeWorkPostFee: 100,
  giftPlatformPercent: 30,
  workPlatformPercent: 5
};

const gifts = [
  ["🌹", "Rose", 1],
  ["❤️", "Heart", 5],
  ["👍", "Like", 10],
  ["🔥", "Fire", 25],
  ["⭐", "Star", 50],
  ["💎", "Diamond", 100],
  ["🎁", "Gift", 250],
  ["☕", "Coffee", 500],
  ["🍫", "Chocolate", 750],
  ["🌸", "Flower", 1000],
  ["🦋", "Butterfly", 1500],
  ["🎈", "Balloon", 2000],
  ["🎂", "Cake", 2500],
  ["💐", "Flowers", 3000],
  ["👑", "Crown", 4000],
  ["🚀", "Rocket", 5000],
  ["🏆", "Trophy", 6000],
  ["💰", "Money", 7500],
  ["💍", "Ring", 8500],
  ["🎵", "Music", 10000],
  ["🛍️", "Shopping", 12000],
  ["🏎️", "Super Car", 14000],
  ["✈️", "Private Jet", 16000],
  ["🏠", "House", 18000],
  ["💎", "Big Diamond", 20000],
  ["🌍", "World", 22000],
  ["👑", "Royal Crown", 24000],
  ["🪙", "Gold", 25000],
  ["🚁", "Helicopter", 26000],
  ["🏰", "Castle", 27000]
];

/* -----------------------------
   DATABASE
----------------------------- */

const STORAGE_KEY = "MENA_DATABASE_V3";

let database = {
  user: null,

  users: [],

  posts: [],

  streams: [],

  market: [],

  work: [],

  notifications: [],

  wallet: {
    provider: null,
    number: "",
    name: "",
    connected: false
  },

  balance: 0,

  coins: 0
};

/* -----------------------------
   LOAD DATABASE
----------------------------- */

function loadDatabase() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      database = {
        ...database,
        ...parsed,
        wallet: {
          ...database.wallet,
          ...(parsed.wallet || {})
        }
      };
    }
  } catch (error) {
    console.error("Database loading error:", error);
  }
}

/* -----------------------------
   SAVE DATABASE
----------------------------- */

function saveDatabase() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(database)
    );
  } catch (error) {
    console.error("Database saving error:", error);
  }
}

/* -----------------------------
   HELPERS
----------------------------- */

function $(id) {
  return document.getElementById(id);
}

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return [...document.querySelectorAll(selector)];
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uid(prefix = "id") {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function showMessage(message) {
  alert(message);
}

function getCurrentUser() {
  return database.user;
}

/* -----------------------------
   INITIALIZATION
----------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  loadDatabase();
  initializeApp();
});

function initializeApp() {
  setupNavigation();
  setupButtons();
  renderHome();
  renderProfile();
  renderMarket();
  renderWork();
  updateWalletUI();
}

/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

  const homeBtn = $("homeBtn");
  const marketBtn = $("marketBtn");
  const workBtn = $("workBtn");
  const profileBtn = $("profileBtn");
  const addBtn = $("addBtn");
  const settingsBtn = $("settingsBtn");
  const searchBtn = $("searchBtn");

  if (homeBtn) {
    homeBtn.addEventListener("click", () => showPage("homePage"));
  }

  if (marketBtn) {
    marketBtn.addEventListener("click", () => showPage("marketPage"));
  }

  if (workBtn) {
    workBtn.addEventListener("click", () => showPage("workPage"));
  }

  if (profileBtn) {
    profileBtn.addEventListener("click", () => showPage("profilePage"));
  }

  if (addBtn) {
    addBtn.addEventListener("click", openCreateMenu);
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", openSettings);
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", openSearch);
  }
}

function showPage(pageId) {

  qsa(".page").forEach(page => {
    page.classList.remove("active");
  });

  const page = $(pageId);

  if (page) {
    page.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   BUTTON SETUP
========================================================= */

function setupButtons() {

  document.addEventListener("click", event => {

    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    switch (action) {

      case "like":
        likePost(id);
        break;

      case "comment":
        commentPost(id);
        break;

      case "share":
        sharePost(id);
        break;

      case "follow":
        followUser(id);
        break;

      case "gift":
        openGiftMenu(id);
        break;

      case "stream":
        openStream(id);
        break;

      case "buyCoins":
        openCoinShop();
        break;

      case "deposit":
        openDeposit();
        break;

      case "withdraw":
        openWithdraw();
        break;

      case "wallet":
        openWallet();
        break;

      case "editProfile":
        editProfile();
        break;

      case "logout":
        logout();
        break;

      case "signup":
        openSignup();
        break;

      case "login":
        openLogin();
        break;
    }
  });
}

/* =========================================================
   SIGN UP
========================================================= */

function openSignup() {

  const name = prompt("Enter your name:");

  if (!name) return;

  const username = prompt("Choose your username:");

  if (!username) return;

  const phone = prompt("Enter your phone number:");

  if (!phone) return;

  const accountType = prompt(
    "Choose account type:\n\n1 = Personal\n2 = Business"
  );

  const type =
    accountType === "2"
      ? "business"
      : "personal";

  const user = {
    id: uid("user"),
    name: name.trim(),
    username: username.trim().replace(/\s+/g, ""),
    phone: phone.trim(),
    accountType: type,
    bio: "",
    avatar: "",
    followers: 0,
    following: 0,
    posts: 0,
    createdAt: new Date().toISOString()
  };

  database.user = user;
  database.users.push(user);

  database.balance = 0;
  database.coins = 0;

  saveDatabase();

  showMessage("MENA account created successfully.");

  renderProfile();
  renderHome();
}

/* =========================================================
   LOGIN
========================================================= */

function openLogin() {

  if (database.user) {
    showMessage(
      `You are already logged in as @${database.user.username}`
    );
    return;
  }

  const username = prompt("Enter your username:");

  if (!username) return;

  const found = database.users.find(
    user =>
      user.username.toLowerCase() ===
      username.toLowerCase()
  );

  if (!found) {
    showMessage(
      "Account not found on this device. Please create an account first."
    );
    return;
  }

  database.user = found;

  saveDatabase();

  showMessage("Welcome back to MENA.");

  renderProfile();
  renderHome();
}

/* =========================================================
   LOGOUT
========================================================= */

function logout() {

  if (!confirm("Log out of this MENA account?")) {
    return;
  }

  database.user = null;

  saveDatabase();

  showMessage("You have been logged out.");

  renderProfile();
}

/* =========================================================
   PROFILE
========================================================= */

function renderProfile() {

  const user = getCurrentUser();

  const name = $("profileName");
  const username = $("profileUsername");
  const avatar = $("profileAvatar");
  const balance = $("profileBalance");
  const coins = $("profileCoins");

  if (!user) {

    if (name) name.textContent = "Guest";
    if (username) username.textContent = "Create an account";
    if (balance) balance.textContent = "0 ETB";
    if (coins) coins.textContent = "0";

    return;
  }

  if (name) {
    name.textContent = user.name;
  }

  if (username) {
    username.textContent =
      "@" + user.username;
  }

  if (avatar) {

    if (user.avatar) {
      avatar.src = user.avatar;
    }
  }

  if (balance) {
    balance.textContent =
      money(database.balance) + " ETB";
  }

  if (coins) {
    coins.textContent =
      database.coins;
  }
}

/* =========================================================
   EDIT PROFILE
========================================================= */

function editProfile() {

  if (!database.user) {
    openSignup();
    return;
  }

  const name = prompt(
    "New name:",
    database.user.name
  );

  if (name) {
    database.user.name = name.trim();
  }

  const username = prompt(
    "New username:",
    database.user.username
  );

  if (username) {
    database.user.username =
      username.trim().replace(/\s+/g, "");
  }

  const bio = prompt(
    "Bio:",
    database.user.bio || ""
  );

  if (bio !== null) {
    database.user.bio = bio;
  }

  saveDatabase();

  renderProfile();

  showMessage("Profile updated.");
}

/* =========================================================
   PROFILE PHOTO
========================================================= */

function changeProfilePhoto() {

  if (!database.user) {
    openSignup();
    return;
  }

  const input = document.createElement("input");

  input.type = "file";
  input.accept = "image/*";
  input.capture = "user";

  input.onchange = event => {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {

      database.user.avatar = reader.result;

      saveDatabase();

      renderProfile();

      showMessage(
        "Profile picture updated."
      );
    };

    reader.readAsDataURL(file);
  };

  input.click();
}

/* =========================================================
   CREATE MENU
========================================================= */

function openCreateMenu() {

  const choice = prompt(
    "MENA CREATE\n\n" +
    "1 = Photo / Video Post\n" +
    "2 = Start Streaming\n" +
    "3 = Marketplace Post\n" +
    "4 = Free Work Post"
  );

  switch (choice) {

    case "1":
      createPost();
      break;

    case "2":
      createStream();
      break;

    case "3":
      createMarketPost();
      break;

    case "4":
      createWorkPost();
      break;
  }
}

/* =========================================================
   CREATE POST
========================================================= */

function createPost() {

  if (!database.user) {
    openSignup();
    return;
  }

  const caption = prompt(
    "Write your post caption:"
  );

  if (caption === null) return;

  const input = document.createElement("input");

  input.type = "file";
  input.accept =
    "image/*,video/*";

  input.capture = "environment";

  input.onchange = event => {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {

      const post = {
        id: uid("post"),
        userId: database.user.id,
        username: database.user.username,
        name: database.user.name,
        avatar: database.user.avatar || "",
        caption,
        media: reader.result,
        mediaType:
          file.type.startsWith("video")
            ? "video"
            : "image",
        likes: 0,
        comments: [],
        shares: 0,
        followers: [],
        createdAt: new Date().toISOString()
      };

      database.posts.unshift(post);

      database.user.posts =
        (database.user.posts || 0) + 1;

      saveDatabase();

      renderHome();

      showMessage(
        "Your post was created."
      );
    };

    reader.readAsDataURL(file);
  };

  input.click();
}

/* =========================================================
   HOME FEED
========================================================= */

function renderHome() {

  const container = $("feed");

  if (!container) return;

  if (!database.posts.length) {

    container.innerHTML = `
      <div class="empty-state">
        <h3>Welcome to MENA</h3>
        <p>No posts yet.</p>
        <button onclick="createPost()">
          Create your first post
        </button>
      </div>
    `;

    return;
  }

  container.innerHTML =
    database.posts
      .map(renderPost)
      .join("");
}

function renderPost(post) {

  const media =
    post.mediaType === "video"
      ? `
        <video
          class="post-media"
          controls
          playsinline
          src="${post.media}">
        </video>
      `
      : `
        <img
          class="post-media"
          src="${post.media}"
          alt="MENA post">
      `;

  const comments =
    (post.comments || [])
      .slice(-3)
      .map(comment => `
        <div class="comment">
          <b>${escapeHTML(comment.name)}</b>
          <span>${escapeHTML(comment.text)}</span>
        </div>
      `)
      .join("");

  return `
    <article class="post-card">

      <div class="post-header">

        <div class="post-user">

          <div class="avatar">
            ${
              post.avatar
                ? `<img src="${post.avatar}">`
                : "M"
            }
          </div>

          <div>
            <strong>
              ${escapeHTML(post.name)}
            </strong>

            <small>
              @${escapeHTML(post.username)}
            </small>
          </div>

        </div>

        <button
          data-action="follow"
          data-id="${post.userId}">
          Follow
        </button>

      </div>

      ${media}

      <div class="post-content">

        <p>
          ${escapeHTML(post.caption)}
        </p>

        <div class="post-actions">

          <button
            data-action="like"
            data-id="${post.id}">
            ❤️ ${post.likes}
          </button>

          <button
            data-action="comment"
            data-id="${post.id}">
            💬 ${post.comments.length}
          </button>

          <button
            data-action="share"
            data-id="${post.id}">
            ↗️ ${post.shares}
          </button>

          <button
            data-action="gift"
            data-id="${post.id}">
            🎁 Gift
          </button>

        </div>

        <div class="comments">
          ${comments}
        </div>

      </div>

    </article>
  `;
}

/* =========================================================
   LIKE
========================================================= */

function likePost(postId) {

  const post =
    database.posts.find(
      p => p.id === postId
    );

  if (!post) return;

  post.likes++;

  saveDatabase();

  renderHome();
}

/* =========================================================
   COMMENT
========================================================= */

function commentPost(postId) {

  const post =
    database.posts.find(
      p => p.id === postId
    );

  if (!post) return;

  if (!database.user) {
    openSignup();
    return;
  }

  const text = prompt(
    "Write your comment:"
  );

  if (!text) return;

  post.comments.push({
    id: uid("comment"),
    userId: database.user.id,
    name: database.user.name,
    text: text.trim(),
    createdAt: new Date().toISOString()
  });

  saveDatabase();

  renderHome();
}

/* =========================================================
   SHARE
========================================================= */

async function sharePost(postId) {

  const post =
    database.posts.find(
      p => p.id === postId
    );

  if (!post) return;

  post.shares++;

  saveDatabase();

  const shareText =
    `Check this post on MENA: ${post.caption}`;

  if (navigator.share) {

    try {

      await navigator.share({
        title: "MENA",
        text: shareText
      });

    } catch (error) {
      console.log("Share cancelled.");
    }

  } else {

    try {

      await navigator.clipboard.writeText(
        shareText
      );

      showMessage(
        "Post information copied."
      );

    } catch {
      showMessage(shareText);
    }
  }

  renderHome();
}

/* =========================================================
   FOLLOW
========================================================= */

function followUser(userId) {

  if (!database.user) {
    openSignup();
    return;
  }

  if (
    userId === database.user.id
  ) {
    showMessage(
      "You cannot follow yourself."
    );
    return;
  }

  const user =
    database.users.find(
      u => u.id === userId
    );

  if (!user) return;

  database.user.following =
    (database.user.following || 0) + 1;

  user.followers =
    (user.followers || 0) + 1;

  saveDatabase();

  showMessage(
    `You followed @${user.username}`
  );

  renderHome();
}

/* =========================================================
   GIFTS
========================================================= */

function openGiftMenu(targetId) {

  if (!database.user) {
    openSignup();
    return;
  }

  let menu =
    "SELECT GIFT\n\n";

  gifts.forEach(
    (gift, index) => {
      menu +=
        `${index + 1}. ${gift[0]} ${gift[1]} — ${gift[2]} coins\n`;
    }
  );

  const choice =
    Number(prompt(menu));

  if (
    !choice ||
    choice < 1 ||
    choice > gifts.length
  ) {
    return;
  }

  const gift = gifts[choice - 1];

  sendGift(
    targetId,
    gift
  );
}

function sendGift(targetId, gift) {

  const [emoji, name, price] = gift;

  if (database.coins < price) {

    showMessage(
      `Not enough coins.\n\n` +
      `This gift costs ${price} coins.\n` +
      `You have ${database.coins} coins.`
    );

    return;
  }

  database.coins -= price;

  const receiverCoins =
    Math.floor(
      price *
      (1 - APP.giftPlatformPercent / 100)
    );

  database.notifications.unshift({
    id: uid("notification"),
    type: "gift",
    gift: name,
    coins: price,
    receiverCoins,
    createdAt:
      new Date().toISOString()
  });

  saveDatabase();

  updateWalletUI();

  showMessage(
    `${emoji} ${name} sent!\n\n` +
    `Spent: ${price} coins\n` +
    `Platform share: ${APP.giftPlatformPercent}%\n` +
    `Creator share: ${receiverCoins} coins`
  );
}

/* =========================================================
   COIN SHOP
========================================================= */

function openCoinShop() {

  const amount =
    Number(
      prompt(
        "COIN SHOP\n\n" +
        "1 coin = 0.50 ETB\n\n" +
        "Enter coins to buy:"
      )
    );

  if (
    !amount ||
    amount < 10
  ) {
    showMessage(
      "Minimum purchase is 10 coins."
    );
    return;
  }

  const cost =
    amount * APP.coinValue;

  const provider =
    prompt(
      `Buy ${amount} coins for ${money(cost)} ETB.\n\n` +
      "1 = Telebirr\n" +
      "2 = M-Pesa"
    );

  if (
    provider !== "1" &&
    provider !== "2"
  ) {
    return;
  }

  const payment =
    provider === "1"
      ? "Telebirr"
      : "M-Pesa";

  showMessage(
    `${payment} payment page would open here.\n\n` +
    `Amount: ${money(cost)} ETB\n` +
    `Coins: ${amount}`
  );

  /*
    IMPORTANT:
    Real Telebirr/M-Pesa payment must be
    processed by a secure backend/API.

    Never put payment secret keys here.
  */
}

/* =========================================================
   WALLET
========================================================= */

function openWallet() {

  if (!database.user) {
    openSignup();
    return;
  }

  const provider =
    prompt(
      "Choose wallet:\n\n" +
      "1 = Telebirr\n" +
      "2 = M-Pesa"
    );

  if (
    provider !== "1" &&
    provider !== "2"
  ) {
    return;
  }

  const walletName =
    prompt(
      "Wallet account name:"
    );

  if (!walletName) return;

  const number =
    prompt(
      "Telebirr/M-Pesa number:"
    );

  if (!number) return;

  database.wallet = {
    provider:
      provider === "1"
        ? "Telebirr"
        : "M-Pesa",

    number: number.trim(),

    name: walletName.trim(),

    connected: true
  };

  saveDatabase();

  showMessage(
    "Wallet connected on this device."
  );
}

/* =========================================================
   DEPOSIT
========================================================= */

function openDeposit() {

  if (!database.user) {
    openSignup();
    return;
  }

  const provider =
    prompt(
      "DEPOSIT\n\n" +
      "1 = Telebirr\n" +
      "2 = M-Pesa"
    );

  if (
    provider !== "1" &&
    provider !== "2"
  ) {
    return;
  }

  const amount =
    Number(
      prompt("Enter deposit amount in ETB:")
    );

  if (
    !amount ||
    amount <= 0
  ) {
    return;
  }

  const method =
    provider === "1"
      ? "Telebirr"
      : "M-Pesa";

  showMessage(
    `${method} deposit request\n\n` +
    `Amount: ${money(amount)} ETB\n\n` +
    "A real payment gateway must be connected here."
  );
}

/* =========================================================
   WITHDRAW
========================================================= */

function openWithdraw() {

  if (!database.user) {
    openSignup();
    return;
  }

  if (!database.wallet.connected) {

    showMessage(
      "Connect your Telebirr or M-Pesa wallet first."
    );

    openWallet();

    return;
  }

  const amount =
    Number(
      prompt(
        `Available balance: ${money(database.balance)} ETB\n\n` +
        `Minimum withdrawal: ${APP.withdrawalMinimum} ETB\n\n` +
        "Enter withdrawal amount:"
      )
    );

  if (
    !amount ||
    amount < APP.withdrawalMinimum
  ) {

    showMessage(
      `Minimum withdrawal is ${APP.withdrawalMinimum} ETB.`
    );

    return;
  }

  if (
    amount > database.balance
  ) {

    showMessage(
      "Insufficient balance."
    );

    return;
  }

  showMessage(
    `Withdrawal request created.\n\n` +
    `Amount: ${money(amount)} ETB\n` +
    `Method: ${database.wallet.provider}\n` +
    `Number: ${database.wallet.number}\n\n` +
    "A real backend/payment API is required to send the money."
  );
}

/* =========================================================
   UPDATE WALLET UI
========================================================= */

function updateWalletUI() {

  const balance =
    $("walletBalance");

  const coins =
    $("coinBalance");

  if (balance) {
    balance.textContent =
      money(database.balance) +
      " ETB";
  }

  if (coins) {
    coins.textContent =
      database.coins;
  }
}

/* =========================================================
   STREAMING
========================================================= */

function createStream() {

  if (!database.user) {
    openSignup();
    return;
  }

  const streamName =
    prompt(
      "Enter stream name:"
    );

  if (!streamName) return;

  const stream = {
    id: uid("stream"),
    userId: database.user.id,
    name: database.user.name,
    username: database.user.username,
    title: streamName,
    viewers: 0,
    likes: 0,
    comments: [],
    gifts: [],
    startedAt:
      new Date().toISOString(),
    live: true
  };

  database.streams.unshift(stream);

  saveDatabase();

  startCamera();

  showMessage(
    "Live stream created.\n\n" +
    "Camera and microphone permission will be requested."
  );

  renderStreams();
}

function startCamera() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    showMessage(
      "Camera access is not supported by this browser."
    );

    return;
  }

  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true
    })
    .then(stream => {

      let video =
        $("streamVideo");

      if (!video) {

        video =
          document.createElement("video");

        video.id =
          "streamVideo";

        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;

        video.style.width =
          "100%";

        video.style.borderRadius =
          "18px";

        document.body.prepend(video);
      }

      video.srcObject = stream;

    })
    .catch(error => {

      console.error(error);

      showMessage(
        "Camera/microphone permission was not granted."
      );
    });
}

function renderStreams() {

  const container =
    $("liveContainer");

  if (!container) return;

  const liveStreams =
    database.streams.filter(
      stream => stream.live
    );

  if (!liveStreams.length) {

    container.innerHTML =
      "<p>No one is live right now.</p>";

    return;
  }

  container.innerHTML =
    liveStreams
      .map(stream => `
        <div class="live-card">

          <span class="live-badge">
            LIVE
          </span>

          <h3>
            ${escapeHTML(stream.title)}
          </h3>

          <p>
            @${escapeHTML(stream.username)}
          </p>

          <button
            data-action="stream"
            data-id="${stream.id}">
            Join Stream
          </button>

        </div>
      `)
      .join("");
}

function openStream(streamId) {

  const stream =
    database.streams.find(
      s => s.id === streamId
    );

  if (!stream) return;

  stream.viewers++;

  saveDatabase();

  startCamera();

  showMessage(
    `Joined: ${stream.title}\n\n` +
    "Stream chat, guest requests and gifts are available in the live interface."
  );
}

/* =========================================================
   MARKETPLACE
========================================================= */

function createMarketPost() {

  if (!database.user) {
    openSignup();
    return;
  }

  const feeConfirmed =
    confirm(
      "Marketplace listing fee: 100 ETB.\n\n" +
      "Continue?"
    );

  if (!feeConfirmed) return;

  const title =
    prompt("Product name:");

  if (!title) return;

  const price =
    Number(
      prompt("Product price in ETB:")
    );

  if (
    !price ||
    price <= 0
  ) {
    return;
  }

  const description =
    prompt("Product description:");

  const location =
    prompt("Product location:");

  const phone =
    prompt("Seller phone number:");

  const input =
    document.createElement("input");

  input.type = "file";
  input.accept = "image/*";

  input.onchange = event => {

    const file =
      event.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {

      const item = {

        id: uid("market"),

        sellerId:
          database.user.id,

        seller:
          database.user.name,

        title,

        price,

        description:
          description || "",

        location:
          location || "",

        phone:
          phone || "",

        image:
          reader.result,

        createdAt:
          new Date().toISOString()
      };

      database.market.unshift(item);

      saveDatabase();

      renderMarket();

      showMessage(
        "Marketplace listing created.\n\n" +
        "The 100 ETB fee requires a real payment gateway before production."
      );
    };

    reader.readAsDataURL(file);
  };

  input.click();
}

function renderMarket() {

  const container =
    $("marketContainer");

  if (!container) return;

  if (!database.market.length) {

    container.innerHTML = `
      <div class="empty-state">
        <h3>Marketplace</h3>
        <p>No products listed yet.</p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    database.market
      .map(item => `
        <article class="market-card">

          ${
            item.image
              ? `<img src="${item.image}" alt="${escapeHTML(item.title)}">`
              : ""
          }

          <div class="market-info">

            <h3>
              ${escapeHTML(item.title)}
            </h3>

            <strong>
              ${money(item.price)} ETB
            </strong>

            <p>
              ${escapeHTML(item.description)}
            </p>

            <small>
              📍 ${escapeHTML(item.location)}
            </small>

            <br>

            <small>
              Seller: ${escapeHTML(item.seller)}
            </small>

            <br><br>

            <a
              href="tel:${escapeHTML(item.phone)}">
              📞 Contact seller
            </a>

          </div>

        </article>
      `)
      .join("");
}

/* =========================================================
   FREE WORK
========================================================= */

function createWorkPost() {

  if (!database.user) {
    openSignup();
    return;
  }

  const title =
    prompt("Job / work title:");

  if (!title) return;

  const details =
    prompt("Explain the work:");

  const materialAmount =
    Number(
      prompt(
        "Material amount in ETB (enter 0 if none):"
      )
    ) || 0;

  const contact =
    prompt("Employer contact:");

  const location =
    prompt("Work location:");

  const item = {

    id: uid("work"),

    employerId:
      database.user.id,

    employer:
      database.user.name,

    title,

    details:
      details || "",

    materialAmount,

    platformFee:
      materialAmount *
      (APP.workPlatformPercent / 100),

    contact:
      contact || "",

    location:
      location || "",

    createdAt:
      new Date().toISOString()
  };

  database.work.unshift(item);

  saveDatabase();

  renderWork();

  showMessage(
    "Free Work listing created.\n\n" +
    "Posting fee: 100 ETB\n" +
    "Platform material fee: 5%"
  );
}

function renderWork() {

  const container =
    $("workContainer");

  if (!container) return;

  if (!database.work.length) {

    container.innerHTML = `
      <div class="empty-state">
        <h3>Free Work</h3>
        <p>No work opportunities posted yet.</p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    database.work
      .map(job => `
        <article class="work-card">

          <h3>
            ${escapeHTML(job.title)}
          </h3>

          <p>
            ${escapeHTML(job.details)}
          </p>

          <p>
            👤 ${escapeHTML(job.employer)}
          </p>

          <p>
            📍 ${escapeHTML(job.location)}
          </p>

          ${
            job.materialAmount > 0
              ? `
                <p>
                  Material:
                  ${money(job.materialAmount)} ETB
                </p>
              `
              : ""
          }

          <a
            href="tel:${escapeHTML(job.contact)}">
            📞 Contact employer
          </a>

        </article>
      `)
      .join("");
}

/* =========================================================
   SEARCH
========================================================= */

function openSearch() {

  const query =
    prompt(
      "Search MENA:"
    );

  if (!query) return;

  const q =
    query.toLowerCase().trim();

  const posts =
    database.posts.filter(post =>
      (
        post.caption +
        " " +
        post.name +
        " " +
        post.username
      )
        .toLowerCase()
        .includes(q)
    );

  const market =
    database.market.filter(item =>
      (
        item.title +
        " " +
        item.description +
        " " +
        item.location
      )
        .toLowerCase()
        .includes(q)
    );

  const work =
    database.work.filter(item =>
      (
        item.title +
        " " +
        item.details +
        " " +
        item.location
      )
        .toLowerCase()
        .includes(q)
    );

  showSearchResults(
    posts,
    market,
    work,
    query
  );
}

function showSearchResults(
  posts,
  market,
  work,
  query
) {

  let html = `
    <div class="search-results">

      <h2>
        Search: ${escapeHTML(query)}
      </h2>

      <h3>
        Posts (${posts.length})
      </h3>
  `;

  if (!posts.length) {
    html += "<p>No posts found.</p>";
  }

  posts.forEach(post => {

    html += `
      <div class="search-item">

        <b>
          ${escapeHTML(post.name)}
        </b>

        <p>
          ${escapeHTML(post.caption)}
        </p>

      </div>
    `;
  });

  html += `
      <h3>
        Market (${market.length})
      </h3>
  `;

  if (!market.length) {
    html += "<p>No products found.</p>";
  }

  market.forEach(item => {

    html += `
      <div class="search-item">

        <b>
          ${escapeHTML(item.title)}
        </b>

        <p>
          ${money(item.price)} ETB
        </p>

      </div>
    `;
  });

  html += `
      <h3>
        Free Work (${work.length})
      </h3>
  `;

  if (!work.length) {
    html += "<p>No work found.</p>";
  }

  work.forEach(item => {

    html += `
      <div class="search-item">

        <b>
          ${escapeHTML(item.title)}
        </b>

        <p>
          ${escapeHTML(item.location)}
        </p>

      </div>
    `;
  });

  html += "</div>";

  const page =
    $("searchResults");

  if (page) {

    page.innerHTML = html;

    showPage("searchPage");

  } else {

    showMessage(
      `Found ${posts.length} posts, ` +
      `${market.length} products and ` +
      `${work.length} jobs.`
    );
  }
}

/* =========================================================
   SETTINGS
========================================================= */

function openSettings() {

  const choice =
    prompt(
      "MENA SETTINGS\n\n" +

      "1 = Edit profile\n" +
      "2 = Change profile photo\n" +
      "3 = Connect Telebirr/M-Pesa\n" +
      "4 = Coin Shop\n" +
      "5 = Deposit\n" +
      "6 = Withdraw\n" +
      "7 = Account information\n" +
      "8 = Logout"
    );

  switch (choice) {

    case "1":
      editProfile();
      break;

    case "2":
      changeProfilePhoto();
      break;

    case "3":
      openWallet();
      break;

    case "4":
      openCoinShop();
      break;

    case "5":
      openDeposit();
      break;

    case "6":
      openWithdraw();
      break;

    case "7":
      accountInformation();
      break;

    case "8":
      logout();
      break;
  }
}

function accountInformation() {

  if (!database.user) {
    showMessage(
      "You are not logged in."
    );
    return;
  }

  showMessage(
    `MENA ACCOUNT\n\n` +
    `Name: ${database.user.name}\n` +
    `Username: @${database.user.username}\n` +
    `Phone: ${database.user.phone}\n` +
    `Type: ${database.user.accountType}\n\n` +
    `Balance: ${money(database.balance)} ETB\n` +
    `Coins: ${database.coins}`
  );
}

/* =========================================================
   ADD COINS — DEMO ONLY
========================================================= */

function addDemoCoins() {

  if (!database.user) {
    openSignup();
    return;
  }

  const amount =
    Number(
      prompt(
        "DEMO ONLY\n\n" +
        "Enter coins to add:"
      )
    );

  if (!amount || amount <= 0) return;

  database.coins +=
    Math.floor(amount);

  saveDatabase();

  updateWalletUI();

  showMessage(
    `${amount} demo coins added.`
  );
}

/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

  const video =
    $("streamVideo");

  if (!video) return;

  const stream =
    video.srcObject;

  if (!stream) return;

  stream
    .getTracks()
    .forEach(track => track.stop());

  video.srcObject = null;
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function showNotifications() {

  if (!database.notifications.length) {

    showMessage(
      "No notifications."
    );

    return;
  }

  const text =
    database.notifications
      .slice(0, 20)
      .map(item => {

        if (item.type === "gift") {

          return (
            `🎁 ${item.gift} — ` +
            `${item.coins} coins`
          );
        }

        return "MENA notification";
      })
      .join("\n");

  showMessage(text);
}

/* =========================================================
   RESET LOCAL DATA
========================================================= */

function resetMenaData() {

  const confirmed =
    confirm(
      "This will remove MENA data stored on this device.\n\nContinue?"
    );

  if (!confirmed) return;

  localStorage.removeItem(
    STORAGE_KEY
  );

  location.reload();
}

/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.createPost = createPost;
window.createStream = createStream;
window.createMarketPost = createMarketPost;
window.createWorkPost = createWorkPost;

window.openSignup = openSignup;
window.openLogin = openLogin;

window.openSettings = openSettings;
window.openWallet = openWallet;
window.openDeposit = openDeposit;
window.openWithdraw = openWithdraw;
window.openCoinShop = openCoinShop;

window.editProfile = editProfile;
window.changeProfilePhoto =
  changeProfilePhoto;

window.showNotifications =
  showNotifications;

window.addDemoCoins =
  addDemoCoins;

window.resetMenaData =
  resetMenaData;

window.stopCamera =
  stopCamera;

/* =========================================================
   FINISH
========================================================= */

console.log(
  `MENA ${APP.version} loaded successfully.`
);
