type PropertiesOf<Type> = {
	[Property in keyof Type as Type[Property] extends Function? never:Property]:  Type[Property];
  };

  enum CanStartReturnCode {
    Never = 0,
    NotNow = -1,
    Now = 1
  }
