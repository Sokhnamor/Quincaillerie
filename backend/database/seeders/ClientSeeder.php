<?php

namespace Database\Seeders;

use App\Models\Client;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    public function run(): void
    {
        $clients = [
            ['name' => 'Jean Dupont', 'phone' => '0611111111', 'email' => 'jean.dupont@email.fr', 'address' => '10 Rue de la Paix', 'city' => 'Paris'],
            ['name' => 'Marie Martin', 'phone' => '0622222222', 'email' => 'marie.martin@email.fr', 'address' => '15 Avenue Victor Hugo', 'city' => 'Lyon'],
            ['name' => 'Pierre Bernard', 'phone' => '0633333333', 'email' => 'pierre.bernard@email.fr', 'address' => '20 Boulevard Saint-Michel', 'city' => 'Marseille'],
            ['name' => 'Sophie Dubois', 'phone' => '0644444444', 'email' => 'sophie.dubois@email.fr', 'address' => '25 Rue du Commerce', 'city' => 'Toulouse'],
            ['name' => 'Michel Petit', 'phone' => '0655555555', 'email' => 'michel.petit@email.fr', 'address' => '30 Place de la République', 'city' => 'Bordeaux'],
            ['name' => 'Entreprise BTP Louis', 'phone' => '0677777777', 'email' => 'contact@btplouis.fr', 'address' => '50 Zone Artisanale', 'city' => 'Nice'],
            ['name' => 'SARL Construction', 'phone' => '0688888888', 'email' => 'direction@construction-sarl.fr', 'address' => '100 Rue des Entrepreneurs', 'city' => 'Nantes'],
            ['name' => 'Client Divers', 'phone' => '0699999999', 'email' => 'client@divers.fr', 'address' => '1 Rue Quelconque', 'city' => 'Strasbourg'],
        ];

        foreach ($clients as $client) {
            Client::create($client);
        }
    }
}
