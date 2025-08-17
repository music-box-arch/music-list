// セットリスト表作成専用モジュール
let slMusicData = {}; // 曲データをキャッシュ
let slFiles = []; // 読み込むセットリストファイル一覧
let loadedSetlists = new Map(); // 読み込み済みセットリストのキャッシュ

// セットリスト機能の初期化
export async function initSL() {
  try {
    // 曲データとファイル一覧を並列fetch
    const [musicData, indexData] = await Promise.all([
      fetch('data/music-list-SL.json').then(r => r.json()),
      fetch('setlist/index.json').then(r => r.json())
    ]);

    slMusicData = musicData;
    slFiles = (indexData.files || []).sort((a, b) => {
      const aFile = typeof a === 'string' ? a : a.name;
      const bFile = typeof b === 'string' ? b : b.name;
      return (bFile.match(/(\d{6})/)?.[1] || '000000').localeCompare(aFile.match(/(\d{6})/)?.[1] || '000000');
    });

    // セットリストファイルを読み込んで表を構築
    const slData = [];
    for (const fileObj of slFiles) {
      const filename = typeof fileObj === 'string' ? fileObj : fileObj.name;
      const flag = typeof fileObj === 'string' ? 1 : (fileObj.flag || 0);

      if (flag >= 1) {
        try {
          const response = await fetch(`setlist/${filename}`);
          const data = await response.json();
          const setlistData = { filename, ...data };
          slData.push(setlistData);
          loadedSetlists.set(filename, setlistData);
        } catch (error) { }
      } else {
        const dateFromFilename = extractDateFromFilename(filename);
        slData.push({ filename, date: dateFromFilename, isPlaceholder: true });
      }
    }

    await buildBody(slData);

    // セットリスト用のイベントリスナーを設定
    setupEvents();

    // cSがあれば反映
    if (window.cS && window.aplCsCxt) {
      window.aplCsCxt('sl');
    }

  } catch (error) { }
}

// MC行を作成
function createMCRow(colCount = 12) {
  const tr = document.createElement('tr');
  tr.style.backgroundColor = '#f0f0f0';
  tr.innerHTML = `
        <td colspan="${colCount}" style="text-align: center; color: #666; font-size: 12px; padding: 2px;">
            MC
        </td>
    `;
  return tr;
}

