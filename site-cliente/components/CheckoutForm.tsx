import { useState } from 'react';
// Importa as interfaces atualizadas de page.tsx
import { CartItem, Settings } from '../app/page';

interface CheckoutFormProps {
    onBack: () => void;
    onClose: () => void;
    cart: CartItem[]; // CartItem agora tem selectedOption e id composto
    total: number;
    settings: Settings;
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

const formatCurrency = (value: number) => `${(value || 0).toFixed(2).replace('.', ',')} €`;

export const CheckoutForm = ({ onBack, onClose, cart, total, settings, setCart }: CheckoutFormProps) => {
    const [customerName, setCustomerName] = useState('');
    const [address, setAddress] = useState({ cp: '', morada: '', numero: '', comp: '', localidade: '', concelho: ''});
    const [paymentMethod, setPaymentMethod] = useState('');

    const handleCheckout = () => {
        // Validações básicas
        if (!customerName.trim()) { alert('Por favor, preencha o seu nome.'); return; }
        if (!paymentMethod) { alert('Por favor, selecione uma forma de pagamento.'); return; }
        // Verifica se os campos obrigatórios da morada estão preenchidos
        if(!address.morada.trim() || !address.numero.trim() || !address.localidade.trim() || !address.cp.trim() || !address.concelho.trim()) {
            alert('Por favor, preencha a morada completa (Código Postal, Morada, Nº, Localidade, Concelho).');
            return;
        }

        // --- Linha modificada para incluir a opção ---
        const itemsList = cart.map(item => {
            const optionName = item.selectedOption && item.selectedOption.name !== "Padrão"
                ? ` (${item.selectedOption.name})` // Adiciona o nome da opção entre parênteses
                : ''; // Se for "Padrão" ou não tiver opção, não adiciona nada extra
            return `- ${item.quantity}x ${item.name}${optionName}`; // Concatena nome do produto + nome da opção (se aplicável)
        }).join('\n');
        // --- Fim da modificação ---

        // Formata a morada
        const addressString = `${address.morada}, ${address.numero}${address.comp ? ' ' + address.comp : ''}\n${address.cp} ${address.localidade}\n${address.concelho}`;

        // Obtém o template da mensagem ou usa o padrão
        let message = settings.whatsappMessage || '*Novo Pedido* 🍔\n\n*Cliente:* {cliente}\n*Itens:*\n{itens}\n\n*Morada:*\n{morada}\n\n*Pagamento:* {pagamento}\n*Total: {total}*';

        // Substitui os placeholders
        message = message.replace('{cliente}', customerName.trim())
                         .replace('{itens}', itemsList)
                         .replace('{morada}', addressString)
                         .replace('{pagamento}', paymentMethod)
                         .replace('{total}', formatCurrency(total));

        const encodedMessage = encodeURIComponent(message);
        const whatsappNumber = settings.whatsappNumber?.replace(/\D/g, ''); // Remove caracteres não numéricos do número

        if (!whatsappNumber) {
            alert('O número de WhatsApp para receber pedidos não está configurado.');
            return;
        }

        const url = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

        // Abre o WhatsApp
        window.open(url, '_blank');

        // Limpa o carrinho e fecha o modal após enviar
        setCart([]);
        onClose();
    };

    // --- Estilo atualizado com classes dark ---
    const inputStyle = "w-full p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none";

    return (
        <>
            <div className="p-5 border-b dark:border-gray-700 flex items-center flex-shrink-0">
                <button onClick={onBack} className="text-xl mr-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">&larr;</button>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Finalizar Pedido</h2>
            </div>

            <div className="flex-grow overflow-y-auto p-5 space-y-4">
                {/* --- Labels atualizadas com classes dark --- */}
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nome Completo</label>
                <input type="text" placeholder="O seu nome" value={customerName} onChange={e => setCustomerName(e.target.value)} className={inputStyle} />

                <h3 className="font-semibold pt-2 text-gray-700 dark:text-gray-300">Morada de Entrega</h3>
                <input type="text" placeholder="Código Postal" value={address.cp} onChange={e => setAddress(a => ({...a, cp: e.target.value}))} className={inputStyle} />
                <div className="flex gap-2">
                   <input type="text" placeholder="Morada" value={address.morada} onChange={e => setAddress(a => ({...a, morada: e.target.value}))} className={`${inputStyle} flex-1`} />
                   {/* --- Removida a largura fixa w-24 do campo Número --- */}
                   <input type="text" placeholder="Nº" value={address.numero} onChange={e => setAddress(a => ({...a, numero: e.target.value}))} className={`${inputStyle} w-32`} /> {/* Ou ajuste w-32 se necessário */}
                </div>
                <input type="text" placeholder="Complemento (opcional)" value={address.comp} onChange={e => setAddress(a => ({...a, comp: e.target.value}))} className={inputStyle} />
                <input type="text" placeholder="Localidade" value={address.localidade} onChange={e => setAddress(a => ({...a, localidade: e.target.value}))} className={inputStyle} />
                 <input type="text" placeholder="Concelho" value={address.concelho} onChange={e => setAddress(a => ({...a, concelho: e.target.value}))} className={inputStyle}/>

                <h3 className="font-semibold pt-2 text-gray-700 dark:text-gray-300">Forma de Pagamento</h3>
                 <div className="grid grid-cols-3 gap-2">
                     {/* --- Botões de pagamento atualizados com classes dark --- */}
                    {['MB Way', 'Cartão', 'Dinheiro'].map(method => (
                        <button
                            key={method}
                            onClick={() => setPaymentMethod(method)}
                            className={`p-3 border rounded-lg text-sm font-semibold transition-colors ${
                              paymentMethod === method
                                ? 'bg-orange-100 dark:bg-orange-900/50 border-orange-400 dark:border-orange-600 ring-2 ring-orange-300 text-orange-800 dark:text-orange-100'
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            {method}
                        </button>
                     ))}
                 </div>
            </div>

            <div className="p-5 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl flex-shrink-0">
                {/* Botão de confirmação com estilo hover dark opcional */}
                <button onClick={handleCheckout} className="w-full bg-green-500 text-white font-bold py-3 px-5 rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition-colors">
                    Confirmar Pedido via WhatsApp ({formatCurrency(total)})
                </button>
            </div>
        </>
    )
}