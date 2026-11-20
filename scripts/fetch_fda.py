"""Fetch Thai FDA drug-sale licensee datastore (CKAN) and write compact snapshot JSON for the dashboard.
Usage: python fetch_fda.py OUT_DIR"""
import json, sys, urllib.request, urllib.parse, datetime, os
B = 'https://catalog.fda.moph.go.th/api/3/action/'
PKG = 'drug-sale-licensee'
FIX = {'อยุธยา': 'พระนครศรีอยุธยา', 'กรุงเทพฯ': 'กรุงเทพมหานคร', 'กทม.': 'กรุงเทพมหานคร'}

def get(path, **q):
    u = B + path + '?' + urllib.parse.urlencode(q)
    with urllib.request.urlopen(u, timeout=120) as r:
        d = json.load(r)
    if not d.get('success'): raise RuntimeError(u)
    return d['result']

def pick(rec, *names):
    for n in names:
        if n in rec and rec[n] not in (None, ''): return str(rec[n]).strip()
    return ''

def main(out):
    pkg = get('package_show', id=PKG)
    rows, meta = [], []
    for r in pkg['resources']:
        if r.get('format', '').upper() != 'CSV' or not r.get('datastore_active'): continue
        off, n = 0, 0
        while True:
            d = get('datastore_search', resource_id=r['id'], limit=10000, offset=off)
            recs = d['records']
            for x in recs:
                t = pick(x, 'ประเภท')
                if pick(x, 'สถานะ') not in ('', 'คงอยู่'): continue
                prov = pick(x, 'จังหวัด')
                prov = FIX.get(prov, prov)
                rows.append([t, pick(x, 'เลขที่ใบอนุญาต'), pick(x, 'ชื่อสถานที่'),
                             pick(x, 'ตำบล/แขวง', 'แขวง'), pick(x, 'อำเภอ/เขต', 'เขต'), prov,
                             pick(x, 'กิจกรรม')])
            n += len(recs); off += len(recs)
            if not recs or off >= d['total']: break
        meta.append({'id': r['id'], 'name': r['name'], 'modified': r.get('last_modified') or r.get('metadata_modified'), 'rows': n})
    if len(rows) < 1000:
        raise SystemExit('too few rows (%d) — keep previous snapshot' % len(rows))
    os.makedirs(out, exist_ok=True)
    snap = {'source': 'https://catalog.fda.moph.go.th/dataset/' + PKG,
            'fetched': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
            'modified': pkg.get('metadata_modified'), 'resources': meta,
            'cols': ['type', 'license', 'name', 'tambon', 'amphoe', 'province', 'activity'],
            'rows': rows}
    with open(os.path.join(out, 'licensees.json'), 'w', encoding='utf-8') as f:
        json.dump(snap, f, ensure_ascii=False, separators=(',', ':'))
    print('rows', len(rows), meta)

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'data')
