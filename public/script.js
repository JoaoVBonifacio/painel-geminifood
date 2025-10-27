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

// --- LÓGICA DE TEMA (DARK MODE) ---
function applyTheme(isDark) {
    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');
    if (isDark) {
        document.documentElement.classList.add('dark');
        lightIcon?.classList.add('hidden');
        darkIcon?.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        lightIcon?.classList.remove('hidden');
        darkIcon?.classList.add('hidden');
    }
}
function setupThemeToggle() {
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialThemeIsDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    applyTheme(initialThemeIsDark); // Aplica tema inicial

    themeToggleButton?.addEventListener('click', () => {
        const isDarkMode = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        applyTheme(isDarkMode);
    });
}

// --- FUNÇÕES PARA OPÇÕES DE PRODUTO ---
function createOptionRowHTML(option = { name: '', price: '' }) {
    const priceValue = (typeof option.price === 'number' && !isNaN(option.price)) ? option.price.toFixed(2) : '';
    return `
        <div class="option-row flex items-center mb-2 gap-2">
            <input type="text" name="optionName[]" placeholder="Nome da Opção (ex: Pequena)" class="flex-grow p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${option.name || ''}" required>
            <input type="number" name="optionPrice[]" placeholder="Preço (€)" step="0.01" class="w-28 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${priceValue}" required>
            <button type="button" onclick="removeOption(this)" class="text-red-500 hover:text-red-400 font-bold p-1 text-xl leading-none">&times;</button>
        </div>
    `;
}
window.addOption = function(option) {
    // Busca o container apenas quando necessário
    const container = document.getElementById('product-options-container');
    if (!container) return;
    const newRowHTML = createOptionRowHTML(option);
    container.insertAdjacentHTML('beforeend', newRowHTML);
}
window.removeOption = function(button) {
    const container = document.getElementById('product-options-container');
    if (!container) return;
    if (container.children.length > 1) {
        button.closest('.option-row')?.remove();
    } else {
        alert("É necessário ter pelo menos uma opção para o produto.");
    }
}
// --- FIM OPÇÕES ---

// --- LÓGICA DO SWITCH DE PREÇO ---
function updatePriceSections(isMultiple) {
    // Busca os elementos apenas quando necessário
    const priceTypeLabel = document.getElementById('price-type-label');
    const singlePriceSection = document.getElementById('single-price-section');
    const multipleOptionsSection = document.getElementById('multiple-options-section');
    const optionsContainer = document.getElementById('product-options-container'); // Precisa dele aqui tbm

    if (!priceTypeLabel || !singlePriceSection || !multipleOptionsSection) {
        // Log de erro se não encontrar, mas não para a execução necessariamente
        console.error("Elementos de controle de preço não encontrados na função updatePriceSections!");
        return;
    }

    if (isMultiple) {
        priceTypeLabel.textContent = "Múltiplas Opções";
        singlePriceSection.classList.add('hidden');
        multipleOptionsSection.classList.remove('hidden');
        if (optionsContainer && optionsContainer.children.length === 0) {
            addOption();
        }
    } else {
        priceTypeLabel.textContent = "Preço Único";
        singlePriceSection.classList.remove('hidden');
        multipleOptionsSection.classList.add('hidden');
    }
}
function setupPriceTypeToggleListener() {
    const priceTypeToggle = document.getElementById('price-type-toggle');
    priceTypeToggle?.addEventListener('change', (e) => {
        updatePriceSections(e.target.checked);
    });
}
// --- FIM SWITCH ---

// --- FUNÇÕES DE INICIALIZAÇÃO E AUTENTICAÇÃO ---
async function getAppConfig() {
     try {
        const response = await fetch('/api/config');
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: `Status: ${response.status}` }));
            throw new Error(errorData.message || `O servidor respondeu com o status: ${response.status}`);
        }
        const config = await response.json();
        cloudinaryConfig = config.cloudinary || {};
        if (!config.firebase) throw new Error("Configuração do Firebase não encontrada na resposta da API.");
        return config.firebase;
    } catch (error) {
        console.error("Falha ao buscar configuração:", error);
        throw new Error(`Não foi possível carregar as configurações do servidor: ${error.message}`);
    }
}

