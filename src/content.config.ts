import { defineCollection } from 'astro:content';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'astro/zod';

const assetsLoader = defineCollection({
  loader: async () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const dataPath = join(__dirname, '../data/ideas_project_assets.json');
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
    return data.map((entry: any) => ({
      id: String(entry.id),
      Title: entry.Title,
      Creator: entry.Creator,
      Contributor: entry.Contributor,
      Institution: entry.Institution,
      Source: entry.Source,
      Rights: entry.Rights,
      Subject: entry.Subject,
      Language: entry.Language,
      Country: entry.Country,
      Region: entry.Region,
      Latitude: entry.Latitude,
      Longitude: entry.Longitude,
      Date: entry.Date,
      Coverage: entry.Coverage,
      Type: entry.Type,
      Dimensions: entry.Dimensions,
      Collection: entry.Collection,
      filename: entry.filename,
      description: entry.description,
      slug: entry.slug,
    }));
  },
  schema: z.object({
    Title: z.string(),
    Creator: z.string().optional(),
    Contributor: z.string().optional(),
    Institution: z.string().optional(),
    Source: z.string().optional(),
    Rights: z.string().optional(),
    Subject: z.string().optional(),
    Language: z.string().optional(),
    Country: z.string(),
    Region: z.string().optional(),
    Latitude: z.string().optional(),
    Longitude: z.string().optional(),
    Date: z.string().optional(),
    Coverage: z.string().optional(),
    Type: z.string().optional(),
    Dimensions: z.string().optional(),
    Collection: z.string().optional(),
    id: z.string(),
    filename: z.array(z.string()).optional(),
    description: z.string().optional(),
    slug: z.string(),
  }),
});

export const collections = { assets: assetsLoader };
