/* ──────────────────────────────────────────────────────────────────
   The White Lotus · TCG
   L'accueil ne montre que les cartes déjà obtenues. On les gagne en
   ouvrant des boosters de 3 cartes : une carte révélée rejoint la
   collection, conservée dans le navigateur.
   Vanilla, aucune dépendance.
   ────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var grid = document.getElementById('grid');
  if (!grid) return;

  var BACK = document.body.dataset.back || '';
  var BOOSTER_SIZE = 3;
  var COOLDOWN_MS = 60000;              // attente imposée entre deux boosters
  var STORE_KEY = 'wl-tcg-collection-v2';
  var OLD_KEY   = 'wl-tcg-collection-v1';
  var NEXT_KEY  = 'wl-tcg-next-booster';
  var RATIO = 1000 / 1400;

  var tiles = Array.prototype.slice.call(grid.querySelectorAll('.tile'));
  var CARDS = tiles.map(function (t) {
    return {
      src:  t.dataset.src,
      id:   t.dataset.id || t.dataset.src,
      cat:  t.dataset.cat || '',
      name: t.dataset.name
    };
  });
  if (!CARDS.length) return;

  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('emptyState');
  var toolsEl = document.getElementById('tools');
  var pickEl  = document.getElementById('catFilter');
  var resetEl = document.getElementById('resetBtn');
  var subEl   = document.getElementById('boosterSub');

  var SUB_TEXT = subEl ? subEl.textContent : '';
  var filter = '';                      // '' = toutes les catégories

  /* ── Collection conservée ────────────────────────────────────── */
  /* Le stockage peut être indisponible (navigation privée) : dans ce
     cas la collection ne vit que le temps de la visite.             */

  function readList(key) {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(key));
      return Object.prototype.toString.call(parsed) === '[object Array]' ? parsed : null;
    } catch (e) { return null; }
  }

  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(owned)); } catch (e) {}
  }

  /* Une carte est repérée par son nom de fichier, pas par son URL : la
     ranger dans une autre catégorie ne la fait plus disparaître de la
     collection. L'ancien format stockait des URL, converties une fois. */
  function toId(entry) {
    var tail = String(entry).split('/').pop().replace(/\.[^.]+$/, '');
    try { return decodeURIComponent(tail); } catch (e) { return tail; }
  }

  var owned = readList(STORE_KEY);
  if (!owned) {
    var legacy = readList(OLD_KEY);
    owned = legacy ? legacy.map(toId) : [];
    if (legacy) save();
  }

  function isOwned(card) { return owned.indexOf(card.id) !== -1; }

  function addOwned(card) {
    if (isOwned(card)) return false;
    owned.push(card.id);
    save();
    fresh[card.id] = true;
    return true;
  }

  var fresh = {};   // cartes obtenues à l'instant : animation à l'accueil

  /* ── Accueil ─────────────────────────────────────────────────── */

  function matches(card) { return !filter || card.cat === filter; }

  function pickLabel() {
    var o = pickEl && pickEl.options[pickEl.selectedIndex];
    return o ? o.textContent : filter;
  }

  function paintHome() {
    var total = 0;   // collection entière, toutes catégories confondues
    var shown = 0;   // cartes affichées sous le tri courant
    var scope = 0;   // cartes existantes dans la catégorie triée

    tiles.forEach(function (t, i) {
      var card = CARDS[i];
      var li = t.parentNode;
      var own = isOwned(card);
      var keep = matches(card);

      if (own) total++;
      if (keep) scope++;

      if (own && keep) {
        shown++;
        if (li.hidden) {
          li.hidden = false;
          if (fresh[card.id]) {
            li.classList.add('fresh');
            delete fresh[card.id];
          }
        }
      } else {
        li.hidden = true;
        li.classList.remove('fresh');
      }
    });

    // La barre d'outils n'a rien à trier tant que rien n'est collectionné.
    if (toolsEl) toolsEl.hidden = total === 0;
    if (pickEl) pickEl.parentNode.classList.toggle('on', filter !== '');

    if (emptyEl) {
      emptyEl.hidden = shown > 0;
      emptyEl.innerHTML = total === 0
        ? 'Votre collection est vide.<br>Ouvrez un booster pour la commencer.'
        : 'Aucune carte de cette catégorie<br>dans votre collection.';
    }

    if (countEl) {
      if (filter !== '') {
        countEl.textContent = pickLabel() + ' · ' + shown + ' / ' + scope;
      } else if (total === 0) {
        countEl.textContent = CARDS.length + ' cartes à collectionner';
      } else {
        countEl.textContent = (total >= CARDS.length ? 'Collection complète · ' : 'Votre collection · ')
          + total + ' / ' + CARDS.length;
      }
      countEl.classList.toggle('full', shown > 0 && shown >= scope);
    }
  }

  /* ── Construction du lecteur ─────────────────────────────────── */

  var viewer = document.createElement('div');
  viewer.className = 'viewer';
  viewer.id = 'viewer';
  viewer.hidden = true;
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', 'Carte en plein écran');
  viewer.innerHTML =
    '<div class="v-top">' +
      '<span class="v-count" id="vCount"></span>' +
      '<button class="v-close" id="vClose" type="button" aria-label="Fermer">&#10005;</button>' +
    '</div>' +
    '<div class="deck-wrap"><div class="deck" id="deck"></div></div>' +
    '<div class="v-bottom">' +
      '<div class="v-name" id="vName"></div>' +
      '<div class="v-hint" id="vHint"></div>' +
      '<div class="v-dots" id="vDots"></div>' +
    '</div>' +
    '<div class="booster-done" id="vDone">' +
      '<button type="button" data-act="again">Un autre booster</button>' +
      '<button type="button" data-act="close">Voir la collection</button>' +
    '</div>';
  document.body.appendChild(viewer);

  var deck    = viewer.querySelector('#deck');
  var wrap    = viewer.querySelector('.deck-wrap');
  var elCount = viewer.querySelector('#vCount');
  var elName  = viewer.querySelector('#vName');
  var elHint  = viewer.querySelector('#vHint');
  var elDots  = viewer.querySelector('#vDots');
  var elDone  = viewer.querySelector('#vDone');

  var list = [];
  var index = 0;
  var booster = false;
  var revealed = [];
  var open = false;
  var pushedState = false;

  function escapeAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function makeSlide(card, faceDown) {
    var slide = document.createElement('div');
    slide.className = 'slide';
    slide.innerHTML =
      '<div class="card3d">' +
        '<div class="flipper' + (faceDown ? ' flipped' : '') + '">' +
          '<div class="face front">' +
            '<img alt="' + escapeAttr(card.name) + '" decoding="async">' +
          '</div>' +
          '<div class="face back">' +
            '<img src="' + escapeAttr(BACK) + '" alt="Dos de carte" decoding="async">' +
          '</div>' +
        '</div>' +
      '</div>';
    slide.querySelector('.face.front img').dataset.src = card.src;
    return slide;
  }

  function loadAround(i) {
    var slides = deck.children;
    for (var k = Math.max(0, i - 1); k <= Math.min(slides.length - 1, i + 1); k++) {
      var img = slides[k].querySelector('.face.front img');
      if (img && !img.src && img.dataset.src) img.src = img.dataset.src;
    }
  }

  /* ── Dimensionnement ─────────────────────────────────────────── */
  /* La plus grande carte qui tienne entièrement, avec une marge
     confortable en haut et en bas.                                  */

  function sizeDeck() {
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    if (!w || !h) return;
    var cw = Math.min(w - 44, (h - 44) * RATIO);
    deck.style.setProperty('--cw', Math.max(120, Math.floor(cw)) + 'px');
  }

  /* ── Ouverture / fermeture ───────────────────────────────────── */

  function openViewer(cards, start, isBooster) {
    list = cards;
    booster = !!isBooster;
    revealed = list.map(function () { return !booster; });
    index = Math.max(0, Math.min(list.length - 1, start || 0));

    deck.innerHTML = '';
    var frag = document.createDocumentFragment();
    list.forEach(function (c) { frag.appendChild(makeSlide(c, booster)); });
    deck.appendChild(frag);

    viewer.classList.toggle('booster', booster);
    elDone.classList.remove('show');

    elDots.innerHTML = '';
    if (booster) {
      list.forEach(function () { elDots.appendChild(document.createElement('span')); });
    }

    viewer.hidden = false;
    document.body.classList.add('is-locked');
    open = true;
    void viewer.offsetWidth;
    viewer.classList.add('is-open');

    sizeDeck();
    goTo(index, false);
    elHint.classList.remove('fade');

    if (!pushedState) {
      try { history.pushState({ wlViewer: true }, ''); pushedState = true; } catch (e) {}
    }
    viewer.querySelector('#vClose').focus({ preventScroll: true });
  }

  function closeViewer(fromPop) {
    if (!open) return;
    open = false;
    viewer.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    paintHome();
    setTimeout(function () {
      if (!open) { viewer.hidden = true; deck.innerHTML = ''; }
    }, 280);
    if (pushedState && !fromPop) {
      pushedState = false;
      try { history.back(); } catch (e) {}
    } else if (fromPop) {
      pushedState = false;
    }
  }

  /* ── Navigation ──────────────────────────────────────────────── */

  function goTo(i, animate) {
    index = Math.max(0, Math.min(list.length - 1, i));
    deck.classList.toggle('animate', animate !== false);
    deck.style.setProperty('--i', index);
    deck.style.setProperty('--dx', 0);
    loadAround(index);
    paint();
  }

  function paint() {
    var card = list[index];
    var shown = !booster || revealed[index];

    elName.textContent = shown ? card.name : ' ';
    elCount.innerHTML = booster
      ? 'Booster <em>&middot;</em> ' + (index + 1) + ' <em>/</em> ' + list.length
      : (index + 1) + ' <em>/</em> ' + list.length;

    if (booster) {
      elHint.textContent = shown
        ? (index < list.length - 1 ? 'Glissez pour la suivante' : 'Glissez pour revoir')
        : 'Touchez pour révéler';
      Array.prototype.forEach.call(elDots.children, function (d, k) {
        d.className = k === index ? 'on' : (revealed[k] ? 'seen' : '');
      });
    } else {
      elHint.textContent = list.length > 1
        ? 'Touchez pour retourner · glissez pour changer'
        : 'Touchez pour retourner';
    }
  }

  function currentFlipper() {
    var s = deck.children[index];
    return s ? s.querySelector('.flipper') : null;
  }

  /* ── Retournement / révélation ───────────────────────────────── */

  function flip() {
    var f = currentFlipper();
    if (!f) return;

    if (booster && !revealed[index]) {
      revealed[index] = true;
      f.classList.remove('flipped');
      addOwned(list[index]);
      flash();
      paint();
      if (revealed.every(Boolean)) {
        setTimeout(function () { elDone.classList.add('show'); }, 700);
      }
      return;
    }
    f.classList.toggle('flipped');
  }

  function flash() {
    var s = deck.children[index];
    var holder = s && s.querySelector('.card3d');
    if (!holder) return;
    var el = document.createElement('div');
    el.className = 'flash';
    holder.appendChild(el);
    setTimeout(function () { el.remove(); }, 820);
  }

  /* ── Gestes : glisser pour changer, taper pour retourner ─────── */

  var pt = null;

  deck.addEventListener('pointerdown', function (e) {
    if (!open || e.button > 0) return;
    pt = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX,
           t0: Date.now(), axis: null, moved: 0 };
    deck.classList.remove('animate');
    try { deck.setPointerCapture(e.pointerId); } catch (err) {}
  });

  deck.addEventListener('pointermove', function (e) {
    if (!open || !pt || e.pointerId !== pt.id) return;

    var dx = e.clientX - pt.x0;
    var dy = e.clientY - pt.y0;
    pt.x = e.clientX;
    pt.moved = Math.max(pt.moved, Math.sqrt(dx * dx + dy * dy));

    if (!pt.axis) {
      if (Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy) * 1.15) pt.axis = 'x';
      else if (Math.abs(dy) > 14) pt.axis = 'y';
    }

    if (pt.axis === 'x') {
      var lim = dx;
      if ((index === 0 && dx > 0) || (index === list.length - 1 && dx < 0)) lim = dx * 0.32;
      deck.style.setProperty('--dx', lim.toFixed(1));
      elHint.classList.add('fade');
    }
  });

  function endGesture(e) {
    if (!pt || (e && e.pointerId !== pt.id)) return;
    var g = pt; pt = null;
    try { deck.releasePointerCapture(g.id); } catch (err) {}

    var dx = g.x - g.x0;
    var dt = Date.now() - g.t0;
    var vx = dx / Math.max(1, dt);
    var w = deck.getBoundingClientRect().width || window.innerWidth;

    if (g.axis === 'x') {
      var step = 0;
      if (dx < -w * 0.2 || vx < -0.45) step = 1;
      else if (dx > w * 0.2 || vx > 0.45) step = -1;
      deck.classList.add('animate');
      goTo(index + step, true);
      return;
    }

    if (g.moved < 12 && dt < 400) {
      flip();
      elHint.classList.add('fade');
    }
    deck.classList.add('animate');
    deck.style.setProperty('--dx', 0);
  }

  deck.addEventListener('pointerup', endGesture);
  deck.addEventListener('pointercancel', endGesture);
  deck.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  deck.addEventListener('dragstart', function (e) { e.preventDefault(); });

  /* ── Commandes ───────────────────────────────────────────────── */

  grid.addEventListener('click', function (e) {
    var tile = e.target.closest('.tile');
    if (!tile) return;
    // On ne navigue qu'entre les cartes visibles : obtenues, et
    // conformes au tri en cours.
    var deckCards = CARDS.filter(function (c) { return isOwned(c) && matches(c); });
    var start = 0;
    for (var k = 0; k < deckCards.length; k++) {
      if (deckCards[k].src === tile.dataset.src) { start = k; break; }
    }
    if (deckCards.length) openViewer(deckCards, start, false);
  });

  viewer.querySelector('#vClose').addEventListener('click', function () { closeViewer(); });

  elDone.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'again') openBooster();
    else closeViewer();
  });

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ── Attente entre deux boosters ─────────────────────────────── */
  /* On retient la date du prochain droit de tirage, pas un décompte :
     fermer l'onglet, verrouiller le téléphone ou laisser la page en
     arrière-plan ne fausse donc rien. Le tout premier booster est
     immédiat, et la remise à zéro rend ce droit.                     */

  var boosterBtn = document.getElementById('boosterBtn');
  var againBtn = elDone.querySelector('[data-act="again"]');
  var ticker = null;
  var nextAt = 0;
  try { nextAt = parseInt(window.localStorage.getItem(NEXT_KEY), 10) || 0; } catch (e) {}

  function remaining() {
    var ms = nextAt - Date.now();
    // Horloge reculée ou valeur aberrante : on ne bloque pas sans fin.
    if (ms > COOLDOWN_MS) ms = 0;
    return ms > 0 ? ms : 0;
  }

  function startCooldown() {
    nextAt = Date.now() + COOLDOWN_MS;
    try { window.localStorage.setItem(NEXT_KEY, String(nextAt)); } catch (e) {}
    paintCooldown();
  }

  function clearCooldown() {
    nextAt = 0;
    try { window.localStorage.removeItem(NEXT_KEY); } catch (e) {}
    paintCooldown();
  }

  function paintCooldown() {
    var ms = remaining();
    var sec = Math.ceil(ms / 1000);

    if (boosterBtn) boosterBtn.disabled = ms > 0;
    if (subEl) {
      subEl.textContent = ms > 0 ? 'Prochain booster dans ' + sec + ' s' : SUB_TEXT;
      subEl.classList.toggle('cooling', ms > 0);
    }
    if (againBtn) {
      againBtn.disabled = ms > 0;
      againBtn.textContent = ms > 0 ? 'Encore ' + sec + ' s' : 'Un autre booster';
    }

    // Un seul minuteur, qui ne tourne que pendant l'attente.
    if (ms > 0 && !ticker) ticker = setInterval(paintCooldown, 500);
    else if (ms <= 0 && ticker) { clearInterval(ticker); ticker = null; }
  }

  function openBooster() {
    if (remaining() > 0) { paintCooldown(); return; }
    // On tire d'abord parmi les cartes manquantes : la collection avance
    // à chaque booster. Une fois complète, on repioche au hasard.
    var pool = shuffle(CARDS.filter(function (c) { return !isOwned(c); }));
    if (pool.length < BOOSTER_SIZE) {
      pool = pool.concat(shuffle(CARDS.filter(isOwned)));
    }
    startCooldown();
    openViewer(pool.slice(0, Math.min(BOOSTER_SIZE, CARDS.length)), 0, true);
  }

  if (boosterBtn) boosterBtn.addEventListener('click', openBooster);

  // Au retour sur l'onglet, le décompte peut avoir expiré en coulisse.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) paintCooldown();
  });

  /* ── Tri par catégorie ───────────────────────────────────────── */

  if (pickEl) {
    pickEl.addEventListener('change', function () {
      filter = pickEl.value || '';
      paintHome();
    });
  }

  /* ── Remise à zéro ───────────────────────────────────────────── */
  /* Deux appuis plutôt qu'une fenêtre système : le premier arme le
     bouton, le second efface. Le bouton se désarme seul.             */

  var armTimer = null;

  function disarm() {
    if (!resetEl) return;
    clearTimeout(armTimer);
    armTimer = null;
    resetEl.classList.remove('arm');
    resetEl.textContent = 'Réinitialiser';
  }

  if (resetEl) {
    resetEl.addEventListener('click', function () {
      if (armTimer === null) {
        resetEl.classList.add('arm');
        resetEl.textContent = 'Confirmer ?';
        armTimer = setTimeout(disarm, 4000);
        return;
      }
      disarm();
      owned = [];
      fresh = {};
      save();
      filter = '';
      if (pickEl) pickEl.value = '';
      clearCooldown();
      paintHome();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowRight') { deck.classList.add('animate'); goTo(index + 1, true); }
    else if (e.key === 'ArrowLeft')  { deck.classList.add('animate'); goTo(index - 1, true); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
  });

  window.addEventListener('popstate', function () {
    if (open) closeViewer(true);
  });

  function onResize() {
    if (!open) return;
    deck.classList.remove('animate');
    deck.style.setProperty('--dx', 0);
    sizeDeck();
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () { setTimeout(onResize, 120); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

  paintHome();
  paintCooldown();
})();
