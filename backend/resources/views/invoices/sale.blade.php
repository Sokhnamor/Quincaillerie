<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Facture {{ $sale->invoice_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        @page {
            size: A4;
            margin: 15mm;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, sans-serif;
            font-size: 11px;
            line-height: 1.5;
            color: #333;
        }
        
        .invoice-wrapper {
            width: 100%;
            max-width: 180mm;
            margin: 0 auto;
        }
        
        .top-bar {
            height: 6px;
            background: #e67e22;
            margin-bottom: 12px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
            margin-bottom: 12px;
        }
        
        .company-name {
            font-size: 18px;
            font-weight: 700;
            color: #2c3e50;
        }
        
        .company-details {
            font-size: 9px;
            color: #666;
        }
        
        .invoice-title {
            font-size: 26px;
            font-weight: 700;
            color: #e67e22;
        }
        
        .invoice-meta {
            font-size: 10px;
            color: #555;
        }
        
        .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            margin-top: 5px;
        }
        
        .status-paid { background: #27ae60; color: white; }
        .status-partial { background: #f39c12; color: white; }
        .status-unpaid { background: #e74c3c; color: white; }
        
        .parties {
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .party-card {
            flex: 1;
            background: #f5f5f5;
            border-radius: 4px;
            padding: 10px;
        }
        
        .party-title {
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #e67e22;
            font-weight: 700;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid #e67e22;
        }
        
        .party-name {
            font-size: 12px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 4px;
        }
        
        .party-info {
            font-size: 9px;
            color: #555;
            line-height: 1.5;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        
        .items-table thead {
            background: #e67e22;
            color: white;
        }
        
        .items-table th {
            padding: 8px 6px;
            text-align: left;
            font-weight: 600;
            font-size: 9px;
            text-transform: uppercase;
        }
        
        .items-table th:nth-child(1) { text-align: center; width: 30px; }
        .items-table th:nth-child(3) { text-align: right; width: 75px; }
        .items-table th:nth-child(4) { text-align: center; width: 50px; }
        .items-table th:nth-child(5) { text-align: right; width: 80px; }
        
        .items-table td {
            padding: 8px 6px;
            border-bottom: 1px solid #eee;
            font-size: 10px;
        }
        
        .items-table td:nth-child(1) { text-align: center; }
        .items-table td:nth-child(3) { text-align: right; }
        .items-table td:nth-child(4) { text-align: center; }
        .items-table td:nth-child(5) { text-align: right; font-weight: 600; }
        
        .items-table tbody tr:nth-child(even) { background: #fafafa; }
        
        .summary-section {
            display: flex;
            gap: 12px;
            margin-bottom: 10px;
        }
        
        .payment-info { flex: 1; }
        
        .payment-card {
            background: #f5f5f5;
            border-radius: 4px;
            padding: 10px;
        }
        
        .payment-title {
            font-size: 9px;
            text-transform: uppercase;
            color: #2c3e50;
            font-weight: 600;
            margin-bottom: 6px;
        }
        
        .payment-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 10px;
            border-bottom: 1px solid #ddd;
        }
        
        .payment-row:last-child { border-bottom: none; }
        .payment-row.paid { color: #27ae60; font-weight: 600; }
        .payment-row.remaining { 
            font-weight: 700; 
            color: #e67e22; 
            margin-top: 5px;
            padding-top: 5px;
            border-top: 1px solid #e67e22;
        }
        
        .totals-box { width: 160px; }
        
        .totals-card {
            background: #2c3e50;
            border-radius: 4px;
            padding: 12px;
            color: white;
        }
        
        .total-line {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 10px;
        }
        
        .total-line.subtotal, .total-line.tax { color: rgba(255,255,255,0.7); }
        .total-line.discount { color: #2ecc71; }
        .total-line.grand-total {
            font-size: 14px;
            font-weight: 700;
            margin-top: 6px;
            padding-top: 8px;
            border-top: 1px solid #e67e22;
        }
        
        .notes-box {
            background: #fff8e1;
            border-left: 3px solid #f39c12;
            padding: 8px 10px;
            font-size: 9px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .notes-box strong { color: #2c3e50; }
        
        .footer {
            padding-top: 10px;
            border-top: 2px solid #e67e22;
            text-align: center;
        }
        
        .footer-thanks {
            font-size: 11px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 3px;
        }
        
        .footer-generated {
            font-size: 8px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="invoice-wrapper">
        <div class="top-bar"></div>
        
        <div class="header">
            <div>
                <div class="company-name">{{ $company['name'] }}</div>
                <div class="company-details">{{ $company['address'] }} | {{ $company['phone'] }} | {{ $company['email'] }}</div>
            </div>
            <div style="text-align: right;">
                <div class="invoice-title">FACTURE</div>
                <div class="invoice-meta">
                    <strong>N°:</strong> {{ $sale->invoice_number }} | <strong>Date:</strong> {{ \Carbon\Carbon::parse($sale->created_at)->format('d/m/Y') }}
                </div>
                <span class="status-badge status-{{ $sale->status }}">
                    @if($sale->status === 'paid') PAYÉ
                    @elseif($sale->status === 'partial') PARTIEL
                    @else IMPAYÉ
                    @endif
                </span>
            </div>
        </div>
        
        <div class="parties">
            <div class="party-card">
                <div class="party-title">Émetteur</div>
                <div class="party-name">{{ $company['name'] }}</div>
                <div class="party-info">{{ $company['address'] }}<br>{{ $company['phone'] }}</div>
            </div>
            <div class="party-card">
                <div class="party-title">Client</div>
                @if($sale->client)
                    <div class="party-name">{{ $sale->client->name }}</div>
                    <div class="party-info">@if($sale->client->phone){{ $sale->client->phone }}<br>@endif{{ $sale->client->address ?? '' }}</div>
                @else
                    <div class="party-name">Client non spécifié</div>
                @endif
            </div>
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>N°</th>
                    <th>Produit</th>
                    <th>Prix</th>
                    <th>Qté</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($sale->items as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $item->product_name }}</td>
                    <td>{{ number_format($item->unit_price, 0, ',', ' ') }}</td>
                    <td>{{ $item->quantity }}</td>
                    <td>{{ number_format($item->subtotal, 0, ',', ' ') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        
        <div class="summary-section">
            <div class="payment-info">
                <div class="payment-card">
                    <div class="payment-title">Paiement</div>
                    @if($sale->paid_amount > 0)
                    <div class="payment-row paid">
                        <span>Payé</span>
                        <span>{{ number_format($sale->paid_amount, 0, ',', ' ') }} CFA</span>
                    </div>
                    <div class="payment-row remaining">
                        <span>Reste</span>
                        <span>{{ number_format($sale->total - $sale->paid_amount, 0, ',', ' ') }} CFA</span>
                    </div>
                    @else
                    <div class="payment-row"><span>Aucun paiement</span></div>
                    @endif
                </div>
            </div>
            <div class="totals-box">
                <div class="totals-card">
                    <div class="total-line subtotal">
                        <span>Sous-total</span>
                        <span>{{ number_format($sale->subtotal, 0, ',', ' ') }}</span>
                    </div>
                    <div class="total-line tax">
                        <span>TVA 19%</span>
                        <span>{{ number_format($sale->tax_amount, 0, ',', ' ') }}</span>
                    </div>
                    @if($sale->discount > 0)
                    <div class="total-line discount">
                        <span>Remise</span>
                        <span>-{{ number_format($sale->discount, 0, ',', ' ') }}</span>
                    </div>
                    @endif
                    <div class="total-line grand-total">
                        <span>Total TTC</span>
                        <span>{{ number_format($sale->total, 0, ',', ' ') }}</span>
                    </div>
                </div>
            </div>
        </div>
        
        @if($sale->notes)
        <div class="notes-box">
            <strong>Note:</strong> {{ $sale->notes }}
        </div>
        @endif
        
        <div class="footer">
            <div class="footer-thanks">Merci pour votre confiance</div>
            <div class="footer-generated">Système de gestion de quincaillerie</div>
        </div>
    </div>
</body>
</html>

