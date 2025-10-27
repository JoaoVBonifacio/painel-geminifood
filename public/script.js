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
const priceTypeToggle = document.getElementById('price-type-toggle');
const priceTypeLabel = document.getElementById('price-type-label');
const singlePriceSection = document.getElementById('single-price-section');
const multipleOptionsSection = document.getElementById('multiple-options-section');
const optionsContainer = document.getElementById('product-options-container');
const productModal = document.getElementById('product-modal');
const loginScreen = document.getElementById('login-screen');
const mainPanel = document.getElementById('main-panel');

// --- LÓGICA DE TEMA (DARK MODE) ---
function applyTheme(isDark) {
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
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme === 'dark' || (!savedTheme && prefersDark));
themeToggleButton?.addEventListener('click', () => {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    applyTheme(isDarkMode);
});

// --- FUNÇÕES PARA OPÇÕES DE PRODUTO ---
function createOptionRowHTML(option = { name: '', price: '' }) {
    const priceValue = (typeof option.price === 'number' && !isNaN(option.price)) ? option.price.toFixed(2) : '';
    // Usa classes Tailwind para estilização consistente
    return `
        <div class="option-row flex items-center mb-2 gap-2">
            <input type="text" name="optionName[]" placeholder="Nome da Opção (ex: Pequena)" class="flex-grow p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${option.name || ''}" required>
            <input type="number" name="optionPrice[]" placeholder="Preço (€)" step="0.01" class="w-28 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${priceValue}" required>
            <button type="button" onclick="removeOption(this)" class="text-red-500 hover:text-red-400 font-bold p-1 text-xl leading-none">&times;</button>
        </div>
    `;
}
// Adiciona uma linha de opção (agora global via window)
window.addOption = function(option) {
    if (!optionsContainer) return;
    const newRowHTML = createOptionRowHTML(option);
    optionsContainer.insertAdjacentHTML('beforeend', newRowHTML);
}
// Remove uma linha de opção (agora global via window)
window.removeOption = function(button) {
    if (!optionsContainer) return;
    if (optionsContainer.children.length > 1) {
        button.closest('.option-row')?.remove(); // Usa closest para mais segurança
    } else {
        alert("É necessário ter pelo menos uma opção para o produto.");
    }
}
// --- FIM OPÇÕES ---

// --- LÓGICA DO SWITCH DE PREÇO ---
// Atualiza a visibilidade das seções de preço usando classes 'hidden'
function updatePriceSections(isMultiple) {
    if (!priceTypeLabel || !singlePriceSection || !multipleOptionsSection) return;

    if (isMultiple) {
        priceTypeLabel.textContent = "Múltiplas Opções";
        singlePriceSection.classList.add('hidden');       // ESCONDE preço único
        multipleOptionsSection.classList.remove('hidden'); // MOSTRA múltiplas opções
        // Garante que haja pelo menos uma linha de opção ao mudar para múltiplo
        if (optionsContainer && optionsContainer.children.length === 0) {
            addOption();
        }
    } else {
        priceTypeLabel.textContent = "Preço Único";
        singlePriceSection.classList.remove('hidden'); // MOSTRA preço único
        multipleOptionsSection.classList.add('hidden');    // ESCONDE múltiplas opções
    }
}
// Listener para o switch
priceTypeToggle?.addEventListener('change', (e) => {
    updatePriceSections(e.target.checked);
});
// --- FIM SWITCH ---

// --- INICIALIZAÇÃO E AUTENTICAÇÃO ---
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

