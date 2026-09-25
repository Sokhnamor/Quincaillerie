<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'Administrateur',
                'email' => 'admin@quincaillerie.fr',
                'password' => Hash::make('password123'),
                'role_id' => 1,
                'phone' => '0100000000',
                'address' => '1 Rue Admin, Paris',
            ],
            [
                'name' => 'Gestionnaire',
                'email' => 'gestionnaire@quincaillerie.fr',
                'password' => Hash::make('password123'),
                'role_id' => 2,
                'phone' => '0100000001',
                'address' => '2 Rue Manager, Lyon',
            ],
            [
                'name' => 'Caissier',
                'email' => 'caissier@quincaillerie.fr',
                'password' => Hash::make('password123'),
                'role_id' => 3,
                'phone' => '0100000002',
                'address' => '3 Rue Cashier, Marseille',
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(['email' => $user['email']], $user);
        }
    }
}
