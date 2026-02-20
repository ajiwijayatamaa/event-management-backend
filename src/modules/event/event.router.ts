import express, { Router } from "express";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { EventController } from "./event.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { CreateEventDTO } from "./dto/create-event.dto.js";
import { UploadMiddleware } from "../../middlewares/upload.middleware.js";
import { UpdateEventDTO } from "./dto/update-event.dto.js";

export class EventRouter {
  private router: Router;

  constructor(
    private eventController: EventController,
    private authMiddleware: AuthMiddleware,
    private uploadMiddleware: UploadMiddleware,
    private validationMiddleware: ValidationMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    // 1. Untuk Public
    this.router.get("/", this.eventController.getEvents);

    // 2. Untuk Organizer login (lihat event miliknya sendiri)
    this.router.get(
      "/my-events",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.authMiddleware.verifyRole(["ORGANIZER"]),
      this.eventController.getOrganizerEvents,
    );

    this.router.get("/:slug", this.eventController.getEventBySlug);

    // Organizer - buat event
    this.router.post(
      "/",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.authMiddleware.verifyRole(["ORGANIZER"]),
      this.uploadMiddleware.upload().fields([{ name: "image", maxCount: 1 }]),
      this.validationMiddleware.validateBody(CreateEventDTO),
      this.eventController.createEvent,
    );

    // Organizer - edit event
    this.router.patch(
      "/:id",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.authMiddleware.verifyRole(["ORGANIZER"]),
      this.uploadMiddleware.upload().fields([{ name: "image", maxCount: 1 }]),
      this.validationMiddleware.validateBody(UpdateEventDTO),
      this.eventController.updateEvent,
    );
  };

  getRouter = () => {
    return this.router;
  };
}
