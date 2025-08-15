// セットリスト表作成専用モジュール

let setlistMusicData = {}; // 曲データをキャッシュ
let setlistFiles = []; // 読み込むセットリストファイル一覧

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
    
    // checkStateがあれば反映
    if (window.checkState && window.applyCSSet) {
      window.applyCSSet();
    }
    
  } catch (error) {
  }
}

// ファイル一覧の読み込み
async function loadFileList() {
  const response = await fetch('setlist/index.json');
  const indexData = await response.json();
  setlistFiles = indexData.files || [];
}

// 曲データの読み込み
async function loadMusic() {
  if (Object.keys(setlistMusicData).length > 0) return; // 既に読み込み済み
  
  const response = await fetch('data/music-list.json');
  setlistMusicData = await response.json();
}

// セットリストファイルを読み込んで表を構築
async function loadAndBuild() {
  const setlistsData = [];
  
  // 各セットリストファイルを読み込み
  for (const filename of setlistFiles) {
    try {
      const response = await fetch(`setlist/${filename}`);
      const data = await response.json();
      setlistsData.push({
        filename,
        ...data
      });
    } catch (error) {
    }
  }
  
  // 表の内容を作成
  buildBody(setlistsData);
}

// セットリスト表の内容を構築
function buildBody(setlistsData) {
  const container = document.querySelector('#setlist-tab .table-wrapper');
  container.innerHTML = '';
  
  // 日付の新しい順にソート、最新5個まで
  const sortedSetlists = setlistsData
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  
  sortedSetlists.forEach((setlistData, setlistIndex) => {
    // セットリストごとに表を作成
    const tableTitle = document.createElement('h4');
    let titleText = `${setlistData.date} - ${setlistData.site}`;
    if (setlistData.event) {
      titleText += ` - ${setlistData.event}`;
    }
    tableTitle.textContent = titleText;
    tableTitle.style.marginTop = setlistIndex > 0 ? '2em' : '1em';
    tableTitle.style.marginBottom = '0.5em';
    tableTitle.style.color = '#2564ad';
    container.appendChild(tableTitle);
    
    const table = document.createElement('table');
    table.className = 'setlistTbl tbl';
    table.style.marginBottom = '1em';
    
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
    let songOrderNumber = 1;
    
    setlistData.setlist.forEach((songId, orderInSetlist) => {
      if (songId === 0) {
        // MCの場合
        const tr = document.createElement('tr');
        tr.style.backgroundColor = '#f0f0f0';
        tr.innerHTML = `
          <td colspan="12" style="text-align: center; color: #666;">
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
      
      const song = setlistMusicData[songId.toString()];
      
      if (!song) {
        return;
      }
      
      const tr = document.createElement('tr');
      tr.setAttribute('data-song-id', songId);
      tr.setAttribute('data-setlist-order', songOrderNumber);
      
      tr.innerHTML = `
        <td><input type="checkbox" class="setlist-chk" data-id="${song.mID}"></td>
        <td style="text-align: center; font-weight: bold; color: #2564ad;">${songOrderNumber}</td>
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
      songOrderNumber++; // 楽曲の場合のみ番号をインクリメント
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
  });
}

// セットリスト用のイベントリスナー設定
function setupEvents() {
  // チェック付き行のみ表示
  const showCheckedOnlyCheckbox = document.getElementById('slShChk');
  if (showCheckedOnlyCheckbox) {
    showCheckedOnlyCheckbox.addEventListener('change', handleCheckedOnly);
  }
  
  // 曲名検索
  const songNameSearch = document.getElementById('slSngSrch');
  if (songNameSearch) {
    songNameSearch.addEventListener('input', handleSearch);
  }
}

// チェック付き行のみ表示の処理
export function handleCheckedOnly(event) {
  const showCheckedOnly = event.target.checked;
  const rows = document.querySelectorAll('.setlistTbl tbody tr');
  
  rows.forEach(row => {
    const checkbox = row.querySelector('.setlist-chk');
    if (checkbox) { // MCなどの行にはチェックボックスがない
      if (showCheckedOnly) {
        row.style.display = checkbox.checked ? '' : 'none';
      } else {
        row.style.display = '';
      }
    } else {
      // MC行は常に表示
      row.style.display = '';
    }
  });
}

// セットリスト用曲名検索の処理
export function handleSearch(event) {
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
  if (!setlistFiles.includes(filename)) {
    setlistFiles.push(filename);
  }
}

// セットリストファイル一覧を取得
export function getFiles() {
  return [...setlistFiles];
}

// グローバル関数として公開（main.jsから呼び出される可能性）
export function setupGlobals() {
  window.slChk = handleCheckedOnly;
  window.slSrch = handleSearch;
}