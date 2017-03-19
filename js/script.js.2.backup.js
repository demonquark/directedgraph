var pagedata = {};

$(document).ready(function () {

    // Instatiate objects
    pagedata.counter = 0;
    pagedata.sigmaGraph = initializeGraph();
    addRows(pagedata.sigmaGraph);
    $(".controlgroup").controlgroup();
    $("#select-yourself").selectmenu();

    // expand sigmajs




    // Add interactivity
    $("#update-graph").click(updateGraph);
    $("#submit-ratings-button").click(submitForm);
    $("#submit-name-button").click(function () {
        // fade to the next page
        $('#page-1').fadeOut("fast", function () {
            $('#page-2').fadeIn();
        });
        // Execute on load
        setTimeout(updateCounter, 1000);
    });
    $('#form-table input[type="checkbox"]').on('change', function () {

        if ($('#form-table input[type="checkbox"]:checked').length > 4) {
            $('#form-msg-container p.failure-text').hide();
            $('#form-msg-container p.invalid-text').show();
            $('#form-msg-container').show();
        } else {

            $('#form-msg-container p.invalid-text').hide();
            $('#form-msg-container').hide();
            if ($(this).is(":checked")) {
                $(("#slider-" + $(this).val())).slider("option", "disabled", false);
            } else {
                $(("#slider-" + $(this).val())).slider("option", "disabled", true);
            }
        }
    });

    $(".slider").slider({
        range: false,
        disabled: true,
        value: 50,
        change: function (event, ui) {
                $(this).css('background-color', getColorFromRange(ui.value, 100, false));
        }
    });


});

/**********************
 * DOM functions.
 * Used to update the front end.
 **********************/

function submitForm() {

    var ratings = [];
    var offset = 0;
    var i;

    $('#form-table input[type="checkbox"]:checked').each(function () {
        i = $("#slider-" + $(this).val()).slider("option", "value");
        ratings.push(i);
        offset += (i < 50) ? -1 : 1;
    });

    console.log("offset: " + offset + " | " + ratings.toString());

    if (ratings.length != 4 || offset != 0) {
        $('#form-msg-container p.failure-text').show();
        $('#form-msg-container').show();
    } else {
        $('#form-msg-container').hide();
    }
}

function addRows(s) {
    var nodes = s.graph.nodes();
    var rowsHtml = '';
    var selectMenu = '';
    var index = '0';

    $.each(nodes, function (count, node) {
        index = node.id.substring(1)

        if (index < 10) {
            selectMenu += '<option value="' + index + '">' + node.label + '</option>';
        }

        if (index != 0 && index < 10) {
            rowsHtml += '<tr id="check-tr-'+index+'">'
                        + '<td><div class="controlgroup">'
                        + '<input type="checkbox" name="check-' + index + '" id="check-' + index + '" value="' + index + '" />'
                        + '<label for="check-' + index + '">'
                        + node.label
                        + '</label>'
                        + '</div></td>'
                        + '<td><div id="slider-' + index + '" class="slider"></div></td>'
                        + '</tr>';
            
        }
    });
    $('#form-table tbody').append(rowsHtml);
    $('#select-yourself').append(selectMenu);



}

function updateCounter(resetcounter) {

    // increment the counter
    var counterText = $("#counter-text").text();
    var counter = parseInt(counterText.substr(0, counterText.indexOf(" ")), 10);
    counter = (isNaN(counter) ? 0 : counter) + ((Math.random() < 0.8) ? Math.floor((Math.random() * 10)) : 0);
    console.log(counterText + ": (" + counter + ")" + pagedata.counter);

    if (resetcounter) {
        // reset the counter
        console.log("counter reset.");
        addNodes(pagedata.sigmaGraph, pagedata.counter, counter);
        pagedata.counter += counter;
        counter = 0;

        if (!pagedata.sigmaGraph.isForceAtlas2Running() && pagedata.counter >= 100) {
            finishGraph(pagedata.sigmaGraph);
        }
        pagedata.sigmaGraph.refresh();
    }

    // publish the updated counter
    $("#counter-text").text(counter + " updates (" + (pagedata.counter + counter) + ")");

    if ($("#counter-text").css("visibility") == "hidden" && counter > 0) {
        $("#counter-text").css('visibility', 'visible');
    } else if ($("#counter-text").css("visibility") == "visible" && !(counter > 0)) {
        $("#counter-text").css('visibility', 'hidden');
    }

    // update again
    if (pagedata.counter + counter < 100 && !resetcounter) {
        setTimeout(updateCounter, 1000);
    }
}

