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
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc, query, orderBy, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- VARIÁVEIS GLOBAIS ---
let cloudinaryConfig = {};

async function getAppConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `O servidor respondeu com o status: ${response.status}`);
        }
        const config = await response.json();
        cloudinaryConfig = config.cloudinary; // Guarda a configuração do Cloudinary
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
        const auth = getAuth(app);
        const db = getFirestore(app);

        const settingsRef = doc(db, "settings", "main");
        const productsRef = collection(db, "products");
        const categoriesRef = collection(db, "categories");

        let allCategories = [];
        let allProducts = [];

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
                            .catch(err => {
                                authError.textContent = "Erro ao criar conta: " + err.message;
                                authError.classList.remove('hidden');
                            });
                    } else {
                        authError.textContent = error.message;
                        authError.classList.remove('hidden');
                    }
                });
        });

        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

        async function loadSettings() {
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
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
            setDoc(settingsRef, data, {
                merge: true
            }).then(() => alert("Configurações guardadas!")).catch(err => alert("Erro: " + err.message));
        });

        function listenToCategories() {
            const q = query(categoriesRef, orderBy("name"));
            onSnapshot(q, snapshot => {
                const categoryList = document.getElementById('category-list');
                const categorySelect = document.getElementById('product-category');
                categoryList.innerHTML = '';
                categorySelect.innerHTML = '<option value="">-- Selecione uma categoria --</option>';
                allCategories = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
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
            });
        }

        document.getElementById('add-category-btn').addEventListener('click', async () => {
            const input = document.getElementById('new-category-name');
            const name = input.value.trim();
            if (name) {
                await addDoc(categoriesRef, {
                    name
                });
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
                    await updateDoc(categoryDocRef, {
                        name: newName.trim()
                    });
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
            } else {
                preview.src = '';
                preview.classList.add('hidden');
            }
        });

        function listenToProducts() {
            onSnapshot(productsRef, snapshot => {
                allProducts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
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
                        categorySection += `<div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex"><img src="${product.imageUrl || 'https://placehold.co/100x100/cccccc/ffffff?text=Sem+Foto'}" alt="${product.name}" class="w-20 h-20 rounded-md object-cover mr-4"><div class="flex-grow"><h4 class="font-semibold text-gray-800 dark:text-gray-100">${product.name}</h4><p class="text-sm text-gray-500 dark:text-gray-400">${(product.price || 0).toFixed(2)} €</p></div><div class="flex flex-col items-end justify-between"><div class="space-x-2"><button class="edit-btn text-sm text-blue-500 hover:text-blue-400" data-id="${product.id}">Editar</button><button class="delete-btn text-sm text-red-500 hover:text-red-400" data-id="${product.id}">Remover</button></div></div></div>`;
                    });
                    categorySection += `</div></div>`;
                    productListContainer.innerHTML += categorySection;
                }
            });
        }
        
        const openModal = (product = null, id = null) => {
            document.getElementById('product-id').value = id || '';
            document.getElementById('product-name').value = product ?.name || '';
            document.getElementById('product-desc').value = product ?.description || '';
            document.getElementById('product-price').value = product ?.price || '';
            document.getElementById('product-category').value = product ?.categoryId || '';
            document.getElementById('product-image-file').value = '';
            document.getElementById('modal-title').textContent = id ? 'Editar Produto' : 'Adicionar Novo Produto';
            const preview = document.getElementById('image-preview');
            if (product ?.imageUrl) {
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

        // ✅ LÓGICA DE UPLOAD DIRETO PARA O CLOUDINARY
        document.getElementById('save-product-btn').addEventListener('click', async () => {
            const id = document.getElementById('product-id').value;
            const imageFile = document.getElementById('product-image-file').files[0];
            let imageUrl = '';

            const data = {
                name: document.getElementById('product-name').value,
                description: document.getElementById('product-desc').value,
                price: parseFloat(document.getElementById('product-price').value),
                categoryId: document.getElementById('product-category').value,
            };

            if (!data.name || isNaN(data.price) || !data.categoryId) {
                return alert("Nome, preço e categoria são obrigatórios.");
            }

            const button = document.getElementById('save-product-btn');
            button.disabled = true;

            try {
                if (imageFile) {
                    button.textContent = "A carregar imagem...";

                    const formData = new FormData();
                    formData.append('file', imageFile);
                    formData.append('upload_preset', cloudinaryConfig.uploadPreset);

                    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        throw new Error('Falha no upload direto para o Cloudinary.');
                    }

                    const result = await response.json();
                    imageUrl = result.secure_url;

                } else if (id) {
                    const existingProduct = allProducts.find(p => p.id === id);
                    imageUrl = existingProduct ?.imageUrl || '';
                }

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
                alert("Erro ao guardar: " + error.message);
            } finally {
                button.disabled = false;
                button.textContent = "Guardar";
                document.getElementById('product-image-file').value = '';
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
        document.body.innerHTML = `<div class="text-red-500 p-8 text-center"><h1>Erro Crítico na Inicialização</h1><p>${error.message}</p></div>`;
    }
}

initialize();