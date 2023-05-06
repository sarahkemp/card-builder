/**
 * Expects json from fields.json with definitions of each card type and
 * its fields
 * todo allow changing front type to change background image
 * todo show icons in preview when img-selector is used
 * @param fields
 */
class CBFormBuilder {

    _$container;
    _$preview;
    _$selector;
    _original = {};
    _data = {};
    _fields = {};
    _images = {};
    _loading = 0;
    _progress;

    constructor($container) {
        this._$container = $container;
        this._bindEvents();
    }

    export($container){
        let that = this;

        $container.empty();

        that._showFiles($container);
        that._showDiffs($container);

        let $x = $('<span class="closer">×</span>');
        $container.prepend($x);
        $x.on('click', function(){
            $container.hide();
        });

        $container.show();
    }

    import(file, callback){
        let that = this;
        switch(file.type){
            case 'application/json':
                that._loading++;
                let reader = new window.FileReader();
                if(file.name === 'fields.json'){
                    reader.addEventListener("loadend", function (event) {
                        that._loading--;
                        let fields = JSON.parse(event.target.result);
                        console.log('Loaded '+Object.keys(fields).length+' card configurations from '+file.name);
                        that.setFields(fields);
                        that._showProgress(callback);
                    });
                }
                reader.readAsText(file);
                break;
            case 'text/csv':
                that._loading++;
                let reader2 = new window.FileReader();
                reader2.addEventListener("loadend", function (event) {
                    that._loading--;
                    let data = $.csv.toObjects(event.target.result);
                    console.log('Loaded '+data.length+' rows from '+file.name);
                    that.setData(file.name.substring(0, file.name.indexOf('.csv')), data);
                    that._showProgress(callback);
                });
                reader2.readAsText(file);
                break;
            case 'image/png':
                that.addImage(file, file.fullPath.substring(file.fullPath.indexOf('/') + 1));
                break;
        }
    }

    addImage(file, relativePath){
        let parts = relativePath.split('/', 2);
        if(parts.length === 2){
            if(!this._images[parts[0]]){
                this._images[parts[0]] = {};
            }
            this._images[parts[0]][parts[1]] = file;
        }else{
            this._images['root'][parts[0]] = file;
        }
    }

    setData(type, data){
        // save off a copy so we can show diffs later
        if(this._data[type] === undefined){
            this._original[type] = structuredClone(data);
        }
        this._data[type] = data;
    }

    setFields(fields){
        this._fields = fields;
        this._build(fields);
        this._fixSelect2Focus();
        this._initAttributeSelectors();
        this._updateFieldsForCardType();
    }

    _addCard(type){
        let initial = {};
        let fields = this._fields[type];

        if(fields){
            for(let i = 0; i < fields.length; i++){
                if(this._fields[type][i] && this._fields[type][i].attr){
                    initial[fields[i].name.toUpperCase()] = this._fields[type][i].attr.value;
                }else{
                    initial[fields[i].name.toUpperCase()] = null;
                }
            }
        }

        this._data[type].push(initial);
        let $optgroup = this._$selector.find('optgroup[data-type="'+type+'"]');
        let idx = this._data[type].length - 1;
        let name = this._getCardName(type, idx);
        let $op = $('<option value="'+name+'">New</option>');

        $optgroup.append($op);

        this._$selector.val(name);

        return idx;
    }

    _addType(type){
        this._data[type] = [];

        let $optgroup = this._$selector.find('optgroup[label="'+type+'"]');
        if(!$optgroup.length){
            $optgroup = $('<optgroup label="'+type+'"/>');
            this._$selector.append($optgroup);
        }
    }

