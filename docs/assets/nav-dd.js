/* 상단 메뉴의 묶음(드롭다운) — 마우스는 올리면 열리고(CSS), 터치 · 키보드는 단추를 눌러 연다.
   바깥을 누르거나 Esc 를 누르면 닫는다. 모든 페이지가 같이 쓴다(assets/nav-dd.css 와 짝). */
(function () {
  var groups = document.querySelectorAll('.nav-links .nav-dd');
  if (!groups.length) return;
  function setOpen(g, on) {
    g.classList.toggle('open', on);
    var b = g.querySelector('.nav-dd-btn');
    if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  function closeAll(except) {
    groups.forEach(function (g) { if (g !== except) setOpen(g, false); });
  }
  groups.forEach(function (g) {
    var b = g.querySelector('.nav-dd-btn');
    if (!b) return;
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var on = !g.classList.contains('open');
      closeAll(g);
      setOpen(g, on);
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.nav-dd')) closeAll(null);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll(null);
  });
})();
