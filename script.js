/* =========================================================
   MENA — FINAL FRONTEND
   Supabase + Storage + Secure Edge Functions
   ========================================================= */

"use strict";

/* =========================================================
   1. SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://ryywkqyeoftuejczeqgg.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_E6S3EtoGbEqA_XkRpJhYpA_g8SvjMeH";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================================================
   2. HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

let currentUser = null;
let currentProfile = null;
let currentPage = "home";
let pendingAction = null;

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return `${Number(value || 0).toFixed(2)} ETB`;
}

function coins(value) {
  return Number(value || 0).toLocaleString();
}

function toast(message, type = "normal") {
  const old = document.querySelector(".mena-toast");
  if (old) old.remove();

  const div = document.createElement("div");

  div.className = `mena-toast ${type}`;

  div.textContent = message;

  Object.assign(div.style, {
    position: "fixed",
    left: "50%",
    bottom: "88px",
    transform: "translateX(-50%)",
    zIndex: "9999",
    padding: "13px 18px",
    borderRadius: "12px",
    background:
      type === "error"
        ? "#c62828"
        : type === "success"
        ? "#087f5b"
        : "#222",
    color: "#fff",
    boxShadow: "0 5px 25px #0004",
    maxWidth: "90%",
    textAlign: "center"
  });

  document.body.appendChild(div);

  setTimeout(() => div.remove(), 2800);
}

function loading(text = "Loading...") {
  return `
    <div class="empty">
      <div style="font-size:28px">⏳</div>
      <p>${escapeHTML(text)}</p>
    </div>
  `;
}


/* =========================================================
   3. AUTH
   ========================================================= */

async function getUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error(error);
    return null;
  }

  return data?.user || null;
}

async function loadProfile() {
  if (!currentUser) {
    currentProfile = null;
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  currentProfile = data;
  return data;
}

function requireLogin(action) {
  if (currentUser) return true;

  pendingAction = action;

  openAuthModal();

  return false;
}


/* =========================================================
   4. AUTH MODAL
   ========================================================= */

function openAuthModal() {
  const modal = $("modal");

  if (!modal) return;

  modal.classList.remove("hidden");

  modal.innerHTML = `
    <div class="sheet">

      <button
        class="close"
        id="closeAuth"
        type="button"
      >×</button>

      <h2>Welcome to MENA</h2>

      <p class="muted" style="margin-top:8px">
        Create an account or login to continue.
      </p>

      <div class="tabs" style="margin-top:18px">

        <button
          class="tab active"
          id="loginTab"
          type="button"
        >
          Login
        </button>

        <button
          class="tab"
          id="signupTab"
          type="button"
        >
          Sign Up
        </button>

      </div>

      <div id="authArea"></div>

    </div>
  `;

  $("closeAuth").onclick = closeModal;

  $("loginTab").onclick = () => {
    $("loginTab").classList.add("active");
    $("signupTab").classList.remove("active");
    renderLoginForm();
  };

  $("signupTab").onclick = () => {
    $("signupTab").classList.add("active");
    $("loginTab").classList.remove("active");
    renderSignupForm();
  };

  renderLoginForm();
}

function renderLoginForm() {
  $("authArea").innerHTML = `
    <form id="loginForm">

      <label>Email</label>
      <input
        id="loginEmail"
        type="email"
        autocomplete="email"
        required
      >

      <label>Password</label>
      <input
        id="loginPassword"
        type="password"
        autocomplete="current-password"
        required
      >

      <button
        class="full-button"
        type="submit"
      >
        Login
      </button>

      <div id="loginMessage"></div>

    </form>
  `;

  $("loginForm").onsubmit = login;
}

function renderSignupForm() {
  $("authArea").innerHTML = `
    <form id="signupForm">

      <label>Name</label>
      <input
        id="signupName"
        required
        maxlength="60"
      >

      <label>Email</label>
      <input
        id="signupEmail"
        type="email"
        autocomplete="email"
        required
      >

      <label>Password</label>
      <input
        id="signupPassword"
        type="password"
        autocomplete="new-password"
        minlength="6"
        required
      >

      <label>Confirm password</label>
      <input
        id="signupPassword2"
        type="password"
        autocomplete="new-password"
        minlength="6"
        required
      >

      <button
        class="full-button"
        type="submit"
      >
        Create Account
      </button>

      <div id="signupMessage"></div>

    </form>
  `;

  $("signupForm").onsubmit = signup;
}

async function login(event) {
  event.preventDefault();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  const message = $("loginMessage");

  message.innerHTML = loading("Logging in...");

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    message.innerHTML = `
      <div class="notice error">
        ${escapeHTML(error.message)}
      </div>
    `;
    return;
  }

  currentUser = data.user;

  await loadProfile();

  closeModal();

  toast("Welcome back!", "success");

  await runPendingAction();
}

async function signup(event) {
  event.preventDefault();

  const name = $("signupName").value.trim();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;
  const password2 = $("signupPassword2").value;

  const message = $("signupMessage");

  if (password !== password2) {
    message.innerHTML = `
      <div class="notice error">
        Passwords do not match.
      </div>
    `;
    return;
  }

  message.innerHTML = loading("Creating account...");

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    });

  if (error) {
    message.innerHTML = `
      <div class="notice error">
        ${escapeHTML(error.message)}
      </div>
    `;
    return;
  }

  currentUser = data.user;

  if (!currentUser) {
    message.innerHTML = `
      <div class="notice success">
        Check your email to confirm your account.
      </div>
    `;
    return;
  }

  await loadProfile();

  closeModal();

  toast("Account created!", "success");

  await runPendingAction();
}

async function logout() {
  await supabase.auth.signOut();

  currentUser = null;
  currentProfile = null;

  toast("Logged out");

  navigate("home");
}

async function runPendingAction() {
  const action = pendingAction;

  pendingAction = null;

  if (typeof action === "function") {
    await action();
  }
}


/* =========================================================
   5. MODAL
   ========================================================= */

function closeModal() {
  const modal = $("modal");

  if (!modal) return;

  modal.classList.add("hidden");
  modal.innerHTML = "";
}

function showSheet(title, content) {
  const modal = $("modal");

  modal.classList.remove("hidden");

  modal.innerHTML = `
    <div class="sheet">

      <button
        class="close"
        id="sheetClose"
        type="button"
      >×</button>

      <h2>${escapeHTML(title)}</h2>

      <div style="margin-top:15px">
        ${content}
      </div>

    </div>
  `;

  $("sheetClose").onclick = closeModal;
}


/* =========================================================
   6. NAVIGATION
   ========================================================= */

