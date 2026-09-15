<?php

namespace Warext\TurkishSpellCheck\Service;

class AiGateway
{
    public const CONTRACT_VERSION = 1;

    public function analyze(string $message, array $localContext = [], string $mode = 'ai', bool $includeModeration = false): array
    {
        $message = trim($message);
        if ($message === '') return $this->unavailable('empty_message');
        if (!in_array($mode, ['ai', 'hybrid'], true)) $mode = 'ai';

        $source = (string)(\XF::options()->warextSpellAiSource ?? 'auto');
        if (!in_array($source, ['auto', 'shared', 'standalone'], true)) $source = 'auto';

        if ($source !== 'standalone')
        {
            $shared = $this->sharedAnalyze($message, $localContext, $mode, $includeModeration);
            if (!empty($shared['available']) || $source === 'shared') return $shared;
        }

        return $this->standaloneAnalyze($message, $localContext, $mode);
    }

    public function capabilities(): array
    {
        $shared = class_exists('Warext\\AIContentInspector\\Service\\InteropGateway');
        $standalone = $this->standaloneConfigured();

        return [
            'contract' => self::CONTRACT_VERSION,
            'shared_available' => $shared,
            'standalone_available' => $standalone,
            'mode' => (string)(\XF::options()->warextSpellMode ?? 'local'),
            'source' => (string)(\XF::options()->warextSpellAiSource ?? 'auto')
        ];
    }

    protected function sharedAnalyze(string $message, array $localContext, string $mode, bool $includeModeration): array
    {
        if (!class_exists('Warext\\AIContentInspector\\Service\\InteropGateway'))
        {
            return $this->unavailable('shared_addon_unavailable', 'shared');
        }

        try
        {
            /** @var \Warext\AIContentInspector\Service\InteropGateway $gateway */
            $gateway = new \Warext\AIContentInspector\Service\InteropGateway();
            $capabilities = $gateway->capabilities();
            if (empty($capabilities['available']))
            {
                return $this->unavailable('shared_provider_unavailable', 'shared');
            }

            $tasks = $includeModeration ? ['moderation', 'writing'] : ['writing'];
            $result = $gateway->analyze($message, $localContext, [
                'writing_mode' => $mode,
                'tasks' => $tasks,
                'user_id' => (int)\XF::visitor()->user_id
            ]);

            return [
                'contract' => self::CONTRACT_VERSION,
                'available' => !empty($result['available']),
                'source' => 'shared',
                'provider' => $result['provider'] ?? [],
                'writing' => $this->normalizeWriting((array)($result['writing'] ?? []), $message),
                'moderation' => $includeModeration ? (array)($result['moderation'] ?? []) : [],
                'usage' => (array)($result['usage'] ?? []),
                'combined_request' => $includeModeration && !empty($result['combined_request']),
                'cache_hit' => !empty($result['cache_hit']),
                'reason' => (string)($result['reason'] ?? '')
            ];
        }
        catch (\Throwable $e)
        {
            \XF::logException($e, false, 'Warext Spell shared AI: ');
            return $this->unavailable('shared_request_failed', 'shared');
        }
    }

    protected function standaloneAnalyze(string $message, array $localContext, string $mode): array
    {
        if (!$this->standaloneConfigured())
        {
            return $this->unavailable('standalone_not_configured', 'standalone');
        }

        $options = \XF::options();
        $provider = (string)($options->warextSpellAiProvider ?? 'openai');
        $apiKey = trim((string)($options->warextSpellAiKey ?? ''));
        $model = trim((string)($options->warextSpellAiModel ?? 'gpt-5.6-luna'));
        $timeout = max(3, min(30, (int)($options->warextSpellAiTimeout ?? 10)));
        $maxChars = max(500, min(50000, (int)($options->warextSpellAiMaxChars ?? 8000)));
        if (mb_strlen($message, 'UTF-8') > $maxChars)
        {
            $message = mb_substr($message, 0, $maxChars, 'UTF-8');
        }

        $prompt = $this->systemPrompt($mode, $localContext);
        try
        {
            if ($provider === 'openai')
            {
                $raw = $this->requestOpenAi($message, $prompt, $apiKey, $model, $timeout);
            }
            else
            {
                $endpoint = $this->compatibleEndpoint($provider, (string)($options->warextSpellAiBaseUrl ?? ''));
                $raw = $this->requestCompatible($message, $prompt, $apiKey, $model, $timeout, $endpoint);
            }
        }
        catch (\Throwable $e)
        {
            \XF::logException($e, false, 'Warext Spell standalone AI: ');
            return $this->unavailable('request_failed', 'standalone');
        }

        $parsed = $this->parseJson((string)($raw['content'] ?? ''));
        if (!$parsed)
        {
            return $this->unavailable('invalid_json', 'standalone');
        }

        return [
            'contract' => self::CONTRACT_VERSION,
            'available' => true,
            'source' => 'standalone',
            'provider' => [
                'id' => $provider,
                'model' => (string)($raw['model'] ?? $model)
            ],
            'writing' => $this->normalizeWriting((array)($parsed['writing'] ?? $parsed), $message),
            'moderation' => [],
            'usage' => (array)($raw['usage'] ?? []),
            'combined_request' => false,
            'cache_hit' => false,
            'reason' => ''
        ];
    }

