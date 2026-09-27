/* =========================================================
   MENA — MAIN JAVASCRIPT
   Guest-first + Supabase
   ========================================================= */

const SUPABASE_URL = "https://ryywkqyeoftuejczeqgg.supabase.co";
const SUPABASE_KEY = "sb_publishable_E6S3EtoGbEqA_XkRpJhYpA_g8SvjMeH";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;
let currentProfile = null;
let pendingAction = null;
let currentPage = "homePage";

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function show(id) {
  const el = $(id);
  if (el) el.style.display = "";
}

function hide(id) {
  const el = $(id);
  if (el) el.style.display = "none";
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value ?? "";
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
  return Number(value || 0).toFixed(2);
}

function notify(message) {
  alert(message);
}

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

const pages = [
  "homePage",
  "marketPage",
  "marketSellPage",
  "marketWorkPage",
  "createPage",
  "inboxPage",
  "profilePage",
  "walletPage",
  "withdrawPage",
  "buyCoinsPage",
  "searchPage",
  "settingsPage"
];

function navigate(pageId) {
  pages.forEach(id => {
    const page = $(id);

    if (!page) return;

    page.style.display = id === pageId ? "" : "none";
    page.classList.toggle("active", id === pageId);
  });

  currentPage = pageId;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (pageId === "homePage") loadFeed();
  if (pageId === "marketPage") loadMarketplace();
  if (pageId === "marketWorkPage") loadFreeWork();
  if (pageId === "profilePage") loadProfile();
  if (pageId === "walletPage") loadWallet();
  if (pageId === "withdrawPage") prepareWithdraw();
  if (pageId === "buyCoinsPage") loadCoinPackages();
  if (pageId === "searchPage") focusSearch();
}

/* =========================================================
   AUTH
   ========================================================= */

async function loadCurrentUser() {
  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error(error);
    currentUser = null;
    currentProfile = null;
    return;
  }

  currentUser = user || null;

  if (currentUser) {
    await loadCurrentProfile();
  } else {
    currentProfile = null;
  }

  updateAuthUI();
}

async function loadCurrentProfile() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Profile error:", error);
    return;
  }

  currentProfile = data || null;
}

function updateAuthUI() {
  const logout = $("logoutBtn");

  if (logout) {
    logout.style.display = currentUser ? "" : "none";
  }
}

function requireAuth(action) {
  if (currentUser) {
    action();
    return;
  }

  pendingAction = action;
  openAuthModal();
}

function openAuthModal() {
  const modal = $("authModal");

  if (!modal) {
    alert("Please log in or create an account.");
    return;
  }

  modal.style.display = "flex";

  const loginMessage = $("loginMessage");
  const signupMessage = $("signupMessage");

  if (loginMessage) loginMessage.textContent = "";
  if (signupMessage) signupMessage.textContent = "";
}

function closeAuthModal() {
  const modal = $("authModal");

  if (modal) {
    modal.style.display = "none";
  }
}

async function loginUser(event) {
  event.preventDefault();

  const email = $("loginEmail")?.value.trim();
  const password = $("loginPassword")?.value;

  const message = $("loginMessage");

  if (!email || !password) {
    if (message) message.textContent = "Enter email and password.";
    return;
  }

  if (message) message.textContent = "Logging in...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    if (message) message.textContent = error.message;
    return;
  }

  await loadCurrentUser();

  closeAuthModal();

  const action = pendingAction;
  pendingAction = null;

  if (action) {
    action();
  }
}

async function signupUser(event) {
  event.preventDefault();

  const name = $("signupName")?.value.trim();
  const email = $("signupEmail")?.value.trim();
  const password = $("signupPassword")?.value;
  const password2 = $("signupPassword2")?.value;

  const message = $("signupMessage");

  if (!name || !email || !password) {
    if (message) message.textContent = "Complete all fields.";
    return;
  }

  if (password !== password2) {
    if (message) message.textContent = "Passwords do not match.";
    return;
  }

  if (password.length < 6) {
    if (message) message.textContent = "Password must be at least 6 characters.";
    return;
  }

  if (message) message.textContent = "Creating account...";

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name
      }
    }
  });

  if (error) {
    if (message) message.textContent = error.message;
    return;
  }

  if (data.user && !data.session) {
    if (message) {
      message.textContent =
        "Account created. Check your email if email confirmation is enabled.";
    }

    return;
  }

  await loadCurrentUser();

  closeAuthModal();

  const action = pendingAction;
  pendingAction = null;

  if (action) {
    action();
  }
}

