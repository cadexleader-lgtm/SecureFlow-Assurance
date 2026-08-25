import { db } from "./storage";
import { passengers, users, insurances, transportCompanies } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  const superAdminPassword = await bcrypt.hash("50363636+56501348", 10);

  const existingClarence = await db.select().from(users).where(eq(users.username, "Clarence"));
  if (existingClarence.length === 0) {
    await db.insert(users).values({
      username: "Clarence",
      password: superAdminPassword,
      fullName: "Clarence Hazoume",
      email: "infosecureflowco@gmail.com",
      role: "super_admin",
    });
    console.log("Super Admin Clarence created");
  } else {
    await db.update(users).set({ role: "super_admin" }).where(eq(users.username, "Clarence"));
    console.log("Clarence role synced (password preserved)");
  }

  const existingEric = await db.select().from(users).where(eq(users.username, "Eric"));
  if (existingEric.length === 0) {
    await db.insert(users).values({
      username: "Eric",
      password: superAdminPassword,
      fullName: "Eric Hazoume",
      email: "infosecureflowco@gmail.com",
      role: "super_admin",
    });
    console.log("Super Admin Eric created");
  } else {
    await db.update(users).set({ role: "super_admin" }).where(eq(users.username, "Eric"));
    console.log("Eric role synced (password preserved)");
  }

  await db.update(users).set({ role: "super_admin" }).where(eq(users.role, "admin"));

  const [{ count: insCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(insurances);
  if (insCount === 0) {
    await db.insert(insurances).values([
      { name: "NSIA Assurances Benin", email: "nsia@example.com", commissionPerPassenger: 50, status: "active" },
      { name: "Sanlam Assurances Benin", email: "sanlam@example.com", commissionPerPassenger: 50, status: "active" },
      { name: "AFG Assurance", email: "afg@example.com", commissionPerPassenger: 50, status: "active" },
    ]);
    console.log("Insurance companies seeded");
  }

  const [{ count: tcCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(transportCompanies);
  if (tcCount === 0) {
    await db.insert(transportCompanies).values([
      { name: "Confort Lines", contact: "Service Client", phone: "+229 21 31 50 50", email: "info@confortlines.bj", status: "active" },
      { name: "Baobab Express", contact: "Service Client", phone: "+229 21 32 60 60", email: "info@baobab.bj", status: "active" },
      { name: "ATT Benin", contact: "Service Client", phone: "+229 21 33 70 70", email: "info@att.bj", status: "active" },
      { name: "STCB", contact: "Service Client", phone: "+229 21 34 80 80", email: "info@stcb.bj", status: "active" },
      { name: "Trans Benin", contact: "Service Client", phone: "+229 21 35 90 90", email: "info@transbenin.bj", status: "active" },
      { name: "Sahel Transport", contact: "Service Client", phone: "+229 21 36 00 00", email: "info@sahel.bj", status: "active" },
    ]);
    console.log("Transport companies seeded");
  }
}
