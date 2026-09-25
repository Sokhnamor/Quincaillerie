@php
    $currency = $settings['currency'];
    $money = fn ($v) => number_format((float) $v, 0, ',', ' ');
    $statusLabels = ['paid' => 'PAYÉE', 'partial' => 'PAIEMENT PARTIEL', 'unpaid' => 'IMPAYÉE'];
    $methodLabels = ['cash' => 'Espèces', 'wave' => 'Wave', 'orange_money' => 'Orange Money', 'card' => 'Carte', 'transfer' => 'Virement', 'cheque' => 'Chèque'];
    $taxRate = rtrim(rtrim(number_format((float) $sale->tax_rate, 2, ',', ''), '0'), ',');
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Ticket {{ $sale->invoice_number }}</title>
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
        .logo { width: 30px; height: 22px; padding-top: 8px; line-height: 1; margin: 0 auto 4px; border-radius: 7px; background: #111; color: #fff; font-size: 13pt; font-weight: bold; text-align: center; }
        .shop { font-size: 11.5pt; font-weight: bold; letter-spacing: .3px; }
        .shop-info { font-size: 6.8pt; color: #444; }
        .rule { border-top: 1px dashed #777; margin: 6px 0; height: 0; }
        .rule-solid { border-top: 1.4px solid #111; margin: 6px 0; height: 0; }
        .doc { font-size: 9.5pt; font-weight: bold; letter-spacing: 2px; }
        .meta td { font-size: 7pt; padding: 0.6px 0; }
        .item-name { font-weight: bold; padding-top: 3px; }
        .item-calc td { font-size: 7pt; color: #333; padding-bottom: 3px; }
        .totals td { padding: 1.2px 0; }
        .grand td { font-size: 11pt; font-weight: bold; padding: 4px 0 2px; }
        .status { display: inline-block; padding: 2px 8px; border: 1.2px solid #111; border-radius: 3px; font-size: 7pt; font-weight: bold; letter-spacing: 1px; }
        .due { background: #111; color: #fff; }
        .due td { padding: 3px 4px; font-weight: bold; }
        .thanks { font-size: 8.5pt; font-weight: bold; }
        .foot { font-size: 6.4pt; color: #444; }
    </style>
</head>
<body>
    {{-- En-tête boutique --}}
    <div class="center">
        <div class="logo">{{ mb_strtoupper(mb_substr($settings['company_name'], 0, 1)) }}</div>
        <div class="shop">{{ mb_strtoupper($settings['company_name']) }}</div>
        <div class="shop-info">{{ $settings['company_address'] }}</div>
        <div class="shop-info">Tél. {{ $settings['company_phone'] }}</div>
        @if($settings['company_ninea'])<div class="shop-info">NINEA {{ $settings['company_ninea'] }}@if($settings['company_rccm']) · RCCM {{ $settings['company_rccm'] }}@endif</div>@endif
    </div>

    <div class="rule-solid"></div>
    <div class="center doc">FACTURE</div>
    <div class="rule-solid"></div>

    {{-- Infos document --}}
    <table class="meta">
        <tr><td class="muted">N°</td><td class="right bold">{{ $sale->invoice_number }}</td></tr>
        <tr><td class="muted">Date</td><td class="right">{{ $sale->created_at->format('d/m/Y à H:i') }}</td></tr>
        <tr><td class="muted">Vendeur</td><td class="right">{{ $sale->user?->name ?? '—' }}</td></tr>
        <tr><td class="muted">Client</td><td class="right bold">{{ $sale->client?->name ?? 'Client comptoir' }}</td></tr>
        @if($sale->client?->phone)<tr><td class="muted">Tél. client</td><td class="right">{{ $sale->client->phone }}</td></tr>@endif
    </table>

    <div class="rule"></div>

    {{-- Articles --}}
    <table>
        <tr class="muted" style="font-size:6.6pt">
            <td>ARTICLE</td>
            <td class="right">MONTANT</td>
        </tr>
    </table>
    @foreach($sale->items as $item)
        <table>
            <tr><td colspan="2" class="item-name">{{ $item->product_name }}</td></tr>
            <tr class="item-calc">
                <td>{{ $item->quantity }} {{ $item->product?->unit }} × {{ $money($item->unit_price) }}</td>
                <td class="right bold">{{ $money($item->subtotal) }}</td>
            </tr>
        </table>
    @endforeach

    <div class="rule"></div>

    {{-- Totaux --}}
    <table class="totals">
        <tr><td class="muted">Articles</td><td class="right">{{ $sale->items->sum('quantity') }}</td></tr>
        <tr><td class="muted">Sous-total HT</td><td class="right">{{ $money($sale->subtotal) }}</td></tr>
        <tr><td class="muted">TVA {{ $taxRate }} %</td><td class="right">{{ $money($sale->tax_amount) }}</td></tr>
        @if($sale->discount > 0)
        <tr><td class="muted">Remise</td><td class="right">- {{ $money($sale->discount) }}</td></tr>
        @endif
    </table>
    <div class="rule-solid"></div>
    <table class="grand">
        <tr><td>TOTAL TTC</td><td class="right">{{ $money($sale->total) }} {{ $currency }}</td></tr>
    </table>
    @if($sale->returned_amount > 0)
        <table class="totals">
            @foreach($sale->returns as $ret)
            <tr><td class="muted">Avoir {{ $ret->number }}</td><td class="right">- {{ $money($ret->total) }}</td></tr>
            @endforeach
            <tr><td class="bold">NET À PAYER</td><td class="right bold">{{ $money($sale->net_total) }} {{ $currency }}</td></tr>
        </table>
    @endif
    <div class="rule-solid"></div>

    {{-- Paiements --}}
    <table class="totals">
        @forelse($sale->payments->sortBy('created_at') as $payment)
            <tr>
                <td>{{ $methodLabels[$payment->method] ?? $payment->method }} <span class="muted">{{ $payment->created_at->format('d/m') }}</span></td>
                <td class="right">{{ $money($payment->amount) }}</td>
            </tr>
        @empty
            <tr><td class="muted" colspan="2">Aucun paiement reçu</td></tr>
        @endforelse
        <tr><td class="bold">Total payé</td><td class="right bold">{{ $money($sale->paid_amount) }} {{ $currency }}</td></tr>
    </table>

    @if($sale->remaining_amount > 0)
        <table class="due" style="margin-top:5px">
            <tr><td>RESTE À PAYER</td><td class="right">{{ $money($sale->remaining_amount) }} {{ $currency }}</td></tr>
        </table>
    @endif

    <div class="center" style="margin-top:8px">
        <span class="status">{{ $statusLabels[$sale->status] ?? $sale->status }}</span>
    </div>

    @if($sale->notes)
        <div class="rule"></div>
        <div style="font-size:7pt"><span class="bold">Note :</span> {{ $sale->notes }}</div>
    @endif

    <div class="rule"></div>

    <div class="center">
        <div class="thanks">Merci de votre visite !</div>
        <div class="foot" style="margin-top:3px">{{ $settings['invoice_footer'] }}</div>
        <div class="foot" style="margin-top:5px">{{ $sale->invoice_number }} · {{ now()->format('d/m/Y H:i') }}</div>
    </div>
</body>
</html>
