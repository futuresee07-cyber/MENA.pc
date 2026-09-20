const app = document.getElementById("app");
const modal = document.getElementById("modal");
const toastBox = document.getElementById("toast");

const STORAGE = "MENA_DATABASE_V2";

const gifts = [
  ["🌹","Rose",1],
  ["❤️","Heart",5],
  ["☕","Coffee",10],
  ["🍫","Chocolate",25],
  ["🌟","Star",50],
  ["🎁","Gift",100],
  ["💎","Diamond",250],
  ["👑","Crown",500],
  ["🚀","Rocket",750],
  ["💐","Bouquet",1000],
  ["🦋","Butterfly",1500],
  ["💚","Green Heart",2000],
  ["🎉","Party",3000],
  ["🏆","Trophy",4000],
  ["💰","Money",5000],
  ["💍","Ring",6000],
  ["🛍️","Shopping",7000],
  ["🌈","Rainbow",8000],
  ["🔥","Fire",9000],
  ["🐯","Tiger",10000],
  ["🦁","Lion",11000],
  ["🐉","Dragon",12000],
  ["⚡","Lightning",14000],
  ["🌍","World",16000],
  ["🪐","Planet",18000],
  ["💫","Galaxy",20000],
  ["🏰","Castle",22000],
  ["🪽","Wings",24000],
  ["💎","Royal Diamond",25000],
  ["👑","MENA Crown",27000]
];

let database = JSON.parse(
  localStorage.getItem(STORAGE) ||
  JSON.stringify({
    user:null,
    posts:[],
    streams:[],
    work:[],
    wallet:{
      telebirr:null,
      mpesa:null
    },
    coins:0,
    balance:0,
    notifications:[]
  })
);

let currentPage = "home";
let selectedMedia = "";
let cameraStream = null;

function save(){
  localStorage.setItem(STORAGE,JSON.stringify(database));
}

function showToast(message){
  toastBox.textContent = message;
  toastBox.classList.add("show");

  setTimeout(()=>{
    toastBox.classList.remove("show");
  },2200);
}

