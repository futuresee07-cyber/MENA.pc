/* =========================================================
   MENA — FULL SUPABASE FRONTEND
   Guest browsing + authenticated actions
   Marketplace + Free Work + Wallet + Coins + Withdraw
   ========================================================= */

const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const app = document.getElementById("app");
const modal = document.getElementById("modal");
const mediaInput = document.getElementById("mediaInput");

let currentUser = null;
let currentProfile = null;
let page = "home";
let posts = [];
let gifts = [];
let searchTimer = null;
let pendingAction = null;


/* =========================================================
   HELPERS
   ========================================================= */

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

const escapeAttr = escapeHTML;

const esc = escapeHTML;

const etb = value =>
  `${Number(value || 0).toFixed(2)} ETB`;

const val = id =>
  document.getElementById(id)?.value?.trim() || "";

const userMeta = user =>
  user?.profiles || {};

function toast(message) {
  alert(message);
}

function openModal(content) {
  modal.innerHTML = `
    <section class="sheet">
      <button class="close" onclick="closeModal()">×</button>
      ${content}
    </section>
  `;

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  modal.innerHTML = "";
}

window.closeModal = closeModal;


/* =========================================================
   NAVIGATION
   ========================================================= */

function bindNav() {

  document.querySelectorAll("[data-page]").forEach(button => {

    button.onclick = () => {

      const target = button.dataset.page;

      if (
        target === "profile" &&
        !currentUser
      ) {
        page = "profile";
        render();
        return;
      }

      page = target;

      render();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    };

  });

}

