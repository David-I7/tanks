import { Component } from "../Component";

export class Button extends Component<any> {
  create(): HTMLElement {
    const btn = document.createElement("button");

    const div = document.createElement("div");
    div.appendChild(document.createTextNode("Click me"));

    btn.appendChild(div);

    btn.addEventListener("click", () => {
      console.log("clicked");
    });

    return btn;
  }
}
