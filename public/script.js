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

// --- Elementos do DOM ---
const themeToggleButton = document.getElementById('theme-toggle-btn');
const lightIcon = document.getElementById('theme-icon-light');
const darkIcon = document.getElementById('theme-icon-dark');
// Removemos as referências ao switch de preço e seções relacionadas
// const priceTypeToggle = document.getElementById('price-type-toggle');
// const priceTypeLabel = document.getElementById('price-type-label');
// const singlePriceSection = document.getElementById('single-price-section');
// const multipleOptionsSection = document.getElementById('multiple-options-section');
// const optionsContainer = document.getElementById('product-options-container');
const productModal = document.getElementById('product-modal');
const loginScreen = document.getElementById('login-screen');
const mainPanel = document.getElementById('main-panel');

// --- LÓGICA DE TEMA (DARK MODE) ---
// (Igual à versão anterior)
function applyTheme(isDark) { /* ... */ }
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme === 'dark' || (!savedTheme && prefersDark));
themeToggleButton?.addEventListener('click', () => { /* ... */ });

// --- FUNÇÕES PARA OPÇÕES DE PRODUTO (REMOVIDAS OU COMENTADAS) ---
// function createOptionRowHTML(option = { name: '', price: '' }) { /* ... */ }
// window.addOption = function(option) { /* ... */ }
// window.removeOption = function(button) { /* ... */ }

// --- LÓGICA DO SWITCH DE PREÇO (REMOVIDA OU COMENTADA) ---
// function updatePriceSections(isMultiple) { /* ... */ }
// priceTypeToggle?.addEventListener('change', (e) => { /* ... */ });

// --- FUNÇÕES DE INICIALIZAÇÃO E AUTENTICAÇÃO ---
async function getAppConfig() { /* ... (igual) ... */ }
async function initialize() {
    try {
        const firebaseConfig = await getAppConfig();
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        settingsRef = doc(db, "settings", "main");
        productsRef = collection(db, "products");
        categoriesRef = collection(db, "categories");

        // Listener de Autenticação (Lógica de visibilidade corrigida)
        onAuthStateChanged(auth, async (user) => {
             if (!loginScreen || !mainPanel) {
                 console.error("Tela de login ou painel principal não encontrado no DOM.");
                 return;
            }
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
                        alert('Acesso negado.');
                        await signOut(auth);
                        // Garante visibilidade correta no logout por falta de permissão
                        loginScreen.classList.remove('hidden');
                        mainPanel.classList.add('hidden');
                        clearInterval(storeStatusInterval);
                    }
                } catch(adminCheckError) {
                     console.error("Erro ao verificar admin:", adminCheckError);
                     alert("Erro ao verificar permissões.");
                     await signOut(auth);
                      loginScreen.classList.remove('hidden');
                     mainPanel.classList.add('hidden');
                     clearInterval(storeStatusInterval);
                }
            } else {
                loginScreen.classList.remove('hidden');
                mainPanel.classList.add('hidden');
                clearInterval(storeStatusInterval);
            }
        });

        document.getElementById('login-btn')?.addEventListener('click', () => { /* ... (igual) ... */ });
        document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));

    } catch (error) {
        console.error("Erro Crítico na Inicialização:", error);
        document.body.innerHTML = `<div class="text-red-500 p-8 text-center"><h1>Erro Crítico na Inicialização</h1><p>${error.message}</p></div>`;
    }
}
// --- FIM INICIALIZAÇÃO E AUTENTICAÇÃO ---

// --- CONFIGURAÇÕES GERAIS E HORÁRIO ---
async function loadSettingsAndStartInterval() { /* ... (igual) ... */ }
async function loadSettings() { /* ... (igual) ... */ }
document.getElementById('save-settings-btn')?.addEventListener('click', async () => { /* ... (igual) ... */ });
async function checkAndUpdateStoreStatus() { /* ... (igual) ... */ }
document.getElementById('store-closed-toggle')?.addEventListener('change', async (e) => { /* ... (igual) ... */ });
// --- FIM CONFIGURAÇÕES ---

// --- LÓGICA DE CATEGORIAS ---
function listenToCategories() { /* ... (igual) ... */ }
document.getElementById('add-category-btn')?.addEventListener('click', async () => { /* ... (igual) ... */ });
document.getElementById('category-list')?.addEventListener('click', async (e) => { /* ... (igual) ... */ });
// --- FIM CATEGORIAS ---

// --- LÓGICA DE PRODUTOS ---
document.getElementById('product-image-file')?.addEventListener('change', e => { /* ... (igual) ... */ });
function listenToProducts() { /* ... (igual) ... */ }

// Função getPriceDisplay (Versão ORIGINAL que espera 'price')
function getPriceDisplay(price) {
    if (typeof price === 'number' && !isNaN(price)) {
        return `${price.toFixed(2)} €`;
    }
    return 'Preço Indefinido'; // Ou N/A, ou como preferir
}

