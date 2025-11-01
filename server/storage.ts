import {
  users,
  videos,
  products,
  coupons,
  banners,
  posts,
  comments,
  commentLikes,
  commentReplies,
  subscriptions,
  userActivity,
  videoLikes,
  postLikes,
  postTags,
  savedPosts,
  popups,
  popupViews,
  notifications,
  userNotifications,
  notificationSettings,
  userPoints as userPointsTable,
  missions as missionsTable,
  userMissions as userMissionsTable,
  rewards as rewardsTable,
  raffles as rafflesTable,
  userRewards,
  raffleEntries,
  achievements,
  userAchievements,
  shareSettings,
  referrals,
  categories,
  videoProgress,
  type User, type InsertUser, type Video, type InsertVideo, type VideoProgress, type InsertVideoProgress,
  type Product, type InsertProduct, type Coupon, type InsertCoupon,
  type Banner, type InsertBanner, type Post, type InsertPost,
  type Comment, type InsertComment, type Subscription, type InsertSubscription,
  type Activity, type InsertActivity, type VideoLike, type InsertVideoLike,
  type PostLike, type InsertPostLike, type PostTag, type InsertPostTag,
  type Popup, type InsertPopup, type PopupView, type InsertPopupView,
  type Notification, type InsertNotification, type UserNotification, type InsertUserNotification,
  type UserPoints, type InsertUserPoints, type Mission, type InsertMission,
  type UserMission, type InsertUserMission, type Reward, type InsertReward,
  type UserReward, type InsertUserReward, type Raffle, type InsertRaffle,
  type RaffleEntry, type InsertRaffleEntry, type Achievement, type InsertAchievement,
  type UserAchievement, type InsertUserAchievement, type Category, type InsertCategory
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, gte, lte, isNull, ne } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { hashPassword } from "./auth";
import * as fs from 'fs'; // Import fs module
import * as path from 'path'; // Import path module
import { createId } from '@paralleldrive/cuid2'; // Import createId

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Auth methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAdminUser(): Promise<User | undefined>;
  getAllUsers(): Promise<(User & { planType?: string })[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  // Video methods
  getVideos(isExclusive?: boolean, category?: string): Promise<Video[]>;
  getVideo(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, video: Partial<InsertVideo>): Promise<Video>;
  deleteVideo(id: string): Promise<void>;
  incrementVideoViews(id: string): Promise<void>;
  likeVideo(videoId: string, userId: string): Promise<{ success: boolean; isLiked: boolean }>;
  getUserVideoLike(videoId: string, userId: string): Promise<boolean>;

  // Product methods
  getProducts(type?: string, includeInactive?: boolean): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Coupon methods
  getCoupons(category?: string, isActive?: boolean): Promise<Coupon[]>;
  getCoupon(id: string): Promise<Coupon | undefined>;
  getCouponByCode(code: string): Promise<Coupon | undefined>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon>;
  deleteCoupon(id: string): Promise<void>;
  checkCouponOrderConflict(order: number, excludeId?: string): Promise<{ hasConflict: boolean; conflict?: Coupon }>;
  reorderCouponsAfterInsert(targetOrder: number, excludeId?: string): Promise<void>;
  reorderCouponsAfterDeletion(deletedOrder: number): Promise<void>;
  reorderCouponsAfterStatusChange(couponId: string, newIsActive: boolean, targetOrder?: number): Promise<void>;

  // Category methods
  getCategories(isActive?: boolean): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(categoryData: InsertCategory & { shouldReorder?: boolean }): Promise<Category>;
  updateCategory(id: string, categoryData: Partial<InsertCategory> & { shouldReorder?: boolean }): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  checkCategoryOrderConflict(order: number, excludeId?: string): Promise<{ hasConflict: boolean; conflict?: Category }>;
  reorderCategoriesAfterInsert(targetOrder: number, excludeId?: string): Promise<void>;
  reorderCategoriesAfterDeletion(deletedOrder: number): Promise<void>;

  // Banner methods
  getBanners(isActive?: boolean): Promise<Banner[]>;
  getBanner(id: string): Promise<Banner | undefined>;
  getVideoBanners(videoId: string): Promise<Banner[]>;
  createBanner(bannerData: InsertBanner & { shouldReorder?: boolean }): Promise<Banner>;
  updateBanner(id: string, bannerData: Partial<InsertBanner> & { shouldReorder?: boolean }): Promise<Banner>;
  deleteBanner(id: string): Promise<void>;
  checkBannerOrderConflict(order: number, excludeId?: string): Promise<{ hasConflict: boolean; conflict?: Banner }>;
  reorderBannersAfterInsert(targetOrder: number, excludeId?: string): Promise<void>;
  reorderBannersAfterDeletion(deletedOrder: number): Promise<void>;

  // Post methods
  getPosts(): Promise<(Post & { user: Pick<User, 'id' | 'name' | 'avatar' | 'isAdmin'>; taggedUsers?: Array<Pick<User, 'id' | 'name' | 'avatar'>> })[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost, taggedUserIds?: string[]): Promise<Post>;
  updatePost(id: string, post: Partial<InsertPost>): Promise<Post>;
  deletePost(id: string): Promise<void>;

  // Comment methods
  getComments(videoId?: string, postId?: string): Promise<(Comment & { user: Pick<User, 'id' | 'name' | 'avatar'> })[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: string): Promise<void>;

  // Subscription methods
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription>;

  // Activity methods
  getUserActivity(userId: string, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Stats methods
  getUserStats(userId: string): Promise<{ videosWatched: number; downloads: number; couponsUsed: number; }>;

  // Popup methods
  getPopups(isActive?: boolean): Promise<Popup[]>;
  getPopup(id: string): Promise<Popup | undefined>;
  getActivePopupsForTrigger(trigger: string, targetPage?: string, targetVideoId?: string, targetCourseId?: string): Promise<Popup[]>;
  createPopup(popup: InsertPopup): Promise<Popup>;
  updatePopup(id: string, popup: Partial<InsertPopup>): Promise<Popup>;
  deletePopup(id: string): Promise<void>;
  recordPopupView(view: InsertPopupView): Promise<PopupView>;
  hasUserSeenPopup(userId: string, popupId: string, sessionId: string): Promise<boolean>;

  // Notification methods
  getNotifications(isActive?: boolean, targetAudience?: string): Promise<Notification[]>;
  getAllNotificationsForAdmin(): Promise<Notification[]>;
  getNotificationById(id: string): Promise<Notification | undefined>;
  getActiveNotificationsForUser(userId: string, userPlanType: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: string, notification: Partial<InsertNotification>): Promise<Notification>;
  deleteNotification(id: string): Promise<void>;

  // User Notification methods
  getUserNotifications(userId: string, isRead?: boolean): Promise<(UserNotification & { notification: Notification })[]>;
  createUserNotification(userNotification: InsertUserNotification): Promise<UserNotification>;
  markNotificationAsRead(userId: string, notificationId: string): Promise<UserNotification>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  removeUserNotification(userId: string, notificationId: string): Promise<void>;
  getUserNotificationByIds(userId: string, notificationId: string);

  // Notification Settings methods
  getNotificationSettings(userId: string);
  saveNotificationSettings(userId: string, settings: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    smsEnabled: boolean;
    soundEnabled: boolean;
  });

  // ========== GAMIFICATION METHODS ==========

  // User Points methods
  getUserPoints(userId: string): Promise<UserPoints | undefined>;
  createUserPoints(userPoints: InsertUserPoints): Promise<UserPoints>;
  updateUserPoints(userId: string, points: number): Promise<UserPoints>;
  getUserRanking(limit?: number): Promise<(UserPoints & { user: Pick<User, 'id' | 'name' | 'avatar'> })[]>;

  // Mission methods
  getMissions(isActive?: boolean, missionType?: string): Promise<Mission[]>;
  getMission(id: string): Promise<Mission | undefined>;
  createMission(mission: InsertMission): Promise<Mission>;
  updateMission(id: string, mission: Partial<InsertMission>): Promise<Mission>;
  deleteMission(id: string): Promise<void>;

  // User Mission methods
  getUserMissions(userId: string, isCompleted?: boolean): Promise<(UserMission & { mission: Mission })[]>;
  createUserMission(userMission: InsertUserMission): Promise<UserMission>;
  updateUserMission(id: string, userMission: Partial<InsertUserMission>): Promise<UserMission>;
  completeMission(userId: string, missionId: string): Promise<{ success: boolean; pointsEarned: number }>;

  // Reward methods
  getRewards(isActive?: boolean, rewardType?: string): Promise<Reward[]>;
  getReward(id: string): Promise<Reward | undefined>;
  createReward(reward: InsertReward): Promise<Reward>;
  updateReward(id: string, reward: Partial<InsertReward>): Promise<Reward>;
  deleteReward(id: string): Promise<void>;

  // User Reward methods
  getUserRewards(userId: string): Promise<(UserReward & { reward: Reward })[]>;
  redeemReward(userId: string, rewardId: string): Promise<{ success: boolean; message: string }>;

  // Raffle methods
  getRaffles(isActive?: boolean): Promise<Raffle[]>;
  getRaffle(id: string): Promise<Raffle | undefined>;
  createRaffle(raffle: InsertRaffle): Promise<Raffle>;
  updateRaffle(id: string, raffle: Partial<InsertRaffle>): Promise<Raffle>;
  deleteRaffle(id: string): Promise<void>;

  // Raffle Entry methods
  getUserRaffleEntries(userId: string, raffleId?: string): Promise<(RaffleEntry & { raffle: Raffle })[]>;
  enterRaffle(userId: string, raffleId: string, entries: number): Promise<{ success: boolean; message: string }>;

  // Achievement methods
  getAchievements(isActive?: boolean): Promise<Achievement[]>;
  getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]>;
  checkAndUnlockAchievements(userId: string): Promise<Achievement[]>;

  // Video Progress methods
  getVideoProgress(userId: string, videoId: string, resourceId: string): Promise<VideoProgress | undefined>;
  updateVideoProgress(userId: string, videoId: string, resourceId: string, currentTime: number, duration: number): Promise<VideoProgress>;
  getUserVideoProgressByResource(userId: string, resourceId: string): Promise<VideoProgress[]>;

  // Seed methods
  seedDefaultUsers(): Promise<void>;
  seedSampleContent(adminId: string): Promise<void>;

  // Referral System
  getShareSettings();
  updateShareSettings(freePoints: number, premiumPoints: number, updatedBy: string);
  getReferralsByUser(userId: string);
  getUserReferralStats(userId: string);
  getAllUsersWithReferralData();
  createReferral(referrerId: string, referredId: string, referredPlanType: string);
  updateUserPoints(userId: string, pointsToAdd: number, referralType?: 'free' | 'premium');

  // Stats functions
  getUsersCount(): Promise<number>;
  getPostsCount(): Promise<number>;
  getLikesCount(): Promise<number>;
  getCommentsCount(): Promise<number>;
  getSharesCount(): Promise<number>;

  // Notification Sending
  createSystemNotification(title: string, description: string, targetAudience?: string, linkUrl?: string): Promise<string>;
  sendNotificationToUsers(notificationId: string, targetAudience: string): Promise<void>;
  notifyFirstLogin(userId: string): Promise<void>;
  notifyMissionCompleted(userId: string, missionTitle: string, pointsEarned: number): Promise<void>;
  notifyLevelUp(userId: string, newLevel: string): Promise<void>;
  notifyAchievementUnlocked(userId: string, achievementTitle: string): Promise<void>;
  notifyNewVideo(videoTitle: string): Promise<void>;
  notifyNewProduct(productName: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  private db = db; // Adiciona a instância do db como propriedade da classe

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // Auth methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAdminUser(): Promise<User | undefined> {
    const [admin] = await this.db.select().from(users).where(eq(users.isAdmin, true));
    return admin || undefined;
  }

  async getAllUsers(): Promise<(User & { planType?: string })[]> {
    const allUsers = await this.db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        name: users.name,
        avatar: users.avatar,
        gender: users.gender,
        age: users.age,
        isAdmin: users.isAdmin,
        googleAccessToken: users.googleAccessToken,
        googleRefreshToken: users.googleRefreshToken,
        googleTokenExpiry: users.googleTokenExpiry,
        createdAt: users.createdAt,
        planType: subscriptions.planType,
      })
      .from(users)
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId));

    // console.log('Dados dos usuários com planos:', allUsers.map(u => ({
    //   name: u.name,
    //   email: u.email,
    //   planType: u.planType,
    // })));

    return allUsers.map(user => ({
      ...user,
      planType: user.planType || 'free'
    }));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(insertUser).returning();

    // Create default free subscription
    await this.db.insert(subscriptions).values({
      userId: user.id,
      planType: 'free',
      isActive: true,
    });

    // Create initial user points record with 0 points
    await this.db.insert(userPointsTable).values({
      userId: user.id,
      totalPoints: 0,
      currentLevel: 'bronze',
      levelProgress: 0,
      freeReferrals: 0,
      premiumReferrals: 0,
    });

    // console.log(`Usuário criado com pontos zerados: ${user.name} (${user.id})`);

    return user;
  }

  async updateUser(userId: string, data: Partial<InsertUser & {
    googleAccessToken?: string | null;
    googleRefreshToken?: string | null;
    googleTokenExpiry?: Date | null;
    gender?: string | null;
    age?: number | null;
  }>): Promise<User | undefined> { // Retorna User | undefined para refletir a possibilidade de não encontrar o usuário
    // console.log("StorageupdateUser called with:", { userId, data });

    try {
      const [user] = await this.db.update(users)
        .set({
          ...data,
          ...(data.googleTokenExpiry && { googleTokenExpiry: data.googleTokenExpiry }),
          ...(data.gender !== undefined && { gender: data.gender }), // Atualiza gender se estiver presente
          ...(data.age !== undefined && { age: data.age }) // Atualiza age se estiver presente
        })
        .where(eq(users.id, userId))
        .returning();

      // console.log("User updated successfully:", user?.id);
      return user;
    } catch (error) {
      console.error("Database update error:", error);
      throw error;
    }
  }

  // Video methods
  async getVideos(isExclusive?: boolean, category?: string): Promise<Video[]> {
    const conditions = [];

    if (isExclusive !== undefined) {
      conditions.push(eq(videos.isExclusive, isExclusive));
    }

    if (category) {
      conditions.push(eq(videos.categoryId, category));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(videos).where(and(...conditions)).orderBy(desc(videos.createdAt));
    }

    return await this.db.select().from(videos).orderBy(desc(videos.createdAt));
  }

  async getVideo(id: string): Promise<Video | undefined> {
    try {
      console.log(`Storage: Buscando vídeo no banco: ${id}`);
      const [video] = await this.db.select().from(videos).where(eq(videos.id, id));
      console.log(`Storage: Resultado da busca:`, video ? {
        id: video.id,
        title: video.title,
        type: video.type,
        categoryId: video.categoryId,
        isExclusive: video.isExclusive
      } : 'não encontrado');

      if (video) {
        // Sincroniza o contador de likes antes de retornar o vídeo
        await this.syncVideoLikesCount(id);

        // Busca novamente o vídeo com o contador atualizado
        const [updatedVideo] = await this.db.select().from(videos).where(eq(videos.id, id));
        console.log(`Storage: Vídeo atualizado:`, updatedVideo ? {
          id: updatedVideo.id,
          type: updatedVideo.type,
          categoryId: updatedVideo.categoryId
        } : 'não encontrado');
        return updatedVideo || undefined;
      }

      return undefined;
    } catch (error) {
      console.error(`Storage: Erro ao buscar vídeo ${id}:`, error);
      throw error;
    }
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await this.db.insert(videos).values(video).returning();
    return newVideo;
  }

  async updateVideo(id: string, video: Partial<InsertVideo>): Promise<Video> {
    const [updatedVideo] = await this.db.update(videos).set(video).where(eq(videos.id, id)).returning();
    return updatedVideo;
  }

  async deleteVideo(id: string): Promise<void> {
    // Excluir todos os vínculos antes de excluir o vídeo

    // 1. Buscar comentários vinculados ao vídeo
    const videoComments = await this.db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.videoId, id));

    // 2. Excluir likes e respostas dos comentários do vídeo
    for (const comment of videoComments) {
      await this.db.delete(commentLikes).where(eq(commentLikes.commentId, comment.id));
      await this.db.delete(commentReplies).where(eq(commentReplies.commentId, comment.id));
    }

    // 3. Excluir comentários vinculados a este vídeo
    await this.db.delete(comments).where(eq(comments.videoId, id));

    // 4. Excluir banners vinculados a este vídeo
    await this.db.delete(banners).where(eq(banners.videoId, id));

    // 5. Excluir likes vinculados a este vídeo
    await this.db.delete(videoLikes).where(eq(videoLikes.videoId, id));

    // 6. Buscar e excluir visualizações de popups vinculados ao vídeo
    const videoPopups = await this.db
      .select({ id: popups.id })
      .from(popups)
      .where(eq(popups.targetVideoId, id));

    for (const popup of videoPopups) {
      await this.db.delete(popupViews).where(eq(popupViews.popupId, popup.id));
    }

    // 7. Excluir popups vinculados a este vídeo
    await this.db.delete(popups).where(eq(popups.targetVideoId, id));

    // 8. Excluir atividades vinculadas a este vídeo
    await this.db.delete(userActivity).where(eq(userActivity.resourceId, id));

    // 9. Finalmente, excluir o vídeo
    await this.db.delete(videos).where(eq(videos.id, id));
  }

  async incrementVideoViews(id: string): Promise<void> {
    await this.db.update(videos)
      .set({ views: sql`${videos.views} + 1` })
      .where(eq(videos.id, id));
  }


  async likeVideo(videoId: string, userId: string): Promise<{ success: boolean; isLiked: boolean }> {
    // Verificar se o usuário já curtiu este vídeo
    const existingLike = await this.db.select()
      .from(videoLikes)
      .where(and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId)))
      .limit(1);

    if (existingLike.length > 0) {
      // Se já curtiu, remove o like (unlike)
      await this.db.delete(videoLikes)
        .where(and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId)));

      // Sincroniza o contador com base nos likes reais
      await this.syncVideoLikesCount(videoId);

      return { success: true, isLiked: false };
    } else {
      // Se não curtiu, adiciona o like
      await this.db.insert(videoLikes).values({
        userId,
        videoId
      });

      // Sincroniza o contador com base nos likes reais
      await this.syncVideoLikesCount(videoId);

      return { success: true, isLiked: true };
    }
  }

  async getUserVideoLike(videoId: string, userId: string): Promise<boolean> {
    const like = await this.db.select()
      .from(videoLikes)
      .where(and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId)))
      .limit(1);

    return like.length > 0;
  }

  async syncVideoLikesCount(videoId: string): Promise<void> {
    try {
      // Conta os likes reais na tabela video_likes
      const likesCount = await this.db.select({ count: sql<number>`count(*)` })
        .from(videoLikes)
        .where(eq(videoLikes.videoId, videoId));

      const actualCount = likesCount[0]?.count || 0;

      // Atualiza o contador na tabela videos
      await this.db.update(videos)
        .set({ likes: actualCount })
        .where(eq(videos.id, videoId));
    } catch (error) {
      console.error(`Erro ao sincronizar likes do vídeo ${videoId}:`, error);
    }
  }


  // Product methods
  async getProducts(type?: string, includeInactive?: boolean): Promise<Product[]> {
    const conditions = [];

    if (type) {
      conditions.push(eq(products.type, type));
    }

    // Se includeInactive for true (admin), não filtrar por isActive
    if (!includeInactive) {
      conditions.push(eq(products.isActive, true));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(products).where(and(...conditions)).orderBy(desc(products.createdAt));
    }

    // Se includeInactive for true, buscar todos os produtos
    if (includeInactive) {
      return await this.db.select().from(products).orderBy(desc(products.createdAt));
    }

    return await this.db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await this.db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await this.db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await this.db.update(products).set(product).where(eq(products.id, id)).returning();
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    // Excluir dados relacionados primeiro para evitar violação de foreign key

    // 1. Excluir comentários relacionados ao produto
    await this.db.delete(comments).where(eq(comments.productId, id));

    // 2. Buscar popups vinculados a este produto
    const relatedPopups = await this.db
      .select({ id: popups.id })
      .from(popups)
      .where(eq(popups.targetCourseId, id));

    // 3. Excluir visualizações dos popups vinculados
    for (const popup of relatedPopups) {
      await this.db.delete(popupViews).where(eq(popupViews.popupId, popup.id));
    }

    // 4. Excluir os popups vinculados ao produto
    await this.db.delete(popups).where(eq(popups.targetCourseId, id));

    // 5. Agora podemos excluir o produto com segurança
    await this.db.delete(products).where(eq(products.id, id));
  }

  // Coupon methods
  async getCoupons(category?: string, isActive?: boolean): Promise<Coupon[]> {
    const conditions = [];

    // Se isActive for undefined, buscar todos (usado pelo admin)
    if (isActive !== undefined) {
      conditions.push(eq(coupons.isActive, isActive));
    }

    if (category) {
      conditions.push(eq(coupons.category, category));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(coupons).where(and(...conditions)).orderBy(coupons.order, desc(coupons.createdAt));
    }

    return await this.db.select().from(coupons).orderBy(coupons.order, desc(coupons.createdAt));
  }

  async getCoupon(id: string): Promise<Coupon | undefined> {
    const [coupon] = await this.db.select().from(coupons).where(eq(coupons.id, id));
    return coupon || undefined;
  }

  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const [coupon] = await this.db.select().from(coupons).where(eq(coupons.code, code));
    return coupon || undefined;
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const [newCoupon] = await this.db.insert(coupons).values(coupon).returning();
    return newCoupon;
  }

  async updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon> {
    const [updatedCoupon] = await this.db.update(coupons).set(coupon).where(eq(coupons.id, id)).returning();
    return updatedCoupon;
  }

  async deleteCoupon(id: string): Promise<void> {
    await this.db.delete(coupons).where(eq(coupons.id, id));
  }

  async checkCouponOrderConflict(order: number, excludeId?: string): Promise<{ hasConflict: boolean; conflict?: Coupon }> {
    let query = this.db.select().from(coupons).where(eq(coupons.order, order));

    if (excludeId) {
      query = query.where(ne(coupons.id, excludeId)) as any;
    }

    const conflict = await query;

    return {
      hasConflict: conflict.length > 0,
      conflict: conflict[0]
    };
  }

  async reorderCouponsAfterInsert(targetOrder: number, excludeId?: string): Promise<void> {
    const conditions = [gte(coupons.order, targetOrder)];

    // Excluir o cupom que está sendo movido para evitar incrementá-lo
    if (excludeId) {
      conditions.push(sql`${coupons.id} != ${excludeId}`);
    }

    await this.db
      .update(coupons)
      .set({ order: sql`${coupons.order} + 1` })
      .where(and(...conditions));
  }

  async reorderCouponsAfterDeletion(deletedOrder: number): Promise<void> {
    await this.db
      .update(coupons)
      .set({ order: sql`${coupons.order} - 1` })
      .where(gte(coupons.order, deletedOrder + 1));
  }

  async reorderCouponsAfterStatusChange(couponId: string, newIsActive: boolean, targetOrder?: number): Promise<void> {
    const coupon = await this.getCoupon(couponId);
    if (!coupon) return;

    if (!newIsActive) {
      // Desativando: decrementar sucessores e marcar como -1
      if (coupon.order >= 0) {
        await this.reorderCouponsAfterDeletion(coupon.order);
      }
      await this.db
        .update(coupons)
        .set({ order: -1 })
        .where(eq(coupons.id, couponId));
    } else {
      // Reativando: verificar se targetOrder foi fornecida, senão usar próxima disponível
      let newOrder = targetOrder;

      if (newOrder === undefined || newOrder < 0) {
        // Se não forneceu ordem específica, colocar no final
        const maxOrder = await this.db
          .select({ max: sql<number>`COALESCE(MAX(${coupons.order}), 0)` })
          .from(coupons)
          .where(sql`${coupons.order} >= 0`);

        newOrder = (maxOrder[0]?.max ?? 0) + 1;
      } else {
        // Se forneceu ordem específica, incrementar cupons naquela posição
        await this.reorderCouponsAfterInsert(newOrder, couponId);
      }

      await this.db
        .update(coupons)
        .set({ order: newOrder })
        .where(eq(coupons.id, couponId));
    }
  }

  // Category methods
  async getCategories(isActive?: boolean): Promise<Category[]> {
    const conditions = [];

    // Se isActive for undefined, buscar todos (usado pelo admin)
    if (isActive !== undefined) {
      conditions.push(eq(categories.isActive, isActive));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(categories).where(and(...conditions)).orderBy(categories.order, desc(categories.createdAt));
    }

    return await this.db.select().from(categories).orderBy(categories.order, desc(categories.createdAt));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await this.db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(categoryData: InsertCategory & { shouldReorder?: boolean }): Promise<Category> {
    try {
      const { shouldReorder, ...data } = categoryData;

      // Se deve reordenar e há uma ordem especificada
      if (shouldReorder && data.order !== undefined) {
        // Incrementar ordem de todas as categorias >= ordem escolhida
        await this.db.update(categories)
          .set({ order: sql`${categories.order} + 1` })
          .where(gte(categories.order, data.order));
      }

      const [newCategory] = await this.db.insert(categories)
        .values(data)
        .returning();
      return newCategory;
    } catch (error: any) {
      throw new Error(`Erro ao criar categoria: ${error.message}`);
    }
  }

  async updateCategory(id: string, categoryData: Partial<InsertCategory> & { shouldReorder?: boolean }): Promise<Category> {
    const { shouldReorder, ...data } = categoryData;

    // Se deve reordenar e há uma ordem especificada
    if (shouldReorder && data.order !== undefined) {
      // Incrementar ordem de todas as categorias >= ordem escolhida (exceto a atual)
      await this.db.update(categories)
        .set({ order: sql`${categories.order} + 1` })
        .where(and(
          gte(categories.order, data.order),
          ne(categories.id, id)
        ));
    }

    const [updatedCategory] = await this.db.update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();

    if (!updatedCategory) {
      throw new Error("Categoria não encontrada");
    }

    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    await this.db.delete(categories).where(eq(categories.id, id));
  }

  async checkCategoryOrderConflict(order: number, excludeId?: string): Promise<{ hasConflict: boolean; conflict?: Category }> {
    let query = this.db.select().from(categories).where(eq(categories.order, order));

    if (excludeId) {
      query = query.where(ne(categories.id, excludeId)) as any;
    }

    const conflict = await query;

    return {
      hasConflict: conflict.length > 0,
      conflict: conflict[0]
    };
  }

  async reorderCategoriesAfterInsert(targetOrder: number, excludeId?: string): Promise<void> {
    const conditions = [gte(categories.order, targetOrder)];

    if (excludeId) {
      conditions.push(sql`${categories.id} != ${excludeId}`);
    }

    await this.db
      .update(categories)
      .set({ order: sql`${categories.order} + 1` })
      .where(and(...conditions));
  }

  async reorderCategoriesAfterDeletion(deletedOrder: number): Promise<void> {
    await this.db
      .update(categories)
      .set({ order: sql`${categories.order} - 1` })
      .where(gte(categories.order, deletedOrder + 1));
  }


  // Banner methods
  async getBanners(isActive?: boolean): Promise<Banner[]> {
    if (isActive !== undefined) {
      const now = new Date();

      return await this.db.select().from(banners).where(
        and(
          eq(banners.isActive, isActive),
          // Banner deve estar ativo E (sem programação OU dentro do período programado)
          or(
            and(
              isNull(banners.startDateTime),
              isNull(banners.endDateTime)
            ),
            and(
              or(
                isNull(banners.startDateTime),
                lte(banners.startDateTime, now)
              ),
              or(
                isNull(banners.endDateTime),
                gte(banners.endDateTime, now)
              )
            )
          )
        )
      ).orderBy(banners.order, desc(banners.createdAt));
    }

    return await this.db.select().from(banners).orderBy(desc(banners.createdAt));
  }

  async getVideoBanners(videoId: string): Promise<Banner[]> {
    const now = new Date();

    return await this.db.select().from(banners).where(
      and(
        eq(banners.videoId, videoId),
        eq(banners.page, 'video_specific'),
        eq(banners.isActive, true),
        // Verificar se o banner está dentro do período programado
        or(
          and(
            isNull(banners.startDateTime),
            isNull(banners.endDateTime)
          ),
          and(
            or(
              isNull(banners.startDateTime),
              lte(banners.startDateTime, now)
            ),
            or(
              isNull(banners.endDateTime),
              gte(banners.endDateTime, now)
            )
          )
        )
      )
    ).orderBy(banners.order);
  }

  async getBanner(id: string): Promise<Banner | undefined> {
    const [banner] = await this.db.select().from(banners).where(eq(banners.id, id));
    return banner || undefined;
  }

  async createBanner(bannerData: InsertBanner & { shouldReorder?: boolean }): Promise<Banner> {
    try {
      const { shouldReorder, ...data } = bannerData;

      // Process datetime fields if they exist
      const processedData = {
        ...data,
        startDateTime: data.startDateTime ? new Date(data.startDateTime) : null,
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : null,
      };

      // Se deve reordenar e há uma ordem especificada
      if (shouldReorder && processedData.order !== undefined && processedData.page) {
        // Incrementar ordem de todos os banners >= ordem escolhida da mesma página
        await this.reorderBannersAfterInsert(processedData.order, processedData.page);
      }

      const [newBanner] = await this.db.insert(banners).values(processedData).returning();
      return newBanner;
    } catch (error: any) {
      throw new Error(`Erro ao criar banner: ${error.message}`);
    }
  }

  async updateBanner(id: string, bannerData: Partial<InsertBanner> & { shouldReorder?: boolean }): Promise<Banner> {
    const { shouldReorder, ...data } = bannerData;

    // Process datetime fields if they exist
    const processedData = {
      ...data,
      startDateTime: data.startDateTime ? new Date(data.startDateTime) : data.startDateTime,
      endDateTime: data.endDateTime ? new Date(data.endDateTime) : data.endDateTime,
    };

    // Se deve reordenar e há uma ordem especificada
    if (shouldReorder && processedData.order !== undefined && processedData.page) {
      // Incrementar ordem de todos os banners >= ordem escolhida da mesma página (exceto o atual)
      await this.reorderBannersAfterInsert(processedData.order, processedData.page, id);
    }

    const [updatedBanner] = await this.db.update(banners).set(processedData).where(eq(banners.id, id)).returning();

    if (!updatedBanner) {
      throw new Error("Banner não encontrado");
    }

    return updatedBanner;
  }

  async deleteBanner(id: string): Promise<void> {
    await this.db.delete(banners).where(eq(banners.id, id));
  }

  async checkBannerOrderConflict(order: number, page: string, excludeId?: string): Promise<{ hasConflict: boolean; conflict?: Banner }> {
    const conditions = [
      eq(banners.order, order),
      eq(banners.page, page)
    ];

    if (excludeId) {
      conditions.push(ne(banners.id, excludeId));
    }

    const conflict = await this.db.select().from(banners).where(and(...conditions));

    return {
      hasConflict: conflict.length > 0,
      conflict: conflict[0]
    };
  }

  async reorderBannersAfterInsert(targetOrder: number, page: string, excludeId?: string): Promise<void> {
    const conditions = [
      gte(banners.order, targetOrder),
      eq(banners.page, page)
    ];

    if (excludeId) {
      conditions.push(sql`${banners.id} != ${excludeId}`);
    }

    await this.db
      .update(banners)
      .set({ order: sql`${banners.order} + 1` })
      .where(and(...conditions));
  }

  async reorderBannersAfterDeletion(deletedOrder: number, page: string): Promise<void> {
    await this.db
      .update(banners)
      .set({ order: sql`${banners.order} - 1` })
      .where(and(
        gte(banners.order, deletedOrder + 1),
        eq(banners.page, page)
      ));
  }

  // Post methods
  async getPosts(): Promise<(Post & { user: Pick<User, 'id' | 'name' | 'avatar' | 'isAdmin'>; taggedUsers?: Array<Pick<User, 'id' | 'name' | 'avatar'>> })[]> {
    const postsData = await this.db.select({
      id: posts.id,
      userId: posts.userId,
      content: posts.content,
      imageUrl: posts.imageUrl,
      likes: posts.likes,
      shares: posts.shares,
      createdAt: posts.createdAt,
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        isAdmin: users.isAdmin,
      }
    }).from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt));

    // Fetch tagged users for each post
    const postsWithTags = await Promise.all(
      postsData.map(async (post) => {
        const taggedUsers = await this.getPostTaggedUsers(post.id);
        return { ...post, taggedUsers };
      })
    );

    return postsWithTags;
  }

  async getPostTaggedUsers(postId: string): Promise<Array<Pick<User, 'id' | 'name' | 'avatar'>>> {
    const tags = await this.db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      })
      .from(postTags)
      .innerJoin(users, eq(postTags.taggedUserId, users.id))
      .where(eq(postTags.postId, postId));

    return tags;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await this.db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async createPost(post: InsertPost, taggedUserIds?: string[]): Promise<Post> {
    const [newPost] = await this.db.insert(posts).values(post).returning();

    // Save tagged users if provided
    if (taggedUserIds && taggedUserIds.length > 0) {
      await this.db.insert(postTags).values(
        taggedUserIds.map(taggedUserId => ({
          postId: newPost.id,
          taggedUserId
        }))
      );
    }

    return newPost;
  }

  async updatePost(id: string, post: Partial<InsertPost>): Promise<Post> {
    const [updatedPost] = await this.db.update(posts).set(post).where(eq(posts.id, id)).returning();
    return updatedPost;
  }

  async deletePost(id: string): Promise<void> {
    await this.db.delete(posts).where(eq(posts.id, id));
  }

  // Toggle like/unlike for a post
  async togglePostLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    try {
      // Verificar se o usuário já curtiu
      const existingLike = await this.checkPostLike(postId, userId);

      if (existingLike) {
        // Remover curtida
        await this.db.delete(postLikes)
          .where(and(
            eq(postLikes.postId, postId),
            eq(postLikes.userId, userId)
          ));
      } else {
        // Adicionar curtida
        await this.db.insert(postLikes).values({
          id: createId(),
          postId,
          userId,
          createdAt: new Date()
        });
      }

      // Buscar contagem atualizada
      const likesCount = await this.getPostLikesCount(postId);
      const liked = !existingLike;

      console.log(`Post ${postId} like toggled. Liked: ${liked}, Count: ${likesCount}`);

      return { liked, likesCount };
    } catch (error) {
      console.error('Error toggling post like:', error);
      throw error;
    }
  }

  // Helper to get the current like count for a post
  async getPostLikesCount(postId: string): Promise<number> {
    try {
      const result = await this.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(postLikes)
        .where(eq(postLikes.postId, postId));

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting post likes count:', error);
      return 0;
    }
  }

  async getPostComments(postId: string): Promise<(Comment & { user: Pick<User, 'id' | 'name' | 'avatar'> })[]> {
    try {
      const result = await this.db.select({
        id: comments.id,
        userId: comments.userId,
        videoId: comments.videoId,
        postId: comments.postId,
        productId: comments.productId,
        content: comments.content,
        likesCount: comments.likesCount,
        repliesCount: comments.repliesCount,
        createdAt: comments.createdAt,
        user: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        }
      }).from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.postId, postId))
        .orderBy(desc(comments.createdAt));

      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching post comments:', error);
      return [];
    }
  }

  async createPostComment(commentData: { postId: string; userId: string; content: string }): Promise<Comment & { user: Pick<User, 'id' | 'name' | 'avatar'> }> {
    const [newComment] = await this.db.insert(comments)
      .values({
        postId: commentData.postId,
        userId: commentData.userId,
        content: commentData.content,
        likesCount: 0,
        repliesCount: 0
      })
      .returning();

    // Get comment with user data
    const [commentWithUser] = await this.db.select({
      id: comments.id,
      userId: comments.userId,
      videoId: comments.videoId,
      postId: comments.postId,
      productId: comments.productId,
      content: comments.content,
      likesCount: comments.likesCount,
      repliesCount: comments.repliesCount,
      createdAt: comments.createdAt,
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      }
    }).from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.id, newComment.id));

    return commentWithUser;
  }

  // Saved posts functions
  async toggleSavedPost(postId: string, userId: string): Promise<{ saved: boolean }> {
    const existingSave = await this.db
      .select()
      .from(savedPosts)
      .where(and(eq(savedPosts.postId, postId), eq(savedPosts.userId, userId)))
      .limit(1);

    if (existingSave.length > 0) {
      // Remove save
      await this.db
        .delete(savedPosts)
        .where(and(eq(savedPosts.postId, postId), eq(savedPosts.userId, userId)));
      return { saved: false };
    } else {
      // Add save
      await this.db.insert(savedPosts).values({
        postId,
        userId,
        createdAt: new Date(),
      });
      return { saved: true };
    }
  }

  async getUserSavedPost(postId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(savedPosts)
      .where(and(eq(savedPosts.postId, postId), eq(savedPosts.userId, userId)))
      .limit(1);

    return result.length > 0;
  }

  async getUserSavedPosts(userId: string): Promise<any[]> {
    const result = await this.db
      .select({
        id: savedPosts.id,
        createdAt: savedPosts.createdAt,
        post: {
          id: posts.id,
          content: posts.content,
          imageUrl: posts.imageUrl,
          likes: posts.likes,
          shares: posts.shares,
          createdAt: posts.createdAt,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
            isAdmin: users.isAdmin,
          },
        },
      })
      .from(savedPosts)
      .leftJoin(posts, eq(savedPosts.postId, posts.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .where(eq(savedPosts.userId, userId))
      .orderBy(desc(savedPosts.createdAt));

    return result;
  }

  async incrementPostShares(postId: string): Promise<{ sharesCount: number }> {
    try {
      // Primeiro verifica se o post existe
      const [existingPost] = await this.db
        .select({ id: posts.id, shares: posts.shares })
        .from(posts)
        .where(eq(posts.id, postId));

      if (!existingPost) {
        throw new Error('Post not found');
      }

      // Incrementa o contador de compartilhamentos
      await this.db
        .update(posts)
        .set({ shares: sql`COALESCE(shares, 0) + 1` })
        .where(eq(posts.id, postId));

      // Return updated shares count
      const [updatedPost] = await this.db
        .select({ shares: posts.shares })
        .from(posts)
        .where(eq(posts.id, postId));

      console.log(`Post ${postId} compartilhamentos incrementado para: ${updatedPost?.shares || 0}`);

      return { sharesCount: updatedPost?.shares || 0 };
    } catch (error) {
      console.error('Error incrementing post shares:', error);
      throw error;
    }
  }

  async getUserPostLike(postId: string, userId: string): Promise<boolean> {
    try {
      const [like] = await this.db.select()
        .from(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
        .limit(1);

      return like !== undefined;
    } catch (error) {
      console.error('Error checking user post like:', error);
      return false;
    }
  }

  async checkPostLike(postId: string, userId: string): Promise<boolean> {
    return this.getUserPostLike(postId, userId);
  }

  async likePost(postId: string, userId: string): Promise<void> {
    try {
      await this.db.insert(postLikes).values({
        id: createId(),
        postId,
        userId,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    try {
      await this.db.delete(postLikes)
        .where(and(
          eq(postLikes.postId, postId),
          eq(postLikes.userId, userId)
        ));
    } catch (error) {
      console.error('Error unliking post:', error);
    }
  }

  async getPostLikesCountResult(postId: string): Promise<{ liked: boolean; likesCount: number }> {
    try {
      const count = await this.getPostLikesCount(postId);
      return { liked: false, likesCount: count };
    } catch (error) {
      console.error('Error getting post likes count:', error);
      return { liked: false, likesCount: 0 };
    }
  }

  // Comment methods
  async getComments(videoId?: string, postId?: string): Promise<(Comment & { user: Pick<User, 'id' | 'name' | 'avatar'> })[]> {
    const conditions = [];

    if (videoId) {
      conditions.push(eq(comments.videoId, videoId));
    }

    if (postId) {
      conditions.push(eq(comments.postId, postId));
    }

    const baseQuery = this.db.select({
      id: comments.id,
      userId: comments.userId,
      videoId: comments.videoId,
      postId: comments.postId,
      productId: comments.productId,
      content: comments.content,
      createdAt: comments.createdAt,
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      }
    }).from(comments)
      .innerJoin(users, eq(comments.userId, users.id));

    if (conditions.length > 0) {
      return await baseQuery.where(and(...conditions)).orderBy(desc(comments.createdAt));
    }

    return await baseQuery.orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await this.db.insert(comments).values(comment).returning();
    return newComment;
  }

  async deleteComment(id: string): Promise<void> {
    await this.db.delete(comments).where(eq(comments.id, id));
  }

  // Subscription methods
  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await this.db.select().from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.isActive, true)));
    return subscription || undefined;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await this.db.insert(subscriptions).values(subscription).returning();
    return newSubscription;
  }

  async updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription> {
    const [updatedSubscription] = await this.db.update(subscriptions).set(subscription)
      .where(eq(subscriptions.id, id)).returning();
    return updatedSubscription;
  }

  // Activity methods
  async getUserActivity(userId: string, limit: number = 10): Promise<Activity[]> {
    return this.db.select().from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.createdAt))
      .limit(limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await this.db.insert(userActivity).values(activity).returning();
    return newActivity;
  }

  // Stats methods
  async getUserStats(userId: string): Promise<{ videosWatched: number; downloads: number; couponsUsed: number; }> {
    const videosWatched = await this.db.select({ count: sql<number>`count(*)` })
      .from(userActivity)
      .where(and(eq(userActivity.userId, userId), eq(userActivity.action, 'video_watched')));

    const downloads = await this.db.select({ count: sql<number>`count(*)` })
      .from(userActivity)
      .where(and(eq(userActivity.userId, userId), eq(userActivity.action, 'product_downloaded')));

    const couponsUsed = await this.db.select({ count: sql<number>`count(*)` })
      .from(userActivity)
      .where(and(eq(userActivity.userId, userId), eq(userActivity.action, 'coupon_used')));

    return {
      videosWatched: videosWatched[0]?.count || 0,
      downloads: downloads[0]?.count || 0,
      couponsUsed: couponsUsed[0]?.count || 0,
    };
  }

  // Popup methods
  async getPopups(isActive?: boolean): Promise<Popup[]> {
    if (isActive !== undefined) {
      return await this.db.select().from(popups).where(eq(popups.isActive, isActive)).orderBy(desc(popups.createdAt));
    }
    return await this.db.select().from(popups).orderBy(desc(popups.createdAt));
  }

  async getPopup(id: string): Promise<Popup | undefined> {
    const [popup] = await this.db.select().from(popups).where(eq(popups.id, id));
    return popup || undefined;
  }

  async getActivePopupsForTrigger(
    trigger: string,
    targetPage?: string,
    targetVideoId?: string,
    targetCourseId?: string
  ): Promise<Popup[]> {
    try {
      let conditions = [
        eq(popups.trigger, trigger),
        eq(popups.isActive, true)
      ];

      // Para exit_intent, não aplicar filtros adicionais
      if (trigger !== 'exit_intent') {
        // Apply additional filters based on the trigger type
        if (trigger === 'page_specific' && targetPage) {
          conditions.push(eq(popups.targetPage, targetPage));
        }

        if (targetVideoId) {
          conditions.push(eq(popups.targetVideoId, targetVideoId));
        }

        if (targetCourseId) {
          conditions.push(eq(popups.targetCourseId, targetCourseId));
        }
      }

      const results = await db
        .select()
        .from(popups)
        .where(and(...conditions))
        .orderBy(popups.createdAt);

      return results;
    } catch (error) {
      console.error('Error fetching active popups:', error);
      return [];
    }
  }

  async createPopup(popup: InsertPopup): Promise<Popup> {
    const [newPopup] = await this.db.insert(popups).values(popup).returning();
    return newPopup;
  }

  async updatePopup(id: string, popup: Partial<InsertPopup>): Promise<Popup> {
    const [updatedPopup] = await this.db.update(popups).set(popup).where(eq(popups.id, id)).returning();
    return updatedPopup;
  }

  async deletePopup(id: string): Promise<void> {
    // Primeiro, excluir todos os registros de popup_views relacionados
    await this.db.delete(popupViews).where(eq(popupViews.popupId, id));

    // Depois, excluir o popup
    await this.db.delete(popups).where(eq(popups.id, id));
  }

  async recordPopupView(view: InsertPopupView): Promise<PopupView> {
    const [newView] = await this.db.insert(popupViews).values(view).returning();
    return newView;
  }

  async hasUserSeenPopup(userId: string, popupId: string, sessionId: string): Promise<boolean> {
    const view = await this.db.select()
      .from(popupViews)
      .where(and(
        eq(popupViews.userId, userId),
        eq(popupViews.popupId, popupId),
        eq(popupViews.sessionId, sessionId)
      ))
      .limit(1);

    return view.length > 0;
  }

  // Notification methods
  async getNotifications(isActive?: boolean, targetAudience?: string): Promise<Notification[]> {
    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(notifications.isActive, isActive));
    }

    if (targetAudience) {
      conditions.push(or(
        eq(notifications.targetAudience, targetAudience),
        eq(notifications.targetAudience, 'all')
      ));
    }

    // Add scheduling logic: only show notifications that are currently active
    // Ajustar para o fuso horário de Brasília (UTC-3)
    const now = new Date();
    const brasiliaOffset = -3 * 60; // UTC-3 em minutos
    const nowInBrasilia = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // Subtrair 3 horas

    conditions.push(or(
      isNull(notifications.startDateTime),
      lte(notifications.startDateTime, nowInBrasilia)
    ));
    conditions.push(or(
      isNull(notifications.endDateTime),
      gte(notifications.endDateTime, nowInBrasilia)
    ));

    if (conditions.length > 0) {
      return await this.db.select().from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt));
    }

    return await this.db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  // Função específica para o admin que mostra TODAS as notificações sem filtros de agendamento
  async getAllNotificationsForAdmin(): Promise<Notification[]> {
    return await this.db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async getNotificationById(id: string): Promise<Notification | undefined> {
    const [notification] = await this.db.select().from(notifications).where(eq(notifications.id, id));
    return notification || undefined;
  }

  async getActiveNotificationsForUser(userId: string, userPlanType: string): Promise<Notification[]> {
    // Ajustar para o fuso horário de Brasília (UTC-3)
    const now = new Date();
    const brasiliaOffset = -3 * 60; // UTC-3 em minutos
    const nowInBrasilia = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // Subtrair 3 horas

    // Lógica corrigida:
    // - Notificações 'all' aparecem para todos
    // - Notificações 'free' só aparecem para usuários free
    // - Notificações 'premium' só aparecem para usuários premium
    let audienceFilter;
    if (userPlanType === 'premium') {
      // Premium vê apenas notificações 'all' e 'premium'
      audienceFilter = or(
        eq(notifications.targetAudience, 'all'),
        eq(notifications.targetAudience, 'premium')
      );
    } else {
      // Free vê apenas notificações 'all' e 'free'
      audienceFilter = or(
        eq(notifications.targetAudience, 'all'),
        eq(notifications.targetAudience, 'free')
      );
    }

    return await this.db.select().from(notifications)
      .where(and(
        eq(notifications.isActive, true),
        audienceFilter,
        or(
          isNull(notifications.startDateTime),
          lte(notifications.startDateTime, nowInBrasilia)
        ),
        or(
          isNull(notifications.endDateTime),
          gte(notifications.endDateTime, nowInBrasilia)
        )
      ))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await this.db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async updateNotification(id: string, notification: Partial<InsertNotification>): Promise<Notification> {
    const [updatedNotification] = await this.db.update(notifications).set(notification).where(eq(notifications.id, id)).returning();
    return updatedNotification;
  }

  async deleteNotification(id: string): Promise<void> {
    // Primeiro excluir todas as notificações do usuário relacionadas
    await this.db.delete(userNotifications).where(eq(userNotifications.notificationId, id));

    // Depois excluir a notificação principal
    await this.db.delete(notifications).where(eq(notifications.id, id));
  }

  // User Notification methods
  async getUserNotifications(userId: string, isRead?: boolean): Promise<(UserNotification & { notification: Notification })[]> {
    const conditions = [eq(userNotifications.userId, userId)];

    if (isRead !== undefined) {
      conditions.push(eq(userNotifications.isRead, isRead));
    }

    return await this.db.select({
      id: userNotifications.id,
      userId: userNotifications.userId,
      notificationId: userNotifications.notificationId,
      isRead: userNotifications.isRead,
      readAt: userNotifications.readAt,
      createdAt: userNotifications.createdAt,
      notification: notifications
    })
    .from(userNotifications)
    .innerJoin(notifications, eq(userNotifications.notificationId, notifications.id))
    .where(and(...conditions))
    .orderBy(desc(userNotifications.createdAt));
  }

  async createUserNotification(userNotification: InsertUserNotification): Promise<UserNotification> {
    const [newUserNotification] = await this.db.insert(userNotifications).values(userNotification).returning();
    return newUserNotification;
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<UserNotification> {
    const [updatedUserNotification] = await this.db.update(userNotifications)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.notificationId, notificationId)
      ))
      .returning();

    return updatedUserNotification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(userNotifications)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.isRead, false)
        )
      );
  }

  async removeUserNotification(userId: string, notificationId: string): Promise<void> {
    await this.db.delete(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.notificationId, notificationId)
        )
      );
  }

  async getUserNotificationByIds(userId: string, notificationId: string) {
    const [userNotification] = await db
      .select()
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.notificationId, notificationId)
        )
      )
      .limit(1);

    return userNotification;
  }

  // Notification Settings methods
  async getNotificationSettings(userId: string) {
    const [settings] = await this.db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);

    return settings;
  }

  async saveNotificationSettings(userId: string, settings: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    smsEnabled: boolean;
    soundEnabled: boolean;
  }) {
    // Verificar se já existe configuração
    const existing = await this.getNotificationSettings(userId);

    if (existing) {
      // Atualizar existente
      const [updated] = await this.db
        .update(notificationSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(notificationSettings.userId, userId))
        .returning();

      return updated;
    } else {
      // Criar novo
      const [created] = await this.db
        .insert(notificationSettings)
        .values({
          userId,
          ...settings
        })
        .returning();

      return created;
    }
  }

  // Seed methods for initial setup
  async seedDefaultUsers(): Promise<void> {
    try {
      // Check if users already exist
      const existingUsers = await this.db.select().from(users).limit(1);
      if (existingUsers.length > 0) {
        return;
      }

      // Create admin user
      const adminUser = await this.createUser({
        username: "admin",
        email: "admin@belezacomluci.com",
        password: await hashPassword("Admin@123"),
        name: "Luci - Administradora",
        isAdmin: true
      });

      // Create client user
      const clientUser = await this.createUser({
        username: "cliente",
        email: "cliente@belezacomluci.com",
        password: await hashPassword("Cliente@123"),
        name: "Maria Silva - Cliente",
        isAdmin: false
      });

      // Update client subscription to premium for testing
      await this.db.update(subscriptions)
        .set({ planType: 'premium' })
        .where(eq(subscriptions.userId, clientUser.id));


      // Create some sample content
      await this.seedSampleContent(adminUser.id);

    } catch (error) {
      // Error seeding users
    }
  }

  async seedSampleContent(adminId: string): Promise<void> {
    try {
      // Create sample videos
      const video1 = await this.db.insert(videos).values({
        title: "Tutorial de Maquiagem Natural",
        description: "Aprenda a fazer uma maquiagem natural perfeita para o dia a dia",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        thumbnailUrl: "https://via.placeholder.com/400x225/ff69b4/ffffff?text=Maquiagem+Natural",
        isExclusive: false,
        category: "makeup",
        duration: "15:00"
      }).returning();

      const video2 = await this.db.insert(videos).values({
        title: "Rotina de Skincare Premium",
        description: "Rotina completa de cuidados com a pele - conteúdo exclusivo",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        thumbnailUrl: "https://via.placeholder.com/400x225/ffd700/ffffff?text=Skincare+Premium",
        isExclusive: true,
        category: "skincare",
        duration: "25:00"
      }).returning();

      // Criar pontos para os usuários existentes
      const existingUsers = await this.db.select().from(users);

      for (const user of existingUsers) {
        // Verificar se já tem pontos
        const existingPoints = await this.getUserPoints(user.id);

        if (!existingPoints) {
          let points = 0;
          let level = 'bronze';

          // Dar pontos diferentes baseado no tipo de usuário
          if (user.isAdmin) {
            points = 1250;
            level = 'diamond';
          } else {
            points = Math.floor(Math.random() * 800) + 50; // Entre 50 e 850 pontos
            if (points >= 1500) level = 'diamond';
            else if (points >= 500) level = 'gold';
            else if (points >= 100) level = 'silver';
          }

          await this.db.insert(userPointsTable).values({
            userId: user.id,
            totalPoints: points,
            currentLevel: level,
            levelProgress: points,
            freeReferrals: Math.floor(Math.random() * 5),
            premiumReferrals: Math.floor(Math.random() * 3)
          });
        }
      }

      // Create sample products
      await this.db.insert(products).values([
        {
          title: "E-book: Guia Completo de Maquiagem",
          description: "Manual completo com todas as técnicas de maquiagem",
          type: "ebook",
          fileUrl: "https://via.placeholder.com/1/ffffff/000000.pdf",
          coverImageUrl: "https://via.placeholder.com/300x400/ff69b4/ffffff?text=E-book+Maquiagem",
          isActive: true // Adicionado para que apareça por padrão
        },
        {
          title: "Checklist de Skincare",
          description: "Lista completa de produtos e rotinas para sua pele",
          type: "checklist",
          fileUrl: "https://via.placeholder.com/1/ffffff/000000.pdf",
          coverImageUrl: "https://via.placeholder.com/300x400/ffd700/ffffff?text=Checklist+Skincare",
          isActive: true // Adicionado para que apareça por padrão
        }
      ]);

      // Create sample coupons
      await this.db.insert(coupons).values([
        {
          code: "LUCI20",
          brand: "Sephora",
          description: "20% de desconto em toda linha de base",
          discount: "20%",
          category: "makeup",
          storeUrl: "https://sephora.com.br",
          isActive: true, // Adicionado para que apareça por padrão
          order: 1 // Adicionado order
        },
        {
          code: "SKINCARE15",
          brand: "The Ordinary",
          description: "15% off em produtos para skincare",
          discount: "15%",
          category: "skincare",
          storeUrl: "https://theordinary.com",
          isActive: false, // Adicionado para que não apareça por padrão
          order: 2 // Adicionado order
        }
      ]);

      // Create sample banners
      await this.db.insert(banners).values([
        {
          title: "Novidades em Maquiagem!",
          description: "Descubra as últimas tendências",
          imageUrl: "https://via.placeholder.com/1200x400/ff69b4/ffffff?text=Novidades+em+Maquiagem",
          linkUrl: "/products",
          order: 1,
          isActive: true
        },
        {
          title: "Cupons Exclusivos",
          description: "Descontos especiais para você",
          imageUrl: "https://via.placeholder.com/1200x400/ffd700/ffffff?text=Cupons+Exclusivos",
          linkUrl: "/coupons",
          order: 2,
          isActive: true
        }
      ]);


    } catch (error) {
      // Error seeding content
    }
  }

  // ========== REFERRAL SYSTEM METHODS ==========

  // Share Settings
  async getShareSettings() {
    const [settings] = await this.db.select().from(shareSettings).limit(1);
    return settings || { freeReferralPoints: 25, premiumReferralPoints: 50 };
  }

  async updateShareSettings(freePoints: number, premiumPoints: number, updatedBy: string) {
    // First try to update existing settings
    const existingSettings = await this.getShareSettings();

    if (existingSettings.id) {
      return await this.db
        .update(shareSettings)
        .set({
          freeReferralPoints: freePoints,
          premiumReferralPoints: premiumPoints,
          updatedAt: new Date(),
          updatedBy: updatedBy
        })
        .where(eq(shareSettings.id, existingSettings.id))
        .returning();
    } else {
      // If no settings exist, create new
      return await this.db
        .insert(shareSettings)
        .values({
          freeReferralPoints: freePoints,
          premiumReferralPoints: premiumPoints,
          updatedBy: updatedBy
        })
        .returning();
    }
  }

  // Referrals
  async getReferralsByUser(userId: string) {
    return await this.db
      .select({
        id: referrals.id,
        referredId: referrals.referredId,
        referredName: users.name,
        referredEmail: users.email,
        pointsAwarded: referrals.pointsAwarded,
        referredPlanType: referrals.referredPlanType,
        createdAt: referrals.createdAt
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.referredId, users.id))
      .where(eq(referrals.referrerId, userId))
      .orderBy(referrals.createdAt);
  }

  async getUserReferralStats(userId: string) {
    const userReferrals = await this.getReferralsByUser(userId);

    const freeReferrals = userReferrals.filter(r => r.referredPlanType === 'free').length;
    const premiumReferrals = userReferrals.filter(r => r.referredPlanType === 'premium').length;
    const totalReferrals = userReferrals.length;

    return {
      totalReferrals,
      freeReferrals,
      premiumReferrals,
      referralHistory: userReferrals
    };
  }

  async getAllUsersWithReferralData() {
    // Get all users with their plan type and referral counts
    const usersWithPlans = await this.getAllUsers();

    const usersWithReferrals = await Promise.all(
      usersWithPlans.map(async (user) => {
        const referralStats = await this.getUserReferralStats(user.id);
        return {
          ...user,
          ...referralStats
        };
      })
    );

    return usersWithReferrals;
  }

  async createReferral(referrerId: string, referredId: string, referredPlanType: string) {
    const settings = await this.getShareSettings();
    const pointsAwarded = referredPlanType === 'premium'
      ? settings.premiumReferralPoints
      : settings.freeReferralPoints;

    // Create the referral record
    const [referral] = await this.db
      .insert(referrals)
      .values({
        referrerId,
        referredId,
        pointsAwarded,
        referredPlanType
      })
      .returning();

    // Update user points
    await this.updateUserPoints(referrerId, pointsAwarded, referredPlanType as 'free' | 'premium');

    return referral;
  }

  async updateUserPoints(userId: string, pointsToAdd: number, referralType?: 'free' | 'premium') {
    // Get or create user points record
    let [userPointsRecord] = await this.db
      .select()
      .from(userPointsTable)
      .where(eq(userPointsTable.userId, userId));

    if (!userPointsRecord) {
      // Create new points record
      [userPointsRecord] = await this.db
        .insert(userPointsTable)
        .values({
          userId,
          totalPoints: pointsToAdd,
          freeReferrals: referralType === 'free' ? 1 : 0,
          premiumReferrals: referralType === 'premium' ? 1 : 0
        })
        .returning();
    } else {
      // Update existing points record
      const newTotalPoints = userPointsRecord.totalPoints + pointsToAdd;
      const newFreeReferrals = userPointsRecord.freeReferrals + (referralType === 'free' ? 1 : 0);
      const newPremiumReferrals = userPointsRecord.premiumReferrals + (referralType === 'premium' ? 1 : 0);

      [userPointsRecord] = await this.db
        .update(userPointsTable)
        .set({
          totalPoints: newTotalPoints,
          freeReferrals: newFreeReferrals,
          premiumReferrals: newPremiumReferrals,
          updatedAt: new Date()
        })
        .where(eq(userPointsTable.userId, userId))
        .returning();
    }

    return userPointsRecord;
  }

  // ========== GAMIFICATION IMPLEMENTATIONS ==========

  // User Points methods (basic implementations - extended in DatabaseStorageWithGamification)
  async getUserPoints(userId: string): Promise<UserPoints | undefined> {
    const [userPointsRecord] = await this.db.select().from(userPointsTable).where(eq(userPointsTable.userId, userId));
    return userPointsRecord || undefined;
  }

  async createUserPoints(userPointsData: InsertUserPoints): Promise<UserPoints> {
    const [newUserPoints] = await this.db.insert(userPointsTable).values(userPointsData).returning();
    return newUserPoints;
  }

  async getUserRanking(limit: number = 10): Promise<(UserPoints & { user: Pick<User, 'id' | 'name' | 'avatar'> })[]> {
    return await this.db.select({
      id: sql`COALESCE(${userPointsTable.id}::text, gen_random_uuid()::text)`.as('id'),
      userId: users.id,
      totalPoints: sql`COALESCE(${userPointsTable.totalPoints}, 0)`.as('totalPoints'),
      currentLevel: sql`COALESCE(${userPointsTable.currentLevel}, 'bronze')`.as('currentLevel'),
      levelProgress: sql`COALESCE(${userPointsTable.levelProgress}, 0)`.as('levelProgress'),
      freeReferrals: sql`COALESCE(${userPointsTable.freeReferrals}, 0)`.as('freeReferrals'),
      premiumReferrals: sql`COALESCE(${userPointsTable.premiumReferrals}, 0)`.as('premiumReferrals'),
      createdAt: sql`COALESCE(${userPointsTable.createdAt}, ${users.createdAt})`.as('createdAt'),
      updatedAt: sql`COALESCE(${userPointsTable.updatedAt}, ${users.createdAt})`.as('updatedAt'),
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar
      }
    })
    .from(users)
    .leftJoin(userPointsTable, eq(users.id, userPointsTable.userId))
    .orderBy(desc(sql`COALESCE(${userPointsTable.totalPoints}, 0)`))
    .limit(limit);
  }

  // Mission methods
  async getMissions(isActive?: boolean, missionType?: string): Promise<Mission[]> {
    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(missionsTable.isActive, isActive));
    }

    if (missionType) {
      conditions.push(eq(missionsTable.missionType, missionType));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(missionsTable).where(and(...conditions)).orderBy(desc(missionsTable.createdAt));
    }

    return await this.db.select().from(missionsTable).orderBy(desc(missionsTable.createdAt));
  }

  async getMission(id: string): Promise<Mission | undefined> {
    const [mission] = await this.db.select().from(missionsTable).where(eq(missionsTable.id, id));
    return mission || undefined;
  }

  async createMission(mission: InsertMission): Promise<Mission> {
    const [newMission] = await this.db.insert(missionsTable).values(mission).returning();
    return newMission;
  }

  async updateMission(id: string, mission: Partial<InsertMission>): Promise<Mission> {
    const [updatedMission] = await this.db.update(missionsTable).set(mission).where(eq(missionsTable.id, id)).returning();
    return updatedMission;
  }

  async deleteMission(id: string): Promise<void> {
    // First delete related user missions
    await this.db.delete(userMissionsTable).where(eq(userMissionsTable.missionId, id));
    // Then delete the mission
    await this.db.delete(missionsTable).where(eq(missionsTable.id, id));
  }

  // User Mission methods
  async getUserMissions(userId: string, isCompleted?: boolean): Promise<(UserMission & { mission: Mission })[]> {
    const conditions = [eq(userMissionsTable.userId, userId)];

    if (isCompleted !== undefined) {
      conditions.push(eq(userMissionsTable.isCompleted, isCompleted));
    }

    return await this.db.select({
      id: userMissionsTable.id,
      userId: userMissionsTable.userId,
      missionId: userMissionsTable.missionId,
      currentProgress: userMissionsTable.currentProgress,
      isCompleted: userMissionsTable.isCompleted,
      completedAt: userMissionsTable.completedAt,
      expiresAt: userMissionsTable.expiresAt,
      createdAt: userMissionsTable.createdAt,
      mission: missionsTable
    }).from(userMissionsTable)
      .innerJoin(missionsTable, eq(userMissionsTable.missionId, missionsTable.id))
      .where(and(...conditions))
      .orderBy(desc(userMissionsTable.createdAt));
  }

  async createUserMission(userMission: InsertUserMission): Promise<UserMission> {
    const [newUserMission] = await this.db.insert(userMissionsTable).values(userMission).returning();
    return newUserMission;
  }

  async updateUserMission(id: string, userMission: Partial<InsertUserMission>): Promise<UserMission> {
    const [updatedUserMission] = await this.db.update(userMissionsTable).set(userMission).where(eq(userMissionsTable.id, id)).returning();
    return updatedUserMission;
  }

  async completeMission(userId: string, missionId: string): Promise<{ success: boolean; pointsEarned: number }> {
    try {
      // Get mission details
      const mission = await this.getMission(missionId);
      if (!mission) {
        return { success: false, pointsEarned: 0 };
      }

      // Update user mission as completed
      await this.db.update(userMissionsTable)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          currentProgress: mission.targetCount
        })
        .where(and(
          eq(userMissionsTable.userId, userId),
          eq(userMissionsTable.missionId, missionId)
        ));

      // Award points to user
      // Points will be updated by mission system

      return { success: true, pointsEarned: mission.pointsReward };
    } catch (error) {
      console.error('Error completing mission:', error);
      return { success: false, pointsEarned: 0 };
    }
  }

  // Reward methods
  async getRewards(isActive?: boolean, rewardType?: string): Promise<Reward[]> {
    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(rewardsTable.isActive, isActive));
    }

    if (rewardType) {
      conditions.push(eq(rewardsTable.rewardType, rewardType));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(rewardsTable).where(and(...conditions)).orderBy(desc(rewardsTable.createdAt));
    }

    return await this.db.select().from(rewardsTable).orderBy(desc(rewardsTable.createdAt));
  }

  async getReward(id: string): Promise<Reward | undefined> {
    const [reward] = await this.db.select().from(rewardsTable).where(eq(rewardsTable.id, id));
    return reward || undefined;
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const [newReward] = await this.db.insert(rewardsTable).values(reward).returning();
    return newReward;
  }

  async updateReward(id: string, reward: Partial<InsertReward>): Promise<Reward> {
    const [updatedReward] = await this.db.update(rewardsTable).set(reward).where(eq(rewardsTable.id, id)).returning();
    return updatedReward;
  }

  async deleteReward(id: string): Promise<void> {
    // First delete related user rewards
    await this.db.delete(userRewards).where(eq(userRewards.rewardId, id));
    // Then delete the reward
    await this.db.delete(rewardsTable).where(eq(rewardsTable.id, id));
  }

  // User Reward methods
  async getUserRewards(userId: string): Promise<(UserReward & { reward: Reward })[]> {
    return await this.db.select({
      id: userRewards.id,
      userId: userRewards.userId,
      rewardId: userRewards.rewardId,
      redeemedAt: userRewards.redeemedAt,
      reward: rewardsTable
    }).from(userRewards)
      .innerJoin(rewardsTable, eq(userRewards.rewardId, rewardsTable.id))
      .where(eq(userRewards.userId, userId))
      .orderBy(desc(userRewards.redeemedAt));
  }

  async redeemReward(userId: string, rewardId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get reward details
      const reward = await this.getReward(rewardId);
      if (!reward) {
        return { success: false, message: 'Recompensa não encontrada' };
      }

      if (!reward.isActive) {
        return { success: false, message: 'Recompensa não está ativa' };
      }

      // Check if reward has stock (if stockQuantity !== -1)
      if (reward.stockQuantity !== -1 && reward.stockQuantity <= 0) {
        return { success: false, message: 'Recompensa fora de estoque' };
      }

      // Get user points
      const userPointsRecord = await this.getUserPoints(userId);
      if (!userPointsRecord) {
        return { success: false, message: 'Usuário não possui pontos' };
      }

      if (userPointsRecord.totalPoints < reward.pointsCost) {
        return { success: false, message: 'Pontos insuficientes' };
      }

      // Create user reward record
      await this.db.insert(userRewards).values({
        userId,
        rewardId,
        redeemedAt: new Date()
      });

      // Deduct points from user
      await this.db.update(userPointsTable)
        .set({
          totalPoints: userPointsRecord.totalPoints - reward.pointsCost,
          updatedAt: new Date()
        })
        .where(eq(userPointsTable.userId, userId));

      // Update reward stock if not unlimited
      if (reward.stockQuantity !== -1) {
        await this.db.update(rewardsTable)
          .set({ stockQuantity: reward.stockQuantity - 1 })
          .where(eq(rewardsTable.id, rewardId));
      }

      return { success: true, message: 'Recompensa resgatada com sucesso!' };
    } catch (error) {
      console.error('Error redeeming reward:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  // Raffle methods
  async getRaffles(isActive?: boolean): Promise<Raffle[]> {
    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(rafflesTable.isActive, isActive));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(rafflesTable).where(and(...conditions)).orderBy(desc(rafflesTable.createdAt));
    }

    return await this.db.select().from(rafflesTable).orderBy(desc(rafflesTable.createdAt));
  }

  async getRaffle(id: string): Promise<Raffle | undefined> {
    const [raffle] = await this.db.select().from(rafflesTable).where(eq(rafflesTable.id, id));
    return raffle || undefined;
  }

  async createRaffle(raffle: InsertRaffle): Promise<Raffle> {
    const [newRaffle] = await this.db.insert(rafflesTable).values(raffle).returning();
    return newRaffle;
  }

  async updateRaffle(id: string, raffle: Partial<InsertRaffle>): Promise<Raffle> {
    const [updatedRaffle] = await this.db.update(rafflesTable).set(raffle)
      .where(eq(rafflesTable.id, id)).returning();
    return updatedRaffle;
  }

  async deleteRaffle(id: string): Promise<void> {
    // First delete related raffle entries
    await this.db.delete(raffleEntries).where(eq(raffleEntries.raffleId, id));
    // Then delete the raffle
    await this.db.delete(rafflesTable).where(eq(rafflesTable.id, id));
  }

  // Raffle Entry methods
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
      pointsSpent: raffleEntries.pointsSpent,
      createdAt: raffleEntries.createdAt,
      raffle: rafflesTable
    }).from(raffleEntries)
      .innerJoin(rafflesTable, eq(raffleEntries.raffleId, rafflesTable.id))
      .where(and(...conditions))
      .orderBy(desc(raffleEntries.createdAt));
  }

  async enterRaffle(userId: string, raffleId: string, entries: number): Promise<{ success: boolean; message: string }> {
    try {
      // Get raffle details
      const raffle = await this.getRaffle(raffleId);
      if (!raffle) {
        return { success: false, message: 'Sorteio não encontrado' };
      }

      if (!raffle.isActive) {
        return { success: false, message: 'Sorteio não está ativo' };
      }

      // Check if raffle is still open
      const now = new Date();
      if (new Date(raffle.endDate) < now) {
        return { success: false, message: 'Sorteio já encerrado' };
      }

      // Check entry limits
      const userExistingEntries = await this.getUserRaffleEntries(userId, raffleId);
      const currentUserEntries = userExistingEntries.reduce((sum, entry) => sum + entry.entryCount, 0);

      if (currentUserEntries + entries > raffle.maxEntriesPerUser) {
        return { success: false, message: `Limite máximo de ${raffle.maxEntriesPerUser} participações por usuário` };
      }

      // Check user points
      const totalCost = entries * raffle.entryCost;
      const userPointsRecord = await this.getUserPoints(userId);
      if (!userPointsRecord) {
        return { success: false, message: 'Usuário não possui pontos' };
      }

      if (userPointsRecord.totalPoints < totalCost) {
        return { success: false, message: 'Pontos insuficientes' };
      }

      // Create raffle entry
      await this.db.insert(raffleEntries).values({
        userId,
        raffleId,
        entryCount: entries,
        pointsSpent: totalCost
      });

      // Deduct points from user
      await this.db.update(userPointsTable)
        .set({
          totalPoints: userPointsRecord.totalPoints - totalCost,
          updatedAt: new Date()
        })
        .where(eq(userPointsTable.userId, userId));

      // Update raffle total entries
      await this.db.update(rafflesTable)
        .set({ totalEntries: raffle.totalEntries + entries })
        .where(eq(raffle.id, raffleId));

      return { success: true, message: `Participação registrada! ${entries} entrada(s) no sorteio` };
    } catch (error) {
      console.error('Error entering raffle:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  // Achievement methods (basic implementation)
  async getAchievements(isActive?: boolean): Promise<Achievement[]> {
    if (isActive !== undefined) {
      return await this.db.select().from(achievements).where(eq(achievements.isActive, isActive)).orderBy(desc(achievements.createdAt));
    }

    return await this.db.select().from(achievements).orderBy(desc(achievements.createdAt));
  }

  async getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]> {
    return await this.db.select({
      id: userAchievements.id,
      userId: userAchievements.userId,
      achievementId: userAchievements.achievementId,
      unlockedAt: userAchievements.unlockedAt,
      achievement: achievements
    }).from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));
  }

  async checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    // Basic implementation - can be expanded with specific achievement logic
    try {
      const userStats = await this.getUserStats(userId);
      const unlockedAchievements: Achievement[] = [];

      // Example achievement logic (can be customized)
      const allAchievements = await this.getAchievements(true);

      for (const achievement of allAchievements) {
        // Check if user already has this achievement
        const userAchievement = await this.db.select()
          .from(userAchievements)
          .where(and(
            eq(userAchievements.userId, userId),
            eq(userAchievements.achievementId, achievement.id)
          ))
          .limit(1);

        if (userAchievement.length === 0) {
          // Basic achievement criteria (can be customized)
          let shouldUnlock = false;

          if (achievement.criteria === 'videos_watched' && userStats.videosWatched >= achievement.threshold!) {
            shouldUnlock = true;
          } else if (achievement.criteria === 'downloads' && userStats.downloads >= achievement.threshold!) {
            shouldUnlock = true;
          } else if (achievement.criteria === 'coupons_used' && userStats.couponsUsed >= achievement.threshold!) {
            shouldUnlock = true;
          }

          if (shouldUnlock) {
            // Unlock achievement
            await this.db.insert(userAchievements).values({
              userId,
              achievementId: achievement.id,
              unlockedAt: new Date()
            });

            unlockedAchievements.push(achievement);
          }
        }
      }

      return unlockedAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }
}

