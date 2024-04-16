const urls = {
    // source: https://observablehq.com/@mbostock/u-s-airports-voronoi
    // source: https://github.com/topojson/us-atlas
    map: "./data/usStates.json",

    // source: https://gist.github.com/mbostock/7608400
    airports:
        // "https://gist.githubusercontent.com/mbostock/7608400/raw/e5974d9bba45bc9ab272d98dd7427567aafd55bc/airports.csv",
        "./data/states_coord.csv",

    // source: https://gist.github.com/mbostock/7608400
    flights:
        // "https://gist.githubusercontent.com/mbostock/7608400/raw/e5974d9bba45bc9ab272d98dd7427567aafd55bc/flights.csv"
        // "./data/flights_mini.csv",
        // "./data/flights_10k.csv",
        "./data/flights_full.csv",
    covid:
        // "./data/COVID_data_perCapita.csv"
        "./data/COVID_data_perCapita_cut.csv"
        // "./data/COVID_data_final.csv"
};

const margin = { top: 0, right: 0, bottom: 0, left: 50 }
const svg = d3.select("svg").attr("transform", `translate(${margin.left}, ${margin.top})`);;

const width = parseInt(svg.attr("width"));
const height = parseInt(svg.attr("height"));
const hypotenuse = Math.sqrt(width * width + height * height);
// const lowColor = '#006600'
const lowColor = '#ffffff'
const highColor = '#ff0000'
// const ignore_zero = true;
const ignore_zero = false;

//weeks Array is needed for the slider
var weeksArr = [];
// javscript key-value map
var state_to_value = new Map();


// must be hard-coded to match our topojson projection
// source: https://github.com/topojson/us-atlas
// const projection = d3.geoAlbers().scale(1280).translate([480, 300]);
const projection = d3.geoAlbersUsa()
    //has to be width/2, height/2 so that it's properly centered.
    .translate([width / 2, height / 2])
    .scale([1000]);

const scales = {
    // used to scale airport bubbles
    airports: d3.scaleSqrt()
        .range([2, 25]),

    // used to scale number of segments per line
    segments: d3.scaleLinear()
        .domain([0, hypotenuse])
        .range([1, 10])
};



// have these already created for easier drawing
const g = {
    basemap: svg.select("g#basemap"),
    flights: svg.select("g#flights"),
    airports: svg.select("g#airports"),
    voronoi: svg.select("g#voronoi")
};

console.assert(g.basemap.size() === 1);
console.assert(g.flights.size() === 1);
console.assert(g.airports.size() === 1);
console.assert(g.voronoi.size() === 1);

const tooltip = d3.select("text#tooltip");
console.assert(tooltip.size() === 1);

// load and draw base map
d3.json(urls.map).then(drawMap)


// load the airport and flight data together
const promises = [
    d3.csv(urls.airports, typeAirport),
    d3.csv(urls.flights, typeFlight),
    d3.csv(urls.covid, typeCovid),
];

Promise.all(promises).then(processData);

