type UiErrorDetails = {
  description: string;
  heading: string;
  action?: {
    label: string;
    url: string;
  };
};

export default class UiError extends Error {
  constructor(public details: UiErrorDetails) {
    super(details.heading);
    this.name = "UiError";
  }
}
