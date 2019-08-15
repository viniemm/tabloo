import { createRoot, createState, createEffect, onCleanup } from 'solid-js';
import { For } from 'solid-js/dom';
import { ForIndex } from './ForIndex';

import { StoreInterface, DataFetchOptions, TableData, ColumnData } from "./store";

import {
  IconLongArrowAltUp, IconLongArrowAltDown,
  IconSortAmountUp, IconSortAmountDown,
} from "./Icons";


type Value = string | number;

function transformToString(x: Value) {
  if (x != undefined) {
    return x.toString();
  } else {
    return "-"
  }
}

function transformFloatToString(digits: number, x: number) {
  if (x != undefined) {
    // TODO: handle limitations of toFixed
    return x.toFixed(digits);
  } else {
    return "-"
  }
}

interface ColumnFormatter {
  format: (x: Value) => string
  align: number
}

function analyzeColumn(data: Value[]): ColumnFormatter {
  let allNull = true;
  let allNumbers = true;
  let allInteger = true;
  let hasExponetials = false;

  let absMax = -Infinity;
  let absMin = +Infinity;

  let maxDecimalPlacesR = 0;
  let maxDecimalPlacesL = 0;

  for (let i=0; i<data.length; i++) {
    let value = data[i];

    if (value != undefined) {
      allNull = false;
    }

    if (typeof value === "string") {
      allNumbers = false;
      allInteger = false;
      break;
    } else if (typeof value === "number") {
      if (!Number.isInteger(value)) {
        allInteger = false;
      }

      let absValue = Math.abs(value as number)
      if (absValue > absMax) {
        absMax = absValue;
      }
      if (absValue < absMin) {
        absMin = absValue;
      }

      let valueString = (value > 0 ? value.toString() : (-value).toString());
      if (valueString.includes("e")) {
        hasExponetials = true;
        // TODO
      } else if (valueString.includes(".")) {
        let split = valueString.split(".");
        let decL = split[0].length;
        let decR = split[1].length;
        if (decL > maxDecimalPlacesL) {
          maxDecimalPlacesL = decL;
        }
        if (decR > maxDecimalPlacesR) {
          maxDecimalPlacesR = decR;
        }
      }
    }
  }
  // console.log(maxDecimalPlacesL, maxDecimalPlacesR)

  if (allNumbers && !allInteger && !hasExponetials) {
    let maxDigits = 6;
    let digits = maxDigits - maxDecimalPlacesL + 1;
    if (digits < 1) {
      digits = 1;
    }
    return {
      format: transformFloatToString.bind(null, digits) as (x: Value) => string,
      align: +1,
    }
  } else if (allInteger) {
    return {
      format: transformToString,
      align: +1,
    }
  } else {
    return {
      format: transformToString,
      align: -1,
    }
  }

}

/**
 * Transformation from columnar to row-wise data.
 */
function transformData(data: TableData): Value[][] {
  const numCols = data.length;
  if (numCols === 0) {
    return [];
  }
  const numRows = data[0].values.length;
  console.log(numRows, numCols);

  // we need to convert from columnar to row-wise data
  let rowsData = Array(numRows) as Value[][];
  for (let i=0; i<numRows; i++) {
    let rowData = Array(numCols) as Value[];
    for (let j=0; j<numCols; j++) {
      let value = data[j].values[i];
      rowData[j] = value;
    }
    rowsData[i] = rowData;
  }
  console.log(rowsData);
  return rowsData;
}


interface ColHeader {
  name: string,
  sortKind: number,
}


