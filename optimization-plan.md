# Astro Project Optimization Plan

## Current State Analysis

**Project**: Asset Gallery (AN-AstrOnly)  
**Framework**: Astro 7.4.2  
**Content**: 200+ asset entries from `data/ideas_project_assets.json`  
**Pages**: 
- `/` — Gallery index (AssetCard grid)
- `/[slug]` — Asset detail (duplicate)
- `/primary/` — Primary collection landing
- `/primary/[slug]` — Asset detail (duplicate)

**Identified Issues**:
- Duplicate `[slug]` routes (identical logic, different styling)
- Raw `<img>` tags — no optimization, no `srcset`, no lazy loading
- No Content Collections — untyped JSON imports, no schema validation
- No Tailwind — inline `<style>` blocks, no design system
- No SEO meta tags, no accessibility features
- No Netlify adapter configured
- No typecheck/lint scripts in package.json

---

## Requirements (from user)

| Requirement | Decision |
|-------------|----------|
| URL structure | Keep `/primary/` prefix |
| Image hosting | All local (assets/media/) |
| Color scheme | Light-only mode |
| Interactivity | Client-side filtering/search planned |
| Deployment | Netlify (Reclaim Hosting future) |
| Design system | Skip Tailwind (use semantic CSS) |

---

## Phase 1: Type-Safe Content Layer

### 1.1 Create Content Collections Config

**File**: `src/content/config.ts` (new)

```typescript
import { defineCollection, z } from 'astro:content';

const assets = defineCollection({
  type: 'data',
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
    filename: z.array(z.string()),
    description: z.string().optional(),
    slug: z.string(),
  }),
});

export const collections = { assets };
```

**Benefits**: 
- Zod schema validates all fields at build time
- Type inference in `.astro` files via `getCollection('assets')`
- Future-proof: can split into individual JSON files per asset

### 1.2 Create Content Loader

**File**: `src/content/loader.ts` (new)

```typescript
import { defineCollection } from 'astro:content';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const assetsData = defineCollection({
  loader: async () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const dataPath = join(__dirname, '../../data/ideas_project_assets.json');
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
    return data.map((entry: any) => ({
      ...entry,
      _id: entry.id,
    }));
  },
});

export const collections = { assets: assetsData };
```

**Alternative**: Use a data loader to keep JSON in `data/` while getting typed access.

### 1.3 Update Astro Config

**File**: `astro.config.mjs` (modify)

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://your-domain.netlify.app',
  integrations: [],
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
```

---

## Phase 2: Image Optimization

### 2.1 Replace `<img>` with `<Image>` in All Pages

**File**: `src/pages/index.astro`

```astro
---
import { Image } from 'astro:assets';
import AssetCard from '../components/AssetCard.astro';
import { getCollection } from 'astro:content';

const entries = await getCollection('assets');
const cards = entries.filter(entry => entry.data.filename?.length > 0);
---

<AssetCard 
  image={entry.data.image} 
  title={entry.data.Title}
  description={entry.data.description}
  slug={entry.data.slug}
  id={entry.data.id}
