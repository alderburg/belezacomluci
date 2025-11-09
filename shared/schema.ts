import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { pgTable, text, integer, timestamp, boolean, serial, varchar, json, numeric, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Helper function to generate UUIDs (assuming createId is defined elsewhere or needs to be imported/defined)
// For demonstration purposes, let's assume a simple uuid function if createId is not globally available.
// In a real project, you would import this from a library like 'uuid' or '@paralleldrive/react-hook-form-auto-generate-fields'.
const createId = () => Math.random().toString(36).substring(2, 15);


export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  cpf: text("cpf"),
  avatar: text("avatar"),
  gender: text("gender"),
  age: integer("age"),

  // Configurações da página de comunidade (admin)
  communityTitle: text("community_title").default("Nossa Comunidade"),
  communitySubtitle: text("community_subtitle").default("Compartilhe suas experiências e dicas de beleza"),
  communityBackgroundImage: text("community_background_image"),
  communityMobileBackgroundImage: text("community_mobile_background_image"),
  communityBackgroundImageMobile: text("community_background_image_mobile"),

  // Campos de contato
  phone: text("phone"),
  phoneType: text("phone_type"),

  // Campos de endereço
  zipCode: text("zip_code"),
  street: text("street"),
  number: text("number"),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),

  // Redes sociais (JSON array)
  socialNetworks: json("social_networks").default([]),

  isAdmin: boolean("is_admin").default(false),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: timestamp("google_token_expiry"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  planType: text("plan_type").notNull(), // 'free', 'premium'
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date").default(sql`now()`),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  type: text("type").notNull().default("video"), // 'video', 'playlist', 'live'
  thumbnailUrl: text("thumbnail_url"),
  isExclusive: boolean("is_exclusive").default(false),
  categoryId: varchar("category_id").references(() => categories.id),
  duration: text("duration"), // in HH:MM:SS format
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  isActive: boolean("is_active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'ebook', 'course_video', 'course_playlist', 'pdf', 'checklist'
  fileUrl: text("file_url"),
  coverImageUrl: text("cover_image_url"),
  categoryId: varchar("category_id").references(() => categories.id),
  isExclusive: boolean("is_exclusive").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull(),
  brand: text("brand").notNull(),
  description: text("description").notNull(),
  discount: text("discount").notNull(),
  categoryId: varchar("category_id").references(() => categories.id),
  expiryDate: timestamp("expiry_date"),
  isExclusive: boolean("is_exclusive").default(false),
  isActive: boolean("is_active").default(true),
  storeUrl: text("store_url"),
  coverImageUrl: text("cover_image_url"),
  modalImageUrl: text("modal_image_url"), // Imagem específica para o modal da bio
  order: integer("order").default(0),
  startDateTime: timestamp("start_date_time"), // Data e hora de início para ativação automática
  endDateTime: timestamp("end_date_time"), // Data e hora de fim para desativação automática
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const banners = pgTable("banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  page: text("page").notNull().default("home"), // 'home', 'videos', 'produtos', 'cupons', 'comunidade', 'perfil', 'bio', 'video_specific', 'course_specific'
  videoId: varchar("video_id").references(() => videos.id), // Para banners específicos de vídeo
  courseId: varchar("course_id").references(() => products.id), // Para banners específicos de curso
  isActive: boolean("is_active").default(true),
  order: integer("order").default(0),
  showTitle: boolean("show_title").notNull().default(true),
  showDescription: boolean("show_description").notNull().default(true),
  showButton: boolean("show_button").notNull().default(true),
  opensCouponsModal: boolean("opens_coupons_modal").default(false), // Para banners da bio que abrem o modal de cupons
  displayOn: text("display_on").notNull().default("both"), // 'desktop', 'mobile', 'both'
  startDateTime: timestamp("start_date_time"), // Data e hora de início para ativação automática
  endDateTime: timestamp("end_date_time"), // Data e hora de fim para desativação automática
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  postId: varchar("post_id").references(() => posts.id).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const postTags = pgTable("post_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  taggedUserId: varchar("tagged_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved posts table
export const savedPosts = pgTable("saved_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  videoId: varchar("video_id").references(() => videos.id),
  productId: varchar("product_id").references(() => products.id),
  postId: varchar("post_id").references(() => posts.id),
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0),
  repliesCount: integer("replies_count").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const commentLikes = pgTable("comment_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  commentId: varchar("comment_id").references(() => comments.id).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const commentReplies = pgTable("comment_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").references(() => comments.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const userActivity = pgTable("user_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // 'video_watched', 'product_downloaded', 'coupon_used'
  resourceId: varchar("resource_id"),
  resourceType: text("resource_type"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const videoLikes = pgTable("video_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  videoId: varchar("video_id").references(() => videos.id).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const popups = pgTable("popups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  trigger: text("trigger").notNull(), // 'login', 'logout', 'page_specific', 'scheduled'
  targetPage: text("target_page"), // Para trigger 'page_specific'
  targetVideoId: varchar("target_video_id").references(() => videos.id), // Para páginas de vídeo específico
  targetCourseId: varchar("target_course_id").references(() => products.id), // Para páginas de curso específico
  showFrequency: text("show_frequency").notNull().default("always"), // 'always', 'once_per_session'
  showTitle: boolean("show_title").default(true), // Controla exibição do título
  showDescription: boolean("show_description").default(true), // Controla exibição da descrição
  showButton: boolean("show_button").default(true), // Controla exibição do botão
  isExclusive: boolean("is_exclusive").default(false), // Para usuários premium
  isActive: boolean("is_active").default(true),
  startDateTime: timestamp("start_date_time"), // Para agendamento
  endDateTime: timestamp("end_date_time"), // Para agendamento
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const popupViews = pgTable("popup_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  popupId: varchar("popup_id").references(() => popups.id).notNull(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  targetAudience: text("target_audience").notNull().default("all"), // 'free', 'premium', 'all'
  isActive: boolean("is_active").default(true),
  startDateTime: timestamp("start_date_time"), // Para agendamento
  endDateTime: timestamp("end_date_time"), // Para agendamento
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const userNotifications = pgTable("user_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  notificationId: varchar("notification_id").references(() => notifications.id).notNull(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => {
  return {
    userNotificationUnique: unique("user_notification_unique").on(table.userId, table.notificationId),
  };
});

export const notificationSettings = pgTable("notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  emailEnabled: boolean("email_enabled").default(true),
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  smsEnabled: boolean("sms_enabled").default(false),
  soundEnabled: boolean("sound_enabled").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// ========== GAMIFICATION SYSTEM "MINHAS CHEIROSAS" ==========

// Configurações do sistema de compartilhamento
export const shareSettings = pgTable("share_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  freeReferralPoints: integer("free_referral_points").default(25),
  premiumReferralPoints: integer("premium_referral_points").default(50),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Tabela para rastrear o progresso de visualização de vídeos
export const videoProgress = pgTable('video_progress', {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  videoId: varchar("video_id").notNull(), // YouTube video ID
  resourceId: varchar("resource_id").notNull(), // ID do vídeo ou produto (para playlists)
  maxTimeWatched: integer("max_time_watched").notNull().default(0), // Tempo máximo em segundos
  duration: integer("duration"), // Duração total em segundos
  progressPercentage: integer("progress_percentage").default(0), // 0-100
  isCompleted: boolean("is_completed").default(false), // Se assistiu mais de 90%
  lastWatchedAt: timestamp("last_watched_at").default(sql`now()`),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
}, (table) => {
  return {
    uniqueUserVideo: unique("unique_user_video").on(table.userId, table.videoId, table.resourceId),
  };
});


// Sistema de referrals/indicações
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").references(() => users.id).notNull(), // Quem indicou
  referredId: varchar("referred_id").references(() => users.id).notNull(), // Quem foi indicado
  referralCode: text("referral_code"), // Código único de indicação
  pointsAwarded: integer("points_awarded").default(0), // Pontos dados ao indicador
  referredPlanType: text("referred_plan_type").notNull(), // 'free' ou 'premium'
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const userPoints = pgTable("user_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  totalPoints: integer("total_points").default(0),
  currentLevel: text("current_level").default("bronze"), // 'bronze', 'silver', 'gold', 'diamond'
  levelProgress: integer("level_progress").default(0),
  freeReferrals: integer("free_referrals").default(0), // Contador de indicações free
  premiumReferrals: integer("premium_referrals").default(0), // Contador de indicações premium
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const missions = pgTable("missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  pointsReward: integer("points_reward").notNull(),
  missionType: text("mission_type").notNull(), // 'daily', 'weekly', 'monthly', 'achievement'
  actionRequired: text("action_required").notNull(), // 'watch_video', 'comment', 'share', etc.
  targetCount: integer("target_count").default(1),
  icon: text("icon").default("star"),
  color: text("color").default("#ff6b9d"),
  minLevel: text("min_level").default("bronze"), // bronze, silver, gold, diamond
  minPoints: integer("min_points").default(0),
  premiumOnly: boolean("premium_only").default(false),
  usageLimit: integer("usage_limit").default(0), // 0 = unlimited
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date").default(sql`now()`),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const userMissions = pgTable("user_missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  missionId: varchar("mission_id").references(() => missions.id).notNull(),
  currentProgress: integer("current_progress").default(0),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  pointsCost: integer("points_cost").notNull(),
  rewardType: text("reward_type").notNull(), // 'coupon', 'sample', 'exclusive_video', 'badge', 'custom'
  rewardValue: text("reward_value"), // JSON com dados específicos da recompensa
  imageUrl: text("image_url"),
  stockQuantity: integer("stock_quantity").default(-1), // -1 para ilimitado
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const userRewards = pgTable("user_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  rewardId: varchar("reward_id").references(() => rewards.id).notNull(),
  pointsSpent: integer("points_spent").notNull(),
  status: text("status").default("claimed"), // 'claimed', 'delivered', 'expired'
  rewardData: text("reward_data"), // JSON com dados específicos do resgate
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const raffles = pgTable("raffles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  prizeDescription: text("prize_description").notNull(),
  imageUrl: text("image_url"),
  entryCost: integer("entry_cost").default(1), // quantos pontos custa cada participação
  maxEntriesPerUser: integer("max_entries_per_user").default(10),
  startDate: timestamp("start_date").default(sql`now()`),
  endDate: timestamp("end_date").notNull(),
  drawDate: timestamp("draw_date"),
  winnerUserId: varchar("winner_user_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  totalEntries: integer("total_entries").default(0),
  // Campos expandidos para o formulário completo
  category: text("category").default("Beleza"),
  prizeValue: numeric("prize_value", { precision: 10, scale: 2 }).default("0"),
  winnerCount: integer("winner_count").default(1),
  maxParticipants: integer("max_participants").default(1000),
  minPoints: integer("min_points").default(0),
  minLevel: text("min_level").default("bronze"), // bronze, silver, gold, diamond
  premiumOnly: boolean("premium_only").default(false),
  sponsorName: text("sponsor_name"),
  sponsorLogo: text("sponsor_logo"),
  rules: text("rules"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const raffleEntries = pgTable("raffle_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  raffleId: varchar("raffle_id").references(() => raffles.id).notNull(),
  entryCount: integer("entry_count").default(1),
  pointsSpent: integer("points_spent").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Tabela para vencedores dos sorteios
export const raffleWinners = pgTable("raffle_winners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  raffleId: varchar("raffle_id").references(() => raffles.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  position: integer("position").default(1), // 1º, 2º, 3º lugar
  prizeDelivered: boolean("prize_delivered").default(false),
  deliveryInfo: text("delivery_info"), // JSON com dados de entrega
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").default("trophy"),
  color: text("color").default("#ffd700"),
  conditionType: text("condition_type").notNull(), // 'points_total', 'level_reached', etc.
  conditionValue: integer("condition_value").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  achievementId: varchar("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: timestamp("unlocked_at").default(sql`now()`),
});

// ========== ANALYTICS SYSTEM ==========

export const analyticsTargets = pgTable("analytics_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetType: text("target_type").notNull(), // 'coupon', 'banner', 'social_network', future types
  couponId: varchar("coupon_id").references(() => coupons.id, { onDelete: 'cascade' }),
  bannerId: varchar("banner_id").references(() => banners.id, { onDelete: 'cascade' }),
  targetName: text("target_name").notNull(), // Name/title for display
  targetUrl: text("target_url"), // URL if applicable
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => {
  return {
    uniqueTarget: unique("unique_analytics_target").on(table.targetType, table.couponId, table.bannerId, table.targetName),
  };
});

export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  page: text("page").notNull(), // 'bio', 'home', 'videos', etc.
  analyticsTargetId: varchar("analytics_target_id").references(() => analyticsTargets.id), // Optional: specific content viewed
  userId: varchar("user_id").references(() => users.id), // null for non-logged users
  sessionId: text("session_id"), // To track unique sessions
  referrer: text("referrer"), // Where the user came from
  userAgent: text("user_agent"), // Browser info
  ipAddress: text("ip_address"), // User IP (anonymized)
  city: text("city"), // City from geolocation
  state: text("state"), // State from geolocation
  country: text("country"), // Country from geolocation
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const bioClicks = pgTable("bio_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analyticsTargetId: varchar("analytics_target_id").references(() => analyticsTargets.id).notNull(),
  userId: varchar("user_id").references(() => users.id), // null for non-logged users
  sessionId: text("session_id"), // To track unique sessions
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Relations
export const userRelations = relations(users, ({ many, one }) => ({
  subscription: one(subscriptions),
  posts: many(posts),
  comments: many(comments),
  activities: many(userActivity),
  videoLikes: many(videoLikes),
  points: one(userPoints),
  missions: many(userMissions),
  rewards: many(userRewards),
  raffleEntries: many(raffleEntries),
  raffleWins: many(raffleWinners),
  achievements: many(userAchievements),
  referralsMade: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referred" }),
  userNotifications: many(userNotifications),
  videoProgress: many(videoProgress), // Relation to videoProgress
}));

export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export const videoRelations = relations(videos, ({ many, one }) => ({
  comments: many(comments),
  likes: many(videoLikes),
  category: one(categories, { fields: [videos.categoryId], references: [categories.id] }),
  progress: many(videoProgress), // Relation to videoProgress
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  videos: many(videos),
  products: many(products),
  coupons: many(coupons),
}));

export const productRelations = relations(products, ({ many, one }) => ({
  comments: many(comments),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
}));

export const couponRelations = relations(coupons, ({ one }) => ({
  category: one(categories, { fields: [coupons.categoryId], references: [categories.id] }),
}));

export const postRelations = relations(posts, ({ one, many }) => ({
  user: one(users, { fields: [posts.userId], references: [users.id] }),
  comments: many(comments),
}));

export const commentRelations = relations(comments, ({ one, many }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  video: one(videos, { fields: [comments.videoId], references: [videos.id] }),
  product: one(products, { fields: [comments.productId], references: [products.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  likes: many(commentLikes),
  replies: many(commentReplies),
}));

export const commentLikeRelations = relations(commentLikes, ({ one }) => ({
  user: one(users, { fields: [commentLikes.userId], references: [users.id] }),
  comment: one(comments, { fields: [commentLikes.commentId], references: [comments.id] }),
}));

export const commentReplyRelations = relations(commentReplies, ({ one }) => ({
  user: one(users, { fields: [commentReplies.userId], references: [users.id] }),
  comment: one(comments, { fields: [commentReplies.commentId], references: [comments.id] }),
}));

export const activityRelations = relations(userActivity, ({ one }) => ({
  user: one(users, { fields: [userActivity.userId], references: [users.id] }),
}));

export const videoLikeRelations = relations(videoLikes, ({ one }) => ({
  user: one(users, { fields: [videoLikes.userId], references: [users.id] }),
  video: one(videos, { fields: [videoLikes.videoId], references: [videos.id] }),
}));

export const popupRelations = relations(popups, ({ many }) => ({
  views: many(popupViews),
}));

export const popupViewRelations = relations(popupViews, ({ one }) => ({
  user: one(users, { fields: [popupViews.userId], references: [users.id] }),
  popup: one(popups, { fields: [popupViews.popupId], references: [popups.id] }),
}));

export const notificationRelations = relations(notifications, ({ many }) => ({
  userNotifications: many(userNotifications),
}));

export const userNotificationRelations = relations(userNotifications, ({ one }) => ({
  user: one(users, { fields: [userNotifications.userId], references: [users.id] }),
  notification: one(notifications, { fields: [userNotifications.notificationId], references: [notifications.id] }),
}));

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(users, { fields: [notificationSettings.userId], references: [users.id] }),
}));

// ========== GAMIFICATION RELATIONS ==========

export const userPointsRelations = relations(userPoints, ({ one }) => ({
  user: one(users, { fields: [userPoints.userId], references: [users.id] }),
}));

export const missionRelations = relations(missions, ({ many }) => ({
  userMissions: many(userMissions),
}));

export const userMissionRelations = relations(userMissions, ({ one }) => ({
  user: one(users, { fields: [userMissions.userId], references: [users.id] }),
  mission: one(missions, { fields: [userMissions.missionId], references: [missions.id] }),
}));

export const rewardRelations = relations(rewards, ({ many }) => ({
  userRewards: many(userRewards),
}));

export const userRewardRelations = relations(userRewards, ({ one }) => ({
  user: one(users, { fields: [userRewards.userId], references: [users.id] }),
  reward: one(rewards, { fields: [userRewards.rewardId], references: [rewards.id] }),
}));

export const raffleRelations = relations(raffles, ({ one, many }) => ({
  winner: one(users, { fields: [raffles.winnerUserId], references: [users.id] }),
  entries: many(raffleEntries),
  winners: many(raffleWinners),
}));

export const raffleWinnerRelations = relations(raffleWinners, ({ one }) => ({
  raffle: one(raffles, { fields: [raffleWinners.raffleId], references: [raffles.id] }),
  user: one(users, { fields: [raffleWinners.userId], references: [users.id] }),
}));

export const raffleEntryRelations = relations(raffleEntries, ({ one }) => ({
  user: one(users, { fields: [raffleEntries.userId], references: [users.id] }),
  raffle: one(raffles, { fields: [raffleEntries.raffleId], references: [raffles.id] }),
}));

export const achievementRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, { fields: [userAchievements.userId], references: [users.id] }),
  achievement: one(achievements, { fields: [userAchievements.achievementId], references: [achievements.id] }),
}));

// ========== REFERRAL SYSTEM RELATIONS ==========

export const shareSettingsRelations = relations(shareSettings, ({ one }) => ({
  updatedByUser: one(users, { fields: [shareSettings.updatedBy], references: [users.id] }),
}));

export const referralRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, { fields: [referrals.referrerId], references: [users.id], relationName: "referrer" }),
  referred: one(users, { fields: [referrals.referredId], references: [users.id], relationName: "referred" }),
}));

// Relation for videoProgress
export const videoProgressRelations = relations(videoProgress, ({ one }) => ({
  user: one(users, { fields: [videoProgress.userId], references: [users.id] }),
  video: one(videos, { fields: [videoProgress.videoId], references: [videos.id] }),
}));

// Analytics relations
export const analyticsTargetRelations = relations(analyticsTargets, ({ one, many }) => ({
  coupon: one(coupons, { fields: [analyticsTargets.couponId], references: [coupons.id] }),
  banner: one(banners, { fields: [analyticsTargets.bannerId], references: [banners.id] }),
  pageViews: many(pageViews),
  bioClicks: many(bioClicks),
}));

export const pageViewRelations = relations(pageViews, ({ one }) => ({
  user: one(users, { fields: [pageViews.userId], references: [users.id] }),
  analyticsTarget: one(analyticsTargets, { fields: [pageViews.analyticsTargetId], references: [analyticsTargets.id] }),
}));

export const bioClickRelations = relations(bioClicks, ({ one }) => ({
  user: one(users, { fields: [bioClicks.userId], references: [users.id] }),
  analyticsTarget: one(analyticsTargets, { fields: [bioClicks.analyticsTargetId], references: [analyticsTargets.id] }),
}));


// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true }).extend({
  // Validação customizada para telefone
  phone: z.string().optional().nullable().refine(
    (phone) => !phone || /^[1-9]{2}[9]?[0-9]{8}$/.test(phone.replace(/\D/g, '')),
    "Telefone deve ter formato válido (ex: 11999999999)"
  ),

  // Validação de CEP
  zipCode: z.string().optional().nullable().refine(
    (cep) => !cep || /^[0-9]{5}-?[0-9]{3}$/.test(cep),
    "CEP deve ter formato válido (ex: 12345-678)"
  ),

  // Validação de redes sociais
  socialNetworks: z.array(z.object({
    platform: z.enum(['instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'linkedin', 'email']),
    username: z.string().min(1, "Nome de usuário é obrigatório"),
    url: z.string().optional()
  })).optional().default([])
});
export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true, views: true, likes: true }).extend({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  videoUrl: z.string().min(1, "URL do vídeo é obrigatória"),
  type: z.string().min(1, "Tipo é obrigatório"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
});
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true }).extend({
  title: z.string().min(1, "Título é obrigatório"),
});
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true }).extend({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  fileUrl: z.string().min(1, "URL do arquivo/playlist é obrigatória"),
  coverImageUrl: z.string().min(1, "Imagem de capa é obrigatória"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
});
export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, createdAt: true }).extend({
  code: z.string().min(1, "Código é obrigatório"),
  brand: z.string().min(1, "Marca é obrigatória"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  storeUrl: z.string().min(1, "URL da loja é obrigatória"),
  startDateTime: z.string().optional().nullable().transform((str) => {
    if (!str || str.trim() === '') return null;

    // Se vem no formato "2025-09-10T21:30", preservar wall time usando UTC
    if (str.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      const [datePart, timePart] = str.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      // Usar Date.UTC para preservar o wall time sem adicionar offset local
      return new Date(Date.UTC(year, month - 1, day, hour, minute));
    }

    // Fallback para outros formatos
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      throw new Error(`Data de início inválida: ${str}`);
    }
    return date;
  }),
  endDateTime: z.string().optional().nullable().transform((str) => {
    if (!str || str.trim() === '') return null;

    // Se vem no formato "2025-09-10T21:30", preservar wall time usando UTC
    if (str.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      const [datePart, timePart] = str.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      // Usar Date.UTC para preservar o wall time sem adicionar offset local
      return new Date(Date.UTC(year, month - 1, day, hour, minute));
    }

    // Fallback para outros formatos
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      throw new Error(`Data de fim inválida: ${str}`);
    }
    return date;
  }),
});
export const insertBannerSchema = createInsertSchema(banners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  showTitle: z.boolean().optional().default(true),
  showDescription: z.boolean().optional().default(true),
  showButton: z.boolean().optional().default(true),
  displayOn: z.enum(["desktop", "mobile", "both"]).optional().default("both"),
  startDateTime: z.string().optional().nullable().transform(val => {
    if (!val || val === "" || val === null || val === undefined) return null;
    return new Date(val).toISOString();
  }),
  endDateTime: z.string().optional().nullable().transform(val => {
    if (!val || val === "" || val === null || val === undefined) return null;
    return new Date(val).toISOString();
  }),
  videoId: z.string().optional().nullable().transform(val => {
    if (!val || val === "" || val === null || val === undefined) return null;
    return val;
  }),
  courseId: z.string().optional().nullable().transform(val => {
    if (!val || val === "" || val === null || val === undefined) return null;
    return val;
  }),
}).refine((data) => {
  // Se page é video_specific, videoId é obrigatório
  if (data.page === 'video_specific' && !data.videoId) {
    return false;
  }
  // Se page é course_specific, courseId é obrigatório
  if (data.page === 'course_specific' && !data.courseId) {
    return false;
  }
  return true;
}, {
  message: "VideoId é obrigatório para página de vídeo específico ou CourseId para curso específico",
  path: ["videoId"],
});
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, likes: true, shares: true });
export const insertPostLikeSchema = createInsertSchema(postLikes).omit({ id: true, createdAt: true });
export const insertPostTagSchema = createInsertSchema(postTags).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, likesCount: true, repliesCount: true });
export const insertCommentLikeSchema = createInsertSchema(commentLikes).omit({ id: true, createdAt: true });
export const insertCommentReplySchema = createInsertSchema(commentReplies).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(userActivity).omit({ id: true, createdAt: true });
export const insertVideoLikeSchema = createInsertSchema(videoLikes).omit({ id: true, createdAt: true });
export const insertPopupSchema = createInsertSchema(popups).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "O título é obrigatório"),
  description: z.string().min(1, "A descrição é obrigatória"),
  imageUrl: z.string().min(1, "A imagem do popup é obrigatória"),
  startDateTime: z.string().optional().nullable().transform((str) => {
    if (!str || str.trim() === '') return null;

    // Se vem no formato "2025-09-10T21:30", preservar wall time usando UTC
    if (str.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      const [datePart, timePart] = str.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      // Usar Date.UTC para preservar o wall time sem adicionar offset local
      return new Date(Date.UTC(year, month - 1, day, hour, minute));
    }

    // Fallback para outros formatos
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      throw new Error(`Data de início inválida: ${str}`);
    }
    return date;
  }),
  endDateTime: z.string().optional().nullable().transform((str) => {
    if (!str || str.trim() === '') return null;

    // Se vem no formato "2025-09-10T21:30", preservar wall time usando UTC
    if (str.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      const [datePart, timePart] = str.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      // Usar Date.UTC para preservar o wall time sem adicionar offset local
      return new Date(Date.UTC(year, month - 1, day, hour, minute));
    }

    // Fallback para outros formatos
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      throw new Error(`Data de fim inválida: ${str}`);
    }
    return date;
  }),
  targetVideoId: z.string().optional().nullable().transform(val => {
    if (!val || val === "" || val === null || val === undefined) return null;
    return val;
  }),
});
export const insertPopupViewSchema = createInsertSchema(popupViews).omit({ id: true, createdAt: true });

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "O título é obrigatório"),
  description: z.string().min(1, "A descrição é obrigatória"),
  startDateTime: z.string().optional().nullable().transform((str) => {
    if (!str || str.trim() === '') return null;

    // Se vem no formato "2025-09-10T21:30", preservar wall time usando UTC
    if (str.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      const [datePart, timePart] = str.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      // Usar Date.UTC para preservar o wall time sem adicionar offset local
      return new Date(Date.UTC(year, month - 1, day, hour, minute));
    }

    // Fallback para outros formatos
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      throw new Error(`Data de início inválida: ${str}`);
    }
    return date;
  }),
  endDateTime: z.string().optional().nullable().transform((str) => {
    if (!str || str.trim() === '') return null;

    // Se vem no formato "2025-09-10T21:30", preservar wall time usando UTC
    if (str.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      const [datePart, timePart] = str.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      // Usar Date.UTC para preservar o wall time sem adicionar offset local
      return new Date(Date.UTC(year, month - 1, day, hour, minute));
    }

    // Fallback para outros formatos
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      throw new Error(`Data de fim inválida: ${str}`);
    }
    return date;
  }),
});

