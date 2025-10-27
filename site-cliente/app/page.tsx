"use client";
import { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { CartModal } from '../components/CartModal';
import { Header } from '../components/Header';
import { OpeningHoursModal } from '../components/OpeningHoursModal';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, orderBy, query } from 'firebase/firestore';

// --- Updated Interfaces ---
// Interface for a single product option
export interface ProductOption {
  name: string;
  price: number;
}

// Updated Product interface to use 'options'
export interface Product {
  id: string; // Original Firestore document ID
  name: string;
  description: string;
  imageUrl: string;
  categoryId: string;
  options: ProductOption[]; // Use 'options' array
}

// Updated CartItem to include the selected option and use composite ID
export interface CartItem extends Omit<Product, 'id' | 'price'> { // Omit original id and price
  id: string; // This will be the composite ID (productId-optionName)
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
      // Ensure products have the 'options' array structure
      const productsData = productsSnapshot.docs.map(doc => {
        const data = doc.data();
        // Basic check/migration for old 'price' field if 'options' is missing or invalid
        if (!data.options || !Array.isArray(data.options) || data.options.length === 0) {
          if (typeof data.price === 'number') { // Check if old price field exists
             console.warn(`Produto ${doc.id} (${data.name}) sem 'options'. Migrando de 'price'.`);
             data.options = [{ name: "Padrão", price: data.price }];
          } else {
             console.warn(`Produto ${doc.id} (${data.name}) sem 'options' e sem 'price'. Usando preço 0.`);
             data.options = [{ name: "Padrão", price: 0 }]; // Fallback if no price info
          }
        } else {
           // Ensure options have name and price, correcting if necessary
           data.options = data.options.map((opt: { name?: string; price?: number }, index: number) => ({
                name: typeof opt.name === 'string' && opt.name.trim() !== '' ? opt.name.trim() : `Opção ${index + 1}`,
                price: typeof opt.price === 'number' ? opt.price : 0
            }));
        }
        // Remove the old price field from the object before casting to Product type
        delete data.price;
        return { id: doc.id, ...data } as Product; // Cast to Product type AFTER ensuring options exist
      });


      const q = query(collection(db, "categories"), orderBy("name"));
      const categoriesUnsubscribe = onSnapshot(q, (categoriesSnapshot) => {
        const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        const formattedMenu = categoriesData
          .map(category => ({
            title: category.name,
            // Filter products ensuring they have valid options before adding
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

  // --- Updated handleAddToCart ---
  const handleAddToCart = (product: Product, selectedOption: ProductOption) => {
    if (settings.isStoreClosed) return;

    setCart(prevCart => {
      const cartItemId = `${product.id}-${selectedOption.name}`; // Composite ID
      const existingItemIndex = prevCart.findIndex(item => item.id === cartItemId);

      if (existingItemIndex > -1) {
        // Increment quantity if item with same option exists
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + 1,
        };
        return updatedCart;
      } else {
        // Add new item if it's a new product or option
        const newItem: CartItem = {
          // Spread only necessary fields from product, override id and price
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          categoryId: product.categoryId,
          options: product.options, // Keep original options if needed later
          id: cartItemId, // Use composite ID
          price: selectedOption.price, // Use selected option's price
          selectedOption: selectedOption,
          quantity: 1,
        };
        return [...prevCart, newItem];
      }
    });
  };
  // --- End Updated handleAddToCart ---

  // --- Updated handleChangeQuantity ---
  const handleChangeQuantity = (cartItemId: string, amount: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.id === cartItemId
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter(item => item.quantity > 0) // Remove item if quantity is 0 or less
    );
  };
  // --- End Updated handleChangeQuantity ---

  // --- Cart Total Calculation (Now uses CartItem's price) ---
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  // --- End Cart Total Calculation ---

  if (isLoading) { return (<div className="flex h-screen items-center justify-center bg-gray-50"><p className="text-lg text-gray-600">A carregar o cardápio...</p></div>); }

  return (
    <div className="bg-gray-50 min-h-screen">
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
                <h2 className="text-3xl font-bold text-gray-800 mb-6">{section.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {section.data.map((product) => (
                    // ProductCard now receives the updated handleAddToCart function implicitly
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart} // Pass the updated function
                      isStoreClosed={settings.isStoreClosed}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-gray-500">O nosso cardápio está a ser preparado!</p>
          </div>
        )}
      </main>

      {/* CartModal and OpeningHoursModal remain the same */}
      <CartModal isOpen={isCartVisible} onClose={() => setIsCartVisible(false)} cart={cart} settings={settings} total={cartTotal} onChangeQuantity={handleChangeQuantity} setCart={setCart}/>
      <OpeningHoursModal isOpen={isScheduleVisible} onClose={() => setIsScheduleVisible(false)} />
    </div>
  );
}