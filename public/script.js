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

function applyTheme(isDark) {
    if (isDark) {
        document.documentElement.classList.add('dark');
        lightIcon.classList.add('hidden');
        darkIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        lightIcon.classList.remove('hidden');
        darkIcon.classList.add('hidden');
    }
}

// Verifica tema salvo ou preferência do sistema
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    applyTheme(true);
} else {
    applyTheme(false);
}
// Listener para o botão de tema
themeToggleButton.addEventListener('click', () => {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    applyTheme(isDarkMode);
});

// --- FUNÇÕES PARA OPÇÕES DE PRODUTO ---
// Cria o HTML para uma linha de opção
function createOptionRowHTML(option = { name: '', price: '' }) {
    const priceValue = (typeof option.price === 'number' && !isNaN(option.price)) ? option.price.toFixed(2) : '';
    return `
        <div class="option-row">
            <input type="text" name="optionName[]" placeholder="Nome da Opção (ex: Pequena)" class="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${option.name || ''}" required>
            <input type="number" name="optionPrice[]" placeholder="Preço (€)" step="0.01" class="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${priceValue}" required>
            <button type="button" onclick="removeOption(this)" class="text-red-500 hover:text-red-400 font-bold p-1">X</button>
        </div>
    `;
}

// Adiciona uma nova linha de opção ao container
window.addOption = function(option) {
    const container = document.getElementById('product-options-container');
    const newRow = document.createElement('div');
    newRow.innerHTML = createOptionRowHTML(option); // Cria HTML com dados (se houver)
    container.appendChild(newRow.firstElementChild); // Adiciona o div interno .option-row
}

