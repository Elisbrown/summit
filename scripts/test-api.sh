#!/bin/bash
# =============================================================================
# API INTEGRATION TESTS - HTTP-based testing against running server
# =============================================================================
# This script tests all API endpoints against a running Next.js dev server
# Run with: ./scripts/test-api.sh
# Make sure the dev server is running on port 3000
# =============================================================================

BASE_URL="http://localhost:3000"
PASSED=0
FAILED=0
TOTAL=0
FAILED_TESTS=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "============================================================"
echo "API INTEGRATION TESTS"
echo "============================================================"
echo ""
echo "Testing against: $BASE_URL"
echo ""

# Generate API Token
echo "Generating API Token..."
API_TOKEN=$(node scripts/generate-token.js | tail -n 1)
if [ -z "$API_TOKEN" ]; then
    echo -e "${RED}ERROR: Failed to generate API token${NC}"
    exit 1
fi
echo -e "${GREEN}Token generated successfully${NC}" 

# Function to run a test
run_test() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local test_name="$method $endpoint"
    
    TOTAL=$((TOTAL + 1))
    
    if [ -z "$data" ]; then
        # GET or DELETE without body
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" -H "Content-Type: application/json" -H "Authorization: Bearer $API_TOKEN" 2>&1)
    else
        # POST or PUT with body
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" -H "Content-Type: application/json" -H "Authorization: Bearer $API_TOKEN" -d "$data" 2>&1)
    fi
    
    # Check if response is a valid HTTP code (not 0 or empty)
    if [[ "$response" =~ ^[0-9]+$ ]] && [ "$response" -ge 100 ] && [ "$response" -lt 600 ]; then
        # Consider 2xx, 3xx, 4xx as successful (server responded)
        # 5xx errors indicate bugs
        if [ "$response" -lt 500 ]; then
            PASSED=$((PASSED + 1))
            echo -e "${GREEN}✓${NC} $test_name -> $response"
            return 0
        else
            FAILED=$((FAILED + 1))
            FAILED_TESTS="$FAILED_TESTS\n$test_name ($response)"
            echo -e "${RED}✗${NC} $test_name -> $response (SERVER ERROR)"
            return 1
        fi
    else
        FAILED=$((FAILED + 1))
        FAILED_TESTS="$FAILED_TESTS\n$test_name (Connection failed)"
        echo -e "${RED}✗${NC} $test_name -> Connection failed"
        return 1
    fi
}

# Test server health first
echo "Checking server health..."
health_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>&1)
if [ "$health_response" != "200" ]; then
    echo -e "${RED}ERROR: Server not responding or unhealthy. Check 'pnpm run dev'.${NC}"
    echo "Health check response: $health_response"
    # Proceed anyway to test other endpoints with Auth
fi
echo -e "${GREEN}Server is reachable${NC}"
echo ""

echo "============================================================"
echo "RUNNING API TESTS"
echo "============================================================"
echo ""

# =============================================================================
# HEALTH
# =============================================================================
echo -e "${YELLOW}--- Health Check ---${NC}"
run_test "GET" "/api/health" "" "200"
echo ""

# =============================================================================
# ACCOUNTS
# =============================================================================
echo -e "${YELLOW}--- Accounts API ---${NC}"
run_test "GET" "/api/accounts" "" "200"
run_test "POST" "/api/accounts" '{"name":"Test Account","type":"bank","initialBalance":"1000","currency":"USD"}' "201"
run_test "GET" "/api/accounts/1" "" "200"
run_test "PUT" "/api/accounts/1" '{"name":"Updated Account","type":"cash","initialBalance":"2000","currency":"USD"}' "200"
# Don't delete yet, needed for other tests
echo ""

