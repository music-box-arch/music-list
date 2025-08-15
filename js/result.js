// CDボタン（チェックした曲を含むCDを見る）専用モジュール

let allDiscs = null;
let musicMap = null;

// 現在表示中の表データを保持（リサイズ時の再描画用）
let curTblData = null;

// 全角=2、半角=1 の幅計算機能
function isFullwidth(char) {
    const code = char.codePointAt(0);
    if (!code) return false;

    // CJK統合漢字
    if (code >= 0x4E00 && code <= 0x9FFF) return true;
    // ひらがな
    if (code >= 0x3040 && code <= 0x309F) return true;
    // カタカナ
    if (code >= 0x30A0 && code <= 0x30FF) return true;
    // 全角英数記号
    if (code >= 0xFF00 && code <= 0xFFEF) return true;
    // その他の主要な全角記号類
    if (code >= 0x2E80 && code <= 0x2EFF) return true; // CJK部首補助
    if (code >= 0x2F00 && code <= 0x2FDF) return true; // 康熙部首
    if (code >= 0x3000 && code <= 0x303F) return true; // CJK記号
    if (code >= 0x3200 && code <= 0x32FF) return true; // 囲みCJK文字月
    if (code >= 0x3300 && code <= 0x33FF) return true; // CJK互換
    if (code >= 0xFE30 && code <= 0xFE4F) return true; // CJK互換形

    return false;
}

function getDisplayWidth(str) {
    let width = 0;
    for (const char of str) {
        width += isFullwidth(char) ? 2 : 1;
    }
    return width;
}

function truncateByDisplayWidth(str, maxWidth, suffix = '') {
    const suffixWidth = getDisplayWidth(suffix);

    // suffixが既にmaxWidthを超える場合
    if (suffixWidth >= maxWidth) {
        return suffix.length > 0 ? truncateByDisplayWidth(suffix, maxWidth, '') : '';
    }

    // 元の文字列がmaxWidth以内なら省略不要
    const originalWidth = getDisplayWidth(str);
    if (originalWidth <= maxWidth) {
        return str;
    }

    // 省略が必要な場合
    const availableWidth = maxWidth - suffixWidth;
    let currentWidth = 0;
    let result = '';

    for (const char of str) {
        const charWidth = isFullwidth(char) ? 2 : 1;
        if (currentWidth + charWidth > availableWidth) {
            break;
        }
        result += char;
        currentWidth += charWidth;
    }

    return result + suffix;
}

