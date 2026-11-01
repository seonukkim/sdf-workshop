"""Build the TrustMyChef prototype dataset from the public info.seonukkim.com catalog.

Inputs : catalog.json (info.seonukkim.com/api/catalog), gourmet_notes.json
Outputs: <out>/data/places.json, <out>/img/p/*.webp (photos), walking routes per scenario
"""
import json, math, os, re, sys, time, urllib.request

CAT, NOTES, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
cat = json.load(open(CAT))
notes = json.load(open(NOTES))
places = {p['id']: p for p in cat['places']}
perks = {}
for k in cat.get('perks', []):
    perks.setdefault(k.get('place'), []).append(k)

UA = 'TrustMyChef-prototype-build/1.0 (UNIST class project; seonukkima)'

SCENARIOS = [
    {'id': 'guyeong', 'target': 'menmochi-guyeong', 'waitMin': 50,
     'label': {'ko': '구영리', 'en': 'Guyeong-ri'},
     'spot': {'ko': '구영리 멘모찌 앞', 'en': 'Outside Menmochi, Guyeong-ri'}},
    {'id': 'samsan', 'target': 'akira', 'waitMin': 60,
     'label': {'ko': '삼산동', 'en': 'Samsan-dong'},
     'spot': {'ko': '삼산동 아키라 앞', 'en': 'Outside Akira, Samsan-dong'}},
]
EXCLUDE = {
    # delivery-first franchise chicken, retail, clubs, campus cafeterias
    'bhc-guyeong', 'nene-guyeong', 'goobne-guyeong', 'jadam-guyeong', 'puradak-guyeong',
    'wine-gotgan-guyeong', 'shift66', 'house-club-daldong', 'bbq-cheonsang', 'kyochon-cheonsang',
}
KINDS = {'food', 'chicken', 'drinks'}
MAX_WALK_MIN = 13

CURATORS = {
    'gourmet': {'name': {'ko': 'Gourmet', 'en': 'Gourmet'},
                'role': {'ko': '직접 다녀온 맛집 기록', 'en': 'Personal archive of places visited'},
                'kind': 'person'},
    'meomeok': {'name': {'ko': 'JGW 푸드 아카이브', 'en': 'JGW Food Archive'},
                'role': {'ko': '머먹 · 개인 미식 아카이브', 'en': 'Meomeok · personal food archive'},
                'kind': 'person'},
    'essentials': {'name': {'ko': 'Korea Essentials', 'en': 'Korea Essentials'},
                   'role': {'ko': '외국인 생활 필수 지도 목록', 'en': 'Map list for newcomers to Korea'},
                   'kind': 'list'},
    'ulsanonline': {'name': {'ko': 'Ulsan Online', 'en': 'Ulsan Online'},
                    'role': {'ko': '외국인 커뮤니티 추천 목록', 'en': 'Expat community directory'},
                    'kind': 'list'},
    'jjeop': {'name': {'ko': '지도 등록 정보', 'en': 'Map listing'},
              'role': {'ko': '추천인 없음 · 카카오맵 등록 정보', 'en': 'No named recommender · KakaoMap listing'},
              'kind': 'listing'},
    'kakao': {'name': {'ko': '지도 등록 정보', 'en': 'Map listing'},
              'role': {'ko': '추천인 없음 · 카카오맵 등록 정보', 'en': 'No named recommender · KakaoMap listing'},
              'kind': 'listing'},
    'naver': {'name': {'ko': '지도 등록 정보', 'en': 'Map listing'},
              'role': {'ko': '추천인 없음 · 네이버 지도 등록 정보', 'en': 'No named recommender · Naver Map listing'},
              'kind': 'listing'},
}

# Rough price tier by cuisine tag; shown in the UI as an estimate only.
TIER3 = ('장어', '소고기', '한우', '복어', '회', '오리', '와인', '스테이크')
TIER1 = ('분식', '김밥', '국수', '칼국수', '돈카츠', '돈까스', '햄버거', '라멘', '우동', '카레', '짜장', '덮밥',
         '떡볶이', '만두', '국밥', '츠케멘', '텐동')

def hav(a, b):
    R = 6371000
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    x = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))