async function initialize() {
    try {
        const firebaseConfig = await getAppConfig();
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        settingsRef = doc(db, "settings", "main");
        productsRef = collection(db, "products");
        categoriesRef = collection(db, "categories");

        // Listener de Autenticação (Controla visibilidade Login/Painel)
        onAuthStateChanged(auth, async (user) => {
            if (!loginScreen || !mainPanel) return;
            if (user) {
                try {
                    const adminDocRef = doc(db, 'admins', user.uid);
                    const adminDocSnap = await getDoc(adminDocRef);
                    if (adminDocSnap.exists()) {
                        loginScreen.classList.add('hidden');    // Esconde Login
                        mainPanel.classList.remove('hidden'); // Mostra Painel
                        loadSettingsAndStartInterval();
                        listenToCategories();
                        listenToProducts();
                    } else {
                        alert('Acesso negado.');
                        await signOut(auth); // Desloga se não for admin
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
            } else { // Usuário não logado
                loginScreen.classList.remove('hidden'); // Mostra login
                mainPanel.classList.add('hidden');      // Esconde painel
                clearInterval(storeStatusInterval);     // Para verificador de horário
            }
        });

        // Listener Login Button
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
                    let friendlyMessage = "Ocorreu um erro.";
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        friendlyMessage = "Email ou palavra-passe incorretos.";
                    } else if (error.code === 'auth/invalid-email') {
                         friendlyMessage = "O formato do email é inválido.";
                    }
                    console.error("Erro login:", error.code);
                    authError.textContent = friendlyMessage;
                    authError.classList.remove('hidden');
                });
        });

        // Listener Logout Button
        document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));

    } catch (error) { // Erro na inicialização (ex: fetch config falhou)
         console.error("Erro Crítico na Inicialização:", error);
         document.body.innerHTML = `<div class="text-red-500 p-8 text-center"><h1>Erro Crítico na Inicialização</h1><p>${error.message}</p></div>`;
    }
}
// --- FIM INICIALIZAÇÃO E AUTENTICAÇÃO ---

// --- CONFIGURAÇÕES GERAIS E HORÁRIO ---
async function loadSettingsAndStartInterval() {
    await loadSettings();
    if (storeStatusInterval) clearInterval(storeStatusInterval);
    storeStatusInterval = setInterval(checkAndUpdateStoreStatus, 60000); // 1 min
}

async function loadSettings() {
     try {
        const docSnap = await getDoc(settingsRef);
        // Funções auxiliares para evitar repetição e erros
        const setInputValue = (id, value, defaultValue = '') => {
            const element = document.getElementById(id);
            if (element) element.value = value ?? defaultValue;
        };
        const setCheckboxState = (id, checked, defaultState = false) => {
            const element = document.getElementById(id);
            if (element) element.checked = checked ?? defaultState;
        };

        if (docSnap.exists()) {
            const settings = docSnap.data();
            setInputValue('whatsapp-number', settings.whatsappNumber);
            setInputValue('whatsapp-message', settings.whatsappMessage, '*Novo Pedido* 🍔\n\n*Cliente:* {cliente}\n*Itens:*\n{itens}\n\n*Morada:*\n{morada}\n*Pagamento:* {pagamento}\n*Total: {total}*');
            setInputValue('minimum-order', settings.minimumOrder?.toFixed(2), '0.00'); // Usar 0.00 como padrão se não definido
            setCheckboxState('store-closed-toggle', settings.isStoreClosed);
            setCheckboxState('schedule-enabled-toggle', settings.scheduleEnabled);
            setInputValue('weekday-open', settings.weekdayOpen, '15:00');
            setInputValue('weekday-close', settings.weekdayClose, '23:00');
            setInputValue('weekend-open', settings.weekendOpen, '10:00');
            setInputValue('weekend-close', settings.weekendClose, '23:00');
        } else {
             console.warn("Doc 'settings/main' não encontrado. Usando padrões.");
             setInputValue('whatsapp-message', undefined, '*Novo Pedido* 🍔\n\n*Cliente:* {cliente}\n*Itens:*\n{itens}\n\n*Morada:*\n{morada}\n*Pagamento:* {pagamento}\n*Total: {total}*');
             setInputValue('minimum-order', undefined, '0.00');
             setCheckboxState('store-closed-toggle', undefined, false);
             setCheckboxState('schedule-enabled-toggle', undefined, false);
             setInputValue('weekday-open', undefined, '15:00');
             setInputValue('weekday-close', undefined, '23:00');
             setInputValue('weekend-open', undefined, '10:00');
             setInputValue('weekend-close', undefined, '23:00');
        }
        await checkAndUpdateStoreStatus(); // Verifica status após carregar
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        alert("Não foi possível carregar as configurações da loja.");
    }
}

