'use server';

import { prisma } from '@/lib/prisma';
import { RISK_PROFILE_PRESETS } from '@/lib/risk-profiles';
import { getSupabaseUser } from '@/lib/supabase/server';
import { evaluateTradeClosure } from '@/lib/rules/trade';
import type {
  KriyoComptePropRecord,
  KriyoQueuedMutationRecord,
  KriyoTradeRecord,
  KriyoValidationSasRecord
} from '@/lib/db';

type SyncResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Une erreur inconnue est survenue pendant la synchronisation.';
}

function normalizeUserEmail(userId: string, userEmail?: string | null) {
  return userEmail?.trim() || `${userId}@kriyo.local`;
}

function getProfilePreset(profileId: string) {
  return Object.values(RISK_PROFILE_PRESETS).find((preset) => preset.id === profileId) ?? null;
}

async function getAuthenticatedIdentity() {
  const authUser = await getSupabaseUser();
  if (!authUser) {
    return null;
  }

  return {
    id: authUser.id,
    email: authUser.email ?? null
  };
}

function validateTradePayload(trade: KriyoTradeRecord) {
  const scores = [trade.scoreVR, trade.scoreEP, trade.scoreVP];

  if (trade.statut !== 'EN_COURS') {
    return 'Seuls les trades EN_COURS peuvent etre synchronises.';
  }

  if (scores.some((score) => !Number.isInteger(score) || score < 0 || score > 3)) {
    return 'Les sous-scores du trade doivent etre compris entre 0 et 3.';
  }

  if (trade.scoreTotal !== 9 || trade.scoreVR + trade.scoreEP + trade.scoreVP !== 9) {
    return 'Le moteur ne synchronise que les trades valides a 9/9.';
  }

  return null;
}

async function persistCompteProp(payload: unknown): Promise<SyncResult> {
  const wrappedPayload = payload as {
    account?: KriyoComptePropRecord;
    userEmail?: string | null;
  };
  const account = wrappedPayload.account ?? (payload as KriyoComptePropRecord);
  const userEmail = wrappedPayload.userEmail ?? null;
  const profilePreset = getProfilePreset(account.profilRisqueId);
  const identity = await getAuthenticatedIdentity();

  if (!profilePreset) {
    return {
      ok: false,
      message: `Profil de risque introuvable pour ${account.profilRisqueId}.`
    };
  }

  if (!identity) {
    return {
      ok: false,
      message: 'Session Supabase introuvable. Reconnecte-toi puis relance la synchronisation.'
    };
  }

  await prisma.$transaction(async (tx) => {
    const email = normalizeUserEmail(identity.id, identity.email ?? userEmail);

    await tx.user.upsert({
      where: { id: identity.id },
      update: { email },
      create: {
        id: identity.id,
        email
      }
    });

    await tx.profilRisque.upsert({
      where: { id: profilePreset.id },
      update: {
        type: profilePreset.type,
        dailyDD: profilePreset.dailyDD ?? null,
        maxDD: profilePreset.maxDD ?? null,
        plafondTP: profilePreset.plafondTP ?? null
      },
      create: {
        id: profilePreset.id,
        type: profilePreset.type,
        dailyDD: profilePreset.dailyDD ?? null,
        maxDD: profilePreset.maxDD ?? null,
        plafondTP: profilePreset.plafondTP ?? null
      }
    });

    await tx.compteProp.upsert({
      where: { id: account.id },
      update: {
        userId: identity.id,
        nom: account.nom,
        capital: account.capital,
        typePayout: account.typePayout as KriyoComptePropRecord['typePayout'],
        profilRisqueId: profilePreset.id
      },
      create: {
        id: account.id,
        userId: identity.id,
        nom: account.nom,
        capital: account.capital,
        typePayout: account.typePayout as KriyoComptePropRecord['typePayout'],
        profilRisqueId: profilePreset.id
      }
    });
  });

  return { ok: true };
}

