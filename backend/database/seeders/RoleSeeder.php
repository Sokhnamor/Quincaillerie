<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'admin', 'description' => 'Administrateur - Accès complet'],
            ['name' => 'gestionnaire', 'description' => 'Gestionnaire - Gestion des opérations'],
            ['name' => 'caissier', 'description' => 'Caissier - Point de vente uniquement'],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role['name']], $role);
        }
    }
}
