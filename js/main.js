function initImport(){
    // load data from the given project folder
    // expects a file fields.json with field definitions
    // optional image directories to support the fields
    let images = [];
    let project = '';

    const builder = new CBFormBuilder($('#card-builder'));

    const $dropzone = $("#upload");
    const $progress = $('#loading-overlay');
    $dropzone.dropzone({
        uploadMultiple: true,
        url: '#',
        accept: function (file, done) {
            if(!project.length){
                project = file.fullPath.substring(0, file.fullPath.indexOf('/'));
                $('#project-name').text(project);
                $dropzone.hide();
                $progress.show();
            }
            builder.import(file, function(){
                // hide upload drop zone since we have what we need
                $progress.hide();
            });
        },
    });
    return builder;
}

function initExport(builder){
    $('#export').on('click', function(e){
        builder.export($('#download'));
    });
}

function init(){
    let builder = initImport();
    initExport(builder);
}









init();