function navigate(page) {
  currentPage = page;

  renderPage(page);

  document
    .querySelectorAll(".bottom-nav [data-page]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === page
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
}


/* =========================================================
   7. HOME
   ========================================================= */

async function renderHome() {
  $("app").innerHTML = `
    <section class="page">

      <div class="stories" id="stories">
        ${loading("Loading")}
      </div>

      <div id="feed">
        ${loading("Loading posts...")}
      </div>

    </section>
  `;

  await loadFeed();
}

async function loadFeed() {
  const feed = $("feed");

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .order("created_at", {
      ascending: false
    })
    .limit(50);

  if (error) {
    console.error(error);

    feed.innerHTML = `
      <div class="empty">
        Unable to load posts.
      </div>
    `;

    return;
  }

  if (!data?.length) {
    feed.innerHTML = `
      <div class="empty">
        <h3>No posts yet</h3>
        <p>Be the first person to post on MENA.</p>
      </div>
    `;

    return;
  }

  feed.innerHTML = data.map(renderPost).join("");

  await loadStories();
}

async function loadStories() {
  const stories = $("stories");

  if (!stories) return;

  const { data } = await supabase
    .from("profiles")
    .select("id,username,full_name,avatar_url")
    .limit(20);

  if (!data?.length) {
    stories.innerHTML = "";
    return;
  }

  stories.innerHTML = data.map(profile => `
    <div class="story">
      ${
        profile.avatar_url
          ? `<img class="story-avatar"
              src="${escapeHTML(profile.avatar_url)}">`
          : `<div class="story-avatar"></div>`
      }
      <small>
        ${escapeHTML(
          profile.username ||
          profile.full_name ||
          "User"
        )}
      </small>
    </div>
  `).join("");
}

function renderPost(post) {
  const profile = post.profiles || {};

  const username =
    profile.username ||
    profile.full_name ||
    "MENA user";

  const avatar =
    profile.avatar_url ||
    "";

  let media = "";

  if (post.media_url) {

    if (
      post.media_type === "video" ||
      post.media_url.match(/\.(mp4|webm|mov)$/i)
    ) {
      media = `
        <video
          class="post-media"
          src="${escapeHTML(post.media_url)}"
          controls
          playsinline
        ></video>
      `;
    } else {
      media = `
        <img
          class="post-media"
          src="${escapeHTML(post.media_url)}"
          alt=""
        >
      `;
    }
  }

  return `
    <article
      class="post"
      data-post-id="${escapeHTML(post.id)}"
    >

      <div class="post-head">

        ${
          avatar
            ? `<img
                class="avatar"
                src="${escapeHTML(avatar)}"
                alt=""
              >`
            : `<div class="avatar">
                ${escapeHTML(
                  username.charAt(0).toUpperCase()
                )}
              </div>`
        }

        <div class="post-user">
          <strong>${escapeHTML(username)}</strong>
          <small>MENA</small>
        </div>

        <button
          class="follow-post"
          data-user-id="${escapeHTML(profile.id || "")}"
          type="button"
        >
          Follow
        </button>

      </div>

      ${media}

      ${
        post.caption
          ? `<div class="post-body">
              ${escapeHTML(post.caption)}
            </div>`
          : ""
      }

      <div class="post-actions">

        <button
          class="like-post"
          data-post-id="${escapeHTML(post.id)}"
          type="button"
        >
          ♡ Like
        </button>

        <button
          class="comment-post"
          data-post-id="${escapeHTML(post.id)}"
          type="button"
        >
          💬 Comment
        </button>

        <button
          class="share-post"
          data-post-id="${escapeHTML(post.id)}"
          type="button"
        >
          ↗ Share
        </button>

        <button
          class="gift-post"
          data-user-id="${escapeHTML(profile.id || "")}"
          type="button"
        >
          🎁 Gift
        </button>

      </div>

    </article>
  `;
}


/* =========================================================
   8. LIKE
   ========================================================= */

async function likePost(postId) {
  if (
    !requireLogin(
      () => likePost(postId)
    )
  ) return;

  const { data: existing } =
    await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", currentUser.id)
      .maybeSingle();

  if (existing) {
    await supabase
      .from("post_likes")
      .delete()
      .eq("id", existing.id);

    toast("Like removed");

    return;
  }

  const { error } =
    await supabase
      .from("post_likes")
      .insert({
        post_id: postId,
        user_id: currentUser.id
      });

  if (error) {
    toast(error.message, "error");
    return;
  }

  toast("Liked", "success");
}


/* =========================================================
   9. COMMENTS
   ========================================================= */

async function commentPost(postId) {
  if (
    !requireLogin(
      () => commentPost(postId)
    )
  ) return;

  showSheet(
    "Comments",
    `
      <div id="commentsList">
        ${loading("Loading comments...")}
      </div>

      <form id="commentForm">

        <input
          id="commentText"
          maxlength="1000"
          placeholder="Write a comment..."
          required
        >

        <button
          class="full-button"
          type="submit"
        >
          Comment
        </button>

      </form>
    `
  );

  await loadComments(postId);

  $("commentForm").onsubmit =
    async event => {
      event.preventDefault();

      const text =
        $("commentText").value.trim();

      if (!text) return;

      const { error } =
        await supabase
          .from("comments")
          .insert({
            post_id: postId,
            user_id: currentUser.id,
            content: text
          });

      if (error) {
        toast(error.message, "error");
        return;
      }

      $("commentText").value = "";

      await loadComments(postId);
    };
}

async function loadComments(postId) {
  const box = $("commentsList");

  if (!box) return;

  const { data, error } =
    await supabase
      .from("comments")
      .select(`
        *,
        profiles:user_id(
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", {
        ascending: false
      });

  if (error) {
    box.innerHTML =
      `<div class="notice error">
        ${escapeHTML(error.message)}
      </div>`;
    return;
  }

  if (!data?.length) {
    box.innerHTML =
      `<div class="empty">
        No comments yet.
      </div>`;
    return;
  }

  box.innerHTML = data.map(comment => `
    <div class="card">

      <strong>
        ${escapeHTML(
          comment.profiles?.username ||
          comment.profiles?.full_name ||
          "User"
        )}
      </strong>

      <p style="margin-top:5px">
        ${escapeHTML(comment.content)}
      </p>

    </div>
  `).join("");
}


/* =========================================================
   10. FOLLOW
   ========================================================= */

async function followUser(userId) {
  if (!userId) return;

  if (
    !requireLogin(
      () => followUser(userId)
    )
  ) return;

  if (userId === currentUser.id) {
    toast("You cannot follow yourself");
    return;
  }

  const { data: existing } =
    await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", userId)
      .maybeSingle();

  if (existing) {
    await supabase
      .from("follows")
      .delete()
      .eq("id", existing.id);

    toast("Unfollowed");
    return;
  }

  const { error } =
    await supabase
      .from("follows")
      .insert({
        follower_id: currentUser.id,
        following_id: userId
      });

  if (error) {
    toast(error.message, "error");
    return;
  }

  toast("Following", "success");
}


/* =========================================================
   11. SHARE
   ========================================================= */

async function sharePost(postId) {
  const url =
    `${location.origin}${location.pathname}?post=${postId}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "MENA",
        text: "Check this post on MENA",
        url
      });
    } catch {}
  } else {
    await navigator.clipboard.writeText(url);
    toast("Post link copied", "success");
  }
}


/* =========================================================
   12. MARKET
   ========================================================= */

async function renderMarket() {
  $("app").innerHTML = `
    <section class="page">

      <h2>Market</h2>

      <div class="tabs" style="margin-top:12px">

        <button
          class="tab active"
          id="shopTab"
          type="button"
        >
          Shop
        </button>

        <button
          class="tab"
          id="sellTab"
          type="button"
        >
          Sell
        </button>

        <button
          class="tab"
          id="workTab"
          type="button"
        >
          Free Work
        </button>

      </div>

      <div id="marketContent" style="margin-top:15px">
        ${loading()}
      </div>

    </section>
  `;

  $("shopTab").onclick = () => {
    activateMarketTab("shop");
  };

  $("sellTab").onclick = () => {
    activateMarketTab("sell");
  };

  $("workTab").onclick = () => {
    activateMarketTab("work");
  };

  await renderShop();
}

function activateMarketTab(tab) {
  document
    .querySelectorAll("#shopTab,#sellTab,#workTab")
    .forEach(x => x.classList.remove("active"));

  if (tab === "shop") {
    $("shopTab").classList.add("active");
    renderShop();
  }

  if (tab === "sell") {
    $("sellTab").classList.add("active");
    renderSell();
  }

  if (tab === "work") {
    $("workTab").classList.add("active");
    renderFreeWork();
  }
}

