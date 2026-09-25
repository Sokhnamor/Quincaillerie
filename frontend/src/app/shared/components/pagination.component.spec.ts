import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;
  let component: PaginationComponent;

  const setup = (page: number, lastPage: number, total = 100) => {
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('lastPage', lastPage);
    fixture.componentRef.setInput('total', total);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PaginationComponent] });
    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
  });

  it('shows every page when there are few', () => {
    setup(2, 3);
    expect(component.pages()).toEqual([1, 2, 3]);
  });

  it('collapses distant pages into ellipses (0)', () => {
    setup(5, 10);
    expect(component.pages()).toEqual([1, 0, 4, 5, 6, 0, 10]);
  });

  it('emits the requested page but ignores out-of-range or current pages', () => {
    setup(1, 4);
    const emitted: number[] = [];
    component.pageChange.subscribe(p => emitted.push(p));

    component.go(2);
    component.go(1);
    component.go(0);
    component.go(5);

    expect(emitted).toEqual([2]);
  });

  it('renders nothing when the list is empty', () => {
    setup(1, 1, 0);
    expect(fixture.nativeElement.querySelector('.pagination')).toBeNull();
  });
});
