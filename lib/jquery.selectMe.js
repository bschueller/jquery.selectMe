/**
 * jQuery-plugin to replace large <select> elements with a neat and searchable solution.
 *
 * @Version: 	0.2.0
 * @Author: 	Benjamin Schueller <benjamin.schueller@gmail.com>
 * @License: 	MIT
 *
 * Usage:
 *     $('select').selectMe();
 *     
 *     $('select').selectMe({
 *         cssFile: '../lib/jquery.selectMe.css',
 *         width: '100%',
 *         columnCount: 3,
 *         search: true,
 *         locale: 'en',
 *         localeResource: { 
 *             'en': {
 *                 none: 'None selected',
 *                 from: 'from',
 *                 search: 'Search',
 *                 selectAll: 'Select all',
 *                 unselectAll: 'Unselect all',
 *                 showSelected: 'Show selected',
 *             } 
 *         },
 *         // Callbacks
 *         onLoad: function( element ) {},
 *         onDropdownOpen: function( element ) {},
 *         onDropdownClose: function( element ) {},
 *         onSearch: function( element ) {},
 *         onOptionValueChanged: function( element ) {},
 *     });
 *
 *     $.fn.selectMe.getSummaryText = function(selectedOptionsArray, allOptionsCount, messageSource) {
 *         return 'your individual placeholder text'; // something like '1 from 10' or 'SelectedTextOne, SelectedTextTwo, ...'
 *     }
 **/
