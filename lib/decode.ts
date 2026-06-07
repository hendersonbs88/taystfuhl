export type Platform = "youtube" | "tiktok" | "instagram" | "generic";

export type ConfidenceLabel = "Seen in video" | "Likely" | "Estimated" | "Missing" | "Needs review";

export type ExtractionStatus = "needs_evidence" | "draft_ready";

export type RecipeIngredient = {
  item: string;
  amount: string;
  confidence: ConfidenceLabel;
  evidence: string;
};

export type RecipeStep = {
  text: string;
  confidence: ConfidenceLabel;
  evidence: string;
};

export type RecipeDraft = {
  status: ExtractionStatus;
  source: {
    url: string;
    platform: Platform;
    title: string;
    creator: string;
    embedAllowed: boolean;
    attribution: string;
  };
  recipe: {
    title: string;
    summary: string;
    servings: string;
    prepTime: string;
    cookTime: string;
    totalTime: string;
    confidence: ConfidenceLabel;
    ingredients: RecipeIngredient[];
    equipment: string[];
    steps: RecipeStep[];
    tags: string[];
    notes: string[];
    evidenceUsed: string[];
    safety: string;
  };
  downloadMarkdown: string;
};

type DecodeInput = {
  url: string;
  evidenceText?: string;
};

type OEmbedResponse = {
  title?: string;
  author_name?: string;
  provider_name?: string;
};

type ParsedEvidence = {
  title: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  equipment: string[];
  servings: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  tags: string[];
  evidenceUsed: string[];
};

const amountPattern =
  /((?:\d+\/\d+|\d+(?:\.\d+)?)(?:\s*-\s*(?:\d+\/\d+|\d+(?:\.\d+)?))?\s*(?:cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|cloves?|cans?|packages?|sticks?|pinch|pinches|slices?)|to taste|as needed)\s+(.+)/i;

const timePattern = /(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i;
const temperaturePattern = /(\d{3,4})\s*(?:degrees?|deg|f|c|fahrenheit|celsius)/i;

export function detectPlatform(rawUrl: string): Platform {
  const host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();

  if (host.includes("youtu.be") || host.includes("youtube.com")) return "youtube";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("instagram.com")) return "instagram";
  return "generic";
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Paste a public cooking-video URL to decode.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only public http or https URLs are supported.");
  }

  return parsed.toString();
}

export async function fetchSourceMetadata(url: string, platform: Platform): Promise<OEmbedResponse> {
  const endpoint =
    platform === "youtube"
      ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
      : platform === "tiktok"
        ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
        : "";

  if (!endpoint) return {};

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "TaystfuhlRecipeDecoder/0.2" },
      signal: controller.signal,
      next: { revalidate: 3600 }
    });

    if (!response.ok) return {};
    return (await response.json()) as OEmbedResponse;
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

export function generateRecipeDraft(
  url: string,
  platform: Platform,
  metadata: OEmbedResponse = {},
  evidenceText = "",
  parsedOverride?: ParsedEvidence
): RecipeDraft {
  const sourceTitle = cleanTitle(metadata.title) || fallbackTitle(platform);
  const creator = metadata.author_name || "Original creator";
  const embedAllowed = platform === "youtube" || platform === "tiktok";
  const parsed = parsedOverride || parseEvidence(evidenceText, sourceTitle);
  const hasEnoughEvidence = parsed.ingredients.length > 0 || parsed.steps.length > 0;

  const draft: RecipeDraft = {
    status: hasEnoughEvidence ? "draft_ready" : "needs_evidence",
    source: {
      url,
      platform,
      title: sourceTitle,
      creator,
      embedAllowed,
      attribution: `${creator} on ${platformLabel(platform)}`
    },
    recipe: hasEnoughEvidence
      ? buildEvidenceRecipe(parsed, sourceTitle, platform)
      : buildNeedsEvidenceRecipe(sourceTitle, platform, embedAllowed),
    downloadMarkdown: ""
  };

  draft.downloadMarkdown = toMarkdown(draft);
  return draft;
}

export async function decodeVideoUrl(input: DecodeInput): Promise<RecipeDraft> {
  const url = normalizeUrl(input.url || "");
  const platform = detectPlatform(url);
  const metadata = await fetchSourceMetadata(url, platform);
  const evidenceText = input.evidenceText || "";
  const sourceTitle = cleanTitle(metadata.title) || fallbackTitle(platform);
  const aiParsed = await extractEvidenceWithOpenAI(evidenceText, sourceTitle, platform);

  return generateRecipeDraft(url, platform, metadata, evidenceText, aiParsed || undefined);
}

