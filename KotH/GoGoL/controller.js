"use strict";

async function runGame(setup = false){
	loadBots();
	let botcount = bots.length;

	let gridSize = Math.ceil(Math.sqrt(botcount));
	if (gridSize < 2) gridSize = 2;

	// Determine the numbers we need to use on the grid.
	let botlist = [];
	while (botlist.length < botcount){
		botlist.push(botlist.length + 1);
	}
	while (botlist.length < Math.pow(gridSize, 2)){
		botlist.push(-1);
	}
	// Put the bots in a random order.
	shuffle(bots);
	colourBots();
	// Place them in random places on the grid.
	shuffle(botlist);

	gridSize *= 6;
	let grid = Array(gridSize).fill(0).map(() => new Array(gridSize).fill(0));

	grid = buildGrid(grid, botlist);

	drawGrid(grid);

	// Draw the grid on loading the page, but don't run immediately.
	if (setup) return;

	resetBots();

	let lastMoves = [], thisMoves = [], bottime = Array(bots.length).fill(0);
	let turnCounter = document.querySelector("#turn-counter");
	for (let turn = 0; turn < 1000; turn++){
		turnCounter.innerHTML = turn + 1;
		lastMoves = thisMoves;
		thisMoves = [];
		for (let i = 0; i < bots.length; i++){
			let start = performance.now();
			thisMoves[i] = bots[i](grid, i+1, lastMoves);
			let time = performance.now() - start;
			if (!thisMoves[i] || thisMoves[i].length != 2 || !Number.isInteger(+thisMoves[i][0]) || !Number.isInteger(+thisMoves[i][1])){
				alert(`${bots[i].name} failed to give a legal response: ${thisMoves[i]}`);
				throw(`${bots[i].name} failed to give a legal response: ${thisMoves[i]}`);
			}
			bottime[i] += time;
			if (turn % 50 == 49) {
				document.querySelector(`#${bots[i].name} .bot-time`).innerHTML = Math.floor(bottime[i] / (turn + 1));
			}
		}
		for (let i = 0; i < thisMoves.length; i++){
			if (!isLegalMove(i+1, thisMoves[i], grid)){
				thisMoves[i] = [-1, -1];
				continue;
			}
			// Perform removals - they have to happen first.
			if (grid[thisMoves[i][0]][thisMoves[i][1]] == i + 1){
				grid[thisMoves[i][0]][thisMoves[i][1]] = 0;
			}
		}
		// Remove moves where there are already living cells.
		for (let i = 0; i < thisMoves.length; i++){
			if (thisMoves[i][0] == -1 && thisMoves[i][1] == -1) continue;
			if (grid[thisMoves[i][0]][thisMoves[i][1]] != 0){
				thisMoves[i] = [-1, -1];
			}
		}
		// Make all other moves.
		for (let i = 0; i < thisMoves.length; i++){
			if (thisMoves[i][0] == -1 && thisMoves[i][1] == -1) continue;
			if (grid[thisMoves[i][0]][thisMoves[i][1]] == 0){
				grid[thisMoves[i][0]][thisMoves[i][1]] = i + 1;
			} else {
				// If it's non-zero, someone else tried to move there.
				grid[thisMoves[i][0]][thisMoves[i][1]] = -1;
			}
		}

		grid = nextGeneration(grid);

		drawGrid(grid);

		if (!writeCellCounts(grid)){
			break;
		}

		// Sleep for 1 ms to guarantee drawing is possible.
		await new Promise(r => setTimeout(r, 1));
	}
}

function writeCellCounts(grid){
	let cellCount = grid.reduce((c, row) => row.reduce((c2, cell) => {
		if (!c2[cell]) c2[cell] = 0;
		c2[cell]++;
		return c2;
	}, c), []);
	let livingPlayers = 0;
	for (let i = 0; i < bots.length; i++){
		document.querySelector(`#${bots[i].name} .bot-cells`).innerHTML = cellCount[i+1] || 0;
		if (cellCount[i+1] > 0) livingPlayers++;
	}
	if (livingPlayers <= 1) return false;
	return true;
}