// データ遅延読み込み関数
export async function loadData() {
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

// Result表構築ロジック
export function buildMatrix(songIDs, discs, musicMap) {
    // 含まれるCDだけ抽出
    const usedDiscs = discs.filter(disc => {
        if (!Array.isArray(disc.tracks) || disc.tracks.length === 0) {
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

    // 統一的な幅計算システム（列幅優先、行幅は残り幅で決定）
    function calculateDisplayWidths(columnCount) {
        // スクロールバーを無視した純粋なウィンドウ幅を取得
        const pureWindowWidth = document.documentElement.clientWidth;
        // bodyのmarginを考慮した実際のテーブル利用可能幅
        const bodyStyle = getComputedStyle(document.body);
        const marginLeft = parseInt(bodyStyle.marginLeft) || 0;
        const marginRight = parseInt(bodyStyle.marginRight) || 0;
        const tableWidth = pureWindowWidth - marginLeft - marginRight;
        const n = columnCount;

        // まず列ヘッダー幅を決定
        let columnHeaderWidth;

        // 基本ロジック: 2:1比率で列幅を算出
        const baseUnitWidth = tableWidth / (n + 2);
        const theoreticalRowHeaderWidth = baseUnitWidth * 2;

        // 例外判定: 理論上の行ヘッダー幅が100未満の場合
        if (theoreticalRowHeaderWidth < 100) {
            columnHeaderWidth = 50;  // 列ヘッダー幅を固定
        } else {
            columnHeaderWidth = baseUnitWidth;  // 基本ロジック
        }

        // 実際の行ヘッダー幅 = 表全体幅 - 列ヘッダー全体幅
        let rowHeaderWidth = tableWidth - (columnHeaderWidth * n);

        // 最小幅保証（例外処理時のみ）
        if (theoreticalRowHeaderWidth < 100 && rowHeaderWidth < 60) {
            rowHeaderWidth = 60;  // 表がはみ出してもOK
        }
        
        // border-collapse対応：境界線分を差し引く
        rowHeaderWidth -= 2;  // 行ヘッダーから2px引く
        columnHeaderWidth -= 1;  // 列ヘッダーから1px引く

        // padding分を引いて表示幅を計算
        const songNameDisplayWidth = rowHeaderWidth - 8;      // 左右padding 4px*2
        const cdNameDisplayWidth = columnHeaderWidth - 8;     // 左右padding 4px*2

        return {
            songNameDisplayWidth,
            cdNameDisplayWidth,
            rowHeaderWidth,
            columnHeaderWidth
        };
    }

    const { songNameDisplayWidth, cdNameDisplayWidth, rowHeaderWidth, columnHeaderWidth } = calculateDisplayWidths(filteredDiscs.length);

    // px → 半角文字幅への変換（以降は半角文字幅で統一）
    const avgHalfwidthCharPx = 7; // 半角文字1文字あたりのピクセル数（概算）
    const songNameWidthInChars = Math.floor(songNameDisplayWidth / avgHalfwidthCharPx);
    const cdNameWidthInChars = Math.floor(cdNameDisplayWidth / avgHalfwidthCharPx);


    const headers = [''].concat(
        filteredDiscs.map(d => {
            const cdName = truncateByDisplayWidth(d['cd-name'], cdNameWidthInChars, '…');
            const songCount = d.tracks.filter(id => songIDs.includes(id)).length;
            const amznLink = d.Amzn ? `\n<a href="${d.Amzn}" target="_blank" style="color: #0066cc; text-decoration: underline;">Amz</a>` : '';
            return `${cdName}\n(${songCount})${amznLink}`;
        })
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
        const songName = musicMap[songID] || `不明 (ID: ${songID})`;

        // songNameWidthInCharsを表示幅としてcreateDisplayTitleに渡す
        const displayName = createDisplayTitle(songName, songNameWidthInChars);

        const row = [displayName].concat(
            filteredDiscs.map(disc => disc.tracks.includes(songID) ? '○' : '')
        );
        return row;
    });

    // 現在の表データを保存（リサイズ時の再描画用）
    curTblData = { songIDs, allDiscs, musicMap, selectedType };

    return { headers, rows, rowHeaderWidth, columnHeaderWidth };
}

export function createDisplayTitle(title, maxDisplayWidth) {
    // 1. style/mix系の曲名処理
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
                const shortStyleWidth = shortStyle === '…party' ? 7 : 6;
                const truncatedBase = truncateByDisplayWidth(baseTitle, maxDisplayWidth - shortStyleWidth);
                return truncatedBase + shortStyle;
            }
        }
    }

    // 2. 「アナザーワールド」処理
    if (title === 'アナザーワールド') {
        if (maxDisplayWidth < 8) {
            return 'アナザー…ルド';  // 8幅未満のときは固定表示
        } else {
            // 通常の省略処理
            return truncateByDisplayWidth(title, maxDisplayWidth, '…');
        }
    }

    // 3. 「アナザーワールドエンド」処理
    if (title === 'アナザーワールドエンド') {
        const originalWidth = getDisplayWidth(title);  // 20幅
        if (maxDisplayWidth >= originalWidth) {
            // 幅に余裕がある場合は元のタイトルをそのまま表示
            return title;
        }

        const suffix = '…エンド';  // 8幅
        const basePart = 'アナザーワールド';
        const truncatedBase = truncateByDisplayWidth(basePart, maxDisplayWidth - 8);

        // どんなに小さくても"アナザー…エンド"以上は切り詰めない
        if (getDisplayWidth(truncatedBase + suffix) < getDisplayWidth('アナザー…エンド')) {
            return 'アナザー…エンド';
        }
        return truncatedBase + suffix;
    }

    // 4. 「プログラムcontinued (15th style)」処理
    if (title === 'プログラムcontinued (15th style)') {
        const originalWidth = getDisplayWidth(title);  // 元のタイトルの幅
        if (maxDisplayWidth >= originalWidth) {
            // 幅に余裕がある場合は元のタイトルをそのまま表示
            return title;
        }

        const shortFormWidth = getDisplayWidth('プログラムcontinued15th');  // 23幅
        if (maxDisplayWidth >= shortFormWidth) {
            // 省略なしの短縮形が表示可能な場合
            return 'プログラムcontinued15th';
        } else {
            const suffix = '…15th';  // 6幅
            const basePart = 'プログラムcontinued';
            const truncatedBase = truncateByDisplayWidth(basePart, maxDisplayWidth - 6);

            // どんなに小さくても"プログラム…15th"は表示
            if (getDisplayWidth(truncatedBase + suffix) < getDisplayWidth('プログラム…15th')) {
                return 'プログラム…15th';
            }
            return truncatedBase + suffix;
        }
    }

    // 5. 「プログラムcontinued」処理
    if (title === 'プログラムcontinued') {
        const originalWidth = getDisplayWidth(title);  // 18幅
        if (maxDisplayWidth >= originalWidth) {
            // 幅に余裕がある場合は元のタイトルをそのまま表示
            return title;
        }

        const suffix = '…ed';  // 4幅
        const basePart = 'プログラムcontinued';
        const truncatedBase = truncateByDisplayWidth(basePart, maxDisplayWidth - 4);

        // 最小限の表示は保証
        if (getDisplayWidth(truncatedBase + suffix) < getDisplayWidth('プログラム…ed')) {
            return 'プログラム…ed';
        }
        return truncatedBase + suffix;
    }

    // デフォルト動作：特殊ルールに該当しない場合は末尾…(幅2)で省略
    return truncateByDisplayWidth(title, maxDisplayWidth, '…');
}


