// /**
//  * widget.js — Arya Chatbot Widget (self-contained, embeddable)
//  * ─────────────────────────────────────────────────────────────
//  * Drop into ANY page with ONE line:
//  *     <script src="widget.js"></script>
//  *
//  * Injects all HTML + CSS + fonts + logic. No other files needed
//  * (does NOT require arya-mascot.css — styles are inlined here).
//  *
//  * Features:
//  *   • Floating launcher orb with "May I help you?" popup
//  *   • Split panel: animated mascot (left) + chat (right)
//  *   • PAUSE/STOP button — abort a reply mid-stream
//  *   • Correct streaming read (matches FastAPI text/plain stream)
//  *   • Auto language mirroring handled by backend (no mode toggle)
//  *   • Browser voice (TTS) + mic (STT), Indian voices preferred
//  *
//  * DEPLOY: change ARYA_API_URL to 'http://10.140.10.24:8000' on the server.
//  */
// (function () {
//   "use strict";

//   /* ===================== CONFIG ===================== */
//   const ARYA_API_URL = "http://10.140.10.24:8000";   // ← change on Ubuntu server
//   const MAX_HISTORY = 10;
//   const BUBBLE_DELAY_MS = 2000;

//   /* ===================== FONTS ===================== */
//   const fontLink = document.createElement("link");
//   fontLink.rel = "stylesheet";
//   fontLink.href =
//     "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap";
//   document.head.appendChild(fontLink);

//   /* ===================== STYLES ===================== */
//   const css = `
//   #arya-root, #arya-root * { box-sizing:border-box; margin:0; padding:0; }
//   #arya-root {
//     --brand:#e7384a; --brand2:#ff6b6b; --brandDeep:#9e1b2b;
//     --gold:#ffc24b; --goldSoft:#ffd98a;
//     --panel:#14151c; --panel2:#1b1d27; --panel3:#22242f;
//     --line:#2a2d3c; --ink:#eef0f6; --muted:#888fa3; --user:#3b6bff; --ok:#34d399;
//     --fd:'Sora',sans-serif; --fb:'Outfit',sans-serif;
//   }

//   /* launcher */
//   #arya-bubble{position:fixed;bottom:24px;right:24px;z-index:99998;display:flex;align-items:center;gap:12px;cursor:pointer;animation:aBubbleIn .5s cubic-bezier(.2,.8,.2,1)}
//   @keyframes aBubbleIn{from{opacity:0;transform:translateY(20px) scale(.8)}to{opacity:1;transform:none}}
//   #arya-bubble .pop{background:#fff;color:#1a1c24;font-family:var(--fb);font-size:13.5px;font-weight:500;padding:10px 14px;border-radius:14px 14px 4px 14px;box-shadow:0 10px 30px rgba(0,0,0,.35);position:relative;animation:aPop 2.4s ease-in-out infinite;white-space:nowrap;opacity:0;transition:opacity .4s}
//   #arya-bubble .pop.show{opacity:1}
//   @keyframes aPop{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
//   #arya-bubble .pop::after{content:"";position:absolute;right:-5px;bottom:8px;width:10px;height:10px;background:#fff;transform:rotate(45deg)}
//   #arya-bubble .orb{width:62px;height:62px;border-radius:50%;flex:0 0 auto;position:relative;background:radial-gradient(circle at 35% 30%,var(--brand2),var(--brandDeep));box-shadow:0 8px 28px rgba(231,56,74,.5);display:grid;place-items:center;animation:aOrb 2.4s ease-in-out infinite}
//   @keyframes aOrb{0%,100%{box-shadow:0 8px 28px rgba(231,56,74,.5),0 0 0 0 rgba(231,56,74,.45)}50%{box-shadow:0 8px 28px rgba(231,56,74,.5),0 0 0 14px rgba(231,56,74,0)}}
//   #arya-bubble .orb svg{width:34px;height:34px}

//   /* overlay + panel */
//   #arya-overlay{position:fixed;inset:0;z-index:99999;display:none;background:rgba(6,7,12,.35);align-items:flex-end;justify-content:flex-end;padding:0;animation:aFade .25s ease}
//   @keyframes aFade{from{opacity:0}to{opacity:1}}
//   #arya-overlay.open{display:flex}
//   #arya-panel{width:720px;max-width:calc(100vw - 36px);height:540px;max-height:calc(100vh - 36px);margin:0 24px 24px 0;background:linear-gradient(180deg,var(--panel),#101119);border:1px solid var(--line);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px -15px rgba(0,0,0,.7);animation:aPanel .3s cubic-bezier(.2,.8,.2,1)}
//   @keyframes aPanel{from{opacity:0;transform:translateY(30px) scale(.96)}to{opacity:1;transform:none}}

//   /* header */
//   #arya-head{background:linear-gradient(110deg,var(--brand),var(--brandDeep));padding:14px 18px;display:flex;align-items:center;gap:12px;flex:0 0 auto}
//   #arya-head .mini{width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.16);display:grid;place-items:center}
//   #arya-head .mini svg{width:22px;height:22px}
//   #arya-head h2{font-family:var(--fd);font-size:18px;color:#fff;font-weight:600;line-height:1}
//   #arya-head .sub{font-size:11px;color:rgba(255,255,255,.8);margin-top:3px}
//   #arya-head .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--ok);margin-right:5px;box-shadow:0 0 6px var(--ok)}
//   #arya-head .grow{flex:1}
//   #arya-head button{width:34px;height:34px;border:none;border-radius:50%;cursor:pointer;background:rgba(255,255,255,.15);color:#fff;display:grid;place-items:center;transition:.18s;font-size:15px}
//   #arya-head button:hover{background:rgba(255,255,255,.3)}

//   #arya-body{flex:1;display:flex;min-height:0}

