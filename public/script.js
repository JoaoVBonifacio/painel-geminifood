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
const themeToggleButton = document.getElementById('theme-toggle-btn');
const lightIcon = document.getElementById('theme-icon-light');
const darkIcon = document.getElementById('theme-icon-dark');
// ... (resto da lógica do tema igual à versão anterior) ...
function applyTheme(isDark) { /* ... */ }
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (savedTheme === 'dark' || (!savedTheme && prefersDark)) { applyTheme(true); } else { applyTheme(false); }
themeToggleButton.addEventListener('click', () => { /* ... */ });


// --- FUNÇÕES PARA OPÇÕES DE PRODUTO ---
function createOptionRowHTML(option = { name: '', price: '' }) {
     // Garante que o preço seja formatado corretamente ou vazio
    const priceValue = (typeof option.price === 'number' && !isNaN(option.price)) ? option.price.toFixed(2) : '';
    return `
        <div class="option-row">
            <input type="text" name="optionName[]" placeholder="Nome da Opção (ex: Pequena)" class="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${option.name || ''}" required>
            <input type="number" name="optionPrice[]" placeholder="Preço (€)" step="0.01" class="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${priceValue}" required>
            <button type="button" onclick="removeOption(this)" class="text-red-500 hover:text-red-400 font-bold p-1">X</button>
        </div>
    `;
}

window.addOption = function(option) {
    const container = document.getElementById('product-options-container');
    const newRow = document.createElement('div');
    newRow.innerHTML = createOptionRowHTML(option); // Passa a opção (pode ser undefined)
    container.appendChild(newRow.firstElementChild);
}

window.removeOption = function(button) {
    const container = document.getElementById('product-options-container');
    if (container.children.length > 1) {
        button.closest('.option-row').remove();
    } else {
        alert("É necessário ter pelo menos uma opção para o produto.");
    }
}
// --- FIM DAS FUNÇÕES PARA OPÇÕES ---

// --- LÓGICA DO SWITCH DE TIPO DE PREÇO ---
const priceTypeToggle = document.getElementById('price-type-toggle');
const priceTypeLabel = document.getElementById('price-type-label');
const singlePriceSection = document.getElementById('single-price-section');
const multipleOptionsSection = document.getElementById('multiple-options-section');

function updatePriceSections(isMultiple) {
    if (isMultiple) {
        priceTypeLabel.textContent = "Múltiplas Opções";
        singlePriceSection.classList.add('hidden-section');
        multipleOptionsSection.classList.remove('hidden-section');
        // Garante que haja pelo menos uma linha de opção ao mudar para múltiplo
        if (document.getElementById('product-options-container').children.length === 0) {
            addOption();
        }
    } else {
        priceTypeLabel.textContent = "Preço Único";
        singlePriceSection.classList.remove('hidden-section');
        multipleOptionsSection.classList.add('hidden-section');
    }
}

priceTypeToggle.addEventListener('change', (e) => {
    updatePriceSections(e.target.checked);
});
// --- FIM DA LÓGICA DO SWITCH ---


async function getAppConfig() { /* ... (igual ao anterior) ... */ }

