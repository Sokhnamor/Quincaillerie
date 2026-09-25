<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quote extends Model
{
    public const STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'converted'];

    protected $fillable = [
        'number', 'client_id', 'client_name', 'user_id', 'subtotal', 'tax_rate', 'tax_amount',
        'discount', 'total', 'status', 'valid_until', 'notes', 'sale_id',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'valid_until' => 'date:Y-m-d',
    ];

    protected $appends = ['is_expired', 'customer_name'];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuoteItem::class);
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->valid_until !== null
            && $this->valid_until->copy()->endOfDay()->isPast()
            && !in_array($this->status, ['converted', 'rejected'], true);
    }

    public function getCustomerNameAttribute(): string
    {
        return $this->client?->name ?? $this->client_name ?? 'Client non précisé';
    }
}
