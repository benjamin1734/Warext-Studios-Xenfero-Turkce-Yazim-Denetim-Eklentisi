import argparse
import hashlib
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

VERSION_STRING = '1.0.5'
VERSION_ID = 5300075
PACKAGE_NAME = 'Warext-Turkce-Yazim-Denetimi-V1.0.5-XenForo.zip'
ADDON_REL = Path('src/addons/Warext/TurkishSpellCheck')
RUNTIME_REL = Path('js/warext/turkish-spellcheck')
TEXT_SUFFIXES = {'.php', '.js', '.py', '.sh', '.json', '.xml', '.yml', '.yaml', '.md', '.txt', '.gitignore'}
SKIP_DIRS = {'.git', '__pycache__'}
RUNTIME_FORBIDDEN = re.compile(r'https?://|WebSocket|EventSource|sendBeacon|axios|\.ajax\s*\(', re.I)
SOURCE_COMMENT = re.compile(r'^\s*(?://|/\*|\*)')
PY_COMMENT = re.compile(r'^\s*#(?!\!)')


def fail(message):
    raise SystemExit(message)


def read_text(path):
    try:
        return path.read_text(encoding='utf-8')
    except UnicodeDecodeError as exc:
        fail(f'UTF-8 olmayan metin dosyası: {path}: {exc}')


def parse_json(path):
    try:
        return json.loads(read_text(path))
    except json.JSONDecodeError as exc:
        fail(f'JSON geçersiz: {path}: {exc}')


def parse_xml(path):
    try:
        return ET.parse(path)
    except ET.ParseError as exc:
        fail(f'XML geçersiz: {path}: {exc}')


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def is_text(path):
    return path.suffix.lower() in TEXT_SUFFIXES or path.name == '.gitignore'


def check_comments(path, text):
    suffix = path.suffix.lower()
    for number, line in enumerate(text.splitlines(), 1):
        if suffix in {'.js', '.php'} and SOURCE_COMMENT.match(line):
            fail(f'Kod yorum satırı bulundu: {path}:{number}')
        if suffix == '.py' and PY_COMMENT.match(line):
            fail(f'Python yorum satırı bulundu: {path}:{number}')


def check_addon(root):
    addon_root = root / 'upload' / ADDON_REL
    addon = parse_json(addon_root / 'addon.json')
    if addon.get('version_string') != VERSION_STRING or int(addon.get('version_id', 0)) != VERSION_ID:
        fail('addon.json sürümü geçersiz')
    if addon.get('title') != 'Warext Studios | Türkçe Yazım Denetimi':
        fail('Eklenti başlığı geçersiz')
    if int(addon.get('require', {}).get('XF', [0])[0]) < 2030070:
        fail('XenForo 2.3 gereksinimi eksik')
    setup = read_text(addon_root / 'Setup.php')
    if '@unlink' in setup or 'glob($directory' in setup:
        fail('Yükseltmede çalışma zamanı dosyası silen kod bulundu')
    if 'xf_warext_spell_cache' not in setup or 'xf_warext_spell_feedback' not in setup:
        fail('Kurulum tablo tanımları eksik')
    data_root = addon_root / '_data'
    for path in sorted(data_root.rglob('*.xml')):
        parse_xml(path)
    routes = parse_xml(data_root / 'routes.xml').getroot()
    for route in routes.findall('route'):
        controller = route.attrib.get('controller', '')
        route_type = route.attrib.get('route_type', '')
        if ':' not in controller:
            fail(f'Geçersiz controller rotası: {controller}')
        addon_id, name = controller.split(':', 1)
        if addon_id != 'Warext\\TurkishSpellCheck' or not name:
            fail(f'Beklenmeyen controller rotası: {controller}')
        area = 'Admin' if route_type == 'admin' else 'Pub'
        controller_path = addon_root / area / 'Controller' / f'{name}.php'
        if not controller_path.is_file():
            fail(f'Route controller dosyası eksik: {controller_path}')
    options_root = parse_xml(data_root / 'options.xml').getroot()
    phrases_root = parse_xml(data_root / 'phrases.xml').getroot()
    option_ids = {node.attrib.get('option_id', '') for node in options_root.findall('option')}
    phrase_titles = {node.attrib.get('title', '') for node in phrases_root.findall('phrase')}
    for option_id in option_ids:
        if not option_id:
            fail('Boş option_id bulundu')
        if f'option_{option_id}' not in phrase_titles or f'option_{option_id}_explain' not in phrase_titles:
            fail(f'Option phrase eksik: {option_id}')
    template = read_text(data_root / 'template_modifications.xml')
    referenced = set(re.findall(r'\$xf\.options\.([A-Za-z0-9_]+)', template))
    missing = sorted(referenced - option_ids)
    if missing:
        fail('Template içinde tanımsız option bulundu: ' + ', '.join(missing))
    if template.count('?wtsc=3121') < 2:
        fail('V3.1.2 önbellek kırıcı template bağlantısı eksik')
    if "link('warext-spell-feedback')" not in template:
        fail('Yerel geri bildirim route bağlantısı eksik')


