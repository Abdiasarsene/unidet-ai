/* ====== CONFIGURATION ====== */
const CONFIG = {
  API_URL: "https://VOTRE-API.up.railway.app", // URL de l'API déployée sur Railway (sans "/" final)
  ENDPOINT: "/chat",                            // POST {message, session_id} -> {answer}
  LANG: "fr-FR",
  TIMEOUT_MS: 60000,
};

/* ====== OUTILS ====== */
const $ = (s) => document.querySelector(s);
const chat = $("#chat"), input = $("#input"), micBtn = $("#mic"), sendBtn = $("#send");
const autoBtn = $("#autoread"), welcome = $("#welcome");

const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  mic: svg("M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z"),
  send: svg("M3 20.5 21 12 3 3.5v6.7l11 1.8-11 1.8z"),
  spk: svg("M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"),
  plus: svg("M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"),
};
micBtn.innerHTML = ICON.mic; sendBtn.innerHTML = ICON.send;
autoBtn.innerHTML = ICON.spk; $("#reset").innerHTML = ICON.plus;

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const md = (t) => esc(t)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/^\s*[-•*] (.+)$/gm, "<li>$1</li>")
  .replace(/(<li>.*?<\/li>\n?)+/g, (m) => "<ul>" + m.replace(/\n/g, "") + "</ul>")
  .replace(/\n/g, "<br>");

let sid = localStorage.getItem("unidet_sid") || crypto.randomUUID();
localStorage.setItem("unidet_sid", sid);

/* ====== MESSAGES ====== */
function addMsg(role, text) {
  welcome.hidden = true;
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerHTML = `<div class="bubble">${md(text)}</div>`;
  if (role === "bot") {
    const b = document.createElement("button");
    b.className = "speak"; b.innerHTML = ICON.spk + "Écouter";
    b.onclick = () => speak(text, b);
    el.append(b);
  }
  chat.append(el); chat.scrollTop = chat.scrollHeight;
  return el;
}
const addNote = (t) => { const n = document.createElement("p"); n.className = "note"; n.textContent = t; chat.append(n); chat.scrollTop = chat.scrollHeight; };

async function send(text) {
  text = (text || input.value).trim();
  if (!text || sendBtn.disabled) return;
  input.value = ""; grow(); stopListening(); speechSynthesis.cancel();
  addMsg("user", text);
  sendBtn.disabled = true;

  const typing = document.createElement("div");
  typing.className = "msg bot"; typing.innerHTML = '<div class="bubble typing"><i></i><i></i><i></i></div>';
  chat.append(typing); chat.scrollTop = chat.scrollHeight;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT_MS);
  try {
    const res = await fetch(CONFIG.API_URL + CONFIG.ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, session_id: sid }), signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const answer = data.answer ?? data.response ?? data.reply ?? data.message;
    if (!answer) throw new Error("Réponse vide");
    typing.remove();
    const el = addMsg("bot", answer);
    if (autoBtn.getAttribute("aria-pressed") === "true") speak(answer, el.querySelector(".speak"));
  } catch (e) {
    typing.remove();
    addNote(e.name === "AbortError"
      ? "L'assistant met trop de temps à répondre. Réessayez dans un instant."
      : "Impossible de joindre l'assistant. Vérifiez votre connexion puis réessayez.");
    console.error(e);
  } finally { clearTimeout(timer); sendBtn.disabled = false; input.focus(); }
}

/* ====== SAISIE ====== */
function grow() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 160) + "px"; }
input.addEventListener("input", grow);
input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
sendBtn.onclick = () => send();
document.querySelectorAll(".chips button").forEach((b) => (b.onclick = () => send(b.dataset.q)));
$("#reset").onclick = () => {
  speechSynthesis.cancel(); stopListening();
  chat.querySelectorAll(".msg,.note").forEach((n) => n.remove());
  welcome.hidden = false; sid = crypto.randomUUID(); localStorage.setItem("unidet_sid", sid);
};

/* ====== DICTÉE VOCALE (micro -> texte) ====== */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
function stopListening() { if (rec) rec.stop(); }
micBtn.onclick = () => {
  if (!SR) return addNote("La dictée vocale n'est pas disponible sur ce navigateur. Utilisez Chrome, Edge ou Safari.");
  if (rec) return rec.stop();
  speechSynthesis.cancel();
  const base = input.value ? input.value + " " : "";
  rec = new SR(); rec.lang = CONFIG.LANG; rec.interimResults = true;
  rec.onresult = (e) => { input.value = base + [...e.results].map((r) => r[0].transcript).join(""); grow(); };
  rec.onerror = (e) => { if (e.error === "not-allowed") addNote("Accès au micro refusé. Autorisez-le dans les réglages du navigateur."); };
  rec.onend = () => { rec = null; micBtn.classList.remove("rec"); input.focus(); };
  rec.start(); micBtn.classList.add("rec");
};

/* ====== LECTURE VOCALE (texte -> voix) ====== */
let voice, speakingBtn = null;
const pickVoice = () => { const v = speechSynthesis.getVoices(); voice = v.find((x) => x.lang === CONFIG.LANG) || v.find((x) => x.lang.startsWith("fr")); };
speechSynthesis.onvoiceschanged = pickVoice; pickVoice();

function speak(text, btn) {
  const same = speakingBtn === btn && btn?.classList.contains("on");
  speechSynthesis.cancel();
  if (same) return;
  const u = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ""));
  u.lang = CONFIG.LANG; if (voice) u.voice = voice;
  const reset = () => btn?.classList.remove("on");
  u.onend = u.onerror = reset;
  speakingBtn = btn; btn?.classList.add("on");
  speechSynthesis.speak(u);
}

autoBtn.onclick = () => {
  const on = autoBtn.getAttribute("aria-pressed") !== "true";
  autoBtn.setAttribute("aria-pressed", on); localStorage.setItem("unidet_auto", on);
  if (!on) speechSynthesis.cancel();
};
autoBtn.setAttribute("aria-pressed", localStorage.getItem("unidet_auto") === "true");
