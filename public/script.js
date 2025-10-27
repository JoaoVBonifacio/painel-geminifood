// --- SDKs DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc, query, orderBy, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- VARIÁVEIS GLOBAIS ---
let cloudinaryConfig = {};
let storeStatusInterval;
let db;
let auth;
let settingsRef;
let productsRef;
let categoriesRef;
let allCategories = [];
let allProducts = [];

// --- Elementos do DOM (definidos aqui para fácil acesso) ---
const themeToggleButton = document.getElementById('theme-toggle-btn');
const lightIcon = document.getElementById('theme-icon-light');
const darkIcon = document.getElementById('theme-icon-dark');
const priceTypeToggle = document.getElementById('price-type-toggle');
const priceTypeLabel = document.getElementById('price-type-label');
const singlePriceSection = document.getElementById('single-price-section');
const multipleOptionsSection = document.getElementById('multiple-options-section');
const optionsContainer = document.getElementById('product-options-container'); // Container das linhas de opção
const productModal = document.getElementById('product-modal'); // Referência ao modal

// --- LÓGICA DE TEMA (DARK MODE) ---
function applyTheme(isDark) {
    if (isDark) {
        document.documentElement.classList.add('dark');
        lightIcon?.classList.add('hidden'); // Adicionado '?' para segurança
        darkIcon?.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        lightIcon?.classList.remove('hidden');
        darkIcon?.classList.add('hidden');
    }
}
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme === 'dark' || (!savedTheme && prefersDark)); // Aplica tema inicial
themeToggleButton?.addEventListener('click', () => { // Adicionado '?'
    const isDarkMode = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    applyTheme(isDarkMode);
});


// --- FUNÇÕES PARA OPÇÕES DE PRODUTO ---
function createOptionRowHTML(option = { name: '', price: '' }) {
    const priceValue = (typeof option.price === 'number' && !isNaN(option.price)) ? option.price.toFixed(2) : '';
    // Corrigido para usar classes Tailwind consistentemente
    return `
        <div class="option-row flex items-center mb-2 gap-2">
            <input type="text" name="optionName[]" placeholder="Nome da Opção (ex: Pequena)" class="flex-grow p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${option.name || ''}" required>
            <input type="number" name="optionPrice[]" placeholder="Preço (€)" step="0.01" class="w-28 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${priceValue}" required>
            <button type="button" onclick="removeOption(this)" class="text-red-500 hover:text-red-400 font-bold p-1 text-xl leading-none">&times;</button> {/* Botão 'X' maior */}
        </div>
    `;
}

window.addOption = function(option) {
    if (!optionsContainer) return; // Segurança
    const newRowHTML = createOptionRowHTML(option);
    optionsContainer.insertAdjacentHTML('beforeend', newRowHTML); // Adiciona o HTML diretamente
}

window.removeOption = function(button) {
    if (!optionsContainer) return; // Segurança
    if (optionsContainer.children.length > 1) {
        button.closest('.option-row')?.remove(); // Usa closest para garantir que remove a linha correta
    } else {
        alert("É necessário ter pelo menos uma opção para o produto.");
    }
}
// --- FIM DAS FUNÇÕES PARA OPÇÕES ---

// --- LÓGICA DO SWITCH DE TIPO DE PREÇO ---
// Atualiza a visibilidade das seções de preço (CORRIGIDO)
function updatePriceSections(isMultiple) {
    // Verifica se os elementos existem antes de manipular
    if (!priceTypeLabel || !singlePriceSection || !multipleOptionsSection) {
        console.error("Elementos de controle de preço não encontrados!");
        return;
    }

    if (isMultiple) {
        priceTypeLabel.textContent = "Múltiplas Opções";
        singlePriceSection.style.display = 'none'; // Esconde preço único
        multipleOptionsSection.style.display = 'block'; // Mostra múltiplas opções
        // Garante que haja pelo menos uma linha de opção ao mudar para múltiplo
        if (optionsContainer && optionsContainer.children.length === 0) {
            addOption();
        }
    } else {
        priceTypeLabel.textContent = "Preço Único";
        singlePriceSection.style.display = 'block'; // Mostra preço único
        multipleOptionsSection.style.display = 'none'; // Esconde múltiplas opções
    }
}

// Listener para mudanças no switch
priceTypeToggle?.addEventListener('change', (e) => { // Adicionado '?'
    updatePriceSections(e.target.checked);
});
// --- FIM DA LÓGICA DO SWITCH ---


