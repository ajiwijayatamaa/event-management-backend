import express, { Router } from "express";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { EventController } from "./event.controller.js";

export class EventRouter {
  private router: Router;

  constructor(private eventController: EventController) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get("/", this.eventController.getEvents);
    this.router.get("/:slug", this.eventController.getEventBySlug);
  };

  getRouter = () => {
    return this.router;
  };
}
