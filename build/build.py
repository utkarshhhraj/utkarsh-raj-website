#!/usr/bin/env python3
"""Assemble /index.html from build/ parts. Run from the repo root: python3 build/build.py"""
import json, re, html, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
B = R / 'build'

CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; "
       "img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'")

meta = (B / 'head-meta.html').read_text()
meta = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', f'<meta http-equiv="Content-Security-Policy" content="{CSP}">', meta)
meta = re.sub(r'<link rel="icon" href="data:[^>]*>\n?', '', meta)
meta = re.sub(r'<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\n?', '', meta)
ld = (B / 'head-ld.html').read_text()
ld = re.sub(r'<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\n?', '', ld)
tpl = (B / 'head.tpl.html').read_text()
css = (B / 'style.css').read_text()
js = (B / 'app.js').read_text()
body = (B / 'body.html').read_text()
certs = json.loads((B / 'certs.json').read_text())

ALTS = {
  'img/cert-iitd.jpg': "Utkarsh Raj's IIT Delhi Startup Expo certificate of merit, third position",
  'img/cert-nco.jpg': "Utkarsh Raj's National Consulting Olympiad 2025 certificate of merit, fourth rank",
  'img/iimb-letter.jpg': "Utkarsh Raj's IIM Bangalore offer of admission, cropped",
  'img/cert-dtu.jpg': "Utkarsh Raj's Polygenesis VoltEdge certificate, 3rd position",
  'img/cert-esports.jpg': "Utkarsh Raj's Bihar Inter School Esports Championship 2024 certificate, first place",
  'img/cert-chess-u17.jpg': "Utkarsh Raj's Bihar State Inter School Chess Championship certificate, 3rd in Under-17",
}
SIZES = {'img/cert-iitd.jpg': (1000, 1274), 'img/cert-nco.jpg': (672, 475), 'img/iimb-letter.jpg': (800, 480), 'img/cert-dtu.jpg': (1400, 1050),
         'img/cert-esports.jpg': (672, 475), 'img/cert-neo.jpg': (672, 475), 'img/cert-chess-u17.jpg': (657, 516), 'img/cert-bug.jpg': (461, 667)}
for c in certs:
    if not c.get('alt'):
        c['alt'] = ALTS.get(c['img'], c['title'])

cards = []
for k, c in enumerate(certs):
    w, h = SIZES[c['img']]
    cards.append(
      f'      <button type="button" class="wcard" style="--k:{k}" data-cert="{k}" data-cursor="View" aria-label="Open: {html.escape(c["title"])}">'
      f'<span class="rank">{k+1:02d}</span><img src="{c["img"]}" alt="{html.escape(c["alt"])}" width="{w}" height="{h}" decoding="async" loading="lazy"></button>')
body = body.replace('{{WALL}}', '\n'.join(cards))
body = body.replace('{{CERTS}}', json.dumps(certs, ensure_ascii=False).replace('</', '<\\/'))

def slide(m):
    did, n = m.group(1), int(m.group(2))
    b = f'decks/{did}/slide-{n:02d}'
    s = lambda e: f'{b}-640.{e} 640w, {b}-1200.{e} 1200w, {b}-1920.{e} 1920w'
    sizes = '(max-width:860px) 80vw, 560px'
    return (f'<picture><source type="image/avif" srcset="{s("avif")}" sizes="{sizes}"><source type="image/webp" srcset="{s("webp")}" sizes="{sizes}">'
            f'<img src="{b}-1200.jpg" srcset="{s("jpg")}" sizes="{sizes}" alt="" width="1920" height="1080" decoding="async" loading="lazy"></picture>')
body = re.sub(r'\{\{SLIDE ([\w-]+) (\d+)\}\}', slide, body)
assert '{{' not in body

boot = ("<script>(function(){var h=document.documentElement;"
        "if(matchMedia('(prefers-reduced-motion:reduce)').matches){h.classList.add('static');return}"
        "var seen=false;try{seen=sessionStorage.getItem('ur-intro')==='1'}catch(e){}"
        "if(!seen&&!location.hash)h.classList.add('is-loading');"
        "setTimeout(function(){h.classList.remove('is-loading')},6000)})()</script>")

page = (meta.rstrip() + '\n' + tpl.rstrip() + '\n' + ld.rstrip() + '\n' + boot + '\n<style>\n' + css + '</style>\n</head>\n' + body +
        '<script src="js/gsap.min.js"></script>\n<script src="js/ScrollTrigger.min.js"></script>\n<script src="js/Flip.min.js"></script>\n'
        '<script src="js/lenis.min.js"></script>\n<script>\n' + js + '</script>\n</body>\n</html>\n')
(R / 'index.html').write_text(page)
print('index.html', len(page.encode()), 'bytes')