async function renderShop() {
  const box = $("marketContent");

  box.innerHTML = `
    <div class="category-list" id="marketCategories"></div>

    <div
      class="product-grid"
      id="productGrid"
    >
      ${loading("Loading products...")}
    </div>
  `;

  await loadCategories();
  await loadProducts();
}

async function loadCategories() {
  const box = $("marketCategories");

  if (!box) return;

  const { data } =
    await supabase
      .from("market_categories")
      .select("*")
      .order("name");

  if (!data?.length) {
    box.innerHTML = "";
    return;
  }

  box.innerHTML = `
    <button
      class="active"
      data-category=""
      type="button"
    >
      All
    </button>

    ${data.map(category => `
      <button
        data-category="${escapeHTML(category.id)}"
        type="button"
      >
        ${escapeHTML(category.name)}
      </button>
    `).join("")}
  `;

  box.querySelectorAll("button")
    .forEach(button => {
      button.onclick = async () => {

        box.querySelectorAll("button")
          .forEach(x =>
            x.classList.remove("active")
          );

        button.classList.add("active");

        await loadProducts(
          button.dataset.category
        );
      };
    });
}

async function loadProducts(categoryId = "") {
  const grid = $("productGrid");

  if (!grid) return;

  grid.innerHTML = loading("Loading products...");

  let query =
    supabase
      .from("marketplace_listings")
      .select(`
        *,
        profiles:seller_id(
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("status", "active")
      .order("created_at", {
        ascending: false
      });

  if (categoryId) {
    query = query.eq(
      "category_id",
      categoryId
    );
  }

  const { data, error } = await query;

  if (error) {
    grid.innerHTML = `
      <div class="empty">
        ${escapeHTML(error.message)}
      </div>
    `;
    return;
  }

  if (!data?.length) {
    grid.innerHTML = `
      <div class="empty">
        No products available.
      </div>
    `;
    return;
  }

  grid.innerHTML = data.map(product => {

    const image =
      product.image_url ||
      product.media_url ||
      "";

    return `
      <article class="product-card">

        ${
          image
            ? `<img
                class="product-image"
                src="${escapeHTML(image)}"
              >`
            : `<div class="product-image"></div>`
        }

        <div class="product-information">

          <h3>
            ${escapeHTML(product.title)}
          </h3>

          <div class="product-price">
            ${money(product.price_etb || product.price)}
          </div>

          <div class="product-location">
            ${escapeHTML(product.location || "")}
          </div>

          <button
            class="view-button"
            data-product-id="${escapeHTML(product.id)}"
            type="button"
          >
            View
          </button>

        </div>

      </article>
    `;
  }).join("");
}


/* =========================================================
   13. SELL
   ========================================================= */

async function renderSell() {
  if (
    !requireLogin(
      () => renderSell()
    )
  ) return;

  $("marketContent").innerHTML = `
    <div class="card">

      <h3>Sell on MENA</h3>

      <p class="muted" style="margin-top:7px">
        Enter the exact amount you want to receive.
        MENA automatically calculates the buyer price
        including the 5% marketplace fee.
      </p>

      <form id="sellForm">

        <label>Product name</label>
        <input
          id="sellTitle"
          required
          maxlength="120"
        >

        <label>Description</label>
        <textarea
          id="sellDescription"
          required
        ></textarea>

        <label>Your desired amount</label>
        <input
          id="sellAmount"
          type="number"
          min="1"
          step="0.01"
          required
        >

        <div
          id="sellerPreview"
          class="notice success"
          style="margin-top:12px"
        >
          Enter your desired amount.
        </div>

        <label>Location</label>
        <input
          id="sellLocation"
          maxlength="120"
        >

        <label>Category ID</label>
        <input
          id="sellCategory"
          placeholder="Category ID"
        >

        <label>Product image</label>
        <input
          id="sellImage"
          type="file"
          accept="image/*"
        >

        <button
          class="full-button"
          type="submit"
        >
          Publish Product
        </button>

      </form>

    </div>
  `;

  $("sellAmount").oninput = () => {

    const desired =
      Number($("sellAmount").value || 0);

    const buyerPrice =
      desired / 0.95;

    const fee =
      buyerPrice - desired;

    $("sellerPreview").innerHTML = `
      You receive:
      <strong>${money(desired)}</strong><br>

      Buyer product price:
      <strong>${money(buyerPrice)}</strong><br>

      MENA 5% fee:
      <strong>${money(fee)}</strong><br>

      Delivery is separate from this fee.
    `;
  };

  $("sellForm").onsubmit =
    publishProduct;
}

async function publishProduct(event) {
  event.preventDefault();

  const title =
    $("sellTitle").value.trim();

  const description =
    $("sellDescription").value.trim();

  const desired =
    Number($("sellAmount").value);

  const location =
    $("sellLocation").value.trim();

  const category =
    $("sellCategory").value.trim();

  if (!desired || desired <= 0) {
    toast("Enter a valid amount", "error");
    return;
  }

  const buyerPrice =
    Number((desired / 0.95).toFixed(2));

  let imageUrl = null;

  const file =
    $("sellImage").files[0];

  if (file) {
    imageUrl =
      await uploadMedia(
        file,
        "market"
      );

    if (!imageUrl) return;
  }

  /*
    Important:
    Publishing a paid marketplace listing can later
    be moved completely into a secure Edge Function.
    The 5% price is calculated here only for display.
  */

  const { error } =
    await supabase
      .from("marketplace_listings")
      .insert({
        seller_id: currentUser.id,
        title,
        description,
        price_etb: buyerPrice,
        desired_receive_etb: desired,
        platform_fee_percent: 5,
        category_id: category || null,
        location,
        image_url: imageUrl,
        status: "active"
      });

  if (error) {
    toast(error.message, "error");
    return;
  }

  toast("Product published", "success");

  await renderShop();
}


/* =========================================================
   14. FREE WORK
   ========================================================= */

async function renderFreeWork() {
  $("marketContent").innerHTML = `
    <div class="card">

      <h3>Free Work</h3>

      <p class="muted" style="margin-top:7px">
        Posting fee: 50 ETB.
        Your post remains active for 30 days.
      </p>

      <form id="workForm">

        <label>Title</label>
        <input
          id="workTitle"
          required
          maxlength="120"
        >

        <label>Description</label>
        <textarea
          id="workDescription"
          required
        ></textarea>

        <label>Location</label>
        <input
          id="workLocation"
          maxlength="120"
        >

        <button
          class="full-button"
          type="submit"
        >
          Post Free Work — 50 ETB
        </button>

      </form>

    </div>

    <div id="workList">
      ${loading("Loading work...")}
    </div>
  `;

  $("workForm").onsubmit =
    publishFreeWork;

  await loadFreeWork();
}

async function publishFreeWork(event) {
  event.preventDefault();

  if (
    !requireLogin(
      () => publishFreeWork(event)
    )
  ) return;

  /*
    Real production flow:
    GitHub → Supabase Edge Function →
    payment check → Free Work post creation.

    No browser code should simply pretend
    that the 50 ETB payment happened.
  */

  const { data, error } =
    await supabase.functions.invoke(
      "free-work-create",
      {
        body: {
          title:
            $("workTitle").value.trim(),

          description:
            $("workDescription").value.trim(),

          location:
            $("workLocation").value.trim(),

          posting_fee_etb: 50
        }
      }
    );

  if (error) {
    toast(error.message, "error");
    return;
  }

  toast(
    data?.message ||
    "Free Work request created",
    "success"
  );

  await loadFreeWork();
}

async function loadFreeWork() {
  const list = $("workList");

  if (!list) return;

  const { data, error } =
    await supabase
      .from("free_work_posts")
      .select("*")
      .eq("status", "active")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    list.innerHTML = `
      <div class="notice error">
        ${escapeHTML(error.message)}
      </div>
    `;
    return;
  }

  if (!data?.length) {
    list.innerHTML =
      `<div class="empty">
        No Free Work posts yet.
      </div>`;
    return;
  }

  list.innerHTML = data.map(item => `
    <div class="card">

      <h3>
        ${escapeHTML(item.title)}
      </h3>

      <p style="margin-top:7px">
        ${escapeHTML(item.description)}
      </p>

      <small class="muted">
        ${escapeHTML(item.location || "")}
      </small>

    </div>
  `).join("");
}


/* =========================================================
   15. PROFILE
   ========================================================= */

async function renderProfile() {
  if (!currentUser) {
    $("app").innerHTML = `
      <section class="page">

        <div class="card" style="text-align:center">

          <h2>Profile</h2>

          <p class="muted" style="margin-top:8px">
            You can browse MENA as a guest.
            Login to use your personal profile.
          </p>

          <button
            class="full-button"
            id="profileLogin"
            type="button"
          >
            Login / Sign Up
          </button>

        </div>

      </section>
    `;

    $("profileLogin").onclick =
      openAuthModal;

    return;
  }

  $("app").innerHTML = loading(
    "Loading profile..."
  );

  await loadProfile();

  const profile =
    currentProfile || {};

  const stats =
    await getProfileStats(
      currentUser.id
    );

  $("app").innerHTML = `
    <section class="page">

      <div class="profile-cover"></div>

      <div class="profile-card">

        ${
          profile.avatar_url
            ? `<img
                class="profile-photo"
                src="${escapeHTML(
                  profile.avatar_url
                )}"
              >`
            : `<div class="profile-photo">
                ${
                  (profile.full_name ||
                   profile.username ||
                   "M")
                    .charAt(0)
                    .toUpperCase()
                }
              </div>`
        }

        <h2>
          ${escapeHTML(
            profile.username ||
            profile.full_name ||
            "MENA User"
          )}
        </h2>

        <p class="muted">
          ${escapeHTML(
            profile.bio || ""
          )}
        </p>

        <div class="profile-stats">

          <div class="stat">
            <strong>${stats.posts}</strong>
            <small>Posts</small>
          </div>

          <div class="stat">
            <strong>${stats.followers}</strong>
            <small>Followers</small>
          </div>

          <div class="stat">
            <strong>${stats.following}</strong>
            <small>Following</small>
          </div>

        </div>

        <button
          class="action primary"
          id="editProfile"
          type="button"
        >
          Edit Profile
        </button>

      </div>

      <div class="profile-menu">

        <button
          id="myMarket"
          type="button"
        >
          🛍 My Market
        </button>

        <button
          id="walletButton"
          type="button"
        >
          💰 Wallet
        </button>

        <button
          id="withdrawButton"
          type="button"
        >
          💳 Withdraw
        </button>

        <button
          id="buyCoinsButton"
          type="button"
        >
          🪙 Buy Coins
        </button>

        <button
          id="myGiftsButton"
          type="button"
        >
          🎁 Gifts Received
        </button>

        <button
          id="logoutButton"
          type="button"
        >
          Log Out
        </button>

      </div>

    </section>
  `;

  $("editProfile").onclick =
    editProfile;

  $("walletButton").onclick =
    renderWallet;

  $("withdrawButton").onclick =
    renderWithdraw;

  $("buyCoinsButton").onclick =
    renderBuyCoins;

  $("myMarket").onclick =
    () => navigate("market");

  $("myGiftsButton").onclick =
    renderReceivedGifts;

  $("logoutButton").onclick =
    logout;
}

async function getProfileStats(userId) {

  const posts =
    await supabase
      .from("posts")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("user_id", userId);

  const followers =
    await supabase
      .from("follows")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("following_id", userId);

  const following =
    await supabase
      .from("follows")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("follower_id", userId);

  return {
    posts: posts.count || 0,
    followers: followers.count || 0,
    following: following.count || 0
  };
}


/* =========================================================
   16. EDIT PROFILE
   ========================================================= */

async function editProfile() {
  if (
    !requireLogin(
      editProfile
    )
  ) return;

  await loadProfile();

  const p =
    currentProfile || {};

  showSheet(
    "Edit Profile",
    `
      <form id="editProfileForm">

        <label>Username</label>
        <input
          id="editUsername"
          value="${escapeHTML(
            p.username || ""
          )}"
          maxlength="30"
        >

        <label>Full name</label>
        <input
          id="editFullName"
          value="${escapeHTML(
            p.full_name || ""
          )}"
          maxlength="60"
        >

        <label>Bio</label>
        <textarea
          id="editBio"
          maxlength="300"
        >${escapeHTML(
          p.bio || ""
        )}</textarea>

        <label>Profile photo</label>
        <input
          id="editAvatar"
          type="file"
          accept="image/*"
        >

        <button
          class="full-button"
          type="submit"
        >
          Save Profile
        </button>

      </form>
    `
  );

  $("editProfileForm").onsubmit =
    async event => {

      event.preventDefault();

      let avatarUrl =
        p.avatar_url || null;

      const file =
        $("editAvatar").files[0];

      if (file) {
        avatarUrl =
          await uploadMedia(
            file,
            "avatars"
          );

        if (!avatarUrl) return;
      }

      const { error } =
        await supabase
          .from("profiles")
          .update({
            username:
              $("editUsername")
                .value
                .trim(),

            full_name:
              $("editFullName")
                .value
                .trim(),

            bio:
              $("editBio")
                .value
                .trim(),

            avatar_url:
              avatarUrl,

            updated_at:
              new Date().toISOString()
          })
          .eq("id", currentUser.id);

      if (error) {
        toast(error.message, "error");
        return;
      }

      await loadProfile();

      closeModal();

      toast(
        "Profile updated",
        "success"
      );

      await renderProfile();
    };
}


/* =========================================================
   17. WALLET
   ========================================================= */

async function getWallet() {
  if (!currentUser) return null;

  const { data, error } =
    await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

async function renderWallet() {
  if (
    !requireLogin(
      renderWallet
    )
  ) return;

  const wallet =
    await getWallet();

  const coinBalance =
    wallet?.coin_balance || 0;

  const etbBalance =
    wallet?.etb_balance || 0;

  $("app").innerHTML = `
    <section class="page">

      <button
        class="action"
        id="walletBack"
        type="button"
      >
        ← Back
      </button>

      <h2 style="margin:15px 0">
        Wallet
      </h2>

      <div class="wallet-card">

        <div>ETB Balance</div>

        <div class="wallet-balance">
          ${money(etbBalance)}
        </div>

        <div style="margin-top:18px">
          Coin Balance
        </div>

        <div style="font-size:22px;font-weight:800">
          🪙 ${coins(coinBalance)}
        </div>

      </div>

      <div class="wallet-buttons">

        <button id="walletBuyCoins">
          Buy Coins
        </button>

        <button id="walletWithdraw">
          Withdraw
        </button>

      </div>

      <div class="card" style="margin-top:14px">

        <h3>Exchange</h3>

        <p class="muted" style="margin-top:6px">
          1 coin = 0.50 ETB
        </p>

        <button
          class="full-button"
          id="exchangeCoins"
          type="button"
        >
          Exchange into Coins
        </button>

      </div>

      <div class="card">

        <h3>Transactions</h3>

        <div
          id="walletTransactions"
          style="margin-top:10px"
        >
          ${loading("Loading...")}
        </div>

      </div>

    </section>
  `;

  $("walletBack").onclick =
    () => navigate("profile");

  $("walletBuyCoins").onclick =
    renderBuyCoins;

  $("walletWithdraw").onclick =
    renderWithdraw;

  $("exchangeCoins").onclick =
    renderBuyCoins;

  await loadTransactions();
}

async function loadTransactions() {
  const box =
    $("walletTransactions");

  if (!box || !currentUser) return;

  const { data, error } =
    await supabase
      .from("coin_transactions")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", {
        ascending: false
      })
      .limit(30);

  if (error) {
    box.innerHTML =
      `<div class="notice error">
        ${escapeHTML(error.message)}
      </div>`;
    return;
  }

  if (!data?.length) {
    box.innerHTML =
      `<div class="empty">
        No transactions yet.
      </div>`;
    return;
  }

  box.innerHTML = data.map(tx => `
    <div class="inbox-item">

      <div class="inbox-avatar">
        🪙
      </div>

      <div class="inbox-content">

        <strong>
          ${escapeHTML(
            tx.type || "Transaction"
          )}
        </strong>

        <small>
          ${coins(
            tx.amount ||
            tx.coin_amount ||
            0
          )} coins
        </small>

      </div>

    </div>
  `).join("");
}


/* =========================================================
   18. BUY COINS
   ========================================================= */

const COIN_PACKAGES = [
  5,
  10,
  25,
  50,
  100,
  200,
  500,
  1000,
  1500,
  2000,
  5000,
  10000,
  25000,
  50000,
  100000
];

async function renderBuyCoins() {
  if (
    !requireLogin(
      renderBuyCoins
    )
  ) return;

  $("app").innerHTML = `
    <section class="page">

      <button
        class="action"
        id="coinsBack"
        type="button"
      >
        ← Back
      </button>

      <h2 style="margin:15px 0">
        Buy Coins
      </h2>

      <div class="card">

        <strong>
          1 coin = 0.50 ETB
        </strong>

        <p class="muted" style="margin-top:6px">
          Choose a coin package.
        </p>

      </div>

      <div
        class="coin-grid"
        id="coinPackages"
      ></div>

    </section>
  `;

  $("coinsBack").onclick =
    () => navigate("profile");

  $("coinPackages").innerHTML =
    COIN_PACKAGES.map(amount => `
      <div class="coin-card">

        <span class="coin-icon">🪙</span>

        <strong>
          ${coins(amount)}
        </strong>

        <small>
          ${money(amount * 0.5)}
        </small>

        <button
          data-coins="${amount}"
          type="button"
        >
          Buy
        </button>

      </div>
    `).join("");

  document
    .querySelectorAll(
      "#coinPackages button"
    )
    .forEach(button => {

      button.onclick = () => {
        startCoinPurchase(
          Number(button.dataset.coins)
        );
      };

    });
}

async function startCoinPurchase(amount) {

  if (!currentUser) {
    openAuthModal();
    return;
  }

  const total =
    amount * 0.5;

  showSheet(
    "Choose Payment",
    `
      <div class="card">

        <h3>
          ${coins(amount)} coins
        </h3>

        <p style="margin-top:7px">
          Total:
          <strong>${money(total)}</strong>
        </p>

      </div>

      <button
        class="full-button"
        id="telebirrPay"
        type="button"
      >
        Pay with Telebirr
      </button>

      <button
        class="full-button"
        id="mpesaPay"
        type="button"
        style="background:#087f5b"
      >
        Pay with M-Pesa
      </button>
    `
  );

  $("telebirrPay").onclick =
    () => createCoinPayment(
      amount,
      "telebirr"
    );

  $("mpesaPay").onclick =
    () => createCoinPayment(
      amount,
      "mpesa"
    );
}

async function createCoinPayment(
  amount,
  method
) {

  const { data, error } =
    await supabase.functions.invoke(
      "buy-coins",
      {
        body: {
          coin_amount: amount,
          payment_method: method,
          coin_value_etb: 0.5
        }
      }
    );

  if (error) {
    toast(error.message, "error");
    return;
  }

  /*
    The Edge Function must create the actual
    Telebirr/M-Pesa payment request.

    It must NOT expose secret payment credentials
    to this JavaScript.
  */

  if (data?.payment_url) {
    window.location.href =
      data.payment_url;
    return;
  }

  toast(
    data?.message ||
    "Payment request created.",
    "success"
  );

  closeModal();
}


/* =========================================================
   19. WITHDRAW
   ========================================================= */

async function renderWithdraw() {
  if (
    !requireLogin(
      renderWithdraw
    )
  ) return;

  const wallet =
    await getWallet();

  const balance =
    Number(wallet?.etb_balance || 0);

  $("app").innerHTML = `
    <section class="page">

      <button
        class="action"
        id="withdrawBack"
        type="button"
      >
        ← Back
      </button>

      <h2 style="margin:15px 0">
        Withdraw
      </h2>

      <div class="withdraw-card">

        <div>Available balance</div>

        <div class="withdraw-amount">
          ${money(balance)}
        </div>

      </div>

      <div class="card">

        <h3>Withdrawal Rules</h3>

        <div class="withdraw-rules">

          <div class="rule">
            <span>Minimum withdrawal</span>
            <strong>10 ETB</strong>
          </div>

          <div class="rule">
            <span>Coins</span>
            <strong>Cannot withdraw directly</strong>
          </div>

          <div class="rule">
            <span>Coin exchange</span>
            <strong>1 coin = 0.50 ETB</strong>
          </div>

        </div>

        <p
          class="muted"
          style="margin-top:12px"
        >
          Payment-method fees may apply.
        </p>

      </div>

      <button
        class="full-button"
        id="withdrawNow"
        type="button"
      >
        Withdraw Now
      </button>

      <button
        class="full-button"
        id="withdrawExchange"
        type="button"
        style="background:#eef2f0;color:#087f5b"
      >
        Exchange into Coins
      </button>

    </section>
  `;

  $("withdrawBack").onclick =
    () => navigate("profile");

  $("withdrawNow").onclick =
    openWithdrawalForm;

  $("withdrawExchange").onclick =
    renderBuyCoins;
}

async function openWithdrawalForm() {

  const wallet =
    await getWallet();

  const balance =
    Number(wallet?.etb_balance || 0);

  showSheet(
    "Payment Method",
    `
      <p class="muted">
        Select where you want to receive your
        withdrawal.
      </p>

      <div style="margin-top:15px">

        <button
          class="payment-method"
          data-method="telebirr"
          type="button"
        >
          <div class="payment-icon">T</div>

          <div class="payment-info">
            <strong>Telebirr</strong>
            <small>Secure payment request</small>
          </div>
        </button>

        <button
          class="payment-method"
          data-method="mpesa"
          type="button"
        >
          <div class="payment-icon">M</div>

          <div class="payment-info">
            <strong>M-Pesa</strong>
            <small>Secure payment request</small>
          </div>
        </button>

        <button
          class="payment-method"
          data-method="cbe"
          type="button"
        >
          <div class="payment-icon">B</div>

          <div class="payment-info">
            <strong>Commercial Bank</strong>
            <small>Bank withdrawal</small>
          </div>
        </button>

      </div>

      <div class="notice">
        Available:
        <strong>${money(balance)}</strong>
      </div>
    `
  );

  document
    .querySelectorAll(
      ".payment-method"
    )
    .forEach(button => {

      button.onclick = () => {

        openWithdrawalDetails(
          button.dataset.method,
          balance
        );

      };

    });
}

function openWithdrawalDetails(
  method,
  balance
) {

  showSheet(
    "Withdrawal Details",
    `
      <form id="withdrawForm">

        <div class="card">

          <strong>
            ${escapeHTML(
              method.toUpperCase()
            )}
          </strong>

        </div>

        <label>
          Amount (minimum 10 ETB)
        </label>

        <input
          id="withdrawAmount"
          type="number"
          min="10"
          max="${balance}"
          step="0.01"
          required
        >

        <label>
          Account / Phone Number
        </label>

        <input
          id="withdrawAccount"
          required
          placeholder="Enter your payment account"
        >

        <label>
          Full name
        </label>

        <input
          id="withdrawName"
          required
        >

        <button
          class="full-button"
          type="submit"
        >
          Submit Withdrawal
        </button>

      </form>
    `
  );

  $("withdrawForm").onsubmit =
    async event => {

      event.preventDefault();

      const amount =
        Number(
          $("withdrawAmount").value
        );

      if (amount < 10) {
        toast(
          "Minimum withdrawal is 10 ETB",
          "error"
        );
        return;
      }

      if (amount > balance) {
        toast(
          "Insufficient balance",
          "error"
        );
        return;
      }

      const { data, error } =
        await supabase.functions.invoke(
          "withdraw",
          {
            body: {
              amount,
              method,
              account:
                $("withdrawAccount")
                  .value
                  .trim(),
              full_name:
                $("withdrawName")
                  .value
                  .trim()
            }
          }
        );

      if (error) {
        toast(error.message, "error");
        return;
      }

      closeModal();

      toast(
        data?.message ||
        "Withdrawal request submitted.",
        "success"
      );

      await renderWithdraw();
    };
}


/* =========================================================
   20. RECEIVED GIFTS
   ========================================================= */

async function renderReceivedGifts() {

  if (
    !requireLogin(
      renderReceivedGifts
    )
  ) return;

  $("app").innerHTML = `
    <section class="page">

      <button
        class="action"
        id="giftBack"
        type="button"
      >
        ← Back
      </button>

      <h2 style="margin:15px 0">
        Gifts Received
      </h2>

      <div
        id="receivedGifts"
      >
        ${loading("Loading gifts...")}
      </div>

    </section>
  `;

  $("giftBack").onclick =
    () => navigate("profile");

  const { data, error } =
    await supabase
      .from("gift_transactions")
      .select(`
        *,
        gift_catalog:gift_id(*)
      `)
      .eq("receiver_id", currentUser.id)
      .order("created_at", {
        ascending: false
      });

  const box =
    $("receivedGifts");

  if (error) {
    box.innerHTML =
      `<div class="notice error">
        ${escapeHTML(error.message)}
      </div>`;
    return;
  }

  if (!data?.length) {
    box.innerHTML =
      `<div class="empty">
        No gifts received yet.
      </div>`;
    return;
  }

  box.innerHTML = data.map(gift => `
    <div class="card">

      <div style="font-size:35px">
        🎁
      </div>

      <strong>
        ${escapeHTML(
          gift.gift_catalog?.name ||
          "Gift"
        )}
      </strong>

      <p class="muted">
        ${coins(
          gift.coin_amount || 0
        )} coins
      </p>

    </div>
  `).join("");
}


/* =========================================================
   21. SEND GIFT
   ========================================================= */

async function openGiftSelector(receiverId) {

  if (!receiverId) return;

  if (
    !requireLogin(
      () => openGiftSelector(receiverId)
    )
  ) return;

  const { data, error } =
    await supabase
      .from("gift_catalog")
      .select("*")
      .order("coin_price");

  if (error) {
    toast(error.message, "error");
    return;
  }

  showSheet(
    "Send Gift",
    `
      <p class="muted">
        Choose a gift.
      </p>

      <div class="gift-grid">

        ${
          data?.map(gift => `
            <button
              class="gift"
              data-gift-id="${escapeHTML(gift.id)}"
              type="button"
            >

              <span class="emoji">
                ${escapeHTML(
                  gift.emoji || "🎁"
                )}
              </span>

              <strong>
                ${escapeHTML(
                  gift.name
                )}
              </strong>

              <small>
                🪙 ${coins(
                  gift.coin_price
                )}
              </small>

            </button>
          `).join("") ||
          ""
        }

      </div>
    `
  );

  document
    .querySelectorAll(".gift")
    .forEach(button => {

      button.onclick = () => {

        sendGift(
          receiverId,
          button.dataset.giftId
        );

      };

    });
}

async function sendGift(
  receiverId,
  giftId
) {

  const { data, error } =
    await supabase.functions.invoke(
      "send-gift",
      {
        body: {
          receiver_id: receiverId,
          gift_id: giftId
        }
      }
    );

  if (error) {
    toast(error.message, "error");
    return;
  }

  closeModal();

  toast(
    data?.message ||
    "Gift sent",
    "success"
  );
}


/* =========================================================
   22. INBOX
   ========================================================= */

async function renderInbox() {

  if (
    !requireLogin(
      renderInbox
    )
  ) return;

  $("app").innerHTML = `
    <section class="page">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center
      ">

        <h2>Inbox</h2>

        <button
          class="action"
          id="newMessage"
          type="button"
        >
          + Message
        </button>

      </div>

      <div
        id="inboxList"
        style="margin-top:12px"
      >
        ${loading("Loading inbox...")}
      </div>

    </section>
  `;

  $("newMessage").onclick =
    openNewMessage;

  /*
    The current database structure does not yet
    contain a complete conversations/messages
    table in the original schema.

    Therefore this page is ready for the secure
    messaging backend instead of inventing fake
    conversations.
  */

  $("inboxList").innerHTML = `
    <div class="empty">

      <div style="font-size:40px">
        💬
      </div>

      <h3>Messages</h3>

      <p style="margin-top:6px">
        Your real MENA conversations will appear here.
      </p>

    </div>
  `;
}

function openNewMessage() {

  showSheet(
    "New Message",
    `
      <form id="newMessageForm">

        <label>User ID</label>

        <input
          id="messageUser"
          required
          placeholder="Recipient user ID"
        >

        <label>Message</label>

        <textarea
          id="messageText"
          required
          maxlength="2000"
        ></textarea>

        <button
          class="full-button"
          type="submit"
        >
          Send
        </button>

      </form>
    `
  );

  $("newMessageForm").onsubmit =
    async event => {

      event.preventDefault();

      /*
        Secure messaging Edge Function.
      */

      const { data, error } =
        await supabase.functions.invoke(
          "send-message",
          {
            body: {
              receiver_id:
                $("messageUser")
                  .value
                  .trim(),

              message:
                $("messageText")
                  .value
                  .trim()
            }
          }
        );

      if (error) {
        toast(error.message, "error");
        return;
      }

      closeModal();

      toast(
        data?.message ||
        "Message sent",
        "success"
      );
    };
}


/* =========================================================
   23. CREATE / TIKTOK STYLE POST
   ========================================================= */

async function renderCreate() {

  if (
    !requireLogin(
      renderCreate
    )
  ) return;

  const app =
    $("app");

  app.innerHTML = `
    <section class="create-page">

      <div class="create-top">

        <button
          id="closeCreate"
          type="button"
        >
          ×
        </button>

        <button
          class="create-sound"
          type="button"
        >
          ♪ Add sound
        </button>

        <button
          type="button"
          id="cameraSwitch"
        >
          ↻
        </button>

      </div>

      <div
        class="camera-area"
        id="cameraArea"
      >

        <video
          id="cameraVideo"
          class="camera-video"
          autoplay
          muted
          playsinline
        ></video>

        <div class="camera-tools">

          <button type="button">⌁</button>
          <button type="button">◔</button>
          <button type="button">▦</button>
          <button type="button">↙</button>
          <button type="button">☼</button>

        </div>

        <div class="create-modes">

          <button>10m</button>
          <button>60s</button>
          <button>15s</button>

          <button
            class="active"
            id="photoMode"
          >
            PHOTO
          </button>

          <button id="textMode">
            TEXT
          </button>

        </div>

        <div class="camera-controls">

          <button
            class="capture-button"
            id="captureButton"
            type="button"
          ></button>

        </div>

      </div>

      <div style="
        height:65px;
        display:flex;
        justify-content:center;
        align-items:center;
        gap:40px
      ">

        <button
          id="uploadButton"
          type="button"
          style="background:none;color:white"
        >
          POST
        </button>

        <button
          id="liveButton"
          type="button"
          style="background:none;color:white"
        >
          LIVE
        </button>

        <button
          id="createTextButton"
          type="button"
          style="background:none;color:white"
        >
          CREATE
        </button>

      </div>

    </section>
  `;

  $("closeCreate").onclick =
    () => navigate("home");

  await startCamera();

  $("cameraSwitch").onclick =
    switchCamera;

  $("captureButton").onclick =
    capturePhoto;

  $("uploadButton").onclick =
    () => openMediaPicker();

  $("liveButton").onclick =
    startLive;

  $("createTextButton").onclick =
    createTextPost;

  $("textMode").onclick =
    createTextPost;
}

let cameraStream = null;
let cameraFacing = "environment";

async function startCamera() {

  try {

    if (cameraStream) {
      cameraStream
        .getTracks()
        .forEach(track =>
          track.stop()
        );
    }

    cameraStream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode:
            cameraFacing
        },
        audio: true
      });

    $("cameraVideo").srcObject =
      cameraStream;

  } catch (error) {

    console.error(error);

    toast(
      "Camera permission is required.",
      "error"
    );
  }
}

async function switchCamera() {

  cameraFacing =
    cameraFacing === "environment"
      ? "user"
      : "environment";

  await startCamera();
}

async function capturePhoto() {

  const video =
    $("cameraVideo");

  if (!video?.videoWidth) {
    toast(
      "Camera is not ready",
      "error"
    );
    return;
  }

  const canvas =
    document.createElement("canvas");

  canvas.width =
    video.videoWidth;

  canvas.height =
    video.videoHeight;

  const context =
    canvas.getContext("2d");

  context.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  canvas.toBlob(
    async blob => {

      if (!blob) return;

      const file =
        new File(
          [blob],
          `mena-${Date.now()}.jpg`,
          {
            type: "image/jpeg"
          }
        );

      await createPostFromFile(file);

    },
    "image/jpeg",
    0.92
  );
}

function openMediaPicker() {

  $("mediaInput").value = "";

  $("mediaInput").click();

  $("mediaInput").onchange =
    async () => {

      const file =
        $("mediaInput").files[0];

      if (!file) return;

      await createPostFromFile(file);
    };
}

async function createPostFromFile(file) {

  const mediaUrl =
    await uploadMedia(
      file,
      "posts"
    );

  if (!mediaUrl) return;

  showSheet(
    "Create Post",
    `
      <form id="postForm">

        <div class="card">

          ${
            file.type.startsWith("video/")
              ? `<video
                  src="${escapeHTML(
                    URL.createObjectURL(file)
                  )}"
                  controls
                  style="
                    width:100%;
                    max-height:350px;
                    object-fit:cover
                  "
                ></video>`
              : `<img
                  src="${escapeHTML(
                    URL.createObjectURL(file)
                  )}"
                  style="
                    width:100%;
                    max-height:350px;
                    object-fit:cover
                  "
                >`
          }

        </div>

        <label>Caption</label>

        <textarea
          id="postCaption"
          maxlength="2200"
          placeholder="Write something..."
        ></textarea>

        <button
          class="full-button"
          type="submit"
        >
          Post
        </button>

      </form>
    `
  );

  $("postForm").onsubmit =
    async event => {

      event.preventDefault();

      const { error } =
        await supabase
          .from("posts")
          .insert({
            user_id:
              currentUser.id,

            media_url:
              mediaUrl,

            media_type:
              file.type.startsWith("video/")
                ? "video"
                : "image",

            caption:
              $("postCaption")
                .value
                .trim()
          });

      if (error) {
        toast(error.message, "error");
        return;
      }

      closeModal();

      toast(
        "Posted successfully",
        "success"
      );

      navigate("home");
    };
}

async function createTextPost() {

  if (
    !requireLogin(
      createTextPost
    )
  ) return;

  showSheet(
    "Create Text Post",
    `
      <form id="textPostForm">

        <textarea
          id="textPost"
          maxlength="2200"
          placeholder="Write your post..."
          required
        ></textarea>

        <button
          class="full-button"
          type="submit"
        >
          Post
        </button>

      </form>
    `
  );

  $("textPostForm").onsubmit =
    async event => {

      event.preventDefault();

      const { error } =
        await supabase
          .from("posts")
          .insert({
            user_id:
              currentUser.id,

            media_type:
              "text",

            caption:
              $("textPost")
                .value
                .trim()
          });

      if (error) {
        toast(error.message, "error");
        return;
      }

      closeModal();

      toast(
        "Posted successfully",
        "success"
      );

      navigate("home");
    };
}


/* =========================================================
   24. LIVE
   ========================================================= */

async function startLive() {

  if (
    !requireLogin(
      startLive
    )
  ) return;

  /*
    Live requires a real streaming provider/backend.
    The browser must NOT create fake live rooms.

    This calls the secure backend.
  */

  const { data, error } =
    await supabase.functions.invoke(
      "start-live",
      {
        body: {
          title: "MENA Live"
        }
      }
    );

  if (error) {
    toast(error.message, "error");
    return;
  }

  if (data?.live_url) {
    window.location.href =
      data.live_url;
    return;
  }

  toast(
    data?.message ||
    "Live room created.",
    "success"
  );
}


/* =========================================================
   25. MEDIA UPLOAD
   ========================================================= */

async function uploadMedia(
  file,
  folder
) {

  if (!currentUser) {
    openAuthModal();
    return null;
  }

  const extension =
    file.name.includes(".")
      ? file.name
          .split(".")
          .pop()
          .toLowerCase()
      : "bin";

  const path =
    `${currentUser.id}/${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error } =
    await supabase.storage
      .from("media")
      .upload(
        path,
        file,
        {
          upsert: false,
          contentType:
            file.type ||
            "application/octet-stream"
        }
      );

  if (error) {
    toast(
      error.message,
      "error"
    );
    return null;
  }

  const { data } =
    supabase.storage
      .from("media")
      .getPublicUrl(path);

  return data.publicUrl;
}


