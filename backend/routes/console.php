<?php

use Illuminate\Support\Facades\Schedule;

// Sauvegarde automatique chaque soir (nécessite `php artisan schedule:work`
// ou une tâche planifiée Windows qui lance `php artisan schedule:run` chaque minute)
Schedule::command('app:backup')->dailyAt('21:00')->withoutOverlapping();