function processAjax(data) {
    console.log(data);
    if ("nodes" in data) {
        // load the graph
        console.log("ajax call successful");

        // report the success
        $('#graph-msg-container p.success-text').show();
        $('#graph-msg-container p.invalid-text').hide();
        $('#graph-msg-container p.failure-text').hide();
        $('#graph-msg-container').removeClass('ui-state-error').addClass('ui-state-default');
        $('#graph-msg-container').show();

    } else if ("status" in data && data.status == 200) {
        console.log("ajax call successful, but could not parse json");

        // report the error
        $('#graph-msg-container p.success-text').hide();
        $('#graph-msg-container p.invalid-text').show();
        $('#graph-msg-container p.failure-text').hide();
        $('#graph-msg-container').removeClass('ui-state-default').addClass('ui-state-error');
        $('#graph-msg-container').show();
    } else {
        console.log("ajax call failed");

        // report the error
        $('#graph-msg-container p.success-text').hide();
        $('#graph-msg-container p.invalid-text').hide();
        $('#graph-msg-container p.failure-text').show();
        $('#graph-msg-container').removeClass('ui-state-default').addClass('ui-state-error');
        $('#graph-msg-container').show();
    }
}

/**********************
 * SigmaJS support functions.
 * Do not contain any references to DOM objects but need a reference to the sigmaJS instance
 **********************/

/**
 * Adds nodes to the graph by adding edges to N nodes.
 * @param {sigma} s                     An instance of the sigma
 *
 * @param {?number} N                   The number of nodes that will get edges.
 *                                      Note: must be > 0.
 */
function addNodes(s, startNodeId, newNodesLength) {
    var nodesLength = s.graph.nodes().length;
    var edgesLength = s.graph.edges().length;
    var j,
        p,
        targetIndex,
        nodeSet,
        weight,
        minEdges = 4,
        maxWeight = 10,
        variableEdges = 0;

    for (var i = startNodeId; i < startNodeId + newNodesLength && i < nodesLength ; i++) {
        nodeSet = [];
        for (j = Math.floor(Math.random() * variableEdges) + minEdges; j > 0 ; j--) {

            p = 1;
            weight = (((Math.random() * (maxWeight * 0.75)) + (0.25 * maxWeight)) | 0);
            do {
                targetIndex = (Math.random() < 0.5) ? ((Math.random() * nodesLength) | 0) : (Math.floor(i/10)*10 +  ((Math.random() * 10) | 0));
                p++;
            } while (($.inArray(targetIndex, nodeSet) != -1 || targetIndex == i) && p < 100);

            nodeSet.push(targetIndex);

            s.graph.addEdge({
                id: ('e' + edgesLength),
                // Reference extremities:
                source: 'n' + i,
                target: 'n' + ((Math.random() * nodesLength) | 0),
                weight: weight,
                color: getColorFromRange(weight, maxWeight, true)
            });


            // increment the number of edges
            edgesLength++;
        }
    }

    console.log("nodes: " + s.graph.nodes().length);
    console.log("edges: " + s.graph.edges().length);
}

/**
 * Create a graph with a fixed number of nodes and no edges.
 * The first node created will be larger than the other nodes and have a different color.
 * @param {?string} container           The id of the div that should contain the graph.
 *                                      Note: the div will be emptied.
 *
 * @param {?number} N                   The number of nodes.
 *                                      Note: must be > 0.
 *
 * @return {sigma}                      An instance of the newly created sigma
 */
