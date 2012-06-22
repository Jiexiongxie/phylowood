// namespace
var Phylowood = Phylowood || {};

/***
INPUT
***/

Phylowood.readInputFromHttp = function() {
	this.inputHttp = $( "#textInputHttp" ).attr("value");
	$.get(Phylowood.inputHttp, function(response) {
		//if (Phylowood.inputStr === "")
		Phylowood.inputStr = response;
	})
	.success(function() { })
	.error(function() { })
	.complete(function() { 
		Phylowood.loadInput();
	});
};

Phylowood.loadInput = function() {

	// dump to inputTextArea
	$("#textareaInput").val(this.inputStr);

};

Phylowood.reset = function() {

	// clear divGeo of polymaps
	this.map = null;

	// clear divPhylo of jsPhyloSvg
	// 	um, .clear() is apparently undefined in the library
	// 	another reason to draw the tree myself
	this.phylocanvas = null;

	// restore divPhylo with textarea and default text

	// restore clock state
};

$( "#selectDemoData" ).change(function() {

	// get current dropdown selection for demo data	
	var inputDemoOption = this.options[this.selectedIndex];
	console.log(inputDemoOption);

	// load input into text area
	if (inputDemoOption.value !== "nothing") {
		$.get(inputDemoOption.value, function(response) {
		//if (Phylowood.inputStr === "")
		Phylowood.inputStr = response;
		})
		.success(function() { })
		.error(function() { })
		.complete(function() { });
	}
});


/***
INITIALIZE DATA
***/

Phylowood.initialize = function() {
	
	// reset system state
	this.reset();

	// parse input in inputTextArea
	this.parseInput();

	// then initialize
	this.initStates();
	this.initGeo();
	this.initTree();
	this.initMarkers();
	this.initMap();
	this.initPlayer();
	
};

Phylowood.parseInput = function() {

	// update inputStr from inputTextArea
	this.inputStr = $( "#textareaInput" ).val();
	if (this.inputStr === "") {
		console.log("WARNING: Phylowood.parseInput(): inputStr === \"\"");
		return;
	}
	
	// tokenize inputStr
	var inputTokens = this.inputStr.split(/\r\n|\r|\n/);
		
	// parse inputTokens
	this.treeStr = "";
	this.geoStr = "";
	this.statesStr = "";
	var parseSelect = "";
	
	for (var i = 0; i < inputTokens.length; i++) {
		if (inputTokens[i] === "#GEO")
			parseSelect = "geo";
		else if (inputTokens[i] === "#STATES")
			parseSelect = "states";
		else if (inputTokens[i] === "#TREE")
			parseSelect = "tree";
		else if (parseSelect === "geo")
			this.geoStr += inputTokens[i] + "\n";
		else if (parseSelect === "states")
			this.statesStr += inputTokens[i] + "\n";
		else if (parseSelect === "tree")
			this.treeStr += inputTokens[i] + "\n";
		else
			; // do nothing
	}
	
};

Phylowood.initStates = function() {
	
	// tokenize statesTokens
	var statesTokens = this.statesStr.split("\n");

	// store tokens into taxa and states
	this.taxa = [];
	this.states = [];
	var taxonTokens;
	
	for (var i = 0; i < statesTokens.length; i++) {
		taxonTokens = statesTokens[i].split(" ");
		if (taxonTokens.length > 1) {
			this.taxa.push(taxonTokens[0]);
			var taxonVals = [];
			for (var j = 1; j < taxonTokens.length; j++) {
				taxonVals.push(parseFloat(taxonTokens[j]));
			}
			this.states.push(taxonVals);
		}
	}

	this.numNodes = this.states.length;
	this.numTips = (this.numNodes + 1) / 2;
	
	/*
	console.log("Phylowood.initStates():");
	console.log(this.taxa);
	console.log(this.states);
	*/
	
};

