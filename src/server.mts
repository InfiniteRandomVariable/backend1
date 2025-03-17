//file source src/server.mts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import phonesRouter from "./api/phones.mts"; // Ensure correct extension and path
import usersRouter from "./api/users.mts";
import listingsRouter from "./api/listings.mts";
import arbiterRouter from "./api/arbiter.mts";
import paymentRouter from "./api/payments.mts";
import adminRouter from "./api/admin.mts";
import tradeRouter from "./api/trades.mts";
import { Request, Response } from "express";
dotenv.config();

export const app = express();
const port = process.env.PORT || 3002;
var allowedOrigins = [`http://localhost:${port}`, "http://yourapp.com"];
// Apply middleware functions directly
//app.use(cors); // Explicitly cast cors as RequestHandler
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

app.use(express.json()); // Explicitly cast express.json()

const testMiddleware = (req: Request, res: Response, next: any) => {
  console.log("testMiddleware: before next");
  next();
  console.log("testMiddleware: after next"); // Should NOT see this if next() works correctly
};

const testRouteHandler = (req: Request, res: Response) => {
  console.log("testRouteHandler: Route handler called!");
  res.send("Route handler was called!");
};

app.get("/test", testMiddleware, testRouteHandler);

app.use("/api/users", usersRouter); // Use users router
app.use("/api/phones", phonesRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/arbiters", arbiterRouter);
app.use("/api/trades", tradeRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/admin", adminRouter);
app
  .listen(port, () => {
    console.log(`Backend server is running on port ${port}`);
  })
  .on("error", (err) => {
    // Add error listener for server
    console.error("Server error:", err);
  });