def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return data if binary else data.decode('utf-8')

def route(a, b):
    url = ('https://routing.openstreetmap.de/routed-foot/route/v1/driving/'
           f'{a[1]},{a[0]};{b[1]},{b[0]}?overview=full&geometries=geojson')
    d = json.loads(fetch(url))
    r = d['routes'][0]
    coords = [[round(c[1], 6), round(c[0], 6)] for c in r['geometry']['coordinates']]
    return round(r['distance']), round(r['duration']), simplify(coords, 0.00004)

def simplify(pts, eps):
    # Ramer-Douglas-Peucker on lat/lon degrees (fine at this scale)
    if len(pts) < 3:
        return pts
    def dist(p, a, b):
        if a == b:
            return math.dist(p, a)
        (x, y), (x1, y1), (x2, y2) = p, a, b
        return abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / math.hypot(y2 - y1, x2 - x1)
    i, dmax = 0, 0
    for k in range(1, len(pts) - 1):
        d = dist(pts[k], pts[0], pts[-1])
        if d > dmax:
            i, dmax = k, d
    if dmax > eps:
        return simplify(pts[:i + 1], eps)[:-1] + simplify(pts[i:], eps)
    return [pts[0], pts[-1]]

def clean_tip(s):
    return re.sub(r'^주의\s*', '', re.sub(r'^Note\s*', '', s)).strip()

def gourmet_note(pid):
    n = notes.get(pid)
    if not n:
        return None
    ko, en = n.get('ko', {}), n.get('en', {})
    kp, ep = ko.get('p', []), en.get('p', [])
    if len(kp) < 3 or len(ep) < 3:
        return None
    visited_nophoto = any('사진을 못 찍어서' in x for x in kp)
    tips_ko = [clean_tip(x) for x in ko.get('li', []) if x.startswith('주의')][:2]
    tips_en = [clean_tip(x) for x in en.get('li', []) if x.lower().startswith(('note', 'heads up', 'tip', 'caution'))][:2]
    detail_ko = [x for x in ko.get('li', []) if not x.startswith('주의')][:2]
    detail_en = [x for x in en.get('li', []) if not x.lower().startswith(('note', 'heads up', 'tip', 'caution'))][:2]
    strong = len(ko.get('li', [])) > 0
    return {
        'quote': {'ko': kp[2], 'en': ep[2]},
        'details': {'ko': detail_ko, 'en': detail_en},
        'tips': {'ko': tips_ko, 'en': tips_en},
        'visited': True,
        'strong': strong,
        'photoByCurator': not visited_nophoto,
    }

def price_tier(tags_ko):
    t = ' '.join(tags_ko)
    if any(k in t for k in TIER3):
        return 3
    if any(k in t for k in TIER1):
        return 1
    return 2

def cuisine(p):
    tags = [t['ko'] for t in p.get('tags') or []]
    for c in ('한식', '일식', '양식', '중식'):
        if c in tags:
            return c
    if p['kind'] == 'drinks':
        return '술집'
    if p['kind'] == 'chicken':
        return '치킨'
    t = ' '.join(tags)
    if any(k in t for k in ('고기', '삼겹살', '소고기', '백숙', '회', '냉면', '샤브')):
        return '한식'
    if any(k in t for k in ('돈까스', '초밥', '라멘', '우동', '덮밥')):
        return '일식'
    if any(k in t for k in ('짜장', '짬뽕', '양꼬치')):
        return '중식'
    if any(k in t for k in ('인도', '피자', '파스타', '버거', '스테이크')):
        return '양식'
    return '한식'

def download_img(p, outdir):
    img = p.get('image') or {}
    res = {}
    for key, size in (('url', '480'), ('large', '960')):
        u = img.get(key)
        if not u:
            continue
        if u.startswith('/'):
            u = 'https://info.seonukkim.com' + u
        fn = f"{p['id']}-{size}.webp"
        path = os.path.join(outdir, fn)
        if not os.path.exists(path):
            data = fetch(u, binary=True)
            open(path, 'wb').write(data)
            time.sleep(0.1)
        res[size] = f'/img/p/{fn}'
    if '960' not in res and '480' in res:
        res['960'] = res['480']
    return res

