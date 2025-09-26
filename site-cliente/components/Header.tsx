interface HeaderProps {
  cartItemCount: number;
  onCartClick: () => void;
}
export const Header = ({ cartItemCount, onCartClick }: HeaderProps) => (
  <header className="bg-white shadow-md sticky top-0 z-10">
    <div className="container mx-auto max-w-4xl p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-yellow-600">Brazuka Delivery</h1>
      <button onClick={onCartClick} className="relative p-2 rounded-full hover:bg-gray-100">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        {cartItemCount > 0 && (<span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{cartItemCount}</span>)}
      </button>
    </div>
  </header>
);