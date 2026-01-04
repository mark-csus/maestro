#!/bin/bash

###############################################################################
# Maestro Test Runner with API Reporting
# 
# Runs Maestro tests and automatically reports results to the test results API
# 
# Usage:
#   ./run-tests.sh [test-path] [options]
#   ./run-tests.sh .maestro/tests/
#   ./run-tests.sh .maestro/tests/settings/open-settings.yaml
#   ./run-tests.sh .maestro/tests/ --format junit
# 
# Environment Variables:
#   TEST_API_URL: Base URL of the test results API (default: http://localhost:3000)
#   SKIP_API_REPORTING: Set to "true" to skip reporting to API
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_PATH="${1:-.maestro/tests/}"
JUNIT_OUTPUT="test-results.xml"
API_URL="${TEST_API_URL:-http://localhost:3000}"
SKIP_REPORTING="${SKIP_API_REPORTING:-false}"
TEST_RUN_ID="run-$(date +%s)"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Maestro Test Runner with API Reporting      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🔍 Test Path:${NC} ${TEST_PATH}"
echo -e "${BLUE}🆔 Run ID:${NC} ${TEST_RUN_ID}"
echo -e "${BLUE}📊 JUnit Output:${NC} ${JUNIT_OUTPUT}"
echo -e "${BLUE}🌐 API URL:${NC} ${API_URL}"
echo ""

# Check if maestro is installed
if ! command -v maestro &> /dev/null; then
    echo -e "${RED}❌ Error: maestro is not installed${NC}"
    echo "Please install maestro: https://maestro.mobile.dev/"
    exit 1
fi

# Check if API is reachable (optional)
if [ "$SKIP_REPORTING" != "true" ]; then
    echo -e "${YELLOW}🔌 Checking API connection...${NC}"
    if curl -s --connect-timeout 3 "${API_URL}/" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API is reachable${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Cannot reach API at ${API_URL}${NC}"
        echo -e "${YELLOW}   Results will not be reported. Start the API server or set SKIP_API_REPORTING=true${NC}"
    fi
    echo ""
fi

# Run Maestro tests with JUnit output
echo -e "${BLUE}🚀 Running Maestro tests...${NC}"
echo ""

export TEST_RUN_ID

# Run tests and capture exit code
set +e
maestro test --format junit --output "${JUNIT_OUTPUT}" "${TEST_PATH}" "${@:2}"
MAESTRO_EXIT_CODE=$?
set -e

echo ""

# Check if JUnit XML was generated
if [ ! -f "${JUNIT_OUTPUT}" ]; then
    echo -e "${RED}❌ Error: JUnit XML file was not generated${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tests completed (exit code: ${MAESTRO_EXIT_CODE})${NC}"
echo ""

# Report results to API
if [ "$SKIP_REPORTING" != "true" ]; then
    echo -e "${BLUE}📤 Reporting results to API...${NC}"
    echo ""
    
    if node .maestro/scripts/report-from-junit.js "${JUNIT_OUTPUT}"; then
        echo -e "${GREEN}✅ Results successfully reported to API${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to report results to API${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Skipping API reporting (SKIP_API_REPORTING=true)${NC}"
fi

echo ""
echo -e "${BLUE}📋 View results:${NC}"
echo -e "   curl ${API_URL}/test-results"
echo ""

# Exit with the same code as maestro
exit $MAESTRO_EXIT_CODE