function showPage(target) {

  page = target;

  render();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

window.showPage = showPage;


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function init() {

  bindNav();

  if (
    SUPABASE_URL.includes("PASTE_") ||
    SUPABASE_ANON_KEY.includes("PASTE_")
  ) {
    return showConfig();
  }

  const {
    data: {
      session
    }
  } = await sb.auth.getSession();

  currentUser = session?.user || null;

  if (currentUser) {
    await ensureProfile();
    await loadCurrentProfile();
    await loadCatalogs();
  }

  /*
    IMPORTANT:
    Guests can browse MENA.
    We do NOT force login on startup.
  */

  render();

  sb.auth.onAuthStateChange(
    async (_event, session) => {

      currentUser =
        session?.user || null;

      if (currentUser) {

        await ensureProfile();
        await loadCurrentProfile();
        await loadCatalogs();

        render();

        if (pendingAction) {

          const action = pendingAction;

          pendingAction = null;

          setTimeout(() => {

            try {
              action();
            } catch (error) {
              console.error(error);
            }

          }, 300);

        }

      } else {

        currentProfile = null;
        render();

      }

    }
  );

}


function showConfig() {

  app.innerHTML = `

    <section class="page">

      <div class="card">

        <div class="brand">
          <span class="logo">M</span>
          <strong>MENA</strong>
        </div>

        <h2>Supabase setup required</h2>

        <p>
          Open script.js and replace:
        </p>

        <div class="notice">
          SUPABASE_URL<br>
          SUPABASE_ANON_KEY
        </div>

        <p class="muted">
          Use only the public Supabase publishable/anon key.
          Never put a service-role secret key in GitHub.
        </p>

      </div>

    </section>

  `;

}


/* =========================================================
   AUTH MODAL
   ========================================================= */

function openAuth(mode = "signup") {

  openModal(`

    <h2>
      ${mode === "signup"
        ? "Create your MENA account"
        : "Log in to MENA"}
    </h2>

    <p class="muted">
      Browsing MENA is free.
      An account is only required for account actions.
    </p>

    ${
      mode === "signup"
      ? `
        <input
          id="authFullName"
          class="input"
          placeholder="Full name"
        >

        <input
          id="authUsername"
          class="input"
          placeholder="Username"
        >
      `
      : ""
    }

    <input
      id="authEmail"
      class="input"
      type="email"
      placeholder="Email"
    >

    <input
      id="authPassword"
      class="input"
      type="password"
      placeholder="Password"
    >

    <button
      class="action primary block"
      onclick="${
        mode === "signup"
          ? "signUp()"
          : "signIn()"
      }"
    >
      ${
        mode === "signup"
          ? "Create account"
          : "Log in"
      }
    </button>

    <button
      class="action block"
      onclick="openAuth('${
        mode === "signup"
          ? "login"
          : "signup"
      }')"
    >
      ${
        mode === "signup"
          ? "Already have an account? Log in"
          : "Create a new account"
      }
    </button>

    <p id="authMsg" class="muted"></p>

  `);

}

window.openAuth = openAuth;


async function signUp() {

  const email =
    document.getElementById("authEmail")?.value.trim();

  const password =
    document.getElementById("authPassword")?.value;

  const username =
    document.getElementById("authUsername")?.value.trim();

  const full_name =
    document.getElementById("authFullName")?.value.trim();

  if (!email || !password || !username) {

    return toast(
      "Username, email and password are required."
    );

  }

  const {
    error
  } = await sb.auth.signUp({

    email,

    password,

    options: {
      data: {
        username,
        full_name
      }
    }

  });

  const message =
    document.getElementById("authMsg");

  if (error) {

    if (message) {
      message.textContent = error.message;
    }

    return;

  }

  if (message) {

    message.textContent =
      "Account created. Check your email if confirmation is enabled.";

  }

}


async function signIn() {

  const email =
    document.getElementById("authEmail")?.value.trim();

  const password =
    document.getElementById("authPassword")?.value;

  const {
    data,
    error
  } = await sb.auth.signInWithPassword({

    email,
    password

  });

  if (error) {

    return toast(error.message);

  }

  currentUser = data.user;

  await ensureProfile();

  await loadCurrentProfile();

  await loadCatalogs();

  closeModal();

  render();

}

async function logout() {

  await sb.auth.signOut();

  currentUser = null;

  currentProfile = null;

  page = "home";

  render();

}

window.signUp = signUp;
window.signIn = signIn;
window.logout = logout;


/* =========================================================
   REQUIRE ACCOUNT
   ========================================================= */

function requireAccount(actionName, callback) {

  if (currentUser) {

    if (typeof callback === "function") {
      callback();
    }

    return true;
  }

  pendingAction = callback || null;

  openAuth("signup");

  return false;

}

window.requireAccount = requireAccount;


/* =========================================================
   PROFILE LOADING
   ========================================================= */

async function ensureProfile() {

  if (!currentUser) return;

  const {
    data: profile
  } = await sb
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (profile) {

    currentProfile = profile;

    return;

  }

  const raw =
    currentUser.user_metadata || {};

  let base =
    raw.username ||
    `user_${currentUser.id.slice(0, 8)}`;

  base = base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

  if (!base) {
    base = `user_${currentUser.id.slice(0, 8)}`;
  }

  const {
    data,
    error
  } = await sb
    .from("profiles")
    .insert({

      id: currentUser.id,

      username: base,

      full_name:
        raw.full_name || ""

    })
    .select("*")
    .single();

  if (!error) {

    currentProfile = data;

  }

}


async function loadCurrentProfile() {

  if (!currentUser) return;

  const {
    data
  } = await sb
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = data || null;

}


/* =========================================================
   CATALOG
   ========================================================= */

async function loadCatalogs() {

  const {
    data
  } = await sb
    .from("gift_catalog")
    .select("*")
    .eq("active", true)
    .order("coin_cost");

  gifts = data || [];

}


/* =========================================================
   POSTS
   ========================================================= */

async function loadPosts() {

  const {
    data,
    error
  } = await sb
    .from("posts")
    .select(`
      *,
      profiles(
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .order("created_at", {
      ascending: false
    })
    .limit(60);

  if (error) {

    console.error(error);

    posts = [];

    return;

  }

  posts = data || [];

}


/* =========================================================
   MAIN RENDER
   ========================================================= */

async function render() {

  bindNav();

  if (page === "home") {
    return home();
  }

  if (page === "market") {
    return market();
  }

  if (page === "work") {
    return work();
  }

  if (page === "profile") {
    return renderProfile();
  }

  page = "home";

  return home();

}

window.render = render;


/* =========================================================
   HOME
   ========================================================= */

async function home() {

  await loadPosts();

  app.innerHTML = `

    <section class="page">

      <div class="hero">

        <div class="title">
          For You
        </div>

        <div class="subtitle">
          Discover real MENA content.
        </div>

      </div>


      <div class="card">

        <div class="row between">

          <div>

            <b>Live</b>

            <div class="muted">
              Watch or start a live stream.
            </div>

          </div>

          <button
            class="action primary"
            onclick="requireAccount('live', startLive)"
          >
            🔴 Live
          </button>

        </div>

      </div>


      ${
        posts.length
        ?
        `<div class="feed">
          ${posts.map(postCard).join("")}
        </div>`
        :
        `
        <div class="card empty">

          <h3>No posts yet</h3>

          <p class="muted">
            MENA has no public posts yet.
          </p>

          ${
            currentUser
            ?
            `
            <button
              class="action primary"
              onclick="openCreatePost()"
            >
              ＋ Create Post
            </button>
            `
            :
            `
            <button
              class="action primary"
              onclick="openAuth('signup')"
            >
              Create Account
            </button>
            `
          }

        </div>
        `
      }

    </section>

  `;

}


/* =========================================================
   POST CARD
   ========================================================= */

function postCard(post) {

  const owner =
    userMeta(post);

  const media =
    post.media_type === "video"

      ?

      `
      <video
        class="media"
        src="${escapeAttr(post.media_url)}"
        controls
        playsinline
      ></video>
      `

      :

      `
      <img
        class="media"
        src="${escapeAttr(post.media_url)}"
        alt="MENA post"
      >
      `;


  return `

    <article
      class="card video-card"
      id="post-${escapeAttr(post.id)}"
    >

      <div class="post-head">

        <div class="row">

          <button
            class="link"
            onclick="profile('${escapeAttr(post.user_id)}')"
          >

            ${
              owner.avatar_url
              ?
              `<img
                class="avatar"
                src="${escapeAttr(owner.avatar_url)}"
                alt=""
              >`
              :
              `<span class="avatar"></span>`
            }

          </button>


          <div>

            <button
              class="link"
              onclick="profile('${escapeAttr(post.user_id)}')"
            >
              ${escapeHTML(
                owner.full_name ||
                owner.username ||
                "MENA user"
              )}
            </button>

            <div class="muted">
              @${escapeHTML(
                owner.username || "user"
              )}
            </div>

          </div>

        </div>

      </div>


      ${media}


      <div class="post-body">

        <p>
          ${escapeHTML(post.caption || "")}
        </p>


        <div class="actions">

          <button
            class="action"
            onclick="requireAccount(
              'like',
              () => likePost('${escapeAttr(post.id)}')
            )"
          >
            ❤️ ${post.likes_count || 0}
          </button>


          <button
            class="action"
            onclick="requireAccount(
              'comment',
              () => commentPost('${escapeAttr(post.id)}')
            )"
          >
            💬 ${post.comments_count || 0}
          </button>


          <button
            class="action"
            onclick="requireAccount(
              'gift',
              () => giftPost(
                '${escapeAttr(post.id)}',
                '${escapeAttr(post.user_id)}'
              )
            )"
          >
            🎁 Gift
          </button>


          <button
            class="action"
            onclick="requireAccount(
              'follow',
              () => followUser('${escapeAttr(post.user_id)}')
            )"
          >
            ＋ Follow
          </button>


          <button
            class="action"
            onclick="sharePost('${escapeAttr(post.id)}')"
          >
            ↗ Share
          </button>

        </div>

      </div>

    </article>

  `;

}


/* =========================================================
   LIKE
   ========================================================= */

async function likePost(postId) {

  if (!currentUser) {
    return requireAccount(
      "like",
      () => likePost(postId)
    );
  }

  const {
    error
  } = await sb
    .from("post_likes")
    .upsert(
      {
        post_id: postId,
        user_id: currentUser.id
      },
      {
        onConflict:
          "post_id,user_id"
      }
    );

  if (error) {
    return toast(error.message);
  }

  await loadPosts();

  render();

}

window.likePost = likePost;


/* =========================================================
   FOLLOW
   ========================================================= */

async function followUser(userId) {

  if (!currentUser) {

    return requireAccount(
      "follow",
      () => followUser(userId)
    );

  }

  if (userId === currentUser.id) {

    return toast(
      "You cannot follow yourself."
    );

  }

  const {
    error
  } = await sb
    .from("follows")
    .upsert(
      {
        follower_id: currentUser.id,
        following_id: userId
      },
      {
        onConflict:
          "follower_id,following_id"
      }
    );

  if (error) {

    return toast(error.message);

  }

  toast("Followed.");

}

window.followUser = followUser;


/* =========================================================
   COMMENTS
   ========================================================= */

async function commentPost(postId) {

  if (!currentUser) {

    return requireAccount(
      "comment",
      () => commentPost(postId)
    );

  }

  const {
    data
  } = await sb
    .from("comments")
    .select(`
      *,
      profiles(
        username,
        avatar_url
      )
    `)
    .eq("post_id", postId)
    .order("created_at", {
      ascending: true
    });


  const comments = data || [];


  openModal(`

    <h2>Comments</h2>

    <div>

      ${
        comments.length

        ?

        comments.map(comment => `

          <div class="comment">

            <b>
              @${escapeHTML(
                comment.profiles?.username ||
                "user"
              )}
            </b>

            ${escapeHTML(
              comment.comment_text
            )}

          </div>

        `).join("")

        :

        `<p class="muted">
          No comments yet.
        </p>`
      }

    </div>


    <textarea
      id="commentText"
      class="textarea"
      placeholder="Write a comment..."
    ></textarea>


    <button
      class="action primary block"
      onclick="sendComment('${escapeAttr(postId)}')"
    >
      💬 Comment
    </button>

  `);

}


async function sendComment(postId) {

  if (!currentUser) {
    return requireAccount(
      "comment",
      () => sendComment(postId)
    );
  }

  const text =
    val("commentText");

  if (!text) return;


  const {
    error
  } = await sb
    .from("comments")
    .insert({

      post_id: postId,

      user_id:
        currentUser.id,

      comment_text:
        text

    });


  if (error) {

    return toast(error.message);

  }

  closeModal();

  await loadPosts();

  render();

}

window.commentPost = commentPost;
window.sendComment = sendComment;


/* =========================================================
   SHARE
   ========================================================= */

async function sharePost(postId) {

  const url =
    `${location.origin}${location.pathname}#post-${postId}`;

  try {

    await navigator.clipboard.writeText(url);

    toast("Post link copied.");

  } catch {

    toast(url);

  }

}

