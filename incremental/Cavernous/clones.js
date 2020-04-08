class Clone {
	constructor(){
		this.reset();
		this.createQueue();
	}

	reset() {
		this.x = 0;
		this.y = 0;
		this.currentProgress = 0;
		this.damage = 0;
		this.styleDamage();
	}

	takeDamage(amount) {
		this.damage += amount;
		if (this.damage >= getStat("Health").current) this.damage = Infinity;
		this.styleDamage();
	}

	styleDamage() {
		if (!this.el) return;
		let hp = 1 - Math.min((this.damage / getStat("Health").current));
		this.el.querySelector(".damage").style.width = hp == 1 || !Number.isFinite(hp) ? "0" : (hp * 100) + "%";
		if (hp < 0) this.el.classList.add('dead-clone');
		else this.el.classList.remove('dead-clone');
	}

	createQueue() {
		let queueTemplate = document.querySelector("#queue-template");
		this.el = queueTemplate.cloneNode(true);
		this.el.id = `queue${clones.length}`;
		document.querySelector("#queues").append(this.el);
		queues.push([]);
	}
}

function selectClone(target, event){
	if (target.id) {
		let selection = target.id.replace("queue", "");
		if (cursor[0] != selection){
			cursor = [selection, null];
		}
		if (event && event.ctrlKey) {
			cursor = [0, null];
			if (selectedQueue.includes(selection)){
				selectedQueue = selectedQueue.filter(q => q != selection) || [selection];
				target.classList.remove("selected-clone");
			} else {
				selectedQueue.push(selection);
				target.classList.add("selected-clone");
			}
		} else {
			document.querySelectorAll(".selected-clone").forEach(el => el.classList.remove("selected-clone"));
			selectedQueue = [target.id.replace("queue", "")];
			target.classList.add("selected-clone");
		}
	} else {
		if (cursor[0] != target){
			cursor = [target, null];
		}
		document.querySelectorAll(".selected-clone").forEach(el => el.classList.remove("selected-clone"));
		selectedQueue = [target];
		document.querySelector(`#queue${target}`).classList.add("selected-clone");
	}
	showCursor();
	showFinalLocation();
}

let clones = [];
