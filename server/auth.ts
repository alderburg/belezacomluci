import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import * as missionTracker from './mission-tracker';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  if (!stored || !stored.includes('.')) {
    return false;
  }

  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false;
  }

  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

    // Ensure buffers have the same length before comparison
    if (hashedBuf.length !== suppliedBuf.length) {
      return false;
    }

    const match = timingSafeEqual(hashedBuf, suppliedBuf);
    return match;
  } catch (error) {
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);

        if (!user) {
          return done(null, false, { message: 'Email não encontrado' });
        }

        const passwordMatch = await comparePasswords(password, user.password);

        if (!passwordMatch) {
          return done(null, false, { message: 'Senha incorreta' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const { referralId, ...userData } = req.body;

      const user = await storage.createUser({
        ...userData,
        password: await hashPassword(userData.password),
      });

      // Processar referência se existir
      if (referralId) {
        try {
          // Verificar se o usuário que fez a indicação existe
          const referrer = await storage.getUser(referralId);
          if (referrer) {
            // Obter plano do usuário recém-cadastrado
            const newUserSubscription = await storage.getUserSubscription(user.id);
            const planType = newUserSubscription?.planType || 'free';

            // Criar o referral
            await storage.createReferral(referralId, user.id, planType);
            console.log(`Referral criado: ${referralId} indicou ${user.id} (plano: ${planType})`);
          }
        } catch (referralError) {
          console.error('Erro ao processar referência:', referralError);
          // Não falhar o cadastro por erro de referência
        }
      }

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Broadcast data update for new user
        const wsService = (global as any).notificationWS;
        if (wsService) {
          wsService.broadcastDataUpdate('users', 'created', user);
        }
        
        res.status(201).json(user);
      });
    } catch (error) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Erro interno do servidor" });
      }

      if (!user) {
        return res.status(401).json({ 
          error: info?.message || "Email ou senha incorretos" 
        });
      }

      req.login(user, async (err) => {
        if (err) {
          return res.status(500).json({ error: "Erro ao iniciar sessão" });
        }

        // Track daily login for missions
        try {
          await missionTracker.trackDailyLogin(user.id);
        } catch (trackingError) {
          console.error('Error tracking daily login:', trackingError);
          // Don't fail login if tracking fails
        }

        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Update profile route
  app.put("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { 
        name, 
        email, 
        cpf,
        gender, 
        age, 
        phone, 
        phoneType, 
        zipCode, 
        street, 
        number, 
        complement, 
        neighborhood, 
        city, 
        state, 
        socialNetworks 
      } = req.body;
      const userId = req.user!.id;

      console.log("Profile update request:", { 
        name, email, cpf: cpf ? "***.***.***-**" : null, gender, age, phone, phoneType, 
        zipCode, street, number, complement, neighborhood, city, state,
        socialNetworks, userId 
      });

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      // Validate age if provided
      let ageValue = null;
      if (age !== null && age !== undefined && age !== "") {
        ageValue = Number(age);
        if (isNaN(ageValue)) {
          return res.status(400).json({ message: "Invalid age value" });
        }
      }

      // Validate phoneType if phone is provided
      if (phone && phoneType && !['whatsapp', 'telegram', 'none'].includes(phoneType)) {
        return res.status(400).json({ message: "Invalid phone type. Must be 'whatsapp', 'telegram', or 'none'" });
      }

      // Validate social networks format
      if (socialNetworks && Array.isArray(socialNetworks)) {
        const validNetworks = ['instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'linkedin', 'pinterest', 'snapchat', 'whatsapp', 'telegram', 'email'];
        for (const network of socialNetworks) {
          if (!network.type || !network.url) {
            return res.status(400).json({ message: "Each social network must have a type and URL" });
          }
          if (!validNetworks.includes(network.type.toLowerCase())) {
            return res.status(400).json({ message: `Invalid social network type: ${network.type}` });
          }
          
          // Different validation for WhatsApp/Telegram (phone format) vs others (URL format)
          if (network.type.toLowerCase() === 'whatsapp' || network.type.toLowerCase() === 'telegram') {
            // Validate phone format: (xx) xxxxx-xxxx or (xx) xxxx-xxxx
            const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
            if (!phoneRegex.test(network.url)) {
              return res.status(400).json({ message: `Invalid phone format for ${network.type}: ${network.url}. Use format: (xx) xxxxx-xxxx` });
            }
          } else if (network.type.toLowerCase() === 'email') {
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(network.url)) {
              return res.status(400).json({ message: `Invalid email format: ${network.url}` });
            }
          } else {
            // URL validation for other social networks
            try {
              new URL(network.url);
            } catch {
              return res.status(400).json({ message: `Invalid URL for ${network.type}: ${network.url}` });
            }
          }
        }
      }

      const updateData: any = {
        name,
        email,
        cpf: cpf || null,
        gender: gender || null,
        age: ageValue,
        phone: phone || null,
        phoneType: phoneType || null,
        zipCode: zipCode || null,
        street: street || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
        socialNetworks: socialNetworks || []
      };

      // Include avatar if provided
      if (req.body.avatar) {
        console.log('Avatar base64 data received, size:', req.body.avatar.length);
        updateData.avatar = req.body.avatar;
      }

      console.log("Updating user with data:", updateData);

      await storage.updateUser(userId, updateData);

      // Log activity for profile update
      try {
        await storage.createActivity({
          userId: userId,
          action: "profile_updated",
          resourceType: "profile"
        });
        console.log("Profile update activity logged for user:", userId);
      } catch (activityError) {
        console.error("Failed to log profile update activity:", activityError);
        // Don't fail the request if activity logging fails
      }

      // Get updated user
      const updatedUser = await storage.getUser(userId);
      console.log("Profile updated successfully for user:", userId);
      
      // Broadcast data update for updated user
      const wsService = (global as any).notificationWS;
      if (wsService) {
        wsService.broadcastDataUpdate('users', 'updated', updatedUser);
        // Also broadcast user activity update since we created a new activity
        wsService.broadcastDataUpdate('user_activity', 'updated');
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile", error: error.message });
    }
  });

  // Endpoint para obter token JWT para WebSocket
  app.get("/api/auth/token", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        throw new Error('SESSION_SECRET not configured');
      }

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
      console.error("Error generating JWT token:", error);
      res.status(500).json({ error: "Failed to generate token", details: error.message });
    }
  });
}