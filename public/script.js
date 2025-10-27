// --- LÓGICA DE TEMA (DARK MODE) ---
// (O código do tema permanece o mesmo, pode copiar do seu original se quiser)
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

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    applyTheme(true);
} else {
    applyTheme(false);
}
themeToggleButton.addEventListener('click', () => {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    applyTheme(isDarkMode);
});

// --- SDKs DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc, query, orderBy, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- VARIÁVEIS GLOBAIS ---
let cloudinaryConfig = {};
let storeStatusInterval;
let db; // Tornar db acessível globalmente neste script
let auth; // Tornar auth acessível
let settingsRef;
let productsRef;
let categoriesRef;
let allCategories = [];
let allProducts = [];

// --- FUNÇÕES PARA OPÇÕES DE PRODUTO ---
function createOptionRowHTML(option = { name: '', price: '' }) {
    return `
        <div class="option-row">
            <input type="text" name="optionName[]" placeholder="Nome da Opção (ex: 1/2 porção)" class="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${option.name}" required>
            <input type="number" name="optionPrice[]" placeholder="Preço (€)" step="0.01" class="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${option.price}" required>
            <button type="button" onclick="removeOption(this)" class="text-red-500 hover:text-red-400 font-bold p-1">X</button>
        </div>
    `;
}

// Torna as funções globais para serem acessíveis pelo onclick no HTML
window.addOption = function(option) {
    const container = document.getElementById('product-options-container');
    const newRow = document.createElement('div');
    newRow.innerHTML = createOptionRowHTML(option);
    container.appendChild(newRow.firstElementChild); // Adiciona o div interno, não o div wrapper
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


async function getAppConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `O servidor respondeu com o status: ${response.status}`);
        }
        const config = await response.json();
        cloudinaryConfig = config.cloudinary;
        return config.firebase;
    } catch (error) {
        console.error("Falha ao buscar configuração:", error);
        throw new Error("Não foi possível carregar as configurações do servidor.");
    }
}

