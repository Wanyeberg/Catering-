import { Prices, Category, ItemKey } from './types';

export const PRICES: Prices = {
  gustoBurger: 8.50,
  doubleGustoBurger: 11.50,
  halloumiBurger: 8.50,
  doubleHalloumiBurger: 11.50,
  pommes: 1.00,
  linsensuppe: 5.50,
  gulaschsuppe: 6.00,
  sorbet: 4.50,
  sorbetVodka: 6.50
};

export const ITEM_NAMES: Record<ItemKey, string> = {
  gustoBurger: "Gusto Burger",
  doubleGustoBurger: "Double Gusto Burger",
  halloumiBurger: "Halloumi Burger",
  doubleHalloumiBurger: "Double Halloumi Burger",
  pommes: "Pommes frites",
  linsensuppe: "Linsensuppe",
  gulaschsuppe: "Gulaschsuppe",
  sorbet: "Zitronensorbet",
  sorbetVodka: "Zitronensorbet mit Vodka"
};

export const CATEGORIES: Category[] = [
  {
    id: 'burger',
    name: 'Burger',
    icon: '🍔',
    color: 'from-amber-100 to-orange-100 text-amber-800 border-amber-200 hover:bg-amber-55',
    items: [
      { key: 'gustoBurger', name: 'Gusto Burger', price: PRICES.gustoBurger, description: 'Saftiges Rinder-Patty, Brioche-Bun & Gusto-Salsa' },
      { key: 'doubleGustoBurger', name: 'Double Gusto Burger', price: PRICES.doubleGustoBurger, description: 'Doppelt Fleisch, extra Cheddar & Sauce' },
      { key: 'halloumiBurger', name: 'Halloumi Burger', price: PRICES.halloumiBurger, description: 'Knuspriger Halloumi, gegrilltes Gemuese & Kräuterpesto' },
      { key: 'doubleHalloumiBurger', name: 'Double Halloumi Burger', price: PRICES.doubleHalloumiBurger, description: 'Doppelter Halloumi, Cheddar & extra Toppings' }
    ]
  },
  {
    id: 'suppen',
    name: 'Suppen',
    icon: '🍲',
    color: 'from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200 hover:bg-emerald-55',
    items: [
      { key: 'linsensuppe', name: 'Linsensuppe', price: PRICES.linsensuppe, description: 'Klassische Linsensuppe nach Hausrezept mit frischen Kräutern' },
      { key: 'gulaschsuppe', name: 'Gulaschsuppe', price: PRICES.gulaschsuppe, description: 'Herzhafte Gulaschsuppe mit zartem Rindfleisch & Paprika' }
    ]
  },
  {
    id: 'sorbet',
    name: 'Zitronensorbet',
    icon: '🍋',
    color: 'from-yellow-100 to-lime-100 text-yellow-800 border-yellow-200 hover:bg-yellow-55',
    items: [
      { key: 'sorbet', name: 'Zitronensorbet', price: PRICES.sorbet, description: 'Erfrischendes Zitronensorbet aus echtem Fruchtsaft' },
      { key: 'sorbetVodka', name: 'Zitronensorbet mit Vodka', price: PRICES.sorbetVodka, description: 'Premium Zitronensorbet verfeinert mit einem Schuss Vodka' }
    ]
  }
];
