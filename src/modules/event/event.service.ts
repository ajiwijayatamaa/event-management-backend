import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import { generateSlug } from "../../utils/generate-slug.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";
import { CreateEventDTO } from "./dto/create-event.dto.js";
import { GetEventsDTO } from "./dto/get-events.dto.js";
import { UpdateEventDTO } from "./dto/update-event.dto.js";

export class EventService {
  constructor(
    private prisma: PrismaClient,
    private cloudinaryService: CloudinaryService,
  ) {}

  getEvents = async (query: GetEventsDTO & { organizerId?: number }) => {
    const { page, sortBy, sortOrder, take, search, organizerId } = query;

    const whereClause: Prisma.EventWhereInput = {
      deletedAt: null,
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
      where: { slug, deletedAt: null },
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

  getAttendees = async (slug: string, organizerId: number) => {
    // 1. Cek event ada dan milik organizer ini
    const event = await this.prisma.event.findUnique({
      where: { slug, organizerId, deletedAt: null },
    });

    if (!event) throw new ApiError("Event tidak ditemukan", 404);

    // 2. Ambil semua transaksi yang PAID (attendees yang sudah bayar)
    const attendees = await this.prisma.transaction.findMany({
      where: {
        eventId: event.id,
        status: "PAID",
        deletedAt: null,
      },
      select: {
        id: true,
        ticketQuantity: true,
        totalPrice: true,
        createdAt: true,
        user: {
          select: { name: true, email: true, profilePicture: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: attendees,
      meta: {
        eventName: event.name,
        totalAttendees: attendees.length,
        totalTickets: attendees.reduce((sum, a) => sum + a.ticketQuantity, 0),
      },
    };
  };

  createEvent = async (
    body: CreateEventDTO,
    image: Express.Multer.File,
    organizerId: number,
  ) => {
    // 1. Cari dulu event berdasarkan nama event sudah ada atau belum
    const event = await this.prisma.event.findUnique({
      where: { name: body.name },
    });

    // 2. Kalau udah ada throw error
    if (event) throw new ApiError("Nama Event Sudah Digunakan", 400);

    // 3. Kalau belum ada generate slug berdasarkan nama event, ambil dari fungsi generate slug di folder utils kalau belum ada buat fungsinya,
    const slug = generateSlug(body.name);

    // 4. upload thumbnail ke cloudinary, untuk upload ke cloudinary ambil dari fungsi cloudinay.service.ts dan pasang di constructor
    const { secure_url } = await this.cloudinaryService.upload(image);

    // 5. create data blog baru berdasarkan body, secure_url , dan organizerId
    const newEvent = await this.prisma.event.create({
      data: {
        ...body,
        slug,
        image: secure_url,
        organizerId,
      },
    });
    // 6. return message berhasil
    return {
      message: "Event Created Successfully",
      data: newEvent,
    };
  };

  updateEvent = async (
    eventId: number,
    body: UpdateEventDTO,
    organizerId: number,
    image?: Express.Multer.File,
  ) => {
    // 1. Cek event ada dan milik organizer ini
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, organizerId, deletedAt: null },
    });

    if (!event) throw new ApiError("Event tidak ditemukan", 404);

    // 2. Upload image baru jika ada, kalau tidak pakai image lama
    let imageUrl = event.image;
    if (image) {
      const { secure_url } = await this.cloudinaryService.upload(image);
      imageUrl = secure_url;
    }
    // 3. Hitung availableSeats — selalu dikirim karena wajib di Prisma
    const soldTickets = event.totalSeats - event.availableSeats;
    const newTotalSeats = body.totalSeats ?? event.totalSeats;

    // 3. Update event
    const updatedEvent = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...body,
        image: imageUrl,
        availableSeats: newTotalSeats - soldTickets,
        ...(body.name && { slug: generateSlug(body.name) }), // hanya update slug kalau nama dikirim
      },
    });

    return {
      message: "Event Updated Successfully",
      data: updatedEvent,
    };
  };
}
