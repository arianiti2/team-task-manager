# Team Task Manager API

A RESTful API for managing team tasks, projects, and collaboration. Built with Node.js, Express, and MongoDB.

## Features

- 🔐 **Authentication & Authorization** - JWT-based authentication with role-based access control
- 👥 **User Management** - Create and manage team members with different roles (Admin, Manager, Member)
- 📋 **Task Management** - Create, assign, update, and track tasks
- 🏢 **Project Management** - Organize tasks into projects
- 💬 **Comments & Collaboration** - Add comments to tasks for better collaboration
- 📊 **Task Statistics** - Get insights into task completion rates and team productivity
- 📱 **RESTful API** - Well-designed API endpoints following REST conventions

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: bcryptjs, helmet, cors
- **Documentation**: Postman/OpenAPI

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/arianiti2/team-task-manager.git
cd team-task-manager
