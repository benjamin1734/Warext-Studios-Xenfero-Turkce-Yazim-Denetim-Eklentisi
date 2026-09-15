<?php

namespace Warext\TurkishSpellCheck\Pub\Controller;

use Warext\TurkishSpellCheck\Service\AiGateway;
use XF\Pub\Controller\AbstractController;

class AiAssist extends AbstractController
{
    public function actionIndex()
    {
        if (!\XF::visitor()->user_id)
        {
            return $this->noPermission();
        }

        return $this->asJson([
            'success' => true,
            'capabilities' => (new AiGateway())->capabilities()
        ]);
    }

    public function actionAnalyze()
    {
        if (!\XF::visitor()->user_id)
        {
            return $this->noPermission();
        }

        $this->assertPostOnly();

        $options = \XF::options();
        $configuredMode = strtolower((string)($options->warextSpellMode ?? 'local'));
        if (empty($options->warextSpellAiEnabled) || !in_array($configuredMode, ['ai', 'hybrid'], true))
        {
            return $this->asJson([
                'success' => false,
                'result' => [
                    'available' => false,
                    'reason' => 'ai_mode_disabled',
                    'writing' => [],
                    'moderation' => []
                ]
            ]);
        }

        $message = trim((string)$this->filter('message', 'str'));
        $mode = $configuredMode;
        $includeModeration = (bool)$this->filter('include_moderation', 'bool');

        $maxChars = max(500, min(50000, (int)($options->warextSpellAiMaxChars ?? 8000)));
        if (mb_strlen($message, 'UTF-8') > $maxChars)
        {
            $message = mb_substr($message, 0, $maxChars, 'UTF-8');
            $includeModeration = false;
        }

        $localRaw = (string)$this->filter('local_context', 'str');
        $local = [];
        if ($localRaw !== '')
        {
            $decoded = json_decode($localRaw, true);
            if (is_array($decoded)) $local = $decoded;
        }

        $result = (new AiGateway())->analyze($message, $local, $mode, $includeModeration);

        return $this->asJson([
            'success' => !empty($result['available']),
            'result' => $result
        ]);
    }

    protected function asJson(array $params)
    {
        $this->setResponseType('json');
        $reply = $this->view('Warext\\TurkishSpellCheck:Json', '', []);
        $reply->setJsonParams($params);
        return $reply;
    }
}