async function persistTrade(payload: unknown): Promise<SyncResult> {
  const trade = payload as KriyoTradeRecord;
  const identity = await getAuthenticatedIdentity();

  if (!identity) {
    return {
      ok: false,
      message: 'Session Supabase introuvable. Reconnecte-toi puis relance la synchronisation.'
    };
  }

  const tradeValidationError = validateTradePayload(trade);
  if (tradeValidationError) {
    return {
      ok: false,
      message: tradeValidationError
    };
  }

  const account = await prisma.compteProp.findUnique({
    where: { id: trade.comptePropId },
    select: {
      userId: true,
      profilRisqueId: true
    }
  });

  if (!account) {
    return {
      ok: false,
      message: `Compte prop introuvable pour le trade ${trade.id}.`
    };
  }

  if (account.userId !== identity.id) {
    return {
      ok: false,
      message: 'Le compte cible n\'appartient pas a l\'utilisateur Supabase connecte.'
    };
  }

  const profilePreset = getProfilePreset(account.profilRisqueId);
  if (!profilePreset) {
    return {
      ok: false,
      message: `Profil de risque introuvable pour le compte ${account.profilRisqueId}.`
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: identity.id },
      update: { email: normalizeUserEmail(identity.id, identity.email) },
      create: {
        id: identity.id,
        email: normalizeUserEmail(identity.id, identity.email)
      }
    });

    await tx.profilRisque.upsert({
      where: { id: profilePreset.id },
      update: {
        type: profilePreset.type,
        dailyDD: profilePreset.dailyDD ?? null,
        maxDD: profilePreset.maxDD ?? null,
        plafondTP: profilePreset.plafondTP ?? null
      },
      create: {
        id: profilePreset.id,
        type: profilePreset.type,
        dailyDD: profilePreset.dailyDD ?? null,
        maxDD: profilePreset.maxDD ?? null,
        plafondTP: profilePreset.plafondTP ?? null
      }
    });

    await tx.trade.upsert({
      where: { id: trade.id },
      update: {
        comptePropId: trade.comptePropId,
        scoreVR: trade.scoreVR,
        scoreEP: trade.scoreEP,
        scoreVP: trade.scoreVP,
        scoreTotal: trade.scoreTotal,
        riskReward: trade.riskReward ?? null,
        pnl: trade.pnl ?? null,
        statut: trade.statut,
        dateOuverture: new Date(trade.dateOuverture),
        dateCloture: trade.dateCloture ? new Date(trade.dateCloture) : null
      },
      create: {
        id: trade.id,
        comptePropId: trade.comptePropId,
        scoreVR: trade.scoreVR,
        scoreEP: trade.scoreEP,
        scoreVP: trade.scoreVP,
        scoreTotal: trade.scoreTotal,
        riskReward: trade.riskReward ?? null,
        pnl: trade.pnl ?? null,
        statut: trade.statut,
        dateOuverture: new Date(trade.dateOuverture),
        dateCloture: trade.dateCloture ? new Date(trade.dateCloture) : null
      }
    });
  });

  return { ok: true };
}


