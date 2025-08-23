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

function truncate(str, maxW, suffix = '') {
    const suffixW = getDisplayWidth(suffix);

    // suffixが既にmaxWを超える場合
    if (suffixW >= maxW) {
        return suffix.length > 0 ? truncate(suffix, maxW, '') : '';
    }

    // 元の文字列がmaxW以内なら省略不要
    const origW = getDisplayWidth(str);
    if (origW <= maxW) {
        return str;
    }

    // 省略が必要な場合
    const availW = maxW - suffixW;
    let curW = 0;
    let result = '';

    for (const char of str) {
        const charW = isFullwidth(char) ? 2 : 1;
        if (curW + charW > availW) {
            break;
        }
        result += char;
        curW += charW;
    }
    return result + suffix;
}

// データ遅延読み込み関数
export async function loadData() {
    if (!allDiscs || !musicMap) {
        // リソース完全性検証を追加
        const { isValidResource } = await import('./tbl.js');
        
        const discUrl = 'data/all-discs.json';
        const mapUrl = 'data/music-map.json';
        
        if (!isValidResource(discUrl) || !isValidResource(mapUrl)) {
            throw new Error('Invalid resource URLs detected');
        }
        
        const [discs, map] = await Promise.all([
            fetch(discUrl).then(res => res.json()),
            fetch(mapUrl).then(res => res.json())
        ]);
        allDiscs = discs;
        musicMap = map;
    }
    return { allDiscs, musicMap };
}

// Result表構築ロジック
export async function buildMatrix(songIDs, discs, musicMap) {
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
    const selType = document.querySelector('input[name="resultCdType"]:checked')?.value || 'both';
    const filtDiscs = selType === 'both' ?
        usedDiscs :
        usedDiscs.filter(disc => disc['cd-type'] === selType);

    // 統一的な幅計算システム（列幅優先、行幅は残り幅で決定）
    function calculateDisplayWidths(columnCount) {
        // スクロールバーを無視した純粋なウィンドウ幅を取得
        const pureWinW = document.documentElement.clientWidth;
        // bodyのmarginを考慮した実際のテーブル利用可能幅
        const bodyStyle = getComputedStyle(document.body);
        const marginEach = parseInt(bodyStyle.marginLeft) || 0;
        const tableWidth = pureWinW - (marginEach * 2);
        const n = columnCount;

        // まず列ヘッダー幅を決定
        let colHeaderW;

        // 基本ロジック: 2:1比率で列幅を算出
        const baseUnitW = tableWidth / (n + 2);
        const theoRowWidth = baseUnitW * 2;

        // 例外判定: 理論上の行ヘッダー幅が100未満の場合
        if (theoRowWidth < 100) {
            colHeaderW = 50;  // 列ヘッダー幅を固定
        } else {
            colHeaderW = baseUnitW;  // 基本ロジック
        }

        // 実際の行ヘッダー幅 = 表全体幅 - 列ヘッダー全体幅
        let rowHeaderW = tableWidth - (colHeaderW * n);

        // 最小幅保証（例外処理時のみ）
        if (theoRowWidth < 100 && rowHeaderW < 60) {
            rowHeaderW = 60;  // 表がはみ出してもOK
        }

        // border-collapse対応：境界線分を差し引く
        rowHeaderW -= 2;  // 行ヘッダーから2px引く
        colHeaderW -= 1;  // 列ヘッダーから1px引く

        // padding分を引いて表示幅を計算
        const songDisplayW = rowHeaderW - 8;      // 左右padding 4px*2
        const cdDisplayW = colHeaderW - 8;     // 左右padding 4px*2

        return {
            songDisplayW,
            cdDisplayW,
            rowHeaderW,
            colHeaderW
        };
    }

    const { songDisplayW, cdDisplayW, rowHeaderW, colHeaderW } = calculateDisplayWidths(filtDiscs.length);

    // px → 半角文字幅への変換（以降は半角文字幅で統一）
    const avgCharPx = 7; // 半角文字1文字あたりのピクセル数（概算）
    const songCharW = Math.floor(songDisplayW / avgCharPx);
    const cdCharW = Math.floor(cdDisplayW / avgCharPx);

    // URL検証関数を取得
    const { isValidUrl } = await import('./tbl.js');

    const headers = [''].concat(
        filtDiscs.map(d => {
            const cdName = truncate(d['cd-name'], cdCharW, '…');
            const songCount = d.tracks.filter(id => songIDs.includes(id)).length;
            // ヘッダーオブジェクトとして返す（テキスト + リンク情報）
            return {
                cdName,
                songCount,
                amznUrl: d.Amzn && isValidUrl(d.Amzn) ? d.Amzn : null
            };
        })
    );

    // 行データ（曲順もCDの重要度順に並べ替え）
    const sortedIDs = [];
    const addedSongs = new Set();

    // CDの順番（◯が多い順）で曲を追加
    filtDiscs.forEach(disc => {
        disc.tracks.forEach(trackId => {
            if (songIDs.includes(trackId) && !addedSongs.has(trackId)) {
                sortedIDs.push(trackId);
                addedSongs.add(trackId);
            }
        });
    });

    const rows = sortedIDs.map(songID => {
        const songName = musicMap[songID] || `不明 (ID: ${songID})`;

        // songCharWを表示幅としてcreateTtlに渡す
        const dispName = createTtl(songName, songCharW);

        const row = [dispName].concat(
            filtDiscs.map(disc => disc.tracks.includes(songID) ? '○' : '')
        );
        return row;
    });

    // 現在の表データを保存（リサイズ時の再描画用）
    curTblData = { songIDs, allDiscs, musicMap, selType };
    return { headers, rows, rowHeaderW, colHeaderW };
}