document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
    const button = document.getElementById('save-settings-btn');
    if (!button) return;
    button.disabled = true; button.textContent = "A guardar...";
    try {
        const minOrderValue = parseFloat(document.getElementById('minimum-order')?.value) || 0;
        const data = {
            whatsappNumber: document.getElementById('whatsapp-number')?.value.trim() ?? '',
            whatsappMessage: document.getElementById('whatsapp-message')?.value.trim() ?? '',
            minimumOrder: minOrderValue < 0 ? 0 : minOrderValue,
            isStoreClosed: document.getElementById('store-closed-toggle')?.checked ?? false,
            scheduleEnabled: document.getElementById('schedule-enabled-toggle')?.checked ?? false,
            weekdayOpen: document.getElementById('weekday-open')?.value ?? '15:00',
            weekdayClose: document.getElementById('weekday-close')?.value ?? '23:00',
            weekendOpen: document.getElementById('weekend-open')?.value ?? '10:00',
            weekendClose: document.getElementById('weekend-close')?.value ?? '23:00',
        };
        await setDoc(settingsRef, data, { merge: true });
        alert("Configurações guardadas!");
        await checkAndUpdateStoreStatus();
    } catch (error) {
        console.error("Erro ao guardar config:", error); alert("Erro ao guardar.");
    } finally {
        button.disabled = false; button.textContent = "Guardar Configurações";
    }
});

async function checkAndUpdateStoreStatus() {
     console.log("Verificando status da loja...");
    try {
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists()) return;
        const settings = settingsSnap.data();
        const storeClosedToggle = document.getElementById('store-closed-toggle');
        if (!storeClosedToggle) return;

        if (!settings.scheduleEnabled) {
             console.log("Horário auto desligado.");
             storeClosedToggle.checked = settings.isStoreClosed ?? false;
             return;
        }

        const now = new Date();
        const dayOfWeek = now.getDay();
        const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
        let isOpenBasedOnSchedule = false;

        if (dayOfWeek !== 1) { // Se não for Segunda
            const openTime = (dayOfWeek === 0 || dayOfWeek === 6) ? settings.weekendOpen : settings.weekdayOpen;
            const closeTime = (dayOfWeek === 0 || dayOfWeek === 6) ? settings.weekendClose : settings.weekdayClose;
            // Verifica se os horários estão definidos antes de comparar
            if (openTime && closeTime && currentTime >= openTime && currentTime < closeTime) {
                isOpenBasedOnSchedule = true;
            }
        }

        const shouldBeClosed = !isOpenBasedOnSchedule;

        if (settings.isStoreClosed !== shouldBeClosed) {
            console.log(`Atualizando status auto para: ${shouldBeClosed ? 'Fechada' : 'Aberta'}`);
            await updateDoc(settingsRef, { isStoreClosed: shouldBeClosed });
            storeClosedToggle.checked = shouldBeClosed;
        } else {
             console.log(`Status auto: ${settings.isStoreClosed ? 'Fechada' : 'Aberta'} (correto).`);
             storeClosedToggle.checked = settings.isStoreClosed;
        }
    } catch (error) {
        console.error("Erro ao verificar/atualizar status:", error);
    }
}

document.getElementById('store-closed-toggle')?.addEventListener('change', async (e) => {
    const isChecked = e.target.checked;
    console.log(`Toggle manual alterado para: ${isChecked ? 'Fechada' : 'Aberta'}. Salvando...`);
    try {
        await updateDoc(settingsRef, { isStoreClosed: isChecked });
    } catch (error) {
        console.error("Erro ao atualizar status manual:", error);
        alert("Erro ao salvar estado manual.");
        e.target.checked = !isChecked; // Reverte
    }
});
// --- FIM CONFIGURAÇÕES ---

