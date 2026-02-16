

# Conwayo Attendee Portal

A customer-facing event registration and ticket management app with a modern, marketing-style design.

## Design Direction
- **Color palette**: Vibrant, event-focused theme (e.g., deep purple/indigo primary with warm accent colors) — distinct from a typical admin dashboard
- **Style**: Modern, mobile-first, landing-page aesthetic with bold typography, smooth animations, and card-based layouts
- **Typography**: Clean sans-serif with large hero text on landing pages

---

## Phase 1: Dynamic Event Landing Page (`/event/:slug`)

**Event Hero Section**
- Fetch event details from the `events` table using the URL slug
- Display event name, venue, dates, and location in an attractive hero banner
- Show event status and key details

**Registration Form**
- List available ticket tiers from `ticket_tiers` (filtered by event) with name, price, and description
- Collect attendee info: First Name, Last Name, Email, Phone (optional), OIB (optional), Institution (optional)
- Collect billing info: Payer Name, Payer Type (individual/company), Payer OIB, Payer Address
- Ticket tier selection with price display
- On submit:
  1. Create an `attendees` record (with `ticket_tier_id` so the DB trigger sets `price_paid`)
  2. Create an `orders` record with status `'paid'` and proper `payer_name`/`payer_type`
  3. Create corresponding `order_items` record
- Show a success confirmation page with a summary

## Phase 2: Authentication & Attendee Dashboard

**Authentication**
- Login/signup page using Supabase Auth (email/password + magic link)
- Link attendee records to user profiles via `profile_id`

**My Tickets Dashboard (`/dashboard`)**
- List all events the logged-in user is registered for
- For each registration, show event name, date, ticket tier, and payment status

**Ticket View (`/dashboard/ticket/:attendeeId`)**
- Display a QR code generated from the `attendees.id` UUID
- Show attendee details, event info, and ticket tier
- Visual ticket card design (styled like a real event ticket)

## Phase 3: Upsell Marketplace

**Add-ons Section (on Dashboard, per event)**
- Fetch available services from `event_services` for the relevant event
- Display as product cards with name, description, and price
- Purchase flow:
  1. Create a new `orders` record (status: `'paid'`)
  2. Create `order_items` linking the order to the selected service
- Show purchased add-ons on the dashboard with their status

## Phase 4: Polish & Edge Cases

- Responsive design refinements for all screen sizes
- Loading states, error handling, and empty states
- Form validation with proper error messages
- Confirmation emails or toast notifications after registration/purchase
- Prevent duplicate registrations for the same event

