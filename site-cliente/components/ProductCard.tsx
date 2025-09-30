import { Product } from '../app/page';

// Adicione isStoreClosed à interface
interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isStoreClosed?: boolean; 
}

const formatCurrency = (value: number) => `${(value || 0).toFixed(2).replace('.', ',')} €`;

export const ProductCard = ({ product, onAddToCart, isStoreClosed }: ProductCardProps) => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
    <div className="w-full h-48">
      <img
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    <div className="p-4 flex-grow flex flex-col justify-between">
      <div>
        <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
        <p className="text-gray-600 mt-1">{product.description}</p>
      </div>
      <div className="flex justify-between items-center mt-4">
        <span className="text-lg font-semibold text-yellow-600">{formatCurrency(product.price)}</span>
        {/* Adicione a lógica para desabilitar o botão */}
        <button
          onClick={() => onAddToCart(product)}
          disabled={isStoreClosed}
          className="bg-orange-400 text-white font-semibold px-4 py-2 rounded-md hover:bg-orange-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Adicionar
        </button>
      </div>
    </div>
  </div>
);