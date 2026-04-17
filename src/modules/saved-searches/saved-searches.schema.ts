import { z } from "zod";

export const savedSearchPayloadSchema = z.object({
  label: z.string().trim().min(2).max(80),
  queryString: z.string().trim().max(1000)
});