async function extractEvidenceWithOpenAI(
  evidenceText: string,
  sourceTitle: string,
  platform: Platform
): Promise<ParsedEvidence | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || evidenceText.trim().length < 20) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        input: [
          {
            role: "system",
            content:
              "Extract a cooking recipe only from provided evidence. Do not invent ingredients, quantities, temperatures, times, equipment, servings, or steps. If a value is missing, write Missing. Return JSON matching schema."
          },
          {
            role: "user",
            content: `Source title: ${sourceTitle}\nPlatform: ${platformLabel(platform)}\n\nEvidence:\n${evidenceText}`
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "taystfuhl_recipe_extraction",
            strict: true,
            schema: recipeExtractionSchema
          }
        }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const outputText = extractOutputText(data);
    if (!outputText) return null;
    const parsed = JSON.parse(outputText) as ParsedEvidence;
    return normalizeAiParsedEvidence(parsed, sourceTitle);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const recipeExtractionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "ingredients",
    "steps",
    "equipment",
    "servings",
    "prepTime",
    "cookTime",
    "totalTime",
    "tags",
    "evidenceUsed"
  ],
  properties: {
    title: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["item", "amount", "confidence", "evidence"],
        properties: {
          item: { type: "string" },
          amount: { type: "string" },
          confidence: {
            type: "string",
            enum: ["Seen in video", "Likely", "Estimated", "Missing", "Needs review"]
          },
          evidence: { type: "string" }
        }
      }
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "confidence", "evidence"],
        properties: {
          text: { type: "string" },
          confidence: {
            type: "string",
            enum: ["Seen in video", "Likely", "Estimated", "Missing", "Needs review"]
          },
          evidence: { type: "string" }
        }
      }
    },
    equipment: { type: "array", items: { type: "string" } },
    servings: { type: "string" },
    prepTime: { type: "string" },
    cookTime: { type: "string" },
    totalTime: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    evidenceUsed: { type: "array", items: { type: "string" } }
  }
} as const;

function extractOutputText(data: unknown): string {
  if (!data || typeof data !== "object") return "";

  const maybeOutputText = (data as { output_text?: unknown }).output_text;
  if (typeof maybeOutputText === "string") return maybeOutputText;

  const output = (data as { output?: Array<{ content?: Array<Record<string, unknown>> }> }).output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => item.content || [])
    .map((content) => {
      if (typeof content.text === "string") return content.text;
      if (typeof content.output_text === "string") return content.output_text;
      return "";
    })
    .join("")
    .trim();
}

function normalizeAiParsedEvidence(parsed: ParsedEvidence, sourceTitle: string): ParsedEvidence {
  const cleanIngredients = Array.isArray(parsed.ingredients)
    ? parsed.ingredients
        .filter((ingredient) => ingredient.item && ingredient.amount)
        .map((ingredient) => ({
          item: titleCaseIngredient(String(ingredient.item)),
          amount: String(ingredient.amount),
          confidence: normalizeConfidence(ingredient.confidence),
          evidence: String(ingredient.evidence || "Provided evidence")
        }))
    : [];

  const cleanSteps = Array.isArray(parsed.steps)
    ? parsed.steps
        .filter((step) => step.text)
        .map((step) => ({
          text: normalizeInstruction(String(step.text)),
          confidence: normalizeConfidence(step.confidence),
          evidence: String(step.evidence || "Provided evidence")
        }))
    : [];

  return {
    title: recipeTitleFromSource(String(parsed.title || sourceTitle), "Evidence-Backed Recipe Draft"),
    ingredients: dedupeIngredients(cleanIngredients),
    steps: dedupeSteps(cleanSteps),
    equipment: Array.isArray(parsed.equipment) ? parsed.equipment.map(String).filter(Boolean).slice(0, 10) : [],
    servings: String(parsed.servings || "Missing"),
    prepTime: String(parsed.prepTime || "Missing"),
    cookTime: String(parsed.cookTime || "Missing"),
    totalTime: String(parsed.totalTime || "Missing"),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).filter(Boolean).slice(0, 10) : ["evidence-backed"],
    evidenceUsed: Array.isArray(parsed.evidenceUsed)
      ? parsed.evidenceUsed.map(String).filter(Boolean).slice(0, 20)
      : []
  };
}

