# The White Lotus — TCG

Site vitrine de la collection de cartes, pensé pour le téléphone
(lien partagé sur WhatsApp). Hébergé par GitHub Pages, construit par Jekyll.

## Ajouter une carte

Déposez l'image dans `cards/`. C'est tout : le site la liste automatiquement,
il n'y a aucun code à modifier et aucune liste à tenir à jour.

```
cards/12-nom-de-la-carte.jpg
      │  └─ nom affiché : « Nom de la Carte »
      └──── préfixe numérique : donne l'ordre d'affichage
```

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
| `assets/css/style.css` | Mise en page, carte 3D, effet holographique |
| `assets/js/app.js` | Plein écran, gestes, booster |
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
