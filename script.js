/* =========================================================
   MENA APP
   Supabase-connected frontend
   ========================================================= */

const SUPABASE_URL =
  "https://ryywkqyeoftuejczeqgg.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_E6S3EtoGbEqA_XkRpJhYpA_g8SvjMeH";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =========================================================
   GLOBAL STATE
   ========================================================= */

const app = document.getElementById("app");
const main = app;
const modal = document.getElementById("modal");

let currentUser = null;
let currentProfile = null;
let currentPage = "home";

let pendingAction = null;

let marketplaceRows = [];
let postRows = [];

const COIN_VALUE = 0.50;
const MARKETPLACE_FEE = 0.05;
const DELIVERY_FEE = 80;
const MIN_WITHDRAW = 10;


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeAttr(value) {
  return escapeHTML(value);
}


function formatETB(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return (
    number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " ETB"
  );
}


function formatCoins(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString("en-US") + " coins";
}


function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString();
}


function getNumber(object, fields) {
  for (const field of fields) {
    if (
      object &&
      object[field] !== null &&
      object[field] !== undefined
    ) {
      const n = Number(object[field]);

      if (Number.isFinite(n)) {
        return n;
      }
    }
  }

  return null;
}


function safeUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    ) {
      return parsed.href;
    }

    return "";
  } catch {
    return "";
  }
}


function toast(message, type = "") {
  const root = document.getElementById("toastRoot");

  if (!root) return;

  const item = document.createElement("div");

  item.className = `toast ${type}`;

  item.textContent = message;

  root.appendChild(item);

  setTimeout(() => {
    item.remove();
  }, 3500);
}


function loading(text = "Loading...") {
  return `
    <div class="empty">
      <div class="empty-icon">⏳</div>
      <strong>${escapeHTML(text)}</strong>
    </div>
  `;
}


function dbError(error) {
  console.error(error);

  return `
    <div class="empty">
      <div class="empty-icon">⚠️</div>
      <strong>Something could not be loaded.</strong>
      <p class="muted">
        ${escapeHTML(error?.message || "Database error")}
      </p>
    </div>
  `;
}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(html) {
  modal.innerHTML = html;

  modal.classList.remove("hidden");
}


function closeModal() {
  modal.classList.add("hidden");

  modal.innerHTML = "";
}


function modalOutside(event) {
  if (event.target === modal) {
    closeModal();
  }
}


/* =========================================================
   AUTH
   ========================================================= */

function requireAccount(actionName, callback) {

  if (currentUser) {
    callback();
    return;
  }

  pendingAction = callback;

  openAuth("login", actionName);
}


function openAuth(mode = "login", actionName = "") {

  const title =
    mode === "signup"
      ? "Create your MENA account"
      : "Welcome back";

  openModal(`
    <div class="modal-box">

      <div class="modal-head">
        <div class="modal-title">${title}</div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>
      </div>

      <div class="form-group">
        <label class="form-label">Email</label>

        <input
          id="authEmail"
          class="input"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
        >
      </div>

      <div class="form-group">
        <label class="form-label">Password</label>

        <input
          id="authPassword"
          class="input"
          type="password"
          autocomplete="current-password"
          placeholder="Password"
        >
      </div>

      ${
        mode === "signup"
          ? `
            <div class="form-group">
              <label class="form-label">Username</label>

              <input
                id="authUsername"
                class="input"
                type="text"
                maxlength="30"
                placeholder="username"
              >
            </div>
          `
          : ""
      }

      <button
        class="btn btn-primary btn-full"
        onclick="submitAuth('${mode}')"
        type="button"
      >
        ${mode === "signup" ? "Create Account" : "Login"}
      </button>

      <button
        class="btn btn-outline btn-full"
        style="margin-top:10px"
        onclick="openAuth('${mode === "signup" ? "login" : "signup"}')"
        type="button"
      >
        ${
          mode === "signup"
            ? "Already have an account? Login"
            : "Create a new account"
        }
      </button>

      ${
        actionName
          ? `
            <p class="muted" style="text-align:center;margin-top:12px">
              Login is required to ${escapeHTML(actionName)}.
            </p>
          `
          : ""
      }

    </div>
  `);
}


async function submitAuth(mode) {

  const email =
    document.getElementById("authEmail")?.value.trim();

  const password =
    document.getElementById("authPassword")?.value;

  if (!email || !password) {
    toast("Enter email and password.", "error");
    return;
  }

  try {

    if (mode === "signup") {

      const username =
        document
          .getElementById("authUsername")
          ?.value
          .trim();

      const { data, error } =
        await sb.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username || null,
              display_name: username || null
            }
          }
        });

      if (error) throw error;

      if (!data.session) {

        closeModal();

        toast(
          "Account created. Check your email if confirmation is required.",
          "success"
        );

        return;
      }

    } else {

      const { error } =
        await sb.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;
    }

    await refreshUser();

    closeModal();

    toast("Login successful.", "success");

    if (pendingAction) {

      const action = pendingAction;

      pendingAction = null;

      setTimeout(() => {
        action();
      }, 100);

    }

  } catch (error) {

    console.error(error);

    toast(
      error?.message || "Authentication failed.",
      "error"
    );
  }
}


async function logout() {

  const { error } =
    await sb.auth.signOut();

  if (error) {
    toast(error.message, "error");
    return;
  }

  currentUser = null;
  currentProfile = null;

  toast("Logged out.", "success");

  showPage("home");
}


/* =========================================================
   USER
   ========================================================= */

async function refreshUser() {

  const {
    data: {
      user
    }
  } = await sb.auth.getUser();

  currentUser = user || null;

  if (!currentUser) {
    currentProfile = null;
    return;
  }

  const { data } =
    await sb
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

  currentProfile = data || null;
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function updateNav() {

  document
    .querySelectorAll(".nav-item")
    .forEach(button => {
      button.classList.remove("active");
    });

  const map = {
    home: "nav-home",
    market: "nav-market",
    inbox: "nav-inbox",
    profile: "nav-profile"
  };

  const id = map[currentPage];

  if (id) {
    document
      .getElementById(id)
      ?.classList
      .add("active");
  }
}


async function showPage(page) {

  currentPage = page;

  updateNav();

  if (page === "home") {
    await renderHome();
    return;
  }

  if (page === "market") {
    await renderMarketplace();
    return;
  }

  if (page === "inbox") {
    await renderInbox();
    return;
  }

  if (page === "profile") {
    await renderProfile();
    return;
  }

  await renderHome();
}


/* =========================================================
   HOME
   ========================================================= */

async function renderHome() {

  app.innerHTML = `
    <div class="page">

      <div class="hero">

        <h1>Welcome to MENA</h1>

        <p>
          Connect, discover, buy, sell and grow.
        </p>

      </div>

      <div id="feedArea">
        ${loading("Loading posts...")}
      </div>

    </div>
  `;

  await loadPosts();
}


async function loadPosts() {

  const area =
    document.getElementById("feedArea");

  if (!area) return;

  const {
    data,
    error
  } = await sb
    .from("posts")
    .select("*")
    .order("created_at", {
      ascending: false
    })
    .limit(50);

  if (error) {

    area.innerHTML = dbError(error);

    return;
  }

  postRows = data || [];

  if (!postRows.length) {

    area.innerHTML = `
      <div class="empty">

        <div class="empty-icon">🎬</div>

        <strong>No posts yet.</strong>

        <p class="muted">
          Public posts will appear here.
        </p>

      </div>
    `;

    return;
  }

  const userIds = [
    ...new Set(
      postRows
        .map(row =>
          row.user_id ||
          row.author_id ||
          row.owner_id
        )
        .filter(Boolean)
    )
  ];

  let profiles = [];

  if (userIds.length) {

    const result =
      await sb
        .from("profiles")
        .select(
          "id,username,display_name,avatar_url"
        )
        .in("id", userIds);

    profiles = result.data || [];
  }

  const profileMap = {};

  profiles.forEach(profile => {
    profileMap[profile.id] = profile;
  });

  const ids =
    postRows
      .map(row => row.id)
      .filter(Boolean);

  let likes = [];

  if (ids.length) {

    const result =
      await sb
        .from("post_likes")
        .select("post_id,user_id")
        .in("post_id", ids);

    likes = result.data || [];
  }

  const likeCount = {};

  const likedByMe = {};

  likes.forEach(row => {

    likeCount[row.post_id] =
      (likeCount[row.post_id] || 0) + 1;

    if (
      currentUser &&
      row.user_id === currentUser.id
    ) {
      likedByMe[row.post_id] = true;
    }

  });

  area.innerHTML = `
    <div class="feed">

      ${postRows.map(post => {

        const authorId =
          post.user_id ||
          post.author_id ||
          post.owner_id;

        const profile =
          profileMap[authorId] || {};

        const name =
          profile.display_name ||
          profile.username ||
          "User";

        const avatar =
          safeUrl(profile.avatar_url);

        const media =
          safeUrl(
            post.media_url ||
            post.file_url ||
            post.url
          );

        const mediaType =
          post.media_type ||
          "";

        const isVideo =
          mediaType === "video" ||
          /\.(mp4|webm|mov|m4v)(\?|$)/i.test(media);

        const caption =
          post.content ||
          post.caption ||
          "";

        return `
          <article class="post">

            <div class="post-head">

              ${
                avatar
                  ? `
                    <img
                      class="post-avatar"
                      src="${escapeAttr(avatar)}"
                      alt=""
                    >
                  `
                  : `
                    <div class="post-avatar"></div>
                  `
              }

              <div>
                <div class="post-author">
                  ${escapeHTML(name)}
                </div>

                <div class="post-date">
                  ${escapeHTML(
                    formatDate(post.created_at)
                  )}
                </div>
              </div>

            </div>

            ${
              media
                ? (
                  isVideo
                    ? `
                      <video
                        class="post-media"
                        src="${escapeAttr(media)}"
                        controls
                        playsinline
                      ></video>
                    `
                    : `
                      <img
                        class="post-media"
                        src="${escapeAttr(media)}"
                        alt=""
                        loading="lazy"
                      >
                    `
                )
                : ""
            }

            ${
              caption
                ? `
                  <div class="post-content">
                    ${escapeHTML(caption)}
                  </div>
                `
                : ""
            }

            <div class="post-actions">

              <button
                class="post-action ${
                  likedByMe[post.id]
                    ? "liked"
                    : ""
                }"
                onclick="toggleLike('${escapeAttr(post.id)}')"
                type="button"
              >
                ❤️ ${likeCount[post.id] || 0}
              </button>

              <button
                class="post-action"
                onclick="openComments('${escapeAttr(post.id)}')"
                type="button"
              >
                💬 Comment
              </button>

              <button
                class="post-action"
                onclick="sharePost('${escapeAttr(post.id)}')"
                type="button"
              >
                ↗️ Share
              </button>

              ${
                authorId
                  ? `
                    <button
                      class="post-action"
                      onclick="followUser('${escapeAttr(authorId)}')"
                      type="button"
                    >
                      + Follow
                    </button>
                  `
                  : ""
              }

            </div>

          </article>
        `;

      }).join("")}

    </div>
  `;
}


