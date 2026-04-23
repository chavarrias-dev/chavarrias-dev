import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const profileRoleEnum = pgEnum("profile_role", [
  "cliente",
  "empleado",
  "admin",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  role: profileRoleEnum("role").default("cliente"),
  createdAt: timestamp("created_at").defaultNow(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
});
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  companyName: text("company_name"),
  rfc: text("rfc"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});