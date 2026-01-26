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
const { state, chkStates, mTbl, mkLink, readJson, mlJsonData, waitReady } = await import(addVer('./main-new.js'));
// ローカル短縮
const { cs, csBk } = chkStates;

let resultCtx = null;

export async function showResult() {
    console.log('showResult is called');
    const allDiscs = await readJson('data/all-discs-new.json');
    const mlJson = await mlJsonData;
    const { loadCss, startSync, getSmJson } = await import(addVer('./func-new.js'));
    loadCss('result-css', 'css/result.css');

    if (!state.isSyncing) { startSync(); }

    if (cs.length === 0) {
        alert('1曲以上チェックしてね');
        return;
    }

    // 1. mlJsonDataから mID -> {full, part} のMapを作成
    const titleMap = new Map(
        mlJson.map(item => [
            item.mID, {
                full: item.title,
                part: item.hasOwnProperty('parts') ? item.parts : null
            }
        ])
    );
    // 2. csの中にMapに存在しないIDがあるか? → あれば smJson を取得して titleMap に統合
    const hasMissing = cs.some(id => !titleMap.has(id));
    if (hasMissing) {
        const smData = await getSmJson();
        for (const item of smData) {
            titleMap.set(item.mID, {
                full: item.title,
                part: item.hasOwnProperty('parts') ? item.parts : null
            });
        }
    }

    // ===== 行ヘッダ用 map 作成（CD名）=====
    const cdNameMap = new Map();
    allDiscs.forEach(item => {
        cdNameMap.set(item['cd-group-id'], {
            full: item['cd-name'],
            part: item.hasOwnProperty('cd-name-parts')
                ? item['cd-name-parts']
                : null
        });
    });

    const resultData = await mkResultData(cs, mTbl, allDiscs);
    setupCdType();
    const env = await measureEnv();
    resultCtx = { resultData, titleMap, cdNameMap, env };
    drawByCdType();
}
const setupCdType = (() => {
    let done = false;
    return () => {
        if (done) return;

        document.querySelectorAll('#resultCdTypeFilter input[name="resultCdType"]')
            .forEach(r => r.addEventListener('change', drawByCdType));
        done = true;
    };
})();

