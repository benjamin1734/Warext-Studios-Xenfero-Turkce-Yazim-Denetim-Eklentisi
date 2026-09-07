import hashlib
import json
import os
import shutil
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'upload'
ADDON_JSON = SOURCE / 'src/addons/Warext/TurkishSpellCheck/addon.json'
ADDON = json.loads(ADDON_JSON.read_text(encoding='utf-8'))
VERSION = str(ADDON['version_string'])
VERSION_ID = int(ADDON['version_id'])
FULL_ZIP = ROOT / f'Warext-Turkce-Yazim-Denetimi-V{VERSION}-XenForo.zip'
OUTPUT = ROOT / f'Warext-Turkce-Yazim-Denetimi-V{VERSION}-XenForo-COMPACT.zip'
REF = os.environ.get('GITHUB_SHA') or 'main'
FULL_URL = f'https://raw.githubusercontent.com/benjamin1734/Warext-Studios-Xenfero-Turkce-Yazim-Denetim-Eklentisi/{REF}/{FULL_ZIP.name}'

if not SOURCE.is_dir() or not FULL_ZIP.is_file():
    raise SystemExit(f'Kaynak upload dizini veya tam V{VERSION} ZIP bulunamadı.')

full_sha256 = hashlib.sha256(FULL_ZIP.read_bytes()).hexdigest()

