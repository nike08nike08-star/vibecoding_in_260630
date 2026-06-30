/* eslint-disable no-alert */
const STORAGE_KEY = "vibe_quotes_v1";
const THEME_KEY = "vibe_theme_v1"; // "light" | "dark" | "system"

/** @type {{ text: string; author: string }[]} */
const DEFAULT_QUOTES = [
  { text: "시작이 반이다.", author: "속담" },
  { text: "천 리 길도 한 걸음부터.", author: "속담" },
  { text: "오늘 할 일을 내일로 미루지 마라.", author: "벤자민 프랭클린" },
  { text: "행동이 모든 성공의 기본 열쇠다.", author: "파블로 피카소" },
  { text: "할 수 있다고 믿는 순간, 절반은 이룬 것이다.", author: "시어도어 루스벨트" },
  { text: "실패는 성공으로 가는 과정이다.", author: "오프라 윈프리" },
  { text: "완벽을 기다리다 시작을 놓치지 마라.", author: "작자 미상" },
  { text: "꾸준함이 재능을 이긴다.", author: "작자 미상" },
  { text: "너 자신이 되라. 다른 사람은 이미 다 차지됐다.", author: "오스카 와일드" },
  { text: "기회는 준비된 자에게 온다.", author: "루이 파스퇴르" },
  { text: "변화는 두려움이 아니라 성장의 신호다.", author: "작자 미상" },
  { text: "오늘의 작은 습관이 내일의 큰 변화를 만든다.", author: "작자 미상" },
  { text: "목표가 분명하면 길이 보인다.", author: "작자 미상" },
  { text: "비교는 기쁨을 훔친다.", author: "시어도어 루스벨트(전해짐)" },
  { text: "중요한 건 속도가 아니라 방향이다.", author: "작자 미상" },
  { text: "계속 가라. 가장 멋진 순간은 포기 직전에 온다.", author: "작자 미상" },
  { text: "불가능은 시도하지 않는 사람의 변명이다.", author: "작자 미상" },
  { text: "작게 시작하되, 반드시 시작하라.", author: "작자 미상" },
  { text: "나아가는 한, 느려도 괜찮다.", author: "작자 미상" },
  { text: "성공은 매일 반복한 작은 노력의 합이다.", author: "로버트 콜리어" },
];

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el;
}

function clampText(s, max) {
  const t = String(s ?? "").trim().replace(/\s+/g, " ");
  return t.length > max ? t.slice(0, max) : t;
}

function quoteToShareText(q) {
  const author = q.author?.trim() ? `— ${q.author.trim()}` : "— (저자 미상)";
  return `${q.text}\n${author}`;
}

function loadUserQuotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => ({
        id: String(x.id ?? ""),
        text: clampText(x.text, 240),
        author: clampText(x.author, 60),
        createdAt: Number(x.createdAt ?? Date.now()),
      }))
      .filter((x) => x.id && x.text);
  } catch {
    return [];
  }
}

function saveUserQuotes(quotes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}

