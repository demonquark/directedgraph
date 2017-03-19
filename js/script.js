var pagedata = {};

$(document).ready(function () {

    // graph methods
    customizeSigma();
    
    // Instantiate objects
    pagedata.userNodeIndex = 0;
    pagedata.userRatingsAdded = false;
    pagedata.edgesPerNode = 4;
    pagedata.maxEdgeWeight = 100;
    pagedata.numberOfNodes = 100;
    pagedata.updateTimeInterval = 250;
    pagedata.sigmaGraph = new sigma({
        graph: createGraph(pagedata.numberOfNodes),
        container: 'graph-container',
        settings: {
            drawEdges: true,
            minArrowSize: 1
        }
    });

    // Add HTML content
    addRows(pagedata.sigmaGraph);
    $(".controlgroup").controlgroup();
    $("#select-yourself").selectmenu();

    // Add interactivity
    $("#submit-name-button").click(function () {
        submitName();
    });
    $("#submit-ratings-button").click(function () {
        submitForm();
    });
    $("#submit-review-button").click(function () {
        $('input[type="radio"][name="rating"]').prop("checked", false);
        $('input[type="radio"][name="rating"]').checkboxradio('refresh');
        drawNewGraphs();
    });
    $('#form-table input[type="checkbox"]').on('change', function () {
        enableSlider($(this).is(":checked"), $(this).val());
    });
    $(".slider").slider({
        range: false,
        disabled: true,
        max: pagedata.maxEdgeWeight,
        value: (pagedata.maxEdgeWeight / 2),
        change: function (event, ui) {
            $(this).css('background-color', getColorFromRange(ui.value, pagedata.maxEdgeWeight, false));
        }
    });

});


