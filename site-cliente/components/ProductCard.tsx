import { useState } from 'react';
// Importa as interfaces atualizadas de page.tsx
import { Product, ProductOption } from '../app/page';

interface ProductCardProps {
  product: Product;
  // Modificar onAddToCart para receber a opção selecionada
  onAddToCart: (product: Product, selectedOption: ProductOption) => void;
  isStoreClosed?: boolean;
}

const formatCurrency = (value: number) => `${(value || 0).toFixed(2).replace('.', ',')} €`;

export const ProductCard = ({ product, onAddToCart, isStoreClosed }: ProductCardProps) => {
  // Estado para guardar a opção selecionada (inicializa com a primeira opção, se existir)
  // Garante que product.options existe e tem pelo menos um item
  const initialOption = (product.options && product.options.length > 0) ? product.options[0] : { name: "Inválido", price: 0 };
  const [selectedOption, setSelectedOption] = useState<ProductOption>(initialOption);

  // Verifica se há opções válidas para processar
  if (!product.options || product.options.length === 0) {
    console.error(`Produto ${product.id} (${product.name}) não tem opções válidas.`);
    // Opcional: Renderizar um estado de erro ou desabilitado para este card
    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col opacity-50 p-4">
            <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
            <p className="text-red-500 mt-2">Produto indisponível (sem opções).</p>
        </div>
    );
  }


  const handleOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptionName = event.target.value;
    const newSelectedOption = product.options.find(opt => opt.name === selectedOptionName);
    if (newSelectedOption) {
      setSelectedOption(newSelectedOption);
    }
  };

  const handleAddClick = () => {
    // Passa o produto e a opção selecionada
    onAddToCart(product, selectedOption);
  };

  // Determina se há mais de uma opção para mostrar o seletor
  const hasMultipleOptions = product.options.length > 1;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
      <div className="w-full h-48">
        <img
          src={product.imageUrl || 'https://placehold.co/400x300/cccccc/ffffff?text=Sem+Foto'} // Fallback
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

        {/* Seletor de Opções (condicional) */}
        {hasMultipleOptions && (
          <div className="mt-3">
            <label htmlFor={`options-${product.id}`} className="block text-sm font-medium text-gray-700 mb-1">Escolha a porção:</label>
            <select
              id={`options-${product.id}`}
              value={selectedOption.name}
              onChange={handleOptionChange}
              className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-orange-400 focus:border-orange-400"
              disabled={isStoreClosed}
            >
              {product.options.map((option) => (
                <option key={option.name} value={option.name}>
                  {option.name} - {formatCurrency(option.price)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Preço e Botão Adicionar */}
        <div className="flex justify-between items-center mt-4">
          <span className="text-lg font-semibold text-yellow-600">
            {/* Mostra o preço da opção selecionada */}
            {formatCurrency(selectedOption.price)}
          </span>
          <button
            onClick={handleAddClick}
            disabled={isStoreClosed}
            className={`bg-orange-400 text-white font-semibold px-4 py-2 rounded-md transition-colors ${isStoreClosed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-500'}`}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
};