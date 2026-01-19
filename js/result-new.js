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
const { state, chkStates, mTbl, mkLink, readJson } = await import(addVer('./main-new.js'));
// ローカル短縮
const { cs, csBk } = chkStates;

export async function showResult() {
    console.log('showResult is called');
    const allDiscs = await readJson('data/all-discs.json');
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

    measureEnv();
    getCdType();

    mkResultData(cs, mTbl, allDiscs);

    // ↓ ここから先で
    // mkResultData()
    // mkMinTbl()
    // adjustTbl()
    // renderTbl()

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
function mkResultData(cs, mTbl, allDiscs) {
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
            cdType: disc['cd-type'],
            tracks: disc.tracks,
            amznUrl: disc.A || null,
            hitCnt
        };
    });

    // ★ cols ログ（cd-group-id + ヒット曲数 + mID一覧）
    console.log(
        '[result] cols:',
        cols.map(col => {
            const hits = col.tracks.filter(id => cs.includes(id));
            return `${col.cdId}(${hits.length} : ${hits.join(',')})`;
        }).join(', ')
    );

    // ===== 4. 行順決定 =====
    const rowsOrder = sortRows(cols, cs);
    console.log('[result] rowsOrder:', rowsOrder.join(', '));


    // ===== 5. rows 作成 =====
    const rows = rowsOrder.map(songId => {
        const song = mTbl[songId];
        const title = song ? song.title : `不明(ID:${songId})`;

        const hitCnt = hitCdCnt(songId, cols);

        return {
            songId,
            title,
            cells: cols.map(col => col.tracks.includes(songId)),
            hitCdCnt: hitCnt
        };
    });

    console.log(
        '[result] rows:',
        rows.map(r => `${r.songId}(${r.hitCdCnt})`).join(', ')
    );
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