// Remove a linha de opção (garante que pelo menos uma permaneça)
window.removeOption = function(button) {
    const container = document.getElementById('product-options-container');
    if (container.children.length > 1) {
        button.closest('.option-row').remove(); // Remove o elemento pai .option-row
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

// Atualiza a visibilidade das seções de preço
function updatePriceSections(isMultiple) {
    if (isMultiple) {
        priceTypeLabel.textContent = "Múltiplas Opções";
        singlePriceSection.style.display = 'none'; // Usa style.display
        multipleOptionsSection.style.display = 'block'; // Usa style.display
        // Garante que haja pelo menos uma linha de opção
        if (document.getElementById('product-options-container').children.length === 0) {
            addOption();
        }
    } else {
        priceTypeLabel.textContent = "Preço Único";
        singlePriceSection.style.display = 'block'; // Usa style.display
        multipleOptionsSection.style.display = 'none'; // Usa style.display
    }
}

// Listener para mudanças no switch
priceTypeToggle.addEventListener('change', (e) => {
    updatePriceSections(e.target.checked);
});
// --- FIM DA LÓGICA DO SWITCH ---


// --- FUNÇÕES DE INICIALIZAÇÃO E AUTENTICAÇÃO ---
// Busca configurações do backend
async function getAppConfig() {
    try {
        const response = await fetch('/api/config'); // Endpoint da Vercel
        if (!response.ok) {
            throw new Error(`Erro ao buscar config: ${response.statusText}`);
        }
        const config = await response.json();
        cloudinaryConfig = config.cloudinary; // Guarda config do Cloudinary
        return config.firebase; // Retorna config do Firebase
    } catch (error) {
        console.error("Falha ao buscar configuração:", error);
        alert("Erro crítico: Não foi possível carregar as configurações do servidor.");
        throw error; // Re-lança o erro para parar a inicialização
    }
}

// Inicializa Firebase e configura listeners
async function initialize() {
    try {
        const firebaseConfig = await getAppConfig();

        // Inicializa Firebase
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // Referências do Firestore
        settingsRef = doc(db, "settings", "main");
        productsRef = collection(db, "products");
        categoriesRef = collection(db, "categories");

        // Listener de autenticação
        onAuthStateChanged(auth, async (user) => {
            const loginScreen = document.getElementById('login-screen');
            const mainPanel = document.getElementById('main-panel');

            if (user) {
                // Verifica se o usuário é admin (opcional, mas recomendado)
                const adminDocRef = doc(db, 'admins', user.uid);
                const adminDocSnap = await getDoc(adminDocRef);

                if (adminDocSnap.exists()) { // Só permite acesso se for admin
                    loginScreen.classList.add('hidden');
                    mainPanel.classList.remove('hidden');
                    loadSettingsAndStartInterval(); // Carrega configs e inicia checagem de horário
                    listenToCategories(); // Começa a ouvir categorias
                    listenToProducts();   // Começa a ouvir produtos
                } else {
                    alert('Acesso negado. Você não tem permissão para aceder a este painel.');
                    signOut(auth); // Desloga se não for admin
                }
            } else {
                // Usuário não logado
                loginScreen.classList.remove('hidden');
                mainPanel.classList.add('hidden');
                clearInterval(storeStatusInterval); // Para a checagem de horário
            }
        });

        // Listener do botão de login
        document.getElementById('login-btn').addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const authError = document.getElementById('auth-error');
            authError.classList.add('hidden'); // Esconde erro anterior

            signInWithEmailAndPassword(auth, email, password)
                .catch(error => {
                    // Mostra erro de login
                    let friendlyMessage = "Ocorreu um erro ao tentar entrar.";
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

        // Listener do botão de logout
        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

    } catch (error) {
        // Erro crítico durante a inicialização (ex: falha ao buscar config)
        console.error("Erro Crítico na Inicialização:", error);
        document.body.innerHTML = `<div class="text-red-500 p-8 text-center"><h1>Erro Crítico na Inicialização</h1><p>${error.message}</p><p>Verifique a consola para mais detalhes.</p></div>`;
    }
}

// --- FUNÇÕES DE CONFIGURAÇÕES GERAIS E HORÁRIO ---
// Carrega as configurações e inicia o intervalo de verificação de status da loja
async function loadSettingsAndStartInterval() {
    await loadSettings(); // Carrega as configurações iniciais
    if (storeStatusInterval) clearInterval(storeStatusInterval); // Limpa intervalo anterior se existir
    // Verifica o status da loja a cada minuto
    storeStatusInterval = setInterval(checkAndUpdateStoreStatus, 60000);
}

// Carrega as configurações do Firestore e preenche os campos do formulário
async function loadSettings() {
    try {
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            // Preenche os campos com os valores do Firestore ou valores padrão
            document.getElementById('whatsapp-number').value = settings.whatsappNumber || '';
            document.getElementById('whatsapp-message').value = settings.whatsappMessage || '*Novo Pedido* 🍔\n\n*Cliente:* {cliente}\n*Itens:*\n{itens}\n\n*Morada:*\n{morada}\n*Pagamento:* {pagamento}\n*Total: {total}*';
            document.getElementById('minimum-order').value = settings.minimumOrder?.toFixed(2) || '5.00';
            document.getElementById('store-closed-toggle').checked = settings.isStoreClosed || false;
            document.getElementById('schedule-enabled-toggle').checked = settings.scheduleEnabled || false;
            document.getElementById('weekday-open').value = settings.weekdayOpen || '15:00';
            document.getElementById('weekday-close').value = settings.weekdayClose || '23:00';
            document.getElementById('weekend-open').value = settings.weekendOpen || '10:00';
            document.getElementById('weekend-close').value = settings.weekendClose || '23:00';
        } else {
            console.warn("Documento de configurações 'main' não encontrado. Usando valores padrão.");
            // Poderia definir valores padrão aqui se necessário
             document.getElementById('whatsapp-message').value = '*Novo Pedido* 🍔\n\n*Cliente:* {cliente}\n*Itens:*\n{itens}\n\n*Morada:*\n{morada}\n*Pagamento:* {pagamento}\n*Total: {total}*';
             document.getElementById('minimum-order').value = '5.00';
             document.getElementById('weekday-open').value = '15:00';
             document.getElementById('weekday-close').value = '23:00';
             document.getElementById('weekend-open').value = '10:00';
             document.getElementById('weekend-close').value = '23:00';
        }
        await checkAndUpdateStoreStatus(); // Verifica o status da loja após carregar
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        alert("Não foi possível carregar as configurações.");
    }
}

// Salva as configurações gerais no Firestore
document.getElementById('save-settings-btn').addEventListener('click', async () => {
    const button = document.getElementById('save-settings-btn');
    button.disabled = true;
    button.textContent = "A guardar...";
    try {
        const data = {
            whatsappNumber: document.getElementById('whatsapp-number').value.trim(),
            whatsappMessage: document.getElementById('whatsapp-message').value.trim(),
            minimumOrder: parseFloat(document.getElementById('minimum-order').value) || 0,
            isStoreClosed: document.getElementById('store-closed-toggle').checked, // Salva o estado manual
            scheduleEnabled: document.getElementById('schedule-enabled-toggle').checked,
            weekdayOpen: document.getElementById('weekday-open').value,
            weekdayClose: document.getElementById('weekday-close').value,
            weekendOpen: document.getElementById('weekend-open').value,
            weekendClose: document.getElementById('weekend-close').value,
        };
        await setDoc(settingsRef, data, { merge: true }); // Usa setDoc com merge para criar/atualizar
        alert("Configurações guardadas!");
        await checkAndUpdateStoreStatus(); // Reavalia o status da loja
    } catch (error) {
        console.error("Erro ao guardar configurações:", error);
        alert("Erro ao guardar configurações.");
    } finally {
        button.disabled = false;
        button.textContent = "Guardar Configurações";
    }
});

// Verifica se a loja deve estar aberta/fechada com base no horário automático
async function checkAndUpdateStoreStatus() {
    console.log("Verificando status da loja...");
    try {
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists()) {
            console.warn("Documento de configurações não existe para verificar o status da loja.");
            return;
        }

        const settings = settingsSnap.data();
        // Se o horário automático não estiver ativo, não faz nada (respeita o toggle manual)
        if (!settings.scheduleEnabled) {
            console.log("Horário automático desligado. Status manual mantido.");
            // Garante que o toggle manual reflita o estado atual salvo
            document.getElementById('store-closed-toggle').checked = settings.isStoreClosed || false;
            return;
        }

        // Lógica de verificação do horário (igual à anterior)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
        const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
        let isOpenBasedOnSchedule = false;

        if (dayOfWeek === 1) { // Segunda-feira
            isOpenBasedOnSchedule = false;
        } else if (dayOfWeek === 0 || dayOfWeek === 6) { // Sábado ou Domingo
            if (settings.weekendOpen && settings.weekendClose && currentTime >= settings.weekendOpen && currentTime < settings.weekendClose) {
                isOpenBasedOnSchedule = true;
            }
        } else { // Terça a Sexta
            if (settings.weekdayOpen && settings.weekdayClose && currentTime >= settings.weekdayOpen && currentTime < settings.weekdayClose) {
                isOpenBasedOnSchedule = true;
            }
        }

        const shouldBeClosed = !isOpenBasedOnSchedule;

        // Atualiza o Firestore E o toggle manual APENAS SE o estado calculado for diferente do salvo
        // E o horário automático estiver ativo
        if (settings.scheduleEnabled && settings.isStoreClosed !== shouldBeClosed) {
            console.log(`Status automático: Deve estar ${shouldBeClosed ? 'Fechada' : 'Aberta'}. Atualizando Firestore...`);
            await updateDoc(settingsRef, { isStoreClosed: shouldBeClosed });
            document.getElementById('store-closed-toggle').checked = shouldBeClosed; // Atualiza o toggle visualmente
        } else if (settings.scheduleEnabled) {
            console.log(`Status automático: Loja ${settings.isStoreClosed ? 'Fechada' : 'Aberta'}. Estado correto.`);
            document.getElementById('store-closed-toggle').checked = settings.isStoreClosed; // Garante que o toggle está correto
        }
         // Se horário automático está desligado, o toggle manual já reflete settings.isStoreClosed (feito no início da função)

    } catch (error) {
        console.error("Erro ao verificar/atualizar status da loja:", error);
    }
}

// Atualiza o Firestore se o toggle manual for alterado (mesmo com horário automático ligado,
// a ação manual tem prioridade momentânea até a próxima verificação automática)
document.getElementById('store-closed-toggle').addEventListener('change', async (e) => {
    const isChecked = e.target.checked;
     console.log(`Toggle manual alterado para: ${isChecked ? 'Fechada' : 'Aberta'}. Atualizando Firestore...`);
    try {
        await updateDoc(settingsRef, { isStoreClosed: isChecked });
    } catch (error) {
        console.error("Erro ao atualizar status manual da loja:", error);
        alert("Erro ao atualizar o estado da loja.");
        // Reverte o toggle visualmente em caso de erro
        e.target.checked = !isChecked;
    }
});


// --- LÓGICA DE CATEGORIAS ---
// Ouve mudanças na coleção de categorias
function listenToCategories() {
    const q = query(categoriesRef, orderBy("name")); // Ordena categorias por nome
    onSnapshot(q, snapshot => {
        const categoryList = document.getElementById('category-list');
        const categorySelect = document.getElementById('product-category');
        categoryList.innerHTML = ''; // Limpa lista
        // Limpa select e adiciona opção padrão
        categorySelect.innerHTML = '<option value="">-- Selecione uma categoria --</option>';
        allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Atualiza array global

        allCategories.forEach(cat => {
            // Adiciona item à lista de gestão de categorias
            const item = document.createElement('div');
            item.className = "flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md";
            item.innerHTML = `
                <span class="text-gray-700 dark:text-gray-200">${cat.name}</span>
                <div class="space-x-2">
                    <button class="edit-cat-btn text-sm text-blue-500 hover:text-blue-400" data-id="${cat.id}" data-name="${cat.name}">Editar</button>
                    <button class="delete-cat-btn text-sm text-red-500 hover:text-red-400" data-id="${cat.id}">X</button>
                </div>`;
            categoryList.appendChild(item);

            // Adiciona opção ao select do modal de produto
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });
        renderProductList(); // Re-renderiza produtos após atualizar categorias
    }, error => {
        console.error("Erro ao ouvir categorias:", error);
        alert("Erro ao carregar categorias.");
    });
}

// Adiciona nova categoria
document.getElementById('add-category-btn').addEventListener('click', async () => {
    const input = document.getElementById('new-category-name');
    const name = input.value.trim();
    if (name) {
        try {
            await addDoc(categoriesRef, { name });
            input.value = ''; // Limpa input
        } catch (error) {
            console.error("Erro ao adicionar categoria:", error);
            alert("Erro ao adicionar categoria.");
        }
    } else {
        alert("Digite o nome da nova categoria.");
    }
});

// Delegação de eventos para editar/remover categoria
document.getElementById('category-list').addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return; // Sai se o clique não foi num botão com data-id

    const categoryDocRef = doc(db, 'categories', id);

    // Editar Categoria
    if (target.classList.contains('edit-cat-btn')) {
        const currentName = target.dataset.name;
        const newName = prompt("Novo nome para a categoria:", currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
            try {
                await updateDoc(categoryDocRef, { name: newName.trim() });
            } catch (error) {
                 console.error("Erro ao editar categoria:", error);
                 alert("Erro ao editar categoria.");
            }
        }
    }
    // Remover Categoria
    else if (target.classList.contains('delete-cat-btn')) {
        try {
            // Verifica se existem produtos nesta categoria
            const q = query(productsRef, where("categoryId", "==", id));
            const productsInCategory = await getDocs(q);
            if (!productsInCategory.empty) {
                alert("Não pode remover esta categoria pois existem produtos associados a ela.");
                return;
            }
            // Confirma e remove
            if (confirm(`Tem a certeza que quer remover a categoria "${target.previousElementSibling?.previousElementSibling?.textContent || id}"?`)) {
                await deleteDoc(categoryDocRef);
            }
        } catch (error) {
            console.error("Erro ao remover categoria:", error);
            alert("Erro ao remover categoria.");
        }
    }
});


