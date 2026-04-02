# CCC Status Management System

A full-stack web application for tracking and managing Concurrent Code Completion (CCC) statuses across multiple software branches and applications.

## Overview

This is an internal DevOps management tool designed to monitor and manage CCC records for multiple branches (webos4media, que4media). It provides a centralized dashboard to track app submissions, tags, issues, patches, and CCC lifecycle states.

## Features

- **Admin Dashboard**: Secure login-based access to manage CCC records
- **Multi-Branch Support**: Track separate CCC entries for different product branches
- **Status Tracking**: Monitor CCC lifecycle (open, in-progress, completed, etc.)
- **Real-time Updates**: Auto-refresh dashboard data every 3 seconds
- **Data Management**: Create, read, update, and delete CCC records
- **Integration**: Fetches submission data from internal LGE Wall system
- **Advanced Filtering**: Filter records by status, branch, and search queries
- **Metadata Management**: Track release notes and testing information per branch

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Middleware**: CORS, JSON body parser

### Frontend
- **Library**: React 18.2.0
- **Build Tool**: Vite 5.0.0
- **Routing**: React Router DOM 7.1.5
- **Styling**: CSS

## Project Structure

```
ccc-complete/
├── backend/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── main.jsx
│   ├── App.jsx
│   ├── AdminPanel.jsx
│   ├── CCCStatusDetails.jsx
│   └── styles.css
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running on localhost:27017)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```
   The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173` (or as indicated by Vite)

## API Endpoints

### CCC Records
- **GET** `/api/ccc` - Retrieve all CCC records
- **POST** `/api/ccc` - Create a new CCC record
- **DELETE** `/api/ccc/:id` - Delete a CCC record by ID

### External Integration
- **POST** `/api/wall-fetch` - Fetch submission data from LGE Wall system
  - Required body parameters: `appName`, `tag`

## Database Schema

### CCC Collection
```javascript
{
  branchEntries: Object,      // CCC entries organized by branch
  branchMeta: Object,         // Metadata (release notes, testing info)
  timestamp: Date             // Record creation/modification timestamp
}
```

## Authentication

The admin dashboard uses basic authentication:
- **Default Username**: admin
- **Default Password**: *****

*Note: This is for development purposes. Update credentials for production use.*

## Usage

1. Open the frontend application in your browser
2. Log in with admin credentials
3. Use the Admin Panel to add new CCC records or view CCCStatusDetails
4. Manage records by branch, filter by status, and search for specific entries
5. Real-time data sync ensures you're always viewing current information

## Features Detail

### Admin Panel
- Add new CCC entries with branch, app name, tag, and status information
- Manage submission links and patch information
- Track CCC tickets and start dates
- Organize data by branch

### CCC Status Details
- View complete history of all CCC records
- Filter by status and branch
- Search across entries
- Pagination for better performance (10 items per page)
- Auto-refresh every 3 seconds

## Development

To modify and extend the project:

1. **Frontend components** are in the `frontend/` directory
2. **Backend routes and database logic** are in `backend/server.js`
3. **Styling** is handled in `frontend/styles.css`

## License

Internal project for LGE development teams.

## Support

For issues or questions about this project, contact the development team.
