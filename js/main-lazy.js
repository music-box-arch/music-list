// 各種機能ボタン用のlazy import処理
let subNoMap = null;
let smData = null;

// サブスク無しデータの読み込み
async function loadSubNo() {
    if (!subNoMap) {
        const response = await fetch('data/sub-no.json');
        subNoMap = await response.json();
    }
    return subNoMap;
}

// style/mixデータの読み込み
async function loadSm() {
    if (!smData) {
        const response = await fetch('data/music-list-sm.json');
        smData = await response.json();
    }
    return smData;
}

// サブスク無しフィルター処理（musiclist.jsから移植・統合）
export async function SubNoFn(isChecked) {
    if (isChecked) {
        // サブスク無し曲を追加
        await loadSubNo();

        const currentIds = window.getCS ? window.getCS() : [];
        const subNoData = await loadSubNo();
        const subNoIds = Object.keys(subNoData).map(id => Number(id));

        // cS操作用の関数を呼び出し
        if (window.setCSsub) {
            window.setCSsub(subNoIds, currentIds);
        }
    } else {
        // バックアップから復元
        if (window.rstCS) {
            window.rstCS();
        }
    }

    // 画面に反映とフィルター再適用
    if (window.applyActv) {
        window.applyActv();
    }

    // 検索中の場合は自動で検索をやり直し
    reapplySearch();
}

// 従来のhdlSubNoChkも保持（下位互換性のため）
async function hdlSubNoChk(showSubNoOnly) {
    return SubNoFn(showSubNoOnly);
}

// style/mix表示処理
async function toggleSm(showStyle, showMix) {
    const data = await loadSm();
    const tbody = document.querySelector('#musicTbl tbody');

    // 既存のstyle/mix行を削除
    tbody.querySelectorAll('.sm-row').forEach(row => row.remove());

    if (!showStyle && !showMix) {
        // style/mixを非表示にした場合も、cSを表示に反映
        if (window.aplCsCxt) {
            window.aplCsCxt('ml');
        }
        return;
    }

    // 追加する行をフィルター
    const toAdd = Object.values(data).filter(song => {
        if (showStyle && song.smType.includes('style')) return true;
        if (showMix && song.smType.includes('mix')) return true;
        return false;
    }).sort((a, b) => a.mID - b.mID);

    // 各行を適切な位置に挿入
    toAdd.forEach(song => {
        const newRow = createRow(song);
        newRow.classList.add('sm-row');
        insertRow(tbody, newRow, song.mID);
    });

    // cSを表示に反映
    if (window.aplCsCxt) {
        window.aplCsCxt('ml');
    }

    // 検索中の場合は自動で検索をやり直し
    reapplySearch();
}

// 新しい曲行を作成
function createRow(song) {
    const tr = document.createElement('tr');
    // mID 93の曲だけ12pxに設定
    const titleStyle = song.mID === 93 ? ' style="font-size: 12px;"' : '';
    tr.innerHTML = `
        <td><input type="checkbox" class="chk" data-context="ml" data-id="${song.mID}"></td>
        <td${titleStyle}>${song.title}</td>
        <td>${song.yt}</td>
        <td>${song.lv}</td>
        <td>${song.spf}</td>
        <td>${song.apl}</td>
        <td>${song.itn}</td>
        <td>${song.exsm || ''}</td>
        <td>${song.firstCd}</td>
        <td>${song.order || ''}</td>
        <td>${song.cdDate}</td>
    `;
    return tr;
}

// 適切な位置に行を挿入
function insertRow(tbody, newRow, mID) {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    for (let i = 0; i < rows.length; i++) {
        const currentMID = parseInt(rows[i].querySelector('.chk').dataset.id);
        if (currentMID > mID) {
            tbody.insertBefore(newRow, rows[i]);
            return;
        }
    }
    tbody.appendChild(newRow);
}

