import {
  boolean,
  date,
  integer,
  numeric,
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
  curp: text("curp"),
  codigoPostal: text("codigo_postal"),
  direccion: text("direccion"),
  fechaInicioOperaciones: text("fecha_inicio_operaciones"),
  notes: text("notes"),
  constanciaUrl: text("constancia_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const facturas = pgTable("facturas", {
  id: uuid("id").primaryKey().defaultRandom(),
  numeroFactura: text("numero_factura").notNull(),
  fecha: date("fecha", { mode: "string" }).notNull(),
  monto: numeric("monto", { precision: 14, scale: 2 }).notNull(),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => clients.id),
  archivoUrl: text("archivo_url"),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pedimentos = pgTable("pedimentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  numeroPedimento: text("numero_pedimento").notNull(),
  fecha: date("fecha", { mode: "string" }).notNull(),
  aduana: text("aduana").notNull(),
  clienteId: uuid("cliente_id").references(() => clients.id),
  archivoUrl: text("archivo_url"),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  userEmail: text("user_email").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  entityName: text("entity_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientDocuments = pgTable("client_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  documentType: text("document_type").notNull(),
  archivoUrl: text("archivo_url"),
  fechaVencimiento: date("fecha_vencimiento", { mode: "string" }),
  fechaSubida: timestamp("fecha_subida").defaultNow(),
  subidoPor: uuid("subido_por").references(() => profiles.id),
  notas: text("notas"),
  status: text("status").notNull().default("pendiente"),
  validoManualmente: boolean("valido_manualmente").default(true),
  sinVencimiento: boolean("sin_vencimiento").default(false),
});

export const dodaLookupStatusEnum = pgEnum("doda_lookup_status", [
  "pendiente",
  "consultando",
  "verificado",
  "revision_manual",
]);

export const dodas = pgTable("dodas", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id").references(() => clients.id),
  pedimentoId: uuid("pedimento_id").references(() => pedimentos.id),
  numeroIntegracion: text("numero_integracion"),
  archivoUrl: text("archivo_url"),
  qrValidatorUrl: text("qr_validator_url"),
  satStatus: text("sat_status"),
  satDetails: text("sat_details"),
  lookupStatus: dodaLookupStatusEnum("lookup_status")
    .notNull()
    .default("pendiente"),
  lookupError: text("lookup_error"),
  lookedUpAt: timestamp("looked_up_at"),
  lastCheckedAt: timestamp("last_checked_at"),
  checkCount: integer("check_count").notNull().default(0),
  isMonitored: boolean("is_monitored").notNull().default(false),
  isResolved: boolean("is_resolved").notNull().default(false),
  whatsappPhone: text("whatsapp_phone"),
  source: text("source"),
  createdBy: uuid("created_by").references(() => profiles.id),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  type: text("type").notNull(),
  relatedId: text("related_id").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => profiles.id),
  receiverId: uuid("receiver_id")
    .notNull()
    .references(() => profiles.id),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});