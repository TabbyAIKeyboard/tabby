import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Literal
from mem0 import Memory
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = FastAPI(
    title="Memory API",
    description="API for mem0 memory operations with Supabase vector store",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
supabase_connection_string = os.environ.get("SUPABASE_CONNECTION_STRING")
neo4j_url = os.environ.get("NEO4J_URL")
neo4j_username = os.environ.get("NEO4J_USERNAME", "neo4j")
neo4j_password = os.environ.get("NEO4J_PASSWORD")


# if not supabase_connection_string:
#     raise ValueError("SUPABASE_CONNECTION_STRING environment variable is required")


config = {
    "llm": {
    "provider": "openai",
    "config": {
        "model": "gpt-4.1-nano-2025-04-14",
        "enable_vision": True,
        }
    },
    "vector_store": {
        "provider": "supabase",
        "config": {
            "connection_string": supabase_connection_string,
            "collection_name": os.environ.get("SUPABASE_COLLECTION_NAME", "memories"),
            "index_method": os.environ.get("SUPABASE_INDEX_METHOD", "hnsw"),
            "index_measure": os.environ.get("SUPABASE_INDEX_MEASURE", "cosine_distance")
        }
        # "provider": "chroma",
        # "config": {
        #     "collection_name": "memories",
        #     "path": "db",
        # }
    }
}

if neo4j_url and neo4j_password:
    config["graph_store"] = {
        "provider": "neo4j",
        "config": {
            "url": neo4j_url,
            "username": neo4j_username,
            "password": neo4j_password,
        }
    }

print("=" * 50)
print("MEM0 CONFIGURATION:")
print(f"  Vector Store: supabase")
print(f"  Graph Store: {'neo4j' if 'graph_store' in config else 'disabled'}")
print("=" * 50)

memory = Memory.from_config(config)

# Memory type classification
MEMORY_TYPES = Literal["LONG_TERM", "SHORT_TERM", "EPISODIC", "SEMANTIC", "PROCEDURAL"]

class MemoryClassifier:
    """LLM-based classifier for categorizing memories into types."""
    
    CLASSIFICATION_PROMPT = """Classify the following memory/message into exactly ONE of these memory types. Pay careful attention to temporal indicators:

- SHORT_TERM: TEMPORARY states, CURRENT activities, things happening RIGHT NOW or TODAY that will change soon.
  Examples: "I'm currently working on...", "Right now I'm doing...", "I need to finish this today", "I'm in a meeting"
  Key indicators: "currently", "right now", "today", "at the moment", "working on", "need to"

- LONG_TERM: PERMANENT personal facts, preferences, identity, habits that persist over time.
  Examples: "I prefer dark mode", "My name is John", "I like pizza", "I'm a software engineer"
  Key indicators: general preferences, identity statements, lasting characteristics

- EPISODIC: PAST events with specific time context - things that already HAPPENED.
  Examples: "Yesterday I had a meeting", "Last week I went to...", "I met John at the conference"
  Key indicators: "yesterday", "last week", "last month", past tense events

- SEMANTIC: General KNOWLEDGE or facts about the world (not personal preferences).
  Examples: "Python uses indentation", "The capital of France is Paris", "React is a JS library"
  Key indicators: objective facts, definitions, general truths

- PROCEDURAL: HOW-TO knowledge, step-by-step processes, instructions.
  Examples: "To deploy, run npm build", "The recipe requires boiling water first"
  Key indicators: "to do X, first...", "steps to...", instructions

IMPORTANT: If the message describes what someone is CURRENTLY DOING or WORKING ON, classify as SHORT_TERM, not LONG_TERM.

Respond with ONLY the memory type name (e.g., SHORT_TERM), nothing else.

Memory content:
{content}"""
    
    def __init__(self):
        self.client = OpenAI()
    
    def classify(self, content: str) -> str:
        """Classify memory content into a memory type."""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4.1-nano-2025-04-14",
                messages=[
                    {"role": "system", "content": "You are a memory classification assistant. Respond with only the memory type."},
                    {"role": "user", "content": self.CLASSIFICATION_PROMPT.format(content=content)}
                ],
                max_tokens=20,
                temperature=0
            )
            memory_type = response.choices[0].message.content.strip().upper()
            # Validate the response
            valid_types = ["LONG_TERM", "SHORT_TERM", "EPISODIC", "SEMANTIC", "PROCEDURAL"]
            print(f"[MemoryClassifier] Classified as: {memory_type}")
            if memory_type in valid_types:
                return memory_type
            return "LONG_TERM"  # Default fallback
        except Exception as e:
            print(f"[MemoryClassifier] Error: {e}")
            return "LONG_TERM"  # Default on error

classifier = MemoryClassifier()
print("  Memory Classifier: enabled")

