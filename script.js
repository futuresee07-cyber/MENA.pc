/* =========================================================
   MENA
   Guest-first social + marketplace application
   ========================================================= */


/* ---------------- SUPABASE ---------------- */

const SUPABASE_URL =
  "https://ryywkqyeoftuejczeqgg.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_E6S3EtoGbEqA_XkRpJhYpA_g8SvjMeH";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* ---------------- GLOBAL STATE ---------------- */

let currentUser = null;
let currentProfile = null;

let currentPage = "home";

let marketplaceItems = [];

let selectedCategory = "All";

let searchTimer = null;


/* ---------------- ELEMENTS ---------------- */

const main =
  document.getElementById("mainContent");

const modal =
  document.getElementById("modal");

const mediaInput =
  document.getElementById("mediaInput");

const avatarInput =
  document.getElementById("avatarInput");


/* =========================================================
   START
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  await loadSession();

  setupNavigation();

  await showPage("home");

});


/* =========================================================
   AUTH SESSION
   ========================================================= */

async function loadSession() {

  const {
    data,
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    return;
  }

  currentUser =
    data.session?.user || null;

  if (currentUser) {
    await loadProfile();
  }

}


supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    currentUser =
      session?.user || null;

    if (currentUser) {
      await loadProfile();
    } else {
      currentProfile = null;
    }

    if (currentPage === "profile") {
      await showPage("profile");
    }

  }
);


/* =========================================================
   PROFILE
   ========================================================= */

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

  if (error) {
    console.error(error);
    return;
  }

  currentProfile = data;
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

  document.querySelectorAll("[data-page]")
    .forEach(button => {

      button.addEventListener("click", async () => {

        const page =
          button.dataset.page;

        await showPage(page);

      });

    });


  document
    .getElementById("createBtn")
    .addEventListener(
      "click",
      openCreatePost
    );


  document
    .getElementById("searchBtn")
    .addEventListener(
      "click",
      openSearch
    );


  document
    .getElementById("settingsBtn")
    .addEventListener(
      "click",
      openSettings
    );

}


