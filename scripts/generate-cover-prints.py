"""Render the abstract covers bundled with the app and served to Discord."""
from pathlib import Path
from math import sin, cos, pi
import random
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "src/renderer/public/assets/prints/v1"
NAMES = ("eclipse", "estuary", "fold", "arcade", "tide", "strata",
         "mobile", "fan", "windows", "contour", "weave", "transit")
PALETTES = (
    ("#f0dfbd", "#192f38", "#c45239", "#e5a755", "#629391"),
    ("#202a42", "#a4bed1", "#eaa895", "#d6cfac", "#647fa2"),
    ("#decfbd", "#563953", "#798a69", "#d08f63", "#b9ac88"),
)


def print_cover(style, edition):
    paper, ink, bright, light, mid = PALETTES[edition]
    art = Image.new("RGB", (1800, 1800), paper)
    draw = ImageDraw.Draw(art)
    def coords(points):
        return tuple(round(v * 3) for v in points)
    def oval(box, color):
        draw.ellipse(coords(box), fill=color)
    def polygon(points, color):
        draw.polygon(coords(points), fill=color)
    def rectangle(box, color):
        draw.rectangle(coords(box), fill=color)
    def line(points, color, width):
        draw.line(coords(points), fill=color, width=width * 3)
    if style == "eclipse":
        oval((80, 55, 498, 473), bright)
        for y in range(224, 550, 13):
            line((48, y, 545, y - 64), ink, 5)
        oval((340, 351, 486, 497), light)
    elif style == "estuary":
        for i in range(8):
            points = [(-30, 650)]
            for x in range(-30, 651, 6):
                points.append((x, 125+i*48+60*sin(x/105+i*.35)+18*sin(x/46)))
            points.append((650, 650))
            polygon([v for point in points for v in point], (mid, ink, light, bright)[i%4])
    elif style == "fold":
        polygon((35,462,296,78,560,439,289,538), ink)
        polygon((296,78,360,335,289,538,174,348), bright)
        polygon((296,78,560,439,360,335), light)
        polygon((174,348,289,538,35,462), mid)
    elif style == "arcade":
        for i in range(7):
            inset = i*24
            color = (ink, mid, paper, bright, paper, light, ink)[i]
            oval((48+inset,60+inset,552-inset,564-inset), color)
            rectangle((48+inset,310,552-inset,625), color)
    elif style == "tide":
        oval((338,65,500,227), bright)
        for i in range(30):
            points = [(x,240+i*12+32*sin(x/100+i*.12)+14*sin(x/50)) for x in range(-10,615,5)]
            line([v for pt in points for v in pt], ink if i%4 else mid, 3)
    elif style == "strata":
        for i in range(7):
            y=80+i*65
            polygon((-10,y+45,200,y-13,380,y+23,620,y-68,620,620,-10,620), (mid,bright,light,ink)[i%4])
    elif style == "mobile":
        line((290,-10,290,125,135,170,135,274), ink, 3)
        line((290,125,459,199,459,332), ink, 3)
        oval((67,240,214,361), bright)
        polygon((385,359,493,248,551,415), mid)
        line((295,145,295,422), ink, 3)
        oval((194,408,404,512), ink)
    elif style == "fan":
        for i in range(32):
            a=-pi+i*pi/34
            b=a+pi/43
            polygon((305,505,305+475*cos(a),505+475*sin(a),305+475*cos(b),505+475*sin(b)), (ink,mid,bright)[i%3])
        oval((261,461,349,549), light)
    elif style == "windows":
        for i in range(9):
            x,y=30+i%3*186,44+i//3*177
            rectangle((x,y,x+162,y+146), (ink,mid,light)[i%3])
            draw.pieslice(coords((x,y,x+158,y+158)), i*90, i*90+180, fill=(bright,paper,ink)[i%3])
    elif style == "contour":
        for i in range(25):
            pts=[]
            for j in range(129):
                a=j*pi/64
                radius=44+i*10+18*sin(3*a+i*.06)+13*cos(2*a)
                pts.extend((280+radius*cos(a),310+radius*sin(a)*1.17))
            line(pts, bright if i%6==0 else ink, 3)
    elif style == "weave":
        for i in range(-3,11):
            x=i*90
            polygon((x,0,x+37,0,x+240,600,x+203,600),ink)
        for i in range(6):
            y=i*100+20
            polygon((0,y,600,y-55,600,y-22,0,y+33),mid if i%2 else bright)
            for j in range(i%2,7,2):
                x=j*90+(y/600)*203
                polygon((x,y-x*.09,x+37,y-x*.09-3,x+49,y-x*.09+29,x+11,y-x*.09+33),ink)
    elif style == "transit":
        for i in range(8):
            d=i*20
            line((-40,175+d,280-d,175+d,421-d,316+d,650,316+d), (ink,mid,bright)[i%3], 9)
        oval((373,63,473,163),light)
    art = art.resize((1024,1024), Image.Resampling.LANCZOS)
    noise = Image.frombytes("L",art.size,random.Random(edition*100+NAMES.index(style)).randbytes(1024**2))
    return Image.blend(art,noise.convert("RGB"),.035)


if __name__ == "__main__":
    DEST.mkdir(parents=True,exist_ok=True)
    for name in NAMES:
        for edition in range(len(PALETTES)):
            print_cover(name,edition).save(DEST/f"{name}-{edition}.jpg",quality=91,optimize=True)
