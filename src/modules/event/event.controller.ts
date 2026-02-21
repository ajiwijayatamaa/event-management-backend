import { Request, Response } from "express";
import { EventService } from "./event.service.js";
import { GetEventsDTO } from "./dto/get-events.dto.js";
import { plainToInstance } from "class-transformer";
import { ApiError } from "../../utils/api-error.js";
import { UpdateEventDTO } from "./dto/update-event.dto.js";
import { GetStatisticsDTO } from "./dto/get-statistics.dto.js";

export class EventController {
  constructor(private eventService: EventService) {}

  getEvents = async (req: Request, res: Response) => {
    const query = plainToInstance(GetEventsDTO, req.query);
    const result = await this.eventService.getEvents(query);
    res.status(200).send(result);
  };

  // 2.GET (khusus Dashboard Organizer)
  getOrganizerEvents = async (req: Request, res: Response) => {
    const query = plainToInstance(GetEventsDTO, req.query);
    // Ambil ID dari token (res.locals)
    const organizerId = res.locals.existingUser.id;

    // Panggil dengan mengirim organizerId
    const result = await this.eventService.getEvents({
      ...query,
      organizerId,
    });
    res.status(200).send(result);
  };

  getEventBySlug = async (req: Request, res: Response) => {
    const slug = String(req.params.slug);
    const result = await this.eventService.getEventBySlug(slug);
    res.status(200).send(result);
  };

  getAttendees = async (req: Request, res: Response) => {
    const slug = String(req.params.slug);
    const organizerId = res.locals.existingUser.id;
    const result = await this.eventService.getAttendees(slug, organizerId);
    res.status(200).send(result);
  };

  getStatistics = async (req: Request, res: Response) => {
    const query = plainToInstance(GetStatisticsDTO, req.query);
    const organizerId = res.locals.existingUser.id;

    const result = await this.eventService.getStatistics({
      ...query,
      organizerId,
    });

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

  updateEvent = async (req: Request, res: Response) => {
    const eventId = Number(req.params.id);
    const body = plainToInstance(UpdateEventDTO, req.body);
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const image = files?.image?.[0];

    const organizerId = res.locals.existingUser.id;

    const result = await this.eventService.updateEvent(
      eventId,
      body,
      organizerId,
      image,
    );
    res.status(200).send(result);
  };
}