// Renderiza a lista de produtos (Versão ORIGINAL)
function renderProductList() {
    const productListContainer = document.getElementById('product-list');
    if (!productListContainer) return;
    productListContainer.innerHTML = '';

    const productsByCategory = allCategories.reduce((acc, category) => {
        acc[category.id] = allProducts.filter(p => p.categoryId === category.id);
        return acc;
    }, {});

    allCategories.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
        const productsInCategory = productsByCategory[cat.id] || [];
        productsInCategory.sort((a,b) => a.name.localeCompare(b.name));

        if (productsInCategory.length > 0) {
            let categorySection = `<div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">${cat.name}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;

            productsInCategory.forEach(product => {
                // Usa a versão original de getPriceDisplay com product.price
                const priceText = getPriceDisplay(product.price);
                const imageUrl = product.imageUrl || 'https://placehold.co/100x100/cccccc/ffffff?text=Sem+Foto';

                categorySection += `
                    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-start">
                        <img src="${imageUrl}" alt="${product.name}" class="w-20 h-20 rounded-md object-cover mr-4 flex-shrink-0">
                        <div class="flex-grow min-w-0">
                            <h4 class="font-semibold text-gray-800 dark:text-gray-100 truncate">${product.name}</h4>
                             <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words">${product.description || 'Sem descrição'}</p>
                            <p class="text-sm text-gray-500 dark:text-gray-300 mt-1 font-medium">${priceText}</p> {/* Usa priceText original */}
                        </div>
                        <div class="flex flex-col items-end justify-start space-y-1 flex-shrink-0 ml-2">
                             <button class="edit-btn text-xs text-blue-500 hover:text-blue-400" data-id="${product.id}">Editar</button>
                             <button class="delete-btn text-xs text-red-500 hover:text-red-400" data-id="${product.id}">Remover</button>
                         </div>
                    </div>`;
            });

            categorySection += `</div></div>`;
            productListContainer.innerHTML += categorySection;
        }
    });

     if (productListContainer.innerHTML === '') {
        productListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Nenhum produto encontrado.</p>';
    }
}
// --- FIM LÓGICA DE PRODUTOS ---

// --- LÓGICA DO MODAL DE PRODUTO ---
// Abre o modal (Versão ORIGINAL)
const openModal = (product = null, id = null) => {
    // Referências e verificações (apenas elementos originais)
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productDescInput = document.getElementById('product-desc');
    const productPriceInput = document.getElementById('product-price'); // Campo de preço único
    const productCategorySelect = document.getElementById('product-category');
    const productImageFileInput = document.getElementById('product-image-file');
    const modalTitle = document.getElementById('modal-title');
    const preview = document.getElementById('image-preview');
    const existingImageUrlInput = document.getElementById('existing-image-url');

    if (!productModal || !productIdInput || !productNameInput || !productDescInput || !productPriceInput || !productCategorySelect || !productImageFileInput || !modalTitle || !preview || !existingImageUrlInput) {
        console.error("Um ou mais elementos do modal original não foram encontrados!");
        return;
    }

    // Preenche campos básicos + preço único
    productIdInput.value = id || '';
    productNameInput.value = product?.name || '';
    productDescInput.value = product?.description || '';
    // Preenche preço único
    productPriceInput.value = (typeof product?.price === 'number' && !isNaN(product.price)) ? product.price.toFixed(2) : '';
    productCategorySelect.value = product?.categoryId || '';
    productImageFileInput.value = '';
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

    // Mostra o modal
    productModal.classList.remove('hidden');
    productModal.classList.add('flex');
};

// Fecha o modal (Versão ORIGINAL)
const closeModal = () => {
     if (!productModal) return;
    productModal.classList.add('hidden');
    productModal.classList.remove('flex');
    // Limpa todos os campos originais
    const fieldsToClear = ['product-id', 'product-name', 'product-desc', 'product-price', 'product-category', 'product-image-file', 'existing-image-url'];
    fieldsToClear.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
    }
    // Não precisa limpar options container ou resetar switch
};

// Listeners para abrir/fechar modal
document.getElementById('add-product-btn')?.addEventListener('click', () => openModal());
document.getElementById('cancel-modal-btn')?.addEventListener('click', closeModal);

// Listener para salvar o produto (Versão ORIGINAL)
document.getElementById('save-product-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('product-id')?.value;
    const imageFile = document.getElementById('product-image-file')?.files[0];
    let imageUrl = document.getElementById('existing-image-url')?.value || '';
    const productName = document.getElementById('product-name')?.value.trim();
    const categoryId = document.getElementById('product-category')?.value;
    const priceInput = document.getElementById('product-price');
    const button = document.getElementById('save-product-btn');

    if(!productName || !categoryId || !priceInput || !button) {
         alert("Erro: Elementos essenciais do formulário não encontrados.");
         return;
    }

    const price = parseFloat(priceInput.value);

    // --- Validações Originais ---
    if (!productName) return alert("O nome do produto é obrigatório.");
    if (!categoryId) return alert("A categoria é obrigatória.");
    if (isNaN(price) || price < 0) return alert("O preço deve ser um número válido maior ou igual a zero.");

    // --- Monta o objeto de dados ORIGINAL ---
    const data = {
        name: productName,
        description: document.getElementById('product-desc')?.value.trim() ?? '',
        categoryId: categoryId,
        price: price, // Salva o preço único
        imageUrl: '' // Será definida abaixo
    };

    // --- Lógica de Upload e Save (igual) ---
    button.disabled = true;
    button.textContent = "A guardar...";
    try {
        if (imageFile) { /* ... (lógica de upload igual) ... */ }
        data.imageUrl = imageUrl || 'https://placehold.co/400x300/cccccc/ffffff?text=Sem+Foto';

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
        if(button) {
            button.disabled = false;
            button.textContent = "Guardar";
        }
    }
});

// Listener para editar/remover produto na lista (igual)
document.getElementById('product-list')?.addEventListener('click', async (e) => { /* ... */ });
// --- FIM MODAL ---

// --- INICIA A APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', initialize);