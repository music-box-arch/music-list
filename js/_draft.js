const featureEvents = [
    {
        selector: '.showDiscsButton',
        type: 'click',
        module: '',
        export: ''
    },
    {
        selector: '.clearAllChecksBtn',
        type: 'click',
        module: '',
        export: ''
    }
];

const tabEvents = [
    {
        selector: '.tab-btn[data-tab="songlist"]',
        type: 'click',
        module: '',
        export: ''
    },
    {
        selector: '.tab-btn[data-tab="setlist"]',
        type: 'click',
        module: '',
        export: '',
        wait: false
    }
];

const searchEvents = [
    {
        id: 'sngSrch',
        type: 'input',
        module: '',
        export: ''
    }
];

const filterEvents = [
    { id: 'chkSb', type: 'change', module: '', export: '' },
    { id: 'shStChk', type: 'change', module: '', export: '' },
    { id: 'shMxChk', type: 'change', module: '', export: '' },
    { id: 'shChkOnly', type: 'change', module: '', export: '' }
];

const audModeEvents = [
    {
        id: 'audioInfoMode',
        type: 'change',
        module: '',
        export: ''
    }
];

const eventDefs = [
    ...featureEvents,
    ...tabEvents,
    ...searchEvents,
    ...filterEvents,
    ...audModeEvents
];


// const eventDefs = [
//     // ===== 音源モード =====
//     {
//         id: 'audioInfoMode',
//         type: 'change',
//         module: '',
//         export: '',
//         wait: ''
//     },

//     // ===== 機能ボタン =====
//     {
//         selector: '.showDiscsButton',
//         type: 'click',
//         module: '',
//         export: '',
//         wait: ''
//     },
//     {
//         selector: '.clearAllChecksBtn',
//         type: 'click',
//         module: '',
//         export: '',
//         wait: ''
//     },

//     // ===== タブ切り替え =====
//     {
//         selector: '.tab-btn[data-tab="songlist"]',
//         type: 'click',
//         module: '',
//         export: '',
//         wait: ''
//     },
//     {
//         selector: '.tab-btn[data-tab="setlist"]',
//         type: 'click',
//         module: '',
//         export: '',
//         wait: ''
//     },

//     // ===== 絞り込みチェックボックス =====
//     {
//         id: 'chkSb',
//         type: 'change',
//         module: '',
//         export: '',
//         wait: ''
//     },
//     {
//         id: 'shStChk',
//         type: 'change',
//         module: '',
//         export: '',
//         wait: ''
//     },
//     {
//         id: 'shMxChk',
//         type: 'change',
//         module: '',
//         export: '',
//         wait: ''
//     },
//     {
//         id: 'shChkOnly',
//         type: 'change',
//         module: '',
//         export: '',
//         wait: ''
//     },

//     // ===== 検索窓 =====
//     {
//         id: 'sngSrch',
//         type: 'input',
//         module: '',
//         export: '',
//         wait: ''
//     }
// ];

document.addEventListener('DOMContentLoaded', async () => {
    initControls(eventDefs);
    // DOM表描画ロジック…
});

function initControls(defs) {
    bindEvents(defs);
}

function bindEvents(defs) {
    defs.forEach(def => {
        const el = document.getElementById(def.id);
        if (!el) return;
        el.addEventListener(def.type || 'click', createHandler(def));
    });
}

function createHandler(def) {
    return async (e) => {
        if (def.wait) {
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