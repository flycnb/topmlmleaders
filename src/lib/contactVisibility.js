export function isContactAllowed(visibility, viewerPlan) {
  const v = (visibility || "public").toLowerCase();
  const p = (viewerPlan || "free").toLowerCase();
  if (v === "public") return true;
  if (v === "private") return false;
  if (v === "pro") return ["pro", "elite", "company"].includes(p);
  if (v === "elite") return ["elite", "company"].includes(p);
  return true;
}

export function getContactMessage(visibility) {
  const v = (visibility || "public").toLowerCase();
  if (v === "private") return "This member hasn't shared their contact";
  if (v === "pro") return "This contact is visible to Pro members only";
  if (v === "elite") return "This contact is visible to Elite members only";
  return null;
}
