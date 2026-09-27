/* =========================================================
   MENA
   Supabase + Guest First App
========================================================= */

const SUPABASE_URL =
  "https://ryywkqyeoftuejczeqgg.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_E6S3EtoGbEqA_XkRpJhYpA_g8SvjMeH";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;
let currentProfile = null;
let currentPage = "home";


const main =
  document.getElementById("app");

const modal =
  document.getElementById("modal");


/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await loadSession();

    supabaseClient.auth.onAuthStateChange(
      async (_event, session) => {

        currentUser =
          session?.user || null;

        if (currentUser) {
          await loadProfile();
        } else {
          currentProfile = null;
        }

        renderPage();
      }
    );

    renderPage();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js")
        .catch(() => {});
    }
  }
);


/* =========================================================
   AUTH
========================================================= */

async function loadSession() {

  const {
    data
  } = await supabaseClient.auth.getSession();

  currentUser =
    data?.session?.user || null;

  if (currentUser) {
    await loadProfile();
  }
}


async function loadProfile() {

  if (!currentUser) return;

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (!error) {
    currentProfile = data || null;
  }
}


/* =========================================================
   NAVIGATION
========================================================= */

function showPage(page) {

  currentPage = page;

  renderPage();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function renderPage() {

  if (currentPage === "home") {
    renderHome();
    return;
  }

  if (currentPage === "market") {
    renderMarketplace();
    return;
  }

  if (currentPage === "inbox") {
    renderInbox();
    return;
  }

  if (currentPage === "profile") {
    renderProfile();
    return;
  }

  renderHome();
}


/* =========================================================
   ACTIVE NAV
========================================================= */

function updateNav() {

  document
    .querySelectorAll(".bottom-nav button[data-page]")
    .forEach(btn => {

      btn.classList.toggle(
        "active",
        btn.dataset.page === currentPage
      );

    });
}


/* =========================================================
   HOME
========================================================= */

async function renderHome() {

  main.innerHTML = `

    <section class="page">

      <div class="gradient-hero">

        <h1>Welcome to MENA</h1>

        <p>
          Discover videos, photos, people,
          products and opportunities.
          Browse freely as a guest.
        </p>

      </div>

      <div style="height:15px"></div>

      <div class="feed" id="feed">

        <div class="empty">

          <div class="empty-icon">
            🌍
          </div>

          <h3>Loading MENA...</h3>

          <p class="muted">
            Finding public posts.
          </p>

        </div>

      </div>

    </section>

  `;

  updateNav();

  await loadPosts();
}


/* =========================================================
   POSTS
========================================================= */

async function loadPosts() {

  const feed =
    document.getElementById("feed");

  if (!feed) return;

  const {
    data,
    error
  } = await supabaseClient
    .from("posts")
    .select(`
      id,
      user_id,
      caption,
      media_url,
      media_type,
      created_at,
      profiles (
        username,
        display_name,
        avatar_url
      )
    `)
    .order(
      "created_at",
      { ascending: false }
    )
    .limit(30);


  if (error) {

    feed.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📭</div>
        <h3>No public posts yet</h3>
        <p class="muted">
          Posts from MENA users will appear here.
        </p>
      </div>
    `;

    return;
  }


  if (!data || !data.length) {

    feed.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🎥</div>
        <h3>No posts yet</h3>
        <p class="muted">
          Be one of the first people to post.
        </p>
      </div>
    `;

    return;
  }


  feed.innerHTML =
    data.map(post => {

      const profile =
        post.profiles || {};

      const name =
        profile.display_name ||
        profile.username ||
        "MENA user";

      const avatar =
        profile.avatar_url || "";

      const media =
        post.media_url
          ? (
            post.media_type === "video"
              ? `
                <video
                  class="post-media"
                  src="${escapeAttr(post.media_url)}"
                  controls
                  playsinline
                ></video>
              `
              : `
                <img
                  class="post-media"
                  src="${escapeAttr(post.media_url)}"
                  alt=""
                >
              `
          )
          : "";


      return `

        <article class="post-card">

          <div class="post-head">

            ${
              avatar
              ?
              `
                <img
                  class="post-avatar"
                  src="${escapeAttr(avatar)}"
                  alt=""
                >
              `
              :
              `
                <div class="post-avatar"></div>
              `
            }

            <div class="post-user">

              <strong>
                ${escapeHTML(name)}
              </strong>

              <small>
                @${escapeHTML(profile.username || "")}
              </small>

            </div>

          </div>


          ${media}


          <div class="post-body">

            <div class="post-actions">

              <button
                onclick="likePost('${escapeAttr(post.id)}')"
              >
                ❤️ Like
              </button>

              <button
                onclick="commentPost('${escapeAttr(post.id)}')"
              >
                💬 Comment
              </button>

              <button
                onclick="sharePost('${escapeAttr(post.id)}')"
              >
                ↗ Share
              </button>

            </div>


            ${
              post.caption
              ?
              `
                <div class="post-caption">
                  ${escapeHTML(post.caption)}
                </div>
              `
              :
              ""
            }

          </div>

        </article>

      `;

    }).join("");
}


/* =========================================================
   LIKE
========================================================= */

async function likePost(postId) {

  requireAccount(
    "like",
    async () => {

      const {
        error
      } = await supabaseClient
        .from("post_likes")
        .insert({
          post_id: postId,
          user_id: currentUser.id
        });

      if (error) {

        if (
          error.code === "23505"
        ) {
          toast("You already liked this post.");
        } else {
          toast("Could not like this post.");
        }

        return;
      }

      toast("❤️ Liked");
    }
  );
}


/* =========================================================
   COMMENT
========================================================= */

function commentPost(postId) {

  requireAccount(
    "comment",
    () => {

      openModal(`
        <div class="modal-box">

          <div class="modal-head">

            <h2>Comment</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ✕
            </button>

          </div>

          <div class="form-group">

            <textarea
              id="commentText"
              class="form-textarea"
              placeholder="Write a comment..."
            ></textarea>

          </div>

          <button
            class="primary-btn"
            onclick="submitComment('${escapeAttr(postId)}')"
          >
            Post Comment
          </button>

        </div>
      `);

    }
  );
}


async function submitComment(postId) {

  const text =
    document.getElementById("commentText")
      ?.value.trim();

  if (!text) {
    toast("Write something first.");
    return;
  }

  const {
    error
  } = await supabaseClient
    .from("comments")
    .insert({
      post_id: postId,
      user_id: currentUser.id,
      content: text
    });

  if (error) {
    toast("Could not post comment.");
    return;
  }

  closeModal();

  toast("Comment posted.");
}


/* =========================================================
   SHARE
========================================================= */

async function sharePost(postId) {

  const url =
    location.origin +
    location.pathname +
    "?post=" +
    encodeURIComponent(postId);

  if (navigator.share) {

    try {

      await navigator.share({
        title: "MENA",
        text: "Check this post on MENA",
        url
      });

    } catch (_) {}

  } else {

    try {

      await navigator.clipboard.writeText(url);

      toast("Post link copied.");

    } catch (_) {

      toast("Share link: " + url);

    }
  }
}


/* =========================================================
   MARKETPLACE
========================================================= */

async function renderMarketplace() {

  main.innerHTML = `

    <section class="page">

      <div class="market-hero">

        <h1>Marketplace</h1>

        <p>
          Buy products, sell your products,
          and find Free Work.
        </p>


        <div class="market-search">

          <input
            id="marketSearch"
            placeholder="Search products..."
            oninput="filterProducts()"
          >

          <button
            onclick="filterProducts()"
          >
            🔎
          </button>

        </div>

      </div>


      <div class="market-actions">

        <button
          class="market-action sell"
          onclick="requireAccount('sell', openSell)"
        >
          🛒 Sell
        </button>

        <button
          class="market-action work"
          onclick="requireAccount('free work', openFreeWork)"
        >
          💼 Free Work
        </button>

      </div>


      <div class="tabs">

        <button
          class="tab active"
          onclick="marketTab(this,'products')"
        >
          🛍 Products
        </button>

        <button
          class="tab"
          onclick="marketTab(this,'work')"
        >
          💼 Free Work
        </button>

        <button
          class="tab"
          onclick="requireAccount('my market', openMyMarket)"
        >
          👤 My Market
        </button>

      </div>


      <div
        id="marketContent"
      >
        <div class="empty">
          Loading marketplace...
        </div>
      </div>

    </section>

  `;

  updateNav();

  await loadMarketplaceProducts();
}


async function loadMarketplaceProducts() {

  const container =
    document.getElementById("marketContent");

  if (!container) return;


  const {
    data,
    error
  } = await supabaseClient
    .from("marketplace_listings")
    .select("*")
    .eq("status", "active")
    .order(
      "created_at",
      { ascending: false }
    )
    .limit(50);


  if (error || !data?.length) {

    container.innerHTML = `
      <div class="empty">

        <div class="empty-icon">
          🛍️
        </div>

        <h3>No products available yet</h3>

        <p class="muted">
          Products posted by MENA sellers
          will appear here.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML = `

    <div
      class="product-grid"
      id="productGrid"
    >

      ${
        data.map(productCard).join("")
      }

    </div>

  `;
}


function productCard(item) {

  const image =
    item.image_url ||
    item.media_url ||
    "";


  const price =
    Number(item.price_etb || 0);


  return `

    <article
      class="product-card"
      data-search="${escapeAttr(
        (
          item.title ||
          item.name ||
          ""
        ).toLowerCase()
      )}"
      onclick="openProduct('${escapeAttr(item.id)}')"
    >

      ${
        image
        ?
        `
          <img
            class="product-image"
            src="${escapeAttr(image)}"
            alt=""
          >
        `
        :
        `
          <div class="product-image"></div>
        `
      }


      <div class="product-info">

        <h3>
          ${escapeHTML(
            item.title ||
            item.name ||
            "Product"
          )}
        </h3>

        <div class="product-price">
          ${formatETB(price)}
        </div>

        <div class="product-delivery">
          Delivery: 80 ETB
        </div>

      </div>

    </article>

  `;
}


function filterProducts() {

  const value =
    (
      document.getElementById("marketSearch")
        ?.value || ""
    ).toLowerCase();


  document
    .querySelectorAll(".product-card")
    .forEach(card => {

      const text =
        card.dataset.search || "";

      card.style.display =
        text.includes(value)
          ? ""
          : "none";

    });
}


function marketTab(button, type) {

  document
    .querySelectorAll(".tab")
    .forEach(x =>
      x.classList.remove("active")
    );

  button.classList.add("active");


  if (type === "products") {
    loadMarketplaceProducts();
    return;
  }


  if (type === "work") {
    loadFreeWork();
    return;
  }


  if (type === "my") {
    openMyMarket();
  }
}


/* =========================================================
   PRODUCT
========================================================= */

async function openProduct(id) {

  const {
    data,
    error
  } = await supabaseClient
    .from("marketplace_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();


  if (error || !data) {

    toast("Product not found.");
    return;
  }


  const price =
    Number(data.price_etb || 0);


  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <h2>
          ${escapeHTML(
            data.title ||
            data.name ||
            "Product"
          )}
        </h2>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ✕
        </button>

      </div>


      ${
        data.image_url
        ?
        `
          <img
            src="${escapeAttr(data.image_url)}"
            style="
              width:100%;
              max-height:400px;
              object-fit:cover;
              border-radius:18px;
              margin-bottom:15px;
            "
          >
        `
        :
        ""
      }


      <h2>
        ${formatETB(price)}
      </h2>

      <p class="muted">
        Delivery: 80 ETB
      </p>

      <p style="margin-top:12px">
        ${escapeHTML(
          data.description || ""
        )}
      </p>


      <button
        class="primary-btn"
        style="margin-top:18px"
        onclick="buyProduct('${escapeAttr(data.id)}')"
      >
        Buy Product
      </button>

    </div>

  `);
}