class Message(BaseModel):
    role: str
    content: str


class AddMemoryRequest(BaseModel):
    messages: list[Message]
    user_id: str
    metadata: Optional[dict] = None
    auto_classify: bool = True  # Enable auto-classification by default


class SearchMemoryRequest(BaseModel):
    query: str
    user_id: str
    limit: Optional[int] = 10
    memory_type: Optional[str] = None  # Filter by memory type


class UpdateMemoryRequest(BaseModel):
    memory_id: str
    data: str


class DeleteMemoryRequest(BaseModel):
    memory_id: str


class GetAllMemoriesRequest(BaseModel):
    user_id: str
    memory_type: Optional[str] = None  # Filter by memory type


class AddImageMemoryRequest(BaseModel):
    image_url: str
    context: Optional[str] = None
    user_id: str
    metadata: Optional[dict] = None
    auto_classify: bool = True  # Enable auto-classification by default


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Memory API is running"}


@app.post("/memory/add")
async def add_memory(request: AddMemoryRequest):
    """
    Add new memories from a conversation.
    Mem0 automatically extracts and stores relevant facts.
    Auto-classifies memory type if auto_classify=True.
    """
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        
        # Prepare metadata
        metadata = request.metadata.copy() if request.metadata else {}
        
        # Auto-classify if enabled and memory_type not already set
        if request.auto_classify and "memory_type" not in metadata:
            # Extract content for classification
            content = " ".join([m.content for m in request.messages if isinstance(m.content, str)])
            if content:
                memory_type = classifier.classify(content)
                metadata["memory_type"] = memory_type
                print(f"[add_memory] Classified as: {memory_type}")
        
        result = memory.add(
            messages,
            user_id=request.user_id,
            metadata=metadata if metadata else None
        )
        return {"success": True, "result": result, "classified_type": metadata.get("memory_type")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/memory/search")
async def search_memory(request: SearchMemoryRequest):
    """
    Search memories based on a query.
    Returns relevant memories with similarity scores.
    Optionally filter by memory_type.
    """
    try:
        # Build filters if memory_type specified
        filters = None
        if request.memory_type:
            filters = {"memory_type": request.memory_type}
        
        results = memory.search(
            request.query,
            user_id=request.user_id,
            limit=request.limit,
            filters=filters
        )
        print(f"[search_memory] Results: {results}")
        return {"success": True, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/memory/get_all")
async def get_all_memories(request: GetAllMemoriesRequest):
    """
    Get all memories for a user.
    Optionally filter by memory_type.
    """
    try:
        filters = None
        if request.memory_type:
            filters = {"memory_type": request.memory_type}
        
        memories = memory.get_all(user_id=request.user_id, filters=filters)
        return {"success": True, "memories": memories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/memory/add_image")
async def add_image_memory(request: AddImageMemoryRequest):
    """
    Add an image-based memory.
    Auto-classifies memory type if auto_classify=True.
    """
    try:
        messages = []
        
        if request.context:
            messages.append({"role": "user", "content": request.context})
        
        messages.append({
            "role": "user",
            "content": {
                "type": "image_url",
                "image_url": {"url": request.image_url}
            }
        })
        
        # Prepare metadata
        metadata = request.metadata.copy() if request.metadata else {"source": "screen_capture"}
        
        # Auto-classify based on context if provided
        if request.auto_classify and "memory_type" not in metadata and request.context:
            memory_type = classifier.classify(request.context)
            metadata["memory_type"] = memory_type
            print(f"[add_image] Classified as: {memory_type}")
        
        print(f"[add_image] Processing image URL: {request.image_url[:100]}...")
        
        result = memory.add(
            messages,
            user_id=request.user_id,
            metadata=metadata
        )
        print(f"[add_image] Result: {result}")
        return {"success": True, "result": result, "classified_type": metadata.get("memory_type")}
    except Exception as e:
        print(f"[add_image] ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory/{memory_id}")
async def get_memory(memory_id: str):
    """
    Get a specific memory by ID.
    """
    try:
        result = memory.get(memory_id)
        return {"success": True, "memory": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/memory/update")
async def update_memory(request: UpdateMemoryRequest):
    """
    Update an existing memory.
    """
    try:
        result = memory.update(request.memory_id, request.data)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str):
    """
    Delete a specific memory by ID.
    """
    try:
        result = memory.delete(memory_id)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/memory/user/{user_id}")
async def delete_all_user_memories(user_id: str):
    """
    Delete all memories for a specific user.
    """
    try:
        result = memory.delete_all(user_id=user_id)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory/history/{memory_id}")
async def get_memory_history(memory_id: str):
    """
    Get the history/changelog of a specific memory.
    """
    try:
        history = memory.history(memory_id)
        return {"success": True, "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
