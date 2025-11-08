import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import jwt from 'jsonwebtoken';
import {
  insertVideoSchema, insertProductSchema, insertCouponSchema,
  insertBannerSchema, insertPostSchema, insertCommentSchema,
  insertActivitySchema, comments, users, insertMissionSchema,
  insertRaffleSchema, insertRewardSchema, shareSettings, referrals,
  insertNotificationSchema, insertUserNotificationSchema, notifications, userNotifications,
  insertPopupSchema, insertPopupViewSchema, insertCategorySchema,
  insertUserSchema, coupons, categories, commentLikes, commentReplies
} from "../shared/schema";
import https from 'https';
import { DOMParser } from '@xmldom/xmldom';
import { youtubeOAuth } from './youtube-oauth';
import { db } from './db';
import { eq, desc, and, or, isNull, lte, gte, sql } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express'; // Import express for static file serving
import * as missionTracker from './mission-tracker';
import { SelectUser } from "../shared/schema/user";
import { requireAuth } from "./middleware/requireAuth"; // Assuming requireAuth is defined elsewhere

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Configure multer for file uploads
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage_multer = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
      // Only allow image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'));
      }
    }
  });

  // Serve uploaded files statically
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });
  app.use('/uploads', express.static(uploadDir));

  // Health check endpoint for Railway and monitoring
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Public route to get admin profile info (for bio page)
  app.get('/api/admin/public-profile', async (req, res) => {
    try {
      // Buscar o usuário admin pelo campo is_admin
      const adminUser = await storage.getAdminUser();

      if (!adminUser) {
        return res.status(404).json({ message: "Admin user not found" });
      }

      // Retornar apenas informações públicas
      res.json({
        name: adminUser.name,
        avatar: adminUser.avatar,
        bio: adminUser.communitySubtitle || 'Sua dose diária de beleza, perfumaria e autocuidado com muito humor e bom astral! 💚✨',
        socialNetworks: adminUser.socialNetworks || []
      });
    } catch (error) {
      console.error('Error fetching admin public profile:', error);
      res.status(500).json({ message: "Failed to fetch admin profile" });
    }
  });

  // Public route to get community settings (for bio page and community page)
  app.get('/api/admin/community-settings', async (req, res) => {
    try {
      // Buscar o usuário admin pelo campo is_admin
      const adminUser = await storage.getAdminUser();

      if (!adminUser) {
        return res.status(404).json({ message: "Admin user not found" });
      }

      // Retornar configurações da comunidade
      res.json({
        title: adminUser.communityTitle || 'Nossa Comunidade',
        subtitle: adminUser.communitySubtitle || 'Compartilhe suas experiências e dicas de beleza',
        backgroundImage: adminUser.communityBackgroundImage || '',
        mobileBackgroundImage: adminUser.communityMobileBackgroundImage || adminUser.communityBackgroundImage || ''
      });
    } catch (error) {
      console.error('Error fetching community settings:', error);
      res.status(500).json({ message: "Failed to fetch community settings" });
    }
  });

  // Update community settings (admin only)
  app.put('/api/admin/community-settings', async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { title, subtitle, backgroundImage, mobileBackgroundImage } = req.body;
      const userId = req.user.id;

      // Atualizar configurações da comunidade no perfil do admin
      await storage.updateUser(userId, {
        communityTitle: title,
        communitySubtitle: subtitle,
        communityBackgroundImage: backgroundImage,
        communityMobileBackgroundImage: mobileBackgroundImage || backgroundImage
      });

      // Broadcast atualização das configurações da comunidade
      const wsService = (global as any).notificationWS;
      if (wsService) {
        // Enviar notificação específica para community_settings
        wsService.broadcastDataUpdate('community_settings', 'updated', { title, subtitle, backgroundImage, mobileBackgroundImage });

        // Também enviar para users (retrocompatibilidade)
        wsService.broadcastDataUpdate('users', 'updated', {
          id: userId,
          isAdmin: true,
          communityTitle: title,
          communitySubtitle: subtitle
        });

        // Notificar analytics quando redes sociais mudarem (community settings incluem redes sociais)
        wsService.broadcastDataUpdate('analytics', 'updated', { 
          type: 'social_network', 
          source: 'community_settings' 
        });
      }

      res.json({
        title,
        subtitle,
        backgroundImage,
        mobileBackgroundImage: mobileBackgroundImage || backgroundImage
      });
    } catch (error) {
      console.error('Error updating community settings:', error);
      res.status(500).json({ message: "Failed to update community settings" });
    }
  });

  // Users routes (Admin only)
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Video routes
  app.get("/api/videos", async (req, res) => {
    try {
      const { exclusive, category } = req.query;
      const isExclusive = exclusive === 'true' ? true : exclusive === 'false' ? false : undefined;
      const videos = await storage.getVideos(isExclusive, category as string);
      res.json(videos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const videoId = req.params.id;
      const video = await storage.getVideo(videoId);

      if (!video) {
        return res.status(404).json({ message: "Video not found", videoId });
      }

      res.json(video);
    } catch (error) {
      res.status(500).json({
        message: "Failed to fetch video",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin alias route for getting single video
  app.get("/api/admin/videos/:id", async (req, res) => {
    try {
      const videoId = req.params.id;
      const video = await storage.getVideo(videoId);

      if (!video) {
        return res.status(404).json({ message: "Video not found", videoId });
      }

      res.json(video);
    } catch (error) {
      res.status(500).json({
        message: "Failed to fetch video",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Rota para criar vídeo
  app.post('/api/videos', async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const videoData = insertVideoSchema.parse(req.body);
      const video = await storage.createVideo(videoData);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('videos', 'created', video);
      }

      res.status(201).json(video);
    } catch (error) {
      res.status(400).json({ message: "Invalid video data" });
    }
  });

  // Rota para atualizar vídeo
  app.put('/api/videos/:id', async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const videoData = insertVideoSchema.partial().parse(req.body);
      const video = await storage.updateVideo(req.params.id, videoData);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('videos', 'updated', video);
      }

      res.json(video);
    } catch (error) {
      res.status(400).json({ message: "Invalid video data" });
    }
  });

  // Rota para deletar vídeo
  app.delete('/api/videos/:id', async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const videoId = req.params.id;

      // Excluir o vídeo e todos os vínculos
      await storage.deleteVideo(videoId);

      // Broadcast data updates para todas as entidades relacionadas
      const wsService = (global as any).notificationWS;
      if (wsService) {
        // Notificar que o vídeo foi deletado
        wsService.broadcastDataUpdate('videos', 'deleted', { id: videoId });

        // Notificar que banners podem ter sido afetados
        wsService.broadcastDataUpdate('banners', 'deleted', { videoId: videoId });

        // Notificar que popups podem ter sido afetados
        wsService.broadcastDataUpdate('popups', 'deleted', { videoId: videoId });

        // Notificar que comentários podem ter sido afetados
        wsService.broadcastDataUpdate('comments', 'deleted', { videoId: videoId });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar vídeo:', error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  app.post("/api/videos/:id/like", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      const result = await storage.likeVideo(req.params.id, req.user!.id);

      // Track video like action for missions (only if liked, not unliked)
      if (result.isLiked) {
        await missionTracker.trackVideoLiked(req.user!.id, req.params.id);
      }

      res.status(200).json({
        message: result.isLiked ? "Video liked successfully" : "Video unliked successfully",
        isLiked: result.isLiked
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to like video" });
    }
  });

  app.get("/api/videos/:id/like-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const isLiked = await storage.getUserVideoLike(req.params.id, req.user!.id);
      res.json({ isLiked });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get like status" });
    }
  });

  // Product routes (Portuguese)
  app.get("/api/produtos", async (req, res) => {
    try {
      const { type } = req.query;
      // Se for admin, buscar todos os produtos (ativos e inativos)
      const isAdmin = req.user?.isAdmin;
      const products = await storage.getProducts(type as string, isAdmin);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/produtos/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/produtos", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.put("/api/produtos/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.delete("/api/produtos/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Product routes (English - for backward compatibility)
  app.get("/api/products", async (req, res) => {
    try {
      const { type } = req.query;
      // Se for admin, buscar todos os produtos (ativos e inativos)
      const isAdmin = req.user?.isAdmin;
      const products = await storage.getProducts(type as string, isAdmin);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Admin alias route for getting single product
  app.get("/api/admin/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);

      // Notificar via WebSocket sobre novo produto
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('products', 'created', product);
      }

      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);

      // Notificar via WebSocket sobre produto atualizado
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('products', 'updated', product);
      }

      res.json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      await storage.deleteProduct(req.params.id);

      // Notificar via WebSocket sobre produto deletado
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('products', 'deleted', { id: req.params.id });
        // Notificar que popups também podem ter sido deletados
        wsService.broadcastDataUpdate('popups', 'deleted', { productId: req.params.id });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Coupon routes
  app.get("/api/coupons", async (req, res) => {
    try {
      const { category } = req.query;
      // Se for admin, mostrar todos os cupons (ativos e inativos)
      const isAdmin = req.user?.isAdmin;
      const showOnlyActive = isAdmin ? undefined : true;
      const coupons = await storage.getCoupons(category as string, showOnlyActive);
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });

  // Cupons ativos com categorias para modal da página /bio
  app.get("/api/coupons/active-with-categories", async (_req, res) => {
    try {
      const now = new Date();
      const result = await db
        .select({
          id: coupons.id,
          coverImageUrl: coupons.coverImageUrl,
          brand: coupons.brand,
          discount: coupons.discount,
          categoryId: coupons.categoryId,
          categoryTitle: categories.title,
          couponOrder: coupons.order,
          categoryOrder: categories.order,
          code: coupons.code,
          storeUrl: coupons.storeUrl,
        })
        .from(coupons)
        .leftJoin(categories, eq(coupons.categoryId, categories.id))
        .where(
          and(
            eq(coupons.isActive, true),
            or(
              isNull(coupons.startDateTime),
              lte(coupons.startDateTime, now)
            ),
            or(
              isNull(coupons.endDateTime),
              gte(coupons.endDateTime, now)
            )
          )
        )
        .orderBy(categories.order, coupons.order);

      console.log('🔍 Cupons retornados pela API:', JSON.stringify(result, null, 2));
      res.json(result);
    } catch (error) {
      console.error("Error fetching active coupons with categories:", error);
      res.status(500).json({ message: "Failed to fetch active coupons" });
    }
  });

  // Get single coupon by ID
  app.get("/api/coupons/:id", async (req, res) => {
    try {
      const coupon = await storage.getCoupon(req.params.id);
      if (!coupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coupon" });
    }
  });

  // Admin alias route for getting single coupon
  app.get("/api/admin/coupons/:id", async (req, res) => {
    try {
      const coupon = await storage.getCoupon(req.params.id);
      if (!coupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coupon" });
    }
  });

  // Admin delete coupon route
  app.delete("/api/admin/coupons/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const coupon = await storage.getCoupon(req.params.id);
      if (!coupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }

      // PRIMEIRO: Reordenar os cupons antes de deletar
      if (coupon.order >= 0) {
        await storage.reorderCouponsAfterDeletion(coupon.order);
      }

      // DEPOIS: Deletar o cupom
      await storage.deleteCoupon(req.params.id);

      // Notificar via WebSocket sobre cupom deletado
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('coupons', 'deleted', { id: req.params.id });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar cupom:', error);
      res.status(500).json({ message: "Failed to delete coupon", error: error.message });
    }
  });

  app.get("/api/coupons/check-order/:order", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const order = parseInt(req.params.order);
      if (isNaN(order)) {
        return res.status(400).json({ message: "Invalid order parameter" });
      }
      const excludeId = req.query.excludeId as string | undefined;
      const conflict = await storage.checkCouponOrderConflict(order, excludeId);
      res.json({ hasConflict: !!conflict, conflict });
    } catch (error) {
      res.status(500).json({ message: "Failed to check order conflict" });
    }
  });

  app.post("/api/coupons", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const couponData = insertCouponSchema.parse(req.body);
      const shouldReorder = req.body.shouldReorder === true;

      // PRIMEIRO: Incrementar os cupons na posição alvo e sucessores
      if (shouldReorder && couponData.order !== undefined && couponData.order >= 0) {
        await storage.reorderCouponsAfterInsert(couponData.order);
      }

      // DEPOIS: Criar o cupom na posição desejada
      const newCoupon = await storage.createCoupon(couponData);

      // Criar analytics target para o cupom
      await storage.createOrGetAnalyticsTarget({
        targetType: 'coupon',
        couponId: newCoupon.id,
        targetName: newCoupon.brand, // usar marca ao invés de código
        targetUrl: newCoupon.storeUrl || null
      });

      // Notificar via WebSocket sobre novo cupom
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('coupons', 'created', newCoupon);
      }

      res.status(201).json(newCoupon);
    } catch (error) {
      res.status(400).json({
        message: "Invalid coupon data",
        details: error.message,
        validation: error.issues || []
      });
    }
  });

  app.put("/api/coupons/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const couponData = insertCouponSchema.partial().parse(req.body);
      const shouldReorder = req.body.shouldReorder === true;
      const existingCoupon = await storage.getCoupon(req.params.id);

      if (!existingCoupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }

      const isOrderChanging = couponData.order !== undefined && couponData.order >= 0 && couponData.order !== existingCoupon.order;
      const isStatusChanging = couponData.isActive !== undefined && couponData.isActive !== existingCoupon.isActive;

      if (isOrderChanging && shouldReorder) {
        // PRIMEIRO: Remover o cupom da posição antiga (decrementar sucessores)
        if (existingCoupon.order >= 0) {
          await storage.reorderCouponsAfterDeletion(existingCoupon.order);
        }

        // SEGUNDO: Incrementar cupons na nova posição e sucessores (excluindo o cupom atual)
        await storage.reorderCouponsAfterInsert(couponData.order, req.params.id);
      }

      if (isStatusChanging && !isOrderChanging) {
        // Ao mudar o status, passar a ordem desejada se estiver reativando
        const targetOrder = couponData.isActive ? couponData.order : undefined;
        await storage.reorderCouponsAfterStatusChange(req.params.id, couponData.isActive, targetOrder);
      }

      // TERCEIRO: Atualizar o cupom na nova posição
      const coupon = await storage.updateCoupon(req.params.id, couponData);

      // QUARTO: Atualizar analytics_targets se marca ou URL mudaram
      if (couponData.brand || couponData.storeUrl !== undefined) {
        // Atualizar os analytics targets relacionados a este cupom
        await storage.updateAnalyticsTargetsByCoupon(
          req.params.id,
          couponData.brand || coupon.brand, // usar marca (atual ou existente)
          couponData.storeUrl !== undefined ? couponData.storeUrl : coupon.storeUrl
        );
      }

      // Notificar via WebSocket sobre cupom atualizado
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('coupons', 'updated', coupon);
        // Notificar também analytics para atualização em tempo real
        wsService.broadcastDataUpdate('analytics', 'updated', { 
          type: 'coupon', 
          id: req.params.id,
          name: coupon.brand 
        });
      }

      res.json(coupon);
    } catch (error) {
      res.status(400).json({
        message: "Invalid coupon data",
        details: error.message,
        validation: error.issues || []
      });
    }
  });

  app.delete("/api/coupons/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const coupon = await storage.getCoupon(req.params.id);
      if (!coupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }

      // PRIMEIRO: Reordenar os cupons antes de deletar
      if (coupon.order >= 0) {
        await storage.reorderCouponsAfterDeletion(coupon.order);
      }

      // DEPOIS: Deletar o cupom
      await storage.deleteCoupon(req.params.id);

      // Notificar via WebSocket sobre cupom deletado
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('coupons', 'deleted', { id: req.params.id });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar cupom:', error);
      res.status(500).json({ message: "Failed to delete coupon", error: error.message });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      // Se for admin, mostrar todas as categorias (ativas e inativas)
      const isAdmin = req.user?.isAdmin;
      const showOnlyActive = isAdmin ? undefined : true;
      const categories = await storage.getCategories(showOnlyActive);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  // Admin alias route for getting single category
  app.get("/api/admin/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);

      // Notificar via WebSocket sobre nova categoria
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('categories', 'created', category);
      }

      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({
        message: "Invalid category data",
        details: error.message,
        validation: error.issues || []
      });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(req.params.id, categoryData);

      // Notificar via WebSocket sobre categoria atualizada
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('categories', 'updated', category);
      }

      res.json(category);
    } catch (error) {
      res.status(400).json({
        message: "Invalid category data",
        details: error.message,
        validation: error.issues || []
      });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      await storage.deleteCategory(req.params.id);

      // Notificar via WebSocket sobre categoria deletada
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('categories', 'deleted', { id: req.params.id });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Banner routes
  app.get("/api/banners", async (req, res) => {
    try {
      const banners = await storage.getBanners(true);
      res.json(banners);
    } catch (error) {
      console.error("Error fetching banners:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get banners specific to a video
  app.get("/api/banners/video/:videoId", async (req, res) => {
    try {
      const videoId = req.params.videoId;
      const banners = await storage.getVideoBanners(videoId);
      res.json(banners);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch video banners" });
    }
  });

  // Admin route to get all banners (including expired and inactive)
  app.get("/api/admin/banners", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const banners = await storage.getBanners(); // Sem filtro, retorna todos
      res.json(banners);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch banners" });
    }
  });

  // Get single banner by ID
  app.get("/api/banners/:id", async (req, res) => {
    try {
      const banner = await storage.getBanner(req.params.id);
      if (!banner) {
        return res.status(404).json({ message: "Banner not found" });
      }
      res.json(banner);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch banner" });
    }
  });

  // Admin alias route for getting single banner
  app.get("/api/admin/banners/:id", async (req, res) => {
    try {
      const banner = await storage.getBanner(req.params.id);
      if (!banner) {
        return res.status(404).json({ message: "Banner not found" });
      }
      res.json(banner);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch banner" });
    }
  });

  app.post("/api/banners", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const insertData = insertBannerSchema.parse({
        ...req.body,
        opensCouponsModal: req.body.opensCouponsModal ?? false,
        startDateTime: req.body.startDateTime ? new Date(req.body.startDateTime) : null,
        endDateTime: req.body.endDateTime ? new Date(req.body.endDateTime) : null,
      });
      const banner = await storage.createBanner(insertData);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('banners', 'created', banner);
      }

      res.status(201).json(banner);
    } catch (error) {

      res.status(400).json({
        message: "Invalid banner data",
        error: error.message,
        issues: error.issues || []
      });
    }
  });

  app.put("/api/banners/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const updateData = insertBannerSchema.parse({
        ...req.body,
        opensCouponsModal: req.body.opensCouponsModal ?? false,
        startDateTime: req.body.startDateTime ? new Date(req.body.startDateTime) : null,
        endDateTime: req.body.endDateTime ? new Date(req.body.endDateTime) : null,
      });
      const banner = await storage.updateBanner(id, updateData);

      // Atualizar analytics_targets se título ou URL mudaram
      if (updateData.title || updateData.linkUrl !== undefined) {
        const targetName = updateData.title || banner.title;
        const targetUrl = updateData.linkUrl !== undefined ? updateData.linkUrl : banner.linkUrl;
        await storage.updateAnalyticsTargetsByBanner(id, targetName, targetUrl || undefined);
      }

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('banners', 'updated', banner);
        // Notificar também analytics para atualização em tempo real
        wsService.broadcastDataUpdate('analytics', 'updated', { 
          type: 'banner', 
          id: id,
          name: banner.title 
        });
      }

      res.json(banner);
    } catch (error) {
      res.status(400).json({ message: "Invalid banner data" });
    }
  });

  app.delete("/api/banners/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      await storage.deleteBanner(req.params.id);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('banners', 'deleted', { id: req.params.id });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete banner" });
    }
  });

  // Post routes (Community)
  app.get("/api/posts", async (req, res) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  // Statistics endpoints for community
  app.get("/api/users/count", async (req, res) => {
    try {
      const count = await storage.getUsersCount();
      res.json(count);
    } catch (error) {
      console.error('Error fetching users count:', error);
      res.status(500).json({ error: 'Failed to fetch users count' });
    }
  });

  app.get("/api/posts/count", async (req, res) => {
    try {
      const count = await storage.getPostsCount();
      res.json(count);
    } catch (error) {
      console.error('Error fetching posts count:', error);
      res.status(500).json({ error: 'Failed to fetch posts count' });
    }
  });

  app.get("/api/posts/likes/count", async (req, res) => {
    try {
      const count = await storage.getLikesCount();
      res.json(count);
    } catch (error) {
      console.error('Error fetching likes count:', error);
      res.status(500).json({ error: 'Failed to fetch likes count' });
    }
  });

  app.get("/api/posts/comments/count", async (req, res) => {
    try {
      const count = await storage.getCommentsCount();
      res.json(count);
    } catch (error) {
      console.error('Error fetching comments count:', error);
      res.status(500).json({ error: 'Failed to fetch comments count' });
    }
  });

  app.get("/api/posts/shares/count", async (req, res) => {
    try {
      const count = await storage.getSharesCount();
      res.json(count);
    } catch (error) {
      console.error('Error fetching shares count:', error);
      res.status(500).json({ error: 'Failed to fetch shares count' });
    }
  });

  // Get comments for a specific post
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const { postId } = req.params;
      const comments = await storage.getPostComments(postId);

      // Garantir que sempre retorna um array
      const safeComments = Array.isArray(comments) ? comments : [];

      res.json(safeComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments', data: [] });
    }
  });

  // Search users route (for tagging people)
  app.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const users = await storage.getAllUsers();
      // Return basic user info for tagging
      const usersForTagging = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }));
      res.json(usersForTagging);
    } catch (error) {
      console.error('Error fetching users for search:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { taggedUserIds, ...postBody } = req.body;
      const postData = insertPostSchema.parse({ ...postBody, userId: req.user!.id });
      const post = await storage.createPost(postData, taggedUserIds);
      res.status(201).json(post);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(400).json({ message: "Invalid post data" });
    }
  });

  // Like/unlike a post
  app.post("/api/posts/:postId/like", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { postId } = req.params;
      const userId = req.user!.id;

      const result = await storage.togglePostLike(postId, userId);

      // Track like action for missions (only if liked, not unliked)
      if (result.liked) {
        await missionTracker.trackPostLiked(userId, postId);
      }

      // Broadcast data update via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('posts', 'updated', {
          postId: postId,
          liked: result.liked,
          likesCount: result.likesCount
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Error toggling like:', error);
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  // Add comment to post
  app.post("/api/posts/:postId/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { postId } = req.params;
      const { content } = req.body;
      const userId = req.user!.id;

      if (!content?.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const comment = await storage.createPostComment({
        postId: postId,
        userId: userId,
        content: content.trim()
      });

      // Track comment action for missions
      await missionTracker.trackPostComment(userId, postId);

      // Broadcast data update via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('posts', 'updated', {
          postId: postId,
          action: 'comment_added',
          comment: comment
        });
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(400).json({ message: "Failed to create comment" });
    }
  });

  // Toggle save post
  app.post("/api/posts/:id/save", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const result = await storage.toggleSavedPost(id, userId);

      // Broadcast data update via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('posts', 'updated', {
          postId: id,
          action: result.saved ? 'saved' : 'unsaved',
          userId: userId
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Error toggling save post:', error);
      res.status(500).json({ message: "Failed to toggle save post" });
    }
  });

  // Check if user saved a post
  app.get("/api/posts/:id/save-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const saved = await storage.getUserSavedPost(id, userId);
      res.json({ saved });
    } catch (error) {
      console.error('Error checking save status:', error);
      res.status(500).json({ message: "Failed to check save status" });
    }
  });

  // Get user's saved posts
  app.get("/api/user/saved-posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userId = req.user!.id;
      const savedPosts = await storage.getUserSavedPosts(userId);
      res.json(savedPosts);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      res.status(500).json({ message: "Failed to fetch saved posts" });
    }
  });

  // Share post (increment share count)
  app.post("/api/posts/:id/share", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { id } = req.params;
      const result = await storage.incrementPostShares(id);

      // Broadcast data update via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('posts', 'updated', {
          postId: id,
          sharesCount: result.sharesCount
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Error sharing post:', error);
      res.status(500).json({ message: "Failed to share post" });
    }
  });

  // Check if user liked a post
  app.get("/api/posts/:id/like-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const liked = await storage.getUserPostLike(id, userId);
      res.json({ liked });
    } catch (error) {
      console.error('Error checking post like status:', error);
      res.status(500).json({ message: "Failed to check like status" });
    }
  });

  // Comment routes
  // Get comments for a video or product
  app.get("/api/comments/:resourceId", async (req, res) => {
    try {
      const { resourceId } = req.params;
      const { type } = req.query; // 'video' or 'product'

      let whereCondition;
      if (type === 'product') {
        whereCondition = eq(comments.productId, resourceId);
      } else {
        whereCondition = eq(comments.videoId, resourceId);
      }

      const commentsData = await db
        .select({
          id: comments.id,
          content: comments.content,
          createdAt: comments.createdAt,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(whereCondition)
        .orderBy(desc(comments.createdAt));

      res.json(commentsData);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Create a new comment
  app.post("/api/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { videoId, productId, content } = req.body;
      const userId = req.user!.id;

      if ((!videoId && !productId) || !content?.trim()) {
        return res.status(400).json({ error: "Video ID or Product ID and content are required" });
      }

      // Validate that the video or product exists
      if (videoId) {
        const video = await storage.getVideo(videoId);
        if (!video) {
          return res.status(404).json({ error: "Video not found" });
        }
      }

      if (productId) {
        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
      }

      // Create comment data object
      let commentData: any = {
        userId,
        content: content.trim(),
        createdAt: new Date(),
      };

      if (videoId) {
        commentData.videoId = videoId;
      } else if (productId) {
        commentData.productId = productId;
      }

      const [comment] = await db
        .insert(comments)
        .values(commentData)
        .returning();

      // Track comment action for missions
      if (commentData.videoId) {
        await missionTracker.trackVideoComment(req.user!.id, commentData.videoId);
      } else if (commentData.productId) {
        await missionTracker.trackProductComment(req.user!.id, commentData.productId);
      } else {
        // Fallback para posts ou outros tipos
        await missionTracker.trackComment(
          req.user!.id,
          commentData.postId || '',
          'post'
        );
      }

      // Get the comment with user info
      const [fullComment] = await db
        .select({
          id: comments.id,
          content: comments.content,
          createdAt: comments.createdAt,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.id, comment.id));

      res.status(201).json(fullComment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Delete comment route
  app.delete("/api/comments/:commentId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { commentId } = req.params;
      const userId = req.user!.id;

      // Check if comment exists and belongs to user
      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      if (comment.userId !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ error: "Not authorized to delete this comment" });
      }

      // Delete the comment
      await db
        .delete(comments)
        .where(eq(comments.id, commentId));

      res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Like/unlike comment
  app.post("/api/comments/:commentId/like", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { commentId } = req.params;
      const userId = req.user!.id;

      // Check if already liked
      const existingLike = await db
        .select()
        .from(commentLikes)
        .where(and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.userId, userId)
        ))
        .limit(1);

      let result;
      if (existingLike.length > 0) {
        // Unlike
        await db
          .delete(commentLikes)
          .where(and(
            eq(commentLikes.commentId, commentId),
            eq(commentLikes.userId, userId)
          ));
        result = { liked: false };
      } else {
        // Like
        await db.insert(commentLikes).values({
          commentId,
          userId,
        });
        result = { liked: true };
      }

      // Sync like count with actual count from commentLikes table
      const likesCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(commentLikes)
        .where(eq(commentLikes.commentId, commentId));

      const actualCount = Number(likesCountResult[0]?.count) || 0;

      // Update comment with actual count
      await db
        .update(comments)
        .set({ likesCount: actualCount })
        .where(eq(comments.id, commentId));

      result.likesCount = actualCount;

      // Get the postId from the comment for WebSocket broadcast
      const [comment] = await db
        .select({ postId: comments.postId })
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1);

      // Broadcast data update via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService && comment?.postId) {
        wsService.broadcastDataUpdate('posts', 'updated', {
          action: 'comment_like',
          commentId: commentId,
          postId: comment.postId,
          liked: result.liked,
          likesCount: result.likesCount
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Error toggling comment like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Get comment replies
  app.get("/api/comments/:commentId/replies", async (req, res) => {
    try {
      const { commentId } = req.params;

      const replies = await db
        .select({
          id: commentReplies.id,
          content: commentReplies.content,
          createdAt: commentReplies.createdAt,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(commentReplies)
        .innerJoin(users, eq(commentReplies.userId, users.id))
        .where(eq(commentReplies.commentId, commentId))
        .orderBy(desc(commentReplies.createdAt));

      res.json(replies);
    } catch (error) {
      console.error("Error fetching comment replies:", error);
      res.status(500).json({ error: "Failed to fetch replies" });
    }
  });

  // Check if user liked a comment - NOVA ROTA
  app.get("/api/comments/:commentId/like-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ liked: false });
    }

    try {
      const { commentId } = req.params;
      const userId = req.user!.id;

      const like = await db
        .select()
        .from(commentLikes)
        .where(and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.userId, userId)
        ))
        .limit(1);

      res.json({ liked: like.length > 0 });
    } catch (error) {
      console.error("Error checking comment like status:", error);
      res.status(500).json({ liked: false });
    }
  });

  // Add reply to comment
  app.post("/api/comments/:commentId/reply", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user!.id;

      if (!content?.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      const [reply] = await db
        .insert(commentReplies)
        .values({
          commentId,
          userId,
          content: content.trim(),
        })
        .returning();

      // Get reply with user info
      const [fullReply] = await db
        .select({
          id: commentReplies.id,
          content: commentReplies.content,
          createdAt: commentReplies.createdAt,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(commentReplies)
        .innerJoin(users, eq(commentReplies.userId, users.id))
        .where(eq(commentReplies.id, reply.id));

      // Sync reply count with actual count from commentReplies table
      const repliesCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(commentReplies)
        .where(eq(commentReplies.commentId, commentId));

      const actualCount = Number(repliesCountResult[0]?.count) || 0;

      // Update comment with actual count
      await db
        .update(comments)
        .set({ repliesCount: actualCount })
        .where(eq(comments.id, commentId));

      // Get the postId from the comment for WebSocket broadcast
      const [comment] = await db
        .select({ postId: comments.postId })
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1);

      // Broadcast data update via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService && comment?.postId) {
        wsService.broadcastDataUpdate('posts', 'updated', {
          action: 'comment_reply',
          commentId: commentId,
          postId: comment.postId,
          reply: fullReply,
          repliesCount: actualCount
        });
      }

      res.status(201).json(fullReply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ error: "Failed to create reply" });
    }
  });

  // Check if user liked a comment
  app.get("/api/comments/:commentId/like-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ liked: false });
    }

    try {
      const { commentId } = req.params;
      const userId = req.user!.id;

      const like = await db
        .select()
        .from(commentLikes)
        .where(and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.userId, userId)
        ))
        .limit(1);

      res.json({ liked: like.length > 0 });
    } catch (error) {
      console.error("Error checking comment like status:", error);
      res.status(500).json({ liked: false });
    }
  });

  // Activity routes
  app.post("/api/activity", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const activityData = insertActivitySchema.parse({ ...req.body, userId: req.user!.id });
      const activity = await storage.createActivity(activityData);

      // Track specific activities for missions - usar diretamente trackUserAction para maior flexibilidade
      await missionTracker.trackUserAction({
        userId: req.user!.id,
        action: activityData.action,
        resourceId: activityData.resourceId,
        resourceType: activityData.resourceType
      });

      res.status(201).json(activity);
    } catch (error) {
      res.status(400).json({ message: "Invalid activity data" });
    }
  });

  app.get("/api/user/activity", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const activities = await storage.getUserActivity(req.user!.id);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user activity" });
    }
  });

  app.get("/api/user/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const stats = await storage.getUserStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Subscription routes
  app.get("/api/user/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const subscription = await storage.getUserSubscription(req.user!.id);
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Função para converter duração ISO8601 do YouTube para formato HH:MM:SS
  function convertISO8601ToHHMMSS(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '00:00:00';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // YouTube playlist routes usando YouTube Data API
  app.get("/api/youtube/playlist/:playlistId", async (req, res) => {
    try {
      const playlistId = req.params.playlistId;
      const apiKey = process.env.YOUTUBE_API_KEY;

      if (!apiKey) {
        console.error('YouTube API Key não encontrada');
        return res.status(500).json({ message: "YouTube API Key not configured" });
      }

      // Buscar informações da playlist (título, descrição, etc)
      const playlistInfoUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`;

      const playlistInfoResponse = await new Promise<string>((resolve, reject) => {
        https.get(playlistInfoUrl, (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            resolve(data);
          });

        }).on('error', (err) => {
          reject(err);
        });
      });

      const playlistInfoData = JSON.parse(playlistInfoResponse);
      const playlistInfo = playlistInfoData.items?.[0];

      if (!playlistInfo) {
        console.error('Playlist não encontrada:', playlistId);
        return res.status(404).json({ message: "Playlist not found" });
      }

      // Buscar itens da playlist
      const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`;

      const playlistResponse = await new Promise<string>((resolve, reject) => {
        https.get(playlistItemsUrl, (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            resolve(data);
          });

        }).on('error', (err) => {
          reject(err);
        });
      });

      const playlistData = JSON.parse(playlistResponse);
      const videoIds = playlistData.items?.map((item: any) => item.snippet.resourceId.videoId) || [];

      if (videoIds.length === 0) {
        return res.json({
          playlistTitle: playlistInfo.snippet.title,
          playlistDescription: playlistInfo.snippet.description,
          playlistThumbnail: playlistInfo.snippet.thumbnails.maxres?.url || playlistInfo.snippet.thumbnails.high?.url || playlistInfo.snippet.thumbnails.default?.url,
          videos: []
        });
      }

      // Buscar detalhes dos vídeos incluindo duração
      const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`;

      const videosResponse = await new Promise<string>((resolve, reject) => {
        https.get(videosUrl, (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            resolve(data);
          });

        }).on('error', (err) => {
          reject(err);
        });
      });

      const videosData = JSON.parse(videosResponse);
      const videos = videosData.items?.map((video: any) => ({
        id: video.id,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
        link: `https://www.youtube.com/watch?v=${video.id}`,
        published: video.snippet.publishedAt,
        duration: convertISO8601ToHHMMSS(video.contentDetails.duration)
      })) || [];

      res.json({
        playlistTitle: playlistInfo.snippet.title,
        playlistDescription: playlistInfo.snippet.description,
        playlistThumbnail: playlistInfo.snippet.thumbnails.maxres?.url || playlistInfo.snippet.thumbnails.high?.url || playlistInfo.snippet.thumbnails.default?.url,
        videos: videos
      });

    } catch (error) {
      console.error('Erro ao buscar playlist via API:', error);
      res.status(500).json({ message: "Failed to fetch YouTube playlist" });
    }
  });

  // Endpoint para buscar dados de vídeo individual do YouTube
  app.get("/api/youtube/video/:videoId", async (req, res) => {
    try {
      let videoId = req.params.videoId;

      // Remove query parameters from videoId if present
      if (videoId.includes('?')) {
        videoId = videoId.split('?')[0];
      }

      // Remove qualquer caractere especial ou espaço
      videoId = videoId.trim();

      const apiKey = process.env.YOUTUBE_API_KEY;

      if (!apiKey) {
        console.error('YouTube API Key não encontrada');
        return res.status(500).json({ message: "YouTube API Key not configured" });
      }

      console.log('Buscando dados do YouTube para vídeo:', videoId);

      const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;

      const response = await new Promise<string>((resolve, reject) => {
        https.get(videoUrl, (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            resolve(data);
          });

        }).on('error', (err) => {
          reject(err);
        });
      });

      const videoData = JSON.parse(response);

      if (!videoData.items || videoData.items.length === 0) {
        console.error('Vídeo não encontrado no YouTube:', videoId);
        return res.status(404).json({ message: "Video not found" });
      }

      const video = videoData.items[0];

      // Detecta se é uma live (duração P0D ou liveBroadcastContent === 'live' ou 'upcoming')
      const isLive = video.snippet.liveBroadcastContent === 'live' ||
                     video.snippet.liveBroadcastContent === 'upcoming' ||
                     video.contentDetails.duration === 'P0D';

      const result = {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
        duration: isLive ? null : convertISO8601ToHHMMSS(video.contentDetails.duration),
        isLive: isLive,
        views: parseInt(video.statistics.viewCount || '0'),
        likes: parseInt(video.statistics.likeCount || '0'),
        publishedAt: video.snippet.publishedAt
      };

      console.log('Dados do YouTube recuperados com sucesso:', result.title, isLive ? '(LIVE)' : '');
      res.json(result);

    } catch (error) {
      console.error('Erro ao buscar dados do vídeo:', error);
      res.status(500).json({ message: "Failed to fetch video data" });
    }
  });

  // OAuth routes for YouTube integration
  app.get("/api/auth/youtube", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const authUrl = youtubeOAuth.getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('Erro ao gerar URL de autorização:', error);
      res.status(500).json({ message: "Failed to generate authorization URL" });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }

    const code = req.query.code as string;
    if (!code) {
      return res.status(400).json({ message: "Authorization code missing" });
    }

    try {
      const tokens = await youtubeOAuth.getTokens(code);

      // Salva os tokens no usuário
      await storage.updateUser(req.user!.id, {
        googleAccessToken: tokens.access_token || null,
        googleRefreshToken: tokens.refresh_token || null,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      });

      // Redireciona de volta para a página do vídeo
      res.redirect('/videos');
    } catch (error) {
      console.error('Erro ao processar callback OAuth:', error);
      res.status(500).json({ message: "Failed to process OAuth callback" });
    }
  });

  // Endpoint para curtir vídeo no YouTube
  app.post("/api/videos/:id/youtube-like", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const videoId = req.params.id;
      const { action } = req.body; // 'like' ou 'unlike'

      // Busca o vídeo para obter o YouTube video ID
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Extração do YouTube video ID da URL
      const youtubeVideoId = extractYouTubeVideoId(video.videoUrl);
      if (!youtubeVideoId) {
        return res.status(400).json({ message: "Invalid YouTube URL" });
      }

      // Busca o usuário com tokens
      const user = await storage.getUser(req.user!.id);
      if (!user?.googleAccessToken) {
        return res.status(403).json({
          message: "YouTube authorization required",
          needsAuth: true
        });
      }

      // Prepara tokens
      const tokens = {
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken,
        expiry_date: user.googleTokenExpiry?.getTime(),
      };

      // Executa ação no YouTube
      let success = false;
      if (action === 'like') {
        success = await youtubeOAuth.likeVideo(youtubeVideoId, tokens);
      } else if (action === 'unlike') {
        success = await youtubeOAuth.unlikeVideo(youtubeVideoId, tokens);
      }

      if (success) {
        // Track video like action for missions (only if liked via YouTube, not unliked)
        if (action === 'like') {
          await missionTracker.trackVideoLike(req.user!.id, videoId);
        }

        res.json({
          message: action === 'like' ? "Vídeo curtido no YouTube!" : "Curtida removida no YouTube!",
          success: true
        });
      } else {
        res.status(500).json({ message: "Failed to process YouTube like" });
      }

    } catch (error) {
      console.error('Erro ao processar curtida no YouTube:', error);
      res.status(500).json({ message: "Failed to process YouTube like" });
    }
  });

  // Endpoint para curtir vídeos do YouTube usando apenas o YouTube video ID
  app.post("/api/youtube/like", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { videoId } = req.body; // YouTube video ID direto
      const { action = 'like' } = req.body; // 'like' ou 'unlike'

      if (!videoId) {
        return res.status(400).json({ message: "YouTube video ID is required" });
      }

      // Busca o usuário com tokens
      const user = await storage.getUser(req.user!.id);
      if (!user?.googleAccessToken) {
        return res.status(403).json({
          message: "YouTube authorization required",
          needsAuth: true
        });
      }

      // Prepara tokens
      const tokens = {
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken,
        expiry_date: user.googleTokenExpiry?.getTime(),
      };

      // Executa ação no YouTube
      let success = false;
      if (action === 'like') {
        success = await youtubeOAuth.likeVideo(videoId, tokens);
      } else if (action === 'unlike') {
        success = await youtubeOAuth.unlikeVideo(videoId, tokens);
      }

      if (success) {
        // Track video like action for missions (only if liked via YouTube, not unliked)
        if (action === 'like') {
          await missionTracker.trackVideoLike(req.user!.id, videoId);
        }

        res.json({
          message: action === 'like' ? "Vídeo curtido no YouTube!" : "Curtida removida no YouTube!",
          success: true
        });
      } else {
        res.status(500).json({ message: "Failed to process YouTube like" });
      }

    } catch (error) {
      console.error('Erro ao processar curtida no YouTube:', error);
      res.status(500).json({ message: "Failed to process YouTube like" });
    }
  });

  // Video progress tracking endpoint
  app.post("/api/video-progress", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { videoId, resourceId, currentTime, duration } = req.body;

      if (!videoId || !resourceId || currentTime === undefined || !duration) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const progress = await storage.updateVideoProgress(
        req.user!.id,
        videoId,
        resourceId,
        Math.floor(currentTime),
        Math.floor(duration)
      );

      res.json(progress);
    } catch (error) {
      console.error('Error updating video progress:', error);
      res.status(500).json({ error: "Failed to update video progress" });
    }
  });

  // Get user progress for a resource (playlist or single video)
  app.get("/api/video-progress/:resourceId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { resourceId } = req.params;
      const progressList = await storage.getUserVideoProgressByResource(req.user!.id, resourceId);

      res.json(progressList);
    } catch (error) {
      console.error('Error fetching video progress:', error);
      res.status(500).json({ error: "Failed to fetch video progress" });
    }
  });

  // Popup routes
  app.get("/api/popups", async (req, res) => {
    try {
      const { trigger, targetPage, targetVideoId, targetCourseId } = req.query;


      if (trigger) {
        const popups = await storage.getActivePopupsForTrigger(
          trigger as string,
          targetPage as string,
          targetVideoId as string,
          targetCourseId as string
        );
        res.json(popups);
      } else {
        const popups = await storage.getPopups();
        res.json(popups);
      }
    } catch (error) {
      console.error("Error fetching popups:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/popups", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const popups = await storage.getPopups();
      res.json(popups);
    } catch (error) {
      console.error("Error fetching admin popups:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single popup by ID
  app.get("/api/popups/:id", async (req, res) => {
    try {
      const popup = await storage.getPopup(req.params.id);
      if (!popup) {
        return res.status(404).json({ message: "Popup not found" });
      }
      res.json(popup);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch popup" });
    }
  });

  // Admin alias route for getting single popup
  app.get("/api/admin/popups/:id", async (req, res) => {
    try {
      const popup = await storage.getPopup(req.params.id);
      if (!popup) {
        return res.status(404).json({ message: "Popup not found" });
      }
      res.json(popup);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch popup" });
    }
  });

  app.post("/api/popups", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      console.log("Dados recebidos para popup:", JSON.stringify(req.body, null, 2));
      const popupData = insertPopupSchema.parse(req.body);
      console.log("Dados validados:", JSON.stringify(popupData, null, 2));
      const popup = await storage.createPopup(popupData);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('popups', 'created', popup);
      }

      res.json(popup);
    } catch (error) {
      console.error("Error creating popup:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/popups/:id", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      console.log("Dados recebidos para atualizar popup:", JSON.stringify(req.body, null, 2));
      const popupData = insertPopupSchema.partial().parse(req.body);
      console.log("Dados validados para atualização:", JSON.stringify(popupData, null, 2));
      const popup = await storage.updatePopup(req.params.id, popupData);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('popups', 'updated', popup);
      }

      res.json(popup);
    } catch (error: any) {
      console.error("Error updating popup:", error);

      // Verificar se é erro de foreign key
      const isForeignKeyError =
        error?.code === '23503' ||
        error?.message?.includes('foreign key') ||
        error?.message?.includes('violates') ||
        error?.message?.includes('not present');

      if (isForeignKeyError) {
        return res.status(400).json({
          error: "Foreign key constraint violation",
          message: error.message || "ID de vídeo ou curso inválido",
          details: error.detail
        });
      }

      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });

  app.delete("/api/popups/:id", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      await storage.deletePopup(req.params.id);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('popups', 'deleted', { id: req.params.id });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting popup:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/popup-views", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const view = await storage.recordPopupView({
        ...req.body,
        userId: req.user.id,
        sessionId: req.sessionID
      });
      res.json(view);
    } catch (error) {
      console.error("Error recording popup view:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/popup-views/:popupId/check", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hasSeen = await storage.hasUserSeenPopup(
        req.user.id,
        req.params.popupId,
        req.sessionID
      );
      res.json({ hasSeen });
    } catch (error) {
      console.error("Error checking popup view:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== NOTIFICATION SETTINGS ROUTES ==========

  // Get user notification settings
  app.get("/api/notification-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const settings = await storage.getNotificationSettings(req.user!.id);
      res.json(settings || {
        emailEnabled: true,
        whatsappEnabled: false,
        smsEnabled: false,
        soundEnabled: true
      });
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Save user notification settings
  app.post("/api/notification-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { emailEnabled, whatsappEnabled, smsEnabled, soundEnabled } = req.body;

      const settings = await storage.saveNotificationSettings(req.user!.id, {
        emailEnabled,
        whatsappEnabled,
        smsEnabled,
        soundEnabled
      });

      res.json(settings);
    } catch (error) {
      console.error("Error saving notification settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== VITE CLIENT ENDPOINTS ==========
  // Endpoints específicos para o cliente Vite fazer ping (sem interceptar tudo)
  app.get("/__vite_ping", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/vite-ping", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/@vite/ping", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // ========== NOTIFICATION ROUTES ==========

  // Admin route to get all notifications
  app.get("/api/admin/notifications", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const notifications = await storage.getAllNotificationsForAdmin();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single notification by ID
  app.get("/api/notifications/:id", async (req, res) => {
    try {
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification" });
    }
  });

  // Admin alias route for getting single notification
  app.get("/api/admin/notifications/:id", async (req, res) => {
    try {
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('notifications', 'created', notification);
      }

      res.json(notification);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/notifications/:id", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const notificationData = insertNotificationSchema.partial().parse(req.body);
      const notification = await storage.updateNotification(req.params.id, notificationData);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('notifications', 'updated', notification);
      }

      res.json(notification);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      await storage.deleteNotification(req.params.id);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('notifications', 'deleted', { id: req.params.id });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/notifications/:id/send", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const notification = await storage.getNotificationById(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      // Verificar se a notificação deve ser enviada agora (agendamento)
      // Ajustar para o fuso horário de Brasília (UTC-3)
      const now = new Date();
      const brasiliaOffset = -3 * 60; // UTC-3 em minutos
      const nowInBrasilia = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // Subtrair 3 horas

      const startDate = notification.startDateTime ? new Date(notification.startDateTime) : null;
      const endDate = notification.endDateTime ? new Date(notification.endDateTime) : null;

      // Se tem startDateTime e ainda não chegou a hora, não enviar
      if (startDate && nowInBrasilia < startDate) {
        return res.status(400).json({
          error: "Notification is scheduled for future",
          scheduledFor: startDate
        });
      }

      // Se tem endDateTime e já passou, não enviar
      if (endDate && nowInBrasilia > endDate) {
        return res.status(400).json({
          error: "Notification has expired",
          expiredAt: endDate
        });
      }

      // Buscar todos os usuários elegíveis baseado em targetAudience
      const allUsers = await storage.getAllUsers();
      let eligibleUsers = [];

      switch (notification.targetAudience) {
        case 'all':
          eligibleUsers = allUsers;
          break;
        case 'free':
          // Notificações 'free' só para usuários que NÃO são premium
          eligibleUsers = allUsers.filter(user => user.planType !== 'premium');
          break;
        case 'premium':
          // Notificações 'premium' só para usuários premium
          eligibleUsers = allUsers.filter(user => user.planType === 'premium');
          break;
        default:
          eligibleUsers = allUsers;
      }

      // Enviar notificação para cada usuário elegível (com controle anti-spam)
      let successCount = 0;
      for (const user of eligibleUsers) {
        try {
          await storage.createUserNotification({
            userId: user.id,
            notificationId: notification.id
          });
          successCount++;
        } catch (error: any) {
          // Se o erro for de constraint unique (duplicate), ignorar (anti-spam)
          if (error?.code !== '23505') {
            console.error(`Erro ao enviar notificação para usuário ${user.id}:`, error);
          }
        }
      }

      // Enviar via WebSocket para usuários conectados
      try {
        const wsService = (global as any).notificationWS;
        if (wsService && successCount > 0) {
          // Buscar a notificação com todos os dados
          const fullNotification = await storage.getNotificationById(notification.id);
          if (fullNotification) {
            const notificationData = {
              id: 'temp-id', // Será substituído pelo ID real no frontend
              userId: '',
              notificationId: fullNotification.id,
              isRead: false,
              readAt: null,
              createdAt: new Date().toISOString(),
              notification: fullNotification
            };

            // Enviar para usuários que realmente receberam a notificação
            const actualUserIds = [];
            for (const user of eligibleUsers) {
              try {
                // Verificar se o usuário realmente recebeu a notificação
                const userNotification = await storage.getUserNotificationByIds(user.id, notification.id);
                if (userNotification) {
                  actualUserIds.push(user.id);
                }
              } catch (error) {
                // Usuário não recebeu (pode ser por já ter recebido antes)
              }
            }

            if (actualUserIds.length > 0) {
              await wsService.broadcastNewNotification(actualUserIds, notificationData);
            }
          }
        }
      } catch (wsError) {
        console.error('Erro ao enviar notificação via WebSocket:', wsError);
      }

      res.json({
        success: true,
        message: `Notificação enviada com sucesso para ${successCount} usuários!`,
        sentToUsers: successCount,
        totalEligibleUsers: eligibleUsers.length
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== USER NOTIFICATIONS ROUTES ==========

  // Listar notificações do usuário
  app.get("/api/user-notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user!.id;
      const { isRead } = req.query;

      const isReadFilter = isRead !== undefined ? isRead === 'true' : undefined;
      let notifications = await storage.getUserNotifications(userId, isReadFilter);

      // Filtrar notificações baseado no plano do usuário
      const userSubscription = await storage.getUserSubscription(userId);
      const userPlanType = userSubscription?.planType || 'free';

      // Aplicar filtro baseado no plano do usuário
      notifications = notifications.filter(userNotification => {
        const targetAudience = userNotification.notification.targetAudience;

        if (targetAudience === 'all') {
          return true; // Notificações 'all' aparecem para todos
        } else if (targetAudience === 'free' && userPlanType !== 'premium') {
          return true; // Notificações 'free' só para usuários não premium
        } else if (targetAudience === 'premium' && userPlanType === 'premium') {
          return true; // Notificações 'premium' só para usuários premium
        }

        return false; // Filtrar fora
      });

      res.json(notifications);
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Marcar notificação como lida
  app.post("/api/user-notifications/:notificationId/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user!.id;
      const { notificationId } = req.params;

      const userNotification = await storage.markNotificationAsRead(userId, notificationId);

      // Enviar atualização via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastToUser(userId, {
          type: 'notification_read',
          notificationId: notificationId
        });
      }

      res.json(userNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Marcar todas as notificações como lidas
  app.post("/api/user-notifications/read-all", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user!.id;

      await storage.markAllNotificationsAsRead(userId);

      // Enviar atualização via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastToUser(userId, {
          type: 'all_notifications_read'
        });
      }

      res.json({ success: true, message: "Todas as notificações foram marcadas como lidas" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Remover notificação do usuário
  app.delete("/api/user-notifications/:notificationId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user!.id;
      const { notificationId } = req.params;

      // Verificar se a notificação existe para este usuário
      const userNotification = await storage.getUserNotificationByIds(userId, notificationId);
      if (!userNotification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      // Remover apenas a relação user-notification
      await storage.removeUserNotification(userId, notificationId);

      // Enviar atualização via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastToUser(userId, {
          type: 'notification_removed',
          notificationId: notificationId
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error removing user notification:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== GAMIFICATION ROUTES ==========

  // User Points routes
  app.get("/api/gamification/points", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userId = req.user!.id;

      // Buscar pontos do usuário atual
      let userPoints = await storage.getUserPoints(userId);

      // Se o usuário não tem pontos ainda, criar com 0
      if (!userPoints) {
        userPoints = await storage.createUserPoints({
          userId: userId,
          totalPoints: 0
        });
      }

      // Buscar ranking geral
      const ranking = await storage.getUserRanking(10);

      res.json({
        userPoints: {
          totalPoints: userPoints.totalPoints,
          currentLevel: userPoints.currentLevel,
          levelProgress: userPoints.levelProgress
        },
        ranking: ranking
      });
    } catch (error) {
      console.error('Error fetching user points:', error);
      res.status(500).json({ message: "Failed to fetch user points" });
    }
  });

  // Ranking endpoint specifically for cheirosas page
  app.get("/api/gamification/ranking", async (req, res) => {
    try {
      // Buscar ranking de usuários com dados de subscription incluídos
      const ranking = await storage.getUserRanking(10);
      res.json(ranking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ranking", error: error.message });
    }
  });

  // Alias for user points endpoint
  app.get("/api/gamification/user-points", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userId = req.user!.id;

      // Buscar pontos do usuário atual
      let userPoints = await storage.getUserPoints(userId);

      // Se o usuário não tem pontos ainda, criar com 0
      if (!userPoints) {
        userPoints = await storage.createUserPoints({
          userId: userId,
          totalPoints: 0,
          currentLevel: 'bronze',
          levelProgress: 0
        });
      }

      res.json({
        userPoints: {
          totalPoints: userPoints.totalPoints || 0,
          currentLevel: userPoints.currentLevel || 'bronze',
          levelProgress: userPoints.levelProgress || 0,
          nextLevelPoints: 500 // Hardcoded for now
        }
      });
    } catch (error) {
      console.error('Error fetching user points:', error);
      res.status(500).json({ message: "Failed to fetch user points" });
    }
  });

  // Missions routes
  app.get("/api/gamification/missions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userId = req.user!.id;

      // Buscar dados do usuário para filtros
      const userPoints = await storage.getUserPoints(userId);

      // Buscar missões ativas
      const activeMissions = await storage.getMissions(true);

      // Filtrar missões baseado no nível e pontos do usuário
      const userLevel = userPoints.currentLevel || 'bronze';
      const userTotalPoints = userPoints.totalPoints || 0;

      const levelOrder = { bronze: 0, silver: 1, gold: 2, diamond: 3 };
      const userLevelOrder = levelOrder[userLevel as keyof typeof levelOrder] || 0;

      const accessibleMissions = activeMissions.filter(mission => {
        // Verificar nível mínimo
        const missionMinLevel = (mission as any).minLevel || 'bronze';
        const missionLevelOrder = levelOrder[missionMinLevel as keyof typeof levelOrder] || 0;
        if (userLevelOrder < missionLevelOrder) return false;

        // Verificar pontos mínimos
        const missionMinPoints = (mission as any).minPoints || 0;
        if (userTotalPoints < missionMinPoints) return false;

        return true;
      });

      // Buscar progresso do usuário para cada missão
      const userMissions = await storage.getUserMissions(userId);

      // Combinar dados das missões com o progresso do usuário
      const missionsWithProgress = accessibleMissions.map(mission => {
        const userMission = userMissions.find(um => um.missionId === mission.id);

        return {
          id: mission.id,
          title: mission.title,
          description: mission.description,
          pointsReward: mission.pointsReward,
          missionType: mission.missionType,
          actionRequired: mission.actionRequired,
          targetCount: mission.targetCount,
          icon: mission.icon,
          color: mission.color,
          minLevel: (mission as any).minLevel,
          minPoints: (mission as any).minPoints,
          premiumOnly: (mission as any).premiumOnly,
          isActive: mission.isActive,
          startDate: mission.startDate,
          endDate: mission.endDate,
          progress: userMission?.currentProgress || 0,
          completed: userMission?.isCompleted || false,
          completedAt: userMission?.completedAt
        };
      });

      res.json({ missions: missionsWithProgress });
    } catch (error) {
      console.error('Error fetching missions:', error);
      res.status(500).json({ message: "Failed to fetch missions" });
    }
  });

  app.post("/api/gamification/missions/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userId = req.user!.id;
      const missionId = req.params.id;

      // Complete mission using database
      const result = await storage.completeMission(userId, missionId);

      if (result.success) {
        res.json({
          message: `Missão completada! Você ganhou ${result.pointsEarned} pontos!`,
          pointsEarned: result.pointsEarned
        });
      } else {
        res.status(400).json({
          message: "Não foi possível completar a missão"
        });
      }
    } catch (error) {
      console.error('Error completing mission:', error);
      res.status(500).json({ message: "Failed to complete mission" });
    }
  });

  // Rewards routes
  app.get("/api/gamification/rewards", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const rewards = await storage.getRewards(true); // somente recompensas ativas
      res.json({ rewards });
    } catch (error) {
      console.error('Error fetching rewards:', error);
      res.status(500).json({ message: "Failed to fetch rewards" });
    }
  });

  app.post("/api/gamification/rewards/:id/redeem", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      res.json({ message: "Recompensa resgatada com sucesso!" });
    } catch (error) {
      console.error('Error redeeming reward:', error);
      res.status(500).json({ message: "Failed to redeem reward" });
    }
  });

  // Raffles routes
  app.get("/api/gamification/raffles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const raffles = await storage.getRaffles(true); // somente sorteios ativos
      res.json({ raffles });
    } catch (error) {
      console.error('Error fetching raffles:', error);
      res.status(500).json({ message: "Failed to fetch raffles" });
    }
  });

  // Public raffles route (for cheirosas page)
  app.get("/api/raffles", async (req, res) => {
    try {
      // Buscar sorteios ativos do banco de dados
      const activeRaffles = await storage.getRaffles(true);

      res.json(activeRaffles || []);
    } catch (error) {
      console.error('Error fetching public raffles:', error);
      res.status(500).json({ message: "Failed to fetch raffles", error: error.message });
    }
  });

  // Admin raffles route
  app.get("/api/admin/raffles", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const raffles = await storage.getRaffles(); // Busca todos os sorteios do banco
      res.json({ raffles: raffles || [] });
    } catch (error) {
      console.error('Error fetching admin raffles:', error);
      res.status(500).json({ message: "Failed to fetch raffles", error: error.message });
    }
  });

  // Admin missions route
  app.get("/api/admin/missions", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const missions = await storage.getMissions(); // Busca todas as missões do banco
      res.json({ missions: missions || [] });
    } catch (error) {
      console.error('Error fetching admin missions:', error);
      res.status(500).json({ message: "Failed to fetch missions", error: error.message });
    }
  });

  // Admin rewards route
  app.get("/api/admin/rewards", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const rewards = await storage.getRewards(); // Busca todas as recompensas do banco
      res.json({ rewards: rewards || [] });
    } catch (error) {
      console.error('Error fetching admin rewards:', error);
      res.status(500).json({ message: "Failed to fetch rewards", error: error.message });
    }
  });

  // Admin create/update mission
  app.post("/api/admin/missions", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const missionData = req.body;

      // Validate mission data using schema first - this will handle date transformations
      const validatedData = insertMissionSchema.parse(missionData);

      let result;
      let action;

      if (missionData.id && missionData.id !== '' && !missionData.id.startsWith('mission_')) {
        // Update existing mission
        const { id, ...updateData } = validatedData;
        result = await storage.updateMission(missionData.id, updateData);
        action = 'updated';
      } else {
        // Create new mission
        const { id, ...createData } = validatedData; // Remove temporary ID
        result = await storage.createMission(createData);
        action = 'created';
      }

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('gamification', action, result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error saving mission:', error);
      res.status(500).json({ message: "Failed to save mission" });
    }
  });

  // Admin create/update raffle
  app.post("/api/admin/raffles", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const raffleData = req.body;

      // Validate raffle data using schema first - this will handle date transformations
      const validatedData = insertRaffleSchema.parse(raffleData);

      let result;
      let action;

      if (raffleData.id && raffleData.id !== '' && !raffleData.id.startsWith('raffle_')) {
        // Update existing raffle
        const { id, ...updateData } = validatedData;
        result = await storage.updateRaffle(raffleData.id, updateData);
        action = 'updated';
      } else {
        // Create new raffle
        const { id, ...createData } = validatedData; // Remove temporary ID
        result = await storage.createRaffle(createData);
        action = 'created';
      }

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('gamification', action, result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error saving raffle:', error);
      res.status(500).json({ message: "Failed to save raffle" });
    }
  });

  // Admin create/update reward
  app.post("/api/admin/rewards", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const rewardData = req.body;

      // Validate reward data using schema
      const validatedData = insertRewardSchema.parse(rewardData);

      let result;
      let action;

      if (rewardData.id && rewardData.id !== '' && !rewardData.id.startsWith('reward_')) {
        // Update existing reward
        const { id, ...updateData } = validatedData;
        result = await storage.updateReward(rewardData.id, updateData);
        action = 'updated';
      } else {
        // Create new reward
        const { id, ...createData } = validatedData; // Remove temporary ID
        result = await storage.createReward(createData);
        action = 'created';
      }

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('gamification', action, result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error saving reward:', error);
      res.status(500).json({ message: "Failed to save reward" });
    }
  });

  // Admin delete mission
  app.delete("/api/admin/missions/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      await storage.deleteMission(req.params.id);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('gamification', 'deleted', { id: req.params.id, type: 'mission' });
      }

      res.json({ message: "Mission deleted successfully" });
    } catch (error) {
      console.error('Error deleting mission:', error);
      res.status(500).json({ message: "Failed to delete mission" });
    }
  });

  // Admin delete raffle
  app.delete("/api/admin/raffles/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      await storage.deleteRaffle(req.params.id);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('gamification', 'deleted', { id: req.params.id, type: 'raffle' });
      }

      res.json({ message: "Raffle deleted successfully" });
    } catch (error) {
      console.error('Error deleting raffle:', error);
      res.status(500).json({ message: "Failed to delete raffle" });
    }
  });

  // Admin delete reward
  app.delete("/api/admin/rewards/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      await storage.deleteReward(req.params.id);

      // Broadcast data update
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('gamification', 'deleted', { id: req.params.id, type: 'reward' });
      }

      res.json({ message: "Reward deleted successfully" });
    } catch (error) {
      console.error('Error deleting reward:', error);
      res.status(500).json({ message: "Failed to delete reward" });
    }
  });

  app.post("/api/gamification/raffles/:id/enter", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { entries = 1 } = req.body;
      res.json({ message: `Participação registrada com sucesso! ${entries} entrada(s)` });
    } catch (error) {
      console.error('Error entering raffle:', error);
      res.status(500).json({ message: "Failed to enter raffle" });
    }
  });

  // ========== AUTH TOKEN ENDPOINT ==========

  // Get JWT token for WebSocket authentication
  app.get("/api/auth/token", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const secret = process.env.SESSION_SECRET || 'default-secret';

      const token = jwt.sign(
        {
          userId: req.user!.id,
          email: req.user!.email
        },
        secret,
        { expiresIn: '24h' }
      );

      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate token", details: error.message });
    }
  });

  // ========== SHARING/REFERRAL SYSTEM ROUTES ==========

  // Get share settings (admin only)
  app.get("/api/admin/share-settings", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      const settings = await storage.getShareSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching share settings:', error);
      res.status(500).json({ message: "Failed to fetch share settings" });
    }
  });

  // Update share settings (admin only)
  app.put("/api/admin/share-settings", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const { freeReferralPoints, premiumReferralPoints } = req.body;

      if (typeof freeReferralPoints !== 'number' || typeof premiumReferralPoints !== 'number') {
        return res.status(400).json({ message: "Invalid points values" });
      }

      const updatedSettings = await storage.updateShareSettings(
        freeReferralPoints,
        premiumReferralPoints,
        req.user.id
      );

      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating share settings:', error);
      res.status(500).json({ message: "Failed to update share settings" });
    }
  });

  // Get users with referral data (admin only)
  app.get("/api/admin/users-with-referrals", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      const usersWithReferrals = await storage.getAllUsersWithReferralData();
      res.json(usersWithReferrals);
    } catch (error) {
      console.error('Error fetching users with referrals:', error);
      res.status(500).json({ message: "Failed to fetch users with referrals" });
    }
  });

  // ========== ADMIN GAMIFICATION ROUTES ==========

  // Missions admin routes
  app.get("/api/admin/missions", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const missions = await storage.getMissions(); // todas as missões, incluindo inativas
      res.json({ missions });
    } catch (error) {
      console.error('Error fetching missions for admin:', error);
      res.status(500).json({ message: "Failed to fetch missions" });
    }
  });

  app.post("/api/admin/missions", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const missionData = req.body;

      // Validate mission data using schema first - this will handle date transformations
      const validatedData = insertMissionSchema.parse(missionData);

      let result;

      if (missionData.id && missionData.id !== '' && !missionData.id.startsWith('mission_')) {
        // Update existing mission
        const { id, ...updateData } = validatedData;
        result = await storage.updateMission(missionData.id, updateData);
      } else {
        // Create new mission
        const { id, ...createData } = validatedData; // Remove temporary ID
        result = await storage.createMission(createData);
      }

      res.json(result);
    } catch (error) {
      console.error('Error saving mission:', error);
      res.status(500).json({ message: "Failed to save mission" });
    }
  });

  app.put("/api/admin/missions/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const mission = await storage.updateMission(id, req.body);
      res.json(mission);
    } catch (error) {
      console.error('Error updating mission:', error);
      res.status(400).json({ message: "Failed to update mission" });
    }
  });

  app.delete("/api/admin/missions/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      await storage.deleteMission(id);
      res.json({ message: "Mission deleted successfully" });
    } catch (error) {
      console.error('Error deleting mission:', error);
      res.status(400).json({ message: "Failed to delete mission" });
    }
  });

  // Rewards admin routes
  app.get("/api/admin/rewards", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const rewards = await storage.getRewards(); // todas as recompensas, incluindo inativas
      res.json({ rewards });
    } catch (error) {
      console.error('Error fetching rewards for admin:', error);
      res.status(500).json({ message: "Failed to fetch rewards" });
    }
  });

  app.post("/api/admin/rewards", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const reward = await storage.createReward(req.body);
      res.status(201).json(reward);
    } catch (error) {
      console.error('Error creating reward:', error);
      res.status(400).json({ message: "Failed to create reward" });
    }
  });

  app.put("/api/admin/rewards/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const reward = await storage.updateReward(id, req.body);
      res.json(reward);
    } catch (error) {
      console.error('Error updating reward:', error);
      res.status(400).json({ message: "Failed to update reward" });
    }
  });

  app.delete("/api/admin/rewards/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      await storage.deleteReward(id);
      res.json({ message: "Reward deleted successfully" });
    } catch (error) {
      console.error('Error deleting reward:', error);
      res.status(400).json({ message: "Failed to delete reward" });
    }
  });

  // Raffles admin routes
  app.get("/api/admin/raffles", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const raffles = await storage.getRaffles(); // todos os sorteios, incluindo inativos
      res.json({ raffles });
    } catch (error) {
      console.error('Error fetching raffles for admin:', error);
      res.status(500).json({ message: "Failed to fetch raffles" });
    }
  });

  app.post("/api/admin/raffles", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const raffle = await storage.createRaffle(req.body);
      res.status(201).json(raffle);
    } catch (error) {
      console.error('Error creating raffle:', error);
      res.status(400).json({ message: "Failed to create raffle" });
    }
  });

  app.put("/api/admin/raffles/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const raffle = await storage.updateRaffle(id, req.body);
      res.json(raffle);
    } catch (error) {
      console.error('Error updating raffle:', error);
      res.status(400).json({ message: "Failed to update raffle" });
    }
  });

  app.delete("/api/admin/raffles/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      await storage.deleteRaffle(id);
      res.json({ message: "Raffle deleted successfully" });
    } catch (error) {
      console.error('Error deleting raffle:', error);
      res.status(400).json({ message: "Failed to delete raffle" });
    }
  });

  // Endpoint temporário para popular banco com dados mockados
  app.post("/api/admin/seed-gamification", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      await storage.seedSampleContent(req.user.id);
      res.json({ message: "Gamification data seeded successfully" });
    } catch (error) {
      console.error('Error seeding gamification data:', error);
      res.status(500).json({ message: "Failed to seed gamification data" });
    }
  });

  // Get user profile
  app.get("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user profile without sensitive data
      const userProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        gender: user.gender,
        age: user.age,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      };

      res.json(userProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Update user profile
  app.put("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userId = req.user.id;
      const profileData = req.body; // Accepts partial user data

      // Validate incoming data, ensuring only allowed fields are updated
      const allowedFields: (keyof SelectUser)[] = ['name', 'email', 'gender', 'age', 'avatar'];
      const sanitizedProfileData: Partial<SelectUser> = {};

      for (const field of allowedFields) {
        if (profileData[field] !== undefined) {
          sanitizedProfileData[field] = profileData[field];
        }
      }

      // Specific validation for email if it's being updated
      if (sanitizedProfileData.email && sanitizedProfileData.email !== req.user.email) {
        const existingUser = await storage.findUserByEmail(sanitizedProfileData.email);
        if (existingUser) {
          return res.status(409).json({ message: "Este email já está em uso por outro usuário." });
        }
      }

      // Validate age if present
      if (sanitizedProfileData.age !== undefined && (typeof sanitizedProfileData.age !== 'number' || sanitizedProfileData.age < 0)) {
        return res.status(400).json({ message: "Idade inválida." });
      }

      // Update the user profile in the database
      const updatedUser = await storage.updateUser(userId, sanitizedProfileData);

      // Respond with the updated user profile (excluding sensitive info)
      const userProfile = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        gender: updatedUser.gender,
        age: updatedUser.age,
        isAdmin: updatedUser.isAdmin,
        createdAt: updatedUser.createdAt
      };

      // Broadcast update to connected clients
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastUserUpdate(userId, userProfile);
      }

      res.json(userProfile);
    } catch (error: any) {
      console.error('Error updating user profile:', error);

      // Handle potential validation errors from Zod if schema parsing was intended here
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Dados inválidos.", details: error.errors });
      }

      // Generic error handling
      res.status(500).json({ message: "Falha ao atualizar perfil.", error: error.message });
    }
  });

  // Update user password
  app.put("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Validate required fields
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }

      // Validate new password length
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter no mínimo 6 caracteres" });
      }

      // Get current user from database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify current password
      const { comparePasswords } = await import('./auth');
      const isPasswordValid = await comparePasswords(currentPassword, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Senha atual incorreta" });
      }

      // Hash new password
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(newPassword);

      // Update password in database
      await storage.updateUser(userId, { password: hashedPassword });

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error: any) {
      console.error('Error updating password:', error);
      res.status(500).json({ message: "Falha ao atualizar senha", error: error.message });
    }
  });

  // Get user's own referral stats
  app.get("/api/user/referral-stats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const stats = await storage.getUserReferralStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching user referral stats:', error);
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  // Update community settings (admin only)
  app.put("/api/admin/community-settings", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { title, subtitle, backgroundImage, mobileBackgroundImage } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!title || !subtitle) {
        return res.status(400).json({ message: "Title and subtitle are required" });
      }

      // Update the admin user with community settings
      const updateData: any = {
        communityTitle: title,
        communitySubtitle: subtitle,
      };

      // Only update background image if provided
      if (backgroundImage !== undefined) {
        updateData.communityBackgroundImage = backgroundImage;
      }

      // Only update mobile background image if provided
      if (mobileBackgroundImage !== undefined) {
        updateData.communityBackgroundImageMobile = mobileBackgroundImage;
      }

      const updatedUser = await storage.updateUser(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const settings = {
        title: updatedUser.communityTitle,
        subtitle: updatedUser.communitySubtitle,
        backgroundImage: updatedUser.communityBackgroundImage,
        mobileBackgroundImage: updatedUser.communityBackgroundImageMobile
      };

      // Broadcast atualização das configurações da comunidade
      const wsService = (global as any).notificationWS;
      if (wsService) {
        // Enviar notificação específica para community_settings
        wsService.broadcastDataUpdate('community_settings', 'updated', settings);

        // Também enviar para users (retrocompatibilidade)
        wsService.broadcastDataUpdate('users', 'updated', {
          id: userId,
          isAdmin: true,
          communitySettingsUpdated: true
        });
      }

      res.json(settings);
    } catch (error) {
      console.error('Error updating community settings:', error);
      res.status(500).json({ message: "Failed to update community settings" });
    }
  });

  // Create a referral (when someone signs up with a referral code)
  app.post("/api/referrals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { referrerId, referredPlanType } = req.body;

      if (!referrerId || !referredPlanType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const referral = await storage.createReferral(referrerId, req.user.id, referredPlanType);

      // Track referral action for missions - determinar tipo baseado no plano
      if (referredPlanType === 'premium') {
        await missionTracker.trackReferralPremium(referrerId, req.user.id);
      } else {
        await missionTracker.trackReferralFree(referrerId, req.user.id);
      }

      res.json(referral);
    } catch (error) {
      console.error('Error creating referral:', error);
      res.status(500).json({ message: "Failed to create referral" });
    }
  });

  // ========== ANALYTICS ROUTES ==========

  // Track page view
  app.post("/api/analytics/pageview", async (req, res) => {
    try {
      const { page, sessionId, referrer, userAgent, ipAddress, city, state, country } = req.body;

      if (!page || !sessionId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Não rastrear pageviews do admin
      if (req.isAuthenticated() && req.user?.isAdmin) {
        console.log('🚫 Analytics: Pageview do admin ignorado');
        return res.json({ message: "Admin pageviews are not tracked" });
      }

      // Criar timestamp em horário brasileiro (UTC-3)
      const now = new Date();
      const brTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));

      const pageView = await storage.createPageView({
        page,
        sessionId,
        referrer: referrer || null,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        city: city || null,
        state: state || null,
        country: country || null,
        userId: req.isAuthenticated() ? req.user!.id : null,
        createdAt: brTime, // Usar o timestamp brasileiro
      });

      // Broadcast analytics update via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('analytics', 'pageview', { pageView });
      }

      res.json(pageView);
    } catch (error) {
      console.error('Error creating pageview:', error);
      res.status(500).json({ message: "Failed to create pageview" });
    }
  });

  // Track click
  app.post("/api/analytics/click", async (req, res) => {
    try {
      const { targetType, couponId, bannerId, targetName, targetUrl, sessionId } = req.body;

      if (!targetType || !targetName || !sessionId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Não rastrear cliques do admin
      if (req.isAuthenticated() && req.user?.isAdmin) {
        console.log('🚫 Analytics: Clique do admin ignorado');
        return res.json({ message: "Admin clicks are not tracked" });
      }

      const analyticsTarget = await storage.createOrGetAnalyticsTarget({
        targetType,
        couponId: couponId || null,
        bannerId: bannerId || null,
        targetName,
        targetUrl: targetUrl || null,
      });

      // Criar timestamp em horário brasileiro (UTC-3)
      const now = new Date();
      const brTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));

      const click = await storage.createBioClick({
        analyticsTargetId: analyticsTarget.id,
        sessionId,
        userId: req.isAuthenticated() ? req.user!.id : null,
        createdAt: brTime, // Usar o timestamp brasileiro
      });

      // Broadcast analytics update via WebSocket para todos os admins conectados
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('analytics', 'click', { 
          targetType,
          targetName,
          timestamp: brTime.toISOString() // Usar o timestamp brasileiro
        });
        console.log(`📊 Analytics click broadcast enviado via WebSocket: ${targetName} (${targetType})`);
      }

      res.json(click);
    } catch (error) {
      console.error('Error creating click:', error);
      res.status(500).json({ message: "Failed to create click" });
    }
  });

  // Get analytics stats (admin only)
  app.get("/api/analytics/stats", async (req, res) => {
    try {
      console.log('📊 Analytics stats request - Auth:', req.isAuthenticated(), 'Admin:', req.user?.isAdmin);

      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        console.log('❌ Analytics stats - Access denied');
        return res.status(403).json({ message: "Admin access required" });
      }

      const { startDate, endDate } = req.query;

      const stats = await storage.getAnalyticsStats(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(stats);
    } catch (error) {
      console.error('Error getting analytics stats:', error);
      res.status(500).json({ message: "Failed to get analytics stats" });
    }
  });

  // Alias endpoint for bio clicks (compatibility)
  app.post("/api/analytics/bio-click", async (req, res) => {
    try {
      const { targetType, targetId, targetName, targetUrl, sessionId } = req.body;

      if (!targetType || !targetName || !sessionId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const analyticsTarget = await storage.createOrGetAnalyticsTarget({
        targetType,
        couponId: targetType === 'coupon' ? targetId : null,
        bannerId: targetType === 'banner' ? targetId : null,
        targetName,
        targetUrl: targetUrl || null,
      });

      // Criar timestamp em horário brasileiro (UTC-3)
      const now = new Date();
      const brTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));

      const click = await storage.createBioClick({
        analyticsTargetId: analyticsTarget.id,
        sessionId,
        userId: req.isAuthenticated() ? req.user!.id : null,
        createdAt: brTime, // Usar o timestamp brasileiro
      });

      // Broadcast analytics update via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('analytics', 'click', { click, target: analyticsTarget });
      }

      res.json(click);
    } catch (error) {
      console.error('Error creating bio click:', error);
      res.status(500).json({ message: "Failed to create bio click" });
    }
  });

  // Get timeline detailed data (admin only)
  app.get("/api/analytics/timeline", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { startDate, endDate, targetType, targetId } = req.query;

      const timeline = await storage.getTimelineData(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        targetType as string | undefined,
        targetId as string | undefined
      );

      res.json(timeline);
    } catch (error) {
      console.error('Error getting timeline data:', error);
      res.status(500).json({ message: "Failed to get timeline data" });
    }
  });

  // Get bio clicks (admin only)
  app.get("/api/analytics/clicks", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { startDate, endDate } = req.query;

      const clicks = await storage.getBioClicks(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(clicks);
    } catch (error) {
      console.error('Error getting clicks:', error);
      res.status(500).json({ message: "Failed to get clicks" });
    }
  });

  // Clear analytics data (admin only - maintenance route)
  app.delete("/api/analytics/clear", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Limpar todas as tabelas de analytics usando uma transação
      await db.transaction(async (tx) => {
        // Ordem correta: primeiro os filhos, depois os pais (devido a foreign keys)
        await tx.execute(sql`TRUNCATE TABLE bio_clicks RESTART IDENTITY CASCADE`);
        await tx.execute(sql`TRUNCATE TABLE page_views RESTART IDENTITY CASCADE`);
        await tx.execute(sql`TRUNCATE TABLE analytics_targets RESTART IDENTITY CASCADE`);
      });

      console.log('✅ Analytics: Todas as tabelas de analytics foram limpas');

      // Broadcast analytics clear via WebSocket
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('analytics', 'clear', { cleared: true });
      }

      res.json({ 
        message: "Analytics data cleared successfully",
        cleared: ['bio_clicks', 'page_views', 'analytics_targets']
      });
    } catch (error) {
      console.error('Error clearing analytics data:', error);
      res.status(500).json({ message: "Failed to clear analytics data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}