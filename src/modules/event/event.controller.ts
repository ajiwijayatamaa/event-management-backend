import { Request, Response } from "express";
import { EventService } from "./event.service.js";
import { GetEventsDTO } from "./dto/get-events.dto.js";
import { plainToInstance } from "class-transformer";

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
}
