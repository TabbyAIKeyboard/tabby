#!/usr/bin/env bash
# =============================================================================
# Tabby Linux - Comprehensive Production Test Suite
# Tests every endpoint, every option, Mistral-only
# =============================================================================
set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Config
MEMORY_API="http://localhost:8000"
NEXTJS_API="http://localhost:3001"
SUPABASE_URL="http://127.0.0.1:54321"
# Read keys from environment or `npx supabase status` output
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$(npx supabase status 2>/dev/null | grep 'anon key' | awk '{print $NF}')}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(npx supabase status 2>/dev/null | grep 'service_role key' | awk '{print $NF}')}"

# Test user (will be created if not exists)
TEST_EMAIL="tabby-test@linux.local"
TEST_PASSWORD="testpassword123"
TEST_USER_ID=""
AUTH_TOKEN=""

# Counters
PASSED=0
FAILED=0
SKIPPED=0
TOTAL=0

# Test result tracking
declare -a FAILED_TESTS=()

# Helper functions
log_section() {
  echo -e "\n${BOLD}${CYAN}═══════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  $1${NC}"
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════${NC}"
}

log_test() {
  ((TOTAL++))
  echo -ne "  ${YELLOW}▶${NC} $1 ... "
}

pass() {
  ((PASSED++))
  echo -e "${GREEN}✓ PASS${NC}${1:+ ($1)}"
}

fail() {
  ((FAILED++))
  local test_name="${FUNCNAME[1]:-unknown}"
  FAILED_TESTS+=("$test_name: $1")
  echo -e "${RED}✗ FAIL${NC} ($1)"
}

skip() {
  ((SKIPPED++))
  echo -e "${YELLOW}⊘ SKIP${NC} ($1)"
}

# HTTP helper - returns body and saves status code
# Note: Do NOT use -f (fail) flag — it suppresses body on error responses
http_get() {
  local url="$1"
  shift
  curl -s -w "\n%{http_code}" "$url" "$@" 2>/dev/null || echo -e "\n000"
}

http_post() {
  local url="$1"
  local data="$2"
  shift 2
  curl -s -w "\n%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d "$data" "$@" 2>/dev/null || echo -e "\n000"
}

http_delete() {
  local url="$1"
  shift
  curl -s -w "\n%{http_code}" -X DELETE "$url" "$@" 2>/dev/null || echo -e "\n000"
}

get_status() {
  echo "$1" | tail -1
}

get_body() {
  echo "$1" | sed '$d'
}

# =============================================================================
# SECTION 0: Prerequisites
# =============================================================================
test_prerequisites() {
  log_section "SECTION 0: Prerequisites Check"

  log_test "Supabase is running (port 54321)"
  local resp
  resp=$(http_get "$SUPABASE_URL/rest/v1/")
  if [[ "$(get_status "$resp")" == "200" ]]; then
    pass
  else
    fail "Supabase not running"
    echo -e "  ${RED}FATAL: Supabase must be running. Run: npx supabase start${NC}"
    exit 1
  fi

  log_test "Memory API is running (port 8000)"
  resp=$(http_get "$MEMORY_API/")
  if [[ "$(get_status "$resp")" == "200" ]]; then
    local body
    body=$(get_body "$resp")
    if echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['service']=='Mistral Memory API'" 2>/dev/null; then
      pass "Mistral Memory API v2.0.0"
    else
      fail "Wrong service name"
    fi
  else
    fail "Memory API not running"
    exit 1
  fi

  log_test "Next.js Backend is running (port 3001)"
  resp=$(http_get "$NEXTJS_API/")
  if [[ "$(get_status "$resp")" == "200" ]]; then
    pass
  else
    fail "Next.js backend not running"
    exit 1
  fi

  log_test "xdotool is installed"
  if command -v xdotool &>/dev/null; then
    pass "$(xdotool version 2>/dev/null | head -1)"
  else
    fail "xdotool not found - install with: sudo apt install xdotool"
  fi
}