// --- LÓGICA DE CATEGORIAS ---
function listenToCategories() {
     const q = query(categoriesRef, orderBy("name"));
    onSnapshot(q, snapshot => {
        const categoryList = document.getElementById('category-list');
        const categorySelect = document.getElementById('product-category');
        if (!categoryList || !categorySelect) return;

        categoryList.innerHTML = '';
        categorySelect.innerHTML = '<option value="">-- Selecione uma categoria --</option>';
        allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        allCategories.forEach(cat => {
            const item = document.createElement('div');
            item.className = "flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md";
            item.innerHTML = `<span class="text-gray-700 dark:text-gray-200">${cat.name}</span><div class="space-x-2"><button class="edit-cat-btn text-sm text-blue-500 hover:text-blue-400" data-id="${cat.id}" data-name="${cat.name}">Editar</button><button class="delete-cat-btn text-sm text-red-500 hover:text-red-400" data-id="${cat.id}">X</button></div>`;
            categoryList.appendChild(item);
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });
        renderProductList();
    }, error => {
        console.error("Erro ao ouvir categorias:", error); alert("Erro ao carregar categorias.");
    });
}
document.getElementById('add-category-btn')?.addEventListener('click', async () => {
     const input = document.getElementById('new-category-name');
     if (!input) return;
     const name = input.value.trim();
     if (name) {
         try { await addDoc(categoriesRef, { name }); input.value = ''; }
         catch (error) { console.error("Erro add cat:", error); alert("Erro ao adicionar."); }
     } else { alert("Digite o nome."); }
});
document.getElementById('category-list')?.addEventListener('click', async (e) => {
     const target = e.target; const id = target.dataset.id; if (!id) return;
     const categoryDocRef = doc(db, 'categories', id);
     if (target.classList.contains('edit-cat-btn')) {
         const currentName = target.dataset.name;
         const newName = prompt("Novo nome:", currentName);
         if (newName && newName.trim() && newName.trim() !== currentName) {
             try { await updateDoc(categoryDocRef, { name: newName.trim() }); }
             catch (error) { console.error("Erro edit cat:", error); alert("Erro ao editar."); }
         }
     } else if (target.classList.contains('delete-cat-btn')) {
         try {
             const q = query(productsRef, where("categoryId", "==", id));
             const productsInCategory = await getDocs(q);
             if (!productsInCategory.empty) {
                 alert("Não pode remover, existem produtos associados."); return;
             }
             if (confirm(`Remover categoria "${target.closest('div').querySelector('span')?.textContent || id}"?`)) {
                 await deleteDoc(categoryDocRef);
             }
         } catch (error) { console.error("Erro delete cat:", error); alert("Erro ao remover."); }
     }
});
// --- FIM CATEGORIAS ---

// --- LÓGICA DE PRODUTOS ---
document.getElementById('product-image-file')?.addEventListener('change', e => {
     const file = e.target.files[0];
     const preview = document.getElementById('image-preview');
     const existingUrlInput = document.getElementById('existing-image-url');
     if (!preview || !existingUrlInput) return;
     if (file) {
         const reader = new FileReader();
         reader.onload = (event) => { preview.src = event.target.result; preview.classList.remove('hidden'); }
         reader.readAsDataURL(file);
         existingUrlInput.value = ''; // Limpa url antiga
     } else {
         const existingUrl = existingUrlInput.value;
         if (existingUrl) { preview.src = existingUrl; preview.classList.remove('hidden'); }
         else { preview.src = ''; preview.classList.add('hidden'); }
     }
});

function listenToProducts() {
     const q = query(productsRef);
    onSnapshot(q, snapshot => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProductList();
    }, error => { console.error("Erro ao ouvir produtos:", error); alert("Erro ao carregar produtos."); });
}

function getPriceDisplay(options, legacyPrice) {
    // Prioriza o array 'options' se existir e for válido
    if (options && Array.isArray(options) && options.length > 0) {
        if (options.length === 1) {
            return (typeof options[0].price === 'number' && !isNaN(options[0].price))
                ? `${options[0].price.toFixed(2)} €` : 'Inválido';
        }
        const validPrices = options.map(opt => opt.price).filter(price => typeof price === 'number' && !isNaN(price));
        if (validPrices.length === 0) return 'Inválido';
        const minPrice = Math.min(...validPrices);
        const maxPrice = Math.max(...validPrices);
        return (minPrice === maxPrice) ? `${minPrice.toFixed(2)} €` : `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} €`;
    }
    // Fallback para o campo 'price' antigo se 'options' não for válido
    if (typeof legacyPrice === 'number' && !isNaN(legacyPrice)) {
        return `${legacyPrice.toFixed(2)} €`;
    }
    return 'Preço Indef.'; // Caso nenhum preço seja encontrado
}

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
            let categorySection = `<div class="mb-6"><h3 class="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">${cat.name}</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;
            productsInCategory.forEach(product => {
                // Passa ambos, options e price (antigo) para getPriceDisplay
                const priceText = getPriceDisplay(product.options, product.price);
                const imageUrl = product.imageUrl || 'https://placehold.co/100x100/cccccc/ffffff?text=Sem+Foto';
                categorySection += `
                    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-start">
                        <img src="${imageUrl}" alt="${product.name}" class="w-20 h-20 rounded-md object-cover mr-4 flex-shrink-0">
                        <div class="flex-grow min-w-0">
                            <h4 class="font-semibold text-gray-800 dark:text-gray-100 truncate">${product.name}</h4>
                             <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words">${product.description || 'Sem descrição'}</p>
                            <p class="text-sm text-gray-500 dark:text-gray-300 mt-1 font-medium">${priceText}</p>
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
        productListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Nenhum produto cadastrado.</p>';
    }
}
// --- FIM LÓGICA DE PRODUTOS ---