/>
```

**File**: `src/pages/[slug].astro`

```astro
---
import { Image } from 'astro:assets';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const entries = await getCollection('assets');
  return entries.map(entry => ({
    params: { slug: entry.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const imageMeta = entry.data.filename?.[0] 
  ? await import(`../../assets/media/${entry.data.filename[0]}`)
  : null;
---

<Image 
  src={imageMeta} 
  alt={entry.data.Title}
  loading="lazy"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw"
/>
```

**File**: `src/pages/primary/[slug].astro` — Same pattern, different layout

### 2.2 AssetCard Component Update

**File**: `src/components/AssetCard.astro`

```astro
---
import { Image } from 'astro:assets';

interface Props {
  id: string;
  title: string;
  description: string;
  image: import('astro:assets').ImageMetadata;
  slug: string;
}

const { id, title, description, image, slug } = Astro.props as Props;
const altText = title || 'Asset image';
---

<article class="asset-card">
  <header class="card-header">
    <h3 class="card-title">
      <a href={`/primary/${slug}`} class="card-link">{title}</a>
    </h3>
    <p class="card-description">{description}</p>
  </header>
  <div class="card-body">
    <Image src={image} alt={altText} loading="lazy" />
  </div>
</article>
```

---

## Phase 3: Route Consolidation

### 3.1 Remove Duplicate Route

**Action**: Delete `src/pages/[slug].astro`  
**Reason**: Duplicate of `/primary/[slug]` — same logic, different styling. Consolidate to `/primary/[slug]` as canonical.

### 3.2 Update Navigation

**File**: `src/components/AssetCard.astro` — Already links to `/primary/${slug}` ✓  
**File**: `src/pages/primary/index.astro` — Add back link to `/` ✓

### 3.3 Update Index Page

**File**: `src/pages/index.astro` — Keep as-is (gallery landing)  
**File**: `src/pages/primary/index.astro` — Add asset count and search bar placeholder

---

## Phase 4: Interactive Search/Filter Component

### 4.1 Create Search Island

**File**: `src/components/SearchFilter.astro` (new)

```astro
---
import { getCollection } from 'astro:content';

const allAssets = await getCollection('assets');

// Pass to client-side component
const assetData = allAssets.map(a => ({
  id: a.data.id,
  title: a.data.Title,
  description: a.data.description,
  slug: a.slug,
  country: a.data.Country,
  region: a.data.Region,
  collection: a.data.Collection,
}));
---

<div class="search-filter">
  <input 
    type="search" 
    id="asset-search" 
    placeholder="Search assets by title, description, country..."
    aria-label="Search assets"
  />
  <div class="filter-chips" id="filter-chips">
    <button class="chip active" data-filter="all">All</button>
    <button class="chip" data-filter="country">By Country</button>
    <button class="chip" data-filter="region">By Region</button>
    <button class="chip" data-filter="collection">By Collection</button>
  </div>
</div>

<script>
  // Client-side search/filter logic
  // Use client:load for immediate interactivity
</script>
```

**Hydration Strategy**: `client:load` — search/filter is above-the-fold interactive UI

### 4.2 Integrate Search into Index Page

**File**: `src/pages/index.astro`

```astro
---
import SearchFilter from '../components/SearchFilter.astro';
import AssetGrid from '../components/AssetGrid.astro';
---

<SearchFilter />
<AssetGrid assets={cards} />
```

---

## Phase 5: Build Configuration & Tooling

### 5.1 Package.json Scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "check": "astro check",
    "lint": "eslint src --ext .astro,.ts,.js",
    "format": "prettier --write src/**/*.{astro,ts,js}"
  }
}
```

### 5.2 Astro Config

**File**: `astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://your-domain.netlify.app',
  integrations: [netlify()],
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
```

### 5.3 TypeScript Config

**File**: `tsconfig.json` (already extends `astro/tsconfigs/strict`) — Keep as-is

---

## Phase 6: Verification Checklist

### Build Verification
- [ ] `npm run check` passes (TypeScript + Astro)
- [ ] `npm run build` completes without errors
- [ ] No duplicate route warnings
- [ ] Content Collections schema validates all 200+ entries

### Performance Verification
- [ ] All `<img>` tags replaced with `<Image>` component
- [ ] Images served as WebP/AVIF with responsive `srcset`
- [ ] Lazy loading enabled for below-fold images
- [ ] No layout shift (images have explicit width/height)

### Accessibility Verification
- [ ] All images have descriptive `alt` text
- [ ] Heading hierarchy is logical (h1 → h2 → h3)
- [ ] Search input has `aria-label`
- [ ] Focus states are visible

### Responsive Verification
- [ ] Grid collapses to single column on mobile
- [ ] Metadata table scrolls horizontally on small screens
- [ ] Card descriptions truncate with ellipsis

---

## File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/content/config.ts` | **Create** | Zod schema for typed content |
| `src/content/loader.ts` | **Create** | Data loader for JSON → Content Collection |
| `src/components/AssetCard.astro` | **Update** | Type-safe props, Image component |
| `src/components/SearchFilter.astro` | **Create** | Client-side search/filter island |
| `src/components/AssetGrid.astro` | **Create** | Reusable grid component |
| `src/pages/index.astro` | **Update** | Add search, use AssetGrid |
| `src/pages/[slug].astro` | **Delete** | Remove duplicate route |
| `src/pages/primary/index.astro` | **Update** | Add search, asset count |
| `src/pages/primary/[slug].astro` | **Update** | Use Image component, unified layout |
| `astro.config.mjs` | **Update** | Add Netlify adapter, site URL |
| `package.json` | **Update** | Add check/lint scripts |

---

## Implementation Order

1. **Content Collections** — Foundation for all typed data access
2. **Image Optimization** — Replace `<img>` → `<Image>` everywhere
3. **Route Consolidation** — Remove duplicate, unify detail pages
4. **Search/Filter** — Add interactive island component
5. **Build Config** — Finalize tooling and deployment setup
6. **Verification** — Build, check, and test

---

## Estimated Effort

| Phase | Files | Time |
|-------|-------|------|
| Content Collections | 2 new + 1 config | 1 hr |
| Image Optimization | 4 modified | 1 hr |
| Route Consolidation | 1 delete + 2 modify | 30 min |
| Search/Filter | 2 new + 2 modify | 1.5 hrs |
| Build Config | 2 modify | 30 min |
| **Total** | **~12 files** | **4-5 hrs** |

---

## Session Progress Tracking

### Session 1: Content Collections & Image Optimization
- [ ] Create `src/content/config.ts` with Zod schema
- [ ] Create `src/content/loader.ts` data loader
- [ ] Update `src/pages/index.astro` to use `getCollection`
- [ ] Update `src/components/AssetCard.astro` to use `<Image>`
- [ ] Update `src/pages/primary/[slug].astro` to use `<Image>`

### Session 2: Route Consolidation & Detail Pages
- [ ] Delete `src/pages/[slug].astro`
- [ ] Unify layout in `src/pages/primary/[slug].astro`
- [ ] Update `src/pages/primary/index.astro` with search integration
- [ ] Verify all routes generate correctly

### Session 3: Search/Filter Island
- [ ] Create `src/components/SearchFilter.astro`
- [ ] Create `src/components/AssetGrid.astro`
- [ ] Integrate into `src/pages/index.astro`
- [ ] Test client-side filtering

### Session 4: Build Config & Deployment
- [ ] Add Netlify adapter to `astro.config.mjs`
- [ ] Update `package.json` with check/lint scripts
- [ ] Run `npm run check` and `npm run build`
- [ ] Deploy to Netlify

### Session 5: Verification & Polish
- [ ] Run Lighthouse audit
- [ ] Test responsive breakpoints
- [ ] Verify accessibility
- [ ] Fix any remaining issues