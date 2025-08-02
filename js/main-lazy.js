// 1. グローバル変数（lazy側）
let allDiscs = null;
let musicMap = null;
let subNoMap = null;
let checkStateBackup = null;
let checkState = [];
let smData = null;

// 2. checkState管理系関数
export async function initializeCheckState() {
    // DOM状態を一括取得してcheckStateに初期化
    const checkedIds = [];
    document.querySelectorAll('.chk:checked').forEach(chk => {
        checkedIds.push(Number(chk.dataset.id));
    });
    checkState = checkedIds.sort((a, b) => a - b);
    window.checkState = checkState;
    
    // checkStateBackupも初期化（現在の状態をバックアップとして保持）
    checkStateBackup = [...checkState];
    
    console.log('checkState初期化:', checkState);
    console.log('checkStateBackup初期化:', checkStateBackup);
}

// グローバルcheckStateを画面の表示されているチェックボックスに反映
function applyCheckStateToDisplay() {
    document.querySelectorAll('#music-table .chk').forEach(chk => {
        chk.checked = false;
    });
    
    checkState.forEach(id => {
        const checkbox = document.querySelector(`#music-table .chk[data-id="${id}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    
    // チェック付き行のみ表示が有効の場合、表示を更新
    const showCheckedOnlyCheckbox = document.getElementById('showCheckedOnly');
    if (showCheckedOnlyCheckbox && showCheckedOnlyCheckbox.checked) {
        handleShowCheckedOnly(true);
    }
}

// 現在チェックされているIDを配列で取得
function getCurrentCheckState() {
    const checkedIds = [];
    document.querySelectorAll('.chk:checked').forEach(chk => {
        checkedIds.push(Number(chk.dataset.id));
    });
    return checkedIds.sort((a, b) => a - b);
}

// 研究用コンソールログ出力関数
function logCurrentStates(action) {
    console.log(`=== ${action} ===`);
    console.log('グローバルcheckState:', checkState);
    console.log('バックアップ状態:', checkStateBackup || 'なし');
    console.log('現在のチェック状態:', getCurrentCheckState());
    console.log('================================');
}

// クリア機能をグローバルアクセス可能に
window.clearCheckState = function() {
    checkState = [];
    window.checkState = checkState;
    checkStateBackup = null;
    
    // サブスク無しチェックボックスも外す
    const subNoCheckbox = document.getElementById('checkSubNoOnly');
    if (subNoCheckbox && subNoCheckbox.checked) {
        subNoCheckbox.checked = false;
    }
    
    applyCheckStateToDisplay();
};

// 3. 動的イベントリスナー設定
export function setupAllEventListeners() {
    // 手動チェック変更のイベントリスナー
    setupCheckboxSync();
    
    // 4つのボタンの実際の処理を設定
    setupSubNoCheckListener();
    setupStyleCheckListener();
    setupMixCheckListener();
    setupShowCheckedOnlyListener();
    
    // グローバルアクセス用
    window.applyCheckStateToDisplay = applyCheckStateToDisplay;
    window.handleSubNoCheck = handleSubNoCheck;
    window.handleStyleCheck = handleStyleCheck;
    window.handleMixCheck = handleMixCheck;
    window.handleShowCheckedOnly = handleShowCheckedOnly;
    window.enableSongNameSearch = enableSongNameSearch;
    
    console.log('全イベントリスナー設定完了');
}

// 手動チェック変更のイベントリスナー
function setupCheckboxSync() {
    document.addEventListener('change', function (e) {
        if (e.target.classList.contains('chk')) {
            const changedId = Number(e.target.dataset.id);
            if (e.target.checked) {
                // チェックON: checkStateとcheckStateBackup両方に追加
                if (!checkState.includes(changedId)) {
                    checkState.push(changedId);
                    checkState.sort((a, b) => a - b);
                    window.checkState = checkState;
                }
                if (!checkStateBackup) {
                    checkStateBackup = [];
                }
                if (!checkStateBackup.includes(changedId)) {
                    checkStateBackup.push(changedId);
                    checkStateBackup.sort((a, b) => a - b);
                }
            } else {
                // チェックOFF: checkStateとcheckStateBackup両方から削除
                checkState = checkState.filter(id => id !== changedId);
                window.checkState = checkState;
                if (checkStateBackup) {
                    checkStateBackup = checkStateBackup.filter(id => id !== changedId);
                }
            }
            
            // チェック付き行のみ表示が有効の場合、表示を更新
            const showCheckedOnlyCheckbox = document.getElementById('showCheckedOnly');
            if (showCheckedOnlyCheckbox && showCheckedOnlyCheckbox.checked) {
                handleShowCheckedOnly(true);
            }
            
            logCurrentStates('手動チェック変更');
        }
    });
}

// サブスク無しチェックの実際の処理
function setupSubNoCheckListener() {
    const filterCheckbox = document.getElementById('checkSubNoOnly');
    if (!filterCheckbox) return;
    
    // 既存のイベントリスナーを削除して新しいのを設定
    const newCheckbox = filterCheckbox.cloneNode(true);
    filterCheckbox.parentNode.replaceChild(newCheckbox, filterCheckbox);
    
    newCheckbox.addEventListener('change', async function () {
        if (this.checked) {
            // サブスク無し曲を追加
            await loadSubNoDataIfNeeded();
            Object.keys(subNoMap).forEach(id => {
                const numId = Number(id);
                if (!checkState.includes(numId)) {
                    checkState.push(numId);
                }
            });
            checkState.sort((a, b) => a - b);
            window.checkState = checkState;
        } else {
            // サブスク無し曲を削除後、backupとの和集合
            await loadSubNoDataIfNeeded();
            const subNoIds = Object.keys(subNoMap).map(id => Number(id));
            
            checkState = checkState.filter(id => !subNoIds.includes(id));
            
            if (checkStateBackup) {
                checkStateBackup.forEach(id => {
                    if (!checkState.includes(id)) {
                        checkState.push(id);
                    }
                });
                checkState.sort((a, b) => a - b);
            }
            window.checkState = checkState;
        }
        
        applyCheckStateToDisplay();
        logCurrentStates('サブスク無しチェック');
    });
}

// style表示チェックの実際の処理
function setupStyleCheckListener() {
    const styleCheckbox = document.getElementById('showStyleCheck');
    if (!styleCheckbox) return;
    
    const newCheckbox = styleCheckbox.cloneNode(true);
    styleCheckbox.parentNode.replaceChild(newCheckbox, styleCheckbox);
    
    newCheckbox.addEventListener('change', async function () {
        const mixCheckbox = document.getElementById('showMixCheck');
        await toggleSmDisplay(this.checked, mixCheckbox ? mixCheckbox.checked : false);
    });
}

// mix表示チェックの実際の処理
function setupMixCheckListener() {
    const mixCheckbox = document.getElementById('showMixCheck');
    if (!mixCheckbox) return;
    
    const newCheckbox = mixCheckbox.cloneNode(true);
    mixCheckbox.parentNode.replaceChild(newCheckbox, mixCheckbox);
    
    newCheckbox.addEventListener('change', async function () {
        const styleCheckbox = document.getElementById('showStyleCheck');
        await toggleSmDisplay(styleCheckbox ? styleCheckbox.checked : false, this.checked);
    });
}

// チェック付き行のみ表示の実際の処理
function setupShowCheckedOnlyListener() {
    const showCheckedOnlyCheckbox = document.getElementById('showCheckedOnly');
    if (!showCheckedOnlyCheckbox) return;
    
    const newCheckbox = showCheckedOnlyCheckbox.cloneNode(true);
    showCheckedOnlyCheckbox.parentNode.replaceChild(newCheckbox, showCheckedOnlyCheckbox);
    
    newCheckbox.addEventListener('change', async function () {
        await handleShowCheckedOnly(this.checked);
    });
}

// サブスク無しデータの遅延読み込み
async function loadSubNoDataIfNeeded() {
    if (!subNoMap) {
        const res = await fetch('data/sub-no.json');
        subNoMap = await res.json();
        console.log('sub-no.json 読み込み完了', Object.keys(subNoMap).length, '件');
    }
}

// 4. グローバルアクセス用ハンドラー関数
async function handleSubNoCheck(isChecked) {
    if (isChecked) {
        // サブスク無し曲を追加
        await loadSubNoDataIfNeeded();
        Object.keys(subNoMap).forEach(id => {
            const numId = Number(id);
            if (!checkState.includes(numId)) {
                checkState.push(numId);
            }
        });
        checkState.sort((a, b) => a - b);
        window.checkState = checkState;
    } else {
        // サブスク無し曲を削除後、backupとの和集合
        await loadSubNoDataIfNeeded();
        const subNoIds = Object.keys(subNoMap).map(id => Number(id));
        
        checkState = checkState.filter(id => !subNoIds.includes(id));
        
        if (checkStateBackup) {
            checkStateBackup.forEach(id => {
                if (!checkState.includes(id)) {
                    checkState.push(id);
                }
            });
            checkState.sort((a, b) => a - b);
        }
        window.checkState = checkState;
    }
    
    applyCheckStateToDisplay();
    logCurrentStates('サブスク無しチェック');
}

async function handleStyleCheck(isStyleChecked, isMixChecked) {
    await toggleSmDisplay(isStyleChecked, isMixChecked);
}

async function handleMixCheck(isStyleChecked, isMixChecked) {
    await toggleSmDisplay(isStyleChecked, isMixChecked);
}

async function handleShowCheckedOnly(showCheckedOnly) {
    const tbody = document.querySelector('#music-table tbody');
    const allRows = tbody.querySelectorAll('tr');
    
    // 現在の検索語を取得
    const searchInput = document.getElementById('songNameSearch');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    
    if (showCheckedOnly) {
        // チェック付き行のみ表示（検索フィルターも考慮）
        allRows.forEach(row => {
            const checkbox = row.querySelector('.chk');
            let shouldShow = checkbox && checkbox.checked;
            
            // 検索フィルターも適用
            if (shouldShow && searchTerm) {
                const titleCell = row.querySelector('td:nth-child(2)');
                if (titleCell) {
                    const titleText = titleCell.textContent.toLowerCase();
                    shouldShow = titleText.includes(searchTerm.toLowerCase());
                }
            }
            
            row.style.display = shouldShow ? '' : 'none';
        });
    } else {
        // 検索フィルターのみ考慮して表示
        if (searchTerm) {
            performSongNameSearch(searchTerm);
        } else {
            allRows.forEach(row => {
                row.style.display = '';
            });
        }
    }
    
    // 検索中の場合は自動で検索をやり直し
    reapplySearchIfNeeded();
    
    logCurrentStates('チェック付き行のみ表示切り替え');
}

// 5. 曲名検索機能
function enableSongNameSearch() {
    const searchInput = document.getElementById('songNameSearch');
    if (!searchInput) return;
    
    console.log('曲名検索機能を有効化');
    
    // リアルタイム検索のイベントリスナー
    searchInput.addEventListener('input', function() {
        performSongNameSearch(this.value.trim());
    });
    
    // 検索機能有効化後、フォーカスを戻す
    searchInput.focus();
}

function performSongNameSearch(searchTerm) {
    const tbody = document.querySelector('#music-table tbody');
    const allRows = tbody.querySelectorAll('tr');
    
    if (!searchTerm) {
        // 検索語が空の場合、全行表示（ただし他のフィルターは考慮）
        allRows.forEach(row => {
            row.style.display = '';
        });
        
        // チェック付き行のみ表示が有効の場合は再適用
        const showCheckedOnlyCheckbox = document.getElementById('showCheckedOnly');
        if (showCheckedOnlyCheckbox && showCheckedOnlyCheckbox.checked) {
            handleShowCheckedOnly(true);
        }
        return;
    }
    
    // 大文字小文字を区別しない検索
    const searchTermLower = searchTerm.toLowerCase();
    
    allRows.forEach(row => {
        const titleCell = row.querySelector('td:nth-child(2)'); // 曲名は2番目のセル
        if (titleCell) {
            const titleText = titleCell.textContent.toLowerCase();
            const matchesSearch = titleText.includes(searchTermLower);
            
            // 検索時は検索結果のみを表示（チェック状態は無視）
            row.style.display = matchesSearch ? '' : 'none';
        }
    });
    
    console.log('曲名検索実行:', searchTerm, '(チェック付きフィルターを一時無効化)');
}

// 検索中の場合は自動で検索をやり直し
function reapplySearchIfNeeded() {
    const searchInput = document.getElementById('songNameSearch');
    if (searchInput) {
        const currentSearchTerm = searchInput.value.trim();
        if (currentSearchTerm) {
            console.log('フィルター変更により検索を自動再実行:', currentSearchTerm);
            performSongNameSearch(currentSearchTerm);
        }
    }
}

export async function loadSmDataIfNeeded() {
    if (!smData) {
        const response = await fetch('data/music-list-sm.json');
        smData = await response.json();
    }
    return smData;
}

export async function toggleSmDisplay(showStyle, showMix) {
    const data = await loadSmDataIfNeeded();
    const tbody = document.querySelector('#music-table tbody');
    // 既存のstyle/mix行を削除
    tbody.querySelectorAll('.sm-row').forEach(row => row.remove());
    if (!showStyle && !showMix) {
        // style/mixを非表示にした場合も、checkStateを表示に反映
        applyCheckStateToDisplay();
        return;
    }
    // 追加する行をフィルター
    const toAdd = Object.values(data).filter(song => {
        if (showStyle && song.smType.includes('style')) return true;
        if (showMix && song.smType.includes('mix')) return true;
        return false;
    }).sort((a, b) => a.mID - b.mID);
    // 各行を適切な位置に挿入
    toAdd.forEach(song => {
        const newRow = createSongRow(song);
        newRow.classList.add('sm-row');
        insertRowAtCorrectPosition(tbody, newRow, song.mID);
    });
    // checkStateを表示に反映
    applyCheckStateToDisplay();
    
    // 検索中の場合は自動で検索をやり直し
    reapplySearchIfNeeded();
}

function createSongRow(song) {
    const tr = document.createElement('tr');
    // mID 93の曲だけ12pxに設定
    const titleStyle = song.mID === 93 ? ' style="font-size: 12px;"' : '';
    // const smallFontMIDs = [93, 150, 200]; // 最終的に拡張することもできる
    //const titleStyle = smallFontMIDs.includes(song.mID) ? ' style="font-size: 12px;"' : '';
    tr.innerHTML = `
        <td><input type="checkbox" class="chk" data-id="${song.mID}"></td>
        <td${titleStyle}>${song.title}</td>
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
    return tr;
}

function insertRowAtCorrectPosition(tbody, newRow, mID) {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    for (let i = 0; i < rows.length; i++) {
        const currentMID = parseInt(rows[i].querySelector('.chk').dataset.id);
        if (currentMID > mID) {
            tbody.insertBefore(newRow, rows[i]);
            return;
        }
    }
    tbody.appendChild(newRow);
}

// 2-5. データ遅延読み込み関数
export async function loadDataIfNeeded() {
    if (!allDiscs || !musicMap) {
        const [discs, map] = await Promise.all([
            fetch('data/all-discs.json').then(res => res.json()),
            fetch('data/music-map.json').then(res => res.json())
        ]);
        allDiscs = discs;
        musicMap = map;
    }
    return { allDiscs, musicMap };
}

// 2-6. Result表構築ロジック
export function buildMatrix(songIDs, discs, musicMap) {
    // 含まれるCDだけ抽出
    const usedDiscs = discs.filter(disc => {
        if (!Array.isArray(disc.tracks) || disc.tracks.length === 0) {
            console.log('無効なCD:', disc['cd-name']);
            return false;
        }
        return disc.tracks.some(id => songIDs.includes(id));
    });

    // ◯の数でソート（多い順）
    usedDiscs.sort((a, b) => {
        const aCount = a.tracks.filter(id => songIDs.includes(id)).length;
        const bCount = b.tracks.filter(id => songIDs.includes(id)).length;
        return bCount - aCount;
    });

    // CDタイプフィルター適用
    const selectedType = document.querySelector('input[name="resultCdType"]:checked')?.value || 'both';
    const filteredDiscs = selectedType === 'both' ?
        usedDiscs :
        usedDiscs.filter(disc => disc['cd-type'] === selectedType);

    // 画面幅と列数に応じてヘッダー文字数を動的調整
    const getHeaderMaxLength = (columnCount) => {
        const screenWidth = window.innerWidth;
        const availableWidth = screenWidth - 100;
        const widthPerColumn = availableWidth / (columnCount + 1);

        if (widthPerColumn < 60) return 3;
        if (widthPerColumn < 80) return 4;
        if (widthPerColumn < 100) return 5;
        if (widthPerColumn < 120) return 6;
        if (widthPerColumn < 140) return 8;
        return 12;
    };

    const getSongNameMaxLength = (columnCount) => {
        const screenWidth = window.innerWidth;
        const availableWidth = screenWidth - 100;
        const widthPerColumn = availableWidth / (columnCount + 1);

        if (widthPerColumn < 60) return 5;
        if (widthPerColumn < 80) return 8;
        if (widthPerColumn < 100) return 12;
        if (widthPerColumn < 120) return 15;
        return 20;
    };

    const maxLength = getHeaderMaxLength(filteredDiscs.length);
    const songNameMaxLength = getSongNameMaxLength(filteredDiscs.length);

    const headers = ['曲名'].concat(
        filteredDiscs.map(d => d['cd-name'].length > maxLength ? d['cd-name'].slice(0, maxLength) : d['cd-name'])
    );

    // 行データ（曲順もCDの重要度順に並べ替え）
    const sortedSongIDs = [];
    const addedSongs = new Set();

    // CDの順番（◯が多い順）で曲を追加
    filteredDiscs.forEach(disc => {
        disc.tracks.forEach(trackId => {
            if (songIDs.includes(trackId) && !addedSongs.has(trackId)) {
                sortedSongIDs.push(trackId);
                addedSongs.add(trackId);
            }
        });
    });

    const rows = sortedSongIDs.map(songID => {
        const songName = musicMap[songID] || `ID:${songID}`;
        const specialTitle = createSpecialTitle(songName);

        let truncatedSongName;
        if (specialTitle !== songName) {
            // 特別処理が適用された場合は切り詰めない
            truncatedSongName = specialTitle;
        } else {
            // 通常の曲名のみ画面幅に応じて切り詰め
            truncatedSongName = specialTitle.length > songNameMaxLength ?
                specialTitle.slice(0, songNameMaxLength) : specialTitle;
        }

        const row = [truncatedSongName];
        filteredDiscs.forEach(disc => {
            row.push(disc.tracks.includes(songID) ? '◯' : '');
        });
        return row;
    });

    return { headers, rows };
}

export function createSpecialTitle(title) {
    // 特別処理対象の曲（完全一致で判定）
    if (title === 'アナザーワールドエンド') {
        return 'アナザー…エンド';
    }
    if (title === 'アナザーワールド') {
        return 'アナザー…ルド';
    }
    if (title === 'プログラムcontinued (15th style)') {
        return 'プログラム…15th';
    }
    if (title === 'プログラムcontinued') {
        return 'プログラム…ed';
    }

    // style/mix処理
    if (title.includes('(') && (title.includes('style)') || title.includes('mix)'))) {
        const baseTitle = title.split('(')[0].trim();
        const styleMatch = title.match(/\((.+?)\)/);
        if (styleMatch) {
            const styleText = styleMatch[1];
            let shortStyle = '';

            if (styleText === 'B.C mix') shortStyle = '…BCmx';
            else if (styleText === 'B.C style') shortStyle = '…BCst';
            else if (styleText === 'D.A mix') shortStyle = '…DAmx';
            else if (styleText === 'D.A style') shortStyle = '…DAst';
            else if (styleText === 'S.B mix') shortStyle = '…SBmx';
            else if (styleText === 'S.B style') shortStyle = '…SBst';
            else if (styleText === 'party style') shortStyle = '…party';

            if (shortStyle) {
                const baseShort = baseTitle.length > 5 ? baseTitle.slice(0, 5) : baseTitle;
                return baseShort + shortStyle;
            }
        }
    }

    return title;
}

// 2-7. HTMLテーブル生成
export function generateHTMLTable(headers, rows) {
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.marginTop = '1em';
    // 列数に応じてフォント調整
    const fontSize = headers.length > 6 ? '12px' : '14px';
    table.style.fontSize = fontSize;

    const makeCell = (tag, content) => {
        const cell = document.createElement(tag);
        cell.textContent = content;
        cell.style.border = '1px solid #ccc';
        cell.style.padding = '2px';
        cell.style.textAlign = 'center';
        return cell;
    };

    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    headers.forEach(h => trHead.appendChild(makeCell('th', h)));
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => tr.appendChild(makeCell('td', cell)));
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
}

// 既存のexport関数の後に追加
export function setupCdTypeFilter() {
    document.addEventListener('change', async function (e) {
        if (e.target.name === 'resultCdType') {
            // checkStateを使用（lazyload後はこちらが正確）
            const songIDs = checkState ? [...checkState] : [];

            const { allDiscs, musicMap } = await loadDataIfNeeded();
            const { headers, rows } = buildMatrix(songIDs, allDiscs, musicMap);
            const table = generateHTMLTable(headers, rows);

            document.getElementById('discsTable').innerHTML = '';
            document.getElementById('discsTable').appendChild(table);
        }
    });
}