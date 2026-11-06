"""Optional maintainer tool: build offline Traditional Chinese serif subsets.

Requires fonttools and the upstream Noto Serif CJK Regular/Bold TTCs.
Usage: python3 scripts/subset-fonts.py /path/to/noto-font-directory
Normal application builds use the committed WOFF files and need no font tools.
"""
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
font_root = Path(sys.argv[1])
text = (root / 'index.html').read_text()
for source in sorted((root / 'src').glob('*.ts')):
    text += source.read_text()
text += ''.join(chr(i) for i in range(32, 127))
text += '年月日時分秒上下週一二三四五六日％−＋×÷→↗↵↻≤≥…／・，。：「」（）'
out = root / 'src/fonts'
out.mkdir(parents=True, exist_ok=True)

for weight in ['Regular', 'Bold']:
    font = TTFont(font_root / f'NotoSerifCJK-{weight}.ttc', fontNumber=3)
    assert font['name'].getDebugName(1) == 'Noto Serif CJK TC', 'Expected the Traditional Chinese face.'
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.name_legacy = True
    options.layout_features = ['*']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    # Give the modified subset its own family name; retain original attribution
    # and license metadata instead of representing it as the full upstream font.
    family = 'Plant Cover Serif TC'
    names = {1: family, 2: weight, 3: f'{family}-{weight}-2.003-subset',
             4: f'{family} {weight}', 6: f'PlantCoverSerifTC-{weight}',
             16: family, 17: weight}
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding(), errors='replace')
    if 'CFF ' in font:
        cff = font['CFF '].cff
        cff.fontNames[0] = f'PlantCoverSerifTC-{weight}'
        cff.topDictIndex[0].FamilyName = family
        cff.topDictIndex[0].FullName = f'{family} {weight}'
    font.flavor = 'woff'
    target = out / f'plant-cover-serif-tc-{weight.lower()}.woff'
    font.save(target)
    print(f'{target.name}: {target.stat().st_size} bytes')
