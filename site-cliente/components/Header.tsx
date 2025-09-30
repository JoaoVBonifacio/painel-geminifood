interface HeaderProps {
  cartItemCount: number;
  onCartClick: () => void;
  onScheduleClick: () => void;
  onThemeToggleClick: () => void;
  isDarkMode: boolean; // Adicionado
}

export const Header = ({ cartItemCount, onCartClick, onScheduleClick, onThemeToggleClick, isDarkMode }: HeaderProps) => (
  <header className="bg-white shadow-md sticky top-0 z-10 dark:bg-gray-800 dark:border-b dark:border-gray-700">
    <div className="container mx-auto max-w-4xl p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-yellow-600">Brazuka Delivery</h1>
      <div className="flex items-center space-x-2">
        {/* Botão de Horários */}
        <button onClick={onScheduleClick} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        {/* Botão de Alternância de Tema (Corrigido) */}
        <button onClick={onThemeToggleClick} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            {isDarkMode ? (
                // Ícone de Sol (mostrado quando está no modo escuro)
                <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
                // Ícone de Lua (mostrado quando está no modo claro)
                <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
        </button>
        {/* Botão do Carrinho */}
        <button onClick={onCartClick} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          {cartItemCount > 0 && (<span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{cartItemCount}</span>)}
        </button>
      </div>
    </div>
  </header>
);