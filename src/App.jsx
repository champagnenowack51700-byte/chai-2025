import React, { useState, useEffect, useCallback } from "react";
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
// Tolérance (en L) sous laquelle un reliquat de volume est considéré comme
// un résidu d'arrondi et non un vrai reste de vin dans le fût.
const SEUIL_VIDE = 0.5;
const estVide = (v) => (v||0) <= SEUIL_VIDE;
// Remet un fût à l'état vierge ("--Vide--") : ne conserve que les caractéristiques
// physiques du fût lui-même (numéro/id, volume, tonnelier, grain, chauffe).
// Tout ce qui décrit le vin qu'il contenait est effacé.
// L'historique des mouvements et les notes de dégustation sont stockés à part
// (collections "degustations" / mouvements) et ne sont donc jamais impactés.
const viderFut = (t) => ({
  ...t,
  statut: "vide",
  contenuActuel: 0,
  appellation: "",
  denomination: "",
  millesime: null,
  marc: "",
  cepage: "",
  certif: "",
  volumeRI: 0,
  commentaire: "",
});
// Seuil (en HL) sous lequel une cuve de cuverie est consideree comme vide.
const CUVE_VIDE_SEUIL_HL = 0.05; // 5 L
// Calcule le nouveau contenu (HL) d'une cuve de cuverie et efface la note de
// contenu (+ statut BIO) quand elle revient a 0, comme pour les fûts.
const majCuveContenu = (c, newContenuHL) => {
  const val = Math.max(0, Math.round(newContenuHL*100)/100);
  if(val<=CUVE_VIDE_SEUIL_HL) {
    return {...c, contenuActuelHL:"0", notes:"", isBio:false};
  }
  return {...c, contenuActuelHL:String(val)};
};
const fmt = (d) => {
  if(!d) return "-";
  const parts = d.slice(0,10).split("-");
  if(parts.length===3) return parts[2]+"/"+parts[1]+"/"+parts[0];
  return d;
};

// -- Persistance de la navigation dans l'URL (pour rester sur la meme page apres un rafraichissement) --
const VALID_VIEWS = ["dashboard","parcelles","vigne","vendanges","rendement","tonneaux","mouvements","degustations","assemblage","tirages","stock","fiche"];
const getInitialView = () => {
  try {
    const v = new URLSearchParams(window.location.search).get("view");
    return VALID_VIEWS.includes(v) ? v : "dashboard";
  } catch(e) { return "dashboard"; }
};
const getInitialUrlParam = (key) => {
  try {
    return new URLSearchParams(window.location.search).get(key) || null;
  } catch(e) { return null; }
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
  { value:"soutirage",   label:"Soutirage (fût → fût)",  icon:"ti-arrows-exchange",color:"#1a7a40" },
  { value:"perte",       label:"Perte de volume",         icon:"ti-droplet-off",    color:"#cc2222" },
  { value:"remplissage", label:"Remplissage cuve",        icon:"ti-droplet-filled", color:"#533AB7" },
  { value:"batonnage",   label:"Bâtonnage",               icon:"ti-refresh",        color:"#5F5E5A" },
  { value:"ajout_produit",label:"Ajout produit",          icon:"ti-flask",          color:"#BA7517" },
  { value:"entonnage",    label:"Entonnage",               icon:"ti-beer",           color:"#2C3E50" },
  { value:"mutage",       label:"Mutage (bourbes + alcool)", icon:"ti-flask",          color:"#8B0000" },
  { value:"distillerie",  label:"Excédents (distillerie)", icon:"ti-truck-delivery", color:"#7a5200" },
];