// Extend DatabaseStorage with gamification methods directly in this file
export class DatabaseStorageWithGamification extends DatabaseStorage {

  // ========== USER POINTS METHODS ==========

  async getUserPoints(userId: string): Promise<UserPoints | undefined> {
    const [userPoint] = await this.db.select().from(userPointsTable).where(eq(userPointsTable.userId, userId));
    return userPoint || undefined;
  }

  async createUserPoints(userPointsData: InsertUserPoints): Promise<UserPoints> {
    const [newUserPoints] = await this.db.insert(userPointsTable).values(userPointsData).returning();
    return newUserPoints;
  }

  async updateUserPoints(userId: string, points: number): Promise<UserPoints> {
    let userPointRecord = await this.getUserPoints(userId);

    if (!userPointRecord) {
      userPointRecord = await this.createUserPoints({ userId, totalPoints: points });
    } else {
      const [updatedUserPoints] = await this.db.update(userPointsTable)
        .set({
          totalPoints: points,
          updatedAt: sql`now()`
        })
        .where(eq(userPointsTable.userId, userId))
        .returning();
      userPointRecord = updatedUserPoints;
    }

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

    if (userPointRecord.currentLevel !== level) {
      const [updatedWithLevel] = await this.db.update(userPointsTable)
        .set({
          currentLevel: level,
          levelProgress: levelProgress,
          updatedAt: sql`now()`
        })
        .where(eq(userPointsTable.userId, userId))
        .returning();
      userPointRecord = updatedWithLevel;
    }

    return userPointRecord;
  }

