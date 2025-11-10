# Overview

"Beleza com Luci" is a beauty platform designed to provide followers with exclusive content, digital products, and discount coupons. It functions as a comprehensive beauty community, offering exclusive videos, downloadable e-books and courses, discount access from partner brands, and community engagement features. The platform supports a subscription model with both free and premium tiers, gating premium content behind paid subscriptions. The business vision is to create a thriving online community around beauty, leveraging exclusive content and partnerships to generate revenue and build a loyal user base.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Technology Stack**: React 18, TypeScript, Vite.
- **Styling**: TailwindCSS with Shadcn/UI for accessible components.
- **Routing**: Wouter for client-side routing with protected routes.
- **State Management**: TanStack Query for server state, React Context for authentication.
- **Form Handling**: React Hook Form with Zod validation.
- **Design Principles**: Mobile-first responsive design.

## Backend Architecture
- **Technology Stack**: Node.js with Express.js.
- **Authentication**: Passport.js local strategy for username/password.
- **Session Management**: Express sessions with PostgreSQL store.
- **Security**: Scrypt-based password hashing.
- **Middleware**: Request logging, JSON parsing, error handling.

## Database Design
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema**: Includes tables for Users, Subscriptions, Videos, Products, Coupons, Banners, Posts, Comments, and Activity tracking.

## Core Features
- **Content System**: Embedded video player with subscription-based access control; digital product downloads.
- **Coupon System**: Manages brand partnerships, categories, and usage analytics. Auto-fills next available position when creating new coupons.
- **Banner System**: Dynamic, admin-controlled banners for pages like `/bio`, supporting activation, order, and display periods.
- **Video & Product Management**: Automatic detection of YouTube video (single) vs. playlist for courses. YouTube API integration for syncing channel videos, extracting metadata, and batch importing.
- **Access Control**: Role-based permissions for admin users and subscription-gated premium content.
- **User Experience**: Activity tracking, search/filtering capabilities, community forums, responsive design.

## UI/UX Decisions
- Consistent padding (`pt-16` desktop, `pt-32` mobile) across pages for proper layout.
- Interactive modals for YouTube synchronization, providing video selection, batch configuration, and real-time feedback.
- AlertDialogs for conflict resolution (e.g., coupon order).

# External Dependencies

## Database Services
- **Locaweb PostgreSQL**: External PostgreSQL database.
- **Drizzle Kit**: ORM for type-safe database operations and schema management.
- **Railway PostgreSQL**: For Railway deployments, configured via environment variables.

## Authentication & Sessions
- **Passport.js**: Authentication middleware.
- **Connect-PG-Simple**: PostgreSQL-backed session storage.

## Frontend Libraries
- **Radix UI**: Headless UI components.
- **TanStack Query**: Server state management.
- **React Hook Form**: Form state management.
- **Zod**: Runtime type validation.
- **Date-fns**: Date manipulation utilities.

## APIs
- **YouTube Data API v3**: For video synchronization and metadata extraction.

## Deployment & Development Tools
- **Vite**: Fast build tool and development server.
- **ESBuild**: Production bundle optimization.
- **TypeScript**: Static type checking.
- **Railway**: Deployment platform with specific configurations for environment variables, health checks, and build/start commands.