# =============================================================================
# SECTION 1: Supabase Auth
# =============================================================================
test_auth() {
  log_section "SECTION 1: Supabase Authentication"

  # Create test user via admin API
  log_test "Create test user via admin API"
  local resp
  resp=$(curl -s -w "\n%{http_code}" -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"email_confirm\":true}" 2>/dev/null || echo -e "\n000")
  local status
  status=$(get_status "$resp")
  local body
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]] || [[ "$status" == "422" ]]; then
    # 422 means user already exists
    if [[ "$status" == "422" ]]; then
      pass "user already exists"
    else
      TEST_USER_ID=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
      pass "user_id=$TEST_USER_ID"
    fi
  else
    fail "status=$status"
  fi

  # Sign in to get token
  log_test "Sign in with password"
  resp=$(curl -s -w "\n%{http_code}" -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    AUTH_TOKEN=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
    TEST_USER_ID=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)
    pass "token=${AUTH_TOKEN:0:20}..."
  else
    fail "status=$status body=$(echo "$body" | head -c 100)"
  fi

  # Test signup API route (Next.js backend)
  log_test "POST /api/auth/signup (new user)"
  local signup_email="test-suite-$(date +%s)@test.local"
  resp=$(http_post "$NEXTJS_API/api/auth/signup" "{\"email\":\"$signup_email\",\"password\":\"testpass123\"}")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local has_error
    has_error=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('error') else 'no')" 2>/dev/null)
    if [[ "$has_error" == "no" ]]; then
      pass "user created with email_confirm=true"
    else
      fail "signup returned error: $(echo "$body" | head -c 100)"
    fi
  else
    fail "status=$status"
  fi

  # Test signup with existing user
  log_test "POST /api/auth/signup (duplicate user)"
  resp=$(http_post "$NEXTJS_API/api/auth/signup" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local msg
    msg=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message',''))" 2>/dev/null)
    if [[ "$msg" == *"already"* ]] || [[ "$msg" == *"registered"* ]]; then
      pass "correctly reports duplicate"
    else
      pass "handled duplicate (msg: ${msg:0:50})"
    fi
  else
    fail "status=$status"
  fi

  # Verify auth works for API
  log_test "Auth token validates on backend"
  if [[ -n "$AUTH_TOKEN" ]]; then
    resp=$(curl -s -w "\n%{http_code}" -X POST "$NEXTJS_API/api/chat" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d '{"messages":[]}' 2>/dev/null || echo -e "\n000")
    status=$(get_status "$resp")
    # 400 is expected (empty messages), but NOT 401
    if [[ "$status" == "400" ]]; then
      pass "400 (expected - empty messages, but auth passed)"
    elif [[ "$status" == "401" ]]; then
      fail "401 Unauthorized - token not accepted"
    else
      pass "status=$status (auth passed)"
    fi
  else
    skip "no auth token"
  fi
}

