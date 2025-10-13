import * as storage from './gamification-storage';
import { db } from './db';
import { userActivity, userMissions, missions, userPoints, users, subscriptions } from '@shared/schema';
import { eq, and, gte, lte, or, isNull } from 'drizzle-orm';

/**
 * Sistema de rastreamento automático das missões
 * Monitora ações do usuário e atualiza progresso das missões em tempo real
 */

export interface ActionData {
  userId: string;
  action: string;
  resourceId?: string;
  resourceType?: string;
}

/**
 * Função principal que processa uma ação do usuário e atualiza missões
 */
/**
 * Mapeamento de ações antigas para ações do formulário
 */
function mapLegacyAction(action: string): string {
  const mappings: Record<string, string> = {
    'like_video': 'video_liked',
    'download_product': 'product_downloaded', 
    'comment_posted': 'video_commented', // Default para vídeo, pode ser sobrescrito
    'share_referral': 'referral_general',
    'referral_used': 'referral_general'
  };
  
  return mappings[action] || action;
}

export async function trackUserAction(actionData: ActionData) {
  try {
    // Mapear ação para formato do formulário
    const mappedAction = mapLegacyAction(actionData.action);
    console.log(`Tracking user action: ${actionData.action} → ${mappedAction}`);

    // 1. Registrar atividade na tabela userActivity (com ação original para histórico)
    await db.insert(userActivity).values({
      userId: actionData.userId,
      action: actionData.action, // Manter original no histórico
      resourceId: actionData.resourceId,
      resourceType: actionData.resourceType
    });
    
    // Usar ação mapeada para busca de missões
    const mappedActionData = { ...actionData, action: mappedAction };

    // 2. Buscar usuário com seus pontos e plano para validações
    const userData = await db
      .select({
        user: users,
        points: userPoints,
        subscription: subscriptions
      })
      .from(users)
      .leftJoin(userPoints, eq(users.id, userPoints.userId))
      .leftJoin(subscriptions, and(
        eq(users.id, subscriptions.userId),
        eq(subscriptions.isActive, true)
      ))
      .where(eq(users.id, actionData.userId))
      .then(results => results[0]);

    if (!userData) {
      console.error('User not found:', actionData.userId);
      return;
    }

    // 3. Buscar missões ativas que correspondem a esta ação com todas as validações
    const now = new Date();
    const activeMissions = await db
      .select()
      .from(missions)
      .where(and(
        eq(missions.isActive, true),
        eq(missions.actionRequired, mappedActionData.action), // Usar ação mapeada
        // Validação de período
        lte(missions.startDate, now),
        or(
          isNull(missions.endDate),
          gte(missions.endDate, now)
        )
      ));

    console.log(`Found ${activeMissions.length} active missions for action: ${mappedActionData.action}`);

    // 4. Para cada missão, validar restrições de usuário e atualizar progresso
    for (const mission of activeMissions) {
      // Verificar se usuário atende aos requisitos da missão
      if (await validateUserMissionRequirements(mission, userData)) {
        await updateMissionProgress(actionData.userId, mission.id, mappedActionData); // Usar dados mapeados
      } else {
        console.log(`User ${actionData.userId} doesn't meet requirements for mission ${mission.id}`);
      }
    }

  } catch (error) {
    console.error('Error tracking user action:', error);
  }
}

/**
 * Valida se o usuário atende aos requisitos para participar de uma missão
 */
async function validateUserMissionRequirements(mission: any, userData: any): Promise<boolean> {
  const userLevel = userData.points?.currentLevel || 'bronze';
  const userTotalPoints = userData.points?.totalPoints || 0;
  const userPlanType = userData.subscription?.planType || 'free';

  // Verificar nível mínimo
  if (mission.minLevel && mission.minLevel !== 'bronze') {
    const levelOrder = ['bronze', 'silver', 'gold', 'diamond'];
    const userLevelIndex = levelOrder.indexOf(userLevel);
    const minLevelIndex = levelOrder.indexOf(mission.minLevel);
    
    if (userLevelIndex < minLevelIndex) {
      console.log(`User level ${userLevel} below required ${mission.minLevel}`);
      return false;
    }
  }

  // Verificar pontos mínimos
  if (mission.minPoints && userTotalPoints < mission.minPoints) {
    console.log(`User points ${userTotalPoints} below required ${mission.minPoints}`);
    return false;
  }

  // Verificar se é missão premium
  if (mission.premiumOnly && userPlanType !== 'premium') {
    console.log(`Mission requires premium plan, user has ${userPlanType}`);
    return false;
  }

  return true;
}

