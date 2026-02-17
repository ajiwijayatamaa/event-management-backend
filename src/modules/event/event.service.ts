import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { GetEventsDTO } from "./dto/get-events.dto.js";

export class EventService {
  constructor(private prisma: PrismaClient) {}

  getEvents = async (query: GetEventsDTO) => {
    const { page, sortBy, sortOrder, take, search } = query;

    const whereClause: Prisma.EventWhereInput = {};

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }

    const events = await this.prisma.event.findMany({
      where: whereClause,
      take: take,
      skip: (page - 1) * take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        organizer: {
          select: {
            name: true,
          },
        },
      },
    }); //const users untuk nampung data users

    const total = await this.prisma.event.count({ where: whereClause });

    return {
      data: events,
      meta: { page, take, total },
    };
  };
}