async function showPage(page) {

  currentPage = page;

  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });


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
          Discover people, videos, products,
          opportunities and real work from the MENA community.
        </p>

      </div>

      <div class="feed" id="feed">
        <div class="empty">
          <div class="empty-icon">⏳</div>
          <h3>Loading posts...</h3>
        </div>
      </div>

    </section>
  `;


  const feed =
    document.getElementById("feed");


  const {
    data,
    error
  } = await supabaseClient
    .from("posts")
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .order("created_at", {
      ascending: false
    })
    .limit(30);


  if (error) {

    feed.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <h3>Posts could not be loaded</h3>
        <p class="muted">
          Please try again.
        </p>
      </div>
    `;

    return;
  }


  if (!data || data.length === 0) {

    feed.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🎬</div>
        <h3>No posts yet</h3>
        <p class="muted">
          The first real MENA post will appear here.
        </p>
      </div>
    `;

    return;
  }


  feed.innerHTML =
    data.map(post => postHTML(post)).join("");

}


/* =========================================================
   POST HTML
   ========================================================= */

function postHTML(post) {

  const profile =
    post.profiles || {};

  const avatar =
    profile.avatar_url ||
    "";


  const username =
    profile.display_name ||
    profile.username ||
    "MENA user";


  let media = "";


  if (post.media_url) {

    if (
      post.media_type === "video" ||
      post.media_url.match(
        /\.(mp4|webm|mov|m4v)(\?|$)/i
      )
    ) {

      media = `
        <video
          class="post-media"
          src="${escapeAttr(post.media_url)}"
          controls
          playsinline
          preload="metadata"
        ></video>
      `;

    } else {

      media = `
        <img
          class="post-media"
          src="${escapeAttr(post.media_url)}"
          alt=""
          loading="lazy"
        >
      `;

    }

  }


  return `
    <article class="post-card">

      <div class="post-head">

        ${
          avatar
          ?
          `<img
             class="avatar"
             src="${escapeAttr(avatar)}"
             alt=""
           >`
          :
          `<div class="avatar"></div>`
        }

        <div class="post-user">

          <strong>
            ${escapeHTML(username)}
          </strong>

          <small>
            MENA
          </small>

        </div>

        ${
          currentUser &&
          currentUser.id !== profile.id
          ?
          `
          <button
            class="follow-btn"
            onclick="followUser('${escapeAttr(profile.id || "")}')"
          >
            Follow
          </button>
          `
          :
          ""
        }

      </div>

      ${media}

      ${
        post.content
        ?
        `
        <div class="post-text">
          ${escapeHTML(post.content)}
        </div>
        `
        :
        ""
      }

      <div class="post-actions">

        <button
          class="post-action like"
          onclick="likePost('${escapeAttr(post.id)}')"
        >
          ♥ ${Number(post.likes_count || 0)}
        </button>

        <button
          class="post-action"
          onclick="commentPost('${escapeAttr(post.id)}')"
        >
          💬 ${Number(post.comments_count || 0)}
        </button>

        <button
          class="post-action"
          onclick="sharePost('${escapeAttr(post.id)}')"
        >
          ↗ Share
        </button>

      </div>

    </article>
  `;
}


/* =========================================================
   MARKETPLACE
   ========================================================= */

async function renderMarketplace() {

  main.innerHTML = `

    <section class="page">

      <div class="market-head">

        <div class="market-title">
          Marketplace
        </div>

        <div class="market-subtitle">
          Discover products and opportunities from real MENA sellers.
        </div>

        <div class="search-box market-search">

          <span>🔎</span>

          <input
            id="marketSearch"
            placeholder="Search products..."
          >

        </div>


        <div class="market-buttons">

          <button
            class="market-main-btn"
            id="sellBtn"
          >
            ＋ Sell
          </button>

          <button
            class="market-main-btn yellow"
            id="freeWorkBtn"
          >
            💼 Free Work
          </button>

        </div>

      </div>


      <div
        class="category-scroll"
        id="categories"
      ></div>


      <div
        class="products-grid"
        id="products"
      >
        <div class="empty">
          Loading...
        </div>
      </div>

    </section>
  `;


  document
    .getElementById("sellBtn")
    .onclick = openSell;


  document
    .getElementById("freeWorkBtn")
    .onclick = openFreeWork;


  const search =
    document.getElementById("marketSearch");


  search.addEventListener(
    "input",
    () => {

      clearTimeout(searchTimer);

      searchTimer =
        setTimeout(
          () => loadMarketplace(search.value),
          350
        );

    }
  );


  await loadCategories();

  await loadMarketplace();

}


/* =========================================================
   MARKET CATEGORIES
   ========================================================= */

async function loadCategories() {

  const container =
    document.getElementById("categories");

  if (!container) return;


  const categories = [
    "All",
    "Electronics",
    "Fashion",
    "Home",
    "Beauty",
    "Phones",
    "Services",
    "Other"
  ];


  container.innerHTML =
    categories.map(category => `
      <button
        class="category ${
          category === selectedCategory
            ? "active"
            : ""
        }"
        onclick="selectCategory('${escapeAttr(category)}')"
      >
        ${escapeHTML(category)}
      </button>
    `).join("");

}


async function selectCategory(category) {

  selectedCategory =
    category;

  await loadCategories();

  const search =
    document.getElementById("marketSearch");

  await loadMarketplace(
    search ? search.value : ""
  );

}


/* =========================================================
   LOAD REAL PRODUCTS
   ========================================================= */

async function loadMarketplace(
  searchText = ""
) {

  const container =
    document.getElementById("products");

  if (!container) return;


  container.innerHTML = `
    <div class="empty">
      <div class="empty-icon">⏳</div>
      <h3>Loading marketplace...</h3>
    </div>
  `;


  let query =
    supabaseClient
      .from("marketplace_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", {
        ascending: false
      })
      .limit(50);


  if (selectedCategory !== "All") {

    query =
      query.eq(
        "category",
        selectedCategory
      );

  }


  if (searchText.trim()) {

    const text =
      searchText.trim()
        .replace(/[%_]/g, "");

    query =
      query.or(
        `title.ilike.%${text}%,description.ilike.%${text}%`
      );

  }


  const {
    data,
    error
  } = await query;


  if (error) {

    console.error(error);

    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <h3>Marketplace unavailable</h3>
        <p class="muted">
          Check the Supabase marketplace table and policies.
        </p>
      </div>
    `;

    return;
  }


  marketplaceItems =
    data || [];


  if (!marketplaceItems.length) {

    container.innerHTML = `
      <div class="empty"
           style="grid-column:1/-1">

        <div class="empty-icon">
          🛍
        </div>

        <h3>No products found</h3>

        <p class="muted">
          Real products posted by MENA users will appear here.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML =
    marketplaceItems
      .map(product => productHTML(product))
      .join("");

}


/* =========================================================
   PRODUCT CARD
   ========================================================= */

function productHTML(product) {

  const image =
    product.image_url ||
    product.media_url ||
    "";


  const price =
    Number(product.price_etb || product.price || 0);


  return `

    <article
      class="product-card"
      onclick="openProduct('${escapeAttr(product.id)}')"
    >

      ${
        image
        ?
        `
        <img
          class="product-image"
          src="${escapeAttr(image)}"
          alt=""
          loading="lazy"
        >
        `
        :
        `
        <div class="product-image"></div>
        `
      }


      <div class="product-body">

        <div class="product-title">
          ${escapeHTML(
            product.title ||
            "Product"
          )}
        </div>


        <div class="product-price">
          ${formatETB(price)}
        </div>


        <div class="delivery">
          Delivery: 80 ETB
        </div>

      </div>

    </article>
  `;
}


/* =========================================================
   PRODUCT DETAIL
   ========================================================= */

async function openProduct(id) {

  const product =
    marketplaceItems.find(
      item => String(item.id) === String(id)
    );


  if (!product) return;


  const image =
    product.image_url ||
    product.media_url ||
    "";


  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <strong>
          Product
        </strong>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ×
        </button>

      </div>


      ${
        image
        ?
        `<img
           class="detail-image"
           src="${escapeAttr(image)}"
           alt=""
         >`
        :
        `<div class="detail-image"></div>`
      }


      <h2 style="margin-top:15px">
        ${escapeHTML(product.title || "Product")}
      </h2>


      <div class="detail-price">
        ${formatETB(
          Number(
            product.price_etb ||
            product.price ||
            0
          )
        )}
      </div>


      <p
        class="muted"
        style="margin-top:8px"
      >
        Delivery: 80 ETB
      </p>


      <p
        style="
          margin-top:15px;
          line-height:1.55
        "
      >
        ${escapeHTML(
          product.description || ""
        )}
      </p>


      <button
        class="primary-btn"
        style="margin-top:18px"
        onclick="buyProduct('${escapeAttr(product.id)}')"
      >
        Buy
      </button>

    </div>

  `);

}


