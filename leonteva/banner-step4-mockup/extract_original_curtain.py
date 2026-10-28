from pathlib import Path
from PIL import Image

folder = Path(__file__).parent
source = Image.open(folder / 'original-banner').convert('RGB')
output = Image.new('RGBA', (source.width, 214))
mask = Image.new('L', output.size)
ends = {}
for x in range(105, 1092):
    rows = []
    for y in range(214):
        r, g, b = source.getpixel((x, y))
        if b > r * 1.12 and b > g * 1.3:
            rows.append(y)
    ends[x] = max(rows) if rows else -1
for x in range(490, 711):
    ends[x] = round(ends[489] + (ends[711] - ends[489]) * (x - 489) / (711 - 489))
for x, end in ends.items():
    for y in range(end + 1):
        output.putpixel((x, y), (*source.getpixel((x, y)), 255))
for left, top, right, bottom in [(190, 25, 1010, 110), (420, 115, 782, 165)]:
    for y in range(top, bottom):
        a = source.getpixel((181, y))
        b = source.getpixel((1014, y))
        for x in range(left, right):
            t = (x - 181) / (1014 - 181)
            color = tuple(round(a[k] * (1-t) + b[k] * t) for k in range(3))
            output.putpixel((x, y), (*color, 255))
            mask.putpixel((x,y), 255)
for x in range(490, 711):
    for y in range(175, ends[x] + 1):
        donor_y = min(213, y - ends[x] + ends[480])
        output.putpixel((x,y), (*source.getpixel((480, donor_y)), 255))
        mask.putpixel((x,y),255)
box = (110, 0, 1090, 214)
output.crop(box).save(folder / 'original-curtain-clean.png')
source.crop(box).save(folder / 'original-curtain-before.png')
mask.crop(box).save(folder / 'original-curtain-reconstructed-mask.png')
print('Extracted source panel. Reconstructed text rectangles and center border hidden behind hero; top remains clipped as in source.')
