import { PrismaClient } from "../../generated/prisma/client.js";

export class EventService {
  constructor(private prisma: PrismaClient) {}

  getEvents = async () => {};
}