function buyProduct(id) {

  requireAccount(
    "buy",
    () => {

      toast(
        "Order creation is handled securely by MENA backend."
      );

    }
  );
}


/* =========================================================
   SELL
========================================================= */

function openSell() {

  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <h2>Sell on MENA</h2>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ✕
        </button>

      </div>


      <p class="muted">
        Enter the exact amount you want to receive.
        MENA calculates the 5% marketplace fee
        automatically.
      </p>


      <div class="form-group"
           style="margin-top:15px">

        <label>Product name</label>

        <input
          id="sellTitle"
          class="form-input"
          placeholder="Example: Samsung phone"
        >

      </div>


      <div class="form-group">

        <label>
          Amount you want to receive (ETB)
        </label>

        <input
          id="sellReceive"
          class="form-input"
          type="number"
          min="1"
          placeholder="950"
          oninput="calculateSellPrice()"
        >

      </div>


      <div
        id="sellCalculation"
        class="wallet-stat"
        style="
          background:#f5f8fc;
          margin-bottom:13px;
        "
      >
        Buyer price will be calculated here.
      </div>


      <div class="form-group">

        <label>Description</label>

        <textarea
          id="sellDescription"
          class="form-textarea"
          placeholder="Describe your product..."
        ></textarea>

      </div>


      <button
        class="primary-btn"
        onclick="createSellListing()"
      >
        Publish Product
      </button>

    </div>

  `);
}


function calculateSellPrice() {

  const receive =
    Number(
      document.getElementById("sellReceive")
        ?.value || 0
    );

  if (!receive) return;


  const buyerPrice =
    receive / 0.95;


  const fee =
    buyerPrice - receive;


  const box =
    document.getElementById(
      "sellCalculation"
    );


  if (box) {

    box.innerHTML = `

      <strong>
        Buyer price:
        ${formatETB(buyerPrice)}
      </strong>

      <br>

      <small>
        You receive:
        ${formatETB(receive)}
        <br>
        MENA marketplace fee:
        ${formatETB(fee)}
        <br>
        Buyer delivery:
        80 ETB separately
      </small>

    `;
  }
}


async function createSellListing() {

  const title =
    document.getElementById("sellTitle")
      ?.value.trim();

  const receive =
    Number(
      document.getElementById("sellReceive")
        ?.value || 0
    );

  const description =
    document.getElementById("sellDescription")
      ?.value.trim();


  if (!title || receive <= 0) {

    toast(
      "Enter product name and amount."
    );

    return;
  }


  const buyerPrice =
    receive / 0.95;


  const {
    error
  } = await supabaseClient.functions.invoke(
    "create-market-listing",
    {
      body: {
        title,
        description,
        seller_receive_etb: receive,
        buyer_price_etb: buyerPrice
      }
    }
  );


  if (error) {

    toast(
      "Selling backend is not connected yet."
    );

    return;
  }


  closeModal();

  toast("Product published.");

  await renderMarketplace();
}


/* =========================================================
   FREE WORK
========================================================= */

function openFreeWork() {

  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <h2>Post Free Work</h2>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ✕
        </button>

      </div>


      <p class="muted">
        Posting fee: 50 ETB.
        Your Free Work post remains active
        for 30 days.
      </p>


      <div class="form-group"
           style="margin-top:15px">

        <label>Work title</label>

        <input
          id="workTitle"
          class="form-input"
          placeholder="Example: Logo designer needed"
        >

      </div>


      <div class="form-group">

        <label>Description</label>

        <textarea
          id="workDescription"
          class="form-textarea"
          placeholder="Describe the work..."
        ></textarea>

      </div>


      <button
        class="primary-btn"
        onclick="createFreeWork()"
      >
        Post Free Work — 50 ETB
      </button>

    </div>

  `);
}


