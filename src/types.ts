export interface Prices {
  gustoBurger: number;
  doubleGustoBurger: number;
  halloumiBurger: number;
  doubleHalloumiBurger: number;
  pommes: number; // Fries to Burger extra (3€)
  pommesEinzeln: number; // Fries standalone (4€)
  linsensuppe: number;
  sorbet: number;
  sorbetVodka: number;
  wurstsemmel: number;
  gustoWurstsemmel: number;
}

export type ItemKey = keyof Prices;

export interface MenuItem {
  key: ItemKey;
  name: string;
  price: number;
  description?: string;
  icon?: string;
}

export interface Category {
  id: 'burger' | 'suppen' | 'sorbet' | 'beilagen' | 'wurst';
  name: string;
  icon: string;
  color: string;
  items: MenuItem[];
}

export interface OrderStats {
  [key: string]: number;
}
