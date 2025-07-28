document.addEventListener('DOMContentLoaded', function () {
  fetch('data/music-list.csv')
    .then(response => response.text())
    .then(csvText => {
      const parsed = Papa.parse(csvText, { header: true });
      const rows = parsed.data;
      const thead = document.querySelector('#music-table thead');
      const tbody = document.querySelector('#music-table tbody');

      // 表示するカラム名（列ヘッダー）
      const displayColumns = ['✔', '曲名', 'ダミー', '発売日', 'MV♪', 'LV', 'Spf', 'Apl', 'iTn', 'm/s', 'CD', '曲順'];

      // ヘッダー行
      const trHead = document.createElement('tr');
      displayColumns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        trHead.appendChild(th);
      });
      thead.innerHTML = '';
      thead.appendChild(trHead);

      // 本文行
      tbody.innerHTML = '';
      rows.forEach(row => {
        if (!row['曲名']) return;

        const makeLink = (label, url) =>
          url ? `<a href="${url}" target="_blank">${label}</a>` : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="checkbox" class="chk"></td>
          <td>${row['曲名'] || ''}</td>
          <td>${row['ダミー'] || ''}</td>
          <td>${row['発売日'] || ''}</td>
          <td>${makeLink(row['YT1'], row['YT1URL'])}</td>
          <td>${makeLink('LV', row['LV'])}</td>
          <td>${makeLink('Spf', row['Spf'])}</td>
          <td>${makeLink('Apl', row['Apl'])}</td>
          <td>${makeLink('iTn', row['iTn'])}</td>
          <td>${row['m/s'] || ''}</td>
          <td>${row['CD'] || ''}</td>
          <td>${row['曲順'] || ''}</td>
        `;
        tbody.appendChild(tr);
      });
    });
});