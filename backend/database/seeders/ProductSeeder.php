<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            // Outillage
            ['name' => 'Tournevis cruciforme', 'reference' => 'OUT-001', 'category_id' => 1, 'supplier_id' => 1, 'purchase_price' => 2.50, 'selling_price' => 4.90, 'stock' => 150, 'alert_threshold' => 20],
            ['name' => 'Marteau', 'reference' => 'OUT-002', 'category_id' => 1, 'supplier_id' => 1, 'purchase_price' => 8.00, 'selling_price' => 14.90, 'stock' => 80, 'alert_threshold' => 15],
            ['name' => 'Pince universelle', 'reference' => 'OUT-003', 'category_id' => 1, 'supplier_id' => 1, 'purchase_price' => 6.00, 'selling_price' => 10.90, 'stock' => 100, 'alert_threshold' => 20],
            ['name' => 'Perceuse visseuse', 'reference' => 'OUT-004', 'category_id' => 1, 'supplier_id' => 1, 'purchase_price' => 45.00, 'selling_price' => 79.90, 'stock' => 25, 'alert_threshold' => 5],
            
            // Quincaillerie
            ['name' => 'Boîte de vis (+200)', 'reference' => 'QUI-001', 'category_id' => 2, 'supplier_id' => 2, 'purchase_price' => 3.00, 'selling_price' => 5.90, 'stock' => 200, 'alert_threshold' => 50],
            ['name' => 'Boulons M8 (x50)', 'reference' => 'QUI-002', 'category_id' => 2, 'supplier_id' => 2, 'purchase_price' => 4.50, 'selling_price' => 7.90, 'stock' => 120, 'alert_threshold' => 30],
            ['name' => 'Charnièresubles', 'reference' => 'QUI-003', 'category_id' => 2, 'supplier_id' => 2, 'purchase_price' => 1.20, 'selling_price' => 2.50, 'stock' => 300, 'alert_threshold' => 50],
            
            // Peinture
            ['name' => 'Peinture blanche 1L', 'reference' => 'PEI-001', 'category_id' => 3, 'supplier_id' => 5, 'purchase_price' => 8.00, 'selling_price' => 14.90, 'stock' => 60, 'alert_threshold' => 15],
            ['name' => 'Pinceau moyen', 'reference' => 'PEI-002', 'category_id' => 3, 'supplier_id' => 5, 'purchase_price' => 2.00, 'selling_price' => 3.90, 'stock' => 100, 'alert_threshold' => 25],
            ['name' => 'Rouleau peinture', 'reference' => 'PEI-003', 'category_id' => 3, 'supplier_id' => 5, 'purchase_price' => 3.50, 'selling_price' => 6.50, 'stock' => 80, 'alert_threshold' => 20],
            
            // Plomberie
            ['name' => 'Tuyau PVC 32mm (2m)', 'reference' => 'PLO-001', 'category_id' => 4, 'supplier_id' => 4, 'purchase_price' => 4.00, 'selling_price' => 7.50, 'stock' => 50, 'alert_threshold' => 10],
            ['name' => 'Robinet standard', 'reference' => 'PLO-002', 'category_id' => 4, 'supplier_id' => 4, 'purchase_price' => 8.00, 'selling_price' => 14.90, 'stock' => 40, 'alert_threshold' => 10],
            
            // Électricité
            ['name' => 'Câble électrique 2.5mm (10m)', 'reference' => 'ELE-001', 'category_id' => 5, 'supplier_id' => 3, 'purchase_price' => 12.00, 'selling_price' => 19.90, 'stock' => 30, 'alert_threshold' => 10],
            ['name' => 'Interrupteur', 'reference' => 'ELE-002', 'category_id' => 5, 'supplier_id' => 3, 'purchase_price' => 2.50, 'selling_price' => 4.90, 'stock' => 100, 'alert_threshold' => 25],
            ['name' => 'Prise murale', 'reference' => 'ELE-003', 'category_id' => 5, 'supplier_id' => 3, 'purchase_price' => 3.00, 'selling_price' => 5.90, 'stock' => 8, 'alert_threshold' => 15],
            
            // Bâtiment
            ['name' => 'Ciment 25kg', 'reference' => 'BAT-001', 'category_id' => 6, 'supplier_id' => 2, 'purchase_price' => 5.50, 'selling_price' => 9.90, 'stock' => 45, 'alert_threshold' => 10],
            ['name' => 'Sable (sac 25kg)', 'reference' => 'BAT-002', 'category_id' => 6, 'supplier_id' => 2, 'purchase_price' => 3.00, 'selling_price' => 5.50, 'stock' => 60, 'alert_threshold' => 15],
            
            // Jardinage
            ['name' => 'Tondeuse manuale', 'reference' => 'JAR-001', 'category_id' => 7, 'supplier_id' => 1, 'purchase_price' => 35.00, 'selling_price' => 59.90, 'stock' => 15, 'alert_threshold' => 5],
            ['name' => 'Sécateur', 'reference' => 'JAR-002', 'category_id' => 7, 'supplier_id' => 1, 'purchase_price' => 6.00, 'selling_price' => 10.90, 'stock' => 40, 'alert_threshold' => 10],
            
            // Sécurité
            ['name' => 'Gants de travail', 'reference' => 'SEC-001', 'category_id' => 8, 'supplier_id' => 1, 'purchase_price' => 2.00, 'selling_price' => 4.50, 'stock' => 200, 'alert_threshold' => 50],
            ['name' => 'Casque chantier', 'reference' => 'SEC-002', 'category_id' => 8, 'supplier_id' => 1, 'purchase_price' => 8.00, 'selling_price' => 14.90, 'stock' => 5, 'alert_threshold' => 10],
            ['name' => 'Bottes sécurité', 'reference' => 'SEC-003', 'category_id' => 8, 'supplier_id' => 1, 'purchase_price' => 18.00, 'selling_price' => 29.90, 'stock' => 20, 'alert_threshold' => 5],
            
            // Auto
            ['name' => 'Huile moteur 5W30 (1L)', 'reference' => 'AUT-001', 'category_id' => 9, 'supplier_id' => 1, 'purchase_price' => 8.00, 'selling_price' => 14.90, 'stock' => 50, 'alert_threshold' => 15],
            ['name' => 'Antigel 1L', 'reference' => 'AUT-002', 'category_id' => 9, 'supplier_id' => 1, 'purchase_price' => 4.00, 'selling_price' => 7.50, 'stock' => 0, 'alert_threshold' => 10],
        ];

        foreach ($products as $product) {
            Product::create($product);
        }
    }
}
