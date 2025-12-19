import json
from pathlib import Path

# ===== パス設定 =====
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MUSIC_LIST_PATH = DATA_DIR / "music-list.json"
ALL_AUDIO_DIR = DATA_DIR / "all-live-audio"

# ===== 準備 =====
ALL_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# ===== music-list.json を読み込む =====
with MUSIC_LIST_PATH.open("r", encoding="utf-8") as f:
    music_list = json.load(f)

created = []
skipped = []

# ===== mID ごとに確認 =====
for key, song in music_list.items():
    mID = song.get("mID")
    if mID is None:
        continue

    json_path = ALL_AUDIO_DIR / f"{mID}.json"

    if json_path.exists():
        skipped.append(mID)
        continue

    # ===== 空配列の JSON を作成 =====
    with json_path.open("w", encoding="utf-8") as f:
        json.dump([], f, ensure_ascii=False, indent=2)

    created.append(mID)

# ===== 結果表示 =====
print("=== gen_nullaudiojson.py result ===")
print(f"created : {len(created)} files")
print(f"skipped : {len(skipped)} files")

if created:
    print("created mID:", ", ".join(map(str, created)))