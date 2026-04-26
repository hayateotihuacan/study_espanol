const APP_STORAGE_KEY = "lector_espanol_state_v1";

const state = {
  words: [],
  grammar: [],
  readings: [],
  currentWordIndex: 0,
  wordFilter: "all",
  grammarFilter: "all",
  selectedReadingId: null,
  progress: {
    words: {},
    readingDone: {},
    quiz: {},
    lastStudyDate: null,
  },
};

// localStorage から保存済み進捗を読み込む。
function loadProgress() {
  const raw = localStorage.getItem(APP_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.progress = {
      ...state.progress,
      ...parsed,
      words: parsed.words || {},
      readingDone: parsed.readingDone || {},
      quiz: parsed.quiz || {},
    };
  } catch {
    console.warn("学習データの読み込みに失敗しました。");
  }
}

// 学習履歴を更新して localStorage に保存する。
function saveProgress() {
  state.progress.lastStudyDate = new Date().toISOString().slice(0, 10);
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state.progress));
}

// アプリで使う教材 JSON をまとめて読み込む。
async function loadData() {
  const files = [
    "data/words_A1.json",
    "data/words_A2.json",
    "data/grammar_A1.json",
    "data/grammar_A2.json",
    "data/readings_A1.json",
    "data/readings_A2.json",
  ];

  const responses = await Promise.all(files.map((url) => fetch(url)));
  const [wordsA1, wordsA2, grammarA1, grammarA2, readingsA1, readingsA2] = await Promise.all(
    responses.map((res) => res.json())
  );

  state.words = [...wordsA1, ...wordsA2];
  state.grammar = [...grammarA1, ...grammarA2];
  state.readings = [...readingsA1, ...readingsA2];
}

function getFilteredWords() {
  if (state.wordFilter === "all") return state.words;
  return state.words.filter((word) => word.level === state.wordFilter);
}

function getFilteredGrammar() {
  if (state.grammarFilter === "all") return state.grammar;
  return state.grammar.filter((item) => item.level === state.grammarFilter);
}

function showScreen(screen) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  document.querySelector(`#screen-${screen}`)?.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === screen);
  });
}

function renderHome() {
  const totalWords = state.words.length;
  const rememberedWords = Object.values(state.progress.words).filter((v) => v === "known").length;
  const readingDone = Object.keys(state.progress.readingDone).length;
  const quizStats = getQuizStats();
  const summary = document.getElementById("today-summary");

  summary.innerHTML = `
    <h3>今日の学習</h3>
    <p>覚えた単語: <strong>${rememberedWords}</strong> / ${totalWords}</p>
    <p>読了した長文: <strong>${readingDone}</strong> / ${state.readings.length}</p>
    <p>クイズ正答率: <strong>${quizStats.rate}%</strong> (${quizStats.correct}/${quizStats.total})</p>
    <p>最終学習日: <strong>${state.progress.lastStudyDate || "未学習"}</strong></p>
  `;
}

// 単語カードを 1 枚表示し、学習ボタンで進捗を保存する。
function renderVocab() {
  const words = getFilteredWords();
  if (state.currentWordIndex >= words.length) state.currentWordIndex = 0;
  const word = words[state.currentWordIndex];
  const card = document.getElementById("vocab-card");
  const progress = document.getElementById("vocab-progress");

  if (!word) {
    card.innerHTML = "<p>該当レベルの単語がありません。</p>";
    progress.textContent = "";
    return;
  }

  const status = state.progress.words[word.id];
  progress.textContent = `表示中: ${state.currentWordIndex + 1} / ${words.length}`;
  card.innerHTML = `
    <h3>${word.word} <span class="tag">${word.level}</span></h3>
    <p>意味: ${word.meaning}</p>
    <p>品詞: ${word.partOfSpeech}</p>
    <p>例文: ${word.example}</p>
    <p>訳: ${word.translation}</p>
    <p>状態: <strong>${status === "known" ? "覚えた" : status === "unknown" ? "未習得" : "未判定"}</strong></p>
    <div class="inline-actions">
      <button class="primary-btn" data-word-action="known">覚えた</button>
      <button class="secondary-btn" data-word-action="unknown">未習得</button>
      <button class="choice-btn" data-word-action="next">次の単語へ</button>
    </div>
  `;

  card.querySelectorAll("button[data-word-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.wordAction;
      if (action === "next") {
        state.currentWordIndex = (state.currentWordIndex + 1) % words.length;
      } else {
        state.progress.words[word.id] = action;
        state.currentWordIndex = (state.currentWordIndex + 1) % words.length;
        saveProgress();
      }
      rerenderAll();
    });
  });
}

function renderGrammar() {
  const list = document.getElementById("grammar-list");
  const grammar = getFilteredGrammar();

  list.innerHTML = grammar
    .map(
      (item) => `
      <article class="card">
        <h3>${item.title} <span class="tag">${item.level}</span></h3>
        <p>${item.explanation}</p>
        ${item.examples
          .map((ex) => `<p><strong>${ex.spanish}</strong><br /><span>${ex.japanese}</span></p>`)
          .join("")}
      </article>
    `
    )
    .join("");
}

function renderReadings() {
  const list = document.getElementById("reading-list");
  list.innerHTML = state.readings
    .map(
      (reading) => `
      <button class="menu-card" data-reading-id="${reading.id}">
        <strong>${reading.title}</strong><br />
        <span class="tag">${reading.level}</span>
        <span class="tag">${reading.category}</span>
      </button>
    `
    )
    .join("");

  list.querySelectorAll("button[data-reading-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedReadingId = btn.dataset.readingId;
      renderReadingDetail();
    });
  });

  renderReadingDetail();
}