// HTML表生成
export function generateHTMLTable(headers, rows, rowHeaderWidth, columnHeaderWidth) {
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.fontSize = '12px';
    table.style.tableLayout = 'fixed';

    // ヘッダー行作成
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headers.forEach((header, index) => {
        const th = document.createElement('th');
        th.style.border = '1px solid #ccd';
        th.style.padding = '6px 0';
        th.style.textAlign = 'center';
        th.style.backgroundColor = '#f3f8fc';
        th.style.fontSize = '10px';
        th.style.lineHeight = '1.2';
        th.style.whiteSpace = 'pre-line';
        th.style.verticalAlign = 'top';

        if (index === 0) {
            th.style.textAlign = 'left';
            th.style.width = `${rowHeaderWidth}px`;
            th.style.minWidth = `${rowHeaderWidth}px`;
            th.style.maxWidth = `${rowHeaderWidth}px`;
            th.style.fontSize = '11px';
        } else {
            th.style.width = `${columnHeaderWidth}px`;
            th.style.minWidth = `${columnHeaderWidth}px`;
            th.style.maxWidth = `${columnHeaderWidth}px`;
            th.style.overflow = 'hidden';
        }

        th.innerHTML = header;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // データ行作成
    const tbody = document.createElement('tbody');
    rows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        if (rowIndex % 2 === 1) {
            tr.style.backgroundColor = '#f7fafd';
        }

        row.forEach((cell, cellIndex) => {
            const td = document.createElement('td');
            td.style.border = '1px solid #ccd';
            td.style.textAlign = cellIndex === 0 ? 'left' : 'center';
            td.style.fontSize = cellIndex === 0 ? '11px' : '12px';

            if (cellIndex === 0) {
                // 曲名セル：左に4pxのpadding
                td.style.padding = '4px 0 4px 4px';
                td.style.width = `${rowHeaderWidth}px`;
                td.style.minWidth = `${rowHeaderWidth}px`;
                td.style.maxWidth = `${rowHeaderWidth}px`;
                td.style.wordWrap = 'break-word';
            } else {
                // CDセル：左右paddingなし
                td.style.padding = '4px 0';
                td.style.width = `${columnHeaderWidth}px`;
                td.style.minWidth = `${columnHeaderWidth}px`;
                td.style.maxWidth = `${columnHeaderWidth}px`;
                td.style.overflow = 'hidden';
            }

            td.textContent = cell;
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
}

// CDタイプフィルター設定
export function setupFilter() {
    const radioButtons = document.querySelectorAll('input[name="resultCdType"]');

    radioButtons.forEach(radio => {
        radio.addEventListener('change', function () {

            // 現在のチェック状態を再取得して表を更新
            const checkedElements = document.querySelectorAll('.chk:checked, .setlist-chk:checked');
            const songIDs = Array.from(new Set(Array.from(checkedElements).map(chk => Number(chk.dataset.id))));

            if (songIDs.length > 0) {
                rebuildTable(songIDs);
            }
        });
    });
}

// 結果テーブルの再構築
async function rebuildTable(songIDs) {
    const { allDiscs, musicMap } = await loadData();
    const { headers, rows, rowHeaderWidth, columnHeaderWidth } = buildMatrix(songIDs, allDiscs, musicMap);
    const table = generateHTMLTable(headers, rows, rowHeaderWidth, columnHeaderWidth);

    const container = document.getElementById('discsTbl');
    container.innerHTML = '';
    container.appendChild(table);
}

// CDボタンの処理を設定
export function setupBtn() {
    document.querySelectorAll('.showDiscsButton').forEach(btn => {
        btn.disabled = false;
        btn.addEventListener('click', async () => {
            setupFilter();

            // 両方のタブからチェック状態を取得（重複除去）
            const checkedElements = document.querySelectorAll('.chk:checked, .setlist-chk:checked');
            const songIDs = Array.from(new Set(Array.from(checkedElements).map(chk => Number(chk.dataset.id))));

            if (songIDs.length === 0) {
                alert('1曲以上チェックしてね');
                return;
            }

            const { allDiscs, musicMap } = await loadData();
            const { headers, rows, rowHeaderWidth, columnHeaderWidth } = buildMatrix(songIDs, allDiscs, musicMap);
            const table = generateHTMLTable(headers, rows, rowHeaderWidth, columnHeaderWidth);

            const container = document.getElementById('discsTbl');
            container.innerHTML = '';
            container.appendChild(table);

            document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// CDボタンクリック処理（main.jsから呼び出される）
async function handleClick() {
    setupFilter();

    // 両方のタブからチェック状態を取得（重複除去）
    const checkedElements = document.querySelectorAll('.chk:checked, .setlist-chk:checked');
    const songIDs = Array.from(new Set(Array.from(checkedElements).map(chk => Number(chk.dataset.id))));

    if (songIDs.length === 0) {
        alert('1曲以上チェックしてね');
        return;
    }

    const { allDiscs, musicMap } = await loadData();
    const { headers, rows, rowHeaderWidth, columnHeaderWidth } = buildMatrix(songIDs, allDiscs, musicMap);
    const table = generateHTMLTable(headers, rows, rowHeaderWidth, columnHeaderWidth);

    const container = document.getElementById('discsTbl');
    container.innerHTML = '';
    container.appendChild(table);

    document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
}

// 現在の表を再描画（リサイズ時用）
function redraw() {
    if (!curTblData) return;

    const { songIDs, allDiscs, musicMap, selectedType } = curTblData;
    const { headers, rows, rowHeaderWidth, columnHeaderWidth } = buildMatrix(songIDs, allDiscs, musicMap);
    const table = generateHTMLTable(headers, rows, rowHeaderWidth, columnHeaderWidth);

    const container = document.getElementById('discsTbl');
    container.innerHTML = '';
    container.appendChild(table);
}

// debounce処理でチラつき防止
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// リサイズイベントの設定
const debouncedRedraw = debounce(redraw, 150);
window.addEventListener('resize', () => {
    const currentTable = document.querySelector('#discsTbl table');
    if (currentTable) {
        debouncedRedraw();
    }
});

// 初期化関数
export function initCdFeats() {
    setupBtn();
    // グローバル関数として公開
    window.cdBtn = handleClick;
}