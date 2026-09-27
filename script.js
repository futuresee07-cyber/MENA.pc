/* =========================================================
   MENA
   Social + Marketplace + Wallet
   Supabase connected
   ========================================================= */

const SUPABASE_URL =
  "https://ryywkqyeoftuejczeqgg.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_E6S3EtoGbEqA_XkRpJhYpA_g8SvjMeH";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const app = document.getElementById("app");
const modal = document.getElementById("modal");
const mediaInput = document.getElementById("mediaInput");
const avatarInput = document.getElementById("avatarInput");

let currentUser = null;
let currentProfile = null;
let page = "home";
let pendingAction = null;

const COIN_VALUE = 0.5;
const MIN_WITHDRAW = 10;

const COIN_PACKAGES = [
  5,10,25,50,100,200,500,1000,
  1500,2000,5000,10000,25000,
  50000,100000
];

const DELIVERY_FEE = 80;

const $ = id => document.getElementById(id);

function esc(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function money(value){
  return Number(value || 0).toFixed(2);
}

function notify(message){
  modal.innerHTML = `
    <div class="modal-box">
      <button class="close" onclick="closeModal()">×</button>
      <div class="modal-title">MENA</div>
      <div class="success">${esc(message)}</div>
    </div>
  `;
  modal.classList.remove("hidden");
}

function closeModal(){
  modal.classList.add("hidden");
  modal.innerHTML = "";
}

function needLogin(action){
  pendingAction = action || null;

  modal.innerHTML = `
    <div class="modal-box">
      <button class="close" onclick="closeModal()">×</button>
      <div class="modal-title">Login to MENA</div>

      <p class="muted">
        Create an account or login to continue.
      </p>

      <div id="authError"></div>

      <label>
        Email
        <input id="authEmail"
               class="input"
               type="email"
               placeholder="you@example.com">
      </label>

      <label>
        Password
        <input id="authPassword"
               class="input"
               type="password"
               placeholder="Password">
      </label>

      <div class="modal-actions">
        <button class="primary"
                onclick="loginUser()">
          Login
        </button>

        <button class="secondary"
                onclick="signupUser()">
          Sign Up
        </button>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
}

async function loginUser(){

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;

  if(!email || !password){
    $("authError").innerHTML =
      `<div class="warning">Enter email and password.</div>`;
    return;
  }

  const {data,error} =
    await sb.auth.signInWithPassword({
      email,
      password
    });

  if(error){
    $("authError").innerHTML =
      `<div class="warning">${esc(error.message)}</div>`;
    return;
  }

  currentUser = data.user;

  await loadProfile();

  closeModal();

  if(pendingAction){
    const action = pendingAction;
    pendingAction = null;
    await action();
  }else{
    render();
  }
}

async function signupUser(){

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;

  if(!email || password.length < 6){
    $("authError").innerHTML =
      `<div class="warning">
        Enter an email and a password with at least 6 characters.
      </div>`;
    return;
  }

  const {data,error} =
    await sb.auth.signUp({
      email,
      password
    });

  if(error){
    $("authError").innerHTML =
      `<div class="warning">${esc(error.message)}</div>`;
    return;
  }

  if(data.session){
    currentUser = data.user;
    await ensureProfile();
    closeModal();
    render();
  }else{
    $("authError").innerHTML =
      `<div class="success">
        Account created. Check your email if confirmation is required.
      </div>`;
  }
}

async function logout(){

  await sb.auth.signOut();

  currentUser = null;
  currentProfile = null;
  page = "home";

  render();
}

async function loadProfile(){

  if(!currentUser) return null;

  const {data,error} =
    await sb
      .from("profiles")
      .select("*")
      .eq("id",currentUser.id)
      .maybeSingle();

  if(!error && data){
    currentProfile = data;
    return data;
  }

  return ensureProfile();
}

async function ensureProfile(){

  if(!currentUser) return null;

  const existing = await loadProfile();

  if(existing) return existing;

  const username =
    "user_" +
    currentUser.id.slice(0,8);

  const {data,error} =
    await sb
      .from("profiles")
      .insert({
        id:currentUser.id,
        username,
        full_name:"",
        avatar_url:""
      })
      .select()
      .single();

  if(!error){
    currentProfile = data;
  }

  return data;
}

/* ---------------------------------------------------------
   NAVIGATION
--------------------------------------------------------- */

function nav(){

  document
    .querySelectorAll("[data-page]")
    .forEach(button => {

      button.onclick = () => {

        const target = button.dataset.page;

        if(
          ["inbox","profile"].includes(target)
          && !currentUser
        ){
          needLogin(() => {
            page = target;
            render();
          });
          return;
        }

        page = target;
        render();
      };
    });
}

/* ---------------------------------------------------------
   HOME
--------------------------------------------------------- */

async function home(){

  app.innerHTML = `
    <div class="page">
      <div class="hero">
        <div class="title">For You</div>
        <div class="muted">
          Discover real MENA posts
        </div>
      </div>

      <div id="feed" class="feed">
        <div class="card empty">Loading...</div>
      </div>
    </div>
  `;

  const {data,error} =
    await sb
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
      .order("created_at",{ascending:false})
      .limit(60);

  const feed = $("feed");

  if(error){
    feed.innerHTML = `
      <div class="card empty">
        Could not load posts.
      </div>
    `;
    return;
  }

  if(!data || !data.length){
    feed.innerHTML = `
      <div class="card empty">
        No public posts yet.<br><br>
        Create the first MENA post.
      </div>
    `;
    return;
  }

  feed.innerHTML =
    data.map(postCard).join("");
}

function postCard(post){

  const profile = post.profiles || {};

  const avatar =
    profile.avatar_url
      ? `<img class="avatar"
              src="${esc(profile.avatar_url)}">`
      : `<div class="avatar">
          ${(profile.full_name || profile.username || "M")[0]
            .toUpperCase()}
         </div>`;

  let media = "";

  if(post.media_url){

    if(post.media_type === "video"){
      media = `
        <video
          class="media"
          src="${esc(post.media_url)}"
          controls
          playsinline
          preload="metadata">
        </video>
      `;
    }else{
      media = `
        <img
          class="media"
          src="${esc(post.media_url)}"
          loading="lazy">
      `;
    }
  }

  return `
    <article class="post">

      <div class="post-head">
        ${avatar}

        <div>
          <div class="user-name">
            ${esc(profile.full_name || profile.username || "MENA user")}
          </div>

          <div class="user-handle">
            @${esc(profile.username || "user")}
          </div>
        </div>

        ${
          currentUser &&
          profile.id &&
          profile.id !== currentUser.id
          ? `
          <button class="follow-btn"
            onclick="followUser('${profile.id}')">
            Follow
          </button>
          `
          : ""
        }
      </div>

      ${media}

      ${
        post.content
        ? `<div class="post-text">${esc(post.content)}</div>`
        : ""
      }

      <div class="post-actions">

        <button class="action"
          onclick="likePost('${post.id}')">
          <span>♡</span> Like
        </button>

        <button class="action"
          onclick="commentPost('${post.id}')">
          <span>💬</span> Comment
        </button>

        <button class="action"
          onclick="sharePost('${post.id}')">
          <span>↗</span> Share
        </button>

      </div>

    </article>
  `;
}

/* ---------------------------------------------------------
   LIKE
--------------------------------------------------------- */

async function likePost(postId){

  if(!currentUser){
    needLogin(() => likePost(postId));
    return;
  }

  const {data:existing} =
    await sb
      .from("post_likes")
      .select("id")
      .eq("post_id",postId)
      .eq("user_id",currentUser.id)
      .maybeSingle();

  if(existing){
    await sb
      .from("post_likes")
      .delete()
      .eq("id",existing.id);
  }else{
    await sb
      .from("post_likes")
      .insert({
        post_id:postId,
        user_id:currentUser.id
      });
  }

  render();
}

/* ---------------------------------------------------------
   COMMENT
--------------------------------------------------------- */

function commentPost(postId){

  if(!currentUser){
    needLogin(() => commentPost(postId));
    return;
  }

  modal.innerHTML = `
    <div class="modal-box">
      <button class="close" onclick="closeModal()">×</button>

      <div class="modal-title">
        Comment
      </div>

      <textarea
        id="commentText"
        class="input"
        placeholder="Write a comment..."></textarea>

      <br><br>

      <button
        class="primary"
        onclick="sendComment('${postId}')">
        Post Comment
      </button>
    </div>
  `;

  modal.classList.remove("hidden");
}

async function sendComment(postId){

  const text =
    $("commentText").value.trim();

  if(!text) return;

  const {error} =
    await sb
      .from("comments")
      .insert({
        post_id:postId,
        user_id:currentUser.id,
        content:text
      });

  if(error){
    notify(error.message);
    return;
  }

  closeModal();
}

/* ---------------------------------------------------------
   SHARE
--------------------------------------------------------- */

async function sharePost(postId){

  const url =
    location.origin +
    location.pathname +
    "?post=" +
    encodeURIComponent(postId);

  if(navigator.share){

    try{
      await navigator.share({
        title:"MENA",
        text:"Check this MENA post",
        url
      });
    }catch{}
  }else{

    await navigator.clipboard.writeText(url);

    notify("Post link copied.");
  }
}

/* ---------------------------------------------------------
   FOLLOW
--------------------------------------------------------- */

async function followUser(userId){

  if(!currentUser){
    needLogin(() => followUser(userId));
    return;
  }

  const {data:existing} =
    await sb
      .from("follows")
      .select("id")
      .eq("follower_id",currentUser.id)
      .eq("following_id",userId)
      .maybeSingle();

  if(existing){

    await sb
      .from("follows")
      .delete()
      .eq("id",existing.id);

  }else{

    await sb
      .from("follows")
      .insert({
        follower_id:currentUser.id,
        following_id:userId
      });
  }

  notify(existing ? "Unfollowed." : "Following.");
}

/* ---------------------------------------------------------
   FRIENDS
--------------------------------------------------------- */

async function friends(){

  app.innerHTML = `
    <div class="page">

      <div class="hero">
        <div class="title">Friends</div>
        <div class="muted">
          People you follow and discover
        </div>
      </div>

      <div class="card">
        <button class="primary"
          onclick="openSearch()">
          Search people
        </button>
      </div>

      <div id="friendList"></div>

    </div>
  `;

  const {data} =
    await sb
      .from("profiles")
      .select("id,username,full_name,avatar_url")
      .limit(50);

  const list = $("friendList");

  if(!data || !data.length){
    list.innerHTML =
      `<div class="card empty">No users found.</div>`;
    return;
  }

  list.innerHTML = data
    .filter(x => x.id !== currentUser?.id)
    .map(user => `
      <div class="card">

        <div class="post-head">

          ${
            user.avatar_url
            ? `<img class="avatar"
                    src="${esc(user.avatar_url)}">`
            : `<div class="avatar">
                ${(user.full_name || user.username || "U")[0]}
               </div>`
          }

          <div>
            <div class="user-name">
              ${esc(user.full_name || user.username)}
            </div>
            <div class="user-handle">
              @${esc(user.username)}
            </div>
          </div>

          <button
            class="follow-btn"
            onclick="followUser('${user.id}')">
            Follow
          </button>

        </div>

      </div>
    `)
    .join("");
}

/* ---------------------------------------------------------
   PROFILE
--------------------------------------------------------- */

async function profilePage(){

  if(!currentUser){
    needLogin(() => {
      page = "profile";
      render();
    });
    return;
  }

  await loadProfile();

  const profile = currentProfile || {};

  app.innerHTML = `
    <div class="page">

      <div class="profile-head">

        ${
          profile.avatar_url
          ? `<img
              class="profile-avatar"
              src="${esc(profile.avatar_url)}">`
          : `<div class="profile-avatar">
              ${(profile.full_name || profile.username || "M")[0]}
             </div>`
        }

        <div class="profile-name">
          ${esc(profile.full_name || profile.username || "MENA user")}
        </div>

        <div class="profile-email">
          @${esc(profile.username || "user")}
        </div>

        <div class="profile-stats">

          <div class="stat">
            <strong>—</strong>
            <small>Followers</small>
          </div>

          <div class="stat">
            <strong>—</strong>
            <small>Following</small>
          </div>

          <div class="stat">
            <strong>—</strong>
            <small>Likes</small>
          </div>

        </div>

        <br>

        <button
          class="secondary"
          onclick="editProfile()">
          Edit Profile
        </button>

      </div>

      <div class="section-title">
        MENA
      </div>

      <div class="grid">

        <button class="menu-card"
          onclick="market()">
          <span class="emoji">🛍️</span>
          <strong>My Market</strong>
          <small>Sell & Free Work</small>
        </button>

        <button class="menu-card"
          onclick="wallet()">
          <span class="emoji">💰</span>
          <strong>Wallet</strong>
          <small>Balance & exchange</small>
        </button>

        <button class="menu-card"
          onclick="buyCoins()">
          <span class="emoji">🪙</span>
          <strong>Buy Coins</strong>
          <small>1 coin = 0.50 ETB</small>
        </button>

        <button class="menu-card"
          onclick="withdraw()">
          <span class="emoji">🏦</span>
          <strong>Withdraw</strong>
          <small>Minimum 10 ETB</small>
        </button>

        <button class="menu-card"
          onclick="goLive()">
          <span class="emoji">🔴</span>
          <strong>Go Live</strong>
          <small>Live streaming</small>
        </button>

        <button class="menu-card"
          onclick="settings()">
          <span class="emoji">⚙️</span>
          <strong>Settings</strong>
          <small>Account settings</small>
        </button>

      </div>

      <br>

      <button class="danger"
        onclick="logout()">
        Logout
      </button>

    </div>
  `;
}

/* ---------------------------------------------------------
   EDIT PROFILE
--------------------------------------------------------- */

function editProfile(){

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Edit Profile
      </div>

      <label>
        Full name
        <input id="fullName"
          class="input"
          value="${esc(currentProfile?.full_name || "")}">
      </label>

      <label>
        Username
        <input id="username"
          class="input"
          value="${esc(currentProfile?.username || "")}">
      </label>

      <button
        class="secondary"
        onclick="chooseAvatar()">
        Change Profile Photo
      </button>

      <br><br>

      <button
        class="primary"
        onclick="saveProfile()">
        Save
      </button>

    </div>
  `;

  modal.classList.remove("hidden");
}

async function saveProfile(){

  const full_name =
    $("fullName").value.trim();

  const username =
    $("username").value.trim();

  const {data,error} =
    await sb
      .from("profiles")
      .update({
        full_name,
        username
      })
      .eq("id",currentUser.id)
      .select()
      .single();

  if(error){
    notify(error.message);
    return;
  }

  currentProfile = data;

  closeModal();
  render();
}

function chooseAvatar(){
  avatarInput.click();
}

avatarInput.addEventListener("change", async () => {

  const file = avatarInput.files?.[0];

  if(!file || !currentUser) return;

  const path =
    `${currentUser.id}/avatar-${Date.now()}.${file.name.split(".").pop()}`;

  const upload =
    await sb.storage
      .from("media")
      .upload(path,file,{upsert:true});

  if(upload.error){
    notify(upload.error.message);
    return;
  }

  const {data} =
    sb.storage
      .from("media")
      .getPublicUrl(path);

  await sb
    .from("profiles")
    .update({
      avatar_url:data.publicUrl
    })
    .eq("id",currentUser.id);

  await loadProfile();

  editProfile();
});

/* ---------------------------------------------------------
   CREATE POST
--------------------------------------------------------- */

function createPost(){

  if(!currentUser){
    needLogin(createPost);
    return;
  }

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Create Post
      </div>

      <textarea
        id="postContent"
        class="input"
        placeholder="What's happening?"></textarea>

      <br><br>

      <button
        class="secondary"
        onclick="mediaInput.click()">
        📷 Camera / Gallery
      </button>

      <div id="selectedMedia"
        class="muted"></div>

      <br>

      <button
        class="primary"
        onclick="publishPost()">
        Publish
      </button>

    </div>
  `;

  modal.classList.remove("hidden");
}

mediaInput.addEventListener("change", () => {

  const file = mediaInput.files?.[0];

  if(file){
    $("selectedMedia").textContent =
      file.name;
  }
});

async function publishPost(){

  const content =
    $("postContent").value.trim();

  const file =
    mediaInput.files?.[0];

  if(!content && !file){
    notify("Add text or media.");
    return;
  }

  let media_url = null;
  let media_type = null;

  if(file){

    media_type =
      file.type.startsWith("video/")
      ? "video"
      : "image";

    const ext =
      file.name.split(".").pop();

    const path =
      `${currentUser.id}/posts/${crypto.randomUUID()}.${ext}`;

    const upload =
      await sb.storage
        .from("media")
        .upload(path,file);

    if(upload.error){
      notify(upload.error.message);
      return;
    }

    media_url =
      sb.storage
        .from("media")
        .getPublicUrl(path)
        .data
        .publicUrl;
  }

  const {error} =
    await sb
      .from("posts")
      .insert({
        user_id:currentUser.id,
        content,
        media_url,
        media_type
      });

  if(error){
    notify(error.message);
    return;
  }

  mediaInput.value = "";

  closeModal();

  page = "home";
  render();
}

/* ---------------------------------------------------------
   MARKETPLACE
--------------------------------------------------------- */

async function market(){

  page = "market";

  app.innerHTML = `
    <div class="page">

      <div class="hero">
        <div class="title">Marketplace</div>
        <div class="muted">
          Buy, sell and find work
        </div>
      </div>

      <div class="tabs">

        <button class="tab active"
          onclick="market()">
          Market
        </button>

        <button class="tab"
          onclick="sellPage()">
          Sell
        </button>

        <button class="tab"
          onclick="workPage()">
          Free Work
        </button>

      </div>

      <div id="marketList">
        <div class="card empty">Loading...</div>
      </div>

    </div>
  `;

  const {data,error} =
    await sb
      .from("marketplace_listings")
      .select("*")
      .eq("status","active")
      .order("created_at",{ascending:false})
      .limit(50);

  const list = $("marketList");

  if(error){
    list.innerHTML =
      `<div class="card empty">Marketplace unavailable.</div>`;
    return;
  }

  if(!data?.length){
    list.innerHTML =
      `<div class="card empty">
        No products available yet.
      </div>`;
    return;
  }

  list.innerHTML =
    data.map(item => `
      <div class="market-item">

        ${
          item.image_url
          ? `<img src="${esc(item.image_url)}">`
          : ""
        }

        <div class="market-info">

          <span class="badge">
            ${esc(item.category || "Product")}
          </span>

          <h3>${esc(item.title)}</h3>

          <div class="price">
            ${money(item.price_etb)} ETB
          </div>

          <div class="delivery">
            Delivery: ${DELIVERY_FEE} ETB
          </div>

          <br>

          <button
            class="primary"
            onclick="buyProduct('${item.id}')">
            Buy
          </button>

        </div>

      </div>
    `)
    .join("");
}

/* ---------------------------------------------------------
   SELL
--------------------------------------------------------- */

function sellPage(){

  if(!currentUser){
    needLogin(sellPage);
    return;
  }

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Sell Product
      </div>

      <div class="warning">
        Enter the exact amount you want to receive.
        MENA adds its 5% seller fee into the buyer price.
      </div>

      <label>
        Product title
        <input id="sellTitle"
          class="input"
          placeholder="Product name">
      </label>

      <label>
        Amount you want to receive
        <input id="sellReceive"
          class="input"
          type="number"
          min="1"
          placeholder="950">
      </label>

      <label>
        Category
        <input id="sellCategory"
          class="input"
          placeholder="Electronics, clothing...">
      </label>

      <label>
        Description
        <textarea id="sellDescription"
          class="input"
          placeholder="Product details"></textarea>
      </label>

      <label>
        Image URL
        <input id="sellImage"
          class="input"
          placeholder="Optional">
      </label>

      <div id="sellCalculation"></div>

      <button
        class="primary"
        onclick="calculateSell()">
        Calculate Price
      </button>

      <br><br>

      <button
        class="secondary"
        onclick="createListing()">
        Publish Product
      </button>

    </div>
  `;

  modal.classList.remove("hidden");
}

function calculateSell(){

  const receive =
    Number($("sellReceive").value);

  if(!receive || receive <= 0){
    return;
  }

  const buyerPrice =
    receive / 0.95;

  const fee =
    buyerPrice - receive;

  $("sellCalculation").innerHTML = `
    <div class="success">

      Buyer product price:
      <strong>${money(buyerPrice)} ETB</strong>
      <br>

      MENA 5% fee:
      ${money(fee)} ETB
      <br>

      You receive:
      <strong>${money(receive)} ETB</strong>
      <br><br>

      Buyer delivery:
      ${DELIVERY_FEE} ETB separately.

    </div>
  `;
}

async function createListing(){

  const title =
    $("sellTitle").value.trim();

  const receive =
    Number($("sellReceive").value);

  const category =
    $("sellCategory").value.trim();

  const description =
    $("sellDescription").value.trim();

  const image_url =
    $("sellImage").value.trim();

  if(!title || !receive || receive <= 0){
    notify("Enter product title and amount.");
    return;
  }

  /*
    IMPORTANT:
    The final seller price should be calculated
    and inserted by a secure backend function.
  */

  const buyerPrice =
    receive / 0.95;

  const {error} =
    await sb.functions.invoke(
      "create-market-listing",
      {
        body:{
          title,
          seller_receive_etb:receive,
          price_etb:buyerPrice,
          category,
          description,
          image_url
        }
      }
    );

  if(error){
    notify(
      "Secure marketplace backend is not connected yet."
    );
    return;
  }

  closeModal();

  notify("Product published.");
}

/* ---------------------------------------------------------
   BUY
--------------------------------------------------------- */

async function buyProduct(id){

  if(!currentUser){
    needLogin(() => buyProduct(id));
    return;
  }

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Confirm Purchase
      </div>

      <div class="warning">
        Delivery is charged separately:
        <strong>${DELIVERY_FEE} ETB</strong>
      </div>

      <button
        class="primary"
        onclick="confirmPurchase('${id}')">
        Confirm Purchase
      </button>

    </div>
  `;

  modal.classList.remove("hidden");
}

async function confirmPurchase(id){

  const {error} =
    await sb.functions.invoke(
      "create-market-order",
      {
        body:{
          listing_id:id,
          delivery_fee_etb:DELIVERY_FEE
        }
      }
    );

  if(error){
    notify(
      "Secure purchase backend is not connected yet."
    );
    return;
  }

  closeModal();
  notify("Order created.");
}

/* ---------------------------------------------------------
   FREE WORK
--------------------------------------------------------- */

function workPage(){

  if(!currentUser){
    needLogin(workPage);
    return;
  }

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Free Work
      </div>

      <div class="warning">
        Posting fee: <strong>50 ETB</strong><br>
        Active for 30 days.
      </div>

      <label>
        Work title
        <input id="workTitle"
          class="input"
          placeholder="What work do you offer?">
      </label>

      <label>
        Description
        <textarea id="workDescription"
          class="input"
          placeholder="Describe your service"></textarea>
      </label>

      <button
        class="primary"
        onclick="createWork()">
        Post Free Work — 50 ETB
      </button>

    </div>
  `;

  modal.classList.remove("hidden");
}

async function createWork(){

  const title =
    $("workTitle").value.trim();

  const description =
    $("workDescription").value.trim();

  if(!title){
    notify("Enter a work title.");
    return;
  }

  const {error} =
    await sb.functions.invoke(
      "create-free-work",
      {
        body:{
          title,
          description,
          posting_fee_etb:50
        }
      }
    );

  if(error){
    notify(
      "Free Work backend is not connected yet."
    );
    return;
  }

  closeModal();
  notify("Free Work posted.");
}

/* ---------------------------------------------------------
   WALLET
--------------------------------------------------------- */

async function wallet(){

  if(!currentUser){
    needLogin(wallet);
    return;
  }

  app.innerHTML = `
    <div class="page">

      <div class="hero">
        <div class="title">Wallet</div>
        <div class="muted">
          Your MENA balance
        </div>
      </div>

      <div class="card">
        <div class="muted">ETB Balance</div>
        <div id="etbBalance"
             class="amount">
          Loading...
        </div>
      </div>

      <div class="card">
        <div class="muted">Coin Balance</div>
        <div id="coinBalance"
             class="amount">
          Loading...
        </div>
      </div>

      <div class="grid">

        <button class="menu-card"
          onclick="exchangeCoins()">
          <span class="emoji">🔄</span>
          <strong>Exchange into coin</strong>
          <small>1 ETB = 2 coins</small>
        </button>

        <button class="menu-card"
          onclick="buyCoins()">
          <span class="emoji">🪙</span>
          <strong>Buy Coins</strong>
          <small>Coin packages</small>
        </button>

        <button class="menu-card"
          onclick="withdraw()">
          <span class="emoji">🏦</span>
          <strong>Withdraw</strong>
          <small>Minimum 10 ETB</small>
        </button>

      </div>

    </div>
  `;

  /*
    Wallet balance should be read from the
    authenticated user's wallet.
  */

  const {data,error} =
    await sb
      .from("wallets")
      .select("coin_balance,etb_balance")
      .eq("user_id",currentUser.id)
      .maybeSingle();

  if(error || !data){

    $("etbBalance").textContent = "0.00 ETB";
    $("coinBalance").textContent = "0 coins";

    return;
  }

  $("etbBalance").textContent =
    money(data.etb_balance) + " ETB";

  $("coinBalance").textContent =
    Number(data.coin_balance || 0).toLocaleString()
    + " coins";
}

/* ---------------------------------------------------------
   EXCHANGE
--------------------------------------------------------- */

function exchangeCoins(){

  if(!currentUser){
    needLogin(exchangeCoins);
    return;
  }

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Exchange into coin
      </div>

      <div class="warning">
        1 ETB = 2 coins.
      </div>

      <label>
        ETB amount
        <input id="exchangeAmount"
          class="input"
          type="number"
          min="1"
          placeholder="10">
      </label>

      <button
        class="primary"
        onclick="doExchange()">
        Exchange
      </button>

    </div>
  `;

  modal.classList.remove("hidden");
}

async function doExchange(){

  const amount =
    Number($("exchangeAmount").value);

  if(!amount || amount <= 0){
    notify("Enter an amount.");
    return;
  }

  const {error} =
    await sb.functions.invoke(
      "exchange-etb-to-coins",
      {
        body:{
          amount_etb:amount
        }
      }
    );

  if(error){
    notify(
      "Secure exchange backend is not connected yet."
    );
    return;
  }

  closeModal();
  wallet();
}

/* ---------------------------------------------------------
   BUY COINS
--------------------------------------------------------- */

function buyCoins(){

  if(!currentUser){
    needLogin(buyCoins);
    return;
  }

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Buy Coins
      </div>

      <div class="warning">
        1 coin = 0.50 ETB
      </div>

      ${COIN_PACKAGES.map(coins => {

        const price =
          coins * COIN_VALUE;

        return `
          <div class="coin-card">

            <div>
              <div class="coin-number">
                🪙 ${coins.toLocaleString()}
              </div>

              <div class="coin-price">
                ${money(price)} ETB
              </div>
            </div>

            <button
              class="buy-coin"
              onclick="purchaseCoins(${coins})">
              Buy
            </button>

          </div>
        `;

      }).join("")}

    </div>
  `;

  modal.classList.remove("hidden");
}

async function purchaseCoins(coins){

  const amount_etb =
    coins * COIN_VALUE;

  const {error} =
    await sb.functions.invoke(
      "buy-coins",
      {
        body:{
          coins,
          amount_etb
        }
      }
    );

  if(error){
    notify(
      "Coin payment backend is not connected yet."
    );
    return;
  }

  closeModal();

  notify(
    `${coins.toLocaleString()} coins purchase started.`
  );
}

/* ---------------------------------------------------------
   WITHDRAW
--------------------------------------------------------- */

function withdraw(){

  if(!currentUser){
    needLogin(withdraw);
    return;
  }

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Withdraw
      </div>

      <div class="warning">
        Minimum withdrawal:
        <strong>10 ETB</strong>
      </div>

      <label>
        Amount
        <input id="withdrawAmount"
          class="input"
          type="number"
          min="10"
          placeholder="10">
      </label>

      <label>
        Payment method
        <select id="withdrawMethod"
          class="input">

          <option value="telebirr">
            Telebirr
          </option>

          <option value="mpesa">
            M-PESA
          </option>

        </select>
      </label>

      <label>
        Account name
        <input id="withdrawName"
          class="input">
      </label>

      <label>
        Account number
        <input id="withdrawNumber"
          class="input">
      </label>

      <button
        class="primary"
        onclick="submitWithdrawal()">
        Request Withdrawal
      </button>

    </div>
  `;

  modal.classList.remove("hidden");
}

async function submitWithdrawal(){

  const amount =
    Number($("withdrawAmount").value);

  const method =
    $("withdrawMethod").value;

  const account_name =
    $("withdrawName").value.trim();

  const account_number =
    $("withdrawNumber").value.trim();

  if(amount < MIN_WITHDRAW){
    notify("Minimum withdrawal is 10 ETB.");
    return;
  }

  if(!account_name || !account_number){
    notify("Enter your payment account details.");
    return;
  }

  const {error} =
    await sb.functions.invoke(
      "withdraw",
      {
        body:{
          amount_etb:amount,
          method,
          account_name,
          account_number
        }
      }
    );

  if(error){
    notify(
      "Secure withdrawal backend is not connected yet."
    );
    return;
  }

  closeModal();

  notify("Withdrawal request submitted.");
}

/* ---------------------------------------------------------
   INBOX
--------------------------------------------------------- */

async function inbox(){

  if(!currentUser){
    needLogin(inbox);
    return;
  }

  app.innerHTML = `
    <div class="page">

      <div class="hero">
        <div class="title">Inbox</div>
        <div class="muted">
          Messages and notifications
        </div>
      </div>

      <div class="card">
        <div class="section-title">
          Messages
        </div>

        <div class="empty">
          Your real messages will appear here.
        </div>
      </div>

    </div>
  `;
}

/* ---------------------------------------------------------
   SEARCH
--------------------------------------------------------- */

function openSearch(){

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Search MENA
      </div>

      <div class="search-box">

        <input
          id="searchInput"
          class="input"
          placeholder="Search users or posts">

        <button
          class="primary"
          onclick="searchMena()">
          Search
        </button>

      </div>

      <div id="searchResults"></div>

    </div>
  `;

  modal.classList.remove("hidden");
}

async function searchMena(){

  const q =
    $("searchInput").value.trim();

  if(!q) return;

  const {data} =
    await sb
      .from("profiles")
      .select("id,username,full_name,avatar_url")
      .or(
        `username.ilike.%${q}%,full_name.ilike.%${q}%`
      )
      .limit(30);

  const result =
    $("searchResults");

  if(!data?.length){
    result.innerHTML =
      `<div class="empty">No users found.</div>`;
    return;
  }

  result.innerHTML =
    data.map(user => `
      <div class="result">

        <strong>
          ${esc(user.full_name || user.username)}
        </strong>

        <div class="muted">
          @${esc(user.username)}
        </div>

        ${
          currentUser &&
          user.id !== currentUser.id
          ? `
          <br>
          <button
            class="follow-btn"
            onclick="followUser('${user.id}')">
            Follow
          </button>
          `
          : ""
        }

      </div>
    `).join("");
}

/* ---------------------------------------------------------
   SETTINGS
--------------------------------------------------------- */

function settings(){

  if(!currentUser){
    needLogin(settings);
    return;
  }

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Settings
      </div>

      <button
        class="secondary"
        onclick="editProfile();">
        Edit Profile
      </button>

      <br><br>

      <button
        class="secondary"
        onclick="bindPayment()">
        Bind Telebirr / M-PESA
      </button>

      <br><br>

      <button
        class="danger"
        onclick="logout();closeModal();">
        Logout
      </button>

    </div>
  `;

  modal.classList.remove("hidden");
}

async function bindPayment(){

  if(!currentUser){
    needLogin(bindPayment);
    return;
  }

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Payment Account
      </div>

      <label>
        Method
        <select id="bindMethod" class="input">
          <option value="telebirr">Telebirr</option>
          <option value="mpesa">M-PESA</option>
        </select>
      </label>

      <label>
        Account name
        <input id="bindName" class="input">
      </label>

      <label>
        Account number
        <input id="bindNumber" class="input">
      </label>

      <button
        class="primary"
        onclick="savePaymentMethod()">
        Save
      </button>

    </div>
  `;

  modal.classList.remove("hidden");
}

async function savePaymentMethod(){

  const method =
    $("bindMethod").value;

  const account_name =
    $("bindName").value.trim();

  const account_number =
    $("bindNumber").value.trim();

  if(!account_name || !account_number){
    notify("Complete all fields.");
    return;
  }

  const {error} =
    await sb.functions.invoke(
      "bind-payment-method",
      {
        body:{
          method,
          account_name,
          account_number
        }
      }
    );

  if(error){
    notify(
      "Secure payment backend is not connected yet."
    );
    return;
  }

  closeModal();
  notify("Payment account saved.");
}

/* ---------------------------------------------------------
   GO LIVE
--------------------------------------------------------- */

function goLive(){

  if(!currentUser){
    needLogin(goLive);
    return;
  }

  modal.innerHTML = `
    <div class="modal-box">

      <button class="close"
        onclick="closeModal()">×</button>

      <div class="modal-title">
        Go Live
      </div>

      <div class="live-box">

        <div>
          <div style="font-size:45px">
            🔴
          </div>

          <h2>MENA Live</h2>

          <p class="muted">
            Camera, microphone, guests,
            comments, gifts and live chat
            require the live-stream backend.
          </p>

          <br>

          <button
            class="primary"
            onclick="startLiveBackend()">
            Start Live
          </button>
        </div>

      </div>

    </div>
  `;

  modal.classList.remove("hidden");
}

async function startLiveBackend(){

  const {error} =
    await sb.functions.invoke(
      "create-live-token",
      {
        body:{
          title:"MENA Live"
        }
      }
    );

  if(error){
    notify(
      "Live backend is not connected yet."
    );
    return;
  }

  notify("Live session created.");
}

/* ---------------------------------------------------------
   PAGE RENDER
--------------------------------------------------------- */

async function render(){

  nav();

  if(page === "home"){
    await home();
    return;
  }

  if(page === "friends"){
    await friends();
    return;
  }

  if(page === "inbox"){
    await inbox();
    return;
  }

  if(page === "profile"){
    await profilePage();
    return;
  }

  if(page === "market"){
    await market();
    return;
  }

  home();
}

/* ---------------------------------------------------------
   CREATE BUTTON
--------------------------------------------------------- */

document
  .getElementById("createBtn")
  .addEventListener("click",createPost);

document
  .getElementById("searchBtn")
  .addEventListener("click",openSearch);

document
  .getElementById("settingsBtn")
  .addEventListener("click",settings);

/* ---------------------------------------------------------
   START
--------------------------------------------------------- */

async function init(){

  nav();

  const {
    data:{session}
  } = await sb.auth.getSession();

  currentUser =
    session?.user || null;

  if(currentUser){
    await ensureProfile();
  }

  sb.auth.onAuthStateChange(
    async (_event,session) => {

      currentUser =
        session?.user || null;

      if(currentUser){
        await loadProfile();
      }else{
        currentProfile = null;
      }

      render();
    }
  );

  /*
    Guest-first:
    Home opens immediately.
  */

  render();
}

init();