window.sharePost = sharePost;


/* =========================================================
   GIFTS
   ========================================================= */

function giftPost(
  postId,
  receiverId
) {

  if (!currentUser) {

    return requireAccount(
      "gift",
      () => giftPost(postId, receiverId)
    );

  }

  if (!gifts.length) {

    return toast(
      "Gift catalog is empty."
    );

  }


  openModal(`

    <h2>Send a gift</h2>

    <p class="muted">

      1 coin = 0.50 ETB.

      The 30% platform fee is handled
      by the secure backend.

    </p>


    <div class="gift-grid">

      ${
        gifts.map(gift => `

          <button
            class="gift"
            onclick="
              chooseGift(
                '${escapeAttr(postId)}',
                '${escapeAttr(receiverId)}',
                ${Number(gift.id)},
                ${Number(gift.coin_cost)}
              )
            "
          >

            <span class="emoji">
              ${escapeHTML(gift.icon || "🎁")}
            </span>

            <b>
              ${escapeHTML(gift.name)}
            </b>

            <small>
              ${Number(gift.coin_cost)} coins
            </small>

          </button>

        `).join("")
      }

    </div>

  `);

}


function chooseGift(
  postId,
  receiverId,
  giftId,
  cost
) {

  closeModal();

  toast(
    `${cost} coins selected. The secure gift backend must confirm the transaction before coins are charged.`
  );

}

window.giftPost = giftPost;
window.chooseGift = chooseGift;


/* =========================================================
   CREATE POST
   ========================================================= */

function openCreatePost() {

  if (!currentUser) {

    return requireAccount(
      "post",
      () => openCreatePost()
    );

  }


  openModal(`

    <h2>Create Post</h2>

    <p class="muted">
      Upload a photo or video from your camera or gallery.
    </p>


    <button
      class="action primary block"
      onclick="pickMedia()"
    >
      📷 Choose Photo / Video
    </button>


    <p class="notice">
      Your media is uploaded to the MENA
      Supabase Storage bucket.
    </p>

  `);

}


function pickMedia() {

  if (!currentUser) {

    return requireAccount(
      "post",
      () => pickMedia()
    );

  }

  closeModal();

  mediaInput.click();

}


mediaInput.addEventListener(
  "change",
  async event => {

    const file =
      event.target.files?.[0];

    if (!file) return;


    const caption =
      prompt("Caption") || "";


    const ext =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "bin";


    const path =
      `${currentUser.id}/${crypto.randomUUID()}.${ext}`;


    const upload =
      await sb
        .storage
        .from("media")
        .upload(
          path,
          file,
          {
            upsert: false,
            contentType: file.type
          }
        );


    if (upload.error) {

      mediaInput.value = "";

      return toast(
        `Upload failed: ${upload.error.message}`
      );

    }


    const publicURL =
      sb
        .storage
        .from("media")
        .getPublicUrl(path)
        .data
        .publicUrl;


    const media_type =
      file.type.startsWith("video/")
        ? "video"
        : "image";


    const {
      error
    } = await sb
      .from("posts")
      .insert({

        user_id:
          currentUser.id,

        media_url:
          publicURL,

        media_type,

        caption

      });


    if (error) {

      return toast(
        error.message
      );

    }


    mediaInput.value = "";

    page = "home";

    await loadPosts();

    render();

  }
);


window.pickMedia = pickMedia;
window.openCreatePost = openCreatePost;


/* =========================================================
   LIVE
   ========================================================= */

function startLive() {

  if (!currentUser) {

    return requireAccount(
      "live",
      () => startLive()
    );

  }


  openModal(`

    <h2>Start MENA Live</h2>

    <input
      id="liveName"
      class="input"
      placeholder="Stream name"
    >


    <button
      class="action primary block"
      onclick="requestAV()"
    >
      🎥 Camera + 🎙 Microphone
    </button>


    <p class="notice">

      Camera and microphone permissions
      can be tested here.

      Real multi-user live streaming,
      guests, chat and gifts require
      the secure live backend/media server.

    </p>

  `);

}


async function requestAV() {

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

    stream
      .getTracks()
      .forEach(track => track.stop());

    toast(
      "Camera and microphone permission granted."
    );

    closeModal();

  } catch {

    toast(
      "Camera or microphone permission was denied."
    );

  }

}

window.startLive = startLive;
window.requestAV = requestAV;


/* =========================================================
   MARKETPLACE
   AMAZON-STYLE SECTION
   ========================================================= */

