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

        return $this->json([
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

        $message = (string)$this->filter('message', 'str');
        $mode = (string)$this->filter('mode', 'str');
        if (!in_array($mode, ['ai', 'hybrid'], true)) $mode = 'ai';

        $maxChars = max(500, min(50000, (int)(\XF::options()->warextSpellAiMaxChars ?? 8000)));
        if (mb_strlen($message, 'UTF-8') > $maxChars)
        {
            $message = mb_substr($message, 0, $maxChars, 'UTF-8');
        }

        $localRaw = (string)$this->filter('local_context', 'str');
        $local = [];
        if ($localRaw !== '')
        {
            $decoded = json_decode($localRaw, true);
            if (is_array($decoded)) $local = $decoded;
        }

        $result = (new AiGateway())->analyze($message, $local, $mode);

        return $this->json([
            'success' => !empty($result['available']),
            'result' => $result
        ]);
    }

    protected function json(array $data)
    {
        $reply = $this->app()->response();
        $reply->contentType('application/json');
        $reply->body(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $reply;
    }
}
