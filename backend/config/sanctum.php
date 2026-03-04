<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | This option will configure which domains will receive stateful api
    | authentication cookies. The domains that will receive the cookies
    | will be determined by the web middleware.
    |
    */

    'stateful' => [],

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    |
    | This option will configure which guard will be utilized when
    | Sanctum is validating incoming requests.
    |
    */

    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    |
    | This option controls the number of minutes until an issued token will be
    | considered expired. This feature prevents tokens from being used
    | after their expiration. You may change this as needed.
    |
    */

    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    |
    | Sanctum can prefix tokens when issuing them to make them identifiable
    | when checking headers. You can use any string as a prefix but
    | you should make it unique to avoid any collisions.
    |
    */

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    |
    | This option will add the Sanctum middleware to your application's
    | middleware stack. You may change the middleware as needed.
    |
    */

    'middleware' => [],

];

