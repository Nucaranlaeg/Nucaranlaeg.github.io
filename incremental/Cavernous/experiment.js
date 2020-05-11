var runExperiment = function (positions) {
	var mapWidth = 45;
	var mapHeight = 29;
	resetMap();
	for (var i = 0; i < mapWidth; ++i)
		for (var j = 0; j < mapHeight; ++j) {
			getMapLocation(i - xOffset, j - yOffset, true);
		}

	drawMap();
	var square = document.querySelector('#map-inner tr td');
	var map = document.querySelector('#map-inner');
	if (mapWidth != map.offsetWidth / square.offsetWidth) {
		console.log('Something went wrong.  Maybe not all squares are the same size.');
	}
	if (mapHeight != map.offsetHeight / square.offsetHeight) {
		console.log('Something went wrong.  Maybe not all squares are the same size.');
	}

	var canvas = document.querySelector('#mapCanvas');
	canvas.style.left = map.offsetLeft + 'px';
	canvas.style.top = map.offsetTop + 'px';
	canvas.style.width = map.offsetWidth + 'px';
	canvas.style.height = map.offsetHeight + 'px';
	
	canvas.width = map.offsetWidth;
	canvas.height = map.offsetHeight;
	
	var ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	var hs = function (x, y, t) {

		ctx.fillStyle = 'hsl(' + (t % 360) + ',100%,' + (30 + (t / 5) % 40) + '%)';
		ctx.fillRect(x, y, 1, 1);
	}
	var drawLine = function (x1, y1, x2, y2, time) {
		var huespeed = 4;
		var huelength = 35;
		var direction = -1;
		if (x1 > x2) {
			direction *= -1;
			var tmp = x1;
			x1 = x2;
			x2 = tmp;
		}
		if (y1 > y2) {
			direction *= -1;
			var tmp = y1;
			y1 = y2;
			y2 = tmp;
		}
		var adjtime;
		for (var xa = x1; xa <= x2; xa++) {
			for (var ya = y1; ya <= y2; ya++) {
				//col(xa, ya, R(xa,ya,time), G(xa,ya,time), B(xa,ya,time));
				var adjtime = time * huespeed + (xa - x1) * direction + (ya - y1) * direction;
				if (adjtime % 10 < 1) {
					hs(xa, ya, adjtime * huelength);
				}
			}
		}
		return adjtime / huespeed;


	}

	var t = 0;
	var run = function () {
		var curt = t;
		var makeX = function (x) { return (x + 0.5) * square.offsetWidth; }
		var makeY = function (y) { return (y + 0.5) * square.offsetHeight; }

		for (var i = 0; i < positions.length - 1; ++i) {
			var p1 = positions[i];
			var p2 = positions[i + 1];
			curt = drawLine(makeX(p1[0]), makeY(p1[1]), makeX(p2[0]), makeY(p2[1]), curt);
		}

		//var t2 = drawLine(7,7,8,40,t);
		//drawLine(7,40,8,100,t2);
		t = t + 0.120;
		window.requestAnimationFrame(run);
	}

	run();
};