function initializeGraph(container, N) {
    var g = {
            nodes: [],
            edges: []
        };

    // Create the nodes
    for (var i = 0; i < N; i++) {
        g.nodes.push({
            id: 'n' + i,
            label: (i == 0 ? 'Node ' + i),
            x: 100 * Math.cos(2 * i * Math.PI / N),
            y: 100 * Math.sin(2 * i * Math.PI / N),
            size: (i == 0 ? 3 : 1),
            color: (i == 0 ? '#1111ee' : '#323232')
        });
    }

    // Empty the graph is necessary
    $('#' + container).empty();

    // create a new SigmaJS instance
    var s = new sigma({
        graph: g,
        container: container,
        settings: {
            drawEdges: true
        }
    });

    return s;
}

/**
 * Updates the graph by adding edges to N nodes.
 * @param {sigma} s                     An instance of the sigma
 *
 * @param {?number} startNodeId         The index of the starting node to add edges.
 *                                      The function will add edges to nodes from (startNodeId) to (startNodeId + N).
 *                                      Note: (startNodeId) will get edges; (startNodeId + N) will NOT get edges.
 *                                      Note: must be > 0.
 *
 * @param {?number} N                   The number of nodes that will get edges.
 *                                      Note: must be > 0.
 */
function updateGraph(s, startNodeId, N) {

    // update the global counter variable
    updateCounter(true);

    $.ajax({
        url: 'data.json',
        dataType: 'json',
        success: processAjax,
        error: processAjax
    });
}

/**
 * Runs the Force Atlas algorithm to cluster the graph.
 * The first node created will be larger than the other nodes and have a different color.
 * @param {sigma} s                     An instance of the sigma
 * 
 */
function finalizeGraph(s) {

    // Change the colors based on incoming edge weights
    var nodes = s.graph.nodes();
    var edges = s.graph.edges();


    // Start the ForceAtlas2 algorithm:
    if (!s.isForceAtlas2Running()) {
        console.log("... startForceAtlas2 ...");
        s.startForceAtlas2({ worker: true, barnesHutOptimize: false });
        setTimeout(function () {
            console.log("... killForceAtlas2 ...");
            s.stopForceAtlas2();
            s.killForceAtlas2();
        }, 10000);
    }
}

/**********************
 * Generic support functions.
 * Do not contain any references to DOM objects and don't need sigmaJS
 **********************/

/**
 * Get an HEX color string between '#FA3737' (red) and '#37FA37' (green) with '#FFFFFF' (white) in the middle.
 * @param {?number} rangeValue          The number specifing the color. Must be betwee 0 and maxValue
 *                                      If rangeValue = 0, the function will return '#FA3737' (red),
 *                                      If rangeValue = maxValue, the function will return '#37FA37' (green),
 *
 * @param {?number} maxValue            The maximum value that rangeValue can take. Must be > 0.
 *
 * @param {?boolean} inverse            If true, it changes the middle color to '#323232' (black/grey)
 *
 * @return {string}                     The color string.
 */
function getColorFromRange(rangeValue, maxValue, inverse) {

    // Get the offset
    var offset = rangeValue / maxValue - 0.5;

    // Calculate the HEX value of the color parts
    var mainColorValue = (!inverse) ? "ff" : "32";
    var offColorValue = (!inverse) ? "ff" : "32";
    if (!inverse) {
        mainColorValue = (255 - Math.floor(Math.abs(offset * 10))).toString(16);
        offColorValue = (255 - Math.floor(Math.abs(offset * 400))).toString(16);
    } else {
        offColorValue = (50 + Math.floor(Math.abs(offset * 10))).toString(16);
        mainColorValue = (50 + Math.floor(Math.abs(offset * 400))).toString(16);
    }

    // Get the full color
    var colorString = (!inverse) ? "#ffffff" : "#323232";
    if (offset < 0) {
        colorString = "#" + mainColorValue + offColorValue + offColorValue;
    } else if (offset > 0) {
        colorString = "#" + offColorValue + mainColorValue + offColorValue;
    }

    // return the string value of the color
    return colorString;
}