Phylowood.initGeo = function() {

	// tokensize geoStr
	var geoTokens = this.geoStr.split("\n");

	// assign geoTokens to geoCoords	
	var coordTokens;
	this.geoCoords = [];
	this.maxGeoCoords = [-181.0, -181.0, 181.0, 181.0]; // [N, E, S, W]
	
	// input expects "latitude longitude"
	// maps to [i][0] and [i][1] resp.
	for (var i = 0; i < geoTokens.length; i++) {
		var coordVals = [];
		coordTokens = geoTokens[i].split(" ");
		if (coordTokens.length == 2) {
			// store coordinates
			this.geoCoords.push({"lat":coordTokens[0], "lon":coordTokens[1]});

			// compute maxima for geographical coordinates
			if (this.geoCoords[i].lat > this.maxGeoCoords[0]) // N
				this.maxGeoCoords[0] = this.geoCoords[i].lat;
			if (this.geoCoords[i].lon > this.maxGeoCoords[1]) // E
				this.maxGeoCoords[1] = this.geoCoords[i].lon;
			if (this.geoCoords[i].lat < this.maxGeoCoords[2]) // S
				this.maxGeoCoords[2] = this.geoCoords[i].lat;
			if (this.geoCoords[i].lon < this.maxGeoCoords[3]) // W
				this.maxGeoCoords[4] = this.geoCoords[i].lon;
		}
	}
	
	var numAreas = this.geoCoords.length;
	
	// construct distance matrix geoDistances
	this.distanceType = "Euclidean";
	this.geoDistances = [];
	for (var i = 0; i < numAreas; i++) {
		var distanceVals = [];
		for (var j = 0; j < numAreas; j++) {
			if (i === j) {
				distanceVals.push(0.0);
			}
			else {
				distanceVals.push( Phylowood.distance(
					this.geoCoords[i],
					this.geoCoords[j]));
			}
		}
		this.geoDistances.push(distanceVals);
	}

	/*
	console.log("Phylowood.initGeo():");
	console.log(this.geoCoords);
	console.log(this.divCoords);
	console.log(this.geoDistances);
	*/
};

Phylowood.distance = function(x, y) {
	var z = 0.0;
	if (this.distanceType === "Euclidean") {
		// fast and easy
		z += (x.lat - y.lat)^2;
		z += (x.lon - y.lon)^2;
		z = z^0.5;
	}
	else if (this.distanceType === "haversine") {
		// implement if needed
		;
	}
	else {
		alert("Phylowood.distance(): unknown distance \"" + this.distanceType + "\"");
		z = -1.0;
	}
	return z;
};