function Table(props: {
    data: TableData,
    cbSort: (sortKind: number, columnIndex?: number) => void,
  }) {

  const [state, setState] = createState({
    rowsData: [] as Value[][],
    headerData: [] as ColHeader[],
    sortColIndex: undefined as (number | undefined),
    sortColKind: 0,
  })

  let columnFormatters = [] as ColumnFormatter[];

  createEffect(() => {
    console.log("Data updated", props.data)
    console.log("Data updated", props.data.length)
    const data = props.data
    if (data.length == 0) {
      return;
    }

    // update column formatters
    let numCols = data.length;
    columnFormatters.length = numCols;
    for (let j=0; j<numCols; j++) {
      columnFormatters[j] = analyzeColumn(data[j].values);
    }

    let rowsData = transformData(props.data);
    setState({rowsData: rowsData})

    let headerData = data.map((x: ColumnData) => ({
      name: x.columnName,
      sortKind: x.sortKind,
      //onsort: () => { this.props.onsort(x.columnName) }
    }))
    setState({headerData: headerData})

  })

  createEffect(() => {
    console.log("Rowsdata updated", state.rowsData)
    console.log("Rowsdata updated", state.rowsData.length)
  })

  createEffect(() => {
    console.log("headerData updated", state.headerData)
    console.log("headerData updated", state.headerData.length)
  })

  createEffect(() => {
    console.log("Updated sortColIndex", state.sortColIndex)
  })
  createEffect(() => {
    console.log("Updated sortColKind", state.sortColKind)
  })

  function sortByCol(name: string, index: number) {
    console.log("Sorting by column:", name, index, state.sortColIndex, state.sortColKind)
    if (state.sortColIndex !== index || state.sortColKind == 0) {
      props.cbSort(1, index)
      setState({
        sortColIndex: index,
        sortColKind: 1,
      })
    } else {
      if (state.sortColKind == 1) {
        props.cbSort(-1, index)
        setState({
          sortColKind: -1,
        })
      } else {
        props.cbSort(0, undefined)
        setState({
          sortColKind: 0,
        })
      }
    }
  }

  function renderSymbol(name: string, sortKind: number) {
    if (sortKind == 0) {
      return <>
        <IconLongArrowAltUp/>
        <IconLongArrowAltDown/>
      </>
    } else if (sortKind < 0) {
      return <IconSortAmountDown/>
    } else {
      return <IconSortAmountUp/>
    }
  }

  return (
    <table class={"table is-striped is-narrow is-hoverable is-bordered compact-table"}>
      <thead>
        <tr>
          <ForIndex each={(state.headerData)}>
            {(colHeader: ColHeader, index: () => number) =>
              <th>
                <div class="column-header">
                  <span>
                    {colHeader.name}
                  </span>
                  <a
                    class="th-sort-symbol"
                    onclick={(event) => sortByCol(colHeader.name, index())}
                    onmousedown={(event) => event.preventDefault() /* to prevent header selection*/}
                  >
                    {(renderSymbol(colHeader.name, state.sortColIndex == index() ? state.sortColKind : 0))}
                  </a>
                </div>
              </th>
            }
          </ForIndex>
        </tr>
      </thead>
      <tbody>
        <For each={(state.rowsData as string[][] /* FIXME, why does the wrapper type fail with nested array? */)} fallback={<div>empty</div>}>
          { (row: string[]) =>
            <tr>
              <ForIndex each={(row)}>
                { (x: Value, j: () => number) =>
                  <td class={(columnFormatters[j()].align > 0 ? "has-text-right" : undefined)}>{columnFormatters[j()].format(x)}</td>
                }
              </ForIndex>
            </tr>
          }
        </For>
      </tbody>
    </table>
  )
}


interface PaginationData {
  numPages: number
  currentPage: number
  onPaginate: (i: number) => void
}

function Pagination(props: PaginationData) {

  function constructPageArray(n: number, current: number): Array<number | undefined> {
    if (n <= 10) {
      return Array.from(Array(props.numPages).keys());
    } else {
      if (current <= 2) {
        return [0, 1, 2, 3, undefined, n-1];
      } else if (current >= n-3) {
        return [0, undefined, n-4, n-3, n-2, n-1];
      } else {
        return [0, undefined, current-1, current, current+1, undefined, n-1];
      }
    }
  }

  return (
    <nav class="pagination is-small">
      <ul class="pagination-list">
        <For each={(constructPageArray(props.numPages, props.currentPage))}>{
          i => {
            if (typeof i === "number") {
              return (
                <li>
                  <a
                    class={("pagination-link" + (i === props.currentPage ? " is-current" : ""))}
                    onclick={() => props.onPaginate(i)}
                  >
                    {i+1}
                  </a>
                </li>
              );
            } else {
              return (
                <li>
                  <span class="pagination-ellipsis">&hellip;</span>
                </li>
              );
            }
          }
        }</For>
      </ul>
    </nav>
  );
}

export function TableHandler(props: {
    store: StoreInterface
  }) {

  const { store } = props

  const [state, setState] = createState({
    tableData: [] as TableData,
    sortKind: 0,
    sortColumn: undefined as (string|undefined),
    filter: "",
    pagination: {
      numPages: 0,
      currentPage: 0
    } as PaginationData
  })

  initialize()

  async function initialize() {
    await fetchNumPages()
    await fetchData()
  }

  async function fetchNumPages() {
    let numPages = await store.fetchNumPages(20, state.filter)
    console.log("num pages:", numPages)
    setState({
      pagination: {
        numPages: numPages,
        currentPage: 0,
      }
    })
  }

  async function fetchData() {
    const dataFetchOptions = {
      sortKind: state.sortKind,
      sortColumn: state.sortColumn,
      paginationSize: 20,
      page: state.pagination.currentPage,
      filter: state.filter,
    }
    let data = await store.fetchData(dataFetchOptions)
    setState({tableData: data})
  }

  function cbSort(sortKind: number, columnIndex?: number) {
    setState({sortKind: sortKind})
    if (columnIndex != null) {
      setState({sortColumn: state.tableData[columnIndex].columnName})
    }
    fetchData()
  }

  let inputFilter: HTMLInputElement | undefined

  function onFilter(event: Event) {
    let value = (event.target as HTMLInputElement).value.trim();
    console.log(value);
  }

  function onFilterKeydown(event: KeyboardEvent) {
    console.log(event.keyCode);
    if (event.keyCode === 13 && inputFilter != undefined) {
      setState({filter: inputFilter.value.trim()})
      fetchNumPages()
      fetchData()
    }
  }

  function onPaginate(i: number) {
    setState({
      pagination: {
        currentPage: i,
        numPages: state.pagination.numPages,
      }
    })
    fetchData()
  }

  return (<>
    <div>
      <input
        placeholder="Filter..."
        oninput={onFilter}
        onkeydown={onFilterKeydown}
        ref={inputFilter}
      />
    </div>
    <Table data={(state.tableData)} cbSort={cbSort}/>
    <Pagination
      numPages={(state.pagination.numPages)}
      currentPage={(state.pagination.currentPage)}
      onPaginate={onPaginate}
    />
  </>)
}