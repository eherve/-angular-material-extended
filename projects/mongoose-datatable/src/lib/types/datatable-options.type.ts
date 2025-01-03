/** @format */

import { DatasourceService } from './datasource-service.type';
import { MongooseDatatableColumn } from './datatable-column.type';

export type MongooseDatatableOptions<Record> = {
  service: DatasourceService<Record>;

  columns: MongooseDatatableColumn[];
  columnMinWith?: number;

  pageSizeOptions?: number[];
  pageSizeOptionsIndex?: number;

  actions?: {
    columns?: {
      tooltip?: string;
      hideAndShow?: boolean;
      sticky?: boolean;
      reorder?: boolean;
    };
    refresh?: boolean;
  };
};
