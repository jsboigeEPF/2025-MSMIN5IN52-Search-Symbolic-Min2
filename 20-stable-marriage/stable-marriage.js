/*
 * Stable Marriage Problem - Implémentation avec Gale-Shapley et CSP
 * Inclut une animation step-by-step pour visualiser l'algorithme
 * Comparaison des performances entre les deux approches
 */

// État global de l'application - centralisation de toutes les données
let state = {
    n: 4,
    variant: 'standard',
    menPrefs: [],
    womenPrefs: [],
    gsResult: null,
    cspResult: null,
    gsSteps: [],
    currentStep: 0,
    isAnimating: false
};

// Initialisation - Configuration des event listeners après chargement du DOM
// Nécessaire pour s'assurer que tous les éléments HTML sont disponibles
document.addEventListener('DOMContentLoaded', () => {
    generatePreferences();
    
    document.getElementById('n-input').addEventListener('change', (e) => {
        state.n = parseInt(e.target.value);
        generatePreferences();
    });
    
    document.getElementById('variant-select').addEventListener('change', (e) => {
        state.variant = e.target.value;
        generatePreferences();
        updateVariantInfo();
    });
});

function generatePreferences() { 
    // Génération aléatoire des préférences
    // Gère les différentes variantes : standard, listes incomplètes, capacités multiples
    // Réinitialisation complète à chaque appel pour éviter les résidus
    const n = state.n;
    state.menPrefs = [];  // tableau des préférences masculines
    state.womenPrefs = []; // tableau des préférences féminines
    
    for (let i = 0; i < n; i++) {
        let menPref = Array.from({length: n}, (_, j) => j);
        let womenPref = Array.from({length: n}, (_, j) => j);
        
        // Mélange des préférences - algorithme Fisher-Yates shuffle
        // Garantit une distribution uniforme des permutations possibles
        // Complexité O(n) et génération équiprobable de tous les ordres
        for (let j = n - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            // Utilisation du destructuring ES6 pour l'échange de valeurs
            [menPref[j], menPref[k]] = [menPref[k], menPref[j]];
            [womenPref[j], womenPref[k]] = [womenPref[k], womenPref[j]];
        }
        
        // Variante : listes incomplètes
        // Modélise le cas réaliste où certaines personnes sont jugées inacceptables
        // Plus proche des situations réelles que les listes complètes
        if (state.variant === 'incomplete') {
            // Conservation aléatoire de 60% à 100% des préférences originales
            const menCutoff = Math.floor(n * (0.6 + Math.random() * 0.4));
            const womenCutoff = Math.floor(n * (0.6 + Math.random() * 0.4));
            menPref = menPref.slice(0, menCutoff);
            womenPref = womenPref.slice(0, womenCutoff);
        }
        
        state.menPrefs.push(menPref);
        state.womenPrefs.push(womenPref);
    }
    
    displayPreferences();
    resetResults();
}

// Rendu des préférences dans l'interface utilisateur
// Affichage formaté des listes de préférences pour hommes et femmes
function displayPreferences() {
    const menContainer = document.getElementById('men-prefs');
    const womenContainer = document.getElementById('women-prefs');
    // Utilisation de map/join pour un code plus fonctionnel et lisible
    
    menContainer.innerHTML = state.menPrefs.map((prefs, i) => 
        `<div class="text-sm"><span class="font-medium">H${i}:</span> ${prefs.map(w => `F${w}`).join(' > ')}</div>`
    ).join('');
    
    womenContainer.innerHTML = state.womenPrefs.map((prefs, i) => 
        `<div class="text-sm"><span class="font-medium">F${i}:</span> ${prefs.map(m => `H${m}`).join(' > ')}</div>`
    ).join('');
}