// --- FUNÇÕES DE INICIALIZAÇÃO E AUTENTICAÇÃO ---
async function getAppConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: `Status: ${response.status}` })); // Tenta pegar JSON, senão usa status
            throw new Error(errorData.message || `O servidor respondeu com o status: ${response.status}`);
        }
        const config = await response.json();
        cloudinaryConfig = config.cloudinary || {}; // Garante que é um objeto
        if (!config.firebase) throw new Error("Configuração do Firebase não encontrada na resposta da API.");
        return config.firebase;
    } catch (error) {
        console.error("Falha ao buscar configuração:", error);
        throw new Error(`Não foi possível carregar as configurações do servidor: ${error.message}`);
    }
}

async function initialize() {
    try {
        const firebaseConfig = await getAppConfig();

        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        settingsRef = doc(db, "settings", "main");
        productsRef = collection(db, "products");
        categoriesRef = collection(db, "categories");

        onAuthStateChanged(auth, async (user) => {
            const loginScreen = document.getElementById('login-screen');
            const mainPanel = document.getElementById('main-panel');
            // Garante que os elementos existem antes de manipular classes
            if (!loginScreen || !mainPanel) return;

            if (user) {
                try {
                    const adminDocRef = doc(db, 'admins', user.uid);
                    const adminDocSnap = await getDoc(adminDocRef);

                    if (adminDocSnap.exists()) {
                        loginScreen.classList.add('hidden');
                        mainPanel.classList.remove('hidden');
                        loadSettingsAndStartInterval();
                        listenToCategories();
                        listenToProducts();
                    } else {
                        alert('Acesso negado. Você não tem permissão.');
                        await signOut(auth); // Adicionado await
                    }
                } catch(adminCheckError) {
                     console.error("Erro ao verificar permissões de admin:", adminCheckError);
                     alert("Erro ao verificar permissões. Tente novamente.");
                     await signOut(auth); // Desloga em caso de erro na verificação
                }
            } else {
                loginScreen.classList.remove('hidden');
                mainPanel.classList.add('hidden');
                clearInterval(storeStatusInterval);
            }
        });

        // Listener Login (com verificação de existência dos elementos)
        document.getElementById('login-btn')?.addEventListener('click', () => {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const authError = document.getElementById('auth-error');
            if (!emailInput || !passwordInput || !authError) return; // Sai se elementos não existem

            const email = emailInput.value;
            const password = passwordInput.value;
            authError.classList.add('hidden');

            signInWithEmailAndPassword(auth, email, password)
                .catch(error => {
                    let friendlyMessage = "Ocorreu um erro ao tentar entrar.";
                    // ... (mensagens de erro iguais) ...
                     if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        friendlyMessage = "Email ou palavra-passe incorretos.";
                    } else if (error.code === 'auth/invalid-email') {
                         friendlyMessage = "O formato do email é inválido.";
                    }
                    console.error("Erro de login:", error.code, error.message);
                    authError.textContent = friendlyMessage;
                    authError.classList.remove('hidden');
                });
        });

        // Listener Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));

    } catch (error) {
        console.error("Erro Crítico na Inicialização:", error);
        document.body.innerHTML = `<div class="text-red-500 p-8 text-center"><h1>Erro Crítico na Inicialização</h1><p>${error.message}</p></div>`;
    }
}

// --- FUNÇÕES DE CONFIGURAÇÕES GERAIS E HORÁRIO ---
async function loadSettingsAndStartInterval() {
    await loadSettings();
    if (storeStatusInterval) clearInterval(storeStatusInterval);
    storeStatusInterval = setInterval(checkAndUpdateStoreStatus, 60000); // 1 minuto
}

