"use client";

import { FormEvent, useMemo, useState } from "react";
import type { RecipeDraft } from "@/lib/decode";

const samples = [
  {
    label: "YouTube pasta",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  },
  {
    label: "TikTok chicken",
    url: "https://www.tiktok.com/@creator/video/7320000000000000000"
  },
  {
    label: "Instagram dessert",
    url: "https://www.instagram.com/reel/C0ffeeCake/"
  }
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function decode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to decode this video.");
      }

      setDraft(payload as RecipeDraft);
    } catch (caught) {
      setDraft(null);
      setError(caught instanceof Error ? caught.message : "Unable to decode this video.");
    } finally {
      setIsLoading(false);
    }
  }

  function useSample(sampleUrl: string) {
    setUrl(sampleUrl);
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
            Taystfuhl turns fast, messy cooking videos into clear ingredients, steps,
            times, and servings you can actually cook from.
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
            <p className="trust-line">
              We estimate missing amounts, flag uncertainty, attribute the creator, and show
              what came from the source. Verify before cooking.
            </p>
            <div className="sample-row" aria-label="Sample URLs">
              {samples.map((sample) => (
                <button
                  className="sample-button"
                  key={sample.label}
                  type="button"
                  onClick={() => useSample(sample.url)}
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
          Use a sample above or paste a public cooking-video URL. The MVP produces a
          structured recipe draft so you can test the flow before live AI extraction is wired in.
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
      .join("\n");
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
          <span className="badge">{draft.source.platform}</span>
        </div>
      </aside>

      <article className="panel panel-pad">
        <div className="recipe-header">
          <div>
            <p className="kicker">Decoded recipe draft</p>
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
              {draft.recipe.ingredients.map((ingredient) => (
                <li key={`${ingredient.amount}-${ingredient.item}`}>
                  <strong>{ingredient.amount}</strong> {ingredient.item}
                  <br />
                  <span className="label">{ingredient.confidence}</span>
                </li>
              ))}
            </ul>

            <h3>Equipment</h3>
            <ul className="list">
              {draft.recipe.equipment.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Method</h3>
            <ol className="step-list">
              {draft.recipe.steps.map((step) => (
                <li key={step.text}>
                  <span>
                    {step.text}
                    <br />
                    <span className="label">{step.confidence}</span>
                  </span>
                </li>
              ))}
            </ol>

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