async function market() {

  const {
    data,
    error
  } = await sb
    .from("marketplace_listings")
    .select(`
      *,
      profiles(
        username,
        full_name,
        avatar_url
      )
    `)
    .eq("status", "active")
    .order("created_at", {
      ascending: false
    })
    .limit(40);


  if (error) {

    console.error(error);

  }


  const items =
    data || [];


  app.innerHTML = `

    <section class="page">

      <div class="title">

        <div>

          <h2>Marketplace</h2>

          <p>
            Buy and sell real products.
          </p>

        </div>

      </div>


      <div class="actions">

        <button
          class="action primary"
          onclick="requireAccount(
            'sell',
            newListing
          )"
        >
          ＋ Sell
        </button>


        <button
          class="action"
          onclick="work()"
        >
          💼 Free Work
        </button>

      </div>


      <div class="notice">

        <b>MENA fee: 5%</b>

        <br>

        Seller enters the amount
        they want to receive.

        <br>

        Delivery is separate:
        <b>80 ETB</b>.

      </div>


      ${
        items.length

        ?

        `<div class="grid2">
          ${items.map(
            marketCard
          ).join("")}
        </div>`

        :

        `
        <div class="card empty">

          <h3>
            No marketplace products yet.
          </h3>

          <p class="muted">
            Real products posted by MENA users
            will appear here.
          </p>

        </div>
        `
      }

    </section>

  `;

}


function marketCard(item) {

  return `

    <article class="card market-item">

      ${
        item.image_url
        ?
        `
        <img
          class="market-img"
          src="${escapeAttr(item.image_url)}"
          alt=""
        >
        `
        :
        `
        <div class="market-placeholder">
          🛍️
        </div>
        `
      }


      <h3>
        ${escapeHTML(item.title)}
      </h3>


      <p>
        ${escapeHTML(
          item.description || ""
        )}
      </p>


      <strong class="price">
        ${etb(item.price_etb)}
      </strong>


      <p class="delivery">
        🚚 Delivery: 80 ETB
      </p>


      <p class="muted">
        Seller:
        @${escapeHTML(
          item.profiles?.username ||
          "user"
        )}
      </p>


      <button
        class="action primary block"
        onclick="buyMarketItem('${escapeAttr(item.id)}')"
      >
        Buy
      </button>

    </article>

  `;

}


function newListing() {

  if (!currentUser) {

    return requireAccount(
      "sell",
      () => newListing()
    );

  }


  openModal(`

    <h2>Sell on MENA</h2>

    <p class="muted">
      Enter the exact amount you want to receive.
    </p>


    <input
      id="mt"
      class="input"
      placeholder="Product title"
    >


    <textarea
      id="md"
      class="textarea"
      placeholder="Product description"
    ></textarea>


    <input
      id="mreceive"
      class="input"
      type="number"
      min="0"
      placeholder="Amount you want to receive"
    >


    <input
      id="mphone"
      class="input"
      placeholder="Seller phone"
    >


    <input
      id="mloc"
      class="input"
      placeholder="Location"
    >


    <input
      id="mimg"
      class="input"
      placeholder="Public image URL (optional)"
    >


    <div class="notice">

      MENA fee: 5%.

      <br>

      Buyer sees product price =
      your requested amount ÷ 0.95.

      <br>

      Delivery = 80 ETB separately.

    </div>


    <button
      class="action primary block"
      onclick="saveListing()"
    >
      Continue
    </button>

  `);

}


async function saveListing() {

  if (!currentUser) {

    return requireAccount(
      "sell",
      () => saveListing()
    );

  }


  const receive =
    Number(val("mreceive") || 0);

  if (receive <= 0) {

    return toast(
      "Enter the amount you want to receive."
    );

  }


  const buyerPrice =
    Math.ceil(
      (receive / 0.95) * 100
    ) / 100;


  openModal(`

    <h2>Review Product</h2>

    <p>
      You want to receive:
      <b>${etb(receive)}</b>
    </p>

    <p>
      Buyer product price:
      <b>${etb(buyerPrice)}</b>
    </p>

    <p>
      MENA 5% fee:
      <b>${etb(
        buyerPrice - receive
      )}</b>
    </p>

    <p>
      Buyer delivery:
      <b>80.00 ETB</b>
    </p>


    <button
      class="action primary block"
      onclick="submitListing(
        ${buyerPrice},
        ${receive}
      )"
    >
      Continue
    </button>

  `);

}


async function submitListing(
  buyerPrice,
  sellerReceive
) {

  /*
    IMPORTANT:
    Final listing creation/payment must be
    done by a secure Edge Function.
  */

  const {
    data,
    error
  } = await sb.functions.invoke(
    "create-market-listing",
    {
      body: {

        title: val("mt"),

        description:
          val("md"),

        buyer_price_etb:
          buyerPrice,

        seller_receive_etb:
          sellerReceive,

        phone:
          val("mphone"),

        location:
          val("mloc"),

        image_url:
          val("mimg")

      }
    }
  );


  if (error) {

    return toast(
      "Marketplace backend is not connected yet: " +
      error.message
    );

  }


  if (data?.error) {

    return toast(data.error);

  }


  closeModal();

  toast(
    "Marketplace listing submitted."
  );

  market();

}


async function buyMarketItem(
  listingId
) {

  if (!currentUser) {

    return requireAccount(
      "buy",
      () => buyMarketItem(listingId)
    );

  }


  openModal(`

    <h2>Buy Product</h2>

    <p>
      Delivery:
      <b>80 ETB</b>
    </p>

    <p class="muted">
      Your order is created only after
      secure backend verification.
    </p>


    <button
      class="action primary block"
      onclick="
        createMarketOrder(
          '${escapeAttr(listingId)}'
        )
      "
    >
      Confirm Purchase
    </button>

  `);

}


async function createMarketOrder(
  listingId
) {

  const {
    error
  } = await sb.functions.invoke(
    "create-market-order",
    {
      body: {
        listing_id: listingId
      }
    }
  );


  if (error) {

    return toast(
      "Order backend is not connected: " +
      error.message
    );

  }


  closeModal();

  toast(
    "Order request submitted."
  );

}


window.market = market;
window.newListing = newListing;
window.saveListing = saveListing;
window.submitListing = submitListing;
window.buyMarketItem = buyMarketItem;
window.createMarketOrder = createMarketOrder;


/* =========================================================
   FREE WORK
   ========================================================= */