function customizeSigma() {

    // Change node size
    sigma.classes.graph.addMethod('changeNodeSize', function (nodeId, newSize) {
        if (!isNaN(newSize) && nodeId in this.nodesIndex) {
            this.nodesIndex[nodeId].size = newSize;
        } 
    });

    // Create a graph showing a path
    //
    // @param {?array} path                   Array containing the id of each node in the path
    //
    // @param {?boolean} shortcut             Whether or not the node should use shortcuts (i.e. skip parts of the graph)
    //
    // @returns {?graph}                      A graph containing the nodes and edges connecting all nodes in path
    //                                        
    sigma.classes.graph.addMethod('getPathGraph', function (path,shortcut) {
        var n,
            e,
            edgestack = [],
            stackindex = 0,
            g = {
            nodes: [],
            edges: []
        };

        // traverse through the path
        for (var i = 0; i < path.length; i++) {
            // try to get the node
            n = this.nodesIndex[path[i]];

            if (n && 'id' in n) {
                // copy the node into the subgraph
                g.nodes.push({
                    id: n.id,
                    label: n.label,
                    x: g.nodes.length,
                    y: (i%2 + 1),
                    size: (n.size * 2),
                    color: n.color
                });

                // find the edge to the next node in the graph
                for (var j = i + 1; j < path.length; j++) {
                    $.each(this.outNeighborsIndex[path[i]][path[j]], function (key, edge) {
                        edgestack.push([{
                            id: edge.id,
                            source: edge.source,
                            target: edge.target,
                            weight: edge.weight,
                            type: edge.type,
                            color: edge.color,
                            size: 2
                        },j]);
                    });
                }

                // only add one edge
                stackindex = shortcut ? edgestack.length - 1 : 0;
                var stackstring = i + ": ";
                for (var p = 0; p < edgestack.length; p++) {
                    stackstring += edgestack[p][0].id + "|";
                }

                if (edgestack.length > 0) {
                    if (edgestack[stackindex][1] > i) { i = edgestack[stackindex][1] - 1; }
                    g.edges.push(edgestack[stackindex][0]);
                }

                console.log(((edgestack.length > 0) ? edgestack[stackindex][0].id : "no stack") + " (" + n.id + "): " + i + "<" + stackstring)

                edgestack = [];
            }
        }
        return g;
    });

    // Changes the color of each node to the average of all incoming edge weights
    sigma.classes.graph.addMethod('updateColors', function () {
        var nodesIndexa = this.nodesIndex;
        $.each(this.inNeighborsIndex, function (key1, node) {
            var weightTotal = 0;
            var weightCount = 0;
            $.each(node, function (key2, incomingNode) {
                $.each(incomingNode, function (key3, incomingEdge) {
                    weightTotal += isNaN(parseInt(incomingEdge.weight)) ? 50 : parseInt(incomingEdge.weight);
                    weightCount++;
                });
            });
            if (weightCount > 0) {
                nodesIndexa[key1].color = getColorFromRange((weightTotal / weightCount), 100, true);
            }
        });
    });

    // Calculates the shortest path between two nodes
    //
    // @param {?string} start                   The id of the starting node
    //
    // @param {?string} end                     The id of the end node
    //
    // @param {?boolean} inverse                Whether or not we should inverse the weights.
    //
    // @param {?number} maxEdgeWeight           The maximum weight of an edge (all edge weights must be between 0 and maxEdgeWeight).
    //                                          Note: must be > 0.
    //
    // @returns {?array}                        And array containing the ids of the shortest path 
    //                                          including the start and end path
    sigma.classes.graph.addMethod('shortestPath', function (start, end, inverse, maxEdgeWeight) {

        var visited = {}
        var path = {}
        var distances = {}
        var minDist = 0;
        var currentKey = start;

        // make sure the start and end node exist
        if (start in this.nodesIndex && end in this.nodesIndex) {

            // Set the distance to each node to -1 (infinity)
            $.each(this.nodesIndex, function (key, node) {
                distances[key] = -1;
                path[key] = [start];
            });
            distances[start] = 0;

            // Go through all the nodes
            while (Object.keys(distances).length > 0 && currentKey != end && minDist != -1) {

                // select the closest node
                minDist = -1;
                $.each(distances, function (key, value) {
                    if (value >= 0 && (value < minDist || minDist == -1)) {
                        minDist = value;
                        currentKey = key;
                    }
                });

                // move it to the visited list
                visited[currentKey] = distances[currentKey];
                delete distances[currentKey];

                // update the values in the distance and path list
                $.each(this.outNeighborsIndex[currentKey], function (key1, neighbor) {
                    $.each(neighbor, function (key2, edge) {

                        if (distances[key1] && (distances[key1] < 0 || (distances[key1] > visited[currentKey] + (inverse ? (maxEdgeWeight - edge.weight) : edge.weight)))) {
                            distances[key1] = visited[currentKey] + (inverse ? (maxEdgeWeight - edge.weight >= 0 ? maxEdgeWeight - edge.weight : 0) : edge.weight);
                            path[key1] = path[currentKey].slice();
                            path[key1].push(key1);
                        }
                    });
                });
            }

            // Log the path
            var totalLength = 0;
            for (var i = 0; i < path[end].length - 1; i++) {
                $.each(this.outNeighborsIndex[path[end][i]][path[end][i + 1]], function (key, edge) {
                    totalLength += edge.weight;
                });
            }
            console.log("Shortest path " + start + "->" + end + ": " + ((end in distances) ? "not possible" : path[end].toString()) + " (" + totalLength + ")");

        } else {
            console.log("Shortest path " + start + "->" + end + ": " + "INVALID INPUT - One of the referenced nodes does not exist.");
            path[end] = [];
        }


        return path[end];

    });

    // Calculates the shortest path between two nodes
    //
    // @param {?string} start                   The id of the starting node
    //
    // @param {?string} end                     The id of the end node
    //
    // @returns {?array}                        And array containing the ids of the shortest path 
    //                                          including the start and end path
    sigma.classes.graph.addMethod('randomPath', function (start, end) {

        var visited = [];
        var path = [];
        var currentKey = start;
        var prevKey = '';
        var newneigbor = false;

        // make sure the start and end node exist
        if (start in this.nodesIndex && end in this.nodesIndex) {

            // add the starting node to the path
            visited.push(start);
            path.push(start);

            // Go through all the nodes
            while (currentKey != end && path.length > 0) {

                // set the current key as previous
                newneigbor = false;
                //prevKey = currentKey;

                // pick a neighbor
                $.each(this.outNeighborsIndex[currentKey], function (key, neighbor) {
                    if (visited.indexOf(key)< 0) {
                        currentKey = key;
                        newneigbor = true;
                    }
                });

                // Check if we need to go back a step
                if (newneigbor) {
                    // move it to the visited list
                    visited.push(currentKey);
                    path.push(currentKey);
                } else if (path.length > 0) {
                    // remove the current key from the stack
                    path.pop();

                    // move to the previous key
                    currentKey = path.length > 0 ? path[path.length - 1] : start;
                }
            }

            // Log the path
            console.log("Random path " + start + "->" + end + ": " + path.toString());

        } else {
            console.log("Random path " + start + "->" + end + ": " + "INVALID INPUT - One of the referenced nodes does not exist.");
            path = [];
        }


        return path;

    });
}


