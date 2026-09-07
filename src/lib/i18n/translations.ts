export type Locale = 'fr' | 'en';

export const LOCALE_COOKIE = 'kriyo-locale';
export const DEFAULT_LOCALE: Locale = 'fr';

function dict<T extends Record<string, unknown>>(value: T) {
  return value;
}

const fr = dict({
  app: {
    name: 'Kriyo',
    description: 'PWA de discipline de trading pour prop firms.'
  },
  common: {
    loading: 'Chargement...',
    save: 'Enregistrer',
    cancel: 'Annuler',
    close: 'Fermer',
    confirm: 'Confirmer',
    open: 'Ouvrir',
    languageLabel: 'Langue'
  },
  nav: {
    dashboard: 'Dashboard',
    accounts: 'Comptes',
    engine: 'Moteur',
    tracking: 'Suivi',
    education: 'Éducation'
  },
  appShell: {
    brand: 'Kriyo'
  },
  sas: {
    title: 'Sas de Sécurité',
    subtitle: 'Porte obligatoire avant toute session de trading.',
    groupPsy: 'Psy',
    groupTech: 'Tech',
    criteria: {
      tension: { label: 'Tension', description: 'État mental et physique stable' },
      ecran: { label: 'Écran', description: 'Temps d’écran sous contrôle' },
      telephone: { label: 'Téléphone', description: 'Distractions minimisées' },
      macro: { label: 'Macro', description: 'Calendrier macro acceptable' },
      alignement: { label: 'Alignement', description: 'Contexte marché aligné' }
    },
    badgeSaved: 'Session validée',
    badgeLocked: 'Session bloquée',
    badgeControl: 'Sas en contrôle',
    scoreLabel: 'Score',
    loadingMsg: 'Chargement de la validation du jour...',
    readyMsg: 'Active les 5 critères puis valide la session.',
    savedMsg: 'Sas déjà validé aujourd’hui. Tu peux entrer dans le dashboard.',
    validatingMsg: 'Sas validé. Redirection vers le dashboard...',
    lockedMsgPrefix: 'Un ou plusieurs critères sont à OFF. Réessai possible dans',
    lockedTitle: 'Session verrouillée',
    lockExpiredMsg: 'Le verrou est levé. Tu peux retenter ta validation.',
    changedMsg: 'Les critères ont changé. Revalide la session.',
    errorLoadMsg: 'Impossible de charger le sas localement.',
    errorSaveMsg: 'Impossible d’enregistrer la validation locale.',
    lastValidationPrefix: 'Dernière validation locale:',
    noValidation: 'Aucune validation locale enregistrée aujourd’hui.',
    timerCountdownLabel: 'Réessai dans',
    timerExpiredLabel: 'Réessai disponible',
    validateButton: 'Valider ma Session',
    lockedButton: 'Sas verrouillé',
    footerNote: 'Le sas est persistant en IndexedDB. En cas de critère refusé, l’accès reste bloqué 30 minutes avant un nouvel essai.'
  },
  engine: {
    title: 'Moteur Kriyo',
    subtitle: 'Confluence 9/9, sélection des comptes et score temps réel.',
    selectionTitle: 'Sélection des comptes',
    selectionDescription: 'Choisis les comptes actifs sur lesquels tu veux exécuter le setup.',
    activeBadge: 'actifs',
    noAccounts: 'Aucun compte disponible. Va d’abord dans Comptes & Onboarding.',
    selectedLabel: 'Sélectionné',
    activateLabel: 'Activer',
    scoreCardTitle: 'Score de décision',
    scoreCardDescription: 'Le bouton d’exécution s’active uniquement à 9/9 avec au moins un compte sélectionné.',
    groupVR: 'VR',
    groupEP: 'EP',
    groupVP: 'VP',
    groupVRFull: 'Valeur Réelle',
    groupEPFull: 'Effet Perçu',
    groupVPFull: 'Valeur Projetée',
    groupComplete: 'Verrouillé',
    questions: {
      vrStructure: { label: 'Structure validée ?', description: 'La structure de marché est claire et validée.' },
      vrLiquidity: { label: 'Liquidité prise ?', description: 'Le setup cible une zone de liquidité identifiable.' },
      vrTrend: { label: 'Tendance alignée ?', description: 'Le trade suit la tendance dominante.' },
      epFomo: { label: 'Zéro FOMO ?', description: 'La décision n’est pas dictée par l’urgence.' },
      epCrowd: { label: 'Biais de foule identifié ?', description: 'L’analyse n’est pas copiée du consensus.' },
      epLoss: { label: 'Perte acceptée ?', description: 'La perte éventuelle est mentalement acceptée.' },
      vpRr: { label: 'Ratio R/R >= 2 ?', description: 'Le ratio risque/récompense est suffisant.' },
      vpInvalid: { label: 'Invalidation claire ?', description: 'Le stop est défini techniquement.' },
      vpA: { label: 'Setup A ou A+ ?', description: 'Le setup respecte la classe d’excellence.' }
    },
    answerYes: 'Oui',
    answerNo: 'Non',
    executeButton: 'Exécuter le Trade',
    incompleteButton: 'Score incomplet',
    executingButton: 'Exécution...',
    loadingMsg: 'Chargement du moteur...',
    readyWithAccountsMsg: 'Sélectionne les comptes puis évalue le setup.',
    readyNoAccountsMsg: 'Ajoute d’abord au moins un compte dans Comptes & Onboarding.',
    executingMsg: 'Création du trade local...',
    syncedMsg: 'Trade approuvé localement et synchronisé sur Supabase. Redirection vers le suivi...',
    pendingSyncMsg: 'Trade approuvé localement. Synchronisation Supabase en attente. Redirection vers le suivi...',
    errorLoadMsg: 'Impossible de charger le moteur localement.',
    errorSaveMsg: 'Impossible de créer le trade localement.'
  },
  gamification: {
    progressTitle: 'Progression du trader',
    progressDescription: 'Chaque setup exécuté à 9/9 fait progresser ton rang de discipline.',
    rankLabel: 'Rang',
    xpLabel: 'XP',
    levelLabel: 'Niveau',
    streakLabel: 'Série en cours',
    bestStreakLabel: 'Meilleure série',
    perfectSetupsLabel: 'Setups parfaits',
    nextRankPrefix: 'Prochain rang à',
    ranks: {
      novice: 'Novice',
      disciplined: 'Discipliné',
      sniper: 'Sniper',
      elite: 'Élite'
    },
    perfectToast: 'Setup parfait 9/9 ! XP +100.',
    groupCompleteToast: 'Groupe verrouillé !',
    comboLabel: 'Combo'
  },
  accounts: {
    title: 'Comptes & Onboarding',
    subtitle: 'Configuration des comptes prop firm et des profils de risque.',
    creationTitle: 'Création locale',
    creationDescription: 'Nom, capital et payout suffisent. Le profil de risque est assigné automatiquement.',
    sprintBadge: 'Sprint 2',
    nameLabel: 'Nom du compte',
    namePlaceholder: 'FTMO 5K',
    capitalLabel: 'Capital initial',
    payoutLabel: 'Type de payout',
    addButton: 'Ajouter un compte',
    savingButton: 'Sauvegarde...',
    activeRiskProfilesTitle: 'Profils de risque actifs',
    registeredAccountsTitle: 'Comptes enregistrés',
    noAccountsYet: 'Aucun compte local pour le moment.',
    createdPrefix: 'Créé',
    seededLabel: 'seeded',
    presetLabel: 'preset',
    tpForcedPrefix: 'TP forcé',
    dailyDDLabel: 'Daily DD',
    maxDDLabel: 'Max DD',
    loadingMsg: 'Chargement des comptes locaux...',
    loadedMsg: 'Comptes locaux chargés.',
    noneYetMsg: 'Aucun compte pour le moment.',
    errorLoadMsg: 'Impossible de charger les comptes locaux.',
    invalidFormMsg: 'Renseigne un nom de compte et un capital valide.',
    savingMsg: 'Sauvegarde du compte et du profil de risque...',
    syncedMsgPrefix: 'Compte enregistré localement et synchronisé sur Supabase. Profil de risque configuré:',
    savedLocalMsgPrefix: 'Compte enregistré localement. Profil de risque configuré:',
    pendingSyncMsgPrefix: 'Compte enregistré localement. Synchronisation Supabase en attente. Profil de risque configuré:',
    errorSaveMsg: 'Impossible d’enregistrer le compte localement.'
  },
  tradeClosure: {
    takeProfitForcedLabel: 'Take Profit forcé',
    takeProfitForcedReason: 'Take Profit forcé atteint à {amount}.',
    dailyDrawdownLabel: 'Stop-Day actif',
    dailyDrawdownReason: 'Daily DD atteint à {amount}.',
    maxDrawdownLabel: 'Max DD atteint',
    maxDrawdownReason: 'Max DD atteint à {amount}.',
    loggedLabel: 'Résultat journalisé',
    loggedReason: 'PnL journalisé: {amount}.'
  },
  tracking: {
    title: 'Suivi des Positions',
    subtitle: 'Jauges de santé, trades ouverts et clôture PnL.',
    healthViewTitle: 'Vue de santé',
    healthViewDescription: 'Chaque compte affiche son état de risque et ses trades ouverts.',
    accountsSuffix: 'comptes',
    noLinkedAccounts: 'Aucun compte lié. Crée un compte dans Comptes & Onboarding, puis exécute un trade depuis le moteur.',
    noTradeBadge: 'Aucun trade',
    waitingForValidTrade: 'En attente d’un trade validé.',
    tradeOpenedOnPrefix: 'Trade',
    onDate: 'le',
    activeTradesTitle: 'Trades actifs',
    activeTradesDescription: 'Les positions créées par le moteur apparaissent ici.',
    noActiveTrades: 'Aucun trade actif pour le moment.',
    openedOnPrefix: 'Ouvert le',
    pnlPending: 'PnL en attente',
    pnlPrefix: 'PnL',
    closePositionButton: 'Fermer la position',
    closureRecorded: 'Cloture enregistree',
    refreshButton: 'Rafraîchir le suivi',
    loadingMsg: 'Chargement du suivi...',
    loadedMsg: 'Trades locaux chargés.',
    noneOpenMsg: 'Aucun trade ouvert pour le moment.',
    errorLoadMsg: 'Impossible de charger le suivi localement.',
    invalidPnlMsg: 'Renseigne un PnL valide.',
    closingMsg: 'Cloture du trade et calcul des regles...',
    syncedSuffix: 'Trade synchronise sur Supabase.',
    pendingSyncSuffix: 'Synchronisation Supabase en attente.',
    errorCloseMsg: 'Impossible de cloturer le trade localement.',
    modalTitle: 'Cloture PnL',
    finalPnlLabel: 'PnL final',
    typeToConfirm: 'Saisis un PnL pour calculer le statut final.',
    cancelButton: 'Annuler',
    validateResultButton: 'Valider le résultat',
    closingButton: 'Cloture...'
  },
  auth: {
    emailLabel: 'Email',
    passwordLabel: 'Password',
    loginButton: 'Se connecter',
    signupButton: 'Créer le compte',
    loadingButton: 'Chargement...',
    missingSupabaseVars: 'Variables Supabase manquantes. Renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    accountCreatedMsg: 'Compte créé. Vérifie ta boîte mail si la confirmation est activée.',
    defaultHelper: 'L’authentification Supabase email/password est branchée directement depuis le navigateur.'
  },
  login: {
    badge: 'Accès sécurisé',
    title: 'Connexion Kriyo',
    subtitle: 'Entrez votre compte Supabase pour accéder au sas, au moteur et au suivi.',
    createAccountLink: 'Créer un compte'
  },
  signup: {
    badge: 'Nouveau compte',
    title: 'Créer un compte',
    subtitle: 'Préparez votre espace de trading avant de brancher la logique métier.',
    alreadyHaveAccountLink: 'J’ai déjà un compte'
  },
  dashboard: {
    title: 'Tableau de Bord',
    subtitle: 'Hub central des comptes, du moteur et du suivi.',
    sprintBadge: 'Sprint 2',
    bannerTitle: 'Sas et onboarding comptes en cours',
    bannerDescription: 'Le sas est persistant localement, et l’ajout de comptes prop firm est maintenant branché en onboarding.',
    inProgressBadge: 'En cours',
    pillar1Title: 'Pilier 1',
    pillar1Subtitle: 'Sas de Sécurité',
    pillar2Title: 'Pilier 2',
    pillar2Subtitle: 'Moteur 9/9',
    pillar3Title: 'Pilier 3',
    pillar3Subtitle: 'Routage prop firm',
    openLabel: 'Ouvrir'
  },
  education: {
    title: 'Éducation & Glossaire',
    subtitle: 'Repères rapides pour les règles Kriyo, la psychologie de trading et le vocabulaire.',
    lightV1: 'V1 légère',
    heroTitle: 'Les règles avant la vitesse',
    heroDescription: 'Cette section pose les définitions utiles pour lire les écrans Kriyo sans ambiguïté.',
    staticBadge: 'Statique',
    pillars: [
      { title: 'Sas de Sécurité', badge: 'Pilier 1', text: 'Onboarding psycho-technique à 5 critères. Si un critère est OFF, la session est bloquée 30 minutes avant un nouvel essai.' },
      { title: 'Moteur 9/9', badge: 'Pilier 2', text: 'Le setup n’est exécutable qu’à score maximal. Pas de score intermédiaire toléré.' },
      { title: 'Routage Prop Firm', badge: 'Pilier 3', text: 'Chaque compte hérite d’un profil de risque qui force la logique de gestion: agressif, modéré ou conservateur.' }
    ],
    glossaryTitle: 'Glossaire',
    glossary: [
      ['Daily DD', 'Perte maximale autorisée sur la journée de trading.'],
      ['Max DD', 'Perte cumulée maximale autorisée sur le compte.'],
      ['Payout on-demand', 'Extraction des profits à la demande, généralement plus agressive.'],
      ['Confluence', 'Accumulation de signaux qui renforce la qualité du setup.'],
      ['Invalidation', 'Niveau qui invalide le scénario et impose la sortie.']
    ],
    programTitle: 'Programme — Psychologie du Trading',
    programIntro: 'Cinq modules courts, construits à partir des pratiques les plus citées chez les traders prop firm et les formateurs en psychologie du trading, pour muscler la discipline entre deux sessions.',
    modules: [
      {
        title: 'Module 1 — L’aversion à la perte',
        summary: 'La douleur d’une perte est environ deux fois plus intense que le plaisir d’un gain équivalent.',
        tips: [
          'Accepte le risque avant d’entrer: si la perte du stop n’est pas supportable, la taille de position est trop grande.',
          'Ne déplace jamais un stop loss pour « laisser une chance » au marché — c’est l’aversion à la perte qui parle, pas le plan.',
          'Journalise chaque trade fermé, gagnant ou perdant, avec l’émotion ressentie au moment de la clôture.'
        ]
      },
      {
        title: 'Module 2 — Sortir du FOMO',
        summary: 'Les trades pris par peur de rater une opportunité affichent un taux de réussite très inférieur aux trades planifiés.',
        tips: [
          'Une opportunité manquée ne coûte rien: un mauvais trade pris dans l’urgence, si.',
          'Si l’envie d’entrer vient après avoir vu le prix bouger sans toi, c’est un signal FOMO — repasse par le moteur 9/9.',
          'Fixe à l’avance une liste de setups valides pour la session; tout ce qui n’en fait pas partie attend le lendemain.'
        ]
      },
      {
        title: 'Module 3 — Casser le revenge trading',
        summary: 'Reprendre une position immédiatement après une perte pour « se refaire » transforme une perte gérable en drawdown sévère.',
        tips: [
          'Après une perte hors plan ou deux pertes consécutives, impose-toi une pause d’au moins 30 minutes avant de revalider le sas.',
          'Le prochain trade ne doit rien à ta position: pas plus gros, pas plus rapide, pas plus impulsif.',
          'Si l’envie de « se refaire tout de suite » est forte, c’est précisément le signal qu’il ne faut pas trader.'
        ]
      },
      {
        title: 'Module 4 — Le processus plutôt que le résultat',
        summary: 'Réussir une évaluation prop firm ne dépend pas de gagner chaque trade, mais de répéter un comportement cohérent dans la durée.',
        tips: [
          'Juge une session sur le respect du plan, pas sur le PnL du jour.',
          'Un setup A/A+ perdant correctement exécuté reste une victoire de process.',
          'Note une intention claire avant chaque session: ce que tu vas faire, pas ce que tu espères gagner.'
        ]
      },
      {
        title: 'Module 5 — Routine et récupération',
        summary: 'La discipline se construit avant et après la session, pas seulement pendant.',
        tips: [
          'Avant: vérifie calendrier macro, niveau d’énergie et setup d’écran — c’est exactement ce que le sas Kriyo formalise.',
          'Pendant: une respiration lente de quelques secondes entre deux décisions réduit l’impulsivité.',
          'Après: journalise trades et émotions; les patterns récurrents de tension ou de précipitation apparaissent après quelques semaines, pas après une session.'
        ]
      }
    ]
  }
});

