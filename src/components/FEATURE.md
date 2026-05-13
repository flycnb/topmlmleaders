# Shared components

## TICKET-004

- **QRCode.js** — QR encodes `https://topmlmleaders.com/u/{slug-or-id}` (fallback homepage URL if empty).

## TICKET-006

- **`src/lib/contactVisibility.js`** — shared `isContactAllowed(visibility, viewerPlan)` and `getContactMessage(visibility)` for phone/WhatsApp tier rules (public / private / pro / elite + company).
- **MemberCard.js** — `💬 Message` uses that helper with **`viewerPlan`** from Home (`user?.plan || "free"`). Button stays fully enabled; blocked cases show an **alert** (no greyed-out state).
