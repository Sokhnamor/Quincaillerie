@php
    // $paper: 'a4' | 'a5' — A5 uses the same layout, scaled down
    $compact = ($paper ?? 'a4') === 'a5';
    $px = fn (float $size) => round($compact ? $size * 0.8 : $size, 1) . 'px';
    $logoFile = resource_path('images/logo-icon.png');
    $logo = is_file($logoFile) ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoFile)) : null;
    $currency = $settings['currency'];
    $money = fn ($v) => number_format((float) $v, 0, ',', ' ');
    $statusLabels = ['paid' => 'Payée', 'partial' => 'Paiement partiel', 'unpaid' => 'Impayée'];
    $methodLabels = ['cash' => 'Espèces', 'wave' => 'Wave', 'orange_money' => 'Orange Money', 'card' => 'Carte', 'transfer' => 'Virement', 'cheque' => 'Chèque'];
    $taxRate = rtrim(rtrim(number_format((float) $sale->tax_rate, 2, ',', ''), '0'), ',');
    $inWords = class_exists(\NumberFormatter::class)
        ? (new \NumberFormatter('fr', \NumberFormatter::SPELLOUT))->format((int) round((float) $sale->total))
        : null;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Facture {{ $sale->invoice_number }}</title>
    <style>
        @page { margin: {{ $compact ? '9mm' : '14mm' }}; }
        * { margin: 0; padding: 0; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: {{ $px(9.5) }}; line-height: 1.45; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; }
        .right { text-align: right; }
        .center { text-align: center; }
        .muted { color: #64748b; }
        .bold { font-weight: bold; }

        .logo { width: {{ $px(46) }}; height: {{ $px(34) }}; padding-top: {{ $px(12) }}; line-height: 1; border-radius: 10px; background: #ea580c; color: #fff; text-align: center; font-size: {{ $px(22) }}; font-weight: bold; }
        .company { font-size: {{ $px(17) }}; font-weight: bold; color: #0f172a; }
        .company-info { font-size: {{ $px(8.5) }}; color: #64748b; line-height: 1.5; }
        .doc-title { font-size: {{ $px(24) }}; font-weight: bold; color: #0f172a; letter-spacing: 2px; text-align: right; }
        .doc-number { font-size: {{ $px(11) }}; font-weight: bold; color: #ea580c; text-align: right; }

        .band { margin-top: {{ $px(18) }}; border: 1px solid #e2e8f0; border-radius: 8px; }
        .band td { padding: {{ $px(10) }} {{ $px(12) }}; border-right: 1px solid #e2e8f0; }
        .band td.last { border-right: 0; }
        .label { font-size: {{ $px(7.5) }}; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: bold; margin-bottom: 3px; }
        .value { font-size: {{ $px(11) }}; font-weight: bold; color: #0f172a; }
        .badge { display: inline-block; padding: 2px 9px; border-radius: 10px; font-size: {{ $px(8) }}; font-weight: bold; color: #fff; }
        .badge-paid { background: #16a34a; }
        .badge-partial { background: #d97706; }
        .badge-unpaid { background: #dc2626; }

        .items { margin-top: {{ $px(16) }}; }
        .items th { font-size: {{ $px(7.5) }}; text-transform: uppercase; letter-spacing: .6px; color: #64748b; text-align: left; padding: {{ $px(7) }} {{ $px(6) }}; border-bottom: 2px solid #0f172a; }
        .items th.right { text-align: right; }
        .items td { padding: {{ $px(7) }} {{ $px(6) }}; border-bottom: 1px solid #eef0f4; }
        .items .ref { font-size: {{ $px(7.5) }}; color: #94a3b8; }

        .totals td { padding: {{ $px(4) }} {{ $px(8) }}; }
        .totals .grand td { background: #0f172a; color: #fff; font-size: {{ $px(12.5) }}; font-weight: bold; padding: {{ $px(9) }} {{ $px(8) }}; }
        .totals .paid td { color: #16a34a; font-weight: bold; }
        .totals .due td { color: #dc2626; font-weight: bold; }
        .section-title { font-size: {{ $px(7.5) }}; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: bold; margin-bottom: 5px; }
        .payments td { padding: 3px 0; border-bottom: 1px dashed #e2e8f0; font-size: {{ $px(8.5) }}; }
        .words { margin-top: {{ $px(12) }}; font-size: {{ $px(8.5) }}; color: #334155; }
        .notes { margin-top: {{ $px(12) }}; background: #fff7ed; border-left: 3px solid #ea580c; padding: {{ $px(7) }} {{ $px(10) }}; font-size: {{ $px(8.5) }}; }
        .sign { margin-top: {{ $px(22) }}; }
        .sign td { width: 50%; font-size: {{ $px(8) }}; color: #64748b; }
        .sign .box { height: {{ $px(42) }}; border-bottom: 1px solid #cbd5e1; margin-right: 24px; }
        .footer { margin-top: {{ $px(22) }}; text-align: center; font-size: {{ $px(7.5) }}; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 5px; }
    </style>
</head>
<body>

    {{-- En-tête --}}
    <table>
        <tr>
            <td style="width: {{ $px(66) }};">
                @if($logo)
                    <img src="{{ $logo }}" alt="" style="width: {{ $px(54) }}; height: {{ $px(54) }};">
                @else
                    <div class="logo">{{ mb_strtoupper(mb_substr($settings['company_name'], 0, 1)) }}</div>
                @endif
            </td>
            <td>
                <div class="company">{{ $settings['company_name'] }}</div>
                <div class="company-info">
                    {{ $settings['company_address'] }}<br>
                    Tél. {{ $settings['company_phone'] }}@if($settings['company_email']) · {{ $settings['company_email'] }}@endif
                </div>
            </td>
            <td style="width: 40%;">
                <div class="doc-title">FACTURE</div>
                <div class="doc-number">{{ $sale->invoice_number }}</div>
            </td>
        </tr>
    </table>

    {{-- Bandeau d'informations --}}
    <table class="band">
        <tr>
            <td style="width: 42%;">
                <div class="label">Facturé à</div>
                <div class="value">{{ $sale->client?->name ?? 'Client comptoir' }}</div>
                @if($sale->client?->phone)<div class="muted">Tél. {{ $sale->client->phone }}</div>@endif
                @if($sale->client?->address || $sale->client?->city)<div class="muted">{{ trim(($sale->client->address ?? '') . ' ' . ($sale->client->city ?? '')) }}</div>@endif
            </td>
            <td>
                <div class="label">Date</div>
                <div class="value">{{ $sale->created_at->format('d/m/Y') }}</div>
                <div class="muted">{{ $sale->created_at->format('H:i') }} · {{ $sale->user?->name }}</div>
            </td>
            <td class="last right">
                <div class="label">Statut</div>
                <span class="badge badge-{{ $sale->status }}">{{ $statusLabels[$sale->status] ?? $sale->status }}</span>
            </td>
        </tr>
    </table>

    {{-- Articles --}}
    <table class="items">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th>Désignation</th>
                <th class="right" style="width: 13%;">Qté</th>
                <th class="right" style="width: 17%;">Prix unit.</th>
                <th class="right" style="width: 19%;">Montant</th>
            </tr>
        </thead>
        <tbody>
            @foreach($sale->items as $i => $item)
            <tr>
                <td class="muted">{{ $i + 1 }}</td>
                <td>
                    <span class="bold">{{ $item->product_name }}</span>
                    @if($item->product?->reference)<br><span class="ref">{{ $item->product->reference }}</span>@endif
                </td>
                <td class="right">{{ $item->quantity }} {{ $item->product?->unit }}</td>
                <td class="right">{{ $money($item->unit_price) }}</td>
                <td class="right bold">{{ $money($item->subtotal) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Paiements + totaux --}}
    <table style="margin-top: {{ $px(14) }};">
        <tr>
            <td style="padding-right: {{ $px(18) }};">
                @if($sale->payments->isNotEmpty())
                    <div class="section-title">Paiements reçus</div>
                    <table class="payments">
                        @foreach($sale->payments->sortBy('created_at') as $payment)
                        <tr>
                            <td>{{ $payment->created_at->format('d/m/Y') }}</td>
                            <td>{{ $methodLabels[$payment->method] ?? $payment->method }}</td>
                            <td class="right">{{ $money($payment->amount) }} {{ $currency }}</td>
                        </tr>
                        @endforeach
                    </table>
                @endif
            </td>
            <td style="width: 46%;">
                <table class="totals">
                    <tr><td class="muted">Sous-total HT</td><td class="right">{{ $money($sale->subtotal) }} {{ $currency }}</td></tr>
                    <tr><td class="muted">TVA ({{ $taxRate }} %)</td><td class="right">{{ $money($sale->tax_amount) }} {{ $currency }}</td></tr>
                    @if($sale->discount > 0)
                    <tr><td class="muted">Remise</td><td class="right">- {{ $money($sale->discount) }} {{ $currency }}</td></tr>
                    @endif
                    <tr class="grand"><td>Total TTC</td><td class="right">{{ $money($sale->total) }} {{ $currency }}</td></tr>
                    @if($sale->returned_amount > 0)
                    <tr><td class="muted">Avoirs (retours)</td><td class="right">- {{ $money($sale->returned_amount) }} {{ $currency }}</td></tr>
                    <tr><td class="bold">Net à payer</td><td class="right bold">{{ $money($sale->net_total) }} {{ $currency }}</td></tr>
                    @endif
                    <tr class="paid"><td>Payé</td><td class="right">{{ $money($sale->paid_amount) }} {{ $currency }}</td></tr>
                    @if($sale->remaining_amount > 0)
                    <tr class="due"><td>Reste à payer</td><td class="right">{{ $money($sale->remaining_amount) }} {{ $currency }}</td></tr>
                    @endif
                </table>
            </td>
        </tr>
    </table>

    @if($inWords)
        <div class="words">Arrêtée la présente facture à la somme de <span class="bold">{{ $inWords }} francs CFA</span> TTC.</div>
    @endif

    @if($sale->notes)
        <div class="notes"><span class="bold">Note :</span> {{ $sale->notes }}</div>
    @endif

    <table class="sign">
        <tr>
            <td><div class="box"></div>Signature du client</td>
            <td><div class="box" style="margin-right:0"></div>Cachet et signature</td>
        </tr>
    </table>
    <div class="footer">
        {{ $settings['invoice_footer'] }}<br>
        {{ $settings['company_name'] }} · {{ $settings['company_address'] }}
        @if($settings['company_ninea']) · NINEA {{ $settings['company_ninea'] }} @endif
        @if($settings['company_rccm']) · RCCM {{ $settings['company_rccm'] }} @endif
    </div>
</body>
</html>