//   /* mascot stage — LEFT column */
//   #arya-stage{width:240px;flex:0 0 auto;position:relative;overflow:hidden;background:radial-gradient(120% 80% at 50% 18%,rgba(231,56,74,.14),transparent 60%),linear-gradient(180deg,#0e0f16,#0b0c12);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;border-right:1px solid var(--line)}
//   .aGrid{position:absolute;inset:0;opacity:.22;background-image:linear-gradient(rgba(231,56,74,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(231,56,74,.08) 1px,transparent 1px);background-size:24px 24px;-webkit-mask-image:radial-gradient(circle at 50% 35%,#000,transparent 75%);mask-image:radial-gradient(circle at 50% 35%,#000,transparent 75%)}
//   .mascot{position:relative;width:130px;height:158px;animation:aFloat 4s ease-in-out infinite}
//   @keyframes aFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
//   .mascot.talking{animation:aFloat 1.4s ease-in-out infinite}
//   .aura{position:absolute;left:50%;top:44%;width:150px;height:150px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(231,56,74,.35),transparent 65%);filter:blur(6px);opacity:.5;transition:.3s}
//   .mascot.talking .aura{opacity:1;animation:aAura .9s ease-in-out infinite}
//   @keyframes aAura{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.12)}}
//   .ant{position:absolute;left:50%;top:-5px;width:3px;height:18px;background:linear-gradient(#7a8095,#cbd2e6);transform:translateX(-50%);border-radius:3px}
//   .ant .tip{position:absolute;top:-7px;left:50%;width:10px;height:10px;border-radius:50%;transform:translateX(-50%);background:var(--gold);box-shadow:0 0 12px var(--gold);animation:aTip 2s ease-in-out infinite}
//   @keyframes aTip{0%,100%{box-shadow:0 0 8px var(--gold)}50%{box-shadow:0 0 18px var(--gold)}}
//   .mhead{position:absolute;left:50%;top:14px;width:104px;height:84px;transform:translateX(-50%);background:linear-gradient(160deg,#fff,#dde3f2);border-radius:22px;box-shadow:inset 0 -5px 10px rgba(120,130,160,.3),0 7px 16px rgba(0,0,0,.35)}
//   .face{position:absolute;left:50%;top:30px;width:84px;height:46px;transform:translateX(-50%);background:#11203b;border-radius:14px;overflow:hidden;box-shadow:inset 0 0 12px rgba(0,0,0,.6)}
//   .eye{position:absolute;top:15px;width:14px;height:14px;border-radius:50%;background:var(--gold);box-shadow:0 0 10px var(--gold);animation:aBlink 4.5s infinite}
//   .eye.l{left:18px}.eye.r{right:18px}
//   @keyframes aBlink{0%,95%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}
//   .mascot.talking .eye{animation:aBlink 4.5s infinite,aEye 1s infinite}
//   @keyframes aEye{0%,100%{box-shadow:0 0 10px var(--gold)}50%{box-shadow:0 0 18px var(--goldSoft)}}
//   .mouth{position:absolute;left:50%;bottom:8px;width:26px;height:4px;transform:translateX(-50%);background:var(--gold);border-radius:4px;transition:.15s}
//   .mascot.talking .mouth{animation:aTalk .28s infinite}
//   @keyframes aTalk{0%,100%{height:4px;width:26px}50%{height:11px;width:17px;border-radius:7px}}
//   .bodyM{position:absolute;left:50%;top:104px;width:72px;height:52px;transform:translateX(-50%);background:linear-gradient(160deg,#fff,#dde3f2);border-radius:16px 16px 12px 12px;box-shadow:inset 0 -5px 9px rgba(120,130,160,.3),0 7px 14px rgba(0,0,0,.3)}
//   .core{position:absolute;left:50%;top:17px;width:22px;height:22px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle at 40% 35%,var(--brand2),var(--brandDeep));box-shadow:0 0 14px rgba(231,56,74,.7);animation:aCore 2s ease-in-out infinite}
//   @keyframes aCore{0%,100%{box-shadow:0 0 12px rgba(231,56,74,.6)}50%{box-shadow:0 0 22px rgba(231,56,74,.9)}}
//   .arm{position:absolute;top:110px;width:12px;height:35px;background:linear-gradient(#eef1f8,#cfd6e6);border-radius:7px}
//   .arm.l{left:22px;transform-origin:top;animation:aArmL 4s ease-in-out infinite}
//   .arm.r{right:22px;transform-origin:top;animation:aArmR 4s ease-in-out infinite}
//   @keyframes aArmL{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-4deg)}}
//   @keyframes aArmR{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(4deg)}}
//   .sName{text-align:center;z-index:2}
//   .sName .n{font-family:var(--fd);font-size:21px;font-weight:700;background:linear-gradient(90deg,var(--gold),var(--brand2));-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:.5px}
//   .sName .r{font-size:10px;color:var(--muted);letter-spacing:2px;margin-top:2px}
//   .sState{font-size:10.5px;color:var(--goldSoft);margin-top:6px;height:13px;letter-spacing:.5px;z-index:2}

//   /* chat col */
//   #arya-chatcol{flex:1;display:flex;flex-direction:column;min-width:0}
//   #arya-msgs{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:13px}
//   #arya-msgs::-webkit-scrollbar{width:7px}#arya-msgs::-webkit-scrollbar-thumb{background:var(--line);border-radius:8px}
//   .aWelcome{text-align:center;margin:auto 0;color:var(--muted)}
//   .aWelcome .em{font-size:40px;display:block;margin-bottom:8px}
//   .aWelcome b{color:var(--ink)}
//   /* === Message bubbles === */
//   .aMsgWrap{display:flex;flex-direction:column;gap:5px;animation:aMsgIn .32s cubic-bezier(.2,.8,.2,1)}
//   @keyframes aMsgIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
//   .aMsgWrap.u{align-items:flex-end}
//   .aMsgWrap.b{align-items:flex-start}
//   /* Meta row: avatar + name */
//   .aMsgMeta{display:flex;align-items:center;gap:7px;padding:0 6px}
//   .aMsgWrap.u .aMsgMeta{flex-direction:row-reverse}
//   .aMsgAvatar{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;font-size:11px;font-weight:700;letter-spacing:0}
//   .aMsgWrap.u .aMsgAvatar{background:linear-gradient(135deg,#4d7eff,#264fd0);color:#fff;box-shadow:0 2px 10px rgba(59,107,255,.45)}
//   .aMsgWrap.b .aMsgAvatar{background:linear-gradient(135deg,var(--brand),var(--brandDeep));color:#fff;box-shadow:0 2px 10px rgba(231,56,74,.4)}
//   .aMsgName{font-size:10.5px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);font-family:var(--fd)}
//   /* Bubble */
//   .aMsg{max-width:82%;padding:13px 18px 26px;border-radius:18px;font-size:14px;line-height:1.7;white-space:pre-wrap;word-wrap:break-word;position:relative;font-family:var(--fb)}
//   .aMsgWrap.u .aMsg{background:linear-gradient(140deg,#4d7eff,#2952d9);color:#fff;border-top-right-radius:6px;border-bottom-right-radius:5px;box-shadow:0 5px 20px rgba(59,107,255,.28)}
//   .aMsgWrap.b .aMsg{background:rgba(30,32,48,.92);border:1px solid rgba(255,255,255,.08);border-top-left-radius:6px;border-bottom-left-radius:5px;color:#dde2f0;box-shadow:0 5px 20px rgba(0,0,0,.28);padding-left:20px}
//   .aMsgWrap.b .aMsg::before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:3px;border-radius:0 2px 2px 0;background:linear-gradient(180deg,var(--brand),var(--brandDeep));opacity:.7}
//   .aMsg .t{display:block}
//   .aMsg .aRespTime{position:absolute;bottom:6px;right:11px;font-size:10px;color:var(--muted);display:flex;align-items:center;gap:3px;opacity:.65;white-space:nowrap}
//   .aMsg .aRespTime svg{width:10px;height:10px;flex:0 0 auto}
//   .aThink{align-self:flex-start;display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12.5px;background:rgba(30,32,48,.85);border:1px solid rgba(255,255,255,.06);padding:11px 16px;border-radius:16px;box-shadow:0 4px 14px rgba(0,0,0,.25)}
//   .aSpin{width:13px;height:13px;border:2px solid var(--line);border-top-color:var(--gold);border-radius:50%;animation:aSpin .7s linear infinite}
//   @keyframes aSpin{to{transform:rotate(360deg)}}
//   .aDots span{animation:aBd 1.2s infinite}.aDots span:nth-child(2){animation-delay:.2s}.aDots span:nth-child(3){animation-delay:.4s}
//   @keyframes aBd{0%,60%,100%{opacity:.3}30%{opacity:1}}