    protected function standaloneConfigured(): bool
    {
        $options = \XF::options();
        $provider = (string)($options->warextSpellAiProvider ?? 'openai');
        $model = trim((string)($options->warextSpellAiModel ?? ''));
        $key = trim((string)($options->warextSpellAiKey ?? ''));
        if (!in_array($provider, ['openai', 'openrouter', 'custom', 'ollama'], true) || $model === '') return false;
        if ($provider === 'ollama')
        {
            try { $this->compatibleEndpoint($provider, (string)($options->warextSpellAiBaseUrl ?? '')); return true; }
            catch (\Throwable) { return false; }
        }
        if ($key === '') return false;
        if ($provider === 'openai' || $provider === 'openrouter') return true;
        try { $this->compatibleEndpoint($provider, (string)($options->warextSpellAiBaseUrl ?? '')); return true; }
        catch (\Throwable) { return false; }
    }

    protected function compatibleEndpoint(string $provider, string $baseUrl): string
    {
        if ($provider === 'openrouter')
        {
            return 'https://openrouter.ai/api/v1/chat/completions';
        }

        $baseUrl = rtrim(trim($baseUrl), '/');
        if ($baseUrl === '') throw new \RuntimeException('AI base URL is empty.');
        $parts = parse_url($baseUrl);
        if (!is_array($parts)) throw new \RuntimeException('AI base URL is invalid.');
        $scheme = strtolower((string)($parts['scheme'] ?? ''));
        if (!in_array($scheme, ['http', 'https'], true) || empty($parts['host']))
        {
            throw new \RuntimeException('AI base URL must use HTTP or HTTPS.');
        }
        if (isset($parts['user']) || isset($parts['pass']))
        {
            throw new \RuntimeException('Embedded credentials are not allowed in AI base URL.');
        }
        if (preg_match('#/chat/completions$#i', $baseUrl)) return $baseUrl;
        return $baseUrl . '/chat/completions';
    }

    protected function requestOpenAi(string $message, string $prompt, string $apiKey, string $model, int $timeout): array
    {
        $response = \XF::app()->http()->client()->post('https://api.openai.com/v1/responses', [
            'headers' => [
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ],
            'json' => [
                'model' => $model,
                'instructions' => $prompt,
                'input' => $message,
                'max_output_tokens' => 700
            ],
            'timeout' => $timeout,
            'connect_timeout' => min(5, $timeout)
        ]);

        $data = json_decode((string)$response->getBody(), true);
        if (!is_array($data)) return [];
        $content = '';
        if (isset($data['output_text']) && is_string($data['output_text']))
        {
            $content = $data['output_text'];
        }
        else
        {
            foreach ((array)($data['output'] ?? []) as $output)
            {
                foreach ((array)($output['content'] ?? []) as $part)
                {
                    if (($part['type'] ?? '') === 'output_text' && is_string($part['text'] ?? null)) $content .= $part['text'];
                }
            }
        }
        $usage = (array)($data['usage'] ?? []);
        return [
            'content' => $content,
            'model' => (string)($data['model'] ?? $model),
            'usage' => [
                'prompt_tokens' => (int)($usage['input_tokens'] ?? 0),
                'completion_tokens' => (int)($usage['output_tokens'] ?? 0),
                'total_tokens' => (int)($usage['total_tokens'] ?? 0)
            ]
        ];
    }

    protected function requestCompatible(string $message, string $prompt, string $apiKey, string $model, int $timeout, string $endpoint): array
    {
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ];
        if ($apiKey !== '') $headers['Authorization'] = 'Bearer ' . $apiKey;

