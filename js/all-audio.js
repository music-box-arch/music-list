// 全ライブ音源情報モード用
// （UI状態管理はしない・mIDを受け取って「表示する / 消す」）

// 指定された mID のライブ音源情報を開く（司令塔）
export async function audioInfoOpen(mID) {
    console.log(`[audioInfoOpen] called: mID=${mID}`);

    // ===== 表示用の土台を作る =====
    const base = mkAudBase(mID);
    if (!base) return;

    const { wrap } = base;

    try {
        // ===== データを取得 =====
        const data = await getAudData(mID);
        // ===== データがある場合の描画 =====
        putAudData(wrap, data);
    } catch {
        // ===== データが無い / 取得失敗 =====
        putNoAud(wrap);
    }
}

// 以下は audInfoOpen から呼ばれる内部用ヘルパー関数群

// 曲の行の直後に、音源情報用の tr + td を用意する・既に開いていればnullを返す）
function mkAudBase(mID) {
    console.log(`[mkAudBase] called: mID=${mID}`);

    // すでに開いていたら何もしない
    if (document.querySelector(`[data-audio-info="${mID}"]`)) {
        console.log(`[mkAudBase] already opened: mID=${mID}`);
        return null;
    }

    // checkbox を探す（mIDを知っている唯一の手がかり）
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

    console.log('[mkAudBase] audio-info row inserted');

    // ★ td ではなく wrap を返す
    return { tr, wrap };
}

// ライブ音源データを取得する、ファイル無し / 空配列はエラー扱い
async function getAudData(mID) {
    const res = await fetch(`data/all-live-audio/${mID}.json`);

    // ファイルが存在しない（404など）
    if (!res.ok) {
        throw new Error('no data');
    }

    const data = await res.json();

    // 空 or 配列でない場合
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('empty data');
    }

    return data;
}

// ライブ音源データがある場合の表示
async function putAudData(wrap, data) {
    console.log('[putAudData] called');

    const { mkMiniTbl } = await import('./tbl.js');

    const headers = [
        '日時',
        'イベント名',
        'イベント会場',
        '商品種別',
        '収録円盤名',
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

    console.log('[putAudData] mini table appended');
}

// ライブ音源データが無い場合の表示
function putNoAud(wrap) {
    const p = document.createElement('p');
    p.textContent = 'この曲のライブ音源データはありません';
    p.className = 'aud-no';

    wrap.appendChild(p);
}

// @param {number} mID - 曲ごとの一意なID
// 指定された mID のライブ音源情報を閉じる
export function audioInfoClose(mID) {
    console.log(`[audioInfoClose] called: mID=${mID}`);

    const infoRow = document.querySelector(`[data-audio-info="${mID}"]`);
    if (!infoRow) return;

    infoRow.remove();
}