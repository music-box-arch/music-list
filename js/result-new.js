/*
showResult
├─ loadCss()
├─ if cs.length === 0
│   └─ alert文
├─ measureEnv()
├─ getCdType()                  // radio 状態取得
├─ mkResultData(cs, …)          // ★ 全CDタイプ入りの“意味データ”
├─ applyCdType()                // ★ データレベルで列を落とす
├─ mkMinTbl(data)               // DOM生成（最小）
├─ adjustTbl(tbl, env)          // 幅調整
└─ renderTbl()
*/

// result-new.js
const { addVer } = window.MLAPP;
// addVer を使って main-new.js を import
const { state, chkStates, mTbl, mkLink, readJson, mlJsonData } = await import(addVer('./main-new.js'));
// ローカル短縮
const { cs, csBk } = chkStates;

export async function showResult() {
    console.log('showResult is called');
    const allDiscs = await readJson('data/all-discs-new.json');
    const mlJson = await mlJsonData;
    const { loadCss, startSync } = await import(addVer('./func-new.js'));
    loadCss('result-css', 'css/result.css');

    if (!state.isSyncing) {
        startSync();
    }

    // 選択曲なしの場合
    if (cs.length === 0) {
        alert('1曲以上チェックしてね');
        return;
    }

    // ★ ここからパーツ用Mapの構築と判定
    // 1. mlJsonData (main-new.jsより) から基礎Mapを作成
    // mID -> { full, part } の Map を作成
    const titleMap = new Map(
        mlJson.map(item => [
            item.mID,
            {
                full: item.title,
                part: item.hasOwnProperty('parts') ? item.parts : null
            }
        ])
    );
    // 2. csの中にMapに存在しないIDがあるかチェック
    const hasMissing = cs.some(id => !titleMap.has(id));
    // 3. 不足があれば smJson を取得して、そのまま titleMap に統合
    if (hasMissing) {
        const smData = await getSmJson();
        for (const item of smData) {
            titleMap.set(item.mID, {
                full: item.title,
                part: item.hasOwnProperty('parts') ? item.parts : null
            });
        }
    }

    const env = measureEnv();
    const cdType = getCdType();

    const resultData = await mkResultData(cs, mTbl, allDiscs);
    const cdTypeData = applyCdType(resultData, cdType);
    const resultMinTbl = mkMinTbl(cdTypeData);
    const adjustedTbl = adjustTbl(resultMinTbl, cdTypeData.cols, env, partsMap);
    renderTbl(adjustedTbl);
}
function measureEnv() {
    // テーブルを置くラッパー
    const wrapper = document.querySelector('#resultArea .table-wrapper');

    // 横幅（スクロール前の可視幅）
    const limitW = wrapper.clientWidth;

    // フォントサイズ（CSS反映済みの実値）
    const style = getComputedStyle(wrapper);
    const fontPx = parseFloat(style.fontSize);
    console.log({ fontPx, limitW });

    return { fontPx, limitW };
}
function getCdType() {
    const el = document.querySelector(
        '#resultCdTypeFilter input[name="resultCdType"]:checked'
    );
    // この下の2行はコメント用
    const cdType = el ? el.value : 'both';
    console.log('[result] cdType:', cdType);

    return el ? el.value : 'both';
}
async function mkResultData(cs, mTbl, allDiscs) {
    console.log('[result] mkResultData start', { cs: cs.length, discs: allDiscs.length });

    // ===== 1. 使用されるCDだけ抽出 =====
    const usedDiscs = allDiscs.filter(disc =>
        Array.isArray(disc.tracks) &&
        disc.tracks.some(id => cs.includes(id))
    );

    console.log('[result] usedDiscs:', usedDiscs.length);

    // ===== 2. ◯の数が多いCD順にソート =====
    usedDiscs.sort((a, b) => {
        const aCnt = a.tracks.filter(id => cs.includes(id)).length;
        const bCnt = b.tracks.filter(id => cs.includes(id)).length;
        return bCnt - aCnt;
    });

    // ===== 3. cols 作成 =====
    const cols = usedDiscs.map(disc => {
        const hitCnt = disc.tracks.filter(id => cs.includes(id)).length;

        return {
            cdId: disc['cd-group-id'],
            cdName: disc['cd-name'],
            cdNameParts: disc['cd-name-parts'] || null,
            cdType: disc['cd-type'],
            tracks: disc.tracks,
            amznUrl: disc.A || null,
            TRUrl: disc.TR || null,
            hitCnt
        };
    });

    // ★ cols ログ（cd-group-id + ヒット曲数 + mID一覧）
    console.log('[result] cols:', cols.map(col => { const hits = col.tracks.filter(id => cs.includes(id)); return `${col.cdId}(${hits.length} : ${hits.join(',')})`; }).join(', '));

    // ===== 4. 行順決定 =====
    const rowsOrder = sortRows(cols, cs);
    console.log('[result] rowsOrder:', rowsOrder.join(', '));

    // ===== 5. rows 作成 =====
    const rows = [];
    rowsOrder.forEach(songId => {
        const title = getTitle(songId, mTbl);

        if (!title) {
            console.warn('[result] title not found, skip songId:', songId);
            return;
        }

        const hitCnt = hitCdCnt(songId, cols);
        rows.push({
            songId,
            title,
            cells: cols.map(col => col.tracks.includes(songId)),
            hitCdCnt: hitCnt
        });
    });
    console.log('[result] rows:', rows.map(r => `${r.songId}(${r.hitCdCnt})`).join(', '));
    console.log('[result] mkResultData done');

    return { cols, rows };
}
// 以下、ヘルパーたち
// 曲が含まれているCDの数を数える
function hitCdCnt(songId, cols) {
    let cnt = 0;
    for (const col of cols) {
        if (col.tracks.includes(songId)) cnt++;
    }
    return cnt;
}
// 行順を決定する
function sortRows(cols, cs) {
    const remain = new Set(cs);
    const order = [];

    for (const col of cols) {
        // このCDに含まれていて、まだ残っている曲
        const pick = col.tracks
            .filter(id => remain.has(id))
            .sort((a, b) => hitCdCnt(b, cols) - hitCdCnt(a, cols));

        for (const id of pick) {
            order.push(id);
            remain.delete(id);
        }

        if (remain.size === 0) break;
    }
    return order;
}
function getTitle(songId, mTbl) {
    const tr = mTbl.map.get(Number(songId));
    if (!tr) return null;

    const td = tr.querySelector('[data-fld="title"]');
    const title = td?.textContent.trim();

    return title || null;
}

