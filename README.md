# jquery.selectMe.js

## Description
jQuery-plugin to replace large &lt;select&gt; elements with a neat and searchable solution.

## HowTo
```javascript
$('select').selectMe();

$('select').selectMe({
    width: '100%',
    columnCount: 2,
    search: true,
    locale: 'en',
    localeResource: { 
        'en': {
            none: 'None selected',
            from: 'from',
            search: 'Search',
            selectAll: 'Select all',
            unselectAll: 'Unselect all',
            showSelected: 'Show selected',
        } 
    },
    // Callbacks
    onLoad: function( element ) {},
    onDropdownOpen: function( element ) {},
    onDropdownClose: function( element ) {},
    onSearch: function( element ) {},
    onOptionValueChanged: function( element ) {},
});

$.fn.selectMe.getSummaryText = function(selectedOptionsArray, allOptionsCount, messageSource) {
    return 'your individual placeholder text'; // something like '1 from 10' or 'SelectedTextOne, SelectedTextTwo, ...'
}
```

## Download
You can download via npm
```
npm i jquery-selectme
```
Visit [https://www.npmjs.com/package/jquery-selectme]