function drawByCdType() {
    const cdType = getCdType();
    const cdTypeData = applyCdType(resultCtx.resultData, cdType);

    const resultMinTbl = mkMinTbl(cdTypeData, resultCtx.cdNameMap);

    const adjustedTbl = adjustTbl(resultMinTbl, cdTypeData.cols, resultCtx.env, resultCtx.titleMap, resultCtx.cdNameMap);
    renderTbl(adjustedTbl);

}
async function measureEnv() {
    const wrapper = document.querySelector('#resultArea .table-wrapper');
    const limitW = wrapper.clientWidth;

    const tbl = document.getElementById('resultTbl');
    // --th-padxの値が取れるようになるまで待つ
    const thPadX = await waitValue(tbl, '--th-padx');

    const style = getComputedStyle(tbl);
    const fontSize = style.fontSize;
    const fontFamily = style.fontFamily;

    return { limitW, fontSize, fontFamily, thPadX };
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

function mkMinTbl(resultData, cdNameMap) {
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
        const cdObj = cdNameMap.get(col.cdId);
        cdNameDiv.textContent = cdObj ? mkNameByN(cdObj, 0) : '';
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
        tdTitle.dataset.mid = row.songId; // ★ これを追加
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
function mkNameByN(obj, n = 0) {
    // parts が無い場合はフル文字列をそのまま返す
    if (!obj.part) {
        return obj.full;
    }

    const p0 = obj.part[0] ?? '';
    const p1 = obj.part[1] ?? '';
    const p2 = obj.part[2] ?? '';

    if (!p1 && !p2) {
        return p0;
    }
    if (!p1 || n === 0) {
        return `${p0}…${p2}`;
    }
    if (p1.length <= n) {
        return `${p0}${p1}${p2}`;
    }
    return `${p0}${p1.slice(0, n)}…${p2}`;
}

async function waitValue(el, prop, interval = 20) {
    while (true) {
        const v = parseFloat(getComputedStyle(el).getPropertyValue(prop));
        if (!Number.isNaN(v)) return v;
        await new Promise(r => setTimeout(r, interval));
    }
}

/**
 * テーブル幅の自動調整（3フェーズ）
 * @param {HTMLElement} tbl - mkMinTblで生成されたテーブル
 * @param {Array} cols - CD列の情報(cdNamePartsを含む)
 * @param {Object} env - 画面幅(limitW)など
 * @param {Map} partsMap - mIDからpartsを引き出すためのMap
 */
async function adjustTbl(tbl, cols, env, titleMap, cdNameMap) {
    console.log('[adjustTbl] start');
    // ===== フェーズ0-1：表示制限幅の取得 =====
    const limitW = env.limitW;
    console.log(`[adjustTbl][0-1] limitW=${limitW}`);

    // ===== フェーズ0-2：padding 値の取得（左右合計）=====
    const thPadX = env.thPadX;
    console.log(`[adjustTbl][0-2] thPadX=${thPadX}`);

    // ===== フェーズ0-3：canvas / context 準備 =====
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    console.log(`[adjustTbl][0-3] canvas=${!!canvas}, ctx=${!!ctx}`);

    // ===== フェーズ0-4：スタイル取得（簡易）=====
    const fontSize = env.fontSize;
    const fontFamily = env.fontFamily;
    // canvas context にフォント設定
    ctx.font = `${fontSize} ${fontFamily}`;
    console.log(`[adjustTbl][0-4] fontSize=${fontSize}, fontFamily=${fontFamily}`);

    // ===== フェーズ0-5,0-6：行ヘッダ用titleMap(曲名), 列ヘッダ用cdNameMap(CD名)=====
    console.log(`[adjustTbl][0-5] titleMap size=${titleMap.size}`);
    console.log(`[adjustTbl][0-6] cdNameMap size=${cdNameMap.size}`);

    // ===== フェーズ1：行ヘッダ最小表示幅の算出 =====
    // 1-1,1-2. baseTitleW 初期化し、cs に含まれる各 mID についてループ
    const baseTitleW = msrMaxNameW(cs, titleMap, 0, ctx);
    // 1-3,1-4. padding を加算 → ログ出し
    const baseRowHW = baseTitleW + thPadX;
    console.log(`[adjustTbl][1] baseTitleW=${baseTitleW}, baseRowHW=${baseRowHW}`);

    // ===== フェーズ2： =====
    const colCnt = cols.length;
    const cdIds = cols.map(col => col.cdId);

    let bestCdNameW = msrMaxNameW(cdIds, cdNameMap, 0, ctx);

    for (let n = 0; n <= 15; n++) {
        console.log(`[adjustTbl][2] n=${n}`);

        const maxCdNameW = msrMaxNameW(cdIds, cdNameMap, n, ctx);
        console.log(`[adjustTbl][2] maxCdNameW=${maxCdNameW}`);

        const curTblW = baseRowHW + (maxCdNameW + thPadX) * colCnt;

        const fits = curTblW <= limitW;
        console.log(`[adjustTbl][2] curTblW=${curTblW}, limitW=${limitW}, fits=${fits}`);

        if (!fits) {
            console.log(`[adjustTbl][2] break bestCdNameW=${bestCdNameW}`);
            break;
        }
        bestCdNameW = maxCdNameW;
    }
    // ===== フェーズ3：列ヘッダ表示の決定 =====
    // 3-1. 空の map を作成
    const cdNameDispMap = new Map();
    // 3-2. 各列ヘッダ（cd-group-id）について
    cdIds.forEach(cdId => {
        const obj = cdNameMap.get(cdId);
        const dispName = findBestName(obj, bestCdNameW, ctx);
        cdNameDispMap.set(cdId, dispName);
        console.log(`[adjustTbl][3] cdId=${cdId}, dispName="${dispName}"`);
    });
    console.log(`[adjustTbl][3] cdNameDispMap size=${cdNameDispMap.size}`);

    // ===== フェーズ4：行ヘッダ表示の決定 =====
    // 4-1. 列ヘッダ全体の幅を算出
    const colsW = (bestCdNameW + thPadX) * colCnt;
    console.log(`[adjustTbl][4-1] colsW=${colsW}`);
    // 4-2. 行ヘッダ用の限界幅を算出
    const rawRowHW = limitW - colsW - thPadX;
    const rowHW = Math.max(rawRowHW, baseTitleW);
    console.log(`[adjustTbl][4-2] rowHW=${rowHW}`);

    // 4-3. 空の map を作成
    const titleDispMap = new Map();
    // 4-4. cs に含まれる各 mID について
    cs.forEach(mID => {
        const obj = titleMap.get(mID);
        const dispName = findBestName(obj, rowHW, ctx);
        titleDispMap.set(mID, dispName);
        console.log(`[adjustTbl][4] mID=${mID}, dispName="${dispName}"`);
    });
    console.log(`[adjustTbl][4] titleDispMap size=${titleDispMap.size}`);

    // ===== フェーズ5：DOM反映・return =====
    // 5-0. ここでCSSを反映
    tbl.style.setProperty('--rowH-width', `${rowHW}px`);
    tbl.style.setProperty('--col-width', `${bestCdNameW + thPadX}px`);
    // 5-1. 列ヘッダ（th）に表示を反映
    const thList = tbl.querySelectorAll('thead th[data-cdid]');
    thList.forEach(th => {
        const cdId = th.dataset.cdid;
        const dispName = cdNameDispMap.get(cdId);

        if (dispName !== undefined) {
            // th の最初の div にだけ文字列を入れる
            const firstDiv = th.querySelector('div');
            if (firstDiv) {
                firstDiv.textContent = dispName;
                console.log(`[adjustTbl][5-1] cdId=${cdId}, dispName="${dispName}"`);
            } else {
                console.warn(`[adjustTbl][5-1] cdId=${cdId}, first div not found`);
            }
        } else {
            console.warn(`[adjustTbl][5-1] cdId=${cdId}, dispName not found in cdNameDispMap`);
        }
    });

    // 5-2. 行ヘッダ（td.row-head）に表示を反映
    const rowHeadList = tbl.querySelectorAll('tbody td.row-head[data-mid]');
    rowHeadList.forEach(td => {
        const mID = td.dataset.mid;
        const dispName = titleDispMap.get(Number(mID));

        if (dispName !== undefined) {
            td.textContent = dispName;
            console.log(`[adjustTbl][5-2] mID=${mID}, dispName="${dispName}"`);
        } else {
            console.warn(`[adjustTbl][5-2] mID=${mID}, dispName not found in titleDispMap`);
        }
    });
    // 5-3. 調整済み table を return
    console.log('[adjustTbl][5-3] done');
    return tbl;
}

function msrMaxNameW(ids, nameMap, n, ctx) {
    let maxW = 0;
    ids.forEach(id => {
        const obj = nameMap.get(id);
        const name = obj ? mkNameByN(obj, n) : '';
        const w = ctx.measureText(name).width;

        if (w > maxW) {
            maxW = w;
        }
    });
    return maxW;
}

function findBestName(obj, limitW, ctx) {
    if (!obj) return '';

    let bestName = mkNameByN(obj, 0);
    for (let n = 0; n <= 15; n++) {
        const name = mkNameByN(obj, n);
        if (ctx.measureText(name).width > limitW) break;
        bestName = name;
    }
    return bestName;
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