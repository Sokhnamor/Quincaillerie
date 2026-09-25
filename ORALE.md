# 🎤 Script de présentation orale — Application de Gestion de Quincaillerie

> **Durée estimée :** 5 à 7 minutes  
> **Ton :** naturel, confiant, pédagogique  
> **Cible :** votre professeur

---

## 1. INTRODUCTION RAPIDE (30 secondes)

> *(Face au professeur, debout ou assis devant l'écran, sourire)*

« Bonjour monsieur / madame. Aujourd'hui je vais vous présenter mon projet : **une application de gestion de quincaillerie**.

Elle permet de gérer facilement les **produits**, le **stock**, les **clients**, les **fournisseurs** et les **ventes** d'une quincaillerie. Tout est centralisé : on sait en temps réel ce qu'on a en stock, ce qu'on a vendu, et ce qui manque.

L'application est développée avec **Angular** pour le frontend et **Laravel** pour l'API backend.»

---

## 2. PAGE DE CONNEXION

> *(Montrer l'écran de login avec le logo outil / "Gestion Quincaillerie")*

« On commence ici, sur la **page de connexion**.

C'est la porte d'entrée de l'application. Seuls les utilisateurs authentifiés peuvent accéder aux données. Ici je vais me connecter avec mon compte.

— Je saisis mon **email**…  
— Et mon **mot de passe**…  
— Et là, **je clique sur "Se connecter"**.

Comme vous pouvez le voir, on peut aussi cocher "Se souvenir de moi" pour rester connecté. Et si j'ai un message d'erreur, il s'affiche juste ici en rouge.»

> *(Cliquer sur le bouton de connexion)*

---

## 3. TABLEAU DE BORD (DASHBOARD)

> *(On arrive sur le Dashboard — geste vers les 4 cartes en haut)*

« Et voilà, on arrive sur le **tableau de bord**.

Comme vous pouvez le voir, tout est résumé d'un coup d'œil. On a **quatre cartes** ici :

1. **Ventes du jour** : combien j'ai vendu aujourd'hui, avec la croissance par rapport à hier.
2. **Ventes du mois** : le total du mois en cours.
3. **Valeur du stock** : la valeur totale de tout ce qui est en magasin.
4. **Stock faible** : le nombre de produits qui approchent la rupture.

> *(Pointer vers le graphique à gauche)*

Ici on a un **graphique des ventes par catégorie** : ça permet de voir quels types de produits se vendent le mieux — outils, peinture, quincaillerie, etc.

> *(Pointer vers la carte de droite)*

À côté, il y a les **alertes stock** : si un produit est presque en rupture, il apparaît ici en orange. Si tout va bien, il écrit "Tout va bien, aucun produit en rupture".

> *(Scroller vers le bas)*

Et en bas, on voit les **ventes récentes** : numéro de facture, client, montant, statut et date. On voit bien les badges colorés : vert pour **Payé**, orange pour **Partiel**, rouge pour **Impayé**.»

---

## 4. GESTION DES PRODUITS

> *(Cliquer sur "Produits" dans le menu latéral à gauche)*

« Maintenant je vais aller dans la **gestion des produits**.

Ici on voit la liste complète des produits. On a : le nom, la catégorie, le fournisseur, le prix d'achat, le prix de vente, la quantité en stock, et le statut.

> *(Pointer un produit avec le badge vert/orange/rouge)*

Le statut change automatiquement : **En stock** en vert, **Faible** en orange si on passe sous le seuil d'alerte, et **Rupture** en rouge si c'est à zéro.

### Ajouter un produit

« Je vais maintenant vous montrer comment **ajouter un produit**.

— **Je clique sur le bouton "Nouveau produit"** en haut à droite.
— Un formulaire s'ouvre. Je remplis le **nom du produit**… par exemple "Marteau de charpentier".
— Le **prix d'achat**… disons 2500 CFA.
— Le **prix de vente**… 3500 CFA.
— La **quantité en stock**… 50 unités.
— Le **seuil d'alerte**… mettons 10. Dès qu'il restera 10 marteaux, l'application m'enverra une alerte.
— Je choisis la **catégorie**… et le **fournisseur**.
— Et là, **je clique sur "Enregistrer"**.

Le produit apparaît immédiatement dans la liste."

### Modifier un produit

« Si je veux **modifier** un produit, c'est simple.

— **Je clique sur l'icône crayon** ici, à droite du produit.
— Le même formulaire s'ouvre avec les données déjà remplies.
— Je change ce que je veux… par exemple le prix de vente ou le stock.
— **J'enregistre**, et c'est mis à jour instantanément."

### Supprimer un produit

« Pour **supprimer**, je clique sur **l'icône poubelle**.

Une confirmation s'affiche : "Êtes-vous sûr de vouloir supprimer ?"

— Je confirme… et le produit disparaît de la liste.

On peut aussi **rechercher** un produite par son nom en haut, ou **filtrer par catégorie** avec le menu déroulant. Et il y a la pagination en bas si on a beaucoup de produits.»

---

## 5. GESTION DU STOCK

> *(Rester sur la page Produits ou retourner au Dashboard pour les alertes)*

« Concernant la **gestion du stock**, elle est entièrement **automatique**.

Quand on crée un produit, on définit sa quantité initiale. Mais le stock évolue tout seul :

- **Quand on vend un produit**, le stock diminue automatiquement.
- **Si on supprime une vente**, le stock est **restauré**.
- Si le stock passe sous le seuil d'alerte, le produit passe en **orange**.
- S'il atteint zéro, il passe en **rouge**.

> *(Retourner sur le Dashboard, pointer les alertes)*

Et comme on a vu tout à l'heure, ces alertes remontent directement sur le **tableau de bord**, ici dans la carte "Stock faible". Ça permet de réagir vite avant la rupture.»

---

## 6. ENREGISTREMENT D'UNE VENTE

> *(Cliquer sur "Ventes" dans le menu latéral)*

« Maintenant, passons aux **ventes**.

C'est probablement la partie la plus importante : enregistrer une vente et générer une facture.

On voit ici la liste des ventes déjà effectuées : numéro de facture, client, total, TVA, statut de paiement et date.

### Créer une nouvelle vente

« Je vais **créer une nouvelle vente**.

— **Je clique sur "Nouvelle vente"**.
— D'abord, je **sélectionne le client** dans la liste.
— Ensuite, j'**ajoute les produits** : je choisis un produit dans le menu, je mets la quantité… par exemple 2 marteaux… et **je clique sur le "+"**.

> *(Montrer le tableau des articles ajoutés)*

L'article apparaît dans le tableau avec le prix unitaire, la quantité et le sous-total. Je peux ajouter plusieurs produits. Si je me trompe, **je clique sur la croix** pour retirer un article.

> *(Pointer les totaux en bas)*

En bas, tout se calcule **automatiquement** :
- le **sous-total**
- la **TVA à 19%**
- et le **total général**

— Une fois que tout est bon, **j'enregistre la vente**.

### Impact sur le stock

« Et là, l'application fait deux choses en arrière-plan :

1. Elle **génère un numéro de facture** automatiquement, par exemple SAL-20250115-00001.
2. Elle **décrémente le stock** de chaque produit vendu.

> *(Retourner sur la page Produits ou montrer le dashboard)*

Si je retourne dans les produits, la quantité du marteau a diminué de 2. Et si le stock passe sous le seuil, le statut passe en orange. C'est totalement lié."

### Voir le détail et télécharger la facture

« Si je veux voir une vente en détail, **je clique sur l'icône œil**.

Un panneau s'ouvre sur la droite avec tous les détails : facture, client, date, statut, articles, et les totaux.

> *(Pointer le bouton PDF)*

Et là, **je peux télécharger la facture en PDF** d'un seul clic. Le PDF est généré automatiquement avec le logo de l'entreprise, les infos client, et le détail des articles.

Je peux aussi **changer le statut** de la vente ici : Payé, Impayé, ou Partiel. Ça met à jour tout de suite.»

---

## 7. RÉSULTAT FINAL & CONCLUSION

> *(Retourner sur le Dashboard pour la conclusion)*

« Pour résumer, cette application de gestion de quincaillerie permet de :

- **Sécuriser l'accès** avec une authentification par email et mot de passe.
- **Visualiser en temps réel** les ventes, le stock et les alertes sur un tableau de bord clair.
- **Gérer facilement les produits** : ajout, modification, suppression, recherche et filtre.
- **Suivre le stock automatiquement**, avec des alertes quand un produit est faible ou en rupture.
- **Enregistrer des ventes** avec calcul automatique de la TVA et génération de factures PDF.
- **Exporter les données** en PDF ou Excel si besoin.

Tout est interconnecté : les ventes impactent le stock, le stock alimente les alertes, et les alertes remontent sur le dashboard. L'utilisateur a une vision globale et immédiate de son activité.

Voilà, merci pour votre attention. Avez-vous des questions ? »

---

## 🎭 CONSEILS POUR BIEN PRÉSENTER À L'ORAL

### Gestes et posture
- **Pointez l'écran** avec votre doigt ou le curseur quand vous citez un élément ("comme vous pouvez le voir ici…").
- **Regardez votre professeur**, pas uniquement l'écran. Alternez : écran → professeur → écran.
- Gardez une **posture droite**, ne vous affaissez pas sur la chaise.

### Rythme et voix
- Parlez **posément** : pas trop vite, même si vous êtes stressé.
- Faites de **petites pauses** entre chaque étape (respirez).
- Variez l'**intonation** : montez un peu le ton sur les points importants (alertes, automatisation, PDF).

### Organisation pratique
- **Ouvrez les pages à l'avance** dans votre navigateur pour éviter les temps de chargement.
- **Pré-remplissez** quelques données (produits, clients) avant la présentation pour gagner du temps.
- Ayez un **plan B** : si une fonctionnalité bug, passez à la suivante en disant "normalement, cela fait aussi…".

### Interaction
- Demandez **"Vous voyez bien ?"** ou **"Est-ce clair ?"** de temps en temps pour créer du lien.
- Si le professeur pose une question en cours, **répondez brièvement** puis reprenez le fil.

### Phrases-clés à utiliser naturellement
| Situation | Ce que vous dites |
|---|---|
| Transition | "Maintenant, je vais passer à…" |
| Montrer | "Ici, comme vous pouvez le voir…" |
| Action | "Je clique sur…" / "Je sélectionne…" |
| Résultat | "Et voilà, automatiquement…" |
| Insister | "L'avantage ici, c'est que…" |

---

**Bonne présentation ! 🚀**

