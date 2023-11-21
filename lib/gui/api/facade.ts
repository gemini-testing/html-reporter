import EventEmitter2 from 'eventemitter2';
import {GuiEvents} from '../constants';

export class ApiFacade extends EventEmitter2 {
    events: GuiEvents;

    static create<T extends ApiFacade>(this: new () => T): T {
        return new this();
    }

    constructor() {
        super();

        this.events = GuiEvents;
    }
}