async function loadSettings() {
     try {
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            // Função auxiliar para definir valor do input
            const setInputValue = (id, value, defaultValue = '') => {
                const element = document.getElementById(id);
                if (element) element.value = value ?? defaultValue; // Usa ?? para tratar null/undefined
            };
            // Função auxiliar para definir estado do checkbox
             const setCheckboxState = (id, checked, defaultState = false) => {
                const element = document.getElementById(id);
                if (element) element.checked = checked ?? defaultState;
            };

            setInputValue('whatsapp-number', settings.whatsappNumber);
            setInputValue('whatsapp-message', settings.whatsappMessage, '*Novo Pedido* 🍔\n\n*Cliente:* {cliente}\n*Itens:*\n{itens}\n\n*Morada:*\n{morada}\n*Pagamento:* {pagamento}\n*Total: {total}*');
            setInputValue('minimum-order', settings.minimumOrder?.toFixed(2), '5.00'); // Garante 2 casas decimais
            setCheckboxState('store-closed-toggle', settings.isStoreClosed);
            setCheckboxState('schedule-enabled-toggle', settings.scheduleEnabled);
            setInputValue('weekday-open', settings.weekdayOpen, '15:00');
            setInputValue('weekday-close', settings.weekdayClose, '23:00');
            setInputValue('weekend-open', settings.weekendOpen, '10:00');
            setInputValue('weekend-close', settings.weekendClose, '23:00');

        } else {
             console.warn("Documento de configurações 'main' não encontrado. Usando/mostrando valores padrão.");
             // Preenche com valores padrão se não encontrar o doc
             document.getElementById('whatsapp-message').value = '*Novo Pedido* 🍔\n\n*Cliente:* {cliente}\n*Itens:*\n{itens}\n\n*Morada:*\n{morada}\n*Pagamento:* {pagamento}\n*Total: {total}*';
             document.getElementById('minimum-order').value = '5.00';
             document.getElementById('weekday-open').value = '15:00';
             document.getElementById('weekday-close').value = '23:00';
             document.getElementById('weekend-open').value = '10:00';
             document.getElementById('weekend-close').value = '23:00';
             document.getElementById('store-closed-toggle').checked = false; // Começa aberto por padrão se não houver config
             document.getElementById('schedule-enabled-toggle').checked = false; // Começa com horário manual
        }
        // Sempre verifica o status após carregar as configs
        await checkAndUpdateStoreStatus();
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        alert("Não foi possível carregar as configurações da loja.");
    }
}

// Listener Salvar Configurações (com tratamento de erro mais robusto)
document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
    const button = document.getElementById('save-settings-btn');
    if (!button) return;
    button.disabled = true;
    button.textContent = "A guardar...";
    try {
        const minOrderValue = parseFloat(document.getElementById('minimum-order')?.value) || 0;
        const data = {
            whatsappNumber: document.getElementById('whatsapp-number')?.value.trim() ?? '',
            whatsappMessage: document.getElementById('whatsapp-message')?.value.trim() ?? '',
            minimumOrder: minOrderValue < 0 ? 0 : minOrderValue, // Garante que não é negativo
            isStoreClosed: document.getElementById('store-closed-toggle')?.checked ?? false,
            scheduleEnabled: document.getElementById('schedule-enabled-toggle')?.checked ?? false,
            weekdayOpen: document.getElementById('weekday-open')?.value ?? '15:00',
            weekdayClose: document.getElementById('weekday-close')?.value ?? '23:00',
            weekendOpen: document.getElementById('weekend-open')?.value ?? '10:00',
            weekendClose: document.getElementById('weekend-close')?.value ?? '23:00',
        };
        await setDoc(settingsRef, data, { merge: true });
        alert("Configurações guardadas!");
        await checkAndUpdateStoreStatus(); // Reavalia
    } catch (error) {
        console.error("Erro ao guardar configurações:", error);
        alert("Erro ao guardar configurações.");
    } finally {
        button.disabled = false;
        button.textContent = "Guardar Configurações";
    }
});

async function checkAndUpdateStoreStatus() { /* ... (igual à versão anterior) ... */ }

// Listener Toggle Manual Loja Fechada (com tratamento de erro)
document.getElementById('store-closed-toggle')?.addEventListener('change', async (e) => {
    const isChecked = e.target.checked;
     console.log(`Toggle manual alterado para: ${isChecked ? 'Fechada' : 'Aberta'}. Atualizando Firestore...`);
    try {
        await updateDoc(settingsRef, { isStoreClosed: isChecked });
        // Opcional: Se o horário automático estiver ligado, pode avisar o usuário
        const scheduleToggle = document.getElementById('schedule-enabled-toggle');
        if (scheduleToggle?.checked) {
             console.warn("O estado manual foi alterado, mas o horário automático está ativo e pode sobrescrevê-lo na próxima verificação.");
             // Poderia mostrar um pequeno aviso na UI aqui
        }
    } catch (error) {
        console.error("Erro ao atualizar status manual da loja:", error);
        alert("Erro ao atualizar o estado da loja.");
        e.target.checked = !isChecked; // Reverte visualmente
    }
});

