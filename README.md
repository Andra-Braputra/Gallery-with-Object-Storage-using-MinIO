# MinIO Photo Storage & Gallery

A simple, containerized Photo Gallery application built with Node.js and MinIO (S3 Compatible Object Storage).

This project demonstrates how to upload, store, manage, and retrieve image metadata using an object storage service, fully integrated with Docker.

## Features

- **Image Upload**: Support for JPG, PNG, and GIF.
- **Metadata Storage**: Save Title, Description, Tags, and Location.
- **Gallery Grid**: Responsive layout to view all uploaded images.
- **Search**: Filter images by title, tags, or description.
- **Split View Modal**: View image details and metadata side-by-side.
- **Management**: Download original files or Delete images (removes from storage and UI).
- **Dockerized**: Zero-config setup using Docker Compose.

## Tech Stack

- **Backend**: Node.js, Express.js, Multer
- **Storage**: MinIO (S3 Compatible)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Infrastructure**: Docker & Docker Compose

## Project Structure

```text
├── .env                 # Environment Variables (Create this file!)
├── docker-compose.yml   # Docker services configuration
├── README.md            # Documentation
└── backend/             # Source code
    ├── Dockerfile
    ├── .dockerignore
    ├── package.json
    ├── server.js
    └── public/          # Frontend Assets
        ├── index.html
        ├── style.css
        └── script.js
```

**Prerequisites**
Make sure you have Docker Desktop installed and running.

**Run the Application**
Open your terminal in the root folder and run:
Bash

    docker-compose up -d --build

Wait for a few moments for the containers to build and start.

**Access the App**
Once running, you can access:

    Main Gallery: http://localhost:3000

    MinIO Console: http://localhost:9001
