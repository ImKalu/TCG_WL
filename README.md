# The White Lotus — TCG

Site vitrine de la collection de cartes, pensé pour le téléphone
(lien partagé sur WhatsApp). Hébergé par GitHub Pages, construit par Jekyll.

## Comment ça se joue

L'accueil part vide : on n'y voit que le bouton **Ouvrir un booster**. Chaque
booster tire **3 cartes** face cachée ; une carte retournée pour la première
fois rejoint la collection et reste affichée sur l'accueil. Le tirage pioche
d'abord parmi les cartes manquantes, donc chaque booster fait avancer le deck
jusqu'à ce qu'il soit complet.

Un **délai d'une minute** sépare deux boosters : le bouton s'éteint et affiche
le temps restant. Le tout premier booster est immédiat. Le délai est retenu
comme une date d'échéance et non comme un décompte, donc fermer l'onglet ou
verrouiller le téléphone ne permet pas de tricher.

Dès qu'une carte est collectionnée, une barre apparaît sous le bouton :

* **Tri** — un menu déroulant limite l'affichage à une catégorie. Le compteur
  suit (« Personnage · 4 / 12 ») et le plein écran ne fait alors défiler que
  les cartes de cette catégorie. « Toutes » est le choix par défaut, rétabli à
  chaque chargement.
* **Réinitialiser** — vide la collection et rend le droit au booster
  immédiatement. Deux appuis sont demandés : le premier arme le bouton
  (« Confirmer ? »), le second efface.

La collection est conservée par le navigateur (`localStorage`, clés
`wl-tcg-collection-v2` et `wl-tcg-next-booster`). Elle est donc propre à chaque
téléphone et à chaque navigateur : deux personnes qui ouvrent le lien
construisent deux decks distincts. Le bouton **Réinitialiser** suffit à
repartir de zéro.

Une carte est repérée par son nom de fichier, pas par son URL : la déplacer
d'une catégorie à l'autre ne la fait pas disparaître des collections déjà
constituées. Les collections au format précédent, qui stockaient des URL, sont
converties automatiquement au premier chargement.

En navigation privée, le stockage peut être refusé : la collection ne dure
alors que le temps de la visite.

## Ajouter une carte

Déposez l'image dans le sous-dossier de sa catégorie. C'est tout : le site la
liste automatiquement, il n'y a aucun code à modifier et aucune liste à tenir
à jour.

```
cards/personnage/17-nom-de-la-carte.jpg
      │          │  └─ nom affiché : « Nom de la Carte »
      │          └──── préfixe numérique : donne l'ordre d'affichage
      └─────────────── catégorie : alimente le menu de tri
```

* **La catégorie** est le nom du sous-dossier, capitalisé pour l'affichage.
  Les dossiers existants sont `personnage/`, `dresseur/`, `lieu/` et
  `objet/`.
  **Créer un nouveau sous-dossier ajoute une entrée au menu de tri**, sans
  toucher au code. Changer une carte de catégorie, c'est déplacer son fichier.
* Une image posée directement dans `cards/` reste valable : elle n'a pas de
  catégorie et n'apparaît que sous « Toutes ».

* **L'ordre** vient du préfixe `01-`, `02-`, `03-`… Pour glisser une carte
  entre deux autres, renommez simplement les fichiers.
* **Le nom affiché** vient du reste du nom de fichier : les tirets deviennent
  des espaces et chaque mot est capitalisé. Les particules (`de`, `du`, `la`,
  `le`, `les`, `et`…) restent en minuscule : `03-comte-de-port-canto.jpg`
  s'affiche « Comte de Port Canto ».
* **Formats acceptés** : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`.
* **Le dos commun** est `cards/dos.jpg`. Ce fichier n'est jamais listé comme
  une carte ; son nom se règle dans `_config.yml` (clé `back`).

Poussez sur `main` : GitHub Pages reconstruit le site tout seul en ~1 minute.

### Poids des images

Les cartes sont servies telles quelles, en chargement différé. Visez environ
1000 px de large et moins de 700 Ko par image pour que ça reste rapide en 4G.
Les sources en pleine résolution sont conservées en local dans `_originals/`,
volontairement hors du dépôt (voir `.gitignore`).

## Comment c'est fait

Le listing repose sur `site.static_files` filtré sur `/cards/` — voir la boucle
dans [`index.html`](index.html). Pas de framework, pas de CDN, pas de police
distante : une feuille de style et un fichier JavaScript, tous deux locaux.

| Fichier | Rôle |
|---|---|
| `index.html` | Listing des cartes et balises Open Graph |
| `assets/css/style.css` | Mise en page, retournement de la carte |
| `assets/js/app.js` | Collection, boosters, plein écran, gestes |
| `assets/og.jpg` | Vignette affichée par WhatsApp |
| `_config.yml` | Titre, description, URL du site, dos des cartes |

## Aperçu local

Jekyll n'est pas nécessaire pour vérifier la mise en page :

```bash
python3 -m http.server 8777
```

Pour une construction fidèle (y compris le listing Jekyll) :

```bash
bundle exec jekyll serve
```

## À retenir si vous changez l'adresse du site

`url` et `baseurl` dans `_config.yml` servent à fabriquer le lien absolu de
l'image Open Graph. WhatsApp a besoin d'une URL absolue : si le dépôt est
renommé ou déplacé, mettez ces deux valeurs à jour.
