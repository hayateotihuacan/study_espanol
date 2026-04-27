const APP_VERSION = '1.0.0';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const STORAGE_KEYS = {
  wordsStatus: 'lector_clean_words_status',
  readingStatus: 'lector_clean_reading_status',
  quizResults: 'lector_clean_quiz_results',
  selectedLevel: 'lector_clean_selected_level',
  lastStudyDate: 'lector_clean_last_study_date'
};

const state = {
  currentScreen: 'home',
  selectedLevel: 'A1',
  words: {},
  grammar: {},
  readings: {},
  wordsStatus: {},
  readingStatus: {},
  quizResults: {},
  openReadingId: null,
  translationVisible: {}
};

// localStorage読み込み：JSONが壊れていても落ちないようにする。
function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// localStorage保存を共通化し、処理を分かりやすくする。
function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function updateLastStudyDate() {
  localStorage.setItem(STORAGE_KEYS.lastStudyDate, new Date().toISOString().slice(0, 10));
}

function showError(message) {
  const el = document.getElementById('error-banner');
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-banner').classList.add('hidden');
}

function formatOrFallback(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`教材JSONの読み込みに失敗: ${path}`);
  }
  return response.json();
}

async function loadAllData() {
  for (const level of LEVELS) {
    state.words[level] = await loadJson(`./data/words_${level}.json`);
    state.grammar[level] = await loadJson(`./data/grammar_${level}.json`);
    state.readings[level] = await loadJson(`./data/readings_${level}.json`);
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./service-worker.js').catch(() => {
    showError('Service Workerの登録に失敗しました。オンラインで再読み込みしてください。');
  });
}

function allWords() {
  return LEVELS.flatMap((level) => state.words[level] || []);
}

function allReadings() {
  return LEVELS.flatMap((level) => state.readings[level] || []);
}

function calculateStats() {
  const words = allWords();
  const readings = allReadings();
  const known = Object.values(state.wordsStatus).filter((v) => v === 'known').length;
  const unknown = Object.values(state.wordsStatus).filter((v) => v === 'unknown').length;
  const readDone = Object.values(state.readingStatus).filter(Boolean).length;
  const quizItems = Object.values(state.quizResults);
  const quizCount = quizItems.length;
  const correct = quizItems.filter((x) => x.correct).length;
  const rate = quizCount ? Math.round((correct / quizCount) * 100) : 0;

  return {
    totalWords: words.length,
    known,
    unknown,
    readDone,
    unread: readings.filter((r) => !state.readingStatus[r.id]).length,
    quizCount,
    correct,
    rate,
    lastStudyDate: localStorage.getItem(STORAGE_KEYS.lastStudyDate) || '未学習'
  };
}

function renderLevelButtons() {
  return `
    <div class="level-switcher">
      ${LEVELS.map((level) => `<button class="level-btn ${level === state.selectedLevel ? 'active' : ''}" data-level="${level}">${level}</button>`).join('')}
    </div>
  `;
}

function renderHome() {
  const stats = calculateStats();
  document.getElementById('screen-home').innerHTML = `
    <div class="card">
      <h2>ホーム</h2>
      <p><strong>アプリ名:</strong> Lector Español Clean</p>
      <p><strong>現在選択中の学習レベル:</strong> <span class="badge">${state.selectedLevel}</span></p>
      <div class="stats-grid">
        <div class="stat-card"><div>学習済み単語数</div><div class="stat-value">${stats.known}</div></div>
        <div class="stat-card"><div>未習得単語数</div><div class="stat-value">${stats.unknown}</div></div>
        <div class="stat-card"><div>読了した長文数</div><div class="stat-value">${stats.readDone}</div></div>
        <div class="stat-card"><div>クイズ正答率</div><div class="stat-value">${stats.rate}%</div></div>
        <div class="stat-card"><div>最終学習日</div><div>${stats.lastStudyDate}</div></div>
      </div>
    </div>

    <div class="link-grid">
      <button class="card action-btn" data-go="words">単語</button>
      <button class="card action-btn" data-go="grammar">文法</button>
      <button class="card action-btn" data-go="readings">長文読解</button>
      <button class="card action-btn" data-go="review">復習</button>
      <button class="card action-btn" data-go="history">履歴</button>
    </div>
  `;
}