/* =========================================================
   SELL
   ========================================================= */

function openSell() {

  requireAccount(
    "post",
    () => {

      openModal(`

        <div class="modal-box">

          <div class="modal-head">

            <h2>Sell on MENA</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ×
            </button>

          </div>


          <p
            class="muted"
            style="margin-bottom:15px"
          >
            Enter the exact amount you want to receive.
            MENA's 5% marketplace fee is calculated from
            the buyer price.
          </p>


          <div class="form-group">

            <label>
              Product name
            </label>

            <input
              id="sellTitle"
              placeholder="Product name"
            >

          </div>


          <div class="form-group">

            <label>
              Amount you want to receive
            </label>

            <input
              id="sellReceive"
              type="number"
              min="1"
              placeholder="950"
            >

          </div>


          <div class="form-group">

            <label>
              Category
            </label>

            <select id="sellCategory">

              <option>Electronics</option>
              <option>Fashion</option>
              <option>Home</option>
              <option>Beauty</option>
              <option>Phones</option>
              <option>Services</option>
              <option>Other</option>

            </select>

          </div>


          <div class="form-group">

            <label>
              Description
            </label>

            <textarea
              id="sellDescription"
              placeholder="Describe your product..."
            ></textarea>

          </div>


          <div
            id="sellCalculation"
            class="empty"
            style="padding:16px;margin-bottom:12px"
          >
            Enter your desired amount.
          </div>


          <button
            class="primary-btn"
            onclick="submitSell()"
          >
            Continue
          </button>

        </div>

      `);


      const input =
        document.getElementById("sellReceive");


      input.addEventListener(
        "input",
        updateSellCalculation
      );

    }
  );

}


/* =========================================================
   SELL CALCULATION
   ========================================================= */

function updateSellCalculation() {

  const input =
    document.getElementById("sellReceive");

  const box =
    document.getElementById("sellCalculation");


  if (!input || !box) return;


  const receive =
    Number(input.value);


  if (!receive || receive <= 0) {

    box.innerHTML =
      "Enter your desired amount.";

    return;

  }


  const buyerPrice =
    receive / 0.95;


  const fee =
    buyerPrice - receive;


  box.innerHTML = `

    <strong>
      Buyer product price:
      ${formatETB(buyerPrice)}
    </strong>

    <br>

    MENA fee:
    ${formatETB(fee)}

    <br>

    You receive:
    ${formatETB(receive)}

    <br>

    Buyer delivery:
    80 ETB separately

  `;

}


/* =========================================================
   SUBMIT SELL
   ========================================================= */