/**
 * Verifica se o usuário já atingiu o limite de uso da missão
 */
async function checkUsageLimit(userId: string, mission: any): Promise<boolean> {
  // Se não há limite (0 = unlimited), sempre permitir
  if (!mission.usageLimit || mission.usageLimit <= 0) {
    return true;
  }

  // Contar quantas vezes o usuário já completou esta missão
  const completionCount = await db
    .select()
    .from(userMissions)
    .where(and(
      eq(userMissions.userId, userId),
      eq(userMissions.missionId, mission.id),
      eq(userMissions.isCompleted, true)
    ))
    .then(results => results.length);

  if (completionCount >= mission.usageLimit) {
    console.log(`User ${userId} reached usage limit ${mission.usageLimit} for mission ${mission.id}`);
    return false;
  }

  return true;
}

/**
 * Calcula a data de expiração baseada no tipo de missão
 */
function calculateMissionExpiration(missionType: string): Date | null {
  const now = new Date();
  
  switch (missionType) {
    case 'daily':
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // Início do próximo dia
      return tomorrow;
      
    case 'weekly':
      const nextWeek = new Date(now);
      const daysUntilSunday = 7 - nextWeek.getDay();
      nextWeek.setDate(nextWeek.getDate() + daysUntilSunday);
      nextWeek.setHours(0, 0, 0, 0);
      return nextWeek;
      
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
      return nextMonth;
      
    case 'achievement':
    case 'permanent':
    default:
      return null; // Não expira
  }
}

/**
 * Atualiza o progresso de uma missão específica para um usuário
 */
async function updateMissionProgress(userId: string, missionId: string, actionData: ActionData) {
  try {
    // Buscar dados da missão
    const missionData = await db
      .select()
      .from(missions)
      .where(eq(missions.id, missionId))
      .then(results => results[0]);

    if (!missionData) {
      console.error('Mission not found:', missionId);
      return;
    }

    // Verificar limite de uso antes de continuar
    if (!(await checkUsageLimit(userId, missionData))) {
      return;
    }

    // Verificar se o usuário já tem registro desta missão
    let userMission = await db
      .select()
      .from(userMissions)
      .where(and(
        eq(userMissions.userId, userId),
        eq(userMissions.missionId, missionId)
      ))
      .then(results => results[0]);

    if (!userMission) {
      // Calcular data de expiração
      const expirationDate = calculateMissionExpiration(missionData.missionType);
      
      // Criar novo registro de missão para o usuário
      const newUserMission = await db
        .insert(userMissions)
        .values({
          userId: userId,
          missionId: missionId,
          currentProgress: 0,
          isCompleted: false,
          expiresAt: expirationDate
        })
        .returning();
      
      userMission = newUserMission[0];
    }

    // Verificar se a missão expirou
    if (userMission.expiresAt && new Date() > new Date(userMission.expiresAt)) {
      console.log(`Mission ${missionId} expired for user ${userId}`);
      return;
    }

    // Se a missão já foi completada, não fazer nada
    if (userMission.isCompleted) {
      return;
    }

    // Calcular novo progresso baseado no tipo de ação
    const incrementValue = calculateProgressIncrement(actionData);
    const newProgress = userMission.currentProgress + incrementValue;
    
    const isNowCompleted = newProgress >= missionData.targetCount;

    // Atualizar progresso
    await db
      .update(userMissions)
      .set({
        currentProgress: Math.min(newProgress, missionData.targetCount),
        isCompleted: isNowCompleted,
        completedAt: isNowCompleted ? new Date() : userMission.completedAt
      })
      .where(eq(userMissions.id, userMission.id));

    console.log(`Updated mission ${missionId} for user ${userId}: ${newProgress}/${missionData.targetCount}`);

    // Se a missão foi completada agora, conceder pontos
    if (isNowCompleted && !userMission.isCompleted) {
      await awardMissionPoints(userId, missionData.pointsReward);
      console.log(`Awarded ${missionData.pointsReward} points to user ${userId} for completing mission ${missionId}`);
    }

  } catch (error) {
    console.error(`Error updating mission progress for mission ${missionId}:`, error);
  }
}

