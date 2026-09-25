<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;

    public const TYPES = ['particulier', 'professionnel'];

    protected $fillable = ['name', 'type', 'phone', 'email', 'address', 'city', 'credit_limit'];

    protected $casts = [
        'credit_limit' => 'decimal:2',
    ];

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    /**
     * Amount the client still owes across all sales
     */
    public function balanceDue(): float
    {
        return (float) $this->sales()
            ->where('status', '!=', 'paid')
            ->selectRaw('COALESCE(SUM(total - returned_amount - paid_amount), 0) as due')
            ->value('due');
    }
}
