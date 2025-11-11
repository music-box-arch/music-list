// セットリスト表作成専用モジュール
let slMusicData = {}; // 曲データをキャッシュ
let slFiles = []; // 読み込むセットリストファイル一覧
let loadedSetlists = new Map(); // 読み込み済みセットリストのキャッシュ

// ファイル名サニタイズ関数（パストラバーサル攻撃防止）
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // パストラバーサル文字列を除去
  const sanitized = filename.replace(/\.\./g, '').replace(/[\/\\]/g, '');

  // 基本的なファイル名形式チェック（6桁数字.json）
  if (!/^\d{6}\.json$/.test(sanitized)) {
    return null;
  }

  return sanitized;
}

// セットリスト機能の初期化
export async function initSL() {
  try {
    // リソース完全性検証
    const { isValidResource } = await import('./tbl.js');
    const musicUrl = 'data/music-list-SL.json';
    // ●●●index.jsonのバージョン管理はこちらです●●●
    const indexVer = '202511101';
    const indexUrl = `setlist/index.json?v=${indexVer}`;

    if (!isValidResource(musicUrl) || !isValidResource(indexUrl)) {
      throw new Error('Invalid resource URLs detected');
    }

    // 曲データとファイル一覧を並列fetch
    const [musicData, indexData] = await Promise.all([
      fetch(musicUrl).then(r => r.json()),
      fetch(indexUrl).then(r => r.json())
    ]);

    slMusicData = musicData;
    slFiles = (indexData.files || []).sort((a, b) => {
      const aFile = typeof a === 'string' ? a : a.name;
      const bFile = typeof b === 'string' ? b : b.name;
      return (bFile.match(/(\d{6})/)?.[1] || '000000').localeCompare(aFile.match(/(\d{6})/)?.[1] || '000000');
    });
    //console.log('slFiles order:', slFiles.map(f => typeof f === 'string' ? f : f.name));

    // セットリストファイルを読み込んで表を構築
    const slData = [];
    for (const fileObj of slFiles) {
      const filename = typeof fileObj === 'string' ? fileObj : fileObj.name;
      const flag = typeof fileObj === 'string' ? 1 : (fileObj.flag || 0);

      if (flag >= 1) {
        try {
          const safeFilename = sanitizeFilename(filename);
          if (!safeFilename) {
            console.warn(`Invalid filename: ${filename}`);
            continue;
          }
          const response = await fetch(`setlist/${safeFilename}`);
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

  const td = document.createElement('td');
  td.setAttribute('colspan', colCount.toString());
  td.style.cssText = 'text-align: center; color: #666; font-size: 12px; padding: 2px;';
  td.textContent = 'MC';
  tr.appendChild(td);

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
  container.textContent = '';

  // 日付の新しい順にソート、最新10個まで
  const sortedSL = slData
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

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

// 対応するボタンを削除し、そのindexを返す
function rmBtn(setlistData) {
  const container = document.querySelector('#setlist-tab .table-wrapper');
  const children = Array.from(container.children);
  for (let i = 0; i < children.length; i++) {
    if (children[i].tagName === 'BUTTON' &&
      children[i].textContent.includes(formatDateForDisplay(setlistData.date))) {
      children[i].remove();
      return i;
    }
  }
  return -1;
}


// 単一セットリストの表を構築
async function buildOneSl(container, setlistData, setlistIndex) {
  if (setlistData.isPlaceholder === true) {
    // プレースホルダの場合はボタンとして表示
    const dateText = formatDateForDisplay(setlistData.date);
    const button = document.createElement('button');
    button.textContent = `${dateText}のセットリストを表示`;
    button.style.cssText = `display: block; margin: ${setlistIndex > 0 ? '2em' : '1em'} 0 0.5em; padding: 4px 8px; background: white; color: #2564ad; border: 1px solid #2564ad; border-radius: 4px; cursor: pointer; font-size: 14px;`;
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

  const iconSpan = document.createElement('span');
  iconSpan.style.cssText = 'font-weight: bold; margin-right: 8px; transform: rotate(90deg); display: inline-block;';
  iconSpan.textContent = '＞';

  summary.appendChild(iconSpan);
  summary.appendChild(document.createTextNode(titleText));
  details.appendChild(summary);

  // 開閉時にアイコンを切り替え
  details.addEventListener('toggle', () => {
    const icon = summary.querySelector('span');
    icon.style.transform = details.open ? 'rotate(90deg)' : 'rotate(-90deg)';
  });

  // 正しい位置に挿入
  const containerChildren = Array.from(container.children);
  //console.log('buildOneSl setlistIndex:', setlistIndex, 'containerChildren.length:', containerChildren.length);
  if (setlistIndex < containerChildren.length) {
    //console.log('insertBefore at index:', setlistIndex);
    container.insertBefore(details, containerChildren[setlistIndex]);
  } else {
    //console.log('appendChild');
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
    textOnlyColumns: [0, 1, 7, 8], // orderNum, title, tmp, hlt
    cstmRow: (tr, song) => {
      tr.cells[1].style.cssText = 'text-align: center; font-weight: bold; color: #2564ad;';
      tr.cells[8].classList.add('smltxt');
      tr.cells[10].classList.add('smltxt');
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

      const btnIdx = rmBtn(cachedData);
      await buildOneSl(document.querySelector('#setlist-tab .table-wrapper'), cachedData, btnIdx);
      return;
    }

    const safeFilename = sanitizeFilename(filename);
    if (!safeFilename) {
      console.error(`Invalid filename: ${filename}`);
      return;
    }

    const response = await fetch(`setlist/${safeFilename}`);
    const data = await response.json();
    const setlistData = {
      filename,
      ...data
    };

    // キャッシュに保存
    loadedSetlists.set(filename, setlistData);

    const btnIdx = rmBtn(setlistData);
    await buildOneSl(document.querySelector('#setlist-tab .table-wrapper'), setlistData, btnIdx);

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