export const insertUserNotificationSchema = createInsertSchema(userNotifications).omit({ id: true, createdAt: true });

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// ========== GAMIFICATION INSERT SCHEMAS ==========
export const insertUserPointsSchema = createInsertSchema(userPoints).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMissionSchema = createInsertSchema(missions).omit({ id: true, createdAt: true }).extend({
  startDate: z.string().optional().nullable().transform(val => {
    if (!val || val === "" || val === null || val === undefined) return new Date();
    return new Date(val);
  }),
  endDate: z.string().optional().nullable().transform(val => {
    if (!val || val === "" || val === null || val === undefined) return null;
    return new Date(val);
  }),
});
export const insertUserMissionSchema = createInsertSchema(userMissions).omit({ id: true, createdAt: true });
export const insertRewardSchema = createInsertSchema(rewards).omit({ id: true, createdAt: true });
export const insertUserRewardSchema = createInsertSchema(userRewards).omit({ id: true, createdAt: true });
export const insertRaffleSchema = createInsertSchema(raffles).omit({ id: true, createdAt: true }).extend({
  startDate: z.union([z.string(), z.date()]).optional().nullable().transform(val => {
    if (!val || val === "" || val === null || val === undefined) return new Date();
    if (val instanceof Date) return val;
    return new Date(val);
  }),
  endDate: z.union([z.string(), z.date()]).optional().nullable().transform(val => {
    if (!val || val === "" || val === null || val === undefined) return null;
    if (val instanceof Date) return val;
    return new Date(val);
  }),
  drawDate: z.union([z.string(), z.date()]).optional().nullable().transform(val => {
    if (!val || val === "" || val === null || val === undefined) return null;
    if (val instanceof Date) return val;
    return new Date(val);
  }),
  prizeValue: z.union([z.string(), z.number()]).optional().transform(val => {
    if (!val) return "0";
    return typeof val === 'number' ? val.toString() : val;
  }),
  totalEntries: z.number().optional().default(0),
  winnerUserId: z.string().optional().nullable(),
});
export const insertRaffleEntrySchema = createInsertSchema(raffleEntries).omit({ id: true, createdAt: true });
export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true, createdAt: true });
export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({ id: true });