/**
 * Calcula o incremento de progresso baseado no tipo de ação
 */
function calculateProgressIncrement(actionData: ActionData): number {
  switch (actionData.action) {
    // Ações de vídeo - CONFORME FORMULÁRIO
    case 'video_watched':
    case 'video_liked':
    case 'video_commented':
    case 'video_shared':
      return 1;
      
    // Ações de produto - CONFORME FORMULÁRIO
    case 'product_downloaded':
    case 'product_shared':
    case 'product_commented':
      return 1;
      
    // Ações de cupom - CONFORME FORMULÁRIO
    case 'coupon_used':
      return 1;
      
    // Ações de referral - CONFORME FORMULÁRIO
    case 'referral_general':
    case 'referral_free':
    case 'referral_premium':
      return 1;
      
    // Ações de engajamento - CONFORME FORMULÁRIO
    case 'login_streak':
    case 'profile_updated':
    case 'mission_completed':
    case 'reward_redeemed':
    case 'raffle_entered':
      return 1;
      
    // === COMPATIBILIDADE COM SISTEMA ANTIGO ===
    // Manter para não quebrar tracking existente
    case 'like_video': // Mapear para video_liked
    case 'download_product': // Mapear para product_downloaded
    case 'comment_posted': // Mapear para video_commented
    case 'share_referral': // Mapear para referral_general
    case 'daily_login':
    case 'achievement_unlocked':
    case 'popup_viewed':
    case 'banner_clicked':
    case 'coupon_viewed':
    case 'product_viewed':
    case 'youtube_like':
      return 1;
      
    default:
      console.warn(`Unknown action for mission progress: ${actionData.action}`);
      return 1; // Por padrão, incrementa 1
  }
}

/**
 * Função para ser chamada quando um usuário assiste a um vídeo
 */
export async function trackVideoWatch(userId: string, videoId: string) {
  await trackUserAction({
    userId,
    action: 'video_watched',
    resourceId: videoId,
    resourceType: 'video'
  });
}

/**
 * Função para ser chamada quando um usuário usa um cupom
 */
export async function trackCouponUse(userId: string, couponId: string) {
  await trackUserAction({
    userId,
    action: 'coupon_used',
    resourceId: couponId,
    resourceType: 'coupon'
  });
}

/**
 * Função para ser chamada quando um usuário faz um comentário
 * IMPORTANTE: Use funções específicas por tipo de conteúdo
 * @deprecated Use trackVideoComment or trackProductComment instead
 */
export async function trackComment(userId: string, resourceId: string, resourceType: string) {
  console.warn('trackComment is deprecated, use specific comment tracking functions');
  
  if (resourceType === 'video') {
    await trackVideoComment(userId, resourceId);
  } else if (resourceType === 'product') {
    await trackProductComment(userId, resourceId);
  } else {
    // Fallback para compatibilidade
    await trackUserAction({
      userId,
      action: 'comment_posted',
      resourceId: resourceId,
      resourceType: resourceType
    });
  }
}

/**
 * Função para ser chamada quando um usuário faz login
 */
export async function trackDailyLogin(userId: string) {
  // Verificar se já foi registrado hoje
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existingLogin = await db
    .select()
    .from(userActivity)
    .where(and(
      eq(userActivity.userId, userId),
      eq(userActivity.action, 'daily_login')
    ))
    .then(results => results.filter(activity => {
      const activityDate = new Date(activity.createdAt);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === today.getTime();
    }));

  if (existingLogin.length === 0) {
    await trackUserAction({
      userId,
      action: 'daily_login'
    });
  }
}


/**
 * Função para ser chamada quando um usuário baixa um produto
 * CORRIGIDA: Usa ação conforme formulário
 */
