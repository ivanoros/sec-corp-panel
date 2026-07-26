import { themeQuartz } from 'ag-grid-community';

export const FUNDING_GRID_THEME = themeQuartz.withParams({
  accentColor: '#65b7b1',
  backgroundColor: '#1b1d1e',
  borderColor: '#45494a',
  cellFontFamily: ['Inter', 'Segoe UI', 'sans-serif'],
  cellFontSize: 12,
  cellHorizontalPadding: 10,
  cellTextColor: '#f1f3f3',
  columnBorder: {
    color: '#45494a',
    style: 'solid',
    width: 1,
  },
  foregroundColor: '#f1f3f3',
  headerBackgroundColor: '#393d3e',
  headerColumnBorder: {
    color: '#505455',
    style: 'solid',
    width: 1,
  },
  headerFontFamily: ['Inter', 'Segoe UI', 'sans-serif'],
  headerFontSize: 12,
  headerFontWeight: 650,
  headerTextColor: '#f5f6f6',
  oddRowBackgroundColor: '#232526',
  rowBorder: {
    color: '#353839',
    style: 'solid',
    width: 1,
  },
  rowHoverColor: 'transparent',
  selectedRowBackgroundColor: 'transparent',
  spacing: 4,
  wrapperBorder: false,
  wrapperBorderRadius: 0,
});