async function submitSell() {

  requireAccount(
    "post",
    async () => {

      const title =
        document.getElementById("sellTitle")
          .value.trim();

      const receive =
        Number(
          document.getElementById("sellReceive")
            .value
        );

      const category =
        document.getElementById("sellCategory")
          .value;

      const description =
        document.getElementById("sellDescription")
          .value.trim();


      if (!title || !receive) {

        alert(
          "Enter the product name and amount."
        );

        return;

      }


      const buyerPrice =
        Number(
          (receive / 0.95).toFixed(2)
        );


      /*
        Sensitive money creation must be done
        by your Supabase Edge Function.
      */

      const result =
        await callFunction(
          "create-market-listing",
          {
            title,
            description,
            category,
            seller_receive_etb: receive,
            buyer_price_etb: buyerPrice
          }
        );


      if (!result.ok) {

        alert(
          result.message ||
          "Could not create listing."
        );

        return;

      }


      closeModal();

      alert(
        "Your listing was submitted."
      );

      await renderMarketplace();

    }
  );

}


/* =========================================================
   FREE WORK
   ========================================================= */

function openFreeWork() {

  requireAccount(
    "post",
    () => {

      openModal(`

        <div class="modal-box">

          <div class="modal-head">

            <h2>Free Work</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ×
            </button>

          </div>


          <p
            class="muted"
            style="margin-bottom:15px"
          >
            Post a work opportunity for 50 ETB.
            The post remains active for 30 days.
          </p>


          <div class="form-group">

            <label>
              Work title
            </label>

            <input
              id="workTitle"
              placeholder="What work are you offering?"
            >

          </div>


          <div class="form-group">

            <label>
              Description
            </label>

            <textarea
              id="workDescription"
              placeholder="Explain the work..."
            ></textarea>

          </div>


          <button
            class="primary-btn yellow-btn"
            onclick="submitFreeWork()"
          >
            Post for 50 ETB
          </button>

        </div>

      `);

    }
  );

}


/* =========================================================
   FREE WORK SUBMIT
   ========================================================= */

async function submitFreeWork() {

  requireAccount(
    "post",
    async () => {

      const title =
        document.getElementById("workTitle")
          .value.trim();

      const description =
        document.getElementById("workDescription")
          .value.trim();


      if (!title) {

        alert(
          "Enter a work title."
        );

        return;

      }


      const result =
        await callFunction(
          "create-free-work",
          {
            title,
            description,
            posting_fee_etb: 50
          }
        );


      if (!result.ok) {

        alert(
          result.message ||
          "Could not create Free Work post."
        );

        return;

      }


      closeModal();

      alert(
        "Free Work post submitted."
      );

    }
  );

}


/* =========================================================
   CREATE SOCIAL POST
   ========================================================= */

function openCreatePost() {

  requireAccount(
    "post",
    () => {

      openModal(`

        <div class="modal-box">

          <div class="modal-head">

            <h2>Create post</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ×
            </button>

          </div>


          <div class="form-group">

            <label>
              Caption
            </label>

            <textarea
              id="postCaption"
              placeholder="Write something..."
            ></textarea>

          </div>


          <button
            class="primary-btn"
            onclick="chooseMedia()"
          >
            📷 Add photo / video
          </button>


          <div
            id="selectedMedia"
            style="margin-top:10px"
          ></div>

        </div>

      `);

    }
  );

}


function chooseMedia() {

  mediaInput.click();

}


mediaInput.addEventListener(
  "change",
  async () => {

    if (!mediaInput.files.length)
      return;


    const file =
      mediaInput.files[0];


    const caption =
      document.getElementById(
        "postCaption"
      )?.value || "";


    await uploadPost(
      file,
      caption
    );

  }
);


/* =========================================================
   UPLOAD POST
   ========================================================= */

async function uploadPost(
  file,
  caption
) {

  if (!currentUser) {

    requireAccount("post");

    return;

  }


  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  const path =
    `${currentUser.id}/${crypto.randomUUID()}.${extension}`;


  const {
    error: uploadError
  } =
    await supabaseClient
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


  if (uploadError) {

    alert(
      uploadError.message
    );

    return;

  }


  const {
    data: publicData
  } =
    supabaseClient
      .storage
      .from("media")
      .getPublicUrl(path);


  const mediaType =
    file.type.startsWith("video/")
      ? "video"
      : "image";


  const {
    error
  } =
    await supabaseClient
      .from("posts")
      .insert({
        user_id: currentUser.id,
        content: caption,
        media_url: publicData.publicUrl,
        media_type: mediaType
      });


  if (error) {

    alert(error.message);

    return;

  }


  closeModal();

  mediaInput.value = "";

  await renderHome();

}


/* =========================================================
   WALLET / PROFILE
   ========================================================= */

