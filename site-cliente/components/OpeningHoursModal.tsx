interface OpeningHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpeningHoursModal = ({ isOpen, onClose }: OpeningHoursModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100 modal-backdrop' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col transform transition-all duration-300 ease-in-out dark:bg-gray-800 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b flex justify-between items-center dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Horário de Funcionamento</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">&times;</button>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Terça a Sexta</span>
            <span className="text-gray-600 dark:text-gray-400">15:00 às 23:00</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Sábado e Domingo</span>
            <span className="text-gray-600 dark:text-gray-400">10:00 às 23:00</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Segunda-feira</span>
            <span className="text-gray-600 dark:text-gray-400">Fechado</span>
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-b-2xl dark:bg-gray-900/50">
           <button onClick={onClose} className="w-full bg-orange-400 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-500 transition-colors">
              Entendido
            </button>
        </div>
      </div>
    </div>
  );
};