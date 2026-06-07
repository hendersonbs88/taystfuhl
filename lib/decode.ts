export type Platform = "youtube" | "tiktok" | "instagram" | "generic";

export type ConfidenceLabel = "Seen in video" | "Likely" | "Estimated" | "Missing" | "Needs review";

export type RecipeIngredient = {
  item: string;
  amount: string;
  confidence: ConfidenceLabel;
};

export type RecipeStep = {
  text: string;
  confidence: ConfidenceLabel;
};

export type RecipeDraft = {
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
    safety: string;
  };
  downloadMarkdown: string;
};

type OEmbedResponse = {
  title?: string;
  author_name?: string;
  provider_name?: string;
};

type RecipeTemplate = {
  match: string[];
  title: string;
  summary: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  equipment: string[];
  steps: RecipeStep[];
  cookTime: string;
};

const templates: RecipeTemplate[] = [
  {
    match: ["pasta", "spaghetti", "alfredo", "noodle"],
    title: "Creamy Garlic Pasta",
    summary: "A weeknight pasta draft built from common viral creamy pasta cues.",
    tags: ["pasta", "dinner", "comfort food", "viral"],
    cookTime: "18 min",
    equipment: ["Large pot", "Skillet", "Tongs", "Measuring cup"],
    ingredients: [
      { item: "Pasta", amount: "8 oz", confidence: "Likely" },
      { item: "Garlic", amount: "3 cloves, minced", confidence: "Likely" },
      { item: "Butter or olive oil", amount: "2 tbsp", confidence: "Estimated" },
      { item: "Cream or milk", amount: "1 cup", confidence: "Estimated" },
      { item: "Parmesan", amount: "1/2 cup", confidence: "Likely" },
      { item: "Salt and black pepper", amount: "to taste", confidence: "Likely" }
    ],
    steps: [
      { text: "Boil pasta in salted water until just tender. Reserve 1/2 cup pasta water.", confidence: "Likely" },
      { text: "Saute garlic in butter or oil until fragrant, about 30 seconds.", confidence: "Estimated" },
      { text: "Add cream and simmer until slightly thickened.", confidence: "Estimated" },
      { text: "Toss in pasta, parmesan, and splashes of pasta water until glossy.", confidence: "Likely" },
      { text: "Season, plate, and serve immediately.", confidence: "Likely" }
    ]
  },
  {
    match: ["chicken", "tender", "breast", "thigh"],
    title: "Savory Skillet Chicken",
    summary: "A cook-ready chicken draft with safety-first temperature guidance.",
    tags: ["chicken", "dinner", "high protein", "skillet"],
    cookTime: "22 min",
    equipment: ["Skillet", "Tongs", "Instant-read thermometer", "Cutting board"],
    ingredients: [
      { item: "Chicken", amount: "1 lb", confidence: "Likely" },
      { item: "Olive oil", amount: "1 tbsp", confidence: "Estimated" },
      { item: "Garlic powder", amount: "1 tsp", confidence: "Estimated" },
      { item: "Paprika", amount: "1 tsp", confidence: "Estimated" },
      { item: "Salt and pepper", amount: "to taste", confidence: "Likely" },
      { item: "Lemon juice or sauce", amount: "1 tbsp", confidence: "Missing" }
    ],
    steps: [
      { text: "Pat chicken dry and season on both sides.", confidence: "Likely" },
      { text: "Heat oil in a skillet over medium-high heat.", confidence: "Likely" },
      { text: "Sear chicken until browned, then reduce heat and cook through.", confidence: "Estimated" },
      { text: "Rest 5 minutes before slicing.", confidence: "Likely" },
      { text: "Verify internal temperature reaches 165 F.", confidence: "Seen in video" }
    ]
  },
  {
    match: ["air fryer", "air-fryer", "crispy"],
    title: "Crispy Air Fryer Bites",
    summary: "A crispy air fryer recipe draft for bite-sized viral snacks or proteins.",
    tags: ["air fryer", "crispy", "quick", "viral"],
    cookTime: "14 min",
    equipment: ["Air fryer", "Mixing bowl", "Tongs"],
    ingredients: [
      { item: "Main ingredient from video", amount: "1 lb or 4 cups", confidence: "Needs review" },
      { item: "Oil spray", amount: "light coating", confidence: "Likely" },
      { item: "Seasoning blend", amount: "2 tsp", confidence: "Estimated" },
      { item: "Salt", amount: "1/2 tsp", confidence: "Estimated" }
    ],
    steps: [
      { text: "Cut ingredients into even pieces so they cook at the same speed.", confidence: "Likely" },
      { text: "Toss with seasoning and a light oil coating.", confidence: "Likely" },
      { text: "Air fry at 390 F, shaking halfway.", confidence: "Estimated" },
      { text: "Cook until browned and crisp at the edges.", confidence: "Likely" }
    ]
  },
  {
    match: ["cookie", "cake", "brownie", "dessert", "chocolate"],
    title: "Viral Dessert Bake",
    summary: "A dessert draft that preserves uncertainty where short videos skip measurements.",
    tags: ["dessert", "baking", "sweet", "viral"],
    cookTime: "25 min",
    equipment: ["Mixing bowl", "Spatula", "Baking pan", "Oven"],
    ingredients: [
      { item: "Flour", amount: "1 cup", confidence: "Estimated" },
      { item: "Sugar", amount: "1/2 cup", confidence: "Estimated" },
      { item: "Butter", amount: "1/2 cup", confidence: "Estimated" },
      { item: "Egg", amount: "1 large", confidence: "Likely" },
      { item: "Chocolate or featured mix-in", amount: "1 cup", confidence: "Likely" }
    ],
    steps: [
      { text: "Preheat oven to 350 F.", confidence: "Estimated" },
      { text: "Mix wet ingredients until smooth.", confidence: "Likely" },
      { text: "Fold in dry ingredients and featured mix-ins.", confidence: "Likely" },
      { text: "Bake until edges set and center is no longer wet.", confidence: "Estimated" },
      { text: "Cool before slicing or serving.", confidence: "Likely" }
    ]
  }
];

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

  try {
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "TaystfuhlRecipeDecoder/0.1" },
      next: { revalidate: 3600 }
    });

    if (!response.ok) return {};
    return (await response.json()) as OEmbedResponse;
  } catch {
    return {};
  }
}

