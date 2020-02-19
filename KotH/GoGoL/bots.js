"use strict";

function randomMovesBot(grid, botId, lastMoves){
	return [Math.floor(Math.random() * grid.length), Math.floor(Math.random() * grid.length)];
}

// By RGS, https://codegolf.stackexchange.com/questions/199658/game-of-game-of-life/199739#199739
function rgs_do_nothing(some_really_important_argument, my_moniker, wtv) {
	return [-1, -1];
}

let bots = [randomMovesBot, rgs_do_nothing];