import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import { generateSlug } from "../../utils/generate-slug.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";
import { CreateEventDTO } from "./dto/create-event.dto.js";
import { GetEventsDTO } from "./dto/get-events.dto.js";
import { GetStatisticsDTO } from "./dto/get-statistics.dto.js";
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

  getStatistics = async (query: GetStatisticsDTO & { organizerId: number }) => {
    const { period, organizerId } = query;

    // ambil semua transaksi yang sudah PAID dari event milik organizer
    // filter by organizerId lewat relasi event, bukan langsung di transaction
    const transactions = await this.prisma.transaction.findMany({
      where: {
        event: { organizerId }, // filter transaksi berdasarkan event milik organizer
        status: "PAID", // hanya transaksi yang sudah berhasil dibayar
        deletedAt: null, // abaikan data yang sudah dihapus (soft delete)
      },
      select: {
        totalPrice: true, // untuk hitung total revenue
        ticketQuantity: true, // untuk hitung total tiket terjual
        createdAt: true,
      },
    });

    // hitung jumlah event yang masih aktif milik organizer
    const activeEvents = await this.prisma.event.count({
      where: { organizerId, deletedAt: null },
    });

    // jumlahkan semua ticketQuantity dari transaksi yang sudah diambil
    const totalTicketsSold = transactions.reduce(
      (sum, t) => sum + t.ticketQuantity,
      0,
    );

    // jumlahkan semua totalPrice, di-convert ke Number karena Prisma return Decimal
    const totalRevenue = transactions.reduce(
      (sum, t) => sum + Number(t.totalPrice),
      0,
    );

    // objek kosong untuk menampung data yang sudah dikelompokkan per periode
    const groupedData: Record<string, { revenue: number; tickets: number }> =
      {};

    for (const t of transactions) {
      let key: string; // key untuk grouping, formatnya beda tergantung period

      if (period === "year") {
        key = String(t.createdAt.getFullYear()); // contoh: "2024"
      } else if (period === "month") {
        // contoh: "2024-01", pakai padStart supaya bulan selalu 2 digit
        key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
      } else {
        // period === "day", contoh: "2024-01-15"
        key = t.createdAt.toISOString().split("T")[0];
      }

      // kalau key belum ada di groupedData, inisialisasi dulu dengan nilai 0
      if (!groupedData[key]) {
        groupedData[key] = { revenue: 0, tickets: 0 };
      }

      // tambahkan nilai transaksi ini ke kelompok yang sesuai
      groupedData[key].revenue += Number(t.totalPrice);
      groupedData[key].tickets += t.ticketQuantity;
    }

    // ubah object jadi array supaya mudah dikonsumsi di frontend
    // lalu sort ascending berdasarkan label (key) supaya urutan waktu benar
    const chartData = Object.entries(groupedData)
      .map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      summary: { activeEvents, totalTicketsSold, totalRevenue }, // untuk stats cards
      chartData, // untuk data grafik
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
