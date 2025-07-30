// 2-5. データ遅延読み込み関数
export async function loadDataIfNeeded() {
    if (!allDiscs || !musicMap) {
        const [discs, map] = await Promise.all([
            fetch('data/all-discs.json').then(res => res.json()),
            fetch('data/music-map.json').then(res => res.json())
        ]);
        allDiscs = discs;
        musicMap = map;
    }
    return { allDiscs, musicMap };
}

// 2-6. Result表構築ロジック
export function buildMatrix(songIDs, discs, musicMap) {
    // 含まれるCDだけ抽出
    const usedDiscs = discs.filter(disc => {
        if (!Array.isArray(disc.tracks) || disc.tracks.length === 0) {
            console.log('無効なCD:', disc['cd-name']);
            return false;
        }
        return disc.tracks.some(id => songIDs.includes(id));
    });

    // ◯の数でソート（多い順）
    usedDiscs.sort((a, b) => {
        const aCount = a.tracks.filter(id => songIDs.includes(id)).length;
        const bCount = b.tracks.filter(id => songIDs.includes(id)).length;
        return bCount - aCount;
    });

    // CDタイプフィルター適用
    const selectedType = document.querySelector('input[name="resultCdType"]:checked')?.value || 'both';
    const filteredDiscs = selectedType === 'both' ?
        usedDiscs :
        usedDiscs.filter(disc => disc['cd-type'] === selectedType);

    // 画面幅と列数に応じてヘッダー文字数を動的調整
    const getHeaderMaxLength = (columnCount) => {
        const screenWidth = window.innerWidth;
        const availableWidth = screenWidth - 100;
        const widthPerColumn = availableWidth / (columnCount + 1);

        if (widthPerColumn < 60) return 3;
        if (widthPerColumn < 80) return 4;
        if (widthPerColumn < 100) return 5;
        if (widthPerColumn < 120) return 6;
        if (widthPerColumn < 140) return 8;
        return 12;
    };

    const getSongNameMaxLength = (columnCount) => {
        const screenWidth = window.innerWidth;
        const availableWidth = screenWidth - 100;
        const widthPerColumn = availableWidth / (columnCount + 1);

        if (widthPerColumn < 60) return 5;
        if (widthPerColumn < 80) return 8;
        if (widthPerColumn < 100) return 12;
        if (widthPerColumn < 120) return 15;
        return 20;
    };

    const maxLength = getHeaderMaxLength(filteredDiscs.length);
    const songNameMaxLength = getSongNameMaxLength(filteredDiscs.length);

    const headers = ['曲名'].concat(
        filteredDiscs.map(d => d['cd-name'].length > maxLength ? d['cd-name'].slice(0, maxLength) : d['cd-name'])
    );

    // 行データ（曲順もCDの重要度順に並べ替え）
    const sortedSongIDs = [];
    const addedSongs = new Set();

    // CDの順番（◯が多い順）で曲を追加
    filteredDiscs.forEach(disc => {
        disc.tracks.forEach(trackId => {
            if (songIDs.includes(trackId) && !addedSongs.has(trackId)) {
                sortedSongIDs.push(trackId);
                addedSongs.add(trackId);
            }
        });
    });

    const rows = sortedSongIDs.map(songID => {
        const songName = musicMap[songID] || `ID:${songID}`;
        const truncatedSongName = songName.length > songNameMaxLength ?
            songName.slice(0, songNameMaxLength) : songName;
        const row = [truncatedSongName];
        filteredDiscs.forEach(disc => {
            row.push(disc.tracks.includes(songID) ? '◯' : '');
        });
        return row;
    });

    return { headers, rows };
}

// 2-7. HTMLテーブル生成
export function generateHTMLTable(headers, rows) {
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.marginTop = '1em';
    // 列数に応じてフォント調整
    const fontSize = headers.length > 6 ? '12px' : '14px';
    table.style.fontSize = fontSize;

    const makeCell = (tag, content) => {
        const cell = document.createElement(tag);
        cell.textContent = content;
        cell.style.border = '1px solid #ccc';
        cell.style.padding = '2px 4px';
        cell.style.textAlign = 'center';
        return cell;
    };

    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    headers.forEach(h => trHead.appendChild(makeCell('th', h)));
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => tr.appendChild(makeCell('td', cell)));
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
}

// 既存のexport関数の後に追加
export function setupCdTypeFilter() {
    document.addEventListener('change', async function (e) {
        if (e.target.name === 'resultCdType') {
            const checked = document.querySelectorAll('.chk:checked');
            const rawSongIDs = Array.from(checked).map(chk => Number(chk.dataset.id));
            const songIDs = [...new Set(rawSongIDs)];

            const { allDiscs, musicMap } = await loadDataIfNeeded();
            const { headers, rows } = buildMatrix(songIDs, allDiscs, musicMap);
            const table = generateHTMLTable(headers, rows);

            document.getElementById('discsTable').innerHTML = '';
            document.getElementById('discsTable').appendChild(table);
        }
    });
}