with tempfile.TemporaryDirectory(prefix='wtsc-compact-') as temp_dir:
    stage_root = Path(temp_dir)
    stage_upload = stage_root / 'upload'
    shutil.copytree(SOURCE, stage_upload)
    runtime = stage_upload / 'js/warext/turkish-spellcheck'
    if runtime.exists():
        shutil.rmtree(runtime)

    setup_path = stage_upload / 'src/addons/Warext/TurkishSpellCheck/Setup.php'
    setup = setup_path.read_text(encoding='utf-8')
    marker = '    public function uninstallStep1(): void\n'
    if marker not in setup:
        raise SystemExit('Setup.php ekleme noktası bulunamadı.')

    block = f'''    public function installStep3(): void
    {{
        $this->installRuntimeAssets();
    }}

    public function upgrade{VERSION_ID}Step1(): void
    {{
        $this->installRuntimeAssets();
    }}

    protected function installRuntimeAssets(): void
    {{
        $url = '{FULL_URL}';
        $expectedSha256 = '{full_sha256}';
        $temporaryFile = tempnam(sys_get_temp_dir(), 'wtsc_');
        if (!$temporaryFile)
        {{
            throw new \\RuntimeException('Yazım denetimi veri paketi için geçici dosya oluşturulamadı.');
        }}

        try
        {{
            $client = \\XF::app()->http()->client();
            $response = $client->request('GET', $url, [
                'sink' => $temporaryFile,
                'timeout' => 90,
                'connect_timeout' => 20,
                'headers' => ['User-Agent' => 'Warext-TurkishSpellCheck/{VERSION}']
            ]);
            if ((int)$response->getStatusCode() !== 200)
            {{
                throw new \\RuntimeException('Yazım denetimi veri paketi indirilemedi. HTTP ' . $response->getStatusCode());
            }}
            $actualSha256 = hash_file('sha256', $temporaryFile);
            if (!$actualSha256 || !hash_equals($expectedSha256, $actualSha256))
            {{
                throw new \\RuntimeException('Yazım denetimi veri paketi bütünlük doğrulamasından geçemedi.');
            }}

            $archive = new \\ZipArchive();
            if ($archive->open($temporaryFile) !== true)
            {{
                throw new \\RuntimeException('Yazım denetimi veri paketi açılamadı.');
            }}

            $prefix = 'upload/js/warext/turkish-spellcheck/';
            $root = rtrim(\\XF::getRootDirectory(), DIRECTORY_SEPARATOR);
            $written = 0;
            try
            {{
                for ($i = 0; $i < $archive->numFiles; $i++)
                {{
                    $name = $archive->getNameIndex($i);
                    if (!is_string($name) || strncmp($name, $prefix, strlen($prefix)) !== 0 || substr($name, -1) === '/')
                    {{
                        continue;
                    }}
                    $relative = substr($name, strlen('upload/'));
                    if ($relative === '' || strpos($relative, '..') !== false || strpbrk($relative, "\\0\\r\\n") !== false)
                    {{
                        throw new \\RuntimeException('Veri paketinde güvensiz dosya yolu algılandı.');
                    }}
                    $target = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
                    $directory = dirname($target);
                    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory))
                    {{
                        throw new \\RuntimeException('Yazım denetimi çalışma zamanı dizini oluşturulamadı.');
                    }}
                    $data = $archive->getFromIndex($i);
                    if ($data === false || file_put_contents($target, $data, LOCK_EX) === false)
                    {{
                        throw new \\RuntimeException('Yazım denetimi çalışma zamanı dosyası yazılamadı: ' . $relative);
                    }}
                    $written++;
                }}
            }}
            finally
            {{
                $archive->close();
            }}
            if ($written < 30)
            {{
                throw new \\RuntimeException('Yazım denetimi çalışma zamanı paketi eksik görünüyor.');
            }}
        }}
        catch (\\Throwable $error)
        {{
            throw new \\RuntimeException('Warext Türkçe Yazım Denetimi kurulumu tamamlanamadı: ' . $error->getMessage(), 0, $error);
        }}
        finally
        {{
            if (is_file($temporaryFile))
            {{
                @unlink($temporaryFile);
            }}
        }}
    }}

'''
    setup_path.write_text(setup.replace(marker, block + marker, 1), encoding='utf-8')

    hashes_path = stage_upload / 'src/addons/Warext/TurkishSpellCheck/hashes.json'
    hashes = {}
    for path in sorted(stage_upload.rglob('*')):
        if path.is_file() and path != hashes_path:
            hashes[path.relative_to(stage_upload).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    hashes_path.write_text(json.dumps(hashes, ensure_ascii=False, indent=4) + '\n', encoding='utf-8')

    if OUTPUT.exists():
        OUTPUT.unlink()
    fixed = (2026, 9, 7, 0, 0, 0)
    with zipfile.ZipFile(OUTPUT, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(stage_upload.rglob('*')):
            if not path.is_file():
                continue
            arcname = Path('upload') / path.relative_to(stage_upload)
            info = zipfile.ZipInfo(arcname.as_posix(), fixed)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        license_path = ROOT / 'LICENSE'
        info = zipfile.ZipInfo('LICENSE', fixed)
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, license_path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)

with zipfile.ZipFile(OUTPUT) as archive:
    if archive.testzip() is not None:
        raise SystemExit('Compact ZIP bütünlük testi başarısız.')
    names = set(archive.namelist())
    required = {
        'upload/src/addons/Warext/TurkishSpellCheck/addon.json',
        'upload/src/addons/Warext/TurkishSpellCheck/Setup.php',
        'upload/src/addons/Warext/TurkishSpellCheck/hashes.json',
        'upload/src/addons/Warext/TurkishSpellCheck/_data/template_modifications.xml'
    }
    missing = required - names
    if missing:
        raise SystemExit('Compact ZIP zorunlu dosya eksik: ' + ', '.join(sorted(missing)))
    if any(name.startswith('upload/js/warext/turkish-spellcheck/') for name in names):
        raise SystemExit('Compact ZIP içine büyük runtime yanlışlıkla girdi.')

size = OUTPUT.stat().st_size
if size > 1_000_000:
    raise SystemExit(f'Compact ZIP 1 MB hedefini aştı: {size} bayt')
print(f'{OUTPUT.name}: {size} bayt')
print(f'Tam veri ZIP SHA-256: {full_sha256}')