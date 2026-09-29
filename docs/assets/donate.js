/**
 * 후원 — 버튼과 모달을 여기서 한 번만 만들어 모든 페이지에 붙인다.
 *
 * 예전에는 홈(하단 푸터, 간단한 안내)과 아카이브(서브바, 자세한 안내)가 서로
 * 다른 마크업·문구를 갖고 있었다. 문구를 고칠 때마다 갈라지므로 하나로 합친다.
 *
 * 버튼은 헤더의 다운로드 왼쪽에 놓는다. 별도로 [data-donate] 를 달아 둔 곳
 * (홈 푸터 등)도 같은 모달을 연다.
 * 스타일은 #dm 으로 좁혀서 넣는다 — 홈의 스폰서 모달(#sponModal)이 같은 .dm
 * 클래스를 쓰고 있어, 좁히지 않으면 그쪽 모양까지 바뀐다.
 *
 * 언어: 페이지마다 전환 방식이 다르다(홈·해방툴·소식은 data-ko/data-en, 문서·읽을거리·
 * 시작해보기는 html.en + .ko-only/.en-only). 둘 다 <html lang> 을 바꾸므로 여기서는
 * 그 속성만 보고 T 사전으로 글자를 채운다 — 전환되면 MutationObserver 가 다시 채운다.
 *
 * 후원 수단: 네이버·카카오페이 QR 은 한국 안에서만 된다. 한국 밖(외화)은 PayPal.me —
 * 영문 화면에서는 PayPal 을 먼저 보여 준다(#dm.en 에서 order 로 올린다).
 */