Phylowood.initTree = function() {

	// parse Newick string
	var newickStr = this.treeStr;
	var readTaxonName = false;
	var readBrlen = false;
	var numTaxa = 0;
	var temp = "";
	var newickTokens = [];
	for (var i = 0; i < newickStr.length; i++) {
		var c = newickStr[i];
		if (c === ' ')
			continue;
		if (c === '(' || c === ')' || c === ',' || c === ':' || c === ';') {
			temp = c;
			newickTokens.push(temp);
			if ( c === ':' )
				readBrlen = true;
			else
				readBrlen = false;
		}
		else {
			// the character is part of a taxon name
			var j = i;
			var taxonName = "";
			while ( newickStr[j] !== '('
			     && newickStr[j] !== ')'
			     && newickStr[j] !== ','
			     && newickStr[j] !== ':'
			     && newickStr[j] !== ';' )
			{
				taxonName += newickStr[j];
				j++;
			}
			newickTokens.push(taxonName);
			i = j - 1;
			if ( readBrlen === false )
				numTaxa++;
			readBrlen = false;
		}
		if ( c === ';' )
			break;
	}
	
	// construct Tree from newickTokens	
	this.nodes = [];
	this.root = null;
	var p = null;

	readBrlen = false;
	
	for (var i = 0; i < newickTokens.length; i++) {
		
		// indicates new node
		if ( newickTokens[i] === "(" ) {

			if (p === null) {
				p = new Phylowood.Node;
				this.nodes.push(p);
				this.root = p;
			}
			else {
				var q = new Phylowood.Node;
				q.ancestor = p;
				this.nodes.push(q);
				p.descendants.push(q);
				p = q;
			}
			readBrlen = false;
		}
		
		// indicates end of clade
		else if ( newickTokens[i] === ")" ) {
            if (p.ancestor !== null) {
            	p = p.ancestor;
            }
            else {
                console.log("Phylowood.initTree(): Problem going down tree");
            }
			readBrlen = false;
		}
		
		// indicates divergence event
		else if ( newickTokens[i] === "," ) {
            if (p.ancestor !== null) {
                p = p.ancestor;
            }
            else {
                console.log("Phylowood.initTree(): Problem going down tree");
            }
			readBrlen = false;
		}
		
		// next token is branch length
		else if ( newickTokens[i] === ":" )
		{
			readBrlen = true;
		}
		
		// no tokens (should) remain
		else if ( newickTokens[i] === ";" ) {
			; // do nothing
		}
		else {
			// taxon name token
			if (readBrlen === false) {
        		var tipName = newickTokens[i];
        		var tipIdx = -1;
        		for (var j = 0; j < this.taxa.length; j++) {
        			if (tipName === this.taxa[j]) {
        				tipIdx = j;
        				break;
        			}
        		}
        		if (tipIdx === -1) {
        			console.log("Phylowood.initTree(): Could not find " + tipName + " in Phylowood.taxa");
        		}
        		
        		// internal node
        		if (newickTokens[i-1] === ")") {
        			p.id = tipIdx;
        			p.name = tipName;
        		}
        		
        		// tip node
        		else {
					var q = new Phylowood.Node;
					q.id = tipIdx;
					q.ancestor = p;
					q.name = tipName;
					this.nodes.push(q);
					p.descendants.push(q);
					p = q;
				}
			}
			
			// branch length token
			else {
				// reading a branch length 
				var x = parseFloat(newickTokens[i]);
				if (x < 0.00001)
					x = 0.00001;
                p.len = x;
				readBrlen = false;
			}
		}
	}

	// assign states to nodes
	for (var i = 0; i < this.numNodes; i++) {
		for (var j = 0; j < this.states.length; j++) {
			if (this.nodes[i].name === this.taxa[j]) {
				this.nodes[i].states = this.states[j];
				this.nodes[i].id = j;
			}
		}
	}

	// assign absolute times to nodes, defined as:
	// [t_begin, t_end] = [this.root.timeStart, max(this.nodes[i].timeEnd)]
	var setTime = function(p) {
		if (p.ancestor !== null) {
			p.timeEnd = p.len + p.ancestor.timeEnd;
			p.timeStart = p.ancestor.timeEnd;
		}
		for (var i = 0; i < p.descendants.length; i++) {
			setTime(p.descendants[i], p.timeEnd);
		}
	}
	setTime(this.root);
	
	// determine time-based order of nodes (for animation purposes)
	this.nodesByTime = [];
	for (var i = 0; i < this.nodes.length; i++) {
		this.nodesByTime.push(this.nodes[i]);
	}
	this.nodesByTime.sort(function(a,b){return a.timeEnd - b.timeEnd;});
	this.startPhyloTime = this.nodesByTime[0].timeEnd;
	this.endPhyloTime = this.nodesByTime[this.numNodes-1].timeEnd;

	// set colors for nodes	
	this.initNodeColors();

	// draw tree using jsPhyloSvg
	var margin = 0.1;
	var divH = document.getElementById("divPhylo").offsetHeight;
	var divW = document.getElementById("divPhylo").offsetWidth;
	var marginH = divH * margin / 2;
	var marginW = divW * margin / 2;
	
	this.phylocanvas = new Smits.PhyloCanvas(
		{
			newick: newickStr
		},
		'divPhylo',
		divH,
		divW
	);
	
	// still need to get some info from this.phylocanvas about branch lengths in pixels
	// color branch lengths, etc
/*
	console.log(newickStr);
	console.log(newickTokens);
	console.log(this.nodes);	
	console.log(this.nodesByTime);
*/
};

Phylowood.Node = function() {
	return function(o, parentInstance){
		// initiate object
		this.id = Smits.Common.nodeIdIncrement += 1; // equals states index
		this.level = 0;
		this.len = 0;
		this.timeEnd = 0;
		this.timeStart = 0;
		this.ancestor = null;
		this.descendants = [];
		this.name = '';
		this.type = '';
		this.chart = {};
		this.img = [];
		this.color = [0,0,0];
		this.states = [];
		
		if(o) Smits.Common.apply(this, o);

		/* Cache Calculations */
		this._countAllChildren = false;
		this._countImmediateChildren = false;
		this._midBranchPosition = false;
		
		this.children = new Array();
		
		if(parentInstance){
			parentInstance.children.push(this); 
		}
	}
}();

