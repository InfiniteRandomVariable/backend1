// src/db/types.ts
import type { ColumnType } from "kysely";

// Define database tables and types here later
export interface ItemsTable {
  id: ColumnType<
    number,
    string | number | undefined,
    string | number | undefined
  >;
  name: ColumnType<string, string, string>;
  description: ColumnType<string | null, string | null, string | null>;
  created_at: ColumnType<
    Date,
    Date | string | undefined,
    Date | string | undefined
  >;
  updated_at: ColumnType<
    Date,
    Date | string | undefined,
    Date | string | undefined
  >;
}

export interface Database {
  items: ItemsTable; // Define tables here
}
// backend/src/db/types.ts (or your types file)

export enum UserRolesEnum {
  Buyer = "BUYER",
  Seller = "SELLER",
  Arbiter = "ARBITER",
  Staff = "STAFF",
  Admin = "ADMIN",
}

// You can optionally export it as a const object as well for different use cases
export const UserRoles = {
  Buyer: UserRolesEnum.Buyer,
  Seller: UserRolesEnum.Seller,
  Arbiter: UserRolesEnum.Arbiter,
  Staff: UserRolesEnum.Staff,
  Admin: UserRolesEnum.Admin,
} as const;

// You might also want to export a type based on the enum for type safety
export type UserRoleType = keyof typeof UserRoles;