(function () {
  // 루트 기준 절대경로를 쓴다. 상대경로는 폴더 깊이를 세야 하는데, 깨끗한 주소
  // (/story = story.html)와 하위 폴더(/games/ /patches/)를 구분할 방법이 없다.
  var P = '/';
  // 후원 알림은 mailto 대신 문의 발송 경로(/api/contact 워커)로 보낸다.
  var TS_SITEKEY = '0x4AAAAAAEJ-dMWHvMfvuco0';   // Turnstile 공개 사이트키
  var PAYPAL = 'https://www.paypal.com/paypalme/1002429';

  // ── 문구 사전 ── (html 키는 innerHTML 로 넣는다)
  var HTML_KEYS = { code_p: 1 };
  var T = {
    ko: {
      btn: '♥ 후원', title: '후원하기 ♥', close: '닫기', dialog: '후원하기',
      desc: '보내 주신 후원금은 아래 세 가지에 쓰입니다.',
      use1b: '해방툴 및 해방 런처 개발',
      use1s: '해방툴의 기능 추가와 유지보수, HB런처 개발, 그리고 메타데이터를 계속 채워 나가는 데 씁니다.',
      use2b: '게임 아카이브 운영',
      use2s: '홈페이지 및 공개 프로그램, 9만여 개 게임의 자료를 담아 두고 전송하는 데 드는 데이터베이스·이미지 저장 운용 비용입니다.',
      use3b: '한글화 패치 토큰 지원',
      use3s: '대한글화시대의 번역 작업에 드는 AI 토큰 비용에 씁니다. 후원이 늘수록 더 많은 게임을 한글로 옮길 수 있습니다.',
      naver: 'Naver Pay', kakao: 'Kakao Pay',
      scan: '카메라 또는 페이 앱으로 QR을 스캔해 후원할 수 있어요. (네이버·카카오페이는 한국 안에서만 됩니다)',
      pp_title: '해외에서 후원하기 — PayPal',
      pp_desc: 'PayPal.me 는 한국 밖에서 외화로 보낼 때 쓸 수 있습니다. 한국에서는 위 QR(네이버·카카오페이)을 이용해 주세요.',
      pp_btn: 'PayPal 로 후원하기 ↗',
      code_title: '후원자 코드 안내',
      code_p: '후원해 주신 뒤 아래 폼으로 알려 주시면 <b>스폰서 코드</b>를 보내드립니다. ' +
        '이 코드로 해방툴 <b>프로그램 사전 다운로드</b> 및 <b>마이너 신규 베타 버전 다운로드</b>의 혜택을 제공하고 있습니다.',
      code_btn: '베타 다운로드로 이동 →',
      form_title: '✉ 후원 알리기 — 이메일을 남기시면 스폰서 코드를 보내드립니다',
      name_ph: '이름 (닉네임)', email_ph: '회신 받을 이메일',
      msg_ph: '남길 내용 (선택) — 후원 수단·시각, 궁금한 점 등',
      send: '보내기 ✉',
      need_fields: '이름과 이메일을 채워 주세요.', bad_email: '이메일 주소를 확인해 주세요.',
      need_captcha: '로봇이 아님을 확인해 주세요.', sending: '보내는 중…',
      sent: '전달했습니다! 확인 후 스폰서 코드를 이메일로 보내드릴게요. 감사합니다 ♥',
      fail: '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      noserver: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
      default_msg: '(내용 없음) 후원 알림입니다 — 스폰서 코드 부탁드립니다.'
    },
    en: {
      btn: '♥ Donate', title: 'Support ♥', close: 'Close', dialog: 'Support',
      desc: 'Your support goes to these three things.',
      use1b: 'HAE-BANG Tool & HB Launcher development',
      use1s: 'New features and maintenance for the Rom Tool, HB Launcher development, and keeping the metadata growing.',
      use2b: 'Running the Game Archive',
      use2s: 'Database and image storage running costs for the website and the public program, holding and serving data for 90,000+ games.',
      use3b: 'AI tokens for Korean patches',
      use3s: 'Covers the AI translation cost behind the Korean patch project — the more support, the more games get translated.',
      naver: 'Naver Pay', kakao: 'Kakao Pay',
      scan: 'Scan a QR code with your camera or pay app to donate. (Naver Pay and Kakao Pay work inside Korea only.)',
      pp_title: 'From outside Korea — PayPal',
      pp_desc: 'Naver Pay and Kakao Pay only work inside Korea. From anywhere else, PayPal.me accepts donations in foreign currency.',
      pp_btn: 'Donate with PayPal ↗',
      code_title: 'Sponsor code',
      code_p: 'After donating, let me know with the form below and I will send you a <b>sponsor code</b>. ' +
        'It unlocks <b>early program downloads</b> and <b>new minor beta builds</b> of HAE-BANG Tool.',
      code_btn: 'Go to beta download →',
      form_title: '✉ Tell me you donated — leave your email and I will send the sponsor code',
      name_ph: 'Name (nickname)', email_ph: 'Email for the reply',
      msg_ph: 'Message (optional) — payment method / time, questions…',
      send: 'Send ✉',
      need_fields: 'Please fill in your name and email.', bad_email: 'Please check the email address.',
      need_captcha: 'Please confirm you are not a robot.', sending: 'Sending…',
      sent: 'Sent! I will check and email your sponsor code. Thank you ♥',
      fail: 'Sending failed. Please try again shortly.',
      noserver: 'Could not reach the server. Please try again shortly.',
      default_msg: '(no message) Donation notice — sponsor code please.'
    }
  };
  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'ko'; }
  function t(k) { return (T[lang()] || T.ko)[k] || ''; }

  var CSS =
    // 다운로드가 주 버튼이라 후원은 한 단계 작게 둔다
    '.btn-donate{display:inline-flex; align-items:center; gap:5px; padding:6px 11px;' +
      'border-radius:9px; border:1px solid rgba(244,63,94,.45); color:#ffd7de;' +
      'font-family:inherit; font-size:12.5px; font-weight:700; cursor:pointer; white-space:nowrap;' +
      'background:linear-gradient(120deg,rgba(244,63,94,.22),rgba(244,63,94,.10)); transition:.18s}' +
    '.btn-donate:hover{border-color:#fb7185; color:#fff;' +
      'background:linear-gradient(120deg,rgba(244,63,94,.34),rgba(244,63,94,.18))}' +
    '';
  var MODAL_CSS =
    '#dm{position:fixed; inset:0; z-index:210; display:flex; align-items:center; justify-content:center;' +
      'padding:24px; background:rgba(4,5,10,.86); backdrop-filter:blur(6px);' +
      'opacity:0; pointer-events:none; transition:.2s}' +
    '#dm.open{opacity:1; pointer-events:auto}' +
    '#dm .dm-card{width:480px; max-width:94vw; max-height:92vh; overflow:auto;' +
      'background:var(--surface,#12141c); border:1px solid var(--border2,#2a2e3d); border-radius:16px;' +
      'padding:22px 24px 20px; box-shadow:0 30px 80px rgba(0,0,0,.6);' +
      'transform:translateY(10px); transition:.2s}' +
    '#dm.open .dm-card{transform:none}' +
    '#dm .dm-head{display:flex; align-items:center; justify-content:space-between; margin-bottom:12px}' +
    '#dm .dm-head h3{margin:0; font-size:18px; font-weight:800; color:var(--text,#e8ebf2)}' +
    '#dm .dm-x{background:none; border:0; color:var(--faint,#6b7280); font-size:26px; line-height:1;' +
      'cursor:pointer; transition:.15s; font-family:inherit}' +
    '#dm .dm-x:hover{color:var(--text,#e8ebf2)}' +
    '#dm .dm-desc{font-size:13.5px; line-height:1.6; color:var(--muted,#9aa1b6); margin:0 0 12px}' +
    '#dm .dm-use{list-style:none; margin:0 0 18px; padding:0; display:flex; flex-direction:column; gap:10px}' +
    '#dm .dm-use li{border:1px solid var(--border,#232734); border-radius:12px;' +
      'background:var(--surface2,#181b25); padding:11px 13px}' +
    '#dm .dm-use b{display:block; font-size:13.5px; color:var(--text,#e8ebf2); margin-bottom:3px}' +
    '#dm .dm-use span{display:block; font-size:12.5px; line-height:1.6; color:var(--muted,#9aa1b6)}' +
    // 결제 수단 묶음 — 영문 화면에서는 PayPal 이 위로 온다
    '#dm .dm-pay{display:flex; flex-direction:column}' +
    '#dm .dm-qr{display:flex; gap:14px; justify-content:center; margin:4px 0 2px}' +
    '#dm .dm-qr figure{margin:0; display:flex; flex-direction:column; align-items:center; gap:8px}' +
    '#dm .dm-qr img{width:100%; max-width:186px; height:auto; max-height:262px; object-fit:contain;' +
      'border-radius:10px; background:#fff; padding:6px}' +
    '#dm .dm-qr figcaption{font-size:12.5px; font-weight:700; color:var(--muted,#9aa1b6)}' +
    '#dm .dm-scan{font-size:12px; color:var(--faint,#6b7280); text-align:center; margin:14px 0 4px}' +
    '#dm .dm-pp{margin:14px 0 0; padding:13px 14px; border-radius:12px;' +
      'border:1px solid rgba(0,112,186,.45); background:rgba(0,112,186,.10)}' +
    '#dm .dm-pp > b{display:block; font-size:13px; color:#7cc4ff; margin-bottom:6px}' +
    '#dm .dm-pp p{margin:0 0 11px; font-size:12.5px; line-height:1.7; color:var(--muted,#9aa1b6)}' +
    '#dm .dm-pp .btn{display:inline-flex; align-items:center; padding:8px 14px; border-radius:10px;' +
      'border:0; color:#fff; font-size:13px; font-weight:800; background:#0070ba; transition:.15s}' +
    '#dm .dm-pp .btn:hover{background:#005ea6; transform:translateY(-1px)}' +
    '#dm.en .dm-pp{order:-1; margin:4px 0 16px}' +
    '#dm .dm-code{margin:16px 0 6px; padding:13px 14px; border-radius:12px;' +
      'border:1px solid rgba(34,211,238,.28); background:rgba(34,211,238,.07)}' +
    '#dm .dm-code > b{display:block; font-size:13px; color:var(--cyan,#22d3ee); margin-bottom:6px}' +
    '#dm .dm-code p{margin:0 0 11px; font-size:12.5px; line-height:1.7; color:var(--muted,#9aa1b6)}' +
    '#dm .dm-code p b{color:var(--text,#e8ebf2)}' +
    '#dm .dm-code .btn{display:inline-flex; align-items:center; padding:8px 14px; border-radius:10px;' +
      'border:1px solid var(--border2,#2a2e3d); color:var(--text,#e8ebf2); font-size:13px; font-weight:700}' +
    '#dm .dm-mail{display:block; text-align:center; font-size:14px; font-weight:700;' +
      'color:var(--cyan,#22d3ee); margin-top:12px}' +
    '#dm .dm-mail:hover{text-decoration:underline}' +
    // 후원 알리기 폼 (mailto 대체 — /api/contact 로 자동 발송)
    '#dm .dm-form{margin-top:16px; border-top:1px solid var(--border,#232734); padding-top:14px}' +
    '#dm .dm-form > b{display:block; font-size:13px; color:var(--text,#e8ebf2); margin-bottom:9px}' +
    '#dm .dm-row{display:grid; grid-template-columns:1fr 1fr; gap:8px}' +
    '@media (max-width:430px){ #dm .dm-row{grid-template-columns:1fr} }' +
    '#dm .dm-in{width:100%; font-family:inherit; font-size:13px; color:var(--text,#e8ebf2);' +
      'background:var(--bg2,#0a0c14); border:1px solid var(--border2,#2a2e3d); border-radius:9px;' +
      'padding:9px 11px; outline:none; margin-bottom:8px; box-sizing:border-box}' +
    '#dm .dm-in:focus{border-color:var(--cyan,#22d3ee)}' +
    '#dm textarea.dm-in{min-height:60px; resize:vertical}' +
    '#dm .dm-send{display:inline-flex; align-items:center; gap:6px; font-size:13.5px; font-weight:800;' +
      'color:#05070d; background:linear-gradient(120deg,#22d3ee,#6366f1); border:0; border-radius:10px;' +
      'padding:10px 16px; cursor:pointer; font-family:inherit}' +
    '#dm .dm-send[disabled]{opacity:.55; cursor:not-allowed}' +
    '#dm .dm-form-foot{display:flex; align-items:center; justify-content:space-between; gap:10px;' +
      'flex-wrap:wrap; margin-top:2px}' +
    '#dm .dm-status{font-size:12.5px; min-height:16px; margin:8px 0 0}' +
    '#dm .dm-status.ok{color:#6ee7b7}' +
    '#dm .dm-status.err{color:#fb7185}';
  CSS = CSS + MODAL_CSS +
    // 이 버튼이 늘면서 헤더가 좁은 화면에서 넘쳤다 — 여기서 같이 줄인다.
    // (페이지 쪽 CSS 에 두면 이 주입 CSS 가 뒤에 와서 덮어 버린다)
    // 다운로드는 접는다. .hide-s 규칙이 홈에만 있고 소식·가이드·읽을거리엔
    // 아예 없어서 페이지마다 달랐다 — 여기서 한 번에 맞춘다.
    '@media (max-width:560px){ .nav-right .btn-primary{display:none} }' +
    '@media (max-width:400px){' +
      '.brand .bs{display:none}' +
      '.nav{gap:8px}' +
      '.btn-donate{padding:5px 9px; font-size:12px}' +
    '}' +
    // 아주 작은 화면(320px 급)에서는 로고 글씨를 접고 아이콘만 남긴다
    '@media (max-width:350px){ .brand > span{display:none} }';

  // 글자는 비워 두고 applyT() 가 채운다(data-t = 사전 키, data-t-ph = placeholder 키)
  var HTML =
    '<div class="dm" id="dm" aria-hidden="true">' +
      '<div class="dm-card" role="dialog" aria-modal="true" data-t-aria="dialog">' +
        '<div class="dm-head">' +
          '<h3 data-t="title"></h3>' +
          '<button class="dm-x" id="dm-x" data-t-aria="close">&times;</button>' +
        '</div>' +
        '<p class="dm-desc" data-t="desc"></p>' +
        '<ul class="dm-use">' +
          '<li><b data-t="use1b"></b><span data-t="use1s"></span></li>' +
          '<li><b data-t="use2b"></b><span data-t="use2s"></span></li>' +
          '<li><b data-t="use3b"></b><span data-t="use3s"></span></li>' +
        '</ul>' +
        '<div class="dm-pay">' +
          '<div class="dm-qr">' +
            '<figure><img src="' + P + 'assets/donate_naver.png" alt="Naver Pay QR" loading="lazy" />' +
              '<figcaption data-t="naver"></figcaption></figure>' +
            '<figure><img src="' + P + 'assets/donate_kakao.png" alt="Kakao Pay QR" loading="lazy" />' +
              '<figcaption data-t="kakao"></figcaption></figure>' +
          '</div>' +
          '<p class="dm-scan" data-t="scan"></p>' +
          '<div class="dm-pp">' +
            '<b data-t="pp_title"></b>' +
            '<p data-t="pp_desc"></p>' +
            '<a class="btn" href="' + PAYPAL + '" target="_blank" rel="noopener" data-t="pp_btn"></a>' +
          '</div>' +
        '</div>' +
        '<div class="dm-code">' +
          '<b data-t="code_title"></b>' +
          '<p data-t="code_p"></p>' +
          '<a class="btn" href="' + P + 'haebang.html#download" data-t="code_btn"></a>' +
        '</div>' +
        '<form class="dm-form" id="dm-form" autocomplete="off" novalidate>' +
          '<b data-t="form_title"></b>' +
          '<div class="dm-row">' +
            '<input class="dm-in" id="dm-name" type="text" maxlength="100" data-t-ph="name_ph" />' +
            '<input class="dm-in" id="dm-email" type="email" maxlength="200" data-t-ph="email_ph" />' +
          '</div>' +
          '<textarea class="dm-in" id="dm-msg" maxlength="2000" data-t-ph="msg_ph"></textarea>' +
          '<input name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" ' +
            'style="position:absolute; left:-9999px; top:-9999px; width:1px; height:1px; opacity:0" />' +
          '<div class="dm-form-foot">' +
            '<div id="dm-ts"></div>' +
            '<button class="dm-send" id="dm-send" type="submit" data-t="send"></button>' +
          '</div>' +
          '<p class="dm-status" id="dm-status" role="status" aria-live="polite"></p>' +
        '</form>' +
      '</div>' +
    '</div>';

  var tsIds = {}, tsLoading = false, tsQueue = [];

  function init() {
    if (document.getElementById('dm')) return;

    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    // 헤더의 다운로드 왼쪽에 버튼을 놓는다.
    var right = document.querySelector('.nav-right');
    var hdrBtn = null;
    if (right && !right.querySelector('[data-donate]')) {
      hdrBtn = document.createElement('button');
      hdrBtn.className = 'btn-donate';
      hdrBtn.setAttribute('data-donate', '');
      hdrBtn.setAttribute('data-ko', T.ko.btn);      // 홈·소식의 언어 전환이 읽는다
      hdrBtn.setAttribute('data-en', T.en.btn);
      hdrBtn.textContent = t('btn');
      var dl = right.querySelector('.btn-primary');
      if (dl) right.insertBefore(hdrBtn, dl); else right.appendChild(hdrBtn);
    }

    document.body.insertAdjacentHTML('beforeend', HTML);
    var dm = document.getElementById('dm');

    // ── 언어에 맞춰 글자 채우기 — 처음 한 번 + <html lang> 이 바뀔 때마다 ──
    function applyT() {
      var L = lang();
      dm.classList.toggle('en', L === 'en');
      var els = dm.querySelectorAll('[data-t]');
      for (var i = 0; i < els.length; i++) {
        var k = els[i].getAttribute('data-t');
        if (HTML_KEYS[k]) els[i].innerHTML = t(k); else els[i].textContent = t(k);
      }
      var phs = dm.querySelectorAll('[data-t-ph]');
      for (var j = 0; j < phs.length; j++) phs[j].setAttribute('placeholder', t(phs[j].getAttribute('data-t-ph')));
      var ars = dm.querySelectorAll('[data-t-aria]');
      for (var m = 0; m < ars.length; m++) ars[m].setAttribute('aria-label', t(ars[m].getAttribute('data-t-aria')));
      if (hdrBtn) hdrBtn.textContent = t('btn');
    }
    applyT();
    if (window.MutationObserver) {
      new MutationObserver(applyT).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    // ── Turnstile — 모달을 처음 열 때만 로드/렌더한다 (모든 페이지에 미리 싣지 않기) ──
    // 창이 둘(후원 #dm · PRO #pm)이라 위젯 자리마다 id 를 따로 갖는다. 스크립트는 한 번만 싣고, 싣는 동안 온 자리는 모아 둔다
    function mountTs(sel) {
      sel = sel || '#dm-ts';
      if (tsIds[sel] !== undefined) return;
      if (window.turnstile) {
        try { tsIds[sel] = window.turnstile.render(sel, { sitekey: TS_SITEKEY, theme: 'dark' }); } catch (e) {}
        return;
      }
      if (tsQueue.indexOf(sel) < 0) tsQueue.push(sel);
      if (tsLoading) return;
      tsLoading = true;
      window.__dmTsReady = function () { tsLoading = false; var q = tsQueue.slice(); tsQueue = []; q.forEach(mountTs); };
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__dmTsReady&render=explicit';
      s.async = true;
      document.head.appendChild(s);
    }

    function open(on) {
      dm.classList.toggle('open', on);
      dm.setAttribute('aria-hidden', on ? 'false' : 'true');
      // 모달이 떠 있는 동안 뒤 목록이 같이 스크롤되지 않도록 잠근다.
      document.body.style.overflow = on ? 'hidden' : '';
      if (on) mountTs('#dm-ts');
    }

    // ── 후원 알리기 폼 — /api/contact 워커로 발송 (mailto 대체) ──
    var f = document.getElementById('dm-form');
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault();
      var stt = document.getElementById('dm-status');
      var btn = document.getElementById('dm-send');
      function say(m, c) { stt.textContent = m || ''; stt.className = 'dm-status' + (c ? ' ' + c : ''); }
      var name = document.getElementById('dm-name').value.trim();
      var email = document.getElementById('dm-email').value.trim();
      var msg = document.getElementById('dm-msg').value.trim() || t('default_msg');
      if (!name || !email) { say(t('need_fields'), 'err'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say(t('bad_email'), 'err'); return; }
      var tk = '';
      try { tk = (window.turnstile && tsIds['#dm-ts'] !== undefined) ? window.turnstile.getResponse(tsIds['#dm-ts']) : ''; } catch (err) {}
      if (!tk) { say(t('need_captcha'), 'err'); return; }
      btn.disabled = true;
      say(t('sending'));
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'donate', name: name, email: email, message: msg,
          turnstile: tk, website: f.website.value }),
      }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (d) {
        btn.disabled = false;
        if (d && d.ok) {
          say(t('sent'), 'ok');
          f.reset();
          try { window.turnstile.reset(tsIds['#dm-ts']); } catch (err) {}
        } else {
          say(t('fail'), 'err');
        }
      }).catch(function () {
        btn.disabled = false;
        say(t('noserver'), 'err');
      });
    });
    document.querySelectorAll('[data-donate]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); open(true); });
    });
    document.getElementById('dm-x').addEventListener('click', function () { open(false); });
    dm.addEventListener('click', function (e) { if (e.target === dm) open(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dm.classList.contains('open')) open(false);
    });


    // ── PRO 업그레이드 창(#pm) — 후원 창과 같은 모양·같은 결제 수단, 알리는 폼만 'PRO 업그레이드 요청' ──
    // [data-pro] 를 누르거나 ?pro=1 / #pro 로 들어오면 열린다(해방툴 앱의 PRO UPGRADE 창 → '하러 가기').
    var PT = {
      ko: {
        title: 'PRO 업그레이드 ✦', close: '닫기', dialog: 'PRO 업그레이드',
        desc: 'PRO 에디션은 해방툴을 오래 이어 갈 수 있게 힘을 보태 주시는 분들께 드리는 버전입니다. PRO 에서는 아래 기능을 더 쓰실 수 있어요.',
        f1b: '외부 기기로 전환',
        f1s: '안드로이드·리눅스 휴대용 기기에 직접 붙어, 그 기기의 게임 목록·메타·미디어를 해방툴에서 바로 고칩니다.',
        f2b: '게임 아카이브로 전환',
        f2s: '롬이 없어도 지원하는 모든 시스템의 게임 목록과 메타 정보·미디어를 해방툴 안에서 봅니다.',
        f3b: 'HB파일 · 계속 늘어나는 PRO 기능',
        f3s: '내 시스템 셋을 파일(.hbs)로 저장·불러오기. PRO 기능은 베타와 함께 계속 보완·추가됩니다.',
        how_title: 'PRO 업그레이드 방법',
        how_p: 'PRO 업그레이드는 <b>30,000원</b>(해외는 <b>US$23</b>) 후원으로 함께하실 수 있어요. 아래 QR(해외는 PayPal)로 보내 주신 뒤 폼으로 알려 주시면, ' +
          '확인하는 대로 <b>PRO 업그레이드 코드</b>와 함께 <b>후원 스폰서 코드</b>(사전·베타 다운로드)도 같이 보내드립니다.',
        note: '코드는 받으신 뒤 48시간 안에 해방툴의 [PRO UPGRADE] 창에 넣어 주세요. 코드 하나는 PC 한 대에 적용되고, 한번 PRO 가 되면 새 버전에서도 그대로 유지됩니다.',
        naver: 'Naver Pay', kakao: 'Kakao Pay',
        scan: '카메라 또는 페이 앱으로 QR을 스캔해 보내실 수 있어요. (네이버·카카오페이는 한국 안에서만 됩니다)',
        pp_title: '해외에서 — PayPal',
        pp_desc: '한국 밖에서는 PayPal 로 US$23 을 보내 주시면 됩니다(아래 단추를 누르면 금액이 채워져 있어요).',
        pp_btn: 'PayPal 로 US$23 보내기 ↗',
        form_title: '✉ PRO 업그레이드 요청 — 이메일을 남기시면 PRO 업그레이드 코드를 보내드립니다',
        name_ph: '이름 (닉네임)', email_ph: '코드를 받을 이메일',
        msg_ph: '남길 내용 (선택) — 보내신 분 이름·수단·시각 등',
        send: '요청하기 ✉',
        need_fields: '이름과 이메일을 채워 주세요.', bad_email: '이메일 주소를 확인해 주세요.',
        need_captcha: '로봇이 아님을 확인해 주세요.', sending: '보내는 중…',
        sent: '요청을 전달했습니다! 확인 후 PRO 업그레이드 코드와 스폰서 코드를 이메일로 보내드릴게요. 고맙습니다 ♥',
        fail: '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        noserver: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
        default_msg: '(내용 없음)',
        tag: '[PRO 업그레이드 요청]'
      },
      en: {
        title: 'PRO upgrade ✦', close: 'Close', dialog: 'PRO upgrade',
        desc: 'The PRO edition is for people who help keep HAE-BANG Tool going. PRO adds the features below.',
        f1b: 'Switch to device',
        f1s: 'Attach straight to an Android or Linux handheld and edit its game list, metadata and media from the Rom Tool.',
        f2b: 'Switch to game archive',
        f2s: 'Browse the game list, metadata and media of every supported system inside the Rom Tool - no ROMs needed.',
        f3b: 'HB file · more PRO features over time',
        f3s: 'Save and load your system sets as a file (.hbs). PRO features keep improving and growing with the beta.',
        how_title: 'How to upgrade',
        how_p: 'You can join PRO with a <b>US$23</b> (30,000 KRW in Korea) contribution. Send it with the QR codes below (PayPal from outside Korea) and let me know with the form - ' +
          'I will send your <b>PRO upgrade code</b> together with a <b>sponsor code</b> (early and beta downloads) once I have checked.',
        note: 'Enter the code in the Rom Tool\'s [PRO UPGRADE] window within 48 hours of receiving it. One code covers one PC, and PRO stays with later versions.',
        naver: 'Naver Pay', kakao: 'Kakao Pay',
        scan: 'Scan a QR code with your camera or pay app. (Naver Pay and Kakao Pay work inside Korea only.)',
        pp_title: 'From outside Korea — PayPal',
        pp_desc: 'From outside Korea, send US$23 with PayPal (the button below fills in the amount).',
        pp_btn: 'Send US$23 with PayPal ↗',
        form_title: '✉ Request PRO upgrade — leave your email and I will send the PRO upgrade code',
        name_ph: 'Name (nickname)', email_ph: 'Email for the code',
        msg_ph: 'Message (optional) — sender name, method, time…',
        send: 'Request ✉',
        need_fields: 'Please fill in your name and email.', bad_email: 'Please check the email address.',
        need_captcha: 'Please confirm you are not a robot.', sending: 'Sending…',
        sent: 'Request sent! I will check and email your PRO upgrade code and sponsor code. Thank you ♥',
        fail: 'Sending failed. Please try again shortly.',
        noserver: 'Could not reach the server. Please try again shortly.',
        default_msg: '(no message)',
        tag: '[PRO upgrade request]'
      }
    };
    var PT_HTML = { how_p: 1 };
    function tp(k) { return (PT[lang()] || PT.ko)[k] || ''; }

    var PM_HTML =
      '<div class="dm" id="pm" aria-hidden="true">' +
        '<div class="dm-card" role="dialog" aria-modal="true" data-pt-aria="dialog">' +
          '<div class="dm-head">' +
            '<h3 data-pt="title"></h3>' +
            '<button class="dm-x" id="pm-x" data-pt-aria="close">&times;</button>' +
          '</div>' +
          '<p class="dm-desc" data-pt="desc"></p>' +
          '<ul class="dm-use">' +
            '<li><b data-pt="f1b"></b><span data-pt="f1s"></span></li>' +
            '<li><b data-pt="f2b"></b><span data-pt="f2s"></span></li>' +
            '<li><b data-pt="f3b"></b><span data-pt="f3s"></span></li>' +
          '</ul>' +
          '<div class="dm-code">' +
            '<b data-pt="how_title"></b>' +
            '<p data-pt="how_p"></p>' +
            '<p class="pm-note" data-pt="note"></p>' +
          '</div>' +
          '<div class="dm-pay">' +
            '<div class="dm-qr">' +
              '<figure><img src="' + P + 'assets/donate_naver.png" alt="Naver Pay QR" loading="lazy" />' +
                '<figcaption data-pt="naver"></figcaption></figure>' +
              '<figure><img src="' + P + 'assets/donate_kakao.png" alt="Kakao Pay QR" loading="lazy" />' +
                '<figcaption data-pt="kakao"></figcaption></figure>' +
            '</div>' +
            '<p class="dm-scan" data-pt="scan"></p>' +
            '<div class="dm-pp">' +
              '<b data-pt="pp_title"></b>' +
              '<p data-pt="pp_desc"></p>' +
              '<a class="btn" href="' + PAYPAL + '/23USD" target="_blank" rel="noopener" data-pt="pp_btn"></a>' +
            '</div>' +
          '</div>' +
          '<form class="dm-form" id="pm-form" autocomplete="off" novalidate>' +
            '<b data-pt="form_title"></b>' +
            '<div class="dm-row">' +
              '<input class="dm-in" id="pm-name" type="text" maxlength="100" data-pt-ph="name_ph" />' +
              '<input class="dm-in" id="pm-email" type="email" maxlength="200" data-pt-ph="email_ph" />' +
            '</div>' +
            '<textarea class="dm-in" id="pm-msg" maxlength="2000" data-pt-ph="msg_ph"></textarea>' +
            '<input name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" ' +
              'style="position:absolute; left:-9999px; top:-9999px; width:1px; height:1px; opacity:0" />' +
            '<div class="dm-form-foot">' +
              '<div id="pm-ts"></div>' +
              '<button class="dm-send" id="pm-send" type="submit" data-pt="send"></button>' +
            '</div>' +
            '<p class="dm-status" id="pm-status" role="status" aria-live="polite"></p>' +
          '</form>' +
        '</div>' +
      '</div>';

    function initPro() {
      if (document.getElementById('pm')) return;
      // 후원 창의 모양(#dm …)을 그대로 #pm 에 — 두 창이 같은 모습으로 보인다
      var st = document.createElement('style');
      st.textContent = MODAL_CSS.replace(/#dm/g, '#pm') +
        '#pm .dm-code{margin:0 0 16px}' +
        '#pm .dm-code .pm-note{margin:0; font-size:12px; color:var(--faint,#6b7280)}' +
        '#pm .dm-use b{color:var(--gold,#fbbf24)}' +
        '#pm.en .dm-pp{order:-1; margin:4px 0 16px}';
      document.head.appendChild(st);
      document.body.insertAdjacentHTML('beforeend', PM_HTML);
      var pm = document.getElementById('pm');

      function applyPT() {
        pm.classList.toggle('en', lang() === 'en');
        var els = pm.querySelectorAll('[data-pt]');
        for (var i = 0; i < els.length; i++) {
          var k = els[i].getAttribute('data-pt');
          if (PT_HTML[k]) els[i].innerHTML = tp(k); else els[i].textContent = tp(k);
        }
        var phs = pm.querySelectorAll('[data-pt-ph]');
        for (var j = 0; j < phs.length; j++) phs[j].setAttribute('placeholder', tp(phs[j].getAttribute('data-pt-ph')));
        var ars = pm.querySelectorAll('[data-pt-aria]');
        for (var m = 0; m < ars.length; m++) ars[m].setAttribute('aria-label', tp(ars[m].getAttribute('data-pt-aria')));
      }
      applyPT();
      if (window.MutationObserver) {
        new MutationObserver(applyPT).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      }

      function openPro(on) {
        pm.classList.toggle('open', on);
        pm.setAttribute('aria-hidden', on ? 'false' : 'true');
        document.body.style.overflow = on ? 'hidden' : '';
        if (on) mountTs('#pm-ts');
      }

      var f = document.getElementById('pm-form');
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var stt = document.getElementById('pm-status');
        var btn = document.getElementById('pm-send');
        function say(m, c) { stt.textContent = m || ''; stt.className = 'dm-status' + (c ? ' ' + c : ''); }
        var name = document.getElementById('pm-name').value.trim();
        var email = document.getElementById('pm-email').value.trim();
        // 워커가 옛 판이어도(종류를 모름) 받은 메일에서 PRO 요청임을 알아보게 본문 맨 앞에 표시한다
        var msg = tp('tag') + ' ' + (document.getElementById('pm-msg').value.trim() || tp('default_msg'));
        if (!name || !email) { say(tp('need_fields'), 'err'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say(tp('bad_email'), 'err'); return; }
        var tk = '';
        try { tk = (window.turnstile && tsIds['#pm-ts'] !== undefined) ? window.turnstile.getResponse(tsIds['#pm-ts']) : ''; } catch (err) {}
        if (!tk) { say(tp('need_captcha'), 'err'); return; }
        btn.disabled = true;
        say(tp('sending'));
        fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'pro', name: name, email: email, message: msg,
            turnstile: tk, website: f.website.value }),
        }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (d) {
          btn.disabled = false;
          if (d && d.ok) {
            say(tp('sent'), 'ok');
            f.reset();
            try { window.turnstile.reset(tsIds['#pm-ts']); } catch (err) {}
          } else {
            say(tp('fail'), 'err');
          }
        }).catch(function () {
          btn.disabled = false;
          say(tp('noserver'), 'err');
        });
      });
      document.querySelectorAll('[data-pro]').forEach(function (b) {
        b.addEventListener('click', function (e) { e.preventDefault(); openPro(true); });
      });
      document.getElementById('pm-x').addEventListener('click', function () { openPro(false); });
      pm.addEventListener('click', function (e) { if (e.target === pm) openPro(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && pm.classList.contains('open')) openPro(false);
      });
      // 해방툴(앱)의 PRO UPGRADE 창 → 'PRO 업그레이드 하러 가기' 로 넘어온 경우 바로 연다
      if (/[?&]pro=1(?:&|$)/.test(location.search) || location.hash === '#pro') openPro(true);
    }
    initPro();

    // 해방툴(앱)의 후원 창에서 '홈페이지에서 후원 알리기'로 넘어온 경우 바로 열어 준다.
    // 앱은 로컬 WebView 라 Turnstile 위젯을 띄울 수 없어, 알리는 폼은 이쪽에서 받는다.
    if (/[?&]donate=1(?:&|$)/.test(location.search) || location.hash === '#donate') {
      open(true);
      // 후원 자체보다 '알리기'가 목적이라 폼이 보이는 자리까지 내려 준다.
      setTimeout(function () {
        var f = document.getElementById('dm-form');
        if (f && f.scrollIntoView) f.scrollIntoView({ block: 'center' });
      }, 60);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
