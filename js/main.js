// 1. グローバル変数
let allDiscs = null;
let musicMap = null;
let subNoMap = null;
let checkStateBackup = null; // サブスクフィルター用のバックアップ

// DOM表でリンクを作る関数を定義
const makeLink = (label, url) =>
  url ? `<a href="${url}" target="_blank">${label}</a>` : '';

// 2. DOMContentLoaded後の処理
document.addEventListener('DOMContentLoaded', function () {

  // 2-1. 曲リスト表生成（最優先）
  fetch('data/music-list.csv')
    .then(response => response.text())
    .then(csvText => {
      const parsed = Papa.parse(csvText, { header: true });
      const rows = parsed.data;

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
      rows.forEach(row => {
        if (!row['title'] || !row['mID']) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="checkbox" class="chk" data-id="${row['mID']}"></td>
          <td>${row['title']}</td>
          <td>${makeLink(row['YT1'], row['YT1URL'])}</td>
          <td>${makeLink('LV', row['LV'])}</td>
          <td>${makeLink('Spf', row['Spf'])}</td>
          <td>${makeLink('Apl', row['Apl'])}</td>
          <td>${makeLink('iTn', row['iTn'])}</td>
          <td>${row['m/s'] || ''}</td>
          <td>${row['f-cd-name'] || ''}</td>
          <td>${row['order'] || ''}</td>
          <td>${row['cd-date'] || ''}</td>
        `;
        tbody.appendChild(tr);
      });

      // 表生成完了後、即座にボタンを有効化
      enableButtons();
    })
    .catch(error => {
      console.error('CSV読み込みエラー:', error);
    });

  /* ↓サブスク用チェック云々のやつここから↓ */

  // 2-2. サブスクフィルターチェックボックスのイベント設定（1回だけ）
  const filterCheckbox = document.getElementById('checkSubNoOnly');
  if (filterCheckbox) {
    filterCheckbox.addEventListener('change', async function () {
      if (this.checked) {
        // チェックを入れた時：現在の状態をバックアップしてからサブスクなしにチェック
        checkStateBackup = getCurrentCheckState();
        logBackupState('バックアップ取得', checkStateBackup);

        await applySubNoChecks();

        const afterState = getCurrentCheckState();
        logBackupState('サブスク無し適用後', afterState);
      } else {
        // チェックを外した時：バックアップから復元
        if (checkStateBackup) {
          restoreCheckState(checkStateBackup);
          const restoredState = getCurrentCheckState();
          logBackupState('復元後', restoredState);
        } else {
          console.log('バックアップが存在しません');
        }
      }
    });
  }

  // 2-3. ボタン有効化とイベントリスナー設定
  function enableButtons() {
    // CDを見るボタンを有効化してイベント設定
    document.querySelectorAll('.showDiscsButton').forEach(btn => {
      btn.disabled = false;
      btn.addEventListener('click', async () => {
        const { loadDataIfNeeded, buildMatrix, generateHTMLTable, setupCdTypeFilter } = await import('./main-lazy.js');
        setupCdTypeFilter();
        const checked = document.querySelectorAll('.chk:checked');
        const rawSongIDs = Array.from(checked).map(chk => Number(chk.dataset.id));
        const songIDs = [...new Set(rawSongIDs)];

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

    // クリアボタンのイベント設定
    document.querySelectorAll('.clearAllChecksBtn').forEach(btn => {
      btn.addEventListener('click', clearAllChecks);
    });
  }

  // 2-4. トップに戻るボタン生成
  const backToTop = document.createElement('a');
  backToTop.href = '#checklistArea';
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

  // 2-8. クリアボタン機能
  function clearAllChecks() {
    document.querySelectorAll('.chk:checked').forEach(chk => {
      chk.checked = false;
    });
    checkStateBackup = null;
  }

  /* サブスク用チェック云々のやつここまで */

  // 2-9. サブスクフィルター関連の関数（配列版）

  // デバッグ用ログ出力
  function logBackupState(label, checkedIds) {
    console.log(`=== ${label} ===`);
    if (!checkedIds) {
      console.log('バックアップなし');
      return;
    }
    console.log('件数:', checkedIds.length);
  }

  // 現在チェックされているIDを配列で取得
  function getCurrentCheckState() {
    const checkedIds = [];
    document.querySelectorAll('.chk:checked').forEach(chk => {
      checkedIds.push(Number(chk.dataset.id));
    });
    return checkedIds.sort((a, b) => a - b); // ソートして見やすく
  }

  // チェック状態を復元
  function restoreCheckState(checkedIds) {
    console.log('復元開始, 対象:', checkedIds.length, '件', checkedIds);
    // 全てのチェックを外す
    document.querySelectorAll('.chk').forEach(chk => {
      chk.checked = false;
    });
    // 指定されたIDのみチェック
    checkedIds.forEach(id => {
      const checkbox = document.querySelector(`.chk[data-id="${id}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
    console.log('復元完了');
  }

  // サブスクなしの曲にチェックを入れる（既存のチェックは保持）
  async function applySubNoChecks() {
    if (!subNoMap) {
      const res = await fetch('data/sub-no.json');
      subNoMap = await res.json();
      console.log('sub-no.json 読み込み完了', Object.keys(subNoMap).length, '件');
    }

    let appliedCount = 0;
    Object.keys(subNoMap).forEach(id => {
      const checkbox = document.querySelector(`.chk[data-id="${id}"]`);
      if (checkbox) {
        checkbox.checked = true;
        appliedCount++;
      }
    });
    console.log('サブスク無し適用:', appliedCount, '件');
  }

  /* サブスク用チェック云々のやつここまで */
});