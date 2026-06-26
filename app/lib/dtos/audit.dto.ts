import { z } from "zod";

export const AuditActorRoleSchema = z.enum([
  "user",
  "support",
  "admin",
  "finance",
  "security",
  "compliance",
  "system",
]);

export const AuditActorSchema = z.object({
  id: z.string(),
  role: AuditActorRoleSchema,
});

export const AuditTargetSchema = z.object({
  type: z.enum(["stream", "account"]),
  id: z.string(),
  account: z.string().optional(),
});

export const AuditMetadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const AuditEntrySchema = z.object({
  id: z.string(),
  actor: AuditActorSchema,
  target: AuditTargetSchema,
  action: z.string(),
  beforeHash: z.string().nullable(),
  afterHash: z.string().nullable(),
  diffHash: z.string().nullable(),
  requestId: z.string(),
  timestamp: z.string().datetime(),
  prevHash: z.string().nullable(),
  entryHash: z.string(),
  retentionUntil: z.string().datetime(),
  metadata: z.record(AuditMetadataValueSchema).optional(),
});

export const AuditResponseSchema = z.object({
  access: z.object({
    actorId: z.string(),
    role: AuditActorRoleSchema,
  }),
  data: z.array(AuditEntrySchema),
  links: z.object({
    self: z.string(),
  }),
  meta: z.object({
    chainIntact: z.boolean(),
    retentionDays: z.number(),
    total: z.number(),
  }),
});

export type AuditActorRoleDTO = z.infer<typeof AuditActorRoleSchema>;
export type AuditActorDTO = z.infer<typeof AuditActorSchema>;
export type AuditTargetDTO = z.infer<typeof AuditTargetSchema>;
export type AuditEntryDTO = z.infer<typeof AuditEntrySchema>;
export type AuditResponseDTO = z.infer<typeof AuditResponseSchema>;