/* =========================================================
   LIKE
   ========================================================= */

async function toggleLike(postId) {

  if (!currentUser) {

    requireAccount(
      "like a post",
      () => toggleLike(postId)
    );

    return;
  }

  const {
    data,
    error
  } = await sb
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {

    toast(error.message, "error");

    return;
  }

  if (data) {

    const result =
      await sb
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUser.id);

    if (result.error) {
      toast(result.error.message, "error");
      return;
    }

  } else {

    const result =
      await sb
        .from("post_likes")
        .insert({
          post_id: postId,
          user_id: currentUser.id
        });

    if (result.error) {
      toast(result.error.message, "error");
      return;
    }
  }

  await loadPosts();
}


/* =========================================================
   COMMENTS
   ========================================================= */

async function openComments(postId) {

  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Comments
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>

      <div id="commentsArea">
        ${loading("Loading comments...")}
      </div>

      <div style="margin-top:15px">

        <textarea
          id="commentText"
          class="textarea"
          placeholder="Write a comment..."
        ></textarea>

        <button
          class="btn btn-primary btn-full"
          style="margin-top:10px"
          onclick="sendComment('${escapeAttr(postId)}')"
          type="button"
        >
          Send Comment
        </button>

      </div>

    </div>
  `);

  await loadComments(postId);
}


async function loadComments(postId) {

  const area =
    document.getElementById("commentsArea");

  if (!area) return;

  const {
    data,
    error
  } = await sb
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", {
      ascending: true
    });

  if (error) {

    area.innerHTML = dbError(error);

    return;
  }

  if (!data?.length) {

    area.innerHTML = `
      <div class="empty">
        No comments yet.
      </div>
    `;

    return;
  }

  area.innerHTML = data.map(comment => {

    const text =
      comment.content ||
      comment.body ||
      comment.text ||
      "";

    return `
      <div
        class="card"
        style="margin-bottom:8px"
      >
        <strong>
          ${escapeHTML(
            comment.username || "User"
          )}
        </strong>

        <p>
          ${escapeHTML(text)}
        </p>
      </div>
    `;

  }).join("");
}


async function sendComment(postId) {

  if (!currentUser) {

    requireAccount(
      "comment",
      () => sendComment(postId)
    );

    return;
  }

  const input =
    document.getElementById("commentText");

  const text =
    input?.value.trim();

  if (!text) {
    toast("Write a comment first.", "error");
    return;
  }

  let result =
    await sb
      .from("comments")
      .insert({
        post_id: postId,
        user_id: currentUser.id,
        content: text
      });

  if (result.error) {

    result =
      await sb
        .from("comments")
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          body: text
        });
  }

  if (result.error) {

    toast(
      result.error.message,
      "error"
    );

    return;
  }

  input.value = "";

  await loadComments(postId);
}


/* =========================================================
   FOLLOW
   ========================================================= */

async function followUser(userId) {

  if (!currentUser) {

    requireAccount(
      "follow this user",
      () => followUser(userId)
    );

    return;
  }

  if (currentUser.id === userId) {
    return;
  }

  const {
    data
  } = await sb
    .from("follows")
    .select("*")
    .eq("follower_id", currentUser.id)
    .eq("following_id", userId)
    .maybeSingle();

  if (data) {

    const result =
      await sb
        .from("follows")
        .delete()
        .eq(
          "follower_id",
          currentUser.id
        )
        .eq(
          "following_id",
          userId
        );

    if (result.error) {
      toast(result.error.message, "error");
      return;
    }

    toast("Unfollowed.", "success");

  } else {

    const result =
      await sb
        .from("follows")
        .insert({
          follower_id: currentUser.id,
          following_id: userId
        });

    if (result.error) {
      toast(result.error.message, "error");
      return;
    }

    toast("Following.", "success");
  }
}


/* =========================================================
   SHARE
   ========================================================= */

async function sharePost(postId) {

  const url =
    `${location.origin}${location.pathname}?post=${encodeURIComponent(postId)}`;

  try {

    if (navigator.share) {

      await navigator.share({
        title: "MENA",
        text: "Check this post on MENA",
        url
      });

    } else {

      await navigator.clipboard.writeText(url);

      toast(
        "Post link copied.",
        "success"
      );
    }

  } catch (error) {

    if (error?.name !== "AbortError") {
      toast("Could not share.", "error");
    }
  }
}


/* =========================================================
   PROFILE
   ========================================================= */

async function renderProfile() {

  if (!currentUser) {

    app.innerHTML = `
      <div class="page">

        <div class="profile-cover">

          <div class="profile-row">

            <div class="avatar"
                 style="display:grid;place-items:center;font-size:30px">
              👤
            </div>

            <div>

              <div class="profile-name">
                MENA Guest
              </div>

              <div class="profile-user">
                Browse MENA without an account
              </div>

            </div>

          </div>

        </div>


        <div
          class="section-title"
          style="margin-top:20px"
        >
          MENA Account
        </div>


        <div class="action-grid">

          <button
            class="action-card"
            onclick="requireAccount('open Wallet', openWallet)"
            type="button"
          >
            <div class="action-icon">💰</div>
            <div class="action-title">Wallet</div>
            <div class="action-text">
              Balance and coins
            </div>
          </button>


          <button
            class="action-card"
            onclick="requireAccount('buy coins', openBuyCoins)"
            type="button"
          >
            <div class="action-icon">🪙</div>
            <div class="action-title">Buy Coins</div>
            <div class="action-text">
              Packages from 5 coins
            </div>
          </button>


          <button
            class="action-card"
            onclick="requireAccount('withdraw', openWithdraw)"
            type="button"
          >
            <div class="action-icon">💸</div>
            <div class="action-title">Withdraw</div>
            <div class="action-text">
              Minimum 10 ETB
            </div>
          </button>


          <button
            class="action-card"
            onclick="requireAccount('exchange ETB into coins', openExchange)"
            type="button"
          >
            <div class="action-icon">🔄</div>
            <div class="action-title">
              Exchange into Coin
            </div>
            <div class="action-text">
              1 coin = 0.50 ETB
            </div>
          </button>


          <button
            class="action-card"
            onclick="showPage('market')"
            type="button"
          >
            <div class="action-icon">🛍️</div>
            <div class="action-title">
              My Market
            </div>
            <div class="action-text">
              Sell products
            </div>
          </button>


          <button
            class="action-card"
            onclick="showPage('market')"
            type="button"
          >
            <div class="action-icon">💼</div>
            <div class="action-title">
              Free Work
            </div>
            <div class="action-text">
              Find or post work
            </div>
          </button>

        </div>


        <button
          class="btn btn-primary btn-full"
          style="margin-top:18px"
          onclick="openAuth('signup')"
          type="button"
        >
          Create MENA Account
        </button>


        <button
          class="btn btn-outline btn-full"
          style="margin-top:10px"
          onclick="openAuth('login')"
          type="button"
        >
          Login
        </button>

      </div>
    `;

    return;
  }


  const profile =
    currentProfile || {};

  const avatar =
    safeUrl(profile.avatar_url);

  const name =
    profile.display_name ||
    profile.username ||
    currentUser.email ||
    "MENA User";

  const username =
    profile.username
      ? `@${profile.username}`
      : "";


  let postsCount = "—";
  let followersCount = "—";
  let followingCount = "—";


  try {

    const posts =
      await sb
        .from("posts")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq("user_id", currentUser.id);

    if (posts.count !== null) {
      postsCount = posts.count;
    }

  } catch {}


  try {

    const followers =
      await sb
        .from("follows")
        .select("follower_id", {
          count: "exact",
          head: true
        })
        .eq(
          "following_id",
          currentUser.id
        );

    if (followers.count !== null) {
      followersCount = followers.count;
    }

  } catch {}


  try {

    const following =
      await sb
        .from("follows")
        .select("following_id", {
          count: "exact",
          head: true
        })
        .eq(
          "follower_id",
          currentUser.id
        );

    if (following.count !== null) {
      followingCount = following.count;
    }

  } catch {}


  app.innerHTML = `
    <div class="page">

      <div class="profile-cover">

        <div class="profile-row">

          ${
            avatar
              ? `
                <img
                  class="avatar"
                  src="${escapeAttr(avatar)}"
                  alt=""
                >
              `
              : `
                <div
                  class="avatar"
                  style="
                    display:grid;
                    place-items:center;
                    font-size:28px;
                  "
                >
                  👤
                </div>
              `
          }

          <div>

            <div class="profile-name">
              ${escapeHTML(name)}
            </div>

            <div class="profile-user">
              ${escapeHTML(username)}
            </div>

          </div>

        </div>


        <div class="stats">

          <div class="stat">
            <strong>${postsCount}</strong>
            <small>Posts</small>
          </div>

          <div class="stat">
            <strong>${followersCount}</strong>
            <small>Followers</small>
          </div>

          <div class="stat">
            <strong>${followingCount}</strong>
            <small>Following</small>
          </div>

        </div>

      </div>


      <div
        class="section-title"
        style="margin-top:20px"
      >
        My MENA
      </div>


      <div class="action-grid">

        <button
          class="action-card"
          onclick="openWallet()"
          type="button"
        >
          <div class="action-icon">💰</div>
          <div class="action-title">Wallet</div>
          <div class="action-text">
            ETB and coin balance
          </div>
        </button>


        <button
          class="action-card"
          onclick="openBuyCoins()"
          type="button"
        >
          <div class="action-icon">🪙</div>
          <div class="action-title">Buy Coins</div>
          <div class="action-text">
            Choose a coin package
          </div>
        </button>


        <button
          class="action-card"
          onclick="openWithdraw()"
          type="button"
        >
          <div class="action-icon">💸</div>
          <div class="action-title">Withdraw</div>
          <div class="action-text">
            Minimum 10 ETB
          </div>
        </button>


        <button
          class="action-card"
          onclick="openExchange()"
          type="button"
        >
          <div class="action-icon">🔄</div>
          <div class="action-title">
            Exchange into Coin
          </div>
          <div class="action-text">
            0.50 ETB = 1 coin
          </div>
        </button>


        <button
          class="action-card"
          onclick="showPage('market')"
          type="button"
        >
          <div class="action-icon">🛍️</div>
          <div class="action-title">
            My Market
          </div>
          <div class="action-text">
            Manage your marketplace
          </div>
        </button>


        <button
          class="action-card"
          onclick="showPage('market')"
          type="button"
        >
          <div class="action-icon">💼</div>
          <div class="action-title">
            Free Work
          </div>
          <div class="action-text">
            Post or find work
          </div>
        </button>

      </div>


      <button
        class="btn btn-primary btn-full"
        style="margin-top:18px"
        onclick="openCreatePost()"
        type="button"
      >
        ＋ Create Post
      </button>


      <button
        class="btn btn-danger btn-full"
        style="margin-top:10px"
        onclick="logout()"
        type="button"
      >
        Log out
      </button>

    </div>
  `;
}


/* =========================================================
   WALLET
   ========================================================= */

async function openWallet() {

  if (!currentUser) {

    requireAccount(
      "open Wallet",
      openWallet
    );

    return;
  }

  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Wallet
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>

      <div id="walletArea">
        ${loading("Loading wallet...")}
      </div>

    </div>
  `);

  await loadWallet();
}