// process airport and flight data
function processData(values) {
    console.assert(values.length === 3);

    let all_airports = values[0];
    let all_flights = values[1];
    let covid_data = values[2];
    // var week = "2020-10-31";
    var week = "2020-02-29";

    // process covid data
    covid_data.minVal = d3.min(covid_data, function (d) { return +d.value; });
    covid_data.maxVal = d3.max(covid_data, function (d) { return +d.value; });
    const ramp = d3.scaleLinear().domain([covid_data.minVal, covid_data.maxVal]).range([lowColor, highColor])

    // console.log("ramp: " + ramp)
    var weekData = covid_data.filter(function (d) {
        if (d.week == week) { return d }
    });

    console.log("total flight count: " + flights.length)
    flights = all_flights.filter(function (d) {
        if (d.week == week) { return d }
    });
    console.log("total flight count: " + flights.length)

    console.log("weekData.length: " + weekData.length)
    console.log("state_to_value: " + state_to_value)
    // console.log("state_to_value: " + state_to_value.get("Alabama"))
    // state_to_value.set("Alabama", 5)
    // console.log("state_to_value: " + state_to_value.get("Alabama"))
    // console.log("weekData.length: " + weekData.length)

    // draw map
    updateChart(week, covid_data, ramp)

    for (var d = 0; d < covid_data.length; d++) {
        if (!weeksArr.includes(covid_data[d].week)) {
            weeksArr.push(covid_data[d].week)
        }
    }
    const slider = d3.select("#mySlider")
    slider.max = weeksArr.length;
    console.log("weeksArr.length: " + weeksArr.length)


    console.log("covid.minVal: " + covid_data.minVal)
    console.log("covid.maxVal: " + covid_data.maxVal)
    console.log("covid.length: " + covid_data.length)

    console.log("airports: " + all_airports.length);
    console.log("flights: " + flights.length);

    // convert airports array (pre filter) into map for fast lookup
    // let iata = new Map(airports.map(node => [node.iata, node]));
    // let iata = new Map(airports.map(node => [node.usa_state_code, node]));
    let iata = new Map(all_airports.map(node => [node.usa_state, node]));

    // calculate incoming and outgoing degree based on flights
    // flights are given by airport iata code (not index)
    flights.forEach(function (link) {


        link.source = iata.get(link.origin_state);
        // console.log("link.source: " + link.source)
        // console.log("link.dest_state: " + link.dest_state)
        link.target = iata.get(link.dest_state);
        // console.log("link.origin_state: " + link.origin_state)
        // console.log("link.dest_state: " + link.dest_state)
        // console.log("link.source: " + link.source.usa_state)
        // console.log("link.target: " + link.target.usa_state)
        link.source.outgoing += link.count;
        link.target.incoming += link.count;
    });

    // remove airports out of bounds
    let old = all_airports.length;
    airports = all_airports.filter(airport => airport.x >= 0 && airport.y >= 0);
    console.log(" removed: " + (old - airports.length) + " airports out of bounds");

    // remove airports with NA state
    old = airports.length;
    airports = airports.filter(airport => airport.state !== "NA");
    console.log(" removed: " + (old - airports.length) + " airports with NA state");

    // remove airports without any flights
    old = airports.length;
    airports = airports.filter(airport => airport.outgoing > 0 && airport.incoming > 0);
    console.log(" removed: " + (old - airports.length) + " airports without flights");

    // sort airports by outgoing degree
    airports.sort((a, b) => d3.descending(a.outgoing, b.outgoing));

    // keep only the top airports
    old = airports.length;
    airports = airports.slice(0, 50);
    console.log(" removed: " + (old - airports.length) + " airports with low outgoing degree");

    // done filtering airports can draw
    drawAirports(airports);
    drawPolygons(airports, covid_data);
    drawLegend(covid_data.minVal, covid_data.maxVal);
    drawTitle();
    drawLabel(week);

    // reset map to only include airports post-filter
    iata = new Map(airports.map(node => [node.iata, node]));

    // filter out flights that are not between airports we have leftover
    old = flights.length;
    flights = flights.filter(link => iata.has(link.source.iata) && iata.has(link.target.iata));
    console.log(" removed: " + (old - flights.length) + " flights");


    // done filtering flights can draw
    drawFlights(airports, flights);

    d3.select("#mySlider").on("change", function (d) {
        var newWeek = weeksArr[this.value];
        console.log("newWeek: " + newWeek);
        updateChart(newWeek, covid_data, ramp);
        filtered_airport = updateAirport(newWeek, all_airports, all_flights);
        updateFlight(newWeek, filtered_airport, all_flights)
    })

    console.log({ airports: airports });
    console.log({ flights: flights });

}

// draws the underlying map
function drawMap(map) {
    map.features.forEach(function (d) {
        console.log("add to map d.name: " + d.properties.name);
        state_to_value.set(d.properties.name, 0)
    });

    // console.log("weekData.length: " + weekData.length)
    // console.log("weekData.length: " + weekData.length)
    // console.log("weekData: " + weekData[0])

    console.log("drawMap");
    console.log("drawMap: " + map.features);



    const path = d3.geoPath()
        .projection(projection);

    // actually draw the grid
    g.basemap
        .selectAll("path")
        .data(map.features)
        .enter()
        .append("path")
        .attr("d", path)
        // .style("stroke", "#ffffff")
        .style("stroke", "#adadad")
        // .style("stroke-width", "1")
        .style("stroke-width", "2")
        .style("fill", "#dddddd");
}