async function renderProfile() {

  if (!currentUser) {

    main.innerHTML = `

      <section class="page">

        <div class="gradient-hero">

          <h1>MENA Profile</h1>

          <p>
            Browse MENA freely. An account is needed
            when you post, withdraw or buy coins.
          </p>

        </div>


        <div class="action-grid">

          <button
            class="action-card"
            onclick="openAuth('login')"
          >
            <strong>Login</strong>
            <small>
              Access your account
            </small>
          </button>


          <button
            class="action-card"
            onclick="openAuth('signup')"
          >
            <strong>Create account</strong>
            <small>
              Join MENA
            </small>
          </button>

        </div>

      </section>
    `;

    return;

  }


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
            `<img
               class="profile-avatar"
               src="${escapeAttr(avatar)}"
               alt=""
             >`
            :
            `<div class="profile-avatar"></div>`
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
          onclick="showPage('market')"
        >
          <strong>🛍 Marketplace</strong>
          <small>
            Sell and Free Work
          </small>
        </button>

      </div>


      <button
        class="primary-btn"
        style="margin-top:15px"
        onclick="logout()"
      >
        Log out
      </button>

    </section>
  `;

}


/* =========================================================
   WALLET
   ========================================================= */

async function openWallet() {

  if (!currentUser) {

    openAuth("login");

    return;

  }


  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <h2>Wallet</h2>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ×
        </button>

      </div>


      <div id="walletContent">

        <div class="empty">
          Loading wallet...
        </div>

      </div>

    </div>

  `);


  const result =
    await callFunction(
      "quick-action",
      {
        action: "wallet"
      }
    );


  const box =
    document.getElementById(
      "walletContent"
    );


  if (!box) return;


  if (!result.ok) {

    box.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <h3>Wallet unavailable</h3>
        <p class="muted">
          ${escapeHTML(
            result.message || ""
          )}
        </p>
      </div>
    `;

    return;

  }


  const wallet =
    result.data || {};


  box.innerHTML = `

    <div class="balance-card">

      <small>
        ETB Balance
      </small>

      <div class="balance-value">
        ${formatETB(
          wallet.etb_balance || 0
        )}
      </div>

      <small>
        Coins:
        ${Number(
          wallet.coin_balance || 0
        ).toLocaleString()}
      </small>

    </div>


    <div class="wallet-buttons">

      <button
        class="wallet-btn"
        onclick="openBuyCoins()"
      >
        Buy Coins
      </button>

      <button
        class="wallet-btn blue"
        onclick="openWithdraw()"
      >
        Withdraw
      </button>

    </div>

  `;

}


/* =========================================================
   EXCHANGE
   ========================================================= */

function openExchange() {

  requireAccount(
    "post",
    () => {

      openModal(`

        <div class="modal-box">

          <div class="modal-head">

            <h2>Exchange into coin</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ×
            </button>

          </div>


          <p class="muted">
            1 coin = 0.50 ETB.
          </p>


          <div class="form-group"
               style="margin-top:15px">

            <label>
              ETB amount
            </label>

            <input
              id="exchangeAmount"
              type="number"
              min="1"
              placeholder="10"
            >

          </div>


          <button
            class="primary-btn"
            onclick="exchangeCoins()"
          >
            Exchange
          </button>

        </div>

      `);

    }
  );

}


async function exchangeCoins() {

  const amount =
    Number(
      document.getElementById(
        "exchangeAmount"
      ).value
    );


  if (!amount || amount <= 0) {

    alert("Enter an amount.");

    return;

  }


  const result =
    await callFunction(
      "exchange-etb-to-coins",
      {
        etb_amount: amount
      }
    );


  if (!result.ok) {

    alert(
      result.message ||
      "Exchange failed."
    );

    return;

  }


  closeModal();

  alert(
    "Exchange completed."
  );

}


/* =========================================================
   BUY COINS
   ========================================================= */

function openBuyCoins() {

  requireAccount(
    "coins",
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

            <h2>Buy Coins</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ×
            </button>

          </div>


          <p class="muted">
            1 coin = 0.50 ETB
          </p>


          <div class="coin-grid">

            ${packages.map(coins => `

              <button
                class="coin-card"
                onclick="purchaseCoins(${coins})"
              >

                <div class="coin-icon">
                  🪙
                </div>

                <div class="coin-amount">
                  ${coins.toLocaleString()}
                </div>

                <div class="coin-price">
                  ${formatETB(coins * .5)}
                </div>

              </button>

            `).join("")}

          </div>

        </div>

      `);

    }
  );

}


/* =========================================================
   PURCHASE COINS
   ========================================================= */

