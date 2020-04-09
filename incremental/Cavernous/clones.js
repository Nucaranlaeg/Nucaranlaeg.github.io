class Clone {
	constructor(id){
		this.id = id;
		this.reset();
		this.createQueue();
	}

	reset() {
		this.x = 0;
		this.y = 0;
		this.currentProgress = 0;
		this.damage = 0;
		this.styleDamage();
		this.syncs = 0;
		this
	}

	takeDamage(amount) {
		this.damage += amount;
		if (this.damage < 0) this.damage = 0;
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

	select(allowMultiple = false) {
		if (!allowMultiple) {

			for (let index of selectedQueue) {
				if (index != this.id) clones[index].deselect();
			}
			if (cursor[0] != this.id){
				cursor = [this.id, null];
			}
			selectedQueue = [this.id];

		} else {

			cursor = [0, null];

		}

		document.querySelector(`#queue${this.id}`).classList.add("selected-clone");
		if (!selectedQueue.includes(this.id)) {
			selectedQueue.push(this.id)
		}

	}

	deselect() {
		document.querySelector(`#queue${this.id}`).classList.remove("selected-clone");
		if (cursor[0] == this.id)
			cursor[1] = null;
		selectedQueue = selectedQueue.filter(e => e != this.id);
	}
}

function selectClone(target, event){
	if (target.id) {
		let index = +target.id.replace("queue", "");
		if (event && event.ctrlKey) {
			if (selectedQueue.includes(index)) {
				clones[index].deselect();
			} else {
				clones[index].select(true);
			}
		} else {
			clones[index].select();
		}
	} else {
		clones[target].select();
	}
	
	showCursor();
	showFinalLocation();
}

let clones = [];