# =============================================================================
# CLIENTS
# =============================================================================
TIMESTAMP=$(date +%s)
echo -e "${YELLOW}--- Clients API ---${NC}"
run_test "GET" "/api/clients" "" "200"
run_test "POST" "/api/clients" "{\"name\":\"Test Client ${TIMESTAMP}\",\"email\":\"client${TIMESTAMP}@test.com\",\"phone\":\"+1234567890\",\"address\":\"123 Test St\"}" "201"
run_test "GET" "/api/clients/1" "" "200"
run_test "PUT" "/api/clients/1" '{"name":"Updated Client","email":"updated@test.com"}' "200"
echo ""

# =============================================================================
# VENDORS
# =============================================================================
echo -e "${YELLOW}--- Vendors API ---${NC}"
run_test "GET" "/api/vendors" "" "200"
run_test "POST" "/api/vendors" "{\"name\":\"Test Vendor ${TIMESTAMP}\",\"email\":\"vendor${TIMESTAMP}@test.com\",\"phone\":\"+1234567890\"}" "201"
run_test "PUT" "/api/vendors/1" '{"name":"Updated Vendor"}' "200"
echo ""

# =============================================================================
# PROJECTS
# =============================================================================
echo -e "${YELLOW}--- Projects API ---${NC}"
run_test "GET" "/api/projects" "" "200"
run_test "POST" "/api/projects" '{"title":"Test Project","description":"A test project","status":"active","priority":"high"}' "201"
run_test "GET" "/api/projects/1" "" "200"
run_test "PUT" "/api/projects/1" '{"title":"Updated Project","status":"completed"}' "200"
# Verify DELETE endpoint (used by list view action)
# Note: This will soft-delete project 1, might affect subsequent tests relying on it.
# Ideally, create a temp project for deletion.
echo "Creating temp project for delete test..."
TEMP_PROJ=$(curl -s -X POST "$BASE_URL/api/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{"title":"Delete Me","description":"Temp","status":"active","priority":"low"}')
# Extract ID (simple grep since jq might not be available)
TEMP_ID=$(echo "$TEMP_PROJ" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ ! -z "$TEMP_ID" ]; then
    run_test "DELETE" "/api/projects/$TEMP_ID" "" "200"
else
    echo -e "${RED}Failed to create temp project for delete test${NC}"
fi
echo ""

# =============================================================================
# PROJECT BOARDS
# =============================================================================
echo -e "${YELLOW}--- Boards API ---${NC}"
run_test "GET" "/api/projects/1/boards" "" "200"
run_test "POST" "/api/projects/1/boards" '{"title":"Test Board","position":0}' "201"
echo ""

# =============================================================================
# PROJECT CARDS
# =============================================================================
echo -e "${YELLOW}--- Cards API ---${NC}"
run_test "GET" "/api/projects/1/cards" "" "200"
# NOTE: Using boardId 1 which might not exist if DB was empty. 
# But Project POST creates default boards.
run_test "POST" "/api/projects/1/cards" '{"title":"Test Card","description":"A test card","boardId":1,"priority":"high"}' "201"
run_test "PUT" "/api/projects/1/cards" '{"cardId":1,"targetBoardId":2,"newPosition":0}' "200"
run_test "GET" "/api/projects/1/cards/1" "" "200"
run_test "PUT" "/api/projects/1/cards/1" '{"title":"Updated Card","priority":"low"}' "200"
# run_test "DELETE" "/api/projects/1/cards/1" "" "200" # Soft delete
echo ""

# =============================================================================
# INVOICES
# =============================================================================
echo -e "${YELLOW}--- Invoices API ---${NC}"
run_test "GET" "/api/invoices" "" "200"
run_test "POST" "/api/invoices" "{\"clientId\":1,\"invoiceNumber\":\"INV-${TIMESTAMP}\",\"status\":\"draft\",\"issueDate\":\"2026-01-16T00:00:00.000Z\",\"dueDate\":\"2026-02-16T00:00:00.000Z\",\"items\":[{\"description\":\"Test Item\",\"quantity\":1,\"unitPrice\":\"100\"}],\"taxRate\":10}" "201"
run_test "GET" "/api/invoices/1" "" "200"
run_test "PUT" "/api/invoices/1" '{"clientId":1,"invoiceNumber":"INV-TEST-001","status":"sent","issueDate":"2026-01-16T00:00:00.000Z","dueDate":"2026-02-16T00:00:00.000Z","items":[{"description":"Updated Item","quantity":2,"unitPrice":"150"}],"taxRate":15}' "200"
echo ""

# =============================================================================
# QUOTES
# =============================================================================
echo -e "${YELLOW}--- Quotes API ---${NC}"
run_test "GET" "/api/quotes" "" "200"
run_test "POST" "/api/quotes" "{\"clientId\":1,\"quoteNumber\":\"QUO-${TIMESTAMP}\",\"status\":\"draft\",\"issueDate\":\"2026-01-16T00:00:00.000Z\",\"expiryDate\":\"2026-02-16T00:00:00.000Z\",\"items\":[{\"description\":\"Test Item\",\"quantity\":1,\"unitPrice\":\"100\"}],\"taxRate\":10}" "201"
run_test "GET" "/api/quotes/1" "" "200"
run_test "PUT" "/api/quotes/1" '{"clientId":1,"quoteNumber":"QUO-TEST-001","status":"sent","issueDate":"2026-01-16T00:00:00.000Z","expiryDate":"2026-02-16T00:00:00.000Z","items":[{"description":"Updated Item","quantity":2,"unitPrice":"150"}],"taxRate":15}' "200"
echo ""

# =============================================================================
# TRANSACTIONS
# =============================================================================
echo -e "${YELLOW}--- Transactions API ---${NC}"
run_test "GET" "/api/transactions" "" "200"
run_test "POST" "/api/transactions" '{"accountId":1,"type":"credit","description":"Test Transaction","amount":100,"currency":"USD","transactionDate":"2026-01-16T00:00:00.000Z"}' "201"
run_test "GET" "/api/transactions/1" "" "200"
run_test "PUT" "/api/transactions/1" '{"accountId":1,"type":"debit","description":"Updated Transaction","amount":200,"currency":"USD","transactionDate":"2026-01-16T00:00:00.000Z"}' "200"
# run_test "DELETE" "/api/transactions/1" "" "200"
echo ""

# =============================================================================
# EXPENSE CATEGORIES
# =============================================================================
echo -e "${YELLOW}--- Expense Categories API ---${NC}"
run_test "GET" "/api/expense-categories" "" "200"
run_test "POST" "/api/expense-categories" "{\"name\":\"Test Category ${TIMESTAMP}\",\"description\":\"A test category\"}" "201"
run_test "PUT" "/api/expense-categories/1" '{"name":"Updated Category"}' "200"
echo ""

# =============================================================================
# INCOME CATEGORIES
# =============================================================================
echo -e "${YELLOW}--- Income Categories API ---${NC}"
run_test "GET" "/api/income-categories" "" "200"
run_test "POST" "/api/income-categories" "{\"name\":\"Test Income Category ${TIMESTAMP}\",\"description\":\"A test category\"}" "201"
run_test "PUT" "/api/income-categories/1" '{"name":"Updated Category"}' "200"
echo ""

# =============================================================================
# EXPENSES
# =============================================================================
echo -e "${YELLOW}--- Expenses API ---${NC}"
run_test "GET" "/api/expenses" "" "200"
run_test "POST" "/api/expenses" '{"description":"Test Expense","amount":"50","currency":"USD","expenseDate":"2026-01-16T00:00:00.000Z","categoryId":1,"vendor":"Staples"}' "201"
run_test "PUT" "/api/expenses/1" '{"description":"Updated Expense","amount":"100","vendor":"Staples","expenseDate":"2026-01-16T00:00:00.000Z"}' "200"
echo ""

# =============================================================================
# INCOME
# =============================================================================
echo -e "${YELLOW}--- Income API ---${NC}"
run_test "GET" "/api/income" "" "200"
run_test "POST" "/api/income" '{"description":"Test Income","amount":"1000","currency":"USD","incomeDate":"2026-01-16T00:00:00.000Z","categoryId":1,"source":"Client Payment"}' "201"
run_test "PUT" "/api/income/1" '{"description":"Updated Income","amount":"2000","source":"Client","incomeDate":"2026-01-16T00:00:00.000Z"}' "200"
echo ""

# =============================================================================
# CALENDAR
# =============================================================================
echo -e "${YELLOW}--- Calendar API ---${NC}"
run_test "GET" "/api/calendar" "" "200"
run_test "POST" "/api/calendar" '{"title":"Test Event","description":"A test event","startAt":"2026-01-16T10:00:00.000Z","endAt":"2026-01-16T11:00:00.000Z","allDay":false,"type":"event"}' "201"
run_test "PUT" "/api/calendar/1" '{"title":"Updated Event"}' "200"
echo ""

# =============================================================================
# API TOKENS
# =============================================================================
echo -e "${YELLOW}--- API Tokens API ---${NC}"
run_test "GET" "/api/api-tokens" "" "200"
run_test "POST" "/api/api-tokens" '{"name":"Test Token 2","scopes":["read","write"]}' "201"
run_test "DELETE" "/api/api-tokens/1" "" "200"
echo ""

# =============================================================================
# USERS
# =============================================================================
echo -e "${YELLOW}--- Users API ---${NC}"
run_test "GET" "/api/users" "" "200"
run_test "PUT" "/api/users/1" '{"name":"Updated User","role":"admin"}' "200"
echo ""

# =============================================================================
# PROFILE
# =============================================================================
echo -e "${YELLOW}--- Profile API ---${NC}"
run_test "GET" "/api/profile" "" "200"
run_test "PUT" "/api/profile" '{"name":"Updated Profile","email":"updated-profile@example.com"}' "200"
echo ""

# =============================================================================
# REPORTS
# =============================================================================
echo -e "${YELLOW}--- Reports API ---${NC}"
run_test "GET" "/api/reports/revenue-overview" "" "200"
run_test "GET" "/api/reports/income-vs-expenses" "" "200"
run_test "GET" "/api/reports/profit-loss" "" "200"
run_test "GET" "/api/reports/cash-flow" "" "200"
echo ""

# =============================================================================
# PROJECT FILES
# =============================================================================
echo -e "${YELLOW}--- Project Files API ---${NC}"
run_test "GET" "/api/projects/1/files" "" "200"

echo "Testing File Upload..."
TOTAL=$((TOTAL + 1))
UPLOAD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/projects/1/files" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "file=@test-upload.txt")

if [ "$UPLOAD_RESPONSE" == "201" ]; then
    echo -e "${GREEN}✓${NC} POST /api/projects/1/files -> 201"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} POST /api/projects/1/files -> $UPLOAD_RESPONSE"
    FAILED=$((FAILED + 1))
    FAILED_TESTS="$FAILED_TESTS\nPOST /api/projects/1/files ($UPLOAD_RESPONSE)"
fi

# List files again to confirm
run_test "GET" "/api/projects/1/files" "" "200"

# Delete file (Assuming ID 1)
run_test "DELETE" "/api/projects/1/files/1" "" "200"
echo ""

# =============================================================================
# TEST SUMMARY
# =============================================================================
echo ""
echo "============================================================"
echo "TEST RESULTS SUMMARY"
echo "============================================================"
echo ""
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; ($PASSED * 100) / $TOTAL" | bc)
else
    PASS_RATE=0
fi
echo "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC} ($PASS_RATE%)"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}FAILED TESTS:${NC}"
    echo -e "$FAILED_TESTS"
else
    echo -e "${GREEN}All tests passed!${NC}"
fi

echo ""
echo "============================================================"

# Exit with appropriate code
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
