export type Locale = 'fr' | 'en';

export const LOCALE_KEY = 'kriyo_locale';
export const DEFAULT_LOCALE: Locale = 'fr';

function dict<T extends Record<string, unknown>>(value: T) {
  return value;
}

const fr = dict({
  common: {
    languageLabel: 'Langue',
    back: 'Retour au dashboard',
    cancel: 'Annuler',
    loading: 'Chargement...',
    logout: 'Se déconnecter',
    yes: 'Oui',
    no: 'Non'
  },
  auth: {
    apiHealth: 'API',
    login: 'Se connecter',
    signup: 'Créer un compte',
    createAccount: 'Créer un compte',
    email: 'Email',
    password: 'Mot de passe',
    pleaseWait: 'Patiente...',
    checkingSession: 'Vérification de la session...',
    loginTitle: 'Connexion',
    signupTitle: 'Créer un compte',
    subtitle: 'Accède à ton espace Kriyo.'
  },
  engagement: {
    title: 'Bienvenue sur Kriyo',
    paragraph1:
      "Kriyo est un outil éducatif conçu pour t'aider à mieux comprendre et gérer ton trading. Pour que l'accompagnement soit vraiment utile, tes réponses doivent refléter fidèlement ta réalité — pas ce que tu penses « devoir » répondre.",
    paragraph2: "En continuant, tu t'engages à répondre avec honnêteté et sincérité tout au long de ton parcours.",
    accept: "J'accepte et je continue",
    saving: 'Enregistrement...',
    error: "Impossible d'enregistrer l'engagement."
  },
  dashboard: {
    title: 'Tableau de Bord',
    subtitle: 'Hub central des paliers Kriyo.',
    connectedAs: 'Connecté en tant que',
    palier01Title: 'Security Gate',
    palier02Title: 'Score de Performance',
    palier03Title: 'Prop firm routing',
    validatedLocked: 'Validé ✓ — verrouillé',
    lockedCooldown: 'Verrouillé (cooldown)',
    open: 'Open',
    comingSoon: 'Bientôt disponible',
    tracking: 'Suivi des positions',
    education: 'Éducation'
  },
  gate: {
    title: 'Security Gate',
    listSubtitle: 'Complète les 5 critères pour accéder au dashboard.',
    todo: 'À faire',
    lockedTitle: 'Session bloquée',
    lockedBadge: 'Verrouillé',
    continueLabel: 'Continuer',
    psych: 'Psych',
    tech: 'Tech',
    categories: {
      tension: 'Tension',
      screen_time: 'Screen time',
      phone: 'Phone',
      macro: 'Macro',
      alignment: 'Alignment'
    },
    questions: {
      tension: [
        'As-tu dormi au moins 7 heures cette nuit ?',
        'Es-tu libre de tout stress personnel ou émotionnel important en ce moment ?',
        'As-tu mangé dans les dernières heures (pas de trading affamé) ?',
        "Es-tu libre de toute influence d'alcool ou de substance ?",
        "Te sens-tu calme plutôt qu'anxieux ou trop excité pour cette session ?",
        'Es-tu mentalement alerte, sans fatigue ni épuisement ?'
      ],
      screen_time: [
        'As-tu pris une pause au moins une fois par heure pendant ta dernière session ?',
        'Ton temps d’écran total aujourd’hui est-il resté sous ta limite fixée ?',
        'As-tu évité de vérifier tes applications de trading en dehors de tes horaires prévus ?',
        'As-tu pris une pause de 10+ minutes dans les 2 dernières heures ?',
        'Es-tu libre de fatigue oculaire ou physique liée aux écrans ?',
        'As-tu démarré et arrêté ta dernière session aux horaires prévus ?'
      ],
      phone: [
        'Ton téléphone est-il en mode Ne pas déranger / Silencieux ?',
        'Ton téléphone est-il hors de portée ou dans une autre pièce ?',
        'As-tu fermé toutes les applications et onglets non liés au trading ?',
        'Les notifications des réseaux sociaux sont-elles désactivées pour cette session ?',
        'As-tu prévenu les autres de ne pas te déranger pendant cette session ?',
        "Es-tu libre de l'envie de vérifier ton téléphone maintenant ?"
      ],
      macro: [
        "As-tu vérifié le calendrier économique du jour pour les événements à fort impact ?",
        "Y a-t-il aucune publication majeure dans les 30 prochaines minutes ?",
        "Évites-tu de trader pendant une annonce programmée d'une banque centrale ?",
        "Es-tu conscient des résultats/données affectant ton instrument aujourd'hui ?",
        "As-tu ajusté la taille de position pour la volatilité du jour, si elle est élevée ?",
        "Y a-t-il aucune actualité inattendue affectant actuellement ton marché ?"
      ],
      alignment: [
        "Ton idée de trade s'aligne-t-elle avec la tendance de temporalité supérieure ?",
        "As-tu confirmé les niveaux clés de support/résistance pour aujourd'hui ?",
        "La volatilité actuelle est-elle dans ta plage de trading acceptable ?",
        "As-tu vérifié les marchés/instruments corrélés pour confirmation ?",
        "Le trade prévu correspond-il à tes règles de stratégie prédéfinies ?",
        "Évites-tu de courir après un mouvement déjà étendu ?"
      ]
    },
    messages: {
      locked: {
        title: 'Session non validée pour cette session.',
        body: "Ton état actuel n'est pas là où il doit être pour bien trader maintenant — et c'est tout le but de ce portail. Il n'est pas là pour te punir, il est là pour te rattraper avant que le marché ne le fasse. Éloigne-toi 30 minutes. Respire, réinitialise-toi, reviens quand ta tête est plus claire. Le trade sera toujours là."
      },
      pass_tight: {
        title: 'Validé, mais les marges sont serrées.',
        body: "Tu es passé, mais quelques zones étaient plus fragiles qu'elles ne devraient l'être. Trade plus petit que d'habitude aujourd'hui, et ne force rien. Surveille les critères faibles — ils te disent quelque chose."
      },
      pass_good: {
        title: "Tu es dans le bon état d'esprit.",
        body: 'Garde la tête haute, reste concentré, et assure-toi de t’aligner avec le marché et ta structure avant d’ouvrir des trades.'
      },
      pass_excellent: {
        title: 'Parfaitement aligné.',
        body: "Esprit clair, discipline élevée, aucun signal d'alerte. C'est l'état dans lequel tu veux trader à chaque fois — pas seulement aujourd'hui. Va exécuter ton plan."
      }
    }
  },
  performance: {
    title: 'Score de Performance',
    subtitle: 'Confluence 9/9, sélection des comptes et score temps réel.',
    activeAccounts: 'Comptes actifs',
    manageAccounts: 'Gérer les comptes',
    noAccounts: 'Aucun compte disponible. Ajoute-en un pour continuer.',
    selected: 'Sélectionné',
    activate: 'Activer',
    executeButton: 'Exécuter le Trade',
    incompleteButton: 'Score incomplet',
    executingButton: 'Exécution...',
    executedMsg: 'Trade approuvé et enregistré.',
    errorMsg: "Impossible d'exécuter le trade.",
    noAccountsMsg: 'Ajoute d’abord un compte dans Comptes & Onboarding.',
    questions: {
      'vr-structure': { label: 'Structure validée ?', description: 'La structure de marché est claire et validée.' },
      'vr-liquidity': { label: 'Liquidité prise ?', description: 'Le setup cible une zone de liquidité identifiable.' },
      'vr-trend': { label: 'Tendance alignée ?', description: 'Le trade suit la tendance dominante.' },
      'ep-fomo': { label: 'Zéro FOMO ?', description: "La décision n'est pas dictée par l'urgence." },
      'ep-crowd': { label: 'Biais de foule identifié ?', description: "L'analyse n'est pas copiée du consensus." },
      'ep-loss': { label: 'Perte acceptée ?', description: 'La perte éventuelle est mentalement acceptée.' },
      'vp-rr': { label: 'Ratio R/R >= 2 ?', description: 'Le ratio risque/récompense est suffisant.' },
      'vp-invalid': { label: 'Invalidation claire ?', description: 'Le stop est défini techniquement.' },
      'vp-a': { label: 'Setup A ou A+ ?', description: "Le setup respecte la classe d'excellence." }
    }
  },
  accounts: {
    title: 'Comptes & Onboarding',
    subtitle: 'Configuration des comptes prop firm et des profils de risque.',
    namePlaceholder: 'Nom du compte (ex: FTMO 5K)',
    capitalPlaceholder: 'Capital initial',
    addButton: 'Ajouter un compte',
    savingButton: 'Sauvegarde...',
    noAccountsYet: 'Aucun compte local pour le moment.',
    invalidForm: 'Renseigne un nom de compte et un capital valide.',
    errorSave: "Impossible d'enregistrer le compte.",
    payoutOptions: {
      ON_DEMAND: 'On-Demand — Extraction immédiate',
      DEUX_SEMAINES: '2 Semaines — Challenge avec DD journalier',
      UN_MOIS: '1 Mois — Capitalisation et DD global'
    }
  },
  tracking: {
    title: 'Suivi des Positions',
    subtitle: 'Trades ouverts et clôture PnL.',
    activeTrades: 'Trades actifs',
    noActiveTrades: 'Aucun trade actif pour le moment.',
    history: 'Historique',
    noHistory: 'Aucun trade clôturé pour le moment.',
    closePosition: 'Fermer la position',
    modalTitle: 'Clôture PnL',
    pnlPlaceholder: 'PnL final',
    invalidPnl: 'Renseigne un PnL valide.',
    validateResult: 'Valider le résultat',
    closingButton: 'Clôture...',
    errorClose: 'Impossible de clôturer le trade.',
    openedOn: 'Ouvert le',
    score: 'Score',
    reasons: {
      take_profit_forced: { label: 'Take Profit forcé', reason: 'Take Profit forcé atteint à {amount}.' },
      daily_drawdown: { label: 'Stop-Day actif', reason: 'Daily DD atteint à {amount}.' },
      max_drawdown: { label: 'Max DD atteint', reason: 'Max DD atteint à {amount}.' },
      logged: { label: 'Résultat journalisé', reason: 'PnL journalisé: {amount}.' }
    }
  },
  education: {
    title: 'Éducation & Glossaire',
    subtitle: 'Repères rapides pour les règles Kriyo, la psychologie de trading et le vocabulaire.',
    heroTitle: 'Les règles avant la vitesse',
    heroDescription: 'Cette section pose les définitions utiles pour lire les écrans Kriyo sans ambiguïté.',
    pillars: [
      { title: 'Security Gate', badge: 'Pilier 1', text: 'Onboarding psycho-technique à 5 critères. En cas d’échec, la session est bloquée 30 minutes avant un nouvel essai.' },
      { title: 'Score de Performance', badge: 'Pilier 2', text: 'Le setup n’est exécutable qu’à score maximal. Pas de score intermédiaire toléré.' },
      { title: 'Prop Firm Routing', badge: 'Pilier 3', text: 'Chaque compte hérite d’un profil de risque qui force la logique de gestion: agressif, modéré ou conservateur.' }
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
          'Ne déplace jamais un stop loss pour « laisser une chance » au marché — c’est l’aversion à la perte qui parle, pas le plan.',
          'Journalise chaque trade fermé, gagnant ou perdant, avec l’émotion ressentie au moment de la clôture.'
        ]
      },
      {
        title: 'Module 2 — Sortir du FOMO',
        summary: 'Les trades pris par peur de rater une opportunité affichent un taux de réussite très inférieur aux trades planifiés.',
        tips: [
          'Une opportunité manquée ne coûte rien: un mauvais trade pris dans l’urgence, si.',
          'Si l’envie d’entrer vient après avoir vu le prix bouger sans toi, c’est un signal FOMO — repasse par le Score de Performance.',
          'Fixe à l’avance une liste de setups valides pour la session; tout ce qui n’en fait pas partie attend le lendemain.'
        ]
      },
      {
        title: 'Module 3 — Casser le revenge trading',
        summary: 'Reprendre une position immédiatement après une perte pour « se refaire » transforme une perte gérable en drawdown sévère.',
        tips: [
          'Après une perte hors plan ou deux pertes consécutives, impose-toi une pause d’au moins 30 minutes avant de revalider le Security Gate.',
          'Le prochain trade ne doit rien à ta position: pas plus gros, pas plus rapide, pas plus impulsif.',
          'Si l’envie de « se refaire tout de suite » est forte, c’est précisément le signal qu’il ne faut pas trader.'
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
          'Avant: vérifie calendrier macro, niveau d’énergie et setup d’écran — c’est exactement ce que le Security Gate formalise.',
          'Pendant: une respiration lente de quelques secondes entre deux décisions réduit l’impulsivité.',
          'Après: journalise trades et émotions; les patterns récurrents de tension ou de précipitation apparaissent après quelques semaines, pas après une session.'
        ]
      }
    ]
  }
});