Phylowood.Tree = function() {
	this.nodes = [];

};


Phylowood.initNodeColors = function() {
	
	var lStep = 0.5 / (this.nodesByTime[this.numNodes-1].timeEnd - this.nodesByTime[0].timeEnd);
	var hStep = 360.0 / (this.numTips - 1);

	var lValue = 0.0;
	var hValue = 0.0;

	// assign colors uniformly across tips
	for (var i = 0; i < this.numNodes; i++) {
		if (this.nodes[i].descendants.length === 0) {
			lValue = 1.0 - lStep*this.nodes[i].timeEnd;
			this.nodes[i].color = [hValue, 1, lValue];
			hValue += hStep;
		}
	}

	// set internal nodes based on tip colors
	//for (var i = 0; i < this.nodes.length; i++) {
	for (var i = this.numNodes-1; i >= 0; i--) {
		if (this.nodesByTime[i].descendants.length > 0) {

			// get average color of descendants
			var hTemp = 0.0;
			for (var j = 0; j < this.nodesByTime[i].descendants.length; j++) {
				hTemp += this.nodesByTime[i].descendants[j].color[0];
			}
			hTemp /= this.nodesByTime[i].descendants.length;
			lValue = 1.0 - lStep*this.nodesByTime[i].timeEnd;
	
			this.nodesByTime[i].color = [hTemp, 1, lValue];
			
		}
		// console.log(this.nodesByTime[i].color);
	}
}

Phylowood.initMarkers = function() {
	this.markers = [];
//	var showStart = 20;
//	var showOnly = 20;
	var showStart = 0;
	var showOnly = this.numNodes;

	this.showThreshhold = 0.5;
	
/*
	var colors;
	for (var i = 0; i < showOnly; i++)
		colors[i] = "hsl(" + Math.random() * 360 + ",100%,50%)";
*/
	
	for (var i = showStart; i < showOnly + showStart; i++) {
		var id = this.nodes[i].id;
		var c = this.nodes[i].color;
		var timeStart = this.nodes[i].timeStart;
		var timeEnd = this.nodes[i].timeEnd;

		for (var j = 0; j < this.nodes[i].states.length; j++) {
			this.Markers = [];
			if (this.nodes[i].states[j] > this.showThreshhold) {
				//if (this.nodes[i].descendants.length === 0) {
				//	console.log("states??:" + ","+i +"," + j);
				//}
				
				this.markers.push({
					"id": id,
					"area": j,
					"val": this.nodes[i].states[j],
					"active": false,
					"timeStart": timeStart,
					"timeEnd": timeEnd,
					"color": "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)",
					"scheduleErase": false,
					"scheduleDraw": false
					//"color": colors[i-showStart]
				});
			}
		}
	}
	
//	return this.markers;

/*
	// test data
	return [
	        {"id":0, "area":0, "val":.3, "color":"red"},
	        {"id":0, "area":2, "val":.7, "color":"red"},
	        {"id":1, "area":0, "val":.4, "color":"yellow"},
	        {"id":1, "area":1, "val":.2, "color":"yellow"},
	        {"id":1, "area":2, "val":.4, "color":"yellow"},
	        {"id":2, "area":1, "val":.5, "color":"blue"},
	        {"id":2, "area":2, "val":.5, "color":"blue"},
   	        {"id":0, "area":0, "val":.3, "color":"red"},
	        {"id":0, "area":2, "val":.7, "color":"red"},
	        {"id":1, "area":0, "val":.4, "color":"yellow"},
	        {"id":1, "area":1, "val":.2, "color":"yellow"},
	        {"id":1, "area":2, "val":.4, "color":"yellow"},
	        {"id":2, "area":1, "val":.5, "color":"blue"},
	        {"id":2, "area":2, "val":.5, "color":"blue"},
   	        {"id":0, "area":0, "val":.3, "color":"red"},
	        {"id":0, "area":2, "val":.7, "color":"red"},
	        {"id":1, "area":0, "val":.4, "color":"yellow"},
	        {"id":1, "area":1, "val":.2, "color":"yellow"},
	        {"id":1, "area":2, "val":.4, "color":"yellow"},
	        {"id":2, "area":1, "val":.5, "color":"blue"},
	        {"id":2, "area":2, "val":.5, "color":"blue"}
	];
*/

};