async function loadWallet() {

  const area =
    document.getElementById("walletArea");

  if (!area || !currentUser) return;


  const {
    data,
    error
  } = await sb
    .from("wallets")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();


  if (error) {

    area.innerHTML =
      dbError(error);

    return;
  }


  if (!data) {

    area.innerHTML = `
      <div class="empty">

        <div class="empty-icon">
          💰
        </div>

        <strong>
          Wallet is not available yet.
        </strong>

        <p class="muted">
          Your wallet should be created automatically
          after account registration.
        </p>

      </div>
    `;

    return;
  }


  const etb =
    getNumber(
      data,
      [
        "etb_balance",
        "balance_etb",
        "balance"
      ]
    );

  const coins =
    getNumber(
      data,
      [
        "coin_balance",
        "coins",
        "coin"
      ]
    );


  area.innerHTML = `

    <div class="wallet-main">

      <div class="wallet-label">
        Available ETB
      </div>

      <div class="wallet-balance">
        ${
          etb === null
            ? "—"
            : formatETB(etb)
        }
      </div>

      <div class="wallet-coins">
        🪙
        ${
          coins === null
            ? "—"
            : formatCoins(coins)
        }
      </div>


      <div class="wallet-buttons">

        <button
          class="wallet-button"
          onclick="openBuyCoins()"
          type="button"
        >
          🪙 Buy Coins
        </button>

        <button
          class="wallet-button"
          onclick="openWithdraw()"
          type="button"
        >
          💸 Withdraw
        </button>

        <button
          class="wallet-button"
          onclick="openExchange()"
          type="button"
        >
          🔄 Exchange
        </button>

        <button
          class="wallet-button"
          onclick="openTransactions()"
          type="button"
        >
          📋 Records
        </button>

      </div>

    </div>


    <div
      class="card"
      style="margin-top:14px"
    >

      <strong>
        Coin value
      </strong>

      <p class="muted">
        1 coin = ${formatETB(COIN_VALUE)}
      </p>

    </div>
  `;
}


/* =========================================================
   BUY COINS
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


function openBuyCoins() {

  if (!currentUser) {

    requireAccount(
      "buy coins",
      openBuyCoins
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Buy Coins
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div class="card" style="margin-bottom:15px">

        <strong>
          Coin price
        </strong>

        <p class="muted">
          1 coin = 0.50 ETB
        </p>

      </div>


      <div class="coin-grid">

        ${COIN_PACKAGES.map(coins => {

          const price =
            coins * COIN_VALUE;

          return `
            <div class="coin-card">

              <div class="coin-number">
                🪙
                ${coins.toLocaleString()}
              </div>

              <div class="coin-price">
                ${formatETB(price)}
              </div>

              <button
                class="coin-buy"
                onclick="buyCoinPackage(${coins})"
                type="button"
              >
                Buy
              </button>

            </div>
          `;

        }).join("")}

      </div>

    </div>
  `);
}


async function buyCoinPackage(coins) {

  if (!currentUser) {

    requireAccount(
      "buy coins",
      () => buyCoinPackage(coins)
    );

    return;
  }


  if (!COIN_PACKAGES.includes(Number(coins))) {
    toast("Invalid coin package.", "error");
    return;
  }


  const price =
    Number(coins) * COIN_VALUE;


  const confirmed =
    confirm(
      `Buy ${Number(coins).toLocaleString()} coins for ${formatETB(price)}?`
    );

  if (!confirmed) return;


  toast(
    "Starting secure payment...",
    ""
  );


  try {

    const result =
      await callFunction(
        "buy-coins",
        {
          coins: Number(coins),
          amount_etb: price
        }
      );


    if (result.error) {
      throw result.error;
    }


    toast(
      "Coin purchase request created.",
      "success"
    );


    closeModal();

    setTimeout(
      () => openWallet(),
      400
    );


  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      "Coin purchase could not be completed.",
      "error"
    );
  }
}


/* =========================================================
   WITHDRAW
   ========================================================= */

