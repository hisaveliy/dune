const strongholds = [
  { id: 'arr', name: 'Arrakeen', income: 2 },
  { id: 'car', name: 'Carthag', income: 2 },
  { id: 'tuek', name: 'Tuek’s Sietch', income: 1 },
  { id: 'tabr', name: 'Sietch Tabr' },
  { id: 'habbanya', name: 'Habbanya Sietch' }
];

const homeworldNames = {
  Atreides: 'Caladan',
  Harkonnen: 'Giedi Prime',
  Fremen: 'Arrakis · Южное полушарие',
  Emperor: 'Kaitain',
  Guild: 'Junction',
  'Bene Gesserit': 'Wallach IX',
  Ixians: 'Ix',
  Tleilaxu: 'Tleilax',
  CHOAM: 'Tupile',
  Richese: 'Richese',
  Ecaz: 'Ecaz',
  Moritani: 'Grumman'
};

const discoveryLocations = [
  { id: 'cistern', name: 'Cistern', income: 2 },
  { id: 'orgiz', name: 'Orgiz Processing Station' },
  { id: 'testing-station', name: 'Ecological Testing Station' },
  { id: 'shrine', name: 'Shrine' }
];

function forcesAt(game, id) {
  return game.selected.map(faction => {
    const key = id + '-' + faction;
    const raw = game.values[key];
    const count = raw === undefined || raw === '' ? null : Math.min(20, Math.max(0, Math.floor(Number(raw) || 0)));
    return { faction, key, count };
  });
}

export function boardPositions(game, round) {
  const prefix = `r${round}p6-position-`;
  const collection = `r${round}p7`;
  const ally = game.values[collection + '-ecaz-ally'];
  const alliance = game.alliances && game.selected.includes('Ecaz') && game.selected.includes(ally) && ally !== 'Ecaz'
    ? ['Ecaz', ally] : [];
  const locations = [...strongholds];
  if (game.selected.includes('Ixians')) locations.push({ id: 'ix-mobile', name: 'Hidden Mobile Stronghold' });
  if (game.modules.discovery) locations.push({ id: 'jacurutu', name: 'Jacurutu Sietch' });
  const forts = locations.map(({ id, name, income = 0 }) => {
    const key = prefix + id;
    const forces = forcesAt(game, key);
    const recorded = forces.some(force => force.count !== null);
    const legacyOwner = game.values[collection + '-owner-' + id];
    const legacy = game.selected.filter(f => game.checks[collection + f + '-' + id]);
    const owner = legacyOwner ?? (legacy.length === 1 ? legacy[0] : '');
    const occupants = recorded ? forces.filter(force => force.count > 0).map(force => force.faction)
      : alliance.includes(owner) && game.checks[`${collection}-shared-${id}-${ally}`] ? alliance
        : game.selected.includes(owner) ? [owner] : [];
    const previousFaction = occupants.length === 1 ? occupants[0] : '';
    const previousCount = forces.find(force => force.faction === previousFaction)?.count ?? '';
    const faction = game.values[key + '-faction'];
    const count = game.values[key + '-count'];
    const edited = faction !== undefined || count !== undefined;
    const selectedFaction = faction ?? previousFaction;
    const selectedCount = count ?? previousCount;
    if (edited) {
      const occupied = game.selected.includes(selectedFaction) && Number(selectedCount) > 0;
      return { id, key, name, income, faction: selectedFaction, count: selectedCount,
        recorded: selectedFaction === 'none' || occupied, occupants: occupied ? [selectedFaction] : [] };
    }
    const contested = occupants.length > 1 && !(occupants.length === 2 && occupants.every(f => alliance.includes(f)));
    return { id, key, name, income, faction: previousFaction || (recorded && !occupants.length ? 'none' : ''),
      count: previousCount, recorded, occupants, contested,
      needsReview: !recorded && legacyOwner === undefined && legacy.length > 1 };
  });

  const worlds = game.modules.homeworlds ? game.selected.map(native => ({ id: native, name: homeworldNames[native], native })) : [];
  if (game.modules.homeworlds && game.advanced && game.selected.includes('Emperor')) {
    worlds.splice(worlds.findIndex(world => world.native === 'Emperor') + 1, 0,
      { id: 'salusa', name: 'Salusa Secundus', native: 'Emperor' });
  }
  return {
    forts,
    discoveries: game.modules.discovery ? discoveryLocations.map(location => {
      const key = collection + '-owner-' + location.id;
      const owner = game.values[key];
      return { ...location, key, owner: game.selected.includes(owner) ? owner : '' };
    }) : [],
    homeworlds: worlds.map(({ id, name, native }) => {
      const key = prefix + 'world-' + id;
      const forces = forcesAt(game, key);
      const natives = forces.find(force => force.faction === native);
      const visitors = forces.filter(force => force.faction !== native && force.count > 0);
      const automatic = natives.count === 0 && visitors.length === 1 ? visitors[0].faction : '';
      const chosen = game.values[key + '-occupier'];
      const confirmed = natives.count !== null && visitors.some(force => force.faction === chosen);
      const occupier = automatic || (confirmed ? chosen : '');
      return { id, name, native, key, forces, visitors, occupier,
        disputed: !automatic && visitors.length > 0,
        needsReview: !automatic && visitors.length > 0 && !confirmed && chosen !== 'none',
        recorded: natives.count !== null };
    })
  };
}
