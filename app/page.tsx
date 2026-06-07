"use client";

import { FormEvent, useMemo, useState } from "react";
import type { RecipeDraft } from "@/lib/decode";

const samples = [
  {
    label: "Evidence-rich pasta",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    evidence: `Serves 4
2 tbsp olive oil
4 cloves garlic, minced
1 lb chicken breast, sliced
1 tsp kosher salt
1/2 tsp black pepper
8 oz penne pasta
1 cup heavy cream
1/2 cup grated parmesan
Preheat skillet over medium-high heat
Cook chicken 6 minutes until browned
Boil pasta 10 minutes
Simmer cream sauce 3 minutes
Toss pasta with sauce and parmesan`
  },
  {
    label: "URL-only test",
    url: "https://www.tiktok.com/@creator/video/7320000000000000000",
    evidence: ""
  },
  {
    label: "Dessert notes",
    url: "https://www.instagram.com/reel/C0ffeeCake/",
    evidence: `Makes 9 servings
1/2 cup melted butter
1 cup brown sugar
1 egg
1 tsp vanilla
1 cup flour
1/2 tsp baking powder
1 cup chocolate chips
Mix butter and sugar
Whisk in egg and vanilla
Fold in flour and chocolate chips
Bake at 350 degrees for 22 minutes`
  }
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isIngredientsModalOpen, setIsIngredientsModalOpen] = useState(false);

  async function decode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, evidenceText })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to decode this video.");
      }

      setDraft(payload as RecipeDraft);
      setIsIngredientsModalOpen(true);
    } catch (caught) {
      setDraft(null);
      setIsIngredientsModalOpen(false);
      setError(caught instanceof Error ? caught.message : "Unable to decode this video.");
    } finally {
      setIsLoading(false);
    }
  }

  function useSample(sample: (typeof samples)[number]) {
    setUrl(sample.url);
    setEvidenceText(sample.evidence);
    setDraft(null);
    setError("");
  }

  return (
    <main className="page">
      <header className="shell topbar">
        <div className="brand" aria-label="Taystfuhl">
          <span className="brand-mark">T</span>
          <span>taystfuhl</span>
        </div>
        <div className="nav-note">No unlicensed rehosting. Just cook-ready recipes.</div>
      </header>

      <section className="shell hero">
        <div>
          <p className="eyebrow">Viral recipe decoder</p>
          <h1>Paste a cooking video. Get the real recipe.</h1>
          <p className="hero-copy">
            Taystfuhl turns messy cooking-video evidence into clear ingredients, steps,
            times, and servings. If the video evidence is missing, it refuses to fake it.
          </p>

          <form className="decoder" onSubmit={decode}>
            <div className="form-row">
              <input
                className="url-input"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="Paste TikTok, Instagram, YouTube, or recipe video link"
                aria-label="Cooking video URL"
              />
              <button className="primary-button" type="submit" disabled={isLoading}>
                {isLoading ? "Decoding..." : "Decode a video"}
              </button>
            </div>
            <textarea
              className="evidence-input"
              value={evidenceText}
              onChange={(event) => setEvidenceText(event.target.value)}
              placeholder="Optional for this demo: paste captions, creator description, or frame notes. Production workers will auto-fill this from transcripts and key frames."
              aria-label="Video transcript or frame notes"
              rows={6}
            />
            <p className="trust-line">
              Evidence-first extraction: no generic filler, no invented cook times. URL-only
              submissions will ask for transcript or frame evidence.
            </p>
            <div className="sample-row" aria-label="Sample URLs">
              {samples.map((sample) => (
                <button
                  className="sample-button"
                  key={sample.label}
                  type="button"
                  onClick={() => useSample(sample)}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </form>

          {error ? <div className="error">{error}</div> : null}
        </div>

        <aside className="visual-panel" aria-label="Kitchen workspace preview">
          <div className="floating-card">
            <h2>From “wait, how much?” to cook-ready.</h2>
            <p>
              Every draft uses confidence labels: Seen in video, Likely, Estimated,
              Missing, or Needs review.
            </p>
            <div className="stat-grid">
              <div className="stat">
                <strong>URL</strong>
                <span>input</span>
              </div>
              <div className="stat">
                <strong>AI</strong>
                <span>draft</span>
              </div>
              <div className="stat">
                <strong>Card</strong>
                <span>download</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="shell section">
        {draft ? <RecipeResult draft={draft} /> : <EmptyState />}
      </section>

      {draft && isIngredientsModalOpen ? (
        <IngredientsModal draft={draft} onClose={() => setIsIngredientsModalOpen(false)} />
      ) : null}

      <footer className="shell">
        Taystfuhl never claims ownership of source videos. Recipe cards are AI-extracted
        drafts with attribution and safety notes.
      </footer>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="panel panel-pad empty-state">
      <div>
        <p className="kicker">Ready when you are</p>
        <h2 className="recipe-title">Decode your first recipe</h2>
        <p>
          Use an evidence-rich sample to see specific extraction. Use URL-only to confirm
          Taystfuhl now refuses to invent ingredients from metadata.
        </p>
      </div>
    </div>
  );
}

function RecipeResult({ draft }: { draft: RecipeDraft }) {
  const fileName = useMemo(
    () =>
      `${draft.recipe.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "taystfuhl-recipe"}.md`,
    [draft.recipe.title]
  );

  function downloadRecipe() {
    const blob = new Blob([draft.downloadMarkdown], { type: "text/markdown;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  async function copyIngredients() {
    const ingredients = draft.recipe.ingredients
      .map((ingredient) => `${ingredient.amount} ${ingredient.item}`)
      .join("\n") || "No ingredients extracted yet.";
    await navigator.clipboard.writeText(ingredients);
  }

  return (
    <div className="result-layout">
      <aside className="panel panel-pad source-box">
        <div className="source-thumb" aria-hidden="true" />
        <div>
          <p className="kicker">Original source</p>
          <h2 className="source-title">{draft.source.title}</h2>
          <p>
            {draft.source.attribution} ·{" "}
            {draft.source.embedAllowed ? "official embed-ready" : "source-link-only"}
          </p>
          <a className="source-link" href={draft.source.url} target="_blank" rel="noreferrer">
            View original video
          </a>
        </div>
        <div className="badge-row">
          <span className="badge confidence">{draft.recipe.confidence}</span>
          <span className="badge">{draft.status === "draft_ready" ? "evidence-backed" : "needs evidence"}</span>
          <span className="badge">{draft.source.platform}</span>
        </div>
      </aside>

      <article className="panel panel-pad">
        <div className="recipe-header">
          <div>
            <p className="kicker">{draft.status === "draft_ready" ? "Decoded recipe draft" : "Evidence needed"}</p>
            <h2 className="recipe-title">{draft.recipe.title}</h2>
            <p>{draft.recipe.summary}</p>
          </div>
          <div className="recipe-meta">
            <span>{draft.recipe.servings}</span>
            <span>Prep {draft.recipe.prepTime}</span>
            <span>Cook {draft.recipe.cookTime}</span>
            <span>Total {draft.recipe.totalTime}</span>
          </div>
          <div className="action-row">
            <button className="primary-button" type="button" onClick={downloadRecipe}>
              Download recipe card
            </button>
            <button className="secondary-button" type="button" onClick={copyIngredients}>
              Copy ingredients
            </button>
            <a className="secondary-link" href={ingredientEmailHref(draft)}>
              Email ingredients
            </a>
          </div>
          <div className="badge-row">
            {draft.recipe.tags.map((tag) => (
              <span className="badge" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="columns">
          <section>
            <h3>Ingredients</h3>
            <ul className="list">
              {draft.recipe.ingredients.length ? draft.recipe.ingredients.map((ingredient) => (
                <li key={`${ingredient.amount}-${ingredient.item}`}>
                  <strong>{ingredient.amount}</strong> {ingredient.item}
                  <br />
                  <span className="label">{ingredient.confidence}</span>
                </li>
              )) : <li>No ingredients extracted. Add captions, creator description, or frame notes.</li>}
            </ul>

            <h3>Equipment</h3>
            <ul className="list">
              {draft.recipe.equipment.length ? draft.recipe.equipment.map((item) => (
                <li key={item}>{item}</li>
              )) : <li>No equipment confirmed from evidence.</li>}
            </ul>
          </section>

          <section>
            <h3>Method</h3>
            <ol className="step-list">
              {draft.recipe.steps.length ? draft.recipe.steps.map((step) => (
                <li key={step.text}>
                  <span>
                    {step.text}
                    <br />
                    <span className="label">{step.confidence}</span>
                  </span>
                </li>
              )) : <li><span>No cooking steps extracted. Add transcript or frame notes.</span></li>}
            </ol>

            <div className="notes">
              <strong>Evidence used:</strong>
              <ul>
                {draft.recipe.evidenceUsed.length ? draft.recipe.evidenceUsed.map((item) => (
                  <li key={item}>{item}</li>
                )) : <li>No recipe evidence supplied.</li>}
              </ul>
            </div>

            <div className="notes">
              <strong>Safety note:</strong> {draft.recipe.safety}
            </div>

            <div className="notes">
              <strong>Assumptions:</strong>
              <ul>
                {draft.recipe.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}

function IngredientsModal({ draft, onClose }: { draft: RecipeDraft; onClose: () => void }) {
  const ingredientsText = ingredientText(draft);

  async function copyIngredients() {
    await navigator.clipboard.writeText(ingredientsText);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ingredient-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingredients-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="kicker">Quick send</p>
            <h2 id="ingredients-modal-title">Ingredients</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close ingredients modal" onClick={onClose}>
            x
          </button>
        </div>

        <div className="ingredient-modal-list">
          {draft.recipe.ingredients.length ? (
            draft.recipe.ingredients.map((ingredient) => (
              <div className="ingredient-modal-row" key={`${ingredient.amount}-${ingredient.item}`}>
                <span>
                  <strong>{ingredient.amount}</strong> {ingredient.item}
                </span>
                <span>{ingredient.confidence}</span>
              </div>
            ))
          ) : (
            <p>No ingredients extracted yet. Add transcript, creator description, or frame notes first.</p>
          )}
        </div>

        <div className="modal-actions">
          <a className="primary-link" href={ingredientEmailHref(draft)}>
            Email to myself
          </a>
          <button className="secondary-button" type="button" onClick={copyIngredients}>
            Copy ingredients
          </button>
        </div>
      </div>
    </div>
  );
}

function ingredientText(draft: RecipeDraft) {
  if (!draft.recipe.ingredients.length) {
    return "No ingredients extracted yet. Add transcript, creator description, or frame notes first.";
  }

  return draft.recipe.ingredients
    .map((ingredient) => `${ingredient.amount} ${ingredient.item} (${ingredient.confidence})`)
    .join("\n");
}

function ingredientEmailHref(draft: RecipeDraft) {
  const subject = encodeURIComponent(`Taystfuhl ingredients: ${draft.recipe.title}`);
  const body = encodeURIComponent(
    `${draft.recipe.title}\n\n${ingredientText(draft)}\n\nSource: ${draft.source.url}\n\nGenerated by Taystfuhl. Verify before cooking.`
  );

  return `mailto:?subject=${subject}&body=${body}`;
}