function drawAirports(airports) {
    // adjust scale
    const extent = d3.extent(airports, d => d.outgoing);
    // scales.airports.domain(extent);
    const max_circle_size = Math.max(20000, d3.max(extent));
    scales.airports.domain([1, max_circle_size]);

    // draw airport bubbles
    g.airports.selectAll("circle.airport")
        .data(airports, d => d.iata)
        .enter()
        .append("circle")
        .attr("r", d => scales.airports(d.outgoing))
        .attr("cx", d => d.x) // calculated on load
        .attr("cy", d => d.y) // calculated on load
        .attr("class", "airport")
        .each(function (d) {
            // adds the circle object to our airport
            // makes it fast to select airports on hover
            d.bubble = this;
        });
}

function drawLegend(minVal, maxVal) {

    // add a legend
    var w = 140, h = 300;

    var key = d3.select("body")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "legend");

    var legend = key.append("defs")
        .append("svg:linearGradient")
        .attr("id", "gradient")
        .attr("x1", "100%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%")
        .attr("spreadMethod", "pad");

    legend.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", highColor)
        .attr("stop-opacity", 1);

    legend.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", lowColor)
        .attr("stop-opacity", 1);

    key.append("rect")
        .attr("width", w - 100)
        .attr("height", h)
        .style("fill", "url(#gradient)")
        .attr("transform", "translate(0,10)");

    var y = d3.scaleLinear()
        .range([h, 0])
        .domain([minVal, maxVal]);

    var yAxis = d3.axisRight(y);

    key.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(41,10)")
        .call(yAxis)

    //end legend
}

function drawTitle() {
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", 300)
        .attr("y", 40)
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif")
        .text("U.S. Covid Deaths per capita vs. Air Travel");
    var label2 = d3.select("#reminderText")
        label2.append("text")
            .attr("class", "weekText")
            .style("font-size", "12px")
            .style("font-family", "sans-serif")
            .text("Hover over states for more info! Grey states are missing data.");
}

function drawLabel(week) {
    var label = d3.select("#weekText")
    label.append("text")
        .attr("class", "weekText")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif")
        .text(week);
}


function drawPolygons(airports, covid_data) {
    // convert array of airports into geojson format
    const geojson = airports.map(function (airport) {
        return {
            type: "Feature",
            properties: airport,
            geometry: {
                type: "Point",
                coordinates: [airport.longitude, airport.latitude]
            }
        };
    });

    // calculate voronoi polygons
    const polygons = d3.geoVoronoi().polygons(geojson);
    console.log(polygons);

    g.voronoi.selectAll("path")
        .data(polygons.features)
        .enter()
        .append("path")
        .attr("d", d3.geoPath(projection))
        .attr("class", "voronoi")
        .on("mouseover", function (d) {
            let airport = d.properties.site.properties;

            d3.select(airport.bubble)
                .classed("highlight", true);

            d3.selectAll(airport.flights)
                .classed("highlight", true)
                .raise();

            // make tooltip take up space but keep it invisible
            tooltip.style("display", null);
            tooltip.style("visibility", "hidden");

            // set default tooltip positioning
            tooltip.attr("text-anchor", "middle");
            tooltip.attr("dy", -scales.airports(airport.outgoing) - 4);
            tooltip.attr("x", airport.x);
            tooltip.attr("y", airport.y);

            tooltip.attr("data-html", "true")
            // set the tooltip text
            // tooltip.text(airport.name + " in " + airport.city + ", " + airport.state);
            tooltip.text(airport.usa_state +
                "\noutgoing flight: " + airport.outgoing +
                "\nincoming flight: " + airport.incoming + 
                " Weekly Deaths: " + state_to_value.get(airport.usa_state)
                // " test: " + Number(state_to_value.get(airport.usa_state)).toPrecision(5)
                // " test: " + d.properties.name
            );

            // double check if the anchor needs to be changed
            let bbox = tooltip.node().getBBox();

            if (bbox.x <= 0) {
                tooltip.attr("text-anchor", "start");
            }
            else if (bbox.x + bbox.width >= width) {
                tooltip.attr("text-anchor", "end");
            }

            tooltip.style("visibility", "visible");
        })
        .on("mouseout", function (d) {
            let airport = d.properties.site.properties;

            d3.select(airport.bubble)
                .classed("highlight", false);

            d3.selectAll(airport.flights)
                .classed("highlight", false);

            d3.select("text#tooltip").style("visibility", "hidden");
        })
        .on("dblclick", function (d) {
            // toggle voronoi outline
            let toggle = d3.select(this).classed("highlight");
            d3.select(this).classed("highlight", !toggle);
        });
}

