#!/usr/bin/env bash
# ==============================================================================
# CloudGallery - Root Deployment Runner
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "$SCRIPT_DIR/backend/deploy.sh"
"$SCRIPT_DIR/backend/deploy.sh" "$@"