async function logoutUser() {
  await supabaseClient.auth.signOut();

  currentUser = null;
  currentProfile = null;

  navigate("homePage");
}

/* =========================================================
   FEED
   ========================================================= */

async function loadFeed() {
  const container = $("feedContainer");

  if (!container) return;

  container.innerHTML = `
    <div class="loading">
      Loading posts...
    </div>
  `;

  const { data, error } = await supabaseClient
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);

    container.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load posts</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;

    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No posts yet</h3>
        <p>Be the first person to create a post.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = data
    .map(post => renderPost(post))
    .join("");
}

function renderPost(post) {
  const media =
    post.media_url ||
    post.media ||
    post.image_url ||
    post.video_url ||
    "";

  const type = post.media_type || "image";

  let mediaHTML = "";

  if (media) {
    if (type === "video") {
      mediaHTML = `
        <video
          src="${escapeHTML(media)}"
          controls
          playsinline
          preload="metadata"
        ></video>
      `;
    } else {
      mediaHTML = `
        <img
          src="${escapeHTML(media)}"
          alt="MENA post"
          loading="lazy"
        >
      `;
    }
  }

  return `
    <article class="post-card" data-post-id="${escapeHTML(post.id)}">

      <div class="post-header">
        <strong>${escapeHTML(post.username || post.full_name || "MENA user")}</strong>
      </div>

      ${mediaHTML}

      <div class="post-body">

        <p>${escapeHTML(post.caption || post.description || "")}</p>

        <div class="post-actions">

          <button onclick="handleLike('${post.id}')">
            ❤️
          </button>

          <button onclick="openComments('${post.id}')">
            💬
          </button>

          <button onclick="sharePost('${post.id}')">
            ↗
          </button>

          <button onclick="followFromPost('${post.user_id || ""}')">
            Follow
          </button>

        </div>

      </div>

    </article>
  `;
}

/* =========================================================
   LIKE
   ========================================================= */

async function handleLike(postId) {
  requireAuth(async () => {

    const { data: existing, error: checkError } =
      await supabaseClient
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (checkError) {
      notify(checkError.message);
      return;
    }

    if (existing) {
      notify("You already liked this post.");
      return;
    }

    const { error } = await supabaseClient
      .from("post_likes")
      .insert({
        post_id: postId,
        user_id: currentUser.id
      });

    if (error) {
      notify(error.message);
      return;
    }

    notify("Liked ❤️");
  });
}

/* =========================================================
   COMMENTS
   ========================================================= */

async function openComments(postId) {
  const { data, error } = await supabaseClient
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    notify(error.message);
    return;
  }

  let html = `
    <h2>Comments</h2>
    <div class="comments-list">
  `;

  if (!data || data.length === 0) {
    html += `<p>No comments yet.</p>`;
  } else {
    data.forEach(comment => {
      html += `
        <div class="comment">
          <strong>${escapeHTML(comment.user_id)}</strong>
          <p>${escapeHTML(comment.content || comment.comment || "")}</p>
        </div>
      `;
    });
  }

  html += `</div>`;

  if (currentUser) {
    html += `
      <form onsubmit="addComment(event, '${postId}')">
        <input
          id="commentInput"
          placeholder="Write a comment..."
          required
        >
        <button type="submit">Send</button>
      </form>
    `;
  } else {
    html += `
      <button onclick="requireAuth(() => openComments('${postId}'))">
        Login to comment
      </button>
    `;
  }

  openGlobalModal(html);
}

async function addComment(event, postId) {
  event.preventDefault();

  const input = $("commentInput");

  if (!input || !input.value.trim()) return;

  const { error } = await supabaseClient
    .from("comments")
    .insert({
      post_id: postId,
      user_id: currentUser.id,
      content: input.value.trim()
    });

  if (error) {
    notify(error.message);
    return;
  }

  input.value = "";

  openComments(postId);
}

/* =========================================================
   SHARE
   ========================================================= */

async function sharePost(postId) {
  const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "MENA",
        text: "Check this post on MENA",
        url
      });
    } catch {
      // user cancelled
    }
  } else {
    await navigator.clipboard?.writeText(url);
    notify("Post link copied.");
  }
}

