type PropertiesOf<Type> = {
	[Property in keyof Type as Type[Property] extends Function? never:Property]:  Type[Property];
  };
