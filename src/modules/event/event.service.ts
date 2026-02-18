import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import { GetEventsDTO } from "./dto/get-events.dto.js";

export class EventService {
  constructor(private prisma: PrismaClient) {}

  getEvents = async (query: GetEventsDTO & { organizerId?: number }) => {
    const { page, sortBy, sortOrder, take, search, organizerId } = query;

    const whereClause: Prisma.EventWhereInput = {
      deletedAt: null, // Mengikuti best practice karena ada field deletedAt
    };

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }

    // FEATURE 2: Filter untuk Dashboard Organizer
    if (organizerId) {
      whereClause.organizerId = organizerId;
    }

    const events = await this.prisma.event.findMany({
      where: whereClause,
      take: take,
      skip: (page - 1) * take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        organizer: {
          select: { name: true, profilePicture: true },
        },
        // Tambahkan ini jika ingin menampilkan rating rata-rata di list
        transactions: {
          where: { review: { isNot: null } },
          select: { review: { select: { rating: true } } },
        },
      },
    });

    const total = await this.prisma.event.count({ where: whereClause });

    return {
      data: events,
      meta: { page, take, total },
    };
  };

  getEventBySlug = async (slug: string) => {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        organizer: {
          select: {
            name: true,
            profilePicture: true,
          },
        },
        // FEATURE 2: Mengambil Voucher yang tersedia untuk event ini
        vouchers: {
          where: {
            endDate: { gte: new Date() },
            quota: { gt: 0 },
          },
        },
        // FEATURE 2: Mengambil Review dari transaksi yang sudah selesai
        transactions: {
          where: {
            status: "PAID", // Hanya review dari transaksi sukses
            review: { isNot: null },
          },
          select: {
            review: {
              select: {
                rating: true,
                comment: true,
                createdAt: true,
                user: {
                  select: { name: true, profilePicture: true },
                },
              },
            },
          },
        },
      },
    });

    if (!event) throw new ApiError("Event Not Found", 404);

    return event;
  };
}