async function openWithdraw() {

  if (!currentUser) {

    requireAccount(
      "withdraw",
      openWithdraw
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Withdraw
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div id="withdrawArea">
        ${loading("Loading withdrawal information...")}
      </div>

    </div>
  `);


  await loadWithdraw();
}


async function loadWithdraw() {

  const area =
    document.getElementById("withdrawArea");

  if (!area) return;


  const walletResult =
    await sb
      .from("wallets")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();


  if (walletResult.error) {

    area.innerHTML =
      dbError(walletResult.error);

    return;
  }


  const wallet =
    walletResult.data || {};


  const balance =
    getNumber(
      wallet,
      [
        "etb_balance",
        "balance_etb",
        "balance"
      ]
    );


  area.innerHTML = `

    <div class="withdraw-card">

      <button
        class="record-button"
        onclick="openWithdrawRecords()"
        type="button"
      >
        Record
      </button>


      <div class="withdraw-label">
        Withdrawal Amount
      </div>


      <div class="withdraw-amount">
        ${
          balance === null
            ? "—"
            : formatETB(balance)
        }
      </div>


      <div class="withdraw-sub">
        Available ETB balance
      </div>


      <div class="withdraw-total">

        <div>
          <div class="muted">
            Total Amount
          </div>

          <strong>
            ${
              balance === null
                ? "—"
                : formatETB(balance)
            }
          </strong>
        </div>


        <div>
          <div class="muted">
            Minimum
          </div>

          <strong>
            ${formatETB(MIN_WITHDRAW)}
          </strong>
        </div>

      </div>

    </div>


    <button
      class="method-card"
      onclick="openPaymentMethods()"
      type="button"
      style="width:100%;border:0;text-align:left"
    >

      <div>

        <div class="method-title">
          Method
        </div>

        <div class="method-sub">
          Add a payment method
        </div>

      </div>

      <div class="method-arrow">
        →
      </div>

    </button>


    <div class="rules">

      <div class="rules-title">
        Withdrawal Rules
      </div>


      <div class="rules-table">

        <div class="rule-row">

          <div class="rule-name">
            Exchange Ratio
          </div>

          <div class="rule-value">
            1 ETB = 1 ETB
          </div>

        </div>


        <div class="rule-row">

          <div class="rule-name">
            Minimum Withdrawal Amount
          </div>

          <div class="rule-value">
            ${MIN_WITHDRAW} ETB
          </div>

        </div>

      </div>


      <div class="notice-text">

        1. Coins cannot be withdrawn directly.<br>
        2. Only available ETB balance can be withdrawn.<br>
        3. Payment-provider fees, if applicable, are handled by the secure backend.

      </div>


      <button
        class="large-action btn btn-blue"
        onclick="submitWithdrawForm()"
        type="button"
      >
        Withdraw now
      </button>


      <button
        class="large-action exchange-action"
        onclick="openExchange()"
        type="button"
      >
        Exchange Points for Coins
      </button>


      <button
        class="large-action transfer-action"
        onclick="openTransfer()"
        type="button"
      >
        Transfer
      </button>

    </div>

  `;
}


/* =========================================================
   SUBMIT WITHDRAW
   ========================================================= */

async function submitWithdrawForm() {

  if (!currentUser) {
    requireAccount(
      "withdraw",
      submitWithdrawForm
    );
    return;
  }


  const walletResult =
    await sb
      .from("wallets")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();


  if (walletResult.error) {
    toast(walletResult.error.message, "error");
    return;
  }


  const wallet =
    walletResult.data;


  const balance =
    getNumber(
      wallet,
      [
        "etb_balance",
        "balance_etb",
        "balance"
      ]
    );


  if (
    balance === null ||
    balance < MIN_WITHDRAW
  ) {

    toast(
      `Minimum withdrawal is ${MIN_WITHDRAW} ETB.`,
      "error"
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Withdraw
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div class="form-group">

        <label class="form-label">
          Withdrawal amount
        </label>

        <input
          id="withdrawAmount"
          class="input"
          type="number"
          min="${MIN_WITHDRAW}"
          max="${balance}"
          step="0.01"
          value="${Math.min(balance, MIN_WITHDRAW)}"
        >

      </div>


      <div class="form-group">

        <label class="form-label">
          Payment method
        </label>

        <select
          id="withdrawMethod"
          class="select"
        >

          <option value="">
            Select method
          </option>

          <option value="telebirr">
            Telebirr
          </option>

          <option value="mpesa">
            M-PESA
          </option>

          <option value="cbe">
            Commercial Bank of Ethiopia
          </option>

          <option value="awash">
            Awash Bank
          </option>

          <option value="abyssinia">
            Abyssinia Bank
          </option>

        </select>

      </div>


      <div class="form-group">

        <label class="form-label">
          Account / Phone number
        </label>

        <input
          id="withdrawAccount"
          class="input"
          type="text"
          placeholder="09xxxxxxxx"
        >

      </div>


      <button
        class="btn btn-primary btn-full"
        onclick="confirmWithdraw()"
        type="button"
      >
        Confirm Withdrawal
      </button>

    </div>
  `);
}


async function confirmWithdraw() {

  const amount =
    Number(
      document
        .getElementById("withdrawAmount")
        ?.value
    );


  const method =
    document
      .getElementById("withdrawMethod")
      ?.value;


  const account =
    document
      .getElementById("withdrawAccount")
      ?.value
      .trim();


  if (
    !Number.isFinite(amount) ||
    amount < MIN_WITHDRAW
  ) {

    toast(
      `Minimum withdrawal is ${MIN_WITHDRAW} ETB.`,
      "error"
    );

    return;
  }


  if (!method) {

    toast(
      "Select a payment method.",
      "error"
    );

    return;
  }


  if (!account) {

    toast(
      "Enter your account information.",
      "error"
    );

    return;
  }


  const confirmed =
    confirm(
      `Withdraw ${formatETB(amount)} using ${method}?`
    );

  if (!confirmed) return;


  try {

    const result =
      await callFunction(
        "withdraw",
        {
          amount_etb: amount,
          method,
          account
        }
      );


    if (result.error) {
      throw result.error;
    }


    closeModal();

    toast(
      "Withdrawal request submitted.",
      "success"
    );


  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      "Withdrawal failed.",
      "error"
    );
  }
}


/* =========================================================
   PAYMENT METHODS
   ========================================================= */

const PAYMENT_METHODS = [
  {
    id: "telebirr",
    name: "Telebirr",
    icon: "📱",
    fee: "Backend fee",
    arrival: "Processing time depends on provider"
  },

  {
    id: "mpesa",
    name: "M-PESA",
    icon: "💚",
    fee: "Backend fee",
    arrival: "Processing time depends on provider"
  },

  {
    id: "cbe",
    name: "Commercial Bank of Ethiopia",
    icon: "🏦",
    fee: "Backend fee",
    arrival: "Processing time depends on provider"
  },

  {
    id: "awash",
    name: "Awash Bank",
    icon: "🏦",
    fee: "Backend fee",
    arrival: "Processing time depends on provider"
  },

  {
    id: "abyssinia",
    name: "Abyssinia Bank",
    icon: "🏦",
    fee: "Backend fee",
    arrival: "Processing time depends on provider"
  }
];


function openPaymentMethods() {

  if (!currentUser) {

    requireAccount(
      "manage payment methods",
      openPaymentMethods
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Method
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div class="method-list">

        ${PAYMENT_METHODS.map(method => `

          <div class="payment-method">

            <div class="payment-logo">
              ${method.icon}
            </div>

            <div class="payment-info">

              <div class="payment-name">
                ${escapeHTML(method.name)}
              </div>

              <div class="payment-meta">

                <span class="tag">
                  ${escapeHTML(method.fee)}
                </span>

                <span class="tag">
                  ${escapeHTML(method.arrival)}
                </span>

              </div>

            </div>


            <button
              class="bind-btn"
              onclick="startBind('${escapeAttr(method.id)}')"
              type="button"
            >
              Bind
            </button>

          </div>

        `).join("")}

      </div>

    </div>
  `);
}


/* =========================================================
   BIND PAYMENT METHOD - SECURITY PASSWORD
   ========================================================= */

let bindingMethod = null;


function startBind(methodId) {

  const method =
    PAYMENT_METHODS.find(
      item => item.id === methodId
    );

  if (!method) {
    toast("Payment method not found.", "error");
    return;
  }

  bindingMethod = method;


  openModal(`
    <div class="modal-box pin-screen">

      <div class="modal-head">

        <div class="modal-title">
          New security password
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <p class="pin-description">

        Please set a 6-digit security password
        for withdrawal verification.

      </p>


      <div class="pin-boxes">

        ${[1,2,3,4,5,6].map(i => `
          <input
            id="pin${i}"
            class="pin-box"
            type="password"
            inputmode="numeric"
            maxlength="1"
            oninput="movePin(${i})"
          >
        `).join("")}

      </div>


      <button
        class="btn btn-primary btn-full"
        onclick="continueBind()"
        type="button"
      >
        Continue
      </button>

    </div>
  `);

}


function movePin(index) {

  const current =
    document.getElementById(`pin${index}`);

  if (
    current &&
    current.value &&
    index < 6
  ) {

    document
      .getElementById(`pin${index + 1}`)
      ?.focus();

  }
}


function getPin() {

  return [1,2,3,4,5,6]
    .map(i =>
      document.getElementById(`pin${i}`)?.value || ""
    )
    .join("");
}


function continueBind() {

  const pin = getPin();

  if (!/^\d{6}$/.test(pin)) {

    toast(
      "Enter exactly 6 digits.",
      "error"
    );

    return;
  }


  openBindDetails(pin);
}


/* =========================================================
   BIND DETAILS
   ========================================================= */

function openBindDetails(pin) {

  if (!bindingMethod) return;


  const method =
    bindingMethod;


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Bind
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div
        class="card"
        style="display:flex;align-items:center;gap:12px"
      >

        <div class="payment-logo">
          ${method.icon}
        </div>

        <div>

          <strong>
            ${escapeHTML(method.name)}
          </strong>

          <div class="muted">
            Enter your real account information.
          </div>

        </div>

      </div>


      <div class="form-group"
           style="margin-top:18px">

        <label class="form-label">
          Full Name
        </label>

        <input
          id="bindFullName"
          class="input"
          type="text"
          autocomplete="name"
          placeholder="Payee's full name"
        >

      </div>


      <div class="form-group">

        <label class="form-label">
          Phone / Account Number
        </label>

        <input
          id="bindAccount"
          class="input"
          type="text"
          autocomplete="tel"
          placeholder="09xxxxxxxx"
        >

      </div>


      <div class="card">

        <strong>
          Notice
        </strong>

        <p class="muted">
          Enter your own correct payment account.
          Incorrect account information can affect
          your withdrawal.
        </p>

      </div>


      <button
        class="btn btn-primary btn-full"
        style="margin-top:16px"
        onclick="submitBind('${escapeAttr(pin)}')"
        type="button"
      >
        Submit
      </button>

    </div>
  `);
}


/* =========================================================
   SUBMIT BIND
   ========================================================= */

async function submitBind(pin) {

  if (!currentUser) {

    requireAccount(
      "bind a payment method",
      () => submitBind(pin)
    );

    return;
  }


  const fullName =
    document
      .getElementById("bindFullName")
      ?.value
      .trim();


  const account =
    document
      .getElementById("bindAccount")
      ?.value
      .trim();


  if (!fullName || !account) {

    toast(
      "Fill in all account information.",
      "error"
    );

    return;
  }


  if (!bindingMethod) {

    toast(
      "Payment method is missing.",
      "error"
    );

    return;
  }


  try {

    const result =
      await callFunction(
        "bind-payment-method",
        {
          method: bindingMethod.id,
          full_name: fullName,
          account,
          security_pin: pin
        }
      );


    if (result.error) {
      throw result.error;
    }


    closeModal();

    toast(
      `${bindingMethod.name} was submitted for binding.`,
      "success"
    );


    bindingMethod = null;


  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      "Could not bind payment method.",
      "error"
    );
  }
}