//   #arya-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 18px 10px}
//   .aChip{background:transparent;border:1px solid var(--line);color:var(--goldSoft);font-family:var(--fb);font-size:12px;padding:6px 12px;border-radius:20px;cursor:pointer;transition:.16s}
//   .aChip:hover{background:rgba(255,194,75,.12);border-color:var(--gold)}

//   #arya-input{padding:12px 16px 16px;border-top:1px solid var(--line);background:var(--panel2);display:flex;gap:9px;align-items:center;flex:0 0 auto}
//   #arya-input .mic{width:42px;height:42px;flex:0 0 auto;border:none;border-radius:50%;cursor:pointer;background:var(--panel3);color:var(--muted);font-size:16px;transition:.18s;display:grid;place-items:center}
//   #arya-input .mic:hover{color:var(--gold);background:#2a2d3c}
//   #arya-input .mic.rec{background:var(--brand);color:#fff;animation:aRec 1s infinite}
//   @keyframes aRec{0%,100%{box-shadow:0 0 0 0 rgba(231,56,74,.5)}50%{box-shadow:0 0 0 8px rgba(231,56,74,0)}}
//   #arya-input input{flex:1;min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:12px 14px;color:var(--ink);font-family:var(--fb);font-size:14px;outline:none;transition:.18s}
//   #arya-input input:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(231,56,74,.12)}
//   #arya-input .act{position:relative;width:46px;height:46px;flex:0 0 auto;border:none;border-radius:50%;cursor:pointer;color:#fff;font-size:17px;display:grid;place-items:center;transition:.18s}
//   .act.send{background:linear-gradient(135deg,var(--brand),var(--brandDeep));box-shadow:0 4px 14px rgba(231,56,74,.4)}
//   .act.send:hover{transform:scale(1.07);box-shadow:0 6px 18px rgba(231,56,74,.55)}
//   .act.stop{background:linear-gradient(135deg,#e7384a,#9e1b2b)}
//   .act.stop:hover{transform:scale(1.06)}
//   .act.stop::after{content:"";position:absolute;width:14px;height:14px;border-radius:3px;background:#fff}
//   #arya-pausebtn{width:38px;height:38px;flex:0 0 auto;border:none;border-radius:50%;cursor:pointer;background:var(--panel3);color:var(--muted);display:grid;place-items:center;transition:.18s;opacity:.45;pointer-events:none}
//   #arya-pausebtn.active{opacity:1;pointer-events:auto;color:var(--goldSoft);background:#2a2d3c}
//   #arya-pausebtn.active:hover{background:#313447;color:var(--gold)}
//   #arya-pausebtn.paused{color:var(--ok);background:rgba(52,211,153,.12)}

//   @media(max-width:760px){
//     #arya-panel{width:100%;max-width:100%;height:100%;max-height:100%;margin:0;border-radius:0}
//     #arya-body{flex-direction:column}
//     #arya-stage{width:100%;height:150px;flex-direction:row;gap:12px;border-right:none;border-bottom:1px solid var(--line)}
//     .mascot{transform:scale(.66)}
//     .sName .n{font-size:17px}
//   }`;
//   const styleEl = document.createElement("style");
//   styleEl.textContent = css;
//   document.head.appendChild(styleEl);

//   /* ===================== SVG icon ===================== */
//   const ICON = `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="7" width="14" height="11" rx="4" fill="#fff"/><circle cx="9.5" cy="12" r="1.6" fill="#e7384a"/><circle cx="14.5" cy="12" r="1.6" fill="#e7384a"/><rect x="11" y="2.5" width="2" height="4" rx="1" fill="#ffc24b"/><circle cx="12" cy="2" r="1.6" fill="#ffc24b"/></svg>`;