// --- LÓGICA DE CATEGORIAS ---
function listenToCategories() { /* ... (igual à versão anterior) ... */ }
document.getElementById('add-category-btn')?.addEventListener('click', async () => { /* ... */ });
document.getElementById('category-list')?.addEventListener('click', async (e) => { /* ... */ });

// --- LÓGICA DE PRODUTOS ---
document.getElementById('product-image-file')?.addEventListener('change', e => { /* ... (igual à versão anterior) ... */ });
function listenToProducts() { /* ... (igual à versão anterior) ... */ }
function getPriceDisplay(options) { /* ... (igual à versão anterior) ... */ }
function renderProductList() { /* ... (igual à versão anterior, incluindo a descrição) ... */ }

// --- LÓGICA DO MODAL DE PRODUTO ---
const openModal = (product = null, id = null) => {
    // Referências aos elementos do modal
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productDescInput = document.getElementById('product-desc');
    const productCategorySelect = document.getElementById('product-category');
    const productImageFileInput = document.getElementById('product-image-file');
    const modalTitle = document.getElementById('modal-title');
    const preview = document.getElementById('image-preview');
    const existingImageUrlInput = document.getElementById('existing-image-url');
    const singlePriceInput = document.getElementById('product-price');

    // Verifica se todos os elementos essenciais existem
    if (!productModal || !productIdInput || !productNameInput || !productDescInput || !productCategorySelect || !productImageFileInput || !modalTitle || !preview || !existingImageUrlInput || !singlePriceInput || !optionsContainer || !priceTypeToggle) {
        console.error("Um ou mais elementos do modal não foram encontrados!");
        return;
    }


    // Preenche campos básicos
    productIdInput.value = id || '';
    productNameInput.value = product?.name || '';
    productDescInput.value = product?.description || '';
    productCategorySelect.value = product?.categoryId || '';
    productImageFileInput.value = ''; // Limpa sempre o input de ficheiro
    modalTitle.textContent = id ? 'Editar Produto' : 'Adicionar Novo Produto';

    // Lógica da imagem preview
    if (product?.imageUrl) {
        preview.src = product.imageUrl;
        preview.classList.remove('hidden');
        existingImageUrlInput.value = product.imageUrl;
    } else {
        preview.src = '';
        preview.classList.add('hidden');
        existingImageUrlInput.value = '';
    }

    // Limpa containers de preço e opções antes de preencher
    singlePriceInput.value = '';
    optionsContainer.innerHTML = '';

    // Verifica se tem opções válidas e configura o switch e os campos
    const hasOptions = product?.options && Array.isArray(product.options) && product.options.length > 0;
    const hasMultipleValidOptions = hasOptions && product.options.length > 1;
    const hasSingleValidOption = hasOptions && product.options.length === 1;

    priceTypeToggle.checked = hasMultipleValidOptions; // Define o estado do switch
    updatePriceSections(hasMultipleValidOptions); // Mostra/esconde seções com base no switch

    if (hasMultipleValidOptions) {
        product.options.forEach(option => addOption(option)); // Preenche múltiplas opções
    } else if (hasSingleValidOption) {
        // Preenche preço único se só houver uma opção válida
         const price = product.options[0].price;
         singlePriceInput.value = (typeof price === 'number' && !isNaN(price)) ? price.toFixed(2) : '';
        // Adiciona uma linha em branco na seção oculta para consistência ao salvar
        addOption();
    } else {
        // Novo produto ou produto sem opções válidas:
        // Garante que o switch está desligado e a seção de preço único visível
        priceTypeToggle.checked = false;
        updatePriceSections(false);
        // Adiciona uma linha em branco na seção oculta
        addOption();
    }

    // Mostra o modal
    productModal.classList.remove('hidden');
    productModal.classList.add('flex');
};

const closeModal = () => {
    if (!productModal) return;
    productModal.classList.add('hidden');
    productModal.classList.remove('flex');
    // Limpa todos os campos do formulário
    const fieldsToClear = ['product-id', 'product-name', 'product-desc', 'product-category', 'product-image-file', 'existing-image-url', 'product-price'];
    fieldsToClear.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    // Limpa preview da imagem
    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
    }
    // Limpa opções
    if (optionsContainer) optionsContainer.innerHTML = '';
     // Reseta o switch para preço único
    if (priceTypeToggle) {
        priceTypeToggle.checked = false;
        updatePriceSections(false); // Garante que a seção correta está visível
    }
};

