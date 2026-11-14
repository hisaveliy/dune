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

// The coin symbols in the Occupied section give the bank payout in Spice Collection.
const occupationEffects = {
  Atreides: [2, 'Оккупант разделяет предвидение Атрейдесов на Bidding и может смотреть карты, выставляемые на торги.'],
  Harkonnen: [2, 'Когда Харконнены покупают Treachery Card, их дополнительную бесплатную карту получает оккупант или его союзник при наличии места в руке.'],
  Fremen: [0, 'Оккупант получает половину всего спайса, который Фремены собирают в Spice Collection, с округлением вниз.'],
  Emperor: [2, 'Оккупант получает половину каждого платежа за Treachery Card, причитающегося Императору, с округлением вниз.'],
  salusa: [0, 'Sardaukar Императора теряют своё фракционное преимущество.'],
  Guild: [2, 'Оккупант получает половину платежей других игроков за высадку, причитающихся Гильдии, с округлением вниз.'],
  'Bene Gesserit': [1, 'Оккупант и его союзник защищены от Voice.'],
  Ixians: [2, 'Оккупант получает преимущество Иксиан на Bidding: смотрит карты, взятые для торгов, и выбирает одну для удаления из торгов.'],
  Tleilaxu: [2, 'Тлейлаксу не могут раскрывать Face Dancers против оккупанта или его союзника.'],
  CHOAM: [2, 'Лимит руки оккупанта и его союзника увеличивается на 1. После окончания оккупации они сбрасывают лишние карты до обычного лимита. CHOAM теряет преимущество Low Threshold.'],
  Richese: [1, 'Оккупант выбирает, какую карту из запаса Richese выставят на торги, и получает половину платежа Richese с округлением вниз.'],
  Ecaz: [2, 'Оккупант или его союзник получает Duke Vidal и может воскресить его из Tanks. Этот эффект имеет приоритет над обычными способностями Ecaz и Moritani, связанными с Vidal.'],
  Moritani: [2, 'Moritani не могут раскрыть Terror Token, когда оккупант или его союзник входит в территорию с этим жетоном.']
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
      const factionKey = key + '-faction';
      const [income, effect] = occupationEffects[id];
      const faction = game.values[factionKey];
      if (game.selected.includes(faction)) {
        return { id, name, native, factionKey, income, effect, recorded: true,
          occupier: faction === native ? '' : faction };
      }

      const forces = forcesAt(game, key);
      const reserve = forces.find(force => force.faction === native).count;
      const visitors = forces.filter(force => force.faction !== native && force.count > 0);
      const chosen = game.values[key + '-occupier'];
      const confirmed = reserve !== null && visitors.some(force => force.faction === chosen);
      const automatic = reserve === 0 && visitors.length === 1 ? visitors[0].faction : '';
      const occupier = automatic || (confirmed ? chosen : '');
      return { id, name, native, factionKey, income, effect, occupier,
        recorded: reserve !== null || visitors.length > 0,
        needsReview: !occupier && visitors.length > 0 && chosen !== 'none' };
    })
  };
}