export function createTtl(title, maxDispW) {
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
                const shortStW = shortStyle === '…party' ? 7 : 6;
                const truncBase = truncate(baseTitle, maxDispW - shortStW);
                return truncBase + shortStyle;
            }
        }
    }

    // 2. 「アナザーワールド」処理
    if (title === 'アナザーワールド') {
        if (maxDispW < 8) {
            return 'アナザー…ルド';  // 8幅未満のときは固定表示
        } else {
            // 通常の省略処理
            return truncate(title, maxDispW, '…');
        }
    }

    // 3. 「アナザーワールドエンド」処理
    if (title === 'アナザーワールドエンド') {
        const origW = getDisplayWidth(title);  // 20幅
        if (maxDispW >= origW) {
            // 幅に余裕がある場合は元のタイトルをそのまま表示
            return title;
        }

        const suffix = '…エンド';  // 8幅
        const basePart = 'アナザーワールド';
        const truncBase = truncate(basePart, maxDispW - 8);

        // どんなに小さくても"アナザー…エンド"以上は切り詰めない
        if (getDisplayWidth(truncBase + suffix) < getDisplayWidth('アナザー…エンド')) {
            return 'アナザー…エンド';
        }
        return truncBase + suffix;
    }

    // 4. 「プログラムcontinued (15th style)」処理
    if (title === 'プログラムcontinued (15th style)') {
        const origW = getDisplayWidth(title);  // 元のタイトルの幅
        if (maxDispW >= origW) {
            // 幅に余裕がある場合は元のタイトルをそのまま表示
            return title;
        }

        const shortFormW = getDisplayWidth('プログラムcontinued15th');  // 23幅
        if (maxDispW >= shortFormW) {
            // 省略なしの短縮形が表示可能な場合
            return 'プログラムcontinued15th';
        } else {
            const suffix = '…15th';  // 6幅
            const basePart = 'プログラムcontinued';
            const truncBase = truncate(basePart, maxDispW - 6);

            // どんなに小さくても"プログラム…15th"は表示
            if (getDisplayWidth(truncBase + suffix) < getDisplayWidth('プログラム…15th')) {
                return 'プログラム…15th';
            }
            return truncBase + suffix;
        }
    }

    // 5. 「プログラムcontinued」処理
    if (title === 'プログラムcontinued') {
        const origW = getDisplayWidth(title);  // 18幅
        if (maxDispW >= origW) {
            // 幅に余裕がある場合は元のタイトルをそのまま表示
            return title;
        }

        const suffix = '…ed';  // 4幅
        const basePart = 'プログラムcontinued';
        const truncBase = truncate(basePart, maxDispW - 4);

        // 最小限の表示は保証
        if (getDisplayWidth(truncBase + suffix) < getDisplayWidth('プログラム…ed')) {
            return 'プログラム…ed';
        }
        return truncBase + suffix;
    }

    // 6. スノウ系曲名処理（4文字+…最小保証）
    if (['スノウアンサー', 'スノウリバース', 'スノウループ'].includes(title)) {
        const origW = getDisplayWidth(title);
        if (maxDispW >= origW) return title;
        
        const minShow = title.slice(0, 4) + '…';  // 4文字+…
        if (maxDispW < getDisplayWidth(minShow)) {
            return minShow;
        }
        return truncate(title, maxDispW, '…');
    }

    // 7. さよなら系曲名処理（5文字+…最小保証）
    if (['さよならサマータイムマシン', 'さよなら第九惑星'].includes(title)) {
        const origW = getDisplayWidth(title);
        if (maxDispW >= origW) return title;
        
        const minShow = title.slice(0, 5) + '…';  // 5文字+…
        if (maxDispW < getDisplayWidth(minShow)) {
            return minShow;
        }
        return truncate(title, maxDispW, '…');
    }

    // デフォルト動作：特殊ルールに該当しない場合は末尾…(幅2)で省略
    return truncate(title, maxDispW, '…');
}