const en = dict({
  common: {
    languageLabel: 'Language',
    back: 'Back to dashboard',
    cancel: 'Cancel',
    loading: 'Loading...',
    logout: 'Log out',
    yes: 'Yes',
    no: 'No'
  },
  auth: {
    apiHealth: 'API',
    login: 'Log in',
    signup: 'Create account',
    createAccount: 'Create account',
    email: 'Email',
    password: 'Password',
    pleaseWait: 'Please wait...',
    checkingSession: 'Checking session...',
    loginTitle: 'Login',
    signupTitle: 'Create an account',
    subtitle: 'Access your Kriyo space.'
  },
  engagement: {
    title: 'Welcome to Kriyo',
    paragraph1:
      'Kriyo is an educational tool designed to help you better understand and manage your trading. For the guidance to be genuinely useful, your answers need to reflect your reality accurately — not what you think you "should" answer.',
    paragraph2: 'By continuing, you commit to answering honestly and sincerely throughout your journey.',
    accept: 'I accept and continue',
    saving: 'Saving...',
    error: 'Could not save the engagement.'
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Central hub for Kriyo tiers.',
    connectedAs: 'Connected as',
    palier01Title: 'Security Gate',
    palier02Title: 'Performance Score',
    palier03Title: 'Prop firm routing',
    validatedLocked: 'Validated ✓ — locked',
    lockedCooldown: 'Locked (cooldown)',
    open: 'Open',
    comingSoon: 'Coming soon',
    tracking: 'Position tracking',
    education: 'Education'
  },
  gate: {
    title: 'Security Gate',
    listSubtitle: 'Complete the 5 criteria to access the dashboard.',
    todo: 'To do',
    lockedTitle: 'Session locked',
    lockedBadge: 'Locked',
    continueLabel: 'Continue',
    psych: 'Psych',
    tech: 'Tech',
    categories: {
      tension: 'Tension',
      screen_time: 'Screen time',
      phone: 'Phone',
      macro: 'Macro',
      alignment: 'Alignment'
    },
    questions: {
      tension: [
        'Did you sleep at least 7 hours last night?',
        'Are you free of significant personal or emotional stress right now?',
        'Have you eaten in the last few hours (not trading hungry)?',
        'Are you free of any alcohol or substance influence?',
        'Do you feel calm rather than anxious or overly excited about this session?',
        'Are you mentally alert, not fatigued or exhausted?'
      ],
      screen_time: [
        'Did you take a break at least once per hour during your last session?',
        'Has your total screen time today stayed under your set limit?',
        'Did you avoid checking trading apps outside your planned hours?',
        'Have you taken a 10+ minute break in the last 2 hours?',
        'Are you free of eye strain or physical fatigue from screen use?',
        'Did you start and stop your last session at the planned times?'
      ],
      phone: [
        'Is your phone on Do Not Disturb / Silent?',
        'Is your phone out of arm’s reach or in another room?',
        'Have you closed all non-trading apps and browser tabs?',
        'Are social media notifications disabled for this session?',
        'Have you told others not to disturb you during this session?',
        'Are you free of the urge to check your phone right now?'
      ],
      macro: [
        'Have you checked today’s economic calendar for high-impact events?',
        'Are there no major news releases in the next 30 minutes?',
        'Are you avoiding trading through a scheduled central bank announcement?',
        'Are you aware of any earnings/data releases affecting your instrument today?',
        'Have you adjusted position sizing for today’s volatility, if elevated?',
        'Is there no unexpected breaking news currently affecting your market?'
      ],
      alignment: [
        'Does your trade idea align with the higher-timeframe trend?',
        'Have you confirmed key support/resistance levels for today?',
        'Is current volatility within your acceptable trading range?',
        'Have you checked correlated markets/instruments for confirmation?',
        'Does the planned trade fit your predefined strategy rules?',
        'Are you avoiding chasing a move that’s already extended?'
      ]
    },
    messages: {
      locked: {
        title: 'Not cleared for this session.',
        body: "Your current state isn't where it needs to be to trade well right now — and that's the whole point of this gate. It's not here to punish you, it's here to catch you before the market does. Step away for 30 minutes. Breathe, reset, come back when your head is clearer. The trade will still be there."
      },
      pass_tight: {
        title: 'Cleared, but margins are tight.',
        body: "You're through, but a few areas were shakier than they should be. Trade smaller than usual today, and don't force anything. Watch the criteria that came in weak — they're telling you something."
      },
      pass_good: {
        title: "You're in the right mindset.",
        body: 'Keep your head up, stay focused, and make sure you are aligning with the market and your structure before opening trades.'
      },
      pass_excellent: {
        title: 'Fully aligned.',
        body: 'Mind clear, discipline high, no red flags anywhere. This is the state you want to trade from every time — not just today. Go execute your plan.'
      }
    }
  },
  performance: {
    title: 'Performance Score',
    subtitle: '9/9 confluence, account selection and real-time scoring.',
    activeAccounts: 'Active accounts',
    manageAccounts: 'Manage accounts',
    noAccounts: 'No account available. Add one to continue.',
    selected: 'Selected',
    activate: 'Activate',
    executeButton: 'Execute Trade',
    incompleteButton: 'Incomplete Score',
    executingButton: 'Executing...',
    executedMsg: 'Trade approved and saved.',
    errorMsg: 'Could not execute the trade.',
    noAccountsMsg: 'Add an account first in Accounts & Onboarding.',
    questions: {
      'vr-structure': { label: 'Structure validated?', description: 'The market structure is clear and validated.' },
      'vr-liquidity': { label: 'Liquidity targeted?', description: 'The setup targets an identifiable liquidity zone.' },
      'vr-trend': { label: 'Trend aligned?', description: 'The trade follows the dominant trend.' },
      'ep-fomo': { label: 'Zero FOMO?', description: 'The decision is not driven by urgency.' },
      'ep-crowd': { label: 'Crowd bias identified?', description: 'The analysis is not copied from the consensus.' },
      'ep-loss': { label: 'Loss accepted?', description: 'The potential loss is mentally accepted.' },
      'vp-rr': { label: 'R/R ratio >= 2?', description: 'The risk/reward ratio is sufficient.' },
      'vp-invalid': { label: 'Clear invalidation?', description: 'The stop is technically defined.' },
      'vp-a': { label: 'A or A+ setup?', description: 'The setup meets the excellence class.' }
    }
  },
  accounts: {
    title: 'Accounts & Onboarding',
    subtitle: 'Prop firm account and risk profile configuration.',
    namePlaceholder: 'Account name (e.g. FTMO 5K)',
    capitalPlaceholder: 'Initial capital',
    addButton: 'Add an account',
    savingButton: 'Saving...',
    noAccountsYet: 'No local account yet.',
    invalidForm: 'Enter an account name and a valid capital.',
    errorSave: 'Could not save the account.',
    payoutOptions: {
      ON_DEMAND: 'On-Demand — Immediate withdrawal',
      DEUX_SEMAINES: '2 Weeks — Challenge with daily DD',
      UN_MOIS: '1 Month — Compounding and global DD'
    }
  },
  tracking: {
    title: 'Position Tracking',
    subtitle: 'Open trades and PnL closure.',
    activeTrades: 'Active trades',
    noActiveTrades: 'No active trade yet.',
    history: 'History',
    noHistory: 'No closed trade yet.',
    closePosition: 'Close position',
    modalTitle: 'PnL Closure',
    pnlPlaceholder: 'Final PnL',
    invalidPnl: 'Enter a valid PnL.',
    validateResult: 'Validate result',
    closingButton: 'Closing...',
    errorClose: 'Could not close the trade.',
    openedOn: 'Opened on',
    score: 'Score',
    reasons: {
      take_profit_forced: { label: 'Forced Take Profit', reason: 'Forced Take Profit reached at {amount}.' },
      daily_drawdown: { label: 'Stop-Day active', reason: 'Daily DD reached at {amount}.' },
      max_drawdown: { label: 'Max DD reached', reason: 'Max DD reached at {amount}.' },
      logged: { label: 'Result logged', reason: 'PnL logged: {amount}.' }
    }
  },
  education: {
    title: 'Education & Glossary',
    subtitle: 'Quick references for Kriyo’s rules, trading psychology and vocabulary.',
    heroTitle: 'Rules before speed',
    heroDescription: 'This section lays out the definitions you need to read Kriyo screens without ambiguity.',
    pillars: [
      { title: 'Security Gate', badge: 'Pillar 1', text: 'Psycho-technical onboarding across 5 criteria. On failure, the session is blocked for 30 minutes before a new attempt.' },
      { title: 'Performance Score', badge: 'Pillar 2', text: 'The setup is only executable at a maximum score. No intermediate score is tolerated.' },
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
          'If the urge to enter comes after watching price move without you, that is a FOMO signal — go back through the Performance Score.',
          'Set a list of valid setups for the session in advance; anything not on it waits for tomorrow.'
        ]
      },
      {
        title: 'Module 3 — Breaking revenge trading',
        summary: 'Re-entering immediately after a loss to "win it back" turns a manageable loss into a severe drawdown.',
        tips: [
          'After an off-plan loss or two consecutive losses, force yourself into at least a 30-minute break before re-validating the Security Gate.',
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
          'Before: check the macro calendar, energy level and screen setup — exactly what the Security Gate formalizes.',
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

export function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, value), template);
}