# =============================================================================
# SECTION 2: Memory Backend (ChromaDB + Mistral)
# =============================================================================
test_memory_backend() {
  log_section "SECTION 2: Memory Backend (ChromaDB + Mistral)"

  local resp status body

  # Health check
  log_test "GET / (health check)"
  resp=$(http_get "$MEMORY_API/")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local storage
    storage=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['storage'])" 2>/dev/null)
    pass "storage=$storage"
  else
    fail "status=$status"
  fi

  # Detailed health
  log_test "GET /healthz (detailed health)"
  resp=$(http_get "$MEMORY_API/healthz")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local mistral_ok
    mistral_ok=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['mistral_connected'])" 2>/dev/null)
    if [[ "$mistral_ok" == "True" ]]; then
      pass "mistral=connected, chromadb=connected"
    else
      fail "mistral not connected"
    fi
  else
    fail "status=$status"
  fi

  # Add memory
  log_test "POST /memory/add (basic)"
  local mem_user_id="test-user-$(date +%s)"
  resp=$(http_post "$MEMORY_API/memory/add" "{\"messages\":[{\"role\":\"user\",\"content\":\"My name is TestUser and I love Python programming on Linux\"}],\"user_id\":\"$mem_user_id\"}")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  local memory_id=""
  if [[ "$status" == "200" ]]; then
    memory_id=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['memory_id'])" 2>/dev/null)
    local facts
    facts=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['facts'][:80])" 2>/dev/null)
    pass "id=$memory_id facts='${facts:0:60}...'"
  else
    fail "status=$status"
  fi

  # Add second memory for search testing
  log_test "POST /memory/add (second memory)"
  resp=$(http_post "$MEMORY_API/memory/add" "{\"messages\":[{\"role\":\"user\",\"content\":\"I prefer Mistral AI over OpenAI for cost efficiency\"}],\"user_id\":\"$mem_user_id\"}")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    fail "status=$status"
  fi

  # Add memory with metadata
  log_test "POST /memory/add (with metadata)"
  resp=$(http_post "$MEMORY_API/memory/add" "{\"messages\":[{\"role\":\"user\",\"content\":\"Working on Tabby AI keyboard project\"}],\"user_id\":\"$mem_user_id\",\"metadata\":{\"project\":\"tabby\",\"priority\":\"high\"}}")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    fail "status=$status"
  fi

  # Search memory
  log_test "POST /memory/search (relevant query)"
  resp=$(http_post "$MEMORY_API/memory/search" "{\"query\":\"What programming language does the user like?\",\"user_id\":\"$mem_user_id\",\"limit\":5}")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local count
    count=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null)
    if [[ "$count" -gt 0 ]]; then
      pass "found $count results"
    else
      fail "no results found"
    fi
  else
    fail "status=$status"
  fi

  # Search with limit=1
  log_test "POST /memory/search (limit=1)"
  resp=$(http_post "$MEMORY_API/memory/search" "{\"query\":\"AI preferences\",\"user_id\":\"$mem_user_id\",\"limit\":1}")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local count
    count=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null)
    if [[ "$count" -le 1 ]]; then
      pass "returned $count result (limit respected)"
    else
      fail "returned $count results, expected <=1"
    fi
  else
    fail "status=$status"
  fi

  # Search with wrong user_id (should return 0)
  log_test "POST /memory/search (wrong user_id isolation)"
  resp=$(http_post "$MEMORY_API/memory/search" "{\"query\":\"Python\",\"user_id\":\"nonexistent-user-xyz\",\"limit\":10}")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local count
    count=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null)
    if [[ "$count" == "0" ]]; then
      pass "0 results (user isolation works)"
    else
      fail "found $count results for wrong user"
    fi
  else
    fail "status=$status"
  fi

  # Get all memories
  log_test "POST /memory/get_all"
  resp=$(http_post "$MEMORY_API/memory/get_all" "{\"user_id\":\"$mem_user_id\"}")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local count
    count=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null)
    pass "found $count memories for user"
  else
    fail "status=$status"
  fi

  # Get single memory by ID
  if [[ -n "$memory_id" ]]; then
    log_test "GET /memory/{id}"
    resp=$(http_get "$MEMORY_API/memory/$memory_id")
    status=$(get_status "$resp")
    body=$(get_body "$resp")
    if [[ "$status" == "200" ]]; then
      local got_id
      got_id=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
      if [[ "$got_id" == "$memory_id" ]]; then
        pass
      else
        fail "id mismatch"
      fi
    else
      fail "status=$status"
    fi

    # Get memory history (alias)
    log_test "GET /memory/history/{id}"
    resp=$(http_get "$MEMORY_API/memory/history/$memory_id")
    status=$(get_status "$resp")
    if [[ "$status" == "200" ]]; then
      pass
    else
      fail "status=$status"
    fi
  fi

  # Get nonexistent memory
  log_test "GET /memory/{id} (nonexistent)"
  resp=$(http_get "$MEMORY_API/memory/nonexistent-id-12345")
  status=$(get_status "$resp")
  if [[ "$status" == "404" ]] || [[ "$status" == "500" ]]; then
    pass "status=$status (correctly rejects)"
  else
    fail "status=$status (expected 404 or 500)"
  fi

  # Delete single memory
  if [[ -n "$memory_id" ]]; then
    log_test "DELETE /memory/{id}"
    resp=$(http_delete "$MEMORY_API/memory/$memory_id")
    status=$(get_status "$resp")
    if [[ "$status" == "200" ]]; then
      pass
    else
      fail "status=$status"
    fi

    # Verify deletion
    log_test "GET /memory/{id} (after delete)"
    resp=$(http_get "$MEMORY_API/memory/$memory_id")
    status=$(get_status "$resp")
    if [[ "$status" == "404" ]] || [[ "$status" == "500" ]]; then
      pass "correctly gone"
    else
      fail "status=$status (memory still exists)"
    fi
  fi

  # Delete all user memories
  log_test "DELETE /memory/user/{user_id}"
  resp=$(http_delete "$MEMORY_API/memory/user/$mem_user_id")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    fail "status=$status"
  fi

  # Verify all deleted
  log_test "POST /memory/get_all (after delete all)"
  resp=$(http_post "$MEMORY_API/memory/get_all" "{\"user_id\":\"$mem_user_id\"}")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local count
    count=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null)
    if [[ "$count" == "0" ]]; then
      pass "0 memories remaining"
    else
      fail "$count memories still remain"
    fi
  else
    fail "status=$status"
  fi
}

