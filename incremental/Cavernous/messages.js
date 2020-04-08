class Message {
	constructor(name, message){
		this.name = name;
		this.message = message.replace(/\n/g, "<br>");
		this.displayed = false;
	}

	display(show_again){
		if (this.displayed && !show_again) return;
		let box = document.querySelector("#message-box");
		document.querySelector("#message-title").innerHTML = this.name;
		document.querySelector("#message-text").innerHTML = this.message;
		box.style.display = "block";
		this.displayed = true;
	}
}

function hideMessages(){
	document.querySelector("#message-box").style.display = "none";
}

function viewMessages(){
	document.querySelector("#message-title").innerHTML = "Messages";
	let box = document.querySelector("#message-box");
	box.style.display = "block";
	let text = box.querySelector("#message-text");
	while (text.firstChild){
		text.removeChild(text.lastChild);
	}
	let template = document.querySelector("#message-link-template");
	for (let i = 0; i < messages.length; i++){
		if (!messages[i].displayed) continue;
		let el = template.cloneNode(true);
		el.innerHTML = messages[i].name;
		el.id = `message${i}`;
		text.append(el);
	}
}

function viewMessage(event, el){
	messages[el.id.replace("message", "")].display(true);
	event.stopPropagation();
}

let messages = [
	new Message("Welcome to Cavernous!", "You wake up in a bare room.  One of the walls looks soft enough for you to dig through, but you have a feeling you'll be back here again.\n" +
	            "Move around using the arrow keys to move and the spacebar to interact.\n" +
	            "Click anywhere to continue."),
	new Message("Out of Mana", "You've run out of mana.  You feel drawn back to the room where you started.\n(Click \"Travel back in time\" or press the R key)"),
	new Message("Time Travel", "You're back in the room you first found yourself in.\n" +
	            "This time, you feel slightly more competent than last time, and you know a little of the cave you're in.  Given time, you're sure you can find a way out.\n" +
	            "If you haven't, it would be good to use the spacebar to extract mana from those rocks."),
	new Message("Strip Mining", "It's getting harder to extract mana from that rock.  You'll have to go out and find another rock to extract mana from."),
	new Message("First Clone", "You've created your first clone!  It can carry out actions in exactly the same way you can.\n" +
	            "You can create more clones by bringing more gold to the Clone Machine.  Click on the Clone Machine to find out how much the next clone costs." +
	            "Multiple clones use up the same amount of mana as a single clone, and they can act independently or help each other out."),
	new Message("Goblin", "A strange statue in the passage suddenly moves to attack you as you approach!  This place is stranger than you'd thought."),
	new Message("Runic Lore", "You've mastered the basics of runic lore!  A new action is available to you: Inscribe Rune.\n" +
	            "To use it, press the number corresponding to the desired rune in the runes section of the Stuff panel."),
	new Message("Lava Can't Melt Steel Bridges", "You worked so hard on that bridge, and to see it quickly turn to slag after crossing that lava is sad.\n" +
	            "At least one of your clones made it across."),
];