async function work() {

  const {
    data,
    error
  } = await sb
    .from("free_work_posts")
    .select(`
      *,
      profiles(
        username,
        full_name,
        avatar_url
      )
    `)
    .eq("status", "active")
    .order("created_at", {
      ascending: false
    })
    .limit(40);


  if (error) {
    console.error(error);
  }


  const items =
    data || [];


  app.innerHTML = `

    <section class="page">

      <div class="title">

        <div>

          <h2>Free Work</h2>

          <p>
            Find work opportunities.
          </p>

        </div>

      </div>


      <div class="actions">

        <button
          class="action"
          onclick="market()"
        >
          🛍 Marketplace
        </button>


        <button
          class="action primary"
          onclick="requireAccount(
            'free work',
            newWork
          )"
        >
          ＋ Post Work
        </button>

      </div>


      <div class="notice">

        Posting fee:
        <b>50 ETB</b>

        <br>

        Active for:
        <b>30 days</b>

        <br>

        No marketplace 5% selling fee.

      </div>


      ${
        items.length

        ?

        items.map(item => `

          <article class="card">

            <span class="pill">
              ${escapeHTML(
                item.category ||
                "WORK"
              )}
            </span>


            <h3>
              ${escapeHTML(item.title)}
            </h3>


            <p>
              ${escapeHTML(
                item.description || ""
              )}
            </p>


            <p>
              Material:
              <b>
                ${etb(
                  item.material_amount_etb
                )}
              </b>
            </p>


            <p class="muted">
              Contact:
              ${escapeHTML(
                item.contact || ""
              )}
            </p>

          </article>

        `).join("")

        :

        `
        <div class="card empty">

          <h3>
            No Free Work posts yet.
          </h3>

          <p class="muted">
            Real work posts from users
            will appear here.
          </p>

        </div>
        `
      }

    </section>

  `;

}


function newWork() {

  if (!currentUser) {

    return requireAccount(
      "free work",
      () => newWork()
    );

  }


  openModal(`

    <h2>Post Free Work</h2>


    <input
      id="wt"
      class="input"
      placeholder="Work title"
    >


    <textarea
      id="wd"
      class="textarea"
      placeholder="Work details"
    ></textarea>


    <input
      id="wc"
      class="input"
      placeholder="Category"
    >


    <input
      id="wcontact"
      class="input"
      placeholder="Contact"
    >


    <input
      id="wm"
      class="input"
      type="number"
      min="0"
      placeholder="Material amount ETB"
    >


    <div class="notice">

      Posting fee:
      <b>50 ETB</b>

      <br>

      Your post stays active for
      <b>30 days</b>.

    </div>


    <button
      class="action primary block"
      onclick="saveWork()"
    >
      Continue
    </button>

  `);

}


async function saveWork() {

  if (!currentUser) {

    return requireAccount(
      "free work",
      () => saveWork()
    );

  }


  const payload = {

    title:
      val("wt"),

    description:
      val("wd"),

    category:
      val("wc"),

    contact:
      val("wcontact"),

    material_amount_etb:
      Number(
        val("wm") || 0
      )

  };


  const {
    error
  } = await sb.functions.invoke(
    "create-free-work",
    {
      body: payload
    }
  );


  if (error) {

    return toast(
      "Free Work backend is not connected: " +
      error.message
    );

  }


  closeModal();

  toast(
    "Free Work post submitted."
  );

  work();

}

window.work = work;
window.newWork = newWork;
window.saveWork = saveWork;


/* =========================================================
   PROFILE
   ========================================================= */

async function renderProfile() {

  /* ---------------- GUEST PROFILE ---------------- */

  if (!currentUser) {

    app.innerHTML = `

      <section class="page">

        <div class="gradient-hero">

          <h1>MENA Profile</h1>

          <p>
            Browse MENA freely.
            Sign up only when you want to post,
            withdraw, buy coins, sell or use your wallet.
          </p>

        </div>


        <div class="action-grid">


          <button
            class="action-card"
            onclick="requireAccount('wallet', openWallet)"
          >
            <strong>💰 Wallet</strong>

            <small>
              Balance and earnings
            </small>
          </button>


          <button
            class="action-card"
            onclick="requireAccount('coins', openBuyCoins)"
          >
            <strong>🪙 Buy Coins</strong>

            <small>
              1 coin = 0.50 ETB
            </small>
          </button>


          <button
            class="action-card"
            onclick="requireAccount('withdraw', openWithdraw)"
          >
            <strong>💸 Withdraw</strong>

            <small>
              Minimum 10 ETB
            </small>
          </button>


          <button
            class="action-card"
            onclick="requireAccount('coins', openExchange)"
          >
            <strong>🔄 Exchange into Coin</strong>

            <small>
              ETB → Coins
            </small>
          </button>


          <button
            class="action-card"
            onclick="showPage('market')"
          >
            <strong>🛍 My Market</strong>

            <small>
              Buy and sell products
            </small>
          </button>


          <button
            class="action-card"
            onclick="showPage('work')"
          >
            <strong>💼 Free Work</strong>

            <small>
              Find and post work
            </small>
          </button>


        </div>


        <div
          class="empty"
          style="margin-top:15px"
        >

          <div class="empty-icon">
            👤
          </div>


          <h3>
            You are browsing as a guest
          </h3>


          <p class="muted">

            You don't need an account
            to browse MENA.

            Sign up when you want
            to use account features.

          </p>


          <button
            class="primary-btn"
            style="margin-top:15px"
            onclick="openAuth('signup')"
          >
            Create MENA Account
          </button>


        </div>

      </section>

    `;

    return;

  }


  /* ---------------- LOGGED-IN PROFILE ---------------- */

  await loadCurrentProfile();


  const avatar =
    currentProfile?.avatar_url || "";


  const name =
    currentProfile?.full_name ||
    currentProfile?.display_name ||
    currentProfile?.username ||
    "MENA user";


  const username =
    currentProfile?.username ||
    "";


  app.innerHTML = `

    <section class="page">


      <div class="profile-cover">


        <div class="profile-main">


          ${
            avatar

            ?

            `
            <img
              class="profile-avatar"
              src="${escapeAttr(avatar)}"
              alt=""
            >
            `

            :

            `
            <div class="profile-avatar">
            </div>
            `
          }


          <div>

            <div class="profile-name">
              ${escapeHTML(name)}
            </div>


            <div class="profile-handle">
              @${escapeHTML(username)}
            </div>

          </div>


        </div>


        <div class="profile-stats">


          <div class="profile-stat">

            <strong>
              ${currentProfile?.posts_count || "—"}
            </strong>

            <small>
              Posts
            </small>

          </div>


          <div class="profile-stat">

            <strong>
              ${currentProfile?.followers_count || "—"}
            </strong>

            <small>
              Followers
            </small>

          </div>


          <div class="profile-stat">

            <strong>
              ${currentProfile?.following_count || "—"}
            </strong>

            <small>
              Following
            </small>

          </div>


        </div>


      </div>


      <!-- MONEY / ACCOUNT BUTTONS -->

      <div class="action-grid">


        <button
          class="action-card"
          onclick="openWallet()"
        >

          <strong>
            💰 Wallet
          </strong>

          <small>
            Balance and earnings
          </small>

        </button>


        <button
          class="action-card"
          onclick="openBuyCoins()"
        >

          <strong>
            🪙 Buy Coins
          </strong>

          <small>
            1 coin = 0.50 ETB
          </small>

        </button>


        <button
          class="action-card"
          onclick="openWithdraw()"
        >

          <strong>
            💸 Withdraw
          </strong>

          <small>
            Minimum 10 ETB
          </small>

        </button>


        <button
          class="action-card"
          onclick="openExchange()"
        >

          <strong>
            🔄 Exchange into Coin
          </strong>

          <small>
            Convert ETB to coins
          </small>

        </button>


        <button
          class="action-card"
          onclick="showPage('market')"
        >

          <strong>
            🛍 My Market
          </strong>

          <small>
            Buy and sell products
          </small>

        </button>


        <button
          class="action-card"
          onclick="showPage('work')"
        >

          <strong>
            💼 Free Work
          </strong>

          <small>
            Work opportunities
          </small>

        </button>


      </div>


      <!-- CREATE POST -->

      <button
        class="primary-btn"
        style="margin-top:15px"
        onclick="openCreatePost()"
      >
        ＋ Create Post
      </button>


      <!-- EDIT PROFILE -->

      <button
        class="action block"
        style="margin-top:10px"
        onclick="editProfile()"
      >
        ✏️ Edit Profile
      </button>


      <!-- LOGOUT -->

      <button
        class="primary-btn"
        style="
          margin-top:10px;
          background:linear-gradient(
            110deg,
            #ef4444,
            #ff7b54
          );
        "
        onclick="logout()"
      >
        Log out
      </button>


    </section>

  `;

}