/* =========================================================
   26. SEARCH
   ========================================================= */

async function renderSearch() {

  $("app").innerHTML = `
    <section class="page">

      <h2>Search MENA</h2>

      <div
        class="search-box"
        style="margin-top:12px"
      >

        <input
          id="searchInput"
          placeholder="Search products..."
        >

        <button
          class="full-button"
          id="searchSubmit"
          type="button"
        >
          Search
        </button>

      </div>

      <div
        id="searchResults"
        style="margin-top:15px"
      ></div>

    </section>
  `;

  $("searchSubmit").onclick =
    performSearch;

  $("searchInput").onkeydown =
    event => {

      if (event.key === "Enter") {
        performSearch();
      }

    };
}

async function performSearch() {

  const term =
    $("searchInput")
      .value
      .trim();

  const results =
    $("searchResults");

  if (!term) return;

  results.innerHTML =
    loading("Searching...");

  const { data, error } =
    await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("status", "active")
      .ilike(
        "title",
        `%${term}%`
      )
      .limit(50);

  if (error) {
    results.innerHTML =
      `<div class="notice error">
        ${escapeHTML(error.message)}
      </div>`;
    return;
  }

  if (!data?.length) {
    results.innerHTML =
      `<div class="empty">
        No results found.
      </div>`;
    return;
  }

  results.innerHTML =
    data.map(product => `
      <div class="card">

        <h3>
          ${escapeHTML(
            product.title
          )}
        </h3>

        <p class="product-price">
          ${money(
            product.price_etb ||
            product.price
          )}
        </p>

      </div>
    `).join("");
}