/* =========================================================
   FOLLOW
   ========================================================= */

async function followFromPost(userId) {
  if (!userId) {
    notify("This post does not have a user ID.");
    return;
  }

  requireAuth(async () => {

    if (userId === currentUser.id) {
      notify("You cannot follow yourself.");
      return;
    }

    const { data: existing } = await supabaseClient
      .from("follows")
      .select("id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", userId)
      .maybeSingle();

    if (existing) {
      notify("Already following.");
      return;
    }

    const { error } = await supabaseClient
      .from("follows")
      .insert({
        follower_id: currentUser.id,
        following_id: userId
      });

    if (error) {
      notify(error.message);
      return;
    }

    notify("Following.");
  });
}

/* =========================================================
   MARKETPLACE
   ========================================================= */

async function loadMarketplace() {
  await loadMarketCategories();
  await loadMarketProducts();
}

async function loadMarketCategories() {
  const container = $("marketCategories");

  if (!container) return;

  const { data, error } = await supabaseClient
    .from("market_categories")
    .select("*")
    .order("name");

  if (error) {
    console.error(error);
    container.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p>No categories available.</p>`;
    return;
  }

  container.innerHTML = data
    .map(category => `
      <button
        class="market-category"
        onclick="selectMarketCategory('${category.id}')"
      >
        ${escapeHTML(category.name)}
      </button>
    `)
    .join("");
}

async function selectMarketCategory(categoryId) {
  const container = $("marketProducts");

  if (!container) return;

  const { data, error } = await supabaseClient
    .from("marketplace_listings")
    .select("*")
    .eq("category_id", categoryId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
    return;
  }

  renderMarketProducts(data || []);
}

async function loadMarketProducts() {
  const container = $("marketProducts");

  if (!container) return;

  const { data, error } = await supabaseClient
    .from("marketplace_listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    container.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
    return;
  }

  renderMarketProducts(data || []);
}

function renderMarketProducts(products) {
  const container = $("marketProducts");

  if (!container) return;

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No products yet</h3>
        <p>Products posted by users will appear here.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = products.map(product => {

    const image =
      product.image_url ||
      product.image ||
      "";

    const price = Number(
      product.buyer_price_etb ||
      product.price_etb ||
      product.price ||
      0
    );

    return `
      <div
        class="product-card"
        onclick="openProduct('${product.id}')"
      >

        ${
          image
            ? `<img src="${escapeHTML(image)}" alt="">`
            : `<div class="product-no-image">MENA</div>`
        }

        <div class="product-info">

          <h3>${escapeHTML(product.title || product.name)}</h3>

          <strong>${money(price)} ETB</strong>

        </div>

      </div>
    `;
  }).join("");
}

/* =========================================================
   SELL
   ========================================================= */

function openSellPage() {
  requireAuth(() => {
    navigate("marketSellPage");
  });
}

function calculateSellerPrice() {
  const input = $("sellDesiredAmount");
  const output = $("sellerPricePreview");

  if (!input || !output) return;

  const desired = Number(input.value);

  if (!desired || desired <= 0) {
    output.textContent = "";
    return;
  }

  const buyerPrice = desired / 0.95;
  const fee = buyerPrice - desired;

  output.innerHTML = `
    Buyer price: <strong>${money(buyerPrice)} ETB</strong><br>
    MENA fee: ${money(fee)} ETB<br>
    You receive: <strong>${money(desired)} ETB</strong><br>
    Delivery: 80 ETB paid separately by buyer
  `;
}

async function publishProduct(event) {
  event.preventDefault();

  requireAuth(async () => {

    const title = $("sellTitle")?.value.trim();
    const description = $("sellDescription")?.value.trim();
    const desired = Number($("sellDesiredAmount")?.value);
    const category = $("sellCategory")?.value;
    const imageInput = $("sellImage");

    if (!title || !desired || desired <= 0) {
      notify("Enter the product name and desired amount.");
      return;
    }

    const buyerPrice = desired / 0.95;

    let imageUrl = null;

    if (imageInput?.files?.[0]) {
      imageUrl = await uploadMedia(
        imageInput.files[0],
        "products"
      );

      if (!imageUrl) return;
    }

    const { error } = await supabaseClient
      .from("marketplace_listings")
      .insert({
        seller_id: currentUser.id,
        title,
        description,
        category_id: category || null,
        price_etb: buyerPrice,
        buyer_price_etb: buyerPrice,
        seller_desired_etb: desired,
        platform_fee_percent: 5,
        image_url: imageUrl,
        status: "active"
      });

    if (error) {
      notify(error.message);
      return;
    }

    notify("Product published.");

    event.target.reset();

    navigate("marketPage");
  });
}

/* =========================================================
   PRODUCT DETAILS
   ========================================================= */

async function openProduct(productId) {
  const { data, error } = await supabaseClient
    .from("marketplace_listings")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    notify(error.message);
    return;
  }

  if (!data) {
    notify("Product not found.");
    return;
  }

  const price = Number(
    data.buyer_price_etb ||
    data.price_etb ||
    data.price ||
    0
  );

  const image =
    data.image_url ||
    data.image ||
    "";

  openGlobalModal(`
    ${
      image
        ? `<img class="product-detail-image" src="${escapeHTML(image)}">`
        : ""
    }

    <h2>${escapeHTML(data.title || data.name)}</h2>

    <p>${escapeHTML(data.description || "")}</p>

    <h3>${money(price)} ETB</h3>

    <p>Delivery: 80 ETB</p>

    <button onclick="buyProduct('${data.id}')">
      Buy
    </button>
  `);
}

/* =========================================================
   BUY PRODUCT
   ========================================================= */

function buyProduct(productId) {
  requireAuth(() => {

    openGlobalModal(`
      <h2>Purchase</h2>

      <p>
        Product payment and order processing will be handled
        through the secure MENA backend.
      </p>

      <p>Product ID: ${escapeHTML(productId)}</p>

      <button onclick="closeGlobalModal()">
        Close
      </button>
    `);

  });
}

/* =========================================================
   FREE WORK
   ========================================================= */

async function loadFreeWork() {
  const container = $("freeWorkList");

  if (!container) return;

  const { data, error } = await supabaseClient
    .from("free_work_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    container.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
    return;
  }

  if (!data || !data.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No Free Work posts</h3>
      </div>
    `;

    return;
  }

  container.innerHTML = data.map(work => `
    <div class="work-card">

      <h3>${escapeHTML(work.title)}</h3>

      <p>${escapeHTML(work.description || "")}</p>

      ${
        work.location
          ? `<small>${escapeHTML(work.location)}</small>`
          : ""
      }

    </div>
  `).join("");
}

