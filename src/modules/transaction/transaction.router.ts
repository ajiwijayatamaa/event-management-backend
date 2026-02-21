import express, { Router } from "express";
import { TransactionController } from "./transaction.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UploadMiddleware } from "../../middlewares/upload.middleware.js";

export class TransactionRouter {
  private router: Router;

  constructor(
    private transactionController: TransactionController,
    private authMiddleware: AuthMiddleware,
    private uploadMiddleware: UploadMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    // Organizer - lihat semua transaksi miliknya
    this.router.get(
      "/",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.authMiddleware.verifyRole(["ORGANIZER"]),
      this.transactionController.getTransactions,
    );

    // Customer - upload bukti pembayaran
    this.router.patch(
      "/:id/payment-proof",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.authMiddleware.verifyRole(["CUSTOMER"]),
      this.uploadMiddleware.upload().fields([{ name: "image", maxCount: 1 }]),
      this.transactionController.uploadPaymentProof,
    );

    // Organizer - accept transaksi
    this.router.patch(
      "/:id/accept",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.authMiddleware.verifyRole(["ORGANIZER"]),
      this.transactionController.acceptTransaction,
    );

    // Organizer - reject transaksi
    this.router.patch(
      "/:id/reject",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.authMiddleware.verifyRole(["ORGANIZER"]),
      this.transactionController.rejectTransaction,
    );
  };

  getRouter = () => {
    return this.router;
  };
}
