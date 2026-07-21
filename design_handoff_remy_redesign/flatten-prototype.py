#!/usr/bin/env python3
"""Render the design prototype locally for side-by-side comparison.

The .dc.html prototype depends on a design-tool runtime (<x-dc>, <x-import>,
support.js) that we don't have. This strips those wrappers, leaving the raw
per-screen markup, which renders faithfully on its own.

    python3 design_handoff_remy_redesign/flatten-prototype.py
    # then open http://localhost:3000/prototype-flat.html with the dev server up

In the console, isolate one screen with the label shown above it, e.g.:
    __show('SESSION · SHOPPING (LISTENING)')
"""
import re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'design_handoff_remy_redesign/prototype/Remy Redesign.dc.html').read_text()

helmet = re.search(r'<helmet>(.*?)</helmet>', src, re.S).group(1)
fonts = re.search(r'<link href="https://fonts\.googleapis[^>]*>', helmet).group(0)
styles = re.search(r'<style>(.*?)</style>', helmet, re.S).group(1)

body = src.split('</helmet>', 1)[1].split('</x-dc>')[0]
body = re.sub(r'<x-import[^>]*>', '', body).replace('</x-import>', '')
body = body.replace('src="assets/remy-mark.png"', 'src="/remy-mark.png"')

helper = """
window.__show=function(label){
  const lab=[...document.querySelectorAll('div')].find(d=>(d.getAttribute('style')||'')
    .includes('ui-monospace') && d.textContent.trim()===label);
  if(!lab) return 'not found';
  const card=lab.parentElement;
  document.body.setAttribute('style','margin:0;padding:0;background:#DDD7CE;');
  document.body.innerHTML=''; document.body.appendChild(card);
  card.setAttribute('style','width:402px;margin:0;'); lab.remove(); return 'ok';
};
"""

(root / 'public/prototype-flat.html').write_text(
    f'<!doctype html><html><head><meta charset="utf-8">'
    f'<meta name="viewport" content="width=device-width,initial-scale=1">'
    f'{fonts}<style>{styles}</style></head><body>{body}'
    f'<script>{helper}</script></body></html>'
)
print('wrote public/prototype-flat.html — remember to delete before committing')
