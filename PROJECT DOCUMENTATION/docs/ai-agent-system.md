# 🤖 AI Chatbot System Documentation

## Overview

The AI Chatbot is a **multi-agent conversational assistant** integrated into the social media platform. It helps users create posts, discover friends, get engagement suggestions, and remembers user preferences across sessions.

---

##  Features at a Glance

| Feature | What It Does |
|---------|---------------|
| **Post Creation** | Generates drafts, edits, and publishes posts with auto-hashtags |
| **Friend Discovery** | Finds users with matching interests, sends friend requests |
| **Engagement Help** | Suggests posts to like/comment, birthday reminders |
| **Smart Memory** | Remembers user info across conversations |
| **Natural Language** | Understands requests like "help me write a post about my trip" |

---

## How It Works


### The 3 Agents

| Agent | What It Handles | Example |
|-------|----------------|---------|
| **Post Agent** | Creating & publishing posts | "write a post about my marathon" |
| **Friend Agent** | Finding & adding friends | "suggest friends who like hiking" |
| **Engagement Agent** | Likes, comments, reminders | "what should I like?" |

---

## Conversation Examples

## AI Assistant Examples

### Writing Posts

> **You:** "help me write a post about my new job"
>
> **Bot:**  Your Post Draft:
> "Excited to start my new journey as a Software Engineer! 🚀"
> Hashtags: #NewBeginnings #Career
>
> [Post Now] [Edit] [Cancel]
>
> **You:** [Click Post Now]
>
> **Bot:**  Post published successfully!

---

### Finding Friends

> **You:** "suggest friends who like photography"
>
> **Bot:**  Found 3 people you might know:
>
> **Sarah** - Shares interests: photography 📍 NYC
>
> **Mike** - Shares interests: photography 📍 LA
>
> [Add Friend] [Add Friend] [Send to All]
>
> **You:** [Click Add Friend on Sarah]
>
> **Bot:** Friend request sent to Sarah!

---

### Getting Suggestions

> **You:** "what should I like?"
>
> **Bot:**  Posts to Engage With:
>
> **Alice:** "Just finished my marathon! 🏃‍♀️"
> [Like (2)] [Comment]
>
> **You:** [Click Like]
>
> **Bot:**  Post liked!

##  Quick Setup

### Environment Variables

```bash
# Backend (.env)
GROQ_API_KEY=your_groq_api_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Frontend (.env)
REACT_APP_API_URL=http://localhost:8000
```

# Python Backend
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload --port 8000
```

# Frontend
```bash
npm install
npm start
```

## API Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Main chat endpoint |
## System Architecture

### Agentic Architecture

The multi-agent system uses an intent classifier to route user requests to specialized agents. Each agent handles specific tasks with different state management approaches.

![Agentic Architecture](../assets/Agentic_Architecture.png)

*Figure 1: Multi-Agent System Architecture showing Intent Classifier and three specialized agents (Post, Friend, Engagement)*

**Key Components:**
- **Intent Classifier**: Hybrid approach using Groq LLM with keyword fallback
- **Post Agent**: Stateful agent managing draft → edit → approve → publish workflow
- **Friend Agent**: Stateless agent for one-click friend discovery and requests
- **Engagement Agent**: Stateless agent for like suggestions, comments, and birthday reminders

---

### RAG Memory Pipeline

The RAG pipeline enables persistent user memory across conversations. It stores user information as vector embeddings and retrieves relevant context when needed.

![RAG Architecture Diagram](../assets/RAG_Architecture_Diagram.png)

*Figure 2: RAG Memory Pipeline showing Storage Phase, Retrieval Phase, Context Compression, and Response Generation*

**Pipeline Stages:**
1. **Storage Phase**: Entity extraction (spaCy NER) → Canonical text → Vector embedding (384-dim) → Qdrant storage
2. **Retrieval Phase**: Multi-query expansion → Similarity search → Time decay scoring → Top-K results
3. **Compression Phase**: Adaptive compression (800 tokens → 200 tokens) with fallback strategy
4. **Generation Phase**: Groq LLM (Llama 3.1 8B) generates context-aware responses

**Key Features:**
- Time decay penalty reduces confidence of old memories 
- Entity-based search fallback when vector search returns no results
- Multi-query expansion improves retrieval recall
- Adaptive context compression optimizes token usage