"""
FastAPI Memory Backend using ChromaDB + Mistral AI
Simple and reliable memory solution for Linux
"""
import os
import json
import uuid
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import chromadb
from chromadb.config import Settings
from mistralai import Mistral
from datetime import datetime

load_dotenv()

app = FastAPI(
    title="Mistral Memory API",
    description="Memory API using ChromaDB + Mistral AI for Linux",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Mistral client
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
if not MISTRAL_API_KEY:
    print("⚠️  Warning: MISTRAL_API_KEY not set!")
    mistral = None
else:
    mistral = Mistral(api_key=MISTRAL_API_KEY)

# Initialize ChromaDB with persistent storage
CHROMA_DB_PATH = os.path.expanduser("~/.tabby/chromadb")
os.makedirs(CHROMA_DB_PATH, exist_ok=True)

chroma_client = chromadb.PersistentClient(
    path=CHROMA_DB_PATH,
    settings=Settings(
        anonymized_telemetry=False,
        allow_reset=True
    )
)

# Get or create collection
collection = chroma_client.get_or_create_collection(
    name="memories",
    metadata={"description": "Tabby Linux memory storage"}
)

print("=" * 50)
print("MEMORY CONFIGURATION:")
print(f"  Provider: ChromaDB + Mistral")
print(f"  LLM: Mistral Small")
print(f"  Embeddings: Mistral Embed")
print(f"  Storage: ChromaDB (persistent @ {CHROMA_DB_PATH})")
print("=" * 50)


# Pydantic models
class MessageModel(BaseModel):
    role: str
    content: str


class AddMemoryRequest(BaseModel):
    messages: List[MessageModel]
    user_id: str
    metadata: Optional[Dict[str, Any]] = None


class SearchMemoryRequest(BaseModel):
    query: str
    user_id: str
    limit: Optional[int] = 10


class GetAllMemoriesRequest(BaseModel):
    user_id: str


# Helper functions
async def extract_facts_with_mistral(messages: List[Dict]) -> str:
    """Extract facts from conversation using Mistral"""
    if not mistral:
        # Fallback: just concatenate messages
        return " ".join([f"{m['role']}: {m['content']}" for m in messages])

    try:
        chat_text = "\n".join([f"{m['role']}: {m['content']}" for m in messages])

        response = mistral.chat.complete(
            model="mistral-small-latest",
            messages=[
                {
                    "role": "system",
                    "content": "Extract key facts, preferences, and important information from this conversation as concise bullet points. Focus on user preferences, stated facts, and important context."
                },
                {
                    "role": "user",
                    "content": chat_text
                }
            ]
        )

        return response.choices[0].message.content
    except Exception as e:
        print(f"Error extracting facts: {e}")
        # Fallback
        return " ".join([m['content'] for m in messages if m['role'] == 'user'])


async def get_embeddings(text: str) -> List[float]:
    """Get embeddings from Mistral"""
    if not mistral:
        # Fallback: return dummy embedding
        return [0.0] * 1024

    try:
        response = mistral.embeddings.create(
            model="mistral-embed",
            inputs=[text]
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error getting embeddings: {e}")
        return [0.0] * 1024


# API Endpoints
@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "ok",
        "service": "Mistral Memory API",
        "version": "2.0.0",
        "llm": "Mistral Small",
        "embeddings": "Mistral Embed",
        "storage": "ChromaDB"
    }


@app.get("/healthz")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "mistral_connected": mistral is not None,
        "chromadb_connected": collection is not None
    }


@app.post("/memory/add")
async def add_memory(request: AddMemoryRequest):
    """Add memories from a conversation"""
    try:
        # Convert messages to dict
        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        # Extract facts using Mistral
        facts = await extract_facts_with_mistral(messages)

        # Get embeddings
        embedding = await get_embeddings(facts)

        # Create unique ID
        memory_id = str(uuid.uuid4())

        # Store in ChromaDB
        collection.add(
            ids=[memory_id],
            embeddings=[embedding],
            documents=[facts],
            metadatas=[{
                "user_id": request.user_id,
                "timestamp": datetime.now().isoformat(),
                **(request.metadata or {})
            }]
        )

        return {
            "status": "success",
            "message": f"Added memory",
            "memory_id": memory_id,
            "facts": facts
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding memory: {str(e)}")


@app.post("/memory/search")
async def search_memory(request: SearchMemoryRequest):
    """Search memories by query"""
    try:
        # Get query embedding
        query_embedding = await get_embeddings(request.query)

        # Search ChromaDB
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=request.limit,
            where={"user_id": request.user_id}
        )

        memories = []
        if results['documents'] and results['documents'][0]:
            for i, doc in enumerate(results['documents'][0]):
                memories.append({
                    "memory": doc,
                    "score": 1 - results['distances'][0][i] if results['distances'] else None,
                    "metadata": results['metadatas'][0][i] if results['metadatas'] else {}
                })

        return {
            "results": memories,
            "query": request.query,
            "count": len(memories)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching memory: {str(e)}")


@app.post("/memory/get_all")
async def get_all_memories(request: GetAllMemoriesRequest):
    """Get all memories for a user"""
    try:
        # Get all memories for user
        results = collection.get(
            where={"user_id": request.user_id}
        )

        memories = []
        if results['documents']:
            for i, doc in enumerate(results['documents']):
                memories.append({
                    "id": results['ids'][i],
                    "memory": doc,
                    "metadata": results['metadatas'][i] if results['metadatas'] else {}
                })

        return {
            "results": memories,
            "count": len(memories)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting memories: {str(e)}")


@app.get("/memory/{memory_id}")
async def get_memory(memory_id: str):
    """Get a specific memory by ID"""
    try:
        result = collection.get(ids=[memory_id])

        if not result['documents'] or len(result['documents']) == 0:
            raise HTTPException(status_code=404, detail="Memory not found")

        return {
            "id": memory_id,
            "memory": result['documents'][0],
            "metadata": result['metadatas'][0] if result['metadatas'] else {}
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting memory: {str(e)}")


@app.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str):
    """Delete a specific memory"""
    try:
        collection.delete(ids=[memory_id])
        return {"status": "success", "message": f"Deleted memory {memory_id}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting memory: {str(e)}")


@app.delete("/memory/user/{user_id}")
async def delete_user_memories(user_id: str):
    """Delete all memories for a user"""
    try:
        # Get all IDs for this user
        results = collection.get(where={"user_id": user_id})

        if results['ids']:
            collection.delete(ids=results['ids'])
            return {
                "status": "success",
                "message": f"Deleted {len(results['ids'])} memories for user {user_id}"
            }
        else:
            return {
                "status": "success",
                "message": f"No memories found for user {user_id}"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user memories: {str(e)}")


@app.get("/memory/history/{memory_id}")
async def get_memory_history(memory_id: str):
    """Get memory (no history tracking in this implementation)"""
    return await get_memory(memory_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
