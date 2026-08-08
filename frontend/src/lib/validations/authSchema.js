import { z } from 'zod';

export const loginSchema = z.object({
  loginId: z.string().min(1, 'Email or Phone is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const commonRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  phone: z.string().regex(/^[0-9]{10}$/, 'Invalid phone number, must be 10 digits'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  village: z.string().min(2, 'Village/City is required'),
  district: z.string().min(2, 'District is required'),
  state: z.string().min(2, 'State is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

export const farmerRegisterSchema = commonRegisterSchema.extend({
  farmSize: z.string().min(1, 'Farm size is required'),
  primaryCrops: z.string().min(1, 'Primary crops are required'),
});

export const buyerRegisterSchema = commonRegisterSchema.extend({
  businessName: z.string().min(2, 'Business name is required'),
  orderVolume: z.string().optional(),
  produceType: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