function nextGeneration(grid){
	let nextGrid = JSON.parse(JSON.stringify(grid));
	let size = grid.length;
	for (let i = 0; i < size; i++){
		for (let j = 0; j < size; j++){
			let neighbours = [];
			for (let k = -1; k < 2; k++){
				for (let l = -1; l < 2; l++){
					if (k == l) continue;
					let cell = grid[(size + i + k) % size][(size + j + l) % size];
					if (cell != 0){
						neighbours.push(cell);
					}
				}
			}
			if (neighbours.length < 2 || neighbours.length > 3){
				nextGrid[i][j] = 0;
			} else if (neighbours.length == 3 && grid[i][j] == 0){
				if (neighbours[0] == neighbours[1] || neighbours[0] == neighbours[2]){
					nextGrid[i][j] = neighbours[0];
				} else if (neighbours[1] == neighbours[2]){
					nextGrid[i][j] = neighbours[1];
				} else{
					nextGrid[i][j] = -1;
				}
			}
		}
	}
	return nextGrid;
}

function isLegalMove(bot, move, grid){
	for (let i = Math.max(0, move[0] - 2); i < Math.min(move[0] + 2, grid.length - 1); i++){
		for (let j = Math.max(0, move[1] - 2); j < Math.min(move[1] + 2, grid.length - 1); j++){
			if (grid[i][j] == bot) return true;
		}
	}
	return false;
}

function resetBots(){
	// Remove any data that might be stored on the this of the bot.
	for (let i = 0; i < bots.length; i++){
		bots[i] = new Function("return " + bots[i].toString())();
	}
}

function drawGrid(grid){
	if (!document.querySelector("#grid .cell")){
		// The grid hasn't been built yet.
		let gridNode = document.querySelector("#grid");
		for (let i = 0; i < grid.length; i++){
			for (let j = 0; j < grid.length; j++){
				let element = document.createElement("div");
				element.classList.add("cell");
				element.id = `c${j}-${i}`;
				gridNode.append(element);
			}
		}
		gridNode.style.width = 22 * grid.length + "px";
		gridNode.style.height = 22 * grid.length + "px";
	}
	// Colour the cells appropriately.
	for (let i = 0; i < grid.length; i++){
		for (let j = 0; j < grid.length; j++){
			document.querySelector(`#c${j}-${i}`).classList = `cell colour-${grid[i][j]}`;
		}
	}
}

function buildGrid(grid, botlist){
	// Place the cells on the grid.
	for (let i = 0; i < botlist.length; i++){
		let x = Math.floor((i * 6) % grid.length);
		let y = Math.floor((i * 6) / grid.length) * 6;
		grid[x + 2][y + 2] = botlist[i];
		grid[x + 2][y + 3] = botlist[i];
		grid[x + 3][y + 2] = botlist[i];
		grid[x + 3][y + 3] = botlist[i];
	}
	return grid;
}

function colourBots(){
	for (let i = 0; i < bots.length; i++){
		let botrow = document.querySelector(`#${bots[i].name} .bot-colour`);
		botrow.classList = ["bot-colour colour-" + (i + 1)];
	}
}

function shuffle(a){
	for (let i = a.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
}

function loadBots(){
	let botlistnode = document.querySelector("#bot-list");
	let bottemplate = document.querySelector("#template-bot");
	while (botlistnode.childNodes.length > 2){
		botlistnode.removeChild(botlistnode.childNodes[2]);
	}
	for (let i = 0; i < bots.length; i++){
		let newbotnode = bottemplate.cloneNode(true);
		newbotnode.id = bots[i].name;
		newbotnode.querySelector(".bot-name").innerHTML = bots[i].name;
		newbotnode.querySelector(".bot-score").innerHTML = 0;
		botlistnode.append(newbotnode);
	}
}

setTimeout(() => {
	runGame(true);
}, 0);