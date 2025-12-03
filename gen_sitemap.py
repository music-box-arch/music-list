import os
import datetime
from pathlib import Path

BASE_URL = "https://music-list.com/"
OUTPUT_FILE = "sitemap.xml"
# 除外ファイル
exclude_files = {
    "update-temp.html",
    "articles/articletemp.html"
}

# 優先度の設定（拡張可能）
PRIORITY_MAP = {
    "index.html": "1.0",
    "about.html": "0.8",
    "articles.html": "0.7",
    "updates.html": "0.7",
    "privacy.html": "0.7"
}

def get_lastmod(path):
    mtime = os.path.getmtime(path)
    dt = datetime.datetime.fromtimestamp(mtime)
    return dt.strftime("%Y-%m-%dT%H:%M:%S+09:00")

def get_priority(filename):
    return PRIORITY_MAP.get(filename, "0.6")

def collect_html_files():
    html_files = []
    for path in Path(".").rglob("*.html"):
        if "sitemap.xml" in str(path):
            continue
        html_files.append(path)
    return html_files

def generate_sitemap():
    files = collect_html_files()
    urls = []
    for f in files:
        rel_path = f.as_posix()
        
        # 除外ファイルチェックを追加！
        if any(rel_path.endswith(excl) for excl in exclude_files):
            continue

        # index.html → /
        if rel_path == "index.html":
            url = BASE_URL  # 例: "https://music-list.com/"
        else:
            url = BASE_URL + rel_path

        lastmod = get_lastmod(f)
        priority = get_priority(f.name)
        urls.append(f"""
        <url>
        <loc>{url}</loc>
        <priority>{priority}</priority>
        <lastmod>{lastmod}</lastmod>
        </url>""")

    sitemap = f"""<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    {''.join(urls)}
    </urlset>
    """

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(sitemap)
    print("sitemap.xml を生成しました！")

if __name__ == "__main__":
    generate_sitemap()