async function purchaseCoins(coins) {

  if (!currentUser) {

    openAuth("login");

    return;

  }


  const result =
    await callFunction(
      "buy-coins",
      {
        coins
      }
    );


  if (!result.ok) {

    alert(
      result.message ||
      "Coin purchase could not start."
    );

    return;

  }


  /*
    Your Edge Function should return
    the real Telebirr/M-PESA payment URL.
  */

  if (result.data?.payment_url) {

    window.location.href =
      result.data.payment_url;

    return;

  }


  alert(
    "Payment request created."
  );

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

            <h2>Withdraw</h2>

            <button
              class="close-btn"
              onclick="closeModal()"
            >
              ×
            </button>

          </div>


          <div class="balance-card">

            <small>
              Minimum withdrawal
            </small>

            <div class="balance-value">
              10 ETB
            </div>

          </div>


          <div
            class="form-group"
            style="margin-top:15px"
          >

            <label>
              Amount
            </label>

            <input
              id="withdrawAmount"
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
              Account / phone
            </label>

            <input
              id="withdrawAccount"
              placeholder="Payment account"
            >

          </div>


          <button
            class="primary-btn"
            onclick="submitWithdraw()"
          >
            Withdraw
          </button>

        </div>

      `);

    }
  );

}


/* =========================================================
   SUBMIT WITHDRAW
   ========================================================= */

async function submitWithdraw() {

  const amount =
    Number(
      document.getElementById(
        "withdrawAmount"
      ).value
    );


  const method =
    document.getElementById(
      "withdrawMethod"
    ).value;


  const account =
    document.getElementById(
      "withdrawAccount"
    ).value.trim();


  if (amount < 10) {

    alert(
      "Minimum withdrawal is 10 ETB."
    );

    return;

  }


  if (!account) {

    alert(
      "Enter your payment account."
    );

    return;

  }


  const result =
    await callFunction(
      "withdraw",
      {
        amount,
        method,
        account
      }
    );


  if (!result.ok) {

    alert(
      result.message ||
      "Withdrawal failed."
    );

    return;

  }


  closeModal();

  alert(
    "Withdrawal request submitted."
  );

}


/* =========================================================
   INBOX
   ========================================================= */

async function renderInbox() {

  main.innerHTML = `

    <section class="page">

      <h2 class="section-title">
        Inbox
      </h2>


      <div class="inbox-card">

        <div class="inbox-icon">
          ✉
        </div>

        <div>

          <strong>
            MENA Inbox
          </strong>

          <p class="muted">
            Your messages will appear here.
          </p>

        </div>

      </div>


      <div class="empty">

        <div class="empty-icon">
          💬
        </div>

        <h3>
          No conversations yet
        </h3>

        <p class="muted">
          Real conversations will appear here.
        </p>

      </div>

    </section>

  `;

}


/* =========================================================
   SEARCH
   ========================================================= */

function openSearch() {

  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <h2>Search MENA</h2>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ×
        </button>

      </div>


      <div class="search-box">

        <span>🔎</span>

        <input
          id="globalSearch"
          placeholder="Search..."
          autofocus
        >

      </div>


      <div id="searchResults">

        <div class="empty">
          Start typing to search.
        </div>

      </div>

    </div>

  `);


  const input =
    document.getElementById(
      "globalSearch"
    );


  input.addEventListener(
    "input",
    async () => {

      const value =
        input.value.trim();


      if (!value) {

        document.getElementById(
          "searchResults"
        ).innerHTML =
          `
          <div class="empty">
            Start typing to search.
          </div>
          `;

        return;

      }


      await performSearch(value);

    }
  );

}


/* =========================================================
   SEARCH DATA
   ========================================================= */

async function performSearch(text) {

  const box =
    document.getElementById(
      "searchResults"
    );


  box.innerHTML = `
    <div class="empty">
      Searching...
    </div>
  `;


  const safe =
    text.replace(/[%_]/g, "");


  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id,username,display_name,avatar_url"
      )
      .or(
        `username.ilike.%${safe}%,display_name.ilike.%${safe}%`
      )
      .limit(20);


  if (error) {

    box.innerHTML = `
      <div class="empty">
        Search unavailable.
      </div>
    `;

    return;

  }


  if (!data?.length) {

    box.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🔎</div>
        <h3>No users found</h3>
      </div>
    `;

    return;

  }


  box.innerHTML =
    data.map(user => `

      <div
        class="inbox-card"
        style="cursor:pointer"
        onclick="openUser('${escapeAttr(user.id)}')"
      >

        ${
          user.avatar_url
          ?
          `<img
             class="avatar"
             src="${escapeAttr(user.avatar_url)}"
           >`
          :
          `<div class="avatar"></div>`
        }

        <div>

          <strong>
            ${escapeHTML(
              user.display_name ||
              user.username ||
              "MENA user"
            )}
          </strong>

          <p class="muted">
            @${escapeHTML(
              user.username || ""
            )}
          </p>

        </div>

      </div>

    `).join("");

}


/* =========================================================
   USER PROFILE
   ========================================================= */

async function openUser(id) {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();


  if (error || !data) {

    alert(
      "Profile not found."
    );

    return;

  }


  const avatar =
    data.avatar_url || "";


  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <strong>
          Profile
        </strong>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ×
        </button>

      </div>


      <div class="profile-cover">

        <div class="profile-main">

          ${
            avatar
            ?
            `<img
               class="profile-avatar"
               src="${escapeAttr(avatar)}"
             >`
            :
            `<div class="profile-avatar"></div>`
          }


          <div>

            <div class="profile-name">
              ${escapeHTML(
                data.display_name ||
                data.username ||
                "MENA user"
              )}
            </div>

            <div class="profile-handle">
              @${escapeHTML(
                data.username || ""
              )}
            </div>

          </div>

        </div>

      </div>

    </div>

  `);

}


