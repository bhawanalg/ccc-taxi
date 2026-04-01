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

- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: React 18, Vite, React Router DOM
- **Database**: MongoDB (cccDB)

## Use Case

Primarily used by development teams to centralize CCC tracking, coordinate submissions across branches, and maintain visibility into build and testing progress for multiple applications simultaneously.
