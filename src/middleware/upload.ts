import multer from "multer";
import { AppError } from "../utils/http.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new AppError(400, "Only image uploads are allowed"));
      return;
    }

    callback(null, true);
  }
});

export const petImagesUpload = upload.array("images", 3);
