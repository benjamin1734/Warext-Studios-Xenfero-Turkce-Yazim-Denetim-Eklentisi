import hashlib
import json
import shutil
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ADDON = json.loads((ROOT / 'upload/src/addons/Warext/TurkishSpellCheck/addon.json').read_text(encoding='utf-8'))
VERSION = str(ADDON['version_string'])
ARCHIVE = ROOT / f'Warext-Turkce-Yazim-Denetimi-V{VERSION}-XenForo-COMPACT.zip'

if not ARCHIVE.is_file():
    raise SystemExit('Compact ZIP bulunamadı.')

old_check = '''            if ($written < 30)\n            {\n                throw new \\RuntimeException('Yazım denetimi çalışma zamanı paketi eksik görünüyor.');\n            }'''
new_check = '''            $requiredRuntimeFiles = [\n                'bootstrap-v110.js',\n                'dictionary-v110.js',\n                'corrections-v110.js',\n                'lexicon-v200.js',\n                'entities-v200.js',\n                'lm-v200.js',\n                'idioms-v200.js',\n                'engine-v200.js',\n                'panel-v200.js',\n                'integration-v105.js'\n            ];\n            foreach ($requiredRuntimeFiles as $requiredRuntimeFile)\n            {\n                $requiredRuntimePath = $root . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'warext' . DIRECTORY_SEPARATOR . 'turkish-spellcheck' . DIRECTORY_SEPARATOR . $requiredRuntimeFile;\n                if (!is_file($requiredRuntimePath) || filesize($requiredRuntimePath) <= 0)\n                {\n                    throw new \\RuntimeException('Yazım denetimi çalışma zamanı paketi eksik: ' . $requiredRuntimeFile);\n                }\n            }'''

with tempfile.TemporaryDirectory(prefix='wtsc-compact-harden-') as temp_dir:
    stage = Path(temp_dir)
    with zipfile.ZipFile(ARCHIVE, 'r') as source:
        source.extractall(stage)

    setup_path = stage / 'upload/src/addons/Warext/TurkishSpellCheck/Setup.php'
    setup = setup_path.read_text(encoding='utf-8')
    if old_check not in setup:
        raise SystemExit('Setup.php çalışma zamanı doğrulama bloğu bulunamadı.')
    setup_path.write_text(setup.replace(old_check, new_check, 1), encoding='utf-8')

    upload_root = stage / 'upload'
    hashes_path = upload_root / 'src/addons/Warext/TurkishSpellCheck/hashes.json'
    hashes = {}
    for path in sorted(upload_root.rglob('*')):
        if path.is_file() and path != hashes_path:
            hashes[path.relative_to(upload_root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    hashes_path.write_text(json.dumps(hashes, ensure_ascii=False, indent=4) + '\n', encoding='utf-8')

    hardened = stage / 'hardened.zip'
    fixed = (2026, 9, 7, 0, 0, 0)
    with zipfile.ZipFile(hardened, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as target:
        for path in sorted(stage.rglob('*')):
            if not path.is_file() or path == hardened:
                continue
            arcname = path.relative_to(stage).as_posix()
            info = zipfile.ZipInfo(arcname, fixed)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            target.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)

    with zipfile.ZipFile(hardened, 'r') as check:
        bad = check.testzip()
        if bad is not None:
            raise SystemExit('Hardened ZIP bütünlük testi başarısız: ' + bad)
        if any(name.startswith('upload/js/warext/turkish-spellcheck/') for name in check.namelist()):
            raise SystemExit('Compact ZIP içine büyük runtime yanlışlıkla girdi.')

    if hardened.stat().st_size > 1_000_000:
        raise SystemExit(f'Hardened compact ZIP 1 MB hedefini aştı: {hardened.stat().st_size} bayt')
    shutil.copy2(hardened, ARCHIVE)

print(f'{ARCHIVE.name}: {ARCHIVE.stat().st_size} bayt (zorunlu runtime dosyaları tek tek doğrulanıyor)')