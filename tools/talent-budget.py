"""Jednorázová úprava čísel talentů podle rozpočtu z docs/herni-design.md (kap. 4b).
Přepíše hodnoty v js/talents.js (pasivky tP, zesílení tE, klíčové tKEY, volby tC) a v popisech nahradí stará čísla
novými. Co nejde nahradit jednoznačně, vypíše k ruční kontrole. Spuštění: python3 tools/talent-budget.py [--dry]
Skript je uložený pro dohledatelnost – podruhé ho nespouštěj (zmenšil by čísla znovu)."""
import re, sys

DRY = '--dry' in sys.argv
P = 'js/talents.js'
src = open(P, encoding='utf-8').read()

GEN_DMG = {'atkPct', 'firePct', 'frostPct', 'arcanePct', 'naturePct', 'shadowPct', 'physPct', 'dotPct', 'petPct', 'skelPct', 'execPct',
           'burnBonus', 'slowedBonus', 'dottedBonus', 'stunDmg', 'lowHpDmg', 'enrage_atkPct', 'th_atkPct', 'dw1_atkPct', 'bear_atkPct',
           'combust_atkPct', 'dsoul_shadowPct', 'critDmg', 'th_critDmg', 'enrage_critDmg', 'skillPct', 'eclipse', 'auraPct', 'armorPen',
           'resPen', 'vulnPct', 'doubleChance', 'thorns', 'bear_thorns', 'cdr'}
CRIT = {'crit', 'avatar_crit', 'moonkin_crit', 'wolf_crit', 'strafe_crit', 'dw_crit'}
DEF = {'dmgRed', 'bear_dmgRed', 'avatar_dmgRed', 'enrage_dmgRed', 'moonkin_dmgRed'}
HP = {'hpPct', 'bear_hpPct'}
SPD = {'spdPct', 'dw_spdPct', 'enrage_spdPct', 'wolf_spdPct', 'bwrath_petSpd'}
# pevné nové hodnoty (léčení z poškození a pár rasových)
FIXED = {'ls': 0.005, 'wolf_ls': None, 'skheal_bloodthirst': 0.05, 'skheal_drain': 0.1, 'skheal_harvest': 0.06, 'skheal_whirl': 0.03,
         'skheal_hwill': 0.15, 'meta_ls': 0.03, 'bloodfury_ls': 0.03, 'stoneSkin': 0.3, 'revenge': 0.1, 'dodgeAtk': 0.1, 'stealthDmg': 0.5,
         'stoneform_thorns': 0.25, 'boneShield': 0.02, 'regen': 0.002}

def rnd(x):
    s = -1 if x < 0 else 1; x = abs(x)
    v = round(x / 0.005) * 0.005 if x < 0.1 else round(x, 2)
    return s * max(0.005, round(v, 4))

def newval(k, v, ntype, rank_max):
    rank = ntype == 'passive' and rank_max > 1
    if k == 'ls' and v > 0.01: return 0.02          # válečník Krvavá výdrž (jednorázově)
    if k == 'wolf_ls': return 0.01 if v <= 0.02 else 0.02
    if k == 'petLs': return 0.01 if v <= 0.03 else 0.02
    if k == 'killHeal': return 0.005 if v <= 0.02 else 0.015
    if k in FIXED and FIXED[k] is not None: return FIXED[k]
    if k.startswith('skd_') or k.startswith('skdot_'): return rnd(v * 0.5)
    if k in GEN_DMG: return rnd(v * (0.6 if rank else 0.5))
    if k in CRIT: return rnd(v * (0.6 if rank else 0.5))
    if k in DEF: return rnd(v * 0.5)
    if k in HP: return 0.03 if rank and v == 0.04 else rnd(v * 0.6)
    if k in SPD: return rnd(v * 0.6)
    if k == 'dodge' and v > 0.05: return 0.08
    return v

def pct(x):
    t = ('%g' % round(x * 100, 1)).replace('.', ',')
    return t

def fmt_js(x):
    return ('%g' % x) if x != int(x) else str(int(x))

report = []
CALL = re.compile(r"(tP|tE|tKEY)\('((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'(, (\d+))?, (\{[^{}]*\})\)")
OPT = re.compile(r"\['((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)', (\{[^{}]*\})\]")
KV = re.compile(r"([A-Za-z_0-9]+): (-?[0-9.]+)")

def fix(name, desc, stats_txt, ntype, rank_max):
    changes = []
    def repl(m):
        k, v = m.group(1), float(m.group(2))
        nv = newval(k, v, ntype, rank_max)
        if abs(nv - v) > 1e-9: changes.append((k, v, nv))
        return f"{k}: {fmt_js(nv)}"
    new_stats = KV.sub(repl, stats_txt)
    nd = desc
    for k, v, nv in changes:
        old, new = pct(abs(v)), pct(abs(nv))
        rx = re.compile(r"(?<![\d,])" + re.escape(old) + r"(?=\s?%)")
        hits = len(rx.findall(nd))
        others = [c for c in changes if c is not (k, v, nv) and pct(abs(c[1])) == old and abs(c[2] - nv) > 1e-9]
        if hits == 0 or others:
            report.append(f"RUČNĚ  {name}: {k} {v}→{nv}  popis: {desc}")
        else:
            nd = rx.sub(new, nd)
    return nd, new_stats, changes

total = 0
def sub_call(m):
    global total
    fn, name, desc, _, mx, stats = m.groups()
    ntype = {'tP': 'passive', 'tE': 'enh', 'tKEY': 'key'}[fn]
    nd, ns, ch = fix(name, desc, stats, ntype, int(mx or 1))
    total += len(ch)
    return f"{fn}('{name}', '{nd}'{', ' + mx if mx else ''}, {ns})"
src2 = CALL.sub(sub_call, src)
def sub_opt(m):
    global total
    name, desc, stats = m.groups()
    nd, ns, ch = fix(name, desc, stats, 'choice', 1)
    total += len(ch)
    return f"['{name}', '{nd}', {ns}]"
src2 = OPT.sub(sub_opt, src2)
print('změněných hodnot:', total)
print('\n'.join(report))
if not DRY: open(P, 'w', encoding='utf-8').write(src2)
