"use client";
import { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { CartModal } from '../components/CartModal';
import { Header } from '../components/Header';
import { OpeningHoursModal } from '../components/OpeningHoursModal';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, orderBy, query } from 'firebase/firestore';

// ... (interfaces Product, CartItem, etc. continuam aqui) ...
export interface Product { id: string; name: string; description: string; price: number; imageUrl: string; categoryId: string; }
export interface CartItem extends Product { quantity: number; }
export interface Settings { minimumOrder: number; whatsappNumber: string; whatsappMessage: string; isStoreClosed?: boolean; }
export interface Category { id: string; name: string; }
export interface MenuSection { title: string; data: Product[]; }


export default function Home() {
  const [menuData, setMenuData] = useState<MenuSection[]>([]);
  const [settings, setSettings] = useState<Settings>({ minimumOrder: 0, whatsappNumber: '', whatsappMessage: '', isStoreClosed: false });
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [isScheduleVisible, setIsScheduleVisible] = useState(false);

  // TODA A LÓGICA DE TEMA FOI REMOVIDA DAQUI

  useEffect(() => {
    setIsLoading(true);
    const productsUnsubscribe = onSnapshot(collection(db, "products"), (productsSnapshot) => {
      const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      const q = query(collection(db, "categories"), orderBy("name"));
      const categoriesUnsubscribe = onSnapshot(q, (categoriesSnapshot) => {
        const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        const formattedMenu = categoriesData.map(category => ({ title: category.name, data: productsData.filter(product => product.categoryId === category.id) })).filter(section => section.data.length > 0);
        setMenuData(formattedMenu);
        setIsLoading(false);
      });
      return () => categoriesUnsubscribe();
    });
    const settingsUnsubscribe = onSnapshot(doc(db, "settings", "main"), (doc) => {
      if(doc.exists()){ setSettings(doc.data() as Settings); }
    });
    return () => { productsUnsubscribe(); settingsUnsubscribe(); };
  }, []);

  const handleAddToCart = (product: Product) => { setCart(prev => { const existing = prev.find(item => item.id === product.id); if (existing) { return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item); } return [...prev, { ...product, quantity: 1 }]; }); };
  const handleChangeQuantity = (productId: string, amount: number) => { setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: item.quantity + amount } : item).filter(item => item.quantity > 0)); };
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading) { return (<div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><p className="text-lg text-gray-600 dark:text-gray-300">A carregar o cardápio...</p></div>); }

  return (
    <div className="bg-gray-50 min-h-screen dark:bg-gray-900">
      <Header 
        cartItemCount={cartItemCount} 
        onCartClick={() => setIsCartVisible(true)}
        onScheduleClick={() => setIsScheduleVisible(true)}
        // As props de tema não são mais necessárias aqui
      />
      
      {settings.isStoreClosed && (
        <div className="bg-red-500 text-white text-center p-3 font-semibold">
          A nossa loja encontra-se fechada no momento. Não estamos a aceitar pedidos.
        </div>
      )}

      <main className="container mx-auto max-w-4xl p-4">
        {menuData.length > 0 ? (<div className="space-y-12">{menuData.map((section) => (<section key={section.title}><h2 className="text-3xl font-bold text-gray-800 mb-6 dark:text-gray-100">{section.title}</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{section.data.map((product) => (<ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} isStoreClosed={settings.isStoreClosed} />))}</div></section>))}</div>) : (<div className="text-center py-20"><p className="text-xl text-gray-500 dark:text-gray-300">O nosso cardápio está a ser preparado!</p></div>)}
      </main>

      <CartModal isOpen={isCartVisible} onClose={() => setIsCartVisible(false)} cart={cart} settings={settings} total={cartTotal} onChangeQuantity={handleChangeQuantity} setCart={setCart}/>
      <OpeningHoursModal isOpen={isScheduleVisible} onClose={() => setIsScheduleVisible(false)} />
    </div>
  );
}