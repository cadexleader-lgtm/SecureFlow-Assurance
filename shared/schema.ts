import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const insurances = pgTable("insurances", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  email: text("email").notNull(),
  logo: text("logo"),
  commissionPerPassenger: integer("commission_per_passenger").notNull().default(50),
  defaultPremium: integer("default_premium").notNull().default(500),
  status: text("status").notNull().default("active"),
  raisonSociale: text("raison_sociale"),
  formeJuridique: text("forme_juridique"),
  capitalSocial: text("capital_social"),
  siegeSocial: text("siege_social"),
  telephone: text("telephone"),
  siteWeb: text("site_web"),
  numeroAgrementCima: text("numero_agrement_cima"),
  numeroIfu: text("numero_ifu"),
  garantieDeces: text("garantie_deces"),
  garantieInvalidite: text("garantie_invalidite"),
  garantieFraisMedicaux: text("garantie_frais_medicaux"),
  garantieRapatriement: text("garantie_rapatriement"),
  dureeValiditeHeures: integer("duree_validite_heures").notNull().default(24),
  dureeValidite: text("duree_validite"),
  franchise: text("franchise"),
  hotlineSinistres: text("hotline_sinistres"),
  emailSinistres: text("email_sinistres"),
  emailReclamations: text("email_reclamations"),
  urlDeclarationSinistre: text("url_declaration_sinistre"),
  urlConditionsGenerales: text("url_conditions_generales"),
  documentsRequis: text("documents_requis"),
  exclusionsPrincipales: text("exclusions_principales"),
  typePolice: text("type_police"),
  souscripteur: text("souscripteur"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transportCompanies = pgTable("transport_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contact: text("contact"),
  phone: text("phone"),
  email: text("email"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("agent"),
  photo: text("photo"),
  insuranceId: integer("insurance_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passengers = pgTable("passengers", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  documentType: text("document_type"),
  documentNumber: text("document_number"),
  departure: text("departure"),
  destination: text("destination").notNull(),
  company: text("company").notNull(),
  busNumber: text("bus_number"),
  travelDate: text("travel_date").notNull(),
  travelTime: text("travel_time").notNull(),
  price: integer("price").notNull().default(500),
  qrCode: text("qr_code").notNull(),
  status: text("status").notNull().default("en_attente"),
  agentId: integer("agent_id"),
  insuranceId: integer("insurance_id"),
  primeAssurance: integer("prime_assurance").default(500),
  commissionGenerated: integer("commission_generated").default(0),
  dateExpiration: timestamp("date_expiration"),
  statutAssurance: text("statut_assurance").notNull().default("actif"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const actionLogs = pgTable("action_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userName: text("user_name").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  insuranceId: integer("insurance_id").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  passengerCount: integer("passenger_count").notNull(),
  commissionPerPassenger: integer("commission_per_passenger").notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: text("status").notNull().default("en_attente"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInsuranceSchema = createInsertSchema(insurances).omit({
  id: true,
  createdAt: true,
});

export const insertTransportCompanySchema = createInsertSchema(transportCompanies).omit({
  id: true,
  createdAt: true,
});

export const insertPassengerSchema = createInsertSchema(passengers).omit({
  id: true,
  qrCode: true,
  createdAt: true,
  status: true,
  agentId: true,
  insuranceId: true,
  commissionGenerated: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertActionLogSchema = createInsertSchema(actionLogs).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Nom d'utilisateur requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type Insurance = typeof insurances.$inferSelect;
export type InsertInsurance = z.infer<typeof insertInsuranceSchema>;
export type TransportCompany = typeof transportCompanies.$inferSelect;
export type InsertTransportCompany = z.infer<typeof insertTransportCompanySchema>;
export type InsertPassenger = z.infer<typeof insertPassengerSchema>;
export type Passenger = typeof passengers.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ActionLog = typeof actionLogs.$inferSelect;
export type InsertActionLog = z.infer<typeof insertActionLogSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export const documentTypes = [
  "Passeport",
  "Carte CIP",
  "Carte Biometrique",
  "Carte d'identite",
  "Permis de conduire",
] as const;

export const destinations = [
  "Cotonou",
  "Parakou",
  "Porto-Novo",
  "Abomey-Calavi",
  "Djougou",
  "Bohicon",
  "Natitingou",
  "Kandi",
  "Lokossa",
  "Ouidah",
] as const;
