type PropertiesOf<Type> = {
	[Property in keyof Type as Type[Property] extends Function? never:Property]:  Type[Property];
};

type DOMEvent = Event & {
	target: HTMLElement,
};

enum CanStartReturnCode {
	Never = 0,
	NotNow = 1,
	Now = 2,
};

enum ActionStatus {
	NotStarted = 0,
	Started = 1,
	Waiting = 2,
	Complete = 3,
};
