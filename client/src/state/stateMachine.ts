import Empty from "./states/Empty.js";
import State from "./states/State.js";

type States = string;

class StateMachine {
  private static empty: State = new Empty();
  private current: State = StateMachine.empty;

  constructor(private states: Record<States, State> = {}) {}

  change(
    stateName: keyof typeof this.states,
    enterParams?: Record<string, any>,
  ) {
    if (!(stateName in this.states)) return;
    this.current.exit();
    this.current = this.states[stateName];
    this.current.enter(enterParams);
  }

  update(dt: number) {
    this.current.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.current.draw(ctx);
  }
}

export const gStateMachine = new StateMachine();