/* =========================================================
   27. SETTINGS
   ========================================================= */

function renderSettings() {

  $("app").innerHTML = `
    <section class="page">

      <h2>Settings</h2>

      <div class="profile-menu">

        <button
          id="settingsProfile"
          type="button"
        >
          👤 Profile
        </button>

        <button
          id="settingsPrivacy"
          type="button"
        >
          🔒 Privacy
        </button>

        <button
          id="settingsNotifications"
          type="button"
        >
          🔔 Notifications
        </button>

        <button
          id="settingsAbout"
          type="button"
        >
          ℹ️ About MENA
        </button>

      </div>

    </section>
  `;

  $("settingsProfile").onclick =
    () => navigate("profile");

  $("settingsPrivacy").onclick =
    () => toast(
      "Privacy controls will use your Supabase account settings."
    );

  $("settingsNotifications").onclick =
    () => toast(
      "Notification settings will use your account."
    );

  $("settingsAbout").onclick =
    () => showSheet(
      "About MENA",
      `
        <p>
          MENA is a social, marketplace and
          creator platform.
        </p>

        <p
          class="muted"
          style="margin-top:10px"
        >
          Version 1
        </p>
      `
    );
}


/* =========================================================
   28. PAGE ROUTER
   ========================================================= */

async function renderPage(page) {

  switch (page) {

    case "home":
      await renderHome();
      break;

    case "market":
      await renderMarket();
      break;

    case "friends":
      await renderFriends();
      break;

    case "inbox":
      await renderInbox();
      break;

    case "profile":
      await renderProfile();
      break;

    case "create":
      await renderCreate();
      break;

    case "search":
      await renderSearch();
      break;

    case "settings":
      renderSettings();
      break;

    default:
      await renderHome();
  }
}