//   /* ===================== HTML ===================== */
//   const root = document.createElement("div");
//   root.id = "arya-root";
//   root.innerHTML = `
//     <div id="arya-bubble">
//       <div class="pop">Namaste! May I help you? 👋</div>
//       <div class="orb">${ICON}</div>
//     </div>
//     <div id="arya-overlay">
//       <div id="arya-panel">
//         <div id="arya-head">
//           <div class="mini">${ICON}</div>
//           <div><h2>Arya</h2><div class="sub"><span class="dot"></span>BICTU AI Assistant · online</div></div>
//           <div class="grow"></div>
//           <button id="arya-mute" title="Toggle voice"><svg id="arya-mute-icon" viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#fff"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></button>
//           <button id="arya-close" title="Close">✕</button>
//         </div>
//         <div id="arya-body">
//           <div id="arya-stage">
//             <div class="aGrid"></div>
//             <div class="mascot" id="arya-mascot">
//               <div class="aura"></div>
//               <div class="ant"><div class="tip"></div></div>
//               <div class="mhead"></div>
//               <div class="face"><div class="eye l"></div><div class="eye r"></div><div class="mouth"></div></div>
//               <div class="arm l"></div><div class="arm r"></div>
//               <div class="bodyM"><div class="core"></div></div>
//             </div>
//             <div class="sName"><div class="n">Arya</div><div class="r">YOUR AI GUIDE</div></div>
//             <div class="sState" id="arya-state">ready</div>
//           </div>
//           <div id="arya-chatcol">
//             <div id="arya-msgs">
//               <div class="aWelcome" id="arya-welcome">
//                 <span class="em">🤖</span>
//                 Namaste! I am <b>Arya</b>.<br>You can ask me in — English, Hindi or Hinglish!
//               </div>
//             </div>
//             <div id="arya-chips">
//               <button class="aChip" data-q="Who are you?">Who are you?</button>
//               <button class="aChip" data-q="I need account help">Account help</button>
//               <button class="aChip" data-q="I have a technical problem">Tech support</button>
//               <button class="aChip" data-q="What services does BICTU offer?">Services</button>
//             </div>
//             <div id="arya-input">
//               <button class="mic" id="arya-mic" title="Speak"><svg viewBox="0 0 24 24" fill="none" width="18" height="18"><rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 10a7 7 0 0014 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
//               <input id="arya-text" type="text" placeholder="Ask me anything..." autocomplete="off" />
//               <button id="arya-pausebtn" title="Pause / Resume voice"><svg id="arya-pause-icon" viewBox="0 0 24 24" fill="none" width="16" height="16"><rect x="6" y="4" width="4" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1.5" fill="currentColor"/></svg></button>
//               <button class="act send" id="arya-send" title="Send"><svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M22 2L11 13" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M22 2L15 22l-4-9-9-4 20-7z" fill="#fff"/></svg></button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>`;

//   function init() {
//     document.body.appendChild(root);
//     wire();
//   }
//   if (document.readyState === "loading") {
//     document.addEventListener("DOMContentLoaded", init);
//   } else {
//     init();
//   }

//   /* ===================== LOGIC ===================== */
//   function wire() {
//     const $ = (id) => document.getElementById(id);
//     const bubble = $("arya-bubble"), pop = bubble.querySelector(".pop");
//     const overlay = $("arya-overlay"), closeBtn = $("arya-close"), muteBtn = $("arya-mute");
//     const msgs = $("arya-msgs"), text = $("arya-text"), sendBtn = $("arya-send");
//     const micBtn = $("arya-mic"), mascot = $("arya-mascot"), stateEl = $("arya-state");
//     const welcome = $("arya-welcome"), chips = $("arya-chips");
//     const pauseBtn = $("arya-pausebtn");

//     let history = [], voiceOn = true, controller = null, streaming = false;
//     let currentAudio = null;

//     if (BUBBLE_DELAY_MS > 0) setTimeout(() => pop.classList.add("show"), BUBBLE_DELAY_MS);

//     bubble.onclick = () => { overlay.classList.add("open"); text.focus(); };
//     closeBtn.onclick = () => { overlay.classList.remove("open"); stopStream(); };
//     overlay.onclick = (e) => { if (e.target === overlay) { overlay.classList.remove("open"); stopStream(); } };
//     const muteIconOn = `<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#fff"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
//     const muteIconOff = `<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#fff"/><line x1="23" y1="9" x2="17" y2="15" stroke="#fff" stroke-width="2" stroke-linecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
//     const pauseIconSvg = `<svg viewBox="0 0 24 24" fill="none" width="16" height="16"><rect x="6" y="4" width="4" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1.5" fill="currentColor"/></svg>`;
//     const playIconSvg = `<svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M6 4l14 8-14 8V4z" fill="currentColor"/></svg>`;

//     muteBtn.onclick = () => {
//       voiceOn = !voiceOn;
//       muteBtn.innerHTML = voiceOn ? muteIconOn : muteIconOff;
//       if (currentAudio) {
//         currentAudio.volume = voiceOn ? 1.0 : 0.0;
//       }
//     };
//     chips.querySelectorAll(".aChip").forEach((c) => (c.onclick = () => { text.value = c.dataset.q; send(); }));

//     const setState = (s) => (stateEl.textContent = s);
//     const talkOn = () => mascot.classList.add("talking");
//     const talkOff = () => mascot.classList.remove("talking");

//     const timerIcon = `<svg viewBox="0 0 24 24" fill="none" width="10" height="10"><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="2"/><path d="M12 9v4l2.5 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 2v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

//     function addMsg(content, who, respTime) {
//       if (welcome) welcome.style.display = "none";
//       const wrap = document.createElement("div");
//       wrap.className = "aMsgWrap " + who;
//       const avatarLetter = who === "u" ? "Y" : "A";
//       const nameLabel = who === "u" ? "You" : "Arya";
//       const timeTag = (who === "b" && respTime != null)
//         ? `<span class="aRespTime">${timerIcon}${respTime}s</span>` : "";
//       wrap.innerHTML = `
//         <div class="aMsgMeta">
//           <div class="aMsgAvatar">${avatarLetter}</div>
//           <span class="aMsgName">${nameLabel}</span>
//         </div>
//         <div class="aMsg"><span class="t"></span>${timeTag}</div>`;
//       wrap.querySelector(".t").textContent = content;
//       msgs.appendChild(wrap);
//       msgs.scrollTop = msgs.scrollHeight;
//       return wrap.querySelector(".t");
//     }

//     function setPauseBtn(active, paused) {
//       pauseBtn.classList.toggle("active", active);
//       pauseBtn.classList.toggle("paused", paused);
//       pauseBtn.innerHTML = paused ? playIconSvg : pauseIconSvg;
//       pauseBtn.title = paused ? "Resume voice" : "Pause voice";
//     }
//     function showThinking() {
//       const d = document.createElement("div");
//       d.className = "aThink"; d.id = "arya-thinking";
//       d.innerHTML = `<div class="aSpin"></div><span>Arya is thinking...<span class="aDots"><span>.</span><span>.</span><span>.</span></span></span>`;
//       msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
//     }
//     function hideThinking() { const t = $("arya-thinking"); if (t) t.remove(); }

//     pauseBtn.onclick = () => {
//       if (!currentAudio) return;
//       if (currentAudio.paused) {
//         currentAudio.play().catch(err => console.error("Resume play failed:", err));
//         setPauseBtn(true, false);
//         talkOn();
//       } else {
//         currentAudio.pause();
//         setPauseBtn(true, true);
//         talkOff();
//       }
//     };

