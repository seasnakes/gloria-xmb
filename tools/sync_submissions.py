"""Refresh published submissions from the inclusive world.execute episode onward."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import argparse
import json
import shutil
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'source'
START_BVID = 'BV1RHhU63ESq'
HEADERS = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com/'}


def fetch(url):
    request = urllib.request.Request(url.replace('http://', 'https://'), headers=HEADERS)
    return urllib.request.urlopen(request, timeout=30)


def published_since_anchor(first_page=None):
    toy = shutil.which('toy')
    if not toy:
        raise RuntimeError('Install/login to the toy CLI before refreshing submissions.')
    rows = []
    page = 1
    while True:
        result = first_page if page == 1 and first_page else json.loads(subprocess.check_output([toy, 'video', 'mine', '--page', str(page), '--size', '50', '--json']))
        batch = result.get('list', [])
        rows.extend(batch)
        anchor = next((v for v in rows if v['bvid'] == START_BVID), None)
        if anchor:
            unique = {v['bvid']: v for v in rows if v['publishTime'] >= anchor['publishTime']}
            return sorted(unique.values(), key=lambda v: (v['publishTime'], v['bvid']), reverse=True), anchor
        if not batch or len(rows) >= result.get('total', len(rows)):
            raise RuntimeError('The starting episode was not found; existing content was not changed.')
        page += 1


def video(row):
    with fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + row['bvid']) as response:
        result = json.load(response)
    if result.get('code') == 62012:
        return dict(bvid=row['bvid'], title=row['title'], unavailableCode=62012)
    if result.get('code') != 0:
        raise RuntimeError(f"Metadata unavailable for {row['bvid']}: {result.get('message')}")
    d = result['data']
    assert d['bvid'] == row['bvid']
    path = f"content/media/video/{d['bvid']}.webp"
    dest = SRC / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as directory:
        downloaded = Path(directory) / 'cover.jpg'
        output = Path(directory) / 'cover.webp'
        with fetch(d['pic'] + '@640w_360h_1c.jpg') as response:
            downloaded.write_bytes(response.read())
        subprocess.run(['cwebp', '-quiet', '-resize', '480', '0', '-q', '82', str(downloaded), '-o', str(output)], check=True)
        shutil.copy2(output, dest)
    return dict(bvid=d['bvid'], title=d['title'], cover=path, duration=d['duration'], pubdate=d['pubdate'], owner=d['owner']['name'], views=d['stat']['view'], desc=d.get('desc', '')[:200])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--first-page-json', type=Path, help='Optional fresh toy video mine result, avoiding a duplicate first-page request.')
    args = parser.parse_args()
    first = json.loads(args.first_page_json.read_text()) if args.first_page_json else None
    rows, anchor = published_since_anchor(first)
    with ThreadPoolExecutor(max_workers=3) as pool:
        fetched = list(pool.map(video, rows))
    unavailable = [v for v in fetched if 'unavailableCode' in v]
    items = [v for v in fetched if 'unavailableCode' not in v]
    assert any(v['bvid'] == START_BVID for v in items)
    assert all(v['pubdate'] >= anchor['publishTime'] for v in items)
    path = SRC / 'content/data.js'
    data = json.loads(path.read_text().split('XMB.content = ', 1)[1].strip().rstrip(';'))
    group = next(g for g in data['videos']['groups'] if g['name'] == '我的投稿')
    previous = {v['bvid'] for v in group['items']}
    group['items'] = sorted(items, key=lambda v: (v['pubdate'], v['bvid']), reverse=True)
    data['videos']['groups'] = [g for g in data['videos']['groups'] if g['items']]
    path.write_text('XMB.content = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n')
    report = dict(updatedAt=datetime.now(timezone.utc).isoformat(), startBvid=START_BVID, startTitle=anchor['title'], inclusive=True,
                  count=len(items), added=[v['bvid'] for v in items if v['bvid'] not in previous],
                  removed=sorted(previous - {v['bvid'] for v in items}), unavailable=unavailable, titles=[v['title'] for v in items])
    (ROOT / 'submission-sync-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