async function initializeAppLogic() {
    try {
        const firebaseConfig = await getAppConfig();
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        settingsRef = doc(db, "settings", "main");
        productsRef = collection(db, "products");
        categoriesRef = collection(db, "categories");

        setupAuthListener(); // Configura o listener de autenticação
        setupLoginButtonListener(); // Configura o botão de login
        setupLogoutButtonListener(); // Configura o botão de logout
        setupThemeToggle(); // Configura o botão de tema
        setupSettingsButtonListener(); // Configura botão salvar configurações
        setupCategoryListeners(); // Configura listeners de categoria
        setupProductModalListeners(); // Configura listeners do modal de produto
        setupProductListListeners(); // Configura listeners da lista de produtos (editar/remover)
        setupPriceTypeToggleListener(); // Configura o listener do switch de preço

    } catch (error) {
         console.error("Erro Crítico na Inicialização:", error);
         // Mostra erro na tela de login se ela existir
         const authError = document.getElementById('auth-error');
         if (authError) {
             authError.textContent = `Erro Crítico: ${error.message}`;
             authError.classList.remove('hidden');
         } else {
             // Fallback se a tela de login não estiver visível/existir
             document.body.innerHTML = `<div class="text-red-500 p-8 text-center"><h1>Erro Crítico na Inicialização</h1><p>${error.message}</p></div>`;
         }
    }
}

function setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        const loginScreen = document.getElementById('login-screen');
        const mainPanel = document.getElementById('main-panel');
        if (!loginScreen || !mainPanel) return;

        if (user) {
            try {
                const adminDocRef = doc(db, 'admins', user.uid);
                const adminDocSnap = await getDoc(adminDocRef);

                if (adminDocSnap.exists()) {
                    console.log("Admin logado, mostrando painel.");
                    loginScreen.classList.add('hidden');
                    mainPanel.classList.remove('hidden');
                    // Carrega dados APÓS mostrar o painel
                    loadSettingsAndStartInterval();
                    listenToCategories();
                    listenToProducts();
                } else {
                    console.log("Usuário logado, mas não é admin.");
                    alert('Acesso negado.');
                    await signOut(auth); // Desloga automaticamente
                    // Garante que o estado visual é de deslogado
                    loginScreen.classList.remove('hidden');
                    mainPanel.classList.add('hidden');
                    clearInterval(storeStatusInterval);
                }
            } catch(adminCheckError) {
                 console.error("Erro ao verificar permissões:", adminCheckError);
                 alert("Erro ao verificar permissões.");
                 await signOut(auth);
                 loginScreen.classList.remove('hidden');
                 mainPanel.classList.add('hidden');
                 clearInterval(storeStatusInterval);
            }
        } else {
            console.log("Usuário deslogado.");
            loginScreen.classList.remove('hidden');
            mainPanel.classList.add('hidden');
            clearInterval(storeStatusInterval);
        }
    });
}

function setupLoginButtonListener() {
    document.getElementById('login-btn')?.addEventListener('click', () => {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const authError = document.getElementById('auth-error');
        if (!emailInput || !passwordInput || !authError) return;

        const email = emailInput.value;
        const password = passwordInput.value;
        authError.classList.add('hidden');

        signInWithEmailAndPassword(auth, email, password)
            .catch(error => {
                let friendlyMessage = "Erro ao entrar.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    friendlyMessage = "Email ou palavra-passe incorretos.";
                } else if (error.code === 'auth/invalid-email'){
                    friendlyMessage = "Formato de email inválido.";
                }
                console.error("Erro login:", error.code);
                authError.textContent = friendlyMessage;
                authError.classList.remove('hidden');
            });
    });
}

function setupLogoutButtonListener() {
     document.getElementById('logout-btn')?.addEventListener('click', () => {
        signOut(auth).catch(error => {
            console.error("Erro ao sair:", error);
            alert("Erro ao tentar sair.");
        });
    });
}
// --- FIM INICIALIZAÇÃO E AUTENTICAÇÃO ---


// --- CONFIGURAÇÕES GERAIS E HORÁRIO ---
async function loadSettingsAndStartInterval() { /* ... (igual) ... */ }
async function loadSettings() { /* ... (igual, usa setInputValue/setCheckboxState) ... */ }
function setupSettingsButtonListener() {
    document.getElementById('save-settings-btn')?.addEventListener('click', async () => { /* ... (igual) ... */ });
}
async function checkAndUpdateStoreStatus() { /* ... (igual) ... */ }
document.getElementById('store-closed-toggle')?.addEventListener('change', async (e) => { /* ... (igual) ... */ }); // Este listener pode ser movido para uma função setup se preferir
// --- FIM CONFIGURAÇÕES ---

