<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Outillage', 'description' => 'Outils manuels et électriques'],
            ['name' => 'Quincaillerie', 'description' => 'Visserie, boulonnerie, charnières'],
            ['name' => 'Peinture', 'description' => 'Peintures, vernis, pinceaux'],
            ['name' => 'Plomberie', 'description' => 'Tuyaux, robinets, raccords'],
            ['name' => 'Électricité', 'description' => 'Câbles, interrupteurs, prises'],
            ['name' => 'Bâtiment', 'description' => 'Ciment, sable, briques'],
            ['name' => 'Jardinage', 'description' => 'Outils de jardin, semis'],
            ['name' => 'Sécurité', 'description' => 'Gants, casques, bottes'],
            ['name' => 'Auto', 'description' => 'Pièces automobiles, liquides'],
            ['name' => 'Divers', 'description' => 'Articles divers'],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
