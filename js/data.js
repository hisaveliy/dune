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
    8: '<p>Ecaz и их действующему союзнику достаточно 3 крепостей для совместной победы, если в каждой из этих трёх крепостей одновременно находятся войска обоих: хотя бы 1 войско Ecaz и хотя бы 1 войско союзника. Проверяйте это в Mentat Pause, после разрешения боёв. Правило действует и в Basic, и в Advanced.</p><p>Пример: Ecaz и союзник вместе занимают Arrakeen, Carthag и Sietch Tabr — условие выполнено. Если в одной из этих крепостей стоят войска только одного из вас, условие особой победы по 3 крепостям не выполнено. Совместно занятая крепость считается одной крепостью, а не двумя.</p><p>Если Ecaz не в альянсе или совместного присутствия обоих союзников нет во всех трёх крепостях, этот сниженный порог не применяется. Для обычной союзной победы требуется 4 крепости. В Advanced советницы Bene Gesserit не считаются боевыми войсками для контроля: нужны бойцы. Крепость под бурей не учитывается для победы.</p>'
  },
  Moritani: {
    1: 'Особые взаимодействия с червями.',
    5: 'Terror Tokens и их эффекты.',
    8: '<p><strong>Terrorize · начиная с первого раунда:</strong> в Mentat Pause можно выполнить одно действие на выбор: разместить 1 Terror Token из своего запаса лицом вниз в крепости без Terror Token либо переместить 1 свой уже размещённый Terror Token в другую крепость без такого жетона. Можно отказаться от действия; размещение и перемещение вместе за эту фазу не выполняются.</p><p>Крепость может быть занята войсками и находиться под бурей. В Hidden Mobile Stronghold Иксиан Terror Tokens размещать нельзя. Тип жетона при размещении или перемещении не раскрывайте.</p><p>Сейчас вы только размещаете или перемещаете жетон. Раскрыть и применить его можно, когда другая фракция, кроме вашего союзника, входит в эту крепость высадкой или движением, в том числе советницами Bene Gesserit. Само размещение в уже занятую крепость не активирует эффект.</p>'
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
    "placement": "Разместить 10 войск в Carthag."
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
    "placement": "Не размещать войска в начале игры; все 20 — в резерве."
  },
  "CHOAM": {
    "spice": 2,
    "field": 0,
    "reserve": 20,
    "placement": "Стартовых войск на поле нет; все 20 — в резерве.",
    "special": "Подготовить Inflation Token."
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
    "special": "Подготовить Ambassador Tokens и Duke Vidal."
  },
  "Moritani": {
    "spice": 12,
    "field": 6,
    "reserve": 14,
    "placement": "После остальных фракций разместить 6 войск в одной незанятой территории.",
    "special": "Подготовить скрытые Terror Tokens и Atomics Aftermath Token."
  }
};
