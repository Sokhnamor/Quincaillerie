@php
    $compact = ($paper ?? 'a4') === 'a5';
    $px = fn (float $size) => round($compact ? $size * 0.8 : $size, 1) . 'px';
    $currency = $settings['currency'];
    $money = fn ($v) => number_format((float) $v, 0, ',', ' ');
    $taxRate = rtrim(rtrim(number_format((float) $quote->tax_rate, 2, ',', ''), '0'), ',');
    $title = $quote->status === 'accepted' ? 'FACTURE PROFORMA' : 'DEVIS';
    $inWords = class_exists(\NumberFormatter::class)
        ? (new \NumberFormatter('fr', \NumberFormatter::SPELLOUT))->format((int) round((float) $quote->total))
        : null;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }} {{ $quote->number }}</title>
    <style>
        @page { margin: {{ $compact ? '9mm' : '14mm' }}; }
        * { margin: 0; padding: 0; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: {{ $px(9.5) }}; line-height: 1.45; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; }
        .right { text-align: right; }
        .muted { color: #64748b; }
        .bold { font-weight: bold; }
        .logo { width: {{ $px(46) }}; height: {{ $px(34) }}; padding-top: {{ $px(12) }}; line-height: 1; border-radius: 10px; background: #ea580c; color: #fff; text-align: center; font-size: {{ $px(22) }}; font-weight: bold; }
        .company { font-size: {{ $px(17) }}; font-weight: bold; color: #0f172a; }
        .company-info { font-size: {{ $px(8.5) }}; color: #64748b; line-height: 1.5; }
        .doc-title { font-size: {{ $px($title === 'DEVIS' ? 24 : 17) }}; font-weight: bold; color: #0f172a; letter-spacing: 2px; text-align: right; }
        .doc-number { font-size: {{ $px(11) }}; font-weight: bold; color: #ea580c; text-align: right; }
        .band { margin-top: {{ $px(18) }}; border: 1px solid #e2e8f0; border-radius: 8px; }
        .band td { padding: {{ $px(10) }} {{ $px(12) }}; border-right: 1px solid #e2e8f0; }
        .band td.last { border-right: 0; }
        .label { font-size: {{ $px(7.5) }}; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: bold; margin-bottom: 3px; }
        .value { font-size: {{ $px(11) }}; font-weight: bold; color: #0f172a; }
        .items { margin-top: {{ $px(16) }}; }
        .items th { font-size: {{ $px(7.5) }}; text-transform: uppercase; letter-spacing: .6px; color: #64748b; text-align: left; padding: {{ $px(7) }} {{ $px(6) }}; border-bottom: 2px solid #0f172a; }
        .items th.right { text-align: right; }
        .items td { padding: {{ $px(7) }} {{ $px(6) }}; border-bottom: 1px solid #eef0f4; }
        .items .ref { font-size: {{ $px(7.5) }}; color: #94a3b8; }
        .totals td { padding: {{ $px(4) }} {{ $px(8) }}; }
        .totals .grand td { background: #0f172a; color: #fff; font-size: {{ $px(12.5) }}; font-weight: bold; padding: {{ $px(9) }} {{ $px(8) }}; }
        .validity { margin-top: {{ $px(14) }}; background: #fff7ed; border-left: 3px solid #ea580c; padding: {{ $px(8) }} {{ $px(10) }}; font-size: {{ $px(8.5) }}; }
        .words { margin-top: {{ $px(12) }}; font-size: {{ $px(8.5) }}; color: #334155; }
        .sign { margin-top: {{ $px(22) }}; }
        .sign td { width: 50%; font-size: {{ $px(8) }}; color: #64748b; }
        .sign .box { height: {{ $px(42) }}; border-bottom: 1px solid #cbd5e1; margin-right: 24px; }
        .footer { margin-top: {{ $px(22) }}; text-align: center; font-size: {{ $px(7.5) }}; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 5px; }
    </style>
</head>
<body>
    <table>
        <tr>
            <td style="width: {{ $px(56) }};"><div class="logo">{{ mb_strtoupper(mb_substr($settings['company_name'], 0, 1)) }}</div></td>
            <td>
                <div class="company">{{ $settings['company_name'] }}</div>
                <div class="company-info">
                    {{ $settings['company_address'] }}<br>
                    Tél. {{ $settings['company_phone'] }}@if($settings['company_email']) · {{ $settings['company_email'] }}@endif
                </div>
            </td>
            <td style="width: 42%;">
                <div class="doc-title">{{ $title }}</div>
                <div class="doc-number">{{ $quote->number }}</div>
            </td>
        </tr>
    </table>

    <table class="band">
        <tr>
            <td style="width: 44%;">
                <div class="label">Client</div>
                <div class="value">{{ $quote->customer_name }}</div>
                @if($quote->client?->phone)<div class="muted">Tél. {{ $quote->client->phone }}</div>@endif
                @if($quote->client?->address || $quote->client?->city)<div class="muted">{{ trim(($quote->client->address ?? '') . ' ' . ($quote->client->city ?? '')) }}</div>@endif
            </td>
            <td>
                <div class="label">Date</div>
                <div class="value">{{ $quote->created_at->format('d/m/Y') }}</div>
                <div class="muted">Établi par {{ $quote->user?->name }}</div>
            </td>
            <td class="last">
                <div class="label">Valable jusqu'au</div>
                <div class="value">{{ $quote->valid_until?->format('d/m/Y') ?? '—' }}</div>
            </td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th>Désignation</th>
                <th class="right" style="width: 13%;">Qté</th>
                <th class="right" style="width: 17%;">Prix unit. HT</th>
                <th class="right" style="width: 19%;">Montant HT</th>
            </tr>
        </thead>
        <tbody>
            @foreach($quote->items as $i => $item)
            <tr>
                <td class="muted">{{ $i + 1 }}</td>
                <td>
                    <span class="bold">{{ $item->designation }}</span>
                    @if($item->product?->reference)<br><span class="ref">{{ $item->product->reference }}</span>@endif
                </td>
                <td class="right">{{ $item->quantity }} {{ $item->product?->unit }}</td>
                <td class="right">{{ $money($item->unit_price) }}</td>
                <td class="right bold">{{ $money($item->subtotal) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <table style="margin-top: {{ $px(14) }};">
        <tr>
            <td style="padding-right: {{ $px(18) }};">
                <div class="validity">
                    <span class="bold">Conditions :</span> prix valables jusqu'au {{ $quote->valid_until?->format('d/m/Y') ?? '—' }},
                    sous réserve de disponibilité du stock. Ce document ne vaut pas facture.
                    @if($quote->notes)<br><span class="bold">Note :</span> {{ $quote->notes }}@endif
                </div>
            </td>
            <td style="width: 46%;">
                <table class="totals">
                    <tr><td class="muted">Sous-total HT</td><td class="right">{{ $money($quote->subtotal) }} {{ $currency }}</td></tr>
                    <tr><td class="muted">TVA ({{ $taxRate }} %)</td><td class="right">{{ $money($quote->tax_amount) }} {{ $currency }}</td></tr>
                    @if($quote->discount > 0)
                    <tr><td class="muted">Remise</td><td class="right">- {{ $money($quote->discount) }} {{ $currency }}</td></tr>
                    @endif
                    <tr class="grand"><td>Total TTC</td><td class="right">{{ $money($quote->total) }} {{ $currency }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    @if($inWords)
        <div class="words">Arrêté le présent {{ $title === 'DEVIS' ? 'devis' : 'document' }} à la somme de <span class="bold">{{ $inWords }} francs CFA</span> TTC.</div>
    @endif

    <table class="sign">
        <tr>
            <td><div class="box"></div>Bon pour accord (date, signature du client)</td>
            <td><div class="box" style="margin-right:0"></div>Cachet et signature</td>
        </tr>
    </table>

    <div class="footer">
        {{ $settings['company_name'] }} · {{ $settings['company_address'] }}
        @if($settings['company_ninea']) · NINEA {{ $settings['company_ninea'] }} @endif
        @if($settings['company_rccm']) · RCCM {{ $settings['company_rccm'] }} @endif
    </div>
</body>
</html>
