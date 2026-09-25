<?php

use App\Http\Controllers\Api\AssistantController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\CashClosingController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
| Roles
|  - admin        : everything, including users and settings
|  - gestionnaire : catalogue, stock, purchases, sale cancellation, exports
|  - caissier     : point of sale, sales, payments, returns, quotes, clients, cash closing
*/

// Public: login only (5 attempts per minute per IP)
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    // Session & profile
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::get('/settings', [SettingController::class, 'index']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/charts', [DashboardController::class, 'charts']);
    Route::get('/dashboard/recent-sales', [DashboardController::class, 'recentSales']);
    Route::get('/dashboard/alerts', [DashboardController::class, 'alerts']);

    // Catalogue (read for everyone)
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/all', [CategoryController::class, 'all']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);
    Route::get('/suppliers', [SupplierController::class, 'index']);
    Route::get('/suppliers/all', [SupplierController::class, 'all']);
    Route::get('/suppliers/{supplier}', [SupplierController::class, 'show']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/for-sale', [ProductController::class, 'forSale']);
    Route::get('/products/{product}', [ProductController::class, 'show']);

    // Clients (cashiers can register clients at the counter)
    Route::get('/clients', [ClientController::class, 'index']);
    Route::get('/clients/all', [ClientController::class, 'all']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::get('/clients/{client}', [ClientController::class, 'show']);
    Route::put('/clients/{client}', [ClientController::class, 'update']);

    // Sales (static paths before {sale})
    Route::get('/sales', [SaleController::class, 'index']);
    Route::get('/sales/summary', [SaleController::class, 'summary']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{sale}', [SaleController::class, 'show'])->whereNumber('sale');
    Route::put('/sales/{sale}', [SaleController::class, 'update'])->whereNumber('sale');
    Route::post('/sales/{sale}/payments', [SaleController::class, 'addPayment'])->whereNumber('sale');
    Route::get('/sales/{sale}/pdf', [SaleController::class, 'generatePdf'])->whereNumber('sale');
    Route::post('/sales/{sale}/returns', [SaleController::class, 'storeReturn'])->whereNumber('sale');
    Route::get('/sales/{sale}/returns/{saleReturn}/pdf', [SaleController::class, 'returnPdf'])->whereNumber('sale');

    // Quotes / pro forma
    Route::get('/quotes', [QuoteController::class, 'index']);
    Route::post('/quotes', [QuoteController::class, 'store']);
    Route::get('/quotes/{quote}', [QuoteController::class, 'show']);
    Route::put('/quotes/{quote}', [QuoteController::class, 'update']);
    Route::delete('/quotes/{quote}', [QuoteController::class, 'destroy']);
    Route::post('/quotes/{quote}/convert', [QuoteController::class, 'convert']);
    Route::get('/quotes/{quote}/pdf', [QuoteController::class, 'pdf']);

    // Management assistant (rules engine, or Claude when configured)
    Route::get('/assistant/welcome', [AssistantController::class, 'welcome']);
    Route::post('/assistant', [AssistantController::class, 'ask'])->middleware('throttle:' . config('assistant.rate_limit', 20) . ',1');

    // Cash register closing
    Route::get('/cash-closings/summary', [CashClosingController::class, 'summary']);
    Route::get('/cash-closings', [CashClosingController::class, 'index']);
    Route::post('/cash-closings', [CashClosingController::class, 'store']);

    // Management: admin + gestionnaire
    Route::middleware('role:admin,gestionnaire')->group(function () {
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        Route::post('/suppliers', [SupplierController::class, 'store']);
        Route::put('/suppliers/{supplier}', [SupplierController::class, 'update']);
        Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy']);

        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::post('/products/{product}/adjust-stock', [ProductController::class, 'adjustStock']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);

        Route::get('/stock-movements', [StockMovementController::class, 'index']);

        Route::get('/purchases', [PurchaseController::class, 'index']);
        Route::post('/purchases', [PurchaseController::class, 'store']);
        Route::get('/purchases/{purchase}', [PurchaseController::class, 'show']);
        Route::put('/purchases/{purchase}', [PurchaseController::class, 'update']);
        Route::delete('/purchases/{purchase}', [PurchaseController::class, 'destroy']);

        Route::delete('/sales/{sale}', [SaleController::class, 'destroy'])->whereNumber('sale');
        Route::get('/sales/export/excel', [SaleController::class, 'exportExcel']);
        Route::get('/sales/export/pdf', [SaleController::class, 'exportPdf']);

        Route::get('/reports/summary', [ReportController::class, 'summary']);
        Route::get('/reports/export', [ReportController::class, 'export']);
    });

    // Administration: admin only
    Route::middleware('role:admin')->group(function () {
        Route::delete('/clients/{client}', [ClientController::class, 'destroy']);

        Route::get('/users', [UserController::class, 'index']);
        Route::get('/roles', [UserController::class, 'roles']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);

        Route::put('/settings', [SettingController::class, 'update']);

        Route::delete('/sales/{sale}/payments/{payment}', [SaleController::class, 'deletePayment'])->whereNumber('sale');

        Route::get('/backups', [BackupController::class, 'index']);
        Route::post('/backups', [BackupController::class, 'store']);
        Route::get('/backups/{name}', [BackupController::class, 'download']);
    });
});