// 日本語訳の表示切替やクイズ回答判定を含む長文詳細を描画する。
function renderReadingDetail() {
  const detail = document.getElementById("reading-detail");
  const reading = state.readings.find((r) => r.id === state.selectedReadingId);

  if (!reading) {
    detail.classList.add("hidden");
    return;
  }

  detail.classList.remove("hidden");
  detail.innerHTML = `
    <h3>${reading.title}</h3>
    <p><span class="tag">${reading.level}</span><span class="tag">${reading.category}</span></p>
    <p class="reading-text">${reading.text}</p>
    <div class="inline-actions">
      <button id="toggle-translation" class="primary-btn">日本語訳を表示</button>
      <button id="mark-reading" class="choice-btn">読了にする</button>
    </div>
    <p id="translation-box" class="hidden">${reading.translation}</p>
    <h4>重要語句</h4>
    <ul>
      ${reading.vocabulary.map((v) => `<li>${v.word} : ${v.meaning}</li>`).join("")}
    </ul>
    <h4>内容確認クイズ</h4>
    <div id="quiz-area"></div>
  `;

  const translationBox = detail.querySelector("#translation-box");
  const toggleBtn = detail.querySelector("#toggle-translation");
  toggleBtn.addEventListener("click", () => {
    translationBox.classList.toggle("hidden");
    toggleBtn.textContent = translationBox.classList.contains("hidden")
      ? "日本語訳を表示"
      : "日本語訳を隠す";
  });

  detail.querySelector("#mark-reading").addEventListener("click", () => {
    state.progress.readingDone[reading.id] = true;
    saveProgress();
    rerenderAll();
  });

  const quizArea = detail.querySelector("#quiz-area");
  quizArea.innerHTML = reading.questions
    .map((q, idx) => {
      const qid = `${reading.id}_q${idx}`;
      return `
        <div class="card">
          <p><strong>Q${idx + 1}:</strong> ${q.question}</p>
          <div class="card-list">
            ${q.choices
              .map(
                (choice) =>
                  `<button class="choice-btn" data-qid="${qid}" data-answer="${choice}">${choice}</button>`
              )
              .join("")}
          </div>
          <p id="fb-${qid}" class="feedback"></p>
        </div>
      `;
    })
    .join("");

  quizArea.querySelectorAll("button[data-qid]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const qid = btn.dataset.qid;
      const idx = Number(qid.split("_q")[1]);
      const question = reading.questions[idx];
      const selected = btn.dataset.answer;
      const isCorrect = selected === question.answer;

      state.progress.quiz[qid] = {
        correct: isCorrect,
        updatedAt: new Date().toISOString(),
      };
      saveProgress();

      const feedback = document.getElementById(`fb-${qid}`);
      feedback.textContent = isCorrect
        ? "正解です！"
        : `不正解です。正解: ${question.answer}`;
      feedback.className = `feedback ${isCorrect ? "ok" : "ng"}`;

      rerenderAll(false);
    });
  });
}

function getQuizStats() {
  const entries = Object.values(state.progress.quiz);
  const total = entries.length;
  const correct = entries.filter((v) => v.correct).length;
  const rate = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, rate };
}

function renderReview() {
  const reviewSummary = document.getElementById("review-summary");
  const reviewList = document.getElementById("review-list");

  const unknownWords = state.words.filter((w) => state.progress.words[w.id] === "unknown");
  const wrongQuizIds = Object.entries(state.progress.quiz)
    .filter(([, val]) => !val.correct)
    .map(([qid]) => qid);

  reviewSummary.innerHTML = `
    <p>未習得単語: <strong>${unknownWords.length}</strong> 件</p>
    <p>再挑戦クイズ: <strong>${wrongQuizIds.length}</strong> 件</p>
  `;

  reviewList.innerHTML = `
    <article class="card">
      <h3>未習得単語</h3>
      <ul>
        ${unknownWords.slice(0, 10).map((w) => `<li>${w.word} (${w.meaning})</li>`).join("") || "<li>ありません</li>"}
      </ul>
    </article>
    <article class="card">
      <h3>再挑戦クイズID</h3>
      <ul>
        ${wrongQuizIds.slice(0, 10).map((qid) => `<li>${qid}</li>`).join("") || "<li>ありません</li>"}
      </ul>
    </article>
  `;
}

function renderHistory() {
  const card = document.getElementById("history-card");
  const learnedWords = Object.values(state.progress.words).filter((v) => v === "known").length;
  const readingsDone = Object.keys(state.progress.readingDone).length;
  const quizStats = getQuizStats();

  card.innerHTML = `
    <p>学習済み単語数: <strong>${learnedWords}</strong></p>
    <p>読了した長文数: <strong>${readingsDone}</strong></p>
    <p>クイズ正答率: <strong>${quizStats.rate}%</strong> (${quizStats.correct}/${quizStats.total})</p>
    <p>最終学習日: <strong>${state.progress.lastStudyDate || "未学習"}</strong></p>
  `;
}

function rerenderAll(includeReadingDetail = true) {
  renderHome();
  renderVocab();
  renderGrammar();
  renderReadings();
  renderReview();
  renderHistory();
  if (includeReadingDetail) renderReadingDetail();
}

// 初期化処理: データ読込・イベント登録・Service Worker 登録を実行する。
async function init() {
  loadProgress();
  await loadData();

  document.querySelectorAll("[data-screen]").forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.dataset.screen));
  });

  document.getElementById("vocab-level-filter").addEventListener("change", (e) => {
    state.wordFilter = e.target.value;
    state.currentWordIndex = 0;
    renderVocab();
  });

  document.getElementById("grammar-level-filter").addEventListener("change", (e) => {
    state.grammarFilter = e.target.value;
    renderGrammar();
  });

  rerenderAll();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service Worker 登録に失敗しました:", error);
    });
  }
}

init();
