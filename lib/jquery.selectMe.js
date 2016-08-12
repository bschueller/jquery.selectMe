/**
 * jQuery-plugin to replace large <select> elements with a neat and searchable solution.
 *
 * @Version: 	0.1.0
 * @Author: 	Benjamin Schueller <benjamin.schueller@gmail.com>
 * @License: 	MIT
 *
 * Usage:
 *     $('select').selectMe();
 *     $('select').selectMe({
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
 
	// Plugin definition.
    $.fn.selectMe = function( options ) {
		
		// Extend our default options with those provided.
		// Note that the first argument to extend is an empty
		// object – this is to keep from overriding our "defaults" object.
        var opts = $.extend({}, $.fn.selectMe.defaults, options );
		
		$('head').append('<link rel="stylesheet" type="text/css" href="' + opts.cssFile + '" /> ');
		
		// Our plugin implementation code goes here.
        return this.each(function() {
			var selectMe = new SelectMe(this, opts);
		});
    };
	
	// Plugin defaults – added as a property on our plugin function.
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
	
	function SelectMe(element, options) {
		if (element.nodeName == 'SELECT') {
			this.$select = $(element).hide();
			this.$wrapper = null;
			this.$placeholder = null;
			this.$dropdown = null;
			this.$options = null;
			this.$search = null;
			
			this.options = options;
			
			this._init();
			this.options.onLoad( this.$wrapper );
		}
	}
	
	SelectMe.prototype._init = function() {
		var self = this;
		self._initWrapper();
		self._initPlaceholder();		
		self._initSearch();		
		self._initOptions();
		self._initOptionSelection();
		
		self.$options.css({
			'column-count'        : self.options.columnCount,
			'column-gap'          : 0,
			'-webkit-column-count': self.options.columnCount,
			'-webkit-column-gap'  : 0,
			'-moz-column-count'   : self.options.columnCount,
			'-moz-column-gap'     : 0
		});
		
		$(document).on('click.ac-hideoptions', function( event ) {
			if( !$(event.target).closest(self.$wrapper).length ) {
				self.$wrapper.find('> .selectme-dropdown:visible').each(function(){
					self.closeDropdown();
				});
			}
		});
	}
	
	SelectMe.prototype._initWrapper = function() {	
		var self = this;
		self.$select.after('<div class="selectme-wrapper"><button type = "button"></button><div class="selectme-dropdown"><ul></ul></div></div>');
		self.$wrapper = self.$select.next('.selectme-wrapper');
		self.$wrapper.outerWidth(self.options.width);
		self.$placeholder = self.$wrapper.find('> button:first-child');
		self.$dropdown = self.$wrapper.find('> .selectme-dropdown');
		self.$options = self.$dropdown.find('> ul');
		
		self.$wrapper.keydown(function(e) {
			var keycode = e.keyCode;
			if (keycode == 27 || keycode == 9) { //ESC
				self.closeDropdown();
				self.$placeholder.focus();
			}
		})
		
		if (self.options.search) {
			self.$options.before('<div class="selectme-search"><input type="text" value="" placeholder="' + self.getMessageSource().search + '" /></div>');
			self.$search = self.$dropdown.find('> .selectme-search > input');
			self.$search.focus(function() {
				if (!self.$search.is(':visible')) {
					self.openDropdown();
				}
			});
		}
		
		if (self.isMultiple()) {
			var $shortcuts = $('<div class="selectme-shortcuts"></div>').insertBefore(self.$options);
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
					} else {
						$(this).hide();
					}
				});
			});
		}
	}
	
	SelectMe.prototype._initPlaceholder = function() {
		var self = this;
		self._updatePlaceholderText();
		self.$placeholder.click(function() {
			if (self.$dropdown.is(':visible')) {
				self.closeDropdown();
			} else {
				self.openDropdown();
			}
		});
	}
	
	SelectMe.prototype._initSearch = function() {
		var self = this;
		if (self.options.search) {
			self.$search.on('keyup', function(){
				self.options.onSearch( this );
				
				// search non optgroup li's
				self.$options.find('li:not(.optgroup)').each(function(){
					var optText = $(this).text();

					// show option if string exists
					if( optText.toLowerCase().indexOf( self.$search.val().toLowerCase() ) > -1 ) {
						$(this).show();
					}
					// don't hide selected items
					else if( !$(this).hasClass('selected') ) {
						$(this).hide();
					}
				});
			});
			
			self._registerKeydownForFocusSearchField(self.$options);
		}
	}
	
	SelectMe.prototype._initOptions = function() {
		var self = this;
		var options = [];
		var fieldName = self.randomString();
		self.$select.children().each(function(){
			if( this.nodeName == 'OPTION' ) {
				options.push({
					name      : $(this).text(),
					value     : $(this).val(),
					checked   : $(this).prop( 'selected' )
				});
			}
			else {
				// bad option
				return true;
			}
		});
		
		for( var key in options ) {
			// Prevent prototype methods injected into options from being iterated over.
			if( !options.hasOwnProperty( key ) ) {
				continue;
			}

			var thisOption      = options[ key ];
			var $container       = $('<li></li>');

			if( thisOption.hasOwnProperty('value') ) {
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
					self.$dropdown.find('> ul > li').removeClass('selectme-marked');
					$(this).parent().addClass('selectme-marked');
				});
				$container.wrapInner( $label );
			}

			self.$options.append( $container );
		}
	}
	
	SelectMe.prototype._initOptionSelection = function() {
		var self = this;
		self.$wrapper.keydown(function(e) {
			var $selected = $(this).find('.selectme-marked');
			if (e.keyCode == 38) { // up
				self.$options.find('> li').removeClass('selectme-marked')
				if ($selected.length == 0) {
					$selected = self.$options.find('> li:visible:first');
					$selected.addClass('selectme-marked');
					$selected.find('label').focus();
				} else if ($selected.prevAll(':visible').first().length == 0) {
					$selected.siblings(':visible').last().addClass('selectme-marked');
					$selected.siblings(':visible').last().find('label').focus();
				} else {
					$selected.prevAll(':visible').first().addClass('selectme-marked');
					$selected.prevAll(':visible').first().find('label').focus();
				}
				e.preventDefault();
			} else if (e.keyCode == 40) { // down
				self.$options.find('> li').removeClass('selectme-marked');
				if ($selected.length == 0) {
					$selected = self.$options.find('> li:visible:first');
					$selected.addClass('selectme-marked');
					$selected.find('label').focus();
				} else if ($selected.nextAll(':visible').first().length == 0) {
					$selected.siblings(':visible').first().addClass('selectme-marked');
					$selected.siblings(':visible').first().find('label').focus();
				} else {
					$selected.nextAll(':visible').first().addClass('selectme-marked');
					$selected.nextAll(':visible').first().find('label').focus();
				}
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
	
	SelectMe.prototype._registerKeydownForFocusSearchField = function(element) {
		var self = this;
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
	
	SelectMe.prototype._updatePlaceholderText = function() {
		var self = this;
		// get selected options
		var selOpts = [];
		self.$select.find('option:selected').each(function(){
			selOpts.push( $(this).text() );
		});
		// UPDATE PLACEHOLDER TEXT WITH OPTIONS SELECTED
		var allCount = self.$select.find('option').length;
		var placeholderText = $.fn.selectMe.getSummaryText(selOpts, allCount, self.getMessageSource(), self.isMultiple());
		self.$placeholder.text(placeholderText);
	}
	
	SelectMe.prototype.openDropdown = function() {
		var self = this;
		self.options.onDropdownOpen( self.$wrapper );
		self.$dropdown.show();
		if (self.options.search) {
			self.$search.focus();
		}
	}
	
	SelectMe.prototype.closeDropdown = function() {
		var self = this;
		self.options.onDropdownClose( self.$wrapper );
		self.$dropdown.hide();
	}
	
	SelectMe.prototype.getMessageSource = function() {
		var self = this;
		var locale = self.options.locale;
		var messageSource = self.options.localeResource[locale];
		return messageSource;
	}
	
	SelectMe.prototype.isMultiple = function() {
		return this.$select.prop('multiple');
	}
	
	SelectMe.prototype.randomString = function() {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for( var i=0; i < 5; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		return text;
	}
 
}( jQuery ));