async function initialize() {
    try {
        const firebaseConfig = await getAppConfig();
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        settingsRef = doc(db, "settings", "main");
        productsRef = collection(db, "products");
        categoriesRef = collection(db, "categories");

        onAuthStateChanged(auth, async (user) => { /* ... (igual ao anterior) ... */ });

        document.getElementById('login-btn').addEventListener('click', () => { /* ... (igual ao anterior) ... */ });
        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

        async function loadSettingsAndStartInterval() { /* ... (igual ao anterior) ... */ }
        async function loadSettings() { /* ... (igual ao anterior) ... */ }
        document.getElementById('save-settings-btn').addEventListener('click', async () => { /* ... (igual ao anterior) ... */ });
        async function checkAndUpdateStoreStatus() { /* ... (igual ao anterior) ... */ }
        document.getElementById('store-closed-toggle').addEventListener('change', (e) => { /* ... (igual ao anterior) ... */ });

        // --- LÓGICA DE CATEGORIAS (igual ao anterior) ---
        function listenToCategories() { /* ... */ }
        document.getElementById('add-category-btn').addEventListener('click', async () => { /* ... */ });
        document.getElementById('category-list').addEventListener('click', async (e) => { /* ... */ });

        // --- LÓGICA DE PRODUTOS ---
        document.getElementById('product-image-file').addEventListener('change', e => { /* ... (igual ao anterior) ... */ });

        function listenToProducts() { /* ... (igual ao anterior) ... */ }

        function getPriceDisplay(options) { /* ... (igual ao anterior) ... */ }

        function renderProductList() { /* ... (igual ao anterior, já usa getPriceDisplay) ... */ }

        // Abre o modal (MODIFICADO para configurar o switch)
        const openModal = (product = null, id = null) => {
            document.getElementById('product-id').value = id || '';
            document.getElementById('product-name').value = product?.name || '';
            document.getElementById('product-desc').value = product?.description || '';
            document.getElementById('product-category').value = product?.categoryId || '';
            document.getElementById('product-image-file').value = '';
            document.getElementById('modal-title').textContent = id ? 'Editar Produto' : 'Adicionar Novo Produto';

            const preview = document.getElementById('image-preview');
            const existingImageUrlInput = document.getElementById('existing-image-url');
            // ... (lógica da imagem igual ao anterior) ...
             if (product?.imageUrl) {
                preview.src = product.imageUrl;
                preview.classList.remove('hidden');
                existingImageUrlInput.value = product.imageUrl;
            } else {
                preview.src = '';
                preview.classList.add('hidden');
                existingImageUrlInput.value = '';
            }


            // Limpa containers de preço e opções
            const singlePriceInput = document.getElementById('product-price');
            const optionsContainer = document.getElementById('product-options-container');
            singlePriceInput.value = '';
            optionsContainer.innerHTML = '';

            // Verifica se tem múltiplas opções ou preço único
            const hasMultipleOptions = product?.options && product.options.length > 1;
            const hasSingleOption = product?.options && product.options.length === 1;

            priceTypeToggle.checked = hasMultipleOptions; // Marca o switch se tiver múltiplas
            updatePriceSections(hasMultipleOptions); // Mostra/esconde as seções corretas

            if (hasMultipleOptions) {
                product.options.forEach(option => addOption(option)); // Adiciona as múltiplas opções
            } else if (hasSingleOption) {
                // Se tem só uma opção, preenche o campo de preço único
                singlePriceInput.value = product.options[0].price.toFixed(2);
                addOption(); // Adiciona uma linha em branco na seção oculta para não dar erro ao salvar
            } else {
                // Se for novo produto ou não tiver opções, começa com preço único e uma linha de opção oculta
                addOption();
            }

            document.getElementById('product-modal').classList.remove('hidden');
            document.getElementById('product-modal').classList.add('flex');
        };

        const closeModal = () => {
             // ... (lógica de fechar e limpar igual ao anterior) ...
             document.getElementById('product-modal').classList.add('hidden');
            document.getElementById('product-modal').classList.remove('flex');
            document.getElementById('product-id').value = '';
            document.getElementById('product-name').value = '';
            document.getElementById('product-desc').value = '';
            document.getElementById('product-category').value = '';
            document.getElementById('product-image-file').value = '';
            document.getElementById('image-preview').src = '';
            document.getElementById('image-preview').classList.add('hidden');
            document.getElementById('existing-image-url').value = '';
            document.getElementById('product-options-container').innerHTML = '';
            document.getElementById('product-price').value = ''; // Limpa também o preço único
             // Reseta o switch para preço único por padrão ao fechar
            priceTypeToggle.checked = false;
            updatePriceSections(false);
        };

        document.getElementById('add-product-btn').addEventListener('click', () => openModal());
        document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);

        // Lógica para salvar produto (MODIFICADA para verificar o switch)
        document.getElementById('save-product-btn').addEventListener('click', async () => {
            const id = document.getElementById('product-id').value;
            const imageFile = document.getElementById('product-image-file').files[0];
            let imageUrl = document.getElementById('existing-image-url').value || '';

            const productName = document.getElementById('product-name').value.trim();
            const categoryId = document.getElementById('product-category').value;
            const isMultipleOptions = priceTypeToggle.checked;

            let options = []; // Array que será salvo no Firestore

            // Validações básicas
            if (!productName) { return alert("O nome do produto é obrigatório."); }
            if (!categoryId) { return alert("A categoria é obrigatória."); }

            if (isMultipleOptions) {
                // Coleta múltiplas opções
                const optionNames = Array.from(document.querySelectorAll('#multiple-options-section input[name="optionName[]"]')).map(input => input.value.trim());
                const optionPrices = Array.from(document.querySelectorAll('#multiple-options-section input[name="optionPrice[]"]')).map(input => parseFloat(input.value));

                let optionsValid = true;
                for (let i = 0; i < optionNames.length; i++) {
                    if (optionNames[i] && !isNaN(optionPrices[i]) && optionPrices[i] >= 0) {
                        options.push({ name: optionNames[i], price: optionPrices[i] });
                    } else {
                        optionsValid = false;
                        break;
                    }
                }
                if (options.length === 0) { return alert("Adicione pelo menos uma opção válida com nome e preço."); }
                if (!optionsValid) { return alert("Todas as opções múltiplas devem ter um nome e um preço válido (número maior ou igual a zero)."); }

            } else {
                // Coleta preço único
                const singlePriceInput = document.getElementById('product-price');
                const singlePrice = parseFloat(singlePriceInput.value);

                if (isNaN(singlePrice) || singlePrice < 0) {
                    return alert("O preço único deve ser um número válido maior ou igual a zero.");
                }
                // Salva como um array de uma única opção (para consistência com o App.tsx)
                options.push({ name: "Padrão", price: singlePrice }); // Ou pode deixar o nome vazio: name: ""
            }

            // Monta o objeto final para o Firestore
            const data = {
                name: productName,
                description: document.getElementById('product-desc').value.trim(),
                categoryId: categoryId,
                options: options, // Sempre salva o array 'options'
                imageUrl: '' // Será definida após upload
            };

            const button = document.getElementById('save-product-btn');
            button.disabled = true;
            button.textContent = "A guardar...";

            try {
                // Upload da imagem (lógica igual à anterior)
                if (imageFile) { /* ... */ }
                data.imageUrl = imageUrl || 'https://placehold.co/400x300/cccccc/ffffff?text=Sem+Foto';

                // Salva no Firestore (lógica igual à anterior)
                button.textContent = "A guardar produto...";
                if (id) {
                    await updateDoc(doc(db, "products", id), data);
                } else {
                    await addDoc(productsRef, data);
                }
                closeModal();

            } catch (error) {
                console.error("Erro ao guardar produto:", error);
                alert("Erro ao guardar: " + error.message);
            } finally {
                button.disabled = false;
                button.textContent = "Guardar";
            }
        });

        // Event listener para Editar/Remover produto (igual ao anterior)
        document.getElementById('product-list').addEventListener('click', async (e) => { /* ... */ });

    } catch (error) {
        console.error("Erro Crítico na Inicialização:", error);
        document.body.innerHTML = `<div class="text-red-500 p-8 text-center"><h1>Erro Crítico na Inicialização</h1><p>${error.message}</p></div>`;
    }
}

// Inicia a aplicação
initialize();