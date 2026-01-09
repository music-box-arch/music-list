const featEvents = [
    { selector: '.showDiscsButton', module: '', export: '' },
    { selector: '.clearAllChecksBtn', module: '', export: '' }
];
const tabEvents = [
    { selector: '.tab-btn[data-tab="songlist"]', module: '', export: '' },
    { selector: '.tab-btn[data-tab="setlist"]', module: '', export: '', wait: false }
];
const searchEvents = [{ id: 'sngSrch', module: '', export: '' }];
const filterEvents = [
    { id: 'chkSb', module: '', export: '' },
    { id: 'shStChk', module: '', export: '' },
    { id: 'shMxChk', module: '', export: '' },
    { id: 'shChkOnly', module: '', export: '' }
];
const audModeEvents = [{ id: 'audioInfoMode', module: '', export: '' }];

const eventDefs = [...featEvents, ...tabEvents, ...searchEvents, ...filterEvents, ...audModeEvents];

document.addEventListener('DOMContentLoaded', async () => {
    initControls(eventDefs);
    // DOM表描画ロジック…
});

function initControls(defs) {
    setType([featEvents, tabEvents], 'click');
    setType(searchEvents, 'input');
    setType([filterEvents, audModeEvents], 'change');

    bindEvents(defs);
}

function setType(targets, type) {
    const lists = Array.isArray(targets[0]) ? targets : [targets];
    lists.forEach(list => {
        list.forEach(item => {
            item.type = type;
        });
    });
}
function bindEvents(defs) {
    defs.forEach(def => {
        const elements = def.selector
            ? document.querySelectorAll(def.selector)
            : def.id
                ? [document.getElementById(def.id)]
                : [];

        elements.forEach(el => {
            if (!el) return;
            el.addEventListener(def.type, createHandler(def));
        });
    });
}

function createHandler(def) {
    return async (e) => {
        if (def.wait !== false) {
            await waitMTblReady();
        }
        if (!def.module || !def.export) return;
        const mod = await import(def.module);
        const fn = mod[def.export];
        if (typeof fn === 'function') {
            await fn(e);
        }
    };
}

async function waitMTblReady() {
    while (!mTblReady) {
        await new Promise(resolve => setTimeout(resolve, 30));
    }
}
// checkはflagでもいいのかも
async function waitReady(check, interval = 30) {
    while (!check()) {
        await new Promise(r => setTimeout(r, interval));
    }
}

// const eventDefs = [
//     // ===== 音源モード =====
//     {
//         id: 'audioInfoMode',
//         module: '',
//         export: '',
//         wait: ''
//     },

//     // ===== 機能ボタン =====
//     {
//         selector: '.showDiscsButton',
//         module: '',
//         export: '',
//         wait: ''
//     },
//     {
//         selector: '.clearAllChecksBtn',
//         module: '',
//         export: '',
//         wait: ''
//     },

//     // ===== タブ切り替え =====
//     {
//         selector: '.tab-btn[data-tab="songlist"]',

//         module: '',
//         export: '',
//         wait: ''
//     },
//     {
//         selector: '.tab-btn[data-tab="setlist"]',

//         module: '',
//         export: '',
//         wait: ''
//     },

//     // ===== 絞り込みチェックボックス =====
//     {
//         id: 'chkSb',
//         module: '',
//         export: '',
//         wait: ''
//     },
//     {
//         id: 'shStChk',
//         module: '',
//         export: '',
//         wait: ''
//     },
//     {
//         id: 'shMxChk',
//         
//         module: '',
//         export: '',
//         wait: ''
//     },
//     {
//         id: 'shChkOnly',
//         module: '',
//         export: '',
//         wait: ''
//     },

//     // ===== 検索窓 =====
//     {
//         id: 'sngSrch',
//         module: '',
//         export: '',
//         wait: ''
//     }
// ];
