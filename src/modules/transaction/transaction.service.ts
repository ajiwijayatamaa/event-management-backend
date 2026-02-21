import {
  PrismaClient,
  TransactionStatus,
} from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";
import { MailService } from "../mail/mail.service.js";

export class TransactionService {
  constructor(
    private prisma: PrismaClient,
    private cloudinaryService: CloudinaryService,
    private mailService: MailService,
  ) {}

  // 1. GET semua transaksi milik organizer (filter by organizerId lewat event)
  getTransactions = async (organizerId: number) => {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        event: { organizerId },
        deletedAt: null,
      },
      include: {
        user: {
          select: { name: true, email: true, profilePicture: true },
        },
        event: {
          select: { name: true, slug: true },
        },
        voucher: {
          select: { voucherCode: true, discountPercentage: true },
        },
        coupon: {
          select: { couponCode: true, discountRate: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { data: transactions };
  };

  // 2. UPLOAD bukti pembayaran (customer)
  uploadPaymentProof = async (
    transactionId: number,
    userId: number,
    image: Express.Multer.File,
  ) => {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId, deletedAt: null },
    });

    if (!transaction) throw new ApiError("Transaksi tidak ditemukan", 404);

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new ApiError("Transaksi tidak bisa diupdate", 400);
    }

    const { secure_url } = await this.cloudinaryService.upload(image);

    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentProof: secure_url,
        paymentProofUploadedAt: new Date(),
      },
    });

    return {
      message: "Bukti pembayaran berhasil diupload",
      data: updated,
    };
  };

  // 3. ACCEPT transaksi → status jadi PAID + kirim email
  acceptTransaction = async (transactionId: number, organizerId: number) => {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        event: { organizerId },
        deletedAt: null,
      },
      include: {
        user: { select: { name: true, email: true } },
        event: { select: { name: true } },
      },
    });

    if (!transaction) throw new ApiError("Transaksi tidak ditemukan", 404);

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new ApiError("Transaksi tidak bisa diaccept", 400);
    }

    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.PAID,
        confirmedAt: new Date(),
      },
    });

    const { user, event } = transaction;

    this.mailService.sendEmail(
      user.email,
      "Transaksi Kamu Diterima!",
      "transaction-accepted",
      {
        name: user.name,
        eventName: event.name,
        ticketQuantity: transaction.ticketQuantity,
        totalPrice: `IDR ${Number(transaction.totalPrice).toLocaleString("id-ID")}`,
      },
    );

    return {
      message: "Transaksi berhasil diterima",
      data: updatedTransaction,
    };
  };

  // 4. REJECT transaksi → status REJECTED + rollback + kirim email
  rejectTransaction = async (transactionId: number, organizerId: number) => {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        event: { organizerId },
        deletedAt: null,
      },
      include: {
        event: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!transaction) throw new ApiError("Transaksi tidak ditemukan", 404);

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new ApiError("Transaksi tidak bisa direject", 400);
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Update status transaksi → REJECTED
      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: TransactionStatus.REJECTED },
      });

      // 2. Kembalikan pointsUsed → buat Point baru (ikuti pola auth.service.ts)
      if (transaction.pointsUsed > 0) {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 3);

        await tx.point.create({
          data: {
            userId: transaction.userId,
            amount: transaction.pointsUsed,
            remainingAmount: transaction.pointsUsed,
            expiredAt: expiryDate,
          },
        });
      }

      // 3. Kembalikan quota voucher kalau dipakai
      if (transaction.voucherId) {
        await tx.voucher.update({
          where: { id: transaction.voucherId },
          data: { quota: { increment: 1 } },
        });
      }

      // 4. Reset coupon isUsed → false kalau dipakai
      if (transaction.couponId) {
        await tx.coupon.update({
          where: { id: transaction.couponId },
          data: { isUsed: false },
        });
      }

      // 5. Kembalikan availableSeats event
      await tx.event.update({
        where: { id: transaction.eventId },
        data: {
          availableSeats: { increment: transaction.ticketQuantity },
        },
      });
    });

    const { user, event } = transaction;

    this.mailService.sendEmail(
      user.email,
      "Transaksi Kamu Ditolak",
      "transaction-rejected",
      {
        name: user.name,
        eventName: event.name,
        ticketQuantity: transaction.ticketQuantity,
        totalPrice: `IDR ${Number(transaction.totalPrice).toLocaleString("id-ID")}`,
      },
    );

    return { message: "Transaksi berhasil direject" };
  };
}
