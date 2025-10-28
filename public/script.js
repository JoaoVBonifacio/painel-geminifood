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
    // Garante que o preço seja formatado corretamente, mesmo que venha como string
    const priceNumber = parseFloat(option.price);
    const priceValue = (typeof priceNumber === 'number' && !isNaN(priceNumber)) ? priceNumber.toFixed(2) : '';

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
    // Permite remover mesmo que seja a última linha
    button.closest('.option-row')?.remove();
    // Se era a última, adiciona uma nova vazia se estiver no modo de múltiplas opções
    if (optionsContainer.children.length === 0 && priceTypeToggle?.checked) {
        addOption();
    }
}
// --- FIM OPÇÕES ---

// --- LÓGICA DO SWITCH DE PREÇO ---
function updatePriceSections(isMultiple) {
    if (!priceTypeLabel || !singlePriceSection || !multipleOptionsSection) return;

    if (isMultiple) {
        priceTypeLabel.textContent = "Múltiplas Opções";
        singlePriceSection.classList.add('hidden');
        multipleOptionsSection.classList.remove('hidden');
        // Garante que haja pelo menos uma linha de opção ao mudar para múltiplo
        if (optionsContainer && optionsContainer.children.length === 0) {
            addOption();
        }
    } else {
        priceTypeLabel.textContent = "Preço Único";
        singlePriceSection.classList.remove('hidden');
        multipleOptionsSection.classList.add('hidden');
    }
}

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
        // Garante que cloudinaryConfig tenha as propriedades esperadas
        cloudinaryConfig = {
            cloudName: config.cloudinary?.cloudName || '',
            uploadPreset: config.cloudinary?.uploadPreset || ''
        };
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
                        alert('Acesso negado.');
                        await signOut(auth);
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
                    console.error("Erro login:", error.code, error.message); // Log completo
                    authError.textContent = friendlyMessage;
                    authError.classList.remove('hidden');
                });
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));

    } catch (error) {
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
            // Garante que minimumOrder seja exibido com duas casas decimais
            const minOrder = (typeof settings.minimumOrder === 'number' && !isNaN(settings.minimumOrder)) ? settings.minimumOrder.toFixed(2) : '0.00';
            setInputValue('minimum-order', minOrder, '0.00');
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
        await checkAndUpdateStoreStatus();
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
        const minOrderInput = document.getElementById('minimum-order');
        let minOrderValue = 0;
        if (minOrderInput) {
            minOrderValue = parseFloat(minOrderInput.value) || 0;
        }

        const data = {
            whatsappNumber: document.getElementById('whatsapp-number')?.value.trim() ?? '',
            whatsappMessage: document.getElementById('whatsapp-message')?.value.trim() ?? '',
            minimumOrder: minOrderValue < 0 ? 0 : minOrderValue, // Garante que não seja negativo
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
        if (!settingsSnap.exists()) {
             console.warn("Documento de settings não existe para verificar status.");
             return;
        }
        const settings = settingsSnap.data();
        const storeClosedToggle = document.getElementById('store-closed-toggle');
        if (!storeClosedToggle) return;

        if (!settings.scheduleEnabled) {
             console.log("Horário auto desligado.");
             // Apenas garante que o toggle reflita o estado salvo
             storeClosedToggle.checked = settings.isStoreClosed ?? false;
             return;
        }

        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
        const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
        let isOpenBasedOnSchedule = false;

        let openTime = '';
        let closeTime = '';

        if (dayOfWeek === 1) { // Segunda-feira
            isOpenBasedOnSchedule = false; // Fechado
        } else if (dayOfWeek === 0 || dayOfWeek === 6) { // Fim de semana (Domingo ou Sábado)
            openTime = settings.weekendOpen;
            closeTime = settings.weekendClose;
        } else { // Dias de semana (Terça a Sexta)
            openTime = settings.weekdayOpen;
            closeTime = settings.weekdayClose;
        }

        // Verifica apenas se não for Segunda
        if (dayOfWeek !== 1 && openTime && closeTime) {
            // Lógica de travessia da meia-noite (ex: abre às 20:00 fecha às 02:00)
            if (openTime > closeTime) {
                if (currentTime >= openTime || currentTime < closeTime) {
                    isOpenBasedOnSchedule = true;
                }
            } else { // Horário normal (ex: abre às 10:00 fecha às 23:00)
                if (currentTime >= openTime && currentTime < closeTime) {
                    isOpenBasedOnSchedule = true;
                }
            }
        }

        const shouldBeClosed = !isOpenBasedOnSchedule;

        // Atualiza no Firestore e no toggle APENAS se o estado calculado for diferente do estado atual
        if (settings.isStoreClosed !== shouldBeClosed) {
            console.log(`Atualizando status auto para: ${shouldBeClosed ? 'Fechada' : 'Aberta'}`);
            await updateDoc(settingsRef, { isStoreClosed: shouldBeClosed });
            storeClosedToggle.checked = shouldBeClosed;
        } else {
             console.log(`Status auto: ${settings.isStoreClosed ? 'Fechada' : 'Aberta'} (correto).`);
             // Garante que o toggle está sincronizado mesmo se não houver mudança
             storeClosedToggle.checked = settings.isStoreClosed;
        }
    } catch (error) {
        console.error("Erro ao verificar/atualizar status:", error);
    }
}

