import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    role: text("role").default("user"),
    createdAt: timestamp("created_at").defaultNow(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
});