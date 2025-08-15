// セットリスト表作成専用モジュール
let slMusicData = {}; // 曲データをキャッシュ
let slFiles = []; // 読み込むセットリストファイル一覧
let loadedSetlists = new Map(); // 読み込み済みセットリストのキャッシュ

// セットリスト機能の初期化
export async function initSL() {
  try {
    // 曲データを読み込み
    await loadMusic();

    // ファイル一覧を取得してセットリストデータを読み込んで表を生成
    await loadFileList();
    await loadAndBuild();

    // セットリスト用のイベントリスナーを設定
    setupEvents();

    // cSがあれば反映
    if (window.cS && window.aplCsCxt) {
      window.aplCsCxt('sl');
    }

  } catch (error) {
  }
}

// ファイル一覧の読み込み
async function loadFileList() {
  const response = await fetch('setlist/index.json');
  const indexData = await response.json();
  slFiles = indexData.files || [];
}

// 曲データの読み込み
async function loadMusic() {
  if (Object.keys(slMusicData).length > 0) return; // 既に読み込み済み

  const response = await fetch('data/music-list.json');
  slMusicData = await response.json();
}

// セットリストファイルを読み込んで表を構築
async function loadAndBuild() {
  const slData = [];

  // 各セットリストファイルを読み込み（フラグが1以上のもののみ）
  for (const fileObj of slFiles) {
    const filename = typeof fileObj === 'string' ? fileObj : fileObj.name;
    const flag = typeof fileObj === 'string' ? 1 : (fileObj.flag || 0);

    if (flag >= 1) {
      try {
        const response = await fetch(`setlist/${filename}`);
        const data = await response.json();
        const setlistData = {
          filename,
          ...data
        };
        slData.push(setlistData);
        loadedSetlists.set(filename, setlistData);
      } catch (error) {
      }
    } else {
      // フラグが0の場合は日付情報のみ表示用のプレースホルダを作成
      const dateFromFilename = extractDateFromFilename(filename);
      slData.push({
        filename,
        date: dateFromFilename,
        isPlaceholder: true
      });
    }
  }

  // 表の内容を作成
  buildBody(slData);
}

// ファイル名から日付を抽出する関数
function extractDateFromFilename(filename) {
  const match = filename.match(/(\d{2})(\d{2})(\d{2})\.json$/);
  if (match) {
    const [, year, month, day] = match;
    return `20${year}-${month}-${day}`;
  }
  return filename.replace('.json', '');
}

// セットリスト表の内容を構築
function buildBody(slData) {
  const container = document.querySelector('#setlist-tab .table-wrapper');
  container.innerHTML = '';

  // 日付の新しい順にソート、最新5個まで
  const sortedSL = slData
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  sortedSL.forEach((setlistData, setlistIndex) => {
    // セットリストごとに表を作成
    const tableTitle = document.createElement('h4');

    if (setlistData.isPlaceholder) {
      // プレースホルダの場合はボタンとして表示
      const dateText = formatDateForDisplay(setlistData.date);
      const button = document.createElement('button');
      button.textContent = `${dateText}のセットリストを表示`;
      button.style.marginTop = setlistIndex > 0 ? '2em' : '1em';
      button.style.marginBottom = '0.5em';
      button.style.padding = '4px 8px';
      button.style.backgroundColor = 'white';
      button.style.color = '#2564ad';
      button.style.border = '1px solid #2564ad';
      button.style.borderRadius = '4px';
      button.style.cursor = 'pointer';
      button.style.fontSize = '14px';
      button.addEventListener('click', () => loadSetlistOnDemand(setlistData.filename));
      container.appendChild(button);
      return; // プレースホルダの場合は表を作らずに終了
    }

    let titleText = `${setlistData.date} - ${setlistData.site}`;
    if (setlistData.event) {
      titleText += ` - ${setlistData.event}`;
    }

    // detailsとsummaryを使った開閉可能な表
    const details = document.createElement('details');
    details.open = true; // デフォルトで開いた状態
    details.style.marginTop = setlistIndex > 0 ? '2em' : '1em';
    details.style.marginBottom = '1em';

    const summary = document.createElement('summary');
    summary.style.color = '#2564ad';
    summary.style.cursor = 'pointer';
    summary.style.marginBottom = '0.5em';
    summary.style.marginLeft = '8px';
    summary.style.fontSize = '16px';
    summary.style.listStyle = 'none';
    summary.innerHTML = `<span style="font-weight: bold; margin-right: 8px; transform: rotate(90deg); display: inline-block;">＞</span>${titleText}`;
    details.appendChild(summary);

    // 開閉時にアイコンを切り替え
    details.addEventListener('toggle', () => {
      const icon = summary.querySelector('span');
      icon.style.transform = details.open ? 'rotate(90deg)' : 'rotate(-90deg)';
    });

    container.appendChild(details);

    const table = document.createElement('table');
    table.className = 'setlistTbl tbl';

    // ヘッダー作成
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    const headers = ['✔︎', 'セトリ順', '曲名', 'YT', 'LV', 'Spf', 'Apl', 'iTn', 's/m', '初収録', '曲順', '発売日'];
    headers.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // ボディ作成
    const tbody = document.createElement('tbody');

    // セットリストの曲順で表示（楽曲のみに番号を振る）
    let songOrderNum = 1;

    setlistData.setlist.forEach((songId, orderInSetlist) => {
      if (songId === 0) {
        // MCの場合
        const tr = document.createElement('tr');
        tr.style.backgroundColor = '#f0f0f0';
        tr.innerHTML = `
          <td colspan="12" style="text-align: center; color: #666; font-size: 12px; padding: 2px;">
            MC
          </td>
        `;
        tbody.appendChild(tr);
        return;
      }

      if (songId === 1000) {
        // インストの場合
        const tr = document.createElement('tr');
        tr.style.backgroundColor = '#f0f0f0';
        tr.innerHTML = `
          <td colspan="12" style="text-align: center; color: #666;">
            インスト
          </td>
        `;
        tbody.appendChild(tr);
        return;
      }

      const song = slMusicData[songId.toString()];

      if (!song) {
        return;
      }

      const tr = document.createElement('tr');
      tr.setAttribute('data-song-id', songId);
      tr.setAttribute('data-setlist-order', songOrderNum);

      tr.innerHTML = `
        <td><input type="checkbox" class="chk" data-context="sl" data-id="${song.mID}"></td>
        <td style="text-align: center; font-weight: bold; color: #2564ad;">${songOrderNum}</td>
        <td>${song.title}</td>
        <td>${song.yt || ''}</td>
        <td>${song.lv || ''}</td>
        <td>${song.spf || ''}</td>
        <td>${song.apl || ''}</td>
        <td>${song.itn || ''}</td>
        <td>${song.exsm || ''}</td>
        <td>${song.firstCd || ''}</td>
        <td>${song.order || ''}</td>
        <td>${song.cdDate || ''}</td>
      `;

      tbody.appendChild(tr);
      songOrderNum++; // 楽曲の場合のみ番号をインクリメント
    });

    table.appendChild(tbody);
    details.appendChild(table);
  });
}