def check_runtime(root):
    runtime = root / 'upload' / RUNTIME_REL
    bootstrap_path = runtime / 'bootstrap-v110.js'
    bootstrap = read_text(bootstrap_path)
    if "const VERSION = '1.0.5';" not in bootstrap or "const ASSET_VERSION = '3121';" not in bootstrap:
        fail('Bootstrap sürümü geçersiz')
    if "dataset.wtscSemantic = 'v312'" not in bootstrap:
        fail('V3.1.2 çalışma zamanı işareti eksik')
    required = {
        'text-core-v110.js', 'lexicon-v200.js', 'dictionary-v110.js', 'corrections-v110.js', 'language-v110.js',
        'semantic-v110.js', 'semantic-deep-v110.js', 'semantic-context-v110.js', 'entities-v200.js', 'idioms-v200.js',
        'lm-v200.js', 'micro-model-v200.js', 'knowledge-v200.js', 'micro-integration-v200.js', 'learning-v200.js',
        'quality-v210.js', 'quality-v220.js', 'syntax-v220.js', 'syntax-tuning-v220.js', 'semantic-ui-v110.js',
        'context-v230.js', 'context-tuning-v231.js', 'semantic-model-v300.js', 'semantic-knowledge-v310.js', 'runtime-v240.js',
        'semantic-document-v300.js', 'semantic-tuning-v301.js', 'semantic-tuning-v302.js', 'semantic-reasoning-v310.js',
        'semantic-reasoning-tuning-v311.js', 'contextual-orthography-v312.js', 'integration-v105.js', 'editor-v110.js',
        'longtext-v110.js', 'document-v300.js'
    }
    loaded = set(re.findall(r"loadScript\('([^']+\.js)'", bootstrap))
    disk = {path.name for path in runtime.glob('*.js') if path.name != 'bootstrap-v110.js'}
    missing = sorted(required - disk)
    if missing:
        fail('Zorunlu runtime dosyası eksik: ' + ', '.join(missing))
    not_loaded = sorted(required - loaded)
    if not_loaded:
        fail('Zorunlu runtime dosyası bootstrap tarafından yüklenmiyor: ' + ', '.join(not_loaded))
    orphan = sorted(disk - loaded)
    if orphan:
        fail('Bootstrap tarafından yüklenmeyen runtime JS bulundu: ' + ', '.join(orphan))
    for path in sorted(runtime.glob('*.js')):
        text = read_text(path)
        match = RUNTIME_FORBIDDEN.search(text)
        if match:
            fail(f'Harici runtime ağ kullanımı bulundu: {path}: {match.group(0)}')
        if re.search(r'fetch\s*\(', text) and path.name != 'learning-v200.js':
            fail(f'İzin verilmeyen runtime fetch çağrısı: {path}')
    learning = read_text(runtime / 'learning-v200.js')
    if "credentials:'same-origin'" not in learning or "body.set('_xfToken'" not in learning:
        fail('Yerel same-origin geri bildirim güvenliği eksik')
    semantic = read_text(runtime / 'semantic-reasoning-v310.js')
    for marker in ['externalDependencies:0', 'propositionGraph:true', 'entityMemory:true', 'coreferenceResolution:true', 'stateLedger:true', 'selectionalSemantics:true', 'causalKnowledgeBase:true']:
        if marker not in semantic:
            fail(f'V3.1 anlam motoru özelliği eksik: {marker}')
    tuning = read_text(runtime / 'semantic-reasoning-tuning-v311.js')
    for marker in ['externalDependencies:0', 'hypotheticalAssertionsExcluded:true', 'entityScopedTransitions:true', 'ambiguousPronounCalibration:true']:
        if marker not in tuning:
            fail(f'V3.1.1 kalibrasyon özelliği eksik: {marker}')
    orthography = read_text(runtime / 'contextual-orthography-v312.js')
    for marker in ['externalDependencies:0', 'contextualDoubleVowelRepair:true', 'genitivePossessiveRepair:true', 'localLanguageModelOrthography:true']:
        if marker not in orthography:
            fail(f'V3.1.2 bağlamsal yazım özelliği eksik: {marker}')


def check_resources(root):
    resources = root / 'upload' / ADDON_REL / 'Resources'
    required = {
        'dictionary-stats.json', 'entity-stats.json', 'idiom-stats.json', 'lm-stats.json', 'micro-model-stats.json',
        'THIRD_PARTY_DATA.txt', 'LICENSE-MPL-2.0.txt', 'LICENSE-TURKISH-DICTIONARY-MIT.txt', 'LICENSE-TURKISH-DIALOGUES-CC-BY-4.0.txt'
    }
    missing = sorted(name for name in required if not (resources / name).is_file())
    if missing:
        fail('Kaynak/lisans dosyaları eksik: ' + ', '.join(missing))
    stats = parse_json(resources / 'dictionary-stats.json')
    entities = parse_json(resources / 'entity-stats.json')
    idioms = parse_json(resources / 'idiom-stats.json')
    lm = parse_json(resources / 'lm-stats.json')
    micro = parse_json(resources / 'micro-model-stats.json')
    if int(stats.get('estimatedValidWords', 0)) < 250000:
        fail('Sözlük kapsamı beklenen tabanın altında')
    if int(entities.get('locationNames', 0)) < 100000:
        fail('Yer adı indeksi beklenen tabanın altında')
    if int(idioms.get('idioms', 0)) < 500:
        fail('Deyim verisi beklenen tabanın altında')
    if int(lm.get('bigrams', 0)) < 5000 or int(lm.get('trigrams', 0)) < 5000:
        fail('Yerel dil modeli beklenen tabanın altında')
    if int(micro.get('samples', 0)) < 5000 or float(micro.get('accuracy', 0)) < 0.8:
        fail('Yerel mikro model doğrulaması başarısız')


