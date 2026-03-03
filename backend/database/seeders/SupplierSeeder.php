<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            ['name' => 'STI Outillage', 'phone' => '0612345678', 'email' => 'contact@sti-outillage.fr', 'address' => 'Zone Industrielle', 'city' => 'Lyon'],
            ['name' => 'BatiPro', 'phone' => '0623456789', 'email' => 'vente@batipro.fr', 'address' => 'Rue des Bâtisseurs', 'city' => 'Paris'],
            ['name' => 'ElectroMax', 'phone' => '0634567890', 'email' => 'info@electromax.fr', 'address' => 'Avenue de l\'Électricité', 'city' => 'Marseille'],
            ['name' => 'Plomberie Plus', 'phone' => '0645678901', 'email' => 'contact@plomberieplus.fr', 'address' => 'Chemin des Tuyaux', 'city' => 'Toulouse'],
            ['name' => 'Peintures & Couleurs', 'phone' => '0656789012', 'email' => 'vente@peinturescouleurs.fr', 'address' => 'Route des Peintres', 'city' => 'Bordeaux'],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::create($supplier);
        }
    }
}