async function renderFriends() {

  $("app").innerHTML = `
    <section class="page">

      <h2>Friends</h2>

      <div
        id="friendsList"
        style="margin-top:12px"
      >
        ${loading("Loading...")}
      </div>

    </section>
  `;

  const { data, error } =
    await supabase
      .from("profiles")
      .select(
        "id,username,full_name,avatar_url"
      )
      .limit(50);

  if (error) {
    $("friendsList").innerHTML =
      `<div class="notice error">
        ${escapeHTML(error.message)}
      </div>`;
    return;
  }

  $("friendsList").innerHTML =
    data?.map(user => `
      <div class="inbox-item">

        ${
          user.avatar_url
            ? `<img
                class="avatar"
                src="${escapeHTML(
                  user.avatar_url
                )}"
              >`
            : `<div class="avatar">
                ${(user.username ||
                  user.full_name ||
                  "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>`
        }

        <div class="inbox-content">

          <strong>
            ${escapeHTML(
              user.username ||
              user.full_name ||
              "User"
            )}
          </strong>

        </div>

        ${
          currentUser &&
          currentUser.id !== user.id
            ? `<button
                class="action"
                data-follow-user="${escapeHTML(
                  user.id
                )}"
                type="button"
              >
                Follow
              </button>`
            : ""
        }

      </div>
    `).join("") ||
    `<div class="empty">
      No users yet.
    </div>`;

  document
    .querySelectorAll(
      "[data-follow-user]"
    )
    .forEach(button => {

      button.onclick =
        () => followUser(
          button.dataset.followUser
        );

    });
}


/* =========================================================
   29. EVENTS
   ========================================================= */

document.addEventListener(
  "click",
  async event => {

    const pageButton =
      event.target.closest(
        "[data-page]"
      );

    if (
      pageButton &&
      pageButton.dataset.page
    ) {
      navigate(
        pageButton.dataset.page
      );
      return;
    }

    const like =
      event.target.closest(
        ".like-post"
      );

    if (like) {
      await likePost(
        like.dataset.postId
      );
      return;
    }

    const comment =
      event.target.closest(
        ".comment-post"
      );

    if (comment) {
      await commentPost(
        comment.dataset.postId
      );
      return;
    }

    const share =
      event.target.closest(
        ".share-post"
      );

    if (share) {
      await sharePost(
        share.dataset.postId
      );
      return;
    }

    const follow =
      event.target.closest(
        ".follow-post"
      );

    if (follow) {
      await followUser(
        follow.dataset.userId
      );
      return;
    }

    const gift =
      event.target.closest(
        ".gift-post"
      );

    if (gift) {
      await openGiftSelector(
        gift.dataset.userId
      );
      return;
    }

    const product =
      event.target.closest(
        "[data-product-id]"
      );

    if (
      product &&
      product.classList.contains(
        "view-button"
      )
    ) {
      await openProduct(
        product.dataset.productId
      );
    }

  }
);


/* =========================================================
   30. PRODUCT DETAILS / CHECKOUT
   ========================================================= */

async function openProduct(productId) {

  const { data, error } =
    await supabase
      .from("marketplace_listings")
      .select(`
        *,
        profiles:seller_id(
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("id", productId)
      .maybeSingle();

  if (error || !data) {
    toast(
      error?.message ||
      "Product not found",
      "error"
    );
    return;
  }

  const price =
    Number(
      data.price_etb ||
      data.price ||
      0
    );

  showSheet(
    data.title,
    `
      ${
        data.image_url
          ? `<img
              src="${escapeHTML(
                data.image_url
              )}"
              style="
                width:100%;
                max-height:400px;
                object-fit:cover;
                border-radius:15px
              "
            >`
          : ""
      }

      <h2 style="margin-top:12px">
        ${money(price)}
      </h2>

      <p style="margin-top:10px">
        ${escapeHTML(
          data.description || ""
        )}
      </p>

      <p
        class="muted"
        style="margin-top:8px"
      >
        Delivery: 80 ETB
      </p>

      <button
        class="full-button"
        id="buyProduct"
        type="button"
      >
        Buy Now — ${money(price + 80)}
      </button>
    `
  );

  $("buyProduct").onclick =
    () => buyProduct(
      productId
    );
}

