// UI strings live in a single dictionary, ready for localization.
import type { Unit } from "./api/client";

export const t = {
  appName: "Culinode",
  tagline: "A chef's private recipe book",
  nav: {
    discover: "Discover",
    notebook: "My recipes",
    favorites: "Favorites",
    notifications: "Notifications",
    account: "Account",
    signIn: "Sign in",
    signOut: "Sign out",
    moderation: "Moderation",
  },
  states: {
    loading: "Loading…",
    empty: "Nothing here yet.",
    error: "Something went wrong.",
    retry: "Try again",
    unauthorized: "You need to sign in to view this page.",
    forbidden: "You don't have access to this content.",
    notFound: "The content you're looking for was not found or has been unpublished.",
    offline: "You're offline. Changes were not saved.",
  },
  recipe: {
    title: "Recipe title",
    description: "Description",
    yield: "Servings / yield",
    prep: "Prep (min)",
    cook: "Cook (min)",
    ingredients: "Ingredients",
    steps: "Method",
    tags: "Tags",
    privateNote: "Private note (only you can see this)",
    cover: "Cover photo",
    toTaste: "to taste",
    addIngredient: "Add ingredient",
    addStep: "Add step",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    unsaved: "Not saved",
    delete: "Delete",
    minutes: "min",
    copiedFrom: "Source",
  },
  publish: {
    publish: "Publish",
    update: "Update publication",
    unpublish: "Unpublish",
    published: "Published",
    unpublished: "Private",
    copyAllowed: "Let readers copy it to their recipe book",
    draftNewer: "The draft has unpublished changes.",
    copyNotRepublishable: "Copied recipes cannot be republished.",
  },
  conflict: {
    title: "This recipe changed somewhere else",
    body: "The version on the server differs from your edit. No version was deleted.",
    useRemote: "Use the server version",
    keepLocalAsNew: "Keep my version as a new recipe",
    overwrite: "Overwrite with my version",
  },
} as const;

export const unitLabels: Record<Unit, string> = {
  g: "g",
  kg: "kg",
  mg: "mg",
  ml: "ml",
  l: "l",
  tsp: "tsp",
  tbsp: "tbsp",
  cup: "cup",
  piece: "pc",
  pinch: "pinch",
  slice: "slice",
  clove: "clove",
  bunch: "bunch",
  can: "can",
  pack: "pack",
  cm: "cm",
  serving: "serving",
  portion: "portion",
  other: "",
};

export function formatQuantity(q: { amount?: number | null; unit?: Unit | null; toTaste: boolean }): string {
  if (q.toTaste && (q.amount == null)) return t.recipe.toTaste;
  const amount = q.amount == null ? "" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(q.amount);
  const unit = q.unit ? unitLabels[q.unit] : "";
  return [amount, unit, q.toTaste ? `(${t.recipe.toTaste})` : ""].filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso));
}

export function problemMessage(code: string | undefined, fallback?: string): string {
  switch (code) {
    case "network":
      return t.states.offline;
    case "unauthenticated":
      return "Your session has expired. Please sign in again.";
    case "forbidden":
      return t.states.forbidden;
    case "not-found":
      return t.states.notFound;
    case "revision-conflict":
      return t.conflict.title;
    case "rate-limited":
      return "Too many requests; please try again shortly.";
    case "not-publishable":
      return "The recipe is incomplete for publishing.";
    case "media-not-ready":
      return "The photo has not been processed yet; please try again shortly.";
    case "copy-not-allowed":
      return "The author does not allow copying this recipe.";
    case "blocked":
      return "You cannot interact with this user.";
    case "account-restricted":
      return "Your account is restricted from public interaction.";
    case "account-deleting":
      return "Account deletion is in progress.";
    case "recent-login-required":
      return "Please sign in again to do this.";
    default:
      return fallback ?? t.states.error;
  }
}
