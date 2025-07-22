document.addEventListener('DOMContentLoaded', function() {
  fetch('data/music-list.csv')
    .then(response => response.text())
    .then(csvText => {
      // PapaParseでCSV→オブジェクト配列に変換
      const rows = Papa.parse(csvText, { header: true }).data;
      const tbody = document.querySelector('#music-table tbody');
      tbody.innerHTML = '';
      rows.forEach((row, idx) => {
        if (!row['曲名']) return; // 曲名が空欄の場合は飛ばす
        // 曲IDは曲名＋アーティストで仮に
        const id = (row['曲名'] + '_' + row['アーティスト']).replace(/\s+/g, '').toLowerCase();
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', id);
        tr.innerHTML = `
          <td><input type="checkbox" class="chk"></td>
          <td>${row['曲名']}</td>
          <td>${row['アーティスト']}</td>
          <td>${row['発売日']}</td>
        `;
        tbody.appendChild(tr);
      });
      // チェックリスト保存（LocalStorage）はあとで追加できるよ
    });
});