Phylowood.initMap = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;

	// toy data
	var states = this.markers; //this.initMarkers();
	var coords = this.geoCoords;
	var foci = [coords.length]; // cluster foci, i.e. areas lat,lons

	// find center and extent of coords
	var meanLat = 0,
		meanLon = 0,
		minLat = 90,
		maxLat = -90,
		minLon = 180,
		maxLon = -180;
	for (var i = 0; i < coords.length; i++) {
	
		// latitude
		var lat = parseFloat(coords[i].lat);
		meanLat += lat;
		if (lat < minLat) { minLat = lat; }
		if (lat > maxLat) { maxLat = lat; }
	
		// longitude
		var lon = parseFloat(coords[i].lon);	
		if (lon < minLon) { minLon = lon; }
		if (lon > maxLon) { maxLon = lon; }		
		// convert to 0 to 360
		if (lon < 0) { lon = 360 + lon; }
		meanLon += lon;	
		
	}
	meanLat /= coords.length;
	meanLon /= coords.length;
	// convert back to -180 to 180
	if (meanLon > 180) {
		meanLon = meanLon - 360
	}
		
	// create polymaps object
	var po = org.polymaps;
	
	// create the map object, add it to #divGeo
	var map = po.map()
		.container(d3.select("#divGeo").append("svg:svg").node())
		.center({lat:meanLat,lon:meanLon})
		.zoom(12)
		.add(po.interact())
		.add(po.image()
		  .url(po.url("http://{S}tile.cloudmade.com"
		  + "/87d72d27ad3a48939015cdbd06980326" // http://cloudmade.com/register
		  + "/998/256/{Z}/{X}/{Y}.png")
		  .hosts(["a.", "b.", "c.", ""])))
		.add(po.compass().pan("none"));
	this.map = map;	
	
	// zoom out to fit all the foci	
	// need to center map at {0,0} when zoom is 1 to put entire globe in view
	while (minLat < map.extent()[0].lat) { 
		map.zoomBy(-1); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20}) }
	}
	while (minLon < map.extent()[0].lon) { 
		map.zoomBy(-1); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20}) }		
	}	
	while (maxLat > map.extent()[1].lat) { 
		map.zoomBy(-1); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20}) }		
	}	
	while (maxLon > map.extent()[1].lon) { 
		map.zoomBy(-1); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20}) }		
	}		
		
	var layer = d3.select("#divGeo svg").insert("svg:g", ".compass");
	
	// assign foci xy coordinates from geographical coordinates
	for (var i = 0; i < coords.length; i++)
		foci[i] = map.locationPoint(coords[i]);	

	// create force layout
	var force = d3.layout.force()
		.nodes(states)
		.links([])
		.charge( -1.5 * map.zoom())
		//.charge(-Math.pow(1.5, map.zoom()) + 8*map.zoom())
		.gravity(0.0)
		.theta(1.5)
		.friction(0.5)
		//.alpha(100000)
		.size([w, h])
		;
		
	states.forEach(function(d, i) {
		d.x = foci[d.area].x;
		d.y = foci[d.area].y;
	});

	force.start();
	
	// create svg markers
	var node = layer.selectAll("circle.node")
			.data(states)
		.enter().append("svg:circle")
			.attr("class","node")
			.attr("cx", function(d) { return foci[d.area].x; })
			.attr("cy", function(d) { return foci[d.area].y; })
			.attr("r",  function(d) { return 2 * Math.sqrt(d.val); })
			.attr("fill", function(d) { return d.color; })
			.attr("stroke", "gray")
			.attr("stroke-width", 1)
			.attr("fill-opacity", 1)
			;

	// freeze markers during pan & zoom
	d3.select("#divGeo")
		.on("mousedown", mousedown)
		.on("mouseup", mouseup);
		
	function mousedown() {
		force.stop();
	}
	
	function mouseup() {
		// disabled to suppress d3.layout.pack "boioioing"-iness
		//force.resume();
	}

	// update coordinates when map pans and zooms
	map.on("move", function() {

		// update force foci positions
		for (var i = 0; i < coords.length; i++)
			foci[i] = map.locationPoint(coords[i]);
		
		// update force properties with each move
		force.charge( -1.5 * map.zoom());
		force.gravity(0.0);
		
		// better visualization: have all nodes retain actual positions, instead of refocusing
		// it seems like areas contract at different zoom levels... weird
		// update positions of js states[] objects
		
		states.forEach(function(o,i) {
			xy = map.locationPoint({"lon": o.lon, "lat":o.lat});
			o.x = xy.x;
			o.y = xy.y; 
		});
		
		// update positions and radii for nodes
		node.attr("cx", function(d) { return d.x; })
		    .attr("cy", function(d) { return d.y; })
		    .attr("r", function(d) { return 2 * Math.sqrt(d.val); }) // change vs. zoom??

	//	force.resume();

	});	


	// update node[] each tick
	force.on("tick", function(e) {

		// set stepsize per tick
		var k = e.alpha * 3;

		// update object values per tick
		states.forEach(function(o,i) {
			o.x += (foci[o.area].x - o.x) * k
			o.y += (foci[o.area].y - o.y) * k
			var latlon = map.pointLocation({"x": o.x, "y": o.y});
			o.lon = latlon.lon;
			o.lat = latlon.lat;
		});

		// update object attributes per tick
		layer.selectAll("circle.node")
		     .attr("cx", function(d) { return d.x; })
		     .attr("cy", function(d) { return d.y; });
		
	});
};