/* =========================================================
   LIKE
   ========================================================= */

async function likePost(postId) {

  /*
    Browsing remains free.

    If a guest tries a real database mutation,
    Supabase will require the appropriate authenticated
    policy instead of creating fake likes.
  */

  if (!currentUser) {

    alert(
      "Create an account to like this post."
    );

    return;

  }


  const {
    error
  } =
    await supabaseClient
      .from("post_likes")
      .insert({
        post_id: postId,
        user_id: currentUser.id
      });


  if (error) {

    alert(
      error.message
    );

    return;

  }


  await renderHome();

}


/* =========================================================
   COMMENT
   ========================================================= */

async function commentPost(postId) {

  if (!currentUser) {

    alert(
      "Create an account to comment."
    );

    return;

  }


  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <h2>Comment</h2>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ×
        </button>

      </div>


      <div class="form-group">

        <textarea
          id="commentText"
          placeholder="Write your comment..."
        ></textarea>

      </div>


      <button
        class="primary-btn"
        onclick="submitComment('${escapeAttr(postId)}')"
      >
        Comment
      </button>

    </div>

  `);

}


async function submitComment(postId) {

  const text =
    document.getElementById(
      "commentText"
    ).value.trim();


  if (!text) return;


  const {
    error
  } =
    await supabaseClient
      .from("comments")
      .insert({
        post_id: postId,
        user_id: currentUser.id,
        content: text
      });


  if (error) {

    alert(error.message);

    return;

  }


  closeModal();

}


/* =========================================================
   FOLLOW
   ========================================================= */

async function followUser(userId) {

  if (!currentUser) {

    alert(
      "Create an account to follow users."
    );

    return;

  }


  if (!userId) return;


  const {
    error
  } =
    await supabaseClient
      .from("follows")
      .insert({
        follower_id: currentUser.id,
        following_id: userId
      });


  if (error) {

    alert(error.message);

    return;

  }


  alert("Followed.");

}


/* =========================================================
   SHARE
   ========================================================= */

async function sharePost(postId) {

  const url =
    `${location.origin}${location.pathname}?post=${encodeURIComponent(postId)}`;


  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title: "MENA",
        text: "Check this post on MENA",
        url
      });

    } catch (_) {}

  } else {

    await navigator.clipboard.writeText(url);

    alert(
      "Post link copied."
    );

  }

}


/* =========================================================
   BUY PRODUCT
   ========================================================= */

async function buyProduct(id) {

  const product =
    marketplaceItems.find(
      item => String(item.id) === String(id)
    );


  if (!product) return;


  if (!currentUser) {

    /*
      Product browsing remains guest-first.
      Real order creation requires an authenticated
      user so the order can belong to a real account.
    */

    alert(
      "Create an account to complete a purchase."
    );

    return;

  }


  const result =
    await callFunction(
      "create-market-order",
      {
        listing_id: product.id,
        delivery_fee_etb: 80
      }
    );


  if (!result.ok) {

    alert(
      result.message ||
      "Order could not be created."
    );

    return;

  }


  alert(
    "Order created."
  );

}


/* =========================================================
   SETTINGS
   ========================================================= */

function openSettings() {

  openModal(`

    <div class="modal-box">

      <div class="modal-head">

        <h2>Settings</h2>

        <button
          class="close-btn"
          onclick="closeModal()"
        >
          ×
        </button>

      </div>


      <div class="action-grid">

        <button
          class="action-card"
          onclick="alert('Profile settings will use your real Supabase profile.')"
        >
          <strong>Profile</strong>
          <small>
            Name, username and photo
          </small>
        </button>


        <button
          class="action-card"
          onclick="alert('MENA uses your Supabase account security.')"
        >
          <strong>Security</strong>
          <small>
            Account and authentication
          </small>
        </button>

      </div>

    </div>

  `);

}


/* =========================================================
   AUTH
   ========================================================= */

function requireAccount(
  reason,
  callback
) {

  if (currentUser) {

    if (callback)
      callback();

    return;

  }


  openAuth(
    "signup",
    reason,
    callback
  );

}


/* =========================================================
   AUTH MODAL
   ========================================================= */

function openAuth(
  mode = "login",
  reason = "",
  callback = null
) {

  const title =
    mode === "signup"
      ? "Create your MENA account"
      : "Login to MENA";


  const reasonText =
    reason === "post"
      ? "An account is required to post."
      :
    reason === "withdraw"
      ? "An account is required to withdraw."
      :
    reason === "coins"
      ? "An account is required to buy coins."
      :
      "Join MENA to continue.";


  openModal(`

    <div class="modal-box">

      <div class="auth-logo">
        M
      </div>


      <div class="auth-title">
        ${title}
      </div>


      <div class="auth-text">
        ${reasonText}
      </div>


      <div class="form-group">

        <label>
          Email
        </label>

        <input
          id="authEmail"
          type="email"
          placeholder="you@example.com"
        >

      </div>


      <div class="form-group">

        <label>
          Password
        </label>

        <input
          id="authPassword"
          type="password"
          placeholder="Password"
        >

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
            placeholder="username"
          >

        </div>
        `
        :
        ""
      }


      <button
        class="primary-btn"
        id="authSubmit"
      >
        ${
          mode === "signup"
            ? "Create account"
            : "Login"
        }
      </button>


      <div class="auth-switch">

        ${
          mode === "signup"
          ?
          `
          Already have an account?
          <button onclick="openAuth('login','${escapeAttr(reason)}')">
            Login
          </button>
          `
          :
          `
          Don't have an account?
          <button onclick="openAuth('signup','${escapeAttr(reason)}')">
            Sign up
          </button>
          `
        }

      </div>

    </div>

  `);


  document
    .getElementById("authSubmit")
    .onclick = async () => {

      if (mode === "signup") {

        await signup();

      } else {

        await login();

      }

    };

}


