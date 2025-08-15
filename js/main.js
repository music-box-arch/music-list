// 1. グローバル変数（最小限）
let lazy = false; // lazyload済みフラグ
let festLazy = false; // fest-lazy.js読み込み済みフラグ

// DOM表でリンクを作る関数を定義
const makeLink = (label, url) =>
  url ? `<a href="${url}" target="_blank">${label}</a>` : '';

// 初回ボタン押下時のlazyload処理
async function initLazy() {
  if (lazy) return;


  // 各モジュールから必要な機能をimport
  const { setupGlobals } = await import('./main-lazy.js');
  const { initChkState, setGlobals, syncChk, syncSetlistChk } = await import('./checkstate.js');

  // チェック状態管理を初期化
  await initChkState();

  // グローバル関数を設定
  setupGlobals();

  // 曲一覧チェックボックス同期を設定（リアルタイム同期開始）
  syncChk();

  // セットリスト用チェックボックス同期を設定
  syncSetlistChk();

  // グローバル関数を設定
  setGlobals();

  lazy = true;
}

// セットリスト機能のlazyload処理
async function initFestLazy() {
  if (festLazy) return;

  const { initSL } = await import('./fest-lazy.js');

  // セットリスト機能を初期化
  await initSL();

  festLazy = true;
}

// 2. DOMContentLoaded後の処理
document.addEventListener('DOMContentLoaded', function () {
  // 2-1. 曲リスト表生成（最優先）
  fetch('data/music-list.json')
    .then(response => response.json())
    .then(musicData => {
      // ヘッダー作成
      const thead = document.querySelector('#musicTbl thead');
      thead.innerHTML = '';
      const trHead = document.createElement('tr');
      ['✔︎', '曲名', 'YT', 'LV', 'Spf', 'Apl', 'iTn', 's/m', '初収録', '曲順', '発売日'].forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);

      // テーブル本体作成
      const tbody = document.querySelector('#musicTbl tbody');
      tbody.innerHTML = '';

      // mIDでソートしてから表示
      const sortedEntries = Object.entries(musicData).sort((a, b) => a[1].mID - b[1].mID);

      sortedEntries.forEach(([id, song]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td><input type="checkbox" class="chk" data-id="${song.mID}"></td>
        <td>${song.title}</td>
        <td>${song.yt}</td>
        <td>${song.lv}</td>
        <td>${song.spf}</td>
        <td>${song.apl}</td>
        <td>${song.itn}</td>
        <td>${song.exsm || ''}</td>
        <td>${song.firstCd}</td>
        <td>${song.order || ''}</td>
        <td>${song.cdDate}</td>
      `;
        tbody.appendChild(tr);
      });

      // 表生成完了後、最小限のボタン有効化とタブ機能初期化
      enableMinimalButtons();
      enableCdButtons(); // CDボタンをすぐに有効化
      initializeTabFunctionality();
    })
    .catch(error => {
      console.error('JSON読み込みエラー:', error);
    });

  // 2-2. 最小限のボタン有効化
  function enableMinimalButtons() {
    // 4つの重要ボタンに初回lazyload検出を設定
    const filterCheckbox = document.getElementById('chkSb');
    const styleCheckbox = document.getElementById('shStChk');
    const mixCheckbox = document.getElementById('shMxChk');
    const showCheckedOnlyCheckbox = document.getElementById('shChkOnly');

    if (filterCheckbox) {
      filterCheckbox.addEventListener('change', async function () {
        if (!lazy) {
          await initLazy();
        }
        // lazyload後、実際の処理を実行
        if (window.subNo) {
          window.subNo(this.checked);
        }
      });
    }

    if (styleCheckbox) {
      styleCheckbox.addEventListener('change', async function () {
        if (!lazy) {
          await initLazy();
        }
        // lazyload後、実際の処理を実行
        if (window.style) {
          const mixCheckbox = document.getElementById('shMxChk');
          window.style(this.checked, mixCheckbox ? mixCheckbox.checked : false);
        }
      });
    }

    if (mixCheckbox) {
      mixCheckbox.addEventListener('change', async function () {
        if (!lazy) {
          await initLazy();
        }
        // lazyload後、実際の処理を実行
        if (window.mix) {
          const styleCheckbox = document.getElementById('shStChk');
          window.mix(styleCheckbox ? styleCheckbox.checked : false, this.checked);
        }
      });
    }

    if (showCheckedOnlyCheckbox) {
      showCheckedOnlyCheckbox.addEventListener('change', async function () {
        if (!lazy) {
          await initLazy();
        }
        // lazyload後、実際の処理を実行
        if (window.showChk) {
          window.showChk(this.checked);
        }
      });
    }

    // 曲名検索のフォーカス時lazyload検出
    const songNameSearch = document.getElementById('sngSrch');
    if (songNameSearch) {
      songNameSearch.addEventListener('focus', async function () {
        if (!lazy) {
          await initLazy();
        }
        // 検索機能を有効化（重複防止は関数内で処理）
        if (window.enSrch) {
          window.enSrch();
        }
      });
    }

    // CDを見るボタンは別途initLazy()で設定済み

    // クリアボタンは最小限の機能のみ
    document.querySelectorAll('.clearAllChecksBtn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.chk:checked').forEach(chk => {
          chk.checked = false;
        });

        // サブスク無しチェックボックスも外す
        const subNoCheckbox = document.getElementById('chkSb');
        if (subNoCheckbox && subNoCheckbox.checked) {
          subNoCheckbox.checked = false;
        }

        // checkStateのクリアはlazyload後に担当
        if (lazy && window.clrCS) {
          window.clrCS();
        }
      });
    });
  }

  // 2-3. CDボタンの有効化（イベントリスナーのみ設置）
  function enableCdButtons() {
    document.querySelectorAll('.showDiscsButton').forEach(btn => {
      btn.disabled = false;
      btn.addEventListener('click', async () => {
        // 1. 先にcheckState記録のためにmain-lazy.js + checkstate.jsを読み込み
        if (!lazy) {
          await initLazy();
        }

        // 2. result.jsを動的読み込みしてCD処理実行
        const { initCdFeats } = await import('./result.js');
        await initCdFeats();
        
        if (window.cdBtn) {
          window.cdBtn();
        }
      });
    });
  }

  // 2-4. タブ機能の初期化
  function initializeTabFunctionality() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        const targetTab = this.dataset.tab;

        // main-lazyが未読み込みの場合、チェック状態を初期化
        if (!lazy) {
          await initLazy();
        }

        // セットリストタブが初回クリックされた場合
        if (targetTab === 'setlist' && !festLazy) {
          await initFestLazy();
        }

        // タブ切り替え時のチェック状態同期
        if (targetTab === 'setlist') {
          // セットリストタブに切り替える時、checkStateを反映
          if (window.applyCSSet) {
            window.applyCSSet();
          }
        } else if (targetTab === 'songlist') {
          // 曲一覧タブに切り替える時、checkStateを反映
          if (window.applyCS) {
            window.applyCS();
          }
        }

        // タブ切り替え処理
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        this.classList.add('active');
        document.getElementById(targetTab + '-tab').classList.add('active');
      });
    });
  }

  // 2-4. トップに戻るボタン生成
  const backToTop = document.createElement('a');
  backToTop.href = '#tp';
  backToTop.id = 'back-to-top';
  backToTop.textContent = '▲ TOP';
  document.body.appendChild(backToTop);

  // スクロールイベント設定
  window.addEventListener('scroll', function () {
    if (window.scrollY > 300) {
      backToTop.classList.add('show');
    } else {
      backToTop.classList.remove('show');
    }
  });
});