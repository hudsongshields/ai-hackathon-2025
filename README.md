# SightSync - AI-Powered Image Descriptions for Accessibility

## 🎯 Problem
Visually impaired individuals lack expressive, context-aware image descriptions that go beyond basic alt-text.

## 💡 Solution
SightSync uses GPT-4 Vision to generate detailed, spatial-aware audio descriptions of images including:
- Spatial relationships
- Colors and lighting
- Emotional tone
- Text recognition

## 🛠️ Tech Stack
- **Frontend**: React, Tailwind CSS
- **Backend**: Flask, OpenAI GPT-4 Vision API
- **Audio**: Google Text-to-Speech (gTTS)

## 📋 Prerequisites
- Python 3.8+
- Node.js 16+
- OpenAI API key

## 🚀 Setup Instructions
### Easiest host
https://ai-hackathon-2025-six.vercel.app/

### For Local Hosting
Warning: You will need your own OPENAI_API_KEY
#### Backend Setup
Backend runs on `https://ai-hackathon-2025-4.onrender.com`
Or update backend URL in src/App.js if needed to run locally: 

navigate to `sightsync_fixed/backend`
`cd sightsync`
`cd backend`
const BACKEND_URL = `http://localhost:5000`
install dependencies: `pip install -r requirements.txt`
and `python app.py` to run this local flask server


### Frontend Setup
#### Navigate to frontend
cd sightsync_fixed

#### Install dependencies
npm install

#### Run frontend
npm start

Frontend runs on `http://localhost:3000` 

## 📱 Usage
1. Open `http://localhost:3000` in your browser
2. Click "Camera" or "Gallery" to select an image
3. Click "Describe & Speak" to generate audio description
4. Listen to the detailed, expressive description

## 🎨 Features
- 📸 Camera and gallery integration
- 🔊 Text-to-speech output
- 🎯 Context-aware descriptions
- 📍 Spatial awareness (clock notation)
- 🎨 Modern, accessible UI

## 👥 Team
- Hudson Shields - Physics Major
- Will Munro - Computer Science Major
- Ryan Cannings - Electrical Engineering Major
- Patrick King - Data Science Major
- Joseph - Mechanical Engineering Major

## 🏆 UF AI Days Hackathon 2024
Built with ❤️ for accessibility

---

## File Structure for GitHub:
```
AIHackathon2025/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env.example          ← Template with no real key
│   └── .gitignore
├── sightsync_fixed/          ← Your React app
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── package-lock.json
├── README.md                  ← Main README
├── .gitignore                 ← Root gitignore
└── demo.mp4                   ← Optional demo video
```

---
