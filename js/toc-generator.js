// 目次自動生成スクリプト
document.addEventListener('DOMContentLoaded', function () {
    generateTableOfContents();
});

function generateTableOfContents() {
    const tocList = document.getElementById('toc-list');
    const tocNav = document.getElementById('toc-nav');

    if (!tocList || !tocNav) return;

    // h2見出しを取得（記事タイトル）
    const headings = document.querySelectorAll('.content h2');

    if (headings.length === 0) {
        // 見出しがない場合は目次を非表示
        tocNav.style.display = 'none';
        return;
    }

    // 目次を生成
    headings.forEach((heading, index) => {
        // 見出しにIDを付与（なければ）
        if (!heading.id) {
            heading.id = `heading-${index + 1}`;
        }

        // 目次項目を作成
        const li = document.createElement('li');
        const a = document.createElement('a');

        a.href = `#${heading.id}`;
        a.textContent = heading.textContent;
        a.className = 'toc-link';

        li.appendChild(a);
        tocList.appendChild(li);
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

// ページ内リンクのハイライト（オプション）
function highlightCurrentSection() {
    const headings = document.querySelectorAll('.content h2');
    const tocLinks = document.querySelectorAll('.toc-link');

    window.addEventListener('scroll', function () {
        let current = '';

        headings.forEach(heading => {
            const rect = heading.getBoundingClientRect();
            if (rect.top <= 100) {
                current = heading.id;
            }
        });

        tocLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// ハイライト機能を有効化（お好みで）
// highlightCurrentSection();