Phylowood.initPlayer = function() {

	this.ticker = ""; // setInterval() object

	this.curPhyloTime = this.startPhyloTime;

	this.startClockTime = 0.0;
	this.endClockTime = 30000.0; // play for 30 seconds, by default
	this.curClockTime = 0.0;
	this.clockTick = 100.0;
	this.phyloTick = 0.0;
	this.phyloTick = (this.endPhyloTime - this.curPhyloTime) / this.clockTick;

	this.playSpeed = 1.0;
	
	$( "#divSlider" ).slider("option","max",this.endPhyloTime);
	$( "#divSlider" ).slider("option","min",this.startPhyloTime);
	$( "#divSlider" ).slider("option","value",this.curPhyloTime);

	// show current year
	// add tick marks for divergence events	
	// if time allows
	// function maximizeDisplay() {};
	// function minimizeDisplay() {};

};


Phylowood.animStart = function() {
	$( "#divSlider" ).slider("option","value",this.startPhyloTime);
	this.curPhyloTime = this.startPhyloTime;
	this.curClockTime = this.startClockTime;

	//d3.select("#divGeo").selectAll("circle.node").remove();
}

Phylowood.animEnd = function() {
	$( "#divSlider" ).slider("option","value",this.endPhyloTime);
	this.curPhyloTime = this.endPhyloTime;
	this.curClockTime = this.endClockTime;
	clearInterval(this.ticker);
}

Phylowood.animRewind = function() {

	if (this.playSpeed === 1.0)
		this.playSpeed = -1.0;

	else if (this.playSpeed < 0.0 && this.playSpeed >= -8.0)
		this.playSpeed *= 2.0;

	else if (this.playSpeed > 1.0)
		this.playSpeed /= 2.0;
}

Phylowood.animFfwd = function() {

	if (this.playSpeed === -1.0)
		this.playSpeed = 1.0;

	else if (this.playSpeed > 0.0 && this.playSpeed <= 8.0)
		this.playSpeed *= 2.0;

	else if (this.playSpeed < -1.0)
		this.playSpeed /= 2.0;
}

Phylowood.animPause = function() {
	clearInterval(this.ticker);
}

Phylowood.animPlay = function() {

	// update display each clockTick
	this.ticker = setInterval(this.updateDisplay, this.clockTick * this.playSpeed); 
}

Phylowood.animStop = function() {
	clearInterval(Phylowood.ticker);
	this.playSpeed = 1.0;
	this.animStart();
}

