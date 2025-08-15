// チェック状態管理専用モジュール

let csBk = null;
let checkState = [];

// checkState管理系関数
export async function initChkState() {
    // DOM状態を一括取得してcheckStateに初期化
    const checkedIds = [];
    document.querySelectorAll('.chk:checked').forEach(chk => {
        checkedIds.push(Number(chk.dataset.id));
    });
    checkState = checkedIds.sort((a, b) => a - b);
    window.checkState = checkState;

    // csBkも初期化（現在の状態をバックアップとして保持）
    csBk = [...checkState];

}

// グローバルcheckStateを曲一覧表に反映
export function applyToSongs() {
    document.querySelectorAll('#musicTbl .chk').forEach(chk => {
        chk.checked = false;
    });

    checkState.forEach(id => {
        const checkbox = document.querySelector(`#musicTbl .chk[data-id="${id}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });

    // チェック付き行のみ表示が有効の場合、表示を更新
    const showCheckedOnlyCheckbox = document.getElementById('shChkOnly');
    if (showCheckedOnlyCheckbox && showCheckedOnlyCheckbox.checked) {
        // 外部関数を呼び出し（循環依存を避けるため）
        if (window.showChk) {
            window.showChk(true);
        }
    }
}

// セットリスト表にcheckStateを反映
export function applyToSetlist() {
    // 全セットリストチェックボックスを一旦クリア
    document.querySelectorAll('.setlist-chk').forEach(chk => {
        chk.checked = false;
    });

    // checkStateの各IDについて、対応する全チェックボックスをチェック
    checkState.forEach(id => {
        const checkboxes = document.querySelectorAll(`.setlist-chk[data-id="${id}"]`);
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
    });
}

// 現在チェックされているIDを配列で取得
export function getCurrent() {
    const checkedIds = [];
    document.querySelectorAll('.chk:checked').forEach(chk => {
        checkedIds.push(Number(chk.dataset.id));
    });
    return checkedIds.sort((a, b) => a - b);
}


// checkStateを更新する関数（外部から呼び出し可能）
export function update(id, isChecked) {
    if (isChecked) {
        // チェックON: checkStateとcheckStateBUp両方に追加
        if (!checkState.includes(id)) {
            checkState.push(id);
            checkState.sort((a, b) => a - b);
            window.checkState = checkState;
        }
        if (!csBk) {
            csBk = [];
        }
        if (!csBk.includes(id)) {
            csBk.push(id);
            csBk.sort((a, b) => a - b);
        }
    } else {
        // チェックOFF: checkStateとcheckStateBUp両方から削除
        checkState = checkState.filter(checkId => checkId !== id);
        window.checkState = checkState;
        if (csBk) {
            csBk = csBk.filter(checkId => checkId !== id);
        }
    }
}

// 曲一覧チェックボックスの同期処理
export function syncChk() {
    document.addEventListener('change', function (e) {
        if (e.target.classList.contains('chk')) {
            const changedId = Number(e.target.dataset.id);
            update(changedId, e.target.checked);

            // チェック付き行のみ表示が有効の場合、表示を更新
            const showCheckedOnlyCheckbox = document.getElementById('shChkOnly');
            if (showCheckedOnlyCheckbox && showCheckedOnlyCheckbox.checked && window.showChk) {
                window.showChk(true);
            }

        }
    });
}

// セットリストチェックボックスの同期処理
export function syncSetlistChk() {
    document.addEventListener('change', function (e) {
        if (e.target.classList.contains('setlist-chk')) {
            const changedId = Number(e.target.dataset.id);

            update(changedId, e.target.checked);

            // 同じmIDの他のセットリストチェックボックスも同期
            const sameIdCheckboxes = document.querySelectorAll(`.setlist-chk[data-id="${changedId}"]`);
            sameIdCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });

            // 曲一覧タブのチェックボックスも同期
            applyToSongs();

        }
    });
}

// クリア機能
export function clear() {
    checkState = [];
    window.checkState = checkState;
    csBk = null;

    // サブスク無しチェックボックスも外す
    const subNoCheckbox = document.getElementById('chkSb');
    if (subNoCheckbox && subNoCheckbox.checked) {
        subNoCheckbox.checked = false;
    }

    applyToSongs();
    applyToSetlist();
}

// サブスク無し機能での特別なcheckState操作
export function setSubNo(idsToAdd, backupIds) {
    // サブスク無し曲を追加
    idsToAdd.forEach(id => {
        if (!checkState.includes(id)) {
            checkState.push(id);
        }
    });
    checkState.sort((a, b) => a - b);
    window.checkState = checkState;

    // バックアップを更新
    if (backupIds) {
        csBk = [...backupIds].sort((a, b) => a - b);
    }
}

export function restore() {
    if (csBk) {
        checkState = [...csBk];
        window.checkState = checkState;
    } else {
        checkState = [];
        window.checkState = checkState;
    }
}

// グローバル関数として公開
export function setGlobals() {
    window.clrCS = clear;
    window.applyCS = applyToSongs;
    window.applyCSSet = applyToSetlist;
    window.updCS = update;
    window.getCS = getCurrent;
    window.setCSsub = setSubNo;
    window.rstCS = restore;
}