/** @format */

import { Component, Input } from '@angular/core';
import { clone, deburr, filter, includes, map, orderBy, slice, toLower, trim, uniqBy } from 'lodash-es';
import { of } from 'rxjs';
import {
  DatasourceService,
  MongooseDatatableColumn,
  MongooseDatatableOptions,
} from '../../projects/mongoose-datatable/src/public-api';

const DATA: any[] = [];
let i = 0;
while (i++ < 100) {
  DATA.push({
    label: `Label ${i}`,
    number: i,
    reference: `Référence ${i}`,
    checkbox: (() => {
      const rand = Math.random();
      return (
        rand < 0.33 ? true
        : rand < 0.66 ? false
        : undefined
      );
    })(),
    autocomplete: (() => {
      const rand = Math.round(Math.random() * 100);
      return `option ${rand}`;
    })(),
    template: `Template ${i}`,
    templateSearch: i,
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  });
}

const service: DatasourceService<any> = options => {
  let data = clone(DATA).filter(d => {
    for (let c of options.columns) {
      if (!c.search) continue;
      if (c.search.regex && !deburr(toLower(trim(d[c.data]))).includes(deburr(toLower(trim(c.search.value))))) {
        return false;
      }
      if (!c.search.regex && d[c.data] !== c.search.value) return false;
    }
    return true;
  });
  if (options.order) {
    data = orderBy(
      data,
      map(options.order, o => options.columns[o.column].data),
      map(options.order, 'dir')
    );
  }
  const recordsFiltered = data.length;
  data = data.slice(options.start! * options.length!, (options.start! + 1) * options.length!);
  console.log('service', options, data);
  return new Promise(resolve => {
    setTimeout(() => resolve({ draw: options.draw, recordsTotal: DATA.length, recordsFiltered, data }), 300);
  });
};

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  datatableOptions: MongooseDatatableOptions<any> = {
    service,
    pageSizeOptions: [10, 20, 50, 100],
    pageSizeOptionsIndex: 1,
    actions: {
      columns: {
        hideAndShow: true,
        sticky: true,
        reorder: true,
      },
      refresh: true,
    },
    columnMinWith: 120,
    columns: [
      {
        type: 'text',
        columnDef: 'label',
        header: 'Label',
        property: 'label',
        sticky: true,
        sortable: true,
        searchable: true,
        order: { index: 0, dir: 'asc' },
      },
      {
        type: 'number',
        columnDef: 'number',
        header: 'Number',
        property: 'number',
        sticky: true,
        sortable: true,
        searchable: true,
      },
      {
        type: 'select',
        columnDef: 'reference',
        header: 'Référence',
        property: 'reference',
        minWidth: 400,
        searchable: true,
        sortable: true,
        options: of(
          DATA.map(d => ({ value: d.reference, label: d.reference, color: 'red', icon: 'home', iconColor: 'blue' }))
        ),
      },
      {
        type: 'autocomplete',
        columnDef: 'autocomplete',
        header: 'Autocomplete',
        property: 'autocomplete',
        minWidth: 400,
        searchable: true,
        sortable: true,
        placeholder: 'Sélectionnez une option',
        loadOnFocus: true,
        options: async (limit, skip, search) => {
          return new Promise(resolve => {
            setTimeout(
              () =>
                resolve(
                  slice(
                    orderBy(
                      filter(
                        uniqBy(
                          map(DATA, d => ({
                            value: d.autocomplete,
                            label: d.autocomplete,
                            color: 'blue',
                            icon: 'home',
                            iconColor: 'red',
                          })),
                          'value'
                        ),
                        d => includes(d.value, search)
                      ),
                      ['label', 'asc']
                    ),
                    skip,
                    skip + limit
                  )
                ),
              500
            );
          });
        },
      },
      {
        type: 'checkbox',
        columnDef: 'checkbox',
        header: 'Checkbox',
        property: 'checkbox',
        searchable: true,
      },
      {
        type: 'text',
        columnDef: 'template',
        header: 'Template',
        property: 'template',
        searchable: true,
        searchProperty: 'templateSearch',
        sortable: true,
        sortProperty: 'templateSearch',
        cellComponent: ComponentCellComponent,
      },
      {
        type: 'text',
        columnDef: 'description',
        header: 'Description',
        property: 'description',
        minWidth: 400,
      },
    ],
  };
}

@Component({
  template: '<span>Template component : {{value}}</span>',
  standalone: true,
})
export class ComponentCellComponent {
  @Input()
  column!: MongooseDatatableColumn;

  @Input()
  row: any;

  @Input()
  value: any;
}