function normalizeConfidence(confidence: ConfidenceLabel | string): ConfidenceLabel {
  const allowed: ConfidenceLabel[] = ["Seen in video", "Likely", "Estimated", "Missing", "Needs review"];
  return allowed.includes(confidence as ConfidenceLabel) ? (confidence as ConfidenceLabel) : "Needs review";
}

function parseEvidence(rawEvidence: string, sourceTitle: string): ParsedEvidence {
  const lines = rawEvidence
    .split(/\r?\n|[•;]/)
    .map((line) => line.trim())
    .filter(Boolean);

  const ingredients: RecipeIngredient[] = [];
  const steps: RecipeStep[] = [];
  const equipment = new Set<string>();
  const tags = new Set<string>(["evidence-backed"]);
  const evidenceUsed: string[] = [];
  let servings = "Missing";
  let prepTime = "Missing";
  let cookTime = "Missing";

  for (const line of lines) {
    const normalized = line.replace(/^[-*]\s*/, "").trim();
    const lower = normalized.toLowerCase();

    const servingMatch = lower.match(/(?:serves|servings|makes)\s*:?\s*(\d+\s*(?:-\s*\d+)?)/i);
    if (servingMatch) {
      servings = `${servingMatch[1]} servings`;
      evidenceUsed.push(normalized);
      continue;
    }

    if (lower.includes("prep")) {
      const time = normalized.match(timePattern);
      if (time) {
        prepTime = formatTime(time[1], time[2]);
        evidenceUsed.push(normalized);
        continue;
      }
    }

    if (lower.includes("cook") || lower.includes("bake") || lower.includes("air fry") || lower.includes("simmer")) {
      const time = normalized.match(timePattern);
      if (time && cookTime === "Missing") cookTime = formatTime(time[1], time[2]);
    }

    const ingredient = parseIngredient(normalized);
    if (ingredient && !isInstructionLine(lower)) {
      ingredients.push(ingredient);
      evidenceUsed.push(normalized);
      addIngredientTags(tags, ingredient.item);
      continue;
    }

    const step = parseStep(normalized);
    if (step) {
      steps.push(step);
      evidenceUsed.push(normalized);
      inferEquipment(equipment, lower);
      addStepTags(tags, lower);
      continue;
    }

    inferEquipment(equipment, lower);
  }

  return {
    title: inferTitle(sourceTitle, ingredients, tags),
    ingredients: dedupeIngredients(ingredients),
    steps: dedupeSteps(steps),
    equipment: Array.from(equipment).slice(0, 8),
    servings,
    prepTime,
    cookTime,
    totalTime: combineTimes(prepTime, cookTime),
    tags: Array.from(tags).slice(0, 8),
    evidenceUsed: evidenceUsed.slice(0, 16)
  };
}

function parseIngredient(line: string): RecipeIngredient | null {
  const withoutPrefix = line.replace(/^(add|use|ingredients?:|ingredient\s*-\s*)\s*/i, "").trim();
  const match = withoutPrefix.match(amountPattern);
  if (!match) return null;

  const item = match[2]
    .replace(/\s*(,|then|and cook|and bake|and mix).*$/i, "")
    .trim();
  if (!item || item.length < 2) return null;

  return {
    amount: match[1].trim(),
    item: titleCaseIngredient(item),
    confidence: "Seen in video",
    evidence: line
  };
}

function parseStep(line: string): RecipeStep | null {
  const lower = line.toLowerCase();
  if (!isInstructionLine(lower)) return null;

  const evidenceParts: string[] = [];
  const time = line.match(timePattern);
  const temp = line.match(temperaturePattern);
  if (time) evidenceParts.push(formatTime(time[1], time[2]));
  if (temp) evidenceParts.push(`${temp[1]} degrees`);

  return {
    text: normalizeInstruction(line),
    confidence: "Seen in video",
    evidence: evidenceParts.length ? `${line} (${evidenceParts.join(", ")})` : line
  };
}

function isInstructionLine(lower: string): boolean {
  return /\b(add|mix|stir|whisk|chop|slice|dice|cook|bake|air fry|fry|saute|sauté|simmer|boil|broil|roast|season|pour|fold|toss|serve|rest|marinate|heat|preheat|combine|blend)\b/.test(
    lower
  );
}