function makeId() {
  // 충분히 짧고 충돌 가능성 낮게(초보 입문용)
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pickRandom(arr) {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function getSystemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function loadThemePref() {
  const raw = localStorage.getItem(THEME_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === "system") {
    delete root.dataset.theme;
    return getSystemTheme();
  }
  root.dataset.theme = pref;
  return pref;
}

function buildAskChatGPTUrl(q) {
  const prompt = [
    "다음 명언을 설명하고, 오늘 내가 실천할 수 있는 구체적인 행동 3가지를 제안해줘.",
    "",
    quoteToShareText(q),
  ].join("\n");
  // web.openai.com 프롬프트 파라미터는 환경에 따라 다를 수 있어, 검색/새 채팅으로 유도
  const query = encodeURIComponent(prompt);
  return `https://chat.openai.com/?q=${query}`;
}

function buildTwitterIntentUrl(q) {
  const text = encodeURIComponent(quoteToShareText(q));
  return `https://twitter.com/intent/tweet?text=${text}`;
}

function setStatus(msg, { isError = false } = {}) {
  const status = $("status");
  status.textContent = msg;
  status.style.color = isError ? "color-mix(in srgb, #ff6b6b 80%, var(--muted))" : "";
  if (msg) {
    window.clearTimeout(setStatus._t);
    setStatus._t = window.setTimeout(() => {
      status.textContent = "";
      status.style.color = "";
    }, 2500);
  }
}
setStatus._t = 0;

function renderMineList(userQuotes, { onDelete, onUse }) {
  const list = $("mineList");
  const empty = $("mineEmpty");
  const count = $("mineCount");

  count.textContent = userQuotes.length ? `${userQuotes.length}개` : "";
  empty.style.display = userQuotes.length ? "none" : "block";

  list.innerHTML = "";

  for (const q of userQuotes.slice().sort((a, b) => b.createdAt - a.createdAt)) {
    const li = document.createElement("li");
    li.className = "list-item";

    const text = document.createElement("div");
    text.className = "quote-text small";
    text.textContent = q.text;

    const meta = document.createElement("div");
    meta.className = "meta";

    const chip = document.createElement("div");
    chip.className = "chip small muted";
    chip.textContent = q.author ? `— ${q.author}` : "— (저자 미상)";

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "8px";

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "btn small";
    useBtn.textContent = "표시";
    useBtn.addEventListener("click", () => onUse(q));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn small";
    delBtn.textContent = "삭제";
    delBtn.addEventListener("click", () => onDelete(q.id));

    controls.append(useBtn, delBtn);
    meta.append(chip, controls);

    li.append(text, meta);
    list.append(li);
  }
}

function fadeQuote() {
  const qt = $("quoteText");
  const qa = $("quoteAuthor");
  qt.classList.remove("fade-in");
  qa.classList.remove("fade-in");
  // reflow
  void qt.offsetWidth;
  qt.classList.add("fade-in");
  qa.classList.add("fade-in");
}

function main() {
  const quoteText = $("quoteText");
  const quoteAuthor = $("quoteAuthor");

  const themeToggle = $("themeToggle");
  const nextBtn = $("nextBtn");
  const copyBtn = $("copyBtn");
  const shareBtn = $("shareBtn");
  const askBtn = $("askBtn");

  const addForm = $("addForm");
  const newQuote = $("newQuote");
  const newAuthor = $("newAuthor");
  const clearBtn = $("clearBtn");

  /** @type {{ id: string; text: string; author: string; createdAt: number }[]} */
  let userQuotes = loadUserQuotes();

  /** @type {{ text: string; author: string } | null} */
  let current = null;

  let themePref = loadThemePref(); // light | dark | system

  function renderThemeButton(effectiveTheme) {
    const label =
      themePref === "system"
        ? "테마: 시스템"
        : themePref === "dark"
          ? "테마: 다크"
          : "테마: 라이트";

    themeToggle.textContent = label;
    themeToggle.setAttribute("aria-pressed", String(themePref !== "system"));
    themeToggle.title = `현재: ${label.replace("테마: ", "")} (적용: ${effectiveTheme})`;
  }

  function syncThemeUI() {
    const effective = applyTheme(themePref);
    renderThemeButton(effective);
  }

  function getAllQuotes() {
    const userAsPublic = userQuotes.map((q) => ({ text: q.text, author: q.author || "내가 추가함" }));
    return [...DEFAULT_QUOTES, ...userAsPublic];
  }

  function showQuote(q) {
    current = q;
    quoteText.textContent = q.text;
    quoteAuthor.textContent = q.author?.trim() ? q.author.trim() : "(저자 미상)";
    askBtn.href = buildAskChatGPTUrl(q);
    shareBtn.dataset.fallbackHref = buildTwitterIntentUrl(q);
    fadeQuote();
  }

  function showRandomQuote() {
    const all = getAllQuotes();
    const picked = pickRandom(all);
    if (!picked) return;
    // 같은 문장이 연속으로 나오는 걸 살짝 줄이기
    if (current && all.length > 1 && picked.text === current.text) {
      const again = pickRandom(all.filter((x) => x.text !== current.text));
      showQuote(again || picked);
      return;
    }
    showQuote(picked);
  }

  async function copyCurrent() {
    if (!current) return;
    const payload = quoteToShareText(current);
    try {
      await navigator.clipboard.writeText(payload);
      setStatus("복사했어요.");
    } catch {
      // 구형/권한 문제 대비
      const ta = document.createElement("textarea");
      ta.value = payload;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      setStatus(ok ? "복사했어요." : "복사에 실패했어요.", { isError: !ok });
    }
  }

  async function shareCurrent() {
    if (!current) return;
    const text = quoteToShareText(current);
    const shareData = {
      title: "명언",
      text,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setStatus("공유했어요.");
        return;
      } catch {
        // 사용자가 취소한 경우 포함
      }
    }

    const href = shareBtn.dataset.fallbackHref || buildTwitterIntentUrl(current);
    window.open(href, "_blank", "noopener,noreferrer");
    setStatus("공유 대체 링크를 열었어요.");
  }

  function upsertUserQuote(text, author) {
    const normalizedText = clampText(text, 240);
    const normalizedAuthor = clampText(author, 60);

    if (!normalizedText) {
      setStatus("문구를 입력해 주세요.", { isError: true });
      newQuote.focus();
      return false;
    }

    const dup = userQuotes.some((q) => q.text.toLowerCase() === normalizedText.toLowerCase());
    if (dup) {
      setStatus("이미 같은 문구가 저장되어 있어요.", { isError: true });
      return false;
    }

    userQuotes = [
      { id: makeId(), text: normalizedText, author: normalizedAuthor, createdAt: Date.now() },
      ...userQuotes,
    ];
    saveUserQuotes(userQuotes);
    renderMineList(userQuotes, { onDelete: deleteUserQuote, onUse: (q) => showQuote({ text: q.text, author: q.author }) });
    setStatus("저장했어요.");
    return true;
  }

  function deleteUserQuote(id) {
    const before = userQuotes.length;
    userQuotes = userQuotes.filter((q) => q.id !== id);
    if (userQuotes.length === before) return;
    saveUserQuotes(userQuotes);
    renderMineList(userQuotes, { onDelete: deleteUserQuote, onUse: (q) => showQuote({ text: q.text, author: q.author }) });
    setStatus("삭제했어요.");
  }

  nextBtn.addEventListener("click", showRandomQuote);
  copyBtn.addEventListener("click", copyCurrent);
  shareBtn.addEventListener("click", shareCurrent);

  themeToggle.addEventListener("click", () => {
    // system -> light -> dark -> system
    themePref = themePref === "system" ? "light" : themePref === "light" ? "dark" : "system";
    localStorage.setItem(THEME_KEY, themePref);
    syncThemeUI();
    setStatus(
      themePref === "system"
        ? "테마를 시스템 설정으로 설정했어요."
        : themePref === "light"
          ? "라이트 모드로 설정했어요."
          : "다크 모드로 설정했어요.",
    );
  });

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = upsertUserQuote(newQuote.value, newAuthor.value);
    if (ok) {
      newQuote.value = "";
      newAuthor.value = "";
      newQuote.focus();
    }
  });

  clearBtn.addEventListener("click", () => {
    newQuote.value = "";
    newAuthor.value = "";
    newQuote.focus();
    setStatus("입력을 지웠어요.");
  });

  // 목록 초기 렌더
  renderMineList(userQuotes, { onDelete: deleteUserQuote, onUse: (q) => showQuote({ text: q.text, author: q.author }) });

  // 테마 초기 적용 + 시스템 변경 반영(사용자가 system일 때만)
  syncThemeUI();
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (themePref === "system") syncThemeUI();
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
  }

  // 첫 명언 표시
  showRandomQuote();

  // 키보드 단축: 카드 영역에서 Space/Enter로 다음 명언
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    const isTyping = tag === "INPUT" || tag === "TEXTAREA";
    if (isTyping) return;
    if ((e.key === "Enter" || e.key === " ") && (document.activeElement === document.body || document.activeElement === document.documentElement)) {
      e.preventDefault();
      showRandomQuote();
    }
  });
}

document.addEventListener("DOMContentLoaded", main);
