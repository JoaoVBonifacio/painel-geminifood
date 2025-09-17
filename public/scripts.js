// --- SDKs DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

// Esta função vai buscar as chaves secretas ao nosso "cofre" na Vercel
async function getFirebaseConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error(`O servidor respondeu com o status: ${response.status}`);
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
        const storage = getStorage(app);
        
        // --- TODO o resto do seu código JavaScript do painel vai aqui ---
        // (Copie da versão anterior, começando pelas referências)
        const settingsRef = doc(db, "settings", "main");
        const productsRef = collection(db, "products");
        // ...etc...

    } catch (error) {
        console.error("Erro Crítico na Inicialização:", error);
        document.body.innerHTML = `<div class="text-red-500 p-8 text-center"><h1>Erro Crítico na Inicialização</h1><p>${error.message}</p><p>Verifique as suas Variáveis de Ambiente na Vercel.</p></div>`;
    }
}

initialize();