export async function trackProductDownload(userId: string, productId: string) {
  await trackUserAction({
    userId,
    action: 'product_downloaded', // Conforme formulário
    resourceId: productId,
    resourceType: 'product'
  });
}

/**
 * Função para compatibilidade com sistema antigo
 * @deprecated Use trackProductDownload instead
 */
export async function trackProductDownloadOld(userId: string, productId: string) {
  console.warn('Old download_product action is deprecated');
  await trackProductDownload(userId, productId);
}


/**
 * Função para ser chamada quando um usuário visualiza um produto
 */
export async function trackProductView(userId: string, productId: string) {
  await trackUserAction({
    userId,
    action: 'product_viewed',
    resourceId: productId,
    resourceType: 'product'
  });
}

/**
 * Função para ser chamada quando um usuário visualiza um cupom
 */
export async function trackCouponView(userId: string, couponId: string) {
  await trackUserAction({
    userId,
    action: 'coupon_viewed',
    resourceId: couponId,
    resourceType: 'coupon'
  });
}

/**
 * Função para ser chamada quando um usuário participa de um sorteio
 */
export async function trackRaffleEntry(userId: string, raffleId: string) {
  await trackUserAction({
    userId,
    action: 'raffle_entered',
    resourceId: raffleId,
    resourceType: 'raffle'
  });
}

/**
 * Função para ser chamada quando um usuário completa uma missão
 */
export async function trackMissionComplete(userId: string, missionId: string) {
  await trackUserAction({
    userId,
    action: 'mission_completed',
    resourceId: missionId,
    resourceType: 'mission'
  });
}

/**
 * Função para ser chamada quando um usuário desbloqueia uma conquista
 */
export async function trackAchievementUnlock(userId: string, achievementId: string) {
  await trackUserAction({
    userId,
    action: 'achievement_unlocked',
    resourceId: achievementId,
    resourceType: 'achievement'
  });
}

/**
 * Função para ser chamada quando um usuário visualiza um popup
 */
export async function trackPopupView(userId: string, popupId: string) {
  await trackUserAction({
    userId,
    action: 'popup_viewed',
    resourceId: popupId,
    resourceType: 'popup'
  });
}

/**
 * Função para ser chamada quando um usuário clica em um banner
 */
export async function trackBannerClick(userId: string, bannerId: string) {
  await trackUserAction({
    userId,
    action: 'banner_clicked',
    resourceId: bannerId,
    resourceType: 'banner'
  });
}

/**
 * Função para ser chamada quando um usuário atualiza o perfil
 */
export async function trackProfileUpdate(userId: string) {
  await trackUserAction({
    userId,
    action: 'profile_updated',
    resourceType: 'profile'
  });
}

/**
 * Função para ser chamada quando um usuário curte um vídeo
 * CORRIGIDA: Usa ação conforme formulário
 */
export async function trackVideoLiked(userId: string, videoId: string) {
  await trackUserAction({
    userId,
    action: 'video_liked', // Conforme formulário
    resourceId: videoId,
    resourceType: 'video'
  });
}

/**
 * Função para compatibilidade com sistema antigo
 * @deprecated Use trackVideoLiked instead
 */
export async function trackVideoLike(userId: string, videoId: string) {
  console.warn('trackVideoLike is deprecated, use trackVideoLiked');
  await trackVideoLiked(userId, videoId);
}

/**
 * Função para ser chamada quando um usuário comenta um vídeo
 */
export async function trackVideoComment(userId: string, videoId: string) {
  await trackUserAction({
    userId,
    action: 'video_commented',
    resourceId: videoId,
    resourceType: 'video'
  });
}

/**
 * Função para ser chamada quando um usuário compartilha um vídeo
 */
export async function trackVideoShare(userId: string, videoId: string) {
  await trackUserAction({
    userId,
    action: 'video_shared',
    resourceId: videoId,
    resourceType: 'video'
  });
}

/**
 * Função para ser chamada quando um usuário compartilha um produto
 */
export async function trackProductShare(userId: string, productId: string) {
  await trackUserAction({
    userId,
    action: 'product_shared',
    resourceId: productId,
    resourceType: 'product'
  });
}

