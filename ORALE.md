# 🎤 Script de présentation orale — Quincaillerie Pro

> **Durée estimée :** 10 à 12 minutes (version courte de 6 minutes en fin de document)
> **Ton :** naturel, confiant, pédagogique
> **Cible :** votre professeur
> **Fil conducteur :** on suit **une journée réelle** dans la quincaillerie, du matin à la fermeture.

---

## 0. AVANT DE COMMENCER (à faire 10 minutes avant)

- Lancer **WampServer** (icône verte), puis le backend (`php artisan serve`) et le frontend (`npm start`).
- Ouvrir http://localhost:4200 et vérifier qu'on arrive sur la page de connexion.
- Préparer **un devis** déjà enregistré (pour la conversion) et **un client avec un numéro de téléphone**.
- Mettre le navigateur en **plein écran** (F11) et le zoom à 100 %.
- Choisir le mode clair (plus lisible au projecteur). Le mode sombre sera montré en bonus.

---

## 1. INTRODUCTION (40 secondes)

> *(Face au professeur, sourire)*

« Bonjour monsieur / madame. Je vais vous présenter **Quincaillerie Pro**, une application web de gestion pour une quincaillerie.

Le problème de départ est simple : dans beaucoup de quincailleries, le stock est suivi sur un cahier, les dettes des clients sont notées à la main, et le soir on ne sait pas exactement combien d'argent devrait se trouver dans la caisse.

L'application répond à ça : elle gère **la vente au comptoir**, **le stock**, **les devis**, **les dettes des clients**, **la clôture de caisse** et les **rapports**.

Côté technique, c'est une **API Laravel** pour le backend, un frontend **Angular**, et une base **MySQL**. Je vais vous la présenter en suivant une journée de travail. »

---

## 2. CONNEXION ET RÔLES (40 secondes)

> *(Page de connexion)*

« Tout commence par la connexion. Chaque employé a son compte, et **chaque compte a un rôle** :

- l'**administrateur** a accès à tout, y compris les utilisateurs et les paramètres ;
- le **gestionnaire** s'occupe du catalogue, du stock et des rapports ;
- le **caissier** vend, encaisse et gère les clients.

Pour la démonstration, j'ai ces comptes en accès rapide. Je me connecte en **administrateur**. »

> *(Cliquer sur « Administrateur »)*

« La sécurité ne dépend pas seulement de l'interface : **c'est le serveur qui vérifie les droits** à chaque requête. Même si un caissier tapait l'adresse d'une page d'administration, l'API refuserait. Je vous le montrerai à la fin. »

---

## 3. TABLEAU DE BORD (1 minute)

> *(On arrive sur le tableau de bord)*

« Voici le tableau de bord. En haut, les **quatre indicateurs clés** :

1. les **ventes du jour**, comparées à hier ;
2. le **chiffre d'affaires du mois** ;
3. ce qui a **réellement été encaissé** ce mois, avec la **marge estimée** ;
4. les **créances clients** : l'argent que les clients nous doivent encore.

> *(Pointer le graphique)*

Le graphique compare, mois par mois, **ce qu'on a vendu** en orange et **ce qu'on a encaissé** en bleu. L'écart entre les deux, ce sont les ventes à crédit.

> *(Pointer les alertes)*

À droite, les **alertes de stock** : les produits qui passent sous leur seuil. On les retrouve aussi dans la **cloche** en haut. »

---

## 4. LE POINT DE VENTE (2 minutes) ⭐ moment fort

> *(Cliquer sur « Point de vente »)*

« Le matin, un client arrive au comptoir. Voici l'écran de caisse.

— Je clique sur les produits : ils s'ajoutent au panier. Le petit badge orange indique la quantité.
— Je peux aussi **chercher par nom ou par référence**, et avec une douchette code-barres il suffit de scanner.

> *(Choisir un client professionnel dans la liste)*

Ce client est un **professionnel**, un entrepreneur. Regardez : les prix passent automatiquement au **prix de gros** (en bleu). C'est aussi le cas pour n'importe quel client qui achète en grande quantité, par exemple à partir de 10 sacs de ciment.

> *(Montrer les totaux)*

Le sous-total, la **TVA à 18 %** et le total se calculent tout seuls.

> *(Cliquer sur « Encaisser »)*

Au moment de payer, je choisis le moyen de paiement : **espèces, Wave, Orange Money**, carte… Je saisis le montant reçu et l'application calcule **la monnaie à rendre**.

Si le client ne paie qu'une partie, c'est une **vente à crédit**. L'application l'autorise seulement si un client est choisi, et elle **refuse** si ce client dépasse son **plafond de crédit**.

> *(Valider)*

La vente est enregistrée. Je peux **imprimer le ticket** directement : c'est un format 80 mm, celui des imprimantes de caisse.

En arrière-plan, le stock de chaque produit a **diminué automatiquement**, et le mouvement est enregistré dans un journal. »

---

## 5. SUIVI DES VENTES, PAIEMENTS ET RETOURS (1 min 30)

> *(Cliquer sur « Ventes », ouvrir une vente partiellement payée)*

