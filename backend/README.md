# Memory API Server

A FastAPI server exposing [mem0](https://mem0.ai) memory operations for the AI Keyboard application.

## Quick Start

```bash
# Install dependencies
uv sync

# Run the server
uv run uvicorn main:app --reload --port 8000
```

The server will be available at `http://localhost:8000`.

## API Endpoints

| Method | Endpoint                      | Description                      |
| ------ | ----------------------------- | -------------------------------- |
| GET    | `/`                           | Health check                     |
| POST   | `/memory/add`                 | Add memories from a conversation |
| POST   | `/memory/search`              | Search memories by query         |
| POST   | `/memory/get_all`             | Get all memories for a user      |
| GET    | `/memory/{memory_id}`         | Get a specific memory            |
| PUT    | `/memory/update`              | Update an existing memory        |
| DELETE | `/memory/{memory_id}`         | Delete a specific memory         |
| DELETE | `/memory/user/{user_id}`      | Delete all memories for a user   |
| GET    | `/memory/history/{memory_id}` | Get memory change history        |

## Usage Examples

### Add Memory

```bash
POST /memory/add
{
  "messages": [
    {"role": "user", "content": "Hi, I'm Alex. I love basketball and gaming."},
    {"role": "assistant", "content": "Hey Alex! I'll remember your interests."}
  ],
  "user_id": "alex",
  "metadata": {"source": "chat"}  // optional
}
```

### Search Memory

```bash
POST /memory/search
{
  "query": "What do you know about me?",
  "user_id": "alex",
  "limit": 10  // optional, default 10
}
```

### Get All Memories

```bash
POST /memory/get_all
{
  "user_id": "alex"
}
```

### Update Memory

```bash
PUT /memory/update
{
  "memory_id": "mem_123abc",
  "data": "Updated memory content"
}
```

### Delete Memory

```bash
DELETE /memory/{memory_id}
```

### Delete All User Memories

```bash
DELETE /memory/user/{user_id}
```

## Interactive Docs

Once running, access the interactive API documentation at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Environment Variables

Ensure your `.env` file has:

```env
OPENAI_API_KEY="your-openai-api-key"
```

## Default Configuration

Mem0 uses these defaults:

- **LLM**: OpenAI `gpt-4.1-nano-2025-04-14` for fact extraction
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Vector Store**: Qdrant with on-disk data at `/tmp/qdrant`
- **History**: SQLite at `~/.mem0/history.db`