// --- LÓGICA DO MODAL DE PRODUTO ---
const openModal = (product = null, id = null) => {
    // Referências e verificações
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productDescInput = document.getElementById('product-desc');
    const productCategorySelect = document.getElementById('product-category');
    const productImageFileInput = document.getElementById('product-image-file');
    const modalTitle = document.getElementById('modal-title');
    const preview = document.getElementById('image-preview');
    const existingImageUrlInput = document.getElementById('existing-image-url');
    const singlePriceInput = document.getElementById('product-price');
    if (!productModal || !productIdInput || !productNameInput || !productDescInput || !productCategorySelect || !productImageFileInput || !modalTitle || !preview || !existingImageUrlInput || !singlePriceInput || !optionsContainer || !priceTypeToggle) {
        console.error("Elementos do modal não encontrados!"); return;
    }

    // Preenche campos básicos
    productIdInput.value = id || '';
    productNameInput.value = product?.name || '';
    productDescInput.value = product?.description || '';
    productCategorySelect.value = product?.categoryId || '';
    productImageFileInput.value = ''; // Limpa input file
    modalTitle.textContent = id ? 'Editar Produto' : 'Adicionar Novo Produto';

    // Imagem preview
    if (product?.imageUrl) {
        preview.src = product.imageUrl; preview.classList.remove('hidden'); existingImageUrlInput.value = product.imageUrl;
    } else {
        preview.src = ''; preview.classList.add('hidden'); existingImageUrlInput.value = '';
    }

    // Limpa campos de preço/opções
    singlePriceInput.value = '';
    optionsContainer.innerHTML = ''; // Limpa linhas de opções anteriores

    // Verifica estrutura de preço do produto (novo 'options' vs 'price' antigo)
    const hasValidOptionsArray = product?.options && Array.isArray(product.options) && product.options.length > 0;
    const isUsingMultipleOptions = hasValidOptionsArray && product.options.length > 1;
    const isUsingSingleOptionInArray = hasValidOptionsArray && product.options.length === 1;
    const isUsingLegacyPrice = !hasValidOptionsArray && typeof product?.price === 'number';

    // Define estado inicial do switch
    priceTypeToggle.checked = isUsingMultipleOptions;
    // Atualiza visibilidade das seções ANTES de preencher
    updatePriceSections(isUsingMultipleOptions);

    // Preenche os campos de preço/opções
    if (isUsingMultipleOptions) {
        product.options.forEach(option => addOption(option)); // Preenche múltiplas opções
    } else if (isUsingSingleOptionInArray) {
        // Se só tem UMA opção no array, usa como preço único
        const price = product.options[0].price;
        singlePriceInput.value = (typeof price === 'number' && !isNaN(price)) ? price.toFixed(2) : '';
        addOption(); // Adiciona linha oculta para consistência
    } else if (isUsingLegacyPrice) {
         // Se tem o campo 'price' antigo, usa como preço único
         singlePriceInput.value = product.price.toFixed(2);
         addOption(); // Adiciona linha oculta
    } else { // Novo produto ou produto sem preço definido
        addOption(); // Adiciona linha oculta
    }

    // Mostra o modal
    productModal.classList.remove('hidden');
    productModal.classList.add('flex');
};

const closeModal = () => {
     if (!productModal) return;
    productModal.classList.add('hidden');
    productModal.classList.remove('flex');
    // Limpa campos do formulário
    const fieldsToClear = ['product-id', 'product-name', 'product-desc', 'product-category', 'product-image-file', 'existing-image-url', 'product-price'];
    fieldsToClear.forEach(id => {
        const element = document.getElementById(id); if (element) element.value = '';
    });
    // Limpa preview
    const preview = document.getElementById('image-preview');
    if (preview) { preview.src = ''; preview.classList.add('hidden'); }
    // Limpa opções e reseta switch
    if (optionsContainer) optionsContainer.innerHTML = '';
    if (priceTypeToggle) { priceTypeToggle.checked = false; updatePriceSections(false); }
};

document.getElementById('add-product-btn')?.addEventListener('click', () => openModal());
document.getElementById('cancel-modal-btn')?.addEventListener('click', closeModal);