const en = dict({
  app: {
    name: 'Kriyo',
    description: 'Trading discipline PWA for prop firm traders.'
  },
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    open: 'Open',
    languageLabel: 'Language'
  },
  nav: {
    dashboard: 'Dashboard',
    accounts: 'Accounts',
    engine: 'Engine',
    tracking: 'Tracking',
    education: 'Education'
  },
  appShell: {
    brand: 'Kriyo'
  },
  sas: {
    title: 'Security Gate',
    subtitle: 'Mandatory checkpoint before any trading session.',
    groupPsy: 'Psych',
    groupTech: 'Tech',
    criteria: {
      tension: { label: 'Tension', description: 'Mental and physical state stable' },
      ecran: { label: 'Screen time', description: 'Screen time under control' },
      telephone: { label: 'Phone', description: 'Distractions minimized' },
      macro: { label: 'Macro', description: 'Macro calendar acceptable' },
      alignement: { label: 'Alignment', description: 'Market context aligned' }
    },
    badgeSaved: 'Session validated',
    badgeLocked: 'Session locked',
    badgeControl: 'Gate check in progress',
    scoreLabel: 'Score',
    loadingMsg: 'Loading today’s validation...',
    readyMsg: 'Turn on all 5 criteria then validate the session.',
    savedMsg: 'Gate already validated today. You can enter the dashboard.',
    validatingMsg: 'Gate validated. Redirecting to dashboard...',
    lockedMsgPrefix: 'One or more criteria are OFF. You can try again in',
    lockedTitle: 'Session locked',
    lockExpiredMsg: 'The lock has lifted. You can retry your validation.',
    changedMsg: 'Criteria changed. Re-validate the session.',
    errorLoadMsg: 'Could not load the gate locally.',
    errorSaveMsg: 'Could not save the local validation.',
    lastValidationPrefix: 'Last local validation:',
    noValidation: 'No local validation recorded today.',
    timerCountdownLabel: 'Retry in',
    timerExpiredLabel: 'Retry available',
    validateButton: 'Validate My Session',
    lockedButton: 'Gate Locked',
    footerNote: 'The gate is persisted in IndexedDB. If a criterion is refused, access stays blocked for 30 minutes before a new attempt.'
  },
  engine: {
    title: 'Kriyo Engine',
    subtitle: '9/9 confluence, account selection and real-time scoring.',
    selectionTitle: 'Account selection',
    selectionDescription: 'Choose the active accounts you want to execute this setup on.',
    activeBadge: 'active',
    noAccounts: 'No account available. Add one first in Accounts & Onboarding.',
    selectedLabel: 'Selected',
    activateLabel: 'Activate',
    scoreCardTitle: 'Decision score',
    scoreCardDescription: 'The execute button only activates at 9/9 with at least one account selected.',
    groupVR: 'VR',
    groupEP: 'EP',
    groupVP: 'VP',
    groupVRFull: 'Real Value',
    groupEPFull: 'Perceived Effect',
    groupVPFull: 'Projected Value',
    groupComplete: 'Locked in',
    questions: {
      vrStructure: { label: 'Structure validated?', description: 'The market structure is clear and validated.' },
      vrLiquidity: { label: 'Liquidity targeted?', description: 'The setup targets an identifiable liquidity zone.' },
      vrTrend: { label: 'Trend aligned?', description: 'The trade follows the dominant trend.' },
      epFomo: { label: 'Zero FOMO?', description: 'The decision is not driven by urgency.' },
      epCrowd: { label: 'Crowd bias identified?', description: 'The analysis is not copied from the consensus.' },
      epLoss: { label: 'Loss accepted?', description: 'The potential loss is mentally accepted.' },
      vpRr: { label: 'R/R ratio >= 2?', description: 'The risk/reward ratio is sufficient.' },
      vpInvalid: { label: 'Clear invalidation?', description: 'The stop is technically defined.' },
      vpA: { label: 'A or A+ setup?', description: 'The setup meets the excellence class.' }
    },
    answerYes: 'Yes',
    answerNo: 'No',
    executeButton: 'Execute Trade',
    incompleteButton: 'Incomplete Score',
    executingButton: 'Executing...',
    loadingMsg: 'Loading engine...',
    readyWithAccountsMsg: 'Select accounts then evaluate the setup.',
    readyNoAccountsMsg: 'Add at least one account first in Accounts & Onboarding.',
    executingMsg: 'Creating local trade...',
    syncedMsg: 'Trade approved locally and synced to Supabase. Redirecting to tracking...',
    pendingSyncMsg: 'Trade approved locally. Supabase sync pending. Redirecting to tracking...',
    errorLoadMsg: 'Could not load the engine locally.',
    errorSaveMsg: 'Could not create the trade locally.'
  },
  gamification: {
    progressTitle: 'Trader progress',
    progressDescription: 'Every setup executed at 9/9 grows your discipline rank.',
    rankLabel: 'Rank',
    xpLabel: 'XP',
    levelLabel: 'Level',
    streakLabel: 'Current streak',
    bestStreakLabel: 'Best streak',
    perfectSetupsLabel: 'Perfect setups',
    nextRankPrefix: 'Next rank at',
    ranks: {
      novice: 'Novice',
      disciplined: 'Disciplined',
      sniper: 'Sniper',
      elite: 'Elite'
    },
    perfectToast: 'Perfect 9/9 setup! +100 XP.',
    groupCompleteToast: 'Group locked in!',
    comboLabel: 'Combo'
  },
  accounts: {
    title: 'Accounts & Onboarding',
    subtitle: 'Prop firm account and risk profile configuration.',
    creationTitle: 'Local creation',
    creationDescription: 'Name, capital and payout are enough. The risk profile is assigned automatically.',
    sprintBadge: 'Sprint 2',
    nameLabel: 'Account name',
    namePlaceholder: 'FTMO 5K',
    capitalLabel: 'Initial capital',
    payoutLabel: 'Payout type',
    addButton: 'Add an account',
    savingButton: 'Saving...',
    activeRiskProfilesTitle: 'Active risk profiles',
    registeredAccountsTitle: 'Registered accounts',
    noAccountsYet: 'No local account yet.',
    createdPrefix: 'Created',
    seededLabel: 'seeded',
    presetLabel: 'preset',
    tpForcedPrefix: 'Forced TP',
    dailyDDLabel: 'Daily DD',
    maxDDLabel: 'Max DD',
    loadingMsg: 'Loading local accounts...',
    loadedMsg: 'Local accounts loaded.',
    noneYetMsg: 'No account yet.',
    errorLoadMsg: 'Could not load local accounts.',
    invalidFormMsg: 'Enter an account name and a valid capital.',
    savingMsg: 'Saving account and risk profile...',
    syncedMsgPrefix: 'Account saved locally and synced to Supabase. Risk profile set:',
    savedLocalMsgPrefix: 'Account saved locally. Risk profile set:',
    pendingSyncMsgPrefix: 'Account saved locally. Supabase sync pending. Risk profile set:',
    errorSaveMsg: 'Could not save the account locally.'
  },
  tradeClosure: {
    takeProfitForcedLabel: 'Forced Take Profit',
    takeProfitForcedReason: 'Forced Take Profit reached at {amount}.',
    dailyDrawdownLabel: 'Stop-Day active',
    dailyDrawdownReason: 'Daily DD reached at {amount}.',
    maxDrawdownLabel: 'Max DD reached',
    maxDrawdownReason: 'Max DD reached at {amount}.',
    loggedLabel: 'Result logged',
    loggedReason: 'PnL logged: {amount}.'
  },
  tracking: {
    title: 'Position Tracking',
    subtitle: 'Health gauges, open trades and PnL closure.',
    healthViewTitle: 'Health view',
    healthViewDescription: 'Each account shows its risk state and open trades.',
    accountsSuffix: 'accounts',
    noLinkedAccounts: 'No linked account. Create one in Accounts & Onboarding, then execute a trade from the engine.',
    noTradeBadge: 'No trade',
    waitingForValidTrade: 'Waiting for a validated trade.',
    tradeOpenedOnPrefix: 'Trade',
    onDate: 'on',
    activeTradesTitle: 'Active trades',
    activeTradesDescription: 'Positions created by the engine appear here.',
    noActiveTrades: 'No active trade yet.',
    openedOnPrefix: 'Opened on',
    pnlPending: 'PnL pending',
    pnlPrefix: 'PnL',
    closePositionButton: 'Close position',
    closureRecorded: 'Closure recorded',
    refreshButton: 'Refresh tracking',
    loadingMsg: 'Loading tracking...',
    loadedMsg: 'Local trades loaded.',
    noneOpenMsg: 'No open trade yet.',
    errorLoadMsg: 'Could not load tracking locally.',
    invalidPnlMsg: 'Enter a valid PnL.',
    closingMsg: 'Closing trade and evaluating rules...',
    syncedSuffix: 'Trade synced to Supabase.',
    pendingSyncSuffix: 'Supabase sync pending.',
    errorCloseMsg: 'Could not close the trade locally.',
    modalTitle: 'PnL Closure',
    finalPnlLabel: 'Final PnL',
    typeToConfirm: 'Enter a PnL to compute the final status.',
    cancelButton: 'Cancel',
    validateResultButton: 'Validate result',
    closingButton: 'Closing...'
  },
  auth: {
    emailLabel: 'Email',
    passwordLabel: 'Password',
    loginButton: 'Sign in',
    signupButton: 'Create account',
    loadingButton: 'Loading...',
    missingSupabaseVars: 'Missing Supabase variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    accountCreatedMsg: 'Account created. Check your mailbox if confirmation is enabled.',
    defaultHelper: 'Supabase email/password authentication is wired directly from the browser.'
  },
  login: {
    badge: 'Secure access',
    title: 'Kriyo Login',
    subtitle: 'Enter your Supabase account to access the gate, the engine and tracking.',
    createAccountLink: 'Create an account'
  },
  signup: {
    badge: 'New account',
    title: 'Create an account',
    subtitle: 'Set up your trading space before wiring the business logic.',
    alreadyHaveAccountLink: 'I already have an account'
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Central hub for accounts, engine and tracking.',
    sprintBadge: 'Sprint 2',
    bannerTitle: 'Gate and account onboarding in progress',
    bannerDescription: 'The gate is persisted locally, and adding prop firm accounts is now wired into onboarding.',
    inProgressBadge: 'In progress',
    pillar1Title: 'Pillar 1',
    pillar1Subtitle: 'Security Gate',
    pillar2Title: 'Pillar 2',
    pillar2Subtitle: '9/9 Engine',
    pillar3Title: 'Pillar 3',
    pillar3Subtitle: 'Prop firm routing',
    openLabel: 'Open'
  },
  education: {
    title: 'Education & Glossary',
    subtitle: 'Quick references for Kriyo’s rules, trading psychology and vocabulary.',
    lightV1: 'Light V1',
    heroTitle: 'Rules before speed',
    heroDescription: 'This section lays out the definitions you need to read Kriyo screens without ambiguity.',
    staticBadge: 'Static',
    pillars: [
      { title: 'Security Gate', badge: 'Pillar 1', text: 'Psycho-technical onboarding across 5 criteria. If one is OFF, the session is blocked for 30 minutes before a new attempt.' },
      { title: '9/9 Engine', badge: 'Pillar 2', text: 'The setup is only executable at a maximum score. No intermediate score is tolerated.' },
      { title: 'Prop Firm Routing', badge: 'Pillar 3', text: 'Every account inherits a risk profile that enforces the management logic: aggressive, moderate or conservative.' }
    ],
    glossaryTitle: 'Glossary',
    glossary: [
      ['Daily DD', 'Maximum loss allowed over the trading day.'],
      ['Max DD', 'Maximum cumulative loss allowed on the account.'],
      ['On-demand payout', 'Profit withdrawal on demand, generally more aggressive.'],
      ['Confluence', 'Accumulation of signals that strengthens the quality of the setup.'],
      ['Invalidation', 'Level that invalidates the scenario and forces the exit.']
    ],
    programTitle: 'Program — Trading Psychology',
    programIntro: 'Five short modules, built from the most cited practices among prop firm traders and trading psychology coaches, to strengthen discipline between sessions.',
    modules: [
      {
        title: 'Module 1 — Loss aversion',
        summary: 'The pain of a loss is roughly twice as intense as the pleasure of an equivalent gain.',
        tips: [
          'Accept the risk before entering: if the stop-loss amount is not bearable, the position size is too large.',
          'Never move a stop loss to "give the market a chance" — that is loss aversion talking, not the plan.',
          'Journal every closed trade, winner or loser, with the emotion felt at the moment of closing.'
        ]
      },
      {
        title: 'Module 2 — Breaking FOMO',
        summary: 'Trades taken out of fear of missing out show a much lower win rate than planned trades.',
        tips: [
          'A missed opportunity costs nothing: a bad trade taken in urgency does.',
          'If the urge to enter comes after watching price move without you, that is a FOMO signal — go back through the 9/9 engine.',
          'Set a list of valid setups for the session in advance; anything not on it waits for tomorrow.'
        ]
      },
      {
        title: 'Module 3 — Breaking revenge trading',
        summary: 'Re-entering immediately after a loss to "win it back" turns a manageable loss into a severe drawdown.',
        tips: [
          'After an off-plan loss or two consecutive losses, force yourself into at least a 30-minute break before re-validating the gate.',
          'The next trade owes nothing to your last position: not bigger, not faster, not more impulsive.',
          'If the urge to "win it back right now" is strong, that is precisely the signal not to trade.'
        ]
      },
      {
        title: 'Module 4 — Process over outcome',
        summary: 'Passing a prop firm evaluation is not about winning every trade, but repeating consistent behavior over time.',
        tips: [
          'Judge a session on plan adherence, not on the day’s PnL.',
          'A properly executed A/A+ setup that loses is still a process win.',
          'Write a clear intention before every session: what you will do, not what you hope to earn.'
        ]
      },
      {
        title: 'Module 5 — Routine and recovery',
        summary: 'Discipline is built before and after the session, not only during it.',
        tips: [
          'Before: check the macro calendar, energy level and screen setup — exactly what Kriyo’s gate formalizes.',
          'During: a few seconds of slow breathing between decisions reduces impulsivity.',
          'After: journal trades and emotions; recurring patterns of tension or rushing show up after a few weeks, not after one session.'
        ]
      }
    ]
  }
});

export const dictionaries = { fr, en } as const;

export type Dictionary = typeof fr;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'fr' || value === 'en';
}

export function localeToIntl(locale: Locale) {
  return locale === 'en' ? 'en-US' : 'fr-FR';
}

export function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, value), template);
}