window.renderProfile = renderProfile;


/*
  Keep the old profile() calls working.
*/
async function profile(userId) {

  if (
    !currentUser &&
    userId
  ) {

    return requireAccount(
      "profile",
      () => profile(userId)
    );

  }

  if (
    userId &&
    currentUser &&
    userId !== currentUser.id
  ) {

    return renderOtherProfile(userId);

  }

  return renderProfile();

}

window.profile = profile;


/* =========================================================
   OTHER USER PROFILE
   ========================================================= */

async function renderOtherProfile(userId) {

  const {
    data: p,
    error
  } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();


  if (error) {

    return toast(
      error.message
    );

  }


  const {
    data: userPosts
  } = await sb
    .from("posts")
    .select(`
      id,
      media_url,
      media_type,
      caption,
      likes_count,
      comments_count,
      created_at
    `)
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false
    })
    .limit(30);


  app.innerHTML = `

    <section class="page">

      <div class="card">


        <div class="row">

          ${
            p.avatar_url

            ?

            `
            <img
              class="avatar big"
              src="${escapeAttr(p.avatar_url)}"
              alt=""
            >
            `

            :

            `
            <div class="avatar big">
            </div>
            `
          }


          <div>

            <h2>
              ${escapeHTML(
                p.full_name ||
                p.username ||
                "MENA user"
              )}
            </h2>

            <div class="muted">
              @${escapeHTML(
                p.username || "user"
              )}
            </div>

          </div>

        </div>


        <p>
          ${escapeHTML(
            p.bio || ""
          )}
        </p>


        <div class="stats">


          <div class="stat">
            <strong>
              ${p.followers_count || 0}
            </strong>
            <small>
              Followers
            </small>
          </div>


          <div class="stat">
            <strong>
              ${p.following_count || 0}
            </strong>
            <small>
              Following
            </small>
          </div>


          <div class="stat">
            <strong>
              ${p.likes_count || 0}
            </strong>
            <small>
              Likes
            </small>
          </div>


        </div>


        <button
          class="action primary block"
          onclick="requireAccount(
            'follow',
            () => followUser('${escapeAttr(userId)}')
          )"
        >
          ＋ Follow
        </button>


      </div>


      <div class="section-title">
        Posts
      </div>


      ${
        userPosts?.length

        ?

        `
        <div class="grid2">

          ${userPosts.map(post => `

            <div class="card">

              ${
                post.media_type === "video"

                ?

                `
                <video
                  class="market-img"
                  controls
                  src="${escapeAttr(post.media_url)}"
                ></video>
                `

                :

                `
                <img
                  class="market-img"
                  src="${escapeAttr(post.media_url)}"
                  alt=""
                >
                `
              }


              <p>
                ${escapeHTML(
                  post.caption || ""
                )}
              </p>

            </div>

          `).join("")}

        </div>
        `

        :

        `
        <div class="card empty">
          No posts.
        </div>
        `
      }

    </section>

  `;

}


/* =========================================================
   EDIT PROFILE
   ========================================================= */

function editProfile() {

  if (!currentUser) {

    return requireAccount(
      "profile",
      editProfile
    );

  }


  openModal(`

    <h2>
      Edit Profile
    </h2>


    <input
      id="epname"
      class="input"
      value="${escapeAttr(
        currentProfile?.full_name || ""
      )}"
      placeholder="Full name"
    >


    <input
      id="epuser"
      class="input"
      value="${escapeAttr(
        currentProfile?.username || ""
      )}"
      placeholder="Username"
    >


    <textarea
      id="epbio"
      class="textarea"
      placeholder="Bio"
    >${escapeHTML(
      currentProfile?.bio || ""
    )}</textarea>


    <input
      id="epavatar"
      class="input"
      value="${escapeAttr(
        currentProfile?.avatar_url || ""
      )}"
      placeholder="Avatar public URL"
    >


    <button
      class="action primary block"
      onclick="saveProfile()"
    >
      Save
    </button>

  `);

}


async function saveProfile() {

  const update = {

    full_name:
      val("epname"),

    username:
      val("epuser"),

    bio:
      val("epbio"),

    avatar_url:
      val("epavatar"),

    updated_at:
      new Date().toISOString()

  };


  const {
    error
  } = await sb
    .from("profiles")
    .update(update)
    .eq("id", currentUser.id);


  if (error) {

    return toast(
      error.message
    );

  }


  closeModal();

  await loadCurrentProfile();

  render();

}

window.editProfile = editProfile;
window.saveProfile = saveProfile;


/* =========================================================
   MARKET SETTINGS
   ========================================================= */

function openMarketSettings() {

  openModal(`

    <h2>
      Market
    </h2>


    <div class="actions">


      <button
        class="action primary block"
        onclick="
          closeModal();
          showPage('market')
        "
      >
        🛍 Marketplace
      </button>


      <button
        class="action block"
        onclick="
          closeModal();
          showPage('work')
        "
      >
        💼 Free Work
      </button>


    </div>

  `);

}

window.openMarketSettings =
  openMarketSettings;


/* =========================================================
   WALLET
   ========================================================= */