async function createFreeWork() {

  const title =
    document.getElementById("workTitle")
      ?.value.trim();

  const description =
    document.getElementById("workDescription")
      ?.value.trim();


  if (!title) {

    toast("Enter a work title.");
    return;
  }


  const {
    error
  } = await supabaseClient.functions.invoke(
    "create-free-work",
    {
      body: {
        title,
        description
      }
    }
  );


  if (error) {

    toast(
      "Free Work backend is not connected yet."
    );

    return;
  }


  closeModal();

  toast("Free Work posted.");

  loadFreeWork();
}


async function loadFreeWork() {

  const container =
    document.getElementById(
      "marketContent"
    );

  if (!container) return;


  const {
    data,
    error
  } = await supabaseClient
    .from("free_work_posts")
    .select("*")
    .eq("status", "active")
    .order(
      "created_at",
      { ascending: false }
    )
    .limit(50);


  if (error || !data?.length) {

    container.innerHTML = `

      <div class="empty">

        <div class="empty-icon">
          💼
        </div>

        <h3>No Free Work posts yet</h3>

        <p class="muted">
          Work opportunities will appear here.
        </p>

      </div>

    `;

    return;
  }


  container.innerHTML =
    data.map(work => `

      <article class="post-card">

        <div class="post-body">

          <h3>
            ${escapeHTML(
              work.title || "Free Work"
            )}
          </h3>

          <p
            class="muted"
            style="margin-top:8px"
          >
            ${escapeHTML(
              work.description || ""
            )}
          </p>

        </div>

      </article>

    `).join("");
}


