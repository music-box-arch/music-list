// 目次自動生成スクリプト
document.addEventListener('DOMContentLoaded', function () {
    generateTableOfContents();
});

function generateTableOfContents() {
    const tocList = document.getElementById('toc-list');
    const tocNav = document.getElementById('toc-nav');

    if (!tocList || !tocNav) return;

    // h2, h3 見出しを順番通り取得
    const headings = document.querySelectorAll('.content h2, .content h3');

    if (headings.length === 0) {
        tocNav.style.display = 'none';
        return;
    }

    let currentH2Li = null;
    let h2Index = 0;
    let h3Index = 0;

    headings.forEach((heading) => {
        // 見出しにIDを付与（なければ）
        if (!heading.id) {
            if (heading.tagName === 'H2') {
                h2Index++;
                h3Index = 0;
                heading.id = `heading-${h2Index}`;
            } else {
                h3Index++;
                heading.id = `heading-${h2Index}-${h3Index}`;
            }
        }

        const li = document.createElement('li');
        const a = document.createElement('a');

        a.href = `#${heading.id}`;
        a.textContent = heading.textContent;
        a.className = 'toc-link';

        li.appendChild(a);

        if (heading.tagName === 'H2') {
            // h2はそのまま追加
            tocList.appendChild(li);
            currentH2Li = li;
        } else if (heading.tagName === 'H3' && currentH2Li) {
            // h3は直前のh2配下に入れる
            let subList = currentH2Li.querySelector('ul');
            if (!subList) {
                subList = document.createElement('ul');
                currentH2Li.appendChild(subList);
            }
            subList.appendChild(li);
        }
    });

    // スムーススクロール
    document.querySelectorAll('.toc-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetEl = document.getElementById(targetId);

            if (targetEl) {
                targetEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}