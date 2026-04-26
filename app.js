const APP_VERSION = '1.0.0';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const STORAGE_KEYS = {
  wordsStatus: 'lector_words_status',
  readingStatus: 'lector_reading_status',
  quizResults: 'lector_quiz_results',
  lastStudyDate: 'lector_last_study_date',
  selectedLevel: 'lector_selected_level'
};

const state = {
  selectedLevel: 'A1',
  screen: 'home',
  words: {},
  grammar: {},
  readings: {},
  wordsStatus: {},
  readingStatus: {},
  quizResults: {}
};

// localStorage 読み込み共通関数（壊れていてもアプリが止まらないようにする）
function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// localStorage 保存共通関数
function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function touchStudyDate() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(STORAGE_KEYS.lastStudyDate, today);
}

function showError(message) {
  const banner = document.getElementById('error-banner');
  banner.textContent = message;
  banner.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-banner').classList.add('hidden');
}

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`データ取得失敗: ${path}`);
  return res.json();
}

async function loadAllData() {
  const promises = [];
  for (const level of LEVELS) {
    promises.push(loadJson(`./data/words_${level}.json`).then(d => state.words[level] = d));
    promises.push(loadJson(`./data/grammar_${level}.json`).then(d => state.grammar[level] = d));
    promises.push(loadJson(`./data/readings_${level}.json`).then(d => state.readings[level] = d));
  }
  await Promise.all(promises);
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      showError('Service Worker の登録に失敗しました。オンラインで再読み込みしてください。');
    });
  }
}

function statsSummary() {
  const allWords = LEVELS.flatMap(l => state.words[l] || []);
  const allReadings = LEVELS.flatMap(l => state.readings[l] || []);
  const wordKnown = Object.values(state.wordsStatus).filter(v => v === 'known').length;
  const wordUnknown = Object.values(state.wordsStatus).filter(v => v === 'unknown').length;
  const readDone = Object.values(state.readingStatus).filter(Boolean).length;
  const quizEntries = Object.values(state.quizResults);
  const quizTotal = quizEntries.length;
  const quizCorrect = quizEntries.filter(v => v.correct).length;
  const rate = quizTotal ? Math.round((quizCorrect / quizTotal) * 100) : 0;
  return {
    allWords: allWords.length,
    wordKnown,
    wordUnknown,
    readDone,
    quizTotal,
    quizCorrect,
    rate,
    lastDate: localStorage.getItem(STORAGE_KEYS.lastStudyDate) || '未学習',
    unlearnedWords: allWords.filter(w => state.wordsStatus[w.id] !== 'known').length,
    unreadReadings: allReadings.filter(r => !state.readingStatus[r.id]).length
  };
}

function levelButtons(active, cbName) {
  return `<div class="level-switcher">${LEVELS.map(l => `<button class="level-btn ${l === active ? 'active' : ''}" data-cb="${cbName}" data-level="${l}">${l}</button>`).join('')}</div>`;
}

function renderHome() {
  const s = statsSummary();
  document.getElementById('screen-home').innerHTML = `
    <div class="card">
      <h2 class="section-title">今日の学習へ</h2>
      <p>現在レベル: <span class="badge">${state.selectedLevel}</span></p>
      <div class="stats-grid">
        <div class="stat-card"><div>学習済み単語</div><div class="stat-value">${s.wordKnown}</div></div>
        <div class="stat-card"><div>未習得単語</div><div class="stat-value">${s.wordUnknown}</div></div>
        <div class="stat-card"><div>読了長文</div><div class="stat-value">${s.readDone}</div></div>
        <div class="stat-card"><div>クイズ正答率</div><div class="stat-value">${s.rate}%</div></div>
        <div class="stat-card"><div>最終学習日</div><div>${s.lastDate}</div></div>
      </div>
    </div>
    <div class="links-grid">
      ${['words','grammar','readings','review','history'].map(k => `<button class="card quick-link" data-go="${k}">${({words:'単語',grammar:'文法',readings:'長文読解',review:'復習',history:'学習履歴'})[k]}</button>`).join('')}
    </div>
  `;
}

