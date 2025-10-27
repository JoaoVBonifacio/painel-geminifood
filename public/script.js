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
const loginScreen = document.getElementById('login-screen'); // Adicionado
const mainPanel = document.getElementById('main-panel');     // Adicionado

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
    return `
        <div class="option-row flex items-center mb-2 gap-2">
            <input type="text" name="optionName[]" placeholder="Nome da Opção (ex: Pequena)" class="flex-grow p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${option.name || ''}" required>
            <input type="number" name="optionPrice[]" placeholder="Preço (€)" step="0.01" class="w-28 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value="${priceValue}" required>
            <button type="button" onclick="removeOption(this)" class="text-red-500 hover:text-red-400 font-bold p-1 text-xl leading-none">&times;</button>
        </div>
    `;
}
window.addOption = function(option) {
    if (!optionsContainer) return;
    const newRowHTML = createOptionRowHTML(option);
    optionsContainer.insertAdjacentHTML('beforeend', newRowHTML);
}
window.removeOption = function(button) {
    if (!optionsContainer) return;
    if (optionsContainer.children.length > 1) {
        button.closest('.option-row')?.remove();
    } else {
        alert("É necessário ter pelo menos uma opção para o produto.");
    }
}
// --- FIM OPÇÕES ---

// --- LÓGICA DO SWITCH DE PREÇO ---
function updatePriceSections(isMultiple) {
    if (!priceTypeLabel || !singlePriceSection || !multipleOptionsSection) {
        console.error("Elementos de controle de preço não encontrados!");
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

        // --- Listener de Autenticação (Lógica de visibilidade CORRIGIDA) ---
        onAuthStateChanged(auth, async (user) => {
            // Garante que os elementos existem
            if (!loginScreen || !mainPanel) {
                 console.error("Tela de login ou painel principal não encontrado no DOM.");
                 return;
            }

            if (user) {
                try {
                    const adminDocRef = doc(db, 'admins', user.uid);
                    const adminDocSnap = await getDoc(adminDocRef);

                    if (adminDocSnap.exists()) {
                        console.log("Admin logado, mostrando painel.");
                        // ESCONDE login, MOSTRA painel
                        loginScreen.classList.add('hidden');
                        mainPanel.classList.remove('hidden');
                        // Carrega dados apenas se for admin
                        loadSettingsAndStartInterval();
                        listenToCategories();
                        listenToProducts();
                    } else {
                        console.log("Usuário logado, mas não é admin.");
                        alert('Acesso negado. Você não tem permissão.');
                        await signOut(auth);
                        // Garante que o painel está escondido e o login visível
                        loginScreen.classList.remove('hidden');
                        mainPanel.classList.add('hidden');
                        clearInterval(storeStatusInterval); // Para checagem de horário
                    }
                } catch(adminCheckError) {
                     console.error("Erro ao verificar permissões de admin:", adminCheckError);
                     alert("Erro ao verificar permissões. Tente novamente.");
                     await signOut(auth);
                      // Garante que o painel está escondido e o login visível
                     loginScreen.classList.remove('hidden');
                     mainPanel.classList.add('hidden');
                     clearInterval(storeStatusInterval);
                }
            } else {
                console.log("Usuário deslogado, mostrando tela de login.");
                // MOSTRA login, ESCONDE painel
                loginScreen.classList.remove('hidden');
                mainPanel.classList.add('hidden');
                clearInterval(storeStatusInterval); // Para checagem de horário
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
function getPriceDisplay(options) { /* ... (igual) ... */ }
function renderProductList() { /* ... (igual) ... */ }
// --- FIM LÓGICA DE PRODUTOS ---

// --- LÓGICA DO MODAL DE PRODUTO ---
const openModal = (product = null, id = null) => { /* ... (igual à versão anterior) ... */ };
const closeModal = () => { /* ... (igual à versão anterior) ... */ };
document.getElementById('add-product-btn')?.addEventListener('click', () => openModal());
document.getElementById('cancel-modal-btn')?.addEventListener('click', closeModal);
document.getElementById('save-product-btn')?.addEventListener('click', async () => { /* ... (igual à versão anterior) ... */ });
document.getElementById('product-list')?.addEventListener('click', async (e) => { /* ... (igual à versão anterior) ... */ });
// --- FIM MODAL ---

// --- INICIA A APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', initialize);