// セットリスト用のイベントリスナー設定
function setupEvents() {
  // チェック付き行のみ表示
  const slChkOnly = document.getElementById('slShChk');
  if (slChkOnly) {
    slChkOnly.addEventListener('change', (e) => hdlSlChkOnly(e.target.checked));
  }

  // 曲名検索
  const songSrch = document.getElementById('slSngSrch');
  if (songSrch) {
    songSrch.addEventListener('input', hdlSlSrch);
  }
}

// チェック付き行のみ表示の処理
export function hdlSlChkOnly(showChkOnly) {
  const rows = document.querySelectorAll('.setlistTbl tbody tr');

  rows.forEach(row => {
    const checkbox = row.querySelector('.chk[data-context="sl"]');
    if (checkbox) { // MCなどの行にはチェックボックスがない
      if (showChkOnly) {
        row.style.display = checkbox.checked ? '' : 'none';
      } else {
        row.style.display = '';
      }
    } else {
      // MC行も「チェック付き行のみ表示」では隠す
      if (showChkOnly) {
        row.style.display = 'none';
      } else {
        row.style.display = '';
      }
    }
  });
}

// セットリスト用曲名検索の処理
export function hdlSlSrch(event) {
  const searchTerm = event.target.value.toLowerCase();
  const rows = document.querySelectorAll('.setlistTbl tbody tr');

  rows.forEach(row => {
    const titleCell = row.cells[2]; // セットリストでは曲名は3番目のセル（✔︎、セトリ順の次）
    if (titleCell) {
      const title = titleCell.textContent.toLowerCase();

      if (title.includes(searchTerm) || searchTerm === '') {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  });
}

// セットリストファイルを追加する関数（将来の拡張用）
export function addFile(filename) {
  if (!slFiles.includes(filename)) {
    slFiles.push(filename);
  }
}

// セットリストファイル一覧を取得
export function getFiles() {
  return [...slFiles];
}

// 日付を表示用にフォーマットする関数
function formatDateForDisplay(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${year}年${month.padStart(2, '0')}月${day.padStart(2, '0')}日`;
}

// オンデマンドでセットリストを読み込む関数
async function loadSetlistOnDemand(filename) {
  try {
    // 既に読み込み済みの場合はキャッシュから取得
    if (loadedSetlists.has(filename)) {
      rebuildWithNewData();
      return;
    }

    const response = await fetch(`setlist/${filename}`);
    const data = await response.json();
    const setlistData = {
      filename,
      ...data
    };

    // キャッシュに保存
    loadedSetlists.set(filename, setlistData);

    // 表示を更新
    rebuildWithNewData();

    // チェック状態をセットリストに反映
    if (window.aplCsCxt) {
      window.aplCsCxt('sl');
    }

  } catch (error) {
    console.error(`セットリストの読み込みに失敗: ${filename}`, error);
  }
}

// 新しいデータで表示を再構築
function rebuildWithNewData() {
  const allData = [];

  // キャッシュされたデータを全て追加
  for (const setlistData of loadedSetlists.values()) {
    allData.push(setlistData);
  }

  // まだ読み込まれていないプレースホルダも追加
  for (const fileObj of slFiles) {
    const filename = typeof fileObj === 'string' ? fileObj : fileObj.name;
    const flag = typeof fileObj === 'string' ? 1 : (fileObj.flag || 0);

    if (flag < 1 && !loadedSetlists.has(filename)) {
      const dateFromFilename = extractDateFromFilename(filename);
      allData.push({
        filename,
        date: dateFromFilename,
        isPlaceholder: true
      });
    }
  }

  buildBody(allData);
}

// グローバル関数として公開（main.jsから呼び出される可能性）
export function setupGlb() {
  window.slChk = hdlSlChkOnly;
  window.slSrch = hdlSlSrch;
}