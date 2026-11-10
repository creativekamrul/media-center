export function connectionHelp(error:string){
 const text=error.toLowerCase();
 if(/401|403|unauthor|sign.in|password|token|credential/.test(text))return {title:'Sign-in needs attention',help:'Edit this connection in Settings and check its credentials.'};
 if(/ssl|certificate|handshake|certpath/.test(text))return {title:'Certificate could not be verified',help:'Check the server certificate and the date and time on this device.'};
 if(/timeout|timed out/.test(text))return {title:'Server took too long to respond',help:'Check your network or VPN, then retry.'};
 if(/unknownhost|resolve|dns/.test(text))return {title:'Server address could not be found',help:'Check the server address and your DNS or VPN connection.'};
 return {title:'Server is unavailable',help:'Check the server and your network or VPN, then retry.'};
}