async function persistTradeClosure(payload: unknown): Promise<SyncResult> {
  const trade = payload as KriyoTradeRecord;
  const identity = await getAuthenticatedIdentity();

  if (!identity) {
    return {
      ok: false,
      message: 'Session Supabase introuvable. Reconnecte-toi puis relance la synchronisation.'
    };
  }

  if (!Number.isFinite(trade.pnl ?? Number.NaN)) {
    return {
      ok: false,
      message: 'PnL final invalide.'
    };
  }

  if (!trade.dateCloture) {
    return {
      ok: false,
      message: 'La date de cloture est manquante.'
    };
  }

  const closedAt = trade.dateCloture as string;

  const account = await prisma.compteProp.findUnique({
    where: { id: trade.comptePropId },
    select: {
      userId: true,
      capital: true,
      nom: true,
      typePayout: true,
      profilRisqueId: true
    }
  });

  if (!account) {
    return {
      ok: false,
      message: `Compte prop introuvable pour la cloture du trade ${trade.id}.`
    };
  }

  if (account.userId !== identity.id) {
    return {
      ok: false,
      message: "Le compte cible n'appartient pas a l'utilisateur Supabase connecte."
    };
  }

  const profilePreset = getProfilePreset(account.profilRisqueId);
  if (!profilePreset) {
    return {
      ok: false,
      message: `Profil de risque introuvable pour le compte ${account.profilRisqueId}.`
    };
  }

  const outcome = evaluateTradeClosure(
    {
      id: trade.comptePropId,
      userId: account.userId,
      nom: account.nom,
      capital: account.capital,
      typePayout: account.typePayout as KriyoComptePropRecord['typePayout'],
      profilRisqueId: account.profilRisqueId,
      createdAt: new Date().toISOString()
    },
    {
      id: profilePreset.id,
      type: profilePreset.type,
      dailyDD: profilePreset.dailyDD ?? null,
      maxDD: profilePreset.maxDD ?? null,
      plafondTP: profilePreset.plafondTP ?? null
    },
    trade.pnl ?? 0
  );

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: identity.id },
      update: { email: normalizeUserEmail(identity.id, identity.email) },
      create: {
        id: identity.id,
        email: normalizeUserEmail(identity.id, identity.email)
      }
    });

    await tx.profilRisque.upsert({
      where: { id: profilePreset.id },
      update: {
        type: profilePreset.type,
        dailyDD: profilePreset.dailyDD ?? null,
        maxDD: profilePreset.maxDD ?? null,
        plafondTP: profilePreset.plafondTP ?? null
      },
      create: {
        id: profilePreset.id,
        type: profilePreset.type,
        dailyDD: profilePreset.dailyDD ?? null,
        maxDD: profilePreset.maxDD ?? null,
        plafondTP: profilePreset.plafondTP ?? null
      }
    });

    await tx.trade.upsert({
      where: { id: trade.id },
      update: {
        comptePropId: trade.comptePropId,
        scoreVR: trade.scoreVR,
        scoreEP: trade.scoreEP,
        scoreVP: trade.scoreVP,
        scoreTotal: trade.scoreTotal,
        riskReward: trade.riskReward ?? null,
        pnl: trade.pnl ?? null,
        statut: outcome.status,
        dateOuverture: new Date(trade.dateOuverture),
        dateCloture: new Date(closedAt)
      },
      create: {
        id: trade.id,
        comptePropId: trade.comptePropId,
        scoreVR: trade.scoreVR,
        scoreEP: trade.scoreEP,
        scoreVP: trade.scoreVP,
        scoreTotal: trade.scoreTotal,
        riskReward: trade.riskReward ?? null,
        pnl: trade.pnl ?? null,
        statut: outcome.status,
        dateOuverture: new Date(trade.dateOuverture),
        dateCloture: new Date(closedAt)
      }
    });
  });

  return { ok: true };
}

async function persistValidation(payload: unknown): Promise<SyncResult> {
  const validation = payload as KriyoValidationSasRecord;
  const identity = await getAuthenticatedIdentity();

  if (!identity) {
    return {
      ok: false,
      message: 'Session Supabase introuvable. Reconnecte-toi puis relance la synchronisation.'
    };
  }

  await prisma.validationSas.upsert({
    where: { id: validation.id },
    update: {
      userId: identity.id,
      tension: validation.tension,
      ecran: validation.ecran,
      telephone: validation.telephone,
      macro: validation.macro,
      alignement: validation.alignement,
      valide: validation.valide,
      dateValidation: new Date(validation.dateValidation)
    },
    create: {
      id: validation.id,
      userId: identity.id,
      tension: validation.tension,
      ecran: validation.ecran,
      telephone: validation.telephone,
      macro: validation.macro,
      alignement: validation.alignement,
      valide: validation.valide,
      dateValidation: new Date(validation.dateValidation)
    }
  });

  return { ok: true };
}

export async function persistQueuedMutation(item: KriyoQueuedMutationRecord): Promise<SyncResult> {
  try {
    switch (item.type) {
      case 'create_compte_prop':
        return await persistCompteProp(item.payload);
      case 'trade_opened':
        return await persistTrade(item.payload);
      case 'trade_closed':
        return await persistTradeClosure(item.payload);
      case 'validation_sas':
        return await persistValidation(item.payload);
      default:
        return {
          ok: false,
          message: `Type de mutation non géré: ${item.type}`
        };
    }
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error)
    };
  }
}
