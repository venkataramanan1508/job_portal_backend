# Job Portal Backend

## Overview
The **Job Portal Backend** is a Node.js and Express-based REST API that provides functionalities for job seekers and employers. It allows users to register, log in, post jobs, apply for jobs, update job listings, and delete job postings.

## Features
- **User Authentication** (Register, Login, JWT-based authentication)
- **Post Job Listings** (Employers can add job details)
- **Retrieve Job Listings** (Get all jobs or specific job details)
- **Update & Delete Jobs** (Modify job postings securely)
- **Apply for Jobs** (Job seekers can apply for jobs)
- **Retrieve Applied Jobs** (See jobs users have applied for)

## Technologies Used
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **SQLite** - Lightweight database
- **JWT** - Authentication & Authorization
- **bcrypt.js** - Password encryption
- **CORS** - Handling cross-origin requests
- **dotenv** - Environment variables

## Installation
### Prerequisites
Ensure you have **Node.js** installed on your machine.

### Steps to Install
1. Clone the repository:
   ```sh
   git clone https://github.com/venkataramanan1508/job_portal_backend.git
   cd job_portal_backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in the root directory and add:
   ```env
   JWT_SECRET=your_secret_key (use your self)
   ```
4. Start the server:
   ```sh
   npm start
   ```
   The backend will run on `http://localhost:5000/`

## API Endpoints
### **Authentication**
#### Register User
- **Endpoint:** `POST /register`
- **Request Body:**
  ```json
  {
    "username": "venkat_1508",
    "email": "venkataramanan519@gmail.com",
    "password": "venkat@1508" 
  }
  ```
- **Response:**
  ```json
  { "message": "User registered successfully!" }
  ```

#### Login User
- **Endpoint:** `POST /login`
- **Request Body:**
  ```json
  {
    "email": "venkataramanan519@gmail.com",
    "password": "venkat_1508"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Login successful",
    "user_id": "user123",
    "username": "venkat_1508",
    "token": "jwt_token"
  }
  ```

## License
This project is licensed under the **ISC License**.

## Author
Developed by **Venkataramanan Job Portal**.