function renderWords() {
  const list = state.words[state.selectedLevel] || [];
  document.getElementById('screen-words').innerHTML = `
    <div class="card">
      <h2 class="section-title">単語学習 (${state.selectedLevel})</h2>
      ${levelButtons(state.selectedLevel, 'select-level')}
      ${list.map(w => {
        const st = state.wordsStatus[w.id] || 'new';
        return `<article class="card">
          <div><span class="badge">${w.level}</span></div>
          <h3>${w.word}</h3>
          <p><strong>日本語訳:</strong> ${w.meaning}</p>
          <p><strong>品詞:</strong> ${w.partOfSpeech}</p>
          <p><strong>例文:</strong> ${w.example}</p>
          <p class="translation-box">${w.translation}</p>
          <p><strong>補足:</strong> ${w.note}</p>
          <p>状態: <strong>${st === 'known' ? '覚えた' : st === 'unknown' ? '未習得' : '未設定'}</strong></p>
          <div class="word-actions">
            <button class="action-btn primary" data-word-id="${w.id}" data-word-state="known">覚えた</button>
            <button class="action-btn" data-word-id="${w.id}" data-word-state="unknown">未習得</button>
          </div>
        </article>`;
      }).join('')}
    </div>
  `;
}

function renderGrammar() {
  const list = state.grammar[state.selectedLevel] || [];
  document.getElementById('screen-grammar').innerHTML = `
    <div class="card">
      <h2 class="section-title">文法 (${state.selectedLevel})</h2>
      ${levelButtons(state.selectedLevel, 'select-level')}
      ${list.map(g => `
        <article class="card">
          <div><span class="badge">${g.level}</span></div>
          <h3>${g.title}</h3>
          <p>${g.explanation}</p>
          ${(g.examples || []).map(ex => `<p><strong>${ex.spanish}</strong><br>${ex.japanese}</p>`).join('')}
          <p><strong>注意点:</strong> ${g.note}</p>
          <p><strong>よくある間違い:</strong> ${g.commonMistake}</p>
        </article>
      `).join('')}
    </div>
  `;
}

function renderReadings() {
  const list = state.readings[state.selectedLevel] || [];
  document.getElementById('screen-readings').innerHTML = `
    <div class="card">
      <h2 class="section-title">長文読解 (${state.selectedLevel})</h2>
      ${levelButtons(state.selectedLevel, 'select-level')}
      <div class="card">
        <h3>長文一覧</h3>
        ${list.map(r => `<button class="action-btn" data-open-reading="${r.id}">${r.title} (${r.category}) ${state.readingStatus[r.id] ? '✅' : ''}</button>`).join('<br>')}
      </div>
      <div id="reading-detail"></div>
    </div>
  `;
}

function renderReadingDetail(readingId) {
  const reading = (state.readings[state.selectedLevel] || []).find(r => r.id === readingId);
  if (!reading) return;
  const detail = document.getElementById('reading-detail');
  detail.innerHTML = `
    <article class="card">
      <h3>${reading.title}</h3>
      <p><span class="badge">${reading.level}</span> <span class="badge">${reading.category}</span></p>
      <div class="reading-text">${reading.text}</div>
      <button class="action-btn" data-toggle-translation="${reading.id}">日本語訳を表示/隠す</button>
      <div id="translation-${reading.id}" class="translation-box hidden">${reading.translation}</div>
      <h4>重要語句</h4>
      <div class="chips">${reading.vocabulary.map(v => `<span class="chip">${v.word}: ${v.meaning}</span>`).join('')}</div>
      <h4>内容確認クイズ</h4>
      ${reading.questions.map(q => {
        const res = state.quizResults[q.id];
        return `<div class="card">
          <p><strong>${q.question}</strong></p>
          ${q.choices.map(c => `<button class="choice-btn" data-question-id="${q.id}" data-choice="${c}">${c}</button>`).join('')}
          <div class="result ${res ? (res.correct ? 'ok' : 'ng') : ''}">${res ? (res.correct ? '正解です。' : `不正解です。正答: ${q.answer}`) : ''}</div>
        </div>`;
      }).join('')}
      <button class="action-btn primary" data-mark-read="${reading.id}">読了にする</button>
    </article>
  `;
}

