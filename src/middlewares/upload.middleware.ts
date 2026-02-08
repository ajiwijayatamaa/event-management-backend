import multer from "multer";

export class UploadMiddleware {
  upload = (maxSize: number = 2) => {
    const storage = multer.memoryStorage();

    const limits = {
      fileSize: maxSize * 1024 * 1024, // 2MB default
    };

    return multer({ storage, limits });
  };
}
