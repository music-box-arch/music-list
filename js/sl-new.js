// sl-new.js
// func-new.js
const { addVer } = window.MLAPP;
// addVer を使って main-new.js を import
const { state, mTbl, chkStates, readJson, mkRow, logMapKeys } = await import(addVer('./main-new.js'));
const { startSync } = await import(addVer('./func-new.js'));
// ローカル短縮
const { cs, csBk } = chkStates;

export async function dispSl() {
    console.log('=== dispSlのはじまり ===');
    if (!state.isSyncing) { startSync(); };

    const slJson =await readJson('data/sl.json');

}