def expected_hashes(upload_root):
    hashes = {}
    target = upload_root / ADDON_REL / 'hashes.json'
    for path in sorted(upload_root.rglob('*')):
        if not path.is_file() or path == target:
            continue
        hashes[path.relative_to(upload_root).as_posix()] = sha256_bytes(path.read_bytes())
    return hashes


def check_hashes(root):
    upload_root = root / 'upload'
    target = upload_root / ADDON_REL / 'hashes.json'
    if not target.is_file():
        fail('hashes.json eksik')
    actual = parse_json(target)
    expected = expected_hashes(upload_root)
    if actual != expected:
        missing = sorted(set(expected) - set(actual))[:8]
        extra = sorted(set(actual) - set(expected))[:8]
        wrong = sorted(key for key in set(actual) & set(expected) if actual[key] != expected[key])[:8]
        fail(f'hashes.json eşleşmiyor; eksik={missing}, fazla={extra}, farklı={wrong}')


def check_package(root, package_path):
    package = Path(package_path)
    if not package.is_absolute():
        package = root / package
    if package.name != PACKAGE_NAME or not package.is_file():
        fail('Nihai XenForo ZIP paketi bulunamadı')
    with zipfile.ZipFile(package) as archive:
        bad = archive.testzip()
        if bad:
            fail(f'ZIP bozuk dosya içeriyor: {bad}')
        names = set(archive.namelist())
        required = {
            'LICENSE',
            'upload/src/addons/Warext/TurkishSpellCheck/addon.json',
            'upload/src/addons/Warext/TurkishSpellCheck/Setup.php',
            'upload/src/addons/Warext/TurkishSpellCheck/hashes.json',
            'upload/js/warext/turkish-spellcheck/bootstrap-v110.js',
            'upload/js/warext/turkish-spellcheck/semantic-knowledge-v310.js',
            'upload/js/warext/turkish-spellcheck/semantic-reasoning-v310.js',
            'upload/js/warext/turkish-spellcheck/semantic-reasoning-tuning-v311.js',
            'upload/js/warext/turkish-spellcheck/contextual-orthography-v312.js'
        }
        missing = sorted(required - names)
        if missing:
            fail('ZIP zorunlu dosyaları eksik: ' + ', '.join(missing))
        for name in names:
            parts = Path(name).parts
            if name.startswith('/') or '..' in parts:
                fail(f'ZIP içinde güvensiz yol bulundu: {name}')
            if name.startswith(('source/', 'tools/', 'tests/', '.github/', 'release/')):
                fail(f'ZIP geliştirme dosyası içeriyor: {name}')
        addon = json.loads(archive.read('upload/src/addons/Warext/TurkishSpellCheck/addon.json').decode('utf-8'))
        if addon.get('version_string') != VERSION_STRING or int(addon.get('version_id', 0)) != VERSION_ID:
            fail('ZIP içindeki addon.json sürümü geçersiz')
        hashes = json.loads(archive.read('upload/src/addons/Warext/TurkishSpellCheck/hashes.json').decode('utf-8'))
        expected = {}
        for name in sorted(names):
            if not name.startswith('upload/') or name.endswith('/') or name == 'upload/src/addons/Warext/TurkishSpellCheck/hashes.json':
                continue
            expected[name[len('upload/'):]] = sha256_bytes(archive.read(name))
        if hashes != expected:
            fail('ZIP içindeki hashes.json paket içeriğiyle eşleşmiyor')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('root', nargs='?', default='.')
    parser.add_argument('--package', default='')
    args = parser.parse_args()
    root = Path(args.root).resolve()
    scanned = 0
    for path in sorted(root.rglob('*')):
        if not path.is_file() or any(part in SKIP_DIRS for part in path.parts) or path.suffix.lower() == '.zip':
            continue
        relative = path.relative_to(root)
        if not is_text(relative):
            continue
        text = read_text(path)
        scanned += 1
        check_comments(relative, text)
        if path.suffix.lower() == '.json':
            parse_json(path)
        elif path.suffix.lower() == '.xml':
            parse_xml(path)
    check_addon(root)
    check_runtime(root)
    check_resources(root)
    check_hashes(root)
    if args.package:
        check_package(root, args.package)
    print(json.dumps({'release':VERSION_STRING,'filesScanned':scanned,'runtimeExternalDependencies':0,'semanticEngine':'v312','status':'ok'}, ensure_ascii=False, separators=(',', ':')))


if __name__ == '__main__':
    main()