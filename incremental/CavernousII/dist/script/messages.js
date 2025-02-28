"use strict";
let suppressMessages = (new URL(document.location.href).searchParams).get("messages") == "disabled";
const messageBox = document.querySelector("#message-box") ??
    (() => {
        throw new Error("No config box found");
    })();
class Message {
    constructor(name, message) {
        this.name = name;
        this.message = message.replace(/\t/g, "").trim().replace(/\n/g, "<br>\n");
        this.displayed = false;
    }
    display(show_again = false) {
        if ((this.displayed && !show_again) || suppressMessages)
            return false;
        document.querySelector("#message-title").innerHTML = this.name;
        document.querySelector("#message-text").innerHTML = this.message;
        messageBox.hidden = false;
        this.displayed = true;
        return true;
    }
}
function hideMessages() {
    messageBox.hidden = true;
}
function viewMessages() {
    document.querySelector("#message-title").innerHTML = "Messages";
    messageBox.hidden = false;
    const text = messageBox.querySelector("#message-text");
    while (text.firstChild !== null) {
        text.removeChild(text.lastChild);
    }
    const template = document.querySelector("#message-link-template");
    if (template === null) {
        throw new Error("No message template found");
    }
    for (let i = 0; i < messages.length; i++) {
        if (!messages[i].displayed)
            continue;
        const el = template.cloneNode(true);
        el.innerHTML = messages[i].name;
        el.id = `message${i}`;
        text.append(el);
    }
}
function viewMessage(event, el) {
    messages[parseInt(el.id.replace("message", ""))].display(true);
    event.stopPropagation();
}
function getMessage(name) {
    return messages.find(a => a.name === name);
}
const messages = [
    new Message("Welcome to Cavernous!", `
			You wake up in a bare room.
			One of the walls looks soft enough for you to dig through,
			but you have a feeling you'll be back here again.

			Move around with <u>arrow keys</u> - try going right!
			You can click on a tile to view its description.
			Click anywhere to continue.`),
    new Message("Digging", `
			That wall was surprisingly easy to dig through. It only took 1 second!
			It looks like 1 mana drained away while you did it, though.
			You wonder what will happen when you run out of mana.`),
    new Message("Out of Mana", `
			As your mana runs out you freeze in place, and feel a tugging on your spirit to draw you back to where you started.

			(Click "Travel back in time" or press the <u>R</u> key to reset)`),
    new Message("Time Travel", `
			You're back in the room you first found yourself in.
			This time, you feel slightly more competent than last time.
			Is that because you now know a little of the cave you're in?
			Given time, you're sure you can find a way out.
			And while you haven't, it would be good to use the <u>spacebar</u> to extract mana from those rocks.
			If you haven't found a mana rock, maybe keep looking!

			<b>Controls:</b>
			<u>Backspace</u> to remove last action
			<u>Ctrl+Backspace</u> to clear queue
			<u>Arrows</u> to move
			<u>Spacebar</u> to interact`),
    new Message("Persisted Programming", `
			The actions you input are remembered below the map and will repeat each loop.
			Use backspace to clear the actions before resetting if you want to try something different.`),
    new Message("The Looping of Looping Loops", `
			The time repeats itself over and over, the cave stays the same.

			Check the <u>Options</u> panel for the <u>Auto-Restart requirement (W)</u>
			Setting it to "Wait when any complete" will ignore clones that end with a Sync (=) action.`),
    new Message("Mana Extraction", `
			You found a mana spring!
			If you use space to interact, you can drain the mana from here to increase your starting mana, which will increase the time you can spend in a loop.
			When you reset the loop, the mana spring regenerates and you can drain it again, increasing your starting mana further.`),
    new Message("Strip Mining", `
			It's getting harder to extract mana from that rock.
			Soon, you'll have to go out and find another rock to extract mana from.
			Maybe you can come back to this one later when you have more mana to spend on it.

			Check the right panel to estimate how many more times you can refine this rock`),
    new Message("All the known ways", `
			There are many mana rocks, but the shortest path is always the best one.

			Check the <u>Options</u> panel for the <u>Auto-Grind</u>
			to automatically select the fastest path`),
    new Message("Buy More Time", `
			Have you found the Vaporizer yet?  Interacting with it will turn your gold into mana!
			You can probably mine those rocks a few additional times with that.`),
    new Message("Looper's Log: Supplemental", `
			There is a log of your actions this loop, which will help you plan out your routes better. ("Loop Log", on the left)
			Mousing over an action there will give you a breakdown of which stats affect that action.`),
    new Message("First Clone", `
			You've created your first clone!  It can carry out actions in exactly the same way you can.
			You can create more clones by bringing more gold to a Clone Machine.  Click on a Clone Machine to find out how much the next clone costs.
			Your clones can act independently or help each other out by cooperating on the same task.  Keeping them idle doesn't save you any mana.
			Two clones can work in the same space, taking half the time it takes one clone to complete the job (they don't help each other walk around).

			Use CTRL-click to select more than one clone or CTRL-A to select them all.  Tab rotates through them.`),
    new Message("Second Clone", `
			You've created another clone!  Remember, these clones can work together.
			It's probably a good thing that you can get along with yourself - it would get messy quick if you couldn't.

			Use CTRL-click to select more than one clone or CTRL-A to select them all.  Tab rotates through them.`),
    new Message("Third Clone", `
			You've created yet another clone.
			Soon you'll have a personal army!  Perhaps one of them will know why you're in this place...
			You might begin to notice now that some of your old routes don't work any more - this might be because you're getting so efficient the old ways get out of sync.`),
    new Message("Fourth Clone", `
			Time seems to be a bit unstable.  How many of you must there be before you escape the final zone?`),
    new Message("Goblin", `
			What you thought was a strange statue in the passage suddenly moves to attack you as you approach!  This place is stranger than you'd thought.`),
    new Message("Death", `
			That goblin killed one of your clones!
			Fortunately for you, death is not the end.  Surely you'll be able to overcome this obstacle in short order.
			If you <u>sync</u> your clones and have them attack together, you might have better luck.  Or maybe you need to craft more or better weapons.`),
    new Message("Learning", `
			Despite going back in time, your skills are slowly improving.  You can perform actions faster than before!

			Each stat is displayed as <u>current</u> (<u>base</u>), and your current value is reset to your base value when you travel back in time.
			You'll need to achieve a high enough current value for your base to increase.
			Hovering over a stat displays the percentage of time you save on tasks using that stat.`),
    new Message("Lava Can't Melt Steel Bridges", `
			You worked so hard on that bridge, and to see it quickly turn to slag after crossing that lava is sad.
			At least one of your clones made it across.`),
    new Message("Mass Manufacturing", `
			You've sure got a lot of iron!  You can use the Repeat-Interact action to forge it all into bars.  Use ctrl-space to insert a Repeat-Interact action into your queue.
			You might not need it now, but later in the game it can really help with making sure your clones line up when forging bars or vaporizing gold.
			Unlike normal interact, if you don't have the resources to start an interact action, it'll just skip it entirely.`),
    new Message("Arcane Shield", `
			Your deepening understanding of the mysteries of magic give you the idea of forming your mana into a shield, protecting yourself from danger.
			You'll preserve your health, but it might take a lot of mana to maintain.  Each clone will have to form one separately.
			It will last until the end of your next fight.`),
    new Message("Enter New Zone", `
			You've found a portal to another zone!
			Each zone has at least 3 mana rocks - they give more mana but their cost scales faster the deeper you get.  They give 0.1 mana to each zone up to the current one, which you'll receive on entering that zone.
			You can view a zone by clicking on it, and hovering it shows a summary of the routes you've beaten it with.  You can click on these routes to load them.  There's an option which lets you load only that route or that route and its prerequisites.
			Only one clone needs to pass through the portal, and the rest will be brought to the next zone with it.`),
    new Message("Game Slowdown", `
			At this point, the game slows down quite a bit.  You'll need to grind stats much more in order to progress.  If that's not your thing, no worries!  Thanks for playing this far.  You've beaten the tightly-designed portion of the game, and I'd count that as a win.

			If you're sticking around, there's much more that you haven't yet reached.`),
    new Message("Unlocked Weaken Rune", `
			You've unlocked a rune!
			To place a rune, press the relevant number, and the rune will be inscribed upon the space that clone is in.  You can inscribe runes only on Dug Tunnel spaces.
			The Weaken rune reduces the attack and defense of adjacent enemies by 1 point each (but not below 0).
			You can find the cost to place a rune in that rune's tooltip.`),
    new Message("Unlocked Wither Rune", `
			You've unlocked a rune!
			The Wither rune kills plants next to it.  After placing it, interact with it to charge it up and kill orthogonally adjacent plants.`),
    new Message("Unlocked Duplication Rune", `
			You've unlocked a rune!
			The Duplication rune gets you more stuff.  After placing it, interact with it to charge it up.
			Once it's charged, each of the 8 adjacent spaces will give one extra resource (of the type it already gives).
			Each Duplication rune placed in a zone takes longer to charge up.`),
    new Message("Unlocked Teleport Runes", `
			You've unlocked a rune!  Well, two runes.
			You can place one To rune per zone, and any number of From runes.  Activating any From rune teleports you to the To rune.`),
    new Message("Unlocked Pump Rune", `
			You've unlocked a rune!
			A pump rune costs a steel bar and 3 iron bars and drains the water from the 4 surrounding spaces.  It's pricy, but it'll keep you from drowning.`),
    new Message("Other Realms", `
			There are realms beyond this one, and you've just discovered a way to get to the Long Realm! The Long Realm looks just like the Core Realm, but almost everything takes thrice as much effort and twice as many resources.
			Mining mana there will reduce the cost scaling of that mana rock in all Realms.`),
    new Message("Further Realms", `
			There are realms beyond this one, and you've just discovered a way to get to the Verdant Realm!
			In the Verdant Realm, there is almost nothing that's not some kind of mushroom.
			Mining mana there will increase the conversion rate between gold and mana.`),
    new Message("Compounding Realm", `
			In the Compounding Realm, you feel like you're moving through molasses.
			Each time you move, subsequent actions will take 2.5% longer.
			However, mining mana there will increase your ability to learn past 100.`),
    new Message("Upgraded Duplication Rune", `
			You've upgraded the Duplication rune!
			Duplication now gives 25% more resources (you can't do anything with less than a full item, though, unless you have enough quarter items).  Further upgrades will increase this by 25% (additively).`),
    new Message("Upgraded Wither Rune", `
			You've upgraded the Wither rune!
			Wither now affects all diagonally adjacent plants as well as orthogonally adjacent plants.  Further upgrades will double its potency each time.`),
    new Message("Reupgraded Wither Rune", `
			You've upgraded the Wither rune again!
			Wither now takes half as long to complete.  There's one more upgrade for Wither available, which will halve the time required again.`),
    new Message("Time Barriers", `
			You've unlocked the first of the time barriers!
			There's one in each zone, behind which is a mana rock.  However, breaching a time barrier causes the zone to leech 5 of your mana per second.`),
    new Message("Complete Verdant", `
			You've learned all that you can in the Verdant Realm.  You no longer have access to it - but wither runes no longer cost any gold.`),
    new Message("You Win!", `
			You've beaten the game!
			There may be, in the future, further updates to this game.
			It is highly likely, however, that those updates will be in the form of Cavernous III.
			Thanks for playing!`),
];
//# sourceMappingURL=messages.js.map