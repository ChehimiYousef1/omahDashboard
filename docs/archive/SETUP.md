# OMAH Connect - Complete Setup & Running Guide

## ⚠️ IMPORTANT: The Network Error Occurs Because the Backend Server is NOT Running

The "Error Loading Applications - Network Error" means the React frontend cannot connect to the Node.js backend API.

## Prerequisites

- Node.js (v14+) and npm installed
- Two terminal windows or tabs

## Step-by-Step Setup

### 1. Install All Dependencies

**Terminal 1 - Backend Dependencies:**
```bash
cd c:\Users\munee\OneDrive\Desktop\OMEH
npm install
```

**Terminal 2 - Frontend Dependencies:**
```bash
cd c:\Users\munee\OneDrive\Desktop\OMEH\omahconnect-admin
npm install
cd ..
```

### 2. Start the Backend Server

**Terminal 1:**
```bash
npm start
```

You should see:
```
🚀 Server running on port 5000
```

**Keep this terminal open while the server runs.**

### 3. Start the Frontend (New Terminal)

**Terminal 2:**
```bash
cd c:\Users\munee\OneDrive\Desktop\OMEH\omahconnect-admin
npm run dev
```

You should see something like:
```
VITE v8.0.12  ready in XXX ms

➜  Local:   http://localhost:5173/
```

### 4. Access the Application

Open your browser and go to: **http://localhost:5173**

The Applications page should now load without errors!

## Architecture

- **Backend API:** `http://localhost:5000/api` (Express.js)
- **Frontend:** `http://localhost:5173` (React + Vite)
- **Database:** JSON files in `/data` folder

## Troubleshooting

### "Error Loading Applications - Network Error"
**Solution:** Make sure the backend server is running (Terminal 1 should show "Server running on port 5000")

### Port Already in Use
**Backend:** 
```bash
set PORT=5001 && npm start
```

**Frontend:** Vite will automatically use the next available port

### Module Not Found Errors
```bash
# Delete node_modules and reinstall
rmdir node_modules /s /q
npm install

# For frontend
cd omahconnect-admin
rmdir node_modules /s /q
npm install
cd ..
```

## Windows Batch Files

Run these for easy startup on Windows:

**Backend Only:** Double-click `start-server.bat`

## Default Admin Login

- **Email:** admin@omahconnect.com
- **Password:** password123

(Authentication is automatic in the admin dashboard)

## File Structure

```
OMEH/
├── server.js           # Express backend
├── db.js               # Database module
├── package.json        # Backend dependencies
├── data/               # JSON database files
│   ├── db.json
│   ├── applications.json
│   └── ...
├── omahconnect-admin/  # React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── SETUP.md           # This file
```

