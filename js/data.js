export const F = ['Atreides', 'Harkonnen', 'Fremen', 'Emperor', 'Guild', 'Bene Gesserit', 'Ixians', 'Tleilaxu', 'CHOAM', 'Richese', 'Ecaz', 'Moritani'];
export const N = {
  Atreides: 'Атрейдесы',
  Harkonnen: 'Харконнены',
  Fremen: 'Фремены',
  Emperor: 'Император',
  Guild: 'Гильдия',
  'Bene Gesserit': 'Бене Гессерит',
  Ixians: 'Иксиане',
  Tleilaxu: 'Тлейлаксу',
  CHOAM: 'CHOAM',
  Richese: 'Richese',
  Ecaz: 'Ecaz',
  Moritani: 'Moritani'
};
export const P = ['Storm', 'Spice Blow & Nexus', 'CHOAM Charity', 'Bidding', 'Revival', 'Shipment & Movement', 'Battle', 'Spice Collection', 'Mentat Pause'];
export const free = {
  Atreides: 2,
  Harkonnen: 2,
  Fremen: 3,
  Emperor: 1,
  Guild: 1,
  'Bene Gesserit': 1,
  Ixians: 1,
  Tleilaxu: 2,
  CHOAM: 0,
  Richese: 2,
  Ecaz: 2,
  Moritani: 2
};
export const ability = {
  Atreides: {
    3: 'Просмотр продаваемой Treachery Card.',
  },
  Harkonnen: {
    3: 'Лимит карт до 8; дополнительное получение после покупки.',
  },
  Fremen: {
    1: 'Шай-Хулуд, перемещение червём, Nexus.',
    5: 'Особая бесплатная высадка и дальность движения.',
    8: 'В конце 10-го раунда — специальная победа.'
  },
  Emperor: {
    3: 'Получает обычные платежи аукциона.',
  },
  Guild: {
    5: 'Специальные высадки, скидки, порядок хода.',
    8: 'Победа по умолчанию в конце игры при применимых условиях.'
  },
  'Bene Gesserit': {
    2: 'Особое Charity в Advanced.',
    5: 'Правила Advisor и совместного присутствия.',
    8: 'Проверить тайное предсказание в момент подходящей победы.'
  },
  Ixians: {
    0: 'Hidden Mobile Stronghold.',
    5: 'Hidden Mobile Stronghold, Suboid и Cyborg.'
  },
  Tleilaxu: {
    8: 'Проверить связанные с Face Dancers эффекты.'
  },
  CHOAM: {
    2: 'До выплат получает 2 спайса за участвующую фракцию.',
    3: 'Специальные свойства Treachery Cards.',
    8: 'Inflation Token.'
  },
  Richese: {
    5: 'No-Field Tokens.'
  },
  Ecaz: {
    7: 'Особые правила союзного сбора спайса.',
    8: 'При подходящем совместном контроле 3 крепостей — особая союзная победа.'
  },
  Moritani: {
    1: 'Особые взаимодействия с червями.',
    5: 'Terror Tokens и их эффекты.',
  }
};
export const startingSetup = {
  "Fremen": {
    "spice": 3,
    "field": 10,
    "reserve": 10,
    "placement": "Распределить 10 войск между Sietch Tabr, False Wall South и False Wall West.",
    "special": "Подготовить Fedaykin (Advanced) и фракционные компоненты."
  },
  "Atreides": {
    "spice": 10,
    "field": 10,
    "reserve": 10,
    "placement": "Разместить 10 войск в Arrakeen.",
    "special": "В Advanced подготовить Kwisatz Haderach."
  },
  "Harkonnen": {
    "spice": 10,
    "field": 10,
    "reserve": 10,
    "placement": "Разместить 10 войск в Carthag.",
    "special": "Сохранить 4 Traitor Cards."
  },
  "Emperor": {
    "spice": 10,
    "field": 0,
    "reserve": 20,
    "placement": "Стартовых войск на поле нет; все 20 — в резерве.",
    "special": "В Advanced подготовить 5 Sardaukar среди войск."
  },
  "Guild": {
    "spice": 5,
    "field": 5,
    "reserve": 15,
    "placement": "Разместить 5 войск в Tuek’s Sietch.",
    "special": "Оставить остальные 15 войск в резерве."
  },
  "Bene Gesserit": {
    "spice": 5,
    "field": 1,
    "reserve": 19,
    "placement": "В Advanced разместить одну советницу после Фременов согласно правилам; в Basic — 1 войско в Polar Sink.",
    "special": "Тайно записать фракцию и раунд предсказания."
  },
  "Ixians": {
    "spice": 10,
    "field": 6,
    "reserve": 14,
    "placement": "Поставить 3 Cyborg и 3 Suboid внутрь Hidden Mobile Stronghold; сектор крепости установить после начальной бури.",
    "special": "Подготовить оставшиеся войска."
  },
  "Tleilaxu": {
    "spice": 5,
    "field": 0,
    "reserve": 20,
    "placement": "Не размещать войска в начале игры; все 20 — в резерве.",
    "special": "Подготовить 3 Face Dancers после выбора предателей другими фракциями."
  },
  "CHOAM": {
    "spice": 2,
    "field": 0,
    "reserve": 20,
    "placement": "Стартовых войск на поле нет; все 20 — в резерве.",
    "special": "Подготовить Inflation Token и компоненты Auditor (Advanced)."
  },
  "Richese": {
    "spice": 5,
    "field": 0,
    "reserve": 20,
    "placement": "Стартовых войск на поле нет; все 20 — в резерве.",
    "special": "Подготовить 10 специальных Treachery Cards и 3 No-Field Tokens (0, 3, 5)."
  },
  "Ecaz": {
    "spice": 12,
    "field": 6,
    "reserve": 14,
    "placement": "Разместить 6 войск в Imperial Basin.",
    "special": "Подготовить Ambassador Tokens, Duke Vidal и исключение Loyalty/Traitor в Advanced."
  },
  "Moritani": {
    "spice": 12,
    "field": 6,
    "reserve": 14,
    "placement": "После остальных фракций разместить 6 войск в одной незанятой территории.",
    "special": "Подготовить скрытые Terror Tokens и Atomics Aftermath Token."
  }
};