function renderReview() {
  const level = state.selectedLevel;
  const words = (state.words[level] || []).filter(w => state.wordsStatus[w.id] === 'unknown');
  const wrongQuizzes = Object.entries(state.quizResults)
    .filter(([, v]) => !v.correct && v.level === level)
    .map(([id, v]) => ({ id, ...v }));
  const unread = (state.readings[level] || []).filter(r => !state.readingStatus[r.id]);

  document.getElementById('screen-review').innerHTML = `
    <div class="card">
      <h2 class="section-title">復習 (${level})</h2>
      ${levelButtons(level, 'select-level')}
      <article class="card">
        <h3>未習得の単語</h3>
        ${words.length ? words.map(w => `<div class="card"><strong>${w.word}</strong>
          <button class="action-btn" data-reveal-word="${w.id}">答えを見る</button>
          <button class="action-btn primary" data-word-id="${w.id}" data-word-state="known">覚えたに変更</button>
          <div id="reveal-${w.id}" class="translation-box hidden">${w.meaning}</div></div>`).join('') : '<p>ありません。</p>'}
      </article>
      <article class="card">
        <h3>間違えたクイズ</h3>
        ${wrongQuizzes.length ? wrongQuizzes.map(q => `<div class="card"><p>${q.question}</p><p class="translation-box">正解: ${q.answer}</p></div>`).join('') : '<p>ありません。</p>'}
      </article>
      <article class="card">
        <h3>未読の長文</h3>
        ${unread.length ? unread.map(r => `<div class="card"><strong>${r.title}</strong> <span class="badge">${r.level}</span> <span class="badge">${r.category}</span></div>`).join('') : '<p>ありません。</p>'}
      </article>
    </div>
  `;
}

function levelStatsHtml() {
  return LEVELS.map(level => {
    const w = (state.words[level] || []).map(x => x.id);
    const r = (state.readings[level] || []).map(x => x.id);
    const known = w.filter(id => state.wordsStatus[id] === 'known').length;
    const done = r.filter(id => state.readingStatus[id]).length;
    const qids = Object.values(state.quizResults).filter(x => x.level === level);
    const rate = qids.length ? Math.round(qids.filter(x => x.correct).length / qids.length * 100) : 0;
    return `<div class="stat-card"><strong>${level}</strong><br>単語 ${known}/${w.length}<br>読解 ${done}/${r.length}<br>クイズ正答率 ${rate}%</div>`;
  }).join('');
}

function renderHistory() {
  const s = statsSummary();
  document.getElementById('screen-history').innerHTML = `
    <div class="card">
      <h2 class="section-title">学習履歴</h2>
      ${levelButtons(state.selectedLevel, 'select-level')}
      <div class="stats-grid">
        <div class="stat-card"><div>学習済み単語数</div><div class="stat-value">${s.wordKnown}</div></div>
        <div class="stat-card"><div>未習得単語数</div><div class="stat-value">${s.wordUnknown}</div></div>
        <div class="stat-card"><div>読了長文数</div><div class="stat-value">${s.readDone}</div></div>
        <div class="stat-card"><div>解いたクイズ数</div><div class="stat-value">${s.quizTotal}</div></div>
        <div class="stat-card"><div>正解数</div><div class="stat-value">${s.quizCorrect}</div></div>
        <div class="stat-card"><div>正答率</div><div class="stat-value">${s.rate}%</div></div>
        <div class="stat-card"><div>最終学習日</div><div>${s.lastDate}</div></div>
      </div>
      <h3>レベル別学習状況</h3>
      <div class="stats-grid">${levelStatsHtml()}</div>
      <button class="action-btn" data-reset-history="1">履歴リセット</button>
    </div>
  `;
}