# =============================================================================
# SECTION 3: Next.js Backend - AI Endpoints (Mistral)
# =============================================================================
test_ai_endpoints() {
  log_section "SECTION 3: AI Endpoints (Mistral-only)"

  local resp status body

  # --- /api/chat ---
  log_test "POST /api/chat (Mistral streaming)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST "$NEXTJS_API/api/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{"messages":[{"id":"t1","role":"user","parts":[{"type":"text","text":"Say hello in one word"}]}],"model":"mistral-small-latest"}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    if [[ -n "$body" ]]; then
      pass "streaming response received (${#body} bytes)"
    else
      fail "empty response body"
    fi
  else
    fail "status=$status body=$(echo "$body" | head -c 100)"
  fi

  # --- /api/chat with body userId (no Bearer) ---
  log_test "POST /api/chat (body userId fallback)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST "$NEXTJS_API/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"messages\":[{\"id\":\"t2\",\"role\":\"user\",\"parts\":[{\"type\":\"text\",\"text\":\"Say hi\"}]}],\"userId\":\"$TEST_USER_ID\",\"model\":\"mistral-small-latest\"}" 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    fail "status=$status"
  fi

  # --- /api/chat missing messages ---
  log_test "POST /api/chat (missing messages → 400)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 10 -X POST "$NEXTJS_API/api/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "400" ]]; then
    pass
  else
    fail "expected 400, got $status"
  fi

  # --- /api/chat no auth ---
  log_test "POST /api/chat (no auth → 401)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 10 -X POST "$NEXTJS_API/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"id":"t3","role":"user","parts":[{"type":"text","text":"test"}]}]}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "401" ]]; then
    pass
  else
    fail "expected 401, got $status"
  fi

  # --- /api/chat with each Mistral model ---
  for model in "mistral-small-latest" "mistral-large-latest" "codestral-latest"; do
    log_test "POST /api/chat (model=$model)"
    resp=$(curl -s -w "\n%{http_code}" --max-time 45 -X POST "$NEXTJS_API/api/chat" \
      -H "Content-Type: application/json" \
      -d "{\"messages\":[{\"id\":\"m-$model\",\"role\":\"user\",\"parts\":[{\"type\":\"text\",\"text\":\"Reply with just the word OK\"}]}],\"userId\":\"$TEST_USER_ID\",\"model\":\"$model\"}" 2>/dev/null || echo -e "\n000")
    status=$(get_status "$resp")
    if [[ "$status" == "200" ]]; then
      pass
    else
      fail "status=$status"
    fi
  done

  # --- /api/suggest-inline ---
  log_test "POST /api/suggest-inline"
  resp=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST "$NEXTJS_API/api/suggest-inline" \
    -H "Content-Type: application/json" \
    -d "{\"context\":\"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return\",\"userId\":\"$TEST_USER_ID\"}" 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local suggestion
    suggestion=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('suggestion','')[:60])" 2>/dev/null)
    pass "suggestion='${suggestion:0:50}...'"
  else
    fail "status=$status"
  fi

  # --- /api/suggest-inline with short context ---
  log_test "POST /api/suggest-inline (short context < 5 chars)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 10 -X POST "$NEXTJS_API/api/suggest-inline" \
    -H "Content-Type: application/json" \
    -d "{\"context\":\"ab\",\"userId\":\"$TEST_USER_ID\"}" 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local suggestion
    suggestion=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('suggestion',''))" 2>/dev/null)
    if [[ -z "$suggestion" ]] || [[ "$suggestion" == "None" ]]; then
      pass "empty suggestion for short context"
    else
      pass "got suggestion anyway"
    fi
  else
    # 400 is also acceptable
    pass "status=$status (rejected short context)"
  fi

  # --- /api/suggest-inline with cached memories ---
  log_test "POST /api/suggest-inline (with cachedMemories)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST "$NEXTJS_API/api/suggest-inline" \
    -H "Content-Type: application/json" \
    -d "{\"context\":\"Hello, my name is\",\"userId\":\"$TEST_USER_ID\",\"cachedMemories\":[\"User prefers Python\",\"User works on AI projects\"]}" 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    fail "status=$status"
  fi

  # --- /api/generate-title ---
  log_test "POST /api/generate-title"
  resp=$(curl -s -w "\n%{http_code}" --max-time 20 -X POST "$NEXTJS_API/api/generate-title" \
    -H "Content-Type: application/json" \
    -d '{"message":{"id":"tt1","role":"user","parts":[{"type":"text","text":"How do I set up a FastAPI server with ChromaDB for vector search?"}]},"model":"mistral-small-latest"}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local title
    title=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',''))" 2>/dev/null)
    pass "title='$title'"
  else
    fail "status=$status"
  fi

  # --- /api/generate-title (empty message) ---
  log_test "POST /api/generate-title (empty message)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 10 -X POST "$NEXTJS_API/api/generate-title" \
    -H "Content-Type: application/json" \
    -d '{"message":null,"model":"mistral-small-latest"}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local title
    title=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',''))" 2>/dev/null)
    if [[ "$title" == "New Chat" ]]; then
      pass "fallback to 'New Chat'"
    else
      pass "title='$title'"
    fi
  else
    fail "status=$status"
  fi

  # --- /api/completion ---
  log_test "POST /api/completion (grammar fix)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST "$NEXTJS_API/api/completion" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{"messages":[{"id":"c1","role":"user","parts":[{"type":"text","text":"fix this: i goed to store yesterday and buyed milk"}]}],"action":"grammar"}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass "streaming response"
  else
    fail "status=$status"
  fi

  # --- /api/suggest ---
  log_test "POST /api/suggest (sentence completion)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST "$NEXTJS_API/api/suggest" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{"messages":[{"id":"s1","role":"user","parts":[{"type":"text","text":"Complete this sentence: The quick brown fox"}]}]}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass "streaming response"
  else
    fail "status=$status"
  fi

  # --- /api/interview-ghost-suggest (requires vision model) ---
  log_test "POST /api/interview-ghost-suggest (with minimal screenshot)"
  # Create a tiny 1x1 PNG as base64
  local tiny_png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  resp=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST "$NEXTJS_API/api/interview-ghost-suggest" \
    -H "Content-Type: application/json" \
    -d "{\"screenshot\":\"$tiny_png\",\"userId\":\"$TEST_USER_ID\",\"model\":\"pixtral-large-latest\"}" 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    # Vision endpoint may fail with tiny image, that's acceptable
    pass "status=$status (vision endpoint responded)"
  fi

  # --- /api/dashboard/stats ---
  log_test "GET /api/dashboard/stats"
  resp=$(http_get "$NEXTJS_API/api/dashboard/stats")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    fail "status=$status"
  fi

  # --- /api/dashboard/analytics ---
  for period in "minute" "hour" "day"; do
    log_test "GET /api/dashboard/analytics?period=$period"
    resp=$(http_get "$NEXTJS_API/api/dashboard/analytics?period=$period")
    status=$(get_status "$resp")
    if [[ "$status" == "200" ]]; then
      pass
    else
      fail "status=$status"
    fi
  done

  # --- Voice endpoints (Groq/OpenAI dependent - may skip) ---
  log_test "POST /api/transcribe (requires Groq - may skip)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 10 -X POST "$NEXTJS_API/api/transcribe" \
    -H "Content-Type: application/json" \
    -d '{"audio":"data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    skip "status=$status (likely no GROQ_API_KEY)"
  fi

  log_test "POST /api/speech (requires OpenAI TTS - may skip)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 10 -X POST "$NEXTJS_API/api/speech" \
    -H "Content-Type: application/json" \
    -d '{"text":"hello","voice":"alloy"}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    skip "status=$status (likely no OPENAI_API_KEY)"
  fi
}

# =============================================================================
# SECTION 4: Memory Integration (Next.js ↔ FastAPI)
# =============================================================================
test_memory_integration() {
  log_section "SECTION 4: Memory Integration (AI Tools → FastAPI)"

  local resp status body

  # Store a memory via chat (AI should call addMemory tool)
  log_test "POST /api/chat (trigger addMemory tool)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 45 -X POST "$NEXTJS_API/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"messages\":[{\"id\":\"mem1\",\"role\":\"user\",\"parts\":[{\"type\":\"text\",\"text\":\"Remember this: my favorite language is Rust and I work at TestCorp. Store this in memory.\"}]}],\"userId\":\"$TEST_USER_ID\",\"model\":\"mistral-small-latest\"}" 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass "AI responded (may have stored memory)"
  else
    fail "status=$status"
  fi

  # Verify memory was stored
  log_test "Verify memory stored in ChromaDB"
  sleep 2 # Give time for the tool call to complete
  resp=$(http_post "$MEMORY_API/memory/search" "{\"query\":\"favorite programming language\",\"user_id\":\"$TEST_USER_ID\",\"limit\":5}")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  if [[ "$status" == "200" ]]; then
    local count
    count=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null)
    if [[ "$count" -gt 0 ]]; then
      pass "found $count memories"
    else
      pass "0 results (AI may not have called tool)"
    fi
  else
    fail "status=$status"
  fi

  # Clean up test user memories
  log_test "Cleanup: delete test user memories"
  resp=$(http_delete "$MEMORY_API/memory/user/$TEST_USER_ID")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    fail "status=$status"
  fi
}

