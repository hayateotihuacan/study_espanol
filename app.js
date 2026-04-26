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
    review: {
      completed: {},
      completedCount: 0,
      todayDate: null,
      todayCount: 0,
    },
  },
};

const swipeState = {
  startX: null,
  startY: null,
};

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
      review: {
        ...state.progress.review,
        ...(parsed.review || {}),
        completed: parsed.review?.completed || {},
      },
    };
  } catch {
    console.warn("学習データの読み込みに失敗しました。");
  }
}

function saveProgress() {
  state.progress.lastStudyDate = new Date().toISOString().slice(0, 10);
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state.progress));
}

function recordReviewCompletion(key) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.progress.review.todayDate !== today) {
    state.progress.review.todayDate = today;
    state.progress.review.todayCount = 0;
  }
  if (!state.progress.review.completed[key]) {
    state.progress.review.completed[key] = today;
    state.progress.review.completedCount += 1;
    state.progress.review.todayCount += 1;
  }
}

function parseQuizQid(qid) {
  const [readingId, suffix] = qid.split("_q");
  const idx = Number(suffix);
  return { readingId, idx };
}

function isSpeechSupported() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function getSpanishVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === "es-ES") ||
    voices.find((voice) => voice.lang === "es-MX") ||
    voices.find((voice) => voice.lang.startsWith("es")) ||
    null
  );
}

function speakSpanish(text, statusEl) {
  if (!isSpeechSupported()) {
    if (statusEl) statusEl.textContent = "この端末では読み上げに対応していません";
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getSpanishVoice();
  utterance.lang = voice?.lang || "es-ES";
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  if (statusEl) statusEl.textContent = `読み上げ中 (${utterance.lang})`;
}

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
  const unknownWords = Object.values(state.progress.words).filter((v) => v === "unknown").length;
  const readingDone = Object.keys(state.progress.readingDone).length;
  const quizStats = getQuizStats();
  const summary = document.getElementById("today-summary");
  const progressCards = document.getElementById("home-progress-cards");

  summary.innerHTML = `
    <h3>今日の学習サマリー</h3>
    <p>覚えた単語: <strong>${rememberedWords}</strong> / ${totalWords}</p>
    <p>読了した長文: <strong>${readingDone}</strong> / ${state.readings.length}</p>
    <p>クイズ正答率: <strong>${quizStats.rate}%</strong> (${quizStats.correct}/${quizStats.total})</p>
    <p>最終学習日: <strong>${state.progress.lastStudyDate || "未学習"}</strong></p>
  `;

  progressCards.innerHTML = `
    <article class="card learning-status-card">
      <h3>学習進行状況</h3>
      <p>単語進捗: <strong>${Math.round((rememberedWords / (totalWords || 1)) * 100)}%</strong></p>
      <div class="progress-bar"><span style="width: ${Math.round((rememberedWords / (totalWords || 1)) * 100)}%"></span></div>
      <p>苦手単語: <strong>${unknownWords}</strong> 件</p>
    </article>
    <article class="card learning-status-card">
      <h3>読解・クイズ進捗</h3>
      <p>読了率: <strong>${Math.round((readingDone / (state.readings.length || 1)) * 100)}%</strong></p>
      <div class="progress-bar"><span style="width: ${Math.round((readingDone / (state.readings.length || 1)) * 100)}%"></span></div>
      <p>クイズ成績: <strong>${quizStats.correct}</strong> / ${quizStats.total}</p>
    </article>
  `;
}

function handleWordAction(action, word, listLength) {
  if (action === "next") {
    state.currentWordIndex = (state.currentWordIndex + 1) % listLength;
  } else {
    state.progress.words[word.id] = action;
    state.currentWordIndex = (state.currentWordIndex + 1) % listLength;
    saveProgress();
  }
  rerenderAll();
}

