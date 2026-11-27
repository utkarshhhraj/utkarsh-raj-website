#!/usr/bin/env python3
"""Assemble the v3 page. Run from the repo root: python3 build/v3/build.py  (OUT=index.html by default)"""
import json, re, html, os, pathlib
R = pathlib.Path(__file__).resolve().parents[2]
B = R / 'build'
V3 = B / 'v3'

CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; "
       "img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'")
meta = (B / 'head-meta.html').read_text()
meta = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', f'<meta http-equiv="Content-Security-Policy" content="{CSP}">', meta)
meta = re.sub(r'<link rel="icon" href="data:[^>]*>\n?', '', meta)
meta = re.sub(r'<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\n?', '', meta)
meta = meta.replace('<meta name="theme-color" content="#09090b">', '<meta name="theme-color" content="#ffffff">')
ld = (B / 'head-ld.html').read_text()
head = ('<link rel="icon" href="favicon.ico" sizes="32x32">\n<link rel="icon" href="icon.svg" type="image/svg+xml">\n'
        '<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'
        '<link rel="preload" href="fonts/plex-sans-400.woff2" as="font" type="font/woff2" crossorigin>\n'
        '<link rel="preload" href="fonts/plex-sans-600.woff2" as="font" type="font/woff2" crossorigin>\n'
        '<title>Utkarsh Raj | BMS @ SSCBS, University of Delhi</title>')
css = (V3 / 'style.css').read_text()
js = (V3 / 'app.js').read_text()
body = (V3 / 'body.html').read_text()
certs = json.loads((B / 'certs.json').read_text())
for c in certs:
    for k in ('title','meta','cardTitle','cardSub'):
        c[k] = c[k].replace(' · ', ', ')
decks = json.loads((R / 'data' / 'decks.json').read_text())

SIZES = {'img/cert-iitd.jpg': (1000, 1274), 'img/cert-nco.jpg': (672, 475), 'img/iimb-letter.jpg': (800, 480), 'img/cert-dtu.jpg': (1400, 1050),
         'img/cert-esports.jpg': (672, 475), 'img/cert-neo.jpg': (672, 475), 'img/cert-chess-u17.jpg': (657, 516), 'img/cert-bug.jpg': (461, 667)}
items = []
for k, c in enumerate(certs):
    w, h = SIZES[c['img']]
    items.append(f'      <li><button type="button" class="cert" data-cert="{k}"><span class="thumb"><img src="{c["img"]}" alt="{html.escape(c.get("alt") or c["title"])}" width="{w}" height="{h}" loading="lazy" decoding="async"></span>'
                 f'<span class="t">{html.escape(c["cardTitle"])}</span><span class="s">{html.escape(c["cardSub"])}</span></button></li>')
body = body.replace('{{CERTGRID}}', '\n'.join(items))
body = body.replace('{{CERTS}}', json.dumps(certs, ensure_ascii=False).replace('</', '<\\/'))
body = body.replace('{{DECKS}}', json.dumps(decks, ensure_ascii=False).replace('</', '<\\/'))

def slide(m):
    did, n = m.group(1), int(m.group(2))
    b = f'decks/{did}/slide-{n:02d}'
    s = lambda e: f'{b}-640.{e} 640w, {b}-1200.{e} 1200w, {b}-1920.{e} 1920w'
    sizes = '(max-width:860px) 92vw, 540px'
    return (f'<picture><source type="image/avif" srcset="{s("avif")}" sizes="{sizes}"><source type="image/webp" srcset="{s("webp")}" sizes="{sizes}">'
            f'<img src="{b}-1200.jpg" srcset="{s("jpg")}" sizes="{sizes}" alt="Cover slide of the deck" width="1920" height="1080" loading="lazy" decoding="async"></picture>')
body = re.sub(r'\{\{SLIDE ([\w-]+) (\d+)\}\}', slide, body)
assert '{{' not in body

analytics = ('<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};'
             'if(!/github\\.io$/.test(location.hostname)){var s=document.createElement("script");s.defer=true;s.src="/_vercel/insights/script.js";document.head.appendChild(s)}</script>')
page = (meta.rstrip() + '\n' + head + '\n' + ld.rstrip() + '\n<style>\n' + css + '</style>\n</head>\n' + body +
        analytics + '\n<script>\n' + js + '</script>\n</body>\n</html>\n')
out = os.environ.get('OUT', 'index.html')
(R / out).write_text(page)
print(out, len(page.encode()), 'bytes')
