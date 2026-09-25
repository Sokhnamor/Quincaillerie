<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SalesExport implements FromCollection, WithHeadings, ShouldAutoSize, WithStyles
{
    private const STATUS = ['paid' => 'Payée', 'partial' => 'Partielle', 'unpaid' => 'Impayée'];

    public function __construct(private Collection $sales)
    {
    }

    public function collection(): Collection
    {
        return $this->sales->map(fn ($sale) => [
            $sale->invoice_number,
            $sale->created_at->format('d/m/Y H:i'),
            $sale->client?->name ?? 'Client comptoir',
            $sale->user?->name,
            (float) $sale->subtotal,
            (float) $sale->tax_amount,
            (float) $sale->discount,
            (float) $sale->total,
            (float) $sale->returned_amount,
            (float) $sale->paid_amount,
            $sale->remaining_amount,
            self::STATUS[$sale->status] ?? $sale->status,
        ]);
    }

    public function headings(): array
    {
        return ['Facture', 'Date', 'Client', 'Vendeur', 'Sous-total', 'TVA', 'Remise', 'Total', 'Avoirs', 'Payé', 'Reste', 'Statut'];
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true]]];
    }
}