function attachSwipeHandlers(card, word, listLength) {
  const threshold = 60;

  card.addEventListener(
    "touchstart",
    (e) => {
      const touch = e.changedTouches[0];
      swipeState.startX = touch.clientX;
      swipeState.startY = touch.clientY;
    },
    { passive: true }
  );

  card.addEventListener(
    "touchend",
    (e) => {
      if (swipeState.startX === null || swipeState.startY === null) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - swipeState.startX;
      const dy = touch.clientY - swipeState.startY;
      swipeState.startX = null;
      swipeState.startY = null;

      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return;
      if (dx > 0) {
        handleWordAction("known", word, listLength);
      } else {
        handleWordAction("unknown", word, listLength);
      }
    },
    { passive: true }
  );
}

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
    <div class="card-head"><h3>${word.word} <span class="tag">${word.level}</span></h3></div>
    <p>意味: ${word.meaning}</p>
    <p>品詞: ${word.partOfSpeech}</p>
    <p>例文: ${word.example}</p>
    <p>訳: ${word.translation}</p>
    <p>状態: <strong>${status === "known" ? "覚えた" : status === "unknown" ? "未習得" : "未判定"}</strong></p>
    <p class="swipe-hint">👉 右スワイプ: 覚えた / 👈 左スワイプ: 未習得</p>
    <div class="inline-actions">
      <button class="primary-btn" data-word-action="known">覚えた</button>
      <button class="secondary-btn" data-word-action="unknown">未習得</button>
      <button class="choice-btn" data-word-action="next">次の単語へ</button>
      <button class="choice-btn" id="speak-word">発音</button>
      <button class="choice-btn" id="speak-example">例文を読む</button>
    </div>
    <p id="vocab-speech-status" class="speech-status"></p>
  `;

  card.querySelectorAll("button[data-word-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      handleWordAction(btn.dataset.wordAction, word, words.length);
    });
  });

  const speechStatus = card.querySelector("#vocab-speech-status");
  card.querySelector("#speak-word").addEventListener("click", () => speakSpanish(word.word, speechStatus));
  card
    .querySelector("#speak-example")
    .addEventListener("click", () => speakSpanish(word.example, speechStatus));

  attachSwipeHandlers(card, word, words.length);
}

function renderGrammar() {
  const list = document.getElementById("grammar-list");
  const grammar = getFilteredGrammar();

  list.innerHTML = grammar
    .map(
      (item) => `
      <article class="card learning-card">
        <div class="card-head"><h3>${item.title} <span class="tag">${item.level}</span></h3></div>
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
      <button class="menu-card reading-menu-card" data-reading-id="${reading.id}">
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

