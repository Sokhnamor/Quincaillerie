<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashClosing extends Model
{
    protected $fillable = [
        'user_id', 'business_date', 'sales_count', 'sales_total', 'returns_total',
        'collected_by_method', 'expected_cash', 'counted_cash', 'difference', 'notes',
    ];

    protected $casts = [
        'business_date' => 'date:Y-m-d',
        'collected_by_method' => 'array',
        'sales_total' => 'decimal:2',
        'returns_total' => 'decimal:2',
        'expected_cash' => 'decimal:2',
        'counted_cash' => 'decimal:2',
        'difference' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