//     const sendIconSvg = `<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M22 2L11 13" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M22 2L15 22l-4-9-9-4 20-7z" fill="#fff"/></svg>`;
//     function setSendMode(isStreaming) {
//       if (isStreaming) { sendBtn.classList.replace("send", "stop"); sendBtn.innerHTML = ""; sendBtn.title = "Stop"; }
//       else { sendBtn.classList.replace("stop", "send"); sendBtn.innerHTML = sendIconSvg; sendBtn.title = "Send"; }
//     }
//     function stopStream() {
//       if (controller) { controller.abort(); controller = null; }
//       streaming = false;
//       if (currentAudio) {
//         currentAudio.pause();
//         currentAudio = null;
//       }
//       hideThinking(); talkOff(); setState("ready"); setSendMode(false); setPauseBtn(false, false);
//     }

//     async function send() {
//       if (streaming) { stopStream(); return; }   // button = STOP mid-stream
//       const q = text.value.trim(); if (!q) return;
//       addMsg(q, "u");
//       history.push({ role: "user", content: q });
//       if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
//       text.value = "";
//       streaming = true; setSendMode(true); talkOn(); setState("thinking…"); showThinking();

//       controller = new AbortController();
//       let target = null, full = "";
//       try {
//         const res = await fetch(ARYA_API_URL + "/chat", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ message: q, history: history }),
//           signal: controller.signal,
//         });
//         hideThinking();
//         setState("speaking…");

//         const data = await res.json();

//         full = data.reply;

//         target = addMsg(full, "b", data.response_time);

//         history.push({
//           role: "assistant",
//           content: full
//         });

//         if (currentAudio) {
//           currentAudio.pause();
//           currentAudio = null;
//         }

//         try {
//           currentAudio = new Audio(
//             ARYA_API_URL +
//             "/audio?t=" +
//             Date.now()
//           );
//           currentAudio.volume = voiceOn ? 1.0 : 0.0;

//           currentAudio.onplay = () => {
//             talkOn();
//             setPauseBtn(true, false);
//           };

//           currentAudio.onended = () => {
//             talkOff();
//             setState("ready");
//             setPauseBtn(false, false);
//             currentAudio = null;
//           };

//           currentAudio.onerror = (err) => {
//             console.error("Audio playback error:", err);
//             talkOff();
//             setState("ready");
//             setPauseBtn(false, false);
//             currentAudio = null;
//           };

//           await currentAudio.play();

//         } catch (err) {
//           console.error(
//             "Audio playback failed:",
//             err
//           );
//         }

//       } catch (err) {
//         if (err.name === "AbortError") return;
//         console.error("Chat error:", err);
//         hideThinking();
//         addMsg("Sorry, I encountered an error. Please try again.", "b");
//       } finally {
//         streaming = false;
//         setSendMode(false);
//       }
//     }

//     sendBtn.onclick = send;
//     text.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });


//     console.log("MediaDevices:", !!navigator.mediaDevices);
//     console.log("getUserMedia:", !!navigator.mediaDevices?.getUserMedia);
//     console.log("MediaRecorder:", !!window.MediaRecorder);
//     console.log("SpeechRecognition:", !!(window.SpeechRecognition || window.webkitSpeechRecognition));


//     // speech-to-text (MediaRecorder → backend /speech, fallback to browser SpeechRecognition)
//     const hasMR = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
//     const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

//     if (hasMR) {
//       // ─── MediaRecorder path (sends audio to backend Whisper) ───
//       let recordingStream = null;
//       let mediaRecorder = null;
//       let audioChunks = [];
//       let isRecording = false;

//       micBtn.onclick = async () => {
//         // Stop recording
//         if (isRecording && mediaRecorder && mediaRecorder.state === "recording") {
//           mediaRecorder.stop();
//           isRecording = false;
//           return;
//         }

//         try {
//           const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//           recordingStream = stream;
//           audioChunks = [];

//           // Use webm/opus which is well-supported; Whisper can decode it
//           const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
//             ? "audio/webm;codecs=opus"
//             : (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");
//           mediaRecorder = mimeType
//             ? new MediaRecorder(stream, { mimeType })
//             : new MediaRecorder(stream);

//           mediaRecorder.ondataavailable = (e) => {
//             if (e.data && e.data.size > 0) audioChunks.push(e.data);
//           };

//           mediaRecorder.onstop = async () => {
//             // Release mic
//             if (recordingStream) recordingStream.getTracks().forEach(t => t.stop());
//             micBtn.classList.remove("rec");

//             if (audioChunks.length === 0) { setState("ready"); return; }

//             const ext = (mediaRecorder.mimeType || "").includes("webm") ? "webm" : "wav";
//             const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/wav" });
//             const formData = new FormData();
//             formData.append("file", audioBlob, "recording." + ext);

//             setState("transcribing…");

//             try {
//               const res = await fetch(ARYA_API_URL + "/speech", {
//                 method: "POST",
//                 body: formData,
//               });
//               if (!res.ok) throw new Error("Server returned " + res.status);
//               const data = await res.json();
//               if (data && data.text && data.text.trim()) {
//                 text.value = data.text;
//                 send();
//               } else {
//                 setState("couldn't hear — try again");
//                 setTimeout(() => setState("ready"), 2000);
//               }
//             } catch (err) {
//               console.error("STT fetch error:", err);
//               setState("mic error — check backend");
//               setTimeout(() => setState("ready"), 2500);
//             }
//           };

//           mediaRecorder.onerror = (e) => {
//             console.error("MediaRecorder error:", e);
//             isRecording = false;
//             micBtn.classList.remove("rec");
//             setState("ready");
//           };

//           mediaRecorder.start();
//           isRecording = true;
//           micBtn.classList.add("rec");
//           setState("listening…");
//         } catch (err) {
//           console.error("Microphone access denied or unavailable:", err);
//           alert(
//             "Mic Error: " +
//             err.name +
//             "\n" +
//             err.message
//           );
//           micBtn.classList.remove("rec");
//           isRecording = false;

//           if (err.name === 'NotFoundError') {
//             setState("no mic found");
//           } else if (err.name === 'NotAllowedError') {
//             setState("mic blocked");
//           } else {
//             if (SR) {
//               console.log("Falling back to native SpeechRecognition...");
//               startFallbackSR();
//               return;
//             }
//             setState("mic error");
//           }
//           setTimeout(() => setState("ready"), 2500);
//         }
//       };
//     } else if (SR) {
//       micBtn.onclick = startFallbackSR;
//     } else {
//       // No mic support at all
//       micBtn.style.display = "none";
//     }

