document.addEventListener('DOMContentLoaded', function () {
  fetch('data/music-list.csv')
    .then(response => response.text())
    .then(csvText => {
      const parsed = Papa.parse(csvText, { header: true });
      const rows = parsed.data;
      const fields = parsed.meta.fields;
      const thead = document.querySelector('#music-table thead');
      const tbody = document.querySelector('#music-table tbody');
      //  欲しいカラムをここで指定
      const displayColumns = ['✔', '曲名', '種別', '発売日', '円盤タイトル'];
      // ヘッダー行を動的に生成
      const trHead = document.createElement('tr');
      displayColumns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        trHead.appendChild(th);
      });
      thead.innerHTML = '';
      thead.appendChild(trHead);
      // 本文行を生成
      tbody.innerHTML = '';
      rows.forEach((row, idx) => {
        if (!row['曲名']) return;
        const id = (row['曲ID'] + '_' + row['曲名']).replace(/\s+/g, '').toLowerCase();
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', id);
        tr.innerHTML = `
          <td><input type="checkbox" class="chk"></td>
          <td>${row['曲名']}</td>
          <td>${row['種別']}</td>
          <td>${row['発売日']}</td>
          <td>${row['円盤タイトル']}</td>
        `;
        tbody.appendChild(tr);
      });
    });
});
