// GF9 CHOAM & Richese, pp. 7–8: Inflation affects the next two turns.
export function inflationPlacement(game) {
  if (!game.selected.includes('CHOAM')) return null;
  for (let round = 1; round < 10; round++) {
    const side = game.values['r' + round + 'p8-inflation'];
    if (side === 'double' || side === 'cancel') return { round, side };
  }
  return null;
}

export function charityFactor(game, round) {
  const placed = inflationPlacement(game);
  if (!placed || round <= placed.round || round > placed.round + 2) return 1;
  const doubled = round === placed.round + 1 ? placed.side === 'double' : placed.side === 'cancel';
  return doubled ? 2 : 0;
}

export function charitySummary(game, round) {
  const factor = charityFactor(game, round);
  const hasChoam = game.selected.includes('CHOAM');
  const payouts = game.selected.map(faction => {
    const bracket = String(game.values['r' + round + 'p2' + faction + '-bracket'] ?? '2');
    const ordinary = bracket === '0' ? 2 : bracket === '1' ? 1 : 0;
    const amount = faction === 'CHOAM' ? 0 : (faction === 'Bene Gesserit' && game.advanced ? 2 : ordinary) * factor;
    return { faction, amount };
  });
  const income = hasChoam ? game.selected.length * 2 * factor : 0;
  const paid = payouts.reduce((sum, payout) => sum + payout.amount, 0);
  return { factor, hasChoam, payouts, income, paid, remaining: income - paid };
}