//     function startFallbackSR() {
//       const rec = new SR();
//       rec.interimResults = false;
//       rec.continuous = false;

//       try {
//         rec.lang = /[\u0900-\u097F]/.test(text.value) ? "hi-IN" : "en-IN";
//         rec.start();
//         micBtn.classList.add("rec");
//         setState("listening…");
//       } catch (e) {
//         console.error("SpeechRecognition start error:", e);
//         setState("mic error");
//         setTimeout(() => setState("ready"), 2000);
//       }

//       rec.onresult = (e) => {
//         text.value = e.results[0][0].transcript;
//         micBtn.classList.remove("rec");
//         setState("ready");
//         send();
//       };

//       rec.onend = () => { micBtn.classList.remove("rec"); setState("ready"); };

//       rec.onerror = (e) => {
//         console.error("SpeechRecognition error:", e);
//         micBtn.classList.remove("rec");
//         if (e.error === 'not-allowed') {
//           setState("mic blocked");
//         } else if (e.error === 'audio-capture') {
//           setState("no mic found");
//         } else {
//           setState("mic error");
//         }
//         setTimeout(() => setState("ready"), 2500);
//       };
//     }
//   }
// })();

/**
 * widget.js — Arya Chatbot Widget (self-contained, embeddable)
 * Design: white + blue + teal/cyan. Square edges. Premium robot mascot.
 * Maximize → opens full page in new tab. First open per session → audio greeting.
 * Bubbles contained (padded), no You/Arya labels.
 * DEPLOY: set ARYA_API_URL + FULLPAGE_URL for your server.
 */
