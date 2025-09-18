// --- LÓGICA DE TEMA (DARK MODE) ---
// Função que aplica o tema (adiciona ou remove a classe 'dark' do <html>)
const applyTheme = (isDark) => {
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

// Verifica a preferência do sistema ao carregar a página
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
applyTheme(prefersDark.matches);

// Ouve por mudanças na preferência do sistema para adaptar em tempo real
prefersDark.addEventListener('change', (event) => {
    applyTheme(event.matches);
});


// --- SDKs DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
// A importação do Storage foi REMOVIDA intencionalmente

// Esta função vai buscar as chaves secretas ao nosso "cofre" na Vercel
async function getFirebaseConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `O servidor respondeu com o status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error("Falha ao buscar configuração do Firebase:", error);
        throw new Error("Não foi possível carregar as configurações do servidor.");
    }
}

// A função principal que arranca a aplicação
async function initialize() {
    try {
        const firebaseConfig = await getFirebaseConfig();

        // --- INICIALIZAÇÃO ---
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        
        const settingsRef = doc(db, "settings", "main");
        const productsRef = collection(db, "products");
        const categoriesRef = collection(db, "categories");

        let allCategories = [];
        let allProducts = [];
        
        // --- LÓGICA DE AUTENTICAÇÃO ---
        onAuthStateChanged(auth, user => {
            const loginScreen = document.getElementById('login-screen');
            const mainPanel = document.getElementById('main-panel');
            if (user) {
                loginScreen.classList.add('hidden');
                mainPanel.classList.remove('hidden');
                loadSettings();
                listenToCategories();
                listenToProducts();
            } else {
                loginScreen.classList.remove('hidden');
                mainPanel.classList.add('hidden');
            }
        });
        
        document.getElementById('login-btn').addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const authError = document.getElementById('auth-error');
            authError.classList.add('hidden');

            signInWithEmailAndPassword(auth, email, password)
                .catch(error => {
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        createUserWithEmailAndPassword(auth, email, password)
                           .catch(err => { authError.textContent = "Erro ao criar conta: " + err.message; authError.classList.remove('hidden'); });
                    } else { authError.textContent = error.message; authError.classList.remove('hidden'); }
                });
        });

        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
        
        // --- LÓGICA DE CONFIGURAÇÕES ---
        async function loadSettings() {
            const docSnap = await getDoc(settingsRef);
            if(docSnap.exists()) {
                const settings = docSnap.data();
                document.getElementById('whatsapp-number').value = settings.whatsappNumber || '';
                document.getElementById('whatsapp-message').value = settings.whatsappMessage || '*Novo Pedido* 🍔\n\n*Cliente:* {cliente}\n*Itens:*\n{itens}\n\n*Morada:*\n{morada}\n*Pagamento:* {pagamento}\n*Total: {total}*';
                document.getElementById('minimum-order').value = settings.minimumOrder || 5.00;
            }
        }

        document.getElementById('save-settings-btn').addEventListener('click', () => {
            const data = {
                whatsappNumber: document.getElementById('whatsapp-number').value,
                whatsappMessage: document.getElementById('whatsapp-message').value,
                minimumOrder: parseFloat(document.getElementById('minimum-order').value) || 0
            };
            setDoc(settingsRef, data, { merge: true })
                .then(() => alert("Configurações guardadas!"))
                .catch(err => alert("Erro: " + err.message));
        });

        // --- LÓGICA DE CATEGORIAS ---
        function listenToCategories() {
            const q = query(categoriesRef, orderBy("name"));
            onSnapshot(q, snapshot => {
                const categoryList = document.getElementById('category-list');
                const categorySelect = document.getElementById('product-category');
                categoryList.innerHTML = '';
                categorySelect.innerHTML = '<option value="">-- Selecione uma categoria --</option>';
                allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                allCategories.forEach(cat => {
                    const item = document.createElement('div');
                    item.className = "flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md";
                    item.innerHTML = `
                        <span class="text-gray-700 dark:text-gray-200">${cat.name}</span>
                        <div class="space-x-2">
                           <button class="edit-cat-btn text-sm text-blue-500 hover:text-blue-400" data-id="${cat.id}" data-name="${cat.name}">Editar</button>
                           <button class="delete-cat-btn text-sm text-red-500 hover:text-red-400" data-id="${cat.id}">X</button>
                        </div>
                    `;
                    categoryList.appendChild(item);
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.name;
                    categorySelect.appendChild(option);
                });
                renderProductList();
            });
        }

        document.getElementById('add-category-btn').addEventListener('click', async () => {
            const input = document.getElementById('new-category-name');
            const name = input.value.trim();
            if(name) {
                await addDoc(categoriesRef, { name });
                input.value = '';
            }
        });

        document.getElementById('category-list').addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if(!id) return;
            const categoryDocRef = doc(db, 'categories', id);

            if(e.target.classList.contains('edit-cat-btn')) {
                const newName = prompt("Novo nome para a categoria:", e.target.dataset.name);
                if(newName && newName.trim()) {
                    await updateDoc(categoryDocRef, { name: newName.trim() });
                }
            }

            if(e.target.classList.contains('delete-cat-btn')) {
                const q = query(productsRef, where("categoryId", "==", id));
                const productsInCategory = await getDocs(q);
                if (!productsInCategory.empty) {
                    alert("Não pode remover esta categoria pois existem produtos associados a ela.");
                    return;
                }
                if(confirm("Tem a certeza que quer remover esta categoria?")) {
                    await deleteDoc(categoryDocRef);
                }
            }
        });

        // --- LÓGICA DE PRODUTOS ---
        function listenToProducts() {
            onSnapshot(productsRef, snapshot => {
                allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderProductList();
            });
        }

        function renderProductList() {
            const productListContainer = document.getElementById('product-list');
            productListContainer.innerHTML = '';

            allCategories.forEach(cat => {
                const productsInCategory = allProducts.filter(p => p.categoryId === cat.id);
                if (productsInCategory.length > 0) {
                    let categorySection = `<div class="mb-6"><h3 class="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">${cat.name}</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;
                    productsInCategory.forEach(product => {
                        categorySection += `
                            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex">
                                <img src="${product.imageUrl || 'https://placehold.co/100x100'}" class="w-20 h-20 rounded-md object-cover mr-4">
                                <div class="flex-grow">
                                    <h4 class="font-semibold text-gray-800 dark:text-gray-100">${product.name}</h4>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">${(product.price || 0).toFixed(2)} €</p>
                                </div>
                                <div class="flex flex-col items-end justify-between">
                                    <div class="space-x-2">
                                        <button class="edit-btn text-sm text-blue-500 hover:text-blue-400" data-id="${product.id}">Editar</button>
                                        <button class="delete-btn text-sm text-red-500 hover:text-red-400" data-id="${product.id}">Remover</button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    categorySection += `</div></div>`;
                    productListContainer.innerHTML += categorySection;
                }
            });
        }
        
        const openModal = (product = null, id = null) => {
            document.getElementById('product-id').value = id || '';
            document.getElementById('product-name').value = product?.name || '';
            document.getElementById('product-desc').value = product?.description || '';
            document.getElementById('product-price').value = product?.price || '';
            document.getElementById('product-category').value = product?.categoryId || '';
            document.getElementById('product-image-url').value = product?.imageUrl || ''; // Campo de URL
            document.getElementById('modal-title').textContent = id ? 'Editar Produto' : 'Adicionar Novo Produto';
            const preview = document.getElementById('image-preview');

            if (product?.imageUrl) {
                preview.src = product.imageUrl;
                preview.classList.remove('hidden');
            } else { 
                preview.src = '';
                preview.classList.add('hidden');
            }
            
            document.getElementById('product-modal').classList.remove('hidden');
            document.getElementById('product-modal').classList.add('flex');
        };

        const closeModal = () => {
            document.getElementById('product-modal').classList.add('hidden');
            document.getElementById('product-modal').classList.remove('flex');
        };

        document.getElementById('add-product-btn').addEventListener('click', () => openModal());
        document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);
        
        document.getElementById('product-image-url').addEventListener('input', e => {
            const preview = document.getElementById('image-preview');
            const url = e.target.value;
            if (url) {
                preview.src = url;
                preview.classList.remove('hidden');
            } else {
                preview.classList.add('hidden');
            }
        });
        
        document.getElementById('save-product-btn').addEventListener('click', async () => {
            const id = document.getElementById('product-id').value;
            const data = {
                name: document.getElementById('product-name').value,
                description: document.getElementById('product-desc').value,
                price: parseFloat(document.getElementById('product-price').value),
                categoryId: document.getElementById('product-category').value,
                imageUrl: document.getElementById('product-image-url').value.trim()
            };

            if (!data.name || isNaN(data.price) || !data.categoryId) return alert("Nome, preço e categoria são obrigatórios.");

            if (!data.imageUrl) {
                data.imageUrl = 'https://placehold.co/400x300/cccccc/ffffff?text=Sem+Foto';
            }

            const button = document.getElementById('save-product-btn');
            button.disabled = true; button.textContent = "A guardar...";

            try {
                if (id) {
                    const productRef = doc(db, "products", id);
                    await updateDoc(productRef, data);
                } else {
                    await addDoc(productsRef, data);
                }
                closeModal();
            } catch (error) { 
                alert("Erro ao guardar: " + error.message);
            } finally { 
                button.disabled = false; button.textContent = "Guardar"; 
            }
        });

        document.getElementById('product-list').addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (!id) return;
            const productRef = doc(db, "products", id);

            if (e.target.classList.contains('edit-btn')) {
                const docSnap = await getDoc(productRef);
                openModal(docSnap.data(), id);
            }
            if (e.target.classList.contains('delete-btn')) {
                if (confirm("Tem a certeza que quer remover este produto?")) {
                    await deleteDoc(productRef);
                }
            }
        });

    } catch (error) {
        console.error("Erro Crítico na Inicialização:", error);
        document.body.innerHTML = `<div class="text-red-500 p-8 text-center"><h1>Erro Crítico na Inicialização</h1><p>${error.message}</p><p>Verifique as suas Variáveis de Ambiente na Vercel.</p></div>`;
    }
}

initialize();