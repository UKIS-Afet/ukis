import { pgTable, text, timestamp, integer, boolean, serial, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const containers = pgTable('containers', {
  id: text('id').primaryKey(),
  containerFullId: text('container_full_id').notNull(),
  accessCode: text('access_code').notNull(),
  adults: integer('adults').notNull().default(0),
  children: integer('children').notNull().default(0),
  babies: integer('babies').notNull().default(0),
  contactNumber: text('contact_number'),
  specialNeeds: text('special_needs'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  unit: text('unit').notNull(),
  mainCategory: text('main_category').notNull(),
  category: text('category').notNull(),
  icon: text('icon').notNull(),
  imageUrl: text('image_url').notNull(),
  maxPerAdult: integer('max_per_adult').notNull().default(0),
  maxPerChild: integer('max_per_child').notNull().default(0),
  maxPerBaby: integer('max_per_baby').notNull().default(0),
  cooldownHours: integer('cooldown_hours').notNull().default(0),
  inStock: boolean('in_stock').notNull().default(true),
  stockQuantity: integer('stock_quantity').notNull().default(100),
  sizesStock: jsonb('sizes_stock').$type<Record<string, number>>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const requests = pgTable('requests', {
  id: text('id').primaryKey(),
  containerId: text('container_id').notNull().references(() => containers.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  status: text('status').notNull(), // 'pending', 'approved', 'rejected', 'delivered'
  requestDate: timestamp('request_date').notNull(),
  notes: text('notes'),
  size: text('size'),
  age: text('age'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  containerId: text('container_id').notNull().references(() => containers.id),
  type: text('type').notNull(), // 'voice', 'text'
  audioUrl: text('audio_url'),
  description: text('description').notNull(),
  status: text('status').notNull(), // 'new', 'in_progress', 'resolved'
  priority: text('priority'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const donations = pgTable('donations', {
  id: text('id').primaryKey(),
  donorId: text('donor_id').notNull(),
  donorName: text('donor_name').notNull(),
  donorPhone: text('donor_phone'),
  donorEmail: text('donor_email'),
  donorType: text('donor_type').notNull(),
  amount: integer('amount').notNull(),
  date: timestamp('date').notNull(),
  status: text('status').notNull(),
  description: text('description'),
  items: text('items'), // JSON string
  fulfilledRequests: text('fulfilled_requests'), // JSON string
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatSessions = pgTable('chat_sessions', {
  id: text('id').primaryKey(),
  name: text('name'),
  surname: text('surname'),
  containerNo: text('container_no'),
  isBanned: boolean('is_banned').notNull().default(false),
  lastActive: timestamp('last_active').notNull().defaultNow(),
});

export const issues = pgTable('issues', {
  id: text('id').primaryKey(),
  containerId: text('container_id').notNull().references(() => containers.id),
  type: text('type').notNull(), // 'special_need', 'complaint'
  description: text('description').notNull(),
  status: text('status').notNull(), // 'pending', 'resolved', 'rejected'
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  sender: text('sender').notNull(),
  text: text('text').notNull(),
  imageUrl: text('image_url'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});