« Toutes les ventes sont ici. En ouvrant une vente, on voit les articles, les totaux et **l'historique des paiements**.

Ce client revient payer le reste ? J'enregistre un **paiement**, en Wave par exemple, et la vente passe automatiquement au statut **Payée**.

> *(Cliquer sur « Retour »)*

Autre cas fréquent : un client rapporte un article. Je fais un **retour partiel** : je choisis la quantité rapportée, l'application calcule **l'avoir**, remet l'article **en stock**, et si le client avait déjà payé, elle indique **combien lui rendre**.

> *(Pointer le bouton WhatsApp)*

Enfin, je peux envoyer le récapitulatif de la facture au client **par WhatsApp** en un clic. »

---

## 6. LES DEVIS (1 minute)

> *(Cliquer sur « Devis », ouvrir le devis préparé)*

« Un artisan prépare un chantier et demande un prix avant d'acheter. Je lui fais un **devis**. On peut y mettre des produits du catalogue mais aussi des **lignes libres**, comme le transport.

Point important : un devis **ne touche pas au stock**. Il a une date de validité, et je suis son statut : envoyé, accepté, refusé.

> *(Cliquer sur « Convertir en vente »)*

Le jour où le client accepte, je clique sur **Convertir en vente** : la vente est créée avec les mêmes prix, et c'est **à ce moment-là** que le stock diminue. »

---

## 7. STOCK ET APPROVISIONNEMENTS (1 minute)

> *(Cliquer sur « Approvisionnements », puis « Nouvel approvisionnement »)*

« Quand le fournisseur livre, j'enregistre la **réception**. Ce bouton ajoute automatiquement **tous les produits en alerte**, avec une quantité suggérée. Je valide, et le stock ainsi que le prix d'achat sont mis à jour.

> *(Cliquer sur « Mouvements »)*

Chaque entrée et chaque sortie de marchandise est tracée ici : vente, retour, livraison, correction d'inventaire… avec la date, la personne et le motif. On sait **toujours pourquoi** un stock a changé. »

---

## 8. CLÔTURE DE CAISSE (1 minute) ⭐ moment fort

> *(Cliquer sur « Caisse »)*

« Le soir, à la fermeture, le caissier fait la **clôture de caisse**.

L'application affiche ce qui a été encaissé dans la journée, **par moyen de paiement**, et donc combien d'**espèces** devraient se trouver dans le tiroir.