function openWallet() {

  if (!currentUser) {

    return requireAccount(
      "wallet",
      openWallet
    );

  }


  sb
    .from("wallets")
    .select(
      "coin_balance,etb_balance"
    )
    .eq(
      "user_id",
      currentUser.id
    )
    .maybeSingle()
    .then(result => {

      const wallet =
        result.data || {
          coin_balance: 0,
          etb_balance: 0
        };


      openModal(`

        <h2>
          💰 Wallet
        </h2>


        <div class="stats">


          <div class="stat">

            <strong>
              ${Number(
                wallet.coin_balance || 0
              )}
            </strong>

            <small>
              Coins
            </small>

          </div>


          <div class="stat">

            <strong>
              ${etb(
                wallet.etb_balance
              )}
            </strong>

            <small>
              ETB
            </small>

          </div>


          <div class="stat">

            <strong>
              10 ETB
            </strong>

            <small>
              Min Withdraw
            </small>

          </div>


        </div>


        <p class="muted">
          1 coin = 0.50 ETB
        </p>


        <div class="actions">


          <button
            class="action primary"
            onclick="openBuyCoins()"
          >
            🪙 Buy Coins
          </button>


          <button
            class="action"
            onclick="openExchange()"
          >
            🔄 Exchange into Coin
          </button>


          <button
            class="action"
            onclick="openWithdraw()"
          >
            💸 Withdraw
          </button>


        </div>

      `);

    });

}

window.openWallet = openWallet;


/* =========================================================
   BUY COINS
   ========================================================= */

