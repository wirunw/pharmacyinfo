(function () {
  'use strict';
  var H = window.HUB;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var byId = {}; H.sources.forEach(function (s) { byId[s.id] = s; });
  var ST = { ok: 'ยืนยันแล้ว', sec: 'ยืนยันจากแหล่งรอง', chk: 'ควรเปิดทดสอบก่อนใช้' };
  var ICONS = {
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    pin: '<path d="M12 21s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    box: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    ear: '<path d="M6 9a6 6 0 1 1 12 0c0 3-2 4-3 6s-1 4-3 4-3-1-3-3"/>',
    scale: '<path d="M12 3v18M5 7h14M5 7l-3 7h6zM19 7l-3 7h6z"/>'
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || '') + '</svg>'; }
  [].forEach.call(document.querySelectorAll('[data-asof]'), function (e) { e.textContent = H.asOf; });

  // ---------- routing ----------
  var views = ['home', 'sources', 'tools', 'lab', 'notes'];
  function route() {
    var h = (location.hash || '#home').slice(1);
    var v = views.indexOf(h) >= 0 ? h : 'home';
    views.forEach(function (x) { $('v-' + x).hidden = x !== v; });
    [].forEach.call(document.querySelectorAll('.tabs a'), function (a) { a.classList.toggle('on', a.dataset.tab === v); });
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // ---------- home ----------
  $('coreList').innerHTML = H.sources.filter(function (s) { return s.core; }).map(function (s) {
    return '<a class="card core" href="' + esc(s.url) + '" target="_blank" rel="noopener"><span class="ico">' + icon(H.categories[s.cat].icon) + '</span><b>' + esc(s.name) + '</b><small>' + esc(s.use) + '</small><span class="go">เปิดเว็บไซต์ ↗</span></a>';
  }).join('');
  $('numbers').innerHTML = H.numbers.map(function (n) {
    return '<div class="card num"><b>' + esc(n.n) + (n.unit ? '<i>' + esc(n.unit) + '</i>' : '') + '</b><span>' + esc(n.label) + '</span><small>ที่มา: ' + esc(n.src) + '</small></div>';
  }).join('');

  // ---------- sources ----------
  var F = { cat: 'all', ch: 'all', q: '' };
  function chipRow(el, items, key, cls) {
    el.innerHTML = items.map(function (it) { return '<button type="button" class="chip ' + cls + '" data-v="' + it[0] + '">' + esc(it[1]) + '</button>'; }).join('');
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      F[key] = b.dataset.v; renderSources();
    });
  }
  chipRow($('catChips'), [['all', 'ทุกหมวด']].concat(Object.keys(H.categories).map(function (k) { return [k, H.categories[k].name]; })), 'cat', 'cat');
  chipRow($('chChips'), [['all', 'ทุกบท']].concat(Object.keys(H.chapters).map(function (k) { return [k, H.chapters[k]]; })), 'ch', 'ch');
  $('q').addEventListener('input', function () { F.q = this.value.trim().toLowerCase(); renderSources(); });

  function card(s) {
    var how = s.how ? '<ol>' + s.how.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '';
    var tags = (s.ch || []).map(function (c) { return '<span class="tag">' + esc(H.chapters[c]) + '</span>'; }).join(' ');
    return '<article class="card src" id="src-' + s.id + '"><div class="hd"><div><h3>' + esc(s.name) + '</h3><div class="own">' + esc(s.owner) + ' · ' + esc(H.categories[s.cat].name) + '</div></div><span class="st ' + s.status + '">' + ST[s.status] + '</span></div>' +
      '<p>' + esc(s.what) + '</p><div class="use"><b>ใช้ในห้อง</b> ' + esc(s.use) + '</div>' + how +
      (s.caveat ? '<div class="cav">ข้อควรระวัง: ' + esc(s.caveat) + '</div>' : '') +
      '<div class="ft"><a class="btn" href="' + esc(s.url) + '" target="_blank" rel="noopener">เปิด ↗</a><button type="button" class="copy" data-url="' + esc(s.url) + '">คัดลอกลิงก์</button><span class="tag">' + esc(s.access || '') + '</span>' + tags + '</div></article>';
  }
  function renderSources() {
    [].forEach.call(document.querySelectorAll('#catChips .chip'), function (b) { b.classList.toggle('on', b.dataset.v === F.cat); });
    [].forEach.call(document.querySelectorAll('#chChips .chip'), function (b) { b.classList.toggle('on', b.dataset.v === F.ch); });
    var list = H.sources.filter(function (s) {
      if (F.cat !== 'all' && s.cat !== F.cat) return false;
      if (F.ch !== 'all' && (s.ch || []).indexOf(F.ch) < 0) return false;
      if (F.q) { var t = (s.name + ' ' + s.owner + ' ' + s.what + ' ' + s.use).toLowerCase(); if (t.indexOf(F.q) < 0) return false; }
      return true;
    });
    $('srcCount').textContent = 'พบ ' + list.length + ' แหล่ง';
    $('srcCards').innerHTML = list.map(card).join('') || '<p class="sub">ไม่พบแหล่งข้อมูลที่ตรงกับเงื่อนไข</p>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.copy'); if (!b) return;
    var u = b.dataset.url, done = function () { b.textContent = 'คัดลอกแล้ว'; setTimeout(function () { b.textContent = 'คัดลอกลิงก์'; }, 1500); };
    try { navigator.clipboard.writeText(u).then(done, function () { window.prompt('คัดลอกลิงก์นี้', u); }); } catch (err) { window.prompt('คัดลอกลิงก์นี้', u); }
  });
  renderSources();

  // ---------- HDC builder ----------
  var sel = $('hdcSel');
  var prov = H.hdc.slice(1).sort(function (a, b) { return a.name.localeCompare(b.name, 'th'); });
  sel.innerHTML = '<option value="center">ระดับประเทศ (center)</option><optgroup label="77 จังหวัด">' +
    prov.map(function (p) { return '<option value="' + p.code + '">' + esc(p.name) + ' (' + p.code + ')' + (p.status === 'ok' ? ' ✓' : '') + '</option>'; }).join('') + '</optgroup>';
  sel.value = 'pte';
  function hdc() {
    var typed = $('hdcCode').value.trim();
    var byName = typed && H.hdc.filter(function (x) { return x.name.indexOf(typed) >= 0; })[0];
    var code = byName ? byName.code : (typed.toLowerCase() || sel.value).replace(/[^a-z]/g, '');
    var url = 'https://hdc.moph.go.th/' + code + '/public/main';
    $('hdcGo').href = url; $('hdcUrl').textContent = url;
    var p = H.hdc.filter(function (x) { return x.code === code; })[0];
    $('hdcNote').textContent = p ? (p.note || (p.status === 'ok' ? 'พบการใช้ URL นี้จริง' : p.status === 'sec' ? 'พบจากเว็บ สสจ. แต่ยังไม่ได้เปิดยืนยัน ลองเปิดก่อนสอน' : 'รหัสตามอักษรย่อมาตรฐานของจังหวัด ยังไม่ได้เปิดทดสอบ ลองเปิดก่อนสอน')) : 'รหัสที่พิมพ์เอง ถ้าเปิดไม่ขึ้น ลองตรวจรหัสจังหวัดอีกครั้ง';
  }
  sel.addEventListener('change', function () { $('hdcCode').value = ''; hdc(); });
  $('hdcCode').addEventListener('input', hdc);
  hdc();

  // ---------- Google Trends ----------
  var presets = [
    ['ช่องทางรับยา', 'ร้านขายยาใกล้ฉัน, ส่งยาถึงบ้าน, เภสัชกรออนไลน์'],
    ['โรคเรื้อรัง', 'เบาหวาน, ความดันสูง, ไขมันในเลือดสูง'],
    ['ความงามกับสุขภาพ', 'วิตามินซี, คอลลาเจน, กันแดด'],
    ['เครือร้านยา', 'ฟาสซิโน, บู๊ทส์, วัตสัน'],
    ['ฤดูกาลโรค', 'ไข้หวัดใหญ่, ไข้เลือดออก, ภูมิแพ้']
  ];
  $('trPresets').innerHTML = presets.map(function (p, i) { return '<button type="button" class="chip" data-i="' + i + '">' + esc(p[0]) + '</button>'; }).join('');
  $('trPresets').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; $('trTerms').value = presets[+b.dataset.i][1]; trends(); });
  function trends() {
    var terms = $('trTerms').value.split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 5);
    $('trGo').href = 'https://trends.google.com/trends/explore?geo=TH&date=' + encodeURIComponent($('trTime').value) + '&q=' + terms.map(encodeURIComponent).join(',') + '&hl=th';
  }
  $('trTerms').addEventListener('input', trends); $('trTime').addEventListener('change', trends); trends();

  // ---------- calculator ----------
  var CF = ['cArea', 'cPop', 'cOld', 'cDm', 'cHt', 'cRx', 'cNh'];
  var saved = {}; try { saved = JSON.parse(store('pih_calc') || '{}'); } catch (e) {}
  CF.forEach(function (id) { if (saved[id] != null) $(id).value = saved[id]; $(id).addEventListener('input', calc); });
  function n(id) { var v = parseFloat($(id).value); return isFinite(v) && v >= 0 ? v : null; }
  function fmt(v, d) { return v == null ? '–' : v.toLocaleString('th-TH', { maximumFractionDigits: d || 0 }); }
  function calc() {
    var o = {}; CF.forEach(function (id) { o[id] = $(id).value; }); store('pih_calc', JSON.stringify(o));
    var pop = n('cPop'), old = n('cOld'), dm = n('cDm'), ht = n('cHt'), rx = n('cRx'), nh = n('cNh');
    var oldPct = pop && old != null ? 100 * old / pop : null;
    var ncd = (dm || 0) + (ht || 0);
    var perRx = rx ? ncd / rx : null;
    var popRx = rx && pop ? pop / rx : null;
    var nhPct = rx && nh != null ? 100 * nh / rx : null;
    var area = $('cArea').value.trim() || 'พื้นที่นี้';
    var cards = [
      [fmt(oldPct, 1) + (oldPct == null ? '' : '%'), 'สัดส่วนผู้สูงอายุ 60+', oldPct != null && oldPct >= 20 ? 'สังคมสูงวัยสมบูรณ์ (≥ 20%)' : 'เทียบเกณฑ์สังคมสูงวัย 20%'],
      [fmt(popRx), 'ประชากรต่อร้านยา 1 ร้าน', 'ยิ่งสูง คู่แข่งยิ่งน้อยเมื่อเทียบกับคน'],
      [fmt(perRx), 'ผู้ป่วยเบาหวาน+ความดัน ต่อร้านยา 1 ร้าน', 'ค่าประมาณสูงสุด ผู้ป่วยอาจซ้อนกัน'],
      [fmt(nhPct, 1) + (nhPct == null ? '' : '%'), 'ร้านยาที่เป็นหน่วยบริการ สปสช.', 'ต่ำ = ยังมีช่องว่างบริการบัตรทอง']
    ];
    $('calcOut').innerHTML = cards.map(function (c) { return '<div class="card num"><b>' + c[0] + '</b><span>' + esc(c[1]) + '</span><small>' + esc(c[2]) + '</small></div>'; }).join('');
    $('calcOut').setAttribute('aria-label', 'ผลของ ' + area);
  }
  calc();

  // ---------- telepharmacy ----------
  var TF = 'all';
  $('teleChips').innerHTML = [['all', 'ทั้งหมด'], ['open', 'เปิดให้ร้านอิสระ'], ['1', 'ฉบับที่ 1'], ['2', 'ฉบับที่ 2'], ['3', 'ฉบับที่ 3']].map(function (x) { return '<button type="button" class="chip" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('');
  $('teleChips').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; TF = b.dataset.v; tele(); });
  function tele() {
    [].forEach.call(document.querySelectorAll('#teleChips .chip'), function (b) { b.classList.toggle('on', b.dataset.v === TF); });
    var rows = H.telepharmacy.filter(function (t) { return TF === 'all' || (TF === 'open' ? t.open : String(t.list) === TF); });
    document.querySelector('#teleTbl tbody').innerHTML = rows.map(function (t) {
      return '<tr><td' + (t.open ? ' class="open"' : '') + '><b>' + esc(t.name) + '</b></td><td>' + esc(t.by) + '</td><td>' + esc(t.fit) + '</td><td>' + t.list + '</td></tr>';
    }).join('');
  }
  tele();

  // ---------- software ----------
  document.querySelector('#softTbl tbody').innerHTML = H.software.map(function (s) {
    return '<tr><td><a href="' + esc(s.url) + '" target="_blank" rel="noopener"><b>' + esc(s.name) + '</b></a>' + (s.status === 'sec' ? ' <span class="st sec">ควรตรวจ</span>' : '') + '</td><td>' + esc(s.type) + '</td><td>' + esc(s.feat) + '</td><td>' + esc(s.price) + '</td><td>' + esc(s.fit) + '</td></tr>';
  }).join('');

  // ---------- lab ----------
  $('labList').innerHTML = H.exercises.map(function (x, i) {
    var steps = x.steps.map(function (st, k) {
      var s = st[1] && byId[st[1]];
      var last = k === x.steps.length - 1;
      return (k ? '<div class="arr" aria-hidden="true">→</div>' : '') + '<div class="node' + (last ? ' out' : '') + '"><span class="k">' + (k + 1) + '</span><b>' + esc(st[0]) + '</b>' +
        (s ? '<small><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + ' ↗</a></small>' : (st[0].indexOf('เครื่องคิดเลข') >= 0 ? '<small><a href="#tools">เปิดเครื่องคิดเลขทำเล</a></small>' : (st[0].indexOf('Telepharmacy') >= 0 && k === 0 ? '<small><a href="#tools">ดูตาราง 15 โปรแกรม</a></small>' : ''))) + '</div>';
    }).join('');
    return '<article class="ex"><div class="hd"><span class="n">' + (i + 1) + '</span><h2>' + esc(x.t) + '</h2><div class="meta"><span class="tag">' + esc(H.chapters[x.ch]) + '</span><span class="tag">' + x.min + ' นาที</span></div></div><p class="goal">เป้าหมาย: ' + esc(x.goal) + '</p><div class="flow">' + steps + '</div></article>';
  }).join('');

  route();
})();
