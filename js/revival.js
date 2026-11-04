import { free } from "./data.js";

export function revivalRules(g, s) {
  const f = s.f, id = 'r' + s.r + 'p4' + f;
  const value = name => g.values[id + '-' + name];
  const hasTleilaxu = g.selected.includes('Tleilaxu');
  const ally = g.alliances && g.selected.includes(value('ally')) && value('ally') !== f ? value('ally') : '';
  const allowance = ally === 'Fremen' ? 3 : free[f];
  const cap = ['Tleilaxu', 'CHOAM'].includes(f) ? 20 : hasTleilaxu && value('permission') === 'yes' ? 5 : 3;
  const discount = f === 'Tleilaxu' || ally === 'Tleilaxu';
  const price = amount => discount ? Math.ceil(amount / 2) : amount;
  const troops = Math.min(cap, Math.max(0, Number(value('troops') || 0)));
  const cyborgs = f === 'Ixians' ? Math.min(troops, 7, Math.max(0, Number(value('cyborgs') || 0))) : 0;
  const paidCyborgs = Math.max(0, cyborgs - allowance);
  const paidOthers = Math.max(0, troops - cyborgs - Math.max(0, allowance - cyborgs));
  const extra = ally === 'Emperor' ? Math.min(3, 20 - troops, Math.max(0, Number(value('emperor') || 0))) : 0;
  const extraCyborgs = f === 'Ixians' ? Math.min(extra, 7 - cyborgs, Math.max(0, Number(value('emperor-cyborgs') || 0))) : 0;
  return { id, ally, allowance, cap, troops, cyborgs, extra, extraCyborgs, price,
    cost: price(paidCyborgs * 3 + paidOthers * (f === 'CHOAM' ? 1 : 2)),
    recipient: hasTleilaxu && f !== 'Tleilaxu' ? 'Тлейлаксу' : 'банк спайса' };
}

export function normalizeRevival(g, s) {
  const x = revivalRules(g, s);
  if (x.id + '-troops' in g.values) g.values[x.id + '-troops'] = x.troops;
  if (x.id + '-cyborgs' in g.values) g.values[x.id + '-cyborgs'] = Math.max(x.cyborgs, s.f === 'Ixians' ? x.troops - 13 : 0);
  if (x.id + '-emperor' in g.values) g.values[x.id + '-emperor'] = x.extra;
  if (x.id + '-emperor-cyborgs' in g.values) g.values[x.id + '-emperor-cyborgs'] = x.extraCyborgs;
}