function openBuyCoins() {

  if (!currentUser) {

    return requireAccount(
      "coins",
      openBuyCoins
    );

  }


  const packages = [
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


  openModal(`

    <h2>
      🪙 Buy Coins
    </h2>


    <p class="muted">
      1 coin = 0.50 ETB
    </p>


    <div class="gift-grid">

      ${
        packages.map(coins => `

          <button
            class="gift"
            onclick="
              buyCoinsPackage(${coins})
            "
          >

            <span class="emoji">
              🪙
            </span>

            <b>
              ${coins.toLocaleString()}
            </b>

            <small>
              ${(
                coins * 0.5
              ).toLocaleString()} ETB
            </small>

          </button>

        `).join("")
      }

    </div>


    <p class="notice">

      Payment must be confirmed
      by Telebirr/M-Pesa and the
      secure MENA backend.

    </p>

  `);

}


async function buyCoinsPackage(
  coins
) {

  const amount =
    coins * 0.5;


  const {
    error
  } = await sb.functions.invoke(
    "buy-coins",
    {
      body: {
        coins,
        amount_etb: amount
      }
    }
  );


  if (error) {

    return toast(
      "Coin purchase backend is not connected: " +
      error.message
    );

  }


  closeModal();

  toast(
    `${coins.toLocaleString()} coins purchase request submitted.`
  );

}

window.openBuyCoins =
  openBuyCoins;

window.buyCoinsPackage =
  buyCoinsPackage;


/* =========================================================
   EXCHANGE ETB → COINS
   ========================================================= */

function openExchange() {

  if (!currentUser) {

    return requireAccount(
      "coins",
      openExchange
    );

  }


  openModal(`

    <h2>
      🔄 Exchange into Coin
    </h2>


    <p class="muted">
      1 ETB = 2 coins
    </p>


    <input
      id="exchangeAmount"
      class="input"
      type="number"
      min="0.5"
      step="0.5"
      placeholder="ETB amount"
    >


    <div id="exchangePreview">
      Enter an amount.
    </div>


    <button
      class="action primary block"
      onclick="exchangeETB()"
    >
      Exchange
    </button>


    <p class="notice">
      The actual balance change must
      be performed by the secure backend.
    </p>

  `);


  const input =
    document.getElementById(
      "exchangeAmount"
    );


  input?.addEventListener(
    "input",
    () => {

      const amount =
        Number(input.value || 0);

      const coins =
        amount * 2;


      const preview =
        document.getElementById(
          "exchangePreview"
        );


      if (preview) {

        preview.innerHTML =
          `${amount.toFixed(2)} ETB → <b>${coins.toLocaleString()} coins</b>`;

      }

    }
  );

}


async function exchangeETB() {

  const amount =
    Number(
      val("exchangeAmount") || 0
    );


  if (amount <= 0) {

    return toast(
      "Enter an ETB amount."
    );

  }


  const coins =
    amount * 2;


  const {
    error
  } = await sb.functions.invoke(
    "exchange-etb-to-coins",
    {
      body: {
        amount_etb: amount,
        coins
      }
    }
  );


  if (error) {

    return toast(
      "Exchange backend is not connected: " +
      error.message
    );

  }


  closeModal();

  toast(
    `${coins.toLocaleString()} coins exchange request submitted.`
  );

}

window.openExchange =
  openExchange;

window.exchangeETB =
  exchangeETB;


/* =========================================================
   WITHDRAW
   ========================================================= */

function openWithdraw() {

  if (!currentUser) {

    return requireAccount(
      "withdraw",
      openWithdraw
    );

  }


  openModal(`

    <h2>
      💸 Withdraw
    </h2>


    <div class="notice">

      Minimum withdrawal:
      <b>10 ETB</b>

    </div>


    <select
      id="withdrawMethod"
      class="select"
    >

      <option value="telebirr">
        Telebirr
      </option>

      <option value="mpesa">
        M-Pesa
      </option>

    </select>


    <input
      id="withdrawNumber"
      class="input"
      placeholder="Telebirr / M-Pesa number"
    >


    <input
      id="withdrawAmount"
      class="input"
      type="number"
      min="10"
      step="0.01"
      placeholder="Amount ETB"
    >


    <button
      class="action primary block"
      onclick="submitWithdraw()"
    >
      Request Withdrawal
    </button>


    <p class="muted">
      Withdrawal requests are verified
      by the secure backend before payment.
    </p>

  `);

}


async function submitWithdraw() {

  const amount =
    Number(
      val("withdrawAmount") || 0
    );


  const method =
    document.getElementById(
      "withdrawMethod"
    )?.value;


  const number =
    val("withdrawNumber");


  if (amount < 10) {

    return toast(
      "Minimum withdrawal is 10 ETB."
    );

  }


  if (!number) {

    return toast(
      "Enter your wallet number."
    );

  }


  const {
    error
  } = await sb.functions.invoke(
    "withdraw",
    {
      body: {

        method,

        number,

        amount_etb:
          amount

      }
    }
  );


  if (error) {

    return toast(
      "Withdrawal backend is not connected: " +
      error.message
    );

  }


  closeModal();

  toast(
    "Withdrawal request submitted."
  );

}

window.openWithdraw =
  openWithdraw;

window.submitWithdraw =
  submitWithdraw;


/* =========================================================
   WALLET CONNECTION
   ========================================================= */

function manageWallet() {

  if (!currentUser) {

    return requireAccount(
      "wallet",
      manageWallet
    );

  }


  openModal(`

    <h2>
      Wallet Connection
    </h2>


    <select
      id="walletMethod"
      class="select"
    >

      <option>
        Telebirr
      </option>

      <option>
        M-Pesa
      </option>

    </select>


    <input
      id="walletPhone"
      class="input"
      placeholder="Account phone number"
    >


    <input
      id="walletName"
      class="input"
      placeholder="Account name"
    >


    <button
      class="action primary block"
      onclick="saveWalletConnection()"
    >
      Save
    </button>

  `);

}


async function saveWalletConnection() {

  const method =
    document.getElementById(
      "walletMethod"
    )?.value;

  const phone =
    val("walletPhone");

  const name =
    val("walletName");


  if (!phone) {

    return toast(
      "Enter your wallet number."
    );

  }


  const {
    error
  } = await sb.functions.invoke(
    "bind-payment-method",
    {
      body: {
        method,
        phone,
        name
      }
    }
  );


  if (error) {

    return toast(
      "Wallet backend is not connected: " +
      error.message
    );

  }


  closeModal();

  toast(
    "Wallet connection submitted."
  );

}

window.manageWallet =
  manageWallet;

window.saveWalletConnection =
  saveWalletConnection;


/* =========================================================
   SETTINGS
   ========================================================= */

function settings() {

  if (!currentUser) {

    return requireAccount(
      "settings",
      settings
    );

  }


  openModal(`

    <h2>
      Settings
    </h2>


    <div class="actions">


      <button
        class="action block"
        onclick="
          closeModal();
          editProfile()
        "
      >
        ✏️ Edit Profile
      </button>


      <button
        class="action block"
        onclick="
          closeModal();
          openWallet()
        "
      >
        💰 Wallet
      </button>


      <button
        class="action block"
        onclick="
          closeModal();
          openBuyCoins()
        "
      >
        🪙 Buy Coins
      </button>


      <button
        class="action block"
        onclick="
          closeModal();
          openExchange()
        "
      >
        🔄 Exchange into Coin
      </button>


      <button
        class="action block"
        onclick="
          closeModal();
          openWithdraw()
        "
      >
        💸 Withdraw
      </button>


      <button
        class="action block"
        onclick="
          closeModal();
          manageWallet()
        "
      >
        📲 Telebirr / M-Pesa
      </button>


      <button
        class="action danger block"
        onclick="
          closeModal();
          logout()
        "
      >
        Log out
      </button>


    </div>


    <p class="notice">

      Real money, coin balances,
      withdrawals and payments are
      controlled by secure backend functions.

    </p>

  `);

}

window.settings = settings;


/* =========================================================
   SEARCH
   ========================================================= */

async function searchAll() {

  const q =
    prompt("Search MENA");


  if (!q) return;


  const search =
    q.trim();


  if (!search) return;


  const [
    usersResult,
    postsResult,
    marketResult,
    workResult
  ] = await Promise.all([


    sb
      .from("profiles")
      .select(
        "id,username,full_name,avatar_url"
      )
      .or(
        `username.ilike.%${search}%,full_name.ilike.%${search}%`
      )
      .limit(10),


    sb
      .from("posts")
      .select(`
        id,
        user_id,
        media_url,
        media_type,
        caption,
        profiles(
          username,
          full_name,
          avatar_url
        )
      `)
      .ilike(
        "caption",
        `%${search}%`
      )
      .limit(20),


    sb
      .from("marketplace_listings")
      .select(
        "id,title,price_etb,image_url"
      )
      .eq(
        "status",
        "active"
      )
      .ilike(
        "title",
        `%${search}%`
      )
      .limit(10),


    sb
      .from("free_work_posts")
      .select(
        "id,title,description"
      )
      .eq(
        "status",
        "active"
      )
      .ilike(
        "title",
        `%${search}%`
      )
      .limit(10)

  ]);


  openModal(`

    <h2>
      Search: ${escapeHTML(search)}
    </h2>


    <div class="section-title">
      People
    </div>


    ${
      (usersResult.data || []).map(user => `

        <div class="row card">

          ${
            user.avatar_url
            ?
            `
            <img
              class="avatar"
              src="${escapeAttr(user.avatar_url)}"
              alt=""
            >
            `
            :
            `<span class="avatar"></span>`
          }


          <div>

            <button
              class="link"
              onclick="
                closeModal();
                profile('${escapeAttr(user.id)}')
              "
            >
              ${escapeHTML(
                user.full_name ||
                user.username
              )}
            </button>


            <div class="muted">
              @${escapeHTML(
                user.username
              )}
            </div>

          </div>

        </div>

      `).join("")

      ||

      `<p class="muted">
        No people found.
      </p>`
    }


    <div class="section-title">
      Marketplace
    </div>


    ${
      (marketResult.data || []).map(item => `

        <div class="card">

          <b>
            ${escapeHTML(
              item.title
            )}
          </b>

          <p>
            ${etb(item.price_etb)}
          </p>

        </div>

      `).join("")

      ||

      `<p class="muted">
        No marketplace results.
      </p>`
    }


    <div class="section-title">
      Free Work
    </div>


    ${
      (workResult.data || []).map(item => `

        <div class="card">

          <b>
            ${escapeHTML(
              item.title
            )}
          </b>

          <p>
            ${escapeHTML(
              item.description
            )}
          </p>

        </div>

      `).join("")

      ||

      `<p class="muted">
        No work results.
      </p>`
    }


    <div class="section-title">
      Posts
    </div>


    ${
      (postsResult.data || []).map(post => `

        <div class="card">

          <b>
            @${escapeHTML(
              post.profiles?.username ||
              "user"
            )}
          </b>

          <p>
            ${escapeHTML(
              post.caption || ""
            )}
          </p>

        </div>

      `).join("")

      ||

      `<p class="muted">
        No post results.
      </p>`
    }

  `);

}

window.searchAll = searchAll;


/* =========================================================
   TOP BUTTONS
   ========================================================= */

const createButton =
  document.getElementById("createBtn");

if (createButton) {

  createButton.onclick =
    openCreatePost;

}


const settingsButton =
  document.getElementById(
    "settingsBtn"
  );

if (settingsButton) {

  settingsButton.onclick = () => {

    if (currentUser) {

      settings();

    } else {

      openAuth("signup");

    }

  };

}


const searchButton =
  document.getElementById(
    "searchBtn"
  );

if (searchButton) {

  searchButton.onclick =
    searchAll;

}


/* =========================================================
   START MENA
   ========================================================= */

init();