function renderReadingDetail() {
  const detail = document.getElementById("reading-detail");
  const reading = state.readings.find((r) => r.id === state.selectedReadingId);

  if (!reading) {
    detail.classList.add("hidden");
    return;
  }

  detail.classList.remove("hidden");
  detail.innerHTML = `
    <section class="reading-section section-title">
      <h3>${reading.title}</h3>
      <p><span class="tag">${reading.level}</span><span class="tag">${reading.category}</span></p>
    </section>

    <section class="reading-section">
      <h4>本文</h4>
      <p class="reading-text">${reading.text}</p>
      <div class="inline-actions">
        <button id="toggle-translation" class="primary-btn">日本語訳を表示</button>
        <button id="mark-reading" class="choice-btn">読了にする</button>
        <button id="speak-reading" class="choice-btn">本文を読む</button>
      </div>
      <p id="translation-box" class="translation-box hidden">${reading.translation}</p>
      <p id="reading-speech-status" class="speech-status"></p>
    </section>

    <section class="reading-section">
      <h4>重要語句</h4>
      <ul class="reading-vocab-list">
        ${reading.vocabulary.map((v) => `<li><strong>${v.word}</strong> : ${v.meaning}</li>`).join("")}
      </ul>
    </section>

    <section class="reading-section">
      <h4>内容確認クイズ</h4>
      <div id="quiz-area"></div>
    </section>
  `;

  const translationBox = detail.querySelector("#translation-box");
  const toggleBtn = detail.querySelector("#toggle-translation");
  const speechStatus = detail.querySelector("#reading-speech-status");

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

  detail
    .querySelector("#speak-reading")
    .addEventListener("click", () => speakSpanish(reading.text, speechStatus));

  const quizArea = detail.querySelector("#quiz-area");
  quizArea.innerHTML = reading.questions
    .map((q, idx) => {
      const qid = `${reading.id}_q${idx}`;
      return `
        <div class="card learning-card quiz-card">
          <p><strong>Q${idx + 1}:</strong> ${q.question}</p>
          <div class="card-list">
            ${q.choices
              .map(
                (choice) =>
                  `<button class="choice-btn quiz-choice-btn" data-qid="${qid}" data-answer="${choice}">${choice}</button>`
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
        ? "✅ 正解です！この調子です。"
        : `❌ 不正解です。正解: ${question.answer}`;
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
  const todayReview = document.getElementById("today-review");
  const wordReview = document.getElementById("review-word-cards");
  const quizReview = document.getElementById("review-quiz-cards");
  const unreadReview = document.getElementById("review-reading-cards");

  const unknownWords = state.words.filter((w) => state.progress.words[w.id] === "unknown");
  const wrongQuizIds = Object.entries(state.progress.quiz)
    .filter(([, val]) => !val.correct)
    .map(([qid]) => qid);
  const unreadReadings = state.readings.filter((r) => !state.progress.readingDone[r.id]);

  reviewSummary.innerHTML = `
    <p>未習得単語: <strong>${unknownWords.length}</strong> 件</p>
    <p>再挑戦クイズ: <strong>${wrongQuizIds.length}</strong> 件</p>
    <p>未読長文: <strong>${unreadReadings.length}</strong> 件</p>
  `;

  todayReview.innerHTML = `
    <article class="card learning-card">
      <h3>今日の復習</h3>
      <p>本日の復習完了数: <strong>${state.progress.review.todayCount}</strong></p>
      <p>累計復習完了数: <strong>${state.progress.review.completedCount}</strong></p>
      <p>更新日: <strong>${state.progress.review.todayDate || "未実施"}</strong></p>
    </article>
  `;

  wordReview.innerHTML =
    unknownWords
      .slice(0, 12)
      .map(
        (word) => `
      <article class="card learning-card">
        <h4>${word.word} <span class="tag">${word.level}</span></h4>
        <p>品詞: ${word.partOfSpeech}</p>
        <p>例文: ${word.example}</p>
        <p class="review-answer hidden" id="ans-${word.id}">意味: ${word.meaning}<br />訳: ${word.translation}</p>
        <div class="inline-actions">
          <button class="choice-btn" data-review-show="${word.id}">答えを見る</button>
          <button class="primary-btn" data-review-known="${word.id}">覚えた</button>
        </div>
      </article>
    `
      )
      .join("") || '<article class="card learning-card"><p>未習得単語はありません。</p></article>';

  quizReview.innerHTML =
    wrongQuizIds
      .slice(0, 10)
      .map((qid) => {
        const { readingId, idx } = parseQuizQid(qid);
        const reading = state.readings.find((r) => r.id === readingId);
        const question = reading?.questions?.[idx];
        if (!reading || !question) {
          return `<article class="card learning-card"><p>${qid}（データが見つかりません）</p></article>`;
        }

        return `
          <article class="card learning-card">
            <h4>再挑戦クイズ</h4>
            <p><strong>${reading.title}</strong></p>
            <p>${question.question}</p>
            <div class="card-list">
              ${question.choices
                .map(
                  (choice) =>
                    `<button class="choice-btn quiz-choice-btn" data-review-qid="${qid}" data-review-answer="${choice}">${choice}</button>`
                )
                .join("")}
            </div>
            <p class="feedback" id="review-fb-${qid}"></p>
          </article>
        `;
      })
      .join("") || '<article class="card learning-card"><p>再挑戦クイズはありません。</p></article>';

  unreadReview.innerHTML =
    unreadReadings
      .slice(0, 10)
      .map(
        (reading) => `
      <article class="card learning-card">
        <h4>${reading.title}</h4>
        <p><span class="tag">${reading.level}</span><span class="tag">${reading.category}</span></p>
        <div class="inline-actions">
          <button class="choice-btn" data-open-reading="${reading.id}">読解画面で開く</button>
          <button class="primary-btn" data-mark-reading="${reading.id}">読了にする</button>
        </div>
      </article>
    `
      )
      .join("") || '<article class="card learning-card"><p>未読の長文はありません。</p></article>';

  wordReview.querySelectorAll("[data-review-show]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.reviewShow;
      wordReview.querySelector(`#ans-${id}`)?.classList.remove("hidden");
    });
  });

  wordReview.querySelectorAll("[data-review-known]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.reviewKnown;
      state.progress.words[id] = "known";
      recordReviewCompletion(`word_${id}`);
      saveProgress();
      rerenderAll();
    });
  });

  quizReview.querySelectorAll("[data-review-qid]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const qid = btn.dataset.reviewQid;
      const selected = btn.dataset.reviewAnswer;
      const { readingId, idx } = parseQuizQid(qid);
      const question = state.readings.find((r) => r.id === readingId)?.questions?.[idx];
      if (!question) return;

      const isCorrect = selected === question.answer;
      state.progress.quiz[qid] = {
        correct: isCorrect,
        updatedAt: new Date().toISOString(),
      };

      const feedback = quizReview.querySelector(`#review-fb-${qid}`);
      if (feedback) {
        feedback.textContent = isCorrect ? "✅ 正解です。復習リストから外れます。" : `❌ 不正解です。正解: ${question.answer}`;
        feedback.className = `feedback ${isCorrect ? "ok" : "ng"}`;
      }

      if (isCorrect) recordReviewCompletion(`quiz_${qid}`);
      saveProgress();
      rerenderAll();
    });
  });

  unreadReview.querySelectorAll("[data-open-reading]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedReadingId = btn.dataset.openReading;
      showScreen("readings");
      renderReadingDetail();
    });
  });

  unreadReview.querySelectorAll("[data-mark-reading]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.markReading;
      state.progress.readingDone[id] = true;
      recordReviewCompletion(`reading_${id}`);
      saveProgress();
      rerenderAll();
    });
  });
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
    <p>復習完了数（累計）: <strong>${state.progress.review.completedCount}</strong></p>
    <p>復習完了数（今日）: <strong>${state.progress.review.todayCount}</strong></p>
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

  if (isSpeechSupported()) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  rerenderAll();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service Worker 登録に失敗しました:", error);
    });
  }
}

init();
