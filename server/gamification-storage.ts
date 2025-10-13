// Gamification storage methods extension
import { DatabaseStorage } from "./storage";
import {
  userPoints, missions, userMissions, rewards, userRewards, raffles, raffleEntries, achievements, userAchievements, users,
  type UserPoints, type InsertUserPoints, type Mission, type InsertMission,
  type UserMission, type InsertUserMission, type Reward, type InsertReward,
  type UserReward, type InsertUserReward, type Raffle, type InsertRaffle,
  type RaffleEntry, type InsertRaffleEntry, type Achievement, type InsertAchievement,
  type UserAchievement, type InsertUserAchievement, type User
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// Extend DatabaseStorage with gamification methods
export class GamificationStorage extends DatabaseStorage {

  // ========== USER POINTS METHODS ==========

  async getUserPoints(userId: string): Promise<UserPoints | undefined> {
    const [userPoint] = await this.db.select().from(userPoints).where(eq(userPoints.userId, userId));
    return userPoint || undefined;
  }

  async createUserPoints(userPointsData: InsertUserPoints): Promise<UserPoints> {
    const [newUserPoints] = await this.db.insert(userPoints).values(userPointsData).returning();
    return newUserPoints;
  }

  async updateUserPoints(userId: string, points: number): Promise<UserPoints> {
    // First, try to get existing user points
    let userPointRecord = await this.getUserPoints(userId);

    if (!userPointRecord) {
      // Create new user points record if doesn't exist
      userPointRecord = await this.createUserPoints({ userId, totalPoints: points });
    } else {
      // Update existing record
      const [updatedUserPoints] = await this.db.update(userPoints)
        .set({ 
          totalPoints: points,
          updatedAt: sql`now()`
        })
        .where(eq(userPoints.userId, userId))
        .returning();
      userPointRecord = updatedUserPoints;
    }

    // Calculate level based on points
    let level = 'bronze';
    let levelProgress = points;

    if (points >= 1500) {
      level = 'diamond';
      levelProgress = points - 1500;
    } else if (points >= 500) {
      level = 'gold';
      levelProgress = points - 500;
    } else if (points >= 100) {
      level = 'silver';
      levelProgress = points - 100;
    }

    // Update level if changed
    if (userPointRecord.currentLevel !== level) {
      const [updatedWithLevel] = await this.db.update(userPoints)
        .set({ 
          currentLevel: level,
          levelProgress: levelProgress,
          updatedAt: sql`now()`
        })
        .where(eq(userPoints.userId, userId))
        .returning();
      userPointRecord = updatedWithLevel;
    }

    return userPointRecord;
  }

  async getUserRanking(limit: number = 10): Promise<(UserPoints & { user: Pick<User, 'id' | 'name' | 'avatar'> })[]> {
    return await this.db.select({
      id: sql`COALESCE(${userPoints.id}::text, gen_random_uuid()::text)`.as('id'),
      userId: users.id,
      totalPoints: sql`COALESCE(${userPoints.totalPoints}, 0)`.as('totalPoints'),
      currentLevel: sql`COALESCE(${userPoints.currentLevel}, 'bronze')`.as('currentLevel'),
      levelProgress: sql`COALESCE(${userPoints.levelProgress}, 0)`.as('levelProgress'),
      freeReferrals: sql`COALESCE(${userPoints.freeReferrals}, 0)`.as('freeReferrals'),
      premiumReferrals: sql`COALESCE(${userPoints.premiumReferrals}, 0)`.as('premiumReferrals'),
      createdAt: sql`COALESCE(${userPoints.createdAt}, ${users.createdAt})`.as('createdAt'),
      updatedAt: sql`COALESCE(${userPoints.updatedAt}, ${users.createdAt})`.as('updatedAt'),
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      }
    }).from(users)
      .leftJoin(userPoints, eq(users.id, userPoints.userId))
      .orderBy(desc(sql`COALESCE(${userPoints.totalPoints}, 0)`))
      .limit(limit);
  }

  async getUserRankingWithSubscriptions(limit: number = 10): Promise<any[]> {
    return await this.db.select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      totalPoints: sql`COALESCE(${userPoints.totalPoints}, 0)`.as('totalPoints'),
      currentLevel: sql`COALESCE(${userPoints.currentLevel}, 'bronze')`.as('currentLevel'),
      planType: sql`COALESCE(${subscriptions.planType}, 'free')`.as('planType')
    }).from(users)
      .leftJoin(userPoints, eq(users.id, userPoints.userId))
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .orderBy(desc(sql`COALESCE(${userPoints.totalPoints}, 0)`))
      .limit(limit);
  }

  // ========== MISSION METHODS ==========

  async getMissions(isActive?: boolean, missionType?: string): Promise<Mission[]> {
    try {
      const conditions = [];

      if (isActive !== undefined) {
        conditions.push(eq(missions.isActive, isActive));
      }

      if (missionType) {
        conditions.push(eq(missions.missionType, missionType));
      }

      if (conditions.length > 0) {
        return await this.db.select().from(missions).where(and(...conditions)).orderBy(desc(missions.createdAt));
      }

      return await this.db.select().from(missions).orderBy(desc(missions.createdAt));
    } catch (error) {
      console.error('Error in getMissions:', error);
      return [];
    }
  }

  async getMission(id: string): Promise<Mission | undefined> {
    const [mission] = await this.db.select().from(missions).where(eq(missions.id, id));
    return mission || undefined;
  }

  async createMission(data: InsertMission): Promise<Mission> {
    try {
      const [mission] = await this.db.insert(missions).values(data).returning();
      return mission;
    } catch (error) {
      console.error('Error creating mission:', error);
      throw new Error('Failed to create mission');
    }
  }

  async updateMission(id: string, mission: Partial<InsertMission>): Promise<Mission> {
    const [updatedMission] = await this.db.update(missions).set(mission)
      .where(eq(missions.id, id)).returning();
    return updatedMission;
  }

  async deleteMission(id: string): Promise<void> {
    await this.db.delete(missions).where(eq(missions.id, id));
  }

  // ========== USER MISSION METHODS ==========

  async getUserMissions(userId: string, isCompleted?: boolean): Promise<(UserMission & { mission: Mission })[]> {
    const conditions = [eq(userMissions.userId, userId)];

    if (isCompleted !== undefined) {
      conditions.push(eq(userMissions.isCompleted, isCompleted));
    }

    return await this.db.select({
      id: userMissions.id,
      userId: userMissions.userId,
      missionId: userMissions.missionId,
      currentProgress: userMissions.currentProgress,
      isCompleted: userMissions.isCompleted,
      completedAt: userMissions.completedAt,
      expiresAt: userMissions.expiresAt,
      createdAt: userMissions.createdAt,
      mission: {
        id: missions.id,
        title: missions.title,
        description: missions.description,
        pointsReward: missions.pointsReward,
        missionType: missions.missionType,
        actionRequired: missions.actionRequired,
        targetCount: missions.targetCount,
        icon: missions.icon,
        color: missions.color,
        isActive: missions.isActive,
        startDate: missions.startDate,
        endDate: missions.endDate,
        createdAt: missions.createdAt,
      }
    }).from(userMissions)
      .innerJoin(missions, eq(userMissions.missionId, missions.id))
      .where(and(...conditions))
      .orderBy(desc(userMissions.createdAt));
  }

  async createUserMission(userMission: InsertUserMission): Promise<UserMission> {
    const [newUserMission] = await this.db.insert(userMissions).values(userMission).returning();
    return newUserMission;
  }

  async updateUserMission(id: string, userMission: Partial<InsertUserMission>): Promise<UserMission> {
    const [updatedUserMission] = await this.db.update(userMissions).set(userMission)
      .where(eq(userMissions.id, id)).returning();
    return updatedUserMission;
  }

  async completeMission(userId: string, missionId: string): Promise<{ success: boolean; pointsEarned: number }> {
    try {
      // Get the mission details
      const mission = await this.getMission(missionId);
      if (!mission) {
        return { success: false, pointsEarned: 0 };
      }

      // Check if user mission exists
      const userMissionList = await this.getUserMissions(userId);
      let userMission = userMissionList.find(um => um.missionId === missionId);

      if (!userMission) {
        // Create new user mission
        userMission = await this.createUserMission({
          userId,
          missionId,
          currentProgress: mission.targetCount,
          isCompleted: true,
          completedAt: sql`now()`
        });
      } else if (!userMission.isCompleted) {
        // Update existing user mission
        await this.updateUserMission(userMission.id, {
          currentProgress: mission.targetCount,
          isCompleted: true,
          completedAt: sql`now()`
        });
      }

      // Award points to user
      const currentPoints = await this.getUserPoints(userId);
      const newPointsTotal = (currentPoints?.totalPoints || 0) + mission.pointsReward;
      await this.updateUserPoints(userId, newPointsTotal);

      // Create activity log
      await this.createActivity({
        userId,
        action: 'mission_completed',
        resourceId: missionId,
        resourceType: 'mission'
      });

      return { success: true, pointsEarned: mission.pointsReward };
    } catch (error) {
      console.error('Error completing mission:', error);
      return { success: false, pointsEarned: 0 };
    }
  }

  // ========== REWARD METHODS ==========

  async getRewards(isActive?: boolean, rewardType?: string): Promise<Reward[]> {
    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(rewards.isActive, isActive));
    }

    if (rewardType) {
      conditions.push(eq(rewards.rewardType, rewardType));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(rewards).where(and(...conditions)).orderBy(desc(rewards.createdAt));
    }

    return await this.db.select().from(rewards).orderBy(desc(rewards.createdAt));
  }

  async getReward(id: string): Promise<Reward | undefined> {
    const [reward] = await this.db.select().from(rewards).where(eq(rewards.id, id));
    return reward || undefined;
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const [newReward] = await this.db.insert(rewards).values(reward).returning();
    return newReward;
  }

  async updateReward(id: string, reward: Partial<InsertReward>): Promise<Reward> {
    const [updatedReward] = await this.db.update(rewards).set(reward)
      .where(eq(rewards.id, id)).returning();
    return updatedReward;
  }

  async deleteReward(id: string): Promise<void> {
    await this.db.delete(rewards).where(eq(rewards.id, id));
  }

  // ========== USER REWARD METHODS ==========

  async getUserRewards(userId: string): Promise<(UserReward & { reward: Reward })[]> {
    return await this.db.select({
      id: userRewards.id,
      userId: userRewards.userId,
      rewardId: userRewards.rewardId,
      pointsSpent: userRewards.pointsSpent,
      status: userRewards.status,
      rewardData: userRewards.rewardData,
      createdAt: userRewards.createdAt,
      reward: {
        id: rewards.id,
        title: rewards.title,
        description: rewards.description,
        pointsCost: rewards.pointsCost,
        rewardType: rewards.rewardType,
        rewardValue: rewards.rewardValue,
        imageUrl: rewards.imageUrl,
        stockQuantity: rewards.stockQuantity,
        isActive: rewards.isActive,
        createdAt: rewards.createdAt,
      }
    }).from(userRewards)
      .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(eq(userRewards.userId, userId))
      .orderBy(desc(userRewards.createdAt));
  }

  async redeemReward(userId: string, rewardId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get reward details
      const reward = await this.getReward(rewardId);
      if (!reward) {
        return { success: false, message: "Recompensa não encontrada" };
      }

      if (!reward.isActive) {
        return { success: false, message: "Esta recompensa não está mais disponível" };
      }

      // Check stock
      if (reward.stockQuantity !== -1 && reward.stockQuantity <= 0) {
        return { success: false, message: "Recompensa esgotada" };
      }

      // Check user points
      const userPointsRecord = await this.getUserPoints(userId);
      if (!userPointsRecord || userPointsRecord.totalPoints < reward.pointsCost) {
        return { success: false, message: "Pontos insuficientes" };
      }

      // Deduct points
      const newPointsTotal = userPointsRecord.totalPoints - reward.pointsCost;
      await this.updateUserPoints(userId, newPointsTotal);

      // Update stock if not unlimited
      if (reward.stockQuantity !== -1) {
        await this.updateReward(rewardId, { stockQuantity: reward.stockQuantity - 1 });
      }

      // Create user reward record
      await this.db.insert(userRewards).values({
        userId,
        rewardId,
        pointsSpent: reward.pointsCost,
        status: 'claimed'
      });

      // Create activity log
      await this.createActivity({
        userId,
        action: 'reward_redeemed',
        resourceId: rewardId,
        resourceType: 'reward'
      });

      return { success: true, message: "Recompensa resgatada com sucesso!" };
    } catch (error) {
      console.error('Error redeeming reward:', error);
      return { success: false, message: "Erro ao resgatar recompensa" };
    }
  }

  // ========== RAFFLE METHODS ==========

  async getRaffles(isActive?: boolean): Promise<Raffle[]> {
    try {
      const conditions = [];

      if (isActive !== undefined) {
        conditions.push(eq(raffles.isActive, isActive));
      }

      if (conditions.length > 0) {
        return await this.db.select().from(raffles).where(and(...conditions)).orderBy(desc(raffles.createdAt));
      }

      return await this.db.select().from(raffles).orderBy(desc(raffles.createdAt));
    } catch (error) {
      console.error('Error in getRaffles:', error);
      return [];
    }
  }

  async getRaffle(id: string): Promise<Raffle | undefined> {
    const [raffle] = await this.db.select().from(raffles).where(eq(raffles.id, id));
    return raffle || undefined;
  }

  async createRaffle(data: InsertRaffle): Promise<Raffle> {
    try {
      const [raffle] = await this.db.insert(raffles).values(data).returning();
      return raffle;
    } catch (error) {
      console.error('Error creating raffle:', error);
      throw new Error('Failed to create raffle');
    }
  }

  async updateRaffle(id: string, raffle: Partial<InsertRaffle>): Promise<Raffle> {
    const [updatedRaffle] = await this.db.update(raffles).set(raffle)
      .where(eq(raffles.id, id)).returning();
    return updatedRaffle;
  }

  async deleteRaffle(id: string): Promise<void> {
    await this.db.delete(raffles).where(eq(raffles.id, id));
  }

  // ========== RAFFLE ENTRY METHODS ==========

  async getUserRaffleEntries(userId: string, raffleId?: string): Promise<(RaffleEntry & { raffle: Raffle })[]> {
    const conditions = [eq(raffleEntries.userId, userId)];

    if (raffleId) {
      conditions.push(eq(raffleEntries.raffleId, raffleId));
    }

    return await this.db.select({
      id: raffleEntries.id,
      userId: raffleEntries.userId,
      raffleId: raffleEntries.raffleId,
      entryCount: raffleEntries.entryCount,
      createdAt: raffleEntries.createdAt,
      raffle: {
        id: raffles.id,
        title: raffles.title,
        description: raffles.description,
        prizeDescription: raffles.prizeDescription,
        imageUrl: raffles.imageUrl,
        entryCost: raffles.entryCost,
        maxEntriesPerUser: raffles.maxEntriesPerUser,
        startDate: raffles.startDate,
        endDate: raffles.endDate,
        winnerUserId: raffles.winnerUserId,
        isActive: raffles.isActive,
        totalEntries: raffles.totalEntries,
        createdAt: raffles.createdAt,
      }
    }).from(raffleEntries)
      .innerJoin(raffles, eq(raffleEntries.raffleId, raffles.id))
      .where(and(...conditions))
      .orderBy(desc(raffleEntries.createdAt));
  }

  async enterRaffle(userId: string, raffleId: string, entries: number): Promise<{ success: boolean; message: string }> {
    try {
      // Get raffle details
      const raffle = await this.getRaffle(raffleId);
      if (!raffle) {
        return { success: false, message: "Sorteio não encontrado" };
      }

      if (!raffle.isActive) {
        return { success: false, message: "Este sorteio não está mais ativo" };
      }

      // Check if raffle has ended
      if (raffle.endDate && new Date() > raffle.endDate) {
        return { success: false, message: "Este sorteio já encerrou" };
      }

      // Check user entries limit
      const userEntries = await this.getUserRaffleEntries(userId, raffleId);
      const currentEntries = userEntries.reduce((total, entry) => total + entry.entryCount, 0);

      if (currentEntries + entries > raffle.maxEntriesPerUser) {
        return { success: false, message: `Máximo de ${raffle.maxEntriesPerUser} participações por usuário` };
      }

      // Check user points
      const totalCost = entries * raffle.entryCost;
      const userPointsRecord = await this.getUserPoints(userId);
      if (!userPointsRecord || userPointsRecord.totalPoints < totalCost) {
        return { success: false, message: "Pontos insuficientes" };
      }

      // Deduct points
      const newPointsTotal = userPointsRecord.totalPoints - totalCost;
      await this.updateUserPoints(userId, newPointsTotal);

      // Create raffle entry
      await this.db.insert(raffleEntries).values({
        userId,
        raffleId,
        entryCount: entries
      });

      // Update total entries in raffle
      await this.updateRaffle(raffleId, { 
        totalEntries: (raffle.totalEntries || 0) + entries 
      });

      // Create activity log
      await this.createActivity({
        userId,
        action: 'raffle_entered',
        resourceId: raffleId,
        resourceType: 'raffle'
      });

      return { success: true, message: `Participação registrada com sucesso! ${entries} entrada(s)` };
    } catch (error) {
      console.error('Error entering raffle:', error);
      return { success: false, message: "Erro ao participar do sorteio" };
    }
  }

  // ========== USER STATS METHODS ==========

  async getUserStats(userId: string): Promise<{
    videosWatched: number;
    productsDownloaded: number;
    couponsUsed: number;
    commentsLiked: number;
    loginStreak: number;
    missionsCompleted: number;
    referralsMade: number;
  }> {
    try {
      // Buscar atividades do usuário
      const activities = await this.getUserActivity(userId);

      // Contar por tipo de ação
      const stats = {
        videosWatched: activities.filter(a => a.action === 'video_watched').length,
        productsDownloaded: activities.filter(a => a.action === 'product_downloaded').length,
        couponsUsed: activities.filter(a => a.action === 'coupon_used').length,
        commentsLiked: activities.filter(a => a.action === 'comment_liked').length,
        loginStreak: 0, // TODO: Implementar lógica de sequência de login
        missionsCompleted: activities.filter(a => a.action === 'mission_completed').length,
        referralsMade: activities.filter(a => a.action === 'referral_made').length,
      };

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        videosWatched: 0,
        productsDownloaded: 0,
        couponsUsed: 0,
        commentsLiked: 0,
        loginStreak: 0,
        missionsCompleted: 0,
        referralsMade: 0,
      };
    }
  }

  // ========== ACHIEVEMENT METHODS ==========

  async getAchievements(isActive?: boolean): Promise<Achievement[]> {
    if (isActive !== undefined) {
      return await this.db.select().from(achievements).where(eq(achievements.isActive, isActive));
    }
    return await this.db.select().from(achievements);
  }

  async getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]> {
    return await this.db.select({
      id: userAchievements.id,
      userId: userAchievements.userId,
      achievementId: userAchievements.achievementId,
      unlockedAt: userAchievements.unlockedAt,
      achievement: {
        id: achievements.id,
        title: achievements.title,
        description: achievements.description,
        icon: achievements.icon,
        color: achievements.color,
        conditionType: achievements.conditionType,
        conditionValue: achievements.conditionValue,
        isActive: achievements.isActive,
        createdAt: achievements.createdAt,
      }
    }).from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));
  }

  async checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    // This method checks if user meets criteria for new achievements and unlocks them
    const unlockedAchievements: Achievement[] = [];

    try {
      // Get user's current achievements
      const userAchievementsList = await this.getUserAchievements(userId);
      const achievementIds = userAchievementsList.map(ua => ua.achievementId);

      // Get all active achievements
      const allAchievements = await this.getAchievements(true);

      // Get user stats for checking conditions
      const userPointsRecord = await this.getUserPoints(userId);
      const userStats = await this.getUserStats(userId);

      for (const achievement of allAchievements) {
        // Skip if user already has this achievement
        if (achievementIds.includes(achievement.id)) continue;

        let shouldUnlock = false;

        switch (achievement.conditionType) {
          case 'points_total':
            shouldUnlock = (userPointsRecord?.totalPoints || 0) >= achievement.conditionValue;
            break;
          case 'level_reached':
            const levelValues = { bronze: 1, silver: 2, gold: 3, diamond: 4 };
            const currentLevelValue = levelValues[userPointsRecord?.currentLevel as keyof typeof levelValues] || 0;
            shouldUnlock = currentLevelValue >= achievement.conditionValue;
            break;
          case 'videos_watched':
            shouldUnlock = userStats.videosWatched >= achievement.conditionValue;
            break;
        }

        if (shouldUnlock) {
          // Unlock achievement
          await this.db.insert(userAchievements).values({
            userId,
            achievementId: achievement.id
          });
          unlockedAchievements.push(achievement);
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }

    return unlockedAchievements;
  }
}