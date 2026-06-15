export type ActionResult<T = undefined> =
  | {
      success: true;
      data?: T;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