/**********************
 * DOM functions.
 * Used to update the front end.
 **********************/

/**
 * Add rows and select options based on the graph nodes.
 * The first node created will be larger than the other nodes and have a different color.
 * @param {sigma} s                     An instance of the sigma
 *
 */
function addRows(s) {
    var nodes = s.graph.nodes();
    var rowsHtml = '';
    var selectMenu = '';
    var index = '0';

    // Loop through the graph and write HTML output for each node
    $.each(nodes, function (count, node) {
        index = node.id.substring(1)

            // output for the select menu
            selectMenu += '<option value="' + index + '">' + node.label + '</option>';
            // output for the form table
            rowsHtml += '<tr id="check-tr-' + index + '">'
                        + '<td><div class="controlgroup">'
                        + '<input type="checkbox" name="check-' + index + '" id="check-' + index + '" value="' + index + '" />'
                        + '<label for="check-' + index + '">'
                        + node.label
                        + '</label>'
                        + '</div></td>'
                        + '<td><div id="slider-' + index + '" class="slider"></div></td>'
                        + '</tr>';

    });

    // print the HTML to the page
    $('#form-table tbody').append(rowsHtml);
    $('#select-yourself').append(selectMenu);
}

/**
 * Handles the name selection form
 *
 */
function submitName() {

    // hide the corresponding name value
    var i = parseInt($("#select-yourself").val());
    pagedata.userNodeIndex = isNaN(i) ? 0 : i;
    $('#check-tr-' + pagedata.userNodeIndex).hide();

    // change the size of the main node
    pagedata.sigmaGraph.graph.changeNodeSize('n' + pagedata.userNodeIndex, 3);
    pagedata.sigmaGraph.refresh();

    // fade to the next form
    $('#page-1').fadeOut("fast", function () { $('#page-2').fadeIn(); });

    // show the graph and start updating
    $("#graph-container").css('visibility', 'visible');
    updateCounter();
}

/**
 * Validates the final inputs from the form
 *
 */
function submitForm() {

    var ratings = [];
    var offset = 0;
    var i;

    $('#form-table input[type="checkbox"]:checked').each(function () {
        i = $("#slider-" + $(this).val()).slider("option", "value");
        ratings.push(i);
        offset += (i < 50) ? -1 : 1;
    });

    if (ratings.length != 4 || offset != 0) {
        $('#form-msg-container p.failure-text').show();
        $('#form-msg-container').show();
    } else {
        $('#form-msg-container').hide();

        // fade to the next form
        $('#page-2').fadeOut("fast", function () {
            
            // add the user ratings
            updateGraph(pagedata.sigmaGraph, pagedata.userNodeIndex, 1, pagedata.edgesPerNode, pagedata.maxEdgeWeight);
            pagedata.userRatingsAdded = true;

            // Read the counter text
            var counters = $("#counter-text").text().split(' ');
            var total = (counters.length > 0) ? parseInt(counters[0], 10) : 0;
            if (total == pagedata.numberOfNodes) {
                $('#page-3').fadeIn();
                finalizeGraph(pagedata.sigmaGraph);
                drawNewGraphs();
            } else {
                $('#page-4').fadeIn();
            }

        });
    }
}


