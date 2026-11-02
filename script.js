/* ============================================================
   PORTFOLIO — Loussaief Mohamed Amine (BTS SIO SISR)
   JavaScript pur, sans aucun framework.

   Sommaire :
   1.  Gestion du thème clair / sombre
   2.  Fond animé "matrix" (canvas)
   3.  Barre de navigation collante + progression de lecture
   4.  Menu burger (mobile)
   5.  Indicateur de section active (scrollspy)
   6.  Bouton retour en haut
   7.  Effet machine à écrire
   8.  Animations d'apparition au scroll (IntersectionObserver)
   9.  Compteurs animés (statistiques)
   10. Barres de progression des compétences
   11. Formulaire de contact + validation
   12. Divers (année du footer)
   ============================================================ */

'use strict';

// L'utilisateur a-t-il demandé de réduire les animations ? (accessibilité)
const animationsReduites = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   1. THÈME CLAIR / SOMBRE
   Le choix est mémorisé dans le localStorage du navigateur.
   ============================================================ */
const racine = document.documentElement;
const boutonTheme = document.getElementById('theme-toggle');
const iconeTheme = boutonTheme ? boutonTheme.querySelector('i') : null;

/** Applique un thème et met à jour l'icône du bouton. */
function appliquerTheme(theme) {
  racine.setAttribute('data-theme', theme);
  if (iconeTheme) {
    // Lune = on peut passer en clair / Soleil = on peut passer en sombre
    iconeTheme.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  }
  if (boutonTheme) {
    boutonTheme.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'
    );
  }
  // Couleur de la barre du navigateur sur mobile
  const metaCouleur = document.querySelector('meta[name="theme-color"]');
  if (metaCouleur) metaCouleur.setAttribute('content', theme === 'dark' ? '#0a0a12' : '#f5f3fb');
}

// Thème initial : préférence enregistrée, sinon préférence du système
const themeEnregistre = localStorage.getItem('portfolio-theme');
const systemeClair = window.matchMedia('(prefers-color-scheme: light)').matches;
appliquerTheme(themeEnregistre || (systemeClair ? 'light' : 'dark'));

if (boutonTheme) {
  boutonTheme.addEventListener('click', () => {
    const nouveauTheme = racine.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    appliquerTheme(nouveauTheme);
    localStorage.setItem('portfolio-theme', nouveauTheme);
  });
}

/* ============================================================
   2. FOND ANIMÉ MATRIX (CANVAS)
   ============================================================ */
const canvas = document.getElementById('matrix-canvas');

if (canvas && !animationsReduites) {
  const ctx = canvas.getContext('2d');

  // Caractères cyber : binaire + katakana + hexadécimal + symboles réseau
  const caracteres = '01アイウエオカキクケコ#@!$%^&*ABCDEF0123456789/>_\\|[]{}';
  const taillePolice = 14;
  let colonnes = [];

  /** Recalcule le nombre de colonnes en fonction de la largeur de la fenêtre. */
  function initColonnes() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const nbColonnes = Math.floor(canvas.width / taillePolice);
    colonnes = new Array(nbColonnes).fill(1);
  }

  initColonnes();

  // Redimensionnement : on relance le calcul des colonnes (avec anti-rebond)
  let minuteurResize;
  window.addEventListener('resize', () => {
    clearTimeout(minuteurResize);
    minuteurResize = setTimeout(initColonnes, 150);
  });

  /** Dessine une image de l'animation matrix. */
  function dessinerMatrix() {
    // Fond semi-transparent : crée l'effet de traînée (adapté au thème)
    const sombre = racine.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = sombre ? 'rgba(10, 10, 18, 0.06)' : 'rgba(245, 243, 251, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = taillePolice + 'px monospace';

    for (let i = 0; i < colonnes.length; i++) {
      const caractere = caracteres[Math.floor(Math.random() * caracteres.length)];
      const x = i * taillePolice;
      const y = colonnes[i] * taillePolice;

      // Alternance de violets pour l'ambiance cybersécurité
      const hasard = Math.random();
      if (hasard > 0.97) {
        ctx.fillStyle = sombre ? '#ffffff' : '#3b1170';
      } else if (hasard > 0.5) {
        ctx.fillStyle = 'rgb(133, 40, 255)';
      } else {
        ctx.fillStyle = 'rgb(80, 20, 160)';
      }

      ctx.fillText(caractere, x, y);

      // Réinitialisation aléatoire de la colonne une fois en bas
      if (y > canvas.height && Math.random() > 0.975) colonnes[i] = 0;
      colonnes[i]++;
    }
  }

  // Boucle d'animation limitée à ~22 images/seconde (économie de CPU)
  let dernierTemps = 0;
  function boucleMatrix(temps) {
    if (temps - dernierTemps > 45) {
      dessinerMatrix();
      dernierTemps = temps;
    }
    requestAnimationFrame(boucleMatrix);
  }
  requestAnimationFrame(boucleMatrix);
}

