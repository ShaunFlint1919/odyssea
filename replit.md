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

## WordPress Theme

### WordPress Theme Architecture (October 2025)
A complete WordPress theme has been created to allow the site to run on WordPress CMS while maintaining the original design and functionality.

**Theme Structure:**
- **Language**: PHP with WordPress templating system
- **Styling**: CSS with WordPress-compatible custom properties
- **Navigation**: WordPress menu system with custom walker
- **Templates**: Page templates for all services (Renata Franca, Drainage Lymphatique, Soins Cicatrices, Épilation Laser)
- **Animations**: Vanilla JavaScript with Intersection Observer API
- **Responsive**: Mobile-first design matching the React version

**Key Files:**
- `wordpress-theme/style.css` - Theme metadata and complete styling
- `wordpress-theme/functions.php` - Theme setup, menus, and script enqueuing
- `wordpress-theme/header.php` - Header with navigation and mobile menu
- `wordpress-theme/footer.php` - Footer with contact information
- `wordpress-theme/front-page.php` - Homepage template
- `wordpress-theme/page-*.php` - Service page templates
- `wordpress-theme/js/` - Navigation and animation scripts
- `wordpress-theme/assets/` - Images and media files

**Installation:**
The theme includes comprehensive documentation:
- `README.md` - Theme description, features, and structure
- `INSTALLATION-GUIDE.md` - Step-by-step installation instructions
- `assets/README.md` - Image naming and asset preparation guide

The WordPress theme provides the same user experience as the React application with proper WordPress integration for content management.

## WordPress Plugin

### WordPress Plugin Architecture (October 2025)
Following the theme, a complete WordPress **plugin** has been created as an alternative approach that works with any WordPress theme.

**Plugin Advantages:**
- **Theme-independent**: Works with any WordPress theme
- **Auto-installation**: Creates all 5 pages automatically on activation
- **Auto-menu**: Sets up navigation menu automatically  
- **Settings page**: Admin interface to customize clinic details
- **Scoped styles**: CSS isolated with odyssea- prefix to avoid theme conflicts
- **Conditional loading**: Assets only load on relevant pages

**Plugin Structure:**
- **Language**: PHP with WordPress plugin API
- **Shortcodes**: `[odyssea_home]`, `[odyssea_renata_franca]`, `[odyssea_drainage]`, `[odyssea_cicatrices]`, `[odyssea_epilation]`
- **Auto-creation**: Pages and menu created on plugin activation
- **Admin Settings**: Customizable contact info (Settings → Odyssea Lymphea)
- **Scoped CSS**: All styles prefixed with `.odyssea-page` and `--odyssea-` variables
- **Conditional Assets**: CSS/JS only enqueued when shortcodes are present

**Key Files:**
- `wordpress-plugin/odyssea-lymphea.php` - Main plugin file
- `wordpress-plugin/includes/class-activator.php` - Page/menu creation on activation
- `wordpress-plugin/includes/class-shortcodes.php` - Shortcode handlers
- `wordpress-plugin/includes/class-settings.php` - Admin settings page
- `wordpress-plugin/includes/class-assets.php` - Conditional CSS/JS loading
- `wordpress-plugin/templates/page-*.php` - Page templates
- `wordpress-plugin/assets/` - Scoped CSS, JS, and images
- `wordpress-plugin/uninstall.php` - Cleanup on uninstall

**Installation:**
The plugin includes comprehensive documentation:
- `README.md` - Plugin description, features, and usage
- `INSTALLATION-GUIDE.md` - Step-by-step installation instructions

**Comparison: Theme vs Plugin**
- **Theme**: Full site control, custom templates, header/footer integration
- **Plugin**: Works with existing theme, auto-setup, portable, easier to maintain

Both implementations provide the same user experience with full-featured pages for the physiotherapy clinic services.