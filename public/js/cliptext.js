let {ipc} = require("electron");
$(document).ready(function() {

    $('input.autocomplete').autocomplete({
        data: {
            "dsdsdsdsdsds":"sdsdsdsdd",
            "dsddsdssdsdsdsds":"sdsdsdsdd",
            "dsddssdsdsdsds":"sdsdsdsdd",
            "dsddssdssdsdsdsds":"sdsdsdsdd",
            "dsddsdsdsdsds":"sdsdsdsdd",
            "dsdssdsdsdsds":"sdsdsdsdd",
            "dsdasdsddsdsdsds":"sdsdsdsdd",
            "dsdddsdxcvsdsdsdsds":"sdsdsdsdd",
            "dsdsdssdsddsdsds":"sdsdsdsdd",
            "dsdsdsdssdsdsdsds":"sdsdsdsdd"
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
