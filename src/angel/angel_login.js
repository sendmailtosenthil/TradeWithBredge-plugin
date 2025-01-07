import { AngelConnect } from "./angel_connect.js";
import * as OTPAuth from "otpauth";

let ANGEL_ONE = null
let ANGEL_TOTP_SECRET
let ANGEL_USERNAME
let ANGEL_PASSWORD
let ANGEL_API_KEY
let credentials = {}

function onLoginError(ex){
    let attempt = document.getElementById('attempt').value
    if(attempt && attempt > 3){
        alert('Reach to Telegram User @TradeWithBredge Error : ' + ex)
    } else {
        alert('Try again. Invalid credentials. Use MPIN and not LOGIN PASSWORD. '+ ex)
        //showConnectForm()
    }
}

function loginSuccess(){
    const existingForm = document.getElementById('connect-form');
    if (existingForm) {
        existingForm.remove();
    }
    const myEvent = new CustomEvent("login-success", {"detail":{"credentials": {...JSON.parse(localStorage.getItem('angelCredentials')), ANGEL_API_KEY, ANGEL_USERNAME}}});
    document.dispatchEvent(myEvent)
}

function generateOtp(){
    const totp = new OTPAuth.TOTP({
        issuer: "ACME",
        label: "AngelOne",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: ANGEL_TOTP_SECRET,
      });
    return totp.generate()
}

function loadAngels() {
    
    if (isOneTimeSetUpDone()) {
        ANGEL_ONE = new AngelConnect({
            api_key: ANGEL_API_KEY,
            client_code: ANGEL_USERNAME,
            totp: generateOtp(),
        });
        loginUser(false);
    } 
}


function saveCredentials() {
    ANGEL_USERNAME = document.getElementById('username').value;
    ANGEL_PASSWORD = document.getElementById('password').value;
    ANGEL_API_KEY = document.getElementById('apiKey').value;
    ANGEL_TOTP_SECRET = document.getElementById('totpSecret').value;
    ANGEL_ONE = new AngelConnect({
        api_key: ANGEL_API_KEY,
        client_code: ANGEL_USERNAME,
        totp: generateOtp(),
    });
    loginUser(true);    
}

function isOneTimeSetUpDone(){
    ANGEL_USERNAME = localStorage.getItem('ANGEL_USERNAME');
    ANGEL_PASSWORD = localStorage.getItem('ANGEL_PASSWORD');
    ANGEL_API_KEY = localStorage.getItem('ANGEL_API_KEY');
    ANGEL_TOTP_SECRET = localStorage.getItem('ANGEL_TOTP_SECRET');
    console.log("ANGEL_USERNAME", ANGEL_USERNAME)
    return !(!ANGEL_USERNAME || !ANGEL_PASSWORD || !ANGEL_API_KEY || !ANGEL_TOTP_SECRET) 
}

function loginUser(saveLoginDetails = false){
    console.log("New token - Angel ", saveLoginDetails)
    // Generate new session if no credentials or generated before 8 AM
    let totp_code = generateOtp();
    console.log(ANGEL_USERNAME, ANGEL_PASSWORD, ANGEL_API_KEY, totp_code)
    ANGEL_ONE
        .generateSession(ANGEL_USERNAME, ANGEL_PASSWORD, totp_code)
        .then((data) => {
            console.log('Session :::',data)
            credentials = {...data.data};
            console.log('Credntail :::',credentials)
            // Store credentials and timestamp
            localStorage.setItem('angelCredentials', JSON.stringify(credentials));
            localStorage.setItem('lastTokenTime', new Date().toISOString());
            if(saveLoginDetails){
                localStorage.setItem('ANGEL_USERNAME', ANGEL_USERNAME);
                localStorage.setItem('ANGEL_PASSWORD', ANGEL_PASSWORD);
                localStorage.setItem('ANGEL_API_KEY', ANGEL_API_KEY);
                localStorage.setItem('ANGEL_TOTP_SECRET', ANGEL_TOTP_SECRET);
            }
            //return json
        })
        .then((data) => {
            console.log(data)
            loginSuccess()
        })
        .catch((ex) => {
            console.log(ex);
            onLoginError(ex)
        });
}

document.addEventListener('DOMContentLoaded', loadAngels)
document.getElementById('connect')?.addEventListener('click', saveCredentials)

export const getCredentials = () => credentials
export const getConnector = () => ANGEL_ONE