/* =========================================================
   MY MARKET
========================================================= */

function openMyMarket() {

  requireAccount(
    "my market",
    async () => {

      openModal(`

        <div class="modal-box">

          <div class="modal-head">

            <h2>My Market</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ✕
            </button>

          </div>

          <div class="tabs">

            <button class="tab active">
              My Products
            </button>

            <button
              class="tab"
              onclick="loadMyOrders()"
            >
              Bought
            </button>

            <button
              class="tab"
              onclick="loadMySales()"
            >
              Sold
            </button>

          </div>

          <div id="myMarketContent">
            Loading...
          </div>

        </div>

      `);

      await loadMyListings();

    }
  );
}


async function loadMyListings() {

  const box =
    document.getElementById(
      "myMarketContent"
    );

  if (!box) return;


  const {
    data,
    error
  } = await supabaseClient
    .from("marketplace_listings")
    .select("*")
    .eq("seller_id", currentUser.id)
    .order(
      "created_at",
      { ascending: false }
    );


  if (error || !data?.length) {

    box.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🛒</div>
        <h3>No products yet</h3>
      </div>
    `;

    return;
  }


  box.innerHTML =
    data.map(productCard).join("");
}


async function loadMyOrders() {

  const box =
    document.getElementById(
      "myMarketContent"
    );

  if (!box) return;


  const {
    data
  } = await supabaseClient
    .from("marketplace_orders")
    .select("*")
    .eq("buyer_id", currentUser.id)
    .order(
      "created_at",
      { ascending: false }
    );


  box.innerHTML =
    data?.length
      ?
      data.map(order => `

        <div
          class="post-card"
          style="margin-bottom:10px"
        >

          <div class="post-body">

            <strong>
              Order
            </strong>

            <p class="muted">
              ${escapeHTML(
                order.status || ""
              )}
            </p>

          </div>

        </div>

      `).join("")
      :
      `
        <div class="empty">
          No purchases yet.
        </div>
      `;
}


async function loadMySales() {

  const box =
    document.getElementById(
      "myMarketContent"
    );

  if (!box) return;


  const {
    data
  } = await supabaseClient
    .from("marketplace_orders")
    .select("*")
    .eq("seller_id", currentUser.id)
    .order(
      "created_at",
      { ascending: false }
    );


  box.innerHTML =
    data?.length
      ?
      data.map(order => `

        <div
          class="post-card"
          style="margin-bottom:10px"
        >

          <div class="post-body">

            <strong>
              Sale
            </strong>

            <p class="muted">
              ${escapeHTML(
                order.status || ""
              )}
            </p>

          </div>

        </div>

      `).join("")
      :
      `
        <div class="empty">
          No sales yet.
        </div>
      `;
}


/* =========================================================
   PROFILE
========================================================= */

async function renderProfile() {

  /* ================= GUEST ================= */

  if (!currentUser) {

    main.innerHTML = `

      <section class="page">

        <div class="gradient-hero">

          <h1>MENA Profile</h1>

          <p>
            Browse MENA freely.
            Sign up only when you want to
            post, withdraw, buy coins,
            sell or use your wallet.
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
            onclick="showPage('market')"
          >
            <strong>💼 Free Work</strong>
            <small>
              Find and post work
            </small>
          </button>

        </div>


        <div class="empty">

          <div class="empty-icon">
            👤
          </div>

          <h3>
            You are browsing as a guest
          </h3>

          <p class="muted">
            You don't need an account
            to browse MENA.
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

    updateNav();

    return;
  }


  /* ================= LOGGED IN ================= */

  const avatar =
    currentProfile?.avatar_url || "";

  const name =
    currentProfile?.display_name ||
    currentProfile?.username ||
    "MENA user";

  const username =
    currentProfile?.username ||
    "";


  main.innerHTML = `

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
              <div class="profile-avatar"></div>
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
            <strong>—</strong>
            <small>Posts</small>
          </div>

          <div class="profile-stat">
            <strong>—</strong>
            <small>Followers</small>
          </div>

          <div class="profile-stat">
            <strong>—</strong>
            <small>Following</small>
          </div>

        </div>

      </div>


      <div class="action-grid">

        <button
          class="action-card"
          onclick="openWallet()"
        >
          <strong>💰 Wallet</strong>
          <small>
            Balance and earnings
          </small>
        </button>


        <button
          class="action-card"
          onclick="openBuyCoins()"
        >
          <strong>🪙 Buy Coins</strong>
          <small>
            1 coin = 0.50 ETB
          </small>
        </button>


        <button
          class="action-card"
          onclick="openWithdraw()"
        >
          <strong>💸 Withdraw</strong>
          <small>
            Minimum 10 ETB
          </small>
        </button>


        <button
          class="action-card"
          onclick="openExchange()"
        >
          <strong>🔄 Exchange into Coin</strong>
          <small>
            Convert ETB to coins
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
          onclick="showPage('market')"
        >
          <strong>💼 Free Work</strong>
          <small>
            Work opportunities
          </small>
        </button>

      </div>


      <button
        class="primary-btn"
        style="margin-top:15px"
        onclick="openCreatePost()"
      >
        ＋ Create Post
      </button>


      <button
        class="primary-btn danger-btn"
        style="margin-top:10px"
        onclick="logout()"
      >
        Log out
      </button>

    </section>

  `;

  updateNav();
}