Phylowood.updateDisplay = function() {

	//console.log("t_c=" + Phylowood.curClockTime + ", t_p=" + Phylowood.curPhyloTime);

	// update current times
	Phylowood.curPhyloTime = Phylowood.curPhyloTime + Phylowood.phyloTick * Phylowood.playSpeed;
	Phylowood.curClockTime = Phylowood.curClockTime + Phylowood.clockTick * Phylowood.playSpeed;

	// stop if animation duration met
	if (Phylowood.curPhyloTime >= Phylowood.endPhyloTime
	|| Phylowood.curPhyloTime <= Phylowood.startPhyloTime)
		Phylowood.animEnd();

	// update slider position
	$( "#divSlider" ).slider("option","value", Phylowood.curPhyloTime);
	
	// get animation state for all lineages
	for (var i = 0; i < Phylowood.markers.length; i++) {
		var m = Phylowood.markers[i];
		if (m.timeStart <= Phylowood.curPhyloTime && m.timeEnd >= Phylowood.curPhyloTime) {
			if (m.scheduleDraw === false)
				m.scheduleDraw = true;
		}
		// can probably just use an "else"
		else if (m.timeStart > Phylowood.curPhyloTime || m.timeEnd < Phylowood.curPhyloTime) {
			if (m.scheduleErase === false)
				m.scheduleErase = true;
		}
	}
	
	// enter() and remove() events according to .curPhyloTime and nodes[].animateOn values


	// remove()
	d3.selectAll("#divGeo circle.node").select(
		function(d) {
			if (d.scheduleErase === true) {
				d.scheduleErase = false;
				return this;
			}
			else {
				return null;
			}
		}).attr("visibility","hidden");

	d3.select("#divGeo svg").selectAll("circle.node")
		.data(Phylowood.markers).select(
		function(d) {
			if (d.scheduleDraw === true) {
				d.scheduleDraw = false;
				return this;
			}
			else {
				return null;
			}
		}).attr("visibility","visible");

	// enter()
	// ...
	// something like ...
	/*
	d3.select("#divGeo svg").selectAll("circle.node")
			.data(Phylowood.markers).select(
				function(d) {
					if (d.tStart >= Phylowood.curPhyloTime && d.tEnd <= Phylowood.curPhyloTime)
						return this;
					else
						return null;
				}).enter().append("svg:circle")
			.attr("class","node")
			.attr("cx", function(d) { return foci[d.area].x; })
			.attr("cy", function(d) { return foci[d.area].y; })
			.attr("r",  function(d) { return Math.pow(2, map.zoom() - 12) * Math.sqrt(d.val); })
			.attr("fill", function(d) { return d.color; })
			.attr("stroke", "gray")
			.attr("stroke-width", 1)
			.attr("fill-opacity", 1)
			;
	*/

	// update phylo widget cursor position
	// will need to draw the slider as long as tree width from jsPhyloSvg	
	// ...
	
}

/***
DEFUNCT
***/
/*
// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
  ; // All the File APIs are supported.
} else {
  alert('The File APIs are not fully supported in this browser.');
}

// Store file contents to Phylowood.infile
function handleFileSelect(evt) {
//	Phylowood.infile = "";
	var f;
	f = evt.target.files[0];
	var fr = new FileReader();

	fr.onload = function(e) {
		
		//var txtArea = document.createElement('textarea');
		//txtArea.value = this.result;
		//document.getElementById('divGeo').appendChild(txtArea);
		
		Phylowood.inputStr = this.result;
		// console.log("inputFile.result = " + this.result);
	};
	fr.onerror = function(e) {
		//alert("error");
	};
	fr.readAsText(f);
}
document.getElementById('files').addEventListener('change', handleFileSelect, false);
*/

/***
TESTING
***/