// Listener para salvar o produto (Mantido da versão anterior, já lida com o switch)
document.getElementById('save-product-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('product-id')?.value;
    const imageFile = document.getElementById('product-image-file')?.files[0];
    let imageUrl = document.getElementById('existing-image-url')?.value || '';
    const productName = document.getElementById('product-name')?.value.trim();
    const categoryId = document.getElementById('product-category')?.value;
    const isMultipleOptions = priceTypeToggle?.checked;
    const button = document.getElementById('save-product-btn');

    if(!productName || !categoryId || button === null || priceTypeToggle === null) {
         alert("Erro: Elementos essenciais do formulário não encontrados."); return;
     }

    let options = [];

    // Validações e Coleta de Preços (igual à versão anterior)
    if (isMultipleOptions) { /* ... coleta múltiplas ... */ }
    else { /* ... coleta preço único e formata como array[1] ... */ }
     if (isMultipleOptions) {
        const optionRows = document.querySelectorAll('#multiple-options-section .option-row');
        if (optionRows.length === 0) return alert("Adicione pelo menos uma opção.");
        for (const row of optionRows) {
            const nameInput = row.querySelector('input[name="optionName[]"]');
            const priceInput = row.querySelector('input[name="optionPrice[]"]');
            if (!nameInput || !priceInput) continue;
            const name = nameInput.value.trim(); const price = parseFloat(priceInput.value);
            if (!name) return alert("O nome de todas as opções é obrigatório.");
            if (isNaN(price) || price < 0) return alert(`Preço inválido para "${name}".`);
            options.push({ name, price });
        }
        if (options.length === 0) return alert("Adicione opções válidas.");
    } else {
        const singlePriceInput = document.getElementById('product-price');
        if (!singlePriceInput) return alert("Campo de preço não encontrado.");
        const singlePrice = parseFloat(singlePriceInput.value);
        if (isNaN(singlePrice) || singlePrice < 0) return alert("Preço único inválido.");
        options.push({ name: "Padrão", price: singlePrice });
    }

    // Monta o objeto de dados (remove o campo 'price' antigo)
    const data = {
        name: productName,
        description: document.getElementById('product-desc')?.value.trim() ?? '',
        categoryId: categoryId,
        options: options, // Sempre salva o array 'options'
        imageUrl: ''
        // price: delete // Remove o campo price antigo se existir ao salvar
    };


    button.disabled = true; button.textContent = "A guardar...";
    try {
        // Upload da imagem (igual)
        if (imageFile) { /* ... */ }
        data.imageUrl = imageUrl || 'https://placehold.co/400x300/cccccc/ffffff?text=Sem+Foto';

        // Salva no Firestore (remove o campo 'price' se for update)
        button.textContent = "A guardar produto...";
        if (id) {
            // Ao atualizar, remove explicitamente o campo 'price' antigo, se existir
            // Importar { deleteField } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
            // await updateDoc(doc(db, "products", id), { ...data, price: deleteField() });
             await updateDoc(doc(db, "products", id), data); // Simplesmente sobrescreve sem o price
        } else {
            await addDoc(productsRef, data); // Adiciona novo, já sem o price
        }
        closeModal();
    } catch (error) {
        console.error("Erro ao guardar:", error); alert(`Erro: ${error.message}`);
    } finally {
        if(button) { button.disabled = false; button.textContent = "Guardar"; }
    }
});

// Listener para editar/remover produto (igual)
document.getElementById('product-list')?.addEventListener('click', async (e) => {
    const target = e.target; const id = target.dataset.id; if (!id) return;
    const productRef = doc(db, "products", id);
    if (target.classList.contains('edit-btn')) {
         try {
            const docSnap = await getDoc(productRef);
             if (docSnap.exists()) { openModal(docSnap.data(), id); }
             else { alert("Produto não encontrado."); renderProductList(); }
         } catch(error) { console.error("Erro ao buscar para editar:", error); alert("Erro ao carregar produto."); }
    } else if (target.classList.contains('delete-btn')) {
        const productName = target.closest('.flex')?.querySelector('h4')?.textContent || 'este produto';
        if (confirm(`Remover "${productName}"?`)) {
            try { await deleteDoc(productRef); }
            catch (error) { console.error("Erro ao remover:", error); alert("Erro ao remover."); }
        }
    }
});
// --- FIM MODAL ---

// --- INICIA A APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', initialize);