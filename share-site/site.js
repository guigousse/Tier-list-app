// Text pages (assistance, confidentialité): the title is revealed word by word, then
// every block of the page fades in as it scrolls into view, one after the other.
(function () {
  var page = document.querySelector('.page');
  if (!page || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js');
  var h1 = page.querySelector('h1');
  if (h1) {
    var i = 0;
    h1.innerHTML = h1.textContent.split(/(\s+)/).map(function (part) {
      return /^\s*$/.test(part) ? part : '<span class="w" style="--wi:' + i++ + '">' + part + '</span>';
    }).join('');
  }
  // Blocks: direct children of the page, the questions of the FAQ and the rows of tables.
  var blocks = [];
  [].forEach.call(page.children, function (el) {
    if (el === h1) return;
    if (el.classList.contains('faq')) [].push.apply(blocks, el.children);
    else if (el.tagName === 'TABLE') [].push.apply(blocks, el.querySelectorAll('tr'));
    else blocks.push(el);
  });
  blocks.forEach(function (el) { el.classList.add('rise'); });
  var batch = 0, timer = null;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      // This block and any skipped above it (a jump to the bottom) come in, one after the other.
      blocks.slice(0, blocks.indexOf(e.target) + 1).forEach(function (el) {
        if (el.classList.contains('in')) return;
        io.unobserve(el);
        el.style.setProperty('--dl', 120 + Math.min(batch++, 8) * 90);
        el.classList.add('in');
      });
    });
    clearTimeout(timer);
    timer = setTimeout(function () { batch = 0; }, 200);
  }, { threshold: 0.12 });
  blocks.forEach(function (el) { io.observe(el); });
  if (h1) requestAnimationFrame(function () { h1.classList.add('in'); });
})();
