import { useState } from 'react';
import { CartItem, Settings } from '../app/page';

interface CheckoutFormProps {
    onBack: () => void;
    onClose: () => void;
    cart: CartItem[];
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
        if (!customerName.trim()) { alert('Por favor, preencha o seu nome.'); return; }
        if (!paymentMethod) { alert('Por favor, selecione uma forma de pagamento.'); return; }
        if(!address.morada || !address.numero || !address.localidade || !address.cp) { alert('Por favor, preencha a morada completa.'); return; }

        const itemsList = cart.map(item => `- ${item.quantity}x ${item.name}`).join('\n');
        const addressString = `${address.morada}, ${address.numero} ${address.comp || ''}\n${address.cp} ${address.localidade}\n${address.concelho}`;

        let message = settings.whatsappMessage || '*Novo Pedido* 🍔\n\n*Cliente:* {cliente}\n*Itens:*\n{itens}\n\n*Morada:*\n{morada}\n\n*Pagamento:* {pagamento}\n*Total: {total}*';
        message = message.replace('{cliente}', customerName)
                         .replace('{itens}', itemsList)
                         .replace('{morada}', addressString)
                         .replace('{pagamento}', paymentMethod)
                         .replace('{total}', formatCurrency(total));
        
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/${settings.whatsappNumber}?text=${encodedMessage}`;

        window.open(url, '_blank');
        
        setCart([]);
        onClose();
    };

    // Estilo base para os inputs para evitar repetição
    const inputStyle = "w-full p-3 border border-gray-200 bg-gray-50 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none";

    return (
        <>
            <div className="p-5 border-b flex items-center flex-shrink-0">
                <button onClick={onBack} className="text-xl mr-4 text-gray-600 hover:text-gray-900">&larr;</button>
                <h2 className="text-xl font-bold text-gray-800">Finalizar Pedido</h2>
            </div>
            
            <div className="flex-grow overflow-y-auto p-5 space-y-4">
                <label className="text-sm font-semibold text-gray-700">Nome Completo</label>
                <input type="text" placeholder="O seu nome" value={customerName} onChange={e => setCustomerName(e.target.value)} className={inputStyle} />
                
                <h3 className="font-semibold pt-2 text-gray-700">Morada de Entrega</h3>
                <input type="text" placeholder="Código Postal" value={address.cp} onChange={e => setAddress(a => ({...a, cp: e.target.value}))} className={inputStyle} />
                <div className="flex gap-2">
                   <input type="text" placeholder="Morada" value={address.morada} onChange={e => setAddress(a => ({...a, morada: e.target.value}))} className={`${inputStyle} w-24`} />
                   <input type="text" placeholder="Nº" value={address.numero} onChange={e => setAddress(a => ({...a, numero: e.target.value}))} className={`${inputStyle}`} />
                </div>
                <input type="text" placeholder="Complemento (opcional)" value={address.comp} onChange={e => setAddress(a => ({...a, comp: e.target.value}))} className={inputStyle} />
                <input type="text" placeholder="Localidade" value={address.localidade} onChange={e => setAddress(a => ({...a, localidade: e.target.value}))} className={inputStyle} />
                 <input type="text" placeholder="Concelho" value={address.concelho} onChange={e => setAddress(a => ({...a, concelho: e.target.value}))} className={inputStyle}/>

                <h3 className="font-semibold pt-2 text-gray-700">Forma de Pagamento</h3>
                 <div className="grid grid-cols-3 gap-2">
                    {['MB Way', 'Cartão', 'Dinheiro'].map(method => (
                        <button key={method} onClick={() => setPaymentMethod(method)} className={`p-3 border rounded-lg text-sm text-gray-700 font-semibold transition-colors ${paymentMethod === method ? 'bg-orange-100 border-orange-400 ring-2 ring-orange-300' : 'bg-gray-50 hover:bg-gray-100'}`}>
                            {method}
                        </button>
                    ))}
                 </div>
            </div>
            
            <div className="p-5 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
                <button onClick={handleCheckout} className="w-full bg-green-500 text-white font-bold py-3 px-5 rounded-lg hover:bg-green-600 transition-colors">
                    Confirmar Pedido via WhatsApp
                </button>
            </div>
        </>
    )
}