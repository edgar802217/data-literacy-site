"""產生展場用的單一 HTML：tools/expo_src.html + assets/demo.js（平台試玩）。

展場檔要能離線、單檔開啟，所以把試玩程式直接寫進檔案裡，並做幾處展場版調整：
拖曳殘影放在試玩區內、卡片標題不用 <header>、拿掉會離開本頁的「進入分析平台」。
網站的 demo.js 更新後，重新執行這支腳本即可：

    python tools/build_expo.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "expo_src.html"
DEMO = ROOT / "assets" / "demo.js"
OUT = ROOT / "教育資料素養提升計畫_互動展區_重構版.html"


def sub(text, old, new):
    # demo.js 改版後若對不上，直接報錯，避免悄悄產出壞掉的檔案
    assert text.count(old) == 1, f"demo.js 找不到（或不只一處）：{old!r}"
    return text.replace(old, new)


page = SRC.read_text(encoding="utf-8")
js = DEMO.read_text(encoding="utf-8")
js = sub(js, 'if (!$("stage")) return;', 'if (!$("stage")) return;\n  const ROOT = $("pd");   // 拖曳殘影、提示手勢放在試玩區內，才吃得到試玩區的樣式')
js = sub(js, "document.body.appendChild(hand);", "ROOT.appendChild(hand);")
js = sub(js, "document.body.appendChild(g);", "ROOT.appendChild(g);")
js = sub(js, '<header><b>#1</b> ${o.name}<span>${o.method}</span></header>',
         '<div class="rcard-h"><b>#1</b> ${o.name}<span>${o.method}</span></div>')
js = sub(js, '\n        <a class="btn btn-line btn-sm" href="#platform" data-link="platform">進入分析平台</a>', "")
js = sub(js, '\n      if (window.SITE_PLATFORM_URL) body.querySelector(\'[data-link="platform"]\').href = window.SITE_PLATFORM_URL;', "")
page = sub(page, "/*DEMO_JS*/", js)

OUT.write_text(page, encoding="utf-8")
print(f"{OUT.name}（{len(page.encode('utf-8')):,} bytes）")
