import Empty from "./states/Empty.js";
class StateMachine {
    states;
    static empty = new Empty();
    current = StateMachine.empty;
    constructor(states = {}) {
        this.states = states;
    }
    change(stateName, enterParams) {
        if (!(stateName in this.states))
            return;
        this.current.exit();
        this.current = this.states[stateName];
        this.current.enter(enterParams);
    }
    update(dt) {
        this.current.update(dt);
    }
    draw(ctx) {
        this.current.draw(ctx);
    }
}
export const gStateMachine = new StateMachine();
