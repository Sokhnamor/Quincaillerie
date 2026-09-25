<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'client_id',
        'user_id',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'discount',
        'total',
        'status',
        'paid_amount',
        'notes'
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'paid_amount' => 'decimal:2'
    ];

    protected $appends = ['remaining_amount'];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class)->latest();
    }

    public function getRemainingAmountAttribute(): float
    {
        return max(0, round((float) $this->total - (float) $this->paid_amount, 2));
    }

    /**
     * Recompute paid amount and status from the recorded payments
     */
    public function refreshPaymentStatus(): void
    {
        $paid = (float) $this->payments()->sum('amount');

        $this->paid_amount = $paid;
        $this->status = static::statusFor($paid, (float) $this->total);
        $this->save();
    }

    public static function statusFor(float $paid, float $total): string
    {
        if ($paid >= $total) {
            return 'paid';
        }

        return $paid > 0 ? 'partial' : 'unpaid';
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }
}