    _bindEvents(){
        let that = this;

        this._$container.on('focus', '.img-selector', function(){
            that._initImageSelector($(this));
        });

        this._$container.on('change', '.fields input, .fields select, .fields textarea', function(){
            that._saveFieldValue($(this));
        });

        this._$container.on('click', '.card-delete', function(e){
            e.preventDefault();
            that._deleteActiveCard();
        });

        this._$container.on('click', '.card-reset', function(e){
            e.preventDefault();
            that._resetActiveCard();
        });

        this._$container.on('click', '.card-next', function(e){
            e.preventDefault();
            that._$selector.val(that._getNextCard()).trigger('change');
        });

        this._$container.on('click', '.card-previous', function(e){
            e.preventDefault();
            that._$selector.val(that._getNextCard(true)).trigger('change');
        });

    }

    _build(fields){
        this._$container.empty();
        this._buildForm(fields);
        this._buildCardPreview();
    }

    _buildForm(fields){
        let that = this;
        let $fields = $('<div class="fields"/>');
        let $wrapper = $('<div id="form-wrapper"/>');

        let types = [];
        $.each(fields, function(type, fieldDefs){
            let $fieldset = $('<fieldset data-type="'+type+'"/>');
            // note the existence of this card type
            types.push(type);
            // convert the field definitions for this card type to form elements
            for(let i = 0; i < fieldDefs.length; i++){
                fieldDefs[i].cbidx = i;
                $fieldset.append(that._buildLabel(fieldDefs[i]));
            }
            $fields.append($fieldset);
        });

        $wrapper.prepend(that._buildTypeSelector(types));
        $wrapper.append($fields);

        let $reset = $('<button class="card-reset btn btn-danger controls" type="button">Reset Card</button>');
        $fields.append($reset);

        let $delete = $('<button class="card-delete btn btn-danger controls" type="button">Delete Card</button>');
        $fields.append($delete);

        let $next = $('<button class="card-next btn controls" type="button">Next</button>');
        $fields.prepend($next);

        let $previous = $('<button class="card-previous btn controls" type="button">Previous</button>');
        $fields.prepend($previous);

        that._$container.prepend($wrapper);
    }

    _buildCardPreview(){
        let $wrapper = $('<div id="preview-wrapper"/>');
        this._$preview = $('<div id="card-preview"/>');
        $wrapper.append(this._$preview);
        this._$container.append($wrapper);
    }

    _buildInput(defs, $label){
        let $tag = $('<'+defs.tag+'/>');

        $tag.attr('type', 'text');

        if(defs.options){
            let $list = $('<datalist id="cb-list-'+defs.cbidx+'"/>');
            $tag.attr('list', $list.attr('id'));
            for(let i = 0; i < defs.options.length; i++){
                let $option = $('<option value="'+defs.options[i]+'">');
                $list.append($option);
            }
            $label.append($list);
        }

        return $tag;
    }

    _buildLabel(defs){
        if(defs.tag) {
            let $wrapper = $('<div id="cb-field-' + defs.cbidx + '" class="field-wrapper"/>');
            let $label = $('<label>');
            $label.text((defs.label || defs.name) + " ");
            $label.append(this._buildTag(defs, $label));
            $wrapper.append($label);

            if(defs.attr && defs.attr.type === 'hidden'){
                $wrapper.addClass('hidden');
            }

            return $wrapper;
        }
    }

    _buildSelect(defs){
        let $select = $('<select/>');
        $.each(defs.options, function(key, val){
            let $op = $('<option value="'+key+'">'+val+'</option>');
            $select.append($op);
        });
        return $select;
    }

    _buildTag(defs, $label){
        let $tag;
        switch(defs.tag){
            case 'select':
                $tag = this._buildSelect(defs, $label);
                break;
            case 'input':
                $tag = this._buildInput(defs, $label);
                break;
            case 'textarea':
                $tag = this._buildTextarea(defs, $label);
                break;
        }
        if(defs.attr){
            $.each(defs.attr, function(key, val){
                $tag.attr(key, val);
            });
        }
        if(defs.preview){
            $tag.data('preview', 1);
        }
        $tag.attr('name', defs.name.toUpperCase().replace(' ', '_'));
        return $tag;
    }

