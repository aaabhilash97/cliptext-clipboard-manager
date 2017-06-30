$(document).ready(function() {
    $('input.autocomplete').autocomplete({
        data: {
            "Apple": null,
            "Microsoft": null,
            "Google": 'https://placehold.it/250x250'
        },
        limit: 20, // The max amount of results that can be shown at once. Default: Infinity.
        onAutocomplete: function(val) {
            console.log(val);
            // Callback function when value is autcompleted.
        },
        minLength: 0, // The minimum length of the input for the autocomplete to start. Default: 1.
    });
    $('input.autocomplete').focus();
});
