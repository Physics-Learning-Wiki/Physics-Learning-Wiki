"""Independent numerical checks of the error-analysis teaching material.

uv run --with numpy --with scipy python scripts/verify-error-analysis.py
No question answers or review attestations are modified.
"""
from pathlib import Path
import json
import math
from decimal import Decimal, ROUND_HALF_EVEN
import numpy as np
from scipy import stats, optimize
import yaml

ROOT = Path(__file__).resolve().parents[1]
results = {}


def record(name, value, expected=None, atol=1e-8):
    if expected is not None:
        np.testing.assert_allclose(value, expected, atol=atol, rtol=1e-6, err_msg=name)
    results[name] = np.asarray(value).tolist()


times = np.array([40.12,40.08,40.16,40.10,40.14,40.06,40.18,40.10,40.12,40.14])
period = times / 20
record("timing_mean_s", times.mean(),40.12)
record("timing_residual_sum_s2", np.sum((times-times.mean())**2),.012)
record("period_sample_sd_s", period.std(ddof=1),.001825741858)
record("period_sem_s", stats.sem(period),.000577350269)
record("period_ci95_half_s",stats.t.ppf(.975,9)*stats.sem(period),.00130605704689)
# Direct model finite differences, independent of the examples' analytic derivatives.
model=lambda l,T: 4*math.pi**2*l/T**2
l,T=1.,period.mean()
steps=[1e-6,1e-6]
jac=np.array([(model(l+steps[0],T)-model(l-steps[0],T))/(2*steps[0]),
              (model(l,T+steps[1])-model(l,T-steps[1]))/(2*steps[1])])
u_l=math.hypot(.001/math.sqrt(12),.0002)
u_T=math.hypot(stats.sem(period),.02/20)
record("pendulum_g_m_s2",model(l,T),9.81065219207)
record("pendulum_u_g_m_s2",np.linalg.norm(jac*np.array([u_l,u_T])),.01180830297)

lengths=np.array([10.,10.3,9.8]); u=np.array([.1,.2,.1]); w=1/u**2
record("weighted_length_mm",np.average(lengths,weights=w),9.9444444444)
record("weighted_length_u_mm",1/math.sqrt(w.sum()),.06666666667)
record("effective_df",(.03**2+.04**2)**2/(.03**4/9+.04**4/8),15.243902439)

# Direct least-squares solve rather than copied closed-form coefficient formulas.
x=np.arange(10.,61.,10.)
y=np.array([1000.171,1000.337,1000.516,1000.675,1000.859,1001.012])
u=np.array([.01,.01,.015,.015,.02,.02])
A=np.column_stack([np.ones(len(x)),x])
beta=np.linalg.lstsq(A,y,rcond=None)[0]
record("copper_ordinary_parameters",beta,[1000.002,.0169428571429])
record("copper_ordinary_sse",np.sum((y-A@beta)**2),.000210285714286)
Aw=A/u[:,None]; yw=y/u
beta=np.linalg.lstsq(Aw,yw,rcond=None)[0]
cov=np.linalg.inv(Aw.T@Aw)
gradient=np.array([-beta[1]/beta[0]**2,1/beta[0]])
record("copper_weighted_parameters",beta,[1000.000644,.016960628])
record("copper_alpha_per_K",beta[1]/beta[0],1.69606166964e-5)
record("copper_u_alpha_per_K",math.sqrt(gradient@cov@gradient),3.49551351375e-7)
record("copper_chi_square",np.sum(((y-A@beta)/u)**2),.715883)

A=np.array([[1,0,0],[0,1,0],[0,0,1],[1,1,0],[0,1,1],[1,1,1]],dtype=float)
y=np.array([10.02,19.99,30.01,30.04,49.98,60.03])
beta=np.linalg.lstsq(A,y,rcond=None)[0]
record("combined_lengths_mm",beta,[10.035,19.9925,30.])
record("combined_sse_mm2",np.sum((y-A@beta)**2),.000650)
record("combined_inverse_normal_matrix",np.linalg.inv(A.T@A))
np.testing.assert_allclose(A.T@(y-A@beta),0,atol=1e-10)

x=np.arange(5.); y=np.array([1.,2.2,2.8,4.2,4.8])
A=np.column_stack([np.ones(len(x)),x]); beta=np.linalg.lstsq(A,y,rcond=None)[0]
sst=np.sum((y-y.mean())**2); sse=np.sum((y-A@beta)**2); ssr=sst-sse
record("regression_coefficients",beta,[1.08,.96])
record("regression_sst_ssr_sse_F",[sst,ssr,sse,ssr/(sse/3)],[9.36,9.216,.144,192])
record("regression_F_p",stats.f.sf(ssr/(sse/3),1,3),.000813646)
record("regression_mean_and_prediction_halfwidth",stats.t.ppf(.975,3)*np.sqrt(sse/3)*np.sqrt([.3,1.3]),[.38189355,.79497455],atol=1e-6)
x_rep=np.repeat([0.,1.,2.],2); y_rep=np.array([.9,1.1,2.4,2.6,4.9,5.1])
A_rep=np.column_stack([np.ones(6),x_rep]); beta_rep=np.linalg.lstsq(A_rep,y_rep,rcond=None)[0]
group_means=y_rep.reshape(3,2).mean(axis=1)
pure=np.sum((y_rep-np.repeat(group_means,2))**2)
lack=np.sum((np.repeat(group_means,2)-A_rep@beta_rep)**2)
record("lack_of_fit_pure_lack_F",[pure,lack,lack/(pure/3)],[.06,1/3,50/3])

times=np.arange(5.); voltage=np.array([5.02,3.70,2.76,2.03,1.52])
fit=optimize.least_squares(lambda p:p[0]*np.exp(-p[1]*times)-voltage,[4.8,.25],
                           xtol=1e-13,ftol=1e-13,gtol=1e-13)
