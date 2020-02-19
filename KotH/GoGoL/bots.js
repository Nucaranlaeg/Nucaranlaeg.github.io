"use strict";

function randomMovesBot(grid, botId, lastMoves){
	return [Math.floor(Math.random() * grid.length), Math.floor(Math.random() * grid.length)];
}

// By RGS, https://codegolf.stackexchange.com/questions/199658/game-of-game-of-life/199739#199739
function rgs_do_nothing(some_really_important_argument, my_moniker, wtv) {
	return [-1, -1];
}

// By Nucaranlaeg, https://codegolf.stackexchange.com/questions/199658/game-of-game-of-life/199772#199772
function BestNowBot(grid, botId, lastMoves){
	let wrap = coord => coord < 0 ? coord + grid.length : coord >= grid.length ? coord - grid.length : coord;
	let adj_life = (x, y) => {
		let sum = 0, sum_mine = 0;
		for (let i = -1; i <= 1; i++){
			for (let j = -1; j <= 1; j++){
				if (!i && !j) continue;
				if (grid[wrap(x+i)][wrap(y+j)]) sum++;
				if (grid[wrap(x+i)][wrap(y+j)] == botId) sum_mine++;
			}
		}
		return [sum, sum_mine];
	}
	let my_cells = [];
	for (let i = 0; i < grid.length; i++){
		for (let j = 0; j < grid.length; j++){
			if (grid[i][j] == botId){
				my_cells.push([i, j]);
			}
		}
	}
	let legal_moves = my_cells.slice();
	my_cells.forEach(cell => {
		for (let i = -2; i <= 2; i++){
			for (let j = -2; j <= 2; j++){
				let x = wrap(cell[0] + i),
					y = wrap(cell[1] + j);
				if (grid[x][y] == 0 && !legal_moves.some(m => m[0] == x && m[1] == y)){
					legal_moves.push([x, y]);
				}
			}
		}
	});
	// Calculate results of each move.
	legal_moves.forEach(move => {
		let move_score = 0;
		if (grid[move[0]][move[1]] == botId) move_score--;
		for (let i = -1; i <= 1; i++){
			for (let j = -1; j <= 1; j++){
				let x = wrap(move[0] + i),
					y = wrap(move[1] + j);
				let [adj, adj_mine] = adj_life(x, y);
				if (grid[x][y] == botId && adj == 3){
					move_score--;
				} else if (grid[x][y] == 0 && adj == 2 && adj_mine > 0){
					move_score++;
				}
			}
		}
		move.push(move_score);
	});
	let best = Math.max(...legal_moves.map(m => m[2]));
	let good_moves = legal_moves.filter(m => m[2] == best);
	return good_moves[Math.floor(Math.random() * good_moves.length)].slice(0, 2);
}

let bots = [randomMovesBot, rgs_do_nothing, BestNowBot];