function renderWords() {
  const items = state.words[state.selectedLevel] || [];
  document.getElementById('screen-words').innerHTML = `
    <div class="card">
      <h2>単語</h2>
      ${renderLevelButtons()}
      ${items.map((item) => {
        const label = state.wordsStatus[item.id] === 'known' ? '覚えた' : state.wordsStatus[item.id] === 'unknown' ? '未習得' : '未設定';
        return `
          <article class="card">
            <p><span class="badge">${item.level}</span></p>
            <h3>${formatOrFallback(item.word, '単語未設定')}</h3>
            <p><strong>日本語訳:</strong> ${formatOrFallback(item.meaning, '訳未設定')}</p>
            <p><strong>品詞:</strong> ${formatOrFallback(item.partOfSpeech, '未設定')}</p>
            <p><strong>例文:</strong> ${formatOrFallback(item.example, '例文未設定')}</p>
            <p class="translation-box"><strong>例文訳:</strong> ${formatOrFallback(item.translation, '例文訳未設定')}</p>
            <p><strong>補足メモ:</strong> ${formatOrFallback(item.note, '補足未設定')}</p>
            <p><strong>現在状態:</strong> ${label}</p>
            <div class="word-actions">
              <button class="action-btn primary" data-word-id="${item.id}" data-word-state="known">覚えた</button>
              <button class="action-btn" data-word-id="${item.id}" data-word-state="unknown">未習得</button>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderGrammar() {
  const items = state.grammar[state.selectedLevel] || [];
  document.getElementById('screen-grammar').innerHTML = `
    <div class="card">
      <h2>文法</h2>
      ${renderLevelButtons()}
      ${items.map((item) => `
        <article class="card">
          <p><span class="badge">${item.level}</span></p>
          <h3>${formatOrFallback(item.title, 'タイトル未設定')}</h3>
          <p><strong>説明:</strong> ${formatOrFallback(item.explanation, '説明未設定')}</p>
          ${(item.examples || []).map((ex) => `<p><strong>${formatOrFallback(ex.spanish, '例文未設定')}</strong><br>${formatOrFallback(ex.japanese, '訳未設定')}</p>`).join('')}
          <p><strong>注意点:</strong> ${formatOrFallback(item.note, '未設定')}</p>
          <p><strong>よくある間違い:</strong> ${formatOrFallback(item.commonMistake, '未設定')}</p>
        </article>
      `).join('')}
    </div>
  `;
}

function renderReadings() {
  const items = state.readings[state.selectedLevel] || [];
  document.getElementById('screen-readings').innerHTML = `
    <div class="card">
      <h2>長文読解</h2>
      ${renderLevelButtons()}
      <div class="card">
        <h3>長文一覧</h3>
        ${items.map((item) => `
          <button class="action-btn" data-open-reading="${item.id}">${item.title} / ${item.level} / ${item.category}${state.readingStatus[item.id] ? ' ✅' : ''}</button>
        `).join('')}
      </div>
      <div id="reading-detail"></div>
    </div>
  `;

  if (state.openReadingId) {
    renderReadingDetail(state.openReadingId);
  }
}

function renderReadingDetail(readingId) {
  const target = (state.readings[state.selectedLevel] || []).find((item) => item.id === readingId);
  const container = document.getElementById('reading-detail');
  if (!container || !target) return;

  const showTranslation = Boolean(state.translationVisible[readingId]);
  container.innerHTML = `
    <article class="card">
      <h3>${target.title}</h3>
      <p><span class="badge">${target.level}</span> <span class="badge">${target.category}</span></p>
      <div class="reading-text">${formatOrFallback(target.text, '本文未設定')}</div>
      <div class="reading-actions">
        <button class="action-btn" data-toggle-translation="${target.id}">${showTranslation ? '日本語訳を隠す' : '日本語訳を表示'}</button>
        <button class="action-btn primary" data-mark-read="${target.id}">読了にする</button>
      </div>
      <div class="translation-box ${showTranslation ? '' : 'hidden'}">${formatOrFallback(target.translation, '日本語訳未設定')}</div>

      <h4>重要語句</h4>
      <div>${(target.vocabulary || []).map((v) => `<span class="chip">${formatOrFallback(v.word, '語句未設定')}: ${formatOrFallback(v.meaning, '訳未設定')}</span>`).join('')}</div>

      <h4>内容確認クイズ</h4>
      ${(target.questions || []).map((q) => {
        const result = state.quizResults[q.id];
        const resultText = !result ? '' : result.correct ? '正解です。' : `不正解です。正答: ${q.answer}`;
        const resultClass = !result ? '' : result.correct ? 'ok' : 'ng';
        return `
          <div class="card">
            <p><strong>${q.question}</strong></p>
            ${(q.choices || []).map((choice) => `<button class="choice-btn" data-question-id="${q.id}" data-reading-id="${target.id}" data-choice="${choice}">${choice}</button>`).join('')}
            <p class="result ${resultClass}">${resultText}</p>
          </div>
        `;
      }).join('')}
    </article>
  `;
}

function renderReview() {
  const level = state.selectedLevel;
  const unknownWords = (state.words[level] || []).filter((w) => state.wordsStatus[w.id] === 'unknown');
  const wrongQuiz = Object.entries(state.quizResults)
    .filter(([, v]) => !v.correct && v.level === level)
    .map(([id, value]) => ({ id, ...value }));
  const unreadReadings = (state.readings[level] || []).filter((r) => !state.readingStatus[r.id]);

  document.getElementById('screen-review').innerHTML = `
    <div class="card">
      <h2>復習</h2>
      ${renderLevelButtons()}

      <article class="card">
        <h3>未習得の単語一覧</h3>
        ${unknownWords.length ? unknownWords.map((w) => `
          <div class="card">
            <p><strong>${w.word}</strong></p>
            <button class="action-btn" data-reveal-word="${w.id}">答えを見る</button>
            <button class="action-btn primary" data-word-id="${w.id}" data-word-state="known">覚えたに変更</button>
            <p id="reveal-${w.id}" class="translation-box hidden">${formatOrFallback(w.meaning, '訳未設定')}</p>
          </div>
        `).join('') : '<p>未習得単語はありません。</p>'}
      </article>

      <article class="card">
        <h3>間違えたクイズ一覧</h3>
        ${wrongQuiz.length ? wrongQuiz.map((q) => `
          <div class="card">
            <p><strong>問題:</strong> ${q.question}</p>
            <p class="translation-box"><strong>正解:</strong> ${q.answer}</p>
          </div>
        `).join('') : '<p>間違えたクイズはありません。</p>'}
      </article>

      <article class="card">
        <h3>未読の長文一覧</h3>
        ${unreadReadings.length ? unreadReadings.map((r) => `
          <div class="card">
            <p><strong>${r.title}</strong></p>
            <p><span class="badge">${r.level}</span> <span class="badge">${r.category}</span></p>
          </div>
        `).join('') : '<p>未読長文はありません。</p>'}
      </article>
    </div>
  `;
}

function levelProgressHtml() {
  return LEVELS.map((level) => {
    const words = state.words[level] || [];
    const readings = state.readings[level] || [];
    const known = words.filter((w) => state.wordsStatus[w.id] === 'known').length;
    const readDone = readings.filter((r) => state.readingStatus[r.id]).length;
    const quiz = Object.values(state.quizResults).filter((q) => q.level === level);
    const rate = quiz.length ? Math.round((quiz.filter((q) => q.correct).length / quiz.length) * 100) : 0;
    return `<div class="stat-card"><strong>${level}</strong><br>単語 ${known}/${words.length}<br>長文 ${readDone}/${readings.length}<br>正答率 ${rate}%</div>`;
  }).join('');
}

function renderHistory() {
  const stats = calculateStats();
  document.getElementById('screen-history').innerHTML = `
    <div class="card">
      <h2>学習履歴</h2>
      ${renderLevelButtons()}
      <div class="stats-grid">
        <div class="stat-card"><div>学習済み単語数</div><div class="stat-value">${stats.known}</div></div>
        <div class="stat-card"><div>未習得単語数</div><div class="stat-value">${stats.unknown}</div></div>
        <div class="stat-card"><div>読了した長文数</div><div class="stat-value">${stats.readDone}</div></div>
        <div class="stat-card"><div>解いたクイズ数</div><div class="stat-value">${stats.quizCount}</div></div>
        <div class="stat-card"><div>正解数</div><div class="stat-value">${stats.correct}</div></div>
        <div class="stat-card"><div>正答率</div><div class="stat-value">${stats.rate}%</div></div>
        <div class="stat-card"><div>最終学習日</div><div>${stats.lastStudyDate}</div></div>
      </div>
      <h3>レベル別の学習状況</h3>
      <div class="stats-grid">${levelProgressHtml()}</div>
      <button class="action-btn" data-reset-history="1">履歴リセット</button>
    </div>
  `;
}

function renderAllScreens() {
  hideError();
  renderHome();
  renderWords();
  renderGrammar();
  renderReadings();
  renderReview();
  renderHistory();
}

function switchScreen(screenName) {
  state.currentScreen = screenName;
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach((el) => el.classList.remove('active'));
  document.getElementById(`screen-${screenName}`).classList.add('active');
  document.querySelector(`.nav-btn[data-target="${screenName}"]`).classList.add('active');
}

function setLevel(level) {
  state.selectedLevel = level;
  saveStorage(STORAGE_KEYS.selectedLevel, level);
  state.openReadingId = null;
  renderAllScreens();
  switchScreen(state.currentScreen);
}

function setWordStatus(wordId, status) {
  state.wordsStatus[wordId] = status;
  saveStorage(STORAGE_KEYS.wordsStatus, state.wordsStatus);
  updateLastStudyDate();
  renderAllScreens();
  switchScreen(state.currentScreen);
}

function answerQuiz(questionId, readingId, choice) {
  const reading = (state.readings[state.selectedLevel] || []).find((r) => r.id === readingId);
  if (!reading) return;
  const question = (reading.questions || []).find((q) => q.id === questionId);
  if (!question) return;

  state.quizResults[questionId] = {
    level: reading.level,
    question: question.question,
    answer: question.answer,
    correct: choice === question.answer,
    readingId
  };

  saveStorage(STORAGE_KEYS.quizResults, state.quizResults);
  updateLastStudyDate();
  renderReadingDetail(readingId);
  renderHome();
  renderHistory();
  renderReview();
}

function markReadingDone(readingId) {
  state.readingStatus[readingId] = true;
  saveStorage(STORAGE_KEYS.readingStatus, state.readingStatus);
  updateLastStudyDate();
  renderAllScreens();
  switchScreen('readings');
}

function resetHistory() {
  const ok = confirm('学習履歴をリセットします。よろしいですか？');
  if (!ok) return;

  state.wordsStatus = {};
  state.readingStatus = {};
  state.quizResults = {};
  state.translationVisible = {};

  localStorage.removeItem(STORAGE_KEYS.wordsStatus);
  localStorage.removeItem(STORAGE_KEYS.readingStatus);
  localStorage.removeItem(STORAGE_KEYS.quizResults);
  localStorage.removeItem(STORAGE_KEYS.lastStudyDate);

  renderAllScreens();
  switchScreen('history');
}

function setupEvents() {
  document.body.addEventListener('click', (event) => {
    const target = event.target;

    if (target.matches('.nav-btn')) {
      switchScreen(target.dataset.target);
      return;
    }

    if (target.matches('[data-go]')) {
      switchScreen(target.dataset.go);
      return;
    }

    if (target.matches('.level-btn')) {
      setLevel(target.dataset.level);
      return;
    }

    if (target.matches('[data-word-id]')) {
      setWordStatus(target.dataset.wordId, target.dataset.wordState);
      return;
    }

    if (target.matches('[data-open-reading]')) {
      state.openReadingId = target.dataset.openReading;
      state.translationVisible[state.openReadingId] = false;
      renderReadings();
      return;
    }

    if (target.matches('[data-toggle-translation]')) {
      const readingId = target.dataset.toggleTranslation;
      state.translationVisible[readingId] = !state.translationVisible[readingId];
      renderReadingDetail(readingId);
      return;
    }

    if (target.matches('[data-question-id]')) {
      answerQuiz(target.dataset.questionId, target.dataset.readingId, target.dataset.choice);
      return;
    }

    if (target.matches('[data-mark-read]')) {
      markReadingDone(target.dataset.markRead);
      return;
    }

    if (target.matches('[data-reveal-word]')) {
      const reveal = document.getElementById(`reveal-${target.dataset.revealWord}`);
      if (reveal) reveal.classList.toggle('hidden');
      return;
    }

    if (target.matches('[data-reset-history]')) {
      resetHistory();
    }
  });
}

async function init() {
  document.getElementById('app-version').textContent = APP_VERSION;

  state.selectedLevel = loadStorage(STORAGE_KEYS.selectedLevel, 'A1');
  state.wordsStatus = loadStorage(STORAGE_KEYS.wordsStatus, {});
  state.readingStatus = loadStorage(STORAGE_KEYS.readingStatus, {});
  state.quizResults = loadStorage(STORAGE_KEYS.quizResults, {});

  registerServiceWorker();

  try {
    await loadAllData();
    renderAllScreens();
    switchScreen('home');
    setupEvents();
  } catch (error) {
    showError('教材データの読み込みに失敗しました。JSON形式と通信状態を確認してください。');
  }
}

document.addEventListener('DOMContentLoaded', init);
