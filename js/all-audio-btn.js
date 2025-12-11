// グローバル管理用
let openAudioNumbers = [];

// モードのON/OFF処理
export async function handleAudioMode(isOn) {
    if (isOn) {
        btnAppear();
    } else {
        const result = await showAudioModeModal();
        if (result === "cancel") {
            document.getElementById("audioInfoMode").checked = true; // 再チェック
        } else if (result === "confirm") {
            btnDisappear();
        }
    }
}

// ▶ ボタン追加
function btnAppear() {
    console.log("btnAppear() called");

    // あとでここに「曲名の左に▶ボタン追加」の処理を書く！
    // 曲ごとのDOMにボタン追加（id=allAudioBtn, data-id=mID）
    // クリック時に all-audio.js を import → audioInfoOpen(mID)
}

// ▼ ボタン削除
function btnDisappear() {
    console.log("🔽 btnDisappear() called");

    // あとでここに「ボタン・表を消す」処理を書く！
}

// モーダル処理
function showAudioModeModal() {
    console.log("showAudioModeModal() called");
    const modal = document.getElementById("audioModeModal");
    return new Promise((resolve) => {
        if (!modal) return resolve("cancel"); // 安全対策

        modal.showModal?.();

        const cancelBtn = document.getElementById("modeOffCancel");
        const confirmBtn = document.getElementById("modeOffConfirm");

        cancelBtn.onclick = () => {
            modal.close?.();
            resolve("cancel");
        };

        confirmBtn.onclick = () => {
            modal.close?.();
            resolve("confirm");
        };
    });
}