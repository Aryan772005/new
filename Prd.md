# PRD — Desh Bhagat University Hackathon Website
**Codename:** BlockHacks (placeholder — swap for your actual event name)
**Theme:** Minecraft-inspired, built for a college hackathon
**Tech Lead:** Aryan Singh Tariani (Phone: +91 9475002048 | Email: aryansinghtariani@gmail.com)  
**Student Lead Head:** Rounak Kumar  
**Status:** Draft v1

---

## 1. Overview
A single-page (or lightly multi-section) marketing/registration website for a hackathon hosted at Desh Bhagat University. The visual language borrows from Minecraft — blocky geometry, pixel textures, End-portal purples, Overworld greens, torch-lit contrast — but the execution must read as a **professionally designed hackathon site**, not a game fan page or an asset-flip. It should feel like a small design studio built it for a real event, not like a generic AI template.

## 2. Goals
- Get students to understand what the hackathon is, who can join, and how to register — in under 15 seconds of scrolling.
- Make the Minecraft theme feel like an intentional creative concept ("build something," "craft your idea," "spawn your team") rather than decoration slapped on top.
- Feel modern and human-made: imperfect grid rhythm, real typographic hierarchy, restrained animation — not the "purple gradient + rounded card + generic icon" AI-generated look.
- Be usable on mobile (most students will open the registration link from Instagram/WhatsApp).

## 3. Non-Goals
- No actual game engine / WebGL voxel rendering required — this is a marketing site, not a 3D experience. Visual references to Minecraft (blocks, pixel art, particles) are done via 2D design, not real-time 3D.
- No backend/registration processing logic — the PRD assumes an external form (Google Form/Devfolio/Unstop link) or a simple form UI that posts to a service; no auth system, no database design here.
- No code in this document — this PRD and its companion prompt file are for planning and for pasting into Antigravity.

## 4. Target Audience
- Desh Bhagat University students (primary), CSE/tech clubs, possibly students from nearby colleges if the event is open.
- Secondary: faculty/judges/sponsors who land on the page to check credibility of the event.

## 5. Tone & Positioning
"Imagine. Build. Ship." — the hackathon is your world to build in. Minecraft is the metaphor for creation from raw blocks (ideas → code → product), not just a skin. Copy should lean into short, punchy, builder-language ("Spawn your team," "Craft in 24 hours," "Loot: prizes & swag," "Respawn point: help desk") **used sparingly** — 1–2 clever references per section, not every sentence gimmicked.

## 6. Sitemap / Page Structure
Single scrollable landing page with anchored nav, unless stated otherwise:

1. **Nav bar** — Logo/event name, links (About, Tracks, Timeline, Prizes, Sponsors, FAQ), primary CTA button ("Register Now")
2. **Hero section** — Full-viewport, Minecraft-portal/world visual, event name, one-line pitch, date/venue, countdown timer, primary + secondary CTA (Register / View Brochure)
3. **About the Hackathon** — What it is, who organizes it (Desh Bhagat University + club/dept name), why it exists
4. **Tracks / Themes** — Problem statement categories, each styled as a "world" or "biome" card (e.g. AI/ML = "Enchanted Forest," Sustainability = "Overworld," FinTech = "Nether Trading Post" — playful but optional; can also just use clean iconography instead of literal biome names if that feels too gimmicky)
5. **Timeline / Schedule** — Day-of-event flow as a "crafting sequence" / roadmap (registration → ideation → build → submission → judging → results)
6. **Prizes / Loot** — Prize pool, category-wise rewards, goodies, certificates
7. **Rules / Eligibility** — Team size, eligibility, judging criteria
8. **Sponsors / Partners** — Logos, tiers (if any)
9. **Organizing Team / Mentors** — Faculty coordinators, student core team, socials
10. **FAQ** — Accordion, common questions
11. **Footer / CTA repeat** — Contact info, social links, university branding, "Register Now" repeated, credits

