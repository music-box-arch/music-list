// グローバル管理用
// モードON直前の表のUIのチェック状態
let audModeBkup = null;

//　音源情報を表示させている曲のmID
let openAudioNumbers = [];

// モードのON/OFF処理
export async function handleAudioMode(isOn) {
    const audioChk = document.getElementById('audioInfoMode');

    if (isOn) {
        // main.jsの関数。lazyloadがまだならloadされ、cSが保存される
        await window.initLazy();

        // 音源モード専用UI状態をバックアップ
        bkAudSt();

        // 表示状態を強制調整（セトリ→曲一覧、style/mix OFF）
        forceDisp();

        // UIを無効化
        disUI();

        // ▶ ボタン描写＋イベント付与
        btnAppear();

    } else {
        const shouldTurnOff = confirm(
            '「全ライブ音源情報モード」をオフにすると、表示中の情報がすべて閉じられます。このモードを終了してもよろしいですか？\n（このウィンドウ操作がうまく動かない場合は画面を再読み込みしてください。）'
        );

        if (shouldTurnOff) {
            rstAudSt();   // 状態を戻す
            enaUI();      // UIを戻す
            btnDisappear();
        } else {
            // チェックを戻す（ONのまま）
            if (audioChk) audioChk.checked = true;
        }
    }
}

// モードON直前の表のUIのチェック状態を保存する
function bkAudSt() {
    audModeBkup = {
        chkSb: document.getElementById('chkSb')?.checked ?? false,
        shStChk: document.getElementById('shStChk')?.checked ?? false,
        shMxChk: document.getElementById('shMxChk')?.checked ?? false,
        shChkOnly: document.getElementById('shChkOnly')?.checked ?? false,
    };

    console.log('[audioMode] backup saved:', audModeBkup);
}

// 表示状態を強制調整（セトリ→曲一覧、style/mix OFF）
function forceDisp() {
    // 曲一覧タブを強制表示
    const songTabBtn = document.querySelector(
        '.tab-btn[data-tab="songlist"]'
    );

    if (songTabBtn && !songTabBtn.classList.contains('active')) {
        songTabBtn.click();
    }

    // style(再録音) 表示 → OFF
    const shSt = document.getElementById('shStChk');
    if (shSt && shSt.checked) {
        shSt.checked = false;
        shSt.dispatchEvent(new Event('change'));
    }

    // mix(リミックス) 表示 → OFF
    const shMx = document.getElementById('shMxChk');
    if (shMx && shMx.checked) {
        shMx.checked = false;
        shMx.dispatchEvent(new Event('change'));
    }
}

// UIを無効化
function disUI() {
    // ===== 見た目：auf 配下をグレーアウト =====
    document.querySelectorAll('.auf').forEach(el => {
        el.style.opacity = '0.5';
    });

    // ===== 意味が強いUI（ID指定）=====
    const disableIds = [
        'chkSb',        // サブスク無しにチェック（冷凍）
        'shChkOnly',    // チェック付き行のみ表示（冷凍）
        'sngSrch'       // 曲名検索（value保持）
    ];

    disableIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = true;
            el.style.cursor = 'not-allowed';
        }
    });

    // ===== 構造的・複数存在するUI（セレクタ指定）=====
    const disableSelectors = [
        '.clearAllChecksBtn',                 // チェックをオールクリア
        '.showDiscsButton',                   // チェックした曲を含むCDを見る（上下）
        '.tab-btn[data-tab="setlist"]',       // セトリタブ
        '#musicTbl .chk',                     // 曲チェックボックス群
        '#shStChk',                           // style(再録音)
        '#shMxChk'                            // mix(リミックス)
    ];

    disableSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.disabled = true;
            el.style.cursor = 'not-allowed';
        });
    });

    const setlistTab = document.querySelector('.tab-btn[data-tab="setlist"]');
    if (setlistTab) {
        setlistTab.style.setProperty('color', '#999');
        setlistTab.style.setProperty('background', '#eee');
    }

    console.log('[audioMode] UI disabled');
}

// ▶ ボタン追加、クリックイベントでall-audio.jsを読み込んでaudioInfoOpen(mID)、result.js関係のチェックボックスなどの操作をオフに
function btnAppear() {
    console.log("btnAppear() called");

    const checkboxes = document.querySelectorAll('input.chk[data-id]');
    console.log("checkboxes found:", checkboxes.length);

    checkboxes.forEach((chk, idx) => {
        const mID = chk.dataset.id;
        const row = chk.closest('tr');
        const titleCell = chk.parentElement?.nextElementSibling;

        if (!row || !titleCell) {
            console.warn(`row or titleCell missing for idx=${idx}`);
            return;
        }

        if (titleCell.querySelector('.audio-toggle')) {
            // すでにボタンがある場合はスキップ
            return;
        }

        const a = document.createElement('a');
        a.className = 'audio-toggle';
        a.dataset.id = mID;
        a.textContent = '▶';
        a.href = 'javascript:void(0)';
        a.style.marginRight = '4px';
        a.style.fontSize = '1em';
        a.style.textDecoration = 'none';

        titleCell.insertBefore(a, titleCell.firstChild);
        titleCell.style.paddingLeft = '1em';

        a.addEventListener('click', async () => {
            const mIDNum = Number(mID);

            const { audioInfoOpen, audioInfoClose } =
                await import('./all-audio.js');

            const idx = openAudioNumbers.indexOf(mIDNum);

            if (idx === -1) {
                // ===== 開く =====
                audioInfoOpen(mIDNum);
                openAudioNumbers.push(mIDNum);
                console.log('[audioMode] opened:', mIDNum, 'now open:', openAudioNumbers);
                a.textContent = '▼';
            } else {
                // ===== 閉じる =====
                audioInfoClose(mIDNum);
                openAudioNumbers.splice(idx, 1);
                console.log('[audioMode] closed:', mIDNum, 'now open:', openAudioNumbers);
                a.textContent = '▶';
            }
        });
    });

}

// ▼ ボタン削除、表示中のライブ情報をすべて閉じる（audioInfoClose()）
function btnDisappear() {
    console.log("btnDisappear() called");

    // あとでここに「ボタン・表を消す」処理を書く！
}