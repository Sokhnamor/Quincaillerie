@php
    $currency = $settings['currency'];
    $money = fn ($v) => number_format((float) $v, 0, ',', ' ');
    $statusLabels = ['paid' => 'Payée', 'partial' => 'Partielle', 'unpaid' => 'Impayée'];
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport des ventes</title>
    <style>
        @page { margin: 12mm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 9px; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; }
        h1 { font-size: 16px; color: #0f172a; margin: 0; }
        .muted { color: #64748b; }
        .bar { height: 4px; background: #ea580c; margin-bottom: 12px; }
        .kpis td { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 10px; }
        .kpis .v { font-size: 13px; font-weight: bold; color: #0f172a; }
        .list th { background: #0f172a; color: #fff; padding: 6px; text-align: left; font-size: 8px; text-transform: uppercase; }
        .list td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; }
        .right { text-align: right; }
    </style>
</head>
<body>
    <div class="bar"></div>
    <table>
        <tr>
            <td>
                <h1>Rapport des ventes</h1>
                <div class="muted">{{ $settings['company_name'] }} · Édité le {{ now()->format('d/m/Y à H:i') }}</div>
            </td>
            <td class="right muted">
                Période :
                {{ !empty($filters['start_date']) ? \Carbon\Carbon::parse($filters['start_date'])->format('d/m/Y') : 'début' }}
                →
                {{ !empty($filters['end_date']) ? \Carbon\Carbon::parse($filters['end_date'])->format('d/m/Y') : "aujourd'hui" }}
                @if(!empty($filters['status'])) · Statut : {{ $statusLabels[$filters['status']] ?? $filters['status'] }} @endif
            </td>
        </tr>
    </table>

    <table class="kpis" style="margin: 12px 0;">
        <tr>
            <td><div class="muted">Nombre de ventes</div><div class="v">{{ $sales->count() }}</div></td>
            <td><div class="muted">Chiffre d'affaires TTC</div><div class="v">{{ $money($sales->sum('total')) }} {{ $currency }}</div></td>
            <td><div class="muted">Encaissé</div><div class="v">{{ $money($sales->sum('paid_amount')) }} {{ $currency }}</div></td>
            <td><div class="muted">Reste à encaisser</div><div class="v">{{ $money($sales->sum('remaining_amount')) }} {{ $currency }}</div></td>
        </tr>
    </table>

    <table class="list">
        <thead>
            <tr>
                <th>Facture</th><th>Date</th><th>Client</th><th>Vendeur</th>
                <th class="right">Total</th><th class="right">Payé</th><th class="right">Reste</th><th>Statut</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sales as $sale)
            <tr>
                <td>{{ $sale->invoice_number }}</td>
                <td>{{ $sale->created_at->format('d/m/Y H:i') }}</td>
                <td>{{ $sale->client?->name ?? 'Client comptoir' }}</td>
                <td>{{ $sale->user?->name }}</td>
                <td class="right">{{ $money($sale->total) }}</td>
                <td class="right">{{ $money($sale->paid_amount) }}</td>
                <td class="right">{{ $money($sale->remaining_amount) }}</td>
                <td>{{ $statusLabels[$sale->status] ?? $sale->status }}</td>
            </tr>
            @empty
            <tr><td colspan="8" class="muted" style="text-align:center; padding: 20px;">Aucune vente sur cette période.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
