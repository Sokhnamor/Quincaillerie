<?php

return [
    /*
    | "rules"  : assistant hors ligne à base de règles (gratuit, par défaut)
    | "claude" : assistant IA Claude (nécessite ANTHROPIC_API_KEY)
    | Sans clé API, le mode "claude" retombe automatiquement sur "rules".
    */
    'driver' => env('ASSISTANT_DRIVER', 'rules'),

    'anthropic_key' => env('ANTHROPIC_API_KEY'),

    'model' => env('ASSISTANT_MODEL', 'claude-opus-5'),

    // Leave empty to use the official Anthropic API
    'base_url' => env('ANTHROPIC_BASE_URL'),

    // Questions per user per minute (protects the API bill)
    'rate_limit' => (int) env('ASSISTANT_RATE_LIMIT', 20),
];