// --- LÓGICA DE PRODUTOS ---

// Listener para preview da imagem
document.getElementById('product-image-file').addEventListener('change', e => {
    const file = e.target.files[0];
    const preview = document.getElementById('image-preview');
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            preview.src = event.target.result;
            preview.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
        document.getElementById('existing-image-url').value = ''; // Limpa URL antiga
    } else {
        const existingUrl = document.getElementById('existing-image-url').value;
        if (existingUrl) {
             preview.src = existingUrl;
             preview.classList.remove('hidden');
        } else {
            preview.src = '';
            preview.classList.add('hidden');
        }
    }
});

// Ouve mudanças na coleção de produtos
function listenToProducts() {
     const q = query(productsRef); // Pode adicionar orderBy aqui se quiser
    onSnapshot(q, snapshot => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProductList(); // Atualiza a lista na UI
    }, error => {
        console.error("Erro ao ouvir produtos:", error);
        alert("Erro ao carregar produtos.");
    });
}

// Formata o preço (individual ou faixa) para exibição na lista
function getPriceDisplay(options) {
    if (!options || !Array.isArray(options) || options.length === 0) return 'Preço Indefinido';

    // Se só tiver uma opção (ou for preço único salvo como uma opção)
    if (options.length === 1) {
         // Verifica se o preço é um número válido antes de formatar
        return (typeof options[0].price === 'number' && !isNaN(options[0].price))
            ? `${options[0].price.toFixed(2)} €`
            : 'Preço Inválido';
    }

    // Filtra apenas opções com preços válidos para calcular min/max
    const validPrices = options.map(opt => opt.price).filter(price => typeof price === 'number' && !isNaN(price));
    if (validPrices.length === 0) return 'Preços Inválidos';

    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);

    if (minPrice === maxPrice) return `${minPrice.toFixed(2)} €`;
    return `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} €`;
}

