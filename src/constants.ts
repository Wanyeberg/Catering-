import { Prices, Category, ItemKey } from './types';

export const PRICES: Prices = {
  gustoBurger: 9.20,
  doubleGustoBurger: 11.70,
  halloumiBurger: 9.20,
  doubleHalloumiBurger: 11.70,
  pommes: 3.00, // Fries to Burger extra (+ 3,00 €)
  pommesEinzeln: 4.00, // Standalone Fries (4,00 €)
  linsensuppe: 6.20,
  sorbet: 3.00,
  sorbetVodka: 5.00
};

export const ITEM_NAMES: Record<ItemKey, string> = {
  gustoBurger: "Single Spezial",
  doubleGustoBurger: "Double Spezial",
  halloumiBurger: "Halloumi Burger",
  doubleHalloumiBurger: "Double Halloumi",
  pommes: "Fries (Beilage)",
  pommesEinzeln: "Fries einzeln",
  linsensuppe: "Mercimek Corbasi",
  sorbet: "Zitronensorbet",
  sorbetVodka: "FSK18-Sorbet"
};

export const CATEGORIES: Category[] = [
  {
    id: 'burger',
    name: 'Burger',
    icon: '🍔',
    color: 'from-amber-100 to-orange-100 text-amber-800 border-amber-200 hover:bg-amber-55',
    items: [
      { key: 'gustoBurger', name: 'Single Spezial', price: PRICES.gustoBurger, description: 'Saftiges Rinder-Patty, Brioche-Bun & Spezial-Salsa' },
      { key: 'doubleGustoBurger', name: 'Double Spezial', price: PRICES.doubleGustoBurger, description: 'Doppelt Fleisch, extra Cheddar & Spezial-Sauce' },
      { key: 'halloumiBurger', name: 'Halloumi Burger', price: PRICES.halloumiBurger, description: 'Knuspriger Halloumi, gegrilltes Gemüse & Kräuterpesto' },
      { key: 'doubleHalloumiBurger', name: 'Double Halloumi', price: PRICES.doubleHalloumiBurger, description: 'Doppelter Halloumi, Cheddar & extra Toppings' }
    ]
  },
  {
    id: 'suppen',
    name: 'Suppen',
    icon: '🍲',
    color: 'from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200 hover:bg-emerald-55',
    items: [
      { key: 'linsensuppe', name: 'Mercimek Çorbası', price: PRICES.linsensuppe, description: 'Klassische rote Linsensuppe nach traditioneller Art mit Zitrone' }
    ]
  },
  {
    id: 'sorbet',
    name: 'Sorbets',
    icon: '🍋',
    color: 'from-yellow-100 to-lime-100 text-yellow-800 border-yellow-200 hover:bg-yellow-55',
    items: [
      { key: 'sorbet', name: 'Zitronensorbet', price: PRICES.sorbet, description: 'Erfrischendes Zitronensorbet aus echtem Fruchtsaft' },
      { key: 'sorbetVodka', name: 'FSK18-Sorbet', price: PRICES.sorbetVodka, description: 'Premium Zitronensorbet verfeinert mit einem Schuss Vodka' }
    ]
  },
  {
    id: 'beilagen',
    name: 'Beilagen',
    icon: '🍟',
    color: 'from-blue-100 to-cyan-100 text-blue-800 border-blue-200 hover:bg-blue-55',
    items: [
      { key: 'pommesEinzeln', name: 'Fries einzeln', price: PRICES.pommesEinzeln, description: 'Eine große Portion goldgelbe, knusprige Fries frites' }
    ]
  }
];
