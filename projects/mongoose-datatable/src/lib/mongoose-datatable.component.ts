import { animate, style, transition, trigger } from '@angular/animations';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AsyncPipe, CommonModule, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IntersectionObserverModule } from 'ngx-intersection-observer';
import { debounceTime, Subscription } from 'rxjs';
import {
  DatasourceRequestColumn,
  DatasourceRequestOrder,
  MongooseDatatableColumn,
  MongooseDatatableColumnSearchType,
} from '../public-api';
import { DatagridDataSource } from './datasource';
import { MongooseDatatableOptions } from './types/datatable-options.type';

type UpdateColumn = Pick<MongooseDatatableColumn, 'columnDef' | 'header' | 'sticky' | 'hidden'>;

@Component({
  imports: [
    AsyncPipe,
    CommonModule,
    DragDropModule,
    FormsModule,
    IntersectionObserverModule,
    MatBadgeModule,
    MatButtonModule,
    MatFormFieldModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    NgIf,
    ReactiveFormsModule,
  ],
  selector: 'ngx-mat-mongoose-datatable',
  templateUrl: 'mongoose-datatable.component.html',
  styleUrl: 'mongoose-datatable.component.scss',
  animations: [
    trigger('fade', [
      transition(':enter', [
        style({ opacity: 0 }), // initial
        animate('0.2s', style({ opacity: 1 })), // final
      ]),
      transition(':leave', [
        style({ opacity: 1 }), // initial
        animate('0.2s', style({ opacity: 0 })), // final
      ]),
    ]),
  ],
})
export class MongooseDatatableComponent<Record = any> implements OnInit, OnDestroy {
  @Input('options')
  options!: MongooseDatatableOptions<Record>;

  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;

  displayedColumns: string[] = [];
  dataSource!: DatagridDataSource<Record>;
  loaded = false;

  searchFormGroup!: FormGroup;

  private subscriptions = new Subscription();
  private changeDetectorRef = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (!this.options?.service) throw new Error(`missing mongoose datatable component service`);
    this.buildDisplayColumns();
    this.buildSearchFormGroup();
    this.dataSource = new DatagridDataSource<Record>(this.options.service);
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  load(intersect: boolean) {
    if (!intersect || this.loaded) return;
    this.loaded = true;
    this.subscriptions.add(this.paginator?.page.subscribe((value) => this.loadPage()));
    // this.subscriptions.add(this.dataSource!.connect().subscribe((data) => this.loadRows(data)));
    this.loadPage();
  }

  sortColumn(column: MongooseDatatableColumn) {
    if (column.sortable === false) return;
    if (!column.order) column.order = { index: this.options.columns.filter((c) => !!c.order).length, dir: 'asc' };
    else if (column.order.dir === 'asc') column.order.dir = 'desc';
    else {
      delete column.order;
      this.consolidateOrderIndex();
    }
    this.paginator!.pageIndex = 0;
    this.loadPage();
  }

  loadPage() {
    console.warn('loadPage');
    const columns = this.buildRequestColumns();
    const order: DatasourceRequestOrder[] = [];
    this.options.columns
      .filter((c) => !!c.order)
      .sort((c1, c2) => c1.order!.index - c2.order!.index)
      .forEach((c) => {
        const index = columns.findIndex((column) => column.name === c.columnDef);
        if (index !== -1) order.push({ column: index, dir: c.order!.dir });
      });
    this.dataSource.loadData({
      draw: Date.now().toString(),
      columns,
      start: this.paginator!.pageIndex,
      length: this.paginator!.pageSize,
      order,
    });
  }

  updateColumns: UpdateColumn[] = [];
  openUpdateColumnDisplay() {
    this.updateColumns = this.options.columns.map((column) => ({
      columnDef: column.columnDef,
      header: column.header,
      sticky: column.sticky,
      hidden: column.hidden,
    }));
  }

  reorderColumns(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.updateColumns, event.previousIndex, event.currentIndex);
  }

  closeUpdateColumnDisplay() {
    let reload = false;
    this.updateColumns.forEach((updated, index) => {
      const columnIndex = this.options.columns.findIndex((c) => c.columnDef === updated.columnDef);
      if (columnIndex == -1) return;
      if (columnIndex !== index) moveItemInArray(this.options.columns, index, columnIndex);
      const column = this.options.columns[columnIndex];
      if (updated.sticky !== column.sticky) column.sticky = updated.sticky;
      if (updated.hidden !== column.hidden) {
        column.hidden = updated.hidden;
        reload = reload || !updated.hidden;
      }
    });
    this.buildDisplayColumns();
    if (reload) this.loadPage();
  }

  private buildRequestColumns(): DatasourceRequestColumn[] {
    const columns: DatasourceRequestColumn[] = [];
    this.options.columns.forEach((c) => {
      if (c.hidden) return;
      const column: DatasourceRequestColumn = { data: c.property, name: c.columnDef };
      if (c.searchable) this.addRequestColumnSearch(c.searchable, column, this.searchFormGroup.controls[c.columnDef]);
      columns.push(column);
    });
    return columns;
  }

  private addRequestColumnSearch(
    type: MongooseDatatableColumnSearchType,
    column: DatasourceRequestColumn,
    control: AbstractControl
  ) {
    switch (type) {
      default:
        if (control.value && control.value.length) {
          column.search = { value: control.value, regex: true };
        }
    }
  }

  private buildDisplayColumns() {
    const displayedColumns: string[] = [];
    this.options.columns.forEach((column) => {
      if (column.hidden) return;
      displayedColumns.push(column.columnDef);
    });
    this.displayedColumns = displayedColumns;
  }

  private buildSearchFormGroup() {
    this.searchFormGroup = new FormGroup(
      this.options.columns.reduce((controls, column) => {
        if (column.searchable) controls[column.columnDef] = new FormControl({ value: undefined, disabled: false });
        return controls;
      }, {} as any)
    );
    console.log(this.searchFormGroup);
    this.subscriptions.add(
      this.searchFormGroup.valueChanges.pipe(debounceTime(500)).subscribe((value) => {
        this.paginator!.pageIndex = 0;
        this.loadPage();
      })
    );
  }

  private consolidateOrderIndex() {
    let index = 0;
    this.options.columns
      .filter((c) => !!c.order)
      .sort((c1, c2) => c1.order!.index - c2.order!.index)
      .forEach((c) => (c.order!.index = index++));
  }
}