// --- LÓGICA DE CATEGORIAS ---
function listenToCategories() { /* ... (igual) ... */ }
function setupCategoryListeners() {
    document.getElementById('add-category-btn')?.addEventListener('click', async () => { /* ... (igual) ... */ });
    document.getElementById('category-list')?.addEventListener('click', async (e) => { /* ... (igual) ... */ });
}
// --- FIM CATEGORIAS ---

// --- LÓGICA DE PRODUTOS ---
function setupProductImageListener() {
     document.getElementById('product-image-file')?.addEventListener('change', e => { /* ... (igual) ... */ });
}
function listenToProducts() { /* ... (igual) ... */ }
function getPriceDisplay(options) { /* ... (igual) ... */ }
function renderProductList() { /* ... (igual) ... */ }
function setupProductListListeners() {
    document.getElementById('product-list')?.addEventListener('click', async (e) => { /* ... (igual) ... */ });
}
// --- FIM LÓGICA DE PRODUTOS ---

// --- LÓGICA DO MODAL DE PRODUTO ---
const openModal = (product = null, id = null) => {
    // Busca os elementos DENTRO da função para garantir que existem no momento da chamada
    const productModal = document.getElementById('product-modal');
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productDescInput = document.getElementById('product-desc');
    const productCategorySelect = document.getElementById('product-category');
    const productImageFileInput = document.getElementById('product-image-file');
    const modalTitle = document.getElementById('modal-title');
    const preview = document.getElementById('image-preview');
    const existingImageUrlInput = document.getElementById('existing-image-url');
    const singlePriceInput = document.getElementById('product-price');
    const optionsContainer = document.getElementById('product-options-container'); // Re-obtém aqui tbm
    const priceTypeToggle = document.getElementById('price-type-toggle'); // Re-obtém aqui tbm

    if (!productModal || !productIdInput || !productNameInput || !productDescInput || !productCategorySelect || !productImageFileInput || !modalTitle || !preview || !existingImageUrlInput || !singlePriceInput || !optionsContainer || !priceTypeToggle) {
        console.error("Elementos do modal não encontrados ao tentar abrir!");
        return;
    }

    // Preenche campos básicos
    productIdInput.value = id || '';
    productNameInput.value = product?.name || '';
    productDescInput.value = product?.description || '';
    productCategorySelect.value = product?.categoryId || '';
    productImageFileInput.value = '';
    modalTitle.textContent = id ? 'Editar Produto' : 'Adicionar Novo Produto';

    // Imagem preview
    if (product?.imageUrl) {
        preview.src = product.imageUrl;
        preview.classList.remove('hidden');
        existingImageUrlInput.value = product.imageUrl;
    } else {
        preview.src = '';
        preview.classList.add('hidden');
        existingImageUrlInput.value = '';
    }

    // Limpa preço/opções
    singlePriceInput.value = '';
    optionsContainer.innerHTML = ''; // Limpa container

    // Configura switch e preenche dados de preço/opções
    const hasOptions = product?.options && Array.isArray(product.options) && product.options.length > 0;
    const hasMultipleValidOptions = hasOptions && product.options.length > 1;
    const hasSingleValidOption = hasOptions && product.options.length === 1;

    priceTypeToggle.checked = hasMultipleValidOptions; // Define estado do switch
    updatePriceSections(hasMultipleValidOptions);      // Mostra/esconde seções

    if (hasMultipleValidOptions) {
        product.options.forEach(option => addOption(option));
    } else if (hasSingleValidOption) {
        const price = product.options[0].price;
        singlePriceInput.value = (typeof price === 'number' && !isNaN(price)) ? price.toFixed(2) : '';
        addOption(); // Add linha oculta
    } else {
        // Novo produto ou sem opções: estado já foi setado por updatePriceSections(false)
        addOption(); // Add linha oculta
    }

    // Mostra o modal
    productModal.classList.remove('hidden');
    productModal.classList.add('flex');
};