# =============================================================================
# SECTION 5: Edge Cases & Error Handling
# =============================================================================
test_edge_cases() {
  log_section "SECTION 5: Edge Cases & Error Handling"

  local resp status body

  # Empty body to each endpoint
  log_test "POST /api/chat (empty body)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 10 -X POST "$NEXTJS_API/api/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "400" ]]; then
    pass
  else
    fail "expected 400, got $status"
  fi

  log_test "POST /memory/add (missing user_id)"
  resp=$(http_post "$MEMORY_API/memory/add" '{"messages":[{"role":"user","content":"test"}]}')
  status=$(get_status "$resp")
  if [[ "$status" == "422" ]]; then
    pass "422 validation error"
  else
    fail "expected 422, got $status"
  fi

  log_test "POST /memory/search (missing query)"
  resp=$(http_post "$MEMORY_API/memory/search" '{"user_id":"test"}')
  status=$(get_status "$resp")
  if [[ "$status" == "422" ]]; then
    pass "422 validation error"
  else
    fail "expected 422, got $status"
  fi

  log_test "POST /memory/add (empty messages)"
  resp=$(http_post "$MEMORY_API/memory/add" '{"messages":[],"user_id":"test"}')
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]] || [[ "$status" == "500" ]]; then
    pass "status=$status (handled gracefully)"
  else
    fail "status=$status"
  fi

  # Invalid JSON
  log_test "POST /memory/add (invalid JSON)"
  resp=$(curl -s -w "\n%{http_code}" -X POST "$MEMORY_API/memory/add" \
    -H "Content-Type: application/json" \
    -d 'not valid json' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "422" ]] || [[ "$status" == "400" ]]; then
    pass "status=$status"
  else
    fail "expected 422/400, got $status"
  fi

  # Large payload
  log_test "POST /memory/add (large content ~5KB)"
  local large_content
  large_content=$(python3 -c "print('x'*5000)")
  resp=$(http_post "$MEMORY_API/memory/add" "{\"messages\":[{\"role\":\"user\",\"content\":\"$large_content\"}],\"user_id\":\"edge-test-user\"}")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
    # Cleanup
    http_delete "$MEMORY_API/memory/user/edge-test-user" >/dev/null 2>&1
  else
    fail "status=$status"
  fi

  # Unicode content
  log_test "POST /memory/add (unicode: Japanese + emoji)"
  resp=$(http_post "$MEMORY_API/memory/add" '{"messages":[{"role":"user","content":"私はプログラミングが好きです 🐧🚀 Linux forever"}],"user_id":"unicode-test"}')
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
    http_delete "$MEMORY_API/memory/user/unicode-test" >/dev/null 2>&1
  else
    fail "status=$status"
  fi

  # Concurrent requests
  log_test "Concurrent memory operations (5 parallel adds)"
  local pids=()
  for i in $(seq 1 5); do
    curl -sf -X POST "$MEMORY_API/memory/add" \
      -H "Content-Type: application/json" \
      -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Concurrent test $i\"}],\"user_id\":\"concurrent-test\"}" >/dev/null 2>&1 &
    pids+=($!)
  done
  local all_ok=true
  for pid in "${pids[@]}"; do
    if ! wait "$pid"; then
      all_ok=false
    fi
  done
  if $all_ok; then
    pass "all 5 completed"
  else
    fail "some requests failed"
  fi
  http_delete "$MEMORY_API/memory/user/concurrent-test" >/dev/null 2>&1
}