// HTML表生成
export function generateHTMLTable(headers, rows, rowHeaderW, colHeaderW) {
    const table = document.createElement('table');
    table.className = 'tbl';
    // borderCollapse, width削除: CSSで.tblで指定済み
    table.style.fontSize = '12px';
    table.style.tableLayout = 'fixed';

    // ヘッダー行作成
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headers.forEach((header, index) => {
        const th = document.createElement('th');
        // border削除: CSSで.tbl thで指定済み
        th.style.padding = '6px 0';
        th.style.textAlign = 'center';
        // backgroundColor削除: CSSで.tbl thで指定済み
        th.style.fontSize = '10px';
        th.style.lineHeight = '1.2';
        th.style.whiteSpace = 'pre-line';
        th.style.verticalAlign = 'top';

        if (index === 0) {
            th.style.textAlign = 'left';
            th.style.width = `${rowHeaderW}px`;
            th.style.minWidth = `${rowHeaderW}px`;
            th.style.maxWidth = `${rowHeaderW}px`;
            th.style.fontSize = '11px';
            th.textContent = header;
        } else {
            th.style.width = `${colHeaderW}px`;
            th.style.minWidth = `${colHeaderW}px`;
            th.style.maxWidth = `${colHeaderW}px`;
            th.style.overflow = 'hidden';
            
            // ヘッダーコンテンツを安全に構築
            const cdText = document.createTextNode(header.cdName + '\n(' + header.songCount + ')');
            th.appendChild(cdText);
            
            if (header.amznUrl) {
                th.appendChild(document.createTextNode('\n'));
                const amznLink = document.createElement('a');
                amznLink.href = header.amznUrl;
                amznLink.target = '_blank';
                amznLink.rel = 'noopener noreferrer';
                amznLink.style.cssText = 'color: #0066cc; text-decoration: underline;';
                amznLink.textContent = 'Amz';
                th.appendChild(amznLink);
            }
        }

        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // データ行作成
    const tbody = document.createElement('tbody');
    rows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        // backgroundColor削除: CSSで.tbl tr:nth-child(even)で指定済み

        row.forEach((cell, cellIndex) => {
            const td = document.createElement('td');
            // border削除: CSSで.tbl tdで指定済み  
            td.style.textAlign = cellIndex === 0 ? 'left' : 'center';
            td.style.fontSize = cellIndex === 0 ? '11px' : '12px';

            if (cellIndex === 0) {
                // 曲名セル：左に4pxのpadding
                td.style.padding = '4px 0 4px 4px';
                td.style.width = `${rowHeaderW}px`;
                td.style.minWidth = `${rowHeaderW}px`;
                td.style.maxWidth = `${rowHeaderW}px`;
                td.style.wordWrap = 'break-word';
            } else {
                // CDセル：左右paddingなし
                td.style.padding = '4px 0';
                td.style.width = `${colHeaderW}px`;
                td.style.minWidth = `${colHeaderW}px`;
                td.style.maxWidth = `${colHeaderW}px`;
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
    const radioBtns = document.querySelectorAll('input[name="resultCdType"]');

    radioBtns.forEach(radio => {
        radio.addEventListener('change', function () {

            // 現在のチェック状態を再取得して表を更新
            const chkdEls = document.querySelectorAll('.chk:checked');
            const songIDs = Array.from(new Set(Array.from(chkdEls).map(chk => Number(chk.dataset.id))));

            if (songIDs.length > 0) {
                rebuildTable(songIDs);
            }
        });
    });
}

// 結果テーブルの再構築
async function rebuildTable(songIDs) {
    const { allDiscs, musicMap } = await loadData();
    const { headers, rows, rowHeaderW, colHeaderW } = await buildMatrix(songIDs, allDiscs, musicMap);
    const table = generateHTMLTable(headers, rows, rowHeaderW, colHeaderW);

    const container = document.getElementById('discsTbl');
    container.textContent = '';
    container.appendChild(table);
}

// CDボタンの処理を設定
export function setupBtn() {
    document.querySelectorAll('.showDiscsButton').forEach(btn => {
        btn.disabled = false;
        btn.addEventListener('click', async () => {
            setupFilter();

            // 両方のタブからチェック状態を取得（重複除去）
            const chkdEls = document.querySelectorAll('.chk:checked');
            const songIDs = Array.from(new Set(Array.from(chkdEls).map(chk => Number(chk.dataset.id))));

            if (songIDs.length === 0) {
                alert('1曲以上チェックしてね');
                return;
            }

            const { allDiscs, musicMap } = await loadData();
            const { headers, rows, rowHeaderW, colHeaderW } = await buildMatrix(songIDs, allDiscs, musicMap);
            const table = generateHTMLTable(headers, rows, rowHeaderW, colHeaderW);

            const container = document.getElementById('discsTbl');
            container.textContent = '';
            container.appendChild(table);

            document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// CDボタンクリック処理（main.jsから呼び出される）
async function handleClick() {
    setupFilter();

    // 両方のタブからチェック状態を取得（重複除去）
    const chkdEls = document.querySelectorAll('.chk:checked');
    const songIDs = Array.from(new Set(Array.from(chkdEls).map(chk => Number(chk.dataset.id))));

    if (songIDs.length === 0) {
        alert('1曲以上チェックしてね');
        return;
    }

    const { allDiscs, musicMap } = await loadData();
    const { headers, rows, rowHeaderW, colHeaderW } = await buildMatrix(songIDs, allDiscs, musicMap);
    const table = generateHTMLTable(headers, rows, rowHeaderW, colHeaderW);

    const container = document.getElementById('discsTbl');
    container.textContent = '';
    container.appendChild(table);

    document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
}

// 現在の表を再描画（リサイズ時用）
async function redraw() {
    if (!curTblData) return;

    const { songIDs, allDiscs, musicMap, selType } = curTblData;
    const { headers, rows, rowHeaderW, colHeaderW } = await buildMatrix(songIDs, allDiscs, musicMap);
    const table = generateHTMLTable(headers, rows, rowHeaderW, colHeaderW);

    const container = document.getElementById('discsTbl');
    container.textContent = '';
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
const debRedraw = debounce(redraw, 150);
window.addEventListener('resize', () => {
    const curTable = document.querySelector('#discsTbl table');
    if (curTable) {
        debRedraw();
    }
});

// 初期化関数
export function initCdFeats() {
    setupBtn();
    // グローバル関数として公開
    window.cdBtn = handleClick;
}