/**
 * Função para ser chamada quando um usuário comenta um produto
 */
export async function trackProductComment(userId: string, productId: string) {
  await trackUserAction({
    userId,
    action: 'product_commented',
    resourceId: productId,
    resourceType: 'product'
  });
}

/**
 * Função para ser chamada quando um usuário indica usuários (geral)
 * CORRIGIDA: Usa ação conforme formulário
 */
export async function trackReferralGeneral(userId: string, referralCode: string) {
  await trackUserAction({
    userId,
    action: 'referral_general', // Conforme formulário
    resourceId: referralCode,
    resourceType: 'referral'
  });
}

/**
 * Função para ser chamada quando um usuário indica usuário FREE
 */
export async function trackReferralFree(userId: string, referredUserId: string) {
  await trackUserAction({
    userId,
    action: 'referral_free', // Conforme formulário
    resourceId: referredUserId,
    resourceType: 'referral'
  });
}

/**
 * Função para ser chamada quando um usuário indica usuário PREMIUM
 */
export async function trackReferralPremium(userId: string, referredUserId: string) {
  await trackUserAction({
    userId,
    action: 'referral_premium', // Conforme formulário
    resourceId: referredUserId,
    resourceType: 'referral'
  });
}

/**
 * Função para compatibilidade com sistema antigo
 * @deprecated Use trackReferralGeneral instead
 */
export async function trackReferral(userId: string, referredUserId: string) {
  console.warn('trackReferral is deprecated, use trackReferralGeneral');
  await trackReferralGeneral(userId, referredUserId);
}

/**
 * Função para ser chamada quando um usuário resgata uma recompensa
 */
export async function trackRewardRedeemed(userId: string, rewardId: string) {
  await trackUserAction({
    userId,
    action: 'reward_redeemed',
    resourceId: rewardId,
    resourceType: 'reward'
  });
}

/**
 * Função para ser chamada quando um usuário curte um post
 */
export async function trackPostLiked(userId: string, postId: string) {
  await trackUserAction({
    userId,
    action: 'video_liked', // Mapear para ação de like existente
    resourceId: postId,
    resourceType: 'post'
  });
}

/**
 * Função para ser chamada quando um usuário comenta um post
 */
export async function trackPostComment(userId: string, postId: string) {
  await trackUserAction({
    userId,
    action: 'video_commented', // Mapear para ação de comentário existente
    resourceId: postId,
    resourceType: 'post'
  });
}

/**
 * Função para rastrear login streak (sequência de logins)
 */
export async function trackLoginStreak(userId: string, streakCount: number) {
  await trackUserAction({
    userId,
    action: 'login_streak',
    resourceId: streakCount.toString(),
    resourceType: 'streak'
  });
}

/**
 * Concede pontos ao usuário quando uma missão é completada
 */
async function awardMissionPoints(userId: string, points: number) {
  try {
    // Buscar ou criar registro de pontos do usuário
    let userPointsRecord = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .then(results => results[0]);

    if (!userPointsRecord) {
      // Criar novo registro de pontos
      userPointsRecord = await db
        .insert(userPoints)
        .values({
          userId: userId,
          totalPoints: points,
          currentLevel: 'bronze',
          levelProgress: points
        })
        .returning()
        .then(results => results[0]);
    } else {
      // Atualizar pontos existentes
      const newTotalPoints = userPointsRecord.totalPoints + points;
      const levelInfo = calculateUserLevel(newTotalPoints);
      
      await db
        .update(userPoints)
        .set({
          totalPoints: newTotalPoints,
          currentLevel: levelInfo.level,
          levelProgress: levelInfo.progress,
          updatedAt: new Date()
        })
        .where(eq(userPoints.id, userPointsRecord.id));
    }

  } catch (error) {
    console.error('Error awarding mission points:', error);
  }
}

/**
 * Calcula o nível e progresso baseado no total de pontos
 */