// Appellations fixes (non liées au millésime)
const APPELLATION_FIXED = {
  vins_reserve: { label:"Vins de réserve", color:"#2C3E50", bg:"#E8E0D0", border:"#c89020" },
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
const getCepageStyle = (cepage) => {
  if(!cepage) return {bg:"#f5f5f0", color:"#6a6a5a", border:"#d0d0c0"};
  const c = cepage.toLowerCase();
  if(c.includes("pinot noir")) return {bg:"#1a0a12", color:"#f5c0d5", border:"#8B0000"};
  if(c.includes("meunier")) return {bg:"#6b2d4a", color:"#fde8f0", border:"#c05080"};
  if(c.includes("chardonnay")) return {bg:"#f5e8b0", color:"#5a4a00", border:"#c8a820"};
  if(c.includes("petit meslier")) return {bg:"#e8f0d0", color:"#3a5a10", border:"#7a9a30"};
  if(c.includes("voltis")) return {bg:"#e0f0e8", color:"#1a5a3a", border:"#40a060"};
  return {bg:"#f0ede8", color:"#5a4a38", border:"#b0a090"};
};
const statutParcelle = (p) => {
  if(!p.anneePlantation) return "production";
  const annee = parseInt(p.anneePlantation);
  const diff = new Date().getFullYear() - annee;
  if(diff <= 0) return "1ere_feuille";
  if(diff === 1) return "2eme_feuille";
  return "production";
};
const labelStatutParcelle = (p) => {
  const s = statutParcelle(p);
  if(s==="1ere_feuille") return "1ère feuille";
  if(s==="2eme_feuille") return "2ème feuille";
  return "En production";
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

  const [view,        setView]        = useState(getInitialView);
  const [firebaseLoaded, setFirebaseLoaded] = useState(false);
  const [selectedFut, setSelectedFut] = useState(()=>getInitialUrlParam("fut"));
  const [ficheTab,    setFicheTab]    = useState("historique");
  const [searchFut,   setSearchFut]   = useState("");
  const [filterDenom,      setFilterDenom]      = useState("");
  const [filterStatut,     setFilterStatut]     = useState("");
  const [filterStockLieu,  setFilterStockLieu]  = useState("");
  const [filterStockCuvee, setFilterStockCuvee] = useState("");
  const [riRequis,         setRiRequis]         = useState([]);
  const [degresRatafia,    setDegresRatafia]     = useState([]);
  const [showRiForm,       setShowRiForm]       = useState(false);
  const [showDegreRatafiaForm, setShowDegreRatafiaForm] = useState(false);
  const [degreRatafiaForm, setDegreRatafiaForm] = useState("18");
  const [showBulkDateForm, setShowBulkDateForm] = useState(false);
  const [bulkDateForm, setBulkDateForm] = useState({session:"",date:""});
  const [showRiDetail,     setShowRiDetail]      = useState(false);
  const [riForm,           setRiForm]           = useState({annee:new Date().getFullYear().toString(),volumeHL:""});
  const [stockTab,         setStockTab]         = useState("champagne");
  const [lotAction,        setLotAction]        = useState(null);
  const [editingLot,       setEditingLot]        = useState(null);
  const [editingAssemblage, setEditingAssemblage] = useState(null);
  const [divPreview,       setDivPreview]        = useState(null);
  const [lotEditForm,      setLotEditForm]       = useState(null);
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
  const [filterStockFormat, setFilterStockFormat] = useState("");
  const [filterStock15,    setFilterStock15]    = useState("");
  const [groupByStock,     setGroupByStock]     = useState(["cuvee"]);
  const [filterTirageAnnee, setFilterTirageAnnee] = useState("");
  const [showTotauxDetail, setShowTotauxDetail] = useState(false);
  const [filterAppellation, setFilterAppellation] = useState("");
  const [filterOp,         setFilterOp]         = useState("");
  const [filterDegFut,     setFilterDegFut]     = useState("");
  const [filterDegCuvee,   setFilterDegCuvee]   = useState("");
  const [filterDegFabric,  setFilterDegFabric]  = useState("");
  const [filterDegVolMin,  setFilterDegVolMin]  = useState("");
  const [filterDegVolMax,  setFilterDegVolMax]  = useState("");
  const [filterDegNote,    setFilterDegNote]    = useState("");
  const [filterFut,   setFilterFut]   = useState("");
  const [filterMvtType, setFilterMvtType] = useState('');
  const [filterMvtAnnee, setFilterMvtAnnee] = useState(() => new Date().getFullYear().toString());
  const [ficheHistoAnnee, setFicheHistoAnnee] = useState(()=>new Date().getFullYear().toString());
  const [ficheDegAnnee, setFicheDegAnnee] = useState(()=>new Date().getFullYear().toString());
  const [ficheDegSession, setFicheDegSession] = useState("");
  const [filterDegAnnee, setFilterDegAnnee] = useState(()=>new Date().getFullYear().toString());
  const [filterDegSessionG, setFilterDegSessionG] = useState("");
  const [mouvementsClotures, setMouvementsClotures] = useState([]);
  const [editingMvt, setEditingMvt] = useState(null);
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
  const STATUTS_MOUVEMENT = ["Sur latte / Sur pointe", "En cours de degorgement", "Degorge"];
  const STATUTS_HABILLAGE = ["Habille CRD", "Habille Export"];
  // Statuts "Mouvement" (avant habillage) selon le type de produit :
  // Champagne suit Sur latte -> Degorgement -> Degorge ; Coteaux/Ratafia n'ont qu'un seul palier avant habillage.
  const getStatutsMouvement = (typeProduit) => ["coteaux_blanc","coteaux_rouge","ratafia"].includes(typeProduit) ? ["En vieillissement"] : STATUTS_MOUVEMENT;
  // Statut de depart requis avant de pouvoir "Diviser" (habiller) un lot
  const getPreHabillageStatut = (typeProduit) => ["coteaux_blanc","coteaux_rouge","ratafia"].includes(typeProduit) ? "En vieillissement" : "Degorge";
  // Statuts d'habillage disponibles selon le type de produit ET le format (pour Ratafia, depend du format)
  const getStatutsHabillage = (typeProduit, format) => {
    if(typeProduit==="ratafia") return format==="Jeroboam" ? ["Habillage neutre 3L"] : ["Habillage neutre 50cl"];
    if(typeProduit==="coteaux_blanc"||typeProduit==="coteaux_rouge") return ["Habille Neutre","Habille Vignette CRD"];
    return STATUTS_HABILLAGE; // champagne
  };
  // Type de coiffe a deduire du stock pour un habillage donne (null = pas de gestion de stock, ex. habillage neutre coteaux)
  const getTypeCoiffeHabillage = (typeProduit, statutChoisi, format) => {
    if(typeProduit==="ratafia") return statutChoisi==="Habillage neutre 3L" ? "Neutre 3L" : "Neutre 50cl";
    if(typeProduit==="coteaux_blanc"||typeProduit==="coteaux_rouge") {
      return statutChoisi==="Habille Vignette CRD" ? "Vignette CRD Coteaux" : null; // Neutre : pas de coiffe a gerer
    }
    // Champagne
    return statutChoisi==="Habille CRD"
      ? "CRD"+(format==="Magnum"?" Magnum":format==="Jeroboam"?" Jeroboam":"")
      : "Export"+(format==="Jeroboam"?" Jeroboam":""); // Export : 75cl et Magnum partagent le meme stock
  };
  const STATUTS_AUTRES = ["En vieillissement", "Habille"];
  const TOUS_STATUTS_POSSIBLES = [...STATUTS_BOUTEILLES, "En vieillissement", "Habille Neutre", "Habille Vignette CRD", "Habillage neutre 50cl", "Habillage neutre 3L"];
  const getStatuts = (type) => ["coteaux_blanc","coteaux_rouge","ratafia"].includes(type) ? STATUTS_AUTRES : STATUTS_BOUTEILLES;
  const LIEU_COLORS = {"Domaine":{bg:"#d4edda",color:"#1a7a40"},"Lorain Champagnisation":{bg:"#d4e8f8",color:"#185FA5"},"Epernay":{bg:"#E8E0D0",color:"#c47800"}};
  const STATUT_COLORS = {"Sur latte / Sur pointe":{bg:"#e8f0fb",color:"#185FA5"},"En cours de degorgement":{bg:"#fff3cd",color:"#c47800"},"Degorge":{bg:"#d4f0dd",color:"#1a7a40"},"Habille CRD":{bg:"#e8d4f8",color:"#6a2d8a"},"Habille Export":{bg:"#f8d4e8",color:"#8a2d6a"},"En vieillissement":{bg:"#f0e8d4",color:"#7a5200"},"Habille Neutre":{bg:"#e8f0e8",color:"#2d6a00"},"Habille Vignette CRD":{bg:"#d4e8f8",color:"#185FA5"},"Habillage neutre 50cl":{bg:"#f5e8d4",color:"#8B5200"},"Habillage neutre 3L":{bg:"#ead4f5",color:"#6a2d8a"}};
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
  const [filterVendangeAn,  setFilterVendangeAn]  = useState(()=>new Date().getFullYear().toString());
  const [editingVendange,  setEditingVendange]  = useState(null);
  const [vendanges,        setVendanges]        = useState([]);
  const [parcelles,        setParcelles]        = useState([]);
  const [showParcelleForm, setShowParcelleForm] = useState(false);
  const [editingParcelle,  setEditingParcelle]  = useState(null);
  const [parcelleForm,     setParcelleForm]     = useState({nom:"",cepage:"",certification:"BIO",surface:"",commune:"",observations:"",anneePlantation:""});
  const [cuvesCuverie,     setCuvesCuverie]     = useState([]);
  const [showCuverieForm,  setShowCuverieForm]  = useState(false);
  const [editingCuverie,   setEditingCuverie]   = useState(null);
  const CUVERIE_EMPTY = {nom:"",type:"debourbage",volumeHL:"",contenuActuelHL:"0",notes:""};
  const [cuverieForm,      setCuverieForm]      = useState(CUVERIE_EMPTY);
  const [tonneauxTab,      setTonneauxTab]      = useState(()=>getInitialUrlParam("tab")||"futscuves");
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
  const [apportsParcelles, setApportsParcelles] = useState([]);
  const [showApportForm, setShowApportForm] = useState(null); // parcelleId
  const [apportForm, setApportForm] = useState({date:new Date().toISOString().slice(0,10),operateur:'',nbCagettes:'',poidsNet:'',campagne:new Date().getFullYear().toString(),notes:''});
  const [editingApport, setEditingApport] = useState(null);
  const [pdfDestFilter, setPdfDestFilter] = useState("");
  const [showApportsPanel, setShowApportsPanel] = useState({});
  const [showRendementForm, setShowRendementForm] = useState(false);
  const [reserveRI, setReserveRI] = useState({volumeKg:86110});
  const [showReserveRIForm, setShowReserveRIForm] = useState(false);
  const [showParcellesList, setShowParcellesList] = useState(true);
  const [rendementForm, setRendementForm] = useState({annee:new Date().getFullYear().toString(),rendementAutorise:"",surface:"",reserveRI:""});
  const [showProduitVendange, setShowProduitVendange] = useState(false);
  const [produitVendangeForm, setProduitVendangeForm] = useState({nom:"",dose:"",lot:"",date:""});
  const [editingTirage,  setEditingTirage]  = useState(null);
  const [tirages,        setTirages]        = useState([]);
  const [assemblages, setAssemblages] = useState([]);
  const [showAssemblageForm, setShowAssemblageForm] = useState(false);
  const [showCuveHistorique, setShowCuveHistorique] = useState(null);
  const [showCuveHistAnnee, setShowCuveHistAnnee] = useState(()=>new Date().getFullYear().toString());
  const [showPlanChai, setShowPlanChai] = useState(false);
  const [assemblageForm, setAssemblageForm] = useState({nomCuvee:"",date:new Date().toISOString().slice(0,10),sources:[{type:"tonneau",id:"",volume:""}],cuveAssemblageId:"",destTirageId:"",destTirageVol:"",destRetours:[{id:"",volume:""}],destRetoursRI:[{id:"",volume:""}],notes:""});
  const TIRAGE_EMPTY = {
    date: new Date().toISOString().slice(0,10),
    operateur: "",
    typeProduit: "champagne",
    cuvee: "",
    millesime: "",
    cuveSourceId: "",
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
    isBio: false,
  };
  const [tirageForm, setTirageForm] = useState(TIRAGE_EMPTY);
  const [campFutId,    setCampFutId]    = useState(null);
  const [campagnes,    setCampagnes]    = useState([]);
  const [campForm,     setCampForm]     = useState({annee:"", denomination:"", millesime:"", notes:""});
  const [editingNote,  setEditingNote]  = useState(null);
  const [editNoteForm, setEditNoteForm] = useState({boise:"",longueur:"",noteG:"",commentaire:"",date:""});
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
    operateur:"", futSource:[], futDest:"", volume:"", notes:"", produit:"", dosage:"", numeroLot:"", entonnageMarcId:"", entonnageCuveId:"", entonnageCuves:[{cuveId:"",volume:"",vendangeId:""}], entonnageVendangeId:"", entonnageFuts:[{futId:"",volume:""}], assemblageVolumes:{}, perteVolumes:{}, ouillageDestFuts:[{futId:"",volume:""}], mutageCuveId:"", mutageBourbesHL:"", mutageAlcoolHL:"", mutageDegreAlcool:"", mutageDestId:"", distillerieSources:[{id:"",volume:""}],
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

  // Garder la page (vue) courante dans l'URL pour qu'un rafraichissement
  // (F5) reste sur la meme page au lieu de revenir a l'accueil.
  useEffect(()=>{
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("view", view);
      if(view==="tonneaux") params.set("tab", tonneauxTab); else params.delete("tab");
      if(view==="fiche" && selectedFut) params.set("fut", selectedFut); else params.delete("fut");
      const newUrl = window.location.pathname + "?" + params.toString();
      window.history.replaceState(null, "", newUrl);
    } catch(e) {}
  }, [view, tonneauxTab, selectedFut]);

  // Si on recharge sur la fiche d'un fut qui n'existe plus, revenir a la liste
  // (on attend que les vraies donnees Firebase soient chargees avant de verifier,
  // pour ne pas se baser sur les donnees de demarrage).
  useEffect(()=>{
    if(firebaseLoaded && view==="fiche" && selectedFut && !tonneaux.find(t=>t.id===selectedFut)) {
      setView("tonneaux"); setSelectedFut(null);
    }
  }, [firebaseLoaded, view, selectedFut, tonneaux]);

  // Firebase save helpers
  const saveTonneau = (t) => fbSave("tonneaux", t.id, t);
  const saveApportParcelle = (a) => fbSave("apportsParcelles", a.id, a);
  const deleteApportParcelle = (id) => fbDelete("apportsParcelles", id);
  const deleteTonneauFb = (id) => fbDelete("tonneaux", id);
  const saveMouvement = (m) => fbSave("mouvements", m.id, m);
  const deleteMouvementFb = (id) => fbDelete("mouvements", id);
  const saveDegustation = (d) => fbSave("degustations", d.id, d);
  const deleteDegustationFb = (id) => fbDelete("degustations", id);
  const saveCampagne = (c) => fbSave("campagnes", c.id, c);
  const deleteCampagneFb = (id) => fbDelete("campagnes", id);
  const saveTirage = (t) => fbSave("tirages", t.id, t);
  const saveAssemblage = (a) => fbSave("assemblages", a.id, a);
  const deleteAssemblageFb = (id) => fbDelete("assemblages", id);
  const deleteTirageFb = (id) => fbDelete("tirages", id);
  const saveVendange = (v) => fbSave("vendanges", v.id, v);
  const deleteVendangeFb = (id) => fbDelete("vendanges", id);

  // Edition directe d'un lot de stock bouteilles (corrige une erreur de saisie,
  // y compris sur un lot cree par une division vers un statut d'habillage).
  const openEditLot = (lot) => {
    setEditingLot(lot);
    setLotEditForm({
      cuvee: lot.cuvee||"",
      millesime: lot.millesime||"",
      lot: lot.lot||"",
      format: lot.format||"75cl",
      dateTirage: lot.dateTirage||"",
      statut: lot.statut||STATUTS_BOUTEILLES[0],
      lieu: lot.lieu||"Domaine",
      qteActuelle: lot.qteActuelle??"",
      notes: lot.notes||"",
    });
  };
  const saveEditLot = () => {
    if(!lotEditForm.cuvee) return alert("La cuvée est requise.");
    const qte = parseInt(lotEditForm.qteActuelle);
    if(isNaN(qte)||qte<0) return alert("Quantité invalide.");
    const delta = qte - (editingLot.qteActuelle||0);
    const updated = {...editingLot, ...lotEditForm, qteActuelle:qte};
    // Deduire coiffes si le statut passe a Habille CRD/Export alors qu'il ne l'etait pas avant
    // (meme logique que Mouvement et Diviser, pour rester coherent)
    const devientHabille = (updated.statut==="Habille CRD"||updated.statut==="Habille Export") && editingLot.statut!==updated.statut;
    if(devientHabille) {
      const lotFmt = updated.format;
      const typeCoiffe = updated.statut==="Habille CRD"
        ? "CRD"+(lotFmt==="Magnum"?" Magnum":lotFmt==="Jeroboam"?" Jeroboam":"")
        : "Export"+(lotFmt==="Jeroboam"?" Jeroboam":"");
      const deduction = {id:"coiffe_"+Date.now(),type:typeCoiffe,operation:"utilisation",qte:String(qte),date:new Date().toISOString().slice(0,10),notes:"Modification - Habillage "+updated.cuvee,timestamp:new Date().toISOString()};
      setCoiffesStock(prev=>[deduction,...prev]);
      fbSave("coiffes",deduction.id,deduction);
    }
    // Si ce lot est issu d'une division, ajuster le lot lie en sens inverse pour garder le total constant
    if(delta!==0 && editingLot.linkedLotId) {
      const linked = stockBouteilles.find(x=>x.id===editingLot.linkedLotId);
      if(linked) {
        const newLinkedQte = (linked.qteActuelle||0) - delta;
        if(newLinkedQte<0) return alert(`Impossible : le lot lié "${linked.cuvee} ${linked.format} (${linked.statut})" ne contient que ${linked.qteActuelle} bouteille(s), pas assez pour compenser cet ajustement.`);
        const updatedLinked = {...linked, qteActuelle:newLinkedQte};
        setStockBouteilles(prev=>prev.map(x=>{
          if(x.id===editingLot.id) return updated;
          if(x.id===linked.id) return updatedLinked;
          return x;
        }));
        fbSave("stockBouteilles", updatedLinked.id, updatedLinked);
        fbSave("stockBouteilles", updated.id, updated);
        setEditingLot(null); setLotEditForm(null);
        return;
      }
    }
    setStockBouteilles(prev=>prev.map(x=>x.id===editingLot.id?updated:x));
    fbSave("stockBouteilles", updated.id, updated);
    setEditingLot(null); setLotEditForm(null);
  };
  const saveParcelle = (p) => fbSave("parcelles", p.id, p);
  const deleteParcelleFb = (id) => fbDelete("parcelles", id);

  // Annuler une division de lot : refusionne avec le lot lie et restitue les coiffes deduites
  const annulerDivision = (lot) => {
    const linked = stockBouteilles.find(x=>x.id===lot.linkedLotId);
    if(!linked) return alert("Le lot lié est introuvable (a peut-être déjà été modifié depuis).");
    if(!window.confirm(`Annuler cette division ? Les ${lot.qteActuelle} bouteille(s) seront refusionnées avec le lot "${linked.cuvee} ${linked.format} (${linked.statut})", et les coiffes éventuellement déduites seront restituées.`)) return;
    // Restituer les coiffes si cette division en avait deduit
    if(lot.divisionCoiffeId) {
      setCoiffesStock(prev=>prev.filter(c=>c.id!==lot.divisionCoiffeId));
      fbDelete("coiffes", lot.divisionCoiffeId);
    }
    const updatedLinked = {...linked, qteActuelle:(linked.qteActuelle||0)+(lot.qteActuelle||0), linkedLotId:null};
    setStockBouteilles(prev=>prev.filter(x=>x.id!==lot.id).map(x=>x.id===linked.id?updatedLinked:x));
    fbSave("stockBouteilles", updatedLinked.id, updatedLinked);
    fbDelete("stockBouteilles", lot.id);
  };

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
    // Sauvegarder la surface en production au moment de la cloture
    const surfSnapshot = parcelles.filter(p=>statutParcelle(p)==="production").reduce((s,p)=>s+(parseFloat(p.surface)||0),0);
    const rendExistant = rendementsAnnuels.find(r=>r.annee===String(campagne));
    if(rendExistant) {
      const updated = {...rendExistant, surfaceSnapshot:surfSnapshot};
      setRendementsAnnuels(prev=>prev.map(r=>r.annee===String(campagne)?updated:r));
      fbSave("rendements", updated.id, updated);
    } else {
      const r = {id:"rend_"+campagne, annee:String(campagne), surfaceSnapshot:surfSnapshot, timestamp:new Date().toISOString()};
      setRendementsAnnuels(prev=>[r,...prev]);
      fbSave("rendements", r.id, r);
    }
    // Sauvegarder la reserve RI au moment de la cloture
    if(rendExistant||true) {
      const rend = rendementsAnnuels.find(r=>r.annee===String(campagne));
      if(rend) {
        const updated = {...rend, reserveRISnapshot:parseFloat(reserveRI.volumeKg)||0};
        setRendementsAnnuels(prev=>prev.map(r=>r.annee===String(campagne)?updated:r));
        fbSave("rendements", updated.id, updated);
      }
    }
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
    ["assemblages",   setAssemblages],
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
    ["mouvementsClotures", (data)=>setMouvementsClotures(data.filter(d=>d.annee).map(d=>d.annee))],
      ["coiffes",        setCoiffesStock],
    ["traitements",  setTraitements],
    ["cuvesCuverie",  setCuvesCuverie],
    ["riRequis",      setRiRequis],
    ["degresRatafia", setDegresRatafia],
    ["rendements",    setRendementsAnnuels],
    ["apportsParcelles", setApportsParcelles],
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
    refreshFromFirebase().then(()=>setFirebaseLoaded(true));
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
    let fut = { id:futForm.id.trim(), appellation:futForm.appellation, denomination:futForm.denomination.trim(),
      millesime:futForm.millesime?+futForm.millesime:null, volume:vol, tonnelier:futForm.tonnelier,
      grain:futForm.grain, chauffe:futForm.chauffe, certif:futForm.certif,
      statut:futForm.statut, contenuActuel:contenu, volumeRI:parseFloat(futForm.volumeRI)||0, marc:futForm.marc||"", commentaire:futForm.commentaire||"" };
    // Si le statut choisi est "vide" (ou si le volume tombe à 0), le fût repart vierge :
    // seules les caractéristiques physiques (numéro, volume, tonnelier, grain, chauffe) sont conservées.
    if(fut.statut==="vide" || estVide(contenu)) fut = viderFut(fut);
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
    const volFormat1 = f.typeProduit==="ratafia" ? 0.5 : 0.75; // Ratafia : bouteilles 50cl (pas 75cl)
    return ((parseFloat(f.qte75)||0)*volFormat1) + ((parseFloat(f.qteMagnum)||0)*1.5) + ((parseFloat(f.qteJeroboam)||0)*3.0);
  };
  const calcTotalAssemble = (f) => {
    return (parseFloat(f.volumeTotal)||0) + calcVolLevain(f);
  };

  // -- TIRAGE ---------------------------------------------------------------
  const openEditTirage = (t) => {
    setTirageForm({
      date:t.date||"", operateur:t.operateur||"", typeProduit:t.typeProduit||"champagne", cuvee:t.cuvee||"",
      millesime:t.millesime||"", cuveSourceId:t.cuveSourceId||"", futsSources:t.futsSources||[], futsSourcesVolumes:t.futsSourcesVolumes||{},
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
      const isBioActuel = tirageForm.isBio||cuvesCuverie.find(c=>c.id===tirageForm.cuveSourceId)?.isBio||false;
      setStockBouteilles(prev=>prev.map(lot=>{
        if(lot.tirageId===editingTirage.id) {
          const updatedLot = {...lot, isBio:isBioActuel};
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
            return estVide(reste) ? viderFut(t) : {...t, contenuActuel:reste};
          }
          return t;
        });
      }
      // Deduire le volume pris dans la cuve source (cuverie) selectionnee pour le tirage
      if(tirageForm.cuveSourceId) {
        const volPrisSourceHL = (parseFloat(tirageForm.volumeTotal)||0)/100;
        setCuvesCuverie(prev=>prev.map(c=>{
          if(c.id===tirageForm.cuveSourceId) {
            const updatedC = majCuveContenu(c, (parseFloat(c.contenuActuelHL)||0)-volPrisSourceHL);
            fbSave("cuvesCuverie", c.id, updatedC);
            return updatedC;
          }
          return c;
        }));
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
      // + creation du lot si un format a ete ajoute apres coup (ex. Magnums ajoutes lors d'une modification)
      const fmtLabels = {"75cl":"Bouteille 75cl","Magnum":"Magnum 1.5L","Jeroboam":"Jeroboam 3L"};
      const fmts = [{fmt:"75cl",qk:"qte75",lk:"lot75"},{fmt:"Magnum",qk:"qteMagnum",lk:"lotMagnum"},{fmt:"Jeroboam",qk:"qteJeroboam",lk:"lotJeroboam"}];
      fmts.forEach(({fmt,qk,lk})=>{
        const lotId = updated.id+"_"+fmt;
        const existingLot = stockBouteilles.find(l=>l.id===lotId);
        const newQte = parseInt(tirageForm[qk])||0;
        if(existingLot) {
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
        } else if(newQte>0) {
          // Format ajoute apres coup (n'existait pas a la creation du tirage) : on cree le lot
          const newLot = {
            id: lotId,
            tirageId: updated.id,
            typeProduit: tirageForm.typeProduit||"champagne",
            isBio: tirageForm.isBio||cuvesCuverie.find(c=>c.id===tirageForm.cuveSourceId)?.isBio||false,
            cuvee: tirageForm.cuvee,
            millesime: tirageForm.millesime||"",
            dateTirage: tirageForm.date,
            format: (fmt==="75cl" && tirageForm.typeProduit==="ratafia") ? "50cl" : fmt,
            formatLabel: tirageForm.typeProduit==="ratafia"&&fmt==="75cl" ? "Bouteille 50cl" : fmtLabels[fmt],
            lot: tirageForm[lk]||lotId,
            qteInitiale: newQte,
            qteActuelle: newQte,
            statut: ["coteaux_blanc","coteaux_rouge","ratafia"].includes(tirageForm.typeProduit) ? "En vieillissement" : "Sur latte / Sur pointe",
            lieu: "Domaine",
            mouvements: [],
            timestamp: new Date().toISOString(),
          };
          setStockBouteilles(prev=>[newLot,...prev]);
          fbSave("stockBouteilles", lotId, newLot);
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
          isBio: tirageForm.isBio||cuvesCuverie.find(c=>c.id===tirageForm.cuveSourceId)?.isBio||false,
          cuvee: tirageForm.cuvee,
          millesime: tirageForm.millesime||"",
          dateTirage: tirageForm.date,
          format: (l.fmt==="75cl" && tirageForm.typeProduit==="ratafia") ? "50cl" : l.fmt,
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

  const cloturerMvtCampagne = (annee) => {
    if(!window.confirm(`Cloturer la campagne ${annee} ? Les mouvements ne pourront plus etre modifies.`)) return;
    setMouvementsClotures(prev=>[...new Set([...prev, String(annee)])]);
    fbSave("mouvementsClotures", String(annee), {annee: String(annee), closedAt: new Date().toISOString()});
  };
  const rouvrirMvtCampagne = (annee) => {
    if(!window.confirm(`Rouvrir la campagne ${annee} ?`)) return;
    setMouvementsClotures(prev=>prev.filter(a=>a!==String(annee)));
    fbDelete("mouvementsClotures", String(annee));
  };
  const isMvtCampagneClosed = (annee) => mouvementsClotures.includes(String(annee));

  const exportMouvementsCSV = (annee) => {
    const mvts = [...mouvements].sort((a,b)=>new Date(b.date)-new Date(a.date)).filter(m=>m.date?.slice(0,4)===annee);
    const headers = ["Date","Type","Fut source","Fut destination","Volume","Operateur","Notes"];
    const rows = mvts.map(m=>[
      m.date||"", typeLabel(m.type),
      (m.futSource||[]).join(", ")||"",
      m.futDest||"",
      m.type==="entonnage"?(m.entonnageFuts||[]).reduce((s,ef)=>s+(parseFloat(ef.volume)||0),0).toFixed(2)+" HL":(m.volume?m.volume+"L":""),
      m.operateur||"", m.notes||""
    ]);
    const csv = [headers,...rows].map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`mouvements_${annee}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportMouvementsPDF = (annee) => {
    const mvts = [...mouvements].sort((a,b)=>new Date(b.date)-new Date(a.date)).filter(m=>m.date?.slice(0,4)===annee);
    const rows = mvts.map(m=>`<tr>
      <td>${m.date||"-"}</td>
      <td><span style="background:#e8f0e8;color:#2d6a00;border-radius:3px;padding:1px 5px;font-size:10px">${typeLabel(m.type)}</span></td>
      <td style="color:#b8860b">${(m.futSource||[]).join(", ")||"-"}</td>
      <td style="color:#185FA5">${m.futDest||"-"}</td>
      <td style="font-family:monospace;font-weight:500">${m.type==="entonnage"?(m.entonnageFuts||[]).reduce((s,ef)=>s+(parseFloat(ef.volume)||0),0).toFixed(2)+" HL":(m.volume?m.volume+"L":"-")}</td>
      <td>${m.operateur||"-"}</td>
      <td style="font-style:italic;color:#6a5838;font-size:10px">${m.notes||""}</td>
    </tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:Georgia,serif;margin:20px;color:#1a1205}h1{color:#7a5200;border-bottom:1px solid #d4c4a0;padding-bottom:8px}
    table{width:100%;border-collapse:collapse;font-size:10px}th{background:#f5e8cc;color:#7a5200;padding:5px;text-align:left;border:0.5px solid #d4c4a0}
    td{padding:4px 5px;border:0.5px solid #ede5d4}tr:nth-child(even){background:#fffdf7}</style></head>
    <body><h1>Champagne Nowack — Mouvements ${annee}</h1>
    <p style="color:#9a8870;font-size:12px">${mvts.length} mouvement(s) — Campagne ${annee}</p>
    <table><thead><tr><th>Date</th><th>Type</th><th>Source</th><th>Destination</th><th>Volume</th><th>Operateur</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
    const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
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

  const exportVendangePDF = (annee, vAnneeComplete, destFilter="") => {
    const parcsNom = (v) => {
      const idsArr = v.parcelleIds&&v.parcelleIds.length>0 ? v.parcelleIds : (v.parcelleId?[v.parcelleId]:[]);
      const noms = idsArr.map(id=>parcelles.find(p=>p.id===id)?.nom).filter(Boolean);
      if(noms.length>0) return noms.join(" + ");
      // Repli : si les ids ne correspondent a rien, tenter l'autre champ (donnees anciennes desynchronisees)
      const idsAlt = (v.parcelleIds&&v.parcelleIds.length>0) ? (v.parcelleId?[v.parcelleId]:[]) : (v.parcelleIds||[]);
      const nomsAlt = idsAlt.map(id=>parcelles.find(p=>p.id===id)?.nom).filter(Boolean);
      return nomsAlt.length>0 ? nomsAlt.join(" + ") : "-";
    };
    const isBio = (v) => {
      const ids = v.parcelleIds&&v.parcelleIds.length>0 ? v.parcelleIds : (v.parcelleId?[v.parcelleId]:[]);
      return ids.length>0 && ids.every(id=>parcelles.find(p=>p.id===id)?.certification==="BIO");
    };
    // Filtre par destination du marc (maison / negoce (total+partiel) / prestation / tous)
    const vAnnee = !destFilter ? vAnneeComplete : vAnneeComplete.filter(v=>{
      const d = v.destinationMarc||"maison";
      if(destFilter==="maison") return d==="maison";
      if(destFilter==="negoce") return d==="negoce_total"||d==="negoce_partiel";
      if(destFilter==="prestation") return d==="prestation";
      return true;
    });
    const destLabel = destFilter==="maison"?" — Maison":destFilter==="negoce"?" — Négoce":destFilter==="prestation"?" — Prestation pressurage":"";
    const baseTotaux = destFilter==="prestation" ? vAnnee : vAnnee.filter(v=>v.destinationMarc!=="prestation");
    const kgTotal = baseTotaux.reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
    const hlTotal = baseTotaux.reduce((s,v)=>s+(parseFloat(v.volumeHL)||0),0);
    const kgPrestation = vAnnee.filter(v=>v.destinationMarc==="prestation").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
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
    const destHtml = (v) => v.destinationMarc==="prestation"?"🔄 Prestation pressurage"+(v.kgPrestation?" ("+parseInt(v.kgPrestation).toLocaleString()+" kg)":""):v.destinationMarc==="negoce_total"?"Negoce total":v.destinationMarc==="negoce_partiel"?`Negoce partiel (${parseInt(v.kgVendusNegoce)||0} kg negoce / ${(parseFloat(v.poidsMarcKg)||0)-(parseFloat(v.kgVendusNegoce)||0)} kg maison)`:"Maison";
    // Definition des colonnes : "always" = toujours affichee, sinon affichee seulement si au moins
    // une ligne du jeu filtre a une valeur non vide pour cette colonne.
    const colonnes = [
      {label:"Date", always:true, html:v=>fmt(v.date)+(v.heure?" "+v.heure:"")},
      {label:"Parcelles", always:true, html:v=>parcsNom(v)+(isBio(v)?' <span style="background:#2d6a00;color:#fff;border-radius:3px;padding:1px 4px;font-size:9px">🌿 BIO</span>':"")},
      {label:"Cuvee", check:v=>v.cuveeCreee, html:v=>v.cuveeCreee||"-"},
      {label:"Marc", check:v=>v.numeroMarc, html:v=>v.numeroMarc||"-"},
      {label:"Kg", always:true, html:v=>v.poidsMarcKg?parseInt(v.poidsMarcKg).toLocaleString()+" kg":"-"},
      {label:"HL", always:true, html:v=>v.volumeHL?v.volumeHL+" HL":"-"},
      {label:"Destination", check:()=>!destFilter, html:destHtml},
      {label:"Degre", check:v=>v.degreePotentiel, html:v=>v.degreePotentiel?v.degreePotentiel+"%":"-"},
      {label:"Acidite", check:v=>v.acidite, html:v=>v.acidite?v.acidite+" g/L":"-"},
      {label:"SO2", check:v=>v.so2, html:v=>v.so2?v.so2+" mg/L":"-"},
      {label:"pH", check:v=>v.ph, html:v=>v.ph||"-"},
      {label:"Cuve Taille", check:v=>v.cuveTailleId, html:v=>(cuvesCuverie.find(c=>c.id===v.cuveTailleId)?.nom||"-")+(v.volumeTaille?" ("+v.volumeTaille+" HL)":"")},
      {label:"Cuve Cuvee A", check:v=>v.cuveCuveeId, html:v=>(cuvesCuverie.find(c=>c.id===v.cuveCuveeId)?.nom||"-")+(v.volumeCuvee?" ("+v.volumeCuvee+" HL)":"")},
      {label:"Cuve Cuvee B", check:v=>v.cuveCuveeBId, html:v=>(cuvesCuverie.find(c=>c.id===v.cuveCuveeBId)?.nom||"-")+(v.volumeCuveeB?" ("+v.volumeCuveeB+" HL)":"")},
      {label:"Produits ajoutes", check:v=>v.produitsAjoutes&&v.produitsAjoutes.length>0, html:v=>v.produitsAjoutes&&v.produitsAjoutes.length>0?v.produitsAjoutes.map(p=>p.nom+(p.dose?" "+p.dose:"")+(p.lot?" (Lot:"+p.lot+")":"")).join(", "):"-"},
      {label:"Observations", always:destFilter==="prestation", check:v=>v.observations, html:v=>v.observations||"-", style:'font-style:italic;color:#6a5838'},
    ].filter(col => col.always || vAnnee.some(v=>col.check(v)));
    const rows = vAnnee.map(v=>`<tr>${colonnes.map(col=>`<td${col.style?` style="${col.style}"`:""}>${col.html(v)}</td>`).join("")}</tr>`).join("");
    const idxKg = Math.max(1,colonnes.findIndex(c=>c.label==="Kg"));
    const totalRowHtml = `<td colspan="${idxKg}">TOTAL</td>` + colonnes.slice(idxKg).map(col=>{
      if(col.label==="Kg") return `<td>${kgTotal.toLocaleString()} kg</td>`;
      if(col.label==="HL") return `<td>${hlTotal.toFixed(2)} HL</td>`;
      if(col.label==="Destination") return `<td>Maison: ${kgMaison.toLocaleString()} kg / Negoce: ${kgNegoce.toLocaleString()} kg</td>`;
      return `<td></td>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:Georgia,serif;margin:20px;color:#1a1205}h1{color:#7a5200;border-bottom:1px solid #d4c4a0;padding-bottom:8px}
    table{width:100%;border-collapse:collapse;font-size:10px}th{background:#f5e8cc;color:#7a5200;padding:5px;text-align:left;border:0.5px solid #d4c4a0}
    td{padding:4px 5px;border:0.5px solid #ede5d4}tr:nth-child(even){background:#fffdf7}.total{background:#f5f5f0;font-weight:bold}</style></head>
    <body><h1>Champagne Nowack — Campagne ${annee}${destLabel}</h1>
    <p style="color:#9a8870;font-size:12px">${baseTotaux.length} apport(s) — Total : ${kgTotal.toLocaleString()} kg / ${hlTotal.toFixed(2)} HL${!destFilter?` — Maison : ${kgMaison.toLocaleString()} kg — Negoce : ${kgNegoce.toLocaleString()} kg${kgPrestation>0?" — Prestation : "+kgPrestation.toLocaleString()+" kg":""}`:""}</p>
    <table><thead><tr>${colonnes.map(col=>`<th>${col.label}</th>`).join("")}</tr></thead>
    <tbody>${rows}<tr class="total">${totalRowHtml}</tr></tbody></table>
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
      // Recalculer la difference de volumes pour les cuves cuverie
      const cuveIds = [...new Set([
        editingVendange.cuveTailleId, editingVendange.cuveCuveeId, editingVendange.cuveCuveeBId, editingVendange.cuveBourbesId,
        v.cuveTailleId, v.cuveCuveeId, v.cuveCuveeBId, v.cuveBourbesId
      ].filter(Boolean))];
      if(cuveIds.length>0) {
        setCuvesCuverie(prev=>{
          const next = prev.map(c=>{
            if(!cuveIds.includes(c.id)) return c;
            // Volume ancien
            const oldVol = [
              {id:editingVendange.cuveTailleId, vol:editingVendange.volumeTaille},
              {id:editingVendange.cuveCuveeId, vol:editingVendange.volumeCuvee},
              {id:editingVendange.cuveCuveeBId, vol:editingVendange.volumeCuveeB},
              {id:editingVendange.cuveBourbesId, vol:editingVendange.volumeBourbes},
            ].filter(u=>u.id===c.id).reduce((s,u)=>s+(parseFloat(u.vol)||0),0);
            // Volume nouveau
            const newVol = [
              {id:v.cuveTailleId, vol:v.volumeTaille},
              {id:v.cuveCuveeId, vol:v.volumeCuvee},
              {id:v.cuveCuveeBId, vol:v.volumeCuveeB},
              {id:v.cuveBourbesId, vol:v.volumeBourbes},
            ].filter(u=>u.id===c.id).reduce((s,u)=>s+(parseFloat(u.vol)||0),0);
            const diff = newVol - oldVol;
            if(diff===0) return c;
            const updated = majCuveContenu(c, (parseFloat(c.contenuActuelHL)||0)+diff);
            fbSave("cuvesCuverie", c.id, updated);
            return updated;
          });
          return next;
        });
      }
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
      upd=upd.map(t=>{ if(t.id===mvt.futSource[0]) return{...t,contenuActuel:Math.min(t.volume,t.contenuActuel+vol),statut:"actif"}; if(t.id===mvt.futDest){ const c=Math.max(0,t.contenuActuel-vol); return estVide(c) ? viderFut(t) : {...t,contenuActuel:c}; } return t; });
    } else if(["ecoulage","perte"].includes(mvt.type) && mvt.futSource?.[0]){
      upd=upd.map(t=>t.id===mvt.futSource[0]?{...t,contenuActuel:Math.min(t.volume,t.contenuActuel+vol)}:t);
    } else if(["remplissage","ouillage"].includes(mvt.type) && mvt.futDest){
      upd=upd.map(t=>t.id===mvt.futDest?{...t,contenuActuel:Math.max(0,t.contenuActuel-vol)}:t);
    } else if(mvt.type==="assemblage"){
      if(!window.confirm("L'assemblage ne peut pas etre restaure automatiquement. Supprimer quand meme ?")) return;
    } else if(mvt.type==="entonnage") {
      // Remettre le volume dans la cuve cuverie (supporte ancienne et nouvelle structure)
      if(mvt.isCuveSrc) {
        // Mouvement de la cuve source - remettre son volume
        const volHL = (parseInt(mvt.volume)||0)/100;
        setCuvesCuverie(prev=>prev.map(c=>{
          if(c.id===mvt.entonnageCuveId) {
            const updated = {...c, contenuActuelHL:String(Math.round(((parseFloat(c.contenuActuelHL)||0)+volHL)*100)/100)};
            fbSave("cuvesCuverie", c.id, updated);
            return updated;
          }
          return c;
        }));
      } else if(mvt.futDest) {
        // Mouvement du fut destination - deduire son volume
        const volL = parseInt(mvt.volume)||0;
        upd = upd.map(t=>{
          if(t.id===mvt.futDest) return {...t, contenuActuel:Math.max(0,(t.contenuActuel||0)-volL)};
          return t;
        });
      }
    }
    setTonneaux(upd);
    upd.forEach(t=>saveTonneau(t));
    setMouvements(prev=>prev.filter(m=>m.id!==mvt.id));
    deleteMouvementFb(mvt.id);
  };

  // Notes de degustation
  const openEditNote = (note) => {
    setEditingNote(note);
    setEditNoteForm({boise:note.boise??'',longueur:note.longueur??'',noteG:note.noteG??'',commentaire:note.commentaire||'',date:note.date||''});
    setShowEditDeg(true);
  };
  const saveEditNote = () => {
    const updated = {...editingNote,
      boise:   editNoteForm.boise!==''?parseFloat(editNoteForm.boise):null,
      longueur:editNoteForm.longueur!==''?parseFloat(editNoteForm.longueur):null,
      noteG:   editNoteForm.noteG!==''?parseFloat(editNoteForm.noteG):null,
      commentaire:editNoteForm.commentaire,
      date:editNoteForm.date,
    };
    setDegustations(prev=>prev.map(d=>{
      // Si la date a change, on l'applique a toutes les notes de la meme session
      // (meme fut + meme session) pour rester cohérent, en plus de la note modifiee.
      if(d.id===editingNote.id) return updated;
      if(editNoteForm.date!==editingNote.date && d.futId===editingNote.futId && d.session===editingNote.session) {
        const alsoUpdated = {...d, date:editNoteForm.date};
        saveDegustation(alsoUpdated);
        return alsoUpdated;
      }
      return d;
    }));
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
      const srcId = mvtForm.futSource[0], destId = mvtForm.futDest;
      const srcIsCuve = srcId.startsWith("cuve_"), destIsCuve = destId.startsWith("cuve_");
      if(!srcIsCuve) {
        upd=upd.map(t=>{ if(t.id===srcId){ const c=Math.max(0,t.contenuActuel-vol); return estVide(c) ? viderFut(t) : {...t,contenuActuel:c}; } if(!destIsCuve && t.id===destId) return{...t,contenuActuel:Math.min(t.volume,t.contenuActuel+vol),statut:"actif"}; return t; });
      } else if(!destIsCuve) {
        upd=upd.map(t=>t.id===destId?{...t,contenuActuel:Math.min(t.volume,t.contenuActuel+vol),statut:"actif"}:t);
      }
      if(srcIsCuve||destIsCuve) {
        setCuvesCuverie(prev=>prev.map(c=>{
          let delta=0;
          if(srcIsCuve && c.id===srcId.replace("cuve_","")) delta -= vol/100;
          if(destIsCuve && c.id===destId.replace("cuve_","")) delta += vol/100;
          if(delta!==0) {
            const newHL = (parseFloat(c.contenuActuelHL)||0)+delta;
            const updated = delta<0 ? majCuveContenu(c,newHL) : {...c, contenuActuelHL:String(Math.round(newHL*100)/100)};
            fbSave("cuvesCuverie",c.id,updated);
            return updated;
          }
          return c;
        }));
      }
    } else if(mvtForm.type==="assemblage" && mvtForm.futDest){
      const tot=mvtForm.futSource.reduce((s,id)=>s+(parseFloat(mvtForm.assemblageVolumes[id])||getTonneau(id)?.contenuActuel||0),0);
      upd=upd.map(t=>{
        if(mvtForm.futSource.includes(t.id)) {
          const volPris = parseFloat(mvtForm.assemblageVolumes[t.id])||t.contenuActuel||0;
          const reste = Math.max(0,(t.contenuActuel||0)-volPris);
          return estVide(reste) ? viderFut(t) : {...t, contenuActuel:reste};
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
        if(mvtForm.futSource.includes(t.id)) { const volPerte=parseFloat(mvtForm.perteVolumes[t.id])||0; const c=Math.max(0,(t.contenuActuel||0)-volPerte); return estVide(c) ? viderFut(t) : {...t,contenuActuel:c}; }
        return t;
      });
      const cuvePertes = mvtForm.futSource.filter(id=>id.startsWith("cuve_"));
      if(cuvePertes.length>0) {
        setCuvesCuverie(prev=>prev.map(c=>{
          const key = "cuve_"+c.id;
          if(cuvePertes.includes(key)) {
            const volPerte = parseFloat(mvtForm.perteVolumes[key])||0;
            const updated = majCuveContenu(c, (parseFloat(c.contenuActuelHL)||0)-(volPerte/100));
            fbSave("cuvesCuverie", c.id, updated);
            return updated;
          }
          return c;
        }));
      }
    } else if(mvtForm.type==="ecoulage" && mvtForm.futSource[0]){
      const srcId = mvtForm.futSource[0];
      if(srcId.startsWith("cuve_")) {
        setCuvesCuverie(prev=>prev.map(c=>{
          if(c.id===srcId.replace("cuve_","")) {
            const updated = majCuveContenu(c, (parseFloat(c.contenuActuelHL)||0)-(vol/100));
            fbSave("cuvesCuverie",c.id,updated);
            return updated;
          }
          return c;
        }));
      } else {
        upd=upd.map(t=>{ if(t.id===srcId){ const c=Math.max(0,t.contenuActuel-vol); return estVide(c) ? viderFut(t) : {...t,contenuActuel:c}; } return t; });
      }
    } else if(mvtForm.type==="vidange"){
      upd=upd.map(t=>mvtForm.futSource.includes(t.id)?viderFut(t):t);
      const cuveVidanges = mvtForm.futSource.filter(id=>id.startsWith("cuve_"));
      if(cuveVidanges.length>0) {
        setCuvesCuverie(prev=>prev.map(c=>{
          if(cuveVidanges.includes("cuve_"+c.id)) {
            const updated = {...c, contenuActuelHL:"0", notes:"", isBio:false};
            fbSave("cuvesCuverie",c.id,updated);
            return updated;
          }
          return c;
        }));
      }
    } else if(mvtForm.type==="ouillage" && mvtForm.futSource[0]){
      const srcId = mvtForm.futSource[0];
      const srcIsCuve = srcId.startsWith("cuve_");
      const volTotalOuillage = (mvtForm.ouillageDestFuts||[]).reduce((s,ef)=>s+(parseFloat(ef.volume)||0),0);
      const destFutsList = (mvtForm.ouillageDestFuts||[]).filter(ef=>ef.futId&&!ef.futId.startsWith("cuve_")&&parseFloat(ef.volume)>0);
      const destCuvesList = (mvtForm.ouillageDestFuts||[]).filter(ef=>ef.futId&&ef.futId.startsWith("cuve_")&&parseFloat(ef.volume)>0);
      upd=upd.map(t=>{
        if(!srcIsCuve && t.id===srcId) return {...t,contenuActuel:Math.max(0,(t.contenuActuel||0)-volTotalOuillage)};
        const ef=destFutsList.find(ef=>ef.futId===t.id);
        if(ef) return {...t,contenuActuel:Math.min(t.volume,(t.contenuActuel||0)+(parseFloat(ef.volume)||0))};
        return t;
      });
      if(srcIsCuve || destCuvesList.length>0) {
        setCuvesCuverie(prev=>prev.map(c=>{
          let delta=0;
          if(srcIsCuve && c.id===srcId.replace("cuve_","")) delta -= volTotalOuillage/100;
          const ef = destCuvesList.find(ef=>ef.futId==="cuve_"+c.id);
          if(ef) delta += (parseFloat(ef.volume)||0)/100;
          if(delta!==0) {
            const newHL = (parseFloat(c.contenuActuelHL)||0)+delta;
            const updated = delta<0 ? majCuveContenu(c,newHL) : {...c, contenuActuelHL:String(Math.round(newHL*100)/100)};
            fbSave("cuvesCuverie",c.id,updated);
            return updated;
          }
          return c;
        }));
      }
    } else if(mvtForm.type==="remplissage" && mvtForm.futDest){
      if(mvtForm.futDest.startsWith("cuve_")) {
        setCuvesCuverie(prev=>prev.map(c=>{
          if(c.id===mvtForm.futDest.replace("cuve_","")) {
            const updated = {...c, contenuActuelHL:String(Math.round(((parseFloat(c.contenuActuelHL)||0)+(vol/100))*100)/100)};
            fbSave("cuvesCuverie",c.id,updated);
            return updated;
          }
          return c;
        }));
      } else {
        upd=upd.map(t=>t.id===mvtForm.futDest?{...t,contenuActuel:Math.min(t.volume,t.contenuActuel+vol)}:t);
      }
    } else if(mvtForm.type==="distillerie"){
      const sourcesFuts = (mvtForm.distillerieSources||[]).filter(ds=>ds.id&&!ds.id.startsWith("cuve_")&&parseFloat(ds.volume)>0);
      upd=upd.map(t=>{
        const ds = sourcesFuts.find(ds=>ds.id===t.id);
        if(ds) { const c=Math.max(0,(t.contenuActuel||0)-(parseFloat(ds.volume)||0)); return estVide(c) ? viderFut(t) : {...t,contenuActuel:c}; }
        return t;
      });
    }
    setTonneaux(upd);
    // Sauvegarder uniquement les tonneaux modifies
    upd.forEach((t,i) => {
      const orig = tonneaux[i];
      if(!orig || JSON.stringify(t) !== JSON.stringify(orig)) saveTonneau(t);
    });

    // Entonnage: mettre a jour les cuves cuverie sources et les futs destination
    if(mvtForm.type==="entonnage" && (mvtForm.entonnageCuves||[]).some(ec=>ec.cuveId)) {
      const cuves = mvtForm.entonnageCuves||[];
      // Deduire de chaque cuve source
      setCuvesCuverie(prev=>prev.map(c=>{
        const ec = cuves.find(ec=>ec.cuveId===c.id);
        if(ec && parseFloat(ec.volume)>0) {
          const updated = majCuveContenu(c, (parseFloat(c.contenuActuelHL)||0)-(parseFloat(ec.volume)||0));
          fbSave("cuvesCuverie", c.id, updated);
          return updated;
        }
        return c;
      }));
      // Ajouter dans les futs destination (en L) + reporter le marc + appellation
      const cuvesSrc = mvtForm.entonnageCuves||[];
      // Tous les marcs et cuvees des cuves sources
      const allMarcs = cuvesSrc.map(ec=>{ const vd=vendanges.find(v=>v.id===ec.vendangeId); return vd?.numeroMarc||null; }).filter(Boolean);
      const allCuvees = cuvesSrc.map(ec=>{ const vd=vendanges.find(v=>v.id===ec.vendangeId); return vd?.cuveeCreee||null; }).filter(Boolean);
      const allCepages = [...new Set(cuvesSrc.flatMap(ec=>{ const vd=vendanges.find(v=>v.id===ec.vendangeId); const ids=vd?.parcelleIds&&vd.parcelleIds.length>0?vd.parcelleIds:(vd?.parcelleId?[vd.parcelleId]:[]); return ids.map(id=>parcelles.find(p=>p.id===id)?.cepage).filter(Boolean); }))];
      const vendangeSource = cuvesSrc[0]?.vendangeId ? vendanges.find(v=>v.id===cuvesSrc[0].vendangeId) : null;
      const anneeVendange = vendangeSource?.annee || new Date().getFullYear().toString();
      const cuveSrc = cuvesSrc.length>0 ? cuvesCuverie.find(c=>c.id===cuvesSrc[0].cuveId) : null;
      const updFuts = tonneaux.map(t=>{
        const ef = (mvtForm.entonnageFuts||[]).find(ef=>ef.futId===t.id);
        if(ef && parseFloat(ef.volume)>0) {
          const volL = Math.round(parseFloat(ef.volume)*100);
          const updated = {...t,
            contenuActuel:Math.min(t.volume, (t.contenuActuel||0)+volL),
            statut:"actif",
            marc: allMarcs.length>0?allMarcs.join(" + "):t.marc||"",
            denomination: t.denomination||(allCuvees.length>0?allCuvees.join(" + "):"Vin clair "+anneeVendange),
            appellation: t.appellation||("vins_clairs_"+anneeVendange),
            millesime: parseInt(anneeVendange)||t.millesime||null,
            certif: cuvesSrc.every(ec=>{ const vd=vendanges.find(v=>v.id===ec.vendangeId); return vd?.isBio; })?"BIO":t.certif||"",
            cepage: allCepages.length>0?allCepages.join(" + "):t.cepage||"",
          };
          saveTonneau(updated);
          return updated;
        }
        return t;
      });
      setTonneaux(updFuts);
      // Creer un mouvement par fut destination pour tracabilite
      const mvtsEntonnage = (mvtForm.entonnageFuts||[]).filter(ef=>ef.futId&&parseFloat(ef.volume)>0).map((ef,i)=>({
        id:(Date.now()+i+100).toString(),
        type:"entonnage",
        date:mvtForm.date,
        operateur:mvtForm.operateur,
        futSource:[],
        futDest:ef.futId,
        volume:String(Math.round(parseFloat(ef.volume)*100)),
        notes:`Entonnage depuis ${cuvesSrc.map(ec=>cuvesCuverie.find(c=>c.id===ec.cuveId)?.nom||ec.cuveId).join(" + ")}${allMarcs.length>0?" - Marc "+allMarcs.join(" + "):""}${allCuvees.length>0?" - "+allCuvees.join(" + "):""}`,
        cuveeCreee:allCuvees.join(" + ")||"",
        denominationFut:(()=>{ const fut=tonneaux.find(t=>t.id===ef.futId); return fut?.denomination||""; })(),
        entonnageCuveId:mvtForm.entonnageCuveId,
        marcsSources:cuvesSrc.filter(ec=>ec.cuveId&&parseFloat(ec.volume)>0).map(ec=>({ cuveId:ec.cuveId, cuveNom:cuvesCuverie.find(c=>c.id===ec.cuveId)?.nom||ec.cuveId, volumeHL:parseFloat(ec.volume)||0, marc:vendanges.find(v=>v.id===ec.vendangeId)?.numeroMarc||"", cuveeCreee:vendanges.find(v=>v.id===ec.vendangeId)?.cuveeCreee||"" })),
        timestamp:new Date().toISOString()
      }));
      // Creer un mouvement par cuve source
      const mvtsCuveSrc = cuvesSrc.filter(ec=>ec.cuveId&&parseFloat(ec.volume)>0).map((ec,i)=>{
        const vd = vendanges.find(v=>v.id===ec.vendangeId);
        return {
          id:(Date.now()+200+i).toString(),
          type:"entonnage",
          date:mvtForm.date,
          operateur:mvtForm.operateur,
          futSource:[ec.cuveId],
          futDest:"",
          volume:String(Math.round(parseFloat(ec.volume)*100)),
          notes:`Entonnage vers ${(mvtForm.entonnageFuts||[]).filter(ef=>ef.futId).map(ef=>ef.futId).join(", ")}${vd?" - Marc "+vd.numeroMarc:""}`,
          entonnageCuveId:ec.cuveId,
          isCuveSrc:true,
          timestamp:new Date().toISOString()
        };
      });
      setMouvements(prev=>[...mvtsEntonnage,...mvtsCuveSrc,...prev]);
      mvtsEntonnage.forEach(m=>saveMouvement(m));
      mvtsCuveSrc.forEach(m=>saveMouvement(m));
    }

    // Si modification d'un mouvement existant
    if(editingMvt) {
      const updated = {...editingMvt, ...mvtForm, id:editingMvt.id};
      setMouvements(prev=>prev.map(m=>m.id===editingMvt.id?updated:m));
      saveMouvement(updated);
      setEditingMvt(null);
      setShowMvtForm(false);
      setMvtForm({type:"ouillage",date:new Date().toISOString().slice(0,16),operateur:"",futSource:[],futDest:"",volume:"",notes:"",produit:"",dosage:"",numeroLot:""});
      return;
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
    } else if(mvtForm.type==="distillerie") {
      const sourcesValides = (mvtForm.distillerieSources||[]).filter(ds=>ds.id&&parseFloat(ds.volume)>0);
      if(sourcesValides.length===0) { alert("Ajoutez au moins une source avec un volume."); return; }
      // Deduire les cuves sources (les futs sont deja deduits plus haut)
      const sourcesCuves = sourcesValides.filter(ds=>ds.id.startsWith("cuve_"));
      if(sourcesCuves.length>0) {
        setCuvesCuverie(prev=>prev.map(c=>{
          const ds = sourcesCuves.find(ds=>ds.id.replace("cuve_","")===c.id);
          if(ds) {
            const updated = majCuveContenu(c, (parseFloat(c.contenuActuelHL)||0)-((parseFloat(ds.volume)||0)/100));
            fbSave("cuvesCuverie", c.id, updated);
            return updated;
          }
          return c;
        }));
      }
      // Un mouvement par source pour tracabilite
      const mvtsDistillerie = sourcesValides.map((ds,i)=>{
        const isCuve = ds.id.startsWith("cuve_");
        const nomSource = isCuve ? (cuvesCuverie.find(c=>c.id===ds.id.replace("cuve_",""))?.nom||ds.id) : ds.id;
        return {
          id:(Date.now()+i).toString(),
          type:"distillerie",
          date:mvtForm.date,
          operateur:mvtForm.operateur,
          futSource:isCuve?[]:[ds.id],
          futDest:"",
          volume:ds.volume,
          notes:`Envoi distillerie depuis ${nomSource}${mvtForm.notes?" - "+mvtForm.notes:""}`,
          timestamp:new Date().toISOString()
        };
      });
      setMouvements(prev=>[...mvtsDistillerie,...prev]);
      mvtsDistillerie.forEach(m=>saveMouvement(m));
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
    // Garde-fou : empecher d'importer l'exemple du formulaire tel quel (colle sans etre remplace)
    const exempleBrut = "fut_id;session;date;degustateur;boise;longueur;note_g;commentaire\n23.28;Avril 2026;2026-04-15;Flavien;1;1.5;3;Nez grillé net droit\n23.28;Avril 2026;2026-04-15;Sébastien;1.5;2.5;4.5;Equilibré fruit/bois";
    if(importText.trim()===exempleBrut.trim() || lines.some(l=>l.includes("Nez grillé net droit")||l.includes("Equilibré fruit/bois"))){
      setImportMsg("X Il s'agit du texte d'exemple, pas de vos données. Remplacez-le par votre vrai fichier avant d'importer.");
      return;
    }
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
    brand:    { fontFamily:"'Playfair Display',Georgia,serif", fontSize:"clamp(14px,2vw,19px)", fontWeight:700, color:"#2C3E50", padding:"12px 16px 12px 0", marginRight:"12px", borderRight:"1px solid #d4c4a0", letterSpacing:"0.01em", whiteSpace:"nowrap" },
    navBtn:   (a)=>({ padding:"13px 14px", fontSize:"12px", letterSpacing:"0.09em", textTransform:"uppercase", cursor:"pointer", color:a?"#2C3E50":"#9a8c78", background:"none", border:"none", borderBottom:a?"2px solid #b8860b":"2px solid transparent", fontFamily:"'IBM Plex Mono',monospace", fontWeight:a?600:400, transition:"color 0.15s" }),
    main:     { padding:"clamp(12px, 3vw, 28px) clamp(12px, 3vw, 32px)" },
    card:     { background:"#fffdf7", border:"1px solid #d4c4a0", borderRadius:"10px", padding:"18px 22px", boxShadow:"0 1px 3px rgba(139,105,20,0.06)" },
    cardSm:   { background:"#fffdf7", border:"1px solid #cfc0a0", borderRadius:"8px", padding:"12px 14px", boxShadow:"0 1px 2px rgba(139,105,20,0.05)" },
    btn:      { background:"#8B7355", color:"#1a1208", border:"none", borderRadius:"6px", padding:"8px 18px", fontSize:"12px", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", boxShadow:"0 1px 3px rgba(139,105,20,0.25)", transition:"background 0.15s" },
    btnSm:    { background:"#8B7355", color:"#1a1208", border:"none", borderRadius:"5px", padding:"5px 11px", fontSize:"11px", fontWeight:700, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.04em" },
    ghost:    { background:"none", color:"#5a4a30", border:"1px solid #c8b894", borderRadius:"6px", padding:"6px 13px", fontSize:"12px", cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", transition:"background 0.12s" },
    ghostSm:  { background:"none", color:"#6a5838", border:"1px solid #ccbe9a", borderRadius:"5px", padding:"4px 9px", fontSize:"11px", cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace" },
    lbl:      { fontSize:"10px", letterSpacing:"0.12em", textTransform:"uppercase", color:"#7a6840", marginBottom:"5px", display:"block", fontFamily:"'IBM Plex Mono',monospace" },
    inp:      { background:"#F8F6F2", border:"1px solid #c8b894", borderRadius:"6px", padding:"8px 11px", fontSize:"13px", color:"#1a1205", width:"100%", fontFamily:"'Lora',serif", boxSizing:"border-box", outline:"none" },
    sel:      { background:"#F8F6F2", border:"1px solid #c8b894", borderRadius:"6px", padding:"8px 11px", fontSize:"13px", color:"#1a1205", width:"100%", fontFamily:"'Lora',serif", boxSizing:"border-box" },
    tag:      (c)=>({ display:"inline-flex", alignItems:"center", background:c+"18", color:c, border:`1px solid ${c}55`, borderRadius:"4px", padding:"2px 8px", fontSize:"10px", fontWeight:700, letterSpacing:"0.05em", fontFamily:"'IBM Plex Mono',monospace" }),
    tabBtn:   (a)=>({ padding:"9px 16px", fontSize:"11px", letterSpacing:"0.07em", textTransform:"uppercase", cursor:"pointer", color:a?"#2C3E50":"#7a6840", background:a?"#F8F6F2":"none", border:"none", borderBottom:a?"2px solid #b8860b":"2px solid transparent", fontFamily:"'IBM Plex Mono',monospace", fontWeight:a?600:400 }),
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
  const filteredMouvements = [...mouvements].sort((a,b)=>new Date(b.date)-new Date(a.date)).filter(m=>{
    if(filterMvtAnnee && m.date?.slice(0,4)!==filterMvtAnnee) return false;
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
        <div style={{cursor:"pointer"}} onClick={()=>{setSelectedFut(t.id);setView("fiche");setFicheTab("historique");}}>
          {t.statut==="surveillance"&&<div style={{fontSize:"9px",background:"#c47800",color:"#fff",padding:"1px 6px",marginBottom:"3px",borderRadius:"3px",display:"inline-block",fontWeight:600,letterSpacing:"0.05em"}}>SURVEILLANCE</div>}
          <div style={{fontSize:"13px",fontWeight:600,color:"#1a1205",marginBottom:"1px",paddingLeft:"6px"}}>{t.id}</div>
          <div style={{fontSize:"10px",color:"#6a5838",marginBottom:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingLeft:"6px"}}>{t.denomination}</div>
          {t.cepage&&<div style={{fontSize:"9px",color:"#9a8870",paddingLeft:"6px",marginBottom:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.cepage}</div>}
          {t.certif==="BIO"&&t.statut!=="vide"&&<div style={{paddingLeft:"6px",marginBottom:"4px"}}><span style={{fontSize:"10px",background:"#2d6a00",color:"#fff",borderRadius:"3px",padding:"1px 6px",fontWeight:600}}>🌿 BIO</span></div>}
          {t.marc&&(
            <div style={{paddingLeft:"6px",marginBottom:"4px"}}>
              {String(t.marc).split(" + ").map((m,i)=>(
                <span key={i} style={{fontSize:"9px",background:"#2C3E50",color:"#fff",borderRadius:"3px",padding:"1px 4px",fontWeight:600,marginRight:"3px"}}>M{m.trim()}</span>
              ))}
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingLeft:"6px"}}>
            <span style={{fontSize:"10px",color:"#7a6840"}}>{t.marc?"Marc "+t.marc+" · ":""}{t.millesime||"-"} · {t.volume}L</span>
            <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
              {hasNotes && t.statut!=="vide" && <span style={{fontSize:"10px",color:apc.color,fontWeight:600}}>{ng?.toFixed(1)}*</span>}
              {(parseFloat(t.volumeRI)||0)>0&&<span style={{fontSize:"9px",background:t.appellation==="ri"?"#1a7a40":"#8B0000",color:"#fff",fontFamily:"monospace",borderRadius:"3px",padding:"1px 4px",marginRight:"3px",fontWeight:600}}>{t.appellation==="ri"?"AOC":"RI"}</span>}
              <span style={{fontSize:"11px",fontWeight:600,color:p<20?"#cc2222":p>90?"#1a7a40":apc.color}}>{t.contenuActuel}L</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getSrcDestLabel = (id) => {
    if(!id) return null;
    if(id.startsWith("cuve_")) {
      const c = cuvesCuverie.find(c=>c.id===id.replace("cuve_",""));
      return c ? {id, nomAffiche:c.nom, suffixe:" (cuve)", isCuve:true} : null;
    }
    const f = getTonneau(id);
    return f ? {id:f.id, nomAffiche:f.id, suffixe:" ("+(f.denomination||"-")+")", isCuve:false} : null;
  };
  const MvtRow = ({m}) => {
    const srcs=(m.futSource||[]).map(getSrcDestLabel).filter(Boolean);
    const dest=m.futDest?getSrcDestLabel(m.futDest):null;
    return (
      <div style={{borderBottom:"1px solid #d0c4a0",padding:"10px 4px",display:"grid",gridTemplateColumns:"120px 1fr 1fr 70px 70px",gap:"10px",fontSize:"12px",alignItems:"start"}}>
        <div>
          <div style={{...s.tag(typeColor(m.type)),marginBottom:"4px"}}>{typeLabel(m.type)}</div>
          <div style={{color:"#8a7248",fontSize:"10px",marginTop:"3px"}}>{fmtDate(m.timestamp)}</div>
        </div>
        <div>
          {srcs.length>0&&<div style={{marginBottom:"3px"}}><span style={{color:"#8a7248",marginRight:"4px"}}>De :</span>{srcs.map(f=><span key={f.id} style={{color:"#8B7355",marginRight:"6px",cursor:f.isCuve?"default":"pointer",textDecoration:f.isCuve?"none":"underline"}} onClick={()=>{if(!f.isCuve){setSelectedFut(f.id);setView("fiche");setFicheTab("historique");}}}>{f.nomAffiche}<span style={{color:"#7a6840",textDecoration:"none"}}>{f.suffixe}</span></span>)}</div>}
          {dest&&<div><span style={{color:"#8a7248",marginRight:"4px"}}>Vers :</span><span style={{color:"#8B7355",cursor:dest.isCuve?"default":"pointer",textDecoration:dest.isCuve?"none":"underline"}} onClick={()=>{if(!dest.isCuve){setSelectedFut(dest.id);setView("fiche");setFicheTab("historique");}}}>{dest.nomAffiche}<span style={{color:"#7a6840",textDecoration:"none"}}>{dest.suffixe}</span></span></div>}
          {m.type==="entonnage"&&(()=>{
            const cuveSrc = cuvesCuverie.find(c=>c.id===m.entonnageCuveId);
            // Find vendange from notes
            const marcMatch = m.notes&&m.notes.match(/Marc (\d+)/);
            const marcNum = marcMatch?marcMatch[1]:null;
            const vendangeSrc = marcNum ? vendanges.find(v=>String(v.numeroMarc)===String(marcNum)) : null;
            return (
              <div style={{marginTop:"2px"}}>
                {cuveSrc&&<div style={{color:"#6a5838"}}>De : <strong style={{color:"#2C3E50"}}>{cuveSrc.nom}</strong></div>}
                {marcNum&&<div style={{color:"#6a5838"}}>Marc : <span style={{color:"#2d6a00",cursor:"pointer",textDecoration:"underline",fontWeight:500}} onClick={()=>{if(vendangeSrc){setView("vendanges");}}}>{marcNum}{vendangeSrc?" - "+vendangeSrc.cuveeCreee:""}</span></div>}
                <div style={{color:"#6a5838"}}>Vol : <strong style={{color:"#1a1205"}}>{m.volume?(parseInt(m.volume)/100).toFixed(2)+" HL":""}</strong></div>
              </div>
            );
          })()}
          {m.type!=="entonnage"&&(
            m.volume&&<div style={{color:"#6a5838",marginTop:"2px"}}>Vol : <strong style={{color:"#1a1205"}}>{m.volume}L</strong></div>
          )}
          {m.produit&&<div style={{color:"#6a5838",marginTop:"2px"}}>{m.produit}{m.dosage&&` - ${m.dosage}`}{m.numeroLot&&<span style={{marginLeft:"6px",fontSize:"10px",background:"#F0EDE8",border:"1px solid #d4c4a0",borderRadius:"3px",padding:"1px 5px",color:"#2C3E50",fontFamily:"monospace"}}>Lot: {m.numeroLot}</span>}</div>}
        </div>
        <div style={{color:"#6a5838",fontStyle:"italic",fontSize:"11px"}}>{m.notes}</div>
        <div style={{color:"#8a7248",fontSize:"11px"}}>{m.operateur}</div>
        <div style={{textAlign:"right",display:"flex",flexDirection:"column",gap:"4px"}}>
          {!isMvtCampagneClosed(m.date?.slice(0,4))&&<button title="Modifier"
            style={{background:"#f5e8cc",color:"#2C3E50",border:"1px solid #d4c4a0",borderRadius:"4px",padding:"4px 7px",fontSize:"10px",cursor:"pointer",fontFamily:"monospace",fontWeight:600}}
            onClick={()=>{setEditingMvt(m);setMvtForm({...m});setShowMvtForm(true);}}>
            Modifier
          </button>}
          {!isMvtCampagneClosed(m.date?.slice(0,4))&&<button title="Annuler ce mouvement"
            style={{background:"#fce8e8",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"4px 7px",fontSize:"10px",cursor:"pointer",fontFamily:"monospace",fontWeight:600,whiteSpace:"nowrap"}}
            onClick={()=>annulerMouvement(m)}>
            Supprimer
          </button>}
          {isMvtCampagneClosed(m.date?.slice(0,4))&&<span style={{fontSize:"9px",color:"#9a8870",fontStyle:"italic"}}>Clôturé</span>}
        </div>
      </div>
    );
  };

  const DegRow = ({d}) => (
    <div style={{borderBottom:"1px solid #d0c4a0",padding:"8px 0",display:"grid",gridTemplateColumns:"100px 70px 70px 70px 1fr 64px",gap:"8px",fontSize:"12px",alignItems:"center"}}>
      <div style={{color:"#8B7355",fontWeight:600}}>{d.degustateur}</div>
      <div style={{color:d.boise>=2.5?"#c47800":"#6a5838"}}>{d.boise!=null?`B: ${d.boise}`:"-"}</div>
      <div style={{color:"#6a5838"}}>{d.longueur!=null?`L: ${d.longueur}`:"-"}</div>
      <div style={{fontWeight:600,color:d.noteG>=4?"#1a7a40":d.noteG>=3?"#8B7355":"#7a6840"}}>{d.noteG!=null?`${d.noteG}/5`:"-"}</div>
      <div style={{color:"#6a5838",fontStyle:"italic",fontSize:"11px"}}>{d.commentaire}</div>
      <div style={{display:"flex",gap:"3px",justifyContent:"flex-end"}}>
        <button title="Modifier" style={{background:"#F0EDE8",border:"1px solid #d4c4a0",borderRadius:"3px",padding:"3px 6px",cursor:"pointer",color:"#2C3E50",fontSize:"11px"}}
          onClick={()=>openEditNote(d)}>Mod.</button>
        <button title="Supprimer" style={{background:"#fce8e8",border:"1px solid #f0b4b4",borderRadius:"3px",padding:"3px 6px",cursor:"pointer",color:"#cc2222",fontSize:"11px"}}
          onClick={()=>deleteNote(d.id)}>Sup.</button>
      </div>
    </div>
  );

  const NoteResume = ({futId}) => {
    const notes=notesForFut(futId); if(!notes.length) return <div style={{color:"#8a7248",fontSize:"13px",padding:"8px 0"}}>Aucune note de dégustation.</div>;
    const allYears=[...new Set(notes.map(d=>d.date?.slice(0,4)||"?"))].sort().reverse();
    const activeYear = allYears.includes(ficheDegAnnee)?ficheDegAnnee:allYears[0];
    const notesAnnee = notes.filter(d=>(d.date?.slice(0,4)||"?")=== activeYear);
    const ngVals=notesAnnee.map(d=>d.noteG).filter(Boolean); const ngAvg=ngVals.length?ngVals.reduce((a,b)=>a+b,0)/ngVals.length:null;
    const nbVals=notesAnnee.map(d=>d.boise).filter(Boolean); const nbAvg=nbVals.length?nbVals.reduce((a,b)=>a+b,0)/nbVals.length:null;
    const nlVals=notesAnnee.map(d=>d.longueur).filter(Boolean); const nlAvg=nlVals.length?nlVals.reduce((a,b)=>a+b,0)/nlVals.length:null;
    const sessionsUniques=[...new Set(notesAnnee.map(d=>d.session))];
    return (
      <div>
        <div style={{display:"flex",gap:"0",marginBottom:"16px",borderBottom:"1px solid #d4c4a0",flexWrap:"wrap"}}>
          {allYears.map(y=>(
            <button key={y} onClick={()=>setFicheDegAnnee(y)} style={{padding:"6px 12px",border:"none",borderBottom:activeYear===y?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:activeYear===y?"#2C3E50":"#9a8870",fontWeight:activeYear===y?500:400,fontSize:"12px",cursor:"pointer"}}>
              {y} <span style={{fontSize:"10px",color:"#9a8870"}}>({notes.filter(d=>(d.date?.slice(0,4)||"?")===y).length})</span>
            </button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"16px"}}>
          {[["Note globale moy.", ngAvg?.toFixed(2)||"-", ngAvg>=4?"#1a7a40":ngAvg>=3?"#8B7355":"#888"],
            ["Boisé moyen", nbAvg?.toFixed(2)||"-", "#888"],
            ["Longueur moy.", nlAvg?.toFixed(2)||"-", "#888"]].map(([lbl,val,col],i)=>(
            <div key={i} style={{background:"#F8F6F2",borderRadius:"6px",padding:"10px 14px"}}>
              <div style={{fontSize:"10px",color:"#8a7248",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"4px"}}>{lbl}</div>
              <div style={{fontSize:"20px",fontWeight:600,color:col}}>{val}</div>
            </div>
          ))}
        </div>
        {sessionsUniques.length>0&&(()=>{
          const activeSess = sessionsUniques.includes(ficheDegSession)?ficheDegSession:sessionsUniques[0];
          return (
            <div>
              <div style={{display:"flex",gap:"0",marginBottom:"12px",borderBottom:"1px solid #e8dcc6",flexWrap:"wrap"}}>
                {sessionsUniques.map(sess=>(
                  <button key={sess} onClick={()=>setFicheDegSession(sess)} style={{padding:"5px 10px",border:"none",borderBottom:activeSess===sess?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:activeSess===sess?"#2C3E50":"#9a8870",fontWeight:activeSess===sess?500:400,fontSize:"11px",cursor:"pointer"}}>
                    {sess} <span style={{fontSize:"10px",color:"#9a8870"}}>({notesAnnee.filter(d=>d.session===sess).length})</span>
                  </button>
                ))}
              </div>
              {notesAnnee.filter(d=>d.session===activeSess).map(d=><DegRow key={d.id} d={d}/>)}
            </div>
          );
        })()}
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
  const futsAvecNotesFiltres = futsAvecNotes.filter(t=>{
    const notesT = notesForFut(t.id);
    if(filterDegAnnee && !notesT.some(d=>d.date?.slice(0,4)===filterDegAnnee)) return false;
    if(filterDegSessionG && !notesT.some(d=>d.session===filterDegSessionG)) return false;
    return true;
  });
  const futsFiltres   = futsAvecNotesFiltres.filter(t=>{
    if(filterDegFut    && !t.id.toLowerCase().includes(filterDegFut.toLowerCase())) return false;
    if(filterDegCuvee  && t.denomination!==filterDegCuvee) return false;
    if(filterDegFabric && t.tonnelier!==filterDegFabric) return false;
    if(filterDegVolMin && (t.volume||0) < parseFloat(filterDegVolMin)) return false;
    if(filterDegVolMax && (t.volume||0) > parseFloat(filterDegVolMax)) return false;
    if(filterDegNote) {
      const ng = avgNoteG(t.id);
      if(ng==null) return false;
      if(filterDegNote==="0-2" && !(ng<2)) return false;
      if(filterDegNote==="2-3" && !(ng>=2&&ng<3)) return false;
      if(filterDegNote==="3-4" && !(ng>=3&&ng<4)) return false;
      if(filterDegNote==="4-5" && !(ng>=4&&ng<=5)) return false;
    }
    return true;
  });
  const hasFilter = filterDegFut||filterDegCuvee||filterDegFabric||filterDegVolMin||filterDegVolMax||filterDegNote;

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
        {[["dashboard","Accueil"],["parcelles","Parcelles"],["vigne","Traitements"],["vendanges","Vendanges"],["rendement","Rendement"],["tonneaux","Chai & Cuverie"],["mouvements","Mouvements"],["degustations","Dégustation"],["assemblage","Assemblage"],["tirages","Tirage"],["stock","Stock"]].map(([v,l])=>(
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#2C3E50",fontWeight:500}}>Stock chai</div>
              <div style={{flex:1,height:"1px",background:"linear-gradient(to right, #d4c4a0, transparent)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"12px",marginBottom:"12px"}}>
              {(()=>{
                const isChampagne = t => t.appellation&&(t.appellation.startsWith("vins_clairs") || t.appellation==="vins_reserve" || t.appellation==="ri");
                const isAutre = t => t.appellation==="coteaux" || t.appellation==="ratafia";
                const futsActifs = tonneaux.filter(t=>t.statut!=="vide");
                const totalVin = futsActifs.filter(isChampagne).reduce((s,t)=>s+(t.contenuActuel||0),0);
                const totalAutres = futsActifs.filter(isAutre).reduce((s,t)=>s+(t.contenuActuel||0),0);
                const totalCap = tonneaux.filter(isChampagne).reduce((s,t)=>s+(t.volume||0),0);
                const totalRI = futsActifs.filter(isChampagne).reduce((s,t)=>{
                  const vri = parseFloat(t.volumeRI)||0;
                  if(t.appellation==="ri") return s+(vri>0?vri:(t.contenuActuel||0))/100;
                  return s+vri/100;
                },0);
                const totalTirable = Math.max(0, (totalVin/100) - totalRI);
                const totalRatafiaHL = futsActifs.filter(t=>t.appellation==="ratafia").reduce((s,t)=>s+(t.contenuActuel||0),0)/100;
                const degreRatafia = parseFloat(degresRatafia[0]?.degre) || 18;
                const hlapRatafia = totalRatafiaHL*degreRatafia/100;
                return [
                  {lbl:"Volume Champagne",val:(totalVin/100).toFixed(2)+" HL",sub:`cap. ${(totalCap/100).toFixed(0)} HL`},
                  {lbl:"Volume tirable",val:totalTirable.toFixed(2)+" HL",sub:"~"+Math.floor(totalTirable*100/0.75).toLocaleString("fr-FR")+" btl 75cl",col:"#1a7a40"},
                  ...(futsActifs.filter(t=>t.appellation==="coteaux").reduce((s,t)=>s+(t.contenuActuel||0),0)>0?[{lbl:"Coteaux Champenois",val:(futsActifs.filter(t=>t.appellation==="coteaux").reduce((s,t)=>s+(t.contenuActuel||0),0)/100).toFixed(2)+" HL",sub:"",col:"#8B0000"}]:[]),
                  ...(totalRatafiaHL>0?[{lbl:"Ratafia",val:totalRatafiaHL.toFixed(2)+" HL",sub:`≈ ${hlapRatafia.toFixed(2)} HL d'alcool pur (à ${degreRatafia}°)`,col:"#5c2a08",ratafia:true}]:[]),
                ].map((k,i)=>(
                  <div key={i} style={s.card}>
                    <div style={s.lbl}>{k.lbl}</div>
                    <div style={{fontSize:"28px",fontWeight:700,color:k.col||"#8B7355",letterSpacing:"-0.5px"}}>{k.val}</div>
                    <div style={{fontSize:"11px",color:"#9a8870",marginTop:"4px"}}>{k.sub}</div>
                    {k.ratafia&&<button style={{...s.ghostSm,fontSize:"10px",marginTop:"6px",padding:"3px 8px"}} onClick={()=>{setDegreRatafiaForm(String(degreRatafia));setShowDegreRatafiaForm(true);}}>Modifier le degré</button>}
                  </div>
                ));
              })()}
            </div>
            {(()=>{
              const annee = new Date().getFullYear().toString();
              const riRequisAnnee = riRequis.find(r=>r.annee===annee);
              const isChampagneRI = t => t.appellation&&(t.appellation.startsWith("vins_clairs") || t.appellation==="vins_reserve" || t.appellation==="ri");
              const futsRI = tonneaux.filter(t=>t.statut!=="vide").filter(isChampagneRI).map(t=>{
                const vri = parseFloat(t.volumeRI)||0;
                const contribution = t.appellation==="ri" ? (vri>0?vri:(t.contenuActuel||0))/100 : vri/100;
                return {...t, contribution, divise: vri>0};
              }).filter(t=>t.contribution>0);
              const totalRI = futsRI.reduce((s,t)=>s+t.contribution,0);
              const riOk = !riRequisAnnee || totalRI>=(parseFloat(riRequisAnnee.volumeHL)||0);
              return (
                <div style={{marginBottom:"12px"}}>
                  <div style={{...s.card,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",background:riOk?"#fff":"#fde8e8",border:riOk?"0.5px solid #d4c4a0":"1px solid #f0b4b4"}}>
                    <div style={{display:"flex",gap:"24px",alignItems:"center"}}>
                      <div><div style={{fontSize:"10px",color:"#9a8870",textTransform:"uppercase",letterSpacing:"0.05em"}}>RI actuelle</div><div style={{fontSize:"18px",fontWeight:600,color:riOk?"#8B0000":"#cc2222"}}>{totalRI.toFixed(2)} <span style={{fontSize:"11px"}}>HL</span></div></div>
                      <div><div style={{fontSize:"10px",color:"#9a8870",textTransform:"uppercase",letterSpacing:"0.05em"}}>RI requise {annee}</div><div style={{fontSize:"18px",fontWeight:600,color:"#9a8870"}}>{riRequisAnnee?.volumeHL||"-"} <span style={{fontSize:"11px"}}>HL</span></div></div>
                      {!riOk&&<div style={{fontSize:"12px",color:"#cc2222",fontWeight:500}}>RI insuffisante</div>}
                    </div>
                    <div style={{display:"flex",gap:"8px"}}>
                      <button style={{...s.ghostSm,fontSize:"11px"}} onClick={()=>setShowRiDetail(v=>!v)}>{showRiDetail?"Masquer le détail":"Voir le détail"}</button>
                      <button style={{...s.ghostSm,fontSize:"11px"}} onClick={()=>setShowRiForm(true)}>Saisir RI requise</button>
                    </div>
                  </div>
                  {showRiDetail&&(
                    <div style={{...s.card,marginTop:"6px",padding:"10px 16px",fontSize:"12px"}}>
                      <div style={{fontWeight:500,color:"#2C3E50",marginBottom:"6px"}}>Détail du calcul ({futsRI.length} fût{futsRI.length>1?"s":""})</div>
                      {futsRI.sort((a,b)=>b.contribution-a.contribution).map(t=>(
                        <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"0.5px solid #e8e0d0"}}>
                          <span style={{color:"#6a5838"}}>{t.id} — {t.appellation==="ri"?"RI":t.appellation==="vins_reserve"?"Vins réserve":"Vins clairs"}{t.appellation==="ri"&&!t.divise?" (non divisé, 100% RI)":""}</span>
                          <span style={{fontWeight:500}}>{t.contribution.toFixed(2)} HL</span>
                        </div>
                      ))}
                    </div>
                  )}
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
                        <span style={{fontFamily:"Georgia,serif",fontSize:"13px",color:"#2C3E50",fontWeight:500}}>Vins de Reserve AOC</span>
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#2C3E50",fontWeight:500}}>Stock bouteilles</div>
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
                const champagne = lots.filter(l=>!l.typeProduit||l.typeProduit==="champagne").reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
                const coteauxBlanc = lots.filter(l=>l.typeProduit==="coteaux_blanc").reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
                const coteauxRouge = lots.filter(l=>l.typeProduit==="coteaux_rouge").reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
                const ratafia = lots.filter(l=>l.typeProduit==="ratafia").reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
                return [
                  {lbl:"Champagne",val:champagne+" btl",sub:moins15+" < 15 mois",col:"#8B7355"},
                  {lbl:"< 15 mois",val:moins15+" btl",sub:"non commercialisables",col:"#cc2222"},
                  {lbl:"> 15 mois",val:plus15+" btl",sub:"commercialisables",col:"#1a7a40"},
                  {lbl:"Alertes 15 mois",val:alertes+" lot(s)",sub:"a confirmer",col:"#c47800"},
                  ...(coteauxBlanc>0?[{lbl:"Coteaux Blanc",val:coteauxBlanc+" btl",sub:"",col:"#8B0000"}]:[]),
                  ...(coteauxRouge>0?[{lbl:"Coteaux Rouge",val:coteauxRouge+" btl",sub:"",col:"#8B0000"}]:[]),
                  ...(ratafia>0?[{lbl:"Ratafia",val:ratafia+" btl",sub:"",col:"#5c2a08"}]:[]),
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
              const calcStock = (type) => coiffesStock.filter(c=>c.type===type||(type==="Export"&&c.type==="Export Magnum")).reduce((s,c)=>s+(c.operation==="achat"?parseInt(c.qte)||0:-(parseInt(c.qte)||0)),0);
              const alertesCRD = calcStock("CRD")<500;
              const alertesExp = calcStock("Export")<500;
              const alertesCRDMag = calcStock("CRD Magnum")<20;
              if(!alertesCRD&&!alertesExp&&!alertesCRDMag) return null;
              return (
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#cc2222",fontWeight:500}}>Alertes coiffes</div>
                    <div style={{flex:1,height:"1px",background:"linear-gradient(to right, #f0b4b4, transparent)"}}/>
                  </div>
                  <div style={{display:"grid",gap:"8px"}}>
                    {alertesCRD&&<div style={{padding:"10px 14px",background:"#fde8e8",border:"1px solid #f0b4b4",borderRadius:"6px",fontSize:"12px",color:"#cc2222"}}>CRD 75cl : {calcStock("CRD")} coiffes (seuil 500)</div>}
                    {alertesExp&&<div style={{padding:"10px 14px",background:"#fde8e8",border:"1px solid #f0b4b4",borderRadius:"6px",fontSize:"12px",color:"#cc2222"}}>Export (75cl + Magnum) : {calcStock("Export")} coiffes (seuil 500)</div>}
                    {alertesCRDMag&&<div style={{padding:"10px 14px",background:"#fde8e8",border:"1px solid #f0b4b4",borderRadius:"6px",fontSize:"12px",color:"#cc2222"}}>CRD Magnum : {calcStock("CRD Magnum")} coiffes (seuil 20)</div>}
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
                    <span style={{background:cuivreParCampagne[c]>3000?"#fdd0d0":cuivreParCampagne[c]>2000?"#E8E0D0":"#d4edc0",color:cuivreParCampagne[c]>3000?"#cc2222":cuivreParCampagne[c]>2000?"#c47800":"#2d6a00",borderRadius:"3px",padding:"0 4px",fontSize:"10px",fontWeight:500}}>
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
                        <div style={{fontSize:"16px",fontWeight:500,color:k.col||"#8B7355",lineHeight:1.2}}>{k.val}</div>
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
                        <tr style={{borderBottom:"1px solid #d4c4a0",background:"#F0EDE8"}}>
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
                            <tr key={t.id||i} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#F8F6F2"}}>
                              <td style={{padding:"8px 10px",fontFamily:"monospace",color:"#8B7355",fontWeight:500}}>N°{t.numero}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838"}}>{fmt(t.date)}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838"}}>{t.surface}</td>
                              <td style={{padding:"8px 10px",maxWidth:"320px"}}>
                                <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
                                  {(t.produits||[]).map((p,j)=>(
                                    <span key={j} style={{background:p.matiereActive==="Cuivre"?"#E8E0D0":p.matiereActive==="Soufre"?"#e6f0fb":"#ede5d4",color:p.matiereActive==="Cuivre"?"#2C3E50":p.matiereActive==="Soufre"?"#185FA5":"#5f5e5a",borderRadius:"3px",padding:"1px 5px",fontSize:"10px",fontFamily:"monospace",whiteSpace:"nowrap"}}>
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
                    <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#2C3E50"}}>Calendriers prestataires</div>
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
                      <div key={pdf.id} style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 12px",background:"#F0EDE8",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
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
                    <label style={{...s.btnSm,cursor:"pointer",background:"#F0EDE8",color:"#2C3E50",border:"0.5px solid #d4c4a0"}}>
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
                          <tr style={{borderBottom:"1px solid #d4c4a0",background:"#F0EDE8"}}>

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
                              <tr key={p.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#F8F6F2"}}>
                                <td style={{padding:"8px 10px"}}>
                                  <div style={{fontWeight:500,color:"#1a1205"}}>{p.nom}</div>
                                  {p.fournisseur&&<div style={{fontSize:"10px",color:"#9a8870"}}>{p.fournisseur}</div>}
                                </td>
                                <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:"11px",color:"#9a8870"}}>{p.nAmm||"-"}</td>
                                <td style={{padding:"8px 10px"}}>
                                  {(()=>{ const sa=p.substanceActive||p.matiereActive||"-";
                                    return <span style={{background:sa==="Cuivre"?"#E8E0D0":sa==="Soufre"?"#e6f0fb":"#ede5d4",color:sa==="Cuivre"?"#2C3E50":sa==="Soufre"?"#185FA5":"#5f5e5a",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",fontFamily:"monospace"}}>{sa}</span>;
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
                          <div key={pdf.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",background:"#F0EDE8",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
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
                            style={{background:"#F0EDE8",border:"0.5px solid #d4c4a0",borderRadius:"5px",padding:"6px 12px",fontSize:"11px",cursor:"pointer",color:"#2C3E50",fontFamily:"monospace",display:"flex",alignItems:"center",gap:"5px"}}>
                            <span style={{background:(c.substanceActive||c.matiereActive)==="Cuivre"?"#E8E0D0":(c.substanceActive||c.matiereActive)==="Soufre"?"#e6f0fb":"#ede5d4",color:(c.substanceActive||c.matiereActive)==="Cuivre"?"#2C3E50":"#185FA5",borderRadius:"3px",padding:"0 4px",fontSize:"9px"}}>{c.substanceActive||c.matiereActive}</span>
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
                        <tr style={{borderBottom:"1px solid #d4c4a0",background:"#F0EDE8"}}>
                          {["Date","Surface","Produit","Observations",""].map(h=>(
                            <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {biodyFiltres.sort((a,b)=>new Date(a.date)-new Date(b.date)).map((b,i)=>(
                          <tr key={b.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#F8F6F2"}}>
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
                          <tr style={{borderBottom:"1px solid #d4c4a0",background:"#F0EDE8"}}>
                            {["Parcelle","Surface","Produit","Quantite","N total","N/ha","Observations",""].map(h=>(
                              <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {amendFiltres.sort((a,b)=>a.parcelle.localeCompare(b.parcelle)).map((a,i)=>(
                            <tr key={a.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#F8F6F2"}}>
                              <td style={{padding:"8px 10px",fontWeight:500,color:"#1a1205"}}>{a.parcelle}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838",fontFamily:"monospace"}}>{a.surface} ha</td>
                              <td style={{padding:"8px 10px"}}>
                                <span style={{background:"#E8E0D0",color:"#2C3E50",borderRadius:"3px",padding:"1px 7px",fontSize:"11px",fontFamily:"monospace"}}>{a.produit}</span>
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
                <button key={key} onClick={()=>setTonneauxTab(key)} style={{padding:"10px 20px",border:"none",borderBottom:tonneauxTab===key?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:tonneauxTab===key?"#2C3E50":"#9a8870",fontWeight:tonneauxTab===key?500:400,fontSize:"13px",cursor:"pointer",fontFamily:"Georgia,serif"}}>
                  {lbl}
                </button>
              ))}
            </div>

            {tonneauxTab==="cuverie"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                  <div style={{fontSize:"13px",color:"#7a6840"}}>{cuvesCuverie.length} cuve(s) de cuverie</div>
                  <div style={{display:"flex",gap:"8px"}}>
                    <button style={s.ghost} onClick={()=>setShowPlanChai(true)}>🗺 Voir le plan</button>
                    
                    <button style={s.btn} onClick={()=>{setCuverieForm(CUVERIE_EMPTY);setEditingCuverie(null);setShowCuverieForm(true);}}>+ Nouvelle cuve</button>
                  </div>
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
                            <div style={{fontWeight:500,color:"#1a1205",fontSize:"14px"}}>{c.nom}{c.isBio&&(parseFloat(c.contenuActuelHL)||0)>0&&<span style={{marginLeft:"6px",fontSize:"10px",background:"#2d6a00",color:"#fff",borderRadius:"3px",padding:"1px 6px",fontWeight:600}}>🌿 BIO</span>}</div>
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
                            <div style={{fontWeight:500,color:parseFloat(c.contenuActuelHL)>0?"#8B7355":"#9a8870"}}>{c.contenuActuelHL||"0"} HL</div>
                            {c.notes&&<div style={{fontSize:"11px",color:"#9a8870",fontStyle:"italic",marginTop:"2px"}}>{c.notes}</div>}
                          </div>
                          <div style={{display:"flex",gap:"6px"}}>
                            <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>setShowCuveHistorique(c.id)}>📄 Historique</button>
                            <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>{setCuverieForm({nom:c.nom,type:c.type,volumeHL:c.volumeHL,contenuActuelHL:c.contenuActuelHL||"0",notes:c.notes||""});setEditingCuverie(c);setShowCuverieForm(true);}}>Mod.</button>
                            {parseFloat(c.contenuActuelHL)>0&&(
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#c47800",borderColor:"#e8c888"}} onClick={()=>{
                                if(!window.confirm(`Remettre le volume de "${c.nom}" à zéro (actuellement ${c.contenuActuelHL} HL) ?\n\nCeci ne modifie ni ne supprime aucun assemblage, tirage ou mouvement passé — seul le compteur de volume est réinitialisé.`)) return;
                                const updated = {...c, contenuActuelHL:"0", notes:"", isBio:false};
                                setCuvesCuverie(prev=>prev.map(x=>x.id===c.id?updated:x));
                                fbSave("cuvesCuverie", c.id, updated);
                              }}>↺ Remettre à 0</button>
                            )}
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
                style={{padding:"5px 14px",borderRadius:"4px",border:`1px solid ${!filterAppellation?"#8B7355":"#2a2a2c"}`,background:!filterAppellation?"#fce8a8":"transparent",color:!filterAppellation?"#2C3E50":"#7a6840",fontSize:"12px",cursor:"pointer",fontFamily:"inherit"}}>
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
                  <button key={val} onClick={()=>setFilterStatut(val)} style={{padding:"3px 10px",borderRadius:"4px",border:`0.5px solid ${filterStatut===val?"#8B7355":"#d4c4a0"}`,background:filterStatut===val?"#f5e8cc":"transparent",color:filterStatut===val?"#2C3E50":"#9a8870",fontSize:"11px",cursor:"pointer"}}>{lbl}</button>
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
                    style={{padding:"4px 12px",borderRadius:"4px",border:`0.5px solid ${!filterVendangeAn?"#8B7355":"#d4c4a0"}`,background:!filterVendangeAn?"#f5e8cc":"transparent",color:!filterVendangeAn?"#2C3E50":"#9a8870",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>
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
                      <div style={{fontFamily:"Georgia,serif",fontSize:"16px",fontWeight:500,color:"#2C3E50"}}>Campagne {annee}</div>
                      <div style={{flex:1,height:"0.5px",background:"#d4c4a0"}}/>
                      {isCampagneClosed(annee)?(
                        <span style={{fontSize:"10px",background:"#fde8e8",color:"#cc2222",border:"0.5px solid #f0b4b4",borderRadius:"4px",padding:"2px 8px",fontWeight:500}}>Clôturée</span>
                      ):(
                        <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>cloturerCampagne(annee)}>Clôturer</button>
                      )}
                      {isCampagneClosed(annee)&&<button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>rouvrirCampagne(annee)}>Rouvrir</button>}
                      <button style={{...s.ghostSm,fontSize:"10px",color:"#2d6a00",borderColor:"#7ab848"}} onClick={()=>exportVendangeCSV(annee,vAnnee)}>↓ CSV</button>
                      <select style={{...s.sel,fontSize:"10px",padding:"4px 6px",width:"140px"}} value={pdfDestFilter} onChange={e=>setPdfDestFilter(e.target.value)}>
                        <option value="">Toutes destinations</option>
                        <option value="maison">Maison</option>
                        <option value="negoce">Négoce</option>
                        <option value="prestation">Prestation</option>
                      </select>
                      <button style={{...s.ghostSm,fontSize:"10px",color:"#8B0000",borderColor:"#c85050"}} onClick={()=>exportVendangePDF(annee,vAnnee,pdfDestFilter)}>↓ PDF</button>
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
                      const kgRecoltes = vAnnee.filter(v=>v.destinationMarc!=="prestation").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                const kgPrestation = vAnnee.filter(v=>v.destinationMarc==="prestation").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                      const kgMaison = vAnnee.filter(v=>!v.destinationMarc||v.destinationMarc==="maison").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                        + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0)-(parseFloat(v.kgVendusNegoce)||0),0);
                      const kgNegoce = vAnnee.filter(v=>v.destinationMarc==="negoce_total").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                        + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.kgVendusNegoce)||0),0);
                      const rendAnnee = rendementsAnnuels.find(r=>r.annee===annee);
                      const surfTotale = parseFloat(rendAnnee?.surface)||rendAnnee?.surfaceSnapshot||parcelles.filter(p=>statutParcelle(p)==="production").reduce((s,p)=>s+(parseFloat(p.surface)||0),0);
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
                          {kgPrestation>0&&<div style={{...s.card,padding:"10px"}}>
                            <div style={s.lbl}>Prestation pressurage</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:"#185FA5"}}>{Math.round(kgPrestation).toLocaleString()} kg</div>
                          </div>}
                          {surfTotale>0&&<div style={{...s.card,padding:"10px",background:enRI?"#fde8e8":"transparent"}}>
                            <div style={s.lbl}>kg/ha {kgHaAutorise>0?"vs "+kgHaAutorise+" autorise":""}</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:enRI?"#cc2222":"#1a1205"}}>{kgHaReel.toLocaleString()} kg/ha</div>
                            {enRI&&<div style={{fontSize:"10px",color:"#cc2222",fontWeight:500}}>Section RI +{(kgHaReel-kgHaAutorise).toLocaleString()} kg/ha</div>}
                          </div>}
                        </div>
                      );
                    })()}

                    {[...vAnnee].sort((a,b)=>new Date(b.date+"T"+(b.heure||"00:00"))-new Date(a.date+"T"+(a.heure||"00:00"))).map(v=>{
                      const parc = parcelles.find(p=>p.id===v.parcelleId);
                      const parcs = (v.parcelleIds&&v.parcelleIds.length>0) ? v.parcelleIds.map(id=>parcelles.find(p=>p.id===id)).filter(Boolean) : (parc?[parc]:[]);
                      return (
                        <div key={v.id} style={{...s.card,marginBottom:"10px",borderLeft:`3px solid ${v.destinationMarc==="prestation"?"#185FA5":v.destinationMarc&&v.destinationMarc!=="maison"?"#c47800":"#2d6a00"}`,background:v.destinationMarc==="prestation"?"#dde4ed":"white"}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"12px",marginBottom:"8px"}}>
                            <div>
                              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                                {v.numeroMarc&&<span style={{background:"#2C3E50",color:"#fff",borderRadius:"5px",padding:"2px 10px",fontSize:"13px",fontWeight:700,fontFamily:"monospace",letterSpacing:"0.03em"}}>Marc {v.numeroMarc}</span>}
                                {v.isBio&&<span style={{fontSize:"11px",background:"#2d6a00",color:"#fff",borderRadius:"4px",padding:"2px 8px",fontWeight:600}}>🌿 BIO</span>}
                              </div>
                              {v.cuveeCreee&&<div style={{fontWeight:600,color:"#2C3E50",fontSize:"14px",marginBottom:"2px"}}>{v.cuveeCreee}</div>}
                              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"2px"}}>
                                <div style={{fontWeight:500,color:"#1a1205",fontSize:"13px"}}>{parcs.length>0?parcs.map(p=>p.nom).join(" + "):"Parcelle inconnue"}</div>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"2px"}}>
                                {parc?.certification&&(
                                  <span style={{fontSize:"10px",padding:"1px 5px",borderRadius:"3px",fontFamily:"monospace",fontWeight:500,
                                    background:parc.certification==="BIO"?"#d4edc0":parc.certification==="NON BIO"?"#ede5d4":"#E8E0D0",
                                    color:parc.certification==="BIO"?"#2d6a00":parc.certification==="NON BIO"?"#5f5e5a":"#8b5e0a"}}>
                                    {parc.certification}
                                  </span>
                                )}
                                <span style={{fontSize:"11px",color:"#9a8870"}}>{(()=>{ const ids=v.parcelleIds&&v.parcelleIds.length>0?v.parcelleIds:[v.parcelleId]; const cepages=[...new Set(ids.map(id=>parcelles.find(p=>p.id===id)?.cepage).filter(Boolean))].join(" + "); return cepages||(parc?.cepage||""); })()}{parc?.commune?` - ${parc.commune}`:""}</span>
                              </div>
                              <div style={{fontSize:"11px",color:"#7a6840",marginTop:"3px"}}>{fmt(v.date)}{v.heure?" - "+v.heure:""} - {v.operateur}</div>
                            </div>
                            <div>
                              <div style={s.lbl}>Volume recolte</div>
                              {v.poidsMarcKg&&<div style={{fontSize:"18px",fontWeight:500,color:"#2d6a00"}}>{parseInt(v.poidsMarcKg).toLocaleString()} kg</div>}
                              {v.volumeHL&&<div style={{fontSize:"13px",color:"#2d6a00"}}>{v.volumeHL} HL</div>}
                              {v.destinationMarc&&v.destinationMarc!=="maison"&&<div style={{fontSize:"11px",color:v.destinationMarc==="prestation"?"#185FA5":"#c47800",fontWeight:v.destinationMarc==="prestation"?600:400,marginTop:"3px"}}>{v.destinationMarc==="prestation"?"🔄 Prestation pressurage":v.destinationMarc==="negoce_total"?"Negoce total":"Negoce partiel"}{v.kgVendusNegoce?" - "+parseInt(v.kgVendusNegoce).toLocaleString()+" kg":""}{v.kgPrestation?" - "+parseInt(v.kgPrestation).toLocaleString()+" kg":""}{v.numeroDAE?" - DAE: "+v.numeroDAE:""}</div>}
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
                                  <div key={p.id} style={{background:"#F0EDE8",border:"0.5px solid #d4c4a0",borderRadius:"4px",padding:"3px 10px",fontSize:"11px",color:"#2C3E50"}}>
                                    <strong>{p.nom}</strong>{p.dose?` - ${p.dose}`:""}{p.lot?` (Lot: ${p.lot})`:""}{p.date?` - ${fmt(p.date)}`:""}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {v.observations&&<div style={{borderTop:"0.5px solid #ede5d4",paddingTop:"6px",marginTop:"6px",fontSize:"12px",color:"#6a5838"}}>📝 {v.observations}</div>}
                          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"8px"}}>
                            <button style={{...s.ghostSm}} onClick={()=>openEditVendange(v)}>Modifier</button>
                            <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4"}}
                              onClick={()=>{if(window.confirm("Supprimer cet apport ?")) {
  setVendanges(prev=>prev.filter(x=>x.id!==v.id));
  deleteVendangeFb(v.id);
  // Deduire les volumes des cuves cuverie
  const updates = [
    {id:v.cuveTailleId, vol:v.volumeTaille},
    {id:v.cuveCuveeId, vol:v.volumeCuvee},
    {id:v.cuveCuveeBId, vol:v.volumeCuveeB},
    {id:v.cuveBourbesId, vol:v.volumeBourbes},
  ].filter(u=>u.id&&u.vol&&parseFloat(u.vol)>0);
  if(updates.length>0) {
    setCuvesCuverie(prev=>{
      const next = prev.map(c=>{
        const u = updates.find(u=>u.id===c.id);
        if(u) {
          const updated = majCuveContenu(c, (parseFloat(c.contenuActuelHL)||0)-(parseFloat(u.vol)||0));
          fbSave("cuvesCuverie", c.id, updated);
          return updated;
        }
        return c;
      });
      return next;
    });
  }
}}}>
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
            if(filterStockFormat && stockTab==="champagne" && (l.format||"75cl")!==filterStockFormat) return false;
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
                  {lbl:"Total en stock",val:total+" btl",sub:"tous formats",col:"#8B7355"},
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
                  <button key={key} onClick={()=>{setStockTab(key);setFilterStockStatut("");setFilterStockFormat("");}} style={{padding:"8px 14px",border:"none",borderBottom:stockTab===key?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:stockTab===key?"#2C3E50":"#9a8870",fontWeight:stockTab===key?500:400,fontSize:"12px",cursor:"pointer",fontFamily:"Georgia,serif"}}>{lbl}</button>
                ))}
              </div>

              {/* Alertes */}
              {(()=>{
                const calcStock = (type) => coiffesStock.filter(c=>c.type===type||(type==="Export"&&c.type==="Export Magnum")).reduce((s,c)=>s+(c.operation==="achat"?parseInt(c.qte)||0:-(parseInt(c.qte)||0)),0);
                const alerteCoiffeCRD = calcStock("CRD") < 500;
                const alerteCoiffeMag = calcStock("CRD Magnum") < 20;
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
                            {alerteCoiffeExp&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>Export (75cl + Magnum) : {calcStock("Export")} coiffes (seuil 500)</span>}
                            {calcStock("CRD Magnum")<20&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>CRD Magnum : {calcStock("CRD Magnum")} coiffes (seuil 20)</span>}
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
                {stockTab==="champagne"&&<select style={{...s.sel,maxWidth:"160px"}} value={filterStockFormat} onChange={e=>setFilterStockFormat(e.target.value)}>
                  <option value="">Tous formats</option>
                  <option value="75cl">75cl</option>
                  <option value="Magnum">Magnum</option>
                  <option value="Jeroboam">Jéroboam</option>
                </select>}
                <select style={{...s.sel,maxWidth:"220px"}} value={filterStockStatut} onChange={e=>setFilterStockStatut(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  {[...TOUS_STATUTS_POSSIBLES,"Passage 15 mois (commercialisable)"].map(st=><option key={st} value={st}>{st}</option>)}
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
                <div style={{...s.card,padding:0,marginBottom:"24px"}}>
                  <div style={{maxHeight:"65vh",overflowY:"auto",overflowX:"auto",borderRadius:"8px"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                    <thead>
                      <tr style={{background:"#F0EDE8",borderBottom:"1px solid #d4c4a0"}}>
                        {["Cuvee","Millesime","N° Lot","Format","Date tirage","Age","Statut","Lieu","Qte actuelle","Actions"].map(h=>(
                          <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500,position:"sticky",top:0,background:"#F0EDE8",zIndex:1,boxShadow:"0 1px 0 #d4c4a0"}}>{h}</th>
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
                          <td style={{padding:"10px 12px",fontWeight:600,color:"#8B7355",fontFamily:"monospace",fontSize:"14px"}}>{l.qteActuelle}</td>
                          <td style={{padding:"10px 12px"}}>
                            <div style={{display:"flex",gap:"4px"}}>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#185FA5",borderColor:"#b4d0f0"}}
                                onClick={()=>setLotAction({lot:l,action:"mouvement"})}>Mouvement</button>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#1a7a40",borderColor:"#b4d0b4"}}
                                onClick={()=>{setSortieForm({lotId:l._ids?l._ids[0]:l.id,_ids:l._ids||[l.id],qteMax:parseInt(l.qteActuelle)||0,cuvee:l.cuvee,millesime:l.millesime,format:l.format,date:new Date().toISOString().slice(0,10),qte:"",notes:""});setShowSortieForm(true);}}>Sortie</button>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#8B5A2B",borderColor:"#d4b48c"}}
                                onClick={()=>openEditLot(l)}>Modifier</button>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#2C3E50",borderColor:"#d4c4a0"}}
                                onClick={()=>{setDivPreview(null);setLotAction({lot:l,action:"diviser"});}}>Diviser</button>
                              {l.linkedLotId&&(!l._ids||l._ids.length===1)&&stockBouteilles.find(x=>x.id===l.linkedLotId)&&(
                                <button style={{...s.ghostSm,fontSize:"10px",color:"#c47800",borderColor:"#e8c888"}}
                                  onClick={()=>annulerDivision(l)}>Annuler la division</button>
                              )}
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
                </div>
              )}

              {/* Totaux (respecte les filtres actifs) - tableau croise quand 2 criteres sont selectionnes */}
              {lotsFiltre.length>0 && (()=>{
                const totalGeneral = lotsFiltre.reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
                const dims = groupByStock;
                const DIM_LABELS = {cuvee:"Cuvée",lieu:"Lieu",age:"Âge"};
                const dimVal = (dim,l) => dim==="cuvee" ? l.cuvee+(l.millesime?" "+l.millesime:"") : dim==="lieu" ? (l.lieu||"-") : (l.mois>=15 ? "≥ 15 mois" : "< 15 mois");
                const sortVals = (dim,vals) => {
                  if(dim==="age") return ["< 15 mois","≥ 15 mois"].filter(v=>vals.includes(v));
                  if(dim==="lieu") return [...LIEUX_STOCK.filter(v=>vals.includes(v)), ...vals.filter(v=>!LIEUX_STOCK.includes(v))];
                  return [...vals].sort((a,b)=>a.localeCompare(b));
                };
                const barColor = "#c9a876";

                let content;
                if(dims.length===0) {
                  content = <div style={{fontSize:"11px",color:"#9a8870",marginBottom:"4px"}}>Sélectionne un ou plusieurs critères ci-dessus pour voir le détail (ex. Lieu + Âge pour un tableau croisé).</div>;
                } else if(dims.length===1) {
                  // Liste simple avec barre de proportion
                  const dim = dims[0];
                  const grouped = {};
                  lotsFiltre.forEach(l=>{
                    const key = dimVal(dim,l);
                    grouped[key] = (grouped[key]||0) + (parseInt(l.qteActuelle)||0);
                  });
                  const keysTriees = sortVals(dim, Object.keys(grouped));
                  content = (
                    <div style={{display:"grid",gap:"6px",maxHeight:"340px",overflowY:"auto"}}>
                      {keysTriees.map(k=>{
                        const qte = grouped[k];
                        const pct = totalGeneral>0 ? Math.round(qte/totalGeneral*100) : 0;
                        return (
                          <div key={k}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",marginBottom:"2px"}}>
                              <span style={{color:"#6a5838"}}>{k}</span>
                              <span style={{fontWeight:600,color:"#8B7355",fontFamily:"monospace"}}>{qte.toLocaleString("fr-FR")} btl <span style={{color:"#c4b494",fontWeight:400}}>({pct}%)</span></span>
                            </div>
                            <div style={{height:"6px",background:"#ede5d4",borderRadius:"3px",overflow:"hidden"}}>
                              <div style={{height:"100%",width:pct+"%",background:barColor,borderRadius:"3px"}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                } else {
                  // Tableau croise sur les 2 premiers criteres selectionnes (lignes x colonnes)
                  const [rowDim, colDim] = dims;
                  const matrix = {};
                  const rowSet = new Set(), colSet = new Set();
                  lotsFiltre.forEach(l=>{
                    const rk = dimVal(rowDim,l), ck = dimVal(colDim,l);
                    rowSet.add(rk); colSet.add(ck);
                    matrix[rk] = matrix[rk]||{};
                    matrix[rk][ck] = (matrix[rk][ck]||0) + (parseInt(l.qteActuelle)||0);
                  });
                  const rows = sortVals(rowDim, [...rowSet]);
                  const cols = sortVals(colDim, [...colSet]);
                  const rowTotal = (rk) => cols.reduce((s,ck)=>s+((matrix[rk]||{})[ck]||0),0);
                  const colTotal = (ck) => rows.reduce((s,rk)=>s+((matrix[rk]||{})[ck]||0),0);
                  content = (
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                        <thead>
                          <tr style={{borderBottom:"1.5px solid #d4c4a0"}}>
                            <th style={{textAlign:"left",padding:"6px 10px",color:"#7a6840",fontWeight:600}}>{DIM_LABELS[rowDim]} \ {DIM_LABELS[colDim]}</th>
                            {cols.map(ck=><th key={ck} style={{textAlign:"right",padding:"6px 10px",color:"#7a6840",fontWeight:600}}>{ck}</th>)}
                            <th style={{textAlign:"right",padding:"6px 10px",color:"#2C3E50",fontWeight:700}}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((rk,i)=>(
                            <tr key={rk} style={{borderBottom:"0.5px solid #ede5d4",background:i%2===0?"#fffbf5":"#ffffff"}}>
                              <td style={{padding:"6px 10px",color:"#6a5838",fontWeight:500}}>{rk}</td>
                              {cols.map(ck=>{
                                const v = (matrix[rk]||{})[ck]||0;
                                return <td key={ck} style={{textAlign:"right",padding:"6px 10px",color:v>0?"#8B7355":"#d4c4a0",fontFamily:"monospace"}}>{v>0?v.toLocaleString("fr-FR"):"-"}</td>;
                              })}
                              <td style={{textAlign:"right",padding:"6px 10px",fontWeight:600,color:"#2C3E50",fontFamily:"monospace"}}>{rowTotal(rk).toLocaleString("fr-FR")}</td>
                            </tr>
                          ))}
                          <tr style={{borderTop:"1.5px solid #d4c4a0"}}>
                            <td style={{padding:"6px 10px",fontWeight:700,color:"#2C3E50"}}>Total</td>
                            {cols.map(ck=><td key={ck} style={{textAlign:"right",padding:"6px 10px",fontWeight:600,color:"#2C3E50",fontFamily:"monospace"}}>{colTotal(ck).toLocaleString("fr-FR")}</td>)}
                            <td style={{textAlign:"right",padding:"6px 10px",fontWeight:700,color:"#2C3E50",fontFamily:"monospace"}}>{totalGeneral.toLocaleString("fr-FR")}</td>
                          </tr>
                        </tbody>
                      </table>
                      {dims.length>2 && <div style={{fontSize:"10px",color:"#9a8870",marginTop:"6px"}}>Le 3e critère ({DIM_LABELS[dims[2]]}) n'est pas affiché dans ce tableau croisé (limité à 2 axes) — désélectionne-le ou remplace-le pour changer les axes.</div>}
                    </div>
                  );
                }

                return (
                  <div style={{...s.card,padding:"16px 20px",marginTop:"16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showTotauxDetail?"12px":"0",flexWrap:"wrap",gap:"8px"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#2C3E50"}}>Totaux ({lotsFiltre.length} lot{lotsFiltre.length>1?"s":""} — filtres appliqués)</div>
                      <button style={{...s.ghostSm,fontSize:"11px"}} onClick={()=>setShowTotauxDetail(v=>!v)}>{showTotauxDetail?"Masquer le détail":"Voir le détail"}</button>
                    </div>
                    {showTotauxDetail && (
                      <>
                        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"12px"}}>
                          {[["cuvee","Cuvée"],["lieu","Lieu"],["age","Âge"]].map(([val,lbl])=>(
                            <button key={val} onClick={()=>setGroupByStock(prev=>prev.includes(val)?prev.filter(x=>x!==val):[...prev,val])}
                              style={{padding:"4px 10px",borderRadius:"5px",border:`0.5px solid ${groupByStock.includes(val)?"#8B7355":"#d4c4a0"}`,background:groupByStock.includes(val)?"#F0EDE8":"transparent",color:groupByStock.includes(val)?"#8B7355":"#9a8870",fontSize:"11px",cursor:"pointer",fontWeight:groupByStock.includes(val)?600:400}}>
                              {groupByStock.includes(val)?"✓ ":""}{lbl}
                            </button>
                          ))}
                        </div>
                        {content}
                      </>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",marginTop:showTotauxDetail?"10px":"0",borderTop:showTotauxDetail?"1px solid #d4c4a0":"none",fontSize:"13px"}}>
                      <span style={{fontWeight:500,color:"#2C3E50"}}>Total général</span>
                      <span style={{fontWeight:700,color:"#2C3E50",fontFamily:"monospace"}}>{totalGeneral.toLocaleString("fr-FR")} btl</span>
                    </div>
                  </div>
                );
              })()}

              {/* Encart coiffes */}
              {(()=>{
                const calcStock = (type) => coiffesStock.filter(c=>c.type===type||(type==="Export"&&c.type==="Export Magnum")).reduce((s,c)=>s+(c.operation==="achat"?parseInt(c.qte)||0:-(parseInt(c.qte)||0)),0);
                const stockCRD = calcStock("CRD");
                const stockCRDMag = calcStock("CRD Magnum");
                const stockCRDJer = calcStock("CRD Jeroboam");
                const stockExport = calcStock("Export");
                const stockExpJer = calcStock("Export Jeroboam");
                const stockVignetteCRD = calcStock("Vignette CRD Coteaux");
                const stockNeutre50 = calcStock("Neutre 50cl");
                const stockNeutre3L = calcStock("Neutre 3L");
                return (
                  <div style={{...s.card,padding:"16px 20px",marginTop:"16px",marginBottom:"16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#2C3E50"}}>Stock coiffes</div>
                      <button style={s.btnSm} onClick={()=>setShowCoiffesForm(true)}>+ Achat coiffes</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
                      {[["CRD 75cl",stockCRD,"#6a2d8a"],["CRD Mag",stockCRDMag,"#6a2d8a"],["CRD Jer",stockCRDJer,"#6a2d8a"],
                        ["Export 75cl/Mag",stockExport,"#8a2d6a"],["Export Jer",stockExpJer,"#8a2d6a"],
                        ["Vignette CRD Coteaux",stockVignetteCRD,"#2d6a5c"],
                        ["Neutre 50cl (Ratafia)",stockNeutre50,"#5c2a08"],["Neutre 3L (Ratafia)",stockNeutre3L,"#5c2a08"]
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
                    <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#2C3E50"}}>Historique des sorties {showHistSorties?"▲":"▼"}</div>
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
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px",padding:"10px",background:"#F0EDE8",borderRadius:"6px"}}>
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
                        <span style={{color:"#8B7355",fontFamily:"monospace",marginLeft:"8px",fontWeight:500}}>{c.qte} {c.format==="Magnum"?"Magnums":c.format==="Jeroboam"?"Jeroboams":"btl"} sorties</span>
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
        {view==="assemblage" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"20px",color:"#2C3E50"}}>Assemblages</div>
              <button style={s.btn} onClick={()=>{setEditingAssemblage(null);setAssemblageForm({nomCuvee:"",date:new Date().toISOString().slice(0,10),isBio:false,sources:[{type:"tonneau",id:"",volume:""}],cuveAssemblageId:"",destTirageId:"",destTirageVol:"",destRetours:[{id:"",volume:""}],destRetoursRI:[{id:"",volume:""}],notes:""});setShowAssemblageForm(true);}}>+ Nouvel assemblage</button>
            </div>
            {assemblages.length===0&&<div style={{...s.card,color:"#9a8870",fontStyle:"italic"}}>Aucun assemblage enregistré.</div>}
            {[...new Set(assemblages.map(a=>a.date?.slice(0,4)))].sort().reverse().map(annee=>(
              <div key={annee} style={{marginBottom:"24px"}}>
                <div style={{fontFamily:"Georgia,serif",fontSize:"16px",color:"#2C3E50",marginBottom:"12px",borderBottom:"1px solid #d4c4a0",paddingBottom:"6px"}}>Campagne {annee}</div>
                {assemblages.filter(a=>a.date?.slice(0,4)===annee).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(a=>(
                  <div key={a.id} style={{...s.card,marginBottom:"12px",borderLeft:"3px solid #2C3E50"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:"10px"}}>
                      <div>
                        <div style={{fontFamily:"Georgia,serif",fontSize:"16px",fontWeight:500,color:"#2C3E50"}}>{a.nomCuvee||"Sans nom"}{a.isBio&&<span style={{marginLeft:"8px",fontSize:"11px",background:"#2d6a00",color:"#fff",borderRadius:"4px",padding:"2px 7px",fontWeight:600}}>🌿 BIO</span>}</div>
                        <div style={{fontSize:"12px",color:"#9a8870"}}>{fmt(a.date)}</div>
                      </div>
                      <div style={{display:"flex",gap:"6px"}}>
                        <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>{
                          const destRetours = a.destRetours && a.destRetours.length>0 ? a.destRetours
                            : a.destRetourId ? [{id:a.destRetourId,volume:a.destRetourVol||""}]
                            : [{id:"",volume:""}];
                          const destRetoursRI = a.destRetoursRI && a.destRetoursRI.length>0 ? a.destRetoursRI : [{id:"",volume:""}];
                          setAssemblageForm({...a, destRetours, destRetoursRI, sources: a.sources&&a.sources.length>0?a.sources:[{type:"tonneau",id:"",volume:""}]});
                          setEditingAssemblage(a);
                          setShowAssemblageForm(true);
                        }}>Modifier</button>
                        <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>{
                          if(!window.confirm("Supprimer cet assemblage et restituer les volumes ?")) return;
                          // Restituer volumes aux sources
                          const updFuts = tonneaux.map(t=>{
                            const src = (a.sources||[]).find(s=>s.id===t.id);
                            const vol = parseFloat(src?.volume)||0;
                            if(vol>0) {
                              const updated = {...t, contenuActuel:(t.contenuActuel||0)+vol, statut:"actif"};
                              saveTonneau(updated); return updated;
                            }
                            // Annuler retour reserve ou RI fût
                            const retourFutMatch = (a.destRetours||[]).find(r=>r.id===t.id&&!r.id?.startsWith("cuve_"))
                              || (a.destRetoursRI||[]).find(r=>r.id===t.id&&!r.id?.startsWith("cuve_"));
                            if(retourFutMatch) {
                              const volR = parseFloat(retourFutMatch.volume)||0;
                              const newVol = Math.max(0,(t.contenuActuel||0)-volR);
                              const updated = estVide(newVol) ? viderFut(t) : {...t, contenuActuel:newVol};
                              saveTonneau(updated); return updated;
                            }
                            return t;
                          });
                          setTonneaux(updFuts);
                          // Annuler cuve assemblage (retirer le volume net qui y avait ete ajoute)
                          if(a.cuveAssemblageId) {
                            const volTotalA = (a.sources||[]).reduce((s,src)=>s+(parseFloat(src.volume)||0),0);
                            const volSortieA = (parseFloat(a.destTirageVol)||0)+((a.destRetours||[]).reduce((s,r)=>s+(parseFloat(r.volume)||0),0))+((a.destRetoursRI||[]).reduce((s,r)=>s+(parseFloat(r.volume)||0),0));
                            const volNetA = volTotalA - volSortieA;
                            setCuvesCuverie(prev=>prev.map(c=>{
                              if(c.id===a.cuveAssemblageId) {
                                const updated = majCuveContenu(c, (parseFloat(c.contenuActuelHL)||0)-(volNetA/100));
                                fbSave("cuvesCuverie",c.id,updated); return updated;
                              }
                              return c;
                            }));
                          }
                          // Annuler cuve tirage
                          if(a.destTirageId) {
                            const volT = parseFloat(a.destTirageVol)||0;
                            setCuvesCuverie(prev=>prev.map(c=>{
                              if(c.id===a.destTirageId) {
                                const updated = majCuveContenu(c, (parseFloat(c.contenuActuelHL)||0)-(volT/100));
                                fbSave("cuvesCuverie",c.id,updated); return updated;
                              }
                              return c;
                            }));
                          }
                          // Annuler retour cuve (reserve + RI)
                          [...(a.destRetours||[]),...(a.destRetoursRI||[])].filter(r=>r.id?.startsWith("cuve_")).forEach(r=>{
                            const cuveId = r.id.replace("cuve_","");
                            const volR = parseFloat(r.volume)||0;
                            setCuvesCuverie(prev=>prev.map(c=>{
                              if(c.id===cuveId) {
                                const updated = majCuveContenu(c, (parseFloat(c.contenuActuelHL)||0)-(volR/100));
                                fbSave("cuvesCuverie",c.id,updated); return updated;
                              }
                              return c;
                            }));
                          });
                          // Restituer les cuves sources
                          (a.sources||[]).filter(src=>src.type==="cuve"&&src.id).forEach(src=>{
                            const volS = parseFloat(src.volume)||0;
                            if(volS<=0) return;
                            setCuvesCuverie(prev=>prev.map(c=>{
                              if(c.id===src.id) {
                                const updated = {...c, contenuActuelHL:String((parseFloat(c.contenuActuelHL)||0)+(volS/100))};
                                fbSave("cuvesCuverie",c.id,updated); return updated;
                              }
                              return c;
                            }));
                          });
                          setAssemblages(prev=>prev.filter(x=>x.id!==a.id));
                          deleteAssemblageFb(a.id);
                        }}>Supprimer</button>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",fontSize:"12px"}}>
                      <div style={{background:"#f4f6f7",borderRadius:"6px",padding:"10px"}}>
                        <div style={{fontWeight:500,color:"#2C3E50",marginBottom:"6px"}}>Sources</div>
                        {(a.sources||[]).map((src,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"0.5px solid #e0e8f0"}}>
                            <span style={{color:"#4A6274"}}>
                              {src.type==="cuve"
                                ? "🥃 Cuve — "+(cuvesCuverie.find(c=>c.id===src.id)?.nom||src.id)
                                : (src.type==="reserve"?"🍷 Réserve ":src.type==="ri"?"🔒 RI ":"🛢 Fût ")+src.id+(tonneaux.find(t=>t.id===src.id)?.denomination?" — "+tonneaux.find(t=>t.id===src.id).denomination:"")
                              }
                            </span>
                            <span style={{fontWeight:500}}>{src.volume} L</span>
                          </div>
                        ))}
                        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontWeight:600,color:"#2C3E50",borderTop:"1px solid #d4c4a0",marginTop:"4px"}}>
                          <span>Total assemblé</span>
                          <span>{(a.sources||[]).reduce((s,src)=>s+(parseFloat(src.volume)||0),0).toLocaleString()} L</span>
                        </div>
                      </div>
                      <div style={{background:"#f4f6f7",borderRadius:"6px",padding:"10px"}}>
                        <div style={{fontWeight:500,color:"#2C3E50",marginBottom:"6px"}}>Destinations</div>
                        {a.cuveAssemblageId&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"0.5px solid #e0e8f0"}}>
                          <span style={{color:"#8B6000"}}>🥃 Cuve d'assemblage — {cuvesCuverie.find(c=>c.id===a.cuveAssemblageId)?.nom||a.cuveAssemblageId}</span>
                          <span style={{fontWeight:500}}>{((a.sources||[]).reduce((s,src)=>s+(parseFloat(src.volume)||0),0)-(parseFloat(a.destTirageVol)||0)-((a.destRetours||[]).reduce((s,r)=>s+(parseFloat(r.volume)||0),0))-((a.destRetoursRI||[]).reduce((s,r)=>s+(parseFloat(r.volume)||0),0))).toLocaleString()} L</span>
                        </div>}
                        {a.destTirageId&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"0.5px solid #e0e8f0"}}>
                          <span style={{color:"#2d6a00"}}>🍾 Tirage — {cuvesCuverie.find(c=>c.id===a.destTirageId)?.nom||a.destTirageId}</span>
                          <span style={{fontWeight:500}}>{a.destTirageVol} L</span>
                        </div>}
                        {(a.destRetours||[]).filter(r=>r.id&&r.volume).map((r,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"0.5px solid #e0e8f0"}}>
                            <span style={{color:"#7a5200"}}>🔄 Retour réserve — {r.id.startsWith("cuve_")?(cuvesCuverie.find(c=>c.id===r.id.replace("cuve_",""))?.nom||r.id):(r.id+(tonneaux.find(t=>t.id===r.id)?.denomination?" — "+tonneaux.find(t=>t.id===r.id).denomination:""))}</span>
                            <span style={{fontWeight:500}}>{r.volume} L</span>
                          </div>
                        ))}
                        {(a.destRetoursRI||[]).filter(r=>r.id&&r.volume).map((r,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"0.5px solid #e0e8f0"}}>
                            <span style={{color:"#6a3a8a"}}>🔒 Retour RI — {r.id.startsWith("cuve_")?(cuvesCuverie.find(c=>c.id===r.id.replace("cuve_",""))?.nom||r.id):(r.id+(tonneaux.find(t=>t.id===r.id)?.denomination?" — "+tonneaux.find(t=>t.id===r.id).denomination:""))}</span>
                            <span style={{fontWeight:500}}>{r.volume} L</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {a.notes&&<div style={{marginTop:"8px",fontSize:"12px",color:"#6a5838",fontStyle:"italic",borderTop:"0.5px solid #ede5d4",paddingTop:"8px"}}>{a.notes}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {view==="tirages" && (()=>{
          const anneesTirages = [...new Set(tirages.map(t=>t.date?.slice(0,4)).filter(Boolean))].sort().reverse();
          const tiragesAffiches = [...tirages].filter(t=>!filterTirageAnnee||t.date?.slice(0,4)===filterTirageAnnee).sort((a,b)=>new Date(b.date)-new Date(a.date));
          return (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px",flexWrap:"wrap",gap:"10px"}}>
              <div style={{fontSize:"13px",color:"#7a6840"}}>{tiragesAffiches.length} tirage(s){filterTirageAnnee?" en "+filterTirageAnnee:""} ({tirages.length} au total)</div>
              <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                <select style={{...s.sel,maxWidth:"140px"}} value={filterTirageAnnee} onChange={e=>setFilterTirageAnnee(e.target.value)}>
                  <option value="">Toutes les années</option>
                  {anneesTirages.map(a=><option key={a} value={a}>{a}</option>)}
                </select>
                <button style={s.btn} onClick={()=>{setTirageForm(TIRAGE_EMPTY);setEditingTirage(null);setShowTirageForm(true);}}>
                  + Nouveau tirage
                </button>
              </div>
            </div>

            {tirages.length===0 && (
              <div style={{...s.card,textAlign:"center",padding:"40px",color:"#9a8870"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>Aucun tirage enregistré</div>
                <div style={{fontSize:"13px",marginBottom:"16px"}}>Créez votre premier tirage pour commencer le suivi.</div>
                <button style={s.btn} onClick={()=>{setTirageForm(TIRAGE_EMPTY);setEditingTirage(null);setShowTirageForm(true);}}>+ Nouveau tirage</button>
              </div>
            )}
            {tirages.length>0 && tiragesAffiches.length===0 && (
              <div style={{...s.card,textAlign:"center",padding:"40px",color:"#9a8870"}}>
                <div style={{fontSize:"14px"}}>Aucun tirage en {filterTirageAnnee}.</div>
              </div>
            )}

            <div style={{display:"grid",gap:"14px"}}>
              {tiragesAffiches.map(t=>(
                <div key={t.id} style={{...s.card,borderLeft:"3px solid #533AB7"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"16px"}}>
                    {/* Identite */}
                    <div>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"16px",fontWeight:500,color:"#2C3E50",marginBottom:"2px"}}>{t.cuvee}{t.isBio&&<span style={{marginLeft:"8px",fontSize:"11px",background:"#2d6a00",color:"#fff",borderRadius:"4px",padding:"2px 7px",fontWeight:600}}>🌿 BIO</span>}</div>
                      <div style={{fontSize:"12px",color:"#9a8870",marginBottom:"8px"}}>{fmt(t.date)} - {t.operateur}</div>
                      {t.millesime&&<div style={{fontSize:"11px",color:"#6a5838"}}>Millésime : <strong>{t.millesime}</strong></div>}
                      {t.futsSources?.length>0&&(
                        <div style={{fontSize:"11px",color:"#6a5838",marginTop:"3px"}}>
                          Futs : {t.futsSources.join(", ")}
                        </div>
                      )}
                      {t.cuveSourceId&&(
                        <div style={{fontSize:"11px",color:"#6a5838",marginTop:"3px"}}>
                          Cuve source : {cuvesCuverie.find(c=>c.id===t.cuveSourceId)?.nom||t.cuveSourceId}
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
                          {t.levainLot&&<div style={{display:"inline-flex",alignItems:"center",background:"#F0EDE8",border:"0.5px solid #d4c4a0",borderRadius:"3px",padding:"1px 7px",fontSize:"10px",color:"#2C3E50",fontFamily:"monospace",marginBottom:"4px"}}>Lot: {t.levainLot}</div>}
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
                          <span style={{display:"inline-block",width:"18px",height:"18px",background:"#d4edc0",borderRadius:"3px",textAlign:"center",lineHeight:"18px",fontSize:"10px",marginRight:"5px",color:"#2d6a00",fontFamily:"monospace"}}>{t.typeProduit==="ratafia"?50:75}</span>
                          {t.qte75} bouteilles = {((parseFloat(t.qte75)||0)*(t.typeProduit==="ratafia"?0.5:0.75)).toFixed(0)}L
                        </div>}
                        {(parseFloat(t.qteMagnum)||0)>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>
                          <span style={{display:"inline-block",width:"18px",height:"18px",background:"#E8E0D0",borderRadius:"3px",textAlign:"center",lineHeight:"18px",fontSize:"10px",marginRight:"5px",color:"#2C3E50",fontFamily:"monospace"}}>M</span>
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
                    <button style={{background:"#F0EDE8",color:"#2C3E50",border:"0.5px solid #d4c4a0",borderRadius:"4px",padding:"4px 12px",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}
                      onClick={()=>openEditTirage(t)}>
                      Modifier
                    </button>
                    <button style={{background:"#fce8e8",color:"#cc2222",border:"0.5px solid #f0b4b4",borderRadius:"4px",padding:"4px 12px",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}
                      onClick={()=>{
  if(!window.confirm("Supprimer ce tirage et restituer les volumes ?")) return;
  // Restituer volumes aux futs sources (ancien systeme)
  const updFuts = tonneaux.map(fut=>{
    const vol = parseFloat(t.futsSourcesVolumes?.[fut.id])||0;
    if(vol>0) {
      const newVol = (fut.contenuActuel||0)+vol;
      const updated = {...fut, contenuActuel:newVol, statut:"actif"};
      saveTonneau(updated); return updated;
    }
    return fut;
  });
  setTonneaux(updFuts);
  // Restituer volume a la cuve source (cuverie)
  if(t.cuveSourceId) {
    const volHL = (parseFloat(t.volumeTotal)||0)/100;
    setCuvesCuverie(prev=>prev.map(c=>{
      if(c.id===t.cuveSourceId) {
        const updated = {...c, contenuActuelHL:String(Math.round(((parseFloat(c.contenuActuelHL)||0)+volHL)*100)/100)};
        fbSave("cuvesCuverie",c.id,updated); return updated;
      }
      return c;
    }));
  }
  setTirages(prev=>prev.filter(tr=>tr.id!==t.id));
  deleteTirageFb(t.id);
}}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })()}

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
                  <button style={s.ghost} onClick={()=>{setBulkDateForm({session:"",date:new Date().toISOString().slice(0,10)});setShowBulkDateForm(true);}}>
                    <i className="ti ti-calendar" style={{marginRight:"4px"}}/>Corriger une date de session
                  </button>
                  <button style={s.btn} onClick={()=>{setDegForm({futId:"",session:"",date:new Date().toISOString().slice(0,10),lignes:degustateurs.filter(d=>d.actif).map(d=>({degustateur:d.nom,boise:"",longueur:"",noteG:"",commentaire:""}))});setShowDegForm(true);}}>
                    <i className="ti ti-plus" style={{marginRight:"4px"}}/>Nouvelle dégustation
                  </button>
                </div>
              </div>

              {/* Onglets campagne */}
              {(()=>{
                const allYearsG = [...new Set(degustations.map(d=>d.date?.slice(0,4)||"?"))].sort().reverse();
                const allSessionsG = [...new Set(degustations.filter(d=>d.date?.slice(0,4)===filterDegAnnee).map(d=>d.session))].sort().reverse();
                return (
                  <div>
                    <div style={{display:"flex",gap:"0",marginBottom:"8px",borderBottom:"1px solid #d4c4a0",flexWrap:"wrap"}}>
                      {allYearsG.map(y=>(
                        <button key={y} onClick={()=>{setFilterDegAnnee(y);setFilterDegSessionG("");}} style={{padding:"6px 14px",border:"none",borderBottom:filterDegAnnee===y?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:filterDegAnnee===y?"#2C3E50":"#9a8870",fontWeight:filterDegAnnee===y?500:400,fontSize:"13px",cursor:"pointer",fontFamily:"Georgia,serif"}}>
                          {y} <span style={{fontSize:"10px",color:"#9a8870"}}>({degustations.filter(d=>d.date?.slice(0,4)===y).length})</span>
                        </button>
                      ))}
                    </div>
                    {allSessionsG.length>0&&<div style={{display:"flex",gap:"0",marginBottom:"12px",borderBottom:"1px solid #ede5d4",flexWrap:"wrap"}}>
                      <button onClick={()=>setFilterDegSessionG("")} style={{padding:"4px 10px",border:"none",borderBottom:filterDegSessionG===""?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:filterDegSessionG===""?"#2C3E50":"#9a8870",fontSize:"11px",cursor:"pointer"}}>
                        Toutes les sessions
                      </button>
                      {allSessionsG.map(s=>(
                        <button key={s} onClick={()=>setFilterDegSessionG(s)} style={{padding:"4px 10px",border:"none",borderBottom:filterDegSessionG===s?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:filterDegSessionG===s?"#2C3E50":"#9a8870",fontSize:"11px",cursor:"pointer"}}>
                          {s} ({degustations.filter(d=>d.date?.slice(0,4)===filterDegAnnee&&d.session===s).length})
                        </button>
                      ))}
                    </div>}
                  </div>
                );
              })()}
              {/* Barre de filtres */}
              <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap",alignItems:"center",padding:"10px 14px",background:"#F8F6F2",border:"1px solid #cfc0a0",borderRadius:"8px"}}>
                <i className="ti ti-filter" style={{fontSize:"14px",color:"#8B7355",flexShrink:0}}/>
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
                <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                  <input type="number" style={{...s.inp,width:"70px",padding:"5px 9px",fontSize:"12px"}}
                    placeholder="Vol. min" value={filterDegVolMin} onChange={e=>setFilterDegVolMin(e.target.value)}/>
                  <span style={{fontSize:"11px",color:"#9a8870"}}>–</span>
                  <input type="number" style={{...s.inp,width:"70px",padding:"5px 9px",fontSize:"12px"}}
                    placeholder="Vol. max" value={filterDegVolMax} onChange={e=>setFilterDegVolMax(e.target.value)}/>
                  <span style={{fontSize:"11px",color:"#9a8870"}}>L</span>
                </div>
                <select style={{...s.sel,maxWidth:"150px",padding:"5px 9px",fontSize:"12px"}}
                  value={filterDegNote} onChange={e=>setFilterDegNote(e.target.value)}>
                  <option value="">Toutes les notes</option>
                  <option value="0-2">Moins de 2</option>
                  <option value="2-3">Entre 2 et 3</option>
                  <option value="3-4">Entre 3 et 4</option>
                  <option value="4-5">Entre 4 et 5</option>
                </select>
                {hasFilter && (
                  <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#e8888855",fontSize:"11px"}}
                    onClick={()=>{setFilterDegFut("");setFilterDegCuvee("");setFilterDegFabric("");setFilterDegVolMin("");setFilterDegVolMax("");setFilterDegNote("");}}>
                    <i className="ti ti-x" style={{marginRight:"3px"}}/>Réinitialiser
                  </button>
                )}
                <span style={{marginLeft:"auto",fontSize:"11px",color:"#8a7248"}}>{futsFiltres.length} / {futsAvecNotes.length} fûts</span>
              </div>

              <div style={s.card}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                    <thead>
                      <tr style={{borderBottom:"2px solid #d4c4a0",background:"#F0EDE8"}}>
                        {["N° Fût","Cuvée","Fabricant","Mill.","Volume","Moy. Note G","Moy. Boisé","Moy. Long.","Nb notes","Sessions"].map(h=>(
                          <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#8a7248",fontWeight:600}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {futsFiltres.sort((a,b)=>(avgNoteG(b.id)||0)-(avgNoteG(a.id)||0)).map((t,i)=>{
                        const ng=avgNoteG(t.id); const nb=avgBoise(t.id); const nl=avgLong(t.id);
                        return (
                          <tr key={t.id}
                            style={{borderBottom:"1px solid #e8dcc6",cursor:"pointer",background:i%2===0?"transparent":"#F8F6F2",transition:"background 0.1s"}}
                            onClick={()=>{setSelectedFut(t.id);setView("fiche");setFicheTab("historique");}}>
                            <td style={{padding:"9px 10px",color:"#8B7355",fontWeight:700,fontFamily:"'IBM Plex Mono',monospace"}}>{t.id}</td>
                            <td style={{padding:"9px 10px",color:"#1a1205",fontWeight:500,maxWidth:"160px"}}>
                              <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.denomination}</div>
                            </td>
                            <td style={{padding:"9px 10px"}}>
                              {t.tonnelier
                                ? <span style={{background:"#fce8a8",color:"#2C3E50",border:"1px solid #e0c050",borderRadius:"3px",padding:"1px 7px",fontSize:"11px",fontWeight:600,whiteSpace:"nowrap"}}>{t.tonnelier}</span>
                                : <span style={{color:"#c0b090",fontSize:"11px"}}>-</span>
                              }
                            </td>
                            <td style={{padding:"9px 10px",color:"#6a5838",fontFamily:"'IBM Plex Mono',monospace"}}>{t.millesime||"-"}</td>
                            <td style={{padding:"9px 10px",color:"#6a5838",fontFamily:"'IBM Plex Mono',monospace"}}>{t.volume||0} L</td>
                            <td style={{padding:"9px 10px"}}>
                              <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                                <div style={{width:"44px",height:"5px",background:"#e8dcc6",borderRadius:"3px",overflow:"hidden"}}>
                                  <div style={{width:`${((ng||0)/5)*100}%`,height:"100%",background:ng>=4?"#1a7a40":ng>=3?"#8B7355":"#cc6622",borderRadius:"3px"}}/>
                                </div>
                                <span style={{fontWeight:700,color:ng>=4?"#1a7a40":ng>=3?"#8B7355":"#8a7248",fontFamily:"'IBM Plex Mono',monospace",minWidth:"28px"}}>{ng?.toFixed(1)||"-"}</span>
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
                        <tr><td colSpan={10} style={{padding:"24px 10px",color:"#8a7248",fontSize:"13px",textAlign:"center"}}>
                          {hasFilter?"Aucun fût ne correspond aux filtres.":"Aucune note encore."}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Colonne droite - gestion des dégustateurs */}
            {/* Palmarès */}
            <div style={{...s.card,marginBottom:"16px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#2C3E50",marginBottom:"12px"}}>🏆 Palmarès tonneliers</div>
              {(()=>{
                const tonneliers = [...new Set(tonneaux.map(t=>t.tonnelier).filter(Boolean))];
                const ranked = tonneliers.map(tn=>{
                  const futs = tonneaux.filter(t=>t.tonnelier===tn&&notesForFut(t.id).length>0);
                  const allNotes = futs.flatMap(t=>notesForFut(t.id).map(d=>d.noteG).filter(Boolean));
                  const avg = allNotes.length ? allNotes.reduce((a,b)=>a+b,0)/allNotes.length : 0;
                  return {tn, avg, nb:allNotes.length, nbFuts:futs.length};
                }).filter(r=>r.avg>0).sort((a,b)=>b.avg-a.avg).slice(0,5);
                if(!ranked.length) return <div style={{fontSize:"11px",color:"#9a8870",fontStyle:"italic"}}>Pas encore de données.</div>;
                return ranked.map((r,i)=>(
                  <div key={r.tn} style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 0",borderBottom:"0.5px solid #ede5d4"}}>
                    <span style={{fontSize:"15px",width:"24px",textAlign:"center"}}>{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"12px",fontWeight:600,color:"#1a1205"}}>{r.tn}</div>
                      <div style={{fontSize:"10px",color:"#9a8870"}}>{r.nbFuts} fût{r.nbFuts>1?"s":""} · {r.nb} note{r.nb>1?"s":""}</div>
                    </div>
                    <span style={{fontSize:"15px",fontWeight:700,color:r.avg>=4?"#1a7a40":r.avg>=3?"#8B7355":"#888"}}>{r.avg.toFixed(1)}</span>
                  </div>
                ));
              })()}
              <div style={{fontFamily:"Georgia,serif",fontSize:"13px",color:"#2C3E50",margin:"14px 0 10px"}}>🏆 Palmarès grain</div>
              {(()=>{
                const grains = [...new Set(tonneaux.map(t=>t.grain).filter(Boolean))];
                const ranked = grains.map(g=>{
                  const futs = tonneaux.filter(t=>t.grain===g&&notesForFut(t.id).length>0);
                  const allNotes = futs.flatMap(t=>notesForFut(t.id).map(d=>d.noteG).filter(Boolean));
                  const avg = allNotes.length ? allNotes.reduce((a,b)=>a+b,0)/allNotes.length : 0;
                  return {g, avg, nb:allNotes.length, nbFuts:futs.length};
                }).filter(r=>r.avg>0).sort((a,b)=>b.avg-a.avg).slice(0,5);
                if(!ranked.length) return <div style={{fontSize:"11px",color:"#9a8870",fontStyle:"italic"}}>Pas encore de données.</div>;
                return ranked.map((r,i)=>(
                  <div key={r.g} style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 0",borderBottom:"0.5px solid #ede5d4"}}>
                    <span style={{fontSize:"15px",width:"24px",textAlign:"center"}}>{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"12px",fontWeight:600,color:"#1a1205"}}>{r.g}</div>
                      <div style={{fontSize:"10px",color:"#9a8870"}}>{r.nbFuts} fût{r.nbFuts>1?"s":""} · {r.nb} note{r.nb>1?"s":""}</div>
                    </div>
                    <span style={{fontSize:"15px",fontWeight:700,color:r.avg>=4?"#1a7a40":r.avg>=3?"#8B7355":"#888"}}>{r.avg.toFixed(1)}</span>
                  </div>
                ));
              })()}
            </div>
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
                      <div style={{width:"26px",height:"26px",borderRadius:"50%",background:d.actif?"#b8860b22":"#2a2a2c",border:`1px solid ${d.actif?"#b8860b33":"#3a3a3c"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:600,color:d.actif?"#8B7355":"#555",flexShrink:0}}>
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
                  <div style={{marginTop:"10px",padding:"8px",background:"#F8F6F2",borderRadius:"5px",fontSize:"11px",color:"#8a7248"}}>
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
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",color:"#8B7355"}}>{selectedT.id}</div>
                        <div style={{fontSize:"12px",color:"#6a5838",marginTop:"2px"}}>{selectedT.denomination}</div>
                        {selectedT.appellation && <div style={{marginTop:"6px",display:"inline-flex",alignItems:"center",gap:"5px",padding:"2px 8px",borderRadius:"3px",background:getApc(selectedT.appellation).bg,border:`1px solid ${getApc(selectedT.appellation).border}`,fontSize:"10px",color:getApc(selectedT.appellation).color,letterSpacing:"0.06em",textTransform:"uppercase"}}>
                            <span style={{width:"5px",height:"5px",borderRadius:"50%",background:getApc(selectedT.appellation).color}}/>
                            {getApc(selectedT.appellation).label}
                          </div>}
                      </div>
                      <span style={s.tag(selectedT.statut==="surveillance"?"#c47800":selectedT.statut==="vide"?"#cc2222":"#1a7a40")}>
                        {selectedT.statut==="surveillance"?"surveillance":selectedT.statut==="vide"?"vide":"actif"}
                      </span>
                    </div>
                    <div style={{marginBottom:"14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#7a6840",marginBottom:"5px"}}>
                        <span>Niveau</span><span style={{color:"#8B7355",fontWeight:600}}>{selectedT.contenuActuel}L / {selectedT.volume}L ({selectedP}%)</span>
                      </div>
                      <div style={{background:"#F8F6F2",borderRadius:"2px",height:"6px",overflow:"hidden"}}>
                        <div style={{width:`${selectedP}%`,height:"100%",background:selectedP<20?"#cc2222":"#8B7355",borderRadius:"2px"}}/>
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
                    {[["Cepage",selectedT.statut==="vide"?"-":selectedT.cepage||"-"],["N Marc",selectedT.statut==="vide"?"-":selectedT.marc||"-"],["Millesime vin",selectedT.statut==="vide"?"-":selectedT.millesime||"-"],["Certification",selectedT.statut==="vide"?"-":selectedT.certif==="BIO"?"🌿 BIO":selectedT.certif||"-"],["Tonnelier",selectedT.tonnelier||"-"],["Grain",selectedT.grain||"-"],["Chauffe",selectedT.chauffe||"-"],["Capacite",`${selectedT.volume} L`]].map(([k,v])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #d0c4a0",fontSize:"12px"}}>
                        <span style={{color:"#8a7248"}}>{k}</span><span style={{color:"#1a1205"}}>{v}</span>
                      </div>
                    ))}
                    {selectedT.statut!=="vide"&&avgNoteG(selectedT.id)!=null&&(
                      <div style={{marginTop:"14px",padding:"10px",background:"#F8F6F2",borderRadius:"6px"}}>
                        <div style={{fontSize:"10px",color:"#8a7248",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"6px"}}>Note dégustation</div>
                        <div style={{display:"flex",gap:"16px"}}>
                          <div><div style={{fontSize:"18px",fontWeight:600,color:avgNoteG(selectedT.id)>=4?"#1a7a40":"#8B7355"}}>{avgNoteG(selectedT.id)?.toFixed(1)}<span style={{fontSize:"11px",color:"#8a7248"}}>/5</span></div><div style={{fontSize:"10px",color:"#8a7248"}}>Note globale</div></div>
                          {avgBoise(selectedT.id)&&<div><div style={{fontSize:"18px",fontWeight:600,color:"#5a4a30"}}>{avgBoise(selectedT.id)?.toFixed(1)}</div><div style={{fontSize:"10px",color:"#8a7248"}}>Boisé</div></div>}
                          {avgLong(selectedT.id)&&<div><div style={{fontSize:"18px",fontWeight:600,color:"#5a4a30"}}>{avgLong(selectedT.id)?.toFixed(1)}</div><div style={{fontSize:"10px",color:"#8a7248"}}>Longueur</div></div>}
                        </div>
                      </div>
                    )}
                    {selectedT.commentaire&&(
                        <div style={{margin:"8px 0 12px",padding:"9px 12px",background:"#F0EDE8",borderRadius:"6px",border:"1px solid #d4c4a0"}}>
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
                    {[["historique","Historique"],["degustations",`Degustations (${notesForFut(selectedT.id).length})` ]].map(([tab,lbl])=>(
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
                    // Inclure les assemblages lies a ce fut (source ou retour reserve)
                    assemblages.forEach(a=>{
                      const srcMatch = (a.sources||[]).find(src=>src.id===selectedT?.id);
                      const retourMatch = (a.destRetours||[]).find(r=>r.id===selectedT?.id);
                      const retourRIMatch = (a.destRetoursRI||[]).find(r=>r.id===selectedT?.id);
                      if(srcMatch||retourMatch||retourRIMatch) {
                        const y = a.date?a.date.slice(0,4):"?";
                        if(!mvtsParAn[y]) mvtsParAn[y]=[];
                        mvtsParAn[y].push({
                          date:a.date,
                          type:"assemblage",
                          notes:srcMatch?`Assemblage "${a.nomCuvee}" — Source (${srcMatch.volume} L)`:retourMatch?`Assemblage "${a.nomCuvee}" — Retour réserve (${retourMatch.volume} L)`:`Assemblage "${a.nomCuvee}" — Retour RI (${retourRIMatch.volume} L)`,
                          _isAssemblage:true,
                        });
                      }
                    });
                    const allYears=[...new Set(Object.keys(mvtsParAn))].sort().reverse();
                    return (
                      <div>
                        {allYears.length===0&&<div style={{color:"#9a8870",fontStyle:"italic",padding:"12px 0"}}>Aucun historique.</div>}
                        {allYears.length>0&&<div style={{marginBottom:"12px"}}>
                          <select style={{...s.sel,maxWidth:"160px",fontSize:"12px"}} value={ficheHistoAnnee} onChange={e=>setFicheHistoAnnee(e.target.value)}>
                            <option value="">Toutes les campagnes</option>
                            {allYears.map(y=><option key={y} value={y}>Campagne {y} ({(mvtsParAn[y]||[]).length} mvt)</option>)}
                          </select>
                        </div>}
                        {(ficheHistoAnnee?[ficheHistoAnnee]:allYears).map(year=>(
                          <div key={year} style={{marginBottom:"16px"}}>
                            <div style={{fontFamily:"Georgia,serif",fontSize:"15px",color:"#8B7355",borderBottom:"0.5px solid #d4c4a0",paddingBottom:"6px",marginBottom:"8px"}}>
                              Campagne {year}
                              {mvtsParAn[year]&&<span style={{fontSize:"11px",color:"#9a8870",fontWeight:400,marginLeft:"8px"}}>{mvtsParAn[year].length} mvt(s)</span>}
                            </div>
                            {(mvtsParAn[year]||[]).map((m,i)=>m._isAssemblage?(
                              <div key={i} style={{display:"flex",gap:"8px",padding:"5px 0",borderBottom:"0.5px solid #ede5d4",fontSize:"12px"}}>
                                <div style={{width:"80px",color:"#9a8870",flexShrink:0}}>{fmt(m.date)}</div>
                                <div style={{flex:1}}>
                                  <span style={{background:"#fff3cd",color:"#8B6000",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",marginRight:"6px"}}>Assemblage</span>
                                  <span style={{color:"#6a5838"}}>{m.notes}</span>
                                </div>
                              </div>
                            ):(
                              <div key={i} style={{display:"flex",gap:"8px",padding:"5px 0",borderBottom:"0.5px solid #ede5d4",fontSize:"12px"}}>
                                <div style={{width:"80px",color:"#9a8870",flexShrink:0}}>{m.date}</div>
                                <div style={{flex:1}}>
                                  <span style={{background:"#e8f0e8",color:"#2d6a00",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",marginRight:"6px"}}>{typeLabel(m.type)}</span>
                                  {/* Cuvee */}
                                  {(()=>{
                                    const srcIds = m.futSource||[];
                                    const destId = m.futDest||m.entonnageCuveId;
                                    const marcMatch = m.notes&&m.notes.match(/Marc (\d+)/);
                                    const marcNum = marcMatch?marcMatch[1]:null;
                                    const vendangeSrc = marcNum ? vendanges.find(v=>String(v.numeroMarc)===String(marcNum)) : null;
                                    // Extract cuvee from notes "Entonnage depuis X - Marc Y - CuveeName"
                                    const cuveeMatch = m.notes&&m.notes.match(/Marc \d+ - (.+)$/);
                                    const cuveeNom = m.cuveeCreee||cuveeMatch?.[1]||null;
                                    return (<>
                                      {srcIds.map(id=>{ const t=getTonneau(id); return t?<span key={id} style={{color:"#8B7355",cursor:"pointer",textDecoration:"underline",marginRight:"4px"}} onClick={()=>{setSelectedFut(id);setFicheTab("historique");}}>{id}</span>:null; })}
                                      {destId&&!srcIds.includes(destId)&&getTonneau(destId)&&<span style={{color:"#185FA5",cursor:"pointer",textDecoration:"underline",marginRight:"4px"}} onClick={()=>{setSelectedFut(destId);setFicheTab("historique");}}>→ {destId}</span>}
                                      {marcNum&&<span style={{background:"#2C3E50",color:"#fff",borderRadius:"4px",padding:"1px 7px",fontSize:"10px",fontWeight:600,cursor:"pointer",marginRight:"4px"}} onClick={()=>setView("vendanges")}>Marc {marcNum}</span>}
                                      {(m.denominationFut||cuveeNom||vendangeSrc?.cuveeCreee)&&<span style={{color:"#2C3E50",fontWeight:600,marginRight:"4px",fontSize:"12px"}}>{m.denominationFut||cuveeNom||vendangeSrc?.cuveeCreee}</span>}
                                      {m.marcsSources&&m.marcsSources.length>1&&(
                                        <div style={{marginTop:"4px",display:"flex",flexDirection:"column",gap:"2px"}}>
                                          {m.marcsSources.map((ms,i)=>(
                                            <div key={i} style={{fontSize:"10px",display:"flex",alignItems:"center",gap:"4px"}}>
                                              <span style={{background:"#2C3E50",color:"#fff",borderRadius:"3px",padding:"1px 5px",fontWeight:600}}>Marc {ms.marc}</span>
                                              <span style={{color:"#9a8870"}}>{ms.cuveNom}</span>
                                              <span style={{color:"#8B7355",fontFamily:"monospace",fontWeight:500}}>{ms.volumeHL} HL</span>
                                              {ms.cuveeCreee&&<span style={{color:"#2C3E50"}}>{ms.cuveeCreee}</span>}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {m.volume&&<span style={{color:"#8B7355",fontFamily:"monospace",marginLeft:"4px",fontWeight:500}}>{m.type==="entonnage"?(parseInt(m.volume)/100).toFixed(2)+" HL":m.volume+"L"}</span>}
                                    </>);
                                  })()}
                                  {m.notes&&<div style={{color:"#9a8870",fontStyle:"italic",fontSize:"11px"}}>{m.notes}</div>}
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
        {view==="rendement"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"20px",color:"#2C3E50"}}>Rendement</div>
              <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                <div style={{background:"#fff8e8",border:"0.5px solid #ffc107",borderRadius:"6px",padding:"6px 12px",fontSize:"12px"}}>
                  <span style={{color:"#9a7840"}}>Réserve RI actuelle : </span>
                  <strong style={{color:"#8B6000"}}>{(parseFloat(reserveRI.volumeKg)||0).toLocaleString()} kg</strong>
                  <button style={{...s.ghostSm,fontSize:"10px",marginLeft:"8px"}} onClick={()=>setShowReserveRIForm(true)}>Modifier</button>
                </div>
                <button style={s.btn} onClick={()=>{const r=rendementsAnnuels.find(x=>x.annee===new Date().getFullYear().toString()); setRendementForm({annee:new Date().getFullYear().toString(),rendementAutorise:r?.rendementAutorise||'',surface:r?.surface||'',reserveRI:r?.reserveRI||''});setShowRendementForm(true);}}>+ Saisir rendement</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:"16px"}}>
              {[...new Set([...vendanges.map(v=>v.annee), ...rendementsAnnuels.map(r=>r.annee)])].sort().reverse().map(annee=>{
                const vAnnee = vendanges.filter(v=>v.annee===annee);
                const kgRecoltes = vAnnee.filter(v=>v.destinationMarc!=="prestation").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                const kgPrestation = vAnnee.filter(v=>v.destinationMarc==="prestation").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                const kgMaison = vAnnee.filter(v=>!v.destinationMarc||v.destinationMarc==="maison").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                  + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0)-(parseFloat(v.kgVendusNegoce)||0),0);
                const kgNegoce = vAnnee.filter(v=>v.destinationMarc==="negoce_total").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                  + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.kgVendusNegoce)||0),0);
                const rendAnnee = rendementsAnnuels.find(r=>r.annee===annee);
                const surfTotale = parseFloat(rendAnnee?.surface)||rendAnnee?.surfaceSnapshot||parcelles.filter(p=>statutParcelle(p)==="production").reduce((s,p)=>s+(parseFloat(p.surface)||0),0);
                const kgHaReel = surfTotale>0 ? Math.round(kgRecoltes/surfTotale) : 0;
                const kgHaAutorise = rendAnnee ? parseFloat(rendAnnee.rendementAutorise)||0 : 0;
                // Calcul AOC / RI / VO
                const kgMaxAOC = Math.round(surfTotale * kgHaAutorise);
                const kgMaxRI = Math.round(surfTotale * 10000);
                const kgAOC = Math.min(kgRecoltes, kgMaxAOC);
                const reserveBase = parseFloat(rendAnnee?.reserveRI)||parseFloat(reserveRI.volumeKg)||0;
                const riDejaConstituee = reserveBase;
                const riDispoFaire = Math.max(0, kgMaxRI - riDejaConstituee);
                const kgRI = kgMaxAOC>0 ? Math.max(0, Math.min(kgRecoltes - kgMaxAOC, riDispoFaire)) : 0;
                const kgVO = Math.max(0, kgRecoltes - kgMaxAOC - kgRI);
                const enSectionRI = kgHaAutorise>0 && kgHaReel>kgHaAutorise;
                const enVO = kgHaReel>10000;
                const reserveApres = reserveBase + kgRI;
                const reserveMax = kgMaxRI;
                return (
                  <div key={annee} style={{...s.card,borderLeft:enVO?"3px solid #8B0000":enSectionRI?"3px solid #cc2222":"3px solid #2C3E50"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"16px",fontWeight:500,color:"#2C3E50"}}>Campagne {annee}</div>
                      <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                        {enVO&&<span style={{fontSize:"10px",background:"#fde8e8",color:"#8B0000",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"2px 8px",fontWeight:600}}>⚠ VO</span>}
                        {enSectionRI&&!enVO&&<span style={{fontSize:"10px",background:"#fff3cd",color:"#c47800",border:"1px solid #ffc107",borderRadius:"4px",padding:"2px 8px",fontWeight:600}}>⚠ Section RI</span>}
                        {vAnnee.length===0&&rendAnnee&&(
                          <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                            onClick={()=>{
                              if(window.confirm(`Supprimer la campagne ${annee} (rendement/RI saisis, sans aucune vendange associée) ?`)){
                                setRendementsAnnuels(prev=>prev.filter(r=>r.annee!==annee));
                                fbDelete("rendements", rendAnnee.id);
                              }
                            }}>Supprimer</button>
                        )}
                      </div>
                    </div>
                    {/* Surface en production */}
                    {surfTotale>0&&<div style={{background:"#f0f4f7",borderRadius:"6px",padding:"8px 12px",marginBottom:"10px",fontSize:"12px"}}>
                      <span style={{color:"#4A6274"}}>Surface en production : </span>
                      <strong style={{color:"#2C3E50"}}>{surfTotale.toFixed(4)} ha</strong>
                    </div>}
                    <div style={{display:"grid",gap:"6px",fontSize:"12px"}}>
                      {/* AOC */}
                      {kgHaAutorise>0&&<div style={{padding:"8px",background:"#eef4f0",borderRadius:"6px",border:"0.5px solid #a5c8b0"}}>
                        <div style={{fontWeight:500,color:"#2C3E50",marginBottom:"4px"}}>AOC Champagne</div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                          <span style={{color:"#6a8878"}}>Autorisé ({kgHaAutorise.toLocaleString()} kg/ha)</span>
                          <span style={{fontWeight:500}}>{kgMaxAOC.toLocaleString()} kg</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                          <span style={{color:"#6a8878"}}>Récolté</span>
                          <span style={{fontWeight:500,color:"#2d6a00"}}>{kgAOC.toLocaleString()} kg</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{color:"#6a8878"}}>Restant à récolter</span>
                          <span style={{fontWeight:500,color:kgMaxAOC-kgAOC>0?"#c47800":"#2d6a00"}}>{Math.max(0,kgMaxAOC-kgAOC).toLocaleString()} kg</span>
                        </div>
                      </div>}
                      {/* RI */}
                      {enSectionRI&&<div style={{padding:"8px",background:"#fff8e8",borderRadius:"6px",border:"0.5px solid #ffc107"}}>
                        <div style={{fontWeight:500,color:"#8B6000",marginBottom:"4px"}}>Réserve Individuelle (RI)</div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                          <span style={{color:"#9a7840"}}>RI max total (10 000 kg/ha)</span>
                          <span style={{fontWeight:500}}>{kgMaxRI.toLocaleString()} kg</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                          <span style={{color:"#9a7840"}}>RI constituée</span>
                          <span style={{fontWeight:500}}>{riDejaConstituee.toLocaleString()} kg</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                          <span style={{color:"#9a7840"}}>RI dispo à faire</span>
                          <span style={{fontWeight:500,color:"#c47800"}}>{riDispoFaire.toLocaleString()} kg</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                          <span style={{color:"#9a7840"}}>Apport cette campagne</span>
                          <span style={{fontWeight:500,color:"#c47800"}}>{kgRI.toLocaleString()} kg</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{color:"#9a7840"}}>Réserve après campagne</span>
                          <span style={{fontWeight:500,color:"#c47800"}}>{reserveApres.toLocaleString()} kg</span>
                        </div>
                      </div>}
                      {/* VO */}
                      {enVO&&<div style={{padding:"8px",background:"#fde8e8",borderRadius:"6px",border:"0.5px solid #f0b4b4"}}>
                        <div style={{fontWeight:500,color:"#8B0000",marginBottom:"4px"}}>Vins d'Exploitation (VO)</div>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{color:"#9a5050"}}>Volume en VO</span>
                          <span style={{fontWeight:500,color:"#8B0000"}}>{kgVO.toLocaleString()} kg</span>
                        </div>
                      </div>}
                      {/* Résumé */}
                      <div style={{borderTop:"0.5px solid #d4c4a0",paddingTop:"6px",marginTop:"4px"}}>
                        {[
                          ["Total récolté", kgRecoltes.toLocaleString()+" kg", "#2C3E50"],
                          ["Conservé maison", Math.round(kgMaison).toLocaleString()+" kg", "#2d6a00"],
                          ["Vendu négoce", Math.round(kgNegoce).toLocaleString()+" kg", "#c47800"],
                          ...(kgPrestation>0?[["Prestation", kgPrestation.toLocaleString()+" kg", "#185FA5"]]:[]),
                        ].map(([lbl,val,col])=>(
                          <div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:"12px"}}>
                            <span style={{color:"#9a8870"}}>{lbl}</span>
                            <span style={{fontWeight:500,color:col}}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {vendanges.length===0&&<div style={{...s.card,color:"#9a8870",fontStyle:"italic"}}>Aucune donnée de vendange.</div>}
            </div>
          </div>
        )}

        {view==="parcelles"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div>
                <div style={{fontFamily:"Georgia,serif",fontSize:"20px",color:"#2C3E50"}}>Parcelles</div>
                {(()=>{
                  const totalHa = parcelles.filter(p=>statutParcelle(p)==="production").reduce((s,p)=>s+(parseFloat(p.surface)||0),0);
                  const ha = Math.floor(totalHa);
                  const ares = Math.floor((totalHa-ha)*100);
                  const ca = Math.round(((totalHa-ha)*100-ares)*100);
                  return <div style={{fontSize:"12px",color:"#2C3E50",fontWeight:500,marginTop:"4px"}}>{parcelles.length} parcelle(s) — {ha}ha {String(ares).padStart(2,"0")}a {String(ca).padStart(2,"0")}ca</div>;
                })()}
              </div>
              <button style={s.btn} onClick={()=>{setParcelleForm({nom:"",cepage:"",certification:"BIO",surface:"",commune:"",observations:""});setEditingParcelle(null);setShowParcelleForm(true);}}>+ Ajouter</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"16px"}}>
              {parcelles.length===0&&<div style={{...s.card,color:"#9a8870",fontStyle:"italic"}}>Aucune parcelle. Ajoutez-en une pour commencer.</div>}
              {parcelles.map(p=>{
                const cepStyles = p.cepage ? getCepageStyle(p.cepage.split(" + ")[0]) : getCepageStyle("");
                return (
                <div key={p.id} style={{...s.card, borderLeft:`3px solid ${cepStyles.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"2px"}}>
                        <div style={{fontFamily:"Georgia,serif",fontSize:"16px",fontWeight:500,color:"#1a1205"}}>{p.nom}</div>
                        {statutParcelle(p)!=="production"&&<span style={{fontSize:"10px",background:"#fde8b8",color:"#8B5E00",borderRadius:"3px",padding:"1px 6px",fontWeight:500}}>{labelStatutParcelle(p)}</span>}
                        {statutParcelle(p)==="production"&&p.anneePlantation&&<span style={{fontSize:"10px",background:"#d4edc0",color:"#2d6a00",borderRadius:"3px",padding:"1px 6px",fontWeight:500}}>En production</span>}
                      </div>
                        {p.certification&&(
                          <span style={{fontSize:"10px",padding:"1px 6px",borderRadius:"3px",fontFamily:"monospace",fontWeight:500,
                            background:p.certification==="BIO"?"#d4edc0":p.certification==="NON BIO"?"#ede5d4":p.certification==="C1"?"#E8E0D0":p.certification==="C2"?"#fce8a8":"#fad4a0",
                            color:p.certification==="BIO"?"#2d6a00":p.certification==="NON BIO"?"#5f5e5a":p.certification==="C1"?"#8b5e0a":p.certification==="C2"?"#7a4800":"#6b3a00"}}>
                            {p.certification}
                          </span>
                        )}
                      </div>
                      {p.cepage&&<div style={{marginBottom:"6px",display:"flex",flexWrap:"wrap",gap:"4px"}}>
                        {p.cepage.split(" + ").map((c,i)=>{ const st=getCepageStyle(c); return <span key={i} style={{background:st.bg,color:st.color,border:`0.5px solid ${st.border}`,borderRadius:"4px",padding:"2px 8px",fontSize:"11px",fontWeight:500}}>🍇 {c.trim()}</span>; })}
                      </div>}
                      {p.commune&&<div style={{fontSize:"12px",color:"#9a8870",marginBottom:"4px"}}>📍 {p.commune}</div>}
                      {p.surface&&<div style={{fontSize:"12px",color:"#2C3E50",fontWeight:500,marginBottom:"4px"}}>📐 {p.surface} ha</div>}
                      {p.observations&&<div style={{fontSize:"11px",color:"#7a6840",fontStyle:"italic",marginTop:"6px",padding:"6px",background:"#F8F6F2",borderRadius:"4px"}}>{p.observations}</div>}
                      <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
                        <button style={{...s.ghostSm,fontSize:"10px",flex:1}} onClick={()=>{setApportForm({date:new Date().toISOString().slice(0,10),heure:"",operateur:"",nbCagettes:"",poidsNet:"",campagne:new Date().getFullYear().toString(),notes:""});setEditingApport(null);setShowApportForm(p.id);}}>
                          + Ajouter un apport
                        </button>
                        <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>setShowApportsPanel(prev=>({...prev,[p.id]:true}))}>
                          📄 Apports
                        </button>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:"4px",flexShrink:0}}>
                      <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>{setParcelleForm({nom:p.nom,cepage:p.cepage||"",certification:p.certification||"BIO",surface:p.surface||"",commune:p.commune||"",observations:p.observations||""});setEditingParcelle(p);setShowParcelleForm(true);}}>Mod.</button>
                      <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}}
                        onClick={()=>{if(window.confirm("Supprimer cette parcelle ?")) { setParcelles(prev=>prev.filter(x=>x.id!==p.id)); deleteParcelleFb(p.id); }}}>Sup.</button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

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
                    <span style={{background:cuivreParCampagne[c]>3000?"#fdd0d0":cuivreParCampagne[c]>2000?"#E8E0D0":"#d4edc0",color:cuivreParCampagne[c]>3000?"#cc2222":cuivreParCampagne[c]>2000?"#c47800":"#2d6a00",borderRadius:"3px",padding:"0 4px",fontSize:"10px",fontWeight:500}}>
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
                        <div style={{fontSize:"16px",fontWeight:500,color:k.col||"#8B7355",lineHeight:1.2}}>{k.val}</div>
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
                        <tr style={{borderBottom:"1px solid #d4c4a0",background:"#F0EDE8"}}>
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
                            <tr key={t.id||i} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#F8F6F2"}}>
                              <td style={{padding:"8px 10px",fontFamily:"monospace",color:"#8B7355",fontWeight:500}}>N°{t.numero}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838"}}>{t.date}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838"}}>{t.surface}</td>
                              <td style={{padding:"8px 10px",maxWidth:"320px"}}>
                                <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
                                  {(t.produits||[]).map((p,j)=>(
                                    <span key={j} style={{background:p.matiereActive==="Cuivre"?"#E8E0D0":p.matiereActive==="Soufre"?"#e6f0fb":"#ede5d4",color:p.matiereActive==="Cuivre"?"#2C3E50":p.matiereActive==="Soufre"?"#185FA5":"#5f5e5a",borderRadius:"3px",padding:"1px 5px",fontSize:"10px",fontFamily:"monospace",whiteSpace:"nowrap"}}>
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
                    <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#2C3E50"}}>Calendriers prestataires</div>
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
                      <div key={pdf.id} style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 12px",background:"#F0EDE8",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
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
                    <label style={{...s.btnSm,cursor:"pointer",background:"#F0EDE8",color:"#2C3E50",border:"0.5px solid #d4c4a0"}}>
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
                          <tr style={{borderBottom:"1px solid #d4c4a0",background:"#F0EDE8"}}>

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
                              <tr key={p.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#F8F6F2"}}>
                                <td style={{padding:"8px 10px"}}>
                                  <div style={{fontWeight:500,color:"#1a1205"}}>{p.nom}</div>
                                  {p.fournisseur&&<div style={{fontSize:"10px",color:"#9a8870"}}>{p.fournisseur}</div>}
                                </td>
                                <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:"11px",color:"#9a8870"}}>{p.nAmm||"-"}</td>
                                <td style={{padding:"8px 10px"}}>
                                  {(()=>{ const sa=p.substanceActive||p.matiereActive||"-";
                                    return <span style={{background:sa==="Cuivre"?"#E8E0D0":sa==="Soufre"?"#e6f0fb":"#ede5d4",color:sa==="Cuivre"?"#2C3E50":sa==="Soufre"?"#185FA5":"#5f5e5a",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",fontFamily:"monospace"}}>{sa}</span>;
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
                          <div key={pdf.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",background:"#F0EDE8",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
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
                            style={{background:"#F0EDE8",border:"0.5px solid #d4c4a0",borderRadius:"5px",padding:"6px 12px",fontSize:"11px",cursor:"pointer",color:"#2C3E50",fontFamily:"monospace",display:"flex",alignItems:"center",gap:"5px"}}>
                            <span style={{background:(c.substanceActive||c.matiereActive)==="Cuivre"?"#E8E0D0":(c.substanceActive||c.matiereActive)==="Soufre"?"#e6f0fb":"#ede5d4",color:(c.substanceActive||c.matiereActive)==="Cuivre"?"#2C3E50":"#185FA5",borderRadius:"3px",padding:"0 4px",fontSize:"9px"}}>{c.substanceActive||c.matiereActive}</span>
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
                        <tr style={{borderBottom:"1px solid #d4c4a0",background:"#F0EDE8"}}>
                          {["Date","Surface","Produit","Observations",""].map(h=>(
                            <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {biodyFiltres.sort((a,b)=>new Date(a.date)-new Date(b.date)).map((b,i)=>(
                          <tr key={b.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#F8F6F2"}}>
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
                          <tr style={{borderBottom:"1px solid #d4c4a0",background:"#F0EDE8"}}>
                            {["Parcelle","Surface","Produit","Quantite","N total","N/ha","Observations",""].map(h=>(
                              <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {amendFiltres.sort((a,b)=>a.parcelle.localeCompare(b.parcelle)).map((a,i)=>(
                            <tr key={a.id} style={{borderBottom:"1px solid #ede5d4",background:i%2===0?"transparent":"#F8F6F2"}}>
                              <td style={{padding:"8px 10px",fontWeight:500,color:"#1a1205"}}>{a.parcelle}</td>
                              <td style={{padding:"8px 10px",color:"#6a5838",fontFamily:"monospace"}}>{a.surface} ha</td>
                              <td style={{padding:"8px 10px"}}>
                                <span style={{background:"#E8E0D0",color:"#2C3E50",borderRadius:"3px",padding:"1px 7px",fontSize:"11px",fontFamily:"monospace"}}>{a.produit}</span>
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
                    style={{padding:"4px 12px",borderRadius:"4px",border:`0.5px solid ${!filterVendangeAn?"#8B7355":"#d4c4a0"}`,background:!filterVendangeAn?"#f5e8cc":"transparent",color:!filterVendangeAn?"#2C3E50":"#9a8870",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>
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
                      <div style={{fontFamily:"Georgia,serif",fontSize:"16px",fontWeight:500,color:"#2C3E50"}}>Campagne {annee}</div>
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
                      const kgRecoltes = vAnnee.filter(v=>v.destinationMarc!=="prestation").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                const kgPrestation = vAnnee.filter(v=>v.destinationMarc==="prestation").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                      const kgMaison = vAnnee.filter(v=>!v.destinationMarc||v.destinationMarc==="maison").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                        + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0)-(parseFloat(v.kgVendusNegoce)||0),0);
                      const kgNegoce = vAnnee.filter(v=>v.destinationMarc==="negoce_total").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                        + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.kgVendusNegoce)||0),0);
                      const rendAnnee = rendementsAnnuels.find(r=>r.annee===annee);
                      const surfTotale = parseFloat(rendAnnee?.surface)||rendAnnee?.surfaceSnapshot||parcelles.filter(p=>statutParcelle(p)==="production").reduce((s,p)=>s+(parseFloat(p.surface)||0),0);
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
                          {kgPrestation>0&&<div style={{...s.card,padding:"10px"}}>
                            <div style={s.lbl}>Prestation pressurage</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:"#185FA5"}}>{Math.round(kgPrestation).toLocaleString()} kg</div>
                          </div>}
                          {surfTotale>0&&<div style={{...s.card,padding:"10px",background:enRI?"#fde8e8":"transparent"}}>
                            <div style={s.lbl}>kg/ha {kgHaAutorise>0?"vs "+kgHaAutorise+" autorise":""}</div>
                            <div style={{fontSize:"16px",fontWeight:500,color:enRI?"#cc2222":"#1a1205"}}>{kgHaReel.toLocaleString()} kg/ha</div>
                            {enRI&&<div style={{fontSize:"10px",color:"#cc2222",fontWeight:500}}>Section RI +{(kgHaReel-kgHaAutorise).toLocaleString()} kg/ha</div>}
                          </div>}
                        </div>
                      );
                    })()}

                    {[...vAnnee].sort((a,b)=>new Date(b.date+"T"+(b.heure||"00:00"))-new Date(a.date+"T"+(a.heure||"00:00"))).map(v=>{
                      const parc = parcelles.find(p=>p.id===v.parcelleId);
                      return (
                        <div key={v.id} style={{...s.card,marginBottom:"10px",borderLeft:`3px solid ${v.destinationMarc==="prestation"?"#185FA5":v.destinationMarc&&v.destinationMarc!=="maison"?"#c47800":"#2d6a00"}`,background:v.destinationMarc==="prestation"?"#dde4ed":"white"}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"12px",marginBottom:"8px"}}>
                            <div>
                              {v.cuveeCreee&&<div style={{fontWeight:600,color:"#2C3E50",fontSize:"14px",marginBottom:"2px"}}>{v.cuveeCreee}</div>}
                              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"2px"}}>
                                <div style={{fontWeight:500,color:"#1a1205",fontSize:"13px"}}>{parc?.nom||"Parcelle inconnue"}</div>
                                {v.numeroMarc&&(
                                  <span style={{background:"#f5e8cc",color:"#2C3E50",border:"0.5px solid #e0c050",borderRadius:"4px",padding:"1px 8px",fontSize:"11px",fontWeight:500,fontFamily:"monospace"}}>Marc {v.numeroMarc}</span>
                                )}
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"2px"}}>
                                {parc?.certification&&(
                                  <span style={{fontSize:"10px",padding:"1px 5px",borderRadius:"3px",fontFamily:"monospace",fontWeight:500,
                                    background:parc.certification==="BIO"?"#d4edc0":parc.certification==="NON BIO"?"#ede5d4":"#E8E0D0",
                                    color:parc.certification==="BIO"?"#2d6a00":parc.certification==="NON BIO"?"#5f5e5a":"#8b5e0a"}}>
                                    {parc.certification}
                                  </span>
                                )}
                                <span style={{fontSize:"11px",color:"#9a8870"}}>{(()=>{ const ids=v.parcelleIds&&v.parcelleIds.length>0?v.parcelleIds:[v.parcelleId]; const cepages=[...new Set(ids.map(id=>parcelles.find(p=>p.id===id)?.cepage).filter(Boolean))].join(" + "); return cepages||(parc?.cepage||""); })()}{parc?.commune?` - ${parc.commune}`:""}</span>
                              </div>
                              <div style={{fontSize:"11px",color:"#7a6840",marginTop:"3px"}}>{fmt(v.date)}{v.heure?" - "+v.heure:""} - {v.operateur}</div>
                            </div>
                            <div>
                              <div style={s.lbl}>Volume recolte</div>
                              {v.poidsMarcKg&&<div style={{fontSize:"18px",fontWeight:500,color:"#2d6a00"}}>{parseInt(v.poidsMarcKg).toLocaleString()} kg</div>}
                              {v.volumeHL&&<div style={{fontSize:"13px",color:"#2d6a00"}}>{v.volumeHL} HL</div>}
                              {v.destinationMarc&&v.destinationMarc!=="maison"&&<div style={{fontSize:"11px",color:v.destinationMarc==="prestation"?"#185FA5":"#c47800",fontWeight:v.destinationMarc==="prestation"?600:400,marginTop:"3px"}}>{v.destinationMarc==="prestation"?"🔄 Prestation pressurage":v.destinationMarc==="negoce_total"?"Negoce total":"Negoce partiel"}{v.kgVendusNegoce?" - "+parseInt(v.kgVendusNegoce).toLocaleString()+" kg":""}{v.kgPrestation?" - "+parseInt(v.kgPrestation).toLocaleString()+" kg":""}{v.numeroDAE?" - DAE: "+v.numeroDAE:""}</div>}
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
                                  <div key={p.id} style={{background:"#F0EDE8",border:"0.5px solid #d4c4a0",borderRadius:"4px",padding:"3px 10px",fontSize:"11px",color:"#2C3E50"}}>
                                    <strong>{p.nom}</strong>{p.dose?` - ${p.dose}`:""}{p.lot?` (Lot: ${p.lot})`:""}{p.date?` - ${p.date}`:""}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {v.observations&&<div style={{borderTop:"0.5px solid #ede5d4",paddingTop:"6px",marginTop:"6px",fontSize:"12px",color:"#6a5838"}}>📝 {v.observations}</div>}
                          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"8px"}}>
                            <button style={{...s.ghostSm}} onClick={()=>openEditVendange(v)}>Modifier</button>
                            <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4"}}
                              onClick={()=>{if(window.confirm("Supprimer cet apport ?")) {
  setVendanges(prev=>prev.filter(x=>x.id!==v.id));
  deleteVendangeFb(v.id);
  // Deduire les volumes des cuves cuverie
  const updates = [
    {id:v.cuveTailleId, vol:v.volumeTaille},
    {id:v.cuveCuveeId, vol:v.volumeCuvee},
    {id:v.cuveCuveeBId, vol:v.volumeCuveeB},
    {id:v.cuveBourbesId, vol:v.volumeBourbes},
  ].filter(u=>u.id&&u.vol&&parseFloat(u.vol)>0);
  if(updates.length>0) {
    setCuvesCuverie(prev=>{
      const next = prev.map(c=>{
        const u = updates.find(u=>u.id===c.id);
        if(u) {
          const updated = majCuveContenu(c, (parseFloat(c.contenuActuelHL)||0)-(parseFloat(u.vol)||0));
          fbSave("cuvesCuverie", c.id, updated);
          return updated;
        }
        return c;
      });
      return next;
    });
  }
}}}>
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
                <span style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#2C3E50"}}>Rendement</span>
                <button style={s.btnSm} onClick={()=>setShowRendementForm(true)}>+ Saisir</button>
              </div>
              {[...new Set(vendanges.map(v=>v.annee))].sort().reverse().map(annee=>{
                const vAnnee = vendanges.filter(v=>v.annee===annee);
                const kgRecoltes = vAnnee.filter(v=>v.destinationMarc!=="prestation").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                const kgPrestation = vAnnee.filter(v=>v.destinationMarc==="prestation").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0);
                const kgMaison = vAnnee.filter(v=>!v.destinationMarc||v.destinationMarc==="maison").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                  + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0)-(parseFloat(v.kgVendusNegoce)||0),0);
                const kgNegoce = vAnnee.filter(v=>v.destinationMarc==="negoce_total").reduce((s,v)=>s+(parseFloat(v.poidsMarcKg)||0),0)
                  + vAnnee.filter(v=>v.destinationMarc==="negoce_partiel").reduce((s,v)=>s+(parseFloat(v.kgVendusNegoce)||0),0);
                const rendAnnee = rendementsAnnuels.find(r=>r.annee===annee);
                const surfTotale = parseFloat(rendAnnee?.surface)||rendAnnee?.surfaceSnapshot||parcelles.filter(p=>statutParcelle(p)==="production").reduce((s,p)=>s+(parseFloat(p.surface)||0),0);
                const kgHaReel = surfTotale>0 ? Math.round(kgRecoltes/surfTotale) : 0;
                const kgHaAutorise = rendAnnee ? parseFloat(rendAnnee.rendementAutorise)||0 : 0;
                const enRI = kgHaAutorise>0 && kgHaReel>kgHaAutorise;
                return (
                  <div key={annee} style={{borderBottom:"0.5px solid #ede5d4",paddingBottom:"10px",marginBottom:"10px"}}>
                    <div style={{fontWeight:500,color:"#2C3E50",fontSize:"13px",marginBottom:"6px"}}>Campagne {annee}</div>
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
                      {kgPrestation>0&&<div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#9a8870"}}>Prestation pressurage</span>
                        <span style={{fontWeight:500,color:"#185FA5"}}>{kgPrestation.toLocaleString()} kg</span>
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
                            background:p.certification==="BIO"?"#d4edc0":p.certification==="NON BIO"?"#ede5d4":p.certification==="C1"?"#E8E0D0":p.certification==="C2"?"#fce8a8":"#fad4a0",
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
            if(filterStockFormat && stockTab==="champagne" && (l.format||"75cl")!==filterStockFormat) return false;
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
                  {lbl:"Total en stock",val:total+" btl",sub:"tous formats",col:"#8B7355"},
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
                  <button key={key} onClick={()=>{setStockTab(key);setFilterStockStatut("");setFilterStockFormat("");}} style={{padding:"8px 14px",border:"none",borderBottom:stockTab===key?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:stockTab===key?"#2C3E50":"#9a8870",fontWeight:stockTab===key?500:400,fontSize:"12px",cursor:"pointer",fontFamily:"Georgia,serif"}}>{lbl}</button>
                ))}
              </div>

              {/* Alertes */}
              {(()=>{
                const calcStock = (type) => coiffesStock.filter(c=>c.type===type||(type==="Export"&&c.type==="Export Magnum")).reduce((s,c)=>s+(c.operation==="achat"?parseInt(c.qte)||0:-(parseInt(c.qte)||0)),0);
                const alerteCoiffeCRD = calcStock("CRD") < 500;
                const alerteCoiffeMag = calcStock("CRD Magnum") < 20;
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
                            {alerteCoiffeExp&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>Export (75cl + Magnum) : {calcStock("Export")} coiffes (seuil 500)</span>}
                            {calcStock("CRD Magnum")<20&&<span style={{background:"#fff",color:"#cc2222",border:"1px solid #f0b4b4",borderRadius:"4px",padding:"1px 8px",fontSize:"11px"}}>CRD Magnum : {calcStock("CRD Magnum")} coiffes (seuil 20)</span>}
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
                {stockTab==="champagne"&&<select style={{...s.sel,maxWidth:"160px"}} value={filterStockFormat} onChange={e=>setFilterStockFormat(e.target.value)}>
                  <option value="">Tous formats</option>
                  <option value="75cl">75cl</option>
                  <option value="Magnum">Magnum</option>
                  <option value="Jeroboam">Jéroboam</option>
                </select>}
                <select style={{...s.sel,maxWidth:"220px"}} value={filterStockStatut} onChange={e=>setFilterStockStatut(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  {[...TOUS_STATUTS_POSSIBLES,"Passage 15 mois (commercialisable)"].map(st=><option key={st} value={st}>{st}</option>)}
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
                <div style={{...s.card,padding:0,marginBottom:"24px"}}>
                  <div style={{maxHeight:"65vh",overflowY:"auto",overflowX:"auto",borderRadius:"8px"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                    <thead>
                      <tr style={{background:"#F0EDE8",borderBottom:"1px solid #d4c4a0"}}>
                        {["Cuvee","Millesime","N° Lot","Format","Date tirage","Age","Statut","Lieu","Qte actuelle","Actions"].map(h=>(
                          <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#9a8870",fontWeight:500,position:"sticky",top:0,background:"#F0EDE8",zIndex:1,boxShadow:"0 1px 0 #d4c4a0"}}>{h}</th>
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
                          <td style={{padding:"10px 12px",fontWeight:600,color:"#8B7355",fontFamily:"monospace",fontSize:"14px"}}>{l.qteActuelle}</td>
                          <td style={{padding:"10px 12px"}}>
                            <div style={{display:"flex",gap:"4px"}}>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#185FA5",borderColor:"#b4d0f0"}}
                                onClick={()=>setLotAction({lot:l,action:"mouvement"})}>Mouvement</button>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#1a7a40",borderColor:"#b4d0b4"}}
                                onClick={()=>{setSortieForm({lotId:l._ids?l._ids[0]:l.id,_ids:l._ids||[l.id],qteMax:parseInt(l.qteActuelle)||0,cuvee:l.cuvee,millesime:l.millesime,format:l.format,date:new Date().toISOString().slice(0,10),qte:"",notes:""});setShowSortieForm(true);}}>Sortie</button>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#8B5A2B",borderColor:"#d4b48c"}}
                                onClick={()=>openEditLot(l)}>Modifier</button>
                              <button style={{...s.ghostSm,fontSize:"10px",color:"#2C3E50",borderColor:"#d4c4a0"}}
                                onClick={()=>{setDivPreview(null);setLotAction({lot:l,action:"diviser"});}}>Diviser</button>
                              {l.linkedLotId&&(!l._ids||l._ids.length===1)&&stockBouteilles.find(x=>x.id===l.linkedLotId)&&(
                                <button style={{...s.ghostSm,fontSize:"10px",color:"#c47800",borderColor:"#e8c888"}}
                                  onClick={()=>annulerDivision(l)}>Annuler la division</button>
                              )}
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
                </div>
              )}

              {/* Totaux (respecte les filtres actifs) - tableau croise quand 2 criteres sont selectionnes */}
              {lotsFiltre.length>0 && (()=>{
                const totalGeneral = lotsFiltre.reduce((s,l)=>s+(parseInt(l.qteActuelle)||0),0);
                const dims = groupByStock;
                const DIM_LABELS = {cuvee:"Cuvée",lieu:"Lieu",age:"Âge"};
                const dimVal = (dim,l) => dim==="cuvee" ? l.cuvee+(l.millesime?" "+l.millesime:"") : dim==="lieu" ? (l.lieu||"-") : (l.mois>=15 ? "≥ 15 mois" : "< 15 mois");
                const sortVals = (dim,vals) => {
                  if(dim==="age") return ["< 15 mois","≥ 15 mois"].filter(v=>vals.includes(v));
                  if(dim==="lieu") return [...LIEUX_STOCK.filter(v=>vals.includes(v)), ...vals.filter(v=>!LIEUX_STOCK.includes(v))];
                  return [...vals].sort((a,b)=>a.localeCompare(b));
                };
                const barColor = "#c9a876";

                let content;
                if(dims.length===0) {
                  content = <div style={{fontSize:"11px",color:"#9a8870",marginBottom:"4px"}}>Sélectionne un ou plusieurs critères ci-dessus pour voir le détail (ex. Lieu + Âge pour un tableau croisé).</div>;
                } else if(dims.length===1) {
                  // Liste simple avec barre de proportion
                  const dim = dims[0];
                  const grouped = {};
                  lotsFiltre.forEach(l=>{
                    const key = dimVal(dim,l);
                    grouped[key] = (grouped[key]||0) + (parseInt(l.qteActuelle)||0);
                  });
                  const keysTriees = sortVals(dim, Object.keys(grouped));
                  content = (
                    <div style={{display:"grid",gap:"6px",maxHeight:"340px",overflowY:"auto"}}>
                      {keysTriees.map(k=>{
                        const qte = grouped[k];
                        const pct = totalGeneral>0 ? Math.round(qte/totalGeneral*100) : 0;
                        return (
                          <div key={k}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",marginBottom:"2px"}}>
                              <span style={{color:"#6a5838"}}>{k}</span>
                              <span style={{fontWeight:600,color:"#8B7355",fontFamily:"monospace"}}>{qte.toLocaleString("fr-FR")} btl <span style={{color:"#c4b494",fontWeight:400}}>({pct}%)</span></span>
                            </div>
                            <div style={{height:"6px",background:"#ede5d4",borderRadius:"3px",overflow:"hidden"}}>
                              <div style={{height:"100%",width:pct+"%",background:barColor,borderRadius:"3px"}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                } else {
                  // Tableau croise sur les 2 premiers criteres selectionnes (lignes x colonnes)
                  const [rowDim, colDim] = dims;
                  const matrix = {};
                  const rowSet = new Set(), colSet = new Set();
                  lotsFiltre.forEach(l=>{
                    const rk = dimVal(rowDim,l), ck = dimVal(colDim,l);
                    rowSet.add(rk); colSet.add(ck);
                    matrix[rk] = matrix[rk]||{};
                    matrix[rk][ck] = (matrix[rk][ck]||0) + (parseInt(l.qteActuelle)||0);
                  });
                  const rows = sortVals(rowDim, [...rowSet]);
                  const cols = sortVals(colDim, [...colSet]);
                  const rowTotal = (rk) => cols.reduce((s,ck)=>s+((matrix[rk]||{})[ck]||0),0);
                  const colTotal = (ck) => rows.reduce((s,rk)=>s+((matrix[rk]||{})[ck]||0),0);
                  content = (
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                        <thead>
                          <tr style={{borderBottom:"1.5px solid #d4c4a0"}}>
                            <th style={{textAlign:"left",padding:"6px 10px",color:"#7a6840",fontWeight:600}}>{DIM_LABELS[rowDim]} \ {DIM_LABELS[colDim]}</th>
                            {cols.map(ck=><th key={ck} style={{textAlign:"right",padding:"6px 10px",color:"#7a6840",fontWeight:600}}>{ck}</th>)}
                            <th style={{textAlign:"right",padding:"6px 10px",color:"#2C3E50",fontWeight:700}}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((rk,i)=>(
                            <tr key={rk} style={{borderBottom:"0.5px solid #ede5d4",background:i%2===0?"#fffbf5":"#ffffff"}}>
                              <td style={{padding:"6px 10px",color:"#6a5838",fontWeight:500}}>{rk}</td>
                              {cols.map(ck=>{
                                const v = (matrix[rk]||{})[ck]||0;
                                return <td key={ck} style={{textAlign:"right",padding:"6px 10px",color:v>0?"#8B7355":"#d4c4a0",fontFamily:"monospace"}}>{v>0?v.toLocaleString("fr-FR"):"-"}</td>;
                              })}
                              <td style={{textAlign:"right",padding:"6px 10px",fontWeight:600,color:"#2C3E50",fontFamily:"monospace"}}>{rowTotal(rk).toLocaleString("fr-FR")}</td>
                            </tr>
                          ))}
                          <tr style={{borderTop:"1.5px solid #d4c4a0"}}>
                            <td style={{padding:"6px 10px",fontWeight:700,color:"#2C3E50"}}>Total</td>
                            {cols.map(ck=><td key={ck} style={{textAlign:"right",padding:"6px 10px",fontWeight:600,color:"#2C3E50",fontFamily:"monospace"}}>{colTotal(ck).toLocaleString("fr-FR")}</td>)}
                            <td style={{textAlign:"right",padding:"6px 10px",fontWeight:700,color:"#2C3E50",fontFamily:"monospace"}}>{totalGeneral.toLocaleString("fr-FR")}</td>
                          </tr>
                        </tbody>
                      </table>
                      {dims.length>2 && <div style={{fontSize:"10px",color:"#9a8870",marginTop:"6px"}}>Le 3e critère ({DIM_LABELS[dims[2]]}) n'est pas affiché dans ce tableau croisé (limité à 2 axes) — désélectionne-le ou remplace-le pour changer les axes.</div>}
                    </div>
                  );
                }

                return (
                  <div style={{...s.card,padding:"16px 20px",marginTop:"16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showTotauxDetail?"12px":"0",flexWrap:"wrap",gap:"8px"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#2C3E50"}}>Totaux ({lotsFiltre.length} lot{lotsFiltre.length>1?"s":""} — filtres appliqués)</div>
                      <button style={{...s.ghostSm,fontSize:"11px"}} onClick={()=>setShowTotauxDetail(v=>!v)}>{showTotauxDetail?"Masquer le détail":"Voir le détail"}</button>
                    </div>
                    {showTotauxDetail && (
                      <>
                        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"12px"}}>
                          {[["cuvee","Cuvée"],["lieu","Lieu"],["age","Âge"]].map(([val,lbl])=>(
                            <button key={val} onClick={()=>setGroupByStock(prev=>prev.includes(val)?prev.filter(x=>x!==val):[...prev,val])}
                              style={{padding:"4px 10px",borderRadius:"5px",border:`0.5px solid ${groupByStock.includes(val)?"#8B7355":"#d4c4a0"}`,background:groupByStock.includes(val)?"#F0EDE8":"transparent",color:groupByStock.includes(val)?"#8B7355":"#9a8870",fontSize:"11px",cursor:"pointer",fontWeight:groupByStock.includes(val)?600:400}}>
                              {groupByStock.includes(val)?"✓ ":""}{lbl}
                            </button>
                          ))}
                        </div>
                        {content}
                      </>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",marginTop:showTotauxDetail?"10px":"0",borderTop:showTotauxDetail?"1px solid #d4c4a0":"none",fontSize:"13px"}}>
                      <span style={{fontWeight:500,color:"#2C3E50"}}>Total général</span>
                      <span style={{fontWeight:700,color:"#2C3E50",fontFamily:"monospace"}}>{totalGeneral.toLocaleString("fr-FR")} btl</span>
                    </div>
                  </div>
                );
              })()}

              {/* Encart coiffes */}
              {(()=>{
                const calcStock = (type) => coiffesStock.filter(c=>c.type===type||(type==="Export"&&c.type==="Export Magnum")).reduce((s,c)=>s+(c.operation==="achat"?parseInt(c.qte)||0:-(parseInt(c.qte)||0)),0);
                const stockCRD = calcStock("CRD");
                const stockCRDMag = calcStock("CRD Magnum");
                const stockCRDJer = calcStock("CRD Jeroboam");
                const stockExport = calcStock("Export");
                const stockExpJer = calcStock("Export Jeroboam");
                const stockVignetteCRD = calcStock("Vignette CRD Coteaux");
                const stockNeutre50 = calcStock("Neutre 50cl");
                const stockNeutre3L = calcStock("Neutre 3L");
                return (
                  <div style={{...s.card,padding:"16px 20px",marginTop:"16px",marginBottom:"16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#2C3E50"}}>Stock coiffes</div>
                      <button style={s.btnSm} onClick={()=>setShowCoiffesForm(true)}>+ Achat coiffes</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
                      {[["CRD 75cl",stockCRD,"#6a2d8a"],["CRD Mag",stockCRDMag,"#6a2d8a"],["CRD Jer",stockCRDJer,"#6a2d8a"],
                        ["Export 75cl/Mag",stockExport,"#8a2d6a"],["Export Jer",stockExpJer,"#8a2d6a"],
                        ["Vignette CRD Coteaux",stockVignetteCRD,"#2d6a5c"],
                        ["Neutre 50cl (Ratafia)",stockNeutre50,"#5c2a08"],["Neutre 3L (Ratafia)",stockNeutre3L,"#5c2a08"]
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
                    <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#2C3E50"}}>Historique des sorties {showHistSorties?"▲":"▼"}</div>
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
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px",padding:"10px",background:"#F0EDE8",borderRadius:"6px"}}>
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
                        <span style={{color:"#8B7355",fontFamily:"monospace",marginLeft:"8px",fontWeight:500}}>{c.qte} {c.format==="Magnum"?"Magnums":c.format==="Jeroboam"?"Jeroboams":"btl"} sorties</span>
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
              {[...tirages].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=>(
                <div key={t.id} style={{...s.card,borderLeft:"3px solid #533AB7"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"16px"}}>
                    {/* Identite */}
                    <div>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"16px",fontWeight:500,color:"#2C3E50",marginBottom:"2px"}}>{t.cuvee}{t.isBio&&<span style={{marginLeft:"8px",fontSize:"11px",background:"#2d6a00",color:"#fff",borderRadius:"4px",padding:"2px 7px",fontWeight:600}}>🌿 BIO</span>}</div>
                      <div style={{fontSize:"12px",color:"#9a8870",marginBottom:"8px"}}>{t.date} - {t.operateur}</div>
                      {t.millesime&&<div style={{fontSize:"11px",color:"#6a5838"}}>Millésime : <strong>{t.millesime}</strong></div>}
                      {t.futsSources?.length>0&&(
                        <div style={{fontSize:"11px",color:"#6a5838",marginTop:"3px"}}>
                          Futs : {t.futsSources.join(", ")}
                        </div>
                      )}
                      {t.cuveSourceId&&(
                        <div style={{fontSize:"11px",color:"#6a5838",marginTop:"3px"}}>
                          Cuve source : {cuvesCuverie.find(c=>c.id===t.cuveSourceId)?.nom||t.cuveSourceId}
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
                          {t.levainLot&&<div style={{display:"inline-flex",alignItems:"center",background:"#F0EDE8",border:"0.5px solid #d4c4a0",borderRadius:"3px",padding:"1px 7px",fontSize:"10px",color:"#2C3E50",fontFamily:"monospace",marginBottom:"4px"}}>Lot: {t.levainLot}</div>}
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
                          <span style={{display:"inline-block",width:"18px",height:"18px",background:"#d4edc0",borderRadius:"3px",textAlign:"center",lineHeight:"18px",fontSize:"10px",marginRight:"5px",color:"#2d6a00",fontFamily:"monospace"}}>{t.typeProduit==="ratafia"?50:75}</span>
                          {t.qte75} bouteilles = {((parseFloat(t.qte75)||0)*(t.typeProduit==="ratafia"?0.5:0.75)).toFixed(0)}L
                        </div>}
                        {(parseFloat(t.qteMagnum)||0)>0&&<div style={{fontSize:"11px",color:"#6a5838"}}>
                          <span style={{display:"inline-block",width:"18px",height:"18px",background:"#E8E0D0",borderRadius:"3px",textAlign:"center",lineHeight:"18px",fontSize:"10px",marginRight:"5px",color:"#2C3E50",fontFamily:"monospace"}}>M</span>
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
                    <button style={{background:"#F0EDE8",color:"#2C3E50",border:"0.5px solid #d4c4a0",borderRadius:"4px",padding:"4px 12px",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}
                      onClick={()=>openEditTirage(t)}>
                      Modifier
                    </button>
                    <button style={{background:"#fce8e8",color:"#cc2222",border:"0.5px solid #f0b4b4",borderRadius:"4px",padding:"4px 12px",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}
                      onClick={()=>{
  if(!window.confirm("Supprimer ce tirage et restituer les volumes ?")) return;
  // Restituer volumes aux futs sources (ancien systeme)
  const updFuts = tonneaux.map(fut=>{
    const vol = parseFloat(t.futsSourcesVolumes?.[fut.id])||0;
    if(vol>0) {
      const newVol = (fut.contenuActuel||0)+vol;
      const updated = {...fut, contenuActuel:newVol, statut:"actif"};
      saveTonneau(updated); return updated;
    }
    return fut;
  });
  setTonneaux(updFuts);
  // Restituer volume a la cuve source (cuverie)
  if(t.cuveSourceId) {
    const volHL = (parseFloat(t.volumeTotal)||0)/100;
    setCuvesCuverie(prev=>prev.map(c=>{
      if(c.id===t.cuveSourceId) {
        const updated = {...c, contenuActuelHL:String(Math.round(((parseFloat(c.contenuActuelHL)||0)+volHL)*100)/100)};
        fbSave("cuvesCuverie",c.id,updated); return updated;
      }
      return c;
    }));
  }
  setTirages(prev=>prev.filter(tr=>tr.id!==t.id));
  deleteTirageFb(t.id);
}}>
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
            {/* Onglets campagnes */}
            {(()=>{
              const annees = [...new Set(mouvements.map(m=>m.date?.slice(0,4)||"?"))].sort().reverse();
              return (
                <div style={{display:"flex",gap:"0",marginBottom:"20px",borderBottom:"1px solid #d4c4a0",flexWrap:"wrap"}}>
                  {annees.map(a=>(
                    <div key={a} style={{display:"flex",alignItems:"center"}}>
                      <button onClick={()=>setFilterMvtAnnee(a)} style={{padding:"8px 12px",border:"none",borderBottom:filterMvtAnnee===a?"2px solid #b8860b":"2px solid transparent",background:"transparent",color:filterMvtAnnee===a?"#2C3E50":"#9a8870",fontWeight:filterMvtAnnee===a?500:400,fontSize:"13px",cursor:"pointer",fontFamily:"Georgia,serif"}}>
                        {a} <span style={{fontSize:"10px",color:"#9a8870"}}>({mouvements.filter(m=>m.date?.slice(0,4)===a).length})</span>
                        {isMvtCampagneClosed(a)&&<span style={{fontSize:"9px",color:"#cc2222",marginLeft:"4px"}}>🔒</span>}
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Filtres */}
            <div style={{display:"flex",gap:"10px",marginBottom:"18px",alignItems:"center",flexWrap:"wrap"}}>
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
              {!isMvtCampagneClosed(filterMvtAnnee)
                ? <button style={{...s.ghostSm,fontSize:"10px",color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>cloturerMvtCampagne(filterMvtAnnee)}>Clôturer</button>
                : <button style={{...s.ghostSm,fontSize:"10px"}} onClick={()=>rouvrirMvtCampagne(filterMvtAnnee)}>Rouvrir</button>
              }
              <button style={{...s.ghostSm,fontSize:"10px",color:"#2d6a00",borderColor:"#7ab848"}} onClick={()=>exportMouvementsCSV(filterMvtAnnee)}>↓ CSV</button>
              <button style={{...s.ghostSm,fontSize:"10px",color:"#8B0000",borderColor:"#c85050"}} onClick={()=>exportMouvementsPDF(filterMvtAnnee)}>↓ PDF</button>
              <span style={{color:"#8a7248",fontSize:"11px",marginLeft:"auto"}}>{filteredMouvements.length} mouvements</span>
            </div>
            <div style={s.card}>
              {filteredMouvements.length===0&&<div style={{color:"#8a7248",fontSize:"13px"}}>Aucun mouvement pour cette campagne.</div>}
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>Diviser le volume — {divisionFut.id}</div>
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>{editingCuverie?"Modifier la cuve":"Nouvelle cuve de cuverie"}</div>
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
              <div><span style={s.lbl}>Notes (ex. contenu actuellement stocké)</span>
                <input style={s.inp} placeholder="ex. Fontinette 2025 - en attente tirage" value={cuverieForm.notes||""} onChange={e=>setCuverieForm(f=>({...f,notes:e.target.value}))}/></div>
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

      {/* == MODAL CORRECTION DATE SESSION (DEGUSTATION) == */}
      {showBulkDateForm&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"420px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>Corriger la date d'une session</div>
              <button style={s.ghost} onClick={()=>setShowBulkDateForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div>
                <span style={s.lbl}>Session</span>
                <select style={s.sel} value={bulkDateForm.session} onChange={e=>setBulkDateForm(f=>({...f,session:e.target.value}))}>
                  <option value="">-- Choisir une session --</option>
                  {[...new Set(degustations.map(d=>d.session))].filter(Boolean).sort().map(sess=>(
                    <option key={sess} value={sess}>{sess} ({degustations.filter(d=>d.session===sess).length} notes)</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={s.lbl}>Nouvelle date</span>
                <input type="date" style={s.inp} value={bulkDateForm.date} onChange={e=>setBulkDateForm(f=>({...f,date:e.target.value}))}/>
              </div>
              {bulkDateForm.session&&(
                <div style={{fontSize:"12px",color:"#7a6840",background:"#F0EDE8",border:"0.5px solid #d4c4a0",borderRadius:"6px",padding:"8px 12px"}}>
                  Cette action va mettre a jour la date sur <strong>{degustations.filter(d=>d.session===bulkDateForm.session).length} note(s)</strong>, tous fûts confondus, pour la session "{bulkDateForm.session}".
                </div>
              )}
              <div style={{display:"flex",gap:"8px",justifyContent:"space-between",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={{...s.ghost,color:"#cc2222",borderColor:"#e8888855"}} disabled={!bulkDateForm.session} onClick={()=>{
                  if(!bulkDateForm.session) return alert("Choisir une session.");
                  const concernees = degustations.filter(d=>d.session===bulkDateForm.session);
                  if(!window.confirm(`Supprimer definitivement les ${concernees.length} note(s) de la session "${bulkDateForm.session}" ? Cette action est irreversible.`)) return;
                  setDegustations(prev=>prev.filter(d=>d.session!==bulkDateForm.session));
                  concernees.forEach(d=>deleteDegustationFb(d.id));
                  alert(`${concernees.length} note(s) supprimee(s).`);
                  setShowBulkDateForm(false);
                }}>Supprimer cette session</button>
                <div style={{display:"flex",gap:"8px"}}>
                  <button style={s.ghost} onClick={()=>setShowBulkDateForm(false)}>Annuler</button>
                  <button style={s.btn} onClick={()=>{
                    if(!bulkDateForm.session) return alert("Choisir une session.");
                    if(!bulkDateForm.date) return alert("Choisir une date.");
                    const concernees = degustations.filter(d=>d.session===bulkDateForm.session);
                    const updated = concernees.map(d=>({...d, date:bulkDateForm.date}));
                    setDegustations(prev=>prev.map(d=>{
                      const u = updated.find(x=>x.id===d.id);
                      return u || d;
                    }));
                    updated.forEach(d=>saveDegustation(d));
                    alert(`${updated.length} note(s) mise(s) a jour avec la date ${bulkDateForm.date.split("-").reverse().join("/")}.`);
                    setShowBulkDateForm(false);
                  }}>Mettre à jour</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* == MODAL DEGRE RATAFIA == */}
      {showDegreRatafiaForm&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"380px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>Degré alcoolique du Ratafia</div>
              <button style={s.ghost} onClick={()=>setShowDegreRatafiaForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div>
                <span style={s.lbl}>Degré (% vol.)</span>
                <input type="number" step="0.1" style={s.inp} placeholder="ex. 18" value={degreRatafiaForm} onChange={e=>setDegreRatafiaForm(e.target.value)}/>
              </div>
              <div style={{fontSize:"11px",color:"#9a8870"}}>Utilisé pour calculer le volume d'alcool pur (HL AP) affiché sur l'accueil : Volume (HL) × degré ÷ 100.</div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowDegreRatafiaForm(false)}>Annuler</button>
                <button style={s.btn} onClick={()=>{
                  if(!degreRatafiaForm) return alert("Le degré est requis.");
                  const existing = degresRatafia[0];
                  const r = {id:existing?.id||"degre_ratafia", degre:degreRatafiaForm, timestamp:new Date().toISOString()};
                  setDegresRatafia([r]);
                  fbSave("degresRatafia", r.id, r);
                  setShowDegreRatafiaForm(false);
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>RI requis</div>
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
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",color:"#8B7355"}}>Nouveau mouvement</div>
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
                  <span style={s.lbl}>Futs/cuves concernes (volumes a deduire)</span>
                  <div style={{maxHeight:"200px",overflowY:"auto",border:"0.5px solid #d4c4a0",borderRadius:"6px",padding:"6px",background:"#fffdf7"}}>
                    {[...tonneaux.filter(t=>t.contenuActuel>0).map(t=>({id:t.id,nom:t.denomination,dispo:t.contenuActuel})),
                      ...cuvesCuverie.filter(c=>(parseFloat(c.contenuActuelHL)||0)>0).map(c=>({id:"cuve_"+c.id,nom:c.nom+" (cuve)",dispo:Math.round((parseFloat(c.contenuActuelHL)||0)*100)}))
                    ].map(t=>(
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:"7px",padding:"3px",fontSize:"12px"}}>
                        <input type="checkbox" checked={mvtForm.futSource.includes(t.id)} onChange={()=>setMvtForm(f=>({...f,futSource:f.futSource.includes(t.id)?f.futSource.filter(x=>x!==t.id):[...f.futSource,t.id]}))}/>
                        <span style={{color:"#8B7355",minWidth:"54px",fontFamily:"monospace"}}>{t.id.replace("cuve_","")}</span>
                        <span style={{color:"#6a5838",flex:1}}>{t.nom}</span>
                        <span style={{color:"#9a8870",fontSize:"10px"}}>{t.dispo}L</span>
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
                    <span style={s.lbl}>Fût/cuve source (fournit le vin) *</span>
                    <select style={s.sel} value={mvtForm.futSource[0]||""} onChange={e=>setMvtForm(f=>({...f,futSource:[e.target.value]}))}>
                      <option value="">Selectionner...</option>
                      {[...tonneaux.filter(t=>t.contenuActuel>0).map(t=>({id:t.id,nom:t.id+" - "+(t.denomination||""),dispo:t.contenuActuel})),
                        ...cuvesCuverie.filter(c=>(parseFloat(c.contenuActuelHL)||0)>0).map(c=>({id:"cuve_"+c.id,nom:c.nom+" (cuve)",dispo:Math.round((parseFloat(c.contenuActuelHL)||0)*100)}))
                      ].map(x=><option key={x.id} value={x.id}>{x.nom} ({x.dispo}L)</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                      <span style={s.lbl}>Futs/cuves a oullier</span>
                      <button style={s.ghostSm} onClick={()=>setMvtForm(f=>({...f,ouillageDestFuts:[...(f.ouillageDestFuts||[]),{futId:"",volume:""}]}))}>+ Ajouter</button>
                    </div>
                    {(mvtForm.ouillageDestFuts||[{futId:"",volume:""}]).map((ef,i)=>(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 80px auto",gap:"6px",marginBottom:"6px",alignItems:"end"}}>
                        <select style={s.sel} value={ef.futId} onChange={e=>setMvtForm(f=>({...f,ouillageDestFuts:f.ouillageDestFuts.map((x,j)=>j===i?{...x,futId:e.target.value}:x)}))}>
                          <option value="">Selectionner...</option>
                          {[...tonneaux.filter(t=>t.id!==mvtForm.futSource[0]).map(t=>({id:t.id,nom:t.id+" - "+(t.denomination||""),info:t.contenuActuel+"L/"+t.volume+"L"})),
                            ...cuvesCuverie.filter(c=>("cuve_"+c.id)!==mvtForm.futSource[0]).map(c=>({id:"cuve_"+c.id,nom:c.nom+" (cuve)",info:Math.round((parseFloat(c.contenuActuelHL)||0)*100)+"L/"+Math.round((parseFloat(c.volumeHL)||0)*100)+"L"}))
                          ].map(x=><option key={x.id} value={x.id}>{x.nom} ({x.info})</option>)}
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
                  <span style={s.lbl}>Fût/cuve source {mvtForm.type==="assemblage"?"(multi)":""} *</span>
                  <div style={{maxHeight:"220px",overflowY:"auto",border:"1px solid #cfc0a0",borderRadius:"4px",padding:"7px"}}>
                    {[...tonneaux.filter(t=>t.contenuActuel>0).map(t=>({id:t.id,nom:t.denomination,dispo:t.contenuActuel})),
                      ...(mvtForm.type==="assemblage"?[]:cuvesCuverie.filter(c=>(parseFloat(c.contenuActuelHL)||0)>0).map(c=>({id:"cuve_"+c.id,nom:c.nom+" (cuve)",dispo:Math.round((parseFloat(c.contenuActuelHL)||0)*100)})))
                    ].map(t=>(
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"4px",fontSize:"12px"}}>
                        <input type={mvtForm.type==="assemblage"?"checkbox":"radio"} name="src" checked={mvtForm.futSource.includes(t.id)}
                          onChange={()=>setMvtForm(f=>({
                            ...f,
                            futSource:mvtForm.type==="assemblage"?(f.futSource.includes(t.id)?f.futSource.filter(x=>x!==t.id):[...f.futSource,t.id]):[t.id],
                            assemblageVolumes:mvtForm.type==="assemblage"?{...f.assemblageVolumes,[t.id]:f.assemblageVolumes[t.id]||t.dispo}:{}
                          }))}/>
                        <span style={{color:"#8B7355",minWidth:"52px"}}>{t.id.replace("cuve_","")}</span>
                        <span style={{color:"#7a6840",flex:1}}>{t.nom}</span>
                        <span style={{color:"#9a8870",fontSize:"10px"}}>{t.dispo}L dispo</span>
                        {mvtForm.type==="assemblage"&&mvtForm.futSource.includes(t.id)&&(
                          <input type="number" style={{...s.inp,width:"80px",padding:"2px 6px",fontSize:"11px"}}
                            placeholder={String(t.dispo)}
                            value={mvtForm.assemblageVolumes[t.id]||""}
                            onChange={e=>setMvtForm(f=>({...f,assemblageVolumes:{...f.assemblageVolumes,[t.id]:e.target.value}}))}/>
                        )}
                        {mvtForm.type!=="assemblage"&&<span style={{color:"#6a5838"}}>{t.dispo}L</span>}
                      </div>
                    ))}
                  </div>
                  {mvtForm.type==="assemblage"&&mvtForm.futSource.length>0&&(
                    <div style={{fontSize:"11px",color:"#2C3E50",marginTop:"4px"}}>
                      Total assemblage : {mvtForm.futSource.reduce((s,id)=>s+(parseFloat(mvtForm.assemblageVolumes[id])||getTonneau(id)?.contenuActuel||0),0).toLocaleString()} L
                    </div>
                  )}
                </div>
              )}
              {needsDest&&(
                <div><span style={s.lbl}>{mvtForm.type==="assemblage"?"Cuve destination (Cuverie)":"Fût/cuve destination"} *</span>
                  <select style={s.sel} value={mvtForm.futDest} onChange={e=>setMvtForm(f=>({...f,futDest:e.target.value}))}>
                    <option value="">Sélectionner...</option>
                    {mvtForm.type==="assemblage"
                      ? cuvesCuverie.filter(c=>c.type!=="bourbes").map(c=><option key={c.id} value={c.id}>{c.nom} - {c.type} (dispo: {Math.max(0,(parseFloat(c.volumeHL)||0)-(parseFloat(c.contenuActuelHL)||0)).toFixed(1)} HL)</option>)
                      : [...tonneaux.filter(t=>!mvtForm.futSource.includes(t.id)).map(t=>({id:t.id,nom:t.id+" - "+(t.denomination||""),info:t.contenuActuel+"L/"+t.volume+"L"})),
                         ...cuvesCuverie.filter(c=>("cuve_"+c.id)!==mvtForm.futSource[0]).map(c=>({id:"cuve_"+c.id,nom:c.nom+" (cuve)",info:Math.round((parseFloat(c.contenuActuelHL)||0)*100)+"L/"+Math.round((parseFloat(c.volumeHL)||0)*100)+"L"}))
                        ].map(x=><option key={x.id} value={x.id}>{x.nom} ({x.info})</option>)
                    }
                  </select>
                </div>
              )}
              {needsVol&&<div><span style={s.lbl}>Volume (L)</span><input type="number" style={s.inp} placeholder="ex. 15" value={mvtForm.volume} onChange={e=>setMvtForm(f=>({...f,volume:e.target.value}))}/></div>}
              {mvtForm.type==="ajout_produit"&&(
                <div style={{display:"grid",gap:"12px"}}>
                  <div>
                    <span style={s.lbl}>Tonneaux concernés *</span>
                    <div style={{maxHeight:"160px",overflowY:"auto",border:"0.5px solid #d4c4a0",borderRadius:"6px",padding:"6px",background:"#fffdf7"}}>
                      {tonneaux.filter(t=>t.statut!=="vide"&&t.contenuActuel>0).map(t=>(
                        <label key={t.id} style={{display:"flex",alignItems:"center",gap:"7px",padding:"3px",cursor:"pointer",fontSize:"12px"}}>
                          <input type="checkbox" checked={(mvtForm.futSource||[]).includes(t.id)}
                            onChange={()=>setMvtForm(f=>({...f,futSource:f.futSource.includes(t.id)?f.futSource.filter(x=>x!==t.id):[...f.futSource,t.id]}))}/>
                          <span style={{color:"#8B7355",minWidth:"54px",fontFamily:"monospace"}}>{t.id}</span>
                          <span style={{color:"#6a5838",flex:1}}>{t.denomination}</span>
                          <span style={{color:"#9a8870",fontSize:"10px"}}>{t.contenuActuel}L</span>
                        </label>
                      ))}
                    </div>
                  </div>
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
              {mvtForm.type==="distillerie"&&(
                <div style={{borderTop:"0.5px solid #d4c4a0",paddingTop:"12px",display:"grid",gap:"10px"}}>
                  <div style={{fontFamily:"Georgia,serif",fontSize:"13px",color:"#7a5200",marginBottom:"4px"}}>Details envoi distillerie</div>
                  <div style={{fontSize:"12px",color:"#7a5200",background:"#fff6e0",border:"0.5px solid #e8c888",borderRadius:"4px",padding:"6px 10px"}}>
                    Sort du stock un volume d'excédents (fûts et/ou cuves de la cuverie) envoyé à la distillerie.
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                      <span style={s.lbl}>Sources (fûts ou cuves)</span>
                      <button style={s.ghostSm} onClick={()=>setMvtForm(f=>({...f,distillerieSources:[...(f.distillerieSources||[{id:"",volume:""}]),{id:"",volume:""}]}))}>+ Ajouter</button>
                    </div>
                    {(mvtForm.distillerieSources||[{id:"",volume:""}]).map((ds,i)=>(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 100px 24px",gap:"8px",marginBottom:"8px",alignItems:"center"}}>
                        <select style={s.sel} value={ds.id} onChange={e=>setMvtForm(f=>({...f,distillerieSources:f.distillerieSources.map((x,j)=>j===i?{...x,id:e.target.value}:x)}))}>
                          <option value="">Selectionner...</option>
                          {[...tonneaux.filter(t=>(t.contenuActuel||0)>0).map(t=>({id:t.id,nom:t.id+" "+(t.denomination||""),vol:t.contenuActuel||0})),...cuvesCuverie.filter(c=>(parseFloat(c.contenuActuelHL)||0)>0).map(c=>({id:"cuve_"+c.id,nom:c.nom+" (cuve)",vol:(parseFloat(c.contenuActuelHL)||0)*100}))].map(x=><option key={x.id} value={x.id}>{x.nom} — {x.vol} L</option>)}
                        </select>
                        <input type="number" style={s.inp} placeholder="Volume L" value={ds.volume} onChange={e=>setMvtForm(f=>({...f,distillerieSources:f.distillerieSources.map((x,j)=>j===i?{...x,volume:e.target.value}:x)}))}/>
                        {i>0&&<button style={{background:"none",border:"none",cursor:"pointer",color:"#cc2222",fontSize:"16px"}} onClick={()=>setMvtForm(f=>({...f,distillerieSources:f.distillerieSources.filter((_,j)=>j!==i)}))}>×</button>}
                      </div>
                    ))}
                    <div style={{fontSize:"12px",color:"#7a5200",fontWeight:500,textAlign:"right"}}>
                      Total envoyé : {(mvtForm.distillerieSources||[]).reduce((s,ds)=>s+(parseFloat(ds.volume)||0),0).toLocaleString()} L
                    </div>
                  </div>
                </div>
              )}
              {mvtForm.type==="entonnage"&&(
                <div style={{borderTop:"0.5px solid #d4c4a0",paddingTop:"12px",display:"grid",gap:"10px"}}>
                  <div style={{fontFamily:"Georgia,serif",fontSize:"13px",color:"#2C3E50",marginBottom:"4px"}}>Details entonnage</div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                      <span style={s.lbl}>Cuves sources (Cuverie)</span>
                      <button style={s.ghostSm} onClick={()=>setMvtForm(f=>({...f,entonnageCuves:[...(f.entonnageCuves||[{cuveId:"",volume:"",vendangeId:""}]),{cuveId:"",volume:"",vendangeId:""}]}))}>+ Ajouter cuve</button>
                    </div>
                    {(mvtForm.entonnageCuves||[{cuveId:"",volume:"",vendangeId:""}]).map((ec,i)=>(
                      <div key={i} style={{background:"#fffdf7",border:"0.5px solid #d4c4a0",borderRadius:"6px",padding:"8px",marginBottom:"8px"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 80px auto",gap:"6px",marginBottom:"6px",alignItems:"end"}}>
                          <select style={s.sel} value={ec.cuveId} onChange={e=>setMvtForm(f=>({...f,entonnageCuves:f.entonnageCuves.map((x,j)=>j===i?{...x,cuveId:e.target.value,vendangeId:""}:x)}))}>
                            <option value="">Cuve source...</option>
                            {cuvesCuverie.filter(c=>(parseFloat(c.contenuActuelHL)||0)>0).map(c=>(
                              <option key={c.id} value={c.id}>{c.nom} ({c.contenuActuelHL||0} HL dispo)</option>
                            ))}
                          </select>
                          <input type="number" step="0.01" style={s.inp} placeholder="HL" value={ec.volume} onChange={e=>setMvtForm(f=>({...f,entonnageCuves:f.entonnageCuves.map((x,j)=>j===i?{...x,volume:e.target.value}:x)}))}/>
                          {i>0&&<button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4"}} onClick={()=>setMvtForm(f=>({...f,entonnageCuves:f.entonnageCuves.filter((_,j)=>j!==i)}))}>x</button>}
                          {i===0&&<div/>}
                        </div>
                        {ec.cuveId&&<div>
                          <select style={{...s.sel,fontSize:"11px"}} value={ec.vendangeId} onChange={e=>setMvtForm(f=>({...f,entonnageCuves:f.entonnageCuves.map((x,j)=>j===i?{...x,vendangeId:e.target.value}:x)}))}>
                            <option value="">Vendange associee (Marc)...</option>
                            {vendanges.filter(v=>v.cuveTailleId===ec.cuveId||v.cuveCuveeId===ec.cuveId||v.cuveCuveeBId===ec.cuveId).map(v=>(
                              <option key={v.id} value={v.id}>{fmt(v.date)} - Marc {v.numeroMarc}{v.cuveeCreee?" - "+v.cuveeCreee:""}</option>
                            ))}
                            {vendanges.filter(v=>v.cuveTailleId===ec.cuveId||v.cuveCuveeId===ec.cuveId||v.cuveCuveeBId===ec.cuveId).length===0&&vendanges.map(v=>(
                              <option key={v.id} value={v.id}>{fmt(v.date)} - Marc {v.numeroMarc}{v.cuveeCreee?" - "+v.cuveeCreee:""}</option>
                            ))}
                          </select>
                          {ec.vendangeId&&(()=>{ const vd=vendanges.find(v=>v.id===ec.vendangeId); return vd?.numeroMarc?<div style={{fontSize:"10px",color:"#2C3E50",marginTop:"2px"}}>🏷 Marc {vd.numeroMarc} sera reporté</div>:null; })()}
                        </div>}
                      </div>
                    ))}
                    <div style={{fontSize:"11px",color:"#533AB7",fontWeight:500}}>
                      Total cuves : {(mvtForm.entonnageCuves||[]).reduce((s,ec)=>s+(parseFloat(ec.volume)||0),0).toFixed(2)} HL
                    </div>
                  </div>
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
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",color:"#8B7355"}}>Nouvelle dégustation</div>
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
                  <div style={{display:"grid",gridTemplateColumns:"120px 80px 80px 80px 1fr",gap:"0",background:"#F8F6F2",padding:"7px 10px",fontSize:"10px",letterSpacing:"0.07em",textTransform:"uppercase",color:"#8a7248"}}>
                    <div>Dégustateur</div><div>Boisé /3</div><div>Longueur /3</div><div>Note G /5</div><div>Commentaire</div>
                  </div>
                  {degForm.lignes.map((l,i)=>(<div key={i} style={{display:"contents"}}>
                    <div key={l.degustateur} style={{display:"grid",gridTemplateColumns:"120px 80px 80px 80px 1fr",gap:"0",borderTop:"1px solid #d0c4a0",padding:"5px 8px",alignItems:"center"}}>
                      <div style={{fontSize:"12px",color:"#8B7355",padding:"0 2px"}}>{l.degustateur}</div>
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
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",color:"#8B7355"}}>Importer des notes depuis Excel</div>
              <button style={s.ghost} onClick={()=>{setShowImport(false);setImportMsg("");}}>x</button>
            </div>
            <div style={{display:"grid",gap:"14px"}}>
              <div style={{background:"#F8F6F2",borderRadius:"6px",padding:"14px",fontSize:"12px",color:"#6a5838",lineHeight:"1.7"}}>
                <div style={{color:"#5a4a30",marginBottom:"8px",fontWeight:600}}>Format attendu (CSV séparé par ;)</div>
                <code style={{display:"block",color:"#8B7355",fontSize:"11px",marginBottom:"6px"}}>fut_id;session;date;degustateur;boise;longueur;note_g;commentaire</code>
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
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",color:"#8B7355"}}>
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
                    <option value="">-- Vide --</option>
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
                <div style={{background:"#F8F6F2",borderRadius:"5px",padding:"10px 14px",fontSize:"12px",color:"#6a5838",display:"flex",alignItems:"center",gap:"10px"}}>
                  {futForm.appellation && <span style={{width:"8px",height:"8px",borderRadius:"50%",background:getApc(futForm.appellation).color,flexShrink:0}}/>}
                  <span style={{color:"#1a1205",fontWeight:600}}>{futForm.id}</span>
                  <span>{futForm.denomination||"-"}</span>
                  {futForm.millesime && <span style={{color:"#7a6840"}}>· {futForm.millesime}</span>}
                  <span style={{marginLeft:"auto",color:"#8B7355",fontWeight:600}}>{futForm.volume} L</span>
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>
                Modifier la note - {editingNote.degustateur}
              </div>
              <button style={s.ghost} onClick={()=>setShowEditDeg(false)}>x</button>
            </div>
            <div style={{fontSize:"12px",color:"#7a6840",marginBottom:"16px",padding:"8px 12px",background:"#F0EDE8",borderRadius:"6px",border:"0.5px solid #d4c4a0"}}>
              Fut <strong style={{color:"#8B7355"}}>{editingNote.futId}</strong> - Session <strong>{editingNote.session}</strong>
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
              <div>
                <span style={s.lbl}>Date</span>
                <input type="date" style={s.inp} value={editNoteForm.date} onChange={e=>setEditNoteForm(f=>({...f,date:e.target.value}))}/>
              </div>
              {editNoteForm.date!==editingNote.date && (
                <div style={{fontSize:"11px",color:"#c47800",background:"#fff6e0",border:"0.5px solid #e8c888",borderRadius:"4px",padding:"6px 10px"}}>
                  La date sera mise a jour pour toutes les notes de la session "{editingNote.session}" sur ce fût.
                </div>
              )}
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>Nouvelle campagne - {campFutId}</div>
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>{editingParcelle?"Modifier la parcelle":"Nouvelle parcelle"}</div>
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
                <div><span style={s.lbl}>Année de plantation</span>
                  <input type="number" style={s.inp} placeholder="ex. 2024" value={parcelleForm.anneePlantation||""} onChange={e=>setParcelleForm(f=>({...f,anneePlantation:e.target.value}))}/>
                  <div style={{fontSize:"10px",color:"#9a8870",marginTop:"2px"}}>Laisser vide si en production</div></div>
                <div><span style={s.lbl}>Cépage(s)</span>
                  <input style={s.inp} placeholder="ex. Chardonnay + Pinot Noir..." value={parcelleForm.cepage} onChange={e=>setParcelleForm(f=>({...f,cepage:e.target.value}))}/>
                  <div style={{fontSize:"10px",color:"#9a8870",marginTop:"2px"}}>Séparer par " + " pour plusieurs cépages</div></div>
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
      {showApportsPanel&&Object.keys(showApportsPanel).some(k=>showApportsPanel[k]===true)&&(()=>{
        const parcelleId = Object.keys(showApportsPanel).find(k=>showApportsPanel[k]===true);
        const parc = parcelles.find(p=>p.id===parcelleId);
        const apports = apportsParcelles.filter(a=>a.parcelleId===parcelleId).sort((a,b)=>new Date(b.date)-new Date(a.date));
        const annees = [...new Set(apports.map(a=>a.campagne))].sort().reverse();
        const exportApportsPDF = () => {
          const rows = annees.map(an=>{
            const apportsAn = apports.filter(a=>a.campagne===an);
            const kgAn = apportsAn.reduce((s,a)=>s+(parseFloat(a.poidsNet)||0),0);
            const surf = parseFloat(parc?.surface)||0;
            return `<h3 style="color:#2C3E50;margin:16px 0 8px">Campagne ${an} — ${kgAn.toLocaleString()} kg${surf>0?" / "+Math.round(kgAn/surf).toLocaleString()+" kg/ha":""}</h3>
              <table width="100%" style="border-collapse:collapse;font-size:11px">
                <tr style="background:#f0f4f7"><th style="padding:5px;text-align:left;border:0.5px solid #d0d8e0">Date</th><th style="padding:5px;text-align:left;border:0.5px solid #d0d8e0">Heure</th><th style="padding:5px;text-align:left;border:0.5px solid #d0d8e0">Opérateur</th><th style="padding:5px;text-align:right;border:0.5px solid #d0d8e0">Cagettes</th><th style="padding:5px;text-align:right;border:0.5px solid #d0d8e0">Poids net</th></tr>
              ${apportsAn.map(a=>`<tr><td style="padding:4px 5px;border:0.5px solid #e0e8f0">${fmt(a.date)}</td><td style="padding:4px 5px;border:0.5px solid #e0e8f0">${a.heure||"-"}</td><td style="padding:4px 5px;border:0.5px solid #e0e8f0">${a.operateur||"-"}</td><td style="padding:4px 5px;border:0.5px solid #e0e8f0;text-align:right">${a.nbCagettes||"-"}</td><td style="padding:4px 5px;border:0.5px solid #e0e8f0;text-align:right;font-weight:500">${parseInt(a.poidsNet).toLocaleString()} kg</td></tr>${a.notes?`<tr><td colspan="5" style="padding:2px 5px 6px 5px;border:0.5px solid #e0e8f0;border-top:none;font-size:10px;color:#6a5838;font-style:italic">📝 ${a.notes}</td></tr>`:""}`).join("")}
              <tr style="background:#f0f4f7;font-weight:bold"><td colspan="4" style="padding:5px;border:0.5px solid #d0d8e0">Total</td><td style="padding:5px;border:0.5px solid #d0d8e0;text-align:right">${kgAn.toLocaleString()} kg</td></tr>
            </table>`;
          }).join("");
          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;margin:20px;color:#1a2530}h1{color:#2C3E50;border-bottom:1px solid #d0d8e0;padding-bottom:8px}</style></head><body><h1>${parc?.nom} — Apports</h1>${rows}</body></html>`;
          const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
        };
        return (
          <div style={s.modal}>
            <div style={{...s.modalBox,width:"700px",maxHeight:"80vh",overflowY:"auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",position:"sticky",top:0,background:"white",paddingBottom:"12px",borderBottom:"0.5px solid #d4c4a0"}}>
                <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>{parc?.nom} — Apports</div>
                <div style={{display:"flex",gap:"8px"}}>
                  <button style={{...s.ghostSm,fontSize:"10px",color:"#8B0000",borderColor:"#c85050"}} onClick={exportApportsPDF}>↓ PDF</button>
                  <button style={s.ghost} onClick={()=>setShowApportsPanel({})}>x</button>
                </div>
              </div>
              {annees.length===0&&<div style={{color:"#9a8870",fontStyle:"italic"}}>Aucun apport enregistré.</div>}
              {annees.map(an=>{
                const apportsAn = apports.filter(a=>a.campagne===an);
                const kgAn = apportsAn.reduce((s,a)=>s+(parseFloat(a.poidsNet)||0),0);
                const surf = parseFloat(parc?.surface)||0;
                return (
                  <div key={an} style={{marginBottom:"20px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:"14px",color:"#2C3E50",fontWeight:500}}>Campagne {an}</div>
                      <div style={{fontSize:"12px",color:"#9a8870"}}>{kgAn.toLocaleString()} kg{surf>0&&<span> — {Math.round(kgAn/surf).toLocaleString()} kg/ha</span>}</div>
                    </div>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                      <thead>
                        <tr style={{borderBottom:"0.5px solid #d4c4a0",background:"#f4f6f7"}}>
                          <th style={{textAlign:"left",padding:"5px 8px",color:"#4A6274",fontWeight:400}}>Date</th>
                          <th style={{textAlign:"left",padding:"5px 8px",color:"#4A6274",fontWeight:400}}>Heure</th>
                          <th style={{textAlign:"left",padding:"5px 8px",color:"#4A6274",fontWeight:400}}>Opérateur</th>
                          <th style={{textAlign:"right",padding:"5px 8px",color:"#4A6274",fontWeight:400}}>Cagettes</th>
                          <th style={{textAlign:"right",padding:"5px 8px",color:"#4A6274",fontWeight:400}}>Poids net</th>
                          <th style={{width:"20px"}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {apportsAn.map(a=>(
                          <React.Fragment key={a.id}>
                          <tr style={{borderBottom:a.notes?"none":"0.5px solid #ede5d4"}}>
                            <td style={{padding:"5px 8px",color:"#2C3E50"}}>{fmt(a.date)}</td>
                            <td style={{padding:"5px 8px",color:"#6a5838"}}>{a.heure||"-"}</td>
                            <td style={{padding:"5px 8px",color:"#2C3E50"}}>{a.operateur||"-"}</td>
                            <td style={{padding:"5px 8px",color:"#9a8870",textAlign:"right"}}>{a.nbCagettes||"-"}</td>
                            <td style={{padding:"5px 8px",fontWeight:500,color:"#2d6a00",textAlign:"right"}}>{parseInt(a.poidsNet).toLocaleString()} kg</td>
                            <td style={{padding:"5px 8px",whiteSpace:"nowrap"}}>
                              <button style={{background:"none",border:"none",cursor:"pointer",color:"#8B7355",fontSize:"12px",marginRight:"8px"}} onClick={()=>{setApportForm({date:a.date,heure:a.heure||"",operateur:a.operateur||"",nbCagettes:a.nbCagettes||"",poidsNet:a.poidsNet||"",campagne:a.campagne,notes:a.notes||""});setEditingApport(a);setShowApportForm(parc.id);}}>✎</button>
                              <button style={{background:"none",border:"none",cursor:"pointer",color:"#cc2222",fontSize:"13px"}} onClick={()=>{if(window.confirm("Supprimer ?")){ setApportsParcelles(prev=>prev.filter(x=>x.id!==a.id)); deleteApportParcelle(a.id); }}}>×</button>
                            </td>
                          </tr>
                          {a.notes&&(
                            <tr style={{borderBottom:"0.5px solid #ede5d4"}}>
                              <td colSpan={6} style={{padding:"0 8px 6px 8px",color:"#7a6840",fontSize:"11px"}}>📝 {a.notes}</td>
                            </tr>
                          )}
                          </React.Fragment>
                        ))}
                        <tr style={{borderTop:"1px solid #d4c4a0",background:"#f4f6f7"}}>
                          <td colSpan={4} style={{padding:"5px 8px",fontWeight:500,color:"#2C3E50"}}>Total</td>
                          <td style={{padding:"5px 8px",fontWeight:700,color:"#2d6a00",textAlign:"right"}}>{kgAn.toLocaleString()} kg</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {showApportForm&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"400px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>{editingApport?"Modifier l'apport":"Nouvel apport"}</div>
              <button style={s.ghost} onClick={()=>{setShowApportForm(null);setEditingApport(null);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Campagne</span>
                  <input type="number" style={s.inp} placeholder="2026" value={apportForm.campagne} onChange={e=>setApportForm(f=>({...f,campagne:e.target.value}))}/></div>
                <div><span style={s.lbl}>Date</span>
                  <input type="date" style={s.inp} value={apportForm.date} onChange={e=>setApportForm(f=>({...f,date:e.target.value}))}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Heure d'arrivée</span>
                  <input type="time" style={s.inp} value={apportForm.heure||""} onChange={e=>setApportForm(f=>({...f,heure:e.target.value}))}/></div>
                <div><span style={s.lbl}>Opérateur</span>
                  <input style={s.inp} placeholder="Nom de l'opérateur" value={apportForm.operateur} onChange={e=>setApportForm(f=>({...f,operateur:e.target.value}))}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Nb cagettes / stamps</span>
                  <input type="number" style={s.inp} placeholder="ex. 120" value={apportForm.nbCagettes} onChange={e=>setApportForm(f=>({...f,nbCagettes:e.target.value}))}/></div>
                <div><span style={s.lbl}>Poids net (kg) *</span>
                  <input type="number" style={s.inp} placeholder="ex. 2500" value={apportForm.poidsNet} onChange={e=>setApportForm(f=>({...f,poidsNet:e.target.value}))}/></div>
              </div>
              <div><span style={s.lbl}>Note</span>
                <textarea style={{...s.inp,height:"56px",resize:"vertical"}} placeholder="ex. Etat sanitaire, prestataire, remarque particulière..." value={apportForm.notes||""} onChange={e=>setApportForm(f=>({...f,notes:e.target.value}))}/></div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>{setShowApportForm(null);setEditingApport(null);}}>Annuler</button>
                <button style={s.btn} onClick={()=>{
                  if(!apportForm.poidsNet) return alert("Le poids net est requis.");
                  const a = editingApport
                    ? {...editingApport, ...apportForm, parcelleId:showApportForm}
                    : {id:"ap_"+Date.now(), parcelleId:showApportForm, ...apportForm, timestamp:new Date().toISOString()};
                  setApportsParcelles(prev=> editingApport ? prev.map(x=>x.id===a.id?a:x) : [a,...prev]);
                  saveApportParcelle(a);
                  setShowApportForm(null);
                  setEditingApport(null);
                }}>{editingApport?"Enregistrer les modifications":"Enregistrer"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCuveHistorique&&(()=>{
        const cuve = cuvesCuverie.find(c=>c.id===showCuveHistorique);
        // Mouvements lies a cette cuve : entonnage (cuve source), assemblage (reception/tirage/retour), tirages
        const evts = [];
        mouvements.filter(m=>m.type==="entonnage"&&(m.entonnageCuves||[]).some(ec=>ec.cuveId===showCuveHistorique)).forEach(m=>{
          const ec = (m.entonnageCuves||[]).find(ec=>ec.cuveId===showCuveHistorique);
          evts.push({date:m.date,type:"Entonnage (sortie)",detail:"Vers fûts",volume:-(parseFloat(ec?.volume)||0)*100,campagne:m.date?.slice(0,4)});
        });
        assemblages.forEach(a=>{
          if(a.cuveAssemblageId===showCuveHistorique) {
            const volTotal = (a.sources||[]).reduce((s,src)=>s+(parseFloat(src.volume)||0),0);
            const volSortie = (parseFloat(a.destTirageVol)||0)+((a.destRetours||[]).reduce((s,r)=>s+(parseFloat(r.volume)||0),0))+((a.destRetoursRI||[]).reduce((s,r)=>s+(parseFloat(r.volume)||0),0));
            evts.push({date:a.date,type:"Assemblage (réception)",detail:a.nomCuvee,volume:volTotal-volSortie,campagne:a.date?.slice(0,4)});
          }
          if(a.destTirageId===showCuveHistorique) {
            evts.push({date:a.date,type:"Assemblage → Tirage",detail:a.nomCuvee,volume:parseFloat(a.destTirageVol)||0,campagne:a.date?.slice(0,4)});
          }
          (a.destRetours||[]).filter(r=>r.id==="cuve_"+showCuveHistorique).forEach(r=>{
            evts.push({date:a.date,type:"Assemblage → Retour réserve",detail:a.nomCuvee,volume:parseFloat(r.volume)||0,campagne:a.date?.slice(0,4)});
          });
          (a.destRetoursRI||[]).filter(r=>r.id==="cuve_"+showCuveHistorique).forEach(r=>{
            evts.push({date:a.date,type:"Assemblage → Retour RI",detail:a.nomCuvee,volume:parseFloat(r.volume)||0,campagne:a.date?.slice(0,4)});
          });
          (a.sources||[]).filter(src=>src.type==="cuve"&&src.id===showCuveHistorique).forEach(src=>{
            evts.push({date:a.date,type:"Assemblage (source)",detail:a.nomCuvee,volume:-(parseFloat(src.volume)||0),campagne:a.date?.slice(0,4)});
          });
        });
        tirages.filter(t=>t.cuveCuveeId===showCuveHistorique).forEach(t=>{
          evts.push({date:t.date,type:"Tirage (sortie)",detail:t.cuveeCreee||t.nomCuvee,volume:-(parseFloat(t.volumeCuvee)||0)*100,campagne:t.date?.slice(0,4)});
        });
        evts.sort((x,y)=>new Date(y.date)-new Date(x.date));
        const annees = [...new Set(evts.map(e=>e.campagne))].sort().reverse();
        return (
          <div style={s.modal}>
            <div style={{...s.modalBox,width:"600px",maxHeight:"80vh",overflowY:"auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",position:"sticky",top:0,background:"white",paddingBottom:"12px",borderBottom:"0.5px solid #d4c4a0"}}>
                <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>{cuve?.nom} — Historique</div>
                <div style={{display:"flex",gap:"8px"}}>
                  <button style={{...s.ghostSm,fontSize:"10px",color:"#8B0000",borderColor:"#c85050"}} onClick={()=>{
                    const rows = annees.map(an=>{
                      const evtsAn = evts.filter(e=>e.campagne===an);
                      return `<h3 style="color:#2C3E50;margin:16px 0 8px">Campagne ${an}</h3>
                        <table width="100%" style="border-collapse:collapse;font-size:11px">
                          <tr style="background:#f0f4f7"><th style="padding:5px;text-align:left;border:0.5px solid #d0d8e0">Date</th><th style="padding:5px;text-align:left;border:0.5px solid #d0d8e0">Type</th><th style="padding:5px;text-align:left;border:0.5px solid #d0d8e0">Détail</th><th style="padding:5px;text-align:right;border:0.5px solid #d0d8e0">Volume</th></tr>
                        ${evtsAn.map(e=>`<tr><td style="padding:4px 5px;border:0.5px solid #e0e8f0">${fmt(e.date)}</td><td style="padding:4px 5px;border:0.5px solid #e0e8f0">${e.type}</td><td style="padding:4px 5px;border:0.5px solid #e0e8f0">${e.detail||"-"}</td><td style="padding:4px 5px;border:0.5px solid #e0e8f0;text-align:right;color:${e.volume>=0?"#2d6a00":"#cc2222"}">${e.volume>=0?"+":""}${Math.round(e.volume)} L</td></tr>`).join("")}
                        </table>`;
                    }).join("");
                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;margin:20px;color:#1a2530}h1{color:#2C3E50;border-bottom:1px solid #d0d8e0;padding-bottom:8px}</style></head><body><h1>${cuve?.nom} — Historique</h1>${rows}</body></html>`;
                    const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
                  }}>↓ PDF</button>
                  <button style={s.ghost} onClick={()=>setShowCuveHistorique(null)}>x</button>
                </div>
              </div>
              {evts.length===0&&<div style={{color:"#9a8870",fontStyle:"italic"}}>Aucun mouvement enregistré.</div>}
              {annees.length>0&&<div style={{display:"flex",gap:"0",marginBottom:"12px",borderBottom:"1px solid #d4c4a0",flexWrap:"wrap"}}>
                {annees.map(an=>{
                  const active=(showCuveHistAnnee||annees[0])===an;
                  return <button key={an} onClick={()=>setShowCuveHistAnnee(an)} style={{padding:"6px 12px",border:"none",borderBottom:active?"2px solid #2C3E50":"2px solid transparent",background:"transparent",color:active?"#2C3E50":"#9a8870",fontWeight:active?500:400,fontSize:"12px",cursor:"pointer"}}>
                    {an} <span style={{fontSize:"10px",color:"#9a8870"}}>({evts.filter(e=>e.campagne===an).length})</span>
                  </button>;
                })}
              </div>}
              {annees.filter(an=>(showCuveHistAnnee||annees[0])===an).map(an=>(
                <div key={an}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                    <thead>
                      <tr style={{borderBottom:"0.5px solid #d4c4a0",background:"#f4f6f7"}}>
                        <th style={{textAlign:"left",padding:"5px 8px",color:"#4A6274",fontWeight:400}}>Date</th>
                        <th style={{textAlign:"left",padding:"5px 8px",color:"#4A6274",fontWeight:400}}>Type</th>
                        <th style={{textAlign:"left",padding:"5px 8px",color:"#4A6274",fontWeight:400}}>Détail</th>
                        <th style={{textAlign:"right",padding:"5px 8px",color:"#4A6274",fontWeight:400}}>Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evts.filter(e=>e.campagne===an).map((e,i)=>(
                        <tr key={i} style={{borderBottom:"0.5px solid #ede5d4"}}>
                          <td style={{padding:"5px 8px",color:"#2C3E50"}}>{fmt(e.date)}</td>
                          <td style={{padding:"5px 8px",color:"#6a5838"}}>{e.type}</td>
                          <td style={{padding:"5px 8px",color:"#6a5838"}}>{e.detail||"-"}</td>
                          <td style={{padding:"5px 8px",fontWeight:500,textAlign:"right",color:e.volume>=0?"#2d6a00":"#cc2222"}}>{e.volume>=0?"+":""}{Math.round(e.volume)} L</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {showPlanChai&&(
        <div style={s.modal} onClick={()=>setShowPlanChai(false)}>
          <div style={{...s.modalBox,width:"auto",maxWidth:"90vw",padding:"16px"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"8px"}}>
              <button style={s.ghost} onClick={()=>setShowPlanChai(false)}>x</button>
            </div>
            <img src="/plan-chai.png" alt="Plan de chai" style={{maxWidth:"100%",maxHeight:"80vh",borderRadius:"6px"}}/>
          </div>
        </div>
      )}
      {showAssemblageForm&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"680px",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>{editingAssemblage?"Modifier l'assemblage":"Nouvel assemblage"}</div>
              <button style={s.ghost} onClick={()=>{setShowAssemblageForm(false);setEditingAssemblage(null);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"14px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Nom de cuvée *</span>
                  <input style={s.inp} placeholder="ex. Blanc de Blancs 2026" value={assemblageForm.nomCuvee} onChange={e=>setAssemblageForm(f=>({...f,nomCuvee:e.target.value}))}/></div>
                <div><span style={s.lbl}>Date</span>
                  <input type="date" style={s.inp} value={assemblageForm.date} onChange={e=>setAssemblageForm(f=>({...f,date:e.target.value}))}/></div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <input type="checkbox" id="assemblageIsBio" checked={assemblageForm.isBio||false} onChange={e=>setAssemblageForm(f=>({...f,isBio:e.target.checked}))} style={{width:"16px",height:"16px",cursor:"pointer"}}/>
                <label htmlFor="assemblageIsBio" style={{fontSize:"12px",color:"#2d6a00",fontWeight:500,cursor:"pointer"}}>🌿 Certification BIO</label>
              </div>

              {/* Sources */}
              <div style={{background:"#f4f6f7",borderRadius:"8px",padding:"12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                  <span style={{fontWeight:500,color:"#2C3E50",fontSize:"13px"}}>Sources</span>
                  <button style={s.ghostSm} onClick={()=>setAssemblageForm(f=>({...f,sources:[...f.sources,{type:"tonneau",id:"",volume:""}]}))}>+ Ajouter source</button>
                </div>
                {assemblageForm.sources.map((src,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"120px 1fr 100px 24px",gap:"8px",marginBottom:"8px",alignItems:"center"}}>
                    <select style={s.sel} value={src.type} onChange={e=>setAssemblageForm(f=>({...f,sources:f.sources.map((s,j)=>j===i?{...s,type:e.target.value,id:""}:s)}))}>
                      <option value="tonneau">Fût</option>
                      <option value="reserve">Vins de réserve</option>
                      <option value="ri">RI</option>
                      <option value="cuve">Cuve</option>
                    </select>
                    <select style={s.sel} value={src.id} onChange={e=>setAssemblageForm(f=>({...f,sources:f.sources.map((s,j)=>j===i?{...s,id:e.target.value}:s)}))}>
                      <option value="">Sélectionner...</option>
                      {src.type==="tonneau"
                        ? tonneaux.filter(t=>t.statut!=="vide"&&t.contenuActuel>0).map(t=><option key={t.id} value={t.id}>{t.id} — {t.denomination} ({t.contenuActuel} L)</option>)
                        : src.type==="reserve"
                        ? tonneaux.filter(t=>t.appellation==="vins_reserve"&&t.contenuActuel>0).map(t=><option key={t.id} value={t.id}>{t.id}{t.denomination?" — "+t.denomination:""} ({t.contenuActuel} L)</option>)
                        : src.type==="ri"
                        ? tonneaux.filter(t=>t.appellation==="ri"&&t.contenuActuel>0).map(t=><option key={t.id} value={t.id}>{t.id}{t.denomination?" — "+t.denomination:""} ({t.contenuActuel} L)</option>)
                        : cuvesCuverie.filter(c=>(parseFloat(c.contenuActuelHL)||0)>0).map(c=><option key={c.id} value={c.id}>{c.nom}{c.notes?" — "+c.notes:""} ({Math.round((parseFloat(c.contenuActuelHL)||0)*100)} L)</option>)
                      }
                    </select>
                    <input type="number" style={s.inp} placeholder="Volume L" value={src.volume} onChange={e=>setAssemblageForm(f=>({...f,sources:f.sources.map((s,j)=>j===i?{...s,volume:e.target.value}:s)}))}/>
                    <button style={{background:"none",border:"none",cursor:"pointer",color:"#cc2222",fontSize:"16px"}} onClick={()=>setAssemblageForm(f=>({...f,sources:f.sources.filter((_,j)=>j!==i)}))}>×</button>
                  </div>
                ))}
                <div style={{fontSize:"12px",color:"#2C3E50",fontWeight:500,textAlign:"right",marginTop:"6px"}}>
                  Total : {assemblageForm.sources.reduce((s,src)=>s+(parseFloat(src.volume)||0),0).toLocaleString()} L
                </div>
              </div>

              {/* Cuve d'assemblage intermediaire */}
              <div style={{background:"#fff8e8",borderRadius:"8px",padding:"12px",border:"0.5px solid #ffc107"}}>
                <div style={{fontWeight:500,color:"#8B6000",fontSize:"13px",marginBottom:"10px"}}>🥃 Cuve d'assemblage (réception)</div>
                <select style={s.sel} value={assemblageForm.cuveAssemblageId} onChange={e=>setAssemblageForm(f=>({...f,cuveAssemblageId:e.target.value}))}>
                  <option value="">Sélectionner la cuve de réception...</option>
                  {cuvesCuverie.map(c=><option key={c.id} value={c.id}>{c.nom}{c.notes?" — "+c.notes:""} ({(parseFloat(c.contenuActuelHL)||0)*100} L)</option>)}
                </select>
                <div style={{fontSize:"11px",color:"#9a7840",marginTop:"6px"}}>Le volume total des sources est d'abord reçu ici, puis réparti vers les destinations ci-dessous.</div>
              </div>

              {/* Destinations */}
              <div style={{background:"#f0f8f4",borderRadius:"8px",padding:"12px"}}>
                <div style={{fontWeight:500,color:"#2C3E50",fontSize:"13px",marginBottom:"10px"}}>Destinations (répartition depuis la cuve d'assemblage)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"10px"}}>
                  <div><span style={s.lbl}>🍾 Cuve tirage</span>
                    <select style={s.sel} value={assemblageForm.destTirageId} onChange={e=>setAssemblageForm(f=>({...f,destTirageId:e.target.value}))}>
                      <option value="">Aucune</option>
                      {cuvesCuverie.filter(c=>c.type!=="bourbes").map(c=><option key={c.id} value={c.id}>{c.nom}{c.notes?" — "+c.notes:""} ({(parseFloat(c.contenuActuelHL)||0)*100} L)</option>)}
                    </select>
                  </div>
                  <div><span style={s.lbl}>Volume tirage (L)</span>
                    <input type="number" style={s.inp} placeholder="ex. 5000" value={assemblageForm.destTirageVol} onChange={e=>setAssemblageForm(f=>({...f,destTirageVol:e.target.value}))}/></div>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                    <span style={{...s.lbl,marginBottom:0}}>🔄 Retours réserve</span>
                    <button style={s.ghostSm} onClick={()=>setAssemblageForm(f=>({...f,destRetours:[...f.destRetours,{id:"",volume:""}]}))}>+ Ajouter</button>
                  </div>
                  {assemblageForm.destRetours.map((dr,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 120px 24px",gap:"8px",marginBottom:"8px",alignItems:"center"}}>
                      <select style={s.sel} value={dr.id} onChange={e=>setAssemblageForm(f=>({...f,destRetours:f.destRetours.map((r,j)=>j===i?{...r,id:e.target.value}:r)}))}>
                        <option value="">Aucun</option>
                        {[...tonneaux.map(t=>({id:t.id,nom:t.id+" "+(t.denomination||""),vol:t.contenuActuel||0})),...cuvesCuverie.map(c=>({id:"cuve_"+c.id,nom:c.nom+" (cuve)",vol:(parseFloat(c.contenuActuelHL)||0)*100}))].map(x=><option key={x.id} value={x.id}>{x.nom} — {x.vol} L</option>)}
                      </select>
                      <input type="number" style={s.inp} placeholder="Volume L" value={dr.volume} onChange={e=>setAssemblageForm(f=>({...f,destRetours:f.destRetours.map((r,j)=>j===i?{...r,volume:e.target.value}:r)}))}/>
                      <button style={{background:"none",border:"none",cursor:"pointer",color:"#cc2222",fontSize:"16px"}} onClick={()=>setAssemblageForm(f=>({...f,destRetours:f.destRetours.filter((_,j)=>j!==i)}))}>×</button>
                    </div>
                  ))}
                  <div style={{fontSize:"12px",color:"#2C3E50",fontWeight:500,textAlign:"right"}}>
                    Total retour : {assemblageForm.destRetours.reduce((s,r)=>s+(parseFloat(r.volume)||0),0).toLocaleString()} L
                  </div>
                </div>
                <div style={{marginTop:"12px",borderTop:"0.5px dashed #b4c4b8",paddingTop:"12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                    <span style={{...s.lbl,marginBottom:0}}>🔒 Retours RI</span>
                    <button style={s.ghostSm} onClick={()=>setAssemblageForm(f=>({...f,destRetoursRI:[...(f.destRetoursRI||[{id:"",volume:""}]),{id:"",volume:""}]}))}>+ Ajouter</button>
                  </div>
                  {(assemblageForm.destRetoursRI||[{id:"",volume:""}]).map((dr,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 120px 24px",gap:"8px",marginBottom:"8px",alignItems:"center"}}>
                      <select style={s.sel} value={dr.id} onChange={e=>setAssemblageForm(f=>({...f,destRetoursRI:(f.destRetoursRI||[{id:"",volume:""}]).map((r,j)=>j===i?{...r,id:e.target.value}:r)}))}>
                        <option value="">Aucun</option>
                        {[...tonneaux.map(t=>({id:t.id,nom:t.id+" "+(t.denomination||""),vol:t.contenuActuel||0})),...cuvesCuverie.map(c=>({id:"cuve_"+c.id,nom:c.nom+" (cuve)",vol:(parseFloat(c.contenuActuelHL)||0)*100}))].map(x=><option key={x.id} value={x.id}>{x.nom} — {x.vol} L</option>)}
                      </select>
                      <input type="number" style={s.inp} placeholder="Volume L" value={dr.volume} onChange={e=>setAssemblageForm(f=>({...f,destRetoursRI:(f.destRetoursRI||[{id:"",volume:""}]).map((r,j)=>j===i?{...r,volume:e.target.value}:r)}))}/>
                      <button style={{background:"none",border:"none",cursor:"pointer",color:"#cc2222",fontSize:"16px"}} onClick={()=>setAssemblageForm(f=>({...f,destRetoursRI:(f.destRetoursRI||[{id:"",volume:""}]).filter((_,j)=>j!==i)}))}>×</button>
                    </div>
                  ))}
                  <div style={{fontSize:"11px",color:"#7a6840",marginBottom:"4px"}}>Le volume envoyé en RI est comptabilisé dans "RI actuelle" sur l'accueil.</div>
                  <div style={{fontSize:"12px",color:"#2C3E50",fontWeight:500,textAlign:"right"}}>
                    Total RI : {(assemblageForm.destRetoursRI||[]).reduce((s,r)=>s+(parseFloat(r.volume)||0),0).toLocaleString()} L
                  </div>
                </div>
              </div>

              <div><span style={s.lbl}>Notes</span>
                <textarea style={{...s.inp,height:"60px",resize:"vertical"}} value={assemblageForm.notes} onChange={e=>setAssemblageForm(f=>({...f,notes:e.target.value}))}/></div>

              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>{setShowAssemblageForm(false);setEditingAssemblage(null);}}>Annuler</button>
                <button style={s.btn} onClick={()=>{
                  if(!assemblageForm.nomCuvee) return alert("Le nom de cuvée est requis.");
                  if(!assemblageForm.sources.some(s=>s.id&&s.volume)) return alert("Ajoutez au moins une source avec un volume.");
                  const sourcesValides = assemblageForm.sources.filter(s=>s.id&&s.volume);
                  const isBioAssemblage = assemblageForm.isBio || (sourcesValides.length>0 && sourcesValides.every(s=>s.type==="cuve" ? cuvesCuverie.find(c=>c.id===s.id)?.isBio : tonneaux.find(t=>t.id===s.id)?.certif==="BIO"));
                  const oldA = editingAssemblage; // null si creation, sinon assemblage en cours de modification
                  const a = {id: oldA?oldA.id:"asm_"+Date.now(), ...assemblageForm, isBio:isBioAssemblage, timestamp: oldA?oldA.timestamp:new Date().toISOString()};
                  const destRetoursValides = (assemblageForm.destRetours||[]).filter(r=>r.id&&r.volume);
                  const destRetoursRIValides = (assemblageForm.destRetoursRI||[]).filter(r=>r.id&&r.volume);
                  const oldSourcesValides = oldA ? (oldA.sources||[]).filter(s=>s.id&&s.volume) : [];
                  const oldDestRetoursValides = oldA ? (oldA.destRetours||[]).filter(r=>r.id&&r.volume) : [];
                  const oldDestRetoursRIValides = oldA ? (oldA.destRetoursRI||[]).filter(r=>r.id&&r.volume) : [];

                  // Futs : on annule les effets de l'ancien assemblage (si edition) ET on applique les nouveaux, en une seule passe
                  const updFuts = tonneaux.map(t=>{
                    let delta = 0;
                    if(oldA) {
                      const oldSrc = oldSourcesValides.filter(s=>(s.type==="tonneau"||s.type==="reserve"||s.type==="ri")&&s.id===t.id).reduce((sum,s)=>sum+(parseFloat(s.volume)||0),0);
                      const oldRetour = oldDestRetoursValides.filter(r=>r.id===t.id&&!r.id.startsWith("cuve_")).reduce((sum,r)=>sum+(parseFloat(r.volume)||0),0);
                      const oldRetourRI = oldDestRetoursRIValides.filter(r=>r.id===t.id&&!r.id.startsWith("cuve_")).reduce((sum,r)=>sum+(parseFloat(r.volume)||0),0);
                      delta += oldSrc - oldRetour - oldRetourRI; // restitue ce qui avait ete pris, retire ce qui avait ete redonne
                    }
                    const volSortie = sourcesValides.filter(s=>(s.type==="tonneau"||s.type==="reserve"||s.type==="ri")&&s.id===t.id).reduce((sum,s)=>sum+(parseFloat(s.volume)||0),0);
                    const volRetourReserve = destRetoursValides.filter(r=>r.id===t.id&&!r.id.startsWith("cuve_")).reduce((sum,r)=>sum+(parseFloat(r.volume)||0),0);
                    const volRetourRI = destRetoursRIValides.filter(r=>r.id===t.id&&!r.id.startsWith("cuve_")).reduce((sum,r)=>sum+(parseFloat(r.volume)||0),0);
                    const volRetour = volRetourReserve + volRetourRI;
                    delta += volRetour - volSortie;
                    if(delta!==0) {
                      const newVol = Math.max(0,(t.contenuActuel||0)+delta);
                      let updated = estVide(newVol) ? viderFut(t) : {...t, contenuActuel:newVol, statut:"actif"};
                      // Si le fut recoit effectivement un retour (net positif) et etait vide/sans appellation,
                      // on renseigne l'appellation et la denomination pour qu'il ne semble pas vide.
                      // RI prioritaire si le fut est cible par un retour RI (correlation avec la section RI de l'accueil).
                      if(volRetour>volSortie && !estVide(newVol) && !updated.appellation) {
                        const appellationCible = volRetourRI>0 ? "ri" : "vins_reserve";
                        updated = {...updated, appellation:appellationCible, denomination:assemblageForm.nomCuvee, millesime:assemblageForm.millesime||updated.millesime, certif:isBioAssemblage?"BIO":updated.certif};
                      }
                      saveTonneau(updated);
                      return updated;
                    }
                    return t;
                  });
                  setTonneaux(updFuts);

                  // Cuves : meme principe, annulation ancien + application nouveau en une seule passe
                  const oldVolTotalSources = oldSourcesValides.reduce((s,src)=>s+(parseFloat(src.volume)||0),0);
                  const oldVolTirage = oldA ? (parseFloat(oldA.destTirageVol)||0) : 0;
                  const oldVolRetourTotal = oldDestRetoursValides.reduce((s,r)=>s+(parseFloat(r.volume)||0),0) + oldDestRetoursRIValides.reduce((s,r)=>s+(parseFloat(r.volume)||0),0);
                  const oldVolNetAssemblage = oldA ? (oldVolTotalSources - oldVolTirage - oldVolRetourTotal) : 0;

                  const volTotalSources = assemblageForm.sources.reduce((s,src)=>s+(parseFloat(src.volume)||0),0);
                  const volTirageR = parseFloat(assemblageForm.destTirageVol)||0;
                  const volRetourTotal = destRetoursValides.reduce((s,r)=>s+(parseFloat(r.volume)||0),0) + destRetoursRIValides.reduce((s,r)=>s+(parseFloat(r.volume)||0),0);
                  const volNetAssemblage = volTotalSources - volTirageR - volRetourTotal; // ce qui reste dans la cuve d'assemblage

                  setCuvesCuverie(prev=>{
                    const upd = prev.map(c=>{
                      let delta = 0;
                      if(oldA) {
                        if(oldA.cuveAssemblageId===c.id) delta -= oldVolNetAssemblage;
                        if(oldA.destTirageId===c.id) delta -= oldVolTirage;
                        oldDestRetoursValides.filter(r=>r.id.startsWith("cuve_")&&r.id.replace("cuve_","")===c.id).forEach(r=>{delta -= parseFloat(r.volume)||0;});
                        oldDestRetoursRIValides.filter(r=>r.id.startsWith("cuve_")&&r.id.replace("cuve_","")===c.id).forEach(r=>{delta -= parseFloat(r.volume)||0;});
                        oldSourcesValides.filter(s=>s.type==="cuve"&&s.id===c.id).forEach(s=>{delta += parseFloat(s.volume)||0;});
                      }
                      if(assemblageForm.cuveAssemblageId===c.id) delta += volNetAssemblage;
                      if(assemblageForm.destTirageId===c.id) delta += volTirageR;
                      destRetoursValides.filter(r=>r.id.startsWith("cuve_")&&r.id.replace("cuve_","")===c.id).forEach(r=>{delta += parseFloat(r.volume)||0;});
                      destRetoursRIValides.filter(r=>r.id.startsWith("cuve_")&&r.id.replace("cuve_","")===c.id).forEach(r=>{delta += parseFloat(r.volume)||0;});
                      sourcesValides.filter(s=>s.type==="cuve"&&s.id===c.id).forEach(s=>{delta -= parseFloat(s.volume)||0;});
                      if(delta!==0) {
                        const isRecoitAssemblage = assemblageForm.cuveAssemblageId===c.id&&volNetAssemblage>0;
                        // Sur la cuve d'assemblage : noter ce qui y est stocke temporairement (cuvee + statut BIO)
                        const noteContenu = isRecoitAssemblage
                          ? `${assemblageForm.nomCuvee}${isBioAssemblage?" 🌿 BIO":""} — assemblé le ${fmt(assemblageForm.date)}`
                          : c.notes;
                        const newHL = (parseFloat(c.contenuActuelHL)||0)+(delta/100);
                        const updated = (!isRecoitAssemblage && delta<0)
                          ? majCuveContenu(c, newHL)
                          : {...c, contenuActuelHL:String(newHL), notes:noteContenu, isBio:isRecoitAssemblage?isBioAssemblage:c.isBio};
                        fbSave("cuvesCuverie",c.id,updated);
                        return updated;
                      }
                      return c;
                    });
                    return upd;
                  });
                  setAssemblages(prev=> oldA ? prev.map(x=>x.id===a.id?a:x) : [a,...prev]);
                  saveAssemblage(a);
                  setShowAssemblageForm(false);
                  setEditingAssemblage(null);
                }}>{editingAssemblage?"Enregistrer les modifications":"Enregistrer"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showReserveRIForm&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"360px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>Réserve RI actuelle</div>
              <button style={s.ghost} onClick={()=>setShowReserveRIForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div><span style={s.lbl}>Volume de réserve (kg)</span>
                <input type="number" style={s.inp} placeholder="86110" value={reserveRI.volumeKg} onChange={e=>setReserveRI({volumeKg:e.target.value})}/>
                <div style={{fontSize:"11px",color:"#9a8870",marginTop:"4px"}}>Saisir le volume total de réserve RI disponible en kg</div>
              </div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowReserveRIForm(false)}>Annuler</button>
                <button style={s.btn} onClick={()=>setShowReserveRIForm(false)}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showRendementForm&&(
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"380px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>Rendement autorise</div>
              <button style={s.ghost} onClick={()=>setShowRendementForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Campagne</span>
                  <input type="number" style={s.inp} placeholder="2025" value={rendementForm.annee} onChange={e=>setRendementForm(f=>({...f,annee:e.target.value}))}/></div>
                <div><span style={s.lbl}>Rendement (kg/ha)</span>
                  <input type="number" style={s.inp} placeholder="10000" value={rendementForm.rendementAutorise} onChange={e=>setRendementForm(f=>({...f,rendementAutorise:e.target.value}))}/></div>
                <div><span style={s.lbl}>Surface en production (ha)</span>
                  <input type="number" step="0.0001" style={s.inp} placeholder="ex. 10.1291" value={rendementForm.surface||""} onChange={e=>setRendementForm(f=>({...f,surface:e.target.value}))}/></div>
                <div><span style={s.lbl}>Réserve RI début campagne (kg)</span>
                  <input type="number" style={s.inp} placeholder="ex. 86110" value={rendementForm.reserveRI||""} onChange={e=>setRendementForm(f=>({...f,reserveRI:e.target.value}))}/></div>
              </div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>setShowRendementForm(false)}>Annuler</button>
                <button style={s.btn} onClick={()=>{
                  if(!rendementForm.annee||!rendementForm.rendementAutorise) return alert("Tous les champs sont requis.");
                  const existing = rendementsAnnuels.find(r=>r.annee===rendementForm.annee);
                  if(existing) {
                    const updated = {...existing,...rendementForm,surface:rendementForm.surface||existing.surface,reserveRI:rendementForm.reserveRI||existing.reserveRI};
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#2C3E50"}}>{editingVendange?"Modifier l'entree":"Nouvelle entree de vendange"}</div>
              <button style={s.ghost} onClick={()=>{setShowVendangeForm(false);setEditingVendange(null);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"14px"}}>
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
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
                  <div><span style={s.lbl}>Opérateur *</span>
                    <select style={s.sel} value={vendangeForm.operateur} onChange={e=>setVendangeForm(f=>({...f,operateur:e.target.value}))}>
                      <option value="">Selectionner...</option>
                      {degustateurs.map(d=><option key={d.nom} value={d.nom}>{d.nom}</option>)}
                    </select></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 140px",gap:"12px",marginTop:"10px"}}>
                  <div><span style={s.lbl}>Parcelle(s) *</span>
                    <div style={{border:"0.5px solid #d4c4a0",borderRadius:"6px",padding:"6px",maxHeight:"120px",overflowY:"auto",background:"#fff"}}>
                      {parcelles.length===0&&<div style={{fontSize:"11px",color:"#cc2222"}}>Aucune parcelle.</div>}
                      {parcelles.filter(p=>statutParcelle(p)==="production").map(p=>{
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
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
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
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
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
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                  <span style={s.lbl}>Produits ajoutes</span>
                  <button style={s.btnSm} onClick={()=>setShowProduitVendange(true)}>+ Ajouter</button>
                </div>
                {vendangeForm.produitsAjoutes.length===0&&<div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Aucun produit ajoute.</div>}
                {vendangeForm.produitsAjoutes.map((p,i)=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"5px 0",borderBottom:"0.5px solid #ede5d4",fontSize:"12px"}}>
                    <span style={{fontWeight:500,color:"#2C3E50",flex:1}}>{p.nom}</span>
                    {p.dose&&<span style={{color:"#9a8870"}}>{p.dose}</span>}
                    {p.lot&&<span style={{background:"#F0EDE8",border:"0.5px solid #d4c4a0",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",color:"#2C3E50",fontFamily:"monospace"}}>Lot: {p.lot}</span>}
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
              <div><span style={s.lbl}>Note (ex. parcelle réelle si prestataire, état sanitaire...)</span>
                <textarea style={{...s.inp,height:"64px",resize:"vertical"}} placeholder="ex. Pressurage prestataire M. Dupont - parcelle Les Riceys" value={vendangeForm.observations} onChange={e=>setVendangeForm(f=>({...f,observations:e.target.value}))}/></div>
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"10px"}}>Destination du marc</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                  <div><span style={s.lbl}>Destination</span>
                    <select style={s.sel} value={vendangeForm.destinationMarc||"maison"} onChange={e=>setVendangeForm(f=>({...f,destinationMarc:e.target.value}))}>
                      <option value="maison">Vinification maison</option>
                      <option value="negoce_total">Vente negoce (total)</option>
                      <option value="negoce_partiel">Vente negoce (partiel)</option>
                      <option value="prestation">Prestation de pressurage</option>
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>{editingStockProd?"Modifier le produit":"Nouveau produit"}</div>
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
                <div style={{background:"#E8E0D0",borderRadius:"6px",padding:"10px 14px",fontSize:"12px",color:"#2C3E50"}}>
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>{editingBiody?"Modifier le passage":"Nouveau passage biodynamique"}</div>
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>{editingAmend?"Modifier l'amendement":"Nouvel amendement"}</div>
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#2C3E50"}}>{editingTrait?"Modifier le traitement":"Nouveau traitement"}</div>
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
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"12px",border:"0.5px solid #d4c4a0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                  <span style={s.lbl}>Produits utilises</span>
                  <button style={s.btnSm} onClick={()=>setShowTraitProduit(true)}>+ Ajouter</button>
                </div>
                {traitForm.produits.length===0&&<div style={{fontSize:"12px",color:"#9a8870",fontStyle:"italic"}}>Aucun produit.</div>}
                {traitForm.produits.map((p,i)=>(
                  <div key={p.id||i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"5px 0",borderBottom:"0.5px solid #ede5d4",fontSize:"12px"}}>
                    <span style={{background:p.matiereActive==="Cuivre"?"#E8E0D0":p.matiereActive==="Soufre"?"#e6f0fb":"#ede5d4",color:p.matiereActive==="Cuivre"?"#2C3E50":"#185FA5",borderRadius:"3px",padding:"1px 6px",fontSize:"10px",fontFamily:"monospace"}}>{p.matiereActive||"-"}</span>
                    <span style={{fontWeight:500,color:"#1a1205",flex:1}}>{p.nom}</span>
                    <span style={{color:"#9a8870",fontSize:"11px"}}>{p.dose}</span>
                    {(parseFloat(p.cuivre)||0)>0&&<span style={{color:"#c47800",fontFamily:"monospace",fontSize:"11px",fontWeight:500}}>{p.cuivre}g Cu/ha</span>}
                    <button style={{...s.ghostSm,color:"#cc2222",borderColor:"#f0b4b4",padding:"2px 5px"}}
                      onClick={()=>setTraitForm(f=>({...f,produits:f.produits.filter((_,j)=>j!==i)}))}>x</button>
                  </div>
                ))}
                {/* Total cuivre calcule */}
                {traitForm.produits.some(p=>(parseFloat(p.cuivre)||0)>0)&&(
                  <div style={{marginTop:"8px",padding:"8px 10px",background:"#E8E0D0",borderRadius:"5px",display:"flex",gap:"16px",flexWrap:"wrap",fontSize:"12px"}}>
                    <span style={{color:"#2C3E50",fontWeight:500}}>Total cuivre :</span>
                    <span style={{color:"#c47800",fontFamily:"monospace",fontWeight:500}}>
                      {traitForm.produits.reduce((s,p)=>s+(parseFloat(p.cuivre)||0),0)} g/ha
                    </span>
                    {traitForm.surface&&(
                      <span style={{color:"#2C3E50",fontFamily:"monospace"}}>
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
                          <button key={i} style={{background:"#F0EDE8",border:"0.5px solid #d4c4a0",borderRadius:"4px",padding:"4px 8px",fontSize:"10px",cursor:"pointer",color:"#2C3E50",fontFamily:"monospace"}}
                            onClick={()=>setTraitProduit(f=>({...f,
                              nom:sp.nom,
                              matiereActive:sp.substanceActive||sp.matiereActive||"Cuivre",
                              teneurCuivre:String(parseFloat(sp.teneurCuivre)||0),
                              unite:sp.unite||"kg",
                              cuivre:"",  // sera calcule depuis dose*teneur
                            }))}>
                            <span style={{background:(sp.substanceActive||sp.matiereActive)==="Cuivre"?"#E8E0D0":"#e6f0fb",color:(sp.substanceActive||sp.matiereActive)==="Cuivre"?"#2C3E50":"#185FA5",borderRadius:"2px",padding:"0 3px",fontSize:"9px",marginRight:"3px"}}>{sp.substanceActive||sp.matiereActive}</span>
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
                        <input type="number" step="1" style={{...s.inp,background:parseFloat(traitProduit.teneurCuivre)>0?"#F0EDE8":"white"}}
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#2C3E50"}}>{editingDegorge?"Modifier le mouvement":"Nouveau mouvement de lot"}</div>
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
                <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>Sortie de stock / Vente</div>
                <button style={s.ghost} onClick={()=>setShowSortieForm(false)}>x</button>
              </div>
              <div style={{...s.card,marginBottom:"16px",padding:"12px",background:"#F0EDE8"}}>
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>Achat coiffes</div>
              <button style={s.ghost} onClick={()=>setShowCoiffesForm(false)}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Type</span>
                  <select style={s.sel} value={coiffesForm.type} onChange={e=>setCoiffesForm(f=>({...f,type:e.target.value}))}>
                    <option value="CRD">CRD 75cl</option>
                    <option value="CRD Magnum">CRD Magnum</option>
                    <option value="CRD Jeroboam">CRD Jeroboam</option>
                    <option value="Export">Export 75cl / Magnum</option>
                    <option value="Export Jeroboam">Export Jeroboam</option>
                    <option value="Vignette CRD Coteaux">Vignette CRD Coteaux</option>
                    <option value="Neutre 50cl">Neutre 50cl (Ratafia)</option>
                    <option value="Neutre 3L">Neutre 3L (Ratafia)</option>
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

      {/* == MODAL MODIFIER LOT == */}
      {editingLot && lotEditForm && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"480px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>Modifier le lot</div>
              <button style={s.ghost} onClick={()=>{setEditingLot(null);setLotEditForm(null);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Cuvée *</span>
                  <input style={s.inp} value={lotEditForm.cuvee} onChange={e=>setLotEditForm(f=>({...f,cuvee:e.target.value}))}/></div>
                <div><span style={s.lbl}>Millésime</span>
                  <input style={s.inp} value={lotEditForm.millesime} onChange={e=>setLotEditForm(f=>({...f,millesime:e.target.value}))}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>N° de lot</span>
                  <input style={s.inp} value={lotEditForm.lot} onChange={e=>setLotEditForm(f=>({...f,lot:e.target.value}))}/></div>
                <div><span style={s.lbl}>Date de tirage</span>
                  <input type="date" style={s.inp} value={lotEditForm.dateTirage} onChange={e=>setLotEditForm(f=>({...f,dateTirage:e.target.value}))}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Statut</span>
                  <select style={s.sel} value={lotEditForm.statut} onChange={e=>setLotEditForm(f=>({...f,statut:e.target.value}))}>
                    {[...TOUS_STATUTS_POSSIBLES,"Passage 15 mois (commercialisable)"].map(st=><option key={st} value={st}>{st}</option>)}
                  </select></div>
                <div><span style={s.lbl}>Lieu</span>
                  <select style={s.sel} value={lotEditForm.lieu} onChange={e=>setLotEditForm(f=>({...f,lieu:e.target.value}))}>
                    {LIEUX_STOCK.map(l=><option key={l} value={l}>{l}</option>)}
                  </select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><span style={s.lbl}>Quantité actuelle *</span>
                  <input type="number" style={s.inp} value={lotEditForm.qteActuelle} onChange={e=>setLotEditForm(f=>({...f,qteActuelle:e.target.value}))}/></div>
                <div><span style={s.lbl}>Format</span>
                  <div style={{...s.inp,background:"#F0EDE8",color:"#9a8870"}}>{lotEditForm.format} (non modifiable)</div></div>
              </div>
              {editingLot.linkedLotId && stockBouteilles.find(x=>x.id===editingLot.linkedLotId) && (()=>{
                const linked = stockBouteilles.find(x=>x.id===editingLot.linkedLotId);
                return (
                  <div style={{fontSize:"11px",color:"#185FA5",background:"#e8f0fa",border:"0.5px solid #b4d0f0",borderRadius:"4px",padding:"6px 10px"}}>
                    Ce lot est lié au lot "{linked.statut}" ({linked.qteActuelle} btl). Si tu changes la quantité, l'autre lot sera automatiquement ajusté pour garder le total constant.
                  </div>
                );
              })()}
              <div><span style={s.lbl}>Notes</span>
                <input style={s.inp} value={lotEditForm.notes} onChange={e=>setLotEditForm(f=>({...f,notes:e.target.value}))}/></div>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                <button style={s.ghost} onClick={()=>{setEditingLot(null);setLotEditForm(null);}}>Annuler</button>
                <button style={s.btn} onClick={saveEditLot}>Enregistrer</button>
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"17px",color:"#2C3E50"}}>
                {lotAction.action==="diviser"?"Diviser le lot":"Mouvement de lot"}
              </div>
              <button style={s.ghost} onClick={()=>{setLotAction(null);setDivPreview(null);}}>x</button>
            </div>
            <div style={{...s.card,marginBottom:"16px",padding:"12px",background:"#F0EDE8"}}>
              <div style={{fontWeight:500,color:"#1a1205"}}>{lotAction.lot.cuvee} {lotAction.lot.millesime}</div>
              <div style={{fontSize:"12px",color:"#9a8870"}}>{lotAction.lot.format} - {lotAction.lot.qteActuelle} btl - {lotAction.lot.lieu} - {lotAction.lot.statut}</div>
            </div>
            {lotAction.action==="mouvement"&&(
              <div style={{display:"grid",gap:"12px"}}>
                <div style={{fontSize:"12px",color:"#185FA5",background:"#e8f0fa",border:"0.5px solid #b4d0f0",borderRadius:"4px",padding:"6px 10px"}}>
                  Le mouvement sert à faire évoluer le lot avant habillage (Sur latte → Dégorgement → Dégorgé) et/ou à changer son lieu de stockage. Pour passer en Habillé CRD/Export, utilise "Diviser".
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                  <div><span style={s.lbl}>Nouveau statut</span>
                    <select style={s.sel} id="mvt_statut" defaultValue={getStatutsMouvement(lotAction.lot.typeProduit).includes(lotAction.lot.statut)?lotAction.lot.statut:getStatutsMouvement(lotAction.lot.typeProduit)[0]}>
                      {getStatutsMouvement(lotAction.lot.typeProduit).map(st=><option key={st} value={st}>{st}</option>)}
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
                    if(qte < lotAction.lot.qteActuelle) {
                      const newLotId = "lot_"+Date.now();
                      const newLot = {...lotAction.lot, id:newLotId, qteInitiale:qte, qteActuelle:qte, statut:newStatut, lieu:newLieu, dateMvt:date, notes, linkedLotId:lotAction.lot.id};
                      const updatedLot = {...lotAction.lot, qteActuelle:qteRestante, linkedLotId:newLotId};
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
            {lotAction.action==="diviser"&&!divPreview&&(
              <div style={{display:"grid",gap:"12px"}}>
                <div style={{fontSize:"12px",color:"#185FA5",background:"#e8f0fa",border:"0.5px solid #b4d0f0",borderRadius:"4px",padding:"6px 10px"}}>
                  Diviser sert à passer une partie du lot en habillage, avec déduction automatique des coiffes si le type d'habillage en nécessite. Le lieu reste celui du lot d'origine — utilise "Mouvement" pour le changer.
                </div>
                {lotAction.lot.statut!==getPreHabillageStatut(lotAction.lot.typeProduit)&&(
                  <div style={{fontSize:"12px",color:"#c47800",background:"#fff6e0",border:"0.5px solid #e8c888",borderRadius:"4px",padding:"6px 10px"}}>
                    Ce lot n'est pas au statut "{getPreHabillageStatut(lotAction.lot.typeProduit)}" (statut actuel : {lotAction.lot.statut}). Passe-le d'abord via "Mouvement".
                  </div>
                )}
                <div><span style={s.lbl}>Quantite a separer</span>
                  <input type="number" style={s.inp} id="div_qte" placeholder="ex. 300" max={lotAction.lot.qteActuelle-1}/>
                </div>
                <div><span style={s.lbl}>Statut du nouveau lot</span>
                  <select style={s.sel} id="div_statut" defaultValue={getStatutsHabillage(lotAction.lot.typeProduit,lotAction.lot.format)[0]}>
                    {getStatutsHabillage(lotAction.lot.typeProduit,lotAction.lot.format).map(st=><option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                  <button style={s.ghost} onClick={()=>setLotAction(null)}>Annuler</button>
                  <button style={s.btn} disabled={lotAction.lot.statut!==getPreHabillageStatut(lotAction.lot.typeProduit)} onClick={()=>{
                    if(lotAction.lot.statut!==getPreHabillageStatut(lotAction.lot.typeProduit)) return alert(`Ce lot doit d'abord etre au statut "${getPreHabillageStatut(lotAction.lot.typeProduit)}" (via Mouvement) avant de pouvoir etre habille.`);
                    const qte = parseInt(document.getElementById("div_qte").value)||0;
                    const statut = document.getElementById("div_statut").value;
                    if(qte<=0||qte>=lotAction.lot.qteActuelle) return alert("Quantite invalide - doit etre entre 1 et "+(lotAction.lot.qteActuelle-1));
                    const typeCoiffe = getTypeCoiffeHabillage(lotAction.lot.typeProduit, statut, lotAction.lot.format);
                    const calcStockPreview = (type) => coiffesStock.filter(c=>c.type===type||(type==="Export"&&c.type==="Export Magnum")).reduce((s,c)=>s+(c.operation==="achat"?parseInt(c.qte)||0:-(parseInt(c.qte)||0)),0);
                    const stockDispo = typeCoiffe ? calcStockPreview(typeCoiffe) : null;
                    setDivPreview({qte, statut, typeCoiffe, stockDispo});
                  }}>Continuer</button>
                </div>
              </div>
            )}

            {lotAction.action==="diviser"&&divPreview&&(()=>{
              const stockApres = divPreview.stockDispo!=null ? divPreview.stockDispo-divPreview.qte : null;
              const stockInsuffisant = stockApres!=null && stockApres<0;
              return (
                <div style={{display:"grid",gap:"12px"}}>
                  <div style={{fontFamily:"Georgia,serif",fontSize:"15px",color:"#2C3E50"}}>Récapitulatif</div>
                  <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",display:"grid",gap:"8px",fontSize:"13px"}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:"#7a6840"}}>Fût source</span>
                      <span style={{fontWeight:500,color:"#2C3E50"}}>{lotAction.lot.cuvee} — {lotAction.lot.format}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:"#7a6840"}}>Quantité séparée</span>
                      <span style={{fontWeight:600,color:"#8B7355",fontFamily:"monospace"}}>{divPreview.qte} btl</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:"#7a6840"}}>Reste sur le lot d'origine</span>
                      <span style={{fontFamily:"monospace"}}>{lotAction.lot.qteActuelle-divPreview.qte} btl</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:"#7a6840"}}>Nouveau statut</span>
                      <span style={{fontWeight:600,color:"#2C3E50"}}>{divPreview.statut}</span>
                    </div>
                    {divPreview.typeCoiffe ? (
                      <div style={{borderTop:"0.5px solid #d4c4a0",paddingTop:"8px",marginTop:"2px"}}>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{color:"#7a6840"}}>Coiffe déduite</span>
                          <span style={{fontWeight:500,color:"#2C3E50"}}>{divPreview.typeCoiffe} (-{divPreview.qte})</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{color:"#7a6840"}}>Stock coiffes {divPreview.typeCoiffe}</span>
                          <span style={{fontFamily:"monospace",color:stockInsuffisant?"#cc2222":"#2C3E50"}}>{divPreview.stockDispo} → {stockApres}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{borderTop:"0.5px solid #d4c4a0",paddingTop:"8px",marginTop:"2px",color:"#9a8870",fontStyle:"italic"}}>Habillage neutre — aucune coiffe à déduire.</div>
                    )}
                  </div>
                  {stockInsuffisant && (
                    <div style={{fontSize:"12px",color:"#cc2222",background:"#fde8e8",border:"0.5px solid #f0b4b4",borderRadius:"4px",padding:"6px 10px"}}>
                      Attention : le stock de coiffes {divPreview.typeCoiffe} passerait en négatif ({stockApres}). Vérifie ton stock avant de confirmer.
                    </div>
                  )}
                  <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:"0.5px solid #d4c4a0",paddingTop:"14px"}}>
                    <button style={s.ghost} onClick={()=>setDivPreview(null)}>Modifier</button>
                    <button style={s.btn} onClick={()=>{
                      const {qte, statut, typeCoiffe} = divPreview;
                      const lieu = lotAction.lot.lieu;
                      let divisionCoiffeId = null;
                      if(typeCoiffe) {
                        const deduction = {id:"coiffe_"+Date.now(),type:typeCoiffe,operation:"utilisation",qte:String(qte),date:new Date().toISOString().slice(0,10),notes:"Division - Habillage "+lotAction.lot.cuvee,timestamp:new Date().toISOString()};
                        divisionCoiffeId = deduction.id;
                        setCoiffesStock(prev=>[deduction,...prev]);
                        fbSave("coiffes",deduction.id,deduction);
                      }
                      const newLotId = "lot_"+Date.now();
                      const newLot = {...lotAction.lot, id:newLotId, qteInitiale:qte, qteActuelle:qte, statut, lieu, linkedLotId:lotAction.lot.id, divisionCoiffeId};
                      const updatedLot = {...lotAction.lot, qteActuelle:lotAction.lot.qteActuelle-qte, linkedLotId:newLotId};
                      setStockBouteilles(prev=>[newLot,...prev.map(x=>x.id===lotAction.lot.id?updatedLot:x)]);
                      fbSave("stockBouteilles", newLot.id, newLot);
                      fbSave("stockBouteilles", updatedLot.id, updatedLot);
                      setLotAction(null); setDivPreview(null);
                    }}>Confirmer la division</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* == MODAL CLOTURE MENSUELLE == */}
      {showCloture && (
        <div style={s.modal}>
          <div style={{...s.modalBox,width:"660px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#2C3E50"}}>Cloture mensuelle</div>
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
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
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
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
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
              <div style={{fontFamily:"Georgia,serif",fontSize:"18px",color:"#2C3E50"}}>{editingTirage ? `Modifier tirage - ${editingTirage.cuvee}` : "Nouveau tirage"}</div>
              <button style={s.ghost} onClick={()=>{setShowTirageForm(false);setEditingTirage(null);setTirageForm(TIRAGE_EMPTY);}}>x</button>
            </div>
            <div style={{display:"grid",gap:"16px"}}>
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
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
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"10px",fontSize:"11px"}}>Assemblage - Volume vin (depuis la cuverie)</div>
                {editingTirage&&<div style={{fontSize:"11px",color:"#c47800",background:"#E8E0D0",border:"0.5px solid #e8c888",borderRadius:"4px",padding:"6px 10px",marginBottom:"10px"}}>En mode modification, le volume de la cuve source n'est pas recalcule automatiquement.</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 140px",gap:"12px"}}>
                  <div>
                    <span style={s.lbl}>Cuve source (cuverie)</span>
                    <select style={s.sel} value={tirageForm.cuveSourceId} onChange={e=>setTirageForm(f=>({...f,cuveSourceId:e.target.value}))}>
                      <option value="">-- Aucune --</option>
                      {cuvesCuverie.filter(c=>c.type!=="bourbes"&&(parseFloat(c.contenuActuelHL)||0)>0).map(c=>(
                        <option key={c.id} value={c.id}>{c.nom}{c.notes?" — "+c.notes:""} (dispo: {((parseFloat(c.contenuActuelHL)||0)*100).toLocaleString()} L)</option>
                      ))}
                    </select>
                    {tirageForm.cuveSourceId && cuvesCuverie.find(c=>c.id===tirageForm.cuveSourceId)?.notes && (
                      <div style={{fontSize:"11px",color:"#533AB7",marginTop:"4px",fontStyle:"italic"}}>
                        Contenu : {cuvesCuverie.find(c=>c.id===tirageForm.cuveSourceId).notes}
                      </div>
                    )}
                  </div>
                  <div>
                    <span style={s.lbl}>Volume vin (L)</span>
                    <input type="number" style={{...s.inp,fontSize:"18px",fontWeight:500,color:"#533AB7",textAlign:"center",padding:"12px"}} placeholder="0"
                      value={tirageForm.volumeTotal} onChange={e=>setTirageForm(f=>({...f,volumeTotal:e.target.value}))}/></div>
                </div>
              </div>
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
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
                <div style={{...s.lbl,marginBottom:"8px",fontSize:"11px",color:"#2C3E50"}}>Volume total assemble</div>
                <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                  <div style={{fontSize:"28px",fontWeight:500,color:"#2C3E50"}}>{calcTotalAssemble(tirageForm).toFixed(1)} L</div>
                  <div style={{fontSize:"12px",color:"#9a8870"}}>= {tirageForm.volumeTotal||0} L vin + {calcVolLevain(tirageForm).toFixed(1)} L levain</div>
                </div>
              </div>
              <div style={{background:"#F0EDE8",borderRadius:"8px",padding:"14px",border:"0.5px solid #d4c4a0"}}>
                <div style={{...s.lbl,marginBottom:"10px",fontSize:"11px"}}>Mise en bouteilles - 1 numero de lot par format</div>
                <div style={{display:"grid",gap:"10px"}}>
                  {[[tirageForm.typeProduit==="ratafia"?"Bouteilles 50cl":"Bouteilles 75cl","qte75","lot75","#2d6a00",tirageForm.typeProduit==="ratafia"?0.5:0.75],["Magnums 1.5L","qteMagnum","lotMagnum","#8b5e0a",1.5],["Jeroboams 3L","qteJeroboam","lotJeroboam","#8B0000",3.0]].map(([lbl,qk,lk,col,vol])=>(
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