async function buyProduct(productId) {

  if (
    !requireLogin(
      () => buyProduct(productId)
    )
  ) return;

  /*
    Secure marketplace checkout.
    The server calculates the final price,
    delivery and seller settlement.
  */

  const { data, error } =
    await supabase.functions.invoke(
      "market-order",
      {
        body: {
          listing_id: productId,
          delivery_fee_etb: 80
        }
      }
    );

  if (error) {
    toast(error.message, "error");
    return;
  }

  closeModal();

  toast(
    data?.message ||
    "Order created.",
    "success"
  );
}


/* =========================================================
   31. GLOBAL BUTTONS
   ========================================================= */

$("createBtn").onclick =
  () => navigate("create");

$("searchBtn").onclick =
  () => navigate("search");

$("settingsBtn").onclick =
  () => navigate("settings");


/* =========================================================
   32. AUTH STATE
   ========================================================= */

supabase.auth.onAuthStateChange(
  async (_event, session) => {

    currentUser =
      session?.user || null;

    if (currentUser) {
      await loadProfile();
    } else {
      currentProfile = null;
    }

  }
);


/* =========================================================
   33. START APP
   ========================================================= */

async function startApp() {

  currentUser =
    await getUser();

  if (currentUser) {
    await loadProfile();
  }

  /*
    IMPORTANT:
    MENA always opens Home first.
    Login is NOT forced at startup.
  */

  await navigate("home");
}

startApp();