function buildEvidenceRecipe(parsed: ParsedEvidence, sourceTitle: string, platform: Platform): RecipeDraft["recipe"] {
  const missing: string[] = [];
  if (parsed.ingredients.length === 0) missing.push("Ingredient quantities were not visible or spoken clearly.");
  if (parsed.steps.length === 0) missing.push("Cooking steps were not visible or spoken clearly.");
  if (parsed.servings === "Missing") missing.push("Servings were not stated.");
  if (parsed.cookTime === "Missing") missing.push("Cook time was not stated.");

  return {
    title: parsed.title,
    summary: `Recipe draft extracted from the provided ${platformLabel(platform)} evidence, not from generic recipe templates.`,
    servings: parsed.servings,
    prepTime: parsed.prepTime,
    cookTime: parsed.cookTime,
    totalTime: parsed.totalTime,
    confidence: missing.length ? "Needs review" : "Seen in video",
    ingredients: parsed.ingredients,
    equipment: parsed.equipment.length ? parsed.equipment : ["Equipment not confirmed from evidence"],
    steps: parsed.steps,
    tags: parsed.tags,
    notes: [
      "Only evidence-backed ingredients and steps are shown.",
      "Taystfuhl does not invent missing quantities, temperatures, or cook times.",
      ...missing
    ],
    evidenceUsed: parsed.evidenceUsed,
    safety: "Verify cook times, temperatures, allergens, and storage guidance. Poultry should reach 165 F."
  };
}

function buildNeedsEvidenceRecipe(
  sourceTitle: string,
  platform: Platform,
  embedAllowed: boolean
): RecipeDraft["recipe"] {
  return {
    title: recipeTitleFromSource(sourceTitle, "Recipe evidence needed"),
    summary:
      "Taystfuhl found the source, but this MVP cannot honestly extract quantities or steps from URL metadata alone.",
    servings: "Missing",
    prepTime: "Missing",
    cookTime: "Missing",
    totalTime: "Missing",
    confidence: "Needs review",
    ingredients: [],
    equipment: [],
    steps: [],
    tags: ["needs evidence", platformLabel(platform).toLowerCase()],
    notes: [
      "Add transcript, captions, creator description, or frame notes to produce a specific recipe draft.",
      "The next production worker should fetch transcript and key frames automatically before calling the extractor.",
      embedAllowed
        ? "This source can be embedded or linked, but the recipe still needs evidence."
        : "This source should be treated as link-only until approved platform access exists."
    ],
    evidenceUsed: [],
    safety: "No cooking guidance generated. Recipe evidence is required first."
  };
}

function fallbackTitle(platform: Platform): string {
  return `${platformLabel(platform)} cooking video`;
}

function platformLabel(platform: Platform): string {
  const labels: Record<Platform, string> = {
    youtube: "YouTube",
    tiktok: "TikTok",
    instagram: "Instagram",
    generic: "Source"
  };
  return labels[platform];
}

function cleanTitle(title?: string): string {
  if (!title) return "";
  return title.replace(/\s+/g, " ").trim().slice(0, 120);
}

function recipeTitleFromSource(sourceTitle: string, fallback: string): string {
  const trimmed = sourceTitle
    .replace(/#\w+/g, "")
    .replace(/\|.*$/g, "")
    .replace(/ - YouTube$/i, "")
    .trim();

  if (trimmed.length < 8 || /vlog|shorts|compilation/i.test(trimmed)) return fallback;
  return trimmed.length > 76 ? `${trimmed.slice(0, 73)}...` : trimmed;
}

function inferTitle(sourceTitle: string, ingredients: RecipeIngredient[], tags: Set<string>): string {
  const sourceBased = recipeTitleFromSource(sourceTitle, "");
  if (sourceBased) return sourceBased;

  const firstUseful = ingredients.find((ingredient) => !/salt|pepper|oil|water/i.test(ingredient.item));
  if (firstUseful) return `${firstUseful.item} Recipe`;
  if (tags.has("pasta")) return "Evidence-Backed Pasta";
  if (tags.has("chicken")) return "Evidence-Backed Chicken";
  return "Evidence-Backed Recipe Draft";
}

function titleCaseIngredient(item: string): string {
  return item
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeInstruction(line: string): string {
  const cleaned = line.replace(/^(step\s*\d+[:.)-]?|\d+[:.)-])\s*/i, "").trim();
  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function formatTime(amount: string, unit: string): string {
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit.startsWith("sec")) return `${amount} sec`;
  if (normalizedUnit.startsWith("hour") || normalizedUnit.startsWith("hr")) return `${amount} hr`;
  return `${amount} min`;
}