function openFreeWorkPage() {
  requireAuth(() => {
    navigate("marketWorkPage");
  });
}

async function publishFreeWork(event) {
  event.preventDefault();

  requireAuth(async () => {

    const title = $("freeWorkTitle")?.value.trim();
    const description = $("freeWorkDescription")?.value.trim();
    const location = $("freeWorkLocation")?.value.trim();

    if (!title || !description) {
      notify("Enter title and description.");
      return;
    }

    const { error } = await supabaseClient
      .from("free_work_posts")
      .insert({
        user_id: currentUser.id,
        title,
        description,
        location,
        posting_fee_etb: 50,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString()
      });

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      "Free Work post created. The 50 ETB posting fee must be processed by the secure backend."
    );

    event.target.reset();

    await loadFreeWork();
  });
}

/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile() {

  if (!currentUser) {
    setText("profileUsername", "Guest");
    setText("profileBio", "Create an account to manage your profile.");
    return;
  }

  if (!currentProfile) {
    await loadCurrentProfile();
  }

  setText(
    "profileUsername",
    currentProfile?.username ||
    currentProfile?.full_name ||
    currentUser.email
  );

  setText(
    "profileBio",
    currentProfile?.bio || ""
  );

  const picture = $("profilePicture");

  if (picture && currentProfile?.avatar_url) {
    picture.src = currentProfile.avatar_url;
  }

  await loadProfileStats();
  await loadProfilePosts();
}

async function loadProfileStats() {
  if (!currentUser) return;

  const [
    followers,
    following,
    likes
  ] = await Promise.all([

    supabaseClient
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", currentUser.id),

    supabaseClient
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", currentUser.id),

    supabaseClient
      .from("posts")
      .select("id")
      .eq("user_id", currentUser.id)

  ]);

  setText("profileFollowers", followers.count || 0);
  setText("profileFollowing", following.count || 0);

  let totalLikes = 0;

  if (likes.data?.length) {
    const postIds = likes.data.map(x => x.id);

    const result = await supabaseClient
      .from("post_likes")
      .select("id", { count: "exact", head: true })
      .in("post_id", postIds);

    totalLikes = result.count || 0;
  }

  setText("profileLikes", totalLikes);
}

