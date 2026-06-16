import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, writeBatch } from "firebase/firestore";


// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDRTi_7yt5u0Vnc396fCZVXGZAmgpIFsEs",
  authDomain: "gestion-chai-nowack.firebaseapp.com",
  projectId: "gestion-chai-nowack",
  storageBucket: "gestion-chai-nowack.firebasestorage.app",
  messagingSenderId: "869476292374",
  appId: "1:869476292374:web:469b1f38ddbc93bc24e237"
};
const firebaseApp = initializeApp(firebaseConfig);
// Vider le localStorage au demarrage pour eviter conflits avec Firebase
try { 
  const keysToRemove = Object.keys(localStorage).filter(k=>k.startsWith("chai_"));
  keysToRemove.forEach(k=>localStorage.removeItem(k));
} catch(e) {}
const db = getFirestore(firebaseApp);  // uses (default) database

// Helper: save a document
const fbSave = (col, id, data) => {
  const clean = JSON.parse(JSON.stringify(data)); // strip undefined
  return setDoc(doc(db, col, String(id)), {...clean, _ts: new Date().toISOString()});
};
const fbDelete = (col, id) => deleteDoc(doc(db, col, String(id)));
const fmt = (d) => {
  if(!d) return "-";
  const parts = d.slice(0,10).split("-");
  if(parts.length===3) return parts[2]+"/"+parts[1]+"/"+parts[0];
  return d;
};

const fbLoad = async (col, setter) => {
  try {
    const snap = await getDocs(collection(db, col));
    const data = snap.docs.map(d => ({...d.data(), id: d.id}));
    if(data.length > 0) setter(data);
  } catch(e) { console.error("fbLoad error", col, e); }
};

const INIT_TONNEAUX = [
  // == VINS CLAIRS 2025 ======================================================
  { id:"23.28", appellation:"vins_clairs_2025", denomination:"FONTINETTE",         millesime:2025, volume:500, certif:"BIO", tonnelier:"Francois Frère",  statut:"actif", marc:5, contenuActuel:500 },
  { id:"23.29", appellation:"vins_clairs_2025", denomination:"FONTINETTE",         millesime:2025, volume:500, certif:"BIO", tonnelier:"Francois Frère",  statut:"actif", marc:5, contenuActuel:500 },
  { id:"23.14", appellation:"vins_clairs_2025", denomination:"FONTINETTE",         millesime:2025, volume:500, certif:"BIO", tonnelier:"Mercurey",         statut:"actif", marc:5, contenuActuel:500 },
  { id:"21.44", appellation:"vins_clairs_2025", denomination:"FONTINETTE",         millesime:2025, volume:320, certif:"BIO", tonnelier:"Mercurey",         statut:"actif", marc:5, contenuActuel:320 },
  { id:"21.47", appellation:"vins_clairs_2025", denomination:"FONTINETTE",         millesime:2025, volume:320, certif:"BIO", tonnelier:"Seguin Moreau",    statut:"actif", marc:5, contenuActuel:320 },
  { id:"22.29", appellation:"vins_clairs_2025", denomination:"BAUCH THOMAS DU BAS",millesime:2025, volume:228, certif:"BIO", tonnelier:"Saint Martin",     statut:"actif", marc:6, contenuActuel:228 },
  { id:"20.15", appellation:"vins_clairs_2025", denomination:"BAUCH THOMAS DU BAS",millesime:2025, volume:228, certif:"BIO", tonnelier:"Seguin Moreau",    statut:"actif", marc:6, contenuActuel:228 },
  { id:"21.48", appellation:"vins_clairs_2025", denomination:"BAUCH THOMAS DU BAS",millesime:2025, volume:228, certif:"BIO", tonnelier:"Seguin Moreau",    statut:"actif", marc:6, contenuActuel:228 },
  { id:"105",   appellation:"vins_clairs_2025", denomination:"BAUCH THOMAS DU BAS",millesime:2025, volume:228, certif:"BIO", tonnelier:"Seguin Moreau",    statut:"actif", marc:6, contenuActuel:228 },
  { id:"22.52", appellation:"vins_clairs_2025", denomination:"BAUCH THOMAS DU BAS",millesime:2025, volume:228, certif:"BIO", tonnelier:"D",                statut:"actif", marc:6, contenuActuel:228 },
  { id:"69",    appellation:"vins_clairs_2025", denomination:"BAUCH THOMAS DU BAS",millesime:2025, volume:228, certif:"BIO", tonnelier:"Chassin",          statut:"actif", marc:6, contenuActuel:228 },
  { id:"23.15", appellation:"vins_clairs_2025", denomination:"BAUCHETS THOMAS PN", millesime:2025, volume:500, certif:"BIO", tonnelier:"Seguin Moreau",    statut:"actif", marc:7, contenuActuel:500 },
  { id:"23.13", appellation:"vins_clairs_2025", denomination:"BAUCHETS THOMAS PN", millesime:2025, volume:500, certif:"BIO", tonnelier:"ACF",              statut:"actif", marc:7, contenuActuel:500 },
  { id:"22.14", appellation:"vins_clairs_2025", denomination:"BAUCHETS THOMAS PN", millesime:2025, volume:320, certif:"BIO", tonnelier:"ACF",              statut:"actif", marc:7, contenuActuel:320 },
  { id:"22.47", appellation:"vins_clairs_2025", denomination:"BAUCHETS THOMAS PN", millesime:2025, volume:320, certif:"BIO", tonnelier:"Seguin Moreau",    statut:"actif", marc:7, contenuActuel:320 },
  { id:"21.16", appellation:"vins_clairs_2025", denomination:"LAURINETTE MEUNIER", millesime:2025, volume:228, certif:"BIO", tonnelier:"Francois Frère",   statut:"actif", marc:8, contenuActuel:228 },
  { id:"109",   appellation:"vins_clairs_2025", denomination:"LAURINETTE MEUNIER", millesime:2025, volume:228, certif:"BIO", tonnelier:"Jadot",            statut:"actif", marc:8, contenuActuel:228 },
  { id:"21.39", appellation:"vins_clairs_2025", denomination:"LAURINETTE MEUNIER", millesime:2025, volume:228, certif:"BIO", tonnelier:"Francois Frère",   statut:"actif", marc:8, contenuActuel:228 },
  { id:"22.38", appellation:"vins_clairs_2025", denomination:"LAURINETTE MEUNIER", millesime:2025, volume:228, certif:"BIO", tonnelier:"Mercurey",         statut:"actif", marc:8, contenuActuel:228 },
  { id:"104",   appellation:"vins_clairs_2025", denomination:"LAURINETTE MEUNIER", millesime:2025, volume:228, certif:"BIO", tonnelier:"Saint martin",     statut:"actif", marc:8, contenuActuel:228 },
  { id:"81",    appellation:"vins_clairs_2025", denomination:"LAURINETTE MEUNIER", millesime:2025, volume:228, certif:"BIO", tonnelier:"Chassins",         statut:"actif", marc:8, contenuActuel:228 },
  { id:"23.26", appellation:"vins_clairs_2025", denomination:"TERRES BLEUES",      millesime:2025, volume:500, certif:"BIO", tonnelier:"Francois Frère",   statut:"actif", marc:11, contenuActuel:500 },
  { id:"23.27", appellation:"vins_clairs_2025", denomination:"TERRES BLEUES",      millesime:2025, volume:500, certif:"BIO", tonnelier:"Francois Frère",   statut:"actif", marc:11, contenuActuel:500 },
  { id:"22.41", appellation:"vins_clairs_2025", denomination:"TERRES BLEUES",      millesime:2025, volume:320, certif:"BIO", tonnelier:"ACF",              statut:"actif", marc:11, contenuActuel:320 },
  { id:"22.30", appellation:"vins_clairs_2025", denomination:"MAISONS BRULEES",    millesime:2025, volume:228, certif:"BIO", tonnelier:"Mercurey",         statut:"actif", marc:12, contenuActuel:228 },
  { id:"34",    appellation:"vins_clairs_2025", denomination:"MAISONS BRULEES",    millesime:2025, volume:228, certif:"BIO", tonnelier:"Chassins",         statut:"actif", marc:12, contenuActuel:228 },
  { id:"21.30", appellation:"vins_clairs_2025", denomination:"MAISONS BRULEES",    millesime:2025, volume:228, certif:"BIO", tonnelier:"Chassins",         statut:"actif", marc:12, contenuActuel:228 },
  { id:"57",    appellation:"vins_clairs_2025", denomination:"MAISONS BRULEES",    millesime:2025, volume:228, certif:"BIO", tonnelier:"Damy",             statut:"surveillance", marc:12, contenuActuel:228 },
  { id:"20.40", appellation:"vins_clairs_2025", denomination:"MAISONS BRULEES",    millesime:2025, volume:228, certif:"BIO", tonnelier:"Cavin",            statut:"actif", marc:12, contenuActuel:228 },
  { id:"71",    appellation:"vins_clairs_2025", denomination:"MAISONS BRULEES",    millesime:2025, volume:228, certif:"BIO", tonnelier:"",                 statut:"actif", marc:12, contenuActuel:228 },
  { id:"45682", appellation:"vins_clairs_2025", denomination:"VINCELLES TRY",      millesime:2025, volume:228, certif:"BIO", tonnelier:"Chassin B",        statut:"actif", marc:13, contenuActuel:228 },
  { id:"21.20", appellation:"vins_clairs_2025", denomination:"VINCELLES TRY",      millesime:2025, volume:228, certif:"BIO", tonnelier:"Mercurey",         statut:"actif", marc:13, contenuActuel:228 },
  { id:"21.41", appellation:"vins_clairs_2025", denomination:"VINCELLES TRY",      millesime:2025, volume:228, certif:"BIO", tonnelier:"Jadot",            statut:"actif", marc:13, contenuActuel:228 },
  { id:"22.13", appellation:"vins_clairs_2025", denomination:"VINCELLES TRY",      millesime:2025, volume:228, certif:"BIO", tonnelier:"ACF",              statut:"actif", marc:13, contenuActuel:228 },
  { id:"45923", appellation:"vins_clairs_2025", denomination:"ARPENTS ROUGE",      millesime:2025, volume:500, certif:"BIO", tonnelier:"Cavin",            statut:"actif", marc:14, contenuActuel:500 },
  { id:"23.22", appellation:"vins_clairs_2025", denomination:"ARPENTS ROUGE",      millesime:2025, volume:500, certif:"BIO", tonnelier:"Saint Martin",     statut:"actif", marc:14, contenuActuel:500 },
  { id:"23.23", appellation:"vins_clairs_2025", denomination:"ARPENTS ROUGE",      millesime:2025, volume:500, certif:"BIO", tonnelier:"Saint Martin",     statut:"actif", marc:14, contenuActuel:500 },
  { id:"22.42", appellation:"vins_clairs_2025", denomination:"ARPENTS ROUGE",      millesime:2025, volume:320, certif:"BIO", tonnelier:"Seguin Moreau",    statut:"actif", marc:14, contenuActuel:320 },
  { id:"23.16", appellation:"vins_clairs_2025", denomination:"BELLEVUE",           millesime:2025, volume:500, certif:"BIO", tonnelier:"Cavin",            statut:"actif", marc:15, contenuActuel:500 },
  { id:"23.24", appellation:"vins_clairs_2025", denomination:"BELLEVUE",           millesime:2025, volume:500, certif:"BIO", tonnelier:"Saint Martin",     statut:"actif", marc:15, contenuActuel:500 },
  { id:"22.17", appellation:"vins_clairs_2025", denomination:"BELLEVUE",           millesime:2025, volume:320, certif:"BIO", tonnelier:"Mercurey",         statut:"actif", marc:15, contenuActuel:320 },
  { id:"22.16", appellation:"vins_clairs_2025", denomination:"BRANSCOURT",         millesime:2025, volume:320, certif:"BIO", tonnelier:"Seguin Moreau",    statut:"actif", marc:18, contenuActuel:320 },
  { id:"22.54", appellation:"vins_clairs_2025", denomination:"BRANSCOURT",         millesime:2025, volume:500, certif:"BIO", tonnelier:"Francois Frère",   statut:"actif", marc:18, contenuActuel:500 },
  { id:"22.76", appellation:"vins_clairs_2025", denomination:"BRANSCOURT",         millesime:2025, volume:500, certif:"BIO", tonnelier:"Francois Frère",   statut:"actif", marc:18, contenuActuel:500 },
  { id:"22.44", appellation:"vins_clairs_2025", denomination:"TUILERIE",           millesime:2025, volume:320, certif:"BIO", tonnelier:"ACF",              statut:"actif", marc:19, contenuActuel:320 },
  { id:"22.18", appellation:"vins_clairs_2025", denomination:"TUILERIE",           millesime:2025, volume:320, certif:"BIO", tonnelier:"Mercurey",         statut:"actif", marc:19, contenuActuel:320 },
  { id:"21.24", appellation:"vins_clairs_2025", denomination:"TUILERIE",           millesime:2025, volume:320, certif:"BIO", tonnelier:"Cavin",            statut:"actif", marc:19, contenuActuel:320 },
  { id:"21.49", appellation:"vins_clairs_2025", denomination:"EPERNAY",            millesime:2025, volume:320, certif:"",    tonnelier:"Seguin Moreau",    statut:"actif", marc:0, contenuActuel:320 },
  { id:"25.22", appellation:"vins_clairs_2025", denomination:"LE MESNIL",          millesime:2025, volume:320, certif:"BIO", tonnelier:"",                 statut:"actif", marc:0, contenuActuel:320 },
  { id:"25.21", appellation:"vins_clairs_2025", denomination:"LES GOESSES CRU A",  millesime:2025, volume:228, certif:"BIO", tonnelier:"",                 statut:"actif", marc:0, contenuActuel:228 },
  { id:"103",   appellation:"vins_clairs_2025", denomination:"LES GOESSES CRU B",  millesime:2025, volume:228, certif:"BIO", tonnelier:"",                 statut:"actif", marc:0, contenuActuel:228 },
  { id:"23.18", appellation:"vins_clairs_2025", denomination:"TRY / FESTIGNY",     millesime:2025, volume:500, certif:"BIO", tonnelier:"",                 statut:"surveillance", marc:16, contenuActuel:500 },
  { id:"23.19", appellation:"vins_clairs_2025", denomination:"TRY / FESTIGNY",     millesime:2025, volume:500, certif:"BIO", tonnelier:"Seguin Moreau",    statut:"actif", marc:16, contenuActuel:500 },
  // == VINS DE RÉSERVE ======================================================
  { id:"C18.25",          appellation:"vins_reserve", denomination:"VDR TUILERIE 2020",           millesime:2020, volume:228,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:220 },
  { id:"22.34",           appellation:"vins_reserve", denomination:"MESNIL SUR OGER",             millesime:null, volume:228,  certif:"BIO",     tonnelier:"Chassin",       statut:"actif", contenuActuel:220 },
  { id:"22.27",           appellation:"vins_reserve", denomination:"AMBONNAY",                    millesime:null, volume:228,  certif:"BIO",     tonnelier:"Saint martin",  statut:"actif", contenuActuel:220 },
  { id:"Foudre Baptiste", appellation:"vins_reserve", denomination:"TUILERIE 2021-2022-2023",     millesime:null, volume:4000, certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:3800 },
  { id:"Foudre 3",        appellation:"vins_reserve", denomination:"ASSEMBLAGE SA 2022",          millesime:null, volume:5000, certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:4800 },
  { id:"Foudre 2",        appellation:"vins_reserve", denomination:"ASSEMBLAGE SA 2023",          millesime:null, volume:5000, certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:4800 },
  { id:"Foudre 6",        appellation:"vins_reserve", denomination:"ASSEMBLAGE SA 2023",          millesime:null, volume:5000, certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:4800 },
  { id:"Foudre Fernand",  appellation:"vins_reserve", denomination:"BAUCHETS 2021-2022-2023",     millesime:null, volume:4000, certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:3800 },
  { id:"Cuve Font.",      appellation:"vins_reserve", denomination:"FONTINETTE 2022-2023",        millesime:null, volume:2550, certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:2400 },
  { id:"Cuve Arp.",       appellation:"vins_reserve", denomination:"ARPENTS ROUGE 2020-2021-2023",millesime:null, volume:2550, certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:2400 },
  { id:"Foudre Cuis",     appellation:"vins_reserve", denomination:"CUIS 2020-2023",              millesime:null, volume:1000, certif:"NON BIO", tonnelier:"",              statut:"actif", contenuActuel:950 },
  { id:"Foudre Epernay",  appellation:"vins_reserve", denomination:"EPERNAY 2020-2023",           millesime:null, volume:1000, certif:"NON BIO", tonnelier:"",              statut:"actif", contenuActuel:950 },
  { id:"C18.26",          appellation:"vins_reserve", denomination:"FONT EXP",                    millesime:null, volume:228,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:220 },
  { id:"45681",           appellation:"vins_reserve", denomination:"VDR ARPENTS CLAIRS",          millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  { id:"46015",           appellation:"vins_reserve", denomination:"VDR TERRES BLEUES",           millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  { id:"45924",           appellation:"vins_reserve", denomination:"VDR ARPENT ROUGE",            millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  { id:"45740",           appellation:"vins_reserve", denomination:"VDR FONTINETTE",              millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  { id:"45832",           appellation:"vins_reserve", denomination:"VDR DIVERS",                  millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  { id:"45712",           appellation:"vins_reserve", denomination:"VDR ARPENT ROUGE",            millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  { id:"45954",           appellation:"vins_reserve", denomination:"VDR FONTINETTE",              millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  { id:"45985",           appellation:"vins_reserve", denomination:"VDR ARPENT ROUGE",            millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  { id:"45862",           appellation:"vins_reserve", denomination:"VDR FONTINETTE",              millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  { id:"45893",           appellation:"vins_reserve", denomination:"VDR ARPENT ROUGE",            millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  { id:"45771",           appellation:"vins_reserve", denomination:"VDR FONTINETTE",              millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  { id:"45801",           appellation:"vins_reserve", denomination:"VDR ARPENT ROUGE",            millesime:null, volume:500,  certif:"BIO",     tonnelier:"",              statut:"actif", contenuActuel:480 },
  // == COTEAUX CHAMPENOIS ====================================================
  { id:"21.53",  appellation:"coteaux", denomination:"FONTINETTE ROUGE 2023",  millesime:2023, volume:228, certif:"BIO", tonnelier:"",             statut:"actif", contenuActuel:220 },
  { id:"128-3",  appellation:"coteaux", denomination:"COTEAUX FONTINETTE ROUGE",millesime:null, volume:228, certif:"BIO", tonnelier:"",             statut:"actif", contenuActuel:220 },
  { id:"458-1",  appellation:"coteaux", denomination:"COTEAUX FONTINETTE ROUGE",millesime:null, volume:228, certif:"BIO", tonnelier:"",             statut:"actif", contenuActuel:220 },
  { id:"D 2022", appellation:"coteaux", denomination:"COTEAUX FONTINETTE ROUGE",millesime:2022, volume:228, certif:"BIO", tonnelier:"",             statut:"actif", contenuActuel:220 },
  { id:"25.13",  appellation:"coteaux", denomination:"FONTINETTE ROUGE 2025",   millesime:2025, volume:500, certif:"",    tonnelier:"Saint Martin", statut:"actif", contenuActuel:480 },
  // == RATAFIA ===============================================================
  // 2019-2022
  { id:"46013", appellation:"ratafia", denomination:"RATAFIA 2019-2022", millesime:null, volume:228, certif:"", tonnelier:"SM",   statut:"actif", contenuActuel:220 },
  { id:"22.37", appellation:"ratafia", denomination:"RATAFIA 2019-2022", millesime:null, volume:228, certif:"", tonnelier:"DAMY", statut:"actif", contenuActuel:220 },
  { id:"45799", appellation:"ratafia", denomination:"RATAFIA 2019-2022", millesime:null, volume:228, certif:"", tonnelier:"FF",   statut:"actif", contenuActuel:220 },
  { id:"22.23", appellation:"ratafia", denomination:"RATAFIA 2019-2022", millesime:null, volume:228, certif:"", tonnelier:"SM",   statut:"actif", contenuActuel:220 },
  { id:"22.24", appellation:"ratafia", denomination:"RATAFIA 2019-2022", millesime:null, volume:228, certif:"", tonnelier:"",     statut:"actif", contenuActuel:220 },
  { id:"45952", appellation:"ratafia", denomination:"RATAFIA 2019-2022", millesime:null, volume:228, certif:"", tonnelier:"DAMY", statut:"actif", contenuActuel:220 },
  { id:"22.26", appellation:"ratafia", denomination:"RATAFIA 2019-2022", millesime:null, volume:228, certif:"", tonnelier:"SM",   statut:"actif", contenuActuel:220 },
  // 2023
  { id:"12",    appellation:"ratafia", denomination:"RATAFIA 2023", millesime:2023, volume:228, certif:"", tonnelier:"",   statut:"actif", contenuActuel:220 },
  { id:"82",    appellation:"ratafia", denomination:"RATAFIA 2023", millesime:2023, volume:228, certif:"", tonnelier:"",   statut:"actif", contenuActuel:220 },
  { id:"20.10", appellation:"ratafia", denomination:"RATAFIA 2023", millesime:2023, volume:228, certif:"", tonnelier:"",   statut:"actif", contenuActuel:220 },
  { id:"45830", appellation:"ratafia", denomination:"RATAFIA 2023", millesime:2023, volume:228, certif:"", tonnelier:"",   statut:"actif", contenuActuel:220 },
  { id:"45738", appellation:"ratafia", denomination:"RATAFIA 2023", millesime:2023, volume:228, certif:"", tonnelier:"SM", statut:"actif", contenuActuel:220 },
  { id:"45891", appellation:"ratafia", denomination:"RATAFIA 2023", millesime:2023, volume:228, certif:"", tonnelier:"SM", statut:"actif", contenuActuel:220 },
  // 2024
  { id:"45860", appellation:"ratafia", denomination:"RATAFIA 2024", millesime:2024, volume:228, certif:"", tonnelier:"SM", statut:"actif", contenuActuel:220 },
  { id:"22.25", appellation:"ratafia", denomination:"RATAFIA 2024", millesime:2024, volume:228, certif:"", tonnelier:"SM", statut:"actif", contenuActuel:220 },
];

// Notes de dégustation - Session du 09/04/2026
const INIT_DEGUSTATIONS = [
  { id:"d1", futId:"23.28", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Nez grillé - net droit" },
  { id:"d2", futId:"23.28", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.5, noteG:4.5, commentaire:"Equilibré, fruit/bois (mûre) - puissant équilibre" },
  { id:"d3", futId:"23.28", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:2.0, noteG:3.5, commentaire:"Moins de bois - Plus de fruit - Acide et tannique" },
  { id:"d4", futId:"23.29", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.5, commentaire:"Nez grillé - net droit - sans longueur" },
  { id:"d5", futId:"23.29", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.0, noteG:4.0, commentaire:"Patissier, plain blanc (Acidité/Acidité verte)" },
  { id:"d6", futId:"23.29", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.5, longueur:2.0, noteG:2.5, commentaire:"Plus dilué - tannique au nez & bouche" },
  { id:"d7", futId:"23.14", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.0, noteG:3.0, commentaire:"Nez similaire - net droit - vin faible" },
  { id:"d8", futId:"23.14", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.5, longueur:2.5, noteG:3.0, commentaire:"Fumé grillé - noix cajou, boisé" },
  { id:"d9", futId:"23.14", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:3.0, longueur:2.0, noteG:3.5, commentaire:"Bois - Grillé - Fumé - Vol mais bcp tannin" },
  { id:"d10", futId:"21.44", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.0, noteG:3.0, commentaire:"Net - droit (Bon mais un peu creux)" },
  { id:"d11", futId:"21.44", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:1.5, noteG:2.0, commentaire:"Manque de netteté (Terreux/végétal)" },
  { id:"d12", futId:"21.44", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:2.0, noteG:3.5, commentaire:"Plus élevé - Oxy - Vol en bouche" },
  { id:"d13", futId:"21.47", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.0, noteG:3.0, commentaire:"Nez vif, net, droit (sans prétention)" },
  { id:"d14", futId:"21.47", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.5, noteG:4.0, commentaire:"Grillé, fumé, boisé traditionnel" },
  { id:"d15", futId:"21.47", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:3.0, longueur:2.5, noteG:4.0, commentaire:"Bois +++ - Fruits - Longueur" },
  { id:"d16", futId:"22.21", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Nez OK - riche - un peu grossier - manque d\'équilibre" },
  { id:"d17", futId:"22.21", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:1.5, noteG:1.5, commentaire:"Boisé réduction grillé (vaseux)" },
  { id:"d18", futId:"22.21", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.5, longueur:1.5, noteG:2.5, commentaire:"Pas de bois au nez - Acidité - Court" },
  { id:"d19", futId:"22.29", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Nez OK, riche" },
  { id:"d20", futId:"22.29", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.0, noteG:3.0, commentaire:"Mature - Fin léger animal" },
  { id:"d21", futId:"22.29", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:3.0, noteG:4.0, commentaire:"Structuré - Acide - Equilibre & Longueur" },
  { id:"d22", futId:"20.15", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:2.5, noteG:3.5, commentaire:"Net, droit++ - belle longueur" },
  { id:"d23", futId:"20.15", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.5, noteG:3.5, commentaire:"Franc, complet, riche" },
  { id:"d24", futId:"20.15", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.0, noteG:3.5, commentaire:"Plus silex - volumineux en bouche + acidité" },
  { id:"d25", futId:"21.48", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Nez frais - riche" },
  { id:"d26", futId:"21.48", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.5, noteG:3.5, commentaire:"Franc, simple - Riche, gras, acide (Ananas?)" },
  { id:"d27", futId:"21.48", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:3.0, noteG:4.0, commentaire:"Boisé, grillé, fumée - Acidité & structuré" },
  { id:"d28", futId:"105", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:2.5, noteG:3.5, commentaire:"Joli nez + - Droit - net" },
  { id:"d29", futId:"105", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.5, noteG:2.5, commentaire:"Nez frais - Bois frais (Vif)" },
  { id:"d30", futId:"105", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:3.0, longueur:2.0, noteG:4.0, commentaire:"Fût au nez & bouche" },
  { id:"d31", futId:"22.52", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:2.0, noteG:3.0, commentaire:"Riche - beau vin - belle base" },
  { id:"d32", futId:"22.52", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.5, noteG:3.5, commentaire:"Franc - Classique - Boisé vanille (Standard, longueur aromatique vanillé)" },
  { id:"d33", futId:"22.52", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:1.0, noteG:2.5, commentaire:"Bois bien présent - pas de longueur" },
  { id:"d34", futId:"69", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Plus large - Fût fatigué" },
  { id:"d35", futId:"69", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:2.0, noteG:3.0, commentaire:"Frais - fin - équilibré (Vif, ferme, léger tannin)" },
  { id:"d36", futId:"69", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:2.0, noteG:3.5, commentaire:"Fruits rouges, fûts ? - Complexe - acide" },
  { id:"d37", futId:"23.15", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.0, noteG:3.5, commentaire:"Très droit, équilibré, agréable" },
  { id:"d38", futId:"23.15", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.0, noteG:3.0, commentaire:"Boisé présent - moins fin" },
  { id:"d39", futId:"23.15", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.5, noteG:2.5, commentaire:"Bois moins présent au nez - Leger - Pas de puissance" },
  { id:"d40", futId:"23.13", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.5, noteG:4.0, commentaire:"Droit, nez en fruit" },
  { id:"d41", futId:"23.13", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.5, noteG:4.0, commentaire:"Nez harmonieux - équilibre vin bois" },
  { id:"d42", futId:"23.13", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:3.0, noteG:3.5, commentaire:"Pas bcp de vol - tannin présent en bouche" },
  { id:"d43", futId:"22.14", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:1.5, noteG:3.5, commentaire:"Un peu fermé, gourmand, riche et bon équilibre" },
  { id:"d44", futId:"22.14", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.0, noteG:3.5, commentaire:"Fruit noir - réservé - vif - dur" },
  { id:"d45", futId:"22.14", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.0, noteG:2.5, commentaire:"Plus sur les fruits - Pas de bois - Acide & Patine" },
  { id:"d46", futId:"22.47", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.0, noteG:3.5, commentaire:"Jolie nez gourmand" },
  { id:"d47", futId:"22.47", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.5, noteG:4.0, commentaire:"Boisé, fin, un peu ?" },
  { id:"d48", futId:"22.47", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:3.0, noteG:4.0, commentaire:"Vieux bois - lactée - Longueur matière - Final acide" },
  { id:"d49", futId:"21.16", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:2.0, longueur:2.5, noteG:4.0, commentaire:"Net droit - belle longueur - complet" },
  { id:"d50", futId:"21.16", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.0, noteG:3.5, commentaire:"Boisé présent (manque de finesse)" },
  { id:"d51", futId:"21.16", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:3.0, longueur:2.0, noteG:4.0, commentaire:"Fruits & Acidité - Longueur" },
  { id:"d52", futId:"109", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:2.0, longueur:2.5, noteG:4.0, commentaire:"Nez grillé - net - droit - précis" },
  { id:"d53", futId:"109", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:2.5, noteG:3.5, commentaire:"Légère rusticité" },
  { id:"d54", futId:"109", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:3.0, noteG:4.5, commentaire:"Grillé - Fruits rouge - acidité - Longueur" },
  { id:"d55", futId:"21.39", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:2.0, longueur:2.0, noteG:3.0, commentaire:"Droit, un vin moins complet (plus creux)" },
  { id:"d56", futId:"21.39", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:2.5, noteG:2.5, commentaire:"Boisé gourmand vanillé - equilibré" },
  { id:"d57", futId:"21.39", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.0, noteG:4.0, commentaire:"Bois - Tabac blanc - Rondeur - Acidité - Fond à la fin" },
  { id:"d58", futId:"22.38", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:2.5, longueur:2.5, noteG:4.0, commentaire:"Beau nez - net droit - un peu faible" },
  { id:"d59", futId:"22.38", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:3.0, noteG:4.0, commentaire:"Boisé équilibré" },
  { id:"d60", futId:"22.38", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.5, longueur:3.0, noteG:4.0, commentaire:"Moins de vol - Plus d\'acidité & longueur" },
  { id:"d61", futId:"104", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Nez grillé, net, droit, sec, fruit léger" },
  { id:"d62", futId:"104", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.0, noteG:3.0, commentaire:"Boisé - moins fin" },
  { id:"d63", futId:"104", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.5, longueur:2.5, noteG:4.5, commentaire:"Plus d\'alcool - Bois sec - Acidité - Austère" },
  { id:"d64", futId:"81", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Joli nez - fleurs - net droit - bon vin un peu marqué" },
  { id:"d65", futId:"81", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.0, noteG:3.0, commentaire:"boisé - fruit rouge, acidulé (groseille)" },
  { id:"d66", futId:"81", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.5, longueur:2.5, noteG:2.5, commentaire:"Pas beaucoup d\'évolution - fumé - Lacté" },
  { id:"d67", futId:"23.26", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:2.0, noteG:3.5, commentaire:"Nez plus structuré - net droit - riche, bien construit" },
  { id:"d68", futId:"23.26", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.5, longueur:2.0, noteG:3.5, commentaire:"Boisé poivré" },
  { id:"d69", futId:"23.26", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:3.0, longueur:1.5, noteG:3.5, commentaire:"Moins expressif au nez - Bouche équilibré" },
  { id:"d70", futId:"23.27", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:2.0, longueur:2.5, noteG:4.0, commentaire:"Goût boisé, net droit riche et gourmand" },
  { id:"d71", futId:"23.27", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:1.5, noteG:3.0, commentaire:"Nez riche expressif" },
  { id:"d72", futId:"23.27", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.5, longueur:2.0, noteG:2.5, commentaire:"Léger - Manque de vol - pas très expressif" },
  { id:"d73", futId:"22.41", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:2.5, noteG:4.0, commentaire:"Nez droit - franc, droit, pur" },
  { id:"d74", futId:"22.41", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.0, noteG:3.5, commentaire:"Complet - aromatique (grillé) - simple" },
  { id:"d75", futId:"22.41", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.5, longueur:1.0, noteG:3.0, commentaire:"Bois présent - tannique & Acide - ?" },
  { id:"d76", futId:"22.30", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:3.5, noteG:4.0, commentaire:"Droit - net - belle longueur - vivant" },
  { id:"d77", futId:"22.30", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:2.0, noteG:3.5, commentaire:"Fruit rouge - boisé frais" },
  { id:"d78", futId:"22.30", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.5, longueur:3.0, noteG:4.0, commentaire:"Pas bcp d\'expression au nez - Acidité fût +++" },
  { id:"d79", futId:"34", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:2.0, longueur:2.5, noteG:4.0, commentaire:"Belle longueur - droit & complet" },
  { id:"d80", futId:"34", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.5, longueur:2.0, noteG:3.0, commentaire:"Complet - léger - fruit rouge - Harmonieux et équilibré" },
  { id:"d81", futId:"34", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.0, noteG:3.5, commentaire:"Plus d\'équilibre, volume et acidité manque de ?" },
  { id:"d82", futId:"21.30", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.5, noteG:3.5, commentaire:"Net, frais, droit, riche, complet" },
  { id:"d83", futId:"21.30", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:2.0, noteG:2.5, commentaire:"Faible bois - Leger terreux (Intensité faible)" },
  { id:"d84", futId:"21.30", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.0, noteG:3.5, commentaire:"Evolution - bois - Lactée - Acidité & tannin" },
  { id:"d85", futId:"57", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.5, noteG:4.0, commentaire:"Frais au nez, riche, complexe" },
  { id:"d86", futId:"57", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.0, noteG:3.5, commentaire:"Expressif harmonieux - vanille - complet/simple" },
  { id:"d87", futId:"57", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:0.5, longueur:1.0, noteG:2.0, commentaire:"Oxydée - fatiguée - Acidité et pas de corps" },
  { id:"d88", futId:"20.40", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Fin, net, droit, complexe, dense" },
  { id:"d89", futId:"20.40", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:1.5, noteG:3.0, commentaire:"Frais vert - malique" },
  { id:"d90", futId:"20.40", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Leger végétale - Fruits blanc - manque de longueur" },
  { id:"d91", futId:"71", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Jolie vin, net, droit, belle finesse" },
  { id:"d92", futId:"71", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:2.0, noteG:3.0, commentaire:"Simple - franc (Acidité)" },
  { id:"d93", futId:"71", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.0, noteG:3.0, commentaire:"Vanille - bois fin - toujours un manque de vol en bouche" },
  { id:"d94", futId:"45682", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:3.0, longueur:2.5, noteG:4.5, commentaire:"Net - droit - franc & complet" },
  { id:"d95", futId:"45682", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:3.0, longueur:2.5, noteG:3.5, commentaire:"Viande grillée (Chassin?) - Final tannique/Sciure" },
  { id:"d96", futId:"45682", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:3.0, longueur:2.0, noteG:3.0, commentaire:"Bois +++ / Bois et vins 2 choses différentes" },
  { id:"d97", futId:"21.20", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.5, noteG:4.0, commentaire:"Jolie nez frais - net - franc & droit en fruit" },
  { id:"d98", futId:"21.20", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.0, noteG:4.0, commentaire:"Chêne chaud/Fruit frais - Complet - riche - rond - gras équilibré" },
  { id:"d99", futId:"21.20", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.5, longueur:1.0, noteG:3.5, commentaire:"Plus terreux - acidité & Tannique en bouche" },
  { id:"d100", futId:"21.41", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:3.0, noteG:4.0, commentaire:"Fruité - Net et précis" },
  { id:"d101", futId:"21.41", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.5, longueur:2.0, noteG:3.5, commentaire:"Vanillé - sucrant" },
  { id:"d102", futId:"21.41", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.5, longueur:1.5, noteG:3.5, commentaire:"Grillé - Fumée - Fruit rouge - Bien - Leger ?" },
  { id:"d103", futId:"22.13", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:2.0, noteG:3.5, commentaire:"Jolie nez - net - droit - tendu" },
  { id:"d104", futId:"22.13", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.0, noteG:3.5, commentaire:"Boisé - vanillé (Classique, puissance/acidité)" },
  { id:"d105", futId:"22.13", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.0, noteG:4.0, commentaire:"Fût bien intégré, acidité, longueur" },
  { id:"d106", futId:"45923", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Riche - droit - net - beau fruit - bonne base" },
  { id:"d107", futId:"45923", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.5, longueur:2.0, noteG:3.0, commentaire:"Complet - puissant - acide" },
  { id:"d108", futId:"45923", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:3.0, longueur:2.0, noteG:3.5, commentaire:"Bois + plus d\'évolution mais belle acidité" },
  { id:"d109", futId:"23.22", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Belle base" },
  { id:"d110", futId:"23.22", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:2.5, noteG:4.0, commentaire:"Frais - franc - Structure aérienne - légère - final technique" },
  { id:"d111", futId:"23.22", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:1.5, noteG:2.5, commentaire:"Plat, bois, oxydation" },
  { id:"d112", futId:"23.23", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Belle longueur - riche - net - droit" },
  { id:"d113", futId:"23.23", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.5, noteG:4.0, commentaire:"Evolué - mature ox (Acidité fraiche)" },
  { id:"d114", futId:"23.23", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.5, noteG:4.0, commentaire:"Acidité, corp longueur (Léger tannin en fin de bouche)" },
  { id:"d115", futId:"22.42", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:2.0, noteG:3.5, commentaire:"Nez floral - belle longueur - riche & droit" },
  { id:"d116", futId:"22.42", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:2.0, noteG:4.0, commentaire:"Crémeux - Calcaire - Fruit complexité" },
  { id:"d117", futId:"22.42", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.5, noteG:3.5, commentaire:"Acidité, tannin léger végétale" },
  { id:"d118", futId:"23.16", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.0, noteG:3.5, commentaire:"Riche - beau - droit - complet" },
  { id:"d119", futId:"23.16", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.5, noteG:4.0, commentaire:"Frais - légèrement mentholé?" },
  { id:"d120", futId:"23.16", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:2.0, noteG:4.0, commentaire:"Léger fumé - Grillé - longueur puis acidité" },
  { id:"d121", futId:"23.24", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:3.0, noteG:3.5, commentaire:"Frais, gourmand - complet - beau vin" },
  { id:"d122", futId:"23.24", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.0, noteG:4.0, commentaire:"Fumée viande grillée (Faible intensité)" },
  { id:"d123", futId:"23.24", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.5, longueur:2.0, noteG:3.5, commentaire:"Bois mieux intégré au nez - Bouche plus expressive - Final acide" },
  { id:"d124", futId:"22.17", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.5, commentaire:"Gourmand Beurré - Mais légère réduction" },
  { id:"d125", futId:"22.17", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:1.0, noteG:3.0, commentaire:"Frais - franc - fumé ; grain rugueux - Longueur moyenne" },
  { id:"d126", futId:"22.17", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.0, noteG:3.0, commentaire:"Beurré - pas bcp de longueur - technique" },
  { id:"d127", futId:"23.18", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:2.0, noteG:3.5, commentaire:"Nez ok, droit riche en finesse, net, droit" },
  { id:"d128", futId:"23.18", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.5, noteG:2.0, commentaire:"Vif - grillé - cuir frais (Ferme, vif)" },
  { id:"d129", futId:"23.18", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:1.0, noteG:1.0, commentaire:"Animal + végetal (Acide mais pas concentré) ? brette" },
  { id:"d130", futId:"23.19", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:2.0, noteG:3.5, commentaire:"Jolie nez, net, droit, plus de tension" },
  { id:"d131", futId:"23.19", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:2.0, noteG:2.5, commentaire:"Simple - Acidité, vif, frais" },
  { id:"d132", futId:"23.19", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:3.0, noteG:4.0, commentaire:"Pas bcp de bois mais longueur et tannin" },
  { id:"d133", futId:"21.14", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.5, noteG:4.0, commentaire:"Jolie nez floral, frais, belle longueur plus complet" },
  { id:"d134", futId:"21.14", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:1.5, noteG:3.5, commentaire:"Mine de crayons + d\'acidité - minéralité (tuffeaux)" },
  { id:"d135", futId:"21.14", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:2.5, noteG:3.0, commentaire:"Patisserie - Beurre - Tannin + intégré au vin" },
  { id:"d136", futId:"23.25", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.5, noteG:4.0, commentaire:"Belle fraîcheur, très droit, complet, beau vin" },
  { id:"d137", futId:"23.25", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:1.5, noteG:3.5, commentaire:"Nez frais - floral & boisé chêne (Harmonieux complet)" },
  { id:"d138", futId:"23.25", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:2.0, noteG:3.5, commentaire:"Fruits à noyaux - Pas bcp de vol - Final tannique" },
  { id:"d139", futId:"23.20", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:2.0, longueur:2.0, noteG:3.5, commentaire:"Nez gras - beurré (en malo?) beau bois" },
  { id:"d140", futId:"23.20", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.0, noteG:4.0, commentaire:"Nez équilibré (vin/bois)" },
  { id:"d141", futId:"23.20", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.0, noteG:3.0, commentaire:"Beurre - Vanille - Corp - Acidité & Tannin" },
  { id:"d142", futId:"23.21", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.0, noteG:4.0, commentaire:"Jolie nez, franc, légère reduc en beurre" },
  { id:"d143", futId:"23.21", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:1.0, noteG:3.0, commentaire:"Franc/fumé (cendre) - Faible expression du vin" },
  { id:"d144", futId:"23.21", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.0, noteG:3.0, commentaire:"Grillé - Bois - Pas de corp central - Tannique" },
  { id:"d145", futId:"22.16", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:3.0, noteG:2.5, commentaire:"Large - riche - Un peu grossier" },
  { id:"d146", futId:"22.16", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:1.5, noteG:3.0, commentaire:"Expressif - Puissant" },
  { id:"d147", futId:"22.16", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:2.0, noteG:2.5, commentaire:"Reglisse? Aerer - Manque de vol - Pointe acide" },
  { id:"d148", futId:"22.76", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.0, noteG:2.5, commentaire:"Oeil coloré - riche - droit bien fait" },
  { id:"d149", futId:"22.76", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.5, noteG:4.0, commentaire:"Leger oeil - fruit rouge (Fraise) gourmand - Vif" },
  { id:"d150", futId:"22.76", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.5, longueur:2.5, noteG:4.0, commentaire:"Légère acidité, volume, vin complet" },
  { id:"d151", futId:"22.54", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.0, noteG:2.5, commentaire:"Nez riche, plus ostère - Sans défaut mais lourd" },
  { id:"d152", futId:"22.54", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.0, noteG:2.0, commentaire:"Boisé - Fruits confiture" },
  { id:"d153", futId:"22.54", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:1.5, noteG:2.5, commentaire:"Bois mais Léger dilution, tannin à la fin" },
  { id:"d154", futId:"22.44", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.5, longueur:2.5, noteG:4.0, commentaire:"Frais, droit, complet - beau vin" },
  { id:"d155", futId:"22.44", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:2.0, noteG:3.0, commentaire:"Grillé, léger fumée" },
  { id:"d156", futId:"22.44", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:2.0, noteG:2.0, commentaire:"Réduit - Bois en bouche - longueur - Structure - Tannin" },
  { id:"d157", futId:"22.18", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.5, commentaire:"Nez légère réduction - frais - droit - plus ostère" },
  { id:"d158", futId:"22.18", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.0, longueur:2.0, noteG:4.0, commentaire:"Harmonieux - meilleur équilibre vin/bois" },
  { id:"d159", futId:"22.18", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:2.0, noteG:1.5, commentaire:"Réduit - Plat - Pas de volume - Tanique - ?" },
  { id:"d160", futId:"21.24", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.0, commentaire:"Nez réduit - Beau vin équilibré - net" },
  { id:"d161", futId:"21.24", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.5, noteG:4.0, commentaire:"Boisé - fin - complet (Rugueux, puissance, tannique)" },
  { id:"d162", futId:"21.24", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:1.0, longueur:2.0, noteG:3.5, commentaire:"Bois & réduction - complexe au nez - Volume en bouche" },
  { id:"d163", futId:"21.49", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.5, commentaire:"Jolie vin - complet + belle tension" },
  { id:"d164", futId:"21.49", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:1.5, noteG:2.5, commentaire:"Franc - Puissant - Gourmand" },
  { id:"d165", futId:"21.49", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.5, longueur:1.5, noteG:3.5, commentaire:"Pas très nette mais bois ok sur le finale" },
  { id:"d166", futId:"25.22", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:2.5, longueur:2.5, noteG:4.0, commentaire:"Frais - droit - beau chardo" },
  { id:"d167", futId:"25.22", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.5, noteG:4.0, commentaire:"Body building ; Gras - puissant - rustique - fruité - lourd" },
  { id:"d168", futId:"25.22", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.0, noteG:4.0, commentaire:"Intense, fruits blanc - Acidité, fût très bien" },
  { id:"d169", futId:"25.21", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.5, noteG:3.5, commentaire:"Moins précis - net - plus ostère" },
  { id:"d170", futId:"25.21", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:2.0, longueur:2.0, noteG:3.5, commentaire:"Réservé - grillé - fin" },
  { id:"d171", futId:"25.21", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.0, longueur:2.5, noteG:3.5, commentaire:"Pas très propre, animal, fût bien intégré" },
  { id:"d172", futId:"103", session:"09/04/2026", date:"2026-04-09", degustateur:"Flavien", boise:1.0, longueur:1.0, noteG:3.0, commentaire:"?" },
  { id:"d173", futId:"103", session:"09/04/2026", date:"2026-04-09", degustateur:"Sébastien", boise:1.5, longueur:2.0, noteG:3.5, commentaire:"Puissant - Equilibré - complexe Rustique - Manque de finesse" },
  { id:"d174", futId:"103", session:"09/04/2026", date:"2026-04-09", degustateur:"Ricardo", boise:2.5, longueur:1.5, noteG:3.0, commentaire:"Complexe - Dense / Torréfié mais plat" },
];

const TYPES_MOUVEMENT = [
  { value:"ouillage",    label:"Ouillage",               icon:"ti-droplet",        color:"#185FA5" },
  { value:"soutirage",   label:"Soutirage (fût &rarr; fût)",  icon:"ti-arrows-exchange",color:"#1a7a40" },
  { value:"ecoulage",    label:"Écoulage partiel",        icon:"ti-droplet-half-2", color:"#c47800" },
  { value:"perte",       label:"Perte de volume",         icon:"ti-droplet-off",    color:"#cc2222" },
  { value:"vidange",     label:"Vidange complète",        icon:"ti-circle-x",       color:"#8B0000" },
  { value:"remplissage", label:"Remplissage cuve",        icon:"ti-droplet-filled", color:"#533AB7" },
  { value:"batonnage",   label:"Bâtonnage",               icon:"ti-refresh",        color:"#5F5E5A" },
  { value:"ajout_produit",label:"Ajout produit",          icon:"ti-flask",          color:"#BA7517" },
  { value:"entonnage",    label:"Entonnage",               icon:"ti-beer",           color:"#7a5200" },
  { value:"mutage",       label:"Mutage (bourbes + alcool)", icon:"ti-flask",          color:"#8B0000" },
];


// Appellations fixes (non liées au millésime)
const APPELLATION_FIXED = {
  vins_reserve: { label:"Vins de réserve", color:"#7a5200", bg:"#fde8b8", border:"#c89020" },
  ri:           { label:"RI",              color:"#185FA5", bg:"#d4e8f8", border:"#4a90d9" },
  coteaux:      { label:"Coteaux",         color:"#8B0000", bg:"#fdd0d0", border:"#c85050" },
  ratafia:      { label:"Ratafia",         color:"#5c2a08", bg:"#ecd8c4", border:"#9a6040" },
};
// Couleur unique pour tous les vins clairs (peu importe le millésime)
const VINS_CLAIRS_COLOR = { color:"#2d6a00", bg:"#d4edc0", border:"#7ab84880" };

// Retourne le config d'appellation pour un fût donné
function getApc(appellation) {
  if(!appellation) return { color:"#5a4a30", bg:"transparent", border:"#2a2a2c" };
  if(appellation.startsWith("vins_clairs")) return { ...VINS_CLAIRS_COLOR, label: appellation.replace("vins_clairs_","Vins clairs ").replace("vins_clairs","Vins clairs") };
  return APPELLATION_FIXED[appellation] || { color:"#5a4a30", bg:"transparent", border:"#2a2a2c" };
}

// Constante APPELLATION pour les sélecteurs - reconstituée dynamiquement dans le composant
const APPELLATION = {
  vins_reserve: APPELLATION_FIXED.vins_reserve,
  ri:           APPELLATION_FIXED.ri,
  coteaux:      APPELLATION_FIXED.coteaux,
  ratafia:      APPELLATION_FIXED.ratafia,
};
const fmtDate = (d) => new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
const typeLabel = (v) => TYPES_MOUVEMENT.find(t=>t.value===v)?.label||v;
const typeColor = (v) => TYPES_MOUVEMENT.find(t=>t.value===v)?.color||"#888";
const avg = (arr) => arr.length ? +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) : null;
const stars = (n,max=5) => { if(!n) return "-"; const f=Math.round(n); return "*".repeat(f)+"o".repeat(max-f); };

// localStorage supprime - Firebase uniquement


const HIST_TRAITEMENTS = [
  // 2025
  {campagne:"2025",numero:"1",date:"2025-04-04",surface:"2.90 ha",cuivreTotal:250,produits:[{nom:"Bouillie Bordelaise",dose:"0.7kg/ha",matiereActive:"Cuivre",cuivre:250},{nom:"Nordox",dose:"130g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"5kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"2",date:"2025-04-15",surface:"8.68 ha",cuivreTotal:275,produits:[{nom:"Bouillie Bordelaise",dose:"1kg/ha",matiereActive:"Cuivre",cuivre:275},{nom:"Nordox",dose:"100g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"8kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"1.5l/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"3",date:"2025-04-25",surface:"8.68 ha",cuivreTotal:200,produits:[{nom:"Bouillie Bordelaise",dose:"1kg/ha",matiereActive:"Cuivre",cuivre:200},{nom:"Microthiol",dose:"8kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"4",date:"2025-04-30",surface:"3.50 ha",cuivreTotal:200,produits:[{nom:"Bouillie Bordelaise",dose:"1kg/ha",matiereActive:"Cuivre",cuivre:200},{nom:"Microthiol",dose:"8kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2.5l/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"5",date:"2025-05-08",surface:"7 ha",cuivreTotal:300,produits:[{nom:"Champ Flo",dose:"0.71l/ha",matiereActive:"Cuivre",cuivre:300},{nom:"Nordox",dose:"50g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"8kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2.5l/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"6",date:"2025-05-16",surface:"7 ha",cuivreTotal:300,produits:[{nom:"Champ Flo",dose:"0.71l/ha",matiereActive:"Cuivre",cuivre:300},{nom:"Nordox",dose:"50g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"8kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2.5l/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"7",date:"2025-05-21",surface:"8.68 ha",cuivreTotal:200,produits:[{nom:"Bouillie Bordelaise",dose:"1kg/ha",matiereActive:"Cuivre",cuivre:200},{nom:"Microthiol",dose:"8kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2.5l/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"8",date:"2025-05-28",surface:"7 ha",cuivreTotal:363,produits:[{nom:"Cham Flow",dose:"0.71l/ha",matiereActive:"Cuivre",cuivre:363},{nom:"Bouillie Bordelaise",dose:"230g/ha",matiereActive:"Cuivre"},{nom:"Nordox",dose:"86g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"10kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"9",date:"2025-06-04",surface:"8.68 ha",cuivreTotal:115,produits:[{nom:"Bouillie Bordelaise",dose:"0.57kg/ha",matiereActive:"Cuivre",cuivre:115},{nom:"Microthiol",dose:"7.5kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"10",date:"2025-06-10",surface:"8.68 ha",cuivreTotal:100,produits:[{nom:"Bouillie Bordelaise",dose:"0.5kg/ha",matiereActive:"Cuivre",cuivre:100},{nom:"Microthiol",dose:"7.5kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"11",date:"2025-06-13",surface:"3.50 ha",cuivreTotal:100,produits:[{nom:"Bouillie Bordelaise",dose:"0.5kg/ha",matiereActive:"Cuivre",cuivre:100},{nom:"Microthiol",dose:"7kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"12",date:"2025-06-18",surface:"8.68 ha",cuivreTotal:200,produits:[{nom:"Bouillie Bordelaise",dose:"1kg",matiereActive:"Cuivre",cuivre:200},{nom:"Microthiol",dose:"5kg",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"13",date:"2025-06-27",surface:"8.68 ha",cuivreTotal:200,produits:[{nom:"Bouillie Bordelaise",dose:"1kg",matiereActive:"Cuivre",cuivre:200},{nom:"Microthiol",dose:"7kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"14",date:"2025-07-03",surface:"8.68 ha",cuivreTotal:200,produits:[{nom:"Bouillie Bordelaise",dose:"0.5g/ha",matiereActive:"Cuivre",cuivre:200},{nom:"Nordox",dose:"143g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"5kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2025",numero:"15",date:"2025-07-16",surface:"8.68 ha",cuivreTotal:200,produits:[{nom:"Bouillie Bordelaise",dose:"0.5g/ha",matiereActive:"Cuivre",cuivre:200},{nom:"Nordox",dose:"143g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"4.5kg/ha",matiereActive:"Soufre"},{nom:"Armicarb",dose:"3kg/ha"}]},
  // 2024
  {campagne:"2024",numero:"1",date:"2024-03-28",surface:"2.60 ha",cuivreTotal:200,produits:[{nom:"Bouillie Bordelaise",dose:"1kg/ha",matiereActive:"Cuivre",cuivre:200},{nom:"HelioSoufre",dose:"3l/ha",matiereActive:"Soufre"},{nom:"Microthiol",dose:"3kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"2",date:"2024-03-31",surface:"8.20 ha",cuivreTotal:240,produits:[{nom:"Bouillie Bordelaise",dose:"800g/ha",matiereActive:"Cuivre",cuivre:240},{nom:"Nordox",dose:"60g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"5kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"3",date:"2024-04-05",surface:"8.20 ha",cuivreTotal:350,produits:[{nom:"Champ Flo",dose:"0.7l/ha",matiereActive:"Cuivre",cuivre:350},{nom:"Nordox",dose:"70g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"8kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"4",date:"2024-04-12",surface:"8.20 ha",cuivreTotal:280,produits:[{nom:"Bouillie Bordelaise",dose:"1kg/ha",matiereActive:"Cuivre",cuivre:280},{nom:"Nordox",dose:"60g",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"8kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"5",date:"2024-04-15",surface:"8.20 ha",cuivreTotal:240,produits:[{nom:"Bouillie Bordelaise",dose:"1kg/ha",matiereActive:"Cuivre",cuivre:240},{nom:"Nordox",dose:"30g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"8kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"6",date:"2024-04-17",surface:"8.20 ha",cuivreTotal:140,produits:[{nom:"Bouillie Bordelaise",dose:"0.5kg/ha",matiereActive:"Cuivre",cuivre:140},{nom:"Nordox",dose:"30g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"6kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"7",date:"2024-04-22",surface:"8.20 ha",cuivreTotal:204,produits:[{nom:"Champ Flo",dose:"57cl/ha",matiereActive:"Cuivre",cuivre:204},{nom:"Microthiol",dose:"6kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"8",date:"2024-04-25",surface:"8.20 ha",cuivreTotal:100,produits:[{nom:"Bouillie Bordelaise",dose:"0.5kg/ha",matiereActive:"Cuivre",cuivre:100},{nom:"Microthiol",dose:"6kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"9",date:"2024-04-30",surface:"8.20 ha",cuivreTotal:280,produits:[{nom:"Champ Flo",dose:"55cl/ha",matiereActive:"Cuivre",cuivre:280},{nom:"Nordox",dose:"60g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"6kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"10",date:"2024-05-02",surface:"8.20 ha",cuivreTotal:280,produits:[{nom:"Champ Flo",dose:"55cl/ha",matiereActive:"Cuivre",cuivre:280},{nom:"Nordox",dose:"60g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"6kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"11",date:"2024-05-06",surface:"8.20 ha",cuivreTotal:200,produits:[{nom:"Bouillie Bordelaise",dose:"1kg/ha",matiereActive:"Cuivre",cuivre:200},{nom:"Essen-ciel",dose:"1l/ha",matiereActive:"Huile"},{nom:"Microthiol",dose:"6kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"2l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"12",date:"2024-05-15",surface:"8.60 ha",cuivreTotal:300,produits:[{nom:"Bouillie Bordelaise",dose:"1.5kg/ha",matiereActive:"Cuivre",cuivre:300},{nom:"Microthiol",dose:"10kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"13",date:"2024-05-21",surface:"8.20 ha",cuivreTotal:215,produits:[{nom:"Champ Flo",dose:"0.6l/ha",matiereActive:"Cuivre",cuivre:215},{nom:"Microthiol",dose:"10kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"14",date:"2024-05-23",surface:"8.20 ha",cuivreTotal:180,produits:[{nom:"Champ Flo",dose:"0.5l/ha",matiereActive:"Cuivre",cuivre:180},{nom:"Microthiol",dose:"10kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"15",date:"2024-05-29",surface:"8.20 ha",cuivreTotal:180,produits:[{nom:"Champ Flo",dose:"0.5l/ha",matiereActive:"Cuivre",cuivre:180},{nom:"Microthiol",dose:"10kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"16",date:"2024-06-01",surface:"8.20 ha",cuivreTotal:300,produits:[{nom:"Bouillie Bordelaise",dose:"500g/ha",matiereActive:"Cuivre",cuivre:300},{nom:"Nordox",dose:"250g/ha",matiereActive:"Cuivre"},{nom:"HelioSoufre",dose:"3l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"17",date:"2024-06-03",surface:"8.20 ha",cuivreTotal:300,produits:[{nom:"Bouillie Bordelaise",dose:"1.5kg",matiereActive:"Cuivre",cuivre:300},{nom:"HelioSoufre",dose:"7l/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"18",date:"2024-06-07",surface:"8.20 ha",cuivreTotal:300,produits:[{nom:"Bouillie Bordelaise",dose:"1.5kg",matiereActive:"Cuivre",cuivre:300},{nom:"HelioSoufre",dose:"3l",matiereActive:"Soufre"},{nom:"Microthiol",dose:"7kg/ha",matiereActive:"Soufre"},{nom:"Essen-ciel",dose:"1l/ha",matiereActive:"Orange"}]},
  {campagne:"2024",numero:"19",date:"2024-06-13",surface:"8.20 ha",cuivreTotal:230,produits:[{nom:"Champ Flo",dose:"0.5l/ha",matiereActive:"Cuivre",cuivre:230},{nom:"Nordox",dose:"60g/ha",matiereActive:"Cuivre"},{nom:"HelioSoufre",dose:"3l/ha",matiereActive:"Soufre"},{nom:"Microthiol",dose:"7kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"20",date:"2024-06-14",surface:"8.20 ha",cuivreTotal:180,produits:[{nom:"Champ Flo",dose:"0.5l/ha",matiereActive:"Cuivre",cuivre:180},{nom:"HelioSoufre",dose:"3l/ha",matiereActive:"Soufre"},{nom:"Microthiol",dose:"7kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"21",date:"2024-06-20",surface:"8.20 ha",cuivreTotal:300,produits:[{nom:"Champ Flo",dose:"0.8l/ha",matiereActive:"Cuivre",cuivre:300},{nom:"Microthiol",dose:"10kg/ha",matiereActive:"Soufre"},{nom:"Essen-ciel",dose:"1l/ha",matiereActive:"Orange"}]},
  {campagne:"2024",numero:"22",date:"2024-06-27",surface:"8.20 ha",cuivreTotal:300,produits:[{nom:"Bouillie Bordelaise",dose:"1.5kg/ha",matiereActive:"Cuivre",cuivre:300},{nom:"Microthiol",dose:"9kg/ha",matiereActive:"Soufre"},{nom:"HelioSoufre",dose:"1l/ha",matiereActive:"Soufre"},{nom:"Essen-ciel",dose:"1l/ha",matiereActive:"Orange"}]},
  {campagne:"2024",numero:"23",date:"2024-07-01",surface:"8.20 ha",cuivreTotal:412,produits:[{nom:"Bouillie Bordelaise",dose:"1.5kg/ha",matiereActive:"Cuivre",cuivre:412},{nom:"Nordox",dose:"150g/ha",matiereActive:"Cuivre"},{nom:"Microthiol",dose:"9kg/ha",matiereActive:"Soufre"}]},
  {campagne:"2024",numero:"24",date:"2024-07-10",surface:"8.20 ha",cuivreTotal:400,produits:[{nom:"Bouillie Bordelaise",dose:"1kg/ha",matiereActive:"Cuivre",cuivre:400},{nom:"Nordox",dose:"270g/ha",matiereActive:"Cuivre"}]},
];

export default function App() {
  const [appError, setAppError] = useState(null);
  const [tonneaux,      setTonneaux]      = useState(INIT_TONNEAUX);
  const [mouvements,    setMouvements]    = useState([]);
  const [degustations,  setDegustations]  = useState(INIT_DEGUSTATIONS);
  const [degustateurs,  setDegustateurs]  = useState(["Flavien","Sébastien","Ricardo","Julien","Clément","Thib","Arthur","Gas'"].map(n=>({nom:n,actif:true})));
  const [editingDeg,    setEditingDeg]    = useState(false);
  const [degDraft,      setDegDraft]      = useState([]);

  const [view,        setView]        = useState("dashboard");
  const [selectedFut, setSelectedFut] = useState(null);
  const [ficheTab,    setFicheTab]    = useState("infos"); // infos | mouvements | degustations
  const [searchFut,   setSearchFut]   = useState("");
  const [filterDenom,      setFilterDenom]      = useState("");
  const [filterStatut,     setFilterStatut]     = useState("");
  const [filterStockLieu,  setFilterStockLieu]  = useState("");
  const [filterStockCuvee, setFilterStockCuvee] = useState("");
  const [riRequis,         setRiRequis]         = useState([]);
  const [showRiForm,       setShowRiForm]       = useState(false);
  const [riForm,           setRiForm]           = useState({annee:new Date().getFullYear().toString(),volumeHL:""});
  const [stockTab,         setStockTab]         = useState("champagne");
  const [lotAction,        setLotAction]        = useState(null);
  const [showSortieForm,   setShowSortieForm]   = useState(false);
  const [coiffesStock,     setCoiffesStock]     = useState([]);
  const [coiffesCRD,       setCoiffesCRD]       = useState(0);
  const [coiffesExport,    setCoiffesExport]     = useState(0);
  const [showCoiffesForm,  setShowCoiffesForm]   = useState(false);
  const [showHistSorties,  setShowHistSorties]   = useState(false);
  const [showHistCoiffes,  setShowHistCoiffes]   = useState(true);
  const [coiffesForm,      setCoiffesForm]       = useState({type:"CRD",qte:"",operation:"achat"});
  const [sortieForm,       setSortieForm]       = useState({lotId:"",date:new Date().toISOString().slice(0,10),qte:"",notes:""});
  const [filterStockStatut,setFilterStockStatut]= useState("");
  const [filterStock15,    setFilterStock15]    = useState("");
  const [filterAppellation, setFilterAppellation] = useState("");
  const [filterOp,         setFilterOp]         = useState("");
  const [filterDegFut,     setFilterDegFut]     = useState("");
  const [filterDegCuvee,   setFilterDegCuvee]   = useState("");
  const [filterDegFabric,  setFilterDegFabric]  = useState("");
  const [filterFut,   setFilterFut]   = useState("");
  const [showMvtForm, setShowMvtForm] = useState(false);
  const [showDegForm, setShowDegForm] = useState(false);
  const [showImport,  setShowImport]  = useState(false);
  const [showReset,    setShowReset]    = useState(false);
  const [showEditDeg,  setShowEditDeg]  = useState(false);
  const [showCampForm, setShowCampForm] = useState(false);
  const [showTirageForm,     setShowTirageForm]     = useState(false);
  const [showDegorgeForm,   setShowDegorgeForm]   = useState(false);
  const [traitements,      setTraitements]       = useState([]);
  const [stockProduits,    setStockProduits]     = useState([]);
  const [stockBouteilles,  setStockBouteilles]  = useState([]);
  const [showStockProdForm,setShowStockProdForm] = useState(false);
  const [editingStockProd, setEditingStockProd]  = useState(null);
  const [showImportBL,     setShowImportBL]      = useState(false);
  const [importBLResult,   setImportBLResult]    = useState([]);
  const [importBLLoading,  setImportBLLoading]   = useState(false);
  const PRODUIT_EMPTY = {nom:"",nAmm:"",substanceActive:"Cuivre",teneurCuivre:"",unite:"kg",stockActuel:"",fournisseur:"",observations:""};
  const [produitForm,      setProduitForm]       = useState(PRODUIT_EMPTY);
  const [surfaceCalcul,    setSurfaceCalcul]     = useState("9.30");
  // teneurCuivre = g de cuivre metal par kg ou par L de produit
  // Ex: Bouillie Bordelaise 20% cuivre = 200g/kg
  const CATALOGUE_PRODUITS = [
    {nom:"Bouillie Bordelaise RSR Disperss NC",nAmm:"9800474",substanceActive:"Cuivre",teneurCuivre:200,unite:"kg",fournisseur:""},
    {nom:"Nordox 75 WG",nAmm:"2010130",substanceActive:"Cuivre",teneurCuivre:750,unite:"kg",fournisseur:""},
    {nom:"Champ Flo Ampli",nAmm:"2000517",substanceActive:"Cuivre",teneurCuivre:300,unite:"L",fournisseur:"Nufarm"},
    {nom:"Microthiol Special Disperss",nAmm:"9800245",substanceActive:"Soufre",teneurCuivre:0,unite:"kg",fournisseur:""},
    {nom:"Heliosoufre",nAmm:"9000222",substanceActive:"Soufre",teneurCuivre:0,unite:"L",fournisseur:""},
    {nom:"Pyrevert",nAmm:"2080038",substanceActive:"Autre",teneurCuivre:0,unite:"L",fournisseur:"Valagro"},
  ];
  const [amendements,      setAmendements]       = useState([]);
  const [showTraitForm,    setShowTraitForm]     = useState(false);
  const [editingTrait,     setEditingTrait]      = useState(null);
  const [filterTraitAn,    setFilterTraitAn]     = useState(new Date().getFullYear().toString());
  const [vigneTab,         setVigneTab]          = useState("traitements");
  const [campagnesClosees, setCampagnesClosees]  = useState([]);
  const [pdfDocs,          setPdfDocs]          = useState([]);
  const [uploadingPdf,     setUploadingPdf]     = useState(false);
  const [pdfFactures,      setPdfFactures]      = useState([]);
  const [biodynamies,      setBiodynamies]       = useState([]);
  const [showBiodyForm,    setShowBiodyForm]     = useState(false);
  const [editingBiody,     setEditingBiody]      = useState(null);
  const [showAmendForm,    setShowAmendForm]     = useState(false);
  const [editingAmend,     setEditingAmend]      = useState(null);
  const [biodyForm,        setBiodyForm]         = useState({campagne:new Date().getFullYear().toString(),date:"",surface:"",produit:"",observations:""});
  const [amendForm,        setAmendForm]         = useState({campagne:new Date().getFullYear().toString(),parcelle:"",surface:"",produit:"",quantite:"",nTotal:"",nParHa:"",observations:""});
  const TRAIT_EMPTY = {
    campagne: new Date().getFullYear().toString(),
    numero: "",
    date: "",
    surface: "",
    operateur: "",
    produits: [],
    cuivreTotal: "",
    observations: "",
    type: "traitement",
  };
  const [traitForm, setTraitForm] = useState(TRAIT_EMPTY);
  const [traitProduit, setTraitProduit] = useState({nom:"", dose:"", unite:"kg", matiereActive:"", teneurCuivre:"", cuivre:""});
  const [showTraitProduit, setShowTraitProduit] = useState(false);
  const [editingDegorge,    setEditingDegorge]    = useState(null);
  const [degorgements,      setDegorgements]      = useState([]);
  const [showStockMvtForm,  setShowStockMvtForm]  = useState(false);
  const [showCloture,       setShowCloture]       = useState(false);
  const [clotures,          setClotures]          = useState([]);
  const LIEUX_STOCK = ["Domaine", "Lorain Champagnisation", "Epernay"];
  const FORMATS = [{key:"75", label:"Bouteille 75cl", vol:0.75}, {key:"magnum", label:"Magnum 1.5L", vol:1.5}, {key:"jeroboam", label:"Jeroboam 3L", vol:3.0}];
  const STATUTS_BOUTEILLES = ["Sur latte / Sur pointe", "En cours de degorgement", "Degorge", "Habille CRD", "Habille Export"];
  const STATUTS_AUTRES = ["En vieillissement", "Habille"];
  const getStatuts = (type) => ["coteaux_blanc","coteaux_rouge","ratafia"].includes(type) ? STATUTS_AUTRES : STATUTS_BOUTEILLES;
  const LIEU_COLORS = {"Domaine":{bg:"#d4edda",color:"#1a7a40"},"Lorain Champagnisation":{bg:"#d4e8f8",color:"#185FA5"},"Epernay":{bg:"#fde8b8",color:"#c47800"}};
  const STATUT_COLORS = {"Sur latte / Sur pointe":{bg:"#e8f0fb",color:"#185FA5"},"En cours de degorgement":{bg:"#fff3cd",color:"#c47800"},"Degorge":{bg:"#d4f0dd",color:"#1a7a40"},"Habille CRD":{bg:"#e8d4f8",color:"#6a2d8a"},"Habille Export":{bg:"#f8d4e8",color:"#8a2d6a"}};
  const DEGORGE_EMPTY = {
    lotId: "", date:"", operateur:"",
    lieuDepart:"Domaine", lieuArrivee:"Lorain Champagnisation",
    statut:"En cours de degorgement",
    dosageLiqueur:"", descriptionDosage:"",
    pertes:"0", notes:"", qte:"",
  };
  const [degorgeForm, setDegorgeForm] = useState(DEGORGE_EMPTY);
  const CLOTURE_EMPTY = {
    date: new Date().toISOString().slice(0,7),
    operateur:"",
    lignes:[],
    notes:"",
    importCsv:"",
  };
  const [clotureForm, setClotureForm] = useState(CLOTURE_EMPTY);
  const [showVendangeForm,  setShowVendangeForm]  = useState(false);
  const [filterVendangeAn,  setFilterVendangeAn]  = useState("");
  const [editingVendange,  setEditingVendange]  = useState(null);
  const [vendanges,        setVendanges]        = useState([]);
  const [parcelles,        setParcelles]        = useState([]);
  const [showParcelleForm, setShowParcelleForm] = useState(false);
  const [editingParcelle,  setEditingParcelle]  = useState(null);
  const [parcelleForm,     setParcelleForm]     = useState({nom:"",cepage:"",certification:"BIO",surface:"",commune:"",observations:""});
  const [cuvesCuverie,     setCuvesCuverie]     = useState([]);
  const [showCuverieForm,  setShowCuverieForm]  = useState(false);
  const [editingCuverie,   setEditingCuverie]   = useState(null);
  const CUVERIE_EMPTY = {nom:"",type:"debourbage",volumeHL:"",contenuActuelHL:"0",notes:""};
  const [cuverieForm,      setCuverieForm]      = useState(CUVERIE_EMPTY);
  const [tonneauxTab,      setTonneauxTab]      = useState("futscuves");
  const [showDivisionForm, setShowDivisionForm] = useState(false);
  const [divisionFut,      setDivisionFut]      = useState(null);
  const [divisionForm,     setDivisionForm]     = useState({volAOC:"",volRI:""});
  const VENDANGE_EMPTY = {
    annee: new Date().getFullYear().toString(),
    date: new Date().toISOString().slice(0,10),
    heure: "",
    parcelleId: "",
    parcelleIds: [],
    cuveeCreee: "",
    operateur: "",
    numeroMarc: "",
    volumeRecolte: "",
    volumeHL: "",
    poidsMarcKg: "",
    degreePotentiel: "",
    acidite: "",
    so2: "",
    ph: "",
    observations: "",
    cuveReception: "",
    nouvelleCuveNom: "",
    nouvelleCuveVolume: "",
    produitsAjoutes: [],
    destinationMarc: "maison",
    kgVendusNegoce: "",
    numeroDAE: "",
  };
  const [vendangeForm, setVendangeForm] = useState(VENDANGE_EMPTY);
  const [rendementsAnnuels, setRendementsAnnuels] = useState([]);
  const [showRendementForm, setShowRendementForm] = useState(false);
  const [showParcellesList, setShowParcellesList] = useState(true);
  const [rendementForm, setRendementForm] = useState({annee:new Date().getFullYear().toString(),rendementAutorise:"",surface:""});
  const [showProduitVendange, setShowProduitVendange] = useState(false);
  const [produitVendangeForm, setProduitVendangeForm] = useState({nom:"",dose:"",lot:"",date:""});
  const [editingTirage,  setEditingTirage]  = useState(null);
  const [tirages,        setTirages]        = useState([]);
  const TIRAGE_EMPTY = {
    date: new Date().toISOString().slice(0,10),
    operateur: "",
    typeProduit: "champagne",
    cuvee: "",
    millesime: "",
    futsSources: [],
    futsSourcesVolumes: {},
    volumeTotal: "",
    levainEau: "",
    levainVin: "",
    levainLevure: "",
    levainLevureNom: "",
    levainLot: "",
    qte75: "",
    lot75: "",
    qteMagnum: "",
    lotMagnum: "",
    qteJeroboam: "",
    lotJeroboam: "",
    // Cuve de stockage apres assemblage
    cuveDestMode: "existante",  // "existante" ou "nouvelle"
    cuveDestId: "",             // id cuve existante
    nouvelleCuveId: "",         // id nouvelle cuve
    nouvelleCuveVolume: "",     // capacite nouvelle cuve
    notes: "",
  };
  const [tirageForm, setTirageForm] = useState(TIRAGE_EMPTY);
  const [campFutId,    setCampFutId]    = useState(null);
  const [campagnes,    setCampagnes]    = useState([]);
  const [campForm,     setCampForm]     = useState({annee:"", denomination:"", millesime:"", notes:""});
  const [editingNote,  setEditingNote]  = useState(null);
  const [editNoteForm, setEditNoteForm] = useState({boise:"",longueur:"",noteG:"",commentaire:""});
  const [showFutForm, setShowFutForm] = useState(false);
  const [editingFut,  setEditingFut]  = useState(null); // null=ajout, objet=édition
  const [importText,  setImportText]  = useState("");
  const [importMsg,   setImportMsg]   = useState("");

  // Fût / Cuve form
  const EMPTY_FUT = { id:"", appellation:"", denomination:"", millesime:"2025", volume:"", tonnelier:"", grain:"", chauffe:"", certif:"BIO", statut:"actif", contenuActuel:"", volumeRI:"0", marc:"", commentaire:"" };
  const [futForm, setFutForm] = useState(EMPTY_FUT);

  // Mouvement form
  const [mvtForm, setMvtForm] = useState({
    type:"ouillage", date:new Date().toISOString().slice(0,16),
    operateur:"", futSource:[], futDest:"", volume:"", notes:"", produit:"", dosage:"", numeroLot:"", entonnageMarcId:"", entonnageCuveId:"", entonnageVendangeId:"", entonnageFuts:[{futId:"",volume:""}], assemblageVolumes:{}, perteVolumes:{}, ouillageDestFuts:[{futId:"",volume:""}], mutageCuveId:"", mutageBourbesHL:"", mutageAlcoolHL:"", mutageDegreAlcool:"", mutageDestId:"",
  });
  // Dégustation form - une ligne par dégustateur
  const [degForm, setDegForm] = useState({
    futId:"", session:"", date:new Date().toISOString().slice(0,10),
    lignes: degustateurs.filter(d=>d.actif).map(d=>({ degustateur:d.nom, boise:"", longueur:"", noteG:"", commentaire:"" })),
  });

  useEffect(()=>{
    window.addEventListener('error', (e) => setAppError(e.message + ' at ' + e.filename + ':' + e.lineno));
    window.addEventListener('unhandledrejection', (e) => setAppError(String(e.reason)));
  }, []);
  // Toutes les donnees sont dans Firebase - pas de localStorage

  // Firebase save helpers
  const saveTonneau = (t) => fbSave("tonneaux", t.id, t);
  const deleteTonneauFb = (id) => fbDelete("tonneaux", id);
  const saveMouvement = (m) => fbSave("mouvements", m.id, m);
  const deleteMouvementFb = (id) => fbDelete("mouvements", id);
  const saveDegustation = (d) => fbSave("degustations", d.id, d);
  const deleteDegustationFb = (id) => fbDelete("degustations", id);
  const saveCampagne = (c) => fbSave("campagnes", c.id, c);
  const deleteCampagneFb = (id) => fbDelete("campagnes", id);
  const saveTirage = (t) => fbSave("tirages", t.id, t);
  const deleteTirageFb = (id) => fbDelete("tirages", id);
  const saveVendange = (v) => fbSave("vendanges", v.id, v);
  const deleteVendangeFb = (id) => fbDelete("vendanges", id);
  const saveParcelle = (p) => fbSave("parcelles", p.id, p);
  const deleteParcelleFb = (id) => fbDelete("parcelles", id);

  // Refresh depuis Firebase
  // -- STOCK HELPERS ----------------------------------------------------
  // Calcule les lots de bouteilles depuis les tirages
  const getLots = () => {
    const lots = [];
    tirages.forEach(t => {
      const moisDepuisTirage = t.date ? Math.floor((new Date()-new Date(t.date))/(1000*60*60*24*30.5)) : 0;
      const commercialisable = moisDepuisTirage >= 15;
      [["75", t.qte75, t.lot75, "Bouteille 75cl"],
       ["magnum", t.qteMagnum, t.lotMagnum, "Magnum 1.5L"],
       ["jeroboam", t.qteJeroboam, t.lotJeroboam, "Jeroboam 3L"]
      ].forEach(([fmt, qte, lot, label]) => {
        if((parseInt(qte)||0) > 0) {
          // Trouver le dernier mouvement de ce lot
          const mouvLot = degorgements.filter(d=>d.lotId===lot).sort((a,b)=>new Date(b.date)-new Date(a.date));
          const dernierMvt = mouvLot[0];
          // Calculer les pertes
          const pertesTotales = mouvLot.reduce((s,d)=>s+(parseInt(d.pertes)||0),0);
          // Deduire les clotures
          const vendu = clotures.reduce((s,c)=>{
            return s + (c.lignes||[]).filter(l=>l.lot===lot).reduce((ss,l)=>ss+(parseInt(l.qte)||0),0);
          }, 0);
          const qteActuelle = Math.max(0, (parseInt(qte)||0) - pertesTotales - vendu);
          lots.push({
            id: `${t.id}_${fmt}`,
            lot: lot||"",
            tirageId: t.id,
            cuvee: t.cuvee,
            millesime: t.millesime,
            format: fmt,
            formatLabel: label,
            dateTirage: t.date,
            moisDepuisTirage,
            commercialisable,
            statut: dernierMvt?.statut || "Sur latte / Sur pointe",
            lieu: dernierMvt?.lieuArrivee || "Domaine",
            qteInitiale: parseInt(qte)||0,
            pertesTotales,
            vendu,
            qteActuelle,
          });
        }
      });
    });
    return lots.filter(l=>l.qteActuelle>0);
  };

  const getStockActuel = () => getLots();

  // Traitement
  // Upload PDF en base64 dans Firestore
  const uploadPdf = (file, campagne, nom) => {
    if(!file) return;
    if(file.size > 900000) { alert("Le PDF est trop volumineux (max 900 KB). Compressez-le d'abord."); return; }
    setUploadingPdf(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      const pdfDoc = { id:`pdf_${Date.now()}`, campagne:String(campagne), nom:nom||file.name, base64, dateUpload:new Date().toISOString() };
      setPdfDocs(prev=>[...prev, pdfDoc]);
      fbSave("pdfDocs", pdfDoc.id, pdfDoc);
      setUploadingPdf(false);
    };
    reader.readAsDataURL(file);
  };

  const deletePdf = (pdf) => {
    if(!window.confirm("Supprimer ce document ?")) return;
    setPdfDocs(prev=>prev.filter(p=>p.id!==pdf.id));
    fbDelete("pdfDocs", pdf.id);
  };

  const openPdf = (pdf) => {
    const w = window.open();
    w.document.write(`<iframe src="${pdf.base64}" style="width:100%;height:100vh;border:none;"/>`);
  };

  // Calcul g de cuivre = dose (kg ou L) * teneur (g/kg ou g/L) * surface
  const calculCuivre = (dose, teneur, surface, unite) => {
    const d = parseFloat(dose)||0;
    const t = parseFloat(teneur)||0;
    const s = parseFloat(surface)||0;
    if(!d || !t || !s) return null;
    // dose en kg/ha ou L/ha * teneur g/kg ou g/L = g/ha * surface ha = g total
    return Math.round(d * t * s);
  };

  // Submit stock produit
  // Upload facture PDF
  const uploadFacture = (file, nom) => {
    if(!file) return;
    if(file.size > 900000) { alert("Le PDF est trop volumineux (max 900 KB)."); return; }
    setUploadingPdf(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      const doc = { id:`facture_${Date.now()}`, nom:nom||file.name, base64, dateUpload:new Date().toISOString() };
      setPdfFactures(prev=>[...prev, doc]);
      fbSave("pdfFactures", doc.id, doc);
      setUploadingPdf(false);
    };
    reader.readAsDataURL(file);
  };

  const deleteFacture = (id) => {
    if(!window.confirm("Supprimer ce document ?")) return;
    setPdfFactures(prev=>prev.filter(p=>p.id!==id));
    fbDelete("pdfFactures", id);
  };

  const openPdfFacture = (pdf) => {
    const w = window.open();
    w.document.write(`<iframe src="${pdf.base64}" style="width:100%;height:100vh;border:none;"/>`);
  };

  const submitStockProduit = () => {
    if(!produitForm.nom.trim()) return alert("Le nom du produit est requis.");
    const p = {
      id: editingStockProd ? editingStockProd.id : `prod_${Date.now()}`,
      ...produitForm,
      substanceActive: produitForm.substanceActive || produitForm.matiereActive || "Cuivre",
      stockActuel: editingStockProd ? (produitForm.stockActuel!==undefined ? produitForm.stockActuel : editingStockProd.stockActuel) : (produitForm.stockInitial||"0"),
      timestamp: new Date().toISOString()
    };
    if(editingStockProd){
      setStockProduits(prev=>prev.map(x=>x.id===p.id?p:x));
    } else {
      setStockProduits(prev=>[p,...prev]);
    }
    fbSave("stockProduits", p.id, p);
    setProduitForm(PRODUIT_EMPTY); setEditingStockProd(null); setShowStockProdForm(false);
  };

  const addFromCatalogue = (cat) => {
    const p = {
      id:`prod_${Date.now()}`,
      nom:cat.nom, nAmm:cat.nAmm||"",
      substanceActive:cat.substanceActive||cat.matiereActive||"Autre",
      teneurCuivre:String(cat.teneurCuivre||0),
      unite:cat.unite||"kg",
      stockActuel:"0",
      fournisseur:cat.fournisseur||"",
      observations:"",
      timestamp:new Date().toISOString()
    };
    setStockProduits(prev=>[p,...prev]);
    fbSave("stockProduits", p.id, p);
  };

  const updateStockProduit = (id, delta) => {
    setStockProduits(prev=>prev.map(p=>{
      if(p.id!==id) return p;
      const newStock = Math.round(((parseFloat(p.stockActuel)||0) + delta)*100)/100;
      const updated = {...p, stockActuel:String(newStock)};
      fbSave("stockProduits", id, updated);
      return updated;
    }));
  };

  // Import BL via Claude API
  const importerBL = async (file) => {
    if(!file) return;
    setImportBLLoading(true);
    setImportBLResult([]);
    try {
      const base64 = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=e=>res(e.target.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(file); });
      const resp = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{role:"user",content:[
            {type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},
            {type:"text",text:"Extrait les produits phytosanitaires de ce BL/conseil. Reponds UNIQUEMENT en JSON valide, sans backticks ni texte. Format: [{nom,nAmm,substanceActive,teneurCuivre,unite,fournisseur}] - teneurCuivre=g de cuivre/kg ou /L (0 si pas de cuivre)."}
          ]}]
        })
      });
      const data = await resp.json();
      const text = data.content?.map(c=>c.text||"").join("");
      const produits = JSON.parse(text.replace(/```json|```/g,"").trim());
      setImportBLResult(produits);
    } catch(e) { alert("Erreur import: "+e.message); }
    setImportBLLoading(false);
  };

  const confirmerImportBL = () => {
    importBLResult.forEach(cat => {
      const existe = stockProduits.find(p=>p.nAmm===cat.nAmm||p.nom.toLowerCase()===cat.nom.toLowerCase());
      if(!existe) addFromCatalogue(cat);
    });
    setImportBLResult([]); setShowImportBL(false);
  };

  const isCampagneClosed = (campagne) => campagnesClosees.includes(String(campagne));

  const cloturerCampagne = (campagne) => {
    if(!window.confirm(`Cloture la campagne ${campagne} ? Les traitements ne pourront plus etre modifies.`)) return;
    const newList = [...new Set([...campagnesClosees, String(campagne)])];
    setCampagnesClosees(newList);
    fbSave("campagnesClosees", String(campagne), {campagne: String(campagne), closedAt: new Date().toISOString()});
  };

  const rouvrirCampagne = (campagne) => {
    if(!window.confirm(`Rouvrir la campagne ${campagne} ?`)) return;
    setCampagnesClosees(prev=>prev.filter(c=>c!==String(campagne)));
    fbDelete("campagnesClosees", String(campagne));
  };

  const submitBiody = () => {
    if(!biodyForm.date) return alert("La date est requise.");
    const b = { id:editingBiody?editingBiody.id:`biody_${Date.now()}`, ...biodyForm, timestamp:new Date().toISOString() };
    if(editingBiody){
      setBiodynamies(prev=>prev.map(x=>x.id===b.id?b:x));
      if(biodyForm.produit && biodyForm.surface && biodyForm.dose) {
        deduireStock([{nom:biodyForm.produit,dose:biodyForm.dose}], biodyForm.surface,
          editingBiody.produit?[{nom:editingBiody.produit,dose:editingBiody.dose}]:[], editingBiody.surface);
      }
    } else {
      setBiodynamies(prev=>[b,...prev]);
      if(biodyForm.produit && biodyForm.surface && biodyForm.dose) {
        deduireStock([{nom:biodyForm.produit, dose:biodyForm.dose}], biodyForm.surface);
      }
    }
    fbSave("biodynamies", b.id, b);
    setBiodyForm({campagne:new Date().getFullYear().toString(),date:"",surface:"",produit:"",observations:""});
    setEditingBiody(null); setShowBiodyForm(false);
  };

  const submitAmend = () => {
    if(!amendForm.parcelle.trim()) return alert("La parcelle est requise.");
    const a = { id:editingAmend?editingAmend.id:`amend_${Date.now()}`, ...amendForm, timestamp:new Date().toISOString() };
    if(editingAmend){ setAmendements(prev=>prev.map(x=>x.id===a.id?a:x)); }
    else {
      setAmendements(prev=>[a,...prev]);
      // Deduire la quantite d'amendement du stock
      if(amendForm.produit && amendForm.quantite) {
        const stockProd = stockProduits.find(sp=>
          sp.nom.toLowerCase().includes(amendForm.produit.toLowerCase().slice(0,5)) ||
          amendForm.produit.toLowerCase().includes(sp.nom.toLowerCase().slice(0,5))
        );
        if(stockProd) {
          const qte = parseFloat(amendForm.quantite.replace(/[^0-9.]/g,""))||0;
          const newStock = Math.max(0, (parseFloat(stockProd.stockActuel)||0) - qte);
          const updated = {...stockProd, stockActuel: String(Math.round(newStock*100)/100)};
          setStockProduits(prev=>prev.map(sp=>sp.id===stockProd.id?updated:sp));
          fbSave("stockProduits", stockProd.id, updated);
        }
      }
    }
    fbSave("amendements", a.id, a);
    setAmendForm({campagne:new Date().getFullYear().toString(),parcelle:"",surface:"",produit:"",quantite:"",nTotal:"",nParHa:"",observations:""});
    setEditingAmend(null); setShowAmendForm(false);
  };

  const findStockProd = (nom) => stockProduits.find(sp =>
    sp.nom.toLowerCase().includes((nom||"").toLowerCase().slice(0,6)) ||
    (nom||"").toLowerCase().includes(sp.nom.toLowerCase().slice(0,6))
  );

  const deduireStock = (produits, surface, produitsAnciensOpt, surfaceAncienneOpt) => {
    const surf = parseFloat(surface)||0;
    const surfAnc = parseFloat(surfaceAncienneOpt)||0;
    // Groupe par produit pour faire le calcul net
    const updates = {};
    // Rembourser les anciennes doses si modification
    if(produitsAnciensOpt) {
      produitsAnciensOpt.forEach(p => {
        if(!p.nom) return;
        const sp = findStockProd(p.nom);
        if(!sp) return;
        const dose = parseFloat(p.dose)||0;
        const qte = dose * surfAnc;
        if(!updates[sp.id]) updates[sp.id] = {sp, delta:0};
        updates[sp.id].delta += qte; // rembourse
      });
    }
    // Deduire les nouvelles doses
    produits.forEach(p => {
      if(!p.nom) return;
      const sp = findStockProd(p.nom);
      if(!sp || surf <= 0) return;
      const dose = parseFloat(p.dose)||0;
      const qte = dose * surf;
      if(!updates[sp.id]) updates[sp.id] = {sp, delta:0};
      updates[sp.id].delta -= qte; // deduit
    });
    // Appliquer tous les updates
    Object.values(updates).forEach(({sp, delta}) => {
      const newStock = Math.round(((parseFloat(sp.stockActuel)||0) + delta)*100)/100;
      const updated = {...sp, stockActuel: String(newStock)};
      setStockProduits(prev=>prev.map(x=>x.id===sp.id?updated:x));
      fbSave("stockProduits", sp.id, updated);
    });
  };

  const submitTraitement = () => {
    if(!traitForm.date) return alert("La date est requise.");
    if(!traitForm.campagne) return alert("La campagne est requise.");
    const cuAuto = traitForm.produits.reduce((s,p)=>s+(parseFloat(p.cuivre)||0),0);
    const cuivreTotal = traitForm.cuivreTotal || (cuAuto>0?String(cuAuto):"");
    const t = { id:editingTrait?editingTrait.id:`trait_${Date.now()}`, ...traitForm, cuivreTotal, timestamp:new Date().toISOString() };
    if(editingTrait){
      setTraitements(prev=>prev.map(x=>x.id===t.id?t:x));
      // Rembourser ancienne dose + deduire nouvelle
      if(traitForm.produits.length>0 && traitForm.surface) {
        deduireStock(traitForm.produits, traitForm.surface, editingTrait.produits, editingTrait.surface);
      }
    } else {
      setTraitements(prev=>[t,...prev]);
      if(traitForm.produits.length>0 && traitForm.surface) {
        deduireStock(traitForm.produits, traitForm.surface);
      }
    }
    fbSave("traitements", t.id, t);
    setTraitForm(TRAIT_EMPTY); setEditingTrait(null); setShowTraitForm(false);
  };

  const addTraitProduit = () => {
    if(!traitProduit.nom.trim()) return;
    setTraitForm(f=>({...f, produits:[...f.produits, {...traitProduit, id:`p_${Date.now()}`}]}));
    setTraitProduit({nom:"", dose:"", matiereActive:"", cuivre:""}); setShowTraitProduit(false);
  };

  const submitDegorgement = () => {
    if(!degorgeForm.lotId) return alert("Selectionnez un lot.");
    const lotObj = getLots().find(l=>l.id===degorgeForm.lotId);
    if(!degorgeForm.date) return alert("La date est requise.");
    if(!degorgeForm.operateur) return alert("L'operateur est requis.");
    const d = { id:editingDegorge?editingDegorge.id:`deg_${Date.now()}`, ...degorgeForm, timestamp:new Date().toISOString() };
    if(editingDegorge){ setDegorgements(prev=>prev.map(x=>x.id===d.id?d:x)); }
    else { setDegorgements(prev=>[d,...prev]); }
    fbSave("degorgements", d.id, d);
    setDegorgeForm(DEGORGE_EMPTY); setEditingDegorge(null); setShowDegorgeForm(false);
  };

  const submitCloture = () => {
    if(!clotureForm.date) return alert("Le mois est requis.");
    if(!clotureForm.operateur) return alert("L'operateur est requis.");
    if(clotureForm.lignes.length===0) return alert("Ajoutez au moins une ligne.");
    const c = { id:`cloture_${Date.now()}`, ...clotureForm, timestamp:new Date().toISOString() };
    setClotures(prev=>[c,...prev]);
    fbSave("clotures", c.id, c);
    setClotureForm(CLOTURE_EMPTY); setShowCloture(false);
  };

  const importCsvCloture = () => {
    const lines = clotureForm.importCsv.trim().split("\n").filter(l=>l.trim());
    if(lines.length<2){ alert("Format invalide. Ligne 1: en-tetes, suite: donnees"); return; }
    const headers = lines[0].split(";").map(h=>h.trim().toLowerCase());
    const lignes = [];
    for(let i=1;i<lines.length;i++){
      const cols = lines[i].split(";").map(c=>c.trim());
      lignes.push({
        cuvee:   cols[headers.indexOf("cuvee")]||"",
        millesime: cols[headers.indexOf("millesime")]||"",
        format:  cols[headers.indexOf("format")]||"75",
        lieu:    cols[headers.indexOf("lieu")]||"Epernay",
        qte:     parseInt(cols[headers.indexOf("qte")])||0,
      });
    }
    setClotureForm(f=>({...f, lignes:[...f.lignes,...lignes], importCsv:""}));
  };

  // Liste complete de toutes les collections
  const ALL_COLS = [
    ["tonneaux",     setTonneaux],
    ["mouvements",   setMouvements],
    ["degustations", setDegustations],
    ["campagnes",    setCampagnes],
    ["tirages",      setTirages],
    ["vendanges",    setVendanges],
    ["parcelles",    setParcelles],
    ["degorgements", setDegorgements],
    ["biodynamies",  setBiodynamies],
    ["stockProduits",setStockProduits],
      ["stockBouteilles",setStockBouteilles],
    ["pdfDocs",      setPdfDocs],
    ["pdfFactures",  setPdfFactures],
    ["amendements",  setAmendements],
    ["clotures",     setClotures],
    ["campagnesClosees", (data)=>setCampagnesClosees(data.filter(d=>d.campagne).map(d=>d.campagne))],
      ["coiffes",        setCoiffesStock],
    ["traitements",  setTraitements],
    ["cuvesCuverie",  setCuvesCuverie],
    ["riRequis",      setRiRequis],
    ["rendements",    setRendementsAnnuels],
  ];

  const refreshFromFirebase = async () => {
    for(const [col, setter] of ALL_COLS) {
      await fbLoad(col, setter);
    }
    await fbLoad("degustateurs", data => {
      if(data.length>0 && data[0].liste) setDegustateurs(data[0].liste);
    });
  };

  // Chargement initial + polling toutes les 10s
  useEffect(()=>{
    refreshFromFirebase();
    getDocs(collection(db,"traitements")).then(s=>{
      if(s.empty){ HIST_TRAITEMENTS.forEach(t=>{ const id=`hist_${t.campagne}_${t.numero}`; fbSave("traitements",id,{...t,id}); }); }
    });
    const interval = setInterval(()=>refreshFromFirebase(), 10000);
    return () => clearInterval(interval);
  }, []);

  const getTonneau = (id) => tonneaux.find(t=>t.id===id);
  const degsActifs = degustateurs.filter(d=>d.actif).map(d=>d.nom);
  const toggleActif = (i) => setDegustateurs(prev=>prev.map((d,j)=>j===i?{...d,actif:!d.actif}:d));

  // Appellations vins clairs dynamiques (une par millésime présent dans les données)
  const vinsClairsAnnes = [...new Set(
    tonneaux.filter(t=>t.appellation&&t.appellation.startsWith("vins_clairs"))
      .map(t=>t.appellation)
  )].sort();
  // Toutes les appellations disponibles pour les filtres
  const allAppellations = [...vinsClairsAnnes, "vins_reserve","ri","coteaux","ratafia"];
  // Passer un fût en réserve
  const passerEnReserve = (id) => {
    setTonneaux(prev=>prev.map(t=>{ if(t.id===id){ const u={...t,appellation:"vins_reserve"}; saveTonneau(u); return u; } return t; }));
  };
  const pct = (t) => Math.round((t.contenuActuel/t.volume)*100);
  const denominations = [...new Set(tonneaux.map(t=>t.denomination))].sort();

  // Notes résumé pour un fût
  const notesForFut = (futId) => degustations.filter(d=>d.futId===futId);
  const avgNoteG = (futId) => { const ns=notesForFut(futId).map(d=>d.noteG).filter(Boolean); return avg(ns); };
  const avgBoise = (futId) => { const ns=notesForFut(futId).map(d=>d.boise).filter(Boolean); return avg(ns); };
  const avgLong  = (futId) => { const ns=notesForFut(futId).map(d=>d.longueur).filter(Boolean); return avg(ns); };
  const sessions = (futId) => [...new Set(notesForFut(futId).map(d=>d.session))];

  // Submit ajout/modif fût
  const submitFut = () => {
    if(!futForm.id.trim())     return alert("Le N° de fût est requis.");
    if(!futForm.volume || isNaN(+futForm.volume)) return alert("Le volume doit être un nombre.");
    if(!editingFut && tonneaux.find(t=>t.id===futForm.id.trim())) return alert(`Le fût "${futForm.id}" existe déjà.`);
    const vol = +futForm.volume;
    const contenu = futForm.contenuActuel!==""?Math.min(vol,+futForm.contenuActuel):0;
    const fut = { id:futForm.id.trim(), appellation:futForm.appellation, denomination:futForm.denomination.trim(),
      millesime:futForm.millesime?+futForm.millesime:null, volume:vol, tonnelier:futForm.tonnelier,
      grain:futForm.grain, chauffe:futForm.chauffe, certif:futForm.certif,
      statut:futForm.statut, contenuActuel:contenu, volumeRI:parseFloat(futForm.volumeRI)||0, marc:futForm.marc||"", commentaire:futForm.commentaire||"" };
    if(editingFut) {
      if(editingFut.id !== fut.id) {
        // ID changed - remove old, add new
        setTonneaux(prev=>[...prev.filter(t=>t.id!==editingFut.id), fut]);
        fbDelete("tonneaux", editingFut.id);
      } else {
        setTonneaux(prev=>prev.map(t=>t.id===editingFut.id?fut:t));
      }
    } else {
      setTonneaux(prev=>[...prev, fut]);
    }
    saveTonneau(fut);
    setShowFutForm(false); setEditingFut(null); setFutForm(EMPTY_FUT);
  };

  // Supprimer un fût
  const deleteFut = (id) => {
    if(!window.confirm(`Supprimer le fût "${id}" ? Cette action est irréversible.`)) return;
    setTonneaux(prev=>prev.filter(t=>t.id!==id));
    setDegustations(prev=>prev.filter(d=>d.futId!==id));
    deleteTonneauFb(id);
    if(selectedFut===id){ setSelectedFut(null); setView("tonneaux"); }
    setShowFutForm(false); setEditingFut(null);
  };

  // Ouvrir formulaire en mode édition
  const openEditFut = (t) => {
    setFutForm({ id:t.id, appellation:t.appellation||"vins_clairs", denomination:t.denomination,
      millesime:t.millesime||"", volume:t.volume, tonnelier:t.tonnelier||"",
      grain:t.grain||"", chauffe:t.chauffe||"", certif:t.certif||"BIO",
      statut:t.statut||"actif", contenuActuel:t.contenuActuel });
    setEditingFut(t);
    setShowFutForm(true);
  };

  // Submit mouvement
  // Annuler un mouvement et restaurer les volumes
  // -- CALCULS TIRAGE ------------------------------------------------------
  const calcVolLevain = (f) => {
    return (parseFloat(f.levainEau)||0) + (parseFloat(f.levainVin)||0) + (parseFloat(f.levainLevure)||0);
  };
  const calcVolBouteilles = (f) => {
    return ((parseFloat(f.qte75)||0)*0.75) + ((parseFloat(f.qteMagnum)||0)*1.5) + ((parseFloat(f.qteJeroboam)||0)*3.0);
  };
  const calcTotalAssemble = (f) => {
    return (parseFloat(f.volumeTotal)||0) + calcVolLevain(f);
  };

  // -- TIRAGE ---------------------------------------------------------------
  const openEditTirage = (t) => {
    setTirageForm({
      date:t.date||"", operateur:t.operateur||"", typeProduit:t.typeProduit||"champagne", cuvee:t.cuvee||"",
      millesime:t.millesime||"", futsSources:t.futsSources||[], futsSourcesVolumes:t.futsSourcesVolumes||{},
      volumeTotal:t.volumeTotal||"", levainEau:t.levainEau||"",
      levainVin:t.levainVin||"", levainLevure:t.levainLevure||"",
      levainLevureNom:t.levainLevureNom||"", levainLot:t.levainLot||"",
      qte75:t.qte75||"", lot75:t.lot75||"",
      qteMagnum:t.qteMagnum||"", lotMagnum:t.lotMagnum||"",
      qteJeroboam:t.qteJeroboam||"", lotJeroboam:t.lotJeroboam||"",
      notes:t.notes||"",
      cuveDestMode:t.cuveDestMode||"existante",
      cuveDestId:t.cuveDestId||"",
      nouvelleCuveId:t.nouvelleCuveId||"",
      nouvelleCuveVolume:t.nouvelleCuveVolume||"",
      isBio:t.isBio||false,
    });
    setEditingTirage(t); setShowTirageForm(true);
  };

  const submitTirage = () => {
    if(!tirageForm.cuvee.trim()) return alert("La cuvee est requise.");
    if(!tirageForm.date) return alert("La date est requise.");
    if(!tirageForm.operateur) return alert("L'operateur est requis.");
    const updated = {
      id: editingTirage ? editingTirage.id : `tirage_${Date.now()}`,
      ...tirageForm,
      volLevain: calcVolLevain(tirageForm),
      volBouteilles: calcVolBouteilles(tirageForm),
      volAssemble: calcTotalAssemble(tirageForm),
      timestamp: editingTirage ? editingTirage.timestamp : new Date().toISOString(),
    };
    if(editingTirage) {
      setTirages(prev=>prev.map(t=>t.id===editingTirage.id ? updated : t));
      // Update isBio in stock bouteilles
      setStockBouteilles(prev=>prev.map(lot=>{
        if(lot.tirageId===editingTirage.id) {
          const updatedLot = {...lot, isBio:updated.isBio||false};
          fbSave("stockBouteilles", lot.id, updatedLot);
          return updatedLot;
        }
        return lot;
      }));
    } else {
      setTirages(prev=>[updated, ...prev]);
      const volAssemble = calcTotalAssemble(tirageForm);
      let updatedTonneaux = [...tonneaux];
      if(tirageForm.futsSources.length > 0) {
        updatedTonneaux = updatedTonneaux.map(t=>{
          if(tirageForm.futsSources.includes(t.id)) {
            const volPris = parseFloat(tirageForm.futsSourcesVolumes[t.id])||t.contenuActuel||0;
            const reste = Math.max(0,(t.contenuActuel||0)-volPris);
            return {...t, contenuActuel:reste, statut:reste<=0?"vide":t.statut};
          }
          return t;
        });
      }
      if(tirageForm.cuveDestMode==="existante" && tirageForm.cuveDestId) {
        const volAssembleHL = volAssemble/100;
        setCuvesCuverie(prev=>prev.map(c=>{
          if(c.id===tirageForm.cuveDestId) {
            const updated = {...c, contenuActuelHL:String(Math.round(((parseFloat(c.contenuActuelHL)||0)+volAssembleHL)*100)/100)};
            fbSave("cuvesCuverie", c.id, updated);
            return updated;
          }
          return c;
        }));
      } else if(tirageForm.cuveDestMode==="nouvelle" && tirageForm.nouvelleCuveId.trim()) {
        updatedTonneaux = [...updatedTonneaux, {
          id:tirageForm.nouvelleCuveId.trim(),
          appellation:"vins_clairs_"+(tirageForm.millesime||new Date().getFullYear()),
          denomination:tirageForm.cuvee||"Cuve tirage",
          millesime:tirageForm.millesime?+tirageForm.millesime:null,
          volume:parseFloat(tirageForm.nouvelleCuveVolume)||Math.ceil(volAssemble*1.1),
          tonnelier:"",grain:"",chauffe:"",certif:"BIO",statut:"actif",
          contenuActuel:volAssemble, marc:"",
          commentaire:`Cuve creee lors du tirage du ${tirageForm.date} - ${tirageForm.cuvee}`,
        }];
      }
      setTonneaux(updatedTonneaux);
      updatedTonneaux.forEach(t => saveTonneau(t));
    }
    saveTirage(updated);
    // Creer/mettre a jour les lots dans stockBouteilles
    if(editingTirage) {
      // Mise a jour des lots existants (date, cuvee, millesime, quantites)
      const fmts = [{fmt:"75cl",qk:"qte75"},{fmt:"Magnum",qk:"qteMagnum"},{fmt:"Jeroboam",qk:"qteJeroboam"}];
      fmts.forEach(({fmt,qk})=>{
        const lotId = updated.id+"_"+fmt;
        const existingLot = stockBouteilles.find(l=>l.id===lotId);
        if(existingLot) {
          const newQte = parseInt(tirageForm[qk])||0;
          const diff = newQte - (existingLot.qteInitiale||0);
          const updatedLot = {
            ...existingLot,
            cuvee: tirageForm.cuvee,
            millesime: tirageForm.millesime||"",
            dateTirage: tirageForm.date,
            qteInitiale: newQte,
            qteActuelle: Math.max(0, (existingLot.qteActuelle||0) + diff),
          };
          setStockBouteilles(prev=>prev.map(x=>x.id===lotId?updatedLot:x));
          fbSave("stockBouteilles", lotId, updatedLot);
        }
      });
    }
    if(!editingTirage) {
      const ts = Date.now();
      const lots = [
        {fmt:"75cl",   qte:parseInt(tirageForm.qte75)||0,       lot:tirageForm.lot75||updated.id+"_75"},
        {fmt:"Magnum", qte:parseInt(tirageForm.qteMagnum)||0,   lot:tirageForm.lotMagnum||updated.id+"_mag"},
        {fmt:"Jeroboam",qte:parseInt(tirageForm.qteJeroboam)||0,lot:tirageForm.lotJeroboam||updated.id+"_jer"},
      ].filter(l=>l.qte>0);
      lots.forEach((l,i)=>{
        const lot = {
          id: updated.id+"_"+l.fmt,
          tirageId: updated.id,
          typeProduit: tirageForm.typeProduit||"champagne",
          isBio: tirageForm.futsSource&&tirageForm.futsSource.length>0?tirageForm.futsSource.every(f=>tonneaux.find(t=>t.id===f.futId)?.certif==="BIO"):false,
          cuvee: tirageForm.cuvee,
          millesime: tirageForm.millesime||"",
          dateTirage: tirageForm.date,
          format: l.fmt,
          lot: l.lot,
          qteInitiale: l.qte,
          qteActuelle: l.qte,
          statut: ["coteaux_blanc","coteaux_rouge","ratafia"].includes(tirageForm.typeProduit) ? "En vieillissement" : "Sur latte / Sur pointe",
          lieu: "Domaine",
          mouvements: [],
          timestamp: new Date().toISOString(),
        };
        setStockBouteilles(prev=>[lot,...prev.filter(x=>x.id!==lot.id)]);
        fbSave("stockBouteilles", lot.id, lot);
      });
    }
    setTirageForm(TIRAGE_EMPTY); setEditingTirage(null); setShowTirageForm(false);
  };

  // -- CAMPAGNE -------------------------------------------------------------
  const submitCampagne = () => {
    if(!campForm.annee) return alert("L'annee est requise.");
    if(!campForm.denomination.trim()) return alert("La denomination est requise.");
    const newC = { id:`camp_${Date.now()}`, futId:campFutId, annee:campForm.annee,
      denomination:campForm.denomination.trim(), millesime:campForm.millesime, notes:campForm.notes };
    setCampagnes(prev=>[...prev.filter(c=>!(c.futId===campFutId && c.annee===campForm.annee)), newC]);
    saveCampagne(newC);
    setShowCampForm(false); setCampFutId(null); setCampForm({annee:"",denomination:"",millesime:"",notes:""});
  };
  const deleteCampagne = (id) => {
    if(!window.confirm("Supprimer cette campagne ?")) return;
    setCampagnes(prev=>prev.filter(c=>c.id!==id)); deleteCampagneFb(id);
  };

  // -- VENDANGE -------------------------------------------------------------
  const submitParcelle = () => {
    if(!parcelleForm.nom.trim()) return alert("Le nom de la parcelle est requis.");
    const p = { id:editingParcelle?editingParcelle.id:`parc_${Date.now()}`, ...parcelleForm };
    if(editingParcelle) {
      setParcelles(prev=>prev.map(x=>x.id===editingParcelle.id?p:x));
    } else {
      setParcelles(prev=>[...prev,p]);
    }
    saveParcelle(p);
    setParcelleForm({nom:"",cepage:"",certification:"BIO",surface:"",commune:"",observations:""});
    setEditingParcelle(null); setShowParcelleForm(false);
  };

  const addProduitVendange = () => {
    if(!produitVendangeForm.nom.trim()) return;
    setVendangeForm(f=>({...f, produitsAjoutes:[...f.produitsAjoutes,{...produitVendangeForm,id:`prod_${Date.now()}`}]}));
    setProduitVendangeForm({nom:"",dose:"",lot:"",date:""}); setShowProduitVendange(false);
  };

  const openEditVendange = (v) => {
    setVendangeForm({...VENDANGE_EMPTY,...v});
    setEditingVendange(v); setShowVendangeForm(true);
  };

  const exportStockCSV = () => {
    const now = new Date();
    const lots = stockBouteilles.map(l=>({...l, mois:l.dateTirage?Math.floor((now-new Date(l.dateTirage))/(1000*60*60*24*30.5)):0}));
    const headers = ["Cuvee","BIO","Millesime","N° Lot","Format","Date tirage","Age (mois)","Statut","Lieu","Qte actuelle"];
    const rows = lots.sort((a,b)=>new Date(a.dateTirage)-new Date(b.dateTirage)).map(l=>[
      l.cuvee||"", l.isBio?"OUI":"NON", l.millesime||"", l.lot||"",
      l.format||"75cl", fmt(l.dateTirage)||"", l.mois,
      l.statut||"", l.lieu||"", l.qteActuelle||0
    ]);
    const csv = [headers,...rows].map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="stock_bouteilles.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportStockPDF = () => {
    const now = new Date();
    const lots = [...stockBouteilles].sort((a,b)=>new Date(a.dateTirage)-new Date(b.dateTirage))
      .map(l=>({...l, mois:l.dateTirage?Math.floor((now-new Date(l.dateTirage))/(1000*60*60*24*30.5)):0}));
    const total = lots.reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
    const rows = lots.map(l=>`<tr>
      <td><strong>${l.cuvee||"-"}</strong>${l.isBio?' <span style="background:#2d6a00;color:#fff;border-radius:3px;padding:1px 4px;font-size:9px">🌿</span>':""}</td>
      <td>${l.millesime||"-"}</td>
      <td style="font-family:monospace">${l.lot||"-"}</td>
      <td>${l.format||"75cl"}</td>
      <td>${fmt(l.dateTirage)||"-"}</td>
      <td>${l.mois} mois</td>
      <td>${l.statut||"-"}</td>
      <td>${l.lieu||"-"}</td>
      <td style="font-weight:bold;text-align:right">${l.qteActuelle||0}</td>
    </tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:Georgia,serif;margin:20px;color:#1a1205}
    h1{color:#7a5200;border-bottom:1px solid #d4c4a0;padding-bottom:8px}
    p{color:#9a8870;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#f5e8cc;color:#7a5200;padding:5px;text-align:left;border:0.5px solid #d4c4a0}
    td{padding:4px 5px;border:0.5px solid #ede5d4}
    tr:nth-child(even){background:#fffdf7}
    </style></head>
    <body>
    <h1>Champagne Nowack — Stock Bouteilles</h1>
    <p>${lots.length} lots — Total : ${total.toLocaleString("fr-FR")} bouteilles — Date : ${new Date().toLocaleDateString("fr-FR")}</p>
    <table><thead><tr>
      <th>Cuvee</th><th>Millesime</th><th>N° Lot</th><th>Format</th>
      <th>Date tirage</th><th>Age</th><th>Statut</th><th>Lieu</th><th>Qte</th>
    </tr></thead>
    <tbody>${rows}</tbody></table>
    </body></html>`;
    const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
  };

  const exportTonneauxCSV = () => {
    const headers = ["ID","Appellation","Denomination","Millesime","Volume (L)","Contenu (L)","Volume RI (L)","Tirable (L)","Marc","Tonnelier","Certif","Statut"];
    const rows = [...tonneaux].sort((a,b)=>{
      const appA = getApc(a.appellation).label||a.appellation||"";
      const appB = getApc(b.appellation).label||b.appellation||"";
      if(appA!==appB) return appA.localeCompare(appB);
      return (a.denomination||"").localeCompare(b.denomination||"");
    }).map(t=>[t.id,getApc(t.appellation).label||t.appellation||"",t.denomination||"",t.millesime||"",t.volume||0,t.contenuActuel||0,(t.appellation==="ri"&&!(parseFloat(t.volumeRI)||0)?(t.contenuActuel||0):(parseFloat(t.volumeRI)||0)),Math.max(0,(t.contenuActuel||0)-(t.appellation==="ri"&&!(parseFloat(t.volumeRI)||0)?(t.contenuActuel||0):(parseFloat(t.volumeRI)||0))),t.marc||"",t.tonnelier||"",t.certif||"",t.statut||""]);
    const csv = [headers,...rows].map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="tonneaux.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportTonneauxPDF = () => {
    const totalVin = tonneaux.filter(t=>t.statut!=="vide").reduce((s,t)=>s+(t.contenuActuel||0),0);
    const rows = [...tonneaux].sort((a,b)=>{
      const appA = getApc(a.appellation).label||a.appellation||"";
      const appB = getApc(b.appellation).label||b.appellation||"";
      if(appA!==appB) return appA.localeCompare(appB);
      const denA = a.denomination||"";
      const denB = b.denomination||"";
      return denA.localeCompare(denB);
    }).map(t=>{
      const noteG = avgNoteG(t.id);
      return `<tr>
        <td><strong>${t.id}</strong></td>
        <td>${getApc(t.appellation).label||t.appellation||"-"}</td>
        <td>${t.denomination||"-"}</td>
        <td>${t.millesime||"-"}</td>
        <td>${t.marc?t.marc:"-"}</td>
        <td>${t.volume||0} L</td>
        <td>${t.contenuActuel||0} L</td>
        <td>${t.appellation==="ri"&&!(parseFloat(t.volumeRI)||0)?(t.contenuActuel||0):(parseFloat(t.volumeRI)||0)} L</td>
        <td>${t.tonnelier||"-"}</td>
        <td>${t.grain||"-"}</td>
        <td>${t.chauffe||"-"}</td>
        <td>${t.certif||"-"}</td>
        <td>${noteG?noteG.toFixed(1)+"/5":"-"}</td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:Georgia,serif;margin:20px;color:#1a1205}
    h1{color:#7a5200;border-bottom:1px solid #d4c4a0;padding-bottom:8px}
    p{color:#9a8870;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#f5e8cc;color:#7a5200;padding:5px;text-align:left;border:0.5px solid #d4c4a0}
    td{padding:4px 5px;border:0.5px solid #ede5d4}
    tr:nth-child(even){background:#fffdf7}
    </style></head>
    <body>
    <h1>Champagne Nowack — Inventaire Chai</h1>
    <p>${tonneaux.length} futs — Volume total : ${(totalVin/100).toFixed(2)} HL — Date : ${new Date().toLocaleDateString("fr-FR")}</p>
    <table><thead><tr>
      <th>ID</th><th>Appellation</th><th>Denomination</th><th>Millesime</th><th>Marc</th>
      <th>Capacite</th><th>Contenu</th><th>RI</th>
      <th>Tonnelier</th><th>Grain</th><th>Chauffe</th><th>Certif</th><th>Note deg.</th>
    </tr></thead>
    <tbody>${rows}</tbody></table>
    </body></html>`;
    const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
  };

  const exportVendangeCSV = (annee, vAnnee) => {
    const headers = ["Date","Heure","Parcelles","Cuvee creee","Marc","Kg","HL","Degre","Acidite","SO2","pH","Dest. Marc","Cuve Taille","Vol Taille","Cuve Cuvee A","Vol Cuvee A","Cuve Cuvee B","Vol Cuvee B","Operateur","Observations"];
    const rows = vAnnee.map(v=>{
      const parcs = (v.parcelleIds&&v.parcelleIds.length>0) ? v.parcelleIds.map(id=>parcelles.find(p=>p.id===id)?.nom||id).join(" + ") : (parcelles.find(p=>p.id===v.parcelleId)?.nom||"");
      const cuveTaille = cuvesCuverie.find(c=>c.id===v.cuveTailleId)?.nom||v.cuveTailleId||"";
      const cuveA = cuvesCuverie.find(c=>c.id===v.cuveCuveeId)?.nom||v.cuveCuveeId||"";
      const cuveB = cuvesCuverie.find(c=>c.id===v.cuveCuveeBId)?.nom||v.cuveCuveeBId||"";
      return [fmt(v.date),v.heure||"",parcs,v.cuveeCreee||"",v.numeroMarc||"",v.poidsMarcKg||"",v.volumeHL||"",v.degreePotentiel||"",v.acidite||"",v.so2||"",v.ph||"",v.destinationMarc||"maison",cuveTaille,v.volumeTaille||"",cuveA,v.volumeCuvee||"",cuveB,v.volumeCuveeB||"",v.operateur||"",v.observations||""];
    });
    const csv = [headers,...rows].map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(";")).join("\n");
    const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`vendange_${annee}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportVendangePDF = (annee, vAnnee) => {
    const parcsNom = (v) => (v.parcelleIds&&v.parcelleIds.length>0) ? v.parcelleIds.map(id=>parcelles.find(p=>p.id===id)?.nom||id).join(" + ") : (parcelles.find(p=>p.id===v.parcelleId)?.nom||"");
    const isBio = (v) => {
      const ids = v.parcelleIds&&v.parcelleIds.length>0 ? v.parcelleIds : (v.parcelleId?[v.parcelleId]:[]);
      return ids.length>0 && ids.every(id=>parcelles.find(p=>p.id===id)?.certification==="BIO");
    };
    const kgTotal = vAnnee.reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
    const hlTotal = vAnnee.reduce((s,v)=>s+(parseFloat(v.volumeHL)||0),0);
    const kgMaison = vAnnee.reduce((s,v)=>{
      if(!v.destinationMarc||v.destinationMarc==="maison") return s+(parseFloat(v.poidsMarcKg)||0);
      if(v.destinationMarc==="negoce_partiel") return s+(parseFloat(v.poidsMarcKg)||0)-(parseFloat(v.kgVendusNegoce)||0);
      return s;
    },0);
    const kgNegoce = vAnnee.reduce((s,v)=>{
      if(v.destinationMarc==="negoce_total") return s+(parseFloat(v.poidsMarcKg)||0);
      if(v.destinationMarc==="negoce_partiel") return s+(parseFloat(v.kgVendusNegoce)||0);
      return s;
    },0);
    const rows = vAnnee.map(v=>{
      const bio = isBio(v);
      const dest = v.destinationMarc==="negoce_total"?"Negoce total":v.destinationMarc==="negoce_partiel"?`Negoce partiel (${parseInt(v.kgVendusNegoce)||0} kg negoce / ${(parseFloat(v.poidsMarcKg)||0)-(parseFloat(v.kgVendusNegoce)||0)} kg maison)`:"Maison";
      return `<tr>
        <td>${fmt(v.date)}${v.heure?" "+v.heure:""}</td>
        <td>${parcsNom(v)}${bio?' <span style="background:#2d6a00;color:#fff;border-radius:3px;padding:1px 4px;font-size:9px">🌿 BIO</span>':""}</td>
        <td>${v.cuveeCreee||"-"}</td>
        <td>${v.numeroMarc||"-"}</td>
        <td>${v.poidsMarcKg?parseInt(v.poidsMarcKg).toLocaleString()+" kg":"-"}</td>
        <td>${v.volumeHL||"-"} HL</td>
        <td>${dest}</td>
        <td>${v.degreePotentiel?v.degreePotentiel+"%":"-"}</td>
        <td>${v.acidite?v.acidite+" g/L":"-"}</td>
        <td>${v.so2?v.so2+" mg/L":"-"}</td>
        <td>${v.ph||"-"}</td>
        <td>${cuvesCuverie.find(c=>c.id===v.cuveTailleId)?.nom||"-"}${v.volumeTaille?" ("+v.volumeTaille+" HL)":""}</td>
        <td>${cuvesCuverie.find(c=>c.id===v.cuveCuveeId)?.nom||"-"}${v.volumeCuvee?" ("+v.volumeCuvee+" HL)":""}</td>
        <td>${cuvesCuverie.find(c=>c.id===v.cuveCuveeBId)?.nom||"-"}${v.volumeCuveeB?" ("+v.volumeCuveeB+" HL)":""}</td>
        <td>${v.produitsAjoutes&&v.produitsAjoutes.length>0?v.produitsAjoutes.map(p=>p.nom+(p.dose?" "+p.dose:"")+(p.lot?" (Lot:"+p.lot+")":"")).join(", "):"-"}</td>
        <td style="font-style:italic;color:#6a5838">${v.observations||"-"}</td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:Georgia,serif;margin:20px;color:#1a1205}h1{color:#7a5200;border-bottom:1px solid #d4c4a0;padding-bottom:8px}
    table{width:100%;border-collapse:collapse;font-size:10px}th{background:#f5e8cc;color:#7a5200;padding:5px;text-align:left;border:0.5px solid #d4c4a0}
    td{padding:4px 5px;border:0.5px solid #ede5d4}tr:nth-child(even){background:#fffdf7}.total{background:#f5f5f0;font-weight:bold}</style></head>
    <body><h1>Champagne Nowack — Campagne ${annee}</h1>
    <p style="color:#9a8870;font-size:12px">${vAnnee.length} apport(s) — Total : ${kgTotal.toLocaleString()} kg / ${hlTotal.toFixed(2)} HL — Maison : ${kgMaison.toLocaleString()} kg — Negoce : ${kgNegoce.toLocaleString()} kg</p>
    <table><thead><tr><th>Date</th><th>Parcelles</th><th>Cuvee</th><th>Marc</th><th>Kg</th><th>HL</th><th>Destination</th><th>Degre</th><th>Acidite</th><th>SO2</th><th>pH</th><th>Cuve Taille</th><th>Cuve Cuvee A</th><th>Cuve Cuvee B</th><th>Produits ajoutes</th><th>Observations</th></tr></thead>
    <tbody>${rows}<tr class="total"><td colspan="4">TOTAL</td><td>${kgTotal.toLocaleString()} kg</td><td>${hlTotal.toFixed(2)} HL</td><td>Maison: ${kgMaison.toLocaleString()} kg / Negoce: ${kgNegoce.toLocaleString()} kg</td><td colspan="8"></td></tr></tbody></table>
    </body></html>`;
    const w = window.open("","_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(()=>w.print(),500);
  };

  const submitVendange = () => {
    if(!vendangeForm.parcelleId&&(!vendangeForm.parcelleIds||vendangeForm.parcelleIds.length===0)) return alert("Selectionner au moins une parcelle.");
    if(!vendangeForm.date) return alert("La date est requise.");
    const v = { id:editingVendange?editingVendange.id:`vend_${Date.now()}`, ...vendangeForm, timestamp:new Date().toISOString() };
    if(editingVendange) {
      setVendanges(prev=>prev.map(x=>x.id===editingVendange.id?v:x));
    } else {
      setVendanges(prev=>[v,...prev]);
      const vol = parseFloat(vendangeForm.volumeRecolte)||0;
      if(vendangeForm.nouvelleCuveNom.trim()) {
        const cuve = {
          id:vendangeForm.nouvelleCuveNom.trim(),
          appellation:"vins_clairs_"+vendangeForm.annee,
          denomination:parcelles.find(p=>p.id===vendangeForm.parcelleId)?.nom||"Vendange",
          millesime:+vendangeForm.annee,
          volume:parseFloat(vendangeForm.nouvelleCuveVolume)||Math.ceil(vol*1.1),
          tonnelier:"",grain:"",chauffe:"",certif:"BIO",statut:"actif",
          contenuActuel:vol, marc:vendangeForm.numeroMarc||"",
          commentaire:`Marc ${vendangeForm.numeroMarc||"-"} - Vendange ${vendangeForm.annee} - ${parcelles.find(p=>p.id===vendangeForm.parcelleId)?.nom||""}`,
        };
        setTonneaux(prev=>[...prev,cuve]); saveTonneau(cuve);
      } else if(vendangeForm.cuveReception) {
        setTonneaux(prev=>{ const upd=prev.map(t=>t.id===vendangeForm.cuveReception?{...t,contenuActuel:Math.min(t.volume,t.contenuActuel+vol)}:t); upd.filter(t=>t.id===vendangeForm.cuveReception).forEach(t=>saveTonneau(t)); return upd; });
      }
    }
    saveVendange(v);
    // Mettre a jour les cuves de cuverie (taille, cuvee A, cuvee B, bourbes)
    console.log("cuves:", {taille:vendangeForm.cuveTailleId, volTaille:vendangeForm.volumeTaille, cuveeA:vendangeForm.cuveCuveeId, bourbes:vendangeForm.cuveBourbesId, volBourbes:vendangeForm.volumeBourbes});
    console.log("cuvesCuverie:", cuvesCuverie.map(c=>c.id));
    if(!editingVendange) {
      // Mise a jour groupee des cuves cuverie
      const updates = [
        {id:vendangeForm.cuveTailleId, vol:vendangeForm.volumeTaille},
        {id:vendangeForm.cuveCuveeId,  vol:vendangeForm.volumeCuvee},
        {id:vendangeForm.cuveCuveeBId, vol:vendangeForm.volumeCuveeB},
        {id:vendangeForm.cuveBourbesId,vol:vendangeForm.volumeBourbes},
      ].filter(u=>u.id&&u.vol&&parseFloat(u.vol)>0);
      if(updates.length>0) {
        setCuvesCuverie(prev=>{
          const next = prev.map(c=>{
            const u = updates.find(u=>u.id===c.id);
            if(u) {
              const updated = {...c, contenuActuelHL:String(Math.round(((parseFloat(c.contenuActuelHL)||0)+(parseFloat(u.vol)||0))*100)/100)};
              fbSave("cuvesCuverie", c.id, updated);
              return updated;
            }
            return c;
          });
          return next;
        });
      }
    }

    if(!editingVendange) { tonneaux.forEach(t=>saveTonneau(t)); }
    setVendangeForm(VENDANGE_EMPTY); setEditingVendange(null); setShowVendangeForm(false);
  };

  const annulerMouvement = (mvt) => {
    if(!window.confirm("Annuler ce mouvement et restaurer les volumes ?")) return;
    const vol = parseFloat(mvt.volume)||0;
    let upd = [...tonneaux];
    if(mvt.type==="soutirage" && mvt.futSource?.[0] && mvt.futDest){
      upd=upd.map(t=>{ if(t.id===mvt.futSource[0]) return{...t,contenuActuel:Math.min(t.volume,t.contenuActuel+vol)}; if(t.id===mvt.futDest) return{...t,contenuActuel:Math.max(0,t.contenuActuel-vol)}; return t; });
    } else if(["ecoulage","perte"].includes(mvt.type) && mvt.futSource?.[0]){
      upd=upd.map(t=>t.id===mvt.futSource[0]?{...t,contenuActuel:Math.min(t.volume,t.contenuActuel+vol)}:t);
    } else if(["remplissage","ouillage"].includes(mvt.type) && mvt.futDest){
      upd=upd.map(t=>t.id===mvt.futDest?{...t,contenuActuel:Math.max(0,t.contenuActuel-vol)}:t);
    } else if(mvt.type==="assemblage"){
      if(!window.confirm("L'assemblage ne peut pas etre restaure automatiquement. Supprimer quand meme ?")) return;
    } else if(mvt.type==="entonnage" && mvt.entonnageCuveId) {
      // Remettre le volume dans la cuve cuverie
      const volTotal = (mvt.entonnageFuts||[]).reduce((s,ef)=>s+(parseFloat(ef.volume)||0),0);
      setCuvesCuverie(prev=>prev.map(c=>{
        if(c.id===mvt.entonnageCuveId) {
          const updated = {...c, contenuActuelHL:String(Math.round(((parseFloat(c.contenuActuelHL)||0)+volTotal)*100)/100)};
          fbSave("cuvesCuverie", c.id, updated);
          return updated;
        }
        return c;
      }));
      // Deduire des futs destination
      upd = upd.map(t=>{
        const ef = (mvt.entonnageFuts||[]).find(ef=>ef.futId===t.id);
        if(ef) {
          const volL = Math.round(parseFloat(ef.volume)*100);
          return {...t, contenuActuel:Math.max(0,(t.contenuActuel||0)-volL)};
        }
        return t;
      });
    }
    setTonneaux(upd);
    upd.forEach(t=>saveTonneau(t));
    setMouvements(prev=>prev.filter(m=>m.id!==mvt.id));
    deleteMouvementFb(mvt.id);
  };

  // Notes de degustation
  const openEditNote = (note) => {
    setEditingNote(note);
    setEditNoteForm({boise:note.boise??'',longueur:note.longueur??'',noteG:note.noteG??'',commentaire:note.commentaire||''});
    setShowEditDeg(true);
  };
  const saveEditNote = () => {
    const updated = {...editingNote,
      boise:   editNoteForm.boise!==''?parseFloat(editNoteForm.boise):null,
      longueur:editNoteForm.longueur!==''?parseFloat(editNoteForm.longueur):null,
      noteG:   editNoteForm.noteG!==''?parseFloat(editNoteForm.noteG):null,
      commentaire:editNoteForm.commentaire,
    };
    setDegustations(prev=>prev.map(d=>d.id===editingNote.id?updated:d));
    saveDegustation(updated);
    setShowEditDeg(false); setEditingNote(null);
  };
  const deleteNote = (id) => {
    if(!window.confirm("Supprimer cette note ?")) return;
    setDegustations(prev=>prev.filter(d=>d.id!==id)); deleteDegustationFb(id);
  };

  const submitMouvement = () => {
    if(!mvtForm.operateur) return alert("Opérateur requis.");
    const vol = parseFloat(mvtForm.volume)||0;
    let upd = [...tonneaux];
    if(mvtForm.type==="soutirage" && mvtForm.futSource[0] && mvtForm.futDest){
      upd=upd.map(t=>{ if(t.id===mvtForm.futSource[0]) return{...t,contenuActuel:Math.max(0,t.contenuActuel-vol)}; if(t.id===mvtForm.futDest) return{...t,contenuActuel:Math.min(t.volume,t.contenuActuel+vol)}; return t; });
    } else if(mvtForm.type==="assemblage" && mvtForm.futDest){
      const tot=mvtForm.futSource.reduce((s,id)=>s+(parseFloat(mvtForm.assemblageVolumes[id])||getTonneau(id)?.contenuActuel||0),0);
      upd=upd.map(t=>{
        if(mvtForm.futSource.includes(t.id)) {
          const volPris = parseFloat(mvtForm.assemblageVolumes[t.id])||t.contenuActuel||0;
          const reste = Math.max(0,(t.contenuActuel||0)-volPris);
          return {...t, contenuActuel:reste, statut:reste<=0?"vide":t.statut};
        }
        if(t.id===mvtForm.futDest && mvtForm.type!=="assemblage") return{...t,contenuActuel:Math.min(t.volume,(t.contenuActuel||0)+tot)};
        return t;
      });
      // For assemblage, update cuverie destination
      if(mvtForm.type==="assemblage" && mvtForm.futDest) {
        const totHL = tot/100;
        setCuvesCuverie(prev=>prev.map(c=>{
          if(c.id===mvtForm.futDest) {
            const updated = {...c, contenuActuelHL:String(Math.round(((parseFloat(c.contenuActuelHL)||0)+totHL)*100)/100)};
            fbSave("cuvesCuverie", c.id, updated);
            return updated;
          }
          return c;
        }));
      }
    } else if(mvtForm.type==="perte" && mvtForm.futSource.length>0){
      upd=upd.map(t=>{
        if(mvtForm.futSource.includes(t.id)) { const volPerte=parseFloat(mvtForm.perteVolumes[t.id])||0; return {...t,contenuActuel:Math.max(0,(t.contenuActuel||0)-volPerte)}; }
        return t;
      });
    } else if(mvtForm.type==="ecoulage" && mvtForm.futSource[0]){
      upd=upd.map(t=>t.id===mvtForm.futSource[0]?{...t,contenuActuel:Math.max(0,t.contenuActuel-vol)}:t);
    } else if(mvtForm.type==="vidange"){
      upd=upd.map(t=>mvtForm.futSource.includes(t.id)?{...t,contenuActuel:0,statut:"vide"}:t);
    } else if(mvtForm.type==="ouillage" && mvtForm.futSource[0]){
      const volTotalOuillage = (mvtForm.ouillageDestFuts||[]).reduce((s,ef)=>s+(parseFloat(ef.volume)||0),0);
      upd=upd.map(t=>{
        if(t.id===mvtForm.futSource[0]) return {...t,contenuActuel:Math.max(0,(t.contenuActuel||0)-volTotalOuillage)};
        const ef=(mvtForm.ouillageDestFuts||[]).find(ef=>ef.futId===t.id);
        if(ef&&parseFloat(ef.volume)>0) return {...t,contenuActuel:Math.min(t.volume,(t.contenuActuel||0)+(parseFloat(ef.volume)||0))};
        return t;
      });
    } else if(mvtForm.type==="remplissage" && mvtForm.futDest){
      upd=upd.map(t=>t.id===mvtForm.futDest?{...t,contenuActuel:Math.min(t.volume,t.contenuActuel+vol)}:t);
    }
    setTonneaux(upd);
    upd.forEach(t => saveTonneau(t));

    // Entonnage: mettre a jour la cuve cuverie source et les futs destination
    if(mvtForm.type==="entonnage" && mvtForm.entonnageCuveId) {
      const volTotal = (mvtForm.entonnageFuts||[]).reduce((s,ef)=>s+(parseFloat(ef.volume)||0),0);
      // Deduire de la cuve cuverie
      setCuvesCuverie(prev=>prev.map(c=>{
        if(c.id===mvtForm.entonnageCuveId) {
          const updated = {...c, contenuActuelHL:String(Math.max(0,Math.round(((parseFloat(c.contenuActuelHL)||0)-(volTotal))*100)/100))};
          fbSave("cuvesCuverie", c.id, updated);
          return updated;
        }
        return c;
      }));
      // Ajouter dans les futs destination (en L) + reporter le marc
      const vendangeSource = mvtForm.entonnageVendangeId ? vendanges.find(v=>v.id===mvtForm.entonnageVendangeId) : null;
      const updFuts = tonneaux.map(t=>{
        const ef = (mvtForm.entonnageFuts||[]).find(ef=>ef.futId===t.id);
        if(ef && parseFloat(ef.volume)>0) {
          const volL = Math.round(parseFloat(ef.volume)*100);
          const updated = {...t, 
            contenuActuel:Math.min(t.volume, (t.contenuActuel||0)+volL), 
            statut:"actif",
            marc: vendangeSource?.numeroMarc||t.marc||"",
            denomination: t.denomination||vendangeSource?.cuveeCreee||t.denomination,
          };
          saveTonneau(updated);
          return updated;
        }
        return t;
      });
      setTonneaux(updFuts);
    }

    if(mvtForm.type==="ajout_produit" && !mvtForm.numeroLot.trim()) return alert("Le numéro de lot est obligatoire pour un ajout de produit.");
    // Créer un mouvement par fut pour perte et ouillage
    if(mvtForm.type==="perte" && mvtForm.futSource.length>0) {
      const mvts = mvtForm.futSource.map((futId,i)=>({
        id:(Date.now()+i).toString(),
        ...mvtForm,
        futSource:[futId],
        volume:mvtForm.perteVolumes[futId]||"0",
        timestamp:new Date().toISOString()
      }));
      setMouvements(prev=>[...mvts,...prev]);
      mvts.forEach(m=>saveMouvement(m));
    } else if(mvtForm.type==="ouillage" && (mvtForm.ouillageDestFuts||[]).length>0) {
      const volTotal = (mvtForm.ouillageDestFuts||[]).reduce((s,ef)=>s+(parseFloat(ef.volume)||0),0);
      // Mouvement perte pour le fut source
      const mvtSrc = {
        id:Date.now().toString(),
        type:"perte",
        date:mvtForm.date,
        operateur:mvtForm.operateur,
        futSource:mvtForm.futSource,
        futDest:"",
        volume:String(volTotal),
        notes:"Ouillage - perte de "+volTotal+"L",
        timestamp:new Date().toISOString()
      };
      // Un mouvement ouillage par fut destination
      const mvtsDest = (mvtForm.ouillageDestFuts||[]).filter(ef=>ef.futId&&parseFloat(ef.volume)>0).map((ef,i)=>({
        id:(Date.now()+i+1).toString(),
        type:"ouillage",
        date:mvtForm.date,
        operateur:mvtForm.operateur,
        futSource:[],
        futDest:ef.futId,
        volume:ef.volume,
        notes:"Ouillage depuis "+mvtForm.futSource[0],
        timestamp:new Date().toISOString()
      }));
      const allMvts = [mvtSrc,...mvtsDest];
      setMouvements(prev=>[...allMvts,...prev]);
      allMvts.forEach(m=>saveMouvement(m));
    } else {
      const newMvt = {id:Date.now().toString(),...mvtForm,timestamp:new Date().toISOString()};
      setMouvements(prev=>[newMvt,...prev]);
      saveMouvement(newMvt);
    }

    setMvtForm({type:"ouillage",date:new Date().toISOString().slice(0,16),operateur:"",futSource:[],futDest:"",volume:"",notes:"",produit:"",dosage:"",numeroLot:""});
    setShowMvtForm(false);
  };

  // Submit dégustation (multi-dégustateurs en une fois)
  const submitDegustation = () => {
    if(!degForm.futId) return alert("Sélectionner un fût.");
    if(!degForm.session) return alert("Nom de session requis (ex. Avril 2026).");
    const lignesRemplies = degForm.lignes.filter(l=>l.noteG!==""||l.commentaire!=="");
    if(lignesRemplies.length===0) return alert("Saisir au moins une note.");
    const nouvelles = lignesRemplies.map((l,i)=>({
      id: `d_${Date.now()}_${i}`,
      futId: degForm.futId,
      session: degForm.session,
      date: degForm.date,
      degustateur: l.degustateur,
      boise:   l.boise   !==""?parseFloat(l.boise):null,
      longueur:l.longueur!==""?parseFloat(l.longueur):null,
      noteG:   l.noteG   !==""?parseFloat(l.noteG):null,
      commentaire: l.commentaire,
    }));
    setDegustations(prev=>[...prev,...nouvelles]);
    nouvelles.forEach(d=>saveDegustation(d));
    setDegForm({futId:"",session:"",date:new Date().toISOString().slice(0,10),lignes:degustateurs.filter(d=>d.actif).map(d=>({degustateur:d.nom,boise:"",longueur:"",noteG:"",commentaire:""}))});
    setShowDegForm(false);
  };

  // Import CSV des notes existantes
  const handleImport = () => {
    setImportMsg("");
    const lines = importText.trim().split("\n").filter(l=>l.trim());
    if(lines.length<2){setImportMsg("X Format invalide. Vérifiez le fichier."); return;}
    const header = lines[0].split(";").map(h=>h.trim().toLowerCase());
    const required = ["fut_id","session","degustateur","note_g"];
    const missing = required.filter(r=>!header.includes(r));
    if(missing.length>0){setImportMsg(`X Colonnes manquantes : ${missing.join(", ")}`); return;}
    const idx = (col) => header.indexOf(col);
    const nouvelles = [];
    for(let i=1;i<lines.length;i++){
      const cols = lines[i].split(";").map(c=>c.trim());
      const futId = cols[idx("fut_id")];
      if(!futId) continue;
      nouvelles.push({
        id:`imp_${Date.now()}_${i}`,
        futId,
        session: cols[idx("session")]||"",
        date:    cols[idx("date")]||"",
        degustateur: cols[idx("degustateur")]||"",
        boise:   cols[idx("boise")]   !==""&&cols[idx("boise")]   !==undefined ? parseFloat(cols[idx("boise")]) : null,
        longueur:cols[idx("longueur")]!==""&&cols[idx("longueur")]!==undefined ? parseFloat(cols[idx("longueur")]) : null,
        noteG:   cols[idx("note_g")] !==""&&cols[idx("note_g")] !==undefined  ? parseFloat(cols[idx("note_g")]) : null,
        commentaire: cols[idx("commentaire")]||"",
      });
    }
    if(nouvelles.length===0){setImportMsg("X Aucune ligne valide trouvée."); return;}
    setDegustations(prev=>[...prev,...nouvelles]);
    setImportMsg(`OK ${nouvelles.length} notes importées avec succès !`);
    setImportText("");
  };

  // Styles
  const s = {
    app:      { fontFamily:"'Lora','Georgia',serif", minHeight:"100vh", background:"#f0e9d6", color:"#1a1205" },
    nav:      { display:"flex", alignItems:"center", borderBottom:"2px solid #c8a850", padding:"0 28px", background:"#fffdf7", boxShadow:"0 1px 0 #d4c4a0" },
    brand:    { fontFamily:"'Playfair Display',Georgia,serif", fontSize:"clamp(14px,2vw,19px)", fontWeight:700, color:"#7a5200", padding:"12px 16px 12px 0", marginRight:"12px", borderRight:"1px solid #d4c4a0", letterSpacing:"0.01em", whiteSpace:"nowrap" },
    navBtn:   (a)=>({ padding:"13px 14px", fontSize:"12px", letterSpacing:"0.09em", textTransform:"uppercase", cursor:"pointer", color:a?"#7a5200":"#9a8c78", background:"none", border:"none", borderBottom:a?"2px solid #b8860b":"2px solid transparent", fontFamily:"'IBM Plex Mono',monospace", fontWeight:a?600:400, transition:"color 0.15s" }),
    main:     { padding:"clamp(12px, 3vw, 28px) clamp(12px, 3vw, 32px)" },
    card:     { background:"#fffdf7", border:"1px solid #d4c4a0", borderRadius:"10px", padding:"18px 22px", boxShadow:"0 1px 3px rgba(139,105,20,0.06)" },
    cardSm:   { background:"#fffdf7", border:"1px solid #cfc0a0", borderRadius:"8px", padding:"12px 14px", boxShadow:"0 1px 2px rgba(139,105,20,0.05)" },
    btn:      { background:"#b8860b", color:"#1a1208", border:"none", borderRadius:"6px", padding:"8px 18px", fontSize:"12px", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", boxShadow:"0 1px 3px rgba(139,105,20,0.25)", transition:"background 0.15s" },
    btnSm:    { background:"#b8860b", color:"#1a1208", border:"none", borderRadius:"5px", padding:"5px 11px", fontSize:"11px", fontWeight:700, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.04em" },
    ghost:    { background:"none", color:"#5a4a30", border:"1px solid #c8b894", borderRadius:"6px", padding:"6px 13px", fontSize:"12px", cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", transition:"background 0.12s" },
    ghostSm:  { background:"none", color:"#6a5838", border:"1px solid #ccbe9a", borderRadius:"5px", padding:"4px 9px", fontSize:"11px", cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace" },
    lbl:      { fontSize:"10px", letterSpacing:"0.12em", textTransform:"uppercase", color:"#7a6840", marginBottom:"5px", display:"block", fontFamily:"'IBM Plex Mono',monospace" },
    inp:      { background:"#fffbf3", border:"1px solid #c8b894", borderRadius:"6px", padding:"8px 11px", fontSize:"13px", color:"#1a1205", width:"100%", fontFamily:"'Lora',serif", boxSizing:"border-box", outline:"none" },
    sel:      { background:"#fffbf3", border:"1px solid #c8b894", borderRadius:"6px", padding:"8px 11px", fontSize:"13px", color:"#1a1205", width:"100%", fontFamily:"'Lora',serif", boxSizing:"border-box" },
    tag:      (c)=>({ display:"inline-flex", alignItems:"center", background:c+"18", color:c, border:`1px solid ${c}55`, borderRadius:"4px", padding:"2px 8px", fontSize:"10px", fontWeight:700, letterSpacing:"0.05em", fontFamily:"'IBM Plex Mono',monospace" }),
    tabBtn:   (a)=>({ padding:"9px 16px", fontSize:"11px", letterSpacing:"0.07em", textTransform:"uppercase", cursor:"pointer", color:a?"#7a5200":"#7a6840", background:a?"#fffbf3":"none", border:"none", borderBottom:a?"2px solid #b8860b":"2px solid transparent", fontFamily:"'IBM Plex Mono',monospace", fontWeight:a?600:400 }),
    modal:    { position:"fixed", inset:0, background:"rgba(30,20,5,0.78)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(2px)" },
    modalBox: { background:"#fffdf7", border:"1px solid #cfc0a0", borderRadius:"12px", padding:"30px", width:"640px", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 8px 32px rgba(44,36,22,0.18)" },
  };

  const filteredTonneaux = tonneaux.filter(t=>{
    if(filterAppellation && t.appellation!==filterAppellation) return false;
    if(filterDenom && t.denomination!==filterDenom) return false;
    if(filterStatut==="actif" && t.statut==="vide") return false;
    if(filterStatut==="vide" && t.statut!=="vide") return false;
    if(filterStatut==="surveillance" && t.statut!=="surveillance") return false;
    if(searchFut && !t.id.toLowerCase().includes(searchFut.toLowerCase()) && !t.denomination.toLowerCase().includes(searchFut.toLowerCase())) return false;
    return true;
  });
  const filteredMouvements = mouvements.filter(m=>{
    if(filterMvtType && m.type!==filterMvtType) return false;
    if(filterOp && m.operateur!==filterOp) return false;
    if(filterFut && !m.futSource?.includes(filterFut) && m.futDest!==filterFut) return false;
    return true;
  });

  const totalVin = tonneaux.reduce((s,t)=>s+t.contenuActuel,0);
  const totalCap = tonneaux.reduce((s,t)=>s+t.volume,0);

  // -- COMPOSANTS ------------------------------------------------------------

  const FutCard = ({t}) => {
    const p=pct(t); const ng=avgNoteG(t.id); const hasNotes=notesForFut(t.id).length>0;
    const apc = getApc(t.appellation);
    const borderCol = t.statut==="surveillance" ? "#854F0B88" : apc.border;
    const barCol    = t.statut==="surveillance" ? "#c47800"   : apc.color;
    return (
      <div style={{...s.cardSm,position:"relative",overflow:"hidden", borderColor:borderCol, borderWidth:t.statut==="surveillance"?"2px":"1px", background:t.statut==="surveillance"?"#fff8e8":apc.bg||"#1a1a1c"}}>
        <div style={{position:"absolute",bottom:0,left:0,width:`${p}%`,height:"2px",background:barCol}}/>
        <div style={{position:"absolute",top:0,left:0,width:"3px",height:"100%",background:apc.color,opacity:0.7}}/>
        {/* actions top-right */}
        <div style={{position:"absolute",top:"4px",right:"4px",display:"flex",gap:"2px",opacity:0,transition:"opacity 0.15s"}} className="fut-actions">
          <button title="Modifier" style={{background:"#2a2a2c",border:"none",borderRadius:"3px",padding:"3px 5px",cursor:"pointer",color:"#5a4a30",fontSize:"11px"}}
            onClick={e=>{e.stopPropagation();openEditFut(selectedT);}}>
            <i className="ti ti-pencil"/>
          </button>
          <button title="Supprimer" style={{background:"#fdd0d0",border:"none",borderRadius:"3px",padding:"3px 5px",cursor:"pointer",color:"#cc2222",fontSize:"11px"}}
            onClick={e=>{e.stopPropagation();deleteFut(selectedT.id);}}>
            <i className="ti ti-trash"/>
          </button>
        </div>
        <div style={{cursor:"pointer"}} onClick={()=>{setSelectedFut(t.id);setView("fiche");setFicheTab("degustations");}}>
          {t.statut==="surveillance"&&<div style={{fontSize:"9px",background:"#c47800",color:"#fff",padding:"1px 6px",marginBottom:"3px",borderRadius:"3px",display:"inline-block",fontWeight:600,letterSpacing:"0.05em"}}>SURVEILLANCE</div>}
          <div style={{fontSize:"13px",fontWeight:600,color:"#1a1205",marginBottom:"1px",paddingLeft:"6px"}}>{t.id}</div>
          <div style={{fontSize:"10px",color:"#6a5838",marginBottom:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingLeft:"6px"}}>{t.denomination}</div>
          {t.certif==="BIO"&&<div style={{paddingLeft:"6px",marginBottom:"4px"}}><span style={{fontSize:"10px",background:"#2d6a00",color:"#fff",borderRadius:"3px",padding:"1px 6px",fontWeight:600}}>🌿 BIO</span></div>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingLeft:"6px"}}>
            <span style={{fontSize:"10px",color:"#7a6840"}}>{t.marc?"Marc "+t.marc+" · ":""}{t.millesime||"-"} · {t.volume}L</span>
            <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
              {hasNotes && <span style={{fontSize:"10px",color:apc.color,fontWeight:600}}>{ng?.toFixed(1)}*</span>}
              {(parseFloat(t.volumeRI)||0)>0&&<span style={{fontSize:"9px",background:t.appellation==="ri"?"#1a7a40":"#8B0000",color:"#fff",fontFamily:"monospace",borderRadius:"3px",padding:"1px 4px",marginRight:"3px",fontWeight:600}}>{t.appellation==="ri"?"AOC":"RI"}</span>}
              <span style={{fontSize:"11px",fontWeight:600,color:p<20?"#cc2222":p>90?"#1a7a40":apc.color}}>{t.contenuActuel}L</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MvtRow = ({m}) => {
    const srcs=(m.futSource||[]).map(id=>getTonneau(id)).filter(Boolean);
    const dest=m.futDest?getTonneau(m.futDest):null;
    return (
      <div style={{borderBottom:"1px solid #d0c4a0",padding:"10px 4px",display:"grid",gridTemplateColumns:"120px 1fr 1fr 70px 70px",gap:"10px",fontSize:"12px",alignItems:"start"}}>
        <div>
          <div style={{...s.tag(typeColor(m.type)),marginBottom:"4px"}}>{typeLabel(m.type)}</div>
          <div style={{color:"#8a7248",fontSize:"10px",marginTop:"3px"}}>{fmtDate(m.timestamp)}</div>
        </div>
        <div>
          {srcs.length>0&&<div style={{marginBottom:"3px"}}><span style={{color:"#8a7248",marginRight:"4px"}}>De :</span>{srcs.map(f=><span key={f.id} style={{color:"#b8860b",marginRight:"6px"}}>{f.id}<span style={{color:"#7a6840"}}> ({f.denomination})</span></span>)}</div>}
          {dest&&<div><span style={{color:"#8a7248",marginRight:"4px"}}>Vers :</span><span style={{color:"#b8860b"}}>{dest.id}<span style={{color:"#7a6840"}}> ({dest.denomination})</span></span></div>}
          {m.type==="entonnage"?(
            <div style={{color:"#6a5838",marginTop:"2px"}}>Vol : <strong style={{color:"#1a1205"}}>{(m.entonnageFuts||[]).reduce((s,ef)=>s+(parseFloat(ef.volume)||0),0).toFixed(2)} HL</strong></div>
          ):(
            m.volume&&<div style={{color:"#6a5838",marginTop:"2px"}}>Vol : <strong style={{color:"#1a1205"}}>{m.volume}L</strong></div>
          )}
          {m.produit&&<div style={{color:"#6a5838",marginTop:"2px"}}>{m.produit}{m.dosage&&` - ${m.dosage}`}{m.numeroLot&&<span style={{marginLeft:"6px",fontSize:"10px",background:"#fff8ee",border:"1px solid #d4c4a0",borderRadius:"3px",padding:"1px 5px",color:"#7a5200",fontFamily:"monospace"}}>Lot: {m.numeroLot}</span>}</div>}
        </div>
        <div style={{color:"#6a5838",fontStyle:"italic",fontSize:"11px"}}>{m.notes}</div>
        <div style={{color:"#8a7248",fontSize:"11px"}}>{m.operateur}</div>
        <div style={{textAlign:"right"}}>
          <button title="Annuler ce mouvement"
            style={{background:"#fce8e8",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"4px 7px",fontSize:"10px",cursor:"pointer",fontFamily:"monospace",fontWeight:600,whiteSpace:"nowrap"}}
            onClick={()=>annulerMouvement(m)}>
            Annuler
          </button>
        </div>
      </div>
    );
  };

  const DegRow = ({d}) => (
    <div style={{borderBottom:"1px solid #d0c4a0",padding:"8px 0",display:"grid",gridTemplateColumns:"100px 70px 70px 70px 1fr 64px",gap:"8px",fontSize:"12px",alignItems:"center"}}>
      <div style={{color:"#b8860b",fontWeight:600}}>{d.degustateur}</div>
      <div style={{color:d.boise>=2.5?"#c47800":"#6a5838"}}>{d.boise!=null?`B: ${d.boise}`:"-"}</div>
      <div style={{color:"#6a5838"}}>{d.longueur!=null?`L: ${d.longueur}`:"-"}</div>
      <div style={{fontWeight:600,color:d.noteG>=4?"#1a7a40":d.noteG>=3?"#b8860b":"#7a6840"}}>{d.noteG!=null?`${d.noteG}/5`:"-"}</div>
      <div style={{color:"#6a5838",fontStyle:"italic",fontSize:"11px"}}>{d.commentaire}</div>
      <div style={{display:"flex",gap:"3px",justifyContent:"flex-end"}}>
        <button title="Modifier" style={{background:"#fff8ee",border:"1px solid #d4c4a0",borderRadius:"3px",padding:"3px 6px",cursor:"pointer",color:"#7a5200",fontSize:"11px"}}
          onClick={()=>openEditNote(d)}>Mod.</button>
        <button title="Supprimer" style={{background:"#fce8e8",border:"1px solid #f0b4b4",borderRadius:"3px",padding:"3px 6px",cursor:"pointer",color:"#cc2222",fontSize:"11px"}}
          onClick={()=>deleteNote(d.id)}>Sup.</button>
      </div>
    </div>
  );

  const NoteResume = ({futId}) => {
    const notes=notesForFut(futId); if(!notes.length) return <div style={{color:"#8a7248",fontSize:"13px",padding:"8px 0"}}>Aucune note de dégustation.</div>;
    const ng=avgNoteG(futId); const nb=avgBoise(futId); const nl=avgLong(futId);
    const sessionsUniques=[...new Set(notes.map(d=>d.session))];
    return (
      <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"16px"}}>
          {[["Note globale moy.", ng?.toFixed(2)||"-", ng>=4?"#1a7a40":ng>=3?"#b8860b":"#888"],
            ["Boisé moyen",      nb?.toFixed(2)||"-", "#888"],
            ["Longueur moy.",    nl?.toFixed(2)||"-", "#888"]].map(([lbl,val,col],i)=>(
            <div key={i} style={{background:"#fffbf3",borderRadius:"6px",padding:"10px 14px"}}>
              <div style={{fontSize:"10px",color:"#8a7248",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"4px"}}>{lbl}</div>
              <div style={{fontSize:"20px",fontWeight:600,color:col}}>{val}</div>
            </div>
          ))}
        </div>
        {sessionsUniques.map(sess=>(
          <div key={sess} style={{marginBottom:"16px"}}>
            <div style={{fontSize:"10px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7a6840",marginBottom:"8px",paddingBottom:"6px",borderBottom:"1px solid #e8dcc6"}}>{sess}</div>
            {notes.filter(d=>d.session===sess).map(d=><DegRow key={d.id} d={d}/>)}
          </div>
        ))}
      </div>
    );
  };

  const needsSource = ["soutirage","ecoulage","perte","vidange","batonnage","assemblage"].includes(mvtForm.type);
  const needsDest   = ["soutirage","remplissage"].includes(mvtForm.type);
  const needsVol    = ["soutirage","ecoulage","perte","remplissage"].includes(mvtForm.type);

  const selectedT   = selectedFut ? getTonneau(selectedFut) : null;
  const selectedP   = selectedT ? Math.round((selectedT.contenuActuel/selectedT.volume)*100) : 0;
  const selectedMvts= selectedT ? mouvements.filter(m=>m.futSource?.includes(selectedT.id)||m.futDest===selectedT.id) : [];
  const futsAvecNotes = tonneaux.filter(t=>notesForFut(t.id).length>0);
  const cuveeOptions  = [...new Set(futsAvecNotes.map(t=>t.denomination))].sort();
  const fabricOptions = [...new Set(futsAvecNotes.map(t=>t.tonnelier).filter(Boolean))].sort();
  const futsFiltres   = futsAvecNotes.filter(t=>{
    if(filterDegFut    && !t.id.toLowerCase().includes(filterDegFut.toLowerCase())) return false;
    if(filterDegCuvee  && t.denomination!==filterDegCuvee) return false;
    if(filterDegFabric && t.tonnelier!==filterDegFabric) return false;
    return true;
  });
  const hasFilter = filterDegFut||filterDegCuvee||filterDegFabric;

  return (
    <div style={s.app}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=IBM+Plex+Mono:wght@400;600&family=Lora:wght@400;500;600&display=swap" rel="stylesheet"/>
      {appError && <div style={{position:"fixed",top:0,left:0,right:0,background:"red",color:"white",padding:"20px",zIndex:9999,fontSize:"12px",fontFamily:"monospace",whiteSpace:"pre-wrap"}}>{String(appError)}</div>}
      <style>{`
  body { background:#f0e9d6; }
  .fut-actions { opacity:0 !important; transition:opacity 0.15s; }
  div:hover > .fut-actions { opacity:1 !important; }
  button:hover { filter:brightness(0.96); }
  input:focus, select:focus, textarea:focus { border-color:#b8860b !important; box-shadow:0 0 0 2px rgba(201,169,110,0.15) !important; outline:none; }
  ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:#e8dcc6; } ::-webkit-scrollbar-thumb { background:#c8b894; border-radius:3px; }
`}</style>

      {/* NAV */}
      <nav style={{...s.nav, flexWrap:"nowrap", overflowX:"auto", WebkitOverflowScrolling:"touch"}} className="nav-scroll">
        <div style={s.brand}>Nowack</div>
        {[["dashboard","Vue d'ensemble"],["vigne","Vigne"],["vendanges","Vendange"],["mouvements","Mouvements"],["tonneaux","Vinification"],["degustations","Dégustations"],["tirages","Tirage"],["stock","Stock"]].map(([v,l])=>(
          <button key={v} style={s.navBtn(view===v)} onClick={()=>{setView(v);refreshFromFirebase();}}>{l}</button>
        ))}
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>

          <button style={{...s.ghost,fontSize:"11px",color:"#2d6a00",borderColor:"#7ab84880"}} onClick={refreshFromFirebase} title="Synchroniser avec Firebase">
            <i className="ti ti-refresh" style={{marginRight:"4px"}}/>Sync
          </button>
        </div>
      </nav>
      <div style={s.main}>

        {/* -- DASHBOARD -- */}
        {view==="dashboard" && (
          <div>

            {/* SECTION 1 : STOCK CHAI */}
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#7a5200",fontWeight:500}}>Stock chai</div>
              <div style={{flex:1,height:"1px",background:"linear-gradient(to right, #d4c4a0, transparent)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"12px",marginBottom:"12px"}}>
              {(()=>{
                const totalVin = tonneaux.filter(t=>t.statut!=="vide").reduce((s,t)=>s+(t.contenuActuel||0),0);
                const totalCap = tonneaux.reduce((s,t)=>s+(t.volume||0),0);
                const totalTirable = tonneaux.reduce((s,t)=>{ if(t.statut==="vide") return s; if(t.appellation==="ri") return s+Math.max(0,((t.contenuActuel||0)/100)-((parseFloat(t.volumeRI)||0)/100)); return s+Math.max(0,((t.contenuActuel||0)/100)-((parseFloat(t.volumeRI)||0)/100)); },0);
                return [
                  {lbl:"Volume total",val:(totalVin/100).toFixed(2)+" HL",sub:`cap. ${(totalCap/100).toFixed(0)} HL`},
                  {lbl:"Volume tirable",val:totalTirable.toFixed(2)+" HL",sub:"~"+Math.floor(totalTirable*100/0.75).toLocaleString("fr-FR")+" btl 75cl",col:"#1a7a40"},
                ].map((k,i)=>(
                  <div key={i} style={s.card}>
                    <div style={s.lbl}>{k.lbl}</div>
                    <div style={{fontSize:"28px",fontWeight:700,color:k.col||"#b8860b",letterSpacing:"-0.5px"}}>{k.val}</div>
                    <div style={{fontSize:"11px",color:"#9a8870",marginTop:"4px"}}>{k.sub}</div>
                  </div>
                ));
              })()}
            </div>
            {(()=>{
              const annee = new Date().getFullYear().toString();
              const riRequisAnnee = riRequis.find(r=>r.annee===annee);
              const totalRI = tonneaux.reduce((s,t)=>{ if(t.appellation==="ri") return s+((parseFloat(t.volumeRI)||0)>0?(parseFloat(t.volumeRI)||0)/100:(t.contenuActuel||0)/100); return s+(parseFloat(t.volumeRI)||0)/100; },0);
              const riOk = !riRequisAnnee || totalRI>=(parseFloat(riRequisAnnee.volumeHL)||0);
              return (
                <div style={{...s.card,marginBottom:"12px",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",background:riOk?"#fff":"#fde8e8",border:riOk?"0.5px solid #d4c4a0":"1px solid #f0b4b4"}}>
                  <div style={{display:"flex",gap:"24px",alignItems:"center"}}>
                    <div><div style={{fontSize:"10px",color:"#9a8870",textTransform:"uppercase",letterSpacing:"0.05em"}}>RI actuelle</div><div style={{fontSize:"18px",fontWeight:600,color:riOk?"#8B0000":"#cc2222"}}>{totalRI.toFixed(2)} <span style={{fontSize:"11px"}}>HL</span></div></div>
                    <div><div style={{fontSize:"10px",color:"#9a8870",textTransform:"uppercase",letterSpacing:"0.05em"}}>RI requise {annee}</div><div style={{fontSize:"18px",fontWeight:600,color:"#9a8870"}}>{riRequisAnnee?.volumeHL||"-"} <span style={{fontSize:"11px"}}>HL</span></div></div>
                    {!riOk&&<div style={{fontSize:"12px",color:"#cc2222",fontWeight:500}}>RI insuffisante</div>}
                  </div>
                  <button style={{...s.ghostSm,fontSize:"11px"}} onClick={()=>setShowRiForm(true)}>Saisir RI requise</button>
                </div>
              );
            })()}
            {(()=>{
              const vinsClairs = tonneaux.filter(t=>t.appellation&&t.appellation.startsWith("vins_clairs")&&t.appellation!=="ri"&&t.statut!=="vide");
              const vinsReserve = tonneaux.filter(t=>t.appellation==="vins_reserve"&&t.statut!=="vide");
              const calcTirable = (futs) => futs.reduce((s,t)=>{ if(t.appellation==="ri") return s+Math.max(0,((t.contenuActuel||0)/100)-((parseFloat(t.volumeRI)||0)/100)); return s+Math.max(0,((t.contenuActuel||0)/100)-((parseFloat(t.volumeRI)||0)/100)); },0);
              return (
                <div style={{...s.card,marginBottom:"28px",padding:"12px 16px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1px 1fr",gap:"0",alignItems:"center"}}>
                    <div style={{paddingRight:"16px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                        <span style={{fontFamily:"Georgia,serif",fontSize:"13px",color:"#2d6a00",fontWeight:500}}>Vins Clairs AOC</span>
                        <span style={{fontSize:"10px",color:"#9a8870"}}>{vinsClairs.length} futs</span>
                      </div>
                      <div style={{display:"flex",gap:"16px"}}>
                        <div><div style={{fontSize:"10px",color:"#9a8870",textTransform:"uppercase",letterSpacing:"0.05em"}}>Tirable</div><div style={{fontSize:"18px",fontWeight:600,color:"#1a7a40"}}>{calcTirable(vinsClairs).toFixed(2)} <span style={{fontSize:"11px"}}>HL</span></div></div>
                        <div><div style={{fontSize:"10px",color:"#9a8870",textTransform:"uppercase",letterSpacing:"0.05em"}}>~Bouteilles</div><div style={{fontSize:"18px",fontWeight:600,color:"#1a7a40"}}>{Math.floor(calcTirable(vinsClairs)*100/0.75).toLocaleString("fr-FR")} <span style={{fontSize:"11px"}}>btl</span></div></div>
                      </div>
                    </div>
                    <div style={{width:"1px",background:"#d4c4a0",alignSelf:"stretch"}}/>
                    <div style={{paddingLeft:"16px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                        <span style={{fontFamily:"Georgia,serif",fontSize:"13px",color:"#7a5200",fontWeight:500}}>Vins de Reserve AOC</span>
                        <span style={{fontSize:"10px",color:"#9a8870"}}>{vinsReserve.length} futs</span>
                      </div>
                      <div style={{display:"flex",gap:"16px"}}>
                        <div><div style={{fontSize:"10px",color:"#9a8870",textTransform:"uppercase",letterSpacing:"0.05em"}}>Tirable</div><div style={{fontSize:"18px",fontWeight:600,color:"#1a7a40"}}>{calcTirable(vinsReserve).toFixed(2)} <span style={{fontSize:"11px"}}>HL</span></div></div>
                        <div><div style={{fontSize:"10px",color:"#9a8870",textTransform:"uppercase",letterSpacing:"0.05em"}}>~Bouteilles</div><div style={{fontSize:"18px",fontWeight:600,color:"#1a7a40"}}>{Math.floor(calcTirable(vinsReserve)*100/0.75).toLocaleString("fr-FR")} <span style={{fontSize:"11px"}}>btl</span></div></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* SECTION 2 : STOCK BOUTEILLES */}
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#7a5200",fontWeight:500}}>Stock bouteilles</div>
              <div style={{flex:1,height:"1px",background:"linear-gradient(to right, #d4c4a0, transparent)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"12px",marginBottom:"28px"}}>
              {(()=>{
                const now = new Date();
                const lots = stockBouteilles.map(l=>({...l,mois:l.dateTirage?Math.floor((now-new Date(l.dateTirage))/(1000*60*60*24*30.5)):0}));
                const total = lots.reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
                const moins15 = lots.filter(l=>l.mois<15).reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
                const plus15 = lots.filter(l=>l.mois>=15).reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
                const alertes = lots.filter(l=>l.mois>=14&&!l.passage15).length;
                return [
                  {lbl:"Total en stock",val:total+" btl",sub:"tous formats",col:"#b8860b"},
                  {lbl:"< 15 mois",val:moins15+" btl",sub:"non commercialisables",col:"#cc2222"},
                  {lbl:"> 15 mois",val:plus15+" btl",sub:"commercialisables",col:"#1a7a40"},
                  {lbl:"Alertes 15 mois",val:alertes+" lot(s)",sub:"a confirmer",col:"#c47800"},
                ].map((k,i)=>(
                  <div key={i} style={s.card}>
                    <div style={s.lbl}>{k.lbl}</div>
                    <div style={{fontSize:"28px",fontWeight:700,color:k.col,letterSpacing:"-0.5px"}}>{k.val}</div>
                    <div style={{fontSize:"11px",color:"#9a8870",marginTop:"4px"}}>{k.sub}</div>
                  </div>
                ));
              })()}
            </div>

            {/* SECTION 3 : ALERTES COIFFES */}
            {(()=>{
              const calcStock = (type) => coiffesStock.filter(c=>c.type===type).reduce((s,c)=>s+(c.operation==="achat"?parseInt(c.qte)||0:-(parseInt(c.qte)||0)),0);
              const alertesCRD = calcStock("CRD")<500;
              const alertesExp = calcStock("Export")<500;
              const alertesCRDMag = calcStock("CRD Magnum")<20;
              const alertesExpMag = calcStock("Export Magnum")<20;
              if(!alertesCRD&&!alertesExp&&!alertesCRDMag&&!alertesExpMag) return null;
              return (
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#cc2222",fontWeight:500}}>Alertes coiffes</div>
                    <div style={{flex:1,height:"1px",background:"linear-gradient(to right, #f0b4b4, transparent)"}}/>
                  </div>
                  <div style={{display:"grid",gap:"8px"}}>
                    {alertesCRD&&<div style={{padding:"10px 14px",background:"#fde8e8",border:"1px solid #f0b4b4",borderRadius:"6px",fontSize:"12px",color:"#cc2222"}}>CRD 75cl : {calcStock("CRD")} coiffes (seuil 500)</div>}
                    {alertesExp&&<div style={{padding:"10px 14px",background:"#fde8e8",border:"1px solid #f0b4b4",borderRadius:"6px",fontSize:"12px",color:"#cc2222"}}>Export 75cl : {calcStock("Export")} coiffes (seuil 500)</div>}
                    {alertesCRDMag&&<div style={{padding:"10px 14px",background:"#fde8e8",border:"1px solid #f0b4b4",borderRadius:"6px",fontSize:"12px",color:"#cc2222"}}>CRD Magnum : {calcStock("CRD Magnum")} coiffes (seuil 20)</div>}
                    {alertesExpMag&&<div style={{padding:"10px 14px",background:"#fde8e8",border:"1px solid #f0b4b4",borderRadius:"6px",fontSize:"12px",color:"#cc2222"}}>Export Magnum : {calcStock("Export Magnum")} coiffes (seuil 20)</div>}
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* -- VIGNE -- */}
        {view==="vigne" && (()=>{
          const allTraits = [...traitements].sort((a,b)=>new Date(b.date)-new Date(a.date));
          const campagnes = [...new Set(allTraits.map(t=>t.campagne))].sort().reverse();
          const traitsFiltres = filterTraitAn ? allTraits.filter(t=>t.campagne===filterTraitAn) : allTraits;
          const biodyFiltres  = filterTraitAn ? biodynamies.filter(b=>b.campagne===filterTraitAn) : biodynamies;
          const amendFiltres  = filterTraitAn ? amendements.filter(a=>a.campagne===filterTraitAn) : amendements;
          const cuivreParCampagne = {};
          campagnes.forEach(c=>{
            cuivreParCampagne[c] = allTraits.filter(t=>t.campagne===c).reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0);
          });
          const closed = isCampagneClosed(filterTraitAn);
          return (
            <div>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
                <div style={{fontSize:"13px",color:"#7a6840"}}>{allTraits.length} traitement(s)</div>
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                  {filterTraitAn && !closed && (
                    <button style={{...s.ghost,fontSize:"11px",color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>cloturerCampagne(filterTraitAn)}>
                      Cloture campagne {filterTraitAn}
                    </button>
                  )}
                  {filterTraitAn && closed && (
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{background:"#fdd0d0",color:"#cc2222",borderRadius:"4px",padding:"3px 10px",fontSize:"11px",fontFamily:"monospace"}}>Campagne {filterTraitAn} cloturee</span>
                      <button style={{...s.ghost,fontSize:"10px"}} onClick={()=>rouvrirCampagne(filterTraitAn)}>Rouvrir</button>
                    </div>
                  )}
                  {!closed && vigneTab==="traitements" && (
                    <button style={s.btn} onClick={()=>{setTraitForm({...TRAIT_EMPTY,campagne:filterTraitAn||new Date().getFullYear().toString()});setEditingTrait(null);setShowTraitForm(true);}}>
                      + Traitement
                    </button>
                  )}
                  {!closed && vigneTab==="biodynamie" && (
                    <button style={s.btn} onClick={()=>{setBiodyForm(f=>({...f,campagne:filterTraitAn||new Date().getFullYear().toString()}));setShowBiodyForm(true);}}>
                      + Biodynamie
                    </button>
                  )}
                  {!closed && vigneTab==="amendements" && (
                    <button style={s.btn} onClick={()=>{setAmendForm(f=>({...f,campagne:filterTraitAn||new Date().getFullYear().toString()}));setShowAmendForm(true);}}>
                      + Amendement
                    </button>
                  )}
                </div>
              </div>

              {/* Filtre campagne */}
              <div style={{display:"flex",gap:"6px",marginBottom:"14px",flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:"10px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#9a8870",fontFamily:"monospace",marginRight:"4px"}}>Campagne :</span>
                {campagnes.map(c=>(
                  <button key={c} onClick={()=>setFilterTraitAn(c)}
                    style={{padding:"4px 10px",borderRadius:"4px",border:`0.5px solid ${filterTraitAn===c?"#2d6a00":"#d4c4a0"}`,background:filterTraitAn===c?"#d4edc0":"transparent",color:filterTraitAn===c?"#2d6a00":"#9a8870",fontSize:"11px",cursor:"pointer",fontFamily:"monospace",display:"flex",alignItems:"center",gap:"4px"}}>
                    {c}
                    {isCampagneClosed(c)&&<span style={{fontSize:"9px",color:"#cc2222"}}>cloturee</span>}
                    <span style={{background:cuivreParCampagne[c]>3000?"#fdd0d0":cuivreParCampagne[c]>2000?"#fde8b8":"#d4edc0",color:cuivreParCampagne[c]>3000?"#cc2222":cuivreParCampagne[c]>2000?"#c47800":"#2d6a00",borderRadius:"3px",padding:"0 4px",fontSize:"10px",fontWeight:500}}>
                      {(cuivreParCampagne[c]/1000).toFixed(2)}kg Cu
                    </span>
                  </button>
                ))}
              </div>

              {/* KPIs */}
              {filterTraitAn && vigneTab==="traitements" && (()=>{
                const cu = cuivreParCampagne[filterTraitAn]||0;
                return (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"8px",marginBottom:"14px"}}>
                    {[
                      {lbl:"Traitements",val:traitsFiltres.length},
                      {lbl:"Total Cuivre",val:`${(cu/1000).toFixed(3)}kg`,col:cu>3000?"#cc2222":cu>2000?"#c47800":"#1a7a40"},
                      {lbl:"Avril",val:`${traitsFiltres.filter(t=>t.date?.slice(5,7)==="04").reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0)}g`,col:"#185FA5"},
                      {lbl:"Mai",val:`${traitsFiltres.filter(t=>t.date?.slice(5,7)==="05").reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0)}g`,col:"#185FA5"},
                      {lbl:"Juin",val:`${traitsFiltres.filter(t=>t.date?.slice(5,7)==="06").reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0)}g`,col:"#185FA5"},
                      {lbl:"Juillet",val:`${traitsFiltres.filter(t=>t.date?.slice(5,7)==="07").reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0)}g`,col:"#185FA5"},
                      {lbl:"Aout",val:`${traitsFiltres.filter(t=>t.date?.slice(5,7)==="08").reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0)}g`,col:"#185FA5"},
                    ].map((k,i)=>(
                      <div key={i} style={{...s.card,padding:"10px 12px"}}>
                        <div style={s.lbl}>{k.lbl}</div>
                        <div style={{fontSize:"16px",fontWeight:500,color:k.col||"#b8860b",lineHeight:1.2}}>{k.val}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Onglets */}
              <div style={{display:"flex",borderBottom:"0.5px solid #d4c4a0",marginBottom:"16px"}}>
                {[["traitements","Traitements"],["biodynamie","Biodynamie"],["amendements","Amendements"],["stockprod","Stock Produits"]].map(([tab,lbl])=>(
                  <button key={tab} style={s.tabBtn(vigneTab===tab)} onClick={()=>setVigneTab(tab)}>{lbl}</button>
                ))}
              </div>

              {/* === TRAITEMENTS === */}
              {vigneTab==="traitements" && (
                <div style={s.card}>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                      <thead>
                        <tr style={{borderBottom:"1px solid #d4c4a0",background:"#fff8ee"}}>
                          {["N°","Date","Surface","Produits","Cu/ha",""].map(h=>(
                            <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {traitsFiltres.map((t,i)=>{
                          const currentYear = new Date().getFullYear().toString();
                          const isHist = t.campagne !== currentYear;
                          const canEdit = !closed && !isHist;
                          return (
                            <tr key={t.id||i} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#fffbf3"}}>
                              <td style={{padding:"8px 10px",fontFamily:"monospace",color:"#b8860b",fontWeight:500}}>N°{t.numero}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838"}}>{fmt(t.date)}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838"}}>{t.surface}</td>
                              <td style={{padding:"8px 10px",maxWidth:"320px"}}>
                                <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
                                  {(t.produits||[]).map((p,j)=>(
                                    <span key={j} style={{background:p.matiereActive==="Cuivre"?"#fde8b8":p.matiereActive==="Soufre"?"#e6f0fb":"#ede5d4",color:p.matiereActive==="Cuivre"?"#7a5200":p.matiereActive==="Soufre"?"#185FA5":"#5f5e5a",borderRadius:"3px",padding:"1px 5px",fontSize:"10px",fontFamily:"monospace",whiteSpace:"nowrap"}}>
                                      {p.nom} {p.dose}
                                    </span>
                                  ))}
                                </div>
                                {t.observations&&<div style={{fontSize:"11px",color:"#9a8870",fontStyle:"italic",marginTop:"2px"}}>{t.observations}</div>}
                              </td>
                              <td style={{padding:"8px 10px",fontWeight:500,color:parseFloat(t.cuivreTotal)>400?"#cc2222":parseFloat(t.cuivreTotal)>200?"#c47800":"#1a7a40",fontFamily:"monospace",whiteSpace:"nowrap"}}>
                                {t.cuivreTotal?`${t.cuivreTotal}g`:"-"}
                              </td>
                              <td style={{padding:"8px 10px",whiteSpace:"nowrap"}}>
                                {canEdit ? (
                                  <div style={{display:"flex",gap:"3px"}}>
                                    <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>{setTraitForm({...TRAIT_EMPTY,...t});setEditingTrait(t);setShowTraitForm(true);}}>Mod.</button>
                                    <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                                      onClick={()=>{if(window.confirm("Supprimer ?")){ setTraitements(prev=>prev.filter(x=>x.id!==t.id)); fbDelete("traitements",t.id||""); if(t.produits?.length>0 && t.surface) deduireStock([], 0, t.produits, t.surface); }}}>Sup.</button>
                                  </div>
                                ) : <span style={{fontSize:"10px",color:"#9a8870",fontStyle:"italic"}}>{closed?"cloture":""}</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {traitsFiltres.length===0&&<tr><td colSpan={6} style={{padding:"20px",color:"#9a8870",textAlign:"center",fontStyle:"italic"}}>Aucun traitement pour cette campagne.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Documents PDF prestataires - uniquement onglet traitements */}
              {vigneTab==="traitements" && filterTraitAn && (
                <div style={{...s.card,marginTop:"14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#7a5200"}}>Calendriers prestataires</div>
                    {!closed && (
                      <label style={{...s.btnSm,cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}>
                        {uploadingPdf?"Chargement...":"+ Ajouter PDF"}
                        <input type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{
                          const file=e.target.files[0];
                          if(file){
                            const nom=window.prompt("Nom du document (ex: Calendrier Lorain 2026)", file.name.replace(".pdf",""));
                            if(nom!==null) uploadPdf(file, filterTraitAn, nom||file.name);
                          }
                          e.target.value="";
                        }}/>
                      </label>
                    )}
                  </div>
                  {pdfDocs.filter(p=>p.campagne===filterTraitAn).length===0&&(
                    <div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Aucun document pour cette campagne.</div>
                  )}
                  <div style={{display:"grid",gap:"8px"}}>
                    {pdfDocs.filter(p=>p.campagne===filterTraitAn).map(pdf=>(
                      <div key={pdf.id} style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 12px",background:"#fff8ee",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
                        <div style={{width:"32px",height:"32px",background:"#fdd0d0",borderRadius:"4px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:"10px",fontWeight:500,color:"#cc2222",fontFamily:"monospace"}}>PDF</span>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:500,color:"#1a1205",fontSize:"13px"}}>{pdf.nom}</div>
                          <div style={{fontSize:"10px",color:"#9a8870",marginTop:"1px"}}>{pdf.dateUpload?.slice(0,10)}</div>
                        </div>
                        <button style={s.btnSm} onClick={()=>openPdf(pdf)}>
                          Ouvrir
                        </button>
                        {!closed&&(
                          <div style={{display:"flex",gap:"4px"}}>
                            <button style={s.ghostSm} onClick={()=>{
                              const n=window.prompt("Nouveau nom :", pdf.nom);
                              if(n&&n.trim()){
                                const updated={...pdf,nom:n.trim()};
                                setPdfDocs(prev=>prev.map(p=>p.id===pdf.id?updated:p));
                                fbSave("pdfDocs",pdf.id,updated);
                              }
                            }}>Renommer</button>
                            <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>deletePdf(pdf)}>Sup.</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === STOCK PRODUITS === */}
              {vigneTab==="stockprod" && (
                <div>
                  {/* Actions */}
                  <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap",alignItems:"center"}}>
                    <button style={s.btnSm} onClick={()=>{setProduitForm(PRODUIT_EMPTY);setEditingStockProd(null);setShowStockProdForm(true);}}>+ Ajouter un produit</button>
                    <label style={{...s.btnSm,cursor:"pointer",background:"#fff8ee",color:"#7a5200",border:"0.5px solid #d4c4a0"}}>
                      {uploadingPdf?"Chargement...":"+ Ajouter une facture (PDF)"}
                      <input type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{
                        const file=e.target.files[0];
                        if(file){ const nom=window.prompt("Nom du document",file.name.replace(".pdf","")); if(nom!==null) uploadFacture(file,nom||file.name); }
                        e.target.value="";
                      }}/>
                    </label>
                    <div style={{marginLeft:"auto",fontSize:"11px",color:"#9a8870"}}>{stockProduits.length} produit(s)</div>
                  </div>
                  {stockProduits.length>0&&(
                    <div style={s.card}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                        <thead>
                          <tr style={{borderBottom:"1px solid #d4c4a0",background:"#fff8ee"}}>

                        {["Produit","N°AMM","Substance active","Teneur Cu g/kg|L","Stock actuel","Actions"].map(h=>(
                              <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stockProduits.map((p,i)=>{
                            const stock = parseFloat(p.stockActuel)||0;
                            const init  = parseFloat(p.stockInitial)||0;
                            const pct   = init>0 ? Math.round(stock/init*100) : 100;
                            return (
                              <tr key={p.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#fffbf3"}}>
                                <td style={{padding:"8px 10px"}}>
                                  <div style={{fontWeight:500,color:"#1a1205"}}>{p.nom}</div>
                                  {p.fournisseur&&<div style={{fontSize:"10px",color:"#9a8870"}}>{p.fournisseur}</div>}
                                </td>
                                <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:"11px",color:"#9a8870"}}>{p.nAmm||"-"}</td>
                                <td style={{padding:"8px 10px"}}>
                                  {(()=>{ const sa=p.substanceActive||p.matiereActive||"-";
                                    return <span style={{background:sa==="Cuivre"?"#fde8b8":sa==="Soufre"?"#e6f0fb":"#ede5d4",color:sa==="Cuivre"?"#7a5200":sa==="Soufre"?"#185FA5":"#5f5e5a",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",fontFamily:"monospace"}}>{sa}</span>;
                                  })()}
                                </td>
                                <td style={{padding:"8px 10px",fontFamily:"monospace",fontWeight:500}}>
                                  {parseFloat(p.teneurCuivre)>0
                                    ?<span style={{color:"#c47800"}}>{p.teneurCuivre}g/{p.unite} <span style={{fontSize:"10px",color:"#9a8870",fontWeight:400}}>({Math.round(parseFloat(p.teneurCuivre)/10)}%)</span></span>
                                    :<span style={{color:"#9a8870"}}>-</span>}
                                </td>
                                <td style={{padding:"8px 10px"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                                    <button style={{background:"#f0f0f0",border:"none",borderRadius:"3px",width:"20px",height:"20px",cursor:"pointer",fontWeight:700,color:"#555"}} onClick={()=>updateStockProduit(p.id,-1)}>-</button>
                                    <span style={{fontWeight:500,color:stock<0?"#cc2222":stock===0?"#c47800":pct<20?"#c47800":"#1a7a40",minWidth:"50px",textAlign:"center",fontFamily:"monospace"}}>
                                      {stock} {p.unite}
                                    </span>
                                    <button style={{background:"#f0f0f0",border:"none",borderRadius:"3px",width:"20px",height:"20px",cursor:"pointer",fontWeight:700,color:"#555"}} onClick={()=>updateStockProduit(p.id,1)}>+</button>
                                  </div>
                                  <div style={{height:"3px",background:"#e8dcc6",borderRadius:"2px",marginTop:"4px",width:"80px"}}>
                                    <div style={{height:"100%",borderRadius:"2px",background:pct<20?"#cc2222":pct<50?"#c47800":"#1a7a40",width:`${Math.min(100,pct)}%`}}/>
                                  </div>
                                </td>
                                <td style={{padding:"8px 10px"}}>
                                  <div style={{display:"flex",gap:"3px"}}>
                                    <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>{setProduitForm({...PRODUIT_EMPTY,...p});setEditingStockProd(p);setShowStockProdForm(true);}}>Mod.</button>
                                    <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                                      onClick={()=>{if(window.confirm("Supprimer ?")){ setStockProduits(prev=>prev.filter(x=>x.id!==p.id)); fbDelete("stockProduits",p.id); }}}>Sup.</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {pdfFactures.length>0&&(
                    <div style={{...s.card,marginBottom:"14px"}}>
                      <div style={{...s.lbl,marginBottom:"8px"}}>Factures / BL</div>
                      <div style={{display:"grid",gap:"6px"}}>
                        {pdfFactures.map(pdf=>(
                          <div key={pdf.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",background:"#fff8ee",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
                            <div style={{width:"28px",height:"28px",background:"#fdd0d0",borderRadius:"4px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              <span style={{fontSize:"9px",fontWeight:500,color:"#cc2222",fontFamily:"monospace"}}>PDF</span>
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:500,color:"#1a1205",fontSize:"12px"}}>{pdf.nom}</div>
                              <div style={{fontSize:"10px",color:"#9a8870"}}>{pdf.dateUpload?.slice(0,10)}</div>
                            </div>
                            <button style={s.btnSm} onClick={()=>openPdfFacture(pdf)}>Ouvrir</button>
                            <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>deleteFacture(pdf.id)}>Sup.</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Catalogue rapide */}
                  {stockProduits.length===0&&(
                    <div style={{...s.card,marginBottom:"14px"}}>
                      <div style={{...s.lbl,marginBottom:"10px"}}>Ajout rapide depuis le catalogue</div>
                      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                        {CATALOGUE_PRODUITS.filter(c=>!stockProduits.find(p=>p.nAmm===c.nAmm)).map((c,i)=>(
                          <button key={i} onClick={()=>addFromCatalogue(c)}
                            style={{background:"#fff8ee",border:"0.5px solid #d4c4a0",borderRadius:"5px",padding:"6px 12px",fontSize:"11px",cursor:"pointer",color:"#7a5200",fontFamily:"monospace",display:"flex",alignItems:"center",gap:"5px"}}>
                            <span style={{background:(c.substanceActive||c.matiereActive)==="Cuivre"?"#fde8b8":(c.substanceActive||c.matiereActive)==="Soufre"?"#e6f0fb":"#ede5d4",color:(c.substanceActive||c.matiereActive)==="Cuivre"?"#7a5200":"#185FA5",borderRadius:"3px",padding:"0 4px",fontSize:"9px"}}>{c.substanceActive||c.matiereActive}</span>
                            + {c.nom}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {vigneTab==="biodynamie" && (
                <div style={s.card}>
                  {biodyFiltres.length===0&&<div style={{color:"#9a8870",fontSize:"13px",padding:"12px 0",fontStyle:"italic"}}>Aucun passage biodynamique pour cette campagne.</div>}
                  {biodyFiltres.length>0&&(
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                      <thead>
                        <tr style={{borderBottom:"1px solid #d4c4a0",background:"#fff8ee"}}>
                          {["Date","Surface","Produit","Observations",""].map(h=>(
                            <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {biodyFiltres.sort((a,b)=>new Date(a.date)-new Date(b.date)).map((b,i)=>(
                          <tr key={b.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#fffbf3"}}>
                            <td style={{padding:"8px 10px",color:"#6a5838"}}>{fmt(b.date)}</td>
                            <td style={{padding:"8px 10px",color:"#6a5838"}}>{b.surface}</td>
                            <td style={{padding:"8px 10px"}}>
                              <span style={{background:"#d4edc0",color:"#2d6a00",borderRadius:"3px",padding:"1px 8px",fontSize:"11px",fontFamily:"monospace",fontWeight:500}}>{b.produit}</span>
                            </td>
                            <td style={{padding:"8px 10px",color:"#7a6840",fontStyle:"italic",fontSize:"11px"}}>{b.observations}</td>
                            <td style={{padding:"8px 10px"}}>
                              {!closed&&(
                                <div style={{display:"flex",gap:"3px"}}>
                                  <button style={{...s.ghostSm,fontSize:"10px"}}
                                    onClick={()=>{setBiodyForm({campagne:b.campagne,date:b.date,surface:b.surface,produit:b.produit,observations:b.observations});setEditingBiody(b);setShowBiodyForm(true);}}>Mod.</button>
                                  <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                                    onClick={()=>{if(window.confirm("Supprimer ?")){ setBiodynamies(prev=>prev.filter(x=>x.id!==b.id)); fbDelete("biodynamies",b.id); if(b.produit && b.surface && b.dose) deduireStock([], 0, [{nom:b.produit,dose:b.dose}], b.surface); }}}>Sup.</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* === AMENDEMENTS === */}
              {vigneTab==="amendements" && (
                <div style={s.card}>
                  {amendFiltres.length===0&&<div style={{color:"#9a8870",fontSize:"13px",padding:"12px 0",fontStyle:"italic"}}>Aucun amendement pour cette campagne.</div>}
                  {amendFiltres.length>0&&(
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                        <thead>
                          <tr style={{borderBottom:"1px solid #d4c4a0",background:"#fff8ee"}}>
                            {["Parcelle","Surface","Produit","Quantite","N total","N/ha","Observations",""].map(h=>(
                              <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {amendFiltres.sort((a,b)=>a.parcelle.localeCompare(b.parcelle)).map((a,i)=>(
                            <tr key={a.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#fffbf3"}}>
                              <td style={{padding:"8px 10px",fontWeight:500,color:"#1a1205"}}>{a.parcelle}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838",fontFamily:"monospace"}}>{a.surface} ha</td>
                              <td style={{padding:"8px 10px"}}>
                                <span style={{background:"#fde8b8",color:"#7a5200",borderRadius:"3px",padding:"1px 7px",fontSize:"11px",fontFamily:"monospace"}}>{a.produit}</span>
                              </td>
                              <td style={{padding:"8px 10px",color:"#6a5838",fontFamily:"monospace"}}>{a.quantite}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838",fontFamily:"monospace"}}>{a.nTotal}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838",fontFamily:"monospace"}}>{a.nParHa}</td>
                              <td style={{padding:"8px 10px",color:"#7a6840",fontStyle:"italic",fontSize:"11px"}}>{a.observations}</td>
                              <td style={{padding:"8px 10px"}}>
                                {!closed&&(
                                  <div style={{display:"flex",gap:"3px"}}>
                                    <button style={{...s.ghostSm,fontSize:"10px"}}
                                      onClick={()=>{setAmendForm({campagne:a.campagne,parcelle:a.parcelle,surface:a.surface,produit:a.produit,quantite:a.quantite,nTotal:a.nTotal,nParHa:a.nParHa,observations:a.observations});setEditingAmend(a);setShowAmendForm(true);}}>Mod.</button>
                                    <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                                      onClick={()=>{if(window.confirm("Supprimer ?")){ setAmendements(prev=>prev.filter(x=>x.id!==a.id)); fbDelete("amendements",a.id); if(a.produit && a.quantite){ const sp=findStockProd(a.produit); if(sp){ const q=parseFloat(a.quantite.replace(/[^0-9.]/g,""))||0; const updated={...sp,stockActuel:String(Math.round(((parseFloat(sp.stockActuel)||0)+q)*100)/100)}; setStockProduits(prev=>prev.map(x=>x.id===sp.id?updated:x)); fbSave("stockProduits",sp.id,updated); } } }}}>Sup.</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* -- TONNEAUX -- */}
        {view==="tonneaux" && (
          <div>
            {/* Onglets principaux */}
            <div style={{display:"flex",gap:"0",marginBottom:"20px",borderBottom:"1px solid #d4c4a0"}}>
              {[["futscuves","Futs et Cuves"],["cuverie","Cuverie"]].map(([key,lbl])=>(
                <button key={key} onClick={()=>setTonneauxTab(key)} style={{padding:"10px 20px",border:"none",borderBottom:tonneauxTab===key?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:tonneauxTab===key?"#7a5200":"#9a8870",fontWeight:tonneauxTab===key?500:400,fontSize:"13px",cursor:"pointer",fontFamily:"Georgia,serif"}}>
                  {lbl}
                </button>
              ))}
            </div>

            {tonneauxTab==="cuverie"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                  <div style={{fontSize:"13px",color:"#7a6840"}}>{cuvesCuverie.length} cuve(s) de cuverie</div>
                  <button style={s.btn} onClick={()=>{setCuverieForm(CUVERIE_EMPTY);setEditingCuverie(null);setShowCuverieForm(true);}}>+ Nouvelle cuve</button>
                </div>
                {cuvesCuverie.length===0&&(
                  <div style={{...s.card,textAlign:"center",padding:"40px",color:"#9a8870"}}>
                    <div style={{fontSize:"24px",marginBottom:"12px"}}>Aucune cuve de cuverie</div>
                    <div style={{fontSize:"13px",marginBottom:"16px"}}>Ajoutez vos cuves de debourbage et d assemblage.</div>
                  </div>
                )}
                {cuvesCuverie.length>0&&(
                  <div style={{display:"grid",gap:"12px"}}>
                    {cuvesCuverie.map(c=>(
                      <div key={c.id} style={{...s.card,borderLeft:`3px solid ${c.type==="debourbage"?"#185FA5":c.type==="bourbes"?"#8B0000":"#1a7a40"}`}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:"16px",alignItems:"center"}}>
                          <div>
                            <div style={{fontWeight:500,color:"#1a1205",fontSize:"14px"}}>{c.nom}</div>
                            <div style={{fontSize:"11px",color:"#9a8870",marginTop:"2px"}}>
                              <span style={{background:c.type==="debourbage"?"#e8f0fb":c.type==="bourbes"?"#fdd0d0":"#d4f0dd",color:c.type==="debourbage"?"#185FA5":c.type==="bourbes"?"#8B0000":"#1a7a40",borderRadius:"3px",padding:"1px 6px",fontSize:"10px"}}>{c.type==="debourbage"?"Debourbage":c.type==="bourbes"?"Bourbes":"Assemblage"}</span>
                            </div>
                          </div>
                          <div>
                            <div style={s.lbl}>Volume total</div>
                            <div style={{fontWeight:500,color:"#1a1205"}}>{c.volumeHL} HL</div>
                          </div>
                          <div>
                            <div style={s.lbl}>Contenu actuel</div>
                            <div style={{fontWeight:500,color:parseFloat(c.contenuActuelHL)>0?"#b8860b":"#9a8870"}}>{c.contenuActuelHL||"0"} HL</div>
                            {c.notes&&<div style={{fontSize:"11px",color:"#9a8870",fontStyle:"italic",marginTop:"2px"}}>{c.notes}</div>}
                          </div>
                          <div style={{display:"flex",gap:"6px"}}>
                            <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>{setCuverieForm({nom:c.nom,type:c.type,volumeHL:c.volumeHL,contenuActuelHL:c.contenuActuelHL||"0",notes:c.notes||""});setEditingCuverie(c);setShowCuverieForm(true);}}>Mod.</button>
                            <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>{if(window.confirm("Supprimer cette cuve ?")){setCuvesCuverie(prev=>prev.filter(x=>x.id!==c.id));fbDelete("cuvesCuverie",c.id);}}}>Sup.</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tonneauxTab==="futscuves"&&<div>
            {/* Onglets appellation */}
            <div style={{display:"flex",gap:"6px",marginBottom:"16px",flexWrap:"wrap",overflowX:"auto"}}>
              <button onClick={()=>setFilterAppellation("")}
                style={{padding:"5px 14px",borderRadius:"4px",border:`1px solid ${!filterAppellation?"#b8860b":"#2a2a2c"}`,background:!filterAppellation?"#fce8a8":"transparent",color:!filterAppellation?"#7a5200":"#7a6840",fontSize:"12px",cursor:"pointer",fontFamily:"inherit"}}>
                Tous ({tonneaux.length})
              </button>
              {allAppellations.map(key=>{
                const apc=getApc(key);
                const count=tonneaux.filter(t=>t.appellation===key).length;
                if(count===0) return null;
                const active=filterAppellation===key;
                return (
                  <button key={key} onClick={()=>setFilterAppellation(active?"":key)}
                    style={{padding:"5px 14px",borderRadius:"4px",border:`1px solid ${active?apc.color:apc.border}`,background:active?apc.bg:"transparent",color:active?apc.color:"#7a6840",fontSize:"12px",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"5px"}}>
                    <span style={{width:"7px",height:"7px",borderRadius:"50%",background:apc.color,display:"inline-block"}}/>
                    {apc.label} ({count})
                  </button>
                );
              })}
            </div>
            <div style={{display:"flex",gap:"10px",marginBottom:"14px",alignItems:"center"}}>
              <input style={{...s.inp,maxWidth:"220px"}} placeholder="Recherche fût ou cuvée..." value={searchFut} onChange={e=>setSearchFut(e.target.value)}/>
              <select style={{...s.sel,maxWidth:"200px"}} value={filterDenom} onChange={e=>setFilterDenom(e.target.value)}>
                <option value="">Toutes les cuvées</option>
                {[...new Set(filteredTonneaux.map(t=>t.denomination))].sort().map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <div style={{display:"flex",gap:"4px"}}>
                {[["","Tous"],["actif","Actifs"],["vide","Vides"]].map(([val,lbl])=>(
                  <button key={val} onClick={()=>setFilterStatut(val)} style={{padding:"3px 10px",borderRadius:"4px",border:`0.5px solid ${filterStatut===val?"#b8860b":"#d4c4a0"}`,background:filterStatut===val?"#f5e8cc":"transparent",color:filterStatut===val?"#7a5200":"#9a8870",fontSize:"11px",cursor:"pointer"}}>{lbl}</button>
                ))}
              </div>
              <span style={{color:"#8a7248",fontSize:"11px",marginLeft:"auto"}}>{filteredTonneaux.length} fûts</span>
              <button style={{...s.ghostSm,fontSize:"10px",color:"#8B0000",borderColor:"#c85050"}} onClick={exportTonneauxPDF}>↓ PDF</button>
              <button style={{...s.ghostSm,fontSize:"10px",color:"#2d6a00",borderColor:"#7ab848"}} onClick={exportTonneauxCSV}>↓ CSV</button>
              <button style={s.btnSm} onClick={()=>{setFutForm(EMPTY_FUT);setEditingFut(null);setShowFutForm(true);}}>
                <i className="ti ti-plus" style={{marginRight:"3px"}}/>Ajouter
              </button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"8px"}}>
              {filteredTonneaux.map(t=><FutCard key={t.id} t={t}/>)}
            </div>
            </div>}
          </div>
        )}


        {/* -- VENDANGES -- */}
        {view==="vendanges" && (
          <div style={{display:"grid",gridTemplateColumns:"clamp(200px,1fr,1fr) clamp(200px,260px,30vw)",gap:"16px",alignItems:"start"}}>

            {/* Colonne principale */}
            <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <div style={{fontSize:"13px",color:"#7a6840"}}>{vendanges.length} entree(s) de vendange</div>
                <button style={s.btn} onClick={()=>{setVendangeForm(VENDANGE_EMPTY);setEditingVendange(null);setShowVendangeForm(true);}}>
                  + Nouvelle entree
                </button>
              </div>

              {/* Filtre par campagne */}
              {[...new Set(vendanges.map(v=>v.annee))].length>1&&(
                <div style={{display:"flex",gap:"6px",marginBottom:"16px",flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:"10px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#9a8870",fontFamily:"monospace",marginRight:"4px"}}>Campagne :</span>
                  <button onClick={()=>setFilterVendangeAn("")}
                    style={{padding:"4px 12px",borderRadius:"4px",border:`0.5px solid ${!filterVendangeAn?"#b8860b":"#d4c4a0"}`,background:!filterVendangeAn?"#f5e8cc":"transparent",color:!filterVendangeAn?"#7a5200":"#9a8870",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>
                    Toutes
                  </button>
                  {[...new Set(vendanges.map(v=>v.annee))].sort().reverse().map(an=>(
                    <button key={an} onClick={()=>setFilterVendangeAn(an)}
                      style={{padding:"4px 12px",borderRadius:"4px",border:`0.5px solid ${filterVendangeAn===an?"#2d6a00":"#d4c4a0"}`,background:filterVendangeAn===an?"#d4edc0":"transparent",color:filterVendangeAn===an?"#2d6a00":"#9a8870",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>
                      {an} ({vendanges.filter(v=>v.annee===an).length})
                    </button>
                  ))}
                </div>
              )}

              {vendanges.length===0&&(
                <div style={{...s.card,textAlign:"center",padding:"40px",color:"#9a8870"}}>
                  <div style={{fontSize:"13px",marginBottom:"16px"}}>Aucune vendange enregistree. Commencez par creer vos parcelles puis saisissez les apports.</div>
                  <button style={s.btn} onClick={()=>{setVendangeForm(VENDANGE_EMPTY);setEditingVendange(null);setShowVendangeForm(true);}}>+ Premiere entree</button>
                </div>
              )}

              {/* Grouper par annee */}
              {[...new Set(vendanges.map(v=>v.annee))].sort().reverse().filter(an=>!filterVendangeAn||an===filterVendangeAn).map(annee=>{
                const vAnnee = vendanges.filter(v=>v.annee===annee);
                const volTotal = vAnnee.reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                return (
                  <div key={annee} style={{marginBottom:"20px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"16px",fontWeight:500,color:"#7a5200"}}>Campagne {annee}</div>
                      <div style={{flex:1,height:"0.5px",background:"#d4c4a0"}}/>
                      {isCampagneClosed(annee)?(
                        <span style={{fontSize:"10px",background:"#fde8e8",color:"#cc2222",border:"0.5px solid #f0b4b4",borderRadius:"4px",padding:"2px 8px",fontWeight:500}}>Clôturée</span>
                      ):(
                        <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>cloturerCampagne(annee)}>Clôturer</button>
                      )}
                      {isCampagneClosed(annee)&&<button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>rouvrirCampagne(annee)}>Rouvrir</button>}
                      <button style={{...s.ghostSm,fontSize:"10px",color:"#2d6a00",borderColor:"#7ab848"}} onClick={()=>exportVendangeCSV(annee,vAnnee)}>↓ CSV</button>
                      <button style={{...s.ghostSm,fontSize:"10px",color:"#8B0000",borderColor:"#c85050"}} onClick={()=>exportVendangePDF(annee,vAnnee)}>↓ PDF</button>
                      <div style={{display:"flex",gap:"12px",fontSize:"11px",color:"#9a8870",fontFamily:"monospace"}}>
                        <span>{vAnnee.length} apport(s)</span>
                        <span style={{color:"#2d6a00",fontWeight:500}}>{volTotal.toLocaleString()} kg</span>
                        {vAnnee.filter(v=>v.numeroMarc).length>0&&(
                          <span>{[...new Set(vAnnee.map(v=>v.numeroMarc).filter(Boolean))].sort().length} Marc(s)</span>
                        )}
                      </div>
                    </div>
                    {/* Recap rendement campagne */}
                    {(()=>{
                      const kgRecoltes = vAnnee.reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                      const kgMaison = vAnnee.filter(v=>!v.destinationMarc||v.destinationMarc==="maison").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                        + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0)-(parseFloat(v.kgVendusNegoce)||0),0);
                      const kgNegoce = vAnnee.filter(v=>v.destinationMarc==="negoce_total").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                        + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.kgVendusNegoce)||0),0);
                      const rendAnnee = rendementsAnnuels.find(r=>r.annee===annee);
                      const surfTotale = parcelles.reduce((s,p)=>s+(parseFloat(p.surface)||0),0);
                      const kgHaReel = surfTotale>0 ? Math.round(kgRecoltes/surfTotale) : 0;
                      const kgHaAutorise = rendAnnee ? parseFloat(rendAnnee.rendementAutorise)||0 : 0;
                      const enRI = kgHaAutorise>0 && kgHaReel>kgHaAutorise;
                      return (
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"8px",marginBottom:"12px"}}>
                          <div style={{...s.card,padding:"10px"}}>
                            <div style={s.lbl}>Total recolte</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:"#1a1205"}}>{kgRecoltes.toLocaleString()} kg</div>
                          </div>
                          <div style={{...s.card,padding:"10px"}}>
                            <div style={s.lbl}>Conserve maison</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:"#2d6a00"}}>{Math.round(kgMaison).toLocaleString()} kg</div>
                          </div>
                          <div style={{...s.card,padding:"10px"}}>
                            <div style={s.lbl}>Vendu negoce</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:"#c47800"}}>{Math.round(kgNegoce).toLocaleString()} kg</div>
                          </div>
                          {surfTotale>0&&<div style={{...s.card,padding:"10px",background:enRI?"#fde8e8":"transparent"}}>
                            <div style={s.lbl}>kg/ha {kgHaAutorise>0?"vs "+kgHaAutorise+" autorise":""}</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:enRI?"#cc2222":"#1a1205"}}>{kgHaReel.toLocaleString()} kg/ha</div>
                            {enRI&&<div style={{fontSize:"10px",color:"#cc2222",fontWeight:500}}>Section RI +{(kgHaReel-kgHaAutorise).toLocaleString()} kg/ha</div>}
                          </div>}
                        </div>
                      );
                    })()}

                    {vAnnee.map(v=>{
                      const parc = parcelles.find(p=>p.id===v.parcelleId);
                      const parcs = (v.parcelleIds&&v.parcelleIds.length>0) ? v.parcelleIds.map(id=>parcelles.find(p=>p.id===id)).filter(Boolean) : (parc?[parc]:[]);
                      return (
                        <div key={v.id} style={{...s.card,marginBottom:"10px",borderLeft:`3px solid ${v.destinationMarc&&v.destinationMarc!=="maison"?"#c47800":"#2d6a00"}`}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"12px",marginBottom:"8px"}}>
                            <div>
                              {v.cuveeCreee&&<div style={{fontWeight:600,color:"#7a5200",fontSize:"14px",marginBottom:"2px"}}>{v.cuveeCreee}</div>}
                              {v.isBio&&<div style={{marginBottom:"4px"}}><span style={{fontSize:"11px",background:"#2d6a00",color:"#fff",borderRadius:"4px",padding:"2px 8px",fontWeight:600}}>🌿 BIO</span></div>}
                              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"2px"}}>
                                <div style={{fontWeight:500,color:"#1a1205",fontSize:"13px"}}>{parcs.length>0?parcs.map(p=>p.nom).join(" + "):"Parcelle inconnue"}</div>
                                {v.numeroMarc&&(
                                  <span style={{background:"#f5e8cc",color:"#7a5200",border:"0.5px solid #e0c050",borderRadius:"4px",padding:"1px 8px",fontSize:"11px",fontWeight:500,fontFamily:"monospace"}}>Marc {v.numeroMarc}</span>
                                )}
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"2px"}}>
                                {parc?.certification&&(
                                  <span style={{fontSize:"10px",padding:"1px 5px",borderRadius:"3px",fontFamily:"monospace",fontWeight:500,
                                    background:parc.certification==="BIO"?"#d4edc0":parc.certification==="NON BIO"?"#ede5d4":"#fde8b8",
                                    color:parc.certification==="BIO"?"#2d6a00":parc.certification==="NON BIO"?"#5f5e5a":"#8b5e0a"}}>
                                    {parc.certification}
                                  </span>
                                )}
                                <span style={{fontSize:"11px",color:"#9a8870"}}>{parc?.cepage||""}{parc?.commune?` - ${parc.commune}`:""}</span>
                              </div>
                              <div style={{fontSize:"11px",color:"#7a6840",marginTop:"3px"}}>{fmt(v.date)}{v.heure?" - "+v.heure:""} - {v.operateur}</div>
                            </div>
                            <div>
                              <div style={s.lbl}>Volume recolte</div>
                              {v.poidsMarcKg&&<div style={{fontSize:"18px",fontWeight:500,color:"#2d6a00"}}>{parseInt(v.poidsMarcKg).toLocaleString()} kg</div>}
                              {v.volumeHL&&<div style={{fontSize:"13px",color:"#2d6a00"}}>{v.volumeHL} HL</div>}
                              {v.destinationMarc&&v.destinationMarc!=="maison"&&<div style={{fontSize:"11px",color:"#c47800",marginTop:"3px"}}>Negoce{v.kgVendusNegoce?" - "+parseInt(v.kgVendusNegoce).toLocaleString()+" kg":""}{v.numeroDAE?" - DAE: "+v.numeroDAE:""}</div>}
                            </div>
                            <div>
                              <div style={s.lbl}>Cuves destination</div>
                              {v.cuveTailleId&&<div style={{fontSize:"12px",color:"#6a5838"}}>Taille : <strong>{cuvesCuverie.find(c=>c.id===v.cuveTailleId)?.nom||v.cuveTailleId}</strong>{v.volumeTaille&&<span style={{color:"#9a8870"}}> - {v.volumeTaille} HL</span>}</div>}
                              {v.cuveCuveeId&&<div style={{fontSize:"12px",color:"#6a5838"}}>Cuvee A : <strong>{cuvesCuverie.find(c=>c.id===v.cuveCuveeId)?.nom||v.cuveCuveeId}</strong>{v.volumeCuvee&&<span style={{color:"#9a8870"}}> - {v.volumeCuvee} HL</span>}</div>}
                              {v.cuveCuveeBId&&<div style={{fontSize:"12px",color:"#6a5838"}}>Cuvee B : <strong>{cuvesCuverie.find(c=>c.id===v.cuveCuveeBId)?.nom||v.cuveCuveeBId}</strong>{v.volumeCuveeB&&<span style={{color:"#9a8870"}}> - {v.volumeCuveeB} HL</span>}</div>}
                              {v.cuveBourbesId&&<div style={{fontSize:"12px",color:"#8B0000"}}>Bourbes : <strong>{cuvesCuverie.find(c=>c.id===v.cuveBourbesId)?.nom||v.cuveBourbesId}</strong>{v.volumeBourbes&&<span style={{color:"#9a8870"}}> - {v.volumeBourbes} HL</span>}</div>}
                              {!v.cuveTailleId&&!v.cuveCuveeId&&<div style={{fontSize:"11px",color:"#9a8870",fontStyle:"italic"}}>Non renseigne</div>}
                            </div>
                            <div>
                              <div style={s.lbl}>Analyses</div>
                              {v.degreePotentiel&&<div style={{fontSize:"12px",color:"#6a5838"}}>Degre : <strong>{v.degreePotentiel}%</strong></div>}
                              {v.acidite&&<div style={{fontSize:"12px",color:"#6a5838"}}>Acidite : <strong>{v.acidite} g/L</strong></div>}
                              {v.so2&&<div style={{fontSize:"12px",color:"#6a5838"}}>SO2 : <strong>{v.so2} mg/L</strong></div>}
                              {v.ph&&<div style={{fontSize:"12px",color:"#6a5838"}}>pH : <strong>{v.ph}</strong></div>}
                            </div>
                            <div style={{display:"none"}}>
                              <div style={s.lbl}>Cuve reception</div>
                              {(v.cuveReception||v.nouvelleCuveNom)?(
                                <div style={{display:"inline-flex",alignItems:"center",background:"#eeedfe",color:"#533AB7",border:"0.5px solid #534ab744",borderRadius:"4px",padding:"2px 10px",fontFamily:"monospace",fontSize:"12px",fontWeight:500}}>
                                  {v.cuveReception||v.nouvelleCuveNom}
                                </div>
                              ):<div style={{fontSize:"11px",color:"#9a8870",fontStyle:"italic"}}>Non definie</div>}
                            </div>
                          </div>
                          {v.produitsAjoutes?.length>0&&(
                            <div style={{borderTop:"0.5px solid #ede5d4",paddingTop:"8px",marginTop:"4px"}}>
                              <div style={{...s.lbl,marginBottom:"5px"}}>Produits ajoutes</div>
                              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                                {v.produitsAjoutes.map(p=>(
                                  <div key={p.id} style={{background:"#fff8ee",border:"0.5px solid #d4c4a0",borderRadius:"4px",padding:"3px 10px",fontSize:"11px",color:"#7a5200"}}>
                                    <strong>{p.nom}</strong>{p.dose?` - ${p.dose}`:""}{p.lot?` (Lot: ${p.lot})`:""}{p.date?` - ${fmt(p.date)}`:""}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {v.observations&&<div style={{borderTop:"0.5px solid #ede5d4",paddingTop:"6px",marginTop:"6px",fontSize:"12px",color:"#6a5838",fontStyle:"italic"}}>{v.observations}</div>}
                          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"8px"}}>
                            <button style={{...s.ghostSm}} onClick={()=>openEditVendange(v)}>Modifier</button>
                            <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4"}}
                              onClick={()=>{if(window.confirm("Supprimer cet apport ?")) { setVendanges(prev=>prev.filter(x=>x.id!==v.id)); deleteVendangeFb(v.id); }}}>
                              Supprimer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Colonne droite */}
            <div style={{display:"grid",gap:"16px"}}>

            {/* Tableau de bord rendement */}
            <div style={s.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                <span style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#7a5200"}}>Rendement</span>
                <button style={s.btnSm} onClick={()=>setShowRendementForm(true)}>+ Saisir</button>
              </div>
              {[...new Set(vendanges.map(v=>v.annee))].sort().reverse().map(annee=>{
                const vAnnee = vendanges.filter(v=>v.annee===annee);
                const kgRecoltes = vAnnee.reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                const kgMaison = vAnnee.filter(v=>!v.destinationMarc||v.destinationMarc==="maison").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                  + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0)-(parseFloat(v.kgVendusNegoce)||0),0);
                const kgNegoce = vAnnee.filter(v=>v.destinationMarc==="negoce_total").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                  + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.kgVendusNegoce)||0),0);
                const rendAnnee = rendementsAnnuels.find(r=>r.annee===annee);
                const surfTotale = parcelles.reduce((s,p)=>s+(parseFloat(p.surface)||0),0);
                const kgHaReel = surfTotale>0 ? Math.round(kgRecoltes/surfTotale) : 0;
                const kgHaAutorise = rendAnnee ? parseFloat(rendAnnee.rendementAutorise)||0 : 0;
                const enRI = kgHaAutorise>0 && kgHaReel>kgHaAutorise;
                return (
                  <div key={annee} style={{borderBottom:"0.5px solid #ede5d4",paddingBottom:"10px",marginBottom:"10px"}}>
                    <div style={{fontWeight:500,color:"#7a5200",fontSize:"13px",marginBottom:"6px"}}>Campagne {annee}</div>
                    <div style={{display:"grid",gap:"4px",fontSize:"12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#9a8870"}}>Total recolte</span>
                        <span style={{fontWeight:500,color:"#1a1205"}}>{kgRecoltes.toLocaleString()} kg</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#9a8870"}}>Conserve maison</span>
                        <span style={{fontWeight:500,color:"#2d6a00"}}>{Math.round(kgMaison).toLocaleString()} kg</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#9a8870"}}>Vendu negoce</span>
                        <span style={{fontWeight:500,color:"#c47800"}}>{Math.round(kgNegoce).toLocaleString()} kg</span>
                      </div>
                      {surfTotale>0&&<div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#9a8870"}}>kg/ha reel</span>
                        <span style={{fontWeight:500,color:enRI?"#cc2222":"#1a1205"}}>{kgHaReel.toLocaleString()} kg/ha</span>
                      </div>}
                      {kgHaAutorise>0&&<div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#9a8870"}}>Rendement autorise</span>
                        <span style={{fontWeight:500,color:"#6a5838"}}>{kgHaAutorise.toLocaleString()} kg/ha</span>
                      </div>}
                      {enRI&&<div style={{marginTop:"6px",padding:"6px 10px",background:"#fde8e8",borderRadius:"4px",border:"1px solid #f0b4b4"}}>
                        <div style={{fontSize:"11px",fontWeight:500,color:"#cc2222"}}>Depassement - Section RI</div>
                        <div style={{fontSize:"11px",color:"#cc2222"}}>+{(kgHaReel-kgHaAutorise).toLocaleString()} kg/ha au-dela du rendement</div>
                      </div>}
                    </div>
                  </div>
                );
              })}
              {rendementsAnnuels.length===0&&vendanges.length===0&&<div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Aucune donnee.</div>}
            </div>

            {/* Colonne droite - Parcelles */}
            <div style={s.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showParcellesList?"12px":"0"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"}} onClick={()=>setShowParcellesList(p=>!p)}>
                  <span style={{...s.lbl,marginBottom:0}}>Parcelles ({parcelles.length})</span>
                  <span style={{fontSize:"10px",color:"#9a8870"}}>{showParcellesList?"▲":"▼"}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  {(()=>{
                    const totalHa = parcelles.reduce((s,p)=>s+(parseFloat(p.surface)||0),0);
                    const ha = Math.floor(totalHa);
                    const ares = Math.floor((totalHa-ha)*100);
                    const ca = Math.round(((totalHa-ha)*100-ares)*100);
                    return <span style={{fontSize:"11px",color:"#7a5200",fontWeight:500}}>{ha}ha {String(ares).padStart(2,"0")}a {String(ca).padStart(2,"0")}ca</span>;
                  })()}
                  <button style={s.btnSm} onClick={()=>{setParcelleForm({nom:"",cepage:"",surface:"",commune:""});setEditingParcelle(null);setShowParcelleForm(true);}}>+ Ajouter</button>
                </div>
              </div>
              {showParcellesList&&parcelles.length===0&&<div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Aucune parcelle. Ajoutez-en une pour commencer.</div>}
              {showParcellesList&&parcelles.map(p=>(
                <div key={p.id} style={{borderBottom:"0.5px solid #ede5d4",padding:"8px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"2px"}}>
                        <div style={{fontSize:"13px",fontWeight:500,color:"#1a1205"}}>{p.nom}</div>
                        {p.certification&&(
                          <span style={{fontSize:"10px",padding:"1px 6px",borderRadius:"3px",fontFamily:"monospace",fontWeight:500,
                            background:p.certification==="BIO"?"#d4edc0":p.certification==="NON BIO"?"#ede5d4":p.certification==="C1"?"#fde8b8":p.certification==="C2"?"#fce8a8":"#fad4a0",
                            color:p.certification==="BIO"?"#2d6a00":p.certification==="NON BIO"?"#5f5e5a":p.certification==="C1"?"#8b5e0a":p.certification==="C2"?"#7a4800":"#6b3a00"}}>
                            {p.certification}
                          </span>
                        )}
                      </div>
                      {p.cepage&&<div style={{fontSize:"11px",color:"#9a8870"}}>{p.cepage}</div>}
                      <div style={{fontSize:"11px",color:"#9a8870"}}>{p.commune||""}{p.surface?` - ${p.surface} ha`:""}</div>
                      {p.observations&&<div style={{fontSize:"10px",color:"#7a6840",fontStyle:"italic",marginTop:"2px"}}>{p.observations}</div>}
                      <div style={{fontSize:"10px",color:"#a8987e",marginTop:"2px"}}>{vendanges.filter(v=>v.parcelleId===p.id).length} apport(s)</div>
                    </div>
                    <div style={{display:"flex",gap:"4px"}}>
                      <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>{setParcelleForm({nom:p.nom,cepage:p.cepage||"",certification:p.certification||"BIO",surface:p.surface||"",commune:p.commune||"",observations:p.observations||""});setEditingParcelle(p);setShowParcelleForm(true);}}>Mod.</button>
                      <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                        onClick={()=>{if(window.confirm("Supprimer cette parcelle ?")) { setParcelles(prev=>prev.filter(x=>x.id!==p.id)); deleteParcelleFb(p.id); }}}>Sup.</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {/* -- STOCK -- */}
        {view==="stock" && (()=>{
          const now = new Date();
          const lots = [...stockBouteilles].sort((a,b)=>new Date(a.dateTirage)-new Date(b.dateTirage)).map(l=>({...l,
            mois: l.dateTirage ? Math.floor((now-new Date(l.dateTirage))/(1000*60*60*24*30.5)) : 0
          }));
          const lotsFiltre = lots.filter(l=>{
            if(stockTab==="champagne" && ["coteaux_blanc","coteaux_rouge","ratafia"].includes(l.typeProduit)) return false;
            if(stockTab!=="champagne" && (l.typeProduit||"champagne")!==stockTab) return false;
            if(filterStockCuvee && !l.cuvee.toLowerCase().includes(filterStockCuvee.toLowerCase())) return false;
            if(filterStockLieu && l.lieu!==filterStockLieu) return false;
            if(filterStockStatut && l.statut!==filterStockStatut) return false;
            if(filterStock15==="moins15" && l.mois>=15) return false;
            if(filterStock15==="plus15" && l.mois<15) return false;
            return true;
          });
          // Fusion pour Habille CRD et Habille Export uniquement
          const fusionMap = {};
          lotsFiltre.forEach(l=>{
            const shouldFuse = l.statut==="Habille CRD" || l.statut==="Habille Export";
            const k = shouldFuse ? l.cuvee+"|"+l.lot+"|"+l.statut : l.id;
            if(!fusionMap[k]) fusionMap[k] = {...l, _ids:[l.id], qteActuelle:parseInt(l.qteActuelle)||0};
            else { fusionMap[k].qteActuelle += parseInt(l.qteActuelle)||0; fusionMap[k]._ids.push(l.id); }
          });
          const lotsFusionnes = Object.values(fusionMap);

          const total = lots.reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
          const moins15 = lots.filter(l=>l.mois<15).reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
          const plus15 = lots.filter(l=>l.mois>=15).reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
          const alertes = lots.filter(l=>l.mois>=14&&!l.passage15).length;
          return (
            <div>
              {/* 1. KPIs */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"12px",marginBottom:"20px"}}>
                {[
                  {lbl:"Total en stock",val:total+" btl",sub:"tous formats",col:"#b8860b"},
                  {lbl:"< 15 mois",val:moins15+" btl",sub:"non commercialisables",col:"#cc2222"},
                  {lbl:"> 15 mois",val:plus15+" btl",sub:"commercialisables",col:"#1a7a40"},
                  {lbl:"Alertes 15 mois",val:alertes+" lot(s)",sub:"passent le cap ce mois",col:"#c47800"},
                ].map((k,i)=>(
                  <div key={i} style={s.card}>
                    <div style={s.lbl}>{k.lbl}</div>
                    <div style={{fontSize:"24px",fontWeight:500,color:k.col}}>{k.val}</div>
                    <div style={{fontSize:"11px",color:"#9a8870",marginTop:"3px"}}>{k.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{display:"flex",gap:"8px",marginBottom:"12px",justifyContent:"flex-end"}}>
                <button style={{...s.ghostSm,fontSize:"10px",color:"#2d6a00",borderColor:"#7ab848"}} onClick={exportStockCSV}>↓ CSV</button>
                <button style={{...s.ghostSm,fontSize:"10px",color:"#8B0000",borderColor:"#c85050"}} onClick={exportStockPDF}>↓ PDF</button>
              </div>
              {/* Onglets type produit */}
              <div style={{display:"flex",gap:"4px",marginBottom:"16px",borderBottom:"1px solid #d4c4a0",paddingBottom:"0"}}>
                {[["champagne","Champagne"],["coteaux_blanc","Coteaux Blanc"],["coteaux_rouge","Coteaux Rouge"],["ratafia","Ratafia"]].map(([key,lbl])=>(
                  <button key={key} onClick={()=>{setStockTab(key);setFilterStockStatut("");}} style={{padding:"8px 14px",border:"none",borderBottom:stockTab===key?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:stockTab===key?"#7a5200":"#9a8870",fontWeight:stockTab===key?500:400,fontSize:"12px",cursor:"pointer",fontFamily:"Georgia,serif"}}>{lbl}</button>
                ))}
              </div>

              {/* Alertes */}
              {(()=>{
                const calcStock = (type) => coiffesStock.filter(c=>c.type===type).reduce((s,c)=>s+(c.operation==="achat"?parseInt(c.qte)||0:-(parseInt(c.qte)||0)),0);
                const alerteCoiffeCRD = calcStock("CRD") < 500;
                const alerteCoiffeMag = calcStock("CRD Magnum") < 20 || calcStock("Export Magnum") < 20;
                const alerteCoiffeExp = calcStock("Export") < 500;
                const alerte15 = lots.filter(l=>l.mois>=14&&!l.passage15);
                const hasAlertes = alerteCoiffeCRD || alerteCoiffeExp || alerteCoiffeMag || alerte15.length>0;
                if(!hasAlertes) return null;
                return (
                  <div style={{marginBottom:"16px",display:"grid",gap:"8px"}}>
                    {alerte15.length>0&&(
                      <div style={{padding:"12px 16px",background:"#fff3cd",border:"1px solid #e8c888",borderRadius:"8px",display:"flex",alignItems:"center",gap:"10px"}}>
                        <span style={{fontSize:"18px"}}>!</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:500,color:"#c47800",fontSize:"13px"}}>Lots approchant les 15 mois</div>
                          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginTop:"4px"}}>
                            {alerte15.map(l=>(
                              <span key={l.id} style={{background:"#fff",color:"#c47800",border:"1px solid #e8c888",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>{l.cuvee} {l.millesime} - {l.format} - {l.mois}m</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {(alerteCoiffeCRD||alerteCoiffeExp||alerteCoiffeMag)&&(
                      <div style={{padding:"12px 16px",background:"#fde8e8",border:"1px solid #f0b4b4",borderRadius:"8px",display:"flex",alignItems:"center",gap:"10px"}}>
                        <span style={{fontSize:"18px"}}>!</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:500,color:"#cc2222",fontSize:"13px"}}>Stock coiffes bas</div>
                          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginTop:"4px"}}>
                            {alerteCoiffeCRD&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>CRD 75cl : {calcStock("CRD")} coiffes (seuil 500)</span>}
                            {alerteCoiffeExp&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>Export 75cl : {calcStock("Export")} coiffes (seuil 500)</span>}
                            {calcStock("CRD Magnum")<20&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>CRD Magnum : {calcStock("CRD Magnum")} coiffes (seuil 20)</span>}
                            {calcStock("Export Magnum")<20&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>Export Magnum : {calcStock("Export Magnum")} coiffes (seuil 20)</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 2. Filtres */}
              <div style={{display:"flex",gap:"8px",marginBottom:"16px",flexWrap:"wrap",alignItems:"center"}}>
                <input style={{...s.inp,maxWidth:"180px"}} placeholder="Recherche cuvee..." value={filterStockCuvee} onChange={e=>setFilterStockCuvee(e.target.value)}/>
                <select style={{...s.sel,maxWidth:"180px"}} value={filterStockLieu} onChange={e=>setFilterStockLieu(e.target.value)}>
                  <option value="">Tous les lieux</option>
                  {LIEUX_STOCK.map(l=><option key={l} value={l}>{l}</option>)}
                </select>
                <select style={{...s.sel,maxWidth:"220px"}} value={filterStockStatut} onChange={e=>setFilterStockStatut(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  {[...STATUTS_BOUTEILLES,"Passage 15 mois (commercialisable)"].map(st=><option key={st} value={st}>{st}</option>)}
                </select>
                <select style={{...s.sel,maxWidth:"160px"}} value={filterStock15} onChange={e=>setFilterStock15(e.target.value)}>
                  <option value="">Tous ages</option>
                  <option value="moins15">Moins de 15 mois</option>
                  <option value="plus15">Plus de 15 mois</option>
                </select>
                {(filterStockLieu||filterStockStatut||filterStock15||filterStockCuvee)&&(
                  <button style={s.ghostSm} onClick={()=>{setFilterStockLieu("");setFilterStockStatut("");setFilterStock15("");setFilterStockCuvee("");}}>Reinitialiser</button>
                )}
                <span style={{marginLeft:"auto",fontSize:"11px",color:"#9a8870"}}>{lotsFusionnes.length} ligne(s) ({lotsFiltre.length} lots)</span>
              </div>

              {/* 3. Tableau */}
              {lotsFiltre.length===0&&(
                <div style={{...s.card,textAlign:"center",padding:"40px",color:"#9a8870"}}>
                  <div style={{fontSize:"32px",marginBottom:"12px"}}>Aucun lot en stock</div>
                  <div style={{fontSize:"13px"}}>Creez un tirage pour alimenter automatiquement le stock.</div>
                </div>
              )}
              {lotsFiltre.length>0&&(
                <div style={{...s.card,padding:0,overflow:"hidden",marginBottom:"24px"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                    <thead>
                      <tr style={{background:"#fff8ee",borderBottom:"1px solid #d4c4a0"}}>
                        {["Cuvee","Millesime","N° Lot","Format","Date tirage","Age","Statut","Lieu","Qte actuelle","Actions"].map(h=>(
                          <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lotsFusionnes.map((l,i)=>(
                        <tr key={l.id} style={{borderBottom:"1px solid #ede5d4",background:l.mois>=14&&!l.passage15?"#fff8e8":i%2===0?"#ffffff":"#fffbf5"}}>
                          <td style={{padding:"10px 12px",fontWeight:500,color:"#1a1205"}}>{l.cuvee}{l.isBio&&<span style={{marginLeft:"6px",fontSize:"10px",background:"#2d6a00",color:"#fff",borderRadius:"3px",padding:"1px 5px",fontWeight:600}}>🌿</span>}</td>
                          <td style={{padding:"10px 12px",color:"#6a5838",fontFamily:"monospace"}}>{l.millesime||"-"}</td>
                          <td style={{padding:"10px 12px",color:"#9a8870",fontFamily:"monospace",fontSize:"11px"}}>{l.lot||"-"}</td>
                          <td style={{padding:"10px 12px",color:"#6a5838"}}>{l.format}</td>
                          <td style={{padding:"10px 12px",color:"#9a8870"}}>{fmt(l.dateTirage)}</td>
                          <td style={{padding:"10px 12px"}}>
                            <span style={{background:l.passage15?"#d4f0dd":l.mois>=14?"#fff3cd":"#fde8e8",color:l.passage15?"#1a7a40":l.mois>=14?"#c47800":"#cc2222",borderRadius:"12px",padding:"2px 8px",fontSize:"11px",fontWeight:500}}>{l.mois}m</span>
                            {l.mois>=14&&!l.passage15&&<span style={{marginLeft:"4px",fontSize:"10px",color:"#c47800",fontWeight:"bold"}}>!</span>}
                          </td>
                          <td style={{padding:"10px 12px"}}>
                            <span style={{background:(STATUT_COLORS[l.statut]||{bg:"#e8f0e8"}).bg,color:(STATUT_COLORS[l.statut]||{color:"#2d6a00"}).color,borderRadius:"4px",padding:"2px 8px",fontSize:"10px"}}>{l.statut}</span>
                          </td>
                          <td style={{padding:"10px 12px"}}><span style={{background:(LIEU_COLORS[l.lieu]||{bg:"#ede5d4"}).bg,color:(LIEU_COLORS[l.lieu]||{color:"#6a5838"}).color,borderRadius:"4px",padding:"2px 8px",fontSize:"10px"}}>{l.lieu}</span></td>
                          <td style={{padding:"10px 12px",fontWeight:600,color:"#b8860b",fontFamily:"monospace",fontSize:"14px"}}>{l.qteActuelle}</td>
                          <td style={{padding:"10px 12px"}}>
                            <div style={{display:"flex",gap:"4px"}}>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#185FA5",borderColor:"#b4d0f0"}}
                                onClick={()=>setLotAction({lot:l,action:"mouvement"})}>Mouvement</button>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#1a7a40",borderColor:"#b4d0b4"}}
                                onClick={()=>{setSortieForm({lotId:l._ids?l._ids[0]:l.id,_ids:l._ids||[l.id],qteMax:parseInt(l.qteActuelle)||0,cuvee:l.cuvee,millesime:l.millesime,format:l.format,date:new Date().toISOString().slice(0,10),qte:"",notes:""});setShowSortieForm(true);}}>Sortie</button>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#7a5200",borderColor:"#d4c4a0"}}
                                onClick={()=>setLotAction({lot:l,action:"diviser"})}>Diviser</button>
                              {l.mois>=14&&!l.passage15&&(
                                <button style={{...s.ghostSm,fontSize:"10px",color:"#1a7a40",borderColor:"#b4d4b4",fontWeight:500}}
                                  onClick={()=>{if(window.confirm("Confirmer le passage en +15 mois pour ce lot ?")){const upd={...l,passage15:true};setStockBouteilles(prev=>prev.map(x=>x.id===l.id?upd:x));fbSave("stockBouteilles",l.id,upd);}}}> Confirmer +15m</button>
                              )}
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                                onClick={()=>{if((l.qteActuelle||0)>0)return alert("Impossible de supprimer un lot avec du stock restant ("+l.qteActuelle+" btl). Faites une sortie pour vider le stock.");if(window.confirm("Supprimer ce lot ?")){setStockBouteilles(prev=>prev.filter(x=>x.id!==l.id));fbDelete("stockBouteilles",l.id);}}}>Sup.</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Encart coiffes */}
              {(()=>{
                const calcStock = (type) => coiffesStock.filter(c=>c.type===type).reduce((s,c)=>s+(c.operation==="achat"?parseInt(c.qte)||0:-(parseInt(c.qte)||0)),0);
                const stockCRD = calcStock("CRD");
                const stockCRDMag = calcStock("CRD Magnum");
                const stockCRDJer = calcStock("CRD Jeroboam");
                const stockExport = calcStock("Export");
                const stockExpMag = calcStock("Export Magnum");
                const stockExpJer = calcStock("Export Jeroboam");
                return (
                  <div style={{...s.card,padding:"16px 20px",marginTop:"16px",marginBottom:"16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#7a5200"}}>Stock coiffes</div>
                      <button style={s.btnSm} onClick={()=>setShowCoiffesForm(true)}>+ Achat coiffes</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
                      {[["CRD 75cl",stockCRD,"#6a2d8a"],["CRD Mag",stockCRDMag,"#6a2d8a"],["CRD Jer",stockCRDJer,"#6a2d8a"],
                        ["Export 75cl",stockExport,"#8a2d6a"],["Export Mag",stockExpMag,"#8a2d6a"],["Export Jer",stockExpJer,"#8a2d6a"]
                      ].filter(([,q])=>q>0||true).map(([lbl,q,col])=>(
                        <div key={lbl} style={{padding:"8px",background:q<50?"#fde8e8":"#f0fff4",borderRadius:"6px",textAlign:"center"}}>
                          <div style={{fontSize:"10px",color:col,fontWeight:500,marginBottom:"2px"}}>{lbl}</div>
                          <div style={{fontSize:"18px",fontWeight:600,color:q<50?"#cc2222":"#1a7a40"}}>{q}</div>
                        </div>
                      ))}
                    </div>
                    {coiffesStock.length>0&&(
                      <div style={{marginTop:"12px",borderTop:"0.5px solid #ede5d4",paddingTop:"10px"}}>
                        <div style={{fontSize:"11px",color:"#9a8870",marginBottom:"6px",cursor:"pointer",display:"flex",justifyContent:"space-between"}} onClick={()=>setShowHistCoiffes(p=>!p)}>Dernieres operations {showHistCoiffes?"▲":"▼"}</div>
                        {showHistCoiffes&&[...coiffesStock].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(c=>(
                          <div key={c.id} style={{display:"flex",justifyContent:"space-between",fontSize:"11px",padding:"3px 0",borderBottom:"0.5px solid #f5f0e8"}}>
                            <span style={{color:"#9a8870"}}>{fmt(c.date)}</span>
                            <span style={{color:c.type==="CRD"?"#6a2d8a":"#8a2d6a",fontWeight:500}}>{c.type}</span>
                            <span style={{color:c.operation==="achat"?"#1a7a40":"#cc2222"}}>{c.operation==="achat"?"+":"-"}{c.qte}</span>
                            <button style={{...s.ghostSm,fontSize:"9px",color:"#cc2222",borderColor:"#f0b4b4",padding:"1px 4px"}} onClick={()=>{if(window.confirm("Supprimer ?")){setCoiffesStock(prev=>prev.filter(x=>x.id!==c.id));fbDelete("coiffes",c.id);}}}>x</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Historique sorties */}
              {clotures.filter(c=>c.type==="sortie").length>0&&(
                <div style={{...s.card,padding:"16px 20px",marginTop:"16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",cursor:"pointer"}} onClick={()=>setShowHistSorties(p=>!p)}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#7a5200"}}>Historique des sorties {showHistSorties?"▲":"▼"}</div>
                    <div style={{display:"flex",gap:"6px"}}>
                      {[...new Set(clotures.filter(c=>c.type==="sortie").map(c=>c.date.slice(0,7)))].sort().map(mois=>(
                        <button key={mois} style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                          onClick={()=>{if(window.confirm("Archiver et supprimer toutes les sorties de "+mois+" ?")){
                            const toDelete = clotures.filter(c=>c.type==="sortie"&&c.date.slice(0,7)===mois);
                            toDelete.forEach(c=>fbDelete("clotures",c.id));
                            setClotures(prev=>prev.filter(c=>!(c.type==="sortie"&&c.date.slice(0,7)===mois)));
                          }}}>Archiver {mois}</button>
                      ))}
                    </div>
                  </div>
                  {(()=>{
                    const sorties = clotures.filter(c=>c.type==="sortie");
                    const tots = {};
                    sorties.forEach(c=>{
                      const k = (c.statut||"Vente")+"|"+(c.format||"75cl");
                      tots[k] = (tots[k]||0) + (parseInt(c.qte)||0);
                    });
                    const totCRD75 = sorties.filter(c=>c.statut==="Habille CRD"&&c.format==="75cl").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    const totCRDMag = sorties.filter(c=>c.statut==="Habille CRD"&&c.format==="Magnum").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    const totCRDJer = sorties.filter(c=>c.statut==="Habille CRD"&&c.format==="Jeroboam").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    const totExp75 = sorties.filter(c=>c.statut==="Habille Export"&&c.format==="75cl").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    const totExpMag = sorties.filter(c=>c.statut==="Habille Export"&&c.format==="Magnum").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    const totExpJer = sorties.filter(c=>c.statut==="Habille Export"&&c.format==="Jeroboam").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    return (
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px",padding:"10px",background:"#fff8ee",borderRadius:"6px"}}>
                        {totCRD75+totCRDMag+totCRDJer>0&&<div>
                          <div style={{fontSize:"11px",fontWeight:500,color:"#6a2d8a",marginBottom:"4px"}}>CRD</div>
                          {totCRD75>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>75cl : <strong>{totCRD75}</strong> btl</div>}
                          {totCRDMag>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>Magnum : <strong>{totCRDMag}</strong></div>}
                          {totCRDJer>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>Jeroboam : <strong>{totCRDJer}</strong></div>}
                        </div>}
                        {totExp75+totExpMag+totExpJer>0&&<div>
                          <div style={{fontSize:"11px",fontWeight:500,color:"#8a2d6a",marginBottom:"4px"}}>Export</div>
                          {totExp75>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>75cl : <strong>{totExp75}</strong> btl</div>}
                          {totExpMag>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>Magnum : <strong>{totExpMag}</strong></div>}
                          {totExpJer>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>Jeroboam : <strong>{totExpJer}</strong></div>}
                        </div>}
                      </div>
                    );
                  })()}
                  {showHistSorties&&clotures.filter(c=>c.type==="sortie").sort((a,b)=>b.date.localeCompare(a.date)).map(c=>(
                    <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"0.5px solid #ede5d4",fontSize:"12px"}}>
                      <div>
                        <span style={{fontWeight:500,color:"#1a1205"}}>{fmt(c.date)}</span>
                        <span style={{color:"#6a5838",marginLeft:"8px"}}>{c.cuvee}</span>
                        <span style={{color:"#b8860b",fontFamily:"monospace",marginLeft:"8px",fontWeight:500}}>{c.qte} {c.format==="Magnum"?"Magnums":c.format==="Jeroboam"?"Jeroboams":"btl"} sorties</span>
                        {c.notes&&<span style={{color:"#9a8870",marginLeft:"8px",fontStyle:"italic"}}>{c.notes}</span>}
                      </div>
                      <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>{ if(!window.confirm("Annuler cette sortie ?")) return; const lot=stockBouteilles.find(x=>x.id===c.lotId); if(lot){const upd={...lot,qteActuelle:(lot.qteActuelle||0)+(parseInt(c.qte)||0)};setStockBouteilles(p=>p.map(x=>x.id===lot.id?upd:x));fbSave("stockBouteilles",lot.id,upd);} setClotures(p=>p.filter(x=>x.id!==c.id));fbDelete("clotures",c.id); }}>Annuler</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* -- TIRAGES -- */}
        {view==="tirages" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontSize:"13px",color:"#7a6840"}}>{tirages.length} tirage(s) enregistré(s)</div>
              <button style={s.btn} onClick={()=>{setTirageForm(TIRAGE_EMPTY);setEditingTirage(null);setShowTirageForm(true);}}>
                + Nouveau tirage
              </button>
            </div>

            {tirages.length===0 && (
              <div style={{...s.card,textAlign:"center",padding:"40px",color:"#9a8870"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>Aucun tirage enregistré</div>
                <div style={{fontSize:"13px",marginBottom:"16px"}}>Créez votre premier tirage pour commencer le suivi.</div>
                <button style={s.btn} onClick={()=>{setTirageForm(TIRAGE_EMPTY);setEditingTirage(null);setShowTirageForm(true);}}>+ Nouveau tirage</button>
              </div>
            )}

            <div style={{display:"grid",gap:"14px"}}>
              {tirages.map(t=>(
                <div key={t.id} style={{...s.card,borderLeft:"3px solid #533AB7"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"16px"}}>
                    {/* Identite */}
                    <div>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"16px",fontWeight:500,color:"#7a5200",marginBottom:"2px"}}>{t.cuvee}{t.isBio&&<span style={{marginLeft:"8px",fontSize:"11px",background:"#2d6a00",color:"#fff",borderRadius:"4px",padding:"2px 7px",fontWeight:600}}>🌿 BIO</span>}</div>
                      <div style={{fontSize:"12px",color:"#9a8870",marginBottom:"8px"}}>{fmt(t.date)} - {t.operateur}</div>
                      {t.millesime&&<div style={{fontSize:"11px",color:"#6a5838"}}>Millésime : <strong>{t.millesime}</strong></div>}
                      {t.futsSources?.length>0&&(
                        <div style={{fontSize:"11px",color:"#6a5838",marginTop:"3px"}}>
                          Futs : {t.futsSources.join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Volumes assembles */}
                    <div style={{borderLeft:"0.5px solid #d4c4a0",paddingLeft:"14px"}}>
                      <div style={s.lbl}>Volume assemblé</div>
                      <div style={{fontSize:"20px",fontWeight:500,color:"#533AB7"}}>{t.volAssemble?.toFixed(1)} L</div>
                      <div style={{fontSize:"11px",color:"#9a8870",marginTop:"4px"}}>
                        Vin : {t.volumeTotal||0} L
                      </div>
                      {t.volLevain>0&&(
                        <div style={{fontSize:"11px",color:"#9a8870"}}>
                          Levain : {t.volLevain?.toFixed(1)} L
                        </div>
                      )}
                    </div>

                    {/* Levain */}
                    <div style={{borderLeft:"0.5px solid #d4c4a0",paddingLeft:"14px"}}>
                      <div style={s.lbl}>Levain</div>
                      {t.levainLevureNom ? (
                        <div>
                          <div style={{fontSize:"13px",fontWeight:500,color:"#1a1205",marginBottom:"3px"}}>{t.levainLevureNom}</div>
                          {t.levainLot&&<div style={{display:"inline-flex",alignItems:"center",background:"#fff8ee",border:"0.5px solid #d4c4a0",borderRadius:"3px",padding:"1px 7px",fontSize:"10px",color:"#7a5200",fontFamily:"monospace",marginBottom:"4px"}}>Lot: {t.levainLot}</div>}
                          <div style={{fontSize:"11px",color:"#9a8870"}}>
                            Eau: {t.levainEau||0}L · Vin: {t.levainVin||0}L · Lev: {t.levainLevure||0}L
                          </div>
                        </div>
                      ) : <div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Pas de levain</div>}
                    </div>

                    {/* Bouteilles */}
                    <div style={{borderLeft:"0.5px solid #d4c4a0",paddingLeft:"14px"}}>
                      <div style={s.lbl}>Mise en bouteilles</div>
                      <div style={{fontSize:"20px",fontWeight:500,color:"#1a7a40"}}>{t.volBouteilles?.toFixed(1)} L</div>
                      <div style={{marginTop:"6px",display:"flex",flexDirection:"column",gap:"3px"}}>
                        {(parseFloat(t.qte75)||0)>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>
                          <span style={{display:"inline-block",width:"18px",height:"18px",background:"#d4edc0",borderRadius:"3px",textAlign:"center",lineHeight:"18px",fontSize:"10px",marginRight:"5px",color:"#2d6a00",fontFamily:"monospace"}}>75</span>
                          {t.qte75} bouteilles = {((parseFloat(t.qte75)||0)*0.75).toFixed(0)}L
                        </div>}
                        {(parseFloat(t.qteMagnum)||0)>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>
                          <span style={{display:"inline-block",width:"18px",height:"18px",background:"#fde8b8",borderRadius:"3px",textAlign:"center",lineHeight:"18px",fontSize:"10px",marginRight:"5px",color:"#7a5200",fontFamily:"monospace"}}>M</span>
                          {t.qteMagnum} magnums = {((parseFloat(t.qteMagnum)||0)*1.5).toFixed(0)}L
                        </div>}
                        {(parseFloat(t.qteJeroboam)||0)>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>
                          <span style={{display:"inline-block",width:"18px",height:"18px",background:"#fdd0d0",borderRadius:"3px",textAlign:"center",lineHeight:"18px",fontSize:"10px",marginRight:"5px",color:"#8B0000",fontFamily:"monospace"}}>J</span>
                          {t.qteJeroboam} jeroboams = {((parseFloat(t.qteJeroboam)||0)*3.0).toFixed(0)}L
                        </div>}
                      </div>
                    </div>
                  </div>
                  {(t.cuveDestId||t.nouvelleCuveId)&&(
                    <div style={{marginTop:"10px",paddingTop:"10px",borderTop:"0.5px solid #ede5d4",display:"flex",alignItems:"center",gap:"8px",fontSize:"12px"}}>
                      <span style={{color:"#9a8870"}}>Stocke dans :</span>
                      <span style={{background:"#eeedfe",color:"#533AB7",border:"0.5px solid #534ab744",borderRadius:"4px",padding:"2px 10px",fontFamily:"monospace",fontWeight:500}}>
                        {t.cuveDestId || t.nouvelleCuveId}
                      </span>
                      <span style={{color:"#9a8870",fontSize:"11px"}}>{t.volAssemble?.toFixed(1)} L</span>
                    </div>
                  )}
                  {t.notes&&<div style={{marginTop:"12px",paddingTop:"10px",borderTop:"0.5px solid #ede5d4",fontSize:"12px",color:"#6a5838",fontStyle:"italic"}}>{t.notes}</div>}
                  <div style={{marginTop:"10px",display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #ede5d4",paddingTop:"10px"}}>
                    <button style={{background:"#fff8ee",color:"#7a5200",border:"0.5px solid #d4c4a0",borderRadius:"4px",padding:"4px 12px",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}
                      onClick={()=>openEditTirage(t)}>
                      Modifier
                    </button>
                    <button style={{background:"#fce8e8",color:"#cc2222",border:"0.5px solid #f0b4b4",borderRadius:"4px",padding:"4px 12px",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}
                      onClick={()=>{if(window.confirm("Supprimer ce tirage ? Cette action est irreversible.")) { setTirages(prev=>prev.filter(tr=>tr.id!==t.id)); deleteTirageFb(t.id); }}}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -- DÉGUSTATIONS (vue globale) -- */}
        {view==="degustations" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:"20px",alignItems:"start"}}>

            {/* Colonne principale */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <div style={{fontSize:"13px",color:"#7a6840"}}>{degustations.length} notes · {[...new Set(degustations.map(d=>d.session))].length} sessions · {futsAvecNotes.length} fûts</div>
                <div style={{display:"flex",gap:"8px"}}>
                  <button style={s.ghost} onClick={()=>setShowImport(true)}>
                    <i className="ti ti-file-import" style={{marginRight:"4px"}}/>Importer (CSV)
                  </button>
                  <button style={s.btn} onClick={()=>{setDegForm({futId:"",session:"",date:new Date().toISOString().slice(0,10),lignes:degustateurs.filter(d=>d.actif).map(d=>({degustateur:d.nom,boise:"",longueur:"",noteG:"",commentaire:""}))});setShowDegForm(true);}}>
                    <i className="ti ti-plus" style={{marginRight:"4px"}}/>Nouvelle dégustation
                  </button>
                </div>
              </div>

              {/* Barre de filtres */}
              <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap",alignItems:"center",padding:"10px 14px",background:"#fffbf3",border:"1px solid #cfc0a0",borderRadius:"8px"}}>
                <i className="ti ti-filter" style={{fontSize:"14px",color:"#b8860b",flexShrink:0}}/>
                <input style={{...s.inp,maxWidth:"150px",padding:"5px 9px",fontSize:"12px"}}
                  placeholder="N° fût..." value={filterDegFut}
                  onChange={e=>setFilterDegFut(e.target.value)}/>
                <select style={{...s.sel,maxWidth:"190px",padding:"5px 9px",fontSize:"12px"}}
                  value={filterDegCuvee} onChange={e=>setFilterDegCuvee(e.target.value)}>
                  <option value="">Toutes les cuvées</option>
                  {cuveeOptions.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <select style={{...s.sel,maxWidth:"170px",padding:"5px 9px",fontSize:"12px"}}
                  value={filterDegFabric} onChange={e=>setFilterDegFabric(e.target.value)}>
                  <option value="">Tous les fabricants</option>
                  {fabricOptions.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
                {hasFilter && (
                  <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#e8888855",fontSize:"11px"}}
                    onClick={()=>{setFilterDegFut("");setFilterDegCuvee("");setFilterDegFabric("");}}>
                    <i className="ti ti-x" style={{marginRight:"3px"}}/>Réinitialiser
                  </button>
                )}
                <span style={{marginLeft:"auto",fontSize:"11px",color:"#8a7248"}}>{futsFiltres.length} / {futsAvecNotes.length} fûts</span>
              </div>

              <div style={s.card}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                    <thead>
                      <tr style={{borderBottom:"2px solid #d4c4a0",background:"#fff8ee"}}>
                        {["N° Fût","Cuvée","Fabricant","Mill.","Moy. Note G","Moy. Boisé","Moy. Long.","Nb notes","Sessions"].map(h=>(
                          <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#8a7248",fontWeight:600}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {futsFiltres.sort((a,b)=>(avgNoteG(b.id)||0)-(avgNoteG(a.id)||0)).map((t,i)=>{
                        const ng=avgNoteG(t.id); const nb=avgBoise(t.id); const nl=avgLong(t.id);
                        return (
                          <tr key={t.id}
                            style={{borderBottom:"1px solid #e8dcc6",cursor:"pointer",background:i%2===0?"transparent":"#fffbf3",transition:"background 0.1s"}}
                            onClick={()=>{setSelectedFut(t.id);setView("fiche");setFicheTab("degustations");}}>
                            <td style={{padding:"9px 10px",color:"#b8860b",fontWeight:700,fontFamily:"'IBM Plex Mono',monospace"}}>{t.id}</td>
                            <td style={{padding:"9px 10px",color:"#1a1205",fontWeight:500,maxWidth:"160px"}}>
                              <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.denomination}</div>
                            </td>
                            <td style={{padding:"9px 10px"}}>
                              {t.tonnelier
                                ? <span style={{background:"#fce8a8",color:"#7a5200",border:"1px solid #e0c050",borderRadius:"3px",padding:"1px 7px",fontSize:"11px",fontWeight:600,whiteSpace:"nowrap"}}>{t.tonnelier}</span>
                                : <span style={{color:"#c0b090",fontSize:"11px"}}>-</span>
                              }
                            </td>
                            <td style={{padding:"9px 10px",color:"#6a5838",fontFamily:"'IBM Plex Mono',monospace"}}>{t.millesime||"-"}</td>
                            <td style={{padding:"9px 10px"}}>
                              <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                                <div style={{width:"44px",height:"5px",background:"#e8dcc6",borderRadius:"3px",overflow:"hidden"}}>
                                  <div style={{width:`${((ng||0)/5)*100}%`,height:"100%",background:ng>=4?"#1a7a40":ng>=3?"#b8860b":"#cc6622",borderRadius:"3px"}}/>
                                </div>
                                <span style={{fontWeight:700,color:ng>=4?"#1a7a40":ng>=3?"#b8860b":"#8a7248",fontFamily:"'IBM Plex Mono',monospace",minWidth:"28px"}}>{ng?.toFixed(1)||"-"}</span>
                              </div>
                            </td>
                            <td style={{padding:"9px 10px",color:"#6a5838",fontFamily:"'IBM Plex Mono',monospace"}}>{nb?.toFixed(1)||"-"}</td>
                            <td style={{padding:"9px 10px",color:"#6a5838",fontFamily:"'IBM Plex Mono',monospace"}}>{nl?.toFixed(1)||"-"}</td>
                            <td style={{padding:"9px 10px",color:"#7a6840",textAlign:"center"}}>{notesForFut(t.id).length}</td>
                            <td style={{padding:"9px 10px",color:"#8a7248",fontSize:"11px",maxWidth:"120px"}}>
                              <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sessions(t.id).join(", ")}</div>
                            </td>
                          </tr>
                        );
                      })}
                      {futsFiltres.length===0&&(
                        <tr><td colSpan={9} style={{padding:"24px 10px",color:"#8a7248",fontSize:"13px",textAlign:"center"}}>
                          {hasFilter?"Aucun fût ne correspond aux filtres.":"Aucune note encore."}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Colonne droite - gestion des dégustateurs */}
            <div style={s.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <span style={{...s.lbl,marginBottom:0}}>Dégustateurs</span>
                {editingDeg && (
                  <div style={{display:"flex",gap:"6px"}}>
                    <button style={s.ghostSm} onClick={()=>setEditingDeg(false)}>Annuler</button>
                    <button style={s.btnSm} onClick={()=>{setDegustateurs(degDraft.filter(d=>d.nom.trim()));setEditingDeg(false);}}>
                      <i className="ti ti-check" style={{marginRight:"3px"}}/>Sauver
                    </button>
                  </div>
                )}
              </div>

              {!editingDeg ? (
                <div>
                  {degustateurs.map((d,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 0",borderBottom:"1px solid #d0c4a0",opacity:d.actif?1:0.45}}>
                      <div style={{width:"26px",height:"26px",borderRadius:"50%",background:d.actif?"#b8860b22":"#2a2a2c",border:`1px solid ${d.actif?"#b8860b33":"#3a3a3c"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:600,color:d.actif?"#b8860b":"#555",flexShrink:0}}>
                        {d.nom.charAt(0).toUpperCase()}
                      </div>
                      <span style={{fontSize:"13px",color:d.actif?"#e8e4d8":"#555",flex:1}}>{d.nom}</span>
                      <span style={{fontSize:"10px",color:"#8a7248",marginRight:"4px"}}>{degustations.filter(dg=>dg.degustateur===d.nom).length}</span>
                      <button title={d.actif?"Marquer absent":"Marquer présent"}
                        style={{...s.ghostSm,padding:"3px 7px",color:d.actif?"#555":"#c47800",borderColor:d.actif?"#2a2a2c":"#854F0B44",fontSize:"11px"}}
                        onClick={()=>toggleActif(i)}>
                        {d.actif
                          ? <><i className="ti ti-eye-off" style={{fontSize:"13px",verticalAlign:"middle"}}/></>
                          : <><i className="ti ti-eye" style={{fontSize:"13px",verticalAlign:"middle"}}/></>
                        }
                      </button>
                    </div>
                  ))}
                  <div style={{marginTop:"10px",padding:"8px",background:"#fffbf3",borderRadius:"5px",fontSize:"11px",color:"#8a7248"}}>
                    {degustateurs.filter(d=>!d.actif).length===0
                      ? "Tous présents - les absents sont masqués du formulaire de saisie."
                      : `${degustateurs.filter(d=>!d.actif).length} absent(s) - masqué(s) du prochain formulaire.`
                    }
                  </div>
                  <button style={{...s.ghostSm,width:"100%",marginTop:"10px",textAlign:"center"}}
                    onClick={()=>{setDegDraft(degustateurs.map(d=>({...d})));setEditingDeg(true);}}>
                    <i className="ti ti-pencil" style={{marginRight:"3px"}}/>Renommer / Ajouter
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{fontSize:"11px",color:"#7a6840",marginBottom:"10px"}}>Laissez vide pour supprimer. Les notes existantes sont conservées.</div>
                  {degDraft.map((d,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"6px"}}>
                      <input style={{...s.inp,padding:"6px 8px",fontSize:"12px",flex:1}} value={d.nom}
                        onChange={e=>{const nd=[...degDraft];nd[i]={...nd[i],nom:e.target.value};setDegDraft(nd);}}
                        placeholder={`Dégustateur ${i+1}`}/>
                      <button style={{...s.ghostSm,padding:"5px 7px",color:"#cc2222",borderColor:"#A32D2D33",flexShrink:0}}
                        onClick={()=>setDegDraft(degDraft.filter((_,j)=>j!==i))}>
                        <i className="ti ti-x"/>
                      </button>
                    </div>
                  ))}
                  <button style={{...s.ghostSm,width:"100%",marginTop:"6px",textAlign:"center"}}
                    onClick={()=>setDegDraft([...degDraft,{nom:"",actif:true}])}>
                    <i className="ti ti-plus" style={{marginRight:"3px"}}/>Ajouter une ligne
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* -- FICHE FÛT -- */}
        {view==="fiche" && selectedT && (
            <div>
              <button style={{...s.ghost,marginBottom:"16px"}} onClick={()=>setView("tonneaux")}>Retour Tonneaux</button>
              <div style={{display:"grid",gridTemplateColumns:"clamp(240px,30vw,300px) 1fr",gap:"20px"}}>
                {/* Colonne gauche */}
                <div>
                  <div style={s.card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:"14px"}}>
                      <div>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",color:"#b8860b"}}>{selectedT.id}</div>
                        <div style={{fontSize:"12px",color:"#6a5838",marginTop:"2px"}}>{selectedT.denomination}</div>
                        {selectedT.appellation && <div style={{marginTop:"6px",display:"inline-flex",alignItems:"center",gap:"5px",padding:"2px 8px",borderRadius:"3px",background:getApc(selectedT.appellation).bg,border:`1px solid ${getApc(selectedT.appellation).border}`,fontSize:"10px",color:getApc(selectedT.appellation).color,letterSpacing:"0.06em",textTransform:"uppercase"}}>
                            <span style={{width:"5px",height:"5px",borderRadius:"50%",background:getApc(selectedT.appellation).color}}/>
                            {getApc(selectedT.appellation).label}
                          </div>}
                      </div>
                      <span style={s.tag(selectedT.statut==="surveillance"?"#c47800":selectedT.contenuActuel<10?"#cc2222":"#1a7a40")}>
                        {selectedT.statut==="surveillance"?"surveillance":selectedT.contenuActuel<10?"vide":"actif"}
                      </span>
                    </div>
                    <div style={{marginBottom:"14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#7a6840",marginBottom:"5px"}}>
                        <span>Niveau</span><span style={{color:"#b8860b",fontWeight:600}}>{selectedT.contenuActuel}L / {selectedT.volume}L ({selectedP}%)</span>
                      </div>
                      <div style={{background:"#fffbf3",borderRadius:"2px",height:"6px",overflow:"hidden"}}>
                        <div style={{width:`${selectedP}%`,height:"100%",background:selectedP<20?"#cc2222":"#b8860b",borderRadius:"2px"}}/>
                      </div>
                    </div>
                    {(parseFloat(selectedT.volumeRI)||0)>0&&(
                      <div style={{marginBottom:"14px",padding:"10px",background:"#f0f8ff",borderRadius:"6px",border:"0.5px solid #4a90d9"}}>
                        <div style={{fontSize:"11px",color:"#185FA5",fontWeight:500,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Repartition du volume</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:"10px",color:"#9a8870",marginBottom:"2px"}}>AOC Tirable</div>
                            <div style={{fontSize:"16px",fontWeight:600,color:"#1a7a40"}}>{((selectedT.contenuActuel||0)-(parseFloat(selectedT.volumeRI)||0)).toFixed(1)} L</div>
                          </div>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:"10px",color:"#9a8870",marginBottom:"2px"}}>RI</div>
                            <div style={{fontSize:"16px",fontWeight:600,color:"#8B0000"}}>{parseFloat(selectedT.volumeRI).toFixed(1)} L</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {[["N Marc",selectedT.marc||"-"],["Millesime vin",selectedT.millesime||"-"],["Certification",selectedT.certif==="BIO"?"🌿 BIO":selectedT.certif||"-"],["Tonnelier",selectedT.tonnelier||"-"],["Grain",selectedT.grain||"-"],["Chauffe",selectedT.chauffe||"-"],["Capacite",`${selectedT.volume} L`]].map(([k,v])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #d0c4a0",fontSize:"12px"}}>
                        <span style={{color:"#8a7248"}}>{k}</span><span style={{color:"#1a1205"}}>{v}</span>
                      </div>
                    ))}
                    {avgNoteG(selectedT.id)!=null&&(
                      <div style={{marginTop:"14px",padding:"10px",background:"#fffbf3",borderRadius:"6px"}}>
                        <div style={{fontSize:"10px",color:"#8a7248",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"6px"}}>Note dégustation</div>
                        <div style={{display:"flex",gap:"16px"}}>
                          <div><div style={{fontSize:"18px",fontWeight:600,color:avgNoteG(selectedT.id)>=4?"#1a7a40":"#b8860b"}}>{avgNoteG(selectedT.id)?.toFixed(1)}<span style={{fontSize:"11px",color:"#8a7248"}}>/5</span></div><div style={{fontSize:"10px",color:"#8a7248"}}>Note globale</div></div>
                          {avgBoise(selectedT.id)&&<div><div style={{fontSize:"18px",fontWeight:600,color:"#5a4a30"}}>{avgBoise(selectedT.id)?.toFixed(1)}</div><div style={{fontSize:"10px",color:"#8a7248"}}>Boisé</div></div>}
                          {avgLong(selectedT.id)&&<div><div style={{fontSize:"18px",fontWeight:600,color:"#5a4a30"}}>{avgLong(selectedT.id)?.toFixed(1)}</div><div style={{fontSize:"10px",color:"#8a7248"}}>Longueur</div></div>}
                        </div>
                      </div>
                    )}
                    {selectedT.commentaire&&(
                        <div style={{margin:"8px 0 12px",padding:"9px 12px",background:"#fff8ee",borderRadius:"6px",border:"1px solid #d4c4a0"}}>
                          <div style={{fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",color:"#9a8870",marginBottom:"4px",fontFamily:"monospace"}}>Notes</div>
                          <div style={{color:"#1a1205",fontSize:"12px",lineHeight:"1.6"}}>{selectedT.commentaire}</div>
                        </div>
                      )}
                    <div style={{display:"flex",gap:"6px",marginTop:"14px",flexWrap:"wrap"}}>
                      <button style={{...s.ghostSm,color:"#533AB7",borderColor:"#533AB744",width:"100%",textAlign:"center",marginBottom:"6px"}}
                        onClick={()=>{setCampFutId(selectedT.id);setCampForm({annee:new Date().getFullYear().toString(),denomination:selectedT.denomination,millesime:selectedT.millesime||"",notes:""});setShowCampForm(true);}}>
                        + Nouvelle campagne
                      </button>
                      <button style={s.btnSm} onClick={()=>{setMvtForm(f=>({...f,futDest:selectedT.id,type:"ouillage"}));setShowMvtForm(true);}}>Ouiller</button>
                      <button style={s.ghostSm} onClick={()=>{setMvtForm(f=>({...f,futSource:[selectedT.id],type:"soutirage"}));setShowMvtForm(true);}}>Soutirer</button>
                      <button style={s.ghostSm} onClick={()=>{setDegForm({futId:selectedT.id,session:"",date:new Date().toISOString().slice(0,10),lignes:degustateurs.filter(d=>d.actif).map(d=>({degustateur:d.nom,boise:"",longueur:"",noteG:"",commentaire:""}))});setShowDegForm(true);}}>+ Dégustation</button>
                    </div>
                    {selectedT.appellation&&selectedT.appellation.startsWith("vins_clairs")&&(
                      <div style={{marginTop:"8px"}}>
                        <button style={{...s.ghostSm,color:"#BA7517",borderColor:"#BA751744",width:"100%",justifyContent:"center",display:"flex",alignItems:"center",gap:"5px",padding:"6px 10px"}}
                          onClick={()=>{if(window.confirm(`Passer le fût "${selectedT.id}" en Vin de réserve ?`)) passerEnReserve(selectedT.id);}}>
                          <i className="ti ti-arrow-right" style={{fontSize:"12px"}}/>
                          Passer en Vin de réserve
                        </button>
                      </div>
                    )}
                    <div style={{display:"flex",gap:"6px",marginTop:"6px",paddingTop:"10px",borderTop:"1px solid #e8dcc6"}}>
                      <button style={{...s.ghostSm,color:"#5a4a30"}} onClick={()=>openEditFut(selectedT)}>
                        <i className="ti ti-pencil" style={{marginRight:"3px"}}/>Modifier
                      </button>
                      <button style={{...s.ghostSm,color:"#185FA5",borderColor:"#4a90d9"}} onClick={()=>{setDivisionFut(selectedT);setDivisionForm({volAOC:Math.max(0,(selectedT.contenuActuel||0)-(parseFloat(selectedT.volumeRI)||0)),volRI:parseFloat(selectedT.volumeRI)||0});setShowDivisionForm(true);}}>
                        <i className="ti ti-scissors" style={{marginRight:"3px"}}/>Diviser
                      </button>
                      <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#A32D2D33"}} onClick={()=>deleteFut(selectedT.id)}>
                        <i className="ti ti-trash" style={{marginRight:"3px"}}/>Supprimer
                      </button>
                    </div>
                  </div>
                </div>
                {/* Colonne droite - onglets */}
                <div style={s.card}>
                  <div style={{display:"flex",borderBottom:"1px solid #cfc0a0",marginBottom:"16px",gap:"0"}}>
                    {[["degustations",`Degustations (${notesForFut(selectedT.id).length})`],["mouvements",`Mouvements (${selectedMvts.length})`],["historique","Historique"]].map(([tab,lbl])=>(
                      <button key={tab} style={s.tabBtn(ficheTab===tab)} onClick={()=>setFicheTab(tab)}>{lbl}</button>
                    ))}
                  </div>

                  {ficheTab==="degustations"&&<NoteResume futId={selectedT.id}/>}
                  {ficheTab==="mouvements"&&(
                    <div>
                      {selectedMvts.length===0&&<div style={{color:"#8a7248",fontSize:"13px"}}>Aucun mouvement enregistré.</div>}
                      {selectedMvts.map(m=><MvtRow key={m.id} m={m}/>)}
                    </div>
                  )}

                  {ficheTab==="historique"&&(()=>{
                    const mvtsParAn = {};
                    selectedMvts.forEach(m=>{ const y=m.date?m.date.slice(0,4):"?"; if(!mvtsParAn[y]) mvtsParAn[y]=[]; mvtsParAn[y].push(m); });
                    const notesParAn = {};
                    notesForFut(selectedT.id).forEach(n=>{ const y=n.date?n.date.slice(0,4):"?"; if(!notesParAn[y]) notesParAn[y]=[]; notesParAn[y].push(n); });
                    const allYears=[...new Set([...Object.keys(mvtsParAn),...Object.keys(notesParAn)])].sort().reverse();
                    return (
                      <div>
                        {allYears.length===0&&<div style={{color:"#9a8870",fontStyle:"italic",padding:"12px 0"}}>Aucun historique.</div>}
                        {allYears.map(year=>(
                          <div key={year} style={{marginBottom:"16px"}}>
                            <div style={{fontFamily:"Georgia,serif",fontSize:"15px",color:"#b8860b",borderBottom:"0.5px solid #d4c4a0",paddingBottom:"6px",marginBottom:"8px"}}>
                              Campagne {year}
                              {mvtsParAn[year]&&<span style={{fontSize:"11px",color:"#9a8870",fontWeight:400,marginLeft:"8px"}}>{mvtsParAn[year].length} mvt(s)</span>}
                              {notesParAn[year]&&<span style={{fontSize:"11px",color:"#9a8870",fontWeight:400,marginLeft:"8px"}}>{notesParAn[year].length} deg.</span>}
                            </div>
                            {(mvtsParAn[year]||[]).map((m,i)=>(
                              <div key={i} style={{display:"flex",gap:"8px",padding:"5px 0",borderBottom:"0.5px solid #ede5d4",fontSize:"12px"}}>
                                <div style={{width:"80px",color:"#9a8870",flexShrink:0}}>{m.date}</div>
                                <div style={{flex:1}}>
                                  <span style={{background:"#e8f0e8",color:"#2d6a00",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",marginRight:"6px"}}>{m.type}</span>
                                  {m.lieuDepart&&<span style={{color:"#6a5838"}}>{m.lieuDepart}</span>}
                                  {m.lieuArrivee&&<span style={{color:"#9a8870"}}> -> {m.lieuArrivee}</span>}
                                  {m.volume&&<span style={{color:"#b8860b",fontFamily:"monospace",marginLeft:"6px",fontWeight:500}}>{m.volume}L</span>}
                                  {m.notes&&<div style={{color:"#9a8870",fontStyle:"italic",fontSize:"11px"}}>{m.notes}</div>}
                                </div>
                              </div>
                            ))}
                            {(notesParAn[year]||[]).map((n,i)=>(
                              <div key={i} style={{display:"flex",gap:"8px",padding:"5px 0",borderBottom:"0.5px solid #ede5d4",fontSize:"12px"}}>
                                <div style={{width:"80px",color:"#9a8870",flexShrink:0}}>{n.date}</div>
                                <div style={{flex:1}}>
                                  <span style={{background:"#f0e8f8",color:"#6a2d6a",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",marginRight:"6px"}}>Degustation</span>
                                  <span style={{color:"#6a5838"}}>{n.degustateur}</span>
                                  {n.noteG&&<span style={{background:"#fde8b8",color:"#7a5200",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",marginLeft:"6px"}}>{n.noteG}/5</span>}
                                  {n.commentaire&&<div style={{color:"#9a8870",fontStyle:"italic",fontSize:"11px"}}>{n.commentaire}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                </div>
              </div>
            </div>
          )}

        {/* -- VIGNE -- */}
        {false&&view==="vigne" && (()=>{
          const allTraits = [...traitements].sort((a,b)=>new Date(b.date)-new Date(a.date));
          const campagnes = [...new Set(allTraits.map(t=>t.campagne))].sort().reverse();
          const traitsFiltres = filterTraitAn ? allTraits.filter(t=>t.campagne===filterTraitAn) : allTraits;
          const biodyFiltres  = filterTraitAn ? biodynamies.filter(b=>b.campagne===filterTraitAn) : biodynamies;
          const amendFiltres  = filterTraitAn ? amendements.filter(a=>a.campagne===filterTraitAn) : amendements;
          const cuivreParCampagne = {};
          campagnes.forEach(c=>{
            cuivreParCampagne[c] = allTraits.filter(t=>t.campagne===c).reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0);
          });
          const closed = isCampagneClosed(filterTraitAn);
          return (
            <div>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
                <div style={{fontSize:"13px",color:"#7a6840"}}>{allTraits.length} traitement(s)</div>
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                  {filterTraitAn && !closed && (
                    <button style={{...s.ghost,fontSize:"11px",color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>cloturerCampagne(filterTraitAn)}>
                      Cloture campagne {filterTraitAn}
                    </button>
                  )}
                  {filterTraitAn && closed && (
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{background:"#fdd0d0",color:"#cc2222",borderRadius:"4px",padding:"3px 10px",fontSize:"11px",fontFamily:"monospace"}}>Campagne {filterTraitAn} cloturee</span>
                      <button style={{...s.ghost,fontSize:"10px"}} onClick={()=>rouvrirCampagne(filterTraitAn)}>Rouvrir</button>
                    </div>
                  )}
                  {!closed && vigneTab==="traitements" && (
                    <button style={s.btn} onClick={()=>{setTraitForm({...TRAIT_EMPTY,campagne:filterTraitAn||new Date().getFullYear().toString()});setEditingTrait(null);setShowTraitForm(true);}}>
                      + Traitement
                    </button>
                  )}
                  {!closed && vigneTab==="biodynamie" && (
                    <button style={s.btn} onClick={()=>{setBiodyForm(f=>({...f,campagne:filterTraitAn||new Date().getFullYear().toString()}));setShowBiodyForm(true);}}>
                      + Biodynamie
                    </button>
                  )}
                  {!closed && vigneTab==="amendements" && (
                    <button style={s.btn} onClick={()=>{setAmendForm(f=>({...f,campagne:filterTraitAn||new Date().getFullYear().toString()}));setShowAmendForm(true);}}>
                      + Amendement
                    </button>
                  )}
                </div>
              </div>

              {/* Filtre campagne */}
              <div style={{display:"flex",gap:"6px",marginBottom:"14px",flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:"10px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#9a8870",fontFamily:"monospace",marginRight:"4px"}}>Campagne :</span>
                {campagnes.map(c=>(
                  <button key={c} onClick={()=>setFilterTraitAn(c)}
                    style={{padding:"4px 10px",borderRadius:"4px",border:`0.5px solid ${filterTraitAn===c?"#2d6a00":"#d4c4a0"}`,background:filterTraitAn===c?"#d4edc0":"transparent",color:filterTraitAn===c?"#2d6a00":"#9a8870",fontSize:"11px",cursor:"pointer",fontFamily:"monospace",display:"flex",alignItems:"center",gap:"4px"}}>
                    {c}
                    {isCampagneClosed(c)&&<span style={{fontSize:"9px",color:"#cc2222"}}>cloturee</span>}
                    <span style={{background:cuivreParCampagne[c]>3000?"#fdd0d0":cuivreParCampagne[c]>2000?"#fde8b8":"#d4edc0",color:cuivreParCampagne[c]>3000?"#cc2222":cuivreParCampagne[c]>2000?"#c47800":"#2d6a00",borderRadius:"3px",padding:"0 4px",fontSize:"10px",fontWeight:500}}>
                      {(cuivreParCampagne[c]/1000).toFixed(2)}kg Cu
                    </span>
                  </button>
                ))}
              </div>

              {/* KPIs */}
              {filterTraitAn && vigneTab==="traitements" && (()=>{
                const cu = cuivreParCampagne[filterTraitAn]||0;
                return (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"8px",marginBottom:"14px"}}>
                    {[
                      {lbl:"Traitements",val:traitsFiltres.length},
                      {lbl:"Total Cuivre",val:`${(cu/1000).toFixed(3)}kg`,col:cu>3000?"#cc2222":cu>2000?"#c47800":"#1a7a40"},
                      {lbl:"Avril",val:`${traitsFiltres.filter(t=>t.date?.slice(5,7)==="04").reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0)}g`,col:"#185FA5"},
                      {lbl:"Mai",val:`${traitsFiltres.filter(t=>t.date?.slice(5,7)==="05").reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0)}g`,col:"#185FA5"},
                      {lbl:"Juin",val:`${traitsFiltres.filter(t=>t.date?.slice(5,7)==="06").reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0)}g`,col:"#185FA5"},
                      {lbl:"Juillet",val:`${traitsFiltres.filter(t=>t.date?.slice(5,7)==="07").reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0)}g`,col:"#185FA5"},
                      {lbl:"Aout",val:`${traitsFiltres.filter(t=>t.date?.slice(5,7)==="08").reduce((s,t)=>s+(parseFloat(t.cuivreTotal)||0),0)}g`,col:"#185FA5"},
                    ].map((k,i)=>(
                      <div key={i} style={{...s.card,padding:"10px 12px"}}>
                        <div style={s.lbl}>{k.lbl}</div>
                        <div style={{fontSize:"16px",fontWeight:500,color:k.col||"#b8860b",lineHeight:1.2}}>{k.val}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Onglets */}
              <div style={{display:"flex",borderBottom:"0.5px solid #d4c4a0",marginBottom:"16px"}}>
                {[["traitements","Traitements"],["biodynamie","Biodynamie"],["amendements","Amendements"],["stockprod","Stock Produits"]].map(([tab,lbl])=>(
                  <button key={tab} style={s.tabBtn(vigneTab===tab)} onClick={()=>setVigneTab(tab)}>{lbl}</button>
                ))}
              </div>

              {/* === TRAITEMENTS === */}
              {vigneTab==="traitements" && (
                <div style={s.card}>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                      <thead>
                        <tr style={{borderBottom:"1px solid #d4c4a0",background:"#fff8ee"}}>
                          {["N°","Date","Surface","Produits","Cu/ha",""].map(h=>(
                            <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {traitsFiltres.map((t,i)=>{
                          const currentYear = new Date().getFullYear().toString();
                          const isHist = t.campagne !== currentYear;
                          const canEdit = !closed && !isHist;
                          return (
                            <tr key={t.id||i} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#fffbf3"}}>
                              <td style={{padding:"8px 10px",fontFamily:"monospace",color:"#b8860b",fontWeight:500}}>N°{t.numero}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838"}}>{t.date}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838"}}>{t.surface}</td>
                              <td style={{padding:"8px 10px",maxWidth:"320px"}}>
                                <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
                                  {(t.produits||[]).map((p,j)=>(
                                    <span key={j} style={{background:p.matiereActive==="Cuivre"?"#fde8b8":p.matiereActive==="Soufre"?"#e6f0fb":"#ede5d4",color:p.matiereActive==="Cuivre"?"#7a5200":p.matiereActive==="Soufre"?"#185FA5":"#5f5e5a",borderRadius:"3px",padding:"1px 5px",fontSize:"10px",fontFamily:"monospace",whiteSpace:"nowrap"}}>
                                      {p.nom} {p.dose}
                                    </span>
                                  ))}
                                </div>
                                {t.observations&&<div style={{fontSize:"11px",color:"#9a8870",fontStyle:"italic",marginTop:"2px"}}>{t.observations}</div>}
                              </td>
                              <td style={{padding:"8px 10px",fontWeight:500,color:parseFloat(t.cuivreTotal)>400?"#cc2222":parseFloat(t.cuivreTotal)>200?"#c47800":"#1a7a40",fontFamily:"monospace",whiteSpace:"nowrap"}}>
                                {t.cuivreTotal?`${t.cuivreTotal}g`:"-"}
                              </td>
                              <td style={{padding:"8px 10px",whiteSpace:"nowrap"}}>
                                {canEdit ? (
                                  <div style={{display:"flex",gap:"3px"}}>
                                    <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>{setTraitForm({...TRAIT_EMPTY,...t});setEditingTrait(t);setShowTraitForm(true);}}>Mod.</button>
                                    <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                                      onClick={()=>{if(window.confirm("Supprimer ?")){ setTraitements(prev=>prev.filter(x=>x.id!==t.id)); fbDelete("traitements",t.id||""); if(t.produits?.length>0 && t.surface) deduireStock([], 0, t.produits, t.surface); }}}>Sup.</button>
                                  </div>
                                ) : <span style={{fontSize:"10px",color:"#9a8870",fontStyle:"italic"}}>{closed?"cloture":""}</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {traitsFiltres.length===0&&<tr><td colSpan={6} style={{padding:"20px",color:"#9a8870",textAlign:"center",fontStyle:"italic"}}>Aucun traitement pour cette campagne.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Documents PDF prestataires - uniquement onglet traitements */}
              {vigneTab==="traitements" && filterTraitAn && (
                <div style={{...s.card,marginTop:"14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#7a5200"}}>Calendriers prestataires</div>
                    {!closed && (
                      <label style={{...s.btnSm,cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}>
                        {uploadingPdf?"Chargement...":"+ Ajouter PDF"}
                        <input type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{
                          const file=e.target.files[0];
                          if(file){
                            const nom=window.prompt("Nom du document (ex: Calendrier Lorain 2026)", file.name.replace(".pdf",""));
                            if(nom!==null) uploadPdf(file, filterTraitAn, nom||file.name);
                          }
                          e.target.value="";
                        }}/>
                      </label>
                    )}
                  </div>
                  {pdfDocs.filter(p=>p.campagne===filterTraitAn).length===0&&(
                    <div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Aucun document pour cette campagne.</div>
                  )}
                  <div style={{display:"grid",gap:"8px"}}>
                    {pdfDocs.filter(p=>p.campagne===filterTraitAn).map(pdf=>(
                      <div key={pdf.id} style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 12px",background:"#fff8ee",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
                        <div style={{width:"32px",height:"32px",background:"#fdd0d0",borderRadius:"4px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:"10px",fontWeight:500,color:"#cc2222",fontFamily:"monospace"}}>PDF</span>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:500,color:"#1a1205",fontSize:"13px"}}>{pdf.nom}</div>
                          <div style={{fontSize:"10px",color:"#9a8870",marginTop:"1px"}}>{pdf.dateUpload?.slice(0,10)}</div>
                        </div>
                        <button style={s.btnSm} onClick={()=>openPdf(pdf)}>
                          Ouvrir
                        </button>
                        {!closed&&(
                          <div style={{display:"flex",gap:"4px"}}>
                            <button style={s.ghostSm} onClick={()=>{
                              const n=window.prompt("Nouveau nom :", pdf.nom);
                              if(n&&n.trim()){
                                const updated={...pdf,nom:n.trim()};
                                setPdfDocs(prev=>prev.map(p=>p.id===pdf.id?updated:p));
                                fbSave("pdfDocs",pdf.id,updated);
                              }
                            }}>Renommer</button>
                            <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>deletePdf(pdf)}>Sup.</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === STOCK PRODUITS === */}
              {vigneTab==="stockprod" && (
                <div>
                  {/* Actions */}
                  <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap",alignItems:"center"}}>
                    <button style={s.btnSm} onClick={()=>{setProduitForm(PRODUIT_EMPTY);setEditingStockProd(null);setShowStockProdForm(true);}}>+ Ajouter un produit</button>
                    <label style={{...s.btnSm,cursor:"pointer",background:"#fff8ee",color:"#7a5200",border:"0.5px solid #d4c4a0"}}>
                      {uploadingPdf?"Chargement...":"+ Ajouter une facture (PDF)"}
                      <input type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{
                        const file=e.target.files[0];
                        if(file){ const nom=window.prompt("Nom du document",file.name.replace(".pdf","")); if(nom!==null) uploadFacture(file,nom||file.name); }
                        e.target.value="";
                      }}/>
                    </label>
                    <div style={{marginLeft:"auto",fontSize:"11px",color:"#9a8870"}}>{stockProduits.length} produit(s)</div>
                  </div>
                  {stockProduits.length>0&&(
                    <div style={s.card}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                        <thead>
                          <tr style={{borderBottom:"1px solid #d4c4a0",background:"#fff8ee"}}>

                        {["Produit","N°AMM","Substance active","Teneur Cu g/kg|L","Stock actuel","Actions"].map(h=>(
                              <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stockProduits.map((p,i)=>{
                            const stock = parseFloat(p.stockActuel)||0;
                            const init  = parseFloat(p.stockInitial)||0;
                            const pct   = init>0 ? Math.round(stock/init*100) : 100;
                            return (
                              <tr key={p.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#fffbf3"}}>
                                <td style={{padding:"8px 10px"}}>
                                  <div style={{fontWeight:500,color:"#1a1205"}}>{p.nom}</div>
                                  {p.fournisseur&&<div style={{fontSize:"10px",color:"#9a8870"}}>{p.fournisseur}</div>}
                                </td>
                                <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:"11px",color:"#9a8870"}}>{p.nAmm||"-"}</td>
                                <td style={{padding:"8px 10px"}}>
                                  {(()=>{ const sa=p.substanceActive||p.matiereActive||"-";
                                    return <span style={{background:sa==="Cuivre"?"#fde8b8":sa==="Soufre"?"#e6f0fb":"#ede5d4",color:sa==="Cuivre"?"#7a5200":sa==="Soufre"?"#185FA5":"#5f5e5a",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",fontFamily:"monospace"}}>{sa}</span>;
                                  })()}
                                </td>
                                <td style={{padding:"8px 10px",fontFamily:"monospace",fontWeight:500}}>
                                  {parseFloat(p.teneurCuivre)>0
                                    ?<span style={{color:"#c47800"}}>{p.teneurCuivre}g/{p.unite} <span style={{fontSize:"10px",color:"#9a8870",fontWeight:400}}>({Math.round(parseFloat(p.teneurCuivre)/10)}%)</span></span>
                                    :<span style={{color:"#9a8870"}}>-</span>}
                                </td>
                                <td style={{padding:"8px 10px"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                                    <button style={{background:"#f0f0f0",border:"none",borderRadius:"3px",width:"20px",height:"20px",cursor:"pointer",fontWeight:700,color:"#555"}} onClick={()=>updateStockProduit(p.id,-1)}>-</button>
                                    <span style={{fontWeight:500,color:stock<0?"#cc2222":stock===0?"#c47800":pct<20?"#c47800":"#1a7a40",minWidth:"50px",textAlign:"center",fontFamily:"monospace"}}>
                                      {stock} {p.unite}
                                    </span>
                                    <button style={{background:"#f0f0f0",border:"none",borderRadius:"3px",width:"20px",height:"20px",cursor:"pointer",fontWeight:700,color:"#555"}} onClick={()=>updateStockProduit(p.id,1)}>+</button>
                                  </div>
                                  <div style={{height:"3px",background:"#e8dcc6",borderRadius:"2px",marginTop:"4px",width:"80px"}}>
                                    <div style={{height:"100%",borderRadius:"2px",background:pct<20?"#cc2222":pct<50?"#c47800":"#1a7a40",width:`${Math.min(100,pct)}%`}}/>
                                  </div>
                                </td>
                                <td style={{padding:"8px 10px"}}>
                                  <div style={{display:"flex",gap:"3px"}}>
                                    <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>{setProduitForm({...PRODUIT_EMPTY,...p});setEditingStockProd(p);setShowStockProdForm(true);}}>Mod.</button>
                                    <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                                      onClick={()=>{if(window.confirm("Supprimer ?")){ setStockProduits(prev=>prev.filter(x=>x.id!==p.id)); fbDelete("stockProduits",p.id); }}}>Sup.</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {pdfFactures.length>0&&(
                    <div style={{...s.card,marginBottom:"14px"}}>
                      <div style={{...s.lbl,marginBottom:"8px"}}>Factures / BL</div>
                      <div style={{display:"grid",gap:"6px"}}>
                        {pdfFactures.map(pdf=>(
                          <div key={pdf.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",background:"#fff8ee",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
                            <div style={{width:"28px",height:"28px",background:"#fdd0d0",borderRadius:"4px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              <span style={{fontSize:"9px",fontWeight:500,color:"#cc2222",fontFamily:"monospace"}}>PDF</span>
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:500,color:"#1a1205",fontSize:"12px"}}>{pdf.nom}</div>
                              <div style={{fontSize:"10px",color:"#9a8870"}}>{pdf.dateUpload?.slice(0,10)}</div>
                            </div>
                            <button style={s.btnSm} onClick={()=>openPdfFacture(pdf)}>Ouvrir</button>
                            <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>deleteFacture(pdf.id)}>Sup.</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Catalogue rapide */}
                  {stockProduits.length===0&&(
                    <div style={{...s.card,marginBottom:"14px"}}>
                      <div style={{...s.lbl,marginBottom:"10px"}}>Ajout rapide depuis le catalogue</div>
                      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                        {CATALOGUE_PRODUITS.filter(c=>!stockProduits.find(p=>p.nAmm===c.nAmm)).map((c,i)=>(
                          <button key={i} onClick={()=>addFromCatalogue(c)}
                            style={{background:"#fff8ee",border:"0.5px solid #d4c4a0",borderRadius:"5px",padding:"6px 12px",fontSize:"11px",cursor:"pointer",color:"#7a5200",fontFamily:"monospace",display:"flex",alignItems:"center",gap:"5px"}}>
                            <span style={{background:(c.substanceActive||c.matiereActive)==="Cuivre"?"#fde8b8":(c.substanceActive||c.matiereActive)==="Soufre"?"#e6f0fb":"#ede5d4",color:(c.substanceActive||c.matiereActive)==="Cuivre"?"#7a5200":"#185FA5",borderRadius:"3px",padding:"0 4px",fontSize:"9px"}}>{c.substanceActive||c.matiereActive}</span>
                            + {c.nom}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {vigneTab==="biodynamie" && (
                <div style={s.card}>
                  {biodyFiltres.length===0&&<div style={{color:"#9a8870",fontSize:"13px",padding:"12px 0",fontStyle:"italic"}}>Aucun passage biodynamique pour cette campagne.</div>}
                  {biodyFiltres.length>0&&(
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                      <thead>
                        <tr style={{borderBottom:"1px solid #d4c4a0",background:"#fff8ee"}}>
                          {["Date","Surface","Produit","Observations",""].map(h=>(
                            <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {biodyFiltres.sort((a,b)=>new Date(a.date)-new Date(b.date)).map((b,i)=>(
                          <tr key={b.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#fffbf3"}}>
                            <td style={{padding:"8px 10px",color:"#6a5838"}}>{b.date}</td>
                            <td style={{padding:"8px 10px",color:"#6a5838"}}>{b.surface}</td>
                            <td style={{padding:"8px 10px"}}>
                              <span style={{background:"#d4edc0",color:"#2d6a00",borderRadius:"3px",padding:"1px 8px",fontSize:"11px",fontFamily:"monospace",fontWeight:500}}>{b.produit}</span>
                            </td>
                            <td style={{padding:"8px 10px",color:"#7a6840",fontStyle:"italic",fontSize:"11px"}}>{b.observations}</td>
                            <td style={{padding:"8px 10px"}}>
                              {!closed&&(
                                <div style={{display:"flex",gap:"3px"}}>
                                  <button style={{...s.ghostSm,fontSize:"10px"}}
                                    onClick={()=>{setBiodyForm({campagne:b.campagne,date:b.date,surface:b.surface,produit:b.produit,observations:b.observations});setEditingBiody(b);setShowBiodyForm(true);}}>Mod.</button>
                                  <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                                    onClick={()=>{if(window.confirm("Supprimer ?")){ setBiodynamies(prev=>prev.filter(x=>x.id!==b.id)); fbDelete("biodynamies",b.id); if(b.produit && b.surface && b.dose) deduireStock([], 0, [{nom:b.produit,dose:b.dose}], b.surface); }}}>Sup.</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* === AMENDEMENTS === */}
              {vigneTab==="amendements" && (
                <div style={s.card}>
                  {amendFiltres.length===0&&<div style={{color:"#9a8870",fontSize:"13px",padding:"12px 0",fontStyle:"italic"}}>Aucun amendement pour cette campagne.</div>}
                  {amendFiltres.length>0&&(
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                        <thead>
                          <tr style={{borderBottom:"1px solid #d4c4a0",background:"#fff8ee"}}>
                            {["Parcelle","Surface","Produit","Quantite","N total","N/ha","Observations",""].map(h=>(
                              <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {amendFiltres.sort((a,b)=>a.parcelle.localeCompare(b.parcelle)).map((a,i)=>(
                            <tr key={a.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#fffbf3"}}>
                              <td style={{padding:"8px 10px",fontWeight:500,color:"#1a1205"}}>{a.parcelle}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838",fontFamily:"monospace"}}>{a.surface} ha</td>
                              <td style={{padding:"8px 10px"}}>
                                <span style={{background:"#fde8b8",color:"#7a5200",borderRadius:"3px",padding:"1px 7px",fontSize:"11px",fontFamily:"monospace"}}>{a.produit}</span>
                              </td>
                              <td style={{padding:"8px 10px",color:"#6a5838",fontFamily:"monospace"}}>{a.quantite}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838",fontFamily:"monospace"}}>{a.nTotal}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838",fontFamily:"monospace"}}>{a.nParHa}</td>
                              <td style={{padding:"8px 10px",color:"#7a6840",fontStyle:"italic",fontSize:"11px"}}>{a.observations}</td>
                              <td style={{padding:"8px 10px"}}>
                                {!closed&&(
                                  <div style={{display:"flex",gap:"3px"}}>
                                    <button style={{...s.ghostSm,fontSize:"10px"}}
                                      onClick={()=>{setAmendForm({campagne:a.campagne,parcelle:a.parcelle,surface:a.surface,produit:a.produit,quantite:a.quantite,nTotal:a.nTotal,nParHa:a.nParHa,observations:a.observations});setEditingAmend(a);setShowAmendForm(true);}}>Mod.</button>
                                    <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                                      onClick={()=>{if(window.confirm("Supprimer ?")){ setAmendements(prev=>prev.filter(x=>x.id!==a.id)); fbDelete("amendements",a.id); if(a.produit && a.quantite){ const sp=findStockProd(a.produit); if(sp){ const q=parseFloat(a.quantite.replace(/[^0-9.]/g,""))||0; const updated={...sp,stockActuel:String(Math.round(((parseFloat(sp.stockActuel)||0)+q)*100)/100)}; setStockProduits(prev=>prev.map(x=>x.id===sp.id?updated:x)); fbSave("stockProduits",sp.id,updated); } } }}}>Sup.</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* -- VENDANGES -- */}
        {false&&view==="vendanges" && (
          <div style={{display:"grid",gridTemplateColumns:"clamp(200px,1fr,1fr) clamp(200px,260px,30vw)",gap:"16px",alignItems:"start"}}>

            {/* Colonne principale */}
            <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <div style={{fontSize:"13px",color:"#7a6840"}}>{vendanges.length} entree(s) de vendange</div>
                <button style={s.btn} onClick={()=>{setVendangeForm(VENDANGE_EMPTY);setEditingVendange(null);setShowVendangeForm(true);}}>
                  + Nouvelle entree
                </button>
              </div>

              {/* Filtre par campagne */}
              {[...new Set(vendanges.map(v=>v.annee))].length>1&&(
                <div style={{display:"flex",gap:"6px",marginBottom:"16px",flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:"10px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#9a8870",fontFamily:"monospace",marginRight:"4px"}}>Campagne :</span>
                  <button onClick={()=>setFilterVendangeAn("")}
                    style={{padding:"4px 12px",borderRadius:"4px",border:`0.5px solid ${!filterVendangeAn?"#b8860b":"#d4c4a0"}`,background:!filterVendangeAn?"#f5e8cc":"transparent",color:!filterVendangeAn?"#7a5200":"#9a8870",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>
                    Toutes
                  </button>
                  {[...new Set(vendanges.map(v=>v.annee))].sort().reverse().map(an=>(
                    <button key={an} onClick={()=>setFilterVendangeAn(an)}
                      style={{padding:"4px 12px",borderRadius:"4px",border:`0.5px solid ${filterVendangeAn===an?"#2d6a00":"#d4c4a0"}`,background:filterVendangeAn===an?"#d4edc0":"transparent",color:filterVendangeAn===an?"#2d6a00":"#9a8870",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>
                      {an} ({vendanges.filter(v=>v.annee===an).length})
                    </button>
                  ))}
                </div>
              )}

              {vendanges.length===0&&(
                <div style={{...s.card,textAlign:"center",padding:"40px",color:"#9a8870"}}>
                  <div style={{fontSize:"13px",marginBottom:"16px"}}>Aucune vendange enregistree. Commencez par creer vos parcelles puis saisissez les apports.</div>
                  <button style={s.btn} onClick={()=>{setVendangeForm(VENDANGE_EMPTY);setEditingVendange(null);setShowVendangeForm(true);}}>+ Premiere entree</button>
                </div>
              )}

              {/* Grouper par annee */}
              {[...new Set(vendanges.map(v=>v.annee))].sort().reverse().filter(an=>!filterVendangeAn||an===filterVendangeAn).map(annee=>{
                const vAnnee = vendanges.filter(v=>v.annee===annee);
                const volTotal = vAnnee.reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                return (
                  <div key={annee} style={{marginBottom:"20px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"16px",fontWeight:500,color:"#7a5200"}}>Campagne {annee}</div>
                      <div style={{flex:1,height:"0.5px",background:"#d4c4a0"}}/>
                      <div style={{display:"flex",gap:"12px",fontSize:"11px",color:"#9a8870",fontFamily:"monospace"}}>
                        <span>{vAnnee.length} apport(s)</span>
                        <span style={{color:"#2d6a00",fontWeight:500}}>{volTotal.toLocaleString()} kg</span>
                        {vAnnee.filter(v=>v.numeroMarc).length>0&&(
                          <span>{[...new Set(vAnnee.map(v=>v.numeroMarc).filter(Boolean))].sort().length} Marc(s)</span>
                        )}
                      </div>
                    </div>
                    {/* Recap rendement campagne */}
                    {(()=>{
                      const kgRecoltes = vAnnee.reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                      const kgMaison = vAnnee.filter(v=>!v.destinationMarc||v.destinationMarc==="maison").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                        + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0)-(parseFloat(v.kgVendusNegoce)||0),0);
                      const kgNegoce = vAnnee.filter(v=>v.destinationMarc==="negoce_total").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                        + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.kgVendusNegoce)||0),0);
                      const rendAnnee = rendementsAnnuels.find(r=>r.annee===annee);
                      const surfTotale = parcelles.reduce((s,p)=>s+(parseFloat(p.surface)||0),0);
                      const kgHaReel = surfTotale>0 ? Math.round(kgRecoltes/surfTotale) : 0;
                      const kgHaAutorise = rendAnnee ? parseFloat(rendAnnee.rendementAutorise)||0 : 0;
                      const enRI = kgHaAutorise>0 && kgHaReel>kgHaAutorise;
                      return (
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"8px",marginBottom:"12px"}}>
                          <div style={{...s.card,padding:"10px"}}>
                            <div style={s.lbl}>Total recolte</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:"#1a1205"}}>{kgRecoltes.toLocaleString()} kg</div>
                          </div>
                          <div style={{...s.card,padding:"10px"}}>
                            <div style={s.lbl}>Conserve maison</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:"#2d6a00"}}>{Math.round(kgMaison).toLocaleString()} kg</div>
                          </div>
                          <div style={{...s.card,padding:"10px"}}>
                            <div style={s.lbl}>Vendu negoce</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:"#c47800"}}>{Math.round(kgNegoce).toLocaleString()} kg</div>
                          </div>
                          {surfTotale>0&&<div style={{...s.card,padding:"10px",background:enRI?"#fde8e8":"transparent"}}>
                            <div style={s.lbl}>kg/ha {kgHaAutorise>0?"vs "+kgHaAutorise+" autorise":""}</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:enRI?"#cc2222":"#1a1205"}}>{kgHaReel.toLocaleString()} kg/ha</div>
                            {enRI&&<div style={{fontSize:"10px",color:"#cc2222",fontWeight:500}}>Section RI +{(kgHaReel-kgHaAutorise).toLocaleString()} kg/ha</div>}
                          </div>}
                        </div>
                      );
                    })()}

                    {vAnnee.map(v=>{
                      const parc = parcelles.find(p=>p.id===v.parcelleId);
                      return (
                        <div key={v.id} style={{...s.card,marginBottom:"10px",borderLeft:`3px solid ${v.destinationMarc&&v.destinationMarc!=="maison"?"#c47800":"#2d6a00"}`}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"12px",marginBottom:"8px"}}>
                            <div>
                              {v.cuveeCreee&&<div style={{fontWeight:600,color:"#7a5200",fontSize:"14px",marginBottom:"2px"}}>{v.cuveeCreee}</div>}
                              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"2px"}}>
                                <div style={{fontWeight:500,color:"#1a1205",fontSize:"13px"}}>{parc?.nom||"Parcelle inconnue"}</div>
                                {v.numeroMarc&&(
                                  <span style={{background:"#f5e8cc",color:"#7a5200",border:"0.5px solid #e0c050",borderRadius:"4px",padding:"1px 8px",fontSize:"11px",fontWeight:500,fontFamily:"monospace"}}>Marc {v.numeroMarc}</span>
                                )}
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"2px"}}>
                                {parc?.certification&&(
                                  <span style={{fontSize:"10px",padding:"1px 5px",borderRadius:"3px",fontFamily:"monospace",fontWeight:500,
                                    background:parc.certification==="BIO"?"#d4edc0":parc.certification==="NON BIO"?"#ede5d4":"#fde8b8",
                                    color:parc.certification==="BIO"?"#2d6a00":parc.certification==="NON BIO"?"#5f5e5a":"#8b5e0a"}}>
                                    {parc.certification}
                                  </span>
                                )}
                                <span style={{fontSize:"11px",color:"#9a8870"}}>{parc?.cepage||""}{parc?.commune?` - ${parc.commune}`:""}</span>
                              </div>
                              <div style={{fontSize:"11px",color:"#7a6840",marginTop:"3px"}}>{fmt(v.date)}{v.heure?" - "+v.heure:""} - {v.operateur}</div>
                            </div>
                            <div>
                              <div style={s.lbl}>Volume recolte</div>
                              {v.poidsMarcKg&&<div style={{fontSize:"18px",fontWeight:500,color:"#2d6a00"}}>{parseInt(v.poidsMarcKg).toLocaleString()} kg</div>}
                              {v.volumeHL&&<div style={{fontSize:"13px",color:"#2d6a00"}}>{v.volumeHL} HL</div>}
                              {v.destinationMarc&&v.destinationMarc!=="maison"&&<div style={{fontSize:"11px",color:"#c47800",marginTop:"3px"}}>Negoce{v.kgVendusNegoce?" - "+parseInt(v.kgVendusNegoce).toLocaleString()+" kg":""}{v.numeroDAE?" - DAE: "+v.numeroDAE:""}</div>}
                            </div>
                            <div>
                              <div style={s.lbl}>Cuves destination</div>
                              {v.cuveTailleId&&<div style={{fontSize:"12px",color:"#6a5838"}}>Taille : <strong>{cuvesCuverie.find(c=>c.id===v.cuveTailleId)?.nom||v.cuveTailleId}</strong>{v.volumeTaille&&<span style={{color:"#9a8870"}}> - {v.volumeTaille} HL</span>}</div>}
                              {v.cuveCuveeId&&<div style={{fontSize:"12px",color:"#6a5838"}}>Cuvee A : <strong>{cuvesCuverie.find(c=>c.id===v.cuveCuveeId)?.nom||v.cuveCuveeId}</strong>{v.volumeCuvee&&<span style={{color:"#9a8870"}}> - {v.volumeCuvee} HL</span>}</div>}
                              {v.cuveCuveeBId&&<div style={{fontSize:"12px",color:"#6a5838"}}>Cuvee B : <strong>{cuvesCuverie.find(c=>c.id===v.cuveCuveeBId)?.nom||v.cuveCuveeBId}</strong>{v.volumeCuveeB&&<span style={{color:"#9a8870"}}> - {v.volumeCuveeB} HL</span>}</div>}
                              {!v.cuveTailleId&&!v.cuveCuveeId&&<div style={{fontSize:"11px",color:"#9a8870",fontStyle:"italic"}}>Non renseigne</div>}
                            </div>
                            <div>
                              <div style={s.lbl}>Analyses</div>
                              {v.degreePotentiel&&<div style={{fontSize:"12px",color:"#6a5838"}}>Degre : <strong>{v.degreePotentiel}%</strong></div>}
                              {v.acidite&&<div style={{fontSize:"12px",color:"#6a5838"}}>Acidite : <strong>{v.acidite} g/L</strong></div>}
                              {v.so2&&<div style={{fontSize:"12px",color:"#6a5838"}}>SO2 : <strong>{v.so2} mg/L</strong></div>}
                              {v.ph&&<div style={{fontSize:"12px",color:"#6a5838"}}>pH : <strong>{v.ph}</strong></div>}
                            </div>
                            <div>
                              <div style={s.lbl}>Cuve reception</div>
                              {(v.cuveReception||v.nouvelleCuveNom)?(
                                <div style={{display:"inline-flex",alignItems:"center",background:"#eeedfe",color:"#533AB7",border:"0.5px solid #534ab744",borderRadius:"4px",padding:"2px 10px",fontFamily:"monospace",fontSize:"12px",fontWeight:500}}>
                                  {v.cuveReception||v.nouvelleCuveNom}
                                </div>
                              ):<div style={{fontSize:"11px",color:"#9a8870",fontStyle:"italic"}}>Non definie</div>}
                            </div>
                          </div>
                          {v.produitsAjoutes?.length>0&&(
                            <div style={{borderTop:"0.5px solid #ede5d4",paddingTop:"8px",marginTop:"4px"}}>
                              <div style={{...s.lbl,marginBottom:"5px"}}>Produits ajoutes</div>
                              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                                {v.produitsAjoutes.map(p=>(
                                  <div key={p.id} style={{background:"#fff8ee",border:"0.5px solid #d4c4a0",borderRadius:"4px",padding:"3px 10px",fontSize:"11px",color:"#7a5200"}}>
                                    <strong>{p.nom}</strong>{p.dose?` - ${p.dose}`:""}{p.lot?` (Lot: ${p.lot})`:""}{p.date?` - ${p.date}`:""}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {v.observations&&<div style={{borderTop:"0.5px solid #ede5d4",paddingTop:"6px",marginTop:"6px",fontSize:"12px",color:"#6a5838",fontStyle:"italic"}}>{v.observations}</div>}
                          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"8px"}}>
                            <button style={{...s.ghostSm}} onClick={()=>openEditVendange(v)}>Modifier</button>
                            <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4"}}
                              onClick={()=>{if(window.confirm("Supprimer cet apport ?")) { setVendanges(prev=>prev.filter(x=>x.id!==v.id)); deleteVendangeFb(v.id); }}}>
                              Supprimer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Colonne droite */}
            <div style={{display:"grid",gap:"16px"}}>

            {/* Tableau de bord rendement */}
            <div style={s.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                <span style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#7a5200"}}>Rendement</span>
                <button style={s.btnSm} onClick={()=>setShowRendementForm(true)}>+ Saisir</button>
              </div>
              {[...new Set(vendanges.map(v=>v.annee))].sort().reverse().map(annee=>{
                const vAnnee = vendanges.filter(v=>v.annee===annee);
                const kgRecoltes = vAnnee.reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                const kgMaison = vAnnee.filter(v=>!v.destinationMarc||v.destinationMarc==="maison").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                  + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0)-(parseFloat(v.kgVendusNegoce)||0),0);
                const kgNegoce = vAnnee.filter(v=>v.destinationMarc==="negoce_total").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                  + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.kgVendusNegoce)||0),0);
                const rendAnnee = rendementsAnnuels.find(r=>r.annee===annee);
                const surfTotale = parcelles.reduce((s,p)=>s+(parseFloat(p.surface)||0),0);
                const kgHaReel = surfTotale>0 ? Math.round(kgRecoltes/surfTotale) : 0;
                const kgHaAutorise = rendAnnee ? parseFloat(rendAnnee.rendementAutorise)||0 : 0;
                const enRI = kgHaAutorise>0 && kgHaReel>kgHaAutorise;
                return (
                  <div key={annee} style={{borderBottom:"0.5px solid #ede5d4",paddingBottom:"10px",marginBottom:"10px"}}>
                    <div style={{fontWeight:500,color:"#7a5200",fontSize:"13px",marginBottom:"6px"}}>Campagne {annee}</div>
                    <div style={{display:"grid",gap:"4px",fontSize:"12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#9a8870"}}>Total recolte</span>
                        <span style={{fontWeight:500,color:"#1a1205"}}>{kgRecoltes.toLocaleString()} kg</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#9a8870"}}>Conserve maison</span>
                        <span style={{fontWeight:500,color:"#2d6a00"}}>{Math.round(kgMaison).toLocaleString()} kg</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#9a8870"}}>Vendu negoce</span>
                        <span style={{fontWeight:500,color:"#c47800"}}>{Math.round(kgNegoce).toLocaleString()} kg</span>
                      </div>
                      {surfTotale>0&&<div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#9a8870"}}>kg/ha reel</span>
                        <span style={{fontWeight:500,color:enRI?"#cc2222":"#1a1205"}}>{kgHaReel.toLocaleString()} kg/ha</span>
                      </div>}
                      {kgHaAutorise>0&&<div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#9a8870"}}>Rendement autorise</span>
                        <span style={{fontWeight:500,color:"#6a5838"}}>{kgHaAutorise.toLocaleString()} kg/ha</span>
                      </div>}
                      {enRI&&<div style={{marginTop:"6px",padding:"6px 10px",background:"#fde8e8",borderRadius:"4px",border:"1px solid #f0b4b4"}}>
                        <div style={{fontSize:"11px",fontWeight:500,color:"#cc2222"}}>Depassement - Section RI</div>
                        <div style={{fontSize:"11px",color:"#cc2222"}}>+{(kgHaReel-kgHaAutorise).toLocaleString()} kg/ha au-dela du rendement</div>
                      </div>}
                    </div>
                  </div>
                );
              })}
              {rendementsAnnuels.length===0&&vendanges.length===0&&<div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Aucune donnee.</div>}
            </div>

            {/* Colonne droite - Parcelles */}
            <div style={s.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                <span style={{...s.lbl,marginBottom:0}}>Parcelles</span>
                <button style={s.btnSm} onClick={()=>{setParcelleForm({nom:"",cepage:"",surface:"",commune:""});setEditingParcelle(null);setShowParcelleForm(true);}}>+ Ajouter</button>
              </div>
              {parcelles.length===0&&<div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Aucune parcelle. Ajoutez-en une pour commencer.</div>}
              {parcelles.map(p=>(
                <div key={p.id} style={{borderBottom:"0.5px solid #ede5d4",padding:"8px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"2px"}}>
                        <div style={{fontSize:"13px",fontWeight:500,color:"#1a1205"}}>{p.nom}</div>
                        {p.certification&&(
                          <span style={{fontSize:"10px",padding:"1px 6px",borderRadius:"3px",fontFamily:"monospace",fontWeight:500,
                            background:p.certification==="BIO"?"#d4edc0":p.certification==="NON BIO"?"#ede5d4":p.certification==="C1"?"#fde8b8":p.certification==="C2"?"#fce8a8":"#fad4a0",
                            color:p.certification==="BIO"?"#2d6a00":p.certification==="NON BIO"?"#5f5e5a":p.certification==="C1"?"#8b5e0a":p.certification==="C2"?"#7a4800":"#6b3a00"}}>
                            {p.certification}
                          </span>
                        )}
                      </div>
                      {p.cepage&&<div style={{fontSize:"11px",color:"#9a8870"}}>{p.cepage}</div>}
                      <div style={{fontSize:"11px",color:"#9a8870"}}>{p.commune||""}{p.surface?` - ${p.surface} ha`:""}</div>
                      {p.observations&&<div style={{fontSize:"10px",color:"#7a6840",fontStyle:"italic",marginTop:"2px"}}>{p.observations}</div>}
                      <div style={{fontSize:"10px",color:"#a8987e",marginTop:"2px"}}>{vendanges.filter(v=>v.parcelleId===p.id).length} apport(s)</div>
                    </div>
                    <div style={{display:"flex",gap:"4px"}}>
                      <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>{setParcelleForm({nom:p.nom,cepage:p.cepage||"",certification:p.certification||"BIO",surface:p.surface||"",commune:p.commune||"",observations:p.observations||""});setEditingParcelle(p);setShowParcelleForm(true);}}>Mod.</button>
                      <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                        onClick={()=>{if(window.confirm("Supprimer cette parcelle ?")) { setParcelles(prev=>prev.filter(x=>x.id!==p.id)); deleteParcelleFb(p.id); }}}>Sup.</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {/* -- STOCK -- */}
        {false&&view==="stock" && (()=>{
          const now = new Date();
          const lots = [...stockBouteilles].sort((a,b)=>new Date(a.dateTirage)-new Date(b.dateTirage)).map(l=>({...l,
            mois: l.dateTirage ? Math.floor((now-new Date(l.dateTirage))/(1000*60*60*24*30.5)) : 0
          }));
          const lotsFiltre = lots.filter(l=>{
            if(stockTab==="champagne" && ["coteaux_blanc","coteaux_rouge","ratafia"].includes(l.typeProduit)) return false;
            if(stockTab!=="champagne" && (l.typeProduit||"champagne")!==stockTab) return false;
            if(filterStockCuvee && !l.cuvee.toLowerCase().includes(filterStockCuvee.toLowerCase())) return false;
            if(filterStockLieu && l.lieu!==filterStockLieu) return false;
            if(filterStockStatut && l.statut!==filterStockStatut) return false;
            if(filterStock15==="moins15" && l.mois>=15) return false;
            if(filterStock15==="plus15" && l.mois<15) return false;
            return true;
          });
          // Fusion pour Habille CRD et Habille Export uniquement
          const fusionMap = {};
          lotsFiltre.forEach(l=>{
            const shouldFuse = l.statut==="Habille CRD" || l.statut==="Habille Export";
            const k = shouldFuse ? l.cuvee+"|"+l.lot+"|"+l.statut : l.id;
            if(!fusionMap[k]) fusionMap[k] = {...l, _ids:[l.id], qteActuelle:parseInt(l.qteActuelle)||0};
            else { fusionMap[k].qteActuelle += parseInt(l.qteActuelle)||0; fusionMap[k]._ids.push(l.id); }
          });
          const lotsFusionnes = Object.values(fusionMap);

          const total = lots.reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
          const moins15 = lots.filter(l=>l.mois<15).reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
          const plus15 = lots.filter(l=>l.mois>=15).reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
          const alertes = lots.filter(l=>l.mois>=14&&!l.passage15).length;
          return (
            <div>
              {/* 1. KPIs */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"12px",marginBottom:"20px"}}>
                {[
                  {lbl:"Total en stock",val:total+" btl",sub:"tous formats",col:"#b8860b"},
                  {lbl:"< 15 mois",val:moins15+" btl",sub:"non commercialisables",col:"#cc2222"},
                  {lbl:"> 15 mois",val:plus15+" btl",sub:"commercialisables",col:"#1a7a40"},
                  {lbl:"Alertes 15 mois",val:alertes+" lot(s)",sub:"passent le cap ce mois",col:"#c47800"},
                ].map((k,i)=>(
                  <div key={i} style={s.card}>
                    <div style={s.lbl}>{k.lbl}</div>
                    <div style={{fontSize:"24px",fontWeight:500,color:k.col}}>{k.val}</div>
                    <div style={{fontSize:"11px",color:"#9a8870",marginTop:"3px"}}>{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Onglets type produit */}
              <div style={{display:"flex",gap:"4px",marginBottom:"16px",borderBottom:"1px solid #d4c4a0",paddingBottom:"0"}}>
                {[["champagne","Champagne"],["coteaux_blanc","Coteaux Blanc"],["coteaux_rouge","Coteaux Rouge"],["ratafia","Ratafia"]].map(([key,lbl])=>(
                  <button key={key} onClick={()=>{setStockTab(key);setFilterStockStatut("");}} style={{padding:"8px 14px",border:"none",borderBottom:stockTab===key?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:stockTab===key?"#7a5200":"#9a8870",fontWeight:stockTab===key?500:400,fontSize:"12px",cursor:"pointer",fontFamily:"Georgia,serif"}}>{lbl}</button>
                ))}
              </div>

              {/* Alertes */}
              {(()=>{
                const calcStock = (type) => coiffesStock.filter(c=>c.type===type).reduce((s,c)=>s+(c.operation==="achat"?parseInt(c.qte)||0:-(parseInt(c.qte)||0)),0);
                const alerteCoiffeCRD = calcStock("CRD") < 500;
                const alerteCoiffeMag = calcStock("CRD Magnum") < 20 || calcStock("Export Magnum") < 20;
                const alerteCoiffeExp = calcStock("Export") < 500;
                const alerte15 = lots.filter(l=>l.mois>=14&&!l.passage15);
                const hasAlertes = alerteCoiffeCRD || alerteCoiffeExp || alerteCoiffeMag || alerte15.length>0;
                if(!hasAlertes) return null;
                return (
                  <div style={{marginBottom:"16px",display:"grid",gap:"8px"}}>
                    {alerte15.length>0&&(
                      <div style={{padding:"12px 16px",background:"#fff3cd",border:"1px solid #e8c888",borderRadius:"8px",display:"flex",alignItems:"center",gap:"10px"}}>
                        <span style={{fontSize:"18px"}}>!</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:500,color:"#c47800",fontSize:"13px"}}>Lots approchant les 15 mois</div>
                          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginTop:"4px"}}>
                            {alerte15.map(l=>(
                              <span key={l.id} style={{background:"#fff",color:"#c47800",border:"1px solid #e8c888",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>{l.cuvee} {l.millesime} - {l.format} - {l.mois}m</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {(alerteCoiffeCRD||alerteCoiffeExp||alerteCoiffeMag)&&(
                      <div style={{padding:"12px 16px",background:"#fde8e8",border:"1px solid #f0b4b4",borderRadius:"8px",display:"flex",alignItems:"center",gap:"10px"}}>
                        <span style={{fontSize:"18px"}}>!</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:500,color:"#cc2222",fontSize:"13px"}}>Stock coiffes bas</div>
                          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginTop:"4px"}}>
                            {alerteCoiffeCRD&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>CRD 75cl : {calcStock("CRD")} coiffes (seuil 500)</span>}
                            {alerteCoiffeExp&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>Export 75cl : {calcStock("Export")} coiffes (seuil 500)</span>}
                            {calcStock("CRD Magnum")<20&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>CRD Magnum : {calcStock("CRD Magnum")} coiffes (seuil 20)</span>}
                            {calcStock("Export Magnum")<20&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>Export Magnum : {calcStock("Export Magnum")} coiffes (seuil 20)</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 2. Filtres */}
              <div style={{display:"flex",gap:"8px",marginBottom:"16px",flexWrap:"wrap",alignItems:"center"}}>
                <input style={{...s.inp,maxWidth:"180px"}} placeholder="Recherche cuvee..." value={filterStockCuvee} onChange={e=>setFilterStockCuvee(e.target.value)}/>
                <select style={{...s.sel,maxWidth:"180px"}} value={filterStockLieu} onChange={e=>setFilterStockLieu(e.target.value)}>
                  <option value="">Tous les lieux</option>
                  {LIEUX_STOCK.map(l=><option key={l} value={l}>{l}</option>)}
                </select>
                <select style={{...s.sel,maxWidth:"220px"}} value={filterStockStatut} onChange={e=>setFilterStockStatut(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  {[...STATUTS_BOUTEILLES,"Passage 15 mois (commercialisable)"].map(st=><option key={st} value={st}>{st}</option>)}
                </select>
                <select style={{...s.sel,maxWidth:"160px"}} value={filterStock15} onChange={e=>setFilterStock15(e.target.value)}>
                  <option value="">Tous ages</option>
                  <option value="moins15">Moins de 15 mois</option>
                  <option value="plus15">Plus de 15 mois</option>
                </select>
                {(filterStockLieu||filterStockStatut||filterStock15||filterStockCuvee)&&(
                  <button style={s.ghostSm} onClick={()=>{setFilterStockLieu("");setFilterStockStatut("");setFilterStock15("");setFilterStockCuvee("");}}>Reinitialiser</button>
                )}
                <span style={{marginLeft:"auto",fontSize:"11px",color:"#9a8870"}}>{lotsFusionnes.length} ligne(s) ({lotsFiltre.length} lots)</span>
              </div>

              {/* 3. Tableau */}
              {lotsFiltre.length===0&&(
                <div style={{...s.card,textAlign:"center",padding:"40px",color:"#9a8870"}}>
                  <div style={{fontSize:"32px",marginBottom:"12px"}}>Aucun lot en stock</div>
                  <div style={{fontSize:"13px"}}>Creez un tirage pour alimenter automatiquement le stock.</div>
                </div>
              )}
              {lotsFiltre.length>0&&(
                <div style={{...s.card,padding:0,overflow:"hidden",marginBottom:"24px"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                    <thead>
                      <tr style={{background:"#fff8ee",borderBottom:"1px solid #d4c4a0"}}>
                        {["Cuvee","Millesime","N° Lot","Format","Date tirage","Age","Statut","Lieu","Qte actuelle","Actions"].map(h=>(
                          <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lotsFusionnes.map((l,i)=>(
                        <tr key={l.id} style={{borderBottom:"1px solid #ede5d4",background:l.mois>=14&&!l.passage15?"#fff8e8":i%2===0?"#ffffff":"#fffbf5"}}>
                          <td style={{padding:"10px 12px",fontWeight:500,color:"#1a1205"}}>{l.cuvee}{l.isBio&&<span style={{marginLeft:"6px",fontSize:"10px",background:"#2d6a00",color:"#fff",borderRadius:"3px",padding:"1px 5px",fontWeight:600}}>🌿</span>}</td>
                          <td style={{padding:"10px 12px",color:"#6a5838",fontFamily:"monospace"}}>{l.millesime||"-"}</td>
                          <td style={{padding:"10px 12px",color:"#9a8870",fontFamily:"monospace",fontSize:"11px"}}>{l.lot||"-"}</td>
                          <td style={{padding:"10px 12px",color:"#6a5838"}}>{l.format}</td>
                          <td style={{padding:"10px 12px",color:"#9a8870"}}>{fmt(l.dateTirage)}</td>
                          <td style={{padding:"10px 12px"}}>
                            <span style={{background:l.passage15?"#d4f0dd":l.mois>=14?"#fff3cd":"#fde8e8",color:l.passage15?"#1a7a40":l.mois>=14?"#c47800":"#cc2222",borderRadius:"12px",padding:"2px 8px",fontSize:"11px",fontWeight:500}}>{l.mois}m</span>
                            {l.mois>=14&&!l.passage15&&<span style={{marginLeft:"4px",fontSize:"10px",color:"#c47800",fontWeight:"bold"}}>!</span>}
                          </td>
                          <td style={{padding:"10px 12px"}}>
                            <span style={{background:(STATUT_COLORS[l.statut]||{bg:"#e8f0e8"}).bg,color:(STATUT_COLORS[l.statut]||{color:"#2d6a00"}).color,borderRadius:"4px",padding:"2px 8px",fontSize:"10px"}}>{l.statut}</span>
                          </td>
                          <td style={{padding:"10px 12px"}}><span style={{background:(LIEU_COLORS[l.lieu]||{bg:"#ede5d4"}).bg,color:(LIEU_COLORS[l.lieu]||{color:"#6a5838"}).color,borderRadius:"4px",padding:"2px 8px",fontSize:"10px"}}>{l.lieu}</span></td>
                          <td style={{padding:"10px 12px",fontWeight:600,color:"#b8860b",fontFamily:"monospace",fontSize:"14px"}}>{l.qteActuelle}</td>
                          <td style={{padding:"10px 12px"}}>
                            <div style={{display:"flex",gap:"4px"}}>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#185FA5",borderColor:"#b4d0f0"}}
                                onClick={()=>setLotAction({lot:l,action:"mouvement"})}>Mouvement</button>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#1a7a40",borderColor:"#b4d0b4"}}
                                onClick={()=>{setSortieForm({lotId:l._ids?l._ids[0]:l.id,_ids:l._ids||[l.id],qteMax:parseInt(l.qteActuelle)||0,cuvee:l.cuvee,millesime:l.millesime,format:l.format,date:new Date().toISOString().slice(0,10),qte:"",notes:""});setShowSortieForm(true);}}>Sortie</button>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#7a5200",borderColor:"#d4c4a0"}}
                                onClick={()=>setLotAction({lot:l,action:"diviser"})}>Diviser</button>
                              {l.mois>=14&&!l.passage15&&(
                                <button style={{...s.ghostSm,fontSize:"10px",color:"#1a7a40",borderColor:"#b4d4b4",fontWeight:500}}
                                  onClick={()=>{if(window.confirm("Confirmer le passage en +15 mois pour ce lot ?")){const upd={...l,passage15:true};setStockBouteilles(prev=>prev.map(x=>x.id===l.id?upd:x));fbSave("stockBouteilles",l.id,upd);}}}> Confirmer +15m</button>
                              )}
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                                onClick={()=>{if((l.qteActuelle||0)>0)return alert("Impossible de supprimer un lot avec du stock restant ("+l.qteActuelle+" btl). Faites une sortie pour vider le stock.");if(window.confirm("Supprimer ce lot ?")){setStockBouteilles(prev=>prev.filter(x=>x.id!==l.id));fbDelete("stockBouteilles",l.id);}}}>Sup.</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Encart coiffes */}
              {(()=>{
                const calcStock = (type) => coiffesStock.filter(c=>c.type===type).reduce((s,c)=>s+(c.operation==="achat"?parseInt(c.qte)||0:-(parseInt(c.qte)||0)),0);
                const stockCRD = calcStock("CRD");
                const stockCRDMag = calcStock("CRD Magnum");
                const stockCRDJer = calcStock("CRD Jeroboam");
                const stockExport = calcStock("Export");
                const stockExpMag = calcStock("Export Magnum");
                const stockExpJer = calcStock("Export Jeroboam");
                return (
                  <div style={{...s.card,padding:"16px 20px",marginTop:"16px",marginBottom:"16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#7a5200"}}>Stock coiffes</div>
                      <button style={s.btnSm} onClick={()=>setShowCoiffesForm(true)}>+ Achat coiffes</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
                      {[["CRD 75cl",stockCRD,"#6a2d8a"],["CRD Mag",stockCRDMag,"#6a2d8a"],["CRD Jer",stockCRDJer,"#6a2d8a"],
                        ["Export 75cl",stockExport,"#8a2d6a"],["Export Mag",stockExpMag,"#8a2d6a"],["Export Jer",stockExpJer,"#8a2d6a"]
                      ].filter(([,q])=>q>0||true).map(([lbl,q,col])=>(
                        <div key={lbl} style={{padding:"8px",background:q<50?"#fde8e8":"#f0fff4",borderRadius:"6px",textAlign:"center"}}>
                          <div style={{fontSize:"10px",color:col,fontWeight:500,marginBottom:"2px"}}>{lbl}</div>
                          <div style={{fontSize:"18px",fontWeight:600,color:q<50?"#cc2222":"#1a7a40"}}>{q}</div>
                        </div>
                      ))}
                    </div>
                    {coiffesStock.length>0&&(
                      <div style={{marginTop:"12px",borderTop:"0.5px solid #ede5d4",paddingTop:"10px"}}>
                        <div style={{fontSize:"11px",color:"#9a8870",marginBottom:"6px",cursor:"pointer",display:"flex",justifyContent:"space-between"}} onClick={()=>setShowHistCoiffes(p=>!p)}>Dernieres operations {showHistCoiffes?"▲":"▼"}</div>
                        {showHistCoiffes&&[...coiffesStock].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(c=>(
                          <div key={c.id} style={{display:"flex",justifyContent:"space-between",fontSize:"11px",padding:"3px 0",borderBottom:"0.5px solid #f5f0e8"}}>
                            <span style={{color:"#9a8870"}}>{fmt(c.date)}</span>
                            <span style={{color:c.type==="CRD"?"#6a2d8a":"#8a2d6a",fontWeight:500}}>{c.type}</span>
                            <span style={{color:c.operation==="achat"?"#1a7a40":"#cc2222"}}>{c.operation==="achat"?"+":"-"}{c.qte}</span>
                            <button style={{...s.ghostSm,fontSize:"9px",color:"#cc2222",borderColor:"#f0b4b4",padding:"1px 4px"}} onClick={()=>{if(window.confirm("Supprimer ?")){setCoiffesStock(prev=>prev.filter(x=>x.id!==c.id));fbDelete("coiffes",c.id);}}}>x</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Historique sorties */}
              {clotures.filter(c=>c.type==="sortie").length>0&&(
                <div style={{...s.card,padding:"16px 20px",marginTop:"16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",cursor:"pointer"}} onClick={()=>setShowHistSorties(p=>!p)}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#7a5200"}}>Historique des sorties {showHistSorties?"▲":"▼"}</div>
                    <div style={{display:"flex",gap:"6px"}}>
                      {[...new Set(clotures.filter(c=>c.type==="sortie").map(c=>c.date.slice(0,7)))].sort().map(mois=>(
                        <button key={mois} style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                          onClick={()=>{if(window.confirm("Archiver et supprimer toutes les sorties de "+mois+" ?")){
                            const toDelete = clotures.filter(c=>c.type==="sortie"&&c.date.slice(0,7)===mois);
                            toDelete.forEach(c=>fbDelete("clotures",c.id));
                            setClotures(prev=>prev.filter(c=>!(c.type==="sortie"&&c.date.slice(0,7)===mois)));
                          }}}>Archiver {mois}</button>
                      ))}
                    </div>
                  </div>
                  {(()=>{
                    const sorties = clotures.filter(c=>c.type==="sortie");
                    const tots = {};
                    sorties.forEach(c=>{
                      const k = (c.statut||"Vente")+"|"+(c.format||"75cl");
                      tots[k] = (tots[k]||0) + (parseInt(c.qte)||0);
                    });
                    const totCRD75 = sorties.filter(c=>c.statut==="Habille CRD"&&c.format==="75cl").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    const totCRDMag = sorties.filter(c=>c.statut==="Habille CRD"&&c.format==="Magnum").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    const totCRDJer = sorties.filter(c=>c.statut==="Habille CRD"&&c.format==="Jeroboam").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    const totExp75 = sorties.filter(c=>c.statut==="Habille Export"&&c.format==="75cl").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    const totExpMag = sorties.filter(c=>c.statut==="Habille Export"&&c.format==="Magnum").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    const totExpJer = sorties.filter(c=>c.statut==="Habille Export"&&c.format==="Jeroboam").reduce((s,c)=>s+(parseInt(c.qte)||0),0);
                    return (
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px",padding:"10px",background:"#fff8ee",borderRadius:"6px"}}>
                        {totCRD75+totCRDMag+totCRDJer>0&&<div>
                          <div style={{fontSize:"11px",fontWeight:500,color:"#6a2d8a",marginBottom:"4px"}}>CRD</div>
                          {totCRD75>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>75cl : <strong>{totCRD75}</strong> btl</div>}
                          {totCRDMag>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>Magnum : <strong>{totCRDMag}</strong></div>}
                          {totCRDJer>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>Jeroboam : <strong>{totCRDJer}</strong></div>}
                        </div>}
                        {totExp75+totExpMag+totExpJer>0&&<div>
                          <div style={{fontSize:"11px",fontWeight:500,color:"#8a2d6a",marginBottom:"4px"}}>Export</div>
                          {totExp75>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>75cl : <strong>{totExp75}</strong> btl</div>}
                          {totExpMag>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>Magnum : <strong>{totExpMag}</strong></div>}
                          {totExpJer>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>Jeroboam : <strong>{totExpJer}</strong></div>}
                        </div>}
                      </div>
                    );
                  })()}
                  {showHistSorties&&clotures.filter(c=>c.type==="sortie").sort((a,b)=>b.date.localeCompare(a.date)).map(c=>(
                    <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"0.5px solid #ede5d4",fontSize:"12px"}}>
                      <div>
                        <span style={{fontWeight:500,color:"#1a1205"}}>{fmt(c.date)}</span>
                        <span style={{color:"#6a5838",marginLeft:"8px"}}>{c.cuvee}</span>
                        <span style={{color:"#b8860b",fontFamily:"monospace",marginLeft:"8px",fontWeight:500}}>{c.qte} {c.format==="Magnum"?"Magnums":c.format==="Jeroboam"?"Jeroboams":"btl"} sorties</span>
                        {c.notes&&<span style={{color:"#9a8870",marginLeft:"8px",fontStyle:"italic"}}>{c.notes}</span>}
                      </div>
                      <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>{ if(!window.confirm("Annuler cette sortie ?")) return; const lot=stockBouteilles.find(x=>x.id===c.lotId); if(lot){const upd={...lot,qteActuelle:(lot.qteActuelle||0)+(parseInt(c.qte)||0)};setStockBouteilles(p=>p.map(x=>x.id===lot.id?upd:x));fbSave("stockBouteilles",lot.id,upd);} setClotures(p=>p.filter(x=>x.id!==c.id));fbDelete("clotures",c.id); }}>Annuler</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* -- TIRAGES -- */}
        {false&&view==="tirages" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontSize:"13px",color:"#7a6840"}}>{tirages.length} tirage(s) enregistré(s)</div>
              <button style={s.btn} onClick={()=>{setTirageForm(TIRAGE_EMPTY);setEditingTirage(null);setShowTirageForm(true);}}>
                + Nouveau tirage
              </button>
            </div>

            {tirages.length===0 && (
              <div style={{...s.card,textAlign:"center",padding:"40px",color:"#9a8870"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>Aucun tirage enregistré</div>
                <div style={{fontSize:"13px",marginBottom:"16px"}}>Créez votre premier tirage pour commencer le suivi.</div>
                <button style={s.btn} onClick={()=>{setTirageForm(TIRAGE_EMPTY);setEditingTirage(null);setShowTirageForm(true);}}>+ Nouveau tirage</button>
              </div>
            )}

            <div style={{display:"grid",gap:"14px"}}>
              {tirages.map(t=>(
                <div key={t.id} style={{...s.card,borderLeft:"3px solid #533AB7"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"16px"}}>
                    {/* Identite */}
                    <div>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"16px",fontWeight:500,color:"#7a5200",marginBottom:"2px"}}>{t.cuvee}{t.isBio&&<span style={{marginLeft:"8px",fontSize:"11px",background:"#2d6a00",color:"#fff",borderRadius:"4px",padding:"2px 7px",fontWeight:600}}>🌿 BIO</span>}</div>
                      <div style={{fontSize:"12px",color:"#9a8870",marginBottom:"8px"}}>{t.date} - {t.operateur}</div>
                      {t.millesime&&<div style={{fontSize:"11px",color:"#6a5838"}}>Millésime : <strong>{t.millesime}</strong></div>}
                      {t.futsSources?.length>0&&(
                        <div style={{fontSize:"11px",color:"#6a5838",marginTop:"3px"}}>
                          Futs : {t.futsSources.join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Volumes assembles */}
                    <div style={{borderLeft:"0.5px solid #d4c4a0",paddingLeft:"14px"}}>
                      <div style={s.lbl}>Volume assemblé</div>
                      <div style={{fontSize:"20px",fontWeight:500,color:"#533AB7"}}>{t.volAssemble?.toFixed(1)} L</div>
                      <div style={{fontSize:"11px",color:"#9a8870",marginTop:"4px"}}>
                        Vin : {t.volumeTotal||0} L
                      </div>
                      {t.volLevain>0&&(
                        <div style={{fontSize:"11px",color:"#9a8870"}}>
                          Levain : {t.volLevain?.toFixed(1)} L
                        </div>
                      )}
                    </div>

                    {/* Levain */}
                    <div style={{borderLeft:"0.5px solid #d4c4a0",paddingLeft:"14px"}}>
                      <div style={s.lbl}>Levain</div>
                      {t.levainLevureNom ? (
                        <div>
                          <div style={{fontSize:"13px",fontWeight:500,color:"#1a1205",marginBottom:"3px"}}>{t.levainLevureNom}</div>
                          {t.levainLot&&<div style={{display:"inline-flex",alignItems:"center",background:"#fff8ee",border:"0.5px solid #d4c4a0",borderRadius:"3px",padding:"1px 7px",fontSize:"10px",color:"#7a5200",fontFamily:"monospace",marginBottom:"4px"}}>Lot: {t.levainLot}</div>}
                          <div style={{fontSize:"11px",color:"#9a8870"}}>
                            Eau: {t.levainEau||0}L · Vin: {t.levainVin||0}L · Lev: {t.levainLevure||0}L
                          </div>
                        </div>
                      ) : <div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Pas de levain</div>}
                    </div>

                    {/* Bouteilles */}
                    <div style={{borderLeft:"0.5px solid #d4c4a0",paddingLeft:"14px"}}>
                      <div style={s.lbl}>Mise en bouteilles</div>
                      <div style={{fontSize:"20px",fontWeight:500,color:"#1a7a40"}}>{t.volBouteilles?.toFixed(1)} L</div>
                      <div style={{marginTop:"6px",display:"flex",flexDirection:"column",gap:"3px"}}>
                        {(parseFloat(t.qte75)||0)>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>
                          <span style={{display:"inline-block",width:"18px",height:"18px",background:"#d4edc0",borderRadius:"3px",textAlign:"center",lineHeight:"18px",fontSize:"10px",marginRight:"5px",color:"#2d6a00",fontFamily:"monospace"}}>75</span>
                          {t.qte75} bouteilles = {((parseFloat(t.qte75)||0)*0.75).toFixed(0)}L
                        </div>}
                        {(parseFloat(t.qteMagnum)||0)>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>
                          <span style={{display:"inline-block",width:"18px",height:"18px",background:"#fde8b8",borderRadius:"3px",textAlign:"center",lineHeight:"18px",fontSize:"10px",marginRight:"5px",color:"#7a5200",fontFamily:"monospace"}}>M</span>
                          {t.qteMagnum} magnums = {((parseFloat(t.qteMagnum)||0)*1.5).toFixed(0)}L
                        </div>}
                        {(parseFloat(t.qteJeroboam)||0)>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>
                          <span style={{display:"inline-block",width:"18px",height:"18px",background:"#fdd0d0",borderRadius:"3px",textAlign:"center",lineHeight:"18px",fontSize:"10px",marginRight:"5px",color:"#8B0000",fontFamily:"monospace"}}>J</span>
                          {t.qteJeroboam} jeroboams = {((parseFloat(t.qteJeroboam)||0)*3.0).toFixed(0)}L
                        </div>}
                      </div>
                    </div>
                  </div>
                  {(t.cuveDestId||t.nouvelleCuveId)&&(
                    <div style={{marginTop:"10px",paddingTop:"10px",borderTop:"0.5px solid #ede5d4",display:"flex",alignItems:"center",gap:"8px",fontSize:"12px"}}>
                      <span style={{color:"#9a8870"}}>Stocke dans :</span>
                      <span style={{background:"#eeedfe",color:"#533AB7",border:"0.5px solid #534ab744",borderRadius:"4px",padding:"2px 10px",fontFamily:"monospace",fontWeight:500}}>
                        {t.cuveDestId || t.nouvelleCuveId}
                      </span>
                      <span style={{color:"#9a8870",fontSize:"11px"}}>{t.volAssemble?.toFixed(1)} L</span>
                    </div>
                  )}
                  {t.notes&&<div style={{marginTop:"12px",paddingTop:"10px",borderTop:"0.5px solid #ede5d4",fontSize:"12px",color:"#6a5838",fontStyle:"italic"}}>{t.notes}</div>}
                  <div style={{marginTop:"10px",display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #ede5d4",paddingTop:"10px"}}>
                    <button style={{background:"#fff8ee",color:"#7a5200",border:"0.5px solid #d4c4a0",borderRadius:"4px",padding:"4px 12px",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}
                      onClick={()=>openEditTirage(t)}>
                      Modifier
                    </button>
                    <button style={{background:"#fce8e8",color:"#cc2222",border:"0.5px solid #f0b4b4",borderRadius:"4px",padding:"4px 12px",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}
                      onClick={()=>{if(window.confirm("Supprimer ce tirage ? Cette action est irreversible.")) { setTirages(prev=>prev.filter(tr=>tr.id!==t.id)); deleteTirageFb(t.id); }}}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* -- MOUVEMENTS -- */}
        {view==="mouvements"&&(
          <div>
            <div style={{display:"flex",gap:"10px",marginBottom:"18px",alignItems:"center"}}>
              <button style={s.btn} onClick={()=>setShowMvtForm(true)}>+ Ajouter un mouvement</button>
              <input style={{...s.inp,maxWidth:"180px"}} placeholder="N° fût..." value={filterFut} onChange={e=>setFilterFut(e.target.value)}/>
              <select style={{...s.sel,maxWidth:"160px"}} value={filterMvtType} onChange={e=>setFilterMvtType(e.target.value)}>
                <option value="">Tous les types</option>
                {TYPES_MOUVEMENT.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select style={{...s.sel,maxWidth:"160px"}} value={filterOp} onChange={e=>setFilterOp(e.target.value)}>
                <option value="">Tous opérateurs</option>
                {degustateurs.map(d=><option key={d.nom} value={d.nom}>{d.nom}{!d.actif?" (absent)":""}</option>)}
              </select>
              <span style={{color:"#8a7248",fontSize:"11px",marginLeft:"auto"}}>{filteredMouvements.length} mouvements</span>
            </div>
            <div style={s.card}>
              {filteredMouvements.length===0&&<div style={{color:"#8a7248",fontSize:"13px"}}>Aucun mouvement. Créez-en un avec le bouton "Mouvement".</div>}
              {filteredMouvements.map(m=><MvtRow key={m.id} m={m}/>)}
            </div>
          </div>
        )}
      </div>

      {/* == MODAL DIVISION FUT == */}
      {showDivisionForm && divisionFut && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"420px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>Diviser le volume — {divisionFut.id}</div>
              <button style={s.ghost} onClick={()=>setShowDivisionForm(false)}>x</button>
            </div>
            <div style={{fontSize:"12px",color:"#9a8870",marginBottom:"16px"}}>
              Contenu actuel : <strong>{divisionFut.contenuActuel} L</strong>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <span style={s.lbl}>Volume AOC tirable (L)</span>
                  <input type="number" step="0.1" style={s.inp} placeholder="0"
                    value={divisionForm.volAOC}
                    onChange={e=>{
                      const aoc = parseFloat(e.target.value)||0;
                      const ri = Math.max(0,(divisionFut.contenuActuel||0)-aoc);
                      setDivisionForm({volAOC:e.target.value, volRI:ri});
                    }}/>
                </div>
                <div>
                  <span style={s.lbl}>Volume RI (L)</span>
                  <input type="number" step="0.1" style={s.inp} placeholder="0"
                    value={divisionForm.volRI}
                    onChange={e=>{
                      const ri = parseFloat(e.target.value)||0;
                      const aoc = Math.max(0,(divisionFut.contenuActuel||0)-ri);
                      setDivisionForm({volRI:e.target.value, volAOC:aoc});
                    }}/>
                </div>
              </div>
              {(()=>{
                const total = (parseFloat(divisionForm.volAOC)||0)+(parseFloat(divisionForm.volRI)||0);
                const ok = Math.abs(total-(divisionFut.contenuActuel||0))<0.01;
                return (
                  <div style={{padding:"8px 12px",borderRadius:"6px",background:ok?"#d4f0dd":"#fde8e8",fontSize:"12px",color:ok?"#1a7a40":"#cc2222"}}>
                    Total : {total.toFixed(1)} L {ok?"✓ correct":`≠ ${divisionFut.contenuActuel} L`}
                  </div>
                );
              })()}
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowDivisionForm(false)}>Annuler</button>
                <button style={s.btn} onClick={()=>{
                  const aoc = parseFloat(divisionForm.volAOC)||0;
                  const ri = parseFloat(divisionForm.volRI)||0;
                  const total = aoc+ri;
                  if(Math.abs(total-(divisionFut.contenuActuel||0))>0.1) return alert("Le total doit egaliser le contenu actuel : "+divisionFut.contenuActuel+" L");
                  const updated = {...divisionFut, volumeRI:ri};
                  setTonneaux(prev=>prev.map(t=>t.id===divisionFut.id?updated:t));
                  saveTonneau(updated);
                  setShowDivisionForm(false);
                  alert(`Division enregistree : ${aoc} L AOC + ${ri} L RI`);
                }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL CUVERIE == */}
      {showCuverieForm&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"440px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>{editingCuverie?"Modifier la cuve":"Nouvelle cuve de cuverie"}</div>
              <button style={s.ghost} onClick={()=>setShowCuverieForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Nom / ID *</span>
                  <input style={s.inp} placeholder="ex. D1, Cuve-01" value={cuverieForm.nom} onChange={e=>setCuverieForm(f=>({...f,nom:e.target.value}))}/></div>
                <div><span style={s.lbl}>Type</span>
                  <select style={s.sel} value={cuverieForm.type} onChange={e=>setCuverieForm(f=>({...f,type:e.target.value}))}>
                    <option value="debourbage">Debourbage</option>
                    <option value="assemblage">Assemblage</option>
                    <option value="bourbes">Bourbes</option>
                  </select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Volume total (HL)</span>
                  <input type="number" step="0.1" style={s.inp} placeholder="ex. 50" value={cuverieForm.volumeHL} onChange={e=>setCuverieForm(f=>({...f,volumeHL:e.target.value}))}/></div>
                <div><span style={s.lbl}>Contenu actuel (HL)</span>
                  <input type="number" step="0.1" style={s.inp} placeholder="0" value={cuverieForm.contenuActuelHL} onChange={e=>setCuverieForm(f=>({...f,contenuActuelHL:e.target.value}))}/></div>
              </div>
              <div><span style={s.lbl}>Notes</span>
                <input style={s.inp} placeholder="ex. Inox 50HL..." value={cuverieForm.notes||""} onChange={e=>setCuverieForm(f=>({...f,notes:e.target.value}))}/></div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowCuverieForm(false)}>Annuler</button>
                <button style={s.btn} onClick={()=>{
                  if(!cuverieForm.nom.trim()) return alert("Nom requis.");
                  if(editingCuverie) {
                    const updated = {...editingCuverie,...cuverieForm};
                    setCuvesCuverie(prev=>prev.map(x=>x.id===editingCuverie.id?updated:x));
                    fbSave("cuvesCuverie",editingCuverie.id,updated);
                  } else {
                    const c = {id:"cuverie_"+Date.now(),...cuverieForm,timestamp:new Date().toISOString()};
                    setCuvesCuverie(prev=>[c,...prev]);
                    fbSave("cuvesCuverie",c.id,c);
                  }
                  setShowCuverieForm(false);
                  setEditingCuverie(null);
                  setCuverieForm(CUVERIE_EMPTY);
                }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL RI REQUIS == */}
      {showRiForm&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"380px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>RI requis</div>
              <button style={s.ghost} onClick={()=>setShowRiForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Campagne</span>
                  <input type="number" style={s.inp} placeholder="2025" value={riForm.annee} onChange={e=>setRiForm(f=>({...f,annee:e.target.value}))}/></div>
                <div><span style={s.lbl}>Volume RI requis (HL)</span>
                  <input type="number" step="0.1" style={s.inp} placeholder="ex. 120" value={riForm.volumeHL} onChange={e=>setRiForm(f=>({...f,volumeHL:e.target.value}))}/></div>
              </div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowRiForm(false)}>Annuler</button>
                <button style={s.btn} onClick={()=>{
                  if(!riForm.annee||!riForm.volumeHL) return alert("Tous les champs sont requis.");
                  const existing = riRequis.find(r=>r.annee===riForm.annee);
                  if(existing) {
                    const updated = {...existing,...riForm,id:existing.id};
                    setRiRequis(prev=>prev.map(r=>r.annee===riForm.annee?updated:r));
                    fbSave("riRequis",updated.id,updated);
                  } else {
                    const r = {id:"ri_"+Date.now(),...riForm,timestamp:new Date().toISOString()};
                    setRiRequis(prev=>[r,...prev]);
                    fbSave("riRequis",r.id,r);
                  }
                  setShowRiForm(false);
                }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL MOUVEMENT == */}
      {showMvtForm&&(
        <div style={s.modal}>
          <div style={s.modalBox}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"22px"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",color:"#b8860b"}}>Nouveau mouvement</div>
              <button style={s.ghost} onClick={()=>setShowMvtForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"14px"}}>
              <div>
                <span style={s.lbl}>Type d'opération *</span>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px"}}>
                  {TYPES_MOUVEMENT.map(t=>(
                    <div key={t.value} onClick={()=>setMvtForm(f=>({...f,type:t.value}))}
                      style={{padding:"9px 11px",border:`1px solid ${mvtForm.type===t.value?t.color:"#2a2a2c"}`,borderRadius:"5px",cursor:"pointer",background:mvtForm.type===t.value?t.color+"14":"transparent",display:"flex",alignItems:"center",gap:"7px",fontSize:"12px",color:mvtForm.type===t.value?t.color:"#6a5838"}}>
                      <i className={`ti ${t.icon}`} style={{fontSize:"15px"}}/>{t.label}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Date *</span><input type="datetime-local" style={s.inp} value={mvtForm.date} onChange={e=>setMvtForm(f=>({...f,date:e.target.value}))}/></div>
                <div><span style={s.lbl}>Opérateur *</span>
                  <select style={s.sel} value={mvtForm.operateur} onChange={e=>setMvtForm(f=>({...f,operateur:e.target.value}))}>
                    <option value="">Sélectionner...</option>
                    {degustateurs.map(d=><option key={d.nom}>{d.nom}</option>)}
                  </select>
                </div>
              </div>
              {needsSource&&mvtForm.type==="perte"&&(
                <div>
                  <span style={s.lbl}>Futs concernes (volumes a deduire)</span>
                  <div style={{maxHeight:"200px",overflowY:"auto",border:"0.5px solid #d4c4a0",borderRadius:"6px",padding:"6px",background:"#fffdf7"}}>
                    {tonneaux.filter(t=>t.contenuActuel>0).map(t=>(
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:"7px",padding:"3px",fontSize:"12px"}}>
                        <input type="checkbox" checked={mvtForm.futSource.includes(t.id)} onChange={()=>setMvtForm(f=>({...f,futSource:f.futSource.includes(t.id)?f.futSource.filter(x=>x!==t.id):[...f.futSource,t.id]}))}/>
                        <span style={{color:"#b8860b",minWidth:"54px",fontFamily:"monospace"}}>{t.id}</span>
                        <span style={{color:"#6a5838",flex:1}}>{t.denomination}</span>
                        <span style={{color:"#9a8870",fontSize:"10px"}}>{t.contenuActuel}L</span>
                        {mvtForm.futSource.includes(t.id)&&(
                          <input type="number" style={{...s.inp,width:"75px",padding:"2px 6px",fontSize:"11px"}} placeholder="vol L" value={mvtForm.perteVolumes[t.id]||""} onChange={e=>setMvtForm(f=>({...f,perteVolumes:{...f.perteVolumes,[t.id]:e.target.value}}))}/>
                        )}
                      </div>
                    ))}
                  </div>
                  {mvtForm.futSource.length>0&&<div style={{fontSize:"11px",color:"#cc2222",marginTop:"4px"}}>Total perte : {mvtForm.futSource.reduce((s,id)=>s+(parseFloat(mvtForm.perteVolumes[id])||0),0).toLocaleString()} L</div>}
                </div>
              )}
              {mvtForm.type==="ouillage"&&(
                <div style={{display:"grid",gap:"10px"}}>
                  <div>
                    <span style={s.lbl}>Fut source (fournit le vin) *</span>
                    <select style={s.sel} value={mvtForm.futSource[0]||""} onChange={e=>setMvtForm(f=>({...f,futSource:[e.target.value]}))}>
                      <option value="">Selectionner...</option>
                      {tonneaux.filter(t=>t.contenuActuel>0).map(t=><option key={t.id} value={t.id}>{t.id} - {t.denomination} ({t.contenuActuel}L)</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                      <span style={s.lbl}>Futs a oullier</span>
                      <button style={s.ghostSm} onClick={()=>setMvtForm(f=>({...f,ouillageDestFuts:[...(f.ouillageDestFuts||[]),{futId:"",volume:""}]}))}>+ Ajouter</button>
                    </div>
                    {(mvtForm.ouillageDestFuts||[{futId:"",volume:""}]).map((ef,i)=>(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 80px auto",gap:"6px",marginBottom:"6px",alignItems:"end"}}>
                        <select style={s.sel} value={ef.futId} onChange={e=>setMvtForm(f=>({...f,ouillageDestFuts:f.ouillageDestFuts.map((x,j)=>j===i?{...x,futId:e.target.value}:x)}))}>
                          <option value="">Selectionner...</option>
                          {tonneaux.filter(t=>t.id!==mvtForm.futSource[0]).map(t=><option key={t.id} value={t.id}>{t.id} - {t.denomination} ({t.contenuActuel}L/{t.volume}L)</option>)}
                        </select>
                        <input type="number" style={s.inp} placeholder="L" value={ef.volume} onChange={e=>setMvtForm(f=>({...f,ouillageDestFuts:f.ouillageDestFuts.map((x,j)=>j===i?{...x,volume:e.target.value}:x)}))}/>
                        {i>0&&<button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>setMvtForm(f=>({...f,ouillageDestFuts:f.ouillageDestFuts.filter((_,j)=>j!==i)}))}>x</button>}
                        {i===0&&<div/>}
                      </div>
                    ))}
                    {(mvtForm.ouillageDestFuts||[]).length>0&&(
                      <div style={{fontSize:"11px",color:"#185FA5",marginTop:"4px"}}>
                        Total ouillage : {(mvtForm.ouillageDestFuts||[]).reduce((s,ef)=>s+(parseFloat(ef.volume)||0),0).toLocaleString()} L
                      </div>
                    )}
                  </div>
                </div>
              )}
              {needsSource&&mvtForm.type!=="perte"&&(
                <div>
                  <span style={s.lbl}>Fût(s) source {mvtForm.type==="assemblage"?"(multi)":""} *</span>
                  <div style={{maxHeight:"220px",overflowY:"auto",border:"1px solid #cfc0a0",borderRadius:"4px",padding:"7px"}}>
                    {tonneaux.filter(t=>t.contenuActuel>0).map(t=>(
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"4px",fontSize:"12px"}}>
                        <input type={mvtForm.type==="assemblage"?"checkbox":"radio"} name="src" checked={mvtForm.futSource.includes(t.id)}
                          onChange={()=>setMvtForm(f=>({
                            ...f,
                            futSource:mvtForm.type==="assemblage"?(f.futSource.includes(t.id)?f.futSource.filter(x=>x!==t.id):[...f.futSource,t.id]):[t.id],
                            assemblageVolumes:mvtForm.type==="assemblage"?{...f.assemblageVolumes,[t.id]:f.assemblageVolumes[t.id]||t.contenuActuel}:{}
                          }))}/>
                        <span style={{color:"#b8860b",minWidth:"52px"}}>{t.id}</span>
                        <span style={{color:"#7a6840",flex:1}}>{t.denomination}</span>
                        <span style={{color:"#9a8870",fontSize:"10px"}}>{t.contenuActuel}L dispo</span>
                        {mvtForm.type==="assemblage"&&mvtForm.futSource.includes(t.id)&&(
                          <input type="number" style={{...s.inp,width:"80px",padding:"2px 6px",fontSize:"11px"}}
                            placeholder={String(t.contenuActuel)}
                            value={mvtForm.assemblageVolumes[t.id]||""}
                            onChange={e=>setMvtForm(f=>({...f,assemblageVolumes:{...f.assemblageVolumes,[t.id]:e.target.value}}))}/>
                        )}
                        {mvtForm.type!=="assemblage"&&<span style={{color:"#6a5838"}}>{t.contenuActuel}L</span>}
                      </div>
                    ))}
                  </div>
                  {mvtForm.type==="assemblage"&&mvtForm.futSource.length>0&&(
                    <div style={{fontSize:"11px",color:"#7a5200",marginTop:"4px"}}>
                      Total assemblage : {mvtForm.futSource.reduce((s,id)=>s+(parseFloat(mvtForm.assemblageVolumes[id])||getTonneau(id)?.contenuActuel||0),0).toLocaleString()} L
                    </div>
                  )}
                </div>
              )}
              {needsDest&&(
                <div><span style={s.lbl}>{mvtForm.type==="assemblage"?"Cuve destination (Cuverie)":"Fût destination"} *</span>
                  <select style={s.sel} value={mvtForm.futDest} onChange={e=>setMvtForm(f=>({...f,futDest:e.target.value}))}>
                    <option value="">Sélectionner...</option>
                    {mvtForm.type==="assemblage"
                      ? cuvesCuverie.filter(c=>c.type!=="bourbes").map(c=><option key={c.id} value={c.id}>{c.nom} - {c.type} (dispo: {Math.max(0,(parseFloat(c.volumeHL)||0)-(parseFloat(c.contenuActuelHL)||0)).toFixed(1)} HL)</option>)
                      : tonneaux.filter(t=>!mvtForm.futSource.includes(t.id)).map(t=><option key={t.id} value={t.id}>{t.id} - {t.denomination} ({t.contenuActuel}L/{t.volume}L)</option>)
                    }
                  </select>
                </div>
              )}
              {needsVol&&<div><span style={s.lbl}>Volume (L)</span><input type="number" style={s.inp} placeholder="ex. 15" value={mvtForm.volume} onChange={e=>setMvtForm(f=>({...f,volume:e.target.value}))}/></div>}
              {mvtForm.type==="ajout_produit"&&(
                <div style={{display:"grid",gap:"12px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                    <div><span style={s.lbl}>Produit</span><input style={s.inp} placeholder="SO2, ACT'O..." value={mvtForm.produit} onChange={e=>setMvtForm(f=>({...f,produit:e.target.value}))}/></div>
                    <div><span style={s.lbl}>Dosage</span><input style={s.inp} placeholder="2cl/HL..." value={mvtForm.dosage} onChange={e=>setMvtForm(f=>({...f,dosage:e.target.value}))}/></div>
                  </div>
                  <div>
                    <span style={s.lbl}>Numéro de lot <span style={{color:"#cc2222"}}>*</span></span>
                    <input style={{...s.inp, borderColor: mvtForm.type==="ajout_produit" && !mvtForm.numeroLot ? "#e8a0a0" : undefined}}
                      placeholder="ex. LOT-2025-001 (obligatoire)"
                      value={mvtForm.numeroLot}
                      onChange={e=>setMvtForm(f=>({...f,numeroLot:e.target.value}))}/>
                  </div>
                </div>
              )}
              <div><span style={s.lbl}>Notes</span><textarea style={{...s.inp,height:"64px",resize:"vertical"}} value={mvtForm.notes} onChange={e=>setMvtForm(f=>({...f,notes:e.target.value}))}/></div>
              {mvtForm.type==="mutage"&&(
                <div style={{borderTop:"0.5px solid #d4c4a0",paddingTop:"12px",display:"grid",gap:"10px"}}>
                  <div style={{fontFamily:"Georgia,serif",fontSize:"13px",color:"#8B0000",marginBottom:"4px"}}>Details mutage</div>
                  <div><span style={s.lbl}>Cuve bourbes (source)</span>
                    <select style={s.sel} value={mvtForm.mutageCuveId||""} onChange={e=>setMvtForm(f=>({...f,mutageCuveId:e.target.value}))}>
                      <option value="">Selectionner...</option>
                      {cuvesCuverie.filter(c=>c.type==="bourbes").map(c=><option key={c.id} value={c.id}>{c.nom} ({c.contenuActuelHL||0} HL)</option>)}
                    </select>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                    <div><span style={s.lbl}>Volume bourbes (HL)</span>
                      <input type="number" step="0.1" style={s.inp} placeholder="0" value={mvtForm.mutageBourbesHL||""} onChange={e=>setMvtForm(f=>({...f,mutageBourbesHL:e.target.value}))}/></div>
                    <div><span style={s.lbl}>Volume alcool (HL)</span>
                      <input type="number" step="0.1" style={s.inp} placeholder="0" value={mvtForm.mutageAlcoolHL||""} onChange={e=>setMvtForm(f=>({...f,mutageAlcoolHL:e.target.value}))}/></div>
                  </div>
                  <div><span style={s.lbl}>Degre alcool (%)</span>
                    <input type="number" step="0.1" style={s.inp} placeholder="96" value={mvtForm.mutageDegreAlcool||""} onChange={e=>setMvtForm(f=>({...f,mutageDegreAlcool:e.target.value}))}/></div>
                  <div><span style={s.lbl}>Cuve destination (apres mutage)</span>
                    <select style={s.sel} value={mvtForm.mutageDestId||""} onChange={e=>setMvtForm(f=>({...f,mutageDestId:e.target.value}))}>
                      <option value="">Selectionner...</option>
                      {tonneaux.filter(t=>t.statut==="vide"||(t.contenuActuel||0)<(t.volume||0)).map(t=><option key={t.id} value={t.id}>{t.id}{t.denomination?" - "+t.denomination:""} (dispo: {Math.max(0,(t.volume||0)-(t.contenuActuel||0))}L)</option>)}
                    </select>
                  </div>
                  {mvtForm.mutageBourbesHL&&mvtForm.mutageAlcoolHL&&(
                    <div style={{padding:"8px 12px",background:"#fdd0d0",borderRadius:"6px",fontSize:"12px",color:"#8B0000"}}>
                      Volume total apres mutage : {(parseFloat(mvtForm.mutageBourbesHL)||0)+(parseFloat(mvtForm.mutageAlcoolHL)||0)} HL
                    </div>
                  )}
                </div>
              )}
              {mvtForm.type==="entonnage"&&(
                <div style={{borderTop:"0.5px solid #d4c4a0",paddingTop:"12px",display:"grid",gap:"10px"}}>
                  <div style={{fontFamily:"Georgia,serif",fontSize:"13px",color:"#7a5200",marginBottom:"4px"}}>Details entonnage</div>
                  <div><span style={s.lbl}>Cuve source (Cuverie)</span>
                    <select style={s.sel} value={mvtForm.entonnageCuveId||""} onChange={e=>setMvtForm(f=>({...f,entonnageCuveId:e.target.value}))}>
                      <option value="">Selectionner une cuve...</option>
                      {cuvesCuverie.filter(c=>parseFloat(c.contenuActuelHL)||0>0).map(c=>(
                        <option key={c.id} value={c.id}>{c.nom} - {c.type} ({c.contenuActuelHL||0} HL dispo)</option>
                      ))}
                    </select>
                  </div>
                  <div><span style={s.lbl}>Vendange associee (pour n° Marc)</span>
                    <select style={s.sel} value={mvtForm.entonnageVendangeId||""} onChange={e=>setMvtForm(f=>({...f,entonnageVendangeId:e.target.value}))}>
                      <option value="">Selectionner...</option>
                      {vendanges.filter(v=>v.cuveTailleId===mvtForm.entonnageCuveId||v.cuveCuveeId===mvtForm.entonnageCuveId||v.cuveCuveeBId===mvtForm.entonnageCuveId).map(v=>(
                        <option key={v.id} value={v.id}>{fmt(v.date)} - {v.cuveeCreee||"Marc "+v.numeroMarc} - Marc {v.numeroMarc}</option>
                      ))}
                      {vendanges.filter(v=>v.cuveTailleId===mvtForm.entonnageCuveId||v.cuveCuveeId===mvtForm.entonnageCuveId||v.cuveCuveeBId===mvtForm.entonnageCuveId).length===0&&
                        vendanges.map(v=><option key={v.id} value={v.id}>{fmt(v.date)} - {v.cuveeCreee||"Marc "+v.numeroMarc} - Marc {v.numeroMarc}</option>)
                      }
                    </select>
                    {mvtForm.entonnageVendangeId&&(()=>{
                      const vd = vendanges.find(v=>v.id===mvtForm.entonnageVendangeId);
                      return vd?.numeroMarc&&<div style={{fontSize:"11px",color:"#7a5200",marginTop:"3px"}}>Marc {vd.numeroMarc} sera reporté sur les futs destination</div>;
                    })()}
                  </div>
                  <div><span style={s.lbl}>Volume a entonner (HL)</span>
                    <input type="number" step="0.1" style={s.inp} placeholder="0" value={mvtForm.volume||""} onChange={e=>setMvtForm(f=>({...f,volume:e.target.value}))}/></div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                      <span style={s.lbl}>Futs destination</span>
                      <button style={s.ghostSm} onClick={()=>setMvtForm(f=>({...f,entonnageFuts:[...(f.entonnageFuts||[]),{futId:"",volume:""}]}))}>+ Ajouter</button>
                    </div>
                    {(mvtForm.entonnageFuts||[{futId:"",volume:""}]).map((ef,i)=>(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 100px auto",gap:"8px",marginBottom:"6px",alignItems:"end"}}>
                        <div>
                          <select style={s.sel} value={ef.futId} onChange={e=>setMvtForm(f=>({...f,entonnageFuts:f.entonnageFuts.map((x,j)=>j===i?{...x,futId:e.target.value}:x)}))}>
                            <option value="">Selectionner...</option>
                            {tonneaux.filter(t=>t.statut==="vide"||(t.contenuActuel||0)<(t.volume||0)).map(t=>(
                              <option key={t.id} value={t.id}>{t.id}{t.denomination?" - "+t.denomination:""} ({Math.max(0,(t.volume||0)-(t.contenuActuel||0))}L dispo)</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input type="number" step="0.1" style={s.inp} placeholder="HL" value={ef.volume} onChange={e=>setMvtForm(f=>({...f,entonnageFuts:f.entonnageFuts.map((x,j)=>j===i?{...x,volume:e.target.value}:x)}))}/>
                        </div>
                        {i>0&&<button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>setMvtForm(f=>({...f,entonnageFuts:f.entonnageFuts.filter((_,j)=>j!==i)}))}>x</button>}
                        {i===0&&<div/>}
                      </div>
                    ))}
                    {(mvtForm.entonnageFuts||[]).length>0&&(
                      <div style={{fontSize:"11px",color:"#9a8870",marginTop:"4px"}}>
                        Total : {(mvtForm.entonnageFuts||[]).reduce((s,ef)=>s+(parseFloat(ef.volume)||0),0).toFixed(2)} HL
                      </div>
                    )}
                  </div>
                </div>
              )}
              {mvtForm.type==="soutirage"&&mvtForm.futSource[0]&&mvtForm.futDest&&mvtForm.volume&&(
                <div style={{background:"#d0f0dc",border:"1px solid #a8d4b4",borderRadius:"5px",padding:"10px 12px",fontSize:"12px"}}>
                  <div style={{color:"#1a7a40",fontWeight:600,marginBottom:"3px"}}>Aperçu</div>
                  <div style={{color:"#6a5838"}}>{mvtForm.futSource[0]} : {getTonneau(mvtForm.futSource[0])?.contenuActuel}L &rarr; <strong style={{color:"#1a1205"}}>{Math.max(0,(getTonneau(mvtForm.futSource[0])?.contenuActuel||0)-parseFloat(mvtForm.volume||0))}L</strong></div>
                  <div style={{color:"#6a5838"}}>{mvtForm.futDest} : {getTonneau(mvtForm.futDest)?.contenuActuel}L &rarr; <strong style={{color:"#1a1205"}}>{Math.min((getTonneau(mvtForm.futDest)?.volume||999),(getTonneau(mvtForm.futDest)?.contenuActuel||0)+parseFloat(mvtForm.volume||0))}L</strong></div>
                </div>
              )}
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"1px solid #cfc0a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowMvtForm(false)}>Annuler</button>
                <button style={s.btn} onClick={submitMouvement}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL DÉGUSTATION == */}
      {showDegForm&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"720px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",color:"#b8860b"}}>Nouvelle dégustation</div>
              <button style={s.ghost} onClick={()=>setShowDegForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"14px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"12px"}}>
                <div><span style={s.lbl}>Fût *</span>
                  <select style={s.sel} value={degForm.futId} onChange={e=>setDegForm(f=>({...f,futId:e.target.value}))}>
                    <option value="">Sélectionner...</option>
                    {tonneaux.map(t=><option key={t.id} value={t.id}>{t.id} - {t.denomination}</option>)}
                  </select>
                </div>
                <div><span style={s.lbl}>Session *</span><input style={s.inp} placeholder="ex. Avril 2026" value={degForm.session} onChange={e=>setDegForm(f=>({...f,session:e.target.value}))}/></div>
                <div><span style={s.lbl}>Date</span><input type="date" style={s.inp} value={degForm.date} onChange={e=>setDegForm(f=>({...f,date:e.target.value}))}/></div>
              </div>

              {/* Tableau de saisie multi-dégustateurs */}
              <div>
                <span style={s.lbl}>Notes par dégustateur</span>
                <div style={{border:"1px solid #cfc0a0",borderRadius:"6px",overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"120px 80px 80px 80px 1fr",gap:"0",background:"#fffbf3",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#8a7248"}}>
                    <div>Dégustateur</div><div>Boisé /3</div><div>Longueur /3</div><div>Note G /5</div><div>Commentaire</div>
                  </div>
                  {degForm.lignes.map((l,i)=>(<div key={i} style={{display:"contents"}}>
                    <div key={l.degustateur} style={{display:"grid",gridTemplateColumns:"120px 80px 80px 80px 1fr",gap:"0",borderTop:"1px solid #d0c4a0",padding:"5px 8px",alignItems:"center"}}>
                      <div style={{fontSize:"12px",color:"#b8860b",padding:"0 2px"}}>{l.degustateur}</div>
                      <div style={{padding:"0 4px"}}><input type="number" min="0" max="3" step="0.5" style={{...s.inp,padding:"4px 6px",fontSize:"12px"}} placeholder="-" value={l.boise} onChange={e=>{const lg=[...degForm.lignes];lg[i]={...lg[i],boise:e.target.value};setDegForm(f=>({...f,lignes:lg}));}}/></div>
                      <div style={{padding:"0 4px"}}><input type="number" min="0" max="3" step="0.5" style={{...s.inp,padding:"4px 6px",fontSize:"12px"}} placeholder="-" value={l.longueur} onChange={e=>{const lg=[...degForm.lignes];lg[i]={...lg[i],longueur:e.target.value};setDegForm(f=>({...f,lignes:lg}));}}/></div>
                      <div style={{padding:"0 4px"}}><input type="number" min="0" max="5" step="0.5" style={{...s.inp,padding:"4px 6px",fontSize:"12px"}} placeholder="-" value={l.noteG} onChange={e=>{const lg=[...degForm.lignes];lg[i]={...lg[i],noteG:e.target.value};setDegForm(f=>({...f,lignes:lg}));}}/></div>
                      <div style={{padding:"0 4px"}}><input style={{...s.inp,padding:"4px 6px",fontSize:"12px"}} placeholder="Commentaire libre..." value={l.commentaire} onChange={e=>{const lg=[...degForm.lignes];lg[i]={...lg[i],commentaire:e.target.value};setDegForm(f=>({...f,lignes:lg}));}}/></div>
                    </div>
                  </div>))}
                </div>
              </div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"1px solid #cfc0a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowDegForm(false)}>Annuler</button>
                <button style={s.btn} onClick={submitDegustation}>Enregistrer les notes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL IMPORT CSV == */}
      {showImport&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"620px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",color:"#b8860b"}}>Importer des notes depuis Excel</div>
              <button style={s.ghost} onClick={()=>{setShowImport(false);setImportMsg("");}}>x</button>
            </div>
            <div style={{display:"grid",gap:"14px"}}>
              <div style={{background:"#fffbf3",borderRadius:"6px",padding:"14px",fontSize:"12px",color:"#6a5838",lineHeight:"1.7"}}>
                <div style={{color:"#5a4a30",marginBottom:"8px",fontWeight:600}}>Format attendu (CSV séparé par ;)</div>
                <code style={{display:"block",color:"#b8860b",fontSize:"11px",marginBottom:"6px"}}>fut_id;session;date;degustateur;boise;longueur;note_g;commentaire</code>
                <code style={{display:"block",color:"#7a6840",fontSize:"11px"}}>23.28;Avril 2026;2026-04-15;Flavien;1;1.5;3;Nez grillé net droit</code>
                <code style={{display:"block",color:"#7a6840",fontSize:"11px"}}>23.28;Avril 2026;2026-04-15;Sébastien;1.5;2.5;4.5;Equilibré fruit/bois</code>
                <div style={{marginTop:"8px",color:"#8a7248",fontSize:"11px"}}> Dans Excel : Fichier &rarr; Enregistrer sous &rarr; CSV (séparateur point-virgule). Les colonnes <em>boise</em>, <em>longueur</em> et <em>date</em> sont optionnelles.</div>
              </div>
              <div>
                <span style={s.lbl}>Coller le contenu CSV ici</span>
                <textarea style={{...s.inp,height:"160px",resize:"vertical",fontSize:"12px"}} placeholder={"fut_id;session;date;degustateur;boise;longueur;note_g;commentaire\n23.28;Avril 2026;2026-04-15;Flavien;1;1.5;3;Nez grillé net droit"} value={importText} onChange={e=>setImportText(e.target.value)}/>
              </div>
              {importMsg&&<div style={{padding:"10px 14px",background:importMsg.startsWith("OK")?"#0F6E5618":"#A32D2D18",border:`1px solid ${importMsg.startsWith("OK")?"#0F6E5633":"#A32D2D33"}`,borderRadius:"5px",fontSize:"13px",color:importMsg.startsWith("OK")?"#1a7a40":"#cc2222"}}>{importMsg}</div>}
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"1px solid #cfc0a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>{setShowImport(false);setImportMsg("");}}>Fermer</button>
                <button style={s.btn} onClick={handleImport}>Importer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL AJOUT / MODIFICATION FÛT == */}
      {showFutForm && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"560px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"22px"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",color:"#b8860b"}}>
                {editingFut ? `Modifier - ${editingFut.id}` : "Nouveau fût / Cuve"}
              </div>
              <button style={s.ghost} onClick={()=>{setShowFutForm(false);setEditingFut(null);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"14px"}}>

              {/* N° fût */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <span style={s.lbl}>N° Fût / Nom *</span>
                  <input style={s.inp} value={futForm.id}
                    readOnly={!!editingFut}
                    onChange={e=>setFutForm(f=>({...f,id:e.target.value}))}
                    placeholder="ex. 23.28, Foudre 7, Cuve Meunier"/>

                </div>
                <div>
                  <span style={s.lbl}>Appellation *</span>
                  <select style={s.sel} value={futForm.appellation} onChange={e=>{
                    const v=e.target.value;
                    // si vins_clairs, synchro le millésime
                    if(v.startsWith("vins_clairs_")){
                      const yr=v.replace("vins_clairs_","");
                      setFutForm(f=>({...f,appellation:v,millesime:yr}));
                    } else {
                      setFutForm(f=>({...f,appellation:v}));
                    }
                  }}>
                    <optgroup label="Vins clairs (par millésime)">
                      {/* années déjà présentes */}
                      {vinsClairsAnnes.map(k=>{
                        const yr=k.replace("vins_clairs_","").replace("vins_clairs","");
                        return <option key={k} value={k}>Vins clairs {yr||"(sans année)"}</option>;
                      })}
                      {/* option pour créer une nouvelle année */}
                      {[2024,2025,2026,2027,2028].filter(y=>!vinsClairsAnnes.includes(`vins_clairs_${y}`)).map(y=>(
                        <option key={y} value={`vins_clairs_${y}`}>+ Vins clairs {y} (nouveau)</option>
                      ))}
                    </optgroup>
                    <optgroup label="Autres appellations">
                      {Object.entries(APPELLATION_FIXED).map(([k,a])=>(
                        <option key={k} value={k}>{a.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Marc + Denomination + millesime */}
              <div style={{display:"grid",gridTemplateColumns:"100px 2fr 1fr",gap:"12px"}}>
                <div>
                  <span style={s.lbl}>N° Marc</span>
                  <input type="number" style={s.inp} placeholder="ex. 5"
                    value={futForm.marc||""}
                    onChange={e=>setFutForm(f=>({...f,marc:e.target.value}))}/>
                </div>
                <div>
                  <span style={s.lbl}>Dénomination / Cuvée *</span>
                  <input style={s.inp} value={futForm.denomination}
                    onChange={e=>setFutForm(f=>({...f,denomination:e.target.value}))}
                    placeholder="ex. FONTINETTE, VDR ARPENT ROUGE"/>
                </div>
                <div>
                  <span style={s.lbl}>Millésime</span>
                  <input type="number" style={s.inp} value={futForm.millesime}
                    onChange={e=>setFutForm(f=>({...f,millesime:e.target.value}))}
                    placeholder="ex. 2025"/>
                </div>
              </div>

              {/* Volume + contenu actuel */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <span style={s.lbl}>Volume total (L) *</span>
                  <input type="number" style={s.inp} value={futForm.volume}
                    onChange={e=>setFutForm(f=>({...f,volume:e.target.value}))}
                    placeholder="ex. 228, 320, 500, 4000"/>
                </div>
                <div>
                  <span style={s.lbl}>Contenu actuel (L)</span>
                  <input type="number" style={s.inp} value={futForm.contenuActuel}
                    onChange={e=>setFutForm(f=>({...f,contenuActuel:e.target.value}))}
                    placeholder="Laissez vide = volume max"/>
                </div>
              </div>

              {/* Tonnelier + grain + chauffe */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"12px"}}>
                <div>
                  <span style={s.lbl}>Tonnelier</span>
                  <input style={s.inp} value={futForm.tonnelier}
                    onChange={e=>setFutForm(f=>({...f,tonnelier:e.target.value}))}
                    placeholder="ex. Seguin Moreau"/>
                </div>
                <div>
                  <span style={s.lbl}>Grain</span>
                  <input style={s.inp} value={futForm.grain}
                    onChange={e=>setFutForm(f=>({...f,grain:e.target.value}))}
                    placeholder="ex. GF, Pierre"/>
                </div>
                <div>
                  <span style={s.lbl}>Chauffe</span>
                  <input style={s.inp} value={futForm.chauffe}
                    onChange={e=>setFutForm(f=>({...f,chauffe:e.target.value}))}
                    placeholder="ex. ML, GC, EP"/>
                </div>
              </div>

              {/* Certification + statut */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <span style={s.lbl}>Certification</span>
                  <select style={s.sel} value={futForm.certif} onChange={e=>setFutForm(f=>({...f,certif:e.target.value}))}>
                    <option value="BIO">BIO</option>
                    <option value="NON BIO">NON BIO</option>
                    <option value="">-</option>
                  </select>
                </div>
                <div>
                  <span style={s.lbl}>Statut initial</span>
                  <select style={s.sel} value={futForm.statut} onChange={e=>setFutForm(f=>({...f,statut:e.target.value}))}>
                    <option value="actif">Actif</option>
                    <option value="surveillance">Surveillance</option>
                    <option value="vide">Vide</option>
                  </select>
                </div>
              </div>

              {/* Aperçu */}
              {futForm.id && futForm.volume && (
                <div style={{background:"#fffbf3",borderRadius:"5px",padding:"10px 14px",fontSize:"12px",color:"#6a5838",display:"flex",alignItems:"center",gap:"10px"}}>
                  {futForm.appellation && <span style={{width:"8px",height:"8px",borderRadius:"50%",background:getApc(futForm.appellation).color,flexShrink:0}}/>}
                  <span style={{color:"#1a1205",fontWeight:600}}>{futForm.id}</span>
                  <span>{futForm.denomination||"-"}</span>
                  {futForm.millesime && <span style={{color:"#7a6840"}}>· {futForm.millesime}</span>}
                  <span style={{marginLeft:"auto",color:"#b8860b",fontWeight:600}}>{futForm.volume} L</span>
                </div>
              )}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid #cfc0a0",paddingTop:"14px"}}>
                <div>
                  {editingFut && (
                    <button style={{...s.ghost,color:"#cc2222",borderColor:"#A32D2D33",fontSize:"12px"}} onClick={()=>deleteFut(editingFut.id)}>
                      <i className="ti ti-trash" style={{marginRight:"5px"}}/>Supprimer ce fût
                    </button>
                  )}
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  <button style={s.ghost} onClick={()=>{setShowFutForm(false);setEditingFut(null);}}>Annuler</button>
                  <button style={s.btn} onClick={submitFut}>
                    <i className="ti ti-check" style={{marginRight:"5px"}}/>
                    {editingFut ? "Enregistrer" : "Ajouter"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉINITIALISATION */}

      {/* == MODAL EDITION NOTE DEGUSTATION == */}
      {showEditDeg && editingNote && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"480px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>
                Modifier la note - {editingNote.degustateur}
              </div>
              <button style={s.ghost} onClick={()=>setShowEditDeg(false)}>x</button>
            </div>
            <div style={{fontSize:"12px",color:"#7a6840",marginBottom:"16px",padding:"8px 12px",background:"#fff8ee",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
              Fut <strong style={{color:"#b8860b"}}>{editingNote.futId}</strong> - Session <strong>{editingNote.session}</strong>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"12px"}}>
                <div><span style={s.lbl}>Boise /3</span>
                  <input type="number" min="0" max="3" step="0.5" style={s.inp} value={editNoteForm.boise} onChange={e=>setEditNoteForm(f=>({...f,boise:e.target.value}))}/></div>
                <div><span style={s.lbl}>Longueur /3</span>
                  <input type="number" min="0" max="3" step="0.5" style={s.inp} value={editNoteForm.longueur} onChange={e=>setEditNoteForm(f=>({...f,longueur:e.target.value}))}/></div>
                <div><span style={s.lbl}>Note globale /5</span>
                  <input type="number" min="0" max="5" step="0.5" style={s.inp} value={editNoteForm.noteG} onChange={e=>setEditNoteForm(f=>({...f,noteG:e.target.value}))}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Volume RI (HL)</span>
                  <input type="number" step="0.1" style={s.inp} placeholder="0" value={futForm.volumeRI||"0"} onChange={e=>setFutForm(f=>({...f,volumeRI:e.target.value}))}/></div>
                <div style={{paddingTop:"18px",fontSize:"11px",color:"#9a8870"}}>
                  {futForm.contenuActuel&&futForm.volumeRI?<span>Tirable : <strong style={{color:"#2d6a00"}}>{Math.max(0,(parseFloat(futForm.contenuActuel)||0)-(parseFloat(futForm.volumeRI)||0)).toFixed(1)} HL</strong></span>:null}
                </div>
              </div>
              <div><span style={s.lbl}>Commentaire</span>
                <textarea style={{...s.inp,height:"80px",resize:"vertical"}} value={editNoteForm.commentaire} onChange={e=>setEditNoteForm(f=>({...f,commentaire:e.target.value}))}/></div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowEditDeg(false)}>Annuler</button>
                <button style={s.btn} onClick={saveEditNote}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL CAMPAGNE == */}
      {showCampForm && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"460px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>Nouvelle campagne - {campFutId}</div>
              <button style={s.ghost} onClick={()=>setShowCampForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Annee de campagne *</span>
                  <input type="number" style={s.inp} placeholder="ex. 2025" value={campForm.annee} onChange={e=>setCampForm(f=>({...f,annee:e.target.value}))}/></div>
                <div><span style={s.lbl}>Millesime du vin</span>
                  <input type="number" style={s.inp} placeholder="ex. 2025" value={campForm.millesime} onChange={e=>setCampForm(f=>({...f,millesime:e.target.value}))}/></div>
              </div>
              <div><span style={s.lbl}>Denomination / Cuvee *</span>
                <input style={s.inp} placeholder="ex. FONTINETTE, ARPENTS ROUGE..." value={campForm.denomination} onChange={e=>setCampForm(f=>({...f,denomination:e.target.value}))}/></div>
              <div><span style={s.lbl}>Notes</span>
                <textarea style={{...s.inp,height:"64px",resize:"vertical"}} placeholder="Observations..." value={campForm.notes} onChange={e=>setCampForm(f=>({...f,notes:e.target.value}))}/></div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowCampForm(false)}>Annuler</button>
                <button style={s.btn} onClick={submitCampagne}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL PARCELLE == */}
      {showParcelleForm && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"560px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>{editingParcelle?"Modifier la parcelle":"Nouvelle parcelle"}</div>
              <button style={s.ghost} onClick={()=>setShowParcelleForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Nom de la parcelle *</span>
                  <input style={s.inp} placeholder="ex. Les Grouttes..." value={parcelleForm.nom} onChange={e=>setParcelleForm(f=>({...f,nom:e.target.value}))}/></div>
                <div><span style={s.lbl}>Certification</span>
                  <select style={s.sel} value={parcelleForm.certification||"BIO"} onChange={e=>setParcelleForm(f=>({...f,certification:e.target.value}))}>
                    <option value="BIO">BIO</option>
                    <option value="NON BIO">NON BIO</option>
                    <option value="C1">C1 (1ere annee conversion)</option>
                    <option value="C2">C2 (2eme annee conversion)</option>
                    <option value="C3">C3 (3eme annee conversion)</option>
                  </select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"12px"}}>
                <div><span style={s.lbl}>Cepage</span>
                  <input style={s.inp} placeholder="ex. Chardonnay..." value={parcelleForm.cepage} onChange={e=>setParcelleForm(f=>({...f,cepage:e.target.value}))}/></div>
                <div><span style={s.lbl}>Surface (ha)</span>
                  <input type="number" step="0.01" style={s.inp} placeholder="ex. 0.35" value={parcelleForm.surface} onChange={e=>setParcelleForm(f=>({...f,surface:e.target.value}))}/></div>
                <div><span style={s.lbl}>Commune / Lieu-dit</span>
                  <input style={s.inp} placeholder="ex. Vincelles..." value={parcelleForm.commune} onChange={e=>setParcelleForm(f=>({...f,commune:e.target.value}))}/></div>
              </div>
              <div><span style={s.lbl}>Observations</span>
                <textarea style={{...s.inp,height:"58px",resize:"vertical"}} placeholder="Notes sur la parcelle..." value={parcelleForm.observations||""} onChange={e=>setParcelleForm(f=>({...f,observations:e.target.value}))}/></div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowParcelleForm(false)}>Annuler</button>
                <button style={s.btn} onClick={submitParcelle}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL RENDEMENT == */}
      {showRendementForm&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"380px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>Rendement autorise</div>
              <button style={s.ghost} onClick={()=>setShowRendementForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Campagne</span>
                  <input type="number" style={s.inp} placeholder="2025" value={rendementForm.annee} onChange={e=>setRendementForm(f=>({...f,annee:e.target.value}))}/></div>
                <div><span style={s.lbl}>Rendement (kg/ha)</span>
                  <input type="number" style={s.inp} placeholder="10000" value={rendementForm.rendementAutorise} onChange={e=>setRendementForm(f=>({...f,rendementAutorise:e.target.value}))}/></div>
              </div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowRendementForm(false)}>Annuler</button>
                <button style={s.btn} onClick={()=>{
                  if(!rendementForm.annee||!rendementForm.rendementAutorise) return alert("Tous les champs sont requis.");
                  const existing = rendementsAnnuels.find(r=>r.annee===rendementForm.annee);
                  if(existing) {
                    const updated = {...existing,...rendementForm};
                    setRendementsAnnuels(prev=>prev.map(r=>r.annee===rendementForm.annee?updated:r));
                    fbSave("rendements",updated.id,updated);
                  } else {
                    const r = {id:"rend_"+Date.now(),...rendementForm,timestamp:new Date().toISOString()};
                    setRendementsAnnuels(prev=>[r,...prev]);
                    fbSave("rendements",r.id,r);
                  }
                  setShowRendementForm(false);
                }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL VENDANGE == */}
      {showVendangeForm && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"680px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#7a5200"}}>{editingVendange?"Modifier l'entree":"Nouvelle entree de vendange"}</div>
              <button style={s.ghost} onClick={()=>{setShowVendangeForm(false);setEditingVendange(null);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"14px"}}>
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"10px"}}>Identification</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"12px"}}>
                  <div><span style={s.lbl}>Annee *</span>
                    <input type="number" style={s.inp} value={vendangeForm.annee} onChange={e=>setVendangeForm(f=>({...f,annee:e.target.value}))}/></div>
                  <div><span style={s.lbl}>Date *</span>
                    <input type="date" style={s.inp} value={vendangeForm.date} onChange={e=>setVendangeForm(f=>({...f,date:e.target.value}))}/></div>
                  <div><span style={s.lbl}>Heure</span>
                    <input type="time" style={s.inp} value={vendangeForm.heure||""} onChange={e=>setVendangeForm(f=>({...f,heure:e.target.value}))}/></div>
                  <div><span style={s.lbl}>Cuvee creee</span>
                    <input style={s.inp} placeholder="ex. Blanc de Blancs 2025" value={vendangeForm.cuveeCreee||""} onChange={e=>setVendangeForm(f=>({...f,cuveeCreee:e.target.value}))}/></div>
                  <div><span style={s.lbl}>Heure *</span>
                    <select style={s.sel} value={vendangeForm.operateur} onChange={e=>setVendangeForm(f=>({...f,operateur:e.target.value}))}>
                      <option value="">Selectionner...</option>
                      {degustateurs.map(d=><option key={d.nom} value={d.nom}>{d.nom}</option>)}
                    </select></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 140px",gap:"12px",marginTop:"10px"}}>
                  <div><span style={s.lbl}>Parcelle(s) *</span>
                    <div style={{border:"0.5px solid #d4c4a0",borderRadius:"6px",padding:"6px",maxHeight:"120px",overflowY:"auto",background:"#fff"}}>
                      {parcelles.length===0&&<div style={{fontSize:"11px",color:"#cc2222"}}>Aucune parcelle.</div>}
                      {parcelles.map(p=>{
                        const ids = vendangeForm.parcelleIds||[];
                        const checked = ids.includes(p.id)||vendangeForm.parcelleId===p.id;
                        return (
                          <label key={p.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"3px 4px",cursor:"pointer",borderRadius:"3px",background:checked?"#f5e8cc":"transparent"}}>
                            <input type="checkbox" checked={checked} onChange={e=>{
                              const ids = vendangeForm.parcelleIds||[];
                              const newIds = e.target.checked ? [...ids,p.id] : ids.filter(x=>x!==p.id);
                              setVendangeForm(f=>({...f,parcelleIds:newIds,parcelleId:newIds[0]||""}));
                            }}/>
                            <span style={{fontSize:"12px"}}>{p.nom}{p.cepage?` - ${p.cepage}`:""}{p.surface?` (${p.surface} ha)`:""}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div><span style={s.lbl}>N° Marc</span>
                    <input type="number" style={s.inp} placeholder="ex. 5" value={vendangeForm.numeroMarc||""} onChange={e=>setVendangeForm(f=>({...f,numeroMarc:e.target.value}))}/>
                    <div style={{fontSize:"10px",color:"#9a8870",marginTop:"3px"}}>Suit le tonneau</div>
                  </div>
                </div>
              </div>
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"10px"}}>Volume et analyses</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:"10px"}}>
                  <div><span style={s.lbl}>Volume (HL)</span>
                    <input type="number" style={{...s.inp,fontWeight:500,color:"#2d6a00"}} placeholder="0" value={vendangeForm.volumeHL||""}
                      onChange={e=>{const hl=parseFloat(e.target.value)||0;const kg=hl>0?Math.round(hl/25.5*4000):"";setVendangeForm(f=>({...f,volumeHL:e.target.value,poidsMarcKg:kg?String(kg):f.poidsMarcKg}));}}/></div>
                  <div><span style={s.lbl}>Poids marc (kg)</span>
                    <input type="number" style={{...s.inp,fontWeight:500,color:"#2d6a00"}} placeholder="4000" value={vendangeForm.poidsMarcKg||""}
                      onChange={e=>{const kg=parseFloat(e.target.value)||0;const hl=kg>0?Math.ceil(kg/4000*25.5*100)/100:"";setVendangeForm(f=>({...f,poidsMarcKg:e.target.value,volumeHL:hl?String(hl):f.volumeHL}));}}/></div>
                  <div><span style={s.lbl}>Degre pot. (%)</span>
                    <input type="number" step="0.1" style={s.inp} placeholder="0.0" value={vendangeForm.degreePotentiel} onChange={e=>setVendangeForm(f=>({...f,degreePotentiel:e.target.value}))}/></div>
                  <div><span style={s.lbl}>Acidite (g/L)</span>
                    <input type="number" step="0.1" style={s.inp} placeholder="0.0" value={vendangeForm.acidite} onChange={e=>setVendangeForm(f=>({...f,acidite:e.target.value}))}/></div>
                  <div><span style={s.lbl}>SO2 (mg/L)</span>
                    <input type="number" style={s.inp} placeholder="0" value={vendangeForm.so2} onChange={e=>setVendangeForm(f=>({...f,so2:e.target.value}))}/></div>
                  <div><span style={s.lbl}>pH</span>
                    <input type="number" step="0.01" style={s.inp} placeholder="3.10" value={vendangeForm.ph||""} onChange={e=>setVendangeForm(f=>({...f,ph:e.target.value}))}/></div>
                </div>
              </div>
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{marginTop:"10px"}}>
                  <div style={{...s.lbl,marginBottom:"8px"}}>Repartition en cuves</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"8px"}}>
                    <div><span style={s.lbl}>Cuve Taille</span>
                      <select style={s.sel} value={vendangeForm.cuveTailleId||""} onChange={e=>setVendangeForm(f=>({...f,cuveTailleId:e.target.value}))}>
                        <option value="">Selectionner...</option>
                        {cuvesCuverie.filter(c=>c.type!=="bourbes"&&(parseFloat(c.volumeHL)||0)-(parseFloat(c.contenuActuelHL)||0)>0).map(c=><option key={c.id} value={c.id}>{c.nom} - {c.type} (dispo: {((parseFloat(c.volumeHL)||0)-(parseFloat(c.contenuActuelHL)||0)).toFixed(1)} HL)</option>)}
                      </select></div>
                    <div><span style={s.lbl}>Volume taille (HL)</span>
                      <input type="number" step="0.1" style={s.inp} placeholder="0" value={vendangeForm.volumeTaille||""} onChange={e=>setVendangeForm(f=>({...f,volumeTaille:e.target.value}))}/></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                    <div><span style={s.lbl}>Cuve Cuvee A</span>
                      <select style={s.sel} value={vendangeForm.cuveCuveeId||""} onChange={e=>setVendangeForm(f=>({...f,cuveCuveeId:e.target.value}))}>
                        <option value="">Selectionner...</option>
                        {cuvesCuverie.filter(c=>c.type!=="bourbes"&&(parseFloat(c.volumeHL)||0)-(parseFloat(c.contenuActuelHL)||0)>0).map(c=><option key={c.id} value={c.id}>{c.nom} - {c.type} (dispo: {((parseFloat(c.volumeHL)||0)-(parseFloat(c.contenuActuelHL)||0)).toFixed(1)} HL)</option>)}
                      </select></div>
                    <div><span style={s.lbl}>Volume cuvee A (HL)</span>
                      <input type="number" step="0.1" style={s.inp} placeholder="0" value={vendangeForm.volumeCuvee||""} onChange={e=>setVendangeForm(f=>({...f,volumeCuvee:e.target.value}))}/></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"8px"}}>
                    <div><span style={s.lbl}>Cuve Cuvee B</span>
                      <select style={s.sel} value={vendangeForm.cuveCuveeBId||""} onChange={e=>setVendangeForm(f=>({...f,cuveCuveeBId:e.target.value}))}>
                        <option value="">Selectionner...</option>
                        {cuvesCuverie.filter(c=>c.type!=="bourbes"&&(parseFloat(c.volumeHL)||0)-(parseFloat(c.contenuActuelHL)||0)>0).map(c=><option key={c.id} value={c.id}>{c.nom} - {c.type} (dispo: {((parseFloat(c.volumeHL)||0)-(parseFloat(c.contenuActuelHL)||0)).toFixed(1)} HL)</option>)}
                      </select></div>
                    <div><span style={s.lbl}>Volume cuvee B (HL)</span>
                      <input type="number" step="0.1" style={s.inp} placeholder="0" value={vendangeForm.volumeCuveeB||""} onChange={e=>setVendangeForm(f=>({...f,volumeCuveeB:e.target.value}))}/></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"8px",borderTop:"0.5px dashed #d4c4a0",paddingTop:"8px"}}>
                    <div><span style={s.lbl}>Cuve Bourbes (optionnel)</span>
                      <select style={s.sel} value={vendangeForm.cuveBourbesId||""} onChange={e=>setVendangeForm(f=>({...f,cuveBourbesId:e.target.value}))}>
                        <option value="">Aucune</option>
                        {cuvesCuverie.filter(c=>c.type==="bourbes").map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select></div>
                    <div><span style={s.lbl}>Volume bourbes (HL)</span>
                      <input type="number" step="0.1" style={s.inp} placeholder="0" value={vendangeForm.volumeBourbes||""} onChange={e=>setVendangeForm(f=>({...f,volumeBourbes:e.target.value}))}/></div>
                  </div>
                </div>
              </div>
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                  <span style={s.lbl}>Produits ajoutes</span>
                  <button style={s.btnSm} onClick={()=>setShowProduitVendange(true)}>+ Ajouter</button>
                </div>
                {vendangeForm.produitsAjoutes.length===0&&<div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Aucun produit ajoute.</div>}
                {vendangeForm.produitsAjoutes.map((p,i)=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"5px 0",borderBottom:"0.5px solid #ede5d4",fontSize:"12px"}}>
                    <span style={{fontWeight:500,color:"#7a5200",flex:1}}>{p.nom}</span>
                    {p.dose&&<span style={{color:"#9a8870"}}>{p.dose}</span>}
                    {p.lot&&<span style={{background:"#fff8ee",border:"0.5px solid #d4c4a0",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",color:"#7a5200",fontFamily:"monospace"}}>Lot: {p.lot}</span>}
                    <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4",padding:"2px 6px"}}
                      onClick={()=>setVendangeForm(f=>({...f,produitsAjoutes:f.produitsAjoutes.filter((_,j)=>j!==i)}))}>x</button>
                  </div>
                ))}
                {showProduitVendange&&(
                  <div style={{marginTop:"10px",padding:"10px",background:"#fffdf7",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:"8px",alignItems:"end"}}>
                      <div><span style={s.lbl}>Produit *</span>
                        <input style={s.inp} placeholder="SO2, levures..." value={produitVendangeForm.nom} onChange={e=>setProduitVendangeForm(f=>({...f,nom:e.target.value}))}/></div>
                      <div><span style={s.lbl}>Dose</span>
                        <input style={s.inp} placeholder="ex. 5g/hL" value={produitVendangeForm.dose} onChange={e=>setProduitVendangeForm(f=>({...f,dose:e.target.value}))}/></div>
                      <div><span style={s.lbl}>N° Lot</span>
                        <input style={s.inp} placeholder="LOT-..." value={produitVendangeForm.lot} onChange={e=>setProduitVendangeForm(f=>({...f,lot:e.target.value}))}/></div>
                      <div><span style={s.lbl}>Date ajout</span>
                        <input type="date" style={s.inp} value={produitVendangeForm.date} onChange={e=>setProduitVendangeForm(f=>({...f,date:e.target.value}))}/></div>
                      <div style={{display:"flex",gap:"4px"}}>
                        <button style={s.btnSm} onClick={addProduitVendange}>OK</button>
                        <button style={s.ghostSm} onClick={()=>setShowProduitVendange(false)}>x</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div><span style={s.lbl}>Observations</span>
                <textarea style={{...s.inp,height:"64px",resize:"vertical"}} placeholder="Etat sanitaire, conditions..." value={vendangeForm.observations} onChange={e=>setVendangeForm(f=>({...f,observations:e.target.value}))}/></div>
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"10px"}}>Destination du marc</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                  <div><span style={s.lbl}>Destination</span>
                    <select style={s.sel} value={vendangeForm.destinationMarc||"maison"} onChange={e=>setVendangeForm(f=>({...f,destinationMarc:e.target.value}))}>
                      <option value="maison">Vinification maison</option>
                      <option value="negoce_total">Vente negoce (total)</option>
                      <option value="negoce_partiel">Vente negoce (partiel)</option>
                    </select></div>
                  {(vendangeForm.destinationMarc==="negoce_total"||vendangeForm.destinationMarc==="negoce_partiel")&&(
                    <div><span style={s.lbl}>N° DAE</span>
                      <input style={s.inp} placeholder="DAE-2025-001" value={vendangeForm.numeroDAE||""} onChange={e=>setVendangeForm(f=>({...f,numeroDAE:e.target.value}))}/></div>
                  )}
                  {vendangeForm.destinationMarc==="negoce_partiel"&&(
                    <div><span style={s.lbl}>Kg vendus negoce</span>
                      <input type="number" style={s.inp} placeholder="2000" value={vendangeForm.kgVendusNegoce||""} onChange={e=>setVendangeForm(f=>({...f,kgVendusNegoce:e.target.value}))}/></div>
                  )}
                </div>
                {(vendangeForm.destinationMarc==="negoce_total"||vendangeForm.destinationMarc==="negoce_partiel")&&(
                  <div style={{marginTop:"10px",padding:"10px",background:"#fff3cd",borderRadius:"6px",border:"0.5px solid #e8c888"}}>
                    <div style={{fontSize:"11px",color:"#c47800",marginBottom:"6px"}}>Ce volume sera sorti definitivement du stock et ne pourra pas etre utilise.</div>
                    <button style={{...s.ghostSm,color:"#c47800",borderColor:"#e8c888"}} onClick={()=>{
                      const kg = vendangeForm.destinationMarc==="negoce_total" ? parseFloat(vendangeForm.poidsMarcKg)||0 : parseFloat(vendangeForm.kgVendusNegoce)||0;
                      const hl = Math.ceil(kg/4000*25.5*100)/100;
                      const mvtId = "negoce_sortie_"+Date.now();
                      const mvt = {id:mvtId, type:"sortie_negoce", date:vendangeForm.date||new Date().toISOString().slice(0,10), kgVendus:kg, volumeHL:hl, numeroDAE:vendangeForm.numeroDAE||"", annee:vendangeForm.annee, notes:"Vente negoce marc", timestamp:new Date().toISOString()};
                      setMouvements(prev=>[mvt,...prev]);
                      fbSave("mouvements", mvtId, mvt);
                      alert("Sortie negoce enregistree: "+kg+" kg / "+hl+" HL");
                    }}>Enregistrer sortie negoce ({Math.ceil((vendangeForm.destinationMarc==="negoce_total"?parseFloat(vendangeForm.poidsMarcKg)||0:parseFloat(vendangeForm.kgVendusNegoce)||0)/4000*25.5*100)/100} HL)</button>
                  </div>
                )}

              </div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>{setShowVendangeForm(false);setEditingVendange(null);}}>Annuler</button>
                <button style={s.btn} onClick={submitVendange}>{editingVendange?"Sauvegarder":"Enregistrer l'apport"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL STOCK PRODUIT == */}
      {showStockProdForm && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"580px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>{editingStockProd?"Modifier le produit":"Nouveau produit"}</div>
              <button style={s.ghost} onClick={()=>{setShowStockProdForm(false);setEditingStockProd(null);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Nom commercial *</span>
                   <input style={s.inp} placeholder="ex. Bouillie Bordelaise RSR..." value={produitForm.nom} onChange={e=>setProduitForm(f=>({...f,nom:e.target.value}))}/></div>
                <div><span style={s.lbl}>N° AMM</span>
                   <input style={s.inp} placeholder="ex. 9800474" value={produitForm.nAmm||""} onChange={e=>setProduitForm(f=>({...f,nAmm:e.target.value}))}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Substance active</span>
                  <select style={s.sel} value={produitForm.substanceActive||"Cuivre"} onChange={e=>setProduitForm(f=>({...f,substanceActive:e.target.value}))}>
                    <option value="Cuivre">Cuivre</option>
                    <option value="Soufre">Soufre</option>
                    <option value="Pyrethrine">Pyrethrine</option>
                    <option value="Bicarbonate">Bicarbonate</option>
                    <option value="Autre">Autre</option>
                  </select></div>
                <div><span style={s.lbl}>Teneur Cu (g/kg ou g/L)</span>
                  <input type="number" step="1" style={s.inp} placeholder="ex. 200" value={produitForm.teneurCuivre||""} onChange={e=>setProduitForm(f=>({...f,teneurCuivre:e.target.value}))}/>
                  {produitForm.teneurCuivre&&<div style={{fontSize:"10px",color:"#c47800",marginTop:"2px"}}>= {Math.round(parseFloat(produitForm.teneurCuivre)/10)}% de cuivre</div>}
                </div>
                <div><span style={s.lbl}>Unite</span>
                  <select style={s.sel} value={produitForm.unite||"kg"} onChange={e=>setProduitForm(f=>({...f,unite:e.target.value}))}>
                    <option value="kg">kg</option><option value="L">L</option><option value="g">g</option>
                  </select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Stock actuel ({produitForm.unite||"kg"})</span>
                   <input type="number" step="0.1" style={s.inp} placeholder="0" value={produitForm.stockActuel||""} onChange={e=>setProduitForm(f=>({...f,stockActuel:e.target.value}))}/></div>
                <div><span style={s.lbl}>Fournisseur</span>
                   <input style={s.inp} placeholder="ex. Nufarm..." value={produitForm.fournisseur||""} onChange={e=>setProduitForm(f=>({...f,fournisseur:e.target.value}))}/></div>
                <div><span style={s.lbl}>Observations</span>
                   <input style={s.inp} placeholder="Notes..." value={produitForm.observations||""} onChange={e=>setProduitForm(f=>({...f,observations:e.target.value}))}/></div>
              </div>
              {parseFloat(produitForm.teneurCuivre)>0&&(
                <div style={{background:"#fde8b8",borderRadius:"6px",padding:"10px 14px",fontSize:"12px",color:"#7a5200"}}>
                  <strong>Exemple :</strong> 500g/ha x 9ha = 4500g produit x {Math.round(parseFloat(produitForm.teneurCuivre)/10)}% = <strong>{Math.round(500*(parseFloat(produitForm.teneurCuivre)/1000)*9)}g de cuivre total</strong>
                </div>
              )}
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>{setShowStockProdForm(false);setEditingStockProd(null);}}>Annuler</button>
                <button style={s.btn} onClick={submitStockProduit}>{editingStockProd?"Sauvegarder":"Enregistrer"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL BIODYNAMIE == */}
      {showBiodyForm && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"500px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>{editingBiody?"Modifier le passage":"Nouveau passage biodynamique"}</div>
              <button style={s.ghost} onClick={()=>{setShowBiodyForm(false);setEditingBiody(null);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Campagne</span>
                  <input type="number" style={s.inp} value={biodyForm.campagne} onChange={e=>setBiodyForm(f=>({...f,campagne:e.target.value}))}/></div>
                <div><span style={s.lbl}>Date *</span>
                  <input type="date" style={s.inp} value={biodyForm.date} onChange={e=>setBiodyForm(f=>({...f,date:e.target.value}))}/></div>
                <div><span style={s.lbl}>Surface</span>
                  <input style={s.inp} placeholder="ex. 9.90 ha" value={biodyForm.surface} onChange={e=>setBiodyForm(f=>({...f,surface:e.target.value}))}/></div>
              </div>
              <div><span style={s.lbl}>Produit *</span>
                <select style={s.sel} value={biodyForm.produit} onChange={e=>setBiodyForm(f=>({...f,produit:e.target.value}))}>
                  <option value="">Selectionner...</option>
                  <option value="500 P">500 P (Bouse de corne)</option>
                  <option value="501">501 (Silice de corne)</option>
                  <option value="Prele de Paques">Prele de Paques</option>
                  <option value="Silice">Silice</option>
                  <option value="Autre">Autre</option>
                </select></div>
              <div><span style={s.lbl}>Observations</span>
                <textarea style={{...s.inp,height:"60px",resize:"vertical"}} value={biodyForm.observations} onChange={e=>setBiodyForm(f=>({...f,observations:e.target.value}))}/></div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>{setShowBiodyForm(false);setEditingBiody(null);}}>Annuler</button>
                <button style={s.btn} onClick={submitBiody}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL AMENDEMENT == */}
      {showAmendForm && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"580px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>{editingAmend?"Modifier l'amendement":"Nouvel amendement"}</div>
              <button style={s.ghost} onClick={()=>{setShowAmendForm(false);setEditingAmend(null);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Campagne</span>
                  <input type="number" style={s.inp} value={amendForm.campagne} onChange={e=>setAmendForm(f=>({...f,campagne:e.target.value}))}/></div>
                <div><span style={s.lbl}>Parcelle *</span>
                  <select style={s.sel} value={amendForm.parcelle} onChange={e=>setAmendForm(f=>({...f,parcelle:e.target.value}))}>
                    <option value="">Selectionner...</option>
                    {parcelles.length>0 ? parcelles.map(p=><option key={p.id} value={p.nom}>{p.nom}</option>) :
                      ["La Fontinette","Bauchet Thomas PN","Les Garennes","La Tuilerie","Arpent Rouge","Les Maisons Brulees","Les Terres Bleues","Bellevue","Laurinette","Branscourt","Try","Festigny","Vincelles"].map(n=><option key={n} value={n}>{n}</option>)
                    }
                  </select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Surface (ha)</span>
                  <input type="number" step="0.001" style={s.inp} placeholder="ex. 0.318" value={amendForm.surface} onChange={e=>setAmendForm(f=>({...f,surface:e.target.value}))}/></div>
                <div><span style={s.lbl}>Produit</span>
                  <select style={s.sel} value={amendForm.produit} onChange={e=>setAmendForm(f=>({...f,produit:e.target.value}))}>
                    <option value="">Selectionner...</option>
                    <option value="Activor">Activor</option>
                    <option value="Phenix">Phenix</option>
                    <option value="Bio3G">Bio3G</option>
                    <option value="Composte Biodynamique">Composte Biodynamique</option>
                    <option value="Biofumur AB2F">Biofumur AB2F</option>
                    <option value="ActiVert+">ActiVert+</option>
                    <option value="Autre">Autre</option>
                  </select></div>
                <div><span style={s.lbl}>Quantite</span>
                  <input style={s.inp} placeholder="ex. 324.5 kg" value={amendForm.quantite} onChange={e=>setAmendForm(f=>({...f,quantite:e.target.value}))}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>N total (kg)</span>
                  <input type="number" step="0.01" style={s.inp} value={amendForm.nTotal} onChange={e=>setAmendForm(f=>({...f,nTotal:e.target.value}))}/></div>
                <div><span style={s.lbl}>N / ha</span>
                  <input type="number" step="0.01" style={s.inp} value={amendForm.nParHa} onChange={e=>setAmendForm(f=>({...f,nParHa:e.target.value}))}/></div>
              </div>
              <div><span style={s.lbl}>Observations</span>
                <textarea style={{...s.inp,height:"58px",resize:"vertical"}} value={amendForm.observations} onChange={e=>setAmendForm(f=>({...f,observations:e.target.value}))}/></div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>{setShowAmendForm(false);setEditingAmend(null);}}>Annuler</button>
                <button style={s.btn} onClick={submitAmend}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL TRAITEMENT == */}
      {showTraitForm && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"620px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#7a5200"}}>{editingTrait?"Modifier le traitement":"Nouveau traitement"}</div>
              <button style={s.ghost} onClick={()=>{setShowTraitForm(false);setEditingTrait(null);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"12px"}}>
                <div><span style={s.lbl}>Campagne *</span>
                  <input type="number" style={s.inp} placeholder="2026" value={traitForm.campagne} onChange={e=>setTraitForm(f=>({...f,campagne:e.target.value}))}/></div>
                <div><span style={s.lbl}>N° traitement</span>
                  <input style={s.inp} placeholder="ex. 7" value={traitForm.numero} onChange={e=>setTraitForm(f=>({...f,numero:e.target.value}))}/></div>
                <div><span style={s.lbl}>Date *</span>
                  <input type="date" style={s.inp} value={traitForm.date} onChange={e=>setTraitForm(f=>({...f,date:e.target.value}))}/></div>
                <div><span style={s.lbl}>Surface (ha)</span>
                  <input style={s.inp} placeholder="ex. 8.68 ha" value={traitForm.surface} onChange={e=>setTraitForm(f=>({...f,surface:e.target.value}))}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Cu total (g/ha) - auto si vide</span>
                  <input type="number" style={s.inp}
                    placeholder={String(traitForm.produits.reduce((s,p)=>s+(parseFloat(p.cuivre)||0),0)||"ex. 300")}
                    value={traitForm.cuivreTotal}
                    onChange={e=>setTraitForm(f=>({...f,cuivreTotal:e.target.value}))}/></div>
                <div><span style={s.lbl}>Operateur</span>
                  <select style={s.sel} value={traitForm.operateur} onChange={e=>setTraitForm(f=>({...f,operateur:e.target.value}))}>
                    <option value="">Selectionner...</option>
                    {degustateurs.map(d=><option key={d.nom} value={d.nom}>{d.nom}</option>)}
                  </select></div>
              </div>

              {/* Produits */}
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"12px",border:"0.5px solid #d4c4a0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                  <span style={s.lbl}>Produits utilises</span>
                  <button style={s.btnSm} onClick={()=>setShowTraitProduit(true)}>+ Ajouter</button>
                </div>
                {traitForm.produits.length===0&&<div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Aucun produit.</div>}
                {traitForm.produits.map((p,i)=>(
                  <div key={p.id||i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"5px 0",borderBottom:"0.5px solid #ede5d4",fontSize:"12px"}}>
                    <span style={{background:p.matiereActive==="Cuivre"?"#fde8b8":p.matiereActive==="Soufre"?"#e6f0fb":"#ede5d4",color:p.matiereActive==="Cuivre"?"#7a5200":"#185FA5",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",fontFamily:"monospace"}}>{p.matiereActive||"-"}</span>
                    <span style={{fontWeight:500,color:"#1a1205",flex:1}}>{p.nom}</span>
                    <span style={{color:"#9a8870",fontSize:"11px"}}>{p.dose}</span>
                    {(parseFloat(p.cuivre)||0)>0&&<span style={{color:"#c47800",fontFamily:"monospace",fontSize:"11px",fontWeight:500}}>{p.cuivre}g Cu/ha</span>}
                    <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4",padding:"2px 5px"}}
                      onClick={()=>setTraitForm(f=>({...f,produits:f.produits.filter((_,j)=>j!==i)}))}>x</button>
                  </div>
                ))}
                {/* Total cuivre calcule */}
                {traitForm.produits.some(p=>(parseFloat(p.cuivre)||0)>0)&&(
                  <div style={{marginTop:"8px",padding:"8px 10px",background:"#fde8b8",borderRadius:"5px",display:"flex",gap:"16px",flexWrap:"wrap",fontSize:"12px"}}>
                    <span style={{color:"#7a5200",fontWeight:500}}>Total cuivre :</span>
                    <span style={{color:"#c47800",fontFamily:"monospace",fontWeight:500}}>
                      {traitForm.produits.reduce((s,p)=>s+(parseFloat(p.cuivre)||0),0)} g/ha
                    </span>
                    {traitForm.surface&&(
                      <span style={{color:"#7a5200",fontFamily:"monospace"}}>
                        sur {traitForm.surface} = {Math.round(traitForm.produits.reduce((s,p)=>s+(parseFloat(p.cuivre)||0),0)*(parseFloat(traitForm.surface)||0))} g total
                      </span>
                    )}
                  </div>
                )}
                {showTraitProduit&&(
                  <div style={{marginTop:"10px",padding:"12px",background:"#fffdf7",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
                    <div style={{...s.lbl,marginBottom:"8px"}}>Depuis le stock produits :</div>
                    {stockProduits.length>0&&(
                      <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginBottom:"10px"}}>
                        {stockProduits.map((sp,i)=>(
                          <button key={i} style={{background:"#fff8ee",border:"0.5px solid #d4c4a0",borderRadius:"4px",padding:"4px 8px",fontSize:"10px",cursor:"pointer",color:"#7a5200",fontFamily:"monospace"}}
                            onClick={()=>setTraitProduit(f=>({...f,
                              nom:sp.nom,
                              matiereActive:sp.substanceActive||sp.matiereActive||"Cuivre",
                              teneurCuivre:String(parseFloat(sp.teneurCuivre)||0),
                              unite:sp.unite||"kg",
                              cuivre:"",  // sera calcule depuis dose*teneur
                            }))}>
                            <span style={{background:(sp.substanceActive||sp.matiereActive)==="Cuivre"?"#fde8b8":"#e6f0fb",color:(sp.substanceActive||sp.matiereActive)==="Cuivre"?"#7a5200":"#185FA5",borderRadius:"2px",padding:"0 3px",fontSize:"9px",marginRight:"3px"}}>{sp.substanceActive||sp.matiereActive}</span>
                            {sp.nom}
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 1fr auto",gap:"8px",alignItems:"end"}}>
                      <div><span style={s.lbl}>Produit *</span>
                        <input style={s.inp} placeholder="Bouillie Bordelaise..." value={traitProduit.nom} onChange={e=>setTraitProduit(f=>({...f,nom:e.target.value}))}/></div>
                      <div><span style={s.lbl}>Dose /ha</span>
                        <input type="number" step="0.001" style={s.inp} placeholder="ex. 0.5" value={traitProduit.dose}
                          onChange={e=>{
                            const d=e.target.value;
                            const t=parseFloat(traitProduit.teneurCuivre)||0;
                            const cu = t>0 ? Math.round(parseFloat(d)*t) : parseFloat(traitProduit.cuivre)||0;
                            setTraitProduit(f=>({...f,dose:d,cuivre:t>0?String(cu):f.cuivre}));
                          }}/></div>
                      <div><span style={s.lbl}>Unite</span>
                        <select style={s.sel} value={traitProduit.unite||"kg"} onChange={e=>setTraitProduit(f=>({...f,unite:e.target.value}))}>
                          <option value="kg">kg</option><option value="L">L</option><option value="g">g</option>
                        </select></div>
                      <div>
                        <span style={s.lbl}>Cu calcule (g/ha)</span>
                        <input type="number" step="1" style={{...s.inp,background:parseFloat(traitProduit.teneurCuivre)>0?"#fff8ee":"white"}}
                          placeholder="auto ou manuel"
                          value={traitProduit.cuivre}
                          onChange={e=>setTraitProduit(f=>({...f,cuivre:e.target.value}))}/>
                        {traitProduit.dose&&traitProduit.teneurCuivre&&(
                          <div style={{fontSize:"10px",color:"#c47800",marginTop:"2px",fontFamily:"monospace"}}>
                            {traitProduit.dose}kg x {traitProduit.teneurCuivre}g/kg = {Math.round(parseFloat(traitProduit.dose)*parseFloat(traitProduit.teneurCuivre))}g Cu/ha
                            {traitForm.surface&&` x ${traitForm.surface}ha = ${Math.round(parseFloat(traitProduit.dose)*parseFloat(traitProduit.teneurCuivre)*parseFloat(traitForm.surface))}g total`}
                          </div>
                        )}
                      </div>
                      <div style={{display:"flex",gap:"4px",alignItems:"flex-end",paddingBottom:"2px"}}>
                        <button style={s.btnSm} onClick={addTraitProduit}>OK</button>
                        <button style={s.ghostSm} onClick={()=>setShowTraitProduit(false)}>x</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div><span style={s.lbl}>Observations</span>
                <textarea style={{...s.inp,height:"60px",resize:"vertical"}} placeholder="Conditions meteorologiques, evenements..." value={traitForm.observations} onChange={e=>setTraitForm(f=>({...f,observations:e.target.value}))}/></div>

              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>{setShowTraitForm(false);setEditingTrait(null);}}>Annuler</button>
                <button style={s.btn} onClick={submitTraitement}>{editingTrait?"Sauvegarder":"Enregistrer"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL DEGORGEMENT == */}
      {showDegorgeForm && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"680px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#7a5200"}}>{editingDegorge?"Modifier le mouvement":"Nouveau mouvement de lot"}</div>
              <button style={s.ghost} onClick={()=>{setShowDegorgeForm(false);setEditingDegorge(null);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"14px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"12px"}}>
                <div><span style={s.lbl}>Lot *</span>
                  <select style={s.sel} value={degorgeForm.lotId} onChange={e=>setDegorgeForm(f=>({...f,lotId:e.target.value}))}>
                    <option value="">Selectionner un lot...</option>
                    {getLots().map(l=>(
                      <option key={l.id} value={l.id}>{l.cuvee} {l.millesime} - {l.formatLabel} ({l.qteActuelle} btl) {l.lot?`[${l.lot}]`:""}</option>
                    ))}
                  </select></div>
                <div><span style={s.lbl}>Date *</span>
                  <input type="date" style={s.inp} value={degorgeForm.date} onChange={e=>setDegorgeForm(f=>({...f,date:e.target.value}))}/></div>
                <div><span style={s.lbl}>Operateur *</span>
                  <select style={s.sel} value={degorgeForm.operateur} onChange={e=>setDegorgeForm(f=>({...f,operateur:e.target.value}))}>
                    <option value="">Selectionner...</option>
                    {degustateurs.map(d=><option key={d.nom} value={d.nom}>{d.nom}</option>)}
                  </select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Nouveau statut *</span>
                  <select style={s.sel} value={degorgeForm.statut} onChange={e=>setDegorgeForm(f=>({...f,statut:e.target.value}))}>
                    {STATUTS_BOUTEILLES.map(st=><option key={st} value={st}>{st}</option>)}
                  </select></div>
                <div><span style={s.lbl}>Deplacement vers</span>
                  <select style={s.sel} value={degorgeForm.lieuArrivee} onChange={e=>setDegorgeForm(f=>({...f,lieuArrivee:e.target.value}))}>
                    {LIEUX_STOCK.map(l=><option key={l} value={l}>{l}</option>)}
                  </select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"12px"}}>
                <div><span style={s.lbl}>Dosage (g/L)</span>
                  <input type="number" step="0.1" style={s.inp} placeholder="ex. 8.5" value={degorgeForm.dosageLiqueur} onChange={e=>setDegorgeForm(f=>({...f,dosageLiqueur:e.target.value}))}/></div>
                <div><span style={s.lbl}>Description liqueur</span>
                  <input style={s.inp} placeholder="ex. Brut, Demi-sec..." value={degorgeForm.descriptionDosage} onChange={e=>setDegorgeForm(f=>({...f,descriptionDosage:e.target.value}))}/></div>
                <div><span style={s.lbl}>Quantite a deplacer</span>
                  <input type="number" style={s.inp} placeholder="Tout le lot" value={degorgeForm.qte} onChange={e=>setDegorgeForm(f=>({...f,qte:e.target.value}))}/></div>
                <div><span style={s.lbl}>Pertes (bouteilles)</span>
                  <input type="number" style={s.inp} placeholder="0" value={degorgeForm.pertes} onChange={e=>setDegorgeForm(f=>({...f,pertes:e.target.value}))}/></div>
              </div>
              <div><span style={s.lbl}>Notes</span>
                <textarea style={{...s.inp,height:"58px",resize:"vertical"}} value={degorgeForm.notes} onChange={e=>setDegorgeForm(f=>({...f,notes:e.target.value}))}/></div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>{setShowDegorgeForm(false);setEditingDegorge(null);}}>Annuler</button>
                <button style={s.btn} onClick={submitDegorgement}>{editingDegorge?"Sauvegarder":"Enregistrer"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL SORTIE STOCK == */}
      {showSortieForm&&(()=>{
        const lotSortie = stockBouteilles.find(l=>l.id===sortieForm.lotId);
        return (
          <div style={s.modal}>
            <div style={{...s.modalBox,width:"440px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
                <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>Sortie de stock / Vente</div>
                <button style={s.ghost} onClick={()=>setShowSortieForm(false)}>x</button>
              </div>
              <div style={{...s.card,marginBottom:"16px",padding:"12px",background:"#fff8ee"}}>
                <div style={{fontWeight:500,color:"#1a1205"}}>{sortieForm.cuvee} {sortieForm.millesime}</div>
                <div style={{fontSize:"12px",color:"#9a8870"}}>{sortieForm.format} - Stock actuel: <strong>{sortieForm.qteMax}</strong> btl</div>
              </div>
              <div style={{display:"grid",gap:"12px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                  <div><span style={s.lbl}>Date *</span>
                    <input type="date" style={s.inp} value={sortieForm.date} onChange={e=>setSortieForm(f=>({...f,date:e.target.value}))}/></div>
                  <div><span style={s.lbl}>Quantite sortie *</span>
                    <input type="number" style={s.inp} placeholder={"max "+sortieForm.qteMax} value={sortieForm.qte} onChange={e=>setSortieForm(f=>({...f,qte:e.target.value}))}/></div>
                </div>
                <div><span style={s.lbl}>Notes</span>
                  <input style={s.inp} placeholder="ex. Vente directe, Restaurant..." value={sortieForm.notes} onChange={e=>setSortieForm(f=>({...f,notes:e.target.value}))}/></div>
                <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                  <button style={s.ghost} onClick={()=>setShowSortieForm(false)}>Annuler</button>
                  <button style={s.btn} onClick={()=>{
                    const qte = parseInt(sortieForm.qte)||0;
                    if(!sortieForm.date) return alert("Date requise.");
                    if(qte<=0) return alert("Quantite invalide.");
                    if(qte>sortieForm.qteMax) return alert("Quantite superieure au stock disponible ("+sortieForm.qteMax+" btl).");
                    // Deduire des lots fusionnes proportionnellement
                    const ids = sortieForm._ids||[sortieForm.lotId];
                    let remaining = qte;
                    const updates = [];
                    ids.forEach(id=>{
                      const lot = stockBouteilles.find(x=>x.id===id);
                      if(lot && remaining>0) {
                        const deduit = Math.min(remaining, lot.qteActuelle||0);
                        updates.push({...lot, qteActuelle:(lot.qteActuelle||0)-deduit});
                        remaining -= deduit;
                      }
                    });
                    setStockBouteilles(prev=>prev.map(x=>{const u=updates.find(u=>u.id===x.id);return u||x;}));
                    updates.forEach(u=>fbSave("stockBouteilles",u.id,u));
                    const sortie = {id:"sortie_"+Date.now(), type:"sortie", lotId:sortieForm.lotId, cuvee:lotSortie.cuvee+" "+lotSortie.millesime, statut:lotSortie.statut, format:lotSortie.format, date:sortieForm.date, qte, notes:sortieForm.notes, timestamp:new Date().toISOString()};
                    setClotures(prev=>[sortie,...prev]);
                    fbSave("clotures", sortie.id, sortie);
                    setShowSortieForm(false);
                    setSortieForm({lotId:"",date:new Date().toISOString().slice(0,10),qte:"",notes:""});
                  }}>Enregistrer la sortie</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* == MODAL COIFFES == */}
      {showCoiffesForm&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"400px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>Achat coiffes</div>
              <button style={s.ghost} onClick={()=>setShowCoiffesForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Type</span>
                  <select style={s.sel} value={coiffesForm.type} onChange={e=>setCoiffesForm(f=>({...f,type:e.target.value}))}>
                    <option value="CRD">CRD 75cl</option>
                    <option value="CRD Magnum">CRD Magnum</option>
                    <option value="CRD Jeroboam">CRD Jeroboam</option>
                    <option value="Export">Export 75cl</option>
                    <option value="Export Magnum">Export Magnum</option>
                    <option value="Export Jeroboam">Export Jeroboam</option>
                  </select></div>
                <div><span style={s.lbl}>Date</span>
                  <input type="date" style={s.inp} value={coiffesForm.date||new Date().toISOString().slice(0,10)} onChange={e=>setCoiffesForm(f=>({...f,date:e.target.value}))}/></div>
              </div>
              <div><span style={s.lbl}>Quantite</span>
                <input type="number" style={s.inp} placeholder="ex. 5000" value={coiffesForm.qte} onChange={e=>setCoiffesForm(f=>({...f,qte:e.target.value}))}/></div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowCoiffesForm(false)}>Annuler</button>
                <button style={s.btn} onClick={()=>{
                  if(!coiffesForm.qte) return alert("Quantite requise.");
                  const c={id:"coiffe_"+Date.now(),...coiffesForm,operation:"achat",date:coiffesForm.date||new Date().toISOString().slice(0,10),timestamp:new Date().toISOString()};
                  setCoiffesStock(prev=>[c,...prev]);
                  fbSave("coiffes",c.id,c);
                  setCoiffesForm({type:"CRD",qte:"",date:new Date().toISOString().slice(0,10)});
                  setShowCoiffesForm(false);
                }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL ACTION LOT == */}
      {lotAction&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"500px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#7a5200"}}>
                {lotAction.action==="diviser"?"Diviser le lot":"Mouvement de lot"}
              </div>
              <button style={s.ghost} onClick={()=>setLotAction(null)}>x</button>
            </div>
            <div style={{...s.card,marginBottom:"16px",padding:"12px",background:"#fff8ee"}}>
              <div style={{fontWeight:500,color:"#1a1205"}}>{lotAction.lot.cuvee} {lotAction.lot.millesime}</div>
              <div style={{fontSize:"12px",color:"#9a8870"}}>{lotAction.lot.format} - {lotAction.lot.qteActuelle} btl - {lotAction.lot.lieu} - {lotAction.lot.statut}</div>
            </div>
            {lotAction.action==="mouvement"&&(
              <div style={{display:"grid",gap:"12px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                  <div><span style={s.lbl}>Nouveau statut</span>
                    <select style={s.sel} id="mvt_statut" defaultValue={lotAction.lot.statut}>
                      {STATUTS_BOUTEILLES.map(st=><option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  <div><span style={s.lbl}>Nouveau lieu</span>
                    <select style={s.sel} id="mvt_lieu" defaultValue={lotAction.lot.lieu}>
                      {LIEUX_STOCK.map(l=><option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                  <div><span style={s.lbl}>Quantite concernee</span>
                    <input type="number" style={s.inp} id="mvt_qte" placeholder={"Tout le lot ("+lotAction.lot.qteActuelle+")"}/>
                  </div>
                  <div><span style={s.lbl}>Date</span>
                    <input type="date" style={s.inp} id="mvt_date" defaultValue={new Date().toISOString().slice(0,10)}/>
                  </div>
                </div>
                <div><span style={s.lbl}>Notes</span>
                  <input style={s.inp} id="mvt_notes" placeholder="ex. Degorgement campagne 2026"/>
                </div>
                <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                  <button style={s.ghost} onClick={()=>setLotAction(null)}>Annuler</button>
                  <button style={s.btn} onClick={()=>{
                    const newStatut = document.getElementById("mvt_statut").value;
                    const newLieu = document.getElementById("mvt_lieu").value;
                    const qte = parseInt(document.getElementById("mvt_qte").value)||lotAction.lot.qteActuelle;
                    const date = document.getElementById("mvt_date").value;
                    const notes = document.getElementById("mvt_notes").value;
                    const qteRestante = lotAction.lot.qteActuelle - qte;
                    if(qte <= 0) return alert("Quantite invalide.");
                    // Deduire coiffes si habillage
                    if(newStatut==="Habille CRD"||newStatut==="Habille Export") {
                      const lotFmt = lotAction.lot.format;
                      const typeCoiffe = (newStatut==="Habille CRD"?"CRD":"Export") + (lotFmt==="Magnum"?" Magnum":lotFmt==="Jeroboam"?" Jeroboam":"");
                      const deduction = {id:"coiffe_"+Date.now(),type:typeCoiffe,operation:"utilisation",qte:String(qte),date,notes:"Habillage "+lotAction.lot.cuvee,timestamp:new Date().toISOString()};
                      setCoiffesStock(prev=>[deduction,...prev]);
                      fbSave("coiffes",deduction.id,deduction);
                    }
                    if(qte < lotAction.lot.qteActuelle) {
                      const newLot = {...lotAction.lot, id:"lot_"+Date.now(), qteInitiale:qte, qteActuelle:qte, statut:newStatut, lieu:newLieu, dateMvt:date, notes};
                      const updatedLot = {...lotAction.lot, qteActuelle:qteRestante};
                      setStockBouteilles(prev=>[newLot,...prev.map(x=>x.id===lotAction.lot.id?updatedLot:x)]);
                      fbSave("stockBouteilles", newLot.id, newLot);
                      fbSave("stockBouteilles", updatedLot.id, updatedLot);
                    } else {
                      const updatedLot = {...lotAction.lot, statut:newStatut, lieu:newLieu, dateMvt:date, notes};
                      setStockBouteilles(prev=>prev.map(x=>x.id===lotAction.lot.id?updatedLot:x));
                      fbSave("stockBouteilles", updatedLot.id, updatedLot);
                    }
                    setLotAction(null);
                  }}>Enregistrer</button>
                </div>
              </div>
            )}
            {lotAction.action==="diviser"&&(
              <div style={{display:"grid",gap:"12px"}}>
                <div style={{fontSize:"13px",color:"#6a5838"}}>Indiquez la quantite a separer du lot original.</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                  <div><span style={s.lbl}>Quantite a separer</span>
                    <input type="number" style={s.inp} id="div_qte" placeholder="ex. 300" max={lotAction.lot.qteActuelle-1}/>
                  </div>
                  <div><span style={s.lbl}>Lieu du nouveau lot</span>
                    <select style={s.sel} id="div_lieu" defaultValue={lotAction.lot.lieu}>
                      {LIEUX_STOCK.map(l=><option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div><span style={s.lbl}>Statut du nouveau lot</span>
                  <select style={s.sel} id="div_statut" defaultValue={lotAction.lot.statut}>
                    {STATUTS_BOUTEILLES.map(st=><option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                  <button style={s.ghost} onClick={()=>setLotAction(null)}>Annuler</button>
                  <button style={s.btn} onClick={()=>{
                    const qte = parseInt(document.getElementById("div_qte").value)||0;
                    const lieu = document.getElementById("div_lieu").value;
                    const statut = document.getElementById("div_statut").value;
                    if(qte<=0||qte>=lotAction.lot.qteActuelle) return alert("Quantite invalide - doit etre entre 1 et "+(lotAction.lot.qteActuelle-1));
                    const newLot = {...lotAction.lot, id:"lot_"+Date.now(), qteInitiale:qte, qteActuelle:qte, statut, lieu};
                    const updatedLot = {...lotAction.lot, qteActuelle:lotAction.lot.qteActuelle-qte};
                    setStockBouteilles(prev=>[newLot,...prev.map(x=>x.id===lotAction.lot.id?updatedLot:x)]);
                    fbSave("stockBouteilles", newLot.id, newLot);
                    fbSave("stockBouteilles", updatedLot.id, updatedLot);
                    setLotAction(null);
                  }}>Diviser</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* == MODAL CLOTURE MENSUELLE == */}
      {showCloture && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"660px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#7a5200"}}>Cloture mensuelle</div>
              <button style={s.ghost} onClick={()=>setShowCloture(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"14px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Mois *</span>
                  <input type="month" style={s.inp} value={clotureForm.date} onChange={e=>setClotureForm(f=>({...f,date:e.target.value}))}/></div>
                <div><span style={s.lbl}>Operateur *</span>
                  <select style={s.sel} value={clotureForm.operateur} onChange={e=>setClotureForm(f=>({...f,operateur:e.target.value}))}>
                    <option value="">Selectionner...</option>
                    {degustateurs.map(d=><option key={d.nom} value={d.nom}>{d.nom}</option>)}
                  </select></div>
              </div>

              {/* Saisie manuelle */}
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                  <span style={s.lbl}>Ventes par reference</span>
                  <button style={s.btnSm} onClick={()=>setClotureForm(f=>({...f,lignes:[...f.lignes,{cuvee:"",millesime:"",format:"75",lieu:"Epernay",qte:0}]}))}>+ Ligne</button>
                </div>
                {clotureForm.lignes.length===0&&<div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Aucune ligne. Ajoutez ou importez.</div>}
                {clotureForm.lignes.map((l,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 1fr 60px 30px",gap:"6px",marginBottom:"6px",alignItems:"center"}}>
                    <input style={{...s.inp,padding:"5px 8px",fontSize:"12px"}} placeholder="Cuvee" value={l.cuvee} onChange={e=>{const ls=[...clotureForm.lignes];ls[i]={...ls[i],cuvee:e.target.value};setClotureForm(f=>({...f,lignes:ls}));}}/>
                    <input style={{...s.inp,padding:"5px 8px",fontSize:"12px"}} placeholder="Mill." value={l.millesime} onChange={e=>{const ls=[...clotureForm.lignes];ls[i]={...ls[i],millesime:e.target.value};setClotureForm(f=>({...f,lignes:ls}));}}/>
                    <select style={{...s.sel,padding:"5px 8px",fontSize:"12px"}} value={l.format} onChange={e=>{const ls=[...clotureForm.lignes];ls[i]={...ls[i],format:e.target.value};setClotureForm(f=>({...f,lignes:ls}));}}>
                      <option value="75">75cl</option><option value="magnum">Magnum</option><option value="jeroboam">Jeroboam</option>
                    </select>
                    <select style={{...s.sel,padding:"5px 8px",fontSize:"12px"}} value={l.lieu} onChange={e=>{const ls=[...clotureForm.lignes];ls[i]={...ls[i],lieu:e.target.value};setClotureForm(f=>({...f,lignes:ls}));}}>
                      {LIEUX_STOCK.map(loc=><option key={loc} value={loc}>{loc}</option>)}
                    </select>
                    <input type="number" style={{...s.inp,padding:"5px 8px",fontSize:"12px"}} placeholder="Qte" value={l.qte} onChange={e=>{const ls=[...clotureForm.lignes];ls[i]={...ls[i],qte:parseInt(e.target.value)||0};setClotureForm(f=>({...f,lignes:ls}));}}/>
                    <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4",padding:"4px 6px"}} onClick={()=>setClotureForm(f=>({...f,lignes:f.lignes.filter((_,j)=>j!==i)}))}>x</button>
                  </div>
                ))}
              </div>

              {/* Import CSV */}
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"8px"}}>Import CSV (format: cuvee;millesime;format;lieu;qte)</div>
                <textarea style={{...s.inp,height:"80px",resize:"vertical",fontSize:"12px"}} placeholder="cuvee;millesime;format;lieu;qte" value={clotureForm.importCsv} onChange={e=>setClotureForm(f=>({...f,importCsv:e.target.value}))}/>
                <button style={{...s.ghostSm,marginTop:"6px"}} onClick={importCsvCloture}>Importer les lignes</button>
              </div>

              <div><span style={s.lbl}>Notes</span>
                <textarea style={{...s.inp,height:"58px",resize:"vertical"}} value={clotureForm.notes} onChange={e=>setClotureForm(f=>({...f,notes:e.target.value}))}/></div>

              {clotureForm.lignes.length>0&&(
                <div style={{background:"#d0f0dc",borderRadius:"6px",padding:"10px 14px",fontSize:"12px",color:"#1a7a40"}}>
                  <strong>{clotureForm.lignes.reduce((s,l)=>s+(parseInt(l.qte)||0),0)} bouteilles</strong> seront deduites du stock.
                </div>
              )}

              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowCloture(false)}>Annuler</button>
                <button style={s.btn} onClick={submitCloture}>Valider la cloture</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL TIRAGE == */}
      {showTirageForm && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"700px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"22px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#7a5200"}}>{editingTirage ? `Modifier tirage - ${editingTirage.cuvee}` : "Nouveau tirage"}</div>
              <button style={s.ghost} onClick={()=>{setShowTirageForm(false);setEditingTirage(null);setTirageForm(TIRAGE_EMPTY);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"16px"}}>
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"10px",fontSize:"11px"}}>Identification du tirage</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"12px"}}>
                  <div><span style={s.lbl}>Type de produit *</span>
                    <select style={s.sel} value={tirageForm.typeProduit||"champagne"} onChange={e=>setTirageForm(f=>({...f,typeProduit:e.target.value}))}>
                      <option value="champagne">Champagne</option>
                      <option value="coteaux_blanc">Coteaux Champenois Blanc</option>
                      <option value="coteaux_rouge">Coteaux Champenois Rouge</option>
                      <option value="ratafia">Ratafia</option>
                    </select></div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",paddingTop:"18px"}}>
                    <input type="checkbox" id="tirageIsBio" checked={tirageForm.isBio||false} onChange={e=>setTirageForm(f=>({...f,isBio:e.target.checked}))} style={{width:"16px",height:"16px",cursor:"pointer"}}/>
                    <label htmlFor="tirageIsBio" style={{fontSize:"12px",color:"#2d6a00",fontWeight:500,cursor:"pointer"}}>🌿 Certification BIO</label>
                  </div>
                  <div><span style={s.lbl}>Date *</span>
                    <input type="date" style={s.inp} value={tirageForm.date} onChange={e=>setTirageForm(f=>({...f,date:e.target.value}))}/></div>
                  <div><span style={s.lbl}>Operateur *</span>
                    <select style={s.sel} value={tirageForm.operateur} onChange={e=>setTirageForm(f=>({...f,operateur:e.target.value}))}>
                      <option value="">Selectionner...</option>
                      {degustateurs.map(d=><option key={d.nom} value={d.nom}>{d.nom}</option>)}
                    </select></div>
                  <div><span style={s.lbl}>Millesime</span>
                    <input type="number" style={s.inp} placeholder="ex. 2025" value={tirageForm.millesime} onChange={e=>setTirageForm(f=>({...f,millesime:e.target.value}))}/></div>
                </div>
                <div style={{marginTop:"10px"}}>
                  <span style={s.lbl}>Cuvee / Denomination *</span>
                  <input style={s.inp} placeholder="ex. FONTINETTE..." value={tirageForm.cuvee} onChange={e=>setTirageForm(f=>({...f,cuvee:e.target.value}))}/></div>
              </div>
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"10px",fontSize:"11px"}}>Assemblage - Volume vin (depuis les futs)</div>
                {editingTirage&&<div style={{fontSize:"11px",color:"#c47800",background:"#fde8b8",border:"0.5px solid #e8c888",borderRadius:"4px",padding:"6px 10px",marginBottom:"10px"}}>En mode modification, les volumes des futs ne sont pas recalcules automatiquement.</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 140px",gap:"12px"}}>
                  <div>
                    <span style={s.lbl}>Futs sources (selection multiple)</span>
                    <div style={{maxHeight:"180px",overflowY:"auto",border:"0.5px solid #d4c4a0",borderRadius:"6px",padding:"6px",background:"#fffdf7"}}>
                      {tonneaux.filter(t=>t.contenuActuel>0).map(t=>(
                        <div key={t.id} style={{display:"flex",alignItems:"center",gap:"7px",padding:"3px",fontSize:"12px"}}>
                          <input type="checkbox" checked={tirageForm.futsSources.includes(t.id)}
                            onChange={()=>setTirageForm(f=>({
                              ...f,
                              futsSources:f.futsSources.includes(t.id)?f.futsSources.filter(x=>x!==t.id):[...f.futsSources,t.id],
                              futsSourcesVolumes:{...f.futsSourcesVolumes,[t.id]:f.futsSourcesVolumes[t.id]||t.contenuActuel}
                            }))}/>
                          <span style={{color:"#b8860b",minWidth:"54px",fontFamily:"monospace"}}>{t.id}</span>
                          <span style={{color:"#6a5838",flex:1}}>{t.denomination}</span>
                          <span style={{color:"#9a8870",fontSize:"10px"}}>{t.contenuActuel}L</span>
                          {tirageForm.futsSources.includes(t.id)&&(
                            <input type="number" style={{...s.inp,width:"75px",padding:"2px 6px",fontSize:"11px"}}
                              placeholder={String(t.contenuActuel)}
                              value={tirageForm.futsSourcesVolumes[t.id]||""}
                              onChange={e=>setTirageForm(f=>({...f,futsSourcesVolumes:{...f.futsSourcesVolumes,[t.id]:e.target.value}}))}/>
                          )}
                        </div>
                      ))}
                    </div>
                    {tirageForm.futsSources.length>0&&(
                      <div style={{fontSize:"11px",color:"#533AB7",marginTop:"4px"}}>
                        Total sélectionné : {tirageForm.futsSources.reduce((s,id)=>s+(parseFloat(tirageForm.futsSourcesVolumes[id])||getTonneau(id)?.contenuActuel||0),0).toLocaleString()} L
                      </div>
                    )}
                  </div>
                  <div>
                    <span style={s.lbl}>Volume vin (L)</span>
                    <input type="number" style={{...s.inp,fontSize:"18px",fontWeight:500,color:"#533AB7",textAlign:"center",padding:"12px"}} placeholder="0"
                      value={tirageForm.volumeTotal} onChange={e=>setTirageForm(f=>({...f,volumeTotal:e.target.value}))}/></div>
                </div>
              </div>
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"10px",fontSize:"11px"}}>Preparation du levain</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"10px"}}>
                  <div><span style={s.lbl}>Nom de la levure</span>
                    <input style={s.inp} placeholder="ex. EC1118, Zymaflore..." value={tirageForm.levainLevureNom} onChange={e=>setTirageForm(f=>({...f,levainLevureNom:e.target.value}))}/></div>
                  <div><span style={s.lbl}>Numero de lot levure</span>
                    <input style={s.inp} placeholder="ex. LOT-2025-042" value={tirageForm.levainLot} onChange={e=>setTirageForm(f=>({...f,levainLot:e.target.value}))}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"10px"}}>
                  <div><span style={s.lbl}>Eau (L)</span>
                    <input type="number" style={s.inp} placeholder="0" value={tirageForm.levainEau} onChange={e=>setTirageForm(f=>({...f,levainEau:e.target.value}))}/></div>
                  <div><span style={s.lbl}>Vin (L)</span>
                    <input type="number" style={s.inp} placeholder="0" value={tirageForm.levainVin} onChange={e=>setTirageForm(f=>({...f,levainVin:e.target.value}))}/></div>
                  <div><span style={s.lbl}>Levures (L)</span>
                    <input type="number" style={s.inp} placeholder="0" value={tirageForm.levainLevure} onChange={e=>setTirageForm(f=>({...f,levainLevure:e.target.value}))}/></div>
                  <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                    <div style={{background:"#d4edc0",borderRadius:"6px",padding:"8px",textAlign:"center"}}>
                      <div style={{fontSize:"10px",color:"#2d6a00",fontFamily:"monospace",marginBottom:"2px"}}>Total levain</div>
                      <div style={{fontSize:"16px",fontWeight:500,color:"#2d6a00"}}>{calcVolLevain(tirageForm).toFixed(1)} L</div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{background:"#f5e8cc",borderRadius:"8px",padding:"14px",border:"0.5px solid #e0c050"}}>
                <div style={{...s.lbl,marginBottom:"8px",fontSize:"11px",color:"#7a5200"}}>Volume total assemble</div>
                <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                  <div style={{fontSize:"28px",fontWeight:500,color:"#7a5200"}}>{calcTotalAssemble(tirageForm).toFixed(1)} L</div>
                  <div style={{fontSize:"12px",color:"#9a8870"}}>= {tirageForm.volumeTotal||0} L vin + {calcVolLevain(tirageForm).toFixed(1)} L levain</div>
                </div>
              </div>
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"10px",fontSize:"11px"}}>Stockage apres assemblage</div>
                <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
                  {[["existante","Cuve existante"],["nouvelle","Creer une nouvelle cuve"]].map(([val,lbl])=>(
                    <button key={val} onClick={()=>setTirageForm(f=>({...f,cuveDestMode:val}))}
                      style={{padding:"6px 14px",borderRadius:"5px",border:`0.5px solid ${tirageForm.cuveDestMode===val?"#533AB7":"#d4c4a0"}`,background:tirageForm.cuveDestMode===val?"#eeedfe":"transparent",color:tirageForm.cuveDestMode===val?"#533AB7":"#9a8870",fontSize:"12px",cursor:"pointer",fontFamily:"monospace"}}>
                      {lbl}
                    </button>
                  ))}
                </div>
                {tirageForm.cuveDestMode==="existante"&&(
                  <div>
                    <span style={s.lbl}>Selectionner la cuve de destination</span>
                    <select style={s.sel} value={tirageForm.cuveDestId} onChange={e=>setTirageForm(f=>({...f,cuveDestId:e.target.value}))}>
                      <option value="">-- Aucune --</option>
                      {cuvesCuverie.filter(c=>c.type!=="bourbes").map(c=>(
                        <option key={c.id} value={c.id}>{c.nom} - {c.type} (dispo: {Math.max(0,(parseFloat(c.volumeHL)||0)-(parseFloat(c.contenuActuelHL)||0)).toFixed(1)} HL)</option>
                      ))}
                    </select>
                  </div>
                )}
                {tirageForm.cuveDestMode==="nouvelle"&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                    <div><span style={s.lbl}>N° / Nom de la nouvelle cuve *</span>
                      <input style={s.inp} placeholder="ex. CT-001..." value={tirageForm.nouvelleCuveId} onChange={e=>setTirageForm(f=>({...f,nouvelleCuveId:e.target.value}))}/></div>
                    <div><span style={s.lbl}>Capacite (L)</span>
                      <input type="number" style={s.inp} placeholder="optionnel" value={tirageForm.nouvelleCuveVolume} onChange={e=>setTirageForm(f=>({...f,nouvelleCuveVolume:e.target.value}))}/></div>
                  </div>
                )}
              </div>
              <div style={{background:"#fff8ee",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"10px",fontSize:"11px"}}>Mise en bouteilles - 1 numero de lot par format</div>
                <div style={{display:"grid",gap:"10px"}}>
                  {[["Bouteilles 75cl","qte75","lot75","#2d6a00",0.75],["Magnums 1.5L","qteMagnum","lotMagnum","#8b5e0a",1.5],["Jeroboams 3L","qteJeroboam","lotJeroboam","#8B0000",3.0]].map(([lbl,qk,lk,col,vol])=>(
                    <div key={lbl} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",padding:"10px",background:"#fffdf7",borderRadius:"6px",border:"0.5px solid #e2d9c5"}}>
                      <div>
                        <span style={s.lbl}>{lbl}</span>
                        <input type="number" style={s.inp} placeholder="0" value={tirageForm[qk]} onChange={e=>setTirageForm(f=>({...f,[qk]:e.target.value}))}/>
                        {tirageForm[qk]&&<div style={{fontSize:"11px",color:col,marginTop:"3px",fontFamily:"monospace"}}>{((parseFloat(tirageForm[qk])||0)*vol).toFixed(1)} L</div>}
                      </div>
                      <div>
                        <span style={s.lbl}>N° de lot <span style={{color:"#cc2222"}}>*</span></span>
                        <input style={{...s.inp,borderColor:tirageForm[qk]&&!tirageForm[lk]?"#e8a0a0":undefined}}
                          placeholder={`ex. LOT-${new Date().getFullYear()}-001`}
                          value={tirageForm[lk]} onChange={e=>setTirageForm(f=>({...f,[lk]:e.target.value}))}/>
                      </div>
                    </div>
                  ))}
                </div>
                {(tirageForm.qte75||tirageForm.qteMagnum||tirageForm.qteJeroboam)&&(
                  <div style={{marginTop:"12px",padding:"10px",background:"#d0f0dc",borderRadius:"6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:"12px",color:"#1a7a40"}}>Total mis en bouteilles</span>
                    <span style={{fontSize:"18px",fontWeight:500,color:"#1a7a40"}}>{calcVolBouteilles(tirageForm).toFixed(1)} L</span>
                  </div>
                )}
              </div>
              <div><span style={s.lbl}>Notes / Observations</span>
                <textarea style={{...s.inp,height:"64px",resize:"vertical"}} placeholder="Conditions, observations..." value={tirageForm.notes} onChange={e=>setTirageForm(f=>({...f,notes:e.target.value}))}/></div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>{setShowTirageForm(false);setEditingTirage(null);setTirageForm(TIRAGE_EMPTY);}}>Annuler</button>
                <button style={s.btn} onClick={submitTirage}>{editingTirage?"Sauvegarder":"Enregistrer le tirage"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReset && (
        <div style={{position:"fixed",inset:0,background:"rgba(30,20,5,0.78)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}}>
          <div style={{background:"#fffdf7",border:"1px solid #e8a0a0",borderRadius:"10px",padding:"32px",width:"440px"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",color:"#cc2222",marginBottom:"12px"}}>
              <i className="ti ti-alert-triangle" style={{marginRight:"8px"}}/>Réinitialiser les données
            </div>
            <p style={{fontSize:"13px",color:"#5a4a30",lineHeight:"1.7",marginBottom:"8px"}}>
              Cette action va <strong style={{color:"#1a1205"}}>effacer toutes les données sauvegardées</strong> dans ce navigateur et recharger les <strong style={{color:"#1a1205"}}>90 fûts</strong> avec les 4 appellations.
            </p>
            <p style={{fontSize:"12px",color:"#7a6840",lineHeight:"1.6",marginBottom:"24px"}}>
              Mouvements, notes de dégustation et préférences de dégustateurs seront perdus. À utiliser si les données affichées semblent incorrectes ou vides.
            </p>
            <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
              <button style={{background:"none",color:"#6a5838",border:"1px solid #cfc0a0",borderRadius:"4px",padding:"8px 16px",fontSize:"12px",cursor:"pointer",fontFamily:"inherit"}}
                onClick={()=>setShowReset(false)}>
                Annuler
              </button>
              <button style={{background:"#cc2222",color:"#fff",border:"none",borderRadius:"4px",padding:"8px 16px",fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.05em"}}
                onClick={async ()=>{
                  // Save initial data to Firebase
                  const batch = writeBatch(db);
                  INIT_TONNEAUX.forEach(t=>batch.set(doc(db,"tonneaux",t.id),{...t,_ts:new Date().toISOString()}));
                  INIT_DEGUSTATIONS.forEach(d=>batch.set(doc(db,"degustations",d.id),{...d,_ts:new Date().toISOString()}));
                  await batch.commit();
                  setMouvements([]); setCampagnes([]); setTirages([]); setVendanges([]); setParcelles([]);
                  setShowReset(false); setView("dashboard");
                }}>
                <i className="ti ti-trash" style={{marginRight:"6px"}}/>Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