/* ============================================================
   3. NAVIGATION COLLANTE + BARRE DE PROGRESSION DE LECTURE
   ============================================================ */
const navbar = document.getElementById('navbar');
const barreProgression = document.getElementById('scroll-progress');
const boutonHaut = document.getElementById('back-to-top');

/** Met à jour tout ce qui dépend de la position de défilement. */
function auScroll() {
  const positionY = window.scrollY;

  // a) Fond flouté de la barre de navigation après 40px de scroll
  if (navbar) navbar.classList.toggle('scrolled', positionY > 40);

  // b) Barre de progression de lecture
  if (barreProgression) {
    const hauteurTotale = document.documentElement.scrollHeight - window.innerHeight;
    const pourcentage = hauteurTotale > 0 ? (positionY / hauteurTotale) * 100 : 0;
    barreProgression.style.width = pourcentage + '%';
  }

  // c) Bouton retour en haut visible après 400px
  if (boutonHaut) boutonHaut.classList.toggle('show', positionY > 400);

  // d) Section active dans le menu
  majSectionActive();
}

// On limite les appels au rythme de rafraîchissement de l'écran
let tickEnCours = false;
window.addEventListener('scroll', () => {
  if (!tickEnCours) {
    window.requestAnimationFrame(() => {
      auScroll();
      tickEnCours = false;
    });
    tickEnCours = true;
  }
}, { passive: true });

/* ============================================================
   4. MENU BURGER (MOBILE)
   ============================================================ */
const burger = document.getElementById('burger');
const menuNav = document.getElementById('nav-menu');

/** Ouvre ou ferme le menu mobile. */
function basculerMenu(forcerFermeture) {
  if (!burger || !menuNav) return;
  const ouvert = forcerFermeture ? false : !menuNav.classList.contains('open');
  menuNav.classList.toggle('open', ouvert);
  burger.classList.toggle('open', ouvert);
  burger.setAttribute('aria-expanded', String(ouvert));
  burger.setAttribute('aria-label', ouvert ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation');
}

if (burger) {
  burger.addEventListener('click', () => basculerMenu());
}

// Fermeture du menu après un clic sur un lien
document.querySelectorAll('.nav-item').forEach((lien) => {
  lien.addEventListener('click', () => basculerMenu(true));
});

// Fermeture avec la touche Échap (accessibilité clavier)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') basculerMenu(true);
});

// Fermeture si l'on clique en dehors du menu
document.addEventListener('click', (e) => {
  if (!menuNav || !burger) return;
  if (menuNav.classList.contains('open') &&
      !menuNav.contains(e.target) && !burger.contains(e.target)) {
    basculerMenu(true);
  }
});

// Fermeture automatique si l'écran redevient large
window.addEventListener('resize', () => {
  if (window.innerWidth > 900) basculerMenu(true);
});

/* ============================================================
   5. INDICATEUR DE SECTION ACTIVE (SCROLLSPY)
   ============================================================ */
const liensNav = Array.from(document.querySelectorAll('.nav-item'));
const sections = liensNav
  .map((lien) => document.querySelector(lien.getAttribute('href')))
  .filter(Boolean);

/** Surligne le lien correspondant à la section visible à l'écran. */
function majSectionActive() {
  if (!sections.length) return;

  const decalage = window.scrollY + (window.innerHeight * 0.3);
  let indexActif = 0;

  sections.forEach((section, index) => {
    if (section.offsetTop <= decalage) indexActif = index;
  });

  // Cas particulier : bas de page = dernière section
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 60) {
    indexActif = sections.length - 1;
  }

  liensNav.forEach((lien, index) => {
    const estActif = index === indexActif;
    lien.classList.toggle('active', estActif);
    if (estActif) {
      lien.setAttribute('aria-current', 'page');
    } else {
      lien.removeAttribute('aria-current');
    }
  });
}