/* =========================================================
   EXCHANGE ETB → COINS
   ========================================================= */

function openExchange() {

  if (!currentUser) {

    requireAccount(
      "exchange ETB into coins",
      openExchange
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Exchange into Coin
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div class="card">

        <strong>
          Exchange rate
        </strong>

        <p class="muted">
          1 coin = 0.50 ETB
        </p>

      </div>


      <div
        class="form-group"
        style="margin-top:16px"
      >

        <label class="form-label">
          ETB amount
        </label>

        <input
          id="exchangeAmount"
          class="input"
          type="number"
          min="0.50"
          step="0.50"
          placeholder="10"
          oninput="updateExchangePreview()"
        >

      </div>


      <div
        id="exchangePreview"
        class="card"
      >
        Enter an amount.
      </div>


      <button
        class="btn btn-primary btn-full"
        style="margin-top:14px"
        onclick="submitExchange()"
        type="button"
      >
        Exchange
      </button>

    </div>
  `);
}


function updateExchangePreview() {

  const amount =
    Number(
      document
        .getElementById("exchangeAmount")
        ?.value
    );


  const preview =
    document.getElementById(
      "exchangePreview"
    );


  if (!preview) return;


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    preview.textContent =
      "Enter an amount.";

    return;
  }


  const coins =
    amount / COIN_VALUE;


  preview.innerHTML = `
    You will receive approximately
    <strong>
      ${coins.toLocaleString()}
      coins
    </strong>
  `;
}


async function submitExchange() {

  const amount =
    Number(
      document
        .getElementById("exchangeAmount")
        ?.value
    );


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    toast(
      "Enter a valid ETB amount.",
      "error"
    );

    return;
  }


  if (amount % COIN_VALUE !== 0) {

    toast(
      "Amount must be divisible by 0.50 ETB.",
      "error"
    );

    return;
  }


  try {

    const result =
      await callFunction(
        "exchange-etb-to-coins",
        {
          amount_etb: amount
        }
      );


    if (result.error) {
      throw result.error;
    }


    closeModal();

    toast(
      "Exchange completed.",
      "success"
    );

  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      "Exchange failed.",
      "error"
    );
  }
}


/* =========================================================
   WITHDRAW RECORDS
   ========================================================= */

async function openWithdrawRecords() {

  if (!currentUser) {
    requireAccount(
      "view withdrawal records",
      openWithdrawRecords
    );
    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Withdrawal Records
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>

      <div id="withdrawRecordsArea">
        ${loading("Loading records...")}
      </div>

    </div>
  `);


  const result =
    await sb
      .from("withdrawals")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", {
        ascending: false
      });


  const area =
    document.getElementById(
      "withdrawRecordsArea"
    );


  if (result.error) {

    area.innerHTML = `
      <div class="empty">

        <div class="empty-icon">
          📋
        </div>

        <strong>
          Withdrawal records are not available.
        </strong>

        <p class="muted">
          ${escapeHTML(result.error.message)}
        </p>

      </div>
    `;

    return;
  }


  if (!result.data?.length) {

    area.innerHTML = `
      <div class="empty">
        No withdrawal records yet.
      </div>
    `;

    return;
  }


  area.innerHTML =
    result.data.map(row => {

      const amount =
        getNumber(
          row,
          [
            "amount_etb",
            "amount"
          ]
        );


      return `
        <div
          class="card"
          style="margin-bottom:10px"
        >

          <strong>
            ${amount === null
              ? "—"
              : formatETB(amount)}
          </strong>

          <p class="muted">
            ${escapeHTML(
              row.method || ""
            )}
            ${
              row.status
                ? ` • ${escapeHTML(row.status)}`
                : ""
            }
          </p>

          <small>
            ${escapeHTML(
              formatDate(row.created_at)
            )}
          </small>

        </div>
      `;

    }).join("");
}


/* =========================================================
   WALLET TRANSACTIONS
   ========================================================= */