// Mise à jour de l'info variante
function updateVariantInfo() {
    const info = document.getElementById('variant-info');
    if (state.variant === 'incomplete') {
        info.className = 'bg-yellow-50 border border-yellow-200 p-3 rounded text-sm mt-4';
        info.innerHTML = '<strong>Listes incomplètes:</strong> Certaines personnes jugent d\'autres inacceptables';
    } else if (state.variant === 'capacity') {
        info.className = 'bg-blue-50 border border-blue-200 p-3 rounded text-sm mt-4';
        info.innerHTML = '<strong>Capacités multiples:</strong> Version Hospital-Resident (structure de base)';
    } else {
        info.className = 'hidden';
    }
}

// Gestion des onglets de l'interface
// Système simple mais efficace avec manipulation directe des classes CSS
function switchTab(tab) {
    // Masquage de tous les contenus puis affichage sélectif
    ['setup', 'gale-shapley', 'csp', 'compare'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.remove('tab-active');
        document.getElementById(`tab-${t}`).classList.add('text-gray-600');
        document.getElementById(`content-${t}`).classList.add('hidden');
    });
    
    document.getElementById(`tab-${tab}`).classList.add('tab-active');
    document.getElementById(`tab-${tab}`).classList.remove('text-gray-600');
    document.getElementById(`content-${tab}`).classList.remove('hidden');
}

// Algorithme de Gale-Shapley - implémentation avec traçage des étapes
// Garantit un matching stable avec optimalité pour le groupe proposant
// Enregistrement de chaque étape pour permettre l'animation interactive
function runGaleShapley() {
    const n = state.n;
    const steps = []; // historique complet pour la visualisation step-by-step
    const menPartner = new Array(n).fill(-1);  // -1 = pas encore apparié
    const womenPartner = new Array(n).fill(-1); // pareil
    const menNextProposal = new Array(n).fill(0); // index dans la liste de préfs
    
    // Pré-calcul des classements féminins - optimisation critique
    // Évite les recherches linéaires répétées (indexOf) dans la boucle principale
    // Améliore la complexité de O(n³) à O(n²) pour l'algorithme complet
    const womenRanking = state.womenPrefs.map(prefs => {
        const ranking = {}; // mapping homme -> rang dans les préférences
        prefs.forEach((man, rank) => {
            ranking[man] = rank; // rang 0 = préférence maximale
        });
        return ranking;
    });

    steps.push({
        type: 'init',
        message: 'Initialisation : tous les hommes sont libres',
        menPartner: [...menPartner],
        womenPartner: [...womenPartner],
        freeMen: Array.from({length: n}, (_, i) => i)
    });

    const freeMen = Array.from({length: n}, (_, i) => i); // initialisation : tous les hommes libres
    let iterCount = 0; // compteur de sécurité pour éviter les boucles infinies
    
    // Boucle principale de l'algorithme - continue tant qu'il reste des hommes libres
    // Protection contre les cas pathologiques avec limite d'itérations
    while (freeMen.length > 0 && iterCount < n * n) {
        const man = freeMen.shift();
        
        if (menNextProposal[man] >= state.menPrefs[man].length) {
            steps.push({
                type: 'exhausted',
                message: `H${man} a épuisé sa liste de préférences`,
                man,
                menPartner: [...menPartner],
                womenPartner: [...womenPartner]
            });
            continue;
        }
        
        const woman = state.menPrefs[man][menNextProposal[man]];
        menNextProposal[man]++;
        
        // Gestion du cas des listes incomplètes : rejet d'inacceptabilité
        if (!(man in womenRanking[woman])) {
            // Enregistrement de l'étape pour la visualisation
            steps.push({
                type: 'rejected_unacceptable',
                message: `H${man} propose à F${woman}, mais n'est pas dans sa liste`,
                // Rejet immédiat sans comparaison de préférences
                man,
                woman,
                menPartner: [...menPartner],
                womenPartner: [...womenPartner]
            });
            freeMen.push(man);
            continue;
        }

        if (womenPartner[woman] === -1) {
            womenPartner[woman] = man;
            menPartner[man] = woman;
            
            steps.push({
                type: 'accept',
                message: `H${man} propose à F${woman} → Accepté (F${woman} était libre)`,
                man,
                woman,
                menPartner: [...menPartner],
                womenPartner: [...womenPartner],
                freeMen: [...freeMen]
            });
        } else {
            const currentPartner = womenPartner[woman];
            
            if (womenRanking[woman][man] < womenRanking[woman][currentPartner]) {
                womenPartner[woman] = man;
                menPartner[man] = woman;
                menPartner[currentPartner] = -1;
                freeMen.push(currentPartner);
                
                steps.push({
                    type: 'replace',
                    message: `H${man} propose à F${woman} → F${woman} remplace H${currentPartner} par H${man}`,
                    man,
                    woman,
                    rejected: currentPartner,
                    menPartner: [...menPartner],
                    womenPartner: [...womenPartner],
                    freeMen: [...freeMen]
                });
            } else {
                freeMen.push(man);
                
                steps.push({
                    type: 'reject',
                    message: `H${man} propose à F${woman} → Rejeté (F${woman} préfère H${currentPartner})`,
                    man,
                    woman,
                    currentPartner,
                    menPartner: [...menPartner],
                    womenPartner: [...womenPartner],
                    freeMen: [...freeMen]
                });
            }
        }
        
        iterCount++;
    }

    steps.push({
        type: 'complete',
        message: 'Algorithme terminé - Matching stable trouvé',
        menPartner: [...menPartner],
        womenPartner: [...womenPartner]
    });

    state.gsSteps = steps;
    state.gsResult = { menPartner, womenPartner, steps: iterCount };
    state.currentStep = 0;
    
    displayGSAnimation();
    displayGSResult();
    updateComparison();
}

