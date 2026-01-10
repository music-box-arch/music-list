// 1. グローバル変数（最小限）
let lazy = false; // lazyload済フラグ
let slLazy = false; // sl.js読込済フラグ
let tblProg = false; // tbl作成中フラグ
let remains = []; // 残りの曲データ

export async function showDiscs() {
    // 1. cS記録にmain-lazy, checkstate.js読込
    if (!lazy) {
        await initLazy();
    }

    // 2. result.jsを動的読込しCD処理実行
    const { initCdFeats, loadData, buildMatrix } = await import('./result.js?v=${window.updVer}');
    const { allDiscs, musicMap } = await loadData();
    await buildMatrix(songIDs, allDiscs, musicMap);

    initCdFeats();

    if (window.cdBtn) {
        window.cdBtn();
    }
}

// 初回btn押時のlazyload
async function initLazy() {
    if (lazy) return;

    // 各モジュールから必要な機能をimport
    const { setupGlb } = await import('./main-lazy.js?v=${window.updVer}');
    const { initChkState, setGlobals, syncChk } = await import('./checkstate.js?v=${window.updVer}');

    // チェック状態管理を初期化
    await initChkState();

    // グローバル関数を設定
    setupGlb();

    // チェックボックス同期を設定（リアルタイム同期開始）
    syncChk();

    // グローバル関数を設定
    setGlobals();

    lazy = true;
}