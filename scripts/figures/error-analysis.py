"""Rebuild original error-analysis teaching figures (no slide images copied).

Run from repository root:
uv run --with numpy --with scipy --with matplotlib python scripts/figures/error-analysis.py
SVGs keep editable text; PNG previews go to an ignored directory.
"""
from pathlib import Path
import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from scipy.stats import norm, t

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/experiment/error-analysis/images"
PREVIEW = ROOT / ".tmp-error-analysis/rebuild/figures"
FONT = Path("C:/Windows/Fonts/msyh.ttc")
if FONT.exists():
    font_manager.fontManager.addfont(str(FONT))
    plt.rcParams["font.family"] = font_manager.FontProperties(fname=FONT).get_name()
plt.rcParams.update({"font.size": 12, "svg.fonttype": "none", "svg.hashsalt": "plw-error-analysis",
                     "axes.spines.top": False, "axes.spines.right": False,
                     "axes.unicode_minus": False, "figure.facecolor": "white"})
BLUE, ORANGE, GREEN, GRAY = "#126e91", "#b45222", "#26734a", "#53616d"


def save(fig, name):
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT / f"{name}.svg", bbox_inches="tight", metadata={"Date": None,
                "Creator": "Physics Learning Wiki; scripts/figures/error-analysis.py"})
    fig.savefig(PREVIEW / f"{name}.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def sampling():
    x = np.linspace(-3.6, 3.6, 800)
    fig, ax = plt.subplots(figsize=(8, 4.7), layout="constrained")
    ax.plot(x, norm.pdf(x), color=BLUE, lw=2.5, label="单次观测：标准差 σ = 1")
    ax.plot(x, norm.pdf(x, scale=1/3), color=ORANGE, lw=2.5,
            label="9 次独立观测的均值：σ / √9 = 1/3")
    ax.fill_between(x, norm.pdf(x, scale=1/3), where=abs(x)<=1/3, color=ORANGE, alpha=.12)
    ax.axvline(0, color=GRAY, lw=.8, ls=":")
    ax.set(xlabel="相对于总体均值的位置（以单次标准差为单位）", ylabel="概率密度",
           title="平均后分布变窄，中心保持不变", xlim=(-3.6, 3.6), ylim=(0, 1.4))
    ax.legend(loc="upper right", fontsize=10)
    ax.text(-3.4, 1.15, "正态、独立、同方差模型\n两条曲线下的总面积均为 1", fontsize=10, color=GRAY)
    save(fig, "sampling-distributions")


def coverage():
    fig, axes = plt.subplots(2, 1, figsize=(8, 7), layout="constrained")
    x = np.linspace(-4, 4, 1200)
    ax = axes[0]
    for bound, alpha in [(3, .10), (2, .20), (1, .35)]:
        ax.fill_between(x, norm.pdf(x), where=abs(x)<=bound, color=BLUE, alpha=alpha)
    ax.plot(x, norm.pdf(x), color=BLUE, lw=2)
    for y, bound, label in [(.11, 1, "68.27%"), (.065, 2, "95.45%"), (.02, 3, "99.73%")]:
        ax.annotate("", xy=(-bound,y), xytext=(bound,y), arrowprops={"arrowstyle":"|-|", "color":ORANGE})
        ax.text(0,y+.01,label,ha="center",fontsize=10, backgroundcolor="white")
    ax.set(title="正态模型：有限倍标准差对应覆盖概率", ylabel="概率密度", xlabel="误差 / σ", xlim=(-4,4))
    ax = axes[1]
    ax.plot(x,norm.pdf(x),color=BLUE,label="标准正态")
    ax.plot(x,t.pdf(x,9),color=ORANGE,label="Student t，自由度 9")
    for limit, color, label in [(norm.ppf(.975),BLUE,"±1.960"),(t.ppf(.975,9),ORANGE,"±2.262")]:
        for sign in [-1,1]:
            ax.axvline(sign*limit,color=color,ls="--",lw=1)
        ax.text(limit+.05,.24 if color==BLUE else .16,label,color=color,fontsize=10)
    ax.set(title="95% 双侧区间：估计未知尺度带来额外波动", xlabel="标准化统计量", ylabel="概率密度", xlim=(-4,4))
    ax.legend(fontsize=10)
    save(fig,"normal-coverage")


def weights():
    fig, ax = plt.subplots(figsize=(8, 4.6), layout="constrained")
    vals=np.array([10.,10.3,9.8]); u=np.array([.1,.2,.1]); w=1/u**2
    mean=np.sum(vals*w)/w.sum(); um=1/np.sqrt(w.sum())
    for i,(v,s) in enumerate(zip(vals,u)):
        ax.errorbar(v,3-i,xerr=s,fmt="o",capsize=6,color=BLUE,markersize=7)
        ax.text(10.65,3-i,f"相对权 {w[i]/25:g}",va="center",fontsize=11)
    ax.errorbar(mean,0,xerr=um,fmt="D",capsize=6,color=ORANGE,markersize=7)
    ax.axvline(mean,color=ORANGE,ls=":",lw=1)
    ax.set(yticks=[3,2,1,0],yticklabels=["观测 1","观测 2","观测 3","加权均值"],
           xlabel="长度 / mm", xlim=(9.5,11.1), ylim=(-.6,3.6),title="标准差缩小一半，逆方差权重增为四倍")
    ax.text(9.54,-.43,"误差棒：±1 个已知标准差；观测相互独立",fontsize=10,color=GRAY)
    save(fig,"weighted-mean")


def propagation():
    fig, ax = plt.subplots(figsize=(7, 5.2), layout="constrained")
    x=np.linspace(1.35,2.65,300)
    ax.plot(x,x*x,color=BLUE,lw=2.5,label="真实函数 y = x²")
    ax.plot(x,4+4*(x-2),color=ORANGE,lw=2,ls="--",label="局部线性式 y ≈ 4 + 4(x − 2)")
    ax.axvspan(1.8,2.2,color=GRAY,alpha=.08)
    for v in [1.8,2.,2.2]:
        ax.plot([v,v],[1.8,v*v],ls=":",color=GRAY,lw=1)
        ax.scatter([v],[v*v],color=BLUE,s=35,zorder=4)
    ax.annotate("真实范围 [3.24, 4.84]\n线性近似 [3.20, 4.80]",xy=(2.2,4.84),xytext=(1.40,5.5),
                fontsize=11,arrowprops={"arrowstyle":"->","color":GRAY})
    ax.set(xlabel="输入 x（无量纲）",ylabel="输出 y（无量纲）",title="灵敏系数就是工作点处的斜率",xlim=(1.35,2.65),ylim=(1.8,7.1))
    ax.legend(loc="lower right",fontsize=10)
    save(fig,"propagation-geometry")


def combined():
    fig, ax = plt.subplots(figsize=(8, 4.8), layout="constrained")
    positions=[0,10,30,60]
    ax.plot(positions,[0]*4,"o-",color=GRAY,lw=2)
    for p,label in zip(positions,"ABCD"):
        ax.text(p,-.24,label,ha="center",fontsize=14)
    for start,end,height,label in [(0,10,.65,"AB  10.02 mm"),(10,30,1.2,"BC  19.99 mm"),(30,60,1.75,"CD  30.01 mm"),
                                   (0,30,2.3,"AC  30.04 mm"),(10,60,2.85,"BD  49.98 mm"),(0,60,3.4,"AD  60.03 mm")]:
        ax.annotate("",xy=(start,height),xytext=(end,height),arrowprops={"arrowstyle":"|-|","color":BLUE})
        ax.text((start+end)/2,height+.08,label,ha="center",fontsize=11,color=BLUE)
    ax.text(30,-.7,"六个箭头对应六次独立读数；位置仅示意，不按读数逐点定标",ha="center",fontsize=10,color=GRAY)
    ax.set(xlim=(-5,65),ylim=(-.8,4),title="组合测量：用跨段观测共同估计三段长度")
    ax.axis("off")
    save(fig,"combined-observations")


def regression():
    fig, axes = plt.subplots(2,1,figsize=(8,6.4),height_ratios=[2,1],layout="constrained")
    x=np.arange(5); y=np.array([1,2.2,2.8,4.2,4.8]); fitted=1.08+.96*x
    ax=axes[0]
    ax.scatter(x,y,color=BLUE,s=42,label="观测")
    ax.plot(x,fitted,color=BLUE,label="拟合值 ŷ = 1.08 + 0.96x")
    ax.axhline(3,color=GRAY,ls="--",label=r"观测均值 $\bar{y} = 3$")
    for xx,lo,hi,c in [(3.15,3,4.2,GRAY),(3.40,3,3.96,GREEN),(3.65,3.96,4.2,ORANGE)]:
        ax.annotate("",xy=(xx,lo),xytext=(xx,hi),arrowprops={"arrowstyle":"|-|","color":c,"lw":2})
    ax.text(3.2,2.72,"1.20 = 0.96 + 0.24",fontsize=10)
    ax.set(xlim=(-.2,4.5),ylabel="响应 y（无量纲）",title="总偏差 = 回归解释的偏差 + 残差")
    ax.legend(loc="upper left",fontsize=10)
    ax=axes[1]
    ax.axhline(0,color=GRAY,lw=1)
    ax.vlines(x,0,y-fitted,color=ORANGE,lw=2)
    ax.scatter(x,y-fitted,color=ORANGE)
    ax.set(xlabel="输入 x（无量纲）",ylabel="残差 y − ŷ",ylim=(-.3,.3),xticks=x)
    save(fig,"regression-decomposition")


def budget():
    fig, ax = plt.subplots(figsize=(7.5,3.8),layout="constrained")
    contributions=np.array([.03,.04])
    fractions=contributions**2 / np.sum(contributions**2) * 100
    ax.barh([1,0],fractions,color=[BLUE,ORANGE],height=.48)
    for y,f,u in zip([1,0],fractions,contributions):
        ax.text(f+1,y,f"{f:.0f}%   （输出标准分量 {u:.2f} mm）",va="center",fontsize=11)
    ax.set(yticks=[1,0],yticklabels=["分量 1","分量 2"],xlim=(0,105),xticks=[0,20,40,60,80,100],
           xlabel="方差占比 / %",title="独立分量按平方合成：0.03² + 0.04² = 0.05²")
    save(fig,"uncertainty-budget")


def cancellation():
    fig, axes=plt.subplots(2,1,figsize=(8,4.8),layout="constrained")
    for ax,base,value,label in zip(axes,[5.,-5.],[5.03,-4.97],[r"正向读数 $r_+ = x + b$",r"反向读数 $r_- = -x + b$"]):
        ax.plot([base-.025,base+.065],[0,0],color=GRAY,lw=1)
        ax.scatter([base],[0],color=GRAY,s=45,label="无偏移位置")
        ax.scatter([value],[0],color=BLUE,s=45,label="实际读数")
        ax.annotate("",xy=(value,.16),xytext=(base,.16),arrowprops={"arrowstyle":"->","color":ORANGE,"lw":2})
        ax.text((base+value)/2,.24,"共同偏移 b = +0.03 mm",ha="center",fontsize=11,color=ORANGE)
        ax.text(base,-.18,f"{base:.2f}",ha="center",fontsize=11)
        ax.text(value,-.18,f"{value:.2f}",ha="center",fontsize=11)
        ax.set(xlim=(base-.025,base+.065),ylim=(-.35,.45),title=label)
        ax.axis("off")
    fig.suptitle("反向测量：半差消去共同偏移，半和估计偏移",fontsize=14)
    fig.supxlabel("两条局部数轴的刻度单位均为 mm；两次偏移须保持相同",fontsize=10)
    save(fig,"systematic-cancellation")


def chord():
    fig,ax=plt.subplots(figsize=(7,5),layout="constrained")
    angle=np.linspace(0,np.pi,500); radius=5.; height=1.; half=3.
    ax.plot(radius*np.cos(angle),radius*np.sin(angle),color=BLUE,lw=2)
    ax.plot([-half,half],[4,4],color=ORANGE,lw=2)
    ax.plot([0,0,half,0],[0,4,4,0],color=GRAY,lw=1.4)
    ax.scatter([0,0,half],[0,4,4],color=GRAY,s=25)
    ax.text(-.35,-.25,"O",fontsize=13)
    ax.text(half+.12,3.85,"A",fontsize=13)
    ax.text(-.45,3.7,"M",fontsize=13)
    ax.text(1.6,1.9,"R",fontsize=13)
    ax.text(-.3,2,"R − h",ha="right",fontsize=12)
    ax.text(1.5,3.65,"s / 2",ha="center",fontsize=12)
    ax.annotate("",xy=(0,4),xytext=(0,5),arrowprops={"arrowstyle":"|-|","color":GREEN,"lw":2})
    ax.text(.22,4.45,"h",color=GREEN,fontsize=13)
    ax.plot([0,.18,.18],[3.82,3.82,4],color=GRAY,lw=1)
    ax.text(0,-.7,"直角三角形 OMA：R² = (R − h)² + (s / 2)²",ha="center",fontsize=11)
    ax.set(xlim=(-5.5,5.5),ylim=(-1.05,5.7),title="由弦长与弓高求直径：D = 2R = s² / (4h) + h",aspect="equal")
    ax.axis("off")
    save(fig,"chord-sagitta")


if __name__ == "__main__":
    sampling(); coverage(); weights(); propagation(); combined(); regression()
    budget(); cancellation(); chord()
    print(f"Generated 9 original SVGs in {OUT}")