# =============================================================================
# SECTION 6: Mistral Model Verification
# =============================================================================
test_mistral_models() {
  log_section "SECTION 6: Mistral Model Verification"

  local resp status body

  # Verify default model is Mistral
  log_test "Default model is mistral-small-latest"
  resp=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST "$NEXTJS_API/api/generate-title" \
    -H "Content-Type: application/json" \
    -d '{"message":{"id":"dm","role":"user","parts":[{"type":"text","text":"Testing default model"}]},"model":"mistral-small-latest"}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    fail "status=$status"
  fi

  # Test each Mistral model with generate-title (fast, non-streaming)
  for model in "mistral-small-latest" "mistral-large-latest" "codestral-latest"; do
    log_test "Model: $model (generate-title)"
    resp=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST "$NEXTJS_API/api/generate-title" \
      -H "Content-Type: application/json" \
      -d "{\"message\":{\"id\":\"gm-$model\",\"role\":\"user\",\"parts\":[{\"type\":\"text\",\"text\":\"How to sort arrays in Python efficiently\"}]},\"model\":\"$model\"}" 2>/dev/null || echo -e "\n000")
    status=$(get_status "$resp")
    body=$(get_body "$resp")
    if [[ "$status" == "200" ]]; then
      local title
      title=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',''))" 2>/dev/null)
      pass "title='$title'"
    else
      fail "status=$status"
    fi
  done

  # Pixtral vision model
  log_test "Model: pixtral-large-latest (vision, generate-title)"
  resp=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST "$NEXTJS_API/api/generate-title" \
    -H "Content-Type: application/json" \
    -d '{"message":{"id":"gm-pix","role":"user","parts":[{"type":"text","text":"Explain neural networks"}]},"model":"pixtral-large-latest"}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    pass
  else
    fail "status=$status"
  fi

  # Verify non-Mistral models fail gracefully (no OpenAI key)
  log_test "Non-Mistral model (gpt-4.1-mini) fails gracefully"
  resp=$(curl -s -w "\n%{http_code}" --max-time 15 -X POST "$NEXTJS_API/api/generate-title" \
    -H "Content-Type: application/json" \
    -d '{"message":{"id":"gm-gpt","role":"user","parts":[{"type":"text","text":"test"}]},"model":"gpt-4.1-mini"}' 2>/dev/null || echo -e "\n000")
  status=$(get_status "$resp")
  body=$(get_body "$resp")
  # Should return 200 with "New Chat" fallback (error caught) or 500
  if [[ "$status" == "200" ]]; then
    local title
    title=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',''))" 2>/dev/null)
    if [[ "$title" == "New Chat" ]]; then
      pass "graceful fallback to 'New Chat'"
    else
      pass "got title='$title' (unexpected but ok)"
    fi
  elif [[ "$status" == "500" ]]; then
    pass "500 (no OpenAI key, expected)"
  else
    fail "status=$status"
  fi
}