(function () {
  "use strict";

  const ARYA_API_URL = "http://localhost:8000";   // ← backend; change to http://10.140.10.24:8000
  const FULLPAGE_URL = "chatbot.html";            // ← maximize target; change to http://10.140.10.24/chatbot
  const MAX_HISTORY = 10;
  const BUBBLE_DELAY_MS = 2000;
  const GREETING_TEXT = "Hi, I am Arya. How may I help you?";

  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap";
  document.head.appendChild(fontLink);

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
  #arya-panel{width:720px;max-width:calc(100vw - 36px);height:560px;max-height:calc(100vh - 36px);margin:0 24px 24px 0;background:var(--panel);border:1px solid var(--line);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px -15px rgba(15,27,45,.45);animation:aPanel .3s ease}
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
  #arya-stage{width:240px;flex:0 0 auto;position:relative;overflow:hidden;background:linear-gradient(180deg,#0f2238,#0a1726);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;border-right:1px solid var(--line)}
  .aGrid{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(0,184,196,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(0,184,196,.10) 1px,transparent 1px);background-size:26px 26px;-webkit-mask-image:radial-gradient(circle at 50% 38%,#000,transparent 75%);mask-image:radial-gradient(circle at 50% 38%,#000,transparent 75%)}
  .mascot{position:relative;width:140px;height:170px;animation:aFloat 4s ease-in-out infinite}
  @keyframes aFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  .mascot.talking{animation:aFloat 1.5s ease-in-out infinite}
  .mascot.searching{animation:aFloat 2.2s ease-in-out infinite}
  .aura{position:absolute;left:50%;top:42%;width:160px;height:160px;transform:translate(-50%,-50%);border-radius:50% !important;background:radial-gradient(circle,rgba(0,184,196,.32),transparent 65%);filter:blur(8px);opacity:.55;transition:.3s}
  .mascot.talking .aura{opacity:1;background:radial-gradient(circle,rgba(31,111,235,.4),transparent 65%);animation:aAura .9s ease-in-out infinite}
  .mascot.searching .aura{opacity:.9;background:radial-gradient(circle,rgba(0,184,196,.45),transparent 65%);animation:aAura 1.4s ease-in-out infinite}
  @keyframes aAura{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.14)}}
  .ant{position:absolute;left:50%;top:-4px;width:3px;height:18px;background:linear-gradient(#cfe0f5,#9fb6d6);transform:translateX(-50%)}
  .ant .tip{position:absolute;top:-7px;left:50%;width:11px;height:11px;border-radius:50% !important;transform:translateX(-50%);background:var(--teal);box-shadow:0 0 12px var(--teal);animation:aTip 2s ease-in-out infinite}
  @keyframes aTip{0%,100%{box-shadow:0 0 8px var(--teal)}50%{box-shadow:0 0 18px var(--teal)}}
  .mascot.searching .ant .tip{animation:aTip .5s ease-in-out infinite}
  .mhead{position:absolute;left:50%;top:14px;width:112px;height:88px;transform:translateX(-50%);background:linear-gradient(160deg,#ffffff,#e3ebf6);box-shadow:inset 0 -6px 12px rgba(120,140,170,.35),0 8px 18px rgba(0,0,0,.4);border:2px solid #fff}
  .mhead::before{content:"";position:absolute;inset:6px;border:1px solid rgba(31,111,235,.15)}
  .face{position:absolute;left:50%;top:30px;width:90px;height:50px;transform:translateX(-50%);background:linear-gradient(160deg,#0c1a2e,#13294a);overflow:hidden;box-shadow:inset 0 0 16px rgba(0,0,0,.7)}
  .eye{position:absolute;top:16px;width:16px;height:16px;border-radius:50% !important;background:var(--teal);box-shadow:0 0 12px var(--teal);animation:aBlink 4.5s infinite}
  .eye.l{left:18px}.eye.r{right:18px}
  @keyframes aBlink{0%,95%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}
  .mascot.talking .eye{background:var(--blue);box-shadow:0 0 14px var(--blue);animation:aBlink 4.5s infinite,aEye 1s infinite}
  .mascot.searching .eye{animation:aScan 1.2s ease-in-out infinite}
  @keyframes aEye{0%,100%{box-shadow:0 0 12px var(--blue)}50%{box-shadow:0 0 20px #6ea8ff}}
  @keyframes aScan{0%,100%{transform:translateX(-4px)}50%{transform:translateX(4px)}}
  .mouth{position:absolute;left:50%;bottom:8px;width:28px;height:4px;transform:translateX(-50%);background:var(--teal);transition:.15s}
  .mascot.talking .mouth{background:var(--blue);animation:aTalk .28s infinite}
  @keyframes aTalk{0%,100%{height:4px;width:28px}50%{height:12px;width:18px}}
  .bodyM{position:absolute;left:50%;top:108px;width:78px;height:54px;transform:translateX(-50%);background:linear-gradient(160deg,#ffffff,#e3ebf6);box-shadow:inset 0 -5px 10px rgba(120,140,170,.3),0 7px 14px rgba(0,0,0,.35);border:2px solid #fff}
  .core{position:absolute;left:50%;top:16px;width:24px;height:24px;transform:translateX(-50%);border-radius:50% !important;background:radial-gradient(circle at 40% 35%,var(--teal),var(--blueDark));box-shadow:0 0 16px rgba(0,184,196,.8);animation:aCore 2s ease-in-out infinite}
  @keyframes aCore{0%,100%{box-shadow:0 0 12px rgba(0,184,196,.7)}50%{box-shadow:0 0 24px rgba(31,111,235,.9)}}
  .arm{position:absolute;top:114px;width:13px;height:38px;background:linear-gradient(#ffffff,#cfdbec);border:1px solid #e3ebf6}
  .arm.l{left:20px;transform-origin:top;animation:aArmL 4s ease-in-out infinite}
  .arm.r{right:20px;transform-origin:top;animation:aArmR 4s ease-in-out infinite}
  @keyframes aArmL{0%,100%{transform:rotate(10deg)}50%{transform:rotate(-3deg)}}
  @keyframes aArmR{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(3deg)}}
  .sName{text-align:center;z-index:2}
  .sName .n{font-family:var(--fd);font-size:21px;font-weight:700;color:#fff;letter-spacing:.5px}
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
    #arya-stage{width:100%;height:140px;flex-direction:row;gap:12px;border-right:none;border-bottom:1px solid var(--line)}
    .mascot{transform:scale(.6)}
    .sName .n{font-size:16px}
  }`;
  const styleEl = document.createElement("style"); styleEl.textContent = css; document.head.appendChild(styleEl);

  const ICON = `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="7" width="14" height="11" fill="#fff"/><circle cx="9.5" cy="12" r="1.6" fill="#1f6feb"/><circle cx="14.5" cy="12" r="1.6" fill="#1f6feb"/><rect x="11" y="2.5" width="2" height="4" fill="#00b8c4"/><circle cx="12" cy="2" r="1.6" fill="#00b8c4"/></svg>`;
  const I_MAX = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
  const I_MUTE = `<svg viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#fff"/><path d="M19 5a10 10 0 010 14M15.5 8.5a5 5 0 010 7" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
  const I_MUTED = `<svg viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#fff"/><line x1="23" y1="9" x2="17" y2="15" stroke="#fff" stroke-width="2" stroke-linecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
  const I_CLOSE = `<svg viewBox="0 0 24 24" fill="none"><line x1="6" y1="6" x2="18" y2="18" stroke="#fff" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="6" x2="6" y2="18" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
  const I_MIC = `<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 10a7 7 0 0014 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const I_SEND = `<svg viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M22 2L15 22l-4-9-9-4 20-7z" fill="#fff"/></svg>`;

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
          <div><h2>Arya</h2><div class="sub"><span class="dot"></span>BICTU AI Assistant · online</div></div>
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
            <div class="sName"><div class="n">Arya</div><div class="r">YOUR AI GUIDE</div></div>
            <div class="sState" id="arya-state">ready</div>
          </div>
          <div id="arya-chatcol">
            <div id="arya-msgs">
              <div class="aWelcome" id="arya-welcome">
                <span class="em">🤖</span>
                Namaste! I am <b>Arya</b>.<br>Ask me anything — English, Hindi or Hinglish!
              </div>
            </div>
            <div id="arya-chips">
              <button class="aChip" data-q="Who are you?">Who are you?</button>
              <button class="aChip" data-q="I need account help">Account help</button>
              <button class="aChip" data-q="I have a technical problem">Tech support</button>
              <button class="aChip" data-q="What services does BICTU offer?">Services</button>
            </div>
            <div id="arya-input">
              <button class="mic" id="arya-mic" title="Speak">${I_MIC}</button>
              <input id="arya-text" type="text" placeholder="Ask me anything..." autocomplete="off" />
              <button class="act send" id="arya-send" title="Send">${I_SEND}</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  function init() { document.body.appendChild(root); wire(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  function wire() {
    const $ = (id) => document.getElementById(id);
    const bubble = $("arya-bubble"), pop = bubble.querySelector(".pop");
    const overlay = $("arya-overlay"), closeBtn = $("arya-close"), muteBtn = $("arya-mute"), maxBtn = $("arya-max");
    const msgs = $("arya-msgs"), text = $("arya-text"), sendBtn = $("arya-send");
    const micBtn = $("arya-mic"), mascot = $("arya-mascot"), stateEl = $("arya-state");
    const welcome = $("arya-welcome"), chips = $("arya-chips");
    let history = [], voiceOn = true, controller = null, streaming = false, currentAudio = null;

    if (BUBBLE_DELAY_MS > 0) setTimeout(() => pop.classList.add("show"), BUBBLE_DELAY_MS);

    function openPanel() {
      overlay.classList.add("open"); text.focus();
      if (!sessionStorage.getItem("arya_greeted")) {
        sessionStorage.setItem("arya_greeted", "1");
        setTimeout(() => speak(GREETING_TEXT, "en"), 350);
      }
    }
    bubble.onclick = openPanel;
    closeBtn.onclick = () => { overlay.classList.remove("open"); stopStream(); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.classList.remove("open"); stopStream(); } };
    maxBtn.onclick = () => window.open(FULLPAGE_URL, "_blank");
    muteBtn.onclick = () => {
      voiceOn = !voiceOn;
      muteBtn.innerHTML = voiceOn ? I_MUTE : I_MUTED;
      if (!voiceOn) {
        if (window.speechSynthesis) speechSynthesis.cancel();
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }
        setMascot("");
        setState("ready");
      }
    };
    chips.querySelectorAll(".aChip").forEach(c => c.onclick = () => { text.value = c.dataset.q; send(); });

    const setState = (s) => stateEl.textContent = s;
    const setMascot = (cls) => { mascot.classList.remove("talking", "searching"); if (cls) mascot.classList.add(cls); };

    function formatMarkdown(text) {
      if (!text) return "";
      let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Code blocks
      html = html.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

      // Inline code
      html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

      // Bold text
      html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

      // Bullet points
      html = html.replace(/^\s*[-*]\s+(.+)$/gm, '• $1');

      // Newlines
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

    function speak(t, langHint) {
      if (!voiceOn || !window.speechSynthesis || !t.trim()) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t.replace(/[*#`_]/g, ""));
      const v = speechSynthesis.getVoices();
      const wantHi = langHint === "hi" || /[\u0900-\u097F]/.test(t);
      u.voice = (wantHi && v.find(x => /hi-IN/i.test(x.lang))) || v.find(x => /en-IN/i.test(x.lang)) || v.find(x => /en/i.test(x.lang)) || null;
      u.rate = 1.02;
      u.onstart = () => { setMascot("talking"); setState("speaking…"); };
      u.onend = () => { setMascot(""); setState("ready"); };
      speechSynthesis.speak(u);
    }

    function setSendMode(s) {
      if (s) { sendBtn.classList.replace("send", "stop"); sendBtn.innerHTML = ""; sendBtn.title = "Stop"; }
      else { sendBtn.classList.replace("stop", "send"); sendBtn.innerHTML = I_SEND; sendBtn.title = "Send"; }
    }
    function stopStream() {
      if (controller) { controller.abort(); controller = null; }
      streaming = false;
      if (window.speechSynthesis) speechSynthesis.cancel();
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      hideThinking(); setMascot(""); setState("ready"); setSendMode(false);
    }

    function playBackendTTS() {
      if (!voiceOn) {
        setMascot("");
        setState("ready");
        return;
      }
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      try {
        currentAudio = new Audio(ARYA_API_URL + "/audio?t=" + Date.now());
        currentAudio.volume = voiceOn ? 1.0 : 0.0;
        currentAudio.onplay = () => {
          setMascot("talking");
          setState("speaking…");
        };
        currentAudio.onended = () => {
          setMascot("");
          setState("ready");
          currentAudio = null;
        };
        currentAudio.onerror = (err) => {
          console.error("Backend audio playback error:", err);
          setMascot("");
          setState("ready");
          currentAudio = null;
        };
        currentAudio.play().catch(err => {
          console.error("Backend audio play failed:", err);
          setMascot("");
          setState("ready");
        });
      } catch (err) {
        console.error("Backend audio initialization failed:", err);
        setMascot("");
        setState("ready");
      }
    }

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
      setState(looksComplex ? "searching…" : "thinking…");
      showThinking(looksComplex ? "Arya is thinking" : "Arya is thinking");

      controller = new AbortController();
      let target = null, full = "";
      try {
        const res = await fetch(ARYA_API_URL + "/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: q, history: history }), signal: controller.signal
        });
        let data;
        let responseText = "";
        try {
          data = await res.json();
          if (typeof data === "string") {
            data = JSON.parse(data);
          }
          responseText = data.reply || "";
        } catch (e) {
          console.error("JSON parse failed, trying text fallback:", e);
          try {
            const textVal = await res.text();
            data = JSON.parse(textVal);
            responseText = data.reply || textVal;
          } catch (err) {
            responseText = "Error parsing response.";
          }
        }
        full = responseText;

        target = addMsg(full, "b");
        history.push({ role: "assistant", content: full });
        playBackendTTS();
      } catch (err) {
        hideThinking();
        if (err.name === "AbortError") { if (target) target.textContent = (full ? full + " " : "") + "…(stopped)"; }
        else { addMsg("Arya offline lag rahi hai. Backend chal raha hai? (" + err.message + ")", "b"); }
      } finally {
        streaming = false; controller = null; setSendMode(false);
        if (!voiceOn) { setMascot(""); setState("ready"); }
      }
    }

    sendBtn.onclick = send;
    text.addEventListener("keydown", e => { if (e.key === "Enter") send(); });

    let recordingStream = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    const hasMR = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (hasMR) {
      micBtn.onclick = async () => {
        if (isRecording) {
          if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
          isRecording = false;
          return;
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          recordingStream = stream;
          audioChunks = [];

          const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");

          mediaRecorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);

          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) audioChunks.push(e.data);
          };

          mediaRecorder.onstop = async () => {
            if (recordingStream) recordingStream.getTracks().forEach(t => t.stop());
            micBtn.classList.remove("rec");

            if (audioChunks.length === 0) { setState("ready"); return; }

            const ext = (mediaRecorder.mimeType || "").includes("webm") ? "webm" : "wav";
            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/wav" });
            const formData = new FormData();
            formData.append("file", audioBlob, "recording." + ext);

            setState("transcribing…");

            try {
              const res = await fetch(ARYA_API_URL + "/speech", {
                method: "POST",
                body: formData
              });
              if (!res.ok) throw new Error("Server error: " + res.status);
              const data = await res.json();
              if (data && data.text && data.text.trim()) {
                text.value = data.text;
                send();
              } else {
                setState("couldn't hear — try again");
                setTimeout(() => setState("ready"), 2000);
              }
            } catch (err) {
              console.error("STT server error:", err);
              setState("mic error — check backend");
              setTimeout(() => setState("ready"), 2500);
            }
          };

          mediaRecorder.onerror = (e) => {
            console.error("MediaRecorder error:", e);
            isRecording = false;
            micBtn.classList.remove("rec");
            setState("ready");
          };

          mediaRecorder.start();
          isRecording = true;
          micBtn.classList.add("rec");
          setState("listening…");

        } catch (err) {
          console.error("Failed to access microphone:", err);
          if (SR) {
            console.log("Falling back to native SpeechRecognition...");
            startFallbackSR();
          } else {
            setState("mic blocked");
            setTimeout(() => setState("ready"), 2500);
          }
        }
      };
    } else if (SR) {
      micBtn.onclick = startFallbackSR;
    } else {
      micBtn.style.display = "none";
    }

    function startFallbackSR() {
      const rec = new SR();
      rec.interimResults = false;
      rec.continuous = false;

      try {
        rec.lang = /[\u0900-\u097F]/.test(text.value) ? "hi-IN" : "en-IN";
        rec.start();
        micBtn.classList.add("rec");
        setState("listening…");
      } catch (e) {
        console.error("SpeechRecognition start error:", e);
        setState("mic error");
        setTimeout(() => setState("ready"), 2000);
      }

      rec.onresult = (e) => {
        text.value = e.results[0][0].transcript;
        micBtn.classList.remove("rec");
        setState("ready");
        send();
      };

      rec.onend = () => {
        micBtn.classList.remove("rec");
        setState("ready");
      };

      rec.onerror = (e) => {
        console.error("SpeechRecognition error:", e);
        micBtn.classList.remove("rec");
        setState("ready");
      };
    }

    if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { };
  }
})();