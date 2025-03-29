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

export enum PaymentStatus {
  // Initial/Pending States
  Pending = 1, // Initial state when a payment record is created (might not be used immediately in manual flow)
  ProofSubmitted = 10, // Buyer has submitted proof of payment

  // Verification States (for manual proof)
  VerificationPending = 20, // Payment proof is awaiting review
  Verified = 30, // Payment proof has been accepted
  VerificationFailed = 40, // Payment proof was rejected

  // Processing States (for automated gateways)
  Processing = 50, // Payment is currently being processed
  AuthorizationPending = 51, // Payment authorization is pending
  Authorized = 52, // Payment has been authorized
  Captured = 53, // Payment has been captured (money moved)
  PartiallyCaptured = 54, // Only part of the payment has been captured

  // Successful Outcome States
  Paid = 60, // Payment has been successfully processed and confirmed
  Completed = 61, // Payment process is fully completed

  // Failed/Rejected States
  Failed = 70, // Payment attempt failed
  Rejected = 71, // Payment was explicitly rejected (e.g., by gateway or verifier)

  // Refund States
  RefundInitiated = 80, // Refund process has been started
  Refunded = 81, // Payment has been fully refunded
  PartiallyRefunded = 82, // Payment has been partially refunded

  // Cancellation/Void States
  Voided = 90, // Payment authorization was voided (before capture)
  Cancelled = 91, // Payment was cancelled by buyer or seller

  // Dispute States
  DisputeOpened = 100, // A dispute has been opened for this payment
  DisputeResolvedBuyerWon = 110, // Dispute resolved in favor of the buyer
  DisputeResolvedSellerWon = 120, // Dispute resolved in favor of the seller

  // Other States
  Expired = 130, // Payment authorization has expired
  AwaitingBuyerAction = 140, // Waiting for the buyer to take some action related to the payment

  // Specific to manual flows (can be more descriptive)
  ManualVerificationPending = 150, // Alias for VerificationPending
  ManualPaymentReceived = 160, // Payment confirmed through manual proof

  // You can add more specific statuses as needed for your workflow
}

export enum PaymentSource {
  // Digital Payment Platforms and Mobile Payment Services
  Zelle = 201,
  Venmo = 203,
  CashApp = 202,
  ApplePayStandalone = 204, // As a standalone service
  GooglePayStandalone = 205, // As a standalone service
  SamsungWallet = 206,

  // Payment Gateways and Processors
  Stripe = 1,
  PayPal = 2,
  Square = 3,
  Adyen = 4,
  Braintree = 5,
  AuthorizeNet = 6,
  Worldpay = 7,
  Fiserv = 8,
  GlobalPayments = 9,
  ChasePaymentSolutions = 10,
  BankOfAmericaMerchantServices = 11,
  WellsFargoMerchantServices = 12,
  Elavon = 13,
  NMI = 14,
  PaylineData = 15,
  ShopifyPayments = 16,
  AmazonPay = 17,
  ApplePay = 18, // As used through gateways
  GooglePay = 19, // As used through gateways
  TwoCheckout = 20,
  BlueSnap = 21,
  PayU = 22,
  Bolt = 23,
  CheckoutCom = 24,

  // Major National Banks
  BankOfAmerica = 101,
  JPMorganChase = 102,
  WellsFargo = 103,
  Citibank = 104,
  USBank = 105,
  CapitalOne = 106,
  Truist = 107,
  PNCBank = 108,
  TDBank = 109,
  CitizensBank = 110,
  FifthThirdBank = 111,
  // Other
  Other = 999,
}

export enum PaymentType {
  // Primary Purchase Types
  ProductPurchase = 1,
  ServicePurchase = 2,
  DigitalProductPurchase = 3,
  SubscriptionPayment = 4,
  MembershipFee = 5,

  // Dispute Related Payments
  DisputeSettlement = 10,
  DisputeRefund = 11, // Refund issued as a result of a dispute
  DisputeEscalationFee = 12,
  DisputeFee = 13, // Fee charged for opening a dispute

  // Arbiter Related Payments
  ArbiterFee = 15, // Fee paid to an arbiter
  ArbiterFeeRefund = 16, // Refund of the arbiter fee

  // Fees and Taxes
  ShippingFee = 20,
  HandlingFee = 21,
  SalesTax = 22,
  PlatformFee = 23,
  TransactionFee = 24,
  SellerFee = 25, // Fee charged to the seller by the platform
  SellerFeeRefund = 26, // Refund of the seller fee