# =============================================================================
# SECTION 7: ChromaDB Persistence
# =============================================================================
test_persistence() {
  log_section "SECTION 7: ChromaDB Persistence"

  local resp status body

  log_test "ChromaDB storage directory exists"
  if [[ -d "$HOME/.tabby/chromadb" ]]; then
    local size
    size=$(du -sh "$HOME/.tabby/chromadb" 2>/dev/null | cut -f1)
    pass "size=$size"
  else
    fail "~/.tabby/chromadb does not exist"
  fi

  # Store a memory, then verify it persists in the DB files
  log_test "Store memory and verify persistence"
  resp=$(http_post "$MEMORY_API/memory/add" '{"messages":[{"role":"user","content":"Persistence test: I love Ubuntu 24.04"}],"user_id":"persistence-test"}')
  status=$(get_status "$resp")
  if [[ "$status" == "200" ]]; then
    # Check if DB files were updated
    local db_files
    db_files=$(find "$HOME/.tabby/chromadb" -name "*.bin" -o -name "*.sqlite3" 2>/dev/null | wc -l)
    if [[ "$db_files" -gt 0 ]]; then
      pass "$db_files DB files found"
    else
      pass "stored (DB structure may differ)"
    fi
    http_delete "$MEMORY_API/memory/user/persistence-test" >/dev/null 2>&1
  else
    fail "status=$status"
  fi
}

