# Project-Management-Tool

A modern, feature‑rich project management system built with PHP (Laravel) backend and a React/TypeScript frontend. It supports tickets, sprints, epics, activity logs, and role‑based access.

## Features

- **Backlog & Sprint board** with drag‑and‑drop tickets.
- **Ticket types**: Story, Bug, Task, Epic.
- **Role‑based assignee filtering** (developers only).
- **Detailed audit logs** for creation and status changes.
- **Epic handling** separate from sprint/backlog.
- **Responsive UI** with modern design and animations.
- **API** powered by Laravel resources.

## Getting Started

### Prerequisites

- PHP 8.2+ with Composer
- Node 20+ with npm or Yarn
- MySQL or PostgreSQL database
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourorg/Project-Management-Tool.git
cd Project-Management-Tool

# Backend setup
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed

# Frontend setup
cd web
npm install
npm run dev   # start the Vite dev server
```

### Running the Application

```bash
# Start Laravel development server
php artisan serve
```

Visit `http://localhost:8000` and the frontend will be served at `http://localhost:5173`.

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome-feature`).
3. Ensure code follows the existing style and passes linting (`npm run lint` and `php artisan lint`).
4. Submit a pull request.

## License

This project is licensed under the MIT License.

## Contact

For questions or support, open an issue or contact the maintainer at `dev@example.com`.