// ========== REFERRAL SYSTEM INSERT SCHEMAS ==========
export const insertShareSettingsSchema = createInsertSchema(shareSettings).omit({ id: true, updatedAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });

// Insert schema for video progress
export const insertVideoProgressSchema = createInsertSchema(videoProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.string().min(1, "User ID is required"),
  videoId: z.string().min(1, "Video ID is required"),
  resourceId: z.string().min(1, "Resource ID is required"),
  maxTimeWatched: z.number().min(0).default(0),
  duration: z.number().optional().nullable(),
  progressPercentage: z.number().min(0).max(100).default(0),
  isCompleted: z.boolean().default(false),
});


// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPostLike = z.infer<typeof insertPostLikeSchema>;
export type PostLike = typeof postLikes.$inferSelect;
export type InsertPostTag = z.infer<typeof insertPostTagSchema>;
export type PostTag = typeof postTags.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertCommentLike = z.infer<typeof insertCommentLikeSchema>;
export type CommentLike = typeof commentLikes.$inferSelect;
export type InsertCommentReply = z.infer<typeof insertCommentReplySchema>;
export type CommentReply = typeof commentReplies.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof userActivity.$inferSelect;
export type InsertVideoLike = z.infer<typeof insertVideoLikeSchema>;
export type VideoLike = typeof videoLikes.$inferSelect;
export type InsertPopup = z.infer<typeof insertPopupSchema>;
export type Popup = typeof popups.$inferSelect;
export type InsertPopupView = z.infer<typeof insertPopupViewSchema>;
export type PopupView = typeof popupViews.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;
export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
export type NotificationSettings = typeof notificationSettings.$inferSelect;