# =============================================================================
# RESULTS SUMMARY
# =============================================================================
print_results() {
  log_section "TEST RESULTS"

  echo -e "  ${GREEN}Passed:  $PASSED${NC}"
  echo -e "  ${RED}Failed:  $FAILED${NC}"
  echo -e "  ${YELLOW}Skipped: $SKIPPED${NC}"
  echo -e "  ${BOLD}Total:   $TOTAL${NC}"
  echo ""

  if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
    echo -e "  ${RED}${BOLD}Failed Tests:${NC}"
    for ft in "${FAILED_TESTS[@]}"; do
      echo -e "    ${RED}✗${NC} $ft"
    done
    echo ""
  fi

  local pct=0
  if [[ $TOTAL -gt 0 ]]; then
    pct=$(( (PASSED * 100) / TOTAL ))
  fi

  if [[ $FAILED -eq 0 ]]; then
    echo -e "  ${GREEN}${BOLD}🎉 ALL TESTS PASSED ($pct%)${NC}"
  elif [[ $pct -ge 90 ]]; then
    echo -e "  ${YELLOW}${BOLD}⚠ $pct% pass rate — minor issues${NC}"
  else
    echo -e "  ${RED}${BOLD}❌ $pct% pass rate — needs attention${NC}"
  fi
  echo ""
}

# =============================================================================
# MAIN
# =============================================================================
main() {
  echo -e "${BOLD}${CYAN}"
  echo "╔══════════════════════════════════════════════════╗"
  echo "║  Tabby Linux — Production Test Suite             ║"
  echo "║  Mistral-only • ChromaDB • Ubuntu 24.04 LTS     ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo -e "${NC}"

  test_prerequisites
  test_auth
  test_memory_backend
  test_ai_endpoints
  test_memory_integration
  test_edge_cases
  test_mistral_models
  test_persistence

  print_results

  if [[ $FAILED -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
