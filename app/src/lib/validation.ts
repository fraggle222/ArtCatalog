import { z } from "zod";

const currentYear = new Date().getFullYear();

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .nullable()
    .transform((value) => {
      if (value == null) {
        return null;
      }
      return value.length === 0 ? null : value;
    });

export const loginSchema = z.object({
  email: z.email().trim().max(255),
  password: z.string().min(1).max(255),
});

const artworkBaseSchema = z.object({
  title: optionalTrimmedString(200),
  title_unknown: z.boolean().optional().default(false),
  artist_id: z.string().trim().min(1),
  description: optionalTrimmedString(5000),
  medium_preset: optionalTrimmedString(120),
  medium_custom: optionalTrimmedString(120),
  dimensions_text: optionalTrimmedString(80),
  dimensions_unknown: z.boolean().optional().default(false),
  framed: z.boolean().optional().default(false),
  year_created: z
    .number()
    .int()
    .min(1000)
    .max(currentYear)
    .optional()
    .nullable(),
  status: z.enum(["draft", "published"]).optional().default("draft"),
});

function artworkRefinement(
  value: z.infer<typeof artworkBaseSchema>,
  ctx: z.RefinementCtx
) {
    if (!value.title_unknown && !value.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "Title is required unless marked unknown.",
      });
    }

    if (!value.medium_preset && !value.medium_custom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["medium_preset"],
        message: "Select a preset or provide a custom medium.",
      });
    }

    if (value.medium_preset && value.medium_custom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["medium_custom"],
        message: "Use either preset or custom medium, not both.",
      });
    }
}

function partialArtworkRefinement(
  value: {
    title?: string | null;
    title_unknown?: boolean;
    medium_preset?: string | null;
    medium_custom?: string | null;
  },
  ctx: z.RefinementCtx
) {
  if (value.title_unknown === false && value.title !== undefined && !value.title) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["title"],
      message: "Title is required unless marked unknown.",
    });
  }

  if (value.medium_preset && value.medium_custom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["medium_custom"],
      message: "Use either preset or custom medium, not both.",
    });
  }
}

export const createArtworkSchema = artworkBaseSchema.superRefine(artworkRefinement);

export const updateArtworkSchema = artworkBaseSchema
  .partial()
  .superRefine(partialArtworkRefinement);

export const reorderImagesSchema = z.object({
  imageIds: z.array(z.string().trim().min(1)).min(1),
  primaryImageId: z.string().trim().min(1).optional(),
});

export const createArtistSchema = z.object({
  name: z.string().trim().min(1).max(160),
  birth_year: z
    .number()
    .int()
    .min(1000)
    .max(currentYear)
    .nullable()
    .optional(),
  death_year: z
    .number()
    .int()
    .min(1000)
    .max(currentYear)
    .nullable()
    .optional(),
});

export const updateArtistSchema = createArtistSchema.partial();

export function zodErrorDetails(error: z.ZodError) {
  return error.flatten().fieldErrors;
}