(function ( $ ) {
 
	/*
	 * Plugin definition.
	 */
  $.fn.selectMe = function( options ) {
		
		// Extend our default options with those provided.
		// Note that the first argument to extend is an empty
		// object – this is to keep from overriding our "defaults" object.
    var opts = $.extend({}, $.fn.selectMe.defaults, options );
	
		// Add our css file to head
    if ($('head > link[href="' + opts.cssFile + '"]').length == 0) {
      $('head').append('<link rel="stylesheet" type="text/css" href="' + opts.cssFile + '" /> ');
    }
	
		// Our plugin implementation code goes here.
    return this.each(function() {
			var selectMe = new SelectMe(this, opts);
		});
  };
	
	/* 
	 * Plugin defaults – added as a property on our plugin function.
	 */
	$.fn.selectMe.defaults = {
		cssFile: '../lib/jquery.selectMe.css',
		width: '100%',
		columnCount: 1,
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
			},
			'de': {
				none: 'Keine ausgewählt',
				from: 'von',
				search: 'Suche',
				selectAll: 'Alle auswählen',
				unselectAll: 'Alle abwählen',
				showSelected: 'Nur ausgewählte',
			}
		},
		
		// Callbacks
		onLoad: function element ( element ) {},
		onDropdownOpen: function( element ) {},
		onDropdownClose: function( element ) {},
		onSearch: function( element ) {},
		onOptionValueChanged: function( element ) {},
	}
	
	/*
	 * This function is to create the text in the placeholder.
	 * It may be replaced with an own implementation.
	 */
	$.fn.selectMe.getSummaryText = function(selectedOptionsArray, allOptionsCount, messageSource, isMultiple) {
		if (isMultiple) {
			var selectedOptionsCount = selectedOptionsArray.length;
			if (selectedOptionsCount > 0) {
				return selectedOptionsCount + ' ' + messageSource.from + ' ' + allOptionsCount;
			}
			return messageSource.none;
		} else {
			return selectedOptionsArray[0];
		}
	}
	
	/*
	 * Constructor of a select element which should be replaced
	 */
	function SelectMe(element, options) {
		if (element.nodeName == 'SELECT') {
			this.$select = $(element).hide();
			this.$wrapper = null;
			this.$placeholder = null;
			this.$dropdown = null;
			this.$search = null;
			this.$options = null;
			
			this.$selectableElements = $([]);
			
			this.options = options;
			
			this._init();
			this.options.onLoad( this.$wrapper );
		}
	}
	
	/*
	 * Basic initialize function.
	 * It calls the sub initialize functions and do some basics.
	 */
	SelectMe.prototype._init = function() {
		var self = this;
		self._initWrapper();	
		
		$(document).on('click.ac-hideoptions', function( event ) {
			if( !$(event.target).closest(self.$wrapper).length ) {
				self.$wrapper.find('> .selectme-dropdown:visible').each(function(){
					self.closeDropdown();
				});
			}
		});
	}
	
	/*
	 * Create wrapper for our new select box
	 */
	SelectMe.prototype._initWrapper = function() {	
		var self = this;
		
		self.$wrapper = $('<div class="selectme-wrapper"></div>').insertAfter(self.$select);
		self.$wrapper.outerWidth(self.options.width);
		
		self.$wrapper.keydown(function(e) {
			var keycode = e.keyCode;
			if (keycode == 27 || keycode == 9) { // ESC || TAB
				self.closeDropdown();
				self.$placeholder.focus();
			}
		})
		
		self._initPlaceholder();
		self._initDropdown();
	}
	
	/*
	 * Render placeholder
	 */
	SelectMe.prototype._initPlaceholder = function() {
		var self = this;
		self.$placeholder = $('<button type = "button"></button>').appendTo(self.$wrapper);
		self._updatePlaceholderText();
		self.$placeholder.click(function() {
			if (self.$dropdown.is(':visible')) {
				self.closeDropdown();
			} else {
				self.openDropdown();
			}
		});
	}
	
	/*
	 * Render dropdown element
	 */
	SelectMe.prototype._initDropdown = function() {
		var self = this;
		self.$dropdown = $('<div class="selectme-dropdown"></div>').appendTo(self.$wrapper);
		
		self._initSearch();
		self._initShortcuts();
		self._initOptions();
		self._initOptionSelection();
	}
	
	/*
	 * Render shortcuts
	 */
	SelectMe.prototype._initShortcuts = function() {
		var self = this;
		if (self.isMultiple()) {
			var $shortcuts = $('<div class="selectme-shortcuts"></div>').appendTo(self.$dropdown);
			self._registerKeydownForFocusSearchField($shortcuts);
			
			var $selectall = $('<a href="#">' + self.getMessageSource().selectAll + '</a>').appendTo($shortcuts);
			$selectall.click(function(e) {
				e.preventDefault();
				self.$options.find('li:not(.optgroup):visible').each(function(){
					$(this).find('label > input').prop('checked', true).trigger("change");
				});
			});
			var $unselectall = $('<a href="#">' + self.getMessageSource().unselectAll + '</a>').appendTo($shortcuts);
			$unselectall.click(function(e) {
				e.preventDefault();
				self.$options.find('li:not(.optgroup):visible').each(function(){
					$(this).find('label > input').prop('checked', false).trigger("change");
				});
			});
			var $showSelected = $('<a href="#">' + self.getMessageSource().showSelected + '</a>').appendTo($shortcuts);
			$showSelected.click(function(e) {
				e.preventDefault();
				self.$options.find('li:not(.optgroup)').each(function(){
					var $option = $(this).find('input');
					if ($option.is(':checked')) {
						$(this).show();
						var $optGroup = $(this).closest('.optgroup');
            if ($optGroup) {
              $optGroup.show();
            }
					} else {
						$(this).hide();
						var $optGroup = $(this).closest('.optgroup');
            if ($optGroup && $optGroup.find('li:visible').length == 0) {
              $optGroup.hide();
            }
					}
				});
			});
		}
	}
	
	/*
	 * Render search field
	 */
	SelectMe.prototype._initSearch = function() {
		var self = this;
		if (self.options.search) {
			var $searchWrapper = $('<div class="selectme-search"></div>').appendTo(self.$dropdown);
			self.$search = $('<input type="text" value="" placeholder="' + self.getMessageSource().search + '" />').appendTo($searchWrapper);
			
			self.$search.focus(function() {
				if (!self.$search.is(':visible')) {
					self.openDropdown();
				}
			});
			
			self.$search.on('keyup', function(){
				self.options.onSearch( this );
				
				// search non optgroup li's
				self.$options.find('li:not(.optgroup)').each(function(){
					var optText = $(this).text();

					// show option if string exists
					if( optText.toLowerCase().indexOf( self.$search.val().toLowerCase() ) > -1 ) {
						$(this).show();
					  var $optGroup = $(this).closest('.optgroup');
						if ($optGroup) {
						  $optGroup.show();
						}
					}
					// don't hide selected items
					else {
						$(this).hide();
						var $optGroup = $(this).closest('.optgroup');
						if ($optGroup && $optGroup.find('li:visible').length == 0) {
						  $optGroup.hide();
						}
					}
				});
			});
		}
	}
	
	/*
	 * Render options in our select box
	 */
	SelectMe.prototype._initOptions = function() {
		var self = this;
		
		self.$options = $('<ul></ul>').appendTo(self.$dropdown);
		
		self.$options.css({
			'column-count'        : self.options.columnCount,
			'column-gap'          : 0,
			'-webkit-column-count': self.options.columnCount,
			'-webkit-column-gap'  : 0,
			'-moz-column-count'   : self.options.columnCount,
			'-moz-column-gap'     : 0
		});
		
		var options = self._resolveOptions(self.$select);
		var fieldName = self.randomString();
		
		self._insertOptions(self.$options, options, fieldName);
		
		self._registerKeydownForFocusSearchField(self.$options);
	}
	
	/*
	 * Make options selectable via arrows up and down
	 */
	SelectMe.prototype._initOptionSelection = function() {
		var self = this;
		self.$wrapper.keydown(function(e) {
			var $selected = $(this).find('.selectme-marked');
			if (e.keyCode == 38) { // up
				self.$options.find('li').removeClass('selectme-marked')
				if ($selected.length == 0) {
					$selected = self.$selectableElements.filter( ':visible' ).last();
				} else if ($selected.is(self.$selectableElements.filter( ':visible' ).first())) {
				  $selected = self.$selectableElements.filter( ':visible' ).last();
				} else {
				  var index = self.$selectableElements.filter(':visible').index($selected);
          $selected = self.$selectableElements.filter(':visible').eq(index - 1);
				}
				$selected.addClass('selectme-marked');
        $selected.find('label').focus();
				e.preventDefault();
			} else if (e.keyCode == 40) { // down
				self.$options.find('li').removeClass('selectme-marked');
				if ($selected.length == 0) {
					$selected = self.$selectableElements.filter( ':visible' ).first();
				} else if ($selected.is(self.$selectableElements.filter( ':visible' ).last())) {
					$selected = self.$selectableElements.filter( ':visible' ).first();
				} else {
				  var index = self.$selectableElements.filter(':visible').index($selected);
					$selected = self.$selectableElements.filter(':visible').eq(index + 1);
				}
				$selected.addClass('selectme-marked');
        $selected.find('label').focus();
				e.preventDefault();
			} else if (e.keyCode == 13) { // enter
				if (self.$dropdown.is(':visible')) {
					self.closeDropdown();
					self.$placeholder.focus();
					e.preventDefault();
				}
			}
		});
	}
	
	/*
	 * Resolve options from this element
	 */
	SelectMe.prototype._resolveOptions = function($element) {
		var self = this;
		var options = [];
		$element.children().each(function(){
			if( this.nodeName == 'OPTION' ) {
				options.push({
					name      : $(this).text(),
					value     : $(this).val(),
					checked   : $(this).prop( 'selected' )
				});
			} if( this.nodeName == 'OPTGROUP' ) {
				options.push({
					name      : $(this).prop('label'),
					options	  : self._resolveOptions($(this))
				});
			} else {
				// bad option
				return true;
			}
		});
		return options;
	}
		
	SelectMe.prototype._insertOptions = function( $element, options, fieldName ) {
		var self = this;
		for( var key in options ) {
			// Prevent prototype methods injected into options from being iterated over.
			if( !options.hasOwnProperty( key ) ) {
				continue;
			}

			var thisOption      = options[ key ];
			var $container       = $('<li></li>');

			if( thisOption.hasOwnProperty('value') ) { // option
				$container.text( thisOption.name );

				var $thisCheckbox = (self.isMultiple()) ? $('<input type="checkbox" value="" title="" />') : $('<input type="radio" name="' + fieldName + '" value="" title="" />');
				$thisCheckbox
					.val( thisOption.value )
					.prop( 'title', thisOption.name )
					.prop( 'checked', thisOption.checked )
					.change(function() {
						self.$select.find('option[value="' + $(this).val() + '"]').prop('selected', $(this).prop('checked'));
						self._updatePlaceholderText();
						self.options.onOptionValueChanged(this);
					});
				
				$container.prepend( $thisCheckbox );
				
				var $label = $('<label></label>');
				$label.prop('title', thisOption.name);
				$label.click(function() {
					self.$dropdown.find('li').removeClass('selectme-marked');
					$(this).parent().addClass('selectme-marked');
				});
				$container.wrapInner( $label );
				$element.append( $container );
				self.$selectableElements = self.$selectableElements.add($container);
			} else { // optgroup
			  var $label = $('<label>' + thisOption.name + '</label>');
				$label.prop('title', thisOption.name);
				$container.addClass('optgroup');
				$container.append( $label );
				var $innerOptions = $('<ul></ul>').appendTo($container);
				$element.append( $container );
				self._insertOptions($innerOptions, thisOption.options, fieldName);
			}
				}
	}
	
	/*
	 * Keydown event for jumping to search field if a valid key is pressed
	 */
	SelectMe.prototype._registerKeydownForFocusSearchField = function(element) {
		var self = this;
		if (self.options.search) {
			element.keydown(function(e) {
				var keycode = e.keyCode;
				var valid = 
					(keycode == 8)					 || // backspace
					(keycode > 47 && keycode < 58)   || // number keys
					(keycode > 64 && keycode < 91)   || // letter keys
					(keycode > 95 && keycode < 112)  || // numpad keys
					(keycode > 185 && keycode < 193) || // ;=,-./` (in order)
					(keycode > 218 && keycode < 223);   // [\]' (in order)

				
				if (valid) {
					self.$dropdown.find('> ul > li').removeClass('selectme-marked');
					self.$search.val('');
					self.$search.focus();
				}
			});
		}
	}
	
	/*
	 * Update text in the placeholder
	 */
	SelectMe.prototype._updatePlaceholderText = function() {
		var self = this;
		// get selected options
		var selOpts = [];
		self.$select.find('option:selected').each(function(){
			selOpts.push( $(this).text() );
		});
		// update placeholder text
		var allCount = self.$select.find('option').length;
		var placeholderText = $.fn.selectMe.getSummaryText(selOpts, allCount, self.getMessageSource(), self.isMultiple());
		self.$placeholder.text(placeholderText);
	}
	
	/*
	 * Open our dropdown element
	 */
	SelectMe.prototype.openDropdown = function() {
		var self = this;
		self.options.onDropdownOpen( self.$wrapper );
		self.$dropdown.show();
		if (self.options.search) {
			self.$search.focus();
		}
	}
	
	/*
	 * Close our dropdown element
	 */
	SelectMe.prototype.closeDropdown = function() {
		var self = this;
		self.options.onDropdownClose( self.$wrapper );
		self.$dropdown.hide();
	}
	
	/*
	 * Return message source for the configured language
	 */
	SelectMe.prototype.getMessageSource = function() {
		var self = this;
		var locale = self.options.locale;
		var messageSource = self.options.localeResource[locale];
		return messageSource;
	}
	
	/*
	 * Check if our select box has multiple selection active
	 */
	SelectMe.prototype.isMultiple = function() {
		return this.$select.prop('multiple');
	}
	
	/*
	 * Generate a random string with five digits
	 */
	SelectMe.prototype.randomString = function() {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for( var i=0; i < 5; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		return text;
	}
 
}( jQuery ));