## 7. Visual Design Direction
- **Palette:** Deep charcoal/near-black background (`#0d0d12`–`#151521`), Minecraft-grass green (`#5fb03a` / `#3f8f2f`) as primary accent, End-portal purple/magenta (`#8b2fd1`/`#c084fc`) as secondary accent, warm torch-amber (`#f5a623`) for highlights/CTAs. Avoid using all three accents evenly everywhere — pick a dominant accent per section for rhythm.
- **Typography:** A humanist sans (Inter, Sora, or Space Grotesk) for body/UI text — keep this highly readable. Reserve a pixel/blocky display font (e.g. "Press Start 2P," "VT323," "Minecraft-style" pixel font) ONLY for large hero headlines or small accent labels — never for body copy or long paragraphs, or it becomes unreadable and looks amateurish.
- **Iconography/graphics:** Blocky/voxel-style icons, subtle pixel-noise textures, cracked-stone or grass-block dividers between sections, torch/glow accents. Reference the uploaded landing page for how a portal/world visual anchors a hero section — that level of production value is the bar, not a literal copy.
- **Motion:** Restrained — parallax on hero background, hover-tilt or "block break" micro-interaction on cards, floating particles (fireflies/portal sparkles) at low density. No excessive scroll-jacking.
- **"Human-made" signals:** asymmetric section layouts (not everything centered in a card grid), slightly varied spacing/rhythm, a hand-picked color per section rather than one repeating gradient everywhere, real photography or campus-specific details mixed with the pixel-art motif (e.g. an actual photo of the DBU campus/venue treated with a subtle green-purple duotone) so it doesn't feel like 100% stock game assets.

## 8. Content Requirements (fill in before building)
- Official event name, tagline, dates, venue (campus building/hall)
- Registration link/platform (Google Form, Unstop, Devfolio, etc.)
- Track/theme list with 1-line descriptions
- Prize pool breakdown
- Rules: team size, eligibility (open to all colleges or DBU-only), submission format
- Timeline with exact times
- Sponsor logos/tiers (if finalized)
- Student Lead Head: Rounak Kumar, Tech Lead: Aryan Singh Tariani (+91 9475002048, aryansinghtariani@gmail.com)
- Desh Bhagat University logo and official brand colors (for footer/credibility, kept separate from the Minecraft palette so it doesn't clash — usually placed in nav/footer only)

## 9. Technical Notes (for whoever builds in Antigravity)
- Should be built as a responsive static site (HTML/CSS/JS or a framework of choice — left to the builder/IDE).
- Must be mobile-first responsive; hero visual should degrade gracefully to a simpler static image on small screens rather than a heavy animation.
- Performance: pixel-art/texture assets should be optimized (WebP/AVIF, sprite sheets where possible) — hackathon visitors are often on mobile data.
- Accessibility: sufficient contrast for the purple/green palette on dark background, alt text on all block/pixel graphics, keyboard-navigable nav and accordion FAQ.

## 10. Success Metrics
- Registration link clicks / conversion rate from page visits
- Time-on-page and scroll depth (do people reach Tracks/Timeline, or bounce at hero?)
- Mobile vs desktop traffic split (optimize for whichever dominates)
- Qualitative: does it get shared/screenshotted on social media as "this hackathon's site looks cool"?

## 11. Open Questions
- Is the hackathon open to other colleges or DBU-only?
- Confirmed event name/tagline?
- Do we have real photography of the venue/campus to blend with the pixel-art theme?
- Is there a budget/need for a custom pixel-art illustrator, or should visuals be built from open licensed Minecraft-style asset packs / CSS-generated block patterns (recommended to avoid copyright issues with actual Mojang assets — see note below)?

## 12. IP / Copyright Note
Minecraft, its logo, and Mojang's official assets are trademarked/copyrighted. The site should evoke the *aesthetic* (blocky shapes, voxel style, that color palette, pixel fonts) as an homage/parody-adjacent creative theme for a non-commercial student event — it should **not** use actual extracted Mojang textures, the official Minecraft logo/wordmark, or claim official affiliation. Build original blocky/pixel assets or use clearly generic "voxel-style" open-licensed asset packs instead.