/* =========================================================
   SIGNUP
   ========================================================= */

async function signup() {

  const email =
    document.getElementById(
      "authEmail"
    ).value.trim();


  const password =
    document.getElementById(
      "authPassword"
    ).value;


  const username =
    document.getElementById(
      "authUsername"
    )?.value.trim();


  if (!email || !password) {

    alert(
      "Enter email and password."
    );

    return;

  }


  if (
    password.length < 6
  ) {

    alert(
      "Password must be at least 6 characters."
    );

    return;

  }


  const {
    data,
    error
  } =
    await supabaseClient.auth.signUp({

      email,

      password,

      options: {

        data: {
          username:
            username || null
        }

      }

    });


  if (error) {

    alert(error.message);

    return;

  }


  if (data.session) {

    closeModal();

    await loadSession();

    await showPage(currentPage);

  } else {

    alert(
      "Account created. Check your email if confirmation is enabled."
    );

  }

}


/* =========================================================
   LOGIN
   ========================================================= */

async function login() {

  const email =
    document.getElementById(
      "authEmail"
    ).value.trim();


  const password =
    document.getElementById(
      "authPassword"
    ).value;


  const {
    data,
    error
  } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });


  if (error) {

    alert(error.message);

    return;

  }


  currentUser =
    data.user;


  await loadProfile();

  closeModal();

  await showPage(currentPage);

}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

  await supabaseClient.auth.signOut();

  currentUser = null;

  currentProfile = null;

  await showPage("home");

}


/* =========================================================
   EDGE FUNCTION CALLER
   ========================================================= */

async function callFunction(
  functionName,
  payload
) {

  try {

    const {
      data: {
        session
      }
    } =
      await supabaseClient.auth.getSession();


    if (!session) {

      return {
        ok: false,
        message: "Please login first."
      };

    }


    const response =
      await fetch(
        `${SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${session.access_token}`
          },

          body:
            JSON.stringify(payload)
        }
      );


    const data =
      await response.json()
        .catch(() => ({}));


    if (!response.ok) {

      return {
        ok: false,
        message:
          data.message ||
          data.error ||
          `Request failed (${response.status})`
      };

    }


    return {
      ok: true,
      data
    };

  } catch (error) {

    console.error(error);

    return {
      ok: false,
      message:
        error.message ||
        "Network error."
    };

  }

}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(html) {

  modal.innerHTML =
    html;

  modal.classList.remove(
    "hidden"
  );

}


function closeModal() {

  modal.classList.add(
    "hidden"
  );

  modal.innerHTML =
    "";

}


modal.addEventListener(
  "click",
  event => {

    if (
      event.target === modal
    ) {

      closeModal();

    }

  }
);


/* =========================================================
   HELPERS
   ========================================================= */

function formatETB(value) {

  return `${Number(value || 0).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )} ETB`;

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function escapeAttr(value) {

  return escapeHTML(value);

}
