import { Request, Response } from "express";
import { EventService } from "./event.service.js";
import { GetEventsDTO } from "./dto/get-events.dto.js";
import { plainToInstance } from "class-transformer";
import { ApiError } from "../../utils/api-error.js";

export class EventController {
  constructor(private eventService: EventService) {}

  getEvents = async (req: Request, res: Response) => {
    const query = plainToInstance(GetEventsDTO, req.query);
    const result = await this.eventService.getEvents(query);
    res.status(200).send(result);
  };

  getEventBySlug = async (req: Request, res: Response) => {
    const slug = String(req.params.slug);
    const result = await this.eventService.getEventBySlug(slug);
    res.status(200).send(result);
  };

  createEvent = async (req: Request, res: Response) => {
    const body = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const image = files.image?.[0];
    if (!image) throw new ApiError("Image is required", 400);

    const organizerId = res.locals.existingUser.id;

    const result = await this.eventService.createEvent(
      body,
      image,
      organizerId,
    );
    res.status(201).send(result);
  };
}
