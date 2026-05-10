# Social Media Platform with AI Assistant 

A full-stack social media platform with an AI-powered multi-agent assistant providing intelligent post creation, friend suggestions, engagement recommendations, and persistent memory through RAG pipeline.

## Key Features

- 3 Specialized AI Agents (Post, Friend Suggestion, Engagement)
- RAG Pipeline with persistent user memory via Qdrant vector database
- Real-time messaging with Socket.io
- WebRTC video/audio calls with signaling
- GraphQL + REST hybrid API
- Elasticsearch-powered search
- Modern React + MUI frontend

## Tech Stack


### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| Material-UI (MUI) | Component Library |
| Tailwind CSS | Styling |
| Axios | HTTP Client |
| Socket.io-client | Real-time messaging |
| WebRTC | Video/Audio calls |

### Backend (Node.js)
| Technology | Purpose |
|------------|---------|
| Express.js | REST API Framework |
| Apollo Server | GraphQL |
| Socket.io | WebSockets |
| bcrypt | Password Hashing |
| jsonwebtoken | Authentication |
| Google Auth Library | OAuth 2.0 |
| multer | File Uploads |

### Backend (Python - FastAPI)
| Technology | Purpose |
|------------|---------|
| FastAPI | AI Agent API |
| Groq SDK | LLM Inference (Llama 3.1) |
| Qdrant Client | Vector Database |
| Sentence Transformers | Embeddings |
| spaCy | NER |
| VADER | Sentiment Analysis |

### Database & Storage
| Technology | Purpose |
|------------|---------|
| Supabase (PostgreSQL) | Primary Database |
| Qdrant Cloud | Vector Storage |
| Supabase Storage | File Storage |
| Elasticsearch | Search Engine |



## Features

### Core Social Features

| Feature | Status | Description |
|---------|--------|-------------|
| User Authentication | ✅ | Email/Password + Google OAuth |
| Post Creation | ✅ | Text + Image uploads |
| Feed (GraphQL) | ✅ | Optimized post feed |
| Likes & Comments | ✅ | Interactive engagement |
| Friend System | ✅ | Send/accept/reject requests |
| Real-time Messaging | ✅ | Socket.io + Supabase persistence |
| Video/Audio Calls | ✅ | WebRTC with signaling |
| User Profiles | ✅ | Bio, hobbies, images |
| Search | ✅ | Users + posts with Elasticsearch |

## Installation

### Prerequisites
- Node.js 18+
- Python 3.13+
- Supabase Account
- Qdrant Cloud Account
- Groq API Key

### 1. Clone Repository
```bash
git clone https://github.com/AliNaseem123456789/Social-Media-website-Project.git
```
### 2. Backend Setup (Node.js)
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 3. AI Backend Setup (Python)
```bash
cd ../chatbot
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
npm start
```
## Deployment
### 1. Deploy to Render (Python Backend)
```bash 
services:
  - type: web
    name: social-media-assistant
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port 8000
    envVars:
      - key: GROQ_API_KEY
        sync: false
      - key: QDRANT_URL
        sync: false
```
### 2. Deploy to Railway (Node.js Backend)
```bash
#Install Railway CLI
npm install -g @railway/cli

#Login and deploy
railway login
railway init
railway up
```
### 3. Deploy to Vercel (Frontend)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```
## Contributing

### Code Style
- **JavaScript/React**: ESLint, Prettier

### Commit Convention

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `chore` | Maintenance |
| `refactor` | Code restructuring |
| `test` | Testing |

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

##  License

This project is licensed under the MIT License.

## Acknowledgments

- **Groq** for LLM inference
- **Qdrant** for vector database
- **Supabase** for PostgreSQL hosting
- **Material-UI** for component library
- **OpenAI** for inspiration

## Roadmap

- [ ] DM Agent (direct message drafting/scheduling)
- [ ] Content Recommendation Agent
- [ ] Group Management Agent
- [ ] Mobile App (React Native)
- [ ] Push Notifications
- [ ] Post Analytics Dashboard
- [ ] AI-Powered Content Moderation

---

**Built with ❤️ by Ali Naseem**

View Code: https://github.com/AliNaseem123456789/Social-Media-website-Project 
Live Demo: https://social-media-project-one.vercel.app/