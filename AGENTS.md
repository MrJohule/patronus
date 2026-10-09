# 🤖 PATRONUS — Guide de l'Assistant & Méthode de Travail
> Document de méthode et de continuité opérationnelle. Définit le contrat de collaboration Homme-IA, la répartition documentaire et les conventions techniques du projet.

---

## 1. Rôles de l'assistant dans ce projet

L'assistant intervient comme un pair technique et artistique sous la direction de l'auteur (Julien / MrJohule) avec 4 casquettes complémentaires :

| Rôle | Missions | Posture attendue |
|---|---|---|
| **Dramaturge** | Structure narrative, cohérence des actes, progression de l'arc interne | Veille au respect de la Bible (pas de magie démonstrative, porosité des mondes). |
| **Metteur en scène** | Rythme scénique, gestion de l'attention, silences, transitions | Privilégie le jeu épuré, le retour au calme et l'émotion organique. |
| **Script Doctor** | Cohérence du texte, authenticité du personnage, répliques | S'assure que le personnage ne parle jamais comme un "magicien de cabaret". |
| **Consultant magie** | Compatibilité des techniques d'illusionnisme, invisibilité des effets | Intègre les manipulations (biddle, forçage, empalmage, peek) de façon motivée par le jeu. |

---

## 2. Pipeline de co-création

```
1. Intention / Idée     → Définition du besoin émotionnel ou magique (Auteur)
2. Structuration         → Découpage de l'acte et transitions dans 01_STRUCTURE.md
3. Rédaction du script   → Écriture des répliques et didascalies dans script/Sxx.md
4. Fiche technique       → Description secrète des manipulations dans routines/Rxx.md
5. Compilation scénique  → Génération du livret de répétition PDF (build_pdf.js)
6. Ajustements plateau   → Retours après répétition réelle et recalibration du texte
```

---

## 3. Cartographie du dépôt & Règle de répartition

Chaque document possède une responsabilité unique :

```
PATRONUS/
├── 00_BIBLE.md              👑 L'ÂME : Concept, psychologie du personnage, règles du monde
├── 01_STRUCTURE.md          📐 LE SQUELETTE : Arcs, transitions, scénographie & objets
│
├── script/ (S01 à S04)      🎭 LA CHAIR : Texte dit (dialogues) et indications scéniques
├── routines/ (R01 à R03)    ⚙️ LES ROUAGES : Chronologie technique et manipulations secrètes
│
├── AGENTS.md                🤖 LA MÉTHODE : Contrat Homme-IA, conventions, outillage (ce fichier)
├── ROADMAP.md               📋 LE CAP : Source unique de vérité du suivi (acquis, en cours, à faire)
└── CHANGELOG.md             📜 LA MÉMOIRE : Journal chronologique des décisions structurantes
```

**Règles strictes de répartition :**
- Toute question de vision ou de règle du monde $\rightarrow$ `00_BIBLE.md`
- Tout découpage scénique, transition ou besoin d'objet $\rightarrow$ `01_STRUCTURE.md`
- Tout mot prononcé ou indication de jeu $\rightarrow$ `script/Sxx.md`
- Tout secret, forçage, calcul ou manipulation $\rightarrow$ `routines/Rxx.md`
- Tout suivi d'avancement ou todo-list $\rightarrow$ `ROADMAP.md` (interdiction de dupliquer l'état d'avancement ailleurs)

---

## 4. Conventions d'écriture des scripts (Sxx)

Pour garantir une harmonie visuelle, faciliter la répétition et permettre la compilation scénique (PDF) :
- **Texte dit (dialogues)** : corps normal, pleine largeur, très contrasté.
- ***Indications de jeu (didascalies)*** : italique, en bloc de citation markdown (`> *...*`), rédigées à la 3ᵉ personne (*Il / Le personnage / L'agent*), sans "Je", avec majuscule initiale et point final.
- **`Notes techniques & secrets`** : bloc code markdown (```), isolant les manipulations magiques du texte sans guillemets de citation.
- **Notes longues & variantes** : notes de bas de page markdown (`[^1]: ...`), préservant la fluidité du texte principal.
- **`...`** : temps de pause / silence marquant une respiration.
- **`<commentaires>`** : éléments ou accessoires spécifiques à déterminer.

---

## 5. Outillage technique : Générateur PDF

Le projet intègre un compilateur automatisé pour générer le livret scénique imprimable (format A4) :

* **Script** : `build_pdf.js` (Node.js)
* **Moteur de rendu** : Microsoft Edge Headless (`--print-to-pdf`)
* **Sorties générées** :
  * `scripts_complets.html` (rendu HTML intermédiaire stylé pour l'impression)
  * `PATRONUS_Scripts_Complets.pdf` (livret complet de 17 pages avec page de garde et sauts de page par acte)

**Commande de compilation :**
```bash
node build_pdf.js
```
