#!/bin/bash
set -e

echo -e "\033[1;33mStarting fast deployment of Lambda code...\033[0m"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.."; pwd)"
LAMBDA_DIR="$PROJECT_ROOT/lambda"

do_zip() {
    local OUT="$1"
    local SRC="$2"
    rm -f "$OUT"
    if command -v zip > /dev/null 2>&1; then
        zip -r "$OUT" "$SRC" > /dev/null 2>&1
    else
        local ABS_OUT ABS_SRC
        ABS_OUT="$(pwd)/$OUT"
        ABS_SRC="$(pwd)/$SRC"
        WIN_OUT=$(cygpath -w "$ABS_OUT")
        WIN_SRC=$(cygpath -w "$ABS_SRC")
        powershell.exe -NoProfile -Command \
            "Compress-Archive -Path '$WIN_SRC' -DestinationPath '$WIN_OUT' -Force" \
            > /dev/null 2>&1
    fi
}

echo "Packaging api-handler..."
cd "$LAMBDA_DIR/api-handler"
do_zip ../api-handler.zip index.js

echo "Packaging event-handler..."
cd "$LAMBDA_DIR/event-handler"
do_zip ../event-handler.zip index.js

cd "$LAMBDA_DIR"

echo "Updating api-handler function code..."
aws lambda update-function-code \
    --function-name incident-reporter-api-handler \
    --zip-file fileb://api-handler.zip > /dev/null

echo "Updating event-handler function code..."
aws lambda update-function-code \
    --function-name incident-reporter-event-handler \
    --zip-file fileb://event-handler.zip > /dev/null

echo -e "\033[0;32m✅ Fast deploy complete in 2 seconds!\033[0m"
