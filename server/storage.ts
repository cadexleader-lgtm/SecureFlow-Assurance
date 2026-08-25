import { eq, desc, sql, and, gte, lte, or, ilike } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  passengers, users, insurances, transportCompanies, actionLogs, invoices, verificationCodes,
  type Passenger, type InsertPassenger, type User, type InsertUser,
  type Insurance, type InsertInsurance,
  type TransportCompany, type InsertTransportCompany,
  type ActionLog, type InsertActionLog,
  type Invoice, type InsertInvoice,
} from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  createUser(data: InsertUser): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsernameOrEmail(identifier: string): Promise<User | undefined>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  getAgentsByInsuranceId(insuranceId: number): Promise<User[]>;
  getAllAgents(): Promise<User[]>;

  createInsurance(data: InsertInsurance): Promise<Insurance>;
  getInsuranceById(id: number): Promise<Insurance | undefined>;
  getAllInsurances(): Promise<Insurance[]>;
  updateInsurance(id: number, data: Partial<InsertInsurance>): Promise<Insurance | undefined>;
  deleteInsurance(id: number): Promise<void>;

  createTransportCompany(data: InsertTransportCompany): Promise<TransportCompany>;
  getTransportCompanyById(id: number): Promise<TransportCompany | undefined>;
  getAllTransportCompanies(): Promise<TransportCompany[]>;
  getActiveTransportCompanies(): Promise<TransportCompany[]>;
  updateTransportCompany(id: number, data: Partial<InsertTransportCompany>): Promise<TransportCompany | undefined>;
  deleteTransportCompany(id: number): Promise<void>;

  createPassenger(data: InsertPassenger, agentId: number, insuranceId: number, commission: number, primeAssurance?: number, dureeValiditeHeures?: number): Promise<Passenger>;
  getPassenger(id: number): Promise<Passenger | undefined>;
  getPassengerByQrCode(qrCode: string): Promise<Passenger | undefined>;
  getAllPassengers(): Promise<Passenger[]>;
  getPassengersByInsurance(insuranceId: number): Promise<Passenger[]>;
  getPassengersByAgent(agentId: number): Promise<Passenger[]>;
  getRecentPassengers(limit: number): Promise<Passenger[]>;
  getPassengersByDateRange(start: string, end: string, insuranceId?: number): Promise<Passenger[]>;
  updatePassengerStatus(id: number, status: string): Promise<Passenger | undefined>;

  getGlobalStats(): Promise<{ todayCount: number; monthCount: number; totalCount: number; activeInsurances: number; activeTransportCompanies: number; monthRevenue: number }>;
  getInsuranceStats(insuranceId: number): Promise<{
    todayCount: number; weekCount: number; monthCount: number; totalCount: number;
    agentCount: number; activeAgentCount: number;
    monthRevenue: number; lastMonthRevenue: number; lastMonthPremium: number;
    monthPremium: number; totalPremium: number;
    todayPremium: number; weekPremium: number;
    monthCommission: number; totalCommission: number;
    todayCommission: number; weekCommission: number;
  }>;
  getInsuranceMonthlyRevenue(insuranceId: number, months: number): Promise<{ month: string; revenue: number; passengers: number; commission: number }[]>;
  getInsuranceTopAgents(insuranceId: number, limit: number): Promise<{ agentId: number; fullName: string; count: number; revenue: number }[]>;
  getInsuranceTransportDistribution(insuranceId: number): Promise<{ company: string; count: number }[]>;
  getInsuranceTopDestinations(insuranceId: number, limit: number): Promise<{ destination: string; count: number }[]>;
  getAgentStats(agentId: number): Promise<{ todayCount: number; weekCount: number; monthCount: number; totalCount: number }>;
  getStatsByCompany(): Promise<{ company: string; count: number }[]>;
  getStatsByDestination(): Promise<{ destination: string; count: number }[]>;
  getStatsByInsurance(): Promise<{ name: string; count: number; revenue: number }[]>;
  getTopAgents(limit: number, insuranceId?: number): Promise<{ agentId: number | null; fullName: string; count: number }[]>;
  getMonthlyPassengerCounts(months: number): Promise<{ month: string; count: number }[]>;
  getDailyPassengerCounts(days: number, insuranceId?: number): Promise<{ date: string; count: number }[]>;
  getPassengersByInsuranceDistribution(): Promise<{ name: string; count: number }[]>;
  expireActivePassengers(): Promise<number>;
  getMonthlyHistory(year: number, insuranceId?: number): Promise<{ month: string; passengers: number; revenue: number }[]>;

  createActionLog(data: InsertActionLog): Promise<ActionLog>;
  getActionLogs(limit: number, offset: number): Promise<ActionLog[]>;
  getActionLogCount(): Promise<number>;

  createInvoice(data: InsertInvoice): Promise<Invoice>;
  getInvoicesByInsurance(insuranceId: number): Promise<Invoice[]>;
  getAllInvoices(): Promise<Invoice[]>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined>;
  getRevenueByInsurance(start: string, end: string): Promise<{ insuranceId: number; name: string; count: number; commission: number; revenue: number; premiumTotal: number; commissionSF: number; netRevenue: number; paid?: boolean }[]>;
  getReportPassengers(start: string, end: string, insuranceId?: number): Promise<(Passenger & { insuranceName: string | null; agentName: string | null })[]>;
}