/* =========================================================
   WALLET
========================================================= */

async function openWallet() {

  requireAccount(
    "wallet",
    async () => {

      openModal(`

        <div class="modal-box">

          <div class="modal-head">

            <h2>💰 Wallet</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ✕
            </button>

          </div>


          <div
            id="walletContent"
            class="wallet-card"
          >
            Loading wallet...
          </div>


          <div
            class="action-grid"
            style="margin-top:15px"
          >

            <button
              class="action-card"
              onclick="openBuyCoins()"
            >
              <strong>🪙 Buy Coins</strong>
              <small>
                Purchase coins
              </small>
            </button>

            <button
              class="action-card"
              onclick="openWithdraw()"
            >
              <strong>💸 Withdraw</strong>
              <small>
                Minimum 10 ETB
              </small>
            </button>

          </div>

        </div>

      `);


      await loadWallet();
    }
  );
}


async function loadWallet() {

  const box =
    document.getElementById(
      "walletContent"
    );

  if (!box) return;


  const {
    data,
    error
  } = await supabaseClient
    .from("wallets")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();


  if (error || !data) {

    box.innerHTML = `
      <strong>Wallet unavailable</strong>
      <br>
      <small>
        Your wallet will appear after account setup.
      </small>
    `;

    return;
  }


  box.innerHTML = `

    <div class="wallet-label">
      ETB Balance
    </div>

    <div class="wallet-balance">
      ${formatETB(
        Number(data.etb_balance || 0)
      )}
    </div>


    <div class="wallet-grid">

      <div class="wallet-stat">

        <strong>
          ${Number(
            data.coin_balance || 0
          ).toLocaleString()}
        </strong>

        <small>
          Coins
        </small>

      </div>


      <div class="wallet-stat">

        <strong>
          1 coin = 0.50 ETB
        </strong>

        <small>
          Coin value
        </small>

      </div>

    </div>

  `;
}


/* =========================================================
   BUY COINS
========================================================= */

