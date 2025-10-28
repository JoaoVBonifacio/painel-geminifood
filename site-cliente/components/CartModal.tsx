import { useState, useEffect } from 'react';
// Importa as interfaces atualizadas de page.tsx
import { CartItem, Settings } from '../app/page';
import { CheckoutForm } from './CheckoutForm';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[]; // CartItem agora tem selectedOption e id composto
  settings: Settings;
  total: number;
  onChangeQuantity: (cartItemId: string, amount: number) => void; // Recebe o id composto
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

const formatCurrency = (value: number) => `${(value || 0).toFixed(2).replace('.', ',')} €`;

export const CartModal = ({ isOpen, onClose, cart, settings, total, onChangeQuantity, setCart }: CartModalProps) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const minimumOrder = settings.minimumOrder || 0;
  const canCheckout = total >= minimumOrder;

  useEffect(() => {
    // Reset checkout state when modal closes
    if (!isOpen) {
      const timer = setTimeout(() => setIsCheckingOut(false), 300); // Delay to allow fade out
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100 modal-backdrop' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg flex flex-col transform transition-all duration-300 ease-in-out max-h-[90vh] ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isCheckingOut ? (
           <CheckoutForm
              onBack={() => setIsCheckingOut(false)}
              cart={cart}
              total={total}
              settings={settings}
              onClose={onClose} // Pass onClose to allow CheckoutForm to close the modal
              setCart={setCart} // Pass setCart to allow CheckoutForm to clear the cart
           />
        ) : (
          <>
            {/* Header do Modal */}
            <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">O seu Carrinho</h2>
              <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 text-2xl">&times;</button>
            </div>

            {/* Lista de Itens do Carrinho */}
            <div className="flex-grow overflow-y-auto p-5">
              {cart.length > 0 ? (
                <div className="space-y-4">
                  {cart.map(item => (
                    // Use item.id (composite ID) as key
                    // Reduzido gap para gap-3
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      {/* Adicionado min-w-0 para correção de layout */}
                      <div className="flex-grow min-w-0">
                        {/* Show product name and selected option name */}
                        {/* Adicionado truncate opcionalmente */}
                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                          {item.name}
                          {item.selectedOption && item.selectedOption.name !== "Padrão" && ` - ${item.selectedOption.name}`}
                        </p>
                        {/* Show unit price of the selected option */}
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.price)}</p>
                      </div>
                      {/* Botões de Quantidade com classes dark */}
                      <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0">
                        <button onClick={() => onChangeQuantity(item.id, -1)} className="text-lg font-bold w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300">-</button>
                        <span className="font-semibold w-5 text-center text-gray-800 dark:text-gray-200">{item.quantity}</span>
                        <button onClick={() => onChangeQuantity(item.id, 1)} className="text-lg font-bold w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-gray-500 dark:text-gray-400">O seu carrinho está vazio.</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Adicione itens do cardápio para começar.</p>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            {cart.length > 0 && (
              <div className="p-5 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex-shrink-0">
                 {!canCheckout && minimumOrder > 0 && (
                    <p className="text-xs text-center text-red-600 dark:text-red-500 mb-3">
                      Faltam {formatCurrency(minimumOrder - total)} para atingir o pedido mínimo de {formatCurrency(minimumOrder)}.
                    </p>
                  )}
                <div className="flex justify-between items-center font-bold text-lg mb-4 text-gray-800 dark:text-gray-100">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <button
                  onClick={() => setIsCheckingOut(true)}
                  disabled={!canCheckout}
                  className="w-full bg-green-500 text-white font-bold py-3 px-5 rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-green-600 dark:hover:bg-green-700 transition-all duration-200 text-center"
                >
                  Finalizar Pedido
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};