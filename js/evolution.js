(() => {
  'use strict';
  const catalog = document.querySelector('[data-instrument-catalog]');
  if (catalog) {
    const controls = [...document.querySelectorAll('[data-instrument-filter]')];
    const groups = [...catalog.querySelectorAll('.precision-catalog-group')];
    const status = catalog.querySelector('.precision-filter-status');
    const select = (key, announce = false) => {
      if (key !== 'all' && !groups.some(group => group.id === key)) key = 'all';
      groups.forEach(group => { group.hidden = key !== 'all' && group.id !== key; });
      controls.forEach(link => key === link.dataset.instrumentFilter ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current'));
      if (announce) status.textContent = key === 'all' ? 'Showing all 15 instruments.' : `Showing ${catalog.querySelectorAll('.precision-catalog-group:not([hidden]) .precision-product-card').length} ${key.toLowerCase()}.`;
    };
    const fromHash = () => select(location.hash.slice(1) === 'all-instruments' ? 'all' : location.hash.slice(1));
    controls.forEach(link => link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      select(link.dataset.instrumentFilter, true);
      history.pushState(null, '', link.getAttribute('href'));
      catalog.scrollIntoView({block:'start', behavior:'instant'});
    }));
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('popstate', fromHash);
    fromHash();
  }

  const viewer = document.querySelector('.precision-image-dialog');
  if (viewer && typeof viewer.showModal === 'function') {
    let opener = null;
    const image = viewer.querySelector('.precision-viewer-canvas img');
    const selectors = [...viewer.querySelectorAll('[data-figure-src]')];
    const file = viewer.querySelector('[data-figure-file]');
    const selectImage = button => {
      image.src = button.dataset.figureSrc;
      image.alt = button.dataset.figureAlt;
      file.href = button.dataset.figureSrc;
      selectors.forEach(candidate => candidate.setAttribute('aria-pressed', String(candidate === button)));
    };
    document.querySelectorAll('[data-figure-open]').forEach(link => link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      selectImage(selectors[0]);
      viewer.showModal();
      document.body.classList.add('precision-viewer-open');
      viewer.querySelector('[data-figure-close]').focus();
    }));
    selectors.forEach(button => button.addEventListener('click', () => selectImage(button)));
    viewer.querySelector('[data-figure-close]').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => { if(event.target === viewer) { const r=viewer.getBoundingClientRect(); if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) viewer.close(); } });
    viewer.addEventListener('close', () => { document.body.classList.remove('precision-viewer-open'); opener?.focus(); });
  }

  const content = document.querySelector('[data-instrument-details]');
  if (content && document.querySelector('.precision-product-hero')) {
    const headings = [...content.children].filter(node => node.tagName === 'H2');
    if (headings.length > 3) {
      headings.forEach((heading, index) => {
        const details = document.createElement('details');
        details.className = 'precision-detail-section';
        details.open = index === 0 || /why it stands out/i.test(heading.textContent);
        const summary = document.createElement('summary');
        const body = document.createElement('div');
        body.className = 'precision-detail-body';
        heading.before(details);
        let node = heading.nextSibling;
        while(node && !(node.nodeType === 1 && node.tagName === 'H2')) {
          const next = node.nextSibling;
          body.append(node);
          node = next;
        }
        summary.append(heading);
        details.append(summary, body);
      });
      const revealHash = () => {
        let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
        if(!id) return;
        const target = document.getElementById(id);
        const details = target?.closest('.precision-detail-section');
        if(details) { details.open = true; requestAnimationFrame(() => target.scrollIntoView({block:'start'})); }
      };
      window.addEventListener('hashchange', revealHash);
      document.querySelectorAll('.precision-toc a[href^="#"]').forEach(link => link.addEventListener('click', () => setTimeout(revealHash, 0)));
      revealHash();
    }
  }
})();
