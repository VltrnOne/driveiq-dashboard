import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const CustomerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  preferences: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});

export const CustomerUpdateSchema = CustomerSchema.partial();

export const VehicleSchema = z.object({
  licensePlate: z.string().min(1).max(20).transform(s => s.toUpperCase().trim()),
  make: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  color: z.string().max(30).optional(),
  year: z.number().int().min(1900).max(2030).optional(),
  isPrimary: z.boolean().optional().default(false),
});

export const MenuItemSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['COFFEE', 'TEA', 'FOOD', 'COLD_DRINK', 'SPECIALTY']),
  price: z.number().positive(),
  description: z.string().max(500).optional(),
  available: z.boolean().optional().default(true),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional().default(0),
});

export const MenuItemUpdateSchema = MenuItemSchema.partial();

export const OrderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().max(200).optional(),
});

export const OrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  items: z.array(OrderItemSchema).min(1),
  method: z.enum(['DRIVETHRU', 'WALKIN']).default('DRIVETHRU'),
  notes: z.string().max(500).optional(),
});

export const OrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'READY', 'COMPLETE', 'CANCELLED']),
  notes: z.string().optional(),
});

export const DetectSessionSchema = z.object({
  detectedPlate: z.string().optional(),
  qrToken: z.string().optional(),
  faceEmbedding: z.array(z.number()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  method: z.enum(['LPR', 'QR', 'FACE', 'MANUAL']).default('LPR'),
  rawPayload: z.string().optional(),
});

export const RedeemSchema = z.object({
  customerId: z.string().uuid(),
  points: z.number().int().positive(),
  orderId: z.string().uuid().optional(),
  note: z.string().optional(),
});

export const SettingsUpdateSchema = z.record(z.string(), z.string());