function calculateUserLevel(totalPoints: number): { level: string; progress: number } {
  if (totalPoints >= 10000) {
    return { level: 'diamond', progress: Math.min(totalPoints - 10000, 9999) };
  } else if (totalPoints >= 5000) {
    return { level: 'gold', progress: totalPoints - 5000 };
  } else if (totalPoints >= 1000) {
    return { level: 'silver', progress: totalPoints - 1000 };
  } else {
    return { level: 'bronze', progress: totalPoints };
  }
}

/**
 * Remove missões expiradas dos usuários (função de limpeza)
 */
export async function cleanupExpiredUserMissions() {
  try {
    const now = new Date();
    
    const expiredMissions = await db
      .delete(userMissions)
      .where(and(
        eq(userMissions.isCompleted, false),
        lte(userMissions.expiresAt, now)
      ))
      .returning();

    console.log(`Cleaned up ${expiredMissions.length} expired user missions`);
    return expiredMissions.length;
    
  } catch (error) {
    console.error('Error cleaning up expired missions:', error);
    return 0;
  }
}

/**
 * Obtém todas as missões ativas para um usuário com validações
 */
export async function getActiveMissionsForUser(userId: string) {
  try {
    // Primeiro limpar missões expiradas
    await cleanupExpiredUserMissions();

    // Buscar usuário com dados para validações
    const userData = await db
      .select({
        user: users,
        points: userPoints,
        subscription: subscriptions
      })
      .from(users)
      .leftJoin(userPoints, eq(users.id, userPoints.userId))
      .leftJoin(subscriptions, and(
        eq(users.id, subscriptions.userId),
        eq(subscriptions.isActive, true)
      ))
      .where(eq(users.id, userId))
      .then(results => results[0]);

    if (!userData) {
      return [];
    }

    // Buscar missões ativas dentro do período válido
    const now = new Date();
    const activeMissions = await db
      .select()
      .from(missions)
      .where(and(
        eq(missions.isActive, true),
        lte(missions.startDate, now),
        or(
          isNull(missions.endDate),
          gte(missions.endDate, now)
        )
      ));

    // Filtrar missões que o usuário pode participar
    const validMissions = [];
    for (const mission of activeMissions) {
      if (await validateUserMissionRequirements(mission, userData) &&
          await checkUsageLimit(userId, mission)) {
        validMissions.push(mission);
      }
    }

    return validMissions;
    
  } catch (error) {
    console.error('Error getting active missions for user:', error);
    return [];
  }
}

/**
 * Reinicia missões periódicas (diarias, semanais, mensais) para todos os usuários
 */
export async function resetPeriodicMissions() {
  try {
    const now = new Date();
    let resetCount = 0;

    // Resetar missões diárias (todo dia à meia-noite)
    const dailyMissions = await db
      .select()
      .from(missions)
      .where(and(
        eq(missions.isActive, true),
        eq(missions.missionType, 'daily')
      ));

    for (const mission of dailyMissions) {
      await db
        .delete(userMissions)
        .where(and(
          eq(userMissions.missionId, mission.id),
          eq(userMissions.isCompleted, true)
        ));
      resetCount++;
    }

    // Resetar missões semanais (toda segunda-feira)
    if (now.getDay() === 1) { // Segunda-feira
      const weeklyMissions = await db
        .select()
        .from(missions)
        .where(and(
          eq(missions.isActive, true),
          eq(missions.missionType, 'weekly')
        ));

      for (const mission of weeklyMissions) {
        await db
          .delete(userMissions)
          .where(and(
            eq(userMissions.missionId, mission.id),
            eq(userMissions.isCompleted, true)
          ));
        resetCount++;
      }
    }

    // Resetar missões mensais (dia 1 de cada mês)
    if (now.getDate() === 1) {
      const monthlyMissions = await db
        .select()
        .from(missions)
        .where(and(
          eq(missions.isActive, true),
          eq(missions.missionType, 'monthly')
        ));

      for (const mission of monthlyMissions) {
        await db
          .delete(userMissions)
          .where(and(
            eq(userMissions.missionId, mission.id),
            eq(userMissions.isCompleted, true)
          ));
        resetCount++;
      }
    }

    console.log(`Reset ${resetCount} periodic missions`);
    return resetCount;
    
  } catch (error) {
    console.error('Error resetting periodic missions:', error);
    return 0;
  }
}