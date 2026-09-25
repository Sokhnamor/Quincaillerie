@php
    $currency = $settings['currency'];
    $money = fn ($v) => number_format((float) $v, 0, ',', ' ');
    $methodLabels = ['cash' => 'Espèces', 'wave' => 'Wave', 'orange_money' => 'Orange Money', 'card' => 'Carte', 'transfer' => 'Virement', 'cheque' => 'Chèque'];
    $sale = $return->sale;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Avoir {{ $return->number }}</title>
    <style>
        @page { margin: 5mm 4mm 6mm 4mm; }
        * { margin: 0; padding: 0; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 7.6pt; line-height: 1.35; color: #111; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; }
        .center { text-align: center; }
        .right { text-align: right; }
        .muted { color: #555; }
        .bold { font-weight: bold; }
        .shop { font-size: 11pt; font-weight: bold; }
        .shop-info { font-size: 6.8pt; color: #444; }
        .rule { border-top: 1px dashed #777; margin: 6px 0; }
        .rule-solid { border-top: 1.4px solid #111; margin: 6px 0; }
        .doc { font-size: 9.5pt; font-weight: bold; letter-spacing: 2px; }
        .meta td { font-size: 7pt; padding: 0.6px 0; }
        .item-name { font-weight: bold; padding-top: 3px; }
        .item-calc td { font-size: 7pt; color: #333; padding-bottom: 3px; }
        .totals td { padding: 1.2px 0; }
        .grand td { font-size: 11pt; font-weight: bold; padding: 4px 0 2px; }
        .refund { background: #111; color: #fff; }
        .refund td { padding: 3px 4px; font-weight: bold; }
        .foot { font-size: 6.4pt; color: #444; }
    </style>
</head>
<body>
    <div class="center">
        <div class="shop">{{ mb_strtoupper($settings['company_name']) }}</div>
        <div class="shop-info">{{ $settings['company_address'] }} · Tél. {{ $settings['company_phone'] }}</div>
    </div>

    <div class="rule-solid"></div>
    <div class="center doc">AVOIR</div>
    <div class="rule-solid"></div>

    <table class="meta">
        <tr><td class="muted">N° avoir</td><td class="right bold">{{ $return->number }}</td></tr>
        <tr><td class="muted">Facture d'origine</td><td class="right">{{ $sale->invoice_number }}</td></tr>
        <tr><td class="muted">Date</td><td class="right">{{ $return->created_at->format('d/m/Y à H:i') }}</td></tr>
        <tr><td class="muted">Client</td><td class="right bold">{{ $sale->client?->name ?? 'Client comptoir' }}</td></tr>
        <tr><td class="muted">Traité par</td><td class="right">{{ $return->user?->name ?? '—' }}</td></tr>
        @if($return->reason)<tr><td class="muted">Motif</td><td class="right">{{ $return->reason }}</td></tr>@endif
    </table>

    <div class="rule"></div>
    <div class="muted" style="font-size:6.6pt">ARTICLES RETOURNÉS</div>
    @foreach($return->items as $item)
        <table>
            <tr><td colspan="2" class="item-name">{{ $item->product?->name ?? 'Produit supprimé' }}</td></tr>
            <tr class="item-calc">
                <td>{{ $item->quantity }} {{ $item->product?->unit }} × {{ $money($item->unit_price) }}</td>
                <td class="right bold">{{ $money($item->subtotal) }}</td>
            </tr>
        </table>
    @endforeach

    <div class="rule"></div>
    <table class="totals">
        <tr><td class="muted">Sous-total HT</td><td class="right">{{ $money($return->subtotal) }}</td></tr>
        <tr><td class="muted">TVA</td><td class="right">{{ $money($return->tax_amount) }}</td></tr>
        @if($return->discount_share > 0)
        <tr><td class="muted">Part de remise</td><td class="right">- {{ $money($return->discount_share) }}</td></tr>
        @endif
    </table>
    <div class="rule-solid"></div>
    <table class="grand"><tr><td>MONTANT DE L'AVOIR</td><td class="right">{{ $money($return->total) }} {{ $currency }}</td></tr></table>
    <div class="rule-solid"></div>

    @if($return->refund_amount > 0)
        <table class="refund" style="margin-top:4px">
            <tr><td>REMBOURSÉ ({{ $methodLabels[$return->refund_method] ?? $return->refund_method }})</td><td class="right">{{ $money($return->refund_amount) }} {{ $currency }}</td></tr>
        </table>
    @else
        <div class="center muted" style="margin-top:4px">Montant déduit du reste à payer de la facture.</div>
    @endif

    <div class="rule"></div>
    <div class="center foot">Signature du client : ______________________</div>
    <div class="center foot" style="margin-top:6px">{{ $return->number }} · {{ now()->format('d/m/Y H:i') }}</div>
</body>
</html>