record("decay_parameters",fit.x,[5.013523,.299970],atol=1e-6)
record("decay_sse",np.sum(fit.fun**2),.000482288,atol=1e-9)
cov=np.linalg.inv(fit.jac.T@fit.jac)*np.sum(fit.fun**2)/3
record("decay_parameter_sd",np.sqrt(np.diag(cov)),[.011362682075,.001518204701])

cylinder=lambda d,h:math.pi*d*d*h/4
d,h=20.,30.; step=1e-5
cd=(cylinder(d+step,h)-cylinder(d-step,h))/(2*step)
ch=(cylinder(d,h+step)-cylinder(d,h-step))/(2*step)
record("cylinder_volume_mm3",cylinder(d,h),9424.77796077)
record("cylinder_u_mm3",math.hypot(cd*.02,ch*.03),21.074444193)
record("sagitta_signed_correction_mm",(-500**2/(4*50**2)+1)*(-.1)+(500/(2*50))*1,7.4)
record("sagitta_corrected_model_mm",499**2/(4*50.1)+50.1,1292.61996008)
data=np.array([9.9,10.,10.,10.,10.1,10.8])
g=np.max(abs(data-data.mean()))/np.std(data,ddof=1)
critical_t=stats.t.ppf(1-.05/(2*len(data)),len(data)-2)
gc=(len(data)-1)/math.sqrt(len(data))*math.sqrt(critical_t**2/(len(data)-2+critical_t**2))
record("outlier_Grubbs_statistic_and_critical",[g,gc])
# Source discrepancy checks: values transcribed from visually checked PDF pages.
d=np.array([10.075,10.085,10.095,10.060,10.085,10.080])
h=np.array([10.105,10.115,10.115,10.110,10.110,10.115])
record("source_06_p26_means_mm",[d.mean(),h.mean()],[10.08,10.1116666667])
record("source_06_p27_mean_sd_mm",[stats.sem(d),stats.sem(h)],[.0048304589154,.0016666666667])
record("source_06_p26_volume_mm3",cylinder(d.mean(),h.mean()),806.925965110)
record("source_08_p42_residual_sse_mm2",np.sum(np.array([-.013,.002,.007,.005,-.015,.008])**2),.000536)

# Original existing numeric questions: compute from their stated inputs, then
# compare against each live YAML answer and its declared tolerance.
qvalues={105:15.08-.03,106:(12.06-12)/12,113:20*.005,114:.1/4*100,115:.0004/2,
123:.02/math.sqrt(12),124:round(9.8106529,3),
125:float(Decimal('4.51050').quantize(Decimal('.001'),rounding=ROUND_HALF_EVEN)),
135:.08/math.sqrt(16),136:.1*math.sqrt(2/math.pi),137:sum(v-1.01 for v in [1.,1.01,1.01]),
147:(2/.1**2+2.3/.2**2)/(1/.1**2+1/.2**2),148:1/math.sqrt(1/.1**2+1/.2**2),149:math.hypot(.06,.08),
159:sum(v-10 for v in [9.8,9.9])-sum(v-10 for v in [10.1,10.2]),
160:math.hypot(.02,.03),161:(5.03-(-4.97))/2,
171:(10.8-10)/math.sqrt(.005*(1+1/5)),172:(1.3-1.04)/(1.3-1),173:(10.8-10)/.2,
183:.06/math.sqrt(3),184:1/(2*.25**2),185:(.06-(-.02))/math.sqrt(12),
195:.03-2*.01,196:.001/math.sqrt(1-.5**2),197:math.sqrt(.1**2+.1**2+2*.5*.1*.1),
207:1/math.sqrt(2),208:math.sqrt(1-(100*.008)**2)/50,209:math.sqrt(1-.95**2),
219:np.polyfit([0,1,2],[1,3,5],1)[0],220:.04/(6-2),221:.017/1000,
231:8-3,232:.12/(9-3),233:math.sqrt(4),241:math.exp(-.3*0),242:-5*0*math.exp(-.3*0),243:.25+.0480523,
251:6-3,252:math.sqrt(.00065/3),253:.02*math.sqrt(.5),
263:math.sqrt(.001**2+(2*.002)**2),264:math.hypot(3,4),265:-100*(1*1e-6+1e-5*.1),
777:np.std([10.,10.2,9.8,10.],ddof=1),778:3.18245*stats.sem([10.,10.2,9.8,10.]),
788:(500/(2*50))*1+(1-500**2/(4*50**2))*(-.1)}
checked=[]; uncovered=[]
for path in sorted((ROOT/'question-bank/questions/experiment/error-analysis').rglob('*.yml')):
    q=yaml.safe_load(path.read_text(encoding='utf-8'))
    if q['type']!='numeric': continue
    number=int(q['id'][2:])
    if number not in qvalues:
        uncovered.append(q['id']); continue
    actual=float(qvalues[number]); answer=q['answer']; tolerance=answer['tolerance']
    allowed=tolerance['value'] * (abs(answer['value']) if tolerance['type']=='relative' else 1)
    assert abs(actual-answer['value'])<=allowed+1e-12, (q['id'],actual,answer)
    checked.append({'id':q['id'],'computed':actual,'answer':answer['value']})
results['numeric_questions']=checked
results['numeric_questions_not_yet_covered']=uncovered
assert not uncovered, f'Add independent calculations for new numeric questions: {uncovered}'
out=ROOT/'reports/error-analysis-rebuild/numerical-results.json'
out.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(checked)} numeric questions checked; uncovered: {uncovered}')
print(f'{len(results)-2} example quantities checked; wrote {out}')
