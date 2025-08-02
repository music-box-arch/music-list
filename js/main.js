// 1. グローバル変数（最小限）
let lazyLoaded = false; // lazyload済みフラグ

// DOM表でリンクを作る関数を定義
const makeLink = (label, url) =>
  url ? `<a href="${url}" target="_blank">${label}</a>` : '';

// 初回ボタン押下時のlazyload処理
async function initializeLazyFeatures() {
  if (lazyLoaded) return;
  
  console.log('lazyload開始...');
  const { initializeCheckState, setupAllEventListeners } = await import('./main-lazy.js');
  
  // DOM状態を一括取得してcheckStateに初期化
  await initializeCheckState();
  
  // イベントリスナー設定
  setupAllEventListeners();
  
  lazyLoaded = true;
  console.log('lazyload完了');
}

// 2. DOMContentLoaded後の処理
document.addEventListener('DOMContentLoaded', function () {
  // 2-1. 曲リスト表生成（最優先）
  fetch('data/music-list.json')
    .then(response => response.json())
    .then(musicData => {
      // ヘッダー作成
      const thead = document.querySelector('#music-table thead');
      thead.innerHTML = '';
      const trHead = document.createElement('tr');
      ['✔︎', '曲名', 'YT', 'LV', 'Spf', 'Apl', 'iTn', 's/m', '初収録', '曲順', '発売日'].forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);

      // テーブル本体作成
      const tbody = document.querySelector('#music-table tbody');
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

      // 表生成完了後、最小限のボタン有効化
      enableMinimalButtons();
    })
    .catch(error => {
      console.error('JSON読み込みエラー:', error);
    });

  // 2-2. 最小限のボタン有効化
  function enableMinimalButtons() {
    // 3つの重要ボタンに初回lazyload検出を設定
    const filterCheckbox = document.getElementById('checkSubNoOnly');
    const styleCheckbox = document.getElementById('showStyleCheck');
    const mixCheckbox = document.getElementById('showMixCheck');

    if (filterCheckbox) {
      filterCheckbox.addEventListener('change', async function () {
        if (!lazyLoaded) {
          await initializeLazyFeatures();
          // lazyload後、実際の処理を手動実行
          if (window.handleSubNoCheck) {
            window.handleSubNoCheck(this.checked);
          }
        }
      });
    }

    if (styleCheckbox) {
      styleCheckbox.addEventListener('change', async function () {
        if (!lazyLoaded) {
          await initializeLazyFeatures();
          // lazyload後、実際の処理を手動実行
          if (window.handleStyleCheck) {
            const mixCheckbox = document.getElementById('showMixCheck');
            window.handleStyleCheck(this.checked, mixCheckbox ? mixCheckbox.checked : false);
          }
        }
      });
    }

    if (mixCheckbox) {
      mixCheckbox.addEventListener('change', async function () {
        if (!lazyLoaded) {
          await initializeLazyFeatures();
          // lazyload後、実際の処理を手動実行
          if (window.handleMixCheck) {
            const styleCheckbox = document.getElementById('showStyleCheck');
            window.handleMixCheck(styleCheckbox ? styleCheckbox.checked : false, this.checked);
          }
        }
      });
    }

    // CDを見るボタンは通常通り（既にlazyload済み）
    document.querySelectorAll('.showDiscsButton').forEach(btn => {
      btn.disabled = false;
      btn.addEventListener('click', async () => {
        const { loadDataIfNeeded, buildMatrix, generateHTMLTable, setupCdTypeFilter } = await import('./main-lazy.js');
        setupCdTypeFilter();
        
        // DOM状態から直接取得（checkStateは使わない）
        const checked = document.querySelectorAll('.chk:checked');
        const songIDs = Array.from(checked).map(chk => Number(chk.dataset.id));

        if (songIDs.length === 0) {
          alert('1曲以上チェックしてね');
          return;
        }

        const { allDiscs, musicMap } = await loadDataIfNeeded();
        const { headers, rows } = buildMatrix(songIDs, allDiscs, musicMap);
        const table = generateHTMLTable(headers, rows);

        const container = document.getElementById('discsTable');
        container.innerHTML = '';
        container.appendChild(table);

        document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
      });
    });

    // クリアボタンは最小限の機能のみ
    document.querySelectorAll('.clearAllChecksBtn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.chk:checked').forEach(chk => {
          chk.checked = false;
        });
        
        // サブスク無しチェックボックスも外す
        const subNoCheckbox = document.getElementById('checkSubNoOnly');
        if (subNoCheckbox && subNoCheckbox.checked) {
          subNoCheckbox.checked = false;
        }
        
        // checkStateのクリアはlazyload後に担当
        if (lazyLoaded && window.clearCheckState) {
          window.clearCheckState();
        }
      });
    });
  }

  // 2-3. トップに戻るボタン生成
  const backToTop = document.createElement('a');
  backToTop.href = '#top';
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