export class DatabaseStorage implements IStorage {
  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsernameOrEmail(identifier: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(eq(users.username, identifier), eq(users.email, identifier))
    );
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAgentsByInsuranceId(insuranceId: number): Promise<User[]> {
    return db.select().from(users).where(
      and(eq(users.role, "agent"), eq(users.insuranceId, insuranceId))
    ).orderBy(desc(users.createdAt));
  }

  async getAllAgents(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "agent")).orderBy(desc(users.createdAt));
  }

  async createInsurance(data: InsertInsurance): Promise<Insurance> {
    const [ins] = await db.insert(insurances).values(data).returning();
    return ins;
  }

  async getInsuranceById(id: number): Promise<Insurance | undefined> {
    const [ins] = await db.select().from(insurances).where(eq(insurances.id, id));
    return ins;
  }

  async getAllInsurances(): Promise<Insurance[]> {
    return db.select().from(insurances).orderBy(insurances.name);
  }

  async updateInsurance(id: number, data: Partial<InsertInsurance>): Promise<Insurance | undefined> {
    const [ins] = await db.update(insurances).set(data).where(eq(insurances.id, id)).returning();
    return ins;
  }

  async deleteInsurance(id: number): Promise<void> {
    await db.delete(passengers).where(eq(passengers.insuranceId, id));
    await db.delete(users).where(eq(users.insuranceId, id));
    await db.delete(insurances).where(eq(insurances.id, id));
  }

  async createTransportCompany(data: InsertTransportCompany): Promise<TransportCompany> {
    const [tc] = await db.insert(transportCompanies).values(data).returning();
    return tc;
  }

  async getTransportCompanyById(id: number): Promise<TransportCompany | undefined> {
    const [tc] = await db.select().from(transportCompanies).where(eq(transportCompanies.id, id));
    return tc;
  }

  async getAllTransportCompanies(): Promise<TransportCompany[]> {
    return db.select().from(transportCompanies).orderBy(transportCompanies.name);
  }

  async getActiveTransportCompanies(): Promise<TransportCompany[]> {
    return db.select().from(transportCompanies).where(eq(transportCompanies.status, "active")).orderBy(transportCompanies.name);
  }

  async updateTransportCompany(id: number, data: Partial<InsertTransportCompany>): Promise<TransportCompany | undefined> {
    const [tc] = await db.update(transportCompanies).set(data).where(eq(transportCompanies.id, id)).returning();
    return tc;
  }

  async deleteTransportCompany(id: number): Promise<void> {
    await db.delete(transportCompanies).where(eq(transportCompanies.id, id));
  }

  async createPassenger(data: InsertPassenger, agentId: number, insuranceId: number, commission: number, primeAssurance?: number, dureeValiditeHeures?: number): Promise<Passenger> {
    const tempQrCode = `SF-${Date.now()}`;
    const now = new Date();
    const dateExpiration = new Date(now);
    dateExpiration.setHours(dateExpiration.getHours() + (dureeValiditeHeures || 24));
    const [passenger] = await db
      .insert(passengers)
      .values({ ...data, qrCode: tempQrCode, agentId, insuranceId, commissionGenerated: commission, primeAssurance: primeAssurance ?? 500, status: "en_attente", dateExpiration, statutAssurance: "actif" })
      .returning();
    const qrCode = `SECUREFLOW-${String(passenger.id).padStart(6, "0")}`;
    const [updated] = await db
      .update(passengers)
      .set({ qrCode })
      .where(eq(passengers.id, passenger.id))
      .returning();
    return updated;
  }

  async getPassenger(id: number): Promise<Passenger | undefined> {
    const [passenger] = await db.select().from(passengers).where(eq(passengers.id, id));
    return passenger;
  }

  async getPassengerByQrCode(qrCode: string): Promise<Passenger | undefined> {
    const [passenger] = await db.select().from(passengers).where(eq(passengers.qrCode, qrCode));
    return passenger;
  }

  async getAllPassengers(): Promise<Passenger[]> {
    return db.select().from(passengers).orderBy(desc(passengers.createdAt));
  }

  async getPassengersByInsurance(insuranceId: number): Promise<Passenger[]> {
    return db.select().from(passengers).where(eq(passengers.insuranceId, insuranceId)).orderBy(desc(passengers.createdAt));
  }

  async getPassengersByAgent(agentId: number): Promise<Passenger[]> {
    return db.select().from(passengers).where(eq(passengers.agentId, agentId)).orderBy(desc(passengers.createdAt));
  }

  async getRecentPassengers(limit: number): Promise<Passenger[]> {
    return db.select().from(passengers).orderBy(desc(passengers.createdAt)).limit(limit);
  }

  async getPassengersByDateRange(start: string, end: string, insuranceId?: number): Promise<Passenger[]> {
    const conditions = [
      gte(passengers.travelDate, start),
      lte(passengers.travelDate, end),
    ];
    if (insuranceId) {
      conditions.push(eq(passengers.insuranceId, insuranceId));
    }
    return db.select().from(passengers).where(and(...conditions)).orderBy(desc(passengers.createdAt));
  }

  async updatePassengerStatus(id: number, status: string): Promise<Passenger | undefined> {
    const [passenger] = await db.update(passengers).set({ status }).where(eq(passengers.id, id)).returning();
    return passenger;
  }

  async getGlobalStats() {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split("T")[0];
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split("T")[0];

    const [totalResult] = await db.select({ count: sql<number>`count(*)::int`, revenue: sql<number>`COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int` }).from(passengers);
    const [todayResult] = await db.select({ count: sql<number>`count(*)::int`, revenue: sql<number>`COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int` }).from(passengers).where(eq(passengers.travelDate, today));
    const [weekResult] = await db.select({ count: sql<number>`count(*)::int`, revenue: sql<number>`COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int` }).from(passengers).where(gte(passengers.travelDate, weekAgo));
    const [monthResult] = await db.select({ count: sql<number>`count(*)::int`, revenue: sql<number>`COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int` }).from(passengers).where(gte(passengers.travelDate, monthStart));
    const [lastMonthResult] = await db.select({ count: sql<number>`count(*)::int`, revenue: sql<number>`COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int` }).from(passengers).where(and(gte(passengers.travelDate, lastMonthStart), lte(passengers.travelDate, lastMonthEnd)));
    const [activeInsResult] = await db.select({ count: sql<number>`count(*)::int` }).from(insurances).where(eq(insurances.status, "active"));
    const [activeTcResult] = await db.select({ count: sql<number>`count(*)::int` }).from(transportCompanies).where(eq(transportCompanies.status, "active"));
    const [monthRevenueResult] = await db.select({ sum: sql<number>`COALESCE(SUM(commission_generated), 0)::int` }).from(passengers).where(gte(passengers.travelDate, monthStart));

    return {
      todayCount: todayResult.count,
      weekCount: weekResult.count,
      monthCount: monthResult.count,
      totalCount: totalResult.count,
      todayRevenue: todayResult.revenue,
      weekRevenue: weekResult.revenue,
      monthRevenue: monthRevenueResult.sum,
      totalRevenue: totalResult.revenue,
      monthPremium: monthResult.revenue,
      lastMonthCount: lastMonthResult.count,
      lastMonthRevenue: lastMonthResult.revenue,
      activeInsurances: activeInsResult.count,
      activeTransportCompanies: activeTcResult.count,
    };
  }

  async getInsuranceStats(insuranceId: number) {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split("T")[0];
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split("T")[0];

    const ins = eq(passengers.insuranceId, insuranceId);

    const [totalResult] = await db.select({
      count: sql<number>`count(*)::int`,
      premium: sql<number>`COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int`,
      commission: sql<number>`COALESCE(SUM(COALESCE(commission_generated, 0)), 0)::int`,
    }).from(passengers).where(ins);

    const [todayResult] = await db.select({
      count: sql<number>`count(*)::int`,
      premium: sql<number>`COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int`,
      commission: sql<number>`COALESCE(SUM(COALESCE(commission_generated, 0)), 0)::int`,
    }).from(passengers).where(and(ins, eq(passengers.travelDate, today)));

    const [weekResult] = await db.select({
      count: sql<number>`count(*)::int`,
      premium: sql<number>`COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int`,
      commission: sql<number>`COALESCE(SUM(COALESCE(commission_generated, 0)), 0)::int`,
    }).from(passengers).where(and(ins, gte(passengers.travelDate, weekAgo)));

    const [monthResult] = await db.select({
      count: sql<number>`count(*)::int`,
      premium: sql<number>`COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int`,
      commission: sql<number>`COALESCE(SUM(COALESCE(commission_generated, 0)), 0)::int`,
    }).from(passengers).where(and(ins, gte(passengers.travelDate, monthStart)));

    const [lastMonthResult] = await db.select({
      premium: sql<number>`COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int`,
    }).from(passengers).where(and(ins, gte(passengers.travelDate, lastMonthStart), lte(passengers.travelDate, lastMonthEnd)));

    const [agentResult] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, "agent"), eq(users.insuranceId, insuranceId)));

    const [activeAgentResult] = await db.select({
      count: sql<number>`COUNT(DISTINCT agent_id)::int`,
    }).from(passengers).where(and(ins, gte(passengers.travelDate, monthStart)));

    return {
      todayCount: todayResult.count,
      weekCount: weekResult.count,
      monthCount: monthResult.count,
      totalCount: totalResult.count,
      agentCount: agentResult.count,
      activeAgentCount: activeAgentResult.count,
      monthRevenue: monthResult.premium,
      lastMonthRevenue: lastMonthResult.premium,
      lastMonthPremium: lastMonthResult.premium,
      monthPremium: monthResult.premium,
      totalPremium: totalResult.premium,
      todayPremium: todayResult.premium,
      weekPremium: weekResult.premium,
      monthCommission: monthResult.commission,
      totalCommission: totalResult.commission,
      todayCommission: todayResult.commission,
      weekCommission: weekResult.commission,
    };
  }

  async getInsuranceMonthlyRevenue(insuranceId: number, months: number) {
    const results = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', TO_DATE(travel_date, 'YYYY-MM-DD')), 'YYYY-MM') AS month,
        COUNT(*)::int AS passengers,
        COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int AS revenue,
        COALESCE(SUM(COALESCE(commission_generated, 0)), 0)::int AS commission
      FROM passengers
      WHERE insurance_id = ${insuranceId}
        AND TO_DATE(travel_date, 'YYYY-MM-DD') >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${sql.raw(String(months - 1))} months'
      GROUP BY DATE_TRUNC('month', TO_DATE(travel_date, 'YYYY-MM-DD'))
      ORDER BY month ASC
    `);
    return (results.rows as any[]).map(r => ({
      month: r.month as string,
      revenue: Number(r.revenue),
      passengers: Number(r.passengers),
      commission: Number(r.commission),
    }));
  }

  async getInsuranceTopAgents(insuranceId: number, limit: number) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const results = await db.execute(sql`
      SELECT p.agent_id AS "agentId", u.full_name AS "fullName",
        COUNT(*)::int AS count,
        COALESCE(SUM(COALESCE(p.prime_assurance, p.price)), 0)::int AS revenue
      FROM passengers p
      LEFT JOIN users u ON u.id = p.agent_id
      WHERE p.insurance_id = ${insuranceId} AND p.travel_date >= ${monthStart}
      GROUP BY p.agent_id, u.full_name
      ORDER BY count DESC
      LIMIT ${limit}
    `);
    return (results.rows as any[]).map(r => ({
      agentId: Number(r.agentId),
      fullName: r.fullName as string,
      count: Number(r.count),
      revenue: Number(r.revenue),
    }));
  }

  async getInsuranceTransportDistribution(insuranceId: number) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const results = await db.execute(sql`
      SELECT company, COUNT(*)::int AS count
      FROM passengers
      WHERE insurance_id = ${insuranceId} AND travel_date >= ${monthStart}
      GROUP BY company
      ORDER BY count DESC
    `);
    return (results.rows as any[]).map(r => ({
      company: r.company as string,
      count: Number(r.count),
    }));
  }

  async getInsuranceTopDestinations(insuranceId: number, limit: number) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const results = await db.execute(sql`
      SELECT destination, COUNT(*)::int AS count
      FROM passengers
      WHERE insurance_id = ${insuranceId} AND travel_date >= ${monthStart}
      GROUP BY destination
      ORDER BY count DESC
      LIMIT ${limit}
    `);
    return (results.rows as any[]).map(r => ({
      destination: r.destination as string,
      count: Number(r.count),
    }));
  }

  async getAgentStats(agentId: number) {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    const agentCondition = eq(passengers.agentId, agentId);
    const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(passengers).where(agentCondition);
    const [todayResult] = await db.select({ count: sql<number>`count(*)::int` }).from(passengers).where(and(agentCondition, eq(passengers.travelDate, today)));
    const [weekResult] = await db.select({ count: sql<number>`count(*)::int` }).from(passengers).where(and(agentCondition, gte(passengers.travelDate, weekAgo)));
    const [monthResult] = await db.select({ count: sql<number>`count(*)::int` }).from(passengers).where(and(agentCondition, gte(passengers.travelDate, monthStart)));

    return {
      todayCount: todayResult.count,
      weekCount: weekResult.count,
      monthCount: monthResult.count,
      totalCount: totalResult.count,
    };
  }

  async getStatsByCompany() {
    return db
      .select({ company: passengers.company, count: sql<number>`count(*)::int` })
      .from(passengers)
      .groupBy(passengers.company)
      .orderBy(sql`count(*) desc`);
  }

  async getStatsByDestination() {
    return db
      .select({ destination: passengers.destination, count: sql<number>`count(*)::int` })
      .from(passengers)
      .groupBy(passengers.destination)
      .orderBy(sql`count(*) desc`);
  }

  async getStatsByInsurance() {
    return db
      .select({
        name: insurances.name,
        count: sql<number>`count(${passengers.id})::int`,
        revenue: sql<number>`COALESCE(SUM(${passengers.commissionGenerated}), 0)::int`,
      })
      .from(passengers)
      .innerJoin(insurances, eq(passengers.insuranceId, insurances.id))
      .groupBy(insurances.name)
      .orderBy(sql`count(${passengers.id}) desc`);
  }

  async getTopAgents(limit: number, insuranceId?: number) {
    const conditions = [];
    if (insuranceId) {
      conditions.push(eq(passengers.insuranceId, insuranceId));
    }
    const query = db
      .select({
        agentId: passengers.agentId,
        fullName: users.fullName,
        count: sql<number>`count(${passengers.id})::int`,
      })
      .from(passengers)
      .innerJoin(users, eq(passengers.agentId, users.id))
      .groupBy(passengers.agentId, users.fullName)
      .orderBy(sql`count(${passengers.id}) desc`)
      .limit(limit);

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    return query;
  }

  async getMonthlyPassengerCounts(months: number) {
    const result = await db.execute(sql`
      SELECT to_char(created_at, 'YYYY-MM') as month, count(*)::int as count
      FROM passengers
      WHERE created_at >= NOW() - INTERVAL '${sql.raw(String(months))} months'
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `);
    return result.rows as { month: string; count: number }[];
  }

  async getDailyPassengerCounts(days: number, insuranceId?: number) {
    const conditions = [sql`created_at >= NOW() - INTERVAL '${sql.raw(String(days))} days'`];
    if (insuranceId) {
      conditions.push(sql`insurance_id = ${insuranceId}`);
    }
    const whereClause = sql.join(conditions, sql` AND `);
    const result = await db.execute(sql`
      SELECT to_char(created_at, 'YYYY-MM-DD') as date, count(*)::int as count
      FROM passengers
      WHERE ${whereClause}
      GROUP BY to_char(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `);
    return result.rows as { date: string; count: number }[];
  }

  async getPassengersByInsuranceDistribution() {
    return db
      .select({
        name: sql<string>`COALESCE(${insurances.name}, 'Non assigne')`,
        count: sql<number>`count(${passengers.id})::int`,
      })
      .from(passengers)
      .leftJoin(insurances, eq(passengers.insuranceId, insurances.id))
      .groupBy(insurances.name)
      .orderBy(sql`count(${passengers.id}) desc`);
  }

  async expireActivePassengers(): Promise<number> {
    const now = new Date();
    const result = await db
      .update(passengers)
      .set({ statutAssurance: "expire" })
      .where(and(
        eq(passengers.statutAssurance, "actif"),
        sql`${passengers.dateExpiration} IS NOT NULL AND ${passengers.dateExpiration} < ${now}`
      ))
      .returning();
    return result.length;
  }

  async getMonthlyHistory(year: number, insuranceId?: number) {
    const conditions = insuranceId
      ? sql`EXTRACT(YEAR FROM TO_DATE(travel_date, 'YYYY-MM-DD')) = ${year} AND insurance_id = ${insuranceId}`
      : sql`EXTRACT(YEAR FROM TO_DATE(travel_date, 'YYYY-MM-DD')) = ${year}`;
    const results = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', TO_DATE(travel_date, 'YYYY-MM-DD')), 'YYYY-MM') AS month,
        COUNT(*)::int AS passengers,
        COALESCE(SUM(COALESCE(prime_assurance, price)), 0)::int AS revenue
      FROM passengers
      WHERE ${conditions}
      GROUP BY DATE_TRUNC('month', TO_DATE(travel_date, 'YYYY-MM-DD'))
      ORDER BY month DESC
    `);
    return (results.rows as any[]).map(r => ({
      month: r.month as string,
      passengers: Number(r.passengers),
      revenue: Number(r.revenue),
    }));
  }

  async createActionLog(data: InsertActionLog): Promise<ActionLog> {
    const [log] = await db.insert(actionLogs).values(data).returning();
    return log;
  }

  async getActionLogs(limit: number, offset: number): Promise<ActionLog[]> {
    return db.select().from(actionLogs).orderBy(desc(actionLogs.createdAt)).limit(limit).offset(offset);
  }

  async getActionLogCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(actionLogs);
    return result.count;
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(data).returning();
    return invoice;
  }

  async getInvoicesByInsurance(insuranceId: number): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.insuranceId, insuranceId)).orderBy(desc(invoices.createdAt));
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices).set({ status }).where(eq(invoices.id, id)).returning();
    return invoice;
  }

  async getRevenueByInsurance(start: string, end: string) {
    const result = await db
      .select({
        insuranceId: insurances.id,
        name: insurances.name,
        count: sql<number>`count(${passengers.id})::int`,
        commission: insurances.commissionPerPassenger,
        revenue: sql<number>`COALESCE(SUM(${passengers.commissionGenerated}), 0)::int`,
        premiumTotal: sql<number>`COALESCE(SUM(COALESCE(${passengers.primeAssurance}, ${passengers.price})), 0)::int`,
        commissionSF: sql<number>`COALESCE(SUM(COALESCE(${passengers.commissionGenerated}, 0)), 0)::int`,
      })
      .from(insurances)
      .leftJoin(passengers, and(
        eq(passengers.insuranceId, insurances.id),
        gte(passengers.travelDate, start),
        lte(passengers.travelDate, end),
      ))
      .where(eq(insurances.status, "active"))
      .groupBy(insurances.id, insurances.name, insurances.commissionPerPassenger)
      .orderBy(insurances.name);
    return result.map(r => ({
      ...r,
      netRevenue: r.premiumTotal - r.commissionSF,
    }));
  }
  async getReportPassengers(start: string, end: string, insuranceId?: number): Promise<(Passenger & { insuranceName: string | null; agentName: string | null })[]> {
    const conditions = [
      gte(passengers.travelDate, start),
      lte(passengers.travelDate, end),
    ];
    if (insuranceId) {
      conditions.push(eq(passengers.insuranceId, insuranceId));
    }
    const result = await db
      .select({
        passenger: passengers,
        insuranceName: insurances.name,
        agentName: users.fullName,
      })
      .from(passengers)
      .leftJoin(insurances, eq(passengers.insuranceId, insurances.id))
      .leftJoin(users, eq(passengers.agentId, users.id))
      .where(and(...conditions))
      .orderBy(passengers.travelDate, passengers.id);
    return result.map((r) => ({
      ...r.passenger,
      insuranceName: r.insuranceName,
      agentName: r.agentName,
    }));
  }

  async resetAllData(): Promise<void> {
    await db.delete(verificationCodes);
    await db.delete(passengers);
    await db.delete(actionLogs);
    await db.delete(invoices);
    await db.delete(users).where(
      sql`${users.role} != 'super_admin'`
    );
    await db.delete(insurances);

    await db.execute(sql`ALTER SEQUENCE passengers_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE action_logs_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE invoices_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE verification_codes_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE insurances_id_seq RESTART WITH 1`);

    const bcrypt = await import("bcryptjs");
    const superAdminPassword = await bcrypt.hash("50363636+56501348", 10);
    await db.update(users).set({ password: superAdminPassword }).where(eq(users.role, "super_admin"));
  }

  async createVerificationCode(userId: number, code: string): Promise<void> {
    await db.delete(verificationCodes).where(eq(verificationCodes.userId, userId));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(verificationCodes).values({ userId, code, expiresAt });
  }

  async verifyCode(userId: number, code: string): Promise<boolean> {
    const [record] = await db.select().from(verificationCodes)
      .where(and(
        eq(verificationCodes.userId, userId),
        eq(verificationCodes.code, code),
        eq(verificationCodes.used, false),
        gte(verificationCodes.expiresAt, new Date())
      ));
    if (!record) return false;
    await db.update(verificationCodes).set({ used: true }).where(eq(verificationCodes.id, record.id));
    return true;
  }
}

export const storage = new DatabaseStorage();
