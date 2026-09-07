#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(python3 - "$ROOT" <<'PY'
import json
import sys
from pathlib import Path
root=Path(sys.argv[1])
data=json.loads((root/'upload/src/addons/Warext/TurkishSpellCheck/addon.json').read_text(encoding='utf-8'))
print(data['version_string'])
PY
)"
PACKAGE="Warext-Turkce-Yazim-Denetimi-V${VERSION}-XenForo.zip"
RUNTIME="$ROOT/upload/js/warext/turkish-spellcheck"
ADDON="$ROOT/upload/src/addons/Warext/TurkishSpellCheck"

python3 - "$ROOT" <<'PY'
import hashlib
import json
import sys
from pathlib import Path
root=Path(sys.argv[1])/'upload'
target=root/'src/addons/Warext/TurkishSpellCheck/hashes.json'
hashes={}
for path in sorted(root.rglob('*')):
    if not path.is_file() or path == target:
        continue
    hashes[path.relative_to(root).as_posix()]=hashlib.sha256(path.read_bytes()).hexdigest()
target.write_text(json.dumps(hashes,ensure_ascii=False,indent=4)+'\n',encoding='utf-8')
PY

while IFS= read -r -d '' file; do node --check "$file"; done < <(find "$RUNTIME" -type f -name '*.js' -print0 | sort -z)
while IFS= read -r -d '' file; do php -l "$file"; done < <(find "$ADDON" -type f -name '*.php' -print0 | sort -z)
while IFS= read -r -d '' file; do bash -n "$file"; done < <(find "$ROOT/tools" -type f -name '*.sh' -print0 | sort -z)
while IFS= read -r -d '' file; do python3 -m py_compile "$file"; done < <(find "$ROOT/tools" -type f -name '*.py' -print0 | sort -z)
find "$ROOT" -type d -name '__pycache__' -prune -exec rm -rf {} +

WAREXT_FULL_BUILD=1 node "$ROOT/tests/dictionary-smoke.js"
node "$ROOT/tests/rules-regression.js"
WAREXT_FULL_BUILD=1 node "$ROOT/tests/v1-language-regression.js"
node "$ROOT/tests/v1-textcore-regression.js"
node "$ROOT/tests/v110-advanced-regression.js"
WAREXT_FULL_BUILD=1 node "$ROOT/tests/v120-semantic-regression.js"
WAREXT_FULL_BUILD=1 node "$ROOT/tests/v130-semantic-regression.js"
WAREXT_FULL_BUILD=1 node "$ROOT/tests/v200-nlp-regression.js"
WAREXT_FULL_BUILD=1 node "$ROOT/tests/v210-quality-regression.js"
NODE_OPTIONS="--require $ROOT/tests/v220-preload.js" node "$ROOT/tests/v220-syntax-quality-regression.js"
node "$ROOT/tests/longtext-regression.js"
node "$ROOT/tests/v300-semantic-document-regression.js"
node "$ROOT/tests/v310-semantic-reasoning-regression.js"
node "$ROOT/tests/v311-semantic-benchmark.js"
node "$ROOT/tests/v311-document-performance-contract.js"
node "$ROOT/tests/v312-contextual-orthography-regression.js"

python3 "$ROOT/tools/final_audit.py" "$ROOT"

find "$ROOT" -maxdepth 1 -type f -name 'Warext-Turkce-Yazim-Denetimi-V*-XenForo.zip' -delete
cd "$ROOT"
zip -qr "$PACKAGE" upload LICENSE
unzip -tq "$PACKAGE"
python3 "$ROOT/tools/final_audit.py" "$ROOT" --package "$PACKAGE"
printf '%s  %s\n' "$(sha256sum "$PACKAGE" | awk '{print $1}')" "$PACKAGE"
printf '%s\n' "$PACKAGE hazırlandı."