export function generateRecipeDraft(url: string, platform: Platform, metadata: OEmbedResponse = {}): RecipeDraft {
  const sourceTitle = cleanTitle(metadata.title) || fallbackTitle(platform);
  const creator = metadata.author_name || "Original creator";
  const lower = `${sourceTitle} ${url}`.toLowerCase();
  const template = templates.find((item) => item.match.some((match) => lower.includes(match))) || defaultTemplate();
  const title = sourceTitle === fallbackTitle(platform) ? template.title : recipeTitleFromSource(sourceTitle, template.title);
  const embedAllowed = platform === "youtube" || platform === "tiktok";
  const notes = [
    "AI-style draft generated from public metadata in this MVP. Verify against the original video before cooking.",
    "Amounts marked Estimated or Missing need human review.",
    embedAllowed
      ? "Taystfuhl should use the official embed or source link for this platform."
      : "This platform starts as source-link-only until approved access is available."
  ];

  const draft: RecipeDraft = {
    source: {
      url,
      platform,
      title: sourceTitle,
      creator,
      embedAllowed,
      attribution: `${creator} on ${platformLabel(platform)}`
    },
    recipe: {
      title,
      summary: template.summary,
      servings: "2-4 servings",
      prepTime: "10 min",
      cookTime: template.cookTime,
      totalTime: addTimes("10 min", template.cookTime),
      confidence: platform === "generic" || platform === "instagram" ? "Needs review" : "Estimated",
      ingredients: template.ingredients,
      equipment: template.equipment,
      steps: template.steps,
      tags: Array.from(new Set(["trending", platformLabel(platform).toLowerCase(), ...template.tags])),
      notes,
      safety: "Verify cook times, temperatures, allergens, and storage guidance. Poultry should reach 165 F."
    },
    downloadMarkdown: ""
  };

  draft.downloadMarkdown = toMarkdown(draft);
  return draft;
}

export async function decodeVideoUrl(input: string): Promise<RecipeDraft> {
  const url = normalizeUrl(input);
  const platform = detectPlatform(url);
  const metadata = await fetchSourceMetadata(url, platform);
  return generateRecipeDraft(url, platform, metadata);
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

function defaultTemplate(): RecipeTemplate {
  return {
    match: [],
    title: "Decoded Viral Recipe",
    summary: "A practical recipe draft inferred from a public cooking-video source.",
    tags: ["viral", "quick", "decoded"],
    cookTime: "20 min",
    equipment: ["Cutting board", "Knife", "Skillet or baking dish", "Mixing bowl"],
    ingredients: [
      { item: "Main ingredient shown in video", amount: "1 lb or 4 cups", confidence: "Missing" },
      { item: "Cooking oil", amount: "1-2 tbsp", confidence: "Estimated" },
      { item: "Seasoning blend", amount: "2 tsp", confidence: "Estimated" },
      { item: "Salt and pepper", amount: "to taste", confidence: "Likely" },
      { item: "Sauce or garnish from video", amount: "as shown", confidence: "Needs review" }
    ],
    steps: [
      { text: "Prep the main ingredient into even pieces.", confidence: "Likely" },
      { text: "Season and coat with oil or sauce as shown in the source.", confidence: "Estimated" },
      { text: "Cook over medium-high heat or in a hot oven until browned.", confidence: "Estimated" },
      { text: "Taste, adjust seasoning, and finish with the garnish shown in the video.", confidence: "Likely" }
    ]
  };
}

function addTimes(prepTime: string, cookTime: string): string {
  const prep = Number.parseInt(prepTime, 10);
  const cook = Number.parseInt(cookTime, 10);
  if (Number.isNaN(prep) || Number.isNaN(cook)) return "Varies";
  return `${prep + cook} min`;
}

function toMarkdown(draft: RecipeDraft): string {
  const ingredientLines = draft.recipe.ingredients
    .map((ingredient) => `- ${ingredient.amount} ${ingredient.item} (${ingredient.confidence})`)
    .join("\n");
  const stepLines = draft.recipe.steps
    .map((step, index) => `${index + 1}. ${step.text} (${step.confidence})`)
    .join("\n");
  const noteLines = draft.recipe.notes.map((note) => `- ${note}`).join("\n");

  return `# ${draft.recipe.title}

Source: ${draft.source.attribution}
Original URL: ${draft.source.url}

Servings: ${draft.recipe.servings}
Prep: ${draft.recipe.prepTime}
Cook: ${draft.recipe.cookTime}
Total: ${draft.recipe.totalTime}
Confidence: ${draft.recipe.confidence}

## Ingredients

${ingredientLines}

## Equipment

${draft.recipe.equipment.map((item) => `- ${item}`).join("\n")}

## Method

${stepLines}

## Notes

${noteLines}

## Safety

${draft.recipe.safety}

Generated by Taystfuhl. AI-extracted draft; verify before cooking.
`;
}
