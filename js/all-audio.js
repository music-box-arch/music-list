//指定mIDの音源情報を開く
export async function audioInfoOpen(mID) {
    // ===== 表示用の土台を作る =====
    const base = mkAudBase(mID);
    if (!base) return;

    const { wrap } = base;

    try {
        //get data
        const data = await getAudData(mID);
        //exist
        putAudData(wrap, data);
    } catch {
        //not exist
        putNoAud(wrap);
    }
}

//audInfoOpen用ヘルパー関数群
// 曲行の後に音源情報用のtr+tdを用意
function mkAudBase(mID) {
    // すでに開いてたら何もしない
    if (document.querySelector(`[data-audio-info="${mID}"]`)) {
        return null;
    }

    // chkBx探し
    const chk = document.querySelector(`input.chk[data-id="${mID}"]`);
    if (!chk) {
        console.warn(`[mkAudBase] checkbox not found for mID=${mID}`);
        return null;
    }

    const songRow = chk.closest('tr');
    if (!songRow) {
        console.warn(`[mkAudBase] tr not found via checkbox for mID=${mID}`);
        return null;
    }

    // 展開用の行
    const tr = document.createElement('tr');
    tr.className = 'audio-info-row';
    tr.dataset.audioInfo = mID;

    const td = document.createElement('td');
    td.colSpan = songRow.children.length;
    td.className = 'aud-bs';

    // ★ ラッパーをここで作る
    const wrap = document.createElement('div');
    wrap.className = 'aud-wrap';

    td.appendChild(wrap);
    tr.appendChild(td);
    songRow.after(tr);

    // ★ td ではなく wrap を返す
    return { tr, wrap };
}

async function getAudData(mID) {
    const res = await fetch(`data/all-live-audio/${mID}.json?v=${window.updVer}`);

    //if no data
    if (!res.ok) {
        throw new Error('no data');
    }

    const data = await res.json();

    //empty
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('empty data');
    }

    return data;
}

async function putAudData(wrap, data) {
    const { mkMiniTbl } = await import('./tbl.js?v=${window.updVer}');

    const headers = [
        '日時',
        'イベント名',
        '会場',
        '商品種別',
        '円盤名',
        '備考'
    ];

    const rows = data.map(d => [
        d['event-date'],
        d['event-name'],
        d['event-venue'],
        d['product-type'],
        d['product-name'],
        d['edition'] ?? ''
    ]);

    const tbl = mkMiniTbl(headers, rows);
    tbl.classList.add('aud-mn');

    wrap.appendChild(tbl);
}

function putNoAud(wrap) {
    const p = document.createElement('p');
    p.textContent = 'この曲のライブ音源データはありません';
    p.className = 'aud-no';

    wrap.appendChild(p);
}

// 指定mIDの音源情報を閉じる
export function audioInfoClose(mID) {
    const infoRow = document.querySelector(`[data-audio-info="${mID}"]`);
    if (!infoRow) return;

    infoRow.remove();
}