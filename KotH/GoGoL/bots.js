"use strict";

function randomMovesBot(grid, botId, lastMoves){
	return [Math.floor(Math.random() * grid.length), Math.floor(Math.random() * grid.length)];
}

let bots = [randomMovesBot];