document.getElementById('store-closed-toggle')?.addEventListener('change', async (e) => {
    // Quando o toggle manual é alterado, sempre salva esse estado
    const isChecked = e.target.checked;
    console.log(`Toggle manual alterado para: ${isChecked ? 'Fechada' : 'Aberta'}. Salvando...`);
    try {
        await updateDoc(settingsRef, { isStoreClosed: isChecked });
        // Opcional: Desligar o 'scheduleEnabled' se o utilizador fechar manualmente?
        // Se quiser isso, adicione:
        // if (isChecked && document.getElementById('schedule-enabled-toggle')?.checked) {
        //     await updateDoc(settingsRef, { scheduleEnabled: false });
        //     document.getElementById('schedule-enabled-toggle').checked = false;
        //     console.log("Horário automático desligado devido a fecho manual.");
        // }
    } catch (error) {
        console.error("Erro ao atualizar status manual:", error);
        alert("Erro ao salvar estado manual.");
        // Reverte visualmente o toggle em caso de erro
        e.target.checked = !isChecked;
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
        renderProductList(); // Re-renderiza produtos quando categorias mudam
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
     if (!preview || !existingUrlInput || !e.target) return;
     if (file) {
         const reader = new FileReader();
         reader.onload = (event) => {
              if(event.target?.result) {
                 preview.src = event.target.result.toString();
                 preview.classList.remove('hidden');
              }
            }
         reader.readAsDataURL(file);
         existingUrlInput.value = ''; // Limpa url antiga se novo ficheiro for selecionado
     } else {
         // Se nenhum ficheiro for selecionado (ex: cancelado), tenta manter a imagem existente se houver
         const existingUrl = existingUrlInput.value;
         if (existingUrl) {
             preview.src = existingUrl;
             preview.classList.remove('hidden');
         } else {
              preview.src = '';
              preview.classList.add('hidden');
         }
     }
});

function listenToProducts() {
     // Ordena os produtos por nome dentro da query
     const q = query(productsRef, orderBy("name"));
    onSnapshot(q, snapshot => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProductList(); // Re-renderiza a lista sempre que os produtos mudam
    }, error => { console.error("Erro ao ouvir produtos:", error); alert("Erro ao carregar produtos."); });
}

function getPriceDisplay(options, legacyPrice) {
    if (options && Array.isArray(options) && options.length > 0) {
        const validPrices = options
            .map(opt => typeof opt.price === 'number' && !isNaN(opt.price) ? opt.price : null)
            .filter(price => price !== null);

        if (validPrices.length === 0) return 'Preço Inválido';

        if (validPrices.length === 1) {
            return `${validPrices[0].toFixed(2)} €`;
        }

        const minPrice = Math.min(...validPrices);
        const maxPrice = Math.max(...validPrices);
        return (minPrice === maxPrice) ? `${minPrice.toFixed(2)} €` : `a partir de ${minPrice.toFixed(2)} €`; // Ajustado para "a partir de"
    }
    // Fallback para o campo 'price' antigo
    if (typeof legacyPrice === 'number' && !isNaN(legacyPrice)) {
        return `${legacyPrice.toFixed(2)} €`;
    }
    return 'Preço Indef.';
}

