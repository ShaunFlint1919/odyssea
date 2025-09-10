# Odyssea Lymphea - Kinésithérapie Website

## Overview

Odyssea Lymphea is a modern physiotherapy practice website built as a full-stack application. The site showcases a specialized kinésithérapie (physiotherapy) clinic in Waterloo, Belgium, focusing on lymphatic drainage, scar treatment, and laser hair removal. The application features a sleek, professional design with smooth animations and a contact form for appointment booking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with custom design tokens for consistent theming
- **UI Components**: Radix UI primitives with shadcn/ui component library for accessible, customizable components
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Animations**: CSS transitions and Intersection Observer API for scroll-triggered animations

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Development**: Hot module replacement with Vite integration
- **Middleware**: Custom logging middleware for API request tracking
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Storage Interface**: Abstracted storage layer with in-memory implementation for development

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: User management with username/password authentication
- **Migrations**: Drizzle Kit for database schema management
- **Connection**: Neon Database serverless PostgreSQL connection

### Component Architecture
- **Design System**: Consistent component library with shared design tokens
- **Layout**: Modular section-based layout (Navigation, Hero, Services, About, Contact, Footer)
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Accessibility**: ARIA labels, semantic HTML, and keyboard navigation support

### Development Workflow
- **Build System**: Vite for fast development and optimized production builds
- **Type Safety**: Comprehensive TypeScript configuration with strict mode
- **Code Quality**: Path mapping for clean imports and organized file structure
- **Environment**: Development and production environment configurations

## External Dependencies

### Database and Storage
- **Neon Database**: Serverless PostgreSQL database for production data storage
- **Drizzle ORM**: Type-safe database operations and schema management

### UI and Styling
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Lucide React**: Consistent icon library for UI elements

### State Management and Data Fetching
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: Runtime type validation for form data and API responses

### Development Tools
- **Vite**: Fast build tool with hot module replacement
- **Replit Integration**: Development environment optimization for Replit platform
- **ESBuild**: Fast JavaScript bundler for production builds

### Fonts and Assets
- **Google Fonts**: Custom typography with Inter, DM Sans, Fira Code, and Geist Mono
- **Unsplash**: High-quality images for website content

### Authentication and Session Management
- **Connect PG Simple**: PostgreSQL session store for Express sessions
- **Express Sessions**: Server-side session management

The application is designed for easy deployment and scalability, with a clear separation between development and production environments, comprehensive error handling, and a modular architecture that supports future feature additions.