async function loadProfilePosts() {
  const container = $("profilePosts");

  if (!container || !currentUser) return;

  const { data, error } = await supabaseClient
    .from("posts")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    container.innerHTML = `<p>No posts yet.</p>`;
    return;
  }

  container.innerHTML = data
    .map(post => renderPost(post))
    .join("");
}

/* =========================================================
   MY MARKET
   ========================================================= */

function openMyMarket() {
  requireAuth(() => {
    navigate("marketPage");
  });
}

/* =========================================================
   WALLET
   ========================================================= */

async function loadWallet() {
  if (!currentUser) {
    setText("walletCoins", "0");
    setText("walletEtb", "0.00");
    return;
  }

  const { data, error } = await supabaseClient
    .from("wallets")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  setText(
    "walletCoins",
    data?.coin_balance || 0
  );

  setText(
    "walletEtb",
    money(data?.etb_balance || 0)
  );

  await loadWalletTransactions();
}

async function loadWalletTransactions() {
  const container = $("walletTransactions");

  if (!container || !currentUser) return;

  const { data, error } = await supabaseClient
    .from("coin_transactions")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    container.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    container.innerHTML = `<p>No transactions yet.</p>`;
    return;
  }

  container.innerHTML = data.map(transaction => `
    <div class="transaction-item">
      <strong>${escapeHTML(transaction.type)}</strong>
      <span>${escapeHTML(transaction.amount || "")}</span>
    </div>
  `).join("");
}

function openWallet() {
  requireAuth(() => {
    navigate("walletPage");
  });
}

/* =========================================================
   WITHDRAW
   ========================================================= */

function openWithdraw() {
  requireAuth(() => {
    navigate("withdrawPage");
  });
}

async function prepareWithdraw() {
  if (!currentUser) return;

  const balance = $("withdrawBalance");

  const { data } = await supabaseClient
    .from("wallets")
    .select("etb_balance")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (balance) {
    balance.textContent =
      `Available: ${money(data?.etb_balance || 0)} ETB`;
  }

  const amount = $("withdrawAmount");

  if (amount) {
    amount.min = "10";
  }
}

async function submitWithdrawal(event) {
  event.preventDefault();

  requireAuth(async () => {

    const method = $("withdrawMethod")?.value;
    const account = $("withdrawAccount")?.value.trim();
    const amount = Number($("withdrawAmount")?.value);

    if (!method || !account || !amount) {
      notify("Complete all withdrawal fields.");
      return;
    }

    if (amount < 10) {
      notify("Minimum withdrawal is 10 ETB.");
      return;
    }

    const { data: wallet } = await supabaseClient
      .from("wallets")
      .select("etb_balance")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (Number(wallet?.etb_balance || 0) < amount) {
      notify("Insufficient balance.");
      return;
    }

    /*
      Sensitive withdrawal processing should ultimately be
      performed by a secure Supabase Edge Function.
    */

    const { data: methodData, error: methodError } =
      await supabaseClient
        .from("withdrawal_methods")
        .insert({
          user_id: currentUser.id,
          method,
          account_name: currentProfile?.full_name || "",
          account_number: account
        })
        .select()
        .single();

    if (methodError) {
      notify(methodError.message);
      return;
    }

    const { error } = await supabaseClient
      .from("withdrawals")
      .insert({
        user_id: currentUser.id,
        amount_etb: amount,
        method,
        account_id: methodData.id,
        status: "pending"
      });

    if (error) {
      notify(error.message);
      return;
    }

    notify(
      "Withdrawal request submitted. Payment processing is handled by the secure backend."
    );

    event.target.reset();

    navigate("walletPage");
  });
}