async function openTransactions() {

  if (!currentUser) {

    requireAccount(
      "view wallet records",
      openTransactions
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Wallet Records
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>

      <div id="transactionsArea">
        ${loading("Loading records...")}
      </div>

    </div>
  `);


  const result =
    await sb
      .from("coin_transactions")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", {
        ascending: false
      })
      .limit(100);


  const area =
    document.getElementById(
      "transactionsArea"
    );


  if (result.error) {

    area.innerHTML = `
      <div class="empty">

        <div class="empty-icon">
          📋
        </div>

        <strong>
          Records unavailable.
        </strong>

        <p class="muted">
          ${escapeHTML(result.error.message)}
        </p>

      </div>
    `;

    return;
  }


  if (!result.data?.length) {

    area.innerHTML = `
      <div class="empty">
        No coin transactions yet.
      </div>
    `;

    return;
  }


  area.innerHTML =
    result.data.map(row => {

      const coins =
        getNumber(
          row,
          [
            "coins",
            "amount_coins",
            "coin_amount"
          ]
        );


      return `
        <div
          class="card"
          style="margin-bottom:10px"
        >

          <strong>
            ${
              coins === null
                ? ""
                : `${coins.toLocaleString()} coins`
            }
          </strong>

          <p class="muted">
            ${escapeHTML(
              row.type || ""
            )}
          </p>

          <small>
            ${escapeHTML(
              formatDate(row.created_at)
            )}
          </small>

        </div>
      `;

    }).join("");
}


/* =========================================================
   TRANSFER
   ========================================================= */

function openTransfer() {

  if (!currentUser) {

    requireAccount(
      "transfer",
      openTransfer
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Transfer
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>

      <div class="empty">

        <div class="empty-icon">
          🔒
        </div>

        <strong>
          Coin-to-user gift trading is disabled.
        </strong>

        <p class="muted">
          MENA does not allow direct user-to-user
          coin transfers.
        </p>

      </div>

    </div>
  `);
}


/* =========================================================
   MARKETPLACE
   ========================================================= */

async function renderMarketplace() {

  app.innerHTML = `
    <div class="page">

      <div class="market-hero">

        <h2 style="margin:0 0 10px">
          MENA Marketplace
        </h2>

        <input
          id="marketSearch"
          class="market-search"
          placeholder="Search products..."
          oninput="filterMarketplace()"
        >


        <div class="market-actions">

          <button
            class="market-action"
            onclick="openSellPage()"
            type="button"
          >
            + Sell
          </button>

          <button
            class="market-action"
            onclick="openFreeWork()"
            type="button"
          >
            💼 Free Work
          </button>

          <button
            class="market-action"
            onclick="openMyMarket()"
            type="button"
          >
            My Market
          </button>

        </div>

      </div>


      <div class="category-row">

        ${[
          "All",
          "Phones",
          "Electronics",
          "Fashion",
          "Home",
          "Beauty",
          "Vehicles",
          "Other"
        ].map(category => `
          <button
            class="category"
            onclick="filterCategory('${category}')"
            type="button"
          >
            ${category}
          </button>
        `).join("")}

      </div>


      <div id="marketArea">
        ${loading("Loading marketplace...")}
      </div>

    </div>
  `;


  const result =
    await sb
      .from("marketplace_listings")
      .select("*")
      .order("created_at", {
        ascending: false
      })
      .limit(100);


  if (result.error) {

    document.getElementById(
      "marketArea"
    ).innerHTML =
      dbError(result.error);

    return;
  }


  marketplaceRows =
    result.data || [];


  renderMarketplaceRows(
    marketplaceRows
  );
}


function getListingTitle(row) {

  return (
    row.title ||
    row.name ||
    row.product_name ||
    "Product"
  );
}


function getListingPrice(row) {

  let price =
    getNumber(
      row,
      [
        "buyer_price",
        "price",
        "selling_price",
        "amount"
      ]
    );


  if (price === null) {

    const sellerAmount =
      getNumber(
        row,
        [
          "seller_receive_amount",
          "seller_price",
          "desired_receive"
        ]
      );


    if (sellerAmount !== null) {
      price =
        sellerAmount /
        (1 - MARKETPLACE_FEE);
    }
  }


  return price;
}


function renderMarketplaceRows(rows) {

  const area =
    document.getElementById(
      "marketArea"
    );

  if (!area) return;


  if (!rows.length) {

    area.innerHTML = `
      <div class="empty">

        <div class="empty-icon">
          🛍️
        </div>

        <strong>
          No products yet.
        </strong>

        <p class="muted">
          Real seller listings will appear here.
        </p>

      </div>
    `;

    return;
  }


  area.innerHTML = `
    <div class="product-grid">

      ${rows.map(row => {

        const id =
          row.id;

        const title =
          getListingTitle(row);

        const price =
          getListingPrice(row);

        const image =
          safeUrl(
            row.image_url ||
            row.media_url ||
            row.photo_url
          );


        return `
          <article class="product">

            ${
              image
                ? `
                  <img
                    class="product-image"
                    src="${escapeAttr(image)}"
                    alt=""
                    loading="lazy"
                  >
                `
                : `
                  <div
                    class="product-image"
                    style="
                      display:grid;
                      place-items:center;
                      font-size:42px;
                    "
                  >
                    🛍️
                  </div>
                `
            }


            <div class="product-body">

              <div class="product-title">
                ${escapeHTML(title)}
              </div>


              <div class="product-price">

                ${
                  price === null
                    ? "Price unavailable"
                    : formatETB(price)
                }

              </div>


              <div class="product-delivery">
                Delivery: ${DELIVERY_FEE} ETB
              </div>


              <button
                class="product-buy"
                onclick="openListing('${escapeAttr(id)}')"
                type="button"
              >
                View / Buy
              </button>

            </div>

          </article>
        `;

      }).join("")}

    </div>
  `;
}


function filterMarketplace() {

  const query =
    document
      .getElementById("marketSearch")
      ?.value
      .trim()
      .toLowerCase() || "";


  const rows =
    marketplaceRows.filter(row => {

      const text = [
        getListingTitle(row),
        row.description,
        row.category
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();


      return text.includes(query);
    });


  renderMarketplaceRows(rows);
}


function filterCategory(category) {

  if (category === "All") {

    renderMarketplaceRows(
      marketplaceRows
    );

    return;
  }


  const rows =
    marketplaceRows.filter(row =>
      String(
        row.category || ""
      ).toLowerCase() ===
      category.toLowerCase()
    );


  renderMarketplaceRows(rows);
}


/* =========================================================
   LISTING DETAILS
   ========================================================= */

function openListing(id) {

  const row =
    marketplaceRows.find(
      item => item.id === id
    );


  if (!row) {

    toast(
      "This listing is no longer available.",
      "error"
    );

    return;
  }


  const title =
    getListingTitle(row);

  const price =
    getListingPrice(row);

  const image =
    safeUrl(
      row.image_url ||
      row.media_url ||
      row.photo_url
    );


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Product
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      ${
        image
          ? `
            <img
              src="${escapeAttr(image)}"
              style="
                width:100%;
                max-height:400px;
                object-fit:cover;
                border-radius:18px;
              "
              alt=""
            >
          `
          : ""
      }


      <h2>
        ${escapeHTML(title)}
      </h2>


      <div
        style="
          font-size:25px;
          font-weight:900;
          color:#087f5b;
        "
      >
        ${
          price === null
            ? "Price unavailable"
            : formatETB(price)
        }
      </div>


      <p class="muted">
        Delivery: ${DELIVERY_FEE} ETB
      </p>


      <p>
        ${escapeHTML(
          row.description || ""
        )}
      </p>


      ${
        row.category
          ? `
            <p class="muted">
              Category:
              ${escapeHTML(row.category)}
            </p>
          `
          : ""
      }


      <button
        class="btn btn-primary btn-full"
        onclick="openCheckout('${escapeAttr(id)}')"
        type="button"
      >
        Buy
      </button>

    </div>
  `);
}


/* =========================================================
   CHECKOUT
   ========================================================= */

function openCheckout(id) {

  if (!currentUser) {

    requireAccount(
      "buy this product",
      () => openCheckout(id)
    );

    return;
  }


  const row =
    marketplaceRows.find(
      item => item.id === id
    );


  if (!row) return;


  const price =
    getListingPrice(row);


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Checkout
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div class="card">

        <strong>
          ${escapeHTML(
            getListingTitle(row)
          )}
        </strong>

        <p>
          Product:
          ${
            price === null
              ? "—"
              : formatETB(price)
          }
        </p>

        <p>
          Delivery:
          ${formatETB(DELIVERY_FEE)}
        </p>

      </div>


      <div class="form-group"
           style="margin-top:15px">

        <label class="form-label">
          Quantity
        </label>

        <input
          id="orderQuantity"
          class="input"
          type="number"
          min="1"
          value="1"
        >

      </div>


      <div class="form-group">

        <label class="form-label">
          Delivery address
        </label>

        <textarea
          id="deliveryAddress"
          class="textarea"
          placeholder="Enter your delivery address"
        ></textarea>

      </div>


      <button
        class="btn btn-primary btn-full"
        onclick="submitOrder('${escapeAttr(id)}')"
        type="button"
      >
        Place Order
      </button>

    </div>
  `);
}


async function submitOrder(id) {

  const quantity =
    Number(
      document
        .getElementById("orderQuantity")
        ?.value
    );


  const address =
    document
      .getElementById("deliveryAddress")
      ?.value
      .trim();


  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {

    toast(
      "Enter a valid quantity.",
      "error"
    );

    return;
  }


  if (!address) {

    toast(
      "Enter a delivery address.",
      "error"
    );

    return;
  }


  try {

    const result =
      await callFunction(
        "create-market-order",
        {
          listing_id: id,
          quantity,
          delivery_address: address,
          delivery_fee: DELIVERY_FEE
        }
      );


    if (result.error) {
      throw result.error;
    }


    closeModal();

    toast(
      "Order request submitted.",
      "success"
    );

  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      "Order could not be created.",
      "error"
    );
  }
}


/* =========================================================
   SELL
   ========================================================= */