function renderProductList() {
    const productListContainer = document.getElementById('product-list');
    if (!productListContainer) return;
    productListContainer.innerHTML = ''; // Limpa a lista existente

    // Agrupa produtos por categoria
    const productsByCategory = allCategories.reduce((acc, category) => {
        // Filtra os produtos para esta categoria E ordena-os por nome
        acc[category.id] = allProducts
            .filter(p => p.categoryId === category.id)
            .sort((a,b) => a.name.localeCompare(b.name)); // Ordena aqui
        return acc;
    }, {});

    // Ordena as categorias por nome antes de renderizar
    allCategories.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
        const productsInCategory = productsByCategory[cat.id] || [];

        if (productsInCategory.length > 0) {
            let categorySectionHTML = `<div class="mb-6"><h3 class="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">${cat.name}</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;

            productsInCategory.forEach(product => {
                const priceText = getPriceDisplay(product.options, product.price); // Usa a função atualizada
                const imageUrl = product.imageUrl || 'https://placehold.co/100x100/cccccc/ffffff?text=Sem+Foto';
                // HTML do card do produto
                categorySectionHTML += `
                    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-start">
                        <img src="${imageUrl}" alt="${product.name}" class="w-20 h-20 rounded-md object-cover mr-4 flex-shrink-0">
                        <div class="flex-grow min-w-0"> {/* Adicionado min-w-0 para truncar corretamente */}
                            <h4 class="font-semibold text-gray-800 dark:text-gray-100 truncate">${product.name}</h4> {/* truncate para nomes longos */}
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words">${product.description || 'Sem descrição'}</p> {/* break-words para descrições longas */}
                            <p class="text-sm text-gray-500 dark:text-gray-300 mt-1 font-medium">${priceText}</p>
                        </div>
                        <div class="flex flex-col items-end justify-start space-y-1 flex-shrink-0 ml-2"> {/* ml-2 para espaço */}
                             <button class="edit-btn text-xs text-blue-500 hover:text-blue-400" data-id="${product.id}">Editar</button>
                             <button class="delete-btn text-xs text-red-500 hover:text-red-400" data-id="${product.id}">Remover</button>
                         </div>
                    </div>`;
            });

            categorySectionHTML += `</div></div>`;
            productListContainer.innerHTML += categorySectionHTML; // Adiciona a seção da categoria ao container
        }
    });

     if (productListContainer.innerHTML === '') {
        productListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Nenhum produto cadastrado.</p>';
    }
}
// --- FIM LÓGICA DE PRODUTOS ---

// --- LÓGICA DO MODAL DE PRODUTO ---
const openModal = (product = null, id = null) => {
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productDescInput = document.getElementById('product-desc');
    const productCategorySelect = document.getElementById('product-category');
    const productImageFileInput = document.getElementById('product-image-file');
    const modalTitle = document.getElementById('modal-title');
    const preview = document.getElementById('image-preview');
    const existingImageUrlInput = document.getElementById('existing-image-url');
    const singlePriceInput = document.getElementById('product-price');

    // Validações essenciais
    if (!productModal || !productIdInput || !productNameInput || !productDescInput || !productCategorySelect || !productImageFileInput || !modalTitle || !preview || !existingImageUrlInput || !singlePriceInput || !optionsContainer || !priceTypeToggle) {
        console.error("Elementos do modal não encontrados!"); return;
    }

    // Reset geral
    productIdInput.value = id || '';
    productNameInput.value = product?.name || '';
    productDescInput.value = product?.description || '';
    productCategorySelect.value = product?.categoryId || '';
    productImageFileInput.value = ''; // Limpa input file sempre
    modalTitle.textContent = id ? 'Editar Produto' : 'Adicionar Novo Produto';
    singlePriceInput.value = '';
    optionsContainer.innerHTML = '';
    preview.src = '';
    preview.classList.add('hidden');
    existingImageUrlInput.value = '';

    // Lida com a imagem existente
    if (product?.imageUrl && product.imageUrl !== 'https://placehold.co/400x300/cccccc/ffffff?text=Sem+Foto') {
        preview.src = product.imageUrl;
        preview.classList.remove('hidden');
        existingImageUrlInput.value = product.imageUrl;
    }

    // Lógica para preencher preços/opções baseado na estrutura do 'product'
    const hasValidOptions = product?.options && Array.isArray(product.options) && product.options.length > 0;
    const hasLegacyPrice = typeof product?.price === 'number' && !isNaN(product.price);

    let useMultipleOptions = false;

    if (hasValidOptions) {
        // Se tem 'options', usa-as
        if (product.options.length > 1) {
            useMultipleOptions = true;
            product.options.forEach(option => addOption(option)); // Preenche múltiplas
        } else {
            // Se tem apenas uma opção, preenche o preço único
            const price = product.options[0].price;
            singlePriceInput.value = (typeof price === 'number' && !isNaN(price)) ? price.toFixed(2) : '';
        }
    } else if (hasLegacyPrice) {
        // Se não tem 'options' mas tem 'price' antigo, usa-o
        singlePriceInput.value = product.price.toFixed(2);
    } else {
        // Produto novo ou sem preço/opções -> Deixa campos vazios
    }

    // Define o estado do switch e atualiza a visibilidade das seções
    priceTypeToggle.checked = useMultipleOptions;
    updatePriceSections(useMultipleOptions);

    // Garante que há pelo menos uma linha em branco se estiver em modo múltiplo e não foi preenchido
    if (useMultipleOptions && optionsContainer.children.length === 0) {
        addOption();
    }
     // Garante que a linha oculta exista para o caso de preço único (para facilitar a coleta depois)
     if (!useMultipleOptions && optionsContainer.children.length === 0) {
       addOption(); // Adiciona linha oculta que não será usada se o switch estiver desligado
    }


    productModal.classList.remove('hidden');
    productModal.classList.add('flex');
};

const closeModal = () => {
     if (!productModal) return;
    productModal.classList.add('hidden');
    productModal.classList.remove('flex');

    // Limpeza mais robusta, incluindo reset do switch
    const fieldsToClear = ['product-id', 'product-name', 'product-desc', 'product-category', 'product-image-file', 'existing-image-url', 'product-price'];
    fieldsToClear.forEach(id => {
        const element = document.getElementById(id);
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
             element.value = '';
        }
    });

    const preview = document.getElementById('image-preview');
    if (preview instanceof HTMLImageElement) {
         preview.src = '';
         preview.classList.add('hidden');
    }
    if (optionsContainer) optionsContainer.innerHTML = '';
    if (priceTypeToggle instanceof HTMLInputElement) {
        priceTypeToggle.checked = false; // Reseta o switch para preço único
        updatePriceSections(false); // Atualiza a visibilidade
    }
};

document.getElementById('add-product-btn')?.addEventListener('click', () => openModal());
document.getElementById('cancel-modal-btn')?.addEventListener('click', closeModal);

document.getElementById('save-product-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('product-id')?.value;
    const imageFile = document.getElementById('product-image-file')?.files[0];
    let imageUrl = document.getElementById('existing-image-url')?.value || ''; // Mantém a URL existente se não houver novo ficheiro
    const productName = document.getElementById('product-name')?.value.trim();
    const categoryId = document.getElementById('product-category')?.value;
    const isMultipleOptions = priceTypeToggle?.checked;
    const button = document.getElementById('save-product-btn');

    // Validações básicas
    if(!productName || !categoryId) {
         alert("Nome do produto e categoria são obrigatórios."); return;
     }
     if(!button || priceTypeToggle === null) {
          alert("Erro: Elementos essenciais do formulário não encontrados."); return;
      }

    let options = [];

    // Coleta e validação de opções/preço
    if (isMultipleOptions) {
        const optionRows = optionsContainer?.querySelectorAll('.option-row');
        if (!optionRows || optionRows.length === 0) return alert("Adicione pelo menos uma opção para o modo de múltiplas opções.");

        for (const row of optionRows) {
            const nameInput = row.querySelector('input[name="optionName[]"]');
            const priceInput = row.querySelector('input[name="optionPrice[]"]');
            if (!(nameInput instanceof HTMLInputElement) || !(priceInput instanceof HTMLInputElement)) continue;

            const name = nameInput.value.trim();
            const price = parseFloat(priceInput.value);

            if (!name) return alert("O nome de todas as opções é obrigatório.");
            if (isNaN(price) || price < 0) return alert(`Preço inválido para a opção "${name}". O preço deve ser um número igual ou maior que zero.`);
            options.push({ name, price });
        }
        if (options.length === 0) return alert("Nenhuma opção válida foi adicionada.");

    } else { // Coleta preço único
        const singlePriceInput = document.getElementById('product-price');
        if (!(singlePriceInput instanceof HTMLInputElement)) return alert("Campo de preço único não encontrado.");
        const singlePrice = parseFloat(singlePriceInput.value);
        if (isNaN(singlePrice) || singlePrice < 0) return alert("Preço único inválido. O preço deve ser um número igual ou maior que zero.");
        // Salva como array de uma única opção para consistência
        options.push({ name: "Padrão", price: singlePrice });
    }

    // Desativa o botão
    button.disabled = true; button.textContent = "A guardar...";

    try {
        // --- Upload da Imagem para Cloudinary (Lógica do Código Antigo) ---
        if (imageFile) {
            button.textContent = "A carregar imagem...";
            if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
                throw new Error('Configuração do Cloudinary (cloudName ou uploadPreset) não encontrada.');
            }

            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('upload_preset', cloudinaryConfig.uploadPreset);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                 const errorResult = await response.json().catch(() => ({ message: 'Erro desconhecido no upload.' }));
                 console.error("Erro Cloudinary:", errorResult);
                 throw new Error(`Falha no upload para o Cloudinary: ${errorResult.error?.message || response.statusText}`);
            }

            const result = await response.json();
            imageUrl = result.secure_url; // Atualiza imageUrl com a nova URL
            document.getElementById('existing-image-url').value = imageUrl; // Atualiza campo hidden
             console.log("Upload bem sucedido:", imageUrl);

        }
        // --- Fim Upload Cloudinary ---

         // Se não houve upload e não havia imagem existente, usa placeholder
        if (!imageUrl) {
            imageUrl = 'https://placehold.co/400x300/cccccc/ffffff?text=Sem+Foto';
        }


        // Monta o objeto final para o Firestore
        const dataToSave = {
            name: productName,
            description: document.getElementById('product-desc')?.value.trim() ?? '',
            categoryId: categoryId,
            options: options, // Sempre salva o array 'options'
            imageUrl: imageUrl // Usa a URL nova ou a existente ou o placeholder
            // O campo 'price' antigo não é incluído aqui
        };

        // Salva no Firestore
        button.textContent = "A guardar produto...";
        if (id) {
             console.log("Atualizando produto:", id, dataToSave);
            // Ao atualizar, apenas enviamos os novos dados. O Firestore sobrescreve/mescla.
            // O campo 'price' antigo não será enviado, efetivamente removendo-o se existia.
            await updateDoc(doc(db, "products", id), dataToSave);
        } else {
             console.log("Adicionando novo produto:", dataToSave);
            await addDoc(productsRef, dataToSave);
        }
        closeModal(); // Fecha o modal após sucesso

    } catch (error) {
        console.error("Erro ao guardar produto:", error);
        alert(`Erro ao guardar: ${error.message}`);
    } finally {
        // Reativa o botão independentemente de sucesso ou falha
        if(button) {
             button.disabled = false;
             button.textContent = "Guardar";
        }
        // Limpa o input de ficheiro para permitir selecionar o mesmo ficheiro novamente se necessário
         const fileInput = document.getElementById('product-image-file');
         if (fileInput instanceof HTMLInputElement) fileInput.value = '';
    }
});

document.getElementById('product-list')?.addEventListener('click', async (e) => {
    const target = e.target;
    // Verifica se o target é um botão ou está dentro de um botão com data-id
    const button = target.closest('button[data-id]');
    if (!button) return; // Sai se não clicou num botão com data-id

    const id = button.dataset.id;
    if (!id) return;

    const productRef = doc(db, "products", id);

    if (button.classList.contains('edit-btn')) {
         try {
            console.log("Tentando editar produto:", id);
            const docSnap = await getDoc(productRef);
             if (docSnap.exists()) {
                 openModal(docSnap.data(), id); // Passa os dados e o ID
             } else {
                 console.error("Produto não encontrado para editar:", id);
                 alert("Produto não encontrado.");
                 renderProductList(); // Atualiza a lista caso o produto tenha sido removido
             }
         } catch(error) {
             console.error("Erro ao buscar produto para editar:", error);
             alert("Erro ao carregar dados do produto para edição.");
         }
    } else if (button.classList.contains('delete-btn')) {
        // Encontra o nome do produto no elemento pai para confirmação
        const cardElement = button.closest('.flex.items-start'); // Encontra o card do produto
        const productName = cardElement?.querySelector('h4')?.textContent || 'este produto'; // Pega o nome do H4

        if (confirm(`Remover "${productName}"? Esta ação não pode ser desfeita.`)) {
            try {
                 console.log("Removendo produto:", id);
                 await deleteDoc(productRef);
                 // A lista será atualizada automaticamente pelo listener onSnapshot
            } catch (error) {
                 console.error("Erro ao remover produto:", error);
                 alert("Erro ao remover o produto.");
            }
        }
    }
});
// --- FIM MODAL ---

// --- INICIA A APLICAÇÃO ---
// Garante que o DOM está carregado antes de inicializar
document.addEventListener('DOMContentLoaded', initialize);