// Renderiza a lista de produtos agrupados por categoria
function renderProductList() {
    const productListContainer = document.getElementById('product-list');
    productListContainer.innerHTML = ''; // Limpa

    // Agrupa produtos por ID da categoria
    const productsByCategory = allCategories.reduce((acc, category) => {
        // Filtra produtos ANTES de agrupar
        acc[category.id] = allProducts.filter(p => p.categoryId === category.id && p.options && p.options.length > 0);
        return acc;
    }, {});

    // Ordena categorias e depois renderiza
    allCategories.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
        const productsInCategory = productsByCategory[cat.id] || [];
        // Ordena produtos dentro da categoria pelo nome
        productsInCategory.sort((a,b) => a.name.localeCompare(b.name));

        if (productsInCategory.length > 0) {
            let categorySection = `<div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">${cat.name}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;

            productsInCategory.forEach(product => {
                const priceText = getPriceDisplay(product.options); // Obtém o texto do preço
                const imageUrl = product.imageUrl || 'https://placehold.co/100x100/cccccc/ffffff?text=Sem+Foto';

                categorySection += `
                    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-start">
                        <img src="${imageUrl}" alt="${product.name}" class="w-20 h-20 rounded-md object-cover mr-4 flex-shrink-0">
                        <div class="flex-grow min-w-0"> {/* Adicionado min-w-0 para evitar overflow */}
                            <h4 class="font-semibold text-gray-800 dark:text-gray-100 truncate">${product.name}</h4>
                             <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words">${product.description || 'Sem descrição'}</p> {/* Descrição adicionada */}
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
        productListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Nenhum produto encontrado. Adicione produtos ou categorias.</p>';
    }
}