// チェック付き行のみ表示処理
async function hdlMlChkOnly(showCheckedOnly) {
    const tbody = document.querySelector('#musicTbl tbody');
    const allRows = tbody.querySelectorAll('tr');

    // 現在の検索語を取得
    const srchInp = document.getElementById('sngSrch');
    const searchTerm = srchInp ? srchInp.value.trim() : '';

    if (showCheckedOnly) {
        // チェック付き行のみ表示（検索フィルターも考慮）
        allRows.forEach(row => {
            const checkbox = row.querySelector('.chk');
            let shouldShow = checkbox && checkbox.checked;

            // 検索フィルターも適用
            if (shouldShow && searchTerm) {
                const titleCell = row.querySelector('td:nth-child(2)');
                if (titleCell) {
                    const titleText = titleCell.textContent.toLowerCase();
                    const srchLower = searchTerm.toLowerCase();
                    shouldShow = titleText.includes(srchLower);
                }
            }

            row.style.display = shouldShow ? '' : 'none';
        });
    } else {
        // 全行表示（検索フィルターは考慮）
        if (searchTerm) {
            reapplySearch();
        } else {
            allRows.forEach(row => {
                row.style.display = '';
            });
        }
    }
}

// 曲名検索機能
function enblSrch() {
    const srchInp = document.getElementById('sngSrch');
    if (!srchInp) return;

    // リアルタイム検索のイベントリスナー
    srchInp.addEventListener('input', function () {
        pfmSrch(this.value.trim());
    });

    // 検索機能有効化後、フォーカスを戻す
    srchInp.focus();
}

// 曲名検索実行
function pfmSrch(searchTerm) {
    const tbody = document.querySelector('#musicTbl tbody');
    const allRows = tbody.querySelectorAll('tr');

    if (!searchTerm) {
        // 検索語が空の場合、全行表示（ただし他のフィルターは考慮）
        allRows.forEach(row => {
            row.style.display = '';
        });

        // チェック付き行のみ表示が有効の場合は再適用
        const chkOnly = document.getElementById('shChkOnly');
        if (chkOnly && chkOnly.checked) {
            hdlMlChkOnly(true);
        }
        return;
    }

    // 大文字小文字を区別しない検索
    const srchLower = searchTerm.toLowerCase();

    allRows.forEach(row => {
        const titleCell = row.querySelector('td:nth-child(2)'); // 曲名は2番目のセル
        if (titleCell) {
            const titleText = titleCell.textContent.toLowerCase();
            const matchSrch = titleText.includes(srchLower);

            // 検索時は検索結果のみを表示（チェック状態は無視）
            row.style.display = matchSrch ? '' : 'none';
        }
    });

}

// 検索中の場合は自動で検索をやり直し
function reapplySearch() {
    const srchInp = document.getElementById('sngSrch');
    if (srchInp) {
        const curSearch = srchInp.value.trim();
        if (curSearch) {
            pfmSrch(curSearch);
        }
    }
}

// ハンドラー関数（main.jsから呼ばれる）
async function hdlStChk(isStyleChecked, isMixChecked) {
    await toggleSm(isStyleChecked, isMixChecked);
}

async function hdlMxChk(isStyleChecked, isMixChecked) {
    await toggleSm(isStyleChecked, isMixChecked);
}

// 表示フィルター系のチェックボックスを全てクリア（クリアボタン用）
export function clrDispFilt() {
    // 曲タブの「チェックをつけた行だけ表示」を外す
    const chkOnly = document.getElementById('shChkOnly');
    if (chkOnly && chkOnly.checked) {
        chkOnly.checked = false;
        hdlMlChkOnly(false);
    }

    // セトリタブの「チェックをつけた行だけ表示」を外す
    const slChkOnly = document.getElementById('slShChk');
    if (slChkOnly && slChkOnly.checked) {
        slChkOnly.checked = false;
        // セトリタブ用の処理を呼び出し（fest.jsのhandleCheckedOnly）
        if (window.slChk) {
            window.slChk(false);
        }
    }
}

// グローバル関数を公開
export function setupGlb() {
    // グローバルアクセス用
    window.subNo = SubNoFn;
    window.subChk = hdlSubNoChk;
    window.style = hdlStChk;
    window.mix = hdlMxChk;
    window.showChk = hdlMlChkOnly;
    window.enSrch = enblSrch;
    window.doSrch = pfmSrch;
    window.clrDispFilt = clrDispFilt;
}