function openSellPage() {

  if (!currentUser) {

    requireAccount(
      "sell a product",
      openSellPage
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Sell on MENA
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div class="card">

        <strong>
          Seller receives exactly what you enter.
        </strong>

        <p class="muted">
          MENA marketplace fee = 5%.
          The buyer sees the calculated product price.
        </p>

      </div>


      <div class="form-group"
           style="margin-top:15px">

        <label class="form-label">
          Product name
        </label>

        <input
          id="sellTitle"
          class="input"
          placeholder="Product name"
        >

      </div>


      <div class="form-group">

        <label class="form-label">
          Description
        </label>

        <textarea
          id="sellDescription"
          class="textarea"
          placeholder="Describe the product"
        ></textarea>

      </div>


      <div class="form-group">

        <label class="form-label">
          Category
        </label>

        <select
          id="sellCategory"
          class="select"
        >

          <option>Phones</option>
          <option>Electronics</option>
          <option>Fashion</option>
          <option>Home</option>
          <option>Beauty</option>
          <option>Vehicles</option>
          <option>Other</option>

        </select>

      </div>


      <div class="form-group">

        <label class="form-label">
          Amount you want to receive
        </label>

        <input
          id="sellReceive"
          class="input"
          type="number"
          min="1"
          step="0.01"
          placeholder="950"
          oninput="updateSellPrice()"
        >

      </div>


      <div
        id="sellPricePreview"
        class="card"
      >
        Enter your desired amount.
      </div>


      <div class="form-group"
           style="margin-top:15px">

        <label class="form-label">
          Product image
        </label>

        <input
          id="sellImage"
          class="input"
          type="file"
          accept="image/*"
        >

      </div>


      <button
        class="btn btn-primary btn-full"
        onclick="submitSell()"
        type="button"
      >
        Publish Product
      </button>

    </div>
  `);
}


function updateSellPrice() {

  const desired =
    Number(
      document
        .getElementById("sellReceive")
        ?.value
    );


  const preview =
    document.getElementById(
      "sellPricePreview"
    );


  if (!preview) return;


  if (
    !Number.isFinite(desired) ||
    desired <= 0
  ) {

    preview.textContent =
      "Enter your desired amount.";

    return;
  }


  const buyerPrice =
    desired / (1 - MARKETPLACE_FEE);


  preview.innerHTML = `
    Buyer product price:
    <strong>
      ${formatETB(buyerPrice)}
    </strong>

    <br>

    MENA fee:
    <strong>
      ${formatETB(buyerPrice * MARKETPLACE_FEE)}
    </strong>

    <br>

    You receive:
    <strong>
      ${formatETB(desired)}
    </strong>

    <br>

    Buyer delivery:
    <strong>
      ${formatETB(DELIVERY_FEE)}
    </strong>
  `;
}


async function submitSell() {

  const title =
    document
      .getElementById("sellTitle")
      ?.value
      .trim();


  const description =
    document
      .getElementById("sellDescription")
      ?.value
      .trim();


  const category =
    document
      .getElementById("sellCategory")
      ?.value;


  const desired =
    Number(
      document
        .getElementById("sellReceive")
        ?.value
    );


  const file =
    document
      .getElementById("sellImage")
      ?.files?.[0];


  if (!title || !description) {

    toast(
      "Enter product name and description.",
      "error"
    );

    return;
  }


  if (
    !Number.isFinite(desired) ||
    desired <= 0
  ) {

    toast(
      "Enter a valid receive amount.",
      "error"
    );

    return;
  }


  let mediaUrl = null;


  try {

    if (file) {

      mediaUrl =
        await uploadMedia(
          file,
          "market"
        );
    }


    const buyerPrice =
      desired /
      (1 - MARKETPLACE_FEE);


    const result =
      await callFunction(
        "create-market-listing",
        {
          title,
          description,
          category,
          seller_receive_amount: desired,
          buyer_price: buyerPrice,
          delivery_fee: DELIVERY_FEE,
          media_url: mediaUrl
        }
      );


    if (result.error) {
      throw result.error;
    }


    closeModal();

    toast(
      "Product listing created.",
      "success"
    );


    if (currentPage === "market") {
      await renderMarketplace();
    }

  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      "Could not publish product.",
      "error"
    );
  }
}


/* =========================================================
   FREE WORK
   ========================================================= */

function openFreeWork() {

  if (!currentUser) {

    requireAccount(
      "post Free Work",
      openFreeWork
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Free Work
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div class="card">

        <strong>
          Posting fee: 50 ETB
        </strong>

        <p class="muted">
          Active for 30 days.
        </p>

      </div>


      <div class="form-group"
           style="margin-top:15px">

        <label class="form-label">
          Work title
        </label>

        <input
          id="workTitle"
          class="input"
          placeholder="What work do you need?"
        >

      </div>


      <div class="form-group">

        <label class="form-label">
          Description
        </label>

        <textarea
          id="workDescription"
          class="textarea"
          placeholder="Describe the work"
        ></textarea>

      </div>


      <div class="form-group">

        <label class="form-label">
          Category
        </label>

        <input
          id="workCategory"
          class="input"
          placeholder="Example: Design"
        >

      </div>


      <div class="form-group">

        <label class="form-label">
          Material / budget amount
        </label>

        <input
          id="workBudget"
          class="input"
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
        >

      </div>


      <button
        class="btn btn-primary btn-full"
        onclick="submitFreeWork()"
        type="button"
      >
        Post Free Work — 50 ETB
      </button>

    </div>
  `);
}


async function submitFreeWork() {

  const title =
    document
      .getElementById("workTitle")
      ?.value
      .trim();


  const description =
    document
      .getElementById("workDescription")
      ?.value
      .trim();


  const category =
    document
      .getElementById("workCategory")
      ?.value
      .trim();


  const budget =
    Number(
      document
        .getElementById("workBudget")
        ?.value || 0
    );


  if (!title || !description) {

    toast(
      "Enter title and description.",
      "error"
    );

    return;
  }


  try {

    const result =
      await callFunction(
        "create-free-work",
        {
          title,
          description,
          category,
          material_amount_etb:
            Number.isFinite(budget)
              ? budget
              : 0,
          posting_fee_etb: 50,
          active_days: 30
        }
      );


    if (result.error) {
      throw result.error;
    }


    closeModal();

    toast(
      "Free Work post created.",
      "success"
    );

  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      "Could not create Free Work post.",
      "error"
    );
  }
}


/* =========================================================
   MY MARKET
   ========================================================= */

