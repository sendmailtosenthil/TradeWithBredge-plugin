import {subscribe as angelSubscribe, unsubscribe as angelUnsubscribe} from '../angel/angel_websock.js'

function BaseTicker(brokerName = "angel") {
    this.brokerName = brokerName;
    
    this.subscribe = function(tokens){
        if(this.brokerName == "angel"){
            angelSubscribe(tokens);
        }
    }
    this.unsubscribe = function(tokens){
        if(this.brokerName == "angel"){
            angelUnsubscribe(tokens);
        }
    }
}

export const baseTicker = () => new BaseTicker("angel");