    _buildTextarea(defs, $label){
        let $tag = $('<'+defs.tag+'/>');
        $label.addClass('block');
        return $tag;
    }

    _buildTypeSelector(types){
        let that = this;
        this._$selector = this._$selector || $('<select id="card-selector" class="form-control">');
        this._$selector.append($('<option value="">Choose Card</option>'));
        for(let i = 0; i < types.length; i++){
            this._$selector.append($('<option value="'+
                types[i]+'">+ New '+
                types[i]+' Card</option>'));
        }

        this._$selector.on('focus', function(){
            if($(that).data('select2')){
                that._$selector.select2('open');
            }else{
                that._initCardSelector(that._$selector);
            }
        });

        this._$selector.on('change', function(){
            that._loadCard();
        });
        document.addEventListener('keydown', function(e){
            let active = document.activeElement;
            if(e.ctrlKey){
                if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){
                    that._$selector.val(that._getNextCard()).trigger('change');
                }else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
                    that._$selector.val(that._getNextCard(true)).trigger('change');
                }
                return true;
            }
            if(e.key === 'Escape'){
                (active || that._$selector).blur();
                return true;
            }
            if(active && (active.tagName === 'INPUT' || active.tagName === 'SELECT')){
                if(e.key === 'Enter'){
                    that._$selector.focus();
                }
                return true;
            }
            if(active && active.tagName === 'TEXTAREA'){
                return true;
            }
            if(e.which >= 48 && +e.which <=90){
                that._$selector.focus().select2('open');
            }
        });
        return this._$selector;
    }

    _deleteActiveCard(){
        let type = this._getActiveCardType();
        let active = this._getActiveCardIndex();
        if(confirm('Delete '+type+' Card "'+this._getActiveCardName()+'"?')){
            delete this._data[type][active];
            this._$selector.find('option:selected').remove();
            this._rebuildSelector('', true);
        }
    }

    _downloadLink(data, name) {
        // Creating a Blob for having a csv file format
        // and passing the data with type
        const blob = new Blob([data], { type: 'text/csv' });

        // Creating an object for downloading url
        const url = window.URL.createObjectURL(blob)

        // Creating an anchor(a) tag of HTML
        const a = document.createElement('a')

        // Passing the blob downloading url
        a.setAttribute('href', url)

        // Setting the anchor tag attribute for downloading
        // and passing the download file name
        a.setAttribute('download', (name || 'filename')+'.csv');

        a.innerText = name+'.csv';

        // Performing a download with click
        // a.click()
        return a;
    }

    /**
     * select2 doesn't like to focus the search box when it opens for some reason. Stupid.
     */
    _fixSelect2Focus(){
        this._$container.on('select2:open', () => {
            document.querySelector('.select2-search__field').focus();
        })
    }

    _formatImgResult(state) {
        if (!state.id) return state.text; // optgroup
        let img = this._getImageUrlFromImgSelect(state.element);
        if(!img) return state.text;
        return '<img src="' + img + '" alt="' + state.text + '"/>' + state.text;
    }

    _formatImgSelect(state) {
        if (!state.id) return state.text; // optgroup
        let img = this._getImageUrlFromImgSelect(state.element);
        if(!img) return state.text;
        return '<img src="' + img + '" alt="' + state.text + '"/>' + state.text;
    }

    _getActiveCardIndex(){
        let type = this._getActiveCardType();
        let value = this._$selector.val();
        if(!value){
            return value;
        }
        return this._selectorValueToIndex(value, type);
    }

    _getActiveCardName(){
        return this._$selector.find('option:selected').text() || '&lt;'+this._$selector.val()+'&gt;';
    }

    _getActiveCardType(){
        let selected = this._$selector.find('option:selected');
        let parent = selected.parent();
        if(!parent){
            return false;
        }
        // new cards have no optgoup parent label, and their type is their value
        return parent.data('type') || this._$selector.val();
    }

    _getCardName(type, idx){
        return type+'|'+idx;
    }

    _getImageUrlFromImgSelect(el){
        let name = el.dataset.cbimg;
        if(!name) return false;
        let parent = el.parentElement.dataset.path;
        if(!parent) {
            parent = 'root';
        }
        let image = this._images[parent][name];
        return image.dataURL;
    }

    _getNextCard(reverse = false){
        let $active = $(this._$selector.find('option:selected'));
        let dir = reverse ? 'prev' : 'next';
        let loop = reverse ? 'last' : 'first';

        // if nothing is selected, just select the blank
        if(!$active){
            return '';
        }
        let $next = $active[dir]();
        if($next.length){
            return $next.val()
        }
        // loop to start/end
        return $active.parent().children()[loop]().val();
    }

    _markdownToHtml(markdown){
        // strip out any html tags they've sent
        markdown = markdown.replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');

        // we only support bold and italic because that is all Countersheet for Inkscape supports
        return markdown
            .replace(/\/(.*?)\//gim, '<i>$1</i>') // italic text is like /text/
            .replace(/\*(.*?)\*/gim, '<b>$1</b>'); // bold text is like *text*
    }

    _formatResult(state){
        if (!state.id) {
            return state.text;
        }
        let $html = $('<strong></strong>');
        $html.text(state.text);
        $html = $html.wrap('<div></div>').parent();
        if(state.matched){
            let $span = $('<span/>');
            $span.text(state.matched);
            $html.append($span);
        }else if(state.element.dataset.desc){
            let $span = $('<span/>');
            $span.text(state.element.dataset.desc);
            $html.append($span);
        }
        return $html;
    }

    /**
     * multiply the single attribute selector to have 10 of them and add the picture select function
     */
    _initAttributeSelectors(){
        let $original = this._$container.find("#attribute-selectors .attribute-selector");
        let select2Parameters = {
            templateResult: this._formatImgResult,
            templateSelection: this._formatImgSelect,
            escapeMarkup: function(m) {
                return m;
            },
            containerCssClass:'attribute-select2',
            dropdownCssClass:'attribute-select2',
            dropdownAutoWidth:true,
        };

        for(let i = 1; i < 10; i++){
            let $clone = $original.clone();
            $clone.insertAfter($original);
            $clone.select2(select2Parameters);
        }
        $original.select2(select2Parameters);
    }

    _initCardSelector($input){
        if($input.hasClass('cb-initd')){
            return;
        }
        let that = this;
        let selected = $input.val();

        $input.children('optgroup').remove();
        // load any cards they've already saved
        if(this._data){
            $.each(this._data, function(type, rows){
                let $group = $('<optgroup label=""/>');
                let groupCount = 0;
                $group.attr('data-type', type);
                for(let i = 0; i < rows.length; i++){
                    if(rows[i]){
                        let $op = $('<option value="'+that._getCardName(type,i)+'"/>');
                        $op.text(rows[i].NAME+(rows[i].COUNT > 1 ? ' ('+rows[i].COUNT+')' : ''));
                        $op.attr('data-desc', rows[i].EFFECT);
                        $op.attr('data-name', rows[i].NAME);
                        let ct = parseInt(rows[i].COUNT);
                        groupCount += isNaN(ct) ? 1 : ct;
                        $group.append($op);
                    }
                }
                $group.attr('label', type+' ('+groupCount+')');
                $input.append($group);
            });
        }

        $input.val(selected);
        $input.select2({
            containerCssClass: 'card-select2',
            dropdownCssClass: 'card-select2',
            dropdownParent: $input.parent(),
            templateResult: that._formatResult,
            matcher: that._matchNameOrDesc.bind(that)
        });

        // hide the original select to move focus
        $input.hide();
        $input.select2('open');
        $input.addClass('cb-initd');
    }

    /**
     * Turn any inputs with class img-selector into select2 image pickers
     * locating images in the project folder in the data-path attribute of the input
     */
    _initImageSelector($input){
        if($input.hasClass('cb-initd')){
            return;
        }

        let path = $input.data('path');
        if(!path){
            console.log('no path set on img-selector input '+$input.attr('name'));
            return;
        }

        let $select = $('<select/>');
        $select.attr('name', $input.attr('name'));
        $select.attr('title', $input.attr('title'));
        $select.attr('data-path', path);

        let images = this._images[path];

        if(images){
            let keys = Object.keys(images);
            for(let i = 0; i < keys.length; i++){
                let $option = $('<option/>');
                $option.attr('value', keys[i]);
                $option.text(keys[i]+'&nbsp;&nbsp;');
                $option.attr('data-cbimg', keys[i]);
                $select.append($option);
            }
        }

        $select.addClass('cb-initd');
        $input.replaceWith($select);

        $select.select2({
            templateResult: this._formatImgResult.bind(this),
            escapeMarkup: function(m) {
                return m;
            },
            containerCssClass:'img-select2-select',
            dropdownCssClass:'img-select2-result',
        }).select2('open');

    }

    /**
     * given a unique card name, either load its data from memory or customize it based on the new card type they chose
     */
    _loadCard(){
        let type = this._getActiveCardType();

        this._updateCardPreview(type);
        this._updateFieldsForCardType(type, this._getActiveCardIndex());
    }

    _matchNameOrDesc(params, data) {
        // Always return the object if there is nothing to compare
        if ($.trim(params.term) === '') {
            return data;
        }

        let original = data.text.toUpperCase();
        let term = params.term.toUpperCase();
        let type = null;

        if(term.length >= 5 && term.substring(0, 5) === 'TYPE:'){
            // only the contents of groups should be evaluated if they set a type limiter
            if(data.element.tagName !== 'OPTGROUP'){
                return null;
            }
            type = term.substring(5);
            let end = type.indexOf(' ');
            if(end !== -1){
                type = type.substring(0, end);
            }
            term = $.trim(term.replace('TYPE:'+type, ''));
            params = structuredClone(params);
            params.term = term;
        }

        // Do a recursive check for options with children
        if (data.children && data.children.length > 0) {
            // don't find matches in optgroups of other types if they set a type
            if(type !== null && data.element.dataset.type.toUpperCase().indexOf(type) === -1){
                return null;
            }
            // Clone the data object if there are children
            // This is required as we modify the object to remove any non-matches
            let match = $.extend(true, {}, data);

            // Check each child of the option
            for (let c = data.children.length - 1; c >= 0; c--) {
                let child = data.children[c];

                let matches = this._matchNameOrDesc(params, child);

                // If there wasn't a match, remove the object in the array
                if (matches == null) {
                    match.children.splice(c, 1);
                }
            }

            // If any children matched, return the new object
            if (match.children.length > 0) {
                return match;
            }

            // If there were no matching children, check just the plain object
            return this._matchNameOrDesc(params, match);
        }

        // Check if the text contains the term
        if (original.indexOf(term) > -1) {
            return data;
        }

        original = data.element.dataset.desc;
        if(!original){
            return null;
        }
        original = original.toUpperCase();
        if (original) {
            let idx = original.indexOf(term);
            if(idx > -1){
                data.matched = (idx > 20 ? '...' : '')+data.element.dataset.desc.substring(idx - 20).trimStart();
                return data;
            }
        }

        // If it doesn't contain the term, don't return anything
        return null;
    }

    _rebuildSelector(select, focus = false){
        if(this._$selector.data('select2')){
            this._$selector.select2('destroy');
        }
        this._$selector.removeClass('cb-initd');
        this._$selector.val(select).trigger('change');
        this._$selector.show();
        if(focus){
            this._$selector.focus();
        }
    }

    /**
     * Reset a card to its initial state
     * @private
     */
    _resetActiveCard(){
        let type = this._getActiveCardType();
        let idx = this._getActiveCardIndex();
        if(confirm('Undo changes and revert '+this._data[type][idx].NAME+'?')){
            if(this._original[type] === undefined){
                alert('No original found for type: '+type);
                return false;
            }
            this._data[type][idx] = structuredClone(this._original[type][idx]);
            this._$selector.trigger('change');
        }
    }

    /**
     * Save changes to a single field
     * @param $field
     * @private
     */
    _saveFieldValue($field){
        let type = this._getActiveCardType();
        let active = this._getActiveCardIndex();

        if(!type || !active){
            alert('No active card found, cannot save');
            return;
        }

        let key = $field.attr('name').toUpperCase();
        let value = $field.val();

        // if this is a new card, make a new card
        if(active === type){
            active = null;
        }

        // save the new information
        this._setDataValue(type, active, key, value, $field.data('preview') === 1);

    }

    _selectorValueToIndex(value, type){
        return value.replace(type+'|', '');
    }

    _setDataValue(type, idx, key, value, updatePreview = false){
        // ensure the type exists in the data & selector
        if(this._data[type] === undefined){
            this._addType(type);
        }
        // ensure the card exists in the data & selector
        if(idx === null || !this._data[type][idx]){
            idx = this._addCard(type);
        }

        // set the data
        this._data[type][idx][key] = value;

        // make sure name is always set
        if(key !== 'NAME' && !this._data[type][idx]['NAME']){
            this._setDataValue(type, idx, 'NAME','New '+type+' '+this._data[type].length);
        }

        // if there is a name change, update the selector
        if(key === 'NAME'){
            this._$selector.find('option:selected').text(value);
            this._rebuildSelector(this._getCardName(type,idx));
        }

        // if this is a preview field, update the preview
        if(updatePreview){
            let $p = this._$preview.find('.field-preview[data-name="'+key+'"]');
            $p.html(this._markdownToHtml(value));
        }
    }

    /**
     * Console log all the differences between current and initial
     * @private
     */
    _showDiffs($container){
        let that = this;
        let $list = $('<ul/>');
        // loop through the original data comparing it against the new
        $.each(that._original, function(type, rows){
            for(let j = 0; j < that._original[type].length; j++){
                if(that._data[type][j] === undefined){
                    $list.append($('<li class="deleted color-fg-closed">Deleted '+type+' '+rows[j].NAME+'</li>'));
                    continue;
                }
                $.each(that._original[type][j], function(key){
                    if(that._data[type][j][key] !== that._original[type][j][key]){
                        $list.append($('<li class="changed">'+type+' '+rows[j].NAME+' '+key+': "'+that._original[type][j][key]+'" changed to "'+
                            that._data[type][j][key]+'"</li>'));
                    }
                });
            }
            for(let j = that._original[type].length; j < that._data[type].length; j++){
                if(that._data[type][j]){
                    $list.append($('<li class="diff-added color-fg-open">Added '+type+' '+that._data[type][j].NAME+'</li>'));
                }
            }
        });
        $.each(that._data, function(type){
            if(that._original[type] === undefined){
                for(let j = 0; j < that._data[type].length; j++){
                    if(that._data[type][j]){
                        $list.append($('<li class="diff-added color-fg-open">Added '+type+' '+that._data[type][j].NAME+'</li>'));
                    }
                }
            }
        });

        let $div = $('<div class="diffs"/>');
        $div.append('<h3>Changes</h3>');
        $div.append($list);
        $container.append($div);
    }

    _showFiles($container){
        let that = this;

        // offer a list of csvs we can give them and checkbox then submit to download?
        let $list = $('<ul/>');
        $.each(this._data, function(type, rows){
            let $li = $('<li/>');
            let $a = $(that._downloadLink($.csv.fromObjects(rows.filter(function(val){return val}), {manualOrder: ['COUNT']}), type));
            $li.append($a);
            $list.append($li);
        });
        let $div = $('<div class="files"/>');
        $div.append('<h3>Files</h3>');
        $div.append($list);
        $container.append($div);
    }

    /**
     * Hold the callback until we are done loading the files we were given
     * @param callback
     * @private
     */
    _showProgress(callback){
        if(this._loading > 0){
            if(this._progress){
                return;
            }
            let that = this;
            this._progress = window.setTimeout(function(){
                that._showProgress(callback);
            }, 2000);
        }else{
            clearTimeout(this._progress);
            if(callback){
                callback();
            }
            let $s = this._$container.find('#card-selector');
            if($s.length){
                $s.focus();
            }
        }
    }

    /**
     * Change the preview image based on the selected card type
     * @param type
     */
    _updateCardPreview(type){
        let that = this;
        this._$preview.empty();
        that._$preview.css('width', '100%');
        that._$preview.css('height', '100%');

        if(!type){
            return false;
        }

        let $wrapper = $('<div/>');
        // show the card front template if found
        let imagePath = type.toLowerCase().replace(' ', '_')+'.png';
        let scale = 1;
        if(this._images['fronts']){
            let imageData = this._images['fronts'][imagePath];
            if(imageData){
                // let $img = $('<img alt="'+type+'" />');
                let img = new Image();
                this._$preview.append(img);
                img.onload = function(){
                    let $img = $(img);
                    let xScale = img.width / that._$preview.outerWidth();
                    let yScale = img.height / that._$preview.outerHeight();
                    $img.css('width', xScale >= yScale ? '100%' : 'auto');
                    $img.css('height', yScale >= xScale ? '100%' : 'auto');
                    that._$preview.css('width', img.clientWidth);
                    that._$preview.css('height', img.clientHeight);
                    xScale = img.naturalWidth / img.clientWidth;
                    yScale = img.naturalHeight / img.clientHeight;
                    scale = 1 / Math.max(xScale, yScale);
                    $wrapper.css('zoom', scale);
                };
                img.src = imageData.dataURL;
            }
        }

        // see if any of the fields for this card type have preview info configured
        let fields = this._fields[type];
        let data = this._data[type] ? this._data[type][this._getActiveCardIndex()] : [];

        if(fields){
            for(let i = 0; i < fields.length; i++){
                if(fields[i].preview){
                    let name = fields[i].name.toUpperCase();
                    let $p = $('<div class="field-preview" data-name="'+name+'" />');
                    $.each(fields[i].preview, function(k, v){
                        $p.css(k, (k === 'font-family') ? '"'+v+'"' : v);
                    });
                    if(data && data[name]){
                        $p.html(this._markdownToHtml(data[name]));
                    }else{
                        $p.html('<em class="placeholder">'+fields[i].name+'</em>');
                    }
                    $p.addClass('tooltipped tooltipped-s').attr('aria-label', name);
                    $wrapper.append($p);
                }
                this._$preview.append($wrapper);
            }
        }
    }

    /**
     * Given a card type, determine what fields should be showing and hiding
     * @param type
     * @param rowIndex
     */
    _updateFieldsForCardType(type, rowIndex){
        let $wrapper = this._$container.find('.fields');
        $wrapper.children().hide();

        if(!type){
            return;
        }

        let $fieldset = $wrapper.children('fieldset[data-type="'+type+'"]');
        $fieldset.show();
        let fields = this._fields[type];

        if(fields){
            for(let i = 0; i < fields.length; i++){
                let $field = $fieldset.find('#cb-field-'+fields[i].cbidx);
                let $f = $field.find('input,select,textarea');
                $f.val('');
                if(this._data[type] && this._data[type][rowIndex]
                    && this._data[type][rowIndex][$f.attr('name').toUpperCase()]){
                    $f.val(this._data[type][rowIndex][$f.attr('name').toUpperCase()]);
                }
            }
            if(type !== rowIndex){
                $wrapper.children('.controls').show();
            }
        }
    }

}