> *(Ouvrir l'aide au comptage, saisir quelques billets)*

Le caissier compte ses billets. L'écart s'affiche en direct : **caisse juste**, **excédent** ou **manquant**. On valide, et la clôture est archivée dans l'historique. Le gérant peut ainsi contrôler chaque journée. »

---

## 9. RAPPORTS (45 secondes)

> *(Cliquer sur « Rapports »)*

« Pour le gérant, la page **Rapports** donne sur la période choisie : le chiffre d'affaires net, la **marge**, le panier moyen, les ventes par catégorie, par vendeur et par moyen de paiement.

> *(Pointer « Stock dormant »)*

Le **stock dormant** liste les produits qui ne se sont pas vendus : de l'argent immobilisé sur les étagères. Tout s'exporte **en Excel**. »

---

## 9 bis. L'ASSISTANT DE GESTION (1 minute) ⭐ moment fort

> *(Cliquer sur le bouton « ✨ Assistant » en haut)*

« Pour finir, j'ai ajouté un **assistant de gestion**. À l'ouverture, il signale déjà ce qui demande de l'attention : ici, un produit sous le seuil d'alerte.

> *(Cliquer sur « Que dois-je commander ? »)*

Je lui demande quoi commander : il me donne la liste et les **quantités suggérées** d'après les ventes du dernier mois, avec le coût estimé.

> *(Taper « Qui me doit de l'argent ? », puis cliquer sur « Relance … »)*

Il liste les clients qui ont une dette, et il me **rédige le message de relance**, prêt à être envoyé sur WhatsApp.

Techniquement, c'est un **moteur de règles** qui comprend les questions courantes en français et répond avec les vraies données du magasin. Il fonctionne **hors ligne et gratuitement**. L'architecture est prête pour une vraie IA : en ajoutant une clé API Claude dans la configuration, les mêmes outils de données sont confiés au modèle, sans rien réécrire, et avec les mêmes droits d'accès. »

---

## 10. ADMINISTRATION ET DÉMONSTRATION DES DROITS (45 secondes)

> *(Cliquer sur « Paramètres »)*

« Dans les paramètres, on renseigne les informations de l'entreprise pour les factures (NINEA, RCCM), le taux de TVA et le **format des factures** : ticket, A5 ou A4. La base de données est aussi **sauvegardée automatiquement chaque soir**.

> *(Se déconnecter, se reconnecter en « Caissier »)*

Maintenant je me connecte en **caissier** : le menu est plus court, il n'y a plus de rapports, plus d'administration, et les prix d'achat sont masqués. C'est le principe du **moindre privilège**. »

---

## 11. CONCLUSION (40 secondes)

> *(Revenir au tableau de bord)*

« Pour résumer, Quincaillerie Pro couvre toute la journée d'une quincaillerie :

- **vendre vite** au comptoir, avec les paiements mobiles utilisés au Sénégal ;
- **ne jamais perdre le fil du stock**, avec un journal de chaque mouvement ;
- **suivre les dettes** des clients avec des plafonds de crédit ;
- **contrôler la caisse** chaque soir ;
- **piloter** l'activité avec des rapports.

Et un **assistant de gestion** répond aux questions sur le magasin.

Côté qualité, le projet a **56 tests automatisés** : 29 sur l'API et 27 sur l'interface. Ils vérifient par exemple qu'une vente est entièrement annulée si un produit manque en stock.

Merci pour votre attention. Avez-vous des questions ? »

---

## ❓ QUESTIONS PROBABLES DU PROFESSEUR

| Question | Réponse courte |
|---|---|
| **Comment garantissez-vous que le stock reste juste ?** | Toute modification passe par un seul service (`StockService`) qui enregistre un mouvement. Les ventes sont faites dans une **transaction** : si un produit manque, toute la vente est annulée. Une ligne de la base est aussi **verrouillée** pendant la vente pour éviter que deux caisses vendent le même dernier article. |
| **Comment gérez-vous la sécurité ?** | Authentification par jeton (Laravel Sanctum), toutes les routes protégées, vérification du **rôle côté serveur** (middleware), limite de 5 tentatives de connexion par minute, mots de passe chiffrés, comptes désactivables. |
| **Pourquoi Laravel et Angular ?** | Séparer l'API et l'interface permet de faire plus tard une application mobile qui réutilise la même API. Laravel fournit l'authentification, les validations et les transactions ; Angular structure bien une application de gestion avec beaucoup d'écrans. |
| **Comment sont numérotées les factures ?** | À partir de l'identifiant en base (`FAC-2026-000015`), donc unique même après une annulation. L'ancienne méthode comptait les ventes et créait des doublons. |
| **Que se passe-t-il si le client rapporte un article ?** | On crée un **avoir** : l'article revient en stock, la dette baisse, et si le client avait trop payé, un remboursement est enregistré. La facture d'origine n'est jamais modifiée. |
| **Et si le serveur tombe en panne ?** | Sauvegarde automatique de la base chaque soir, 30 jours conservés, téléchargeable depuis les paramètres et restaurable via phpMyAdmin. |
| **Comment avez-vous testé ?** | Tests fonctionnels PHPUnit sur une base SQLite en mémoire (ventes, stock, crédit, retours, devis, caisse, droits) et tests unitaires Angular (calculs du point de vente, session expirée…). |
| **Votre assistant, c'est de l'intelligence artificielle ?** | Aujourd'hui, c'est un moteur de règles : il reconnaît les questions par mots-clés et exécute les bonnes requêtes. C'est gratuit, rapide et fiable. Il est conçu pour brancher Claude (IA d'Anthropic) avec une simple clé API : l'IA appellerait alors les mêmes outils en lecture seule, avec les mêmes droits. Je l'ai testé avec un serveur simulé. |
| **L'IA pourrait-elle modifier les données ?** | Non. Elle n'a accès qu'à des outils en lecture seule, et c'est le serveur Laravel qui les exécute en vérifiant le rôle de l'utilisateur. Elle ne voit jamais directement la base de données. |
| **Quelles améliorations futures ?** | Étiquettes code-barres, photos des produits, application mobile pour les livreurs, synchronisation hors ligne. |

---

## ⏱️ VERSION COURTE (6 minutes)

Si le temps est limité, gardez uniquement : **1** Introduction → **3** Tableau de bord → **4** Point de vente → **5** Retour (sans les paiements) → **8** Clôture de caisse → **9 bis** Assistant → **11** Conclusion.

---

## 🎭 CONSEILS POUR BIEN PRÉSENTER À L'ORAL

### Gestes et posture
- **Pointez l'écran** avec le curseur quand vous citez un élément (« comme vous pouvez le voir ici… »).
- **Regardez votre professeur**, pas uniquement l'écran. Alternez : écran → professeur → écran.
- Gardez une **posture droite**.

### Rythme et voix
- Parlez **posément**, même si vous êtes stressé.
- Faites de **petites pauses** entre chaque partie.
- Montez un peu le ton sur les moments forts : **point de vente**, **retour**, **clôture de caisse**.

### Organisation pratique
- Faites **une répétition complète** la veille, chronomètre en main.
- Préparez les données (un devis, un client avec téléphone, une vente partiellement payée).
- Ayez un **plan B** : si une fonctionnalité bloque, passez à la suivante en disant « normalement, ici on voit aussi… ».

### Phrases-clés à utiliser naturellement

| Situation | Ce que vous dites |
|---|---|
| Transition | « Maintenant, passons à… » |
| Montrer | « Ici, comme vous pouvez le voir… » |
| Action | « Je clique sur… » / « Je sélectionne… » |
| Résultat | « Et automatiquement… » |
| Insister | « Le vrai problème que ça règle, c'est… » |

---

**Bonne présentation ! 🚀**
