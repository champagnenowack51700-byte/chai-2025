import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDRTi_7yt5u0Vnc396fCZVXGZAmgpIFsEs",
  authDomain: "gestion-chai-nowack.firebaseapp.com",
  projectId: "gestion-chai-nowack",
  storageBucket: "gestion-chai-nowack.firebasestorage.app",
  messagingSenderId: "869476292374",
  appId: "1:869476292374:web:469b1f38ddbc93bc24e237"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Correspondance N°AMM -> substanceActive correcte
const AMM_MAP = {
  "9800474": "Cuivre",   // Bouillie Bordelaise
  "2010130": "Cuivre",   // Nordox
  "2000517": "Cuivre",   // Champ Flo Ampli
  "9800245": "Soufre",   // Microthiol
  "9000222": "Soufre",   // Heliosoufre
  "2080038": "Autre",    // Pyrevert
};

async function fix() {
  const snap = await getDocs(collection(db, "stockProduits"));
  for(const d of snap.docs) {
    const data = d.data();
    const correct = AMM_MAP[data.nAmm];
    if(correct && data.substanceActive !== correct) {
      await updateDoc(doc(db, "stockProduits", d.id), { substanceActive: correct });
      console.log(`Fixed ${data.nom}: ${data.substanceActive} -> ${correct}`);
    }
  }
  console.log("Done!");
}

fix().catch(console.error);