function drawFlights(airports, flights) {
    // break each flight between airports into multiple segments
    let bundle = generateSegments(airports, flights);

    // https://github.com/d3/d3-shape#curveBundle
    let line = d3.line()
        .curve(d3.curveBundle)
        .x(airport => airport.x)
        .y(airport => airport.y);

    let links = g.flights.selectAll("path.flight")
        .data(bundle.paths)
        .enter()
        .append("path")
        .attr("d", line)
        .attr("class", "flight")
        .each(function (d) {
            // adds the path object to our source airport
            // makes it fast to select outgoing paths
            d[0].flights.push(this);
        });

    // https://github.com/d3/d3-force
    let layout = d3.forceSimulation()
        // settle at a layout faster
        .alphaDecay(0.1)
        // nearby nodes attract each other
        .force("charge", d3.forceManyBody()
            .strength(10)
            .distanceMax(scales.airports.range()[1] * 2)
        )
        // edges want to be as short as possible
        // prevents too much stretching
        .force("link", d3.forceLink()
            .strength(0.7)
            .distance(0)
        )
        .on("tick", function (d) {
            links.attr("d", line);
        })
        .on("end", function (d) {
            console.log("layout complete");
        });

    layout.nodes(bundle.nodes).force("link").links(bundle.links);
}

// Turns a single edge into several segments that can
// be used for simple edge bundling.
function generateSegments(nodes, links) {
    // generate separate graph for edge bundling
    // nodes: all nodes including control nodes
    // links: all individual segments (source to target)
    // paths: all segments combined into single path for drawing
    let bundle = { nodes: [], links: [], paths: [] };

    // make existing nodes fixed
    bundle.nodes = nodes.map(function (d, i) {
        d.fx = d.x;
        d.fy = d.y;
        return d;
    });

    links.forEach(function (d, i) {
        // calculate the distance between the source and target
        let length = distance(d.source, d.target);

        // calculate total number of inner nodes for this link
        let total = Math.round(scales.segments(length));

        // create scales from source to target
        let xscale = d3.scaleLinear()
            .domain([0, total + 1]) // source, inner nodes, target
            .range([d.source.x, d.target.x]);

        let yscale = d3.scaleLinear()
            .domain([0, total + 1])
            .range([d.source.y, d.target.y]);

        // initialize source node
        let source = d.source;
        let target = null;

        // add all points to local path
        let local = [source];

        for (let j = 1; j <= total; j++) {
            // calculate target node
            target = {
                x: xscale(j),
                y: yscale(j)
            };

            local.push(target);
            bundle.nodes.push(target);

            bundle.links.push({
                source: source,
                target: target
            });

            source = target;
        }

        local.push(d.target);

        // add last link to target node
        bundle.links.push({
            source: target,
            target: d.target
        });

        bundle.paths.push(local);
    });

    return bundle;
}

// determines which states belong to the continental united states
// https://gist.github.com/mbostock/4090846#file-us-state-names-tsv
function isContinental(state) {
    const id = parseInt(state.id);
    return id < 60 && id !== 2 && id !== 15;
}

