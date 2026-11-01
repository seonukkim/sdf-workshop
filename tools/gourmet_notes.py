import json, re, sys, time, urllib.request, html
cat = json.load(open(sys.argv[1]))
areas = {'구영리','삼산','성남동','천상리'}
kinds = {'food','chicken','drinks'}
out = {}
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent':'TrustMyChef-prototype-build/1.0 (seonukkima)'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode('utf-8','replace')
def extract(page):
    # strip scripts/styles, keep text blocks of the main article
    page = re.sub(r'<script.*?</script>', ' ', page, flags=re.S)
    page = re.sub(r'<style.*?</style>', ' ', page, flags=re.S)
    m = re.search(r'<main.*?</main>', page, flags=re.S)
    body = m.group(0) if m else page
    paras = [html.unescape(re.sub(r'<[^>]+>', ' ', x)).strip() for x in re.findall(r'<p[^>]*>(.*?)</p>', body, flags=re.S)]
    paras = [re.sub(r'\s+', ' ', p) for p in paras if p.strip()]
    lis = [re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>', ' ', x))).strip() for x in re.findall(r'<li[^>]*>(.*?)</li>', body, flags=re.S)]
    return paras, lis
for p in cat['places']:
    if p.get('kind') not in kinds or p['area']['ko'] not in areas: continue
    g = [s for s in p['sources'] if s['id']=='gourmet']
    if not g: continue
    rec = {}
    for lang, key in (('ko','url'),('en','englishUrl')):
        url = g[0].get(key)
        if not url: continue
        try:
            paras, lis = extract(get(url))
            rec[lang] = {'p': paras[:6], 'li': lis[:12]}
        except Exception as e:
            rec[lang] = {'error': str(e)}
        time.sleep(0.25)
    out[p['id']] = rec
json.dump(out, open(sys.argv[2],'w'), ensure_ascii=False, indent=1)
print('fetched', len(out))
