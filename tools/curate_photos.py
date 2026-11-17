"""Import finished GLORIA expression and style art from the user's existing archive."""
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import argparse
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'source'
DEFAULT_ARCHIVE = Path('/Users/seasnake/Downloads/GLORIA-风格与提示词合集-2026-10-24')
# Keep the finished illustrations/reactions; omit superseded art, tutorial covers,
# blank animation bases, sprite sheets and the static duplicate of the animated GIF.
ALBUMS = [
    ('GLORIA 表情包', 'GLORIA Expressions', [7, 10, 11, 12, 26, 30]),
    ('GLORIA 风格图', 'GLORIA Styles', [2, 3, 5, 6, 8, 9, 27]),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, default=DEFAULT_ARCHIVE)
    args = parser.parse_args()
    catalog = {item['id']: item for item in json.loads((args.archive / 'catalog.json').read_text())}
    dest = SRC / 'content/media/photo/gloria-art'
    dest.mkdir(parents=True, exist_ok=True)
    albums = []
    imported = []
    for name, en, ids in ALBUMS:
        items = []
        for number in ids:
            item = catalog[number]
            original = args.archive / item['image']
            stem = f'gloria-{number:02}'
            with Image.open(original) as image:
                frame = image.convert('RGBA')
                thumbnail = frame.copy()
                thumbnail.thumbnail((384, 384), Image.Resampling.LANCZOS)
                thumbnail.save(dest / f'{stem}-thumb.webp', quality=88, method=6)
                animated = bool(getattr(image, 'is_animated', False))
                if animated:
                    filename = f'{stem}.gif'
                    shutil.copy2(original, dest / filename)
                    width, height = image.size
                else:
                    filename = f'{stem}.webp'
                    frame.thumbnail((1672, 1672), Image.Resampling.LANCZOS)
                    frame.save(dest / filename, quality=90, method=6)
                    width, height = frame.size
            created = item.get('created_at_utc') or catalog[28]['created_at_utc']
            date = datetime.fromisoformat(created.replace('Z', '+00:00')).astimezone(ZoneInfo('Asia/Shanghai')).strftime('%Y/%m/%d')
            prefix = 'content/media/photo/gloria-art/'
            items.append(dict(id=stem, title=item['name'], en=item['name'], thumb=prefix + f'{stem}-thumb.webp',
                              src=prefix + filename, w=width, h=height, prompt=item['prompt'],
                              refs=[Path(r['original_path']).name for r in item.get('references', [])], file=original.name,
                              date=date, animated=animated, note=item.get('note', '')))
            imported.append(dict(id=number, name=item['name'], source=str(original), output=prefix + filename, animated=animated))
        albums.append(dict(name=name, en=en, items=items))
    path = SRC / 'content/data.js'
    data = json.loads(path.read_text().split('XMB.content = ', 1)[1].strip().rstrip(';'))
    previous = sum(len(a['items']) for a in data['photos']['albums'])
    data['photos']['albums'] = albums
    path.write_text('XMB.content = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n')
    report = dict(previousCount=previous, photoCount=len(imported), albums=[dict(name=a['name'], count=len(a['items'])) for a in albums], imported=imported)
    (ROOT / 'photo-curation-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k:v for k,v in report.items() if k != 'imported'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