function combineTimes(prepTime: string, cookTime: string): string {
  const prep = timeToMinutes(prepTime);
  const cook = timeToMinutes(cookTime);
  if (prep === null && cook === null) return "Missing";
  return `${(prep || 0) + (cook || 0)} min`;
}

function timeToMinutes(value: string): number | null {
  const match = value.match(/(\d+)\s*(sec|min|hr)/i);
  if (!match) return null;
  const amount = Number.parseInt(match[1], 10);
  if (match[2].toLowerCase() === "sec") return Math.ceil(amount / 60);
  if (match[2].toLowerCase() === "hr") return amount * 60;
  return amount;
}

function inferEquipment(equipment: Set<string>, lower: string) {
  const checks: Array<[RegExp, string]> = [
    [/air fryer/, "Air fryer"],
    [/skillet|pan\b/, "Skillet"],
    [/oven|bake|roast|preheat/, "Oven"],
    [/pot|boil/, "Pot"],
    [/blender|blend/, "Blender"],
    [/bowl|mix|whisk/, "Mixing bowl"],
    [/knife|chop|dice|slice/, "Knife"],
    [/thermometer|temperature/, "Thermometer"]
  ];

  for (const [pattern, label] of checks) {
    if (pattern.test(lower)) equipment.add(label);
  }
}

function addIngredientTags(tags: Set<string>, item: string) {
  const lower = item.toLowerCase();
  if (/chicken|turkey|beef|pork|salmon|shrimp|egg/.test(lower)) tags.add("protein");
  if (/chicken/.test(lower)) tags.add("chicken");
  if (/pasta|noodle|spaghetti/.test(lower)) tags.add("pasta");
  if (/chocolate|sugar|flour|cake|cookie/.test(lower)) tags.add("dessert");
}

function addStepTags(tags: Set<string>, lower: string) {
  if (/air fry/.test(lower)) tags.add("air fryer");
  if (/bake|oven/.test(lower)) tags.add("baking");
  if (/simmer|saute|sauté|skillet/.test(lower)) tags.add("skillet");
  if (/meal prep/.test(lower)) tags.add("meal prep");
}

function dedupeIngredients(ingredients: RecipeIngredient[]): RecipeIngredient[] {
  const seen = new Set<string>();
  return ingredients.filter((ingredient) => {
    const key = ingredient.item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeSteps(steps: RecipeStep[]): RecipeStep[] {
  const seen = new Set<string>();
  return steps.filter((step) => {
    const key = step.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toMarkdown(draft: RecipeDraft): string {
  const ingredientLines = draft.recipe.ingredients.length
    ? draft.recipe.ingredients
        .map(
          (ingredient) =>
            `- ${ingredient.amount} ${ingredient.item} (${ingredient.confidence}; evidence: ${ingredient.evidence})`
        )
        .join("\n")
    : "- No ingredients extracted. Add transcript or frame notes first.";
  const stepLines = draft.recipe.steps.length
    ? draft.recipe.steps
        .map((step, index) => `${index + 1}. ${step.text} (${step.confidence}; evidence: ${step.evidence})`)
        .join("\n")
    : "1. No cooking method extracted. Add transcript or frame notes first.";
  const noteLines = draft.recipe.notes.map((note) => `- ${note}`).join("\n");
  const evidenceLines = draft.recipe.evidenceUsed.length
    ? draft.recipe.evidenceUsed.map((item) => `- ${item}`).join("\n")
    : "- No recipe evidence supplied.";

  return `# ${draft.recipe.title}

Source: ${draft.source.attribution}
Original URL: ${draft.source.url}
Extraction status: ${draft.status}

Servings: ${draft.recipe.servings}
Prep: ${draft.recipe.prepTime}
Cook: ${draft.recipe.cookTime}
Total: ${draft.recipe.totalTime}
Confidence: ${draft.recipe.confidence}

## Ingredients

${ingredientLines}

## Equipment

${draft.recipe.equipment.map((item) => `- ${item}`).join("\n") || "- Not confirmed from evidence."}

## Method

${stepLines}

## Evidence Used

${evidenceLines}

## Notes

${noteLines}

## Safety

${draft.recipe.safety}

Generated by Taystfuhl. Evidence-backed draft; verify before cooking.
`;
}
