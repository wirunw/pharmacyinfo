/* ร้านยาในพื้นที่: แดชบอร์ดจากชุดข้อมูลเปิด "รายชื่อผู้รับอนุญาตขายยา" ของ อย.
   ข้อมูลอยู่ที่ data/licensees.json ซึ่ง GitHub Actions ดึงจาก API ของ catalog.fda.moph.go.th สัปดาห์ละครั้ง */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString('th-TH'); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // เครือร้านยา (จับจากชื่อร้าน)
  var CHAINS = [
    ['เอ็กซ์ต้า พลัส', /เอ็กซ์ต้า|เอ็กซ์ตร้า|exta/i],
    ['วัตสัน', /วัตสัน|watsons/i],
    ['บู๊ทส์', /บู๊ทส์|บูทส์|boots/i],
    ['ฟาร์แมกซ์', /ฟาร์แมกซ์|pharmax/i],
    ['เพียว', /\bpure\b|^(ร้าน(ขาย)?ยา\s*)?เพรียว\s*(\(|บิ๊กซี|สาขา)|^ร้านเพรียว|^ร้านยาเพียว/i],
    ['ฟาสซิโน', /ฟาสซิโน|fascino/i],
    ['ร้านยากรุงเทพ', /ร้านยากรุงเทพ|กรุงเทพดรัก/i],
    ['โลตัส', /^(ร้าน(ขาย)?ยา)?\s*โลตัส|lotus.?s? ?pharmacy/i],
    ['เซฟดรัก', /เซฟดรัก|save ?drug/i],
    ['เฮลท์อัพ', /เฮลท์อัพ|health ?up/i],
    ['ท็อปส์ แคร์', /ท็อปส์ ?แคร์|tops ?care/i]
  ];
  var TYPES = [['ขย1', 'ขย.1 ร้านยาแผนปัจจุบัน'], ['ขย2', 'ขย.2 ยาบรรจุเสร็จ'], ['ขย3', 'ขย.3 ยาสัตว์'], ['ขย4', 'ขย.4 ขายส่ง'], ['ขยบ', 'ขย.บ แผนโบราณ'], ['all', 'ทุกประเภท']];
  var D = null, ROWS = [], S = { type: 'ขย1', prov: '', amp: '', q: '', chain: '', limit: 50 }, loading = false;

  try { var sv = JSON.parse(store('px_state') || 'null'); if (sv) { S.type = sv.type || S.type; S.prov = sv.prov || ''; S.amp = sv.amp || ''; } } catch (e) {}
  if (!store('px_state')) S.prov = 'ปทุมธานี';

  function open() {
    if (D || loading) return;
    loading = true;
    fetch('data/licensees.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      D = d;
      ROWS = d.rows.map(function (r) {
        var c = ''; for (var i = 0; i < CHAINS.length; i++) if (CHAINS[i][1].test(r[2])) { c = CHAINS[i][0]; break; }
        return { type: r[0], lic: r[1], name: r[2], tam: r[3], amp: r[4], prov: r[5], act: r[6], chain: c };
      });
      var mod = (d.resources || []).map(function (x) { return x.modified; }).sort().pop() || d.modified;
      $('pxAsof').textContent = 'ข้อมูล อย. แก้ไขล่าสุด ' + thDate(mod) + ' · เว็บดึงข้อมูลล่าสุด ' + thDate(d.fetched) + ' · ' + fmt(ROWS.length) + ' ใบอนุญาต';
      setup(); render();
    }).catch(function () { $('pxAsof').textContent = 'โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้า'; loading = false; });
  }
  function thDate(iso) {
    if (!iso) return '–';
    var d = new Date(iso.length <= 17 ? iso.replace('Z', ':00Z') : iso);
    if (isNaN(d)) return iso.slice(0, 10);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function setup() {
    $('pxType').innerHTML = TYPES.map(function (t) { return '<button type="button" class="chip" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('');
    $('pxType').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; S.type = b.dataset.v; S.limit = 50; render(); });
    var provs = uniq(ROWS.map(function (r) { return r.prov; }));
    $('pxProv').innerHTML = '<option value="">ทั้งประเทศ</option>' + provs.map(function (p) { return '<option>' + esc(p) + '</option>'; }).join('');
    if (provs.indexOf(S.prov) < 0) S.prov = '';
    $('pxProv').value = S.prov;
    $('pxProv').addEventListener('change', function () { S.prov = this.value; S.amp = ''; S.chain = ''; S.limit = 50; render(); });
    $('pxAmp').addEventListener('change', function () { S.amp = this.value; S.chain = ''; S.limit = 50; render(); });
    $('pxQ').addEventListener('input', function () { S.q = this.value.trim().toLowerCase(); S.limit = 50; renderList(); });
    $('pxMore').addEventListener('click', function () { S.limit += 100; renderList(); });
    $('pxCsv').addEventListener('click', csv);
    $('pxBars').addEventListener('click', function (e) {
      var b = e.target.closest('.bar'); if (!b) return;
      if (!S.prov) { S.prov = b.dataset.k; $('pxProv').value = S.prov; S.amp = ''; }
      else if (!S.amp) { S.amp = b.dataset.k; }
      S.chain = ''; S.limit = 50; render();
    });
    $('pxChains').addEventListener('click', function (e) {
      var b = e.target.closest('.bar'); if (!b) return;
      S.chain = S.chain === b.dataset.k ? '' : b.dataset.k; S.limit = 50; render();
    });
  }
  function uniq(a) { var m = {}; a.forEach(function (x) { if (x) m[x] = 1; }); return Object.keys(m).sort(function (x, y) { return x.localeCompare(y, 'th'); }); }

  function base() {
    return ROWS.filter(function (r) {
      return (S.type === 'all' || r.type === S.type) && (!S.prov || r.prov === S.prov) && (!S.amp || r.amp === S.amp);
    });
  }

  function render() {
    store('px_state', JSON.stringify({ type: S.type, prov: S.prov, amp: S.amp }));
    [].forEach.call(document.querySelectorAll('#pxType .chip'), function (b) { b.classList.toggle('on', b.dataset.v === S.type); });
    var amps = S.prov ? uniq(ROWS.filter(function (r) { return r.prov === S.prov && (S.type === 'all' || r.type === S.type); }).map(function (r) { return r.amp; })) : [];
    $('pxAmp').disabled = !S.prov;
    $('pxAmp').innerHTML = '<option value="">' + (S.prov ? 'ทุกอำเภอ' : 'เลือกจังหวัดก่อน') + '</option>' + amps.map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('');
    if (amps.indexOf(S.amp) < 0) S.amp = '';
    $('pxAmp').value = S.amp;

    var rows = base(), area = S.amp ? (S.amp + ' ' + S.prov) : (S.prov || 'ทั้งประเทศ');
    var chainN = rows.filter(function (r) { return r.chain; }).length;
    var level = S.amp ? 'tam' : S.prov ? 'amp' : 'prov';
    var levelName = { prov: 'จังหวัด', amp: 'อำเภอ/เขต', tam: 'ตำบล/แขวง' }[level];
    var groups = {};
    rows.forEach(function (r) { var k = r[level] || 'ไม่ระบุ'; var g = groups[k] || (groups[k] = { n: 0, c: 0 }); g.n++; if (r.chain) g.c++; });
    var keys = Object.keys(groups).sort(function (a, b) { return groups[b].n - groups[a].n; });
    var chains = {}; rows.forEach(function (r) { if (r.chain) chains[r.chain] = (chains[r.chain] || 0) + 1; });
    var ck = Object.keys(chains).sort(function (a, b) { return chains[b] - chains[a]; });

    var kpi = [
      [fmt(rows.length), 'ใบอนุญาตใน' + area],
      [rows.length ? (100 * chainN / rows.length).toFixed(1) + '%' : '–', 'เป็นร้านยาเครือข่ายหลายสาขา (' + fmt(chainN) + ' ร้าน)'],
      [fmt(keys.length), levelName + 'ที่มีร้าน'],
      [ck.length ? esc(ck[0]) : '–', ck.length ? 'เครือที่มีสาขามากสุด (' + fmt(chains[ck[0]]) + ' สาขา)' : 'ไม่พบร้านเครือข่ายในพื้นที่']
    ];
    $('pxKpi').innerHTML = kpi.map(function (k) { return '<div class="card num"><b>' + k[0] + '</b><span>' + k[1] + '</span></div>'; }).join('');

    var top = keys.slice(0, 20), max = top.length ? groups[top[0]].n : 1;
    $('pxBarT').textContent = 'จำนวนร้านราย' + levelName + (keys.length > 20 ? ' (20 อันดับแรก)' : '');
    $('pxBars').innerHTML = top.map(function (k) {
      var g = groups[k], wi = 100 * (g.n - g.c) / max, wc = 100 * g.c / max;
      return '<button type="button" class="bar" data-k="' + esc(k) + '"' + (level === 'tam' ? ' disabled' : '') + ' title="' + (level === 'tam' ? '' : 'กดเพื่อดูราย' + (level === 'prov' ? 'อำเภอ' : 'ตำบล')) + '"><span class="nm">' + esc(k) + '</span><span class="tk"><i class="ind" style="width:' + wi + '%"></i><i class="chn" style="width:' + wc + '%"></i></span><b>' + fmt(g.n) + '</b></button>';
    }).join('') || '<p class="sub">ไม่มีข้อมูล</p>';

    var cmax = ck.length ? chains[ck[0]] : 1;
    $('pxChains').innerHTML = ck.map(function (k) {
      return '<button type="button" class="bar' + (S.chain === k ? ' on' : '') + '" data-k="' + esc(k) + '"><span class="nm">' + esc(k) + '</span><span class="tk"><i class="chn" style="width:' + (100 * chains[k] / cmax) + '%"></i></span><b>' + fmt(chains[k]) + '</b></button>';
    }).join('') || '<p class="sub">ไม่พบร้านเครือข่ายหลายสาขาในพื้นที่นี้</p>';
    renderList();
  }

  function listRows() {
    return base().filter(function (r) {
      if (S.chain && r.chain !== S.chain) return false;
      if (S.q && (r.name + ' ' + r.tam + ' ' + r.amp).toLowerCase().indexOf(S.q) < 0) return false;
      return true;
    }).sort(function (a, b) { return (a.amp + a.tam + a.name).localeCompare(b.amp + b.tam + b.name, 'th'); });
  }
  function renderList() {
    var rows = listRows(), show = rows.slice(0, S.limit);
    $('pxListT').textContent = 'รายชื่อร้าน' + (S.chain ? ' · ' + S.chain : '') + ' (' + fmt(rows.length) + ')';
    document.querySelector('#pxTbl tbody').innerHTML = show.map(function (r) {
      return '<tr><td>' + esc(r.name) + (r.chain ? '<span class="chain-tag">' + esc(r.chain) + '</span>' : '') + '</td><td>' + esc(r.tam) + '</td><td>' + esc(r.amp) + '</td><td>' + esc(r.prov) + '</td><td>' + esc(r.lic) + '</td></tr>';
    }).join('') || '<tr><td colspan="5">ไม่พบร้านที่ตรงเงื่อนไข</td></tr>';
    $('pxMore').hidden = rows.length <= S.limit;
    $('pxShown').textContent = 'แสดง ' + fmt(show.length) + ' จาก ' + fmt(rows.length) + ' ร้าน';
  }

  function csv() {
    var rows = listRows();
    var lines = [['ประเภท', 'เลขที่ใบอนุญาต', 'ชื่อสถานที่', 'ตำบล/แขวง', 'อำเภอ/เขต', 'จังหวัด', 'เครือร้าน', 'กิจกรรม']].concat(rows.map(function (r) { return [r.type, r.lic, r.name, r.tam, r.amp, r.prov, r.chain, r.act]; }));
    var text = '﻿' + lines.map(function (l) { return l.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'pharmacy_' + (S.prov || 'thailand') + (S.amp ? '_' + S.amp : '') + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  window.PX = { open: open };
  if ((location.hash || '').slice(1) === 'pharmacy') open();
})();