async function initialize() {
    try {
        const firebaseConfig = await getAppConfig();

        const app = initializeApp(firebaseConfig);
        auth = getAuth(app); // Atribui à variável global
        db = getFirestore(app); // Atribui à variável global

        settingsRef = doc(db, "settings", "main");
        productsRef = collection(db, "products");
        categoriesRef = collection(db, "categories");

        onAuthStateChanged(auth, async (user) => {
            const loginScreen = document.getElementById('login-screen');
            const mainPanel = document.getElementById('main-panel');

            if (user) {
                const adminDocRef = doc(db, 'admins', user.uid);
                const adminDocSnap = await getDoc(adminDocRef);

                if (adminDocSnap.exists()) {
                    loginScreen.classList.add('hidden');
                    mainPanel.classList.remove('hidden');
                    loadSettingsAndStartInterval();
                    listenToCategories();
                    listenToProducts();
                } else {
                    alert('Acesso negado. Você não tem permissão para aceder a este painel.');
                    signOut(auth);
                }
            } else {
                loginScreen.classList.remove('hidden');
                mainPanel.classList.add('hidden');
                clearInterval(storeStatusInterval);
            }
        });

        document.getElementById('login-btn').addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const authError = document.getElementById('auth-error');
            authError.classList.add('hidden');

            signInWithEmailAndPassword(auth, email, password)
                .catch(error => {
                    let friendlyMessage = "Ocorreu um erro.";
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        friendlyMessage = "Email ou palavra-passe incorretos.";
                    }
                    authError.textContent = friendlyMessage;
                    authError.classList.remove('hidden');
                });
        });

        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

        async function loadSettingsAndStartInterval() {
            await loadSettings();
            if (storeStatusInterval) clearInterval(storeStatusInterval);
            storeStatusInterval = setInterval(checkAndUpdateStoreStatus, 60000);
        }

        async function loadSettings() {
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const settings = docSnap.data();
                document.getElementById('whatsapp-number').value = settings.whatsappNumber || '';
                document.getElementById('whatsapp-message').value = settings.whatsappMessage || '*Novo Pedido* 🍔\n\n*Cliente:* {cliente}\n*Itens:*\n{itens}\n\n*Morada:*\n{morada}\n*Pagamento:* {pagamento}\n*Total: {total}*';
                document.getElementById('minimum-order').value = settings.minimumOrder || 5.00;
                document.getElementById('store-closed-toggle').checked = settings.isStoreClosed || false;
                document.getElementById('schedule-enabled-toggle').checked = settings.scheduleEnabled || false;
                document.getElementById('weekday-open').value = settings.weekdayOpen || '15:00';
                document.getElementById('weekday-close').value = settings.weekdayClose || '23:00';
                document.getElementById('weekend-open').value = settings.weekendOpen || '10:00';
                document.getElementById('weekend-close').value = settings.weekendClose || '23:00';
            }
            await checkAndUpdateStoreStatus();
        }

        document.getElementById('save-settings-btn').addEventListener('click', async () => {
            const data = {
                whatsappNumber: document.getElementById('whatsapp-number').value,
                whatsappMessage: document.getElementById('whatsapp-message').value,
                minimumOrder: parseFloat(document.getElementById('minimum-order').value) || 0,
                isStoreClosed: document.getElementById('store-closed-toggle').checked,
                scheduleEnabled: document.getElementById('schedule-enabled-toggle').checked,
                weekdayOpen: document.getElementById('weekday-open').value,
                weekdayClose: document.getElementById('weekday-close').value,
                weekendOpen: document.getElementById('weekend-open').value,
                weekendClose: document.getElementById('weekend-close').value,
            };
            await setDoc(settingsRef, data, { merge: true });
            alert("Configurações guardadas!");
            await checkAndUpdateStoreStatus();
        });

        async function checkAndUpdateStoreStatus() {
            // (Esta função permanece igual, pode copiar do seu original)
            console.log("Verificando status da loja...");
            const settingsSnap = await getDoc(settingsRef);
            if (!settingsSnap.exists()) return;

            const settings = settingsSnap.data();
            if (!settings.scheduleEnabled) {
                console.log("Horário automático desligado. Status manual mantido.");
                return;
            }
            const now = new Date();
            const dayOfWeek = now.getDay();
            const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
            let isOpenBasedOnSchedule = false;
            if (dayOfWeek === 1) { isOpenBasedOnSchedule = false; }
            else if (dayOfWeek === 0 || dayOfWeek === 6) { if (currentTime >= settings.weekendOpen && currentTime < settings.weekendClose) { isOpenBasedOnSchedule = true; } }
            else { if (currentTime >= settings.weekdayOpen && currentTime < settings.weekdayClose) { isOpenBasedOnSchedule = true; } }
            const isCurrentlyClosed = !isOpenBasedOnSchedule;
            if (settings.isStoreClosed !== isCurrentlyClosed) {
                console.log(`Atualizando status da loja para: ${isCurrentlyClosed ? 'Fechada' : 'Aberta'}`);
                await updateDoc(settingsRef, { isStoreClosed: isCurrentlyClosed });
                document.getElementById('store-closed-toggle').checked = isCurrentlyClosed;
            } else {
                 console.log("Status da loja está correto. Nenhuma alteração necessária.");
            }
        }

        document.getElementById('store-closed-toggle').addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            updateDoc(settingsRef, { isStoreClosed: isChecked });
        });

        // --- LÓGICA DE CATEGORIAS (ligeira adaptação no renderProductList) ---
        function listenToCategories() {
            const q = query(categoriesRef, orderBy("name"));
            onSnapshot(q, snapshot => {
                const categoryList = document.getElementById('category-list');
                const categorySelect = document.getElementById('product-category');
                categoryList.innerHTML = '';
                categorySelect.innerHTML = '<option value="">-- Selecione uma categoria --</option>'; // Resetar select
                allCategories = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                allCategories.forEach(cat => {
                    // Preenche a lista de categorias para gerenciar
                    const item = document.createElement('div');
                    item.className = "flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md";
                    item.innerHTML = `<span class="text-gray-700 dark:text-gray-200">${cat.name}</span><div class="space-x-2"><button class="edit-cat-btn text-sm text-blue-500 hover:text-blue-400" data-id="${cat.id}" data-name="${cat.name}">Editar</button><button class="delete-cat-btn text-sm text-red-500 hover:text-red-400" data-id="${cat.id}">X</button></div>`;
                    categoryList.appendChild(item);
                    // Preenche o select no modal de produto
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.name;
                    categorySelect.appendChild(option);
                });
                renderProductList(); // Re-renderiza a lista de produtos quando as categorias mudam
            });
        }
        // ... (restante da lógica de categorias: add, edit, delete permanece igual) ...
        document.getElementById('add-category-btn').addEventListener('click', async () => {
            const input = document.getElementById('new-category-name');
            const name = input.value.trim();
            if (name) {
                await addDoc(categoriesRef, { name });
                input.value = '';
            }
        });

        document.getElementById('category-list').addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (!id) return;
            const categoryDocRef = doc(db, 'categories', id);
            if (e.target.classList.contains('edit-cat-btn')) {
                const newName = prompt("Novo nome para a categoria:", e.target.dataset.name);
                if (newName && newName.trim()) {
                    await updateDoc(categoryDocRef, { name: newName.trim() });
                }
            }
            if (e.target.classList.contains('delete-cat-btn')) {
                const q = query(productsRef, where("categoryId", "==", id));
                const productsInCategory = await getDocs(q);
                if (!productsInCategory.empty) {
                    alert("Não pode remover esta categoria pois existem produtos associados a ela.");
                    return;
                }
                if (confirm("Tem a certeza que quer remover esta categoria?")) {
                    await deleteDoc(categoryDocRef);
                }
            }
        });


        // --- LÓGICA DE PRODUTOS ---
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
                // Limpa a URL existente se uma nova imagem for selecionada
                document.getElementById('existing-image-url').value = '';
            } else {
                // Se não houver ficheiro novo, tenta mostrar a imagem existente (se houver)
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

        function listenToProducts() {
            // Ordena os produtos pelo nome dentro da sua categoria (se necessário)
             const q = query(productsRef, orderBy("name")); // Pode ordenar por nome aqui se quiser
            onSnapshot(q, snapshot => {
                allProducts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                renderProductList(); // Re-renderiza a lista
            });
        }

        // Função auxiliar para obter a string de preço (individual ou faixa)
        function getPriceDisplay(options) {
            if (!options || options.length === 0) return 'N/A';
            if (options.length === 1) return `${options[0].price.toFixed(2)} €`;
            
            const prices = options.map(opt => opt.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            
            if (minPrice === maxPrice) return `${minPrice.toFixed(2)} €`;
            return `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} €`;
        }

        // Renderiza a lista de produtos (MODIFICADA para mostrar faixa de preço)
        function renderProductList() {
            const productListContainer = document.getElementById('product-list');
            productListContainer.innerHTML = ''; // Limpa a lista existente

            // Agrupa produtos por categoria
            const productsByCategory = allCategories.reduce((acc, category) => {
                acc[category.id] = allProducts.filter(p => p.categoryId === category.id);
                return acc;
            }, {});

            // Ordena as categorias pelo nome antes de renderizar
            allCategories.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
                const productsInCategory = productsByCategory[cat.id] || [];

                if (productsInCategory.length > 0) {
                    // Cria a seção da categoria
                    let categorySection = `<div class="mb-6">
                        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">${cat.name}</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;

                    // Adiciona cada produto à seção
                    productsInCategory.forEach(product => {
                         // Usa a função getPriceDisplay para obter o texto do preço
                        const priceText = getPriceDisplay(product.options);

                        categorySection += `
                            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex">
                                <img src="${product.imageUrl || 'https://placehold.co/100x100/cccccc/ffffff?text=Sem+Foto'}" alt="${product.name}" class="w-20 h-20 rounded-md object-cover mr-4">
                                <div class="flex-grow">
                                    <h4 class="font-semibold text-gray-800 dark:text-gray-100">${product.name}</h4>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${priceText}</p> </div>
                                <div class="flex flex-col items-end justify-between flex-shrink-0 ml-2">
                                    <div class="space-x-2">
                                        <button class="edit-btn text-sm text-blue-500 hover:text-blue-400" data-id="${product.id}">Editar</button>
                                        <button class="delete-btn text-sm text-red-500 hover:text-red-400" data-id="${product.id}">Remover</button>
                                    </div>
                                </div>
                            </div>`;
                    });

                    categorySection += `</div></div>`; // Fecha a grid e a seção
                    productListContainer.innerHTML += categorySection;
                }
            });
             if (productListContainer.innerHTML === '') {
                productListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Nenhum produto encontrado.</p>';
            }
        }

        // Abre o modal (MODIFICADO para lidar com opções)
        const openModal = (product = null, id = null) => {
            document.getElementById('product-id').value = id || '';
            document.getElementById('product-name').value = product?.name || '';
            document.getElementById('product-desc').value = product?.description || '';
            // document.getElementById('product-price').value = product?.price || ''; // REMOVIDO
            document.getElementById('product-category').value = product?.categoryId || '';
            document.getElementById('product-image-file').value = ''; // Limpa sempre o input de ficheiro
            document.getElementById('modal-title').textContent = id ? 'Editar Produto' : 'Adicionar Novo Produto';
            
            const preview = document.getElementById('image-preview');
            const existingImageUrlInput = document.getElementById('existing-image-url');
            if (product?.imageUrl) {
                preview.src = product.imageUrl;
                preview.classList.remove('hidden');
                existingImageUrlInput.value = product.imageUrl; // Guarda a URL existente
            } else {
                preview.src = '';
                preview.classList.add('hidden');
                existingImageUrlInput.value = ''; // Limpa se não houver imagem
            }

            // Limpa e preenche as opções
            const optionsContainer = document.getElementById('product-options-container');
            optionsContainer.innerHTML = ''; // Limpa opções anteriores
            if (product?.options && product.options.length > 0) {
                product.options.forEach(option => addOption(option)); // Adiciona as opções existentes
            } else {
                addOption(); // Adiciona uma linha em branco se for novo produto ou não tiver opções
            }

            document.getElementById('product-modal').classList.remove('hidden');
            document.getElementById('product-modal').classList.add('flex');
        };

        const closeModal = () => {
            document.getElementById('product-modal').classList.add('hidden');
            document.getElementById('product-modal').classList.remove('flex');
            // Limpar formulário completamente ao fechar
             document.getElementById('product-id').value = '';
            document.getElementById('product-name').value = '';
            document.getElementById('product-desc').value = '';
            document.getElementById('product-category').value = '';
            document.getElementById('product-image-file').value = '';
            document.getElementById('image-preview').src = '';
            document.getElementById('image-preview').classList.add('hidden');
            document.getElementById('existing-image-url').value = '';
            document.getElementById('product-options-container').innerHTML = '';
        };

        document.getElementById('add-product-btn').addEventListener('click', () => openModal());
        document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);

        // Lógica para salvar produto (TOTALMENTE MODIFICADA)
        document.getElementById('save-product-btn').addEventListener('click', async () => {
            const id = document.getElementById('product-id').value;
            const imageFile = document.getElementById('product-image-file').files[0];
            let imageUrl = document.getElementById('existing-image-url').value || ''; // Usa a existente se não houver nova

            const productName = document.getElementById('product-name').value.trim();
            const categoryId = document.getElementById('product-category').value;

            // Coleta as opções
            const optionNames = Array.from(document.querySelectorAll('input[name="optionName[]"]')).map(input => input.value.trim());
            const optionPrices = Array.from(document.querySelectorAll('input[name="optionPrice[]"]')).map(input => parseFloat(input.value));

            const options = [];
            let optionsValid = true;
            for (let i = 0; i < optionNames.length; i++) {
                if (optionNames[i] && !isNaN(optionPrices[i]) && optionPrices[i] >= 0) {
                    options.push({ name: optionNames[i], price: optionPrices[i] });
                } else {
                    optionsValid = false; // Marca como inválido se alguma linha não tiver nome ou preço válido
                    break;
                }
            }

            // Validações
            if (!productName) { return alert("O nome do produto é obrigatório."); }
            if (!categoryId) { return alert("A categoria é obrigatória."); }
            if (options.length === 0) { return alert("Adicione pelo menos uma opção válida com nome e preço."); }
             if (!optionsValid) { return alert("Todas as opções devem ter um nome e um preço válido (número maior ou igual a zero)."); }


            const data = {
                name: productName,
                description: document.getElementById('product-desc').value.trim(),
                categoryId: categoryId,
                options: options, // Salva o array de opções
                imageUrl: '' // Será definida após o upload ou mantida
            };

            const button = document.getElementById('save-product-btn');
            button.disabled = true;
            button.textContent = "A guardar...";

            try {
                // Upload da imagem (se houver nova)
                if (imageFile) {
                    button.textContent = "A carregar imagem...";
                    const formData = new FormData();
                    formData.append('file', imageFile);
                    formData.append('upload_preset', cloudinaryConfig.uploadPreset);

                    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) { throw new Error('Falha no upload para o Cloudinary.'); }
                    const result = await response.json();
                    imageUrl = result.secure_url; // Atualiza a URL com a nova imagem
                }
                
                // Define a URL final (nova, existente ou placeholder)
                data.imageUrl = imageUrl || 'https://placehold.co/400x300/cccccc/ffffff?text=Sem+Foto';

                // Salva no Firestore
                button.textContent = "A guardar produto...";
                if (id) { // Atualiza existente
                    await updateDoc(doc(db, "products", id), data);
                } else { // Adiciona novo
                    await addDoc(productsRef, data);
                }

                closeModal(); // Fecha o modal após sucesso

            } catch (error) {
                console.error("Erro ao guardar produto:", error);
                alert("Erro ao guardar: " + error.message);
            } finally {
                button.disabled = false;
                button.textContent = "Guardar";
                // Não limpa o file input aqui, closeModal já faz isso
            }
        });

        // Event listener para Editar/Remover produto (sem alterações na lógica de clique, openModal fará o resto)
        document.getElementById('product-list').addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (!id) return;
            const productRef = doc(db, "products", id);
            if (e.target.classList.contains('edit-btn')) {
                const docSnap = await getDoc(productRef);
                 if (docSnap.exists()) {
                    openModal(docSnap.data(), id);
                 } else {
                     alert("Produto não encontrado.");
                 }
            }
            if (e.target.classList.contains('delete-btn')) {
                if (confirm("Tem a certeza que quer remover este produto?")) {
                    await deleteDoc(productRef);
                }
            }
        });

    } catch (error) {
        console.error("Erro Crítico na Inicialização:", error);
        document.body.innerHTML = `<div class="text-red-500 p-8 text-center"><h1>Erro Crítico na Inicialização</h1><p>${error.message}</p></div>`;
    }
}

// Inicia a aplicação
initialize();