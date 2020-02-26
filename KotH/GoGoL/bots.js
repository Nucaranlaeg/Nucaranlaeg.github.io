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

// By user1502040, https://codegolf.stackexchange.com/questions/199658/game-of-game-of-life/199778#199778
// NOT A BOT
function advance(hash_grid, old_grid, new_grid){
    let hash = 0;
    let size = old_grid.length;
    let neighbours = [];
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            neighbours.length = 0;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if ((dx == 0) && (dy == 0)) {
                        continue;
                    }
                    let cell = old_grid[(size + x + dx) % size][(size + y + dy) % size];
                    if (cell != 0) {
                        neighbours.push(cell);
                    }
                }
            }
            if (neighbours.length < 2 || neighbours.length > 3) {
                new_grid[x][y] = 0;
            } else if (neighbours.length == 3 && old_grid[x][y] == 0) {
                if (neighbours[0] == neighbours[1] || neighbours[0] == neighbours[2]) {
                    new_grid[x][y] = neighbours[0];
                } else if (neighbours[1] == neighbours[2]) {
                    new_grid[x][y] = neighbours[1];
                } else {
                    new_grid[x][y] = -1;
                }
            } else {
                new_grid[x][y] = old_grid[x][y];
            }
            hash += hash_grid[x][y] * new_grid[x][y];
        }
    }
    return hash;
}

// By user1502040, https://codegolf.stackexchange.com/questions/199658/game-of-game-of-life/199778#199778
function planBot(grid, botId, lastMoves) {
    let size = grid.length;
    let possible_moves = new Set();
    let count = 0;
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (grid[x][y] == botId) {
                count++;
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        let x1 = (size + x + dx) % size;
                        let y1 = (size + y + dy) % size;
                        if ((grid[x1][y1] == 0) || (grid[x1][y1] == botId)) {
                            possible_moves.add([x1, y1]);
                        }
                    }
                }
            }
        }
    }
    let possible_move_array = Array.from(possible_moves);
    if (possible_move_array.length == 0) {
        return [0,0];
    }
    let neighbor_scores = function(n) {
        if ((n >= 2) && (n <= 3)) {
            return 0;
        }
        return -1;
    }
    let best_cell = [0, 0];
    let max_score = -10000;
    let memo = new Map();
    let hash_grid = Array(size).fill(0).map(() => new Array(size).fill(0).map(() => Math.random()));
    let new_grid = Array(size).fill(0).map(() => new Array(size).fill(0));
    let iters = 4;
    for (cell of possible_move_array) {
        let old_grid = grid.map(x => x.slice());
        old_grid[cell[0]][cell[1]] = botId - old_grid[cell[0]][cell[1]];
        let hashes = []
        let score = 0;
        let hit = false;
        for (let i = 0; i < iters; i++) {
            let hash = advance(hash_grid, old_grid, new_grid);
            hashes.push(hash);
            if (memo.has(hash)) {
                score = memo[hash];
                hit = true;
                break;
            }
            let tmp = new_grid;
            new_grid = old_grid;
            old_grid = tmp;
        }
        if (!hit) {
            for (let x = 0; x < size; x++) {
                for (let y = 0; y < size; y++) {
                    if (old_grid[x][y] == botId) {
                        score++;
                    } else if (old_grid[x][y] > 0) {
                        score -= 1e-7;
                    }
                }
            }
        }
        for (hash of hashes) {
            memo.set(hash, score);
        }
        score += 1e-9 * Math.random();
        if (score >= max_score) {
            max_score = score;
            best_cell = cell;
        }
    }
    return best_cell;
}

// By Bob Genom, https://codegolf.stackexchange.com/questions/199658/game-of-game-of-life/200112#200112
// version 1.0
function planBbot(grid, botId, lastMoves) {
    let t0=performance.now();
    let best_cell = [-1, -1];
    let max_score = -10000000;
    let size = grid.length;
    let possible_moves = new Set();
    let dist = 1
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (grid[x][y] == botId) {
                for (let dx = -dist; dx <= dist; dx++) {
                    for (let dy = -dist; dy <= dist; dy++) {
                        let x1 = (size + x + dx) % size;
                        let y1 = (size + y + dy) % size;
                        if ((grid[x1][y1] == 0) || (grid[x1][y1] == botId)) {
                            possible_moves.add([x1, y1]);
                        }
                    }
                }
            }
        }
    }
    let possible_move_array = Array.from(possible_moves);
    if (possible_move_array.length == 0) {
        return best_cell;
    }

    let new_grid = Array(size).fill(0).map(() => new Array(size).fill(0));
    if (typeof this.iters == "undefined") {
        this.iters=2;
        this.sum=0;
        this.count=1;
        this.lookahead=function(old_grid, new_grid){
            let iscore = 0;
            let oscore = 0;
            let size = old_grid.length;
            let neighbours = [];
            for (let x = 0; x < size; x++) {
                for (let y = 0; y < size; y++) {
                    neighbours.length = 0;
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            if ((dx == 0) && (dy == 0)) {
                                continue;
                            }
                            let cell = old_grid[(size + x + dx) % size][(size + y + dy) % size];
                            if (cell != 0) {
                                neighbours.push(cell);
                            }
                        }
                    }
                    let next=old_grid[x][y];
                    if (neighbours.length < 2 || neighbours.length > 3) {
                        next = 0;
                    } else if (neighbours.length == 3 && old_grid[x][y] == 0) {
                        if (neighbours[0] == neighbours[1] || neighbours[0] == neighbours[2]) {
                            next = neighbours[0];
                        } else if (neighbours[1] == neighbours[2]) {
                            next = neighbours[1];
                        } else {
                            next = -1;
                        }
                    }
                    new_grid[x][y] = next;
                    if (next == botId) {
                        iscore++;
                    } else if (next != 0) {
                        oscore++;
                    }
                }
            }
            return (iscore)-3*(oscore);
        }
    } else {
        let avg=this.sum/this.count;
        this.count++;
        if (avg>49 && this.iters>1) {
            this.iters--;
        } else if (avg<49) {
            this.iters++;
        }
    }
    if (this.count>990) {
        this.iters=1000-this.count;
    }
    if (this.count<200 && this.iters>6) {
        this.iters=6;
    }
    for (cell of possible_move_array) {
        let old_grid = grid.map(x => x.slice());
        old_grid[cell[0]][cell[1]] = botId - old_grid[cell[0]][cell[1]];
        let score = 0;
        for (let i = 0; i < this.iters; i++) {
            score += this.lookahead(old_grid, new_grid);
            let tmp = new_grid;
            new_grid = old_grid;
            old_grid = tmp;
        }

        if (score >= max_score) {
            max_score = score;
            best_cell = cell;
        }
    }
    let time=performance.now() - t0;
    if (this.sum==0) {
        this.sum=time;
    } else {
        this.sum+=time;
    }
    return best_cell;
}

let bots = [randomMovesBot, rgs_do_nothing, BestNowBot, planBot, planBbot];