/* ============================================================
   6. BOUTON RETOUR EN HAUT
   ============================================================ */
if (boutonHaut) {
  boutonHaut.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: animationsReduites ? 'auto' : 'smooth'
    });
  });
}

/* ============================================================
   7. EFFET MACHINE À ÉCRIRE (titre principal)
   Chaque phrase est composée d'un début normal et d'un mot
   mis en valeur en violet.
   ============================================================ */
const zoneTypewriter = document.getElementById('typewriter');

if (zoneTypewriter) {
  const phrases = [
    { debut: 'BTS SIO ', accent: 'SISR' },
    { debut: 'Réseaux & ', accent: 'Sécurité' },
    { debut: 'Admin. ', accent: 'Systèmes' }
  ];

  const VITESSE_ECRITURE = 90;   // ms par caractère
  const VITESSE_EFFACEMENT = 45; // ms par caractère
  const PAUSE_FIN = 1800;        // pause une fois la phrase écrite

  let indexPhrase = 0;
  let nbCaracteres = 0;
  let effacement = false;

  /** Affiche les n premiers caractères de la phrase, avec le mot accentué. */
  function afficherPhrase(phrase, n) {
    const texteComplet = phrase.debut + phrase.accent;
    const visible = texteComplet.slice(0, n);
    const partieDebut = visible.slice(0, Math.min(n, phrase.debut.length));
    const partieAccent = visible.slice(phrase.debut.length);
    zoneTypewriter.innerHTML =
      escapeHTML(partieDebut) +
      (partieAccent ? '<span class="hl">' + escapeHTML(partieAccent) + '</span>' : '');
  }

  /** Échappe le HTML : on n'injecte jamais de balise non maîtrisée. */
  function escapeHTML(texte) {
    return texte.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  /** Boucle principale de l'effet machine à écrire. */
  function boucleTypewriter() {
    const phrase = phrases[indexPhrase];
    const longueur = (phrase.debut + phrase.accent).length;

    afficherPhrase(phrase, nbCaracteres);

    let delai = effacement ? VITESSE_EFFACEMENT : VITESSE_ECRITURE;

    if (!effacement && nbCaracteres === longueur) {
      // Phrase complète : on marque une pause avant d'effacer
      effacement = true;
      delai = PAUSE_FIN;
    } else if (effacement && nbCaracteres === 0) {
      // Phrase effacée : on passe à la suivante
      effacement = false;
      indexPhrase = (indexPhrase + 1) % phrases.length;
      delai = 350;
    } else {
      nbCaracteres += effacement ? -1 : 1;
    }

    setTimeout(boucleTypewriter, delai);
  }

  if (animationsReduites) {
    // Animation désactivée : on affiche directement la première phrase
    afficherPhrase(phrases[0], (phrases[0].debut + phrases[0].accent).length);
  } else {
    setTimeout(boucleTypewriter, 700);
  }
}

/* ============================================================
   8. ANIMATIONS D'APPARITION AU SCROLL
   Les éléments portant la classe .reveal apparaissent en fondu
   dès qu'ils entrent dans la zone visible de la page.
   ============================================================ */
const elementsReveal = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && !animationsReduites) {
  const observateurReveal = new IntersectionObserver((entrees, observateur) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;

      const element = entree.target;
      // Décalage optionnel pour animer les cartes les unes après les autres
      const delai = parseInt(element.dataset.delay || '0', 10);
      element.style.transitionDelay = delai + 'ms';
      element.classList.add('visible');

      // Déclenchements liés à l'apparition
      if (element.querySelector('.stat-number')) animerCompteur(element.querySelector('.stat-number'));
      element.querySelectorAll('.skill-bar-fill').forEach(remplirBarre);

      // Une seule fois par élément
      observateur.unobserve(element);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  elementsReveal.forEach((el) => observateurReveal.observe(el));
} else {
  // Navigateur ancien ou animations réduites : tout est affiché directement
  elementsReveal.forEach((el) => el.classList.add('visible'));
  document.querySelectorAll('.stat-number').forEach((el) => {
    el.textContent = el.dataset.target + (el.dataset.suffix || '');
  });
  document.querySelectorAll('.skill-bar-fill').forEach((barre) => {
    barre.style.width = barre.dataset.percent + '%';
  });
}

/* ============================================================
   9. COMPTEURS ANIMÉS (statistiques)
   ============================================================ */
/** Fait défiler un nombre de 0 jusqu'à sa valeur cible. */
function animerCompteur(element) {
  if (!element || element.dataset.done === 'true') return;
  element.dataset.done = 'true';

  const cible = parseInt(element.dataset.target || '0', 10);
  const suffixe = element.dataset.suffix || '';
  const duree = 1600; // millisecondes
  const debut = performance.now();

  function etape(maintenant) {
    const avancement = Math.min((maintenant - debut) / duree, 1);
    // Courbe d'accélération douce (ease-out) pour un rendu naturel
    const valeur = Math.round(cible * (1 - Math.pow(1 - avancement, 3)));
    element.textContent = valeur + suffixe;
    if (avancement < 1) requestAnimationFrame(etape);
  }

  requestAnimationFrame(etape);
}

/* ============================================================
   10. BARRES DE PROGRESSION DES COMPÉTENCES
   ============================================================ */
/** Anime le remplissage d'une barre jusqu'à son pourcentage. */
function remplirBarre(barre) {
  if (barre.dataset.done === 'true') return;
  barre.dataset.done = 'true';
  const pourcent = parseInt(barre.dataset.percent || '0', 10);
  // Léger décalage pour que l'animation soit visible après l'apparition
  setTimeout(() => { barre.style.width = pourcent + '%'; }, 200);
}

/* ============================================================
   11. FORMULAIRE DE CONTACT + VALIDATION
   La validation est entièrement faite en JavaScript ; à l'envoi,
   le message est transmis via le client de messagerie (mailto),
   ce qui évite d'avoir besoin d'un serveur.
   ============================================================ */
const formulaire = document.getElementById('contact-form');

if (formulaire) {
  const champNom = document.getElementById('nom');
  const champEmail = document.getElementById('email');
  const champSujet = document.getElementById('sujet');
  const champMessage = document.getElementById('message');
  const compteurCaracteres = document.getElementById('char-count');
  const retourFormulaire = document.getElementById('form-feedback');
  const boutonEnvoi = document.getElementById('form-submit');

  const MAX_MESSAGE = 1000;
  const EMAIL_DESTINATION = 'loussaief.mohamed.sio@gmail.com';

  // Expression régulière simple mais fiable pour vérifier un email
  const regexEmail = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  /** Affiche un message d'erreur sous un champ. */
  function afficherErreur(champ, message) {
    const zoneErreur = document.getElementById('err-' + champ.id);
    if (zoneErreur) zoneErreur.textContent = message;
    champ.classList.add('invalid');
    champ.classList.remove('valid');
    champ.setAttribute('aria-invalid', 'true');
  }

  /** Marque un champ comme valide. */
  function marquerValide(champ) {
    const zoneErreur = document.getElementById('err-' + champ.id);
    if (zoneErreur) zoneErreur.textContent = '';
    champ.classList.remove('invalid');
    champ.classList.add('valid');
    champ.removeAttribute('aria-invalid');
  }

  /** Valide un champ et renvoie true si son contenu est correct. */
  function validerChamp(champ) {
    const valeur = champ.value.trim();

    switch (champ.id) {
      case 'nom':
        if (valeur === '') return afficherErreur(champ, 'Merci d’indiquer votre nom.'), false;
        if (valeur.length < 2) return afficherErreur(champ, 'Le nom doit contenir au moins 2 caractères.'), false;
        if (!/^[a-zA-ZÀ-ÿ' -]+$/.test(valeur)) return afficherErreur(champ, 'Le nom contient des caractères non autorisés.'), false;
        break;

      case 'email':
        if (valeur === '') return afficherErreur(champ, 'Merci d’indiquer votre email.'), false;
        if (!regexEmail.test(valeur)) return afficherErreur(champ, 'Format d’email invalide (exemple : nom@domaine.fr).'), false;
        break;

      case 'sujet':
        if (valeur === '') return afficherErreur(champ, 'Merci de choisir un sujet.'), false;
        break;

      case 'message':
        if (valeur === '') return afficherErreur(champ, 'Merci d’écrire un message.'), false;
        if (valeur.length < 20) return afficherErreur(champ, 'Le message doit contenir au moins 20 caractères (' + valeur.length + '/20).'), false;
        if (valeur.length > MAX_MESSAGE) return afficherErreur(champ, 'Le message ne doit pas dépasser ' + MAX_MESSAGE + ' caractères.'), false;
        break;
    }

    marquerValide(champ);
    return true;
  }

  const champs = [champNom, champEmail, champSujet, champMessage].filter(Boolean);

  // Validation à la sortie du champ, puis en direct une fois corrigé
  champs.forEach((champ) => {
    champ.addEventListener('blur', () => validerChamp(champ));
    champ.addEventListener('input', () => {
      if (champ.classList.contains('invalid')) validerChamp(champ);
    });
    if (champ.tagName === 'SELECT') {
      champ.addEventListener('change', () => validerChamp(champ));
    }
  });

  // Compteur de caractères du message
  if (champMessage && compteurCaracteres) {
    champMessage.addEventListener('input', () => {
      const longueur = champMessage.value.length;
      compteurCaracteres.textContent = longueur + ' / ' + MAX_MESSAGE;
      compteurCaracteres.style.color = longueur > MAX_MESSAGE ? '#ff5470' : '';
    });
  }

  // Envoi du formulaire
  formulaire.addEventListener('submit', (e) => {
    e.preventDefault();

    // On valide tous les champs et on garde le premier en erreur
    let premierInvalide = null;
    let formulaireValide = true;

    champs.forEach((champ) => {
      if (!validerChamp(champ)) {
        formulaireValide = false;
        if (!premierInvalide) premierInvalide = champ;
      }
    });

    if (!formulaireValide) {
      retourFormulaire.textContent = 'Merci de corriger les champs signalés avant l’envoi.';
      retourFormulaire.className = 'form-feedback error';
      formulaire.classList.add('shake');
      setTimeout(() => formulaire.classList.remove('shake'), 400);
      if (premierInvalide) premierInvalide.focus();
      return;
    }

    // Construction du message pour le client de messagerie
    const sujet = '[Portfolio] ' + champSujet.value + ' — ' + champNom.value.trim();
    const corps =
      'Nom : ' + champNom.value.trim() + '\n' +
      'Email : ' + champEmail.value.trim() + '\n' +
      'Sujet : ' + champSujet.value + '\n\n' +
      champMessage.value.trim();

    const lienMailto = 'mailto:' + EMAIL_DESTINATION +
      '?subject=' + encodeURIComponent(sujet) +
      '&body=' + encodeURIComponent(corps);

    // Retour visuel puis ouverture du client mail
    boutonEnvoi.disabled = true;
    boutonEnvoi.innerHTML = 'Ouverture de la messagerie… <i class="fa-solid fa-spinner fa-spin"></i>';

    setTimeout(() => {
      window.location.href = lienMailto;

      retourFormulaire.textContent =
        'Merci ' + champNom.value.trim().split(' ')[0] +
        ' ! Votre logiciel de messagerie vient de s’ouvrir avec le message pré-rempli. ' +
        'Si rien ne se passe, écrivez directement à ' + EMAIL_DESTINATION + '.';
      retourFormulaire.className = 'form-feedback success';

      boutonEnvoi.disabled = false;
      boutonEnvoi.innerHTML = 'Envoyer le message <i class="fa-solid fa-paper-plane"></i>';

      formulaire.reset();
      champs.forEach((champ) => champ.classList.remove('valid', 'invalid'));
      if (compteurCaracteres) compteurCaracteres.textContent = '0 / ' + MAX_MESSAGE;
    }, 600);
  });
}

/* ============================================================
   12. DIVERS
   ============================================================ */
// Année automatique dans le pied de page
const anneeCourante = document.getElementById('year');
if (anneeCourante) anneeCourante.textContent = new Date().getFullYear();

// Première mise à jour au chargement (section active, barre de progression…)
auScroll();


/* ============================================================
   13. FLUX RSS DE VEILLE
   Pour ajouter une source, il suffit d'ajouter une ligne dans
   FLUX_RSS. Les flux sont convertis en JSON par le service
   gratuit rss2json, car un navigateur ne peut pas lire
   directement un flux RSS d'un autre site (règle CORS).
   ============================================================ */
const FLUX_RSS = [
  { nom: 'NVIDIA Blog',           site: 'https://blogs.nvidia.com',           url: 'https://blogs.nvidia.com/feed/' },
  { nom: 'CERT-FR (ANSSI)',       site: 'https://www.cert.ssi.gouv.fr',       url: 'https://www.cert.ssi.gouv.fr/feed/' },
  { nom: 'Le Monde Informatique', site: 'https://www.lemondeinformatique.fr', url: 'https://www.lemondeinformatique.fr/flux-rss/thematique/toutes-les-actualites/rss.xml' },
  { nom: 'Korben',                site: 'https://korben.info',                url: 'https://korben.info/feed' },
  { nom: 'ZATAZ',                 site: 'https://www.zataz.com',              url: 'https://www.zataz.com/feed/' }
];

const RSS_CONVERTISSEUR = 'https://api.rss2json.com/v1/api.json?rss_url=';
const RSS_NB_ARTICLES = 5;
const rssCache = {};
const rssOnglets = document.getElementById('rss-tabs');
const rssListe = document.getElementById('rss-list');

// Retire les balises HTML d'un texte et le raccourcit
function rssNettoyer(html, longueurMax) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';
  const texte = (temp.textContent || '').replace(/\s+/g, ' ').trim();
  return texte.length > longueurMax ? texte.slice(0, longueurMax) + '…' : texte;
}

// Date au format français (ex : 2 nov. 2026)
function rssDate(dateTexte) {
  const date = new Date(String(dateTexte).replace(' ', 'T'));
  return isNaN(date) ? '' : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Affiche les articles, créés élément par élément (aucun HTML externe injecté)
function rssAfficher(flux, articles) {
  rssListe.innerHTML = '';
  articles.slice(0, RSS_NB_ARTICLES).forEach((article) => {
    const lien = document.createElement('a');
    lien.className = 'rss-item';
    lien.href = article.link;
    lien.target = '_blank';
    lien.rel = 'noopener';

    const meta = document.createElement('span');
    meta.className = 'rss-meta';
    meta.textContent = flux.nom + ' · ' + rssDate(article.pubDate);

    const titre = document.createElement('h4');
    titre.textContent = rssNettoyer(article.title, 140);

    const resume = document.createElement('p');
    resume.textContent = rssNettoyer(article.description, 180);

    lien.append(meta, titre, resume);
    rssListe.appendChild(lien);
  });
}

// Si un flux ne répond pas : lien direct vers le site de la source
function rssErreur(flux) {
  rssListe.innerHTML = '';
  const message = document.createElement('p');
  message.className = 'rss-loading';
  message.textContent = 'Impossible de charger ce flux pour le moment. ';
  const lien = document.createElement('a');
  lien.href = flux.site;
  lien.target = '_blank';
  lien.rel = 'noopener';
  lien.textContent = 'Voir le site ' + flux.nom + ' →';
  message.appendChild(lien);
  rssListe.appendChild(message);
}

// Charge un flux (ou le reprend du cache s'il a déjà été chargé)
async function rssCharger(index) {
  const flux = FLUX_RSS[index];
  rssOnglets.querySelectorAll('.rss-tab').forEach((bouton, i) => {
    bouton.classList.toggle('active', i === index);
    bouton.setAttribute('aria-selected', i === index ? 'true' : 'false');
  });

  if (rssCache[flux.url]) { rssAfficher(flux, rssCache[flux.url]); return; }

  rssListe.innerHTML = '<p class="rss-loading"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Chargement des articles…</p>';
  try {
    const reponse = await fetch(RSS_CONVERTISSEUR + encodeURIComponent(flux.url));
    const donnees = await reponse.json();
    if (donnees.status !== 'ok' || !donnees.items || !donnees.items.length) throw new Error('Flux vide');
    rssCache[flux.url] = donnees.items;
    rssAfficher(flux, donnees.items);
  } catch (erreur) {
    rssErreur(flux);
  }
}

if (rssOnglets && rssListe) {
  FLUX_RSS.forEach((flux, index) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'rss-tab';
    bouton.setAttribute('role', 'tab');
    bouton.textContent = flux.nom;
    bouton.addEventListener('click', () => rssCharger(index));
    rssOnglets.appendChild(bouton);
  });
  rssCharger(0);
}
