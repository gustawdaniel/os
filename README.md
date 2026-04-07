# Personal OS

A minimalist, high-performance personal dashboard designed to manage habits, notes, and goals with a premium aesthetic. Built with Svelte 5 and a modern tech stack.

![Personal OS](https://img.shields.io/badge/Status-Beta-indigo)
![Svelte](https://img.shields.io/badge/Svelte-5-ff3e00)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)
![Prisma](https://img.shields.io/badge/Prisma-6-2d3748)

## ✨ Features

- **Habit Tracker**: A ClickUp-inspired minimalist habit tracker with drag-and-drop reordering, monthly views, and progress tracking.
- **Notes Module**: Clean, full-width WYSIWYG editor powered by Tiptap. Features autosave, compact list views, and refined typography.
- **Google OAuth**: Secure authentication via Google for seamless login and multi-device access.
- **Mobile First**: Fully responsive design that looks stunning on desktops and mobile devices alike.
- **Activity Logging (WIP)**: Integrated architecture for tracking time and daily logs.

## 🛠 Tech Stack

- **Frontend**: [Svelte 5](https://svelte.dev/) (Rune-based reactivity)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend/API**: SvelteKit (Adapter Node)
- **Database**: [MongoDB](https://www.mongodb.com/)
- **ORM**: [Prisma v6](https://www.prisma.io/)
- **Authentication**: [Auth.js](https://authjs.dev/) (formerly NextAuth)
- **Deployment**: Docker & GitHub Actions (CI/CD)

## 🚀 Getting Started

### Prerequisites

- Node.js (v20+)
- pnpm
- MongoDB instance (local or Atlas)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone git@github.com:gustawdaniel/os.git
   cd os
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="mongodb://..."
   AUTH_SECRET="your-random-secret"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

4. **Sync Database**:
   ```bash
   pnpm exec prisma db push
   pnpm exec prisma generate
   ```

5. **Run the dev server**:
   ```bash
   pnpm dev
   ```

## 🐳 Docker & Deployment

The project is fully dockerized and includes a CI/CD pipeline for GitHub Actions.

### Docker Compose
To run the production build locally:
```bash
docker compose up -d
```
The app will be available at `http://localhost:3667`.

### CI/CD Pipeline
On every push to `main`, the GitHub Action:
1. Builds a production Docker image.
2. Pushes the image to **DigitalOcean Container Registry**.
3. Deploys to your VPS via SSH and restarts the containers.

## 📄 License

Private - All rights reserved.