// --- LÓGICA DO MODAL DE PRODUTO ---

// Abre o modal para adicionar ou editar produto
const openModal = (product = null, id = null) => {
    document.getElementById('product-id').value = id || '';
    document.getElementById('product-name').value = product?.name || '';
    document.getElementById('product-desc').value = product?.description || '';
    document.getElementById('product-category').value = product?.categoryId || '';
    document.getElementById('product-image-file').value = ''; // Limpa input de ficheiro
    document.getElementById('modal-title').textContent = id ? 'Editar Produto' : 'Adicionar Novo Produto';

    const preview = document.getElementById('image-preview');
    const existingImageUrlInput = document.getElementById('existing-image-url');
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

    // Verifica se tem múltiplas opções válidas ou apenas uma
    const hasMultipleValidOptions = product?.options && Array.isArray(product.options) && product.options.length > 1;
    const hasSingleValidOption = product?.options && Array.isArray(product.options) && product.options.length === 1;

    priceTypeToggle.checked = hasMultipleValidOptions; // Marca o switch se tiver múltiplas
    updatePriceSections(hasMultipleValidOptions); // Mostra/esconde as seções

    if (hasMultipleValidOptions) {
        product.options.forEach(option => addOption(option)); // Preenche múltiplas opções
    } else if (hasSingleValidOption) {
        // Preenche preço único se só houver uma opção
         const price = product.options[0].price;
         singlePriceInput.value = (typeof price === 'number' && !isNaN(price)) ? price.toFixed(2) : '';
        // Adiciona uma linha em branco na seção oculta para consistência
        addOption();
    } else {
        // Novo produto: começa com preço único e adiciona linha oculta
        addOption();
    }

    // Mostra o modal
    document.getElementById('product-modal').classList.remove('hidden');
    document.getElementById('product-modal').classList.add('flex');
};