function openBuyCoins() {

  requireAccount(
    "buy coins",
    () => {

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

        <div class="modal-box">

          <div class="modal-head">

            <h2>🪙 Buy Coins</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ✕
            </button>

          </div>


          <p class="muted">
            1 coin = 0.50 ETB
          </p>


          <div
            class="coin-grid"
            style="margin-top:15px"
          >

            ${
              packages.map(coins => `

                <button
                  class="coin-card"
                  onclick="purchaseCoins(${coins})"
                >

                  <strong>
                    🪙 ${coins.toLocaleString()}
                  </strong>

                  <small>
                    ${formatETB(
                      coins * .5
                    )}
                  </small>

                </button>

              `).join("")
            }

          </div>

        </div>

      `);

    }
  );
}


async function purchaseCoins(coins) {

  const amount =
    coins * 0.5;


  const ok =
    confirm(
      `Buy ${coins.toLocaleString()} coins for ${formatETB(amount)}?`
    );

  if (!ok) return;


  const {
    error
  } = await supabaseClient.functions.invoke(
    "buy-coins",
    {
      body: {
        coins,
        amount_etb: amount
      }
    }
  );


  if (error) {

    toast(
      "Coin payment backend is not connected yet."
    );

    return;
  }


  closeModal();

  toast("Coin purchase started.");
}


/* =========================================================
   EXCHANGE
========================================================= */

function openExchange() {

  requireAccount(
    "exchange",
    () => {

      openModal(`

        <div class="modal-box">

          <div class="modal-head">

            <h2>🔄 Exchange into Coin</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ✕
            </button>

          </div>


          <p class="muted">
            Convert available ETB into MENA coins.
            1 ETB = 2 coins.
          </p>


          <div class="form-group"
               style="margin-top:15px">

            <label>
              ETB amount
            </label>

            <input
              id="exchangeAmount"
              class="form-input"
              type="number"
              min="1"
              placeholder="10"
              oninput="showExchangeValue()"
            >

          </div>


          <div
            id="exchangeResult"
            class="wallet-stat"
            style="margin-bottom:13px"
          >
            Enter amount.
          </div>


          <button
            class="primary-btn"
            onclick="exchangeETB()"
          >
            Exchange
          </button>

        </div>

      `);

    }
  );
}


function showExchangeValue() {

  const etb =
    Number(
      document.getElementById(
        "exchangeAmount"
      )?.value || 0
    );


  const box =
    document.getElementById(
      "exchangeResult"
    );


  if (box) {

    box.innerHTML = `
      ${etb} ETB =
      <strong>
        ${(etb * 2).toLocaleString()} coins
      </strong>
    `;
  }
}


async function exchangeETB() {

  const etb =
    Number(
      document.getElementById(
        "exchangeAmount"
      )?.value || 0
    );


  if (etb <= 0) {

    toast("Enter an amount.");
    return;
  }


  const {
    error
  } = await supabaseClient.functions.invoke(
    "exchange-etb-to-coins",
    {
      body: {
        amount_etb: etb
      }
    }
  );


  if (error) {

    toast(
      "Exchange backend is not connected yet."
    );

    return;
  }


  closeModal();

  toast("Exchange completed.");
}


/* =========================================================
   WITHDRAW
========================================================= */

function openWithdraw() {

  requireAccount(
    "withdraw",
    () => {

      openModal(`

        <div class="modal-box">

          <div class="modal-head">

            <h2>💸 Withdraw</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ✕
            </button>

          </div>


          <div class="wallet-card">

            <div class="wallet-label">
              Minimum withdrawal
            </div>

            <div class="wallet-balance">
              10 ETB
            </div>

          </div>


          <div class="form-group"
               style="margin-top:15px">

            <label>
              Withdrawal amount
            </label>

            <input
              id="withdrawAmount"
              class="form-input"
              type="number"
              min="10"
              placeholder="10"
            >

          </div>


          <div class="form-group">

            <label>
              Payment method
            </label>

            <select id="withdrawMethod">

              <option value="telebirr">
                Telebirr
              </option>

              <option value="mpesa">
                M-PESA
              </option>

            </select>

          </div>


          <div class="form-group">

            <label>
              Payment account
            </label>

            <input
              id="withdrawAccount"
              class="form-input"
              placeholder="Phone/account number"
            >

          </div>


          <button
            class="primary-btn"
            onclick="submitWithdraw()"
          >
            Request Withdrawal
          </button>

        </div>

      `);

    }
  );
}


async function submitWithdraw() {

  const amount =
    Number(
      document.getElementById(
        "withdrawAmount"
      )?.value || 0
    );

  const method =
    document.getElementById(
      "withdrawMethod"
    )?.value;

  const account =
    document.getElementById(
      "withdrawAccount"
    )?.value.trim();


  if (amount < 10) {

    toast(
      "Minimum withdrawal is 10 ETB."
    );

    return;
  }


  if (!account) {

    toast(
      "Enter your payment account."
    );

    return;
  }


  const {
    error
  } = await supabaseClient.functions.invoke(
    "withdraw",
    {
      body: {
        amount_etb: amount,
        method,
        account
      }
    }
  );


  if (error) {

    toast(
      "Withdrawal backend is not connected yet."
    );

    return;
  }


  closeModal();

  toast(
    "Withdrawal request submitted."
  );
}


/* =========================================================
   CREATE POST
========================================================= */

function openCreatePost() {

  requireAccount(
    "post",
    () => {

      openModal(`

        <div class="modal-box">

          <div class="modal-head">

            <h2>Create Post</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ✕
            </button>

          </div>


          <div class="form-group">

            <label>
              Caption
            </label>

            <textarea
              id="postCaption"
              class="form-textarea"
              placeholder="What's happening?"
            ></textarea>

          </div>


          <button
            class="secondary-btn"
            onclick="chooseMedia()"
          >
            📷 Choose Photo / Video
          </button>


          <div
            id="selectedMedia"
            class="muted"
            style="margin:12px 0"
          ></div>


          <button
            class="primary-btn"
            onclick="uploadPost()"
          >
            Publish Post
          </button>

        </div>

      `);

    }
  );
}


function chooseMedia() {

  document
    .getElementById("mediaInput")
    ?.click();
}


document
  .getElementById("mediaInput")
  ?.addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];

      const box =
        document.getElementById(
          "selectedMedia"
        );

      if (box && file) {

        box.textContent =
          "Selected: " +
          file.name;
      }

    }
  );


async function uploadPost() {

  const file =
    document.getElementById(
      "mediaInput"
    )?.files?.[0];

  const caption =
    document.getElementById(
      "postCaption"
    )?.value.trim();


  if (!file) {

    toast(
      "Choose a photo or video."
    );

    return;
  }


  toast("Uploading...");


  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  const path =
    currentUser.id +
    "/" +
    crypto.randomUUID() +
    "." +
    extension;


  const {
    error: uploadError
  } = await supabaseClient.storage
    .from("media")
    .upload(
      path,
      file,
      {
        upsert: false,
        contentType: file.type
      }
    );


  if (uploadError) {

    toast(
      "Media upload failed."
    );

    return;
  }


  const {
    data: publicData
  } =
    supabaseClient.storage
      .from("media")
      .getPublicUrl(path);


  const mediaUrl =
    publicData.publicUrl;


  const mediaType =
    file.type.startsWith("video/")
      ? "video"
      : "image";


  const {
    error
  } = await supabaseClient
    .from("posts")
    .insert({
      user_id: currentUser.id,
      caption,
      media_url: mediaUrl,
      media_type: mediaType
    });


  if (error) {

    toast(
      "Post could not be created."
    );

    return;
  }


  closeModal();

  toast("Post published.");

  showPage("home");
}


/* =========================================================
   INBOX
========================================================= */

function renderInbox() {

  if (!currentUser) {

    main.innerHTML = `

      <section class="page">

        <div class="gradient-hero">

          <h1>Inbox</h1>

          <p>
            Your messages will appear here
            after you create an account.
          </p>

        </div>


        <button
          class="primary-btn"
          style="margin-top:15px"
          onclick="openAuth('signup')"
        >
          Create Account
        </button>

      </section>

    `;

    updateNav();

    return;
  }


  main.innerHTML = `

    <section class="page">

      <div class="gradient-hero">

        <h1>💬 Inbox</h1>

        <p>
          Messages and conversations.
        </p>

      </div>


      <div class="empty">

        <div class="empty-icon">
          💬
        </div>

        <h3>No conversations yet</h3>

        <p class="muted">
          Your MENA messages will appear here.
        </p>

      </div>

    </section>

  `;

  updateNav();
}


/* =========================================================
   AUTH MODAL
========================================================= */

function openAuth(mode = "login") {

  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <h2>
          ${
            mode === "signup"
              ? "Create MENA Account"
              : "Login to MENA"
          }
        </h2>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ✕
        </button>

      </div>


      ${
        mode === "signup"
        ?
        `
          <div class="form-group">

            <label>
              Username
            </label>

            <input
              id="authUsername"
              class="form-input"
              placeholder="username"
            >

          </div>
        `
        :
        ""
      }


      <div class="form-group">

        <label>Email</label>

        <input
          id="authEmail"
          class="form-input"
          type="email"
          placeholder="you@example.com"
        >

      </div>


      <div class="form-group">

        <label>Password</label>

        <input
          id="authPassword"
          class="form-input"
          type="password"
          placeholder="Password"
        >

      </div>


      <button
        class="primary-btn"
        onclick="${
          mode === "signup"
            ? "signup()"
            : "login()"
        }"
      >
        ${
          mode === "signup"
            ? "Create Account"
            : "Login"
        }
      </button>


      <button
        class="secondary-btn"
        style="margin-top:10px"
        onclick="${
          mode === "signup"
            ? "openAuth('login')"
            : "openAuth('signup')"
        }"
      >
        ${
          mode === "signup"
            ? "Already have an account? Login"
            : "Create a new account"
        }
      </button>

    </div>

  `);
}


async function signup() {

  const email =
    document.getElementById(
      "authEmail"
    )?.value.trim();

  const password =
    document.getElementById(
      "authPassword"
    )?.value;


  const username =
    document.getElementById(
      "authUsername"
    )?.value.trim();


  if (!email || !password) {

    toast(
      "Enter email and password."
    );

    return;
  }


  const {
    data,
    error
  } = await supabaseClient.auth.signUp({
    email,
    password,

    options: {
      data: {
        username:
          username ||
          email.split("@")[0]
      }
    }
  });


  if (error) {

    toast(error.message);
    return;
  }


  closeModal();

  if (data.session) {

    toast(
      "Account created."
    );

  } else {

    toast(
      "Account created. Check your email if verification is required."
    );

  }
}


async function login() {

  const email =
    document.getElementById(
      "authEmail"
    )?.value.trim();

  const password =
    document.getElementById(
      "authPassword"
    )?.value;


  if (!email || !password) {

    toast(
      "Enter email and password."
    );

    return;
  }


  const {
    error
  } = await supabaseClient.auth
    .signInWithPassword({
      email,
      password
    });


  if (error) {

    toast(error.message);
    return;
  }


  closeModal();

  toast("Welcome to MENA.");

  showPage("profile");
}


async function logout() {

  await supabaseClient.auth.signOut();

  currentUser = null;
  currentProfile = null;

  showPage("home");

  toast("Logged out.");
}


/* =========================================================
   ACCOUNT GATE
========================================================= */

function requireAccount(
  action,
  callback
) {

  if (currentUser) {

    callback();
    return;
  }


  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <h2>Join MENA</h2>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ✕
        </button>

      </div>


      <div class="empty">

        <div class="empty-icon">
          👤
        </div>

        <h3>
          Account required
        </h3>

        <p class="muted">
          Create a MENA account to
          ${escapeHTML(action)}.
        </p>

        <button
          class="primary-btn"
          style="margin-top:15px"
          onclick="openAuth('signup')"
        >
          Create Account
        </button>

        <button
          class="secondary-btn"
          style="margin-top:10px"
          onclick="openAuth('login')"
        >
          Login
        </button>

      </div>

    </div>

  `);
}


/* =========================================================
   SEARCH
========================================================= */

function openSearch() {

  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <h2>🔎 Search MENA</h2>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ✕
        </button>

      </div>


      <div class="form-group">

        <input
          id="globalSearch"
          class="form-input"
          placeholder="Search users, products..."
        >

      </div>


      <button
        class="primary-btn"
        onclick="runGlobalSearch()"
      >
        Search
      </button>


      <div
        id="searchResults"
        style="margin-top:15px"
      ></div>

    </div>

  `);
}


