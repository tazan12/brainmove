"""브레인무브 묶기: src/ 조각을 HTML 한 장으로 합친다.
dist/brainmove.html  — 배포용(three.js는 jsdelivr, 그림·3D 인물은 assets/ 경로 → 사용자 PC에서 파일 안에 넣음)
dist/test.html       — 이 작업 공간 점검용(three.js·3D 인물을 로컬 파일로)"""
import pathlib, base64
src = pathlib.Path('src')
js = '\n'.join((src / f).read_text() for f in ['core.js', 'pose.js', 'fx.js', 'narrator.js', 'games.js', 'games2.js', 'app.js'])
avatar = (src / 'avatar.js').read_text()
THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/'
TB = pathlib.Path('/tmp/claude-0/-home-claude/a134767e-3aaa-5c51-a6d3-cd2cdcf0d1bd/scratchpad/tb/node_modules/three/')

import json, collections
_man = json.loads(pathlib.Path('voicegen/manifest.json').read_text())
VOICE_TOTAL = json.dumps(dict(collections.Counter(i['persona'] for i in _man['items'])))

def page(three_base, avatar_src, dance_src=''):
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{(src / 'head.html').read_text()}
<script type="importmap">{{"imports":{{"three":"{three_base}build/three.module.js","three/addons/":"{three_base}examples/jsm/"}}}}</script>
</head>
<body>
{(src / 'body.html').read_text()}
<script>window.AVATAR_SRC = "{avatar_src}"; window.AVATAR_DANCE_SRC = "{dance_src}"; window.VOICE_TOTAL = {VOICE_TOTAL};</script>
<script type="module">
{avatar}
</script>
<script>
{js}
</script>
</body>
</html>
"""

out = pathlib.Path('dist'); out.mkdir(exist_ok=True)
d64 = lambda f: 'data:model/gltf-binary;base64,' + base64.b64encode(pathlib.Path('models/' + f).read_bytes()).decode()
(out / 'brainmove.html').write_text(page(THREE_CDN, d64('Michelle.glb')))
(out / 'test.html').write_text(page('file://' + str(TB) + '/', d64('Michelle.glb')))
(out / 'test_xbot.html').write_text(page('file://' + str(TB) + '/', d64('Xbot.glb'), d64('Michelle.glb')))
(out / '_check.js').write_text(js)
(out / '_avatar.mjs').write_text(avatar)
print('ok', (out / 'brainmove.html').stat().st_size // 1024, 'KB')