function drawNewGraphs() {
    var endIndex = 0;
    var nodes = pagedata.sigmaGraph.graph.nodes();
    var edges = pagedata.sigmaGraph.graph.edges();

    // Get a random other node
    var p = 0;
    do {
        endIndex = ((Math.random() * pagedata.numberOfNodes) | 0);
        p++;
    } while (endIndex == pagedata.userNodeIndex && p < 100);

    $(".node-name").text('Node ' + endIndex);

    // Find the shortest path
    var path1 = pagedata.sigmaGraph.graph.shortestPath('n' + pagedata.userNodeIndex, 'n' + endIndex, true, pagedata.maxEdgeWeight);
    var path2 = pagedata.sigmaGraph.graph.shortestPath('n' + pagedata.userNodeIndex, 'n' + endIndex, false, pagedata.maxEdgeWeight);
    var path3 = pagedata.sigmaGraph.graph.randomPath('n' + pagedata.userNodeIndex, 'n' + endIndex);

    var graphsettings = {
        drawEdges: true,
        drawLabels: true,
        labelThreshold: 1,
        minEdgeSize: 1,
        maxEdgeSize: 4,
        minArrowSize: 4
    };

    // Build the graphs
    if (pagedata.subGraph1) {
        pagedata.subGraph1.graph.clear();
        pagedata.subGraph1.graph.read(pagedata.sigmaGraph.graph.getPathGraph(path1, false));
        pagedata.subGraph1.refresh();
    } else {
        pagedata.subGraph1 = new sigma({
            graph: pagedata.sigmaGraph.graph.getPathGraph(path1, false),
            container: 'subgraph1-container',
            settings: graphsettings
        });
    }
    if (pagedata.subGraph2) {
        pagedata.subGraph2.graph.clear();
        pagedata.subGraph2.graph.read(pagedata.sigmaGraph.graph.getPathGraph(path2, false));
        pagedata.subGraph2.refresh();
    } else {
        pagedata.subGraph2 = new sigma({
            graph: pagedata.sigmaGraph.graph.getPathGraph(path2, false),
            container: 'subgraph2-container',
            settings: graphsettings
        });
    }
    if (pagedata.subGraph3) {
        pagedata.subGraph3.graph.clear();
        pagedata.subGraph3.graph.read(pagedata.sigmaGraph.graph.getPathGraph(path3, true));
        pagedata.subGraph3.refresh();
    } else {
        pagedata.subGraph3 = new sigma({
            graph: pagedata.sigmaGraph.graph.getPathGraph(path3, true),
            container: 'subgraph3-container',
            settings: graphsettings
        });
    }
}

/**
 * Updates the counter. This function is meant to be used a callback for an AJAX request.
 * @param {?object} data                     The returned data of the request (assumed json)
 *
 */
function updateCounter(data) {

    var N = pagedata.numberOfNodes;

    // Read the counter text
    var counters = $("#counter-text").text().split(' ');
    var total = (counters.length > 0) ? parseInt(counters[0], 10) : 0;

    // Parse the json data
    var updates = (data) ? processJSON(data) : 0;
    updates = (isNaN(updates) ? 0 : (total + updates > N) ? N - total : updates);

    // update the graph
    if (updates > 0) {
        if (total <= pagedata.userNodeIndex && total + updates > pagedata.userNodeIndex) {
            updateGraph(pagedata.sigmaGraph, total, pagedata.userNodeIndex - total, pagedata.edgesPerNode, pagedata.maxEdgeWeight);
            updateGraph(pagedata.sigmaGraph, pagedata.userNodeIndex + 1, (total + updates) - (pagedata.userNodeIndex + 1), pagedata.edgesPerNode, pagedata.maxEdgeWeight);
        } else {
            updateGraph(pagedata.sigmaGraph, total, updates, pagedata.edgesPerNode, pagedata.maxEdgeWeight);
        }
    }

    // increment the total
    total += updates;

    // output the updated counter to the page
    $("#counter-text").text(total + " nodes (" + updates + ")");

    // Make an AJAX request for new updates
    if (total < N) {
        setTimeout(function () { requestAJAXUpdate(((Math.random() < 0.75) ? 'data0.json' : (Math.random() < 0.5) ? 'data1.json' : 'data2.json'), updateCounter, updateCounter); }, pagedata.updateTimeInterval);
    } else if (pagedata.userRatingsAdded) {
        // fade to the next form
        $('#page-4').fadeOut("fast", function () {
            $('#page-3').fadeIn();
            finalizeGraph(pagedata.sigmaGraph);
            drawNewGraphs();
        });
    }

}

