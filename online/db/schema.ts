import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('profiles', { id: text('id').primaryKey(), name: text('name').notNull(), details: text('details').notNull() });
export const posts = sqliteTable('posts', { id: text('id').primaryKey(), payload: text('payload').notNull(), revision: integer('revision').notNull().default(0) });
export const rooms = sqliteTable('rooms', { id: text('id').primaryKey(), payload: text('payload').notNull(), revision: integer('revision').notNull().default(0) });
export const saved = sqliteTable('saved', { userId: text('user_id').notNull(), postId: text('post_id').notNull() }, t => [primaryKey({ columns: [t.userId, t.postId] })]);
export const limits = sqliteTable('limits', { id: text('id').primaryKey(), stamp: integer('stamp').notNull(), hits: integer('hits').notNull() });
