import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertPassengerSchema, loginSchema, insertUserSchema, insertInsuranceSchema, insertTransportCompanySchema } from "@shared/schema";
import { z } from "zod";
import { sendPassengerNotificationToInsurance, sendWelcomeEmailToInsurance, sendVerificationCodeEmail, sendPasswordResetCodeEmail } from "./email";

const uploadsDir = path.resolve(process.cwd(), "uploads", "logos");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `logo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers PNG, JPG et JPEG sont acceptes"));
    }
  },
});

function getBaseUrl(req: Request): string {
  const customDomain = process.env.CUSTOM_DOMAIN;
  if (customDomain) return `https://${customDomain}`;
  const deploymentUrl = process.env.REPLIT_DEPLOYMENT_URL;
  if (deploymentUrl) return `https://${deploymentUrl}`;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) return `https://${devDomain}`;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host || "localhost:5000";
  return `${proto}://${host}`;
}

declare module "express-session" {
  interface SessionData {
    userId: number;
    role: string;
    insuranceId: number | null;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Non autorise" });
  }
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.role !== "super_admin") {
    return res.status(403).json({ message: "Acces interdit" });
  }
  next();
}

function requireInsuranceAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.role !== "insurance_admin") {
    return res.status(403).json({ message: "Acces interdit" });
  }
  next();
}

function requireSuperOrInsurance(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || (req.session.role !== "super_admin" && req.session.role !== "insurance_admin")) {
    return res.status(403).json({ message: "Acces interdit" });
  }
  next();
}