// ========== GAMIFICATION TYPES ==========
export type InsertUserPoints = z.infer<typeof insertUserPointsSchema>;
export type UserPoints = typeof userPoints.$inferSelect;
export type InsertMission = z.infer<typeof insertMissionSchema>;
export type Mission = typeof missions.$inferSelect;
export type InsertUserMission = z.infer<typeof insertUserMissionSchema>;
export type UserMission = typeof userMissions.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertUserReward = z.infer<typeof insertUserRewardSchema>;
export type UserReward = typeof userRewards.$inferSelect;
export type InsertRaffle = z.infer<typeof insertRaffleSchema>;
export type Raffle = typeof raffles.$inferSelect;
export type InsertRaffleEntry = z.infer<typeof insertRaffleEntrySchema>;
export type RaffleEntry = typeof raffleEntries.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;

// ========== VIDEO PROGRESS TYPES ==========
export type VideoProgress = typeof videoProgress.$inferSelect;
export type InsertVideoProgress = z.infer<typeof insertVideoProgressSchema>;

// ========== ANALYTICS SYSTEM SCHEMAS AND TYPES ==========
export const insertAnalyticsTargetSchema = createInsertSchema(analyticsTargets).omit({ id: true, createdAt: true });
export const insertPageViewSchema = createInsertSchema(pageViews).omit({ id: true, createdAt: true });
export const insertBioClickSchema = createInsertSchema(bioClicks).omit({ id: true, createdAt: true });

export type InsertAnalyticsTarget = z.infer<typeof insertAnalyticsTargetSchema>;
export type AnalyticsTarget = typeof analyticsTargets.$inferSelect;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViews.$inferSelect;
export type InsertBioClick = z.infer<typeof insertBioClickSchema>;
export type BioClick = typeof bioClicks.$inferSelect;