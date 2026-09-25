import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PosComponent } from './pos.component';
import { Client, Product } from '../../core/models';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 1, name: 'Sac de ciment', reference: 'CIM-50', unit: 'sac', purchase_price: 3000, selling_price: 4000,
  wholesale_price: 3600, wholesale_min_qty: 10, stock: 100, alert_threshold: 5, stock_status: 'in_stock',
  category_id: 1, supplier_id: null, ...overrides,
});

describe('PosComponent (pricing & totals)', () => {
  let fixture: ComponentFixture<PosComponent>;
  let pos: PosComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations()],
    });
    fixture = TestBed.createComponent(PosComponent);
    pos = fixture.componentInstance;
    // ngOnInit is not triggered: no HTTP call is made
    pos.taxRate.set(18);
  });

  afterEach(() => TestBed.inject(HttpTestingController).match(() => true));

  it('uses the retail price for a walk-in customer', () => {
    pos.add(product());
    expect(pos.cart()[0].unit_price).toBe(4000);
  });

  it('switches to the wholesale price from the wholesale quantity', () => {
    pos.add(product());
    pos.setQty(0, 10);
    expect(pos.cart()[0].unit_price).toBe(3600);

    pos.setQty(0, 9);
    expect(pos.cart()[0].unit_price).toBe(4000);
  });

  it('gives professional clients the wholesale price', () => {
    const pro: Client = { id: 7, name: 'BTP Sall', type: 'professionnel', balance_due: 0, credit_limit: null };
    pos.clients.set([pro]);
    pos.add(product());
    pos.setClient(7);
    expect(pos.cart()[0].unit_price).toBe(3600);
  });

  it('keeps a price typed by the cashier', () => {
    pos.add(product());
    pos.setPrice(0, 3800);
    pos.setQty(0, 20);
    expect(pos.cart()[0].unit_price).toBe(3800);
  });

  it('computes tax, discount and total', () => {
    pos.add(product({ wholesale_price: null }));
    pos.setQty(0, 2); // 8 000 HT
    pos.discount.set(440);
    expect(pos.subtotal()).toBe(8000);
    expect(pos.tax()).toBe(1440);
    expect(pos.total()).toBe(9000);
  });

  it('does not exceed the available stock', () => {
    pos.add(product({ stock: 3 }));
    pos.setQty(0, 50);
    expect(pos.cart()[0].quantity).toBe(3);
  });

  it('detects a credit sale above the client credit limit', () => {
    pos.clients.set([{ id: 3, name: 'Moussa', type: 'particulier', balance_due: 8000, credit_limit: 10000 }]);
    pos.setClient(3);
    pos.add(product({ wholesale_price: null, selling_price: 5000 })); // 5 900 TTC
    pos.received.set(0);
    expect(pos.availableCredit()).toBe(2000);
    expect(pos.creditExceeded()).toBeTrue();

    pos.received.set(4000); // 1 900 on credit
    expect(pos.creditExceeded()).toBeFalse();
  });
});