// MC行を後から挿入する関数
async function insertMCRows(tbody, setlistData) {
  // main-lazy.jsからinsertRowをimport
  const { insertRow } = await import('./main-lazy.js');

  // MC位置を特定
  const mcPositions = [];
  setlistData.setlist.forEach((songId, index) => {
    if (songId === 0) {
      // この位置より前にある「0でない曲」の数を数える
      const songsBeforeCount = setlistData.setlist.slice(0, index).filter(id => id !== 0).length;
      mcPositions.push({
        originalIndex: index,
        insertAfterSong: songsBeforeCount + 0.5 // 0.5, 1.5, 2.5...
      });
    }
  });

  // 各MC行を適切な位置に挿入
  mcPositions.forEach(pos => {
    const mcRow = createMCRow(11); // セトリタブは11列

    insertRow(tbody, mcRow, pos.insertAfterSong, 'setlistOrder');
  });
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
async function buildBody(slData) {
  const container = document.querySelector('#setlist-tab .table-wrapper');
  container.innerHTML = '';

  // 日付の新しい順にソート、最新5個まで
  const sortedSL = slData
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  for (const [setlistIndex, setlistData] of sortedSL.entries()) {
    await buildOneSl(container, setlistData, setlistIndex);
  }
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

// 日付を表示用にフォーマットする関数
function formatDateForDisplay(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${year}年${month.padStart(2, '0')}月${day.padStart(2, '0')}日`;
}

// 対応するボタンを削除
function removeButton(setlistData) {
  const container = document.querySelector('#setlist-tab .table-wrapper');
  const buttons = container.querySelectorAll('button');
  buttons.forEach(btn => {
    if (btn.textContent.includes(formatDateForDisplay(setlistData.date))) {
      btn.remove();
    }
  });
}

// 単一セットリスト表を追加
async function addSlTbl(setlistData) {
  const container = document.querySelector('#setlist-tab .table-wrapper');

  // ファイル名の6桁で位置を計算
  const newFileNum = setlistData.filename.match(/(\d{6})/)?.[1] || '000000';
  const insertIndex = slFiles.findIndex(fileObj => {
    const filename = typeof fileObj === 'string' ? fileObj : fileObj.name;
    const fileNum = filename.match(/(\d{6})/)?.[1] || '000000';
    return newFileNum > fileNum;
  });

  await buildOneSl(container, setlistData, insertIndex === -1 ? container.children.length : insertIndex);
}

// 単一セットリストの表を構築
async function buildOneSl(container, setlistData, setlistIndex) {
  if (setlistData.isPlaceholder === true) {
    // プレースホルダの場合はボタンとして表示
    const dateText = formatDateForDisplay(setlistData.date);
    const button = document.createElement('button');
    button.textContent = `${dateText}のセットリストを表示`;
    button.style.cssText = `margin: ${setlistIndex > 0 ? '2em' : '1em'} 0 0.5em; padding: 4px 8px; background: white; color: #2564ad; border: 1px solid #2564ad; border-radius: 4px; cursor: pointer; font-size: 14px;`;
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
  details.style.cssText = `margin: ${setlistIndex > 0 ? '2em' : '1em'} 0 1em;`;

  const summary = document.createElement('summary');
  summary.style.cssText = 'color: #2564ad; cursor: pointer; margin: 0 0 0.5em 8px; font-size: 16px; list-style: none;';
  summary.innerHTML = `<span style="font-weight: bold; margin-right: 8px; transform: rotate(90deg); display: inline-block;">＞</span>${titleText}`;
  details.appendChild(summary);

  // 開閉時にアイコンを切り替え
  details.addEventListener('toggle', () => {
    const icon = summary.querySelector('span');
    icon.style.transform = details.open ? 'rotate(90deg)' : 'rotate(-90deg)';
  });

  // 正しい位置に挿入
  const containerChildren = Array.from(container.children);
  if (setlistIndex < containerChildren.length) {
    container.insertBefore(details, containerChildren[setlistIndex]);
  } else {
    container.appendChild(details);
  }

  // セットリストの曲データを準備（MCを除く）
  const songData = [];
  let songOrderNum = 1;

  setlistData.setlist.forEach((songId, orderInSetlist) => {
    if (songId === 0) {
      // MCの場合は飛ばす（後から挿入）
      return;
    }

    const song = slMusicData[songId.toString()];
    if (!song) {
      return;
    }

    songData.push({
      ...song,
      songId,
      orderNum: songOrderNum
    });
    songOrderNum++;
  });

  // tbl.jsの汎用関数を使用してテーブル作成
  const { createTable } = await import('./tbl.js');

  const tableConfig = {
    headers: ['✔︎', 'セトリ順', '曲名', 'YT', 'LV', 'Spf', 'Apl', 'iTn', 'テンポ', '特徴・ハイライト', '歌詞'],
    data: songData,
    context: 'sl',
    className: 'setlistTbl tbl',
    columns: ['orderNum', 'title', 'yt', 'lv', 'spf', 'apl', 'itn', 'tmp', 'hlt', 'lrc'],
    textOnlyColumns: [0, 1, 7], // orderNum, title, tmp
    cstmRow: (tr, song) => {
      tr.cells[1].style.cssText = 'text-align: center; font-weight: bold; color: #2564ad;';
      tr.cells[8].style.fontSize = '12px';
      tr.cells[10].style.fontSize = '12px';
      tr.setAttribute('data-song-id', song.songId);
      tr.setAttribute('data-setlist-order', song.orderNum);
    }
  };

  const { table, tbody } = createTable(tableConfig);
  details.appendChild(table);

  // MC行を後から挿入
  insertMCRows(tbody, setlistData);
}

// オンデマンドでセットリストを読み込む関数
async function loadSetlistOnDemand(filename) {
  try {
    // 既に読み込み済みの場合はキャッシュから取得
    if (loadedSetlists.has(filename)) {
      const cachedData = loadedSetlists.get(filename);

      removeButton(cachedData);

      await addSlTbl(cachedData);
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

    removeButton(setlistData);

    // 新しいセットリストの表だけを追加
    await addSlTbl(setlistData);

    // チェック状態をセットリストに反映
    if (window.aplCsCxt) {
      window.aplCsCxt('sl');
    }

  } catch (error) {
    console.error(`セットリストの読み込みに失敗: ${filename}`, error);
  }
}

// グローバル関数として公開（main.jsから呼び出される可能性）
export function setupGlb() {
  window.slChk = hdlSlChkOnly;
  window.slSrch = hdlSlSrch;
}