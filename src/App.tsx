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
  Info,
  FileDown,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PRICES, ITEM_NAMES, CATEGORIES } from './constants';
import { ItemKey, OrderStats } from './types';

interface CartItem {
  id: string; // key + (hasPommes ? '-pommes' : '') + (isArtist ? '-artist' : '')
  key: ItemKey;
  name: string;
  price: number; // base price
  hasPommes: boolean;
  quantity: number;
  isArtist?: boolean;
}

export default function App() {
  // Navigation Screens: 'start' (initial 3 button screen) | 'ordering' (the builder grid + RHS cart list)
  const [currentScreen, setCurrentScreen] = useState<'start' | 'ordering'>('start');
  
  // Category tab active inside the ordering screen: 'burger' | 'suppen' | 'sorbet' | 'beilagen'
  const [activeCategory, setActiveCategory] = useState<'burger' | 'suppen' | 'sorbet' | 'beilagen'>('burger');

  // Temporary shopping list (Aktive laufende Bestellung)
  const [cart, setCart] = useState<CartItem[]>([]);

  // Toggle mode for attributing items to Artists rather than regular sales
  const [isArtistActive, setIsArtistActive] = useState<boolean>(false);

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
      pommesEinzeln: 0,
      linsensuppe: 0,
      sorbet: 0,
      sorbetVodka: 0
    };
  });

  // Separate sales history statistics for Artists (stored in local storage)
  const [artistCounts, setArtistCounts] = useState<OrderStats>(() => {
    const saved = localStorage.getItem('catering_artist_statistics_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading artist stats from localStorage", e);
      }
    }
    return {
      gustoBurger: 0,
      doubleGustoBurger: 0,
      halloumiBurger: 0,
      doubleHalloumiBurger: 0,
      pommes: 0,
      pommesEinzeln: 0,
      linsensuppe: 0,
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

  // Keep artist counts synchronous with LocalStorage
  useEffect(() => {
    localStorage.setItem('catering_artist_statistics_v1', JSON.stringify(artistCounts));
  }, [artistCounts]);

  const [startingCash, setStartingCash] = useState<number>(() => {
    const saved = localStorage.getItem('catering_starting_cash_v1');
    return saved ? parseFloat(saved) || 0 : 0;
  });

  useEffect(() => {
    localStorage.setItem('catering_starting_cash_v1', startingCash.toString());
  }, [startingCash]);

  // Active orders in the slider queue (persisted in localStorage)
  const [activeOrders, setActiveOrders] = useState<{ id: string; orderNumber: number; items: CartItem[]; totalAmount: number; timestamp: string }[]>(() => {
    const saved = localStorage.getItem('catering_active_orders_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading active orders", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('catering_active_orders_v2', JSON.stringify(activeOrders));
  }, [activeOrders]);

  // Sequential order number tracker (persisted in localStorage)
  const [nextOrderNumber, setNextOrderNumber] = useState<number>(() => {
    const saved = localStorage.getItem('catering_next_order_num_v2');
    return saved ? parseInt(saved, 10) || 1 : 1;
  });

  useEffect(() => {
    localStorage.setItem('catering_next_order_num_v2', nextOrderNumber.toString());
  }, [nextOrderNumber]);

  // Track if we are currently editing an existing order
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Change calculator popup states
  const [showChangeModal, setShowChangeModal] = useState<boolean>(false);
  const [amountPaid, setAmountPaid] = useState<string>('');

  // Pending confirm states to avoid blocked browser window.confirm inside iframe
  const [pendingCancelOrderId, setPendingCancelOrderId] = useState<string | null>(null);
  const [backButtonConfirmActive, setBackButtonConfirmActive] = useState<boolean>(false);

  // Completed orders history (persisted in localStorage)
  const [completedOrders, setCompletedOrders] = useState<{ id: string; orderNumber: number; items: CartItem[]; totalAmount: number; timestamp: string; completedAt: string; dateString: string }[]>(() => {
    const saved = localStorage.getItem('catering_completed_orders_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading completed orders", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('catering_completed_orders_v2', JSON.stringify(completedOrders));
  }, [completedOrders]);

  const [showCompletedOrdersModal, setShowCompletedOrdersModal] = useState<boolean>(false);
  const [pendingCompletedCancelOrderId, setPendingCompletedCancelOrderId] = useState<string | null>(null);

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
  const startBuilder = (category: 'burger' | 'suppen' | 'sorbet' | 'beilagen') => {
    setActiveCategory(category);
    setCurrentScreen('ordering');
  };

  // ADD TO TEMPORARY BASKET
  const addToCart = (key: ItemKey, name: string, isBurger: boolean, withPommes: boolean = false) => {
    const itemId = key + (withPommes ? '-pommes' : '') + (isArtistActive ? '-artist' : '');
    const existing = cart.find((item) => item.id === itemId);

    const suffix = (isArtistActive ? ' [Artist]' : '') + (withPommes ? ' (+ Pommes)' : '');

    if (existing) {
      addToast(
        `Menge erhöht`,
        `+1 ${name}${suffix} in der Bestellliste`,
        'success'
      );
    } else {
      addToast(
        `Hinzugefügt`,
        `${name}${suffix} in die Bestellliste gelegt`,
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
            quantity: 1,
            isArtist: isArtistActive
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
    setEditingOrderId(null);
    addToast("Liste geleert", "Die temporäre Bestellliste wurde zurückgesetzt", "info");
  };

  // SUBMIT BASKET TO ACTIVE QUEUE (Confirm & Save order)
  const finalizeOrder = () => {
    if (cart.length === 0) {
      addToast("Bestellliste leer", "Bitte fügen Sie zuerst Speisen hinzu", "info");
      return;
    }

    const totalAmount = cart.reduce((sum, item) => {
      const singlePrice = item.price + (item.hasPommes ? PRICES.pommes : 0);
      return sum + singlePrice * item.quantity;
    }, 0);

    if (editingOrderId) {
      // Editing an existing order
      const ordNum = activeOrders.find(o => o.id === editingOrderId)?.orderNumber || 0;
      setActiveOrders((prev) =>
        prev.map((order) => {
          if (order.id === editingOrderId) {
            return {
              ...order,
              items: [...cart],
              totalAmount
            };
          }
          return order;
        })
      );
      addToast("Bestellung geändert", `Änderungen an Bestellung #${ordNum} gespeichert`, "success");
      setEditingOrderId(null);
    } else {
      // Placed a brand new order!
      const now = new Date();
      const timeString = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

      const newOrder = {
        id: Date.now().toString(),
        orderNumber: nextOrderNumber,
        items: [...cart],
        totalAmount,
        timestamp: timeString
      };

      setActiveOrders((prev) => [...prev, newOrder]);
      setNextOrderNumber((prev) => prev + 1);
      addToast("Bestellung gespeichert", `Bestellung #${newOrder.orderNumber} eingereiht!`, "success");
    }

    // Display order validation feedback screen
    setShowChangeModal(false);
    setOrderSuccessAnimation(true);
    setTimeout(() => {
      setOrderSuccessAnimation(false);
      // Empty basket and route back to the pristine Start page
      setCart([]);
      setIsArtistActive(false);
      setCurrentScreen('start');
    }, 1200);
  };

  // COMPLETE ORDER FROM SLIDER - Accumulates sale counts and closes order
  const completeOrder = (orderId: string) => {
    const orderToComplete = activeOrders.find((o) => o.id === orderId);
    if (!orderToComplete) return;

    // Accumulate temporary items list into permanent stats
    setCounts((prevStats) => {
      const nextStats = { ...prevStats };
      orderToComplete.items.forEach((item) => {
        if (!item.isArtist) {
          // Increment primary dish
          nextStats[item.key] = (nextStats[item.key] || 0) + item.quantity;
          // Increment pommes side dish if activated
          if (item.hasPommes) {
            nextStats.pommes = (nextStats.pommes || 0) + item.quantity;
          }
        }
      });
      return nextStats;
    });

    setArtistCounts((prevStats) => {
      const nextStats = { ...prevStats };
      orderToComplete.items.forEach((item) => {
        if (item.isArtist) {
          // Increment primary dish
          nextStats[item.key] = (nextStats[item.key] || 0) + item.quantity;
          // Increment pommes side dish if activated
          if (item.hasPommes) {
            nextStats.pommes = (nextStats.pommes || 0) + item.quantity;
          }
        }
      });
      return nextStats;
    });

    // Remove from active queue
    setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));

    // Record in completed orders history
    const completedNow = {
      id: orderToComplete.id,
      orderNumber: orderToComplete.orderNumber,
      items: orderToComplete.items,
      totalAmount: orderToComplete.totalAmount,
      timestamp: orderToComplete.timestamp,
      completedAt: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      dateString: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
    setCompletedOrders((prev) => [completedNow, ...prev]);

    addToast("Bestellung abgeschlossen", `Bestellung #${orderToComplete.orderNumber} beendet & gebucht!`, "success");
  };

  // ADAPT COMPLETED ORDER - Deducts items from stats and moves back to active queue inside the active cart editor
  const adaptCompletedOrder = (orderId: string) => {
    const orderToAdapt = completedOrders.find((o) => o.id === orderId);
    if (!orderToAdapt) return;

    // Deduct items from current session stats
    setCounts((prevStats) => {
      const nextStats = { ...prevStats };
      orderToAdapt.items.forEach((item) => {
        if (!item.isArtist) {
          nextStats[item.key] = Math.max(0, (nextStats[item.key] || 0) - item.quantity);
          if (item.hasPommes) {
            nextStats.pommes = Math.max(0, (nextStats.pommes || 0) - item.quantity);
          }
        }
      });
      return nextStats;
    });

    setArtistCounts((prevStats) => {
      const nextStats = { ...prevStats };
      orderToAdapt.items.forEach((item) => {
        if (item.isArtist) {
          nextStats[item.key] = Math.max(0, (nextStats[item.key] || 0) - item.quantity);
          if (item.hasPommes) {
            nextStats.pommes = Math.max(0, (nextStats.pommes || 0) - item.quantity);
          }
        }
      });
      return nextStats;
    });

    // Remove from completed list
    setCompletedOrders((prev) => prev.filter((o) => o.id !== orderId));

    // Restore to active orders list with original orderNumber & items
    const restoredOrder = {
      id: orderToAdapt.id,
      orderNumber: orderToAdapt.orderNumber,
      items: orderToAdapt.items,
      totalAmount: orderToAdapt.totalAmount,
      timestamp: orderToAdapt.timestamp
    };

    setActiveOrders((prev) => [...prev, restoredOrder]);

    // Load into editing state
    setEditingOrderId(restoredOrder.id);
    setCart([...restoredOrder.items]);

    // Set active category to match first item category of edited order
    if (restoredOrder.items.length > 0) {
      const firstKey = restoredOrder.items[0].key;
      const cat = CATEGORIES.find(c => c.items.some(i => i.key === firstKey));
      if (cat) {
        setActiveCategory(cat.id);
      }
    }

    setShowCompletedOrdersModal(false);
    setCurrentScreen('ordering');
    addToast("Bestellung wieder aktiv", `Bestellung #${restoredOrder.orderNumber} wird bearbeitet und wurde temporär aus Statistik entfernt.`, "info");
  };

  // CANCEL COMPLETED ORDER - Deducts items from statistics and deletes order history record completely
  const cancelCompletedOrder = (orderId: string) => {
    const orderToCancel = completedOrders.find((o) => o.id === orderId);
    if (!orderToCancel) return;

    setCounts((prevStats) => {
      const nextStats = { ...prevStats };
      orderToCancel.items.forEach((item) => {
        if (!item.isArtist) {
          nextStats[item.key] = Math.max(0, (nextStats[item.key] || 0) - item.quantity);
          if (item.hasPommes) {
            nextStats.pommes = Math.max(0, (nextStats.pommes || 0) - item.quantity);
          }
        }
      });
      return nextStats;
    });

    setArtistCounts((prevStats) => {
      const nextStats = { ...prevStats };
      orderToCancel.items.forEach((item) => {
        if (item.isArtist) {
          nextStats[item.key] = Math.max(0, (nextStats[item.key] || 0) - item.quantity);
          if (item.hasPommes) {
            nextStats.pommes = Math.max(0, (nextStats.pommes || 0) - item.quantity);
          }
        }
      });
      return nextStats;
    });

    setCompletedOrders((prev) => prev.filter((o) => o.id !== orderId));
    addToast("Umsatz storniert", `Bestellung #${orderToCancel.orderNumber} gelöscht und Umsätze abgezogen.`, "reset");
  };

  const handleCancelCompletedClick = (orderId: string) => {
    if (pendingCompletedCancelOrderId === orderId) {
      cancelCompletedOrder(orderId);
      setPendingCompletedCancelOrderId(null);
    } else {
      setPendingCompletedCancelOrderId(orderId);
      setTimeout(() => {
        setPendingCompletedCancelOrderId((current) => current === orderId ? null : current);
      }, 4000);
    }
  };

  // EDIT ORDER FROM SLIDER - Loads items into the active cart for modifications
  const editOrder = (orderId: string) => {
    const orderToEdit = activeOrders.find((o) => o.id === orderId);
    if (!orderToEdit) return;

    setEditingOrderId(orderId);
    setCart([...orderToEdit.items]);
    
    // Set active category to match first item category of edited order
    if (orderToEdit.items.length > 0) {
      const firstKey = orderToEdit.items[0].key;
      const cat = CATEGORIES.find(c => c.items.some(i => i.key === firstKey));
      if (cat) {
        setActiveCategory(cat.id);
      }
    }

    setCurrentScreen('ordering');
    addToast("Bearbeitungsmodus", `Bestellung #${orderToEdit.orderNumber} geladen`, "info");
  };

  // CANCEL ORDER FROM SLIDER - Removes it entirely from active orders queue
  const cancelOrderInQueue = (orderId: string) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;
    
    if (pendingCancelOrderId === orderId) {
      // Confirmed, delete now
      setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
      addToast("Gelöscht", `Bestellung #${order.orderNumber} wurde gelöscht`, "info");
      setPendingCancelOrderId(null);
    } else {
      // Set to pending
      setPendingCancelOrderId(orderId);
      addToast("Zum Löschen bestätigen", `Klicke noch einmal auf 'Stornieren', um Bestellung #${order.orderNumber} zu löschen`, "info");
      
      // Auto-cancel confirmation state after 4 seconds
      setTimeout(() => {
        setPendingCancelOrderId((current) => current === orderId ? null : current);
      }, 4000);
    }
  };

  // Reset entire POS memory database
  const handleResetSales = () => {
    const cleared = {
      gustoBurger: 0,
      doubleGustoBurger: 0,
      halloumiBurger: 0,
      doubleHalloumiBurger: 0,
      pommes: 0,
      pommesEinzeln: 0,
      linsensuppe: 0,
      sorbet: 0,
      sorbetVodka: 0
    };
    setCounts(cleared);
    setArtistCounts(cleared);
    setCart([]);
    setIsArtistActive(false);
    setActiveOrders([]); // reset active queue
    setCompletedOrders([]); // reset completed history
    setNextOrderNumber(1); // reset sequence
    setEditingOrderId(null);
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

  // Export cumulative sales and statistics report to a beautiful PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Page configuration helper variables
      const pageWidth = doc.internal.pageSize.width || 210;
      
      // Color scheme
      const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
      
      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("GGG X HELL'S KITCHEN", pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text("Verkaufsübersicht & Kassenbericht", pageWidth / 2, 28, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const nowString = new Date().toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      doc.text(`Erstellt am: ${nowString}`, pageWidth / 2, 34, { align: 'center' });

      // Horizontal separator line
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setLineWidth(0.5);
      doc.line(15, 38, pageWidth - 15, 38);

      // Section: Key Metrics Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("KASSEN- UND UMSATZSTATISTIK", 15, 45);

      const metricsRows = [
        ["Startkassenbestand", formatEuro(startingCash)],
        ["Gesamtumsatz (Standard)", formatEuro(regularTotalRevenue)],
        ["Gesamtumsatz (Artists)", formatEuro(artistTotalRevenue)],
        ["Umsatzerlöse (Alle)", formatEuro(permanentTotalRevenue)],
        ["Soll-Kassenbestand (Endbestand)", formatEuro(startingCash + permanentTotalRevenue)],
        ["Posten Gesamt Verkauft", `${permanentTotalSold} Stück`]
      ];

      autoTable(doc, {
        startY: 48,
        head: [['Kennzahl', 'Betrag / Wert']],
        body: metricsRows,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          font: 'helvetica',
          fontSize: 9,
          textColor: [51, 65, 85]
        },
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 12;

      // Section: Standard item details list
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("STANDARD - ARTIKELVERKÄUFE", 15, currentY);

      const standardSalesRows = Object.entries(counts)
        .filter(([_, count]) => (count as number) > 0)
        .map(([key, count]) => {
          const typedKey = key as ItemKey;
          const price = PRICES[typedKey] || 0;
          const total = (count as number) * price;
          return [
            ITEM_NAMES[typedKey] || typedKey,
            formatEuro(price),
            `${count}x`,
            formatEuro(total)
          ];
        });

      if (standardSalesRows.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text("Keine Standard-Verkäufe gebucht.", 15, currentY + 6);
        currentY += 12;
      } else {
        autoTable(doc, {
          startY: currentY + 3,
          head: [['Artikelname', 'Einzelpreis', 'Menge', 'Subtotal']],
          body: standardSalesRows,
          theme: 'striped',
          headStyles: {
            fillColor: [79, 70, 229], // Indigo 600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: {
            font: 'helvetica',
            fontSize: 8.5,
            textColor: [51, 65, 85]
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 35, halign: 'right' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: 15, right: 15 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 12;
      }

      // Check if we have enough space for the artist table, otherwise slide to page 2 automatically
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      // Section: Artist item details list
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("ARTIST - ARTIKELVERKÄUFE", 15, currentY);

      const artistSalesRows = Object.entries(artistCounts)
        .filter(([_, count]) => (count as number) > 0)
        .map(([key, count]) => {
          const typedKey = key as ItemKey;
          const price = PRICES[typedKey] || 0;
          const total = (count as number) * price;
          return [
            ITEM_NAMES[typedKey] || typedKey,
            formatEuro(price),
            `${count}x`,
            formatEuro(total)
          ];
        });

      if (artistSalesRows.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text("Keine Artist-Verkäufe gebucht.", 15, currentY + 6);
      } else {
        autoTable(doc, {
          startY: currentY + 3,
          head: [['Artikelname', 'Einzelpreis', 'Menge', 'Subtotal']],
          body: artistSalesRows,
          theme: 'striped',
          headStyles: {
            fillColor: [217, 119, 6], // Amber 600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: {
            font: 'helvetica',
            fontSize: 8.5,
            textColor: [51, 65, 85]
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 35, halign: 'right' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: 15, right: 15 }
        });
      }

      // PDF Page footer indicator (e.g. Generated on date)
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Gastro-Kassensystem • Seite ${i} von ${pageCount}`,
          pageWidth / 2,
          287,
          { align: 'center' }
        );
      }

      // Trigger standard save/download dialog
      const formattedDate = new Date().toISOString().split('T')[0];
      doc.save(`verkaufsbericht_hells_kitchen_${formattedDate}.pdf`);
      addToast("PDF exportiert", "Der Verkaufsbericht wurde erfolgreich als PDF exportiert.", "success");
    } catch (error) {
      console.error("PDF Export error:", error);
      addToast("Export fehlgeschlagen", "Fehler beim Erzeugenden der PDF-Datei.", "info");
    }
  };

  // Change Breakdown helper for high POS precision
  const getChangeBreakdown = (change: number) => {
    if (change <= 0) return [];
    let remaining = Math.round(change * 100);
    const denominations = [
      { value: 5000, label: '50 € Schein' },
      { value: 2000, label: '20 € Schein' },
      { value: 1000, label: '10 € Schein' },
      { value: 500, label: '5 € Schein' },
      { value: 200, label: '2 € Münze' },
      { value: 100, label: '1 € Münze' },
      { value: 50, label: '50 ct Münze' },
      { value: 20, label: '20 ct Münze' },
      { value: 10, label: '10 ct Münze' },
      { value: 5, label: '5 ct Münze' },
      { value: 2, label: '2 ct Münze' },
      { value: 1, label: '1 ct Münze' }
    ];
    
    const result: { value: number; label: string; count: number }[] = [];
    for (const denom of denominations) {
      if (remaining >= denom.value) {
        const count = Math.floor(remaining / denom.value);
        result.push({ value: denom.value / 100, label: denom.label, count });
        remaining %= denom.value;
      }
    }
    return result;
  };

  // Calculate live total revenue from permanent storage
  const regularTotalRevenue = Object.entries(counts).reduce((sum, [key, count]) => {
    const price = PRICES[key as ItemKey] || 0;
    return sum + (count as number) * price;
  }, 0);

  const artistTotalRevenue = Object.entries(artistCounts).reduce((sum, [key, count]) => {
    const price = PRICES[key as ItemKey] || 0;
    return sum + (count as number) * price;
  }, 0);

  const permanentTotalRevenue = regularTotalRevenue + artistTotalRevenue;

  const regularTotalSold = Object.keys(counts).reduce((sum, key) => sum + getCount(key), 0);
  const artistTotalSold = Object.keys(artistCounts).reduce((sum, key) => sum + ((artistCounts[key] as number) || 0), 0);

  const permanentTotalSold = regularTotalSold + artistTotalSold;

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
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 select-none flex items-center gap-2">
              <span>🌟</span>GGG X HELL‘S KITCHEN<span>👺</span>
            </h1>
          </div>
        </div>

        {/* Sales history dashboard mini indicators */}
        <div className="flex items-center gap-4 select-none">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 h-12 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">Live-Umsatz:</span>
            <span className="text-base font-black font-mono text-emerald-700">{formatEuro(permanentTotalRevenue)}</span>
          </div>

          <button 
            id="global-stats-btn"
            onClick={() => setShowStats(true)}
            className="px-6 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold tracking-tight shadow-md active:scale-95 transition-all text-sm flex items-center gap-2 cursor-pointer"
          >
            <TrendingUp className="w-4.5 h-4.5 text-emerald-400 stroke-[2.5]" />
            <span>Verkaufsübersicht</span>
          </button>

          <button 
            id="global-completed-orders-btn"
            onClick={() => setShowCompletedOrdersModal(true)}
            className="px-6 h-12 bg-indigo-55 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 border-indigo-200 text-indigo-705 text-indigo-700 rounded-xl font-bold tracking-tight shadow-xs active:scale-95 transition-all text-sm flex items-center gap-2 cursor-pointer"
          >
            <History className="w-4.5 h-4.5 text-indigo-500 stroke-[2.5]" />
            <span>Bestellübersicht ({completedOrders.length})</span>
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
              className="absolute inset-0 p-6 md:p-8 flex flex-col justify-start md:justify-center items-center max-w-6xl w-full mx-auto overflow-y-auto"
            >
              {/* SLIDER / QUEUE FOR ACTIVE PLACED ORDERS */}
              <div id="active-orders-slider-container" className="w-full max-w-5xl px-4 mb-8 select-none">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                    </span>
                    <h2 className="text-xs uppercase font-extrabold tracking-widest text-slate-500 flex items-center gap-1.5">
                      <span>📋</span> Aktive Bestellungen ({activeOrders.length})
                    </h2>
                  </div>
                  {activeOrders.length > 0 && (
                    <span className="text-[11px] text-indigo-500 font-bold animate-pulse">
                      👉 Scroll nach rechts für weitere Bestellungen
                    </span>
                  )}
                </div>

                {activeOrders.length === 0 ? (
                  <div className="bg-white/80 rounded-2xl p-6 text-center border-2 border-dashed border-slate-200 text-slate-400 shadow-3xs">
                    <p className="text-xs font-bold text-slate-600">Noch keine aktiven Bestellungen.</p>
                  </div>
                ) : (
                  <div className="flex overflow-x-auto gap-4 pb-3 pt-1 snap-x no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {activeOrders.map((order) => {
                      const hasArtist = order.items.some(item => item.isArtist);
                      
                      return (
                        <div
                          id={`order-card-${order.id}`}
                          key={order.id}
                          className={`snap-start shrink-0 w-80 bg-white rounded-3xl border p-4 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between ${
                            hasArtist ? 'border-amber-300 bg-amber-50/15' : 'border-gray-200'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2 mb-3">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-slate-900 text-white font-black text-xs px-2 py-0.5 rounded-lg font-mono">
                                #{order.orderNumber}
                              </span>
                              {hasArtist && (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                                  Artist
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-400 font-mono flex items-center gap-1">
                              🕒 {order.timestamp}
                            </span>
                          </div>

                          {/* Card Items List */}
                          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-32 pr-1 mb-4">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start text-xs font-sans">
                                <div className="text-slate-800 font-bold leading-tight flex-1">
                                  <span className="text-indigo-600 font-black mr-1">{item.quantity}x</span>
                                  <span>{item.name}</span>
                                  {item.hasPommes && (
                                    <span className="block text-[10px] font-extrabold text-indigo-500">
                                      🍟 inkl. Pommes
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Card Footer Balance & Action Panel */}
                          <div>
                            <div className="flex justify-between items-center mb-3 pt-2 border-t border-slate-100">
                              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Summe</span>
                              <span className="font-mono font-black text-sm text-slate-900">
                                {formatEuro(order.totalAmount)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {/* Edit triggers editOrder */}
                              <button
                                onClick={() => editOrder(order.id)}
                                className="py-2 px-3 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-xs font-black text-slate-700 rounded-xl transition active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                              >
                                ✏️ Bearbeiten
                              </button>

                              {/* Complete triggers completeOrder */}
                              <button
                                onClick={() => completeOrder(order.id)}
                                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition shadow-xs hover:shadow-md active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                              >
                                ✓ Erledigt
                              </button>
                            </div>
                            
                            {/* Cancel completely option */}
                            <button
                              onClick={() => cancelOrderInQueue(order.id)}
                              className={`w-full text-center mt-2.5 text-[10px] font-semibold transition cursor-pointer ${
                                pendingCancelOrderId === order.id
                                  ? 'text-rose-600 font-extrabold underline animate-pulse'
                                  : 'text-slate-400 hover:text-red-500 hover:underline'
                              }`}
                            >
                              {pendingCancelOrderId === order.id
                                ? '⚠️ Bestätigen: Wirklich löschen?'
                                : 'Stornieren (Löschen)'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* FOUR ICONIC BULK BUTTONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl px-4 select-none">
                
                {/* Burger Starter Button */}
                <button
                  id="start-btn-burger"
                  onClick={() => startBuilder('burger')}
                  className="h-64 bg-white hover:bg-slate-50 border border-gray-200 hover:border-indigo-400 rounded-3xl p-6 flex flex-col justify-center items-center text-center gap-4 shadow-xs hover:shadow-xl transition-all duration-300 active:scale-97 cursor-pointer group"
                >
                  <span className="text-6xl select-none transform group-hover:scale-110 transition-transform">🍔</span>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Burger</h3>
                  </div>
                </button>

                {/* Suppen Starter Button */}
                <button
                  id="start-btn-suppen"
                  onClick={() => startBuilder('suppen')}
                  className="h-64 bg-white hover:bg-slate-50 border border-gray-200 hover:border-indigo-400 rounded-3xl p-6 flex flex-col justify-center items-center text-center gap-4 shadow-xs hover:shadow-xl transition-all duration-300 active:scale-97 cursor-pointer group"
                >
                  <span className="text-6xl select-none transform group-hover:scale-110 transition-transform">🥣</span>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Suppen</h3>
                  </div>
                </button>

                {/* Sorbet Starter Button */}
                <button
                  id="start-btn-sorbet"
                  onClick={() => startBuilder('sorbet')}
                  className="h-64 bg-white hover:bg-slate-50 border border-gray-200 hover:border-indigo-400 rounded-3xl p-6 flex flex-col justify-center items-center text-center gap-4 shadow-xs hover:shadow-xl transition-all duration-300 active:scale-97 cursor-pointer group"
                >
                  <span className="text-6xl select-none transform group-hover:scale-110 transition-transform">🍋</span>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Sorbets</h3>
                  </div>
                </button>

                {/* Beilagen Starter Button */}
                <button
                  id="start-btn-beilagen"
                  onClick={() => startBuilder('beilagen')}
                  className="h-64 bg-white hover:bg-slate-50 border border-gray-200 hover:border-indigo-400 rounded-3xl p-6 flex flex-col justify-center items-center text-center gap-4 shadow-xs hover:shadow-xl transition-all duration-300 active:scale-97 cursor-pointer group"
                >
                  <span className="text-6xl select-none transform group-hover:scale-110 transition-transform">🍟</span>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Beilagen</h3>
                  </div>
                </button>

              </div>

              {/* Bottom guide tag */}
              <div className="mt-12 text-slate-400 flex items-center gap-2 text-xs select-none">
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
              className="absolute inset-0 flex flex-row overflow-hidden h-full bg-slate-50"
            >
              
              {/* LEFT COLUMN: Contains header at top & scrollable menu catalog below */}
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 border-r border-slate-200/80">
                
                {/* Category tab changer + back action - FULL HEIGHT INTEGRATED HEADER */}
                <div className="bg-white p-4 border-b border-gray-200 shrink-0 flex items-center justify-start gap-8 z-20 shadow-xs">
                <button
                  id="back-to-home-btn"
                  onClick={() => {
                    if (cart.length > 0) {
                      if (backButtonConfirmActive) {
                        setCart([]);
                        setBackButtonConfirmActive(false);
                        setCurrentScreen('start');
                      } else {
                        setBackButtonConfirmActive(true);
                        addToast("Zurückgehen?", "Klicke noch einmal, um die aktuelle Bestellliste zu verwerfen.", "info");
                        setTimeout(() => {
                          setBackButtonConfirmActive(false);
                        }, 4000);
                      }
                    } else {
                      setCurrentScreen('start');
                    }
                  }}
                  className={`px-4 py-2 font-bold text-xs flex items-center gap-1.5 rounded-lg transition active:scale-95 cursor-pointer shrink-0 ${
                    backButtonConfirmActive
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{backButtonConfirmActive ? 'Sicher verwerfen?' : 'Zurück'}</span>
                </button>

                {/* Left-aligned control stack: Category pills and Artists toggle cleanly aligned next to Back button */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      id="pill-burger"
                      onClick={() => setActiveCategory('burger')}
                      className={`px-5 py-2 rounded-lg text-xs font-black tracking-tight transition flex items-center gap-2 cursor-pointer ${
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
                      className={`px-5 py-2 rounded-lg text-xs font-black tracking-tight transition flex items-center gap-2 cursor-pointer ${
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
                      className={`px-5 py-2 rounded-lg text-xs font-black tracking-tight transition flex items-center gap-2 cursor-pointer ${
                        activeCategory === 'sorbet'
                          ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/50'
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      <span className="select-none text-base">🍋</span>
                      <span>Sorbet</span>
                    </button>
                    <button
                      id="pill-beilagen"
                      onClick={() => setActiveCategory('beilagen')}
                      className={`px-5 py-2 rounded-lg text-xs font-black tracking-tight transition flex items-center gap-2 cursor-pointer ${
                        activeCategory === 'beilagen'
                          ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/50'
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      <span className="select-none text-base">🍟</span>
                      <span>Beilagen</span>
                    </button>
                  </div>

                  {/* Artists toggle element styled as a professional badge-button with exact vertical alignment */}
                  <button
                    id="artist-mode-toggle"
                    onClick={() => setIsArtistActive(!isArtistActive)}
                    className={`h-8 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1 cursor-pointer outline-none shadow-xs border ${
                      isArtistActive
                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    <span>🎨</span>
                    <span>Artist</span>
                  </button>
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
                              className="bg-white border border-gray-200 rounded-2xl shadow-xs grid grid-cols-2 overflow-hidden hover:border-indigo-400 hover:shadow-md transition-all relative h-[180px]"
                            >
                              {/* Left button: Without Fries */}
                              <button
                                id={`btn-add-burger-no-pommes-${item.key}`}
                                onClick={() => addToCart(item.key, item.name, true, false)}
                                className="p-4 flex flex-col justify-between items-center text-center bg-white hover:bg-slate-50 border-r border-gray-200 active:bg-slate-100 transition-colors cursor-pointer relative group/btn1 h-full outline-none"
                              >
                                {qtyWithoutPommes > 0 && (
                                  <span className="absolute top-3 left-3 bg-slate-100 border border-gray-200 text-slate-700 font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs pointer-events-none">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    <span>{qtyWithoutPommes}x</span>
                                  </span>
                                )}
                                <div className="mt-1 flex flex-col items-center">
                                  <div className="flex flex-row items-center justify-center gap-0.5 mb-2 transform group-hover/btn1:scale-110 transition-transform whitespace-nowrap select-none">
                                    <span className={item.key.toLowerCase().includes('halloumi') ? 'text-2xl' : 'text-4xl'}>
                                      🍔
                                    </span>
                                    {item.key.toLowerCase().includes('halloumi') && (
                                      <span className="text-2xl">🌱</span>
                                    )}
                                  </div>
                                  <h3 className="text-xs font-black text-slate-800 leading-tight">
                                    {item.name}
                                  </h3>
                                </div>
                                <div className="mt-auto w-full">
                                  <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block mb-0.5">Ohne Fries</span>
                                  <span className="text-sm font-black text-slate-900 font-mono">
                                    {formatEuro(item.price)}
                                  </span>
                                </div>
                              </button>
                              
                              {/* Right button: With Fries */}
                              <button
                                id={`btn-add-burger-with-pommes-${item.key}`}
                                onClick={() => addToCart(item.key, item.name, true, true)}
                                className="p-4 flex flex-col justify-between items-center text-center bg-indigo-50/20 hover:bg-indigo-50/60 active:bg-indigo-100/65 transition-colors cursor-pointer relative group/btn2 h-full outline-none"
                              >
                                {qtyWithPommes > 0 && (
                                  <span className="absolute top-3 right-3 bg-indigo-600 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs pointer-events-none">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    <span>{qtyWithPommes}x</span>
                                  </span>
                                )}
                                <div className="mt-1 flex flex-col items-center">
                                  <div className="flex flex-row items-center justify-center gap-0.5 mb-2 transform group-hover/btn2:scale-110 transition-transform whitespace-nowrap select-none">
                                    <span className={item.key.toLowerCase().includes('halloumi') ? 'text-2xl' : 'text-4xl'}>
                                      🍔
                                    </span>
                                    {item.key.toLowerCase().includes('halloumi') && (
                                      <span className="text-2xl">🌱</span>
                                    )}
                                    <span className={item.key.toLowerCase().includes('halloumi') ? 'text-2xl' : 'text-4xl'}>
                                      🍟
                                    </span>
                                  </div>
                                  <h3 className="text-xs font-black text-indigo-950 leading-tight">
                                    {item.name}
                                  </h3>
                                </div>
                                <div className="mt-auto w-full">
                                  <span className="text-[9px] font-black tracking-wider text-indigo-500 uppercase block mb-0.5">+ Fries</span>
                                  <span className="text-sm font-black text-indigo-700 font-mono">
                                    {formatEuro(item.price + PRICES.pommes)}
                                  </span>
                                </div>
                              </button>
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
                          <button
                            key={item.key}
                            id={`btn-add-suppe-${item.key}`}
                            onClick={() => addToCart(item.key, item.name, false)}
                            className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between items-center text-center hover:bg-slate-50 hover:border-indigo-400 hover:shadow-md active:bg-slate-100 transition-all relative h-[180px] w-full cursor-pointer group outline-none"
                          >
                            {/* Quantity Badge */}
                            {quantityInActiveCart > 0 && (
                              <span className="absolute top-3 right-3 bg-indigo-600 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs pointer-events-none">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>{quantityInActiveCart}x</span>
                              </span>
                            )}

                            <div className="mt-2 flex flex-col items-center">
                              <span className="text-4xl block select-none mb-2 transform group-hover:scale-110 transition-transform font-bold">🍲</span>
                              <h3 className="text-sm font-black text-slate-800 leading-tight">
                                {item.name}
                              </h3>
                            </div>

                            <div className="mt-auto w-full">
                              <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block mb-0.5">Suppe</span>
                              <span className="text-sm font-black text-indigo-600 font-mono">
                                {formatEuro(item.price)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* SORBET PANEL */}
                  {activeCategory === 'sorbet' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(() => {
                        const qtySorbet = cart
                          .filter(cItem => cItem.key === 'sorbet')
                          .reduce((sum, item) => sum + item.quantity, 0);
                        const qtySorbetVodka = cart
                          .filter(cItem => cItem.key === 'sorbetVodka')
                          .reduce((sum, item) => sum + item.quantity, 0);

                        return (
                          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs grid grid-cols-2 overflow-hidden hover:border-indigo-400 hover:shadow-md transition-all relative h-[180px]">
                            {/* Left Button: Zitronensorbet (Ohne Alkohol) */}
                            <button
                              id="btn-add-sorbet-standard"
                              onClick={() => addToCart('sorbet', 'Zitronensorbet', false)}
                              className="p-4 flex flex-col justify-between items-center text-center bg-white hover:bg-slate-50 border-r border-gray-200 active:bg-slate-100 transition-colors cursor-pointer relative group/btn1 h-full outline-none"
                            >
                              {qtySorbet > 0 && (
                                <span className="absolute top-3 left-3 bg-slate-100 border border-gray-200 text-slate-700 font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs pointer-events-none">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>{qtySorbet}x</span>
                                </span>
                              )}
                              <div className="mt-1 flex flex-col items-center">
                                <span className="text-4xl block select-none mb-2 transform group-hover/btn1:scale-110 transition-transform">🍋</span>
                                <h3 className="text-xs font-black text-slate-800 leading-tight">
                                  Zitronensorbet
                                </h3>
                              </div>
                              <div className="mt-auto w-full">
                                <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block mb-0.5">Alkoholfrei</span>
                                <span className="text-sm font-black text-slate-900 font-mono">
                                  {formatEuro(3.00)}
                                </span>
                              </div>
                            </button>

                            {/* Right Button: FSK18-Sorbet (Mit Vodka) */}
                            <button
                              id="btn-add-sorbet-vodka"
                              onClick={() => addToCart('sorbetVodka', 'FSK18-Sorbet', false)}
                              className="p-4 flex flex-col justify-between items-center text-center bg-purple-50/10 hover:bg-purple-50/40 active:bg-purple-100/40 transition-colors cursor-pointer relative group/btn2 h-full outline-none"
                            >
                              {qtySorbetVodka > 0 && (
                                <span className="absolute top-3 right-3 bg-purple-600 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs pointer-events-none">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>{qtySorbetVodka}x</span>
                                </span>
                              )}
                              <div className="mt-2 flex flex-col items-center">
                                <div className="flex gap-0.5 mb-2 transform group-hover/btn2:scale-110 transition-transform">
                                  <span className="text-4xl block select-none">🍋</span>
                                  <span className="text-4xl block select-none">🍸</span>
                                </div>
                                <h3 className="text-xs font-black text-purple-950 leading-tight flex flex-col items-center gap-1">
                                  <span>FSK18-Sorbet</span>
                                  <span className="text-[8px] tracking-wider font-extrabold bg-purple-100 text-purple-700 rounded px-1.5 py-0.2 select-none">
                                    MIT VODKA
                                  </span>
                                </h3>
                              </div>
                              <div className="mt-auto w-full">
                                <span className="text-[9px] font-black tracking-wider text-purple-500 uppercase block mb-0.5">Alkoholisch</span>
                                <span className="text-sm font-black text-purple-700 font-mono">
                                  {formatEuro(5.00)}
                                </span>
                              </div>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* BEILAGEN PANEL */}
                  {activeCategory === 'beilagen' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {CATEGORIES.find(c => c.id === 'beilagen')?.items.map((item) => {
                        const quantityInActiveCart = cart
                          .filter(cItem => cItem.key === item.key)
                          .reduce((sum, item) => sum + item.quantity, 0);

                        return (
                          <button
                            key={item.key}
                            id={`btn-add-beilage-${item.key}`}
                            onClick={() => addToCart(item.key, item.name, false)}
                            className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between items-center text-center hover:bg-slate-50 hover:border-indigo-400 hover:shadow-md active:bg-slate-100 transition-all relative h-[180px] w-full cursor-pointer group outline-none"
                          >
                            {/* Quantity Badge */}
                            {quantityInActiveCart > 0 && (
                              <span className="absolute top-3 right-3 bg-indigo-600 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs pointer-events-none">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>{quantityInActiveCart}x</span>
                              </span>
                            )}

                            <div className="mt-1 flex flex-col items-center">
                              <span className="text-4xl block select-none mb-2 transform group-hover:scale-110 transition-transform">🍟</span>
                              <h3 className="text-sm font-black text-slate-800 leading-tight">
                                {item.name}
                              </h3>
                            </div>

                            <div className="mt-auto w-full">
                              <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block mb-0.5">Portion</span>
                              <span className="text-sm font-black text-indigo-600 font-mono">
                                {formatEuro(item.price)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>

              {/* RIGHT COLUMN (Cart Sidebar): Takes full height (top-0 to bottom-0), overlapping/spanning next to Left Column */}
              <div className="w-[34%] lg:w-[30%] xl:w-[26%] shrink-0 flex flex-col h-full bg-white shadow-2xl relative z-35 overflow-hidden border-l border-slate-200">
                
                {/* Clean light info list subtitle for professional top alignment */}
                <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0 flex items-center justify-between select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="font-extrabold text-xs uppercase tracking-wider text-slate-600">Laufende Bestellung</span>
                  </div>
                  {cartTotalItemsCount > 0 && (
                    <span className="text-xs font-mono font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                      {cartTotalItemsCount} Posten
                    </span>
                  )}
                </div>

                {/* SCROLLABLE CART ITEM LINES */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
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
                          className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 relative hover:shadow-sm hover:border-slate-300 transition-all duration-150"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <h4 className="font-black text-xs md:text-sm text-slate-900 flex items-start gap-1 leading-snug">
                                <span className="select-none text-base">
                                  {item.key === 'pommes' || item.key === 'pommesEinzeln' ? '🍟' : 
                                   item.key.toLowerCase().includes('halloumi') ? '🍔🌱' : 
                                   item.key.toLowerCase().includes('burger') ? '🍔' : 
                                   item.key.toLowerCase().includes('suppe') ? '🍲' : '🍋'}
                                </span>
                                <span>{item.name}</span>
                              </h4>
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {item.isArtist && (
                                  <span className="inline-block text-[9px] font-extrabold bg-amber-500 text-white px-1.5 py-0.2 rounded shadow-2xs select-none">
                                    🎨 ARTIST
                                  </span>
                                )}
                                {item.hasPommes && (
                                  <span className="inline-block text-[9px] font-extrabold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-150 select-none">
                                    🍟 + {formatEuro(PRICES.pommes)} Pommes
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Line Price display */}
                            <span className="font-mono text-sm font-black text-slate-900 shrink-0 tracking-tight pt-0.5">
                              {formatEuro(lineTotalPrice)}
                            </span>
                          </div>

                          {/* Adjustment quantites control & deletion */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 font-mono">
                              je {formatEuro(singleItemPrice)}
                            </span>

                            <div className="flex items-center space-x-1 font-mono">
                              <button
                                onClick={() => updateCartQuantity(item.id, -1)}
                                className="w-7.5 h-7.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center transition active:scale-90 outline-none cursor-pointer border border-slate-200/50 font-black"
                              >
                                <Minus className="w-3.5 h-3.5 stroke-[3]" />
                              </button>
                              
                              <span className="font-mono font-black text-sm px-1.5 text-center text-slate-900 select-none min-w-[20px]">
                                {item.quantity}
                              </span>

                              <button
                                onClick={() => updateCartQuantity(item.id, 1)}
                                className="w-7.5 h-7.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center transition active:scale-90 outline-none cursor-pointer border border-slate-200/50 font-black"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              </button>

                              <button
                                onClick={() => updateCartQuantity(item.id, -item.quantity)}
                                className="w-7.5 h-7.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg flex items-center justify-center transition ml-1 outline-none cursor-pointer border border-slate-200/55"
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
                    <div className="h-72 flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl select-none bg-white shadow-3xs">
                      <ShoppingBag className="w-12 h-12 text-slate-300 mb-3 stroke-[1.5]" />
                      <h4 className="font-extrabold text-sm text-slate-600">Bestellliste leer</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal">
                        Klicken Sie links auf die Kacheln, um Speisen für diese Bestellung hinzuzufügen.
                      </p>
                    </div>
                  )}
                </div>

                {/* BOTTOM TOTAL SUMMARY BOX + CONFIRMATON SUBMIT BUTTON */}
                <div className="bg-slate-50 p-4 border-t border-slate-200 shrink-0 space-y-4 shadow-inner relative z-20">
                  <div className="space-y-1 select-none">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Gesamtsumme</span>
                      <span className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
                        {formatEuro(cartTotalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Operational primary buttons */}
                  <div className="flex flex-col gap-1.5">
                    <button
                      id="submit-order-sales-btn"
                      disabled={cart.length === 0}
                      onClick={() => {
                        const hasArtist = cart.some((item) => item.isArtist);
                        if (hasArtist) {
                          finalizeOrder();
                        } else {
                          setAmountPaid('');
                          setShowChangeModal(true);
                        }
                      }}
                      className={`w-full h-12.5 rounded-xl font-black tracking-tight text-sm text-white flex items-center justify-center gap-1.5 transition shadow-md duration-150 ${
                        cart.length > 0
                          ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-100 active:scale-97 cursor-pointer'
                          : 'bg-slate-300 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      <span>Bestellung abschließen</span>
                    </button>

                    {cart.length > 0 && (
                      <button
                        id="clear-active-cart-btn"
                        onClick={clearCart}
                        className="w-full py-2 text-xs text-slate-400 hover:text-red-650 hover:bg-red-50/50 rounded-lg font-bold transition active:scale-98 cursor-pointer"
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



      {/* DYNAMIC TOAST FEEDBACK NOTIFICATIONS */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col space-y-1.5 pointer-events-none max-w-[280px] w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, filter: 'blur(2px)' }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`p-2.5 px-3.5 rounded-lg shadow-md border flex items-center gap-2.5 pointer-events-auto ${
                toast.type === 'reset'
                  ? 'bg-rose-600 border-rose-700 text-white'
                  : toast.type === 'info'
                    ? 'bg-indigo-600 border-indigo-700 text-white'
                    : 'bg-emerald-600 border-emerald-700 text-white'
              }`}
            >
              <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                {toast.type === 'reset' ? '⚠️' : toast.type === 'info' ? 'ℹ️' : '✓'}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-extrabold text-xs tracking-tight truncate">{toast.message}</h5>
                {toast.submessage && (
                  <p className="text-[10px] text-white/80 leading-tight truncate mt-0.5">{toast.submessage}</p>
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

      {/* OVERLAY C2: COMPLETED ORDERS OVERVIEW DIALOG */}
      <AnimatePresence>
        {showCompletedOrdersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              key="completed-orders-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompletedOrdersModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div
              key="completed-orders-modal"
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
                    <History className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900">Abgeschlossene Bestellungen</h3>
                    <p className="text-xs text-slate-400">Verwalte und korrigiere bereits gebuchte Umsätze</p>
                  </div>
                </div>
                <button
                  id="completed-orders-close-btn-x"
                  onClick={() => setShowCompletedOrdersModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition border border-gray-200 text-slate-600 active:scale-90 outline-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contents Area */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-4 flex-1">
                {completedOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-150 flex items-center justify-center text-3xl mb-4 select-none">
                      📭
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-800">Keine abgeschlossenen Bestellungen</h4>
                    <p className="text-xs text-slate-500 max-w-xs mt-1 leading-normal">
                      Sobald du im Kassen-Bildschirm Bestellungen abschließt und abgleichst, erscheinen sie hier zur nachträglichen Anpassung.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {completedOrders.map((order) => {
                      const isPendingCancel = pendingCompletedCancelOrderId === order.id;
                      return (
                        <div key={order.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-900">
                                Bestellung #{order.orderNumber}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">
                                {order.dateString} um {order.completedAt} Uhr
                              </span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">
                                {formatEuro(order.totalAmount)}
                              </span>
                            </div>

                            {/* Item pills */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {order.items.map((item, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-50 text-slate-700 border border-slate-150 text-[11px] font-medium">
                                  {item.isArtist ? '🎨' : '👤'} {item.quantity}x {item.name}
                                  {item.hasPommes && <span className="text-slate-400 font-bold ml-0.5">(+ 🍟)</span>}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                            <button
                              onClick={() => adaptCompletedOrder(order.id)}
                              className="h-9 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 text-xs font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                              title="Bestellung wieder aktiv schalten, um sie im Warenkorb anzupassen"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Anpassen</span>
                            </button>

                            <button
                              onClick={() => handleCancelCompletedClick(order.id)}
                              className={`h-9 px-3 text-xs font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                                isPendingCancel
                                  ? "bg-rose-600 text-white border border-rose-700 animate-pulse shadow-sm"
                                  : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100"
                              }`}
                              title={isPendingCancel ? "Klicke noch einmal zum Bestätigen" : "Umsatz abziehen und stornieren"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{isPendingCancel ? "Sicher?" : "Stornieren"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-gray-200 px-8 py-5 flex justify-end shrink-0">
                <button
                  id="completed-orders-close-btn-footer"
                  onClick={() => setShowCompletedOrdersModal(false)}
                  className="px-6 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition cursor-pointer"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Card 1: Startkassenbestand */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10.5px] uppercase font-extrabold tracking-wider text-slate-550 block">
                        🪙 Startkassenbestand
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={startingCash === 0 ? '' : startingCash}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setStartingCash(isNaN(val) || val < 0 ? 0 : val);
                            }}
                            placeholder="0,00"
                            className="w-full bg-white border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-lg font-black font-mono text-slate-900 focus:outline-hidden focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-mono"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 select-none">€</span>
                        </div>
                        {startingCash > 0 && (
                          <button
                            onClick={() => setStartingCash(0)}
                            className="p-2 border border-slate-300 hover:border-rose-400 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition active:scale-95 shrink-0 cursor-pointer"
                            title="Zurücksetzen"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Quick Add presets */}
                    <div className="flex gap-1.5 mt-3 select-none">
                      {[20, 50, 100, 200].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setStartingCash((prev) => prev + preset)}
                          className="flex-1 py-1.5 bg-white hover:bg-slate-100 border border-slate-250 active:scale-95 rounded-lg text-xs font-black text-slate-755 transition cursor-pointer"
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: Gesamtumsatz */}
                  <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex flex-col justify-between select-none">
                    <div>
                      <span className="text-[10.5px] uppercase font-extrabold tracking-wider text-emerald-800 opacity-70 block">
                        📈 Gesamtumsatz
                      </span>
                      <span className="text-3xl font-black font-mono text-emerald-950 block mt-2">
                        {formatEuro(permanentTotalRevenue)}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold mt-3 bg-emerald-100/30 px-2.5 py-1.5 rounded-lg border border-emerald-100/50">
                      Umsatz: Standard {formatEuro(regularTotalRevenue)} | Artists {formatEuro(artistTotalRevenue)}
                    </div>
                  </div>

                  {/* Card 3: Expected final cash balance (Soll-Bestand) */}
                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex flex-col justify-between select-none">
                    <div>
                      <span className="text-[10.5px] uppercase font-extrabold tracking-wider text-blue-800 opacity-70 block">
                        💼 Soll-Kassenbestand (Endbestand)
                      </span>
                      <span className="text-3xl font-black font-mono text-blue-950 block mt-2">
                        {formatEuro(startingCash + permanentTotalRevenue)}
                      </span>
                    </div>
                    <div className="text-[11px] text-blue-700 font-semibold mt-3 bg-blue-100/30 px-2.5 py-1.5 rounded-lg border border-blue-100/50">
                      Standard-Kasse: {formatEuro(startingCash)} + Live-Umsatz
                    </div>
                  </div>

                  {/* Card 4: Posten Verkauft */}
                  <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 flex flex-col justify-between select-none">
                    <div>
                      <span className="text-[10.5px] uppercase font-extrabold tracking-wider text-indigo-800 opacity-70 block">
                        📊 Posten Verkauft
                      </span>
                      <span className="text-3xl font-black font-mono text-indigo-950 block mt-2">
                        {permanentTotalSold} <span className="text-sm font-medium">Stück</span>
                      </span>
                    </div>
                    <div className="text-[11px] text-indigo-700 font-semibold mt-3 bg-indigo-100/30 px-2.5 py-1.5 rounded-lg border border-indigo-100/50">
                      Abgeschlossene Bestellungen insgesamt
                    </div>
                  </div>

                </div>

                {/* Items detail lists partitioned by Standard and Artist */}
                <div className="space-y-6">
                  {/* Standard-Verkäufe Subsection */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-slate-500 select-none flex items-center justify-between">
                      <span>📋 Standard-Verkäufe</span>
                      <span className="font-mono text-xs text-indigo-600 font-bold">Subtotal: {formatEuro(regularTotalRevenue)}</span>
                    </h4>
                    {regularTotalSold > 0 ? (
                      <div className="border border-gray-250 bg-white rounded-2xl overflow-hidden divide-y divide-gray-150">
                        {Object.entries(counts).map(([key, count]) => {
                          const typedKey = key as ItemKey;
                          const price = PRICES[typedKey] || 0;
                          const itemTotal = (count as number) * price;
                          if ((count as number) === 0) return null; // hide empty entries for absolute screen elegance
                          
                          return (
                            <div key={`regular-${key}`} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                              <div className="flex items-center space-x-3 pr-2">
                                <span className="text-2xl select-none">
                                  {key === 'pommes' || key === 'pommesEinzeln' ? '🍟' : 
                                   key.toLowerCase().includes('halloumi') ? '🍔🌱' : 
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
                    ) : (
                      <div className="bg-slate-50/80 rounded-2xl p-4 text-center border border-dashed border-gray-200 text-slate-400 text-xs">
                        Keine Standard-Verkäufe gebucht
                      </div>
                    )}
                  </div>

                  {/* Artist-Verkäufe Subsection */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-amber-600 select-none flex items-center justify-between">
                      <span>🎨 Artist-Verkäufe</span>
                      <span className="font-mono text-xs text-amber-650 font-bold">Subtotal: {formatEuro(artistTotalRevenue)}</span>
                    </h4>
                    {artistTotalSold > 0 ? (
                      <div className="border border-amber-250 bg-amber-50/5 rounded-2xl overflow-hidden divide-y divide-amber-100/50">
                        {Object.entries(artistCounts).map(([key, count]) => {
                          const typedKey = key as ItemKey;
                          const price = PRICES[typedKey] || 0;
                          const itemTotal = (count as number) * price;
                          if ((count as number) === 0) return null; // hide empty entries
                          
                          return (
                            <div key={`artist-${key}`} className="p-4 flex items-center justify-between hover:bg-amber-50/10 transition">
                              <div className="flex items-center space-x-3 pr-2">
                                <span className="text-2xl select-none">
                                  {key === 'pommes' || key === 'pommesEinzeln' ? '🍟' : 
                                   key.toLowerCase().includes('halloumi') ? '🍔🌱' : 
                                   key.toLowerCase().includes('burger') ? '🍔' : 
                                   key.toLowerCase().includes('suppe') ? '🍲' : '🍋'}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                                    <span>{ITEM_NAMES[typedKey]}</span>
                                    <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 rounded px-1.5 py-0.2 select-none">Artist</span>
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono">
                                    Einzelpreis: {formatEuro(price)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-6 text-right select-none">
                                <div>
                                  <span className="text-[10px] text-amber-600 block uppercase font-bold">Verkäufe</span>
                                  <span className="font-mono font-bold text-amber-950 text-sm">
                                    {count}x
                                  </span>
                                </div>
                                <div className="w-24">
                                  <span className="text-[10px] text-amber-600 block uppercase font-bold">Summe</span>
                                  <span className="font-mono font-bold text-amber-950 text-sm">
                                    {formatEuro(itemTotal)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-amber-50/10 rounded-2xl p-4 text-center border border-dashed border-amber-250/60 text-amber-600/70 text-xs">
                        Keine Artist-Verkäufe gebucht
                      </div>
                    )}
                  </div>
                </div>


              </div>

              {/* Action buttons inside stats */}
              <div className="bg-slate-50 border-t border-gray-200 px-8 py-5 flex items-center justify-between gap-3 shrink-0">
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
                ) : (
                  <div className="w-[124px]" />
                )}

                <button
                  id="stats-pdf-export-btn"
                  onClick={exportToPDF}
                  className="h-12 px-5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition active:scale-95 outline-none cursor-pointer shadow-md shadow-indigo-100"
                  title="Bericht als PDF herunterladen"
                >
                  <FileDown className="w-4.5 h-4.5 stroke-[2.5]" />
                  <span>PDF Export</span>
                </button>

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

      {/* OVERLAY F: CHANGE CALCULATOR (RÜCKGELD RECHNER) */}
      <AnimatePresence>
        {showChangeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div 
              key="change-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChangeModal(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              key="change-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🪙</span>
                  <h4 className="font-extrabold text-base tracking-tight text-white m-0">Rückgeld-Rechner</h4>
                </div>
                <button 
                  onClick={() => setShowChangeModal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="p-6 overflow-y-auto space-y-5">
                {/* Visual pricing cards */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl select-none">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">Zu zahlen</span>
                    <span className="text-2xl font-black font-mono text-slate-900 block mt-1">
                      {formatEuro(cartTotalAmount)}
                    </span>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl relative select-none">
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-700 opacity-70 block">Gegeben</span>
                    <div className="flex items-baseline mt-1">
                      <span className="text-2xl font-black font-mono text-indigo-950">
                        {amountPaid ? formatEuro(parseFloat(amountPaid) || 0) : '0,00 €'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Return amount / change output display */}
                {(() => {
                  const paid = parseFloat(amountPaid) || 0;
                  const diff = paid - cartTotalAmount;
                  if (amountPaid === '') {
                    return (
                      <div className="bg-slate-50 text-slate-500 rounded-2xl p-4 text-center text-xs font-bold border border-slate-200 select-none">
                        Bitte Betrag eingeben oder Presets unten wählen...
                      </div>
                    );
                  }
                  if (diff < 0) {
                    return (
                      <div className="bg-rose-50 text-rose-800 rounded-2xl p-4 text-center border border-rose-200 flex flex-col items-center select-none">
                        <span className="text-xs uppercase font-extrabold tracking-wider text-rose-600 block">Es fehlen noch:</span>
                        <span className="text-2xl font-black font-mono text-rose-700 mt-1">
                          {formatEuro(Math.abs(diff))}
                        </span>
                      </div>
                    );
                  }
                  
                  // Given amount >= total sum: show change breakdown
                  const changeBreakdown = getChangeBreakdown(diff);
                  return (
                    <div className="space-y-3">
                      <div className="bg-emerald-50 text-emerald-850 rounded-2xl p-5 text-center border border-emerald-200 flex flex-col items-center relative overflow-hidden select-none">
                        <span className="text-[10.5px] uppercase font-extrabold tracking-widest text-emerald-600 block">Rückgeld:</span>
                        <span className="text-4xl font-black font-mono text-emerald-800 mt-1">
                          {formatEuro(diff)}
                        </span>
                      </div>

                      {changeBreakdown.length > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 select-none">
                          <span className="text-[10px] uppercase font-black tracking-widest text-slate-550 block mb-2">💡 Auszahlen als:</span>
                          <div className="grid grid-cols-2 gap-2">
                            {changeBreakdown.map((item, idx) => (
                              <div key={idx} className="bg-white px-3 py-2 rounded-xl border border-slate-250 flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-705">{item.label}</span>
                                <span className="font-black font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg text-xs">
                                  {item.count}x
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Keypad and Presets combined layout */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Presets and money quick-select - 5 columns */}
                  <div className="col-span-12 sm:col-span-5 space-y-2 select-none">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">Geldscheine</span>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => setAmountPaid(cartTotalAmount.toFixed(2))}
                        className="py-2.5 bg-white border border-slate-300 hover:bg-slate-50 font-black text-slate-800 rounded-xl transition active:scale-95 text-xs flex justify-between px-3 cursor-pointer"
                      >
                        <span>Passend</span>
                        <span className="font-mono text-emerald-600">{formatEuro(cartTotalAmount)}</span>
                      </button>
                      
                      {/* Suggest standard euro bills */}
                      {[5, 10, 20, 50, 100].map((bill) => {
                        const isSufficient = bill >= cartTotalAmount;
                        return (
                          <button
                            key={bill}
                            onClick={() => setAmountPaid(bill.toFixed(2))}
                            className={`py-2.5 border rounded-xl font-black transition active:scale-95 text-xs text-left px-3 flex justify-between cursor-pointer ${
                              isSufficient 
                                ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950 hover:bg-indigo-50' 
                                : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                            }`}
                          >
                            <span>{bill} € Schein</span>
                            {isSufficient && (
                              <span className="font-mono text-[10px] text-indigo-600 font-bold">
                                Rückgeld: {formatEuro(bill - cartTotalAmount)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Virtual numeric pad - 7 columns */}
                  <div className="col-span-12 sm:col-span-7 select-none">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-2">Tastatur</span>
                    <div className="grid grid-cols-3 gap-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ',', '⌫'].map((key) => {
                        let clickHandler = () => {};
                        if (key === '⌫') {
                          clickHandler = () => setAmountPaid((prev) => prev.slice(0, -1));
                        } else if (key === ',') {
                          clickHandler = () => {
                            setAmountPaid((prev) => {
                              if (prev.includes('.')) return prev;
                              return prev + '.';
                            });
                          };
                        } else {
                          clickHandler = () => {
                            setAmountPaid((prev) => {
                              if (prev === '0') return key;
                              return prev + key;
                            });
                          };
                        }

                        const isBackspace = key === '⌫';
                        const isComma = key === ',';

                        return (
                          <button
                            key={key}
                            onClick={clickHandler}
                            className={`h-11 flex items-center justify-center font-black rounded-xl transition active:scale-90 border text-sm cursor-pointer ${
                              isBackspace 
                                ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 text-base'
                                : isComma 
                                  ? 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                                  : 'bg-white border-slate-250 text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            {key}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm & Complete Actions inside footer */}
              <div className="bg-slate-100/50 border-t border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0 select-none">
                <button
                  onClick={() => setShowChangeModal(false)}
                  className="flex-1 py-3 border border-slate-250 bg-white hover:bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs transition active:scale-95 cursor-pointer text-center"
                >
                  Abbrechen
                </button>
                <button
                  disabled={(() => {
                    const diff = (parseFloat(amountPaid) || 0) - cartTotalAmount;
                    if (amountPaid !== '' && diff < 0) return true;
                    return false;
                  })()}
                  onClick={finalizeOrder}
                  className={`flex-1 py-3 text-white font-extrabold rounded-xl text-xs transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                    (() => {
                      const diff = (parseFloat(amountPaid) || 0) - cartTotalAmount;
                      if (amountPaid !== '' && diff < 0) {
                        return 'bg-slate-300 cursor-not-allowed opacity-50';
                      }
                      return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-50';
                    })()
                  }`}
                >
                  <CheckCircle2 className="w-4.5 h-4.5" />
                  Bestellung buchen
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
