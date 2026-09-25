<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Period report as an Excel workbook: summary, days, products, sellers
 */
class ReportExport implements WithMultipleSheets
{
    private const METHODS = ['cash' => 'Espèces', 'wave' => 'Wave', 'orange_money' => 'Orange Money', 'card' => 'Carte', 'transfer' => 'Virement', 'cheque' => 'Chèque'];

    public function __construct(private array $report)
    {
    }

    public function sheets(): array
    {
        $r = $this->report;
        $t = $r['totals'];

        $summary = [
            ['Période', $r['period']['start'] . ' → ' . $r['period']['end']],
            ['Nombre de ventes', $t['sales_count']],
            ["Chiffre d'affaires brut TTC", $t['gross_revenue']],
            ['Retours (avoirs)', $t['returns']],
            ["Chiffre d'affaires net TTC", $t['net_revenue']],
            ['Remises accordées', $t['discounts']],
            ['TVA collectée', $t['tax']],
            ['Encaissé', $t['collected']],
            ['Reste à encaisser', $t['unpaid']],
            ['Marge brute estimée', $t['margin']],
            ['Panier moyen', $t['average_basket']],
        ];
        foreach ($r['by_payment_method'] as $m) {
            $summary[] = ['Encaissé — ' . (self::METHODS[$m->method] ?? $m->method), (float) $m->total];
        }

        return [
            $this->sheet('Synthèse', ['Indicateur', 'Valeur'], $summary),
            $this->sheet('Par jour', ['Date', 'Ventes', 'CA net TTC'], array_map(fn ($d) => [$d['date'], $d['count'], $d['revenue']], $r['daily'])),
            $this->sheet('Produits', ['Produit', 'Référence', 'Quantité', 'CA HT', 'Marge'], $r['products']->map(fn ($p) => [$p->name, $p->reference, (int) $p->quantity, (float) $p->revenue, (float) $p->margin])->all()),
            $this->sheet('Catégories', ['Catégorie', 'Quantité', 'CA HT', 'Marge'], $r['by_category']->map(fn ($c) => [$c->category, (int) $c->quantity, (float) $c->revenue, (float) $c->margin])->all()),
            $this->sheet('Vendeurs', ['Vendeur', 'Ventes', 'CA net TTC'], $r['by_seller']->map(fn ($s) => [$s->name, (int) $s->count, (float) $s->revenue])->all()),
            $this->sheet('Stock dormant', ['Produit', 'Référence', 'Stock', 'Valeur (achat)'], $r['sleeping_products']->map(fn ($p) => [$p['name'], $p['reference'], $p['stock'], $p['value']])->all()),
        ];
    }

    private function sheet(string $title, array $headings, array $rows): object
    {
        return new class ($title, $headings, $rows) implements FromArray, WithHeadings, WithTitle, ShouldAutoSize, WithStyles {
            public function __construct(private string $title, private array $headings, private array $rows)
            {
            }

            public function array(): array
            {
                return $this->rows;
            }

            public function headings(): array
            {
                return $this->headings;
            }

            public function title(): string
            {
                return $this->title;
            }

            public function styles(Worksheet $sheet): array
            {
                return [1 => ['font' => ['bold' => true]]];
            }
        };
    }
}
