import { Request, Response } from "express";
import { TransactionService } from "./transaction.service.js";
import { ApiError } from "../../utils/api-error.js";

export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  // GET semua transaksi milik organizer
  getTransactions = async (req: Request, res: Response) => {
    const organizerId = res.locals.existingUser.id;
    const result = await this.transactionService.getTransactions(organizerId);
    res.status(200).send(result);
  };

  // UPLOAD bukti pembayaran (customer)
  uploadPaymentProof = async (req: Request, res: Response) => {
    const transactionId = Number(req.params.id);
    const userId = res.locals.existingUser.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const image = files?.image?.[0];

    if (!image) throw new ApiError("Image is required", 400);

    const result = await this.transactionService.uploadPaymentProof(
      transactionId,
      userId,
      image,
    );
    res.status(200).send(result);
  };

  // ACCEPT transaksi (organizer)
  acceptTransaction = async (req: Request, res: Response) => {
    const transactionId = Number(req.params.id);
    const organizerId = res.locals.existingUser.id;
    const result = await this.transactionService.acceptTransaction(
      transactionId,
      organizerId,
    );
    res.status(200).send(result);
  };

  // REJECT transaksi (organizer)
  rejectTransaction = async (req: Request, res: Response) => {
    const transactionId = Number(req.params.id);
    const organizerId = res.locals.existingUser.id;
    const result = await this.transactionService.rejectTransaction(
      transactionId,
      organizerId,
    );
    res.status(200).send(result);
  };
}