// Fecha o modal e limpa o formulário
const closeModal = () => {
    document.getElementById('product-modal').classList.add('hidden');
    document.getElementById('product-modal').classList.remove('flex');
    // Limpa todos os campos
    document.getElementById('product-id').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-desc').value = '';
    document.getElementById('product-category').value = '';
    document.getElementById('product-image-file').value = '';
    document.getElementById('image-preview').src = '';
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('existing-image-url').value = '';
    document.getElementById('product-options-container').innerHTML = '';
    document.getElementById('product-price').value = '';
     // Reseta o switch para preço único
    priceTypeToggle.checked = false;
    updatePriceSections(false);
};

// Listeners para abrir/fechar modal
document.getElementById('add-product-btn').addEventListener('click', () => openModal());
document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);

// Listener para salvar o produto
document.getElementById('save-product-btn').addEventListener('click', async () => {
    const id = document.getElementById('product-id').value;
    const imageFile = document.getElementById('product-image-file').files[0];
    let imageUrl = document.getElementById('existing-image-url').value || '';

    const productName = document.getElementById('product-name').value.trim();
    const categoryId = document.getElementById('product-category').value;
    const isMultipleOptions = priceTypeToggle.checked;

    let options = [];

    // --- Validações ---
    if (!productName) return alert("O nome do produto é obrigatório.");
    if (!categoryId) return alert("A categoria é obrigatória.");

    if (isMultipleOptions) {
        // Coleta múltiplas opções
        const optionRows = document.querySelectorAll('#multiple-options-section .option-row');
        if (optionRows.length === 0) return alert("Adicione pelo menos uma opção.");

        for (const row of optionRows) {
            const nameInput = row.querySelector('input[name="optionName[]"]');
            const priceInput = row.querySelector('input[name="optionPrice[]"]');
            const name = nameInput.value.trim();
            const price = parseFloat(priceInput.value);

            if (!name) return alert("O nome de todas as opções é obrigatório.");
            if (isNaN(price) || price < 0) return alert(`O preço da opção "${name}" deve ser um número válido maior ou igual a zero.`);

            options.push({ name, price });
        }
        if (options.length === 0) return alert("Adicione pelo menos uma opção válida."); // Double check

    } else {
        // Coleta preço único
        const singlePriceInput = document.getElementById('product-price');
        const singlePrice = parseFloat(singlePriceInput.value);

        if (isNaN(singlePrice) || singlePrice < 0) {
            return alert("O preço único deve ser um número válido maior ou igual a zero.");
        }
        // Salva como array de uma opção com nome padrão (ou pode ser nome do produto?)
        options.push({ name: "Padrão", price: singlePrice });
    }

    // --- Monta o objeto de dados ---
    const data = {
        name: productName,
        description: document.getElementById('product-desc').value.trim(),
        categoryId: categoryId,
        options: options, // Array com uma ou mais opções
        imageUrl: '' // Será definida abaixo
    };

    // --- Lógica de Upload e Save ---
    const button = document.getElementById('save-product-btn');
    button.disabled = true;
    button.textContent = "A guardar...";

    try {
        // Upload da imagem (se houver nova)
        if (imageFile) {
            button.textContent = "A carregar imagem...";
            if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
                throw new Error("Configuração do Cloudinary não carregada.");
            }
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('upload_preset', cloudinaryConfig.uploadPreset);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
                method: 'POST', body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Falha no upload Cloudinary: ${errorData.error?.message || response.statusText}`);
            }
            const result = await response.json();
            imageUrl = result.secure_url;
        }

        // Define a URL final
        data.imageUrl = imageUrl || 'https://placehold.co/400x300/cccccc/ffffff?text=Sem+Foto';

        // Salva no Firestore
        button.textContent = "A guardar produto...";
        if (id) { // Atualiza
            await updateDoc(doc(db, "products", id), data);
        } else { // Adiciona
            await addDoc(productsRef, data);
        }
        closeModal();

    } catch (error) {
        console.error("Erro ao guardar produto:", error);
        alert(`Erro ao guardar: ${error.message || 'Verifique a consola.'}`);
    } finally {
        button.disabled = false;
        button.textContent = "Guardar";
    }
});


// Listener para botões de editar/remover na lista de produtos
document.getElementById('product-list').addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return; // Ignora cliques fora dos botões com data-id

    const productRef = doc(db, "products", id);

    // Botão Editar
    if (target.classList.contains('edit-btn')) {
         try {
            const docSnap = await getDoc(productRef);
             if (docSnap.exists()) {
                openModal(docSnap.data(), id); // Abre modal com dados do produto
             } else {
                 alert("Produto não encontrado. Pode ter sido removido.");
                 renderProductList(); // Atualiza a lista caso o produto não exista mais
             }
         } catch(error) {
              console.error("Erro ao buscar produto para edição:", error);
              alert("Erro ao carregar dados do produto para edição.");
         }
    }
    // Botão Remover
    else if (target.classList.contains('delete-btn')) {
        const productName = target.closest('.flex')?.querySelector('h4')?.textContent || 'este produto'; // Tenta pegar o nome
        if (confirm(`Tem a certeza que quer remover "${productName}"?`)) {
            try {
                await deleteDoc(productRef);
                // A lista será atualizada automaticamente pelo listener `listenToProducts`
            } catch (error) {
                 console.error("Erro ao remover produto:", error);
                 alert("Erro ao remover produto.");
            }
        }
    }
});

// --- INICIA A APLICAÇÃO ---
initialize();