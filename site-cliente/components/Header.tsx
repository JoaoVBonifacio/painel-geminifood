import Image from 'next/image';

interface HeaderProps {
  cartItemCount: number;
  onCartClick: () => void;
  onScheduleClick: () => void;
}

export const Header = ({ cartItemCount, onCartClick, onScheduleClick }: HeaderProps) => (
  <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
    <div className="container mx-auto max-w-4xl p-4 flex justify-between items-center">

      {/* Div para agrupar logo e título */}
      <div className="flex items-center gap-2"> {/* Use gap-2 ou gap-3 para espaço */}
        <Image
          src="/img/Brazuka-Logo.png" // Caminho relativo à pasta public
          alt="Logótipo Brazuka Delivery"
          width={40} // Defina a largura desejada (ex: 40px)
          height={40} // Defina a altura desejada (ex: 40px)
          className="rounded-full" // Opcional: se quiser manter arredondado
          priority // É bom marcar como priority=true se a logo estiver no LCP
        />
        <h1 className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
          Brazuka Delivery
        </h1>
      </div>

      {/* Ícones (carrinho, horário) */}
      <div className="flex items-center space-x-2">
        {/* Botão de Horários */}
        <button onClick={onScheduleClick} className="relative p-2 rounded-full text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        {/* Botão do Carrinho */}
        <button onClick={onCartClick} className="relative p-2 rounded-full text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          {cartItemCount > 0 && (<span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{cartItemCount}</span>)}
        </button>
      </div>

    </div>
  </header>
);