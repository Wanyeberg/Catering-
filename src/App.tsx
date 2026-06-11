import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  TrendingUp, 
  RotateCcw, 
  Check, 
  Trash2, 
  X, 
  CheckCircle2,
  Plus, 
  Minus,
  ShoppingCart,
  ChevronRight,
  ArrowLeft,
  ShoppingBag,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PRICES, ITEM_NAMES, CATEGORIES } from './constants';
import { ItemKey, OrderStats } from './types';

interface CartItem {
  id: string; // key + (hasPommes ? '-pommes' : '')
  key: ItemKey;
  name: string;
  price: number; // base price
  hasPommes: boolean;
  quantity: number;
}

export default function App() {
  // Navigation Screens: 'start' (initial 3 button screen) | 'ordering' (the builder grid + RHS cart list)
  const [currentScreen, setCurrentScreen] = useState<'start' | 'ordering'>('start');
  
  // Category tab active inside the ordering screen: 'burger' | 'suppen' | 'sorbet'
  const [activeCategory, setActiveCategory] = useState<'burger' | 'suppen' | 'sorbet'>('burger');

  // Temporary shopping list (Aktive laufende Bestellung)
  const [cart, setCart] = useState<CartItem[]>([]);

  // Overall consolidated sales history statistics (stored in local storage)
  const [counts, setCounts] = useState<OrderStats>(() => {
    const saved = localStorage.getItem('catering_statistics_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading stats from localStorage", e);
      }
    }
    return {
      gustoBurger: 0,
      doubleGustoBurger: 0,
      halloumiBurger: 0,
      doubleHalloumiBurger: 0,
      pommes: 0,
      linsensuppe: 0,
      gulaschsuppe: 0,
      sorbet: 0,
      sorbetVodka: 0
    };
  });

  // Dialog / Overlays state
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState<boolean>(false);
  const [orderSuccessAnimation, setOrderSuccessAnimation] = useState<boolean>(false);

  // Active transient feedback alerts
  const [toasts, setToasts] = useState<{ id: string; message: string; submessage?: string; type: 'success' | 'info' | 'reset' }[]>([]);

  // Keep counts synchronous with LocalStorage
  useEffect(() => {
    localStorage.setItem('catering_statistics_v1', JSON.stringify(counts));
  }, [counts]);

  // Toast notifier animation helper
  const addToast = (message: string, submessage?: string, type: 'success' | 'info' | 'reset' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, submessage, type }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  };

  // Helper to get total sales quantity of helper key
  const getCount = (key: string): number => {
    return (counts[key] as number) || 0;
  };

  // Open builder session from start screen
  const startBuilder = (category: 'burger' | 'suppen' | 'sorbet') => {
    setActiveCategory(category);
    setCurrentScreen('ordering');
  };

  // ADD TO TEMPORARY BASKET
  const addToCart = (key: ItemKey, name: string, isBurger: boolean, withPommes: boolean = false) => {
    const itemId = key + (withPommes ? '-pommes' : '');
    const existing = cart.find((item) => item.id === itemId);

    if (existing) {
      addToast(
        `Menge erhöht`,
        `+1 ${name}${withPommes ? ' (+ Pommes)' : ''} in der Bestellliste`,
        'success'
      );
    } else {
      addToast(
        `Hinzugefügt`,
        `${name}${withPommes ? ' (+ Pommes frites)' : ''} in die Bestellliste gelegt`,
        'success'
      );
    }

    setCart((prevCart) => {
      const match = prevCart.find((item) => item.id === itemId);
      if (match) {
        return prevCart.map((item) => 
          item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [
          ...prevCart,
          {
            id: itemId,
            key,
            name,
            price: PRICES[key],
            hasPommes: withPommes,
            quantity: 1
          }
        ];
      }
    });
  };

  // REMOVE OR DECREMENT FROM BASKET
  const updateCartQuantity = (id: string, amount: number) => {
    const existing = cart.find((item) => item.id === id);
    if (!existing) return;

    const nextQty = existing.quantity + amount;
    if (nextQty <= 0) {
      addToast("Entfernt", `${existing.name} aus Liste gelöscht`, 'info');
    }

    setCart((prevCart) => {
      const match = prevCart.find((item) => item.id === id);
      if (!match) return prevCart;

      const q = match.quantity + amount;
      if (q <= 0) {
        return prevCart.filter((item) => item.id !== id);
      } else {
        return prevCart.map((item) => 
          item.id === id ? { ...item, quantity: q } : item
        );
      }
    });
  };

  // CLEAR CURRENT WORKING CART
  const clearCart = () => {
    setCart([]);
    addToast("Liste geleert", "Die temporäre Bestellliste wurde zurückgesetzt", "info");
  };

  // SUBMIT BASKET TO SALES TOTALS (Confirm & Save order)
  const finalizeOrder = () => {
    if (cart.length === 0) {
      addToast("Bestellliste leer", "Bitte fügen Sie zuerst Speisen hinzu", "info");
      return;
    }

    // Accumulate temporary items list into permanent stats
    setCounts((prevStats) => {
      const nextStats = { ...prevStats };
      cart.forEach((item) => {
        // Increment primary dish
        nextStats[item.key] = (nextStats[item.key] || 0) + item.quantity;
        // Increment pommes side dish if activated
        if (item.hasPommes) {
          nextStats.pommes = (nextStats.pommes || 0) + item.quantity;
        }
      });
      return nextStats;
    });

    // Display order validation feedback screen
    setOrderSuccessAnimation(true);
    setTimeout(() => {
      setOrderSuccessAnimation(false);
      // Empty basket and route back to the pristine Start page
      setCart([]);
      setCurrentScreen('start');
    }, 1800);
  };

  // Reset entire POS memory database
  const handleResetSales = () => {
    const cleared = {
      gustoBurger: 0,
      doubleGustoBurger: 0,
      halloumiBurger: 0,
      doubleHalloumiBurger: 0,
      pommes: 0,
      linsensuppe: 0,
      gulaschsuppe: 0,
      sorbet: 0,
      sorbetVodka: 0
    };
    setCounts(cleared);
    setCart([]);
    setShowResetConfirmation(false);
    setShowStats(false);
    addToast("System Zurückgesetzt", "Sämtliche akkumulierten Zählerstände wurden auf Null gesetzt", "reset");
  };

  // Currency utility helper
  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Calculate live total revenue from permanent storage
  const permanentTotalRevenue = Object.entries(counts).reduce((sum, [key, count]) => {
    const price = PRICES[key as ItemKey] || 0;
    return sum + (count as number) * price;
  }, 0);

  const permanentTotalSold = Object.keys(counts).reduce((sum, key) => sum + getCount(key), 0);

  // Calculate live summary details for the temporary draft list
  const cartTotalAmount = cart.reduce((sum, item) => {
    const singlePrice = item.price + (item.hasPommes ? PRICES.pommes : 0);
    return sum + singlePrice * item.quantity;
  }, 0);

  const cartTotalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div id="app-root" className="fixed inset-0 flex flex-col font-sans bg-gray-100 text-slate-800 overflow-hidden select-none">
      
      {/* GLOBAL TELEMETRY BAR HEADER */}
      <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 shadow-xs z-30">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-xs">
            J
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 select-none">
              Jürgens Catering Zauber ✨
            </h1>
          </div>
        </div>

        {/* Sales history dashboard mini indicators */}
        <div className="flex items-center gap-4 select-none">
          <button 
            id="global-stats-btn"
            onClick={() => setShowStats(true)}
            className="px-6 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold tracking-tight shadow-md active:scale-95 transition-all text-sm flex items-center gap-2 cursor-pointer"
          >
            <TrendingUp className="w-4.5 h-4.5 text-emerald-400 stroke-[2.5]" />
            <span>Verkaufsübersicht</span>
          </button>
        </div>
      </header>

      {/* VIEWPORT CONTROLLER */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: THE INITIAL SCREEN (STARTSEITE WITH 3 GIANT BUTTONS) */}
          {currentScreen === 'start' && (
            <motion.div
              key="start-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 p-8 flex flex-col justify-center items-center max-w-6xl w-full mx-auto"
            >
              {/* THREE ICONIC BULK BUTTONS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl px-4 select-none">
                
                {/* Burger Starter Button */}
                <button
                  id="start-btn-burger"
                  onClick={() => startBuilder('burger')}
                  className="h-64 bg-white hover:bg-slate-50 border border-gray-200 hover:border-indigo-400 rounded-3xl p-8 flex flex-col justify-between items-center text-center shadow-xs hover:shadow-xl transition-all duration-300 active:scale-97 cursor-pointer group"
                >
                  <span className="text-6xl select-none transform group-hover:scale-110 transition-transform">🍔</span>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">Burger</h3>
                    <p className="text-xs text-slate-400 mt-1">4 Gourmet-Burger & Pommes Beilagen</p>
                  </div>
                  <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-5 py-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center gap-1">
                    <span>Auswählen</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                {/* Suppen Starter Button */}
                <button
                  id="start-btn-suppen"
                  onClick={() => startBuilder('suppen')}
                  className="h-64 bg-white hover:bg-slate-50 border border-gray-200 hover:border-indigo-400 rounded-3xl p-8 flex flex-col justify-between items-center text-center shadow-xs hover:shadow-xl transition-all duration-300 active:scale-97 cursor-pointer group"
                >
                  <span className="text-6xl select-none transform group-hover:scale-110 transition-transform">🥣</span>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">Suppen</h3>
                    <p className="text-xs text-slate-400 mt-1">Linsensuppe & Herzhafte Gulaschsuppe</p>
                  </div>
                  <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-5 py-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center gap-1">
                    <span>Auswählen</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                {/* Sorbet Starter Button */}
                <button
                  id="start-btn-sorbet"
                  onClick={() => startBuilder('sorbet')}
                  className="h-64 bg-white hover:bg-slate-50 border border-gray-200 hover:border-indigo-400 rounded-3xl p-8 flex flex-col justify-between items-center text-center shadow-xs hover:shadow-xl transition-all duration-300 active:scale-97 cursor-pointer group"
                >
                  <span className="text-6xl select-none transform group-hover:scale-110 transition-transform">🍋</span>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">Sorbets</h3>
                    <p className="text-xs text-slate-400 mt-1">Zitronensorbet Pur oder mit Vodka-Shot</p>
                  </div>
                  <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-5 py-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center gap-1">
                    <span>Auswählen</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

              </div>

              {/* Bottom guide tag */}
              <div className="mt-12 text-slate-400 flex items-center gap-2 text-xs select-none">
                <Info className="w-4 h-4 text-slate-400" />
                <span>Ausgewählte Posten werden in die laufende Liste gelegt, bis Sie am Schluss buchen.</span>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: THE DETAILED ORDERING BUILDER (PRODUCT SELECTION + TEMPORARY ACTIVE CART SIDEBAR) */}
          {currentScreen === 'ordering' && (
            <motion.div
              key="ordering-screen"
              initial={{ opacity: 0, scale: 1.01 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 grid grid-cols-12 overflow-hidden h-full"
            >
              
              {/* LEFT & CENTER PORTION (col-span-8): MENU SELECTION WINDOW */}
              <div className="col-span-8 flex flex-col h-full bg-slate-50 border-r border-gray-200 overflow-hidden">
                
                {/* Category tab changer + back action */}
                <div className="bg-white p-4 border-b border-gray-200 shrink-0 flex items-center justify-between gap-4">
                  <button
                    id="back-to-home-btn"
                    onClick={() => {
                      if (cart.length > 0) {
                        if (confirm("Bestellliste enthält bereits Posten. Wirklich zurückgehen und aktuelle Liste verwerfen?")) {
                          setCart([]);
                          setCurrentScreen('start');
                        }
                      } else {
                        setCurrentScreen('start');
                      }
                    }}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-100 rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Zurück</span>
                  </button>

                  {/* 3 Categories Pills */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      id="pill-burger"
                      onClick={() => setActiveCategory('burger')}
                      className={`px-6 py-2 rounded-lg text-xs font-black tracking-tight transition flex items-center gap-2 cursor-pointer ${
                        activeCategory === 'burger'
                          ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/50'
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      <span className="select-none text-base">🍔</span>
                      <span>Burger</span>
                    </button>
                    <button
                      id="pill-suppen"
                      onClick={() => setActiveCategory('suppen')}
                      className={`px-6 py-2 rounded-lg text-xs font-black tracking-tight transition flex items-center gap-2 cursor-pointer ${
                        activeCategory === 'suppen'
                          ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/50'
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      <span className="select-none text-base">🍲</span>
                      <span>Suppen</span>
                    </button>
                    <button
                      id="pill-sorbet"
                      onClick={() => setActiveCategory('sorbet')}
                      className={`px-6 py-2 rounded-lg text-xs font-black tracking-tight transition flex items-center gap-2 cursor-pointer ${
                        activeCategory === 'sorbet'
                          ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/50'
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      <span className="select-none text-base">🍋</span>
                      <span>Sorbet</span>
                    </button>
                  </div>

                  <div className="text-[10px] text-indigo-600 font-black tracking-widest uppercase select-none">
                    Gerichte-Kranz
                  </div>
                </div>

                {/* SCROLLABLE GRID DISPLAY */}
                <div className="flex-1 p-6 overflow-y-auto">
                  
                  {/* BURGER PANEL */}
                  {activeCategory === 'burger' && (
                    <div className="space-y-6">
                      
                      {/* BURGER MEAL SELECTION CARDS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {CATEGORIES.find(c => c.id === 'burger')?.items.map((item) => {
                          const qtyWithoutPommes = cart
                            .filter(cItem => cItem.key === item.key && !cItem.hasPommes)
                            .reduce((sum, cItem) => sum + cItem.quantity, 0);

                          const qtyWithPommes = cart
                            .filter(cItem => cItem.key === item.key && cItem.hasPommes)
                            .reduce((sum, cItem) => sum + cItem.quantity, 0);

                          return (
                            <div
                              key={item.key}
                              className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition-all relative overflow-hidden"
                            >
                              {/* Quantity Badge matching current Pommes preference */}
                              <div className="absolute top-4 right-4 flex flex-col gap-1 items-end pointer-events-none">
                                {qtyWithoutPommes > 0 && (
                                  <span className="bg-slate-100 border border-gray-200 text-slate-700 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>{qtyWithoutPommes}x Pur</span>
                                  </span>
                                )}
                                {qtyWithPommes > 0 && (
                                  <span className="bg-indigo-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>{qtyWithPommes}x mit Pommes</span>
                                  </span>
                                )}
                              </div>

                              <div>
                                <span className="text-3xl block select-none">🍔</span>
                                <h3 className="text-base font-bold text-slate-900 mt-2">
                                  {item.name}
                                </h3>
                                <p className="text-slate-400 text-xs mt-1 leading-snug line-clamp-2">
                                  {item.description}
                                </p>

                                <div className="mt-3 flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 font-bold">Basis-Preis:</span>
                                  <span className="text-[11px] font-bold font-mono text-slate-650 bg-slate-50 border border-slate-200/50 px-1.5 py-0.5 rounded">
                                    {formatEuro(item.price)}
                                  </span>
                                </div>
                              </div>

                              {/* POS Tap Touch area block */}
                              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Ins Bon legen:</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    id={`btn-add-burger-no-pommes-${item.key}`}
                                    onClick={() => addToCart(item.key, item.name, true, false)}
                                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-gray-200 text-slate-800 font-extrabold rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all outline-none cursor-pointer"
                                  >
                                    <span className="text-[9px] font-normal text-slate-500">Ohne Pommes</span>
                                    <span className="font-mono font-black">{formatEuro(item.price)}</span>
                                  </button>

                                  <button
                                    id={`btn-add-burger-with-pommes-${item.key}`}
                                    onClick={() => addToCart(item.key, item.name, true, true)}
                                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all outline-none cursor-pointer shadow-sm"
                                  >
                                    <span className="text-[9px] font-normal text-indigo-150">Mit Pommes</span>
                                    <span className="font-mono font-black">{formatEuro(item.price + PRICES.pommes)}</span>
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}

                  {/* SUPPEN PANEL */}
                  {activeCategory === 'suppen' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {CATEGORIES.find(c => c.id === 'suppen')?.items.map((item) => {
                        const quantityInActiveCart = cart
                          .filter(cItem => cItem.key === item.key)
                          .reduce((sum, item) => sum + item.quantity, 0);

                        return (
                          <div
                            key={item.key}
                            className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition-all relative overflow-hidden"
                          >
                            {/* Quantity Badge */}
                            {quantityInActiveCart > 0 && (
                              <span className="absolute top-4 right-4 bg-indigo-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm animate-pulse">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>{quantityInActiveCart}x in Liste</span>
                              </span>
                            )}

                            <div>
                              <span className="text-3xl block select-none">🍲</span>
                              <h3 className="text-base font-bold text-slate-900 mt-2">
                                {item.name}
                              </h3>
                              <p className="text-slate-400 text-xs mt-1 leading-snug line-clamp-2">
                                {item.description}
                              </p>
                            </div>

                            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-black block">Preis</span>
                                <span className="text-base font-black text-indigo-600 font-mono">
                                  {formatEuro(item.price)}
                                </span>
                              </div>

                              <button
                                id={`btn-add-suppe-${item.key}`}
                                onClick={() => addToCart(item.key, item.name, false)}
                                className="px-4 h-10 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold rounded-lg text-xs flex items-center gap-1 active:scale-95 transition-all outline-none cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Wählen</span>
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SORBET PANEL */}
                  {activeCategory === 'sorbet' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {CATEGORIES.find(c => c.id === 'sorbet')?.items.map((item) => {
                        const quantityInActiveCart = cart
                          .filter(cItem => cItem.key === item.key)
                          .reduce((sum, item) => sum + item.quantity, 0);

                        return (
                          <div
                            key={item.key}
                            className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition-all relative overflow-hidden"
                          >
                            {/* Quantity Badge */}
                            {quantityInActiveCart > 0 && (
                              <span className="absolute top-4 right-4 bg-indigo-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>{quantityInActiveCart}x in Liste</span>
                              </span>
                            )}

                            <div>
                              <span className="text-lxl block select-none">
                                {item.key === 'sorbetVodka' ? '🍸' : '🍋'}
                              </span>
                              <h3 className="text-base font-bold text-slate-900 mt-2 flex items-center gap-1.5 flex-wrap">
                                <span>{item.name}</span>
                                {item.key === 'sorbetVodka' && (
                                  <span className="text-[9px] tracking-wider font-extrabold bg-purple-50 text-purple-700 border border-purple-100 rounded px-1.5 py-0.5 select-none">
                                    ALKOHOL (18+)
                                  </span>
                                )}
                              </h3>
                              <p className="text-slate-400 text-xs mt-1 leading-snug line-clamp-2">
                                {item.description}
                              </p>
                            </div>

                            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-black block">Preis</span>
                                <span className="text-base font-black text-indigo-600 font-mono">
                                  {formatEuro(item.price)}
                                </span>
                              </div>

                              <button
                                id={`btn-add-sorbet-${item.key}`}
                                onClick={() => addToCart(item.key, item.name, false)}
                                className="px-4 h-10 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold rounded-lg text-xs flex items-center gap-1 active:scale-95 transition-all outline-none cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Wählen</span>
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>

              {/* RIGHT PORTION (col-span-4): TEMPORARY ORDER CART PANEL (Laufende Bestellung) */}
              <div className="col-span-4 flex flex-col h-full bg-white shadow-xl relative z-10 overflow-hidden">
                
                {/* Cart pane Title header */}
                <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 text-white shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-605 bg-indigo-500 flex items-center justify-center text-white">
                      <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm tracking-tight text-white leading-tight">Laufende Bestellung</h3>
                      <p className="text-[10px] text-slate-400 font-bold leading-normal">Temporärer Bon-Speicher</p>
                    </div>
                  </div>

                  {cartTotalItemsCount > 0 && (
                    <span className="text-xs font-mono font-black bg-indigo-600 text-white px-2 py-0.5 rounded-lg select-none shadow-xs">
                      {cartTotalItemsCount} Posten
                    </span>
                  )}
                </div>

                {/* SCROLLABLE CART ITEM LINES */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                  <AnimatePresence initial={false}>
                    {cart.map((item) => {
                      const singleItemPrice = item.price + (item.hasPommes ? PRICES.pommes : 0);
                      const lineTotalPrice = singleItemPrice * item.quantity;

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9, x: -30 }}
                          transition={{ duration: 0.15 }}
                          className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs space-y-2 relative"
                        >
                          <div className="flex items-start justify-between">
                            <div className="pr-4">
                              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1">
                                <span className="select-none">
                                  {item.key === 'pommes' ? '🍟' : 
                                   item.key.toLowerCase().includes('burger') ? '🍔' : 
                                   item.key.toLowerCase().includes('suppe') ? '🍲' : '🍋'}
                                </span>
                                <span>{item.name}</span>
                              </h4>
                              {item.hasPommes && (
                                <span className="inline-block text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded mt-1 select-none">
                                  🍟 INKLUSIVE POMMES (+1,00 €)
                                </span>
                              )}
                            </div>

                            {/* Line Price display */}
                            <span className="font-mono text-xs font-black text-slate-800 shrink-0">
                              {formatEuro(lineTotalPrice)}
                            </span>
                          </div>

                          {/* Adjustment quantites control & deletion */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 font-mono">
                              Einheit: {formatEuro(singleItemPrice)}
                            </span>

                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => updateCartQuantity(item.id, -1)}
                                className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md flex items-center justify-center transition active:scale-90 outline-none cursor-pointer"
                              >
                                <Minus className="w-3 h-3 stroke-[2.5]" />
                              </button>
                              
                              <span className="font-mono font-black text-xs px-2.5 text-center text-slate-800 select-none">
                                {item.quantity}
                              </span>

                              <button
                                onClick={() => updateCartQuantity(item.id, 1)}
                                className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md flex items-center justify-center transition active:scale-90 outline-none cursor-pointer"
                              >
                                <Plus className="w-3 h-3 stroke-[2.5]" />
                              </button>

                              <button
                                onClick={() => updateCartQuantity(item.id, -item.quantity)}
                                className="w-7 h-7 hover:bg-red-50 text-slate-300 hover:text-red-600 rounded-md flex items-center justify-center transition ml-2 outline-none cursor-pointer"
                                title="Entfernen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Empty state instruction banner */}
                  {cart.length === 0 && (
                    <div className="h-64 flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl select-none">
                      <ShoppingBag className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
                      <h4 className="font-bold text-xs text-slate-500">Bestellliste leer</h4>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">
                        Klicken Sie links auf Produkt-Wählen, um Speisen für diese Bestellung hinzuzufügen.
                      </p>
                    </div>
                  )}
                </div>

                {/* BOTTOM TOTAL SUMMARY BOX + CONFIRMATON SUBMIT BUTTON */}
                <div className="bg-slate-50 p-6 border-t border-slate-200 shrink-0 space-y-4 shadow-sm relative z-20">
                  <div className="space-y-1.5 select-none">
                    <div className="flex justify-between text-xs text-slate-550">
                      <span>Zwischensumme:</span>
                      <span className="font-mono">{formatEuro(cartTotalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-555">
                      <span>Mehrwertsteuer (Inkl.):</span>
                      <span className="font-mono">{formatEuro(cartTotalAmount * 0.19)}</span>
                    </div>
                    
                    <div className="w-full h-px bg-slate-200 my-2" />

                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-black text-slate-900">Gesamt-Umsatz:</span>
                      <span className="text-2xl font-black font-mono text-emerald-600">
                        {formatEuro(cartTotalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Operational primary buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      id="submit-order-sales-btn"
                      disabled={cart.length === 0}
                      onClick={finalizeOrder}
                      className={`w-full h-14 rounded-xl font-extrabold tracking-tight text-sm text-white flex items-center justify-center gap-2 transition shadow-md ${
                        cart.length > 0
                          ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-100 active:scale-97 cursor-pointer'
                          : 'bg-slate-300 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                      <span>Bestellung abschließen</span>
                    </button>

                    {cart.length > 0 && (
                      <button
                        id="clear-active-cart-btn"
                        onClick={clearCart}
                        className="w-full py-2.5 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded-lg font-bold transition active:scale-98 cursor-pointer"
                      >
                        Abbrechen & Liste leeren
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* FOOTER SYSTEM METRIC BAR */}
      <footer className="h-10 bg-slate-950 px-8 flex items-center justify-between text-slate-400 text-[10px] shrink-0 z-20 select-none">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-slate-500 text-[9px]">Offline-Storage Sicherung aktiv</span>
        </div>
        <div className="font-mono text-slate-600">
          Terminal Session: C-CATERING-REV2-{Date.now().toString().slice(-4)}
        </div>
      </footer>

      {/* DYNAMIC TOAST FEEDBACK NOTIFICATIONS */}
      <div className="fixed bottom-14 right-6 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, x: 40, filter: 'blur(3px)' }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 pointer-events-auto ${
                toast.type === 'reset'
                  ? 'bg-rose-600 border-rose-700 text-white'
                  : toast.type === 'info'
                    ? 'bg-indigo-600 border-indigo-700 text-white'
                    : 'bg-emerald-600 border-emerald-700 text-white'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
                {toast.type === 'reset' ? '⚠️' : toast.type === 'info' ? 'ℹ️' : '✓'}
              </div>
              <div className="flex-1">
                <h5 className="font-black text-sm tracking-tight">{toast.message}</h5>
                {toast.submessage && (
                  <p className="text-[11px] text-white/80 mt-0.5 leading-tight">{toast.submessage}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ORDER SUBMITTED FULL-SCREEN SUCCESS FLASH */}
      <AnimatePresence>
        {orderSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-white rounded-3xl p-10 max-w-md w-full mx-4 text-center space-y-6 shadow-2xl border border-gray-150"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900">Zähler eingebucht!</h3>
                <p className="text-xs text-slate-500 mt-2">
                  Die Produkte wurden erfolgreich zur historischen Umsatzliste hinzugefügt.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 text-xs text-slate-600">
                Bitte nehmen Sie die nächste Bestellung auf.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY D: STATS / GENERAL HISTORICAL SALES OVERVIEW DIALOG */}
      <AnimatePresence>
        {showStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div 
              key="stats-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStats(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div
              key="stats-modal"
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white border border-gray-200 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="bg-slate-50 px-8 py-6 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900">Gesamte Übersicht (Statistik)</h3>
                    <p className="text-xs text-slate-400">Kumulierter Umsatz aller bisherigen abgeschlossenen Buchungen</p>
                  </div>
                </div>
                <button
                  id="stats-close-btn-x"
                  onClick={() => setShowStats(false)}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition border border-gray-200 text-slate-600 active:scale-90 outline-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contents Area */}
              <div className="p-8 overflow-y-auto space-y-6 flex-1">
                
                {/* Metrics Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 select-none">
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-800 opacity-60 block">
                      Gesamtumsatz
                    </span>
                    <span className="text-3xl font-black font-mono text-emerald-950 block mt-1">
                      {formatEuro(permanentTotalRevenue)}
                    </span>
                  </div>
                  <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 select-none">
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-800 opacity-60 block">
                      Posten Verkauft
                    </span>
                    <span className="text-3xl font-black font-mono text-indigo-950 block mt-1">
                      {permanentTotalSold} <span className="text-sm font-medium">Stück</span>
                    </span>
                  </div>
                </div>

                {/* Items detail list */}
                <div>
                  <h4 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-3 select-none">
                    Bisherige Mengenaufteilung (Gesamte Umsatz-Liste)
                  </h4>
                  <div className="border border-gray-200 bg-white rounded-2xl overflow-hidden divide-y divide-gray-150">
                    {Object.entries(counts).map(([key, count]) => {
                      const typedKey = key as ItemKey;
                      const price = PRICES[typedKey] || 0;
                      const itemTotal = (count as number) * price;
                      
                      return (
                        <div key={key} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                          <div className="flex items-center space-x-3 pr-2">
                            <span className="text-2xl select-none">
                              {key === 'pommes' ? '🍟' : 
                               key.toLowerCase().includes('burger') ? '🍔' : 
                               key.toLowerCase().includes('suppe') ? '🍲' : '🍋'}
                            </span>
                            <div>
                              <span className="font-bold text-slate-900 block text-sm">
                                {ITEM_NAMES[typedKey]}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                Einzelpreis: {formatEuro(price)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-6 text-right select-none">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Verkäufe</span>
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {count}x
                              </span>
                            </div>
                            <div className="w-24">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Summe</span>
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {formatEuro(itemTotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Empty Alert Box */}
                {permanentTotalSold === 0 && (
                  <div className="bg-slate-50 rounded-xl p-6 text-center border-2 border-dashed border-slate-200 text-slate-550 select-none">
                    <p className="text-xs font-bold">Noch keine Verkäufe registriert.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Die Liste füllt sich automatisch, sobald Sie Bestellungen links abspeichern.</p>
                  </div>
                )}
              </div>

              {/* Action buttons inside stats */}
              <div className="bg-slate-50 border-t border-gray-200 px-8 py-5 flex justify-between gap-3 shrink-0">
                {permanentTotalSold > 0 ? (
                  <button
                    id="stats-reset-sales-btn"
                    onClick={() => {
                      setShowResetConfirmation(true);
                    }}
                    className="h-12 px-4 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-extrabold flex items-center gap-1.5 transition active:scale-95 outline-none cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                    Zähler nullen
                  </button>
                ) : <div />}

                <button
                  id="stats-close-btn-footer"
                  onClick={() => setShowStats(false)}
                  className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm flex items-center justify-center transition active:scale-95 outline-none cursor-pointer"
                >
                  Schließen
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY E: SYSTEM CONFORMATION TO RESET SEED */}
      <AnimatePresence>
        {showResetConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div 
              key="reset-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirmation(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              key="reset-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-rose-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center space-x-3 text-rose-800">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-lg">Zähler zurücksetzen?</h4>
              </div>

              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <p className="font-bold text-slate-800">Möchten Sie wirklich alle Zählerstände und Umsätze auf 0 setzen?</p>
                <p>Diese Aktion löscht alle abgeschlossenen Buchungen aus dem lokalen Speicher (LocalStorage). Dieser Schritt kann nicht rückgängig gemacht werden.</p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  id="cancel-reset-btn"
                  onClick={() => setShowResetConfirmation(false)}
                  className="h-11 px-4 border border-gray-200 hover:bg-slate-50 font-bold rounded-xl text-xs transition active:scale-95 text-slate-700 outline-none cursor-pointer"
                >
                  Nein, abbrechen
                </button>
                <button
                  id="confirm-reset-btn"
                  onClick={handleResetSales}
                  className="h-11 px-5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-sm shadow-rose-100 active:scale-95 transition-all outline-none cursor-pointer"
                >
                  Ja, alles zurücksetzen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
