<?php

namespace App\Services\Assistant;

use App\Models\User;

/**
 * Entry point of the assistant. Picks the driver from config('assistant.driver'):
 *  - "rules"  : offline keyword engine (default, free)
 *  - "claude" : Claude via the Anthropic API, when ANTHROPIC_API_KEY is set
 * Every driver answers with the same shape and reads data through AssistantTools.
 */
class AssistantService
{
    public function answer(User $user, string $message, array $history = []): array
    {
        $tools = new AssistantTools($user);
        $rules = new RulesAssistant($tools);

        if ($this->llmEnabled()) {
            try {
                return app(ClaudeAssistant::class, ['tools' => $tools])->answer($message, $history, $rules->suggestions());
            } catch (\Throwable $e) {
                report($e);
                // Never leave the user without an answer: fall back to the offline engine
                $answer = $rules->answer($message);
                $answer['notice'] = 'Assistant IA indisponible pour le moment : réponse du mode hors ligne.';

                return $answer;
            }
        }

        return $rules->answer($message);
    }

    public function welcome(User $user): array
    {
        $tools = new AssistantTools($user);

        return [
            'mode' => $this->llmEnabled() ? 'claude' : 'rules',
            'insights' => $tools->insights(),
            'suggestions' => (new RulesAssistant($tools))->suggestions(),
        ];
    }

    public function llmEnabled(): bool
    {
        return config('assistant.driver') === 'claude' && filled(config('assistant.anthropic_key'));
    }
}