function renderCurrentScreen() {
  hideError();
  renderHome();
  renderWords();
  renderGrammar();
  renderReadings();
  renderReview();
  renderHistory();
}

function switchScreen(target) {
  state.screen = target;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelector(`#screen-${target}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.target === target));
}

function setupEvents() {
  document.body.addEventListener('click', (e) => {
    const t = e.target;
    if (t.matches('[data-go]')) { switchScreen(t.dataset.go); return; }
    if (t.matches('.nav-btn')) { switchScreen(t.dataset.target); return; }

    if (t.matches('.level-btn')) {
      state.selectedLevel = t.dataset.level;
      localStorage.setItem(STORAGE_KEYS.selectedLevel, state.selectedLevel);
      renderCurrentScreen();
      switchScreen(state.screen);
      return;
    }

    if (t.matches('[data-word-id]')) {
      state.wordsStatus[t.dataset.wordId] = t.dataset.wordState;
      saveStorage(STORAGE_KEYS.wordsStatus, state.wordsStatus);
      touchStudyDate();
      renderCurrentScreen();
      switchScreen(state.screen);
      return;
    }

    if (t.matches('[data-open-reading]')) {
      renderReadingDetail(t.dataset.openReading);
      return;
    }

    if (t.matches('[data-toggle-translation]')) {
      document.getElementById(`translation-${t.dataset.toggleTranslation}`).classList.toggle('hidden');
      return;
    }

    if (t.matches('[data-question-id]')) {
      const questionId = t.dataset.questionId;
      const choice = t.dataset.choice;
      const reading = (state.readings[state.selectedLevel] || []).find(r => r.questions.some(q => q.id === questionId));
      const q = reading.questions.find(x => x.id === questionId);
      state.quizResults[questionId] = {
        correct: choice === q.answer,
        answer: q.answer,
        question: q.question,
        level: reading.level,
        readingId: reading.id
      };
      saveStorage(STORAGE_KEYS.quizResults, state.quizResults);
      touchStudyDate();
      renderReadingDetail(reading.id);
      renderHistory();
      renderHome();
      return;
    }

    if (t.matches('[data-mark-read]')) {
      state.readingStatus[t.dataset.markRead] = true;
      saveStorage(STORAGE_KEYS.readingStatus, state.readingStatus);
      touchStudyDate();
      renderCurrentScreen();
      switchScreen('readings');
      return;
    }

    if (t.matches('[data-reveal-word]')) {
      document.getElementById(`reveal-${t.dataset.revealWord}`).classList.toggle('hidden');
      return;
    }

    if (t.matches('[data-reset-history]')) {
      if (confirm('学習履歴をリセットします。よろしいですか？')) {
        state.wordsStatus = {};
        state.readingStatus = {};
        state.quizResults = {};
        localStorage.removeItem(STORAGE_KEYS.wordsStatus);
        localStorage.removeItem(STORAGE_KEYS.readingStatus);
        localStorage.removeItem(STORAGE_KEYS.quizResults);
        localStorage.removeItem(STORAGE_KEYS.lastStudyDate);
        renderCurrentScreen();
        switchScreen('history');
      }
    }
  });
}

async function init() {
  document.getElementById('app-version').textContent = APP_VERSION;
  state.selectedLevel = localStorage.getItem(STORAGE_KEYS.selectedLevel) || 'A1';
  state.wordsStatus = loadStorage(STORAGE_KEYS.wordsStatus, {});
  state.readingStatus = loadStorage(STORAGE_KEYS.readingStatus, {});
  state.quizResults = loadStorage(STORAGE_KEYS.quizResults, {});

  registerSW();
  try {
    await loadAllData();
    renderCurrentScreen();
    switchScreen('home');
    setupEvents();
  } catch (err) {
    showError('教材データの読み込みに失敗しました。通信状態を確認して再読み込みしてください。');
  }
}

document.addEventListener('DOMContentLoaded', init);