const closeModal = () => {
     const productModal = document.getElementById('product-modal'); // Busca novamente
     if (!productModal) return;

    productModal.classList.add('hidden');
    productModal.classList.remove('flex');
    // Limpa campos (igual)
    const fieldsToClear = ['product-id', 'product-name', 'product-desc', 'product-category', 'product-image-file', 'existing-image-url', 'product-price'];
    fieldsToClear.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    const preview = document.getElementById('image-preview');
    if (preview) { preview.src = ''; preview.classList.add('hidden'); }
    const optionsContainer = document.getElementById('product-options-container');
    if (optionsContainer) optionsContainer.innerHTML = '';
    const priceTypeToggle = document.getElementById('price-type-toggle');
    if (priceTypeToggle) { // Reseta switch
        priceTypeToggle.checked = false;
        updatePriceSections(false);
    }
};

async function saveProduct() {
     // Busca elementos DENTRO da função
    const id = document.getElementById('product-id')?.value;
    const imageFile = document.getElementById('product-image-file')?.files[0];
    let imageUrl = document.getElementById('existing-image-url')?.value || '';
    const productName = document.getElementById('product-name')?.value.trim();
    const categoryId = document.getElementById('product-category')?.value;
    const priceTypeToggle = document.getElementById('price-type-toggle'); // Busca novamente
    const isMultipleOptions = priceTypeToggle?.checked;
    const button = document.getElementById('save-product-btn');

    if (!productName || !categoryId || button === null || priceTypeToggle === null) {
         alert("Erro: Elementos essenciais do formulário não encontrados ao salvar.");
         return; // Sai se faltar algo crítico
     }

    let options = [];

    // Validações
    if (!productName) return alert("O nome do produto é obrigatório.");
    if (!categoryId) return alert("A categoria é obrigatória.");

    // Coleta Preços
    if (isMultipleOptions) {
        // ... (lógica de coleta múltipla igual) ...
         const optionRows = document.querySelectorAll('#multiple-options-section .option-row');
        if (optionRows.length === 0) return alert("Adicione pelo menos uma opção.");

        for (const row of optionRows) {
            const nameInput = row.querySelector('input[name="optionName[]"]');
            const priceInput = row.querySelector('input[name="optionPrice[]"]');
            if (!nameInput || !priceInput) continue; // Pula se inputs não existem na linha

            const name = nameInput.value.trim();
            const price = parseFloat(priceInput.value);

            if (!name) return alert("O nome de todas as opções é obrigatório.");
            if (isNaN(price) || price < 0) return alert(`O preço da opção "${name}" deve ser um número válido >= 0.`);

            options.push({ name, price });
        }
        if (options.length === 0) return alert("Adicione pelo menos uma opção válida.");
    } else {
        // ... (lógica de coleta única igual) ...
        const singlePriceInput = document.getElementById('product-price');
        if (!singlePriceInput) return alert("Erro: Campo de preço único não encontrado.");
        const singlePrice = parseFloat(singlePriceInput.value);

        if (isNaN(singlePrice) || singlePrice < 0) {
            return alert("O preço único deve ser um número válido >= 0.");
        }
        options.push({ name: "Padrão", price: singlePrice });
    }

    // Monta objeto de dados (igual)
    const data = { /* ... */ };

    // Lógica Upload e Save (igual)
    button.disabled = true;
    button.textContent = "A guardar...";
    try {
        // Upload (igual)
        if (imageFile) { /* ... */ }
        data.imageUrl = imageUrl || 'https://placehold.co/400x300/cccccc/ffffff?text=Sem+Foto';

        // Save Firestore (igual)
        button.textContent = "A guardar produto...";
        if (id) { await updateDoc(doc(db, "products", id), data); }
        else { await addDoc(productsRef, data); }
        closeModal();

    } catch (error) { /* ... (tratamento de erro igual) ... */
     console.error("Erro ao guardar produto:", error);
     alert(`Erro ao guardar: ${error.message || 'Ocorreu um erro desconhecido.'}`);
    } finally {
        if(button) { button.disabled = false; button.textContent = "Guardar"; }
    }
}

function setupProductModalListeners() {
    document.getElementById('add-product-btn')?.addEventListener('click', () => openModal());
    document.getElementById('cancel-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('save-product-btn')?.addEventListener('click', saveProduct); // Chama a função async separada
    setupProductImageListener(); // Configura listener da imagem aqui
}
// --- FIM MODAL ---

// --- INICIA A APLICAÇÃO ---
// Garante que o DOM está pronto antes de rodar o setup inicial
document.addEventListener('DOMContentLoaded', initializeAppLogic);