async function runGlobalSearch() {

  const q =
    document.getElementById(
      "globalSearch"
    )?.value.trim();


  if (!q) {

    toast("Enter a search term.");
    return;
  }


  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select(
      "id,username,display_name,avatar_url"
    )
    .or(
      `username.ilike.%${q}%,display_name.ilike.%${q}%`
    )
    .limit(20);


  const box =
    document.getElementById(
      "searchResults"
    );


  if (error || !data?.length) {

    box.innerHTML = `
      <div class="empty">
        No users found.
      </div>
    `;

    return;
  }


  box.innerHTML =
    data.map(user => `

      <div
        class="post-card"
        style="margin-bottom:8px"
      >

        <div class="post-head">

          ${
            user.avatar_url
            ?
            `
              <img
                class="post-avatar"
                src="${escapeAttr(user.avatar_url)}"
              >
            `
            :
            `<div class="post-avatar"></div>`
          }

          <div class="post-user">

            <strong>
              ${escapeHTML(
                user.display_name ||
                user.username ||
                "MENA user"
              )}
            </strong>

            <small>
              @${escapeHTML(
                user.username || ""
              )}
            </small>

          </div>

        </div>

      </div>

    `).join("");
}


/* =========================================================
   SETTINGS
========================================================= */

function openSettings() {

  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <h2>⚙️ Settings</h2>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ✕
        </button>

      </div>


      ${
        currentUser
        ?
        `
          <button
            class="secondary-btn"
            onclick="openAvatarPicker()"
          >
            🖼 Change Profile Photo
          </button>

          <button
            class="secondary-btn"
            style="margin-top:10px"
            onclick="closeModal();showPage('profile')"
          >
            👤 Profile
          </button>

          <button
            class="primary-btn danger-btn"
            style="margin-top:10px"
            onclick="closeModal();logout()"
          >
            Log out
          </button>
        `
        :
        `
          <p class="muted">
            You are browsing MENA as a guest.
          </p>

          <button
            class="primary-btn"
            style="margin-top:15px"
            onclick="openAuth('signup')"
          >
            Create Account
          </button>
        `
      }

    </div>

  `);
}


function openAvatarPicker() {

  closeModal();

  document
    .getElementById("avatarInput")
    ?.click();
}


document
  .getElementById("avatarInput")
  ?.addEventListener(
    "change",
    async event => {

      const file =
        event.target.files?.[0];

      if (!file || !currentUser)
        return;


      const extension =
        file.name
          .split(".")
          .pop()
          .toLowerCase();


      const path =
        currentUser.id +
        "/avatar-" +
        crypto.randomUUID() +
        "." +
        extension;


      const {
        error: uploadError
      } = await supabaseClient.storage
        .from("media")
        .upload(
          path,
          file,
          {
            upsert: false,
            contentType: file.type
          }
        );


      if (uploadError) {

        toast("Avatar upload failed.");
        return;
      }


      const {
        data
      } =
        supabaseClient.storage
          .from("media")
          .getPublicUrl(path);


      const {
        error
      } = await supabaseClient
        .from("profiles")
        .update({
          avatar_url:
            data.publicUrl
        })
        .eq(
          "id",
          currentUser.id
        );


      if (error) {

        toast(
          "Could not update profile."
        );

        return;
      }


      await loadProfile();

      toast(
        "Profile photo updated."
      );

      showPage("profile");
    }
  );


/* =========================================================
   MODALS
========================================================= */

function openModal(html) {

  modal.innerHTML = html;

  modal.classList.remove("hidden");

  document.body.style.overflow =
    "hidden";
}


function closeModal() {

  modal.classList.add("hidden");

  modal.innerHTML = "";

  document.body.style.overflow =
    "";
}


/* =========================================================
   HELPERS
========================================================= */

function toast(message) {

  const old =
    document.querySelector(
      ".toast"
    );

  if (old) old.remove();


  const el =
    document.createElement("div");

  el.className = "toast";

  el.textContent = message;

  document.body.appendChild(el);


  setTimeout(() => {

    el.remove();

  }, 3200);
}


function formatETB(value) {

  return (
    Number(value || 0)
      .toLocaleString(
        undefined,
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    + " ETB"
  );
}


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


/* =========================================================
   INITIAL NAV
========================================================= */

updateNav();