/* =========================================================
   COINS
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

function loadCoinPackages() {
  const container = $("coinPackages");

  if (!container) return;

  container.innerHTML = COIN_PACKAGES.map(coins => {

    const price = coins * 0.5;

    return `
      <button
        class="coin-package"
        onclick="buyCoinPackage(${coins})"
      >
        <strong>${coins.toLocaleString()} coins</strong>
        <span>${money(price)} ETB</span>
      </button>
    `;

  }).join("");
}

function openBuyCoins() {
  requireAuth(() => {
    navigate("buyCoinsPage");
  });
}

function buyCoinPackage(coins) {
  requireAuth(() => {

    const price = coins * 0.5;

    openGlobalModal(`
      <h2>Buy Coins</h2>

      <p>
        ${coins.toLocaleString()} coins
      </p>

      <h3>
        ${money(price)} ETB
      </h3>

      <p>
        Payment through Telebirr/M-PESA will be processed
        by the secure MENA backend.
      </p>

      <button onclick="closeGlobalModal()">
        Close
      </button>
    `);

  });
}

/* =========================================================
   SEARCH
   ========================================================= */

function focusSearch() {
  setTimeout(() => {
    $("searchInput")?.focus();
  }, 100);
}

async function searchMena(event) {
  if (event) event.preventDefault();

  const input = $("searchInput");

  if (!input) return;

  const query = input.value.trim();

  if (!query) {
    notify("Enter something to search.");
    return;
  }

  const container = $("searchResults");

  if (!container) return;

  container.innerHTML = `<p>Searching...</p>`;

  const { data, error } = await supabaseClient
    .from("marketplace_listings")
    .select("*")
    .ilike("title", `%${query}%`)
    .eq("status", "active")
    .limit(50);

  if (error) {
    container.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No results</h3>
        <p>No matching products were found.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = data.map(product => `
    <div
      class="search-result"
      onclick="openProduct('${product.id}')"
    >
      <strong>${escapeHTML(product.title || product.name)}</strong>
      <span>
        ${money(product.buyer_price_etb || product.price_etb || 0)} ETB
      </span>
    </div>
  `).join("");
}

/* =========================================================
   CREATE POST
   ========================================================= */

function openCreate() {
  requireAuth(() => {
    navigate("createPage");
  });
}

async function createPost() {
  requireAuth(async () => {

    const input = $("mediaInput");

    if (!input) {
      notify("Media input not found.");
      return;
    }

    input.click();
  });
}

async function handleMediaSelected(event) {
  requireAuth(async () => {

    const file = event.target.files?.[0];

    if (!file) return;

    const mediaUrl = await uploadMedia(file, "posts");

    if (!mediaUrl) return;

    const mediaType =
      file.type.startsWith("video")
        ? "video"
        : "image";

    const caption = prompt("Write a caption:");

    const { error } = await supabaseClient
      .from("posts")
      .insert({
        user_id: currentUser.id,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: caption || ""
      });

    if (error) {
      notify(error.message);
      return;
    }

    notify("Post created.");

    navigate("homePage");
  });
}

/* =========================================================
   MEDIA UPLOAD
   ========================================================= */

async function uploadMedia(file, folder) {

  if (!currentUser) {
    notify("Login required.");
    return null;
  }

  const extension =
    file.name.split(".").pop() || "file";

  const path =
    `${currentUser.id}/${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabaseClient
    .storage
    .from("media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) {
    notify(error.message);
    return null;
  }

  const { data } =
    supabaseClient
      .storage
      .from("media")
      .getPublicUrl(path);

  return data.publicUrl;
}

/* =========================================================
   LIVE
   ========================================================= */

function openLive() {
  requireAuth(() => {

    openGlobalModal(`
      <h2>Go Live</h2>

      <p>
        MENA Live requires the live-video backend/provider
        to be connected before broadcasting can begin.
      </p>

      <button onclick="closeGlobalModal()">
        Close
      </button>
    `);

  });
}

/* =========================================================
   INBOX
   ========================================================= */

function openInbox() {
  requireAuth(() => {
    navigate("inboxPage");
    loadInbox();
  });
}

async function loadInbox() {
  const container = $("inboxContent");

  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `<p>Login required.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="empty-state">
      <h3>Inbox</h3>
      <p>Your messages and notifications will appear here.</p>
    </div>
  `;
}

/* =========================================================
   SETTINGS
   ========================================================= */

function openSettings() {
  navigate("settingsPage");
}

/* =========================================================
   EDIT PROFILE
   ========================================================= */

function editProfile() {
  requireAuth(() => {

    const username =
      currentProfile?.username || "";

    const bio =
      currentProfile?.bio || "";

    openGlobalModal(`
      <h2>Edit Profile</h2>

      <form onsubmit="saveProfile(event)">

        <input
          id="editUsername"
          placeholder="Username"
          value="${escapeHTML(username)}"
        >

        <textarea
          id="editBio"
          placeholder="Bio"
        >${escapeHTML(bio)}</textarea>

        <button type="submit">
          Save
        </button>

      </form>
    `);

  });
}

async function saveProfile(event) {
  event.preventDefault();

  const username =
    $("editUsername")?.value.trim();

  const bio =
    $("editBio")?.value.trim();

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      username,
      bio
    })
    .eq("id", currentUser.id);

  if (error) {
    notify(error.message);
    return;
  }

  await loadCurrentProfile();

  closeGlobalModal();

  await loadProfile();

  notify("Profile updated.");
}

/* =========================================================
   GLOBAL MODAL
   ========================================================= */

function openGlobalModal(content) {
  const modal = $("globalModal");
  const box = $("modalContent");

  if (!modal || !box) return;

  box.innerHTML = content;

  modal.style.display = "flex";
}

function closeGlobalModal() {
  const modal = $("globalModal");

  if (modal) {
    modal.style.display = "none";
  }
}

/* =========================================================
   MARKET TABS
   ========================================================= */

function showMarketShop() {
  navigate("marketPage");
}

function showMarketSell() {
  openSellPage();
}

function showMarketWork() {
  openFreeWorkPage();
}

/* =========================================================
   BOTTOM NAVIGATION
   ========================================================= */

function goHome() {
  navigate("homePage");
}

function goMarket() {
  navigate("marketPage");
}

function goProfile() {
  navigate("profilePage");
}

function goSearch() {
  navigate("searchPage");
}

/* =========================================================
   GLOBAL BUTTON CLICK SUPPORT
   ========================================================= */

document.addEventListener("click", event => {

  const button = event.target.closest("[data-page]");

  if (button) {
    const page = button.dataset.page;

    if (page) {
      navigate(page);
    }
  }

});

/* =========================================================
   FORM EVENTS
   ========================================================= */

function connectForms() {

  $("loginForm")?.addEventListener(
    "submit",
    loginUser
  );

  $("signupForm")?.addEventListener(
    "submit",
    signupUser
  );

  $("sellForm")?.addEventListener(
    "submit",
    publishProduct
  );

  $("freeWorkForm")?.addEventListener(
    "submit",
    publishFreeWork
  );

  $("withdrawForm")?.addEventListener(
    "submit",
    submitWithdrawal
  );

  $("searchSubmit")?.addEventListener(
    "click",
    searchMena
  );

  $("searchInput")?.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        searchMena(event);
      }
    }
  );

  $("sellDesiredAmount")?.addEventListener(
    "input",
    calculateSellerPrice
  );

  $("mediaInput")?.addEventListener(
    "change",
    handleMediaSelected
  );

  $("createPostBtn")?.addEventListener(
    "click",
    createPost
  );

  $("createLiveBtn")?.addEventListener(
    "click",
    openLive
  );

  $("editProfileBtn")?.addEventListener(
    "click",
    editProfile
  );

  $("logoutBtn")?.addEventListener(
    "click",
    logoutUser
  );

  $("walletBtn")?.addEventListener(
    "click",
    openWallet
  );

  $("withdrawBtn")?.addEventListener(
    "click",
    openWithdraw
  );

  $("buyCoinsBtn")?.addEventListener(
    "click",
    openBuyCoins
  );
}

/* =========================================================
   CLOSE MODALS WHEN CLICKING OUTSIDE
   ========================================================= */

document.addEventListener("click", event => {

  const authModal = $("authModal");

  if (
    authModal &&
    event.target === authModal
  ) {
    closeAuthModal();
  }

  const globalModal = $("globalModal");

  if (
    globalModal &&
    event.target === globalModal
  ) {
    closeGlobalModal();
  }

});

/* =========================================================
   SUPABASE AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    currentUser = session?.user || null;

    if (currentUser) {
      await loadCurrentProfile();
    } else {
      currentProfile = null;
    }

    updateAuthUI();

  }
);

/* =========================================================
   START MENA
   ========================================================= */

async function startMena() {

  connectForms();

  await loadCurrentUser();

  /*
    Guest-first:
    MENA opens directly on Home.
  */

  navigate("homePage");

  console.log("MENA started successfully.");
}

/* =========================================================
   START
   ========================================================= */

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    startMena
  );

} else {

  startMena();

}
