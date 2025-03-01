// backend/src/db/seed.mts
import { db } from "./database.mjs";
import { v4 as uuidv4 } from "uuid";

async function seedDatabase() {
  try {
    console.log("Clearing existing data...");
    await db.deleteFrom("og.paymentIntents").execute();
    await db.deleteFrom("og.zelleAccounts").execute();
    await db.deleteFrom("og.venmoAccounts").execute();
    await db.deleteFrom("og.stripeAccounts").execute();
    await db.deleteFrom("og.arbiterTransactions").execute();
    await db.deleteFrom("og.feeRules").execute();
    await db.deleteFrom("og.adminBalances").execute();
    await db.deleteFrom("og.paymentToUsers").execute();
    await db.deleteFrom("og.sellerArbiterReviews").execute();
    await db.deleteFrom("og.buyerArbiterReviews").execute();
    await db.deleteFrom("og.arbiterSellerReviews").execute();
    await db.deleteFrom("og.arbiterBuyerReviews").execute();
    await db.deleteFrom("og.shipments").execute();
    await db.deleteFrom("og.disputeComments").execute();
    await db.deleteFrom("og.disputes").execute();
    await db.deleteFrom("og.payments").execute();
    await db.deleteFrom("og.purchaseOffers").execute();
    await db.deleteFrom("og.savedPhones").execute();
    await db.deleteFrom("og.phoneComments").execute();
    await db.deleteFrom("og.phonePosts").execute();
    await db.deleteFrom("og.phoneDetails").execute();
    await db.deleteFrom("og.phones").execute();
    await db.deleteFrom("og.userRatings").execute();
    await db.deleteFrom("og.userNotifications").execute();
    await db.deleteFrom("og.userAccounts").execute();
    await db.deleteFrom("og.arbiterProfiles").execute();
    await db.deleteFrom("og.authStatus").execute();
    await db.deleteFrom("og.auth").execute();
    await db.deleteFrom("og.userDetails").execute();
    await db.deleteFrom("og.staffs").execute();
    await db.deleteFrom("og.users").execute();
    console.log("Existing data cleared.");

    console.log("Seeding database...");

    // 1. og.users
    const usersToInsert = [
      { uName: "kevin" },
      { uName: "sellU" },
      { uName: "buyUr" },
      { uName: "arU" },
      { uName: "stU" },
      { uName: "aUser" },
    ];
    const insertedUsers = await Promise.all(
      usersToInsert.map((user) =>
        db.insertInto("og.users").values(user).returningAll().executeTakeFirst()
      )
    );
    console.log("og.users seeded successfully:", insertedUsers);
    if (
      !insertedUsers[0] ||
      !insertedUsers[1] ||
      !insertedUsers[2] ||
      !insertedUsers[3] ||
      !insertedUsers[4] ||
      !insertedUsers[5]
    ) {
      throw new Error("Failed to insert users, needed for FK constraints");
    }
    const kevinUser = insertedUsers[0];
    const sellerUser = insertedUsers[1];
    const buyerUser = insertedUsers[2];
    const arbiterUser = insertedUsers[3];
    const staffUser = insertedUsers[4];
    const adminUser = insertedUsers[5];

    // 2. og.staffs
    const staffsToInsert = [
      { name: "Staff 1", transferOfficer: true, status: 1 },
    ];
    const insertedStaffs = await Promise.all(
      staffsToInsert.map((staff) =>
        db
          .insertInto("og.staffs")
          .values(staff)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.staffs seeded successfully:", insertedStaffs);
    if (!insertedStaffs[0]) {
      throw new Error("Failed to insert staffs, needed for FK constraints");
    }
    const staff1 = insertedStaffs[0];

    // 3. og.userDetails
    const userDetailsToInsert = [
      {
        userIdFk: kevinUser.id,
        email: "kevin@example.com",
        add_1: "Address 1 Kevin",
        zipCode: 123,
        phone: "123-456-7890",
      },
      {
        userIdFk: sellerUser.id,
        email: "seller@example.com",
        add_1: "Address 1 Seller",
        zipCode: 543,
        phone: "987-654-3210",
      },
      {
        userIdFk: buyerUser.id,
        email: "buyer@example.com",
        add_1: "Address 1 Buyer",
        zipCode: 678,
        phone: "111-222-3333",
      },
      {
        userIdFk: arbiterUser.id,
        email: "arbiter@example.com",
        add_1: "Address 1 Arbiter",
        zipCode: 135,
        phone: "444-555-6666",
      },
      {
        userIdFk: staffUser.id,
        email: "staff@example.com",
        add_1: "Address 1 Staff",
        zipCode: 246,
        phone: "777-888-9999",
      },
      {
        userIdFk: adminUser.id,
        email: "admin@example.com",
        add_1: "Address 1 Admin",
        zipCode: 987,
        phone: "000-111-2222",
      },
    ];
    const insertedUserDetails = await Promise.all(
      userDetailsToInsert.map((userDetail) =>
        db
          .insertInto("og.userDetails")
          .values(userDetail)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.userDetails seeded successfully:", insertedUserDetails);
    if (
      !insertedUserDetails[0] ||
      !insertedUserDetails[1] ||
      !insertedUserDetails[2] ||
      !insertedUserDetails[3] ||
      !insertedUserDetails[4] ||
      !insertedUserDetails[5]
    ) {
      throw new Error(
        "Failed to insert userDetails, needed for FK constraints"
      );
    }
    const kevinDetail = insertedUserDetails[0];
    const sellerDetail = insertedUserDetails[1];
    const buyerDetail = insertedUserDetails[2];
    const arbiterDetail = insertedUserDetails[3];
    const staffDetail = insertedUserDetails[4];
    const adminDetail = insertedUserDetails[5];

    // 4. og.auth
    const authsToInsert = [
      { emailFk: kevinDetail.email, passwordSalt: "salt123kevin" },
      { emailFk: sellerDetail.email, passwordSalt: "salt123seller" },
      { emailFk: buyerDetail.email, passwordSalt: "salt123buyer" },
      { emailFk: arbiterDetail.email, passwordSalt: "salt123arbiter" },
      { emailFk: staffDetail.email, passwordSalt: "salt123staff" },
      { emailFk: adminDetail.email, passwordSalt: "salt123admin" },
    ];
    const insertedAuths = await Promise.all(
      authsToInsert.map((auth) =>
        db.insertInto("og.auth").values(auth).returningAll().executeTakeFirst()
      )
    );
    console.log("og.auth seeded successfully:", insertedAuths);
    if (
      !insertedAuths[0] ||
      !insertedAuths[1] ||
      !insertedAuths[2] ||
      !insertedAuths[3] ||
      !insertedAuths[4] ||
      !insertedAuths[5]
    ) {
      throw new Error("Failed to insert auths, needed for FK constraints");
    }

    // 5. og.authStatus
    const authStatusesToInsert = [
      {
        userIdFk: kevinUser.id,
        verifiedEmail: true,
        verifiedPhone: true,
        verifiedUserId: true,
        userStatus: 1,
        isArbiter: false,
      },
      {
        userIdFk: sellerUser.id,
        verifiedEmail: true,
        verifiedPhone: true,
        verifiedUserId: true,
        userStatus: 1,
        isArbiter: false,
      },
      {
        userIdFk: buyerUser.id,
        verifiedEmail: true,
        verifiedPhone: true,
        verifiedUserId: true,
        userStatus: 1,
        isArbiter: false,
      },
      {
        userIdFk: arbiterUser.id,
        verifiedEmail: true,
        verifiedPhone: true,
        verifiedUserId: true,
        userStatus: 1,
        isArbiter: true,
      },
      {
        userIdFk: staffUser.id,
        verifiedEmail: true,
        verifiedPhone: true,
        verifiedUserId: true,
        userStatus: 1,
        isArbiter: false,
      },
      {
        userIdFk: adminUser.id,
        verifiedEmail: true,
        verifiedPhone: true,
        verifiedUserId: true,
        userStatus: 1,
        isArbiter: false,
      },
    ];
    const insertedAuthStatuses = await Promise.all(
      authStatusesToInsert.map((authStatus) =>
        db
          .insertInto("og.authStatus")
          .values(authStatus)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.authStatus seeded successfully:", insertedAuthStatuses);
    if (
      !insertedAuthStatuses[0] ||
      !insertedAuthStatuses[1] ||
      !insertedAuthStatuses[2] ||
      !insertedAuthStatuses[3] ||
      !insertedAuthStatuses[4] ||
      !insertedAuthStatuses[5]
    ) {
      throw new Error("Failed to insert authStatus, needed for FK constraints");
    }

    // 6. og.arbiterProfiles
    const arbiterProfilesToInsert = [
      {
        arbiterUserIdFk: arbiterUser.id,
        status: 1,
        lastLoggedIn: new Date(),
        arbiterName: "Arbiter One",
      },
    ];
    const insertedArbiterProfiles = await Promise.all(
      arbiterProfilesToInsert.map((arbiterProfile) =>
        db
          .insertInto("og.arbiterProfiles")
          .values(arbiterProfile)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.arbiterProfiles seeded successfully:",
      insertedArbiterProfiles
    );
    if (!insertedArbiterProfiles[0]) {
      throw new Error(
        "Failed to insert arbiterProfiles, needed for FK constraints"
      );
    }
    const arbiterProfile1 = insertedArbiterProfiles[0];

    // 7. og.userAccounts
    const userAccountsToInsert = [
      { userIdFk: kevinUser.id, balance: 1000.0, status: 1 },
      { userIdFk: sellerUser.id, balance: 500.0, status: 1 },
      { userIdFk: buyerUser.id, balance: 2000.0, status: 1 },
      { userIdFk: arbiterUser.id, balance: 100.0, status: 1 },
      { userIdFk: staffUser.id, balance: 0.0, status: 1 },
      { userIdFk: adminUser.id, balance: 0.0, status: 1 },
    ];
    const insertedUserAccounts = await Promise.all(
      userAccountsToInsert.map((userAccount) =>
        db
          .insertInto("og.userAccounts")
          .values(userAccount)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.userAccounts seeded successfully:", insertedUserAccounts);
    if (
      !insertedUserAccounts[0] ||
      !insertedUserAccounts[1] ||
      !insertedUserAccounts[2] ||
      !insertedUserAccounts[3] ||
      !insertedUserAccounts[4] ||
      !insertedUserAccounts[5]
    ) {
      throw new Error(
        "Failed to insert userAccounts, needed for FK constraints"
      );
    }

    // 8. og.userNotifications
    const userNotificationsToInsert = [
      {
        userIdFk: kevinUser.id,
        offers: 0,
        purchases: 0,
        accepts: 0,
        messages: 0,
        rejectOffers: 0,
        systemNotes: 0,
        urgentNotes: 0,
        disputeUpdates: 0,
        disputeRequests: 0,
        disputeRejections: 0,
      },
      {
        userIdFk: sellerUser.id,
        offers: 0,
        purchases: 0,
        accepts: 0,
        messages: 0,
        rejectOffers: 0,
        systemNotes: 0,
        urgentNotes: 0,
        disputeUpdates: 0,
        disputeRequests: 0,
        disputeRejections: 0,
      },
      {
        userIdFk: buyerUser.id,
        offers: 0,
        purchases: 0,
        accepts: 0,
        messages: 0,
        rejectOffers: 0,
        systemNotes: 0,
        urgentNotes: 0,
        disputeUpdates: 0,
        disputeRequests: 0,
        disputeRejections: 0,
      },
      {
        userIdFk: arbiterUser.id,
        offers: 0,
        purchases: 0,
        accepts: 0,
        messages: 0,
        rejectOffers: 0,
        systemNotes: 0,
        urgentNotes: 0,
        disputeUpdates: 0,
        disputeRequests: 0,
        disputeRejections: 0,
      },
      {
        userIdFk: staffUser.id,
        offers: 0,
        purchases: 0,
        accepts: 0,
        messages: 0,
        rejectOffers: 0,
        systemNotes: 0,
        urgentNotes: 0,
        disputeUpdates: 0,
        disputeRequests: 0,
        disputeRejections: 0,
      },
      {
        userIdFk: adminUser.id,
        offers: 0,
        purchases: 0,
        accepts: 0,
        messages: 0,
        rejectOffers: 0,
        systemNotes: 0,
        urgentNotes: 0,
        disputeUpdates: 0,
        disputeRequests: 0,
        disputeRejections: 0,
      },
    ];
    const insertedUserNotifications = await Promise.all(
      userNotificationsToInsert.map((userNotification) =>
        db
          .insertInto("og.userNotifications")
          .values(userNotification)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.userNotifications seeded successfully:",
      insertedUserNotifications
    );
    if (
      !insertedUserNotifications[0] ||
      !insertedUserNotifications[1] ||
      !insertedUserNotifications[2] ||
      !insertedUserNotifications[3] ||
      !insertedUserNotifications[4] ||
      !insertedUserNotifications[5]
    ) {
      throw new Error(
        "Failed to insert userNotifications, needed for FK constraints"
      );
    }

    // 9. og.userRatings
    const userRatingsToInsert = [
      { userIdFk: kevinUser.id },
      { userIdFk: sellerUser.id },
      { userIdFk: buyerUser.id },
      { userIdFk: arbiterUser.id },
      { userIdFk: staffUser.id },
      { userIdFk: adminUser.id },
    ];
    const insertedUserRatings = await Promise.all(
      userRatingsToInsert.map((userRating) =>
        db
          .insertInto("og.userRatings")
          .values(userRating)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.userRatings seeded successfully:", insertedUserRatings);
    if (
      !insertedUserRatings[0] ||
      !insertedUserRatings[1] ||
      !insertedUserRatings[2] ||
      !insertedUserRatings[3] ||
      !insertedUserRatings[4] ||
      !insertedUserRatings[5]
    ) {
      throw new Error(
        "Failed to insert userRatings, needed for FK constraints"
      );
    }

    // 10. og.phones
    const phonesToInsert = [
      {
        model: 1,
        userIdFk: sellerUser.id,
        photoNum: 1,
        createdDate: new Date(),
        price: 500,
        saved: 0,
        condition: 1,
        carrier: 2,
        status: 1,
        coverPhotoUrl: "https://example.com/phone1.jpg",
        currency: "USD",
      },
      {
        model: 2,
        userIdFk: sellerUser.id,
        photoNum: 2,
        createdDate: new Date(),
        price: 800,
        saved: 0,
        condition: 2,
        carrier: 2,
        status: 1,
        coverPhotoUrl: "https://example.com/phone2.jpg",
        currency: "USD",
      },
    ];
    const insertedPhones = await Promise.all(
      phonesToInsert.map((phone) =>
        db
          .insertInto("og.phones")
          .values(phone)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.phones seeded successfully:", insertedPhones);
    if (!insertedPhones[0] || !insertedPhones[1]) {
      throw new Error("Failed to insert phones, needed for FK constraints");
    }
    const phone1 = insertedPhones[0];
    const phone2 = insertedPhones[1];

    // 11. og.phoneDetails
    const phoneDetailsToInsert = [
      {
        phoneIdFk: phone1.id,
        condition: "Good".trim(),
        damage: "None".trim(),
        photoUrls: ["url1", "url2"],
        color: "Black".trim(),
        storage: 64,
        battery: 90,
      },
      {
        phoneIdFk: phone2.id,
        condition: "Excellent".trim(),
        damage: "Minor scratch".trim(),
        photoUrls: ["url3", "url4"],
        color: "Silver".trim(),
        storage: 128,
        battery: 95,
      },
    ];
    const insertedPhoneDetails = await Promise.all(
      phoneDetailsToInsert.map((phoneDetail) =>
        db
          .insertInto("og.phoneDetails")
          .values(phoneDetail)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.phoneDetails seeded successfully:", insertedPhoneDetails);
    if (!insertedPhoneDetails[0] || !insertedPhoneDetails[1]) {
      throw new Error(
        "Failed to insert phoneDetails, needed for FK constraints"
      );
    }
    const phoneDetail1 = insertedPhoneDetails[0];
    const phoneDetail2 = insertedPhoneDetails[1];

    // 12. og.phonePosts
    const phonePostsToInsert = [
      {
        phoneIdFk: phone1.id,
        phoneType: 1,
        authorUserIdFk: sellerUser.id,
        receiverUserIdFk: buyerUser.id,
        createdBy: new Date(),
        text: "My phone",
      },
      {
        phoneIdFk: phone2.id,
        phoneType: 1,
        authorUserIdFk: sellerUser.id,
        receiverUserIdFk: buyerUser.id,
        createdBy: new Date(),
        text: "New phone",
      },
    ];
    const insertedPhonePosts = await Promise.all(
      phonePostsToInsert.map((phonePost) =>
        db
          .insertInto("og.phonePosts")
          .values(phonePost)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.phonePosts seeded successfully:", insertedPhonePosts);
    if (!insertedPhonePosts[0] || !insertedPhonePosts[1]) {
      throw new Error("Failed to insert phonePosts, needed for FK constraints");
    }
    const phonePost1 = insertedPhonePosts[0];
    const phonePost2 = insertedPhonePosts[1];

    // 13. og.phoneComments
    const phoneCommentsToInsert = [
      {
        phonePostIdFk: phonePost1.id,
        commenterUserIdFk: buyerUser.id,
        createdBy: new Date(),
        message: "Interested!",
      },
      {
        phonePostIdFk: phonePost1.id,
        commenterUserIdFk: sellerUser.id,
        createdBy: new Date(),
        message: "It is available",
      },
    ];
    const insertedPhoneComments = await Promise.all(
      phoneCommentsToInsert.map((phoneComment) =>
        db
          .insertInto("og.phoneComments")
          .values(phoneComment)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.phoneComments seeded successfully:", insertedPhoneComments);
    if (!insertedPhoneComments[0] || !insertedPhoneComments[1]) {
      throw new Error(
        "Failed to insert phoneComments, needed for FK constraints"
      );
    }
    const phoneComment1 = insertedPhoneComments[0];
    const phoneComment2 = insertedPhoneComments[1];

    // 14. og.savedPhones
    const savedPhonesToInsert = [
      { userIdFk: buyerUser.id, phoneIdFk: phone1.id },
      { userIdFk: buyerUser.id, phoneIdFk: phone2.id },
    ];
    const insertedSavedPhones = await Promise.all(
      savedPhonesToInsert.map((savedPhone) =>
        db
          .insertInto("og.savedPhones")
          .values(savedPhone)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.savedPhones seeded successfully:", insertedSavedPhones);
    if (!insertedSavedPhones[0] || !insertedSavedPhones[1]) {
      throw new Error(
        "Failed to insert savedPhones, needed for FK constraints"
      );
    }
    const savedPhone1 = insertedSavedPhones[0];
    const savedPhone2 = insertedSavedPhones[1];

    // 15. og.purchaseOffers
    const purchaseOffersToInsert = [
      {
        buyerUserIdFk: buyerUser.id,
        iphoneIdFk: phone1.id,
        createdAt: new Date(),
      },
      {
        buyerUserIdFk: buyerUser.id,
        iphoneIdFk: phone2.id,
        createdAt: new Date(),
      },
    ];
    const insertedPurchaseOffers = await Promise.all(
      purchaseOffersToInsert.map((purchaseOffer) =>
        db
          .insertInto("og.purchaseOffers")
          .values(purchaseOffer)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.purchaseOffers seeded successfully:",
      insertedPurchaseOffers
    );
    if (!insertedPurchaseOffers[0] || !insertedPurchaseOffers[1]) {
      throw new Error(
        "Failed to insert purchaseOffers, needed for FK constraints"
      );
    }
    const purchaseOffer1 = insertedPurchaseOffers[0];
    const purchaseOffer2 = insertedPurchaseOffers[1];

    // 16. og.payments
    const paymentsToInsert = [
      {
        purchaseOfferIdFk: purchaseOffer1.id,
        createdAt: new Date(),
        paymentSource: 1,
        verifierUserIdFk: staffUser.id,
        type: 1,
        status: 1,
      },
      {
        purchaseOfferIdFk: purchaseOffer2.id,
        createdAt: new Date(),
        paymentSource: 1,
        verifierUserIdFk: staffUser.id,
        type: 1,
        status: 1,
      },
    ];
    const insertedPayments = await Promise.all(
      paymentsToInsert.map((payment) =>
        db
          .insertInto("og.payments")
          .values(payment)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.payments seeded successfully:", insertedPayments);
    if (!insertedPayments[0] || !insertedPayments[1]) {
      throw new Error("Failed to insert payments, needed for FK constraints");
    }
    const payment1 = insertedPayments[0];
    const payment2 = insertedPayments[1];

    // 17. og.disputes
    const disputesToInsert = [
      {
        paymentIdFk: payment1.id,
        createdAt: new Date(),
        status: 1,
        didAppeal: false,
        authorUserIdFk: buyerUser.id,
        authorRole: "buyer",
      },
      {
        paymentIdFk: payment2.id,
        createdAt: new Date(),
        status: 1,
        didAppeal: false,
        authorUserIdFk: sellerUser.id,
        authorRole: "seller",
      },
    ];
    const insertedDisputes = await Promise.all(
      disputesToInsert.map((dispute) =>
        db
          .insertInto("og.disputes")
          .values(dispute)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.disputes seeded successfully:", insertedDisputes);
    if (!insertedDisputes[0] || !insertedDisputes[1]) {
      throw new Error("Failed to insert disputes, needed for FK constraints");
    }
    const dispute1 = insertedDisputes[0];
    const dispute2 = insertedDisputes[1];

    // 18. og.disputeComments
    const disputeCommentsToInsert = [
      {
        disputeIdFk: dispute1.id,
        commenterUserIdFk: buyerUser.id,
        createdAt: new Date(),
        senderRole: "buyer",
        recipientRole: "seller",
        message: "Seller not responding",
      },
      {
        disputeIdFk: dispute1.id,
        commenterUserIdFk: arbiterUser.id,
        createdAt: new Date(),
        senderRole: "arbiter",
        recipientRole: "buyer",
        message: "Awaiting seller response",
      },
    ];
    const insertedDisputeComments = await Promise.all(
      disputeCommentsToInsert.map((disputeComment) =>
        db
          .insertInto("og.disputeComments")
          .values(disputeComment)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.disputeComments seeded successfully:",
      insertedDisputeComments
    );
    if (!insertedDisputeComments[0] || !insertedDisputeComments[1]) {
      throw new Error(
        "Failed to insert disputeComments, needed for FK constraints"
      );
    }
    const disputeComment1 = insertedDisputeComments[0];
    const disputeComment2 = insertedDisputeComments[1];

    // 19. og.shipments
    const shipmentsToInsert = [
      {
        purchaseOfferIdFk: purchaseOffer1.id,
        sellerUserIdFk: sellerUser.id,
        buyerUserIdFk: buyerUser.id,
      },
      {
        purchaseOfferIdFk: purchaseOffer2.id,
        sellerUserIdFk: sellerUser.id,
        buyerUserIdFk: buyerUser.id,
      },
    ];
    const insertedShipments = await Promise.all(
      shipmentsToInsert.map((shipment) =>
        db
          .insertInto("og.shipments")
          .values(shipment)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.shipments seeded successfully:", insertedShipments);
    if (!insertedShipments[0] || !insertedShipments[1]) {
      throw new Error("Failed to insert shipments, needed for FK constraints");
    }
    const shipment1 = insertedShipments[0];
    const shipment2 = insertedShipments[1];

    // 20. og.arbiterBuyerReviews
    const arbiterBuyerReviewsToInsert = [
      {
        disputeIdFk: dispute1.id,
        arbiterUserIdFk: arbiterUser.id,
        buyerUserIdFk: buyerUser.id,
        rating: 4,
        review: "Good arbitration",
      },
    ];
    const insertedArbiterBuyerReviews = await Promise.all(
      arbiterBuyerReviewsToInsert.map((arbiterBuyerReview) =>
        db
          .insertInto("og.arbiterBuyerReviews")
          .values(arbiterBuyerReview)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.arbiterBuyerReviews seeded successfully:",
      insertedArbiterBuyerReviews
    );
    if (!insertedArbiterBuyerReviews[0]) {
      throw new Error(
        "Failed to insert arbiterBuyerReviews, needed for FK constraints"
      );
    }
    const arbiterBuyerReview1 = insertedArbiterBuyerReviews[0];

    // 21. og.arbiterSellerReviews
    const arbiterSellerReviewsToInsert = [
      {
        disputeIdFk: dispute1.id,
        arbiterUserIdFk: arbiterUser.id,
        sellerUserIdFk: sellerUser.id,
        rating: 5,
        review: "Excellent service",
      },
    ];
    const insertedArbiterSellerReviews = await Promise.all(
      arbiterSellerReviewsToInsert.map((arbiterSellerReview) =>
        db
          .insertInto("og.arbiterSellerReviews")
          .values(arbiterSellerReview)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.arbiterSellerReviews seeded successfully:",
      insertedArbiterSellerReviews
    );
    if (!insertedArbiterSellerReviews[0]) {
      throw new Error(
        "Failed to insert arbiterSellerReviews, needed for FK constraints"
      );
    }
    const arbiterSellerReview1 = insertedArbiterSellerReviews[0];

    // 22. og.buyerArbiterReviews
    const buyerArbiterReviewsToInsert = [
      {
        disputeIdFk: dispute1.id,
        arbiterUserIdFk: arbiterUser.id,
        buyerUserIdFk: buyerUser.id,
        rating: 4,
        review: "Helpful arbiter",
      },
    ];
    const insertedBuyerArbiterReviews = await Promise.all(
      buyerArbiterReviewsToInsert.map((buyerArbiterReview) =>
        db
          .insertInto("og.buyerArbiterReviews")
          .values(buyerArbiterReview)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.buyerArbiterReviews seeded successfully:",
      insertedBuyerArbiterReviews
    );
    if (!insertedBuyerArbiterReviews[0]) {
      throw new Error(
        "Failed to insert buyerArbiterReviews, needed for FK constraints"
      );
    }
    const buyerArbiterReview1 = insertedBuyerArbiterReviews[0];

    // 23. og.sellerArbiterReviews
    const sellerArbiterReviewsToInsert = [
      {
        disputeIdFk: dispute1.id,
        arbiterUserIdFk: arbiterUser.id,
        sellerUserIdFk: sellerUser.id,
        rating: 5,
        review: "Fair decision",
      },
    ];
    const insertedSellerArbiterReviews = await Promise.all(
      sellerArbiterReviewsToInsert.map((sellerArbiterReview) =>
        db
          .insertInto("og.sellerArbiterReviews")
          .values(sellerArbiterReview)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.sellerArbiterReviews seeded successfully:",
      insertedSellerArbiterReviews
    );
    if (!insertedSellerArbiterReviews[0]) {
      throw new Error(
        "Failed to insert sellerArbiterReviews, needed for FK constraints"
      );
    }
    const sellerArbiterReview1 = insertedSellerArbiterReviews[0];

    // 24. og.paymentToUsers
    const paymentToUsersToInsert = [
      {
        staffIdFk: staff1.id,
        userIdFk: arbiterUser.id,
        amount: 50.0,
        currency: "USD",
      },
    ];
    const insertedPaymentToUsers = await Promise.all(
      paymentToUsersToInsert.map((paymentToUser) =>
        db
          .insertInto("og.paymentToUsers")
          .values({ ...paymentToUser, id: 1 })
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.paymentToUsers seeded successfully:",
      insertedPaymentToUsers
    );
    if (!insertedPaymentToUsers[0]) {
      throw new Error(
        "Failed to insert paymentToUsers, needed for FK constraints"
      );
    }
    const paymentToUser1 = insertedPaymentToUsers[0];

    // 25. og.adminBalances
    const adminBalancesToInsert = [{ id: true, balance: 10000.0 }];
    const insertedAdminBalances = await Promise.all(
      adminBalancesToInsert.map((adminBalance) =>
        db
          .insertInto("og.adminBalances")
          .values(adminBalance)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.adminBalances seeded successfully:", insertedAdminBalances);
    if (!insertedAdminBalances[0]) {
      throw new Error(
        "Failed to insert adminBalances, needed for FK constraints"
      );
    }
    const adminBalance1 = insertedAdminBalances[0];

    // 26. og.feeRules
    const feeRulesToInsert = [
      { feeRules: true, arbiterPercentageFee: 5, arbiterFixedFee: 10 },
    ];
    const insertedFeeRules = await Promise.all(
      feeRulesToInsert.map((feeRule) =>
        db
          .insertInto("og.feeRules")
          .values(feeRule)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.feeRules seeded successfully:", insertedFeeRules);
    if (!insertedFeeRules[0]) {
      throw new Error("Failed to insert feeRules, needed for FK constraints");
    }
    const feeRule1 = insertedFeeRules[0];

    // 27. og.arbiterTransactions
    const arbiterTransactionsToInsert = [
      {
        purchaseOfferIdFk: purchaseOffer1.id,
        status: 1,
        arbiterUserIdFk: arbiterUser.id,
        plaintiffUserIdFk: buyerUser.id,
        fee: 25.0,
        plaintiffIsBuyer: true,
      },
    ];
    const insertedArbiterTransactions = await Promise.all(
      arbiterTransactionsToInsert.map((arbiterTransaction) =>
        db
          .insertInto("og.arbiterTransactions")
          .values(arbiterTransaction)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.arbiterTransactions seeded successfully:",
      insertedArbiterTransactions
    );
    if (!insertedArbiterTransactions[0]) {
      throw new Error(
        "Failed to insert arbiterTransactions, needed for FK constraints"
      );
    }
    const arbiterTransaction1 = insertedArbiterTransactions[0];

    // 34. og.stripeAccounts
    const stripeAccountsToInsert = [
      {
        userIdFk: sellerUser.id,
        stripeAccountId: "acct_123seller",
        accountType: "seller_payout",
        accountStatus: "verified",
      },
      {
        userIdFk: arbiterUser.id,
        stripeAccountId: "acct_123arbiter",
        accountType: "arbiter_payout",
        accountStatus: "verified",
      },
      {
        userIdFk: adminUser.id,
        stripeAccountId: "acct_123admin",
        accountType: "company_platform",
        accountStatus: "verified",
      },
    ];
    const insertedStripeAccounts = await Promise.all(
      stripeAccountsToInsert.map((stripeAccount) =>
        db
          .insertInto("og.stripeAccounts")
          .values(stripeAccount)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.stripeAccounts seeded successfully:",
      insertedStripeAccounts
    );
    if (
      !insertedStripeAccounts[0] ||
      !insertedStripeAccounts[1] ||
      !insertedStripeAccounts[2]
    ) {
      throw new Error(
        "Failed to insert stripeAccounts, needed for FK constraints"
      );
    }
    const stripeAccount1 = insertedStripeAccounts[0];
    const stripeAccount2 = insertedStripeAccounts[1];
    const stripeAccountAdmin = insertedStripeAccounts[2];

    // 35. og.venmoAccounts
    const venmoAccountsToInsert = [
      {
        userIdFk: buyerUser.id,
        venmoAccountId: "venmo_user_buyer",
        accountType: "buyer_payment",
        accountStatus: "active",
      },
    ];
    const insertedVenmoAccounts = await Promise.all(
      venmoAccountsToInsert.map((venmoAccount) =>
        db
          .insertInto("og.venmoAccounts")
          .values(venmoAccount)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.venmoAccounts seeded successfully:", insertedVenmoAccounts);
    if (!insertedVenmoAccounts[0]) {
      throw new Error(
        "Failed to insert venmoAccounts, needed for FK constraints"
      );
    }
    const venmoAccount1 = insertedVenmoAccounts[0];

    // 36. og.zelleAccounts
    const zelleAccountsToInsert = [
      {
        userIdFk: buyerUser.id,
        zelleAccountId: "zelle_user_buyer@email.com",
        accountType: "buyer_payment",
        accountStatus: "active",
      },
    ];
    const insertedZelleAccounts = await Promise.all(
      zelleAccountsToInsert.map((zelleAccount) =>
        db
          .insertInto("og.zelleAccounts")
          .values(zelleAccount)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log("og.zelleAccounts seeded successfully:", insertedZelleAccounts);
    if (!insertedZelleAccounts[0]) {
      throw new Error(
        "Failed to insert zelleAccounts, needed for FK constraints"
      );
    }
    const zelleAccount1 = insertedZelleAccounts[0];

    // 37. og.paymentIntents (after stripe, venmo, zelle accounts are seeded)
    const paymentIntentsToInsert = [
      {
        purchaseOfferIdFk: purchaseOffer1.id,
        paymentGateway: "stripe",
        intentType: "purchase",
        gatewayPaymentIntentId: "pi_123intent1",
        transactionRecordUrl: "https://stripe.com/record1",
        paymentIntentRecordKey: uuidv4(),
      },
      {
        purchaseOfferIdFk: purchaseOffer2.id,
        paymentGateway: "venmo",
        intentType: "purchase",
        gatewayPaymentIntentId: "venmo_intent2",
        transactionRecordUrl: "https://venmo.com/record2",
        paymentIntentRecordKey: uuidv4(),
      },
      {
        purchaseOfferIdFk: purchaseOffer2.id,
        paymentGateway: "zelle",
        intentType: "purchase",
        gatewayPaymentIntentId: "zelle_intent3",
        transactionRecordUrl: "https://zelle.com/record3",
        paymentIntentRecordKey: uuidv4(),
      },
    ];
    const insertedPaymentIntents = await Promise.all(
      paymentIntentsToInsert.map((paymentIntent) =>
        db
          .insertInto("og.paymentIntents")
          .values(paymentIntent)
          .returningAll()
          .executeTakeFirst()
      )
    );
    console.log(
      "og.paymentIntents seeded successfully:",
      insertedPaymentIntents
    );
    if (
      !insertedPaymentIntents[0] ||
      !insertedPaymentIntents[1] ||
      !insertedPaymentIntents[2]
    ) {
      throw new Error(
        "Failed to insert paymentIntents, needed for FK constraints"
      );
    }
    const paymentIntent1 = insertedPaymentIntents[0];
    const paymentIntent2 = insertedPaymentIntents[1];
    const paymentIntent3 = insertedPaymentIntents[2];

    console.log("All tables seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await db.destroy();
  }
}

seedDatabase();