/**
 * Takes the json response and converts it into usable data to update the graph.
 * Gives error messages if the provided JSON is malformed (or if the AJAX call returned an error)
 * @param {?object} data                     The json data of the request
 *
 */
function processJSON(data) {
    
    var ajaxresult = 0;

    if ("nodes" in data) {
        // report the success
        $('#graph-msg-container p.success-text').show();
        $('#graph-msg-container p.invalid-text').hide();
        $('#graph-msg-container p.failure-text').hide();
        $('#graph-msg-container').removeClass('ui-state-error').addClass('ui-state-default');
        $('#graph-msg-container').show();

        ajaxresult = ((Math.random() < 0.8) ? Math.floor((Math.random() * 10)) : 0);

    } else if ("status" in data && data.status == 200) {
        // report the error
        $('#graph-msg-container p.success-text').hide();
        $('#graph-msg-container p.invalid-text').show();
        $('#graph-msg-container p.failure-text').hide();
        $('#graph-msg-container').removeClass('ui-state-default').addClass('ui-state-error');
        $('#graph-msg-container').show();
    } else {

        // report the error
        $('#graph-msg-container p.success-text').hide();
        $('#graph-msg-container p.invalid-text').hide();
        $('#graph-msg-container p.failure-text').show();
        $('#graph-msg-container').removeClass('ui-state-default').addClass('ui-state-error');
        $('#graph-msg-container').show();
    }

    return ajaxresult;
}

/**
 * Helper function to enable or disable a slider if the corresponding checkbox is checked or unchecked
 * @param {?boolean} checked                whether or not the checkbox is checked.
 *                                          true means the corresponding slider will be enabled, false disabled
 *
 * @param {?string} sliderIndex             index of the slider (note it's just a number. not the DOM id)
 *
 */
function enableSlider(checked, sliderIndex) {

    if ($('#form-table input[type="checkbox"]:checked').length > pagedata.edgesPerNode) {

        $('input[type="checkbox"][name="check-' + sliderIndex + '"]').prop("checked", false);
        $('input[type="checkbox"][name="check-' + sliderIndex + '"]').checkboxradio('refresh');

        $('#form-msg-container p.failure-text').hide();
        $('#form-msg-container p.invalid-text').show();
        $('#form-msg-container').show();
    } else {

        $('#form-msg-container p.invalid-text').hide();
        $('#form-msg-container').hide();
        if (checked) {
            $(("#slider-" + sliderIndex)).slider("option", "disabled", false);
        } else {
            $(("#slider-" + sliderIndex)).slider("option", "disabled", true);
        }
    }

}

/**********************
 * SigmaJS support functions.
 * Do not contain any references to DOM objects but need a reference to the sigmaJS instance
 **********************/

/**
 * Create a graph with a fixed number of nodes and no edges.
 * The first node created will be larger than the other nodes and have a different color.
 * @param {?number} N                   The number of nodes.
 *                                      Note: must be > 0.
 *
 * @return {?object}                    A graph
 */