def main():
    imgdir = os.path.join(OUT, 'img', 'p')
    os.makedirs(imgdir, exist_ok=True)
    os.makedirs(os.path.join(OUT, 'data'), exist_ok=True)
    route_cache_path = os.path.join(os.path.dirname(NOTES), 'routes_cache.json')
    rcache = json.load(open(route_cache_path)) if os.path.exists(route_cache_path) else {}
    out_places, out_scen = {}, []
    for sc in SCENARIOS:
        tgt = places[sc['target']]
        origin = tgt['at']
        cands = []
        for p in cat['places']:
            if p['id'] in EXCLUDE or p['id'] == tgt['id']:
                continue
            if p.get('kind') not in KINDS or not p.get('at'):
                continue
            if not (p.get('address') or '').startswith('울산'):
                continue
            if hav(origin, p['at']) > 1100:
                continue
            key = f"{sc['id']}:{p['id']}"
            if key not in rcache:
                try:
                    rcache[key] = route(origin, p['at'])
                except Exception as e:
                    print('route fail', key, e)
                    d = hav(origin, p['at']) * 1.3
                    rcache[key] = [round(d), round(d / 1.25), [origin, p['at']]]
                time.sleep(0.35)
            dist, dur, geom = rcache[key]
            walk = max(1, math.ceil(dur / 60))
            if walk > MAX_WALK_MIN:
                continue
            cands.append({'id': p['id'], 'walkMin': walk, 'distM': dist, 'route': geom})
        cands.sort(key=lambda c: (c['walkMin'], c['distM']))
        for pid in [sc['target']] + [c['id'] for c in cands]:
            if pid in out_places:
                continue
            p = places[pid]
            note = gourmet_note(pid)
            curators = []
            seen = set()
            for s in p['sources']:
                cid = s['id']
                if cid not in CURATORS:
                    continue
                kind = CURATORS[cid]['kind']
                group = 'listing' if kind == 'listing' else cid
                if group in seen:
                    continue
                seen.add(group)
                c = {'id': 'listing' if kind == 'listing' else cid, 'url': s.get('url'),
                     'urlEn': s.get('englishUrl') or s.get('url')}
                if cid == 'gourmet' and note:
                    c['note'] = note
                curators.append(c)
            tags = p.get('tags') or []
            pk = [{'ko': l['ko'], 'en': l['en']} for k in perks.get(pid, []) for l in k.get('lines', [])][:2]
            out_places[pid] = {
                'id': pid,
                'name': p['name'],
                'area': p['area'],
                'kind': p['kind'],
                'cuisine': cuisine(p),
                'tags': [{'ko': t['ko'], 'en': t['en']} for t in tags][:3],
                'address': p.get('address'),
                'addressEn': p.get('addressEn') or (p.get('addressEnAuto') or {}).get('en'),
                'at': p['at'],
                'img': download_img(p, imgdir),
                'imgBasis': (p.get('image') or {}).get('basis'),
                'maps': p.get('maps') or {},
                'curators': curators,
                'priceTier': price_tier([t['ko'] for t in tags]),
                'perks': pk,
                'summary': p.get('summary'),
            }
        out_scen.append({**sc, 'origin': origin, 'candidates': cands})
        print(sc['id'], 'candidates', len(cands))
    json.dump(rcache, open(route_cache_path, 'w'))
    curators_out = {k: {kk: vv for kk, vv in v.items()} for k, v in CURATORS.items() if k in ('gourmet', 'meomeok', 'essentials', 'ulsanonline', 'jjeop')}
    curators_out['listing'] = curators_out.pop('jjeop')
    data = {
        'schema': 'tmc-proto-1',
        'builtAt': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
        'source': {'catalog': 'https://info.seonukkim.com/api/catalog', 'catalogUpdatedAt': cat.get('updatedAt'),
                   'notes': 'https://gourmet.seonukkim.com/', 'routing': 'OSRM foot profile via routing.openstreetmap.de (OpenStreetMap data)'},
        'curators': curators_out,
        'scenarios': out_scen,
        'places': out_places,
    }
    json.dump(data, open(os.path.join(OUT, 'data', 'places.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print('places', len(out_places))

main()
