// 全ライブ音源情報モード用
// （UI状態管理はしない・mIDを受け取って「表示する / 消す」）

/**
 * 指定された mID のライブ音源情報を開く（司令塔）
 */
export async function audioInfoOpen(mID) {
    // ===== 表示用の土台を作る =====
    const base = mkAudBase(mID);
    if (!base) return;

    const { td } = base;

    try {
        // ===== データを取得 =====
        const data = await getAudData(mID);

        // ===== データがある場合の描画 =====
        putAudData(td, data);
    } catch {
        // ===== データが無い / 取得失敗 =====
        putNoAud(td);
    }
}

// 以下は audInfoOpen から呼ばれる内部用ヘルパー関数群

// 音源情報表示用の土台DOM作成（対象行の直後に <tr> 挿入・既に開いていればnullを返す）
function mkAudBase(mID) {
    // 対象のチェックボックスを探す
    const chk = document.querySelector(`input.chk[data-id="${mID}"]`);
    if (!chk) return null;

    // チェックボックスが属する行を取得
    const row = chk.closest('tr');
    if (!row) return null;

    // 二重描画防止
    if (document.querySelector(`[data-audio-info="${mID}"]`)) {
        return null;
    }

    // 情報表示用の行を作成
    const infoRow = document.createElement('tr');
    infoRow.dataset.audioInfo = mID;

    const td = document.createElement('td');
    td.colSpan = row.children.length;

    infoRow.appendChild(td);

    // 元の曲行の直後に挿入
    row.after(infoRow);

    return { infoRow, td };
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
function putAudData(td, data) {
    data.forEach(item => {
        const p = document.createElement('p');

        // 空文字は表示しない
        const parts = [
            item['event-date'],
            item['event-name'],
            item['event-venue'],
            item['product-name'],
            item['edition']
        ].filter(Boolean);

        p.textContent = parts.join(' / ');
        p.style.fontSize = '0.9em';

        td.appendChild(p);
    });
}

// ライブ音源データが無い場合の表示
function putNoAud(td) {
    const p = document.createElement('p');
    p.textContent = 'この曲のライブ音源データはありません';
    p.style.color = '#777';
    p.style.fontStyle = 'italic';

    td.appendChild(p);
}


/**
 * @param {number} mID - 曲ごとの一意なID
 */
// 指定された mID のライブ音源情報を閉じる
export function audioInfoClose(mID) {
    console.log(`[audioInfoClose] called: mID=${mID}`);

    const infoRow = document.querySelector(`[data-audio-info="${mID}"]`);
    if (!infoRow) return;

    infoRow.remove();
}