function applyCdType(resultData, cdType) {
    if (cdType === 'both') {
        return resultData;
    }

    const filteredCols = resultData.cols.filter(
        col => col.cdType === cdType
    );

    // cols が変わるので rows の cells も合わせて削る
    const colIndexes = filteredCols.map(col =>
        resultData.cols.indexOf(col)
    );

    const filteredRows = resultData.rows.map(row => {
        return {
            ...row,
            cells: colIndexes.map(i => row.cells[i])
        };
    });

    return { cols: filteredCols, rows: filteredRows };
}

function mkMinTbl(resultData) {
    const { cols, rows } = resultData;
    console.log('[result] mkMinTbl start', { cols: cols.length, rows: rows.length });

    // <table id="resultTbl" class="tbl"> は既にHTMLにある前提
    const tbl = document.getElementById('resultTbl');
    tbl.textContent = ''; // 中身クリア（再描画対応）

    /* ===== thead ===== */
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');

    // 左上（曲名ヘッダ・空）
    const thBlank = document.createElement('th');
    thBlank.textContent = '';
    trHead.appendChild(thBlank);

    // CD列ヘッダ
    cols.forEach(col => {
        const th = document.createElement('th');
        th.dataset.cdid = col.cdId; // ★ これを追加

        /* --- CD名 --- */
        const cdNameDiv = document.createElement('div');
        cdNameDiv.textContent = col.cdNameParts
            ? mkNameByParts(col.cdNameParts, 0) // 省略あり
            : col.cdName;                       // フル表示
        th.appendChild(cdNameDiv);

        /* --- ヒット曲数 --- */
        const hitCntDiv = document.createElement('div');
        hitCntDiv.textContent = `(${col.hitCnt})`;
        th.appendChild(hitCntDiv);

        /* --- リンク群 --- */
        const linksDiv = document.createElement('div');
        const links = [];

        if (col.amznUrl) { links.push(mkLink(col.amznUrl, 'Amz')); }
        if (col.TRUrl) { links.push(mkLink(col.TRUrl, 'TR')); }

        // 配列を " / " で結合して append
        links.forEach((link, i) => {
            if (i > 0) {
                linksDiv.appendChild(document.createTextNode('/'));
            }
            linksDiv.appendChild(link);
        });

        if (links.length > 0) {
            th.appendChild(linksDiv);
        }
        trHead.appendChild(th);
    });

    thead.appendChild(trHead);
    tbl.appendChild(thead);

    /* ===== tbody ===== */
    const tbody = document.createElement('tbody');

    rows.forEach(row => {
        const tr = document.createElement('tr');

        // 曲名セル
        const tdTitle = document.createElement('td');
        tdTitle.textContent = row.title;
        tdTitle.classList.add('row-head');
        tr.appendChild(tdTitle);

        // CDヒットセル
        row.cells.forEach(hit => {
            const td = document.createElement('td');
            td.textContent = hit ? '○' : '';
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    tbl.appendChild(tbody);
    console.log('[result] mkMinTbl done');
    return tbl;
}
function mkNameByParts(parts, n = 0) {
    const p0 = parts[0] ?? '';
    const p1 = parts[1] ?? '';
    const p2 = parts[2] ?? '';

    if (!p1 || n === 0) {
        return `${p0}…${p2}`;
    }
    if (p1.length <= n) {
        return `${p0}${p1}${p2}`;
    }
    return `${p0}${p1.slice(0, n)}…${p2}`;
}

/**
 * テーブル幅の自動調整（3フェーズ）
 * @param {HTMLElement} tbl - mkMinTblで生成されたテーブル
 * @param {Array} cols - CD列の情報(cdNamePartsを含む)
 * @param {Object} env - 画面幅(limitW)など
 * @param {Map} partsMap - mIDからpartsを引き出すためのMap
 */
function adjustTbl(tbl, cols, env, partsMap) {
    const { limitW } = env;
    const styleObj = window.getComputedStyle(tbl);
    const padX = parseFloat(styleObj.getPropertyValue('--th-padx')) || 8;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const thStyle = window.getComputedStyle(tbl.querySelector('th'));
    const rowTds = Array.from(tbl.querySelectorAll('tbody td.row-head'));
    const tdStyle = window.getComputedStyle(rowTds[0]);

    /* =========================
     * フェーズ1：共通基準幅
     * ========================= */

    ctx.font = `${tdStyle.fontWeight} ${tdStyle.fontSize} ${tdStyle.fontFamily}`;
    const minRowW = fixMaxRowW(displayRows, 0, ctx) + padX;

    // ★ minRowW の値
    console.log('[adjustTbl][phase1] minRowW =', minRowW);

    ctx.font = `${thStyle.fontWeight} ${thStyle.fontSize} ${thStyle.fontFamily}`;
    let bestW = 0;
    let bestN = 0;

    for (let n = 0; n <= 15; n++) {
        const maxW = fixMaxW(cols, n, ctx);
        const tw = minRowW + (maxW + padX) * cols.length;

        // ★ n と maxW のペア
        console.log('[adjustTbl][phase1] n / maxW =', n, maxW);

        if (tw > limitW && n > 0) {
            console.log('[adjustTbl][phase1] break: tw > limitW', { n, tw, limitW });
            break;
        }

        bestW = maxW;
        bestN = n;

        if (cols.every(c => !c.cdNameParts || n >= c.cdNameParts[1].length)) {
            console.log('[adjustTbl][phase1] break: all cdNameParts satisfied at n =', n);
            break;
        }
    }

    // ★ bestN / bestW
    console.log('[adjustTbl][phase1] bestN / bestW =', bestN, bestW);

    /* =========================
     * フェーズ2：CD列個別最適化
     * ========================= */

    let currentTw = minRowW;
    console.log('[adjustTbl][phase2] start currentTw =', currentTw);

    cols.forEach(col => {
        const th = tbl.querySelector(`th[data-cdid="${col.cdId}"]`);
        if (!th) return;

        const individualN = col.cdNameParts
            ? findBestN(col.cdNameParts, bestW, ctx)
            : 0;

        const cw = col.cdNameParts
            ? msrWithN(col.cdNameParts, individualN, ctx)
            : msrW(col.cdName, ctx);

        currentTw += cw + padX;

        console.log('[adjustTbl][phase2] col result', { cdId: col.cdId, individualN, cw, currentTw });

        th.querySelector('div').textContent = col.cdNameParts
            ? mkNameByParts(col.cdNameParts, individualN)
            : col.cdName;
    });

    /* =========================
     * フェーズ3：曲名側へ余白還元
     * ========================= */

    ctx.font = `${tdStyle.fontWeight} ${tdStyle.fontSize} ${tdStyle.fontFamily}`;
    let finalRowMaxW = minRowW - padX;

    for (let n = 1; n <= 15; n++) {
        const rowMaxW = fixMaxRowW(displayRows, n, ctx);
        const totalW = currentTw - (minRowW - padX) + rowMaxW;
        const ok = totalW <= limitW;

        // ★ 各値と判定結果
        console.log('[adjustTbl][phase3] check', { n, rowMaxW, totalW, limitW, ok });

        if (!ok) break;

        finalRowMaxW = rowMaxW;

        if (displayRows.every(r => !r.parts || n >= r.parts[1].length)) {
            console.log('[adjustTbl][phase3] break: all row parts satisfied at n =', n);
            break;
        }
    }

    rowTds.forEach(td => {
        const mID = Number(td.dataset.mid);
        const parts = partsMap.get(mID);
        if (parts) {
            const indN = findBestN(parts, finalRowMaxW, ctx);
            td.textContent = mkNameByParts(parts, indN);
        }
    });
    return tbl;
}

function renderTbl(tbl) {
    console.log('[result] renderTbl');

    const wrapper = document.querySelector('#resultArea .table-wrapper');

    // DOM上にあるtblを「見せる」だけ
    wrapper.style.display = '';

    // 結果エリアまで自動スクロール
    document.getElementById('resultArea')
        .scrollIntoView({ behavior: 'smooth' });

    return tbl;
}