// see airports.csv
// convert gps coordinates to number and init degree
function typeAirport(airport) {
    airport.longitude = parseFloat(airport.longitude);
    airport.latitude = parseFloat(airport.latitude);

    // use projection hard-coded to match topojson data
    const coords = projection([airport.longitude, airport.latitude]);
    // console.log("coords: " + coords);
    // console.log("airport: " + airport.usa_state);
    airport.x = coords[0];
    airport.y = coords[1];

    airport.outgoing = 0;  // eventually tracks number of outgoing flights
    airport.incoming = 0;  // eventually tracks number of incoming flights

    airport.flights = [];  // eventually tracks outgoing flights

    return airport;
}

// see flights.csv
// convert count to number
function typeFlight(flight) {
    flight.count = parseInt(flight.count);
    return flight;
}
function typeCovid(covid) {
    // just in case we need to parse covid data

    return covid;
}

// calculates the distance between two nodes
// sqrt( (x2 - x1)^2 + (y2 - y1)^2 )
function distance(source, target) {
    const dx2 = Math.pow(target.x - source.x, 2);
    const dy2 = Math.pow(target.y - source.y, 2);

    return Math.sqrt(dx2 + dy2);
}

function updateChart(week, data, ramp) {
    // Filter data based on slider values

    var label = d3.select("#weekText")
    label.select("text")
        .text(week);

    var weekData = data.filter(function (d) {
        if (d.week == week) { return d }
    });

    //update json data
    weekData.forEach(function (row) {
        // state_to_value.set(row.state, row.value);
        if (row.value !== "No Data") {
            state_to_value.set(row.state, Number(row.value).toPrecision(3));
        }
        else {
            state_to_value.set(row.state, row.value);
        }
        
    })

    //redraw map
    svg.selectAll("path").style("fill", function (d) {
        // console.log("d.properties: " + d.properties)
        if (typeof d.properties !== 'undefined') {
            if(state_to_value.get(d.properties.name) == "No Data"){
                return "grey";
            }
            // console.log("d.properties: " + d.properties.name)
            return ramp(state_to_value.get(d.properties.name));
        }
    });
}

function updateAirport(newWeek, all_airports, all_flights) {
    console.log("===============")
    console.log("update airport")
    // reset the flight count
    all_airports.forEach(function (airport) {
        airport.outgoing = 0;  // eventually tracks number of outgoing flights
        airport.incoming = 0;  // eventually tracks number of incoming flights
    })

    // filter the flight by date
    console.log("before filter " + all_flights.length)
    flights = all_flights.filter(function (d) {
        if (d.week == newWeek) { return d }
    });
    console.log("after filter " + flights.length)
    if (ignore_zero) {
        if (flights.length === 0) {
            return;
        }
    }

    let iata = new Map(all_airports.map(node => [node.usa_state, node]));
    flights.forEach(function (link) {
        link.source = iata.get(link.origin_state);
        link.target = iata.get(link.dest_state);
        link.source.outgoing += link.count;
        link.target.incoming += link.count;
    });
    airports = all_airports.filter(airport => airport.outgoing > 0 && airport.incoming > 0);
    airports.sort((a, b) => d3.descending(a.outgoing, b.outgoing));

    // adjust scale
    const extent = d3.extent(airports, function (d) {
        return d.outgoing
    });

    const max_circle_size = Math.max(20000, d3.max(extent));
    scales.airports.domain([1, max_circle_size]);

    // console.log("extent: " + extent)
    console.log("extent: " + d3.max(extent))
    console.log("extent.max: " + scales.airports(d3.max(extent)))
    // console.log("extent.max: " + scales.airports(24495))

    g.airports.selectAll("circle.airport")
        // .attr("r", d => scales.airports(d.outgoing))
        .transition()
        .duration(500)
        .attr("r", d => scales.airports(d.outgoing)  || 0)
        .attr("cx", d => d.x) // calculated on load
        .attr("cy", d => d.y) // calculated on load
    return airports;
}

function updateFlight(newWeek, filtered_airport, all_flights) {
    // filter the flight by date
    console.log("before filter " + all_flights.length)
    flights = all_flights.filter(function (d) {
        if (d.week == newWeek) { return d }
    });
    console.log("after filter " + flights.length)
    if (ignore_zero) {
        if (flights.length === 0) {
            return;
        }
    }

    g.flights.selectAll("path.flight").remove();
    drawFlights(filtered_airport, flights);
}