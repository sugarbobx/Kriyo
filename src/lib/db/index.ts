import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface KriyoUserRecord {
  id: string;
  email: string;
  createdAt: string;
}

export interface KriyoComptePropRecord {
  id: string;
  userId: string;
  nom: string;
  capital: number;
  typePayout: 'ON_DEMAND' | 'DEUX_SEMAINES' | 'UN_MOIS';
  profilRisqueId: string;
  createdAt: string;
}

export interface KriyoProfilRisqueRecord {
  id: string;
  type: 'AGRESSIF' | 'MODERE' | 'CONSERVATEUR';
  dailyDD?: number | null;
  maxDD?: number | null;
  plafondTP?: number | null;
}

export interface KriyoTradeRecord {
  id: string;
  comptePropId: string;
  scoreVR: number;
  scoreEP: number;
  scoreVP: number;
  scoreTotal: number;
  riskReward?: number | null;
  pnl?: number | null;
  statut: 'EN_COURS' | 'CLOTURE' | 'VERROUILLE';
  dateOuverture: string;
  dateCloture?: string | null;
}

export interface KriyoValidationSasRecord {
  id: string;
  userId: string;
  tension: boolean;
  ecran: boolean;
  telephone: boolean;
  macro: boolean;
  alignement: boolean;
  valide: boolean;
  dateValidation: string;
}

export interface KriyoSessionRecord {
  id: string;
  userId: string;
  dateDebut: string;
  dateFin?: string | null;
}

export interface KriyoEngineDraftRecord {
  id: string;
  userId: string;
  selectedAccountIds: string[];
  answers: Record<string, boolean>;
  scoreVR: number;
  scoreEP: number;
  scoreVP: number;
  riskReward?: number | null;
  updatedAt: string;
}

export interface KriyoQueuedMutationRecord {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

export interface KriyoDBSchema extends DBSchema {
  users: {
    key: string;
    value: KriyoUserRecord;
  };
  comptesProp: {
    key: string;
    value: KriyoComptePropRecord;
  };
  profilRisque: {
    key: string;
    value: KriyoProfilRisqueRecord;
  };
  trades: {
    key: string;
    value: KriyoTradeRecord;
  };
  validationsSas: {
    key: string;
    value: KriyoValidationSasRecord;
  };
  sessions: {
    key: string;
    value: KriyoSessionRecord;
  };
  engineDrafts: {
    key: string;
    value: KriyoEngineDraftRecord;
  };
  queue: {
    key: string;
    value: KriyoQueuedMutationRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<KriyoDBSchema>> | null = null;

export function getKriyoDb() {
  dbPromise ??= openDB<KriyoDBSchema>('kriyo-offline', 3, {
    upgrade(db) {
      const stores = [
        'users',
        'comptesProp',
        'profilRisque',
        'trades',
        'validationsSas',
        'sessions',
        'engineDrafts',
        'queue'
      ] as const;

      for (const storeName of stores) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      }
    }
  });

  return dbPromise;
}
