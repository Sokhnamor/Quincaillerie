<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Default values used when a setting has never been saved
     */
    public const DEFAULTS = [
        'company_name' => 'Quincaillerie Pro',
        'company_address' => 'Dakar, Sénégal',
        'company_phone' => '+221 00 000 00 00',
        'company_email' => 'contact@quincaillerie.sn',
        'company_ninea' => '',
        'company_rccm' => '',
        'currency' => 'FCFA',
        'tax_rate' => '18',
        // ticket (80 mm receipt), a5 or a4
        'invoice_format' => 'ticket',
        'invoice_footer' => 'Merci pour votre confiance. Les marchandises vendues ne sont ni reprises ni échangées.',
    ];

    public static function allValues(): array
    {
        return Cache::rememberForever('settings.all', function () {
            $stored = static::query()->pluck('value', 'key')->all();

            return array_merge(static::DEFAULTS, array_intersect_key($stored, static::DEFAULTS));
        });
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return static::allValues()[$key] ?? $default;
    }

    public static function taxRate(): float
    {
        return (float) static::get('tax_rate', 18);
    }

    public static function setMany(array $values): void
    {
        foreach (array_intersect_key($values, static::DEFAULTS) as $key => $value) {
            static::updateOrCreate(['key' => $key], ['value' => $value ?? '']);
        }

        Cache::forget('settings.all');
    }
}