  async getUserRanking(limit: number = 10): Promise<(UserPoints & { user: Pick<User, 'id' | 'name' | 'avatar'> })[]> {
    return await this.db.select({
      id: sql`COALESCE(${userPointsTable.id}::text, gen_random_uuid()::text)`.as('id'),
      userId: users.id,
      totalPoints: sql`COALESCE(${userPointsTable.totalPoints}, 0)`.as('totalPoints'),
      currentLevel: sql`COALESCE(${userPointsTable.currentLevel}, 'bronze')`.as('currentLevel'),
      levelProgress: sql`COALESCE(${userPointsTable.levelProgress}, 0)`.as('levelProgress'),
      freeReferrals: sql`COALESCE(${userPointsTable.freeReferrals}, 0)`.as('freeReferrals'),
      premiumReferrals: sql`COALESCE(${userPointsTable.premiumReferrals}, 0)`.as('premiumReferrals'),
      createdAt: sql`COALESCE(${userPointsTable.createdAt}, ${users.createdAt})`.as('createdAt'),
      updatedAt: sql`COALESCE(${userPointsTable.updatedAt}, ${users.createdAt})`.as('updatedAt'),
      planType: subscriptions.planType, // Adicionando planType aqui
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar
      }
    })
    .from(users)
    .leftJoin(userPointsTable, eq(users.id, userPointsTable.userId))
    .leftJoin(subscriptions, eq(users.id, subscriptions.userId)) // Adicionando join com subscriptions
    .orderBy(desc(sql`COALESCE(${userPointsTable.totalPoints}, 0)`))
    .limit(limit);
  }

  // ========== MISSION METHODS ==========

  async getMissions(isActive?: boolean, missionType?: string): Promise<Mission[]> {
    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(missionsTable.isActive, isActive));
    }

    if (missionType) {
      conditions.push(eq(missionsTable.missionType, missionType));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(missionsTable).where(and(...conditions)).orderBy(desc(missionsTable.createdAt));
    }

    return await this.db.select().from(missionsTable).orderBy(desc(missionsTable.createdAt));
  }

  async getMission(id: string): Promise<Mission | undefined> {
    const [mission] = await this.db.select().from(missionsTable).where(eq(missionsTable.id, id));
    return mission || undefined;
  }

  async createMission(mission: InsertMission): Promise<Mission> {
    const [newMission] = await this.db.insert(missionsTable).values(mission).returning();
    return newMission;
  }

  async updateMission(id: string, mission: Partial<InsertMission>): Promise<Mission> {
    const [updatedMission] = await this.db.update(missionsTable).set(mission)
      .where(eq(missionsTable.id, id)).returning();
    return updatedMission;
  }

  async deleteMission(id: string): Promise<void> {
    await this.db.delete(missionsTable).where(eq(missionsTable.id, id));
  }

  // ========== REWARD METHODS ==========

  async getRewards(isActive?: boolean, rewardType?: string): Promise<Reward[]> {
    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(rewardsTable.isActive, isActive));
    }

    if (rewardType) {
      conditions.push(eq(rewardsTable.rewardType, rewardType));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(rewardsTable).where(and(...conditions)).orderBy(desc(rewardsTable.createdAt));
    }

    return await this.db.select().from(rewardsTable).orderBy(desc(rewardsTable.createdAt));
  }

  async getReward(id: string): Promise<Reward | undefined> {
    const [reward] = await this.db.select().from(rewardsTable).where(eq(rewardsTable.id, id));
    return reward || undefined;
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const [newReward] = await this.db.insert(rewardsTable).values(reward).returning();
    return newReward;
  }

  async updateReward(id: string, reward: Partial<InsertReward>): Promise<Reward> {
    const [updatedReward] = await this.db.update(rewardsTable).set(reward)
      .where(eq(rewardsTable.id, id)).returning();
    return updatedReward;
  }

  async deleteReward(id: string): Promise<void> {
    await this.db.delete(rewardsTable).where(eq(rewardsTable.id, id));
  }

  // ========== RAFFLE METHODS ==========

  async getRaffles(isActive?: boolean): Promise<Raffle[]> {
    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(rafflesTable.isActive, isActive));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(rafflesTable).where(and(...conditions)).orderBy(desc(rafflesTable.createdAt));
    }

    return await this.db.select().from(rafflesTable).orderBy(desc(rafflesTable.createdAt));
  }

  async getRaffle(id: string): Promise<Raffle | undefined> {
    const [raffle] = await this.db.select().from(rafflesTable).where(eq(rafflesTable.id, id));
    return raffle || undefined;
  }

  async createRaffle(raffle: InsertRaffle): Promise<Raffle> {
    const [newRaffle] = await this.db.insert(rafflesTable).values(raffle).returning();
    return newRaffle;
  }

  async updateRaffle(id: string, raffle: Partial<InsertRaffle>): Promise<Raffle> {
    const [updatedRaffle] = await this.db.update(rafflesTable).set(raffle)
      .where(eq(rafflesTable.id, id)).returning();
    return updatedRaffle;
  }

  async deleteRaffle(id: string): Promise<void> {
    await this.db.delete(rafflesTable).where(eq(rafflesTable.id, id));
  }

  // Additional user mission methods for compatibility
  async getUserMissions(userId: string, isCompleted?: boolean): Promise<(UserMission & { mission: Mission })[]> {
    const conditions = [eq(userMissionsTable.userId, userId)];

    if (isCompleted !== undefined) {
      conditions.push(eq(userMissionsTable.isCompleted, isCompleted));
    }

    return await this.db.select({
      id: userMissionsTable.id,
      userId: userMissionsTable.userId,
      missionId: userMissionsTable.missionId,
      currentProgress: userMissionsTable.currentProgress,
      isCompleted: userMissionsTable.isCompleted,
      completedAt: userMissionsTable.completedAt,
      expiresAt: userMissionsTable.expiresAt,
      createdAt: userMissionsTable.createdAt,
      mission: missionsTable
    })
    .from(userMissionsTable)
    .innerJoin(missionsTable, eq(userMissionsTable.missionId, missionsTable.id))
    .where(and(...conditions))
    .orderBy(desc(userMissionsTable.createdAt));
  }

  // Sistema de notificações automáticas
  async createSystemNotification(title: string, description: string, targetAudience: string = 'all', linkUrl?: string): Promise<string> {
    try {
      const notification = await this.createNotification({
        title,
        description,
        targetAudience,
        linkUrl,
        isActive: true,
        startDateTime: new Date(),
        endDateTime: null // Sem data de expiração para notificações do sistema
      });

      // Enviar para usuários imediatamente
      await this.sendNotificationToUsers(notification.id, targetAudience);

      return notification.id;
    } catch (error) {
      console.error('Erro ao criar notificação do sistema:', error);
      throw error;
    }
  }

  // Notificações automáticas para eventos específicos
  async notifyFirstLogin(userId: string): Promise<void> {
    try {
      // Verificar se é o primeiro login
      const activities = await this.db
        .select()
        .from(userActivity)
        .where(and(
          eq(userActivity.userId, userId),
          eq(userActivity.action, 'daily_login')
        ))
        .limit(2);

      if (activities.length === 1) {
        // É o primeiro login
        await this.createSystemNotification(
          '🎉 Bem-vinda à Beleza com Luci!',
          'Que alegria ter você aqui! Explore nossos vídeos exclusivos e descubra o mundo da beleza.',
          'all',
          '/videos'
        );
      }
    } catch (error) {
      console.error('Erro ao criar notificação de primeiro login:', error);
    }
  }

  async notifyMissionCompleted(userId: string, missionTitle: string, pointsEarned: number): Promise<void> {
    try {
      await this.createSystemNotification(
        '✅ Missão Concluída!',
        `Parabéns! Você completou a missão "${missionTitle}" e ganhou ${pointsEarned} pontos!`,
        'all',
        '/missions'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de missão completada:', error);
    }
  }

  async notifyLevelUp(userId: string, newLevel: string): Promise<void> {
    try {
      const levelEmojis = {
        bronze: '🥉',
        silver: '🥈',
        gold: '🥇',
        diamond: '💎'
      };

      const emoji = levelEmojis[newLevel as keyof typeof levelEmojis] || '⭐';

      await this.createSystemNotification(
        `${emoji} Parabéns! Novo Nível Alcançado!`,
        `Você evoluiu para o nível ${newLevel.toUpperCase()}! Continue assim para desbloquear mais benefícios.`,
        'all',
        '/ranking'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de level up:', error);
    }
  }

  async notifyAchievementUnlocked(userId: string, achievementTitle: string): Promise<void> {
    try {
      await this.createSystemNotification(
        '🏆 Nova Conquista Desbloqueada!',
        `Parabéns! Você desbloqueou a conquista "${achievementTitle}".`,
        'all',
        '/achievements'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de conquista desbloqueada:', error);
    }
  }

  async notifyNewVideo(videoTitle: string): Promise<void> {
    try {
      await this.createSystemNotification(
        '🎥 Novo Vídeo Disponível!',
        `"${videoTitle}" foi adicionado à nossa biblioteca. Assista agora!`,
        'all',
        '/videos'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de novo vídeo:', error);
    }
  }

  async notifyNewProduct(productName: string): Promise<void> {
    try {
      await this.createSystemNotification(
        '🛍️ Novo Produto Adicionado!',
        `"${productName}" está agora disponível em nossa loja!`,
        'all',
        '/products'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de novo produto:', error);
    }
  }

  // Placeholder for sendNotificationToUsers method if it's defined elsewhere
  async sendNotificationToUsers(notificationId: string, targetAudience: string): Promise<void> {
    // This is a placeholder. Implement the actual logic to send notifications
    // For example, fetch users based on targetAudience and create UserNotification records.
    // console.log(`Simulating sending notification ${notificationId} to ${targetAudience}`);

    // Example: Fetch all users if targetAudience is 'all'
    if (targetAudience === 'all') {
      const allUsers = await this.getAllUsers();
      for (const user of allUsers) {
        await this.db.insert(userNotifications).values({
          userId: user.id,
          notificationId: notificationId,
          isRead: false,
        });
      }
    } else {
      // Implement logic for other targetAudiences (e.g., 'free', 'premium')
      const usersWithTargetAudience = await this.db
        .select()
        .from(users)
        .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
        .where(eq(subscriptions.planType, targetAudience));

      for (const user of usersWithTargetAudience) {
         await this.db.insert(userNotifications).values({
          userId: user.id,
          notificationId: notificationId,
          isRead: false,
        });
      }
    }
  }

  // Statistics count functions for community dashboard
  async getUsersCount(): Promise<number> {
    try {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(users);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting users:', error);
      return 0;
    }
  }

  async getPostsCount(): Promise<number> {
    try {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(posts);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting posts:', error);
      return 0;
    }
  }

  async getLikesCount(): Promise<number> {
    try {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(postLikes);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting likes:', error);
      return 0;
    }
  }

  async getCommentsCount(): Promise<number> {
    try {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(sql`${comments.postId} IS NOT NULL`);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting comments:', error);
      return 0;
    }
  }

  async getSharesCount(): Promise<number> {
    try {
      const result = await this.db.select({ count: sql<number>`sum(shares)` })
        .from(posts);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting shares:', error);
      return 0;
    }
  }

  // ========== VIDEO PROGRESS METHODS ==========

  async getVideoProgress(userId: string, videoId: string, resourceId: string): Promise<VideoProgress | undefined> {
    const [progress] = await this.db
      .select()
      .from(videoProgress)
      .where(and(
        eq(videoProgress.userId, userId),
        eq(videoProgress.videoId, videoId),
        eq(videoProgress.resourceId, resourceId)
      ))
      .limit(1);

    return progress || undefined;
  }

  async updateVideoProgress(
    userId: string,
    videoId: string,
    resourceId: string,
    currentTime: number,
    duration: number
  ): Promise<VideoProgress> {
    const existing = await this.getVideoProgress(userId, videoId, resourceId);

    // Só atualiza se o tempo atual for maior que o máximo já assistido
    if (existing && currentTime <= existing.maxTimeWatched) {
      return existing;
    }

    const maxTimeWatched = existing ? Math.max(existing.maxTimeWatched, currentTime) : currentTime;
    let progressPercentage = duration > 0 ? Math.floor((maxTimeWatched / duration) * 100) : 0;
    const isCompleted = progressPercentage >= 95;

    // Se o vídeo está completo (>=95%), atualiza o progresso para 100% no banco
    if (isCompleted) {
      progressPercentage = 100;
    }

    if (existing) {
      // Atualiza existente
      const [updated] = await this.db
        .update(videoProgress)
        .set({
          maxTimeWatched,
          duration,
          progressPercentage,
          isCompleted,
          lastWatchedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(videoProgress.userId, userId),
          eq(videoProgress.videoId, videoId),
          eq(videoProgress.resourceId, resourceId)
        ))
        .returning();

      return updated;
    } else {
      // Cria novo
      const [created] = await this.db
        .insert(videoProgress)
        .values({
          userId,
          videoId,
          resourceId,
          maxTimeWatched,
          duration,
          progressPercentage,
          isCompleted,
          lastWatchedAt: new Date()
        })
        .returning();

      return created;
    }
  }

  async getUserVideoProgressByResource(userId: string, resourceId: string): Promise<VideoProgress[]> {
    return await this.db
      .select()
      .from(videoProgress)
      .where(and(
        eq(videoProgress.userId, userId),
        eq(videoProgress.resourceId, resourceId)
      ))
      .orderBy(desc(videoProgress.lastWatchedAt));
  }
}

export const storage = new DatabaseStorageWithGamification();