Phylowood.testOpenLayers = function() {
	this.olmap = new OpenLayers.Map("divGeo", {
		size: new OpenLayers.Size( { w:200, h:200 } ),
		controls: [
			new OpenLayers.Control.Navigation(),
			new OpenLayers.Control.ArgParser(),
			new OpenLayers.Control.Attribution()
		]
	});
	
	var numControl = this.olmap.controls.length;
	for (var i = 0; i < numControl; i++) {
		this.olmap.controls[0].deactivate();
		this.olmap.removeControl(this.olmap.controls[0]);
	}
	
	this.olwms = new OpenLayers.Layer.WMS( "OpenLayers WMS", 
                                            "http://labs.metacarta.com/wms/vmap0?", 
                                            {'layers': 'basic'},
                                            {'minExtent': new OpenLayers.Bounds(-1,-1,1,1),
                                             'maxExtent': new OpenLayers.Bounds(-122.2,38.0,-122.1,38.2),
                                             //'maxExtent': new OpenLayers.Bounds(-100,-100,100,100),
                                             'minResolution': "auto",
                                             'maxResolution': "auto"});

    this.olmap.addLayer(this.olwms);
    var div = OpenLayers.Util.getElement("divGeo");
    div.style.width = 600 + "px";
    div.style.height = 600 + "px";
    /*
	var exportMapControl = new OpenLayers.Control.ExportMap();
	this.olmap.addControl(exportMapControl);
	this.olmap.addControl(new OpenLayers.Control.LayerSwitcher());
	this.olmap.zoomToExtent(new OpenLayers.Bounds(-11.8296875, 39.54021484375, 10.6703125, 50.79021484375));
	var olmapCanvas = OpenLayers.Util.getElement("exportedImage");
	exportMapControl.trigger(olmapCanvas);
	OpenLayers.Util.getElement("downloadLink").href = canvas.toDataURL();
	*/

	// render the map at defined zoom
	this.olmap.zoomToMaxExtent();
};

Phylowood.testPolyMaps = function() {

	// reformat Phylowood data into this JSON-like format
	// expects input as ...
	var d1 = 
		[
			{"id": "A", "val": 1.0, "coords": [-121.08, 38.17], "color": "red"},
			{"id": "A", "val": 1.0, "coords": [-121.18, 38.05], "color": "red"},
			{"id": "A", "val": 1.0, "coords": [-121.13, 38.11], "color": "red"},
			{"id": "B", "val": 1.0, "coords": [-122.08, 38.17], "color": "yellow"},
			{"id": "B", "val": 1.0, "coords": [-122.18, 38.05], "color": "yellow"},
			{"id": "B", "val": 1.0, "coords": [-122.13, 38.11], "color": "yellow"},
			{"id": "C", "val": 1.0, "coords": [-123.08, 38.17], "color": "blue"},
			{"id": "C", "val": 1.0, "coords": [-123.18, 38.05], "color": "blue"},
			{"id": "C", "val": 1.0, "coords": [-123.13, 38.11], "color": "blue"}
		];

	// create polymaps object
	var po = org.polymaps;
	
	// Create the map object, add it to #map…
	var map = po.map()
		.container(d3.select("#divGeo").append("svg:svg").node())
		.center({lat: 38.1, lon: -122.15})
		.zoom(8)
		//.centerRange([{lat: 38.2, lon: -122.1}, {lat: 38.0, lon: -122.2}])
		.add(po.interact());
		
	map.add(po.image()
		.url(po.url("http://{S}tile.cloudmade.com"
		+ "/87d72d27ad3a48939015cdbd06980326" // http://cloudmade.com/register
		+ "/2/256/{Z}/{X}/{Y}.png")
		.hosts(["a.", "b.", "c.", ""])));
		
	map.add(po.compass()
		.pan("none"));
    
	var layer = d3.select("#divGeo svg").insert("svg:g", ".compass");
	
	function transform(d) {
    	d = map.locationPoint({lon: d.coords[0], lat: d.coords[1]});
		return "translate(" + d.x + "," + d.y + ")";
	}
	
	// update marker positions when map moves
	map.on("move", function() {
		layer.selectAll("g").attr("transform", transform);
    });
    
	var marker = layer.selectAll("g")
		.data(d1)
		.enter()
		.append("svg:g")
		.attr("transform", transform);
	
	// add a circle
	marker.append("svg:circle")
		.attr("r", function(d) { return d.val * 5.0; })
		.style("fill", function(d){ return d.color; });
	
};

Phylowood.testMultiFocus = function () {
	this.initMap();
};

Phylowood.testSelect = function() {
	var layer = d3.select("#divGeo svg").insert("svg:g", ".compass");
	layer.selectAll("circle.node")
		.select(function(d,i) { return i > 3 ? d : null; });// { return d.id > 3 ? this : null; })
		//.remove();
};