function escapeHTML(text=""){
  return text
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function money(number){
  return Number(number || 0).toLocaleString()+" ETB";
}

function avatar(){

  if(database.user?.photo){
    return database.user.photo;
  }

  return "data:image/svg+xml;charset=UTF-8,"+
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg"
      width="100" height="100">
      <rect width="100" height="100"
      fill="#dcebe5"/>
      <text x="50" y="62"
      text-anchor="middle"
      font-size="42"
      fill="#087f5b">
      ${database.user?.name?.[0] || "M"}
      </text>
      </svg>
    `);
}

function render(){

  if(currentPage==="home"){
    home();
  }

  if(currentPage==="market"){
    market();
  }

  if(currentPage==="work"){
    work();
  }

  if(currentPage==="profile"){
    profile();
  }

  document.querySelectorAll(".nav").forEach(btn=>{
    btn.classList.toggle(
      "active",
      btn.dataset.page===currentPage
    );
  });
}

/* HOME */

function home(){

  app.innerHTML=`

    <div class="search">
      <input id="searchInput"
      placeholder="Search people, posts and work...">

      <button class="primary"
      id="searchBtn">
      Search
      </button>
    </div>

    ${
      !database.user
      ?
      `<div class="notice">
      Sign up to post, stream, send gifts,
      use wallet and interact with real users.
      MENA never inserts fake users or fake posts.
      </div>`
      :""
    }

    <div class="section">
      <h2>Stories</h2>
      <button id="storyBtn">
      ${database.user ? "Your story" : "Sign up"}
      </button>
    </div>

    <div class="card">
      ${
        database.user
        ?
        `<div class="profileTop">
          <img class="avatar" src="${avatar()}">
          <div>
            <b>${escapeHTML(database.user.name)}</b>
            <div>${escapeHTML(database.user.username)}</div>
          </div>
        </div>`
        :
        `<div class="empty">
          <h3>No stories yet</h3>
          <p>Real users can create stories.</p>
        </div>`
      }
    </div>

    <div class="section">
      <h2>Live Now</h2>
      <button id="liveBtn">Go Live</button>
    </div>

    <div class="liveRow">

      ${
        database.streams.length
        ?
        database.streams.map(stream=>`

          <div class="liveCard">

            <span class="liveTag">
            ● LIVE
            </span>

            <h3>
            ${escapeHTML(stream.name)}
            </h3>

            <p>
            ${escapeHTML(stream.title)}
            </p>

            <button
            onclick="openStream('${stream.id}')">
            Open Stream
            </button>

          </div>

        `).join("")
        :
        `<div class="empty" style="min-width:100%">
          <h3>No one is live</h3>
          <p>
          MENA does not create fake live users.
          </p>
        </div>`
      }

    </div>

    <div class="section">
      <h2>For You</h2>
      <button onclick="render()">Refresh</button>
    </div>

    ${
      database.posts.length
      ?
      database.posts.map(postCard).join("")
      :
      `<div class="empty">

        <h3>Your feed is empty</h3>

        <p>
        Real posts will appear here after users
        upload them.
        </p>

      </div>`
    }

  `;

  document.getElementById("liveBtn")
    ?.addEventListener("click",streamPage);

  document.getElementById("storyBtn")
    ?.addEventListener("click",()=>{
      if(!database.user){
        signup();
      }else{
        createPost("photo");
      }
    });
}

function postCard(post){

  return `

  <article class="post">

    <div class="postHeader">

      <img class="avatar"
      src="${post.photo || avatar()}">

      <div style="flex:1">

        <b>
        ${escapeHTML(post.author)}
        </b>

        <div style="font-size:11px;color:#71807a">
        ${new Date(post.date).toLocaleString()}
        </div>

      </div>

    </div>

    ${
      post.media
      ?
      post.type==="video"
      ?
      `<video
      class="postMedia"
      controls
      src="${post.media}">
      </video>`
      :
      `<img
      class="postMedia"
      src="${post.media}">
      `
      :
      ""
    }

    ${
      post.text
      ?
      `<div class="postText">
      ${escapeHTML(post.text)}
      </div>`
      :""
    }

    <div class="postActions">

      <button onclick="likePost('${post.id}')">
      ❤️ ${post.likes || 0}
      </button>

      <button onclick="comments('${post.id}')">
      💬 ${post.comments?.length || 0}
      </button>

      <button onclick="sharePost('${post.id}')">
      ↗ Share
      </button>

      <button onclick="giftPost('${post.id}')">
      🎁 Gift
      </button>

      <button onclick="followUser('${post.author}')">
      + Follow
      </button>

    </div>

  </article>

  `;
}

/* MARKET */

function market(){

  const listings =
    database.posts.filter(x=>x.market);

  app.innerHTML=`

    <div class="section">
      <h2>Marketplace</h2>

      <button onclick="marketPost()">
      + Sell
      </button>
    </div>

    <div class="notice">
      Only real user listings appear here.
      There are no automatically generated products.
      Marketplace posting requires a 100 ETB listing fee
      in the production payment system.
    </div>

    ${
      listings.length
      ?
      listings.map(postCard).join("")
      :
      `<div class="empty">

      <h3>Marketplace is empty</h3>

      <p>
      Be the first real seller.
      </p>

      </div>`
    }

  `;
}

/* FREE WORK */

function work(){

  app.innerHTML=`

    <div class="section">
      <h2>Free Work</h2>

      <button onclick="freeWork()">
      + Post Work
      </button>
    </div>

    <div class="notice">
      Posting a Free Work opportunity costs
      100 ETB. Platform material fee:
      5% as configured by the platform.
    </div>

    ${
      database.work.length
      ?
      database.work.map(item=>`

        <div class="card">

          <div class="profileTop">

            <img
            class="avatar"
            src="${item.photo || avatar()}">

            <div>
              <b>
              ${escapeHTML(item.author)}
              </b>

              <div>
              ${new Date(item.date).toLocaleString()}
              </div>
            </div>

          </div>

          ${
            item.media
            ?
            `<img class="preview"
            src="${item.media}">`
            :""
          }

          <h3>
          ${escapeHTML(item.title)}
          </h3>

          <p>
          ${escapeHTML(item.description)}
          </p>

          <p>
          Material amount:
          <b>${money(item.amount)}</b>
          </p>

          <button
          class="secondary"
          onclick="contactWork()">
          Contact Employer
          </button>

        </div>

      `).join("")
      :
      `<div class="empty">

        <h3>No Free Work yet</h3>

        <p>
        Real employers can publish opportunities here.
        </p>

      </div>`
    }

  `;
}

/* PROFILE */

function profile(){

  if(!database.user){

    app.innerHTML=`

      <div class="card">

        <h2>Welcome to MENA</h2>

        <p>
        Create your real account to use
        profile, wallet, posting and streaming.
        </p>

        <button
        class="primary"
        onclick="signup()">
        Sign Up
        </button>

      </div>

    `;

    return;
  }

  app.innerHTML=`

    <div class="card">

      <div class="profileTop">

        <img
        class="profilePhoto"
        src="${avatar()}">

        <div>

          <h2 style="margin:0">
          ${escapeHTML(database.user.name)}
          </h2>

          <p>
          ${escapeHTML(database.user.username)}
          </p>

          <button
          class="secondary"
          onclick="editProfile()">
          Edit Profile
          </button>

        </div>

      </div>

      <div class="stats">

        <div class="stat">
          <b>
          ${database.posts.filter(
            x=>x.author===database.user.name
          ).length}
          </b>
          Posts
        </div>

        <div class="stat">
          <b>
          ${database.streams.filter(
            x=>x.name===database.user.name
          ).length}
          </b>
          Lives
        </div>

        <div class="stat">
          <b>
          ${database.coins.toLocaleString()}
          </b>
          Coins
        </div>

      </div>

    </div>

    <div class="card">

      <h2>Wallet</h2>

      <div class="walletBalance">
      ${money(database.balance)}
      </div>

      <p class="coin">
      🪙 ${database.coins.toLocaleString()} coins
      </p>

      <div class="grid">

        <button
        class="primary"
        onclick="deposit()">
        Deposit
        </button>

        <button
        class="secondary"
        onclick="withdraw()">
        Withdraw
        </button>

      </div>

      <button
      class="secondary"
      style="width:100%;margin-top:10px"
      onclick="coinShop()">
      🪙 Shop Coins
      </button>

    </div>

    <div class="card">

      <h3>Account Settings</h3>

      <button
      class="secondary"
      style="width:100%;margin:5px 0"
      onclick="walletConnect()">
      💳 Connect Telebirr / M-Pesa
      </button>

      <button
      class="secondary"
      style="width:100%;margin:5px 0"
      onclick="signup()">
      🔄 Switch Account
      </button>

      <button
      class="danger"
      style="width:100%;margin:5px 0"
      onclick="logout()">
      Logout
      </button>

    </div>

  `;
}

/* ACCOUNT */

function signup(){

  openModal(
    "Choose Account",
    `

    <div class="notice">
    Production authentication should use a secure backend.
    This browser version creates a local test account only.
    </div>

    <div class="choiceGrid">

      <button class="choice"
      onclick="signupForm('Personal')">

      <span>👤</span>
      Personal Account

      </button>

      <button class="choice"
      onclick="signupForm('Creator')">

      <span>🎥</span>
      Creator Account

      </button>

    </div>

    `
  );
}

function signupForm(type){

  openModal(
    "Create "+type+" Account",

    `

    <div class="formGroup">
    <label>Full Name</label>
    <input id="signupName">
    </div>

    <div class="formGroup">
    <label>Username</label>
    <input id="signupUsername"
    placeholder="@username">
    </div>

    <div class="formGroup">
    <label>Phone or Email</label>
    <input id="signupLogin">
    </div>

    <div class="formGroup">
    <label>Password</label>
    <input id="signupPassword"
    type="password">
    </div>

    <button
    class="primary"
    style="width:100%"
    onclick="createAccount('${type}')">

    Create Account

    </button>

    `
  );
}

function createAccount(type){

  const name =
    document.getElementById("signupName").value.trim();

  const username =
    document.getElementById("signupUsername").value.trim();

  const login =
    document.getElementById("signupLogin").value.trim();

  const password =
    document.getElementById("signupPassword").value;

  if(!name || !username || !login){
    showToast("Complete all fields.");
    return;
  }

  if(password.length<8){
    showToast("Password must contain at least 8 characters.");
    return;
  }

  database.user={
    name,
    username:username.startsWith("@")
      ? username
      : "@"+username,
    login,
    type,
    photo:null
  };

  save();
  closeModal();
  currentPage="profile";
  render();

  showToast("Account created.");
}

/* CREATE */

function createMenu(){

  if(!database.user){
    signup();
    return;
  }

  openModal(
    "Create",
    `

    <div class="choiceGrid">

      <button class="choice"
      onclick="createPost('video')">
      <span>🎥</span>
      Video Post
      </button>

      <button class="choice"
      onclick="createPost('photo')">
      <span>📷</span>
      Photo Post
      </button>

      <button class="choice"
      onclick="streamPage()">
      <span>🔴</span>
      Start Stream
      </button>

      <button class="choice"
      onclick="freeWork()">
      <span>💼</span>
      Free Work
      </button>

    </div>

    `
  );
}

/* CAMERA + GALLERY */

function createPost(type){

  if(!database.user){
    signup();
    return;
  }

  openModal(
    type==="video"
      ?"Create Video Post"
      :"Create Photo Post",

    `

    <div class="choiceGrid">

      <button
      class="choice"
      onclick="chooseCamera('${type}')">

      <span>📸</span>
      Camera

      </button>

      <button
      class="choice"
      onclick="chooseGallery('${type}')">

      <span>🖼️</span>
      Gallery

      </button>

    </div>

    <input
    id="mediaInput"
    class="fileInput"
    type="file"
    accept="${type==="video"?"video/*":"image/*"}">

    <div id="mediaEditor"></div>

    `
  );

  document.getElementById("mediaInput")
    .onchange=e=>{
      const file=e.target.files[0];

      if(!file)return;

      const reader=new FileReader();

      reader.onload=()=>{
        selectedMedia=reader.result;
        mediaEditor(type);
      };

      reader.readAsDataURL(file);
    };
}

function chooseCamera(type){

  const input=document.getElementById("mediaInput");

  input.setAttribute(
    "capture",
    type==="video"
      ?"environment"
      :"environment"
  );

  input.click();
}

function chooseGallery(){

  document.getElementById("mediaInput")
    .removeAttribute("capture");

  document.getElementById("mediaInput").click();
}

function mediaEditor(type){

  document.getElementById("mediaEditor").innerHTML=`

    ${
      type==="photo"
      ?
      `<div class="filterRow">

        <button onclick="filterMedia('')">
        Normal
        </button>

        <button onclick="filterMedia('blackFilter')">
        Black
        </button>

        <button onclick="filterMedia('bichFilter')">
        Bich
        </button>

        <button onclick="filterMedia('bwFilter')">
        B&W
        </button>

      </div>`
      :""
    }

    ${
      type==="video"
      ?
      `<video
      id="mediaPreview"
      class="preview"
      controls
      src="${selectedMedia}">
      </video>`
      :
      `<img
      id="mediaPreview"
      class="preview"
      src="${selectedMedia}">
      `
    }

    <div class="formGroup">

      <label>Caption</label>

      <textarea
      id="caption"
      placeholder="Write something...">
      </textarea>

    </div>

    <button
    class="primary"
    style="width:100%"
    onclick="publishPost('${type}')">

    Post Now

    </button>

  `;
}

function filterMedia(filter){

  document.getElementById("mediaPreview")
    .className="preview "+filter;
}

function publishPost(type){

  const text =
    document.getElementById("caption")
      .value.trim();

  database.posts.unshift({

    id:Date.now().toString(),

    author:database.user.name,

    username:database.user.username,

    photo:database.user.photo,

    type,

    media:selectedMedia,

    text,

    likes:0,

    comments:[],

    date:Date.now()

  });

  save();

  closeModal();

  currentPage="home";

  render();

  showToast("Post published.");
}

/* STREAM */

async function streamPage(){

  if(!database.user){
    signup();
    return;
  }

  openModal(
    "Start Live Stream",

    `

    <div class="formGroup">
    <label>Stream Name</label>
    <input id="streamName"
    placeholder="What are you streaming?">
    </div>

    <div class="formGroup">
    <label>Group Chat Name</label>
    <input id="groupName"
    placeholder="MENA Live Chat">
    </div>

    <video
    id="cameraPreview"
    class="streamVideo"
    autoplay
    muted
    playsinline>
    </video>

    <div class="chat">

      🔒 Camera preview is private
      until a real streaming server is connected.

    </div>

    <div class="grid">

      <button
      class="secondary"
      onclick="connectCamera()">

      📷 Connect Camera

      </button>

      <button
      class="primary"
      onclick="goLive()">

      🔴 Go Live

      </button>

    </div>

    `
  );
}

async function connectCamera(){

  try{

    cameraStream =
      await navigator.mediaDevices.getUserMedia({
        video:true,
        audio:true
      });

    document.getElementById(
      "cameraPreview"
    ).srcObject=cameraStream;

    showToast("Camera connected.");

  }catch(error){

    showToast(
      "Camera permission was denied."
    );

  }
}

function goLive(){

  if(!cameraStream){
    showToast("Connect camera first.");
    return;
  }

  const title =
    document.getElementById("streamName")
      .value.trim();

  if(!title){
    showToast("Enter stream name.");
    return;
  }

  database.streams.unshift({

    id:Date.now().toString(),

    name:database.user.name,

    title,

    group:
      document.getElementById("groupName")
      .value.trim()
      || "MENA Live Chat",

    date:Date.now()

  });

  save();

  stopCamera();

  closeModal();

  currentPage="home";

  render();

  showToast("Live room created.");
}

function stopCamera(){

  if(cameraStream){

    cameraStream
      .getTracks()
      .forEach(track=>track.stop());

    cameraStream=null;
  }
}

function openStream(id){

  const stream =
    database.streams.find(x=>x.id===id);

  if(!stream)return;

  openModal(

    "🔴 "+stream.title,

    `

    <div class="notice">

    Host:
    <b>${escapeHTML(stream.name)}</b>

    <br>

    Group:
    ${escapeHTML(stream.group)}

    </div>

    <div class="chat">

    No fake viewers,
    fake comments or fake likes
    are generated.

    </div>

    <div class="grid">

      <button
      class="secondary"
      onclick="showToast('Follow requires backend account sync.')">

      + Follow

      </button>

      <button
      class="primary"
      onclick="giftStream('${id}')">

      🎁 Gift

      </button>

    </div>

    <div class="formGroup">

      <input
      placeholder="Comment / guest request">

      <button
      class="secondary"
      style="width:100%;margin-top:8px"
      onclick="showToast('Live chat requires the backend.')">

      Send / Request Guest

      </button>

    </div>

    `
  );
}

/* GIFTS */

function giftPost(id){

  if(!database.user){
    signup();
    return;
  }

  giftWindow("post",id);
}

function giftStream(id){

  giftWindow("stream",id);
}

function giftWindow(type,id){

  openModal(

    "Send Gift",

    `

    <p>
    Your balance:
    <b class="coin">
    ${database.coins.toLocaleString()} coins
    </b>
    </p>

    <p>
    1 coin = 0.50 ETB
    </p>

    <div class="giftGrid">

      ${gifts.map(g=>`

        <button
        class="gift"
        onclick="sendGift(${g[2]},'${type}','${id}')">

        <div class="giftEmoji">
        ${g[0]}
        </div>

        <b>${g[1]}</b>

        <small>
        ${g[2].toLocaleString()} coins
        </small>

        </button>

      `).join("")}

    </div>

    `
  );
}

function sendGift(cost,type,id){

  if(database.coins<cost){

    showToast(
      "Not enough coins. Open Shop Coins."
    );

    return;
  }

  database.coins-=cost;

  const creatorAmount =
    cost*0.70;

  const platformAmount =
    cost*0.30;

  database.notifications.push({

    type:"gift",

    giftCoins:cost,

    creatorCoins:creatorAmount,

    platformCoins:platformAmount,

    target:type,

    targetId:id,

    date:Date.now()

  });

  save();

  closeModal();

  showToast(
    `${cost.toLocaleString()} coin gift sent.`
  );
}

/* COIN SHOP */

function coinShop(){

  if(!database.user){
    signup();
    return;
  }

  const packs=[
    10,
    50,
    100,
    500,
    1000,
    5000,
    10000,
    27000
  ];

  openModal(

    "🪙 Shop Coins",

    `

    <div class="notice">

    1 coin = 0.50 ETB

    <br>

    Minimum purchase:
    10 coins = 5 ETB

    <br><br>

    Actual payment requires
    Telebirr/M-Pesa API integration.

    </div>

    <div class="coinGrid">

      ${packs.map(coins=>`

      <div class="coinPack">

        🪙

        <br>

        <strong>
        ${coins.toLocaleString()}
        </strong>

        coins

        <br>

        ${(coins*.5).toLocaleString()}
        ETB

        <button
        onclick="paymentChoice(${coins})">

        Buy

        </button>

      </div>

      `).join("")}

    </div>

    `
  );
}

function paymentChoice(coins){

  openModal(

    "Choose Payment",

    `

    <p>

    ${coins.toLocaleString()}
    coins =
    ${(coins*.5).toLocaleString()}
    ETB

    </p>

    <div class="choiceGrid">

      <button
      class="choice"
      onclick="paymentForm('Telebirr',${coins})">

      <span>🟢</span>
      Telebirr

      </button>

      <button
      class="choice"
      onclick="paymentForm('M-Pesa',${coins})">

      <span>🔵</span>
      M-Pesa

      </button>

    </div>

    `
  );
}

function paymentForm(method,coins){

  openModal(

    method,

    `

    <div class="notice">

    The request is marked pending.
    This demo will never pretend that
    money was transferred.

    </div>

    <div class="formGroup">

      <label>
      ${method} Number
      </label>

      <input
      id="paymentNumber"
      inputmode="tel">

    </div>

    <div class="formGroup">

      <label>
      Account Name
      </label>

      <input id="paymentName">

    </div>

    <button
    class="primary"
    style="width:100%"
    onclick="submitPayment('${method}',${coins})">

    Continue

    </button>

    `
  );
}

function submitPayment(method,coins){

  const number =
    document.getElementById(
      "paymentNumber"
    ).value.trim();

  const name =
    document.getElementById(
      "paymentName"
    ).value.trim();

  if(!number||!name){

    showToast(
      "Enter number and account name."
    );

    return;
  }

  database.notifications.push({

    type:"coinPayment",

    method,

    number,

    name,

    coins,

    amount:coins*.5,

    status:"pending",

    date:Date.now()

  });

  save();

  closeModal();

  showToast(
    "Payment request saved as pending."
  );
}

/* WALLET */

function walletConnect(){

  if(!database.user){
    signup();
    return;
  }

  openModal(

    "Connect Wallet",

    `

    <div class="choiceGrid">

      <button
      class="choice"
      onclick="walletForm('telebirr')">

      <span>🟢</span>
      Telebirr

      </button>

      <button
      class="choice"
      onclick="walletForm('mpesa')">

      <span>🔵</span>
      M-Pesa

      </button>

    </div>

    `
  );
}

function walletForm(method){

  const name =
    method==="telebirr"
      ?"Telebirr"
      :"M-Pesa";

  openModal(

    "Connect "+name,

    `

    <div class="formGroup">

      <label>
      ${name} Number
      </label>

      <input
      id="walletNumber"
      inputmode="tel">

    </div>

    <div class="formGroup">

      <label>
      Account Name
      </label>

      <input id="walletName">

    </div>

    <button
    class="primary"
    style="width:100%"
    onclick="saveWallet('${method}')">

    Connect Wallet

    </button>

    `
  );
}

function saveWallet(method){

  const number =
    document.getElementById(
      "walletNumber"
    ).value.trim();

  const name =
    document.getElementById(
      "walletName"
    ).value.trim();

  if(!number||!name){

    showToast(
      "Enter wallet number and name."
    );

    return;
  }

  database.wallet[method]={
    number,
    name
  };

  save();

  closeModal();

  showToast("Wallet connected.");
}

/* DEPOSIT */

function deposit(){

  if(!database.user){
    signup();
    return;
  }

  if(
    !database.wallet.telebirr &&
    !database.wallet.mpesa
  ){

    walletConnect();

    return;
  }

  openModal(

    "Deposit Money",

    `

    <p>
    Choose your connected wallet.
    </p>

    <div class="choiceGrid">

      <button
      class="choice"
      onclick="depositForm('telebirr')">

      <span>🟢</span>
      Telebirr

      </button>

      <button
      class="choice"
      onclick="depositForm('mpesa')">

      <span>🔵</span>
      M-Pesa

      </button>

    </div>

    `
  );
}

function depositForm(method){

  openModal(

    "Deposit",

    `

    <div class="formGroup">

      <label>
      Amount (ETB)
      </label>

      <input
      id="depositAmount"
      type="number"
      min="1">

    </div>

    <button
    class="primary"
    style="width:100%"
    onclick="submitDeposit('${method}')">

    Deposit

    </button>

    `
  );
}

function submitDeposit(method){

  const amount =
    Number(
      document.getElementById(
        "depositAmount"
      ).value
    );

  if(amount<=0){

    showToast(
      "Enter a valid amount."
    );

    return;
  }

  database.notifications.push({

    type:"deposit",

    method,

    amount,

    status:"pending",

    date:Date.now()

  });

  save();

  closeModal();

  showToast(
    "Deposit request pending."
  );
}

/* WITHDRAW */

function withdraw(){

  if(!database.user){
    signup();
    return;
  }

  openModal(

    "Withdraw Money",

    `

    <div class="notice">

    Minimum withdrawal:
    <b>10 ETB</b>

    <br>

    You can only withdraw
    your real available balance.

    </div>

    <div class="formGroup">

      <label>
      Amount
      </label>

      <input
      id="withdrawAmount"
      type="number"
      min="10">

    </div>

    <div class="choiceGrid">

      <button
      class="choice"
      onclick="submitWithdraw('telebirr')">

      <span>🟢</span>
      Telebirr

      </button>

      <button
      class="choice"
      onclick="submitWithdraw('mpesa')">

      <span>🔵</span>
      M-Pesa

      </button>

    </div>

    `
  );
}

function submitWithdraw(method){

  const amount =
    Number(
      document.getElementById(
        "withdrawAmount"
      ).value
    );

  if(amount<10){

    showToast(
      "Minimum withdrawal is 10 ETB."
    );

    return;
  }

  if(amount>database.balance){

    showToast(
      "Insufficient balance."
    );

    return;
  }

  if(!database.wallet[method]){

    showToast(
      "Connect this wallet first."
    );

    return;
  }

  database.balance-=amount;

  database.notifications.push({

    type:"withdraw",

    method,

    amount,

    status:"pending",

    date:Date.now()

  });

  save();

  closeModal();

  showToast(
    "Withdrawal request submitted."
  );
}

/* PROFILE */

function editProfile(){

  openModal(

    "Edit Profile",

    `

    <div class="formGroup">

      <label>
      Name
      </label>

      <input
      id="editName"
      value="${escapeHTML(database.user.name)}">

    </div>

    <div class="formGroup">

      <label>
      Username
      </label>

      <input
      id="editUsername"
      value="${escapeHTML(database.user.username)}">

    </div>

    <div class="choiceGrid">

      <button
      class="choice"
      onclick="profilePhoto()">

      <span>📷</span>
      Change Photo

      </button>

      <button
      class="choice"
      onclick="profileGallery()">

      <span>🖼️</span>
      Gallery

      </button>

    </div>

    <input
    id="profileInput"
    class="fileInput"
    type="file"
    accept="image/*">

    <button
    class="primary"
    style="width:100%;margin-top:12px"
    onclick="saveProfile()">

    Save Profile

    </button>

    `
  );
}

function profilePhoto(){

  const input =
    document.getElementById(
      "profileInput"
    );

  input.setAttribute("capture","user");
  input.click();

  profileImageReader(input);
}

function profileGallery(){

  const input =
    document.getElementById(
      "profileInput"
    );

  input.removeAttribute("capture");
  input.click();

  profileImageReader(input);
}

function profileImageReader(input){

  input.onchange=()=>{

    const file=input.files[0];

    if(!file)return;

    const reader=new FileReader();

    reader.onload=()=>{
      database.user.photo=reader.result;
    };

    reader.readAsDataURL(file);
  };
}

function saveProfile(){

  database.user.name =
    document.getElementById(
      "editName"
    ).value.trim();

  database.user.username =
    document.getElementById(
      "editUsername"
    ).value.trim();

  save();

  closeModal();

  render();

  showToast(
    "Profile updated."
  );
}

/* MARKETPLACE */

function marketPost(){

  if(!database.user){
    signup();
    return;
  }

  openModal(

    "Create Market Listing",

    `

    <div class="notice">

    Marketplace posting fee:
    <b>100 ETB</b>.

    </div>

    <div class="formGroup">

      <label>
      Product
      </label>

      <input id="marketTitle">

    </div>

    <div class="formGroup">

      <label>
      Price
      </label>

      <input
      id="marketPrice"
      type="number">

    </div>

    <div class="formGroup">

      <label>
      Location
      </label>

      <input id="marketLocation">

    </div>

    <div class="formGroup">

      <label>
      Description
      </label>

      <textarea
      id="marketDescription">
      </textarea>

    </div>

    <input
    id="marketImage"
    class="fileInput"
    type="file"
    accept="image/*">

    <button
    class="secondary"
    style="width:100%"
    onclick="document.getElementById('marketImage').click()">

    Choose Product Photo

    </button>

    <button
    class="primary"
    style="width:100%;margin-top:10px"
    onclick="marketNext()">

    Next — 100 ETB Posting Fee

    </button>

    `
  );

  document.getElementById(
    "marketImage"
  ).onchange=e=>{

    const file=e.target.files[0];

    if(!file)return;

    const reader=new FileReader();

    reader.onload=()=>{
      selectedMedia=reader.result;
    };

    reader.readAsDataURL(file);
  };
}

function marketNext(){

  const title =
    document.getElementById(
      "marketTitle"
    ).value.trim();

  const price =
    document.getElementById(
      "marketPrice"
    ).value;

  if(!title||!price){

    showToast(
      "Enter product and price."
    );

    return;
  }

  openModal(

    "Marketplace Payment",

    `

    <div class="notice">

    Listing fee:
    <b>100 ETB</b>

    <br><br>

    Connect a real payment provider
    before publishing in production.

    </div>

    <button
    class="primary"
    style="width:100%"
    onclick="showToast('Real payment API required.')">

    Pay 100 ETB

    </button>

    `
  );
}

/* FREE WORK */

function freeWork(){

  if(!database.user){
    signup();
    return;
  }

  openModal(

    "Post Free Work",

    `

    <div class="formGroup">

      <label>
      Work Title
      </label>

      <input id="workTitle">

    </div>

    <div class="formGroup">

      <label>
      Details / Procedure
      </label>

      <textarea
      id="workDescription">
      </textarea>

    </div>

    <div class="formGroup">

      <label>
      Material Amount
      </label>

      <input
      id="workAmount"
      type="number">

    </div>

    <button
    class="primary"
    style="width:100%"
    onclick="workNext()">

    Next — 100 ETB

    </button>

    `
  );
}

function workNext(){

  const title =
    document.getElementById(
      "workTitle"
    ).value.trim();

  const description =
    document.getElementById(
      "workDescription"
    ).value.trim();

  const amount =
    Number(
      document.getElementById(
        "workAmount"
      ).value
    );

  if(!title||!description){

    showToast(
      "Complete the work information."
    );

    return;
  }

  database.work.unshift({

    id:Date.now(),

    author:database.user.name,

    photo:database.user.photo,

    title,

    description,

    amount,

    date:Date.now()

  });

  save();

  closeModal();

  currentPage="work";

  render();

  showToast(
    "Work post saved locally."
  );
}

/* COMMENTS */

function comments(id){

  const post =
    database.posts.find(
      x=>x.id===id
    );

  if(!post)return;

  openModal(

    "Comments",

    `

    <div class="chat">

      ${
        post.comments?.length
        ?
        post.comments.map(c=>`
          <div class="chatLine">
          <b>${escapeHTML(c.name)}:</b>
          ${escapeHTML(c.text)}
          </div>
        `).join("")
        :
        "No comments yet."
      }

    </div>

    <div class="formGroup">

      <input
      id="commentInput"
      placeholder="Write a comment">

    </div>

    <button
    class="primary"
    style="width:100%"
    onclick="sendComment('${id}')">

    Send Comment

    </button>

    <button
    class="secondary"
    style="width:100%;margin-top:8px"
    onclick="giftPost('${id}')">

    🎁 Send Gift in Comment

    </button>

    `
  );
}

function sendComment(id){

  const text =
    document.getElementById(
      "commentInput"
    ).value.trim();

  if(!text)return;

  const post =
    database.posts.find(
      x=>x.id===id
    );

  post.comments ??= [];

  post.comments.push({

    name:database.user.name,

    text,

    date:Date.now()

  });

  save();

  comments(id);
}

/* OTHER */

function likePost(id){

  const post =
    database.posts.find(
      x=>x.id===id
    );

  if(!post)return;

  post.likes=(post.likes||0)+1;

  save();

  render();
}

async function sharePost(id){

  const post =
    database.posts.find(
      x=>x.id===id
    );

  const text =
    `MENA post by ${post.author}`;

  if(navigator.share){

    try{

      await navigator.share({
        title:"MENA",
        text
      });

    }catch{}

  }else{

    showToast(
      "Sharing is available from your device."
    );

  }
}

function followUser(){

  if(!database.user){

    signup();

    return;
  }

  showToast(
    "Follow is ready for backend account sync."
  );
}

function contactWork(){

  showToast(
    "Employer messaging requires backend."
  );
}

/* MODAL */

function openModal(title,body){

  modal.innerHTML=`

    <div
    class="modalBackground"
    onclick="outsideModal(event)">

      <div class="modalBox">

        <div class="modalHeader">

          <h2>${title}</h2>

          <button
          class="closeBtn"
          onclick="closeModal()">

          ×

          </button>

        </div>

        ${body}

      </div>

    </div>

  `;
}

function outsideModal(event){

  if(event.target.classList.contains(
    "modalBackground"
  )){
    closeModal();
  }
}

function closeModal(){

  stopCamera();

  modal.innerHTML="";
}

/* LOGOUT */

function logout(){

  database.user=null;

  save();

  currentPage="home";

  render();

  showToast(
    "Logged out."
  );
}

/* NAVIGATION */

document.querySelectorAll(".nav")
.forEach(button=>{

  button.addEventListener(
    "click",
    ()=>{

      currentPage=
        button.dataset.page;

      render();

    }
  );

});

document.getElementById(
  "createBtn"
).onclick=createMenu;

document.getElementById(
  "settingsBtn"
).onclick=()=>{

  openModal(

    "MENA Settings",

    `

    <div class="choiceGrid">

      <button
      class="choice"
      onclick="currentPage='profile';closeModal();render()">

      <span>👤</span>
      Profile

      </button>

      <button
      class="choice"
      onclick="walletConnect()">

      <span>💳</span>
      Wallet

      </button>

      <button
      class="choice"
      onclick="coinShop()">

      <span>🪙</span>
      Shop Coins

      </button>

      <button
      class="choice"
      onclick="createMenu()">

      <span>＋</span>
      Create

      </button>

    </div>

    `
  );

};

document.getElementById(
  "menuBtn"
).onclick=()=>{

  openModal(

    "MENA Menu",

    `

    <div class="choiceGrid">

      <button
      class="choice"
      onclick="currentPage='home';closeModal();render()">

      <span>⌂</span>
      Home

      </button>

      <button
      class="choice"
      onclick="currentPage='market';closeModal();render()">

      <span>🛍</span>
      Market

      </button>

      <button
      class="choice"
      onclick="currentPage='work';closeModal();render()">

      <span>💼</span>
      Free Work

      </button>

      <button
      class="choice"
      onclick="currentPage='profile';closeModal();render()">

      <span>👤</span>
      Profile

      </button>

    </div>

    `
  );

};

render();