function createGraph(N) {
    var g = {
            nodes: [],
            edges: []
        };

    // Create the nodes
    for (var i = 0; i < N; i++) {
        g.nodes.push({
            id: 'n' + i,
            label: ('Node ' + i),
            x: 100 * Math.cos(2 * i * Math.PI / N),
            y: 100 * Math.sin(2 * i * Math.PI / N),
            size: 1,
            color: '#323232'
        });
    }

    console.log("NEW graph - nodes: " + g.nodes.length + " | edges: " + g.edges.length);
    return g;
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
 * @param {?number} N                   The number of nodes that should get edges.
 *                                      Note: must be > 0.
 *
 * @param {?number} E                   The number of edges that each node should get.
 *                                      Note: must be > 0.
 *
 * @param {?number} maxEdgeWeight       The maximum weight of an edge (the edge will be assigned a random weight between 0 and maxEdgeWeight).
 *                                      Note: must be > 0.
 *
 */
function updateGraph(s, startNodeId, N, E, maxEdgeWeight) {
    var totalNodes = s.graph.nodes().length;

    for (var i = startNodeId; i < startNodeId + N && i < totalNodes ; i++) {
        addEdges(s, i, totalNodes, E, maxEdgeWeight);
    }
    s.refresh();
    console.log("UPDATED sigma - nodes: " + s.graph.nodes().length + " | edges: " + s.graph.edges().length);
}

/**
 * Runs the Force Atlas algorithm to cluster the graph.
 * The first node created will be larger than the other nodes and have a different color.
 * @param {sigma} s                     An instance of the sigma
 * 
 */
function finalizeGraph(s) {

    // Change the colors based on incoming edge weights
    s.graph.updateColors();
    s.refresh();

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

/**
 * Adds a variable number of outgoing edges with random weight to the i-th node of the graph.
 * Assumes that the i-th node has no outgoing edges.
 * @param {sigma} s                     An instance of the sigma
 *
 * @param {?number} i                   The index of the node that should get Edges
 *                                      Note: must be > 0 and < totalNodes
 *
 * @param {?number} totalNodes          The number of nodes in the graph
 *                                      Note: must be > 0.
 * @param {?number} E                   The number of edges that each node should get.
 *                                      Note: must be > 0.
 *
 * @param {?number} maxEdgeWeight       The maximum weight of an edge (the edge will be assigned a random weight between 0 and maxEdgeWeight).
 *                                      Note: must be > 0.
 */
function addEdges(s, i, totalNodes, E, maxEdgeWeight) {

    var targetIndex,
        weight,
        variableEdges = 0,
        nodeSet = [];

    // Add Edges
    for (var j = Math.floor(Math.random() * variableEdges) + E; j > 0 ; j--) {

        // Generate a random weight for the edge
        weight = ((Math.random() * maxEdgeWeight) | 0);

        // Find a target node that this node is not connected to. (p is just there to avoid getting stuck in a permanent loop)
        var p = 0;
        do {
            p++;
            targetIndex = (Math.random() < 0.5) ? ((Math.random() * totalNodes) | 0) : (Math.floor(i / 10) * 10 + ((Math.random() * 10) | 0));
        } while ((targetIndex == i || $.inArray(targetIndex, nodeSet) != -1 || targetIndex >= totalNodes) && p < 100);
        nodeSet.push(targetIndex);

        // Add the edge
        s.graph.addEdge({
            id: ('e' + i + '-' + targetIndex),
            source: 'n' + i,
            target: 'n' + targetIndex,
            weight: weight,
            type: "arrow",
            color: getColorFromRange(weight, maxEdgeWeight, true)
        });
    }
}

/**********************
 * Generic support functions.
 * Do not contain any references to DOM objects and don't need sigmaJS
 **********************/

function convertFromEdgeWeight(value, maxEdgeWeight){
    return ( ( value * 2 ) / maxEdgeWeight ) - 1;
}

function convertToEdgeWeight(value, maxEdgeWeight){
    return ( ( value + 1 ) * maxEdgeWeight ) / 2;
}



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

/**
 * Makes an asynchronous AJAX request for a data update.
 * @param {?string} targetURL           The targetURL for the AJAX callback
 *
 * @param {?object} successCallback     The callback function for success of the AJAX call
 *
 * @param {?object} errorCallback       The callback function for error of the AJAX call
 *
 */
function requestAJAXUpdate(targetURL, successCallback, errorCallback) {

    $.ajax({
        url: targetURL,
        dataType: 'json',
        success: successCallback,
        error: errorCallback
    });
}
