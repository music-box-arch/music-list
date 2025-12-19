// 「全ライブ音源情報モード」で使う、
// ライブ音源情報の「表示」と「削除」だけを担当するファイル。
// UI状態管理や openAudioNumbers の更新はここではやらない。

/**
 * @param {number} mID - 曲ごとの一意なID
 */
export function audioInfoOpen(mID) {
    console.log(`[audioInfoOpen] called: mID=${mID}`);

    // ===== 1. 対象のチェックボックスを探す =====
    // 曲行には必ず input.chk[data-id="mID"] が存在する想定
    const chk = document.querySelector(`input.chk[data-id="${mID}"]`);
    if (!chk) {
        console.warn('[audioInfoOpen] checkbox not found:', mID);
        return;
    }

    // ===== 2. チェックボックスが属する行（tr）を取得 =====
    const row = chk.closest('tr');
    if (!row) {
        console.warn('[audioInfoOpen] row not found:', mID);
        return;
    }

    // ===== 3. すでに表示されている場合は何もしない =====
    // 二重描写防止のためのガード
    if (document.querySelector(`[data-audio-info="${mID}"]`)) {
        return;
    }

    // ===== 4. ライブ音源情報用の行（tr）を作成 =====
    const infoRow = document.createElement('tr');
    // この行が「どの mID の情報か」を識別するための目印
    infoRow.dataset.audioInfo = mID;

    // ===== 5. セル（td）を作成 =====
    const td = document.createElement('td');
    // 曲一覧表の列数すべてを横断させる
    td.colSpan = row.children.length;

    // ===== 6. 仮の表示内容（あとで差し替える） =====
    const p = document.createElement('p');
    p.textContent = `（ここに mID=${mID} のライブ音源情報が入ります）`;
    p.style.fontSize = '0.9em';
    p.style.color = '#555';
    // td → tr の順に組み立てる
    td.appendChild(p);
    infoRow.appendChild(td);

    // ===== 7. 元の曲行の「直後」に挿入 =====
    row.after(infoRow);

    console.log('[audioInfoOpen] rendered:', mID);
}

/**
 * @param {number} mID - 曲ごとの一意なID
 */
export function audioInfoClose(mID) {
    console.log(`[audioInfoClose] called: mID=${mID}`);

    // ===== 1. 対象のライブ音源情報行を探す =====
    const infoRow = document.querySelector(`[data-audio-info="${mID}"]`);
    if (!infoRow) {
        console.warn('[audioInfoClose] info row not found:', mID);
        return;
    }
    // ===== 2. 行を削除 =====
    infoRow.remove();

    console.log('[audioInfoClose] removed:', mID);
}