async function openMyMarket() {

  if (!currentUser) {

    requireAccount(
      "open My Market",
      openMyMarket
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          My Market
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div id="myMarketArea">
        ${loading("Loading your market...")}
      </div>

    </div>
  `);


  let result =
    await sb
      .from("marketplace_listings")
      .select("*")
      .eq("seller_id", currentUser.id)
      .order("created_at", {
        ascending: false
      });


  if (result.error) {

    result =
      await sb
        .from("marketplace_listings")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", {
          ascending: false
        });
  }


  const area =
    document.getElementById(
      "myMarketArea"
    );


  if (result.error) {

    area.innerHTML =
      dbError(result.error);

    return;
  }


  const listings =
    result.data || [];


  if (!listings.length) {

    area.innerHTML = `
      <div class="empty">

        <div class="empty-icon">
          🛍️
        </div>

        <strong>
          You have no products yet.
        </strong>

        <button
          class="btn btn-primary"
          style="margin-top:15px"
          onclick="closeModal();openSellPage()"
          type="button"
        >
          Sell a Product
        </button>

      </div>
    `;

    return;
  }


  area.innerHTML =
    listings.map(row => {

      const price =
        getListingPrice(row);

      return `
        <div
          class="card"
          style="margin-bottom:10px"
        >

          <strong>
            ${escapeHTML(
              getListingTitle(row)
            )}
          </strong>

          <p>
            ${
              price === null
                ? "—"
                : formatETB(price)
            }
          </p>

          <small class="muted">
            ${
              row.status
                ? escapeHTML(row.status)
                : "Active"
            }
          </small>

        </div>
      `;

    }).join("");
}


/* =========================================================
   CREATE POST
   ========================================================= */

function openCreateMenu() {

  if (!currentUser) {

    requireAccount(
      "create content",
      openCreateMenu
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Create
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <button
        class="btn btn-primary btn-full"
        onclick="closeModal();openCreatePost()"
        type="button"
      >
        🎬 Create Post
      </button>


      <button
        class="btn btn-outline btn-full"
        style="margin-top:10px"
        onclick="closeModal();openGoLive()"
        type="button"
      >
        🔴 Go Live
      </button>


      <button
        class="btn btn-outline btn-full"
        style="margin-top:10px"
        onclick="closeModal();openSellPage()"
        type="button"
      >
        🛍️ Sell Product
      </button>


      <button
        class="btn btn-outline btn-full"
        style="margin-top:10px"
        onclick="closeModal();openFreeWork()"
        type="button"
      >
        💼 Free Work
      </button>

    </div>
  `);
}


function openCreatePost() {

  if (!currentUser) {

    requireAccount(
      "create a post",
      openCreatePost
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Create Post
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div class="form-group">

        <label class="form-label">
          Caption
        </label>

        <textarea
          id="postCaption"
          class="textarea"
          placeholder="Write something..."
        ></textarea>

      </div>


      <div class="form-group">

        <label class="form-label">
          Photo or video
        </label>

        <input
          id="postMedia"
          class="input"
          type="file"
          accept="image/*,video/*"
          capture="environment"
        >

      </div>


      <button
        class="btn btn-primary btn-full"
        onclick="submitPost()"
        type="button"
      >
        Publish
      </button>

    </div>
  `);
}


async function submitPost() {

  const caption =
    document
      .getElementById("postCaption")
      ?.value
      .trim();


  const file =
    document
      .getElementById("postMedia")
      ?.files?.[0];


  if (!file && !caption) {

    toast(
      "Add a caption or media.",
      "error"
    );

    return;
  }


  try {

    let mediaUrl = null;

    let mediaType = null;


    if (file) {

      mediaUrl =
        await uploadMedia(
          file,
          "posts"
        );


      mediaType =
        file.type.startsWith("video/")
          ? "video"
          : "image";
    }


    const result =
      await sb
        .from("posts")
        .insert({
          user_id: currentUser.id,
          content: caption || null,
          media_url: mediaUrl,
          media_type: mediaType
        });


    if (result.error) {
      throw result.error;
    }


    closeModal();

    toast(
      "Post published.",
      "success"
    );


    if (currentPage === "home") {
      await renderHome();
    }

  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      "Could not publish post.",
      "error"
    );
  }
}


/* =========================================================
   STORAGE
   ========================================================= */

async function uploadMedia(file, folder) {

  if (!currentUser) {
    throw new Error("Login required.");
  }


  const safeName =
    file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_");


  const path =
    `${currentUser.id}/${folder}/${crypto.randomUUID()}-${safeName}`;


  const result =
    await sb
      .storage
      .from("media")
      .upload(
        path,
        file,
        {
          cacheControl: "3600",
          upsert: false
        }
      );


  if (result.error) {
    throw result.error;
  }


  const publicResult =
    sb
      .storage
      .from("media")
      .getPublicUrl(path);


  return publicResult.data.publicUrl;
}


/* =========================================================
   INBOX
   ========================================================= */

async function renderInbox() {

  if (!currentUser) {

    app.innerHTML = `
      <div class="page">

        <div class="empty">

          <div class="empty-icon">
            ✉️
          </div>

          <strong>
            Login to use Inbox.
          </strong>

          <button
            class="btn btn-primary"
            style="margin-top:15px"
            onclick="openAuth('login')"
            type="button"
          >
            Login
          </button>

        </div>

      </div>
    `;

    return;
  }


  app.innerHTML = `
    <div class="page">

      <div class="section-title">
        Inbox
      </div>

      <div id="inboxArea">
        ${loading("Loading messages...")}
      </div>

    </div>
  `;


  const result =
    await sb
      .from("messages")
      .select("*")
      .or(
        `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
      )
      .order("created_at", {
        ascending: false
      });


  const area =
    document.getElementById(
      "inboxArea"
    );


  if (result.error) {

    area.innerHTML = `
      <div class="empty">

        <div class="empty-icon">
          ✉️
        </div>

        <strong>
          Inbox backend is not connected.
        </strong>

        <p class="muted">
          The frontend is ready, but the
          messages table/backend must exist
          before real messages can appear.
        </p>

      </div>
    `;

    return;
  }


  if (!result.data?.length) {

    area.innerHTML = `
      <div class="empty">

        <div class="empty-icon">
          ✉️
        </div>

        <strong>
          No messages yet.
        </strong>

      </div>
    `;

    return;
  }


  area.innerHTML =
    result.data.map(row => `

      <div
        class="card"
        style="margin-bottom:10px"
      >

        <strong>
          ${escapeHTML(
            row.subject ||
            "Message"
          )}
        </strong>

        <p>
          ${escapeHTML(
            row.content ||
            row.body ||
            ""
          )}
        </p>

        <small class="muted">
          ${escapeHTML(
            formatDate(row.created_at)
          )}
        </small>

      </div>

    `).join("");
}


/* =========================================================
   SEARCH
   ========================================================= */

async function openSearch() {

  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Search MENA
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <input
        id="globalSearch"
        class="input"
        placeholder="Search users, posts and products..."
        oninput="runGlobalSearch()"
      >


      <div
        id="globalSearchResults"
        style="margin-top:15px"
      ></div>

    </div>
  `);
}


async function runGlobalSearch() {

  const query =
    document
      .getElementById("globalSearch")
      ?.value
      .trim();


  const area =
    document.getElementById(
      "globalSearchResults"
    );


  if (!area) return;


  if (!query) {

    area.innerHTML = `
      <div class="empty">
        Type something to search.
      </div>
    `;

    return;
  }


  const like =
    `%${query}%`;


  const [
    profilesResult,
    productsResult,
    postsResult
  ] =
    await Promise.all([
      sb
        .from("profiles")
        .select(
          "id,username,display_name,avatar_url"
        )
        .or(
          `username.ilike.${like},display_name.ilike.${like}`
        )
        .limit(10),

      sb
        .from("marketplace_listings")
        .select("*")
        .or(
          `title.ilike.${like},description.ilike.${like}`
        )
        .limit(10),

      sb
        .from("posts")
        .select("*")
        .ilike(
          "content",
          like
        )
        .limit(10)
    ]);


  area.innerHTML = `

    <div class="section-title">
      Users
    </div>

    ${
      profilesResult.data?.length
        ? profilesResult.data.map(user => `
          <div
            class="card"
            style="margin-bottom:8px"
          >
            <strong>
              ${escapeHTML(
                user.display_name ||
                user.username ||
                "User"
              )}
            </strong>

            <p class="muted">
              ${
                user.username
                  ? `@${escapeHTML(user.username)}`
                  : ""
              }
            </p>
          </div>
        `).join("")
        : `<p class="muted">No users found.</p>`
    }


    <div class="section-title"
         style="margin-top:20px">
      Products
    </div>

    ${
      productsResult.data?.length
        ? productsResult.data.map(product => `
          <button
            class="card"
            style="
              width:100%;
              text-align:left;
              margin-bottom:8px;
            "
            onclick="closeModal();showPage('market')"
            type="button"
          >
            <strong>
              ${escapeHTML(
                getListingTitle(product)
              )}
            </strong>
          </button>
        `).join("")
        : `<p class="muted">No products found.</p>`
    }


    <div class="section-title"
         style="margin-top:20px">
      Posts
    </div>

    ${
      postsResult.data?.length
        ? postsResult.data.map(post => `
          <div
            class="card"
            style="margin-bottom:8px"
          >
            ${escapeHTML(
              post.content ||
              post.caption ||
              ""
            )}
          </div>
        `).join("")
        : `<p class="muted">No posts found.</p>`
    }

  `;
}


/* =========================================================
   SETTINGS
   ========================================================= */

function openSettings() {

  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Settings
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      ${
        currentUser
          ? `
            <div class="card">

              <strong>
                Account
              </strong>

              <p class="muted">
                ${escapeHTML(
                  currentUser.email || ""
                )}
              </p>

            </div>


            <button
              class="btn btn-danger btn-full"
              style="margin-top:12px"
              onclick="closeModal();logout()"
              type="button"
            >
              Log out
            </button>
          `
          : `
            <button
              class="btn btn-primary btn-full"
              onclick="closeModal();openAuth('login')"
              type="button"
            >
              Login
            </button>

            <button
              class="btn btn-outline btn-full"
              style="margin-top:10px"
              onclick="closeModal();openAuth('signup')"
              type="button"
            >
              Create Account
            </button>
          `
      }

    </div>
  `);
}


/* =========================================================
   LIVE
   ========================================================= */

function openGoLive() {

  if (!currentUser) {

    requireAccount(
      "go live",
      openGoLive
    );

    return;
  }


  openModal(`
    <div class="modal-box">

      <div class="modal-head">

        <div class="modal-title">
          Go Live
        </div>

        <button
          class="close"
          onclick="closeModal()"
          type="button"
        >×</button>

      </div>


      <div class="form-group">

        <label class="form-label">
          Stream name
        </label>

        <input
          id="liveName"
          class="input"
          placeholder="My live stream"
        >

      </div>


      <button
        class="btn btn-primary btn-full"
        onclick="createLiveSession()"
        type="button"
      >
        Start Live Session
      </button>

    </div>
  `);
}


async function createLiveSession() {

  const name =
    document
      .getElementById("liveName")
      ?.value
      .trim();


  if (!name) {

    toast(
      "Enter a stream name.",
      "error"
    );

    return;
  }


  try {

    const result =
      await callFunction(
        "create-live-token",
        {
          room_name: name
        }
      );


    if (result.error) {
      throw result.error;
    }


    closeModal();

    toast(
      "Live session created by the backend.",
      "success"
    );


  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      "Live backend is not configured.",
      "error"
    );
  }
}


/* =========================================================
   SUPABASE EDGE FUNCTION HELPER
   ========================================================= */

async function callFunction(name, body) {

  const sessionResult =
    await sb.auth.getSession();


  const session =
    sessionResult.data.session;


  if (!session) {

    return {
      error: new Error(
        "Please login first."
      )
    };
  }


  const result =
    await sb.functions.invoke(
      name,
      {
        body
      }
    );


  return result;
}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("./sw.js")
        .catch(error => {
          console.warn(
            "Service worker:",
            error
          );
        });

    }
  );
}


/* =========================================================
   AUTH STATE
   ========================================================= */

sb.auth.onAuthStateChange(
  async (_event, session) => {

    currentUser =
      session?.user || null;

    if (currentUser) {

      const { data } =
        await sb
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

      currentProfile =
        data || null;

    } else {

      currentProfile = null;
    }


    if (currentPage === "profile") {
      await renderProfile();
    }
  }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

async function init() {

  try {

    await refreshUser();

  } catch (error) {

    console.error(error);

  }


  await showPage("home");
}


init();


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

Object.assign(
  window,
  {
    showPage,
    openAuth,
    submitAuth,
    logout,

    closeModal,
    modalOutside,

    requireAccount,

    openWallet,
    loadWallet,

    openBuyCoins,
    buyCoinPackage,

    openWithdraw,
    submitWithdrawForm,
    confirmWithdraw,

    openPaymentMethods,
    startBind,
    movePin,
    continueBind,
    submitBind,

    openExchange,
    updateExchangePreview,
    submitExchange,

    openWithdrawRecords,
    openTransactions,

    openTransfer,

    openMarketplace,
    renderMarketplace,

    openSellPage,
    updateSellPrice,
    submitSell,

    openFreeWork,
    submitFreeWork,

    openMyMarket,

    openListing,
    openCheckout,
    submitOrder,

    filterMarketplace,
    filterCategory,

    openCreateMenu,
    openCreatePost,
    submitPost,

    toggleLike,
    openComments,
    sendComment,
    followUser,
    sharePost,

    openSearch,
    runGlobalSearch,

    openSettings,

    openGoLive,
    createLiveSession
  }
);
