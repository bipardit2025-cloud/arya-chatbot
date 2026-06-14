/**
 * widget.js — Arya Chatbot Widget (self-contained, embeddable)
 * ---------------------------------------------------------------
 * Government IT / ERP assistant. White + blue + teal. Square edges.
 * Animated robot mascot (left) + chat (right).
 *
 * Behaviour:
 *   • On first open per session: Arya GREETS with voice (backend TTS) and
 *     shows prebuilt help options.
 *   • Replies are concise & to-the-point (backend persona controls this).
 *   • Language mirroring: Arya answers in the SAME language the user used
 *     (English / Hindi / Hinglish) — detected by the backend.
 *   • Voice via per-request backend audio file (data.audio -> /audio/{file}).
 *
 * DEPLOY: set ARYA_API_URL to your server, e.g. http://10.140.10.24:8000
 */
(function () {
  "use strict";

  /* ===================== CONFIG ===================== */
  // Allow override via <script data-api="http://10.140.10.24:8000"> or window.ARYA_API_URL
  const SCRIPT_API = (document.currentScript && document.currentScript.dataset.api) || "";
  const ARYA_API_URL = window.ARYA_API_URL || SCRIPT_API || "http://localhost:8000";
  const FULLPAGE_URL = "chatbot.html";
  const MAX_HISTORY = 10;
  const BUBBLE_DELAY_MS = 2000;

  // Trilingual welcome lines (shown + spoken). Backend picks voice; we pass lang.
  const WELCOME = {
    en: "Namaste. I am Arya, your IT assistant. How may I help you today?",
    hi: "\u0928\u092e\u0938\u094d\u0924\u0947\u0964 \u092e\u0948\u0902 \u0906\u0930\u094d\u092f\u093e \u0939\u0942\u0901, \u0906\u092a\u0915\u093e IT \u0938\u0939\u093e\u092f\u0915\u0964 \u092e\u0948\u0902 \u0906\u092a\u0915\u0940 \u0915\u0948\u0938\u0947 \u0938\u0939\u093e\u092f\u0924\u093e \u0915\u0930 \u0938\u0915\u0924\u093e \u0939\u0942\u0901?",
    hinglish: "Namaste. Main Arya hoon, aapka IT assistant. Main aapki kaise madad kar sakta hoon?"
  };

  /* ===================== FONTS ===================== */
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap";
  document.head.appendChild(fontLink);

  /* ===== PERMANENT MASCOT FAVICON (matches the chatbot logo) ===== */
  (function setFavicon() {
    const svg = "data:image/svg+xml," + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" +
      "<rect width='24' height='24' rx='5' fill='#1f6feb'/>" +
      "<rect x='5' y='8' width='14' height='10' rx='3' fill='#fff'/>" +
      "<circle cx='9.5' cy='13' r='1.7' fill='#1f6feb'/>" +
      "<circle cx='14.5' cy='13' r='1.7' fill='#1f6feb'/>" +
      "<rect x='11' y='3.5' width='2' height='3.5' fill='#00d4e0'/>" +
      "<circle cx='12' cy='3' r='1.7' fill='#00d4e0'/></svg>"
    );
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.type = "image/svg+xml";
    link.href = svg;
  })();

  /* ===================== STYLES ===================== */
  const css = `
  #arya-root, #arya-root * { box-sizing:border-box; margin:0; padding:0; border-radius:0 !important; }
  #arya-root {
    --white:#ffffff; --ink:#0f1b2d; --ink2:#3a4a60; --muted:#7d8aa0;
    --blue:#1f6feb; --blueDark:#1552c4; --blueSoft:#eaf2ff;
    --teal:#00b8c4; --tealDark:#0090a0; --tealSoft:#e6fafb;
    --line:#d8e0ec; --panel:#ffffff; --panel2:#f5f8fc; --panel3:#eef3f9;
    --fd:'Sora',sans-serif; --fb:'Outfit',sans-serif;
  }
  #arya-bubble{position:fixed;bottom:24px;right:24px;z-index:99998;display:flex;align-items:center;gap:12px;cursor:pointer;animation:aBubbleIn .5s ease}
  @keyframes aBubbleIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
  #arya-bubble .pop{background:var(--white);color:var(--ink);font-family:var(--fb);font-size:13.5px;font-weight:500;padding:11px 15px;box-shadow:0 8px 28px rgba(15,27,45,.18);position:relative;white-space:nowrap;opacity:0;transition:opacity .4s;border:1px solid var(--line);border-left:3px solid var(--teal)}
  #arya-bubble .pop.show{opacity:1}
  #arya-bubble .orb{width:62px;height:62px;flex:0 0 auto;position:relative;background:linear-gradient(135deg,var(--blue),var(--teal));box-shadow:0 8px 24px rgba(31,111,235,.45);display:grid;place-items:center;animation:aOrb 2.6s ease-in-out infinite}
  @keyframes aOrb{0%,100%{box-shadow:0 8px 24px rgba(31,111,235,.45),0 0 0 0 rgba(0,184,196,.4)}50%{box-shadow:0 8px 24px rgba(31,111,235,.45),0 0 0 12px rgba(0,184,196,0)}}
  #arya-bubble .orb svg{width:34px;height:34px}
  #arya-overlay{position:fixed;inset:0;z-index:99999;display:none;background:rgba(15,27,45,.28);align-items:flex-end;justify-content:flex-end;animation:aFade .25s ease}
  @keyframes aFade{from{opacity:0}to{opacity:1}}
  #arya-overlay.open{display:flex}
  #arya-panel{width:760px;max-width:calc(100vw - 36px);height:580px;max-height:calc(100vh - 36px);margin:0 24px 24px 0;background:var(--panel);border:1px solid var(--line);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px -15px rgba(15,27,45,.45);animation:aPanel .3s ease}
  @keyframes aPanel{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
  #arya-head{background:linear-gradient(110deg,var(--blue),var(--tealDark));padding:14px 16px;display:flex;align-items:center;gap:12px;flex:0 0 auto}
  #arya-head .mini{width:36px;height:36px;background:rgba(255,255,255,.18);display:grid;place-items:center}
  #arya-head .mini svg{width:22px;height:22px}
  #arya-head h2{font-family:var(--fd);font-size:18px;color:#fff;font-weight:600;line-height:1}
  #arya-head .sub{font-size:11px;color:rgba(255,255,255,.85);margin-top:3px}
  #arya-head .dot{display:inline-block;width:7px;height:7px;background:#5dffca;margin-right:5px;box-shadow:0 0 6px #5dffca}
  #arya-head .grow{flex:1}
  #arya-head button{width:34px;height:34px;border:none;cursor:pointer;background:rgba(255,255,255,.16);color:#fff;display:grid;place-items:center;transition:.18s}
  #arya-head button:hover{background:rgba(255,255,255,.32)}
  #arya-head button svg{width:17px;height:17px}
  #arya-body{flex:1;display:flex;min-height:0}
  #arya-stage{width:250px;flex:0 0 auto;position:relative;overflow:hidden;background:linear-gradient(180deg,#0f2238,#0a1726);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;border-right:1px solid var(--line)}
  .aGrid{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(0,184,196,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(0,184,196,.10) 1px,transparent 1px);background-size:26px 26px;-webkit-mask-image:radial-gradient(circle at 50% 38%,#000,transparent 75%);mask-image:radial-gradient(circle at 50% 38%,#000,transparent 75%)}
  .mascot{position:relative;width:150px;height:180px;animation:aFloat 4s ease-in-out infinite}
  @keyframes aFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  .mascot.talking{animation:aFloat 1.5s ease-in-out infinite}
  .mascot.searching{animation:aFloat 2.2s ease-in-out infinite}
  .mascot.listening{animation:aFloat 1.8s ease-in-out infinite}
  .aura{position:absolute;left:50%;top:42%;width:170px;height:170px;transform:translate(-50%,-50%);border-radius:50% !important;background:radial-gradient(circle,rgba(0,184,196,.32),transparent 65%);filter:blur(8px);opacity:.55;transition:.3s}
  .mascot.talking .aura{opacity:1;background:radial-gradient(circle,rgba(31,111,235,.4),transparent 65%);animation:aAura .9s ease-in-out infinite}
  .mascot.searching .aura{opacity:.9;background:radial-gradient(circle,rgba(0,184,196,.45),transparent 65%);animation:aAura 1.4s ease-in-out infinite}
  .mascot.listening .aura{opacity:1;background:radial-gradient(circle,rgba(93,255,202,.4),transparent 65%);animation:aAura 1.1s ease-in-out infinite}
  @keyframes aAura{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.14)}}
  .ant{position:absolute;left:50%;top:-4px;width:3px;height:18px;background:linear-gradient(#cfe0f5,#9fb6d6);transform:translateX(-50%)}
  .ant .tip{position:absolute;top:-7px;left:50%;width:11px;height:11px;border-radius:50% !important;transform:translateX(-50%);background:var(--teal);box-shadow:0 0 12px var(--teal);animation:aTip 2s ease-in-out infinite}
  @keyframes aTip{0%,100%{box-shadow:0 0 8px var(--teal)}50%{box-shadow:0 0 18px var(--teal)}}
  .mascot.searching .ant .tip{animation:aTip .5s ease-in-out infinite}
  .mhead{position:absolute;left:50%;top:14px;width:118px;height:92px;transform:translateX(-50%);background:linear-gradient(160deg,#ffffff,#e3ebf6);box-shadow:inset 0 -6px 12px rgba(120,140,170,.35),0 8px 18px rgba(0,0,0,.4);border:2px solid #fff}
  .mhead::before{content:"";position:absolute;inset:6px;border:1px solid rgba(31,111,235,.15)}
  .face{position:absolute;left:50%;top:30px;width:96px;height:54px;transform:translateX(-50%);background:linear-gradient(160deg,#0c1a2e,#13294a);overflow:hidden;box-shadow:inset 0 0 16px rgba(0,0,0,.7)}
  .eye{position:absolute;top:18px;width:17px;height:17px;border-radius:50% !important;background:var(--teal);box-shadow:0 0 12px var(--teal);animation:aBlink 4.5s infinite}
  .eye.l{left:20px}.eye.r{right:20px}
  @keyframes aBlink{0%,95%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}
  .mascot.talking .eye{background:var(--blue);box-shadow:0 0 14px var(--blue);animation:aBlink 4.5s infinite,aEye 1s infinite}
  .mascot.searching .eye{animation:aScan 1.2s ease-in-out infinite}
  .mascot.listening .eye{background:#5dffca;box-shadow:0 0 14px #5dffca}
  @keyframes aEye{0%,100%{box-shadow:0 0 12px var(--blue)}50%{box-shadow:0 0 20px #6ea8ff}}
  @keyframes aScan{0%,100%{transform:translateX(-4px)}50%{transform:translateX(4px)}}
  .mouth{position:absolute;left:50%;bottom:8px;width:30px;height:4px;transform:translateX(-50%);background:var(--teal);transition:.15s}
  .mascot.talking .mouth{background:var(--blue);animation:aTalk .26s infinite}
  @keyframes aTalk{0%,100%{height:4px;width:30px}50%{height:13px;width:18px}}
  /* HAPPY expression (greeting / form submitted): curved smile + warm eyes */
  .mascot.happy .eye{background:#ffd54a;box-shadow:0 0 14px #ffd54a;height:9px;border-radius:9px 9px 0 0 !important;top:22px}
  .mascot.happy .mouth{height:14px;width:30px;background:transparent;border:3px solid var(--teal);border-top:none;border-radius:0 0 30px 30px !important}
  /* SEARCHING gets a subtle head tilt for personality */
  .mascot.searching .mhead{animation:aTilt 1.6s ease-in-out infinite}
  @keyframes aTilt{0%,100%{transform:translateX(-50%) rotate(-3deg)}50%{transform:translateX(-50%) rotate(3deg)}}
  .bodyM{position:absolute;left:50%;top:114px;width:84px;height:56px;transform:translateX(-50%);background:linear-gradient(160deg,#ffffff,#e3ebf6);box-shadow:inset 0 -5px 10px rgba(120,140,170,.3),0 7px 14px rgba(0,0,0,.35);border:2px solid #fff}
  .core{position:absolute;left:50%;top:16px;width:26px;height:26px;transform:translateX(-50%);border-radius:50% !important;background:radial-gradient(circle at 40% 35%,var(--teal),var(--blueDark));box-shadow:0 0 16px rgba(0,184,196,.8);animation:aCore 2s ease-in-out infinite}
  @keyframes aCore{0%,100%{box-shadow:0 0 12px rgba(0,184,196,.7)}50%{box-shadow:0 0 24px rgba(31,111,235,.9)}}
  .arm{position:absolute;top:118px;width:14px;height:40px;background:linear-gradient(#ffffff,#cfdbec);border:1px solid #e3ebf6}
  .arm.l{left:20px;transform-origin:top;animation:aArmL 4s ease-in-out infinite}
  .arm.r{right:20px;transform-origin:top;animation:aArmR 4s ease-in-out infinite}
  @keyframes aArmL{0%,100%{transform:rotate(10deg)}50%{transform:rotate(-3deg)}}
  @keyframes aArmR{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(3deg)}}
  .mascot.talking .arm.l{animation:aArmL 1s ease-in-out infinite}
  .mascot.talking .arm.r{animation:aArmR 1s ease-in-out infinite}
  .sName{text-align:center;z-index:2}
  .sName .n{font-family:var(--fd);font-size:22px;font-weight:700;color:#fff;letter-spacing:.5px}
  .sName .r{font-size:10px;color:#7fa8c9;letter-spacing:2px;margin-top:2px}
  .sState{font-size:11px;color:var(--teal);margin-top:4px;height:14px;letter-spacing:.5px;z-index:2;font-weight:500}
  #arya-chatcol{flex:1;display:flex;flex-direction:column;min-width:0;background:var(--panel2)}
  #arya-msgs{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px}
  #arya-msgs::-webkit-scrollbar{width:7px}#arya-msgs::-webkit-scrollbar-thumb{background:var(--line)}
  .aWelcome{text-align:center;margin:auto 0;color:var(--muted)}
  .aWelcome .em{font-size:38px;display:block;margin-bottom:8px}
  .aWelcome b{color:var(--ink)}
  .aMsg{max-width:80%;padding:12px 15px;font-size:14px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;font-family:var(--fb);animation:aMsgIn .28s ease;position:relative}
  @keyframes aMsgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .aMsg.u{align-self:flex-end;background:var(--blue);color:#fff;border-right:3px solid var(--blueDark)}
  .aMsg.b{align-self:flex-start;background:#fff;color:var(--ink);border:1px solid var(--line);border-left:3px solid var(--teal)}
  .aMsg b{font-weight:600}.aMsg.b b{color:var(--blue)}
  #arya-root pre { background: var(--panel2); padding: 8px 12px; margin: 8px 0; overflow-x: auto; border: 1px solid var(--line); font-family: monospace; font-size: 13px; }
  #arya-root code { background: var(--panel2); padding: 2px 5px; font-family: monospace; font-size: 13px; color: var(--blueDark); }
  .aMsg.u code { color: #fff; background: rgba(0,0,0,0.2); }
  .aThink{align-self:flex-start;display:flex;align-items:center;gap:10px;color:var(--ink2);font-size:12.5px;background:#fff;border:1px solid var(--line);border-left:3px solid var(--teal);padding:11px 15px}
  .aSpin{width:13px;height:13px;border:2px solid var(--line);border-top-color:var(--teal);border-radius:50% !important;animation:aSpin .7s linear infinite}
  @keyframes aSpin{to{transform:rotate(360deg)}}
  .aDots span{animation:aBd 1.2s infinite}.aDots span:nth-child(2){animation-delay:.2s}.aDots span:nth-child(3){animation-delay:.4s}
  @keyframes aBd{0%,60%,100%{opacity:.3}30%{opacity:1}}
  #arya-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 18px 10px;background:var(--panel2)}
  .aChip{background:#fff;border:1px solid var(--line);color:var(--blue);font-family:var(--fb);font-size:12px;font-weight:500;padding:7px 13px;cursor:pointer;transition:.16s}
  .aChip:hover{background:var(--blueSoft);border-color:var(--blue)}
  #arya-input{padding:12px 14px 14px;border-top:1px solid var(--line);background:#fff;display:flex;gap:9px;align-items:center;flex:0 0 auto}
  #arya-input .mic{width:42px;height:42px;flex:0 0 auto;border:1px solid var(--line);cursor:pointer;background:var(--panel3);color:var(--muted);display:grid;place-items:center;transition:.18s}
  #arya-input .mic:hover{color:var(--teal);border-color:var(--teal)}
  #arya-input .mic svg{width:18px;height:18px}
  #arya-input .mic.rec{background:var(--blue);color:#fff;border-color:var(--blue);animation:aRec 1s infinite}
  @keyframes aRec{0%,100%{box-shadow:0 0 0 0 rgba(31,111,235,.5)}50%{box-shadow:0 0 0 8px rgba(31,111,235,0)}}
  #arya-input input{flex:1;min-width:0;background:#fff;border:1px solid var(--line);padding:12px 14px;color:var(--ink);font-family:var(--fb);font-size:14px;outline:none;transition:.18s}
  #arya-input input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(31,111,235,.12)}
  #arya-input .act{position:relative;width:46px;height:46px;flex:0 0 auto;border:none;cursor:pointer;color:#fff;display:grid;place-items:center;transition:.18s}
  #arya-input .act svg{width:18px;height:18px}
  .act.send{background:linear-gradient(135deg,var(--blue),var(--tealDark))}
  .act.send:hover{filter:brightness(1.08)}
  .act.stop{background:var(--ink)}
  .act.stop::after{content:"";position:absolute;width:14px;height:14px;background:#fff}
  @media(max-width:760px){
    #arya-panel{width:100%;max-width:100%;height:100%;max-height:100%;margin:0}
    #arya-body{flex-direction:column}
    #arya-stage{width:100%;height:150px;flex-direction:row;gap:12px;border-right:none;border-bottom:1px solid var(--line)}
    .mascot{transform:scale(.6)}
    .sName .n{font-size:16px}
  }`;
  const styleEl = document.createElement("style"); styleEl.textContent = css; document.head.appendChild(styleEl);

  /* ===================== ICONS ===================== */
  const ICON = `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="7" width="14" height="11" fill="#fff"/><circle cx="9.5" cy="12" r="1.6" fill="#1f6feb"/><circle cx="14.5" cy="12" r="1.6" fill="#1f6feb"/><rect x="11" y="2.5" width="2" height="4" fill="#00b8c4"/><circle cx="12" cy="2" r="1.6" fill="#00b8c4"/></svg>`;
  const I_MAX = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
  const I_MUTE = `<svg viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#fff"/><path d="M19 5a10 10 0 010 14M15.5 8.5a5 5 0 010 7" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
  const I_MUTED = `<svg viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#fff"/><line x1="23" y1="9" x2="17" y2="15" stroke="#fff" stroke-width="2" stroke-linecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
  const I_CLOSE = `<svg viewBox="0 0 24 24" fill="none"><line x1="6" y1="6" x2="18" y2="18" stroke="#fff" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="6" x2="6" y2="18" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
  const I_MIC = `<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 10a7 7 0 0014 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const I_SEND = `<svg viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M22 2L15 22l-4-9-9-4 20-7z" fill="#fff"/></svg>`;

  /* ===================== HTML ===================== */
  const root = document.createElement("div"); root.id = "arya-root";
  root.innerHTML = `
    <div id="arya-bubble">
      <div class="pop">Namaste! May I help you?</div>
      <div class="orb">${ICON}</div>
    </div>
    <div id="arya-overlay">
      <div id="arya-panel">
        <div id="arya-head">
          <div class="mini">${ICON}</div>
          <div><h2>Arya</h2><div class="sub"><span class="dot"></span>IT &amp; ERP Assistant · online</div></div>
          <div class="grow"></div>
          <button id="arya-max" title="Open full page">${I_MAX}</button>
          <button id="arya-mute" title="Toggle voice">${I_MUTE}</button>
          <button id="arya-close" title="Close">${I_CLOSE}</button>
        </div>
        <div id="arya-body">
          <div id="arya-stage">
            <div class="aGrid"></div>
            <div class="mascot" id="arya-mascot">
              <div class="aura"></div>
              <div class="ant"><div class="tip"></div></div>
              <div class="mhead"></div>
              <div class="face"><div class="eye l"></div><div class="eye r"></div><div class="mouth"></div></div>
              <div class="arm l"></div><div class="arm r"></div>
              <div class="bodyM"><div class="core"></div></div>
            </div>
            <div class="sName"><div class="n">Arya</div><div class="r">YOUR IT GUIDE</div></div>
            <div class="sState" id="arya-state">ready</div>
          </div>
          <div id="arya-chatcol">
            <div id="arya-msgs">
              <div class="aWelcome" id="arya-welcome">
                <span class="em">\uD83E\uDD16</span>
                Namaste! I am <b>Arya</b>.<br>Ask me in English, Hindi or Hinglish.
              </div>
            </div>
            <div id="arya-chips">
              <button class="aChip" data-q="Mujhe ERP pe staff ka form bharna hai">Staff form</button>
              <button class="aChip" data-q="Mujhe leave ka form bharna hai">Leave form</button>
              <button class="aChip" data-q="I have a network / internet problem">Network issue</button>
              <button class="aChip" data-q="I have a hardware problem (printer, PC, etc.)">Hardware issue</button>
              <button class="aChip" data-q="How do I reset my password?">Password reset</button>
            </div>
            <div id="arya-input">
              <button class="mic" id="arya-mic" title="Speak">${I_MIC}</button>
              <input id="arya-text" type="text" placeholder="Type in English, Hindi or Hinglish..." autocomplete="off" />
              <button class="act send" id="arya-send" title="Send">${I_SEND}</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  function init() { document.body.appendChild(root); wire(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  /* ===================== LOGIC ===================== */
  function wire() {
    const $ = (id) => document.getElementById(id);
    const bubble = $("arya-bubble"), pop = bubble.querySelector(".pop");
    const overlay = $("arya-overlay"), closeBtn = $("arya-close"), muteBtn = $("arya-mute"), maxBtn = $("arya-max");
    const msgs = $("arya-msgs"), text = $("arya-text"), sendBtn = $("arya-send");
    const micBtn = $("arya-mic"), mascot = $("arya-mascot"), stateEl = $("arya-state");
    const welcome = $("arya-welcome"), chips = $("arya-chips");
    let history = [], voiceOn = true, controller = null, streaming = false, currentAudio = null;

    // Stable per-session id so the backend keeps each user's form state separate.
    let sessionId = sessionStorage.getItem("arya_session");
    if (!sessionId) {
      sessionId = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem("arya_session", sessionId);
    }

    if (BUBBLE_DELAY_MS > 0) setTimeout(() => pop.classList.add("show"), BUBBLE_DELAY_MS);

    /* ---- helpers ---- */
    const setState = (s) => stateEl.textContent = s;
    const setMascot = (cls) => { mascot.classList.remove("talking", "searching", "listening", "happy"); if (cls) mascot.classList.add(cls); };
    // Briefly show a happy expression, then return to talking/idle.
    const expressHappy = (ms) => {
      mascot.classList.remove("searching", "listening");
      mascot.classList.add("happy");
      setTimeout(() => { if (currentAudio) mascot.classList.remove("happy"); }, ms || 1600);
    };

    // Detect language client-side just for the WELCOME line + UI hints.
    // (Actual replies are language-mirrored by the backend.)
    function detectLang(t) {
      if (/[\u0900-\u097F]/.test(t)) return "hi";
      const markers = /\b(kaise|kya|hai|hain|nahi|nahin|kar|karo|mujhe|aap|kyun|theek|accha|batao|chahiye|madad|mera|meri|kitna|kab|thoda)\b/i;
      return markers.test(t) ? "hinglish" : "en";
    }

    function formatMarkdown(t) {
      if (!t) return "";
      let html = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      html = html.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
      html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
      html = html.replace(/^\s*[-*]\s+(.+)$/gm, '\u2022 $1');
      html = html.replace(/\n/g, '<br>');
      return html;
    }

    function addMsg(content, who) {
      if (welcome) welcome.style.display = "none";
      const d = document.createElement("div"); d.className = "aMsg " + who;
      d.innerHTML = formatMarkdown(content);
      msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
    }
    function showThinking(label) {
      const d = document.createElement("div"); d.className = "aThink"; d.id = "arya-thinking";
      d.innerHTML = `<div class="aSpin"></div><span>${label || "Arya is thinking"}<span class="aDots"><span>.</span><span>.</span><span>.</span></span></span>`;
      msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
    }
    function hideThinking() { const t = $("arya-thinking"); if (t) t.remove(); }

    /* ---- Audio: play the per-request backend TTS file (data.audio) ---- */
    function stopAudio() {
      if (currentAudio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
    }
    function playAudio(audioFile, happy) {
      stopAudio();
      if (!voiceOn || !audioFile) { setMascot(""); setState("ready"); return; }
      try {
        currentAudio = new Audio(ARYA_API_URL + "/audio/" + audioFile);
        currentAudio.onplay = () => { setMascot("talking"); setState("speaking\u2026"); if (happy) expressHappy(1800); };
        currentAudio.onended = () => { setMascot(""); setState("ready"); currentAudio = null; };
        currentAudio.onerror = () => { setMascot(""); setState("ready"); currentAudio = null; };
        currentAudio.play().catch(() => { setMascot(""); setState("ready"); });
      } catch (e) { setMascot(""); setState("ready"); }
    }

    /* ---- WELCOME: greet with voice on first open per session ---- */
    function greet() {
      const lang = "en"; // institutional default; user can switch by typing
      const line = WELCOME[lang];
      addMsg(line, "b");
      chips.style.display = "flex";
      // Ask backend to synthesize the greeting so it is SPOKEN via TTS.
      if (voiceOn) {
        setMascot("talking"); setState("speaking\u2026");
        fetch(ARYA_API_URL + "/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "__welcome__", history: [], session_id: sessionId })
        }).then(r => r.json()).then(d => {
          // Prefer backend audio for the canned greeting; fall back silently.
          if (d && d.audio) playAudio(d.audio, true); else { setMascot("happy"); setState("ready"); }
        }).catch(() => { setMascot(""); setState("ready"); });
      }
    }

    function openPanel() {
      overlay.classList.add("open"); text.focus();
      if (!sessionStorage.getItem("arya_greeted")) {
        sessionStorage.setItem("arya_greeted", "1");
        setTimeout(greet, 350);
      }
    }

    bubble.onclick = openPanel;
    // Expose for the full-page route (chatbot.html) to trigger first-open greeting.
    window.__aryaOpen = openPanel;
    closeBtn.onclick = () => { overlay.classList.remove("open"); stopStream(); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.classList.remove("open"); stopStream(); } };
    maxBtn.onclick = () => window.open(FULLPAGE_URL, "_blank");
    muteBtn.onclick = () => {
      voiceOn = !voiceOn;
      muteBtn.innerHTML = voiceOn ? I_MUTE : I_MUTED;
      if (!voiceOn) { stopAudio(); setMascot(""); setState("ready"); }
    };
    chips.querySelectorAll(".aChip").forEach(c => c.onclick = () => { text.value = c.dataset.q; send(); });

    function setSendMode(s) {
      if (s) { sendBtn.classList.replace("send", "stop"); sendBtn.innerHTML = ""; sendBtn.title = "Stop"; }
      else { sendBtn.classList.replace("stop", "send"); sendBtn.innerHTML = I_SEND; sendBtn.title = "Send"; }
    }
    function stopStream() {
      if (controller) { controller.abort(); controller = null; }
      streaming = false; stopAudio();
      hideThinking(); setMascot(""); setState("ready"); setSendMode(false);
    }

    /* ---- SEND: concise, language-mirrored, voiced reply ---- */
    async function send() {
      if (streaming) { stopStream(); return; }
      const q = text.value.trim(); if (!q) return;
      addMsg(q, "u");
      history.push({ role: "user", content: q });
      if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
      text.value = "";
      streaming = true; setSendMode(true);

      const looksComplex = q.split(/\s+/).length > 4 || /\?|how|why|kaise|kyun/i.test(q);
      setMascot(looksComplex ? "searching" : "talking");
      setState(looksComplex ? "searching\u2026" : "thinking\u2026");
      showThinking("Arya is thinking");

      controller = new AbortController();
      try {
        const res = await fetch(ARYA_API_URL + "/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: q, history: history, session_id: sessionId }), signal: controller.signal
        });
        const data = await res.json();
        hideThinking();

        const reply = (data && data.reply) || "Sorry, no response received.";
        addMsg(reply, "b");
        history.push({ role: "assistant", content: reply });

        // Voice: play the backend's per-request audio (correct language).
        // Smile when a form was just submitted successfully.
        playAudio(data && data.audio, !!(data && data.submitted));
      } catch (err) {
        hideThinking();
        if (err.name === "AbortError") { /* user stopped */ }
        else {
          const lang = detectLang(q);
          const offline = {
            en: "Arya cannot reach the server. Please check that the backend is running.",
            hi: "\u0906\u0930\u094d\u092f\u093e \u0938\u0930\u094d\u0935\u0930 \u0938\u0947 \u0915\u0928\u0947\u0915\u094d\u091f \u0928\u0939\u0940\u0902 \u0939\u094b \u092a\u093e \u0930\u0939\u093e\u0964 \u0915\u0943\u092a\u092f\u093e \u091c\u093e\u0902\u091a\u0947\u0902 \u0915\u093f \u092c\u0948\u0915\u090f\u0902\u0921 \u091a\u093e\u0932\u0942 \u0939\u0948\u0964",
            hinglish: "Arya server se connect nahi ho pa raha. Kripya check kijiye ki backend chal raha hai."
          };
          addMsg(offline[lang] || offline.en, "b");
          setMascot(""); setState("ready");
        }
      } finally {
        streaming = false; controller = null; setSendMode(false);
        if (!voiceOn) { setMascot(""); setState("ready"); }
      }
    }

    sendBtn.onclick = send;
    text.addEventListener("keydown", e => { if (e.key === "Enter") send(); });

    /* ===================== SPEECH-TO-TEXT ===================== */
    let recordingStream = null, mediaRecorder = null, audioChunks = [], isRecording = false;
    const hasMR = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (hasMR) {
      micBtn.onclick = async () => {
        if (isRecording) {
          if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
          isRecording = false; return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          recordingStream = stream; audioChunks = [];
          const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
            : (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");
          mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
          mediaRecorder.onstop = async () => {
            if (recordingStream) recordingStream.getTracks().forEach(t => t.stop());
            micBtn.classList.remove("rec"); setMascot("");
            if (audioChunks.length === 0) { setState("ready"); return; }
            const ext = (mediaRecorder.mimeType || "").includes("webm") ? "webm" : "wav";
            const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/wav" });
            const fd = new FormData(); fd.append("file", blob, "recording." + ext);
            setState("transcribing\u2026");
            try {
              const res = await fetch(ARYA_API_URL + "/speech", { method: "POST", body: fd });
              if (!res.ok) throw new Error("Server " + res.status);
              const data = await res.json();
              if (data && data.text && data.text.trim()) { text.value = data.text; send(); }
              else { setState("couldn't hear \u2014 try again"); setTimeout(() => setState("ready"), 2000); }
            } catch (err) { setState("mic error \u2014 check backend"); setTimeout(() => setState("ready"), 2500); }
          };
          mediaRecorder.onerror = () => { isRecording = false; micBtn.classList.remove("rec"); setMascot(""); setState("ready"); };
          mediaRecorder.start(); isRecording = true;
          micBtn.classList.add("rec"); setMascot("listening"); setState("listening\u2026");
        } catch (err) {
          if (SR) startFallbackSR();
          else { setState("mic blocked"); setTimeout(() => setState("ready"), 2500); }
        }
      };
    } else if (SR) {
      micBtn.onclick = startFallbackSR;
    } else {
      micBtn.style.display = "none";
    }

    function startFallbackSR() {
      const rec = new SR(); rec.interimResults = false; rec.continuous = false;
      try {
        rec.lang = /[\u0900-\u097F]/.test(text.value) ? "hi-IN" : "en-IN";
        rec.start(); micBtn.classList.add("rec"); setMascot("listening"); setState("listening\u2026");
      } catch (e) { setState("mic error"); setTimeout(() => setState("ready"), 2000); }
      rec.onresult = (e) => { text.value = e.results[0][0].transcript; micBtn.classList.remove("rec"); setMascot(""); setState("ready"); send(); };
      rec.onend = () => { micBtn.classList.remove("rec"); setMascot(""); setState("ready"); };
      rec.onerror = () => { micBtn.classList.remove("rec"); setMascot(""); setState("ready"); };
    }
  }
})();