async function logAction(userId: number | undefined, userName: string, action: string, details?: string) {
  try {
    await storage.createActionLog({ userId: userId ?? null, userName, action, details: details ?? null });
  } catch (e) {
    console.error("Log action error:", e);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = connectPgSimple(session);

  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "secureflow-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  // ─── AUTH ────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsernameOrEmail(username);
      if (!user) {
        return res.status(401).json({ message: "Identifiants incorrects" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Identifiants incorrects" });
      }
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.insuranceId = user.insuranceId;

      const { password: _, ...safeUser } = user;

      let insuranceName: string | undefined;
      let insuranceLogo: string | undefined;
      if (user.insuranceId) {
        const ins = await storage.getInsuranceById(user.insuranceId);
        if (ins) {
          insuranceName = ins.name;
          insuranceLogo = ins.logo ?? undefined;
        }
      }

      res.json({ ...safeUser, insuranceName, insuranceLogo });
      logAction(user.id, user.fullName, "Connexion", JSON.stringify({ role: user.role }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Donnees invalides" });
      } else {
        console.error("Login error:", error);
        res.status(500).json({ message: "Erreur serveur" });
      }
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const genericResponse = { message: "Si un compte correspond, un code de reinitialisation sera envoye a son adresse email." };
    try {
      const identifier = z.string().min(1).parse(req.body.identifier);
      const user = await storage.getUserByUsernameOrEmail(identifier);
      if (!user || !user.email) return res.json(genericResponse);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      await storage.createVerificationCode(user.id, code);
      const sent = await sendPasswordResetCodeEmail(user.email, code, user.fullName);
      if (!sent) return res.status(500).json({ message: "Impossible d'envoyer le code pour le moment." });
      return res.json(genericResponse);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Identifiant requis" });
      console.error("Password reset request error:", error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const parsed = z.object({
        identifier: z.string().min(1),
        code: z.string().length(6),
        newPassword: z.string().min(6, "Le nouveau mot de passe doit avoir au moins 6 caracteres"),
      }).parse(req.body);
      const user = await storage.getUserByUsernameOrEmail(parsed.identifier);
      if (!user || !(await storage.verifyCode(user.id, parsed.code))) {
        return res.status(400).json({ message: "Code invalide ou expire." });
      }
      const hashedPassword = await bcrypt.hash(parsed.newPassword, 10);
      await storage.updateUser(user.id, { password: hashedPassword });
      return res.json({ message: "Mot de passe reinitialise avec succes. Vous pouvez vous connecter." });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Donnees invalides" });
      console.error("Password reset error:", error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erreur lors de la deconnexion" });
      }
      res.json({ message: "Deconnecte" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Non autorise" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Non autorise" });
    }

    req.session.role = user.role;
    req.session.insuranceId = user.insuranceId;

    const { password: _, ...safeUser } = user;

    let insuranceName: string | undefined;
    let insuranceLogo: string | undefined;
    if (user.insuranceId) {
      const ins = await storage.getInsuranceById(user.insuranceId);
      if (ins) {
        insuranceName = ins.name;
        insuranceLogo = ins.logo ?? undefined;
      }
    }
    res.json({ ...safeUser, insuranceName, insuranceLogo });
  });

  // ─── PROFILE / SETTINGS ──────────────────────────────────────
  const profileUpdateSchema = z.object({
    fullName: z.string().min(2, "Le nom doit avoir au moins 2 caracteres").optional(),
    username: z.string().min(3, "Le nom d'utilisateur doit avoir au moins 3 caracteres").optional(),
    email: z.string().email("Email invalide").or(z.literal("")).optional(),
  });

  const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(6, "Le nouveau mot de passe doit avoir au moins 6 caracteres"),
  });

  const verifyPasswordSchema = z.object({
    code: z.string().length(6, "Code a 6 chiffres requis"),
    newPassword: z.string().min(6, "Le nouveau mot de passe doit avoir au moins 6 caracteres"),
  });

  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const parsed = profileUpdateSchema.parse(req.body);
      const { fullName, email, username } = parsed;
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ message: "Utilisateur non trouve" });

      if (username && username !== user.username) {
        const existing = await storage.getUserByUsername(username);
        if (existing) return res.status(400).json({ message: "Ce nom d'utilisateur existe deja" });
      }
      if (email && email !== user.email) {
        const existing = await storage.getUserByEmail(email);
        if (existing) return res.status(400).json({ message: "Cet email existe deja" });
      }

      const updateData: Record<string, string> = {};
      if (fullName) updateData.fullName = fullName;
      if (email !== undefined) updateData.email = email;
      if (username) updateData.username = username;

      const updated = await storage.updateUser(userId, updateData);
      if (!updated) return res.status(500).json({ message: "Erreur de mise a jour" });

      const { password: _, ...safeUser } = updated;
      let insuranceName: string | undefined;
      let insuranceLogo: string | undefined;
      if (updated.insuranceId) {
        const ins = await storage.getInsuranceById(updated.insuranceId);
        if (ins) { insuranceName = ins.name; insuranceLogo = ins.logo ?? undefined; }
      }
      res.json({ ...safeUser, insuranceName, insuranceLogo });
      logAction(userId, updated.fullName, "Modification profil", JSON.stringify(updateData));
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Donnees invalides", errors: error.errors });
      } else {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Erreur serveur" });
      }
    }
  });

  app.post("/api/profile/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = passwordChangeSchema.parse(req.body);
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ message: "Utilisateur non trouve" });

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ message: "Mot de passe actuel incorrect" });

      if (!user.email) {
        return res.status(400).json({ message: "Aucun email associe a votre compte. Veuillez d'abord ajouter un email dans votre profil." });
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await storage.createVerificationCode(userId, code);
      const sent = await sendVerificationCodeEmail(user.email, code, user.fullName);
      if (!sent) {
        return res.status(500).json({ message: "Erreur d'envoi du code de verification" });
      }
      return res.json({ requiresVerification: true, message: "Un code de verification a ete envoye a votre email" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Donnees invalides", errors: error.errors });
      } else {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Erreur serveur" });
      }
    }
  });

  app.post("/api/profile/verify-password-change", requireAuth, async (req, res) => {
    try {
      const { code, newPassword } = verifyPasswordSchema.parse(req.body);
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ message: "Utilisateur non trouve" });

      const isValid = await storage.verifyCode(userId, code);
      if (!isValid) {
        return res.status(400).json({ message: "Code invalide ou expire" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { password: hashedPassword });
      res.json({ message: "Mot de passe modifie avec succes" });
      logAction(userId, user.fullName, "Changement mot de passe (verifie)", "");
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Donnees invalides", errors: error.errors });
      } else {
        console.error("Error verifying password change:", error);
        res.status(500).json({ message: "Erreur serveur" });
      }
    }
  });

  // ─── TRANSPORT COMPANIES (public for agents) ────────────────
  app.get("/api/transport-companies", requireAuth, async (_req, res) => {
    try {
      const companies = await storage.getActiveTransportCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── PASSENGERS ─────────────────────────────────────────────
  app.post("/api/passengers", requireAuth, async (req, res) => {
    try {
      const data = insertPassengerSchema.parse(req.body);
      const user = await storage.getUserById(req.session.userId!);
      if (!user || !user.insuranceId) {
        return res.status(400).json({ message: "Agent non associe a une assurance" });
      }
      const insurance = await storage.getInsuranceById(user.insuranceId);
      if (!insurance) {
        return res.status(400).json({ message: "Assurance introuvable" });
      }
      const commission = insurance.commissionPerPassenger;
      const premium = data.price || insurance.defaultPremium || 500;
      const dureeHeures = insurance.dureeValiditeHeures || 24;
      const passenger = await storage.createPassenger(data, user.id, insurance.id, commission, premium, dureeHeures);
      res.status(201).json(passenger);

      logAction(user.id, user.fullName, "Enregistrement passager", JSON.stringify({
        passengerId: passenger.id,
        passengerName: passenger.fullName,
        insurance: insurance.name,
        destination: passenger.destination,
      }));

      if (insurance.email) {
        const baseUrl = getBaseUrl(req);
        const verifyUrl = `${baseUrl}/verify/${passenger.id}`;
        sendPassengerNotificationToInsurance(passenger, insurance.email, insurance.name, user.fullName, verifyUrl);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Donnees invalides", errors: error.errors });
      } else {
        console.error("Error creating passenger:", error);
        res.status(500).json({ message: "Erreur serveur" });
      }
    }
  });

  app.get("/api/passengers", requireSuperAdmin, async (_req, res) => {
    try {
      const list = await storage.getAllPassengers();
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/passengers/recent", requireAuth, async (req, res) => {
    try {
      if (req.session.role === "super_admin") {
        const list = await storage.getRecentPassengers(20);
        res.json(list);
      } else if (req.session.role === "insurance_admin" && req.session.insuranceId) {
        const list = await storage.getPassengersByInsurance(req.session.insuranceId);
        res.json(list.slice(0, 20));
      } else {
        const list = await storage.getPassengersByAgent(req.session.userId!);
        res.json(list.slice(0, 20));
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── PUBLIC VERIFY ──────────────────────────────────────────
  app.get("/api/verify/:identifier", async (req, res) => {
    try {
      let identifier = req.params.identifier as string;
      if (identifier.startsWith("SF-")) {
        identifier = String(parseInt(identifier.replace("SF-", ""), 10));
      }
      let passenger;
      const id = parseInt(identifier);
      if (!isNaN(id)) {
        passenger = await storage.getPassenger(id);
      }
      if (!passenger) {
        passenger = await storage.getPassengerByQrCode(identifier);
      }
      if (!passenger) {
        return res.status(404).json({ message: "Aucune police d'assurance trouvee" });
      }

      let insuranceName: string | undefined;
      let insuranceLegal: Record<string, any> = {};
      if (passenger.insuranceId) {
        const ins = await storage.getInsuranceById(passenger.insuranceId);
        if (ins) {
          insuranceName = ins.name;
          insuranceLegal = {
            insuranceLogo: ins.logo,
            raisonSociale: ins.raisonSociale,
            formeJuridique: ins.formeJuridique,
            capitalSocial: ins.capitalSocial,
            siegeSocial: ins.siegeSocial,
            insuranceTelephone: ins.telephone,
            insuranceEmail: ins.email,
            siteWeb: ins.siteWeb,
            numeroAgrementCima: ins.numeroAgrementCima,
            numeroIfu: ins.numeroIfu,
            garantieDeces: ins.garantieDeces,
            garantieInvalidite: ins.garantieInvalidite,
            garantieFraisMedicaux: ins.garantieFraisMedicaux,
            garantieRapatriement: ins.garantieRapatriement,
            dureeValidite: ins.dureeValidite,
            franchise: ins.franchise,
            hotlineSinistres: ins.hotlineSinistres,
            emailSinistres: ins.emailSinistres,
            emailReclamations: ins.emailReclamations,
            urlDeclarationSinistre: ins.urlDeclarationSinistre,
            urlConditionsGenerales: ins.urlConditionsGenerales,
            documentsRequis: ins.documentsRequis,
            exclusionsPrincipales: ins.exclusionsPrincipales,
            typePolice: ins.typePolice,
            souscripteur: ins.souscripteur,
          };
        }
      }

      let agentName: string | undefined;
      if (passenger.agentId) {
        const agent = await storage.getUserById(passenger.agentId);
        if (agent) agentName = agent.fullName;
      }

      res.json({
        id: passenger.id,
        policyNumber: `SF-${String(passenger.id).padStart(6, "0")}`,
        fullName: passenger.fullName,
        phone: passenger.phone,
        email: passenger.email,
        emergencyContactName: passenger.emergencyContactName,
        emergencyContactPhone: passenger.emergencyContactPhone,
        documentType: passenger.documentType,
        documentNumber: passenger.documentNumber,
        insuranceCompany: insuranceName || "Non assigne",
        departure: passenger.departure,
        destination: passenger.destination,
        company: passenger.company,
        busNumber: passenger.busNumber,
        travelDate: passenger.travelDate,
        travelTime: passenger.travelTime,
        price: passenger.price,
        qrCode: passenger.qrCode,
        status: passenger.status,
        statutAssurance: passenger.statutAssurance,
        dateExpiration: passenger.dateExpiration,
        agentName,
        coverageStart: passenger.createdAt,
        coverageEnd: passenger.dateExpiration || passenger.createdAt,
        createdAt: passenger.createdAt,
        ...insuranceLegal,
      });
    } catch (error) {
      console.error("Error fetching passenger for verify:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── TICKET DOWNLOAD ──────────────────────────────────────────
  app.get("/api/passengers/:id/ticket", requireAuth, async (req, res) => {
    try {
      const passengerId = parseInt(req.params.id as string);
      const passenger = await storage.getPassenger(passengerId);
      if (!passenger) return res.status(404).json({ message: "Passager non trouve" });

      if (req.session.role === "agent" && passenger.agentId !== req.session.userId) {
        return res.status(403).json({ message: "Acces refuse" });
      }
      if (req.session.role === "insurance_admin" && passenger.insuranceId !== req.session.insuranceId) {
        return res.status(403).json({ message: "Acces refuse" });
      }

      let insuranceData: any = null;
      let insuranceLogo: string | null = null;
      if (passenger.insuranceId) {
        const ins = await storage.getInsuranceById(passenger.insuranceId);
        if (ins) {
          insuranceData = ins;
          insuranceLogo = ins.logo;
          (passenger as any).insuranceName = ins.name;
        }
      }

      const proto = req.headers["x-forwarded-proto"];
      const protocol = Array.isArray(proto) ? proto[0] : (proto || "https");
      const host = req.headers.host || "secureflow.bj";
      const verifyUrl = `${protocol}://${host}/verify/${passenger.id}`;

      const { generateTicketPDF } = await import("./pdf");
      const pdfBuffer = await generateTicketPDF(passenger, verifyUrl, insuranceLogo, insuranceData);

      const policyNumber = `SF-${String(passenger.id).padStart(6, "0")}`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Ticket_${policyNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating ticket PDF:", error);
      res.status(500).json({ message: "Erreur generation du ticket" });
    }
  });

  // ─── AGENT ROUTES ──────────────────────────────────────────
  app.get("/api/agent/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getAgentStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/agent/passengers", requireAuth, async (req, res) => {
    try {
      const list = await storage.getPassengersByAgent(req.session.userId!);
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── INSURANCE ADMIN: THEIR PASSENGERS ─────────────────────
  app.get("/api/insurance/passengers", requireInsuranceAdmin, async (req, res) => {
    try {
      const list = await storage.getPassengersByInsurance(req.session.insuranceId!);
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/insurance/passengers/:id/status", requireInsuranceAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { status } = req.body;
      if (!["en_attente", "contrat_cree", "valide"].includes(status)) {
        return res.status(400).json({ message: "Statut invalide" });
      }
      const passenger = await storage.getPassenger(id);
      if (!passenger || passenger.insuranceId !== req.session.insuranceId) {
        return res.status(404).json({ message: "Passager non trouve" });
      }
      const updated = await storage.updatePassengerStatus(id, status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/insurance/stats", requireInsuranceAdmin, async (req, res) => {
    try {
      const stats = await storage.getInsuranceStats(req.session.insuranceId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/insurance/stats/monthly", requireInsuranceAdmin, async (req, res) => {
    try {
      const months = parseInt(req.query.months as string) || 6;
      const data = await storage.getInsuranceMonthlyRevenue(req.session.insuranceId!, months);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/insurance/stats/daily", requireInsuranceAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await storage.getDailyPassengerCounts(days, req.session.insuranceId!);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/insurance/stats/top-agents", requireInsuranceAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const data = await storage.getInsuranceTopAgents(req.session.insuranceId!, limit);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/insurance/stats/transport-distribution", requireInsuranceAdmin, async (req, res) => {
    try {
      const data = await storage.getInsuranceTransportDistribution(req.session.insuranceId!);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/insurance/stats/top-destinations", requireInsuranceAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const data = await storage.getInsuranceTopDestinations(req.session.insuranceId!, limit);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── INSURANCE ADMIN: THEIR AGENTS ─────────────────────────
  app.get("/api/insurance/agents", requireInsuranceAdmin, async (req, res) => {
    try {
      const agents = await storage.getAgentsByInsuranceId(req.session.insuranceId!);
      const safeAgents = agents.map(({ password: _, ...a }) => a);
      res.json(safeAgents);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/insurance/agents", requireInsuranceAdmin, async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByUsername(data.username);
      if (existing) {
        return res.status(400).json({ message: "Ce nom d'utilisateur existe deja" });
      }
      if (data.email) {
        const existingEmail = await storage.getUserByEmail(data.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Cet email existe deja" });
        }
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
        role: "agent",
        insuranceId: req.session.insuranceId!,
      });
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);

      const currentUser = await storage.getUserById(req.session.userId!);
      logAction(req.session.userId, currentUser?.fullName || "Assurance", "Ajout agent", JSON.stringify({ agentName: user.fullName }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Donnees invalides", errors: error.errors });
      } else {
        console.error("Error creating agent:", error);
        res.status(500).json({ message: "Erreur serveur" });
      }
    }
  });

  app.delete("/api/insurance/agents/:id", requireInsuranceAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const agent = await storage.getUserById(id);
      if (!agent || agent.insuranceId !== req.session.insuranceId) {
        return res.status(404).json({ message: "Agent non trouve" });
      }
      await storage.deleteUser(id);
      res.json({ message: "Agent supprime" });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── SUPER ADMIN: INSURANCES ────────────────────────────────
  app.get("/api/admin/insurances", requireSuperAdmin, async (_req, res) => {
    try {
      const list = await storage.getAllInsurances();
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/admin/insurances", requireSuperAdmin, uploadLogo.single("logo"), async (req, res) => {
    try {
      const body = req.body;
      const logoPath = req.file ? `/uploads/logos/${req.file.filename}` : (body.logo || null);
      const insuranceData = insertInsuranceSchema.parse({
        name: body.name,
        email: body.email,
        logo: logoPath,
        commissionPerPassenger: body.commissionPerPassenger ? parseInt(body.commissionPerPassenger) : 50,
        status: body.status || "active",
      });

      const insurance = await storage.createInsurance(insuranceData);

      if (body.adminUsername && body.adminPassword) {
        const hashedPassword = await bcrypt.hash(body.adminPassword, 10);
        await storage.createUser({
          username: body.adminUsername,
          password: hashedPassword,
          fullName: body.name,
          email: body.email,
          role: "insurance_admin",
          insuranceId: insurance.id,
          photo: null,
        });
      }

      res.status(201).json(insurance);
      logAction(req.session.userId, "Super Admin", "Ajout assurance", JSON.stringify({ insuranceName: insurance.name }));

      if (body.email && body.adminUsername && body.adminPassword) {
        const dashboardUrl = getBaseUrl(req);
        sendWelcomeEmailToInsurance(insurance.name, body.email, body.adminUsername, body.adminPassword, dashboardUrl);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Donnees invalides", errors: error.errors });
      } else {
        const errMsg = (error as any)?.message || "";
        const errDetail = (error as any)?.detail || "";
        if (errMsg.includes("unique") || errMsg.includes("duplicate") || errDetail.includes("unique") || errDetail.includes("duplicate") || errDetail.includes("already exists")) {
          if (errDetail.includes("username")) {
            res.status(409).json({ message: "Ce nom d'utilisateur existe deja. Choisissez un autre nom d'utilisateur pour l'admin." });
          } else if (errDetail.includes("name")) {
            res.status(409).json({ message: "Une assurance avec ce nom existe deja." });
          } else {
            res.status(409).json({ message: "Un enregistrement avec ces informations existe deja." });
          }
        } else {
          console.error("Error creating insurance:", error);
          res.status(500).json({ message: "Erreur serveur" });
        }
      }
    }
  });

  app.patch("/api/admin/insurances/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const updateData = insertInsuranceSchema.partial().parse(req.body);
      const insurance = await storage.updateInsurance(id, updateData);
      if (!insurance) {
        return res.status(404).json({ message: "Assurance non trouvee" });
      }
      res.json(insurance);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/upload/logo", requireAuth, uploadLogo.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier selectionne" });
      }
      const logoPath = `/uploads/logos/${req.file.filename}`;
      res.json({ logoPath });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Erreur lors de l'upload" });
    }
  });

  app.get("/api/insurance/legal-info", requireInsuranceAdmin, async (req, res) => {
    try {
      const insurance = await storage.getInsuranceById(req.session.insuranceId!);
      if (!insurance) return res.status(404).json({ message: "Assurance non trouvee" });
      res.json(insurance);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/insurance/legal-info", requireInsuranceAdmin, async (req, res) => {
    try {
      const allowedFields = [
        "raisonSociale", "formeJuridique", "capitalSocial", "siegeSocial", "telephone",
        "siteWeb", "numeroAgrementCima", "numeroIfu", "garantieDeces", "garantieInvalidite",
        "garantieFraisMedicaux", "garantieRapatriement", "dureeValidite", "franchise",
        "hotlineSinistres", "emailSinistres", "emailReclamations", "urlDeclarationSinistre",
        "urlConditionsGenerales", "documentsRequis", "exclusionsPrincipales", "typePolice", "souscripteur",
      ];
      const updateData: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          updateData[key] = req.body[key];
        }
      }
      const insurance = await storage.updateInsurance(req.session.insuranceId!, updateData);
      if (!insurance) return res.status(404).json({ message: "Assurance non trouvee" });
      res.json(insurance);
      const user = await storage.getUserById(req.session.userId!);
      logAction(req.session.userId, user?.fullName || "Admin", "Mise a jour informations legales", `Champs mis a jour: ${Object.keys(updateData).join(", ")}`);
    } catch (error) {
      console.error("Error updating legal info:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/insurance/logo", requireInsuranceAdmin, uploadLogo.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier selectionne" });
      }
      const logoPath = `/uploads/logos/${req.file.filename}`;
      const insurance = await storage.updateInsurance(req.session.insuranceId!, { logo: logoPath });
      res.json(insurance);
      const user = await storage.getUserById(req.session.userId!);
      logAction(req.session.userId, user?.fullName || "Admin", "Modification logo assurance", `Logo mis a jour: ${logoPath}`);
    } catch (error) {
      console.error("Error updating insurance logo:", error);
      res.status(500).json({ message: "Erreur lors de la mise a jour du logo" });
    }
  });

  app.delete("/api/admin/insurances/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteInsurance(id);
      res.json({ message: "Assurance supprimee" });
      logAction(req.session.userId, "Super Admin", "Suppression assurance", JSON.stringify({ insuranceId: id }));
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/admin/reset-data", requireSuperAdmin, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Identifiant et mot de passe requis pour confirmer la reinitialisation" });
      }
      const admin = await storage.getUserByUsername(username);
      if (!admin || admin.role !== "super_admin") {
        return res.status(403).json({ message: "Identifiant administrateur invalide" });
      }
      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        return res.status(403).json({ message: "Mot de passe administrateur incorrect" });
      }
      await storage.resetAllData();
      res.json({ message: "Systeme reinitialise avec succes. Toutes les donnees ont ete supprimees." });
      logAction(req.session.userId, admin.fullName, "Reinitialisation complete du systeme", "Tous les passagers, agents, assurances, logs et factures supprimes. Donnees de base restaurees.");
    } catch (error) {
      console.error("Error resetting data:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/export-all", requireSuperAdmin, async (req, res) => {
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      workbook.creator = "SecureFlow";
      workbook.created = new Date();

      const headerStyle = { font: { bold: true, color: { argb: "FFFFFFFF" } as any, size: 11 }, fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1A5276" } }, alignment: { horizontal: "center" as const, vertical: "middle" as const } };

      const allPassengers = await storage.getReportPassengers("2000-01-01", "2099-12-31");
      const pSheet = workbook.addWorksheet("Passagers");
      pSheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "N. Police", key: "police", width: 14 },
        { header: "Nom complet", key: "fullName", width: 25 },
        { header: "Telephone", key: "phone", width: 16 },
        { header: "Email", key: "email", width: 25 },
        { header: "Contact urgence", key: "emergencyName", width: 20 },
        { header: "Tel. urgence", key: "emergencyPhone", width: 16 },
        { header: "Type document", key: "docType", width: 16 },
        { header: "N. document", key: "docNumber", width: 18 },
        { header: "Assurance", key: "insurance", width: 25 },
        { header: "Agent", key: "agent", width: 20 },
        { header: "Depart", key: "departure", width: 16 },
        { header: "Destination", key: "destination", width: 16 },
        { header: "Compagnie", key: "company", width: 20 },
        { header: "N. Bus", key: "busNumber", width: 12 },
        { header: "Date voyage", key: "travelDate", width: 14 },
        { header: "Heure depart", key: "travelTime", width: 14 },
        { header: "Prime (FCFA)", key: "price", width: 14 },
        { header: "Commission (FCFA)", key: "commission", width: 16 },
        { header: "Statut", key: "status", width: 14 },
        { header: "QR Code", key: "qrCode", width: 20 },
        { header: "Date creation", key: "createdAt", width: 20 },
      ];
      const pHeader = pSheet.getRow(1);
      pHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      pHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5276" } };
      pHeader.height = 24;
      allPassengers.forEach((p) => {
        pSheet.addRow({
          id: p.id, police: `SF-${String(p.id).padStart(4, "0")}`, fullName: p.fullName, phone: p.phone,
          email: p.email || "", emergencyName: p.emergencyContactName || "", emergencyPhone: p.emergencyContactPhone || "",
          docType: p.documentType || "", docNumber: p.documentNumber || "", insurance: p.insuranceName || "",
          agent: p.agentName || "", departure: (p as any).departure || "", destination: p.destination, company: p.company, busNumber: p.busNumber || "",
          travelDate: p.travelDate, travelTime: p.travelTime, price: p.price || 500,
          commission: p.commissionGenerated || 0, status: p.status, qrCode: p.qrCode || "",
          createdAt: p.createdAt ? new Date(p.createdAt).toLocaleString("fr-FR") : "",
        });
      });

      const allInsurances = await storage.getAllInsurances();
      const iSheet = workbook.addWorksheet("Assurances");
      iSheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Nom", key: "name", width: 30 },
        { header: "Email", key: "email", width: 30 },
        { header: "Commission/passager", key: "commission", width: 18 },
        { header: "Statut", key: "status", width: 14 },
        { header: "Date creation", key: "createdAt", width: 20 },
      ];
      const iHeader = iSheet.getRow(1);
      iHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      iHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5276" } };
      iHeader.height = 24;
      allInsurances.forEach((ins) => {
        iSheet.addRow({ id: ins.id, name: ins.name, email: ins.email || "", commission: ins.commissionPerPassenger, status: ins.status, createdAt: ins.createdAt ? new Date(ins.createdAt).toLocaleString("fr-FR") : "" });
      });

      const allAgents = await storage.getAllAgents();
      const aSheet = workbook.addWorksheet("Agents");
      aSheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Nom complet", key: "fullName", width: 25 },
        { header: "Identifiant", key: "username", width: 20 },
        { header: "Email", key: "email", width: 30 },
        { header: "Role", key: "role", width: 18 },
        { header: "Assurance ID", key: "insuranceId", width: 14 },
        { header: "Date creation", key: "createdAt", width: 20 },
      ];
      const aHeader = aSheet.getRow(1);
      aHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      aHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5276" } };
      aHeader.height = 24;
      allAgents.forEach((ag) => {
        aSheet.addRow({ id: ag.id, fullName: ag.fullName, username: ag.username, email: ag.email || "", role: ag.role, insuranceId: ag.insuranceId, createdAt: ag.createdAt ? new Date(ag.createdAt).toLocaleString("fr-FR") : "" });
      });

      const allTransport = await storage.getAllTransportCompanies();
      const tSheet = workbook.addWorksheet("Compagnies Transport");
      tSheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Nom", key: "name", width: 30 },
        { header: "Contact", key: "contact", width: 25 },
        { header: "Telephone", key: "phone", width: 16 },
        { header: "Email", key: "email", width: 30 },
        { header: "Statut", key: "status", width: 14 },
        { header: "Date creation", key: "createdAt", width: 20 },
      ];
      const tHeader = tSheet.getRow(1);
      tHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      tHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5276" } };
      tHeader.height = 24;
      allTransport.forEach((tc) => {
        tSheet.addRow({ id: tc.id, name: tc.name, contact: tc.contact || "", phone: tc.phone || "", email: tc.email || "", status: tc.status, createdAt: tc.createdAt ? new Date(tc.createdAt).toLocaleString("fr-FR") : "" });
      });

      const today = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="SecureFlow_Export_Complet_${today}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting all data:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── SUPER ADMIN: TRANSPORT COMPANIES ───────────────────────
  app.get("/api/admin/transport-companies", requireSuperAdmin, async (_req, res) => {
    try {
      const list = await storage.getAllTransportCompanies();
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/admin/transport-companies", requireSuperAdmin, async (req, res) => {
    try {
      const data = insertTransportCompanySchema.parse(req.body);
      const tc = await storage.createTransportCompany(data);
      res.status(201).json(tc);
      logAction(req.session.userId, "Super Admin", "Ajout compagnie transport", JSON.stringify({ name: tc.name }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Donnees invalides", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erreur serveur" });
      }
    }
  });

  app.patch("/api/admin/transport-companies/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const updateData = insertTransportCompanySchema.partial().parse(req.body);
      const tc = await storage.updateTransportCompany(id, updateData);
      if (!tc) {
        return res.status(404).json({ message: "Compagnie non trouvee" });
      }
      res.json(tc);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.delete("/api/admin/transport-companies/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteTransportCompany(id);
      res.json({ message: "Compagnie supprimee" });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── SUPER ADMIN: AGENTS (all agents) ──────────────────────
  app.get("/api/admin/agents", requireSuperAdmin, async (_req, res) => {
    try {
      const agents = await storage.getAllAgents();
      const safeAgents = agents.map(({ password: _, ...a }) => a);
      res.json(safeAgents);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── SUPER ADMIN: GLOBAL STATS ─────────────────────────────
  app.get("/api/admin/stats", requireSuperAdmin, async (_req, res) => {
    try {
      const stats = await storage.getGlobalStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/stats/by-company", requireSuperAdmin, async (_req, res) => {
    try {
      const stats = await storage.getStatsByCompany();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/stats/by-destination", requireSuperAdmin, async (_req, res) => {
    try {
      const stats = await storage.getStatsByDestination();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/stats/by-insurance", requireSuperAdmin, async (_req, res) => {
    try {
      const stats = await storage.getStatsByInsurance();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/stats/top-agents", requireSuperAdmin, async (_req, res) => {
    try {
      const agents = await storage.getTopAgents(5);
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/stats/monthly", requireSuperAdmin, async (_req, res) => {
    try {
      const data = await storage.getMonthlyPassengerCounts(6);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/stats/daily", requireSuperAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await storage.getDailyPassengerCounts(days);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/stats/insurance-distribution", requireSuperAdmin, async (_req, res) => {
    try {
      const data = await storage.getPassengersByInsuranceDistribution();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/stats/monthly-history", requireSuperAdmin, async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const data = await storage.getMonthlyHistory(year);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/insurance/stats/monthly-history", requireInsuranceAdmin, async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const data = await storage.getMonthlyHistory(year, req.session.insuranceId!);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── SUPER ADMIN: ACTION LOGS ──────────────────────────────
  app.get("/api/admin/logs", requireSuperAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const logs = await storage.getActionLogs(limit, offset);
      const total = await storage.getActionLogCount();
      res.json({ logs, total, page, limit });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── SUPER ADMIN: REVENUE & INVOICING ──────────────────────
  app.get("/api/admin/revenue", requireSuperAdmin, async (req, res) => {
    try {
      const start = req.query.start as string || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      const end = req.query.end as string || new Date().toISOString().split("T")[0];
      const data = await storage.getRevenueByInsurance(start, end);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/admin/invoices", requireSuperAdmin, async (req, res) => {
    try {
      const invoice = await storage.createInvoice(req.body);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/invoices", requireSuperAdmin, async (_req, res) => {
    try {
      const list = await storage.getAllInvoices();
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/invoices/:id/status", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { status } = req.body;
      const invoice = await storage.updateInvoiceStatus(id, status);
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── SUPER ADMIN: UPDATE OWN SETTINGS ──────────────────────
  app.patch("/api/admin/settings", requireSuperAdmin, async (req, res) => {
    try {
      const { email, password, fullName } = req.body;
      const updateData: any = {};
      if (email) updateData.email = email;
      if (fullName) updateData.fullName = fullName;
      if (password) updateData.password = await bcrypt.hash(password, 10);
      const user = await storage.updateUser(req.session.userId!, updateData);
      if (!user) return res.status(404).json({ message: "Utilisateur non trouve" });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── REPORTS: DATA & DOWNLOADS ─────────────────────────────
  app.get("/api/reports/data", requireAuth, async (req, res) => {
    try {
      const start = req.query.start as string || new Date().toISOString().split("T")[0];
      const end = req.query.end as string || start;
      const insuranceIdParam = req.query.insuranceId as string | undefined;

      let insuranceId: number | undefined;
      if (req.session.role === "insurance_admin") {
        insuranceId = req.session.insuranceId!;
      } else if (req.session.role === "super_admin" && insuranceIdParam) {
        insuranceId = parseInt(insuranceIdParam);
      } else if (req.session.role === "agent") {
        return res.status(403).json({ message: "Acces refuse" });
      }

      const passengersList = await storage.getReportPassengers(start, end, insuranceId);
      let insurancesList;
      if (req.session.role === "insurance_admin") {
        const own = await storage.getInsuranceById(req.session.insuranceId!);
        insurancesList = own ? [own] : [];
      } else {
        insurancesList = await storage.getAllInsurances();
      }
      res.json({ passengers: passengersList, insurances: insurancesList });
    } catch (error) {
      console.error("Error fetching report data:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/reports/download", requireAuth, async (req, res) => {
    try {
      const start = req.query.start as string || new Date().toISOString().split("T")[0];
      const end = req.query.end as string || start;
      const format = req.query.format as string || "pdf";
      const insuranceIdParam = req.query.insuranceId as string | undefined;

      let insuranceId: number | undefined;
      let insuranceName = "Toutes assurances";
      if (req.session.role === "insurance_admin") {
        insuranceId = req.session.insuranceId!;
        const ins = await storage.getInsuranceById(insuranceId);
        if (ins) insuranceName = ins.name;
      } else if (req.session.role === "super_admin" && insuranceIdParam) {
        insuranceId = parseInt(insuranceIdParam);
        const ins = await storage.getInsuranceById(insuranceId);
        if (ins) insuranceName = ins.name;
      } else if (req.session.role === "agent") {
        return res.status(403).json({ message: "Acces refuse" });
      }

      const passengersList = await storage.getReportPassengers(start, end, insuranceId);
      const safeName = insuranceName.replace(/[^a-zA-Z0-9_\-]/g, "_");
      const filename = `SecureFlow_Rapport_${safeName}_${start}_${end}`;

      if (format === "excel") {
        const ExcelJS = await import("exceljs");
        const workbook = new ExcelJS.default.Workbook();
        workbook.creator = "SecureFlow";
        workbook.created = new Date();
        const sheet = workbook.addWorksheet("Rapport");

        sheet.columns = [
          { header: "N. Police", key: "police", width: 14 },
          { header: "Nom complet", key: "fullName", width: 25 },
          { header: "Telephone", key: "phone", width: 16 },
          { header: "Email", key: "email", width: 25 },
          { header: "Contact urgence", key: "emergencyName", width: 20 },
          { header: "Tel. urgence", key: "emergencyPhone", width: 16 },
          { header: "Type document", key: "docType", width: 16 },
          { header: "N. document", key: "docNumber", width: 18 },
          { header: "Assurance", key: "insurance", width: 25 },
          { header: "Agent", key: "agent", width: 20 },
          { header: "Depart", key: "departure", width: 16 },
          { header: "Destination", key: "destination", width: 16 },
          { header: "Compagnie", key: "company", width: 20 },
          { header: "N. Bus", key: "busNumber", width: 12 },
          { header: "Date voyage", key: "travelDate", width: 14 },
          { header: "Heure depart", key: "travelTime", width: 14 },
          { header: "Prime (FCFA)", key: "price", width: 14 },
          { header: "Commission (FCFA)", key: "commission", width: 16 },
          { header: "Statut", key: "status", width: 14 },
        ];

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5276" } };
        headerRow.alignment = { horizontal: "center", vertical: "middle" };
        headerRow.height = 24;

        const statusLabels: Record<string, string> = { en_attente: "En attente", contrat_cree: "Contrat cree", valide: "Valide" };

        passengersList.forEach((p, idx) => {
          const row = sheet.addRow({
            police: `SF-${String(p.id).padStart(4, "0")}`,
            fullName: p.fullName,
            phone: p.phone,
            email: p.email || "-",
            emergencyName: p.emergencyContactName || "-",
            emergencyPhone: p.emergencyContactPhone || "-",
            docType: p.documentType || "-",
            docNumber: p.documentNumber || "-",
            insurance: p.insuranceName || "-",
            agent: p.agentName || "-",
            departure: (p as any).departure || "-",
            destination: p.destination,
            company: p.company,
            busNumber: p.busNumber || "-",
            travelDate: p.travelDate,
            travelTime: p.travelTime,
            price: p.price || 500,
            commission: p.commissionGenerated || 0,
            status: statusLabels[p.status] || p.status,
          });
          if (idx % 2 === 1) {
            row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F3F4" } };
          }
          row.alignment = { vertical: "middle" };
        });

        const totalPrice = passengersList.reduce((s, p) => s + (p.price || 500), 0);
        const totalCommission = passengersList.reduce((s, p) => s + (p.commissionGenerated || 0), 0);

        sheet.addRow({});
        const summaryHeaderRow = sheet.addRow({ police: "RESUME DU RAPPORT" });
        summaryHeaderRow.font = { bold: true, size: 12 };
        sheet.addRow({ police: "Assurance:", fullName: insuranceName });
        sheet.addRow({ police: "Periode:", fullName: `${start} au ${end}` });
        sheet.addRow({ police: "Total passagers:", fullName: String(passengersList.length) });
        sheet.addRow({ police: "Total primes (FCFA):", fullName: totalPrice.toLocaleString("fr-FR") });
        sheet.addRow({ police: "Total commissions (FCFA):", fullName: totalCommission.toLocaleString("fr-FR") });

        sheet.autoFilter = { from: "A1", to: `R${passengersList.length + 1}` };

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
      } else {
        const PDFDocument = (await import("pdfkit")).default;
        const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30, bufferPages: true });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
        doc.pipe(res);

        const pageW = doc.page.width - 60;
        const statusLabels: Record<string, string> = { en_attente: "En attente", contrat_cree: "Contrat cree", valide: "Valide" };

        doc.rect(0, 0, doc.page.width, 70).fill("#1A5276");
        doc.fill("#FFFFFF").fontSize(18).font("Helvetica-Bold").text("SecureFlow - Rapport d'Assurance Transport", 30, 18, { width: pageW });
        doc.fontSize(10).font("Helvetica").text(`${insuranceName}  |  Periode: ${start} au ${end}  |  Genere le: ${new Date().toLocaleDateString("fr-FR")}`, 30, 44, { width: pageW });

        doc.fill("#000000");
        doc.y = 85;

        const cols = [
          { label: "N. Police", width: 60 },
          { label: "Nom complet", width: 120 },
          { label: "Telephone", width: 80 },
          { label: "Destination", width: 70 },
          { label: "Compagnie", width: 90 },
          { label: "Date", width: 70 },
          { label: "Heure", width: 45 },
          { label: "Prime", width: 55 },
          { label: "Commission", width: 60 },
          { label: "Statut", width: 60 },
        ];

        const totalW = cols.reduce((s, c) => s + c.width, 0);
        const startX = 30;

        const drawTableHeader = (yPos: number) => {
          doc.rect(startX, yPos, totalW, 20).fill("#2C3E50");
          doc.fill("#FFFFFF").fontSize(7).font("Helvetica-Bold");
          let x = startX;
          cols.forEach((c) => {
            doc.text(c.label, x + 3, yPos + 6, { width: c.width - 6, align: "left" });
            x += c.width;
          });
          doc.fill("#000000");
          return yPos + 20;
        }

        let y = drawTableHeader(doc.y);

        passengersList.forEach((p, idx) => {
          if (y > doc.page.height - 80) {
            doc.addPage();
            doc.rect(0, 0, doc.page.width, 40).fill("#1A5276");
            doc.fill("#FFFFFF").fontSize(10).font("Helvetica-Bold").text(`SecureFlow - ${insuranceName} (suite)`, 30, 12, { width: pageW });
            doc.fill("#000000");
            y = drawTableHeader(50);
          }

          if (idx % 2 === 1) {
            doc.rect(startX, y, totalW, 16).fill("#F2F3F4");
            doc.fill("#000000");
          }

          doc.fontSize(6.5).font("Helvetica");
          let x = startX;
          const rowData = [
            `SF-${String(p.id).padStart(4, "0")}`,
            p.fullName.length > 22 ? p.fullName.substring(0, 22) + "..." : p.fullName,
            p.phone,
            p.destination,
            p.company.length > 16 ? p.company.substring(0, 16) + "..." : p.company,
            p.travelDate,
            p.travelTime,
            `${(p.price || 500).toLocaleString("fr-FR")}`,
            `${(p.commissionGenerated || 0).toLocaleString("fr-FR")}`,
            statusLabels[p.status] || p.status,
          ];
          rowData.forEach((val, ci) => {
            doc.text(val, x + 3, y + 4, { width: cols[ci].width - 6, align: "left" });
            x += cols[ci].width;
          });
          y += 16;
        });

        const totalPrice = passengersList.reduce((s, p) => s + (p.price || 500), 0);
        const totalCommission = passengersList.reduce((s, p) => s + (p.commissionGenerated || 0), 0);

        y += 15;
        if (y > doc.page.height - 120) { doc.addPage(); y = 50; }

        doc.rect(startX, y, 320, 90).lineWidth(1).strokeColor("#1A5276").stroke();
        doc.rect(startX, y, 320, 22).fill("#1A5276");
        doc.fill("#FFFFFF").fontSize(10).font("Helvetica-Bold").text("RESUME DU RAPPORT", startX + 10, y + 6);
        doc.fill("#333333").fontSize(9).font("Helvetica");
        y += 28;
        doc.text(`Assurance: ${insuranceName}`, startX + 10, y);
        y += 14;
        doc.text(`Periode: ${start} au ${end}`, startX + 10, y);
        y += 14;
        doc.font("Helvetica-Bold").text(`Total passagers: ${passengersList.length}    |    Total primes: ${totalPrice.toLocaleString("fr-FR")} FCFA    |    Commissions: ${totalCommission.toLocaleString("fr-FR")} FCFA`, startX + 10, y);

        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(7).fill("#999999").font("Helvetica")
            .text(`SecureFlow - Page ${i + 1}/${pageCount}`, 30, doc.page.height - 25, { width: pageW, align: "center" });
        }

        doc.end();
      }
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  return httpServer;
}
