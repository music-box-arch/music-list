export async function loadSmDataIfNeeded() {
    if (!smData) {
        const response = await fetch('data/music-list-sm.json');
        smData = await response.json();
    }
    return smData;
}

export async function toggleSmDisplay(showStyle, showMix) {
    const data = await loadSmDataIfNeeded();
    const tbody = document.querySelector('#music-table tbody');

    // 既存のstyle/mix行を削除
    tbody.querySelectorAll('.sm-row').forEach(row => row.remove());
    if (!showStyle && !showMix) return;

    // 追加する行をフィルター
    const toAdd = Object.values(data).filter(song => {
        if (showStyle && song.smType.includes('style')) return true;
        if (showMix && song.smType.includes('mix')) return true;
        return false;
    }).sort((a, b) => a.mID - b.mID);

    // 各行を適切な位置に挿入
    toAdd.forEach(song => {
        const newRow = createSongRow(song);
        newRow.classList.add('sm-row');
        insertRowAtCorrectPosition(tbody, newRow, song.mID);
    });
}

function createSongRow(song) {
    const tr = document.createElement('tr');
    // mID 93の曲だけ12pxに設定
    const titleStyle = song.mID === 93 ? ' style="font-size: 12px;"' : '';
    // const smallFontMIDs = [93, 150, 200]; // 最終的に拡張することもできる
    //const titleStyle = smallFontMIDs.includes(song.mID) ? ' style="font-size: 12px;"' : '';
    tr.innerHTML = `
        <td><input type="checkbox" class="chk" data-id="${song.mID}"></td>
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

function insertRowAtCorrectPosition(tbody, newRow, mID) {
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
        const specialTitle = createSpecialTitle(songName);

        let truncatedSongName;
        if (specialTitle !== songName) {
            // 特別処理が適用された場合は切り詰めない
            truncatedSongName = specialTitle;
        } else {
            // 通常の曲名のみ画面幅に応じて切り詰め
            truncatedSongName = specialTitle.length > songNameMaxLength ?
                specialTitle.slice(0, songNameMaxLength) : specialTitle;
        }

        const row = [truncatedSongName];
        filteredDiscs.forEach(disc => {
            row.push(disc.tracks.includes(songID) ? '◯' : '');
        });
        return row;
    });

    return { headers, rows };
}

export function createSpecialTitle(title) {
    // 特別処理対象の曲（完全一致で判定）
    if (title === 'アナザーワールドエンド') {
        return 'アナザー…エンド';
    }
    if (title === 'アナザーワールド') {
        return 'アナザー…ルド';
    }
    if (title === 'プログラムcontinued (15th style)') {
        return 'プログラム…15th';
    }
    if (title === 'プログラムcontinued') {
        return 'プログラム…ed';
    }

    // style/mix処理
    if (title.includes('(') && (title.includes('style)') || title.includes('mix)'))) {
        const baseTitle = title.split('(')[0].trim();
        const styleMatch = title.match(/\((.+?)\)/);
        if (styleMatch) {
            const styleText = styleMatch[1];
            let shortStyle = '';

            if (styleText === 'B.C mix') shortStyle = '…BCmx';
            else if (styleText === 'B.C style') shortStyle = '…BCst';
            else if (styleText === 'D.A mix') shortStyle = '…DAmx';
            else if (styleText === 'D.A style') shortStyle = '…DAst';
            else if (styleText === 'S.B mix') shortStyle = '…SBmx';
            else if (styleText === 'S.B style') shortStyle = '…SBst';
            else if (styleText === 'party style') shortStyle = '…party';

            if (shortStyle) {
                const baseShort = baseTitle.length > 5 ? baseTitle.slice(0, 5) : baseTitle;
                return baseShort + shortStyle;
            }
        }
    }

    return title;
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
        cell.style.padding = '2px';
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