// Listeners para abrir/fechar modal
document.getElementById('add-product-btn')?.addEventListener('click', () => openModal());
document.getElementById('cancel-modal-btn')?.addEventListener('click', closeModal);

// Listener para salvar o produto (lógica de coleta e validação igual à anterior)
document.getElementById('save-product-btn')?.addEventListener('click', async () => {
    // --- Referências aos elementos ---
    const id = document.getElementById('product-id')?.value;
    const imageFile = document.getElementById('product-image-file')?.files[0];
    let imageUrl = document.getElementById('existing-image-url')?.value || '';
    const productName = document.getElementById('product-name')?.value.trim();
    const categoryId = document.getElementById('product-category')?.value;
    const isMultipleOptions = priceTypeToggle?.checked;
    const button = document.getElementById('save-product-btn');

     // Verifica se elementos essenciais existem
    if (!productName || !categoryId || button === null || priceTypeToggle === null) {
         alert("Erro: Elementos do formulário não encontrados.");
         return;
     }

    let options = [];

    // --- Validações ---
    if (!productName) return alert("O nome do produto é obrigatório.");
    if (!categoryId) return alert("A categoria é obrigatória.");

    // --- Coleta de Preços ---
    if (isMultipleOptions) {
        const optionRows = document.querySelectorAll('#multiple-options-section .option-row');
        if (optionRows.length === 0) return alert("Adicione pelo menos uma opção.");

        for (const row of optionRows) {
            const nameInput = row.querySelector('input[name="optionName[]"]');
            const priceInput = row.querySelector('input[name="optionPrice[]"]');
            // Verifica se os inputs existem antes de ler
            if (!nameInput || !priceInput) continue;

            const name = nameInput.value.trim();
            const price = parseFloat(priceInput.value);

            if (!name) return alert("O nome de todas as opções é obrigatório.");
            if (isNaN(price) || price < 0) return alert(`O preço da opção "${name}" deve ser um número válido maior ou igual a zero.`);

            options.push({ name, price });
        }
        if (options.length === 0) return alert("Adicione pelo menos uma opção válida.");

    } else {
        const singlePriceInput = document.getElementById('product-price');
        if (!singlePriceInput) return alert("Erro: Campo de preço único não encontrado.");
        const singlePrice = parseFloat(singlePriceInput.value);

        if (isNaN(singlePrice) || singlePrice < 0) {
            return alert("O preço único deve ser um número válido maior ou igual a zero.");
        }
        options.push({ name: "Padrão", price: singlePrice }); // Nome padrão para preço único
    }

    // --- Monta o objeto de dados ---
    const data = {
        name: productName,
        description: document.getElementById('product-desc')?.value.trim() ?? '',
        categoryId: categoryId,
        options: options, // Array com uma ou mais opções
        imageUrl: '' // Será definida após upload
    };

    // --- Lógica de Upload e Save ---
    button.disabled = true;
    button.textContent = "A guardar...";

    try {
        // Upload da imagem
        if (imageFile) {
            button.textContent = "A carregar imagem...";
            if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
                throw new Error("Configuração do Cloudinary não carregada ou incompleta.");
            }
            // ... (resto da lógica de upload igual) ...
             const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('upload_preset', cloudinaryConfig.uploadPreset);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
                method: 'POST', body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Tenta pegar erro JSON
                throw new Error(`Falha no upload Cloudinary: ${errorData.error?.message || response.statusText}`);
            }
            const result = await response.json();
            imageUrl = result.secure_url;
        }

        data.imageUrl = imageUrl || 'https://placehold.co/400x300/cccccc/ffffff?text=Sem+Foto';

        // Salva no Firestore
        button.textContent = "A guardar produto...";
        if (id) {
            await updateDoc(doc(db, "products", id), data);
        } else {
            await addDoc(productsRef, data);
        }
        closeModal();

    } catch (error) {
        console.error("Erro ao guardar produto:", error);
        alert(`Erro ao guardar: ${error.message || 'Ocorreu um erro desconhecido.'}`);
    } finally {
        // Garante que o botão é reativado mesmo se houver erro
        if(button) {
            button.disabled = false;
            button.textContent = "Guardar";
        }
    }
});


// Listener para botões de editar/remover (igual à versão anterior)
document.getElementById('product-list')?.addEventListener('click', async (e) => { /* ... */ });

// --- INICIA A APLICAÇÃO ---
// Adiciona um listener para garantir que o DOM está pronto antes de inicializar
document.addEventListener('DOMContentLoaded', initialize);