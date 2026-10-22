"""Reproduce the original PLW electrostatics SVGs without third-party packages.

Run: uv run python scripts/figures/electrostatics.py [--check]
Coordinates in diagrams are schematic; sampled curves and field lines use the
equations in the adjacent text. --check checks artifacts and independent
numerical identities without writing files.
"""
from __future__ import annotations

import argparse
from html import escape
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / 'docs' / 'electromagnetism'
BLUE, RED, GRAY = '#155da0', '#ba2636', '#475569'


class SVG:
    def __init__(self, title: str, desc: str):
        self.items = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc>',
                      '<rect width="720" height="380" fill="white"/>',
                      '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#475569"/></marker></defs>',
                      '<g font-family="Arial, Microsoft YaHei, sans-serif" font-size="17" fill="#172033">']
        self.text(24, 30, title)

    def text(self, x, y, value, color='#172033', size=17):
        self.items.append(f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}">{escape(str(value))}</text>')

    def line(self, x1, y1, x2, y2, color=GRAY, arrow=False, dashed=False):
        self.items.append(f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{color}" stroke-width="2"' + (' marker-end="url(#arrow)"' if arrow else '') + (' stroke-dasharray="6 5"' if dashed else '') + '/>')

    def circle(self, x, y, radius, fill='none', color=BLUE):
        self.items.append(f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{fill}" stroke="{color}" stroke-width="2"/>')

    def rect(self, x, y, w, h, fill='#e5edf5', color=GRAY):
        self.items.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{color}" stroke-width="2"/>')

    def path(self, points, color=BLUE):
        d = ' '.join(('M' if i == 0 else 'L') + f'{x:.3f} {y:.3f}' for i, (x, y) in enumerate(points))
        self.items.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2"/>')

    def charge(self, x, y, label='+q'):
        self.circle(x, y, 15, '#fff1f2' if label.startswith('+') else '#e4f2ff', RED if label.startswith('+') else BLUE)
        self.text(x-10, y+6, label, size=14)

    def finish(self):
        self.text(24, 365, 'PLW 原创 · 示意图非比例；曲线按正文公式采样', GRAY, 13)
        return '\n'.join(self.items + ['</g></svg>']) + '\n'


def graph(title, desc, series, xmax=3, ymax=1.6, xlabel='r/R', ylabel='归一化值'):
    s = SVG(title, desc)
    s.line(70, 310, 675, 310, arrow=True)
    s.line(70, 310, 70, 60, arrow=True)
    s.text(620, 340, xlabel)
    s.text(85, 65, ylabel)
    for label, color, f in series:
        points = [(70 + 590*x/xmax, 310 - 220*f(x)/ymax) for x in [0.015 + (xmax-0.015)*i/400 for i in range(401)]]
        s.path(points, color)
        k = [a[0] for a in series].index(label)
        s.line(420, 65+25*k, 450, 65+25*k, color)
        s.text(460, 71+25*k, label, color, 14)
    for x in range(1, int(xmax)+1):
        px = 70+590*x/xmax
        s.line(px, 306, px, 314)
        s.text(px-4, 333, x, size=13)
    return s


def dipole_field(x, y):
    ex = ey = 0.
    for q, a in ((1., -0.7), (-1., 0.7)):
        dx = x-a
        r = math.hypot(dx, y)
        ex += q*dx/r**3
        ey += q*y/r**3
    return ex, ey


def dipole_lines():
    s = SVG('有限电偶极子的电场线', '按两个点电荷的库仑场积分；箭头从正电荷指向负电荷，电场线不是粒子轨迹．')
    for angle in [i*math.pi/10 for i in range(20)]:
        x, y = -0.7+0.07*math.cos(angle), 0.07*math.sin(angle)
        pts=[]
        for _ in range(1600):
            pts.append((360+100*x, 195-100*y))
            if math.hypot(x-0.7,y)<0.065 or abs(x)>3.1 or abs(y)>1.4:
                break
            def unit(a,b):
                u,v=dipole_field(a,b); n=math.hypot(u,v)
                return u/n,v/n
            u,v=unit(x,y); u2,v2=unit(x+0.0075*u,y+0.0075*v)
            x += 0.015*u2; y += 0.015*v2
        s.path(pts, BLUE)
        if len(pts)>20:
            j=len(pts)//2
            s.line(*pts[j], *pts[min(j+5,len(pts)-1)], BLUE, arrow=True)
    s.charge(290,195); s.charge(430,195,'−q')
    return s


def artifacts():
    out={}
    def save(ch,name,s): out[f'chapter-{ch}/images/{name}.svg']=s.finish()
    s=SVG('源点、场点与库仑力','从源点 r′ 指向场点 r 的距离矢量 R = r − r′．')
    s.charge(160,230); s.circle(550,140,6,BLUE); s.text(540,110,'场点 r')
    s.line(165,225,535,145,BLUE,True); s.text(300,160,'R = r − r′')
    s.line(65,310,150,240,arrow=True); s.line(65,310,540,145,arrow=True)
    s.text(80,330,'O'); s.text(110,210,'源点 r′'); save(1,'source-field',s)
    save(1,'dipole-lines',dipole_lines())
    s=SVG('连续体积分的尺度与微元','线、面和体微元分别以长度、面积和体积权重计入电荷．')
    s.line(65,150,240,150,BLUE); s.line(120,150,150,150,RED); s.text(70,205,'dq = λ dl')
    s.rect(285,100,130,100); s.rect(330,130,25,25,'#ffe4e6',RED); s.text(280,235,'dq = σ dS')
    s.rect(495,90,130,140); s.rect(535,135,35,35,'#ffe4e6',RED); s.text(490,265,'dq = ρ dV'); save(1,'charge-elements',s)
    s=SVG('圆环轴线上的投影与环形微元','圆环横向场抵消，轴向投影因子为 z/sqrt(a²+z²)；圆盘由同心环组成．')
    s.circle(230,190,85); s.charge(230,105,'dq'); s.circle(535,190,5,BLUE)
    s.line(80,190,630,190,arrow=True); s.line(230,105,535,190,BLUE,True)
    s.line(230,190,230,105,RED); s.text(250,145,'a'); s.text(365,220,'z'); s.text(370,135,'R'); s.text(525,225,'P'); save(1,'ring-axis',s)
    s=SVG('有向通量与立体角','闭合面取外法向；从点电荷看面元，dΩ = cosθ dS / R²．')
    s.circle(265,195,110); s.charge(215,205); s.rect(350,105,45,55,'#e5edf5',BLUE)
    s.line(225,195,365,130,BLUE,True); s.line(375,130,440,80,RED,True)
    s.text(395,130,'n（外法向）'); s.text(270,150,'R'); s.text(375,185,'dS'); s.text(110,330,'内源净立体角 4π；外源进入与离开抵消'); save(1,'gaussian-flux',s)
    save(1,'symmetric-fields',graph('均匀实心球与薄球壳的电场','纵轴 E/(kQ/R²)，横轴 r/R；球壳表面有跃变，实心球表面连续．', [('实心球',BLUE,lambda r:r if r<1 else 1/r**2),('薄球壳',RED,lambda r:0 if r<1 else 1/r**2)]))
    s=graph('PN 结耗尽层的分段电场','取 a=b、ND=NA；纵轴为 −E/|Emin|，电场连续，导数随电荷密度变号．',[('−E / |Emin|',BLUE,lambda x: x if x<1 else (2-x if x<2 else 0))],xmax=3,xlabel='(x+a)/a')
    s.text(90,100,'电荷中性：NA a = ND b'); save(1,'pn-field',s)
    save(2,'potential-curves',graph('均匀实心球与薄球壳的电势','纵轴 φ/(kQ/R)，两种电势在 r=R 连续；均取无穷远为零．',[('实心球',BLUE,lambda r:(3-r*r)/2 if r<1 else 1/r),('薄球壳',RED,lambda r:1 if r<1 else 1/r)]))
    s=SVG('等势面与负梯度','点电荷的同心球等势面以截面圆表示；正电荷场沿势减小方向．')
    s.charge(285,195)
    for r in (45,85,125): s.circle(285,195,r,color=BLUE)
    s.line(305,195,440,195,RED,True); s.text(460,190,'E = −∇φ'); s.text(460,225,'φ 沿箭头减小'); save(2,'equipotential',s)
    s=SVG('调和电势的鞍点','φ = a(x²−y²)，沿 x 轴为极小，沿 y 轴为极大；三维空间中并非稳定势阱．')
    for j,color,sign in [(0,BLUE,1),(1,RED,-1)]:
        pts=[(75+570*t/200,195-sign*0.0015*((75+570*t/200)-360)**2) for t in range(201)]
        s.path(pts,color)
    s.text(90,325,'蓝：φ(x,0)'); s.text(470,325,'红：φ(0,y)'); save(2,'saddle',s)
    s=SVG('线四极子与平面方框四极子','左：+q, −2q, +q；右：方框相邻异号、对角同号，两者总电荷与偶极矩均为零．')
    for x,label in [(95,'+q'),(195,'−2q'),(295,'+q')]: s.charge(x,190,label)
    s.line(95,220,295,220); s.text(135,250,'a'); s.text(235,250,'a')
    for x,y,label in [(465,115,'+q'),(600,115,'−q'),(600,250,'+q'),(465,250,'−q')]:s.charge(x,y,label)
    s.rect(465,115,135,135,'none'); save(2,'quadrupoles',s)
    s=SVG('导体表面的小柱与小回路','静电平衡材料内场为零；小柱给法向跃变，小回路给切向连续．')
    s.rect(60,200,600,110); s.rect(295,145,80,115,'none',RED)
    for x in (130,230,430,530): s.line(x,200,x,95,BLUE,True); s.text(x-4,225,'+')
    s.text(80,285,'金属：E = 0'); s.text(400,170,'外侧：En = σ/ε₀'); save(3,'surface-boundary',s)
    s=SVG('三平板的场与电荷约束','中间带电板两侧有接地板；不同间距时两侧分配不同，电势条件补足高斯关系．')
    for x in (140,330,580):s.rect(x,85,10,220)
    s.text(110,70,'φ = 0'); s.text(300,70,'σ'); s.text(540,70,'φ = 0')
    s.line(325,185,165,185,BLUE,True); s.line(345,185,555,185,BLUE,True)
    s.text(205,270,'a'); s.text(450,270,'b'); save(3,'induction-plates',s)
    s=SVG('导体空腔、材料与外部空间','灰色为金属，白色为含电荷的空腔；金属内 E=0 不代表空腔场为零．')
    s.circle(330,195,130,'#cbd5e1',GRAY); s.circle(305,180,75,'white',GRAY)
    s.charge(285,175); s.text(270,105,'内面总电荷 −q'); s.text(450,190,'外面 Qc + q')
    s.text(335,285,'材料内 E = 0'); s.line(450,285,575,285,arrow=True); s.text(550,315,'接地可交换电荷'); save(3,'shielding',s)
    s=SVG('唯一性证明的区域法向','矩形为外边界，内部圆盘为导体；求解区域外法向在内边界指入金属．')
    s.rect(85,70,550,250,'#f1f6fb'); s.circle(300,190,70,'#cbd5e1')
    s.line(370,190,315,190,RED,True); s.text(385,190,'nΩ'); s.line(635,170,690,170,RED,True)
    s.text(465,300,'Ω：真空求解区域'); s.text(245,190,'导体'); save(3,'uniqueness-region',s)
    s=SVG('接地平面的镜像构造','实线右侧为物理求解区域；左侧虚设电荷只用于构造右半空间解．')
    s.rect(340,65,15,245); s.line(347,60,347,320,GRAY,False,True)
    s.charge(505,185); s.charge(190,185,'−q'); s.text(455,100,'真实区域 z > 0'); s.text(110,280,'虚设镜像'); s.text(390,280,'φ = 0'); s.line(355,235,505,235); s.text(415,260,'d'); save(3,'image-plane',s)
    s=SVG('接地球与孤立球的镜像','球外点电荷 q，球内像 q′ 位于 b=R²/a；孤立球另加中心像 Q0−q′．')
    s.circle(280,195,100,'#edf2f7'); s.line(95,195,650,195,GRAY,False,True)
    s.charge(580,195); s.charge(320,195,'q′'); s.circle(280,195,5,RED)
    s.text(230,85,'半径 R'); s.text(230,285,'O'); s.text(305,240,'b'); s.line(280,310,580,310); s.text(415,335,'a'); save(3,'image-sphere',s)
    s=SVG('平板、球形与同轴圆柱电容器','几何与边界决定 C；双导体之间以等量异号电荷定义两端电容．')
    s.rect(90,115,12,160);s.rect(195,115,12,160);s.text(125,305,'d')
    for r in (45,95):s.circle(365,195,r)
    for x in (550,595,630,675):s.line(x,100,x,290,BLUE)
    s.text(60,80,'平板');s.text(330,80,'同心球');s.text(550,80,'同轴柱截面');save(4,'capacitors',s)
    s=SVG('中性金属板插入电容器','中间金属厚 t，内部 E=0；两真空间隙串联，有效间距 d−t．')
    for x,w in ((100,12),(295,100),(600,12)):s.rect(x,90,w,220)
    s.text(315,185,'E=0');s.text(195,260,'d₁');s.text(470,260,'d₂');s.text(335,330,'t');save(4,'metal-insert',s)
    s=SVG('逐个组装点电荷','先放第一颗不需相互作用功；后放入的电荷只计已有电荷的势，电荷对仅计一次．')
    for x,y,label in ((180,245,'q₁'),(380,100,'q₂'),(560,245,'q₃')):s.charge(x,y,label)
    s.line(180,245,380,100,BLUE);s.line(380,100,560,245,BLUE);s.line(180,245,560,245,BLUE);s.text(245,310,'W = Σ(i < j) k qi qj / rij');save(4,'assembly',s)
    save(4,'self-energy',graph('场能径向积分的分布','实心球内部积分核正比 r⁴，外部正比 r⁻²；面积表示相应归一化能量贡献．',[('r² E²（归一化）',BLUE,lambda r:r**4 if r<1 else 1/r**2)]))
    s=SVG('固定电压时的能量收支','电容增加 dC>0，电源输入 U²dC，一半增加场能，一半输出机械功．')
    s.rect(40,145,165,90);s.text(65,180,'电源输入');s.text(65,210,'U² dC')
    s.line(205,170,440,100,BLUE,True);s.line(205,210,440,270,RED,True)
    s.text(455,100,'场能增加 ½ U² dC');s.text(455,280,'机械输出 ½ U² dC');s.text(80,320,'固定 Q：没有电源输入，机械输出来自场能减少');save(4,'energy-balance',s)
    s=SVG('偶极子的转矩与非均匀场合力','均匀场中两端力反向等大形成力偶；非均匀场中还可有净力．')
    for y in (100,180,260):s.line(80,y,630,y,BLUE,True)
    s.charge(270,240,'−q');s.charge(400,130);s.line(280,230,385,145,RED,True)
    s.line(400,130,500,130,RED,True);s.line(270,240,170,240,RED,True);s.text(325,205,'p');save(4,'dipole-force',s)
    s=SVG('由分子偶极到宏观极化','箭头表示偶极矩，由负端指向正端；单位体积的矢量和定义 P．')
    s.rect(95,80,530,230,'#f1f6fb')
    for x in (150,290,430,570):
        for y in (130,230):
            s.charge(x-20,y,'−');s.charge(x+20,y,'+');s.line(x-8,y,x+8,y,RED,True)
    s.text(235,335,'P = 单位体积的偶极矩矢量和');save(5,'polarization',s)
    s=SVG('束缚电荷与法向','均匀 P 沿右方，左右两面分别出现负、正束缚电荷；上下表面 P·n=0．')
    s.rect(200,85,300,230,'#f1f6fb')
    for y in (125,185,245):s.text(205,y,'−',BLUE);s.text(475,y,'+',RED)
    s.line(285,195,425,195,BLUE,True);s.text(345,175,'P');s.line(500,150,590,150,RED,True);s.text(550,130,'n');s.text(245,335,'σb = P·n；ρb = −∇·P');save(5,'bound-charge',s)
    s=SVG('均匀极化球的退极化场','球内均匀附加场 E′=−P/(3ε₀)，与 P 相反；球外为总偶极矩的场．')
    s.circle(345,195,120,'#f1f6fb')
    s.line(280,165,415,165,BLUE,True);s.text(335,145,'P')
    s.line(415,235,280,235,RED,True);s.text(335,270,'E′');s.text(195,70,'左侧束缚负电荷，右侧束缚正电荷');save(5,'polarization-sphere',s)
    s=SVG('介质界面的法向与切向条件','n 从介质1指向介质2；小柱给 Dn 跃变，小回路给 Et 连续．')
    s.rect(60,80,600,120,'#edf6ff');s.rect(60,200,600,120,'#fff3e6')
    s.text(90,125,'介质 2');s.text(90,280,'介质 1');s.line(330,250,330,125,RED,True);s.text(345,150,'n')
    s.rect(440,160,80,80,'none',BLUE);s.text(460,110,'D₂n − D₁n = σf');s.text(415,295,'E₂t = E₁t');save(5,'interface',s)
    s=SVG('介质插入平行板电容器','插入长度 x 增大时电容增大；准静态力指向插入方向，固定电压时计入电源功．')
    s.rect(160,90,470,12);s.rect(160,280,470,12);s.rect(80,120,300,140,'#d6e8f5',BLUE)
    s.line(230,190,460,190,RED,True);s.text(320,170,'F，x 增大');s.text(490,220,'真空');save(5,'dielectric-insert',s)
    return out


def numerical_checks():
    # Central difference of an exact dipole potential vs independently summed E.
    for x,y in ((1.3,.4),(-1.5,.8),(.1,1.2)):
        def phi(a,b): return 1/math.hypot(a+.7,b)-1/math.hypot(a-.7,b)
        h=1e-5; ex,ey=dipole_field(x,y)
        assert math.isclose(-(phi(x+h,y)-phi(x-h,y))/(2*h),ex,rel_tol=1e-7)
        assert math.isclose(-(phi(x,y+h)-phi(x,y-h))/(2*h),ey,rel_tol=1e-7)
    # Grounded sphere: mirror construction vanishes on every sampled surface point.
    a,R=3.,1.; qp,b=-R/a,R*R/a
    for i in range(101):
        t=math.pi*i/100
        d1=math.sqrt(R*R+a*a-2*R*a*math.cos(t))
        d2=math.sqrt(R*R+b*b-2*R*b*math.cos(t))
        assert abs(1/d1+qp/d2)<1e-12
    # Independent quadrature: grounded plane induced charge integrates to -q.
    # r=d*tan(t) maps the infinite surface to a finite interval.
    n=10000; dt=(math.pi/2)/n
    total=sum(-math.sin((i+.5)*dt)*dt for i in range(n))
    assert abs(total+1)<2e-8
    # Fixed-voltage force includes source work, matching Coulomb pressure.
    d,U,A,eps=2.,3.,5.,7.; h=1e-5
    C=lambda z:eps*A/z
    force=.5*U*U*(C(d+h)-C(d-h))/(2*h)
    assert math.isclose(force,-.5*eps*A*(U/d)**2,rel_tol=1e-8)
    # Off-centre Coulomb source: integrate flux over a sphere independently
    # of its position, including an exterior source with zero net flux.
    n=20000
    for a,expected in ((.4,4*math.pi),(1.8,0.)):
        flux=0.
        for i in range(n):
            u=-1+(i+.5)*2/n
            flux += 2*math.pi*(1-a*u)/(1+a*a-2*a*u)**1.5*2/n
        assert abs(flux-expected)<1e-6
    # Sphere surface density quadrature reproduces grounded induced charge.
    a,R,q=3.,1.,2.
    total=0.
    for i in range(n):
        u=-1+(i+.5)*2/n
        sigma=-q*(a*a-R*R)/(4*math.pi*R*(a*a+R*R-2*a*R*u)**1.5)
        total += sigma*2*math.pi*R*R*2/n
    assert math.isclose(total,-q*R/a,rel_tol=1e-8)
    # Planar square quadrupole: exact four-source sum vs leading potential.
    for distance in (20.,40.):
        x,y,z=distance,1.3*distance,.4*distance
        exact=sum(q/math.sqrt((x-a)**2+(y-b)**2+z*z)
                  for q,a,b in ((1,1,1),(1,-1,-1),(-1,1,-1),(-1,-1,1)))
        leading=12*x*y/(x*x+y*y+z*z)**2.5
        assert math.isclose(exact,leading,rel_tol=.004)
    # Dielectric sphere: potential and D-normal conditions at every angle.
    eps,eps0,E0,R=4.,1.,2.,3.
    A=3*eps0*E0/(eps+2*eps0)
    B=(eps-eps0)*E0*R**3/(eps+2*eps0)
    for t in (0.,.3,1.,2.,math.pi):
        c=math.cos(t)
        assert math.isclose(-A*R*c,-E0*R*c+B*c/R**2,abs_tol=1e-12)
        assert math.isclose(eps*A*c,eps0*(E0+2*B/R**3)*c,abs_tol=1e-12)
    # Uniform unit sphere, k=Q=R=1: integrate rho*phi/2 and E^2/2
    # by independent radial quadratures. Exterior radial energy is analytic.
    charge_energy=sum(.5*3*((3-((i+.5)/n)**2)/2)*((i+.5)/n)**2/n for i in range(n))
    field_energy=.5+sum(.5*((i+.5)/n)**4/n for i in range(n))
    assert math.isclose(charge_energy,.6,abs_tol=1e-8)
    assert math.isclose(field_energy,charge_energy,abs_tol=1e-8)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    numerical_checks()
    outputs=artifacts()
    for relative,content in outputs.items():
        path=ROOT/relative
        if args.check:
            if not path.exists() or path.read_text(encoding='utf-8')!=content:
                raise SystemExit(f'Figure out of date: {path}')
        else:
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_text(content,encoding='utf-8',newline='\n')
    print(f'{len(outputs)} SVG figures {"verified" if args.check else "generated"}; numerical cross-checks passed.')


if __name__=='__main__':
    main()