        $response = \XF::app()->http()->client()->post($endpoint, [
            'headers' => $headers,
            'json' => [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $prompt],
                    ['role' => 'user', 'content' => $message]
                ],
                'temperature' => 0.1,
                'max_tokens' => 700,
                'response_format' => ['type' => 'json_object']
            ],
            'timeout' => $timeout,
            'connect_timeout' => min(5, $timeout)
        ]);

        $data = json_decode((string)$response->getBody(), true);
        if (!is_array($data)) return [];
        $usage = (array)($data['usage'] ?? []);
        return [
            'content' => (string)($data['choices'][0]['message']['content'] ?? ''),
            'model' => (string)($data['model'] ?? $model),
            'usage' => [
                'prompt_tokens' => (int)($usage['prompt_tokens'] ?? $usage['input_tokens'] ?? 0),
                'completion_tokens' => (int)($usage['completion_tokens'] ?? $usage['output_tokens'] ?? 0),
                'total_tokens' => (int)($usage['total_tokens'] ?? 0)
            ]
        ];
    }

    protected function systemPrompt(string $mode, array $localContext): string
    {
        $prompt = 'Türkçe forum metni için muhafazakâr bir yazım denetmenisin. Anlamı, üslubu, teknik terimleri, kullanıcı adlarını, özel adları, kodu ve bilinçli gündelik dili gereksiz yere değiştirme. Yalnız açık yazım, ek/ayrı-bitişik yazım, büyük-küçük harf, noktalama, boşluk ve açık dilbilgisi hatalarını düzelt. Metni yeniden yazma. Her sorun için UTF-8 karakter start/end konumunu, original ve suggestion alanlarını ver. Emin olmadığın öneriyi verme.';

        if ($mode === 'hybrid')
        {
            $issues = array_slice((array)($localContext['issues'] ?? $localContext), 0, 16);
            $encoded = json_encode($issues, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (is_string($encoded) && $encoded !== '' && $encoded !== '[]')
            {
                $prompt .= ' Warext yerel motorunun adayları şunlar: ' . mb_substr($encoded, 0, 4500, 'UTF-8') . '. Bunları bağlama göre doğrula; yanlış pozitifleri çıkar, doğru olanları tercih et ve yerel motorun kaçırdığı açık sorunları ekle. Yerel adayla aynı sonucu onaylarsan local_supported=true yap.';
            }
        }

        $prompt .= ' Yalnız geçerli JSON döndür. Tam düzeltilmiş metni veya metnin yeniden yazılmış kopyasını döndürme. Şema: {"writing":{"issues":[{"start":0,"end":0,"original":"","suggestion":"","type":"spelling|punctuation|grammar|capitalization|spacing","reason":"","confidence":0-100,"local_supported":false}],"confidence":0-100}}.';
        return $prompt;
    }

    protected function normalizeWriting(array $writing, string $message): array
    {
        $length = mb_strlen($message, 'UTF-8');
        $issues = [];
        foreach ((array)($writing['issues'] ?? []) as $issue)
        {
            if (!is_array($issue)) continue;
            $start = max(0, min($length, (int)($issue['start'] ?? 0)));
            $end = max($start, min($length, (int)($issue['end'] ?? $start)));
            $suggestion = mb_substr(trim((string)($issue['suggestion'] ?? '')), 0, 240, 'UTF-8');
            if ($suggestion === '') continue;
            $original = mb_substr((string)($issue['original'] ?? ''), 0, 180, 'UTF-8');
            if ($original === '' && $end > $start) $original = mb_substr($message, $start, $end - $start, 'UTF-8');
            $issues[] = [
                'start' => $start,
                'end' => $end,
                'original' => $original,
                'suggestion' => $suggestion,
                'type' => mb_substr((string)($issue['type'] ?? 'writing'), 0, 60, 'UTF-8'),
                'reason' => mb_substr((string)($issue['reason'] ?? ''), 0, 220, 'UTF-8'),
                'confidence' => max(0, min(100, (int)($issue['confidence'] ?? 0))),
                'local_supported' => !empty($issue['local_supported'])
            ];
            if (count($issues) >= 20) break;
        }

        return [
            'issues' => $issues,
            'confidence' => max(0, min(100, (int)($writing['confidence'] ?? 0)))
        ];
    }

    protected function parseJson(string $content): array
    {
        $content = trim($content);
        $content = preg_replace('/^```(?:json)?\s*/i', '', $content) ?? $content;
        $content = preg_replace('/\s*```$/', '', $content) ?? $content;
        $decoded = json_decode($content, true);
        if (is_array($decoded)) return $decoded;
        $start = strpos($content, '{');
        $end = strrpos($content, '}');
        if ($start === false || $end === false || $end <= $start) return [];
        $decoded = json_decode(substr($content, $start, $end - $start + 1), true);
        return is_array($decoded) ? $decoded : [];
    }

    protected function unavailable(string $reason, string $source = 'standalone'): array
    {
        return [
            'contract' => self::CONTRACT_VERSION,
            'available' => false,
            'source' => $source,
            'reason' => $reason,
            'provider' => [],
            'writing' => [],
            'moderation' => [],
            'usage' => [],
            'combined_request' => false,
            'cache_hit' => false
        ];
    }
}
