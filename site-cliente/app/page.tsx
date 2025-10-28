"use client";
import { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { CartModal } from '../components/CartModal';
import { Header } from '../components/Header';
import { OpeningHoursModal } from '../components/OpeningHoursModal';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, orderBy, query } from 'firebase/firestore';

// --- Updated Interfaces ---
export interface ProductOption {
  name: string;
  price: number;
}
export interface Product {
  id: string; // Original Firestore document ID
  name: string;
  description: string;
  imageUrl: string;
  categoryId: string;
  options: ProductOption[];
}
export interface CartItem extends Omit<Product, 'id' | 'price'> {
  id: string; // Composite ID (productId-optionName)
  quantity: number;
  selectedOption: ProductOption;
  price: number; // Price of the selected option
}
// --- End Updated Interfaces ---

export interface Settings {
  minimumOrder: number;
  whatsappNumber: string;
  whatsappMessage: string;
  isStoreClosed?: boolean;
}
export interface Category {
  id: string;
  name: string;
}
export interface MenuSection {
  title: string;
  data: Product[];
}

export default function Home() {
  const [menuData, setMenuData] = useState<MenuSection[]>([]);
  const [settings, setSettings] = useState<Settings>({ minimumOrder: 0, whatsappNumber: '', whatsappMessage: '', isStoreClosed: false });
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [isScheduleVisible, setIsScheduleVisible] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const productsUnsubscribe = onSnapshot(collection(db, "products"), (productsSnapshot) => {
      const productsData = productsSnapshot.docs.map(doc => {
        const data = doc.data();
        if (!data.options || !Array.isArray(data.options) || data.options.length === 0) {
          if (typeof data.price === 'number') {
             console.warn(`Produto ${doc.id} (${data.name}) sem 'options'. Migrando de 'price'.`);
             data.options = [{ name: "Padrão", price: data.price }];
          } else {
             console.warn(`Produto ${doc.id} (${data.name}) sem 'options' e sem 'price'. Usando preço 0.`);
             data.options = [{ name: "Padrão", price: 0 }];
          }
        } else {
           data.options = data.options.map((opt: { name?: string; price?: number }, index: number) => ({ // Tipo corrigido aqui
             name: typeof opt.name === 'string' && opt.name.trim() !== '' ? opt.name.trim() : `Opção ${index + 1}`,
             price: typeof opt.price === 'number' ? opt.price : 0
           }));
        }
        delete data.price;
        return { id: doc.id, ...data } as Product;
      });

      const q = query(collection(db, "categories"), orderBy("name"));
      const categoriesUnsubscribe = onSnapshot(q, (categoriesSnapshot) => {
        const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        const formattedMenu = categoriesData
          .map(category => ({
            title: category.name,
            data: productsData.filter(product => product.categoryId === category.id && product.options.length > 0)
          }))
          .filter(section => section.data.length > 0);
        setMenuData(formattedMenu);
        setIsLoading(false);
      });
      return () => categoriesUnsubscribe();
    });

    const settingsUnsubscribe = onSnapshot(doc(db, "settings", "main"), (doc) => {
      if (doc.exists()) { setSettings(doc.data() as Settings); }
    });

    return () => { productsUnsubscribe(); settingsUnsubscribe(); };
  }, []);

  const handleAddToCart = (product: Product, selectedOption: ProductOption) => {
    if (settings.isStoreClosed) return;
    setCart(prevCart => {
      const cartItemId = `${product.id}-${selectedOption.name}`;
      const existingItemIndex = prevCart.findIndex(item => item.id === cartItemId);
      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], quantity: updatedCart[existingItemIndex].quantity + 1 };
        return updatedCart;
      } else {
        const newItem: CartItem = {
          name: product.name, description: product.description, imageUrl: product.imageUrl, categoryId: product.categoryId, options: product.options,
          id: cartItemId, price: selectedOption.price, selectedOption: selectedOption, quantity: 1,
        };
        return [...prevCart, newItem];
      }
    });
  };

  const handleChangeQuantity = (cartItemId: string, amount: number) => {
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity: item.quantity + amount } : item).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading) { return (<div className="flex h-screen items-center justify-center"><p className="text-lg text-gray-600 dark:text-gray-400">A carregar o cardápio...</p></div>); } // Adicionado dark:text-gray-400

  return (
    // Removido bg-gray-50 para herdar do body
    <div className="min-h-screen">
      <Header
        cartItemCount={cartItemCount}
        onCartClick={() => setIsCartVisible(true)}
        onScheduleClick={() => setIsScheduleVisible(true)}
      />

      {settings.isStoreClosed && (
        <div className="bg-red-500 text-white text-center p-3 font-semibold">
          A nossa loja encontra-se fechada no momento. Não estamos a aceitar pedidos.
        </div>
      )}

      <main className="container mx-auto max-w-4xl p-4">
        {menuData.length > 0 ? (
          <div className="space-y-12">
            {menuData.map((section) => (
              <section key={section.title}>
                {/* Adicionado dark:text-gray-100 ao H2 */}
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">{section.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {section.data.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      isStoreClosed={settings.isStoreClosed}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            {/* Adicionado dark:text-gray-400 e dark:text-gray-500 */}
            <p className="text-xl text-gray-500 dark:text-gray-400">O nosso cardápio está a ser preparado!</p>
          </div>
        )}
      </main>

      <CartModal isOpen={isCartVisible} onClose={() => setIsCartVisible(false)} cart={cart} settings={settings} total={cartTotal} onChangeQuantity={handleChangeQuantity} setCart={setCart}/>
      <OpeningHoursModal isOpen={isScheduleVisible} onClose={() => setIsScheduleVisible(false)} />
    </div>
  );
}