  // Other Transaction Types
  Donation = 30,
  Gratuity = 31,
  GiftCardPurchase = 32,
  StoreCreditPurchase = 33,

  // Refund and Cancellation Related
  Refund = 40, // General refund (not specifically dispute-related)
  PartialRefund = 41,
  CancellationFee = 42,

  // Payouts (Platform to Sellers)
  SellerPayment = 50, // Payment made to the seller for a sale
  AffiliatePayout = 51,

  // Other
  Other = 999,
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
  PaymnetPendingApproval = "PaymnetPendingApproval",
}

export enum PhoneModel {
  // Apple iPhone models
  IPhone7 = 0,
  IPhone7Plus = 1,
  IPhone8 = 2,
  IPhone8Plus = 3,
  IPhoneX = 4,
  IPhoneXR = 5,
  IPhoneXS = 6,
  IPhoneXSMax = 7,
  IPhone11 = 8,
  IPhone11Pro = 9,
  IPhone11ProMax = 10,
  IPhone12 = 11,
  IPhone12Mini = 12,
  IPhone12Pro = 13,
  IPhone12ProMax = 14,
  IPhone13 = 15,
  IPhone13Mini = 16,
  IPhone13Pro = 17,
  IPhone13ProMax = 18,
  IPhone14 = 19,
  IPhone14Plus = 20,
  IPhone14Pro = 21,
  IPhone14ProMax = 22,
  IPhone15 = 23,
  IPhone15Plus = 24,
  IPhone15Pro = 25,
  IPhone15ProMax = 26,
  IPhone16 = 27,
  IPhone16Plus = 28,
  IPhone16Pro = 29,
  IPhone16ProMax = 30,
  IPhoneSE2 = 31, // 2020
  IPhoneSE3 = 32, // 2022
  IPhone17 = 100,
  IPhone17Plus = 101,
  IPhone17Pro = 102,
  IPhone17ProMax = 103,

  // Samsung Galaxy models
  GalaxyS7 = 33,
  GalaxyS7Edge = 34,
  GalaxyS8 = 35,
  GalaxyS8Plus = 36,
  GalaxyS9 = 37,
  GalaxyS9Plus = 38,
  GalaxyS10 = 39,
  GalaxyS10Plus = 40,
  GalaxyS10e = 41,
  GalaxyS20 = 42,
  GalaxyS20Plus = 43,
  GalaxyS20Ultra = 44,
  GalaxyS21 = 45,
  GalaxyS21Plus = 46,
  GalaxyS21Ultra = 47,
  GalaxyS22 = 48,
  GalaxyS22Plus = 49,
  GalaxyS22Ultra = 50,
  GalaxyS23 = 51,
  GalaxyS23Plus = 52,
  GalaxyS23Ultra = 53,
  GalaxyS24 = 54,
  GalaxyS24Plus = 55,
  GalaxyS24Ultra = 56,
  GalaxyS25 = 57, // Assuming release in 2025
  GalaxyS25Plus = 58,
  GalaxyS25Ultra = 59,
  GalaxyA14 = 60, // Popular budget model
  GalaxyA15 = 61,
  GalaxyA54 = 62,
  GalaxyZFlip5 = 63,
  GalaxyZFold5 = 64,
  GalaxyZFlip6 = 65, // 2024
  GalaxyZFold6 = 66,

  // Google Pixel models
  Pixel3 = 67,
  Pixel3XL = 68,
  Pixel4 = 69,
  Pixel4XL = 70,
  Pixel5 = 71,
  Pixel6 = 72,
  Pixel6Pro = 73,
  Pixel7 = 74,
  Pixel7Pro = 75,
  Pixel8 = 76,
  Pixel8Pro = 77,
  Pixel9 = 78, // 2024
  Pixel9Pro = 79,
  Pixel9ProXL = 80,
  Pixel9ProFold = 81,
  Pixel8a = 82,

  // Motorola models
  MotoGPower2023 = 83,
  MotoGStylus2023 = 84,
  MotoEdge2023 = 85,
  MotoRazr2023 = 86,
  MotoRazrPlus2024 = 87,
  MotoEdge2024 = 88,

  // OnePlus models
  OnePlus8 = 89,
  OnePlus8Pro = 90,
  OnePlus9 = 91,
  OnePlus9Pro = 92,
  OnePlus10Pro = 93,
  OnePlus11 = 94,
  OnePlus12 = 95,
  OnePlus13 = 96, // Assuming 2025 release

  // Other notable brands
  NokiaG400 = 97, // HMD Global
  XiaomiRedmiNote13 = 98, // Emerging in USA
  SonyXperia1V = 99,
}