// Système d'animation pour visualiser l'exécution de Gale-Shapley
// Interface interactive permettant navigation manuelle et automatique
// Codage couleur pour différencier les types d'étapes algorithme
function displayGSAnimation() {
    const container = document.getElementById('gs-animation');
    container.classList.remove('hidden'); // activation du conteneur d'animation
    
    const step = state.gsSteps[state.currentStep];
    // Système de codage couleur pour améliorer la lisibilité
    // Vert : acceptation/succès, Rouge : rejet, Jaune : remplacement, Gris : neutre
    const stepColor = 
        step.type === 'accept' || step.type === 'complete' ? 'green' :
        step.type === 'reject' || step.type === 'rejected_unacceptable' ? 'red' :
        step.type === 'replace' ? 'yellow' : 'gray';
    
    container.innerHTML = `
        <div class="bg-white border-2 border-purple-200 rounded-lg p-4 step-card">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold">Animation Gale-Shapley</h3>
                <div class="flex gap-2">
                    <button onclick="prevStep()" ${state.currentStep === 0 ? 'disabled' : ''} 
                            class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">←</button>
                    <span class="px-3 py-1 bg-gray-100 rounded">${state.currentStep + 1} / ${state.gsSteps.length}</span>
                    <button onclick="nextStep()" ${state.currentStep === state.gsSteps.length - 1 ? 'disabled' : ''} 
                            class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">→</button>
                    <button onclick="animateAuto()" class="px-3 py-1 bg-purple-600 text-white rounded">▶ Auto</button>
                </div>
            </div>

            <div class="p-3 rounded mb-3 bg-${stepColor}-50 border border-${stepColor}-200">
                <p class="text-sm font-medium">${step.message}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="text-sm font-semibold mb-2">Appariements Hommes</h4>
                    ${step.menPartner.map((woman, man) => `
                        <div class="text-sm flex items-center gap-2 matching-item p-1 rounded ${step.man === man ? 'font-bold text-purple-600 bg-purple-50' : ''}">
                            <span>H${man}</span> → <span>${woman !== -1 ? `F${woman}` : '—'}</span>
                        </div>
                    `).join('')}
                </div>

                <div>
                    <h4 class="text-sm font-semibold mb-2">Appariements Femmes</h4>
                    ${step.womenPartner.map((man, woman) => `
                        <div class="text-sm flex items-center gap-2 matching-item p-1 rounded ${step.woman === woman ? 'font-bold text-pink-600 bg-pink-50' : ''}">
                            <span>F${woman}</span> → <span>${man !== -1 ? `H${man}` : '—'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            ${step.freeMen && step.freeMen.length > 0 ? `
                <div class="mt-3 pt-3 border-t">
                    <p class="text-sm"><span class="font-semibold">Hommes libres:</span> ${step.freeMen.map(m => `H${m}`).join(', ')}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function prevStep() {
    if (state.currentStep > 0) {
        state.currentStep--;
        displayGSAnimation();
    }
}

function nextStep() {
    if (state.currentStep < state.gsSteps.length - 1) {
        state.currentStep++;
        displayGSAnimation();
    }
}

function animateAuto() {
    // Protection contre les appels multiples simultanés
    if (state.isAnimating) return;
    state.isAnimating = true;
    state.currentStep = 0; // réinitialisation pour démarrer depuis le début
    
    const interval = setInterval(() => {
        if (state.currentStep >= state.gsSteps.length - 1) {
            clearInterval(interval);
            state.isAnimating = false;
            return;
        }
        state.currentStep++;
        displayGSAnimation();
    }, 1000);
}

// Affichage résultat GS
function displayGSResult() {
    const container = document.getElementById('gs-result');
    container.classList.remove('hidden');
    
    const blockingPairs = checkStability(state.gsResult.menPartner, state.gsResult.womenPartner);
    const isStable = blockingPairs.length === 0;
    
    container.innerHTML = renderMatching(state.gsResult, 'Résultat Gale-Shapley', 'green', isStable, blockingPairs);
}

// Vérification de stabilité du matching - concept fondamental
// Une paire bloquante existe si deux personnes préfèrent mutuellement
// être appariées ensemble plutôt qu'avec leurs partenaires actuels
function checkStability(menPartner, womenPartner) {
    const blockingPairs = []; // collection de toutes les instabilités détectées
    
    for (let man = 0; man < state.n; man++) {
        const woman = menPartner[man];
        if (woman === -1) continue;
        
        const womanRank = state.menPrefs[man].indexOf(woman);
        
        for (let i = 0; i < womanRank; i++) {
            const preferredWoman = state.menPrefs[man][i];
            const currentPartner = womenPartner[preferredWoman];
            
            if (currentPartner === -1) continue;
            
            const currentRank = state.womenPrefs[preferredWoman].indexOf(currentPartner);
            const manRank = state.womenPrefs[preferredWoman].indexOf(man);
            
            if (manRank !== -1 && manRank < currentRank) {
                blockingPairs.push({ man, woman: preferredWoman });
            }
        }
    }
    
    return blockingPairs;
}

// Résolution par Constraint Satisfaction Problem (CSP)
// Approche plus générale utilisant arc-consistance et backtracking
// Permet la comparaison des performances avec l'algorithme dédié
function runCSP() {
    const startTime = performance.now(); // mesure du temps d'exécution
    const n = state.n;
    
    // Initialiser domaines
    const domains = {};
    for (let man = 0; man < n; man++) {
        domains[man] = [...state.menPrefs[man]];
    }

    // Phase d'arc-consistance - élimination des valeurs incompatibles
    // Réduit l'espace de recherche en supprimant les assignations impossibles
    // Préprocessing utile pour optimiser la phase de backtracking
    let changed = true;
    while (changed) {
        changed = false; // itération jusqu'à point fixe
        
        for (let man = 0; man < n; man++) {
            const toRemove = [];
            
            for (const woman of domains[man]) {
                if (!state.womenPrefs[woman].includes(man)) {
                    toRemove.push(woman);
                }
            }
            
            if (toRemove.length > 0) {
                domains[man] = domains[man].filter(w => !toRemove.includes(w));
                changed = true;
            }
        }
    }

    // Phase de backtracking - recherche exhaustive avec retour arrière
    // Exploration systématique de l'espace des solutions avec élagage
    const assignment = new Array(n).fill(-1);      // mapping hommes -> femmes
    const womenAssignment = new Array(n).fill(-1); // mapping inverse pour efficacité
    let backtracks = 0; // métrique de performance algorithmique

    const isConsistent = (man, woman) => {
        // Vérification de disponibilité - contrainte d'unicité
        if (womenAssignment[woman] !== -1) return false;
        
        // Vérification de stabilité - absence de paires bloquantes
        
        for (let m = 0; m < man; m++) {
            const w = assignment[m];
            if (w === -1) continue;
            
            const mPrefWoman = state.menPrefs[m].indexOf(woman);
            const mPrefW = state.menPrefs[m].indexOf(w);
            if (mPrefWoman !== -1 && mPrefWoman < mPrefW) {
                const womanPrefM = state.womenPrefs[woman].indexOf(m);
                const womanPrefMan = state.womenPrefs[woman].indexOf(man);
                if (womanPrefM !== -1 && womanPrefM < womanPrefMan) {
                    return false;
                }
            }
            
            const manPrefW = state.menPrefs[man].indexOf(w);
            const manPrefWoman = state.menPrefs[man].indexOf(woman);
            if (manPrefW !== -1 && manPrefW < manPrefWoman) {
                const wPrefMan = state.womenPrefs[w].indexOf(man);
                const wPrefM = state.womenPrefs[w].indexOf(m);
                if (wPrefMan !== -1 && wPrefMan < wPrefM) {
                    return false;
                }
            }
        }
        
        return true;
    };

    const backtrack = (man) => {
        if (man === n) return true;

        for (const woman of domains[man]) {
            if (isConsistent(man, woman)) {
                assignment[man] = woman;
                womenAssignment[woman] = man;
                
                if (backtrack(man + 1)) return true;
                
                assignment[man] = -1;
                womenAssignment[woman] = -1;
                backtracks++;
            }
        }
        
        return false;
    };

    const found = backtrack(0);
    const endTime = performance.now();

    if (found) {
        state.cspResult = {
            menPartner: assignment,
            womenPartner: womenAssignment,
            backtracks,
            time: (endTime - startTime).toFixed(2),
            domainsAfterAC: Object.values(domains).map(d => d.length)
        };
        displayCSPResult();
        updateComparison();
    } else {
        state.cspResult = { error: 'Aucune solution trouvée' };
        document.getElementById('csp-result').innerHTML = `
            <div class="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p class="text-red-600">Aucune solution stable trouvée</p>
            </div>
        `;
        document.getElementById('csp-result').classList.remove('hidden');
    }
}

// Affichage résultat CSP
function displayCSPResult() {
    const container = document.getElementById('csp-result');
    container.classList.remove('hidden');
    
    const blockingPairs = checkStability(state.cspResult.menPartner, state.cspResult.womenPartner);
    const isStable = blockingPairs.length === 0;
    
    container.innerHTML = renderMatching(state.cspResult, 'Résultat CSP', 'purple', isStable, blockingPairs);
}

// Fonction générique de rendu pour les résultats de matching
// Template HTML réutilisable pour affichage uniforme des deux algorithmes
// Paramétrage flexible des couleurs et informations spécifiques
function renderMatching(result, title, color, isStable, blockingPairs) {
    return `
        <div class="bg-${color}-50 p-4 rounded-lg">
            <h3 class="font-semibold mb-3 flex items-center justify-between">
                <span>${title}</span>
                ${isStable ? 
                    '<span class="flex items-center gap-1 text-green-600 text-sm">Stable</span>' :
                    '<span class="flex items-center gap-1 text-red-600 text-sm">Instable</span>'
                }
            </h3>
            
            <div class="space-y-2">
                ${result.menPartner.map((woman, man) => `
                    <div class="flex items-center gap-2 text-sm matching-item p-1 rounded">
                        <span class="font-medium">H${man}</span> → 
                        <span class="font-medium">${woman !== -1 ? `F${woman}` : 'Non apparié'}</span>
                    </div>
                `).join('')}
            </div>

            ${result.steps !== undefined ? `
                <div class="mt-3 pt-3 border-t text-sm text-gray-600">
                    Étapes: ${result.steps}
                </div>
            ` : ''}

            ${result.backtracks !== undefined ? `
                <div class="mt-3 pt-3 border-t text-sm text-gray-600">
                    Backtracks: ${result.backtracks} | Temps: ${result.time}ms<br>
                    Domaines après AC: ${result.domainsAfterAC.join(', ')}
                </div>
            ` : ''}

            ${!isStable && blockingPairs.length > 0 ? `
                <div class="mt-3 pt-3 border-t">
                    <p class="text-sm font-medium text-red-600 mb-1">Paires bloquantes:</p>
                    ${blockingPairs.map(pair => `
                        <div class="text-sm text-red-600">(H${pair.man}, F${pair.woman})</div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Mise à jour de la comparaison
function updateComparison() {
    if (state.gsResult) {
        const blockingPairs = checkStability(state.gsResult.menPartner, state.gsResult.womenPartner);
        document.getElementById('compare-gs').innerHTML = renderMatching(
            state.gsResult, 'Gale-Shapley', 'green', blockingPairs.length === 0, blockingPairs
        );
    }
    
    if (state.cspResult && !state.cspResult.error) {
        const blockingPairs = checkStability(state.cspResult.menPartner, state.cspResult.womenPartner);
        document.getElementById('compare-csp').innerHTML = renderMatching(
            state.cspResult, 'CSP', 'purple', blockingPairs.length === 0, blockingPairs
        );
    }
    
    if (state.gsResult && state.cspResult && !state.cspResult.error) {
        const sameResult = JSON.stringify(state.gsResult.menPartner) === JSON.stringify(state.cspResult.menPartner);
        
        document.getElementById('compare-analysis').classList.remove('hidden');
        // Génération de l'analyse comparative détaillée
        // Comparaison des métriques et caractéristiques des deux approches
        document.getElementById('compare-analysis').innerHTML = `
            <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h3 class="font-semibold mb-3">Analyse Comparative</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p class="font-medium text-green-700">Gale-Shapley</p>
                        <ul class="mt-2 space-y-1">
                            <li>• Complexité: O(n²)</li>
                            <li>• Étapes: ${state.gsResult.steps}</li>
                            <li>• Garantit stabilité</li>
                            <li>• Optimal pour hommes</li>
                        </ul>
                    </div>
                    <div>
                        <p class="font-medium text-purple-700">CSP</p>
                        <ul class="mt-2 space-y-1">
                            <li>• Complexité: Exponentielle (pire cas)</li>
                            <li>• Backtracks: ${state.cspResult.backtracks}</li>
                            <li>• Arc-consistance réduit domaines</li>
                            <li>• Plus flexible pour variantes</li>
                        </ul>
                    </div>
                </div>

                <div class="mt-4 pt-4 border-t">
                    <p class="font-medium mb-2">Résultats identiques ?</p>
                    <p class="text-sm ${sameResult ? 'text-green-600' : 'text-orange-600'}">
                        ${sameResult ? 
                            'Les deux algorithmes trouvent le même matching' :
                            'Matchings différents (les deux peuvent être stables)'
                        }
                    </p>
                </div>
            </div>
        `;
    }
}

// Réinitialisation complète de l'état des résultats
// Nécessaire lors du changement de paramètres ou nouvelle génération
function resetResults() {
    // Nettoyage de toutes les données calculées
    state.gsResult = null;
    state.cspResult = null;
    state.gsSteps = [];      // historique des étapes d'animation
    state.currentStep = 0;   // index de l'étape courante
    
    document.getElementById('gs-animation').classList.add('hidden');
    document.getElementById('gs-result').classList.add('hidden');
    document.getElementById('csp-result').classList.add('hidden');
    document.getElementById('compare-gs').innerHTML = '';
    document.getElementById('compare-csp').innerHTML = '';
    document.getElementById('compare-analysis').classList.add('hidden');
}