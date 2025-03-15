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
export interface AuthStatusPayload {
  // Keep this interface definition here as well if not already present
  isSeller?: boolean | null;
  isArbiter?: boolean | null;
  isStaffAdmin?: boolean | null;
  userStatus?: number | null; // {{ edit_1 }}
  verifiedEmail?: boolean | null; // {{ edit_1 }}
  verifiedPhone?: boolean | null; // {{ edit_1 }}
  verifiedUserId?: boolean | null; // {{ edit_1 }}
}

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
export enum UserVerifiedStatus {
  None = 0, // 000
  PhoneVerified = 1, // 001
  StripeVerified = 2, // 010
  PhoneAndStripeVerified = 3, // 011
  SellerApproved = 4, // 100
  SellerAndPhoneVerified = 5, // 101
  SellerAndStripeVerified = 6, // 110
  UserIdVerified = 7,
  FullVerification = 8, // 111
}
export enum UserStatus {
  Pending = 0, // Account created but not yet activated (e.g., email verification pending)
  Normal = 1, // Active and normal user
  Disabled = 2, // Account disabled by admin or user
  Suspended = 3, // Account temporarily suspended due to policy violation
  Deleted = 4, // Account marked for deletion or permanently deleted
  UnderReview = 5, // Account under review by admin (e.g., for seller verification)
  RequiresUpdate = 6, // User account requires an update (e.g., password reset, updated profile details)
  Locked = 7, // User account locked due to too many failed login attempts
}
export interface DB {
  // ... other tables ...
  phoneVerifications: PhoneVerifications; // {{ edit_1 }}
  "og.authStatus": OgAuthStatus; // {{ edit_2 }}
}

export interface PhoneVerifications {
  // {{ edit_2 }}
  phone_number: string;
  verification_code: string;
  expiration_time: Date;
}
export enum PurchaseOfferStatus {
  Pending = 1, // Initial status when offer is created
  AcceptedBySeller = 2,
  RejectedBySeller = 3,
  BuyerPaid = 4,
  SellerShipped = 5, // Example: товараПолучен (assuming "Goods Received" in Russian) - You should use English or your primary language for enum names
  GoodsReceived = 6, // More standard English enum name
  DisputeOpened = 7,
  DisputeResolved = 8,
  Cancelled = 9,
  Completed = 10,
}
export enum ProductStatus {
  /**
   * Draft: Listing is being created by the seller but is not yet published or visible to buyers.
   */
  Draft = 1,

  /**
   * PendingApproval: Listing is submitted for review and is awaiting admin approval before being listed publicly.
   */
  PendingApproval = 2,

  /**
   * Rejected: Listing was rejected by the administrator and is not publicly listed.
   */
  Rejected = 3,

  /**
   * Available: Listing is publicly visible and available for purchase. This is the "active" listing status.
   */
  Available = 4,

  /**
   * OfferPending: A purchase offer has been made by a buyer and is pending seller's acceptance.
   *  The listing might still be visible but is effectively "on hold."
   */
  OfferPending = 5,

  /**
   * Sold: A purchase offer has been accepted by the seller, and the phone is considered sold, pending shipment and completion.
   */
  Sold = 6,

  /**
   * Shipped: Seller has shipped the phone to the buyer.
   */
  Shipped = 7,

  /**
   * GoodsReceived: Buyer has received the phone and confirmed receipt.
   */
  GoodsReceived = 8,

  /**
   * DisputeOpened: A dispute has been opened by either the buyer or seller for this transaction.
   */
  DisputeOpened = 9,

  /**
   * DisputeResolved: The dispute related to this product has been resolved by an arbiter or through another resolution process.
   */
  DisputeResolved = 10,

  /**
   * Cancelled: The listing was cancelled by the seller before a sale, or the transaction was cancelled after an offer was made (but before completion).
   */
  Cancelled = 11,

  /**
   * Completed: The entire transaction is successfully completed (payment, shipment, receipt, and any review process finished). The sale is finalized.
   */
  Completed = 12,

  /**
   * Inactive: Listing is no longer actively offered for sale. Seller might have manually deactivated it, or it could be automatically deactivated after a certain period.
   *  Different from "Cancelled" as "Inactive" is a more general deactivation, while "Cancelled" often implies a transaction process was started and then stopped.
   */
  Inactive = 13,
  OfferAccepted = 15,

  /**
   * Removed: Listing has been permanently removed from the platform, either by the seller or by platform administration (e.g., due to policy violation).
   */
  Removed = 14,
}

export interface OgAuthStatus {
  // {{ edit_3 }}
  id: number;
  userIdFk: number;
  isSeller: boolean | null;
  isBuyer: boolean | null; // {{ edit_3 }}
  isArbiter: boolean | null;
  isStaffAdmin: boolean | null;
  verifiedEmail: boolean | null;
  verifiedPhone: boolean | null;
  verifiedUserId: boolean | null;
  userStatus: number | null; // Or the correct type for userStatus
  // ... other columns in og.authStatus table ...
}
export interface ListingAndSellerInfo {
  id: number;
  status: number;
  sellerUserIdFk: number;
  sellerPhone: string | null;
  sellerSnsTopicArn: string | null;
}

export enum ProductCondition {
  New = 0, // Brand new, unused, in original packaging with all accessories.
  LikeNew = 1, // Used, but in perfect condition with no signs of wear. May or may not include original packaging.
  Excellent = 2, // Used, with very minor signs of wear (e.g., tiny scratches not easily noticeable). Fully functional.
  Good = 3, // Used, with noticeable but minor signs of wear (e.g., light scratches, minor scuffs). Fully functional.
  Fair = 4, // Used, with moderate signs of wear (e.g., noticeable scratches, scuffs, small dents). Fully functional.
  Poor = 5, // Used, with significant signs of wear (e.g., deep scratches, dents, cracks). Functionality might be limited or fully functional.
  Damaged = 6, // Significant damage that may affect functionality (e.g., cracked screen, broken buttons). Specific issues should be described.
  ForPartsOnly = 7, // Not fully functional or has significant issues. Intended for repair or salvaging parts. Specific issues should be described.
  Refurbished = 8, // Previously used and returned, but has been inspected, cleaned, and repaired to full working order by the manufacturer or a certified technician. May have minor cosmetic imperfections.
}
export enum NotificationType {
  Offers = "offers",
  Messages = "messages",
  Purchases = "purchases",
  RejectOffers = "rejectOffers",
  Accepts = "accepts",
  DisputeRequests = "disputeRequests",
  DisputeRejections = "disputeRejections",
  DisputeUpdates = "disputeUpdates",
  SystemNotes = "systemNotes",
  UrgentNotes = "urgentNotes",
}
